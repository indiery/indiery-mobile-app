import mongoose from 'mongoose';
import { connectMongo } from '../db/mongoose';
import { User } from '../models/User';
import { Order } from '../models/Order';
import { WalletLedger } from '../models/WalletLedger';
import { B2bClient } from '../models/B2bClient';
import { AdminWorkspace } from '../models/AdminWorkspace';

const demoPhones = [
  '+91 98765 01001',
  '+91 98765 01002',
  '+91 98765 01003',
  '+91 98765 01004',
  '+91 98765 01005',
  '+91 99999 12345'
];

const demoOrderNumbers = ['IND-90214', 'IND-90215', 'IND-90216'];
const demoBusinessNames = [
  'Reliance Retail Logistics',
  'Blinkit Darkstore Gomti Nagar',
  'Apollo Pharmacy Central Distribution'
];

const seededWorkspaceIds: Record<string, Set<string>> = {
  tickets: new Set(['TKT-1042', 'TKT-1041', 'TKT-1039']),
  notifications: new Set(['NTF-301', 'NTF-300', 'NTF-299']),
  areas: new Set(['lko-central', 'lko-east', 'lko-west']),
  users: new Set(['ADM-001', 'ADM-002', 'ADM-003']),
  audit: new Set(['AUD-9028', 'AUD-9027', 'AUD-9026'])
};

async function removeSeededWorkspaceRows() {
  let modified = 0;
  for (const [key, ids] of Object.entries(seededWorkspaceIds)) {
    const resource = await AdminWorkspace.findOne({ key }).lean();
    if (!resource || !Array.isArray(resource.value)) continue;
    const cleaned = resource.value.filter((item: unknown) => {
      if (!item || typeof item !== 'object') return true;
      return !ids.has(String((item as { id?: unknown }).id ?? ''));
    });
    if (cleaned.length !== resource.value.length) {
      await AdminWorkspace.updateOne({ key }, { $set: { value: cleaned } });
      modified += resource.value.length - cleaned.length;
    }
  }
  return modified;
}

async function removeDemoObjectEntries(key: string, demoUserIds: Set<string>) {
  const resource = await AdminWorkspace.findOne({ key }).lean();
  if (!resource?.value || typeof resource.value !== 'object' || Array.isArray(resource.value)) return 0;
  const entries = Object.entries(resource.value as Record<string, unknown>);
  const cleaned = Object.fromEntries(entries.filter(([id]) => !demoUserIds.has(id)));
  if (Object.keys(cleaned).length === entries.length) return 0;
  await AdminWorkspace.updateOne({ key }, { $set: { value: cleaned } });
  return entries.length - Object.keys(cleaned).length;
}

async function main() {
  await connectMongo();

  const [demoUsers, demoBusinesses] = await Promise.all([
    User.find({ phone: { $in: demoPhones } }).select('_id').lean(),
    B2bClient.find({ companyName: { $in: demoBusinessNames } }).select('_id').lean()
  ]);
  const demoUserIds = demoUsers.map((user) => user._id);
  const demoBusinessIds = demoBusinesses.map((client) => client._id);
  const demoUserIdStrings = new Set(demoUserIds.map(String));

  const [orders, ledger, deletionRequests, users, businesses, generatedDocuments] = await Promise.all([
    Order.deleteMany({
      $or: [
        { orderNo: { $in: demoOrderNumbers } },
        { customer: { $in: demoUserIds } },
        { partner: { $in: demoUserIds } },
        { b2bClient: { $in: demoBusinessIds } }
      ]
    }),
    WalletLedger.deleteMany({ user: { $in: demoUserIds } }),
    mongoose.connection.collection('accountdeletionrequests').deleteMany({ user: { $in: demoUserIds } }),
    User.deleteMany({ _id: { $in: demoUserIds } }),
    B2bClient.deleteMany({ _id: { $in: demoBusinessIds } }),
    User.updateMany(
      {
        $or: [
          { 'partnerProfile.docUrls.selfie': { $regex: '/assets/generated/' } },
          { 'partnerProfile.docUrls.pan': { $regex: '/assets/generated/' } },
          { 'partnerProfile.docUrls.aadhaar': { $regex: '/assets/generated/' } },
          { 'partnerProfile.docUrls.drivingLicence': { $regex: '/assets/generated/' } },
          { 'partnerProfile.docUrls.rc': { $regex: '/assets/generated/' } },
          { 'partnerProfile.docUrls.insurance': { $regex: '/assets/generated/' } },
          { 'partnerProfile.docUrls.bank': { $regex: '/assets/generated/' } }
        ]
      },
      { $unset: { 'partnerProfile.docUrls': '', 'partnerProfile.docs': '' } }
    )
  ]);

  const [workspaceRows, customerOverrides, disputes, oldPricing, oldSettings] = await Promise.all([
    removeSeededWorkspaceRows(),
    removeDemoObjectEntries('customer-overrides', demoUserIdStrings),
    removeDemoObjectEntries('disputes', demoUserIdStrings),
    AdminWorkspace.deleteMany({ key: 'pricing' }),
    AdminWorkspace.deleteMany({
      key: 'settings',
      $or: [
        { 'value.supportPhone': '+91 90000 00000' },
        { 'value.companyName': 'Indiery Logistics Private Limited' }
      ]
    })
  ]);

  console.log(JSON.stringify({
    deletedOrders: orders.deletedCount,
    deletedWalletEntries: ledger.deletedCount,
    deletedAccountDeletionRequests: deletionRequests.deletedCount,
    deletedUsers: users.deletedCount,
    deletedBusinesses: businesses.deletedCount,
    clearedGeneratedDocumentProfiles: generatedDocuments.modifiedCount,
    removedSeededWorkspaceRows: workspaceRows,
    removedDemoCustomerOverrides: customerOverrides,
    removedDemoDisputes: disputes,
    removedLegacyPricingWorkspaces: oldPricing.deletedCount,
    removedSeededSettingsWorkspaces: oldSettings.deletedCount
  }));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
