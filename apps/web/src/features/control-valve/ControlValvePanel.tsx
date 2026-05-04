import { LockKeyhole, Power, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

export function ControlValvePanel() {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Control Valve V-101</CardTitle>
            <CardDescription>
              Command controls are disabled until the backend command layer exists.
            </CardDescription>
          </div>
          <Badge variant="warning">manual locked</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-2xl border border-warning/25 bg-gradient-to-br from-warning/10 to-warning/5 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Mock position</p>
              <p className="mt-1 text-4xl font-semibold text-foreground">64%</p>
            </div>
            <div className="rounded-2xl border border-warning/25 bg-warning/10 p-3 text-warning">
              <SlidersHorizontal className="h-6 w-6" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-5 h-2.5 rounded-full bg-background/50">
            <div className="h-2.5 w-[64%] rounded-full bg-warning shadow-[0_0_22px_hsl(var(--warning)/0.32)]" />
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
            No simulated command channel connected.
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <Button variant="outline" disabled>
            <Power className="h-4 w-4" aria-hidden="true" />
            Open
          </Button>
          <Button variant="outline" disabled>
            Stop
          </Button>
          <Button variant="outline" disabled>
            Close
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
