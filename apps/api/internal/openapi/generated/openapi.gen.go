// Code generated from packages/schemas/openapi.yaml. DO NOT EDIT.
package generated

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"strings"
)

type Client struct {
	BaseURL    string
	HTTPClient *http.Client
}

func NewClient(baseURL string, httpClient *http.Client) *Client {
	if httpClient == nil {
		httpClient = http.DefaultClient
	}
	return &Client{BaseURL: strings.TrimRight(baseURL, "/"), HTTPClient: httpClient}
}

func (c *Client) NewRequest(ctx context.Context, method string, path string, body any) (*http.Request, error) {
	var reader *bytes.Reader
	if body == nil {
		reader = bytes.NewReader(nil)
	} else {
		payload, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		reader = bytes.NewReader(payload)
	}
	request, err := http.NewRequestWithContext(ctx, method, c.BaseURL+path, reader)
	if err != nil {
		return nil, err
	}
	request.Header.Set("Accept", "application/json")
	if body != nil {
		request.Header.Set("Content-Type", "application/json")
	}
	return request, nil
}

type AcknowledgeAlarmRequest struct {
	AcknowledgedBy string `json:"acknowledgedBy,omitempty"`
	Comment        string `json:"comment,omitempty"`
}

type AlarmInstance struct {
	Id             string         `json:"id"`
	RuleId         string         `json:"ruleId"`
	AssetId        string         `json:"assetId"`
	Tag            string         `json:"tag"`
	Code           string         `json:"code"`
	Title          string         `json:"title"`
	Message        string         `json:"message"`
	Severity       string         `json:"severity"`
	Status         string         `json:"status"`
	Value          float64        `json:"value"`
	LastValue      float64        `json:"lastValue"`
	Threshold      float64        `json:"threshold"`
	Unit           string         `json:"unit"`
	Source         string         `json:"source"`
	StartedAt      string         `json:"startedAt"`
	ActiveAt       string         `json:"activeAt"`
	UpdatedAt      string         `json:"updatedAt"`
	AcknowledgedAt string         `json:"acknowledgedAt,omitempty"`
	AcknowledgedBy string         `json:"acknowledgedBy,omitempty"`
	ClearedAt      string         `json:"clearedAt,omitempty"`
	Metadata       map[string]any `json:"metadata,omitempty"`
}

type AlarmResponse struct {
	Data AlarmInstance `json:"data"`
	Meta ApiMeta       `json:"meta"`
}

type AlarmsResponse struct {
	Data []AlarmInstance `json:"data"`
	Meta ApiMeta         `json:"meta"`
}

type ApiError struct {
	Code               string `json:"code"`
	Message            string `json:"message"`
	RequiredPermission string `json:"requiredPermission,omitempty"`
	Role               string `json:"role,omitempty"`
	SimulationOnly     bool   `json:"simulationOnly,omitempty"`
}

type ApiMeta struct {
	RequestId string `json:"requestId,omitempty"`
	Timestamp string `json:"timestamp"`
	Count     int    `json:"count,omitempty"`
	Source    string `json:"source,omitempty"`
	Degraded  bool   `json:"degraded,omitempty"`
}

type ArbitrationDecision struct {
	Allowed     bool                `json:"allowed"`
	Reason      CommandRejectReason `json:"reason,omitempty"`
	Message     string              `json:"message,omitempty"`
	Mode        ControlMode         `json:"mode"`
	Authority   ControlAuthority    `json:"authority"`
	TargetTag   string              `json:"targetTag"`
	CommandType string              `json:"commandType"`
	Source      string              `json:"source"`
}

type Asset struct {
	Id          string        `json:"id"`
	Tag         string        `json:"tag"`
	Name        string        `json:"name"`
	TypeValue   string        `json:"type"`
	Status      string        `json:"status"`
	Area        string        `json:"area,omitempty"`
	Unit        string        `json:"unit,omitempty"`
	SafetyClass string        `json:"safetyClass,omitempty"`
	Description string        `json:"description,omitempty"`
	Metadata    AssetMetadata `json:"metadata,omitempty"`
	KeyMetrics  []AssetMetric `json:"keyMetrics,omitempty"`
	UpdatedAt   string        `json:"updatedAt,omitempty"`
}

