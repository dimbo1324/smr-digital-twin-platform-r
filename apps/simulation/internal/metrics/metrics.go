package metrics

import (
	"net/http"
	"sync"
	"time"

	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/model"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
	TicksTotal = promauto.NewCounter(prometheus.CounterOpts{
		Name: "simulation_ticks_total",
		Help: "Total simulation ticks.",
	})
	TickDurationSeconds = promauto.NewHistogram(prometheus.HistogramOpts{
		Name:    "simulation_tick_duration_seconds",
		Help:    "Simulation tick duration in seconds.",
		Buckets: prometheus.DefBuckets,
	})
	CommandsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "simulation_commands_total",
			Help: "Simulation command records by target, type, and status.",
		},
		[]string{"target", "command_type", "status"},
	)
	ActiveAlarms = promauto.NewGauge(prometheus.GaugeOpts{
		Name: "simulation_alarms_active",
		Help: "Current active simulation alarms.",
	})
	EventsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "simulation_events_total",
			Help: "Simulation events by type and severity.",
		},
		[]string{"type", "severity"},
	)
	HistorianWritesTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "simulation_historian_writes_total",
			Help: "Historian writes by record type.",
		},
		[]string{"record_type"},
	)
	HistorianWriteFailuresTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "simulation_historian_write_failures_total",
			Help: "Historian write failures by record type.",
		},
		[]string{"record_type"},
	)
	HistorianQueueDepth = promauto.NewGauge(prometheus.GaugeOpts{
		Name: "simulation_historian_queue_depth",
		Help: "Current historian write queue depth.",
	})
	HistorianDroppedWrites = promauto.NewGauge(prometheus.GaugeOpts{
		Name: "simulation_historian_dropped_writes",
		Help: "Historian writes dropped because the bounded queue was full.",
	})
	MQTTMessagesPublishedTotal = promauto.NewCounter(prometheus.CounterOpts{
		Name: "simulation_mqtt_messages_published_total",
		Help: "MQTT messages published by the simulation bridge according to bridge status.",
	})
	MQTTPublishFailuresTotal = promauto.NewCounter(prometheus.CounterOpts{
		Name: "simulation_mqtt_publish_failures_total",
		Help: "MQTT publish failures according to bridge status.",
	})
	PIDOutputPct = promauto.NewGauge(prometheus.GaugeOpts{
		Name: "simulation_pid_output_pct",
		Help: "Current TIC-101 PID output percent.",
	})
	PIDError = promauto.NewGauge(prometheus.GaugeOpts{
		Name: "simulation_pid_error",
		Help: "Current TIC-101 PID error.",
	})
	ValvePositionPct = promauto.NewGauge(prometheus.GaugeOpts{
		Name: "simulation_valve_position_pct",
		Help: "Current V-101 valve position percent.",
	})
	PumpRunning = promauto.NewGauge(prometheus.GaugeOpts{
		Name: "simulation_pump_running",
		Help: "Current P-101 running state as 1 for running and 0 otherwise.",
	})

	mqttCounterState = struct {
		sync.Mutex
		published uint64
		failed    uint64
	}{}
)

func Handler() http.Handler {
	return promhttp.Handler()
}

func ObserveTick(startedAt time.Time) {
	TicksTotal.Inc()
	TickDurationSeconds.Observe(time.Since(startedAt).Seconds())
}

func ObserveCommand(command model.Command) {
	CommandsTotal.WithLabelValues(command.TargetTag, string(command.CommandType), string(command.Status)).Inc()
}

func ObserveEvent(event model.Event) {
	EventsTotal.WithLabelValues(string(event.Type), string(event.Severity)).Inc()
}

func ObserveHistorianWrite(recordType string, err error) {
	if err != nil {
		HistorianWriteFailuresTotal.WithLabelValues(recordType).Inc()
		return
	}
	HistorianWritesTotal.WithLabelValues(recordType).Inc()
}

func SetHistorianQueue(depth, dropped int64) {
	HistorianQueueDepth.Set(float64(depth))
	HistorianDroppedWrites.Set(float64(dropped))
}

func ObserveSnapshot(snapshot model.TelemetrySnapshot, activeAlarmCount int, mqttStatus model.MQTTStatus) {
	ActiveAlarms.Set(float64(activeAlarmCount))
	PIDOutputPct.Set(snapshot.PIDOutputPct)
	PIDError.Set(snapshot.PIDErrorC)
	ValvePositionPct.Set(snapshot.ValvePositionPct)
	if snapshot.PumpState == string(model.PumpStateRunning) {
		PumpRunning.Set(1)
	} else {
		PumpRunning.Set(0)
	}
	observeMQTTCounters(mqttStatus.MessagesPublished, mqttStatus.MessagesFailed)
}

func observeMQTTCounters(published, failed uint64) {
	mqttCounterState.Lock()
	defer mqttCounterState.Unlock()

	if published > mqttCounterState.published {
		MQTTMessagesPublishedTotal.Add(float64(published - mqttCounterState.published))
	}
	if failed > mqttCounterState.failed {
		MQTTPublishFailuresTotal.Add(float64(failed - mqttCounterState.failed))
	}
	mqttCounterState.published = published
	mqttCounterState.failed = failed
}
