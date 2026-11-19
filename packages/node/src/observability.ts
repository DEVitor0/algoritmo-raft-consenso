import { hostname } from 'node:os';

export interface HistogramSnapshot {
  count: number;
  sum: number;
  buckets: number[];
}

export const DEFAULT_LATENCY_BUCKETS = [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000];

export class RequestMetrics {
  private readonly counts = new Map<string, number>();
  private readonly durations = new Map<string, HistogramSnapshot>();

  increment(name: string, labels: Record<string, string> = {}): void {
    const key = labelKey(labels);
    this.counts.set(`${name}|${key}`, (this.counts.get(`${name}|${key}`) ?? 0) + 1);
  }

  observe(name: string, valueMs: number, labels: Record<string, string> = {}): void {
    const key = labelKey(labels);
    const current = this.durations.get(`${name}|${key}`) ?? {
      count: 0,
      sum: 0,
      buckets: DEFAULT_LATENCY_BUCKETS.map(() => 0),
    };
    current.count++;
    current.sum += valueMs;
    DEFAULT_LATENCY_BUCKETS.forEach((bound, i) => {
      if (valueMs <= bound) current.buckets[i]!++;
    });
    this.durations.set(`${name}|${key}`, current);
  }

  render(node: {
    id: string;
    role: string;
    term: number;
    commitIndex: number;
    lastApplied: number;
    logLength: number;
  }): string {
    const lines = [
      '# HELP raft_node_info Current Raft node state.',
      '# TYPE raft_node_info gauge',
      `raft_node_info{node_id="${escapeLabel(node.id)}",role="${escapeLabel(node.role)}"} 1`,
      '# HELP raft_node_term Current Raft term.',
      '# TYPE raft_node_term gauge',
      `raft_node_term{node_id="${escapeLabel(node.id)}"} ${node.term}`,
      '# HELP raft_node_commit_index Committed log index.',
      '# TYPE raft_node_commit_index gauge',
      `raft_node_commit_index{node_id="${escapeLabel(node.id)}"} ${node.commitIndex}`,
      '# HELP raft_node_last_applied Last applied log index.',
      '# TYPE raft_node_last_applied gauge',
      `raft_node_last_applied{node_id="${escapeLabel(node.id)}"} ${node.lastApplied}`,
      '# HELP raft_node_log_entries Number of entries in the log.',
      '# TYPE raft_node_log_entries gauge',
      `raft_node_log_entries{node_id="${escapeLabel(node.id)}"} ${node.logLength}`,
    ];
    for (const [key, count] of this.counts) {
      const [name, labelText] = key.split('|');
      const labels = labelText ? `{${labelText}}` : '';
      lines.push(`${name}${labels} ${count}`);
    }
    for (const [key, histogram] of this.durations) {
      const [name, labelText] = key.split('|');
      const labels = labelText ?? '';
      for (let i = 0; i < DEFAULT_LATENCY_BUCKETS.length; i++) {
        lines.push(
          `${name}_bucket${addLabel(labels, 'le', String(DEFAULT_LATENCY_BUCKETS[i]))} ${histogram.buckets[i]}`,
        );
      }
      lines.push(`${name}_bucket${addLabel(labels, 'le', '+Inf')} ${histogram.count}`);
      lines.push(`${name}_sum${labels ? `{${labels}}` : ''} ${histogram.sum}`);
      lines.push(`${name}_count${labels ? `{${labels}}` : ''} ${histogram.count}`);
    }
    return `${lines.join('\n')}\n`;
  }
}

export interface StructuredLogger {
  info(message: string, fields?: Record<string, unknown>): void;
  warn(message: string, fields?: Record<string, unknown>): void;
  error(message: string, fields?: Record<string, unknown>): void;
}

export function createJsonLogger(
  output: (line: string) => void = (line) => process.stdout.write(`${line}\n`),
  base: Record<string, unknown> = {},
): StructuredLogger {
  return {
    info: (message, fields = {}) =>
      output(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'info',
          message,
          ...base,
          ...fields,
        }),
      ),
    warn: (message, fields = {}) =>
      output(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'warn',
          message,
          ...base,
          ...fields,
        }),
      ),
    error: (message, fields = {}) =>
      output(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'error',
          message,
          ...base,
          ...fields,
        }),
      ),
  };
}

export function defaultLogger(): StructuredLogger {
  return createJsonLogger((line) => process.stderr.write(`${line}\n`), { host: hostname() });
}

function labelKey(labels: Record<string, string>): string {
  return Object.entries(labels)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}="${escapeLabel(value)}"`)
    .join(',');
}

function addLabel(labels: string, key: string, value: string): string {
  return `{${labels ? `${labels},` : ''}${key}="${escapeLabel(value)}"}`;
}

function escapeLabel(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('\n', '\\n');
}
