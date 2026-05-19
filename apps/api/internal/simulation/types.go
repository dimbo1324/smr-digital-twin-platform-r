package simulation

import "time"

type envelope[T any] struct {
	Data T `json:"data"`
	Meta struct {
		Timestamp      time.Time `json:"timestamp"`
		Source         string    `json:"source"`
		SimulationOnly bool      `json:"simulationOnly"`
		Count          int       `json:"count,omitempty"`
	} `json:"meta"`
}

type TelemetrySnapshot struct {
	ReactorPowerPct        float64   `json:"reactorPowerPct"`
	ThermalPowerMW         float64   `json:"thermalPowerMw"`
	ElectricPowerMW        float64   `json:"electricPowerMw"`
	PrimaryTemperatureC    float64   `json:"primaryTemperatureC"`
	SecondaryTemperatureC  float64   `json:"secondaryTemperatureC"`
	PrimaryPressureMPa     float64   `json:"primaryPressureMPa"`
	SecondaryPressureMPa   float64   `json:"secondaryPressureMPa"`
	CoolantFlowPct         float64   `json:"coolantFlowPct"`
	SteamGeneratorLevelPct float64   `json:"steamGeneratorLevelPct"`
	TurbineRPM             float64   `json:"turbineRpm"`
	GeneratorLoadPct       float64   `json:"generatorLoadPct"`
	CondenserVacuumKPa     float64   `json:"condenserVacuumKPa"`
	FeedwaterFlowPct       float64   `json:"feedwaterFlowPct"`
	VibrationMMS           float64   `json:"vibrationMmS"`
	RadiationLevelUSvH     float64   `json:"radiationLevelUSvH"`
	AvailabilityPct        float64   `json:"availabilityPct"`
	EfficiencyPct          float64   `json:"efficiencyPct"`
	LoopTemperatureC       float64   `json:"loopTemperatureC"`
	LoopPressureMPa        float64   `json:"loopPressureMPa"`
	LoopFlowKGS            float64   `json:"loopFlowKgS"`
	TankLevelPct           float64   `json:"tankLevelPct"`
	ValvePositionPct       float64   `json:"valvePositionPct"`
	ValveState             string    `json:"valveState"`
	PumpState              string    `json:"pumpState"`
	PumpRPM                float64   `json:"pumpRpm"`
	HeatExchangerState     string    `json:"heatExchangerState"`
	PIDControllerMode      string    `json:"pidControllerMode"`
	PIDSetpointC           float64   `json:"pidSetpointC"`
	PIDProcessValueC       float64   `json:"pidProcessValueC"`
	PIDErrorC              float64   `json:"pidErrorC"`
	PIDOutputPct           float64   `json:"pidOutputPct"`
	PIDPTermPct            float64   `json:"pidPTermPct"`
	PIDITermPct            float64   `json:"pidITermPct"`
	PIDDTermPct            float64   `json:"pidDTermPct"`
	PIDStatus              string    `json:"pidStatus"`
	PIDSaturated           bool      `json:"pidSaturated"`
	Timestamp              time.Time `json:"timestamp"`
	Mode                   string    `json:"mode"`
	Health                 string    `json:"health"`
	SimulationOnly         bool      `json:"simulationOnly"`
	Scenario               string    `json:"scenario"`
}

type Asset struct {
	ID          string        `json:"id"`
	Tag         string        `json:"tag,omitempty"`
	Name        string        `json:"name"`
	Type        string        `json:"type"`
	Area        string        `json:"area,omitempty"`
	Unit        string        `json:"unit,omitempty"`
	SafetyClass string        `json:"safetyClass"`
	Status      string        `json:"status"`
	Description string        `json:"description,omitempty"`
	KeyMetrics  []AssetMetric `json:"keyMetrics"`
	UpdatedAt   time.Time     `json:"updatedAt"`
}

type AssetMetric struct {
	Name  string  `json:"name"`
	Value float64 `json:"value"`
	Unit  string  `json:"unit"`
}

type Alarm struct {
	ID             string            `json:"id"`
	RuleID         string            `json:"ruleId"`
	AssetID        string            `json:"assetId"`
	Tag            string            `json:"tag"`
	Code           string            `json:"code"`
	Title          string            `json:"title"`
	Message        string            `json:"message"`
	Severity       string            `json:"severity"`
	Status         string            `json:"status"`
	Value          float64           `json:"value"`
	LastValue      float64           `json:"lastValue"`
	Threshold      float64           `json:"threshold"`
	Unit           string            `json:"unit"`
	Source         string            `json:"source"`
	StartedAt      time.Time         `json:"startedAt"`
	ActiveAt       time.Time         `json:"activeAt"`
	UpdatedAt      time.Time         `json:"updatedAt"`
	AcknowledgedAt *time.Time        `json:"acknowledgedAt,omitempty"`
	AcknowledgedBy string            `json:"acknowledgedBy,omitempty"`
	ClearedAt      *time.Time        `json:"clearedAt,omitempty"`
	Metadata       map[string]string `json:"metadata,omitempty"`
}

type AlarmAcknowledgeRequest struct {
	AcknowledgedBy string `json:"acknowledgedBy,omitempty"`
	Comment        string `json:"comment,omitempty"`
}

type ScenarioInfo struct {
	Name           string `json:"name"`
	Title          string `json:"title"`
	Description    string `json:"description"`
	SimulationOnly bool   `json:"simulationOnly"`
}

