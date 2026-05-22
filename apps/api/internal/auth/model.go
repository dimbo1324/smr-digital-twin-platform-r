package auth

const (
	HeaderDemoUser = "X-Demo-User"
	DefaultUserID  = "demo-operator"

	RoleViewer     Role = "VIEWER"
	RoleEngineer   Role = "ENGINEER"
	RoleOperator   Role = "OPERATOR"
	RoleSupervisor Role = "SUPERVISOR"
	RoleAdmin      Role = "ADMIN"
)

type Role string

type Permission string

const (
	PermissionViewDashboard     Permission = "VIEW_DASHBOARD"
	PermissionViewProcess       Permission = "VIEW_PROCESS"
	PermissionViewAlarms        Permission = "VIEW_ALARMS"
	PermissionViewEvents        Permission = "VIEW_EVENTS"
	PermissionViewTrends        Permission = "VIEW_TRENDS"
	PermissionViewSettings      Permission = "VIEW_SETTINGS"
	PermissionSendCommand       Permission = "SEND_COMMAND"
	PermissionChangeControlMode Permission = "CHANGE_CONTROL_MODE"
	PermissionUpdatePIDConfig   Permission = "UPDATE_PID_CONFIG"
	PermissionAcknowledgeAlarm  Permission = "ACKNOWLEDGE_ALARM"
	PermissionRunScenario       Permission = "RUN_SCENARIO"
	PermissionViewDiagnostics   Permission = "VIEW_DIAGNOSTICS"
	PermissionViewMQTTStatus    Permission = "VIEW_MQTT_STATUS"
	PermissionViewHistorian     Permission = "VIEW_HISTORIAN_STATUS"
	PermissionAdminDemoSession  Permission = "ADMIN_DEMO_SESSION"
)

type DemoUser struct {
	ID          string       `json:"id"`
	DisplayName string       `json:"displayName"`
	Role        Role         `json:"role"`
	Permissions []Permission `json:"permissions"`
	BadgeLabel  string       `json:"badgeLabel"`
	Description string       `json:"description"`
}

type Session struct {
	UserID         string       `json:"userId"`
	DisplayName    string       `json:"displayName"`
	Role           Role         `json:"role"`
	Permissions    []Permission `json:"permissions"`
	Source         string       `json:"source"`
	SimulationOnly bool         `json:"simulationOnly"`
	Disclaimer     string       `json:"disclaimer"`
}

func (u DemoUser) Session() Session {
	return Session{
		UserID:         u.ID,
		DisplayName:    u.DisplayName,
		Role:           u.Role,
		Permissions:    append([]Permission(nil), u.Permissions...),
		Source:         "demo",
		SimulationOnly: true,
		Disclaimer:     "Demo RBAC only. Not production authentication.",
	}
}

func (s Session) Has(permission Permission) bool {
	for _, candidate := range s.Permissions {
		if candidate == permission {
			return true
		}
	}
	return false
}
