import { createHash } from 'node:crypto';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo, Socket } from 'node:net';
import type { Duplex } from 'node:stream';
import { RaftNode, type KVCommand } from '@raft/node';
import type { Clock, NodeId, RaftMessage, Transport } from '@raft/raft-core';
import { SeededPrng } from './seed.js';

export type NodeProcessStatus = 'running' | 'stopped' | 'restarting' | 'error';

export interface ControllerNodeSnapshot {
  id: string;
  role: 'follower' | 'candidate' | 'leader';
  state: NodeProcessStatus;
  address: string;
  term: number;
  commitIndex: number;
  lastApplied: number;
  leaderId: string | null;
}

export interface ClusterSnapshot {
  nodes: ControllerNodeSnapshot[];
  leaderId: string | null;
  term: number;
  commitIndex: number;
  healthy: boolean;
  timestamp: number;
}

export interface DevClusterControllerOptions {
  port?: number;
  host?: string;
  tickMs?: number;
  nodeIds?: readonly string[];
}

interface RealClock extends Clock {
  now(): number;
}

class LocalTransport implements Transport<KVCommand> {
  readonly active = new Set<NodeId>();
  readonly partitions = new Set<string>();
  readonly receivers = new Map<NodeId, (from: NodeId, message: RaftMessage<KVCommand>) => void>();

  setActive(id: NodeId, active: boolean): void {
    if (active) this.active.add(id);
    else this.active.delete(id);
  }

  register(id: NodeId, receive: (from: NodeId, message: RaftMessage<KVCommand>) => void): void {
    this.receivers.set(id, receive);
  }

  unregister(id: NodeId): void {
    this.receivers.delete(id);
  }

  setPartition(groups: readonly (readonly NodeId[])[]): void {
    this.partitions.clear();
    for (let i = 0; i < groups.length; i++) {
      for (const from of groups[i] ?? []) {
        for (let j = i + 1; j < groups.length; j++) {
          for (const to of groups[j] ?? []) {
            this.partitions.add(`${from}->${to}`);
            this.partitions.add(`${to}->${from}`);
          }
        }
      }
    }
  }

  clearPartition(): void {
    this.partitions.clear();
  }

  send(from: NodeId, to: NodeId, message: RaftMessage<KVCommand>): void {
    if (!this.active.has(from) || !this.active.has(to) || this.partitions.has(`${from}->${to}`)) {
      return;
    }
    const delay = 5;
    setTimeout(() => {
      if (!this.active.has(from) || !this.active.has(to)) return;
      if (this.partitions.has(`${from}->${to}`)) return;
      this.receivers.get(to)?.(from, message);
    }, delay);
  }
}

export class DevClusterController {
  readonly port: number;
  readonly host: string;
  readonly nodeIds: readonly string[];
  readonly transport = new LocalTransport();
  private readonly tickMs: number;
  private readonly clock: RealClock = { now: () => Date.now() };
  private readonly prng = new SeededPrng(Date.now() >>> 0);
  private readonly nodes = new Map<string, RaftNode>();
  private readonly status = new Map<string, NodeProcessStatus>();
  private readonly transitions = new Set<string>();
  private server: Server | undefined;
  private tickTimer: ReturnType<typeof setInterval> | undefined;
  private snapshotTimer: ReturnType<typeof setInterval> | undefined;
  private readonly sockets = new Set<Duplex>();
  private actualPort = 0;

  constructor(options: DevClusterControllerOptions = {}) {
    this.port = options.port ?? 1098;
    this.host = options.host ?? '127.0.0.1';
    this.tickMs = options.tickMs ?? 20;
    this.nodeIds = options.nodeIds ?? ['n1', 'n2', 'n3', 'n4', 'n5'];
    for (const id of this.nodeIds) this.status.set(id, 'stopped');
  }

  async startCluster(): Promise<void> {
    for (const id of this.nodeIds) await this.startNode(id);
  }

  async stopCluster(): Promise<void> {
    for (const id of this.nodeIds) await this.stopNode(id);
  }

  async restartCluster(): Promise<void> {
    await this.stopCluster();
    await this.startCluster();
  }

