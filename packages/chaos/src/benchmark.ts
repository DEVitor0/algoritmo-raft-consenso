import { hostname } from 'node:os';
import { writeFile } from 'node:fs/promises';

export interface BenchmarkOptions {
  url: string;
  concurrency: number;
  writeRatio: number;
  warmup: number;
  repetitions: number;
  keyCount: number;
  output?: string;
  format?: 'json' | 'markdown';
}

export interface BenchmarkReport {
  host: string;
  target: string;
  methodology: {
    concurrency: number;
    writeRatio: number;
    warmupRequests: number;
    measuredRequests: number;
    keyCount: number;
    closedLoop: true;
  };
  results: {
    total: number;
    successful: number;
    failed: number;
    read: number;
    write: number;
    latencyMs: {
      count: number;
      min: number;
      max: number;
      mean: number;
      p50: number;
      p90: number;
      p95: number;
      p99: number;
    };
  };
}

export function percentile(values: readonly number[], p: number): number {
  if (!values.length) return 0;
  if (p < 0 || p > 100) throw new RangeError('percentile must be between 0 and 100');
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * (p / 100);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  return sorted[lower]! + (sorted[upper]! - sorted[lower]!) * (index - lower);
}

export async function runBenchmark(options: BenchmarkOptions): Promise<BenchmarkReport> {
  const latencies: number[] = [];
  let successful = 0;
  let failed = 0;
  let reads = 0;
  let writes = 0;
  let warmupLeft = options.warmup;
  let measuredLeft = options.repetitions;
  let sequence = 0;
  const next = (): 'warmup' | 'measure' | undefined => {
    if (warmupLeft > 0) {
      warmupLeft--;
      return 'warmup';
    }
    if (measuredLeft > 0) {
      measuredLeft--;
      return 'measure';
    }
    return undefined;
  };
  const worker = async (): Promise<void> => {
    while (true) {
      const phase = next();
      if (!phase) return;
      const isWrite = sequence++ % 100 < options.writeRatio;
      const key = `benchmark-${sequence % options.keyCount}`;
      const started = performance.now();
      try {
        const response = isWrite
          ? await fetch(options.url.replace(/\/$/, '') + '/kv', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                op: 'PUT',
                key,
                value: String(sequence),
                requestId: `benchmark-${sequence}`,
              }),
            })
          : await fetch(`${options.url.replace(/\/$/, '')}/kv?key=${encodeURIComponent(key)}`);
        const elapsed = performance.now() - started;
        if (phase === 'measure') {
          if (isWrite) writes++;
          else reads++;
          latencies.push(elapsed);
          if (response.status >= 200 && response.status < 300) successful++;
          else failed++;
        }
      } catch {
        if (phase === 'measure') {
          if (isWrite) writes++;
          else reads++;
          latencies.push(performance.now() - started);
          failed++;
        }
      }
    }
  };
  // Warmup and measured work share the same closed-loop workers; only measured requests are recorded.
  await Promise.all(Array.from({ length: Math.max(1, options.concurrency) }, worker));
  const total = latencies.length;
  const sum = latencies.reduce((a, b) => a + b, 0);
  return {
    host: hostname(),
    target: options.url,
    methodology: {
      concurrency: options.concurrency,
      writeRatio: options.writeRatio,
      warmupRequests: options.warmup,
      measuredRequests: options.repetitions,
      keyCount: options.keyCount,
      closedLoop: true,
    },
    results: {
      total,
      successful,
      failed,
      read: reads,
      write: writes,
      latencyMs: {
        count: total,
        min: total ? Math.min(...latencies) : 0,
        max: total ? Math.max(...latencies) : 0,
        mean: total ? sum / total : 0,
        p50: percentile(latencies, 50),
        p90: percentile(latencies, 90),
        p95: percentile(latencies, 95),
        p99: percentile(latencies, 99),
      },
    },
  };
}

export function markdownReport(report: BenchmarkReport): string {
  const { methodology: m, results: r } = report;
  return `# Raft benchmark

- Host: \`${report.host}\`
- Target: \`${report.target}\`
- Methodology: closed-loop, ${m.concurrency} concurrent workers, ${m.writeRatio}% writes, ${m.warmupRequests} warmup requests, ${m.measuredRequests} measured requests, ${m.keyCount} keys

| Metric | Value |
|---|---:|
| Successful | ${r.successful} |
| Failed | ${r.failed} |
| Reads | ${r.read} |
| Writes | ${r.write} |
| Min latency (ms) | ${r.latencyMs.min.toFixed(3)} |
| Mean latency (ms) | ${r.latencyMs.mean.toFixed(3)} |
| p50 latency (ms) | ${r.latencyMs.p50.toFixed(3)} |
| p90 latency (ms) | ${r.latencyMs.p90.toFixed(3)} |
| p95 latency (ms) | ${r.latencyMs.p95.toFixed(3)} |
| p99 latency (ms) | ${r.latencyMs.p99.toFixed(3)} |
| Max latency (ms) | ${r.latencyMs.max.toFixed(3)} |
`;
}

function parseArgs(args: string[]): BenchmarkOptions {
  const values = new Map<string, string>();
  for (let i = 0; i < args.length; i++) {
    const [key, inline] = args[i]!.split('=');
    if (key?.startsWith('--')) values.set(key.slice(2), inline ?? args[++i]!);
  }
  const parsed: BenchmarkOptions = {
    url: values.get('url') ?? 'http://127.0.0.1:3000',
    concurrency: Number(values.get('concurrency') ?? 1),
    writeRatio: Number(values.get('write-ratio') ?? 50),
    warmup: Number(values.get('warmup') ?? 100),
    repetitions: Number(values.get('repetitions') ?? 1000),
    keyCount: Number(values.get('keys') ?? 100),
    format: (values.get('format') as 'json' | 'markdown' | undefined) ?? 'json',
  };
  const output = values.get('output');
  if (output !== undefined) parsed.output = output;
  return parsed;
}

if (process.argv[1]?.endsWith('/benchmark.js')) {
  const options = parseArgs(process.argv.slice(2));
  runBenchmark(options)
    .then(async (report) => {
      const content =
        options.format === 'markdown' ? markdownReport(report) : JSON.stringify(report, null, 2);
      if (options.output) await writeFile(options.output, `${content}\n`);
      else process.stdout.write(`${content}\n`);
    })
    .catch((error) => {
      process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
      process.exitCode = 1;
    });
}
