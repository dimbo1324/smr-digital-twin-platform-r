package mqtt

import (
	"context"
	"encoding/json"
	"log/slog"
	"sync"
	"time"

	paho "github.com/eclipse/paho.mqtt.golang"

	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/model"
)

type message struct {
	payload any
	topic   string
}

type Publisher struct {
	cfg    Config
	client paho.Client
	logger *slog.Logger
	queue  chan message
	done   chan struct{}

	closeOnce sync.Once
	mu        sync.RWMutex
	status    model.MQTTStatus
}

func NewPublisher(ctx context.Context, cfg Config, logger *slog.Logger) (*Publisher, error) {
	publisher := &Publisher{
		cfg:    cfg,
		logger: logger,
		queue:  make(chan message, cfg.QueueSize),
		done:   make(chan struct{}),
		status: model.MQTTStatus{
			Enabled:           cfg.Enabled,
			Connected:         false,
			Status:            "unavailable",
			BrokerURL:         sanitizeBrokerURL(cfg.BrokerURL),
			ClientID:          cfg.ClientID,
			TopicPrefix:       cfg.TopicPrefix,
			QoS:               int(cfg.QoS),
			Retain:            cfg.Retain,
			PublishIntervalMS: int(cfg.PublishInterval / time.Millisecond),
			SimulationOnly:    true,
			SafetyDisclaimer:  safetyDisclaimer,
		},
	}

	options := paho.NewClientOptions().
		AddBroker(cfg.BrokerURL).
		SetClientID(cfg.ClientID).
		SetCleanSession(true).
		SetAutoReconnect(true).
		SetConnectRetry(true).
		SetConnectRetryInterval(time.Second).
		SetConnectTimeout(cfg.ConnectTimeout).
		SetWriteTimeout(cfg.WriteTimeout).
		SetKeepAlive(30 * time.Second).
		SetOnConnectHandler(func(_ paho.Client) {
			connectedAt := time.Now().UTC()
			publisher.mu.Lock()
			publisher.status.Connected = true
			publisher.status.Status = "connected"
			publisher.status.LastConnectedAt = &connectedAt
			publisher.status.LastErrorMessage = ""
			publisher.mu.Unlock()
			logger.Info("mqtt_bridge_connected", slog.String("broker", sanitizeBrokerURL(cfg.BrokerURL)))
		}).
		SetConnectionLostHandler(func(_ paho.Client, err error) {
			disconnectedAt := time.Now().UTC()
			publisher.mu.Lock()
			publisher.status.Connected = false
			publisher.status.Status = "degraded"
			publisher.status.LastDisconnectedAt = &disconnectedAt
			publisher.status.LastErrorAt = &disconnectedAt
			if err != nil {
				publisher.status.LastErrorMessage = err.Error()
			}
			publisher.mu.Unlock()
			logger.Warn("mqtt_bridge_disconnected", slog.Any("error", err))
		})

	publisher.client = paho.NewClient(options)
	token := publisher.client.Connect()
	if !token.WaitTimeout(cfg.ConnectTimeout) {
		err := context.DeadlineExceeded
		publisher.recordFailure(err)
		return publisher, err
	}
	if err := token.Error(); err != nil {
		publisher.recordFailure(err)
		return publisher, err
	}

	// The setup context is intentionally limited to the initial connect attempt.
	// Publishing lives until Close is called by the simulation engine shutdown path.
	go publisher.loop(context.Background())
	return publisher, nil
}

func (p *Publisher) PublishTelemetrySnapshot(snapshot model.TelemetrySnapshot) {
	now := time.Now().UTC()
	p.enqueue(BuildTopic(p.cfg.TopicPrefix, TopicTelemetrySnapshot), envelope(p.cfg, "telemetry.snapshot", snapshot, now))
	for _, tagPayload := range telemetryTagPayloads(snapshot) {
		p.enqueue(TelemetryTagTopic(p.cfg.TopicPrefix, tagPayload.Tag), envelope(p.cfg, "telemetry.tag", tagPayload, now))
	}
}