type Status struct {
	Running                 bool   `json:"running"`
	Mode                    string `json:"mode"`
	Health                  string `json:"health"`
	ActiveScenario          string `json:"activeScenario"`
	TickMS                  int    `json:"tickMs"`
	HistorySize             int    `json:"historySize"`
	SnapshotCount           int    `json:"snapshotCount"`
	LastSimulationTimestamp string `json:"lastSimulationTimestamp"`
	SimulationOnly          bool   `json:"simulationOnly"`
}

type ControlStatus struct {
	ControllerTag          string    `json:"controllerTag"`
	ControlledVariableTag  string    `json:"controlledVariableTag"`
	ManipulatedVariableTag string    `json:"manipulatedVariableTag"`
	Mode                   string    `json:"mode"`
	Authority              string    `json:"authority"`
	Enabled                bool      `json:"enabled"`
	PIDImplemented         bool      `json:"pidImplemented"`
	Reason                 string    `json:"reason"`
	UpdatedAt              time.Time `json:"updatedAt"`
	UpdatedBy              string    `json:"updatedBy"`
	SafetyDisclaimer       string    `json:"safetyDisclaimer"`
}

type ModeChangeRequest struct {
	Mode        string `json:"mode"`
	RequestedBy string `json:"requestedBy,omitempty"`
	Reason      string `json:"reason,omitempty"`
}

type PIDStatus struct {
	ControllerTag          string    `json:"controllerTag"`
	Mode                   string    `json:"mode"`
	Authority              string    `json:"authority"`
	Active                 bool      `json:"active"`
	PIDImplemented         bool      `json:"pidImplemented"`
	ProcessVariableTag     string    `json:"processVariableTag"`
	ProcessValue           float64   `json:"processValue"`
	Setpoint               float64   `json:"setpoint"`
	ManipulatedVariableTag string    `json:"manipulatedVariableTag"`
	Output                 float64   `json:"output"`
	OutputMin              float64   `json:"outputMin"`
	OutputMax              float64   `json:"outputMax"`
	Kp                     float64   `json:"kp"`
	Ki                     float64   `json:"ki"`
	Kd                     float64   `json:"kd"`
	Error                  float64   `json:"error"`
	PTerm                  float64   `json:"pTerm"`
	ITerm                  float64   `json:"iTerm"`
	DTerm                  float64   `json:"dTerm"`
	Integral               float64   `json:"integral"`
	Derivative             float64   `json:"derivative"`
	Saturated              bool      `json:"saturated"`
	Status                 string    `json:"status"`
	UpdatedAt              time.Time `json:"updatedAt"`
	SafetyDisclaimer       string    `json:"safetyDisclaimer"`
}

type PIDConfigUpdateRequest struct {
	Setpoint    *float64 `json:"setpoint,omitempty"`
	Kp          *float64 `json:"kp,omitempty"`
	Ki          *float64 `json:"ki,omitempty"`
	Kd          *float64 `json:"kd,omitempty"`
	OutputMin   *float64 `json:"outputMin,omitempty"`
	OutputMax   *float64 `json:"outputMax,omitempty"`
	RequestedBy string   `json:"requestedBy,omitempty"`
	Reason      string   `json:"reason,omitempty"`
}

type CommandPayload struct {
	PositionPercent *float64 `json:"positionPercent,omitempty"`
	Reason          string   `json:"reason,omitempty"`
}

type CommandRequest struct {
	TargetTag     string         `json:"targetTag"`
	CommandType   string         `json:"commandType"`
	Source        string         `json:"source"`
	RequestedBy   string         `json:"requestedBy"`
	Payload       CommandPayload `json:"payload"`
	CorrelationID string         `json:"correlationId,omitempty"`
}

type Command struct {
	ID              string         `json:"id"`
	TargetTag       string         `json:"targetTag"`
	CommandType     string         `json:"commandType"`
	Source          string         `json:"source"`
	RequestedBy     string         `json:"requestedBy"`
	Payload         CommandPayload `json:"payload"`
	Status          string         `json:"status"`
	RequestedAt     time.Time      `json:"requestedAt"`
	AcceptedAt      *time.Time     `json:"acceptedAt,omitempty"`
	CompletedAt     *time.Time     `json:"completedAt,omitempty"`
	RejectedAt      *time.Time     `json:"rejectedAt,omitempty"`
	ResultMessage   string         `json:"resultMessage,omitempty"`
	ErrorCode       string         `json:"errorCode,omitempty"`
	ErrorMessage    string         `json:"errorMessage,omitempty"`
	CorrelationID   string         `json:"correlationId,omitempty"`
	RejectReason    string         `json:"rejectReason,omitempty"`
	ArbitrationMode string         `json:"arbitrationMode,omitempty"`
	Authority       string         `json:"authority,omitempty"`
	RejectedBy      string         `json:"rejectedBy,omitempty"`
}

type Event struct {
	ID        string            `json:"id"`
	Type      string            `json:"type"`
	Source    string            `json:"source"`
	Severity  string            `json:"severity"`
	Message   string            `json:"message"`
	TargetTag string            `json:"targetTag,omitempty"`
	CommandID string            `json:"commandId,omitempty"`
	AlarmID   string            `json:"alarmId,omitempty"`
	Timestamp time.Time         `json:"timestamp"`
	Metadata  map[string]string `json:"metadata,omitempty"`
}
