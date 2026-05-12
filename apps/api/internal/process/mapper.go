package process

import (
	"fmt"
	"math"
	"time"

	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/api/internal/simulation"
)

type mapperInput struct {
	Snapshot            simulation.TelemetrySnapshot
	Alarms              []simulation.Alarm
	Status              simulation.Status
	SimulationConnected bool
	GeneratedAt         time.Time
}

func mapTopology(input mapperInput) ProcessTopologyResponse {
	nodes := make([]ProcessNode, 0, len(nodeDefinitions()))
	nodeStatus := make(map[string]Status, len(nodeDefinitions()))
	alarmsByNode := alarmsByAsset(input.Alarms)

	for _, definition := range nodeDefinitions() {
		nodeAlarms := alarmsByNode[definition.ID]
		status := statusForNode(definition.ID, input.Status.Health, input.Snapshot.Mode, nodeAlarms, input.SimulationConnected)
		nodeStatus[definition.ID] = status
		nodes = append(nodes, ProcessNode{
			ID:             definition.ID,
			Name:           definition.Name,
			Type:           definition.Type,
			Zone:           definition.Zone,
			Description:    definition.Description,
			Status:         status,
			Health:         healthForNode(status, input.Status.Health),
			Metrics:        metricsForNode(definition.ID, input.Snapshot, nodeAlarms, input.SimulationConnected),
			Alarms:         toNodeAlarms(nodeAlarms),
			Position:       definition.Position,
			UpdatedAt:      timestampFor(input.Snapshot.Timestamp, input.GeneratedAt),
			SimulationOnly: true,
		})
	}

	edges := make([]ProcessEdge, 0, len(edgeDefinitions()))
	for _, definition := range edgeDefinitions() {
		status := edgeStatus(nodeStatus[definition.Source], nodeStatus[definition.Target])
		edges = append(edges, ProcessEdge{
			ID:       definition.ID,
			Source:   definition.Source,
			Target:   definition.Target,
			FlowType: definition.FlowType,
			Label:    definition.Label,
			Status:   status,
			Animated: input.SimulationConnected && edgeAnimated(input.Snapshot.Mode, status),
			Metrics:  nil,
		})
	}

	source := "simulation"
	if !input.SimulationConnected {
		source = "degraded-fallback"
	}

	return ProcessTopologyResponse{
		Nodes: nodes,
		Edges: edges,
		Meta: ProcessTopologyMeta{
			Source:              source,
			SimulationOnly:      true,
			GeneratedAt:         input.GeneratedAt,
			SimulationConnected: input.SimulationConnected,
			SimulationMode:      input.Status.Mode,
			SimulationHealth:    input.Status.Health,
		},
	}
}

func alarmsByAsset(alarms []simulation.Alarm) map[string][]simulation.Alarm {
	result := make(map[string][]simulation.Alarm)
	for _, alarm := range alarms {
		if alarm.Status == "CLEARED" {
			continue
		}
		result[alarm.AssetID] = append(result[alarm.AssetID], alarm)
		for _, nodeID := range relatedAlarmNodeIDs(alarm) {
			if nodeID != alarm.AssetID {
				result[nodeID] = append(result[nodeID], alarm)
			}
		}
	}
	return result
}

func relatedAlarmNodeIDs(alarm simulation.Alarm) []string {
	switch alarm.Code {
	case "PRIMARY_TEMPERATURE_HIGH_WARNING", "PRIMARY_TEMPERATURE_HIGH_ALARM":
		return []string{"primary-loop", "reactor-core"}
	case "COOLANT_FLOW_LOW_WARNING", "PRIMARY_PRESSURE_HIGH_WARNING", "PRIMARY_PRESSURE_LOW_WARNING":
		return []string{"primary-loop"}
	case "STEAM_GENERATOR_LEVEL_LOW_WARNING", "STEAM_GENERATOR_LEVEL_HIGH_WARNING":
		return []string{"steam-generator", "feedwater-system"}
	case "TURBINE_VIBRATION_HIGH_WARNING":
		return []string{"turbine"}
	case "TRIP_ACTIVE_CRITICAL":
		return []string{"protection-system", "reactor-core"}
	default:
		return []string{alarm.AssetID}
	}
}

