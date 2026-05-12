package scenarios

import "github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/model"

func PumpDegradation() model.ScenarioInfo {
	return model.ScenarioInfo{Name: model.ScenarioPumpDegradation, Title: "Pump Degradation", Description: "Synthetic coolant flow degradation with warning/alarm behavior.", SimulationOnly: true}
}
