import type { Incident, User } from "@pulseops/contracts";
import {
  createIncidentSchema,
  updateIncidentSchema,
} from "@pulseops/contracts";
import type { IncidentRepository } from "./incident-repository.js";
import { DomainError, transitionIncident } from "../domain/incidents.js";

export class IncidentService {
  constructor(private readonly repository: IncidentRepository) {}
  list(query: Record<string, string | undefined>) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    return this.repository.list({
      search: query.search,
      severity: query.severity,
      status: query.status,
      page,
      pageSize,
    });
  }
  async get(id: string) {
    return this.repository.findById(id);
  }
  async create(payload: unknown, actor: User) {
    const input = createIncidentSchema.parse(payload);
    const service = await this.repository.findService(input.serviceId);
    if (!service)
      throw new DomainError("Service not found", "SERVICE_NOT_FOUND", 404);
    const createdAt = new Date();
    const incident: Incident = {
      ...input,
      id: await this.repository.nextId(),
      status: "detected",
      serviceName: service.name,
      assignee: null,
      slaDueAt: new Date(
        createdAt.getTime() + 2 * 60 * 60 * 1000,
      ).toISOString(),
      createdAt: createdAt.toISOString(),
      updatedAt: createdAt.toISOString(),
      timeline: [
        {
          id: crypto.randomUUID(),
          type: "incident.created",
          message: "Incidente criado manualmente.",
          actor: actor.name,
          createdAt: createdAt.toISOString(),
          metadata: {},
        },
      ],
    };
    return this.repository.save(incident);
  }
  async update(id: string, payload: unknown, actor: User) {
    const incident = await this.require(id);
    const input = updateIncidentSchema.parse(payload);
    if (input.status) transitionIncident(incident, input.status, actor.name);
    if (input.assignee !== undefined) incident.assignee = input.assignee;
    if (input.comment)
      incident.timeline.push({
        id: crypto.randomUUID(),
        type: "comment.added",
        message: input.comment,
        actor: actor.name,
        createdAt: new Date().toISOString(),
        metadata: {},
      });
    incident.updatedAt = new Date().toISOString();
    return this.repository.save(incident);
  }
  async require(id: string) {
    const incident = await this.repository.findById(id);
    if (!incident)
      throw new DomainError("Incident not found", "INCIDENT_NOT_FOUND", 404);
    return incident;
  }
}
