package scenarios

import "github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/model"

func PressureDeviation() model.ScenarioInfo {
	return model.ScenarioInfo{Name: model.ScenarioPressureDeviation, Title: "Pressure Deviation", Description: "Synthetic primary pressure deviation for warning behavior.", SimulationOnly: true}
}
