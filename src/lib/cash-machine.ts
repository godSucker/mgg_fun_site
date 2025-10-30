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
  icon: string;
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

const GOLD_REWARD_AMOUNTS = new Set([
  30,
  40,
  50,
  80,
  100,
  200,
  500,
  1000,
  2000,
  5000,
]);

const SILVER_REWARD_AMOUNTS = new Set([50000]);

function buildCashIcon(prefix: 'g' | 's', amount: number): string {
  return `/cash/${prefix}${amount}.png`;
}

function getGoldRewardIcon(amount: number): string {
  if (GOLD_REWARD_AMOUNTS.has(amount)) {
    return buildCashIcon('g', amount);
  }

  return getCurrencyIcon('hardcurrency');
}

function getSilverRewardIcon(amount: number): string {
  if (SILVER_REWARD_AMOUNTS.has(amount)) {
    return buildCashIcon('s', amount);
  }

  return getCurrencyIcon('softcurrency');
}

export function getCurrencyIcon(currency: 'hardcurrency' | 'softcurrency'): string {
  return currency === 'hardcurrency'
    ? '/cash/hardcurrency.png'
    : '/cash/softcurrency.png';
}

export function getRewardIcon(reward: CashReward): string {
  if (reward.type === 'hardcurrency') {
    return getGoldRewardIcon(reward.amount);
  }

  if (reward.type === 'softcurrency') {
    return getSilverRewardIcon(reward.amount);
  }

  if (reward.type === 'entity') {
    return '/cash/jackpot.png';
  }

  return '/cash/unknown.png';
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
    icon: getRewardIcon(reward),
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
  icon: string;
}

export interface RewardAggregate {
  reward: CashReward;
  label: string;
  count: number;
  totalAmount: number;
  icon: string;
}

export interface MachineSimulation {
  spins: number;
  goldWon: number;
  silverWon: number;
  breakdown: RewardAggregate[];
  history: SpinSummary[];
}

export interface SimulationOptions {
  historySize?: number;
  randomFn?: () => number;
  batchSize?: number;
  onProgress?: (completed: number, total: number) => void;
  signal?: AbortSignal;
}

interface SimulationContext {
  weightedRewards: { reward: CashReward; cumulative: number }[];
  totalWeight: number;
  rewardMap: Map<number, RewardAggregate>;
  totalGoldWon: number;
  totalSilverWon: number;
  historyBuffer: SpinSummary[];
  historySize: number;
  historyCount: number;
  lastHistoryIndex: number;
  baseTimestamp: number;
}

function createSimulationContext(
  spins: number,
  machine: CashMachineDefinition,
  options: SimulationOptions,
): SimulationContext {
  const { historySize = 12 } = options;
  const rewards = getValidRewards(machine);
  if (!rewards.length) {
    throw new Error('Нет доступных наград для симуляции.');
  }

  const totalWeight = getTotalWeight(machine);
  const weightedRewards = [] as { reward: CashReward; cumulative: number }[];
  let cumulativeWeight = 0;
  for (const reward of rewards) {
    cumulativeWeight += reward.odds;
    weightedRewards.push({ reward, cumulative: cumulativeWeight });
  }

  const historyBuffer: SpinSummary[] = historySize > 0 ? new Array(historySize) : [];

  return {
    weightedRewards,
    totalWeight,
    rewardMap: new Map<number, RewardAggregate>(),
    totalGoldWon: 0,
    totalSilverWon: 0,
    historyBuffer,
    historySize,
    historyCount: 0,
    lastHistoryIndex: -1,
    baseTimestamp: Date.now(),
  };
}

