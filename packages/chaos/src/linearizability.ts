export type LinearOperation =
  | { id: string; key: string; invocation: number; response: number; type: 'put'; value: string }
  | {
      id: string;
      key: string;
      invocation: number;
      response: number;
      type: 'get';
      value: string | undefined;
    }
  | {
      id: string;
      key: string;
      invocation: number;
      response: number;
      type: 'delete';
      value: string | undefined;
    }
  | {
      id: string;
      key: string;
      invocation: number;
      response: number;
      type: 'cas';
      expected: string | null;
      value: string;
      ok: boolean;
    };

export function checkPerKeyLinearizable(
  operations: readonly LinearOperation[],
  initial: ReadonlyMap<string, string | undefined> = new Map(),
): boolean {
  const keys = [...new Set(operations.map((operation) => operation.key))];
  return keys.every((key) => {
    const history = operations.filter((operation) => operation.key === key);
    const start = new Map(initial);
    if (!start.has(key)) start.set(key, undefined);
    return hasLinearExtension(history, start.get(key), new Set());
  });
}

function hasLinearExtension(
  history: readonly LinearOperation[],
  value: string | undefined,
  used: Set<number>,
): boolean {
  if (used.size === history.length) return true;
  for (let i = 0; i < history.length; i++) {
    if (used.has(i)) continue;
    const operation = history[i];
    if (!operation) continue;
    const predecessorsUsed = history.every(
      (candidate, candidateIndex) =>
        used.has(candidateIndex) ||
        candidate.response > operation.invocation ||
        candidateIndex === i,
    );
    if (!predecessorsUsed) continue;
    let ok = true;
    let nextValue = value;
    if (operation.type === 'put') nextValue = operation.value;
    else if (operation.type === 'delete') {
      ok = operation.value === value;
      nextValue = undefined;
    } else if (operation.type === 'get') ok = operation.value === value;
    else {
      ok = ((value ?? null) === operation.expected) === operation.ok;
      if (operation.ok) nextValue = operation.value;
    }
    if (!ok) continue;
    used.add(i);
    if (hasLinearExtension(history, nextValue, used)) return true;
    used.delete(i);
  }
  return false;
}
