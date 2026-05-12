package process

import (
	"context"
	"testing"
	"time"

	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/api/internal/simulation"
)

func TestTopologyReturnsRequiredNodesAndEdges(t *testing.T) {
	topology := NewService(newFakeSimulation()).Topology(context.Background())

	requiredNodes := []string{"reactor-core", "primary-loop", "steam-generator", "turbine", "generator", "condenser", "feedwater-system", "protection-system"}
	for _, id := range requiredNodes {
		if findNode(topology, id) == nil {
			t.Fatalf("expected node %s", id)
		}
	}

	requiredEdges := []string{"reactor-core-primary-loop", "primary-loop-steam-generator", "steam-generator-turbine", "turbine-generator", "turbine-condenser", "condenser-feedwater-system", "feedwater-system-steam-generator", "protection-system-reactor-core"}
	for _, id := range requiredEdges {
		if findEdge(topology, id) == nil {
			t.Fatalf("expected edge %s", id)
		}
	}
}

func TestTopologyMapsTelemetryMetricsToNodes(t *testing.T) {
	topology := NewService(newFakeSimulation()).Topology(context.Background())
	node := findNode(topology, "reactor-core")
	if node == nil {
		t.Fatal("reactor-core node not found")
	}
	if findMetric(*node, "reactorPowerPct") == nil {
		t.Fatal("expected reactorPowerPct metric")
	}
}

func TestTopologyMapsActiveAlarmToNode(t *testing.T) {
	fake := newFakeSimulation()
	fake.alarms = []simulation.Alarm{
		{ID: "alarm-1", AssetID: "primary-loop", Code: "COOLANT_FLOW_LOW_WARNING", Severity: "WARNING", Title: "Flow low", Message: "Synthetic low flow", StartedAt: time.Now()},
	}
	topology := NewService(fake).Topology(context.Background())
	node := findNode(topology, "primary-loop")
	if node == nil || len(node.Alarms) != 1 {
		t.Fatalf("expected primary-loop alarm, got %#v", node)
	}
	if node.Status != StatusWarning {
		t.Fatalf("expected WARNING status, got %s", node.Status)
	}
}

func TestTopologyMapsAcknowledgedAlarmStatusToNodeAlarm(t *testing.T) {
	fake := newFakeSimulation()
	ackAt := time.Now().UTC()
	fake.alarms = []simulation.Alarm{
		{ID: "alarm-ack", AssetID: "primary-loop", NodeID: "primary-loop", Code: "COOLANT_FLOW_LOW_WARNING", Severity: "WARNING", Status: "ACKNOWLEDGED", Title: "Flow low", Message: "Synthetic low flow", StartedAt: time.Now(), AcknowledgedAt: &ackAt, AcknowledgedBy: "demo-operator", AckNote: "reviewed"},
	}

	topology := NewService(fake).Topology(context.Background())
	node := findNode(topology, "primary-loop")
	if node == nil || len(node.Alarms) != 1 {
		t.Fatalf("expected primary-loop acknowledged alarm, got %#v", node)
	}
	if node.Alarms[0].Status != "ACKNOWLEDGED" || node.Alarms[0].AcknowledgedBy != "demo-operator" {
		t.Fatalf("expected acknowledged metadata, got %#v", node.Alarms[0])
	}
	if node.Status != StatusWarning {
		t.Fatalf("expected acknowledged warning still to affect node status, got %s", node.Status)
	}
}

func TestTopologyIgnoresClearedAlarmsForNodeStatus(t *testing.T) {
	fake := newFakeSimulation()
	fake.alarms = []simulation.Alarm{
		{ID: "alarm-cleared", AssetID: "primary-loop", NodeID: "primary-loop", Code: "COOLANT_FLOW_LOW_WARNING", Severity: "WARNING", Status: "CLEARED", Title: "Flow low", Message: "Synthetic low flow", StartedAt: time.Now()},
	}

	topology := NewService(fake).Topology(context.Background())
	node := findNode(topology, "primary-loop")
	if node == nil {
		t.Fatal("primary-loop node not found")
	}
	if len(node.Alarms) != 0 {
		t.Fatalf("expected cleared alarm to be hidden from active node alarms, got %#v", node.Alarms)
	}
	if node.Status != StatusOK {
		t.Fatalf("expected cleared alarm not to affect node status, got %s", node.Status)
	}
}

