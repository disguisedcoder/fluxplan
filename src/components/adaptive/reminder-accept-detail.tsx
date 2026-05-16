import { reminderAcceptDetail } from "@/lib/adaptive/reminder-suggestion-copy";

export function ReminderAcceptDetail() {
  return (
    <div className="rounded-md border border-border/60 bg-card px-3 py-2 text-sm space-y-2">
      <p>{reminderAcceptDetail.main}</p>
      <p className="text-xs text-muted-foreground">{reminderAcceptDetail.onAccept}</p>
      <p className="text-xs text-muted-foreground">{reminderAcceptDetail.onUndo}</p>
      <p className="text-xs text-muted-foreground">{reminderAcceptDetail.onSnooze}</p>
    </div>
  );
}
