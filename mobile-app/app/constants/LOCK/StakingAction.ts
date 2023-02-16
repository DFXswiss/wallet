export type StakingAction = 'Stake' | 'Unstake' | 'Deposit' | 'Withdraw';

export function isStake(action: StakingAction): boolean {
  return ['Stake', 'Deposit'].includes(action);
}
