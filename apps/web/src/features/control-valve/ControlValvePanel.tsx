import { Power, SlidersHorizontal } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

export function ControlValvePanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Control Valve V-101</CardTitle>
        <CardDescription>
          Command controls are disabled until the backend command layer exists.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Mock position</p>
              <p className="mt-1 text-3xl font-semibold text-white">64%</p>
            </div>
            <div className="rounded-md border border-amber-400/25 bg-amber-500/10 p-3 text-amber-200">
              <SlidersHorizontal className="h-6 w-6" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-4 h-2 rounded-full bg-white/10">
            <div className="h-2 w-[64%] rounded-full bg-amber-300" />
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
