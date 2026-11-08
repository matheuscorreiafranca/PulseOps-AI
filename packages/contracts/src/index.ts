import { z } from 'zod';

export const roleSchema = z.enum(['admin', 'operator', 'viewer']);
export const incidentStatusSchema = z.enum(['detected', 'investigating', 'awaiting_approval', 'mitigating', 'monitoring', 'resolved', 'closed']);
export const severitySchema = z.enum(['critical', 'high', 'medium', 'low']);
export const serviceStatusSchema = z.enum(['healthy', 'degraded', 'down']);

export const userSchema = z.object({ id: z.string(), name: z.string(), email: z.email(), role: roleSchema });
export const serviceSchema = z.object({
  id: z.string(), name: z.string(), slug: z.string(), status: serviceStatusSchema,
  availability: z.number(), latencyMs: z.number(), errorRate: z.number(), updatedAt: z.string()
});
export const timelineEventSchema = z.object({
  id: z.string(), type: z.string(), message: z.string(), actor: z.string(), createdAt: z.string(), metadata: z.record(z.string(), z.unknown()).default({})
});
export const incidentSchema = z.object({
  id: z.string(), title: z.string(), description: z.string(), severity: severitySchema, status: incidentStatusSchema,
  serviceId: z.string(), serviceName: z.string(), assignee: z.string().nullable(), slaDueAt: z.string(), createdAt: z.string(), updatedAt: z.string(),
  timeline: z.array(timelineEventSchema).default([])
});
export const jobSchema = z.object({ id: z.string(), name: z.string(), queue: z.string(), status: z.enum(['completed', 'running', 'failed', 'delayed']), attempts: z.number(), durationMs: z.number().nullable(), updatedAt: z.string() });
export const runbookSchema = z.object({ id: z.string(), title: z.string(), category: z.string(), service: z.string(), version: z.string(), excerpt: z.string(), updatedAt: z.string() });
export const auditSchema = z.object({ id: z.string(), action: z.string(), resource: z.string(), actor: z.string(), correlationId: z.string(), createdAt: z.string() });

export const evidenceSchema = z.object({ id: z.string(), description: z.string(), source: z.string(), observedAt: z.string() });
export const sourceSchema = z.object({ id: z.string(), document: z.string(), excerpt: z.string(), version: z.string(), similarity: z.number() });
export const probableCauseSchema = z.object({
  description: z.string(), confidence: z.number().min(0).max(1), supportingEvidence: z.array(z.string()), contraryEvidence: z.array(z.string()), nextStep: z.string()
});
export const recommendedActionSchema = z.object({ id: z.string(), title: z.string(), description: z.string(), risk: z.enum(['low', 'medium', 'high']), requiresApproval: z.boolean() });
export const analysisSchema = z.object({
  incidentId: z.string(), summary: z.string(), severityAssessment: severitySchema, probableCauses: z.array(probableCauseSchema),
  evidence: z.array(evidenceSchema), recommendedActions: z.array(recommendedActionSchema), relatedRunbooks: z.array(sourceSchema),
  confidence: z.number().min(0).max(1), limitations: z.array(z.string()), requiresHumanApproval: z.boolean(), generatedAt: z.string()
});
export type Analysis = z.infer<typeof analysisSchema>;

export const toolNameSchema = z.enum(['get_service_health','query_recent_metrics','search_logs','get_failed_jobs','get_integration_events','search_runbooks','find_similar_incidents','get_incident_timeline','propose_remediation','simulate_remediation']);
export const streamEventSchema = z.discriminatedUnion('type', [
  z.object({ id: z.string(), type: z.literal('analysis.started'), data: z.object({ analysisId: z.string(), mode: z.enum(['demo','real']) }) }),
  z.object({ id: z.string(), type: z.literal('analysis.delta'), data: z.object({ delta: z.string() }) }),
  z.object({ id: z.string(), type: z.literal('tool.started'), data: z.object({ callId: z.string(), name: toolNameSchema, arguments: z.record(z.string(), z.unknown()) }) }),
  z.object({ id: z.string(), type: z.literal('tool.completed'), data: z.object({ callId: z.string(), name: toolNameSchema, summary: z.string(), durationMs: z.number() }) }),
  z.object({ id: z.string(), type: z.literal('source.retrieved'), data: sourceSchema }),
  z.object({ id: z.string(), type: z.literal('analysis.completed'), data: analysisSchema }),
  z.object({ id: z.string(), type: z.literal('analysis.failed'), data: z.object({ code: z.string(), message: z.string() }) })
]);
export type StreamEvent = z.infer<typeof streamEventSchema>;

export const loginSchema = z.object({ email: z.email(), password: z.string().min(8).max(128) });
export const createIncidentSchema = z.object({ title: z.string().min(5).max(160), description: z.string().min(10).max(2000), severity: severitySchema, serviceId: z.string() });
export const updateIncidentSchema = z.object({ status: incidentStatusSchema.optional(), assignee: z.string().nullable().optional(), comment: z.string().min(1).max(1000).optional() });
export const investigateSchema = z.object({ question: z.string().min(3).max(1000) });

export type User = z.infer<typeof userSchema>;
export type Service = z.infer<typeof serviceSchema>;
export type Incident = z.infer<typeof incidentSchema>;
export type Job = z.infer<typeof jobSchema>;
export type Runbook = z.infer<typeof runbookSchema>;
export type Audit = z.infer<typeof auditSchema>;
export type Role = z.infer<typeof roleSchema>;