type AssetMetadata struct {
	Site string `json:"site,omitempty"`
	Unit string `json:"unit,omitempty"`
}

type AssetMetric struct {
	Name  string  `json:"name"`
	Value float64 `json:"value"`
	Unit  string  `json:"unit"`
}

type AssetsResponse struct {
	Data []Asset `json:"data"`
	Meta ApiMeta `json:"meta"`
}

type AuthSession struct {
	UserId         string       `json:"userId"`
	DisplayName    string       `json:"displayName"`
	Role           Role         `json:"role"`
	Permissions    []Permission `json:"permissions"`
	Source         string       `json:"source"`
	SimulationOnly bool         `json:"simulationOnly"`
	Disclaimer     string       `json:"disclaimer"`
}

type AuthSessionResponse struct {
	Data AuthSession `json:"data"`
	Meta ApiMeta     `json:"meta"`
}

type Command struct {
	Id              string              `json:"id"`
	TargetTag       string              `json:"targetTag"`
	CommandType     string              `json:"commandType"`
	Source          string              `json:"source"`
	RequestedBy     string              `json:"requestedBy"`
	Payload         CommandPayload      `json:"payload"`
	Status          string              `json:"status"`
	RequestedAt     string              `json:"requestedAt"`
	AcceptedAt      string              `json:"acceptedAt,omitempty"`
	CompletedAt     string              `json:"completedAt,omitempty"`
	RejectedAt      string              `json:"rejectedAt,omitempty"`
	ResultMessage   string              `json:"resultMessage,omitempty"`
	ErrorCode       string              `json:"errorCode,omitempty"`
	ErrorMessage    string              `json:"errorMessage,omitempty"`
	CorrelationId   string              `json:"correlationId,omitempty"`
	RejectReason    CommandRejectReason `json:"rejectReason,omitempty"`
	ArbitrationMode ControlMode         `json:"arbitrationMode,omitempty"`
	Authority       ControlAuthority    `json:"authority,omitempty"`
	RejectedBy      string              `json:"rejectedBy,omitempty"`
}

type CommandPayload struct {
	PositionPercent float64 `json:"positionPercent,omitempty"`
	Reason          string  `json:"reason,omitempty"`
}

type CommandRejectReason string

type CommandRequest struct {
	TargetTag     string         `json:"targetTag"`
	CommandType   string         `json:"commandType"`
	Source        string         `json:"source,omitempty"`
	RequestedBy   string         `json:"requestedBy,omitempty"`
	Payload       CommandPayload `json:"payload,omitempty"`
	CorrelationId string         `json:"correlationId,omitempty"`
}

type CommandResponse struct {
	Data Command `json:"data"`
	Meta ApiMeta `json:"meta"`
}

type CommandsResponse struct {
	Data []Command `json:"data"`
	Meta ApiMeta   `json:"meta"`
}

type ComponentStatus struct {
	Status    string `json:"status"`
	LatencyMs int    `json:"latencyMs,omitempty"`
}

type ControlAuthority string

type ControlMode string

type ControlStatus struct {
	ControllerTag          string           `json:"controllerTag"`
	ControlledVariableTag  string           `json:"controlledVariableTag"`
	ManipulatedVariableTag string           `json:"manipulatedVariableTag"`
	Mode                   ControlMode      `json:"mode"`
	Authority              ControlAuthority `json:"authority"`
	Enabled                bool             `json:"enabled"`
	PidImplemented         bool             `json:"pidImplemented"`
	Reason                 string           `json:"reason"`
	UpdatedAt              string           `json:"updatedAt"`
	UpdatedBy              string           `json:"updatedBy"`
	SafetyDisclaimer       string           `json:"safetyDisclaimer"`
}

type ControlStatusResponse struct {
	Data ControlStatus `json:"data"`
	Meta ApiMeta       `json:"meta"`
}