func TestTripAlarmSetsProtectionAndReactorTrip(t *testing.T) {
	fake := newFakeSimulation()
	fake.status.Health = "TRIP"
	fake.status.Mode = "TRIP"
	fake.snapshot.Health = "TRIP"
	fake.snapshot.Mode = "TRIP"
	fake.alarms = []simulation.Alarm{
		{ID: "alarm-trip", AssetID: "protection-system", Code: "TRIP_ACTIVE_CRITICAL", Severity: "CRITICAL", Title: "Trip", Message: "Synthetic trip", StartedAt: time.Now()},
	}

	topology := NewService(fake).Topology(context.Background())
	for _, id := range []string{"reactor-core", "protection-system"} {
		node := findNode(topology, id)
		if node == nil || node.Status != StatusTrip {
			t.Fatalf("expected %s TRIP, got %#v", id, node)
		}
	}
}

func TestSimulationUnavailableReturnsDegradedTopology(t *testing.T) {
	fake := newFakeSimulation()
	fake.fail = true

	topology := NewService(fake).Topology(context.Background())
	if topology.Meta.SimulationConnected {
		t.Fatal("expected disconnected topology")
	}
	for _, node := range topology.Nodes {
		if node.Status != StatusDegraded {
			t.Fatalf("expected degraded node, got %s for %s", node.Status, node.ID)
		}
	}
}

func TestEdgeStatusFollowsNodeStatus(t *testing.T) {
	fake := newFakeSimulation()
	fake.alarms = []simulation.Alarm{
		{ID: "alarm-1", AssetID: "steam-generator", Code: "SG_LEVEL_LOW", Severity: "WARNING", Title: "SG level", Message: "Synthetic SG level warning", StartedAt: time.Now()},
	}

	topology := NewService(fake).Topology(context.Background())
	edge := findEdge(topology, "steam-generator-turbine")
	if edge == nil {
		t.Fatal("edge not found")
	}
	if edge.Status != StatusWarning {
		t.Fatalf("expected warning edge, got %s", edge.Status)
	}
	if !topology.Meta.SimulationOnly {
		t.Fatal("expected simulationOnly metadata")
	}
}

type fakeSimulation struct {
	status   simulation.Status
	snapshot simulation.TelemetrySnapshot
	alarms   []simulation.Alarm
	fail     bool
}

func newFakeSimulation() *fakeSimulation {
	now := time.Now().UTC()
	return &fakeSimulation{
		status: simulation.Status{Running: true, Mode: "NORMAL", Health: "OK", ActiveScenario: "normal", LastSimulationTimestamp: now.Format(time.RFC3339), SimulationOnly: true},
		snapshot: simulation.TelemetrySnapshot{
			ReactorPowerPct: 72, ThermalPowerMW: 216, ElectricPowerMW: 76,
			PrimaryTemperatureC: 286, SecondaryTemperatureC: 222,
			PrimaryPressureMPa: 15.1, SecondaryPressureMPa: 6.2,
			CoolantFlowPct: 88, SteamGeneratorLevelPct: 62,
			TurbineRPM: 3600, GeneratorLoadPct: 71, CondenserVacuumKPa: 88,
			FeedwaterFlowPct: 76, VibrationMMS: 2.1, RadiationLevelUSvH: 0.18,
			AvailabilityPct: 99.2, EfficiencyPct: 34.8, Timestamp: now,
			Mode: "NORMAL", Health: "OK", SimulationOnly: true, Scenario: "normal",
		},
	}
}

func (f *fakeSimulation) Status(context.Context) (simulation.Status, error) {
	if f.fail {
		return simulation.Status{}, errFakeUnavailable
	}
	return f.status, nil
}

func (f *fakeSimulation) LatestTelemetry(context.Context) (simulation.TelemetrySnapshot, error) {
	if f.fail {
		return simulation.TelemetrySnapshot{}, errFakeUnavailable
	}
	return f.snapshot, nil
}

func (f *fakeSimulation) ActiveAlarms(context.Context) ([]simulation.Alarm, error) {
	if f.fail {
		return nil, errFakeUnavailable
	}
	return f.alarms, nil
}

func findNode(topology ProcessTopologyResponse, id string) *ProcessNode {
	for _, node := range topology.Nodes {
		if node.ID == id {
			return &node
		}
	}
	return nil
}

func findEdge(topology ProcessTopologyResponse, id string) *ProcessEdge {
	for _, edge := range topology.Edges {
		if edge.ID == id {
			return &edge
		}
	}
	return nil
}

func findMetric(node ProcessNode, key string) *ProcessMetric {
	for _, metric := range node.Metrics {
		if metric.Key == key {
			return &metric
		}
	}
	return nil
}

type fakeError string

func (e fakeError) Error() string { return string(e) }

const errFakeUnavailable = fakeError("simulation unavailable")
