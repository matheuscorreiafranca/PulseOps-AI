import { useState } from "react";
import {
  NavLink,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpen,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronRight,
  FileClock,
  LayoutDashboard,
  LogOut,
  Menu,
  Play,
  Search,
  Server,
  ShieldCheck,
  Sparkles,
  Square,
  TerminalSquare,
  XCircle,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  Analysis,
  Audit,
  Incident,
  Job,
  Runbook,
  Service,
  StreamEvent,
  User,
} from "@pulseops/contracts";
import { api, investigate, session } from "./api";
type Dashboard = {
  services: Service[];
  metrics: { time: string; latency: number; errors: number }[];
  summary: {
    openIncidents: number;
    criticalIncidents: number;
    failedJobs: number;
    degradedServices: number;
    availability: number;
  };
  recentIncidents: Incident[];
};
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
const Badge = ({ value }: { value: string }) => (
  <span
    className={`badge ${statusTone[value] ?? "border-line bg-white/5 text-slate-300"}`}
  >
    {value.replaceAll("_", " ")}
  </span>
);
function Login() {
  const [email, setEmail] = useState("operator@pulseops.local");
  const [password, setPassword] = useState("Demo123!");
  const mutation = useMutation({
    mutationFn: () =>
      api<{ user: User; token: string }>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    onSuccess: (data) => {
      session.set(data.token);
      window.location.assign("/");
    },
  });
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_.9fr]">
      <section className="hidden border-r border-line p-16 lg:flex lg:flex-col lg:justify-between">
        <Logo />
        <div className="max-w-xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
            <Sparkles size={14} /> Operational Intelligence Copilot
          </div>
          <h1 className="text-5xl font-semibold leading-tight">
            Transforme sinais operacionais em decisões seguras.
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted">
            Investigue incidentes com ferramentas controladas, evidências
            citadas e aprovação humana obrigatória.
          </p>
        </div>
        <p className="text-sm text-muted">
          Projeto autoral · Dados 100% sintéticos
        </p>
      </section>
      <section className="flex items-center justify-center p-6">
        <form
          className="card w-full max-w-md p-8"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <p className="label">Acesso seguro</p>
          <h2 className="mt-2 text-2xl font-semibold">Entrar no PulseOps AI</h2>
          <p className="mt-2 text-sm text-muted">
            Use uma das contas fictícias de demonstração.
          </p>
          <label className="mt-7 block text-sm font-medium">
            E-mail
            <input
              className="input mt-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
            />
          </label>
          <label className="mt-4 block text-sm font-medium">
            Senha
            <input
              className="input mt-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
            />
          </label>
          {mutation.error && (
            <p role="alert" className="mt-4 text-sm text-rose-300">
              {mutation.error.message}
            </p>
          )}
          <button
            className="btn-primary mt-6 w-full"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Autenticando…" : "Entrar no ambiente"}
          </button>
          <div className="mt-6 rounded-xl border border-line bg-white/[.03] p-4 text-xs text-muted">
            <strong className="text-slate-200">Demo:</strong>{" "}
            operator@pulseops.local / Demo123!
          </div>
        </form>
      </section>
    </main>
  );
}
function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand text-ink">
        <Activity size={22} />
      </div>
      <div>
        <div className="font-bold tracking-tight">
          PulseOps <span className="text-brand">AI</span>
        </div>
        <div className="text-[10px] uppercase tracking-[.2em] text-muted">
          Control room
        </div>
      </div>
    </div>
  );
}
const nav = [
  ["/", "Overview", LayoutDashboard],
  ["/incidents", "Incidentes", AlertTriangle],
  ["/services", "Serviços", Server],
  ["/runbooks", "Runbooks", BookOpen],
  ["/jobs", "Jobs", BriefcaseBusiness],
  ["/audit", "Auditoria", FileClock],
  ["/observability", "IA Observability", BarChart3],
  ["/settings", "Configurações", ShieldCheck],
] as const;
function Shell() {
  const navigate = useNavigate();
  const [mobile, setMobile] = useState(false);
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api<{ user: User }>("/api/v1/auth/me"),
  });
  if (me.isError) {
    session.clear();
    return <Navigate to="/login" replace />;
  }
  return (
    <div className="min-h-screen">
      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-line bg-ink/90 px-4 backdrop-blur lg:pl-[268px]">
        <button
          aria-label="Abrir menu"
          className="btn-secondary p-2 lg:hidden"
          onClick={() => setMobile(true)}
        >
          <Menu size={18} />
        </button>
        <div className="hidden items-center gap-2 text-sm text-muted sm:flex">
          <span className="h-2 w-2 rounded-full bg-emerald-400" /> Ambiente
          sintético conectado
        </div>
        <div className="flex items-center gap-3">
          <span className="badge border-violet-500/30 bg-violet-500/10 text-violet-300">
            <Sparkles size={12} className="mr-1" /> Demo Mode
          </span>
          <div className="hidden text-right sm:block">
            <div className="text-sm font-semibold">
              {me.data?.user.name ?? "Carregando…"}
            </div>
            <div className="text-xs text-muted">{me.data?.user.role}</div>
          </div>
        </div>
      </header>
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[268px] border-r border-line bg-panel p-5 transition-transform lg:translate-x-0 ${mobile ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between">
          <Logo />
          <button className="lg:hidden" onClick={() => setMobile(false)}>
            <XCircle />
          </button>
        </div>
        <nav className="mt-9 space-y-1">
          {nav.map(([to, label, Icon]) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={() => setMobile(false)}
              className={({ isActive }) =>
                `focus-ring flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${isActive ? "bg-brand/10 text-brand" : "text-muted hover:bg-white/5 hover:text-white"}`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <button
          className="btn-secondary absolute bottom-5 left-5 right-5"
          onClick={async () => {
            await api("/api/v1/auth/logout", { method: "POST" }).catch(
              () => {},
            );
            session.clear();
            navigate("/login");
          }}
        >
          <LogOut size={16} /> Sair
        </button>
      </aside>
      <main className="px-4 pb-10 pt-24 lg:ml-[268px] lg:px-8">
        <Routes>
          <Route index element={<DashboardPage />} />
          <Route path="incidents" element={<IncidentsPage />} />
          <Route path="incidents/:id" element={<IncidentPage />} />
          <Route path="services" element={<ServicesPage />} />
          <Route path="runbooks" element={<RunbooksPage />} />
          <Route path="jobs" element={<JobsPage />} />
          <Route path="audit" element={<AuditPage />} />
          <Route path="observability" element={<ObservabilityPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  );
}
function Header({
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
function QueryState({
  loading,
  error,
  empty,
  children,
}: {
  loading: boolean;
  error: Error | null;
  empty?: boolean;
  children: React.ReactNode;
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
function DashboardPage() {
  const q = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api<Dashboard>("/api/v1/dashboard"),
    refetchInterval: 30_000,
  });
  return (
    <>
      <Header
        eyebrow="Centro de operações"
        title="Visão operacional"
        description="Saúde dos serviços, incidentes e sinais derivados exclusivamente da API."
      />
      <QueryState loading={q.isLoading} error={q.error}>
        {q.data && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {([
                [
                  "Disponibilidade",
                  `${q.data.summary.availability}%`,
                  Activity,
                ],
                [
                  "Incidentes abertos",
                  q.data.summary.openIncidents,
                  AlertTriangle,
                ],
                ["Críticos", q.data.summary.criticalIncidents, XCircle],
                ["Jobs falhos", q.data.summary.failedJobs, TerminalSquare],
                [
                  "Serviços degradados",
                  q.data.summary.degradedServices,
                  Server,
                ],
              ] as const).map(([label, value, Icon]) => (
                <div className="card p-5" key={String(label)}>
                  <div className="flex items-center justify-between text-muted">
                    <span className="label">{label as string}</span>
                    <Icon size={18} />
                  </div>
                  <div className="mt-4 text-3xl font-semibold">
                    {value as string | number}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
              <section className="card p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="label">Últimos 60 minutos</p>
                    <h2 className="mt-1 font-semibold">
                      Latência e tendência de erro
                    </h2>
                  </div>
                  <Badge value="live" />
                </div>
                <div className="mt-5 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={q.data.metrics}>
                      <defs>
                        <linearGradient id="lat" x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="5%"
                            stopColor="#5eead4"
                            stopOpacity={0.4}
                          />
                          <stop
                            offset="95%"
                            stopColor="#5eead4"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#25314a" vertical={false} />
                      <XAxis
                        dataKey="time"
                        tickFormatter={(v) =>
                          new Date(v).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        }
                        stroke="#75839b"
                        fontSize={11}
                      />
                      <YAxis stroke="#75839b" fontSize={11} />
                      <Tooltip
                        contentStyle={{
                          background: "#111a2e",
                          border: "1px solid #25314a",
                          borderRadius: 10,
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="latency"
                        stroke="#5eead4"
                        fill="url(#lat)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </section>
              <section className="card p-5">
                <p className="label">Service health</p>
                <div className="mt-3 divide-y divide-line">
                  {q.data.services.map((service) => (
                    <div
                      className="flex items-center justify-between py-3"
                      key={service.id}
                    >
                      <div>
                        <div className="text-sm font-semibold">
                          {service.name}
                        </div>
                        <div className="mt-1 text-xs text-muted">
                          {service.latencyMs} ms · {service.errorRate}% erros
                        </div>
                      </div>
                      <Badge value={service.status} />
                    </div>
                  ))}
                </div>
              </section>
            </div>
            <section className="card mt-6 p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="label">Prioridade atual</p>
                  <h2 className="mt-1 font-semibold">Incidentes recentes</h2>
                </div>
                <NavLink
                  className="text-sm font-semibold text-brand"
                  to="/incidents"
                >
                  Ver todos
                </NavLink>
              </div>
              <IncidentTable incidents={q.data.recentIncidents} />
            </section>
          </>
        )}
      </QueryState>
    </>
  );
}
function IncidentTable({ incidents }: { incidents: Incident[] }) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Incidente</th>
            <th>Serviço</th>
            <th>Severidade</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {incidents.map((i) => (
            <tr key={i.id}>
              <td className="font-mono text-xs text-muted">{i.id}</td>
              <td>
                <div className="font-medium">{i.title}</div>
                <div className="mt-1 text-xs text-muted">
                  {new Date(i.createdAt).toLocaleString("pt-BR")}
                </div>
              </td>
              <td>{i.serviceName}</td>
              <td>
                <Badge value={i.severity} />
              </td>
              <td>
                <Badge value={i.status} />
              </td>
              <td>
                <NavLink
                  aria-label={`Abrir ${i.id}`}
                  to={`/incidents/${i.id}`}
                  className="text-brand"
                >
                  <ChevronRight size={18} />
                </NavLink>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function IncidentsPage() {
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("");
  const q = useQuery({
    queryKey: ["incidents", search, severity],
    queryFn: () =>
      api<{ items: Incident[]; total: number }>(
        `/api/v1/incidents?search=${encodeURIComponent(search)}&severity=${severity}`,
      ),
  });
  return (
    <>
      <Header
        eyebrow="Incident command"
        title="Incidentes"
        description="Investigue, acompanhe e encerre eventos com trilha completa de auditoria."
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <Search className="absolute left-3 top-3 text-muted" size={17} />
          <input
            aria-label="Buscar incidentes"
            className="input pl-10"
            placeholder="Buscar por ID ou título"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select
          aria-label="Filtrar severidade"
          className="input sm:w-48"
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
        >
          <option value="">Todas severidades</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>
      <QueryState
        loading={q.isLoading}
        error={q.error}
        empty={q.data?.items.length === 0}
      >
        {q.data && <IncidentTable incidents={q.data.items} />}
      </QueryState>
    </>
  );
}
function IncidentPage() {
  const { id = "" } = useParams();
  const client = useQueryClient();
  const q = useQuery({
    queryKey: ["incident", id],
    queryFn: () => api<Incident>(`/api/v1/incidents/${id}`),
  });
  const decision = useMutation({
    mutationFn: (action: "approve" | "reject") =>
      api(`/api/v1/incidents/${id}/remediations/${action}`, { method: "POST" }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["incident", id] }),
  });
  if (q.isLoading)
    return (
      <QueryState loading error={null}>
        {null}
      </QueryState>
    );
  if (q.error || !q.data)
    return (
      <QueryState
        loading={false}
        error={q.error ?? new Error("Incidente não encontrado")}
      >
        {null}
      </QueryState>
    );
  const incident = q.data;
  return (
    <>
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <NavLink to="/incidents" className="text-sm text-brand">
            ← Voltar a incidentes
          </NavLink>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="font-mono text-sm text-muted">{incident.id}</span>
            <Badge value={incident.severity} />
            <Badge value={incident.status} />
          </div>
          <h1 className="mt-3 text-3xl font-semibold">{incident.title}</h1>
          <p className="mt-2 max-w-3xl text-muted">{incident.description}</p>
        </div>
        <div className="card min-w-56 p-4">
          <div className="label">Responsável</div>
          <div className="mt-2 text-sm font-semibold">
            {incident.assignee ?? "Não atribuído"}
          </div>
          <div className="mt-3 label">SLA</div>
          <div className="mt-2 text-sm">
            {new Date(incident.slaDueAt).toLocaleString("pt-BR")}
          </div>
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-[.9fr_1.5fr]">
        <section className="space-y-6">
          <div className="card p-5">
            <p className="label">Linha do tempo</p>
            <div className="mt-4 space-y-5">
              {incident.timeline.map((event) => (
                <div
                  className="relative border-l border-line pl-5"
                  key={event.id}
                >
                  <span className="absolute -left-1.5 top-1 h-3 w-3 rounded-full border-2 border-panel bg-brand" />
                  <div className="text-sm font-medium">{event.message}</div>
                  <div className="mt-1 text-xs text-muted">
                    {event.actor} ·{" "}
                    {new Date(event.createdAt).toLocaleString("pt-BR")}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="card p-5">
            <div className="flex items-start gap-3">
              <ShieldCheck className="text-brand" />
              <div>
                <h2 className="font-semibold">Human-in-the-loop</h2>
                <p className="mt-1 text-sm text-muted">
                  A IA propõe; somente um operador pode autorizar uma remediação
                  simulada.
                </p>
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button
                className="btn-primary"
                disabled={decision.isPending}
                onClick={() => decision.mutate("approve")}
              >
                <CheckCircle2 size={16} /> Aprovar
              </button>
              <button
                className="btn-secondary"
                disabled={decision.isPending}
                onClick={() => decision.mutate("reject")}
              >
                <XCircle size={16} /> Rejeitar
              </button>
            </div>
          </div>
        </section>
        <Copilot incident={incident} />
      </div>
    </>
  );
}
function Copilot({ incident }: { incident: Incident }) {
  const [question, setQuestion] = useState(
    "Investigue a causa provável, consulte as evidências e recomende os próximos passos seguros.",
  );
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [controller, setController] = useState<AbortController | null>(null);
  const analysis = [...events]
    .reverse()
    .find((event: StreamEvent) => event.type === "analysis.completed")?.data as
    | Analysis
    | undefined;
  const text = events
    .filter((e) => e.type === "analysis.delta")
    .map((e) => (e.type === "analysis.delta" ? e.data.delta : ""))
    .join("");
  const tools = events.filter(
    (e) => e.type === "tool.started" || e.type === "tool.completed",
  );
  const sources = events.filter((e) => e.type === "source.retrieved");
  async function start() {
    const abort = new AbortController();
    setController(abort);
    setEvents([]);
    setError("");
    setRunning(true);
    try {
      await investigate(
        incident.id,
        question,
        (event) =>
          setEvents((current) =>
            current.some((e) => e.id === event.id)
              ? current
              : [...current, event],
          ),
        abort.signal,
      );
    } catch (e) {
      if (!abort.signal.aborted)
        setError(e instanceof Error ? e.message : "Falha na análise");
    } finally {
      setRunning(false);
      setController(null);
    }
  }
  return (
    <section className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-line bg-white/[.03] p-5">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-violet-500/15 text-violet-300">
            <Sparkles size={18} />
          </div>
          <div>
            <h2 className="font-semibold">Copiloto de investigação</h2>
            <p className="text-xs text-muted">
              Demo AI · ferramentas controladas
            </p>
          </div>
        </div>
        {running && (
          <span className="flex items-center gap-2 text-xs text-brand">
            <span className="h-2 w-2 animate-pulse rounded-full bg-brand" />{" "}
            Analisando
          </span>
        )}
      </div>
      <div className="p-5">
        <textarea
          aria-label="Pergunta para o copiloto"
          className="input min-h-24 resize-y"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <div className="mt-3 flex gap-3">
          <button
            className="btn-primary"
            disabled={running || question.length < 3}
            onClick={start}
          >
            <Play size={16} /> Investigar com IA
          </button>
          {running && (
            <button
              className="btn-secondary"
              onClick={() => controller?.abort()}
            >
              <Square size={14} /> Cancelar
            </button>
          )}
        </div>
        {error && (
          <p role="alert" className="mt-4 text-sm text-rose-300">
            {error}
          </p>
        )}
        {events.length > 0 && (
          <div className="mt-6 space-y-5">
            <div className="rounded-xl border border-line bg-ink/50 p-4">
              <p className="label">Análise progressiva</p>
              <p className="mt-3 text-sm leading-7 text-slate-200">
                {text || "Coletando evidências…"}
                {running && (
                  <span className="ml-1 inline-block h-4 w-1 animate-pulse bg-brand" />
                )}
              </p>
            </div>
            {tools.length > 0 && (
              <div>
                <p className="label">Ferramentas chamadas</p>
                <div className="mt-3 space-y-2">
                  {tools.map((event, index) => (
                    <div
                      key={`${event.id}-${index}`}
                      className="flex items-start gap-3 rounded-lg border border-line p-3"
                    >
                      <TerminalSquare size={16} className="mt-0.5 text-brand" />
                      <div className="min-w-0">
                        <div className="font-mono text-xs font-semibold">
                          {event.data.name}
                        </div>
                        <div className="mt-1 break-words text-xs text-muted">
                          {event.type === "tool.started"
                            ? JSON.stringify(event.data.arguments)
                            : event.data.summary}
                        </div>
                      </div>
                      <Badge
                        value={
                          event.type === "tool.started"
                            ? "running"
                            : "completed"
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {sources.length > 0 && (
              <div>
                <p className="label">Fontes recuperadas</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {sources.map(
                    (event) =>
                      event.type === "source.retrieved" && (
                        <article
                          className="rounded-lg border border-line p-3"
                          key={event.id}
                        >
                          <div className="text-sm font-semibold">
                            {event.data.document}
                          </div>
                          <p className="mt-2 text-xs leading-5 text-muted">
                            {event.data.excerpt}
                          </p>
                          <div className="mt-2 text-[11px] text-brand">
                            {event.data.id} · v{event.data.version} ·{" "}
                            {(event.data.similarity * 100).toFixed(0)}%
                          </div>
                        </article>
                      ),
                  )}
                </div>
              </div>
            )}
            {analysis && (
              <div className="rounded-xl border border-brand/30 bg-brand/[.06] p-4">
                <div className="flex justify-between">
                  <p className="label text-brand">Conclusão estruturada</p>
                  <span className="text-sm font-semibold text-brand">
                    {Math.round(analysis.confidence * 100)}% confiança
                  </span>
                </div>
                <h3 className="mt-4 font-semibold">Causas prováveis</h3>
                {analysis.probableCauses.map((c) => (
                  <p
                    className="mt-2 text-sm text-slate-300"
                    key={c.description}
                  >
                    • {c.description}
                  </p>
                ))}
                <h3 className="mt-4 font-semibold">Ações recomendadas</h3>
                {analysis.recommendedActions.map((a) => (
                  <div
                    className="mt-2 rounded-lg border border-line bg-ink/30 p-3"
                    key={a.id}
                  >
                    <div className="text-sm font-medium">{a.title}</div>
                    <div className="mt-1 text-xs text-muted">
                      {a.description}
                    </div>
                  </div>
                ))}
                <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-amber-300">
                  <ShieldCheck size={15} /> Aprovação humana obrigatória antes
                  de qualquer ação.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
function ServicesPage() {
  const q = useQuery({
    queryKey: ["services"],
    queryFn: () => api<{ items: Service[] }>("/api/v1/services"),
  });
  return (
    <>
      <Header
        eyebrow="Catálogo operacional"
        title="Serviços"
        description="Sinais sintéticos atualizados pela API para cada componente monitorado."
      />
      <QueryState loading={q.isLoading} error={q.error}>
        {q.data && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {q.data.items.map((s) => (
              <div className="card p-5" key={s.id}>
                <div className="flex justify-between">
                  <Server className="text-brand" />
                  <Badge value={s.status} />
                </div>
                <h2 className="mt-5 font-semibold">{s.name}</h2>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <Metric label="Uptime" value={`${s.availability}%`} />
                  <Metric label="P95" value={`${s.latencyMs}ms`} />
                  <Metric label="Erros" value={`${s.errorRate}%`} />
                </div>
              </div>
            ))}
          </div>
        )}
      </QueryState>
    </>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/[.03] p-2">
      <div className="text-sm font-semibold">{value}</div>
      <div className="mt-1 text-[10px] uppercase text-muted">{label}</div>
    </div>
  );
}
function RunbooksPage() {
  const q = useQuery({
    queryKey: ["runbooks"],
    queryFn: () => api<{ items: Runbook[] }>("/api/v1/runbooks"),
  });
  return (
    <>
      <Header
        eyebrow="Knowledge base · RAG"
        title="Runbooks"
        description="Documentos Markdown fragmentados, versionados e indexados semanticamente com pgvector."
      />
      <QueryState loading={q.isLoading} error={q.error}>
        {q.data && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {q.data.items.map((r) => (
              <article className="card p-5" key={r.id}>
                <div className="flex justify-between">
                  <BookOpen className="text-brand" />
                  <span className="font-mono text-xs text-muted">{r.id}</span>
                </div>
                <h2 className="mt-5 font-semibold">{r.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted">{r.excerpt}</p>
                <div className="mt-4 flex justify-between text-xs">
                  <span>{r.service}</span>
                  <span className="text-brand">v{r.version}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </QueryState>
    </>
  );
}
function JobsPage() {
  const q = useQuery({
    queryKey: ["jobs"],
    queryFn: () =>
      api<{
        items: Job[];
        queues: {
          name: string;
          waiting: number;
          active: number;
          failed: number;
        }[];
      }>("/api/v1/jobs"),
  });
  return (
    <>
      <Header
        eyebrow="BullMQ control plane"
        title="Jobs e filas"
        description="Tentativas, backoff e estado das filas de análise, ingestão e manutenção."
      />
      <QueryState loading={q.isLoading} error={q.error}>
        {q.data && (
          <>
            <div className="mb-6 grid gap-4 sm:grid-cols-3">
              {q.data.queues.map((queue) => (
                <div className="card p-5" key={queue.name}>
                  <p className="label">{queue.name}</p>
                  <div className="mt-4 flex gap-5 text-sm">
                    <span>
                      <b>{queue.active}</b> ativos
                    </span>
                    <span>
                      <b>{queue.waiting}</b> espera
                    </span>
                    <span className="text-rose-300">
                      <b>{queue.failed}</b> falhos
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Job</th>
                    <th>Fila</th>
                    <th>Status</th>
                    <th>Tentativas</th>
                    <th>Duração</th>
                    <th>Atualizado</th>
                  </tr>
                </thead>
                <tbody>
                  {q.data.items.map((j) => (
                    <tr key={j.id}>
                      <td>
                        <div className="font-medium">{j.name}</div>
                        <div className="font-mono text-xs text-muted">
                          {j.id}
                        </div>
                      </td>
                      <td>{j.queue}</td>
                      <td>
                        <Badge value={j.status} />
                      </td>
                      <td>{j.attempts}</td>
                      <td>{j.durationMs ? `${j.durationMs} ms` : "—"}</td>
                      <td>{new Date(j.updatedAt).toLocaleString("pt-BR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </QueryState>
    </>
  );
}
function AuditPage() {
  const q = useQuery({
    queryKey: ["audit"],
    queryFn: () => api<{ items: Audit[] }>("/api/v1/audit"),
  });
  return (
    <>
      <Header
        eyebrow="Compliance"
        title="Trilha de auditoria"
        description="Ações relevantes vinculadas a ator, recurso e correlation ID."
      />
      <QueryState loading={q.isLoading} error={q.error}>
        {q.data && (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ação</th>
                  <th>Recurso</th>
                  <th>Ator</th>
                  <th>Correlation ID</th>
                  <th>Horário</th>
                </tr>
              </thead>
              <tbody>
                {q.data.items.map((a) => (
                  <tr key={a.id}>
                    <td className="font-mono text-xs text-brand">{a.action}</td>
                    <td>{a.resource}</td>
                    <td>{a.actor}</td>
                    <td className="font-mono text-xs text-muted">
                      {a.correlationId}
                    </td>
                    <td>{new Date(a.createdAt).toLocaleString("pt-BR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </QueryState>
    </>
  );
}
type Obs = {
  mode: string;
  summary: {
    analyses: number;
    successRate: number;
    averageLatencyMs: number;
    toolCalls: number;
    schemaFailures: number;
    ragMisses: number;
    estimatedCostUsd: number;
  };
  recent: {
    id: string;
    incidentId: string;
    durationMs: number;
    tools: number;
    tokens: number;
    status: string;
    mode: string;
  }[];
};
function ObservabilityPage() {
  const q = useQuery({
    queryKey: ["observability"],
    queryFn: () => api<Obs>("/api/v1/ai/observability"),
  });
  return (
    <>
      <Header
        eyebrow="AI control plane"
        title="Observabilidade da IA"
        description="Métricas agregadas sem prompts, segredos ou raciocínio interno."
      />
      <QueryState loading={q.isLoading} error={q.error}>
        {q.data && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Stat label="Análises" value={q.data.summary.analyses} />
              <Stat
                label="Latência média"
                value={`${q.data.summary.averageLatencyMs} ms`}
              />
              <Stat label="Tool calls" value={q.data.summary.toolCalls} />
              <Stat
                label="Custo estimado"
                value={`US$ ${q.data.summary.estimatedCostUsd.toFixed(2)}`}
              />
            </div>
            <div className="card mt-6 p-5">
              <p className="label">Guardrails</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <Metric
                  label="Schema failures"
                  value={String(q.data.summary.schemaFailures)}
                />
                <Metric
                  label="RAG misses"
                  value={String(q.data.summary.ragMisses)}
                />
                <Metric label="Provider" value={q.data.mode} />
              </div>
            </div>
          </>
        )}
      </QueryState>
    </>
  );
}
function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-5">
      <p className="label">{label}</p>
      <div className="mt-4 text-3xl font-semibold">{value}</div>
    </div>
  );
}
function SettingsPage() {
  const tools = useQuery({
    queryKey: ["tools"],
    queryFn: () => api<{ allowlist: string[] }>("/api/v1/tools"),
  });
  return (
    <>
      <Header
        eyebrow="Governança"
        title="Configurações"
        description="Visão somente leitura da política operacional do ambiente de demonstração."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <p className="label">Modo de IA</p>
          <div className="mt-4 flex items-center gap-3">
            <Sparkles className="text-violet-300" />
            <div>
              <div className="font-semibold">Demo Mode determinístico</div>
              <div className="text-sm text-muted">
                Nenhuma API paga é usada.
              </div>
            </div>
          </div>
        </section>
        <section className="card p-5">
          <p className="label">Política de remediação</p>
          <div className="mt-4 flex items-center gap-3">
            <ShieldCheck className="text-brand" />
            <div>
              <div className="font-semibold">Aprovação humana obrigatória</div>
              <div className="text-sm text-muted">
                Execução arbitrária permanentemente bloqueada.
              </div>
            </div>
          </div>
        </section>
        <section className="card p-5 lg:col-span-2">
          <p className="label">Tool allowlist</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {tools.data?.allowlist.map((tool) => (
              <span
                className="rounded-md border border-line bg-ink/50 px-2.5 py-1.5 font-mono text-xs text-brand"
                key={tool}
              >
                {tool}
              </span>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={session.token ? <Shell /> : <Navigate to="/login" replace />}
      />
    </Routes>
  );
}
