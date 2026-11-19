export type NodeId = string;

export interface LogEntry<TCommand = unknown> {
  term: number;
  index: number;
  command: TCommand;
}

export interface RequestVoteRequest {
  type: "RequestVote";
  term: number;
  candidateId: NodeId;
  lastLogIndex: number;
  lastLogTerm: number;
}

export interface RequestVoteResponse {
  type: "RequestVoteResponse";
  term: number;
  voteGranted: boolean;
}

export interface AppendEntriesRequest<TCommand = unknown> {
  type: "AppendEntries";
  term: number;
  leaderId: NodeId;
  prevLogIndex: number;
  prevLogTerm: number;
  entries: LogEntry<TCommand>[];
  leaderCommit: number;
}

export interface AppendEntriesResponse {
  type: "AppendEntriesResponse";
  term: number;
  success: boolean;
  matchIndex: number;
  conflictIndex?: number;
  conflictTerm?: number;
}

export type RaftMessage<TCommand = unknown> =
  | RequestVoteRequest
  | RequestVoteResponse
  | AppendEntriesRequest<TCommand>
  | AppendEntriesResponse;

export type FollowerState = {
  role: "follower";
  leaderId: NodeId | null;
  electionDeadline: number;
};
export type CandidateState = {
  role: "candidate";
  votesReceived: NodeId[];
  electionDeadline: number;
};
export type LeaderState = {
  role: "leader";
  nextIndex: Record<NodeId, number>;
  matchIndex: Record<NodeId, number>;
  heartbeatDeadline: number;
};
export type RaftRoleState = FollowerState | CandidateState | LeaderState;

export interface Clock {
  now(): number;
}

export interface PRNG {
  random(): number;
  nextInt?(min: number, max: number): number;
}

export interface Transport<TCommand = unknown> {
  send(from: NodeId, to: NodeId, message: RaftMessage<TCommand>): void;
}

export interface RaftNodeOptions<TCommand = unknown> {
  id: NodeId;
  peers: readonly NodeId[];
  clock?: Clock;
  prng?: PRNG;
  transport?: Transport<TCommand>;
  electionTimeoutMinMs?: number;
  electionTimeoutMaxMs?: number;
  heartbeatIntervalMs?: number;
  apply?: (command: TCommand, index: number, term: number) => void;
  initialLog?: readonly LogEntry<TCommand>[];
  initialState?: "follower" | "candidate";
  initialTerm?: number;
}

function lastIndex<T>(log: readonly LogEntry<T>[]): number {
  return log.length === 0 ? 0 : log[log.length - 1]?.index ?? 0;
}

function termAt<T>(log: readonly LogEntry<T>[], index: number): number {
  if (index === 0) return 0;
  const entry = log[index - 1];
  return entry?.index === index ? entry.term : 0;
}

export class RaftNode<TCommand = unknown> {
  readonly id: NodeId;
  readonly peers: readonly NodeId[];
  readonly clock: Clock;
  readonly prng: PRNG;
  readonly transport: Transport<TCommand>;
  readonly applyCommand: (command: TCommand, index: number, term: number) => void;

  currentTerm = 0;
  votedFor: NodeId | null = null;
  log: LogEntry<TCommand>[] = [];
  commitIndex = 0;
  lastApplied = 0;

  state: RaftRoleState;
  electionTimeoutMinMs: number;
  electionTimeoutMaxMs: number;
  heartbeatIntervalMs: number;

