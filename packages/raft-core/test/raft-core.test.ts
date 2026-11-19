import { describe, expect, it } from "vitest";
import {
  RaftNode,
  type RaftMessage,
  type Transport,
  type Clock,
  type PRNG,
  type NodeId,
  type LogEntry,
} from "../src/index.js";

class TestClock implements Clock {
  time = 0;
  now(): number {
    return this.time;
  }
}

const fixedPrng: PRNG = { random: () => 0.5, nextInt: (min: number) => min };

class TestTransport<T = unknown> implements Transport<T> {
  sent: Array<{ from: NodeId; to: NodeId; message: RaftMessage<T> }> = [];
  send(from: NodeId, to: NodeId, message: RaftMessage<T>): void {
    this.sent.push({ from, to, message });
  }
}

function createNode<T = string>(
  id: string,
  peers: string[],
  clock: TestClock,
  transport: TestTransport<T>,
  initialLog: LogEntry<T>[] = [],
  apply?: (command: T, index: number, term: number) => void,
) {
  const options = {
    id,
    peers,
    clock,
    prng: fixedPrng,
    transport,
    electionTimeoutMinMs: 10,
    electionTimeoutMaxMs: 10,
    heartbeatIntervalMs: 5,
    initialLog,
    ...(apply ? { apply } : {}),
  };
  return new RaftNode<T>(options);
}

function deliver(
  nodes: Record<string, RaftNode<string>>,
  envelope: { from: NodeId; to: NodeId; message: RaftMessage<string> },
) {
  nodes[envelope.to]!.receive(envelope.from, envelope.message);
}

describe("Raft core state machine", () => {
  it("starts an election and becomes leader with a majority", () => {
    const clock = new TestClock();
    const transports = [new TestTransport<string>(), new TestTransport<string>(), new TestTransport<string>()];
    const a = createNode("a", ["a", "b", "c"], clock, transports[0]!);
    const b = createNode("b", ["a", "b", "c"], clock, transports[1]!);
    const c = createNode("c", ["a", "b", "c"], clock, transports[2]!);

    clock.time = 11;
    a.tick();
    expect(a.state.role).toBe("candidate");
    expect(a.currentTerm).toBe(1);

    a.receive("b", {
      type: "RequestVoteResponse",
      term: 1,
      voteGranted: true,
    });
    a.receive("c", {
      type: "RequestVoteResponse",
      term: 1,
      voteGranted: true,
    });

    expect(a.state.role).toBe("leader");
  });

  it("grants votes only to an up-to-date candidate", () => {
    const clock = new TestClock();
    const transport = new TestTransport<string>();
    const node = createNode("b", ["a", "b"], clock, transport, [
      { term: 2, index: 1, command: "x" },
      { term: 2, index: 2, command: "y" },
    ]);

    node.receive("a", {
      type: "RequestVote",
      term: 3,
      candidateId: "a",
      lastLogIndex: 1,
      lastLogTerm: 2,
    });
    expect(transport.sent.at(-1)?.message).toMatchObject({
      type: "RequestVoteResponse",
      term: 3,
      voteGranted: false,
    });

    node.receive("a", {
      type: "RequestVote",
      term: 4,
      candidateId: "a",
      lastLogIndex: 2,
      lastLogTerm: 2,
    });
    expect(transport.sent.at(-1)?.message).toMatchObject({
      type: "RequestVoteResponse",
      voteGranted: true,
    });
  });

  it("replicates, commits only a majority, and applies a current-term entry", () => {
    const clock = new TestClock();
    const ta = new TestTransport<string>();
    const tb = new TestTransport<string>();
    const tc = new TestTransport<string>();
    const applied: string[] = [];
    const a = createNode("a", ["a", "b", "c"], clock, ta, [], (command) => applied.push(command));
    const b = createNode("b", ["a", "b", "c"], clock, tb);
    const c = createNode("c", ["a", "b", "c"], clock, tc);
    const nodes = { a, b, c };

    a.currentTerm = 1;
    a.state = { role: "leader", nextIndex: { b: 1, c: 1 }, matchIndex: { a: 0, b: 0, c: 0 }, heartbeatDeadline: 0 };
    const entry = a.append("set:x");
    expect(entry?.index).toBe(1);

    for (const envelope of ta.sent.splice(0)) deliver(nodes, envelope);
    // Deliver follower AppendEntriesResponses back to the leader.
    for (const envelope of [...tb.sent.splice(0), ...tc.sent.splice(0)]) {
      if (envelope.message.type === "AppendEntriesResponse") deliver(nodes, envelope);
    }

    expect(a.commitIndex).toBe(1);
    expect(a.lastApplied).toBe(1);
    expect(applied).toEqual(["set:x"]);
  });

  it("rejects conflicting AppendEntries and then accepts leader entries", () => {
    const clock = new TestClock();
    const ta = new TestTransport<string>();
    const tb = new TestTransport<string>();
    const leader = createNode("a", ["a", "b"], clock, ta);
    const follower = createNode("b", ["a", "b"], clock, tb, [
      { term: 1, index: 1, command: "old" },
      { term: 2, index: 2, command: "bad" },
    ]);

    follower.receive("a", {
      type: "AppendEntries",
      term: 3,
      leaderId: "a",
      prevLogIndex: 1,
      prevLogTerm: 3,
      entries: [{ term: 3, index: 2, command: "new" }],
      leaderCommit: 2,
    });
    expect(tb.sent.at(-1)?.message).toMatchObject({ type: "AppendEntriesResponse", success: false });

    follower.receive("a", {
      type: "AppendEntries",
      term: 3,
      leaderId: "a",
      prevLogIndex: 1,
      prevLogTerm: 1,
      entries: [{ term: 3, index: 2, command: "new" }],
      leaderCommit: 1,
    });
    expect(follower.log.map((entry: LogEntry<string>) => entry.command)).toEqual(["old", "new"]);
  });

  it("exposes discriminated role state and uses heartbeat/leader state", () => {
    const clock = new TestClock();
    const transport = new TestTransport<string>();
    const node = createNode("a", ["a"], clock, transport);
    node.startElection();
    expect(node.state.role).toBe("leader");
    node.append("heartbeat");
    expect(node.getState().commitIndex).toBe(0);
  });
});
