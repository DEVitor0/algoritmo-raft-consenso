import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import './App.css';
import {
  BrowserSimulator,
  BROWSER_NODE_IDS,
  type BrowserMessage,
  type BrowserSnapshot,
} from '../../chaos/src/browser';

type Mode = 'simulation' | 'cluster';
type Scenario = 'leader-falls' | 'isolated-leader' | 'majority-loss' | 'high-term';
export type ViewType = 'overview' | 'nodes' | 'logs' | 'metrics' | 'simulation' | 'performance';

interface ClusterNode {
  id: string;
  role: string;
  state: string;
  term: number;
  commitIndex: number;
  lastApplied: number;
  leaderId: string | null;
}

interface ClusterSnapshot {
  nodes: ClusterNode[];
  leaderId: string | null;
  term: number;
  commitIndex: number;
  healthy: boolean;
}

const controllerUrl =
  (import.meta.env.VITE_RAFT_CONTROLLER_URL as string | undefined)?.replace(/\/$/, '') || '/api';

const scenarioText: Record<Scenario, string> = {
  'leader-falls':
    'O líder será parado. Os seguidores deixam de receber heartbeats, iniciam eleições e um novo líder precisa obter maioria.',
  'isolated-leader':
    'O líder ficará isolado por partição. Ele ainda acredita ser líder, mas a maioria elege outro quando o timeout vence.',
  'majority-loss':
    'Três nós serão parados. Os dois restantes não conseguem formar maioria e, por isso, não confirmam novas entradas.',
  'high-term':
    'O laboratório avança a simulação até surgir um termo maior. Observe como mensagens antigas deixam de ser aceitas.',
};

function initialSnapshot(seed: number): BrowserSnapshot {
  return new BrowserSimulator(seed).snapshot();
}

