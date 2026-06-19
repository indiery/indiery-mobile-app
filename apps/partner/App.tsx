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
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import RazorpayCheckout from 'react-native-razorpay';
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
const minPartnerWalletBalance = 200;

type Tab = 'dashboard' | 'orders' | 'active' | 'earnings' | 'kyc';
type KycDoc = 'selfie' | 'pan' | 'aadhaar' | 'drivingLicence' | 'rc';
type BankDetailsInput = { accountHolder: string; accountNumber: string; ifsc: string };

function formatPhoneForFirebase(phoneInput: string) {
  const trimmed = phoneInput.trim();
  if (trimmed.startsWith('+')) return trimmed.replace(/[^\d+]/g, '');

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.startsWith('91') && digits.length === 12) return `+${digits}`;
  throw new Error('Enter a valid mobile number');
}

function needsPartnerProfile(user: UserProfile) {
  return !user.email || user.name === 'Indiery Partner' || !user.partnerProfile?.vehicleId;
}

function kycProgress(user: UserProfile) {
  const docs = user.partnerProfile?.docs;
  const steps = [
    Boolean(docs?.selfie),
    Boolean(docs?.pan || docs?.aadhaar),
    Boolean(docs?.drivingLicence),
    Boolean(docs?.rc),
    Boolean(docs?.bank)
  ];
  return {
    completed: steps.filter(Boolean).length,
    total: steps.length,
    complete: steps.every(Boolean)
  };
}

