import { describe, expect, it } from "vitest";
import type { Incident } from "@pulseops/contracts";
import { decideRemediation, transitionIncident } from "./incidents.js";

const incident = (): Incident => ({
  id: "INC-TEST",
  title: "Synthetic incident",
  description: "Synthetic domain test incident.",
  severity: "high",
  status: "detected",
  serviceId: "svc-orders",
  serviceName: "OrderFlow API",
  assignee: null,
  slaDueAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  timeline: [],
});

describe("incident state machine", () => {
  it("records valid transitions in the timeline", () => {
    const current = incident();
    transitionIncident(current, "investigating", "Operator");
    expect(current.status).toBe("investigating");
    expect(current.timeline[0]?.type).toBe("status.changed");
  });
  it("rejects transitions that skip the workflow", () => {
    expect(() =>
      transitionIncident(incident(), "resolved", "Operator"),
    ).toThrow(/not allowed/);
  });
  it("requires an investigation state for remediation decisions", () => {
    expect(() => decideRemediation(incident(), "approve", "Operator")).toThrow(
      /only be decided/,
    );
  });
});
