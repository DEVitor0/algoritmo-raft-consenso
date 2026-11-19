import type { KVCommand, KVResult } from '@raft/node';

export interface ClientOptions {
  nodes: string[];
  fetcher?: typeof fetch;
  retries?: number;
  baseDelayMs?: number;
  clientId?: string;
}

export class RaftClient {
  private sequence = 0;
  private readonly fetcher: typeof fetch;
  private readonly retries: number;
  private readonly delay: number;
  constructor(private readonly options: ClientOptions) {
    this.fetcher = options.fetcher ?? fetch;
    this.retries = options.retries ?? 5;
    this.delay = options.baseDelayMs ?? 20;
  }
  private requestId() {
    return `${this.options.clientId ?? 'client'}-${++this.sequence}`;
  }
  private async send(command: KVCommand): Promise<KVResult> {
    let nodes = [...this.options.nodes];
    let lastError: unknown;
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      for (const node of nodes) {
        try {
          const response = await this.fetcher(`${node.replace(/\/$/, '')}/kv`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(command),
          });
          const data = (await response.json()) as any;
          if (response.status === 307 && data.leaderId) {
            nodes = [String(data.leaderId), ...nodes.filter((item) => item !== data.leaderId)];
            continue;
          }
          if (response.ok || response.status === 202) return data;
          lastError = new Error(data.error ?? `request failed (${response.status})`);
        } catch (error) {
          lastError = error;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, this.delay * 2 ** attempt));
    }
    throw lastError instanceof Error ? lastError : new Error('all raft nodes unavailable');
  }
  get(key: string) {
    return this.read(key);
  }
  async read(key: string): Promise<KVResult> {
    for (const node of this.options.nodes) {
      try {
        const response = await this.fetcher(
          `${node.replace(/\/$/, '')}/kv?key=${encodeURIComponent(key)}`,
        );
        if (response.ok) return (await response.json()) as KVResult;
      } catch {
        /* try another node */
      }
    }
    throw new Error('all raft nodes unavailable');
  }
  put(key: string, value: string) {
    return this.send({ op: 'PUT', key, value, requestId: this.requestId() });
  }
  delete(key: string) {
    return this.send({ op: 'DELETE', key, requestId: this.requestId() });
  }
  cas(key: string, expected: string | null, value: string) {
    return this.send({ op: 'CAS', key, expected, value, requestId: this.requestId() });
  }
}
export const createClient = (options: ClientOptions) => new RaftClient(options);
