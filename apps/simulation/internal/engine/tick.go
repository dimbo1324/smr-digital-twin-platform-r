package engine

import (
	"fmt"
	"math"
	"time"

	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/actuators"
	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/model"
	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/process"
	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/scenarios"
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
	target := scenarios.TargetsForScenario(e.state.activeScenario, current, e.state.tickCount)
	return targets{
		power:             target.Power,
		primaryTemp:       target.PrimaryTemp,
		secondaryTemp:     target.SecondaryTemp,
		primaryPressure:   target.PrimaryPressure,
		secondaryPressure: target.SecondaryPressure,
		flow:              target.Flow,
		level:             target.Level,
		rpm:               target.RPM,
		load:              target.Load,
		vacuum:            target.Vacuum,
		feedwater:         target.Feedwater,
		vibration:         target.Vibration,
		radiation:         target.Radiation,
		mode:              target.Mode,
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
