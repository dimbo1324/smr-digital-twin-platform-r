package model

import "time"

type MQTTStatus struct {
	Enabled                 bool       `json:"enabled"`
	Connected               bool       `json:"connected"`
	Status                  string     `json:"status"`
	BrokerURL               string     `json:"brokerUrl"`
	ClientID                string     `json:"clientId"`
	TopicPrefix             string     `json:"topicPrefix"`
	QoS                     int        `json:"qos"`
	Retain                  bool       `json:"retain"`
	PublishIntervalMS       int        `json:"publishIntervalMs"`
	LastConnectedAt         *time.Time `json:"lastConnectedAt,omitempty"`
	LastDisconnectedAt      *time.Time `json:"lastDisconnectedAt,omitempty"`
	LastSuccessfulPublishAt *time.Time `json:"lastSuccessfulPublishAt,omitempty"`
	LastErrorAt             *time.Time `json:"lastErrorAt,omitempty"`
	LastErrorMessage        string     `json:"lastErrorMessage,omitempty"`
	MessagesPublished       uint64     `json:"messagesPublished"`
	MessagesFailed          uint64     `json:"messagesFailed"`
	SimulationOnly          bool       `json:"simulationOnly"`
	SafetyDisclaimer        string     `json:"safetyDisclaimer"`
}
