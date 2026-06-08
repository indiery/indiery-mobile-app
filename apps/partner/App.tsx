import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { io, Socket } from 'socket.io-client';
import { Ionicons } from '@expo/vector-icons';
import {
  colors,
  IndieryApi,
  legalPolicies,
  LegalPolicy,
  money,
  Order,
  PartnerBootstrap,
  statusLabels,
  uploadFileToCloudinary,
  UserProfile
} from '@indiery/shared';

declare const process: { env?: Record<string, string | undefined> };

const apiBaseUrl =
  process?.env?.EXPO_PUBLIC_API_URL ||
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ||
  'http://localhost:4000/api';

const socketUrl = apiBaseUrl.replace(/\/api\/?$/, '');

type Tab = 'dashboard' | 'orders' | 'active' | 'earnings' | 'kyc';
type KycDoc = 'selfie' | 'pan' | 'drivingLicence' | 'rc' | 'insurance' | 'bank';

export default function App() {
  const api = useMemo(() => new IndieryApi(apiBaseUrl), []);
  const socketRef = useRef<Socket | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const locationSyncInFlightRef = useRef(false);
  const [tab, setTab] = useState<Tab>('dashboard');
  const [data, setData] = useState<PartnerBootstrap | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    boot();
    return () => {
      socketRef.current?.disconnect();
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      stopLocationStream();
    };
  }, []);

  useEffect(() => {
    if (data?.user.partnerProfile?.online || data?.activeOrders[0]) {
      startLocationStream();
    } else {
      stopLocationStream();
    }
  }, [data?.user.partnerProfile?.online, data?.activeOrders[0]?.id]);

  async function boot() {
    setLoading(true);
    setError('');
    try {
      const auth = await api.demoLogin('partner');
      api.setToken(auth.token);
      const bootstrap = await api.partnerBootstrap();
      setData(bootstrap);
      connectRealtime(bootstrap.user.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load partner app');
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    try {
      const bootstrap = await api.partnerBootstrap();
      setData(bootstrap);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Refresh failed');
    }
  }

  function scheduleRefresh(delay = 450) {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => {
      refreshTimerRef.current = null;
      refresh();
    }, delay);
  }

  function mergeRealtimeOrder(order: Order) {
    setData((current) => {
      if (!current) return current;
      const activeStatuses = ['accepted', 'arrived_pickup', 'picked_up', 'in_transit'];
      const activeOrders = activeStatuses.includes(order.status)
        ? [order, ...current.activeOrders.filter((item) => item.id !== order.id)]
        : current.activeOrders.filter((item) => item.id !== order.id);
      const availableOrders = ['searching', 'offered'].includes(order.status)
        ? [order, ...current.availableOrders.filter((item) => item.id !== order.id)]
        : current.availableOrders.filter((item) => item.id !== order.id);
      const completedOrders = order.status === 'delivered'
        ? [order, ...current.completedOrders.filter((item) => item.id !== order.id)]
        : current.completedOrders.filter((item) => item.id !== order.id);

      return {
        ...current,
        activeOrders,
        availableOrders,
        completedOrders
      };
    });
    if (['accepted', 'arrived_pickup', 'picked_up', 'in_transit'].includes(order.status)) setTab('active');
  }

  function connectRealtime(partnerId: string) {
    socketRef.current?.disconnect();
    const socket = io(socketUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 600,
      reconnectionDelayMax: 3000
    });
    socketRef.current = socket;
    socket.on('connect', () => {
      socket.emit('join:partner', partnerId);
    });
    socket.on('order:changed', (order: Order) => {
      mergeRealtimeOrder(order);
    });
    socket.on('partner:queue_changed', () => {
      scheduleRefresh();
    });
    socket.on('connect_error', () => {
      scheduleRefresh(1000);
    });
  }

  function toLocationPayload(coords: Location.LocationObjectCoords) {
    return {
      lat: coords.latitude,
      lng: coords.longitude,
      heading: coords.heading ?? undefined,
      speed: coords.speed ?? undefined
    };
  }

  async function sendLocationUpdate(coords: Location.LocationObjectCoords) {
    if (locationSyncInFlightRef.current) return;
    locationSyncInFlightRef.current = true;
    try {
      await api.updatePartnerLocation(toLocationPayload(coords));
    } catch {
      // Location is helpful but should not block accepting or completing jobs.
    } finally {
      locationSyncInFlightRef.current = false;
    }
  }

  async function startLocationStream() {
    if (locationSubscriptionRef.current) return;
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') return;
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      sendLocationUpdate(current.coords);
      locationSubscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 8000,
          distanceInterval: 20
        },
        (currentPosition) => {
          sendLocationUpdate(currentPosition.coords);
        }
      );
    } catch {
      // Keep the delivery flow usable even when device GPS is disabled.
    }
  }

  function stopLocationStream() {
    locationSubscriptionRef.current?.remove();
    locationSubscriptionRef.current = null;
  }

  async function syncLocation() {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') return;
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await sendLocationUpdate(current.coords);
    } catch {
      // Location is helpful but should not block accepting or completing jobs.
    }
  }

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(''), 2600);
  }

  async function withBusy(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  async function pickAndUploadImage(input: { purpose: 'pod' | 'kyc' | 'profile'; orderId?: string; documentKey?: string }) {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      throw new Error('Photo permission is required to upload proof');
    }

    const picked = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      quality: 0.75
    });
    if (picked.canceled || !picked.assets[0]) throw new Error('No image selected');

    const asset = picked.assets[0];
    const signature = await api.createCloudinarySignature(input);
    const uploaded = await uploadFileToCloudinary(asset.uri, signature.upload, {
      fileName: asset.fileName ?? `indiery-${input.purpose}-${Date.now()}.jpg`,
      mimeType: asset.mimeType ?? 'image/jpeg'
    });
    return uploaded.secureUrl;
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={colors.partner} size="large" />
        <Text style={styles.muted}>Loading Indiery Partner</Text>
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.errorTitle}>Backend not ready</Text>
        <Text style={styles.muted}>{error || 'No data returned'}</Text>
        <PrimaryButton title="Retry" icon="refresh" onPress={boot} />
      </SafeAreaView>
    );
  }

  const activeOrder = data.activeOrders[0];

  return (
    <SafeAreaView style={styles.shell}>
      <View style={styles.appHeader}>
        <View>
          <Text style={styles.eyebrow}>INDIERY PARTNER</Text>
          <Text style={styles.headerTitle}>{data.user.name}</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{data.user.initials}</Text>
        </View>
      </View>

      <View style={styles.content}>
        {tab === 'dashboard' && (
          <DashboardScreen
            data={data}
            busy={busy}
            onToggle={() =>
              withBusy(async () => {
                const online = !data.user.partnerProfile?.online;
                await api.setAvailability(online);
                if (online) await syncLocation();
                await refresh();
                showToast(online ? 'You are online' : 'You are offline');
              })
            }
            onOrders={() => setTab('orders')}
            onActive={() => setTab('active')}
          />
        )}
        {tab === 'orders' && (
          <OrdersScreen
            orders={data.availableOrders}
            busy={busy}
            onAccept={(orderId) =>
              withBusy(async () => {
                if (!data.user.partnerProfile?.online) {
                  await api.setAvailability(true);
                }
                await api.acceptOrder(orderId);
                await refresh();
                setTab('active');
                showToast('Order accepted');
              })
            }
            onReject={(orderId) =>
              withBusy(async () => {
                await api.rejectOrder(orderId);
                await refresh();
                showToast('Order skipped');
              })
            }
          />
        )}
        {tab === 'active' && (
          <ActiveScreen
            order={activeOrder}
            busy={busy}
            refresh={refresh}
            onOtp={(orderId, type, otp) =>
              withBusy(async () => {
                await api.verifyOrderOtp(orderId, type, otp);
                await refresh();
                showToast(`${type} OTP verified`);
              })
            }
            onPod={(orderId, type) =>
              withBusy(async () => {
                const photoUrl = await pickAndUploadImage({ purpose: 'pod', orderId, documentKey: type });
                await api.uploadPod(orderId, type, photoUrl);
                await refresh();
                showToast(`${type} POD captured`);
              })
            }
            onStatus={(orderId, status) =>
              withBusy(async () => {
                await api.updateOrderStatus(orderId, status);
                await refresh();
                showToast(`Order updated: ${statusLabels[status]}`);
              })
            }
          />
        )}
        {tab === 'earnings' && (
          <EarningsScreen
            data={data}
            busy={busy}
            onPayout={() =>
              withBusy(async () => {
                const balance = data.user.partnerProfile?.walletBalance ?? 0;
                await api.requestPayout(balance);
                await refresh();
                showToast('Payout requested');
              })
            }
          />
        )}
        {tab === 'kyc' && (
          <KycScreen
            user={data.user}
            busy={busy}
            onUpload={(doc) =>
              withBusy(async () => {
                const photoUrl = await pickAndUploadImage({ purpose: 'kyc', documentKey: doc });
                await api.uploadKyc(doc, photoUrl);
                await refresh();
                showToast('Document uploaded');
              })
            }
          />
        )}
      </View>

      <BottomTabs active={tab} onChange={setTab} availableCount={data.availableOrders.length} activeCount={data.activeOrders.length} />
      {toast ? <View style={styles.toast}><Text style={styles.toastText}>{toast}</Text></View> : null}
    </SafeAreaView>
  );
}

