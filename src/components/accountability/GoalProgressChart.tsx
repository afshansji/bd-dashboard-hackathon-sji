import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Target, CheckCircle2 } from 'lucide-react';
import type { AccountabilityRepGoal } from '@/hooks/useAccountabilityGoals';
import type { AccountabilityTeamGoal } from '@/hooks/useAccountabilityGoals';

interface GoalProgressChartProps {
  goal: AccountabilityRepGoal | AccountabilityTeamGoal;
}

export function GoalProgressChart({ goal }: GoalProgressChartProps) {
  const progressPercentage = goal.target_value > 0
    ? Math.min((goal.current_value / goal.target_value) * 100, 100)
    : 0;

  const remaining = Math.max(goal.target_value - goal.current_value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Progress Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Main Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Overall Progress</span>
              <span className="font-medium">{progressPercentage.toFixed(1)}%</span>
            </div>
            <Progress value={progressPercentage} className="h-3" />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            {/* Current Value */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Current</span>
              </div>
              <div className="text-2xl font-bold text-blue-700">
                {goal.current_value}
              </div>
              <div className="text-xs text-blue-600 mt-1">{goal.target_unit}</div>
            </div>

            {/* Target Value */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-900">Target</span>
              </div>
              <div className="text-2xl font-bold text-green-700">
                {goal.target_value}
              </div>
              <div className="text-xs text-green-600 mt-1">{goal.target_unit}</div>
            </div>

            {/* Remaining */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">Remaining</span>
              </div>
              <div className="text-2xl font-bold text-gray-700">
                {remaining}
              </div>
              <div className="text-xs text-gray-600 mt-1">{goal.target_unit}</div>
            </div>
          </div>

          {/* Goal Details */}
          <div className="space-y-2 pt-4 border-t">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Goal</span>
              <span className="font-medium">{goal.title}</span>
            </div>
            {goal.description && (
              <div className="text-sm text-muted-foreground">
                {goal.description}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

