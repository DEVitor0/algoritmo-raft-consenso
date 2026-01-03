import { Request, Response, NextFunction } from 'express';
import { BaseRoute } from '@core/baseServer/core/BaseRoute';
import { InitRaftNodeService } from '@raftNode/InitRaftNodeService';

// Interfaces for complex data structures
interface IRaftMetrics {
  timestamps: string[];
  latency: number[];
  throughput: number[];
  memoryUsage: number[];
  cpuUsage: number[];
  networkIO: number[];
  diskIO: number[];
}

interface NodeState {
  id: string;
  status: 'Leader' | 'Follower' | 'Candidate' | 'Dead' | 'Partitioned';
  lastHeartbeat: number;
  voteCount: number;
  logIndex: number;
  commitIndex: number;
  ip: string;
  port: number;
}

interface LogEntry {
  index: number;
  term: number;
  command: string;
  timestamp: number;
  status: 'Pending' | 'Committed' | 'Applied';
  clientId?: string;
  size?: number;
}

interface ClusterHealth {
  healthy: boolean;
  leaderPresent: boolean;
  quorumSize: number;
  activeNodes: number;
  partitioned: boolean;
  syncStatus: number;
}

export class RaftController extends BaseRoute {
  // Simulated metrics history
  private metrics: IRaftMetrics = {
    timestamps: [],
    latency: [],
    throughput: [],
    memoryUsage: [],
    cpuUsage: [],
    networkIO: [],
    diskIO: []
  };

  private nodes: NodeState[] = [
    { id: 'Node1', status: 'Leader', lastHeartbeat: Date.now(), voteCount: 0, logIndex: 100, commitIndex: 95, ip: '192.168.1.1', port: 5001 },
    { id: 'Node2', status: 'Follower', lastHeartbeat: Date.now(), voteCount: 0, logIndex: 98, commitIndex: 95, ip: '192.168.1.2', port: 5002 },
    { id: 'Node3', status: 'Follower', lastHeartbeat: Date.now(), voteCount: 0, logIndex: 99, commitIndex: 95, ip: '192.168.1.3', port: 5003 },
    { id: 'Node4', status: 'Follower', lastHeartbeat: Date.now(), voteCount: 0, logIndex: 97, commitIndex: 94, ip: '192.168.1.4', port: 5004 },
    { id: 'Node5', status: 'Follower', lastHeartbeat: Date.now(), voteCount: 0, logIndex: 100, commitIndex: 95, ip: '192.168.1.5', port: 5005 }
  ];

  private logs: LogEntry[] = [];
  private requestCounter = 0;
  private electionCount = 0;

  constructor(rootpath: string, private raftNode: InitRaftNodeService) {
    super(rootpath);
    
    // Cluster State Endpoints
    this.router.get('/state', this.getState.bind(this));
    this.router.get('/health', this.getClusterHealth.bind(this));
    this.router.get('/nodes', this.getNodes.bind(this));
    this.router.get('/nodes/:nodeId', this.getNodeDetail.bind(this));
    
    // Logs & Data Endpoints
    this.router.get('/logs', this.getLogs.bind(this));
    this.router.get('/logs/:index', this.getLogEntry.bind(this));
    this.router.post('/logs', this.appendLog.bind(this));
    
    // Metrics Endpoints
    this.router.get('/metrics', this.getMetrics.bind(this));
    this.router.get('/metrics/summary', this.getMetricsSummary.bind(this));
    this.router.get('/metrics/performance', this.getPerformanceMetrics.bind(this));
    
    // Simulation & Control Endpoints
    this.router.post('/simulate/election', this.simulateElection.bind(this));
    this.router.post('/simulate/partition', this.simulateNetworkPartition.bind(this));
    this.router.delete('/simulate/kill/:nodeId', this.killNode.bind(this));
    this.router.post('/simulate/load', this.generateLoad.bind(this));
    this.router.post('/simulate/slowdown', this.simulateSlowdown.bind(this));
    this.router.post('/simulate/reset', this.resetCluster.bind(this));
    
    // Analytics Endpoints
    this.router.get('/analytics/elections', this.getElectionHistory.bind(this));
    this.router.get('/analytics/latency', this.getLatencyAnalysis.bind(this));
    this.router.get('/analytics/consensus', this.getConsensusStats.bind(this));
    
    // Start background processes
    this.startMetricsCollection();
    this.startHeartbeatSimulation();
    this.generateInitialLogs();
  }

