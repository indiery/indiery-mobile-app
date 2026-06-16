import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import Constants from 'expo-constants';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import RazorpayCheckout from 'react-native-razorpay';
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
  LocationDetails,
  LocationSuggestion,
  money,
  Order,
  PaymentMode,
  statusLabels,
  UserProfile,
  Vehicle
} from '@indiery/shared';

declare const process: { env?: Record<string, string | undefined> };
declare const __DEV__: boolean;

const apiBaseUrl =
  process?.env?.EXPO_PUBLIC_API_URL ||
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ||
  (__DEV__ ? 'http://localhost:4000/api' : '');
const allowInsecureApiBaseUrl =
  process?.env?.EXPO_PUBLIC_ALLOW_INSECURE_API_URL === 'true' ||
  Constants.expoConfig?.extra?.allowInsecureApiBaseUrl === true;

if (!apiBaseUrl) throw new Error('EXPO_PUBLIC_API_URL is required for production builds');
if (!__DEV__ && !apiBaseUrl.startsWith('https://') && !allowInsecureApiBaseUrl) {
  throw new Error('Production API URL must use HTTPS');
}

const socketUrl = apiBaseUrl.replace(/\/api\/?$/, '');

type Tab = 'home' | 'book' | 'track' | 'wallet' | 'profile';

const initialBooking = {
  pickup: 'Hazratganj',
  pickupPlaceId: '',
  pickupLat: undefined as number | undefined,
  pickupLng: undefined as number | undefined,
  drop: 'Gomti Nagar',
  dropPlaceId: '',
  dropLat: undefined as number | undefined,
  dropLng: undefined as number | undefined,
  goodsType: 'Documents',
  weightKg: '4',
  coins: '40',
  paymentMode: 'upi' as PaymentMode,
  vehicleId: ''
};

function needsCustomerProfile(user: UserProfile) {
  return !user.email || user.name === 'Indiery Customer';
}

function formatPhoneForFirebase(phoneInput: string) {
  const trimmed = phoneInput.trim();
  if (trimmed.startsWith('+')) return trimmed.replace(/[^\d+]/g, '');

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.startsWith('91') && digits.length === 12) return `+${digits}`;
  throw new Error('Enter a valid mobile number');
}

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
      const currentUser = auth().currentUser;
      if (!currentUser) {
        setData(null);
        return;
      }
      const firebaseIdToken = await currentUser.getIdToken();
      await completeFirebaseLogin(firebaseIdToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load app');
    } finally {
      setLoading(false);
    }
  }

  async function completeFirebaseLogin(firebaseIdToken: string) {
    setError('');
    const login = await api.firebaseLogin('customer', firebaseIdToken);
    api.setToken(login.token);
    const bootstrap = await api.customerBootstrap();
    setData(bootstrap);
    setTab('home');
    connectRealtime(login.token);
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

  function connectRealtime(token: string) {
    socketRef.current?.disconnect();
    const socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 600,
      reconnectionDelayMax: 3000
    });
    socketRef.current = socket;
    socket.on('connect', () => {
      refresh();
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
        weightKg: Number(booking.weightKg || 1),
        pickupLat: booking.pickupLat,
        pickupLng: booking.pickupLng,
        dropLat: booking.dropLat,
        dropLng: booking.dropLng
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
        paymentMode: booking.paymentMode,
        pickupLat: booking.pickupLat,
        pickupLng: booking.pickupLng,
        dropLat: booking.dropLat,
        dropLng: booking.dropLng
      };
      const result = await api.createOrder(input);
      let confirmedOrder = result.order;
      if (result.paymentIntent.checkout) {
        const payment = await RazorpayCheckout.open({
          key: result.paymentIntent.checkout.keyId,
          amount: Math.round(result.paymentIntent.amount * 100),
          currency: result.paymentIntent.currency,
          name: 'Indiery',
          description: result.order.orderNo,
          order_id: result.paymentIntent.checkout.orderId,
          prefill: {
            name: data?.user.name,
            email: data?.user.email,
            contact: data?.user.phone
          },
          notes: {
            orderNo: result.order.orderNo
          },
          theme: {
            color: colors.customer
          },
          modal: {
            confirm_close: true,
            handleback: true
          }
        });
        if (!payment.razorpay_order_id || !payment.razorpay_signature) {
          throw new Error('Payment verification details missing');
        }
        const verified = await api.verifyRazorpayPayment({
          orderId: result.order.id,
          razorpayOrderId: payment.razorpay_order_id,
          razorpayPaymentId: payment.razorpay_payment_id,
          razorpaySignature: payment.razorpay_signature
        });
        confirmedOrder = verified.order;
      }
      if (result.tripOtp) {
        setTripOtpByOrder((current) => ({ ...current, [result.order.id]: result.tripOtp! }));
      }
      await refresh();
      setStep(1);
      setFare(null);
      setBooking((current) => ({ ...initialBooking, vehicleId: current.vehicleId }));
      setTab('track');
      showToast(`${confirmedOrder.orderNo} booked`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Booking failed');
    } finally {
      setBusy(false);
    }
  }

  async function saveProfile(input: { name: string; email: string; city: string }) {
    setBusy(true);
    setError('');
    try {
      const result = await api.updateCustomerProfile(input);
      setData((current) => current ? { ...current, user: result.user } : current);
      showToast('Profile saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Profile update failed');
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    setError('');
    try {
      socketRef.current?.disconnect();
      socketRef.current = null;
      api.setToken('');
      await auth().signOut();
      setData(null);
      setTab('home');
      setStep(1);
      setFare(null);
      setBooking(initialBooking);
      setTripOtpByOrder({});
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Logout failed');
    } finally {
      setBusy(false);
    }
  }

  function requestAccountDeletion() {
    Alert.alert(
      'Request account deletion',
      'We will review your request and delete eligible account data. Some order, payment, fraud prevention, tax, or legal records may be retained where required.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit request',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await api.requestAccountDeletion('Requested from customer profile');
              showToast('Deletion request submitted');
            } catch (err) {
              showToast(err instanceof Error ? err.message : 'Request failed');
            } finally {
              setBusy(false);
            }
          }
        }
      ]
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={colors.customer} size="large" />
        <Text style={styles.muted}>Loading Indiery</Text>
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <LoginScreen initialError={error} onVerified={completeFirebaseLogin} />
    );
  }

  if (needsCustomerProfile(data.user)) {
    return (
      <ProfileSetupScreen
        user={data.user}
        busy={busy}
        error={error}
        onSave={saveProfile}
      />
    );
  }

  const activeOrder = data.activeOrder || data.orders.find((order) => !['delivered', 'cancelled'].includes(order.status));

  return (
    <SafeAreaView style={styles.shell}>
      <View style={styles.appHeader}>
        <View>
          <Text style={styles.eyebrow}>INDIERY</Text>
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
            api={api}
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
        {tab === 'profile' && <ProfileScreen data={data} onLogout={logout} onRequestAccountDeletion={requestAccountDeletion} />}
      </View>

      <BottomTabs active={tab} onChange={setTab} activeOrder={Boolean(activeOrder)} />
      {toast ? <View style={styles.toast}><Text style={styles.toastText}>{toast}</Text></View> : null}
    </SafeAreaView>
  );
}

