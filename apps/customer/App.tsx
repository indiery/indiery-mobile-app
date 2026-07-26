import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  StatusBar,
  Text as NativeText,
  TextInput as NativeTextInput,
  useWindowDimensions,
  View
} from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { SafeAreaView, type Edge, useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import RazorpayCheckout from 'react-native-razorpay';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { io, Socket } from 'socket.io-client';
import { Ionicons } from '@expo/vector-icons';
import indieryLogoImage from './assets/indiery-logo.png';
import customerLoginBackgroundImage from './assets/bg1.png';
import bikeVehicleImage from './assets/bike.png';
import loaderVehicleImage from './assets/loader.png';
import mini500VehicleImage from './assets/mini500.png';
import mini700VehicleImage from './assets/mini700.png';
import {
  colors,
  CreateOrderInput,
  CustomerBootstrap,
  CustomerWallet,
  FareBreakup,
  IndieryApi,
  LedgerItem,
  legalPolicies,
  LegalPolicy,
  LocationDetails,
  LocationPoint,
  LocationSuggestion,
  money,
  Order,
  PaymentMode,
  SavedAddress,
  TripOtp,
  UserProfile,
  Vehicle
} from '@indiery/shared';

type LockedTextProps = React.ComponentProps<typeof NativeText>;
type LockedTextInputProps = React.ComponentProps<typeof NativeTextInput>;

function Text(props: LockedTextProps) {
  return <NativeText {...props} allowFontScaling={false} />;
}

function TextInput(props: LockedTextInputProps) {
  return <NativeTextInput {...props} allowFontScaling={false} />;
}

declare const process: { env?: Record<string, string | undefined> };
declare const __DEV__: boolean;

const apiBaseUrl =
  process?.env?.EXPO_PUBLIC_API_URL ||
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ||
  (__DEV__ ? 'http://localhost:4000/api' : '');
const googleMapsApiKey =
  process?.env?.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  process?.env?.GOOGLE_MAPS_API_KEY ||
  (Constants.expoConfig?.extra?.googleMapsApiKey as string | undefined) ||
  '';
const allowInsecureApiBaseUrl =
  process?.env?.EXPO_PUBLIC_ALLOW_INSECURE_API_URL === 'true' ||
  Constants.expoConfig?.extra?.allowInsecureApiBaseUrl === true;

if (!apiBaseUrl) throw new Error('EXPO_PUBLIC_API_URL is required for production builds');
if (!__DEV__ && !apiBaseUrl.startsWith('https://') && !allowInsecureApiBaseUrl) {
  throw new Error('Production API URL must use HTTPS');
}

const socketUrl = apiBaseUrl.replace(/\/api\/?$/, '');
const appSafeAreaEdges: Edge[] = ['top', 'right', 'bottom', 'left'];
const tabScreenSafeAreaEdges: Edge[] = appSafeAreaEdges.filter((edge) => edge !== 'bottom');
const expoProjectId =
  (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId ??
  (Constants.easConfig as { projectId?: string } | null)?.projectId;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    priority: Notifications.AndroidNotificationPriority.HIGH
  })
});

type Tab = 'home' | 'book' | 'orders' | 'wallet' | 'account';
type ServiceCategory = 'bike' | 'truck' | 'movers' | 'enterprise';
type AppLanguage = 'en' | 'hi';
type CustomerAccountPage =
  | 'overview'
  | 'personal'
  | 'addresses'
  | 'wallet'
  | 'language'
  | 'support'
  | 'enterprise'
  | 'legal'
  | LegalPolicy['id'];
type BookingStop = {
  id: string;
  label: string;
  placeId: string;
  lat?: number;
  lng?: number;
};
type MapPickerTarget = {
  kind: 'pickup' | 'drop' | 'stop';
  stopId?: string;
  title: string;
  value: string;
  lat?: number;
  lng?: number;
  openContact?: boolean;
};
type OrderHistoryDateFilter = 'all' | 'today' | 'last7Days';
type OrderHistoryStatusFilter = 'all' | 'delivered' | 'cancelled';
type CustomerOnboardingProfile = { name: string; email: string; city: string };
type LoginStep = 'phone' | 'profile' | 'otp';

const goodsOptions = [
  'Documents',
  'Stationery and toys',
  'Groceries and food',
  'FMCG products',
  'Electronics and appliances',
  'Furniture',
  'Textiles and garments',
  'Pharmacy and medicines',
  'Computers and accessories',
  'Timber and plywood',
  'Construction materials',
  'Hardware and tools',
  'Catering and restaurant supplies',
  'Machinery, equipment and spare parts',
  'Household items',
  'Business stock and parcels',
  'General goods'
];
const allowedGoodsItems = [
  'Documents',
  'Stationery, books, and toys',
  'Groceries and packed food',
  'Packed FMCG products',
  'Electronics, appliances, computers, and accessories',
  'Furniture and household items',
  'Textiles and garments',
  'Packed pharmacy items and medicines with a valid bill',
  'Timber and plywood',
  'Construction materials',
  'Packed hardware and tools',
  'Catering and restaurant supplies',
  'Machinery, equipment, and spare parts',
  'Business stock and packed parcels',
  'Packed general goods that are not restricted'
];
const restrictedGoodsItems = [
  'Illegal items',
  'Cash, gold, jewellery, or valuables',
  'Weapons, ammunition, or sharp arms',
  'Explosives, fireworks, or flammable items',
  'Alcohol, tobacco, drugs, or narcotics',
  'Human remains or body parts',
  'Live animals or plants',
  'Hazardous chemicals',
  'Medical waste or biohazards',
  'Perishable items without packing',
  'Loose liquids or leaking goods',
  'Stolen or counterfeit goods'
];
const maxExtraStops = 3;
const customerVehicleCodes = ['bike', 'loader90', 'mini500', 'mini750'];
const vehicleArtSources: Record<string, ImageSourcePropType> = {
  bike: bikeVehicleImage,
  loader90: loaderVehicleImage,
  mini500: mini500VehicleImage,
  mini750: mini700VehicleImage
};
type PorterVehicleRule = {
  maxWeightKg: number;
  minWeightKg?: number;
  baseFare: number;
  perKmAfterFirst: number;
};
const porterVehicleRules: Record<string, PorterVehicleRule> = {
  bike: { maxWeightKg: 20, baseFare: 40, perKmAfterFirst: 10 },
  loader90: { minWeightKg: 20, maxWeightKg: 90, baseFare: 75, perKmAfterFirst: 13 },
  mini500: { minWeightKg: 90, maxWeightKg: 500, baseFare: 200, perKmAfterFirst: 20 },
  mini750: { minWeightKg: 500, maxWeightKg: 750, baseFare: 300, perKmAfterFirst: 30 }
};
const languageOptions: Array<{ id: AppLanguage; label: string; nativeLabel: string }> = [
  { id: 'en', label: 'English', nativeLabel: 'English' },
  { id: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' }
];

const enCopy = {
  hi: 'Hi',
  loading: 'Loading Indiery',
  continue: 'Continue',
  back: 'Back',
  pressBackAgainToExit: 'Press back again to exit',
  cancel: 'Cancel',
  save: 'Save',
  saving: 'Saving',
  later: 'Later',
  refresh: 'Refresh',
  refreshing: 'Refreshing...',
  dataRefreshed: 'Latest data loaded',
  share: 'Share',
  cancelling: 'Cancelling',
  booking: 'Booking',
  estimating: 'Estimating',
  bookNow: 'Book Now',
  track: 'Track',
  trackOrder: 'Track order',
  homeTab: 'Home',
  ordersTab: 'Orders',
  walletTab: 'Wallet',
  accountTab: 'Account',
  whereTo: 'Drop location',
  enterDropLocation: 'Enter drop location',
  repeatLastRoute: 'Repeat last route',
  instantBooking: 'Instant booking',
  otpSecured: 'OTP secured',
  liveTracking: 'Live tracking',
  orders: 'Orders',
  active: 'Active',
  coins: 'Coins',
  activeDelivery: 'Active Delivery',
  orderDetails: 'Order details',
  activeDeliveries: 'Active deliveries',
  deliveryStatus: 'Delivery status',
  recentOrders: 'Recent Orders',
  noTripsYet: 'No trips yet',
  completedCancelledBookingsAppear: 'Your completed and cancelled bookings will appear here.',
  chooseService: 'Choose Service',
  selectVehicle: 'Select Vehicle',
  twoWheeler: 'Two Wheeler',
  smallParcels: 'Small parcels',
  trucks: 'Trucks',
  miniTrucksAndTempos: 'Mini trucks and tempos',
  packers: 'Packers',
  homeShifting: 'Home shifting',
  business: 'Business',
  bulkLogistics: 'Bulk logistics',
  upTo: 'Up to',
  moversNotice: 'For house shifting, book the vehicle here and add packing/labour notes in goods details.',
  pickupAndDrop: 'Pickup and Drop',
  pickup: 'Pickup',
  pickupLocation: 'Pickup location',
  drop: 'Drop',
  savedPickupAddresses: 'Saved pickup addresses',
  savedDropAddresses: 'Saved drop addresses',
  addStop: 'Add stop',
  removeStop: 'Remove stop',
  stop: 'Stop',
  setPickupLocation: 'Set pickup location',
  setDropLocation: 'Set drop location',
  setStop: 'Set stop',
  senderDetails: 'Sender Details',
  receiverDetails: 'Receiver Details',
  askedAfterPickup: 'Asked after pickup location',
  askedAfterDrop: 'Asked after drop location',
  addNameMobile: 'Add name and mobile',
  saveAddress: 'Save address',
  goodsDetails: 'Goods Details',
  goodsType: 'Goods type',
  selectGoodsCategory: 'Select goods category',
  tapToChooseGoods: 'Tap to choose what you are sending',
  confirmGoodsCategory: 'Confirm category',
  weightKg: 'Weight kg',
  restrictedGoods: 'Restricted goods, hazardous items, and illegal materials are not allowed.',
  enterGoodsType: 'Enter goods type',
  enterWeight: 'Enter weight',
  goodsRules: 'Goods rules',
  viewGoodsRules: 'View allowed and restricted goods',
  allowedGoods: 'Allowed goods',
  notAllowedGoods: 'Not allowed goods',
  goodsRulesIntro: 'Check what can and cannot be shipped before booking.',
  okayUnderstood: 'Okay, understood',
  chooseVehicle: 'Choose vehicle',
  suggested: 'Suggested',
  unavailableForWeight: 'Too heavy',
  fareEstimate: 'Fare',
  settingPickupLocation: 'Setting current pickup location',
  allVehiclePrices: 'All vehicle prices',
  changeRoute: 'Change route',
  routeAndContacts: 'Route and contacts',
  sender: 'Sender',
  receiver: 'Receiver',
  sameAsAppUser: 'Sender is same as app user?',
  yesUseMine: 'Yes, use mine',
  noEnterManually: 'No, enter manually',
  pricedAfterRoute: 'Price is calculated from this route and weight.',
  routeSummary: 'Route summary',
  service: 'Service',
  vehicle: 'Vehicle',
  selectVehicleValue: 'Select vehicle',
  stops: 'Stops',
  direct: 'Direct',
  payment: 'Payment',
  bookingSummary: 'Booking summary',
  route: 'Route',
  goods: 'Goods',
  eta: 'ETA',
  useCoins: 'Use coins',
  secureOnlinePayment: 'Secure online payment',
  payPartnerAfterDelivery: 'Pay partner after delivery',
  payAndBook: 'Pay and Book',
  senderName: 'Sender name',
  senderMobile: 'Sender mobile',
  receiverName: 'Receiver name',
  receiverMobile: 'Receiver mobile',
  pickupLandmarkOptional: 'Pickup landmark optional',
  dropLandmarkOptional: 'Drop landmark optional',
  useMine: 'Use mine',
  personHandingGoods: 'Person handing over the goods',
  personReceivingGoods: 'Person receiving the goods',
  selectedLocation: 'Selected location',
  saveDetails: 'Save details',
  enterSenderName: 'Enter sender name',
  enterSenderMobile: 'Enter sender mobile number',
  enterReceiverName: 'Enter receiver name',
  enterReceiverMobile: 'Enter receiver mobile number',
  selectLocationFirst: 'Select location first',
  myOrders: 'MY ORDERS',
  deliveriesTracking: 'Deliveries and tracking',
  paymentLabel: 'Payment',
  runningLate: 'Running late',
  estimatedDeliveryPassed: 'Estimated delivery time has passed',
  countdownBegins: 'Countdown begins when partner marks picked up',
  estimatedTimeAfterPickup: 'Estimated time remaining after pickup',
  findingNearbyPartner: 'Finding nearby partner',
  vehicleAssigned: 'Vehicle assigned',
  noActiveDelivery: 'No active delivery',
  liveTrackingAppear: 'Your live tracking will appear here after booking.',
  bookDelivery: 'Book a delivery',
  orderHistory: 'Order History',
  allOrders: 'All',
  today: 'Today',
  last7Days: 'Last 7 days',
  filters: 'Filters',
  filterOrders: 'Filter orders',
  filterOrdersSubtitle: 'Choose a date range and delivery status.',
  date: 'Date',
  status: 'Status',
  applyFilters: 'Apply filters',
  noMatchingOrders: 'No matching orders',
  adjustOrderFilters: 'Try a different search or filter.',
  clearFilters: 'Clear filters',
  noPastOrders: 'No past orders',
  completedCancelledAppear: 'Completed and cancelled deliveries will appear here.',
  pickupOtp: 'Pickup OTP',
  dropOtp: 'Drop OTP',
  deliveryOtp: 'Delivery OTP',
  liveGps: 'Live GPS',
  waitingGps: 'Waiting for driver GPS',
  min: 'MIN',
  indieryCoins: 'INDIERY COINS',
  useCoinsDiscount: 'All available coins are applied automatically up to the order amount.',
  coinDiscountNextOrders: 'available for order payment',
  enterCoupon: 'Enter Coupon',
  applying: 'Applying',
  applyCoupon: 'Apply coupon',
  couponCode: 'Coupon code',
  couponSheetTitle: 'Apply coupon',
  couponSheetText: 'New customers can use FIRST50 to claim 50 Indiery coins.',
  invalidCoupon: 'Invalid coupon code',
  couponAlreadyClaimed: 'FIRST50 already claimed',
  couponApplied: 'FIRST50 applied. 50 coins added.',
  coinRules: 'Coin Rules',
  coinRuleEarn: 'Earn coins for successful deliveries',
  coinRuleUse: 'Use coins on payment up to the order amount',
  coinRuleRefunds: 'Refunds return unused coins',
  walletTitle: 'Indiery Wallet',
  walletSubtitle: 'Pay bookings instantly and receive refunds here.',
  cashBalance: 'Cash balance',
  availableToPay: 'Available to pay',
  addMoney: 'Add Money',
  enterAmount: 'Enter amount',
  paymentMethod: 'Payment method',
  quickTopup: 'Quick top-up',
  walletPay: 'Wallet',
  walletPaySubtitle: 'Pay instantly from wallet balance',
  insufficientWalletBalance: 'Insufficient wallet balance',
  recentTransactions: 'Recent Transactions',
  noWalletTransactions: 'No wallet transactions',
  noWalletTransactionsText: 'Top-ups, wallet payments, and refunds will appear here.',
  rewardsCoins: 'Rewards and Coins',
  coinActivity: 'Coin Activity',
  noCoinActivity: 'No coin activity yet',
  secureTopup: 'Secure Razorpay top-up',
  moneyAdded: 'Money added to wallet',
  paymentCancelled: 'Payment cancelled',
  settled: 'Settled',
  pending: 'Pending',
  verified: 'Verified',
  done: 'Done',
  enterprisesTitle: 'Indiery Enterprises',
  enterprisesText: 'Bulk orders, recurring routes, monthly billing, and dedicated logistics support.',
  savedAddresses: 'Saved Addresses',
  noSavedAddresses: 'No saved addresses',
  savePickupDropAddresses: 'Save pickup or drop addresses while booking.',
  account: 'Account',
  mobileLinkedText: 'Your mobile number is verified and linked to this customer account.',
  savedPlace: 'saved place',
  savedPlacesCount: 'saved places',
  personalDetails: 'Personal details',
  emailNotAdded: 'Email not added',
  savedCity: 'Saved city',
  indieryCoinsMenu: 'Indiery coins',
  coinsAvailable: 'coins available',
  changeLanguage: 'Change language',
  helpSupport: 'Help and support',
  supportSubtitle: 'Delivery, payment, and account support',
  name: 'Name',
  email: 'Email',
  city: 'City',
  mobileNumber: 'Mobile number',
  requestAccountDeletion: 'Request account deletion',
  logout: 'Logout',
  policiesLegal: 'Policies and Legal',
  updated: 'Updated',
  languageSetEnglish: 'Language set to English',
  languageSetHindi: 'भाषा हिन्दी पर सेट हुई',
  businessLogistics: 'Business logistics',
  moveGoodsBusiness: 'Move goods for your business',
  enterpriseHeroText: 'Ship inventory, parcels, documents, and regular store supplies with business-friendly billing and repeat route support.',
  whatYouGet: 'What You Get',
  bestFor: 'Best For',
  recurringRoutes: 'Recurring routes',
  recurringRoutesText: 'Set frequent pickup and drop lanes for daily business movement.',
  monthlyBilling: 'Monthly billing',
  monthlyBillingText: 'Cleaner billing records for monthly logistics and accounting.',
  bulkOrders: 'Bulk orders',
  bulkOrdersText: 'Move business stock, documents, parcels, and store inventory.',
  prioritySupport: 'Priority support',
  prioritySupportText: 'Dedicated help for active shipments and regular customers.',
  talkEnterprises: 'Talk to Indiery Enterprises',
  shareBusinessRoutes: 'Share your business routes, monthly volume, and billing needs.',
  emailButton: 'Email',
  callButton: 'Call',
  retailStores: 'Retail stores',
  wholesalers: 'Wholesalers',
  restaurants: 'Restaurants',
  manufacturers: 'Manufacturers',
  offices: 'Offices',
  ecommerceSellers: 'E-commerce sellers',
  emailSupport: 'Email support',
  callSupport: 'Call support',
  reportOrderIssue: 'Report order issue',
  reportOrderIssueSubtitle: 'Share order number and delivery details',
  languageEnglish: 'English',
  languageHindi: 'Hindi',
  languageHindiNative: 'हिन्दी',
  searching: 'Searching',
  offered: 'Offered',
  accepted: 'Accepted',
  arrived_pickup: 'At pickup',
  picked_up: 'Picked up',
  in_transit: 'In transit',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  documents: 'Documents',
  groceries: 'Groceries',
  electronics: 'Electronics',
  furniture: 'Furniture',
  businessStock: 'Business stock',
  householdItems: 'Household items',
  groceriesAndFood: 'Groceries and food',
  electronicsAndAppliances: 'Electronics and appliances',
  textilesAndGarments: 'Textiles and garments',
  pharmacyAndMedicines: 'Pharmacy and medicines',
  computersAndAccessories: 'Computers and accessories',
  timberAndPlywood: 'Timber and plywood',
  constructionMaterials: 'Construction materials',
  cateringAndRestaurantSupplies: 'Catering and restaurant supplies',
  machineryEquipmentSpareParts: 'Machinery, equipment and spare parts',
  businessStockAndParcels: 'Business stock and parcels',
  hardwareAndTools: 'Hardware and tools',
  fmcgProducts: 'FMCG products',
  stationeryAndToys: 'Stationery and toys',
  generalGoods: 'General goods',
  mapSearchPlaceholder: 'Search area, building, or landmark',
  searchPlacePin: 'Search or place the pin accurately',
  dragMapPin: 'Drag map or pin to adjust',
  useCurrentLocation: 'Use current location',
  confirmLocation: 'Confirm location',
  confirmPickupLocation: 'Confirm pickup location',
  confirmDropLocation: 'Confirm drop location',
  selected: 'Selected',
  selectOnMap: 'Select on map',
  useTypedLocation: 'Use typed location',
  locationHint: 'Select a suggestion for accurate fare and tracking, or continue with typed text.'
} as const;

const hiCopy: Partial<Record<keyof typeof enCopy, string>> = {
  refreshing: 'रिफ्रेश हो रहा है...',
  dataRefreshed: 'नई जानकारी लोड हो गई',
  hi: 'नमस्ते',
  loading: 'Indiery लोड हो रहा है',
  continue: 'जारी रखें',
  back: 'वापस',
  cancel: 'रद्द करें',
  save: 'सेव करें',
  saving: 'सेव हो रहा है',
  later: 'बाद में',
  refresh: 'रिफ्रेश',
  share: 'शेयर',
  cancelling: 'रद्द हो रहा है',
  booking: 'बुकिंग हो रही है',
  estimating: 'किराया निकाला जा रहा है',
  bookNow: 'अभी बुक करें',
  track: 'ट्रैक',
  homeTab: 'होम',
  ordersTab: 'ऑर्डर',
  walletTab: 'वॉलेट',
  accountTab: 'अकाउंट',
  whereTo: 'ड्रॉप लोकेशन',
  enterDropLocation: 'ड्रॉप लोकेशन डालें',
  repeatLastRoute: 'पिछला रूट दोहराएं',
  instantBooking: 'तुरंत बुकिंग',
  otpSecured: 'OTP सुरक्षित',
  liveTracking: 'लाइव ट्रैकिंग',
  orders: 'ऑर्डर',
  active: 'एक्टिव',
  coins: 'कॉइन',
  activeDelivery: 'एक्टिव डिलीवरी',
  activeDeliveries: 'एक्टिव डिलीवरी',
  deliveryStatus: 'डिलीवरी स्टेटस',
  recentOrders: 'हाल के ऑर्डर',
  noTripsYet: 'अभी कोई ट्रिप नहीं',
  completedCancelledBookingsAppear: 'आपकी पूरी और रद्द बुकिंग यहां दिखेंगी.',
  chooseService: 'सर्विस चुनें',
  selectVehicle: 'वाहन चुनें',
  twoWheeler: 'टू व्हीलर',
  smallParcels: 'छोटे पार्सल',
  trucks: 'ट्रक',
  miniTrucksAndTempos: 'मिनी ट्रक और टेम्पो',
  packers: 'पैकर्स',
  homeShifting: 'घर शिफ्टिंग',
  business: 'बिजनेस',
  bulkLogistics: 'बल्क लॉजिस्टिक्स',
  upTo: 'अधिकतम',
  moversNotice: 'घर शिफ्टिंग के लिए यहां वाहन बुक करें और सामान की जानकारी में पैकिंग/लेबर नोट जोड़ें.',
  pickupAndDrop: 'पिकअप और ड्रॉप',
  pickup: 'पिकअप',
  pickupLocation: 'पिकअप लोकेशन',
  drop: 'ड्रॉप',
  savedPickupAddresses: 'सेव पिकअप पते',
  savedDropAddresses: 'सेव ड्रॉप पते',
  addStop: 'स्टॉप जोड़ें',
  removeStop: 'स्टॉप हटाएं',
  stop: 'स्टॉप',
  setPickupLocation: 'पिकअप लोकेशन सेट करें',
  setDropLocation: 'ड्रॉप लोकेशन सेट करें',
  setStop: 'स्टॉप सेट करें',
  senderDetails: 'सेंडर जानकारी',
  receiverDetails: 'रिसीवर जानकारी',
  askedAfterPickup: 'पिकअप लोकेशन के बाद पूछा जाएगा',
  askedAfterDrop: 'ड्रॉप लोकेशन के बाद पूछा जाएगा',
  addNameMobile: 'नाम और मोबाइल जोड़ें',
  saveAddress: 'पता सेव करें',
  goodsDetails: 'सामान की जानकारी',
  goodsType: 'सामान का प्रकार',
  selectGoodsCategory: 'सामान की श्रेणी चुनें',
  tapToChooseGoods: 'भेजे जाने वाले सामान का प्रकार चुनें',
  confirmGoodsCategory: 'श्रेणी कन्फर्म करें',
  weightKg: 'वजन किलो',
  restrictedGoods: 'प्रतिबंधित, खतरनाक और अवैध सामान की अनुमति नहीं है.',
  routeSummary: 'रूट सारांश',
  service: 'सर्विस',
  vehicle: 'वाहन',
  selectVehicleValue: 'वाहन चुनें',
  stops: 'स्टॉप',
  direct: 'डायरेक्ट',
  payment: 'पेमेंट',
  bookingSummary: 'बुकिंग सारांश',
  route: 'रूट',
  goods: 'सामान',
  eta: 'ETA',
  useCoins: 'कॉइन उपयोग करें',
  secureOnlinePayment: 'सुरक्षित ऑनलाइन पेमेंट',
  payPartnerAfterDelivery: 'डिलीवरी के बाद पार्टनर को भुगतान करें',
  payAndBook: 'पेमेंट कर बुक करें',
  senderName: 'सेंडर नाम',
  senderMobile: 'सेंडर मोबाइल',
  receiverName: 'रिसीवर नाम',
  receiverMobile: 'रिसीवर मोबाइल',
  pickupLandmarkOptional: 'पिकअप लैंडमार्क वैकल्पिक',
  dropLandmarkOptional: 'ड्रॉप लैंडमार्क वैकल्पिक',
  useMine: 'मेरा उपयोग करें',
  personHandingGoods: 'सामान देने वाला व्यक्ति',
  personReceivingGoods: 'सामान लेने वाला व्यक्ति',
  selectedLocation: 'चुनी हुई लोकेशन',
  saveDetails: 'जानकारी सेव करें',
  enterSenderName: 'सेंडर नाम डालें',
  enterSenderMobile: 'सेंडर मोबाइल नंबर डालें',
  enterReceiverName: 'रिसीवर नाम डालें',
  enterReceiverMobile: 'रिसीवर मोबाइल नंबर डालें',
  selectLocationFirst: 'पहले लोकेशन चुनें',
  myOrders: 'मेरे ऑर्डर',
  deliveriesTracking: 'डिलीवरी और ट्रैकिंग',
  paymentLabel: 'पेमेंट',
  runningLate: 'देरी हो रही है',
  estimatedDeliveryPassed: 'अनुमानित डिलीवरी समय निकल गया',
  countdownBegins: 'पार्टनर के पिकअप मार्क करने पर काउंटडाउन शुरू होगा',
  estimatedTimeAfterPickup: 'पिकअप के बाद बचा अनुमानित समय',
  findingNearbyPartner: 'पास का पार्टनर खोज रहे हैं',
  vehicleAssigned: 'वाहन असाइन हो गया',
  noActiveDelivery: 'कोई एक्टिव डिलीवरी नहीं',
  liveTrackingAppear: 'बुकिंग के बाद लाइव ट्रैकिंग यहां दिखेगी.',
  bookDelivery: 'डिलीवरी बुक करें',
  orderHistory: 'ऑर्डर हिस्ट्री',
  allOrders: 'सभी',
  today: 'आज',
  last7Days: 'पिछले 7 दिन',
  filters: 'फ़िल्टर',
  filterOrders: 'ऑर्डर फ़िल्टर करें',
  filterOrdersSubtitle: 'तारीख और डिलीवरी स्थिति चुनें।',
  date: 'तारीख',
  status: 'स्थिति',
  applyFilters: 'फ़िल्टर लागू करें',
  noMatchingOrders: 'कोई मिलता ऑर्डर नहीं',
  adjustOrderFilters: 'अलग खोज या फ़िल्टर आज़माएँ।',
  clearFilters: 'फ़िल्टर हटाएँ',
  noPastOrders: 'कोई पिछला ऑर्डर नहीं',
  completedCancelledAppear: 'पूरी और रद्द डिलीवरी यहां दिखेंगी.',
  pickupOtp: 'पिकअप OTP',
  dropOtp: 'ड्रॉप OTP',
  deliveryOtp: 'डिलीवरी OTP',
  liveGps: 'लाइव GPS',
  waitingGps: 'ड्राइवर GPS का इंतजार',
  min: 'मिनट',
  indieryCoins: 'INDIERY कॉइन',
  useCoinsDiscount: 'ऑर्डर राशि तक सभी उपलब्ध कॉइन अपने आप लागू होते हैं.',
  coinDiscountNextOrders: 'ऑर्डर पेमेंट के लिए उपलब्ध',
  enterCoupon: 'कूपन डालें',
  applying: 'अप्लाई हो रहा है',
  applyCoupon: 'कूपन लगाएं',
  coinRules: 'कॉइन नियम',
  coinRuleEarn: 'सफल डिलीवरी पर कॉइन कमाएं',
  coinRuleUse: 'ऑर्डर राशि तक पेमेंट में कॉइन उपयोग करें',
  coinRuleRefunds: 'रिफंड में बचे कॉइन वापस मिलते हैं',
  walletTitle: 'Indiery वॉलेट',
  walletSubtitle: 'बुकिंग तुरंत पे करें और रिफंड यहां पाएं.',
  cashBalance: 'कैश बैलेंस',
  availableToPay: 'पेमेंट के लिए उपलब्ध',
  addMoney: 'पैसे जोड़ें',
  enterAmount: 'राशि डालें',
  paymentMethod: 'पेमेंट तरीका',
  quickTopup: 'क्विक टॉप-अप',
  walletPay: 'वॉलेट',
  walletPaySubtitle: 'वॉलेट बैलेंस से तुरंत पे करें',
  insufficientWalletBalance: 'वॉलेट बैलेंस कम है',
  recentTransactions: 'हाल की ट्रांजैक्शन',
  noWalletTransactions: 'कोई वॉलेट ट्रांजैक्शन नहीं',
  noWalletTransactionsText: 'टॉप-अप, वॉलेट पेमेंट और रिफंड यहां दिखेंगे.',
  rewardsCoins: 'रिवॉर्ड और कॉइन',
  coinActivity: 'कॉइन एक्टिविटी',
  noCoinActivity: 'अभी कोई कॉइन एक्टिविटी नहीं',
  secureTopup: 'सुरक्षित Razorpay टॉप-अप',
  moneyAdded: 'वॉलेट में पैसे जुड़ गए',
  paymentCancelled: 'पेमेंट रद्द हुआ',
  settled: 'सेटल्ड',
  pending: 'पेंडिंग',
  verified: 'वेरिफाइड',
  done: 'पूरा',
  enterprisesTitle: 'Indiery Enterprises',
  enterprisesText: 'बल्क ऑर्डर, रेकरिंग रूट, मंथली बिलिंग और डेडिकेटेड लॉजिस्टिक्स सपोर्ट.',
  savedAddresses: 'सेव पते',
  noSavedAddresses: 'कोई सेव पता नहीं',
  savePickupDropAddresses: 'बुकिंग करते समय पिकअप या ड्रॉप पता सेव करें.',
  account: 'अकाउंट',
  personalDetails: 'पर्सनल जानकारी',
  emailNotAdded: 'ईमेल नहीं जोड़ा',
  savedCity: 'सेव शहर',
  indieryCoinsMenu: 'Indiery कॉइन',
  coinsAvailable: 'कॉइन उपलब्ध',
  changeLanguage: 'भाषा बदलें',
  helpSupport: 'हेल्प और सपोर्ट',
  supportSubtitle: 'डिलीवरी, पेमेंट और अकाउंट सपोर्ट',
  name: 'नाम',
  email: 'ईमेल',
  city: 'शहर',
  mobileNumber: 'मोबाइल नंबर',
  requestAccountDeletion: 'अकाउंट डिलीट अनुरोध',
  logout: 'लॉगआउट',
  policiesLegal: 'पॉलिसी और लीगल',
  updated: 'अपडेटेड',
  languageSetEnglish: 'Language set to English',
  languageSetHindi: 'भाषा हिन्दी पर सेट हुई',
  businessLogistics: 'बिजनेस लॉजिस्टिक्स',
  moveGoodsBusiness: 'अपने बिजनेस का सामान भेजें',
  enterpriseHeroText: 'इन्वेंट्री, पार्सल, डॉक्यूमेंट और नियमित स्टोर सप्लाई को बिजनेस बिलिंग और रिपीट रूट सपोर्ट के साथ भेजें.',
  whatYouGet: 'क्या मिलेगा',
  bestFor: 'इनके लिए बेहतर',
  recurringRoutes: 'रेकरिंग रूट',
  recurringRoutesText: 'रोजाना बिजनेस मूवमेंट के लिए फिक्स पिकअप और ड्रॉप लेन सेट करें.',
  monthlyBilling: 'मंथली बिलिंग',
  monthlyBillingText: 'मासिक लॉजिस्टिक्स और अकाउंटिंग के लिए साफ बिलिंग रिकॉर्ड.',
  bulkOrders: 'बल्क ऑर्डर',
  bulkOrdersText: 'बिजनेस स्टॉक, डॉक्यूमेंट, पार्सल और स्टोर इन्वेंट्री भेजें.',
  prioritySupport: 'प्रायोरिटी सपोर्ट',
  prioritySupportText: 'एक्टिव शिपमेंट और रेगुलर ग्राहकों के लिए डेडिकेटेड मदद.',
  talkEnterprises: 'Indiery Enterprises से बात करें',
  shareBusinessRoutes: 'अपने बिजनेस रूट, मासिक वॉल्यूम और बिलिंग जरूरतें शेयर करें.',
  emailButton: 'ईमेल',
  callButton: 'कॉल',
  retailStores: 'रिटेल स्टोर',
  wholesalers: 'होलसेलर',
  restaurants: 'रेस्टोरेंट',
  manufacturers: 'मैन्युफैक्चरर',
  offices: 'ऑफिस',
  ecommerceSellers: 'ई-कॉमर्स सेलर',
  emailSupport: 'ईमेल सपोर्ट',
  callSupport: 'कॉल सपोर्ट',
  reportOrderIssue: 'ऑर्डर समस्या रिपोर्ट करें',
  reportOrderIssueSubtitle: 'ऑर्डर नंबर और डिलीवरी जानकारी शेयर करें',
  languageEnglish: 'English',
  languageHindi: 'Hindi',
  languageHindiNative: 'हिन्दी',
  searching: 'खोज रहे हैं',
  offered: 'ऑफर हुआ',
  accepted: 'स्वीकार हुआ',
  arrived_pickup: 'पिकअप पर',
  picked_up: 'पिकअप हो गया',
  in_transit: 'रास्ते में',
  delivered: 'डिलीवर हुआ',
  cancelled: 'रद्द',
  documents: 'डॉक्यूमेंट',
  groceries: 'किराना',
  electronics: 'इलेक्ट्रॉनिक्स',
  furniture: 'फर्नीचर',
  businessStock: 'बिजनेस स्टॉक',
  householdItems: 'घरेलू सामान',
  groceriesAndFood: 'किराना और खाद्य सामान',
  electronicsAndAppliances: 'इलेक्ट्रॉनिक्स और उपकरण',
  textilesAndGarments: 'कपड़ा और गारमेंट',
  pharmacyAndMedicines: 'फार्मेसी और दवाइयां',
  computersAndAccessories: 'कंप्यूटर और एक्सेसरीज़',
  timberAndPlywood: 'लकड़ी और प्लाईवुड',
  constructionMaterials: 'निर्माण सामग्री',
  cateringAndRestaurantSupplies: 'कैटरिंग और रेस्टोरेंट सामान',
  machineryEquipmentSpareParts: 'मशीनरी, उपकरण और स्पेयर पार्ट्स',
  businessStockAndParcels: 'बिजनेस स्टॉक और पार्सल',
  hardwareAndTools: 'हार्डवेयर और औजार',
  fmcgProducts: 'एफएमसीजी उत्पाद',
  stationeryAndToys: 'स्टेशनरी और खिलौने',
  generalGoods: 'सामान्य सामान',
  mapSearchPlaceholder: 'एरिया, बिल्डिंग या लैंडमार्क खोजें',
  searchPlacePin: 'सर्च करें या पिन सही जगह रखें',
  dragMapPin: 'मैप या पिन खींचकर एडजस्ट करें',
  useCurrentLocation: 'करंट लोकेशन उपयोग करें',
  confirmLocation: 'लोकेशन कन्फर्म करें',
  confirmPickupLocation: 'पिकअप लोकेशन कन्फर्म करें',
  confirmDropLocation: 'ड्रॉप लोकेशन कन्फर्म करें',
  selected: 'चुना गया',
  selectOnMap: 'मैप पर चुनें',
  locationHint: 'सही किराया और ट्रैकिंग के लिए सुझाव चुनें, या लिखे हुए टेक्स्ट के साथ जारी रखें.'
};

const appCopy: Record<AppLanguage, Record<keyof typeof enCopy, string>> = {
  en: enCopy,
  hi: { ...enCopy, ...hiCopy }
};
type CopyKey = keyof typeof enCopy;
const LanguageContext = createContext<AppLanguage>('en');

function copyFor(language: AppLanguage, key: CopyKey) {
  return appCopy[language][key] ?? appCopy.en[key];
}

function useCopy() {
  return appCopy[useContext(LanguageContext)];
}

function useLanguage() {
  return useContext(LanguageContext);
}

function useResponsiveLayout() {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isShort = height < 640;
  const isCompact = width <= 400;
  const isSmall = width <= 375;
  const horizontalPadding = isSmall ? 12 : isCompact ? 14 : 16;
  const contentMaxWidth = 680;
  const tabBarHeight = isSmall ? 58 : isCompact ? 62 : 68;

  return {
    width,
    height,
    isLandscape,
    isShort,
    isCompact,
    isSmall,
    horizontalPadding,
    contentMaxWidth,
    tabBarHeight
  };
}

function useAndroidBackHandler(onBack: () => boolean, dependencies: React.DependencyList) {
  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => subscription.remove();
  }, dependencies);
}

function languageNativeLabel(language: AppLanguage) {
  return language === 'hi' ? appCopy.hi.languageHindiNative : appCopy.en.languageEnglish;
}

function serviceTitle(language: AppLanguage, service: ServiceCategory) {
  const titles: Record<ServiceCategory, CopyKey> = {
    bike: 'twoWheeler',
    truck: 'trucks',
    movers: 'packers',
    enterprise: 'business'
  };
  return copyFor(language, titles[service]);
}

function serviceSubtitle(language: AppLanguage, service: ServiceCategory) {
  const subtitles: Record<ServiceCategory, CopyKey> = {
    bike: 'smallParcels',
    truck: 'miniTrucksAndTempos',
    movers: 'homeShifting',
    enterprise: 'bulkLogistics'
  };
  return copyFor(language, subtitles[service]);
}

function goodsLabel(language: AppLanguage, item: string) {
  const labels: Record<string, CopyKey> = {
    Documents: 'documents',
    Groceries: 'groceries',
    Electronics: 'electronics',
    Furniture: 'furniture',
    'Business stock': 'businessStock',
    'Household items': 'householdItems',
    'Groceries and food': 'groceriesAndFood',
    'Electronics and appliances': 'electronicsAndAppliances',
    'Textiles and garments': 'textilesAndGarments',
    'Pharmacy and medicines': 'pharmacyAndMedicines',
    'Computers and accessories': 'computersAndAccessories',
    'Timber and plywood': 'timberAndPlywood',
    'Construction materials': 'constructionMaterials',
    'Catering and restaurant supplies': 'cateringAndRestaurantSupplies',
    'Machinery, equipment and spare parts': 'machineryEquipmentSpareParts',
    'Business stock and parcels': 'businessStockAndParcels',
    'Hardware and tools': 'hardwareAndTools',
    'FMCG products': 'fmcgProducts',
    'Stationery and toys': 'stationeryAndToys',
    'General goods': 'generalGoods'
  };
  const key = labels[item];
  return key ? copyFor(language, key) : item;
}

function goodsTypeIcon(item: string): keyof typeof Ionicons.glyphMap {
  const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
    Documents: 'document-text-outline',
    'Stationery and toys': 'pencil-outline',
    'Groceries and food': 'basket-outline',
    'FMCG products': 'cart-outline',
    'Electronics and appliances': 'hardware-chip-outline',
    Furniture: 'bed-outline',
    'Textiles and garments': 'shirt-outline',
    'Pharmacy and medicines': 'medkit-outline',
    'Computers and accessories': 'laptop-outline',
    'Timber and plywood': 'layers-outline',
    'Construction materials': 'construct-outline',
    'Hardware and tools': 'hammer-outline',
    'Catering and restaurant supplies': 'restaurant-outline',
    'Machinery, equipment and spare parts': 'cog-outline',
    'Household items': 'home-outline',
    'Business stock and parcels': 'briefcase-outline',
    'General goods': 'cube-outline'
  };
  return icons[item] ?? 'cube-outline';
}

function bookingGoodsLabel(language: AppLanguage, item: string) {
  const trimmed = item.trim();
  if (!trimmed) return copyFor(language, 'documents');
  return goodsLabel(language, trimmed);
}

function statusLabel(language: AppLanguage, status: Order['status']) {
  return copyFor(language, status);
}

const initialBooking = {
  serviceCategory: 'truck' as ServiceCategory,
  pickup: '',
  pickupPlaceId: '',
  pickupLat: undefined as number | undefined,
  pickupLng: undefined as number | undefined,
  pickupContactName: '',
  pickupContactPhone: '',
  pickupAddressLine: '',
  pickupContactConfirmed: false,
  extraStops: [] as BookingStop[],
  drop: '',
  dropPlaceId: '',
  dropLat: undefined as number | undefined,
  dropLng: undefined as number | undefined,
  dropContactName: '',
  dropContactPhone: '',
  dropAddressLine: '',
  dropContactConfirmed: false,
  goodsType: 'Documents',
  weightKg: '',
  coins: '0',
  paymentMode: 'upi' as PaymentMode,
  vehicleId: ''
};

function bookingFareRouteKey(booking: typeof initialBooking) {
  return JSON.stringify([
    booking.pickup.trim(),
    booking.pickupAddressLine.trim(),
    booking.pickupLat,
    booking.pickupLng,
    booking.drop.trim(),
    booking.dropAddressLine.trim(),
    booking.dropLat,
    booking.dropLng,
    booking.weightKg.trim()
  ]);
}

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

function hasValidContactPhone(phoneInput: string) {
  return phoneInput.replace(/\D/g, '').length >= 10;
}

function hasConfirmedPickupDetails(booking: typeof initialBooking) {
  return (
    booking.pickupContactConfirmed &&
    booking.pickupContactName.trim().length >= 2 &&
    hasValidContactPhone(booking.pickupContactPhone)
  );
}

function hasConfirmedDropDetails(booking: typeof initialBooking) {
  return (
    booking.dropContactConfirmed &&
    booking.dropContactName.trim().length >= 2 &&
    hasValidContactPhone(booking.dropContactPhone)
  );
}

function parseBookingWeight(value: string) {
  const weight = Number(value);
  return Number.isFinite(weight) && weight > 0 ? weight : undefined;
}

function automaticCoinDiscount(user?: UserProfile, wallet?: CustomerWallet) {
  const availableCoins = wallet?.coins ?? user?.customerProfile?.coins ?? 0;
  return Math.floor(Math.max(0, availableCoins));
}

function customerVehicleCodeForWeight(weightKg: number) {
  if (weightKg <= 20) return 'bike';
  if (weightKg <= 90) return 'loader90';
  if (weightKg <= 500) return 'mini500';
  if (weightKg <= 750) return 'mini750';
  return undefined;
}

function customerVehicles(vehicles: Vehicle[]) {
  return vehicles
    .filter((vehicle) => customerVehicleCodes.includes(vehicle.code))
    .sort((left, right) => customerVehicleCodes.indexOf(left.code) - customerVehicleCodes.indexOf(right.code));
}

function suggestedCustomerVehicle(vehicles: Vehicle[], weightKg?: number) {
  if (!weightKg) return undefined;
  const requiredCode = customerVehicleCodeForWeight(weightKg);
  if (!requiredCode) return undefined;
  return customerVehicles(vehicles).find((vehicle) => vehicle.code === requiredCode);
}

function vehicleRule(vehicle: Vehicle) {
  return porterVehicleRules[vehicle.code];
}

function vehicleCanCarryWeight(vehicle: Vehicle, weightKg?: number) {
  if (!weightKg) return true;
  const rule = vehicleRule(vehicle);
  return weightKg <= (rule?.maxWeightKg ?? vehicle.capacityKg);
}

function porterVehicleQuote(vehicle: Vehicle, distanceKm?: number) {
  const billableKm = Math.max(1, Math.ceil(distanceKm || 1));
  return porterVehicleQuoteForBillableKm(vehicle, billableKm);
}

function porterVehicleQuoteForBillableKm(vehicle: Vehicle, billableKm: number) {
  const rule = vehicleRule(vehicle);
  const normalizedBillableKm = Math.max(1, Math.ceil(billableKm));
  const baseFare = rule?.baseFare ?? vehicle.baseFare;
  const perKmAfterFirst = rule?.perKmAfterFirst ?? vehicle.perKm;
  return baseFare + Math.max(0, normalizedBillableKm - 1) * perKmAfterFirst;
}

function vehicleIcon(vehicle: Vehicle): keyof typeof Ionicons.glyphMap {
  if (vehicle.code === 'loader90') return 'cube';
  if (vehicle.code === 'bike' || vehicle.capacityKg <= 40) return 'bicycle';
  if (vehicle.capacityKg <= 100) return 'cube';
  if (vehicle.capacityKg >= 1000) return 'bus';
  return 'car-sport';
}

function homeVehicleAccent(vehicle: Vehicle) {
  if (vehicle.code === 'bike') return colors.blue;
  if (vehicle.code === 'loader90') return colors.customer;
  if (vehicle.code === 'mini500') return colors.green;
  return colors.amber;
}

function vehicleCapacityText(vehicle: Vehicle, upTo: string) {
  const rule = vehicleRule(vehicle);
  if (vehicle.code === 'loader90') return '20-90 kg';
  if (rule) return `${upTo} ${rule.maxWeightKg} kg`;
  return `${upTo} ${vehicle.capacityKg} kg`;
}

function bookingStopsToLocationPoints(stops: BookingStop[]): LocationPoint[] {
  return stops
    .filter((stop) => stop.label.trim().length >= 2)
    .map((stop) => ({
      label: stop.label,
      address: stop.label,
      lat: stop.lat,
      lng: stop.lng
    }));
}

function composeBookingAddress(location: string, addressLine: string) {
  const detail = addressLine.trim();
  const base = location.trim();
  if (!detail) return base;
  if (!base) return detail;
  return `${detail}, ${base}`;
}

function routeStopSummary(stops?: LocationPoint[]) {
  const count = stops?.length ?? 0;
  if (!count) return '';
  return count === 1 ? '1 stop' : `${count} stops`;
}

function visibleTripOtp(order?: Order, cachedTripOtp?: TripOtp): TripOtp | undefined {
  if (!order || ['delivered', 'cancelled'].includes(order.status)) return undefined;
  const source = order.tripOtp ?? cachedTripOtp;
  const pickup = order.pod?.pickupOtpVerified ? undefined : source?.pickup;
  const drop = order.pod?.dropOtpVerified ? undefined : source?.drop;
  if (!pickup && !drop) return undefined;
  return { pickup, drop };
}

const defaultMapCenter = { lat: 26.8467, lng: 80.9462 };

function hasValidCoordinates(lat?: number, lng?: number) {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

function assertLocationHasCoordinates(location: LocationDetails) {
  if (!hasValidCoordinates(location.lat, location.lng)) {
    throw new Error('Location coordinates are invalid');
  }
}

function regionsAreClose(a: Region, b: Region) {
  return (
    Math.abs(a.latitude - b.latitude) < 0.00001 &&
    Math.abs(a.longitude - b.longitude) < 0.00001 &&
    Math.abs(a.latitudeDelta - b.latitudeDelta) < 0.00001 &&
    Math.abs(a.longitudeDelta - b.longitudeDelta) < 0.00001
  );
}

function formatReverseAddress(place?: Location.LocationGeocodedAddress) {
  if (!place) return '';
  return [
    place.name,
    place.street,
    place.district,
    place.city,
    place.region,
    place.postalCode
  ]
    .filter(Boolean)
    .join(', ');
}

function withLocationTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeout) clearTimeout(timeout);
  });
}

async function readDeviceLocation() {
  const existingPermission = await Location.getForegroundPermissionsAsync();
  const permission =
    existingPermission.status === 'granted'
      ? existingPermission
      : await Location.requestForegroundPermissionsAsync();
  if (permission.status !== 'granted') {
    throw new Error('Location permission is required');
  }

  const servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled) {
    throw new Error('Turn on device location/GPS');
  }

  try {
    return await withLocationTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      8000,
      'GPS is taking too long'
    );
  } catch (err) {
    const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: 120000 }).catch(() => null);
    if (lastKnown) return lastKnown;
    throw err;
  }
}

async function readCurrentLocationDetails(): Promise<LocationDetails> {
  const current = await readDeviceLocation();
  const lat = current.coords.latitude;
  const lng = current.coords.longitude;
  const reverse = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng }).catch(() => []);
  const address = formatReverseAddress(reverse[0]) || 'Current location';
  return {
    placeId: `current-${lat.toFixed(6)}-${lng.toFixed(6)}`,
    label: address,
    address,
    lat,
    lng
  };
}

function formatCountdown(ms: number) {
  const remaining = Math.max(0, ms);
  const totalSeconds = Math.ceil(remaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function formatLedgerDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function formatOrderCardDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const day = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  const time = date
    .toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
    .toLowerCase();
  return `${day} · ${time}`;
}

function formatCoinActivityDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfDate = new Date(date);
  startOfDate.setHours(0, 0, 0, 0);
  const dayDiff = Math.round((startOfToday.getTime() - startOfDate.getTime()) / 86_400_000);
  if (dayDiff === 0) return 'Today';
  if (dayDiff === 1) return 'Yesterday';
  if (dayDiff > 1 && dayDiff < 7) return `${dayDiff} days ago`;
  return formatLedgerDate(value);
}

function orderTimelineTime(order: Order, key: string) {
  const at = order.timeline.find((item) => item.key === key)?.at;
  if (!at) return undefined;
  const time = new Date(at).getTime();
  return Number.isNaN(time) ? undefined : time;
}

function orderEtaTarget(order: Order) {
  const pickedUpAt = orderTimelineTime(order, 'picked_up');
  return pickedUpAt ? pickedUpAt + order.etaMinutes * 60_000 : undefined;
}

function useOrderCountdown(order?: Order) {
  const [now, setNow] = useState(Date.now());
  const shouldRunTimer = order ? ['picked_up', 'in_transit'].includes(order.status) : false;

  useEffect(() => {
    if (!order || !shouldRunTimer) return undefined;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [order?.id, order?.status, shouldRunTimer]);

  if (!order || ['delivered', 'cancelled'].includes(order.status)) return undefined;
  if (!shouldRunTimer) {
    return {
      label: 'Starts after pickup',
      delayed: false,
      pendingPickup: true
    };
  }
  const targetAt = orderEtaTarget(order);
  if (!targetAt) {
    return {
      label: 'Pickup time syncing',
      delayed: false,
      pendingPickup: true
    };
  }
  const remainingMs = targetAt - now;
  return {
    label: formatCountdown(remainingMs),
    delayed: remainingMs <= 0,
    pendingPickup: false
  };
}

function isActiveOrder(order: Order) {
  return !['delivered', 'cancelled'].includes(order.status);
}

function isCustomerCancellableOrder(order: Order) {
  return ['searching', 'offered', 'accepted', 'arrived_pickup'].includes(order.status);
}

function AppStatusBar({ variant }: { variant: 'brand' | 'light' }) {
  return (
    <StatusBar
      barStyle="dark-content"
      backgroundColor={colors.white}
      translucent={false}
    />
  );
}

async function requestCustomerAppPermissions(api: IndieryApi, onMessage: (message: string) => void) {
  const denied: string[] = [];
  let registeredPushToken: string | undefined;

  try {
    const locationPermission = await Location.getForegroundPermissionsAsync();
    const locationStatus =
      locationPermission.status === 'granted'
        ? locationPermission
        : await Location.requestForegroundPermissionsAsync();
    if (locationStatus.status !== 'granted') denied.push('location');
  } catch {
    denied.push('location');
  }

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('orders', {
        name: 'Order updates',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        enableVibrate: true,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: colors.customer
      });
    }

    const notificationPermission = await Notifications.getPermissionsAsync();
    const notificationStatus =
      notificationPermission.status === 'granted'
        ? notificationPermission
        : await Notifications.requestPermissionsAsync();

    if (notificationStatus.status === 'granted') {
      if (expoProjectId) {
        try {
          const token = await Notifications.getExpoPushTokenAsync({ projectId: expoProjectId });
          await api.registerCustomerPushToken(token.data);
          registeredPushToken = token.data;
        } catch {
          onMessage('Notifications allowed. Push updates will register when network is available');
        }
      } else {
        onMessage('Push notification setup is incomplete. Link this app to an Expo project before release.');
      }
    } else {
      denied.push('notifications');
    }
  } catch {
    denied.push('notifications');
  }

  if (denied.length) {
    onMessage(`Enable ${denied.join(' and ')} permission in phone settings for full tracking updates`);
  }
  return registeredPushToken;
}

export default function App() {
  const responsive = useResponsiveLayout();
  const { bottom: rootBottomInset } = useSafeAreaInsets();
  const api = useMemo(() => new IndieryApi(apiBaseUrl), []);
  const socketRef = useRef<Socket | null>(null);
  const estimateRequestSeqRef = useRef(0);
  const pushTokenRef = useRef<string | undefined>(undefined);
  const lastNotificationResponseIdRef = useRef<string | undefined>(undefined);
  const exitBackPressedAtRef = useRef(0);
  const refreshInFlightRef = useRef(false);
  const [tab, setTab] = useState<Tab>('home');
  const [data, setData] = useState<CustomerBootstrap | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [step, setStep] = useState(1);
  const [booking, setBooking] = useState(initialBooking);
  const [fare, setFare] = useState<FareBreakup | null>(null);
  const [fareVehicleId, setFareVehicleId] = useState<string | undefined>();
  const [fareRouteKey, setFareRouteKey] = useState<string | undefined>();
  const [language, setLanguage] = useState<AppLanguage>('en');
  const [tripOtpByOrder, setTripOtpByOrder] = useState<Record<string, TripOtp>>({});
  const [selectedActiveOrderId, setSelectedActiveOrderId] = useState<string | undefined>();
  const [requestedOrderDetailId, setRequestedOrderDetailId] = useState<string | undefined>();
  const [notificationIntent, setNotificationIntent] = useState<{ responseId: string; orderId: string } | null>(null);
  const [pickupSearchOpen, setPickupSearchOpen] = useState(false);
  const [pickupDetailsMode, setPickupDetailsMode] = useState<'home' | 'book' | null>(null);

  useEffect(() => {
    boot();
    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    const handleResponse = (response: Notifications.NotificationResponse) => {
      const responseId = response.notification.request.identifier;
      if (lastNotificationResponseIdRef.current === responseId) return;
      const payload = response.notification.request.content.data ?? {};
      if (payload.role && payload.role !== 'customer') return;
      if (typeof payload.orderId !== 'string' || !payload.orderId) return;
      lastNotificationResponseIdRef.current = responseId;
      setNotificationIntent({ responseId, orderId: payload.orderId });
      void Notifications.clearLastNotificationResponseAsync();
    };

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) handleResponse(response);
    });
    const subscription = Notifications.addNotificationResponseReceivedListener(handleResponse);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!data || !notificationIntent) return;
    setSelectedActiveOrderId(notificationIntent.orderId);
    setRequestedOrderDetailId(notificationIntent.orderId);
    setTab('orders');
    setNotificationIntent(null);
    void refresh();
  }, [data, notificationIntent]);

  useEffect(() => {
    if (data?.vehicles.length && !booking.vehicleId) {
      setBooking((current) => ({ ...current, vehicleId: data.vehicles[0].id }));
    }
  }, [data?.vehicles.length]);

  const activeOrderIds = (data?.activeOrders ?? []).map((order) => order.id).join('|');
  useEffect(() => {
    if (!data) return;
    const activeOrders = data.activeOrders.length
      ? data.activeOrders
      : data.orders.filter(isActiveOrder);
    if (!activeOrders.length) {
      setSelectedActiveOrderId(undefined);
      return;
    }
    if (!selectedActiveOrderId || !activeOrders.some((order) => order.id === selectedActiveOrderId)) {
      setSelectedActiveOrderId(activeOrders[0].id);
    }
  }, [activeOrderIds, data?.orders.length, selectedActiveOrderId]);

  useAndroidBackHandler(() => {
    if (loading || !data) return false;
    if (pickupDetailsMode) {
      exitBackPressedAtRef.current = 0;
      setPickupDetailsMode(null);
      return true;
    }
    if (pickupSearchOpen) {
      exitBackPressedAtRef.current = 0;
      setPickupSearchOpen(false);
      return true;
    }
    if (needsCustomerProfile(data.user)) return confirmExitFromRoot();
    if (tab === 'wallet') {
      goHomeFromBack();
      return true;
    }
    if (tab !== 'home') return false;
    return confirmExitFromRoot();
  }, [loading, data, pickupDetailsMode, pickupSearchOpen, tab, language]);

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

  async function completeFirebaseLogin(
    firebaseIdToken: string,
    customerProfile?: CustomerOnboardingProfile
  ) {
    setError('');
    const login = await api.firebaseLogin('customer', firebaseIdToken, customerProfile);
    api.setToken(login.token);
    const bootstrap = await api.customerBootstrap();
    setData(bootstrap);
    setTab('home');
    connectRealtime(login.token);
    if (!needsCustomerProfile(bootstrap.user)) requestPermissionsAfterLogin();
  }

  function requestPermissionsAfterLogin() {
    requestCustomerAppPermissions(api, showToast)
      .then((token) => {
        pushTokenRef.current = token;
      })
      .catch(() => undefined);
  }

  function mergeRealtimeOrder(order: Order) {
    setData((current) => {
      if (!current) return current;
      const existingOrder =
        current.orders.find((item) => item.id === order.id) ??
        current.activeOrders.find((item) => item.id === order.id) ??
        (current.activeOrder?.id === order.id ? current.activeOrder : undefined);
      const preservedTripOtp = order.tripOtp ?? existingOrder?.tripOtp ?? tripOtpByOrder[order.id];
      const mergedOrder = {
        ...order,
        tripOtp: visibleTripOtp({ ...order, tripOtp: preservedTripOtp })
      };
      const orders = [mergedOrder, ...current.orders.filter((item) => item.id !== order.id)];
      const activeOrders = isActiveOrder(mergedOrder)
        ? [mergedOrder, ...current.activeOrders.filter((item) => item.id !== order.id)]
        : current.activeOrders.filter((item) => item.id !== order.id);
      return {
        ...current,
        activeOrder: activeOrders[0],
        activeOrders,
        orders
      };
    });
    if (isActiveOrder(order)) setSelectedActiveOrderId(order.id);
  }

  function connectRealtime(token: string) {
    socketRef.current?.disconnect();
    let hasConnectedOnce = false;
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
      if (hasConnectedOnce) void refresh();
      hasConnectedOnce = true;
    });
    socket.on('order:changed', (order: Order) => {
      mergeRealtimeOrder(order);
    });
  }

  async function refresh(interactive = false) {
    if (refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;
    if (interactive) setRefreshing(true);
    try {
      const bootstrap = await api.customerBootstrap();
      setData((current) => current ? bootstrap : current);
      if (interactive) showToast(copyFor(language, 'dataRefreshed'));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Refresh failed');
    } finally {
      refreshInFlightRef.current = false;
      if (interactive) setRefreshing(false);
    }
  }

  function showToast(message: string) {
    setToast(message.includes('à¤') ? copyFor('hi', 'languageSetHindi') : message);
    setTimeout(() => setToast(''), 2600);
  }

  function confirmExitFromRoot() {
    const now = Date.now();
    if (now - exitBackPressedAtRef.current < 1800) return false;
    exitBackPressedAtRef.current = now;
    showToast(copyFor(language, 'pressBackAgainToExit'));
    return true;
  }

  function goHomeFromBack() {
    exitBackPressedAtRef.current = 0;
    setTab('home');
  }

  async function estimateNow(nextStep = step, vehicleId = booking.vehicleId) {
    if (!vehicleId || !booking.pickup || !booking.drop) return;
    const requestId = ++estimateRequestSeqRef.current;
    const routeKey = bookingFareRouteKey(booking);
    setStep(nextStep);
    setBusy(true);
    try {
      const pickup = composeBookingAddress(booking.pickup, booking.pickupAddressLine);
      const drop = composeBookingAddress(booking.drop, booking.dropAddressLine);
      const result = await api.estimate({
        pickup,
        drop,
        vehicleId,
        coins: automaticCoinDiscount(data?.user, data?.wallet),
        weightKg: Number(booking.weightKg || 1),
        extraStops: [],
        pickupLat: booking.pickupLat,
        pickupLng: booking.pickupLng,
        dropLat: booking.dropLat,
        dropLng: booking.dropLng
      });
      if (requestId !== estimateRequestSeqRef.current) return;
      setFare(result.fare);
      setFareVehicleId(vehicleId);
      setFareRouteKey(routeKey);
    } catch (err) {
      if (requestId === estimateRequestSeqRef.current) {
        showToast(err instanceof Error ? err.message : 'Fare estimate failed');
      }
    } finally {
      if (requestId === estimateRequestSeqRef.current) setBusy(false);
    }
  }

  async function placeOrder() {
    if (busy || !booking.vehicleId) return;
    setBusy(true);
    try {
      const pickup = composeBookingAddress(booking.pickup, booking.pickupAddressLine);
      const drop = composeBookingAddress(booking.drop, booking.dropAddressLine);
      const input: CreateOrderInput = {
        pickup,
        drop,
        vehicleId: booking.vehicleId,
        goodsType: booking.goodsType.trim() || 'Documents',
        weightKg: Number(booking.weightKg || 1),
        coins: automaticCoinDiscount(data?.user, data?.wallet),
        paymentMode: booking.paymentMode,
        pickupContactName: booking.pickupContactName,
        pickupContactPhone: booking.pickupContactPhone,
        dropContactName: booking.dropContactName,
        dropContactPhone: booking.dropContactPhone,
        extraStops: [],
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
      const tripOtp = result.tripOtp ?? result.order.tripOtp;
      if (tripOtp?.pickup || tripOtp?.drop) {
        setTripOtpByOrder((current) => ({ ...current, [result.order.id]: tripOtp }));
      }
      setData((current) => {
        if (!current) return current;
        const orders = [confirmedOrder, ...current.orders.filter((order) => order.id !== confirmedOrder.id)];
        const activeOrders = isActiveOrder(confirmedOrder)
          ? [confirmedOrder, ...current.activeOrders.filter((order) => order.id !== confirmedOrder.id)]
          : current.activeOrders.filter((order) => order.id !== confirmedOrder.id);
        return {
          ...current,
          activeOrder: activeOrders[0],
          activeOrders,
          orders
        };
      });
      setStep(1);
      estimateRequestSeqRef.current += 1;
      setFare(null);
      setFareVehicleId(undefined);
      setFareRouteKey(undefined);
      setBooking((current) => ({ ...initialBooking, vehicleId: current.vehicleId }));
      setTab('orders');
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
      requestPermissionsAfterLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Profile update failed');
    } finally {
      setBusy(false);
    }
  }

  async function addSavedAddress(input: Omit<SavedAddress, 'id'>) {
    setBusy(true);
    try {
      const result = await api.addSavedAddress(input);
      setData((current) => current ? { ...current, user: result.user } : current);
      showToast('Address saved');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Save address failed');
    } finally {
      setBusy(false);
    }
  }

  async function deleteSavedAddress(addressId: string) {
    setBusy(true);
    try {
      const result = await api.deleteSavedAddress(addressId);
      setData((current) => current ? { ...current, user: result.user } : current);
      showToast('Address removed');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Remove address failed');
    } finally {
      setBusy(false);
    }
  }

  async function shareActiveOrder(order: Order) {
    try {
      const { trackingPath } = await api.createTrackingLink(order.id);
      const trackingUrl = `${socketUrl}${trackingPath}`;
      await Share.share({
        title: `Track ${order.orderNo}`,
        message: `Track your Indiery delivery ${order.orderNo}: ${trackingUrl}`,
        url: trackingUrl
      });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Share failed');
    }
  }

  async function logout() {
    setBusy(true);
    setError('');
    setData(null);
    setTab('home');
    setStep(1);
    estimateRequestSeqRef.current += 1;
    setFare(null);
    setFareVehicleId(undefined);
    setFareRouteKey(undefined);
    setBooking(initialBooking);
    setTripOtpByOrder({});
    setSelectedActiveOrderId(undefined);
    setRequestedOrderDetailId(undefined);
    setNotificationIntent(null);
    setPickupSearchOpen(false);
    setPickupDetailsMode(null);
    try {
      socketRef.current?.disconnect();
      socketRef.current = null;
      if (pushTokenRef.current) {
        await api.unregisterCustomerPushToken(pushTokenRef.current).catch(() => undefined);
        pushTokenRef.current = undefined;
      }
      api.setToken('');
      await auth().signOut();
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

  function cancelActiveOrder(order: Order) {
    Alert.alert(
      'Cancel booking',
      `Cancel ${order.orderNo}? You can cancel before the goods are picked up.`,
      [
        { text: 'Keep booking', style: 'cancel' },
        {
          text: 'Cancel booking',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              const result = await api.cancelOrder(order.id, 'Cancelled by customer');
              setData((current) => {
                if (!current || !result.order) return current;
                const activeOrders = current.activeOrders.filter((item) => item.id !== result.order?.id);
                return {
                  ...current,
                  activeOrder: activeOrders[0],
                  activeOrders,
                  orders: [result.order, ...current.orders.filter((item) => item.id !== result.order?.id)]
                };
              });
              showToast('Booking cancelled');
              setTab('orders');
            } catch (err) {
              showToast(err instanceof Error ? err.message : 'Cancel failed');
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
      <SafeAreaView edges={appSafeAreaEdges} style={styles.center}>
        <AppStatusBar variant="light" />
        <ActivityIndicator color={colors.customer} size="large" />
        <Text style={styles.muted}>{copyFor(language, 'loading')}</Text>
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <LoginScreen
        initialError={error}
        onCheckCustomer={(phone) => api.customerOnboardingStatus(phone)}
        onVerified={completeFirebaseLogin}
      />
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

  const activeOrders = data.activeOrders.length ? data.activeOrders : data.orders.filter(isActiveOrder);
  const activeOrder =
    activeOrders.find((order) => order.id === selectedActiveOrderId) ??
    data.activeOrder ??
    activeOrders[0];
  const openBook = (nextStep = 1) => {
    setStep(nextStep);
    setTab('book');
  };
  const applyHomePickupLocation = (location: LocationDetails, askForSenderDetails: boolean) => {
    setBooking((current) => ({
      ...current,
      pickup: location.address || location.label,
      pickupPlaceId: location.placeId,
      pickupLat: location.lat,
      pickupLng: location.lng,
      pickupAddressLine: '',
      pickupContactConfirmed: false
    }));
    setPickupSearchOpen(false);
    if (askForSenderDetails) setPickupDetailsMode('home');
  };
  const applyHomeTypedPickup = (value: string) => {
    const pickup = value.trim();
    if (!pickup) {
      showToast(copyFor(language, 'selectLocationFirst'));
      return;
    }
    setBooking((current) => ({
      ...current,
      pickup,
      pickupPlaceId: '',
      pickupLat: undefined,
      pickupLng: undefined,
      pickupAddressLine: '',
      pickupContactConfirmed: false
    }));
    setPickupSearchOpen(false);
    setPickupDetailsMode('home');
  };
  const handleHomeVehicleSelect = (vehicle: Vehicle) => {
    const serviceCategory: ServiceCategory = vehicle.code === 'bike' ? 'bike' : 'truck';
    setBooking((current) => ({
      ...current,
      serviceCategory,
      vehicleId: vehicle.id
    }));
    if (booking.pickup.trim().length >= 2 && !hasConfirmedPickupDetails(booking)) {
      setPickupDetailsMode('book');
      return;
    }
    openBook(1);
  };

  return (
    <LanguageContext.Provider value={language}>
    <SafeAreaView edges={tabScreenSafeAreaEdges} style={styles.shell}>
      <AppStatusBar variant="brand" />
      <View style={[styles.appHeader, responsive.isCompact && styles.appHeaderCompact, responsive.isSmall && styles.appHeaderSmall]}>
        <View style={[
          styles.appHeaderInner,
          responsive.isCompact && styles.appHeaderInnerCompact,
          { maxWidth: responsive.contentMaxWidth }
        ]}>
          <View style={styles.appHeaderCopy}>
            <Text style={[styles.eyebrow, responsive.isCompact && styles.eyebrowCompact]}>INDIERY</Text>
            <Text
              style={[
                styles.headerTitle,
                responsive.isCompact && styles.headerTitleCompact,
                responsive.isSmall && styles.headerTitleSmall
              ]}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {copyFor(language, 'hi')}, {data.user.name.split(' ')[0]}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copyFor(language, 'account')}
            style={[styles.avatar, responsive.isCompact && styles.avatarCompact]}
            onPress={() => setTab('account')}
          >
            <Text style={[styles.avatarText, responsive.isCompact && styles.avatarTextCompact]}>{data.user.initials}</Text>
          </Pressable>
        </View>
      </View>

      <View style={[
        styles.content,
        tab === 'home' && styles.homeContent,
        tab !== 'home' && styles.otherPageContent,
        { maxWidth: responsive.contentMaxWidth }
      ]}>
        {tab !== 'home' ? <View pointerEvents="none" style={styles.otherPageCurveSurface} /> : null}
        {tab === 'home' && (
          <HomeScreen
            api={api}
            data={data}
            booking={booking}
            setBooking={setBooking}
            onPickupPress={() => setPickupSearchOpen(true)}
            onVehicleSelect={handleHomeVehicleSelect}
            onBook={openBook}
          />
        )}
        {tab === 'book' && (
          <BookScreen
            api={api}
            user={data.user}
            savedAddresses={data.user.customerProfile?.savedAddresses ?? []}
            vehicles={data.vehicles}
            booking={booking}
            setBooking={setBooking}
            step={step}
            setStep={setStep}
            fare={fareRouteKey === bookingFareRouteKey(booking) ? fare : null}
            fareVehicleId={fareRouteKey === bookingFareRouteKey(booking) ? fareVehicleId : undefined}
            busy={busy}
            onSaveAddress={addSavedAddress}
            estimateNow={estimateNow}
            placeOrder={placeOrder}
            onBackToHome={goHomeFromBack}
          />
        )}
        {tab === 'orders' && (
          <OrdersScreen
            orders={data.orders}
            activeOrders={activeOrders}
            activeOrder={activeOrder}
            tripOtp={visibleTripOtp(activeOrder, activeOrder ? tripOtpByOrder[activeOrder.id] : undefined)}
            busy={busy}
            refreshing={refreshing}
            onBook={() => openBook()}
            onRefresh={() => void refresh(true)}
            onSelectActiveOrder={setSelectedActiveOrderId}
            detailOrderRequestId={requestedOrderDetailId}
            onDetailOrderRequestHandled={() => setRequestedOrderDetailId(undefined)}
            onShare={shareActiveOrder}
            onCancel={cancelActiveOrder}
            onBackToHome={goHomeFromBack}
          />
        )}
        {tab === 'wallet' && (
          <WalletScreen
            wallet={
              data.wallet ?? {
                balance: data.user.customerProfile?.walletBalance ?? 0,
                coins: data.user.customerProfile?.coins ?? 0,
                ledger: [],
                coinLedger: []
              }
            }
            busy={busy}
            onCoupon={async () => {
              setBusy(true);
              try {
                const result = await api.applyCoupon('FIRST50');
                setData((current) => current ? {
                  ...current,
                  user: result.user,
                  wallet: {
                    ...current.wallet,
                    coins: result.user.customerProfile?.coins ?? current.wallet.coins
                  }
                } : current);
                return result;
              } finally {
                setBusy(false);
              }
            }}
          />
        )}
        {tab === 'account' && (
          <AccountScreen
            data={data}
            busy={busy}
            language={language}
            onSaveProfile={saveProfile}
            onChangeLanguage={(nextLanguage) => {
              setLanguage(nextLanguage);
              showToast(nextLanguage === 'hi' ? 'भाषा हिन्दी पर सेट हुई' : 'Language set to English');
            }}
            onDeleteAddress={deleteSavedAddress}
            onLogout={logout}
            onRequestAccountDeletion={requestAccountDeletion}
            onBackToHome={goHomeFromBack}
          />
        )}
      </View>

      <BottomTabs active={tab} onChange={setTab} activeOrder={activeOrders.length > 0} />
      {pickupSearchOpen ? (
        <PickupSearchModal
          api={api}
          initialValue={booking.pickup}
          onClose={() => setPickupSearchOpen(false)}
          onSelectLocation={(location) => applyHomePickupLocation(location, true)}
          onUseCurrentLocation={(location) => applyHomePickupLocation(location, false)}
          onSelectTyped={applyHomeTypedPickup}
        />
      ) : null}
      {pickupDetailsMode ? (
        <ContactDetailsModal
          key={`home-pickup-${pickupDetailsMode}`}
          api={api}
          target="pickup"
          user={data.user}
          booking={booking}
          setBooking={setBooking}
          onSaveAddress={addSavedAddress}
          onClose={() => setPickupDetailsMode(null)}
          onChangeLocation={() => {
            setPickupDetailsMode(null);
            setPickupSearchOpen(true);
          }}
          onSaved={() => {
            const nextMode = pickupDetailsMode;
            setPickupDetailsMode(null);
            if (nextMode === 'book') openBook(1);
            else setTab('home');
          }}
        />
      ) : null}
      {toast ? (
        <View
          style={[
            styles.toast,
            {
              bottom: responsive.tabBarHeight + rootBottomInset + 12,
              left: Math.max(
                responsive.horizontalPadding,
                (responsive.width - Math.min(560, responsive.width - (responsive.horizontalPadding * 2))) / 2
              ),
              width: Math.min(560, responsive.width - (responsive.horizontalPadding * 2))
            }
          ]}
        >
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}
    </SafeAreaView>
    </LanguageContext.Provider>
  );
}

function LoginScreen({
  initialError,
  onCheckCustomer,
  onVerified
}: {
  initialError: string;
  onCheckCustomer: (phone: string) => Promise<{ needsProfile: boolean }>;
  onVerified: (firebaseIdToken: string, customerProfile?: CustomerOnboardingProfile) => Promise<void>;
}) {
  const responsive = useResponsiveLayout();
  const [loginStep, setLoginStep] = useState<LoginStep>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [profileRequired, setProfileRequired] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileCity, setProfileCity] = useState('Lucknow');
  const [confirmation, setConfirmation] = useState<FirebaseAuthTypes.ConfirmationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [loginPolicy, setLoginPolicy] = useState<LegalPolicy | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const loginScrollRef = useRef<ScrollView | null>(null);
  const fullLoginViewportRef = useRef({ width: responsive.width, height: responsive.height });
  if (Math.abs(fullLoginViewportRef.current.width - responsive.width) > 1) {
    fullLoginViewportRef.current = { width: responsive.width, height: responsive.height };
  } else if (!keyboardVisible && responsive.height > fullLoginViewportRef.current.height) {
    fullLoginViewportRef.current.height = responsive.height;
  }
  const keyboardLayoutVisible =
    keyboardVisible || fullLoginViewportRef.current.height - responsive.height > 120;
  const viewportKeyboardShrink = Math.max(0, fullLoginViewportRef.current.height - responsive.height);
  const androidKeyboardPadding =
    Platform.OS === 'android' && keyboardLayoutVisible
      ? Math.max(0, keyboardHeight - viewportKeyboardShrink)
      : 0;
  const normalizedPhone = phone.replace(/\D/g, '').slice(-10);
  const phoneReady = normalizedPhone.length === 10;
  const otpReady = code.trim().length === 6;

  useEffect(() => {
    setError(initialError);
  }, [initialError]);

  useEffect(() => {
    if (!confirmation) return undefined;
    const timer = setTimeout(() => loginScrollRef.current?.scrollTo({ y: 0, animated: false }), 100);
    return () => clearTimeout(timer);
  }, [confirmation]);

  useEffect(() => {
    if (!confirmation || resendSeconds <= 0) return undefined;
    const timer = setTimeout(() => setResendSeconds((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => clearTimeout(timer);
  }, [confirmation, resendSeconds]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardVisible(true);
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
      setKeyboardHeight(0);
    });
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useAndroidBackHandler(() => {
    if (loginPolicy) {
      setLoginPolicy(null);
      return true;
    }
    if (loginStep === 'otp') {
      setCode('');
      setError('');
      if (profileRequired) {
        setLoginStep('profile');
      } else {
        setConfirmation(null);
        setResendSeconds(0);
        setLoginStep('phone');
      }
      return true;
    }
    if (loginStep === 'profile') {
      changePhoneNumber();
      return true;
    }
    return false;
  }, [loginPolicy, loginStep, profileRequired]);

  function openLoginPolicy(policyId: LegalPolicy['id']) {
    setLoginPolicy(legalPolicies.find((policy) => policy.id === policyId) ?? null);
  }

  async function requestOtp() {
    const result = await auth().signInWithPhoneNumber(formatPhoneForFirebase(phone));
    setConfirmation(result);
    setCode('');
    setResendSeconds(30);
    setLoginStep('otp');
    setTimeout(() => loginScrollRef.current?.scrollTo({ y: 0, animated: false }), 0);
  }

  async function continueFromPhone() {
    setBusy(true);
    setError('');
    try {
      const formattedPhone = formatPhoneForFirebase(phone);
      const status = await onCheckCustomer(formattedPhone);
      setProfileRequired(status.needsProfile);
      if (status.needsProfile) {
        Keyboard.dismiss();
        setLoginStep('profile');
        setTimeout(() => loginScrollRef.current?.scrollTo({ y: 0, animated: false }), 0);
      } else {
        await requestOtp();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to continue');
    } finally {
      setBusy(false);
    }
  }

  async function continueFromProfile() {
    const nextProfile = {
      name: profileName.trim(),
      email: profileEmail.trim(),
      city: profileCity.trim()
    };
    if (nextProfile.name.length < 2) {
      setError('Enter your full name');
      return;
    }
    if (!nextProfile.email.includes('@')) {
      setError('Enter a valid email');
      return;
    }
    if (nextProfile.city.length < 2) {
      setError('Enter your city');
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (confirmation) {
        setLoginStep('otp');
        setTimeout(() => loginScrollRef.current?.scrollTo({ y: 0, animated: false }), 0);
      } else {
        await requestOtp();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send OTP');
    } finally {
      setBusy(false);
    }
  }

  async function sendOtp() {
    setBusy(true);
    setError('');
    try {
      await requestOtp();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send OTP');
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp() {
    if (!confirmation) return;
    Keyboard.dismiss();
    setBusy(true);
    setError('');
    try {
      const credential = await confirmation.confirm(code.trim());
      if (!credential?.user) throw new Error('Unable to verify OTP');
      const firebaseIdToken = await credential.user.getIdToken();
      await onVerified(
        firebaseIdToken,
        profileRequired
          ? { name: profileName.trim(), email: profileEmail.trim(), city: profileCity.trim() }
          : undefined
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid OTP');
    } finally {
      setBusy(false);
    }
  }

  function changePhoneNumber() {
    Keyboard.dismiss();
    setConfirmation(null);
    setCode('');
    setLoginStep('phone');
    setProfileRequired(false);
    setProfileName('');
    setProfileEmail('');
    setProfileCity('Lucknow');
    setResendSeconds(0);
    setError('');
    setTimeout(() => loginScrollRef.current?.scrollTo({ y: 0, animated: false }), 0);
  }

  function goBackFromOtp() {
    Keyboard.dismiss();
    setCode('');
    setError('');
    if (profileRequired) {
      setLoginStep('profile');
    } else {
      changePhoneNumber();
    }
  }

  return (
    <>
    <SafeAreaView
      edges={appSafeAreaEdges}
      style={styles.loginShell}
    >
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} translucent={false} />
      <KeyboardAvoidingView
        style={[styles.authKeyboard, androidKeyboardPadding > 0 && { paddingBottom: androidKeyboardPadding }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {loginStep === 'profile' ? (
          <LoginProfileStep
            profileName={profileName}
            profileEmail={profileEmail}
            profileCity={profileCity}
            phone={normalizedPhone}
            error={error}
            busy={busy}
            keyboardVisible={keyboardLayoutVisible}
            scrollRef={loginScrollRef}
            onChangeName={setProfileName}
            onChangeEmail={setProfileEmail}
            onChangeCity={setProfileCity}
            onBack={changePhoneNumber}
            onContinue={continueFromProfile}
            onKeyboardFocus={() => setKeyboardVisible(true)}
          />
        ) : loginStep === 'phone' ? (
          <LoginPhoneStep
            phone={phone}
            error={error}
            busy={busy}
            phoneReady={phoneReady}
            keyboardVisible={keyboardLayoutVisible}
            compactKeyboardLayout={
              keyboardLayoutVisible && fullLoginViewportRef.current.height < 750
            }
            scrollRef={loginScrollRef}
            onChangePhone={setPhone}
            onContinue={continueFromPhone}
            onOpenPolicy={openLoginPolicy}
            onKeyboardFocus={() => setKeyboardVisible(true)}
          />
        ) : (
        <ScrollView
          ref={loginScrollRef}
          style={styles.authScrollViewport}
          contentContainerStyle={[styles.authScroll, styles.authScrollOtp]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        >
          <View
            style={[
              styles.authResponsiveFrame,
              { maxWidth: Math.min(640, responsive.contentMaxWidth) }
            ]}
          >
            <View style={[styles.authForm, styles.authFormOtp]}>
              <>
                <Pressable
                  style={styles.loginOtpBackButton}
                  onPress={goBackFromOtp}
                  hitSlop={7}
                  accessibilityRole="button"
                  accessibilityLabel="Go back to mobile number"
                >
                  <Ionicons name="arrow-back" size={21} color={colors.ink} />
                </Pressable>
                <View style={styles.loginOtpIcon}>
                  <Ionicons name="shield-checkmark" size={24} color={colors.customer} />
                </View>
                <Text style={styles.loginOtpTitle}>OTP verification</Text>
                <Text style={styles.loginOtpSubtitle}>Enter the 6-digit code sent to</Text>
                <View style={styles.loginOtpDestinationRow}>
                  <Text style={styles.loginOtpPhone}>+91 {normalizedPhone}</Text>
                  <Pressable onPress={changePhoneNumber} hitSlop={6} accessibilityRole="button">
                    <Text style={styles.loginOtpChange}>Change</Text>
                  </Pressable>
                </View>
                <OtpCodeField
                  value={code}
                  onChangeText={setCode}
                  onSubmit={otpReady && !busy ? verifyOtp : undefined}
                />
                <View style={styles.loginOtpHintRow}>
                  <Ionicons name="lock-closed-outline" size={13} color={colors.muted} />
                  <Text style={styles.loginOtpHint}>Your code is private and securely verified.</Text>
                </View>
                {error ? <Text style={styles.loginError}>{error}</Text> : null}
                <AuthActionButton
                  title={busy ? 'Verifying…' : 'Verify and continue'}
                  onPress={verifyOtp}
                  disabled={!otpReady || busy}
                />
                <View style={styles.loginResendBlock}>
                  <Text style={styles.loginResendLabel}>
                    {resendSeconds > 0 ? `Resend OTP in ${resendSeconds}s` : "Didn't receive the code?"}
                  </Text>
                  <Pressable
                    style={[styles.loginResendButton, (resendSeconds > 0 || busy) && styles.loginResendButtonDisabled]}
                    onPress={sendOtp}
                    disabled={resendSeconds > 0 || busy}
                    accessibilityRole="button"
                  >
                    <Ionicons name="refresh-outline" size={15} color={resendSeconds > 0 || busy ? colors.muted : colors.customer} />
                    <Text style={[styles.loginResendText, (resendSeconds > 0 || busy) && styles.loginResendTextDisabled]}>
                      Resend OTP
                    </Text>
                  </Pressable>
                </View>
              </>
            </View>
          </View>
        </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
    <Modal
      visible={Boolean(loginPolicy)}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={() => setLoginPolicy(null)}
    >
      <SafeAreaView edges={appSafeAreaEdges} style={styles.loginPolicyShell}>
        <AppStatusBar variant="light" />
        {loginPolicy ? <AccountPolicyDetail policy={loginPolicy} onBack={() => setLoginPolicy(null)} /> : null}
      </SafeAreaView>
    </Modal>
    </>
  );
}

function LoginPhoneStep({
  phone,
  error,
  busy,
  phoneReady,
  keyboardVisible,
  compactKeyboardLayout,
  scrollRef,
  onChangePhone,
  onContinue,
  onOpenPolicy,
  onKeyboardFocus
}: {
  phone: string;
  error: string;
  busy: boolean;
  phoneReady: boolean;
  keyboardVisible: boolean;
  compactKeyboardLayout: boolean;
  scrollRef: React.RefObject<ScrollView | null>;
  onChangePhone: (value: string) => void;
  onContinue: () => void;
  onOpenPolicy: (policyId: LegalPolicy['id']) => void;
  onKeyboardFocus: () => void;
}) {
  const responsive = useResponsiveLayout();
  const maxWidth = Math.min(640, responsive.contentMaxWidth);
  const heroWidth = Math.min(responsive.width, maxWidth);
  // bg1 is 4:3. Matching its natural ratio prevents a white/empty strip and
  // keeps both sides of the artwork visible.
  const heroHeight = Math.round(heroWidth * (1086 / 1448));
  // Clip only the empty lower portion of the artwork while preserving the
  // original image scale and its top position.
  const heroVisibleHeight = keyboardVisible
    ? Math.round(heroHeight * (compactKeyboardLayout ? 0.86 : 0.9))
    : heroHeight;
  const consent = (
    <View style={[styles.loginConsent, keyboardVisible && styles.loginPhoneKeyboardConsent]}>
      <Text style={styles.loginConsentText}>By continuing, you agree to the</Text>
      <Pressable accessibilityRole="link" hitSlop={5} onPress={() => onOpenPolicy('terms')}>
        <Text style={styles.loginConsentLink}>Terms & Conditions</Text>
      </Pressable>
      <Text style={styles.loginConsentText}>and</Text>
      <Pressable accessibilityRole="link" hitSlop={5} onPress={() => onOpenPolicy('privacy')}>
        <Text style={styles.loginConsentLink}>Privacy Policy</Text>
      </Pressable>
      <Text style={styles.loginConsentText}>.</Text>
    </View>
  );

  return (
    <View style={styles.loginPhoneLayout}>
      <ScrollView
        ref={scrollRef}
        style={styles.authScrollViewport}
        contentContainerStyle={[
          styles.authScroll,
          keyboardVisible && styles.loginPhoneKeyboardScrollContent
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.authResponsiveFrame, { maxWidth }]}>
          <LoginHero
            title="Indiery"
            caption="Delivering trust, every mile."
            height={heroHeight}
            visibleHeight={heroVisibleHeight}
          />
          <View style={[styles.loginPhoneFormContent, keyboardVisible && styles.loginPhoneFormContentKeyboard]}>
            {!keyboardVisible ? <Text style={styles.authKicker}>Fast · Secure · Reliable</Text> : null}
            {!compactKeyboardLayout ? (
              <Text style={[styles.authTitle, keyboardVisible && styles.loginPhoneKeyboardTitle]}>
                Welcome to Indiery
              </Text>
            ) : null}
            {!keyboardVisible ? (
              <Text style={styles.loginSubtitle}>Enter your mobile number to book and track deliveries.</Text>
            ) : null}
            <PhoneLoginField
              value={phone}
              onChangeText={onChangePhone}
              onFocus={onKeyboardFocus}
              compact={keyboardVisible}
            />
            {error ? <Text style={styles.loginError}>{error}</Text> : null}
            {!keyboardVisible ? (
              <>
                <AuthActionButton
                  title={busy ? 'Checking…' : 'Continue'}
                  onPress={onContinue}
                  disabled={!phoneReady || busy}
                />
                {consent}
                <AuthDivider />
                <LoginFeatureRow />
              </>
            ) : null}
          </View>
        </View>
      </ScrollView>

      {keyboardVisible ? (
        <View
          style={[
            styles.loginPhoneKeyboardFooter,
            Platform.OS === 'android' && styles.androidKeyboardFooter
          ]}
        >
          <View style={[styles.loginPhoneKeyboardFooterInner, { maxWidth }]}>
            <AuthActionButton
              title={busy ? 'Checking…' : 'Continue'}
              onPress={onContinue}
              disabled={!phoneReady || busy}
            />
            {!compactKeyboardLayout ? consent : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function LoginProfileStep({
  profileName,
  profileEmail,
  profileCity,
  phone,
  error,
  busy,
  keyboardVisible,
  scrollRef,
  onChangeName,
  onChangeEmail,
  onChangeCity,
  onBack,
  onContinue,
  onKeyboardFocus
}: {
  profileName: string;
  profileEmail: string;
  profileCity: string;
  phone: string;
  error: string;
  busy: boolean;
  keyboardVisible: boolean;
  scrollRef: React.RefObject<ScrollView | null>;
  onChangeName: (value: string) => void;
  onChangeEmail: (value: string) => void;
  onChangeCity: (value: string) => void;
  onBack: () => void;
  onContinue: () => void;
  onKeyboardFocus: () => void;
}) {
  const responsive = useResponsiveLayout();
  const profileSmall = responsive.width <= 375;
  const profileCompact = responsive.width <= 400;
  const profileTitleSize = profileSmall ? 18 : profileCompact ? 19 : 20;
  const profileTitleLineHeight = profileSmall ? 22 : profileCompact ? 23 : 24;
  const profileBodyScale = profileSmall ? 0.86 : profileCompact ? 0.9 : 0.94;
  const revealField = (y: number) => {
    onKeyboardFocus();
    setTimeout(() => scrollRef.current?.scrollTo({ y, animated: true }), Platform.OS === 'ios' ? 220 : 140);
  };

  return (
    <View style={styles.loginProfileLayout}>
      <View
        style={[
          styles.loginProfileFixedHeader,
          profileCompact && styles.loginProfileFixedHeaderCompact,
          { maxWidth: Math.min(640, responsive.contentMaxWidth) }
        ]}
      >
        <View
          style={[
            styles.loginProfileHeaderTopRow,
            profileCompact && styles.loginProfileHeaderTopRowCompact
          ]}
        >
          <Pressable
            style={[
              styles.loginOtpBackButton,
              styles.loginProfileFixedBackButton,
              profileCompact && styles.loginProfileFixedBackButtonCompact
            ]}
            onPress={onBack}
            hitSlop={7}
            accessibilityRole="button"
            accessibilityLabel="Go back to mobile number"
          >
            <Ionicons name="arrow-back" size={19} color={colors.ink} />
          </Pressable>
          <View
            style={[
              styles.loginProfileProgressPill,
              profileCompact && styles.loginProfileProgressPillCompact
            ]}
          >
            <Ionicons
              name="shield-checkmark"
              size={profileCompact ? 12 : 13}
              color={colors.customer}
            />
            <Text
              style={[
                styles.loginProfileProgressText,
                { fontSize: 9 * profileBodyScale }
              ]}
            >
              Profile setup
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.loginProfileHeadingRow,
            profileCompact && styles.loginProfileHeadingRowCompact
          ]}
        >
          <View
            style={[
              styles.loginOtpIcon,
              styles.loginProfileFixedIcon,
              profileCompact && styles.loginProfileFixedIconCompact
            ]}
          >
            <Ionicons
              name="person-add-outline"
              size={profileCompact ? 19 : 21}
              color={colors.customer}
            />
          </View>
          <View style={styles.loginProfileHeadingCopy}>
            <Text
              style={[
                styles.authKicker,
                styles.loginProfileFixedKicker,
                {
                  fontSize: 9 * profileBodyScale,
                  lineHeight: 11 * profileBodyScale
                }
              ]}
            >
              Almost there
            </Text>
            <Text
              style={[
                styles.loginProfileTitle,
                styles.loginProfileFixedTitle,
                {
                  fontSize: profileTitleSize,
                  lineHeight: profileTitleLineHeight
                }
              ]}
            >
              Complete your profile
            </Text>
            <Text
              style={[
                styles.loginProfileSubtitle,
                styles.loginProfileFixedSubtitle,
                {
                  fontSize: 11 * profileBodyScale,
                  lineHeight: 16 * profileBodyScale
                }
              ]}
            >
              Add your details before we verify your mobile number.
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.loginProfileFieldsViewport}
        contentContainerStyle={[
          styles.loginProfileFieldsContent,
          profileCompact && styles.loginProfileFieldsContentCompact,
          keyboardVisible && styles.loginProfileFieldsContentKeyboard,
          { maxWidth: Math.min(640, responsive.contentMaxWidth) }
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'none'}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.loginProfileFormCard,
            profileCompact && styles.loginProfileFormCardCompact
          ]}
        >
          <Text
            style={[
              styles.loginProfileFormTitle,
              { fontSize: 15 * profileBodyScale }
            ]}
          >
            Personal details
          </Text>
          <Text
            style={[
              styles.loginProfileFormHint,
              {
                fontSize: 10 * profileBodyScale,
                lineHeight: 15 * profileBodyScale
              }
            ]}
          >
            Please enter accurate information for your bookings.
          </Text>
          <AuthField
            label="Full name"
            value={profileName}
            onChangeText={onChangeName}
            icon="person"
            autoFocus
            onFocus={() => revealField(0)}
            profile
            profileFontScale={profileBodyScale}
            profileCompact={profileCompact}
          />
          <AuthField
            label="Email"
            value={profileEmail}
            onChangeText={onChangeEmail}
            keyboardType="email-address"
            icon="mail"
            autoCapitalize="none"
            onFocus={() => revealField(72)}
            profile
            profileFontScale={profileBodyScale}
            profileCompact={profileCompact}
          />
          <AuthField
            label="Mobile number"
            value={`+91 ${phone}`}
            editable={false}
            keyboardType="phone-pad"
            icon="call"
            profile
            profileFontScale={profileBodyScale}
            profileCompact={profileCompact}
          />
          <AuthField
            label="City"
            value={profileCity}
            onChangeText={onChangeCity}
            icon="location"
            onFocus={() => revealField(240)}
            profile
            profileFontScale={profileBodyScale}
            profileCompact={profileCompact}
          />
          {error ? <Text style={styles.loginError}>{error}</Text> : null}
        </View>
        {!keyboardVisible ? (
          <View
            style={[
              styles.loginProfileInlineAction,
              profileCompact && styles.loginProfileInlineActionCompact
            ]}
          >
            <AuthActionButton
              title={busy ? 'Sending OTP…' : 'Continue'}
              onPress={onContinue}
              disabled={busy}
            />
            <View
              style={[
                styles.loginProfilePrivacyRow,
                profileCompact && styles.loginProfilePrivacyRowCompact
              ]}
            >
              <Ionicons name="lock-closed-outline" size={12} color={colors.muted} />
              <Text style={styles.loginProfilePrivacyText}>Your details are private and securely protected.</Text>
            </View>
          </View>
        ) : null}
      </ScrollView>

      {keyboardVisible ? (
        <View
          style={[
            styles.authKeyboardFooter,
            Platform.OS === 'android' && styles.androidKeyboardFooter,
            Platform.OS === 'android' && styles.loginProfileAndroidKeyboardFooter
          ]}
        >
          <AuthActionButton
            title={busy ? 'Sending OTP…' : 'Continue'}
            onPress={onContinue}
            disabled={busy}
          />
        </View>
      ) : null}
    </View>
  );
}

function LoginHero({
  title,
  caption,
  height,
  visibleHeight
}: {
  title: string;
  caption: string;
  height: number;
  visibleHeight: number;
}) {
  return (
    <View style={[styles.loginHero, { height: visibleHeight, minHeight: visibleHeight, maxHeight: visibleHeight }]}>
      <Image
        source={customerLoginBackgroundImage}
        style={[styles.loginHeroImage, { height }]}
        resizeMode="contain"
      />
      <View style={styles.loginHeroWash} />
      <View style={styles.loginBrandPanel}>
        <Image
          source={indieryLogoImage}
          style={styles.loginBrandLogo}
          resizeMode="contain"
          accessibilityLabel={title}
        />
        <Text style={styles.loginHeroCaption}>{caption}</Text>
      </View>
    </View>
  );
}

function PhoneLoginField({
  value,
  onChangeText,
  onFocus,
  compact = false
}: {
  value: string;
  onChangeText: (value: string) => void;
  onFocus?: () => void;
  compact?: boolean;
}) {
  return (
    <View style={[styles.authFieldGroup, compact && styles.phoneFieldGroupCompact]}>
      <Text style={styles.fieldLabel}>Mobile Number</Text>
      <View style={[styles.phoneInputShell, compact && styles.phoneInputShellCompact]}>
        <Ionicons name="phone-portrait-outline" size={18} color={colors.customer} />
        <Text style={styles.countryCode}>+91</Text>
        <Ionicons name="chevron-down" size={14} color={colors.muted} />
        <View style={styles.phoneDivider} />
        <TextInput
          value={value}
          onChangeText={(nextValue) => onChangeText(nextValue.replace(/\D/g, '').slice(0, 10))}
          keyboardType="phone-pad"
          maxLength={10}
          placeholder="Enter your mobile number"
          placeholderTextColor="#9CA3AF"
          style={styles.phoneInputText}
          onFocus={onFocus}
        />
      </View>
    </View>
  );
}

function OtpCodeField({
  value,
  onChangeText,
  onSubmit
}: {
  value: string;
  onChangeText: (value: string) => void;
  onSubmit?: () => void;
}) {
  const inputRef = useRef<React.ElementRef<typeof NativeTextInput> | null>(null);
  const digits = value.replace(/\D/g, '').slice(0, 6);

  return (
    <Pressable
      style={styles.loginOtpField}
      onPress={() => inputRef.current?.focus()}
      accessibilityRole="button"
      accessibilityLabel="Enter 6-digit OTP"
    >
      <View style={styles.loginOtpBoxes} pointerEvents="none">
        {Array.from({ length: 6 }).map((_, index) => {
          const digit = digits[index] ?? '';
          const active = index === Math.min(digits.length, 5);
          return (
            <View
              key={index}
              style={[
                styles.loginOtpBox,
                digit && styles.loginOtpBoxFilled,
                active && styles.loginOtpBoxActive
              ]}
            >
              <Text style={styles.loginOtpDigit}>{digit}</Text>
            </View>
          );
        })}
      </View>
      <NativeTextInput
        ref={inputRef}
        value={digits}
        onChangeText={(nextValue) => onChangeText(nextValue.replace(/\D/g, '').slice(0, 6))}
        onSubmitEditing={onSubmit}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={6}
        autoFocus
        caretHidden
        allowFontScaling={false}
        style={styles.loginOtpHiddenInput}
      />
    </Pressable>
  );
}

function AuthActionButton({
  title,
  onPress,
  disabled = false
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={[styles.authPrimaryButton, disabled && styles.authPrimaryButtonDisabled]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
    >
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
  const responsive = useResponsiveLayout();
  const [name, setName] = useState(user.name === 'Indiery Customer' ? '' : user.name);
  const [email, setEmail] = useState(user.email || '');
  const [city, setCity] = useState(user.city || 'Lucknow');
  const [localError, setLocalError] = useState('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const profileScrollRef = useRef<ScrollView | null>(null);
  const profileFocusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSubscription = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => {
      if (profileFocusTimerRef.current) clearTimeout(profileFocusTimerRef.current);
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  function revealProfileField(y: number) {
    if (profileFocusTimerRef.current) clearTimeout(profileFocusTimerRef.current);
    profileFocusTimerRef.current = setTimeout(() => {
      profileScrollRef.current?.scrollTo({ y, animated: true });
      profileFocusTimerRef.current = null;
    }, Platform.OS === 'ios' ? 260 : 180);
  }

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
    <SafeAreaView edges={appSafeAreaEdges} style={styles.loginShell}>
      <AppStatusBar variant="light" />
      <KeyboardAvoidingView style={styles.authKeyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={profileScrollRef}
          style={styles.authScrollViewport}
          contentContainerStyle={styles.profileSetupScroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.authResponsiveFrame,
              { maxWidth: Math.min(640, responsive.contentMaxWidth) }
            ]}
          >
            {!keyboardVisible ? (
              <View style={styles.profileSetupHero}>
                <View style={styles.profileSetupHeroIcon}>
                  <Ionicons name="person-add-outline" size={28} color={colors.customer} />
                </View>
                <Text style={styles.profileSetupHeroKicker}>WELCOME TO INDIERY</Text>
                <Text style={styles.profileSetupHeroTitle}>Tell us about you</Text>
                <Text style={styles.profileSetupHeroText}>A few details will help us personalize your deliveries.</Text>
              </View>
            ) : null}
            <View style={styles.authForm}>
              <Text style={styles.authKicker}>Almost there</Text>
              <Text style={styles.authTitle}>Profile</Text>
              <Text style={styles.loginSubtitle}>Complete your profile</Text>
              <AuthField
                label="Full name"
                value={name}
                onChangeText={setName}
                icon="person"
                autoFocus
                onFocus={() => revealProfileField(0)}
              />
              <AuthField
                label="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                icon="mail"
                autoCapitalize="none"
                onFocus={() => revealProfileField(60)}
              />
              <AuthField
                label="City"
                value={city}
                onChangeText={setCity}
                icon="location"
                onFocus={() => revealProfileField(130)}
              />
              <AuthField label="Mobile number" value={user.phone} editable={false} keyboardType="phone-pad" icon="call" />
              {localError || error ? <Text style={styles.loginError}>{localError || error}</Text> : null}
              {!keyboardVisible ? (
                <AuthActionButton title={busy ? 'Saving' : 'Continue'} onPress={submit} disabled={busy} />
              ) : null}
            </View>
          </View>
        </ScrollView>
        {keyboardVisible ? (
          <View style={styles.authKeyboardFooter}>
            <AuthActionButton title={busy ? 'Saving' : 'Continue'} onPress={submit} disabled={busy} />
          </View>
        ) : null}
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
  maxLength,
  autoFocus = false,
  onFocus,
  profile = false,
  profileFontScale = 1,
  profileCompact = false
}: {
  label: string;
  value: string;
  onChangeText?: (value: string) => void;
  keyboardType?: 'default' | 'numeric' | 'phone-pad' | 'email-address';
  editable?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  icon: keyof typeof Ionicons.glyphMap;
  maxLength?: number;
  autoFocus?: boolean;
  onFocus?: () => void;
  profile?: boolean;
  profileFontScale?: number;
  profileCompact?: boolean;
}) {
  return (
    <View
      style={[
        styles.authFieldGroup,
        profile && styles.loginProfileFieldGroup,
        profile && profileCompact && styles.loginProfileFieldGroupCompact
      ]}
    >
      <Text
        style={[
          styles.fieldLabel,
          profile && styles.loginProfileFieldLabel,
          profile && { fontSize: 10 * profileFontScale }
        ]}
      >
        {label}
      </Text>
      <View
        style={[
          styles.authInputShell,
          profile && styles.loginProfileInputShell,
          profile && profileCompact && styles.loginProfileInputShellCompact,
          !editable && styles.authInputReadonly
        ]}
      >
        {profile ? (
          <View
            style={[
              styles.loginProfileFieldIcon,
              profileCompact && styles.loginProfileFieldIconCompact,
              !editable && styles.loginProfileFieldIconReadonly
            ]}
          >
            <Ionicons
              name={icon}
              size={profileCompact ? 15 : 17}
              color={editable ? colors.customer : colors.muted}
            />
          </View>
        ) : (
          <Ionicons name={icon} size={18} color={editable ? colors.customer : colors.muted} />
        )}
        <TextInput
          value={value}
          editable={editable}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          maxLength={maxLength}
          autoFocus={autoFocus}
          onFocus={onFocus}
          placeholderTextColor={colors.muted}
          style={[
            styles.authInputText,
            profile && styles.loginProfileInputText,
            profile && { fontSize: 14 * profileFontScale }
          ]}
        />
      </View>
    </View>
  );
}

function HomeScreen({
  api,
  data,
  booking,
  setBooking,
  onPickupPress,
  onVehicleSelect,
  onBook
}: {
  api: IndieryApi;
  data: CustomerBootstrap;
  booking: typeof initialBooking;
  setBooking: React.Dispatch<React.SetStateAction<typeof initialBooking>>;
  onPickupPress: () => void;
  onVehicleSelect: (vehicle: Vehicle) => void;
  onBook: (nextStep?: number) => void;
}) {
  const copy = useCopy();
  const responsive = useResponsiveLayout();
  const compact = responsive.isCompact;
  const small = responsive.isSmall;
  const lastOrder = data.orders[0];
  const [autoPickupLoading, setAutoPickupLoading] = useState(false);
  const [announcementIndex, setAnnouncementIndex] = useState(0);
  const [announcementWidth, setAnnouncementWidth] = useState(0);
  const autoPickupAttemptedRef = useRef(false);
  const announcementScrollRef = useRef<React.ElementRef<typeof ScrollView> | null>(null);
  const vehicleChoices = customerVehicles(data.vehicles);
  const pickupText = booking.pickup.trim();
  const pickupDisplay = pickupText || (autoPickupLoading ? copy.settingPickupLocation : copy.setPickupLocation);
  const pickupSelected = typeof booking.pickupLat === 'number' && typeof booking.pickupLng === 'number';
  const homeVehicleCards: Array<{
    id: string;
    title: string;
    subtitle: string;
    vehicle: Vehicle;
    accent: string;
  }> = vehicleChoices.map((vehicle) => ({
    id: vehicle.id,
    title: vehicle.shortName,
    subtitle: `${vehicleCapacityText(vehicle, copy.upTo)} - ${vehicle.etaMinutes} min`,
    vehicle,
    accent: homeVehicleAccent(vehicle)
  }));
  const homeAnnouncements: Array<{
    id: string;
    icon: keyof typeof Ionicons.glyphMap;
    iconColor: string;
    title: string;
    subtitle: string;
  }> = [
    {
      id: 'instant',
      icon: 'megaphone',
      iconColor: colors.blue,
      title: copy.instantBooking,
      subtitle: `${copy.otpSecured} - ${copy.liveTracking}`
    },
    {
      id: 'coins',
      icon: 'gift',
      iconColor: colors.amber,
      title: copy.indieryCoins,
      subtitle: copy.useCoinsDiscount
    },
    {
      id: 'tracking',
      icon: 'navigate-circle',
      iconColor: colors.customer,
      title: copy.liveTracking,
      subtitle: copy.completedCancelledBookingsAppear
    }
  ];

  useEffect(() => {
    if (!announcementWidth || homeAnnouncements.length <= 1) return undefined;
    const timer = setInterval(() => {
      setAnnouncementIndex((current) => {
        const next = (current + 1) % homeAnnouncements.length;
        announcementScrollRef.current?.scrollTo({ x: next * announcementWidth, animated: true });
        return next;
      });
    }, 3500);
    return () => clearInterval(timer);
  }, [announcementWidth, homeAnnouncements.length]);

  useEffect(() => {
    if (autoPickupAttemptedRef.current || pickupText) return undefined;
    autoPickupAttemptedRef.current = true;
    let cancelled = false;

    async function setCurrentPickup() {
      setAutoPickupLoading(true);
      try {
        const location = await readCurrentLocationDetails();
        if (cancelled) return;
        setBooking((current) => (
          current.pickup
            ? current
            : {
                ...current,
                pickup: location.address || location.label,
                pickupPlaceId: location.placeId,
                pickupLat: location.lat,
                pickupLng: location.lng,
                pickupContactConfirmed: false
              }
        ));
      } catch {
        // Home stays usable if location permission or GPS is not available.
      } finally {
        if (!cancelled) setAutoPickupLoading(false);
      }
    }

    setCurrentPickup();
    return () => {
      cancelled = true;
    };
  }, [setBooking]);

  function startBookingFromHome(vehicle: Vehicle) {
    onVehicleSelect(vehicle);
  }

  return (
    <View style={styles.homeShell}>
      <View pointerEvents="none" style={styles.homeCurveSurface}>
        <View style={styles.homeMapPattern}>
          <View style={[styles.homePatternRoad, styles.homePatternRoadOne]} />
          <View style={[styles.homePatternRoad, styles.homePatternRoadTwo]} />
          <View style={[styles.homePatternRoad, styles.homePatternRoadThree]} />
        </View>
      </View>
      <ScrollView
        contentContainerStyle={[
          styles.homeScroll,
          compact && styles.homeScrollCompact,
          { maxWidth: responsive.contentMaxWidth, paddingHorizontal: responsive.horizontalPadding }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable style={[styles.homeLocationCard, compact && styles.homeLocationCardCompact]} onPress={onPickupPress}>
          <View style={[
            styles.homeLocationIcon,
            compact && styles.homeLocationIconCompact,
            pickupSelected && styles.homeLocationIconSelected
          ]}>
            {autoPickupLoading ? (
              <ActivityIndicator size="small" color={colors.customer} />
            ) : (
              <Ionicons name={pickupSelected ? 'home' : 'locate'} size={compact ? 16 : 18} color={pickupSelected ? colors.white : colors.customer} />
            )}
          </View>
          <View style={styles.flex}>
            <Text style={[styles.homeLocationLabel, compact && styles.homeLocationLabelCompact]}>{copy.pickupLocation}</Text>
            <Text style={[styles.homeLocationTitle, compact && styles.homeLocationTitleCompact]} numberOfLines={1}>{pickupDisplay}</Text>
          </View>
          <Ionicons name="arrow-forward" size={compact ? 17 : 18} color={colors.customer} />
        </Pressable>

        <View style={[styles.homeServiceGrid, compact && styles.homeServiceGridCompact]}>
          {homeVehicleCards.map((service) => (
            <Pressable
              key={service.id}
              style={[
                styles.homeServiceCard,
                compact && styles.homeServiceCardCompact,
                small && styles.homeServiceCardSmall
              ]}
              onPress={() => startBookingFromHome(service.vehicle)}
            >
              <HomeVehicleVisual vehicle={service.vehicle} color={service.accent} compact={compact} small={small} />
              <View style={styles.homeServiceFooter}>
                <View style={styles.flex}>
                  <Text style={[styles.homeServiceTitle, compact && styles.homeServiceTitleCompact, small && styles.homeServiceTitleSmall]}>{service.title}</Text>
                  <Text style={[styles.homeServiceSubtitle, compact && styles.homeServiceSubtitleCompact]} numberOfLines={2}>{service.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={compact ? 15 : 17} color={colors.ink} />
              </View>
            </Pressable>
          ))}
        </View>

      {lastOrder ? (
        <Pressable style={[styles.rebookCard, compact && styles.rebookCardCompact]} onPress={() => onBook(1)}>
          <View style={[styles.rebookIcon, compact && styles.rebookIconCompact]}>
            <Ionicons name="repeat" size={compact ? 16 : 18} color={colors.customer} />
          </View>
          <View style={styles.flex}>
            <Text style={[styles.cardTitle, compact && styles.cardTitleCompact]}>{copy.repeatLastRoute}</Text>
            <Text style={[styles.mutedSmall, compact && styles.mutedSmallCompact]} numberOfLines={small ? 1 : 2}>
              {lastOrder.pickup.label} to {lastOrder.drop.label}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={compact ? 16 : 18} color={colors.muted} />
        </Pressable>
      ) : null}

        <View style={[styles.homeAnnouncementHeader, compact && styles.homeAnnouncementHeaderCompact]}>
          <Text style={[styles.homeAnnouncementTitle, compact && styles.homeAnnouncementTitleCompact]}>Announcements</Text>
        </View>
        <View
          style={[styles.homeAnnouncementCarousel, compact && styles.homeAnnouncementCarouselCompact]}
          onLayout={(event) => setAnnouncementWidth(event.nativeEvent.layout.width)}
        >
          <ScrollView
            ref={announcementScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              if (!announcementWidth) return;
              setAnnouncementIndex(Math.round(event.nativeEvent.contentOffset.x / announcementWidth));
            }}
          >
            {homeAnnouncements.map((item) => (
              <View
                key={item.id}
                style={[
                  styles.homeAnnouncementCard,
                  compact && styles.homeAnnouncementCardCompact,
                  announcementWidth ? { width: announcementWidth } : null
                ]}
              >
                <View style={[styles.homeAnnouncementIcon, compact && styles.homeAnnouncementIconCompact]}>
                  <Ionicons name={item.icon} size={compact ? 18 : 22} color={item.iconColor} />
                </View>
                <View style={styles.flex}>
                  <Text style={[styles.homeAnnouncementCopy, compact && styles.homeAnnouncementCopyCompact]}>{item.title}</Text>
                  <Text style={[styles.homeAnnouncementMeta, compact && styles.homeAnnouncementMetaCompact]}>{item.subtitle}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
        <View style={styles.homeDots}>
          {homeAnnouncements.map((item, index) => (
            <View key={item.id} style={[styles.homeDot, index === announcementIndex && styles.homeDotActive]} />
          ))}
        </View>

      </ScrollView>
    </View>
  );
}

function PickupSearchModal({
  api,
  initialValue,
  onClose,
  onSelectLocation,
  onUseCurrentLocation,
  onSelectTyped
}: {
  api: IndieryApi;
  initialValue: string;
  onClose: () => void;
  onSelectLocation: (location: LocationDetails) => void;
  onUseCurrentLocation: (location: LocationDetails) => void;
  onSelectTyped: (value: string) => void;
}) {
  const copy = useCopy();
  const responsive = useResponsiveLayout();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [localError, setLocalError] = useState('');
  const requestSeqRef = useRef(0);
  const sessionTokenRef = useRef(`home-pickup-${Date.now()}-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    setQuery('');
    setSuggestions([]);
    setLocalError('');
  }, [initialValue]);

  useEffect(() => {
    const search = query.trim();
    if (search.length < 3) {
      setSuggestions([]);
      setLocalError('');
      return;
    }

    const requestId = ++requestSeqRef.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const result = await api.autocompleteLocations(search, sessionTokenRef.current);
        if (requestId === requestSeqRef.current) {
          setSuggestions(result.suggestions);
          setLocalError('');
        }
      } catch {
        if (requestId === requestSeqRef.current) {
          setSuggestions([]);
          setLocalError('Location search unavailable');
        }
      } finally {
        if (requestId === requestSeqRef.current) setLoading(false);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [api, query]);

  async function chooseSuggestion(suggestion: LocationSuggestion) {
    setLoading(true);
    setLocalError('');
    try {
      const result = await api.locationDetails(suggestion.placeId, sessionTokenRef.current);
      assertLocationHasCoordinates(result.location);
      onSelectLocation(result.location);
      sessionTokenRef.current = `home-pickup-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    } catch {
      setLocalError('Could not select this location');
    } finally {
      setLoading(false);
    }
  }

  async function useCurrentLocation() {
    setLocating(true);
    setLocalError('');
    try {
      const location = await readCurrentLocationDetails();
      onUseCurrentLocation(location);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Could not read current location');
    } finally {
      setLocating(false);
    }
  }

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <AppStatusBar variant="light" />
      <SafeAreaView edges={appSafeAreaEdges} style={styles.pickupSearchShell}>
        <KeyboardAvoidingView style={styles.pickupSearchKeyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.pickupSearchContent, { maxWidth: responsive.contentMaxWidth }]}>
          <View style={styles.pickupSearchTopBar}>
            <Pressable
              style={styles.pickupSearchBackButton}
              onPress={onClose}
              hitSlop={4}
              accessibilityRole="button"
              accessibilityLabel="Close pickup search"
            >
              <Ionicons name="arrow-back" size={22} color={colors.ink} />
            </Pressable>
          </View>
          <View style={styles.pickupSearchCard}>
            <View style={styles.pickupSearchInputShell}>
              <View style={styles.pickupSearchDot} />
              <TextInput
                value={query}
                autoFocus
                onChangeText={(value) => {
                  setQuery(value);
                  setLocalError('');
                }}
                placeholder={copy.setPickupLocation}
                placeholderTextColor="#9AA7BD"
                style={styles.pickupSearchInput}
                returnKeyType="search"
                onSubmitEditing={() => onSelectTyped(query)}
              />
              {loading ? (
                <ActivityIndicator size="small" color={colors.customer} />
              ) : (
                <Ionicons name="mic-outline" size={19} color={colors.customer} />
              )}
            </View>
          </View>

          <Pressable style={styles.pickupSearchMapButton} onPress={() => onSelectTyped(query || initialValue)}>
            <Ionicons name="map" size={15} color={colors.customer} />
            <Text style={styles.pickupSearchMapText}>{copy.selectOnMap}</Text>
          </Pressable>

          <Pressable style={styles.pickupSearchCurrentButton} onPress={useCurrentLocation}>
            {locating ? <ActivityIndicator size="small" color={colors.customer} /> : <Ionicons name="locate" size={16} color={colors.customer} />}
            <Text style={styles.pickupSearchCurrentText}>{copy.useCurrentLocation}</Text>
          </Pressable>

          {localError ? <Text style={styles.pickupSearchError}>{localError}</Text> : null}

          <ScrollView
            style={styles.pickupSearchResults}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.pickupSearchResultsContent}
          >
            {suggestions.map((suggestion) => (
              <Pressable
                key={suggestion.placeId}
                style={styles.pickupSearchResultItem}
                onPress={() => chooseSuggestion(suggestion)}
              >
                <View style={styles.pickupSearchResultIcon}>
                  <Ionicons name="location-outline" size={17} color={colors.customer} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.pickupSearchResultTitle}>{suggestion.mainText}</Text>
                  {suggestion.secondaryText ? (
                    <Text style={styles.pickupSearchResultSubtitle} numberOfLines={1}>{suggestion.secondaryText}</Text>
                  ) : null}
                </View>
              </Pressable>
            ))}
          </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

function HomeVehicleVisual({
  vehicle,
  color,
  compact = false,
  small = false
}: {
  vehicle: Vehicle;
  color: string;
  compact?: boolean;
  small?: boolean;
}) {
  const source = vehicleArtSources[vehicle.code] ?? mini700VehicleImage;
  return (
    <View style={[styles.homeServiceArt, compact && styles.homeServiceArtCompact, small && styles.homeServiceArtSmall]}>
      <View style={[styles.homeServiceArtHalo, compact && styles.homeServiceArtHaloCompact, { backgroundColor: `${color}1F` }]} />
      <View style={[styles.homeServiceArtShadow, compact && styles.homeServiceArtShadowCompact, { backgroundColor: color }]} />
      <Image
        source={source}
        resizeMode="contain"
        style={[
          styles.homeVehicleImage,
          compact && styles.homeVehicleImageCompact,
          small && styles.homeVehicleImageSmall,
          vehicle.code === 'bike' && styles.homeVehicleImageBike,
          vehicle.code === 'bike' && compact && styles.homeVehicleImageBikeCompact,
          vehicle.code === 'loader90' && styles.homeVehicleImageLoader
        ]}
      />
    </View>
  );
}

function LocationPickerField({
  api,
  label,
  value,
  selected,
  variant = 'default',
  placeholder,
  onChangeText,
  onSelect,
  onDoneTyping,
  onOpenMap
}: {
  api: IndieryApi;
  label: string;
  value: string;
  selected: boolean;
  variant?: 'default' | 'route';
  placeholder?: string;
  onChangeText: (value: string) => void;
  onSelect: (location: LocationDetails) => void;
  onDoneTyping?: (value: string) => void;
  onOpenMap?: () => void;
}) {
  const copy = useCopy();
  const responsive = useResponsiveLayout();
  const isPickup = label === copy.pickup || label === 'Pickup';
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [localError, setLocalError] = useState('');
  const requestSeqRef = useRef(0);
  const sessionTokenRef = useRef(`loc-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const skipDoneTypingRef = useRef(false);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typedLocation = value.trim();
  const showTypedLocationOption = Boolean(onDoneTyping && focused && typedLocation.length >= 3);

  useEffect(() => () => {
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
  }, []);

  useEffect(() => {
    const query = value.trim();
    if (!focused || query.length < 3) {
      requestSeqRef.current += 1;
      setSuggestions([]);
      setLoading(false);
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
    }, 220);

    return () => clearTimeout(timer);
  }, [api, focused, value]);

  async function chooseSuggestion(suggestion: LocationSuggestion) {
    requestSeqRef.current += 1;
    setSuggestions([]);
    setFocused(false);
    setLoading(true);
    setLocalError('');
    try {
      const result = await api.locationDetails(suggestion.placeId, sessionTokenRef.current);
      assertLocationHasCoordinates(result.location);
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
    <View style={[styles.locationFieldGroup, variant === 'route' && styles.routeLocationFieldGroup]}>
      {variant === 'default' ? (
        <View style={[styles.locationLabelRow, responsive.isCompact && styles.locationLabelRowCompact]}>
          <Text style={[styles.fieldLabel, responsive.isCompact && styles.fieldLabelCompact]}>{label}</Text>
          {selected ? (
            <View style={styles.locationSelectedBadge}>
              <Ionicons name="checkmark-circle" size={13} color={colors.customer} />
              <Text style={styles.locationSelectedText}>{copy.selected}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
      <View style={[
        styles.locationInputShell,
        responsive.isCompact && styles.locationInputShellCompact,
        variant === 'route' && styles.routeLocationInputShell,
        variant === 'route' && responsive.isCompact && styles.routeLocationInputShellCompact,
        focused && styles.locationInputShellActive
      ]}>
        <Ionicons name={isPickup ? 'radio-button-on' : 'location'} size={responsive.isCompact ? 16 : 18} color={colors.customer} />
        <TextInput
          value={value}
          onFocus={() => {
            if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
            setFocused(true);
          }}
          onBlur={() => {
            if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
            blurTimerRef.current = setTimeout(() => {
              if (!skipDoneTypingRef.current) setFocused(false);
              skipDoneTypingRef.current = false;
              blurTimerRef.current = null;
            }, 180);
          }}
          onSubmitEditing={() => onDoneTyping?.(value)}
          onChangeText={(nextValue) => {
            setFocused(true);
            onChangeText(nextValue);
          }}
          placeholder={placeholder || copy.mapSearchPlaceholder}
          placeholderTextColor={colors.muted}
          style={[styles.locationInput, responsive.isCompact && styles.locationInputCompact]}
        />
        {loading ? <ActivityIndicator size="small" color={colors.customer} /> : null}
      </View>
      {localError ? <Text style={styles.locationError}>{localError}</Text> : null}
      {onOpenMap && variant === 'default' ? (
        <Pressable
          style={styles.mapSelectButton}
          onPressIn={() => {
            skipDoneTypingRef.current = true;
          }}
          onPress={onOpenMap}
        >
          <Ionicons name="map-outline" size={17} color={colors.customer} />
          <Text style={styles.mapSelectText}>{copy.selectOnMap}</Text>
        </Pressable>
      ) : null}
      {showTypedLocationOption || suggestions.length ? (
        <View style={styles.locationSuggestionBox}>
          {showTypedLocationOption ? (
            <Pressable
              style={[styles.locationSuggestionItem, styles.locationTypedSuggestionItem]}
              onPressIn={() => {
                skipDoneTypingRef.current = true;
              }}
              onPress={() => {
                setSuggestions([]);
                setFocused(false);
                onDoneTyping?.(typedLocation);
              }}
            >
              <View style={styles.locationTypedSuggestionIcon}>
                <Ionicons name="arrow-forward" size={16} color={colors.customer} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.locationSuggestionTitle}>{copy.useTypedLocation}</Text>
                <Text style={styles.locationSuggestionSubtitle} numberOfLines={1}>{typedLocation}</Text>
              </View>
            </Pressable>
          ) : null}
          {suggestions.map((suggestion) => (
            <Pressable
              key={suggestion.placeId}
              style={styles.locationSuggestionItem}
              onPressIn={() => {
                skipDoneTypingRef.current = true;
              }}
              onPress={() => chooseSuggestion(suggestion)}
            >
              <Ionicons name="location-outline" size={18} color={colors.customer} />
              <View style={styles.flex}>
                <Text style={styles.locationSuggestionTitle}>{suggestion.mainText}</Text>
                {suggestion.secondaryText ? <Text style={styles.locationSuggestionSubtitle}>{suggestion.secondaryText}</Text> : null}
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}
      {!selected && !showTypedLocationOption && value.trim().length >= 3 && !suggestions.length && !loading ? (
        <Text style={styles.locationHint}>{copy.locationHint}</Text>
      ) : null}
    </View>
  );
}

function SavedAddressStrip({
  title,
  addresses,
  onSelect
}: {
  title: string;
  addresses: SavedAddress[];
  onSelect: (address: SavedAddress) => void;
}) {
  if (!addresses.length) return null;

  return (
    <View style={styles.savedAddressStrip}>
      <Text style={styles.savedAddressStripTitle}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.savedAddressChips}>
        {addresses.slice(0, 8).map((address) => (
          <Pressable key={address.id} style={styles.savedAddressChip} onPress={() => onSelect(address)}>
            <Ionicons name={address.type === 'home' ? 'home' : address.type === 'work' ? 'briefcase' : 'location'} size={15} color={colors.customer} />
            <View style={styles.savedAddressChipTextWrap}>
              <Text style={styles.savedAddressChipTitle} numberOfLines={1}>{address.label}</Text>
              <Text style={styles.savedAddressChipSubtitle} numberOfLines={1}>{address.addressLine || address.address}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function VehicleChoiceCard({
  vehicle,
  selected,
  suggested,
  disabled,
  price,
  onPress
}: {
  vehicle: Vehicle;
  selected: boolean;
  suggested: boolean;
  disabled?: boolean;
  price?: number;
  onPress: () => void;
}) {
  const copy = useCopy();

  return (
    <Pressable
      style={[
        styles.vehicleCard,
        suggested && styles.vehicleCardSuggested,
        selected && styles.vehicleCardActive,
        disabled && styles.vehicleCardDisabled
      ]}
      disabled={disabled}
      onPress={onPress}
    >
      <View style={styles.vehicleCardHeader}>
        <Ionicons
          name={vehicleIcon(vehicle)}
          size={24}
          color={disabled ? colors.muted : selected ? colors.customer : suggested ? colors.blue : colors.customer}
        />
        <View style={styles.vehicleBadgeRow}>
          {suggested ? (
            <View style={styles.vehicleSuggestedBadge}>
              <Text style={styles.vehicleSuggestedText}>{copy.suggested}</Text>
            </View>
          ) : null}
          <Text style={styles.vehicleEta}>{vehicle.etaMinutes} min</Text>
        </View>
      </View>
      <Text style={[styles.vehicleName, disabled && styles.vehicleNameDisabled]}>{vehicle.shortName}</Text>
      <Text style={styles.mutedSmall}>{vehicleCapacityText(vehicle, copy.upTo)}</Text>
      <Text
        style={[
          styles.vehiclePriceLine,
          suggested && styles.vehiclePriceLineSuggested,
          selected && styles.vehiclePriceLineSelected
        ]}
      >
        {copy.fareEstimate}: {money(price ?? porterVehicleQuote(vehicle))}
      </Text>
      {selected ? <Text style={styles.vehicleSelectedText}>{copy.selected}</Text> : null}
      {disabled ? <Text style={styles.vehicleUnavailableText}>{copy.unavailableForWeight}</Text> : null}
    </Pressable>
  );
}

function VehicleFareOption({
  vehicle,
  selected,
  suggested,
  disabled,
  price,
  onPress
}: {
  vehicle: Vehicle;
  selected: boolean;
  suggested: boolean;
  disabled?: boolean;
  price?: number;
  onPress: () => void;
}) {
  const copy = useCopy();
  const responsive = useResponsiveLayout();
  return (
    <Pressable
      style={[
        styles.vehicleFareOption,
        responsive.isCompact && styles.vehicleFareOptionCompact,
        suggested && styles.vehicleFareOptionSuggested,
        selected && styles.vehicleFareOptionSelected,
        disabled && styles.vehicleFareOptionDisabled
      ]}
      disabled={disabled}
      onPress={onPress}
    >
      <View style={[styles.vehicleFareOptionIcon, responsive.isCompact && styles.vehicleFareOptionIconCompact]}>
        <VehicleMiniArt vehicle={vehicle} muted={disabled} selected={selected} suggested={suggested} />
      </View>
      <View style={styles.vehicleFareOptionCopy}>
        <View style={styles.vehicleFareOptionTitleRow}>
          <Text
            style={[
              styles.vehicleFareOptionTitle,
              responsive.isCompact && styles.vehicleFareOptionTitleCompact,
              suggested && styles.vehicleFareOptionTitleSuggested,
              selected && styles.vehicleFareOptionTitleSelected,
              disabled && styles.vehicleNameDisabled
            ]}
          >
            {vehicle.shortName}
          </Text>
          {suggested ? (
            <View style={styles.vehicleNewBadge}>
              <Text style={styles.vehicleNewBadgeText}>{copy.suggested}</Text>
            </View>
          ) : null}
        </View>
        <Text style={[styles.vehicleFareOptionMeta, responsive.isCompact && styles.vehicleFareOptionMetaCompact]}>
          {vehicleCapacityText(vehicle, copy.upTo)} - {vehicle.etaMinutes} min
        </Text>
      </View>
      <View style={[styles.vehicleFareOptionPriceWrap, responsive.isCompact && styles.vehicleFareOptionPriceWrapCompact]}>
        <Text
          style={[
            styles.vehicleFareOptionPrice,
            responsive.isCompact && styles.vehicleFareOptionPriceCompact,
            suggested && styles.vehicleFareOptionPriceSuggested,
            selected && styles.vehicleFareOptionPriceSelected,
            disabled && styles.vehicleNameDisabled
          ]}
        >
          {typeof price === 'number' ? money(price) : copy.estimating}
        </Text>
        {selected ? <Ionicons name="checkmark-circle" size={17} color={colors.customer} /> : null}
        {disabled ? <Text style={styles.vehicleUnavailableText}>{copy.unavailableForWeight}</Text> : null}
      </View>
    </Pressable>
  );
}

function VehicleMiniArt({
  vehicle,
  muted,
  selected,
  suggested
}: {
  vehicle: Vehicle;
  muted?: boolean;
  selected?: boolean;
  suggested?: boolean;
}) {
  const source = vehicleArtSources[vehicle.code] ?? mini700VehicleImage;
  const shadowColor = muted ? colors.muted : selected ? colors.customer : suggested ? colors.blue : colors.customer;
  return (
    <View style={styles.vehicleMiniArt}>
      <View style={[styles.vehicleMiniShadow, { backgroundColor: shadowColor }]} />
      <Image
        source={source}
        resizeMode="contain"
        style={[
          styles.vehicleMiniImage,
          vehicle.code === 'bike' && styles.vehicleMiniImageBike,
          vehicle.code === 'loader90' && styles.vehicleMiniImageLoader,
          muted && styles.vehicleMiniImageMuted
        ]}
      />
    </View>
  );
}

function BookScreen({
  api,
  user,
  savedAddresses,
  vehicles,
  booking,
  setBooking,
  step,
  setStep,
  fare,
  fareVehicleId,
  busy,
  onSaveAddress,
  estimateNow,
  placeOrder,
  onBackToHome
}: {
  api: IndieryApi;
  user: UserProfile;
  savedAddresses: SavedAddress[];
  vehicles: Vehicle[];
  booking: typeof initialBooking;
  setBooking: React.Dispatch<React.SetStateAction<typeof initialBooking>>;
  step: number;
  setStep: (step: number) => void;
  fare: FareBreakup | null;
  fareVehicleId?: string;
  busy: boolean;
  onSaveAddress: (input: Omit<SavedAddress, 'id'>) => Promise<void>;
  estimateNow: (nextStep?: number, vehicleId?: string) => Promise<void>;
  placeOrder: () => Promise<void>;
  onBackToHome: () => void;
}) {
  const copy = useCopy();
  const language = useLanguage();
  const responsive = useResponsiveLayout();
  const { bottom: bottomInset, left: leftInset, right: rightInset } = useSafeAreaInsets();
  const bookingWeightKg = parseBookingWeight(booking.weightKg);
  const vehicleChoices = customerVehicles(vehicles);
  const suggestedVehicle = suggestedCustomerVehicle(vehicles, bookingWeightKg);
  const selectedVehicle = vehicleChoices.find((vehicle) => vehicle.id === booking.vehicleId) ?? suggestedVehicle ?? vehicleChoices[0];
  const selectedFare = selectedVehicle && fareVehicleId === selectedVehicle.id ? fare : null;
  const vehicleChoiceIds = vehicleChoices.map((vehicle) => vehicle.id).join('|');
  const routeBillableKm = fare?.billableKm;
  const [mapPickerTarget, setMapPickerTarget] = useState<MapPickerTarget | null>(null);
  const [contactSheetTarget, setContactSheetTarget] = useState<'pickup' | 'drop' | null>(null);
  const [goodsTypePickerOpen, setGoodsTypePickerOpen] = useState(false);
  const [draftGoodsType, setDraftGoodsType] = useState(booking.goodsType);
  const [goodsRulesOpen, setGoodsRulesOpen] = useState(false);
  const [contactError, setContactError] = useState('');
  const [autoPickupLoading, setAutoPickupLoading] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(() => Keyboard.isVisible());
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const autoPickupAttemptedRef = useRef(false);
  const fullBookingViewportRef = useRef({ width: responsive.width, height: responsive.height });
  if (Math.abs(fullBookingViewportRef.current.width - responsive.width) > 1) {
    fullBookingViewportRef.current = { width: responsive.width, height: responsive.height };
  } else if (!keyboardVisible && responsive.height > fullBookingViewportRef.current.height) {
    fullBookingViewportRef.current.height = responsive.height;
  }
  const bookingKeyboardLayoutVisible =
    keyboardVisible || fullBookingViewportRef.current.height - responsive.height > 120;
  const bookingViewportKeyboardShrink = Math.max(
    0,
    fullBookingViewportRef.current.height - responsive.height
  );
  const goodsAndroidKeyboardPadding =
    Platform.OS === 'android' && step === 2 && bookingKeyboardLayoutVisible
      ? Math.max(0, keyboardHeight - bookingViewportKeyboardShrink)
      : 0;
  const showGoodsKeyboardFooter = step === 2 && bookingKeyboardLayoutVisible;
  const hasPickupLocation = booking.pickup.trim().length > 0;
  const hasDropLocation = booking.drop.trim().length > 0;
  const stepMeta: Record<number, { title: string; subtitle: string }> = {
    1: { title: copy.pickupAndDrop, subtitle: booking.pickup || copy.setPickupLocation },
    2: { title: copy.goodsDetails, subtitle: hasDropLocation ? `${booking.pickup} to ${booking.drop}` : copy.enterDropLocation },
    3: { title: copy.chooseVehicle, subtitle: fare ? `${fare.distanceKm} km - ${booking.weightKg || 0} kg` : copy.estimating },
    4: { title: copy.payment, subtitle: selectedVehicle ? `${selectedVehicle.shortName} - ${selectedFare ? money(selectedFare.total) : copy.estimating}` : copy.selectVehicleValue }
  };
  const currentStepMeta = stepMeta[step] ?? stepMeta[1];

  useEffect(() => {
    if (!vehicleChoices.length) {
      if (booking.vehicleId) setBooking((current) => ({ ...current, vehicleId: '' }));
      return;
    }
    const currentVehicle = vehicleChoices.find((vehicle) => vehicle.id === booking.vehicleId);
    if (!currentVehicle) {
      setBooking((current) => ({ ...current, vehicleId: (suggestedVehicle ?? vehicleChoices[0]).id }));
      return;
    }
    if (!vehicleCanCarryWeight(currentVehicle, bookingWeightKg) && suggestedVehicle) {
      setBooking((current) => ({ ...current, vehicleId: suggestedVehicle.id }));
    } else if (!vehicleCanCarryWeight(currentVehicle, bookingWeightKg) && !suggestedVehicle) {
      setBooking((current) => ({ ...current, vehicleId: '' }));
    }
  }, [booking.serviceCategory, booking.vehicleId, bookingWeightKg, setBooking, suggestedVehicle?.id, vehicleChoiceIds]);

  useEffect(() => {
    if (autoPickupAttemptedRef.current || hasPickupLocation) return undefined;
    autoPickupAttemptedRef.current = true;
    let cancelled = false;

    async function setCurrentPickup() {
      setAutoPickupLoading(true);
      try {
        const location = await readCurrentLocationDetails();
        if (cancelled) return;
        setBooking((currentBooking) => (
          currentBooking.pickup
            ? currentBooking
            : {
                ...currentBooking,
                pickup: location.address || location.label,
                pickupPlaceId: location.placeId,
                pickupLat: location.lat,
                pickupLng: location.lng,
                pickupContactConfirmed: false
              }
        ));
      } catch {
        // The pickup field remains editable if current location cannot be read.
      } finally {
        if (!cancelled) setAutoPickupLoading(false);
      }
    }

    setCurrentPickup();
    return () => {
      cancelled = true;
    };
  }, [hasPickupLocation, setBooking]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardVisible(true);
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
      setKeyboardHeight(0);
    });
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useAndroidBackHandler(() => {
    if (mapPickerTarget) {
      setMapPickerTarget(null);
      return true;
    }
    if (contactSheetTarget) {
      setContactError('');
      setContactSheetTarget(null);
      return true;
    }
    if (goodsTypePickerOpen) {
      setGoodsTypePickerOpen(false);
      return true;
    }
    if (goodsRulesOpen) {
      setGoodsRulesOpen(false);
      return true;
    }
    if (step > 1) {
      setStep(step - 1);
      return true;
    }
    onBackToHome();
    return true;
  }, [mapPickerTarget, contactSheetTarget, goodsTypePickerOpen, goodsRulesOpen, step, onBackToHome]);

  function updateBookingWeight(weightKg: string) {
    const nextWeight = parseBookingWeight(weightKg);
    const nextSuggestedVehicle = suggestedCustomerVehicle(vehicles, nextWeight);
    setBooking((current) => {
      const currentVehicle = vehicleChoices.find((vehicle) => vehicle.id === current.vehicleId);
      const keepCurrentVehicle = currentVehicle && vehicleCanCarryWeight(currentVehicle, nextWeight);
      return {
        ...current,
        weightKg,
        vehicleId: keepCurrentVehicle ? current.vehicleId : nextSuggestedVehicle?.id || ''
      };
    });
  }

  function openGoodsTypePicker() {
    setDraftGoodsType(goodsOptions.includes(booking.goodsType) ? booking.goodsType : goodsOptions[0]);
    setGoodsTypePickerOpen(true);
  }

  function confirmGoodsType() {
    setBooking((current) => ({ ...current, goodsType: draftGoodsType }));
    setContactError('');
    setGoodsTypePickerOpen(false);
  }

  function addStop() {
    if (booking.extraStops.length >= maxExtraStops) return;
    setBooking((current) => ({
      ...current,
      extraStops: [
        ...current.extraStops,
        { id: `stop-${Date.now()}`, label: '', placeId: '' }
      ]
    }));
  }

  function updateStop(stopId: string, patch: Partial<BookingStop>) {
    setBooking((current) => ({
      ...current,
      extraStops: current.extraStops.map((stop) => (stop.id === stopId ? { ...stop, ...patch } : stop))
    }));
  }

  function removeStop(stopId: string) {
    setBooking((current) => ({
      ...current,
      extraStops: current.extraStops.filter((stop) => stop.id !== stopId)
    }));
  }

  function applyRouteLocation(target: 'pickup' | 'drop', location: LocationDetails, openContact = true) {
    setBooking((current) => ({
      ...current,
      ...(target === 'pickup'
        ? {
            pickup: location.address || location.label,
            pickupPlaceId: location.placeId,
            pickupLat: location.lat,
            pickupLng: location.lng,
            pickupContactConfirmed: false
          }
        : {
            drop: location.address || location.label,
            dropPlaceId: location.placeId,
            dropLat: location.lat,
            dropLng: location.lng,
            dropContactConfirmed: false
          })
    }));
    setContactError('');
    if (openContact) setContactSheetTarget(target);
  }

  function applyMapLocation(location: LocationDetails) {
    if (!mapPickerTarget) return;
    if (mapPickerTarget.kind === 'pickup') {
      applyRouteLocation('pickup', location, mapPickerTarget.openContact !== false);
    } else if (mapPickerTarget.kind === 'drop') {
      applyRouteLocation('drop', location, mapPickerTarget.openContact !== false);
    } else if (mapPickerTarget.stopId) {
      updateStop(mapPickerTarget.stopId, {
        label: location.address || location.label,
        placeId: location.placeId,
        lat: location.lat,
        lng: location.lng
      });
    }
    setMapPickerTarget(null);
  }

  function chooseVehicle(vehicle: Vehicle, refreshFare = false, nextStep = step) {
    if (!vehicleCanCarryWeight(vehicle, bookingWeightKg)) {
      setContactError(copy.unavailableForWeight);
      return;
    }
    setContactError('');
    setBooking((current) => ({ ...current, vehicleId: vehicle.id }));
    if (refreshFare && hasPickupLocation && hasDropLocation && bookingWeightKg) {
      estimateNow(nextStep, vehicle.id);
    }
  }

  function continueFromRouteDetails(nextBooking = booking) {
    if (!nextBooking.pickup.trim() || !nextBooking.drop.trim()) {
      setContactError(copy.selectLocationFirst);
      return;
    }
    if (!hasConfirmedPickupDetails(nextBooking)) {
      setContactError(copy.enterSenderName);
      setContactSheetTarget('pickup');
      return;
    }
    if (!hasConfirmedDropDetails(nextBooking)) {
      setContactError(copy.enterReceiverName);
      setContactSheetTarget('drop');
      return;
    }
    setContactError('');
    setStep(2);
  }

  function continueFromGoodsDetails() {
    const goodsType = booking.goodsType.trim();
    if (goodsType.length < 2) {
      setContactError(copy.enterGoodsType);
      return;
    }
    if (!bookingWeightKg) {
      setContactError(copy.enterWeight);
      return;
    }
    if (!suggestedVehicle) {
      setContactError(`No customer vehicle is available for ${bookingWeightKg} kg.`);
      return;
    }
    const vehicleForEstimate =
      selectedVehicle && vehicleCanCarryWeight(selectedVehicle, bookingWeightKg)
        ? selectedVehicle
        : suggestedVehicle;
    if (!vehicleForEstimate) {
      setContactError(copy.selectVehicleValue);
      return;
    }
    setContactError('');
    if (booking.vehicleId !== vehicleForEstimate.id) {
      setBooking((current) => ({ ...current, vehicleId: vehicleForEstimate.id }));
    }
    Keyboard.dismiss();
    estimateNow(3, vehicleForEstimate.id);
  }

  function continueFromVehiclePricing() {
    if (!selectedVehicle || !vehicleCanCarryWeight(selectedVehicle, bookingWeightKg)) {
      setContactError(copy.selectVehicleValue);
      return;
    }
    setContactError('');
    if (booking.vehicleId !== selectedVehicle.id) {
      setBooking((current) => ({ ...current, vehicleId: selectedVehicle.id }));
    }
    if (selectedFare) {
      setStep(4);
      return;
    }
    estimateNow(4, selectedVehicle.id);
  }

  function applySavedAddress(target: 'pickup' | 'drop', savedAddress: SavedAddress, openContact = true) {
    setBooking((current) => ({
      ...current,
      ...(target === 'pickup'
        ? {
            pickup: savedAddress.address,
            pickupPlaceId: savedAddress.id,
            pickupLat: savedAddress.lat,
            pickupLng: savedAddress.lng,
            pickupAddressLine: savedAddress.addressLine || '',
            pickupContactConfirmed: false
          }
        : {
            drop: savedAddress.address,
            dropPlaceId: savedAddress.id,
            dropLat: savedAddress.lat,
            dropLng: savedAddress.lng,
            dropAddressLine: savedAddress.addressLine || '',
            dropContactConfirmed: false
          })
    }));
    setContactError('');
    if (openContact) setContactSheetTarget(target);
  }

  function openRouteDetails(target: 'pickup' | 'drop', value = target === 'pickup' ? booking.pickup : booking.drop) {
    const typedLocation = value.trim();
    const isPickup = target === 'pickup';

    if (!typedLocation) {
      setContactError(copy.selectLocationFirst);
      return;
    }

    setBooking((current) => {
      const currentValue = isPickup ? current.pickup : current.drop;
      if (currentValue.trim() === typedLocation) return current;
      return {
        ...current,
        ...(isPickup
          ? {
              pickup: typedLocation,
              pickupPlaceId: '',
              pickupLat: undefined,
              pickupLng: undefined,
              pickupContactConfirmed: false
            }
          : {
              drop: typedLocation,
              dropPlaceId: '',
              dropLat: undefined,
              dropLng: undefined,
              dropContactConfirmed: false
            })
      };
    });
    setContactError('');
    setContactSheetTarget(target);
  }

  function openPickupMap(value = booking.pickup) {
    openRouteDetails('pickup', value);
  }

  function openDropMap(value = booking.drop) {
    openRouteDetails('drop', value);
  }

  return (
    <>
    <KeyboardAvoidingView
      style={[
        styles.bookingScreenKeyboard,
        goodsAndroidKeyboardPadding > 0 && { paddingBottom: goodsAndroidKeyboardPadding }
      ]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
    <ScrollView
      style={styles.bookingScreenScroll}
      contentContainerStyle={[
        styles.scroll,
        responsive.isCompact && styles.scrollCompact,
        showGoodsKeyboardFooter && styles.bookingScreenScrollKeyboard,
        styles.bookingCurveScrollContent
      ]}
      keyboardShouldPersistTaps="always"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
    >
      <View style={[styles.bookingStepHeader, responsive.isCompact && styles.bookingStepHeaderCompact]}>
        <Pressable
          style={[styles.bookingStepBack, responsive.isCompact && styles.bookingStepBackCompact]}
          onPress={() => {
            if (step > 1) {
              setStep(step - 1);
              return;
            }
            onBackToHome();
          }}
          hitSlop={5}
          accessibilityRole="button"
          accessibilityLabel={step > 1 ? 'Previous booking step' : 'Back to home'}
        >
          <Ionicons name="arrow-back" size={responsive.isCompact ? 17 : 20} color={colors.ink} />
        </Pressable>
        <View style={styles.flex}>
          <Text style={[styles.bookingStepTitle, responsive.isCompact && styles.bookingStepTitleCompact]}>{currentStepMeta.title}</Text>
          <Text style={[styles.bookingStepSubtitle, responsive.isCompact && styles.bookingStepSubtitleCompact]} numberOfLines={1}>{currentStepMeta.subtitle}</Text>
        </View>
        <Text style={[styles.bookingStepCount, responsive.isCompact && styles.bookingStepCountCompact]}>{step}/4</Text>
      </View>
      <View style={[styles.bookingProgressTrack, responsive.isCompact && styles.bookingProgressTrackCompact]}>
        <View style={[styles.bookingProgressFill, { width: `${step * 25}%` }]} />
      </View>

      {step === 1 && (
        <View>
          {autoPickupLoading ? (
            <View style={[styles.noticeInfo, responsive.isCompact && styles.noticeInfoCompact]}>
              <ActivityIndicator size="small" color={colors.blue} />
              <Text style={[styles.noticeInfoText, responsive.isCompact && styles.noticeInfoTextCompact]}>{copy.settingPickupLocation}</Text>
            </View>
          ) : null}

          <View style={[styles.routeEntryCard, responsive.isCompact && styles.routeEntryCardCompact]}>
            <View style={[styles.routeEntryPickupRow, responsive.isCompact && styles.routeEntryPickupRowCompact]}>
              <View style={[styles.routeEntryDot, styles.routeEntryDotPickup]} />
              <View style={styles.flex}>
                <LocationPickerField
                  api={api}
                  label={copy.pickup}
                  value={booking.pickup}
                  selected={typeof booking.pickupLat === 'number' && typeof booking.pickupLng === 'number'}
                  variant="route"
                  placeholder={copy.setPickupLocation}
                  onChangeText={(pickup) =>
                    setBooking((current) => ({
                      ...current,
                      pickup,
                      pickupPlaceId: '',
                      pickupLat: undefined,
                      pickupLng: undefined,
                      pickupContactConfirmed: false
                    }))
                  }
                  onSelect={(location) => applyRouteLocation('pickup', location)}
                  onDoneTyping={openPickupMap}
                />
              </View>
            </View>

            <View style={[styles.routeEntryDivider, responsive.isCompact && styles.routeEntryDividerCompact]} />

            <View style={[styles.routeEntryDropRow, responsive.isCompact && styles.routeEntryDropRowCompact]}>
              <View style={[styles.routeEntryDot, styles.routeEntryDotDrop]} />
              <View style={styles.flex}>
                <LocationPickerField
                  api={api}
                  label={copy.drop}
                  value={booking.drop}
                  selected={typeof booking.dropLat === 'number' && typeof booking.dropLng === 'number'}
                  variant="route"
                  placeholder={copy.enterDropLocation}
                  onChangeText={(drop) =>
                    setBooking((current) => ({
                      ...current,
                      drop,
                      dropPlaceId: '',
                      dropLat: undefined,
                      dropLng: undefined,
                      dropContactConfirmed: false
                    }))
                  }
                  onSelect={(location) => applyRouteLocation('drop', location)}
                  onDoneTyping={openDropMap}
                />
              </View>
            </View>
          </View>

          <SavedAddressStrip
            title={copy.savedDropAddresses}
            addresses={savedAddresses}
            onSelect={(address) => applySavedAddress('drop', address)}
          />
          {contactError ? <Text style={styles.contactError}>{contactError}</Text> : null}
        </View>
      )}

      {step === 2 && (
        <View>
          <View style={[styles.routeReviewCard, responsive.isCompact && styles.routeReviewCardCompact]}>
            <View style={[styles.routeReviewHeader, responsive.isCompact && styles.routeReviewHeaderCompact]}>
              <Text style={[styles.summaryTitle, responsive.isCompact && styles.summaryTitleCompact]}>{copy.routeSummary}</Text>
              <Pressable style={[styles.changeRouteButton, responsive.isCompact && styles.changeRouteButtonCompact]} onPress={() => setStep(1)}>
                <Ionicons name="create-outline" size={14} color={colors.customer} />
                <Text style={[styles.changeRouteText, responsive.isCompact && styles.changeRouteTextCompact]}>{copy.changeRoute}</Text>
              </Pressable>
            </View>
            <View style={[styles.routeReviewLine, responsive.isCompact && styles.routeReviewLineCompact]}>
              <View style={styles.routeReviewDot} />
              <View style={styles.flex}>
                <Text style={[styles.routeReviewTitle, responsive.isCompact && styles.routeReviewTitleCompact]} numberOfLines={1}>{composeBookingAddress(booking.pickup, booking.pickupAddressLine)}</Text>
                <Text style={[styles.mutedSmall, responsive.isCompact && styles.mutedSmallCompact]}>{copy.sender}: {booking.pickupContactName || copy.addNameMobile}</Text>
              </View>
            </View>
            <View style={[styles.routeReviewLine, responsive.isCompact && styles.routeReviewLineCompact]}>
              <View style={[styles.routeReviewDot, styles.routeReviewDotDrop]} />
              <View style={styles.flex}>
                <Text style={[styles.routeReviewTitle, responsive.isCompact && styles.routeReviewTitleCompact]} numberOfLines={1}>{composeBookingAddress(booking.drop, booking.dropAddressLine)}</Text>
                <Text style={[styles.mutedSmall, responsive.isCompact && styles.mutedSmallCompact]}>{copy.receiver}: {booking.dropContactName || copy.addNameMobile}</Text>
              </View>
            </View>
          </View>
          <Text style={[styles.fieldLabel, responsive.isCompact && styles.fieldLabelCompact]}>{copy.goodsType}</Text>
          <Pressable style={[styles.goodsTypeSelector, responsive.isCompact && styles.goodsTypeSelectorCompact]} onPress={openGoodsTypePicker}>
            <View style={[styles.goodsTypeSelectorIcon, responsive.isCompact && styles.goodsTypeSelectorIconCompact]}>
              <Ionicons name={goodsTypeIcon(booking.goodsType)} size={responsive.isCompact ? 18 : 21} color={colors.customer} />
            </View>
            <View style={styles.flex}>
              <Text style={[styles.goodsTypeSelectorValue, responsive.isCompact && styles.goodsTypeSelectorValueCompact]}>{goodsLabel(language, booking.goodsType)}</Text>
              <Text style={[styles.goodsTypeSelectorHint, responsive.isCompact && styles.goodsTypeSelectorHintCompact]}>{copy.tapToChooseGoods}</Text>
            </View>
            <Ionicons name="chevron-down" size={19} color={colors.customer} />
          </Pressable>
          <Field
            label={copy.weightKg}
            keyboardType="numeric"
            value={booking.weightKg}
            onChangeText={updateBookingWeight}
          />
          <Pressable style={[styles.notice, responsive.isCompact && styles.noticeCompact]} onPress={() => setGoodsRulesOpen(true)}>
            <Ionicons name="warning" size={16} color={colors.amber} />
            <Text style={[styles.noticeText, responsive.isCompact && styles.noticeTextCompact]}>{copy.viewGoodsRules}</Text>
            <Ionicons name="chevron-up" size={16} color={colors.amber} />
          </Pressable>
          {bookingWeightKg && !suggestedVehicle ? (
            <View style={styles.notice}>
              <Ionicons name="warning" size={16} color={colors.amber} />
              <Text style={styles.noticeText}>No customer vehicle is available for {bookingWeightKg} kg.</Text>
            </View>
          ) : null}
          {contactError ? <Text style={styles.contactError}>{contactError}</Text> : null}
          <View style={[styles.bookingSummaryCard, responsive.isCompact && styles.bookingSummaryCardCompact]}>
            <Text style={[styles.summaryTitle, responsive.isCompact && styles.summaryTitleCompact]}>{copy.routeSummary}</Text>
            <SummaryRow label={copy.service} value={serviceTitle(language, booking.serviceCategory)} />
            <SummaryRow label={copy.vehicle} value={selectedVehicle?.name || copy.selectVehicleValue} />
            <SummaryRow label={copy.route} value={copy.direct} />
          </View>
          {!showGoodsKeyboardFooter ? (
            <View style={styles.row}>
              <SecondaryButton title={copy.back} icon="arrow-back" onPress={() => setStep(1)} />
              <PrimaryButton title={busy ? copy.estimating : copy.continue} icon="arrow-forward" onPress={continueFromGoodsDetails} />
            </View>
          ) : null}
        </View>
      )}

      {step === 3 && (
        <View>
          <View style={[styles.vehicleRoutePanel, responsive.isCompact && styles.vehicleRoutePanelCompact]}>
            <View style={[styles.routeReviewLine, responsive.isCompact && styles.routeReviewLineCompact]}>
              <View style={styles.routeReviewDot} />
              <View style={styles.flex}>
                <Text style={[styles.routeReviewTitle, responsive.isCompact && styles.routeReviewTitleCompact]} numberOfLines={1}>{composeBookingAddress(booking.pickup, booking.pickupAddressLine)}</Text>
                <Text style={[styles.mutedSmall, responsive.isCompact && styles.mutedSmallCompact]}>{booking.pickupContactName || user.name}</Text>
              </View>
            </View>
            <View style={[styles.routeReviewLine, responsive.isCompact && styles.routeReviewLineCompact]}>
              <View style={[styles.routeReviewDot, styles.routeReviewDotDrop]} />
              <View style={styles.flex}>
                <Text style={[styles.routeReviewTitle, responsive.isCompact && styles.routeReviewTitleCompact]} numberOfLines={1}>{composeBookingAddress(booking.drop, booking.dropAddressLine)}</Text>
                <Text style={[styles.mutedSmall, responsive.isCompact && styles.mutedSmallCompact]}>{booking.dropContactName || copy.receiver}</Text>
              </View>
            </View>
            <View style={styles.vehicleRouteActions}>
              <Pressable style={styles.vehicleRouteAction} onPress={() => setStep(1)}>
                <Ionicons name="create" size={14} color={colors.customer} />
                <Text style={styles.vehicleRouteActionText}>{copy.changeRoute}</Text>
              </Pressable>
            </View>
          </View>

          <View style={[styles.vehicleFareList, responsive.isCompact && styles.vehicleFareListCompact]}>
            {vehicleChoices.map((vehicle) => {
              const disabled = !vehicleCanCarryWeight(vehicle, bookingWeightKg);
              const selected = booking.vehicleId === vehicle.id || (!booking.vehicleId && selectedVehicle?.id === vehicle.id);
              const price = typeof routeBillableKm === 'number'
                ? porterVehicleQuoteForBillableKm(vehicle, routeBillableKm)
                : undefined;
              return (
                <VehicleFareOption
                  key={vehicle.id}
                  vehicle={vehicle}
                  selected={selected}
                  suggested={suggestedVehicle?.id === vehicle.id}
                  disabled={disabled}
                  price={price}
                  onPress={() => chooseVehicle(vehicle, true, 3)}
                />
              );
            })}
          </View>
          {contactError ? <Text style={styles.contactError}>{contactError}</Text> : null}
          <View style={styles.row}>
            <SecondaryButton title={copy.back} icon="arrow-back" onPress={() => setStep(2)} />
            <PrimaryButton title={busy ? copy.estimating : copy.continue} icon="arrow-forward" onPress={continueFromVehiclePricing} />
          </View>
        </View>
      )}

      {step === 4 && (
        <View>
          <View style={[styles.routeReviewCard, responsive.isCompact && styles.routeReviewCardCompact]}>
            <View style={[styles.routeReviewHeader, responsive.isCompact && styles.routeReviewHeaderCompact]}>
              <Text style={[styles.summaryTitle, responsive.isCompact && styles.summaryTitleCompact]}>{copy.routeAndContacts}</Text>
              <Pressable style={[styles.changeRouteButton, responsive.isCompact && styles.changeRouteButtonCompact]} onPress={() => setStep(1)}>
                <Ionicons name="create-outline" size={14} color={colors.customer} />
                <Text style={[styles.changeRouteText, responsive.isCompact && styles.changeRouteTextCompact]}>{copy.changeRoute}</Text>
              </Pressable>
            </View>
            <View style={[styles.routeReviewLine, responsive.isCompact && styles.routeReviewLineCompact]}>
              <View style={styles.routeReviewDot} />
              <View style={styles.flex}>
                <Text style={[styles.routeReviewTitle, responsive.isCompact && styles.routeReviewTitleCompact]} numberOfLines={1}>{composeBookingAddress(booking.pickup, booking.pickupAddressLine)}</Text>
                <Text style={[styles.mutedSmall, responsive.isCompact && styles.mutedSmallCompact]}>{copy.sender}: {booking.pickupContactName || copy.addNameMobile}</Text>
              </View>
            </View>
            <View style={[styles.routeReviewLine, responsive.isCompact && styles.routeReviewLineCompact]}>
              <View style={[styles.routeReviewDot, styles.routeReviewDotDrop]} />
              <View style={styles.flex}>
                <Text style={[styles.routeReviewTitle, responsive.isCompact && styles.routeReviewTitleCompact]} numberOfLines={1}>{composeBookingAddress(booking.drop, booking.dropAddressLine)}</Text>
                <Text style={[styles.mutedSmall, responsive.isCompact && styles.mutedSmallCompact]}>{copy.receiver}: {booking.dropContactName || copy.addNameMobile}</Text>
              </View>
            </View>
          </View>

          {selectedVehicle ? (
            <View style={[styles.vehicleFareCard, responsive.isCompact && styles.vehicleFareCardCompact]}>
              <View style={[styles.vehicleFareIcon, responsive.isCompact && styles.vehicleFareIconCompact]}>
                <Ionicons name={vehicleIcon(selectedVehicle)} size={26} color={colors.customer} />
              </View>
              <View style={styles.vehicleFareCopy}>
                <Text style={[styles.vehicleName, responsive.isCompact && styles.vehicleNameCompact]}>{selectedVehicle.shortName}</Text>
                <Text style={[styles.vehicleFareMeta, responsive.isCompact && styles.vehicleFareMetaCompact]}>
                  {vehicleCapacityText(selectedVehicle, copy.upTo)} - {selectedFare?.etaMinutes || selectedVehicle.etaMinutes} min
                </Text>
                <Text style={[styles.mutedSmall, responsive.isCompact && styles.mutedSmallCompact]}>{copy.pricedAfterRoute}</Text>
              </View>
              <Text style={[styles.vehicleFarePrice, responsive.isCompact && styles.vehicleFarePriceCompact]}>
                {selectedFare
                  ? money(selectedFare.total)
                  : typeof routeBillableKm === 'number'
                    ? money(porterVehicleQuoteForBillableKm(selectedVehicle, routeBillableKm))
                    : copy.estimating}
              </Text>
            </View>
          ) : null}

          <Pressable style={[styles.notice, responsive.isCompact && styles.noticeCompact]} onPress={() => setGoodsRulesOpen(true)}>
            <Ionicons name="warning" size={16} color={colors.amber} />
            <Text style={[styles.noticeText, responsive.isCompact && styles.noticeTextCompact]}>{copy.viewGoodsRules}</Text>
            <Ionicons name="chevron-up" size={16} color={colors.amber} />
          </Pressable>

          <View style={[styles.bookingSummaryCard, responsive.isCompact && styles.bookingSummaryCardCompact]}>
            <Text style={[styles.summaryTitle, responsive.isCompact && styles.summaryTitleCompact]}>{copy.bookingSummary}</Text>
            <SummaryRow
              label={copy.route}
              value={`${composeBookingAddress(booking.pickup, booking.pickupAddressLine)} to ${composeBookingAddress(booking.drop, booking.dropAddressLine)}`}
            />
            <SummaryRow label={copy.vehicle} value={selectedVehicle?.shortName || copy.vehicle} />
            <SummaryRow label={copy.goods} value={`${bookingGoodsLabel(language, booking.goodsType)}, ${booking.weightKg || 0} kg`} />
            <SummaryRow label={copy.eta} value={`${selectedFare?.etaMinutes || selectedVehicle?.etaMinutes || 0} min`} />
          </View>
          {selectedFare ? <FareCard fare={selectedFare} /> : null}
          {(['upi', 'cash'] as PaymentMode[]).map((mode) => {
            const subtitle = mode === 'cash' ? copy.payPartnerAfterDelivery : copy.secureOnlinePayment;
            return (
              <Pressable
                key={mode}
                style={[
                  styles.payRow,
                  responsive.isCompact && styles.payRowCompact,
                  booking.paymentMode === mode && styles.payRowActive
                ]}
                onPress={() => {
                  setBooking((current) => ({ ...current, paymentMode: mode }));
                }}
              >
                <Ionicons
                  name={booking.paymentMode === mode ? 'radio-button-on' : 'radio-button-off'}
                  size={18}
                  color={colors.customer}
                />
                <View style={styles.flex}>
                  <Text style={[styles.payText, responsive.isCompact && styles.payTextCompact]}>{mode.toUpperCase()}</Text>
                  <Text style={[styles.mutedSmall, responsive.isCompact && styles.mutedSmallCompact]}>{subtitle}</Text>
                </View>
              </Pressable>
            );
          })}
          <View style={styles.row}>
            <SecondaryButton title={copy.back} icon="arrow-back" onPress={() => setStep(3)} />
            <PrimaryButton title={busy ? copy.booking : copy.payAndBook} icon="checkmark" onPress={placeOrder} />
          </View>
        </View>
      )}
    </ScrollView>
    {showGoodsKeyboardFooter ? (
      <View style={[styles.bookingKeyboardFooter, responsive.isCompact && styles.bookingKeyboardFooterCompact]}>
        <View style={[styles.bookingKeyboardFooterInner, { maxWidth: Math.min(680, responsive.contentMaxWidth) }]}>
          <PrimaryButton
            title={busy ? copy.estimating : copy.continue}
            icon="arrow-forward"
            onPress={continueFromGoodsDetails}
          />
        </View>
      </View>
    ) : null}
    </KeyboardAvoidingView>
    {mapPickerTarget ? (
      <MapLocationPicker
        api={api}
        title={mapPickerTarget.title}
        initialValue={mapPickerTarget.value}
        initialLat={mapPickerTarget.lat}
        initialLng={mapPickerTarget.lng}
        onClose={() => setMapPickerTarget(null)}
        onConfirm={applyMapLocation}
      />
    ) : null}
    {contactSheetTarget ? (
      <ContactDetailsModal
        key={contactSheetTarget}
        api={api}
        target={contactSheetTarget}
        user={user}
        booking={booking}
        setBooking={setBooking}
        onSaveAddress={onSaveAddress}
        onClose={() => {
          setContactError('');
          setContactSheetTarget(null);
        }}
        onChangeLocation={() => {
          setContactError('');
          setContactSheetTarget(null);
        }}
        onSaved={(nextBooking) => {
          if (contactSheetTarget === 'drop') continueFromRouteDetails(nextBooking);
        }}
      />
    ) : null}
    <Modal
      visible={goodsTypePickerOpen}
      transparent
      animationType="slide"
      onRequestClose={() => setGoodsTypePickerOpen(false)}
    >
      <View style={styles.contactSheetOverlay}>
        <Pressable style={styles.contactSheetBackdrop} onPress={() => setGoodsTypePickerOpen(false)} />
        <View
          style={[
            styles.contactSheet,
            styles.goodsTypePickerSheet,
            {
              paddingBottom: Math.max(24, bottomInset + 12),
              paddingLeft: Math.max(16, leftInset + 12),
              paddingRight: Math.max(16, rightInset + 12)
            }
          ]}
        >
          <View style={styles.contactSheetHandle} />
          <View style={styles.contactSheetHeader}>
            <View style={styles.goodsTypePickerHeading}>
              <View style={styles.goodsTypeSelectorIcon}>
                <Ionicons name="cube-outline" size={21} color={colors.customer} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.contactSheetTitle}>{copy.selectGoodsCategory}</Text>
                <Text style={styles.contactSheetSubtitle}>{copy.tapToChooseGoods}</Text>
              </View>
            </View>
            <Pressable
              style={styles.mapPickerClose}
              onPress={() => setGoodsTypePickerOpen(false)}
              hitSlop={3}
              accessibilityRole="button"
              accessibilityLabel="Close goods category"
            >
              <Ionicons name="close" size={20} color={colors.ink} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.goodsTypePickerScroll}
            contentContainerStyle={styles.goodsTypePickerContent}
            showsVerticalScrollIndicator={false}
          >
            {goodsOptions.map((item) => {
              const active = draftGoodsType === item;
              return (
                <Pressable
                  key={item}
                  style={[styles.goodsTypeOption, active && styles.goodsTypeOptionActive]}
                  onPress={() => setDraftGoodsType(item)}
                >
                  <View style={[styles.goodsTypeOptionIcon, active && styles.goodsTypeOptionIconActive]}>
                    <Ionicons
                      name={goodsTypeIcon(item)}
                      size={20}
                      color={active ? colors.white : colors.customer}
                    />
                  </View>
                  <Text style={[styles.goodsTypeOptionText, active && styles.goodsTypeOptionTextActive]}>
                    {goodsLabel(language, item)}
                  </Text>
                  <Ionicons
                    name={active ? 'checkmark-circle' : 'ellipse-outline'}
                    size={20}
                    color={active ? colors.customer : colors.line}
                  />
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.goodsTypePickerFooter}>
            <View style={styles.goodsTypePickerConfirmRow}>
              <PrimaryButton title={copy.confirmGoodsCategory} icon="checkmark" onPress={confirmGoodsType} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
    {goodsRulesOpen ? <GoodsRulesSheet onClose={() => setGoodsRulesOpen(false)} /> : null}
    </>
  );
}

function ContactSummaryCard({
  title,
  subtitle,
  icon,
  iconColor,
  name,
  phone,
  addressLine,
  locationLabel,
  onPress,
  onSaveAddress,
  saving
}: {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  name: string;
  phone: string;
  addressLine: string;
  locationLabel: string;
  onPress: () => void;
  onSaveAddress: () => void;
  saving: boolean;
}) {
  const copy = useCopy();
  const complete = name.trim().length >= 2 && hasValidContactPhone(phone);
  return (
    <Pressable style={styles.contactSummaryCard} onPress={onPress}>
      <View style={styles.contactHeader}>
        <View style={styles.contactTitleRow}>
          <Ionicons name={icon} size={20} color={iconColor} />
          <View>
            <Text style={styles.contactTitle}>{title}</Text>
            <Text style={styles.contactSubtitle}>{subtitle}</Text>
          </View>
        </View>
        <Ionicons name={complete ? 'checkmark-circle' : 'create-outline'} size={18} color={complete ? colors.green : colors.customer} />
      </View>
      <Text style={complete ? styles.contactSummaryValue : styles.contactSummaryMissing}>
        {complete ? `${name.trim()} - ${phone.trim()}` : copy.addNameMobile}
      </Text>
      <Text style={styles.contactSummaryLocation} numberOfLines={1}>
        {addressLine.trim() || locationLabel || 'Location not selected'}
      </Text>
      <Pressable style={styles.saveAddressInlineButton} onPress={onSaveAddress}>
        {saving ? <ActivityIndicator size="small" color={colors.customer} /> : <Ionicons name="bookmark-outline" size={16} color={colors.customer} />}
        <Text style={styles.saveAddressInlineText}>{copy.saveAddress}</Text>
      </Pressable>
    </Pressable>
  );
}

function GoodsRulesSheet({ onClose }: { onClose: () => void }) {
  const copy = useCopy();
  const { bottom: bottomInset, left: leftInset, right: rightInset } = useSafeAreaInsets();
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.contactSheetOverlay}>
        <Pressable style={styles.contactSheetBackdrop} onPress={onClose} />
        <View
          style={[
            styles.contactSheet,
            styles.goodsRulesSheet,
            {
              paddingBottom: Math.max(18, bottomInset + 12),
              paddingLeft: Math.max(16, leftInset + 12),
              paddingRight: Math.max(16, rightInset + 12)
            }
          ]}
        >
          <View style={styles.contactSheetHandle} />
          <View style={styles.contactSheetHeader}>
            <View>
              <Text style={styles.contactSheetTitle}>{copy.goodsRules}</Text>
              <Text style={styles.contactSheetSubtitle}>{copy.goodsRulesIntro}</Text>
            </View>
            <Pressable
              style={styles.mapPickerClose}
              onPress={onClose}
              hitSlop={3}
              accessibilityRole="button"
              accessibilityLabel="Close goods rules"
            >
              <Ionicons name="close" size={20} color={colors.ink} />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.goodsRulesScroll}>
            <View style={[styles.goodsRulesPanel, styles.goodsRulesAllowedPanel]}>
              <View style={styles.goodsRulesPanelHeader}>
                <Ionicons name="checkmark-circle" size={18} color={colors.green} />
                <Text style={styles.goodsRulesPanelTitle}>{copy.allowedGoods}</Text>
              </View>
              {allowedGoodsItems.map((item) => (
                <View key={item} style={styles.goodsRulesItem}>
                  <View style={[styles.goodsRulesBullet, styles.goodsRulesBulletAllowed]} />
                  <Text style={styles.goodsRulesItemText}>{item}</Text>
                </View>
              ))}
            </View>
            <View style={[styles.goodsRulesPanel, styles.goodsRulesRestrictedPanel]}>
              <View style={styles.goodsRulesPanelHeader}>
                <Ionicons name="ban" size={18} color={colors.red} />
                <Text style={styles.goodsRulesPanelTitle}>{copy.notAllowedGoods}</Text>
              </View>
              {restrictedGoodsItems.map((item) => (
                <View key={item} style={styles.goodsRulesItem}>
                  <View style={[styles.goodsRulesBullet, styles.goodsRulesBulletRestricted]} />
                  <Text style={styles.goodsRulesItemText}>{item}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
          <PrimaryButton title={copy.okayUnderstood} icon="checkmark" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

function InlineExactLocationPicker({
  api,
  target,
  title,
  value,
  lat,
  lng,
  compact,
  expanded = false,
  onBack,
  onToggleExpanded,
  onTypedLocationChange,
  onLocationChange
}: {
  api: IndieryApi;
  target: 'pickup' | 'drop';
  title: string;
  value: string;
  lat?: number;
  lng?: number;
  compact?: boolean;
  expanded?: boolean;
  onBack: () => void;
  onToggleExpanded: () => void;
  onTypedLocationChange: (value: string) => void;
  onLocationChange: (location: LocationDetails) => void;
}) {
  const copy = useCopy();
  const responsive = useResponsiveLayout();
  const hasInitialPin = hasValidCoordinates(lat, lng);
  const initialRegion: Region = {
    latitude: hasInitialPin ? lat ?? defaultMapCenter.lat : defaultMapCenter.lat,
    longitude: hasInitialPin ? lng ?? defaultMapCenter.lng : defaultMapCenter.lng,
    latitudeDelta: 0.012,
    longitudeDelta: 0.012
  };
  const [query, setQuery] = useState(value);
  const [pinLabel, setPinLabel] = useState(hasInitialPin ? value || copy.selectedLocation : '');
  const [pinSelected, setPinSelected] = useState(hasInitialPin);
  const [region, setRegion] = useState<Region>(initialRegion);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [localError, setLocalError] = useState('');
  const mapRef = useRef<React.ElementRef<typeof MapView> | null>(null);
  const requestSeqRef = useRef(0);
  const sessionTokenRef = useRef(`inline-map-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const userAdjustedMapRef = useRef(false);
  const programmaticMoveRef = useRef(false);
  const canRenderNativeMap = Platform.OS !== 'android' || Boolean(googleMapsApiKey);
  const pinColor = target === 'pickup' ? colors.green : colors.red;
  const hasExactPin = pinSelected && hasValidCoordinates(region.latitude, region.longitude);
  const displayLabel = query || pinLabel || value || copy.selectedLocation;
  const mapHeroHeight = compact && !expanded
    ? responsive.isLandscape && responsive.isShort
      ? 64
      : Math.max(110, Math.min(150, responsive.height * 0.24))
    : responsive.isLandscape && responsive.isShort
      ? Math.max(160, Math.min(240, responsive.height * 0.45))
    : responsive.isCompact && !expanded
      ? responsive.isSmall
        ? 258
        : 288
    : Math.max(
        responsive.isShort ? 230 : 300,
        Math.min(410, responsive.height * (responsive.isLandscape ? 0.62 : 0.46))
      );

  useEffect(() => {
    const search = query.trim();
    if (search.length < 3 || search === pinLabel) {
      setSuggestions([]);
      return;
    }

    const requestId = ++requestSeqRef.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const result = await api.autocompleteLocations(search, sessionTokenRef.current);
        if (requestId === requestSeqRef.current) {
          setSuggestions(result.suggestions);
          setLocalError('');
        }
      } catch {
        if (requestId === requestSeqRef.current) {
          setSuggestions([]);
          setLocalError('Location search unavailable');
        }
      } finally {
        if (requestId === requestSeqRef.current) setLoading(false);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [api, pinLabel, query]);

  function handleQueryChange(nextQuery: string) {
    setQuery(nextQuery);
    setPinLabel('');
    setPinSelected(false);
    setLocalError('');
    onTypedLocationChange(nextQuery);
  }

  function moveMapToRegion(nextRegion: Region) {
    programmaticMoveRef.current = true;
    setRegion((current) => (regionsAreClose(current, nextRegion) ? current : nextRegion));
    if (canRenderNativeMap) mapRef.current?.animateToRegion(nextRegion, 240);
  }

  function commitLocation(nextRegion: Region, label: string, placeId = `map-${nextRegion.latitude.toFixed(6)}-${nextRegion.longitude.toFixed(6)}`) {
    const nextLabel = label.trim() || query.trim() || value.trim() || copy.selectedLocation;
    setPinSelected(true);
    onLocationChange({
      placeId,
      label: nextLabel,
      address: nextLabel,
      lat: nextRegion.latitude,
      lng: nextRegion.longitude
    });
  }

  async function chooseSuggestion(suggestion: LocationSuggestion) {
    setLoading(true);
    setLocalError('');
    try {
      const result = await api.locationDetails(suggestion.placeId, sessionTokenRef.current);
      assertLocationHasCoordinates(result.location);
      const nextLabel = result.location.address || result.location.label;
      const nextRegion = {
        ...region,
        latitude: result.location.lat,
        longitude: result.location.lng
      };
      moveMapToRegion(nextRegion);
      setPinLabel(nextLabel);
      setQuery(nextLabel);
      setSuggestions([]);
      setPinSelected(true);
      onLocationChange(result.location);
      sessionTokenRef.current = `inline-map-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    } catch {
      setLocalError('Could not move map to this place');
    } finally {
      setLoading(false);
    }
  }

  async function useCurrentLocation() {
    setLocating(true);
    setLocalError('');
    try {
      const current = await readDeviceLocation();
      const nextLat = current.coords.latitude;
      const nextLng = current.coords.longitude;
      const reverse = await Location.reverseGeocodeAsync({ latitude: nextLat, longitude: nextLng }).catch(() => []);
      const address = formatReverseAddress(reverse[0]) || 'Current location';
      const nextRegion = {
        ...region,
        latitude: nextLat,
        longitude: nextLng
      };
      moveMapToRegion(nextRegion);
      setPinLabel(address);
      setQuery(address);
      setSuggestions([]);
      commitLocation(nextRegion, address);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Could not read current location');
    } finally {
      setLocating(false);
    }
  }

  async function updatePinFromMap(nextRegion: Region) {
    setRegion((current) => (regionsAreClose(current, nextRegion) ? current : nextRegion));
    setSuggestions([]);
    if (programmaticMoveRef.current) {
      programmaticMoveRef.current = false;
      return;
    }
    if (userAdjustedMapRef.current) {
      const reverse = await Location.reverseGeocodeAsync({
        latitude: nextRegion.latitude,
        longitude: nextRegion.longitude
      }).catch(() => []);
      const address = formatReverseAddress(reverse[0]) || displayLabel || 'Pinned location';
      setPinLabel(address);
      setQuery(address);
      commitLocation(nextRegion, address);
    }
  }

  async function updatePinFromMarker(latitude: number, longitude: number) {
    userAdjustedMapRef.current = true;
    const nextRegion = {
      ...region,
      latitude,
      longitude
    };
    setRegion(nextRegion);
    const reverse = await Location.reverseGeocodeAsync({ latitude, longitude }).catch(() => []);
    const address = formatReverseAddress(reverse[0]) || displayLabel || 'Pinned location';
    setPinLabel(address);
    setQuery(address);
    setSuggestions([]);
    commitLocation(nextRegion, address);
  }

  return (
    <View style={[styles.contactExactHero, expanded && styles.contactExactHeroExpanded]}>
      <View style={[
        styles.contactMapHeroCanvas,
        compact && !expanded && styles.contactMapHeroCanvasCompact,
        { height: mapHeroHeight },
        expanded && styles.contactMapHeroCanvasExpanded,
        expanded && { minHeight: responsive.isShort ? 80 : 180 }
      ]}>
        {canRenderNativeMap ? (
          <>
            <MapView
              ref={mapRef}
              provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
              style={styles.contactMapRealMap}
              initialRegion={initialRegion}
              onPanDrag={() => {
                userAdjustedMapRef.current = true;
              }}
              onRegionChangeComplete={updatePinFromMap}
              scrollEnabled
              zoomEnabled
              rotateEnabled={false}
              pitchEnabled={false}
            >
              <Marker
                draggable
                coordinate={{ latitude: region.latitude, longitude: region.longitude }}
                pinColor={pinColor}
                onDragEnd={(event) => updatePinFromMarker(event.nativeEvent.coordinate.latitude, event.nativeEvent.coordinate.longitude)}
              />
            </MapView>
            <View pointerEvents="none" style={styles.mapPickerPinOverlay}>
              <Ionicons name="location" size={42} color={pinColor} />
            </View>
            {!compact || expanded ? (
              <View pointerEvents="none" style={[styles.mapPickerHint, styles.contactMapPickerHint]}>
                <Text style={styles.mapPickerHintText}>{copy.dragMapPin}</Text>
              </View>
            ) : null}
          </>
        ) : (
          <View style={styles.mapPickerFallback}>
            <Ionicons name="map-outline" size={28} color={colors.customer} />
            <Text style={styles.mapPickerFallbackText}>
              Map preview needs Google Maps setup. Search a place or use current location to continue.
            </Text>
          </View>
        )}
        <Pressable
          style={[styles.contactMapBackButton, responsive.isCompact && styles.contactMapBackButtonCompact]}
          onPress={onBack}
          hitSlop={5}
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'Close expanded map' : 'Close location details'}
        >
          <Ionicons name="arrow-back" size={responsive.isCompact ? 19 : 22} color={colors.ink} />
        </Pressable>
        <Pressable
          style={[styles.contactMapExpandButton, responsive.isCompact && styles.contactMapExpandButtonCompact]}
          onPress={onToggleExpanded}
          hitSlop={3}
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'Minimize map' : 'Maximize map'}
        >
          <Ionicons name={expanded ? 'contract-outline' : 'expand-outline'} size={responsive.isCompact ? 18 : 21} color={colors.customer} />
        </Pressable>
        {!compact || expanded ? (
          <View
            pointerEvents="none"
            style={[
              styles.contactMapTitlePill,
              responsive.isCompact && !expanded && styles.contactMapTitlePillCompact,
              responsive.isShort && styles.contactMapTitlePillShort
            ]}
          >
            <Text style={styles.contactMapTitleText} numberOfLines={2}>{title}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function ContactDetailsModal({
  api,
  target,
  user,
  booking,
  setBooking,
  primaryTitle,
  onSaveAddress,
  onClose,
  onChangeLocation,
  onSaved
}: {
  api: IndieryApi;
  target: 'pickup' | 'drop';
  user: UserProfile;
  booking: typeof initialBooking;
  setBooking: React.Dispatch<React.SetStateAction<typeof initialBooking>>;
  primaryTitle?: string;
  onSaveAddress?: (input: Omit<SavedAddress, 'id'>) => Promise<void>;
  onClose: () => void;
  onChangeLocation?: () => void;
  onSaved?: (nextBooking: typeof initialBooking) => void;
}) {
  const copy = useCopy();
  const responsive = useResponsiveLayout();
  const [localError, setLocalError] = useState('');
  const [selectedAddressType, setSelectedAddressType] = useState<'home' | 'work' | 'other' | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(() => Keyboard.isVisible());
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [mapExpanded, setMapExpanded] = useState(false);
  const contactScrollRef = useRef<ScrollView | null>(null);
  const contactScrollResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fullContactViewportRef = useRef({ width: responsive.width, height: responsive.height });
  if (Math.abs(fullContactViewportRef.current.width - responsive.width) > 1) {
    fullContactViewportRef.current = { width: responsive.width, height: responsive.height };
  } else if (!keyboardVisible && responsive.height > fullContactViewportRef.current.height) {
    fullContactViewportRef.current.height = responsive.height;
  }
  const contactViewportKeyboardShrink = Math.max(
    0,
    fullContactViewportRef.current.height - responsive.height
  );
  const contactAndroidKeyboardPadding =
    Platform.OS === 'android' && keyboardVisible
      ? Math.max(0, keyboardHeight - contactViewportKeyboardShrink)
      : 0;
  const isPickup = target === 'pickup';
  const mapHint = isPickup ? 'Your goods will be picked up here' : 'Your goods will be dropped here';
  const name = isPickup ? booking.pickupContactName : booking.dropContactName;
  const phone = isPickup ? booking.pickupContactPhone : booking.dropContactPhone;
  const addressLine = isPickup ? booking.pickupAddressLine : booking.dropAddressLine;
  const place = isPickup ? booking.pickup : booking.drop;
  const placeLat = isPickup ? booking.pickupLat : booking.dropLat;
  const placeLng = isPickup ? booking.pickupLng : booking.dropLng;
  const locationParts = place
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const locationTitle = locationParts[0] || copy.selectedLocation;
  const locationSubtitle = locationParts.length > 1 ? locationParts.slice(1).join(', ') : place || copy.selectedLocation;
  const locationColor = isPickup ? colors.green : colors.red;
  const usingMine =
    name.trim() === user.name.trim() &&
    phone.replace(/\D/g, '') === user.phone.replace(/\D/g, '');

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      if (contactScrollResetTimerRef.current) {
        clearTimeout(contactScrollResetTimerRef.current);
        contactScrollResetTimerRef.current = null;
      }
      setKeyboardVisible(true);
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
      setKeyboardHeight(0);
      if (contactScrollResetTimerRef.current) clearTimeout(contactScrollResetTimerRef.current);
      contactScrollResetTimerRef.current = setTimeout(() => {
        requestAnimationFrame(() => contactScrollRef.current?.scrollTo({ y: 0, animated: false }));
        contactScrollResetTimerRef.current = null;
      }, Platform.OS === 'ios' ? 320 : 50);
    });

    return () => {
      if (contactScrollResetTimerRef.current) clearTimeout(contactScrollResetTimerRef.current);
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  function updateContact(patch: Partial<typeof initialBooking>) {
    setLocalError('');
    setBooking((current) => ({
      ...current,
      ...patch,
      ...(isPickup ? { pickupContactConfirmed: false } : { dropContactConfirmed: false })
    }));
  }

  function updateTypedLocation(nextValue: string) {
    updateContact(isPickup
      ? {
          pickup: nextValue,
          pickupPlaceId: '',
          pickupLat: undefined,
          pickupLng: undefined
        }
      : {
          drop: nextValue,
          dropPlaceId: '',
          dropLat: undefined,
          dropLng: undefined
        });
  }

  function updateExactLocation(location: LocationDetails) {
    updateContact(isPickup
      ? {
          pickup: location.address || location.label,
          pickupPlaceId: location.placeId,
          pickupLat: location.lat,
          pickupLng: location.lng
        }
      : {
          drop: location.address || location.label,
          dropPlaceId: location.placeId,
          dropLat: location.lat,
          dropLng: location.lng
        });
  }

  function useMine() {
    updateContact(isPickup
      ? {
          pickupContactName: user.name,
          pickupContactPhone: user.phone
        }
      : {
          dropContactName: user.name,
          dropContactPhone: user.phone
        });
  }

  function enterManually() {
    updateContact(isPickup
      ? {
          pickupContactName: '',
          pickupContactPhone: ''
        }
      : {
          dropContactName: '',
          dropContactPhone: ''
        });
  }

  function maximizeMap() {
    Keyboard.dismiss();
    setKeyboardVisible(false);
    setLocalError('');
    setMapExpanded(true);
  }

  function minimizeMap() {
    Keyboard.dismiss();
    setLocalError('');
    setMapExpanded(false);
  }

  function confirmExpandedLocation() {
    if (!hasValidCoordinates(placeLat, placeLng)) {
      setLocalError(copy.selectLocationFirst);
      return;
    }
    minimizeMap();
  }

  async function saveDetails() {
    if (place.trim().length < 2) {
      setLocalError(copy.selectLocationFirst);
      return;
    }
    if (name.trim().length < 2) {
      setLocalError(isPickup ? copy.enterSenderName : copy.enterReceiverName);
      return;
    }
    if (!hasValidContactPhone(phone)) {
      setLocalError(isPickup ? copy.enterSenderMobile : copy.enterReceiverMobile);
      return;
    }
    if (selectedAddressType && onSaveAddress) {
      const savedAddressLabel =
        selectedAddressType === 'home' ? 'Home' : selectedAddressType === 'work' ? 'Shop' : 'Other';
      await onSaveAddress({
        label: savedAddressLabel,
        address: place.trim(),
        addressLine: addressLine.trim(),
        lat: placeLat,
        lng: placeLng,
        type: selectedAddressType
      });
    }
    const nextBooking = {
      ...booking,
      ...(isPickup ? { pickupContactConfirmed: true } : { dropContactConfirmed: true })
    };
    setBooking(nextBooking);
    onClose();
    onSaved?.(nextBooking);
  }

  const contactFormCompactMap = keyboardVisible && !mapExpanded;
  const contactFooter = (
    <View style={[styles.contactPageFooter, responsive.isCompact && styles.contactPageFooterCompact]}>
      <View style={[styles.contactResponsiveFooterContent, { maxWidth: Math.min(680, responsive.contentMaxWidth) }]}>
        {localError ? <Text style={styles.contactFooterError}>{localError}</Text> : null}
        <Pressable style={[styles.contactConfirmButton, responsive.isCompact && styles.contactConfirmButtonCompact]} onPress={saveDetails}>
          <Text style={[styles.contactConfirmButtonText, responsive.isCompact && styles.contactConfirmButtonTextCompact]}>{primaryTitle || 'Confirm and continue'}</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={mapExpanded ? minimizeMap : onClose}
    >
      <AppStatusBar variant="light" />
      <SafeAreaView edges={['top', 'right', 'bottom', 'left']} style={styles.contactPageShell}>
        <KeyboardAvoidingView
          style={[
            styles.contactPageKeyboard,
            contactAndroidKeyboardPadding > 0 && { paddingBottom: contactAndroidKeyboardPadding }
          ]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <InlineExactLocationPicker
            api={api}
            target={target}
            title={mapHint}
            value={place}
            lat={placeLat}
            lng={placeLng}
            compact={contactFormCompactMap}
            expanded={mapExpanded}
            onBack={mapExpanded ? minimizeMap : onClose}
            onToggleExpanded={mapExpanded ? minimizeMap : maximizeMap}
            onTypedLocationChange={updateTypedLocation}
            onLocationChange={updateExactLocation}
          />
          {mapExpanded ? (
            <View
              style={[
                styles.contactExpandedMapFooter,
                { maxHeight: Math.max(112, responsive.height * (responsive.isShort ? 0.48 : 0.4)) }
              ]}
            >
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                  styles.contactResponsiveFooterContent,
                  { maxWidth: responsive.contentMaxWidth }
                ]}
              >
                <View style={styles.contactExpandedLocationRow}>
                  <Ionicons name="location" size={22} color={locationColor} />
                  <View style={styles.flex}>
                    <Text style={styles.contactExpandedLocationTitle} numberOfLines={1}>{locationTitle}</Text>
                    <Text style={styles.contactExpandedLocationSubtitle} numberOfLines={2}>{locationSubtitle}</Text>
                  </View>
                </View>
                {localError ? <Text style={styles.contactExpandedMapError}>{localError}</Text> : null}
                <Pressable style={styles.contactExpandedConfirmButton} onPress={confirmExpandedLocation}>
                  <Ionicons name="checkmark" size={18} color={colors.white} />
                  <Text style={styles.contactExpandedConfirmText}>
                    {isPickup ? copy.confirmPickupLocation : copy.confirmDropLocation}
                  </Text>
                </Pressable>
              </ScrollView>
            </View>
          ) : (
          <>
            <ScrollView
              ref={contactScrollRef}
              style={[styles.contactPagePanel, responsive.isCompact && styles.contactPagePanelCompact]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              scrollEnabled
              bounces={false}
              overScrollMode="never"
              contentContainerStyle={[
                styles.contactPagePanelContent,
                {
                  width: '100%',
                  maxWidth: Math.min(680, responsive.contentMaxWidth),
                  alignSelf: 'center',
                  paddingHorizontal: responsive.horizontalPadding,
                  paddingBottom: 22
                }
              ]}
            >
            <View style={styles.contactSheetHandle} />
            <View style={[styles.contactAddressHeader, responsive.isCompact && styles.contactAddressHeaderCompact]}>
              <Ionicons name="location" size={responsive.isCompact ? 20 : 24} color={locationColor} />
              <View style={styles.flex}>
                <Text style={[styles.contactAddressTitle, responsive.isCompact && styles.contactAddressTitleCompact]} numberOfLines={1}>{locationTitle}</Text>
                <Text style={[styles.contactAddressSubtitle, responsive.isCompact && styles.contactAddressSubtitleCompact]} numberOfLines={1}>{locationSubtitle}</Text>
              </View>
              <Pressable
                style={[styles.contactChangeButton, responsive.isCompact && styles.contactChangeButtonCompact]}
                onPress={onChangeLocation || onClose}
                hitSlop={7}
                accessibilityRole="button"
                accessibilityLabel="Change location"
              >
                <Text style={[styles.contactChangeButtonText, responsive.isCompact && styles.contactChangeButtonTextCompact]}>Change</Text>
              </Pressable>
            </View>
            <ContactFormField
              label={isPickup ? copy.pickupLandmarkOptional : copy.dropLandmarkOptional}
              value={addressLine}
              onChangeText={(value) => updateContact(isPickup ? { pickupAddressLine: value } : { dropAddressLine: value })}
            />
            <ContactFormField
              label={isPickup ? copy.senderName : copy.receiverName}
              value={name}
              onChangeText={(value) => updateContact(isPickup ? { pickupContactName: value } : { dropContactName: value })}
              icon="id-card-outline"
            />
            <ContactFormField
              label={isPickup ? copy.senderMobile : copy.receiverMobile}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={(value) => updateContact(isPickup ? { pickupContactPhone: value } : { dropContactPhone: value })}
            />
            <Pressable
              style={[styles.contactMobileCheckRow, responsive.isCompact && styles.contactMobileCheckRowCompact]}
              onPress={usingMine ? enterManually : useMine}
              hitSlop={8}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: usingMine }}
              accessibilityLabel={`Use my mobile number ${user.phone}`}
            >
              <Ionicons name={usingMine ? 'checkbox' : 'square-outline'} size={18} color={colors.customer} />
              <Text style={[styles.contactMobileCheckText, responsive.isCompact && styles.contactMobileCheckTextCompact]}>Use my mobile number: {user.phone}</Text>
            </Pressable>
            <Text style={[styles.contactSaveAsLabel, responsive.isCompact && styles.contactSaveAsLabelCompact]}>Save this address as</Text>
            <View style={[styles.contactTypeRow, responsive.isCompact && styles.contactTypeRowCompact]}>
              {[
                { type: 'home' as const, icon: 'home' as const, label: 'Home' },
                { type: 'work' as const, icon: 'business' as const, label: 'Shop' },
                { type: 'other' as const, icon: 'heart' as const, label: 'Other' }
              ].map((option) => {
                const active = selectedAddressType === option.type;
                return (
                  <Pressable
                    key={option.type}
                    style={[
                      styles.contactTypeChip,
                      responsive.isCompact && styles.contactTypeChipCompact,
                      active && styles.contactTypeChipActive
                    ]}
                    onPress={() => setSelectedAddressType(active ? null : option.type)}
                    hitSlop={6}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: active }}
                    accessibilityLabel={`Save address as ${option.label}`}
                  >
                    <Ionicons name={option.icon} size={13} color={active ? colors.customer : colors.ink} />
                    <Text style={[
                      styles.contactTypeChipText,
                      responsive.isCompact && styles.contactTypeChipTextCompact,
                      active && styles.contactTypeChipTextActive
                    ]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            </ScrollView>
            {contactFooter}
          </>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

function ContactFormField({
  label,
  value,
  onChangeText,
  keyboardType,
  icon
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'numeric' | 'phone-pad' | 'email-address';
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const responsive = useResponsiveLayout();
  return (
    <View style={[styles.contactFormField, responsive.isCompact && styles.contactFormFieldCompact]}>
      <Text style={[styles.contactFormLabel, responsive.isCompact && styles.contactFormLabelCompact]}>{label}</Text>
      <View style={[styles.contactFormInputShell, responsive.isCompact && styles.contactFormInputShellCompact]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          style={[styles.contactFormInput, responsive.isCompact && styles.contactFormInputCompact]}
        />
        {icon ? <Ionicons name={icon} size={17} color={colors.customer} /> : null}
      </View>
    </View>
  );
}

function MapLocationPicker({
  api,
  title,
  initialValue,
  initialLat,
  initialLng,
  onClose,
  onConfirm
}: {
  api: IndieryApi;
  title: string;
  initialValue: string;
  initialLat?: number;
  initialLng?: number;
  onClose: () => void;
  onConfirm: (location: LocationDetails) => void;
}) {
  const copy = useCopy();
  const responsive = useResponsiveLayout();
  const initialRegion: Region = {
    latitude: initialLat ?? defaultMapCenter.lat,
    longitude: initialLng ?? defaultMapCenter.lng,
    latitudeDelta: 0.012,
    longitudeDelta: 0.012
  };
  const [query, setQuery] = useState(initialValue);
  const [pinLabel, setPinLabel] = useState(initialValue || 'Pinned location');
  const [region, setRegion] = useState<Region>(initialRegion);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [localError, setLocalError] = useState('');
  const mapRef = useRef<React.ElementRef<typeof MapView> | null>(null);
  const requestSeqRef = useRef(0);
  const sessionTokenRef = useRef(`map-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const lat = region.latitude;
  const lng = region.longitude;
  const canRenderNativeMap = Platform.OS !== 'android' || Boolean(googleMapsApiKey);
  const mapCanvasMinHeight = 220;

  useEffect(() => {
    const search = query.trim();
    if (search.length < 3 || search === pinLabel) {
      setSuggestions([]);
      return;
    }

    const requestId = ++requestSeqRef.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const result = await api.autocompleteLocations(search, sessionTokenRef.current);
        if (requestId === requestSeqRef.current) {
          setSuggestions(result.suggestions);
          setLocalError('');
        }
      } catch {
        if (requestId === requestSeqRef.current) {
          setSuggestions([]);
          setLocalError('Location search unavailable');
        }
      } finally {
        if (requestId === requestSeqRef.current) setLoading(false);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [api, pinLabel, query]);

  async function chooseSuggestion(suggestion: LocationSuggestion) {
    setLoading(true);
    setLocalError('');
    try {
      const result = await api.locationDetails(suggestion.placeId, sessionTokenRef.current);
      assertLocationHasCoordinates(result.location);
      const nextRegion = {
        ...region,
        latitude: result.location.lat,
        longitude: result.location.lng
      };
      moveMapToRegion(nextRegion);
      setPinLabel(result.location.address || result.location.label);
      setQuery(result.location.address || result.location.label);
      setSuggestions([]);
      sessionTokenRef.current = `map-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    } catch {
      setLocalError('Could not move map to this place');
    } finally {
      setLoading(false);
    }
  }

  async function useCurrentLocation() {
    setLocating(true);
    setLocalError('');
    try {
      const current = await readDeviceLocation();
      const nextLat = current.coords.latitude;
      const nextLng = current.coords.longitude;
      const reverse = await Location.reverseGeocodeAsync({ latitude: nextLat, longitude: nextLng }).catch(() => []);
      const address = formatReverseAddress(reverse[0]) || 'Current location';
      const nextRegion = {
        ...region,
        latitude: nextLat,
        longitude: nextLng
      };
      moveMapToRegion(nextRegion);
      setPinLabel(address);
      setQuery(address);
      setSuggestions([]);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Could not read current location');
    } finally {
      setLocating(false);
    }
  }

  function moveMapToRegion(nextRegion: Region) {
    setRegion((current) => (regionsAreClose(current, nextRegion) ? current : nextRegion));
    if (canRenderNativeMap) mapRef.current?.animateToRegion(nextRegion, 240);
  }

  function updatePinFromMap(nextRegion: Region) {
    setRegion((current) => (regionsAreClose(current, nextRegion) ? current : nextRegion));
    setSuggestions([]);
  }

  async function updatePinFromMarker(latitude: number, longitude: number) {
    setRegion((current) => ({
      ...current,
      latitude,
      longitude
    }));
    const reverse = await Location.reverseGeocodeAsync({ latitude, longitude }).catch(() => []);
    const address = formatReverseAddress(reverse[0]) || 'Pinned location';
    setPinLabel(address);
    setQuery(address);
    setSuggestions([]);
  }

  function confirmPin() {
    if (!hasValidCoordinates(lat, lng)) {
      setLocalError('Select a valid location first');
      return;
    }
    onConfirm({
      placeId: `map-${lat.toFixed(6)}-${lng.toFixed(6)}`,
      label: pinLabel || 'Pinned location',
      address: pinLabel || 'Pinned location',
      lat,
      lng
    });
  }

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <AppStatusBar variant="light" />
      <SafeAreaView
        edges={appSafeAreaEdges}
        style={[styles.mapPickerShell, { paddingHorizontal: responsive.horizontalPadding }]}
      >
        <ScrollView
          style={styles.mapPickerResponsiveScroll}
          contentContainerStyle={[styles.mapPickerResponsiveContent, { maxWidth: responsive.contentMaxWidth }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
        <View style={styles.mapPickerHeader}>
          <Pressable
            style={styles.mapPickerClose}
            onPress={onClose}
            hitSlop={3}
            accessibilityRole="button"
            accessibilityLabel="Close location map"
          >
            <Ionicons name="close" size={22} color={colors.ink} />
          </Pressable>
          <View style={styles.flex}>
            <Text style={styles.mapPickerTitle}>{title}</Text>
            <Text style={styles.mapPickerSubtitle}>{copy.searchPlacePin}</Text>
          </View>
        </View>

        <View style={styles.mapPickerSearchShell}>
          <Ionicons name="search" size={18} color={colors.customer} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={copy.mapSearchPlaceholder}
            placeholderTextColor={colors.muted}
            style={styles.mapPickerSearchInput}
          />
          {loading ? <ActivityIndicator size="small" color={colors.customer} /> : null}
        </View>

        {localError ? <Text style={styles.locationError}>{localError}</Text> : null}

        {suggestions.length ? (
          <View style={styles.mapPickerSuggestionBox}>
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

        <View style={[styles.mapPickerCanvas, { minHeight: mapCanvasMinHeight }]}>
          {canRenderNativeMap ? (
            <>
              <MapView
                ref={mapRef}
                provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                style={styles.mapPickerRealMap}
                initialRegion={initialRegion}
                onRegionChangeComplete={updatePinFromMap}
              >
                <Marker
                  draggable
                  coordinate={{ latitude: region.latitude, longitude: region.longitude }}
                  onDragEnd={(event) => updatePinFromMarker(event.nativeEvent.coordinate.latitude, event.nativeEvent.coordinate.longitude)}
                />
              </MapView>
              <View pointerEvents="none" style={styles.mapPickerPinOverlay}>
                <Ionicons name="location" size={34} color={colors.customer} />
              </View>
              <View pointerEvents="none" style={styles.mapPickerHint}>
                <Text style={styles.mapPickerHintText}>{copy.dragMapPin}</Text>
              </View>
            </>
          ) : (
            <View style={styles.mapPickerFallback}>
              <Ionicons name="map-outline" size={32} color={colors.customer} />
              <Text style={styles.mapPickerFallbackText}>
                Map preview needs Google Maps setup. Search a place or use current location to continue.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.mapPickerSelectedCard}>
          <Ionicons name="navigate-circle" size={22} color={colors.customer} />
          <View style={styles.flex}>
            <Text style={styles.mapPickerSelectedTitle} numberOfLines={1}>{pinLabel}</Text>
            <Text style={styles.mapPickerCoords}>{lat.toFixed(5)}, {lng.toFixed(5)}</Text>
          </View>
        </View>

        <View style={styles.mapPickerBottomPanel}>
          <Pressable style={styles.mapPickerCurrentButton} onPress={useCurrentLocation}>
            {locating ? <ActivityIndicator size="small" color={colors.customer} /> : <Ionicons name="locate" size={18} color={colors.customer} />}
            <Text style={styles.mapPickerCurrentText}>{copy.useCurrentLocation}</Text>
          </Pressable>

          <View style={styles.mapPickerActions}>
            <SecondaryButton title={copy.cancel} icon="close" onPress={onClose} />
            <PrimaryButton title={copy.confirmLocation} icon="checkmark" onPress={confirmPin} />
          </View>
        </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function OrdersScreen({
  orders,
  activeOrders,
  activeOrder,
  tripOtp,
  busy,
  refreshing,
  onBook,
  onRefresh,
  onSelectActiveOrder,
  detailOrderRequestId,
  onDetailOrderRequestHandled,
  onShare,
  onCancel,
  onBackToHome
}: {
  orders: Order[];
  activeOrders: Order[];
  activeOrder?: Order;
  tripOtp?: TripOtp;
  busy: boolean;
  refreshing: boolean;
  onBook: () => void;
  onRefresh: () => void;
  onSelectActiveOrder: (orderId: string) => void;
  detailOrderRequestId?: string;
  onDetailOrderRequestHandled?: () => void;
  onShare?: (order: Order) => void;
  onCancel?: (order: Order) => void;
  onBackToHome: () => void;
}) {
  const copy = useCopy();
  const language = useLanguage();
  const responsive = useResponsiveLayout();
  const { bottom: bottomInset, left: leftInset, right: rightInset } = useSafeAreaInsets();
  const activeOrderIds = new Set(activeOrders.map((order) => order.id));
  const pastOrders = orders.filter((order) => !activeOrderIds.has(order.id));
  const [detailOrderId, setDetailOrderId] = useState<string | undefined>();
  const [historyDateFilter, setHistoryDateFilter] = useState<OrderHistoryDateFilter>('all');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<OrderHistoryStatusFilter>('all');
  const [historyFilterOpen, setHistoryFilterOpen] = useState(false);
  const [draftHistoryDateFilter, setDraftHistoryDateFilter] = useState<OrderHistoryDateFilter>('all');
  const [draftHistoryStatusFilter, setDraftHistoryStatusFilter] = useState<OrderHistoryStatusFilter>('all');
  const ordersScrollRef = useRef<ScrollView | null>(null);
  const allOrderIds = orders.map((order) => order.id).join('|');
  const allActiveOrderIds = activeOrders.map((order) => order.id).join('|');
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const lastSevenDaysStart = new Date(todayStart);
  lastSevenDaysStart.setDate(lastSevenDaysStart.getDate() - 6);
  const matchesHistoryDateFilter = (order: Order, filter: OrderHistoryDateFilter) => {
    if (filter === 'all') return true;
    const createdAt = new Date(order.createdAt).getTime();
    if (!Number.isFinite(createdAt)) return false;
    if (filter === 'today') {
      return createdAt >= todayStart.getTime() && createdAt < tomorrowStart.getTime();
    }
    return createdAt >= lastSevenDaysStart.getTime() && createdAt < tomorrowStart.getTime();
  };
  const deliveredOrderCount = pastOrders.filter((order) => order.status === 'delivered').length;
  const cancelledOrderCount = pastOrders.filter((order) => order.status === 'cancelled').length;
  const todayOrderCount = pastOrders.filter((order) => matchesHistoryDateFilter(order, 'today')).length;
  const lastSevenDaysOrderCount = pastOrders.filter((order) => matchesHistoryDateFilter(order, 'last7Days')).length;
  const filteredPastOrders = pastOrders.filter((order) => (
    matchesHistoryDateFilter(order, historyDateFilter) &&
    (historyStatusFilter === 'all' || order.status === historyStatusFilter)
  ));
  const historyDateFilterOptions: Array<{ id: OrderHistoryDateFilter; label: string; count: number }> = [
    { id: 'all', label: copy.allOrders, count: pastOrders.length },
    { id: 'today', label: copy.today, count: todayOrderCount },
    { id: 'last7Days', label: copy.last7Days, count: lastSevenDaysOrderCount }
  ];
  const historyStatusFilterOptions: Array<{ id: OrderHistoryStatusFilter; label: string; count: number }> = [
    { id: 'all', label: copy.allOrders, count: pastOrders.length },
    { id: 'delivered', label: copy.delivered, count: deliveredOrderCount },
    { id: 'cancelled', label: copy.cancelled, count: cancelledOrderCount }
  ];
  const activeHistoryFilterCount =
    Number(historyDateFilter !== 'all') + Number(historyStatusFilter !== 'all');
  const historyFiltersActive = activeHistoryFilterCount > 0;
  const detailOrder = detailOrderId
    ? activeOrders.find((order) => order.id === detailOrderId) ?? orders.find((order) => order.id === detailOrderId)
    : undefined;
  const detailTripOtp = visibleTripOtp(detailOrder, detailOrder?.id === activeOrder?.id ? tripOtp : undefined);

  useEffect(() => {
    if (detailOrderId && !activeOrders.some((order) => order.id === detailOrderId) && !orders.some((order) => order.id === detailOrderId)) {
      setDetailOrderId(undefined);
    }
  }, [allActiveOrderIds, allOrderIds, detailOrderId]);

  useEffect(() => {
    if (!detailOrderRequestId) return;
    const requestedOrder =
      activeOrders.find((order) => order.id === detailOrderRequestId) ??
      orders.find((order) => order.id === detailOrderRequestId);
    if (!requestedOrder) return;
    setDetailOrderId(requestedOrder.id);
    onDetailOrderRequestHandled?.();
    setTimeout(() => ordersScrollRef.current?.scrollTo({ y: 0, animated: false }), 0);
  }, [activeOrders, detailOrderRequestId, onDetailOrderRequestHandled, orders]);

  useAndroidBackHandler(() => {
    if (detailOrderId) {
      setDetailOrderId(undefined);
      return true;
    }
    onBackToHome();
    return true;
  }, [detailOrderId, onBackToHome]);

  function openOrderDetails(order: Order) {
    if (isActiveOrder(order)) onSelectActiveOrder(order.id);
    setDetailOrderId(order.id);
    setTimeout(() => ordersScrollRef.current?.scrollTo({ y: 0, animated: true }), 0);
  }

  function openHistoryFilters() {
    setDraftHistoryDateFilter(historyDateFilter);
    setDraftHistoryStatusFilter(historyStatusFilter);
    setHistoryFilterOpen(true);
  }

  function clearHistoryFilters() {
    setHistoryDateFilter('all');
    setHistoryStatusFilter('all');
    setDraftHistoryDateFilter('all');
    setDraftHistoryStatusFilter('all');
    setHistoryFilterOpen(false);
  }

  function applyHistoryFilters() {
    setHistoryDateFilter(draftHistoryDateFilter);
    setHistoryStatusFilter(draftHistoryStatusFilter);
    setHistoryFilterOpen(false);
  }

  return (
    <ScrollView
      ref={ordersScrollRef}
      style={styles.ordersScrollViewport}
      contentContainerStyle={[
        styles.scroll,
        responsive.isCompact && styles.scrollCompact,
        styles.ordersScrollContent
      ]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
    >
      {detailOrder ? (
        <OrderDetailsPanel
          order={detailOrder}
          tripOtp={detailTripOtp}
          busy={busy}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onShare={onShare ? () => onShare(detailOrder) : undefined}
          onCancel={onCancel ? () => onCancel(detailOrder) : undefined}
          onClose={() => setDetailOrderId(undefined)}
        />
      ) : (
        <>
          <View style={[styles.historyHeader, responsive.isCompact && styles.historyHeaderCompact]}>
            <SectionTitle title={`${copy.active} ${copy.orders}`} />
            <Text style={[styles.mutedSmall, responsive.isCompact && styles.mutedSmallCompact]}>{activeOrders.length} {copy.orders.toLowerCase()}</Text>
          </View>
          {activeOrders.length ? (
            activeOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onPress={() => openOrderDetails(order)}
                actionTitle={copy.trackOrder}
                actionIcon="navigate"
                onActionPress={() => openOrderDetails(order)}
              />
            ))
          ) : (
            <View style={[styles.noActiveOrderCard, responsive.isCompact && styles.noActiveOrderCardCompact]}>
              <Ionicons name="navigate-outline" size={responsive.isCompact ? 25 : 30} color={colors.muted} />
              <Text style={[styles.emptyTitle, responsive.isCompact && styles.emptyTitleCompact]}>{copy.noActiveDelivery}</Text>
              <Text style={[styles.muted, responsive.isCompact && styles.mutedCompact]}>{copy.liveTrackingAppear}</Text>
              <PrimaryButton title={copy.bookDelivery} icon="add" onPress={onBook} />
            </View>
          )}

          <View style={[styles.historyHeader, responsive.isCompact && styles.historyHeaderCompact]}>
            <SectionTitle title={copy.orderHistory} />
            {pastOrders.length ? (
              <Pressable
                style={[
                  styles.orderHistoryFilterButton,
                  historyFiltersActive && styles.orderHistoryFilterButtonActive
                ]}
                onPress={openHistoryFilters}
                accessibilityRole="button"
                accessibilityLabel={copy.filterOrders}
              >
                <Ionicons
                  name="options-outline"
                  size={15}
                  color={historyFiltersActive ? colors.white : colors.customer}
                />
                <Text
                  style={[
                    styles.orderHistoryFilterButtonText,
                    historyFiltersActive && styles.orderHistoryFilterButtonTextActive
                  ]}
                >
                  {copy.filters}
                </Text>
                {historyFiltersActive ? (
                  <View style={styles.orderHistoryFilterBadge}>
                    <Text style={styles.orderHistoryFilterBadgeText}>{activeHistoryFilterCount}</Text>
                  </View>
                ) : null}
              </Pressable>
            ) : null}
          </View>
          {pastOrders.length ? (
            <>
              {filteredPastOrders.length ? (
                filteredPastOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onPress={() => openOrderDetails(order)}
                  />
                ))
              ) : (
                <View style={[styles.emptyHistoryCard, responsive.isCompact && styles.emptyHistoryCardCompact]}>
                  <Ionicons name="filter-outline" size={responsive.isCompact ? 24 : 28} color={colors.muted} />
                  <Text style={[styles.emptyTitle, responsive.isCompact && styles.emptyTitleCompact]}>{copy.noMatchingOrders}</Text>
                  <Text style={[styles.muted, responsive.isCompact && styles.mutedCompact]}>{copy.adjustOrderFilters}</Text>
                  <Pressable
                    style={styles.orderHistoryClearButton}
                    onPress={clearHistoryFilters}
                    accessibilityRole="button"
                  >
                    <Ionicons name="refresh" size={15} color={colors.customer} />
                    <Text style={styles.orderHistoryClearButtonText}>{copy.clearFilters}</Text>
                  </Pressable>
                </View>
              )}
            </>
          ) : (
            <View style={[styles.emptyHistoryCard, responsive.isCompact && styles.emptyHistoryCardCompact]}>
              <Ionicons name="cube-outline" size={responsive.isCompact ? 24 : 28} color={colors.muted} />
              <Text style={[styles.emptyTitle, responsive.isCompact && styles.emptyTitleCompact]}>{copy.noPastOrders}</Text>
              <Text style={[styles.muted, responsive.isCompact && styles.mutedCompact]}>{copy.completedCancelledAppear}</Text>
            </View>
          )}
          <Modal
            visible={historyFilterOpen}
            transparent
            animationType="slide"
            onRequestClose={() => setHistoryFilterOpen(false)}
          >
            <View style={styles.contactSheetOverlay}>
              <Pressable
                style={styles.contactSheetBackdrop}
                onPress={() => setHistoryFilterOpen(false)}
              />
              <View
                style={[
                  styles.contactSheet,
                  styles.orderHistoryFilterSheet,
                  {
                    paddingBottom: Math.max(22, bottomInset + 12),
                    paddingLeft: Math.max(16, leftInset + 12),
                    paddingRight: Math.max(16, rightInset + 12)
                  }
                ]}
              >
                <View style={styles.contactSheetHandle} />
                <View style={styles.contactSheetHeader}>
                  <View style={styles.flex}>
                    <Text style={styles.contactSheetTitle}>{copy.filterOrders}</Text>
                    <Text style={styles.contactSheetSubtitle}>{copy.filterOrdersSubtitle}</Text>
                  </View>
                  <Pressable
                    style={styles.mapPickerClose}
                    onPress={() => setHistoryFilterOpen(false)}
                    accessibilityRole="button"
                    accessibilityLabel="Close order filters"
                  >
                    <Ionicons name="close" size={20} color={colors.ink} />
                  </Pressable>
                </View>

                <View style={styles.orderHistoryFilterGroup}>
                  <Text style={styles.orderHistoryFilterGroupTitle}>{copy.date}</Text>
                  <View style={styles.orderHistoryFilterOptionGrid}>
                    {historyDateFilterOptions.map((option) => {
                      const selected = draftHistoryDateFilter === option.id;
                      return (
                        <Pressable
                          key={option.id}
                          style={[
                            styles.orderHistorySheetOption,
                            selected && styles.orderHistorySheetOptionActive
                          ]}
                          onPress={() => setDraftHistoryDateFilter(option.id)}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                        >
                          <Text
                            style={[
                              styles.orderHistorySheetOptionText,
                              selected && styles.orderHistorySheetOptionTextActive
                            ]}
                          >
                            {option.label}
                          </Text>
                          <Text
                            style={[
                              styles.orderHistorySheetOptionCount,
                              selected && styles.orderHistorySheetOptionCountActive
                            ]}
                          >
                            {option.count}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.orderHistoryFilterGroup}>
                  <Text style={styles.orderHistoryFilterGroupTitle}>{copy.status}</Text>
                  <View style={styles.orderHistoryFilterOptionGrid}>
                    {historyStatusFilterOptions.map((option) => {
                      const selected = draftHistoryStatusFilter === option.id;
                      return (
                        <Pressable
                          key={option.id}
                          style={[
                            styles.orderHistorySheetOption,
                            selected && styles.orderHistorySheetOptionActive
                          ]}
                          onPress={() => setDraftHistoryStatusFilter(option.id)}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                        >
                          <Text
                            style={[
                              styles.orderHistorySheetOptionText,
                              selected && styles.orderHistorySheetOptionTextActive
                            ]}
                          >
                            {option.label}
                          </Text>
                          <Text
                            style={[
                              styles.orderHistorySheetOptionCount,
                              selected && styles.orderHistorySheetOptionCountActive
                            ]}
                          >
                            {option.count}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.orderHistoryFilterSheetActions}>
                  <SecondaryButton title={copy.clearFilters} icon="refresh" onPress={clearHistoryFilters} />
                  <PrimaryButton title={copy.applyFilters} icon="checkmark" onPress={applyHistoryFilters} />
                </View>
              </View>
            </View>
          </Modal>
        </>
      )}
    </ScrollView>
  );
}

function OrderDetailsPanel({
  order,
  tripOtp,
  busy,
  refreshing,
  onRefresh,
  onShare,
  onCancel,
  onClose
}: {
  order: Order;
  tripOtp?: TripOtp;
  busy: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onShare?: () => void;
  onCancel?: () => void;
  onClose?: () => void;
}) {
  const copy = useCopy();
  const language = useLanguage();
  const responsive = useResponsiveLayout();
  const countdown = useOrderCountdown(order);
  const orderActive = isActiveOrder(order);
  const cancellable = isCustomerCancellableOrder(order);

  return (
    <View>
      <View style={[styles.liveOrderPanel, responsive.isCompact && styles.liveOrderPanelCompact]}>
        <View style={[styles.liveOrderHeader, responsive.isCompact && styles.liveOrderHeaderCompact]}>
          <View style={[styles.liveOrderIcon, responsive.isCompact && styles.liveOrderIconCompact]}>
            <Ionicons name="cube" size={responsive.isCompact ? 18 : 22} color={colors.white} />
          </View>
          <View style={styles.flex}>
            <Text style={[styles.liveOrderTitle, responsive.isCompact && styles.liveOrderTitleCompact]}>{orderActive ? copy.activeDelivery : copy.orderDetails}</Text>
            <Text style={[styles.liveOrderNo, responsive.isCompact && styles.liveOrderNoCompact]}>{order.orderNo}</Text>
          </View>
          <View style={styles.orderDetailHeaderActions}>
            <Badge label={statusLabel(language, order.status)} />
            {onClose ? (
              <Pressable
                style={[styles.orderDetailClose, responsive.isCompact && styles.orderDetailCloseCompact]}
                onPress={onClose}
                hitSlop={9}
                accessibilityRole="button"
                accessibilityLabel="Close order details"
              >
                <Ionicons name="close" size={responsive.isCompact ? 14 : 16} color={colors.ink} />
              </Pressable>
            ) : null}
          </View>
        </View>

        <MapPreview
          pickup={order.pickup}
          drop={order.drop}
          extraStops={order.extraStops}
          eta={order.etaMinutes}
          liveTracking={orderActive}
          partnerLocation={orderActive ? order.partnerLocation : undefined}
        />

        <View style={[styles.liveRouteCard, responsive.isCompact && styles.liveRouteCardCompact]}>
          <View style={[styles.liveRouteLine, responsive.isCompact && styles.liveRouteLineCompact]}>
            <View style={[styles.liveRouteDot, responsive.isCompact && styles.liveRouteDotCompact, styles.liveRoutePickupDot]} />
            <View style={styles.flex}>
              <Text style={[styles.liveRouteLabel, responsive.isCompact && styles.liveRouteLabelCompact]}>{copy.pickup}</Text>
              <Text style={[styles.liveRouteText, responsive.isCompact && styles.liveRouteTextCompact]} numberOfLines={1}>{order.pickup.label}</Text>
            </View>
          </View>
          {order.extraStops.map((stop, index) => (
            <View key={`${order.id}-detail-stop-${index}`} style={[styles.liveRouteLine, responsive.isCompact && styles.liveRouteLineCompact]}>
              <View style={[styles.liveRouteDot, responsive.isCompact && styles.liveRouteDotCompact, styles.liveRouteStopDot]} />
              <View style={styles.flex}>
                <Text style={[styles.liveRouteLabel, responsive.isCompact && styles.liveRouteLabelCompact]}>{copy.stop} {index + 1}</Text>
                <Text style={[styles.liveRouteText, responsive.isCompact && styles.liveRouteTextCompact]} numberOfLines={1}>{stop.label}</Text>
              </View>
            </View>
          ))}
          <View style={[styles.liveRouteLine, responsive.isCompact && styles.liveRouteLineCompact]}>
            <View style={[styles.liveRouteDot, responsive.isCompact && styles.liveRouteDotCompact, styles.liveRouteDropDot]} />
            <View style={styles.flex}>
              <Text style={[styles.liveRouteLabel, responsive.isCompact && styles.liveRouteLabelCompact]}>{copy.drop}</Text>
              <Text style={[styles.liveRouteText, responsive.isCompact && styles.liveRouteTextCompact]} numberOfLines={1}>{order.drop.label}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.liveOrderMetrics, responsive.isCompact && styles.liveOrderMetricsCompact]}>
          <View style={[styles.liveOrderMetric, responsive.isCompact && styles.liveOrderMetricCompact]}>
            <Text style={[styles.liveOrderMetricValue, responsive.isCompact && styles.liveOrderMetricValueCompact]}>{order.vehicle.shortName}</Text>
            <Text style={[styles.liveOrderMetricLabel, responsive.isCompact && styles.liveOrderMetricLabelCompact]}>{copy.vehicle}</Text>
          </View>
          <View style={[styles.liveOrderMetric, responsive.isCompact && styles.liveOrderMetricCompact]}>
            <Text style={[styles.liveOrderMetricValue, responsive.isCompact && styles.liveOrderMetricValueCompact]}>{order.weightKg} kg</Text>
            <Text style={[styles.liveOrderMetricLabel, responsive.isCompact && styles.liveOrderMetricLabelCompact]}>{goodsLabel(language, order.goodsType)}</Text>
          </View>
          <View style={[styles.liveOrderMetric, responsive.isCompact && styles.liveOrderMetricCompact]}>
            <Text style={[styles.liveOrderMetricValue, responsive.isCompact && styles.liveOrderMetricValueCompact]}>{money(order.fare.total)}</Text>
            <Text style={[styles.liveOrderMetricLabel, responsive.isCompact && styles.liveOrderMetricLabelCompact]} numberOfLines={1}>
              {order.paymentMode.toUpperCase()} - {order.paymentStatus.toUpperCase()}
            </Text>
          </View>
        </View>

        {countdown ? (
          <View style={[
            styles.countdownCard,
            responsive.isCompact && styles.countdownCardCompact,
            countdown.delayed && styles.countdownCardDelayed
          ]}>
            <Ionicons
              name={countdown.delayed ? 'alert-circle' : countdown.pendingPickup ? 'cube-outline' : 'timer-outline'}
              size={responsive.isCompact ? 16 : 19}
              color={countdown.delayed ? colors.red : colors.customer}
            />
            <View style={styles.flex}>
              <Text style={[
                styles.countdownValue,
                responsive.isCompact && styles.countdownValueCompact,
                countdown.delayed && styles.countdownValueDelayed
              ]}>
                {countdown.delayed ? copy.runningLate : countdown.pendingPickup ? copy.countdownBegins : countdown.label}
              </Text>
            </View>
          </View>
        ) : null}

        {order.partner ? (
          <View style={[styles.assignedPartnerRow, responsive.isCompact && styles.assignedPartnerRowCompact]}>
            <View style={styles.driverAvatar}>
              <Text style={styles.driverAvatarText}>{order.partner.initials}</Text>
            </View>
            <View style={styles.flex}>
              <Text style={styles.cardTitle}>{order.partner.name}</Text>
              <Text style={styles.mutedSmall}>Mobile: {order.partner.phone}</Text>
              <Text style={styles.mutedSmall}>Vehicle: {order.partner.partnerProfile?.vehicleNumber || copy.vehicleAssigned}</Text>
            </View>
          </View>
        ) : orderActive ? (
          <View style={[styles.searchingPartnerRow, responsive.isCompact && styles.searchingPartnerRowCompact]}>
            <ActivityIndicator size="small" color={colors.customer} />
            <Text style={[styles.searchingPartnerText, responsive.isCompact && styles.searchingPartnerTextCompact]}>{copy.findingNearbyPartner}</Text>
          </View>
        ) : null}

        {tripOtp?.pickup || tripOtp?.drop ? (
          <View style={[styles.ordersOtpPanel, responsive.isCompact && styles.ordersOtpPanelCompact]}>
            <View style={styles.ordersOtpTitleRow}>
              <Ionicons name="key" size={16} color={colors.customer} />
              <Text style={[styles.ordersOtpTitle, responsive.isCompact && styles.ordersOtpTitleCompact]}>{copy.deliveryOtp}</Text>
            </View>
            <View style={styles.ordersOtpRow}>
              {tripOtp.pickup ? (
                <View style={[styles.compactOtpBox, responsive.isCompact && styles.compactOtpBoxDense]}>
                  <Text style={[styles.mutedSmall, responsive.isCompact && styles.mutedSmallCompact]}>{copy.pickupOtp}</Text>
                  <Text style={[styles.compactOtpText, responsive.isCompact && styles.compactOtpTextDense]}>{tripOtp.pickup}</Text>
                </View>
              ) : null}
              {tripOtp.drop ? (
                <View style={[styles.compactOtpBox, responsive.isCompact && styles.compactOtpBoxDense]}>
                  <Text style={[styles.mutedSmall, responsive.isCompact && styles.mutedSmallCompact]}>{copy.dropOtp}</Text>
                  <Text style={[styles.compactOtpText, responsive.isCompact && styles.compactOtpTextDense]}>{tripOtp.drop}</Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        <View style={[styles.orderActionBar, responsive.isCompact && styles.orderActionBarCompact]}>
          <OrderActionButton
            title={refreshing ? copy.refreshing : copy.refresh}
            icon="refresh"
            tone="primary"
            onPress={onRefresh}
            disabled={refreshing}
            loading={refreshing}
          />
          {onShare && orderActive ? <OrderActionButton title={copy.share} icon="share-social" onPress={onShare} /> : null}
          {onCancel && cancellable ? (
            <OrderActionButton title={busy ? copy.cancelling : copy.cancel} icon="close-circle" tone="danger" onPress={onCancel} />
          ) : null}
        </View>
      </View>

      <FareCard fare={order.fare} />

      <View style={[styles.timelinePanel, responsive.isCompact && styles.timelinePanelCompact]}>
        <View style={styles.timelinePanelHeader}>
          <Text style={[styles.cardTitle, responsive.isCompact && styles.cardTitleCompact]}>{copy.track}</Text>
          <Text style={[styles.mutedSmall, responsive.isCompact && styles.mutedSmallCompact]}>{statusLabel(language, order.status)}</Text>
        </View>
        <Timeline items={order.timeline} />
      </View>
    </View>
  );
}

function TrackScreen({
  order,
  tripOtp,
  busy,
  refreshing,
  onRefresh,
  onCancel
}: {
  order?: Order;
  tripOtp?: TripOtp;
  busy: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onCancel?: () => void;
}) {
  const copy = useCopy();
  if (!order) {
    return (
      <View style={styles.empty}>
        <Ionicons name="cube-outline" size={42} color={colors.muted} />
        <Text style={styles.emptyTitle}>{copy.noActiveDelivery}</Text>
        <Text style={styles.muted}>{copy.liveTrackingAppear}</Text>
        <PrimaryButton title={refreshing ? copy.refreshing : copy.refresh} icon="refresh" onPress={onRefresh} disabled={refreshing} loading={refreshing} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <OrderDetailsPanel
        order={order}
        tripOtp={tripOtp}
        busy={busy}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onCancel={onCancel && isCustomerCancellableOrder(order) ? () => onCancel() : undefined}
      />
    </ScrollView>
  );
}

function WalletScreen({
  wallet,
  busy,
  onCoupon
}: {
  wallet: CustomerWallet;
  busy: boolean;
  onCoupon: () => Promise<{ addedCoins: number; alreadyApplied?: boolean }>;
}) {
  const copy = useCopy();
  const responsive = useResponsiveLayout();
  const [couponMessage, setCouponMessage] = useState('');
  const [couponMessageKind, setCouponMessageKind] = useState<'success' | 'error'>('success');
  const recentCoinLedger = wallet.coinLedger.slice(0, 7);
  const nextOrderDiscount = automaticCoinDiscount(undefined, wallet);

  async function applyFirst50() {
    setCouponMessage('');
    try {
      const result = await onCoupon();
      if (result.alreadyApplied || result.addedCoins <= 0) {
        setCouponMessage(copy.couponAlreadyClaimed);
        setCouponMessageKind('error');
        return;
      }
      setCouponMessage(copy.couponApplied);
      setCouponMessageKind('success');
    } catch (err) {
      setCouponMessage(err instanceof Error ? err.message : copy.invalidCoupon);
      setCouponMessageKind('error');
    }
  }

  return (
    <ScrollView contentContainerStyle={[styles.scroll, responsive.isCompact && styles.scrollCompact]}>
        <View style={[styles.walletCoinsCard, responsive.isCompact && styles.walletCoinsCardCompact]}>
          <View style={[styles.walletCoinsHeader, responsive.isCompact && styles.walletCoinsHeaderCompact]}>
            <View style={[styles.walletCoinsIcon, responsive.isCompact && styles.walletCoinsIconCompact]}>
              <Ionicons name="wallet-outline" size={responsive.isCompact ? 18 : 21} color={colors.customer} />
            </View>
            <View style={styles.flex}>
              <Text style={[styles.walletCoinsEyebrow, responsive.isCompact && styles.walletCoinsEyebrowCompact]}>{copy.indieryCoins}</Text>
              <Text style={[styles.walletCoinsCaption, responsive.isCompact && styles.walletCoinsCaptionCompact]}>{copy.useCoinsDiscount}</Text>
            </View>
          </View>

          <View style={[styles.walletCoinsBalanceRow, responsive.isCompact && styles.walletCoinsBalanceRowCompact]}>
            <View style={[styles.walletCoinsBalanceMain, responsive.isCompact && styles.walletCoinsBalanceMainCompact]}>
              <Text style={[styles.walletCoinsValue, responsive.isCompact && styles.walletCoinsValueCompact]}>{wallet.coins}</Text>
              <Text style={[styles.walletCoinsAvailable, responsive.isCompact && styles.walletCoinsAvailableCompact]}>{copy.coinsAvailable}</Text>
            </View>
            <View style={[styles.walletCoinsDiscountBox, responsive.isCompact && styles.walletCoinsDiscountBoxCompact]}>
              <Ionicons name="sparkles" size={responsive.isCompact ? 14 : 16} color={colors.green} />
              <View style={styles.flex}>
                <Text style={[styles.walletCoinsDiscountValue, responsive.isCompact && styles.walletCoinsDiscountValueCompact]}>{money(nextOrderDiscount)}</Text>
                <Text style={[styles.walletCoinsDiscount, responsive.isCompact && styles.walletCoinsDiscountCompact]}>{copy.coinDiscountNextOrders}</Text>
              </View>
            </View>
          </View>

          <Pressable
            style={[
              styles.walletCouponButton,
              responsive.isCompact && styles.walletCouponButtonCompact,
              busy && styles.walletCouponButtonBusy
            ]}
            onPress={applyFirst50}
            disabled={busy}
          >
            {busy ? <ActivityIndicator size="small" color={colors.customer} /> : <Ionicons name="gift-outline" size={17} color={colors.customer} />}
            <Text style={[styles.walletCouponText, responsive.isCompact && styles.walletCouponTextCompact]}>{busy ? copy.applying : `${copy.applyCoupon} FIRST50`}</Text>
          </Pressable>
          {couponMessage ? (
            <Text style={couponMessageKind === 'success' ? styles.walletCouponSuccess : styles.walletCouponError}>
              {couponMessage}
            </Text>
          ) : null}

        </View>

        <SectionTitle title={copy.coinActivity} />
        {recentCoinLedger.length ? (
          <View style={[styles.coinActivityCard, responsive.isCompact && styles.coinActivityCardCompact]}>
            {recentCoinLedger.map((item, index) => (
              <CoinActivityRow
                key={item.id}
                item={item}
                showDivider={index < recentCoinLedger.length - 1}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyHistoryCard}>
            <Ionicons name="gift-outline" size={24} color={colors.muted} />
            <Text style={styles.cardTitle}>{copy.noCoinActivity}</Text>
          </View>
        )}
    </ScrollView>
  );
}

function CoinActivityRow({ item, showDivider = false }: { item: LedgerItem; showDivider?: boolean }) {
  const isCredit = item.kind === 'credit';
  const responsive = useResponsiveLayout();
  return (
    <View style={[
      styles.coinActivityRow,
      responsive.isCompact && styles.coinActivityRowCompact,
      showDivider && styles.coinActivityRowDivider
    ]}>
      <View style={[
        styles.coinActivityIcon,
        responsive.isCompact && styles.coinActivityIconCompact,
        isCredit ? styles.coinActivityIconCredit : styles.coinActivityIconDebit
      ]}>
        <Ionicons name={isCredit ? 'chevron-up' : 'chevron-down'} size={responsive.isCompact ? 15 : 18} color={isCredit ? colors.green : colors.red} />
      </View>
      <View style={styles.flex}>
        <Text style={[styles.coinActivityTitle, responsive.isCompact && styles.coinActivityTitleCompact]}>{item.title}</Text>
        <Text style={[styles.coinActivityDate, responsive.isCompact && styles.coinActivityDateCompact]}>{formatCoinActivityDate(item.createdAt)}</Text>
      </View>
      <Text style={[
        styles.coinActivityAmount,
        responsive.isCompact && styles.coinActivityAmountCompact,
        isCredit ? styles.coinActivityAmountCredit : styles.coinActivityAmountDebit
      ]}>
        {isCredit ? '+' : '-'}{item.amount}
      </Text>
      <View style={[styles.coinActivityBadge, responsive.isCompact && styles.coinActivityBadgeCompact]}>
        <Ionicons name="ellipse" size={7} color={colors.white} />
      </View>
    </View>
  );
}

function AccountScreen({
  data,
  busy,
  language,
  onSaveProfile,
  onChangeLanguage,
  onDeleteAddress,
  onLogout,
  onRequestAccountDeletion,
  onBackToHome
}: {
  data: CustomerBootstrap;
  busy: boolean;
  language: AppLanguage;
  onSaveProfile: (input: { name: string; email: string; city: string }) => Promise<void>;
  onChangeLanguage: (language: AppLanguage) => void;
  onDeleteAddress: (addressId: string) => Promise<void>;
  onLogout: () => void;
  onRequestAccountDeletion: () => void;
  onBackToHome: () => void;
}) {
  const copy = useCopy();
  const responsive = useResponsiveLayout();
  const completedOrders = data.orders.filter((order) => order.status === 'delivered').length;
  const activeOrders = data.orders.filter((order) => !['delivered', 'cancelled'].includes(order.status)).length;
  const savedAddresses = data.user.customerProfile?.savedAddresses ?? [];
  const coins = data.user.customerProfile?.coins ?? data.wallet.coins;
  const savedAddressCountText = `${savedAddresses.length} ${savedAddresses.length === 1 ? copy.savedPlace : copy.savedPlacesCount}`;
  const [page, setPage] = useState<CustomerAccountPage>('overview');
  const [name, setName] = useState(data.user.name);
  const [email, setEmail] = useState(data.user.email || '');
  const [city, setCity] = useState(data.user.city);
  const [localError, setLocalError] = useState('');
  const selectedLanguageLabel = languageNativeLabel(language);
  const openPolicy = legalPolicies.find((policy) => policy.id === page);

  useEffect(() => {
    if (page !== 'personal') {
      setName(data.user.name);
      setEmail(data.user.email || '');
      setCity(data.user.city);
      setLocalError('');
    }
  }, [data.user.city, data.user.email, data.user.name, page]);

  function openPage(nextPage: CustomerAccountPage) {
    setLocalError('');
    setPage(nextPage);
  }

  function cancelEditDetails() {
    setName(data.user.name);
    setEmail(data.user.email || '');
    setCity(data.user.city);
    setLocalError('');
    setPage('overview');
  }

  useAndroidBackHandler(() => {
    if (openPolicy) {
      openPage('legal');
      return true;
    }
    if (page !== 'overview') {
      openPage('overview');
      return true;
    }
    onBackToHome();
    return true;
  }, [openPolicy?.id, page, onBackToHome]);

  async function submitDetails() {
    const nextName = name.trim();
    const nextEmail = email.trim();
    const nextCity = city.trim();
    if (nextName.length < 2) {
      setLocalError(copy.name);
      return;
    }
    if (nextEmail && !nextEmail.includes('@')) {
      setLocalError(copy.email);
      return;
    }
    if (nextCity.length < 2) {
      setLocalError(copy.city);
      return;
    }
    setLocalError('');
    await onSaveProfile({ name: nextName, email: nextEmail, city: nextCity });
    setPage('overview');
  }

  if (page === 'enterprise') {
    return <EnterpriseInfoScreen onBack={() => openPage('overview')} />;
  }

  if (openPolicy) {
    return <AccountPolicyDetail policy={openPolicy} onBack={() => openPage('legal')} />;
  }

  if (page !== 'overview') {
    const title =
      page === 'personal' ? copy.personalDetails
        : page === 'addresses' ? copy.savedAddresses
          : page === 'wallet' ? copy.indieryCoinsMenu
            : page === 'language' ? copy.changeLanguage
              : page === 'support' ? copy.helpSupport
                : copy.policiesLegal;
    const subtitle =
      page === 'personal' ? copy.mobileNumber
        : page === 'addresses' ? copy.savePickupDropAddresses
          : page === 'wallet' ? copy.useCoinsDiscount
            : page === 'language' ? selectedLanguageLabel
              : page === 'support' ? copy.supportSubtitle
                : copy.updated;

    return (
      <KeyboardAvoidingView style={styles.authKeyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.scroll, responsive.isCompact && styles.scrollCompact]} keyboardShouldPersistTaps="handled">
          <AccountDetailHeader title={title} subtitle={subtitle} onBack={() => openPage('overview')} />

          {page === 'personal' ? (
            <View style={[styles.accountDetailCard, responsive.isCompact && styles.accountDetailCardCompact]}>
              <View style={[styles.accountProfilePreview, responsive.isCompact && styles.accountProfilePreviewCompact]}>
                <View style={[styles.accountAvatarSmall, responsive.isCompact && styles.accountAvatarSmallCompact]}>
                  <Text style={[styles.accountAvatarText, responsive.isCompact && styles.accountAvatarTextCompact]}>{data.user.initials}</Text>
                </View>
                <View style={styles.flex}>
                  <Text style={[styles.accountMenuTitle, responsive.isCompact && styles.accountMenuTitleCompact]}>{data.user.name}</Text>
                  <Text style={[styles.accountMenuSubtitle, responsive.isCompact && styles.accountMenuSubtitleCompact]}>{data.user.phone}</Text>
                </View>
                <View style={[styles.accountVerifiedBadge, responsive.isCompact && styles.accountVerifiedBadgeCompact]}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.green} />
                  <Text style={[styles.accountVerifiedText, responsive.isCompact && styles.accountVerifiedTextCompact]}>{copy.verified}</Text>
                </View>
              </View>
              <Field label={copy.name} value={name} onChangeText={setName} />
              <Field label={copy.email} value={email} onChangeText={setEmail} keyboardType="email-address" />
              <Field label={copy.city} value={city} onChangeText={setCity} />
              <Field label={copy.mobileNumber} value={data.user.phone} editable={false} keyboardType="phone-pad" />
        <View style={[styles.accountInfoStrip, responsive.isCompact && styles.accountInfoStripCompact]}>
          <Ionicons name="shield-checkmark" size={19} color={colors.customer} />
          <Text style={[styles.accountInfoText, responsive.isCompact && styles.accountInfoTextCompact]}>{copy.mobileLinkedText}</Text>
        </View>
              {localError ? <Text style={styles.accountEditError}>{localError}</Text> : null}
              <View style={[styles.accountEditActions, responsive.isCompact && styles.accountEditActionsCompact]}>
                <SecondaryButton title={copy.cancel} icon="close" onPress={cancelEditDetails} />
                <PrimaryButton title={busy ? copy.saving : copy.save} icon="checkmark" onPress={submitDetails} />
              </View>
            </View>
          ) : null}

          {page === 'addresses' ? (
            <SavedAddressesSection addresses={savedAddresses} busy={busy} onDeleteAddress={onDeleteAddress} />
          ) : null}

          {page === 'wallet' ? (
            <>
              <View style={styles.accountWalletHero}>
                <View style={styles.walletHeroIcon}>
                  <Ionicons name="gift" size={22} color={colors.white} />
                </View>
                <Text style={styles.accountWalletValue}>{coins}</Text>
                <Text style={styles.accountWalletLabel}>{copy.coinsAvailable}</Text>
                <Text style={styles.accountWalletText}>{copy.useCoinsDiscount}</Text>
              </View>
              <SectionTitle title={copy.coinRules} />
              {[copy.coinRuleEarn, copy.coinRuleUse, copy.coinRuleRefunds].map((item) => (
                <View key={item} style={styles.listRow}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.green} />
                  <Text style={styles.listText}>{item}</Text>
                </View>
              ))}
              <SectionTitle title={copy.coinActivity} />
              {data.wallet.coinLedger.length ? (
                <View style={styles.coinActivityCard}>
                  {data.wallet.coinLedger.slice(0, 7).map((item, index, recentCoinLedger) => (
                    <CoinActivityRow
                      key={item.id}
                      item={item}
                      showDivider={index < recentCoinLedger.length - 1}
                    />
                  ))}
                </View>
              ) : (
                <View style={styles.savedAddressEmpty}>
                  <Ionicons name="gift-outline" size={24} color={colors.muted} />
                  <Text style={styles.savedAddressEmptyTitle}>{copy.noCoinActivity}</Text>
                </View>
              )}
            </>
          ) : null}

          {page === 'language' ? <LanguagePanel selected={language} onSelect={onChangeLanguage} /> : null}

          {page === 'support' ? <SupportPanel /> : null}

          {page === 'legal' ? <PolicyList onOpenPolicy={(policyId) => openPage(policyId)} /> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.scroll, responsive.isCompact && styles.scrollCompact]}>
      <View style={[styles.accountHero, responsive.isCompact && styles.accountHeroCompact]}>
        <View style={[styles.accountHeroTop, responsive.isCompact && styles.accountHeroTopCompact]}>
          <View>
            <Text style={[styles.accountEyebrow, responsive.isCompact && styles.accountEyebrowCompact]}>{copy.account}</Text>
          </View>
        </View>
        <View style={[styles.accountIdentityCard, responsive.isCompact && styles.accountIdentityCardCompact]}>
          <View style={[styles.accountAvatar, responsive.isCompact && styles.accountAvatarCompact]}>
            <Text style={[styles.accountAvatarText, responsive.isCompact && styles.accountAvatarTextCompact]}>{data.user.initials}</Text>
          </View>
          <View style={styles.flex}>
            <Text style={[styles.accountName, responsive.isCompact && styles.accountNameCompact]}>{data.user.name}</Text>
            <Text style={[styles.accountSubtext, responsive.isCompact && styles.accountSubtextCompact]}>{data.user.phone}</Text>
            <Text style={[styles.accountSubtext, responsive.isCompact && styles.accountSubtextCompact]}>{data.user.city}</Text>
          </View>
          <Pressable
            style={[styles.accountEditButton, responsive.isCompact && styles.accountEditButtonCompact]}
            onPress={() => openPage('personal')}
            hitSlop={5}
            accessibilityRole="button"
            accessibilityLabel="Edit personal details"
          >
            <Ionicons name="create-outline" size={responsive.isCompact ? 16 : 18} color={colors.customer} />
          </Pressable>
        </View>
      </View>

      <View style={[styles.accountStatsRow, responsive.isCompact && styles.accountStatsRowCompact]}>
        <View style={[styles.accountStatBox, responsive.isCompact && styles.accountStatBoxCompact]}>
          <Text style={[styles.accountStatValue, responsive.isCompact && styles.accountStatValueCompact]}>{data.orders.length}</Text>
          <Text style={[styles.accountStatLabel, responsive.isCompact && styles.accountStatLabelCompact]}>{copy.orders}</Text>
        </View>
        <View style={[styles.accountStatBox, responsive.isCompact && styles.accountStatBoxCompact]}>
          <Text style={[styles.accountStatValue, responsive.isCompact && styles.accountStatValueCompact]}>{activeOrders}</Text>
          <Text style={[styles.accountStatLabel, responsive.isCompact && styles.accountStatLabelCompact]}>{copy.active}</Text>
        </View>
        <View style={[styles.accountStatBox, responsive.isCompact && styles.accountStatBoxCompact]}>
          <Text style={[styles.accountStatValue, responsive.isCompact && styles.accountStatValueCompact]}>{completedOrders}</Text>
          <Text style={[styles.accountStatLabel, responsive.isCompact && styles.accountStatLabelCompact]}>{copy.done}</Text>
        </View>
      </View>

      <Pressable style={[styles.enterpriseCard, responsive.isCompact && styles.enterpriseCardCompact]} onPress={() => openPage('enterprise')}>
        <View style={[styles.enterpriseIcon, responsive.isCompact && styles.enterpriseIconCompact]}>
          <Ionicons name="business" size={responsive.isCompact ? 20 : 24} color={colors.white} />
        </View>
        <View style={styles.flex}>
          <Text style={[styles.enterpriseTitle, responsive.isCompact && styles.enterpriseTitleCompact]}>{copy.enterprisesTitle}</Text>
          <Text style={[styles.enterpriseText, responsive.isCompact && styles.enterpriseTextCompact]}>{copy.enterprisesText}</Text>
        </View>
        <Ionicons name="chevron-forward" size={19} color={colors.customer} />
      </Pressable>

      <SectionTitle title={copy.account} />
      <View style={styles.accountMenu}>
        <AccountMenuRow
          icon="bookmark-outline"
          title={copy.savedAddresses}
          subtitle={savedAddressCountText}
          onPress={() => openPage('addresses')}
        />
        <AccountMenuRow
          icon="language-outline"
          title={copy.changeLanguage}
          subtitle={selectedLanguageLabel}
          onPress={() => openPage('language')}
        />
        <AccountMenuRow
          icon="headset-outline"
          title={copy.helpSupport}
          subtitle={copy.supportSubtitle}
          onPress={() => openPage('support')}
        />
        <AccountMenuRow
          icon="document-text-outline"
          title={copy.policiesLegal}
          subtitle={legalPolicies.map((policy) => policy.title).join(', ')}
          onPress={() => openPage('legal')}
          last
        />
      </View>

      <View style={styles.accountDangerZone}>
        <Pressable style={styles.deleteAccountButton} onPress={onRequestAccountDeletion}>
          <Ionicons name="trash-outline" size={18} color={colors.red} />
          <Text style={styles.deleteAccountButtonText}>{copy.requestAccountDeletion}</Text>
        </Pressable>
        <Pressable style={styles.logoutButton} onPress={onLogout}>
          <Ionicons name="log-out-outline" size={18} color={colors.ink} />
          <Text style={styles.logoutButtonText}>{copy.logout}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function AccountDetailHeader({ title, subtitle, onBack }: { title: string; subtitle: string; onBack: () => void }) {
  const responsive = useResponsiveLayout();
  return (
    <View style={[styles.accountDetailHeader, responsive.isCompact && styles.accountDetailHeaderCompact]}>
      <Pressable
        style={[styles.mapPickerClose, responsive.isCompact && styles.mapPickerCloseCompact]}
        onPress={onBack}
        hitSlop={3}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Ionicons name="arrow-back" size={responsive.isCompact ? 18 : 21} color={colors.ink} />
      </Pressable>
      <View style={styles.flex}>
        <Text style={[styles.accountDetailTitle, responsive.isCompact && styles.accountDetailTitleCompact]}>{title}</Text>
        <Text style={[styles.accountDetailSubtitle, responsive.isCompact && styles.accountDetailSubtitleCompact]}>{subtitle}</Text>
      </View>
    </View>
  );
}

function EnterpriseInfoScreen({ onBack }: { onBack: () => void }) {
  const copy = useCopy();
  const responsive = useResponsiveLayout();
  const businessFeatures: Array<{
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle: string;
  }> = [
    {
      icon: 'repeat-outline',
      title: copy.recurringRoutes,
      subtitle: copy.recurringRoutesText
    },
    {
      icon: 'receipt-outline',
      title: copy.monthlyBilling,
      subtitle: copy.monthlyBillingText
    },
    {
      icon: 'cube-outline',
      title: copy.bulkOrders,
      subtitle: copy.bulkOrdersText
    },
    {
      icon: 'headset-outline',
      title: copy.prioritySupport,
      subtitle: copy.prioritySupportText
    }
  ];
  const businessTypes = [copy.retailStores, copy.wholesalers, copy.restaurants, copy.manufacturers, copy.offices, copy.ecommerceSellers];

  return (
    <ScrollView contentContainerStyle={[styles.scroll, responsive.isCompact && styles.scrollCompact]}>
      <View style={[styles.enterprisePageHeader, responsive.isCompact && styles.enterprisePageHeaderCompact]}>
        <Pressable
          style={[styles.mapPickerClose, responsive.isCompact && styles.mapPickerCloseCompact]}
          onPress={onBack}
          hitSlop={3}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={responsive.isCompact ? 18 : 21} color={colors.ink} />
        </Pressable>
        <View style={styles.flex}>
          <Text style={[styles.enterprisePageTitle, responsive.isCompact && styles.enterprisePageTitleCompact]}>{copy.enterprisesTitle}</Text>
        </View>
      </View>

      <View style={[styles.enterpriseHeroPanel, responsive.isCompact && styles.enterpriseHeroPanelCompact]}>
        <View style={[styles.enterpriseHeroIcon, responsive.isCompact && styles.enterpriseHeroIconCompact]}>
          <Ionicons name="business" size={responsive.isCompact ? 24 : 30} color={colors.white} />
        </View>
        <Text style={[styles.enterpriseHeroTitle, responsive.isCompact && styles.enterpriseHeroTitleCompact]}>{copy.moveGoodsBusiness}</Text>
        <Text style={[styles.enterpriseHeroText, responsive.isCompact && styles.enterpriseHeroTextCompact]}>{copy.enterpriseHeroText}</Text>
      </View>

      <SectionTitle title={copy.whatYouGet} />
      <View style={[styles.enterpriseFeatureGrid, responsive.isCompact && styles.enterpriseFeatureGridCompact]}>
        {businessFeatures.map((feature) => (
          <View
            key={feature.title}
            style={[styles.enterpriseFeatureCard, responsive.isCompact && styles.enterpriseFeatureCardCompact]}
          >
            <View style={[styles.enterpriseFeatureIcon, responsive.isCompact && styles.enterpriseFeatureIconCompact]}>
              <Ionicons name={feature.icon} size={responsive.isCompact ? 16 : 18} color={colors.customer} />
            </View>
            <Text style={[styles.enterpriseFeatureTitle, responsive.isCompact && styles.enterpriseFeatureTitleCompact]}>{feature.title}</Text>
            <Text style={[styles.enterpriseFeatureText, responsive.isCompact && styles.enterpriseFeatureTextCompact]}>{feature.subtitle}</Text>
          </View>
        ))}
      </View>

      <SectionTitle title={copy.bestFor} />
      <View style={[styles.enterpriseChipWrap, responsive.isCompact && styles.enterpriseChipWrapCompact]}>
        {businessTypes.map((item) => (
          <View key={item} style={[styles.enterpriseChip, responsive.isCompact && styles.enterpriseChipCompact]}>
            <Text style={[styles.enterpriseChipText, responsive.isCompact && styles.enterpriseChipTextCompact]}>{item}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.enterpriseContactCard, responsive.isCompact && styles.enterpriseContactCardCompact]}>
        <Text style={[styles.enterpriseFeatureTitle, responsive.isCompact && styles.enterpriseFeatureTitleCompact]}>{copy.talkEnterprises}</Text>
        <Text style={[styles.enterpriseFeatureText, responsive.isCompact && styles.enterpriseFeatureTextCompact]}>{copy.shareBusinessRoutes}</Text>
        <View style={styles.row}>
          <SecondaryButton title={copy.emailButton} icon="mail-outline" onPress={() => Linking.openURL('mailto:support@indiery.in?subject=Indiery%20Enterprises')} />
          <PrimaryButton title={copy.callButton} icon="call-outline" onPress={() => Linking.openURL('tel:+919000000000')} />
        </View>
      </View>
    </ScrollView>
  );
}

function SavedAddressesSection({
  addresses,
  busy,
  onDeleteAddress
}: {
  addresses: SavedAddress[];
  busy: boolean;
  onDeleteAddress: (addressId: string) => Promise<void>;
}) {
  const copy = useCopy();
  const responsive = useResponsiveLayout();
  return (
    <View>
      <SectionTitle title={copy.savedAddresses} />
      {addresses.length ? (
        <View style={[styles.savedAddressList, responsive.isCompact && styles.savedAddressListCompact]}>
          {addresses.map((address, index) => (
            <View
              key={address.id}
              style={[
                styles.savedAddressRow,
                responsive.isCompact && styles.savedAddressRowCompact,
                index === addresses.length - 1 && styles.savedAddressRowLast
              ]}
            >
              <View style={[styles.savedAddressIcon, responsive.isCompact && styles.savedAddressIconCompact]}>
                <Ionicons name={address.type === 'home' ? 'home' : address.type === 'work' ? 'briefcase' : 'location'} size={responsive.isCompact ? 16 : 18} color={colors.customer} />
              </View>
              <View style={styles.flex}>
                <Text style={[styles.savedAddressTitle, responsive.isCompact && styles.savedAddressTitleCompact]}>{address.label}</Text>
                <Text style={[styles.savedAddressSubtitle, responsive.isCompact && styles.savedAddressSubtitleCompact]}>{address.addressLine || address.address}</Text>
                <Text style={[styles.savedAddressMeta, responsive.isCompact && styles.savedAddressMetaCompact]} numberOfLines={1}>{address.address}</Text>
              </View>
              <Pressable
                style={[styles.savedAddressDeleteButton, responsive.isCompact && styles.savedAddressDeleteButtonCompact]}
                disabled={busy}
                onPress={() => onDeleteAddress(address.id)}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={`Delete ${address.label}`}
                accessibilityState={{ disabled: busy }}
              >
                <Ionicons name="trash-outline" size={17} color={colors.red} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : (
        <View style={[styles.savedAddressEmpty, responsive.isCompact && styles.savedAddressEmptyCompact]}>
          <Ionicons name="bookmark-outline" size={responsive.isCompact ? 21 : 24} color={colors.muted} />
          <Text style={[styles.savedAddressEmptyTitle, responsive.isCompact && styles.savedAddressEmptyTitleCompact]}>{copy.noSavedAddresses}</Text>
          <Text style={[styles.mutedSmall, responsive.isCompact && styles.mutedSmallCompact]}>{copy.savePickupDropAddresses}</Text>
        </View>
      )}
    </View>
  );
}

function LanguagePanel({
  selected,
  onSelect
}: {
  selected: AppLanguage;
  onSelect: (language: AppLanguage) => void;
}) {
  const copy = useCopy();
  const responsive = useResponsiveLayout();
  return (
    <View style={[styles.accountPanel, responsive.isCompact && styles.accountPanelCompact]}>
      {languageOptions.map((option) => {
        const active = selected === option.id;
        return (
          <Pressable
            key={option.id}
            style={[
              styles.languageOption,
              responsive.isCompact && styles.languageOptionCompact,
              active && styles.languageOptionActive
            ]}
            onPress={() => onSelect(option.id)}
          >
            <View style={styles.flex}>
              <Text style={[styles.languageTitle, responsive.isCompact && styles.languageTitleCompact]}>{option.id === 'hi' ? copy.languageHindi : copy.languageEnglish}</Text>
              <Text style={[styles.languageSubtitle, responsive.isCompact && styles.languageSubtitleCompact]}>{languageNativeLabel(option.id)}</Text>
            </View>
            <Ionicons name={active ? 'radio-button-on' : 'radio-button-off'} size={responsive.isCompact ? 16 : 18} color={colors.customer} />
          </Pressable>
        );
      })}
    </View>
  );
}

function SupportPanel() {
  const copy = useCopy();
  const responsive = useResponsiveLayout();
  const supportActions: Array<{
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle: string;
    action: () => void;
  }> = [
    {
      icon: 'mail-outline',
      title: copy.emailSupport,
      subtitle: 'support@indiery.in',
      action: () => Linking.openURL('mailto:support@indiery.in?subject=Indiery%20Customer%20Support')
    },
    {
      icon: 'call-outline',
      title: copy.callSupport,
      subtitle: '+91 90000 00000',
      action: () => Linking.openURL('tel:+919000000000')
    },
    {
      icon: 'document-text-outline',
      title: copy.reportOrderIssue,
      subtitle: copy.reportOrderIssueSubtitle,
      action: () => Linking.openURL('mailto:support@indiery.in?subject=Order%20Issue')
    }
  ];

  return (
    <View style={[styles.accountPanel, responsive.isCompact && styles.accountPanelCompact]}>
      {supportActions.map((item) => (
        <Pressable key={item.title} style={[styles.supportActionRow, responsive.isCompact && styles.supportActionRowCompact]} onPress={item.action}>
          <View style={[styles.accountMenuIcon, responsive.isCompact && styles.accountMenuIconCompact]}>
            <Ionicons name={item.icon} size={responsive.isCompact ? 16 : 18} color={colors.customer} />
          </View>
          <View style={styles.flex}>
            <Text style={[styles.accountMenuTitle, responsive.isCompact && styles.accountMenuTitleCompact]}>{item.title}</Text>
            <Text style={[styles.accountMenuSubtitle, responsive.isCompact && styles.accountMenuSubtitleCompact]}>{item.subtitle}</Text>
          </View>
          <Ionicons name="open-outline" size={responsive.isCompact ? 15 : 17} color={colors.muted} />
        </Pressable>
      ))}
    </View>
  );
}

function AccountMenuRow({
  icon,
  title,
  subtitle,
  onPress,
  last
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress?: () => void;
  last?: boolean;
}) {
  const responsive = useResponsiveLayout();
  return (
    <Pressable
      style={[
        styles.accountMenuRow,
        responsive.isCompact && styles.accountMenuRowCompact,
        last && styles.accountMenuRowLast
      ]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[styles.accountMenuIcon, responsive.isCompact && styles.accountMenuIconCompact]}>
        <Ionicons name={icon} size={responsive.isCompact ? 16 : 18} color={colors.customer} />
      </View>
      <View style={styles.flex}>
        <Text style={[styles.accountMenuTitle, responsive.isCompact && styles.accountMenuTitleCompact]}>{title}</Text>
        <Text style={[styles.accountMenuSubtitle, responsive.isCompact && styles.accountMenuSubtitleCompact]}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={responsive.isCompact ? 15 : 17} color={colors.muted} />
    </Pressable>
  );
}

function PolicyList({ onOpenPolicy }: { onOpenPolicy: (policyId: LegalPolicy['id']) => void }) {
  const copy = useCopy();

  return (
    <View style={styles.policyList}>
      <SectionTitle title={copy.policiesLegal} />
      {legalPolicies.map((policy) => (
        <PolicyCard
          key={policy.id}
          policy={policy}
          onPress={() => onOpenPolicy(policy.id)}
        />
      ))}
    </View>
  );
}

function PolicyCard({
  policy,
  onPress
}: {
  policy: LegalPolicy;
  onPress: () => void;
}) {
  const copy = useCopy();
  const responsive = useResponsiveLayout();
  const icons: Record<LegalPolicy['id'], keyof typeof Ionicons.glyphMap> = {
    privacy: 'lock-closed',
    terms: 'document-text',
    refunds: 'cash'
  };

  return (
    <View style={[styles.policyCard, responsive.isCompact && styles.policyCardCompact]}>
      <Pressable style={[styles.policyHeader, responsive.isCompact && styles.policyHeaderCompact]} onPress={onPress}>
        <View style={[styles.policyIcon, responsive.isCompact && styles.policyIconCompact]}>
          <Ionicons name={icons[policy.id]} size={responsive.isCompact ? 16 : 18} color={colors.customer} />
        </View>
        <View style={styles.flex}>
          <Text style={[styles.cardTitle, responsive.isCompact && styles.cardTitleCompact]}>{policy.title}</Text>
          <Text style={[styles.mutedSmall, responsive.isCompact && styles.mutedSmallCompact]}>{copy.updated} {policy.updatedAt}</Text>
          <Text style={[styles.policySummary, responsive.isCompact && styles.policySummaryCompact]}>{policy.summary}</Text>
        </View>
        <Ionicons name="chevron-forward" size={responsive.isCompact ? 16 : 18} color={colors.muted} />
      </Pressable>
    </View>
  );
}

function AccountPolicyDetail({ policy, onBack }: { policy: LegalPolicy; onBack: () => void }) {
  const copy = useCopy();
  const responsive = useResponsiveLayout();
  return (
    <ScrollView contentContainerStyle={[styles.scroll, responsive.isCompact && styles.scrollCompact]}>
      <AccountDetailHeader title={policy.title} subtitle={`${copy.updated} ${policy.updatedAt}`} onBack={onBack} />
      <View style={[styles.policyDetailHero, responsive.isCompact && styles.policyDetailHeroCompact]}>
        <Ionicons name={policy.id === 'privacy' ? 'lock-closed' : policy.id === 'terms' ? 'document-text' : 'cash'} size={responsive.isCompact ? 21 : 24} color={colors.customer} />
        <Text style={[styles.policyDetailSummary, responsive.isCompact && styles.policyDetailSummaryCompact]}>{policy.summary}</Text>
      </View>
      {policy.sections.map((section) => (
        <View key={section.heading} style={[styles.policyDetailSection, responsive.isCompact && styles.policyDetailSectionCompact]}>
          <Text style={[styles.policyHeading, responsive.isCompact && styles.policyHeadingCompact]}>{section.heading}</Text>
          {section.body.map((line) => (
            <Text key={line} style={[styles.policyText, responsive.isCompact && styles.policyTextCompact]}>{line}</Text>
          ))}
        </View>
      ))}
    </ScrollView>
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
  const copy = useCopy();
  const responsive = useResponsiveLayout();
  const compact = responsive.isCompact;
  const { bottom: bottomInset } = useSafeAreaInsets();
  const tabs: Array<[Tab, keyof typeof Ionicons.glyphMap, string]> = [
    ['home', 'home', copy.homeTab],
    ['orders', 'reader', copy.ordersTab],
    ['wallet', 'wallet', copy.walletTab],
    ['account', 'person', copy.accountTab]
  ];
  return (
    <View style={[
      styles.tabs,
      compact && styles.tabsCompact,
      { height: responsive.tabBarHeight + bottomInset, paddingBottom: bottomInset }
    ]}>
      <View style={[styles.tabsInner, { maxWidth: Math.min(720, responsive.contentMaxWidth) }]}>
        {tabs.map(([key, icon, label]) => {
          const selected = active === key;
          return (
            <Pressable
              key={key}
              style={[styles.tab, compact && styles.tabCompact]}
              onPress={() => onChange(key)}
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected }}
            >
              <View>
                <Ionicons name={icon} size={compact ? 19 : 22} color={selected ? colors.customer : colors.muted} />
                {key === 'orders' && activeOrder ? <View style={styles.tabDot} /> : null}
              </View>
              <Text numberOfLines={2} style={[styles.tabText, compact && styles.tabTextCompact, selected && styles.tabTextActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function PrimaryButton({
  title,
  icon,
  onPress,
  disabled = false,
  loading = false
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const responsive = useResponsiveLayout();
  return (
    <Pressable
      style={[styles.primaryButton, responsive.isCompact && styles.primaryButtonCompact, disabled && { opacity: 0.65 }]}
      onPress={onPress}
      disabled={disabled}
      accessibilityState={{ disabled, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.white} />
      ) : (
        <Ionicons name={icon} size={responsive.isCompact ? 15 : 17} color={colors.white} />
      )}
      <Text style={[styles.primaryButtonText, responsive.isCompact && styles.primaryButtonTextCompact]}>{title}</Text>
    </Pressable>
  );
}

function SecondaryButton({ title, icon, onPress }: { title: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  const responsive = useResponsiveLayout();
  return (
    <Pressable style={[styles.secondaryButton, responsive.isCompact && styles.secondaryButtonCompact]} onPress={onPress}>
      <Ionicons name={icon} size={responsive.isCompact ? 15 : 17} color={colors.ink} />
      <Text style={[styles.secondaryButtonText, responsive.isCompact && styles.secondaryButtonTextCompact]}>{title}</Text>
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
  const responsive = useResponsiveLayout();
  return (
    <View style={[styles.fieldGroup, responsive.isCompact && styles.fieldGroupCompact]}>
      <Text style={[styles.fieldLabel, responsive.isCompact && styles.fieldLabelCompact]}>{label}</Text>
      <TextInput
        value={value}
        editable={editable}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        style={[
          styles.input,
          responsive.isCompact && styles.inputCompact,
          !editable && styles.inputReadonly
        ]}
      />
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  const responsive = useResponsiveLayout();
  return <Text style={[styles.sectionTitle, responsive.isCompact && styles.sectionTitleCompact]}>{title}</Text>;
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

function OrderCard({
  order,
  onPress,
  selected = false,
  compact = false,
  actionTitle,
  actionIcon = 'chevron-forward',
  onActionPress
}: {
  order: Order;
  onPress?: () => void;
  selected?: boolean;
  compact?: boolean;
  actionTitle?: string;
  actionIcon?: keyof typeof Ionicons.glyphMap;
  onActionPress?: () => void;
}) {
  const copy = useCopy();
  const language = useLanguage();
  const responsive = useResponsiveLayout();
  if (compact) {
    const compactContent = (
      <>
        <View style={styles.homeActiveIcon}>
          <Ionicons name="cube" size={18} color={colors.customer} />
        </View>
        <View style={styles.flex}>
          <View style={styles.homeActiveTop}>
            <Text style={styles.homeActiveOrderNo}>{order.orderNo}</Text>
            <Badge label={statusLabel(language, order.status)} />
          </View>
          <Text style={styles.homeActiveRoute} numberOfLines={1}>
            {order.pickup.label} {'->'} {routeStopSummary(order.extraStops) ? `${routeStopSummary(order.extraStops)} -> ` : ''}{order.drop.label}
          </Text>
          <Text style={styles.homeActiveVehicle} numberOfLines={1}>{order.vehicle.shortName}</Text>
        </View>
        <Ionicons name="chevron-forward" size={17} color={colors.muted} />
      </>
    );

    if (onPress) {
      return (
        <Pressable style={[styles.homeActiveCard, selected && styles.orderCardSelected]} onPress={onPress}>
          {compactContent}
        </Pressable>
      );
    }

    return (
      <View style={[styles.homeActiveCard, selected && styles.orderCardSelected]}>
        {compactContent}
      </View>
    );
  }

  const content = (
    <>
      <View style={[styles.orderCardHeader, responsive.isCompact && styles.orderCardHeaderCompact]}>
        <View>
          <Text style={[styles.orderNo, responsive.isCompact && styles.orderNoCompact]}>{order.orderNo}</Text>
          <Text style={[styles.orderCardDate, responsive.isCompact && styles.orderCardDateCompact]}>{formatOrderCardDateTime(order.createdAt)}</Text>
        </View>
        <Badge label={statusLabel(language, order.status)} />
      </View>

      <View style={[styles.orderCardRouteBox, responsive.isCompact && styles.orderCardRouteBoxCompact]}>
        <View style={[styles.route, responsive.isCompact && styles.routeCompact]}>
          <View style={[styles.routeDot, responsive.isCompact && styles.routeDotCompact]} />
          <View style={styles.flex}>
            <Text style={[styles.routeText, responsive.isCompact && styles.routeTextCompact]} numberOfLines={1}>{order.pickup.label}</Text>
            <Text style={[styles.mutedSmall, responsive.isCompact && styles.mutedSmallCompact]}>{copy.pickup}</Text>
          </View>
        </View>
        {order.extraStops?.map((stop, index) => (
          <View key={`${order.id}-stop-${index}`} style={[styles.route, responsive.isCompact && styles.routeCompact]}>
            <View style={[styles.routeDotStop, responsive.isCompact && styles.routeDotCompact]} />
            <View style={styles.flex}>
              <Text style={[styles.routeText, responsive.isCompact && styles.routeTextCompact]} numberOfLines={1}>{stop.label}</Text>
              <Text style={[styles.mutedSmall, responsive.isCompact && styles.mutedSmallCompact]}>{copy.stop} {index + 1}</Text>
            </View>
          </View>
        ))}
        <View style={[styles.route, responsive.isCompact && styles.routeCompact]}>
          <View style={[styles.routeDot, responsive.isCompact && styles.routeDotCompact, styles.routeDotGreen]} />
          <View style={styles.flex}>
            <Text style={[styles.routeText, responsive.isCompact && styles.routeTextCompact]} numberOfLines={1}>{order.drop.label}</Text>
            <Text style={[styles.mutedSmall, responsive.isCompact && styles.mutedSmallCompact]}>{copy.drop}</Text>
          </View>
        </View>
      </View>

      <View style={[styles.orderCardFareRow, responsive.isCompact && styles.orderCardFareRowCompact]}>
        <View style={[styles.orderCardVehicleArt, responsive.isCompact && styles.orderCardVehicleArtCompact]}>
          <VehicleMiniArt vehicle={order.vehicle} />
        </View>
        <View style={styles.orderCardFareCopy}>
          <Text style={[styles.orderCardVehicle, responsive.isCompact && styles.orderCardVehicleCompact]}>{order.vehicle.shortName}</Text>
          <Text style={[styles.mutedSmall, responsive.isCompact && styles.mutedSmallCompact]}>{order.distanceKm} km - {goodsLabel(language, order.goodsType)}</Text>
        </View>
        <Text style={[styles.priceText, responsive.isCompact && styles.priceTextCompact]}>{money(order.fare.total)}</Text>
      </View>
      {actionTitle && onActionPress ? (
        <Pressable
          style={[styles.orderCardActionButton, responsive.isCompact && styles.orderCardActionButtonCompact]}
          onPress={onActionPress}
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel={actionTitle}
        >
          <Ionicons name={actionIcon} size={13} color={colors.white} />
          <Text style={[styles.orderCardActionText, responsive.isCompact && styles.orderCardActionTextCompact]}>{actionTitle}</Text>
        </Pressable>
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable style={[styles.orderCard, responsive.isCompact && styles.orderCardCompact, selected && styles.orderCardSelected]} onPress={onPress}>
        {content}
      </Pressable>
    );
  }

  return (
    <View style={[styles.orderCard, responsive.isCompact && styles.orderCardCompact, selected && styles.orderCardSelected]}>
      {content}
    </View>
  );
}

function Badge({ label }: { label: string }) {
  const responsive = useResponsiveLayout();
  return (
    <View style={[styles.badge, responsive.isCompact && styles.badgeCompact]}>
      <Text style={[styles.badgeText, responsive.isCompact && styles.badgeTextCompact]}>{label}</Text>
    </View>
  );
}

function OrderActionButton({
  title,
  icon,
  tone = 'default',
  onPress,
  disabled = false,
  loading = false
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone?: 'default' | 'primary' | 'danger';
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const responsive = useResponsiveLayout();
  return (
    <Pressable
      style={[
        styles.orderActionButton,
        responsive.isCompact && styles.orderActionButtonCompact,
        tone === 'primary' && styles.orderActionButtonPrimary,
        tone === 'danger' && styles.orderActionButtonDanger,
        disabled && { opacity: 0.65 }
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityState={{ disabled, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={tone === 'primary' ? colors.white : colors.ink} />
      ) : (
        <Ionicons
          name={icon}
          size={responsive.isCompact ? 14 : 16}
          color={tone === 'primary' ? colors.white : tone === 'danger' ? colors.red : colors.ink}
        />
      )}
      <Text
        style={[
          styles.orderActionButtonText,
          responsive.isCompact && styles.orderActionButtonTextCompact,
          tone === 'primary' && styles.orderActionButtonTextPrimary,
          tone === 'danger' && styles.orderActionButtonTextDanger
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

function MapPreview({
  pickup,
  drop,
  extraStops = [],
  eta,
  liveTracking = true,
  partnerLocation
}: {
  pickup: LocationPoint;
  drop: LocationPoint;
  extraStops?: LocationPoint[];
  eta: number;
  liveTracking?: boolean;
  partnerLocation?: Order['partnerLocation'];
}) {
  const copy = useCopy();
  const responsive = useResponsiveLayout();
  const mapHeight = responsive.isSmall ? 158 : responsive.isCompact ? 172 : 218;
  const hasLiveLocation = liveTracking && typeof partnerLocation?.lat === 'number' && typeof partnerLocation?.lng === 'number';
  const stopLabel = routeStopSummary(extraStops);
  const routePoints = [pickup, ...extraStops, drop]
    .map((point, index) => ({
      point,
      index,
      coordinate: hasValidCoordinates(point.lat, point.lng)
        ? { latitude: point.lat as number, longitude: point.lng as number }
        : undefined
    }))
    .filter((item): item is { point: LocationPoint; index: number; coordinate: { latitude: number; longitude: number } } => Boolean(item.coordinate));
  const partnerCoordinate = liveTracking && hasValidCoordinates(partnerLocation?.lat, partnerLocation?.lng)
    ? { latitude: partnerLocation?.lat as number, longitude: partnerLocation?.lng as number }
    : undefined;
  const fitCoordinates = partnerCoordinate ? [...routePoints.map((item) => item.coordinate), partnerCoordinate] : routePoints.map((item) => item.coordinate);
  const firstCoordinate = fitCoordinates[0];
  const canRenderNativeMap = (Platform.OS !== 'android' || Boolean(googleMapsApiKey)) && Boolean(firstCoordinate);
  const initialRegion: Region = {
    latitude: firstCoordinate?.latitude ?? defaultMapCenter.lat,
    longitude: firstCoordinate?.longitude ?? defaultMapCenter.lng,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05
  };
  const mapRef = useRef<React.ElementRef<typeof MapView> | null>(null);
  const mapReadyRef = useRef(false);
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
  const fitKey = fitCoordinates.map((coordinate) => `${coordinate.latitude.toFixed(5)},${coordinate.longitude.toFixed(5)}`).join('|');

  function fitMapToRoute() {
    if (!canRenderNativeMap || !mapReadyRef.current || !mapRef.current || !fitCoordinates.length) return;
    if (fitCoordinates.length === 1) {
      mapRef.current.animateToRegion({ ...initialRegion, ...fitCoordinates[0] }, 250);
      return;
    }
    mapRef.current.fitToCoordinates(fitCoordinates, {
      edgePadding: { top: 58, right: 38, bottom: 58, left: 38 },
      animated: true
    });
  }

  useEffect(() => {
    if (!mapReadyRef.current) return undefined;
    const frame = requestAnimationFrame(fitMapToRoute);
    return () => cancelAnimationFrame(frame);
  }, [canRenderNativeMap, fitKey, mapHeight, mapSize.height, mapSize.width, responsive.width]);

  return (
    <View
      style={[styles.map, responsive.isCompact && styles.mapCompact, { height: mapHeight }]}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setMapSize((current) => (
          Math.abs(current.width - width) < 1 && Math.abs(current.height - height) < 1
            ? current
            : { width, height }
        ));
      }}
    >
      {canRenderNativeMap ? (
        <MapView
          ref={mapRef}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          style={styles.mapNativeView}
          initialRegion={initialRegion}
          rotateEnabled={false}
          pitchEnabled={false}
          toolbarEnabled={false}
          onMapReady={() => {
            mapReadyRef.current = true;
            requestAnimationFrame(fitMapToRoute);
          }}
        >
          {routePoints.length > 1 ? (
            <Polyline
              coordinates={routePoints.map((item) => item.coordinate)}
              strokeColor={colors.customer}
              strokeWidth={4}
            />
          ) : null}
          {routePoints.map((item) => {
            const isPickup = item.index === 0;
            const isDrop = item.index === extraStops.length + 1;
            const pinColor = isPickup ? colors.green : isDrop ? colors.red : colors.amber;
            const label = isPickup ? copy.pickup : isDrop ? copy.drop : `${copy.stop} ${item.index}`;
            return (
              <Marker
                key={`${label}-${item.coordinate.latitude}-${item.coordinate.longitude}`}
                coordinate={item.coordinate}
                title={label}
                description={item.point.label}
                pinColor={pinColor}
              />
            );
          })}
          {liveTracking && partnerCoordinate ? (
            <Marker coordinate={partnerCoordinate} title={copy.liveGps}>
              <View style={styles.mapPartnerMarker}>
                <Ionicons name="bicycle" size={15} color={colors.white} />
              </View>
            </Marker>
          ) : null}
        </MapView>
      ) : (
        <>
          <View style={styles.mapRoad} />
          <View style={[styles.mapRoad, styles.mapRoadTwo]} />
          <View style={styles.mapRoute} />
          <View style={styles.mapPinA} />
          {extraStops.slice(0, 3).map((stop, index) => (
            <View key={`${stop.label}-${index}`} style={[styles.mapStopPin, index === 1 && styles.mapStopPinTwo, index === 2 && styles.mapStopPinThree]}>
              <Text style={styles.mapStopText}>{index + 1}</Text>
            </View>
          ))}
          <View style={styles.mapPinB} />
          {liveTracking ? (
            <>
              <View style={[styles.vehiclePulse, hasLiveLocation && styles.vehiclePulseLive]} />
              <View style={[styles.vehicleMarker, hasLiveLocation && styles.vehicleMarkerLive]}>
                <Ionicons name="bicycle" size={16} color={colors.white} />
              </View>
            </>
          ) : null}
        </>
      )}
      {liveTracking ? (
        <>
          <View style={[styles.etaChip, responsive.isCompact && styles.etaChipCompact]}>
            <Text style={[styles.etaValue, responsive.isCompact && styles.etaValueCompact]}>{eta}</Text>
            <Text style={[styles.etaLabel, responsive.isCompact && styles.etaLabelCompact]}>{copy.min}</Text>
          </View>
          <View style={[styles.liveChip, responsive.isCompact && styles.liveChipCompact]}>
            <View style={[styles.liveDot, hasLiveLocation && styles.liveDotOn]} />
            <Text style={[styles.liveText, responsive.isCompact && styles.liveTextCompact]}>{hasLiveLocation ? copy.liveGps : copy.waitingGps}</Text>
          </View>
        </>
      ) : null}
      <Text style={[styles.mapText, responsive.isCompact && styles.mapTextCompact]} numberOfLines={1}>{pickup.label} {'->'} {stopLabel ? `${stopLabel} -> ` : ''}{drop.label}</Text>
    </View>
  );
}

function Timeline({ items }: { items: Order['timeline'] }) {
  const responsive = useResponsiveLayout();
  return (
    <View style={[styles.card, responsive.isCompact && styles.cardCompact]}>
      {items.map((item) => (
        <View key={item.key} style={[styles.timelineItem, responsive.isCompact && styles.timelineItemCompact]}>
          <View
            style={[
              styles.timelineDot,
              responsive.isCompact && styles.timelineDotCompact,
              item.state === 'done' && styles.timelineDone,
              item.state === 'active' && styles.timelineActive
            ]}
          >
            {item.state === 'done' ? <Ionicons name="checkmark" size={12} color={colors.white} /> : null}
          </View>
          <View style={styles.flex}>
            <Text style={[styles.timelineTitle, responsive.isCompact && styles.timelineTitleCompact]}>{item.title}</Text>
            <Text style={[styles.mutedSmall, responsive.isCompact && styles.mutedSmallCompact]}>{item.note}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function FareCard({ fare }: { fare: FareBreakup }) {
  const responsive = useResponsiveLayout();
  const waitingFare = fare as FareBreakup & {
    waitingCharge?: number;
    billableWaitingMinutes?: number;
    waitingFreeMinutes?: number;
    waitingPerMinute?: number;
  };
  const waitingCharge = waitingFare.waitingCharge ?? 0;
  const hasWaitingPolicy =
    typeof waitingFare.waitingFreeMinutes === 'number' && typeof waitingFare.waitingPerMinute === 'number';
  return (
    <View style={[styles.fareCard, responsive.isCompact && styles.fareCardCompact]}>
      <FareRow label={`Distance charge (${fare.billableKm} billable km)`} value={money(fare.distance)} />
      <FareRow label="Order value" value={money(fare.orderValue)} />
      {waitingCharge > 0 ? (
        <FareRow
          label={`Waiting charge (${waitingFare.billableWaitingMinutes ?? 0} min)`}
          value={`+${money(waitingCharge)}`}
        />
      ) : null}
      <FareRow label="Coins" value={`-${money(fare.coins)}`} />
      {hasWaitingPolicy ? (
        <Text style={[styles.farePolicyText, responsive.isCompact && styles.farePolicyTextCompact]}>
          Waiting: {waitingFare.waitingFreeMinutes} min free, then {money(waitingFare.waitingPerMinute)}/min
        </Text>
      ) : null}
      <View style={styles.divider} />
      <FareRow label="Total" value={money(fare.total)} bold />
    </View>
  );
}

function FareRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  const responsive = useResponsiveLayout();
  return (
    <View style={[styles.between, responsive.isCompact && styles.betweenCompact]}>
      <Text style={[styles.fareLabel, responsive.isCompact && styles.fareLabelCompact, bold && styles.bold, bold && responsive.isCompact && styles.boldCompact]}>{label}</Text>
      <Text style={[styles.fareValue, responsive.isCompact && styles.fareValueCompact, bold && styles.bold, bold && responsive.isCompact && styles.boldCompact]}>{value}</Text>
    </View>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  const responsive = useResponsiveLayout();
  return (
    <View style={[styles.summaryRow, responsive.isCompact && styles.summaryRowCompact]}>
      <Text style={[styles.summaryLabel, responsive.isCompact && styles.summaryLabelCompact]}>{label}</Text>
      <Text style={[styles.summaryValue, responsive.isCompact && styles.summaryValueCompact]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.white },
  loginShell: { flex: 1, backgroundColor: colors.white },
  authKeyboard: { flex: 1 },
  authKeyboardFooter: {
    flexShrink: 0,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 12,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -3 },
    elevation: 8
  },
  androidKeyboardFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 30
  },
  authScrollViewport: { flex: 1 },
  authScroll: { flexGrow: 1, backgroundColor: colors.white },
  authScrollOtp: { paddingBottom: 24 },
  loginPhoneLayout: { flex: 1, backgroundColor: colors.white },
  loginPhoneKeyboardScrollContent: { paddingBottom: 106 },
  loginPhoneFormContent: {
    width: '100%',
    alignSelf: 'center',
    flexGrow: 1,
    backgroundColor: colors.white,
    paddingHorizontal: 22,
    paddingTop: 30,
    paddingBottom: 26
  },
  loginPhoneFormContentKeyboard: { paddingTop: 6, paddingBottom: 6 },
  loginPhoneKeyboardTitle: { fontSize: 22, lineHeight: 26, marginBottom: 4 },
  loginPhoneKeyboardFooter: {
    flexShrink: 0,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 8,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -3 },
    elevation: 8
  },
  loginPhoneKeyboardFooterInner: { width: '100%', alignSelf: 'center' },
  loginPhoneKeyboardConsent: { marginTop: 7, paddingHorizontal: 0 },
  loginProfileLayout: { flex: 1, backgroundColor: colors.white },
  loginProfileFixedHeader: {
    width: '100%',
    alignSelf: 'center',
    flexShrink: 0,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEAF8',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14
  },
  loginProfileFixedHeaderCompact: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10
  },
  loginProfileHeaderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  loginProfileHeaderTopRowCompact: { marginBottom: 8 },
  loginProfileFixedBackButton: { width: 34, height: 34, borderRadius: 11, marginBottom: 0 },
  loginProfileFixedBackButtonCompact: { width: 30, height: 30, borderRadius: 10 },
  loginProfileProgressPill: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 14,
    backgroundColor: colors.customerLight,
    paddingHorizontal: 10
  },
  loginProfileProgressPillCompact: { minHeight: 24, paddingHorizontal: 8 },
  loginProfileProgressText: {
    color: colors.customer,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase'
  },
  loginProfileHeadingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  loginProfileHeadingRowCompact: { gap: 9 },
  loginProfileHeadingCopy: { flex: 1, paddingTop: 1 },
  loginProfileFixedIcon: { width: 42, height: 42, borderRadius: 13, marginBottom: 0 },
  loginProfileFixedIconCompact: { width: 36, height: 36, borderRadius: 11 },
  loginProfileFixedKicker: { fontSize: 9, lineHeight: 11, marginBottom: 3 },
  loginProfileFixedTitle: { fontSize: 23, lineHeight: 27, marginBottom: 3 },
  loginProfileFixedSubtitle: { fontSize: 11, lineHeight: 16, marginBottom: 0 },
  loginProfileFieldsViewport: { flex: 1, backgroundColor: '#F8F7FC' },
  loginProfileFieldsContent: {
    width: '100%',
    alignSelf: 'center',
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24
  },
  loginProfileFieldsContentCompact: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 18
  },
  loginProfileFieldsContentKeyboard: { paddingBottom: 108 },
  loginProfileAndroidKeyboardFooter: { bottom: 16 },
  loginProfileFormCard: {
    borderWidth: 1,
    borderColor: '#E9E5F2',
    borderRadius: 18,
    backgroundColor: colors.white,
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 3,
    shadowColor: '#24134F',
    shadowOpacity: 0.045,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2
  },
  loginProfileFormCardCompact: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingTop: 12
  },
  loginProfileFormTitle: { color: colors.ink, fontSize: 15, fontWeight: '700', marginBottom: 3 },
  loginProfileFormHint: { color: colors.muted, fontSize: 10, fontWeight: '500', lineHeight: 15, marginBottom: 14 },
  loginProfileFieldGroup: { marginBottom: 13 },
  loginProfileFieldGroupCompact: { marginBottom: 10 },
  loginProfileFieldLabel: { fontSize: 10, letterSpacing: 0.35, marginBottom: 6 },
  loginProfileInputShell: {
    minHeight: 52,
    borderRadius: 12,
    borderColor: '#E2DFEA',
    paddingHorizontal: 10,
    gap: 9
  },
  loginProfileInputShellCompact: {
    minHeight: 46,
    borderRadius: 11,
    paddingHorizontal: 8,
    gap: 8
  },
  loginProfileFieldIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: colors.customerLight,
    alignItems: 'center',
    justifyContent: 'center'
  },
  loginProfileFieldIconCompact: { width: 27, height: 27, borderRadius: 8 },
  loginProfileFieldIconReadonly: { backgroundColor: '#ECEEF2' },
  loginProfileInputText: { fontSize: 14, fontWeight: '600' },
  loginProfileInlineAction: { marginTop: 14 },
  loginProfileInlineActionCompact: { marginTop: 11 },
  loginProfilePrivacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 10
  },
  loginProfilePrivacyRowCompact: { marginTop: 8 },
  loginProfilePrivacyText: { color: colors.muted, fontSize: 9, fontWeight: '500' },
  profileSetupScroll: { flexGrow: 1, backgroundColor: colors.white, paddingBottom: 32 },
  authResponsiveFrame: { width: '100%', alignSelf: 'center', flexGrow: 1 },
  loginHero: {
    width: '100%',
    minHeight: 360,
    backgroundColor: '#F1EDFF',
    justifyContent: 'flex-start',
    overflow: 'hidden'
  },
  loginHeroImage: { position: 'absolute', top: 0, left: 0, width: '100%' },
  loginHeroWash: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(255,255,255,0.06)'
  },
  loginBrandPanel: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
    paddingHorizontal: 18,
    paddingTop: 18,
    maxWidth: 160
  },
  loginBrandLogo: { width: 140, height: 43 },
  loginHeroCaption: { color: colors.ink, fontSize: 12, fontWeight: '600', lineHeight: 16, marginTop: 5, maxWidth: 140 },
  profileSetupHero: { minHeight: 190, backgroundColor: colors.customerLight, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 22 },
  profileSetupHeroIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', marginBottom: 13, shadowColor: '#0F172A', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  profileSetupHeroKicker: { color: colors.customer, fontSize: 10, fontWeight: '700', letterSpacing: 1.2, marginBottom: 6 },
  profileSetupHeroTitle: { color: colors.ink, fontSize: 23, fontWeight: '700', textAlign: 'center' },
  profileSetupHeroText: { maxWidth: 300, color: colors.muted, fontSize: 11, fontWeight: '500', lineHeight: 17, textAlign: 'center', marginTop: 5 },
  authForm: {
    flexGrow: 1,
    backgroundColor: colors.white,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 26
  },
  authFormOtp: { paddingTop: 18 },
  authKicker: { color: colors.customer, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', marginBottom: 8 },
  authTitle: { color: colors.ink, fontSize: 32, fontWeight: '700', marginBottom: 6 },
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
  authInputText: { flex: 1, color: colors.ink, fontSize: 16, fontWeight: '600', paddingVertical: 12 },
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
  phoneFieldGroupCompact: { marginBottom: 0 },
  phoneInputShellCompact: { minHeight: 48 },
  countryCode: { color: colors.ink, fontSize: 14, fontWeight: '600', marginLeft: 7 },
  phoneDivider: { width: 1, height: 24, backgroundColor: colors.line, marginHorizontal: 10 },
  phoneInputText: { flex: 1, color: colors.ink, fontSize: 13, fontWeight: '500', paddingVertical: 12 },
  loginConsent: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', columnGap: 4, rowGap: 2, marginTop: 12, marginBottom: 0, paddingHorizontal: 6 },
  loginConsentText: { color: colors.muted, fontSize: 10, fontWeight: '500', lineHeight: 15 },
  loginConsentLink: { color: colors.customer, fontSize: 10, fontWeight: '700', lineHeight: 15, textDecorationLine: 'underline' },
  loginPolicyShell: { flex: 1, backgroundColor: colors.white },
  authPrimaryButton: { width: '100%', minHeight: 50, borderRadius: 8, backgroundColor: colors.customer, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  authPrimaryButtonDisabled: { opacity: 0.45 },
  authPrimaryButtonText: { color: colors.white, fontSize: 14, fontWeight: '600' },
  authDividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 18 },
  authDividerLine: { flex: 1, height: 1, backgroundColor: colors.line },
  loginFeatureRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 6 },
  loginFeatureItem: { flexGrow: 1, flexShrink: 1, flexBasis: 64, minWidth: 60, alignItems: 'center', gap: 4 },
  loginFeatureIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.customerLight, alignItems: 'center', justifyContent: 'center' },
  loginFeatureTitle: { color: colors.ink, fontSize: 9, fontWeight: '600', textAlign: 'center' },
  loginFeatureSubtitle: { color: colors.muted, fontSize: 8, fontWeight: '600', textAlign: 'center' },
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
  authNoticeText: { flex: 1, color: colors.ink, fontSize: 12, fontWeight: '600' },
  loginOtpBackButton: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.faint, alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
  loginOtpIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.customerLight, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  loginProfileTitle: { color: colors.ink, fontSize: 28, fontWeight: '700', marginBottom: 7 },
  loginProfileSubtitle: { color: colors.muted, fontSize: 13, fontWeight: '500', lineHeight: 19, marginBottom: 20 },
  loginOtpTitle: { color: colors.ink, fontSize: 28, fontWeight: '700', marginBottom: 7 },
  loginOtpSubtitle: { color: colors.muted, fontSize: 13, fontWeight: '500', lineHeight: 19 },
  loginOtpDestinationRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3, marginBottom: 24 },
  loginOtpPhone: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  loginOtpChange: { color: colors.customer, fontSize: 12, fontWeight: '700' },
  loginOtpField: { position: 'relative', marginBottom: 13 },
  loginOtpBoxes: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 7 },
  loginOtpBox: { flex: 1, minWidth: 0, maxWidth: 52, height: 54, borderWidth: 1, borderColor: colors.line, borderRadius: 10, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center' },
  loginOtpBoxFilled: { borderColor: '#C4B5FD', backgroundColor: colors.white },
  loginOtpBoxActive: { borderWidth: 1.5, borderColor: colors.customer, backgroundColor: colors.customerLight },
  loginOtpDigit: { color: colors.ink, fontSize: 20, fontWeight: '700' },
  loginOtpHiddenInput: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, width: '100%', height: '100%', opacity: 0, color: 'transparent' },
  loginOtpHintRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 18 },
  loginOtpHint: { flex: 1, color: colors.muted, fontSize: 10, fontWeight: '500', lineHeight: 15 },
  loginResendBlock: { alignItems: 'center', marginTop: 22, gap: 9 },
  loginResendLabel: { color: colors.muted, fontSize: 11, fontWeight: '500' },
  loginResendButton: { minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: '#DDD6FE', borderRadius: 10, backgroundColor: colors.white, paddingHorizontal: 14 },
  loginResendButtonDisabled: { borderColor: colors.line, backgroundColor: colors.faint },
  loginResendText: { color: colors.customer, fontSize: 12, fontWeight: '700' },
  loginResendTextDisabled: { color: colors.muted },
  authFootnote: { color: colors.muted, fontSize: 11, fontWeight: '500', textAlign: 'center', lineHeight: 16, marginTop: 4 },
  loginPanel: { backgroundColor: colors.white, borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 18 },
  brandLogo: { width: '100%', alignItems: 'center', paddingHorizontal: 8 },
  brandLogoImage: { width: '100%', maxWidth: 258, aspectRatio: 258 / 88 },
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
  loginTitle: { color: colors.ink, fontSize: 31, fontWeight: '700', letterSpacing: 6, textAlign: 'center' },
  taglineRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 6 },
  taglineRule: { flex: 1, maxWidth: 50, minWidth: 16, height: 2, borderRadius: 2 },
  tagline: { flexShrink: 1, color: colors.muted, fontSize: 9, fontWeight: '600', letterSpacing: 1, textAlign: 'center' },
  loginSubtitle: { color: colors.muted, fontSize: 14, fontWeight: '500', marginBottom: 22 },
  loginError: { color: colors.red, fontSize: 12, fontWeight: '600', marginBottom: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.white },
  appHeader: {
    backgroundColor: colors.customer,
    paddingTop: 15,
    paddingBottom: 28
  },
  appHeaderCompact: { paddingTop: 10, paddingBottom: 22 },
  appHeaderSmall: { paddingTop: 8, paddingBottom: 20 },
  appHeaderInner: {
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  appHeaderInnerCompact: { paddingHorizontal: 16 },
  appHeaderCopy: { flex: 1, minWidth: 0, paddingRight: 12 },
  eyebrow: { color: '#E9D5FF', fontSize: 11, fontWeight: '700', letterSpacing: 0.35 },
  eyebrowCompact: { fontSize: 9, letterSpacing: 0.25 },
  eyebrowDark: { color: colors.muted, fontSize: 11, fontWeight: '600', letterSpacing: 1, textAlign: 'center' },
  headerTitle: { color: colors.white, fontSize: 23, fontWeight: '800', marginTop: 2 },
  headerTitleCompact: { fontSize: 20, marginTop: 1 },
  headerTitleSmall: { fontSize: 18 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.34)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4C1D95',
    shadowOpacity: 0.18,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2
  },
  avatarCompact: { width: 38, height: 38, borderRadius: 12 },
  avatarText: { color: colors.white, fontWeight: '700' },
  avatarTextCompact: { fontSize: 13 },
  content: { flex: 1, width: '100%', alignSelf: 'center', marginTop: -14, backgroundColor: colors.white, borderTopLeftRadius: 22, borderTopRightRadius: 22, overflow: 'hidden' },
  homeContent: {
    width: '100%',
    alignSelf: 'center',
    marginTop: -20,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    backgroundColor: 'transparent',
    overflow: 'visible'
  },
  otherPageContent: {
    marginTop: -20,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    backgroundColor: 'transparent',
    overflow: 'hidden'
  },
  otherPageCurveSurface: {
    position: 'absolute',
    left: 14,
    right: 14,
    top: 0,
    bottom: 0,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    backgroundColor: colors.white,
    overflow: 'hidden'
  },
  homeShell: { flex: 1, backgroundColor: 'transparent', overflow: 'hidden' },
  homeCurveSurface: {
    position: 'absolute',
    left: 14,
    right: 14,
    top: 0,
    bottom: 0,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    backgroundColor: '#F8FAFC',
    overflow: 'hidden'
  },
  homeMapPattern: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, opacity: 0.55 },
  homePatternRoad: { position: 'absolute', height: 18, borderRadius: 18, backgroundColor: '#E4EAF2' },
  homePatternRoadOne: { left: -56, right: 16, top: 118, transform: [{ rotate: '-31deg' }] },
  homePatternRoadTwo: { left: 98, right: -84, top: 220, transform: [{ rotate: '34deg' }] },
  homePatternRoadThree: { left: -76, right: -24, top: 384, transform: [{ rotate: '18deg' }] },
  homeScroll: { width: '100%', alignSelf: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 28 },
  homeScrollCompact: { paddingTop: 9, paddingBottom: 18 },
  homeLocationCard: {
    minHeight: 72,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    marginHorizontal: 8,
    marginBottom: 18,
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2
  },
  homeLocationCardCompact: { minHeight: 58, borderRadius: 14, gap: 10, paddingHorizontal: 12, marginBottom: 10 },
  homeLocationIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.customerLight, alignItems: 'center', justifyContent: 'center' },
  homeLocationIconCompact: { width: 28, height: 28, borderRadius: 14 },
  homeLocationIconSelected: { backgroundColor: colors.green },
  homeLocationLabel: { color: colors.muted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  homeLocationLabelCompact: { fontSize: 9 },
  homeLocationTitle: { color: colors.ink, fontSize: 14, fontWeight: '600', marginTop: 2 },
  homeLocationTitleCompact: { fontSize: 12, marginTop: 1 },
  homeLocationSubtitle: { color: colors.muted, fontSize: 12, fontWeight: '500', marginTop: 2 },
  pickupSearchShell: { flex: 1, backgroundColor: '#F8FAFC' },
  pickupSearchKeyboard: { flex: 1 },
  pickupSearchContent: { flex: 1, width: '100%', alignSelf: 'center' },
  pickupSearchTopBar: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 10, paddingTop: 6 },
  pickupSearchBackButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  pickupSearchCard: {
    marginHorizontal: 8,
    borderRadius: 12,
    backgroundColor: colors.white,
    paddingHorizontal: 10,
    paddingVertical: 10,
    shadowColor: '#0F172A',
    shadowOpacity: 0.10,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3
  },
  pickupSearchInputShell: { minHeight: 48, borderWidth: 1.5, borderColor: colors.customer, borderRadius: 8, backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12 },
  pickupSearchDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.green },
  pickupSearchInput: { flex: 1, color: colors.ink, fontSize: 14, fontWeight: '600', paddingVertical: 11 },
  pickupSearchMapButton: { alignSelf: 'center', minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 14, paddingHorizontal: 12 },
  pickupSearchMapText: { color: colors.customer, fontSize: 12, fontWeight: '600' },
  pickupSearchCurrentButton: { alignSelf: 'center', minHeight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 12 },
  pickupSearchCurrentText: { color: colors.customer, fontSize: 12, fontWeight: '600' },
  pickupSearchError: { color: colors.red, fontSize: 12, fontWeight: '600', marginHorizontal: 18, marginTop: 8, textAlign: 'center' },
  pickupSearchResults: { flex: 1, marginTop: 10 },
  pickupSearchResultsContent: { paddingHorizontal: 8, paddingBottom: 24 },
  pickupSearchResultItem: { minHeight: 58, borderBottomWidth: 1, borderBottomColor: colors.line, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 10, paddingVertical: 10, backgroundColor: colors.white },
  pickupSearchResultIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.customerLight, alignItems: 'center', justifyContent: 'center' },
  pickupSearchResultTitle: { color: colors.ink, fontSize: 13, fontWeight: '600' },
  pickupSearchResultSubtitle: { color: colors.muted, fontSize: 11, fontWeight: '500', marginTop: 2 },
  homeServiceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  homeServiceGridCompact: { gap: 8 },
  homeServiceCard: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: '46%',
    minWidth: 0,
    minHeight: 142,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    padding: 12,
    justifyContent: 'space-between',
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1
  },
  homeServiceCardCompact: { minHeight: 116, borderRadius: 14, padding: 9 },
  homeServiceCardSmall: { minHeight: 108, padding: 8 },
  homeServiceArt: { height: 76, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  homeServiceArtCompact: { height: 58 },
  homeServiceArtSmall: { height: 53 },
  homeServiceArtHalo: { position: 'absolute', width: 104, height: 58, borderRadius: 29, opacity: 0.95 },
  homeServiceArtHaloCompact: { width: 84, height: 46, borderRadius: 23 },
  homeServiceArtShadow: { position: 'absolute', bottom: 7, width: 64, height: 5, borderRadius: 5, opacity: 0.18 },
  homeServiceArtShadowCompact: { bottom: 4, width: 52, height: 4 },
  homeVehicleImage: { width: 96, height: 70 },
  homeVehicleImageCompact: { width: 78, height: 56 },
  homeVehicleImageSmall: { width: 72, height: 52 },
  homeVehicleImageBike: { width: 92, height: 72 },
  homeVehicleImageBikeCompact: { width: 76, height: 58 },
  homeVehicleImageLoader: { width: 90, height: 66, borderRadius: 10 },
  homeServiceFooter: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  homeServiceTitle: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  homeServiceTitleCompact: { fontSize: 13 },
  homeServiceTitleSmall: { fontSize: 12 },
  homeServiceSubtitle: { color: colors.muted, fontSize: 11, fontWeight: '500', lineHeight: 15, marginTop: 3 },
  homeServiceSubtitleCompact: { fontSize: 10, lineHeight: 13, marginTop: 2 },
  homeAnnouncementHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 10 },
  homeAnnouncementHeaderCompact: { marginTop: 12, marginBottom: 7 },
  homeAnnouncementTitle: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  homeAnnouncementTitleCompact: { fontSize: 11 },
  homeAnnouncementCarousel: { borderRadius: 16, overflow: 'hidden' },
  homeAnnouncementCarouselCompact: { borderRadius: 14 },
  homeAnnouncementCard: {
    minHeight: 72,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13
  },
  homeAnnouncementCardCompact: { minHeight: 58, borderRadius: 14, gap: 10, padding: 10 },
  homeAnnouncementIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  homeAnnouncementIconCompact: { width: 32, height: 32, borderRadius: 11 },
  homeAnnouncementCopy: { color: colors.ink, fontSize: 13, fontWeight: '600' },
  homeAnnouncementCopyCompact: { fontSize: 12 },
  homeAnnouncementMeta: { color: colors.muted, fontSize: 11, fontWeight: '500', marginTop: 3 },
  homeAnnouncementMetaCompact: { fontSize: 10, marginTop: 2 },
  homeDots: { flexDirection: 'row', justifyContent: 'center', gap: 4, marginTop: 8 },
  homeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#CBD5E1' },
  homeDotActive: { width: 18, backgroundColor: colors.ink },
  homeActiveCard: {
    minHeight: 72,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 15,
    backgroundColor: colors.white,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  homeActiveIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.customerLight, alignItems: 'center', justifyContent: 'center' },
  homeActiveTop: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 3 },
  homeActiveOrderNo: { flexShrink: 1, color: colors.ink, fontSize: 12, fontWeight: '600' },
  homeActiveRoute: { color: colors.ink, fontSize: 13, fontWeight: '600', marginBottom: 2 },
  homeActiveVehicle: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  scroll: { width: '100%', maxWidth: 1040, alignSelf: 'center', padding: 16, paddingBottom: 28 },
  scrollCompact: { padding: 12, paddingBottom: 18 },
  ordersScrollViewport: {
    flex: 1,
    marginHorizontal: 14,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    overflow: 'hidden'
  },
  ordersScrollContent: {
    paddingHorizontal: 0
  },
  customerHero: { backgroundColor: colors.white, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.line, gap: 14 },
  heroTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  heroTitle: { color: colors.ink, fontSize: 22, fontWeight: '700', lineHeight: 27, maxWidth: 230 },
  cityPill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, backgroundColor: colors.customerLight, paddingVertical: 6, paddingHorizontal: 9 },
  cityPillText: { color: colors.customer, fontSize: 11, fontWeight: '600' },
  heroCard: { backgroundColor: colors.white, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.line, gap: 12 },
  heroLabel: { fontSize: 11, color: colors.muted, fontWeight: '600', letterSpacing: 1 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.faint, borderRadius: 14, padding: 14 },
  searchText: { flex: 1, color: colors.muted, fontSize: 14 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
  serviceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  serviceCard: { flexGrow: 1, flexShrink: 1, flexBasis: '46%', minWidth: 0, minHeight: 112, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.white, padding: 14, gap: 6 },
  serviceIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.customerLight, alignItems: 'center', justifyContent: 'center' },
  serviceTitle: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  serviceSubtitle: { color: colors.muted, fontSize: 11, fontWeight: '500', lineHeight: 15 },
  quickActionBand: { flexDirection: 'row', gap: 10, marginTop: 14 },
  quickAction: { flex: 1, minHeight: 46, borderRadius: 14, backgroundColor: colors.customer, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 },
  quickActionText: { color: colors.white, fontSize: 14, fontWeight: '600' },
  quickActionSecondary: { flex: 1, minHeight: 46, borderRadius: 14, backgroundColor: colors.customerLight, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 },
  quickActionSecondaryText: { color: colors.customer, fontSize: 14, fontWeight: '600' },
  rebookCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.white, padding: 14, marginTop: 14 },
  rebookCardCompact: { gap: 10, borderRadius: 13, padding: 10, marginTop: 10 },
  rebookIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.customerLight, alignItems: 'center', justifyContent: 'center' },
  rebookIconCompact: { width: 32, height: 32, borderRadius: 10 },
  cardTitleCompact: { fontSize: 13 },
  mutedSmallCompact: { fontSize: 10, lineHeight: 13 },
  promiseBand: { flexDirection: 'row', gap: 8, marginTop: 14 },
  promiseItem: { flex: 1, minHeight: 42, borderRadius: 12, backgroundColor: colors.partnerLight, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 6 },
  promiseText: { color: colors.green, fontSize: 10, fontWeight: '600', textAlign: 'center' },
  statRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  statCard: { flex: 1, borderRadius: 14, padding: 14 },
  statValue: { fontSize: 20, fontWeight: '600' },
  statLabel: { fontSize: 11, fontWeight: '500', marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.ink, marginTop: 20, marginBottom: 10 },
  sectionTitleCompact: { fontSize: 14, marginTop: 14, marginBottom: 8 },
  ordersHeroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    marginBottom: 14
  },
  ordersHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.white, padding: 16, marginBottom: 2 },
  ordersTitle: { color: colors.ink, fontSize: 22, fontWeight: '700', marginTop: 3 },
  ordersHeroSubtitle: { color: colors.muted, fontSize: 12, fontWeight: '600', marginTop: 4 },
  ordersBookButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.customer, alignItems: 'center', justifyContent: 'center' },
  liveOrderPanel: {
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 18,
    backgroundColor: colors.white,
    padding: 14,
    marginBottom: 14,
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2
  },
  liveOrderPanelCompact: { borderRadius: 15, padding: 10, marginBottom: 10 },
  liveOrderHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 11, marginBottom: 12 },
  liveOrderHeaderCompact: { gap: 8, marginBottom: 8 },
  liveOrderIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.customer, alignItems: 'center', justifyContent: 'center' },
  liveOrderIconCompact: { width: 34, height: 34, borderRadius: 11 },
  liveOrderTitle: { color: colors.ink, fontSize: 16, fontWeight: '600' },
  liveOrderTitleCompact: { fontSize: 14 },
  liveOrderNo: { color: colors.muted, fontSize: 11, fontWeight: '600', marginTop: 2 },
  liveOrderNoCompact: { fontSize: 10, marginTop: 1 },
  orderDetailHeaderActions: { maxWidth: '100%', marginLeft: 'auto', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: 7 },
  orderDetailClose: { width: 30, height: 30, borderRadius: 10, backgroundColor: colors.faint, alignItems: 'center', justifyContent: 'center' },
  orderDetailCloseCompact: { width: 27, height: 27, borderRadius: 9 },
  liveRouteCard: { borderRadius: 15, backgroundColor: '#F8FAFC', padding: 12, marginBottom: 12 },
  liveRouteCardCompact: { borderRadius: 12, padding: 8, marginBottom: 8 },
  liveRouteLine: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  liveRouteLineCompact: { gap: 8, paddingVertical: 4 },
  liveRouteDot: { width: 10, height: 10, borderRadius: 5 },
  liveRouteDotCompact: { width: 8, height: 8, borderRadius: 4 },
  liveRoutePickupDot: { backgroundColor: colors.customer },
  liveRouteStopDot: { backgroundColor: colors.amber },
  liveRouteDropDot: { backgroundColor: colors.green },
  liveRouteLabel: { color: colors.muted, fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  liveRouteLabelCompact: { fontSize: 9 },
  liveRouteText: { color: colors.ink, fontSize: 13, fontWeight: '600', marginTop: 2 },
  liveRouteTextCompact: { fontSize: 12, marginTop: 1 },
  liveOrderMetrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  liveOrderMetricsCompact: { gap: 6, marginBottom: 8 },
  liveOrderMetric: { flexGrow: 1, flexShrink: 1, flexBasis: '29%', minWidth: 0, borderRadius: 13, backgroundColor: '#F8FAFC', padding: 10 },
  liveOrderMetricCompact: { borderRadius: 11, padding: 8 },
  liveOrderMetricValue: { color: colors.ink, fontSize: 13, fontWeight: '600' },
  liveOrderMetricValueCompact: { fontSize: 12 },
  liveOrderMetricLabel: { color: colors.muted, fontSize: 10, fontWeight: '600', marginTop: 3 },
  liveOrderMetricLabelCompact: { fontSize: 9, marginTop: 2 },
  activeOrderCard: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 14, backgroundColor: colors.white, marginBottom: 12 },
  countdownCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.customerLight, borderRadius: 14, padding: 12, marginTop: 2, marginBottom: 10 },
  countdownCardCompact: { gap: 8, borderRadius: 12, padding: 9, marginTop: 1, marginBottom: 8 },
  countdownCardDelayed: { backgroundColor: '#FEF2F2' },
  countdownValue: { color: colors.customer, fontSize: 22, fontWeight: '700' },
  countdownValueCompact: { fontSize: 14, lineHeight: 18 },
  countdownValueDelayed: { color: colors.red, fontSize: 16 },
  countdownLabel: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  assignedPartnerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, backgroundColor: '#F8FAFC', padding: 12, marginTop: 4 },
  assignedPartnerRowCompact: { gap: 9, borderRadius: 12, padding: 9, marginTop: 2 },
  searchingPartnerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, backgroundColor: '#F8FAFC', padding: 12, marginTop: 4 },
  searchingPartnerRowCompact: { gap: 7, borderRadius: 12, padding: 9, marginTop: 2 },
  searchingPartnerText: { color: colors.ink, fontSize: 12, fontWeight: '600' },
  searchingPartnerTextCompact: { fontSize: 11 },
  compactOtpRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  compactOtpBox: { flexGrow: 1, flexShrink: 1, flexBasis: '46%', minWidth: 0, backgroundColor: colors.customerLight, borderRadius: 14, padding: 11, alignItems: 'center' },
  compactOtpBoxDense: { borderRadius: 11, padding: 8 },
  compactOtpText: { color: colors.customer, fontSize: 18, fontWeight: '700', marginTop: 2 },
  compactOtpTextDense: { fontSize: 15, marginTop: 1 },
  ordersOtpPanel: { borderRadius: 14, backgroundColor: colors.customerLight, padding: 12, marginTop: 12 },
  ordersOtpPanelCompact: { borderRadius: 12, padding: 9, marginTop: 8 },
  ordersOtpTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  ordersOtpTitle: { color: colors.customer, fontSize: 13, fontWeight: '600' },
  ordersOtpTitleCompact: { fontSize: 11 },
  ordersOtpRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  orderActionBar: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  orderActionBarCompact: { gap: 6, marginTop: 8 },
  orderActionButton: { flexGrow: 1, flexShrink: 1, flexBasis: '29%', minWidth: 0, minHeight: 40, borderRadius: 13, backgroundColor: colors.faint, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 8 },
  orderActionButtonCompact: { minHeight: 34, borderRadius: 11, gap: 5, paddingHorizontal: 7 },
  orderActionButtonPrimary: { backgroundColor: colors.customer },
  orderActionButtonDanger: { backgroundColor: '#FEF2F2' },
  orderActionButtonText: { flexShrink: 1, color: colors.ink, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  orderActionButtonTextCompact: { fontSize: 10 },
  orderActionButtonTextPrimary: { color: colors.white },
  orderActionButtonTextDanger: { color: colors.red },
  timelinePanel: { marginBottom: 4 },
  timelinePanelCompact: { marginBottom: 2 },
  timelinePanelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  noActiveOrderCard: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.white, padding: 18, alignItems: 'center', gap: 8 },
  noActiveOrderCardCompact: { borderRadius: 14, padding: 13, gap: 6 },
  historyHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  historyHeaderCompact: { gap: 6 },
  orderHistoryFilterButton: { minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: colors.customer, borderRadius: 10, backgroundColor: colors.white, paddingHorizontal: 10, paddingVertical: 5 },
  orderHistoryFilterButtonActive: { backgroundColor: colors.customer },
  orderHistoryFilterButtonText: { color: colors.customer, fontSize: 12, fontWeight: '700' },
  orderHistoryFilterButtonTextActive: { color: colors.white },
  orderHistoryFilterBadge: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  orderHistoryFilterBadgeText: { color: colors.customer, fontSize: 9, fontWeight: '700' },
  orderHistoryFilterSheet: { gap: 4 },
  orderHistoryFilterGroup: { marginTop: 8, gap: 9 },
  orderHistoryFilterGroupTitle: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  orderHistoryFilterOptionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  orderHistorySheetOption: { flexGrow: 1, flexShrink: 1, flexBasis: '30%', minWidth: 92, minHeight: 54, borderWidth: 1, borderColor: colors.line, borderRadius: 13, backgroundColor: colors.white, paddingHorizontal: 11, paddingVertical: 9, justifyContent: 'center' },
  orderHistorySheetOptionActive: { borderColor: colors.customer, backgroundColor: colors.customerLight },
  orderHistorySheetOptionText: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  orderHistorySheetOptionTextActive: { color: colors.customer, fontWeight: '700' },
  orderHistorySheetOptionCount: { color: colors.muted, fontSize: 10, fontWeight: '600', marginTop: 3 },
  orderHistorySheetOptionCountActive: { color: colors.customer },
  orderHistoryFilterSheetActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  orderHistoryClearButton: { minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, backgroundColor: colors.customerLight, paddingHorizontal: 14, marginTop: 8 },
  orderHistoryClearButtonText: { color: colors.customer, fontSize: 12, fontWeight: '600' },
  orderCard: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 14, marginBottom: 12, backgroundColor: colors.white },
  orderCardCompact: { borderRadius: 14, padding: 10, marginBottom: 8 },
  orderCardSelected: { borderColor: colors.customer, backgroundColor: colors.customerLight },
  activeOrderSwitchRow: { gap: 10, paddingBottom: 10 },
  activeOrderSwitchCard: { width: 190, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.white, padding: 12 },
  activeOrderSwitchCardActive: { borderColor: colors.customer, backgroundColor: colors.customerLight },
  activeOrderSwitchTitle: { color: colors.ink, fontSize: 13, fontWeight: '600' },
  activeOrderSwitchTitleActive: { color: colors.customer },
  activeOrderSwitchMeta: { color: colors.muted, fontSize: 11, fontWeight: '500', marginTop: 5 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 8 },
  betweenCompact: { gap: 8, marginBottom: 6 },
  orderNo: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  orderNoCompact: { fontSize: 10 },
  orderCardHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 10 },
  orderCardHeaderCompact: { gap: 7, marginBottom: 7 },
  orderCardDate: { color: colors.ink, fontSize: 14, fontWeight: '600', marginTop: 2 },
  orderCardDateCompact: { fontSize: 12, marginTop: 1 },
  orderCardRouteBox: { borderRadius: 14, backgroundColor: '#F8FAFC', padding: 10, marginBottom: 10 },
  orderCardRouteBoxCompact: { borderRadius: 12, padding: 8, marginBottom: 8 },
  orderCardFareRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 },
  orderCardFareRowCompact: { gap: 8, marginBottom: 5 },
  orderCardVehicleArt: { width: 58, height: 50, borderRadius: 14, backgroundColor: colors.faint, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  orderCardVehicleArtCompact: { width: 48, height: 42, borderRadius: 12 },
  orderCardFareCopy: { flexGrow: 1, flexShrink: 1, minWidth: 0 },
  orderCardVehicle: { color: colors.ink, fontSize: 13, fontWeight: '600' },
  orderCardVehicleCompact: { fontSize: 12 },
  badge: { maxWidth: '100%', flexShrink: 1, backgroundColor: colors.customerLight, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 },
  badgeCompact: { paddingVertical: 3, paddingHorizontal: 8 },
  badgeText: { flexShrink: 1, color: colors.customer, fontSize: 11, fontWeight: '600', textAlign: 'center' },
  badgeTextCompact: { fontSize: 10 },
  route: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  routeCompact: { gap: 8, paddingVertical: 4 },
  routeDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.customer },
  routeDotStop: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.amber },
  routeDotCompact: { width: 8, height: 8, borderRadius: 4 },
  routeDotGreen: { backgroundColor: colors.green },
  routeText: { color: colors.ink, fontSize: 14, fontWeight: '500' },
  routeTextCompact: { fontSize: 12 },
  muted: { color: colors.muted, marginTop: 8, textAlign: 'center' },
  mutedCompact: { fontSize: 12, lineHeight: 17, marginTop: 5 },
  mutedSmall: { color: colors.muted, fontSize: 12 },
  emptyHistoryCard: { borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.white, padding: 18, alignItems: 'center', marginBottom: 12 },
  emptyHistoryCardCompact: { borderRadius: 13, padding: 13, marginBottom: 8 },
  priceText: { color: colors.customer, fontSize: 13, fontWeight: '600' },
  priceTextCompact: { fontSize: 12 },
  bookingScreenKeyboard: { flex: 1, backgroundColor: 'transparent' },
  bookingScreenScroll: {
    flex: 1,
    marginHorizontal: 14,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    overflow: 'hidden'
  },
  bookingCurveScrollContent: { paddingHorizontal: 0 },
  bookingScreenScrollKeyboard: { paddingBottom: 18 },
  bookingKeyboardFooter: {
    flexShrink: 0,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -3 },
    elevation: 8
  },
  bookingKeyboardFooterCompact: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8 },
  bookingKeyboardFooterInner: { width: '100%', alignSelf: 'center' },
  bookingStepHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 10 },
  bookingStepHeaderCompact: { gap: 9, marginBottom: 8 },
  bookingStepBack: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.faint, alignItems: 'center', justifyContent: 'center' },
  bookingStepBackCompact: { width: 33, height: 33, borderRadius: 11 },
  bookingStepTitle: { color: colors.ink, fontSize: 20, fontWeight: '700' },
  bookingStepTitleCompact: { fontSize: 16 },
  bookingStepSubtitle: { color: colors.muted, fontSize: 11, fontWeight: '600', marginTop: 2 },
  bookingStepSubtitleCompact: { fontSize: 9, marginTop: 1 },
  bookingStepCount: { color: colors.customer, fontSize: 12, fontWeight: '600', backgroundColor: colors.customerLight, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 9 },
  bookingStepCountCompact: { fontSize: 10, paddingVertical: 4, paddingHorizontal: 7 },
  bookingProgressTrack: { height: 4, borderRadius: 4, backgroundColor: colors.faint, marginBottom: 16, overflow: 'hidden' },
  bookingProgressTrackCompact: { marginBottom: 11 },
  bookingProgressFill: { height: 4, borderRadius: 4, backgroundColor: colors.customer },
  stepRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  stepDot: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.faint, alignItems: 'center', justifyContent: 'center' },
  stepDotActive: { backgroundColor: colors.customer },
  stepText: { color: colors.muted, fontWeight: '600' },
  stepTextActive: { color: colors.white },
  serviceGridCompact: { gap: 10, marginBottom: 8 },
  serviceOptionCard: { minHeight: 58, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.white, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 11 },
  serviceOptionCardActive: { borderColor: colors.customer, backgroundColor: colors.customerLight },
  serviceOptionTitle: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  vehicleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  vehicleCard: { flexGrow: 1, flexShrink: 1, flexBasis: '46%', minWidth: 0, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 14, gap: 5 },
  vehicleCardActive: { borderColor: colors.customer, backgroundColor: colors.customerLight },
  vehicleCardSuggested: { borderColor: colors.blue, backgroundColor: '#EFF6FF' },
  vehicleCardDisabled: { opacity: 0.55, backgroundColor: colors.faint },
  vehicleCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  vehicleBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 },
  vehicleSuggestedBadge: { backgroundColor: colors.blue, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3 },
  vehicleSuggestedText: { color: colors.white, fontSize: 9, fontWeight: '600' },
  vehicleEta: { color: colors.green, fontSize: 11, fontWeight: '600', backgroundColor: colors.partnerLight, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  vehicleName: { color: colors.ink, fontWeight: '600', fontSize: 14 },
  vehicleNameCompact: { fontSize: 12 },
  vehicleNameDisabled: { color: colors.muted },
  vehiclePriceLine: { color: colors.ink, fontSize: 13, fontWeight: '600' },
  vehiclePriceLineSuggested: { color: colors.blue },
  vehiclePriceLineSelected: { color: colors.customer },
  vehicleSelectedText: { color: colors.customer, fontSize: 11, fontWeight: '600' },
  vehicleUnavailableText: { color: colors.red, fontSize: 11, fontWeight: '600' },
  fieldGroup: { marginBottom: 12 },
  fieldGroupCompact: { marginBottom: 9 },
  fieldLabel: { color: colors.muted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', marginBottom: 6 },
  fieldLabelCompact: { fontSize: 9, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.ink },
  inputCompact: { borderRadius: 10, paddingHorizontal: 11, paddingVertical: 9, fontSize: 13 },
  inputReadonly: { backgroundColor: colors.faint },
  locationFieldGroup: { marginBottom: 14 },
  routeLocationFieldGroup: { marginBottom: 0 },
  locationLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  locationLabelRowCompact: { marginBottom: 4 },
  locationInputShell: { minHeight: 50, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12 },
  locationInputShellCompact: { minHeight: 42, borderRadius: 12, gap: 8, paddingHorizontal: 10 },
  locationInputShellActive: { borderColor: colors.customer, backgroundColor: '#FBFAFF' },
  routeLocationInputShell: { minHeight: 48, borderColor: colors.customer, borderRadius: 12, paddingLeft: 11, paddingRight: 7 },
  routeLocationInputShellCompact: { minHeight: 40, borderRadius: 10, paddingLeft: 9, paddingRight: 6 },
  routeLocationMapButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.faint, alignItems: 'center', justifyContent: 'center' },
  locationInput: { flex: 1, color: colors.ink, fontSize: 15, fontWeight: '600', paddingVertical: 10 },
  locationInputCompact: { fontSize: 12, paddingVertical: 8 },
  locationSelectedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.customerLight, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 8 },
  locationSelectedText: { color: colors.customer, fontSize: 10, fontWeight: '600' },
  locationSuggestionBox: { borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.white, marginTop: 8, overflow: 'hidden' },
  locationSuggestionItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.line },
  locationTypedSuggestionItem: { backgroundColor: colors.customerLight },
  locationTypedSuggestionIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  locationSuggestionTitle: { color: colors.ink, fontSize: 13, fontWeight: '600' },
  locationSuggestionSubtitle: { color: colors.muted, fontSize: 11, fontWeight: '500', marginTop: 2 },
  locationHint: { color: colors.muted, fontSize: 11, fontWeight: '500', marginTop: 7, lineHeight: 15 },
  locationError: { color: colors.red, fontSize: 11, fontWeight: '600', marginTop: 7 },
  mapSelectButton: { alignSelf: 'flex-start', minHeight: 36, borderRadius: 12, backgroundColor: colors.customerLight, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, marginTop: 8 },
  mapSelectText: { color: colors.customer, fontSize: 12, fontWeight: '600' },
  mapPickerShell: { flex: 1, backgroundColor: colors.white, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 16 },
  mapPickerResponsiveScroll: { flex: 1 },
  mapPickerResponsiveContent: { flexGrow: 1, width: '100%', alignSelf: 'center' },
  mapPickerHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  mapPickerClose: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.faint, alignItems: 'center', justifyContent: 'center' },
  mapPickerCloseCompact: { width: 36, height: 36, borderRadius: 12 },
  mapPickerTitle: { color: colors.ink, fontSize: 20, fontWeight: '700' },
  mapPickerSubtitle: { color: colors.muted, fontSize: 12, fontWeight: '500', marginTop: 2 },
  mapPickerSearchShell: { minHeight: 52, borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13 },
  mapPickerSearchInput: { flex: 1, color: colors.ink, fontSize: 14, fontWeight: '600', paddingVertical: 11 },
  mapPickerSuggestionBox: { borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.white, marginTop: 8, overflow: 'hidden', maxHeight: 210 },
  mapPickerCanvas: { flex: 1, minHeight: 300, borderRadius: 18, backgroundColor: '#EAF5EF', overflow: 'hidden', marginTop: 14, marginBottom: 12 },
  mapPickerRealMap: { flex: 1 },
  mapPickerFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24, backgroundColor: '#EFF6FF' },
  mapPickerFallbackText: { color: colors.ink, fontSize: 13, fontWeight: '600', lineHeight: 18, textAlign: 'center' },
  mapPickerPinOverlay: { position: 'absolute', left: '50%', top: '50%', width: 44, height: 44, marginLeft: -22, marginTop: -40, alignItems: 'center', justifyContent: 'center' },
  mapPickerHint: { position: 'absolute', left: 16, right: 16, bottom: 14, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.94)', paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center' },
  mapPickerHintText: { color: colors.ink, fontSize: 12, fontWeight: '600' },
  mapPickerRoad: { position: 'absolute', left: -40, right: -40, top: '48%', height: 26, borderRadius: 20, backgroundColor: '#CAD7E8', transform: [{ rotate: '-16deg' }] },
  mapPickerRoadTwo: { top: '24%', backgroundColor: '#D8E2F0', transform: [{ rotate: '24deg' }] },
  mapPickerRoadThree: { top: '72%', backgroundColor: '#D4E5D9', transform: [{ rotate: '8deg' }] },
  mapPickerBlockOne: { position: 'absolute', left: 24, top: 42, width: 82, height: 58, borderRadius: 12, backgroundColor: '#D1FAE5' },
  mapPickerBlockTwo: { position: 'absolute', right: 28, top: 76, width: 96, height: 68, borderRadius: 12, backgroundColor: '#EDE9FE' },
  mapPickerBlockThree: { position: 'absolute', left: 50, bottom: 42, width: 118, height: 70, borderRadius: 12, backgroundColor: '#FEF3C7' },
  mapPickerPinPulse: { position: 'absolute', left: '50%', top: '50%', width: 72, height: 72, marginLeft: -36, marginTop: -36, borderRadius: 36, backgroundColor: 'rgba(124,58,237,0.14)' },
  mapPickerPin: { position: 'absolute', left: '50%', top: '50%', width: 46, height: 46, marginLeft: -23, marginTop: -39, alignItems: 'center', justifyContent: 'center' },
  mapPickerCenterLineX: { position: 'absolute', left: '50%', top: '50%', width: 1, height: 28, marginTop: -14, backgroundColor: 'rgba(17,24,39,0.16)' },
  mapPickerCenterLineY: { position: 'absolute', left: '50%', top: '50%', height: 1, width: 28, marginLeft: -14, backgroundColor: 'rgba(17,24,39,0.16)' },
  mapPickerSelectedCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.white, padding: 13, marginBottom: 10 },
  mapPickerSelectedTitle: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  mapPickerCoords: { color: colors.muted, fontSize: 11, fontWeight: '600', marginTop: 2 },
  mapPickerControls: { alignItems: 'center', gap: 8, marginBottom: 12 },
  mapPickerControlMiddle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mapPickerControlButton: { width: 42, height: 38, borderRadius: 13, backgroundColor: colors.faint, alignItems: 'center', justifyContent: 'center' },
  mapPickerBottomPanel: { gap: 10, paddingTop: 2 },
  mapPickerCurrentButton: { minHeight: 44, borderRadius: 14, borderWidth: 1, borderColor: '#BFDBFE', backgroundColor: colors.customerLight, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 14 },
  mapPickerCurrentText: { flexShrink: 1, color: colors.customer, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  mapPickerActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
  savedAddressStrip: { marginTop: -4, marginBottom: 12 },
  savedAddressStripTitle: { color: colors.muted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', marginBottom: 8 },
  savedAddressChips: { gap: 10, paddingRight: 16 },
  savedAddressChip: { width: 190, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.white, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 8 },
  savedAddressChipTextWrap: { flex: 1 },
  savedAddressChipTitle: { color: colors.ink, fontSize: 12, fontWeight: '600' },
  savedAddressChipSubtitle: { color: colors.muted, fontSize: 10, fontWeight: '500', marginTop: 2 },
  stopFieldWrap: { marginBottom: 4 },
  addStopButton: { minHeight: 44, borderRadius: 14, borderWidth: 1, borderColor: colors.customer, borderStyle: 'dashed', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 14 },
  addStopText: { color: colors.customer, fontSize: 13, fontWeight: '600' },
  removeStopButton: { alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: -7, marginBottom: 8 },
  removeStopText: { color: colors.red, fontSize: 11, fontWeight: '600' },
  routeEntryCard: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
    backgroundColor: colors.white,
    padding: 14,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2
  },
  routeEntryCardCompact: { borderRadius: 14, padding: 10, marginBottom: 11 },
  routeEntryPickupRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 2 },
  routeEntryPickupRowCompact: { minHeight: 38, gap: 8 },
  routeEntryDropRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 2 },
  routeEntryDropRowCompact: { gap: 8 },
  routeEntryDot: { width: 8, height: 8, borderRadius: 4 },
  routeEntryDotPickup: { backgroundColor: colors.green },
  routeEntryDotDrop: { backgroundColor: colors.red },
  routeEntryDivider: { height: 1, backgroundColor: colors.line, marginLeft: 18, marginVertical: 9 },
  routeEntryDividerCompact: { marginLeft: 15, marginVertical: 7 },
  contactGrid: { marginBottom: 4 },
  contactDetailsCard: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.white, padding: 14, marginBottom: 14 },
  contactHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 },
  contactTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  contactTitle: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  contactSubtitle: { color: colors.muted, fontSize: 11, fontWeight: '500', marginTop: 2 },
  contactSummaryCard: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.white, padding: 14, marginBottom: 12 },
  contactSummaryValue: { color: colors.ink, fontSize: 13, fontWeight: '600', marginBottom: 4 },
  contactSummaryMissing: { color: colors.customer, fontSize: 13, fontWeight: '600', marginBottom: 4 },
  contactSummaryLocation: { color: colors.muted, fontSize: 11, fontWeight: '600', marginBottom: 10 },
  contactPageShell: { flex: 1, backgroundColor: colors.white },
  contactPageKeyboard: { flex: 1 },
  contactPageForm: { flex: 1, backgroundColor: colors.white },
  contactPageFormContent: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 12 },
  contactPageHeader: { marginBottom: 12 },
  contactPageActions: { marginTop: 4 },
  contactPageFooter: { backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.line, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12 },
  contactPageFooterCompact: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 9 },
  contactResponsiveFooterContent: { width: '100%', alignSelf: 'center', gap: 10 },
  contactSheetOverlay: { flex: 1, justifyContent: 'flex-end' },
  contactSheetBackdrop: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(17,24,39,0.42)' },
  contactSheet: { width: '100%', maxWidth: 640, maxHeight: '92%', alignSelf: 'center', backgroundColor: colors.white, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 16, paddingBottom: Platform.OS === 'android' ? 20 : 18 },
  contactSheetScroll: { paddingBottom: 2 },
  contactSheetHandle: { width: 44, height: 4, borderRadius: 4, backgroundColor: colors.line, alignSelf: 'center', marginBottom: 12 },
  contactSheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  contactSheetTitle: { color: colors.ink, fontSize: 20, fontWeight: '700' },
  contactSheetSubtitle: { color: colors.muted, fontSize: 12, fontWeight: '600', marginTop: 2 },
  contactPlaceBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.faint, borderRadius: 14, padding: 12, marginBottom: 12 },
  contactPlaceText: { flex: 1, color: colors.ink, fontSize: 12, fontWeight: '600', lineHeight: 17 },
  contactExactHero: { backgroundColor: colors.white },
  contactExactHeroExpanded: { flex: 1 },
  contactExactCard: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.white, padding: 12, marginBottom: 12 },
  contactExactHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 10 },
  contactExactIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  contactExactTitle: { color: colors.ink, fontSize: 13, fontWeight: '600' },
  contactExactAddress: { color: colors.muted, fontSize: 11, fontWeight: '600', marginTop: 2 },
  contactMapSearchShell: { minHeight: 44, borderWidth: 1, borderColor: colors.line, borderRadius: 13, backgroundColor: colors.faint, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 11, marginBottom: 9 },
  contactMapSearchInput: { flex: 1, color: colors.ink, fontSize: 13, fontWeight: '600', paddingVertical: 9 },
  contactMapSuggestionBox: { borderWidth: 1, borderColor: colors.line, borderRadius: 13, backgroundColor: colors.white, marginBottom: 9, overflow: 'hidden', maxHeight: 145 },
  contactMapCanvas: { height: 178, borderRadius: 15, backgroundColor: '#EAF5EF', overflow: 'hidden', marginBottom: 10 },
  contactMapHeroCanvas: { height: 410, backgroundColor: '#EAF5EF', overflow: 'hidden' },
  contactMapHeroCanvasCompact: { height: 150 },
  contactMapHeroCanvasExpanded: { flex: 1, height: '100%', minHeight: 180 },
  contactMapRealMap: { flex: 1 },
  contactMapHint: { position: 'absolute', left: 12, right: 12, bottom: 10, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.94)', paddingVertical: 7, paddingHorizontal: 10, alignItems: 'center' },
  contactMapHeroHint: { position: 'absolute', left: 70, right: 70, top: 84, borderRadius: 8, backgroundColor: 'rgba(17,24,39,0.88)', paddingVertical: 8, paddingHorizontal: 10, alignItems: 'center' },
  contactMapHeroHintText: { color: colors.white, fontSize: 11, fontWeight: '600' },
  contactMapBackButton: { position: 'absolute', left: 10, top: 16, width: 38, height: 38, borderRadius: 19, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', shadowColor: '#0F172A', shadowOpacity: 0.16, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  contactMapBackButtonCompact: { left: 8, top: 10, width: 34, height: 34, borderRadius: 17 },
  contactMapExpandButton: { position: 'absolute', right: 12, bottom: 16, width: 42, height: 42, borderRadius: 21, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', shadowColor: '#0F172A', shadowOpacity: 0.16, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  contactMapExpandButtonCompact: { right: 9, bottom: 11, width: 36, height: 36, borderRadius: 18 },
  contactMapPickerHint: { left: 60, right: 60, bottom: 68 },
  contactMapTitlePill: { position: 'absolute', left: 60, right: 60, top: 90, minHeight: 31, borderRadius: 5, backgroundColor: 'rgba(17,24,39,0.88)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 15 },
  contactMapTitlePillShort: { top: 12, left: 68, right: 68 },
  contactMapTitlePillCompact: { top: 62 },
  contactMapTitleText: { color: colors.white, fontSize: 11, fontWeight: '600', textAlign: 'center' },
  contactLocationPanel: { borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: colors.white, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, marginTop: -18, shadowColor: '#0F172A', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: -4 }, elevation: 4 },
  contactExactFooter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  contactUseCurrentButton: { flex: 1, minHeight: 40, borderRadius: 12, borderWidth: 1, borderColor: '#BFDBFE', backgroundColor: colors.customerLight, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 10 },
  contactUseCurrentText: { color: colors.customer, fontSize: 11, fontWeight: '600' },
  contactPagePanel: { flex: 1, backgroundColor: colors.white, borderTopLeftRadius: 18, borderTopRightRadius: 18, marginTop: 0, shadowColor: '#0F172A', shadowOpacity: 0.10, shadowRadius: 10, shadowOffset: { width: 0, height: -3 }, elevation: 5 },
  contactPagePanelCompact: { borderTopLeftRadius: 15, borderTopRightRadius: 15 },
  contactPagePanelContent: { paddingHorizontal: 13, paddingTop: 7, paddingBottom: 14 },
  contactAddressHeader: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 8 },
  contactAddressHeaderCompact: { minHeight: 44, gap: 7, marginBottom: 6 },
  contactAddressTitle: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  contactAddressTitleCompact: { fontSize: 12 },
  contactAddressSubtitle: { color: colors.ink, opacity: 0.7, fontSize: 11, fontWeight: '500', marginTop: 3 },
  contactAddressSubtitleCompact: { fontSize: 10, marginTop: 1 },
  contactChangeButton: { minWidth: 64, minHeight: 34, borderRadius: 5, borderWidth: 1, borderColor: '#D8D3C6', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, backgroundColor: colors.white },
  contactChangeButtonCompact: { minWidth: 56, minHeight: 30, paddingHorizontal: 8 },
  contactChangeButtonText: { color: colors.customer, fontSize: 11, fontWeight: '600' },
  contactChangeButtonTextCompact: { fontSize: 10 },
  contactFormField: { marginBottom: 8 },
  contactFormFieldCompact: { marginBottom: 6 },
  contactFormLabel: { color: colors.muted, fontSize: 10, fontWeight: '600', marginBottom: 3 },
  contactFormLabelCompact: { fontSize: 9, marginBottom: 2 },
  contactFormInputShell: { minHeight: 39, borderWidth: 1, borderColor: '#DDE3EC', borderRadius: 6, backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 10 },
  contactFormInputShellCompact: { minHeight: 35, gap: 6, paddingHorizontal: 9 },
  contactFormInput: { flex: 1, color: colors.ink, fontSize: 13, fontWeight: '500', paddingVertical: 8 },
  contactFormInputCompact: { fontSize: 11, paddingVertical: 6 },
  contactMobileCheckRow: { minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 1, marginBottom: 11 },
  contactMobileCheckRowCompact: { minHeight: 29, gap: 7, marginBottom: 8 },
  contactMobileCheckText: { flex: 1, color: colors.ink, fontSize: 11, fontWeight: '600' },
  contactMobileCheckTextCompact: { fontSize: 10 },
  contactSaveAsLabel: { color: colors.muted, fontSize: 11, fontWeight: '600', marginBottom: 8 },
  contactSaveAsLabelCompact: { fontSize: 10, marginBottom: 6 },
  contactTypeRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 12 },
  contactTypeRowCompact: { gap: 7, marginBottom: 8 },
  contactTypeChip: { flexGrow: 1, flexShrink: 1, flexBasis: 82, minHeight: 36, minWidth: 75, borderRadius: 6, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 10 },
  contactTypeChipCompact: { minHeight: 32, minWidth: 68, gap: 5, paddingHorizontal: 8 },
  contactTypeChipActive: { borderColor: '#93C5FD', backgroundColor: colors.customerLight },
  contactTypeChipText: { color: colors.ink, fontSize: 11, fontWeight: '600' },
  contactTypeChipTextCompact: { fontSize: 10 },
  contactTypeChipTextActive: { color: colors.customer },
  contactConfirmButton: { minHeight: 44, borderRadius: 5, backgroundColor: colors.customer, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, marginTop: 2 },
  contactConfirmButtonCompact: { minHeight: 40, paddingHorizontal: 12, marginTop: 0 },
  contactConfirmButtonText: { color: colors.white, fontSize: 13, fontWeight: '600' },
  contactConfirmButtonTextCompact: { fontSize: 12 },
  contactExpandedMapFooter: { flexShrink: 1, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.line, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, gap: 10 },
  contactExpandedLocationRow: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 10 },
  contactExpandedLocationTitle: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  contactExpandedLocationSubtitle: { color: colors.muted, fontSize: 11, fontWeight: '500', lineHeight: 15, marginTop: 2 },
  contactExpandedMapError: { color: colors.red, fontSize: 12, fontWeight: '600' },
  contactExpandedConfirmButton: { minHeight: 50, borderRadius: 14, backgroundColor: colors.customer, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 14 },
  contactExpandedConfirmText: { color: colors.white, fontSize: 14, fontWeight: '700' },
  contactSheetActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginTop: 4 },
  sameAsUserPanel: { borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.faint, padding: 12, marginBottom: 12 },
  sameAsUserTitle: { color: colors.ink, fontSize: 13, fontWeight: '600', marginBottom: 9 },
  sameAsUserActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sameAsUserButton: { flex: 1, minHeight: 38, borderRadius: 12, backgroundColor: colors.customerLight, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 8 },
  sameAsUserButtonAlt: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  sameAsUserButtonText: { color: colors.customer, fontSize: 11, fontWeight: '600' },
  sameAsUserButtonAltText: { color: colors.ink },
  useMyDetailsButton: { alignSelf: 'flex-start', borderRadius: 999, backgroundColor: colors.customerLight, paddingVertical: 7, paddingHorizontal: 10, marginBottom: 8 },
  useMyDetailsText: { color: colors.customer, fontSize: 11, fontWeight: '600' },
  contactDivider: { height: 1, backgroundColor: colors.line, marginTop: 4, marginBottom: 14 },
  contactError: { color: colors.red, fontSize: 12, fontWeight: '600', marginTop: -6, marginBottom: 12 },
  contactFooterError: { color: colors.red, fontSize: 12, fontWeight: '600', marginBottom: 8 },
  addressHelperText: { color: colors.muted, fontSize: 10, fontWeight: '600', marginTop: -6, marginBottom: 10 },
  saveAddressInlineButton: { alignSelf: 'flex-start', minHeight: 34, borderRadius: 12, backgroundColor: colors.customerLight, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, marginBottom: 10 },
  saveAddressInlineText: { color: colors.customer, fontSize: 11, fontWeight: '600' },
  notice: { flexDirection: 'row', gap: 8, backgroundColor: '#FFFBEB', borderRadius: 12, padding: 12, marginBottom: 14 },
  noticeCompact: { gap: 6, borderRadius: 10, padding: 9, marginBottom: 10 },
  noticeText: { flex: 1, color: '#92400E', fontSize: 12, fontWeight: '500' },
  noticeTextCompact: { fontSize: 10, lineHeight: 14 },
  noticeInfo: { flexDirection: 'row', gap: 8, backgroundColor: '#EFF6FF', borderRadius: 12, padding: 12, marginBottom: 14 },
  noticeInfoCompact: { gap: 6, borderRadius: 10, padding: 9, marginBottom: 10 },
  noticeInfoText: { flex: 1, color: colors.blue, fontSize: 12, fontWeight: '600' },
  noticeInfoTextCompact: { fontSize: 10 },
  goodsTypeSelector: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1.5, borderColor: colors.customer, borderRadius: 15, backgroundColor: colors.white, paddingHorizontal: 13, paddingVertical: 10, marginBottom: 14 },
  goodsTypeSelectorCompact: { minHeight: 56, gap: 9, borderRadius: 13, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 10 },
  goodsTypeSelectorIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.customerLight, alignItems: 'center', justifyContent: 'center' },
  goodsTypeSelectorIconCompact: { width: 35, height: 35, borderRadius: 11 },
  goodsTypeSelectorValue: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  goodsTypeSelectorValueCompact: { fontSize: 12 },
  goodsTypeSelectorHint: { color: colors.muted, fontSize: 10, fontWeight: '600', marginTop: 3 },
  goodsTypeSelectorHintCompact: { fontSize: 9, marginTop: 2 },
  goodsTypePickerSheet: {
    height: '88%',
    maxHeight: '88%'
  },
  goodsTypePickerHeading: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  goodsTypePickerScroll: { flex: 1, marginHorizontal: -2 },
  goodsTypePickerContent: { gap: 8, paddingHorizontal: 2, paddingBottom: 10 },
  goodsTypeOption: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.white, paddingHorizontal: 12, paddingVertical: 8 },
  goodsTypeOptionActive: { borderColor: colors.customer, backgroundColor: colors.customerLight },
  goodsTypeOptionIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.customerLight, alignItems: 'center', justifyContent: 'center' },
  goodsTypeOptionIconActive: { backgroundColor: colors.customer },
  goodsTypeOptionText: { flex: 1, color: colors.ink, fontSize: 13, fontWeight: '600' },
  goodsTypeOptionTextActive: { color: colors.customer, fontWeight: '700' },
  goodsTypePickerFooter: { flexShrink: 0, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12, marginTop: 2 },
  goodsTypePickerConfirmRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center' },
  goodsRulesSheet: { maxHeight: '82%' },
  goodsRulesScroll: { gap: 12, paddingBottom: 12 },
  goodsRulesPanel: { borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 12 },
  goodsRulesAllowedPanel: { backgroundColor: colors.partnerLight, borderColor: '#BBF7D0' },
  goodsRulesRestrictedPanel: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  goodsRulesPanelHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 },
  goodsRulesPanelTitle: { color: colors.ink, fontSize: 13, fontWeight: '600' },
  goodsRulesItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 4 },
  goodsRulesBullet: { width: 6, height: 6, borderRadius: 3, marginTop: 6 },
  goodsRulesBulletAllowed: { backgroundColor: colors.green },
  goodsRulesBulletRestricted: { backgroundColor: colors.red },
  goodsRulesItemText: { flex: 1, color: colors.ink, fontSize: 12, fontWeight: '500', lineHeight: 17 },
  routeReviewCard: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.white, padding: 14, marginBottom: 14 },
  routeReviewCardCompact: { borderRadius: 13, padding: 10, marginBottom: 10 },
  routeReviewHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 },
  routeReviewHeaderCompact: { gap: 7, marginBottom: 7 },
  changeRouteButton: { minHeight: 34, borderRadius: 12, backgroundColor: colors.customerLight, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9 },
  changeRouteButtonCompact: { minHeight: 30, borderRadius: 10, gap: 4, paddingHorizontal: 7 },
  changeRouteText: { color: colors.customer, fontSize: 11, fontWeight: '600' },
  changeRouteTextCompact: { fontSize: 10 },
  routeReviewLine: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  routeReviewLineCompact: { gap: 8, paddingVertical: 5 },
  routeReviewDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.customer },
  routeReviewDotDrop: { backgroundColor: colors.green },
  routeReviewTitle: { color: colors.ink, fontSize: 13, fontWeight: '600' },
  routeReviewTitleCompact: { fontSize: 11 },
  vehicleFareCard: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, borderWidth: 1.5, borderColor: colors.customer, borderRadius: 16, backgroundColor: colors.customerLight, padding: 14, marginBottom: 14 },
  vehicleFareCardCompact: { gap: 9, borderRadius: 13, padding: 10, marginBottom: 10 },
  vehicleFareIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  vehicleFareIconCompact: { width: 40, height: 40, borderRadius: 13 },
  vehicleFareCopy: { flex: 1, minWidth: 0 },
  vehicleFareMeta: { color: colors.muted, fontSize: 12, fontWeight: '600', marginTop: 2, marginBottom: 2 },
  vehicleFareMetaCompact: { fontSize: 10, marginTop: 1, marginBottom: 1 },
  vehicleFarePrice: { color: colors.ink, fontSize: 18, fontWeight: '700' },
  vehicleFarePriceCompact: { fontSize: 14 },
  vehicleRoutePanel: { borderWidth: 1, borderColor: colors.line, borderRadius: 18, backgroundColor: colors.white, padding: 14, marginBottom: 14 },
  vehicleRoutePanelCompact: { borderRadius: 14, padding: 10, marginBottom: 10 },
  vehicleRouteActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.line, marginTop: 9, paddingTop: 10 },
  vehicleRouteAction: { flex: 1, minHeight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  vehicleRouteActionText: { color: colors.customer, fontSize: 12, fontWeight: '600' },
  vehicleFareList: { borderRadius: 18, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, overflow: 'hidden', marginBottom: 14 },
  vehicleFareListCompact: { borderRadius: 14, marginBottom: 10 },
  vehicleFareOption: { minHeight: 78, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, padding: 13, borderBottomWidth: 1, borderBottomColor: colors.line },
  vehicleFareOptionCompact: { minHeight: 64, gap: 9, padding: 10 },
  vehicleFareOptionSuggested: { minHeight: 96, backgroundColor: '#EFF6FF', borderWidth: 1.5, borderColor: colors.blue, borderBottomWidth: 1.5, borderBottomColor: colors.blue, borderRadius: 16, margin: 8 },
  vehicleFareOptionSelected: { minHeight: 104, backgroundColor: colors.customerLight, borderWidth: 1.5, borderColor: colors.customer, borderBottomWidth: 1.5, borderBottomColor: colors.customer, borderRadius: 16, margin: 8 },
  vehicleFareOptionDisabled: { opacity: 0.55, backgroundColor: colors.faint },
  vehicleFareOptionIcon: { width: 52, height: 44, borderRadius: 12, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  vehicleFareOptionIconCompact: { width: 45, height: 38, borderRadius: 10 },
  vehicleFareOptionCopy: { flex: 1, minWidth: 0 },
  vehicleFareOptionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' },
  vehicleFareOptionTitle: { color: colors.ink, fontSize: 15, fontWeight: '600' },
  vehicleFareOptionTitleCompact: { fontSize: 12 },
  vehicleFareOptionTitleSuggested: { color: colors.blue },
  vehicleFareOptionTitleSelected: { color: colors.customer },
  vehicleFareOptionMeta: { color: colors.muted, fontSize: 12, fontWeight: '600', marginTop: 3 },
  vehicleFareOptionMetaCompact: { fontSize: 10, marginTop: 2 },
  vehicleFareOptionPriceWrap: { alignItems: 'flex-end', gap: 4 },
  vehicleFareOptionPriceWrapCompact: { gap: 3 },
  vehicleFareOptionPrice: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  vehicleFareOptionPriceCompact: { fontSize: 12 },
  vehicleFareOptionPriceSuggested: { color: colors.blue },
  vehicleFareOptionPriceSelected: { color: colors.customer },
  vehicleNewBadge: { borderRadius: 7, backgroundColor: colors.blue, paddingHorizontal: 6, paddingVertical: 2 },
  vehicleNewBadgeText: { color: colors.white, fontSize: 9, fontWeight: '600' },
  vehicleMiniArt: { width: 50, height: 40, alignItems: 'center', justifyContent: 'center' },
  vehicleMiniShadow: { position: 'absolute', bottom: 2, width: 34, height: 4, borderRadius: 4, opacity: 0.14 },
  vehicleMiniImage: { width: 48, height: 38 },
  vehicleMiniImageBike: { width: 46, height: 39 },
  vehicleMiniImageLoader: { width: 46, height: 34, borderRadius: 8 },
  vehicleMiniImageMuted: { opacity: 0.5 },
  bookingSummaryCard: { borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.white, padding: 14, marginBottom: 14 },
  bookingSummaryCardCompact: { borderRadius: 12, padding: 10, marginBottom: 10 },
  summaryTitle: { color: colors.ink, fontSize: 14, fontWeight: '600', marginBottom: 8 },
  summaryTitleCompact: { fontSize: 12, marginBottom: 6 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 7 },
  summaryRowCompact: { gap: 8, marginBottom: 5 },
  summaryLabel: { flexShrink: 1, color: colors.muted, fontSize: 12, fontWeight: '600' },
  summaryLabelCompact: { fontSize: 10 },
  summaryValue: { flex: 1, minWidth: 0, color: colors.ink, fontSize: 12, fontWeight: '600', textAlign: 'right' },
  summaryValueCompact: { fontSize: 10 },
  payRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 14, marginBottom: 10 },
  payRowCompact: { gap: 8, borderRadius: 12, padding: 10, marginBottom: 8 },
  payRowActive: { backgroundColor: colors.customerLight, borderColor: colors.customer },
  payRowDisabled: { opacity: 0.55, backgroundColor: colors.faint },
  payText: { color: colors.ink, fontWeight: '600' },
  payTextCompact: { fontSize: 12 },
  payTextDisabled: { color: colors.muted },
  map: { height: 218, borderRadius: 16, backgroundColor: '#E5E7EB', overflow: 'hidden', marginBottom: 12 },
  mapCompact: { borderRadius: 13, marginBottom: 8 },
  mapNativeView: { flex: 1 },
  mapRoad: { position: 'absolute', top: 72, left: -20, right: -20, height: 20, backgroundColor: '#DDD6FE', transform: [{ rotate: '-8deg' }] },
  mapRoadTwo: { top: 30, transform: [{ rotate: '12deg' }], opacity: 0.7 },
  mapRoute: { position: 'absolute', left: '20%', right: '20%', top: '48%', height: 4, borderRadius: 2, backgroundColor: colors.customer },
  mapPinA: { position: 'absolute', left: '18%', top: '43%', width: 18, height: 18, borderRadius: 9, backgroundColor: colors.customer },
  mapPinB: { position: 'absolute', right: '18%', top: '43%', width: 18, height: 18, borderRadius: 9, backgroundColor: colors.green },
  mapStopPin: { position: 'absolute', left: '38%', top: '41%', width: 24, height: 24, borderRadius: 12, backgroundColor: colors.amber, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.white },
  mapStopPinTwo: { left: '52%', top: '49%' },
  mapStopPinThree: { left: '66%', top: '38%' },
  mapStopText: { color: colors.white, fontSize: 10, fontWeight: '600' },
  vehiclePulse: { position: 'absolute', left: '50%', top: '40%', width: 42, height: 42, marginLeft: -21, borderRadius: 21, backgroundColor: 'rgba(124,58,237,0.14)' },
  vehiclePulseLive: { backgroundColor: 'rgba(5,150,105,0.16)' },
  vehicleMarker: { position: 'absolute', left: '50%', top: '45%', width: 24, height: 24, marginLeft: -12, borderRadius: 12, backgroundColor: colors.customer, alignItems: 'center', justifyContent: 'center' },
  vehicleMarkerLive: { backgroundColor: colors.green },
  etaChip: { position: 'absolute', right: 12, top: 12, maxWidth: '42%', backgroundColor: colors.white, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center', shadowColor: '#0F172A', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  etaChipCompact: { right: 8, top: 8, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 9 },
  etaValue: { color: colors.customer, fontSize: 20, fontWeight: '700' },
  etaValueCompact: { fontSize: 16 },
  etaLabel: { color: colors.muted, fontSize: 9, fontWeight: '600' },
  etaLabelCompact: { fontSize: 8 },
  liveChip: { position: 'absolute', left: 12, top: 12, maxWidth: '48%', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.white, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 10, shadowColor: '#0F172A', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  liveChipCompact: { left: 8, top: 8, gap: 5, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 8 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.muted },
  liveDotOn: { backgroundColor: colors.green },
  liveText: { flexShrink: 1, color: colors.ink, fontSize: 11, fontWeight: '600' },
  liveTextCompact: { fontSize: 9 },
  mapPartnerMarker: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.green, borderWidth: 3, borderColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  mapText: { position: 'absolute', left: 12, bottom: 12, right: 12, color: colors.ink, fontSize: 12, fontWeight: '600', backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 10, paddingVertical: 7, paddingHorizontal: 10, overflow: 'hidden' },
  mapTextCompact: { left: 8, right: 8, bottom: 8, fontSize: 10, borderRadius: 8, paddingVertical: 5, paddingHorizontal: 8 },
  card: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 14, backgroundColor: colors.white, marginBottom: 12 },
  cardCompact: { borderRadius: 13, padding: 10, marginBottom: 8 },
  cardTitle: { color: colors.ink, fontWeight: '600', fontSize: 15 },
  driverCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 14, backgroundColor: colors.faint, marginBottom: 12 },
  driverAvatar: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.customer, alignItems: 'center', justifyContent: 'center' },
  driverAvatarText: { color: colors.white, fontWeight: '600' },
  rating: { color: '#92400E', fontWeight: '600', backgroundColor: '#FEF3C7', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10 },
  flex: { flex: 1, minWidth: 0 },
  timelineItem: { flexDirection: 'row', gap: 10, paddingVertical: 8 },
  timelineItemCompact: { gap: 8, paddingVertical: 6 },
  timelineDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  timelineDotCompact: { width: 20, height: 20, borderRadius: 10 },
  timelineDone: { backgroundColor: colors.green },
  timelineActive: { backgroundColor: colors.customer },
  timelineTitle: { color: colors.ink, fontSize: 13, fontWeight: '600' },
  timelineTitleCompact: { fontSize: 11 },
  fareCard: { backgroundColor: colors.customerLight, borderRadius: 16, padding: 14, marginBottom: 14 },
  fareCardCompact: { borderRadius: 13, padding: 10, marginBottom: 10 },
  otpCard: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 14, backgroundColor: colors.white, marginBottom: 12 },
  otpBox: { flex: 1, backgroundColor: colors.customerLight, borderRadius: 14, padding: 12, alignItems: 'center' },
  otpText: { color: colors.customer, fontSize: 22, fontWeight: '700', marginTop: 4 },
  fareLabel: { flex: 1, minWidth: 0, color: colors.customer, fontSize: 13 },
  fareLabelCompact: { fontSize: 11 },
  fareValue: { flexShrink: 0, color: colors.customer, fontSize: 13, fontWeight: '500', textAlign: 'right' },
  fareValueCompact: { fontSize: 11 },
  farePolicyText: { color: colors.muted, fontSize: 11, fontWeight: '600', marginTop: 2, marginBottom: 8 },
  farePolicyTextCompact: { fontSize: 9, marginBottom: 6 },
  orderCardActionButton: { minHeight: 32, borderRadius: 8, backgroundColor: colors.customer, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 5, paddingHorizontal: 12, paddingVertical: 6 },
  orderCardActionButtonCompact: { minHeight: 30, marginTop: 3, paddingVertical: 5 },
  orderCardActionText: { color: colors.white, fontSize: 11, fontWeight: '600' },
  orderCardActionTextCompact: { fontSize: 10 },
  bold: { fontWeight: '600', fontSize: 15 },
  boldCompact: { fontSize: 12 },
  divider: { height: 1, backgroundColor: '#C4B5FD', marginVertical: 8 },
  walletCard: { borderRadius: 18, padding: 20, borderWidth: 1, borderColor: colors.line, alignItems: 'center', gap: 10 },
  walletSurface: { borderWidth: 1, borderColor: colors.line, borderRadius: 18, backgroundColor: colors.white, padding: 14, marginBottom: 14, gap: 13 },
  walletHero: { borderRadius: 14, padding: 15, backgroundColor: colors.customer, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: 12 },
  walletHeroText: { color: '#EDE9FE', fontSize: 12, fontWeight: '600', marginTop: 4, lineHeight: 17 },
  walletHeroIcon: { width: 46, height: 46, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  walletBalanceBlock: { marginLeft: 'auto', alignItems: 'flex-end' },
  walletBalance: { color: colors.white, fontSize: 26, fontWeight: '700' },
  walletBalanceLabel: { color: '#EDE9FE', fontSize: 12, fontWeight: '600', marginTop: 2 },
  walletPanel: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.white, padding: 14, marginBottom: 14, gap: 10 },
  walletTopupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  walletSecureBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.partnerLight, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 8 },
  walletSecureText: { color: colors.green, fontSize: 10, fontWeight: '600' },
  walletAmountRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 2 },
  walletAmountChip: { flexGrow: 1, flexShrink: 1, flexBasis: 72, minWidth: 68, minHeight: 40, borderWidth: 1, borderColor: colors.line, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  walletAmountChipActive: { borderColor: colors.customer, backgroundColor: colors.customerLight },
  walletAmountChipText: { color: colors.ink, fontSize: 13, fontWeight: '600' },
  walletAmountChipTextActive: { color: colors.customer },
  walletMethodRow: { minHeight: 42, borderWidth: 1, borderColor: colors.line, borderRadius: 13, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  walletMethodRowActive: { borderColor: colors.customer, backgroundColor: colors.customerLight },
  walletMethodText: { color: colors.ink, fontSize: 13, fontWeight: '600' },
  walletCoinsRow: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  walletCoinsCard: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.white, padding: 14 },
  walletCoinsCardCompact: { borderRadius: 14, padding: 10 },
  walletCoinsHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.line },
  walletCoinsHeaderCompact: { gap: 8, paddingBottom: 10 },
  walletCoinsIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.customerLight, alignItems: 'center', justifyContent: 'center' },
  walletCoinsIconCompact: { width: 34, height: 34, borderRadius: 11 },
  walletCoinsEyebrow: { color: colors.ink, fontSize: 15, fontWeight: '600', textTransform: 'uppercase' },
  walletCoinsEyebrowCompact: { fontSize: 13 },
  walletCoinsCaption: { color: colors.muted, fontSize: 11, fontWeight: '500', lineHeight: 15, marginTop: 2 },
  walletCoinsCaptionCompact: { fontSize: 10, lineHeight: 13, marginTop: 1 },
  walletCoinsBalanceRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 14, paddingVertical: 16 },
  walletCoinsBalanceRowCompact: { gap: 10, paddingVertical: 11 },
  walletCoinsBalanceMain: { flexBasis: 80, flexShrink: 0 },
  walletCoinsBalanceMainCompact: { flexBasis: 68 },
  walletCoinsValue: { color: colors.customer, fontSize: 36, fontWeight: '700', lineHeight: 40 },
  walletCoinsValueCompact: { fontSize: 29, lineHeight: 32 },
  walletCoinsAvailable: { color: colors.muted, fontSize: 11, fontWeight: '600', marginTop: 2 },
  walletCoinsAvailableCompact: { fontSize: 10, marginTop: 1 },
  walletCoinsDiscountBox: { flex: 1, minWidth: 0, minHeight: 58, borderRadius: 14, backgroundColor: colors.partnerLight, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 11, paddingVertical: 9 },
  walletCoinsDiscountBoxCompact: { minHeight: 48, borderRadius: 12, gap: 6, paddingHorizontal: 9, paddingVertical: 7 },
  walletCoinsDiscountValue: { color: colors.green, fontSize: 14, fontWeight: '600' },
  walletCoinsDiscountValueCompact: { fontSize: 12 },
  walletCoinsDiscount: { color: colors.green, fontSize: 10, fontWeight: '600', lineHeight: 14, marginTop: 1 },
  walletCoinsDiscountCompact: { fontSize: 9, lineHeight: 12 },
  walletCouponButton: { minHeight: 44, borderRadius: 14, backgroundColor: colors.customerLight, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 14 },
  walletCouponButtonCompact: { minHeight: 38, borderRadius: 12, gap: 6, paddingHorizontal: 11 },
  walletCouponButtonBusy: { opacity: 0.65 },
  walletCouponText: { color: colors.customer, fontSize: 13, fontWeight: '600' },
  walletCouponTextCompact: { fontSize: 11 },
  walletCouponOverlay: { flex: 1, justifyContent: 'flex-end' },
  walletCouponBackdrop: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(17,24,39,0.42)' },
  walletCouponSheet: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'android' ? 22 : 28
  },
  walletCouponSheetContent: { paddingBottom: Platform.OS === 'android' ? 12 : 0 },
  walletCouponSheetHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 16 },
  walletCouponSheetTitle: { color: colors.ink, fontSize: 18, fontWeight: '700' },
  walletCouponSheetText: { color: colors.muted, fontSize: 12, fontWeight: '500', lineHeight: 17, marginTop: 3 },
  walletCouponInputShell: {
    minHeight: 50,
    borderWidth: 1.5,
    borderColor: colors.customer,
    borderRadius: 13,
    backgroundColor: colors.white,
    justifyContent: 'center',
    paddingHorizontal: 12,
    marginBottom: 10
  },
  walletCouponInput: { color: colors.ink, fontSize: 16, fontWeight: '700', letterSpacing: 1, paddingVertical: 11 },
  walletCouponSuccess: { color: colors.green, fontSize: 12, fontWeight: '600', marginBottom: 12 },
  walletCouponError: { color: colors.red, fontSize: 12, fontWeight: '600', marginBottom: 12 },
  walletCouponActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginTop: 2 },
  walletCouponCancelButton: { flex: 1, minHeight: 46, borderRadius: 14, backgroundColor: colors.faint, alignItems: 'center', justifyContent: 'center' },
  walletCouponCancelText: { color: colors.ink, fontSize: 13, fontWeight: '600' },
  walletCouponApplyButton: { flex: 1, minHeight: 46, borderRadius: 14, backgroundColor: colors.customer, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  walletCouponApplyText: { color: colors.white, fontSize: 13, fontWeight: '700' },
  coinActivityCard: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.white, paddingHorizontal: 14, paddingVertical: 4, marginBottom: 14 },
  coinActivityCardCompact: { borderRadius: 14, paddingHorizontal: 10, paddingVertical: 2, marginBottom: 10 },
  coinActivityRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 10 },
  coinActivityRowCompact: { minHeight: 52, gap: 8 },
  coinActivityRowDivider: { borderBottomWidth: 1, borderBottomColor: colors.line },
  coinActivityIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  coinActivityIconCompact: { width: 34, height: 34, borderRadius: 11 },
  coinActivityIconCredit: { backgroundColor: colors.partnerLight },
  coinActivityIconDebit: { backgroundColor: '#FEF2F2' },
  coinActivityTitle: { color: colors.ink, fontSize: 13, fontWeight: '600' },
  coinActivityTitleCompact: { fontSize: 12 },
  coinActivityDate: { color: colors.muted, fontSize: 11, fontWeight: '500', marginTop: 2 },
  coinActivityDateCompact: { fontSize: 10, marginTop: 1 },
  coinActivityAmount: { fontSize: 14, fontWeight: '600' },
  coinActivityAmountCompact: { fontSize: 12 },
  coinActivityAmountCredit: { color: colors.green },
  coinActivityAmountDebit: { color: colors.red },
  coinActivityBadge: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.amber, alignItems: 'center', justifyContent: 'center' },
  coinActivityBadgeCompact: { width: 17, height: 17, borderRadius: 9 },
  coinPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FEF3C7', borderRadius: 999, paddingVertical: 7, paddingHorizontal: 10 },
  coinPillText: { color: '#92400E', fontSize: 13, fontWeight: '600' },
  walletTxnRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.white, padding: 12, marginBottom: 10 },
  walletTxnIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  walletTxnCredit: { backgroundColor: colors.partnerLight },
  walletTxnDebit: { backgroundColor: '#FEF2F2' },
  walletTxnTitle: { color: colors.ink, fontSize: 13, fontWeight: '600' },
  walletTxnMeta: { color: colors.muted, fontSize: 10, fontWeight: '500', marginTop: 3 },
  walletTxnAmount: { fontSize: 13, fontWeight: '600' },
  walletTxnAmountCredit: { color: colors.green },
  walletTxnAmountDebit: { color: colors.red },
  coinValue: { color: colors.customer, fontSize: 48, fontWeight: '700' },
  listRow: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  listText: { color: colors.ink, fontWeight: '500' },
  accountHero: { position: 'relative', borderRadius: 18, backgroundColor: colors.customer, padding: 16, overflow: 'hidden' },
  accountHeroCompact: { borderRadius: 15, padding: 11 },
  accountHeroTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 },
  accountHeroTopCompact: { gap: 8, marginBottom: 9 },
  accountEyebrow: { color: '#EDE9FE', fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  accountEyebrowCompact: { fontSize: 9 },
  accountIdentityCard: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.94)', padding: 12 },
  accountIdentityCardCompact: { gap: 9, borderRadius: 14, padding: 9 },
  accountAvatar: { width: 58, height: 58, borderRadius: 18, backgroundColor: colors.customer, alignItems: 'center', justifyContent: 'center' },
  accountAvatarCompact: { width: 46, height: 46, borderRadius: 14 },
  accountAvatarSmall: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.customer, alignItems: 'center', justifyContent: 'center' },
  accountAvatarText: { color: colors.white, fontSize: 20, fontWeight: '600' },
  accountAvatarTextCompact: { fontSize: 16 },
  accountName: { color: colors.ink, fontSize: 18, fontWeight: '600' },
  accountNameCompact: { fontSize: 15 },
  accountSubtext: { color: colors.muted, fontSize: 12, fontWeight: '500', marginTop: 2 },
  accountSubtextCompact: { fontSize: 10, marginTop: 1 },
  accountVerifiedBadge: { maxWidth: '100%', flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.partnerLight, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5 },
  accountVerifiedText: { flexShrink: 1, color: colors.green, fontSize: 10, fontWeight: '600' },
  accountEditButton: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.customerLight, alignItems: 'center', justifyContent: 'center' },
  accountEditButtonCompact: { width: 32, height: 32, borderRadius: 11 },
  accountStatsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  accountStatsRowCompact: { gap: 8, marginTop: 10 },
  accountStatBox: { flexGrow: 1, flexShrink: 1, flexBasis: '29%', minWidth: 0, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.white, padding: 12, alignItems: 'center' },
  accountStatBoxCompact: { borderRadius: 12, padding: 9 },
  accountStatValue: { color: colors.customer, fontSize: 20, fontWeight: '700' },
  accountStatValueCompact: { fontSize: 17 },
  accountStatLabel: { color: colors.muted, fontSize: 11, fontWeight: '600', marginTop: 2 },
  accountStatLabelCompact: { fontSize: 10, marginTop: 1 },
  enterpriseCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, backgroundColor: colors.customerLight, padding: 15, marginTop: 14 },
  enterpriseCardCompact: { gap: 9, borderRadius: 14, padding: 11, marginTop: 10 },
  enterpriseIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.customer, alignItems: 'center', justifyContent: 'center' },
  enterpriseIconCompact: { width: 36, height: 36, borderRadius: 12 },
  enterpriseTitle: { color: colors.ink, fontSize: 15, fontWeight: '600' },
  enterpriseTitleCompact: { fontSize: 13 },
  enterpriseText: { color: colors.muted, fontSize: 11, fontWeight: '500', lineHeight: 16, marginTop: 3 },
  enterpriseTextCompact: { fontSize: 10, lineHeight: 13, marginTop: 2 },
  enterprisePageHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  enterprisePageHeaderCompact: { gap: 9, marginBottom: 10 },
  enterprisePageTitle: { color: colors.ink, fontSize: 24, fontWeight: '700', marginTop: 2 },
  enterprisePageTitleCompact: { fontSize: 18, marginTop: 1 },
  enterpriseHeroPanel: { borderRadius: 18, backgroundColor: colors.customer, padding: 18, gap: 9 },
  enterpriseHeroPanelCompact: { borderRadius: 15, padding: 13, gap: 7 },
  enterpriseHeroIcon: { width: 54, height: 54, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  enterpriseHeroIconCompact: { width: 44, height: 44, borderRadius: 14 },
  enterpriseHeroTitle: { color: colors.white, fontSize: 22, fontWeight: '700' },
  enterpriseHeroTitleCompact: { fontSize: 17 },
  enterpriseHeroText: { color: '#EDE9FE', fontSize: 12, fontWeight: '600', lineHeight: 18 },
  enterpriseHeroTextCompact: { fontSize: 10, lineHeight: 14 },
  enterpriseFeatureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  enterpriseFeatureGridCompact: { gap: 8 },
  enterpriseFeatureCard: { flexGrow: 1, flexShrink: 1, flexBasis: '46%', minWidth: 0, minHeight: 138, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.white, padding: 13 },
  enterpriseFeatureCardCompact: { minHeight: 112, borderRadius: 12, padding: 10 },
  enterpriseFeatureIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: colors.customerLight, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  enterpriseFeatureIconCompact: { width: 30, height: 30, borderRadius: 10, marginBottom: 6 },
  enterpriseFeatureTitle: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  enterpriseFeatureTitleCompact: { fontSize: 12 },
  enterpriseFeatureText: { color: colors.muted, fontSize: 11, fontWeight: '500', lineHeight: 16, marginTop: 4 },
  enterpriseFeatureTextCompact: { fontSize: 9, lineHeight: 13, marginTop: 3 },
  enterpriseChipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  enterpriseChipWrapCompact: { gap: 6 },
  enterpriseChip: { borderRadius: 999, backgroundColor: colors.customerLight, paddingVertical: 8, paddingHorizontal: 11 },
  enterpriseChipCompact: { paddingVertical: 6, paddingHorizontal: 9 },
  enterpriseChipText: { color: colors.customer, fontSize: 12, fontWeight: '600' },
  enterpriseChipTextCompact: { fontSize: 10 },
  enterpriseContactCard: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.white, padding: 15, gap: 10, marginTop: 18 },
  enterpriseContactCardCompact: { borderRadius: 13, padding: 11, gap: 8, marginTop: 13 },
  savedAddressList: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.white, overflow: 'hidden' },
  savedAddressListCompact: { borderRadius: 13 },
  savedAddressRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: colors.line },
  savedAddressRowCompact: { gap: 9, padding: 10 },
  savedAddressRowLast: { borderBottomWidth: 0 },
  savedAddressIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.customerLight, alignItems: 'center', justifyContent: 'center' },
  savedAddressIconCompact: { width: 32, height: 32, borderRadius: 10 },
  savedAddressTitle: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  savedAddressTitleCompact: { fontSize: 12 },
  savedAddressSubtitle: { color: colors.muted, fontSize: 12, fontWeight: '600', marginTop: 2 },
  savedAddressSubtitleCompact: { fontSize: 10, marginTop: 1 },
  savedAddressMeta: { color: colors.muted, fontSize: 10, fontWeight: '500', marginTop: 3 },
  savedAddressMetaCompact: { fontSize: 9, marginTop: 2 },
  savedAddressDeleteButton: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' },
  savedAddressDeleteButtonCompact: { width: 31, height: 31, borderRadius: 10 },
  savedAddressEmpty: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.white, padding: 16, alignItems: 'center', gap: 5 },
  savedAddressEmptyCompact: { borderRadius: 13, padding: 12, gap: 4 },
  savedAddressEmptyTitle: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  savedAddressEmptyTitleCompact: { fontSize: 12 },
  accountDetailHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  accountDetailHeaderCompact: { gap: 9, marginBottom: 10 },
  accountDetailTitle: { color: colors.ink, fontSize: 21, fontWeight: '700', marginTop: 2 },
  accountDetailTitleCompact: { fontSize: 17, marginTop: 1 },
  accountDetailSubtitle: { color: colors.muted, fontSize: 12, fontWeight: '600', marginTop: 2 },
  accountDetailSubtitleCompact: { fontSize: 10, marginTop: 1 },
  accountDetailCard: { borderWidth: 1, borderColor: colors.line, borderRadius: 18, backgroundColor: colors.white, padding: 14, marginBottom: 12 },
  accountDetailCardCompact: { borderRadius: 14, padding: 10, marginBottom: 9 },
  accountProfilePreview: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, borderRadius: 16, backgroundColor: colors.customerLight, padding: 12, marginBottom: 14 },
  accountProfilePreviewCompact: { gap: 9, borderRadius: 13, padding: 9, marginBottom: 10 },
  accountAvatarSmallCompact: { width: 40, height: 40, borderRadius: 13 },
  accountVerifiedBadgeCompact: { paddingHorizontal: 6, paddingVertical: 4 },
  accountVerifiedTextCompact: { fontSize: 9 },
  accountInfoStrip: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, backgroundColor: colors.customerLight, padding: 12, marginBottom: 12 },
  accountInfoStripCompact: { gap: 8, borderRadius: 12, padding: 9, marginBottom: 9 },
  accountInfoText: { flex: 1, color: colors.customer, fontSize: 12, fontWeight: '600', lineHeight: 17 },
  accountInfoTextCompact: { fontSize: 10, lineHeight: 14 },
  accountWalletHero: { alignItems: 'center', borderRadius: 22, backgroundColor: colors.customer, padding: 18, marginBottom: 14 },
  accountWalletValue: { color: colors.white, fontSize: 42, fontWeight: '700', marginTop: 10 },
  accountWalletLabel: { color: '#EDE9FE', fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  accountWalletText: { color: '#EDE9FE', fontSize: 12, fontWeight: '600', textAlign: 'center', lineHeight: 17, marginTop: 8 },
  accountBalanceCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.white, padding: 14, marginBottom: 12 },
  accountBalanceValue: { color: colors.ink, fontSize: 22, fontWeight: '700', marginTop: 2 },
  accountMenu: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.white, overflow: 'hidden' },
  accountMenuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: colors.line },
  accountMenuRowCompact: { gap: 9, padding: 10 },
  accountMenuRowLast: { borderBottomWidth: 0 },
  accountMenuIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.customerLight, alignItems: 'center', justifyContent: 'center' },
  accountMenuIconCompact: { width: 31, height: 31, borderRadius: 10 },
  accountMenuTitle: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  accountMenuTitleCompact: { fontSize: 12 },
  accountMenuSubtitle: { color: colors.muted, fontSize: 11, fontWeight: '500', marginTop: 2 },
  accountMenuSubtitleCompact: { fontSize: 10, marginTop: 1 },
  accountPanel: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.white, padding: 10, marginTop: 12 },
  accountPanelCompact: { borderRadius: 13, padding: 7, marginTop: 9 },
  languageOption: { minHeight: 54, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, marginBottom: 6 },
  languageOptionCompact: { minHeight: 45, borderRadius: 11, paddingHorizontal: 9, marginBottom: 4 },
  languageOptionActive: { backgroundColor: colors.customerLight },
  languageTitle: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  languageTitleCompact: { fontSize: 12 },
  languageSubtitle: { color: colors.muted, fontSize: 12, fontWeight: '600', marginTop: 2 },
  languageSubtitleCompact: { fontSize: 10, marginTop: 1 },
  supportActionRow: { minHeight: 58, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10 },
  supportActionRowCompact: { minHeight: 48, borderRadius: 11, gap: 9, padding: 8 },
  accountEditCard: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.white, padding: 14, marginTop: 12 },
  accountEditActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginTop: 4 },
  accountEditActionsCompact: { gap: 8, marginTop: 2 },
  accountEditError: { color: colors.red, fontSize: 12, fontWeight: '600', marginBottom: 10 },
  accountDangerZone: { marginTop: 6 },
  profileHero: { alignItems: 'center', paddingVertical: 18 },
  profileAvatar: { width: 70, height: 70, borderRadius: 22, backgroundColor: colors.customer, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  profileAvatarText: { color: colors.white, fontSize: 24, fontWeight: '600' },
  policyList: { marginTop: 4, marginBottom: 12 },
  policyCard: { borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.white, marginBottom: 10, overflow: 'hidden' },
  policyCardCompact: { borderRadius: 12, marginBottom: 8 },
  policyHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  policyHeaderCompact: { gap: 9, padding: 10 },
  policyIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.customerLight, alignItems: 'center', justifyContent: 'center' },
  policyIconCompact: { width: 31, height: 31, borderRadius: 10 },
  policySummary: { color: colors.ink, fontSize: 12, fontWeight: '500', marginTop: 5, lineHeight: 17 },
  policySummaryCompact: { fontSize: 10, marginTop: 3, lineHeight: 14 },
  policyBody: { borderTopWidth: 1, borderTopColor: colors.line, paddingHorizontal: 14, paddingBottom: 12, backgroundColor: '#FAFAFE' },
  policySection: { marginTop: 12 },
  policyDetailHero: { borderWidth: 1, borderColor: colors.line, borderRadius: 18, backgroundColor: colors.white, padding: 15, marginBottom: 12, gap: 8 },
  policyDetailHeroCompact: { borderRadius: 14, padding: 11, marginBottom: 9, gap: 6 },
  policyDetailSummary: { color: colors.ink, fontSize: 13, fontWeight: '600', lineHeight: 19 },
  policyDetailSummaryCompact: { fontSize: 11, lineHeight: 16 },
  policyDetailSection: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.white, padding: 14, marginBottom: 10 },
  policyDetailSectionCompact: { borderRadius: 13, padding: 10, marginBottom: 8 },
  policyHeading: { color: colors.customer, fontSize: 13, fontWeight: '600', marginBottom: 4 },
  policyHeadingCompact: { fontSize: 11, marginBottom: 3 },
  policyText: { color: colors.muted, fontSize: 12, lineHeight: 18, marginBottom: 4 },
  policyTextCompact: { fontSize: 10, lineHeight: 15, marginBottom: 3 },
  tabs: { height: 68, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.white },
  tabsCompact: { height: 62 },
  tabsInner: { flex: 1, width: '100%', alignSelf: 'center', flexDirection: 'row' },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  tabCompact: { gap: 2 },
  tabText: { color: colors.muted, fontSize: 11, fontWeight: '500', textAlign: 'center' },
  tabTextCompact: { fontSize: 10 },
  tabTextActive: { color: colors.customer },
  tabDot: { position: 'absolute', right: -3, top: -3, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.red },
  primaryButton: { flex: 1, minWidth: 0, minHeight: 46, borderRadius: 14, backgroundColor: colors.customer, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, paddingHorizontal: 12 },
  primaryButtonCompact: { minHeight: 40, borderRadius: 12, gap: 5, paddingHorizontal: 10 },
  primaryButtonText: { flexShrink: 1, color: colors.white, fontWeight: '600', textAlign: 'center' },
  primaryButtonTextCompact: { fontSize: 12 },
  secondaryButton: { flex: 1, minWidth: 0, minHeight: 46, borderRadius: 14, backgroundColor: colors.faint, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, paddingHorizontal: 12 },
  secondaryButtonCompact: { minHeight: 40, borderRadius: 12, gap: 5, paddingHorizontal: 10 },
  secondaryButtonText: { flexShrink: 1, color: colors.ink, fontWeight: '600', textAlign: 'center' },
  secondaryButtonTextCompact: { fontSize: 12 },
  deleteAccountButton: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: '#FECACA', backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 6, marginBottom: 10 },
  deleteAccountButtonText: { color: colors.red, fontWeight: '600' },
  logoutButton: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 6, marginBottom: 12 },
  logoutButtonText: { color: colors.ink, fontWeight: '600' },
  toast: { position: 'absolute', bottom: 88, maxWidth: 560, backgroundColor: colors.ink, borderRadius: 14, padding: 14 },
  toastText: { color: colors.white, fontWeight: '600' },
  empty: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyTitle: { color: colors.ink, fontSize: 18, fontWeight: '600' },
  emptyTitleCompact: { fontSize: 15 },
  errorTitle: { color: colors.red, fontSize: 18, fontWeight: '600', marginBottom: 6 }
});