  private startMetricsCollection() {
    setInterval(() => {
      const now = new Date().toLocaleTimeString();
      
      // Simulate fluctuating metrics
      const newLatency = Math.random() * 50 + 10; // 10-60ms
      const newThroughput = Math.floor(Math.random() * 1000) + 500; // 500-1500 ops/sec
      const newMemory = Math.random() * 20 + 40; // 40-60%
      const newCpu = Math.random() * 30 + 20; // 20-50%
      const newNetworkIO = Math.random() * 100 + 50; // 50-150 MB/s
      const newDiskIO = Math.random() * 50 + 10; // 10-60 MB/s

      this.metrics.timestamps.push(now);
      this.metrics.latency.push(newLatency);
      this.metrics.throughput.push(newThroughput);
      this.metrics.memoryUsage.push(newMemory);
      this.metrics.cpuUsage.push(newCpu);
      this.metrics.networkIO.push(newNetworkIO);
      this.metrics.diskIO.push(newDiskIO);

      // Keep only last 20 points
      if (this.metrics.timestamps.length > 20) {
        this.metrics.timestamps.shift();
        this.metrics.latency.shift();
        this.metrics.throughput.shift();
        this.metrics.memoryUsage.shift();
        this.metrics.cpuUsage.shift();
        this.metrics.networkIO.shift();
        this.metrics.diskIO.shift();
      }
    }, 2000);
  }

  private startHeartbeatSimulation() {
    setInterval(() => {
      const leader = this.nodes.find(n => n.status === 'Leader');
      this.nodes.forEach(node => {
        if (node.status !== 'Dead') {
          node.lastHeartbeat = Date.now();
          if (leader && node.id !== leader.id) {
            // Followers slightly lag behind leader
            node.logIndex = leader.logIndex - Math.floor(Math.random() * 3);
            node.commitIndex = Math.min(node.logIndex, leader.commitIndex);
          }
        }
      });
    }, 1500);
  }

  private generateInitialLogs() {
    for (let i = 0; i < 30; i++) {
      this.logs.push({
        index: i + 1,
        term: Math.floor(i / 10) + 1,
        command: `SET key_${i} value_${Math.floor(Math.random() * 1000)}`,
        timestamp: Date.now() - (30000 - i * 1000),
        status: i < 25 ? 'Committed' : 'Pending'
      });
    }
  }

  private getState(req: Request, res: Response) {
    const leader = this.nodes.find(n => n.status === 'Leader');
    res.json({
      term: this.raftNode.currentTerm,
      votedFor: this.raftNode.votedFor || null,
      leader: leader ? leader.id : null,
      role: leader ? (leader.id === 'node-1' ? 'Leader' : 'Follower') : 'Candidate',
      commitIndex: leader ? leader.commitIndex : 0,
      lastApplied: leader ? leader.logIndex : 0,
      state: this.nodes.filter(n => n.status !== 'Dead').length >= 3 ? 'Stable' : 'Degraded'
    });
  }

  private getClusterHealth(req: Request, res: Response) {
    const aliveNodes = this.nodes.filter(n => n.status !== 'Dead');
    const leader = this.nodes.find(n => n.status === 'Leader');
    const avgLatency = this.metrics.latency.length > 0 
      ? this.metrics.latency.reduce((a, b) => a + b, 0) / this.metrics.latency.length 
      : 0;

    res.json({
      status: aliveNodes.length >= 3 ? 'Healthy' : 'Degraded',
      totalNodes: this.nodes.length,
      aliveNodes: aliveNodes.length,
      deadNodes: this.nodes.filter(n => n.status === 'Dead').length,
      leader: leader ? leader.id : null,
      currentTerm: this.raftNode.currentTerm,
      avgLatency: avgLatency.toFixed(2),
      commitIndex: leader ? leader.commitIndex : 0
    });
  }

  private getNodes(req: Request, res: Response) {
    res.json(this.nodes);
  }

  private getNodeDetail(req: Request, res: Response) {
    const { nodeId } = req.params;
    const node = this.nodes.find(n => n.id === nodeId);
    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }

