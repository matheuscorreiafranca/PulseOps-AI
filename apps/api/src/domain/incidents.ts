import type { Incident } from "@pulseops/contracts";

const allowedTransitions: Record<Incident["status"], Incident["status"][]> = {
  detected: ["investigating", "closed"],
  investigating: ["awaiting_approval", "monitoring", "resolved", "closed"],
  awaiting_approval: ["investigating", "mitigating", "closed"],
  mitigating: ["monitoring", "investigating", "resolved"],
  monitoring: ["investigating", "resolved"],
  resolved: ["monitoring", "closed"],
  closed: [],
};

export class DomainError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly statusCode = 422,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export function transitionIncident(
  incident: Incident,
  target: Incident["status"],
  actor: string,
  now = new Date(),
): Incident {
  if (incident.status === target) return incident;
  if (!allowedTransitions[incident.status].includes(target)) {
    throw new DomainError(
      `Transition from ${incident.status} to ${target} is not allowed`,
      "INVALID_INCIDENT_TRANSITION",
    );
  }
  incident.status = target;
  incident.updatedAt = now.toISOString();
  incident.timeline.push({
    id: crypto.randomUUID(),
    type: "status.changed",
    message: `Status alterado para ${target}.`,
    actor,
    createdAt: incident.updatedAt,
    metadata: { target },
  });
  return incident;
}

export function decideRemediation(
  incident: Incident,
  decision: "approve" | "reject",
  actor: string,
  now = new Date(),
): Incident {
  const target = decision === "approve" ? "mitigating" : "investigating";
  if (!["investigating", "awaiting_approval"].includes(incident.status)) {
    throw new DomainError(
      "Remediation can only be decided while investigating or awaiting approval",
      "INVALID_REMEDIATION_STATE",
    );
  }
  incident.status = target;
  incident.updatedAt = now.toISOString();
  incident.timeline.push({
    id: crypto.randomUUID(),
    type: `remediation.${decision}d`,
    message: `Remediação ${decision === "approve" ? "aprovada" : "rejeitada"} por decisão humana.`,
    actor,
    createdAt: incident.updatedAt,
    metadata: { decision },
  });
  return incident;
}
