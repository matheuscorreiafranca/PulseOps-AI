import type { Incident, Service } from "@pulseops/contracts";

export interface IncidentFilters {
  search?: string | undefined;
  severity?: string | undefined;
  status?: string | undefined;
  page: number;
  pageSize: number;
}
export interface IncidentPage {
  items: Incident[];
  total: number;
  page: number;
  pageSize: number;
}

export interface IncidentRepository {
  list(filters: IncidentFilters): Promise<IncidentPage>;
  findById(id: string): Promise<Incident | null>;
  save(incident: Incident): Promise<Incident>;
  nextId(): Promise<string>;
  listServices(): Promise<Service[]>;
  findService(id: string): Promise<Service | null>;
}