function DashboardScreen({
  data,
  busy,
  onToggle,
  onOrders,
  onActive
}: {
  data: PartnerBootstrap;
  busy: boolean;
  onToggle: () => void;
  onOrders: () => void;
  onActive: () => void;
}) {
  const profile = data.user.partnerProfile;
  const online = Boolean(profile?.online);
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Pressable style={[styles.onlineCard, online && styles.onlineCardActive]} onPress={onToggle}>
        <Text style={[styles.onlineText, online && styles.onlineTextActive]}>{busy ? 'SYNCING' : online ? 'ONLINE' : 'OFFLINE'}</Text>
        <Text style={styles.muted}>{online ? 'Receiving nearby orders' : 'Tap to start receiving orders'}</Text>
      </Pressable>

      <View style={styles.statRow}>
        <StatCard title="Today" value={money(data.stats.todayEarn)} tone="green" />
        <StatCard title="Orders" value={String(data.stats.completedCount)} tone="blue" />
        <StatCard title="Rating" value={`${profile?.rating ?? 5}`} tone="amber" />
      </View>

      <View style={styles.row}>
        <PrimaryButton title="Available Jobs" icon="cube" onPress={onOrders} />
        <SecondaryButton title="Active Trip" icon="navigate" onPress={onActive} />
      </View>

      <SectionTitle title="Nearby Orders" />
      {data.availableOrders.slice(0, 3).map((order) => (
        <OrderCard key={order.id} order={order} />
      ))}
    </ScrollView>
  );
}

