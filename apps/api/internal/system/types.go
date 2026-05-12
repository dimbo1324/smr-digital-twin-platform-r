package system

import "time"

type ComponentStatus struct {
	Status    string `json:"status"`
	LatencyMS *int   `json:"latencyMs,omitempty"`
}

type Status struct {
	Platform                string          `json:"platform"`
	Mode                    string          `json:"mode"`
	Environment             string          `json:"environment"`
	ControlBoundary         string          `json:"controlBoundary"`
	DataSource              string          `json:"dataSource"`
	BackendAPI              ComponentStatus `json:"backendApi"`
	MQTTBroker              ComponentStatus `json:"mqttBroker"`
	SimulationService       ComponentStatus `json:"simulationService"`
	Historian               ComponentStatus `json:"historian"`
	SimulationConnected     bool            `json:"simulationConnected"`
	SimulationMode          string          `json:"simulationMode,omitempty"`
	SimulationHealth        string          `json:"simulationHealth,omitempty"`
	LastSimulationTimestamp string          `json:"lastSimulationTimestamp,omitempty"`
	SafetyDisclaimer        string          `json:"safetyDisclaimer"`
	Version                 string          `json:"version"`
	Timestamp               time.Time       `json:"timestamp"`
}

type ServiceConfig struct {
	Environment string
	Version     string
}
