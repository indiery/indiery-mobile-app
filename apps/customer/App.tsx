import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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
  View,
  Linking
} from 'react-native';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import RazorpayCheckout from 'react-native-razorpay';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { io, Socket } from 'socket.io-client';
import { Ionicons } from '@expo/vector-icons';
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
};

const serviceOptions: Array<{
  id: ServiceCategory;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { id: 'bike', title: 'Two Wheeler', subtitle: 'Small parcels', icon: 'bicycle' },
  { id: 'truck', title: 'Trucks', subtitle: 'Mini trucks and tempos', icon: 'car-sport' },
  { id: 'movers', title: 'Packers', subtitle: 'Home shifting', icon: 'home' },
  { id: 'enterprise', title: 'Business', subtitle: 'Bulk logistics', icon: 'briefcase' }
];

const goodsOptions = ['Documents', 'Groceries', 'Electronics', 'Furniture', 'Business stock', 'Household items'];
const maxExtraStops = 3;
const customerVehicleCodes = ['bike', 'mini500', 'mini750'];
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
  homeTab: 'Home',
  ordersTab: 'Orders',
  walletTab: 'Wallet',
  accountTab: 'Account',
  whereTo: 'WHERE TO?',
  enterDropLocation: 'Enter drop location',
  repeatLastRoute: 'Repeat last route',
  instantBooking: 'Instant booking',
  otpSecured: 'OTP secured',
  liveTracking: 'Live tracking',
  orders: 'Orders',
  active: 'Active',
  coins: 'Coins',
  activeDelivery: 'Active Delivery',
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
  waitingGps: 'Waiting GPS',
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
  locationHint: 'Select a suggestion for accurate fare and tracking, or continue with typed text.'
} as const;

const hiCopy: Record<keyof typeof enCopy, string> = {
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
  whereTo: 'कहाँ भेजना है?',
  enterDropLocation: 'ड्रॉप लोकेशन डालें',
  repeatLastRoute: 'पिछला रूट दोहराएं',
  instantBooking: 'तुरंत बुकिंग',
  otpSecured: 'OTP सुरक्षित',
  liveTracking: 'लाइव ट्रैकिंग',
  orders: 'ऑर्डर',
  active: 'एक्टिव',
  coins: 'कॉइन',
  activeDelivery: 'एक्टिव डिलीवरी',
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
  waitingGps: 'GPS का इंतजार',
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
  hi: hiCopy
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
    'Household items': 'householdItems'
  };
  const key = labels[item];
  return key ? copyFor(language, key) : item;
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
  extraStops: [] as BookingStop[],
  drop: '',
  dropPlaceId: '',
  dropLat: undefined as number | undefined,
  dropLng: undefined as number | undefined,
  dropContactName: '',
  dropContactPhone: '',
  dropAddressLine: '',
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

function hasValidContactPhone(phoneInput: string) {
  return phoneInput.replace(/\D/g, '').length >= 10;
}

