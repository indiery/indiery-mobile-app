import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  StatusBar,
  Text,
  TextInput,
  View
} from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import RazorpayCheckout from 'react-native-razorpay';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { io, Socket } from 'socket.io-client';
import { Ionicons } from '@expo/vector-icons';
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
const androidStatusBarHeight =
  Platform.OS === 'android' ? Math.max(StatusBar.currentHeight ?? 0, Constants.statusBarHeight ?? 0) : 0;
const expoProjectId = (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false
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

const presetGoodsOptions = ['Documents', 'Groceries', 'Electronics', 'Furniture', 'Business stock', 'Household items'];
const goodsOptions = [...presetGoodsOptions, 'Other'];
const allowedGoodsItems = [
  'Documents',
  'Groceries and packed food',
  'Electronics and accessories',
  'Furniture and household items',
  'Business stock',
  'Clothes and personal items',
  'Books and stationery',
  'Packed tools and hardware'
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
  cancel: 'Cancel',
  save: 'Save',
  saving: 'Saving',
  later: 'Later',
  refresh: 'Refresh',
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
  weightKg: 'Weight kg',
  restrictedGoods: 'Restricted goods, hazardous items, and illegal materials are not allowed.',
  other: 'Other',
  describeGoods: 'Describe goods',
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
  fareBeforeTax: 'Fare',
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
  noPastOrders: 'No past orders',
  completedCancelledAppear: 'Completed and cancelled deliveries will appear here.',
  pickupOtp: 'Pickup OTP',
  dropOtp: 'Drop OTP',
  deliveryOtp: 'Delivery OTP',
  liveGps: 'Live GPS',
  waitingGps: 'Waiting for driver GPS',
  min: 'MIN',
  indieryCoins: 'INDIERY COINS',
  useCoinsDiscount: 'Use coins as discount on bookings.',
  applying: 'Applying',
  applyFirst50: 'Apply FIRST50',
  coinRules: 'Coin Rules',
  coinRuleEarn: 'Earn coins for successful deliveries',
  coinRuleUse: 'Use coins on fare before GST',
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
  enterprisesText: 'Bulk orders, recurring routes, GST invoices, and dedicated logistics support.',
  savedAddresses: 'Saved Addresses',
  noSavedAddresses: 'No saved addresses',
  savePickupDropAddresses: 'Save pickup or drop addresses while booking.',
  account: 'Account',
  accountSubtitle: 'Profile, saved addresses, wallet, and support',
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
  gstInvoices: 'GST invoices',
  gstInvoicesText: 'Cleaner billing records for monthly logistics and accounting.',
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
  mapSearchPlaceholder: 'Search area, building, or landmark',
  searchPlacePin: 'Search or place the pin accurately',
  dragMapPin: 'Drag map or pin to adjust',
  useCurrentLocation: 'Use current location',
  confirmLocation: 'Confirm location',
  selected: 'Selected',
  selectOnMap: 'Select on map',
  useTypedLocation: 'Use typed location',
  locationHint: 'Select a suggestion for accurate fare and tracking, or continue with typed text.'
} as const;

const hiCopy: Partial<Record<keyof typeof enCopy, string>> = {
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
  noPastOrders: 'कोई पिछला ऑर्डर नहीं',
  completedCancelledAppear: 'पूरी और रद्द डिलीवरी यहां दिखेंगी.',
  pickupOtp: 'पिकअप OTP',
  dropOtp: 'ड्रॉप OTP',
  deliveryOtp: 'डिलीवरी OTP',
  liveGps: 'लाइव GPS',
  waitingGps: 'ड्राइवर GPS का इंतजार',
  min: 'मिनट',
  indieryCoins: 'INDIERY कॉइन',
  useCoinsDiscount: 'बुकिंग पर छूट के लिए कॉइन उपयोग करें.',
  applying: 'अप्लाई हो रहा है',
  applyFirst50: 'FIRST50 लगाएं',
  coinRules: 'कॉइन नियम',
  coinRuleEarn: 'सफल डिलीवरी पर कॉइन कमाएं',
  coinRuleUse: 'GST से पहले किराए पर कॉइन उपयोग करें',
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
  enterprisesText: 'बल्क ऑर्डर, रेकरिंग रूट, GST इनवॉइस और डेडिकेटेड लॉजिस्टिक्स सपोर्ट.',
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
  gstInvoices: 'GST इनवॉइस',
  gstInvoicesText: 'मासिक लॉजिस्टिक्स और अकाउंटिंग के लिए साफ बिलिंग रिकॉर्ड.',
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
  mapSearchPlaceholder: 'एरिया, बिल्डिंग या लैंडमार्क खोजें',
  searchPlacePin: 'सर्च करें या पिन सही जगह रखें',
  dragMapPin: 'मैप या पिन खींचकर एडजस्ट करें',
  useCurrentLocation: 'करंट लोकेशन उपयोग करें',
  confirmLocation: 'लोकेशन कन्फर्म करें',
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
    Other: 'other'
  };
  const key = labels[item];
  return key ? copyFor(language, key) : item;
}

function isPresetGoodsType(item: string) {
  return presetGoodsOptions.includes(item);
}

function bookingGoodsLabel(language: AppLanguage, item: string) {
  const trimmed = item.trim();
  if (!trimmed) return copyFor(language, 'other');
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
  const rule = vehicleRule(vehicle);
  const billableKm = Math.max(1, Math.ceil(distanceKm || 1));
  const baseFare = rule?.baseFare ?? vehicle.baseFare;
  const perKmAfterFirst = rule?.perKmAfterFirst ?? vehicle.perKm;
  return baseFare + Math.max(0, billableKm - 1) * perKmAfterFirst;
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
  const permission = await Location.requestForegroundPermissionsAsync();
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
  const isBrand = variant === 'brand';
  return (
    <StatusBar
      barStyle={isBrand ? 'light-content' : 'dark-content'}
      backgroundColor={isBrand ? colors.customer : colors.white}
      translucent={Platform.OS === 'android' && isBrand}
    />
  );
}

async function requestCustomerAppPermissions(api: IndieryApi, onMessage: (message: string) => void) {
  const denied: string[] = [];

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
        } catch {
          onMessage('Notifications allowed. Push updates will register when network is available');
        }
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
  const [language, setLanguage] = useState<AppLanguage>('en');
  const [tripOtpByOrder, setTripOtpByOrder] = useState<Record<string, TripOtp>>({});
  const [selectedActiveOrderId, setSelectedActiveOrderId] = useState<string | undefined>();
  const [requestedOrderDetailId, setRequestedOrderDetailId] = useState<string | undefined>();
  const [pickupSearchOpen, setPickupSearchOpen] = useState(false);
  const [pickupDetailsMode, setPickupDetailsMode] = useState<'home' | 'book' | null>(null);

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
    requestCustomerAppPermissions(api, showToast).catch(() => undefined);
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
      if (!['delivered', 'cancelled'].includes(order.status)) setTab('orders');
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
    setToast(message.includes('à¤') ? copyFor('hi', 'languageSetHindi') : message);
    setTimeout(() => setToast(''), 2600);
  }

  async function estimateNow(nextStep = step, vehicleId = booking.vehicleId) {
    if (!vehicleId || !booking.pickup || !booking.drop) return;
    setBusy(true);
    try {
      const pickup = composeBookingAddress(booking.pickup, booking.pickupAddressLine);
      const drop = composeBookingAddress(booking.drop, booking.dropAddressLine);
      const result = await api.estimate({
        pickup,
        drop,
        vehicleId,
        coins: Number(booking.coins || 0),
        weightKg: Number(booking.weightKg || 1),
        extraStops: [],
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
      const pickup = composeBookingAddress(booking.pickup, booking.pickupAddressLine);
      const drop = composeBookingAddress(booking.drop, booking.dropAddressLine);
      const input: CreateOrderInput = {
        pickup,
        drop,
        vehicleId: booking.vehicleId,
        goodsType: booking.goodsType.trim() || 'Other',
        weightKg: Number(booking.weightKg || 1),
        coins: Number(booking.coins || 0),
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
      await refresh();
      setStep(1);
      setFare(null);
      setBooking((current) => ({ ...initialBooking, vehicleId: current.vehicleId }));
      setTab('orders');
      showToast(`${confirmedOrder.orderNo} booked`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Booking failed');
    } finally {
      setBusy(false);
    }
  }

  async function topUpWallet(amount: number, paymentMode: 'upi') {
    if (!data) return;
    setBusy(true);
    try {
      const result = await api.createWalletTopup({ amount, paymentMode });
      const checkout = result.paymentIntent.checkout;
      if (!checkout) throw new Error('Wallet top-up is not available');
      const payment = await RazorpayCheckout.open({
        key: checkout.keyId,
        amount: Math.round(result.paymentIntent.amount * 100),
        currency: result.paymentIntent.currency,
        name: 'Indiery',
        description: copyFor(language, 'walletTitle'),
        order_id: checkout.orderId,
        prefill: {
          name: data.user.name,
          email: data.user.email,
          contact: data.user.phone
        },
        notes: {
          wallet: 'customer'
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
        throw new Error(copyFor(language, 'paymentCancelled'));
      }
      await api.verifyWalletTopup({
        razorpayOrderId: payment.razorpay_order_id,
        razorpayPaymentId: payment.razorpay_payment_id,
        razorpaySignature: payment.razorpay_signature
      });
      await refresh();
      showToast(copyFor(language, 'moneyAdded'));
    } catch (err) {
      showToast(err instanceof Error ? err.message : copyFor(language, 'paymentCancelled'));
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
    const trackingUrl = `${socketUrl}/track/${encodeURIComponent(order.orderNo)}`;
    try {
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
              await refresh();
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
      <SafeAreaView style={styles.center}>
        <AppStatusBar variant="light" />
        <ActivityIndicator color={colors.customer} size="large" />
        <Text style={styles.muted}>{copyFor(language, 'loading')}</Text>
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

  const activeOrders = data.activeOrders.length ? data.activeOrders : data.orders.filter(isActiveOrder);
  const activeOrder =
    activeOrders.find((order) => order.id === selectedActiveOrderId) ??
    data.activeOrder ??
    activeOrders[0];
  const openBook = (nextStep = 1) => {
    setStep(nextStep);
    setTab('book');
  };
  const openActiveOrder = (orderId?: string) => {
    const nextOrderId = orderId ?? activeOrder?.id;
    if (nextOrderId) {
      setSelectedActiveOrderId(nextOrderId);
      setRequestedOrderDetailId(nextOrderId);
    }
    setTab('orders');
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
    <SafeAreaView style={styles.shell}>
      <AppStatusBar variant="brand" />
      <View style={styles.appHeader}>
        <View>
          <Text style={styles.eyebrow}>INDIERY</Text>
          <Text style={styles.headerTitle}>{copyFor(language, 'hi')}, {data.user.name.split(' ')[0]}</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{data.user.initials}</Text>
        </View>
      </View>

      <View style={styles.content}>
        {tab === 'home' && (
          <HomeScreen
            api={api}
            data={data}
            booking={booking}
            setBooking={setBooking}
            activeOrder={activeOrder}
            activeOrders={activeOrders}
            onPickupPress={() => setPickupSearchOpen(true)}
            onVehicleSelect={handleHomeVehicleSelect}
            onBook={openBook}
            onTrack={openActiveOrder}
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
            fare={fare}
            busy={busy}
            onSaveAddress={addSavedAddress}
            estimateNow={estimateNow}
            placeOrder={placeOrder}
          />
        )}
        {tab === 'orders' && (
          <OrdersScreen
            orders={data.orders}
            activeOrders={activeOrders}
            activeOrder={activeOrder}
            tripOtp={visibleTripOtp(activeOrder, activeOrder ? tripOtpByOrder[activeOrder.id] : undefined)}
            busy={busy}
            onBook={() => openBook()}
            onRefresh={refresh}
            onSelectActiveOrder={setSelectedActiveOrderId}
            detailOrderRequestId={requestedOrderDetailId}
            onDetailOrderRequestHandled={() => setRequestedOrderDetailId(undefined)}
            onShare={shareActiveOrder}
            onCancel={cancelActiveOrder}
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
            onTopup={topUpWallet}
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
      {toast ? <View style={styles.toast}><Text style={styles.toastText}>{toast}</Text></View> : null}
    </SafeAreaView>
    </LanguageContext.Provider>
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
      <AppStatusBar variant="light" />
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
      <AppStatusBar variant="light" />
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
  api,
  data,
  booking,
  setBooking,
  activeOrder,
  activeOrders,
  onPickupPress,
  onVehicleSelect,
  onBook,
  onTrack
}: {
  api: IndieryApi;
  data: CustomerBootstrap;
  booking: typeof initialBooking;
  setBooking: React.Dispatch<React.SetStateAction<typeof initialBooking>>;
  activeOrder?: Order;
  activeOrders: Order[];
  onPickupPress: () => void;
  onVehicleSelect: (vehicle: Vehicle) => void;
  onBook: (nextStep?: number) => void;
  onTrack: (orderId?: string) => void;
}) {
  const copy = useCopy();
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
      <View pointerEvents="none" style={styles.homeMapPattern}>
        <View style={[styles.homePatternRoad, styles.homePatternRoadOne]} />
        <View style={[styles.homePatternRoad, styles.homePatternRoadTwo]} />
        <View style={[styles.homePatternRoad, styles.homePatternRoadThree]} />
      </View>
      <ScrollView contentContainerStyle={styles.homeScroll} showsVerticalScrollIndicator={false}>
        <Pressable style={styles.homeLocationCard} onPress={onPickupPress}>
          <View style={[styles.homeLocationIcon, pickupSelected && styles.homeLocationIconSelected]}>
            {autoPickupLoading ? (
              <ActivityIndicator size="small" color={colors.customer} />
            ) : (
              <Ionicons name={pickupSelected ? 'home' : 'locate'} size={18} color={pickupSelected ? colors.white : colors.customer} />
            )}
          </View>
          <View style={styles.flex}>
            <Text style={styles.homeLocationLabel}>{copy.pickupLocation}</Text>
            <Text style={styles.homeLocationTitle} numberOfLines={1}>{pickupDisplay}</Text>
          </View>
          <Ionicons name="arrow-forward" size={18} color={colors.customer} />
        </Pressable>

        <View style={styles.homeServiceGrid}>
          {homeVehicleCards.map((service) => (
            <Pressable
              key={service.id}
              style={styles.homeServiceCard}
              onPress={() => startBookingFromHome(service.vehicle)}
            >
              <HomeVehicleVisual vehicle={service.vehicle} color={service.accent} />
              <View style={styles.homeServiceFooter}>
                <View style={styles.flex}>
                  <Text style={styles.homeServiceTitle}>{service.title}</Text>
                  <Text style={styles.homeServiceSubtitle} numberOfLines={2}>{service.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={17} color={colors.ink} />
              </View>
            </Pressable>
          ))}
        </View>

      {lastOrder ? (
        <Pressable style={styles.rebookCard} onPress={() => onBook(1)}>
          <View style={styles.rebookIcon}>
            <Ionicons name="repeat" size={18} color={colors.customer} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.cardTitle}>{copy.repeatLastRoute}</Text>
            <Text style={styles.mutedSmall}>{lastOrder.pickup.label} to {lastOrder.drop.label}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>
      ) : null}

        <Pressable style={styles.homeRewardCard} onPress={() => onBook(1)}>
          <View style={styles.homeRewardIcon}>
            <Ionicons name="disc" size={24} color={colors.amber} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.homeRewardTitle}>{copy.indieryCoins}</Text>
            <Text style={styles.homeRewardText}>{copy.useCoinsDiscount}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.ink} />
        </Pressable>

        <View style={styles.homeAnnouncementHeader}>
          <Text style={styles.homeAnnouncementTitle}>Announcements</Text>
          <Pressable style={styles.homeSeeAllButton} onPress={() => onTrack()}>
            <Text style={styles.homeSeeAllText}>See all</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.customer} />
          </Pressable>
        </View>
        <View
          style={styles.homeAnnouncementCarousel}
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
              <Pressable
                key={item.id}
                style={[styles.homeAnnouncementCard, announcementWidth ? { width: announcementWidth } : null]}
                onPress={() => onTrack()}
              >
                <View style={styles.homeAnnouncementIcon}>
                  <Ionicons name={item.icon} size={22} color={item.iconColor} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.homeAnnouncementCopy}>{item.title}</Text>
                  <Text style={styles.homeAnnouncementMeta}>{item.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.ink} />
              </Pressable>
            ))}
          </ScrollView>
        </View>
        <View style={styles.homeDots}>
          {homeAnnouncements.map((item, index) => (
            <View key={item.id} style={[styles.homeDot, index === announcementIndex && styles.homeDotActive]} />
          ))}
        </View>

      {activeOrders.length ? (
        <View>
          <SectionTitle title={copy.activeDelivery} />
          {activeOrders.slice(0, 3).map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              selected={order.id === activeOrder?.id}
              compact
              onPress={() => onTrack(order.id)}
            />
          ))}
        </View>
      ) : null}

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
    }, 320);

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
      <SafeAreaView style={styles.pickupSearchShell}>
        <KeyboardAvoidingView style={styles.pickupSearchKeyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.pickupSearchTopBar}>
            <Pressable style={styles.pickupSearchBackButton} onPress={onClose}>
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
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