type DemoUser struct {
	Id          string       `json:"id"`
	DisplayName string       `json:"displayName"`
	Role        Role         `json:"role"`
	Permissions []Permission `json:"permissions"`
	BadgeLabel  string       `json:"badgeLabel"`
	Description string       `json:"description"`
}

type DemoUsersResponse struct {
	Data []DemoUser `json:"data"`
	Meta ApiMeta    `json:"meta"`
}

type ErrorResponse struct {
	ErrorValue ApiError `json:"error"`
	Meta       ApiMeta  `json:"meta"`
}

type Event struct {
	Id        string         `json:"id"`
	Timestamp string         `json:"timestamp"`
	TypeValue string         `json:"type"`
	Source    string         `json:"source"`
	Severity  string         `json:"severity"`
	TargetTag string         `json:"targetTag,omitempty"`
	CommandId string         `json:"commandId,omitempty"`
	AlarmId   string         `json:"alarmId,omitempty"`
	Message   string         `json:"message"`
	Metadata  map[string]any `json:"metadata,omitempty"`
}

type EventsResponse struct {
	Data []Event `json:"data"`
	Meta ApiMeta `json:"meta"`
}

type HealthResponse struct {
	Status        string `json:"status"`
	Service       string `json:"service"`
	Version       string `json:"version"`
	Environment   string `json:"environment"`
	UptimeSeconds int    `json:"uptimeSeconds"`
	Timestamp     string `json:"timestamp"`
}

type HistorianStatus struct {
	Enabled               bool     `json:"enabled"`
	Mode                  string   `json:"mode"`
	Status                string   `json:"status"`
	Database              string   `json:"database"`
	WriteIntervalMs       int      `json:"writeIntervalMs"`
	TelemetrySampleMs     int      `json:"telemetrySampleMs"`
	LastSuccessfulWriteAt string   `json:"lastSuccessfulWriteAt,omitempty"`
	LastErrorAt           string   `json:"lastErrorAt,omitempty"`
	LastErrorMessage      string   `json:"lastErrorMessage,omitempty"`
	FallbackActive        bool     `json:"fallbackActive"`
	RetentionEnabled      bool     `json:"retentionEnabled"`
	RawRetention          string   `json:"rawRetention,omitempty"`
	DownsamplingEnabled   bool     `json:"downsamplingEnabled"`
	SupportedResolutions  []string `json:"supportedResolutions,omitempty"`
	AggregateStatus       string   `json:"aggregateStatus,omitempty"`
	SimulationOnly        bool     `json:"simulationOnly"`
	SafetyDisclaimer      string   `json:"safetyDisclaimer"`
}

type HistorianStatusResponse struct {
	Data HistorianStatus `json:"data"`
	Meta ApiMeta         `json:"meta"`
}

type ModeChangeRequest struct {
	Mode        ControlMode `json:"mode"`
	RequestedBy string      `json:"requestedBy,omitempty"`
	Reason      string      `json:"reason,omitempty"`
}

type MQTTStatus struct {
	Enabled                 bool   `json:"enabled"`
	Connected               bool   `json:"connected"`
	Status                  string `json:"status"`
	BrokerUrl               string `json:"brokerUrl"`
	ClientId                string `json:"clientId"`
	TopicPrefix             string `json:"topicPrefix"`
	Qos                     int    `json:"qos"`
	Retain                  bool   `json:"retain"`
	PublishIntervalMs       int    `json:"publishIntervalMs"`
	LastConnectedAt         string `json:"lastConnectedAt,omitempty"`
	LastDisconnectedAt      string `json:"lastDisconnectedAt,omitempty"`
	LastSuccessfulPublishAt string `json:"lastSuccessfulPublishAt,omitempty"`
	LastErrorAt             string `json:"lastErrorAt,omitempty"`
	LastErrorMessage        string `json:"lastErrorMessage,omitempty"`
	MessagesPublished       int    `json:"messagesPublished"`
	MessagesFailed          int    `json:"messagesFailed"`
	SimulationOnly          bool   `json:"simulationOnly"`
	SafetyDisclaimer        string `json:"safetyDisclaimer"`
}

type MQTTStatusResponse struct {
	Data MQTTStatus `json:"data"`
	Meta ApiMeta    `json:"meta"`
}

