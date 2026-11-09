import {
  pgTable,
  text,
  timestamp,
  integer,
  real,
  jsonb,
  vector,
  uuid,
} from "drizzle-orm/pg-core";
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export const services = pgTable("services", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  status: text("status").notNull(),
  availability: real("availability").notNull(),
  latencyMs: integer("latency_ms").notNull(),
  errorRate: real("error_rate").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export const incidents = pgTable("incidents", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  severity: text("severity").notNull(),
  status: text("status").notNull(),
  serviceId: text("service_id")
    .references(() => services.id)
    .notNull(),
  assignee: text("assignee"),
  slaDueAt: timestamp("sla_due_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export const incidentEvents = pgTable("incident_events", {
  id: text("id").primaryKey(),
  incidentId: text("incident_id")
    .references(() => incidents.id)
    .notNull(),
  type: text("type").notNull(),
  message: text("message").notNull(),
  actor: text("actor").notNull(),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export const runbookChunks = pgTable("runbook_chunks", {
  id: text("id").primaryKey(),
  document: text("document").notNull(),
  content: text("content").notNull(),
  version: text("version").notNull(),
  service: text("service").notNull(),
  category: text("category").notNull(),
  embedding: vector("embedding", { dimensions: 1536 }),
});
export const auditEvents = pgTable("audit_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  action: text("action").notNull(),
  resource: text("resource").notNull(),
  actor: text("actor").notNull(),
  correlationId: text("correlation_id").notNull(),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
