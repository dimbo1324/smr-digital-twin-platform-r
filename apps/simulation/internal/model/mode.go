package model

type Mode string

const (
	ModeStartup     Mode = "STARTUP"
	ModeNormal      Mode = "NORMAL"
	ModeLoadChange  Mode = "LOAD_CHANGE"
	ModeWarning     Mode = "WARNING"
	ModeTrip        Mode = "TRIP"
	ModeShutdown    Mode = "SHUTDOWN"
	ModeMaintenance Mode = "MAINTENANCE"
	ModeDegraded    Mode = "DEGRADED"
)

type Health string

const (
	HealthOK      Health = "OK"
	HealthWarning Health = "WARNING"
	HealthAlarm   Health = "ALARM"
	HealthTrip    Health = "TRIP"
)
