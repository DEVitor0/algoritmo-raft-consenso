import { readFile } from "node:fs/promises";
import { closeSync, fsyncSync, mkdirSync, openSync, writeSync } from "node:fs";
import { dirname } from "node:path";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import {
  RaftNode as CoreRaftNode,
  type AppendEntriesRequest,
  type AppendEntriesResponse,
  type LogEntry,
  type NodeId,
  type RaftMessage,
  type RequestVoteRequest,
  type RequestVoteResponse,
  type Transport,
} from "@raft/raft-core";

export type KVCommand =
  | { op: "GET"; key: string; requestId?: string }
  | { op: "PUT"; key: string; value: string; requestId?: string }
  | { op: "DELETE"; key: string; requestId?: string }
  | { op: "CAS"; key: string; expected: string | null; value: string; requestId?: string };
export interface KVResult { ok: boolean; value?: string | undefined; previous?: string | undefined; error?: string; requestId?: string | undefined }
export interface KVStateMachine {
  get(key: string): string | undefined;
  apply(command: KVCommand): KVResult;
  recover(): Promise<void>;
}

function crc32(input: string): number {
  let crc = ~0;
  for (const byte of Buffer.from(input)) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (~crc) >>> 0;
}

/** JSONL records are self-checking; a truncated final record is safely discarded. */
export class JsonlWal {
  constructor(readonly file: string) {}
  appendSync(record: unknown): void {
    const body = JSON.stringify(record);
    const line = JSON.stringify({ record, crc: crc32(body) }) + "\n";
    mkdirSync(dirname(this.file), { recursive: true });
    const fd = openSync(this.file, "a");
    try { writeSync(fd, line); fsyncSync(fd); } finally { closeSync(fd); }
  }
  async append(record: unknown): Promise<void> {
    this.appendSync(record);
  }
  async read(): Promise<unknown[]> {
    let data: string;
    try { data = await readFile(this.file, "utf8"); } catch (e: any) { if (e.code === "ENOENT") return []; throw e; }
    const lines = data.split("\n");
    const result: unknown[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      try {
        const parsed = JSON.parse(line) as { record: unknown; crc: number };
        if (crc32(JSON.stringify(parsed.record)) !== parsed.crc) {
          if (i === lines.length - 1 || i === lines.length - 2) break;
          throw new Error(`WAL checksum mismatch at line ${i + 1}`);
        }
        result.push(parsed.record);
      } catch (e) {
        if (i === lines.length - 1 || (i === lines.length - 2 && !lines.at(-1))) break;
        throw e;
      }
    }
    return result;
  }
}

export class KVStore implements KVStateMachine {
  private values = new Map<string, string>();
  private requests = new Map<string, KVResult>();
  constructor(readonly wal?: JsonlWal) {}
  get(key: string) { return this.values.get(key); }
  async recover() {
    if (!this.wal) return;
    for (const item of await this.wal.read()) {
      const { command } = item as { command: KVCommand };
      this.applyInternal(command, false);
    }
  }
  private applyInternal(command: KVCommand, persist = true): KVResult {
    if (command.requestId && this.requests.has(command.requestId)) return this.requests.get(command.requestId)!;
    const previous = this.values.get(command.key);
    let result: KVResult;
    if (command.op === "GET") result = { ok: true, value: previous };
    else if (command.op === "PUT") { this.values.set(command.key, command.value); result = { ok: true, previous, value: command.value }; }
    else if (command.op === "DELETE") { this.values.delete(command.key); result = { ok: true, previous }; }
    else if ((previous ?? null) !== command.expected) result = { ok: false, error: "compare_failed", value: previous };
    else { this.values.set(command.key, command.value); result = { ok: true, previous, value: command.value }; }
    result.requestId = command.requestId;
    if (command.requestId) this.requests.set(command.requestId, result);
    if (persist && this.wal && command.op !== "GET") this.wal.appendSync({ command });
    return result;
  }
  apply(command: KVCommand): KVResult { return this.applyInternal(command, true); }
}

export class InMemoryTransport<T = unknown> implements Transport<T> {
  private nodes = new Map<NodeId, CoreRaftNode<T>>();
  register(id: NodeId, node: CoreRaftNode<T>) { this.nodes.set(id, node); }
  send(from: NodeId, to: NodeId, message: RaftMessage<T>) { this.nodes.get(to)?.receive(from, message); }
}

