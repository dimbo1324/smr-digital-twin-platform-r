package engine

import (
	"fmt"
	"math"
	"time"

	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/actuators"
	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/model"
	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/process"
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
	e.updatePIDLocked(now, deltaSeconds)
	e.updateActuatorsLocked(now, deltaSeconds)
	target := e.targetsForScenario(current)
	phase := float64(e.state.tickCount) / 8

	current.ReactorPowerPct = process.Approach(current.ReactorPowerPct, target.power+e.noise(0.35)+math.Sin(phase)*0.3, 0.12)
	current.PrimaryTemperatureC = process.Approach(current.PrimaryTemperatureC, target.primaryTemp+e.noise(0.25), 0.10)
	current.SecondaryTemperatureC = process.Approach(current.SecondaryTemperatureC, target.secondaryTemp+e.noise(0.18), 0.10)
	current.PrimaryPressureMPa = process.Approach(current.PrimaryPressureMPa, target.primaryPressure+e.noise(0.03), 0.14)
	current.SecondaryPressureMPa = process.Approach(current.SecondaryPressureMPa, target.secondaryPressure+e.noise(0.02), 0.14)
	current.CoolantFlowPct = process.Approach(current.CoolantFlowPct, target.flow+e.noise(0.45), 0.14)
	current.SteamGeneratorLevelPct = process.Approach(current.SteamGeneratorLevelPct, target.level+math.Sin(phase/2)*0.6, 0.10)
	current.TurbineRPM = process.Approach(current.TurbineRPM, target.rpm+e.noise(6), 0.12)
	current.GeneratorLoadPct = process.Approach(current.GeneratorLoadPct, target.load+e.noise(0.35), 0.12)
	current.CondenserVacuumKPa = process.Approach(current.CondenserVacuumKPa, target.vacuum+e.noise(0.25), 0.10)
	current.FeedwaterFlowPct = process.Approach(current.FeedwaterFlowPct, target.feedwater+e.noise(0.35), 0.12)
	current.VibrationMMS = process.Approach(current.VibrationMMS, target.vibration+math.Abs(e.noise(0.08)), 0.10)
	current.RadiationLevelUSvH = process.Approach(current.RadiationLevelUSvH, target.radiation+math.Abs(e.noise(0.01)), 0.08)

	current.ReactorPowerPct = process.Clamp(current.ReactorPowerPct, 0, 100)
	current.PrimaryTemperatureC = process.Clamp(current.PrimaryTemperatureC, 20, 340)
	current.SecondaryTemperatureC = process.Clamp(current.SecondaryTemperatureC, 20, 270)
	current.PrimaryPressureMPa = process.Clamp(current.PrimaryPressureMPa, 0, 18)
	current.SecondaryPressureMPa = process.Clamp(current.SecondaryPressureMPa, 0, 9)
	current.CoolantFlowPct = process.Clamp(current.CoolantFlowPct, 0, 110)
	current.SteamGeneratorLevelPct = process.Clamp(current.SteamGeneratorLevelPct, 0, 100)
	current.TurbineRPM = process.Clamp(current.TurbineRPM, 0, 3800)
	current.GeneratorLoadPct = process.Clamp(current.GeneratorLoadPct, 0, 100)
	current.CondenserVacuumKPa = process.Clamp(current.CondenserVacuumKPa, 0, 100)
	current.FeedwaterFlowPct = process.Clamp(current.FeedwaterFlowPct, 0, 110)
	current.VibrationMMS = process.Clamp(current.VibrationMMS, 0, 8)
	current.RadiationLevelUSvH = process.Clamp(current.RadiationLevelUSvH, 0, 2)

	current.ThermalPowerMW = process.Round(current.ReactorPowerPct * 3.0)
	current.ElectricPowerMW = process.Round(current.GeneratorLoadPct * 1.08)
	current.AvailabilityPct = process.Clamp(99.4-(current.VibrationMMS*1.6)-process.AvailabilityPenalty(current.Health), 70, 100)
	current.EfficiencyPct = process.Clamp(31.5+(current.GeneratorLoadPct/100)*5.2-(100-current.CoolantFlowPct)*0.02, 25, 39)
	current.Mode = target.mode
	current.Health = deriveHealth(current)
	if current.Mode == model.ModeTrip {
		current.Health = model.HealthTrip
	}
	processFlow := process.FlowTarget(e.state.pump.state, e.state.valve.positionPercent)
	current.LoopFlowKGS = process.Round(process.Approach(current.LoopFlowKGS, processFlow, 0.28))
	current.LoopTemperatureC = process.Round(process.Approach(current.LoopTemperatureC, process.TemperatureTarget(processFlow), 0.10))
	current.LoopPressureMPa = process.Round(process.Approach(current.LoopPressureMPa, process.PressureTarget(e.state.pump.state, e.state.valve.positionPercent), 0.18))
	current.TankLevelPct = process.Round(process.Approach(current.TankLevelPct, process.Clamp(54+current.SteamGeneratorLevelPct*0.28, 0, 100), 0.10))
	current.ValvePositionPct = process.Round(e.state.valve.positionPercent)
	current.ValveState = string(e.state.valve.state)
	current.PumpState = string(e.state.pump.state)
	current.PumpRPM = process.Round(e.state.pump.rpm)
	current.HeatExchangerState = heatExchangerStateForSnapshot(current)
	current.PIDControllerMode = string(e.state.control.mode)
	current.PIDSetpointC = process.Round(e.state.pid.config.Setpoint)
	current.PIDProcessValueC = process.Round(e.state.pid.state.ProcessValue)
	current.PIDErrorC = process.Round(e.state.pid.state.Error)
	current.PIDOutputPct = process.Round(e.state.pid.state.Output)
	current.PIDPTermPct = process.Round(e.state.pid.state.PTerm)
	current.PIDITermPct = process.Round(e.state.pid.state.ITerm)
	current.PIDDTermPct = process.Round(e.state.pid.state.DTerm)
	current.PIDStatus = e.state.pid.state.Status
	current.PIDSaturated = e.state.pid.state.Saturated
	current.Timestamp = now
	current.SimulationOnly = true
	current.Scenario = string(e.state.activeScenario)

	return current
}