type Permission string

type PIDConfigUpdateRequest struct {
	Setpoint    float64 `json:"setpoint,omitempty"`
	Kp          float64 `json:"kp,omitempty"`
	Ki          float64 `json:"ki,omitempty"`
	Kd          float64 `json:"kd,omitempty"`
	OutputMin   float64 `json:"outputMin,omitempty"`
	OutputMax   float64 `json:"outputMax,omitempty"`
	RequestedBy string  `json:"requestedBy,omitempty"`
	Reason      string  `json:"reason,omitempty"`
}

type PIDStatus struct {
	ControllerTag          string           `json:"controllerTag"`
	Mode                   ControlMode      `json:"mode"`
	Authority              ControlAuthority `json:"authority"`
	Active                 bool             `json:"active"`
	PidImplemented         bool             `json:"pidImplemented"`
	ProcessVariableTag     string           `json:"processVariableTag"`
	ProcessValue           float64          `json:"processValue"`
	Setpoint               float64          `json:"setpoint"`
	ManipulatedVariableTag string           `json:"manipulatedVariableTag"`
	Output                 float64          `json:"output"`
	OutputMin              float64          `json:"outputMin"`
	OutputMax              float64          `json:"outputMax"`
	Kp                     float64          `json:"kp"`
	Ki                     float64          `json:"ki"`
	Kd                     float64          `json:"kd"`
	ErrorValue             float64          `json:"error"`
	PTerm                  float64          `json:"pTerm"`
	ITerm                  float64          `json:"iTerm"`
	DTerm                  float64          `json:"dTerm"`
	Integral               float64          `json:"integral"`
	Derivative             float64          `json:"derivative"`
	Saturated              bool             `json:"saturated"`
	Status                 string           `json:"status"`
	UpdatedAt              string           `json:"updatedAt"`
	SafetyDisclaimer       string           `json:"safetyDisclaimer"`
}

type PIDStatusResponse struct {
	Data PIDStatus `json:"data"`
	Meta ApiMeta   `json:"meta"`
}

type ReportAlarmSummary struct {
	Active       int            `json:"active"`
	Acknowledged int            `json:"acknowledged"`
	Cleared      int            `json:"cleared"`
	BySeverity   map[string]int `json:"bySeverity,omitempty"`
}

type ReportCountSummary struct {
	Total  int            `json:"total"`
	ByType map[string]int `json:"byType,omitempty"`
}

type ReportDataSources struct {
	LatestTelemetry string `json:"latestTelemetry"`
	History         string `json:"history"`
	Commands        string `json:"commands"`
	Events          string `json:"events"`
	Alarms          string `json:"alarms"`
	Degraded        bool   `json:"degraded"`
}

type ReportOptions struct {
	Template           string   `json:"template"`
	Sections           []string `json:"sections"`
	IncludeDisclaimers bool     `json:"includeDisclaimers"`
}

type ReportSystemSummary struct {
	Mode           string `json:"mode"`
	Health         string `json:"health"`
	ActiveScenario string `json:"activeScenario"`
	Running        bool   `json:"running"`
}

type ReportTelemetryStats struct {
	Tag    string  `json:"tag"`
	Label  string  `json:"label"`
	Unit   string  `json:"unit"`
	Min    float64 `json:"min"`
	Max    float64 `json:"max"`
	Avg    float64 `json:"avg"`
	Count  int     `json:"count"`
	Source string  `json:"source"`
}

type ReportUser struct {
	UserId      string `json:"userId"`
	DisplayName string `json:"displayName"`
	Role        string `json:"role"`
	Source      string `json:"source"`
}

type Role string

type Scenario struct {
	Name           string   `json:"name"`
	Title          string   `json:"title"`
	Description    string   `json:"description"`
	Category       string   `json:"category,omitempty"`
	Severity       string   `json:"severity,omitempty"`
	Duration       string   `json:"duration,omitempty"`
	Tags           []string `json:"tags,omitempty"`
	ExpectedAlarms []string `json:"expectedAlarms,omitempty"`
	ReportTags     []string `json:"reportTags,omitempty"`
	SafetyNote     string   `json:"safetyNote,omitempty"`
	Enabled        bool     `json:"enabled,omitempty"`
	Version        int      `json:"version,omitempty"`
	SimulationOnly bool     `json:"simulationOnly"`
}