function App() {
  const [mode, setMode] = useState<Mode>('simulation');
  const [seed, setSeed] = useState(42);
  const simulator = useRef(new BrowserSimulator(42));
  const [snapshot, setSnapshot] = useState(() => initialSnapshot(42));
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [cluster, setCluster] = useState<ClusterSnapshot | null>(null);
  const [clusterError, setClusterError] = useState<string | null>(null);
  const [kvKey, setKvKey] = useState('demo');
  const [kvValue, setKvValue] = useState('hello');
  const [kvResult, setKvResult] = useState<string | null>(null);

  const step = useCallback(() => {
    setSnapshot(simulator.current.step());
  }, []);

  useEffect(() => {
    if (!playing || mode !== 'simulation') return;
    const timer = window.setInterval(step, Math.max(50, 500 / speed));
    return () => window.clearInterval(timer);
  }, [mode, playing, speed, step]);

  const refreshCluster = useCallback(async () => {
    try {
      const response = await fetch(`${controllerUrl}/cluster`, {
        headers: { accept: 'application/json' },
      });
      if (!response.ok) throw new Error(`controller respondeu ${response.status}`);
      setCluster((await response.json()) as ClusterSnapshot);
      setClusterError(null);
    } catch (error) {
      setCluster(null);
      setClusterError(error instanceof Error ? error.message : 'controller offline');
    }
  }, []);

  useEffect(() => {
    if (mode !== 'cluster') return;
    void refreshCluster();
    const timer = window.setInterval(() => void refreshCluster(), 1000);
    return () => window.clearInterval(timer);
  }, [mode, refreshCluster]);

  const restartSimulation = () => {
    const parsedSeed = Number.isFinite(seed) ? seed >>> 0 : 42;
    simulator.current = new BrowserSimulator(parsedSeed);
    setSnapshot(simulator.current.snapshot());
    setSelectedNodes([]);
    setScenario(null);
  };

  const toggleNodeSelection = (id: string) => {
    if (selectedNodes.length === 1 && selectedNodes[0] !== id) {
      simulator.current.togglePartition(selectedNodes[0], id);
      setSelectedNodes([]);
      setSnapshot(simulator.current.snapshot());
      return;
    }
    setSelectedNodes(selectedNodes[0] === id ? [] : [id]);
  };

  const toggleNode = (id: string) => {
    simulator.current.toggleNode(id);
    setSelectedNodes([]);
    setSnapshot(simulator.current.snapshot());
  };

  const runScenario = (next: Scenario) => {
    restartSimulation();
    setScenario(next);
    if (next === 'leader-falls') {
      const leader = snapshot.nodes.find((node) => node.role === 'leader')?.id ?? 'n1';
      simulator.current.toggleNode(leader);
    } else if (next === 'isolated-leader') {
      const leader = snapshot.nodes.find((node) => node.role === 'leader')?.id ?? 'n1';
      simulator.current.togglePartition(leader, 'n2');
      simulator.current.togglePartition(leader, 'n3');
      simulator.current.togglePartition(leader, 'n4');
      simulator.current.togglePartition(leader, 'n5');
    } else if (next === 'majority-loss') {
      simulator.current.toggleNode('n3');
      simulator.current.toggleNode('n4');
      simulator.current.toggleNode('n5');
    } else {
      for (let index = 0; index < 60; index++) simulator.current.step();
    }
    setSnapshot(simulator.current.snapshot());
  };

  const sendController = async (path: string, init?: RequestInit) => {
    const response = await fetch(`${controllerUrl}${path}`, {
      ...init,
      headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
    });
    if (!response.ok) throw new Error(`controller respondeu ${response.status}`);
    return response.json();
  };

  const clusterAction = async (path: string, body?: unknown) => {
    try {
      await sendController(
        path,
        body === undefined
          ? { method: 'POST' }
          : {
              method: 'POST',
              body: JSON.stringify(body),
            },
      );
      await refreshCluster();
    } catch (error) {
      setClusterError(error instanceof Error ? error.message : 'ação falhou');
    }
  };

  const submitPut = async () => {
    if (mode === 'simulation') {
      simulator.current.put(kvValue);
      setSnapshot(simulator.current.snapshot());
      setKvResult('PUT proposto ao líder da simulação');
      return;
    }
    try {
      const result = await sendController('/raft/command', {
        method: 'POST',
        body: JSON.stringify({
          command: { op: 'PUT', key: kvKey, value: kvValue, requestId: `dashboard-${Date.now()}` },
        }),
      });
      setKvResult(JSON.stringify(result));
      await refreshCluster();
    } catch (error) {
      setKvResult(error instanceof Error ? error.message : 'PUT falhou');
    }
  };

  const submitGet = async () => {
    if (mode === 'simulation') {
      setKvResult('GET visual: use PUT para criar uma entrada no log da simulação');
      return;
    }
    try {
      const result = await sendController(`/raft/query?key=${encodeURIComponent(kvKey)}`, {
        method: 'GET',
      });
      setKvResult(JSON.stringify(result));
    } catch (error) {
      setKvResult(error instanceof Error ? error.message : 'GET falhou');
    }
  };

  const visibleNodes = mode === 'simulation' ? snapshot.nodes : (cluster?.nodes ?? []);
  const messages = mode === 'simulation' ? snapshot.messages : [];

  return (
    <div className="lab-shell">
      <header className="lab-header">
        <div>
          <p className="eyebrow">RAFT / LABORATÓRIO VISUAL</p>
          <h1>Consenso distribuído, passo a passo</h1>
          <p className="subtitle">
            A simulação é determinística e reproduzível pela seed. O modo cluster consulta dados
            reais do controller.
          </p>
        </div>
        <div className="mode-switch">
          <button
            className={mode === 'simulation' ? 'selected' : ''}
            onClick={() => setMode('simulation')}
          >
            Simulação local
          </button>
          <button
            className={mode === 'cluster' ? 'selected' : ''}
            onClick={() => setMode('cluster')}
          >
            cluster:dev
          </button>
        </div>
      </header>

      <main>
        {mode === 'simulation' ? (
          <SimulationControls
            seed={seed}
            setSeed={setSeed}
            playing={playing}
            setPlaying={setPlaying}
            speed={speed}
            setSpeed={setSpeed}
            step={step}
            reset={restartSimulation}
            scenario={scenario}
            runScenario={runScenario}
          />
        ) : (
          <ClusterControls
            nodes={cluster?.nodes ?? []}
            error={clusterError}
            action={clusterAction}
          />
        )}

        <section className="visual-panel">
          <div className="panel-title">
            <div>
              <h2>{mode === 'simulation' ? 'Rede virtual' : 'Cluster conectado'}</h2>
              <span>
                {mode === 'simulation'
                  ? `seed ${snapshot.seed} · tempo virtual ${snapshot.time} ms`
                  : 'estado observado via API REST'}
              </span>
            </div>
            {mode === 'simulation' && (
              <span className="simulation-badge">SIMULAÇÃO DETERMINÍSTICA</span>
            )}
          </div>
          <div
            className={`network-map ${mode === 'simulation' && snapshot.elections.length ? 'has-election' : ''}`}
          >
            {mode === 'simulation' && snapshot.elections.length > 0 && (
              <div
                className="election-event"
                role="status"
                key={snapshot.elections[snapshot.elections.length - 1].term}
              >
                <span className="event-pulse" />
                <span>
                  eleição observada · termo{' '}
                  {snapshot.elections[snapshot.elections.length - 1].term}
                </span>
              </div>
            )}
            <div className="network-center" aria-hidden="true">
              <span>QUORUM</span>
              <strong>
                {visibleNodes.filter((node) => !('active' in node) || node.active)
                  .filter((node) => !('state' in node) || node.state === 'running').length}
                /5
              </strong>
            </div>
            <MessageLayer messages={messages} />
            {visibleNodes.map((node, index) => (
              <NodeCard
                key={node.id}
                node={node}
                index={index}
                selected={selectedNodes.includes(node.id)}
                onClick={() => mode === 'simulation' && toggleNodeSelection(node.id)}
                onToggle={() => mode === 'simulation' && toggleNode(node.id)}
              />
            ))}
          </div>
          <div className="network-legend" aria-label="Legenda dos estados dos nós">
            <span><i className="legend-dot leader" /> líder</span>
            <span><i className="legend-dot follower" /> follower</span>
            <span><i className="legend-dot offline" /> indisponível</span>
          </div>
          {mode === 'simulation' && (
            <p className="hint">
              Clique em dois nós para cortar/restaurar o link. Duplo clique em um nó para pará-lo ou
              religá-lo.
            </p>
          )}
        </section>

        <div className="lower-grid">
          <section className="panel">
            <div className="panel-title">
              <h2>Console KV</h2>
              <span>comando real na simulação ou no controller</span>
            </div>
            <div className="form-row">
              <input
                value={kvKey}
                onChange={(event) => setKvKey(event.target.value)}
                aria-label="Chave"
                placeholder="chave"
              />
              <input
                value={kvValue}
                onChange={(event) => setKvValue(event.target.value)}
                aria-label="Valor"
                placeholder="valor"
              />
              <button onClick={() => void submitPut()}>PUT</button>
              <button className="secondary" onClick={() => void submitGet()}>
                GET
              </button>
            </div>
            <pre className="result">{kvResult ?? 'nenhuma operação executada'}</pre>
          </section>
          <VerificationPanel snapshot={snapshot} mode={mode} cluster={cluster} />
        </div>
      </main>
    </div>
  );
}

