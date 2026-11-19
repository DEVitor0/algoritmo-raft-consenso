import { describe, expect, it } from 'vitest';
import { RequestMetrics, createJsonLogger } from './observability.js';

describe('Prometheus metrics', () => {
  it('formats counters and cumulative histogram buckets', () => {
    const metrics = new RequestMetrics();
    metrics.increment('requests_total', { method: 'GET' });
    metrics.observe('request_duration_milliseconds', 7, { method: 'GET' });
    const output = metrics.render({
      id: 'n"1',
      role: 'leader',
      term: 2,
      commitIndex: 4,
      lastApplied: 3,
      logLength: 5,
    });
    expect(output).toContain('requests_total{method="GET"} 1');
    expect(output).toContain('request_duration_milliseconds_bucket{method="GET",le="10"} 1');
    expect(output).toContain('request_duration_milliseconds_bucket{method="GET",le="+Inf"} 1');
    expect(output).toContain('raft_node_info{node_id="n\\"1",role="leader"} 1');
  });
});

describe('structured logger', () => {
  it('emits parseable JSON with fields', () => {
    const lines: string[] = [];
    createJsonLogger((line) => lines.push(line), { service: 'node' }).info('started', {
      port: 3000,
    });
    expect(JSON.parse(lines[0]!)).toMatchObject({
      level: 'info',
      message: 'started',
      service: 'node',
      port: 3000,
    });
  });
});
