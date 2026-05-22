package auth

import "net/http"

var viewPermissions = []Permission{
	PermissionViewDashboard,
	PermissionViewProcess,
	PermissionViewAlarms,
	PermissionViewEvents,
	PermissionViewTrends,
	PermissionViewSettings,
	PermissionViewMQTTStatus,
	PermissionViewHistorian,
}

var users = []DemoUser{
	{
		ID:          "demo-viewer",
		DisplayName: "Demo Viewer",
		Role:        RoleViewer,
		Permissions: append([]Permission(nil), viewPermissions...),
		BadgeLabel:  "Viewer",
		Description: "Read-only demo user for synthetic simulation data.",
	},
	{
		ID:          "demo-engineer",
		DisplayName: "Demo Engineer",
		Role:        RoleEngineer,
		Permissions: append(append([]Permission(nil), viewPermissions...), PermissionUpdatePIDConfig, PermissionViewDiagnostics),
		BadgeLabel:  "Engineer",
		Description: "Demo engineer who can tune the simulation-only PID controller.",
	},
	{
		ID:          "demo-operator",
		DisplayName: "Demo Operator",
		Role:        RoleOperator,
		Permissions: append(append([]Permission(nil), viewPermissions...), PermissionSendCommand),
		BadgeLabel:  "Operator",
		Description: "Default demo operator for simulation-only valve and pump commands.",
	},
	{
		ID:          "demo-supervisor",
		DisplayName: "Demo Supervisor",
		Role:        RoleSupervisor,
		Permissions: append(append([]Permission(nil), viewPermissions...), PermissionChangeControlMode, PermissionAcknowledgeAlarm, PermissionRunScenario, PermissionViewDiagnostics),
		BadgeLabel:  "Supervisor",
		Description: "Demo supervisor for mode changes, alarm acknowledgement, and scenarios.",
	},
	{
		ID:          "demo-admin",
		DisplayName: "Demo Admin",
		Role:        RoleAdmin,
		Permissions: append(append([]Permission(nil), viewPermissions...), PermissionSendCommand, PermissionChangeControlMode, PermissionUpdatePIDConfig, PermissionAcknowledgeAlarm, PermissionRunScenario, PermissionViewDiagnostics, PermissionAdminDemoSession),
		BadgeLabel:  "Admin",
		Description: "Demo administrator with all simulation-only permissions.",
	},
}

func Users() []DemoUser {
	copied := make([]DemoUser, len(users))
	copy(copied, users)
	return copied
}

func Resolve(userID string) DemoUser {
	if userID == "" {
		userID = DefaultUserID
	}
	for _, user := range users {
		if user.ID == userID {
			return user
		}
	}
	return Resolve(DefaultUserID)
}

func FromRequest(r *http.Request) Session {
	return Resolve(r.Header.Get(HeaderDemoUser)).Session()
}