function recordSpin(
  ctx: SimulationContext,
  machine: CashMachineDefinition,
  index: number,
  randomFn: () => number,
): void {
  const { weightedRewards, totalWeight } = ctx;
  const target = randomFn() * totalWeight;
  let selected: CashReward | null = null;

  for (const weighted of weightedRewards) {
    if (target <= weighted.cumulative) {
      selected = weighted.reward;
      break;
    }
  }

  const reward = selected ?? weightedRewards[weightedRewards.length - 1].reward;
  const label = getRewardLabel(reward);
  const icon = getRewardIcon(reward);
  let entry = ctx.rewardMap.get(reward.rewardId);

  if (!entry) {
    entry = {
      reward,
      label,
      count: 0,
      totalAmount: 0,
      icon,
    };
    ctx.rewardMap.set(reward.rewardId, entry);
  }

  entry.count += 1;
  entry.totalAmount += reward.amount;

  if (reward.type === 'hardcurrency') {
    ctx.totalGoldWon += reward.amount;
  } else if (reward.type === 'softcurrency') {
    ctx.totalSilverWon += reward.amount;
  }

  if (ctx.historySize > 0) {
    const summary: SpinSummary = {
      reward,
      label,
      timestamp: ctx.baseTimestamp + index,
      icon,
    };
    const slot = index % ctx.historySize;
    ctx.historyBuffer[slot] = summary;
    ctx.lastHistoryIndex = slot;
    if (ctx.historyCount < ctx.historySize) {
      ctx.historyCount += 1;
    }
  }
}

function finalizeSimulation(ctx: SimulationContext, spins: number): MachineSimulation {
  const breakdown = Array.from(ctx.rewardMap.values()).sort((a, b) => {
    if (b.count !== a.count) {
      return b.count - a.count;
    }
    return b.totalAmount - a.totalAmount;
  });

  const history: SpinSummary[] = [];
  for (let i = 0; i < ctx.historyCount; i += 1) {
    const index = (ctx.lastHistoryIndex - i + ctx.historySize) % ctx.historySize;
    const entry = ctx.historyBuffer[index];
    if (entry) {
      history.push(entry);
    }
  }

  return {
    spins,
    goldWon: ctx.totalGoldWon,
    silverWon: ctx.totalSilverWon,
    breakdown,
    history,
  };
}

export function simulateMachine(
  spins: number,
  machine: CashMachineDefinition = cashMachine,
  options: SimulationOptions = {},
): MachineSimulation {
  const { randomFn = Math.random } = options;
  const ctx = createSimulationContext(spins, machine, options);

  for (let i = 0; i < spins; i += 1) {
    recordSpin(ctx, machine, i, randomFn);
  }

  return finalizeSimulation(ctx, spins);
}

export function simulateSpins(
  spins: number,
  machine: CashMachineDefinition = cashMachine,
  randomFn: () => number = Math.random,
): SpinSummary[] {
  const results: SpinSummary[] = [];
  const baseTimestamp = Date.now();

  for (let i = 0; i < spins; i += 1) {
    const reward = spinOnce(machine, randomFn);
    results.push({
      reward,
      label: getRewardLabel(reward),
      timestamp: baseTimestamp + i,
      icon: getRewardIcon(reward),
    });
  }

  return results;
}

export async function simulateMachineAsync(
  spins: number,
  machine: CashMachineDefinition = cashMachine,
  options: SimulationOptions = {},
): Promise<MachineSimulation> {
  const { randomFn = Math.random, batchSize = 2000, onProgress, signal } = options;
  const ctx = createSimulationContext(spins, machine, options);

  let completed = 0;

  while (completed < spins) {
    if (signal?.aborted) {
      throw new DOMException('Симуляция остановлена', 'AbortError');
    }

    const batchEnd = Math.min(completed + batchSize, spins);
    for (let i = completed; i < batchEnd; i += 1) {
      recordSpin(ctx, machine, i, randomFn);
    }

    completed = batchEnd;
    onProgress?.(completed, spins);

    if (completed < spins) {
      await new Promise((resolve) => setTimeout(resolve));
    }
  }

  return finalizeSimulation(ctx, spins);
}