function HomeVehicleVisual({ vehicle, color }: { vehicle: Vehicle; color: string }) {
  const source = vehicleArtSources[vehicle.code] ?? mini700VehicleImage;
  return (
    <View style={styles.homeServiceArt}>
      <View style={[styles.homeServiceArtHalo, { backgroundColor: `${color}1F` }]} />
      <View style={[styles.homeServiceArtShadow, { backgroundColor: color }]} />
      <Image
        source={source}
        resizeMode="contain"
        style={[
          styles.homeVehicleImage,
          vehicle.code === 'bike' && styles.homeVehicleImageBike,
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
  const isPickup = label === copy.pickup || label === 'Pickup';
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [localError, setLocalError] = useState('');
  const requestSeqRef = useRef(0);
  const sessionTokenRef = useRef(`loc-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const skipDoneTypingRef = useRef(false);
  const typedLocation = value.trim();
  const showTypedLocationOption = Boolean(onDoneTyping && focused && typedLocation.length >= 3);

  useEffect(() => {
    const query = value.trim();
    if (!focused || query.length < 3) {
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
  }, [api, focused, value]);

  async function chooseSuggestion(suggestion: LocationSuggestion) {
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
        <View style={styles.locationLabelRow}>
          <Text style={styles.fieldLabel}>{label}</Text>
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
        variant === 'route' && styles.routeLocationInputShell,
        focused && styles.locationInputShellActive
      ]}>
        <Ionicons name={isPickup ? 'radio-button-on' : 'location'} size={18} color={colors.customer} />
        <TextInput
          value={value}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            if (skipDoneTypingRef.current) {
              skipDoneTypingRef.current = false;
            }
          }}
          onSubmitEditing={() => onDoneTyping?.(value)}
          onChangeText={(nextValue) => {
            setFocused(true);
            onChangeText(nextValue);
          }}
          placeholder={placeholder || copy.mapSearchPlaceholder}
          placeholderTextColor={colors.muted}
          style={styles.locationInput}
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
        <Ionicons name={vehicleIcon(vehicle)} size={24} color={disabled ? colors.muted : colors.customer} />
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
      <Text style={styles.vehiclePriceLine}>
        {copy.fareBeforeTax}: {money(price ?? porterVehicleQuote(vehicle))}
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
  price: number;
  onPress: () => void;
}) {
  const copy = useCopy();
  return (
    <Pressable
      style={[
        styles.vehicleFareOption,
        selected && styles.vehicleFareOptionSelected,
        disabled && styles.vehicleFareOptionDisabled
      ]}
      disabled={disabled}
      onPress={onPress}
    >
      <View style={styles.vehicleFareOptionIcon}>
        <VehicleMiniArt vehicle={vehicle} muted={disabled} selected={selected} />
      </View>
      <View style={styles.flex}>
        <View style={styles.vehicleFareOptionTitleRow}>
          <Text style={[styles.vehicleFareOptionTitle, disabled && styles.vehicleNameDisabled]}>{vehicle.shortName}</Text>
          {suggested ? (
            <View style={styles.vehicleNewBadge}>
              <Text style={styles.vehicleNewBadgeText}>{copy.suggested}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.vehicleFareOptionMeta}>
          {vehicleCapacityText(vehicle, copy.upTo)} - {vehicle.etaMinutes} min
        </Text>
      </View>
      <View style={styles.vehicleFareOptionPriceWrap}>
        <Text style={[styles.vehicleFareOptionPrice, disabled && styles.vehicleNameDisabled]}>{money(price)}</Text>
        {selected ? <Ionicons name="checkmark-circle" size={17} color={colors.customer} /> : null}
        {disabled ? <Text style={styles.vehicleUnavailableText}>{copy.unavailableForWeight}</Text> : null}
      </View>
    </Pressable>
  );
}

function VehicleMiniArt({ vehicle, muted, selected }: { vehicle: Vehicle; muted?: boolean; selected?: boolean }) {
  const source = vehicleArtSources[vehicle.code] ?? mini700VehicleImage;
  const shadowColor = muted ? colors.muted : selected ? colors.blue : colors.customer;
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
  busy,
  onSaveAddress,
  estimateNow,
  placeOrder
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
  busy: boolean;
  onSaveAddress: (input: Omit<SavedAddress, 'id'>) => Promise<void>;
  estimateNow: (nextStep?: number, vehicleId?: string) => Promise<void>;
  placeOrder: () => Promise<void>;
}) {
  const copy = useCopy();
  const language = useLanguage();
  const bookingWeightKg = parseBookingWeight(booking.weightKg);
  const vehicleChoices = customerVehicles(vehicles);
  const suggestedVehicle = suggestedCustomerVehicle(vehicles, bookingWeightKg);
  const selectedVehicle = vehicleChoices.find((vehicle) => vehicle.id === booking.vehicleId) ?? suggestedVehicle ?? vehicleChoices[0];
  const vehicleChoiceIds = vehicleChoices.map((vehicle) => vehicle.id).join('|');
  const routeDistanceKm = fare?.distanceKm;
  const walletBalance = user.customerProfile?.walletBalance ?? 0;
  const selectedGoodsIsOther = !isPresetGoodsType(booking.goodsType);
  const [mapPickerTarget, setMapPickerTarget] = useState<MapPickerTarget | null>(null);
  const [contactSheetTarget, setContactSheetTarget] = useState<'pickup' | 'drop' | null>(null);
  const [goodsRulesOpen, setGoodsRulesOpen] = useState(false);
  const [contactError, setContactError] = useState('');
  const [autoPickupLoading, setAutoPickupLoading] = useState(false);
  const autoPickupAttemptedRef = useRef(false);
  const hasPickupLocation = booking.pickup.trim().length > 0;
  const hasDropLocation = booking.drop.trim().length > 0;
  const stepMeta: Record<number, { title: string; subtitle: string }> = {
    1: { title: copy.pickupAndDrop, subtitle: booking.pickup || copy.setPickupLocation },
    2: { title: copy.goodsDetails, subtitle: hasDropLocation ? `${booking.pickup} to ${booking.drop}` : copy.enterDropLocation },
    3: { title: copy.chooseVehicle, subtitle: fare ? `${fare.distanceKm} km - ${booking.weightKg || 0} kg` : copy.estimating },
    4: { title: copy.payment, subtitle: selectedVehicle ? `${selectedVehicle.shortName} - ${fare ? money(fare.total) : copy.estimating}` : copy.selectVehicleValue }
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

  function selectGoodsType(item: string) {
    if (item === 'Other') {
      setBooking((current) => ({ ...current, goodsType: isPresetGoodsType(current.goodsType) ? '' : current.goodsType }));
      return;
    }
    setBooking((current) => ({ ...current, goodsType: item }));
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

  function continueFromRouteDetails() {
    if (!hasPickupLocation || !hasDropLocation) {
      setContactError(copy.selectLocationFirst);
      return;
    }
    if (!hasConfirmedPickupDetails(booking)) {
      setContactError(copy.enterSenderName);
      setContactSheetTarget('pickup');
      return;
    }
    if (!hasConfirmedDropDetails(booking)) {
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
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.bookingStepHeader}>
        <Pressable
          style={styles.bookingStepBack}
          onPress={() => {
            if (step > 1) setStep(step - 1);
          }}
        >
          <Ionicons name={step > 1 ? 'arrow-back' : 'chevron-down'} size={20} color={colors.ink} />
        </Pressable>
        <View style={styles.flex}>
          <Text style={styles.bookingStepTitle}>{currentStepMeta.title}</Text>
          <Text style={styles.bookingStepSubtitle} numberOfLines={1}>{currentStepMeta.subtitle}</Text>
        </View>
        <Text style={styles.bookingStepCount}>{step}/4</Text>
      </View>
      <View style={styles.bookingProgressTrack}>
        <View style={[styles.bookingProgressFill, { width: `${step * 25}%` }]} />
      </View>

      {step === 1 && (
        <View>
          {autoPickupLoading ? (
            <View style={styles.noticeInfo}>
              <ActivityIndicator size="small" color={colors.blue} />
              <Text style={styles.noticeInfoText}>{copy.settingPickupLocation}</Text>
            </View>
          ) : null}

          <View style={styles.routeEntryCard}>
            <View style={styles.routeEntryPickupRow}>
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

            <View style={styles.routeEntryDivider} />

            <View style={styles.routeEntryDropRow}>
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
          <View style={styles.routeReviewCard}>
            <View style={styles.routeReviewHeader}>
              <Text style={styles.summaryTitle}>{copy.routeSummary}</Text>
              <Pressable style={styles.changeRouteButton} onPress={() => setStep(1)}>
                <Ionicons name="create-outline" size={14} color={colors.customer} />
                <Text style={styles.changeRouteText}>{copy.changeRoute}</Text>
              </Pressable>
            </View>
            <View style={styles.routeReviewLine}>
              <View style={styles.routeReviewDot} />
              <View style={styles.flex}>
                <Text style={styles.routeReviewTitle} numberOfLines={1}>{composeBookingAddress(booking.pickup, booking.pickupAddressLine)}</Text>
                <Text style={styles.mutedSmall}>{copy.sender}: {booking.pickupContactName || copy.addNameMobile}</Text>
              </View>
            </View>
            <View style={styles.routeReviewLine}>
              <View style={[styles.routeReviewDot, styles.routeReviewDotDrop]} />
              <View style={styles.flex}>
                <Text style={styles.routeReviewTitle} numberOfLines={1}>{composeBookingAddress(booking.drop, booking.dropAddressLine)}</Text>
                <Text style={styles.mutedSmall}>{copy.receiver}: {booking.dropContactName || copy.addNameMobile}</Text>
              </View>
            </View>
          </View>
          <View style={styles.goodsChipWrap}>
            {goodsOptions.map((item) => {
              const active = item === 'Other' ? selectedGoodsIsOther : booking.goodsType === item;
              return (
                <Pressable
                  key={item}
                  style={[styles.goodsChip, active && styles.goodsChipActive]}
                  onPress={() => selectGoodsType(item)}
                >
                  <Text style={[styles.goodsChipText, active && styles.goodsChipTextActive]}>{goodsLabel(language, item)}</Text>
                </Pressable>
              );
            })}
          </View>
          <Field
            label={selectedGoodsIsOther ? copy.describeGoods : copy.goodsType}
            value={selectedGoodsIsOther ? booking.goodsType : goodsLabel(language, booking.goodsType)}
            onChangeText={(goodsType) => setBooking((current) => ({ ...current, goodsType }))}
            editable={selectedGoodsIsOther}
          />
          <Field
            label={copy.weightKg}
            keyboardType="numeric"
            value={booking.weightKg}
            onChangeText={updateBookingWeight}
          />
          <Pressable style={styles.notice} onPress={() => setGoodsRulesOpen(true)}>
            <Ionicons name="warning" size={16} color={colors.amber} />
            <Text style={styles.noticeText}>{copy.viewGoodsRules}</Text>
            <Ionicons name="chevron-up" size={16} color={colors.amber} />
          </Pressable>
          {bookingWeightKg && !suggestedVehicle ? (
            <View style={styles.notice}>
              <Ionicons name="warning" size={16} color={colors.amber} />
              <Text style={styles.noticeText}>No customer vehicle is available for {bookingWeightKg} kg.</Text>
            </View>
          ) : null}
          {contactError ? <Text style={styles.contactError}>{contactError}</Text> : null}
          <View style={styles.bookingSummaryCard}>
            <Text style={styles.summaryTitle}>{copy.routeSummary}</Text>
            <SummaryRow label={copy.service} value={serviceTitle(language, booking.serviceCategory)} />
            <SummaryRow label={copy.vehicle} value={selectedVehicle?.name || copy.selectVehicleValue} />
            <SummaryRow label={copy.route} value={copy.direct} />
          </View>
          <View style={styles.row}>
            <SecondaryButton title={copy.back} icon="arrow-back" onPress={() => setStep(1)} />
            <PrimaryButton title={busy ? copy.estimating : copy.continue} icon="arrow-forward" onPress={continueFromGoodsDetails} />
          </View>
        </View>
      )}

      {step === 3 && (
        <View>
          <View style={styles.vehicleRoutePanel}>
            <View style={styles.routeReviewLine}>
              <View style={styles.routeReviewDot} />
              <View style={styles.flex}>
                <Text style={styles.routeReviewTitle} numberOfLines={1}>{composeBookingAddress(booking.pickup, booking.pickupAddressLine)}</Text>
                <Text style={styles.mutedSmall}>{booking.pickupContactName || user.name}</Text>
              </View>
            </View>
            <View style={styles.routeReviewLine}>
              <View style={[styles.routeReviewDot, styles.routeReviewDotDrop]} />
              <View style={styles.flex}>
                <Text style={styles.routeReviewTitle} numberOfLines={1}>{composeBookingAddress(booking.drop, booking.dropAddressLine)}</Text>
                <Text style={styles.mutedSmall}>{booking.dropContactName || copy.receiver}</Text>
              </View>
            </View>
            <View style={styles.vehicleRouteActions}>
              <Pressable style={styles.vehicleRouteAction} onPress={() => setStep(1)}>
                <Ionicons name="create" size={14} color={colors.customer} />
                <Text style={styles.vehicleRouteActionText}>{copy.changeRoute}</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.vehicleFareList}>
            {vehicleChoices.map((vehicle) => {
              const disabled = !vehicleCanCarryWeight(vehicle, bookingWeightKg);
              const selected = booking.vehicleId === vehicle.id || (!booking.vehicleId && selectedVehicle?.id === vehicle.id);
              const price = selected && fare ? fare.total : porterVehicleQuote(vehicle, routeDistanceKm);
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
          <View style={styles.routeReviewCard}>
            <View style={styles.routeReviewHeader}>
              <Text style={styles.summaryTitle}>{copy.routeAndContacts}</Text>
              <Pressable style={styles.changeRouteButton} onPress={() => setStep(1)}>
                <Ionicons name="create-outline" size={14} color={colors.customer} />
                <Text style={styles.changeRouteText}>{copy.changeRoute}</Text>
              </Pressable>
            </View>
            <View style={styles.routeReviewLine}>
              <View style={styles.routeReviewDot} />
              <View style={styles.flex}>
                <Text style={styles.routeReviewTitle} numberOfLines={1}>{composeBookingAddress(booking.pickup, booking.pickupAddressLine)}</Text>
                <Text style={styles.mutedSmall}>{copy.sender}: {booking.pickupContactName || copy.addNameMobile}</Text>
              </View>
            </View>
            <View style={styles.routeReviewLine}>
              <View style={[styles.routeReviewDot, styles.routeReviewDotDrop]} />
              <View style={styles.flex}>
                <Text style={styles.routeReviewTitle} numberOfLines={1}>{composeBookingAddress(booking.drop, booking.dropAddressLine)}</Text>
                <Text style={styles.mutedSmall}>{copy.receiver}: {booking.dropContactName || copy.addNameMobile}</Text>
              </View>
            </View>
          </View>

          {selectedVehicle ? (
            <View style={styles.vehicleFareCard}>
              <View style={styles.vehicleFareIcon}>
                <Ionicons name={vehicleIcon(selectedVehicle)} size={26} color={colors.customer} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.vehicleName}>{selectedVehicle.shortName}</Text>
                <Text style={styles.vehicleFareMeta}>
                  {vehicleCapacityText(selectedVehicle, copy.upTo)} - {fare?.etaMinutes || selectedVehicle.etaMinutes} min
                </Text>
                <Text style={styles.mutedSmall}>{copy.pricedAfterRoute}</Text>
              </View>
              <Text style={styles.vehicleFarePrice}>{fare ? money(fare.total) : money(porterVehicleQuote(selectedVehicle, routeDistanceKm))}</Text>
            </View>
          ) : null}

          <Pressable style={styles.notice} onPress={() => setGoodsRulesOpen(true)}>
            <Ionicons name="warning" size={16} color={colors.amber} />
            <Text style={styles.noticeText}>{copy.viewGoodsRules}</Text>
            <Ionicons name="chevron-up" size={16} color={colors.amber} />
          </Pressable>

          <View style={styles.bookingSummaryCard}>
            <Text style={styles.summaryTitle}>{copy.bookingSummary}</Text>
            <SummaryRow
              label={copy.route}
              value={`${composeBookingAddress(booking.pickup, booking.pickupAddressLine)} to ${composeBookingAddress(booking.drop, booking.dropAddressLine)}`}
            />
            <SummaryRow label={copy.vehicle} value={selectedVehicle?.shortName || copy.vehicle} />
            <SummaryRow label={copy.goods} value={`${bookingGoodsLabel(language, booking.goodsType)}, ${booking.weightKg || 0} kg`} />
            <SummaryRow label={copy.eta} value={`${fare?.etaMinutes || selectedVehicle?.etaMinutes || 0} min`} />
          </View>
          <Field
            label={copy.useCoins}
            keyboardType="numeric"
            value={booking.coins}
            onChangeText={(coins) => setBooking((current) => ({ ...current, coins }))}
          />
          {fare ? <FareCard fare={fare} /> : null}
          {(['wallet', 'upi', 'cash'] as PaymentMode[]).map((mode) => {
            const walletDisabled = mode === 'wallet' && Boolean(fare && walletBalance < fare.total);
            const subtitle =
              mode === 'cash'
                ? copy.payPartnerAfterDelivery
                : mode === 'wallet'
                  ? walletDisabled
                    ? `${copy.insufficientWalletBalance} · ${money(walletBalance)}`
                    : `${copy.walletPaySubtitle} · ${money(walletBalance)}`
                  : copy.secureOnlinePayment;
            return (
              <Pressable
                key={mode}
                style={[
                  styles.payRow,
                  booking.paymentMode === mode && styles.payRowActive,
                  walletDisabled && styles.payRowDisabled
                ]}
                onPress={() => {
                  if (!walletDisabled) setBooking((current) => ({ ...current, paymentMode: mode }));
                }}
              >
                <Ionicons
                  name={booking.paymentMode === mode ? 'radio-button-on' : 'radio-button-off'}
                  size={18}
                  color={walletDisabled ? colors.muted : colors.customer}
                />
                <View style={styles.flex}>
                  <Text style={[styles.payText, walletDisabled && styles.payTextDisabled]}>
                    {mode === 'wallet' ? copy.walletPay : mode.toUpperCase()}
                  </Text>
                  <Text style={styles.mutedSmall}>{subtitle}</Text>
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
        onSaved={() => {
          if (contactSheetTarget === 'drop') continueFromRouteDetails();
        }}
      />
    ) : null}
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
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.contactSheetOverlay}>
        <Pressable style={styles.contactSheetBackdrop} onPress={onClose} />
        <View style={[styles.contactSheet, styles.goodsRulesSheet]}>
          <View style={styles.contactSheetHandle} />
          <View style={styles.contactSheetHeader}>
            <View>
              <Text style={styles.contactSheetTitle}>{copy.goodsRules}</Text>
              <Text style={styles.contactSheetSubtitle}>{copy.goodsRulesIntro}</Text>
            </View>
            <Pressable style={styles.mapPickerClose} onPress={onClose}>
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
  onBack,
  onTypedLocationChange,
  onLocationChange
}: {
  api: IndieryApi;
  target: 'pickup' | 'drop';
  title: string;
  value: string;
  lat?: number;
  lng?: number;
  onBack: () => void;
  onTypedLocationChange: (value: string) => void;
  onLocationChange: (location: LocationDetails) => void;
}) {
  const copy = useCopy();
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
    }, 320);

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

  function updatePinFromMap(nextRegion: Region) {
    setRegion((current) => (regionsAreClose(current, nextRegion) ? current : nextRegion));
    setSuggestions([]);
    if (programmaticMoveRef.current) {
      programmaticMoveRef.current = false;
      return;
    }
    if (userAdjustedMapRef.current) {
      commitLocation(nextRegion, displayLabel);
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
    <View style={styles.contactExactHero}>
      <View style={styles.contactMapHeroCanvas}>
        {canRenderNativeMap ? (
          <>
            <MapView
              ref={mapRef}
              provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
              style={styles.contactMapRealMap}
              initialRegion={initialRegion}
              scrollEnabled={false}
              zoomEnabled={false}
              rotateEnabled={false}
              pitchEnabled={false}
            >
              <Marker
                coordinate={{ latitude: region.latitude, longitude: region.longitude }}
                pinColor={pinColor}
              />
            </MapView>
            <View pointerEvents="none" style={styles.mapPickerPinOverlay}>
              <Ionicons name="location" size={42} color={pinColor} />
            </View>
          </>
        ) : (
          <View style={styles.mapPickerFallback}>
            <Ionicons name="map-outline" size={28} color={colors.customer} />
            <Text style={styles.mapPickerFallbackText}>
              Map preview needs Google Maps setup. Search a place or use current location to continue.
            </Text>
          </View>
        )}
        <Pressable style={styles.contactMapBackButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </Pressable>
        <View pointerEvents="none" style={styles.contactMapTitlePill}>
          <Text style={styles.contactMapTitleText}>{title}</Text>
        </View>
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
  onSaved?: () => void;
}) {
  const copy = useCopy();
  const [localError, setLocalError] = useState('');
  const [selectedAddressType, setSelectedAddressType] = useState<'home' | 'work' | 'other' | null>(null);
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
    setBooking((current) => ({
      ...current,
      ...(isPickup ? { pickupContactConfirmed: true } : { dropContactConfirmed: true })
    }));
    onClose();
    onSaved?.();
  }

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <AppStatusBar variant="light" />
      <SafeAreaView style={styles.contactPageShell}>
        <KeyboardAvoidingView style={styles.contactPageKeyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <InlineExactLocationPicker
            api={api}
            target={target}
            title={mapHint}
            value={place}
            lat={placeLat}
            lng={placeLng}
            onBack={onClose}
            onTypedLocationChange={updateTypedLocation}
            onLocationChange={updateExactLocation}
          />
          <ScrollView
            style={styles.contactPagePanel}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.contactPagePanelContent}
          >
            <View style={styles.contactSheetHandle} />
            <View style={styles.contactAddressHeader}>
              <Ionicons name="location" size={24} color={locationColor} />
              <View style={styles.flex}>
                <Text style={styles.contactAddressTitle} numberOfLines={1}>{locationTitle}</Text>
                <Text style={styles.contactAddressSubtitle} numberOfLines={1}>{locationSubtitle}</Text>
              </View>
              <Pressable style={styles.contactChangeButton} onPress={onChangeLocation || onClose}>
                <Text style={styles.contactChangeButtonText}>Change</Text>
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
            <Pressable style={styles.contactMobileCheckRow} onPress={usingMine ? enterManually : useMine}>
              <Ionicons name={usingMine ? 'checkbox' : 'square-outline'} size={18} color={colors.customer} />
              <Text style={styles.contactMobileCheckText}>Use my mobile number: {user.phone}</Text>
            </Pressable>
            <Text style={styles.contactSaveAsLabel}>Save this address as</Text>
            <View style={styles.contactTypeRow}>
              {[
                { type: 'home' as const, icon: 'home' as const, label: 'Home' },
                { type: 'work' as const, icon: 'business' as const, label: 'Shop' },
                { type: 'other' as const, icon: 'heart' as const, label: 'Other' }
              ].map((option) => {
                const active = selectedAddressType === option.type;
                return (
                  <Pressable
                    key={option.type}
                    style={[styles.contactTypeChip, active && styles.contactTypeChipActive]}
                    onPress={() => setSelectedAddressType(active ? null : option.type)}
                  >
                    <Ionicons name={option.icon} size={13} color={active ? colors.customer : colors.ink} />
                    <Text style={[styles.contactTypeChipText, active && styles.contactTypeChipTextActive]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {localError ? <Text style={styles.contactError}>{localError}</Text> : null}
            <Pressable style={styles.contactConfirmButton} onPress={saveDetails}>
              <Text style={styles.contactConfirmButtonText}>{primaryTitle || 'Confirm and continue'}</Text>
            </Pressable>
          </ScrollView>
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
  return (
    <View style={styles.contactFormField}>
      <Text style={styles.contactFormLabel}>{label}</Text>
      <View style={styles.contactFormInputShell}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          style={styles.contactFormInput}
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
    }, 320);

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
      <SafeAreaView style={styles.mapPickerShell}>
        <View style={styles.mapPickerHeader}>
          <Pressable style={styles.mapPickerClose} onPress={onClose}>
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

        <View style={styles.mapPickerCanvas}>
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
  onBook,
  onRefresh,
  onSelectActiveOrder,
  detailOrderRequestId,
  onDetailOrderRequestHandled,
  onShare,
  onCancel
}: {
  orders: Order[];
  activeOrders: Order[];
  activeOrder?: Order;
  tripOtp?: TripOtp;
  busy: boolean;
  onBook: () => void;
  onRefresh: () => void;
  onSelectActiveOrder: (orderId: string) => void;
  detailOrderRequestId?: string;
  onDetailOrderRequestHandled?: () => void;
  onShare?: (order: Order) => void;
  onCancel?: (order: Order) => void;
}) {
  const copy = useCopy();
  const activeOrderIds = new Set(activeOrders.map((order) => order.id));
  const pastOrders = orders.filter((order) => !activeOrderIds.has(order.id));
  const [detailOrderId, setDetailOrderId] = useState<string | undefined>();
  const ordersScrollRef = useRef<ScrollView | null>(null);
  const allOrderIds = orders.map((order) => order.id).join('|');
  const allActiveOrderIds = activeOrders.map((order) => order.id).join('|');
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

  function openOrderDetails(order: Order) {
    if (isActiveOrder(order)) onSelectActiveOrder(order.id);
    setDetailOrderId(order.id);
    setTimeout(() => ordersScrollRef.current?.scrollTo({ y: 0, animated: true }), 0);
  }

  return (
    <ScrollView ref={ordersScrollRef} contentContainerStyle={styles.scroll}>
      {detailOrder ? (
        <OrderDetailsPanel
          order={detailOrder}
          tripOtp={detailTripOtp}
          busy={busy}
          onRefresh={onRefresh}
          onShare={onShare ? () => onShare(detailOrder) : undefined}
          onCancel={onCancel ? () => onCancel(detailOrder) : undefined}
          onClose={() => setDetailOrderId(undefined)}
        />
      ) : (
        <>
          <View style={styles.historyHeader}>
            <SectionTitle title={`${copy.active} ${copy.orders}`} />
            <Text style={styles.mutedSmall}>{activeOrders.length} {copy.orders.toLowerCase()}</Text>
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
            <View style={styles.noActiveOrderCard}>
              <Ionicons name="navigate-outline" size={30} color={colors.muted} />
              <Text style={styles.emptyTitle}>{copy.noActiveDelivery}</Text>
              <Text style={styles.muted}>{copy.liveTrackingAppear}</Text>
              <PrimaryButton title={copy.bookDelivery} icon="add" onPress={onBook} />
            </View>
          )}

          <View style={styles.historyHeader}>
            <SectionTitle title={copy.orderHistory} />
            <Text style={styles.mutedSmall}>{pastOrders.length} {copy.orders.toLowerCase()}</Text>
          </View>
          {pastOrders.length ? (
            pastOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onPress={() => openOrderDetails(order)}
              />
            ))
          ) : (
            <View style={styles.emptyHistoryCard}>
              <Ionicons name="cube-outline" size={28} color={colors.muted} />
              <Text style={styles.emptyTitle}>{copy.noPastOrders}</Text>
              <Text style={styles.muted}>{copy.completedCancelledAppear}</Text>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

function OrderDetailsPanel({
  order,
  tripOtp,
  busy,
  onRefresh,
  onShare,
  onCancel,
  onClose
}: {
  order: Order;
  tripOtp?: TripOtp;
  busy: boolean;
  onRefresh: () => void;
  onShare?: () => void;
  onCancel?: () => void;
  onClose?: () => void;
}) {
  const copy = useCopy();
  const language = useLanguage();
  const countdown = useOrderCountdown(order);
  const orderActive = isActiveOrder(order);
  const cancellable = isCustomerCancellableOrder(order);

  return (
    <View>
      <View style={styles.liveOrderPanel}>
        <View style={styles.liveOrderHeader}>
          <View style={styles.liveOrderIcon}>
            <Ionicons name="cube" size={22} color={colors.white} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.liveOrderTitle}>{orderActive ? copy.activeDelivery : copy.orderDetails}</Text>
            <Text style={styles.liveOrderNo}>{order.orderNo}</Text>
          </View>
          <View style={styles.orderDetailHeaderActions}>
            <Badge label={statusLabel(language, order.status)} />
            {onClose ? (
              <Pressable style={styles.orderDetailClose} onPress={onClose}>
                <Ionicons name="close" size={16} color={colors.ink} />
              </Pressable>
            ) : null}
          </View>
        </View>

        <MapPreview
          pickup={order.pickup}
          drop={order.drop}
          extraStops={order.extraStops}
          eta={order.etaMinutes}
          partnerLocation={order.partnerLocation}
        />

        <View style={styles.liveRouteCard}>
          <View style={styles.liveRouteLine}>
            <View style={[styles.liveRouteDot, styles.liveRoutePickupDot]} />
            <View style={styles.flex}>
              <Text style={styles.liveRouteLabel}>{copy.pickup}</Text>
              <Text style={styles.liveRouteText} numberOfLines={1}>{order.pickup.label}</Text>
            </View>
          </View>
          {order.extraStops.map((stop, index) => (
            <View key={`${order.id}-detail-stop-${index}`} style={styles.liveRouteLine}>
              <View style={[styles.liveRouteDot, styles.liveRouteStopDot]} />
              <View style={styles.flex}>
                <Text style={styles.liveRouteLabel}>{copy.stop} {index + 1}</Text>
                <Text style={styles.liveRouteText} numberOfLines={1}>{stop.label}</Text>
              </View>
            </View>
          ))}
          <View style={styles.liveRouteLine}>
            <View style={[styles.liveRouteDot, styles.liveRouteDropDot]} />
            <View style={styles.flex}>
              <Text style={styles.liveRouteLabel}>{copy.drop}</Text>
              <Text style={styles.liveRouteText} numberOfLines={1}>{order.drop.label}</Text>
            </View>
          </View>
        </View>

        <View style={styles.liveOrderMetrics}>
          <View style={styles.liveOrderMetric}>
            <Text style={styles.liveOrderMetricValue}>{order.vehicle.shortName}</Text>
            <Text style={styles.liveOrderMetricLabel}>{copy.vehicle}</Text>
          </View>
          <View style={styles.liveOrderMetric}>
            <Text style={styles.liveOrderMetricValue}>{order.weightKg} kg</Text>
            <Text style={styles.liveOrderMetricLabel}>{goodsLabel(language, order.goodsType)}</Text>
          </View>
          <View style={styles.liveOrderMetric}>
            <Text style={styles.liveOrderMetricValue}>{money(order.fare.total)}</Text>
            <Text style={styles.liveOrderMetricLabel} numberOfLines={1}>
              {order.paymentMode.toUpperCase()} - {order.paymentStatus.toUpperCase()}
            </Text>
          </View>
        </View>

        {countdown ? (
          <View style={[styles.countdownCard, countdown.delayed && styles.countdownCardDelayed]}>
            <Ionicons
              name={countdown.delayed ? 'alert-circle' : countdown.pendingPickup ? 'cube-outline' : 'timer-outline'}
              size={19}
              color={countdown.delayed ? colors.red : colors.customer}
            />
            <View style={styles.flex}>
              <Text style={[styles.countdownValue, countdown.delayed && styles.countdownValueDelayed]}>
                {countdown.delayed ? copy.runningLate : countdown.pendingPickup ? copy.countdownBegins : countdown.label}
              </Text>
              <Text style={styles.countdownLabel}>
                {countdown.delayed
                  ? copy.estimatedDeliveryPassed
                  : countdown.pendingPickup
                    ? copy.countdownBegins
                    : copy.estimatedTimeAfterPickup}
              </Text>
            </View>
          </View>
        ) : null}

        {order.partner ? (
          <View style={styles.assignedPartnerRow}>
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
          <View style={styles.searchingPartnerRow}>
            <ActivityIndicator size="small" color={colors.customer} />
            <Text style={styles.searchingPartnerText}>{copy.findingNearbyPartner}</Text>
          </View>
        ) : null}

        {tripOtp?.pickup || tripOtp?.drop ? (
          <View style={styles.ordersOtpPanel}>
            <View style={styles.ordersOtpTitleRow}>
              <Ionicons name="key" size={16} color={colors.customer} />
              <Text style={styles.ordersOtpTitle}>{copy.deliveryOtp}</Text>
            </View>
            <View style={styles.ordersOtpRow}>
              {tripOtp.pickup ? (
                <View style={styles.compactOtpBox}>
                  <Text style={styles.mutedSmall}>{copy.pickupOtp}</Text>
                  <Text style={styles.compactOtpText}>{tripOtp.pickup}</Text>
                </View>
              ) : null}
              {tripOtp.drop ? (
                <View style={styles.compactOtpBox}>
                  <Text style={styles.mutedSmall}>{copy.dropOtp}</Text>
                  <Text style={styles.compactOtpText}>{tripOtp.drop}</Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        <View style={styles.orderActionBar}>
          <OrderActionButton title={copy.refresh} icon="refresh" tone="primary" onPress={onRefresh} />
          {onShare && orderActive ? <OrderActionButton title={copy.share} icon="share-social" onPress={onShare} /> : null}
          {onCancel && cancellable ? (
            <OrderActionButton title={busy ? copy.cancelling : copy.cancel} icon="close-circle" tone="danger" onPress={onCancel} />
          ) : null}
        </View>
      </View>

      <FareCard fare={order.fare} />

      <View style={styles.timelinePanel}>
        <View style={styles.timelinePanelHeader}>
          <Text style={styles.cardTitle}>{copy.track}</Text>
          <Text style={styles.mutedSmall}>{statusLabel(language, order.status)}</Text>
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
  onRefresh,
  onCancel
}: {
  order?: Order;
  tripOtp?: TripOtp;
  busy: boolean;
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
        <PrimaryButton title={copy.refresh} icon="refresh" onPress={onRefresh} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <OrderDetailsPanel
        order={order}
        tripOtp={tripOtp}
        busy={busy}
        onRefresh={onRefresh}
        onCancel={onCancel && isCustomerCancellableOrder(order) ? () => onCancel() : undefined}
      />
    </ScrollView>
  );
}

function WalletScreen({
  wallet,
  busy,
  onTopup,
  onCoupon
}: {
  wallet: CustomerWallet;
  busy: boolean;
  onTopup: (amount: number, paymentMode: 'upi') => Promise<void>;
  onCoupon: () => Promise<void>;
}) {
  const copy = useCopy();
  const [amount, setAmount] = useState('500');
  const [paymentMode, setPaymentMode] = useState<'upi'>('upi');
  const topupAmount = Number(amount || 0);
  const canTopup = topupAmount >= 10;

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.walletSurface}>
        <View style={styles.walletHero}>
          <View>
            <Text style={styles.eyebrowDark}>{copy.walletTitle}</Text>
            <Text style={styles.walletHeroText}>{copy.walletSubtitle}</Text>
          </View>
          <View style={styles.walletHeroIcon}>
            <Ionicons name="wallet" size={24} color={colors.white} />
          </View>
          <View style={styles.walletBalanceBlock}>
            <Text style={styles.walletBalance}>{money(wallet.balance)}</Text>
            <Text style={styles.walletBalanceLabel}>{copy.availableToPay}</Text>
          </View>
        </View>

        <View style={styles.walletTopupHeader}>
          <View>
            <Text style={styles.cardTitle}>{copy.addMoney}</Text>
            <Text style={styles.mutedSmall}>UPI only</Text>
          </View>
          <View style={styles.walletSecureBadge}>
            <Ionicons name="shield-checkmark" size={14} color={colors.green} />
            <Text style={styles.walletSecureText}>{copy.secureTopup}</Text>
          </View>
        </View>
        <View style={styles.walletAmountRow}>
          {[200, 500, 1000].map((value) => (
            <Pressable
              key={value}
              style={[styles.walletAmountChip, amount === String(value) && styles.walletAmountChipActive]}
              onPress={() => setAmount(String(value))}
            >
              <Text style={[styles.walletAmountChipText, amount === String(value) && styles.walletAmountChipTextActive]}>
                {money(value)}
              </Text>
            </Pressable>
          ))}
        </View>
        <Field label={copy.enterAmount} keyboardType="numeric" value={amount} onChangeText={setAmount} />
        <PrimaryButton
          title={busy ? copy.applying : copy.addMoney}
          icon="add-circle"
          onPress={() => {
            if (canTopup) onTopup(topupAmount, paymentMode);
          }}
        />

        <View style={styles.walletCoinsRow}>
          <View>
            <Text style={styles.cardTitle}>{copy.rewardsCoins}</Text>
            <Text style={styles.mutedSmall}>{copy.useCoinsDiscount}</Text>
          </View>
          <View style={styles.coinPill}>
            <Ionicons name="gift" size={15} color={colors.amber} />
            <Text style={styles.coinPillText}>{wallet.coins}</Text>
          </View>
        </View>
        <Pressable style={styles.walletCouponButton} onPress={onCoupon}>
          <Ionicons name="gift" size={15} color={colors.customer} />
          <Text style={styles.walletCouponText}>{busy ? copy.applying : copy.applyFirst50}</Text>
        </Pressable>
      </View>

      <SectionTitle title={copy.recentTransactions} />
      {wallet.ledger.length ? (
        wallet.ledger.map((item) => <WalletTransactionRow key={item.id} item={item} />)
      ) : (
        <View style={styles.emptyHistoryCard}>
          <Ionicons name="receipt-outline" size={24} color={colors.muted} />
          <Text style={styles.cardTitle}>{copy.noWalletTransactions}</Text>
          <Text style={styles.mutedSmall}>{copy.noWalletTransactionsText}</Text>
        </View>
      )}

      <SectionTitle title={copy.coinActivity} />
      {wallet.coinLedger.length ? (
        wallet.coinLedger.map((item) => <WalletTransactionRow key={item.id} item={item} isCoins />)
      ) : (
        <View style={styles.emptyHistoryCard}>
          <Ionicons name="gift-outline" size={24} color={colors.muted} />
          <Text style={styles.cardTitle}>{copy.noCoinActivity}</Text>
        </View>
      )}
    </ScrollView>
  );
}

function WalletTransactionRow({ item, isCoins = false }: { item: LedgerItem; isCoins?: boolean }) {
  const copy = useCopy();
  const isCredit = item.kind === 'credit';
  const value = isCoins ? `${isCredit ? '+' : '-'}${item.amount}` : `${isCredit ? '+' : '-'}${money(item.amount)}`;
  return (
    <View style={styles.walletTxnRow}>
      <View style={[styles.walletTxnIcon, isCredit ? styles.walletTxnCredit : styles.walletTxnDebit]}>
        <Ionicons name={isCredit ? 'arrow-down' : 'arrow-up'} size={16} color={isCredit ? colors.green : colors.red} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.walletTxnTitle}>{item.title}</Text>
        <Text style={styles.walletTxnMeta}>
          {formatLedgerDate(item.createdAt)}
          {item.reference ? ` · ${item.reference}` : ''}
          {item.settled === false ? ` · ${copy.pending}` : ''}
        </Text>
      </View>
      <Text style={[styles.walletTxnAmount, isCredit ? styles.walletTxnAmountCredit : styles.walletTxnAmountDebit]}>
        {value}
      </Text>
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
  onRequestAccountDeletion
}: {
  data: CustomerBootstrap;
  busy: boolean;
  language: AppLanguage;
  onSaveProfile: (input: { name: string; email: string; city: string }) => Promise<void>;
  onChangeLanguage: (language: AppLanguage) => void;
  onDeleteAddress: (addressId: string) => Promise<void>;
  onLogout: () => void;
  onRequestAccountDeletion: () => void;
}) {
  const copy = useCopy();
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
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <AccountDetailHeader title={title} subtitle={subtitle} onBack={() => openPage('overview')} />

          {page === 'personal' ? (
            <View style={styles.accountDetailCard}>
              <View style={styles.accountProfilePreview}>
                <View style={styles.accountAvatarSmall}>
                  <Text style={styles.accountAvatarText}>{data.user.initials}</Text>
                </View>
                <View style={styles.flex}>
                  <Text style={styles.accountMenuTitle}>{data.user.name}</Text>
                  <Text style={styles.accountMenuSubtitle}>{data.user.phone}</Text>
                </View>
                <View style={styles.accountVerifiedBadge}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.green} />
                  <Text style={styles.accountVerifiedText}>{copy.verified}</Text>
                </View>
              </View>
              <Field label={copy.name} value={name} onChangeText={setName} />
              <Field label={copy.email} value={email} onChangeText={setEmail} keyboardType="email-address" />
              <Field label={copy.city} value={city} onChangeText={setCity} />
              <Field label={copy.mobileNumber} value={data.user.phone} editable={false} keyboardType="phone-pad" />
        <View style={styles.accountInfoStrip}>
          <Ionicons name="shield-checkmark" size={19} color={colors.customer} />
          <Text style={styles.accountInfoText}>{copy.mobileLinkedText}</Text>
        </View>
              {localError ? <Text style={styles.accountEditError}>{localError}</Text> : null}
              <View style={styles.accountEditActions}>
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
                data.wallet.coinLedger.map((item) => <WalletTransactionRow key={item.id} item={item} isCoins />)
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
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.accountHero}>
        <View style={styles.accountHeroTop}>
          <View>
            <Text style={styles.accountEyebrow}>{copy.account}</Text>
            <Text style={styles.accountHeroSubtitle}>{copy.accountSubtitle}</Text>
          </View>
          <View style={styles.accountVerifiedBadge}>
            <Ionicons name="checkmark-circle" size={14} color={colors.green} />
            <Text style={styles.accountVerifiedText}>{copy.verified}</Text>
          </View>
        </View>
        <View style={styles.accountIdentityCard}>
          <View style={styles.accountAvatar}>
            <Text style={styles.accountAvatarText}>{data.user.initials}</Text>
          </View>
          <View style={styles.flex}>
            <Text style={styles.accountName}>{data.user.name}</Text>
            <Text style={styles.accountSubtext}>{data.user.phone}</Text>
            <Text style={styles.accountSubtext}>{data.user.city}</Text>
          </View>
          <Pressable style={styles.accountEditButton} onPress={() => openPage('personal')}>
            <Ionicons name="create-outline" size={18} color={colors.customer} />
          </Pressable>
        </View>
      </View>

      <View style={styles.accountStatsRow}>
        <View style={styles.accountStatBox}>
          <Text style={styles.accountStatValue}>{data.orders.length}</Text>
          <Text style={styles.accountStatLabel}>{copy.orders}</Text>
        </View>
        <View style={styles.accountStatBox}>
          <Text style={styles.accountStatValue}>{activeOrders}</Text>
          <Text style={styles.accountStatLabel}>{copy.active}</Text>
        </View>
        <View style={styles.accountStatBox}>
          <Text style={styles.accountStatValue}>{completedOrders}</Text>
          <Text style={styles.accountStatLabel}>{copy.done}</Text>
        </View>
      </View>

      <Pressable style={styles.enterpriseCard} onPress={() => openPage('enterprise')}>
        <View style={styles.enterpriseIcon}>
          <Ionicons name="business" size={24} color={colors.white} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.enterpriseTitle}>{copy.enterprisesTitle}</Text>
          <Text style={styles.enterpriseText}>{copy.enterprisesText}</Text>
        </View>
        <Ionicons name="chevron-forward" size={19} color={colors.customer} />
      </Pressable>

      <SectionTitle title={copy.account} />
      <View style={styles.accountMenu}>
        <AccountMenuRow
          icon="person-outline"
          title={copy.personalDetails}
          subtitle={`${data.user.email || copy.emailNotAdded} - ${data.user.city}`}
          onPress={() => openPage('personal')}
        />
        <AccountMenuRow
          icon="bookmark-outline"
          title={copy.savedAddresses}
          subtitle={savedAddressCountText}
          onPress={() => openPage('addresses')}
        />
        <AccountMenuRow
          icon="wallet-outline"
          title={copy.indieryCoinsMenu}
          subtitle={`${coins} ${copy.coinsAvailable}`}
          onPress={() => openPage('wallet')}
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
  return (
    <View style={styles.accountDetailHeader}>
      <Pressable style={styles.mapPickerClose} onPress={onBack}>
        <Ionicons name="arrow-back" size={21} color={colors.ink} />
      </Pressable>
      <View style={styles.flex}>
        <Text style={styles.accountDetailTitle}>{title}</Text>
        <Text style={styles.accountDetailSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

function EnterpriseInfoScreen({ onBack }: { onBack: () => void }) {
  const copy = useCopy();
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
      title: copy.gstInvoices,
      subtitle: copy.gstInvoicesText
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
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.enterprisePageHeader}>
        <Pressable style={styles.mapPickerClose} onPress={onBack}>
          <Ionicons name="arrow-back" size={21} color={colors.ink} />
        </Pressable>
        <View style={styles.flex}>
          <Text style={styles.eyebrowDark}>{copy.enterprisesTitle.toUpperCase()}</Text>
          <Text style={styles.enterprisePageTitle}>{copy.businessLogistics}</Text>
        </View>
      </View>

      <View style={styles.enterpriseHeroPanel}>
        <View style={styles.enterpriseHeroIcon}>
          <Ionicons name="business" size={30} color={colors.white} />
        </View>
        <Text style={styles.enterpriseHeroTitle}>{copy.moveGoodsBusiness}</Text>
        <Text style={styles.enterpriseHeroText}>{copy.enterpriseHeroText}</Text>
      </View>

      <SectionTitle title={copy.whatYouGet} />
      <View style={styles.enterpriseFeatureGrid}>
        {businessFeatures.map((feature) => (
          <View key={feature.title} style={styles.enterpriseFeatureCard}>
            <View style={styles.enterpriseFeatureIcon}>
              <Ionicons name={feature.icon} size={18} color={colors.customer} />
            </View>
            <Text style={styles.enterpriseFeatureTitle}>{feature.title}</Text>
            <Text style={styles.enterpriseFeatureText}>{feature.subtitle}</Text>
          </View>
        ))}
      </View>

      <SectionTitle title={copy.bestFor} />
      <View style={styles.enterpriseChipWrap}>
        {businessTypes.map((item) => (
          <View key={item} style={styles.enterpriseChip}>
            <Text style={styles.enterpriseChipText}>{item}</Text>
          </View>
        ))}
      </View>

      <View style={styles.enterpriseContactCard}>
        <Text style={styles.enterpriseFeatureTitle}>{copy.talkEnterprises}</Text>
        <Text style={styles.enterpriseFeatureText}>{copy.shareBusinessRoutes}</Text>
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
  return (
    <View>
      <SectionTitle title={copy.savedAddresses} />
      {addresses.length ? (
        <View style={styles.savedAddressList}>
          {addresses.map((address, index) => (
            <View
              key={address.id}
              style={[styles.savedAddressRow, index === addresses.length - 1 && styles.savedAddressRowLast]}
            >
              <View style={styles.savedAddressIcon}>
                <Ionicons name={address.type === 'home' ? 'home' : address.type === 'work' ? 'briefcase' : 'location'} size={18} color={colors.customer} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.savedAddressTitle}>{address.label}</Text>
                <Text style={styles.savedAddressSubtitle}>{address.addressLine || address.address}</Text>
                <Text style={styles.savedAddressMeta} numberOfLines={1}>{address.address}</Text>
              </View>
              <Pressable style={styles.savedAddressDeleteButton} disabled={busy} onPress={() => onDeleteAddress(address.id)}>
                <Ionicons name="trash-outline" size={17} color={colors.red} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.savedAddressEmpty}>
          <Ionicons name="bookmark-outline" size={24} color={colors.muted} />
          <Text style={styles.savedAddressEmptyTitle}>{copy.noSavedAddresses}</Text>
          <Text style={styles.mutedSmall}>{copy.savePickupDropAddresses}</Text>
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
  return (
    <View style={styles.accountPanel}>
      {languageOptions.map((option) => {
        const active = selected === option.id;
        return (
          <Pressable key={option.id} style={[styles.languageOption, active && styles.languageOptionActive]} onPress={() => onSelect(option.id)}>
            <View>
              <Text style={styles.languageTitle}>{option.id === 'hi' ? copy.languageHindi : copy.languageEnglish}</Text>
              <Text style={styles.languageSubtitle}>{languageNativeLabel(option.id)}</Text>
            </View>
            <Ionicons name={active ? 'radio-button-on' : 'radio-button-off'} size={18} color={colors.customer} />
          </Pressable>
        );
      })}
    </View>
  );
}

function SupportPanel() {
  const copy = useCopy();
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
    <View style={styles.accountPanel}>
      {supportActions.map((item) => (
        <Pressable key={item.title} style={styles.supportActionRow} onPress={item.action}>
          <View style={styles.accountMenuIcon}>
            <Ionicons name={item.icon} size={18} color={colors.customer} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.accountMenuTitle}>{item.title}</Text>
            <Text style={styles.accountMenuSubtitle}>{item.subtitle}</Text>
          </View>
          <Ionicons name="open-outline" size={17} color={colors.muted} />
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
  return (
    <Pressable style={[styles.accountMenuRow, last && styles.accountMenuRowLast]} onPress={onPress} disabled={!onPress}>
      <View style={styles.accountMenuIcon}>
        <Ionicons name={icon} size={18} color={colors.customer} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.accountMenuTitle}>{title}</Text>
        <Text style={styles.accountMenuSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={17} color={colors.muted} />
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
  const icons: Record<LegalPolicy['id'], keyof typeof Ionicons.glyphMap> = {
    privacy: 'lock-closed',
    terms: 'document-text',
    refunds: 'cash'
  };

  return (
    <View style={styles.policyCard}>
      <Pressable style={styles.policyHeader} onPress={onPress}>
        <View style={styles.policyIcon}>
          <Ionicons name={icons[policy.id]} size={18} color={colors.customer} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.cardTitle}>{policy.title}</Text>
          <Text style={styles.mutedSmall}>{copy.updated} {policy.updatedAt}</Text>
          <Text style={styles.policySummary}>{policy.summary}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </Pressable>
    </View>
  );
}

function AccountPolicyDetail({ policy, onBack }: { policy: LegalPolicy; onBack: () => void }) {
  const copy = useCopy();
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <AccountDetailHeader title={policy.title} subtitle={`${copy.updated} ${policy.updatedAt}`} onBack={onBack} />
      <View style={styles.policyDetailHero}>
        <Ionicons name={policy.id === 'privacy' ? 'lock-closed' : policy.id === 'terms' ? 'document-text' : 'cash'} size={24} color={colors.customer} />
        <Text style={styles.policyDetailSummary}>{policy.summary}</Text>
      </View>
      {policy.sections.map((section) => (
        <View key={section.heading} style={styles.policyDetailSection}>
          <Text style={styles.policyHeading}>{section.heading}</Text>
          {section.body.map((line) => (
            <Text key={line} style={styles.policyText}>{line}</Text>
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
  const tabs: Array<[Tab, keyof typeof Ionicons.glyphMap, string]> = [
    ['home', 'home', copy.homeTab],
    ['orders', 'reader', copy.ordersTab],
    ['wallet', 'wallet', copy.walletTab],
    ['account', 'person', copy.accountTab]
  ];
  return (
    <View style={styles.tabs}>
      {tabs.map(([key, icon, label]) => {
        const selected = active === key;
        return (
          <Pressable key={key} style={styles.tab} onPress={() => onChange(key)}>
            <View>
              <Ionicons name={icon} size={22} color={selected ? colors.customer : colors.muted} />
              {key === 'orders' && activeOrder ? <View style={styles.tabDot} /> : null}
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
      <View style={styles.orderCardHeader}>
        <View>
          <Text style={styles.orderNo}>{order.orderNo}</Text>
          <Text style={styles.orderCardDate}>{new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</Text>
        </View>
        <Badge label={statusLabel(language, order.status)} />
      </View>

      <View style={styles.orderCardRouteBox}>
        <View style={styles.route}>
          <View style={styles.routeDot} />
          <View style={styles.flex}>
            <Text style={styles.routeText} numberOfLines={1}>{order.pickup.label}</Text>
            <Text style={styles.mutedSmall}>{copy.pickup}</Text>
          </View>
        </View>
        {order.extraStops?.map((stop, index) => (
          <View key={`${order.id}-stop-${index}`} style={styles.route}>
            <View style={styles.routeDotStop} />
            <View style={styles.flex}>
              <Text style={styles.routeText} numberOfLines={1}>{stop.label}</Text>
              <Text style={styles.mutedSmall}>{copy.stop} {index + 1}</Text>
            </View>
          </View>
        ))}
        <View style={styles.route}>
          <View style={[styles.routeDot, styles.routeDotGreen]} />
          <View style={styles.flex}>
            <Text style={styles.routeText} numberOfLines={1}>{order.drop.label}</Text>
            <Text style={styles.mutedSmall}>{copy.drop}</Text>
          </View>
        </View>
      </View>

      <View style={styles.orderCardFareRow}>
        <View>
          <Text style={styles.orderCardVehicle}>{order.vehicle.shortName}</Text>
          <Text style={styles.mutedSmall}>{order.distanceKm} km - {goodsLabel(language, order.goodsType)}</Text>
        </View>
        <Text style={styles.priceText}>{money(order.fare.total)}</Text>
      </View>
      <View style={styles.orderMetaRow}>
        <Text style={styles.orderMetaText}>{order.paymentMode.toUpperCase()}</Text>
        <Text style={styles.orderMetaText}>{order.paymentStatus.toUpperCase()}</Text>
        <Text style={styles.orderMetaText}>{order.etaMinutes} min {copy.eta}</Text>
      </View>
      {actionTitle && onActionPress ? (
        <Pressable style={styles.orderCardActionButton} onPress={onActionPress}>
          <Ionicons name={actionIcon} size={15} color={colors.white} />
          <Text style={styles.orderCardActionText}>{actionTitle}</Text>
        </Pressable>
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable style={[styles.orderCard, selected && styles.orderCardSelected]} onPress={onPress}>
        {content}
      </Pressable>
    );
  }

  return (
    <View style={[styles.orderCard, selected && styles.orderCardSelected]}>
      {content}
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

function OrderActionButton({
  title,
  icon,
  tone = 'default',
  onPress
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone?: 'default' | 'primary' | 'danger';
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[
        styles.orderActionButton,
        tone === 'primary' && styles.orderActionButtonPrimary,
        tone === 'danger' && styles.orderActionButtonDanger
      ]}
      onPress={onPress}
    >
      <Ionicons
        name={icon}
        size={16}
        color={tone === 'primary' ? colors.white : tone === 'danger' ? colors.red : colors.ink}
      />
      <Text
        style={[
          styles.orderActionButtonText,
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
  partnerLocation
}: {
  pickup: LocationPoint;
  drop: LocationPoint;
  extraStops?: LocationPoint[];
  eta: number;
  partnerLocation?: Order['partnerLocation'];
}) {
  const copy = useCopy();
  const hasLiveLocation = typeof partnerLocation?.lat === 'number' && typeof partnerLocation?.lng === 'number';
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
  const partnerCoordinate = hasValidCoordinates(partnerLocation?.lat, partnerLocation?.lng)
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
  const fitKey = fitCoordinates.map((coordinate) => `${coordinate.latitude.toFixed(5)},${coordinate.longitude.toFixed(5)}`).join('|');

  useEffect(() => {
    if (!canRenderNativeMap || !mapRef.current || !fitCoordinates.length) return;
    const timer = setTimeout(() => {
      if (fitCoordinates.length === 1) {
        mapRef.current?.animateToRegion({ ...initialRegion, ...fitCoordinates[0] }, 250);
        return;
      }
      mapRef.current?.fitToCoordinates(fitCoordinates, {
        edgePadding: { top: 58, right: 38, bottom: 58, left: 38 },
        animated: true
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [canRenderNativeMap, fitKey]);

  return (
    <View style={styles.map}>
      {canRenderNativeMap ? (
        <MapView
          ref={mapRef}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          style={styles.mapNativeView}
          initialRegion={initialRegion}
          rotateEnabled={false}
          pitchEnabled={false}
          toolbarEnabled={false}
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
          {partnerCoordinate ? (
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
          <View style={[styles.vehiclePulse, hasLiveLocation && styles.vehiclePulseLive]} />
          <View style={[styles.vehicleMarker, hasLiveLocation && styles.vehicleMarkerLive]}>
            <Ionicons name="bicycle" size={16} color={colors.white} />
          </View>
        </>
      )}
      <View style={styles.etaChip}>
        <Text style={styles.etaValue}>{eta}</Text>
        <Text style={styles.etaLabel}>{copy.min}</Text>
      </View>
      <View style={styles.liveChip}>
        <View style={[styles.liveDot, hasLiveLocation && styles.liveDotOn]} />
        <Text style={styles.liveText}>{hasLiveLocation ? copy.liveGps : copy.waitingGps}</Text>
      </View>
      <Text style={styles.mapText} numberOfLines={1}>{pickup.label} {'->'} {stopLabel ? `${stopLabel} -> ` : ''}{drop.label}</Text>
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
    <View style={styles.fareCard}>
      <FareRow label={`Distance charge (${fare.billableKm} billable km)`} value={money(fare.distance)} />
      <FareRow label="Order value" value={money(fare.orderValue)} />
      {waitingCharge > 0 ? (
        <FareRow
          label={`Waiting charge (${waitingFare.billableWaitingMinutes ?? 0} min)`}
          value={`+${money(waitingCharge)}`}
        />
      ) : null}
      <FareRow label="GST" value={money(fare.gst)} />
      <FareRow label="Coins" value={`-${money(fare.coins)}`} />
      {hasWaitingPolicy ? (
        <Text style={styles.farePolicyText}>
          Waiting: {waitingFare.waitingFreeMinutes} min free, then {money(waitingFare.waitingPerMinute)}/min
        </Text>
      ) : null}
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

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue} numberOfLines={1}>{value}</Text>
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
    paddingTop: 16 + androidStatusBarHeight,
    paddingBottom: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  eyebrow: { color: '#DDD6FE', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  eyebrowDark: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1, textAlign: 'center' },
  headerTitle: { color: colors.white, fontSize: 22, fontWeight: '800' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: { color: colors.white, fontWeight: '800' },
  content: { flex: 1, marginTop: -14, backgroundColor: colors.white, borderTopLeftRadius: 22, borderTopRightRadius: 22, overflow: 'hidden' },
  homeContent: { marginTop: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0, backgroundColor: '#F8FAFC' },
  homeShell: { flex: 1, backgroundColor: '#F8FAFC', overflow: 'hidden' },
  homeMapPattern: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, opacity: 0.55 },
  homePatternRoad: { position: 'absolute', height: 18, borderRadius: 18, backgroundColor: '#E4EAF2' },
  homePatternRoadOne: { left: -56, right: 16, top: 118, transform: [{ rotate: '-31deg' }] },
  homePatternRoadTwo: { left: 98, right: -84, top: 220, transform: [{ rotate: '34deg' }] },
  homePatternRoadThree: { left: -76, right: -24, top: 384, transform: [{ rotate: '18deg' }] },
  homeScroll: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 102 },
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
    marginBottom: 18,
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2
  },
  homeLocationIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.customerLight, alignItems: 'center', justifyContent: 'center' },
  homeLocationIconSelected: { backgroundColor: colors.green },
  homeLocationLabel: { color: colors.muted, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  homeLocationTitle: { color: colors.ink, fontSize: 14, fontWeight: '900', marginTop: 2 },
  homeLocationSubtitle: { color: colors.muted, fontSize: 12, fontWeight: '700', marginTop: 2 },
  pickupSearchShell: { flex: 1, backgroundColor: '#F8FAFC' },
  pickupSearchKeyboard: { flex: 1 },
  pickupSearchTopBar: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 10, paddingTop: Platform.OS === 'android' ? androidStatusBarHeight + 6 : 6 },
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
  pickupSearchInput: { flex: 1, color: colors.ink, fontSize: 14, fontWeight: '800', paddingVertical: 11 },
  pickupSearchMapButton: { alignSelf: 'center', minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 14, paddingHorizontal: 12 },
  pickupSearchMapText: { color: colors.customer, fontSize: 12, fontWeight: '900' },
  pickupSearchCurrentButton: { alignSelf: 'center', minHeight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 12 },
  pickupSearchCurrentText: { color: colors.customer, fontSize: 12, fontWeight: '900' },
  pickupSearchError: { color: colors.red, fontSize: 12, fontWeight: '900', marginHorizontal: 18, marginTop: 8, textAlign: 'center' },
  pickupSearchResults: { flex: 1, marginTop: 10 },
  pickupSearchResultsContent: { paddingHorizontal: 8, paddingBottom: 24 },
  pickupSearchResultItem: { minHeight: 58, borderBottomWidth: 1, borderBottomColor: colors.line, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 10, paddingVertical: 10, backgroundColor: colors.white },
  pickupSearchResultIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.customerLight, alignItems: 'center', justifyContent: 'center' },
  pickupSearchResultTitle: { color: colors.ink, fontSize: 13, fontWeight: '900' },
  pickupSearchResultSubtitle: { color: colors.muted, fontSize: 11, fontWeight: '700', marginTop: 2 },
  homeServiceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  homeServiceCard: {
    width: '48%',
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
  homeServiceArt: { height: 76, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  homeServiceArtHalo: { position: 'absolute', width: 104, height: 58, borderRadius: 29, opacity: 0.95 },
  homeServiceArtShadow: { position: 'absolute', bottom: 7, width: 64, height: 5, borderRadius: 5, opacity: 0.18 },
  homeVehicleImage: { width: 96, height: 70 },
  homeVehicleImageBike: { width: 92, height: 72 },
  homeVehicleImageLoader: { width: 90, height: 66, borderRadius: 10 },
  homeServiceFooter: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  homeServiceTitle: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  homeServiceSubtitle: { color: colors.muted, fontSize: 11, fontWeight: '700', lineHeight: 15, marginTop: 3 },
  homeRewardCard: {
    minHeight: 64,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#FDE68A',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    marginTop: 18
  },
  homeRewardIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFFBEB', alignItems: 'center', justifyContent: 'center' },
  homeRewardTitle: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  homeRewardText: { color: colors.muted, fontSize: 11, fontWeight: '700', marginTop: 2 },
  homeAnnouncementHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 10 },
  homeAnnouncementTitle: { color: colors.muted, fontSize: 13, fontWeight: '900' },
  homeSeeAllButton: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  homeSeeAllText: { color: colors.customer, fontSize: 12, fontWeight: '900' },
  homeAnnouncementCarousel: { borderRadius: 16, overflow: 'hidden' },
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
  homeAnnouncementIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  homeAnnouncementCopy: { color: colors.ink, fontSize: 13, fontWeight: '900' },
  homeAnnouncementMeta: { color: colors.muted, fontSize: 11, fontWeight: '700', marginTop: 3 },
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
  homeActiveTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 3 },
  homeActiveOrderNo: { color: colors.ink, fontSize: 12, fontWeight: '900' },
  homeActiveRoute: { color: colors.ink, fontSize: 13, fontWeight: '800', marginBottom: 2 },
  homeActiveVehicle: { color: colors.muted, fontSize: 11, fontWeight: '800' },
  scroll: { padding: 16, paddingBottom: 96 },
  customerHero: { backgroundColor: colors.white, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.line, gap: 14 },
  heroTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  heroTitle: { color: colors.ink, fontSize: 22, fontWeight: '900', lineHeight: 27, maxWidth: 230 },
  cityPill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, backgroundColor: colors.customerLight, paddingVertical: 6, paddingHorizontal: 9 },
  cityPillText: { color: colors.customer, fontSize: 11, fontWeight: '900' },
  heroCard: { backgroundColor: colors.white, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.line, gap: 12 },
  heroLabel: { fontSize: 11, color: colors.muted, fontWeight: '800', letterSpacing: 1 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.faint, borderRadius: 14, padding: 14 },
  searchText: { flex: 1, color: colors.muted, fontSize: 14 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  serviceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  serviceCard: { width: '48%', minHeight: 112, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.white, padding: 14, gap: 6 },
  serviceIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.customerLight, alignItems: 'center', justifyContent: 'center' },
  serviceTitle: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  serviceSubtitle: { color: colors.muted, fontSize: 11, fontWeight: '700', lineHeight: 15 },
  quickActionBand: { flexDirection: 'row', gap: 10, marginTop: 14 },
  quickAction: { flex: 1, minHeight: 46, borderRadius: 14, backgroundColor: colors.customer, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 },
  quickActionText: { color: colors.white, fontSize: 14, fontWeight: '900' },
  quickActionSecondary: { flex: 1, minHeight: 46, borderRadius: 14, backgroundColor: colors.customerLight, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 },
  quickActionSecondaryText: { color: colors.customer, fontSize: 14, fontWeight: '900' },
  rebookCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.white, padding: 14, marginTop: 14 },
  rebookIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.customerLight, alignItems: 'center', justifyContent: 'center' },
  promiseBand: { flexDirection: 'row', gap: 8, marginTop: 14 },
  promiseItem: { flex: 1, minHeight: 42, borderRadius: 12, backgroundColor: colors.partnerLight, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 6 },
  promiseText: { color: colors.green, fontSize: 10, fontWeight: '900', textAlign: 'center' },
  statRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  statCard: { flex: 1, borderRadius: 14, padding: 14 },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 11, fontWeight: '700', marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.ink, marginTop: 20, marginBottom: 10 },
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
  ordersTitle: { color: colors.ink, fontSize: 22, fontWeight: '900', marginTop: 3 },
  ordersHeroSubtitle: { color: colors.muted, fontSize: 12, fontWeight: '800', marginTop: 4 },
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
  liveOrderHeader: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 12 },
  liveOrderIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.customer, alignItems: 'center', justifyContent: 'center' },
  liveOrderTitle: { color: colors.ink, fontSize: 16, fontWeight: '900' },
  liveOrderNo: { color: colors.muted, fontSize: 11, fontWeight: '800', marginTop: 2 },
  orderDetailHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  orderDetailClose: { width: 30, height: 30, borderRadius: 10, backgroundColor: colors.faint, alignItems: 'center', justifyContent: 'center' },
  liveRouteCard: { borderRadius: 15, backgroundColor: '#F8FAFC', padding: 12, marginBottom: 12 },
  liveRouteLine: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  liveRouteDot: { width: 10, height: 10, borderRadius: 5 },
  liveRoutePickupDot: { backgroundColor: colors.customer },
  liveRouteStopDot: { backgroundColor: colors.amber },
  liveRouteDropDot: { backgroundColor: colors.green },
  liveRouteLabel: { color: colors.muted, fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  liveRouteText: { color: colors.ink, fontSize: 13, fontWeight: '900', marginTop: 2 },
  liveOrderMetrics: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  liveOrderMetric: { flex: 1, borderRadius: 13, backgroundColor: '#F8FAFC', padding: 10 },
  liveOrderMetricValue: { color: colors.ink, fontSize: 13, fontWeight: '900' },
  liveOrderMetricLabel: { color: colors.muted, fontSize: 10, fontWeight: '800', marginTop: 3 },
  activeOrderCard: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 14, backgroundColor: colors.white, marginBottom: 12 },
  countdownCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.customerLight, borderRadius: 14, padding: 12, marginTop: 2, marginBottom: 10 },
  countdownCardDelayed: { backgroundColor: '#FEF2F2' },
  countdownValue: { color: colors.customer, fontSize: 22, fontWeight: '900' },
  countdownValueDelayed: { color: colors.red, fontSize: 16 },
  countdownLabel: { color: colors.muted, fontSize: 11, fontWeight: '800' },
  assignedPartnerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, backgroundColor: '#F8FAFC', padding: 12, marginTop: 4 },
  searchingPartnerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, backgroundColor: '#F8FAFC', padding: 12, marginTop: 4 },
  searchingPartnerText: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  compactOtpRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  compactOtpBox: { flex: 1, backgroundColor: colors.customerLight, borderRadius: 14, padding: 11, alignItems: 'center' },
  compactOtpText: { color: colors.customer, fontSize: 18, fontWeight: '900', marginTop: 2 },
  ordersOtpPanel: { borderRadius: 14, backgroundColor: colors.customerLight, padding: 12, marginTop: 12 },
  ordersOtpTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  ordersOtpTitle: { color: colors.customer, fontSize: 13, fontWeight: '900' },
  ordersOtpRow: { flexDirection: 'row', gap: 10 },
  orderActionBar: { flexDirection: 'row', gap: 8, marginTop: 12 },
  orderActionButton: { flex: 1, minHeight: 40, borderRadius: 13, backgroundColor: colors.faint, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 8 },
  orderActionButtonPrimary: { backgroundColor: colors.customer },
  orderActionButtonDanger: { backgroundColor: '#FEF2F2' },
  orderActionButtonText: { color: colors.ink, fontSize: 12, fontWeight: '900' },
  orderActionButtonTextPrimary: { color: colors.white },
  orderActionButtonTextDanger: { color: colors.red },
  timelinePanel: { marginBottom: 4 },
  timelinePanelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  noActiveOrderCard: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.white, padding: 18, alignItems: 'center', gap: 8 },
  historyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  orderCard: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 14, marginBottom: 12, backgroundColor: colors.white },
  orderCardSelected: { borderColor: colors.customer, backgroundColor: colors.customerLight },
  activeOrderSwitchRow: { gap: 10, paddingBottom: 10 },
  activeOrderSwitchCard: { width: 190, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.white, padding: 12 },
  activeOrderSwitchCardActive: { borderColor: colors.customer, backgroundColor: colors.customerLight },
  activeOrderSwitchTitle: { color: colors.ink, fontSize: 13, fontWeight: '900' },
  activeOrderSwitchTitleActive: { color: colors.customer },
  activeOrderSwitchMeta: { color: colors.muted, fontSize: 11, fontWeight: '700', marginTop: 5 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 8 },
  orderNo: { color: colors.muted, fontSize: 11, fontWeight: '800' },
  orderCardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 10 },
  orderCardDate: { color: colors.ink, fontSize: 14, fontWeight: '900', marginTop: 2 },
  orderCardRouteBox: { borderRadius: 14, backgroundColor: '#F8FAFC', padding: 10, marginBottom: 10 },
  orderCardFareRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 },
  orderCardVehicle: { color: colors.ink, fontSize: 13, fontWeight: '900' },
  badge: { backgroundColor: colors.customerLight, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 },
  badgeText: { color: colors.customer, fontSize: 11, fontWeight: '800' },
  route: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  routeDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.customer },
  routeDotStop: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.amber },
  routeDotGreen: { backgroundColor: colors.green },
  routeText: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  muted: { color: colors.muted, marginTop: 8, textAlign: 'center' },
  mutedSmall: { color: colors.muted, fontSize: 12 },
  emptyHistoryCard: { borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.white, padding: 18, alignItems: 'center', marginBottom: 12 },
  priceText: { color: colors.customer, fontSize: 13, fontWeight: '800' },
  bookingStepHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  bookingStepBack: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.faint, alignItems: 'center', justifyContent: 'center' },
  bookingStepTitle: { color: colors.ink, fontSize: 20, fontWeight: '900' },
  bookingStepSubtitle: { color: colors.muted, fontSize: 11, fontWeight: '800', marginTop: 2 },
  bookingStepCount: { color: colors.customer, fontSize: 12, fontWeight: '900', backgroundColor: colors.customerLight, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 9 },
  bookingProgressTrack: { height: 4, borderRadius: 4, backgroundColor: colors.faint, marginBottom: 16, overflow: 'hidden' },
  bookingProgressFill: { height: 4, borderRadius: 4, backgroundColor: colors.customer },
  stepRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  stepDot: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.faint, alignItems: 'center', justifyContent: 'center' },
  stepDotActive: { backgroundColor: colors.customer },
  stepText: { color: colors.muted, fontWeight: '800' },
  stepTextActive: { color: colors.white },
  serviceGridCompact: { gap: 10, marginBottom: 8 },
  serviceOptionCard: { minHeight: 58, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.white, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 11 },
  serviceOptionCardActive: { borderColor: colors.customer, backgroundColor: colors.customerLight },
  serviceOptionTitle: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  vehicleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  vehicleCard: { width: '48%', borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 14, gap: 5 },
  vehicleCardActive: { borderColor: colors.customer, backgroundColor: colors.customerLight },
  vehicleCardSuggested: { borderColor: colors.green, backgroundColor: colors.partnerLight },
  vehicleCardDisabled: { opacity: 0.55, backgroundColor: colors.faint },
  vehicleCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  vehicleBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 },
  vehicleSuggestedBadge: { backgroundColor: colors.green, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3 },
  vehicleSuggestedText: { color: colors.white, fontSize: 9, fontWeight: '900' },
  vehicleEta: { color: colors.green, fontSize: 11, fontWeight: '900', backgroundColor: colors.partnerLight, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  vehicleName: { color: colors.ink, fontWeight: '800', fontSize: 14 },
  vehicleNameDisabled: { color: colors.muted },
  vehiclePriceLine: { color: colors.customer, fontSize: 13, fontWeight: '900' },
  vehicleSelectedText: { color: colors.customer, fontSize: 11, fontWeight: '900' },
  vehicleUnavailableText: { color: colors.red, fontSize: 11, fontWeight: '900' },
  fieldGroup: { marginBottom: 12 },
  fieldLabel: { color: colors.muted, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.ink },
  inputReadonly: { backgroundColor: colors.faint },
  locationFieldGroup: { marginBottom: 14 },
  routeLocationFieldGroup: { marginBottom: 0 },
  locationLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  locationInputShell: { minHeight: 50, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12 },
  locationInputShellActive: { borderColor: colors.customer, backgroundColor: '#FBFAFF' },
  routeLocationInputShell: { minHeight: 48, borderColor: colors.customer, borderRadius: 12, paddingLeft: 11, paddingRight: 7 },
  routeLocationMapButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.faint, alignItems: 'center', justifyContent: 'center' },
  locationInput: { flex: 1, color: colors.ink, fontSize: 15, fontWeight: '800', paddingVertical: 10 },
  locationSelectedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.customerLight, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 8 },
  locationSelectedText: { color: colors.customer, fontSize: 10, fontWeight: '900' },
  locationSuggestionBox: { borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.white, marginTop: 8, overflow: 'hidden' },
  locationSuggestionItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.line },
  locationTypedSuggestionItem: { backgroundColor: colors.customerLight },
  locationTypedSuggestionIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  locationSuggestionTitle: { color: colors.ink, fontSize: 13, fontWeight: '900' },
  locationSuggestionSubtitle: { color: colors.muted, fontSize: 11, fontWeight: '700', marginTop: 2 },
  locationHint: { color: colors.muted, fontSize: 11, fontWeight: '700', marginTop: 7, lineHeight: 15 },
  locationError: { color: colors.red, fontSize: 11, fontWeight: '800', marginTop: 7 },
  mapSelectButton: { alignSelf: 'flex-start', minHeight: 36, borderRadius: 12, backgroundColor: colors.customerLight, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, marginTop: 8 },
  mapSelectText: { color: colors.customer, fontSize: 12, fontWeight: '900' },
  mapPickerShell: { flex: 1, backgroundColor: colors.white, paddingHorizontal: 16, paddingBottom: 16, paddingTop: Platform.OS === 'android' ? androidStatusBarHeight + 16 : 16 },
  mapPickerHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  mapPickerClose: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.faint, alignItems: 'center', justifyContent: 'center' },
  mapPickerTitle: { color: colors.ink, fontSize: 20, fontWeight: '900' },
  mapPickerSubtitle: { color: colors.muted, fontSize: 12, fontWeight: '700', marginTop: 2 },
  mapPickerSearchShell: { minHeight: 52, borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13 },
  mapPickerSearchInput: { flex: 1, color: colors.ink, fontSize: 14, fontWeight: '800', paddingVertical: 11 },
  mapPickerSuggestionBox: { borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.white, marginTop: 8, overflow: 'hidden', maxHeight: 210 },
  mapPickerCanvas: { flex: 1, minHeight: 300, borderRadius: 18, backgroundColor: '#EAF5EF', overflow: 'hidden', marginTop: 14, marginBottom: 12 },
  mapPickerRealMap: { flex: 1 },
  mapPickerFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24, backgroundColor: '#EFF6FF' },
  mapPickerFallbackText: { color: colors.ink, fontSize: 13, fontWeight: '800', lineHeight: 18, textAlign: 'center' },
  mapPickerPinOverlay: { position: 'absolute', left: '50%', top: '50%', width: 44, height: 44, marginLeft: -22, marginTop: -40, alignItems: 'center', justifyContent: 'center' },
  mapPickerHint: { position: 'absolute', left: 16, right: 16, bottom: 14, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.94)', paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center' },
  mapPickerHintText: { color: colors.ink, fontSize: 12, fontWeight: '900' },
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
  mapPickerSelectedTitle: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  mapPickerCoords: { color: colors.muted, fontSize: 11, fontWeight: '800', marginTop: 2 },
  mapPickerControls: { alignItems: 'center', gap: 8, marginBottom: 12 },
  mapPickerControlMiddle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mapPickerControlButton: { width: 42, height: 38, borderRadius: 13, backgroundColor: colors.faint, alignItems: 'center', justifyContent: 'center' },
  mapPickerBottomPanel: { gap: 10, paddingTop: 2, paddingBottom: Platform.OS === 'android' ? 18 : 0 },
  mapPickerCurrentButton: { minHeight: 44, borderRadius: 14, borderWidth: 1, borderColor: '#BFDBFE', backgroundColor: colors.customerLight, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 14 },
  mapPickerCurrentText: { color: colors.customer, fontSize: 12, fontWeight: '900' },
  mapPickerActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  savedAddressStrip: { marginTop: -4, marginBottom: 12 },
  savedAddressStripTitle: { color: colors.muted, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', marginBottom: 8 },
  savedAddressChips: { gap: 10, paddingRight: 16 },
  savedAddressChip: { width: 190, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.white, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 8 },
  savedAddressChipTextWrap: { flex: 1 },
  savedAddressChipTitle: { color: colors.ink, fontSize: 12, fontWeight: '900' },
  savedAddressChipSubtitle: { color: colors.muted, fontSize: 10, fontWeight: '700', marginTop: 2 },
  stopFieldWrap: { marginBottom: 4 },
  addStopButton: { minHeight: 44, borderRadius: 14, borderWidth: 1, borderColor: colors.customer, borderStyle: 'dashed', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 14 },
  addStopText: { color: colors.customer, fontSize: 13, fontWeight: '900' },
  removeStopButton: { alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: -7, marginBottom: 8 },
  removeStopText: { color: colors.red, fontSize: 11, fontWeight: '900' },
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
  routeEntryPickupRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 2 },
  routeEntryDropRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 2 },
  routeEntryDot: { width: 8, height: 8, borderRadius: 4 },
  routeEntryDotPickup: { backgroundColor: colors.green },
  routeEntryDotDrop: { backgroundColor: colors.red },
  routeEntryDivider: { height: 1, backgroundColor: colors.line, marginLeft: 18, marginVertical: 9 },
  contactGrid: { marginBottom: 4 },
  contactDetailsCard: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.white, padding: 14, marginBottom: 14 },
  contactHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 },
  contactTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  contactTitle: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  contactSubtitle: { color: colors.muted, fontSize: 11, fontWeight: '700', marginTop: 2 },
  contactSummaryCard: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.white, padding: 14, marginBottom: 12 },
  contactSummaryValue: { color: colors.ink, fontSize: 13, fontWeight: '900', marginBottom: 4 },
  contactSummaryMissing: { color: colors.customer, fontSize: 13, fontWeight: '900', marginBottom: 4 },
  contactSummaryLocation: { color: colors.muted, fontSize: 11, fontWeight: '800', marginBottom: 10 },
  contactPageShell: { flex: 1, backgroundColor: colors.white, paddingTop: Platform.OS === 'android' ? androidStatusBarHeight : 0 },
  contactPageKeyboard: { flex: 1 },
  contactPageForm: { flex: 1, backgroundColor: colors.white },
  contactPageFormContent: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 12 },
  contactPageHeader: { marginBottom: 12 },
  contactPageActions: { marginTop: 4 },
  contactPageFooter: { backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.line, paddingHorizontal: 16, paddingTop: 12, paddingBottom: Platform.OS === 'android' ? 34 : 16 },
  contactSheetOverlay: { flex: 1, justifyContent: 'flex-end' },
  contactSheetBackdrop: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(17,24,39,0.42)' },
  contactSheet: { maxHeight: '92%', backgroundColor: colors.white, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 16, paddingBottom: Platform.OS === 'android' ? 20 : 18 },
  contactSheetScroll: { paddingBottom: 2 },
  contactSheetHandle: { width: 44, height: 4, borderRadius: 4, backgroundColor: colors.line, alignSelf: 'center', marginBottom: 12 },
  contactSheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  contactSheetTitle: { color: colors.ink, fontSize: 20, fontWeight: '900' },
  contactSheetSubtitle: { color: colors.muted, fontSize: 12, fontWeight: '800', marginTop: 2 },
  contactPlaceBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.faint, borderRadius: 14, padding: 12, marginBottom: 12 },
  contactPlaceText: { flex: 1, color: colors.ink, fontSize: 12, fontWeight: '800', lineHeight: 17 },
  contactExactHero: { backgroundColor: colors.white },
  contactExactCard: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.white, padding: 12, marginBottom: 12 },
  contactExactHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 10 },
  contactExactIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  contactExactTitle: { color: colors.ink, fontSize: 13, fontWeight: '900' },
  contactExactAddress: { color: colors.muted, fontSize: 11, fontWeight: '800', marginTop: 2 },
  contactMapSearchShell: { minHeight: 44, borderWidth: 1, borderColor: colors.line, borderRadius: 13, backgroundColor: colors.faint, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 11, marginBottom: 9 },
  contactMapSearchInput: { flex: 1, color: colors.ink, fontSize: 13, fontWeight: '800', paddingVertical: 9 },
  contactMapSuggestionBox: { borderWidth: 1, borderColor: colors.line, borderRadius: 13, backgroundColor: colors.white, marginBottom: 9, overflow: 'hidden', maxHeight: 145 },
  contactMapCanvas: { height: 178, borderRadius: 15, backgroundColor: '#EAF5EF', overflow: 'hidden', marginBottom: 10 },
  contactMapHeroCanvas: { height: 410, backgroundColor: '#EAF5EF', overflow: 'hidden' },
  contactMapRealMap: { flex: 1 },
  contactMapHint: { position: 'absolute', left: 12, right: 12, bottom: 10, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.94)', paddingVertical: 7, paddingHorizontal: 10, alignItems: 'center' },
  contactMapHeroHint: { position: 'absolute', left: 70, right: 70, top: 84, borderRadius: 8, backgroundColor: 'rgba(17,24,39,0.88)', paddingVertical: 8, paddingHorizontal: 10, alignItems: 'center' },
  contactMapHeroHintText: { color: colors.white, fontSize: 11, fontWeight: '900' },
  contactMapBackButton: { position: 'absolute', left: 10, top: 16, width: 38, height: 38, borderRadius: 19, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', shadowColor: '#0F172A', shadowOpacity: 0.16, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  contactMapTitlePill: { position: 'absolute', alignSelf: 'center', top: 90, minHeight: 31, borderRadius: 5, backgroundColor: 'rgba(17,24,39,0.88)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 15 },
  contactMapTitleText: { color: colors.white, fontSize: 11, fontWeight: '900' },
  contactLocationPanel: { borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: colors.white, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, marginTop: -18, shadowColor: '#0F172A', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: -4 }, elevation: 4 },
  contactExactFooter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  contactUseCurrentButton: { flex: 1, minHeight: 40, borderRadius: 12, borderWidth: 1, borderColor: '#BFDBFE', backgroundColor: colors.customerLight, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 10 },
  contactUseCurrentText: { color: colors.customer, fontSize: 11, fontWeight: '900' },
  contactPagePanel: { flex: 1, backgroundColor: colors.white, borderTopLeftRadius: 18, borderTopRightRadius: 18, marginTop: 0, shadowColor: '#0F172A', shadowOpacity: 0.10, shadowRadius: 10, shadowOffset: { width: 0, height: -3 }, elevation: 5 },
  contactPagePanelContent: { paddingHorizontal: 13, paddingTop: 7, paddingBottom: Platform.OS === 'android' ? 18 : 14 },
  contactAddressHeader: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 8 },
  contactAddressTitle: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  contactAddressSubtitle: { color: colors.ink, opacity: 0.7, fontSize: 11, fontWeight: '700', marginTop: 3 },
  contactChangeButton: { minWidth: 64, minHeight: 34, borderRadius: 5, borderWidth: 1, borderColor: '#D8D3C6', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, backgroundColor: colors.white },
  contactChangeButtonText: { color: colors.customer, fontSize: 11, fontWeight: '900' },
  contactFormField: { marginBottom: 8 },
  contactFormLabel: { color: colors.muted, fontSize: 10, fontWeight: '800', marginBottom: 3 },
  contactFormInputShell: { minHeight: 39, borderWidth: 1, borderColor: '#DDE3EC', borderRadius: 6, backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 10 },
  contactFormInput: { flex: 1, color: colors.ink, fontSize: 13, fontWeight: '700', paddingVertical: 8 },
  contactMobileCheckRow: { minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 1, marginBottom: 11 },
  contactMobileCheckText: { flex: 1, color: colors.ink, fontSize: 11, fontWeight: '800' },
  contactSaveAsLabel: { color: colors.muted, fontSize: 11, fontWeight: '800', marginBottom: 8 },
  contactTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  contactTypeChip: { minHeight: 36, minWidth: 75, borderRadius: 6, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 10 },
  contactTypeChipActive: { borderColor: '#93C5FD', backgroundColor: colors.customerLight },
  contactTypeChipText: { color: colors.ink, fontSize: 11, fontWeight: '900' },
  contactTypeChipTextActive: { color: colors.customer },
  contactConfirmButton: { minHeight: 48, borderRadius: 5, backgroundColor: colors.customer, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, marginTop: 2 },
  contactConfirmButtonText: { color: colors.white, fontSize: 13, fontWeight: '900' },
  contactSheetActions: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 4 },
  sameAsUserPanel: { borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.faint, padding: 12, marginBottom: 12 },
  sameAsUserTitle: { color: colors.ink, fontSize: 13, fontWeight: '900', marginBottom: 9 },
  sameAsUserActions: { flexDirection: 'row', gap: 8 },
  sameAsUserButton: { flex: 1, minHeight: 38, borderRadius: 12, backgroundColor: colors.customerLight, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 8 },
  sameAsUserButtonAlt: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  sameAsUserButtonText: { color: colors.customer, fontSize: 11, fontWeight: '900' },
  sameAsUserButtonAltText: { color: colors.ink },
  useMyDetailsButton: { alignSelf: 'flex-start', borderRadius: 999, backgroundColor: colors.customerLight, paddingVertical: 7, paddingHorizontal: 10, marginBottom: 8 },
  useMyDetailsText: { color: colors.customer, fontSize: 11, fontWeight: '900' },
  contactDivider: { height: 1, backgroundColor: colors.line, marginTop: 4, marginBottom: 14 },
  contactError: { color: colors.red, fontSize: 12, fontWeight: '900', marginTop: -6, marginBottom: 12 },
  addressHelperText: { color: colors.muted, fontSize: 10, fontWeight: '800', marginTop: -6, marginBottom: 10 },
  saveAddressInlineButton: { alignSelf: 'flex-start', minHeight: 34, borderRadius: 12, backgroundColor: colors.customerLight, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, marginBottom: 10 },
  saveAddressInlineText: { color: colors.customer, fontSize: 11, fontWeight: '900' },
  notice: { flexDirection: 'row', gap: 8, backgroundColor: '#FFFBEB', borderRadius: 12, padding: 12, marginBottom: 14 },
  noticeText: { flex: 1, color: '#92400E', fontSize: 12, fontWeight: '700' },
  noticeInfo: { flexDirection: 'row', gap: 8, backgroundColor: '#EFF6FF', borderRadius: 12, padding: 12, marginBottom: 14 },
  noticeInfoText: { flex: 1, color: colors.blue, fontSize: 12, fontWeight: '800' },
  goodsChipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  goodsChip: { borderWidth: 1, borderColor: colors.line, borderRadius: 999, backgroundColor: colors.white, paddingVertical: 9, paddingHorizontal: 12 },
  goodsChipActive: { borderColor: colors.customer, backgroundColor: colors.customerLight },
  goodsChipText: { color: colors.muted, fontSize: 12, fontWeight: '900' },
  goodsChipTextActive: { color: colors.customer },
  goodsRulesSheet: { maxHeight: '82%' },
  goodsRulesScroll: { gap: 12, paddingBottom: 12 },
  goodsRulesPanel: { borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 12 },
  goodsRulesAllowedPanel: { backgroundColor: colors.partnerLight, borderColor: '#BBF7D0' },
  goodsRulesRestrictedPanel: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  goodsRulesPanelHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 },
  goodsRulesPanelTitle: { color: colors.ink, fontSize: 13, fontWeight: '900' },
  goodsRulesItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 4 },
  goodsRulesBullet: { width: 6, height: 6, borderRadius: 3, marginTop: 6 },
  goodsRulesBulletAllowed: { backgroundColor: colors.green },
  goodsRulesBulletRestricted: { backgroundColor: colors.red },
  goodsRulesItemText: { flex: 1, color: colors.ink, fontSize: 12, fontWeight: '700', lineHeight: 17 },
  routeReviewCard: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.white, padding: 14, marginBottom: 14 },
  routeReviewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 },
  changeRouteButton: { minHeight: 34, borderRadius: 12, backgroundColor: colors.customerLight, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9 },
  changeRouteText: { color: colors.customer, fontSize: 11, fontWeight: '900' },
  routeReviewLine: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  routeReviewDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.customer },
  routeReviewDotDrop: { backgroundColor: colors.green },
  routeReviewTitle: { color: colors.ink, fontSize: 13, fontWeight: '900' },
  vehicleFareCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderColor: colors.customer, borderRadius: 16, backgroundColor: colors.customerLight, padding: 14, marginBottom: 14 },
  vehicleFareIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  vehicleFareMeta: { color: colors.muted, fontSize: 12, fontWeight: '800', marginTop: 2, marginBottom: 2 },
  vehicleFarePrice: { color: colors.ink, fontSize: 18, fontWeight: '900' },
  vehicleRoutePanel: { borderWidth: 1, borderColor: colors.line, borderRadius: 18, backgroundColor: colors.white, padding: 14, marginBottom: 14 },
  vehicleRouteActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.line, marginTop: 9, paddingTop: 10 },
  vehicleRouteAction: { flex: 1, minHeight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  vehicleRouteActionText: { color: colors.customer, fontSize: 12, fontWeight: '900' },
  vehicleFareList: { borderRadius: 18, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, overflow: 'hidden', marginBottom: 14 },
  vehicleFareOption: { minHeight: 78, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderBottomWidth: 1, borderBottomColor: colors.line },
  vehicleFareOptionSelected: { minHeight: 104, backgroundColor: '#EFF6FF', borderWidth: 1.5, borderColor: colors.blue, borderRadius: 16, margin: 8 },
  vehicleFareOptionDisabled: { opacity: 0.55, backgroundColor: colors.faint },
  vehicleFareOptionIcon: { width: 52, height: 44, borderRadius: 12, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  vehicleFareOptionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' },
  vehicleFareOptionTitle: { color: colors.ink, fontSize: 15, fontWeight: '900' },
  vehicleFareOptionMeta: { color: colors.muted, fontSize: 12, fontWeight: '800', marginTop: 3 },
  vehicleFareOptionPriceWrap: { alignItems: 'flex-end', gap: 4 },
  vehicleFareOptionPrice: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  vehicleNewBadge: { borderRadius: 7, backgroundColor: '#F97316', paddingHorizontal: 6, paddingVertical: 2 },
  vehicleNewBadgeText: { color: colors.white, fontSize: 9, fontWeight: '900' },
  vehicleMiniArt: { width: 50, height: 40, alignItems: 'center', justifyContent: 'center' },
  vehicleMiniShadow: { position: 'absolute', bottom: 2, width: 34, height: 4, borderRadius: 4, opacity: 0.14 },
  vehicleMiniImage: { width: 48, height: 38 },
  vehicleMiniImageBike: { width: 46, height: 39 },
  vehicleMiniImageLoader: { width: 46, height: 34, borderRadius: 8 },
  vehicleMiniImageMuted: { opacity: 0.5 },
  bookingSummaryCard: { borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.white, padding: 14, marginBottom: 14 },
  summaryTitle: { color: colors.ink, fontSize: 14, fontWeight: '900', marginBottom: 8 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 7 },
  summaryLabel: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  summaryValue: { flex: 1, color: colors.ink, fontSize: 12, fontWeight: '900', textAlign: 'right' },
  payRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 14, marginBottom: 10 },
  payRowActive: { backgroundColor: colors.customerLight, borderColor: colors.customer },
  payRowDisabled: { opacity: 0.55, backgroundColor: colors.faint },
  payText: { color: colors.ink, fontWeight: '800' },
  payTextDisabled: { color: colors.muted },
  map: { height: 218, borderRadius: 16, backgroundColor: '#E5E7EB', overflow: 'hidden', marginBottom: 12 },
  mapNativeView: { flex: 1 },
  mapRoad: { position: 'absolute', top: 72, left: -20, right: -20, height: 20, backgroundColor: '#DDD6FE', transform: [{ rotate: '-8deg' }] },
  mapRoadTwo: { top: 30, transform: [{ rotate: '12deg' }], opacity: 0.7 },
  mapRoute: { position: 'absolute', left: 72, top: 88, width: 190, height: 4, borderRadius: 2, backgroundColor: colors.customer },
  mapPinA: { position: 'absolute', left: 64, top: 78, width: 18, height: 18, borderRadius: 9, backgroundColor: colors.customer },
  mapPinB: { position: 'absolute', left: 248, top: 78, width: 18, height: 18, borderRadius: 9, backgroundColor: colors.green },
  mapStopPin: { position: 'absolute', left: 128, top: 74, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.amber, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.white },
  mapStopPinTwo: { left: 172, top: 86 },
  mapStopPinThree: { left: 208, top: 68 },
  mapStopText: { color: colors.white, fontSize: 10, fontWeight: '900' },
  vehiclePulse: { position: 'absolute', left: 144, top: 68, width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(124,58,237,0.14)' },
  vehiclePulseLive: { backgroundColor: 'rgba(5,150,105,0.16)' },
  vehicleMarker: { position: 'absolute', left: 153, top: 77, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.customer, alignItems: 'center', justifyContent: 'center' },
  vehicleMarkerLive: { backgroundColor: colors.green },
  etaChip: { position: 'absolute', right: 12, top: 12, backgroundColor: colors.white, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center', shadowColor: '#0F172A', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  etaValue: { color: colors.customer, fontSize: 20, fontWeight: '800' },
  etaLabel: { color: colors.muted, fontSize: 9, fontWeight: '800' },
  liveChip: { position: 'absolute', left: 12, top: 12, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.white, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 10, shadowColor: '#0F172A', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.muted },
  liveDotOn: { backgroundColor: colors.green },
  liveText: { color: colors.ink, fontSize: 11, fontWeight: '800' },
  mapPartnerMarker: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.green, borderWidth: 3, borderColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  mapText: { position: 'absolute', left: 12, bottom: 12, right: 12, color: colors.ink, fontSize: 12, fontWeight: '800', backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 10, paddingVertical: 7, paddingHorizontal: 10, overflow: 'hidden' },
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
  farePolicyText: { color: colors.muted, fontSize: 11, fontWeight: '800', marginTop: 2, marginBottom: 8 },
  orderMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  orderMetaText: { color: colors.muted, fontSize: 10, fontWeight: '900', backgroundColor: colors.faint, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 8 },
  orderCardActionButton: { minHeight: 38, borderRadius: 13, backgroundColor: colors.customer, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10 },
  orderCardActionText: { color: colors.white, fontSize: 12, fontWeight: '900' },
  bold: { fontWeight: '900', fontSize: 15 },
  divider: { height: 1, backgroundColor: '#C4B5FD', marginVertical: 8 },
  walletCard: { borderRadius: 18, padding: 20, borderWidth: 1, borderColor: colors.line, alignItems: 'center', gap: 10 },
  walletSurface: { borderWidth: 1, borderColor: colors.line, borderRadius: 18, backgroundColor: colors.white, padding: 14, marginBottom: 14, gap: 13 },
  walletHero: { borderRadius: 14, padding: 15, backgroundColor: colors.customer, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  walletHeroText: { color: '#EDE9FE', fontSize: 12, fontWeight: '800', marginTop: 4, lineHeight: 17 },
  walletHeroIcon: { width: 46, height: 46, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  walletBalanceBlock: { marginLeft: 'auto', alignItems: 'flex-end' },
  walletBalance: { color: colors.white, fontSize: 26, fontWeight: '900' },
  walletBalanceLabel: { color: '#EDE9FE', fontSize: 12, fontWeight: '900', marginTop: 2 },
  walletPanel: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.white, padding: 14, marginBottom: 14, gap: 10 },
  walletTopupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  walletSecureBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.partnerLight, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 8 },
  walletSecureText: { color: colors.green, fontSize: 10, fontWeight: '900' },
  walletAmountRow: { flexDirection: 'row', gap: 8, marginBottom: 2 },
  walletAmountChip: { flex: 1, minHeight: 40, borderWidth: 1, borderColor: colors.line, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  walletAmountChipActive: { borderColor: colors.customer, backgroundColor: colors.customerLight },
  walletAmountChipText: { color: colors.ink, fontSize: 13, fontWeight: '900' },
  walletAmountChipTextActive: { color: colors.customer },
  walletMethodRow: { minHeight: 42, borderWidth: 1, borderColor: colors.line, borderRadius: 13, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  walletMethodRowActive: { borderColor: colors.customer, backgroundColor: colors.customerLight },
  walletMethodText: { color: colors.ink, fontSize: 13, fontWeight: '900' },
  walletCoinsRow: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  walletCouponButton: { minHeight: 40, borderRadius: 12, backgroundColor: colors.customerLight, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  walletCouponText: { color: colors.customer, fontSize: 13, fontWeight: '900' },
  coinPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FEF3C7', borderRadius: 999, paddingVertical: 7, paddingHorizontal: 10 },
  coinPillText: { color: '#92400E', fontSize: 13, fontWeight: '900' },
  walletTxnRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.white, padding: 12, marginBottom: 10 },
  walletTxnIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  walletTxnCredit: { backgroundColor: colors.partnerLight },
  walletTxnDebit: { backgroundColor: '#FEF2F2' },
  walletTxnTitle: { color: colors.ink, fontSize: 13, fontWeight: '900' },
  walletTxnMeta: { color: colors.muted, fontSize: 10, fontWeight: '700', marginTop: 3 },
  walletTxnAmount: { fontSize: 13, fontWeight: '900' },
  walletTxnAmountCredit: { color: colors.green },
  walletTxnAmountDebit: { color: colors.red },
  coinValue: { color: colors.customer, fontSize: 48, fontWeight: '900' },
  listRow: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  listText: { color: colors.ink, fontWeight: '700' },
  accountHero: { position: 'relative', borderRadius: 18, backgroundColor: colors.customer, padding: 16, overflow: 'hidden' },
  accountHeroTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 },
  accountEyebrow: { color: '#EDE9FE', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  accountHeroSubtitle: { color: colors.white, fontSize: 19, fontWeight: '900', marginTop: 4, lineHeight: 25 },
  accountIdentityCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.94)', padding: 12 },
  accountAvatar: { width: 58, height: 58, borderRadius: 18, backgroundColor: colors.customer, alignItems: 'center', justifyContent: 'center' },
  accountAvatarSmall: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.customer, alignItems: 'center', justifyContent: 'center' },
  accountAvatarText: { color: colors.white, fontSize: 20, fontWeight: '900' },
  accountName: { color: colors.ink, fontSize: 18, fontWeight: '900' },
  accountSubtext: { color: colors.muted, fontSize: 12, fontWeight: '700', marginTop: 2 },
  accountVerifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.partnerLight, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5 },
  accountVerifiedText: { color: colors.green, fontSize: 10, fontWeight: '900' },
  accountEditButton: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.customerLight, alignItems: 'center', justifyContent: 'center' },
  accountStatsRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  accountStatBox: { flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.white, padding: 12, alignItems: 'center' },
  accountStatValue: { color: colors.customer, fontSize: 20, fontWeight: '900' },
  accountStatLabel: { color: colors.muted, fontSize: 11, fontWeight: '800', marginTop: 2 },
  enterpriseCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, backgroundColor: colors.customerLight, padding: 15, marginTop: 14 },
  enterpriseIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.customer, alignItems: 'center', justifyContent: 'center' },
  enterpriseTitle: { color: colors.ink, fontSize: 15, fontWeight: '900' },
  enterpriseText: { color: colors.muted, fontSize: 11, fontWeight: '700', lineHeight: 16, marginTop: 3 },
  enterprisePageHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  enterprisePageTitle: { color: colors.ink, fontSize: 24, fontWeight: '900', marginTop: 2 },
  enterpriseHeroPanel: { borderRadius: 18, backgroundColor: colors.customer, padding: 18, gap: 9 },
  enterpriseHeroIcon: { width: 54, height: 54, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  enterpriseHeroTitle: { color: colors.white, fontSize: 22, fontWeight: '900' },
  enterpriseHeroText: { color: '#EDE9FE', fontSize: 12, fontWeight: '800', lineHeight: 18 },
  enterpriseFeatureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  enterpriseFeatureCard: { width: '48%', minHeight: 138, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.white, padding: 13 },
  enterpriseFeatureIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: colors.customerLight, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  enterpriseFeatureTitle: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  enterpriseFeatureText: { color: colors.muted, fontSize: 11, fontWeight: '700', lineHeight: 16, marginTop: 4 },
  enterpriseChipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  enterpriseChip: { borderRadius: 999, backgroundColor: colors.customerLight, paddingVertical: 8, paddingHorizontal: 11 },
  enterpriseChipText: { color: colors.customer, fontSize: 12, fontWeight: '900' },
  enterpriseContactCard: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.white, padding: 15, gap: 10, marginTop: 18 },
  savedAddressList: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.white, overflow: 'hidden' },
  savedAddressRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: colors.line },
  savedAddressRowLast: { borderBottomWidth: 0 },
  savedAddressIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.customerLight, alignItems: 'center', justifyContent: 'center' },
  savedAddressTitle: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  savedAddressSubtitle: { color: colors.muted, fontSize: 12, fontWeight: '800', marginTop: 2 },
  savedAddressMeta: { color: colors.muted, fontSize: 10, fontWeight: '700', marginTop: 3 },
  savedAddressDeleteButton: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' },
  savedAddressEmpty: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.white, padding: 16, alignItems: 'center', gap: 5 },
  savedAddressEmptyTitle: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  accountDetailHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  accountDetailTitle: { color: colors.ink, fontSize: 21, fontWeight: '900', marginTop: 2 },
  accountDetailSubtitle: { color: colors.muted, fontSize: 12, fontWeight: '800', marginTop: 2 },
  accountDetailCard: { borderWidth: 1, borderColor: colors.line, borderRadius: 18, backgroundColor: colors.white, padding: 14, marginBottom: 12 },
  accountProfilePreview: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, backgroundColor: colors.customerLight, padding: 12, marginBottom: 14 },
  accountInfoStrip: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, backgroundColor: colors.customerLight, padding: 12, marginBottom: 12 },
  accountInfoText: { flex: 1, color: colors.customer, fontSize: 12, fontWeight: '800', lineHeight: 17 },
  accountWalletHero: { alignItems: 'center', borderRadius: 22, backgroundColor: colors.customer, padding: 18, marginBottom: 14 },
  accountWalletValue: { color: colors.white, fontSize: 42, fontWeight: '900', marginTop: 10 },
  accountWalletLabel: { color: '#EDE9FE', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  accountWalletText: { color: '#EDE9FE', fontSize: 12, fontWeight: '800', textAlign: 'center', lineHeight: 17, marginTop: 8 },
  accountBalanceCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.white, padding: 14, marginBottom: 12 },
  accountBalanceValue: { color: colors.ink, fontSize: 22, fontWeight: '900', marginTop: 2 },
  accountMenu: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.white, overflow: 'hidden' },
  accountMenuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: colors.line },
  accountMenuRowLast: { borderBottomWidth: 0 },
  accountMenuIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.customerLight, alignItems: 'center', justifyContent: 'center' },
  accountMenuTitle: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  accountMenuSubtitle: { color: colors.muted, fontSize: 11, fontWeight: '700', marginTop: 2 },
  accountPanel: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.white, padding: 10, marginTop: 12 },
  languageOption: { minHeight: 54, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, marginBottom: 6 },
  languageOptionActive: { backgroundColor: colors.customerLight },
  languageTitle: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  languageSubtitle: { color: colors.muted, fontSize: 12, fontWeight: '800', marginTop: 2 },
  supportActionRow: { minHeight: 58, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10 },
  accountEditCard: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.white, padding: 14, marginTop: 12 },
  accountEditActions: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 4 },
  accountEditError: { color: colors.red, fontSize: 12, fontWeight: '800', marginBottom: 10 },
  accountDangerZone: { marginTop: 6 },
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
  policyDetailHero: { borderWidth: 1, borderColor: colors.line, borderRadius: 18, backgroundColor: colors.white, padding: 15, marginBottom: 12, gap: 8 },
  policyDetailSummary: { color: colors.ink, fontSize: 13, fontWeight: '800', lineHeight: 19 },
  policyDetailSection: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.white, padding: 14, marginBottom: 10 },
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
  logoutButton: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 6, marginBottom: 12 },
  logoutButtonText: { color: colors.ink, fontWeight: '900' },
  toast: { position: 'absolute', left: 16, right: 16, bottom: 88, backgroundColor: colors.ink, borderRadius: 14, padding: 14 },
  toastText: { color: colors.white, fontWeight: '800' },
  empty: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyTitle: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  errorTitle: { color: colors.red, fontSize: 18, fontWeight: '800', marginBottom: 6 }
});
