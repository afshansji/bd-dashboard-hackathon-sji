import { StagePipelineTable } from '@/components/bd/StagePipelineTable';
import { SyncControlTowerButton } from '@/components/bd/SyncControlTowerButton';
import { LastSyncDetails } from '@/components/bd/LastSyncDetails';

export default function Qualification() {
  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Estimation</h1>
          <p className="text-muted-foreground">Qualifying leads and assessing opportunity fit</p>
        </div>
        <SyncControlTowerButton />
      </div>
      
      <LastSyncDetails />
      
      <StagePipelineTable
        stage="qualification"
        title=""
        description=""
      />
    </div>
  );
}
