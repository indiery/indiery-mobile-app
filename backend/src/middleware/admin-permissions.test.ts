import assert from 'node:assert/strict';
import test from 'node:test';
import type { AuthRequest } from './auth';
import { assertAdminPermission } from './admin-permissions';

function request(roleKey: string, method: string, path: string) {
  return { method, path, auth: { userId: 'admin-user', role: 'admin', adminRoleKey: roleKey } } as unknown as AuthRequest;
}

test('administrator permissions allow only the role’s assigned operations', () => {
  assert.doesNotThrow(() => assertAdminPermission(request('operations_manager', 'POST', '/orders/123/assign')));
  assert.doesNotThrow(() => assertAdminPermission(request('kyc_executive', 'POST', '/drivers/123/kyc')));
  assert.doesNotThrow(() => assertAdminPermission(request('finance_manager', 'POST', '/finance/disburse')));
  assert.doesNotThrow(() => assertAdminPermission(request('support_executive', 'PUT', '/workspace/tickets')));
  assert.doesNotThrow(() => assertAdminPermission(request('support_executive', 'GET', '/support-tickets')));
  assert.doesNotThrow(() => assertAdminPermission(request('support_executive', 'POST', '/support-tickets')));
  assert.doesNotThrow(() => assertAdminPermission(request('support_executive', 'GET', '/account-deletion-requests')));
  assert.doesNotThrow(() => assertAdminPermission(request('support_executive', 'PATCH', '/account-deletion-requests/123')));
  assert.doesNotThrow(() => assertAdminPermission(request('finance_manager', 'GET', '/enterprise-enquiries')));
  assert.doesNotThrow(() => assertAdminPermission(request('finance_manager', 'PATCH', '/enterprise-enquiries/123/status')));

  assert.throws(() => assertAdminPermission(request('kyc_executive', 'POST', '/finance/disburse')), /does not have permission/);
  assert.throws(() => assertAdminPermission(request('support_executive', 'POST', '/orders/123/assign')), /does not have permission/);
  assert.throws(() => assertAdminPermission(request('kyc_executive', 'GET', '/support-tickets')), /does not have permission/);
  assert.throws(() => assertAdminPermission(request('kyc_executive', 'GET', '/enterprise-enquiries')), /does not have permission/);
  assert.throws(() => assertAdminPermission(request('kyc_executive', 'GET', '/account-deletion-requests')), /does not have permission/);
  assert.throws(() => assertAdminPermission(request('city_manager', 'GET', '/orders')), /City-scoped access is not enabled/);
  assert.doesNotThrow(() => assertAdminPermission(request('super_admin', 'DELETE', '/future-admin-resource')));
});
