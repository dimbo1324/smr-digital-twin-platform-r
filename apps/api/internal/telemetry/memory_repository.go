package telemetry

import (
	"context"
	"time"
)

type MemoryRepository struct{}

func NewMemoryRepository() *MemoryRepository {
	return &MemoryRepository{}
}

func (r *MemoryRepository) Latest(_ context.Context) ([]TelemetryPoint, error) {
	now := time.Now().UTC()
	return []TelemetryPoint{
		numberPoint("TT-101", "Temperature", 286.4, "C", QualityGood, now),
		numberPoint("PT-101", "Pressure", 15.1, "MPa", QualityGood, now),
		numberPoint("FT-101", "Flow", 118, "kg/s", QualityGood, now),
		numberPoint("LT-101", "Tank Level", 72, "%", QualityGood, now),
		numberPoint("V-101.POS", "Valve Position", 64, "%", QualityUncertain, now),
		textPoint("V-101.STATE", "Valve State", "STOPPED", "", QualityUncertain, now),
		textPoint("P-101.STATE", "Pump State", "Offline", "", QualityBad, now),
		numberPoint("P-101.RPM", "Pump Speed", 0, "rpm", QualityBad, now),
		textPoint("HX-101.STATE", "Heat Exchanger State", "Mock Duty", "", QualityUncertain, now),
		textPoint("TIC-101.MODE", "PID Controller Mode", "Disabled", "", QualityUncertain, now),
	}, nil
}

func numberPoint(tag, name string, value float64, unit string, quality Quality, timestamp time.Time) TelemetryPoint {
	return TelemetryPoint{
		Tag:       tag,
		Name:      name,
		Value:     &value,
		Unit:      unit,
		Quality:   quality,
		Timestamp: timestamp,
		Source:    "mock-api",
	}
}

func textPoint(tag, name, value, unit string, quality Quality, timestamp time.Time) TelemetryPoint {
	return TelemetryPoint{
		Tag:       tag,
		Name:      name,
		ValueText: &value,
		Unit:      unit,
		Quality:   quality,
		Timestamp: timestamp,
		Source:    "mock-api",
	}
}