function LoginScreen({
  initialError,
  onVerified
}: {
  initialError: string;
  onVerified: (firebaseIdToken: string) => Promise<void>;
}) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [confirmation, setConfirmation] = useState<FirebaseAuthTypes.ConfirmationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);

  useEffect(() => {
    setError(initialError);
  }, [initialError]);

  async function sendOtp() {
    setBusy(true);
    setError('');
    try {
      const result = await auth().signInWithPhoneNumber(formatPhoneForFirebase(phone));
      setConfirmation(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send OTP');
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp() {
    if (!confirmation) return;
    setBusy(true);
    setError('');
    try {
      const credential = await confirmation.confirm(code.trim());
      if (!credential?.user) throw new Error('Unable to verify OTP');
      const firebaseIdToken = await credential.user.getIdToken();
      await onVerified(firebaseIdToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid OTP');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.loginShell}>
      <KeyboardAvoidingView style={styles.authKeyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.authScroll} keyboardShouldPersistTaps="handled">
          <LoginHero title="Indiery" caption="Delivering trust, every mile." />
          <View style={styles.authForm}>
            <Text style={styles.authTitle}>Welcome Back</Text>
            <Text style={styles.loginSubtitle}>Login to book and manage your shipments</Text>
            <PhoneLoginField value={phone} onChangeText={setPhone} />
            {confirmation ? (
              <>
                <View style={styles.authNotice}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.customer} />
                  <Text style={styles.authNoticeText}>OTP sent. Enter the code to verify.</Text>
                </View>
                <AuthField label="OTP code" value={code} onChangeText={setCode} keyboardType="numeric" icon="key" maxLength={6} />
              </>
            ) : null}
            {error ? <Text style={styles.loginError}>{error}</Text> : null}
            <View style={styles.row}>
              {confirmation ? (
                <>
                  <SecondaryButton title="Change" icon="create" onPress={() => setConfirmation(null)} />
                  <AuthActionButton title={busy ? 'Verifying' : 'Verify'} onPress={verifyOtp} />
                </>
              ) : (
                <AuthActionButton title={busy ? 'Sending' : 'Send OTP'} onPress={sendOtp} />
              )}
            </View>
            <AuthDivider />
            <LoginFeatureRow />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function LoginHero({ title, caption }: { title: string; caption: string }) {
  return (
    <View style={styles.loginHero}>
      <View style={styles.loginSkyGlow} />
      <View style={styles.loginBrandRow}>
        <View style={styles.loginBrandIcon}>
          <Ionicons name="cube" size={23} color={colors.white} />
        </View>
        <Text style={styles.loginBrandText}>{title}</Text>
      </View>
      <Text style={styles.loginHeroCaption}>{caption}</Text>
      <DeliveryIllustration />
    </View>
  );
}

function DeliveryIllustration() {
  return (
    <View style={styles.deliveryArt}>
      <View style={[styles.skylineBlock, styles.skylineOne]} />
      <View style={[styles.skylineBlock, styles.skylineTwo]} />
      <View style={[styles.skylineBlock, styles.skylineThree]} />
      <View style={styles.heroGround} />
      <View style={styles.routeDashOne} />
      <View style={styles.routeDashTwo} />
      <Ionicons name="location" size={28} color={colors.customer} style={styles.routePinTop} />
      <Ionicons name="location" size={18} color={colors.customer} style={styles.routePinMid} />
      <View style={styles.boxStack}>
        <View style={styles.boxBack} />
        <View style={styles.boxFront} />
        <View style={styles.boxSmall} />
      </View>
      <View style={styles.truckShadow} />
      <View style={styles.truckTrailer}>
        <View style={styles.trailerStripe} />
      </View>
      <View style={styles.truckCab}>
        <View style={styles.truckWindshield} />
        <View style={styles.truckGrill} />
      </View>
      <View style={[styles.truckWheel, styles.truckWheelOne]} />
      <View style={[styles.truckWheel, styles.truckWheelTwo]} />
    </View>
  );
}

function PhoneLoginField({ value, onChangeText }: { value: string; onChangeText: (value: string) => void }) {
  return (
    <View style={styles.authFieldGroup}>
      <Text style={styles.fieldLabel}>Mobile Number</Text>
      <View style={styles.phoneInputShell}>
        <Ionicons name="phone-portrait-outline" size={18} color={colors.customer} />
        <Text style={styles.countryCode}>+91</Text>
        <Ionicons name="chevron-down" size={14} color={colors.muted} />
        <View style={styles.phoneDivider} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType="phone-pad"
          maxLength={10}
          placeholder="Enter your mobile number"
          placeholderTextColor="#9CA3AF"
          style={styles.phoneInputText}
        />
      </View>
    </View>
  );
}

function AuthActionButton({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable style={styles.authPrimaryButton} onPress={onPress}>
      <Text style={styles.authPrimaryButtonText}>{title}</Text>
    </Pressable>
  );
}

function AuthDivider() {
  return (
    <View style={styles.authDividerRow}>
      <View style={styles.authDividerLine} />
      <View style={styles.authDividerLine} />
    </View>
  );
}

function LoginFeatureRow() {
  const features: Array<{ icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string }> = [
    { icon: 'cube-outline', title: 'Real-time', subtitle: 'Tracking' },
    { icon: 'shield-checkmark-outline', title: 'Secure', subtitle: 'Deliveries' },
    { icon: 'document-text-outline', title: 'Smart', subtitle: 'Pricing' },
    { icon: 'headset-outline', title: '24/7', subtitle: 'Support' }
  ];
  return (
    <View style={styles.loginFeatureRow}>
      {features.map((feature) => (
        <View key={feature.subtitle} style={styles.loginFeatureItem}>
          <View style={styles.loginFeatureIcon}>
            <Ionicons name={feature.icon} size={20} color={colors.customer} />
          </View>
          <Text style={styles.loginFeatureTitle}>{feature.title}</Text>
          <Text style={styles.loginFeatureSubtitle}>{feature.subtitle}</Text>
        </View>
      ))}
    </View>
  );
}

function ProfileSetupScreen({
  user,
  busy,
  error,
  onSave
}: {
  user: UserProfile;
  busy: boolean;
  error: string;
  onSave: (input: { name: string; email: string; city: string }) => Promise<void>;
}) {
  const [name, setName] = useState(user.name === 'Indiery Customer' ? '' : user.name);
  const [email, setEmail] = useState(user.email || '');
  const [city, setCity] = useState(user.city || 'Lucknow');
  const [localError, setLocalError] = useState('');

  async function submit() {
    const nextName = name.trim();
    const nextEmail = email.trim();
    const nextCity = city.trim();
    if (nextName.length < 2) {
      setLocalError('Enter your full name');
      return;
    }
    if (!nextEmail.includes('@')) {
      setLocalError('Enter a valid email');
      return;
    }
    if (nextCity.length < 2) {
      setLocalError('Enter your city');
      return;
    }
    setLocalError('');
    await onSave({ name: nextName, email: nextEmail, city: nextCity });
  }

  return (
    <SafeAreaView style={styles.loginShell}>
      <KeyboardAvoidingView style={styles.authKeyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.profileSetupScroll} keyboardShouldPersistTaps="handled">
          <View style={styles.authHero}>
            <View style={styles.authTrackOne} />
            <View style={styles.authTrackTwo} />
            <View style={styles.authAccentLine} />
            <BrandLogo title="Indiery" accentColor={colors.customer} />
          </View>
          <View style={styles.authForm}>
            <Text style={styles.authKicker}>Almost there</Text>
            <Text style={styles.authTitle}>Profile</Text>
            <Text style={styles.loginSubtitle}>Complete your profile</Text>
            <AuthField label="Full name" value={name} onChangeText={setName} icon="person" />
            <AuthField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" icon="mail" autoCapitalize="none" />
            <AuthField label="City" value={city} onChangeText={setCity} icon="location" />
            <AuthField label="Mobile number" value={user.phone} editable={false} keyboardType="phone-pad" icon="call" />
            {localError || error ? <Text style={styles.loginError}>{localError || error}</Text> : null}
            <PrimaryButton title={busy ? 'Saving' : 'Continue'} icon="arrow-forward" onPress={submit} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function AuthField({
  label,
  value,
  onChangeText,
  keyboardType = 'default',
  editable = true,
  autoCapitalize = 'words',
  icon,
  maxLength
}: {
  label: string;
  value: string;
  onChangeText?: (value: string) => void;
  keyboardType?: 'default' | 'numeric' | 'phone-pad' | 'email-address';
  editable?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  icon: keyof typeof Ionicons.glyphMap;
  maxLength?: number;
}) {
  return (
    <View style={styles.authFieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.authInputShell, !editable && styles.authInputReadonly]}>
        <Ionicons name={icon} size={18} color={editable ? colors.customer : colors.muted} />
        <TextInput
          value={value}
          editable={editable}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          maxLength={maxLength}
          placeholderTextColor={colors.muted}
          style={styles.authInputText}
        />
      </View>
    </View>
  );
}

function BrandLogo({ title, accentColor }: { title: string; accentColor: string }) {
  const titleLetters = title.toUpperCase().split('');
  return (
    <View style={styles.brandLogo}>
      <View style={styles.brandMark}>
        <View style={styles.motionStack}>
          <View style={[styles.motionDot, { backgroundColor: accentColor }]} />
          <View style={[styles.motionLine, styles.motionLineWide, { backgroundColor: accentColor }]} />
          <View style={[styles.motionDot, { backgroundColor: accentColor }]} />
          <View style={[styles.motionLine, { backgroundColor: accentColor }]} />
          <View style={[styles.motionDot, { backgroundColor: accentColor }]} />
          <View style={[styles.motionLine, styles.motionLineShort, { backgroundColor: accentColor }]} />
        </View>
        <View style={styles.packageMark}>
          <Ionicons name="cube" size={54} color={colors.ink} />
          <View style={[styles.packageFace, { backgroundColor: accentColor }]} />
        </View>
        <View style={styles.routeMark}>
          <View style={styles.routeRoad} />
          <Ionicons name="location" size={42} color={accentColor} />
        </View>
      </View>
      <Text style={styles.loginTitle}>
        {titleLetters.map((letter, index) => (
          <Text key={`${letter}-${index}`} style={letter === 'I' && index > 0 ? { color: accentColor } : undefined}>
            {letter}
          </Text>
        ))}
      </Text>
      <View style={styles.taglineRow}>
        <View style={[styles.taglineRule, { backgroundColor: accentColor }]} />
        <Text style={styles.tagline}>SMART LAST-MILE LOGISTICS INDIA</Text>
        <View style={[styles.taglineRule, { backgroundColor: accentColor }]} />
      </View>
    </View>
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

function LocationPickerField({
  api,
  label,
  value,
  selected,
  onChangeText,
  onSelect
}: {
  api: IndieryApi;
  label: string;
  value: string;
  selected: boolean;
  onChangeText: (value: string) => void;
  onSelect: (location: LocationDetails) => void;
}) {
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [localError, setLocalError] = useState('');
  const requestSeqRef = useRef(0);
  const sessionTokenRef = useRef(`loc-${Date.now()}-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    const query = value.trim();
    if (!focused || selected || query.length < 3) {
      setSuggestions([]);
      setLocalError('');
      return;
    }

    const requestId = ++requestSeqRef.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const result = await api.autocompleteLocations(query, sessionTokenRef.current);
        if (requestId === requestSeqRef.current) {
          setSuggestions(result.suggestions);
          setLocalError('');
        }
      } catch {
        if (requestId === requestSeqRef.current) {
          setSuggestions([]);
          setLocalError('Location suggestions unavailable');
        }
      } finally {
        if (requestId === requestSeqRef.current) setLoading(false);
      }
    }, 320);

    return () => clearTimeout(timer);
  }, [api, focused, selected, value]);

  async function chooseSuggestion(suggestion: LocationSuggestion) {
    setLoading(true);
    setLocalError('');
    try {
      const result = await api.locationDetails(suggestion.placeId, sessionTokenRef.current);
      onSelect(result.location);
      setSuggestions([]);
      setFocused(false);
      sessionTokenRef.current = `loc-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    } catch {
      setLocalError('Could not select this location');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.locationFieldGroup}>
      <View style={styles.locationLabelRow}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {selected ? (
          <View style={styles.locationSelectedBadge}>
            <Ionicons name="checkmark-circle" size={13} color={colors.customer} />
            <Text style={styles.locationSelectedText}>Selected</Text>
          </View>
        ) : null}
      </View>
      <View style={[styles.locationInputShell, focused && styles.locationInputShellActive]}>
        <Ionicons name={label === 'Pickup' ? 'radio-button-on' : 'location'} size={18} color={colors.customer} />
        <TextInput
          value={value}
          onFocus={() => setFocused(true)}
          onChangeText={(nextValue) => {
            setFocused(true);
            onChangeText(nextValue);
          }}
          placeholder={`Search ${label.toLowerCase()} location`}
          placeholderTextColor={colors.muted}
          style={styles.locationInput}
        />
        {loading ? <ActivityIndicator size="small" color={colors.customer} /> : null}
      </View>
      {localError ? <Text style={styles.locationError}>{localError}</Text> : null}
      {suggestions.length ? (
        <View style={styles.locationSuggestionBox}>
          {suggestions.map((suggestion) => (
            <Pressable key={suggestion.placeId} style={styles.locationSuggestionItem} onPress={() => chooseSuggestion(suggestion)}>
              <Ionicons name="location-outline" size={18} color={colors.customer} />
              <View style={styles.flex}>
                <Text style={styles.locationSuggestionTitle}>{suggestion.mainText}</Text>
                {suggestion.secondaryText ? <Text style={styles.locationSuggestionSubtitle}>{suggestion.secondaryText}</Text> : null}
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}
      {!selected && value.trim().length >= 3 && !suggestions.length && !loading ? (
        <Text style={styles.locationHint}>Select a suggestion for accurate fare and tracking, or continue with typed text.</Text>
      ) : null}
    </View>
  );
}

function BookScreen({
  api,
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
  api: IndieryApi;
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
          <LocationPickerField
            api={api}
            label="Pickup"
            value={booking.pickup}
            selected={typeof booking.pickupLat === 'number' && typeof booking.pickupLng === 'number'}
            onChangeText={(pickup) =>
              setBooking((current) => ({
                ...current,
                pickup,
                pickupPlaceId: '',
                pickupLat: undefined,
                pickupLng: undefined
              }))
            }
            onSelect={(location) =>
              setBooking((current) => ({
                ...current,
                pickup: location.address || location.label,
                pickupPlaceId: location.placeId,
                pickupLat: location.lat,
                pickupLng: location.lng
              }))
            }
          />
          <LocationPickerField
            api={api}
            label="Drop"
            value={booking.drop}
            selected={typeof booking.dropLat === 'number' && typeof booking.dropLng === 'number'}
            onChangeText={(drop) =>
              setBooking((current) => ({
                ...current,
                drop,
                dropPlaceId: '',
                dropLat: undefined,
                dropLng: undefined
              }))
            }
            onSelect={(location) =>
              setBooking((current) => ({
                ...current,
                drop: location.address || location.label,
                dropPlaceId: location.placeId,
                dropLat: location.lat,
                dropLng: location.lng
              }))
            }
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
          {(['upi', 'card', 'netbanking', 'cash'] as PaymentMode[]).map((mode) => (
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

function ProfileScreen({
  data,
  onLogout,
  onRequestAccountDeletion
}: {
  data: CustomerBootstrap;
  onLogout: () => void;
  onRequestAccountDeletion: () => void;
}) {
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
      <Pressable style={styles.deleteAccountButton} onPress={onRequestAccountDeletion}>
        <Ionicons name="trash-outline" size={18} color={colors.red} />
        <Text style={styles.deleteAccountButtonText}>Request account deletion</Text>
      </Pressable>
      <Pressable style={styles.logoutButton} onPress={onLogout}>
        <Ionicons name="log-out-outline" size={18} color={colors.red} />
        <Text style={styles.logoutButtonText}>Logout</Text>
      </Pressable>
      <PolicyList />
    </ScrollView>
  );
}

function PolicyList() {
  const [openPolicy, setOpenPolicy] = useState<LegalPolicy['id'] | null>(null);

  return (
    <View style={styles.policyList}>
      <SectionTitle title="Policies and Legal" />
      {legalPolicies.map((policy) => (
        <PolicyCard
          key={policy.id}
          policy={policy}
          expanded={openPolicy === policy.id}
          onToggle={() => setOpenPolicy((current) => (current === policy.id ? null : policy.id))}
        />
      ))}
    </View>
  );
}

function PolicyCard({
  policy,
  expanded,
  onToggle
}: {
  policy: LegalPolicy;
  expanded: boolean;
  onToggle: () => void;
}) {
  const icons: Record<LegalPolicy['id'], keyof typeof Ionicons.glyphMap> = {
    privacy: 'lock-closed',
    terms: 'document-text',
    refunds: 'cash'
  };

  return (
    <View style={styles.policyCard}>
      <Pressable style={styles.policyHeader} onPress={onToggle}>
        <View style={styles.policyIcon}>
          <Ionicons name={icons[policy.id]} size={18} color={colors.customer} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.cardTitle}>{policy.title}</Text>
          <Text style={styles.mutedSmall}>Updated {policy.updatedAt}</Text>
          <Text style={styles.policySummary}>{policy.summary}</Text>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
      </Pressable>
      {expanded ? (
        <View style={styles.policyBody}>
          {policy.sections.map((section) => (
            <View key={section.heading} style={styles.policySection}>
              <Text style={styles.policyHeading}>{section.heading}</Text>
              {section.body.map((line) => (
                <Text key={line} style={styles.policyText}>{line}</Text>
              ))}
            </View>
          ))}
        </View>
      ) : null}
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
  keyboardType?: 'default' | 'numeric' | 'phone-pad' | 'email-address';
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
  loginShell: { flex: 1, backgroundColor: colors.white },
  authKeyboard: { flex: 1 },
  authScroll: { flexGrow: 1, backgroundColor: colors.white },
  profileSetupScroll: { flexGrow: 1, backgroundColor: colors.white },
  loginHero: {
    minHeight: 330,
    backgroundColor: colors.customerLight,
    paddingHorizontal: 18,
    paddingTop: 24,
    overflow: 'hidden'
  },
  loginSkyGlow: {
    position: 'absolute',
    right: -48,
    top: -58,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: '#FFFFFF',
    opacity: 0.75
  },
  loginBrandRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  loginBrandIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.customer,
    alignItems: 'center',
    justifyContent: 'center'
  },
  loginBrandText: { color: colors.ink, fontSize: 25, fontWeight: '900' },
  loginHeroCaption: { color: colors.ink, fontSize: 14, fontWeight: '800', lineHeight: 19, marginTop: 10, maxWidth: 145 },
  deliveryArt: { height: 220, marginTop: -2 },
  skylineBlock: { position: 'absolute', bottom: 43, borderRadius: 12, backgroundColor: '#DDEAF8', opacity: 0.9 },
  skylineOne: { left: -8, width: 26, height: 82 },
  skylineTwo: { right: 64, width: 28, height: 112 },
  skylineThree: { right: 18, width: 34, height: 72 },
  routeDashOne: {
    position: 'absolute',
    right: 40,
    top: 14,
    width: 88,
    borderTopWidth: 1.5,
    borderTopColor: colors.customer,
    borderStyle: 'dashed',
    transform: [{ rotate: '-27deg' }]
  },
  routeDashTwo: {
    position: 'absolute',
    right: 104,
    top: 56,
    width: 58,
    borderTopWidth: 1.5,
    borderTopColor: colors.customer,
    borderStyle: 'dashed',
    transform: [{ rotate: '-37deg' }]
  },
  routePinTop: { position: 'absolute', right: 20, top: -2 },
  routePinMid: { position: 'absolute', right: 96, top: 50 },
  boxStack: { position: 'absolute', left: 8, bottom: 39, width: 88, height: 72 },
  boxBack: { position: 'absolute', left: 26, bottom: 18, width: 44, height: 38, borderRadius: 4, backgroundColor: '#C98743' },
  boxFront: { position: 'absolute', left: 0, bottom: 0, width: 48, height: 42, borderRadius: 4, backgroundColor: '#D99A50' },
  boxSmall: { position: 'absolute', left: 44, bottom: 0, width: 34, height: 31, borderRadius: 4, backgroundColor: '#E8B06B' },
  truckShadow: { position: 'absolute', left: 82, right: 14, bottom: 34, height: 12, borderRadius: 12, backgroundColor: '#B8C7D8', opacity: 0.6 },
  truckTrailer: { position: 'absolute', right: 14, bottom: 66, width: 154, height: 62, borderRadius: 7, backgroundColor: '#EAF2FB', borderWidth: 1, borderColor: '#CAD7E8' },
  trailerStripe: { position: 'absolute', left: 12, right: 12, top: 18, height: 3, borderRadius: 3, backgroundColor: '#D5E1F0' },
  truckCab: { position: 'absolute', right: 156, bottom: 58, width: 72, height: 78, borderRadius: 10, backgroundColor: colors.customer },
  truckWindshield: { position: 'absolute', right: 9, top: 9, width: 42, height: 26, borderRadius: 6, backgroundColor: '#0F2A55' },
  truckGrill: { position: 'absolute', left: 8, bottom: 12, width: 52, height: 9, borderRadius: 5, backgroundColor: '#063D8F' },
  truckWheel: { position: 'absolute', bottom: 50, width: 23, height: 23, borderRadius: 12, backgroundColor: colors.ink, borderWidth: 5, borderColor: '#7FA9D9' },
  truckWheelOne: { right: 136 },
  truckWheelTwo: { right: 34 },
  heroGround: { position: 'absolute', left: -18, right: -18, bottom: 30, height: 15, backgroundColor: '#DFE9F5' },
  authHero: {
    minHeight: 350,
    backgroundColor: colors.customerLight,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 44,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden'
  },
  authTrackOne: {
    position: 'absolute',
    left: -34,
    right: -24,
    bottom: 46,
    height: 22,
    borderRadius: 18,
    backgroundColor: colors.ink,
    opacity: 0.12,
    transform: [{ rotate: '-11deg' }]
  },
  authTrackTwo: {
    position: 'absolute',
    left: 180,
    right: -60,
    top: 86,
    height: 18,
    borderRadius: 16,
    backgroundColor: colors.customer,
    opacity: 0.16,
    transform: [{ rotate: '15deg' }]
  },
  authAccentLine: {
    position: 'absolute',
    left: 22,
    right: 22,
    bottom: 0,
    height: 4,
    borderRadius: 4,
    backgroundColor: colors.customer
  },
  authForm: {
    flexGrow: 1,
    backgroundColor: colors.white,
    paddingHorizontal: 22,
    paddingTop: 30,
    paddingBottom: 26
  },
  authKicker: { color: colors.customer, fontSize: 12, fontWeight: '900', textTransform: 'uppercase', marginBottom: 8 },
  authTitle: { color: colors.ink, fontSize: 32, fontWeight: '900', marginBottom: 6 },
  authFieldGroup: { marginBottom: 14 },
  authInputShell: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14
  },
  authInputReadonly: { backgroundColor: colors.faint },
  authInputText: { flex: 1, color: colors.ink, fontSize: 16, fontWeight: '800', paddingVertical: 12 },
  phoneInputShell: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: '#D7E0EA',
    borderRadius: 8,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12
  },
  countryCode: { color: colors.ink, fontSize: 14, fontWeight: '800', marginLeft: 7 },
  phoneDivider: { width: 1, height: 24, backgroundColor: colors.line, marginHorizontal: 10 },
  phoneInputText: { flex: 1, color: colors.ink, fontSize: 13, fontWeight: '700', paddingVertical: 12 },
  authPrimaryButton: { flex: 1, minHeight: 50, borderRadius: 8, backgroundColor: colors.customer, alignItems: 'center', justifyContent: 'center' },
  authPrimaryButtonText: { color: colors.white, fontSize: 14, fontWeight: '900' },
  authDividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 18 },
  authDividerLine: { flex: 1, height: 1, backgroundColor: colors.line },
  loginFeatureRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  loginFeatureItem: { flex: 1, alignItems: 'center', gap: 4 },
  loginFeatureIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.customerLight, alignItems: 'center', justifyContent: 'center' },
  loginFeatureTitle: { color: colors.ink, fontSize: 9, fontWeight: '900', textAlign: 'center' },
  loginFeatureSubtitle: { color: colors.muted, fontSize: 8, fontWeight: '800', textAlign: 'center' },
  authNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    backgroundColor: colors.customerLight,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12
  },
  authNoticeText: { flex: 1, color: colors.ink, fontSize: 12, fontWeight: '800' },
  authFootnote: { color: colors.muted, fontSize: 11, fontWeight: '700', textAlign: 'center', lineHeight: 16, marginTop: 4 },
  loginPanel: { backgroundColor: colors.white, borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 18 },
  brandLogo: { alignItems: 'center' },
  brandMark: { width: 222, height: 140, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  motionStack: { position: 'absolute', left: 14, top: 36, gap: 8 },
  motionDot: { width: 10, height: 10, borderRadius: 5 },
  motionLine: { width: 66, height: 9, borderRadius: 8, marginLeft: 18 },
  motionLineWide: { width: 86 },
  motionLineShort: { width: 48 },
  packageMark: { position: 'absolute', top: 18, left: 82, width: 72, height: 70, alignItems: 'center', justifyContent: 'center' },
  packageFace: { position: 'absolute', left: 5, bottom: 8, width: 28, height: 36, borderRadius: 2, opacity: 0.95 },
  routeMark: { position: 'absolute', right: 8, bottom: 10, width: 104, height: 58, alignItems: 'flex-end', justifyContent: 'center' },
  routeRoad: { position: 'absolute', left: 0, bottom: 6, width: 86, height: 15, borderRadius: 16, backgroundColor: colors.ink, transform: [{ rotate: '-24deg' }] },
  loginTitle: { color: colors.ink, fontSize: 31, fontWeight: '900', letterSpacing: 6, textAlign: 'center' },
  taglineRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 6 },
  taglineRule: { width: 50, height: 2, borderRadius: 2 },
  tagline: { color: colors.muted, fontSize: 9, fontWeight: '900', letterSpacing: 1, textAlign: 'center' },
  loginSubtitle: { color: colors.muted, fontSize: 14, fontWeight: '700', marginBottom: 22 },
  loginError: { color: colors.red, fontSize: 12, fontWeight: '800', marginBottom: 12 },
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
  locationFieldGroup: { marginBottom: 14 },
  locationLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  locationInputShell: { minHeight: 50, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12 },
  locationInputShellActive: { borderColor: colors.customer, backgroundColor: '#FBFAFF' },
  locationInput: { flex: 1, color: colors.ink, fontSize: 15, fontWeight: '800', paddingVertical: 10 },
  locationSelectedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.customerLight, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 8 },
  locationSelectedText: { color: colors.customer, fontSize: 10, fontWeight: '900' },
  locationSuggestionBox: { borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.white, marginTop: 8, overflow: 'hidden' },
  locationSuggestionItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.line },
  locationSuggestionTitle: { color: colors.ink, fontSize: 13, fontWeight: '900' },
  locationSuggestionSubtitle: { color: colors.muted, fontSize: 11, fontWeight: '700', marginTop: 2 },
  locationHint: { color: colors.muted, fontSize: 11, fontWeight: '700', marginTop: 7, lineHeight: 15 },
  locationError: { color: colors.red, fontSize: 11, fontWeight: '800', marginTop: 7 },
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
  policyList: { marginTop: 4, marginBottom: 12 },
  policyCard: { borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.white, marginBottom: 10, overflow: 'hidden' },
  policyHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  policyIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.customerLight, alignItems: 'center', justifyContent: 'center' },
  policySummary: { color: colors.ink, fontSize: 12, fontWeight: '700', marginTop: 5, lineHeight: 17 },
  policyBody: { borderTopWidth: 1, borderTopColor: colors.line, paddingHorizontal: 14, paddingBottom: 12, backgroundColor: '#FAFAFE' },
  policySection: { marginTop: 12 },
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
  deleteAccountButton: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: '#FECACA', backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 6, marginBottom: 10 },
  deleteAccountButtonText: { color: colors.red, fontWeight: '900' },
  logoutButton: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: '#FECACA', backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 6, marginBottom: 12 },
  logoutButtonText: { color: colors.red, fontWeight: '900' },
  toast: { position: 'absolute', left: 16, right: 16, bottom: 88, backgroundColor: colors.ink, borderRadius: 14, padding: 14 },
  toastText: { color: colors.white, fontWeight: '800' },
  empty: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyTitle: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  errorTitle: { color: colors.red, fontSize: 18, fontWeight: '800', marginBottom: 6 }
});
