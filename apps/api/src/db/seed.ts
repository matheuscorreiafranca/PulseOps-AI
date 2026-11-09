import pg from "pg";
import { hash } from "bcryptjs";
import { incidents as demoIncidents } from "../state.js";

const client = new pg.Client({
  connectionString:
    process.env.DATABASE_URL ??
    "postgresql://pulseops:pulseops@localhost:5432/pulseops",
});
await client.connect();
try {
  await client.query("begin");
  const passwordHash = await hash("Demo123!", 12);
  const accounts = [
    ["Demo Operator", "operator@pulseops.local", "operator"],
    ["Demo Viewer", "viewer@pulseops.local", "viewer"],
    ["Demo Admin", "admin@pulseops.local", "admin"],
  ];
  for (const [name, email, role] of accounts)
    await client.query(
      "INSERT INTO users(name,email,password_hash,role) VALUES ($1,$2,$3,$4) ON CONFLICT(email) DO UPDATE SET name=excluded.name,password_hash=excluded.password_hash,role=excluded.role",
      [name, email, passwordHash, role],
    );
  const demoServices = [
    [
      "svc-orders",
      "OrderFlow API",
      "orderflow-api",
      "degraded",
      98.72,
      1840,
      8.7,
    ],
    [
      "svc-finance",
      "LedgerSync Worker",
      "ledgersync-worker",
      "down",
      96.1,
      2400,
      12.4,
    ],
    [
      "svc-logistics",
      "RouteBridge Integration",
      "routebridge",
      "degraded",
      99.2,
      780,
      3.2,
    ],
    ["svc-erp", "CoreLedger ERP", "coreledger-erp", "healthy", 99.98, 142, 0.2],
    ["svc-notify", "SignalRelay", "signalrelay", "healthy", 99.95, 98, 0.1],
  ];
  for (const service of demoServices)
    await client.query(
      "INSERT INTO services(id,name,slug,status,availability,latency_ms,error_rate) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(id) DO UPDATE SET name=excluded.name,status=excluded.status,availability=excluded.availability,latency_ms=excluded.latency_ms,error_rate=excluded.error_rate,updated_at=now()",
      service,
    );
  for (const incident of demoIncidents) {
    await client.query(
      "INSERT INTO incidents(id,title,description,severity,status,service_id,assignee,sla_due_at,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT(id) DO UPDATE SET title=excluded.title,description=excluded.description,severity=excluded.severity,status=excluded.status,service_id=excluded.service_id,assignee=excluded.assignee,sla_due_at=excluded.sla_due_at,updated_at=excluded.updated_at",
      [
        incident.id,
        incident.title,
        incident.description,
        incident.severity,
        incident.status,
        incident.serviceId,
        incident.assignee,
        incident.slaDueAt,
        incident.createdAt,
        incident.updatedAt,
      ],
    );
    for (const timelineEvent of incident.timeline)
      await client.query(
        "INSERT INTO incident_events(id,incident_id,type,message,actor,metadata,created_at) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(id) DO NOTHING",
        [
          timelineEvent.id,
          incident.id,
          timelineEvent.type,
          timelineEvent.message,
          timelineEvent.actor,
          timelineEvent.metadata,
          timelineEvent.createdAt,
        ],
      );
  }
  await client.query("commit");
  console.log(
    `Seed completed: ${accounts.length} users, ${demoServices.length} services and ${demoIncidents.length} incidents.`,
  );
} catch (error) {
  await client.query("rollback");
  throw error;
} finally {
  await client.end();
}
