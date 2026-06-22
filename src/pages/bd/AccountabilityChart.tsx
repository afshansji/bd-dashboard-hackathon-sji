import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QuarterSelector } from '@/components/accountability/QuarterSelector';
import { TeamGoalsList } from '@/components/accountability/TeamGoalsList';
import { RepGoalsList } from '@/components/accountability/RepGoalsList';
import { GoalApprovalQueue } from '@/components/accountability/GoalApprovalQueue';
import { useActiveQuarter } from '@/hooks/useAccountabilityQuarters';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Target, Users, CheckSquare, BarChart3 } from 'lucide-react';

export default function AccountabilityChart() {
  const navigate = useNavigate();
  const { user, hasMinimumRole } = useAuth();
  const isManager = hasMinimumRole('manager');
  const { data: activeQuarter } = useActiveQuarter();

  const [selectedQuarter, setSelectedQuarter] = useState<string>(activeQuarter?.id || '');

  // Update selectedQuarter when activeQuarter loads
  if (activeQuarter && !selectedQuarter) {
    setSelectedQuarter(activeQuarter.id);
  }

  const handleGoalClick = (goalId: string) => {
    navigate(`/bd/accountability/${goalId}`);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quarterly Accountability Chart</h1>
          <p className="text-muted-foreground mt-1">
            Track quarterly goals, activities, and weekly progress for the BD team
          </p>
        </div>
        <QuarterSelector value={selectedQuarter} onChange={setSelectedQuarter} />
      </div>

      {!selectedQuarter ? (
        <div className="text-center py-12 text-muted-foreground">
          Please select or create a quarter to get started.
        </div>
      ) : (
        <Tabs defaultValue={isManager ? 'team-goals' : 'my-goals'} className="space-y-6">
          <TabsList>
            <TabsTrigger value="team-goals" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Team Goals
            </TabsTrigger>
            <TabsTrigger value="my-goals" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              My Goals
            </TabsTrigger>
            {isManager && (
              <TabsTrigger value="approvals" className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4" />
                Approvals
              </TabsTrigger>
            )}
            {isManager && (
              <TabsTrigger value="team-progress" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Team Progress
              </TabsTrigger>
            )}
          </TabsList>

          {/* Team Goals Tab */}
          <TabsContent value="team-goals" className="space-y-4">
            <TeamGoalsList quarterId={selectedQuarter} onGoalClick={handleGoalClick} />
          </TabsContent>

          {/* My Goals Tab */}
          <TabsContent value="my-goals" className="space-y-4">
            <RepGoalsList
              quarterId={selectedQuarter}
              repId={user?.id}
              onGoalClick={handleGoalClick}
            />
          </TabsContent>

          {/* Approvals Tab (Managers Only) */}
          {isManager && (
            <TabsContent value="approvals" className="space-y-4">
              <GoalApprovalQueue quarterId={selectedQuarter} />
            </TabsContent>
          )}

          {/* Team Progress Tab (Managers Only) */}
          {isManager && (
            <TabsContent value="team-progress" className="space-y-4">
              <RepGoalsList
                quarterId={selectedQuarter}
                onGoalClick={handleGoalClick}
                showAllReps={true}
              />
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  );
}

