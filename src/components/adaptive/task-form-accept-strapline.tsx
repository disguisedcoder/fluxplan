import {
  taskFormChipsBannerStrapline,
  taskFormOptionalFoldBannerStrapline,
  taskFormOptionalUnfoldBannerStrapline,
} from "@/lib/adaptive/suggestion-explanation";

export function TaskFormChipsAcceptStrapline() {
  return <span data-testid="task-form-chips-accept-strapline">{taskFormChipsBannerStrapline}</span>;
}

export function TaskFormOptionalFoldAcceptStrapline() {
  return (
    <span data-testid="task-form-optional-fold-accept-strapline">{taskFormOptionalFoldBannerStrapline}</span>
  );
}

export function TaskFormOptionalUnfoldAcceptStrapline() {
  return (
    <span data-testid="task-form-optional-unfold-accept-strapline">
      {taskFormOptionalUnfoldBannerStrapline}
    </span>
  );
}
