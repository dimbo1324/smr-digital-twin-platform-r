package assets

import "context"

type MemoryRepository struct {
	assets []Asset
}

func NewMemoryRepository() *MemoryRepository {
	metadata := Metadata{
		Unit: "unit-001",
		Site: "site-001",
	}

	return &MemoryRepository{
		assets: []Asset{
			{
				ID:          "asset-t-101",
				Tag:         "T-101",
				Name:        "Feedwater Tank",
				Type:        AssetTypeTank,
				Status:      AssetStatusMock,
				Area:        "thermal-loop",
				Description: "In-memory fallback tank for the MVP process mnemonic",
				Metadata:    metadata,
			},
			{
				ID:          "asset-p-101",
				Tag:         "P-101",
				Name:        "Primary Circulation Pump",
				Type:        AssetTypePump,
				Status:      AssetStatusOffline,
				Area:        "thermal-loop",
				Description: "In-memory fallback pump for simulation-only control UI",
				Metadata:    metadata,
			},
			{
				ID:          "asset-v-101",
				Tag:         "V-101",
				Name:        "Control Valve",
				Type:        AssetTypeValve,
				Status:      AssetStatusWarning,
				Area:        "thermal-loop",
				Description: "In-memory fallback valve for simulation-only command UI",
				Metadata:    metadata,
			},
			{
				ID:          "asset-hx-101",
				Tag:         "HX-101",
				Name:        "Heat Exchanger",
				Type:        AssetTypeHeatExchanger,
				Status:      AssetStatusMock,
				Area:        "thermal-loop",
				Description: "In-memory fallback heat exchanger for the synthetic process loop",
				Metadata:    metadata,
			},
			{
				ID:          "asset-tt-101",
				Tag:         "TT-101",
				Name:        "Temperature Transmitter",
				Type:        AssetTypeSensor,
				Status:      AssetStatusNormal,
				Area:        "thermal-loop",
				Description: "In-memory fallback temperature point for HMI telemetry",
				Metadata:    metadata,
			},
			{
				ID:          "asset-pt-101",
				Tag:         "PT-101",
				Name:        "Pressure Transmitter",
				Type:        AssetTypeSensor,
				Status:      AssetStatusNormal,
				Area:        "thermal-loop",
				Description: "In-memory fallback pressure point for HMI telemetry",
				Metadata:    metadata,
			},
			{
				ID:          "asset-ft-101",
				Tag:         "FT-101",
				Name:        "Flow Transmitter",
				Type:        AssetTypeSensor,
				Status:      AssetStatusNormal,
				Area:        "thermal-loop",
				Description: "In-memory fallback flow point for HMI telemetry",
				Metadata:    metadata,
			},
			{
				ID:          "asset-lt-101",
				Tag:         "LT-101",
				Name:        "Level Transmitter",
				Type:        AssetTypeSensor,
				Status:      AssetStatusNormal,
				Area:        "thermal-loop",
				Description: "In-memory fallback tank level point for HMI telemetry",
				Metadata:    metadata,
			},
			{
				ID:          "asset-tic-101",
				Tag:         "TIC-101",
				Name:        "Temperature Indicating Controller",
				Type:        AssetTypePIDController,
				Status:      AssetStatusNormal,
				Area:        "thermal-loop",
				Description: "In-memory fallback PID placeholder for future control logic",
				Metadata:    metadata,
			},
		},
	}
}

func (r *MemoryRepository) List(_ context.Context) ([]Asset, error) {
	assets := make([]Asset, len(r.assets))
	copy(assets, r.assets)
	return assets, nil
}