  async startNode(id: string): Promise<boolean> {
    this.assertNodeId(id);
    if (this.transitions.has(id) || this.status.get(id) === 'running') return false;
    this.transitions.add(id);
    this.status.set(id, 'restarting');
    try {
      await this.createNode(id);
      this.status.set(id, 'running');
      this.broadcast();
      return true;
    } catch (error) {
      this.status.set(id, 'error');
      this.broadcast();
      throw error;
    } finally {
      this.transitions.delete(id);
    }
  }

  async stopNode(id: string): Promise<boolean> {
    this.assertNodeId(id);
    if (this.transitions.has(id)) return false;
    if (this.status.get(id) === 'stopped') return false;
    this.transitions.add(id);
    try {
      this.transport.unregister(id);
      this.transport.setActive(id, false);
      this.nodes.delete(id);
      this.status.set(id, 'stopped');
      this.broadcast();
      return true;
    } finally {
      this.transitions.delete(id);
    }
  }

  async restartNode(id: string): Promise<boolean> {
    this.assertNodeId(id);
    if (this.transitions.has(id)) return false;
    this.transitions.add(id);
    this.status.set(id, 'restarting');
    try {
      await this.stopNodeUnsafe(id);
      await this.createNode(id);
      this.status.set(id, 'running');
      this.broadcast();
      return true;
    } catch (error) {
      this.status.set(id, 'error');
      this.broadcast();
      throw error;
    } finally {
      this.transitions.delete(id);
    }
  }

  private async stopNodeUnsafe(id: string): Promise<void> {
    this.transport.unregister(id);
    this.transport.setActive(id, false);
    this.nodes.delete(id);
  }

  private async createNode(id: string): Promise<void> {
    const node = new RaftNode({
      id,
      peers: [...this.nodeIds],
      clock: this.clock,
      prng: this.prng,
      transport: this.transport,
      electionTimeoutMinMs: 300,
      electionTimeoutMaxMs: 500,
      heartbeatIntervalMs: 100,
    });
    await node.start();
    this.nodes.set(id, node);
    this.transport.register(id, (from, message) => node.handle(from, message));
    this.transport.setActive(id, true);
  }

  private assertNodeId(id: string): void {
    if (!this.nodeIds.includes(id)) throw new Error(`unknown node: ${id}`);
  }

  partition(groups: readonly (readonly string[])[]): void {
    this.transport.setPartition(groups);
  }

  heal(): void {
    this.transport.clearPartition();
  }

  snapshot(): ClusterSnapshot {
    let leaderId: string | null = null;
    let term = 0;
    let commitIndex = 0;
    let healthy = true;
    const nodes = this.nodeIds.map((id): ControllerNodeSnapshot => {
      const node = this.nodes.get(id);
      const status = this.status.get(id) ?? 'stopped';
      if (status !== 'running') healthy = false;
      if (node) {
        term = Math.max(term, node.raft.currentTerm);
        commitIndex = Math.max(commitIndex, node.raft.commitIndex);
        if (node.raft.state.role === 'leader') leaderId = node.id;
      }
      return {
        id,
        role: node?.role ?? 'follower',
        state: status,
        address: `http://${this.host}:${this.actualPort || this.port}/nodes/${encodeURIComponent(id)}`,
        term: node?.raft.currentTerm ?? 0,
        commitIndex: node?.raft.commitIndex ?? 0,
        lastApplied: node?.raft.lastApplied ?? 0,
        leaderId: node?.leaderId ?? null,
      };
    });
    if (!leaderId) {
      leaderId = nodes.find((node) => node.state === 'running' && node.leaderId)?.leaderId ?? null;
    }
    return { nodes, leaderId, term, commitIndex, healthy, timestamp: Date.now() };
  }

  async listen(): Promise<number> {
    if (this.server) {
      const address = this.server.address() as AddressInfo | null;
      return address?.port ?? this.port;
    }
    this.server = createServer((request, response) => {
      void this.handleHttp(request, response);
    });
    this.server.on('upgrade', (request, socket) => this.handleUpgrade(request, socket));
    await new Promise<void>((resolve, reject) => {
      this.server!.once('error', reject);
      this.server!.listen(this.port, this.host, () => resolve());
    });
    this.startTimers();
    const address = this.server.address() as AddressInfo;
    this.actualPort = address.port;
    return address.port;
  }

