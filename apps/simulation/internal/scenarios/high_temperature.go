package scenarios

import "github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/model"

func HighTemperature() model.ScenarioInfo {
	return model.ScenarioInfo{Name: model.ScenarioHighTemperature, Title: "High Temperature", Description: "Synthetic primary temperature excursion for alarm evaluation.", SimulationOnly: true}
}
