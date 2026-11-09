import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import type { Incident, Service } from "@pulseops/contracts";
import type {
  IncidentFilters,
  IncidentRepository,
} from "../application/incident-repository.js";
import { incidentEvents, incidents, services } from "../db/schema.js";

type IncidentRow = typeof incidents.$inferSelect;
type ServiceRow = typeof services.$inferSelect;
const serviceDto = (row: ServiceRow): Service => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  status: row.status as Service["status"],
  availability: row.availability,
  latencyMs: row.latencyMs,
  errorRate: row.errorRate,
  updatedAt: row.updatedAt.toISOString(),
});
const incidentDto = (
  row: IncidentRow,
  service: ServiceRow,
  timeline: Incident["timeline"] = [],
): Incident => ({
  id: row.id,
  title: row.title,
  description: row.description,
  severity: row.severity as Incident["severity"],
  status: row.status as Incident["status"],
  serviceId: row.serviceId,
  serviceName: service.name,
  assignee: row.assignee,
  slaDueAt: row.slaDueAt.toISOString(),
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
  timeline,
});

export class PostgresIncidentRepository implements IncidentRepository {
  private readonly pool: Pool;
  private readonly db;
  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      max: 10,
      connectionTimeoutMillis: 3_000,
      idleTimeoutMillis: 30_000,
    });
    this.db = drizzle(this.pool);
  }
  async ping() {
    await this.pool.query("select 1");
  }
  async close() {
    await this.pool.end();
  }
  async list(filters: IncidentFilters) {
    const rows = await this.db
      .select({ incident: incidents, service: services })
      .from(incidents)
      .innerJoin(services, eq(incidents.serviceId, services.id))
      .orderBy(desc(incidents.createdAt));
    let filtered = rows.map(({ incident, service }) =>
      incidentDto(incident, service),
    );
    if (filters.status)
      filtered = filtered.filter(
        (incident) => incident.status === filters.status,
      );
    if (filters.severity)
      filtered = filtered.filter(
        (incident) => incident.severity === filters.severity,
      );
    if (filters.search) {
      const term = filters.search.toLowerCase();
      filtered = filtered.filter((incident) =>
        `${incident.id} ${incident.title} ${incident.serviceName}`
          .toLowerCase()
          .includes(term),
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
    const [row] = await this.db
      .select({ incident: incidents, service: services })
      .from(incidents)
      .innerJoin(services, eq(incidents.serviceId, services.id))
      .where(eq(incidents.id, id))
      .limit(1);
    if (!row) return null;
    const events = await this.db
      .select()
      .from(incidentEvents)
      .where(eq(incidentEvents.incidentId, id))
      .orderBy(incidentEvents.createdAt);
    return incidentDto(
      row.incident,
      row.service,
      events.map((entry) => ({
        id: entry.id,
        type: entry.type,
        message: entry.message,
        actor: entry.actor,
        metadata: entry.metadata as Record<string, unknown>,
        createdAt: entry.createdAt.toISOString(),
      })),
    );
  }
  async save(incident: Incident) {
    await this.db.transaction(async (transaction) => {
      await transaction
        .insert(incidents)
        .values({
          id: incident.id,
          title: incident.title,
          description: incident.description,
          severity: incident.severity,
          status: incident.status,
          serviceId: incident.serviceId,
          assignee: incident.assignee,
          slaDueAt: new Date(incident.slaDueAt),
          createdAt: new Date(incident.createdAt),
          updatedAt: new Date(incident.updatedAt),
        })
        .onConflictDoUpdate({
          target: incidents.id,
          set: {
            title: incident.title,
            description: incident.description,
            severity: incident.severity,
            status: incident.status,
            assignee: incident.assignee,
            updatedAt: new Date(incident.updatedAt),
          },
        });
      for (const entry of incident.timeline)
        await transaction
          .insert(incidentEvents)
          .values({
            id: entry.id,
            incidentId: incident.id,
            type: entry.type,
            message: entry.message,
            actor: entry.actor,
            metadata: entry.metadata,
            createdAt: new Date(entry.createdAt),
          })
          .onConflictDoNothing();
    });
    return incident;
  }
  async nextId() {
    const rows = await this.db.select({ id: incidents.id }).from(incidents);
    return `INC-${Math.max(1000, ...rows.map((row) => Number(row.id.replace("INC-", "")) || 0)) + 1}`;
  }
  async listServices() {
    return (await this.db.select().from(services).orderBy(services.name)).map(
      serviceDto,
    );
  }
  async findService(id: string) {
    const [row] = await this.db
      .select()
      .from(services)
      .where(eq(services.id, id))
      .limit(1);
    return row ? serviceDto(row) : null;
  }
}
