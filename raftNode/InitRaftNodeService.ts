import { BaseServer } from '@baseServer/core/BaseServer';
import { LogProvider } from '@core/providers/LogProvider';
import { NodeAttributes } from '@raftNode/models/Node';
import { RaftController } from '@core/baseServer/routes/RaftRoute';


export class InitRaftNodeService extends BaseServer implements NodeAttributes {
  currentTerm = 0;
  votedFor: string;

  private ledgerInitLog: LogProvider = new LogProvider(`${this.name} Init`);

  constructor(private basePath: string, name: string, port?: number, version?: string, numOfCpus?: number) { 
    super(name, port, version, numOfCpus); 
  }

  async startServer() {
    try {
      const raftRoute = new RaftController('/raft', this);
      this.setRoutes([raftRoute]);
      this.run();
    } catch (err) {
      this.ledgerInitLog.error(err);
      throw err;
    }
  }
}