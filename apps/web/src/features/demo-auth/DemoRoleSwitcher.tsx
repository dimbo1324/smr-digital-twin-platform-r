import { ShieldAlert, UserRound } from "lucide-react";
import { useAuthSession } from "@/entities/auth/api/useAuthSession";
import { useDemoUsers } from "@/entities/auth/api/useDemoUsers";
import { Badge } from "@/shared/ui/badge";

export function DemoRoleSwitcher() {
  const auth = useAuthSession();
  const demoUsers = useDemoUsers();
  const session = auth.session;

  return (
    <div
      className="flex max-w-full flex-wrap items-center gap-2 rounded-full border border-border/70 bg-card/70 px-2 py-1"
      data-testid="auth-user-switcher"
      aria-label="Demo RBAC role switcher"
    >
      <Badge variant="secondary" data-testid="auth-current-user">
        <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
        {session?.displayName ?? "Demo Operator"}
      </Badge>
      <label className="sr-only" htmlFor="demo-role-select">
        Select demo RBAC role
      </label>
      <select
        id="demo-role-select"
        value={demoUsers.selectedUserId}
        onChange={(event) => demoUsers.setDemoUser(event.target.value)}
        className="h-8 max-w-[11rem] rounded-full border border-border/80 bg-background px-3 text-xs font-medium text-foreground"
        data-testid="auth-current-role"
      >
        {demoUsers.users.length === 0 ? (
          <option value={demoUsers.selectedUserId}>{session?.role ?? "OPERATOR"}</option>
        ) : (
          demoUsers.users.map((user) => (
            <option
              key={user.id}
              value={user.id}
              data-testid={`auth-role-option-${user.role.toLowerCase()}`}
            >
              {user.role}
            </option>
          ))
        )}
      </select>
      <Badge variant="warning">
        <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
        Demo RBAC
      </Badge>
    </div>
  );
}
