package engine

import (
	"fmt"
	"math"
	"time"

	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/model"
)

type targets struct {
	power, primaryTemp, secondaryTemp, primaryPressure, secondaryPressure float64
	flow, level, rpm, load, vacuum, feedwater, vibration, radiation       float64
	mode                                                                  model.Mode
}

func (e *Engine) tick(now time.Time) model.TelemetrySnapshot {
	current := e.state.snapshot
	deltaSeconds := now.Sub(current.Timestamp).Seconds()
	if deltaSeconds <= 0 || deltaSeconds > 60 {
		deltaSeconds = e.cfg.TickInterval.Seconds()
	}
	if deltaSeconds <= 0 {
		deltaSeconds = 1
	}
	e.updateActuatorsLocked(now, deltaSeconds)
	target := e.targetsForScenario(current)
	phase := float64(e.state.tickCount) / 8

	current.ReactorPowerPct = approach(current.ReactorPowerPct, target.power+e.noise(0.35)+math.Sin(phase)*0.3, 0.12)
	current.PrimaryTemperatureC = approach(current.PrimaryTemperatureC, target.primaryTemp+e.noise(0.25), 0.10)
	current.SecondaryTemperatureC = approach(current.SecondaryTemperatureC, target.secondaryTemp+e.noise(0.18), 0.10)
	current.PrimaryPressureMPa = approach(current.PrimaryPressureMPa, target.primaryPressure+e.noise(0.03), 0.14)
	current.SecondaryPressureMPa = approach(current.SecondaryPressureMPa, target.secondaryPressure+e.noise(0.02), 0.14)
	current.CoolantFlowPct = approach(current.CoolantFlowPct, target.flow+e.noise(0.45), 0.14)
	current.SteamGeneratorLevelPct = approach(current.SteamGeneratorLevelPct, target.level+math.Sin(phase/2)*0.6, 0.10)
	current.TurbineRPM = approach(current.TurbineRPM, target.rpm+e.noise(6), 0.12)
	current.GeneratorLoadPct = approach(current.GeneratorLoadPct, target.load+e.noise(0.35), 0.12)
	current.CondenserVacuumKPa = approach(current.CondenserVacuumKPa, target.vacuum+e.noise(0.25), 0.10)
	current.FeedwaterFlowPct = approach(current.FeedwaterFlowPct, target.feedwater+e.noise(0.35), 0.12)
	current.VibrationMMS = approach(current.VibrationMMS, target.vibration+math.Abs(e.noise(0.08)), 0.10)
	current.RadiationLevelUSvH = approach(current.RadiationLevelUSvH, target.radiation+math.Abs(e.noise(0.01)), 0.08)

	current.ReactorPowerPct = clamp(current.ReactorPowerPct, 0, 100)
	current.PrimaryTemperatureC = clamp(current.PrimaryTemperatureC, 20, 340)
	current.SecondaryTemperatureC = clamp(current.SecondaryTemperatureC, 20, 270)
	current.PrimaryPressureMPa = clamp(current.PrimaryPressureMPa, 0, 18)
	current.SecondaryPressureMPa = clamp(current.SecondaryPressureMPa, 0, 9)
	current.CoolantFlowPct = clamp(current.CoolantFlowPct, 0, 110)
	current.SteamGeneratorLevelPct = clamp(current.SteamGeneratorLevelPct, 0, 100)
	current.TurbineRPM = clamp(current.TurbineRPM, 0, 3800)
	current.GeneratorLoadPct = clamp(current.GeneratorLoadPct, 0, 100)
	current.CondenserVacuumKPa = clamp(current.CondenserVacuumKPa, 0, 100)
	current.FeedwaterFlowPct = clamp(current.FeedwaterFlowPct, 0, 110)
	current.VibrationMMS = clamp(current.VibrationMMS, 0, 8)
	current.RadiationLevelUSvH = clamp(current.RadiationLevelUSvH, 0, 2)

	current.ThermalPowerMW = round(current.ReactorPowerPct * 3.0)
	current.ElectricPowerMW = round(current.GeneratorLoadPct * 1.08)
	current.AvailabilityPct = clamp(99.4-(current.VibrationMMS*1.6)-penalty(current.Health), 70, 100)
	current.EfficiencyPct = clamp(31.5+(current.GeneratorLoadPct/100)*5.2-(100-current.CoolantFlowPct)*0.02, 25, 39)
	current.Mode = target.mode
	current.Health = deriveHealth(current)
	if current.Mode == model.ModeTrip {
		current.Health = model.HealthTrip
	}
	processFlow := e.processFlowTargetLocked()
	current.LoopFlowKGS = round(approach(current.LoopFlowKGS, processFlow, 0.28))
	current.LoopTemperatureC = round(approach(current.LoopTemperatureC, processTemperatureTarget(processFlow), 0.10))
	current.LoopPressureMPa = round(approach(current.LoopPressureMPa, e.processPressureTargetLocked(), 0.18))
	current.TankLevelPct = round(approach(current.TankLevelPct, clamp(54+current.SteamGeneratorLevelPct*0.28, 0, 100), 0.10))
	current.ValvePositionPct = round(e.state.valve.positionPercent)
	current.ValveState = string(e.state.valve.state)
	current.PumpState = string(e.state.pump.state)
	current.PumpRPM = round(e.state.pump.rpm)
	current.HeatExchangerState = heatExchangerStateForSnapshot(current)
	current.PIDControllerMode = string(e.state.control.mode)
	current.Timestamp = now
	current.SimulationOnly = true
	current.Scenario = string(e.state.activeScenario)

	return current
}