  private startTimers(): void {
    this.tickTimer ??= setInterval(() => {
      for (const id of this.nodeIds) {
        if (this.status.get(id) === 'running') this.nodes.get(id)?.tick();
      }
    }, this.tickMs);
    this.snapshotTimer ??= setInterval(() => this.broadcast(), 500);
  }

  async close(): Promise<void> {
    if (this.tickTimer) clearInterval(this.tickTimer);
    if (this.snapshotTimer) clearInterval(this.snapshotTimer);
    this.tickTimer = undefined;
    this.snapshotTimer = undefined;
    await this.stopCluster();
    for (const socket of this.sockets) socket.destroy();
    this.sockets.clear();
    if (!this.server) return;
    await new Promise<void>((resolve, reject) => {
      this.server!.close((error) => (error ? reject(error) : resolve()));
    });
    this.server = undefined;
  }

  private json(response: ServerResponse, status: number, body: unknown): void {
    response.statusCode = status;
    response.setHeader('content-type', 'application/json');
    response.setHeader('cache-control', 'no-store');
    response.setHeader('access-control-allow-origin', '*');
    response.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS');
    response.setHeader('access-control-allow-headers', 'content-type');
    response.end(JSON.stringify(body));
  }

  private async readBody(request: IncomingMessage): Promise<Record<string, unknown>> {
    let text = '';
    for await (const chunk of request) text += chunk;
    if (!text) return {};
    const body = JSON.parse(text);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new Error('JSON body must be an object');
    }
    return body as Record<string, unknown>;
  }

  private async handleHttp(request: IncomingMessage, response: ServerResponse): Promise<void> {
    try {
      const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
      if (request.method === 'OPTIONS') return this.json(response, 204, {});
      if (
        request.method === 'GET' &&
        (url.pathname === '/api/cluster' || url.pathname === '/cluster')
      ) {
        return this.json(response, 200, this.snapshot());
      }
      if (
        request.method === 'GET' &&
        (url.pathname === '/api/health' || url.pathname === '/health')
      ) {
        return this.json(response, 200, { ok: true, cluster: this.snapshot() });
      }
      if (request.method === 'GET' && (url.pathname === '/api/poll' || url.pathname === '/poll')) {
        return this.json(response, 200, this.snapshot());
      }
      if (
        request.method === 'GET' &&
        (url.pathname === '/api/nodes' || url.pathname === '/nodes')
      ) {
        return this.json(response, 200, { nodes: this.snapshot().nodes });
      }
      const nodeMatch = url.pathname.match(
        /^\/(?:api\/)?nodes\/([^/]+)(?:\/(start|stop|restart))?$/,
      );
      if (nodeMatch) {
        const id = decodeURIComponent(nodeMatch[1] ?? '');
        this.assertNodeId(id);
        if (request.method === 'GET') {
          const node = this.snapshot().nodes.find((item) => item.id === id);
          return this.json(response, 200, node);
        }
        if (request.method === 'POST') {
          const action = nodeMatch[2] as 'start' | 'stop' | 'restart' | undefined;
          if (!action) return this.json(response, 404, { error: 'action required' });
          const changed =
            action === 'start'
              ? await this.startNode(id)
              : action === 'stop'
                ? await this.stopNode(id)
                : await this.restartNode(id);
          return this.json(response, 200, {
            changed,
            node: this.snapshot().nodes.find((item) => item.id === id),
          });
        }
      }
      if (
        request.method === 'POST' &&
        (url.pathname === '/api/cluster/start' || url.pathname === '/cluster/start')
      ) {
        await this.startCluster();
        return this.json(response, 200, this.snapshot());
      }
      if (
        request.method === 'POST' &&
        (url.pathname === '/api/cluster/stop' || url.pathname === '/cluster/stop')
      ) {
        await this.stopCluster();
        return this.json(response, 200, this.snapshot());
      }
      if (
        request.method === 'POST' &&
        (url.pathname === '/api/cluster/restart' || url.pathname === '/cluster/restart')
      ) {
        await this.restartCluster();
        return this.json(response, 200, this.snapshot());
      }
      if (
        request.method === 'POST' &&
        (url.pathname === '/api/partition' || url.pathname === '/partition')
      ) {
        const body = await this.readBody(request);
        const groups = body.groups;
        if (!Array.isArray(groups) || !groups.every((group) => Array.isArray(group))) {
          return this.json(response, 400, { error: 'groups must be an array of arrays' });
        }
        this.partition(groups as readonly (readonly string[])[]);
        return this.json(response, 200, this.snapshot());
      }
      if (request.method === 'POST' && (url.pathname === '/api/heal' || url.pathname === '/heal')) {
        this.heal();
        return this.json(response, 200, this.snapshot());
      }
      if (request.method === 'POST' && url.pathname === '/api/raft/command') {
        const body = await this.readBody(request);
        const command = body.command as KVCommand | undefined;
        if (!command) return this.json(response, 400, { error: 'command required' });
        const leader = this.nodeIds
          .map((id) => this.nodes.get(id))
          .find((node) => node?.raft.state.role === 'leader');
        if (!leader) return this.json(response, 503, { accepted: false, leaderId: null });
        return this.json(response, 202, leader.propose(command));
      }
      if (request.method === 'GET' && url.pathname === '/api/raft/query') {
        const key = url.searchParams.get('key');
        if (!key) return this.json(response, 400, { error: 'key required' });
        const leader = this.nodeIds
          .map((id) => this.nodes.get(id))
          .find((node) => node?.raft.state.role === 'leader');
        return this.json(response, 200, {
          ok: true,
          value: leader?.store.get(key),
          leaderId: leader?.id ?? null,
        });
      }
      return this.json(response, 404, { error: 'not_found' });
    } catch (error) {
      return this.json(response, error instanceof SyntaxError ? 400 : 500, {
        error: error instanceof Error ? error.message : 'internal_error',
      });
    }
  }

  private handleUpgrade(request: IncomingMessage, socket: Duplex): void {
    if (!['/ws', '/api/ws'].includes(new URL(request.url ?? '/', 'http://localhost').pathname)) {
      socket.destroy();
      return;
    }
    const key = request.headers['sec-websocket-key'];
    if (!key) {
      socket.destroy();
      return;
    }
    const accept = createHash('sha1')
      .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
      .digest('base64');
    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\n' +
        'Upgrade: websocket\r\n' +
        'Connection: Upgrade\r\n' +
        `Sec-WebSocket-Accept: ${accept}\r\n\r\n`,
    );
    this.sockets.add(socket);
    socket.on('close', () => this.sockets.delete(socket));
    socket.on('error', () => this.sockets.delete(socket));
  }

  private broadcast(): void {
    if (this.sockets.size === 0) return;
    const payload = Buffer.from(JSON.stringify({ type: 'cluster', snapshot: this.snapshot() }));
    const header = Buffer.from([0x81, payload.length < 126 ? payload.length : 126]);
    const frame =
      payload.length < 126
        ? Buffer.concat([header, payload])
        : payload.length <= 65535
          ? Buffer.concat([
              header,
              Buffer.from([(payload.length >> 8) & 255, payload.length & 255]),
              payload,
            ])
          : Buffer.concat([header, Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]), payload]);
    for (const socket of this.sockets) socket.writable && socket.write(frame);
  }
}

async function main(): Promise<void> {
  const port = Number(process.env.PORT ?? 1098);
  const controller = new DevClusterController({
    port: Number.isFinite(port) ? port : 1098,
  });
  await controller.startCluster();
  const listeningPort = await controller.listen();
  console.log(`Raft dev controller listening on http://${controller.host}:${listeningPort}`);
  console.log(`Cluster snapshot: http://${controller.host}:${listeningPort}/api/cluster`);
  console.log(`WebSocket: ws://${controller.host}:${listeningPort}/api/ws`);

  let closing = false;
  const shutdown = async (signal: string) => {
    if (closing) return;
    closing = true;
    console.log(`\nStopping cluster (${signal})...`);
    await controller.close();
  };
  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
  process.once('beforeExit', () => void shutdown('beforeExit'));
}

if (process.argv[1]?.endsWith('cluster-dev.ts') || process.argv[1]?.endsWith('cluster-dev.js')) {
  void main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
