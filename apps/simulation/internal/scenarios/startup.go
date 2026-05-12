package scenarios

import "github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/model"

func Startup() model.ScenarioInfo {
	return model.ScenarioInfo{Name: model.ScenarioStartup, Title: "Startup", Description: "Gradual synthetic power, temperature, and generator load increase.", SimulationOnly: true}
}