func (e *Engine) targetsForScenario(current model.TelemetrySnapshot) targets {
	switch e.state.activeScenario {
	case model.ScenarioStartup:
		targetPower := clamp(current.ReactorPowerPct+2.5, 25, 72)
		return nominalTargets(targetPower, model.ModeStartup)
	case model.ScenarioLoadRamp:
		targetPower := 58 + 18*math.Sin(float64(e.state.tickCount)/25)
		return nominalTargets(targetPower, model.ModeLoadChange)
	case model.ScenarioSensorDrift:
		t := nominalTargets(72, model.ModeWarning)
		t.primaryTemp = 308 + math.Min(float64(e.state.tickCount)*0.12, 12)
		return t
	case model.ScenarioPumpDegradation:
		t := nominalTargets(70, model.ModeDegraded)
		t.flow = 62
		t.primaryTemp = 306
		t.vibration = 4.9
		return t
	case model.ScenarioHighTemperature:
		t := nominalTargets(76, model.ModeWarning)
		t.primaryTemp = 322
		return t
	case model.ScenarioPressureDeviation:
		t := nominalTargets(70, model.ModeWarning)
		t.primaryPressure = 16.5
		return t
	case model.ScenarioTrip:
		return targets{power: 2, primaryTemp: 245, secondaryTemp: 150, primaryPressure: 12.8, secondaryPressure: 2.5, flow: 35, level: 52, rpm: 200, load: 0, vacuum: 55, feedwater: 30, vibration: 3.2, radiation: 0.2, mode: model.ModeTrip}
	default:
		return nominalTargets(72, model.ModeNormal)
	}
}

func nominalTargets(power float64, mode model.Mode) targets {
	return targets{
		power:             power,
		primaryTemp:       270 + power*0.22,
		secondaryTemp:     205 + power*0.23,
		primaryPressure:   14.2 + power*0.012,
		secondaryPressure: 5.4 + power*0.011,
		flow:              78 + power*0.14,
		level:             62,
		rpm:               power * 50,
		load:              power * 0.98,
		vacuum:            86,
		feedwater:         66 + power*0.14,
		vibration:         1.4 + power*0.01,
		radiation:         0.14 + power*0.0006,
		mode:              mode,
	}
}

func deriveHealth(snapshot model.TelemetrySnapshot) model.Health {
	if snapshot.PrimaryTemperatureC >= 318 || snapshot.CoolantFlowPct <= 58 {
		return model.HealthAlarm
	}
	if snapshot.PrimaryTemperatureC >= 306 || snapshot.PrimaryPressureMPa >= 16.2 || snapshot.CoolantFlowPct <= 68 || snapshot.VibrationMMS >= 4.8 {
		return model.HealthWarning
	}
	return model.HealthOK
}

func heatExchangerStateForSnapshot(snapshot model.TelemetrySnapshot) string {
	if snapshot.Mode == model.ModeTrip {
		return "Offline"
	}
	if snapshot.Health == model.HealthWarning || snapshot.Health == model.HealthAlarm {
		return "Mock Duty"
	}
	return "Online"
}

func (e *Engine) updateActuatorsLocked(now time.Time, deltaSeconds float64) {
	e.updateValveLocked(now, deltaSeconds)
	e.updatePumpLocked(now, deltaSeconds)
}

