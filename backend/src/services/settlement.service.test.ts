import assert from 'node:assert/strict';
import test from 'node:test';
import { calculatePartnerWalletSettlement } from './settlement.service';

test('credits the full driver entitlement for online and coin-funded orders', () => {
  for (const scenario of [
    { name: 'online without coins', paymentProvider: 'razorpay', customerTotal: 100 },
    { name: 'online with 50 coins', paymentProvider: 'razorpay', customerTotal: 50 },
    { name: 'fully coin-funded', paymentProvider: 'wallet', customerTotal: 0 }
  ]) {
    const settlement = calculatePartnerWalletSettlement({
      paymentProvider: scenario.paymentProvider,
      customerTotal: scenario.customerTotal,
      partnerCredit: 85
    });

    assert.equal(settlement.cashCollected, 0, scenario.name);
    assert.equal(settlement.walletDelta, 85, scenario.name);
    assert.equal(settlement.ledgerKind, 'credit', scenario.name);
    assert.equal(settlement.ledgerAmount, 85, scenario.name);
  }
});

test('deducts only the difference between cash collected and driver entitlement', () => {
  const withoutCoins = calculatePartnerWalletSettlement({
    paymentProvider: 'cash',
    customerTotal: 100,
    partnerCredit: 85
  });
  assert.deepEqual(withoutCoins, {
    partnerCredit: 85,
    cashCollected: 100,
    walletDelta: -15,
    ledgerAmount: 15,
    ledgerKind: 'debit'
  });

  const withFiftyCoins = calculatePartnerWalletSettlement({
    paymentProvider: 'cash',
    customerTotal: 50,
    partnerCredit: 85
  });
  assert.deepEqual(withFiftyCoins, {
    partnerCredit: 85,
    cashCollected: 50,
    walletDelta: 35,
    ledgerAmount: 35,
    ledgerKind: 'credit'
  });
});

test('handles full coins, waiting charges, and late cash delivery consistently', () => {
  const fullCoins = calculatePartnerWalletSettlement({
    paymentProvider: 'cash',
    customerTotal: 0,
    partnerCredit: 85
  });
  assert.equal(fullCoins.walletDelta, 85);
  assert.equal(fullCoins.ledgerKind, 'credit');

  const waitingCharge = calculatePartnerWalletSettlement({
    paymentProvider: 'cash',
    customerTotal: 110,
    partnerCredit: 93.5
  });
  assert.equal(waitingCharge.walletDelta, -16.5);
  assert.equal(waitingCharge.ledgerKind, 'debit');

  const lateDelivery = calculatePartnerWalletSettlement({
    paymentProvider: 'cash',
    customerTotal: 100,
    partnerCredit: 76
  });
  assert.equal(lateDelivery.walletDelta, -24);
  assert.equal(lateDelivery.ledgerKind, 'debit');
});

test('creates no wallet ledger movement when cash exactly equals driver entitlement', () => {
  const settlement = calculatePartnerWalletSettlement({
    paymentProvider: 'cash',
    customerTotal: 85,
    partnerCredit: 85
  });

  assert.equal(settlement.walletDelta, 0);
  assert.equal(settlement.ledgerAmount, 0);
  assert.equal(settlement.ledgerKind, undefined);
});