  constructor(options: RaftNodeOptions<TCommand>) {
    this.id = options.id;
    this.peers = options.peers.filter(peer => peer !== options.id);
    this.clock = options.clock ?? { now: () => 0 };
    this.prng = options.prng ?? { random: () => 0.5 };
    this.transport = options.transport ?? { send: () => undefined };
    this.applyCommand = options.apply ?? (() => undefined);
    this.electionTimeoutMinMs = options.electionTimeoutMinMs ?? 150;
    this.electionTimeoutMaxMs = options.electionTimeoutMaxMs ?? 300;
    this.heartbeatIntervalMs = options.heartbeatIntervalMs ?? 50;
    this.currentTerm = options.initialTerm ?? 0;
    this.log = (options.initialLog ?? []).map((entry, position) => ({
      ...entry,
      index: entry.index ?? position + 1,
    }));
    this.state = {
      role: "follower",
      leaderId: null,
      electionDeadline: this.clock.now() + this.randomElectionTimeout(),
    };
  }

  private randomElectionTimeout(): number {
    if (this.prng.nextInt) {
      return this.prng.nextInt(this.electionTimeoutMinMs, this.electionTimeoutMaxMs);
    }
    const span = this.electionTimeoutMaxMs - this.electionTimeoutMinMs;
    return this.electionTimeoutMinMs + Math.floor(this.prng.random() * (span + 1));
  }

  resetElectionTimer(leaderId: NodeId | null = null): void {
    this.state = {
      role: "follower",
      leaderId,
      electionDeadline: this.clock.now() + this.randomElectionTimeout(),
    };
  }

  private becomeFollower(term: number, leaderId: NodeId | null = null): void {
    if (term > this.currentTerm) {
      this.currentTerm = term;
      this.votedFor = null;
    }
    this.resetElectionTimer(leaderId);
  }

  private becomeLeader(): void {
    const nextIndex: Record<NodeId, number> = {};
    const matchIndex: Record<NodeId, number> = {};
    for (const peer of this.peers) {
      nextIndex[peer] = lastIndex(this.log) + 1;
      matchIndex[peer] = 0;
    }
    matchIndex[this.id] = lastIndex(this.log);
    this.state = {
      role: "leader",
      nextIndex,
      matchIndex,
      heartbeatDeadline: this.clock.now(),
    };
    this.broadcastAppendEntries();
  }

  startElection(): void {
    if (this.state.role === "leader") return;
    this.currentTerm++;
    this.votedFor = this.id;
    const votesReceived = [this.id];
    this.state = {
      role: "candidate",
      votesReceived,
      electionDeadline: this.clock.now() + this.randomElectionTimeout(),
    };

    const lastLogIndex = lastIndex(this.log);
    const lastLogTerm = termAt(this.log, lastLogIndex);
    for (const peer of this.peers) {
      this.transport.send(this.id, peer, {
        type: "RequestVote",
        term: this.currentTerm,
        candidateId: this.id,
        lastLogIndex,
        lastLogTerm,
      });
    }
    if (this.hasMajority(votesReceived.length)) this.becomeLeader();
  }

  private hasMajority(votes: number): boolean {
    return votes >= Math.floor((this.peers.length + 1) / 2) + 1;
  }

  tick(): void {
    const now = this.clock.now();
    if (this.state.role === "leader") {
      if (now >= this.state.heartbeatDeadline) {
        this.state.heartbeatDeadline = now + this.heartbeatIntervalMs;
        this.broadcastAppendEntries();
      }
    } else if (now >= this.state.electionDeadline) {
      this.startElection();
    }
  }

  receive(from: NodeId, message: RaftMessage<TCommand>): void {
    if (message.term > this.currentTerm) this.becomeFollower(message.term);

    switch (message.type) {
      case "RequestVote":
        this.handleRequestVote(from, message);
        break;
      case "RequestVoteResponse":
        this.handleRequestVoteResponse(from, message);
        break;
      case "AppendEntries":
        this.handleAppendEntries(from, message);
        break;
      case "AppendEntriesResponse":
        this.handleAppendEntriesResponse(from, message);
        break;
    }
  }

  handleMessage(from: NodeId, message: RaftMessage<TCommand>): void {
    this.receive(from, message);
  }

