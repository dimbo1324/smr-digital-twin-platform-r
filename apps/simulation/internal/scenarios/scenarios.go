package scenarios

import "github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/model"

func List() []model.ScenarioInfo {
	return []model.ScenarioInfo{
		Normal(),
		Startup(),
		LoadRamp(),
		SensorDrift(),
		PumpDegradation(),
		HighTemperature(),
		PressureDeviation(),
		Trip(),
	}
}

func Exists(name model.ScenarioName) bool {
	for _, scenario := range List() {
		if scenario.Name == name {
			return true
		}
	}

	return false
}
