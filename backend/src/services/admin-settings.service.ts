import { z } from 'zod';
import { AdminWorkspace } from '../models/AdminWorkspace';
import { CUSTOMER_COIN_DEBT_LIMIT } from './customer-coins.service';

const optionalNonNegativeSetting = z.union([
  z.literal(''),
  z.coerce.number().finite().min(0).max(100_000)
]).optional();

export const AdminSettingsSchema = z.object({
  companyName: z.string().max(160).optional(),
  supportEmail: z.union([z.string().email().max(254), z.literal('')]).optional(),
  supportPhone: z.string().max(32).optional(),
  autoAssign: z.boolean().optional(),
  autoAssignConfigured: z.boolean().optional(),
  reKycDays: optionalNonNegativeSetting,
  walletLimit: optionalNonNegativeSetting,
  maxPickupRadius: z.union([z.literal(''), z.coerce.number().finite().min(0).max(500)]).optional(),
  requireTwoFactor: z.boolean().optional(),
  maintenanceMode: z.boolean().optional()
}).passthrough();

export type AdminSettings = z.infer<typeof AdminSettingsSchema>;

export type RuntimeAdminPolicy = {
  maintenanceMode: boolean;
  autoAssign: boolean;
  customerCoinDebtLimit: number;
  maxPickupRadiusKm?: number;
  version: number;
};

const DEFAULT_POLICY: RuntimeAdminPolicy = {
  maintenanceMode: false,
  autoAssign: true,
  customerCoinDebtLimit: CUSTOMER_COIN_DEBT_LIMIT,
  version: 0
};

/**
 * Settings remain uncached so an administrator's saved changes take effect on
 * the next quote/order/dispatch request without waiting for a process restart.
 */
export async function getRuntimeAdminPolicy(): Promise<RuntimeAdminPolicy> {
  const record = await AdminWorkspace.findOne({ key: 'settings' }).lean();
  if (!record) return resolveRuntimeAdminPolicy(undefined);

  return resolveRuntimeAdminPolicy(record.value, record.version ?? 0);
}

export function resolveRuntimeAdminPolicy(value: unknown, version = 0): RuntimeAdminPolicy {
  const parsed = AdminSettingsSchema.safeParse(value ?? {});
  if (!parsed.success) {
    console.error('Stored admin settings failed validation; using safe runtime defaults', parsed.error.flatten());
    return { ...DEFAULT_POLICY, version };
  }

  const settings = parsed.data;
  const configuredDebtLimit = typeof settings.walletLimit === 'number'
    ? -Math.abs(settings.walletLimit)
    : undefined;
  const configuredPickupRadius = typeof settings.maxPickupRadius === 'number' && settings.maxPickupRadius > 0
    ? settings.maxPickupRadius
    : undefined;

  return {
    maintenanceMode: settings.maintenanceMode === true,
    autoAssign: settings.autoAssignConfigured === true
      ? settings.autoAssign === true
      : DEFAULT_POLICY.autoAssign,
    customerCoinDebtLimit: configuredDebtLimit ?? DEFAULT_POLICY.customerCoinDebtLimit,
    maxPickupRadiusKm: configuredPickupRadius,
    version
  };
}