function needsPartnerKyc(user: UserProfile) {
  return user.partnerProfile?.kycStatus !== 'verified';
}

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
  const [selectedActiveOrderId, setSelectedActiveOrderId] = useState<string | undefined>();
  const activeOrderIds = (data?.activeOrders ?? []).map((order) => order.id).join('|');

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
  }, [data?.user.partnerProfile?.online, activeOrderIds]);

  useEffect(() => {
    if (!data?.activeOrders.length) {
      setSelectedActiveOrderId(undefined);
      return;
    }
    if (!selectedActiveOrderId || !data.activeOrders.some((order) => order.id === selectedActiveOrderId)) {
      setSelectedActiveOrderId(data.activeOrders[0].id);
    }
  }, [activeOrderIds, selectedActiveOrderId]);

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
      setError(err instanceof Error ? err.message : 'Unable to load partner app');
    } finally {
      setLoading(false);
    }
  }

  async function completeFirebaseLogin(firebaseIdToken: string) {
    setError('');
    const login = await api.firebaseLogin('partner', firebaseIdToken);
    api.setToken(login.token);
    const bootstrap = await api.partnerBootstrap();
    setData(bootstrap);
    setTab('dashboard');
    connectRealtime(login.token);
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
    if (['accepted', 'arrived_pickup', 'picked_up', 'in_transit'].includes(order.status)) {
      setSelectedActiveOrderId(order.id);
      setTab('active');
    }
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
      scheduleRefresh(200);
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

  async function captureAndUploadImage(input: { purpose: 'pod' | 'kyc' | 'profile'; orderId?: string; documentKey?: string }) {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== 'granted') {
      throw new Error('Camera permission is required to capture proof');
    }

    const picked = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.75
    });
    if (picked.canceled || !picked.assets[0]) throw new Error('No image captured');

    const asset = picked.assets[0];
    const signature = await api.createCloudinarySignature(input);
    const uploaded = await uploadFileToCloudinary(asset.uri, signature.upload, {
      fileName: asset.fileName ?? `indiery-${input.purpose}-${Date.now()}.jpg`,
      mimeType: asset.mimeType ?? 'image/jpeg'
    });
    return uploaded.secureUrl;
  }

  async function saveProfile(input: { name: string; email: string; city: string; vehicleId: string; vehicleNumber: string }) {
    setBusy(true);
    setError('');
    try {
      const result = await api.updatePartnerProfile(input);
      setData((current) => current ? { ...current, user: result.user } : current);
      showToast('Profile saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Profile update failed');
    } finally {
      setBusy(false);
    }
  }

  async function captureKycDocument(doc: KycDoc) {
    const photoUrl = await captureAndUploadImage({ purpose: 'kyc', documentKey: doc });
    await api.uploadKyc(doc, { photoUrl });
    await refresh();
    showToast('KYC photo captured');
  }

  async function submitKycBankDetails(bankDetails: BankDetailsInput) {
    await api.uploadKyc('bank', { bankDetails });
    await refresh();
    showToast('Bank details saved');
  }

  async function topUpPartnerWallet(amount: number, paymentMode: 'upi' | 'card' | 'netbanking' = 'upi') {
    if (!data) return;
    setBusy(true);
    try {
      const result = await api.createPartnerWalletTopup({ amount, paymentMode });
      const checkout = result.paymentIntent.checkout;
      if (!checkout) throw new Error('Wallet recharge is not available');
      const payment = await RazorpayCheckout.open({
        key: checkout.keyId,
        amount: Math.round(result.paymentIntent.amount * 100),
        currency: result.paymentIntent.currency,
        name: 'Indiery Partner',
        description: 'Driver wallet recharge',
        order_id: checkout.orderId,
        prefill: {
          name: data.user.name,
          email: data.user.email,
          contact: data.user.phone
        },
        notes: {
          wallet: 'partner'
        },
        theme: {
          color: colors.partner
        },
        modal: {
          confirm_close: true,
          handleback: true
        }
      });
      if (!payment.razorpay_order_id || !payment.razorpay_signature) {
        throw new Error('Payment verification details missing');
      }
      const verified = await api.verifyPartnerWalletTopup({
        razorpayOrderId: payment.razorpay_order_id,
        razorpayPaymentId: payment.razorpay_payment_id,
        razorpaySignature: payment.razorpay_signature
      });
      setData((current) => current ? { ...current, user: verified.user } : current);
      await refresh();
      showToast('Wallet recharged');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Wallet recharge failed');
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    setError('');
    try {
      if (data?.user.partnerProfile?.online) {
        await api.setAvailability(false).catch(() => undefined);
      }
      stopLocationStream();
      socketRef.current?.disconnect();
      socketRef.current = null;
      api.setToken('');
      await auth().signOut();
      setData(null);
      setTab('dashboard');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Logout failed');
    } finally {
      setBusy(false);
    }
  }

  function requestAccountDeletion() {
    Alert.alert(
      'Request account deletion',
      'We will review your request and delete eligible account data. Some order, payout, KYC, fraud prevention, tax, or legal records may be retained where required.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit request',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await api.requestAccountDeletion('Requested from partner KYC screen');
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
        <ActivityIndicator color={colors.partner} size="large" />
        <Text style={styles.muted}>Loading Indiery Partner</Text>
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <LoginScreen initialError={error} onVerified={completeFirebaseLogin} />
    );
  }

  if (needsPartnerProfile(data.user)) {
    return (
      <ProfileSetupScreen
        user={data.user}
        vehicles={data.vehicles}
        busy={busy}
        error={error}
        onSave={saveProfile}
      />
    );
  }

  if (needsPartnerKyc(data.user)) {
    return (
      <SafeAreaView style={styles.shell}>
        <View style={styles.appHeader}>
          <View>
            <Text style={styles.eyebrow}>INDIERY PARTNER</Text>
            <Text style={styles.headerTitle}>Complete KYC</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{data.user.initials}</Text>
          </View>
        </View>
        <View style={styles.content}>
          <KycScreen
            user={data.user}
            busy={busy}
            gated
            onLogout={logout}
            onRequestAccountDeletion={requestAccountDeletion}
            onCapture={(doc) => withBusy(() => captureKycDocument(doc))}
            onSubmitBank={(bankDetails) => withBusy(() => submitKycBankDetails(bankDetails))}
          />
        </View>
        {toast ? <View style={styles.toast}><Text style={styles.toastText}>{toast}</Text></View> : null}
      </SafeAreaView>
    );
  }

  const activeOrder = data.activeOrders.find((order) => order.id === selectedActiveOrderId) ?? data.activeOrders[0];

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
            onTopup={(amount) => topUpPartnerWallet(amount)}
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
                const accepted = await api.acceptOrder(orderId);
                setSelectedActiveOrderId(accepted.order.id);
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
            orders={data.activeOrders}
            selectedOrderId={activeOrder?.id}
            busy={busy}
            refresh={refresh}
            onSelectOrder={setSelectedActiveOrderId}
            onOtp={(orderId, type, otp) =>
              withBusy(async () => {
                await api.verifyOrderOtp(orderId, type, otp);
                await refresh();
                showToast(`${type} OTP verified`);
              })
            }
            onPod={(orderId, type) =>
              withBusy(async () => {
                const photoUrl = await captureAndUploadImage({ purpose: 'pod', orderId, documentKey: type });
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
            onTopup={(amount) => topUpPartnerWallet(amount)}
          />
        )}
        {tab === 'kyc' && (
          <KycScreen
            user={data.user}
            busy={busy}
            onLogout={logout}
            onRequestAccountDeletion={requestAccountDeletion}
            onCapture={(doc) => withBusy(() => captureKycDocument(doc))}
            onSubmitBank={(bankDetails) => withBusy(() => submitKycBankDetails(bankDetails))}
          />
        )}
      </View>

      <BottomTabs active={tab} onChange={setTab} availableCount={data.availableOrders.length} activeCount={data.activeOrders.length} />
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
          <LoginHero title="Indiery Partner" caption="Delivering trust, every mile." />
          <View style={styles.authForm}>
            <Text style={styles.authTitle}>Welcome Back</Text>
            <Text style={styles.loginSubtitle}>Login to manage your deliveries</Text>
            <PhoneLoginField value={phone} onChangeText={setPhone} />
            {confirmation ? (
              <>
                <View style={styles.authNotice}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.partner} />
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
      <Ionicons name="location" size={28} color={colors.partner} style={styles.routePinTop} />
      <Ionicons name="location" size={18} color={colors.partner} style={styles.routePinMid} />
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
        <Ionicons name="phone-portrait-outline" size={18} color={colors.partner} />
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
    { icon: 'cube-outline', title: 'Live', subtitle: 'Orders' },
    { icon: 'shield-checkmark-outline', title: 'Secure', subtitle: 'KYC' },
    { icon: 'document-text-outline', title: 'Smart', subtitle: 'Payouts' },
    { icon: 'headset-outline', title: '24/7', subtitle: 'Support' }
  ];
  return (
    <View style={styles.loginFeatureRow}>
      {features.map((feature) => (
        <View key={feature.subtitle} style={styles.loginFeatureItem}>
          <View style={styles.loginFeatureIcon}>
            <Ionicons name={feature.icon} size={20} color={colors.partner} />
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
  vehicles,
  busy,
  error,
  onSave
}: {
  user: UserProfile;
  vehicles: Vehicle[];
  busy: boolean;
  error: string;
  onSave: (input: { name: string; email: string; city: string; vehicleId: string; vehicleNumber: string }) => Promise<void>;
}) {
  const [name, setName] = useState(user.name === 'Indiery Partner' ? '' : user.name);
  const [email, setEmail] = useState(user.email || '');
  const [city, setCity] = useState(user.city || 'Lucknow');
  const [vehicleId, setVehicleId] = useState(user.partnerProfile?.vehicleId || vehicles[0]?.id || '');
  const [vehicleNumber, setVehicleNumber] = useState(user.partnerProfile?.vehicleNumber || '');
  const [localError, setLocalError] = useState('');

  async function submit() {
    const nextName = name.trim();
    const nextEmail = email.trim();
    const nextCity = city.trim();
    const nextVehicleNumber = vehicleNumber.trim().toUpperCase();
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
    if (!vehicleId) {
      setLocalError('Select your vehicle type');
      return;
    }
    setLocalError('');
    await onSave({ name: nextName, email: nextEmail, city: nextCity, vehicleId, vehicleNumber: nextVehicleNumber });
  }

  return (
    <SafeAreaView style={styles.loginShell}>
      <KeyboardAvoidingView style={styles.authKeyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.profileSetupScroll} keyboardShouldPersistTaps="handled">
          <View style={styles.authHero}>
            <View style={styles.authTrackOne} />
            <View style={styles.authTrackTwo} />
            <View style={styles.authAccentLine} />
            <BrandLogo title="Indiery Partner" accentColor={colors.partner} />
          </View>
          <View style={styles.authForm}>
            <Text style={styles.authKicker}>Almost there</Text>
            <Text style={styles.authTitle}>Profile</Text>
            <Text style={styles.loginSubtitle}>Complete your partner profile</Text>
            <AuthField label="Full name" value={name} onChangeText={setName} icon="person" />
            <AuthField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" icon="mail" autoCapitalize="none" />
            <AuthField label="City" value={city} onChangeText={setCity} icon="location" />
            <VehiclePicker vehicles={vehicles} selectedId={vehicleId} onSelect={setVehicleId} />
            <AuthField label="Vehicle number" value={vehicleNumber} onChangeText={setVehicleNumber} icon="bicycle" autoCapitalize="characters" />
            <AuthField label="Mobile number" value={user.phone} editable={false} keyboardType="phone-pad" icon="call" />
            {localError || error ? <Text style={styles.loginError}>{localError || error}</Text> : null}
            <PrimaryButton title={busy ? 'Saving' : 'Continue'} icon="arrow-forward" onPress={submit} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function VehiclePicker({
  vehicles,
  selectedId,
  onSelect
}: {
  vehicles: Vehicle[];
  selectedId: string;
  onSelect: (vehicleId: string) => void;
}) {
  return (
    <View style={styles.authFieldGroup}>
      <Text style={styles.fieldLabel}>Vehicle type</Text>
      <View style={styles.vehicleChoiceList}>
        {vehicles.map((vehicle) => {
          const selected = vehicle.id === selectedId;
          return (
            <Pressable
              key={vehicle.id}
              style={[styles.vehicleChoice, selected && styles.vehicleChoiceSelected]}
              onPress={() => onSelect(vehicle.id)}
            >
              <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={selected ? colors.partner : colors.muted} />
              <View style={styles.flex}>
                <Text style={styles.vehicleChoiceTitle}>{vehicle.shortName}</Text>
                <Text style={styles.vehicleChoiceMeta}>Up to {vehicle.capacityKg} kg</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
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
        <Ionicons name={icon} size={18} color={editable ? colors.partner : colors.muted} />
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

function DashboardScreen({
  data,
  busy,
  onToggle,
  onOrders,
  onActive,
  onTopup
}: {
  data: PartnerBootstrap;
  busy: boolean;
  onToggle: () => void;
  onOrders: () => void;
  onActive: () => void;
  onTopup: (amount: number) => void;
}) {
  const profile = data.user.partnerProfile;
  const online = Boolean(profile?.online);
  const balance = profile?.walletBalance ?? 0;
  const walletReady = balance >= minPartnerWalletBalance;
  const rechargeAmount = Math.max(50, Math.ceil(minPartnerWalletBalance - balance));
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      {!walletReady ? (
        <View style={styles.walletBlockCard}>
          <View style={styles.walletBlockHeader}>
            <Ionicons name="wallet-outline" size={22} color={colors.amber} />
            <View style={styles.flex}>
              <Text style={styles.cardTitle}>Recharge driver wallet</Text>
              <Text style={styles.mutedSmall}>Minimum {money(minPartnerWalletBalance)} balance is required to receive new orders.</Text>
            </View>
          </View>
          <Text style={styles.walletBlockBalance}>Current balance: {money(balance)}</Text>
          <PrimaryButton title={`Recharge ${money(rechargeAmount)}`} icon="add-circle" onPress={() => onTopup(rechargeAmount)} />
        </View>
      ) : null}

      <Pressable style={[styles.onlineCard, online && styles.onlineCardActive, !walletReady && styles.onlineCardDisabled]} onPress={walletReady ? onToggle : () => onTopup(rechargeAmount)}>
        <Text style={[styles.onlineText, online && styles.onlineTextActive]}>{busy ? 'SYNCING' : online ? 'ONLINE' : walletReady ? 'OFFLINE' : 'RECHARGE'}</Text>
        <Text style={styles.muted}>{walletReady ? (online ? 'Receiving nearby orders' : 'Tap to start receiving orders') : 'Wallet below minimum'}</Text>
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
  orders,
  selectedOrderId,
  busy,
  refresh,
  onSelectOrder,
  onOtp,
  onPod,
  onStatus
}: {
  orders: Order[];
  selectedOrderId?: string;
  busy: boolean;
  refresh: () => void;
  onSelectOrder: (orderId: string) => void;
  onOtp: (orderId: string, type: 'pickup' | 'drop', otp: string) => void;
  onPod: (orderId: string, type: 'pickup' | 'drop') => void;
  onStatus: (orderId: string, status: 'arrived_pickup' | 'picked_up' | 'in_transit' | 'delivered') => void;
}) {
  const [otp, setOtp] = useState('');
  const order = orders.find((item) => item.id === selectedOrderId) ?? orders[0];
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
      {orders.length > 1 ? (
        <>
          <SectionTitle title={`Active Trips (${orders.length})`} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeTripSwitchRow}>
            {orders.map((item) => {
              const selected = item.id === order.id;
              return (
                <Pressable
                  key={item.id}
                  style={[styles.activeTripSwitchCard, selected && styles.activeTripSwitchCardSelected]}
                  onPress={() => onSelectOrder(item.id)}
                >
                  <Text style={[styles.activeTripSwitchTitle, selected && styles.activeTripSwitchTitleSelected]}>{item.orderNo}</Text>
                  <Text style={styles.activeTripSwitchMeta} numberOfLines={1}>
                    {item.pickup.label} to {item.drop.label}
                  </Text>
                  <Text style={styles.activeTripSwitchMeta}>{statusLabels[item.status]}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </>
      ) : null}
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

function EarningsScreen({
  data,
  busy,
  onPayout,
  onTopup
}: {
  data: PartnerBootstrap;
  busy: boolean;
  onPayout: () => void;
  onTopup: (amount: number) => void;
}) {
  const profile = data.user.partnerProfile;
  const balance = profile?.walletBalance ?? 0;
  const walletReady = balance >= minPartnerWalletBalance;
  const rechargeAmount = Math.max(50, Math.ceil(minPartnerWalletBalance - balance));
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.walletCard}>
        <Text style={styles.eyebrowDark}>WALLET BALANCE</Text>
        <Text style={styles.walletValue}>{money(balance)}</Text>
        <Text style={styles.muted}>
          {walletReady ? `${profile?.weeklyOrders ?? 0} trips this week` : `Recharge ${money(rechargeAmount)} to unlock new orders`}
        </Text>
        {!walletReady ? (
          <PrimaryButton title={busy ? 'Opening' : `Recharge ${money(rechargeAmount)}`} icon="add-circle" onPress={() => onTopup(rechargeAmount)} />
        ) : null}
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

function KycScreen({
  user,
  busy,
  onCapture,
  onSubmitBank,
  onLogout,
  onRequestAccountDeletion,
  gated = false
}: {
  user: UserProfile;
  busy: boolean;
  onCapture: (doc: KycDoc) => void;
  onSubmitBank: (bankDetails: BankDetailsInput) => void;
  onLogout: () => void;
  onRequestAccountDeletion: () => void;
  gated?: boolean;
}) {
  const docs = user.partnerProfile?.docs;
  const bankDetails = user.partnerProfile?.bankDetails;
  const progress = kycProgress(user);
  const identityDone = Boolean(docs?.pan || docs?.aadhaar);
  const [accountHolder, setAccountHolder] = useState(bankDetails?.accountHolder || user.name);
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState(bankDetails?.ifsc || '');
  const [bankError, setBankError] = useState('');

  function submitBank() {
    const nextAccountHolder = accountHolder.trim();
    const nextAccountNumber = accountNumber.replace(/\D/g, '');
    const nextIfsc = ifsc.trim().toUpperCase();
    if (nextAccountHolder.length < 2) {
      setBankError('Enter account holder name');
      return;
    }
    if (!/^\d{9,18}$/.test(nextAccountNumber)) {
      setBankError('Enter a valid account number');
      return;
    }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(nextIfsc)) {
      setBankError('Enter a valid IFSC code');
      return;
    }
    setBankError('');
    onSubmitBank({ accountHolder: nextAccountHolder, accountNumber: nextAccountNumber, ifsc: nextIfsc });
    setAccountNumber('');
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.kycHero}>
        <View style={styles.kycHeroIcon}>
          <Ionicons name="shield-checkmark" size={26} color={colors.white} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.kycHeroTitle}>{gated ? 'Complete KYC to continue' : 'Partner KYC'}</Text>
          <Text style={styles.kycHeroText}>
            Capture documents with camera. Orders unlock after verification.
          </Text>
        </View>
      </View>

      <View style={styles.kycProgressCard}>
        <View style={styles.between}>
          <Text style={styles.cardTitle}>Verification progress</Text>
          <Text style={styles.priceText}>{progress.completed}/{progress.total}</Text>
        </View>
        <View style={styles.kycProgressTrack}>
          <View style={[styles.kycProgressFill, { width: `${(progress.completed / progress.total) * 100}%` }]} />
        </View>
        <Text style={styles.mutedSmall}>
          Status: {user.partnerProfile?.kycStatus || 'not_started'}
          {progress.complete && user.partnerProfile?.kycStatus !== 'verified' ? ' - submitted for review' : ''}
        </Text>
      </View>

      <SectionTitle title="Required Steps" />
      <KycStepCard
        icon="person-circle"
        title="Live selfie"
        subtitle="Take a clear face photo with camera"
        done={Boolean(docs?.selfie)}
        busy={busy}
        onPress={() => onCapture('selfie')}
      />

      <View style={styles.kycGroupCard}>
        <View style={styles.between}>
          <View>
            <Text style={styles.cardTitle}>Identity proof</Text>
            <Text style={styles.mutedSmall}>Capture PAN or Aadhaar. One is required.</Text>
          </View>
          <Ionicons name={identityDone ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={identityDone ? colors.green : colors.muted} />
        </View>
        <View style={styles.row}>
          <SecondaryButton title={docs?.pan ? 'PAN done' : 'Capture PAN'} icon="card" onPress={() => onCapture('pan')} />
          <SecondaryButton title={docs?.aadhaar ? 'Aadhaar done' : 'Capture Aadhaar'} icon="card" onPress={() => onCapture('aadhaar')} />
        </View>
      </View>

      <KycStepCard
        icon="document-text"
        title="Driving licence"
        subtitle="Capture front side clearly"
        done={Boolean(docs?.drivingLicence)}
        busy={busy}
        onPress={() => onCapture('drivingLicence')}
      />
      <KycStepCard
        icon="car"
        title="Vehicle RC"
        subtitle="Required for vehicle ownership or authorization"
        done={Boolean(docs?.rc)}
        busy={busy}
        onPress={() => onCapture('rc')}
      />

      <View style={[styles.kycGroupCard, docs?.bank && styles.kycStepDone]}>
        <View style={styles.between}>
          <View>
            <Text style={styles.cardTitle}>Bank account</Text>
            <Text style={styles.mutedSmall}>
              {docs?.bank ? `${bankDetails?.accountNumberMasked || 'Account saved'} - ${bankDetails?.ifsc || 'IFSC saved'}` : 'Used for payouts'}
            </Text>
          </View>
          <Ionicons name={docs?.bank ? 'checkmark-circle' : 'wallet-outline'} size={22} color={docs?.bank ? colors.green : colors.partner} />
        </View>
        <View style={styles.kycInputGroup}>
          <Text style={styles.fieldLabel}>Account holder</Text>
          <TextInput value={accountHolder} onChangeText={setAccountHolder} style={styles.kycInput} placeholder="Name as per bank" />
        </View>
        <View style={styles.kycInputGroup}>
          <Text style={styles.fieldLabel}>Account number</Text>
          <TextInput
            value={accountNumber}
            onChangeText={setAccountNumber}
            style={styles.kycInput}
            placeholder={bankDetails?.accountNumberMasked || 'Enter account number'}
            keyboardType="numeric"
            secureTextEntry
          />
        </View>
        <View style={styles.kycInputGroup}>
          <Text style={styles.fieldLabel}>IFSC code</Text>
          <TextInput value={ifsc} onChangeText={setIfsc} style={styles.kycInput} autoCapitalize="characters" placeholder="ABCD0123456" />
        </View>
        {bankError ? <Text style={styles.loginError}>{bankError}</Text> : null}
        <PrimaryButton title={busy ? 'Saving' : docs?.bank ? 'Update Bank' : 'Save Bank'} icon="checkmark" onPress={submitBank} />
      </View>

      {progress.complete ? (
        <View style={styles.notice}>
          <Ionicons name="time" size={18} color={colors.partner} />
          <Text style={styles.noticeText}>KYC submitted. Indiery will review it before order access is enabled.</Text>
        </View>
      ) : null}

      <PolicyList />
      <Pressable style={styles.deleteAccountButton} onPress={onRequestAccountDeletion}>
        <Ionicons name="trash-outline" size={18} color={colors.red} />
        <Text style={styles.deleteAccountButtonText}>Request account deletion</Text>
      </Pressable>
      <Pressable style={styles.logoutButton} onPress={onLogout}>
        <Ionicons name="log-out-outline" size={18} color={colors.red} />
        <Text style={styles.logoutButtonText}>Logout</Text>
      </Pressable>
    </ScrollView>
  );
}

function KycStepCard({
  icon,
  title,
  subtitle,
  done,
  busy,
  onPress
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  done: boolean;
  busy: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.kycStepCard, done && styles.kycStepDone]} onPress={onPress}>
      <View style={[styles.kycStepIcon, done && styles.kycStepIconDone]}>
        <Ionicons name={done ? 'checkmark' : icon} size={20} color={done ? colors.white : colors.partner} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.mutedSmall}>{subtitle}</Text>
      </View>
      <Text style={[styles.kycActionText, done && styles.docDoneText]}>
        {done ? 'Done' : busy ? 'Opening' : 'Capture'}
      </Text>
    </Pressable>
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
          <Ionicons name={icons[policy.id]} size={18} color={colors.partner} />
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
  loginShell: { flex: 1, backgroundColor: colors.white },
  authKeyboard: { flex: 1 },
  authScroll: { flexGrow: 1, backgroundColor: colors.white },
  profileSetupScroll: { flexGrow: 1, backgroundColor: colors.white },
  loginHero: {
    minHeight: 330,
    backgroundColor: colors.partnerLight,
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
    backgroundColor: colors.partner,
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
    borderTopColor: colors.partner,
    borderStyle: 'dashed',
    transform: [{ rotate: '-27deg' }]
  },
  routeDashTwo: {
    position: 'absolute',
    right: 104,
    top: 56,
    width: 58,
    borderTopWidth: 1.5,
    borderTopColor: colors.partner,
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
  truckCab: { position: 'absolute', right: 156, bottom: 58, width: 72, height: 78, borderRadius: 10, backgroundColor: colors.partner },
  truckWindshield: { position: 'absolute', right: 9, top: 9, width: 42, height: 26, borderRadius: 6, backgroundColor: '#0F2A55' },
  truckGrill: { position: 'absolute', left: 8, bottom: 12, width: 52, height: 9, borderRadius: 5, backgroundColor: '#063D8F' },
  truckWheel: { position: 'absolute', bottom: 50, width: 23, height: 23, borderRadius: 12, backgroundColor: colors.ink, borderWidth: 5, borderColor: '#7FA9D9' },
  truckWheelOne: { right: 136 },
  truckWheelTwo: { right: 34 },
  heroGround: { position: 'absolute', left: -18, right: -18, bottom: 30, height: 15, backgroundColor: '#DFE9F5' },
  authHero: {
    minHeight: 350,
    backgroundColor: colors.partnerLight,
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
    backgroundColor: colors.partner,
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
    backgroundColor: colors.partner
  },
  authForm: {
    flexGrow: 1,
    backgroundColor: colors.white,
    paddingHorizontal: 22,
    paddingTop: 30,
    paddingBottom: 26
  },
  authKicker: { color: colors.partner, fontSize: 12, fontWeight: '900', textTransform: 'uppercase', marginBottom: 8 },
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
  vehicleChoiceList: { gap: 8 },
  vehicleChoice: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  vehicleChoiceSelected: { borderColor: colors.partner, backgroundColor: colors.partnerLight },
  vehicleChoiceTitle: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  vehicleChoiceMeta: { color: colors.muted, fontSize: 11, fontWeight: '800', marginTop: 2 },
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
  authPrimaryButton: { flex: 1, minHeight: 50, borderRadius: 8, backgroundColor: colors.partner, alignItems: 'center', justifyContent: 'center' },
  authPrimaryButtonText: { color: colors.white, fontSize: 14, fontWeight: '900' },
  authDividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 18 },
  authDividerLine: { flex: 1, height: 1, backgroundColor: colors.line },
  loginFeatureRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  loginFeatureItem: { flex: 1, alignItems: 'center', gap: 4 },
  loginFeatureIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.partnerLight, alignItems: 'center', justifyContent: 'center' },
  loginFeatureTitle: { color: colors.ink, fontSize: 9, fontWeight: '900', textAlign: 'center' },
  loginFeatureSubtitle: { color: colors.muted, fontSize: 8, fontWeight: '800', textAlign: 'center' },
  authNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    backgroundColor: colors.partnerLight,
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
  loginTitle: { color: colors.ink, fontSize: 22, fontWeight: '900', letterSpacing: 1.5, textAlign: 'center' },
  taglineRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 6 },
  taglineRule: { width: 42, height: 2, borderRadius: 2 },
  tagline: { color: colors.muted, fontSize: 9, fontWeight: '900', letterSpacing: 1, textAlign: 'center' },
  loginSubtitle: { color: colors.muted, fontSize: 14, fontWeight: '700', marginBottom: 22 },
  loginInput: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 46,
    color: colors.ink,
    fontWeight: '800',
    marginBottom: 12
  },
  fieldGroup: { marginBottom: 12 },
  disabledInput: { backgroundColor: colors.faint, color: colors.muted },
  loginError: { color: colors.red, fontSize: 12, fontWeight: '800', marginBottom: 12 },
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
  onlineCardDisabled: { borderColor: '#FDE68A', backgroundColor: '#FFFBEB' },
  onlineText: { color: colors.muted, fontWeight: '900', fontSize: 16 },
  onlineTextActive: { color: colors.partner },
  walletBlockCard: { borderWidth: 1, borderColor: '#FDE68A', backgroundColor: '#FFFBEB', borderRadius: 16, padding: 14, marginBottom: 12 },
  walletBlockHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  walletBlockBalance: { color: '#92400E', fontSize: 13, fontWeight: '900', marginBottom: 10 },
  statRow: { flexDirection: 'row', gap: 10, marginTop: 16, marginBottom: 16 },
  statCard: { flex: 1, borderRadius: 14, padding: 14 },
  statValue: { fontSize: 17, fontWeight: '900' },
  statLabel: { fontSize: 11, fontWeight: '800', marginTop: 4 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: colors.ink, marginTop: 18, marginBottom: 10 },
  orderCard: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 14, marginBottom: 12, backgroundColor: colors.white },
  activeTripSwitchRow: { gap: 10, paddingBottom: 10 },
  activeTripSwitchCard: { width: 190, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.white, padding: 12 },
  activeTripSwitchCardSelected: { borderColor: colors.partner, backgroundColor: colors.partnerLight },
  activeTripSwitchTitle: { color: colors.ink, fontSize: 13, fontWeight: '900' },
  activeTripSwitchTitleSelected: { color: colors.partner },
  activeTripSwitchMeta: { color: colors.muted, fontSize: 11, fontWeight: '800', marginTop: 5 },
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
  deleteAccountButton: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: '#FECACA', backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 14, marginBottom: 10 },
  deleteAccountButtonText: { color: colors.red, fontWeight: '900' },
  logoutButton: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: '#FECACA', backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 14, marginBottom: 12 },
  logoutButtonText: { color: colors.red, fontWeight: '900' },
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
  kycHero: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.partner, borderRadius: 18, padding: 16, marginBottom: 14 },
  kycHeroIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  kycHeroTitle: { color: colors.white, fontSize: 18, fontWeight: '900' },
  kycHeroText: { color: '#D1FAE5', fontSize: 12, fontWeight: '800', marginTop: 3, lineHeight: 17 },
  kycProgressCard: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.white, padding: 14, marginBottom: 12 },
  kycProgressTrack: { height: 8, borderRadius: 8, backgroundColor: colors.faint, overflow: 'hidden', marginBottom: 8 },
  kycProgressFill: { height: 8, borderRadius: 8, backgroundColor: colors.partner },
  kycStepCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.white, padding: 14, marginBottom: 10 },
  kycStepDone: { borderColor: colors.partner, backgroundColor: colors.partnerLight },
  kycStepIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.partnerLight, alignItems: 'center', justifyContent: 'center' },
  kycStepIconDone: { backgroundColor: colors.partner },
  kycActionText: { color: colors.partner, fontSize: 12, fontWeight: '900' },
  kycGroupCard: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.white, padding: 14, marginBottom: 10 },
  kycInputGroup: { marginBottom: 10 },
  kycInput: { minHeight: 46, borderWidth: 1, borderColor: colors.line, borderRadius: 12, color: colors.ink, fontWeight: '800', paddingHorizontal: 12, backgroundColor: colors.white },
  otpPanel: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 12, marginBottom: 12 },
  otpRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  otpInput: { flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 12, minHeight: 46, color: colors.ink, fontWeight: '800' },
  docGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  docCard: { width: '48%', borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 14, alignItems: 'center', gap: 6 },
  docCardDone: { backgroundColor: colors.partnerLight, borderColor: colors.partner },
  docTitle: { color: colors.ink, fontWeight: '900', textAlign: 'center' },
  docDoneText: { color: colors.partner },
  policyList: { marginTop: 4, marginBottom: 12 },
  policyCard: { borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.white, marginBottom: 10, overflow: 'hidden' },
  policyHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  policyIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.partnerLight, alignItems: 'center', justifyContent: 'center' },
  policySummary: { color: colors.ink, fontSize: 12, fontWeight: '700', marginTop: 5, lineHeight: 17 },
  policyBody: { borderTopWidth: 1, borderTopColor: colors.line, paddingHorizontal: 14, paddingBottom: 12, backgroundColor: '#F8FFFC' },
  policySection: { marginTop: 12 },
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
