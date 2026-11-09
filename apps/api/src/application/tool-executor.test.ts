import { describe, expect, it } from "vitest";
import { OperationalToolExecutor } from "./tool-executor.js";

const context = { actor: "Test Operator", correlationId: "corr-test" };
describe("operational tool executor", () => {
  const executor = new OperationalToolExecutor();
  it("executes bounded health and log reads", async () => {
    const health = await executor.execute(
      "get_service_health",
      { serviceId: "svc-orders" },
      context,
    );
    const logs = await executor.execute(
      "search_logs",
      { serviceId: "svc-orders", query: "timeout", limit: 10 },
      context,
    );
    expect(health.summary).toContain("OrderFlow API");
    expect(logs.summary).toContain("logs sanitizados");
  });
  it("returns citable runbook sources", async () => {
    const result = await executor.execute(
      "search_runbooks",
      { query: "latência elevada OrderFlow API", limit: 3 },
      context,
    );
    expect(result.sources?.[0]).toMatchObject({
      document: "Diagnóstico de alta latência",
      version: "2.1",
    });
  });
  it("rejects inputs outside the schema boundary", async () => {
    await expect(
      executor.execute(
        "search_logs",
        { serviceId: "svc-orders", query: "x", limit: 1000 },
        context,
      ),
    ).rejects.toThrow();
  });
  it("never executes remediation proposals", async () => {
    const result = await executor.execute(
      "propose_remediation",
      { incidentId: "INC-1042", action: "Increase pool by 20%" },
      context,
    );
    expect(result.result).toMatchObject({
      executable: false,
      requiresHumanApproval: true,
    });
  });
});
