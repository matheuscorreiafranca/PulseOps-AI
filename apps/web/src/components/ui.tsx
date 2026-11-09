import type { ReactNode } from "react";

const statusTone: Record<string, string> = {
  healthy: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  degraded: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  down: "border-rose-500/30 bg-rose-500/10 text-rose-300",
  critical: "border-rose-500/30 bg-rose-500/10 text-rose-300",
  high: "border-orange-500/30 bg-orange-500/10 text-orange-300",
  medium: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  low: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  resolved: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  closed: "border-slate-500/30 bg-slate-500/10 text-slate-300",
  failed: "border-rose-500/30 bg-rose-500/10 text-rose-300",
  running: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  completed: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  delayed: "border-amber-500/30 bg-amber-500/10 text-amber-300",
};

export function Badge({ value }: { value: string }) {
  return (
    <span
      className={`badge ${statusTone[value] ?? "border-line bg-white/5 text-slate-300"}`}
    >
      {value.replaceAll("_", " ")}
    </span>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-7">
      <p className="label">{eyebrow}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
        {description}
      </p>
    </div>
  );
}

export function QueryState({
  loading,
  error,
  empty,
  children,
}: {
  loading: boolean;
  error: Error | null;
  empty?: boolean;
  children: ReactNode;
}) {
  if (loading)
    return (
      <div className="card animate-pulse p-8 text-muted">
        Carregando dados operacionais…
      </div>
    );
  if (error)
    return (
      <div role="alert" className="card border-rose-500/30 p-8 text-rose-300">
        Falha ao carregar: {error.message}
      </div>
    );
  if (empty)
    return (
      <div className="card p-8 text-center text-muted">
        Nenhum resultado encontrado para os filtros atuais.
      </div>
    );
  return <>{children}</>;
}
