import { StagePipelineTable } from '@/components/bd/StagePipelineTable';
import { SyncControlTowerButton } from '@/components/bd/SyncControlTowerButton';
import { LastSyncDetails } from '@/components/bd/LastSyncDetails';

export default function Proposal() {
  return (
    <div className="container mx-auto py-8 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Discovery</h1>
          <p className="text-muted-foreground">Preparing and presenting proposals to qualified prospects</p>
        </div>
        <SyncControlTowerButton />
      </div>
      <LastSyncDetails />
      <StagePipelineTable
        stage="proposal"
        title=""
        description=""
      />
    </div>
  );
}
