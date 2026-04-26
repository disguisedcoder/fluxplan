export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 md:mb-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight md:text-[2rem]">
          {title}
        </h1>
        {subtitle ? (
          <p className="max-w-2xl text-sm text-muted-foreground md:text-[0.95rem]">
            {subtitle}
          </p>
        ) : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}
