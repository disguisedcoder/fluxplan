import type { AdaptiveSuggestion } from "./types";
import { labelForStartHref, suggestedStartViewHrefFromPayload } from "@/lib/settings/start-view";
import { ReminderAcceptDetail } from "@/components/adaptive/reminder-accept-detail";
import {
  calendarConflictAcceptDetail,
  dailyFocusAcceptImpact,
  startViewAcceptImpactLead,
  startViewAcceptImpactParagraphs,
  taskFormChipsAcceptImpact,
  taskFormOptionalFoldAcceptImpact,
  taskFormOptionalUnfoldAcceptImpact,
} from "@/lib/adaptive/suggestion-explanation";

function AcceptImpactBody({ lead, paragraphs }: { lead: string; paragraphs: readonly string[] }) {
  return (
    <div className="space-y-2.5 rounded-lg border border-border/60 bg-card px-3 py-3">
      <p className="text-sm leading-relaxed text-muted-foreground">{lead}</p>
      {paragraphs.map((paragraph, index) => (
        <p key={index} className="text-sm leading-relaxed text-muted-foreground">
          {paragraph}
        </p>
      ))}
    </div>
  );
}

export function SuggestionAcceptImpact({ suggestion }: { suggestion: AdaptiveSuggestion }) {
  const { type, payload } = suggestion;

  if (type === "start_view") {
    const href = suggestedStartViewHrefFromPayload(payload);
    const label = labelForStartHref(href);
    return (
      <AcceptImpactBody
        lead={`${startViewAcceptImpactLead} Deine Startansicht wird auf „${label}“ gesetzt.`}
        paragraphs={startViewAcceptImpactParagraphs}
      />
    );
  }
  if (type === "reminder_suggestion") {
    return <ReminderAcceptDetail />;
  }
  if (type === "daily_focus") {
    return (
      <AcceptImpactBody
        lead={dailyFocusAcceptImpact.lead}
        paragraphs={dailyFocusAcceptImpact.paragraphs}
      />
    );
  }
  if (type === "task_form_chips") {
    return (
      <AcceptImpactBody
        lead={taskFormChipsAcceptImpact.lead}
        paragraphs={taskFormChipsAcceptImpact.paragraphs}
      />
    );
  }
  if (type === "task_form_optional_fold") {
    return (
      <AcceptImpactBody
        lead={taskFormOptionalFoldAcceptImpact.lead}
        paragraphs={taskFormOptionalFoldAcceptImpact.paragraphs}
      />
    );
  }
  if (type === "task_form_optional_unfold") {
    return (
      <AcceptImpactBody
        lead={taskFormOptionalUnfoldAcceptImpact.lead}
        paragraphs={taskFormOptionalUnfoldAcceptImpact.paragraphs}
      />
    );
  }
  if (type === "calendar_conflict") {
    return (
      <AcceptImpactBody
        lead={calendarConflictAcceptDetail.lead}
        paragraphs={calendarConflictAcceptDetail.paragraphs}
      />
    );
  }

  return (
    <p className="rounded-lg border border-border/60 bg-card px-3 py-3 text-sm leading-relaxed text-muted-foreground">
      Nichts passiert automatisch: FluxPlan setzt nur dann etwas um, wenn du den Vorschlag annimmst.
    </p>
  );
}
