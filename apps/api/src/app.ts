import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import {
  createIncidentSchema,
  investigateSchema,
  loginSchema,
  updateIncidentSchema,
} from "@pulseops/contracts";
import { DemoLLMProvider, OpenAILLMProvider, toolInputs } from "@pulseops/ai";
import { envSchema } from "@pulseops/config";
import {
  audits,
  incidents,
  jobs,
  metrics,
  runbooks,
  services,
  users,
} from "./state.js";
import { requireAuth, requireRole, signSession } from "./auth.js";
const env = envSchema.parse(process.env);
const provider =
  env.LLM_PROVIDER === "openai" && env.OPENAI_API_KEY
    ? new OpenAILLMProvider(env.OPENAI_API_KEY, env.OPENAI_MODEL)
    : new DemoLLMProvider();
const event = (
  action: string,
  resource: string,
  actor: string,
  correlationId: string,
) =>
  audits.unshift({
    id: crypto.randomUUID(),
    action,
    resource,
    actor,
    correlationId,
    createdAt: new Date().toISOString(),
  });
export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === "test" ? "silent" : "info",
      redact: [
        "req.headers.authorization",
        "req.headers.cookie",
        "password",
        "OPENAI_API_KEY",
      ],
    },
    genReqId: (req) =>
      (req.headers["x-request-id"] as string | undefined) ??
      crypto.randomUUID(),
    bodyLimit: 1_048_576,
  });
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, { origin: env.WEB_ORIGIN, credentials: true });
  await app.register(cookie);
  await app.register(jwt, {
    secret: env.SESSION_SECRET,
    cookie: { cookieName: "pulseops_session", signed: false },
  });
  await app.register(rateLimit, { max: 120, timeWindow: "1 minute" });
  await app.register(swagger, {
    openapi: {
      info: {
        title: "PulseOps AI API",
        version: "1.0.0",
        description: "Synthetic operational intelligence API",
      },
      servers: [{ url: "http://localhost:3333" }],
    },
  });
  await app.register(swaggerUi, { routePrefix: "/docs" });
  app.addHook("onRequest", async (req, reply) => {
    const correlation =
      (req.headers["x-correlation-id"] as string | undefined) ?? req.id;
    reply.header("x-correlation-id", correlation);
  });
  app.setErrorHandler((error, req, reply) => {
    req.log.error({ err: error }, "request failed");
    const normalized = error as Error & { statusCode?: number };
    const status = normalized.statusCode ?? 400;
    reply
      .status(status)
      .send({
        error: status === 500 ? "Internal server error" : normalized.message,
        requestId: req.id,
      });
  });
  app.get("/health", async () => ({
    status: "ok",
    mode: provider.mode,
    checks: {
      api: "up",
      postgres: process.env.DATABASE_URL ? "configured" : "demo",
      redis: process.env.REDIS_URL ? "configured" : "demo",
    },
    timestamp: new Date().toISOString(),
  }));
  app.post(
    "/api/v1/auth/login",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const input = loginSchema.parse(req.body);
      const found = users.find(
        (u) => u.email === input.email && u.password === input.password,
      );
      if (!found)
        return reply.status(401).send({ error: "Invalid credentials" });
      const { password: _, ...user } = found;
      void _;
      const token = signSession(app, user);
      reply.setCookie("pulseops_session", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: env.NODE_ENV === "production",
        path: "/",
        maxAge: 28800,
      });
      event("session.login", "session", user.name, req.id);
      return { user, token };
    },
  );
  app.post(
    "/api/v1/auth/logout",
    { preHandler: requireAuth },
    async (_req, reply) => {
      reply.clearCookie("pulseops_session", { path: "/" });
      return { ok: true };
    },
  );
  app.get("/api/v1/auth/me", { preHandler: requireAuth }, async (req) => ({
    user: req.user,
  }));
  app.get("/api/v1/dashboard", { preHandler: requireAuth }, async () => ({
    services,
    metrics,
    summary: {
      openIncidents: incidents.filter(
        (i) => !["resolved", "closed"].includes(i.status),
      ).length,
      criticalIncidents: incidents.filter(
        (i) =>
          i.severity === "critical" &&
          !["resolved", "closed"].includes(i.status),
      ).length,
      failedJobs: jobs.filter((j) => j.status === "failed").length,
      degradedServices: services.filter((s) => s.status !== "healthy").length,
      availability: Number(
        (
          services.reduce((a, s) => a + s.availability, 0) / services.length
        ).toFixed(2),
      ),
    },
    recentIncidents: incidents.slice(0, 4),
  }));
  app.get("/api/v1/services", { preHandler: requireAuth }, async () => ({
    items: services,
  }));
  app.get("/api/v1/incidents", { preHandler: requireAuth }, async (req) => {
    const q = req.query as Record<string, string | undefined>;
    let list = [...incidents];
    if (q.status) list = list.filter((i) => i.status === q.status);
    if (q.severity) list = list.filter((i) => i.severity === q.severity);
    if (q.search) {
      const s = q.search.toLowerCase();
      list = list.filter(
        (i) =>
          i.title.toLowerCase().includes(s) || i.id.toLowerCase().includes(s),
      );
    }
    return { items: list, total: list.length, page: 1, pageSize: 20 };
  });
  app.post(
    "/api/v1/incidents",
    { preHandler: requireRole("operator") },
    async (req, reply) => {
      const input = createIncidentSchema.parse(req.body);
      const service = services.find((s) => s.id === input.serviceId);
      if (!service)
        return reply.status(404).send({ error: "Service not found" });
      const id = `INC-${1100 + incidents.length}`;
      const created = {
        ...input,
        id,
        status: "detected" as const,
        serviceName: service.name,
        assignee: null,
        slaDueAt: new Date(Date.now() + 7200000).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        timeline: [],
      };
      incidents.unshift(created);
      event("incident.created", id, req.user.name, req.id);
      return reply.status(201).send(created);
    },
  );
  app.get(
    "/api/v1/incidents/:id",
    { preHandler: requireAuth },
    async (req, reply) => {
      const found = incidents.find(
        (i) => i.id === (req.params as { id: string }).id,
      );
      return found ?? reply.status(404).send({ error: "Incident not found" });
    },
  );
  app.patch(
    "/api/v1/incidents/:id",
    { preHandler: requireRole("operator") },
    async (req, reply) => {
      const found = incidents.find(
        (i) => i.id === (req.params as { id: string }).id,
      );
      if (!found)
        return reply.status(404).send({ error: "Incident not found" });
      const input = updateIncidentSchema.parse(req.body);
      if (input.status) found.status = input.status;
      if (input.assignee !== undefined) found.assignee = input.assignee;
      found.updatedAt = new Date().toISOString();
      found.timeline.push({
        id: crypto.randomUUID(),
        type: input.status ? "status.changed" : "comment.added",
        message: input.comment ?? `Status alterado para ${input.status}`,
        actor: req.user.name,
        createdAt: found.updatedAt,
        metadata: {},
      });
      event("incident.updated", found.id, req.user.name, req.id);
      return found;
    },
  );
  app.post(
    "/api/v1/incidents/:id/remediations/:action",
    { preHandler: requireRole("operator") },
    async (req, reply) => {
      const { id, action } = req.params as { id: string; action: string };
      if (!["approve", "reject"].includes(action))
        return reply.status(400).send({ error: "Invalid decision" });
      const found = incidents.find((i) => i.id === id);
      if (!found)
        return reply.status(404).send({ error: "Incident not found" });
      found.status = action === "approve" ? "mitigating" : "investigating";
      found.timeline.push({
        id: crypto.randomUUID(),
        type: `remediation.${action}d`,
        message: `Remediação ${action === "approve" ? "aprovada" : "rejeitada"} por decisão humana.`,
        actor: req.user.name,
        createdAt: new Date().toISOString(),
        metadata: {},
      });
      event(`remediation.${action}d`, id, req.user.name, req.id);
      return { ok: true, status: found.status };
    },
  );
  app.post(
    "/api/v1/incidents/:id/investigate",
    {
      preHandler: requireRole("operator"),
      config: { rateLimit: { max: 20, timeWindow: "1 hour" } },
    },
    async (req, reply) => {
      const incident = incidents.find(
        (i) => i.id === (req.params as { id: string }).id,
      );
      if (!incident)
        return reply.status(404).send({ error: "Incident not found" });
      const input = investigateSchema.parse(req.body);
      event(
        "incident.investigation_started",
        incident.id,
        req.user.name,
        req.id,
      );
      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
        "Access-Control-Allow-Origin": env.WEB_ORIGIN,
        "Access-Control-Allow-Credentials": "true",
      });
      const controller = new AbortController();
      reply.raw.on("close", () => controller.abort());
      try {
        for await (const item of provider.investigate({
          incidentId: incident.id,
          title: incident.title,
          serviceId: incident.serviceId,
          question: input.question,
          signal: controller.signal,
        })) {
          reply.raw.write(
            `id: ${item.id}\nevent: ${item.type}\ndata: ${JSON.stringify(item)}\n\n`,
          );
        }
      } catch (error) {
        if (!controller.signal.aborted)
          reply.raw.write(
            `event: analysis.failed\ndata: ${JSON.stringify({ id: crypto.randomUUID(), type: "analysis.failed", data: { code: "PROVIDER_ERROR", message: error instanceof Error ? error.message : "Analysis failed" } })}\n\n`,
          );
      }
      reply.raw.end();
    },
  );
  app.get("/api/v1/runbooks", { preHandler: requireAuth }, async () => ({
    items: runbooks,
  }));
  app.post(
    "/api/v1/runbooks/reindex",
    { preHandler: requireRole("admin") },
    async (req) => {
      event("runbooks.reindex_requested", "runbooks", req.user.name, req.id);
      return { jobId: crypto.randomUUID(), status: "queued", idempotent: true };
    },
  );
  app.get("/api/v1/jobs", { preHandler: requireAuth }, async () => ({
    items: jobs,
    queues: [
      { name: "operations", waiting: 0, active: 1, failed: 1 },
      { name: "knowledge", waiting: 0, active: 0, failed: 0 },
      { name: "ai", waiting: 1, active: 1, failed: 0 },
    ],
  }));
  app.get("/api/v1/audit", { preHandler: requireRole("admin") }, async () => ({
    items: audits,
  }));
  app.get(
    "/api/v1/ai/observability",
    { preHandler: requireRole("admin") },
    async () => ({
      mode: provider.mode,
      summary: {
        analyses: 24,
        successRate: 95.8,
        averageLatencyMs: 1842,
        toolCalls: 67,
        schemaFailures: 1,
        ragMisses: 2,
        estimatedCostUsd: provider.mode === "demo" ? 0 : 0.21,
      },
      recent: [
        {
          id: "ana-01",
          incidentId: "INC-1042",
          durationMs: 1920,
          tools: 4,
          tokens: 0,
          status: "completed",
          mode: provider.mode,
        },
        {
          id: "ana-02",
          incidentId: "INC-1041",
          durationMs: 2301,
          tools: 5,
          tokens: 0,
          status: "completed",
          mode: provider.mode,
        },
      ],
    }),
  );
  app.get("/api/v1/tools", { preHandler: requireAuth }, async () => ({
    allowlist: Object.keys(toolInputs),
  }));
  return app;
}
