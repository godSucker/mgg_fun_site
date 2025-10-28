import rawMachine from '@/data/simulators/cash/machine.json';

export type CashRewardType = 'entity' | 'hardcurrency' | 'softcurrency';

export interface CashReward {
  rewardId: number;
  amount: number;
  odds: number;
  type: CashRewardType;
  id: string | null;
  picture: string | null;
  isBigwin: boolean;
  isSuperJackpot: boolean;
}

export interface CashMachineDefinition {
  id: string;
  title: string;
  cost: number;
  tokenCost: number;
  rewards: CashReward[];
}

export interface RewardChance extends CashReward {
  chance: number;
  label: string;
}

export const cashMachine: CashMachineDefinition = rawMachine as CashMachineDefinition;

export function getValidRewards(machine: CashMachineDefinition = cashMachine): CashReward[] {
  return machine.rewards.filter((reward) => reward.odds > 0);
}

export function getTotalWeight(machine: CashMachineDefinition = cashMachine): number {
  return getValidRewards(machine).reduce((sum, reward) => sum + reward.odds, 0);
}

export function formatNumber(value: number): string {
  return value.toLocaleString('ru-RU');
}

export function getRewardLabel(reward: CashReward): string {
  if (reward.type === 'hardcurrency') {
    return `${formatNumber(reward.amount)} золота`;
  }
  if (reward.type === 'softcurrency') {
    return `${formatNumber(reward.amount)} серебра`;
  }
  if (reward.picture && reward.picture.includes('jackpot')) {
    return 'Джекпот';
  }
  return 'Неизвестная награда';
}

export function getRewardChance(
  reward: CashReward,
  machine: CashMachineDefinition = cashMachine,
): number {
  const weight = getTotalWeight(machine);
  if (!weight) return 0;
  return reward.odds / weight;
}

export function getRewardWithChance(
  reward: CashReward,
  machine: CashMachineDefinition = cashMachine,
): RewardChance {
  return {
    ...reward,
    label: getRewardLabel(reward),
    chance: getRewardChance(reward, machine),
  };
}

export function spinOnce(
  machine: CashMachineDefinition = cashMachine,
  randomFn: () => number = Math.random,
): CashReward {
  const rewards = getValidRewards(machine);
  if (!rewards.length) {
    throw new Error('Нет доступных наград для симуляции.');
  }

  const totalWeight = getTotalWeight(machine);
  const target = randomFn() * totalWeight;
  let cumulative = 0;

  for (const reward of rewards) {
    cumulative += reward.odds;
    if (target <= cumulative) {
      return reward;
    }
  }

  return rewards[rewards.length - 1];
}

export interface SpinSummary {
  reward: CashReward;
  label: string;
  timestamp: number;
}

export function simulateSpins(
  spins: number,
  machine: CashMachineDefinition = cashMachine,
  randomFn: () => number = Math.random,
): SpinSummary[] {
  const results: SpinSummary[] = [];

  for (let i = 0; i < spins; i += 1) {
    const reward = spinOnce(machine, randomFn);
    results.push({
      reward,
      label: getRewardLabel(reward),
      timestamp: Date.now() + i,
    });
  }

  return results;
}
