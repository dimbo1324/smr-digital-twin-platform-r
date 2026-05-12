package process

import "time"

type Status string

const (
	StatusOK       Status = "OK"
	StatusWarning  Status = "WARNING"
	StatusAlarm    Status = "ALARM"
	StatusTrip     Status = "TRIP"
	StatusDegraded Status = "DEGRADED"
	StatusOffline  Status = "OFFLINE"
	StatusUnknown  Status = "UNKNOWN"
)

type Zone string

const (
	ZoneNuclearIsland    Zone = "nuclear-island"
	ZoneTurbineIsland    Zone = "turbine-island"
	ZoneBalanceOfPlant   Zone = "balance-of-plant"
	ZoneSafetySimulation Zone = "safety-simulation"
)

type FlowType string

const (
	FlowThermal          FlowType = "thermal"
	FlowPrimaryCoolant   FlowType = "primary-coolant"
	FlowSteam            FlowType = "steam"
	FlowMechanical       FlowType = "mechanical"
	FlowElectrical       FlowType = "electrical"
	FlowExhaustSteam     FlowType = "exhaust-steam"
	FlowCondensate       FlowType = "condensate"
	FlowFeedwater        FlowType = "feedwater"
	FlowProtectionSignal FlowType = "protection-signal"
)

type ProcessTopologyResponse struct {
	Nodes []ProcessNode       `json:"nodes"`
	Edges []ProcessEdge       `json:"edges"`
	Meta  ProcessTopologyMeta `json:"meta"`
}

type ProcessNode struct {
	ID             string              `json:"id"`
	Name           string              `json:"name"`
	Type           string              `json:"type"`
	Zone           Zone                `json:"zone"`
	Description    string              `json:"description"`
	Status         Status              `json:"status"`
	Health         string              `json:"health"`
	Metrics        []ProcessMetric     `json:"metrics"`
	Alarms         []ProcessNodeAlarm  `json:"alarms"`
	Position       ProcessNodePosition `json:"position"`
	UpdatedAt      time.Time           `json:"updatedAt"`
	SimulationOnly bool                `json:"simulationOnly"`
}

type ProcessEdge struct {
	ID       string          `json:"id"`
	Source   string          `json:"source"`
	Target   string          `json:"target"`
	FlowType FlowType        `json:"flowType"`
	Label    string          `json:"label"`
	Status   Status          `json:"status"`
	Animated bool            `json:"animated"`
	Metrics  []ProcessMetric `json:"metrics"`
}

type ProcessMetric struct {
	Key          string  `json:"key"`
	Label        string  `json:"label"`
	Value        float64 `json:"value"`
	Unit         string  `json:"unit"`
	DisplayValue string  `json:"displayValue"`
	Status       Status  `json:"status"`
	Precision    int     `json:"precision"`
}

type ProcessNodeAlarm struct {
	ID             string     `json:"id"`
	Code           string     `json:"code"`
	Severity       string     `json:"severity"`
	Status         string     `json:"status"`
	Title          string     `json:"title"`
	Message        string     `json:"message"`
	StartedAt      time.Time  `json:"startedAt"`
	AcknowledgedAt *time.Time `json:"acknowledgedAt,omitempty"`
	AcknowledgedBy string     `json:"acknowledgedBy,omitempty"`
	AckNote        string     `json:"ackNote,omitempty"`
}

type ProcessNodePosition struct {
	X int `json:"x"`
	Y int `json:"y"`
}

type ProcessTopologyMeta struct {
	Source              string    `json:"source"`
	SimulationOnly      bool      `json:"simulationOnly"`
	GeneratedAt         time.Time `json:"generatedAt"`
	SimulationConnected bool      `json:"simulationConnected"`
	SimulationMode      string    `json:"simulationMode"`
	SimulationHealth    string    `json:"simulationHealth"`
}

type topologyNodeDefinition struct {
	ID          string
	Name        string
	Type        string
	Zone        Zone
	Description string
	Position    ProcessNodePosition
}

type topologyEdgeDefinition struct {
	ID       string
	Source   string
	Target   string
	FlowType FlowType
	Label    string
}
