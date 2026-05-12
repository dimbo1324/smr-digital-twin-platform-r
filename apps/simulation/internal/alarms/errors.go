package alarms

import "errors"

var (
	ErrAlarmNotFound             = errors.New("alarm not found")
	ErrAlarmAlreadyCleared       = errors.New("cleared alarm cannot be acknowledged")
	ErrInvalidAcknowledgement    = errors.New("invalid acknowledgement")
	ErrAlarmLifecycleUnavailable = errors.New("alarm lifecycle unavailable")
)
