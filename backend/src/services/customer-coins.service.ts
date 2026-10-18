export const CUSTOMER_COIN_DEBT_LIMIT = -50;

function roundCoins(value: number) {
  return Number(value.toFixed(2));
}

export function customerCanPlaceOrder(coins: number, debtLimit = CUSTOMER_COIN_DEBT_LIMIT) {
  return coins > debtLimit;
}

export function calculateCustomerCoinDebit(
  balance: number,
  charge: number,
  debtLimit = CUSTOMER_COIN_DEBT_LIMIT
) {
  const safeBalance = Number.isFinite(balance) ? roundCoins(balance) : 0;
  const requestedDebit = Number.isFinite(charge)
    ? roundCoins(Math.max(0, charge))
    : 0;
  const balanceAfter = roundCoins(
    Math.max(debtLimit, safeBalance - requestedDebit)
  );

  return {
    amount: roundCoins(Math.max(0, safeBalance - balanceAfter)),
    balanceAfter
  };
}

export const calculateWaitingCoinDebit = calculateCustomerCoinDebit;
