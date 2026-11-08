import { describe, expect, it } from 'vitest';
import { analysisSchema, streamEventSchema } from '@pulseops/contracts';
import { DemoLLMProvider, toolInputs } from './index.js';

describe('AI safety contracts', () => {
  it('validates tool inputs and rejects excessive limits', () => {
    expect(toolInputs.search_logs.safeParse({ serviceId: 'svc-orders', query: 'timeout', limit: 20 }).success).toBe(true);
    expect(toolInputs.search_logs.safeParse({ serviceId: 'svc-orders', query: 'timeout', limit: 10_000 }).success).toBe(false);
  });

  it('emits typed streaming events, citations and structured output', async () => {
    const events = [];
    for await (const event of new DemoLLMProvider().investigate({ incidentId: 'INC-TEST', title: 'Synthetic latency', serviceId: 'svc-orders', question: 'Investigate safely' })) {
      events.push(streamEventSchema.parse(event));
    }
    const completed = events.find((event) => event.type === 'analysis.completed');
    expect(events.some((event) => event.type === 'tool.completed')).toBe(true);
    expect(events.some((event) => event.type === 'source.retrieved')).toBe(true);
    expect(completed?.type).toBe('analysis.completed');
    if (completed?.type === 'analysis.completed') {
      expect(analysisSchema.parse(completed.data).requiresHumanApproval).toBe(true);
      expect(completed.data.relatedRunbooks.length).toBeGreaterThan(0);
    }
  });

  it('supports cancellation', async () => {
    const controller = new AbortController();
    const iterator = new DemoLLMProvider().investigate({ incidentId: 'INC-CANCEL', title: 'Cancellation', serviceId: 'svc-orders', question: 'Investigate', signal: controller.signal });
    await iterator.next();
    controller.abort();
    await expect(iterator.next()).rejects.toMatchObject({ name: 'AbortError' });
  });
});