type ScenariosResponse struct {
	Data []Scenario `json:"data"`
	Meta ApiMeta    `json:"meta"`
}

type ScenarioValidationRequest struct {
	Format  string `json:"format,omitempty"`
	Content string `json:"content"`
}

type ScenarioValidationResponse struct {
	Data ScenarioValidationResult `json:"data"`
	Meta ApiMeta                  `json:"meta"`
}

type ScenarioValidationResult struct {
	Valid             bool                      `json:"valid"`
	Errors            []string                  `json:"errors"`
	Warnings          []string                  `json:"warnings"`
	Scenario          ScenarioValidationSummary `json:"scenario"`
	SimulationOnly    bool                      `json:"simulationOnly"`
	PersistsToBackend bool                      `json:"persistsToBackend"`
	DeploysToRuntime  bool                      `json:"deploysToRuntime"`
}

type ScenarioValidationSummary struct {
	Id       string   `json:"id,omitempty"`
	Name     string   `json:"name,omitempty"`
	Category string   `json:"category,omitempty"`
	Severity string   `json:"severity,omitempty"`
	Duration string   `json:"duration,omitempty"`
	Tags     []string `json:"tags,omitempty"`
}

type SimulationReport struct {
	ReportId        string                 `json:"reportId"`
	GeneratedAt     string                 `json:"generatedAt"`
	TimeWindow      string                 `json:"timeWindow"`
	SimulationOnly  bool                   `json:"simulationOnly"`
	Disclaimer      string                 `json:"disclaimer"`
	GeneratedBy     ReportUser             `json:"generatedBy"`
	DataSources     ReportDataSources      `json:"dataSources"`
	System          ReportSystemSummary    `json:"system"`
	Historian       HistorianStatus        `json:"historian"`
	Mqtt            MQTTStatus             `json:"mqtt"`
	Control         ControlStatus          `json:"control"`
	Pid             PIDStatus              `json:"pid"`
	LatestTelemetry TelemetrySnapshot      `json:"latestTelemetry"`
	TelemetryStats  []ReportTelemetryStats `json:"telemetryStats"`
	Commands        ReportCountSummary     `json:"commands"`
	Events          ReportCountSummary     `json:"events"`
	Alarms          ReportAlarmSummary     `json:"alarms"`
	Template        string                 `json:"template"`
	Sections        []string               `json:"sections"`
	Options         ReportOptions          `json:"options"`
}

type SimulationReportResponse struct {
	Data SimulationReport `json:"data"`
	Meta ApiMeta          `json:"meta"`
}

type SimulationStatus struct {
	Running                 bool   `json:"running"`
	Mode                    string `json:"mode"`
	Health                  string `json:"health"`
	ActiveScenario          string `json:"activeScenario"`
	TickMs                  int    `json:"tickMs"`
	HistorySize             int    `json:"historySize"`
	SnapshotCount           int    `json:"snapshotCount"`
	LastSimulationTimestamp string `json:"lastSimulationTimestamp"`
	SimulationOnly          bool   `json:"simulationOnly"`
}

type SimulationStatusResponse struct {
	Data SimulationStatus `json:"data"`
	Meta ApiMeta          `json:"meta"`
}

type SystemStatus struct {
	Platform                string          `json:"platform"`
	Mode                    string          `json:"mode"`
	Environment             string          `json:"environment"`
	ControlBoundary         string          `json:"controlBoundary"`
	DataSource              string          `json:"dataSource"`
	BackendApi              ComponentStatus `json:"backendApi"`
	MqttBroker              ComponentStatus `json:"mqttBroker"`
	SimulationService       ComponentStatus `json:"simulationService"`
	Historian               ComponentStatus `json:"historian"`
	SimulationConnected     bool            `json:"simulationConnected"`
	SimulationMode          string          `json:"simulationMode,omitempty"`
	SimulationHealth        string          `json:"simulationHealth,omitempty"`
	LastSimulationTimestamp string          `json:"lastSimulationTimestamp,omitempty"`
	SafetyDisclaimer        string          `json:"safetyDisclaimer"`
	Version                 string          `json:"version"`
	Timestamp               string          `json:"timestamp"`
}