func statusForNode(nodeID, globalHealth, mode string, alarms []simulation.Alarm, connected bool) Status {
	if !connected {
		return StatusDegraded
	}
	if globalHealth == "TRIP" {
		switch nodeID {
		case "reactor-core", "protection-system":
			return StatusTrip
		default:
			return StatusDegraded
		}
	}

	hasAlarm := false
	hasWarning := false
	for _, alarm := range alarms {
		if alarm.Status == "CLEARED" {
			continue
		}
		switch alarm.Severity {
		case "CRITICAL":
			return StatusTrip
		case "ALARM":
			hasAlarm = true
		case "WARNING":
			hasWarning = true
		}
	}
	if hasAlarm {
		return StatusAlarm
	}
	if hasWarning || globalHealth == "WARNING" && nodeID == "protection-system" {
		return StatusWarning
	}
	if mode == "TRIP" && (nodeID == "reactor-core" || nodeID == "protection-system") {
		return StatusTrip
	}
	return StatusOK
}

func healthForNode(status Status, globalHealth string) string {
	if status == StatusOK {
		return "OK"
	}
	if status == StatusDegraded {
		return "DEGRADED"
	}
	if status == StatusTrip {
		return "TRIP"
	}
	if status == StatusAlarm {
		return "ALARM"
	}
	if status == StatusWarning {
		return "WARNING"
	}
	if globalHealth != "" {
		return globalHealth
	}
	return string(StatusUnknown)
}

func metricsForNode(nodeID string, snapshot simulation.TelemetrySnapshot, alarms []simulation.Alarm, connected bool) []ProcessMetric {
	if !connected {
		return nil
	}

	status := StatusOK
	if len(alarms) > 0 {
		status = StatusWarning
	}

	switch nodeID {
	case "reactor-core":
		return []ProcessMetric{
			metric("reactorPowerPct", "Reactor Power", snapshot.ReactorPowerPct, "%", 1, status),
			metric("thermalPowerMw", "Thermal Power", snapshot.ThermalPowerMW, "MW", 1, StatusOK),
			metric("primaryTemperatureC", "Primary Temperature", snapshot.PrimaryTemperatureC, "C", 1, metricStatus(snapshot.PrimaryTemperatureC, 306, 318, true)),
			metric("radiationLevelUSvH", "Synthetic Radiation Field", snapshot.RadiationLevelUSvH, "uSv/h", 2, StatusOK),
		}
	case "primary-loop":
		return []ProcessMetric{
			metric("primaryTemperatureC", "Primary Temperature", snapshot.PrimaryTemperatureC, "C", 1, metricStatus(snapshot.PrimaryTemperatureC, 306, 318, true)),
			metric("primaryPressureMPa", "Primary Pressure", snapshot.PrimaryPressureMPa, "MPa", 2, pressureStatus(snapshot.PrimaryPressureMPa)),
			metric("coolantFlowPct", "Coolant Flow", snapshot.CoolantFlowPct, "%", 1, lowMetricStatus(snapshot.CoolantFlowPct, 68, 58)),
		}
	case "steam-generator":
		return []ProcessMetric{
			metric("secondaryTemperatureC", "Secondary Temperature", snapshot.SecondaryTemperatureC, "C", 1, StatusOK),
			metric("secondaryPressureMPa", "Secondary Pressure", snapshot.SecondaryPressureMPa, "MPa", 2, StatusOK),
			metric("steamGeneratorLevelPct", "SG Level", snapshot.SteamGeneratorLevelPct, "%", 1, rangeStatus(snapshot.SteamGeneratorLevelPct, 42, 78)),
			metric("feedwaterFlowPct", "Feedwater Flow", snapshot.FeedwaterFlowPct, "%", 1, StatusOK),
		}
	case "turbine":
		return []ProcessMetric{
			metric("turbineRpm", "Turbine Speed", snapshot.TurbineRPM, "rpm", 0, StatusOK),
			metric("vibrationMmS", "Vibration", snapshot.VibrationMMS, "mm/s", 2, metricStatus(snapshot.VibrationMMS, 4.8, 6.5, true)),
			metric("generatorLoadPct", "Generator Load", snapshot.GeneratorLoadPct, "%", 1, StatusOK),
		}
	case "generator":
		return []ProcessMetric{
			metric("electricPowerMw", "Electric Power", snapshot.ElectricPowerMW, "MW", 1, StatusOK),
			metric("generatorLoadPct", "Generator Load", snapshot.GeneratorLoadPct, "%", 1, StatusOK),
			metric("efficiencyPct", "Efficiency", snapshot.EfficiencyPct, "%", 1, StatusOK),
		}
	case "condenser":
		return []ProcessMetric{
			metric("condenserVacuumKPa", "Condenser Vacuum", snapshot.CondenserVacuumKPa, "kPa", 1, StatusOK),
			metric("secondaryTemperatureC", "Secondary Temperature", snapshot.SecondaryTemperatureC, "C", 1, StatusOK),
		}
	case "feedwater-system":
		return []ProcessMetric{
			metric("feedwaterFlowPct", "Feedwater Flow", snapshot.FeedwaterFlowPct, "%", 1, StatusOK),
			metric("steamGeneratorLevelPct", "SG Level", snapshot.SteamGeneratorLevelPct, "%", 1, rangeStatus(snapshot.SteamGeneratorLevelPct, 42, 78)),
		}
	case "protection-system":
		active := float64(len(alarms))
		return []ProcessMetric{
			metric("mode", "Mode Code", modeCode(snapshot.Mode), "", 0, StatusOK),
			metric("health", "Health Code", healthCode(snapshot.Health), "", 0, statusFromHealth(snapshot.Health)),
			metric("activeAlarms", "Active Alarms", active, "", 0, status),
		}
	default:
		return nil
	}
}

