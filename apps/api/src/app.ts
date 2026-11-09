import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { investigateSchema, loginSchema } from "@pulseops/contracts";
import { createProvider, toolInputs } from "@pulseops/ai";
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
import { IncidentService } from "./application/incident-service.js";
import { InMemoryIncidentRepository } from "./infrastructure/in-memory-incident-repository.js";
import { PostgresIncidentRepository } from "./infrastructure/postgres-incident-repository.js";
import type { IncidentRepository } from "./application/incident-repository.js";
import { OperationalToolExecutor } from "./application/tool-executor.js";
import { decideRemediation } from "./domain/incidents.js";
import { compare } from "bcryptjs";
const env = envSchema.parse(process.env);
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
  const provider = createProvider(env);
  const incidentRepository: IncidentRepository =
    env.DATA_BACKEND === "postgres"
      ? new PostgresIncidentRepository(env.DATABASE_URL)
      : new InMemoryIncidentRepository();
  const incidentService = new IncidentService(incidentRepository);
  const toolExecutor = new OperationalToolExecutor();
  const analysisTelemetry: Array<{
    id: string;
    incidentId: string;
    durationMs: number;
    tools: number;
    status: "completed" | "failed";
    mode: "demo" | "real";
    createdAt: string;
  }> = [];
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
        description:
          "Operational intelligence API with controlled AI tools, typed SSE and human-approved remediation. All bundled data is synthetic.",
      },
      tags: [
        {
          name: "system",
          description: "Runtime readiness and dependency state",
        },
        { name: "auth", description: "Authentication and current session" },
        {
          name: "incidents",
          description: "Incident lifecycle and investigation",
        },
        { name: "operations", description: "Services, jobs and runbooks" },
        { name: "governance", description: "Audit and AI observability" },
      ],
      components: {
        securitySchemes: {
          bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
        },
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
    reply.status(status).send({
      error: status === 500 ? "Internal server error" : normalized.message,
      requestId: req.id,
    });
  });
  app.get(
    "/health",
    {
      schema: {
        tags: ["system"],
        summary: "Read API and dependency readiness",
      },
    },
    async (_request, reply) => {
      let postgres = env.DATA_BACKEND === "postgres" ? "up" : "not-connected";
      if (incidentRepository instanceof PostgresIncidentRepository) {
        try {
          await incidentRepository.ping();
        } catch {
          postgres = "down";
          reply.status(503);
        }
      }
      return {
        status: postgres === "down" ? "degraded" : "ok",
        mode: provider.mode,
        dataMode: env.DATA_BACKEND,
        checks: {
          api: "up",
          postgres,
          redis:
            process.env.ENABLE_WORKERS === "true"
              ? "worker-enabled"
              : "worker-disabled",
        },
        timestamp: new Date().toISOString(),
      };
    },
  );
  app.addHook("onClose", async () => {
    if (incidentRepository instanceof PostgresIncidentRepository)
      await incidentRepository.close();
  });
  app.post(
    "/api/v1/auth/login",
    {
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
      schema: {
        tags: ["auth"],
        summary: "Create a session",
        body: {
          type: "object",
          required: ["email", "password"],
          additionalProperties: false,
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 8, maxLength: 128 },
          },
        },
        response: {
          401: { type: "object", properties: { error: { type: "string" } } },
        },
      },
    },
    async (req, reply) => {
      const input = loginSchema.parse(req.body);
      const found = users.find((user) => user.email === input.email);
      const passwordMatches = found
        ? await compare(input.password, found.passwordHash)
        : false;
      if (!found || !passwordMatches)
        return reply.status(401).send({ error: "Invalid credentials" });
      const { passwordHash: _, ...user } = found;
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
    items: await incidentRepository.listServices(),
  }));
  app.get(
    "/api/v1/incidents",
    {
      preHandler: requireAuth,
      schema: {
        tags: ["incidents"],
        summary: "List and filter incidents",
        security: [{ bearerAuth: [] }],
        querystring: {
          type: "object",
          properties: {
            search: { type: "string" },
            severity: {
              type: "string",
              enum: ["critical", "high", "medium", "low"],
            },
            status: { type: "string" },
            page: { type: "integer", minimum: 1 },
            pageSize: { type: "integer", minimum: 1, maximum: 100 },
          },
        },
      },
    },
    async (req) => {
      return incidentService.list(
        req.query as Record<string, string | undefined>,
      );
    },
  );
  app.post(
    "/api/v1/incidents",
    {
      preHandler: requireRole("operator"),
      schema: {
        tags: ["incidents"],
        summary: "Create an incident",
        security: [{ bearerAuth: [] }],
      },
    },
    async (req, reply) => {
      const created = await incidentService.create(req.body, req.user);
      event("incident.created", created.id, req.user.name, req.id);
      return reply.status(201).send(created);
    },
  );
  app.get(
    "/api/v1/incidents/:id",
    { preHandler: requireAuth },
    async (req, reply) => {
      const found = await incidentService.get(
        (req.params as { id: string }).id,
      );
      return found ?? reply.status(404).send({ error: "Incident not found" });
    },
  );
  app.patch(
    "/api/v1/incidents/:id",
    { preHandler: requireRole("operator") },
    async (req, _reply) => {
      const found = await incidentService.update(
        (req.params as { id: string }).id,
        req.body,
        req.user,
      );
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
      const found = await incidentService.require(id);
      decideRemediation(found, action as "approve" | "reject", req.user.name);
      await incidentRepository.save(found);
      event(`remediation.${action}d`, id, req.user.name, req.id);
      return { ok: true, status: found.status };
    },
  );
  app.post(
    "/api/v1/incidents/:id/investigate",
    {
      preHandler: requireRole("operator"),
      config: { rateLimit: { max: 20, timeWindow: "1 hour" } },
      schema: {
        tags: ["incidents"],
        summary: "Stream an evidence-based AI investigation over SSE",
        security: [{ bearerAuth: [] }],
      },
    },
    async (req, reply) => {
      const incident = await incidentService.require(
        (req.params as { id: string }).id,
      );
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
      const startedAt = performance.now();
      let toolCount = 0;
      let failed = false;
      const analysisId = crypto.randomUUID();
      reply.raw.on("close", () => controller.abort());
      try {
        for await (const item of provider.investigate({
          incidentId: incident.id,
          title: incident.title,
          serviceId: incident.serviceId,
          question: input.question,
          actor: req.user.name,
          correlationId: req.id,
          executor: toolExecutor,
          signal: controller.signal,
        })) {
          if (item.type === "tool.completed") toolCount++;
          reply.raw.write(
            `id: ${item.id}\nevent: ${item.type}\ndata: ${JSON.stringify(item)}\n\n`,
          );
        }
      } catch (error) {
        failed = true;
        analysisTelemetry.unshift({
          id: analysisId,
          incidentId: incident.id,
          durationMs: Math.round(performance.now() - startedAt),
          tools: toolCount,
          status: "failed",
          mode: provider.mode,
          createdAt: new Date().toISOString(),
        });
        if (!controller.signal.aborted)
          reply.raw.write(
            `event: analysis.failed\ndata: ${JSON.stringify({ id: crypto.randomUUID(), type: "analysis.failed", data: { code: "PROVIDER_ERROR", message: error instanceof Error ? error.message : "Analysis failed" } })}\n\n`,
          );
      }
      if (!controller.signal.aborted && !failed)
        analysisTelemetry.unshift({
          id: analysisId,
          incidentId: incident.id,
          durationMs: Math.round(performance.now() - startedAt),
          tools: toolCount,
          status: "completed",
          mode: provider.mode,
          createdAt: new Date().toISOString(),
        });
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
        analyses: analysisTelemetry.length,
        successRate: analysisTelemetry.length
          ? Number(
              (
                (100 *
                  analysisTelemetry.filter(
                    (entry) => entry.status === "completed",
                  ).length) /
                analysisTelemetry.length
              ).toFixed(1),
            )
          : 0,
        averageLatencyMs: analysisTelemetry.length
          ? Math.round(
              analysisTelemetry.reduce(
                (total, entry) => total + entry.durationMs,
                0,
              ) / analysisTelemetry.length,
            )
          : 0,
        toolCalls: analysisTelemetry.reduce(
          (total, entry) => total + entry.tools,
          0,
        ),
        schemaFailures: analysisTelemetry.filter(
          (entry) => entry.status === "failed",
        ).length,
        ragMisses: 0,
        estimatedCostUsd: 0,
      },
      recent: analysisTelemetry
        .slice(0, 20)
        .map((entry) => ({ ...entry, tokens: 0 })),
    }),
  );
  app.get("/api/v1/tools", { preHandler: requireAuth }, async () => ({
    allowlist: Object.keys(toolInputs),
  }));
  return app;
}
