import {
  toolInputs,
  type ToolExecution,
  type ToolExecutor,
  type ToolName,
} from "@pulseops/ai";
import {
  audits,
  incidents,
  jobs,
  metrics,
  runbooks,
  services,
} from "../state.js";

const syntheticLogs = [
  {
    id: "log-01",
    serviceId: "svc-orders",
    level: "error",
    message: "request timeout while waiting for connection pool",
    timestamp: new Date(Date.now() - 4 * 60_000).toISOString(),
    correlationId: "corr-orders-91",
  },
  {
    id: "log-02",
    serviceId: "svc-orders",
    level: "warn",
    message: "connection pool exhausted; active=40 idle=0 waiting=18",
    timestamp: new Date(Date.now() - 6 * 60_000).toISOString(),
    correlationId: "corr-orders-87",
  },
  {
    id: "log-03",
    serviceId: "svc-finance",
    level: "error",
    message: "reconciliation job exceeded 30000ms timeout",
    timestamp: new Date(Date.now() - 8 * 60_000).toISOString(),
    correlationId: "corr-finance-44",
  },
];

const tokenize = (value: string) =>
  new Set(
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 2),
  );
const similarity = (left: string, right: string) => {
  const a = tokenize(left);
  const b = tokenize(right);
  const intersection = [...a].filter((token) => b.has(token)).length;
  return a.size + b.size === 0 ? 0 : (2 * intersection) / (a.size + b.size);
};
const within = async <T>(
  operation: Promise<T>,
  timeoutMs: number,
  signal?: AbortSignal,
) => {
  signal?.throwIfAborted();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error("Tool execution timed out")),
      timeoutMs,
    );
  });
  try {
    return await Promise.race([operation, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

export class OperationalToolExecutor implements ToolExecutor {
  async execute(
    name: ToolName,
    rawInput: unknown,
    context: { actor: string; correlationId: string; signal?: AbortSignal },
  ): Promise<ToolExecution> {
    const startedAt = performance.now();
    const execution = await within(
      this.run(name, rawInput),
      2_000,
      context.signal,
    );
    audits.unshift({
      id: crypto.randomUUID(),
      action: `ai.tool.${name}`,
      resource: "tool-execution",
      actor: context.actor,
      correlationId: context.correlationId,
      createdAt: new Date().toISOString(),
    });
    return {
      ...execution,
      summary: `${execution.summary} (${Math.max(1, Math.round(performance.now() - startedAt))} ms)`,
    };
  }

  private async run(name: ToolName, rawInput: unknown): Promise<ToolExecution> {
    switch (name) {
      case "get_service_health": {
        const input = toolInputs[name].parse(rawInput);
        const service = services.find((item) => item.id === input.serviceId);
        if (!service) throw new Error("Registered service not found");
        return {
          result: service,
          summary: `${service.name}: ${service.status}, p95 ${service.latencyMs} ms, erros ${service.errorRate}%.`,
        };
      }
      case "query_recent_metrics": {
        const input = toolInputs[name].parse(rawInput);
        const service = services.find((item) => item.id === input.serviceId);
        const result = metrics.slice(
          -Math.min(metrics.length, Math.ceil(input.windowMinutes / 10) + 1),
        );
        return {
          result,
          summary: `${result.length} pontos; p95 atual ${service?.latencyMs ?? "n/d"} ms e erros ${service?.errorRate ?? "n/d"}%.`,
        };
      }
      case "search_logs": {
        const input = toolInputs[name].parse(rawInput);
        const terms = tokenize(input.query);
        const result = syntheticLogs
          .filter(
            (log) =>
              log.serviceId === input.serviceId &&
              ([...terms].some((term) =>
                log.message.toLowerCase().includes(term),
              ) ||
                terms.size === 0),
          )
          .slice(0, input.limit);
        return {
          result,
          summary: `${result.length} logs sanitizados encontrados; nenhuma credencial ou payload sensível foi retornado.`,
        };
      }
      case "get_failed_jobs": {
        const input = toolInputs[name].parse(rawInput);
        const result = jobs
          .filter(
            (job) =>
              job.status === "failed" &&
              (!input.queue || job.queue === input.queue),
          )
          .slice(0, input.limit);
        return {
          result,
          summary: `${result.length} job(s) com falha encontrado(s).`,
        };
      }
      case "get_integration_events": {
        const input = toolInputs[name].parse(rawInput);
        const result = syntheticLogs
          .filter((log) => log.serviceId === input.serviceId)
          .slice(0, input.limit);
        return {
          result,
          summary: `${result.length} evento(s) de integração correlacionado(s).`,
        };
      }
      case "search_runbooks": {
        const input = toolInputs[name].parse(rawInput);
        const ranked = runbooks
          .map((runbook) => ({
            runbook,
            score: similarity(
              input.query,
              `${runbook.title} ${runbook.category} ${runbook.service} ${runbook.excerpt}`,
            ),
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, input.limit);
        const sources = ranked
          .filter(({ score }) => score >= 0.08)
          .map(({ runbook, score }) => ({
            id: `${runbook.id}#chunk-1`,
            document: runbook.title,
            excerpt: runbook.excerpt,
            version: runbook.version,
            similarity: Number(Math.min(0.98, 0.55 + score).toFixed(2)),
          }));
        return {
          result: sources,
          sources,
          summary: sources.length
            ? `${sources.length} fonte(s) acima do limiar semântico.`
            : "Nenhuma fonte atingiu o limiar mínimo; evidência insuficiente.",
        };
      }
      case "find_similar_incidents": {
        const input = toolInputs[name].parse(rawInput);
        const source = incidents.find(
          (incident) => incident.id === input.incidentId,
        );
        if (!source) throw new Error("Incident not found");
        const result = incidents
          .filter((incident) => incident.id !== source.id)
          .map((incident) => ({
            incident,
            score: similarity(
              `${source.title} ${source.serviceName}`,
              `${incident.title} ${incident.serviceName}`,
            ),
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, input.limit);
        return {
          result,
          summary: `${result.length} incidente(s) comparável(is) encontrado(s).`,
        };
      }
      case "get_incident_timeline": {
        const input = toolInputs[name].parse(rawInput);
        const incident = incidents.find((item) => item.id === input.incidentId);
        if (!incident) throw new Error("Incident not found");
        return {
          result: incident.timeline,
          summary: `${incident.timeline.length} evento(s) auditáveis na timeline.`,
        };
      }
      case "propose_remediation": {
        const input = toolInputs[name].parse(rawInput);
        const result = {
          id: crypto.randomUUID(),
          incidentId: input.incidentId,
          action: input.action,
          status: "awaiting_approval",
          executable: false,
          requiresHumanApproval: true,
        };
        return {
          result,
          summary:
            "Proposta criada sem execução; aprovação humana obrigatória.",
        };
      }
      case "simulate_remediation": {
        const input = toolInputs[name].parse(rawInput);
        const result = {
          incidentId: input.incidentId,
          actionId: input.actionId,
          simulated: true,
          projectedImpact:
            "Redução estimada de latência; nenhuma alteração aplicada.",
          rollbackRequired: false,
        };
        return {
          result,
          summary: "Simulação concluída; zero mutações operacionais.",
        };
      }
    }
  }
}
