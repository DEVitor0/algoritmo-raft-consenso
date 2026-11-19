import { RaftNode, type LogEntry } from '@raft/raft-core';
import type { LinearOperation } from './linearizability.js';
import { SeededPrng } from './seed.js';
import { VirtualClockImpl, VirtualNetwork } from './network.js';

export const SCENARIOS = [
  'isolated-leader',
  'loss-of-majority',
  'symmetric-partition',
  'cascading-restart',
  'retry-during-leader-change',
] as const;

export type Scenario = (typeof SCENARIOS)[number];

export interface SimulatorOptions {
  seed: number;
  scenario: Scenario;
  steps?: number;
  tickMs?: number;
}

export interface SimulationReport {
  seed: number;
  scenario: Scenario;
  virtualTimeMs: number;
  steps: number;
  network: {
    sent: number;
    delivered: number;
    dropped: number;
    duplicated: number;
    pending: number;
  };
  nodes: Array<{
    id: string;
    active: boolean;
    role: 'follower' | 'candidate' | 'leader';
    term: number;
    commitIndex: number;
    lastApplied: number;
  }>;
  invariants: {
    atMostOneLeaderPerTerm: boolean;
    committedLogConsistency: boolean;
  };
  passed: boolean;
  operations: number;
}

export class DeterministicSimulator {
  readonly seed: number;
  readonly scenario: Scenario;
  readonly clock = new VirtualClockImpl();
  readonly prng: SeededPrng;
  readonly network: VirtualNetwork<string>;
  readonly ids = ['n1', 'n2', 'n3', 'n4', 'n5'];
  private nodes = new Map<string, RaftNode<string>>();
  private active = new Set(this.ids);
  private operations: LinearOperation[] = [];

  constructor(options: SimulatorOptions) {
    this.seed = options.seed >>> 0;
    this.scenario = options.scenario;
    this.prng = new SeededPrng(this.seed);
    this.network = new VirtualNetwork<string>(this.clock, this.prng, {
      loss: 0.03,
      minDelayMs: 5,
      maxDelayMs: 35,
      duplicate: 0.02,
      maxDuplicates: 2,
    });
    for (const id of this.ids) this.createNode(id);
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

  private restart(id: string): void {
    this.network.unregister(id);
    this.active.add(id);
    this.network.setActive(id, true);
    this.createNode(id);
  }

  private stop(id: string): void {
    this.active.delete(id);
    this.network.setActive(id, false);
  }

  private leader(): RaftNode<string> | undefined {
    return [...this.nodes.values()].find(
      (node) => this.active.has(node.id) && node.state.role === 'leader',
    );
  }

  run(steps = 200, tickMs = 10): SimulationReport {
    for (let step = 0; step < steps; step++) {
      const now = step * tickMs;
      this.clock.advance(step === 0 ? 0 : tickMs);
      this.applyScenarioSchedule(step, tickMs);

      for (const id of this.ids) {
        if (this.active.has(id)) this.nodes.get(id)?.tick();
      }
      this.network.drain();

      if (now % 100 === 0 && now > 0) {
        const leader = this.leader();
        if (leader) {
          const value = `v${step}`;
          const entry = leader.propose(value);
          if (entry) {
            this.operations.push({
              id: `${step}`,
              key: 'x',
              invocation: now,
              response: now + 20,
              type: 'put',
              value,
            });
          }
        }
      }
      this.network.drain();
    }

    const invariants = this.checkInvariants();
    return {
      seed: this.seed,
      scenario: this.scenario,
      virtualTimeMs: this.clock.now(),
      steps,
      network: {
        sent: this.network.sent,
        delivered: this.network.delivered,
        dropped: this.network.dropped,
        duplicated: this.network.duplicated,
        pending: this.network.pending(),
      },
      nodes: this.ids.map((id) => {
        const node = this.nodes.get(id);
        return {
          id,
          active: this.active.has(id),
          role: node?.state.role ?? 'follower',
          term: node?.currentTerm ?? 0,
          commitIndex: node?.commitIndex ?? 0,
          lastApplied: node?.lastApplied ?? 0,
        };
      }),
      invariants,
      passed: invariants.atMostOneLeaderPerTerm && invariants.committedLogConsistency,
      operations: this.operations.length,
    };
  }

  private applyScenarioSchedule(step: number, tickMs: number): void {
    const now = step * tickMs;
    if (this.scenario === 'isolated-leader') {
      if (now === 180) {
        const leader = this.leader();
        if (leader)
          this.network.setPartition([[leader.id], this.ids.filter((id) => id !== leader.id)]);
      }
      if (now === 520) this.network.clearPartition();
    } else if (this.scenario === 'loss-of-majority') {
      if (now === 180) this.network.loss = 0.85;
      if (now === 520) this.network.loss = 0.03;
    } else if (this.scenario === 'symmetric-partition') {
      if (now === 180)
        this.network.setPartition([
          ['n1', 'n2'],
          ['n3', 'n4', 'n5'],
        ]);
      if (now === 620) this.network.clearPartition();
    } else if (this.scenario === 'cascading-restart') {
      if (now === 180) this.stop('n1');
      if (now === 260) this.stop('n2');
      if (now === 340) this.stop('n3');
      if (now === 430) this.restart('n1');
      if (now === 510) this.restart('n2');
      if (now === 590) this.restart('n3');
    } else if (this.scenario === 'retry-during-leader-change') {
      if (now === 180)
        this.network.setPartition([
          ['n1', 'n2'],
          ['n3', 'n4', 'n5'],
        ]);
      if (now === 400) this.network.clearPartition();
      if (now === 520)
        this.network.setPartition([
          ['n1', 'n2', 'n3'],
          ['n4', 'n5'],
        ]);
      if (now === 720) this.network.clearPartition();
    }
  }

  private checkInvariants(): { atMostOneLeaderPerTerm: boolean; committedLogConsistency: boolean } {
    const leadersByTerm = new Map<number, Set<string>>();
    for (const id of this.ids) {
      const node = this.nodes.get(id);
      if (!this.active.has(id) || node?.state.role !== 'leader') continue;
      const leaders = leadersByTerm.get(node.currentTerm) ?? new Set<string>();
      leaders.add(id);
      leadersByTerm.set(node.currentTerm, leaders);
    }
    const atMostOneLeaderPerTerm = [...leadersByTerm.values()].every(
      (leaders) => leaders.size <= 1,
    );

    const committed = new Map<number, { term: number; command: unknown }>();
    let committedLogConsistency = true;
    for (const id of this.ids) {
      const node = this.nodes.get(id);
      if (!node) continue;
      for (let index = 1; index <= node.commitIndex; index++) {
        const entry: LogEntry<string> | undefined = node.log[index - 1];
        if (!entry) continue;
        const known = committed.get(index);
        if (known && (known.term !== entry.term || known.command !== entry.command)) {
          committedLogConsistency = false;
        }
        committed.set(index, { term: entry.term, command: entry.command });
      }
    }
    return { atMostOneLeaderPerTerm, committedLogConsistency };
  }
}
