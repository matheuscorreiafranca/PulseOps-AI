import type { Incident } from "@pulseops/contracts";
import type {
  IncidentFilters,
  IncidentRepository,
} from "../application/incident-repository.js";
import { incidents, services } from "../state.js";

export class InMemoryIncidentRepository implements IncidentRepository {
  async list(filters: IncidentFilters) {
    let filtered = [...incidents];
    if (filters.status)
      filtered = filtered.filter(
        (incident) => incident.status === filters.status,
      );
    if (filters.severity)
      filtered = filtered.filter(
        (incident) => incident.severity === filters.severity,
      );
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter((incident) =>
        `${incident.id} ${incident.title} ${incident.serviceName}`
          .toLowerCase()
          .includes(search),
      );
    }
    const start = (filters.page - 1) * filters.pageSize;
    return {
      items: filtered.slice(start, start + filters.pageSize),
      total: filtered.length,
      page: filters.page,
      pageSize: filters.pageSize,
    };
  }
  async findById(id: string) {
    return incidents.find((incident) => incident.id === id) ?? null;
  }
  async save(incident: Incident) {
    const index = incidents.findIndex((current) => current.id === incident.id);
    if (index >= 0) incidents[index] = incident;
    else incidents.unshift(incident);
    return incident;
  }
  async nextId() {
    return `INC-${Math.max(...incidents.map((incident) => Number(incident.id.replace("INC-", "")))) + 1}`;
  }
  async listServices() {
    return services;
  }
  async findService(id: string) {
    return services.find((service) => service.id === id) ?? null;
  }
}
