export type WeightedItem<T> = {
  item: T;
  weight: number;
};

export const pickWeightedRandom = <T>(
  items: WeightedItem<T>[],
  random: () => number = Math.random,
): T | null => {
  if (items.length === 0) {
    return null;
  }

  const positiveItems = items.map(entry => ({
    item: entry.item,
    weight: Number.isFinite(entry.weight) ? Math.max(entry.weight, 0) : 0,
  }));

  const totalWeight = positiveItems.reduce((sum, entry) => sum + entry.weight, 0);

  if (totalWeight <= 0) {
    const index = Math.floor(random() * positiveItems.length) % positiveItems.length;
    return positiveItems[index]?.item ?? null;
  }

  const target = random() * totalWeight;
  let cumulative = 0;

  for (const entry of positiveItems) {
    cumulative += entry.weight;
    if (target <= cumulative) {
      return entry.item;
    }
  }

  return positiveItems.at(-1)?.item ?? null;
};
