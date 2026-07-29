export const CUSTOMER_COIN_DEBT_LIMIT = -50;

function roundCoins(value: number) {
  return Number(value.toFixed(2));
}

export function customerCanPlaceOrder(coins: number) {
  return coins > CUSTOMER_COIN_DEBT_LIMIT;
}

export function calculateCustomerCoinDebit(balance: number, charge: number) {
  const safeBalance = Number.isFinite(balance) ? roundCoins(balance) : 0;
  const requestedDebit = Number.isFinite(charge)
    ? roundCoins(Math.max(0, charge))
    : 0;
  const balanceAfter = roundCoins(
    Math.max(CUSTOMER_COIN_DEBT_LIMIT, safeBalance - requestedDebit)
  );

  return {
    amount: roundCoins(Math.max(0, safeBalance - balanceAfter)),
    balanceAfter
  };
}

export const calculateWaitingCoinDebit = calculateCustomerCoinDebit;
