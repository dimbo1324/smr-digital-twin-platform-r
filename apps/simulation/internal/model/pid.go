package model

import "time"

type PIDConfig struct {
	ControllerTag          string  `json:"controllerTag"`
	ProcessVariableTag     string  `json:"processVariableTag"`
	ManipulatedVariableTag string  `json:"manipulatedVariableTag"`
	Setpoint               float64 `json:"setpoint"`
	Kp                     float64 `json:"kp"`
	Ki                     float64 `json:"ki"`
	Kd                     float64 `json:"kd"`
	OutputMin              float64 `json:"outputMin"`
	OutputMax              float64 `json:"outputMax"`
	IntegralMin            float64 `json:"integralMin"`
	IntegralMax            float64 `json:"integralMax"`
	SampleTimeMS           int     `json:"sampleTimeMs"`
	Enabled                bool    `json:"enabled"`
}

type PIDState struct {
	Setpoint      float64   `json:"setpoint"`
	ProcessValue  float64   `json:"processValue"`
	Error         float64   `json:"error"`
	PreviousError float64   `json:"previousError"`
	Integral      float64   `json:"integral"`
	Derivative    float64   `json:"derivative"`
	PTerm         float64   `json:"pTerm"`
	ITerm         float64   `json:"iTerm"`
	DTerm         float64   `json:"dTerm"`
	Output        float64   `json:"output"`
	LastOutput    float64   `json:"lastOutput"`
	OutputBias    float64   `json:"outputBias"`
	LastUpdateAt  time.Time `json:"lastUpdateAt"`
	Active        bool      `json:"active"`
	Saturated     bool      `json:"saturated"`
	Status        string    `json:"status"`
}

type PIDStatus struct {
	ControllerTag          string           `json:"controllerTag"`
	Mode                   ControlMode      `json:"mode"`
	Authority              ControlAuthority `json:"authority"`
	Active                 bool             `json:"active"`
	PIDImplemented         bool             `json:"pidImplemented"`
	ProcessVariableTag     string           `json:"processVariableTag"`
	ProcessValue           float64          `json:"processValue"`
	Setpoint               float64          `json:"setpoint"`
	ManipulatedVariableTag string           `json:"manipulatedVariableTag"`
	Output                 float64          `json:"output"`
	OutputMin              float64          `json:"outputMin"`
	OutputMax              float64          `json:"outputMax"`
	Kp                     float64          `json:"kp"`
	Ki                     float64          `json:"ki"`
	Kd                     float64          `json:"kd"`
	Error                  float64          `json:"error"`
	PTerm                  float64          `json:"pTerm"`
	ITerm                  float64          `json:"iTerm"`
	DTerm                  float64          `json:"dTerm"`
	Integral               float64          `json:"integral"`
	Derivative             float64          `json:"derivative"`
	Saturated              bool             `json:"saturated"`
	Status                 string           `json:"status"`
	UpdatedAt              time.Time        `json:"updatedAt"`
	SafetyDisclaimer       string           `json:"safetyDisclaimer"`
}

type PIDConfigUpdateRequest struct {
	Setpoint    *float64 `json:"setpoint,omitempty"`
	Kp          *float64 `json:"kp,omitempty"`
	Ki          *float64 `json:"ki,omitempty"`
	Kd          *float64 `json:"kd,omitempty"`
	OutputMin   *float64 `json:"outputMin,omitempty"`
	OutputMax   *float64 `json:"outputMax,omitempty"`
	RequestedBy string   `json:"requestedBy,omitempty"`
	Reason      string   `json:"reason,omitempty"`
}