  private handleRequestVote(from: NodeId, request: RequestVoteRequest): void {
    let voteGranted = false;
    if (request.term === this.currentTerm) {
      const lastLogIndex = lastIndex(this.log);
      const lastLogTerm = termAt(this.log, lastLogIndex);
      const candidateIsUpToDate =
        request.lastLogTerm > lastLogTerm ||
        (request.lastLogTerm === lastLogTerm && request.lastLogIndex >= lastLogIndex);
      if ((this.votedFor === null || this.votedFor === request.candidateId) && candidateIsUpToDate) {
        this.votedFor = request.candidateId;
        voteGranted = true;
        if (this.state.role !== "follower") this.resetElectionTimer(request.candidateId);
        else this.resetElectionTimer(request.candidateId);
      }
    }
    this.transport.send(this.id, from, {
      type: "RequestVoteResponse",
      term: this.currentTerm,
      voteGranted,
    });
  }

  private handleRequestVoteResponse(from: NodeId, response: RequestVoteResponse): void {
    if (response.term > this.currentTerm) {
      this.becomeFollower(response.term);
      return;
    }
    if (
      this.state.role === "candidate" &&
      response.term === this.currentTerm &&
      response.voteGranted
    ) {
      if (!this.state.votesReceived.includes(from)) this.state.votesReceived.push(from);
      if (this.hasMajority(this.state.votesReceived.length)) this.becomeLeader();
    }
  }

  private handleAppendEntries(from: NodeId, request: AppendEntriesRequest<TCommand>): void {
    if (request.term < this.currentTerm) {
      this.transport.send(this.id, from, {
        type: "AppendEntriesResponse",
        term: this.currentTerm,
        success: false,
        matchIndex: lastIndex(this.log),
      });
      return;
    }
    if (request.term === this.currentTerm && this.state.role === "leader") {
      this.becomeFollower(request.term, request.leaderId);
    } else if (request.term >= this.currentTerm) {
      this.becomeFollower(request.term, request.leaderId);
    }

    if (request.prevLogIndex > 0 && termAt(this.log, request.prevLogIndex) !== request.prevLogTerm) {
      const conflictIndex = request.prevLogIndex;
      const conflictTerm = termAt(this.log, conflictIndex);
      this.transport.send(this.id, from, {
        type: "AppendEntriesResponse",
        term: this.currentTerm,
        success: false,
        matchIndex: lastIndex(this.log),
        conflictIndex,
        conflictTerm,
      });
      return;
    }

    for (let i = 0; i < request.entries.length; i++) {
      const incoming = request.entries[i];
      if (!incoming) continue;
      const existing = this.log[incoming.index - 1];
      if (existing && existing.term !== incoming.term) {
        this.log = this.log.slice(0, incoming.index - 1);
      }
      if (!this.log[incoming.index - 1]) {
        this.log.push({ ...incoming, index: incoming.index });
      }
    }

    if (request.leaderCommit > this.commitIndex) {
      this.commitIndex = Math.min(request.leaderCommit, lastIndex(this.log));
      this.applyCommittedEntries();
    }

    this.transport.send(this.id, from, {
      type: "AppendEntriesResponse",
      term: this.currentTerm,
      success: true,
      matchIndex: request.prevLogIndex + request.entries.length,
    });
  }

  private handleAppendEntriesResponse(from: NodeId, response: AppendEntriesResponse): void {
    if (response.term > this.currentTerm) {
      this.becomeFollower(response.term);
      return;
    }
    if (this.state.role !== "leader" || response.term !== this.currentTerm) return;

    if (response.success) {
      this.state.matchIndex[from] = response.matchIndex;
      this.state.nextIndex[from] = response.matchIndex + 1;
      this.advanceCommitIndex();
      return;
    }

    const next = this.state.nextIndex[from] ?? lastIndex(this.log) + 1;
    if (response.conflictTerm !== undefined) {
      let lastWithTerm = 0;
      for (let i = lastIndex(this.log); i > 0; i--) {
        if (termAt(this.log, i) === response.conflictTerm) {
          lastWithTerm = i;
          break;
        }
      }
      this.state.nextIndex[from] = lastWithTerm > 0 ? lastWithTerm + 1 : (response.conflictIndex ?? next - 1);
    } else {
      this.state.nextIndex[from] = Math.max(1, next - 1);
    }
    this.sendAppendEntries(from);
  }

