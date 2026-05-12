package scenarios

import "github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/model"

func Trip() model.ScenarioInfo {
	return model.ScenarioInfo{Name: model.ScenarioTrip, Title: "Trip", Description: "Simulation-only trip state with critical alarm. Not a real operating procedure.", SimulationOnly: true}
}
