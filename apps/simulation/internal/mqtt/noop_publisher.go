package mqtt

import "github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/model"

type NoopPublisher struct {
	status model.MQTTStatus
}

func NewNoopPublisher(status model.MQTTStatus) *NoopPublisher {
	return &NoopPublisher{status: status}
}

func (p *NoopPublisher) PublishTelemetrySnapshot(model.TelemetrySnapshot) {}
func (p *NoopPublisher) PublishEvent(model.Event)                         {}
func (p *NoopPublisher) PublishActiveAlarms([]model.Alarm)                {}
func (p *NoopPublisher) PublishCommand(model.Command)                     {}
func (p *NoopPublisher) PublishPIDStatus(model.PIDStatus)                 {}
func (p *NoopPublisher) PublishControlStatus(model.ControlStatus)         {}
func (p *NoopPublisher) PublishHistorianStatus(model.HistorianStatus)     {}
func (p *NoopPublisher) PublishSimulationStatus(model.SimulationStatus)   {}
func (p *NoopPublisher) Close()                                           {}

func (p *NoopPublisher) Status() model.MQTTStatus {
	return p.status
}
