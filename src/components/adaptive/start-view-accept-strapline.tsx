import { labelForStartHref } from "@/lib/settings/start-view";

export function StartViewAcceptStrapline({ href }: { href: string }) {
  const label = labelForStartHref(href);
  return (
    <span data-testid="start-view-accept-strapline">
      Beim Annehmen setzt du deine Startansicht auf{" "}
      <span className="font-semibold text-foreground" data-testid="start-view-strapline-label">
        {label}
      </span>{" "}
      fest und springst sofort hin.
    </span>
  );
}