func (e *Engine) updateValveLocked(now time.Time, deltaSeconds float64) {
	if !valveIsMoving(e.state.valve.state) {
		return
	}

	previous := e.state.valve.positionPercent
	step := valveSpeedPctPerSec * deltaSeconds
	target := e.state.valve.targetPositionPercent
	if previous < target {
		e.state.valve.positionPercent = clamp(previous+step, previous, target)
	} else {
		e.state.valve.positionPercent = clamp(previous-step, target, previous)
	}
	e.state.valve.updatedAt = now

	if !almostEqual(e.state.valve.positionPercent, target) {
		return
	}

	e.state.valve.positionPercent = target
	e.state.valve.state = valveRestState(target)
	commandID := e.state.valve.activeCommandID
	e.state.valve.activeCommandID = ""
	if commandID == "" {
		return
	}

	e.updateCommandLocked(commandID, func(command model.Command) model.Command {
		return completeCommand(command, now, commandCompletedText)
	})
	e.appendEventLocked(model.EventTypeCommandCompleted, model.EventSeverityInfo, "simulation", "Valve V-101 movement completed in simulation.", e.state.valve.tag, commandID, now, nil)
	e.appendEquipmentEventLocked(fmt.Sprintf("Valve V-101 state changed to %s.", e.state.valve.state), e.state.valve.tag, commandID, now)
}

func (e *Engine) updatePumpLocked(now time.Time, deltaSeconds float64) {
	switch e.state.pump.state {
	case model.PumpStateStarting:
		e.state.pump.rpm = approach(e.state.pump.rpm, pumpNominalRPM, clamp(deltaSeconds/2, 0.1, 1))
		if now.Before(e.state.pump.transitionUntil) {
			return
		}
		e.state.pump.state = model.PumpStateRunning
		e.state.pump.rpm = pumpNominalRPM
		e.completePumpActiveCommandLocked(now, "Pump P-101 reached RUNNING in simulation.")
	case model.PumpStateStopping:
		e.state.pump.rpm = approach(e.state.pump.rpm, 0, clamp(deltaSeconds/2, 0.1, 1))
		if now.Before(e.state.pump.transitionUntil) {
			return
		}
		e.state.pump.state = model.PumpStateStopped
		e.state.pump.rpm = 0
		e.completePumpActiveCommandLocked(now, "Pump P-101 reached STOPPED in simulation.")
	case model.PumpStateRunning:
		e.state.pump.rpm = pumpNominalRPM
	case model.PumpStateStopped:
		e.state.pump.rpm = 0
	}
	e.state.pump.updatedAt = now
}

func (e *Engine) completePumpActiveCommandLocked(now time.Time, message string) {
	commandID := e.state.pump.activeCommandID
	e.state.pump.activeCommandID = ""
	if commandID == "" {
		return
	}
	e.updateCommandLocked(commandID, func(command model.Command) model.Command {
		return completeCommand(command, now, message)
	})
	e.appendEventLocked(model.EventTypeCommandCompleted, model.EventSeverityInfo, "simulation", message, e.state.pump.tag, commandID, now, nil)
	e.appendEquipmentEventLocked(fmt.Sprintf("Pump P-101 state changed to %s.", e.state.pump.state), e.state.pump.tag, commandID, now)
}

func (e *Engine) processFlowTargetLocked() float64 {
	pumpFactor := 0.0
	switch e.state.pump.state {
	case model.PumpStateRunning:
		pumpFactor = 1.0
	case model.PumpStateStarting, model.PumpStateStopping:
		pumpFactor = 0.2
	}
	return clamp(150*pumpFactor*(e.state.valve.positionPercent/100), 0, 150)
}

func (e *Engine) processPressureTargetLocked() float64 {
	pumpFactor := 0.0
	switch e.state.pump.state {
	case model.PumpStateRunning:
		pumpFactor = 1.0
	case model.PumpStateStarting, model.PumpStateStopping:
		pumpFactor = 0.35
	}
	valveRestriction := (100 - e.state.valve.positionPercent) / 100
	return clamp(13.6+pumpFactor*1.4+valveRestriction*0.35, 0, 18)
}

func processTemperatureTarget(flow float64) float64 {
	return clamp(292-flow*0.045, 270, 310)
}

func approach(current, target, alpha float64) float64 {
	return current + (target-current)*alpha
}

func clamp(value, min, max float64) float64 {
	if value < min {
		return min
	}
	if value > max {
		return max
	}
	return value
}

func round(value float64) float64 {
	return math.Round(value*100) / 100
}

func penalty(health model.Health) float64 {
	switch health {
	case model.HealthAlarm:
		return 9
	case model.HealthWarning:
		return 3
	case model.HealthTrip:
		return 20
	default:
		return 0
	}
}