function SimulationControls(props: {
  seed: number;
  setSeed: (value: number) => void;
  playing: boolean;
  setPlaying: (value: boolean) => void;
  speed: number;
  setSpeed: (value: number) => void;
  step: () => void;
  reset: () => void;
  scenario: Scenario | null;
  runScenario: (scenario: Scenario) => void;
}) {
  return (
    <section className="controls panel">
      <div className="control-group">
        <button onClick={() => props.setPlaying(!props.playing)}>
          {props.playing ? 'Pausa' : 'Play'}
        </button>
        <button className="secondary" onClick={props.step}>
          Passo
        </button>
        <button className="secondary" onClick={props.reset}>
          Reiniciar
        </button>
      </div>
      <label>
        Velocidade{' '}
        <input
          type="range"
          min="1"
          max="5"
          value={props.speed}
          onChange={(event) => props.setSpeed(Number(event.target.value))}
        />{' '}
        {props.speed}x
      </label>
      <label>
        Seed{' '}
        <input
          className="seed-input"
          type="number"
          value={props.seed}
          onChange={(event) => props.setSeed(Number(event.target.value))}
        />
      </label>
      <select
        value={props.scenario ?? ''}
        onChange={(event) =>
          event.target.value && props.runScenario(event.target.value as Scenario)
        }
      >
        <option value="">Cenários guiados...</option>
        <option value="leader-falls">Líder cai</option>
        <option value="isolated-leader">Líder isolado</option>
        <option value="majority-loss">Perda de maioria</option>
        <option value="high-term">Nó volta com termo alto</option>
      </select>
      {props.scenario && <span className="scenario-copy">{scenarioText[props.scenario]}</span>}
    </section>
  );
}

function ClusterControls({
  nodes,
  error,
  action,
}: {
  nodes: ClusterNode[];
  error: string | null;
  action: (path: string, body?: unknown) => void;
}) {
  const [partitionNodes, setPartitionNodes] = useState<string[]>([]);
  const togglePartition = (id: string) => {
    const next = partitionNodes.includes(id)
      ? partitionNodes.filter((item) => item !== id)
      : [...partitionNodes, id];
    setPartitionNodes(next);
    if (next.length === 2) {
      void action('/partition', { groups: [[next[0]], [next[1]]] });
      setPartitionNodes([]);
    }
  };
  return (
    <section className="controls panel">
      <div className="control-group">
        <button onClick={() => void action('/cluster/start')}>Iniciar cluster</button>
        <button className="secondary" onClick={() => void action('/heal')}>
          Curar partições
        </button>
      </div>
      <div className="node-actions">
        {nodes.map((node) => (
          <span key={node.id}>
            <button
              className="secondary"
              onClick={() =>
                void action(`/nodes/${node.id}/${node.state === 'running' ? 'stop' : 'start'}`)
              }
            >
              {node.state === 'running' ? 'Parar' : 'Iniciar'} {node.id}
            </button>
            <button className="link-button" onClick={() => togglePartition(node.id)}>
              link
            </button>
          </span>
        ))}
      </div>
      <span className="scenario-copy">
        {error ??
          'Selecione dois links para criar uma partição. Todas as ações chamam o controller real.'}
      </span>
    </section>
  );
}

