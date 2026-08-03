export const COIN_TO_SUM = 5000 / 30;

export function coinsToSum(coins: number): string {
  const value = (Number(coins) || 0) * COIN_TO_SUM;
  return Math.round(value).toLocaleString('ru-RU') + ' сум';
}
