import assert from 'node:assert/strict';
import test from 'node:test';
import { canReceivePartnerOrders } from './partner-wallet-eligibility.service';
import { calculatePartnerWalletSettlement } from './settlement.service';

test('first-time drivers need INR 200 before receiving orders', () => {
  assert.equal(canReceivePartnerOrders(0, false), false);
  assert.equal(canReceivePartnerOrders(190, false), false);
  assert.equal(canReceivePartnerOrders(199.99, false), false);
  assert.equal(canReceivePartnerOrders(200, false), true);
});

test('activated drivers need a positive balance, not INR 200', () => {
  assert.equal(canReceivePartnerOrders(190, true), true);
  assert.equal(canReceivePartnerOrders(0.01, true), true);
  assert.equal(canReceivePartnerOrders(0.001, true), false);
  assert.equal(canReceivePartnerOrders(0, true), false);
  assert.equal(canReceivePartnerOrders(-10, true), false);
  assert.equal(canReceivePartnerOrders(40, true), true);
});

test('a cash delivery can make the wallet negative until the driver recharges', () => {
  const settlement = calculatePartnerWalletSettlement({
    paymentProvider: 'cash',
    customerTotal: 400,
    partnerCredit: 340
  });
  const balanceAfterDelivery = 50 + settlement.walletDelta;
  assert.equal(balanceAfterDelivery, -10);
  assert.equal(canReceivePartnerOrders(balanceAfterDelivery, true), false);
  assert.equal(canReceivePartnerOrders(balanceAfterDelivery + 50, true), true);
});