    const nodeLogs = this.logs.filter(log => log.index <= node.logIndex);
    res.json({
      ...node,
      logs: nodeLogs.slice(-10), // Last 10 logs
      uptime: node.status !== 'Dead' ? Math.floor((Date.now() - node.lastHeartbeat) / 1000) : 0,
      replicationLag: node.status === 'Leader' ? 0 : Math.max(0, 
        (this.nodes.find(n => n.status === 'Leader')?.logIndex || 0) - node.logIndex
      )
    });
  }

  private getMetrics(req: Request, res: Response) {
    res.json(this.metrics);
  }

  private getMetricsSummary(req: Request, res: Response) {
    const avgLatency = this.metrics.latency.length > 0 
      ? this.metrics.latency.reduce((a, b) => a + b, 0) / this.metrics.latency.length 
      : 0;
    const avgThroughput = this.metrics.throughput.length > 0 
      ? this.metrics.throughput.reduce((a, b) => a + b, 0) / this.metrics.throughput.length 
      : 0;
    const avgMemory = this.metrics.memoryUsage.length > 0 
      ? this.metrics.memoryUsage.reduce((a, b) => a + b, 0) / this.metrics.memoryUsage.length 
      : 0;
    const avgCpu = this.metrics.cpuUsage.length > 0 
      ? this.metrics.cpuUsage.reduce((a, b) => a + b, 0) / this.metrics.cpuUsage.length 
      : 0;

    res.json({
      latency: {
        avg: avgLatency.toFixed(2),
        min: Math.min(...this.metrics.latency).toFixed(2),
        max: Math.max(...this.metrics.latency).toFixed(2),
        current: this.metrics.latency[this.metrics.latency.length - 1]?.toFixed(2) || 0
      },
      throughput: {
        avg: Math.floor(avgThroughput),
        min: Math.min(...this.metrics.throughput),
        max: Math.max(...this.metrics.throughput),
        current: this.metrics.throughput[this.metrics.throughput.length - 1] || 0
      },
      memory: {
        avg: avgMemory.toFixed(2),
        current: this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1]?.toFixed(2) || 0
      },
      cpu: {
        avg: avgCpu.toFixed(2),
        current: this.metrics.cpuUsage[this.metrics.cpuUsage.length - 1]?.toFixed(2) || 0
      }
    });
  }

  private getPerformanceMetrics(req: Request, res: Response) {
    const totalOps = this.metrics.throughput.reduce((a, b) => a + b, 0);
    const avgNetworkIO = this.metrics.networkIO.length > 0
      ? this.metrics.networkIO.reduce((a, b) => a + b, 0) / this.metrics.networkIO.length
      : 0;
    const avgDiskIO = this.metrics.diskIO.length > 0
      ? this.metrics.diskIO.reduce((a, b) => a + b, 0) / this.metrics.diskIO.length
      : 0;

    res.json({
      totalOperations: totalOps,
      averageNetworkIO: avgNetworkIO.toFixed(2),
      averageDiskIO: avgDiskIO.toFixed(2),
      requestsPerSecond: this.metrics.throughput[this.metrics.throughput.length - 1] || 0,
      p95Latency: this.calculatePercentile(this.metrics.latency, 95).toFixed(2),
      p99Latency: this.calculatePercentile(this.metrics.latency, 99).toFixed(2)
    });
  }

  private calculatePercentile(arr: number[], percentile: number): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }

  private getLogs(req: Request, res: Response) {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    
    res.json({
      logs: this.logs.slice(offset, offset + limit),
      total: this.logs.length,
      offset,
      limit
    });
  }

  private getLogEntry(req: Request, res: Response) {
    const { index } = req.params;
    const logIndex = parseInt(index);
    const log = this.logs.find(l => l.index === logIndex);
    
    if (!log) {
      return res.status(404).json({ error: 'Log entry not found' });
    }
    
    res.json(log);
  }

  private appendLog(req: Request, res: Response) {
    const { command } = req.body;
    
    if (!command) {
      return res.status(400).json({ error: 'Command is required' });
    }

    const leader = this.nodes.find(n => n.status === 'Leader');
    if (!leader) {
      return res.status(503).json({ error: 'No leader available' });
    }

    const newLog: LogEntry = {
      index: this.logs.length + 1,
      term: this.raftNode.currentTerm,
      command,
      timestamp: Date.now(),
      status: 'Pending'
    };

    this.logs.push(newLog);
    leader.logIndex = newLog.index;

    // Simulate replication delay
    setTimeout(() => {
      newLog.status = 'Committed';
      leader.commitIndex = newLog.index;
    }, 1000);

    res.json({ success: true, log: newLog });
  }

  private simulateElection(req: Request, res: Response) {
    this.raftNode.currentTerm += 1;
    
    // Reset votes
    this.nodes.forEach(n => {
      n.voteCount = 0;
      if (n.status !== 'Dead') n.status = 'Candidate';
    });
    
    // Simulate voting process
    const aliveNodes = this.nodes.filter(n => n.status !== 'Dead');
    const votes = Math.floor(Math.random() * aliveNodes.length);
    
    if (votes > aliveNodes.length / 2) {
      const newLeader = aliveNodes[Math.floor(Math.random() * aliveNodes.length)];
      newLeader.status = 'Leader';
      newLeader.voteCount = votes;
      
      // Others become followers
      this.nodes.forEach(n => {
        if (n.id !== newLeader.id && n.status !== 'Dead') {
          n.status = 'Follower';
        }
      });
      
      res.json({ 
        success: true, 
        newTerm: this.raftNode.currentTerm, 
        leader: newLeader.id,
        votes,
        message: `Election completed. Leader: ${newLeader.id} with ${votes} votes` 
      });
    } else {
      res.json({
        success: false,
        newTerm: this.raftNode.currentTerm,
        message: 'Split vote - no leader elected. Retry...'
      });
    }
  }

  private simulateNetworkPartition(req: Request, res: Response) {
    const { nodeIds } = req.body;
    
    if (!nodeIds || !Array.isArray(nodeIds)) {
      return res.status(400).json({ error: 'nodeIds array is required' });
    }

    nodeIds.forEach(nodeId => {
      const node = this.nodes.find(n => n.id === nodeId);
      if (node && node.status !== 'Dead') {
        node.status = 'Partitioned';
        node.lastHeartbeat = 0;
      }
    });

    // Auto-recover after 10 seconds
    setTimeout(() => {
      nodeIds.forEach(nodeId => {
        const node = this.nodes.find(n => n.id === nodeId);
        if (node && node.status === 'Partitioned') {
          node.status = 'Follower';
          node.lastHeartbeat = Date.now();
        }
      });
    }, 10000);

    res.json({ 
      success: true, 
      message: `Network partition simulated for nodes: ${nodeIds.join(', ')}. Auto-recovery in 10s` 
    });
  }

  private killNode(req: Request, res: Response) {
    const { nodeId } = req.params;
    const node = this.nodes.find(n => n.id === nodeId);
    
    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }
    
    if (node.status === 'Dead') {
      // Revive node
      node.status = 'Follower';
      node.lastHeartbeat = Date.now();
      res.json({ success: true, action: 'revived', node });
    } else {
      // Kill node
      node.status = 'Dead';
      node.lastHeartbeat = 0;
      
      // If leader died, trigger election
      if (node.status === 'Dead') {
        const remainingNodes = this.nodes.filter(n => n.status !== 'Dead');
        if (remainingNodes.length > 0) {
          const newLeader = remainingNodes[Math.floor(Math.random() * remainingNodes.length)];
          newLeader.status = 'Leader';
        }
      }
      
      res.json({ success: true, action: 'killed', node });
    }
  }

  private generateLoad(req: Request, res: Response) {
    const { duration = 5, intensity = 2000 } = req.body;
    
    const interval = setInterval(() => {
      const lastIdx = this.metrics.throughput.length - 1;
      if (lastIdx >= 0) {
        this.metrics.throughput[lastIdx] += intensity;
      }
    }, 1000);

    setTimeout(() => {
      clearInterval(interval);
    }, duration * 1000);
    
    res.json({ 
      success: true,
      message: `Load generation started (${duration}s spike with ${intensity} ops/s)` 
    });
  }

  private simulateSlowdown(req: Request, res: Response) {
    const { nodeId, duration = 10 } = req.body;
    
    if (!nodeId) {
      return res.status(400).json({ error: 'nodeId is required' });
    }

    const node = this.nodes.find(n => n.id === nodeId);
    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }

    // Simulate slowdown by reducing log replication speed
    const originalLogIndex = node.logIndex;
    const interval = setInterval(() => {
      if (node.logIndex < originalLogIndex + 5) {
        node.logIndex += 0.5; // Slow replication
      }
    }, 2000);

    setTimeout(() => {
      clearInterval(interval);
      node.logIndex = this.nodes.find(n => n.status === 'Leader')?.logIndex || node.logIndex;
    }, duration * 1000);

    res.json({ 
      success: true, 
      message: `Slowdown simulated for ${nodeId} (${duration}s)` 
    });
  }

  private resetCluster(req: Request, res: Response) {
    // Reset all nodes
    this.nodes.forEach((node, idx) => {
      node.status = idx === 0 ? 'Leader' : 'Follower';
      node.lastHeartbeat = Date.now();
      node.voteCount = 0;
      node.logIndex = 25;
      node.commitIndex = 25;
    });

    // Reset term
    this.raftNode.currentTerm = 1;
    this.raftNode.votedFor = null;

    // Reset logs
    this.logs = [];
    this.generateInitialLogs();

    // Reset metrics
    this.metrics = {
      timestamps: [],
      latency: [],
      throughput: [],
      memoryUsage: [],
      cpuUsage: [],
      networkIO: [],
      diskIO: []
    };

    res.json({ success: true, message: 'Cluster reset to initial state' });
  }

  private getElectionHistory(req: Request, res: Response) {
    // Mock election history
    const history = [];
    for (let i = 0; i < 5; i++) {
      history.push({
        term: i + 1,
        winner: `node-${Math.floor(Math.random() * 5) + 1}`,
        votes: Math.floor(Math.random() * 3) + 3,
        timestamp: Date.now() - (5 - i) * 60000,
        duration: Math.floor(Math.random() * 500) + 100
      });
    }
    res.json(history);
  }

  private getLatencyAnalysis(req: Request, res: Response) {
    const latencies = this.metrics.latency;
    
    if (latencies.length === 0) {
      return res.json({ error: 'No latency data available' });
    }

    const sorted = [...latencies].sort((a, b) => a - b);
    
    res.json({
      min: sorted[0].toFixed(2),
      max: sorted[sorted.length - 1].toFixed(2),
      avg: (sorted.reduce((a, b) => a + b, 0) / sorted.length).toFixed(2),
      median: sorted[Math.floor(sorted.length / 2)].toFixed(2),
      p50: this.calculatePercentile(latencies, 50).toFixed(2),
      p90: this.calculatePercentile(latencies, 90).toFixed(2),
      p95: this.calculatePercentile(latencies, 95).toFixed(2),
      p99: this.calculatePercentile(latencies, 99).toFixed(2),
      stdDev: this.calculateStdDev(latencies).toFixed(2)
    });
  }

  private calculateStdDev(arr: number[]): number {
    if (arr.length === 0) return 0;
    const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
    const variance = arr.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / arr.length;
    return Math.sqrt(variance);
  }

  private getConsensusStats(req: Request, res: Response) {
    const leader = this.nodes.find(n => n.status === 'Leader');
    const aliveNodes = this.nodes.filter(n => n.status !== 'Dead');
    const committedLogs = this.logs.filter(l => l.status === 'Committed').length;
    const pendingLogs = this.logs.filter(l => l.status === 'Pending').length;

    res.json({
      currentTerm: this.raftNode.currentTerm,
      leader: leader ? leader.id : null,
      quorumSize: Math.floor(this.nodes.length / 2) + 1,
      clusterSize: this.nodes.length,
      aliveNodes: aliveNodes.length,
      committedLogs,
      pendingLogs,
      commitIndex: leader ? leader.commitIndex : 0,
      consensusHealth: aliveNodes.length >= 3 ? 'Healthy' : 'At Risk',
      replicationFactor: aliveNodes.length,
      avgReplicationLag: this.calculateAvgReplicationLag()
    });
  }

  private calculateAvgReplicationLag(): number {
    const leader = this.nodes.find(n => n.status === 'Leader');
    if (!leader) return 0;

    const followers = this.nodes.filter(n => n.status === 'Follower');
    if (followers.length === 0) return 0;

    const totalLag = followers.reduce((sum, f) => sum + (leader.logIndex - f.logIndex), 0);
    return totalLag / followers.length;
  }

  async validateRoute(req: Request, res: Response, next: NextFunction): Promise<boolean> { return true; }
  async performRouteAction(opts: any, req: Request, res: Response, next: NextFunction): Promise<any> { return true; }
}
