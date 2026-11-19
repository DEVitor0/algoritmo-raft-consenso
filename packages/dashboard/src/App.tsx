import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import './App.css';

type Section = 'cluster' | 'kv' | 'chaos' | 'replay' | 'benchmark' | 'consistency' | 'didactic';
// Kept as a type-only compatibility export for unused legacy components.
export type ViewType = 'overview' | 'nodes' | 'logs' | 'metrics' | 'simulation' | 'performance';

interface NodeInfo {
  id: string;
  role?: string;
  state?: string;
  address?: string;
}

interface ClusterSnapshot {
  nodes?: NodeInfo[];
  leaderId?: string | null;
  term?: number;
  commitIndex?: number;
  [key: string]: unknown;
}

const sections: Array<{ id: Section; label: string; icon: string }> = [
  { id: 'cluster', label: 'Cluster', icon: '⌘' },
  { id: 'kv', label: 'KV Console', icon: '▣' },
  { id: 'chaos', label: 'Chaos Lab', icon: '⚡' },
  { id: 'replay', label: 'Replay', icon: '↻' },
  { id: 'benchmark', label: 'Benchmark', icon: '◫' },
  { id: 'consistency', label: 'Consistency', icon: '≡' },
  { id: 'didactic', label: 'Didactic Mode', icon: '?' },
];

const controllerUrl =
  (import.meta.env.VITE_RAFT_CONTROLLER_URL as string | undefined)?.replace(/\/$/, '') || '/api';

async function getCluster(): Promise<ClusterSnapshot> {
  const response = await fetch(`${controllerUrl}/cluster`, {
    headers: { accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`controller respondeu ${response.status}`);
  return response.json() as Promise<ClusterSnapshot>;
}

function EmptyState({ message = 'cluster não está rodando' }: { message?: string }) {
  return (
    <div className="empty-state" role="status">
      <span className="empty-icon">○</span>
      <strong>{message}</strong>
      <p>Inicie o controller e os nós Raft para visualizar dados reais.</p>
    </div>
  );
}

function ClusterPage({
  snapshot,
  refresh,
}: {
  snapshot: ClusterSnapshot | null;
  refresh: () => void;
}) {
  const nodes = snapshot?.nodes ?? [];
  return (
    <>
      <PageHeader
        title="Cluster"
        description="Estado observado diretamente do controller Raft."
        action={<button onClick={refresh}>Atualizar</button>}
      />
      {snapshot ? (
        <div className="stack">
          <div className="metric-grid">
            <Metric label="Nós registrados" value={nodes.length} />
            <Metric label="Líder" value={snapshot.leaderId ?? '—'} />
            <Metric label="Term" value={snapshot.term ?? '—'} />
            <Metric label="Commit index" value={snapshot.commitIndex ?? '—'} />
          </div>
          <section className="panel">
            <h2>Membros</h2>
            {nodes.length ? (
              <NodeTable nodes={nodes} />
            ) : (
              <EmptyState message="nenhum nó reportado pelo controller" />
            )}
          </section>
        </div>
      ) : (
        <EmptyState />
      )}
    </>
  );
}

function NodeTable({ nodes }: { nodes: NodeInfo[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Função</th>
            <th>Estado</th>
            <th>Endereço</th>
          </tr>
        </thead>
        <tbody>
          {nodes.map((node) => (
            <tr key={node.id}>
              <td className="mono">{node.id}</td>
              <td>{node.role ?? '—'}</td>
              <td>
                <span className="status-dot" />
                {node.state ?? '—'}
              </td>
              <td className="mono">{node.address ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">RAFT / OBSERVABILITY</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </header>
  );
}

function SectionPage({ section }: { section: (typeof sections)[number] }) {
  return (
    <>
      <PageHeader
        title={section.label}
        description="Área preparada para dados e comandos do cluster real."
      />
      <EmptyState message="cluster não está rodando" />
    </>
  );
}

function App() {
  const [active, setActive] = useState<Section>('cluster');
  const [snapshot, setSnapshot] = useState<ClusterSnapshot | null>(null);
  const [offline, setOffline] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    try {
      setSnapshot(await getCluster());
      setOffline(false);
      setLastUpdated(new Date());
    } catch {
      setSnapshot(null);
      setOffline(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const activeSection = useMemo(
    () => sections.find((section) => section.id === active) ?? sections[0],
    [active],
  );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">R</span>
          <div>
            <strong>RAFT LAB</strong>
            <small>cluster console</small>
          </div>
        </div>
        <nav aria-label="Seções do dashboard">
          {sections.map((section) => (
            <button
              key={section.id}
              className={section.id === active ? 'nav-item active' : 'nav-item'}
              onClick={() => setActive(section.id)}
            >
              <span>{section.icon}</span>
              {section.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <span className={offline ? 'connection offline' : 'connection'} />
          {offline ? 'Controller offline' : 'Controller conectado'}
          <small>{controllerUrl}</small>
        </div>
      </aside>
      <main className="main-content">
        <div className="topbar">
          <span>Ambiente local</span>
          <span>
            {lastUpdated
              ? `Atualizado ${lastUpdated.toLocaleTimeString()}`
              : 'Aguardando controller'}
          </span>
        </div>
        {active === 'cluster' ? (
          <ClusterPage snapshot={snapshot} refresh={() => void refresh()} />
        ) : (
          <SectionPage section={activeSection} />
        )}
      </main>
    </div>
  );
}

export default App;