func (p *Publisher) PublishEvent(event model.Event) {
	p.enqueue(BuildTopic(p.cfg.TopicPrefix, TopicEvents), envelope(p.cfg, "event", event, time.Now().UTC()))
}

func (p *Publisher) PublishActiveAlarms(alarms []model.Alarm) {
	p.enqueue(BuildTopic(p.cfg.TopicPrefix, TopicActiveAlarms), envelope(p.cfg, "alarms.active", activeAlarmsPayload(alarms), time.Now().UTC()))
}

func (p *Publisher) PublishCommand(command model.Command) {
	p.enqueue(BuildTopic(p.cfg.TopicPrefix, TopicCommandStatus), envelope(p.cfg, "command.status", command, time.Now().UTC()))
}

func (p *Publisher) PublishPIDStatus(status model.PIDStatus) {
	p.enqueue(BuildTopic(p.cfg.TopicPrefix, TopicPIDStatus), envelope(p.cfg, "pid.status", status, time.Now().UTC()))
}

func (p *Publisher) PublishControlStatus(status model.ControlStatus) {
	p.enqueue(BuildTopic(p.cfg.TopicPrefix, TopicControlMode), envelope(p.cfg, "control.mode", status, time.Now().UTC()))
}

func (p *Publisher) PublishHistorianStatus(status model.HistorianStatus) {
	p.enqueue(BuildTopic(p.cfg.TopicPrefix, TopicHistorianStatus), envelope(p.cfg, "historian.status", status, time.Now().UTC()))
}

func (p *Publisher) PublishSimulationStatus(status model.SimulationStatus) {
	p.enqueue(BuildTopic(p.cfg.TopicPrefix, TopicSystemStatus), envelope(p.cfg, "system.status", status, time.Now().UTC()))
}

func (p *Publisher) Status() model.MQTTStatus {
	p.mu.RLock()
	defer p.mu.RUnlock()
	status := p.status
	status.Connected = p.client != nil && p.client.IsConnected()
	if status.Enabled && status.Connected {
		status.Status = "connected"
	}
	return status
}

func (p *Publisher) Close() {
	p.closeOnce.Do(func() {
		close(p.done)
		if p.client != nil && p.client.IsConnected() {
			p.client.Disconnect(250)
		}
	})
}

func (p *Publisher) enqueue(topic string, payload any) {
	select {
	case p.queue <- message{topic: topic, payload: payload}:
	default:
		p.recordFailure(errQueueFull)
	}
}

func (p *Publisher) loop(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		case <-p.done:
			return
		case msg := <-p.queue:
			p.publish(msg)
		}
	}
}

func (p *Publisher) publish(msg message) {
	payload, err := json.Marshal(msg.payload)
	if err != nil {
		p.recordFailure(err)
		return
	}
	token := p.client.Publish(msg.topic, p.cfg.QoS, p.cfg.Retain, payload)
	if !token.WaitTimeout(p.cfg.WriteTimeout) {
		p.recordFailure(context.DeadlineExceeded)
		return
	}
	if err := token.Error(); err != nil {
		p.recordFailure(err)
		return
	}
	p.recordSuccess()
}

func (p *Publisher) recordSuccess() {
	now := time.Now().UTC()
	p.mu.Lock()
	p.status.LastSuccessfulPublishAt = &now
	p.status.MessagesPublished++
	p.status.Connected = p.client != nil && p.client.IsConnected()
	if p.status.Connected {
		p.status.Status = "connected"
	}
	p.mu.Unlock()
}

func (p *Publisher) recordFailure(err error) {
	now := time.Now().UTC()
	p.mu.Lock()
	p.status.MessagesFailed++
	p.status.LastErrorAt = &now
	p.status.LastErrorMessage = err.Error()
	if p.status.Enabled {
		p.status.Status = "degraded"
	}
	p.mu.Unlock()
}

type queueFullError struct{}

func (queueFullError) Error() string {
	return "mqtt publish queue is full"
}

var errQueueFull queueFullError
