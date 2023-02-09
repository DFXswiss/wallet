export type StakingAction = 'STAKE' | 'UNSTAKE' | 'DEPOSIT' | 'WITHDRAW';

export function isStake(action: StakingAction): boolean {
  return ['STAKE', 'DEPOSIT'].includes(action);
}
