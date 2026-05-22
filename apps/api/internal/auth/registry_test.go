package auth

import (
	"net/http/httptest"
	"testing"
)

func TestResolveDefaultUserIsOperator(t *testing.T) {
	session := Resolve("").Session()
	if session.UserID != DefaultUserID {
		t.Fatalf("expected default user %s, got %s", DefaultUserID, session.UserID)
	}
	if session.Role != RoleOperator {
		t.Fatalf("expected OPERATOR default role, got %s", session.Role)
	}
	if !session.Has(PermissionSendCommand) {
		t.Fatal("expected default operator to send simulation commands")
	}
	if session.Has(PermissionUpdatePIDConfig) {
		t.Fatal("operator should not update PID config")
	}
}

func TestResolveUnknownUserFallsBackToDefault(t *testing.T) {
	session := Resolve("missing-user").Session()
	if session.UserID != DefaultUserID {
		t.Fatalf("expected fallback user %s, got %s", DefaultUserID, session.UserID)
	}
}

func TestRolePermissions(t *testing.T) {
	cases := []struct {
		userID     string
		allowed    Permission
		disallowed Permission
	}{
		{"demo-viewer", PermissionViewDashboard, PermissionSendCommand},
		{"demo-engineer", PermissionUpdatePIDConfig, PermissionSendCommand},
		{"demo-operator", PermissionSendCommand, PermissionAcknowledgeAlarm},
		{"demo-supervisor", PermissionAcknowledgeAlarm, PermissionSendCommand},
		{"demo-admin", PermissionAdminDemoSession, ""},
	}

	for _, tc := range cases {
		t.Run(tc.userID, func(t *testing.T) {
			session := Resolve(tc.userID).Session()
			if !session.Has(tc.allowed) {
				t.Fatalf("expected %s to have %s", tc.userID, tc.allowed)
			}
			if tc.disallowed != "" && session.Has(tc.disallowed) {
				t.Fatalf("expected %s not to have %s", tc.userID, tc.disallowed)
			}
		})
	}
}

func TestFromRequestResolvesHeader(t *testing.T) {
	request := httptest.NewRequest("GET", "/api/v1/auth/session", nil)
	request.Header.Set(HeaderDemoUser, "demo-engineer")

	session := FromRequest(request)
	if session.UserID != "demo-engineer" || session.Role != RoleEngineer {
		t.Fatalf("expected engineer session, got %s/%s", session.UserID, session.Role)
	}
}