import type { RaftNodeOptions as CoreRaftNodeOptions } from "@raft/raft-core";
export interface RaftNodeOptions extends CoreRaftNodeOptions<KVCommand> {
  walPath?: string;
  store?: KVStore;
}
export class RaftNode {
  readonly store: KVStore;
  readonly raft: CoreRaftNode<KVCommand>;
  private server: Server | undefined;
  constructor(options: RaftNodeOptions) {
    this.store = options.store ?? new KVStore(options.walPath ? new JsonlWal(options.walPath) : undefined);
    this.raft = new CoreRaftNode({ ...options, apply: command => this.store.apply(command) });
  }
  async start() { await this.store.recover(); }
  tick() { this.raft.tick(); }
  async listen(port: number, host = "127.0.0.1"): Promise<void> {
    this.server = createHttpServer(this);
    await new Promise<void>((resolve, reject) => {
      this.server!.once("error", reject);
      this.server!.listen(port, host, () => resolve());
    });
  }
  async close(): Promise<void> {
    if (!this.server) return;
    await new Promise<void>((resolve, reject) => this.server!.close(error => error ? reject(error) : resolve()));
    this.server = undefined;
  }
  get role() { return this.raft.state.role; }
  get leaderId() { return this.raft.state.role === "follower" ? this.raft.state.leaderId : this.raft.state.role === "leader" ? this.raft.id : null; }
  propose(command: KVCommand) {
    if (this.raft.state.role !== "leader") return { accepted: false, leaderId: this.leaderId };
    return { accepted: true, entry: this.raft.propose(command) };
  }
  handle(from: NodeId, message: RaftMessage<KVCommand>) { this.raft.receive(from, message); }
}

function json(req: IncomingMessage, res: ServerResponse, status: number, body: unknown) {
  const out = JSON.stringify(body); res.statusCode = status; res.setHeader("content-type", "application/json"); res.end(out);
}
async function body(req: IncomingMessage): Promise<any> {
  let text = ""; for await (const chunk of req) text += chunk; return text ? JSON.parse(text) : {};
}

/** HTTP transport uses the same wire objects as the in-memory transport. */
export function createHttpTransport(base: string): Transport<KVCommand> {
  return { send(from, to, message) {
    void fetch(`${to.startsWith("http") ? to : `${base.replace(/\/$/, "")}/${to}`}/raft`, {
      method: "POST", headers: { "content-type": "application/json", "x-from": from }, body: JSON.stringify(message),
    }).catch(() => undefined);
  }};
}
export function createHttpServer(node: RaftNode): Server {
  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://localhost");
      if (req.method === "POST" && ["/raft", "/raft/request-vote", "/raft/append-entries"].includes(url.pathname)) {
        const message = await body(req) as RaftMessage<KVCommand>;
        node.handle(req.headers["x-from"] as string ?? "peer", message); json(req, res, 200, { ok: true }); return;
      }
      if (req.method === "GET" && url.pathname === "/kv") {
        const key = url.searchParams.get("key"); if (!key) return json(req, res, 400, { error: "key required" });
        return json(req, res, 200, { ok: true, value: node.store.get(key), leaderId: node.leaderId });
      }
      if (req.method === "POST" && url.pathname === "/kv") {
        const result = node.propose(await body(req)); if (!result.accepted) return json(req, res, 307, result);
        return json(req, res, 202, result);
      }
      json(req, res, 404, { error: "not_found" });
    } catch (e) { json(req, res, 400, { error: (e as Error).message }); }
  });
}
export const createFastifyServer = createHttpServer;
/** Adapter for Fastify-like instances, kept dependency-free for the core package. */
export function registerFastifyRoutes(app: {
  post(path: string, handler: (request: any, reply: any) => unknown): unknown;
  get(path: string, handler: (request: any, reply: any) => unknown): unknown;
}, node: RaftNode): void {
  const raft = async (request: any, reply: any) => {
    node.handle(request.headers?.["x-from"] ?? request.body?.from ?? "peer", request.body);
    return reply.send({ ok: true });
  };
  app.post("/raft", raft); app.post("/raft/request-vote", raft); app.post("/raft/append-entries", raft);
  app.get("/kv", async (request: any, reply: any) => {
    const value = node.store.get(request.query?.key);
    return reply.send({ ok: true, value, leaderId: node.leaderId });
  });
  app.post("/kv", async (request: any, reply: any) => {
    const result = node.propose(request.body);
    if (!result.accepted) reply.code(307);
    return reply.send(result);
  });
}
export type { AppendEntriesRequest, AppendEntriesResponse, RequestVoteRequest, RequestVoteResponse, LogEntry };