func (e *Engine) targetsForScenario(current model.TelemetrySnapshot) targets {
	switch e.state.activeScenario {
	case model.ScenarioStartup:
		targetPower := process.Clamp(current.ReactorPowerPct+2.5, 25, 72)
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
		return "Reduced Duty"
	}
	return "Online"
}

func (e *Engine) updateActuatorsLocked(now time.Time, deltaSeconds float64) {
	e.updateValveLocked(now, deltaSeconds)
	e.updatePumpLocked(now, deltaSeconds)
}

func (e *Engine) updateValveLocked(now time.Time, deltaSeconds float64) {
	if !actuators.ValveIsMoving(e.state.valve.state) {
		return
	}

	previous := e.state.valve.positionPercent
	target := e.state.valve.targetPositionPercent
	e.state.valve.positionPercent = actuators.NextValvePosition(previous, target, valveSpeedPctPerSec, deltaSeconds)
	e.state.valve.updatedAt = now

	if !process.AlmostEqual(e.state.valve.positionPercent, target) {
		return
	}

	e.state.valve.positionPercent = target
	e.state.valve.state = actuators.ValveRestState(target)
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
	transition := actuators.NextPumpTransition(e.state.pump.state, e.state.pump.rpm, pumpNominalRPM, deltaSeconds, now, e.state.pump.transitionUntil)
	switch e.state.pump.state {
	case model.PumpStateStarting:
		e.state.pump.rpm = transition.RPM
		if !transition.Done {
			return
		}
		e.state.pump.state = transition.State
		e.state.pump.rpm = transition.RPM
		e.completePumpActiveCommandLocked(now, "Pump P-101 reached RUNNING in simulation.")
	case model.PumpStateStopping:
		e.state.pump.rpm = transition.RPM
		if !transition.Done {
			return
		}
		e.state.pump.state = transition.State
		e.state.pump.rpm = transition.RPM
		e.completePumpActiveCommandLocked(now, "Pump P-101 reached STOPPED in simulation.")
	case model.PumpStateRunning:
		e.state.pump.rpm = transition.RPM
	case model.PumpStateStopped:
		e.state.pump.rpm = transition.RPM
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