type SystemStatusResponse struct {
	Data SystemStatus `json:"data"`
	Meta ApiMeta      `json:"meta"`
}

type TelemetryHistoryResponse struct {
	Data []TelemetrySnapshot `json:"data"`
	Meta ApiMeta             `json:"meta"`
}

type TelemetryLatestResponse struct {
	Data []TelemetryPoint `json:"data"`
	Meta ApiMeta          `json:"meta"`
}

type TelemetryPoint struct {
	Tag       string         `json:"tag"`
	Name      string         `json:"name"`
	Value     float64        `json:"value,omitempty"`
	ValueText string         `json:"valueText,omitempty"`
	Unit      string         `json:"unit"`
	Quality   string         `json:"quality"`
	Timestamp string         `json:"timestamp"`
	Source    string         `json:"source"`
	Area      string         `json:"area,omitempty"`
	AssetTag  string         `json:"assetTag,omitempty"`
	Metadata  map[string]any `json:"metadata,omitempty"`
}

type TelemetrySnapshot struct {
	ReactorPowerPct        float64 `json:"reactorPowerPct"`
	ThermalPowerMw         float64 `json:"thermalPowerMw"`
	ElectricPowerMw        float64 `json:"electricPowerMw"`
	PrimaryTemperatureC    float64 `json:"primaryTemperatureC"`
	SecondaryTemperatureC  float64 `json:"secondaryTemperatureC"`
	PrimaryPressureMPa     float64 `json:"primaryPressureMPa"`
	SecondaryPressureMPa   float64 `json:"secondaryPressureMPa"`
	CoolantFlowPct         float64 `json:"coolantFlowPct"`
	SteamGeneratorLevelPct float64 `json:"steamGeneratorLevelPct"`
	TurbineRpm             float64 `json:"turbineRpm"`
	GeneratorLoadPct       float64 `json:"generatorLoadPct"`
	CondenserVacuumKPa     float64 `json:"condenserVacuumKPa"`
	FeedwaterFlowPct       float64 `json:"feedwaterFlowPct"`
	VibrationMmS           float64 `json:"vibrationMmS"`
	RadiationLevelUSvH     float64 `json:"radiationLevelUSvH"`
	AvailabilityPct        float64 `json:"availabilityPct"`
	EfficiencyPct          float64 `json:"efficiencyPct"`
	LoopTemperatureC       float64 `json:"loopTemperatureC"`
	LoopPressureMPa        float64 `json:"loopPressureMPa"`
	LoopFlowKgS            float64 `json:"loopFlowKgS"`
	TankLevelPct           float64 `json:"tankLevelPct"`
	ValvePositionPct       float64 `json:"valvePositionPct"`
	ValveState             string  `json:"valveState"`
	PumpState              string  `json:"pumpState"`
	PumpRpm                float64 `json:"pumpRpm"`
	HeatExchangerState     string  `json:"heatExchangerState"`
	PidControllerMode      string  `json:"pidControllerMode"`
	Timestamp              string  `json:"timestamp"`
	Mode                   string  `json:"mode"`
	Health                 string  `json:"health"`
	SimulationOnly         bool    `json:"simulationOnly"`
	Scenario               string  `json:"scenario"`
	PidSetpointC           float64 `json:"pidSetpointC"`
	PidProcessValueC       float64 `json:"pidProcessValueC"`
	PidErrorC              float64 `json:"pidErrorC"`
	PidOutputPct           float64 `json:"pidOutputPct"`
	PidPTermPct            float64 `json:"pidPTermPct"`
	PidITermPct            float64 `json:"pidITermPct"`
	PidDTermPct            float64 `json:"pidDTermPct"`
	PidStatus              string  `json:"pidStatus"`
	PidSaturated           bool    `json:"pidSaturated"`
}
