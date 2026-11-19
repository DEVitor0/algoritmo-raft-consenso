import { RaftNode, type LogEntry, type RaftMessage } from '@raft/raft-core';
import { VirtualClockImpl, VirtualNetwork, type NetworkEvent } from './network.js';
import { SeededPrng } from './seed.js';

export interface BrowserMessage {
  id: number;
  from: string;
  to: string;
  type: RaftMessage['type'];
  status: 'traveling' | 'delivered' | 'dropped';
  at: number;
}

export interface BrowserNodeSnapshot {
  id: string;
  active: boolean;
  role: 'follower' | 'candidate' | 'leader';
  term: number;
  commitIndex: number;
  lastApplied: number;
  log: Array<{ index: number; term: number; committed: boolean; command: string }>;
}

export interface BrowserSnapshot {
  seed: number;
  time: number;
  nodes: BrowserNodeSnapshot[];
  messages: BrowserMessage[];
  elections: Array<{ term: number; leaderId: string; at: number }>;
  invariants: {
    atMostOneLeaderPerTerm: boolean;
    committedLogConsistency: boolean;
  };
}

export const BROWSER_NODE_IDS = ['n1', 'n2', 'n3', 'n4', 'n5'] as const;

export class BrowserSimulator {
  readonly clock = new VirtualClockImpl();
  readonly ids = BROWSER_NODE_IDS;
  private readonly prng: SeededPrng;
  private readonly network: VirtualNetwork<string>;
  private readonly nodes = new Map<string, RaftNode<string>>();
  private readonly active = new Set<string>(this.ids);
  private readonly blocked = new Set<string>();
  private readonly messages: BrowserMessage[] = [];
  private readonly elections: Array<{ term: number; leaderId: string; at: number }> = [];
  private messageId = 0;
  private lastLeaders = new Map<number, string>();

  constructor(readonly seed: number) {
    this.prng = new SeededPrng(seed);
    this.network = new VirtualNetwork(this.clock, this.prng, {
      loss: 0.03,
      minDelayMs: 5,
      maxDelayMs: 35,
      duplicate: 0.02,
      maxDuplicates: 2,
      onEvent: (event) => this.recordMessage(event),
    });
    for (const id of this.ids) this.createNode(id);
  }

  reset(): void {
    this.clock.advance(-this.clock.now());
    this.nodes.clear();
    this.active.clear();
    this.blocked.clear();
    this.network.clearPartition();
    this.messages.length = 0;
    this.elections.length = 0;
    this.lastLeaders.clear();
    this.messageId = 0;
    for (const id of this.ids) {
      this.active.add(id);
      this.createNode(id);
    }
  }

  step(stepMs = 10): BrowserSnapshot {
    this.clock.advance(stepMs);
    for (const id of this.ids) {
      if (this.active.has(id)) this.nodes.get(id)?.tick();
    }
    this.network.drain();
    this.captureElections();
    return this.snapshot();
  }

  toggleNode(id: string): void {
    if (!this.nodes.has(id)) return;
    if (this.active.has(id)) {
      this.active.delete(id);
      this.network.setActive(id, false);
    } else {
      this.active.add(id);
      this.network.setActive(id, true);
      this.createNode(id);
    }
  }

  togglePartition(from: string, to: string): void {
    const key = `${from}->${to}`;
    if (this.blocked.has(key)) {
      this.blocked.delete(key);
      this.blocked.delete(`${to}->${from}`);
    } else {
      this.blocked.add(key);
      this.blocked.add(`${to}->${from}`);
    }
    this.network.setLinkBlocked(from, to, this.blocked.has(key));
    this.network.setLinkBlocked(to, from, this.blocked.has(`${to}->${from}`));
  }

  put(value: string): boolean {
    const leader = this.currentLeader();
    return Boolean(leader?.propose(`PUT demo ${value}`));
  }

  snapshot(): BrowserSnapshot {
    return {
      seed: this.seed,
      time: this.clock.now(),
      nodes: this.ids.map((id) => {
        const node = this.nodes.get(id);
        return {
          id,
          active: this.active.has(id),
          role: node?.state.role ?? 'follower',
          term: node?.currentTerm ?? 0,
          commitIndex: node?.commitIndex ?? 0,
          lastApplied: node?.lastApplied ?? 0,
          log: (node?.log ?? []).map((entry) => ({
            index: entry.index,
            term: entry.term,
            committed: entry.index <= (node?.commitIndex ?? 0),
            command: String(entry.command),
          })),
        };
      }),
      messages: this.messages.slice(-80),
      elections: [...this.elections],
      invariants: this.checkInvariants(),
    };
  }

  private createNode(id: string): void {
    const node = new RaftNode<string>({
      id,
      peers: this.ids,
      clock: this.clock,
      prng: this.prng,
      transport: this.network,
      electionTimeoutMinMs: 120,
      electionTimeoutMaxMs: 220,
      heartbeatIntervalMs: 40,
    });
    this.nodes.set(id, node);
    this.network.register(id, (from, message) => node.receive(from, message));
    this.network.setActive(id, this.active.has(id));
  }

  private currentLeader(): RaftNode<string> | undefined {
    return this.ids
      .map((id) => this.nodes.get(id))
      .find((node) => node && this.active.has(node.id) && node.state.role === 'leader');
  }

  private recordMessage(event: NetworkEvent): void {
    const message = {
      id: ++this.messageId,
      from: event.from,
      to: event.to,
      type: event.message.type,
      status:
        event.kind === 'sent'
          ? ('traveling' as const)
          : event.kind === 'delivered'
            ? ('delivered' as const)
            : ('dropped' as const),
      at: event.at,
    };
    let previous: BrowserMessage | undefined;
    for (let index = this.messages.length - 1; index >= 0; index--) {
      const item = this.messages[index];
      if (
        item &&
        item.from === message.from &&
        item.to === message.to &&
        item.type === message.type
      ) {
        previous = item;
        break;
      }
    }
    if (event.kind === 'delivered' && previous?.status === 'traveling') {
      previous.status = 'delivered';
    } else {
      this.messages.push(message);
    }
  }

  private captureElections(): void {
    for (const node of this.nodes.values()) {
      if (node.state.role !== 'leader' || this.lastLeaders.get(node.currentTerm) === node.id)
        continue;
      this.lastLeaders.set(node.currentTerm, node.id);
      this.elections.push({ term: node.currentTerm, leaderId: node.id, at: this.clock.now() });
    }
  }

  private checkInvariants(): BrowserSnapshot['invariants'] {
    const leaders = new Map<number, Set<string>>();
    for (const node of this.nodes.values()) {
      if (!this.active.has(node.id) || node.state.role !== 'leader') continue;
      const current = leaders.get(node.currentTerm) ?? new Set<string>();
      current.add(node.id);
      leaders.set(node.currentTerm, current);
    }
    const committed = new Map<number, LogEntry<string>>();
    let committedLogConsistency = true;
    for (const node of this.nodes.values()) {
      for (let index = 1; index <= node.commitIndex; index++) {
        const entry = node.log[index - 1];
        if (!entry) continue;
        const known = committed.get(index);
        if (known && (known.term !== entry.term || known.command !== entry.command)) {
          committedLogConsistency = false;
        }
        committed.set(index, entry);
      }
    }
    return {
      atMostOneLeaderPerTerm: [...leaders.values()].every((set) => set.size <= 1),
      committedLogConsistency,
    };
  }
}
