package scenarios

import "github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/model"

func LoadRamp() model.ScenarioInfo {
	return model.ScenarioInfo{Name: model.ScenarioLoadRamp, Title: "Load Ramp", Description: "Smooth synthetic generator load ramp for HMI trend validation.", SimulationOnly: true}
}
