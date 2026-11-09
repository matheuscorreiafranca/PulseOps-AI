import { beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "./app.js";
describe("PulseOps API", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  beforeEach(async () => {
    app = await buildApp();
  });
  it("authenticates a demo operator", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "operator@pulseops.local", password: "Demo123!" },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().user.role).toBe("operator");
    await app.close();
  });
  it("rejects invalid credentials", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "operator@pulseops.local", password: "wrong-pass" },
    });
    expect(response.statusCode).toBe(401);
    await app.close();
  });
  it("returns incidents for authenticated users", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "viewer@pulseops.local", password: "Demo123!" },
    });
    const token = login.json().token;
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/incidents",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().items.length).toBeGreaterThanOrEqual(4);
    await app.close();
  });
  it("enforces RBAC on incident creation", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "viewer@pulseops.local", password: "Demo123!" },
    });
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/incidents",
      headers: { authorization: `Bearer ${login.json().token}` },
      payload: {
        title: "Synthetic incident test",
        description: "A valid synthetic incident for authorization testing.",
        severity: "low",
        serviceId: "svc-orders",
      },
    });
    expect(response.statusCode).toBe(403);
    await app.close();
  });
  it("streams typed investigation events", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "operator@pulseops.local", password: "Demo123!" },
    });
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/incidents/INC-1042/investigate",
      headers: { authorization: `Bearer ${login.json().token}` },
      payload: { question: "Investigate the latency increase" },
    });
    expect(response.statusCode).toBe(200);
    expect(response.body).toContain("analysis.started");
    expect(response.body).toContain("tool.completed");
    expect(response.body).toContain("analysis.completed");
    await app.close();
  });
  it("creates incidents through the application service", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "operator@pulseops.local", password: "Demo123!" },
    });
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/incidents",
      headers: { authorization: `Bearer ${login.json().token}` },
      payload: {
        title: "Synthetic queue saturation",
        description:
          "Queue depth exceeded the synthetic operational threshold.",
        severity: "medium",
        serviceId: "svc-orders",
      },
    });
    expect(response.statusCode).toBe(201);
    expect(response.json().timeline[0].type).toBe("incident.created");
    await app.close();
  });
  it("rejects invalid incident state transitions", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "operator@pulseops.local", password: "Demo123!" },
    });
    const response = await app.inject({
      method: "PATCH",
      url: "/api/v1/incidents/INC-1039",
      headers: { authorization: `Bearer ${login.json().token}` },
      payload: { status: "resolved" },
    });
    expect(response.statusCode).toBe(422);
    expect(response.json().error).toContain("not allowed");
    await app.close();
  });
});
