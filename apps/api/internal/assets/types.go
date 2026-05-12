package assets

type AssetType string

const (
	AssetTypeTank          AssetType = "tank"
	AssetTypePump          AssetType = "pump"
	AssetTypeValve         AssetType = "valve"
	AssetTypeHeatExchanger AssetType = "heat_exchanger"
	AssetTypeSensor        AssetType = "sensor"
	AssetTypePIDController AssetType = "pid_controller"
)

type AssetStatus string

const (
	AssetStatusOffline AssetStatus = "offline"
	AssetStatusMock    AssetStatus = "mock"
	AssetStatusWarning AssetStatus = "warning"
	AssetStatusNormal  AssetStatus = "normal"
)

type Metadata struct {
	Unit string `json:"unit"`
	Site string `json:"site"`
}

type Asset struct {
	ID          string      `json:"id"`
	Tag         string      `json:"tag"`
	Name        string      `json:"name"`
	Type        AssetType   `json:"type"`
	Status      AssetStatus `json:"status"`
	Area        string      `json:"area"`
	Description string      `json:"description"`
	Metadata    Metadata    `json:"metadata"`
}
