#!/usr/bin/env node
import { RaftNode, type KVCommand, type Transport } from './index.js';
import type { RaftMessage } from '@raft/raft-core';

const args = process.argv.slice(2);
const command = args[0];
const flag = (name: string, fallback?: string) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
};
const request = async (url: string, init?: RequestInit) => {
  const response = await fetch(url, init);
  const data = await response.json();
  if (!response.ok && response.status !== 202) throw new Error(JSON.stringify(data));
  return data;
};
function usage(): never {
  console.error('usage: raft-node start|put|get|status [--url URL] [options]');
  process.exit(2);
}

if (!command) usage();
if (command === 'start') {
  const id = flag('--id', 'node')!;
  const port = Number(flag('--port', '7000'));
  const peers = (flag('--peers', '') ?? '').split(',').filter(Boolean);
  const addresses = new Map(
    peers.map((peer) => {
      const [peerId, address] = peer.split('=', 2);
      return [peerId!, address ?? peer] as const;
    }),
  );
  const transport: Transport<KVCommand> = {
    send: (from, to, message: RaftMessage<KVCommand>) => {
      const address = addresses.get(to) ?? to;
      void fetch(`${address.replace(/\/$/, '')}/raft`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-from': from },
        body: JSON.stringify(message),
      }).catch(() => undefined);
    },
  };
  const walPath = flag('--wal', `./${id}.wal`);
  const node = new RaftNode({
    id,
    peers: [...addresses.keys()],
    ...(walPath ? { walPath } : {}),
    transport,
  });
  await node.start();
  await node.listen(port);
  const interval = setInterval(() => node.tick(), 10);
  const stop = async () => {
    clearInterval(interval);
    await node.close();
    process.exit(0);
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  console.log(`raft node ${id} listening on http://127.0.0.1:${port}`);
} else {
  const url = flag('--url', 'http://127.0.0.1:7000')!;
  if (command === 'put') {
    const key = args[1],
      value = args[2];
    if (!key || value === undefined) usage();
    console.log(
      JSON.stringify(
        await request(`${url}/kv`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ op: 'PUT', key, value, requestId: `cli-${Date.now()}` }),
        }),
      ),
    );
  } else if (command === 'get') {
    const key = args[1];
    if (!key) usage();
    console.log(JSON.stringify(await request(`${url}/kv?key=${encodeURIComponent(key)}`)));
  } else if (command === 'status') {
    console.log(JSON.stringify(await request(`${url}/status`)));
  } else usage();
}
