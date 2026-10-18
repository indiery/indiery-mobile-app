import test from 'node:test';
import assert from 'node:assert/strict';
import { AdminSettingsSchema, resolveRuntimeAdminPolicy } from './admin-settings.service';

test('runtime settings validate operational limits and preserve safe defaults', () => {
  assert.deepEqual(resolveRuntimeAdminPolicy(undefined), {
    maintenanceMode: false,
    autoAssign: true,
    customerCoinDebtLimit: -50,
    maxPickupRadiusKm: undefined,
    version: 0
  });

  const settings = AdminSettingsSchema.parse({
    maintenanceMode: true,
    autoAssign: false,
    autoAssignConfigured: true,
    walletLimit: 125,
    maxPickupRadius: 8,
    reKycDays: '',
    requireTwoFactor: false
  });
  assert.deepEqual(resolveRuntimeAdminPolicy(settings, 7), {
    maintenanceMode: true,
    autoAssign: false,
    customerCoinDebtLimit: -125,
    maxPickupRadiusKm: 8,
    version: 7
  });
});

test('runtime settings reject malformed flags and out-of-range operational limits', () => {
  assert.equal(AdminSettingsSchema.safeParse({ maintenanceMode: 'yes' }).success, false);
  assert.equal(AdminSettingsSchema.safeParse({ maxPickupRadius: 501 }).success, false);
  assert.equal(AdminSettingsSchema.safeParse({ walletLimit: -1 }).success, false);
});

test('legacy false auto-assignment values do not silently disable dispatch', () => {
  assert.equal(resolveRuntimeAdminPolicy({ autoAssign: false }).autoAssign, true);
  assert.equal(resolveRuntimeAdminPolicy({ autoAssign: false, autoAssignConfigured: true }).autoAssign, false);
});
