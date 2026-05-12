import type { Alarm } from "@/entities/alarms/model/types";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

export function AcknowledgeDialog({
  alarm,
  note,
  error,
  pending,
  onNoteChange,
  onCancel,
  onConfirm,
}: {
  alarm: Alarm;
  note: string;
  error?: string;
  pending: boolean;
  onNoteChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-lg shadow-lift">
        <CardHeader>
          <CardTitle>Acknowledge alarm</CardTitle>
          <CardDescription>
            {alarm.code} · {alarm.title}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-info/25 bg-info/10 p-4 text-sm text-muted-foreground">
            This acknowledgement is stored only in the synthetic simulation lifecycle.
            It is not a real operational acknowledgement.
          </div>
          <label className="block text-sm font-medium text-foreground" htmlFor="ack-note">
            Optional note
          </label>
          <textarea
            id="ack-note"
            value={note}
            onChange={(event) => onNoteChange(event.target.value.slice(0, 500))}
            className="min-h-28 w-full rounded-2xl border border-border/70 bg-background/70 p-3 text-sm text-foreground outline-none transition focus:border-primary"
            placeholder="Acknowledged during simulation review"
          />
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="button" disabled={pending} onClick={onConfirm}>
              Confirm acknowledgement
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