function OrdersScreen({
  orders,
  busy,
  onAccept,
  onReject
}: {
  orders: Order[];
  busy: boolean;
  onAccept: (orderId: string) => void;
  onReject: (orderId: string) => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <SectionTitle title={`Available Orders (${orders.length})`} />
      {orders.length === 0 ? (
        <Empty icon="time-outline" title="No orders right now" subtitle="Stay online and refresh after a customer books." />
      ) : null}
      {orders.map((order) => (
        <View key={order.id} style={styles.orderCard}>
          <OrderHeader order={order} />
          <RouteBlock order={order} />
          <View style={styles.chips}>
            <Chip label={`${order.distanceKm} km`} />
            <Chip label={`${order.weightKg} kg`} />
            <Chip label={order.goodsType} />
          </View>
          <View style={styles.row}>
            <SecondaryButton title="Skip" icon="close" onPress={() => onReject(order.id)} />
            <PrimaryButton title={busy ? 'Wait' : `Accept ${money(order.fare.partnerNet)}`} icon="checkmark" onPress={() => onAccept(order.id)} />
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function ActiveScreen({
  order,
  busy,
  refresh,
  onOtp,
  onPod,
  onStatus
}: {
  order?: Order;
  busy: boolean;
  refresh: () => void;
  onOtp: (orderId: string, type: 'pickup' | 'drop', otp: string) => void;
  onPod: (orderId: string, type: 'pickup' | 'drop') => void;
  onStatus: (orderId: string, status: 'arrived_pickup' | 'picked_up' | 'in_transit' | 'delivered') => void;
}) {
  const [otp, setOtp] = useState('');
  if (!order) {
    return (
      <View style={styles.emptyFull}>
        <Empty icon="navigate-outline" title="No active delivery" subtitle="Accept an order from the Orders tab." />
        <PrimaryButton title="Refresh" icon="refresh" onPress={refresh} />
      </View>
    );
  }

  const nextActions = getNextActions(order);
  const needsPickupOtp = order.status === 'arrived_pickup' && !order.pod.pickupOtpVerified;
  const needsDropOtp = order.status === 'in_transit' && !order.pod.dropOtpVerified;
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <MapPreview pickup={order.pickup.label} drop={order.drop.label} eta={order.etaMinutes} />
      <View style={styles.orderCard}>
        <OrderHeader order={order} />
        <RouteBlock order={order} />
      </View>

      <Timeline order={order} />

      <View style={styles.payoutCard}>
        <FareLine label="Order value" value={money(order.fare.orderValue)} />
        <FareLine label="Driver commission 80%" value={money(order.fare.driverCommission)} />
        <FareLine label="On-time reserve reward 5%" value={money(order.fare.reserveAmount)} />
        <FareLine label="Indiery commission 15%" value={money(order.fare.platformCommission)} />
        <FareLine label="You receive if on-time" value={money(order.fare.onTimePartnerPayout)} bold />
        <FareLine label="If late, you receive" value={money(order.fare.latePartnerPayout)} />
        <FareLine label="Customer late refund coins" value={money(order.fare.lateRefundCoins)} />
      </View>

      <SectionTitle title="Trip Actions" />
      {needsPickupOtp || needsDropOtp ? (
        <View style={styles.otpPanel}>
          <Text style={styles.fieldLabel}>{needsPickupOtp ? 'Pickup OTP' : 'Drop OTP'}</Text>
          <View style={styles.otpRow}>
            <TextInput
              value={otp}
              onChangeText={setOtp}
              keyboardType="numeric"
              placeholder="Enter 6 digit code"
              style={styles.otpInput}
            />
            <PrimaryButton
              title="Verify"
              icon="key"
              onPress={() => {
                onOtp(order.id, needsPickupOtp ? 'pickup' : 'drop', otp);
                setOtp('');
              }}
            />
          </View>
        </View>
      ) : null}
      {nextActions.map((action) => (
        <PrimaryButton
          key={action.label}
          title={busy ? 'Updating' : action.label}
          icon={action.icon}
          onPress={() => {
            if (action.kind === 'pod') onPod(order.id, action.type);
            else onStatus(order.id, action.status);
          }}
        />
      ))}
      <SecondaryButton title="Refresh" icon="refresh" onPress={refresh} />
    </ScrollView>
  );
}

function EarningsScreen({ data, busy, onPayout }: { data: PartnerBootstrap; busy: boolean; onPayout: () => void }) {
  const profile = data.user.partnerProfile;
  const balance = profile?.walletBalance ?? 0;
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.walletCard}>
        <Text style={styles.eyebrowDark}>WALLET BALANCE</Text>
        <Text style={styles.walletValue}>{money(balance)}</Text>
        <Text style={styles.muted}>{profile?.weeklyOrders ?? 0} trips this week</Text>
        <PrimaryButton title={busy ? 'Requesting' : 'Request Payout'} icon="send" onPress={onPayout} />
      </View>
      <View style={styles.statRow}>
        <StatCard title="Today" value={money(data.stats.todayEarn)} tone="green" />
        <StatCard title="Done" value={String(data.stats.completedCount)} tone="blue" />
      </View>
      <SectionTitle title="Recent Transactions" />
      {data.stats.ledger.map((item) => (
        <View key={item.id} style={styles.ledgerRow}>
          <View style={[styles.ledgerIcon, item.kind === 'credit' ? styles.ledgerCredit : styles.ledgerDebit]}>
            <Ionicons name={item.kind === 'credit' ? 'arrow-down' : 'arrow-up'} size={16} color={colors.white} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.mutedSmall}>{item.reference || 'Wallet'}</Text>
          </View>
          <Text style={[styles.amount, item.kind === 'credit' ? styles.amountGreen : styles.amountRed]}>
            {item.kind === 'credit' ? '+' : '-'}{money(item.amount)}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

function KycScreen({ user, busy, onUpload }: { user: UserProfile; busy: boolean; onUpload: (doc: KycDoc) => void }) {
  const docs = user.partnerProfile?.docs;
  const rows: Array<[KycDoc, string]> = [
    ['selfie', 'Selfie'],
    ['pan', 'PAN card'],
    ['drivingLicence', 'Driving licence'],
    ['rc', 'RC certificate'],
    ['insurance', 'Insurance'],
    ['bank', 'Bank details']
  ];
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.notice}>
        <Ionicons name="shield-checkmark" size={18} color={colors.partner} />
        <Text style={styles.noticeText}>KYC status: {user.partnerProfile?.kycStatus || 'not_started'}</Text>
      </View>
      <SectionTitle title="Required Documents" />
      <View style={styles.docGrid}>
        {rows.map(([key, label]) => {
          const done = Boolean(docs?.[key]);
          return (
            <Pressable key={key} style={[styles.docCard, done && styles.docCardDone]} onPress={() => onUpload(key)}>
              <Ionicons name={done ? 'checkmark-circle' : 'cloud-upload-outline'} size={26} color={done ? colors.green : colors.muted} />
              <Text style={[styles.docTitle, done && styles.docDoneText]}>{label}</Text>
              <Text style={styles.mutedSmall}>{done ? 'Uploaded' : busy ? 'Uploading' : 'Tap to upload'}</Text>
            </Pressable>
          );
        })}
      </View>
      <PolicyList />
    </ScrollView>
  );
}

function PolicyList() {
  return (
    <View>
      <SectionTitle title="Policies and Legal" />
      {legalPolicies.map((policy) => (
        <PolicyCard key={policy.id} policy={policy} />
      ))}
    </View>
  );
}

function PolicyCard({ policy }: { policy: LegalPolicy }) {
  return (
    <View style={styles.policyCard}>
      <Text style={styles.cardTitle}>{policy.title}</Text>
      <Text style={styles.mutedSmall}>Updated {policy.updatedAt}</Text>
      <Text style={styles.policySummary}>{policy.summary}</Text>
      {policy.sections.map((section) => (
        <View key={section.heading} style={styles.policySection}>
          <Text style={styles.policyHeading}>{section.heading}</Text>
          {section.body.map((line) => (
            <Text key={line} style={styles.policyText}>{line}</Text>
          ))}
        </View>
      ))}
    </View>
  );
}

function BottomTabs({
  active,
  onChange,
  availableCount,
  activeCount
}: {
  active: Tab;
  onChange: (tab: Tab) => void;
  availableCount: number;
  activeCount: number;
}) {
  const tabs: Array<[Tab, keyof typeof Ionicons.glyphMap, string, number?]> = [
    ['dashboard', 'home', 'Home'],
    ['orders', 'cube', 'Orders', availableCount],
    ['active', 'navigate', 'Active', activeCount],
    ['earnings', 'wallet', 'Earn'],
    ['kyc', 'shield-checkmark', 'KYC']
  ];
  return (
    <View style={styles.tabs}>
      {tabs.map(([key, icon, label, count]) => {
        const selected = active === key;
        return (
          <Pressable key={key} style={styles.tab} onPress={() => onChange(key)}>
            <View>
              <Ionicons name={icon} size={22} color={selected ? colors.partner : colors.muted} />
              {count ? (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{count}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.tabText, selected && styles.tabTextActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function getNextActions(order: Order) {
  if (order.status === 'accepted') {
    return [{ kind: 'status' as const, label: 'Arrived at Pickup', status: 'arrived_pickup' as const, icon: 'location' as const }];
  }
  if (order.status === 'arrived_pickup') {
    return [
      { kind: 'pod' as const, label: 'Capture Pickup POD', type: 'pickup' as const, icon: 'camera' as const },
      ...(order.pod.pickupOtpVerified
        ? [{ kind: 'status' as const, label: 'Mark Picked Up', status: 'picked_up' as const, icon: 'cube' as const }]
        : [])
    ];
  }
  if (order.status === 'picked_up') {
    return [{ kind: 'status' as const, label: 'Start Transit', status: 'in_transit' as const, icon: 'navigate' as const }];
  }
  if (order.status === 'in_transit') {
    return [
      { kind: 'pod' as const, label: 'Capture Drop POD', type: 'drop' as const, icon: 'camera' as const },
      ...(order.pod.dropOtpVerified
        ? [{ kind: 'status' as const, label: 'Mark Delivered', status: 'delivered' as const, icon: 'checkmark' as const }]
        : [])
    ];
  }
  return [{ kind: 'status' as const, label: 'Refresh Trip', status: 'in_transit' as const, icon: 'refresh' as const }];
}

function PrimaryButton({ title, icon, onPress }: { title: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  return (
    <Pressable style={styles.primaryButton} onPress={onPress}>
      <Ionicons name={icon} size={17} color={colors.white} />
      <Text style={styles.primaryButtonText}>{title}</Text>
    </Pressable>
  );
}

function SecondaryButton({ title, icon, onPress }: { title: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  return (
    <Pressable style={styles.secondaryButton} onPress={onPress}>
      <Ionicons name={icon} size={17} color={colors.ink} />
      <Text style={styles.secondaryButtonText}>{title}</Text>
    </Pressable>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function StatCard({ title, value, tone }: { title: string; value: string; tone: 'green' | 'blue' | 'amber' }) {
  const palette = {
    green: [colors.partnerLight, colors.partner],
    blue: ['#DBEAFE', colors.blue],
    amber: ['#FEF3C7', colors.amber]
  }[tone];
  return (
    <View style={[styles.statCard, { backgroundColor: palette[0] }]}>
      <Text style={[styles.statValue, { color: palette[1] }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: palette[1] }]}>{title}</Text>
    </View>
  );
}

function OrderCard({ order }: { order: Order }) {
  return (
    <View style={styles.orderCard}>
      <OrderHeader order={order} />
      <RouteBlock order={order} />
      <View style={styles.between}>
        <Text style={styles.mutedSmall}>{order.vehicle.shortName} - {order.distanceKm} km</Text>
        <Text style={styles.priceText}>{money(order.fare.partnerNet)}</Text>
      </View>
    </View>
  );
}

function OrderHeader({ order }: { order: Order }) {
  return (
    <View style={styles.between}>
      <View>
        <Text style={styles.orderNo}>{order.orderNo}</Text>
        <Text style={styles.cardTitle}>{order.customer?.name || 'Customer'}</Text>
      </View>
      <Badge label={statusLabels[order.status]} />
    </View>
  );
}

function RouteBlock({ order }: { order: Order }) {
  return (
    <View>
      <View style={styles.route}>
        <View style={styles.routeDot} />
        <View style={styles.flex}>
          <Text style={styles.routeText}>{order.pickup.label}</Text>
          <Text style={styles.mutedSmall}>Pickup</Text>
        </View>
      </View>
      <View style={styles.route}>
        <View style={[styles.routeDot, styles.routeDotGreen]} />
        <View style={styles.flex}>
          <Text style={styles.routeText}>{order.drop.label}</Text>
          <Text style={styles.mutedSmall}>Drop</Text>
        </View>
      </View>
    </View>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

function MapPreview({ pickup, drop, eta }: { pickup: string; drop: string; eta: number }) {
  return (
    <View style={styles.map}>
      <View style={styles.mapRoad} />
      <View style={[styles.mapRoad, styles.mapRoadTwo]} />
      <View style={styles.mapRoute} />
      <View style={styles.mapPinA} />
      <View style={styles.mapPinB} />
      <View style={styles.etaChip}>
        <Text style={styles.etaValue}>{eta}</Text>
        <Text style={styles.etaLabel}>MIN</Text>
      </View>
      <Text style={styles.mapText}>{pickup} {'->'} {drop}</Text>
    </View>
  );
}

function Timeline({ order }: { order: Order }) {
  return (
    <View style={styles.orderCard}>
      {order.timeline.map((item) => (
        <View key={item.key} style={styles.timelineItem}>
          <View
            style={[
              styles.timelineDot,
              item.state === 'done' && styles.timelineDone,
              item.state === 'active' && styles.timelineActive
            ]}
          >
            {item.state === 'done' ? <Ionicons name="checkmark" size={12} color={colors.white} /> : null}
          </View>
          <View style={styles.flex}>
            <Text style={styles.timelineTitle}>{item.title}</Text>
            <Text style={styles.mutedSmall}>{item.note}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function FareLine({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.between}>
      <Text style={[styles.fareLabel, bold && styles.bold]}>{label}</Text>
      <Text style={[styles.fareValue, bold && styles.bold]}>{value}</Text>
    </View>
  );
}

function Empty({ icon, title, subtitle }: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={42} color={colors.muted} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.muted}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.white },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.white },
  appHeader: {
    backgroundColor: colors.partner,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  eyebrow: { color: '#D1FAE5', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  eyebrowDark: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1, textAlign: 'center' },
  headerTitle: { color: colors.white, fontSize: 21, fontWeight: '800' },
  avatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.white, fontWeight: '800' },
  content: { flex: 1, marginTop: -14, backgroundColor: colors.white, borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  scroll: { padding: 16, paddingBottom: 96 },
  onlineCard: { borderRadius: 80, borderWidth: 4, borderColor: colors.line, width: 124, height: 124, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginVertical: 8 },
  onlineCardActive: { borderColor: colors.partner, backgroundColor: colors.partnerLight },
  onlineText: { color: colors.muted, fontWeight: '900', fontSize: 16 },
  onlineTextActive: { color: colors.partner },
  statRow: { flexDirection: 'row', gap: 10, marginTop: 16, marginBottom: 16 },
  statCard: { flex: 1, borderRadius: 14, padding: 14 },
  statValue: { fontSize: 17, fontWeight: '900' },
  statLabel: { fontSize: 11, fontWeight: '800', marginTop: 4 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: colors.ink, marginTop: 18, marginBottom: 10 },
  orderCard: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 14, marginBottom: 12, backgroundColor: colors.white },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 8 },
  orderNo: { color: colors.muted, fontSize: 11, fontWeight: '900' },
  cardTitle: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  badge: { backgroundColor: colors.partnerLight, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 },
  badgeText: { color: colors.partner, fontSize: 11, fontWeight: '900' },
  route: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  routeDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.partner },
  routeDotGreen: { backgroundColor: colors.green },
  routeText: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 8 },
  chip: { backgroundColor: colors.faint, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999 },
  chipText: { color: colors.muted, fontSize: 11, fontWeight: '800' },
  muted: { color: colors.muted, marginTop: 8, textAlign: 'center' },
  mutedSmall: { color: colors.muted, fontSize: 12 },
  priceText: { color: colors.partner, fontSize: 14, fontWeight: '900' },
  primaryButton: { flex: 1, minHeight: 46, borderRadius: 14, backgroundColor: colors.partner, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, paddingHorizontal: 12, marginBottom: 10 },
  primaryButtonText: { color: colors.white, fontWeight: '900' },
  secondaryButton: { flex: 1, minHeight: 46, borderRadius: 14, backgroundColor: colors.faint, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, paddingHorizontal: 12, marginBottom: 10 },
  secondaryButtonText: { color: colors.ink, fontWeight: '900' },
  map: { height: 170, borderRadius: 18, backgroundColor: '#ECFDF5', overflow: 'hidden', marginBottom: 14 },
  mapRoad: { position: 'absolute', top: 72, left: -20, right: -20, height: 20, backgroundColor: '#BBF7D0', transform: [{ rotate: '-8deg' }] },
  mapRoadTwo: { top: 30, transform: [{ rotate: '12deg' }], opacity: 0.7 },
  mapRoute: { position: 'absolute', left: 72, top: 88, width: 190, height: 4, borderRadius: 2, backgroundColor: colors.partner },
  mapPinA: { position: 'absolute', left: 64, top: 78, width: 18, height: 18, borderRadius: 9, backgroundColor: colors.partner },
  mapPinB: { position: 'absolute', left: 248, top: 78, width: 18, height: 18, borderRadius: 9, backgroundColor: colors.green },
  etaChip: { position: 'absolute', right: 12, top: 12, backgroundColor: colors.white, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center' },
  etaValue: { color: colors.partner, fontSize: 20, fontWeight: '900' },
  etaLabel: { color: colors.muted, fontSize: 9, fontWeight: '900' },
  mapText: { position: 'absolute', left: 12, bottom: 12, right: 12, color: colors.ink, fontSize: 12, fontWeight: '900' },
  payoutCard: { backgroundColor: colors.partnerLight, borderRadius: 16, padding: 14, marginBottom: 14 },
  fareLabel: { color: colors.partner, fontSize: 13 },
  fareValue: { color: colors.partner, fontSize: 13, fontWeight: '800' },
  bold: { fontWeight: '900', fontSize: 15 },
  timelineItem: { flexDirection: 'row', gap: 10, paddingVertical: 8 },
  timelineDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  timelineDone: { backgroundColor: colors.green },
  timelineActive: { backgroundColor: colors.partner },
  timelineTitle: { color: colors.ink, fontSize: 13, fontWeight: '900' },
  walletCard: { borderRadius: 18, padding: 20, borderWidth: 1, borderColor: colors.line, alignItems: 'center', gap: 10 },
  walletValue: { color: colors.partner, fontSize: 36, fontWeight: '900' },
  ledgerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  ledgerIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  ledgerCredit: { backgroundColor: colors.partner },
  ledgerDebit: { backgroundColor: colors.red },
  amount: { fontWeight: '900', fontSize: 13 },
  amountGreen: { color: colors.partner },
  amountRed: { color: colors.red },
  notice: { flexDirection: 'row', gap: 10, backgroundColor: colors.partnerLight, borderRadius: 14, padding: 14, alignItems: 'center' },
  noticeText: { flex: 1, color: colors.partner, fontSize: 13, fontWeight: '900' },
  fieldLabel: { color: colors.muted, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', marginBottom: 6 },
  otpPanel: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 12, marginBottom: 12 },
  otpRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  otpInput: { flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 12, minHeight: 46, color: colors.ink, fontWeight: '800' },
  docGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  docCard: { width: '48%', borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 14, alignItems: 'center', gap: 6 },
  docCardDone: { backgroundColor: colors.partnerLight, borderColor: colors.partner },
  docTitle: { color: colors.ink, fontWeight: '900', textAlign: 'center' },
  docDoneText: { color: colors.partner },
  policyCard: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 14, backgroundColor: colors.white, marginBottom: 12 },
  policySummary: { color: colors.ink, fontSize: 13, fontWeight: '700', marginTop: 8, lineHeight: 18 },
  policySection: { marginTop: 10 },
  policyHeading: { color: colors.partner, fontSize: 13, fontWeight: '900', marginBottom: 4 },
  policyText: { color: colors.muted, fontSize: 12, lineHeight: 18, marginBottom: 4 },
  flex: { flex: 1 },
  tabs: { height: 76, borderTopWidth: 1, borderTopColor: colors.line, flexDirection: 'row', backgroundColor: colors.white, paddingBottom: 8 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  tabText: { color: colors.muted, fontSize: 11, fontWeight: '800' },
  tabTextActive: { color: colors.partner },
  tabBadge: { position: 'absolute', right: -8, top: -8, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  tabBadgeText: { color: colors.white, fontSize: 9, fontWeight: '900' },
  toast: { position: 'absolute', left: 16, right: 16, bottom: 88, backgroundColor: colors.ink, borderRadius: 14, padding: 14 },
  toastText: { color: colors.white, fontWeight: '900' },
  empty: { alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  emptyFull: { flex: 1, padding: 24, justifyContent: 'center' },
  emptyTitle: { color: colors.ink, fontSize: 18, fontWeight: '900' },
  errorTitle: { color: colors.red, fontSize: 18, fontWeight: '900', marginBottom: 6 }
});
