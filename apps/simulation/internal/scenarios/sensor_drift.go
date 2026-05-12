package scenarios

import "github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/model"

func SensorDrift() model.ScenarioInfo {
	return model.ScenarioInfo{Name: model.ScenarioSensorDrift, Title: "Sensor Drift", Description: "Synthetic temperature sensor drift that can create warning alarms.", SimulationOnly: true}
}