function vehicleIcon(vehicle: Vehicle): keyof typeof Ionicons.glyphMap {
  if (vehicle.capacityKg <= 20) return 'bicycle';
  if (vehicle.capacityKg >= 1000) return 'bus';
  return 'car-sport';
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

const defaultMapCenter = { lat: 26.8467, lng: 80.9462 };

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
    requestCustomerAppPermissions(api, showToast).catch(() => undefined);
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

  async function estimateNow(nextStep = step) {
    if (!booking.vehicleId || !booking.pickup || !booking.drop) return;
    setBusy(true);
    try {
      const extraStops = bookingStopsToLocationPoints(booking.extraStops);
      const pickup = composeBookingAddress(booking.pickup, booking.pickupAddressLine);
      const drop = composeBookingAddress(booking.drop, booking.dropAddressLine);
      const result = await api.estimate({
        pickup,
        drop,
        vehicleId: booking.vehicleId,
        coins: Number(booking.coins || 0),
        weightKg: Number(booking.weightKg || 1),
        extraStops,
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
      const extraStops = bookingStopsToLocationPoints(booking.extraStops);
      const pickup = composeBookingAddress(booking.pickup, booking.pickupAddressLine);
      const drop = composeBookingAddress(booking.drop, booking.dropAddressLine);
      const input: CreateOrderInput = {
        pickup,
        drop,
        vehicleId: booking.vehicleId,
        goodsType: booking.goodsType,
        weightKg: Number(booking.weightKg || 1),
        coins: Number(booking.coins || 0),
        paymentMode: booking.paymentMode,
        pickupContactName: booking.pickupContactName,
        pickupContactPhone: booking.pickupContactPhone,
        dropContactName: booking.dropContactName,
        dropContactPhone: booking.dropContactPhone,
        extraStops,
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
      setTab('orders');
      showToast(`${confirmedOrder.orderNo} booked`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Booking failed');
    } finally {
      setBusy(false);
    }
  }

  async function topUpWallet(amount: number, paymentMode: 'upi' | 'card' | 'netbanking') {
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
      `Cancel ${order.orderNo}? You can cancel until pickup starts.`,
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
                return {
                  ...current,
                  activeOrder: undefined,
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

  const activeOrder = data.activeOrder || data.orders.find((order) => !['delivered', 'cancelled'].includes(order.status));

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
            data={data}
            activeOrder={activeOrder}
            onBook={() => setTab('book')}
            onTrack={() => setTab('orders')}
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
            activeOrder={activeOrder}
            tripOtp={activeOrder ? tripOtpByOrder[activeOrder.id] : undefined}
            busy={busy}
            onBook={() => setTab('book')}
            onRefresh={refresh}
            onShare={activeOrder ? () => shareActiveOrder(activeOrder) : undefined}
            onCancel={activeOrder ? () => cancelActiveOrder(activeOrder) : undefined}
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

      <BottomTabs active={tab} onChange={setTab} activeOrder={Boolean(activeOrder)} />
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
  const copy = useCopy();
  const lastOrder = data.orders[0];

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>{copy.whereTo}</Text>
        <Pressable style={styles.searchBox} onPress={onBook}>
          <Ionicons name="search" size={18} color={colors.customer} />
          <Text style={styles.searchText}>{copy.enterDropLocation}</Text>
          <Ionicons name="arrow-forward" size={18} color={colors.customer} />
        </Pressable>
        <View style={styles.row}>
          <PrimaryButton title={copy.bookNow} icon="add" onPress={onBook} />
          <SecondaryButton title={copy.track} icon="navigate" onPress={onTrack} />
        </View>
      </View>

      {lastOrder ? (
        <Pressable style={styles.rebookCard} onPress={onBook}>
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

      <View style={styles.promiseBand}>
        {[
          ['flash', copy.instantBooking],
          ['shield-checkmark', copy.otpSecured],
          ['map', copy.liveTracking]
        ].map(([icon, label]) => (
          <View key={label} style={styles.promiseItem}>
            <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={16} color={colors.green} />
            <Text style={styles.promiseText}>{label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.statRow}>
        <StatCard title={copy.orders} value={String(data.orders.length)} tone="purple" />
        <StatCard title={copy.active} value={activeOrder ? '1' : '0'} tone="green" />
        <StatCard title={copy.coins} value={String(data.user.customerProfile?.coins ?? 0)} tone="amber" />
      </View>

      {activeOrder ? (
        <View>
          <SectionTitle title={copy.activeDelivery} />
          <OrderCard order={activeOrder} />
        </View>
      ) : null}

      <SectionTitle title={copy.recentOrders} />
      {data.orders.length ? (
        data.orders.slice(0, 5).map((order) => (
          <OrderCard key={order.id} order={order} />
        ))
      ) : (
        <View style={styles.emptyHistoryCard}>
          <Ionicons name="cube-outline" size={28} color={colors.muted} />
          <Text style={styles.emptyTitle}>{copy.noTripsYet}</Text>
          <Text style={styles.muted}>{copy.completedCancelledBookingsAppear}</Text>
        </View>
      )}
    </ScrollView>
  );
}

function LocationPickerField({
  api,
  label,
  value,
  selected,
  onChangeText,
  onSelect,
  onOpenMap
}: {
  api: IndieryApi;
  label: string;
  value: string;
  selected: boolean;
  onChangeText: (value: string) => void;
  onSelect: (location: LocationDetails) => void;
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
            <Text style={styles.locationSelectedText}>{copy.selected}</Text>
          </View>
        ) : null}
      </View>
      <View style={[styles.locationInputShell, focused && styles.locationInputShellActive]}>
        <Ionicons name={isPickup ? 'radio-button-on' : 'location'} size={18} color={colors.customer} />
        <TextInput
          value={value}
          onFocus={() => setFocused(true)}
          onChangeText={(nextValue) => {
            setFocused(true);
            onChangeText(nextValue);
          }}
          placeholder={copy.mapSearchPlaceholder}
          placeholderTextColor={colors.muted}
          style={styles.locationInput}
        />
        {loading ? <ActivityIndicator size="small" color={colors.customer} /> : null}
      </View>
      {localError ? <Text style={styles.locationError}>{localError}</Text> : null}
      {onOpenMap ? (
        <Pressable style={styles.mapSelectButton} onPress={onOpenMap}>
          <Ionicons name="map-outline" size={17} color={colors.customer} />
          <Text style={styles.mapSelectText}>{copy.selectOnMap}</Text>
        </Pressable>
      ) : null}
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
  estimateNow: (nextStep?: number) => Promise<void>;
  placeOrder: () => Promise<void>;
}) {
  const copy = useCopy();
  const language = useLanguage();
  const vehicleChoices = vehicles.filter((vehicle) => customerVehicleCodes.includes(vehicle.code));
  const selectedVehicle = vehicleChoices.find((vehicle) => vehicle.id === booking.vehicleId) ?? vehicleChoices[0];
  const vehicleChoiceIds = vehicleChoices.map((vehicle) => vehicle.id).join('|');
  const walletBalance = user.customerProfile?.walletBalance ?? 0;
  const [mapPickerTarget, setMapPickerTarget] = useState<MapPickerTarget | null>(null);
  const [contactSheetTarget, setContactSheetTarget] = useState<'pickup' | 'drop' | null>(null);
  const [contactError, setContactError] = useState('');
  const [savingAddressType, setSavingAddressType] = useState<'pickup' | 'drop' | null>(null);
  const hasPickupLocation = booking.pickup.trim().length > 0;
  const hasDropLocation = booking.drop.trim().length > 0;

  useEffect(() => {
    if (vehicleChoices.length && !vehicleChoices.some((vehicle) => vehicle.id === booking.vehicleId)) {
      setBooking((current) => ({ ...current, vehicleId: vehicleChoices[0].id }));
    }
  }, [booking.serviceCategory, booking.vehicleId, setBooking, vehicleChoiceIds]);

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

  function applyRouteLocation(target: 'pickup' | 'drop', location: LocationDetails) {
    setBooking((current) => ({
      ...current,
      ...(target === 'pickup'
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
          })
    }));
    setContactError('');
    setContactSheetTarget(target);
  }

  function applyMapLocation(location: LocationDetails) {
    if (!mapPickerTarget) return;
    if (mapPickerTarget.kind === 'pickup') {
      applyRouteLocation('pickup', location);
    } else if (mapPickerTarget.kind === 'drop') {
      applyRouteLocation('drop', location);
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

  function continueFromRouteDetails() {
    if (!hasPickupLocation || !hasDropLocation) {
      setContactError(copy.selectLocationFirst);
      return;
    }
    if (booking.pickupContactName.trim().length < 2) {
      setContactError(copy.enterSenderName);
      setContactSheetTarget('pickup');
      return;
    }
    if (!hasValidContactPhone(booking.pickupContactPhone)) {
      setContactError(copy.enterSenderMobile);
      setContactSheetTarget('pickup');
      return;
    }
    if (booking.dropContactName.trim().length < 2) {
      setContactError(copy.enterReceiverName);
      setContactSheetTarget('drop');
      return;
    }
    if (!hasValidContactPhone(booking.dropContactPhone)) {
      setContactError(copy.enterReceiverMobile);
      setContactSheetTarget('drop');
      return;
    }
    setContactError('');
    estimateNow(3);
  }

  function applySavedAddress(target: 'pickup' | 'drop', savedAddress: SavedAddress) {
    setBooking((current) => ({
      ...current,
      ...(target === 'pickup'
        ? {
            pickup: savedAddress.address,
            pickupPlaceId: savedAddress.id,
            pickupLat: savedAddress.lat,
            pickupLng: savedAddress.lng,
            pickupAddressLine: savedAddress.addressLine || ''
          }
        : {
            drop: savedAddress.address,
            dropPlaceId: savedAddress.id,
            dropLat: savedAddress.lat,
            dropLng: savedAddress.lng,
            dropAddressLine: savedAddress.addressLine || ''
          })
    }));
    setContactError('');
    setContactSheetTarget(target);
  }

  async function saveCurrentAddress(target: 'pickup' | 'drop') {
    const isPickup = target === 'pickup';
    const address = isPickup ? booking.pickup : booking.drop;
    const addressLine = isPickup ? booking.pickupAddressLine : booking.dropAddressLine;
    const lat = isPickup ? booking.pickupLat : booking.dropLat;
    const lng = isPickup ? booking.pickupLng : booking.dropLng;
    if (!address.trim()) {
      setContactError(copy.selectLocationFirst);
      return;
    }
    setSavingAddressType(target);
    await onSaveAddress({
      label: addressLine.trim() || address.split(',')[0] || `${target} address`,
      address,
      addressLine,
      lat,
      lng,
      type: 'other'
    });
    setSavingAddressType(null);
  }

  return (
    <>
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
          <SectionTitle title={copy.chooseService} />
          <View style={styles.serviceGridCompact}>
            {serviceOptions.map((service) => (
              <Pressable
                key={service.id}
                style={[styles.serviceOptionCard, booking.serviceCategory === service.id && styles.serviceOptionCardActive]}
                onPress={() => setBooking((current) => ({ ...current, serviceCategory: service.id }))}
              >
                <Ionicons name={service.icon} size={20} color={booking.serviceCategory === service.id ? colors.customer : colors.muted} />
                <View style={styles.flex}>
                  <Text style={styles.serviceOptionTitle}>{serviceTitle(language, service.id)}</Text>
                  <Text style={styles.mutedSmall}>{serviceSubtitle(language, service.id)}</Text>
                </View>
              </Pressable>
            ))}
          </View>

          <SectionTitle title={copy.selectVehicle} />
          <View style={styles.vehicleGrid}>
            {vehicleChoices.map((vehicle) => (
              <Pressable
                key={vehicle.id}
                style={[styles.vehicleCard, booking.vehicleId === vehicle.id && styles.vehicleCardActive]}
                onPress={() => setBooking((current) => ({ ...current, vehicleId: vehicle.id }))}
              >
                <View style={styles.vehicleCardHeader}>
                  <Ionicons name={vehicleIcon(vehicle)} size={24} color={colors.customer} />
                  <Text style={styles.vehicleEta}>{vehicle.etaMinutes} min</Text>
                </View>
                <Text style={styles.vehicleName}>{vehicle.shortName}</Text>
                <Text style={styles.mutedSmall}>{copy.upTo} {vehicle.capacityKg} kg</Text>
              </Pressable>
            ))}
          </View>
          {booking.serviceCategory === 'movers' ? (
            <View style={styles.noticeInfo}>
              <Ionicons name="information-circle" size={16} color={colors.blue} />
              <Text style={styles.noticeInfoText}>{copy.moversNotice}</Text>
            </View>
          ) : null}
          <PrimaryButton title={copy.continue} icon="arrow-forward" onPress={() => setStep(2)} />
        </View>
      )}

      {step === 2 && (
        <View>
          <SectionTitle title={copy.pickupAndDrop} />
          <LocationPickerField
            api={api}
            label={copy.pickup}
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
            onSelect={(location) => applyRouteLocation('pickup', location)}
            onOpenMap={() =>
              setMapPickerTarget({
                kind: 'pickup',
                title: copy.setPickupLocation,
                value: booking.pickup,
                lat: booking.pickupLat,
                lng: booking.pickupLng
              })
            }
          />
          <SavedAddressStrip
            title={copy.savedPickupAddresses}
            addresses={savedAddresses}
            onSelect={(address) => applySavedAddress('pickup', address)}
          />
          {booking.extraStops.map((stop, index) => (
            <View key={stop.id} style={styles.stopFieldWrap}>
              <LocationPickerField
                api={api}
                label={`${copy.stop} ${index + 1}`}
                value={stop.label}
                selected={typeof stop.lat === 'number' && typeof stop.lng === 'number'}
                onChangeText={(label) => updateStop(stop.id, { label, placeId: '', lat: undefined, lng: undefined })}
                onSelect={(location) =>
                  updateStop(stop.id, {
                    label: location.address || location.label,
                    placeId: location.placeId,
                    lat: location.lat,
                    lng: location.lng
                  })
                }
                onOpenMap={() =>
                  setMapPickerTarget({
                    kind: 'stop',
                    stopId: stop.id,
                    title: `${copy.setStop} ${index + 1}`,
                    value: stop.label,
                    lat: stop.lat,
                    lng: stop.lng
                  })
                }
              />
              <Pressable style={styles.removeStopButton} onPress={() => removeStop(stop.id)}>
                <Ionicons name="close" size={16} color={colors.red} />
                <Text style={styles.removeStopText}>{copy.removeStop}</Text>
              </Pressable>
            </View>
          ))}
          {booking.extraStops.length < maxExtraStops ? (
            <Pressable style={styles.addStopButton} onPress={addStop}>
              <Ionicons name="add-circle-outline" size={18} color={colors.customer} />
              <Text style={styles.addStopText}>{copy.addStop}</Text>
            </Pressable>
          ) : null}
          <LocationPickerField
            api={api}
            label={copy.drop}
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
            onSelect={(location) => applyRouteLocation('drop', location)}
            onOpenMap={() =>
              setMapPickerTarget({
                kind: 'drop',
                title: copy.setDropLocation,
                value: booking.drop,
                lat: booking.dropLat,
                lng: booking.dropLng
              })
            }
          />
          <SavedAddressStrip
            title={copy.savedDropAddresses}
            addresses={savedAddresses}
            onSelect={(address) => applySavedAddress('drop', address)}
          />
          {hasPickupLocation || hasDropLocation ? (
            <View style={styles.contactGrid}>
              {hasPickupLocation ? (
                <ContactSummaryCard
                  title={copy.senderDetails}
                  subtitle={copy.askedAfterPickup}
                  icon="person-circle"
                  iconColor={colors.customer}
                  name={booking.pickupContactName}
                  phone={booking.pickupContactPhone}
                  addressLine={booking.pickupAddressLine}
                  locationLabel={booking.pickup}
                  onPress={() => setContactSheetTarget('pickup')}
                  onSaveAddress={() => saveCurrentAddress('pickup')}
                  saving={savingAddressType === 'pickup'}
                />
              ) : null}
              {hasDropLocation ? (
                <ContactSummaryCard
                  title={copy.receiverDetails}
                  subtitle={copy.askedAfterDrop}
                  icon="flag"
                  iconColor={colors.green}
                  name={booking.dropContactName}
                  phone={booking.dropContactPhone}
                  addressLine={booking.dropAddressLine}
                  locationLabel={booking.drop}
                  onPress={() => setContactSheetTarget('drop')}
                  onSaveAddress={() => saveCurrentAddress('drop')}
                  saving={savingAddressType === 'drop'}
                />
              ) : null}
            </View>
          ) : null}
          {contactError ? <Text style={styles.contactError}>{contactError}</Text> : null}
          {hasPickupLocation || hasDropLocation ? (
            <MapPreview
              pickup={booking.pickup}
              drop={booking.drop}
              extraStops={bookingStopsToLocationPoints(booking.extraStops)}
              eta={fare?.etaMinutes || selectedVehicle?.etaMinutes || 4}
            />
          ) : null}
          <View style={styles.row}>
            <SecondaryButton title={copy.back} icon="arrow-back" onPress={() => setStep(1)} />
            <PrimaryButton title={busy ? copy.estimating : copy.continue} icon="arrow-forward" onPress={continueFromRouteDetails} />
          </View>
        </View>
      )}

      {step === 3 && (
        <View>
          <SectionTitle title={copy.goodsDetails} />
          <View style={styles.goodsChipWrap}>
            {goodsOptions.map((item) => (
              <Pressable
                key={item}
                style={[styles.goodsChip, booking.goodsType === item && styles.goodsChipActive]}
                onPress={() => setBooking((current) => ({ ...current, goodsType: item }))}
              >
                <Text style={[styles.goodsChipText, booking.goodsType === item && styles.goodsChipTextActive]}>{goodsLabel(language, item)}</Text>
              </Pressable>
            ))}
          </View>
          <Field
            label={copy.goodsType}
            value={goodsLabel(language, booking.goodsType)}
            onChangeText={(goodsType) => setBooking((current) => ({ ...current, goodsType }))}
          />
          <Field
            label={copy.weightKg}
            keyboardType="numeric"
            value={booking.weightKg}
            onChangeText={(weightKg) => setBooking((current) => ({ ...current, weightKg }))}
          />
          <View style={styles.notice}>
            <Ionicons name="warning" size={16} color={colors.amber} />
            <Text style={styles.noticeText}>{copy.restrictedGoods}</Text>
          </View>
          <View style={styles.bookingSummaryCard}>
            <Text style={styles.summaryTitle}>{copy.routeSummary}</Text>
            <SummaryRow label={copy.service} value={serviceTitle(language, booking.serviceCategory)} />
            <SummaryRow label={copy.vehicle} value={selectedVehicle?.name || copy.selectVehicleValue} />
            <SummaryRow label={copy.stops} value={booking.extraStops.length ? String(booking.extraStops.length) : copy.direct} />
          </View>
          <View style={styles.row}>
            <SecondaryButton title={copy.back} icon="arrow-back" onPress={() => setStep(2)} />
            <PrimaryButton title={copy.continue} icon="arrow-forward" onPress={() => estimateNow(4)} />
          </View>
        </View>
      )}

      {step === 4 && (
        <View>
          <SectionTitle title={copy.payment} />
          <View style={styles.bookingSummaryCard}>
            <Text style={styles.summaryTitle}>{copy.bookingSummary}</Text>
            <SummaryRow
              label={copy.route}
              value={`${composeBookingAddress(booking.pickup, booking.pickupAddressLine)} to ${composeBookingAddress(booking.drop, booking.dropAddressLine)}`}
            />
            <SummaryRow label={copy.vehicle} value={selectedVehicle?.shortName || copy.vehicle} />
            <SummaryRow label={copy.goods} value={`${goodsLabel(language, booking.goodsType)}, ${booking.weightKg || 0} kg`} />
            <SummaryRow label={copy.eta} value={`${fare?.etaMinutes || selectedVehicle?.etaMinutes || 0} min`} />
          </View>
          <Field
            label={copy.useCoins}
            keyboardType="numeric"
            value={booking.coins}
            onChangeText={(coins) => setBooking((current) => ({ ...current, coins }))}
          />
          {fare ? <FareCard fare={fare} /> : null}
          {(['wallet', 'upi', 'card', 'netbanking', 'cash'] as PaymentMode[]).map((mode) => {
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
        target={contactSheetTarget}
        user={user}
        booking={booking}
        setBooking={setBooking}
        onClose={() => {
          setContactError('');
          setContactSheetTarget(null);
        }}
      />
    ) : null}
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

function ContactDetailsModal({
  target,
  user,
  booking,
  setBooking,
  onClose
}: {
  target: 'pickup' | 'drop';
  user: UserProfile;
  booking: typeof initialBooking;
  setBooking: React.Dispatch<React.SetStateAction<typeof initialBooking>>;
  onClose: () => void;
}) {
  const copy = useCopy();
  const [localError, setLocalError] = useState('');
  const isPickup = target === 'pickup';
  const title = isPickup ? copy.senderDetails : copy.receiverDetails;
  const subtitle = isPickup ? copy.personHandingGoods : copy.personReceivingGoods;
  const name = isPickup ? booking.pickupContactName : booking.dropContactName;
  const phone = isPickup ? booking.pickupContactPhone : booking.dropContactPhone;
  const addressLine = isPickup ? booking.pickupAddressLine : booking.dropAddressLine;
  const place = isPickup ? booking.pickup : booking.drop;

  function updateContact(patch: Partial<typeof initialBooking>) {
    setLocalError('');
    setBooking((current) => ({ ...current, ...patch }));
  }

  function useMine() {
    updateContact({
      pickupContactName: user.name,
      pickupContactPhone: user.phone
    });
  }

  function saveDetails() {
    if (name.trim().length < 2) {
      setLocalError(isPickup ? copy.enterSenderName : copy.enterReceiverName);
      return;
    }
    if (!hasValidContactPhone(phone)) {
      setLocalError(isPickup ? copy.enterSenderMobile : copy.enterReceiverMobile);
      return;
    }
    onClose();
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.contactSheetOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.contactSheetBackdrop} onPress={onClose} />
        <View style={styles.contactSheet}>
          <View style={styles.contactSheetHandle} />
          <View style={styles.contactSheetHeader}>
            <View>
              <Text style={styles.contactSheetTitle}>{title}</Text>
              <Text style={styles.contactSheetSubtitle}>{subtitle}</Text>
            </View>
            <Pressable style={styles.mapPickerClose} onPress={onClose}>
              <Ionicons name="close" size={20} color={colors.ink} />
            </Pressable>
          </View>
          <View style={styles.contactPlaceBox}>
            <Ionicons name={isPickup ? 'navigate-circle' : 'flag'} size={19} color={isPickup ? colors.customer : colors.green} />
            <Text style={styles.contactPlaceText} numberOfLines={2}>{place || copy.selectedLocation}</Text>
          </View>
          {isPickup ? (
            <Pressable style={styles.useMyDetailsButton} onPress={useMine}>
              <Text style={styles.useMyDetailsText}>{copy.useMine}</Text>
            </Pressable>
          ) : null}
          <Field
            label={isPickup ? copy.senderName : copy.receiverName}
            value={name}
            onChangeText={(value) => updateContact(isPickup ? { pickupContactName: value } : { dropContactName: value })}
          />
          <Field
            label={isPickup ? copy.senderMobile : copy.receiverMobile}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={(value) => updateContact(isPickup ? { pickupContactPhone: value } : { dropContactPhone: value })}
          />
          <Field
            label={isPickup ? copy.pickupLandmarkOptional : copy.dropLandmarkOptional}
            value={addressLine}
            onChangeText={(value) => updateContact(isPickup ? { pickupAddressLine: value } : { dropAddressLine: value })}
          />
          {localError ? <Text style={styles.contactError}>{localError}</Text> : null}
          <View style={styles.contactSheetActions}>
            <SecondaryButton title={copy.later} icon="time-outline" onPress={onClose} />
            <PrimaryButton title={copy.saveDetails} icon="checkmark" onPress={saveDetails} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
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
  const requestSeqRef = useRef(0);
  const sessionTokenRef = useRef(`map-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const lat = region.latitude;
  const lng = region.longitude;

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
      setRegion((current) => ({
        ...current,
        latitude: result.location.lat,
        longitude: result.location.lng
      }));
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
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setLocalError('Location permission is required to use current location');
        return;
      }
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const nextLat = current.coords.latitude;
      const nextLng = current.coords.longitude;
      const reverse = await Location.reverseGeocodeAsync({ latitude: nextLat, longitude: nextLng }).catch(() => []);
      const address = formatReverseAddress(reverse[0]) || 'Current location';
      setRegion((currentRegion) => ({
        ...currentRegion,
        latitude: nextLat,
        longitude: nextLng
      }));
      setPinLabel(address);
      setQuery(address);
      setSuggestions([]);
    } catch {
      setLocalError('Could not read current location');
    } finally {
      setLocating(false);
    }
  }

  function updatePinFromMap(nextRegion: Region) {
    setRegion(nextRegion);
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
      <SafeAreaView style={styles.mapPickerShell}>
        <AppStatusBar variant="light" />
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
          <MapView
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
            style={styles.mapPickerRealMap}
            region={region}
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
        </View>

        <View style={styles.mapPickerSelectedCard}>
          <Ionicons name="navigate-circle" size={22} color={colors.customer} />
          <View style={styles.flex}>
            <Text style={styles.mapPickerSelectedTitle} numberOfLines={1}>{pinLabel}</Text>
            <Text style={styles.mapPickerCoords}>{lat.toFixed(5)}, {lng.toFixed(5)}</Text>
          </View>
        </View>

        <Pressable style={styles.mapPickerCurrentButton} onPress={useCurrentLocation}>
          {locating ? <ActivityIndicator size="small" color={colors.customer} /> : <Ionicons name="locate" size={18} color={colors.customer} />}
          <Text style={styles.mapPickerCurrentText}>{copy.useCurrentLocation}</Text>
        </Pressable>

        <View style={styles.mapPickerActions}>
          <SecondaryButton title={copy.cancel} icon="close" onPress={onClose} />
          <PrimaryButton title={copy.confirmLocation} icon="checkmark" onPress={confirmPin} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function OrdersScreen({
  orders,
  activeOrder,
  tripOtp,
  busy,
  onBook,
  onRefresh,
  onShare,
  onCancel
}: {
  orders: Order[];
  activeOrder?: Order;
  tripOtp?: { pickup: string; drop: string };
  busy: boolean;
  onBook: () => void;
  onRefresh: () => void;
  onShare?: () => void;
  onCancel?: () => void;
}) {
  const copy = useCopy();
  const language = useLanguage();
  const pastOrders = activeOrder ? orders.filter((order) => order.id !== activeOrder.id) : orders;
  const countdown = useOrderCountdown(activeOrder);

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.ordersHeader}>
        <View>
          <Text style={styles.heroLabel}>{copy.myOrders}</Text>
          <Text style={styles.ordersTitle}>{copy.deliveriesTracking}</Text>
        </View>
        <Pressable style={styles.ordersBookButton} onPress={onBook}>
          <Ionicons name="add" size={18} color={colors.white} />
        </Pressable>
      </View>

      {activeOrder ? (
        <View>
          <SectionTitle title={copy.activeDelivery} />
          <MapPreview
            pickup={activeOrder.pickup.label}
            drop={activeOrder.drop.label}
            extraStops={activeOrder.extraStops}
            eta={activeOrder.etaMinutes}
            partnerLocation={activeOrder.partnerLocation}
          />
          <View style={styles.activeOrderCard}>
            <View style={styles.between}>
              <View>
                <Text style={styles.cardTitle}>{activeOrder.orderNo}</Text>
                <Text style={styles.mutedSmall}>
                  {activeOrder.vehicle.shortName} - {activeOrder.goodsType}, {activeOrder.weightKg} kg
                </Text>
              </View>
              <Badge label={statusLabel(language, activeOrder.status)} />
            </View>
            <SummaryRow label={copy.route} value={`${activeOrder.pickup.label} to ${activeOrder.drop.label}`} />
            <SummaryRow label={copy.paymentLabel} value={`${activeOrder.paymentMode.toUpperCase()} - ${activeOrder.paymentStatus}`} />
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
            {activeOrder.partner ? (
              <View style={styles.assignedPartnerRow}>
                <View style={styles.driverAvatar}>
                  <Text style={styles.driverAvatarText}>{activeOrder.partner.initials}</Text>
                </View>
                <View style={styles.flex}>
                  <Text style={styles.cardTitle}>{activeOrder.partner.name}</Text>
                  <Text style={styles.mutedSmall}>{activeOrder.partner.partnerProfile?.vehicleNumber || copy.vehicleAssigned}</Text>
                </View>
                <Text style={styles.rating}>4.9</Text>
              </View>
            ) : (
              <View style={styles.searchingPartnerRow}>
                <ActivityIndicator size="small" color={colors.customer} />
                <Text style={styles.searchingPartnerText}>{copy.findingNearbyPartner}</Text>
              </View>
            )}
            {tripOtp ? (
              <View style={styles.compactOtpRow}>
                <View style={styles.compactOtpBox}>
                  <Text style={styles.mutedSmall}>{copy.pickupOtp}</Text>
                  <Text style={styles.compactOtpText}>{tripOtp.pickup}</Text>
                </View>
                <View style={styles.compactOtpBox}>
                  <Text style={styles.mutedSmall}>{copy.dropOtp}</Text>
                  <Text style={styles.compactOtpText}>{tripOtp.drop}</Text>
                </View>
              </View>
            ) : null}
          </View>
          <Timeline items={activeOrder.timeline} />
          <View style={styles.row}>
            <PrimaryButton title={copy.refresh} icon="refresh" onPress={onRefresh} />
            {onShare ? (
              <SecondaryButton title={copy.share} icon="share-social" onPress={onShare} />
            ) : null}
            {onCancel && ['offered', 'accepted', 'arrived_pickup'].includes(activeOrder.status) ? (
              <SecondaryButton title={busy ? copy.cancelling : copy.cancel} icon="close-circle" onPress={onCancel} />
            ) : null}
          </View>
        </View>
      ) : (
        <View style={styles.noActiveOrderCard}>
          <Ionicons name="navigate-outline" size={30} color={colors.muted} />
          <Text style={styles.emptyTitle}>{copy.noActiveDelivery}</Text>
          <Text style={styles.muted}>{copy.liveTrackingAppear}</Text>
          <PrimaryButton title={copy.bookDelivery} icon="add" onPress={onBook} />
        </View>
      )}

      <SectionTitle title={copy.orderHistory} />
      {pastOrders.length ? (
        pastOrders.map((order) => <OrderCard key={order.id} order={order} />)
      ) : (
        <View style={styles.emptyHistoryCard}>
          <Ionicons name="cube-outline" size={28} color={colors.muted} />
          <Text style={styles.emptyTitle}>{copy.noPastOrders}</Text>
          <Text style={styles.muted}>{copy.completedCancelledAppear}</Text>
        </View>
      )}
    </ScrollView>
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
  tripOtp?: { pickup: string; drop: string };
  busy: boolean;
  onRefresh: () => void;
  onCancel?: () => void;
}) {
  const copy = useCopy();
  const language = useLanguage();
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
      <MapPreview
        pickup={order.pickup.label}
        drop={order.drop.label}
        extraStops={order.extraStops}
        eta={order.etaMinutes}
        partnerLocation={order.partnerLocation}
      />
      <View style={styles.card}>
        <View style={styles.between}>
          <View>
            <Text style={styles.cardTitle}>{order.orderNo}</Text>
            <Text style={styles.mutedSmall}>{order.vehicle.shortName} {'->'} {routeStopSummary(order.extraStops) || order.drop.label}</Text>
          </View>
          <Badge label={statusLabel(language, order.status)} />
        </View>
        <SummaryRow label={copy.goods} value={`${goodsLabel(language, order.goodsType)}, ${order.weightKg} kg`} />
        <SummaryRow label={copy.paymentLabel} value={`${order.paymentMode.toUpperCase()} - ${order.paymentStatus}`} />
      </View>
      {order.partner ? (
        <View style={styles.driverCard}>
          <View style={styles.driverAvatar}>
            <Text style={styles.driverAvatarText}>{order.partner.initials}</Text>
          </View>
          <View style={styles.flex}>
            <Text style={styles.cardTitle}>{order.partner.name}</Text>
            <Text style={styles.mutedSmall}>{order.partner.partnerProfile?.vehicleNumber || copy.vehicleAssigned}</Text>
          </View>
          <Text style={styles.rating}>4.9</Text>
        </View>
      ) : null}
      {tripOtp ? (
        <View style={styles.otpCard}>
          <Text style={styles.cardTitle}>{copy.deliveryOtp}</Text>
          <View style={styles.row}>
            <View style={styles.otpBox}>
              <Text style={styles.mutedSmall}>{copy.pickup}</Text>
              <Text style={styles.otpText}>{tripOtp.pickup}</Text>
            </View>
            <View style={styles.otpBox}>
              <Text style={styles.mutedSmall}>{copy.drop}</Text>
              <Text style={styles.otpText}>{tripOtp.drop}</Text>
            </View>
          </View>
        </View>
      ) : null}
      <Timeline items={order.timeline} />
      <FareCard fare={order.fare} />
      <View style={styles.row}>
        <PrimaryButton title={copy.refresh} icon="refresh" onPress={onRefresh} />
        {onCancel && ['offered', 'accepted', 'arrived_pickup'].includes(order.status) ? (
          <SecondaryButton title={busy ? copy.cancelling : copy.cancel} icon="close-circle" onPress={onCancel} />
        ) : null}
      </View>
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
  onTopup: (amount: number, paymentMode: 'upi' | 'card' | 'netbanking') => Promise<void>;
  onCoupon: () => Promise<void>;
}) {
  const copy = useCopy();
  const [amount, setAmount] = useState('500');
  const [paymentMode, setPaymentMode] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const topupAmount = Number(amount || 0);
  const canTopup = topupAmount >= 10;

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.walletHero}>
        <View style={styles.between}>
          <View>
            <Text style={styles.eyebrowDark}>{copy.walletTitle}</Text>
            <Text style={styles.walletHeroText}>{copy.walletSubtitle}</Text>
          </View>
          <View style={styles.walletHeroIcon}>
            <Ionicons name="wallet" size={24} color={colors.white} />
          </View>
        </View>
        <Text style={styles.walletBalance}>{money(wallet.balance)}</Text>
        <Text style={styles.walletBalanceLabel}>{copy.availableToPay}</Text>
      </View>

      <View style={styles.walletPanel}>
        <View style={styles.between}>
          <Text style={styles.cardTitle}>{copy.addMoney}</Text>
          <View style={styles.walletSecureBadge}>
            <Ionicons name="shield-checkmark" size={14} color={colors.green} />
            <Text style={styles.walletSecureText}>{copy.secureTopup}</Text>
          </View>
        </View>
        <Text style={styles.fieldLabel}>{copy.quickTopup}</Text>
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
        <Text style={styles.fieldLabel}>{copy.paymentMethod}</Text>
        {(['upi', 'card', 'netbanking'] as const).map((mode) => (
          <Pressable
            key={mode}
            style={[styles.walletMethodRow, paymentMode === mode && styles.walletMethodRowActive]}
            onPress={() => setPaymentMode(mode)}
          >
            <Ionicons
              name={paymentMode === mode ? 'radio-button-on' : 'radio-button-off'}
              size={18}
              color={colors.customer}
            />
            <Text style={styles.walletMethodText}>{mode.toUpperCase()}</Text>
          </Pressable>
        ))}
        <PrimaryButton
          title={busy ? copy.applying : copy.addMoney}
          icon="add-circle"
          onPress={() => {
            if (canTopup) onTopup(topupAmount, paymentMode);
          }}
        />
      </View>

      <View style={styles.walletPanel}>
        <View style={styles.between}>
          <View>
            <Text style={styles.cardTitle}>{copy.rewardsCoins}</Text>
            <Text style={styles.mutedSmall}>{copy.useCoinsDiscount}</Text>
          </View>
          <View style={styles.coinPill}>
            <Ionicons name="gift" size={15} color={colors.amber} />
            <Text style={styles.coinPillText}>{wallet.coins}</Text>
          </View>
        </View>
        <PrimaryButton title={busy ? copy.applying : copy.applyFirst50} icon="gift" onPress={onCoupon} />
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

      <SectionTitle title={copy.coinRules} />
      {[copy.coinRuleEarn, copy.coinRuleUse, copy.coinRuleRefunds].map((item) => (
        <View key={item} style={styles.listRow}>
          <Ionicons name="checkmark-circle" size={18} color={colors.green} />
          <Text style={styles.listText}>{item}</Text>
        </View>
      ))}

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
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [name, setName] = useState(data.user.name);
  const [email, setEmail] = useState(data.user.email || '');
  const [city, setCity] = useState(data.user.city);
  const [localError, setLocalError] = useState('');
  const [supportOpen, setSupportOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [enterpriseOpen, setEnterpriseOpen] = useState(false);
  const selectedLanguageLabel = languageNativeLabel(language);

  useEffect(() => {
    if (!detailsOpen) {
      setName(data.user.name);
      setEmail(data.user.email || '');
      setCity(data.user.city);
      setLocalError('');
    }
  }, [data.user.city, data.user.email, data.user.name, detailsOpen]);

  function cancelEditDetails() {
    setName(data.user.name);
    setEmail(data.user.email || '');
    setCity(data.user.city);
    setLocalError('');
    setDetailsOpen(false);
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
    setDetailsOpen(false);
  }

  if (enterpriseOpen) {
    return <EnterpriseInfoScreen onBack={() => setEnterpriseOpen(false)} />;
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.accountHero}>
        <View style={styles.accountAvatar}>
          <Text style={styles.accountAvatarText}>{data.user.initials}</Text>
        </View>
        <View style={styles.flex}>
          <Text style={styles.accountName}>{data.user.name}</Text>
          <Text style={styles.accountSubtext}>{data.user.phone}</Text>
          <Text style={styles.accountSubtext}>{data.user.city}</Text>
        </View>
        <View style={styles.accountVerifiedBadge}>
          <Ionicons name="checkmark-circle" size={14} color={colors.green} />
          <Text style={styles.accountVerifiedText}>{copy.verified}</Text>
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

      <Pressable style={styles.enterpriseCard} onPress={() => setEnterpriseOpen(true)}>
        <View style={styles.enterpriseIcon}>
          <Ionicons name="business" size={24} color={colors.white} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.enterpriseTitle}>{copy.enterprisesTitle}</Text>
          <Text style={styles.enterpriseText}>{copy.enterprisesText}</Text>
        </View>
        <Ionicons name="chevron-forward" size={19} color={colors.customer} />
      </Pressable>

      <SavedAddressesSection
        addresses={data.user.customerProfile?.savedAddresses ?? []}
        busy={busy}
        onDeleteAddress={onDeleteAddress}
      />

      <SectionTitle title={copy.account} />
      <View style={styles.accountMenu}>
        <AccountMenuRow
          icon="person-outline"
          title={copy.personalDetails}
          subtitle={data.user.email || copy.emailNotAdded}
          expanded={detailsOpen}
          onPress={() => setDetailsOpen((current) => !current)}
        />
        <AccountMenuRow icon="location-outline" title={copy.savedCity} subtitle={data.user.city} onPress={() => setDetailsOpen(true)} />
        <AccountMenuRow icon="wallet-outline" title={copy.indieryCoinsMenu} subtitle={`${data.user.customerProfile?.coins ?? 0} ${copy.coinsAvailable}`} />
        <AccountMenuRow
          icon="language-outline"
          title={copy.changeLanguage}
          subtitle={selectedLanguageLabel}
          expanded={languageOpen}
          onPress={() => setLanguageOpen((current) => !current)}
        />
        <AccountMenuRow
          icon="headset-outline"
          title={copy.helpSupport}
          subtitle={copy.supportSubtitle}
          expanded={supportOpen}
          onPress={() => setSupportOpen((current) => !current)}
        />
      </View>

      {detailsOpen ? (
        <View style={styles.accountEditCard}>
          <Field label={copy.name} value={name} onChangeText={setName} />
          <Field label={copy.email} value={email} onChangeText={setEmail} keyboardType="email-address" />
          <Field label={copy.city} value={city} onChangeText={setCity} />
          <Field label={copy.mobileNumber} value={data.user.phone} editable={false} keyboardType="phone-pad" />
          {localError ? <Text style={styles.accountEditError}>{localError}</Text> : null}
          <View style={styles.accountEditActions}>
            <SecondaryButton title={copy.cancel} icon="close" onPress={cancelEditDetails} />
            <PrimaryButton title={busy ? copy.saving : copy.save} icon="checkmark" onPress={submitDetails} />
          </View>
        </View>
      ) : null}

      {languageOpen ? (
        <LanguagePanel selected={language} onSelect={onChangeLanguage} />
      ) : null}

      {supportOpen ? <SupportPanel /> : null}

      <PolicyList />

      <View style={styles.accountDangerZone}>
        <Pressable style={styles.deleteAccountButton} onPress={onRequestAccountDeletion}>
          <Ionicons name="trash-outline" size={18} color={colors.red} />
          <Text style={styles.deleteAccountButtonText}>{copy.requestAccountDeletion}</Text>
        </Pressable>
        <Pressable style={styles.logoutButton} onPress={onLogout}>
          <Ionicons name="log-out-outline" size={18} color={colors.red} />
          <Text style={styles.logoutButtonText}>{copy.logout}</Text>
        </Pressable>
      </View>
    </ScrollView>
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
          {addresses.map((address) => (
            <View key={address.id} style={styles.savedAddressRow}>
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
  expanded,
  onPress
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  expanded?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable style={styles.accountMenuRow} onPress={onPress} disabled={!onPress}>
      <View style={styles.accountMenuIcon}>
        <Ionicons name={icon} size={18} color={colors.customer} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.accountMenuTitle}>{title}</Text>
        <Text style={styles.accountMenuSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name={expanded ? 'chevron-up' : 'chevron-forward'} size={17} color={colors.muted} />
    </Pressable>
  );
}

function PolicyList() {
  const copy = useCopy();
  const [openPolicy, setOpenPolicy] = useState<LegalPolicy['id'] | null>(null);

  return (
    <View style={styles.policyList}>
      <SectionTitle title={copy.policiesLegal} />
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
  const copy = useCopy();
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
          <Text style={styles.mutedSmall}>{copy.updated} {policy.updatedAt}</Text>
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

function OrderCard({ order }: { order: Order }) {
  const copy = useCopy();
  const language = useLanguage();
  return (
    <View style={styles.orderCard}>
      <View style={styles.between}>
        <Text style={styles.orderNo}>{order.orderNo}</Text>
        <Badge label={statusLabel(language, order.status)} />
      </View>
      <View style={styles.route}>
        <View style={styles.routeDot} />
        <View style={styles.flex}>
          <Text style={styles.routeText}>{order.pickup.label}</Text>
          <Text style={styles.mutedSmall}>{copy.pickup}</Text>
        </View>
      </View>
      {order.extraStops?.map((stop, index) => (
        <View key={`${order.id}-stop-${index}`} style={styles.route}>
          <View style={styles.routeDotStop} />
          <View style={styles.flex}>
            <Text style={styles.routeText}>{stop.label}</Text>
            <Text style={styles.mutedSmall}>{copy.stop} {index + 1}</Text>
          </View>
        </View>
      ))}
      <View style={styles.route}>
        <View style={[styles.routeDot, styles.routeDotGreen]} />
        <View style={styles.flex}>
          <Text style={styles.routeText}>{order.drop.label}</Text>
          <Text style={styles.mutedSmall}>{copy.drop}</Text>
        </View>
      </View>
      <View style={styles.between}>
        <Text style={styles.mutedSmall}>{order.vehicle.shortName} - {order.distanceKm} km - {goodsLabel(language, order.goodsType)}</Text>
        <Text style={styles.priceText}>{money(order.fare.total)}</Text>
      </View>
      <View style={styles.orderMetaRow}>
        <Text style={styles.orderMetaText}>{order.paymentMode.toUpperCase()}</Text>
        <Text style={styles.orderMetaText}>{order.paymentStatus.toUpperCase()}</Text>
        <Text style={styles.orderMetaText}>{order.etaMinutes} min {copy.eta}</Text>
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
  extraStops = [],
  eta,
  partnerLocation
}: {
  pickup: string;
  drop: string;
  extraStops?: LocationPoint[];
  eta: number;
  partnerLocation?: Order['partnerLocation'];
}) {
  const copy = useCopy();
  const hasLiveLocation = typeof partnerLocation?.lat === 'number' && typeof partnerLocation?.lng === 'number';
  const stopLabel = routeStopSummary(extraStops);
  return (
    <View style={styles.map}>
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
      <View style={styles.etaChip}>
        <Text style={styles.etaValue}>{eta}</Text>
        <Text style={styles.etaLabel}>{copy.min}</Text>
      </View>
      <View style={styles.liveChip}>
        <View style={[styles.liveDot, hasLiveLocation && styles.liveDotOn]} />
        <Text style={styles.liveText}>{hasLiveLocation ? copy.liveGps : copy.waitingGps}</Text>
      </View>
      <Text style={styles.mapText}>{pickup} {'->'} {stopLabel ? `${stopLabel} -> ` : ''}{drop}</Text>
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
  content: { flex: 1, marginTop: -14, backgroundColor: colors.white, borderTopLeftRadius: 22, borderTopRightRadius: 22 },
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
  ordersHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.white, padding: 16, marginBottom: 2 },
  ordersTitle: { color: colors.ink, fontSize: 22, fontWeight: '900', marginTop: 3 },
  ordersBookButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.customer, alignItems: 'center', justifyContent: 'center' },
  activeOrderCard: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 14, backgroundColor: colors.white, marginBottom: 12 },
  countdownCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.customerLight, borderRadius: 14, padding: 12, marginTop: 6, marginBottom: 8 },
  countdownCardDelayed: { backgroundColor: '#FEF2F2' },
  countdownValue: { color: colors.customer, fontSize: 22, fontWeight: '900' },
  countdownValueDelayed: { color: colors.red, fontSize: 16 },
  countdownLabel: { color: colors.muted, fontSize: 11, fontWeight: '800' },
  assignedPartnerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12, marginTop: 8 },
  searchingPartnerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12, marginTop: 8 },
  searchingPartnerText: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  compactOtpRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  compactOtpBox: { flex: 1, backgroundColor: colors.customerLight, borderRadius: 14, padding: 11, alignItems: 'center' },
  compactOtpText: { color: colors.customer, fontSize: 18, fontWeight: '900', marginTop: 2 },
  noActiveOrderCard: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.white, padding: 18, alignItems: 'center', gap: 8 },
  orderCard: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 14, marginBottom: 12, backgroundColor: colors.white },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 8 },
  orderNo: { color: colors.muted, fontSize: 11, fontWeight: '800' },
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
  vehicleCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  vehicleEta: { color: colors.green, fontSize: 11, fontWeight: '900', backgroundColor: colors.partnerLight, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
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
  mapSelectButton: { alignSelf: 'flex-start', minHeight: 36, borderRadius: 12, backgroundColor: colors.customerLight, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, marginTop: 8 },
  mapSelectText: { color: colors.customer, fontSize: 12, fontWeight: '900' },
  mapPickerShell: { flex: 1, backgroundColor: colors.white, padding: 16 },
  mapPickerHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  mapPickerClose: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.faint, alignItems: 'center', justifyContent: 'center' },
  mapPickerTitle: { color: colors.ink, fontSize: 20, fontWeight: '900' },
  mapPickerSubtitle: { color: colors.muted, fontSize: 12, fontWeight: '700', marginTop: 2 },
  mapPickerSearchShell: { minHeight: 52, borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13 },
  mapPickerSearchInput: { flex: 1, color: colors.ink, fontSize: 14, fontWeight: '800', paddingVertical: 11 },
  mapPickerSuggestionBox: { borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.white, marginTop: 8, overflow: 'hidden', maxHeight: 210 },
  mapPickerCanvas: { flex: 1, minHeight: 300, borderRadius: 18, backgroundColor: '#EAF5EF', overflow: 'hidden', marginTop: 14, marginBottom: 12 },
  mapPickerRealMap: { flex: 1 },
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
  mapPickerCurrentButton: { minHeight: 38, borderRadius: 13, backgroundColor: colors.customerLight, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 14 },
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
  contactSheetOverlay: { flex: 1, justifyContent: 'flex-end' },
  contactSheetBackdrop: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(17,24,39,0.42)' },
  contactSheet: { backgroundColor: colors.white, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 16, paddingBottom: 18 },
  contactSheetHandle: { width: 44, height: 4, borderRadius: 4, backgroundColor: colors.line, alignSelf: 'center', marginBottom: 12 },
  contactSheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  contactSheetTitle: { color: colors.ink, fontSize: 20, fontWeight: '900' },
  contactSheetSubtitle: { color: colors.muted, fontSize: 12, fontWeight: '800', marginTop: 2 },
  contactPlaceBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.faint, borderRadius: 14, padding: 12, marginBottom: 12 },
  contactPlaceText: { flex: 1, color: colors.ink, fontSize: 12, fontWeight: '800', lineHeight: 17 },
  contactSheetActions: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 4 },
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
  map: { height: 170, borderRadius: 18, backgroundColor: '#F0EBFF', overflow: 'hidden', marginBottom: 14 },
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
  orderMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  orderMetaText: { color: colors.muted, fontSize: 10, fontWeight: '900', backgroundColor: colors.faint, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 8 },
  bold: { fontWeight: '900', fontSize: 15 },
  divider: { height: 1, backgroundColor: '#C4B5FD', marginVertical: 8 },
  walletCard: { borderRadius: 18, padding: 20, borderWidth: 1, borderColor: colors.line, alignItems: 'center', gap: 10 },
  walletHero: { borderRadius: 18, padding: 18, backgroundColor: colors.customer, marginBottom: 14 },
  walletHeroText: { color: '#EDE9FE', fontSize: 12, fontWeight: '800', marginTop: 4, maxWidth: 210, lineHeight: 17 },
  walletHeroIcon: { width: 46, height: 46, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  walletBalance: { color: colors.white, fontSize: 38, fontWeight: '900', marginTop: 12 },
  walletBalanceLabel: { color: '#EDE9FE', fontSize: 12, fontWeight: '900', marginTop: 2 },
  walletPanel: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.white, padding: 14, marginBottom: 14, gap: 10 },
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
  accountHero: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.white, padding: 16 },
  accountAvatar: { width: 58, height: 58, borderRadius: 18, backgroundColor: colors.customer, alignItems: 'center', justifyContent: 'center' },
  accountAvatarText: { color: colors.white, fontSize: 20, fontWeight: '900' },
  accountName: { color: colors.ink, fontSize: 18, fontWeight: '900' },
  accountSubtext: { color: colors.muted, fontSize: 12, fontWeight: '700', marginTop: 2 },
  accountVerifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.partnerLight, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5 },
  accountVerifiedText: { color: colors.green, fontSize: 10, fontWeight: '900' },
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
  savedAddressIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.customerLight, alignItems: 'center', justifyContent: 'center' },
  savedAddressTitle: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  savedAddressSubtitle: { color: colors.muted, fontSize: 12, fontWeight: '800', marginTop: 2 },
  savedAddressMeta: { color: colors.muted, fontSize: 10, fontWeight: '700', marginTop: 3 },
  savedAddressDeleteButton: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' },
  savedAddressEmpty: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.white, padding: 16, alignItems: 'center', gap: 5 },
  savedAddressEmptyTitle: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  accountMenu: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.white, overflow: 'hidden' },
  accountMenuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: colors.line },
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