  private advanceCommitIndex(): void {
    if (this.state.role !== "leader") return;
    for (let index = lastIndex(this.log); index > this.commitIndex; index--) {
      if (termAt(this.log, index) !== this.currentTerm) continue;
      let replicated = 1;
      for (const peer of this.peers) {
        if ((this.state.matchIndex[peer] ?? 0) >= index) replicated++;
      }
      if (this.hasMajority(replicated)) {
        this.commitIndex = index;
        this.applyCommittedEntries();
        break;
      }
    }
  }

  private applyCommittedEntries(): void {
    while (this.lastApplied < this.commitIndex) {
      this.lastApplied++;
      const entry = this.log[this.lastApplied - 1];
      if (entry?.index === this.lastApplied) this.applyCommand(entry.command, entry.index, entry.term);
    }
  }

  append(command: TCommand): LogEntry<TCommand> | null {
    if (this.state.role !== "leader") return null;
    const entry: LogEntry<TCommand> = {
      term: this.currentTerm,
      index: lastIndex(this.log) + 1,
      command,
    };
    this.log.push(entry);
    this.state.matchIndex[this.id] = entry.index;
    this.broadcastAppendEntries();
    return entry;
  }

  propose(command: TCommand): LogEntry<TCommand> | null {
    return this.append(command);
  }

  onMessage(from: NodeId, message: RaftMessage<TCommand>): void {
    this.receive(from, message);
  }

  private sendAppendEntries(peer: NodeId): void {
    if (this.state.role !== "leader") return;
    const nextIndex = this.state.nextIndex[peer] ?? lastIndex(this.log) + 1;
    const prevLogIndex = Math.max(0, nextIndex - 1);
    const entries = this.log.filter(entry => entry.index >= nextIndex);
    this.transport.send(this.id, peer, {
      type: "AppendEntries",
      term: this.currentTerm,
      leaderId: this.id,
      prevLogIndex,
      prevLogTerm: termAt(this.log, prevLogIndex),
      entries,
      leaderCommit: this.commitIndex,
    });
  }

  private broadcastAppendEntries(): void {
    if (this.state.role !== "leader") return;
    for (const peer of this.peers) this.sendAppendEntries(peer);
  }

  getState(): {
    role: RaftRoleState["role"];
    currentTerm: number;
    votedFor: NodeId | null;
    commitIndex: number;
    lastApplied: number;
    log: LogEntry<TCommand>[];
  } {
    return {
      role: this.state.role,
      currentTerm: this.currentTerm,
      votedFor: this.votedFor,
      commitIndex: this.commitIndex,
      lastApplied: this.lastApplied,
      log: this.log.map(entry => ({ ...entry })),
    };
  }

  snapshot(): {
    currentTerm: number;
    votedFor: NodeId | null;
    log: LogEntry<TCommand>[];
    commitIndex: number;
    lastApplied: number;
    roleState: RaftRoleState;
  } {
    return {
      currentTerm: this.currentTerm,
      votedFor: this.votedFor,
      log: this.log.map(entry => ({ ...entry })),
      commitIndex: this.commitIndex,
      lastApplied: this.lastApplied,
      roleState: this.state,
    };
  }
}

export function createRaftNode<TCommand = unknown>(
  options: RaftNodeOptions<TCommand>,
): RaftNode<TCommand> {
  return new RaftNode(options);
}

export type RequestVote = RequestVoteRequest;
export type AppendEntries = AppendEntriesRequest;
export type RaftState<TCommand = unknown> = RaftRoleState;
