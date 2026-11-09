import type {
  Audit,
  Incident,
  Job,
  Runbook,
  Service,
  User,
} from "@pulseops/contracts";
import { hashSync } from "bcryptjs";
const now = new Date();
const iso = (minutes: number) =>
  new Date(now.getTime() - minutes * 60_000).toISOString();
const demoPasswordHash = hashSync("Demo123!", 12);
export const users: (User & { passwordHash: string })[] = [
  {
    id: "usr-admin",
    name: "Demo Admin",
    email: "admin@pulseops.local",
    role: "admin",
    passwordHash: demoPasswordHash,
  },
  {
    id: "usr-operator",
    name: "Demo Operator",
    email: "operator@pulseops.local",
    role: "operator",
    passwordHash: demoPasswordHash,
  },
  {
    id: "usr-viewer",
    name: "Demo Viewer",
    email: "viewer@pulseops.local",
    role: "viewer",
    passwordHash: demoPasswordHash,
  },
];
export const services: Service[] = [
  {
    id: "svc-orders",
    name: "OrderFlow API",
    slug: "orderflow-api",
    status: "degraded",
    availability: 98.72,
    latencyMs: 1840,
    errorRate: 8.7,
    updatedAt: iso(1),
  },
  {
    id: "svc-finance",
    name: "LedgerSync Worker",
    slug: "ledgersync-worker",
    status: "down",
    availability: 96.1,
    latencyMs: 2400,
    errorRate: 12.4,
    updatedAt: iso(2),
  },
  {
    id: "svc-logistics",
    name: "RouteBridge Integration",
    slug: "routebridge",
    status: "degraded",
    availability: 99.2,
    latencyMs: 780,
    errorRate: 3.2,
    updatedAt: iso(1),
  },
  {
    id: "svc-erp",
    name: "CoreLedger ERP",
    slug: "coreledger-erp",
    status: "healthy",
    availability: 99.98,
    latencyMs: 142,
    errorRate: 0.2,
    updatedAt: iso(1),
  },
  {
    id: "svc-notify",
    name: "SignalRelay",
    slug: "signalrelay",
    status: "healthy",
    availability: 99.95,
    latencyMs: 98,
    errorRate: 0.1,
    updatedAt: iso(3),
  },
];
const base = (
  id: string,
  title: string,
  description: string,
  severity: Incident["severity"],
  status: Incident["status"],
  serviceId: string,
  minutes: number,
): Incident => {
  const service = services.find((s) => s.id === serviceId)!;
  return {
    id,
    title,
    description,
    severity,
    status,
    serviceId,
    serviceName: service.name,
    assignee: status === "detected" ? null : "Demo Operator",
    slaDueAt: new Date(now.getTime() + 120 * 60_000).toISOString(),
    createdAt: iso(minutes),
    updatedAt: iso(Math.floor(minutes / 3)),
    timeline: [
      {
        id: `evt-${id}-1`,
        type: "incident.detected",
        message: "Anomalia detectada pelo monitor sintético.",
        actor: "system",
        createdAt: iso(minutes),
        metadata: { serviceId },
      },
    ],
  };
};
export const incidents: Incident[] = [
  base(
    "INC-1042",
    "Latência elevada na API de pedidos",
    "A latência p95 ultrapassou o limite por 12 minutos.",
    "high",
    "investigating",
    "svc-orders",
    74,
  ),
  base(
    "INC-1041",
    "Job de conciliação financeira falhando",
    "Cinco execuções consecutivas terminaram com timeout.",
    "critical",
    "awaiting_approval",
    "svc-finance",
    132,
  ),
  base(
    "INC-1039",
    "Integração logística interrompida",
    "Eventos de rastreio não chegam ao hub operacional.",
    "high",
    "detected",
    "svc-logistics",
    205,
  ),
  base(
    "INC-1037",
    "Divergência no processamento de pedidos",
    "Pedidos apresentam totais divergentes após reprocessamento.",
    "medium",
    "monitoring",
    "svc-orders",
    380,
  ),
  base(
    "INC-1028",
    "Fila de notificações acumulada",
    "Backlog processado após ajuste aprovado de concorrência.",
    "low",
    "resolved",
    "svc-notify",
    1440,
  ),
];
incidents[4]!.timeline.push(
  {
    id: "evt-1028-2",
    type: "remediation.approved",
    message: "Aumento temporário de concorrência aprovado.",
    actor: "Demo Operator",
    createdAt: iso(1380),
    metadata: {},
  },
  {
    id: "evt-1028-3",
    type: "incident.resolved",
    message: "Backlog normalizado e monitorado.",
    actor: "Demo Operator",
    createdAt: iso(1200),
    metadata: {},
  },
);
export const jobs: Job[] = [
  {
    id: "job-9182",
    name: "financial-reconciliation",
    queue: "operations",
    status: "failed",
    attempts: 3,
    durationMs: 30001,
    updatedAt: iso(8),
  },
  {
    id: "job-9181",
    name: "runbook-indexing",
    queue: "knowledge",
    status: "completed",
    attempts: 1,
    durationMs: 842,
    updatedAt: iso(22),
  },
  {
    id: "job-9180",
    name: "incident-analysis",
    queue: "ai",
    status: "running",
    attempts: 1,
    durationMs: null,
    updatedAt: iso(1),
  },
  {
    id: "job-9179",
    name: "temporary-data-cleanup",
    queue: "maintenance",
    status: "delayed",
    attempts: 0,
    durationMs: null,
    updatedAt: iso(40),
  },
];
export const runbooks: Runbook[] = [
  "Falha em integração financeira",
  "Diagnóstico de alta latência",
  "Job agendado não executado",
  "Erros de autenticação",
  "Indisponibilidade do PostgreSQL",
  "Problemas com Redis",
  "Atrasos logísticos",
  "Divergências em pedidos",
  "Recuperação segura de serviços",
].map((title, index) => ({
  id: `RB-${String(index + 1).padStart(3, "0")}`,
  title,
  category: index < 3 ? "operations" : "recovery",
  service:
    index === 0
      ? "LedgerSync Worker"
      : index === 1
        ? "OrderFlow API"
        : "Shared Platform",
  version: index % 2 ? "2.1" : "1.4",
  excerpt:
    "Procedimento sintético validado para diagnóstico, simulação e recuperação com aprovação humana.",
  updatedAt: iso(1000 + index * 20),
}));
export const audits: Audit[] = [
  {
    id: "aud-1",
    action: "session.login",
    resource: "session",
    actor: "Demo Operator",
    correlationId: "corr-demo-001",
    createdAt: iso(55),
  },
  {
    id: "aud-2",
    action: "incident.investigation_started",
    resource: "INC-1042",
    actor: "Demo Operator",
    correlationId: "corr-demo-002",
    createdAt: iso(44),
  },
  {
    id: "aud-3",
    action: "remediation.proposed",
    resource: "INC-1041",
    actor: "Demo Operator",
    correlationId: "corr-demo-003",
    createdAt: iso(30),
  },
];
export const metrics = [
  { time: iso(60), latency: 420, errors: 1.2 },
  { time: iso(50), latency: 510, errors: 1.4 },
  { time: iso(40), latency: 780, errors: 2.6 },
  { time: iso(30), latency: 1120, errors: 4.1 },
  { time: iso(20), latency: 1640, errors: 7.2 },
  { time: iso(10), latency: 1840, errors: 8.7 },
  { time: iso(0), latency: 1710, errors: 7.9 },
];