function NodeCard({
  node,
  index,
  selected,
  onClick,
  onToggle,
}: {
  node: BrowserSnapshot['nodes'][number] | ClusterNode;
  index: number;
  selected: boolean;
  onClick: () => void;
  onToggle: () => void;
}) {
  const angle = (index / 5) * Math.PI * 2 - Math.PI / 2;
  const style = { left: `${50 + Math.cos(angle) * 37}%`, top: `${50 + Math.sin(angle) * 37}%` };
  const role = node.role ?? 'follower';
  const offline =
    ('active' in node && node.active === false) || ('state' in node && node.state === 'stopped');
  const status = offline ? 'offline' : 'online';
  return (
    <button
      className={`node-card role-${role} ${selected ? 'selected-node' : ''} ${offline ? 'offline-node' : ''}`}
      style={style}
      onClick={onClick}
      onDoubleClick={onToggle}
    >
      <div className="node-card-header">
        <strong>{node.id}</strong>
        <span className={`node-status ${status}`} aria-label={`nó ${status}`} />
      </div>
      <span className="node-role">{role}</span>
      <small>
        termo {node.term} · commit {node.commitIndex}
      </small>
      {'log' in node && (
        <div className="log-row">
          {node.log.map((entry) => (
            <i
              key={entry.index}
              className={entry.committed ? 'committed' : 'pending'}
              title={`índice ${entry.index}, termo ${entry.term}`}
            >
              {entry.index}
            </i>
          ))}
        </div>
      )}
    </button>
  );
}

function MessageLayer({ messages }: { messages: BrowserMessage[] }) {
  const point = (id: string) => {
    const index = BROWSER_NODE_IDS.indexOf(id as (typeof BROWSER_NODE_IDS)[number]);
    const angle = (index / 5) * Math.PI * 2 - Math.PI / 2;
    return { x: 50 + Math.cos(angle) * 37, y: 50 + Math.sin(angle) * 37 };
  };
  return (
    <div className="message-layer" aria-label="Mensagens da rede">
      {messages.slice(-20).map((message) => {
        const from = point(message.from);
        const to = point(message.to);
        return (
          <span
            key={message.id}
            className={`message-dot message-${message.status}`}
            style={
              {
                left: `${from.x}%`,
                top: `${from.y}%`,
                '--dx': `${to.x - from.x}%`,
                '--dy': `${to.y - from.y}%`,
              } as CSSProperties
            }
            title={`${message.type}: ${message.from} → ${message.to}`}
          />
        );
      })}
    </div>
  );
}

function VerificationPanel({
  snapshot,
  mode,
  cluster,
}: {
  snapshot: BrowserSnapshot;
  mode: Mode;
  cluster: ClusterSnapshot | null;
}) {
  const invariants =
    mode === 'simulation'
      ? snapshot.invariants
      : {
          atMostOneLeaderPerTerm: Boolean(cluster?.healthy),
          committedLogConsistency: Boolean(cluster?.healthy),
        };
  const elections = mode === 'simulation' ? snapshot.elections : [];
  return (
    <section className="panel verification">
      <div className="panel-title">
        <h2>Verificação</h2>
        <span>
          {mode === 'simulation'
            ? 'invariantes calculadas a cada passo'
            : 'indicadores do controller'}
        </span>
      </div>
      <p className={invariants.atMostOneLeaderPerTerm ? 'pass' : 'fail'}>
        {invariants.atMostOneLeaderPerTerm ? '✔' : '✘'} no máximo um líder por termo
      </p>
      <p className={invariants.committedLogConsistency ? 'pass' : 'fail'}>
        {invariants.committedLogConsistency ? '✔' : '✘'} logs confirmados consistentes
      </p>
      <h3>Linha do tempo das eleições</h3>
      {elections.length ? (
        elections.map((election) => (
          <div className="timeline-row" key={`${election.term}-${election.leaderId}`}>
            termo {election.term} → {election.leaderId}
            <small>{election.at} ms</small>
          </div>
        ))
      ) : (
        <span className="muted">ainda não houve eleição observada</span>
      )}
    </section>
  );
}

export default App;
