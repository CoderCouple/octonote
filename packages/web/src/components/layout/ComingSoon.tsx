import type { LucideIcon } from 'lucide-react';

interface ComingSoonProps {
  icon: LucideIcon;
  title: string;
  description: string;
  bullets: string[];
}

export function ComingSoon({ icon: Icon, title, description, bullets }: ComingSoonProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b px-6 py-4">
        <Icon className="size-5" />
        <h1 className="text-lg font-semibold">{title}</h1>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
          Coming soon
        </span>
      </div>
      <div className="flex-1 overflow-auto px-6 py-12">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-6 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Icon className="size-7" />
          </div>
          <h2 className="text-3xl font-semibold tracking-tight">{title}</h2>
          <p className="mt-3 text-muted-foreground">{description}</p>
          <ul className="mx-auto mt-8 max-w-md space-y-2 text-left">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 text-sm">
                <span className="mt-0.5 size-2 shrink-0 rounded-full bg-primary" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
