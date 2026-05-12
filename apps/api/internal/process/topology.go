package process

func nodeDefinitions() []topologyNodeDefinition {
	return []topologyNodeDefinition{
		{
			ID: "reactor-core", Name: "Reactor Core", Type: "reactor", Zone: ZoneNuclearIsland,
			Description: "Synthetic simulated reactor heat source.", Position: ProcessNodePosition{X: 90, Y: 210},
		},
		{
			ID: "primary-loop", Name: "Primary Loop", Type: "primary-circuit", Zone: ZoneNuclearIsland,
			Description: "Synthetic simulated primary coolant loop.", Position: ProcessNodePosition{X: 330, Y: 210},
		},
		{
			ID: "steam-generator", Name: "Steam Generator", Type: "heat-exchanger", Zone: ZoneNuclearIsland,
			Description: "Synthetic simulated heat exchange boundary.", Position: ProcessNodePosition{X: 570, Y: 210},
		},
		{
			ID: "turbine", Name: "Turbine", Type: "rotating-equipment", Zone: ZoneTurbineIsland,
			Description: "Synthetic simulated turbine train.", Position: ProcessNodePosition{X: 830, Y: 120},
		},
		{
			ID: "generator", Name: "Generator", Type: "electrical", Zone: ZoneTurbineIsland,
			Description: "Synthetic simulated electric generator.", Position: ProcessNodePosition{X: 1080, Y: 120},
		},
		{
			ID: "condenser", Name: "Condenser", Type: "balance-of-plant", Zone: ZoneBalanceOfPlant,
			Description: "Synthetic simulated condenser.", Position: ProcessNodePosition{X: 830, Y: 330},
		},
		{
			ID: "feedwater-system", Name: "Feedwater System", Type: "auxiliary-system", Zone: ZoneBalanceOfPlant,
			Description: "Synthetic simulated feedwater system.", Position: ProcessNodePosition{X: 570, Y: 420},
		},
		{
			ID: "protection-system", Name: "Protection System", Type: "protection-simulation", Zone: ZoneSafetySimulation,
			Description: "Synthetic simulated protection system state.", Position: ProcessNodePosition{X: 90, Y: 420},
		},
	}
}

func edgeDefinitions() []topologyEdgeDefinition {
	return []topologyEdgeDefinition{
		{ID: "reactor-core-primary-loop", Source: "reactor-core", Target: "primary-loop", FlowType: FlowThermal, Label: "Heat generation"},
		{ID: "primary-loop-steam-generator", Source: "primary-loop", Target: "steam-generator", FlowType: FlowPrimaryCoolant, Label: "Primary heat transfer"},
		{ID: "steam-generator-turbine", Source: "steam-generator", Target: "turbine", FlowType: FlowSteam, Label: "Steam flow"},
		{ID: "turbine-generator", Source: "turbine", Target: "generator", FlowType: FlowMechanical, Label: "Shaft power"},
		{ID: "turbine-condenser", Source: "turbine", Target: "condenser", FlowType: FlowExhaustSteam, Label: "Exhaust steam"},
		{ID: "condenser-feedwater-system", Source: "condenser", Target: "feedwater-system", FlowType: FlowCondensate, Label: "Condensate return"},
		{ID: "feedwater-system-steam-generator", Source: "feedwater-system", Target: "steam-generator", FlowType: FlowFeedwater, Label: "Feedwater"},
		{ID: "protection-system-reactor-core", Source: "protection-system", Target: "reactor-core", FlowType: FlowProtectionSignal, Label: "Protection state"},
	}
}
