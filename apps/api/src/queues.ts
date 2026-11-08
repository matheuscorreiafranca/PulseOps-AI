import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';

const queueNames = ['runbook-ingestion', 'incident-analysis', 'report-generation', 'temporary-data-cleanup'] as const;

export function startQueues(redisUrl: string) {
  const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
  const queues = queueNames.map((name) => new Queue(name, { connection, defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 1_000 }, removeOnComplete: 100, removeOnFail: false } }));
  const workers = queueNames.map((name) => new Worker(name, async (job) => ({ jobId: job.id, correlationId: job.data.correlationId, processedAt: new Date().toISOString() }), { connection, concurrency: 2 }));
  for (const worker of workers) worker.on('failed', (job, error) => console.error(JSON.stringify({ level: 'error', queue: worker.name, jobId: job?.id, error: error.message })));
  return { queues, workers, close: async () => { await Promise.all([...workers.map((worker) => worker.close()), ...queues.map((queue) => queue.close())]); await connection.quit(); } };
}
