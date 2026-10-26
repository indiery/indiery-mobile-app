import type { Request } from 'express';
import { ApiError } from './error';
import type { AuthRequest } from './auth';

type Permission =
  | 'dashboard.read'
  | 'orders.read' | 'orders.manage' | 'dispatch.manage'
  | 'drivers.read' | 'drivers.manage' | 'kyc.review' | 'vehicles.read' | 'vehicles.manage'
  | 'customers.read' | 'customers.manage'
  | 'finance.read' | 'finance.manage' | 'wallet.read' | 'wallet.manage' | 'refunds.read' | 'refunds.manage'
  | 'support.read' | 'support.manage' | 'notifications.manage'
  | 'areas.read' | 'areas.manage' | 'settings.manage' | 'audit.read' | 'reports.read'
  | 'b2b.read' | 'b2b.manage' | 'admin.users.read' | 'admin.users.manage';

const rolePermissions: Record<string, ReadonlySet<Permission>> = {
  operations_manager: new Set(['dashboard.read', 'orders.read', 'orders.manage', 'dispatch.manage', 'drivers.read', 'drivers.manage', 'vehicles.read']),
  kyc_executive: new Set(['dashboard.read', 'drivers.read', 'kyc.review']),
  support_executive: new Set(['dashboard.read', 'orders.read', 'customers.read', 'support.read', 'support.manage', 'notifications.manage']),
  finance_manager: new Set(['dashboard.read', 'finance.read', 'finance.manage', 'wallet.read', 'wallet.manage', 'refunds.read', 'refunds.manage', 'reports.read', 'b2b.read', 'b2b.manage']),
  city_manager: new Set()
};

function permissionForRequest(req: Request): Permission | undefined {
  const path = req.path;
  const method = req.method;
  if (path === '/dashboard-snapshot' || path === '/overview') return 'dashboard.read';
  if (path === '/audit-events') return 'audit.read';
  if (path.startsWith('/support-tickets')) return method === 'GET' ? 'support.read' : 'support.manage';
  if (path.startsWith('/account-deletion-requests')) return method === 'GET' ? 'support.read' : 'support.manage';
  if (path.startsWith('/admin-users')) return method === 'GET' ? 'admin.users.read' : 'admin.users.manage';
  if (path.startsWith('/notifications')) return 'notifications.manage';
  if (path.startsWith('/workspace/')) {
    const resource = path.split('/')[2];
    const access: Record<string, [Permission, Permission]> = {
      tickets: ['support.read', 'support.manage'],
      notifications: ['notifications.manage', 'notifications.manage'],
      areas: ['areas.read', 'areas.manage'],
      users: ['admin.users.read', 'admin.users.manage'],
      settings: ['settings.manage', 'settings.manage'],
      audit: ['audit.read', 'audit.read'],
      disputes: ['support.read', 'support.manage']
    };
    return access[resource]?.[method === 'GET' ? 0 : 1];
  }
  if (path.startsWith('/drivers')) {
    if (path.includes('/kyc')) return 'kyc.review';
    return method === 'GET' ? 'drivers.read' : 'drivers.manage';
  }
  if (path.startsWith('/customers')) return method === 'GET' ? 'customers.read' : 'customers.manage';
  if (path.startsWith('/coins')) return method === 'GET' ? 'wallet.read' : 'wallet.manage';
  if (path.startsWith('/finance')) return method === 'GET' ? 'finance.read' : 'finance.manage';
  if (path.startsWith('/vehicles')) return method === 'GET' ? 'vehicles.read' : 'vehicles.manage';
  if (path.startsWith('/b2b') || path.includes('b2b')) return method === 'GET' ? 'b2b.read' : 'b2b.manage';
  if (path.startsWith('/orders')) {
    if (path.endsWith('/assign')) return 'dispatch.manage';
    return method === 'GET' ? 'orders.read' : 'orders.manage';
  }
  if (path.startsWith('/enterprise-enquiries')) return method === 'GET' ? 'b2b.read' : 'b2b.manage';
  return undefined;
}

export function assertAdminPermission(req: AuthRequest) {
  const roleKey = req.auth?.adminRoleKey;
  if (!roleKey) throw new ApiError(403, 'Administrator role is not assigned.');
  if (roleKey === 'super_admin') return;
  if (roleKey === 'city_manager') {
    throw new ApiError(403, 'City-scoped access is not enabled for these operations yet.');
  }
  const permission = permissionForRequest(req);
  if (!permission || !rolePermissions[roleKey]?.has(permission)) {
    throw new ApiError(403, 'Your administrator role does not have permission to perform this action.');
  }
}
