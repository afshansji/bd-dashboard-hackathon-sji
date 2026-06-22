export const DEAL_STAGES = {
  PROSPECTING: 'prospecting',
  QUALIFICATION: 'qualification',
  PROPOSAL: 'proposal',
  NEGOTIATION: 'negotiation',
  CLOSED_WON: 'closed_won',
  CLOSED_LOST: 'closed_lost',
} as const;

type StageValue = typeof DEAL_STAGES[keyof typeof DEAL_STAGES];

export const DEAL_STATUSES = {
  ACTIVE: 'active',
  WON: 'won',
  LOST: 'lost',
  ON_HOLD: 'on_hold',
} as const;

type StatusValue = typeof DEAL_STATUSES[keyof typeof DEAL_STATUSES];

export const STAGE_LABELS: Record<StageValue, string> = {
  [DEAL_STAGES.PROSPECTING]: 'Lead',
  [DEAL_STAGES.QUALIFICATION]: 'Discovery',
  [DEAL_STAGES.PROPOSAL]: 'Estimation',
  [DEAL_STAGES.NEGOTIATION]: 'Proposal Shared',
  [DEAL_STAGES.CLOSED_WON]: 'Closed Won',
  [DEAL_STAGES.CLOSED_LOST]: 'Lost',
};

export const STAGE_COLORS: Record<StageValue, string> = {
  [DEAL_STAGES.PROSPECTING]: 'bg-slate-100 text-slate-700',
  [DEAL_STAGES.QUALIFICATION]: 'bg-blue-100 text-blue-700',
  [DEAL_STAGES.PROPOSAL]: 'bg-purple-100 text-purple-700',
  [DEAL_STAGES.NEGOTIATION]: 'bg-orange-100 text-orange-700',
  [DEAL_STAGES.CLOSED_WON]: 'bg-green-100 text-green-700',
  [DEAL_STAGES.CLOSED_LOST]: 'bg-red-100 text-red-700',
};

export const STATUS_LABELS: Record<StatusValue, string> = {
  [DEAL_STATUSES.ACTIVE]: 'Active',
  [DEAL_STATUSES.WON]: 'Won',
  [DEAL_STATUSES.LOST]: 'Lost',
  [DEAL_STATUSES.ON_HOLD]: 'On Hold',
};

export const STATUS_BADGE_VARIANTS: Record<StatusValue, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  [DEAL_STATUSES.ACTIVE]: 'secondary',
  [DEAL_STATUSES.WON]: 'default',
  [DEAL_STATUSES.LOST]: 'destructive',
  [DEAL_STATUSES.ON_HOLD]: 'outline',
};

export function getStageProgress(stage: StageValue | null | undefined): number {
  if (!stage) return 0;
  const stageOrder = Object.values(DEAL_STAGES);
  const index = stageOrder.indexOf(stage);
  if (index === -1) return 0;
  return ((index + 1) / stageOrder.length) * 100;
}

export function getNextStage(currentStage: StageValue | null | undefined): StageValue | null {
  if (!currentStage) return null;
  const stages = Object.values(DEAL_STAGES);
  const currentIndex = stages.indexOf(currentStage);
  if (currentIndex === -1 || currentIndex >= stages.length - 1) {
    return null;
  }
  return stages[currentIndex + 1];
}

export type DealStage = StageValue;
export type DealStatus = StatusValue;
