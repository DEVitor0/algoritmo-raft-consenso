import type { Clock, NodeId, RaftMessage, Transport } from '@raft/raft-core';
import { SeededPrng } from './seed.js';

export interface VirtualClock extends Clock {
  readonly time: number;
  advance(ms: number): void;
  now(): number;
}

export interface NetworkOptions {
  loss?: number;
  minDelayMs?: number;
  maxDelayMs?: number;
  duplicate?: number;
  maxDuplicates?: number;
}

interface Envelope<T> {
  seq: number;
  from: NodeId;
  to: NodeId;
  message: RaftMessage<T>;
  deliverAt: number;
}

export class VirtualClockImpl implements VirtualClock {
  private value = 0;
  get time(): number {
    return this.value;
  }
  advance(ms: number): void {
    this.value += ms;
  }
  now(): number {
    return this.value;
  }
}

export class VirtualNetwork<T = unknown> implements Transport<T> {
  readonly clock: VirtualClockImpl;
  readonly prng: SeededPrng;
  private queue: Envelope<T>[] = [];
  private seq = 0;
  private readonly partitions = new Set<string>();
  private readonly active = new Set<NodeId>();
  private readonly receivers = new Map<NodeId, (from: NodeId, message: RaftMessage<T>) => void>();
  loss: number;
  minDelayMs: number;
  maxDelayMs: number;
  duplicate: number;
  maxDuplicates: number;
  sent = 0;
  dropped = 0;
  delivered = 0;
  duplicated = 0;

  constructor(clock: VirtualClockImpl, prng: SeededPrng, options: NetworkOptions = {}) {
    this.clock = clock;
    this.prng = prng;
    this.loss = options.loss ?? 0;
    this.minDelayMs = options.minDelayMs ?? 5;
    this.maxDelayMs = options.maxDelayMs ?? 40;
    this.duplicate = options.duplicate ?? 0;
    this.maxDuplicates = options.maxDuplicates ?? 1;
  }

  setActive(node: NodeId, up: boolean): void {
    if (up) this.active.add(node);
    else this.active.delete(node);
  }

  register(node: NodeId, receive: (from: NodeId, message: RaftMessage<T>) => void): void {
    this.receivers.set(node, receive);
    this.active.add(node);
  }

  unregister(node: NodeId): void {
    this.receivers.delete(node);
    this.active.delete(node);
  }

  setPartition(groups: readonly (readonly NodeId[])[]): void {
    this.partitions.clear();
    if (groups.length === 0) return;
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

  send(from: NodeId, to: NodeId, message: RaftMessage<T>): void {
    this.sent++;
    if (
      !this.active.has(from) ||
      !this.active.has(to) ||
      this.partitions.has(`${from}->${to}`) ||
      this.prng.random() < this.loss
    ) {
      this.dropped++;
      return;
    }
    const delay = this.prng.nextInt(this.minDelayMs, this.maxDelayMs);
    this.enqueue(from, to, message, this.clock.now() + delay);
  }

  private enqueue(from: NodeId, to: NodeId, message: RaftMessage<T>, deliverAt: number): void {
    this.queue.push({ seq: ++this.seq, from, to, message, deliverAt });
    if (this.prng.random() < this.duplicate) {
      const count = this.prng.nextInt(1, this.maxDuplicates);
      for (let i = 0; i < count; i++) {
        const extraDelay = this.prng.nextInt(this.minDelayMs, this.maxDelayMs);
        this.queue.push({
          seq: ++this.seq,
          from,
          to,
          message,
          deliverAt: deliverAt + extraDelay,
        });
        this.duplicated++;
      }
    }
  }

  drain(): void {
    this.queue.sort((a, b) => a.deliverAt - b.deliverAt || a.seq - b.seq);
    while (this.queue.length > 0) {
      const envelope = this.queue[0];
      if (!envelope || envelope.deliverAt > this.clock.now()) break;
      this.queue.shift();
      if (
        !this.active.has(envelope.from) ||
        !this.active.has(envelope.to) ||
        this.partitions.has(`${envelope.from}->${envelope.to}`)
      ) {
        this.dropped++;
        continue;
      }
      this.receivers.get(envelope.to)?.(envelope.from, envelope.message);
      this.delivered++;
    }
  }

  pending(): number {
    return this.queue.length;
  }
}
