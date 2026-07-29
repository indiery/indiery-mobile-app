import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateCustomerCoinDebit,
  calculateWaitingCoinDebit,
  customerCanPlaceOrder
} from './customer-coins.service';

test('prepaid waiting charges use available coins and then the credit limit', () => {
  assert.deepEqual(calculateWaitingCoinDebit(20, 10), {
    amount: 10,
    balanceAfter: 10
  });
  assert.deepEqual(calculateWaitingCoinDebit(5, 20), {
    amount: 20,
    balanceAfter: -15
  });
});

test('cancellation charges use the same minus-50 coin limit', () => {
  assert.deepEqual(calculateCustomerCoinDebit(-45, 20), {
    amount: 5,
    balanceAfter: -50
  });
});

test('waiting-charge coin debt never goes below minus 50', () => {
  assert.deepEqual(calculateWaitingCoinDebit(-45, 20), {
    amount: 5,
    balanceAfter: -50
  });
  assert.deepEqual(calculateWaitingCoinDebit(-50, 20), {
    amount: 0,
    balanceAfter: -50
  });
});

test('customers must recharge when their coin balance reaches minus 50', () => {
  assert.equal(customerCanPlaceOrder(-49.99), true);
  assert.equal(customerCanPlaceOrder(-50), false);
  assert.equal(customerCanPlaceOrder(-75), false);
});
