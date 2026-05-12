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
		textPoint("P-101.STATE", "Pump State", "Offline", "", QualityBad, now),
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
