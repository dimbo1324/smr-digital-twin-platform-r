package scenarios

import "github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/model"

func Normal() model.ScenarioInfo {
	return model.ScenarioInfo{Name: model.ScenarioNormal, Title: "Normal", Description: "Stable synthetic operation around nominal demo values.", SimulationOnly: true}
}
