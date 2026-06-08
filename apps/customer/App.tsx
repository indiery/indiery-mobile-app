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
import { io, Socket } from 'socket.io-client';
import { Ionicons } from '@expo/vector-icons';
import {
  colors,
  CreateOrderInput,
  CustomerBootstrap,
  FareBreakup,
  IndieryApi,
  legalPolicies,
  LegalPolicy,
  money,
  Order,
  PaymentMode,
  statusLabels,
  Vehicle
} from '@indiery/shared';

declare const process: { env?: Record<string, string | undefined> };

const apiBaseUrl =
  process?.env?.EXPO_PUBLIC_API_URL ||
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ||
  'http://localhost:4000/api';

const socketUrl = apiBaseUrl.replace(/\/api\/?$/, '');

type Tab = 'home' | 'book' | 'track' | 'wallet' | 'profile';

const initialBooking = {
  pickup: 'Hazratganj',
  drop: 'Gomti Nagar',
  goodsType: 'Documents',
  weightKg: '4',
  coins: '40',
  paymentMode: 'upi' as PaymentMode,
  vehicleId: ''
};

export default function App() {
  const api = useMemo(() => new IndieryApi(apiBaseUrl), []);
  const socketRef = useRef<Socket | null>(null);
  const [tab, setTab] = useState<Tab>('home');
  const [data, setData] = useState<CustomerBootstrap | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [step, setStep] = useState(1);
  const [booking, setBooking] = useState(initialBooking);
  const [fare, setFare] = useState<FareBreakup | null>(null);
  const [tripOtpByOrder, setTripOtpByOrder] = useState<Record<string, { pickup: string; drop: string }>>({});

  useEffect(() => {
    boot();
    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (data?.vehicles.length && !booking.vehicleId) {
      setBooking((current) => ({ ...current, vehicleId: data.vehicles[0].id }));
    }
  }, [data?.vehicles.length]);

  async function boot() {
    setLoading(true);
    setError('');
    try {
      const auth = await api.demoLogin('customer');
      api.setToken(auth.token);
      const bootstrap = await api.customerBootstrap();
      setData(bootstrap);
      connectRealtime(bootstrap.user.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load app');
    } finally {
      setLoading(false);
    }
  }

  function mergeRealtimeOrder(order: Order) {
    setData((current) => {
      if (!current) return current;
      const orders = [order, ...current.orders.filter((item) => item.id !== order.id)];
      const activeOrder = ['delivered', 'cancelled'].includes(order.status) ? undefined : order;
      return {
        ...current,
        activeOrder: activeOrder ?? current.activeOrder,
        orders
      };
    });
  }

  function connectRealtime(customerId: string) {
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
      socket.emit('join:customer', customerId);
    });
    socket.on('order:changed', (order: Order) => {
      mergeRealtimeOrder(order);
      if (!['delivered', 'cancelled'].includes(order.status)) setTab('track');
    });
    socket.on('connect_error', () => {
      refresh();
    });
  }

  async function refresh() {
    try {
      const bootstrap = await api.customerBootstrap();
      setData(bootstrap);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Refresh failed');
    }
  }

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(''), 2600);
  }

  async function estimateNow(nextStep = step) {
    if (!booking.vehicleId || !booking.pickup || !booking.drop) return;
    setBusy(true);
    try {
      const result = await api.estimate({
        pickup: booking.pickup,
        drop: booking.drop,
        vehicleId: booking.vehicleId,
        coins: Number(booking.coins || 0),
        weightKg: Number(booking.weightKg || 1)
      });
      setFare(result.fare);
      setStep(nextStep);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Fare estimate failed');
    } finally {
      setBusy(false);
    }
  }

  async function placeOrder() {
    if (!booking.vehicleId) return;
    setBusy(true);
    try {
      const input: CreateOrderInput = {
        pickup: booking.pickup,
        drop: booking.drop,
        vehicleId: booking.vehicleId,
        goodsType: booking.goodsType,
        weightKg: Number(booking.weightKg || 1),
        coins: Number(booking.coins || 0),
        paymentMode: booking.paymentMode
      };
      const result = await api.createOrder(input);
      if (result.tripOtp) {
        setTripOtpByOrder((current) => ({ ...current, [result.order.id]: result.tripOtp! }));
      }
      await refresh();
      setStep(1);
      setFare(null);
      setBooking((current) => ({ ...initialBooking, vehicleId: current.vehicleId }));
      setTab('track');
      showToast(`${result.order.orderNo} booked`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Booking failed');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={colors.customer} size="large" />
        <Text style={styles.muted}>Loading Indiery Customer</Text>
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

  const activeOrder = data.activeOrder || data.orders.find((order) => !['delivered', 'cancelled'].includes(order.status));

  return (
    <SafeAreaView style={styles.shell}>
      <View style={styles.appHeader}>
        <View>
          <Text style={styles.eyebrow}>INDIERY CUSTOMER</Text>
          <Text style={styles.headerTitle}>Hi, {data.user.name.split(' ')[0]}</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{data.user.initials}</Text>
        </View>
      </View>

      <View style={styles.content}>
        {tab === 'home' && (
          <HomeScreen
            data={data}
            activeOrder={activeOrder}
            onBook={() => setTab('book')}
            onTrack={() => setTab('track')}
          />
        )}
        {tab === 'book' && (
          <BookScreen
            vehicles={data.vehicles}
            booking={booking}
            setBooking={setBooking}
            step={step}
            setStep={setStep}
            fare={fare}
            busy={busy}
            estimateNow={estimateNow}
            placeOrder={placeOrder}
          />
        )}
        {tab === 'track' && <TrackScreen order={activeOrder} tripOtp={activeOrder ? tripOtpByOrder[activeOrder.id] : undefined} onRefresh={refresh} />}
        {tab === 'wallet' && (
          <WalletScreen
            coins={data.user.customerProfile?.coins ?? 0}
            busy={busy}
            onCoupon={async () => {
              setBusy(true);
              try {
                const result = await api.applyCoupon('FIRST50');
                await refresh();
                showToast(`Added ${result.addedCoins} coins`);
              } catch (err) {
                showToast(err instanceof Error ? err.message : 'Coupon failed');
              } finally {
                setBusy(false);
              }
            }}
          />
        )}
        {tab === 'profile' && <ProfileScreen data={data} />}
      </View>

      <BottomTabs active={tab} onChange={setTab} activeOrder={Boolean(activeOrder)} />
      {toast ? <View style={styles.toast}><Text style={styles.toastText}>{toast}</Text></View> : null}
    </SafeAreaView>
  );
}

function HomeScreen({
  data,
  activeOrder,
  onBook,
  onTrack
}: {
  data: CustomerBootstrap;
  activeOrder?: Order;
  onBook: () => void;
  onTrack: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>WHERE TO?</Text>
        <Pressable style={styles.searchBox} onPress={onBook}>
          <Ionicons name="search" size={18} color={colors.customer} />
          <Text style={styles.searchText}>Enter drop location</Text>
          <Ionicons name="arrow-forward" size={18} color={colors.customer} />
        </Pressable>
        <View style={styles.row}>
          <PrimaryButton title="Book Now" icon="add" onPress={onBook} />
          <SecondaryButton title="Track" icon="navigate" onPress={onTrack} />
        </View>
      </View>

      <View style={styles.statRow}>
        <StatCard title="Orders" value={String(data.orders.length)} tone="purple" />
        <StatCard title="Active" value={activeOrder ? '1' : '0'} tone="green" />
        <StatCard title="Coins" value={String(data.user.customerProfile?.coins ?? 0)} tone="amber" />
      </View>

      {activeOrder ? (
        <View>
          <SectionTitle title="Active Delivery" />
          <OrderCard order={activeOrder} />
        </View>
      ) : null}

      <SectionTitle title="Recent Orders" />
      {data.orders.slice(0, 5).map((order) => (
        <OrderCard key={order.id} order={order} />
      ))}
    </ScrollView>
  );
}

function BookScreen({
  vehicles,
  booking,
  setBooking,
  step,
  setStep,
  fare,
  busy,
  estimateNow,
  placeOrder
}: {
  vehicles: Vehicle[];
  booking: typeof initialBooking;
  setBooking: React.Dispatch<React.SetStateAction<typeof initialBooking>>;
  step: number;
  setStep: (step: number) => void;
  fare: FareBreakup | null;
  busy: boolean;
  estimateNow: (nextStep?: number) => Promise<void>;
  placeOrder: () => Promise<void>;
}) {
  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === booking.vehicleId);

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.stepRow}>
        {[1, 2, 3, 4].map((item) => (
          <View key={item} style={[styles.stepDot, item <= step && styles.stepDotActive]}>
            <Text style={[styles.stepText, item <= step && styles.stepTextActive]}>{item}</Text>
          </View>
        ))}
      </View>

      {step === 1 && (
        <View>
          <SectionTitle title="Select Vehicle" />
          <View style={styles.vehicleGrid}>
            {vehicles.map((vehicle) => (
              <Pressable
                key={vehicle.id}
                style={[styles.vehicleCard, booking.vehicleId === vehicle.id && styles.vehicleCardActive]}
                onPress={() => setBooking((current) => ({ ...current, vehicleId: vehicle.id }))}
              >
                <Ionicons name={vehicle.capacityKg <= 20 ? 'bicycle' : 'car-sport'} size={24} color={colors.customer} />
                <Text style={styles.vehicleName}>{vehicle.shortName}</Text>
                <Text style={styles.mutedSmall}>Up to {vehicle.capacityKg} kg</Text>
                <Text style={styles.priceText}>Base {money(vehicle.baseFare)}</Text>
              </Pressable>
            ))}
          </View>
          <PrimaryButton title="Continue" icon="arrow-forward" onPress={() => setStep(2)} />
        </View>
      )}

      {step === 2 && (
        <View>
          <SectionTitle title="Pickup and Drop" />
          <Field
            label="Pickup"
            value={booking.pickup}
            onChangeText={(pickup) => setBooking((current) => ({ ...current, pickup }))}
          />
          <Field
            label="Drop"
            value={booking.drop}
            onChangeText={(drop) => setBooking((current) => ({ ...current, drop }))}
          />
          <MapPreview pickup={booking.pickup} drop={booking.drop} eta={fare?.etaMinutes || selectedVehicle?.etaMinutes || 4} />
          <View style={styles.row}>
            <SecondaryButton title="Back" icon="arrow-back" onPress={() => setStep(1)} />
            <PrimaryButton title={busy ? 'Estimating' : 'Continue'} icon="arrow-forward" onPress={() => estimateNow(3)} />
          </View>
        </View>
      )}

      {step === 3 && (
        <View>
          <SectionTitle title="Goods Details" />
          <Field
            label="Goods type"
            value={booking.goodsType}
            onChangeText={(goodsType) => setBooking((current) => ({ ...current, goodsType }))}
          />
          <Field
            label="Weight kg"
            keyboardType="numeric"
            value={booking.weightKg}
            onChangeText={(weightKg) => setBooking((current) => ({ ...current, weightKg }))}
          />
          <View style={styles.notice}>
            <Ionicons name="warning" size={16} color={colors.amber} />
            <Text style={styles.noticeText}>Restricted goods, hazardous items, and illegal materials are not allowed.</Text>
          </View>
          <View style={styles.row}>
            <SecondaryButton title="Back" icon="arrow-back" onPress={() => setStep(2)} />
            <PrimaryButton title="Continue" icon="arrow-forward" onPress={() => estimateNow(4)} />
          </View>
        </View>
      )}

      {step === 4 && (
        <View>
          <SectionTitle title="Payment" />
          <Field
            label="Use coins"
            keyboardType="numeric"
            value={booking.coins}
            onChangeText={(coins) => setBooking((current) => ({ ...current, coins }))}
          />
          {fare ? <FareCard fare={fare} /> : null}
          {(['upi', 'card', 'wallet', 'netbanking'] as PaymentMode[]).map((mode) => (
            <Pressable
              key={mode}
              style={[styles.payRow, booking.paymentMode === mode && styles.payRowActive]}
              onPress={() => setBooking((current) => ({ ...current, paymentMode: mode }))}
            >
              <Ionicons
                name={booking.paymentMode === mode ? 'radio-button-on' : 'radio-button-off'}
                size={18}
                color={colors.customer}
              />
              <Text style={styles.payText}>{mode.toUpperCase()}</Text>
            </Pressable>
          ))}
          <View style={styles.row}>
            <SecondaryButton title="Back" icon="arrow-back" onPress={() => setStep(3)} />
            <PrimaryButton title={busy ? 'Booking' : 'Pay and Book'} icon="checkmark" onPress={placeOrder} />
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function TrackScreen({
  order,
  tripOtp,
  onRefresh
}: {
  order?: Order;
  tripOtp?: { pickup: string; drop: string };
  onRefresh: () => void;
}) {
  if (!order) {
    return (
      <View style={styles.empty}>
        <Ionicons name="cube-outline" size={42} color={colors.muted} />
        <Text style={styles.emptyTitle}>No active delivery</Text>
        <Text style={styles.muted}>Book an order to see live tracking here.</Text>
        <PrimaryButton title="Refresh" icon="refresh" onPress={onRefresh} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <MapPreview pickup={order.pickup.label} drop={order.drop.label} eta={order.etaMinutes} partnerLocation={order.partnerLocation} />
      <View style={styles.card}>
        <View style={styles.between}>
          <View>
            <Text style={styles.cardTitle}>{order.orderNo}</Text>
            <Text style={styles.mutedSmall}>{order.vehicle.shortName} {'->'} {order.drop.label}</Text>
          </View>
          <Badge label={statusLabels[order.status]} />
        </View>
      </View>
      {order.partner ? (
        <View style={styles.driverCard}>
          <View style={styles.driverAvatar}>
            <Text style={styles.driverAvatarText}>{order.partner.initials}</Text>
          </View>
          <View style={styles.flex}>
            <Text style={styles.cardTitle}>{order.partner.name}</Text>
            <Text style={styles.mutedSmall}>{order.partner.partnerProfile?.vehicleNumber || 'Vehicle assigned'}</Text>
          </View>
          <Text style={styles.rating}>4.9</Text>
        </View>
      ) : null}
      {tripOtp ? (
        <View style={styles.otpCard}>
          <Text style={styles.cardTitle}>Delivery OTP</Text>
          <View style={styles.row}>
            <View style={styles.otpBox}>
              <Text style={styles.mutedSmall}>Pickup</Text>
              <Text style={styles.otpText}>{tripOtp.pickup}</Text>
            </View>
            <View style={styles.otpBox}>
              <Text style={styles.mutedSmall}>Drop</Text>
              <Text style={styles.otpText}>{tripOtp.drop}</Text>
            </View>
          </View>
        </View>
      ) : null}
      <Timeline items={order.timeline} />
      <FareCard fare={order.fare} />
      <PrimaryButton title="Refresh Tracking" icon="refresh" onPress={onRefresh} />
    </ScrollView>
  );
}

function WalletScreen({ coins, busy, onCoupon }: { coins: number; busy: boolean; onCoupon: () => Promise<void> }) {
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.walletCard}>
        <Text style={styles.eyebrowDark}>INDIERY COINS</Text>
        <Text style={styles.coinValue}>{coins}</Text>
        <Text style={styles.muted}>Use coins as discount on bookings.</Text>
        <PrimaryButton title={busy ? 'Applying' : 'Apply FIRST50'} icon="gift" onPress={onCoupon} />
      </View>
      <SectionTitle title="Coin Rules" />
      {['Earn coins for successful deliveries', 'Use coins on fare before GST', 'Refunds return unused coins'].map((item) => (
        <View key={item} style={styles.listRow}>
          <Ionicons name="checkmark-circle" size={18} color={colors.green} />
          <Text style={styles.listText}>{item}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

function ProfileScreen({ data }: { data: CustomerBootstrap }) {
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.profileHero}>
        <View style={styles.profileAvatar}>
          <Text style={styles.profileAvatarText}>{data.user.initials}</Text>
        </View>
        <Text style={styles.headerTitle}>{data.user.name}</Text>
        <Text style={styles.muted}>{data.user.phone} - {data.user.city}</Text>
      </View>
      <Field label="Name" value={data.user.name} editable={false} />
      <Field label="Phone" value={data.user.phone} editable={false} />
      <Field label="Email" value={data.user.email || ''} editable={false} />
      <Field label="City" value={data.user.city} editable={false} />
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
  activeOrder
}: {
  active: Tab;
  onChange: (tab: Tab) => void;
  activeOrder: boolean;
}) {
  const tabs: Array<[Tab, keyof typeof Ionicons.glyphMap, string]> = [
    ['home', 'home', 'Home'],
    ['book', 'add-circle', 'Book'],
    ['track', 'navigate', 'Track'],
    ['wallet', 'wallet', 'Wallet'],
    ['profile', 'person', 'Profile']
  ];
  return (
    <View style={styles.tabs}>
      {tabs.map(([key, icon, label]) => {
        const selected = active === key;
        return (
          <Pressable key={key} style={styles.tab} onPress={() => onChange(key)}>
            <View>
              <Ionicons name={icon} size={22} color={selected ? colors.customer : colors.muted} />
              {key === 'track' && activeOrder ? <View style={styles.tabDot} /> : null}
            </View>
            <Text style={[styles.tabText, selected && styles.tabTextActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
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

function Field({
  label,
  value,
  onChangeText,
  keyboardType,
  editable = true
}: {
  label: string;
  value: string;
  onChangeText?: (value: string) => void;
  keyboardType?: 'default' | 'numeric';
  editable?: boolean;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        editable={editable}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        style={[styles.input, !editable && styles.inputReadonly]}
      />
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function StatCard({ title, value, tone }: { title: string; value: string; tone: 'purple' | 'green' | 'amber' }) {
  const palette = {
    purple: [colors.customerLight, colors.customer],
    green: [colors.partnerLight, colors.green],
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
      <View style={styles.between}>
        <Text style={styles.orderNo}>{order.orderNo}</Text>
        <Badge label={statusLabels[order.status]} />
      </View>
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
      <View style={styles.between}>
        <Text style={styles.mutedSmall}>{order.vehicle.shortName} - {order.distanceKm} km</Text>
        <Text style={styles.priceText}>{money(order.fare.total)}</Text>
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

function MapPreview({
  pickup,
  drop,
  eta,
  partnerLocation
}: {
  pickup: string;
  drop: string;
  eta: number;
  partnerLocation?: Order['partnerLocation'];
}) {
  const hasLiveLocation = typeof partnerLocation?.lat === 'number' && typeof partnerLocation?.lng === 'number';
  return (
    <View style={styles.map}>
      <View style={styles.mapRoad} />
      <View style={[styles.mapRoad, styles.mapRoadTwo]} />
      <View style={styles.mapRoute} />
      <View style={styles.mapPinA} />
      <View style={styles.mapPinB} />
      <View style={[styles.vehiclePulse, hasLiveLocation && styles.vehiclePulseLive]} />
      <View style={[styles.vehicleMarker, hasLiveLocation && styles.vehicleMarkerLive]}>
        <Ionicons name="bicycle" size={16} color={colors.white} />
      </View>
      <View style={styles.etaChip}>
        <Text style={styles.etaValue}>{eta}</Text>
        <Text style={styles.etaLabel}>MIN</Text>
      </View>
      <View style={styles.liveChip}>
        <View style={[styles.liveDot, hasLiveLocation && styles.liveDotOn]} />
        <Text style={styles.liveText}>{hasLiveLocation ? 'Live GPS' : 'Waiting GPS'}</Text>
      </View>
      <Text style={styles.mapText}>{pickup} {'->'} {drop}</Text>
    </View>
  );
}

function Timeline({ items }: { items: Order['timeline'] }) {
  return (
    <View style={styles.card}>
      {items.map((item) => (
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

function FareCard({ fare }: { fare: FareBreakup }) {
  return (
    <View style={styles.fareCard}>
      <FareRow label="Base fare" value={money(fare.base)} />
      <FareRow label={`Distance charge (${fare.billableKm} billable km)`} value={money(fare.distance)} />
      <FareRow label="Order value" value={money(fare.orderValue)} />
      <FareRow label="GST" value={money(fare.gst)} />
      <FareRow label="Coins" value={`-${money(fare.coins)}`} />
      <FareRow label="Late refund coins" value={money(fare.lateRefundCoins)} />
      <View style={styles.divider} />
      <FareRow label="Total" value={money(fare.total)} bold />
    </View>
  );
}

function FareRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.between}>
      <Text style={[styles.fareLabel, bold && styles.bold]}>{label}</Text>
      <Text style={[styles.fareValue, bold && styles.bold]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.white },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.white },
  appHeader: {
    backgroundColor: colors.customer,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  eyebrow: { color: '#DDD6FE', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  eyebrowDark: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1, textAlign: 'center' },
  headerTitle: { color: colors.ink, fontSize: 22, fontWeight: '800' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: { color: colors.white, fontWeight: '800' },
  content: { flex: 1, marginTop: -14, backgroundColor: colors.white, borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  scroll: { padding: 16, paddingBottom: 96 },
  heroCard: { backgroundColor: colors.white, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.line, gap: 12 },
  heroLabel: { fontSize: 11, color: colors.muted, fontWeight: '800', letterSpacing: 1 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.faint, borderRadius: 14, padding: 14 },
  searchText: { flex: 1, color: colors.muted, fontSize: 14 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  statRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  statCard: { flex: 1, borderRadius: 14, padding: 14 },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 11, fontWeight: '700', marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.ink, marginTop: 20, marginBottom: 10 },
  orderCard: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 14, marginBottom: 12, backgroundColor: colors.white },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 8 },
  orderNo: { color: colors.muted, fontSize: 11, fontWeight: '800' },
  badge: { backgroundColor: colors.customerLight, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 },
  badgeText: { color: colors.customer, fontSize: 11, fontWeight: '800' },
  route: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  routeDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.customer },
  routeDotGreen: { backgroundColor: colors.green },
  routeText: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  muted: { color: colors.muted, marginTop: 8, textAlign: 'center' },
  mutedSmall: { color: colors.muted, fontSize: 12 },
  priceText: { color: colors.customer, fontSize: 13, fontWeight: '800' },
  stepRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  stepDot: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.faint, alignItems: 'center', justifyContent: 'center' },
  stepDotActive: { backgroundColor: colors.customer },
  stepText: { color: colors.muted, fontWeight: '800' },
  stepTextActive: { color: colors.white },
  vehicleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  vehicleCard: { width: '48%', borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 14, gap: 5 },
  vehicleCardActive: { borderColor: colors.customer, backgroundColor: colors.customerLight },
  vehicleName: { color: colors.ink, fontWeight: '800', fontSize: 14 },
  fieldGroup: { marginBottom: 12 },
  fieldLabel: { color: colors.muted, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.ink },
  inputReadonly: { backgroundColor: colors.faint },
  notice: { flexDirection: 'row', gap: 8, backgroundColor: '#FFFBEB', borderRadius: 12, padding: 12, marginBottom: 14 },
  noticeText: { flex: 1, color: '#92400E', fontSize: 12, fontWeight: '700' },
  payRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 14, marginBottom: 10 },
  payRowActive: { backgroundColor: colors.customerLight, borderColor: colors.customer },
  payText: { color: colors.ink, fontWeight: '800' },
  map: { height: 170, borderRadius: 18, backgroundColor: '#F0EBFF', overflow: 'hidden', marginBottom: 14 },
  mapRoad: { position: 'absolute', top: 72, left: -20, right: -20, height: 20, backgroundColor: '#DDD6FE', transform: [{ rotate: '-8deg' }] },
  mapRoadTwo: { top: 30, transform: [{ rotate: '12deg' }], opacity: 0.7 },
  mapRoute: { position: 'absolute', left: 72, top: 88, width: 190, height: 4, borderRadius: 2, backgroundColor: colors.customer },
  mapPinA: { position: 'absolute', left: 64, top: 78, width: 18, height: 18, borderRadius: 9, backgroundColor: colors.customer },
  mapPinB: { position: 'absolute', left: 248, top: 78, width: 18, height: 18, borderRadius: 9, backgroundColor: colors.green },
  vehiclePulse: { position: 'absolute', left: 144, top: 68, width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(124,58,237,0.14)' },
  vehiclePulseLive: { backgroundColor: 'rgba(5,150,105,0.16)' },
  vehicleMarker: { position: 'absolute', left: 153, top: 77, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.customer, alignItems: 'center', justifyContent: 'center' },
  vehicleMarkerLive: { backgroundColor: colors.green },
  etaChip: { position: 'absolute', right: 12, top: 12, backgroundColor: colors.white, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center' },
  etaValue: { color: colors.customer, fontSize: 20, fontWeight: '800' },
  etaLabel: { color: colors.muted, fontSize: 9, fontWeight: '800' },
  liveChip: { position: 'absolute', left: 12, top: 12, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.white, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 10 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.muted },
  liveDotOn: { backgroundColor: colors.green },
  liveText: { color: colors.ink, fontSize: 11, fontWeight: '800' },
  mapText: { position: 'absolute', left: 12, bottom: 12, right: 12, color: colors.ink, fontSize: 12, fontWeight: '800' },
  card: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 14, backgroundColor: colors.white, marginBottom: 12 },
  cardTitle: { color: colors.ink, fontWeight: '800', fontSize: 15 },
  driverCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 14, backgroundColor: colors.faint, marginBottom: 12 },
  driverAvatar: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.customer, alignItems: 'center', justifyContent: 'center' },
  driverAvatarText: { color: colors.white, fontWeight: '800' },
  rating: { color: '#92400E', fontWeight: '800', backgroundColor: '#FEF3C7', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10 },
  flex: { flex: 1 },
  timelineItem: { flexDirection: 'row', gap: 10, paddingVertical: 8 },
  timelineDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  timelineDone: { backgroundColor: colors.green },
  timelineActive: { backgroundColor: colors.customer },
  timelineTitle: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  fareCard: { backgroundColor: colors.customerLight, borderRadius: 16, padding: 14, marginBottom: 14 },
  otpCard: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 14, backgroundColor: colors.white, marginBottom: 12 },
  otpBox: { flex: 1, backgroundColor: colors.customerLight, borderRadius: 14, padding: 12, alignItems: 'center' },
  otpText: { color: colors.customer, fontSize: 22, fontWeight: '900', marginTop: 4 },
  fareLabel: { color: colors.customer, fontSize: 13 },
  fareValue: { color: colors.customer, fontSize: 13, fontWeight: '700' },
  bold: { fontWeight: '900', fontSize: 15 },
  divider: { height: 1, backgroundColor: '#C4B5FD', marginVertical: 8 },
  walletCard: { borderRadius: 18, padding: 20, borderWidth: 1, borderColor: colors.line, alignItems: 'center', gap: 10 },
  coinValue: { color: colors.customer, fontSize: 48, fontWeight: '900' },
  listRow: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  listText: { color: colors.ink, fontWeight: '700' },
  profileHero: { alignItems: 'center', paddingVertical: 18 },
  profileAvatar: { width: 70, height: 70, borderRadius: 22, backgroundColor: colors.customer, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  profileAvatarText: { color: colors.white, fontSize: 24, fontWeight: '900' },
  policyCard: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 14, backgroundColor: colors.white, marginBottom: 12 },
  policySummary: { color: colors.ink, fontSize: 13, fontWeight: '700', marginTop: 8, lineHeight: 18 },
  policySection: { marginTop: 10 },
  policyHeading: { color: colors.customer, fontSize: 13, fontWeight: '900', marginBottom: 4 },
  policyText: { color: colors.muted, fontSize: 12, lineHeight: 18, marginBottom: 4 },
  tabs: { height: 76, borderTopWidth: 1, borderTopColor: colors.line, flexDirection: 'row', backgroundColor: colors.white, paddingBottom: 8 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  tabText: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  tabTextActive: { color: colors.customer },
  tabDot: { position: 'absolute', right: -3, top: -3, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.red },
  primaryButton: { flex: 1, minHeight: 46, borderRadius: 14, backgroundColor: colors.customer, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, paddingHorizontal: 12 },
  primaryButtonText: { color: colors.white, fontWeight: '800' },
  secondaryButton: { flex: 1, minHeight: 46, borderRadius: 14, backgroundColor: colors.faint, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, paddingHorizontal: 12 },
  secondaryButtonText: { color: colors.ink, fontWeight: '800' },
  toast: { position: 'absolute', left: 16, right: 16, bottom: 88, backgroundColor: colors.ink, borderRadius: 14, padding: 14 },
  toastText: { color: colors.white, fontWeight: '800' },
  empty: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyTitle: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  errorTitle: { color: colors.red, fontSize: 18, fontWeight: '800', marginBottom: 6 }
});
