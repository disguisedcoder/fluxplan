import { reminderAcceptDetail } from "@/lib/adaptive/reminder-suggestion-copy";

export function ReminderAcceptDetail() {
  return (
    <div className="space-y-2.5 rounded-lg border border-border/60 bg-card px-3 py-3">
      <p className="text-sm leading-relaxed text-muted-foreground">{reminderAcceptDetail.main}</p>
      <p className="text-sm leading-relaxed text-muted-foreground">{reminderAcceptDetail.onAccept}</p>
      <p className="text-sm leading-relaxed text-muted-foreground">{reminderAcceptDetail.onUndo}</p>
      <p className="text-sm leading-relaxed text-muted-foreground">{reminderAcceptDetail.onSnooze}</p>
    </div>
  );
}