func toNodeAlarms(alarms []simulation.Alarm) []ProcessNodeAlarm {
	result := make([]ProcessNodeAlarm, 0, len(alarms))
	for _, alarm := range alarms {
		result = append(result, ProcessNodeAlarm{
			ID:             alarm.ID,
			Code:           alarm.Code,
			Severity:       alarm.Severity,
			Status:         alarm.Status,
			Title:          alarm.Title,
			Message:        alarm.Message,
			StartedAt:      alarm.StartedAt,
			AcknowledgedAt: alarm.AcknowledgedAt,
			AcknowledgedBy: alarm.AcknowledgedBy,
			AckNote:        alarm.AckNote,
		})
	}
	return result
}

func edgeStatus(source, target Status) Status {
	if source == StatusTrip || target == StatusTrip {
		return StatusAlarm
	}
	if source == StatusAlarm || target == StatusAlarm {
		return StatusAlarm
	}
	if source == StatusWarning || target == StatusWarning {
		return StatusWarning
	}
	if source == StatusDegraded || target == StatusDegraded || source == StatusUnknown || target == StatusUnknown {
		return StatusDegraded
	}
	return StatusOK
}

func edgeAnimated(mode string, status Status) bool {
	if status == StatusAlarm || status == StatusTrip || status == StatusDegraded {
		return false
	}
	return mode == "NORMAL" || mode == "STARTUP" || mode == "LOAD_CHANGE"
}

func metric(key, label string, value float64, unit string, precision int, status Status) ProcessMetric {
	return ProcessMetric{
		Key:          key,
		Label:        label,
		Value:        value,
		Unit:         unit,
		DisplayValue: displayValue(value, unit, precision),
		Status:       status,
		Precision:    precision,
	}
}

func displayValue(value float64, unit string, precision int) string {
	pow := math.Pow(10, float64(precision))
	rounded := math.Round(value*pow) / pow
	format := fmt.Sprintf("%%.%df", precision)
	if unit == "" {
		return fmt.Sprintf(format, rounded)
	}
	return fmt.Sprintf(format+" %s", rounded, unit)
}

func metricStatus(value, warning, alarm float64, high bool) Status {
	if high {
		if value >= alarm {
			return StatusAlarm
		}
		if value >= warning {
			return StatusWarning
		}
		return StatusOK
	}
	if value <= alarm {
		return StatusAlarm
	}
	if value <= warning {
		return StatusWarning
	}
	return StatusOK
}

func lowMetricStatus(value, warning, alarm float64) Status {
	return metricStatus(value, warning, alarm, false)
}

func pressureStatus(value float64) Status {
	if value >= 16.2 || value <= 13.5 {
		return StatusWarning
	}
	return StatusOK
}

func rangeStatus(value, low, high float64) Status {
	if value <= low || value >= high {
		return StatusWarning
	}
	return StatusOK
}

func statusFromHealth(health string) Status {
	switch health {
	case "TRIP":
		return StatusTrip
	case "ALARM":
		return StatusAlarm
	case "WARNING":
		return StatusWarning
	case "OK":
		return StatusOK
	default:
		return StatusUnknown
	}
}

func modeCode(mode string) float64 {
	switch mode {
	case "STARTUP":
		return 1
	case "NORMAL":
		return 2
	case "LOAD_CHANGE":
		return 3
	case "WARNING":
		return 4
	case "TRIP":
		return 5
	default:
		return 0
	}
}

func healthCode(health string) float64 {
	switch health {
	case "OK":
		return 1
	case "WARNING":
		return 2
	case "ALARM":
		return 3
	case "TRIP":
		return 4
	default:
		return 0
	}
}

func timestampFor(snapshotTime, generatedAt time.Time) time.Time {
	if snapshotTime.IsZero() {
		return generatedAt
	}
	return snapshotTime
}
