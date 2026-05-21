package engine

import "github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/model"

func (e *Engine) publishPeriodicMQTTLocked(snapshot model.TelemetrySnapshot) {
	e.mqttPublisher.PublishTelemetrySnapshot(snapshot)
	e.mqttPublisher.PublishActiveAlarms(e.evaluator.Active())
	e.mqttPublisher.PublishPIDStatus(e.pidStatusLocked())
	e.mqttPublisher.PublishControlStatus(e.controlStatusLocked())
	e.mqttPublisher.PublishHistorianStatus(e.HistorianStatus())
	e.mqttPublisher.PublishSimulationStatus(e.statusLocked())
}

func (e *Engine) publishCommandMQTT(command model.Command) {
	if e.mqttPublisher != nil {
		e.mqttPublisher.PublishCommand(command)
	}
}

func (e *Engine) publishEventMQTT(event model.Event) {
	if e.mqttPublisher != nil {
		e.mqttPublisher.PublishEvent(event)
	}
}
