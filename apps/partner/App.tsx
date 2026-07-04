import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Notifications from 'expo-notifications';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import RazorpayCheckout from 'react-native-razorpay';
import { io, Socket } from 'socket.io-client';
import { Ionicons } from '@expo/vector-icons';
import indieryLogoImage from './assets/indiery-logo.png';
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
const expoProjectId = (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId;
const androidStatusBarInset = Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false
  })
});

type Tab = 'dashboard' | 'active' | 'earnings' | 'profile';
type KycDoc = 'selfie' | 'pan' | 'aadhaar' | 'drivingLicence' | 'rc';
type BankDetailsInput = { accountHolder: string; accountNumber: string; ifsc: string };
type PartnerProfileInput = { name: string; email: string; city: string; vehicleId: string; vehicleNumber: string };
type OnboardingStepId = 1 | 2 | 3;
type AppLanguage = 'en' | 'hi';
type ProfilePage = 'overview' | 'personal' | 'vehicle' | 'documents' | 'bank' | 'language' | 'legal';

const enCopy = {
  appName: 'Indiery Partner',
  appEyebrow: 'INDIERY PARTNER',
  loadingPartner: 'Loading Indiery Partner',
  partnerSetup: 'Partner setup',
  welcomeBack: 'Welcome Back',
  loginSubtitle: 'Login to manage your deliveries',
  loginHeroCaption: 'Delivering trust, every mile.',
  mobileNumber: 'Mobile Number',
  enterMobileNumber: 'Enter your mobile number',
  otpSent: 'OTP sent. Enter the code to verify.',
  otpCode: 'OTP code',
  change: 'Change',
  verify: 'Verify',
  verifying: 'Verifying',
  sending: 'Sending',
  sendOtp: 'Send OTP',
  live: 'Live',
  secure: 'Secure',
  smart: 'Smart',
  orders: 'Orders',
  kyc: 'KYC',
  payouts: 'Payouts',
  support: 'Support',
  completePartnerSetup: 'Complete partner setup',
  completePartnerSetupText: 'Finish these steps once. Dashboard opens after all required details are submitted.',
  setupProgress: 'Setup progress',
  personal: 'Personal',
  uploads: 'Uploads',
  vehicle: 'Vehicle',
  personalDetails: 'Personal details',
  personalDetailsSubtitle: 'Name, email, phone, and city',
  fullName: 'Full name',
  email: 'Email',
  city: 'City',
  loginMobileNumber: 'Login mobile number',
  saveAndNext: 'Save and Next',
  uploadDetails: 'Upload details',
  uploadDetailsSubtitle: 'Selfie, identity proof, and driving licence',
  liveSelfie: 'Live selfie',
  captureClearFacePhoto: 'Capture a clear face photo',
  panOrAadhaar: 'PAN or Aadhaar',
  identityProof: 'Identity proof',
  oneIdentityProofRequired: 'One identity proof is required',
  capturePanOrAadhaarRequired: 'Capture PAN or Aadhaar. One is required.',
  panDone: 'PAN done',
  capturePan: 'Capture PAN',
  aadhaarDone: 'Aadhaar done',
  captureAadhaar: 'Capture Aadhaar',
  drivingLicence: 'Driving licence',
  captureLicencePhoto: 'Capture licence photo',
  captureFrontClearly: 'Capture front side clearly',
  next: 'Next',
  back: 'Back',
  pressBackAgainToExit: 'Press back again to exit',
  vehicleDetails: 'Vehicle details',
  vehicleDetailsSubtitle: 'Vehicle type, number, and RC',
  vehicleType: 'Vehicle type',
  vehicleNumber: 'Vehicle number',
  upToKg: 'Up to',
  rcCaptured: 'RC captured',
  captureRc: 'Capture RC',
  saveVehicle: 'Save Vehicle',
  continue: 'Continue',
  saving: 'Saving',
  done: 'Done',
  opening: 'Opening',
  capture: 'Capture',
  rechargeDriverWallet: 'Recharge driver wallet',
  minimumBalanceRequired: 'Minimum {amount} balance is required to receive new orders.',
  currentBalance: 'Current balance',
  recharge: 'Recharge',
  syncing: 'SYNCING',
  online: 'ONLINE',
  offline: 'OFFLINE',
  rechargeStatus: 'RECHARGE',
  receivingNearbyOrders: 'Receiving nearby orders',
  tapToStartReceivingOrders: 'Tap to start receiving orders',
  walletBelowMinimum: 'Wallet below minimum',
  today: 'Today',
  rating: 'Rating',
  availableJobs: 'Available Jobs',
  activeTrip: 'Active Trip',
  nearbyOrders: 'Nearby Orders',
  availableOrders: 'Available Orders',
  noOrdersRightNow: 'No orders right now',
  stayOnlineRefresh: 'Stay online and refresh after a customer books.',
  skip: 'Skip',
  wait: 'Wait',
  accept: 'Accept',
  noActiveDelivery: 'No active delivery',
  acceptOrderFromHome: 'Accept an order from Home to start a delivery.',
  refresh: 'Refresh',
  activeOrders: 'Active Orders',
  activeTrips: 'Active Trips',
  orderHistory: 'Order History',
  noOrderHistory: 'No completed deliveries yet',
  completedDeliveriesAppearHere: 'Your completed deliveries will appear here.',
  to: 'to',
  tripActions: 'Trip Actions',
  pickupOtp: 'Pickup OTP',
  dropOtp: 'Drop OTP',
  enter6DigitCode: 'Enter 6 digit code',
  updating: 'Updating',
  orderValue: 'Order value',
  driverCommission: 'Driver commission 80%',
  reserveReward: 'On-time reserve reward 5%',
  indieryCommission: 'Indiery commission 15%',
  youReceiveOnTime: 'You receive if on-time',
  ifLateReceive: 'If late, you receive',
  walletBalance: 'WALLET BALANCE',
  tripsThisWeek: 'trips this week',
  rechargeToUnlock: 'Recharge {amount} to unlock new orders',
  requesting: 'Requesting',
  requestPayout: 'Request Payout',
  recentTransactions: 'Recent Transactions',
  wallet: 'Wallet',
  earn: 'Earn',
  home: 'Home',
  active: 'Active',
  profile: 'Profile',
  profileManageText: 'Manage personal details, vehicle details, and uploaded documents.',
  account: 'Account',
  accountSubtitle: 'Manage your partner profile',
  profileComplete: 'Profile complete',
  personalInformation: 'Personal Information',
  personalInformationSubtitle: 'Name, phone, email and city',
  keepDetailsUpdated: 'Keep your details up to date',
  mobileLinkedToAccount: 'Your mobile number is linked to your verified account.',
  saveChanges: 'Save Changes',
  documentsKyc: 'Documents & KYC',
  allDocumentsVerified: 'All documents verified',
  documentsNeedAttention: 'Review and complete your documents',
  languageSubtitle: 'Choose your preferred app language',
  policiesLegalSubtitle: 'Privacy, terms and refunds',
  verification: 'verification',
  mobile: 'Mobile',
  notAdded: 'Not added',
  numberNotAdded: 'Number not added',
  documentProgress: 'Document progress',
  status: 'Status',
  submittedForReview: 'submitted for review',
  documentsUploaded: 'Documents Uploaded',
  vehicleRc: 'Vehicle RC',
  rcRequired: 'Required for vehicle ownership or authorization',
  bankAccount: 'Bank account',
  accountSaved: 'Account saved',
  ifscSaved: 'IFSC saved',
  usedForPayouts: 'Used for payouts',
  accountHolder: 'Account holder',
  nameAsPerBank: 'Name as per bank',
  accountNumber: 'Account number',
  enterAccountNumber: 'Enter account number',
  ifscCode: 'IFSC code',
  updateBank: 'Update Bank',
  saveBank: 'Save Bank',
  profileSubmittedNotice: 'Profile submitted. Indiery will verify documents before order access is enabled.',
  requestAccountDeletion: 'Request account deletion',
  requestAccountDeletionBody: 'We will review your request and delete eligible account data. Some order, payout, KYC, fraud prevention, tax, or legal records may be retained where required.',
  submitRequest: 'Submit request',
  cancel: 'Cancel',
  logout: 'Logout',
  changeLanguage: 'Change language',
  english: 'English',
  hindi: 'Hindi',
  hindiNative: 'हिन्दी',
  languageSetEnglish: 'Language set to English',
  languageSetHindi: 'भाषा हिन्दी पर सेट हुई',
  policiesLegal: 'Policies and Legal',
  updated: 'Updated',
  customer: 'Customer',
  pickup: 'Pickup',
  drop: 'Drop',
  min: 'MIN',
  arrivedAtPickup: 'Arrived at Pickup',
  capturePickupPod: 'Capture Pickup POD',
  markPickedUp: 'Mark Picked Up',
  startTransit: 'Start Transit',
  captureDropPod: 'Capture Drop POD',
  markDelivered: 'Mark Delivered',
  refreshTrip: 'Refresh Trip',
  searching: 'Searching',
  offered: 'Available',
  accepted: 'Accepted',
  arrived_pickup: 'At pickup',
  picked_up: 'Picked up',
  in_transit: 'In transit',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  not_started: 'not started',
  verified: 'verified',
  pending: 'pending',
  rejected: 'rejected',
  timelineOrderPlaced: 'Order placed',
  timelineCustomerBookingConfirmed: 'Customer booking confirmed',
  timelinePartnerAssigned: 'Partner assigned',
  timelineWaitingPartnerConfirmation: 'Waiting for partner confirmation',
  timelineArrivedAtPickup: 'Arrived at pickup',
  timelinePartnerAtPickup: 'Partner is at pickup location',
  timelinePickedUp: 'Picked up',
  timelineGoodsPickedUpProof: 'Goods picked up with proof',
  timelineInTransit: 'In transit',
  timelineMovingTowardDrop: 'Moving toward drop location',
  timelineDelivered: 'Delivered',
  timelineDeliveryCompleted: 'Delivery completed',
  unableToLoadPartnerApp: 'Unable to load partner app',
  refreshFailed: 'Refresh failed',
  waitingGpsLocation: 'Waiting for GPS location',
  actionFailed: 'Action failed',
  profileSaved: 'Profile saved',
  kycPhotoCaptured: 'KYC photo captured',
  bankDetailsSaved: 'Bank details saved',
  walletRecharged: 'Wallet recharged',
  walletRechargeFailed: 'Wallet recharge failed',
  logoutFailed: 'Logout failed',
  deletionRequestSubmitted: 'Deletion request submitted',
  requestFailed: 'Request failed',
  youAreOnline: 'You are online',
  youAreOffline: 'You are offline',
  orderAccepted: 'Order accepted',
  orderSkipped: 'Order skipped',
  otpVerified: 'OTP verified',
  podCaptured: 'POD captured',
  orderUpdated: 'Order updated',
  payoutRequested: 'Payout requested',
  unableToSendOtp: 'Unable to send OTP',
  unableToVerifyOtp: 'Unable to verify OTP',
  invalidOtp: 'Invalid OTP',
  enterValidMobile: 'Enter a valid mobile number',
  locationPermissionRequired: 'Location permission is required to receive nearby orders',
  turnOnGps: 'Turn on device location/GPS to receive nearby orders',
  gpsTakingTooLong: 'GPS is taking too long',
  notificationRegisterLater: 'Notifications allowed. Driver alerts will register when network is available',
  permissionSettings: 'Enable {permissions} permission in phone settings for driver app features',
  permissionLocation: 'location',
  permissionNotifications: 'notifications',
  permissionCamera: 'camera',
  orderAlerts: 'Order alerts',
  cameraPermissionRequired: 'Camera permission is required to capture proof',
  noImageCaptured: 'No image captured',
  missingPhoto: 'Captured photo is missing. Please retake the photo.',
  onlyImageSupported: 'Only image capture is supported for proof upload.',
  photoTooLarge: 'Photo is too large. Please retake a clearer, smaller photo.',
  walletRechargeUnavailable: 'Wallet recharge is not available',
  paymentVerificationMissing: 'Payment verification details missing',
  enterFullName: 'Enter your full name',
  enterValidEmail: 'Enter a valid email',
  enterCity: 'Enter your city',
  vehicleCatalogUnavailable: 'Vehicle catalog is not available yet',
  captureLiveSelfie: 'Capture your live selfie',
  capturePanOrAadhaar: 'Capture PAN or Aadhaar',
  captureDrivingLicence: 'Capture your driving licence',
  selectVehicleType: 'Select your vehicle type',
  enterVehicleNumber: 'Enter vehicle number',
  enterAccountHolderName: 'Enter account holder name',
  enterValidAccountNumber: 'Enter a valid account number',
  enterValidIfsc: 'Enter a valid IFSC code'
} as const;

const hiCopy: Partial<Record<keyof typeof enCopy, string>> = {
  loadingPartner: 'Indiery Partner लोड हो रहा है',
  partnerSetup: 'पार्टनर सेटअप',
  welcomeBack: 'वापसी पर स्वागत है',
  loginSubtitle: 'अपनी डिलीवरी संभालने के लिए लॉगिन करें',
  loginHeroCaption: 'हर सफर में भरोसेमंद डिलीवरी.',
  mobileNumber: 'मोबाइल नंबर',
  enterMobileNumber: 'अपना मोबाइल नंबर डालें',
  otpSent: 'OTP भेज दिया गया है. सत्यापन के लिए कोड डालें.',
  otpCode: 'OTP कोड',
  change: 'बदलें',
  verify: 'सत्यापित करें',
  verifying: 'सत्यापन हो रहा है',
  sending: 'भेज रहे हैं',
  sendOtp: 'OTP भेजें',
  live: 'लाइव',
  secure: 'सुरक्षित',
  smart: 'स्मार्ट',
  orders: 'ऑर्डर',
  kyc: 'KYC',
  payouts: 'पेआउट',
  support: 'सपोर्ट',
  completePartnerSetup: 'पार्टनर सेटअप पूरा करें',
  completePartnerSetupText: 'ये स्टेप एक बार पूरे करें. सभी जरूरी जानकारी जमा होने के बाद डैशबोर्ड खुलेगा.',
  setupProgress: 'सेटअप प्रगति',
  personal: 'व्यक्तिगत',
  uploads: 'अपलोड',
  vehicle: 'वाहन',
  personalDetails: 'व्यक्तिगत जानकारी',
  personalDetailsSubtitle: 'नाम, ईमेल, फोन और शहर',
  fullName: 'पूरा नाम',
  email: 'ईमेल',
  city: 'शहर',
  loginMobileNumber: 'लॉगिन मोबाइल नंबर',
  saveAndNext: 'सेव करें और आगे बढ़ें',
  uploadDetails: 'दस्तावेज अपलोड',
  uploadDetailsSubtitle: 'सेल्फी, पहचान पत्र और ड्राइविंग लाइसेंस',
  liveSelfie: 'लाइव सेल्फी',
  captureClearFacePhoto: 'चेहरे की साफ फोटो लें',
  panOrAadhaar: 'PAN या Aadhaar',
  identityProof: 'पहचान प्रमाण',
  oneIdentityProofRequired: 'एक पहचान प्रमाण जरूरी है',
  capturePanOrAadhaarRequired: 'PAN या Aadhaar कैप्चर करें. एक जरूरी है.',
  panDone: 'PAN हो गया',
  capturePan: 'PAN कैप्चर करें',
  aadhaarDone: 'Aadhaar हो गया',
  captureAadhaar: 'Aadhaar कैप्चर करें',
  drivingLicence: 'ड्राइविंग लाइसेंस',
  captureLicencePhoto: 'लाइसेंस की फोटो लें',
  captureFrontClearly: 'सामने की तरफ साफ कैप्चर करें',
  next: 'आगे',
  back: 'वापस',
  vehicleDetails: 'वाहन जानकारी',
  vehicleDetailsSubtitle: 'वाहन प्रकार, नंबर और RC',
  vehicleType: 'वाहन प्रकार',
  vehicleNumber: 'वाहन नंबर',
  upToKg: 'अधिकतम',
  rcCaptured: 'RC कैप्चर हो गया',
  captureRc: 'RC कैप्चर करें',
  saveVehicle: 'वाहन सेव करें',
  continue: 'जारी रखें',
  saving: 'सेव हो रहा है',
  done: 'पूरा',
  opening: 'खुल रहा है',
  capture: 'कैप्चर',
  rechargeDriverWallet: 'ड्राइवर वॉलेट रिचार्ज करें',
  minimumBalanceRequired: 'नए ऑर्डर पाने के लिए कम से कम {amount} बैलेंस जरूरी है.',
  currentBalance: 'मौजूदा बैलेंस',
  recharge: 'रिचार्ज',
  syncing: 'सिंक हो रहा है',
  online: 'ऑनलाइन',
  offline: 'ऑफलाइन',
  rechargeStatus: 'रिचार्ज',
  receivingNearbyOrders: 'पास के ऑर्डर मिल रहे हैं',
  tapToStartReceivingOrders: 'ऑर्डर पाने के लिए टैप करें',
  walletBelowMinimum: 'वॉलेट बैलेंस कम है',
  today: 'आज',
  rating: 'रेटिंग',
  availableJobs: 'उपलब्ध ऑर्डर',
  activeTrip: 'एक्टिव ट्रिप',
  nearbyOrders: 'पास के ऑर्डर',
  availableOrders: 'उपलब्ध ऑर्डर',
  noOrdersRightNow: 'अभी कोई ऑर्डर नहीं',
  stayOnlineRefresh: 'ऑनलाइन रहें और ग्राहक बुकिंग के बाद रिफ्रेश करें.',
  skip: 'छोड़ें',
  wait: 'रुकें',
  accept: 'स्वीकार करें',
  noActiveDelivery: 'कोई एक्टिव डिलीवरी नहीं',
  acceptOrderFromHome: 'डिलीवरी शुरू करने के लिए होम से ऑर्डर स्वीकार करें.',
  refresh: 'रिफ्रेश',
  activeOrders: 'एक्टिव ऑर्डर',
  activeTrips: 'एक्टिव ट्रिप',
  orderHistory: 'ऑर्डर हिस्ट्री',
  noOrderHistory: 'अभी कोई पूरी हुई डिलीवरी नहीं',
  completedDeliveriesAppearHere: 'आपकी पूरी हुई डिलीवरी यहां दिखाई देगी.',
  to: 'से',
  tripActions: 'ट्रिप एक्शन',
  pickupOtp: 'पिकअप OTP',
  dropOtp: 'ड्रॉप OTP',
  enter6DigitCode: '6 अंकों का कोड डालें',
  updating: 'अपडेट हो रहा है',
  orderValue: 'ऑर्डर वैल्यू',
  driverCommission: 'ड्राइवर कमीशन 80%',
  reserveReward: 'समय पर रिजर्व रिवॉर्ड 5%',
  indieryCommission: 'Indiery कमीशन 15%',
  youReceiveOnTime: 'समय पर आपको मिलेगा',
  ifLateReceive: 'देरी होने पर आपको मिलेगा',
  walletBalance: 'वॉलेट बैलेंस',
  tripsThisWeek: 'इस हफ्ते ट्रिप',
  rechargeToUnlock: 'नए ऑर्डर अनलॉक करने के लिए {amount} रिचार्ज करें',
  requesting: 'अनुरोध हो रहा है',
  requestPayout: 'पेआउट अनुरोध',
  recentTransactions: 'हाल की ट्रांजैक्शन',
  wallet: 'वॉलेट',
  earn: 'कमाई',
  home: 'होम',
  active: 'एक्टिव',
  profile: 'प्रोफाइल',
  account: 'अकाउंट',
  accountSubtitle: 'अपनी पार्टनर प्रोफाइल मैनेज करें',
  profileComplete: 'प्रोफाइल पूरी',
  personalInformation: 'व्यक्तिगत जानकारी',
  personalInformationSubtitle: 'नाम, फोन, ईमेल और शहर',
  keepDetailsUpdated: 'अपनी जानकारी अपडेट रखें',
  mobileLinkedToAccount: 'आपका मोबाइल नंबर आपके सत्यापित अकाउंट से जुड़ा है.',
  saveChanges: 'बदलाव सेव करें',
  documentsKyc: 'दस्तावेज और KYC',
  allDocumentsVerified: 'सभी दस्तावेज सत्यापित हैं',
  documentsNeedAttention: 'अपने दस्तावेज जांचें और पूरे करें',
  languageSubtitle: 'ऐप की पसंदीदा भाषा चुनें',
  policiesLegalSubtitle: 'प्राइवेसी, नियम और रिफंड',
  profileManageText: 'व्यक्तिगत जानकारी, वाहन जानकारी और अपलोड दस्तावेज संभालें.',
  verification: 'सत्यापन',
  mobile: 'मोबाइल',
  notAdded: 'जोड़ा नहीं गया',
  numberNotAdded: 'नंबर नहीं जोड़ा गया',
  documentProgress: 'दस्तावेज प्रगति',
  status: 'स्टेटस',
  submittedForReview: 'रिव्यू के लिए जमा',
  documentsUploaded: 'अपलोड किए दस्तावेज',
  vehicleRc: 'वाहन RC',
  rcRequired: 'वाहन स्वामित्व या अनुमति के लिए जरूरी',
  bankAccount: 'बैंक अकाउंट',
  accountSaved: 'अकाउंट सेव है',
  ifscSaved: 'IFSC सेव है',
  usedForPayouts: 'पेआउट के लिए उपयोग होगा',
  accountHolder: 'अकाउंट होल्डर',
  nameAsPerBank: 'बैंक के अनुसार नाम',
  accountNumber: 'अकाउंट नंबर',
  enterAccountNumber: 'अकाउंट नंबर डालें',
  ifscCode: 'IFSC कोड',
  updateBank: 'बैंक अपडेट करें',
  saveBank: 'बैंक सेव करें',
  profileSubmittedNotice: 'प्रोफाइल जमा हो गई है. ऑर्डर एक्सेस से पहले Indiery दस्तावेज सत्यापित करेगा.',
  requestAccountDeletion: 'अकाउंट डिलीट अनुरोध',
  requestAccountDeletionBody: 'हम आपका अनुरोध रिव्यू करेंगे और योग्य अकाउंट डेटा हटाएंगे. कुछ ऑर्डर, पेआउट, KYC, धोखाधड़ी रोकथाम, टैक्स या कानूनी रिकॉर्ड जरूरत के अनुसार रखे जा सकते हैं.',
  submitRequest: 'अनुरोध भेजें',
  cancel: 'रद्द करें',
  logout: 'लॉगआउट',
  changeLanguage: 'भाषा बदलें',
  english: 'English',
  hindi: 'Hindi',
  hindiNative: 'हिन्दी',
  policiesLegal: 'पॉलिसी और लीगल',
  updated: 'अपडेटेड',
  customer: 'ग्राहक',
  pickup: 'पिकअप',
  drop: 'ड्रॉप',
  min: 'मिनट',
  arrivedAtPickup: 'पिकअप पर पहुंचा',
  capturePickupPod: 'पिकअप POD कैप्चर करें',
  markPickedUp: 'पिकअप मार्क करें',
  startTransit: 'ट्रांजिट शुरू करें',
  captureDropPod: 'ड्रॉप POD कैप्चर करें',
  markDelivered: 'डिलीवर मार्क करें',
  refreshTrip: 'ट्रिप रिफ्रेश करें',
  searching: 'खोज जारी',
  offered: 'उपलब्ध',
  accepted: 'स्वीकार हुआ',
  arrived_pickup: 'पिकअप पर',
  picked_up: 'पिकअप हो गया',
  in_transit: 'रास्ते में',
  delivered: 'डिलीवर हुआ',
  cancelled: 'रद्द',
  not_started: 'शुरू नहीं',
  verified: 'सत्यापित',
  pending: 'पेंडिंग',
  rejected: 'रिजेक्ट',
  timelineOrderPlaced: 'ऑर्डर रखा गया',
  timelineCustomerBookingConfirmed: 'ग्राहक बुकिंग कन्फर्म हुई',
  timelinePartnerAssigned: 'पार्टनर असाइन हुआ',
  timelineWaitingPartnerConfirmation: 'पार्टनर कन्फर्मेशन का इंतजार',
  timelineArrivedAtPickup: 'पिकअप पर पहुंचा',
  timelinePartnerAtPickup: 'पार्टनर पिकअप लोकेशन पर है',
  timelinePickedUp: 'पिकअप हो गया',
  timelineGoodsPickedUpProof: 'प्रूफ के साथ सामान पिकअप हुआ',
  timelineInTransit: 'रास्ते में',
  timelineMovingTowardDrop: 'ड्रॉप लोकेशन की तरफ जा रहे हैं',
  timelineDelivered: 'डिलीवर हुआ',
  timelineDeliveryCompleted: 'डिलीवरी पूरी हुई',
  unableToLoadPartnerApp: 'पार्टनर ऐप लोड नहीं हो पाया',
  refreshFailed: 'रिफ्रेश फेल हुआ',
  waitingGpsLocation: 'GPS लोकेशन का इंतजार',
  actionFailed: 'एक्शन फेल हुआ',
  profileSaved: 'प्रोफाइल सेव हो गई',
  kycPhotoCaptured: 'KYC फोटो कैप्चर हो गई',
  bankDetailsSaved: 'बैंक जानकारी सेव हो गई',
  walletRecharged: 'वॉलेट रिचार्ज हो गया',
  walletRechargeFailed: 'वॉलेट रिचार्ज फेल हुआ',
  logoutFailed: 'लॉगआउट फेल हुआ',
  deletionRequestSubmitted: 'डिलीशन अनुरोध भेज दिया गया',
  requestFailed: 'अनुरोध फेल हुआ',
  youAreOnline: 'आप ऑनलाइन हैं',
  youAreOffline: 'आप ऑफलाइन हैं',
  orderAccepted: 'ऑर्डर स्वीकार हुआ',
  orderSkipped: 'ऑर्डर छोड़ा गया',
  otpVerified: 'OTP सत्यापित हुआ',
  podCaptured: 'POD कैप्चर हुआ',
  orderUpdated: 'ऑर्डर अपडेट हुआ',
  payoutRequested: 'पेआउट अनुरोध भेजा गया',
  unableToSendOtp: 'OTP नहीं भेज पाए',
  unableToVerifyOtp: 'OTP सत्यापित नहीं हो पाया',
  invalidOtp: 'OTP गलत है',
  enterValidMobile: 'सही मोबाइल नंबर डालें',
  locationPermissionRequired: 'पास के ऑर्डर पाने के लिए लोकेशन परमिशन जरूरी है',
  turnOnGps: 'पास के ऑर्डर पाने के लिए डिवाइस लोकेशन/GPS चालू करें',
  gpsTakingTooLong: 'GPS में ज्यादा समय लग रहा है',
  notificationRegisterLater: 'नोटिफिकेशन अनुमति मिली. नेटवर्क उपलब्ध होने पर ड्राइवर अलर्ट रजिस्टर होंगे',
  permissionSettings: 'ड्राइवर ऐप फीचर के लिए फोन सेटिंग में {permissions} परमिशन चालू करें',
  permissionLocation: 'लोकेशन',
  permissionNotifications: 'नोटिफिकेशन',
  permissionCamera: 'कैमरा',
  orderAlerts: 'ऑर्डर अलर्ट',
  cameraPermissionRequired: 'प्रूफ कैप्चर करने के लिए कैमरा परमिशन जरूरी है',
  noImageCaptured: 'कोई फोटो कैप्चर नहीं हुई',
  missingPhoto: 'कैप्चर फोटो नहीं मिली. कृपया दोबारा फोटो लें.',
  onlyImageSupported: 'प्रूफ अपलोड के लिए केवल इमेज कैप्चर समर्थित है.',
  photoTooLarge: 'फोटो बहुत बड़ी है. कृपया साफ और छोटी फोटो दोबारा लें.',
  walletRechargeUnavailable: 'वॉलेट रिचार्ज उपलब्ध नहीं है',
  paymentVerificationMissing: 'पेमेंट सत्यापन जानकारी नहीं मिली',
  enterFullName: 'अपना पूरा नाम डालें',
  enterValidEmail: 'सही ईमेल डालें',
  enterCity: 'अपना शहर डालें',
  vehicleCatalogUnavailable: 'वाहन कैटलॉग अभी उपलब्ध नहीं है',
  captureLiveSelfie: 'अपनी लाइव सेल्फी कैप्चर करें',
  capturePanOrAadhaar: 'PAN या Aadhaar कैप्चर करें',
  captureDrivingLicence: 'अपना ड्राइविंग लाइसेंस कैप्चर करें',
  selectVehicleType: 'अपना वाहन प्रकार चुनें',
  enterVehicleNumber: 'वाहन नंबर डालें',
  enterAccountHolderName: 'अकाउंट होल्डर नाम डालें',
  enterValidAccountNumber: 'सही अकाउंट नंबर डालें',
  enterValidIfsc: 'सही IFSC कोड डालें'
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

function useAndroidBackHandler(onBack: () => boolean, dependencies: React.DependencyList) {
  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => subscription.remove();
  }, dependencies);
}

function languageNativeLabel(language: AppLanguage) {
  return language === 'hi' ? appCopy.hi.hindiNative : appCopy.en.english;
}

function fillCopy(value: string, params: Record<string, string | number>) {
  return Object.entries(params).reduce((text, [key, replacement]) => text.replace(`{${key}}`, String(replacement)), value);
}

function orderStatusLabel(language: AppLanguage, status: Order['status']) {
  const keyByStatus: Record<Order['status'], CopyKey> = {
    searching: 'searching',
    offered: 'offered',
    accepted: 'accepted',
    arrived_pickup: 'arrived_pickup',
    picked_up: 'picked_up',
    in_transit: 'in_transit',
    delivered: 'delivered',
    cancelled: 'cancelled'
  };
  return copyFor(language, keyByStatus[status]) || statusLabels[status] || status;
}

function kycStatusLabel(language: AppLanguage, status?: string) {
  const labels: Record<string, CopyKey> = {
    not_started: 'not_started',
    pending: 'pending',
    verified: 'verified',
    rejected: 'rejected'
  };
  return status && labels[status] ? copyFor(language, labels[status]) : status || copyFor(language, 'not_started');
}

function uploadImageProfile(purpose: 'pod' | 'kyc' | 'profile') {
  if (purpose === 'kyc') return { maxDimension: 1280, cameraQuality: 0.55, uploadQuality: 0.62 };
  return { maxDimension: 960, cameraQuality: 0.42, uploadQuality: 0.52 };
}

async function optimizeUploadImage(asset: ImagePicker.ImagePickerAsset, purpose: 'pod' | 'kyc' | 'profile') {
  const profile = uploadImageProfile(purpose);
  const width = asset.width ?? 0;
  const height = asset.height ?? 0;
  const resize =
    width > height
      ? { width: Math.min(width || profile.maxDimension, profile.maxDimension) }
      : { height: Math.min(height || profile.maxDimension, profile.maxDimension) };

  try {
    const optimized = await ImageManipulator.manipulateAsync(
      asset.uri,
      width || height ? [{ resize }] : [],
      {
        compress: profile.uploadQuality,
        format: ImageManipulator.SaveFormat.JPEG
      }
    );
    return {
      uri: optimized.uri,
      fileName: `indiery-${purpose}-${Date.now()}.jpg`,
      mimeType: 'image/jpeg'
    };
  } catch {
    return {
      uri: asset.uri,
      fileName: asset.fileName ?? `indiery-${purpose}-${Date.now()}.jpg`,
      mimeType: asset.mimeType ?? 'image/jpeg'
    };
  }
}

function timelineTitle(language: AppLanguage, key?: string, fallback = '') {
  const labels: Record<string, CopyKey> = {
    created: 'timelineOrderPlaced',
    assigned: 'timelinePartnerAssigned',
    arrived_pickup: 'timelineArrivedAtPickup',
    picked_up: 'timelinePickedUp',
    in_transit: 'timelineInTransit',
    delivered: 'timelineDelivered'
  };
  return key && labels[key] ? copyFor(language, labels[key]) : fallback;
}

function timelineNote(language: AppLanguage, key?: string, fallback = '') {
  const labels: Record<string, CopyKey> = {
    created: 'timelineCustomerBookingConfirmed',
    assigned: 'timelineWaitingPartnerConfirmation',
    arrived_pickup: 'timelinePartnerAtPickup',
    picked_up: 'timelineGoodsPickedUpProof',
    in_transit: 'timelineMovingTowardDrop',
    delivered: 'timelineDeliveryCompleted'
  };
  return key && labels[key] ? copyFor(language, labels[key]) : fallback;
}

function formatPhoneForFirebase(phoneInput: string, language: AppLanguage = 'en') {
  const trimmed = phoneInput.trim();
  if (trimmed.startsWith('+')) return trimmed.replace(/[^\d+]/g, '');

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.startsWith('91') && digits.length === 12) return `+${digits}`;
  throw new Error(copyFor(language, 'enterValidMobile'));
}

function partnerSetupProgress(user: UserProfile) {
  const docs = user.partnerProfile?.docs;
  const profileDone =
    Boolean(user.email) &&
    user.name !== 'Indiery Partner' &&
    Boolean(user.city) &&
    Boolean(user.partnerProfile?.vehicleId) &&
    Boolean(user.partnerProfile?.vehicleNumber);
  const steps = [
    profileDone,
    Boolean(docs?.selfie),
    Boolean(docs?.pan || docs?.aadhaar),
    Boolean(docs?.drivingLicence),
    Boolean(docs?.rc)
  ];
  return {
    completed: steps.filter(Boolean).length,
    total: steps.length,
    complete: steps.every(Boolean)
  };
}

function needsPartnerOnboarding(user: UserProfile) {
  return !partnerSetupProgress(user).complete;
}

function vehicleNameForId(vehicles: Vehicle[], vehicleId?: string) {
  return vehicles.find((vehicle) => vehicle.id === vehicleId)?.shortName || 'Vehicle not selected';
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeout) clearTimeout(timeout);
  });
}

async function readDeviceLocation(language: AppLanguage = 'en') {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== 'granted') {
    throw new Error(copyFor(language, 'locationPermissionRequired'));
  }

  const servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled) {
    throw new Error(copyFor(language, 'turnOnGps'));
  }

  try {
    return await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      8000,
      copyFor(language, 'gpsTakingTooLong')
    );
  } catch (err) {
    const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: 120000 }).catch(() => null);
    if (lastKnown) return lastKnown;
    throw err;
  }
}

async function requestPartnerAppPermissions(api: IndieryApi, onMessage: (message: string) => void, language: AppLanguage) {
  const denied: string[] = [];

  try {
    const locationPermission = await Location.getForegroundPermissionsAsync();
    const locationStatus =
      locationPermission.status === 'granted'
        ? locationPermission
        : await Location.requestForegroundPermissionsAsync();
    if (locationStatus.status !== 'granted') denied.push(copyFor(language, 'permissionLocation'));
  } catch {
    denied.push(copyFor(language, 'permissionLocation'));
  }

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('orders', {
        name: copyFor(language, 'orderAlerts'),
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: colors.partner
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
          await api.registerPartnerPushToken(token.data);
        } catch {
          onMessage(copyFor(language, 'notificationRegisterLater'));
        }
      }
    } else {
      denied.push(copyFor(language, 'permissionNotifications'));
    }
  } catch {
    denied.push(copyFor(language, 'permissionNotifications'));
  }

  try {
    const cameraPermission = await ImagePicker.getCameraPermissionsAsync();
    const cameraStatus =
      cameraPermission.status === 'granted'
        ? cameraPermission
        : await ImagePicker.requestCameraPermissionsAsync();
    if (cameraStatus.status !== 'granted') denied.push(copyFor(language, 'permissionCamera'));
  } catch {
    denied.push(copyFor(language, 'permissionCamera'));
  }

  if (denied.length) {
    onMessage(fillCopy(copyFor(language, 'permissionSettings'), { permissions: denied.join(', ') }));
  }
}

export default function App() {
  const api = useMemo(() => new IndieryApi(apiBaseUrl), []);
  const socketRef = useRef<Socket | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const locationSyncInFlightRef = useRef(false);
  const exitBackPressedAtRef = useRef(0);
  const [tab, setTab] = useState<Tab>('dashboard');
  const [language, setLanguage] = useState<AppLanguage>('en');
  const [data, setData] = useState<PartnerBootstrap | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [profileDetailOpen, setProfileDetailOpen] = useState(false);
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

  useAndroidBackHandler(() => {
    if (loading || !data) return false;
    if (needsPartnerOnboarding(data.user)) return false;
    if (tab === 'profile') return false;
    if (tab !== 'dashboard') {
      goDashboardFromBack();
      return true;
    }
    return confirmExitFromRoot();
  }, [loading, data, tab, language]);

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
      setError(err instanceof Error ? err.message : copyFor(language, 'unableToLoadPartnerApp'));
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
    setProfileDetailOpen(false);
    connectRealtime(login.token);
    requestPartnerAppPermissions(api, showToast, language).catch(() => undefined);
  }

  async function refresh() {
    try {
      const bootstrap = await api.partnerBootstrap();
      setData(bootstrap);
    } catch (err) {
      showToast(err instanceof Error ? err.message : copyFor(language, 'refreshFailed'));
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
      const current = await readDeviceLocation(language);
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
    } catch (err) {
      showToast(err instanceof Error ? err.message : copyFor(language, 'waitingGpsLocation'));
    }
  }

  function stopLocationStream() {
    locationSubscriptionRef.current?.remove();
    locationSubscriptionRef.current = null;
  }

  async function syncLocation() {
    try {
      const current = await readDeviceLocation(language);
      await sendLocationUpdate(current.coords);
    } catch (err) {
      showToast(err instanceof Error ? err.message : copyFor(language, 'waitingGpsLocation'));
    }
  }

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(''), 2600);
  }

  function confirmExitFromRoot() {
    const now = Date.now();
    if (now - exitBackPressedAtRef.current < 1800) return false;
    exitBackPressedAtRef.current = now;
    showToast(copyFor(language, 'pressBackAgainToExit'));
    return true;
  }

  function goDashboardFromBack() {
    exitBackPressedAtRef.current = 0;
    setProfileDetailOpen(false);
    setTab('dashboard');
  }

  async function withBusy(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } catch (err) {
      showToast(err instanceof Error ? err.message : copyFor(language, 'actionFailed'));
    } finally {
      setBusy(false);
    }
  }

  async function captureAndUploadImage(input: { purpose: 'pod' | 'kyc' | 'profile'; orderId?: string; documentKey?: string }) {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== 'granted') {
      throw new Error(copyFor(language, 'cameraPermissionRequired'));
    }

    const profile = uploadImageProfile(input.purpose);
    const picked = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: profile.cameraQuality,
      exif: false,
      base64: false
    });
    if (picked.canceled || !picked.assets[0]) throw new Error(copyFor(language, 'noImageCaptured'));

    const asset = picked.assets[0];
    if (!asset.uri) throw new Error(copyFor(language, 'missingPhoto'));
    if (asset.mimeType && !asset.mimeType.startsWith('image/')) {
      throw new Error(copyFor(language, 'onlyImageSupported'));
    }
    if (asset.fileSize && asset.fileSize > 25 * 1024 * 1024) {
      throw new Error(copyFor(language, 'photoTooLarge'));
    }
    const optimizedAsset = await optimizeUploadImage(asset, input.purpose);
    const signature = await api.createCloudinarySignature(input);
    const uploaded = await uploadFileToCloudinary(optimizedAsset.uri, signature.upload, {
      fileName: optimizedAsset.fileName,
      mimeType: optimizedAsset.mimeType
    });
    return uploaded.secureUrl;
  }

  async function saveProfile(input: PartnerProfileInput) {
    setBusy(true);
    setError('');
    try {
      const result = await api.updatePartnerProfile(input);
      setData((current) => current ? { ...current, user: result.user } : current);
      showToast(copyFor(language, 'profileSaved'));
    } catch (err) {
      setError(err instanceof Error ? err.message : copyFor(language, 'actionFailed'));
    } finally {
      setBusy(false);
    }
  }

  async function captureKycDocument(doc: KycDoc) {
    const photoUrl = await captureAndUploadImage({ purpose: 'kyc', documentKey: doc });
    await api.uploadKyc(doc, { photoUrl });
    await refresh();
    showToast(copyFor(language, 'kycPhotoCaptured'));
  }

  async function submitKycBankDetails(bankDetails: BankDetailsInput) {
    await api.uploadKyc('bank', { bankDetails });
    await refresh();
    showToast(copyFor(language, 'bankDetailsSaved'));
  }

  async function topUpPartnerWallet(amount: number, paymentMode: 'upi' | 'card' | 'netbanking' = 'upi') {
    if (!data) return;
    setBusy(true);
    try {
      const result = await api.createPartnerWalletTopup({ amount, paymentMode });
      const checkout = result.paymentIntent.checkout;
      if (!checkout) throw new Error(copyFor(language, 'walletRechargeUnavailable'));
      const payment = await RazorpayCheckout.open({
        key: checkout.keyId,
        amount: Math.round(result.paymentIntent.amount * 100),
        currency: result.paymentIntent.currency,
        name: copyFor(language, 'appName'),
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
      if (!payment.razorpay_order_id || !payment.razorpay_signature) throw new Error(copyFor(language, 'paymentVerificationMissing'));
      const verified = await api.verifyPartnerWalletTopup({
        razorpayOrderId: payment.razorpay_order_id,
        razorpayPaymentId: payment.razorpay_payment_id,
        razorpaySignature: payment.razorpay_signature
      });
      setData((current) => current ? { ...current, user: verified.user } : current);
      await refresh();
      showToast(copyFor(language, 'walletRecharged'));
    } catch (err) {
      showToast(err instanceof Error ? err.message : copyFor(language, 'walletRechargeFailed'));
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
      setProfileDetailOpen(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : copyFor(language, 'logoutFailed'));
    } finally {
      setBusy(false);
    }
  }

  function requestAccountDeletion() {
    Alert.alert(
      copyFor(language, 'requestAccountDeletion'),
      copyFor(language, 'requestAccountDeletionBody'),
      [
        { text: copyFor(language, 'cancel'), style: 'cancel' },
        {
          text: copyFor(language, 'submitRequest'),
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await api.requestAccountDeletion('Requested from partner KYC screen');
              showToast(copyFor(language, 'deletionRequestSubmitted'));
            } catch (err) {
              showToast(err instanceof Error ? err.message : copyFor(language, 'requestFailed'));
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
      <LanguageContext.Provider value={language}>
        <SafeAreaView style={styles.center}>
          <StatusBar barStyle="dark-content" backgroundColor={colors.white} translucent={false} />
          <ActivityIndicator color={colors.partner} size="large" />
          <Text style={styles.muted}>{copyFor(language, 'loadingPartner')}</Text>
        </SafeAreaView>
      </LanguageContext.Provider>
    );
  }

  if (!data) {
    return (
      <LanguageContext.Provider value={language}>
        <LoginScreen
          initialError={error}
          language={language}
          onChangeLanguage={setLanguage}
          onVerified={completeFirebaseLogin}
        />
      </LanguageContext.Provider>
    );
  }

  if (needsPartnerOnboarding(data.user)) {
    return (
      <LanguageContext.Provider value={language}>
      <SafeAreaView style={styles.shell}>
        <StatusBar barStyle="light-content" backgroundColor={colors.partner} translucent={false} />
        <View style={styles.appHeader}>
          <View>
            <Text style={styles.eyebrow}>{copyFor(language, 'appEyebrow')}</Text>
            <Text style={styles.headerTitle}>{copyFor(language, 'partnerSetup')}</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{data.user.initials}</Text>
          </View>
        </View>
        <View style={styles.content}>
          <PartnerOnboardingScreen
            user={data.user}
            vehicles={data.vehicles}
            busy={busy}
            error={error}
            onSaveProfile={saveProfile}
            onCapture={(doc) => withBusy(() => captureKycDocument(doc))}
            onRootBack={confirmExitFromRoot}
          />
        </View>
        {toast ? <View style={styles.toast}><Text style={styles.toastText}>{toast}</Text></View> : null}
      </SafeAreaView>
      </LanguageContext.Provider>
    );
  }

  const activeOrder = data.activeOrders.find((order) => order.id === selectedActiveOrderId) ?? data.activeOrders[0];

  return (
    <LanguageContext.Provider value={language}>
    <SafeAreaView style={styles.shell}>
      <StatusBar barStyle="light-content" backgroundColor={colors.partner} translucent={false} />
      {tab !== 'profile' ? (
        <View style={styles.appHeader}>
          <View>
            <Text style={styles.eyebrow}>{copyFor(language, 'appEyebrow')}</Text>
            <Text style={styles.headerTitle}>{data.user.name}</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{data.user.initials}</Text>
          </View>
        </View>
      ) : null}

      <View style={[styles.content, tab === 'profile' && styles.accountContent]}>
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
                showToast(online ? copyFor(language, 'youAreOnline') : copyFor(language, 'youAreOffline'));
              })
            }
            onActive={() => setTab('active')}
            onTopup={(amount) => topUpPartnerWallet(amount)}
            onAccept={(orderId) =>
              withBusy(async () => {
                if (!data.user.partnerProfile?.online) {
                  await api.setAvailability(true);
                }
                const accepted = await api.acceptOrder(orderId);
                setSelectedActiveOrderId(accepted.order.id);
                await refresh();
                setTab('active');
                showToast(copyFor(language, 'orderAccepted'));
              })
            }
            onReject={(orderId) =>
              withBusy(async () => {
                await api.rejectOrder(orderId);
                await refresh();
                showToast(copyFor(language, 'orderSkipped'));
              })
            }
          />
        )}
        {tab === 'active' && (
          <ActiveScreen
            orders={data.activeOrders}
            completedOrders={data.completedOrders}
            selectedOrderId={activeOrder?.id}
            busy={busy}
            refresh={refresh}
            onSelectOrder={setSelectedActiveOrderId}
            onOtp={(orderId, type, otp) =>
              withBusy(async () => {
                await api.verifyOrderOtp(orderId, type, otp);
                await refresh();
                showToast(`${type === 'pickup' ? copyFor(language, 'pickup') : copyFor(language, 'drop')} ${copyFor(language, 'otpVerified')}`);
              })
            }
            onPod={(orderId, type) =>
              withBusy(async () => {
                const photoUrl = await captureAndUploadImage({ purpose: 'pod', orderId, documentKey: type });
                await api.uploadPod(orderId, type, photoUrl);
                await refresh();
                showToast(`${type === 'pickup' ? copyFor(language, 'pickup') : copyFor(language, 'drop')} ${copyFor(language, 'podCaptured')}`);
              })
            }
            onStatus={(orderId, status) =>
              withBusy(async () => {
                await api.updateOrderStatus(orderId, status);
                await refresh();
                showToast(`${copyFor(language, 'orderUpdated')}: ${orderStatusLabel(language, status)}`);
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
                showToast(copyFor(language, 'payoutRequested'));
              })
            }
            onTopup={(amount) => topUpPartnerWallet(amount)}
          />
        )}
        {tab === 'profile' && (
          <ProfileScreen
            user={data.user}
            vehicles={data.vehicles}
            busy={busy}
            onSaveProfile={saveProfile}
            onDetailChange={setProfileDetailOpen}
            onLogout={logout}
            onRequestAccountDeletion={requestAccountDeletion}
            onBackToDashboard={goDashboardFromBack}
            onCapture={(doc) => withBusy(() => captureKycDocument(doc))}
            onSubmitBank={(bankDetails) => withBusy(() => submitKycBankDetails(bankDetails))}
            language={language}
            onChangeLanguage={(nextLanguage) => {
              setLanguage(nextLanguage);
              showToast(copyFor(nextLanguage, nextLanguage === 'hi' ? 'languageSetHindi' : 'languageSetEnglish'));
            }}
          />
        )}
      </View>

      {!profileDetailOpen ? (
        <BottomTabs
          active={tab}
          onChange={(nextTab) => {
            setTab(nextTab);
            if (nextTab !== 'profile') setProfileDetailOpen(false);
          }}
          activeCount={data.activeOrders.length}
        />
      ) : null}
      {toast ? <View style={styles.toast}><Text style={styles.toastText}>{toast}</Text></View> : null}
    </SafeAreaView>
    </LanguageContext.Provider>
  );
}

function LoginScreen({
  initialError,
  language,
  onChangeLanguage,
  onVerified
}: {
  initialError: string;
  language: AppLanguage;
  onChangeLanguage: (language: AppLanguage) => void;
  onVerified: (firebaseIdToken: string) => Promise<void>;
}) {
  const copy = useCopy();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [confirmation, setConfirmation] = useState<FirebaseAuthTypes.ConfirmationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);

  useEffect(() => {
    setError(initialError);
  }, [initialError]);

  useAndroidBackHandler(() => {
    if (!confirmation) return false;
    setConfirmation(null);
    setCode('');
    setError('');
    return true;
  }, [confirmation]);

  async function sendOtp() {
    setBusy(true);
    setError('');
    try {
      const result = await auth().signInWithPhoneNumber(formatPhoneForFirebase(phone, language));
      setConfirmation(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.unableToSendOtp);
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
      if (!credential?.user) throw new Error(copy.unableToVerifyOtp);
      const firebaseIdToken = await credential.user.getIdToken();
      await onVerified(firebaseIdToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.invalidOtp);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.loginShell}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} translucent={false} />
      <KeyboardAvoidingView style={styles.authKeyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.authScroll} keyboardShouldPersistTaps="handled">
          <LoginHero title={copy.appName} caption={copy.loginHeroCaption} />
          <View style={styles.authForm}>
            <Text style={styles.authTitle}>{copy.welcomeBack}</Text>
            <Text style={styles.loginSubtitle}>{copy.loginSubtitle}</Text>
            <LanguageSwitcher language={language} onChangeLanguage={onChangeLanguage} compact />
            <PhoneLoginField value={phone} onChangeText={setPhone} />
            {confirmation ? (
              <>
                <View style={styles.authNotice}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.partner} />
                  <Text style={styles.authNoticeText}>{copy.otpSent}</Text>
                </View>
                <AuthField label={copy.otpCode} value={code} onChangeText={setCode} keyboardType="numeric" icon="key" maxLength={6} />
              </>
            ) : null}
            {error ? <Text style={styles.loginError}>{error}</Text> : null}
            <View style={styles.row}>
              {confirmation ? (
                <>
                  <SecondaryButton title={copy.change} icon="create" onPress={() => setConfirmation(null)} />
                  <AuthActionButton title={busy ? copy.verifying : copy.verify} onPress={verifyOtp} />
                </>
              ) : (
                <AuthActionButton title={busy ? copy.sending : copy.sendOtp} onPress={sendOtp} />
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
        <Image source={indieryLogoImage} style={styles.loginBrandLogo} resizeMode="contain" accessibilityLabel={title} />
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
  const copy = useCopy();
  return (
    <View style={styles.authFieldGroup}>
      <Text style={styles.fieldLabel}>{copy.mobileNumber}</Text>
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
          placeholder={copy.enterMobileNumber}
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
  const copy = useCopy();
  const features: Array<{ icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string }> = [
    { icon: 'cube-outline', title: copy.live, subtitle: copy.orders },
    { icon: 'shield-checkmark-outline', title: copy.secure, subtitle: copy.kyc },
    { icon: 'document-text-outline', title: copy.smart, subtitle: copy.payouts },
    { icon: 'headset-outline', title: '24/7', subtitle: copy.support }
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

function PartnerOnboardingScreen({
  user,
  vehicles,
  busy,
  error,
  onSaveProfile,
  onCapture,
  onRootBack
}: {
  user: UserProfile;
  vehicles: Vehicle[];
  busy: boolean;
  error: string;
  onSaveProfile: (input: PartnerProfileInput) => Promise<void>;
  onCapture: (doc: KycDoc) => void;
  onRootBack: () => boolean;
}) {
  const copy = useCopy();
  const docs = user.partnerProfile?.docs;
  const identityDone = Boolean(docs?.pan || docs?.aadhaar);
  const personalDetailsDone = Boolean(user.email && user.name !== 'Indiery Partner' && user.city);
  const documentsDone = Boolean(docs?.selfie && identityDone && docs?.drivingLicence);
  const vehicleDetailsDone = Boolean(user.partnerProfile?.vehicleId && user.partnerProfile?.vehicleNumber && docs?.rc);
  const [name, setName] = useState(user.name === 'Indiery Partner' ? '' : user.name);
  const [email, setEmail] = useState(user.email || '');
  const [city, setCity] = useState(user.city || 'Lucknow');
  const [vehicleId, setVehicleId] = useState(user.partnerProfile?.vehicleId || vehicles[0]?.id || '');
  const [vehicleNumber, setVehicleNumber] = useState(user.partnerProfile?.vehicleNumber || '');
  const [activeStep, setActiveStep] = useState<OnboardingStepId>(() => {
    if (!personalDetailsDone) return 1;
    if (!documentsDone) return 2;
    return 3;
  });
  const [localError, setLocalError] = useState('');

  const onboardingSteps: { id: OnboardingStepId; label: string; done: boolean }[] = [
    { id: 1, label: copy.personal, done: personalDetailsDone },
    { id: 2, label: copy.uploads, done: documentsDone },
    { id: 3, label: copy.vehicle, done: vehicleDetailsDone }
  ];
  const stepProgress = onboardingSteps.filter((step) => step.done).length;

  function goToStep(step: OnboardingStepId) {
    setLocalError('');
    setActiveStep(step);
  }

  useAndroidBackHandler(() => {
    if (activeStep > 1) {
      setLocalError('');
      setActiveStep(activeStep === 3 ? 2 : 1);
      return true;
    }
    return onRootBack();
  }, [activeStep, onRootBack]);

  function validatePersonalDetails() {
    const nextName = name.trim();
    const nextEmail = email.trim();
    const nextCity = city.trim();
    if (nextName.length < 2) {
      setLocalError(copy.enterFullName);
      return undefined;
    }
    if (!nextEmail.includes('@')) {
      setLocalError(copy.enterValidEmail);
      return undefined;
    }
    if (nextCity.length < 2) {
      setLocalError(copy.enterCity);
      return undefined;
    }
    return { name: nextName, email: nextEmail, city: nextCity };
  }

  function selectedVehicleId() {
    return vehicleId || user.partnerProfile?.vehicleId || vehicles[0]?.id || '';
  }

  async function savePersonalDetails() {
    const details = validatePersonalDetails();
    if (!details) return;
    const nextVehicleId = selectedVehicleId();
    if (!nextVehicleId) {
      setLocalError(copy.vehicleCatalogUnavailable);
      return;
    }
    setLocalError('');
    await onSaveProfile({
      ...details,
      vehicleId: nextVehicleId,
      vehicleNumber: vehicleNumber.trim().toUpperCase()
    });
    setActiveStep(2);
  }

  function continueFromUploads() {
    if (!docs?.selfie) {
      setLocalError(copy.captureLiveSelfie);
      return;
    }
    if (!identityDone) {
      setLocalError(copy.capturePanOrAadhaar);
      return;
    }
    if (!docs?.drivingLicence) {
      setLocalError(copy.captureDrivingLicence);
      return;
    }
    setLocalError('');
    setActiveStep(3);
  }

  async function saveVehicleDetails() {
    const details = validatePersonalDetails();
    if (!details) {
      setActiveStep(1);
      return;
    }
    const nextVehicleId = selectedVehicleId();
    const nextVehicleNumber = vehicleNumber.trim().toUpperCase();
    if (!nextVehicleId) {
      setLocalError(copy.selectVehicleType);
      return;
    }
    if (nextVehicleNumber.length < 4) {
      setLocalError(copy.enterVehicleNumber);
      return;
    }
    setLocalError('');
    await onSaveProfile({ ...details, vehicleId: nextVehicleId, vehicleNumber: nextVehicleNumber });
  }

  return (
    <KeyboardAvoidingView style={styles.authKeyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.kycHero}>
          <View style={styles.kycHeroIcon}>
            <Ionicons name="shield-checkmark" size={26} color={colors.white} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.kycHeroTitle}>{copy.completePartnerSetup}</Text>
            <Text style={styles.kycHeroText}>{copy.completePartnerSetupText}</Text>
          </View>
        </View>

        <View style={styles.onboardingStepperCard}>
          <View style={styles.between}>
            <Text style={styles.cardTitle}>{copy.setupProgress}</Text>
            <Text style={styles.priceText}>{stepProgress}/3</Text>
          </View>
          <OnboardingStepper steps={onboardingSteps} activeStep={activeStep} onSelect={goToStep} />
        </View>

        {activeStep === 1 ? (
          <View style={styles.onboardingStepCard}>
            <View style={styles.onboardingStepHeader}>
              <View style={[styles.kycStepIcon, personalDetailsDone && styles.kycStepIconDone]}>
                <Ionicons name={personalDetailsDone ? 'checkmark' : 'person'} size={20} color={personalDetailsDone ? colors.white : colors.partner} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.cardTitle}>{copy.personalDetails}</Text>
                <Text style={styles.mutedSmall}>{copy.personalDetailsSubtitle}</Text>
              </View>
            </View>
            <AuthField label={copy.fullName} value={name} onChangeText={setName} icon="person" />
            <AuthField label={copy.email} value={email} onChangeText={setEmail} keyboardType="email-address" icon="mail" autoCapitalize="none" />
            <AuthField label={copy.city} value={city} onChangeText={setCity} icon="location" />
            <AuthField label={copy.loginMobileNumber} value={user.phone} editable={false} keyboardType="phone-pad" icon="call" />
            {localError || error ? <Text style={styles.loginError}>{localError || error}</Text> : null}
            <PrimaryButton title={busy ? copy.saving : copy.saveAndNext} icon="arrow-forward" onPress={savePersonalDetails} />
          </View>
        ) : null}

        {activeStep === 2 ? (
          <>
            <View style={styles.onboardingStepIntro}>
              <Text style={styles.cardTitle}>{copy.uploadDetails}</Text>
              <Text style={styles.mutedSmall}>{copy.uploadDetailsSubtitle}</Text>
            </View>
            <KycStepCard
              icon="person-circle"
              title={copy.liveSelfie}
              subtitle={copy.captureClearFacePhoto}
              done={Boolean(docs?.selfie)}
              busy={busy}
              onPress={() => onCapture('selfie')}
            />
            <View style={styles.kycGroupCard}>
              <View style={styles.between}>
                <View style={styles.flex}>
                  <Text style={styles.cardTitle}>{copy.panOrAadhaar}</Text>
                  <Text style={styles.mutedSmall}>{copy.oneIdentityProofRequired}</Text>
                </View>
                <Ionicons name={identityDone ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={identityDone ? colors.green : colors.muted} />
              </View>
              <View style={styles.row}>
                <SecondaryButton title={docs?.pan ? copy.panDone : copy.capturePan} icon="card" onPress={() => onCapture('pan')} />
                <SecondaryButton title={docs?.aadhaar ? copy.aadhaarDone : copy.captureAadhaar} icon="card" onPress={() => onCapture('aadhaar')} />
              </View>
            </View>
            <KycStepCard
              icon="document-text"
              title={copy.drivingLicence}
              subtitle={copy.captureLicencePhoto}
              done={Boolean(docs?.drivingLicence)}
              busy={busy}
              onPress={() => onCapture('drivingLicence')}
            />
            {localError || error ? <Text style={styles.loginError}>{localError || error}</Text> : null}
            <View style={styles.onboardingNavRow}>
              <SecondaryButton title={copy.back} icon="arrow-back" onPress={() => goToStep(1)} />
              <PrimaryButton title={copy.next} icon="arrow-forward" onPress={continueFromUploads} />
            </View>
          </>
        ) : null}

        {activeStep === 3 ? (
          <View style={styles.onboardingStepCard}>
            <View style={styles.onboardingStepHeader}>
              <View style={[styles.kycStepIcon, vehicleDetailsDone && styles.kycStepIconDone]}>
                <Ionicons name={vehicleDetailsDone ? 'checkmark' : 'car'} size={20} color={vehicleDetailsDone ? colors.white : colors.partner} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.cardTitle}>{copy.vehicleDetails}</Text>
                <Text style={styles.mutedSmall}>{copy.vehicleDetailsSubtitle}</Text>
              </View>
            </View>
            <VehiclePicker vehicles={vehicles} selectedId={vehicleId} onSelect={setVehicleId} />
            <AuthField label={copy.vehicleNumber} value={vehicleNumber} onChangeText={setVehicleNumber} icon="bicycle" autoCapitalize="characters" />
            <PrimaryButton title={docs?.rc ? copy.rcCaptured : copy.captureRc} icon="camera" onPress={() => onCapture('rc')} />
            {localError || error ? <Text style={styles.loginError}>{localError || error}</Text> : null}
            <View style={styles.onboardingNavRow}>
              <SecondaryButton title={copy.back} icon="arrow-back" onPress={() => goToStep(2)} />
              <PrimaryButton title={busy ? copy.saving : copy.saveVehicle} icon="checkmark" onPress={saveVehicleDetails} />
            </View>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function OnboardingStepper({
  steps,
  activeStep,
  onSelect
}: {
  steps: { id: OnboardingStepId; label: string; done: boolean }[];
  activeStep: OnboardingStepId;
  onSelect: (step: OnboardingStepId) => void;
}) {
  return (
    <View style={styles.onboardingStepperRow}>
      {steps.map((step, index) => {
        const active = step.id === activeStep;
        return (
          <React.Fragment key={step.id}>
            {index > 0 ? <View style={[styles.onboardingStepperLine, steps[index - 1].done && styles.onboardingStepperLineDone]} /> : null}
            <Pressable style={styles.onboardingStepperItem} onPress={() => onSelect(step.id)}>
              <View
                style={[
                  styles.onboardingStepperCircle,
                  active && styles.onboardingStepperCircleActive,
                  step.done && styles.onboardingStepperCircleDone
                ]}
              >
                {step.done ? (
                  <Ionicons name="checkmark" size={16} color={colors.white} />
                ) : (
                  <Text style={[styles.onboardingStepperNumber, active && styles.onboardingStepperNumberActive]}>{step.id}</Text>
                )}
              </View>
              <Text style={[styles.onboardingStepperLabel, active && styles.onboardingStepperLabelActive]}>{step.label}</Text>
            </Pressable>
          </React.Fragment>
        );
      })}
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
  const copy = useCopy();
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
      setLocalError(copy.enterFullName);
      return;
    }
    if (!nextEmail.includes('@')) {
      setLocalError(copy.enterValidEmail);
      return;
    }
    if (nextCity.length < 2) {
      setLocalError(copy.enterCity);
      return;
    }
    if (!vehicleId) {
      setLocalError(copy.selectVehicleType);
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
            <BrandLogo title={copy.appName} accentColor={colors.partner} />
          </View>
          <View style={styles.authForm}>
            <Text style={styles.authKicker}>{copy.partnerSetup}</Text>
            <Text style={styles.authTitle}>{copy.profile}</Text>
            <Text style={styles.loginSubtitle}>{copy.completePartnerSetupText}</Text>
            <AuthField label={copy.fullName} value={name} onChangeText={setName} icon="person" />
            <AuthField label={copy.email} value={email} onChangeText={setEmail} keyboardType="email-address" icon="mail" autoCapitalize="none" />
            <AuthField label={copy.city} value={city} onChangeText={setCity} icon="location" />
            <VehiclePicker vehicles={vehicles} selectedId={vehicleId} onSelect={setVehicleId} />
            <AuthField label={copy.vehicleNumber} value={vehicleNumber} onChangeText={setVehicleNumber} icon="bicycle" autoCapitalize="characters" />
            <AuthField label={copy.loginMobileNumber} value={user.phone} editable={false} keyboardType="phone-pad" icon="call" />
            {localError || error ? <Text style={styles.loginError}>{localError || error}</Text> : null}
            <PrimaryButton title={busy ? copy.saving : copy.continue} icon="arrow-forward" onPress={submit} />
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
  const copy = useCopy();
  return (
    <View style={styles.authFieldGroup}>
      <Text style={styles.fieldLabel}>{copy.vehicleType}</Text>
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
                <Text style={styles.vehicleChoiceMeta}>{copy.upToKg} {vehicle.capacityKg} kg</Text>
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
  return (
    <View style={styles.brandLogo}>
      <Image source={indieryLogoImage} style={styles.brandLogoImage} resizeMode="contain" accessibilityLabel={title} />
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
  onActive,
  onTopup,
  onAccept,
  onReject
}: {
  data: PartnerBootstrap;
  busy: boolean;
  onToggle: () => void;
  onActive: () => void;
  onTopup: (amount: number) => void;
  onAccept: (orderId: string) => void;
  onReject: (orderId: string) => void;
}) {
  const copy = useCopy();
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
              <Text style={styles.cardTitle}>{copy.rechargeDriverWallet}</Text>
              <Text style={styles.mutedSmall}>{fillCopy(copy.minimumBalanceRequired, { amount: money(minPartnerWalletBalance) })}</Text>
            </View>
          </View>
          <Text style={styles.walletBlockBalance}>{copy.currentBalance}: {money(balance)}</Text>
          <PrimaryButton title={`${copy.recharge} ${money(rechargeAmount)}`} icon="add-circle" onPress={() => onTopup(rechargeAmount)} />
        </View>
      ) : null}

      <Pressable style={[styles.onlineCard, online && styles.onlineCardActive, !walletReady && styles.onlineCardDisabled]} onPress={walletReady ? onToggle : () => onTopup(rechargeAmount)}>
        <Text style={[styles.onlineText, online && styles.onlineTextActive]}>{busy ? copy.syncing : online ? copy.online : walletReady ? copy.offline : copy.rechargeStatus}</Text>
        <Text style={styles.muted}>{walletReady ? (online ? copy.receivingNearbyOrders : copy.tapToStartReceivingOrders) : copy.walletBelowMinimum}</Text>
      </Pressable>

      <View style={styles.statRow}>
        <StatCard title={copy.today} value={money(data.stats.todayEarn)} tone="green" />
        <StatCard title={copy.orders} value={String(data.stats.completedCount)} tone="blue" />
        <StatCard title={copy.rating} value={`${profile?.rating ?? 5}`} tone="amber" />
      </View>

      <View style={styles.row}>
        <SecondaryButton title={copy.activeTrip} icon="navigate" onPress={onActive} />
      </View>

      <SectionTitle title={`${copy.availableOrders} (${data.availableOrders.length})`} />
      <AvailableOrdersList orders={data.availableOrders} busy={busy} onAccept={onAccept} onReject={onReject} />
    </ScrollView>
  );
}

function AvailableOrdersList({
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
  const copy = useCopy();
  return (
    <>
      {orders.length === 0 ? (
        <Empty icon="time-outline" title={copy.noOrdersRightNow} subtitle={copy.stayOnlineRefresh} />
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
            <SecondaryButton title={copy.skip} icon="close" onPress={() => onReject(order.id)} />
            <PrimaryButton title={busy ? copy.wait : `${copy.accept} ${money(order.fare.partnerNet)}`} icon="checkmark" onPress={() => onAccept(order.id)} />
          </View>
        </View>
      ))}
    </>
  );
}

function ActiveScreen({
  orders,
  completedOrders,
  selectedOrderId,
  busy,
  refresh,
  onSelectOrder,
  onOtp,
  onPod,
  onStatus
}: {
  orders: Order[];
  completedOrders: Order[];
  selectedOrderId?: string;
  busy: boolean;
  refresh: () => void;
  onSelectOrder: (orderId: string) => void;
  onOtp: (orderId: string, type: 'pickup' | 'drop', otp: string) => void;
  onPod: (orderId: string, type: 'pickup' | 'drop') => void;
  onStatus: (orderId: string, status: 'arrived_pickup' | 'picked_up' | 'in_transit' | 'delivered') => void;
}) {
  const copy = useCopy();
  const language = useLanguage();
  const [otp, setOtp] = useState('');
  const order = orders.find((item) => item.id === selectedOrderId) ?? orders[0];
  const nextActions = order ? getNextActions(order, copy) : [];
  const needsPickupOtp = order?.status === 'arrived_pickup' && !order.pod.pickupOtpVerified;
  const needsDropOtp = order?.status === 'in_transit' && !order.pod.dropOtpVerified;
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <SectionTitle title={`${copy.activeOrders} (${orders.length})`} />
      {!order ? (
        <>
          <Empty icon="navigate-outline" title={copy.noActiveDelivery} subtitle={copy.acceptOrderFromHome} />
          <SecondaryButton title={copy.refresh} icon="refresh" onPress={refresh} />
        </>
      ) : (
        <>
      {orders.length > 1 ? (
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
                    {item.pickup.label} {copy.to} {item.drop.label}
                  </Text>
                  <Text style={styles.activeTripSwitchMeta}>{orderStatusLabel(language, item.status)}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
      ) : null}
      <MapPreview pickup={order.pickup.label} drop={order.drop.label} eta={order.etaMinutes} />
      <View style={styles.orderCard}>
        <OrderHeader order={order} />
        <RouteBlock order={order} />
      </View>

      <Timeline order={order} />

      <View style={styles.payoutCard}>
        <FareLine label={copy.orderValue} value={money(order.fare.orderValue)} />
        <FareLine label={copy.driverCommission} value={money(order.fare.driverCommission)} />
        <FareLine label={copy.reserveReward} value={money(order.fare.reserveAmount)} />
        <FareLine label={copy.indieryCommission} value={money(order.fare.platformCommission)} />
        <FareLine label={copy.youReceiveOnTime} value={money(order.fare.onTimePartnerPayout)} bold />
        <FareLine label={copy.ifLateReceive} value={money(order.fare.latePartnerPayout)} />
      </View>

      <SectionTitle title={copy.tripActions} />
      {needsPickupOtp || needsDropOtp ? (
        <View style={styles.otpPanel}>
          <Text style={styles.fieldLabel}>{needsPickupOtp ? copy.pickupOtp : copy.dropOtp}</Text>
          <View style={styles.otpRow}>
            <TextInput
              value={otp}
              onChangeText={setOtp}
              keyboardType="numeric"
              placeholder={copy.enter6DigitCode}
              style={styles.otpInput}
            />
            <PrimaryButton
              title={copy.verify}
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
          title={busy ? copy.updating : action.label}
          icon={action.icon}
          onPress={() => {
            if (action.kind === 'pod') onPod(order.id, action.type);
            else onStatus(order.id, action.status);
          }}
        />
      ))}
      <SecondaryButton title={copy.refresh} icon="refresh" onPress={refresh} />
        </>
      )}

      <SectionTitle title={`${copy.orderHistory} (${completedOrders.length})`} />
      {completedOrders.length === 0 ? (
        <Empty icon="time-outline" title={copy.noOrderHistory} subtitle={copy.completedDeliveriesAppearHere} />
      ) : null}
      {completedOrders.map((completedOrder) => (
        <OrderCard key={completedOrder.id} order={completedOrder} />
      ))}
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
  const copy = useCopy();
  const profile = data.user.partnerProfile;
  const balance = profile?.walletBalance ?? 0;
  const walletReady = balance >= minPartnerWalletBalance;
  const rechargeAmount = Math.max(50, Math.ceil(minPartnerWalletBalance - balance));
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.walletCard}>
        <Text style={styles.eyebrowDark}>{copy.walletBalance}</Text>
        <Text style={styles.walletValue}>{money(balance)}</Text>
        <Text style={styles.muted}>
          {walletReady
            ? `${profile?.weeklyOrders ?? 0} ${copy.tripsThisWeek}`
            : fillCopy(copy.rechargeToUnlock, { amount: money(rechargeAmount) })}
        </Text>
        {!walletReady ? (
          <PrimaryButton title={busy ? copy.opening : `${copy.recharge} ${money(rechargeAmount)}`} icon="add-circle" onPress={() => onTopup(rechargeAmount)} />
        ) : null}
        <PrimaryButton title={busy ? copy.requesting : copy.requestPayout} icon="send" onPress={onPayout} />
      </View>
      <View style={styles.statRow}>
        <StatCard title={copy.today} value={money(data.stats.todayEarn)} tone="green" />
        <StatCard title={copy.done} value={String(data.stats.completedCount)} tone="blue" />
      </View>
      <SectionTitle title={copy.recentTransactions} />
      {data.stats.ledger.map((item) => (
        <View key={item.id} style={styles.ledgerRow}>
          <View style={[styles.ledgerIcon, item.kind === 'credit' ? styles.ledgerCredit : styles.ledgerDebit]}>
            <Ionicons name={item.kind === 'credit' ? 'arrow-down' : 'arrow-up'} size={16} color={colors.white} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.mutedSmall}>{item.reference || copy.wallet}</Text>
          </View>
          <Text style={[styles.amount, item.kind === 'credit' ? styles.amountGreen : styles.amountRed]}>
            {item.kind === 'credit' ? '+' : '-'}{money(item.amount)}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

function ProfileScreen({
  user,
  vehicles,
  busy,
  onSaveProfile,
  onDetailChange,
  onCapture,
  onSubmitBank,
  onLogout,
  onRequestAccountDeletion,
  onBackToDashboard,
  language,
  onChangeLanguage
}: {
  user: UserProfile;
  vehicles: Vehicle[];
  busy: boolean;
  onSaveProfile: (input: PartnerProfileInput) => Promise<void>;
  onDetailChange: (open: boolean) => void;
  onCapture: (doc: KycDoc) => void;
  onSubmitBank: (bankDetails: BankDetailsInput) => void;
  onLogout: () => void;
  onRequestAccountDeletion: () => void;
  onBackToDashboard: () => void;
  language: AppLanguage;
  onChangeLanguage: (language: AppLanguage) => void;
}) {
  const copy = useCopy();
  const docs = user.partnerProfile?.docs;
  const bankDetails = user.partnerProfile?.bankDetails;
  const progress = partnerSetupProgress(user);
  const identityDone = Boolean(docs?.pan || docs?.aadhaar);
  const vehicleName = vehicleNameForId(vehicles, user.partnerProfile?.vehicleId);
  const [page, setPage] = useState<ProfilePage>('overview');
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email || '');
  const [city, setCity] = useState(user.city || '');
  const [vehicleId, setVehicleId] = useState(user.partnerProfile?.vehicleId || vehicles[0]?.id || '');
  const [vehicleNumber, setVehicleNumber] = useState(user.partnerProfile?.vehicleNumber || '');
  const [accountHolder, setAccountHolder] = useState(bankDetails?.accountHolder || user.name);
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState(bankDetails?.ifsc || '');
  const [profileError, setProfileError] = useState('');
  const [vehicleError, setVehicleError] = useState('');
  const [bankError, setBankError] = useState('');

  const accountCompleted = progress.completed + (docs?.bank ? 1 : 0);
  const accountTotal = progress.total + 1;
  const documentsVerified = progress.complete && user.partnerProfile?.kycStatus === 'verified';

  function openPage(nextPage: ProfilePage) {
    setProfileError('');
    setVehicleError('');
    setBankError('');
    setPage(nextPage);
    onDetailChange(nextPage !== 'overview');
  }

  useAndroidBackHandler(() => {
    if (page !== 'overview') {
      openPage('overview');
      return true;
    }
    onBackToDashboard();
    return true;
  }, [page, onBackToDashboard]);

  async function submitPersonalDetails() {
    const nextName = name.trim();
    const nextEmail = email.trim();
    const nextCity = city.trim();
    if (nextName.length < 2) {
      setProfileError(copy.enterFullName);
      return;
    }
    if (!nextEmail.includes('@')) {
      setProfileError(copy.enterValidEmail);
      return;
    }
    if (nextCity.length < 2) {
      setProfileError(copy.enterCity);
      return;
    }
    if (!vehicleId) {
      setProfileError(copy.vehicleCatalogUnavailable);
      return;
    }
    setProfileError('');
    await onSaveProfile({
      name: nextName,
      email: nextEmail,
      city: nextCity,
      vehicleId,
      vehicleNumber: vehicleNumber.trim().toUpperCase()
    });
  }

  async function submitVehicleDetails() {
    const nextVehicleNumber = vehicleNumber.trim().toUpperCase();
    if (!vehicleId) {
      setVehicleError(copy.selectVehicleType);
      return;
    }
    if (nextVehicleNumber.length < 4) {
      setVehicleError(copy.enterVehicleNumber);
      return;
    }
    setVehicleError('');
    await onSaveProfile({
      name: name.trim() || user.name,
      email: email.trim() || user.email || '',
      city: city.trim() || user.city,
      vehicleId,
      vehicleNumber: nextVehicleNumber
    });
  }

  function submitBank() {
    const nextAccountHolder = accountHolder.trim();
    const nextAccountNumber = accountNumber.replace(/\D/g, '');
    const nextIfsc = ifsc.trim().toUpperCase();
    if (nextAccountHolder.length < 2) {
      setBankError(copy.enterAccountHolderName);
      return;
    }
    if (!/^\d{9,18}$/.test(nextAccountNumber)) {
      setBankError(copy.enterValidAccountNumber);
      return;
    }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(nextIfsc)) {
      setBankError(copy.enterValidIfsc);
      return;
    }
    setBankError('');
    onSubmitBank({ accountHolder: nextAccountHolder, accountNumber: nextAccountNumber, ifsc: nextIfsc });
    setAccountNumber('');
  }

  if (page === 'overview') {
    return (
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.accountHero}>
          <View style={styles.accountHeroGlow} />
          <Text style={styles.accountEyebrow}>{copy.account}</Text>
          <Text style={styles.accountHeroSubtitle}>{copy.accountSubtitle}</Text>
          <View style={styles.accountIdentityCard}>
            <View style={styles.accountAvatar}>
              <Text style={styles.accountAvatarText}>{user.initials}</Text>
            </View>
            <View style={styles.flex}>
              <Text style={styles.accountName}>{user.name}</Text>
              <Text style={styles.accountPhone}>{user.phone}</Text>
              <View style={styles.accountVerifiedBadge}>
                <Ionicons name="checkmark-circle" size={14} color={colors.partner} />
                <Text style={styles.accountVerifiedText}>{kycStatusLabel(language, user.partnerProfile?.kycStatus)} {copy.verification}</Text>
              </View>
            </View>
            <Pressable style={styles.accountEditButton} onPress={() => openPage('personal')}>
              <Ionicons name="create-outline" size={18} color={colors.partner} />
            </Pressable>
          </View>
        </View>

        <View style={styles.accountProgressCard}>
          <View style={styles.between}>
            <Text style={styles.cardTitle}>{copy.profileComplete}</Text>
            <Text style={styles.priceText}>{accountCompleted}/{accountTotal}</Text>
          </View>
          <View style={styles.kycProgressTrack}>
            <View style={[styles.kycProgressFill, { width: `${(accountCompleted / accountTotal) * 100}%` }]} />
          </View>
        </View>

        <View style={styles.accountMenuCard}>
          <AccountMenuRow
            icon="person-outline"
            title={copy.personalInformation}
            subtitle={copy.personalInformationSubtitle}
            onPress={() => openPage('personal')}
          />
          <AccountMenuRow
            icon="car-outline"
            title={copy.vehicleDetails}
            subtitle={`${vehicleName} • ${user.partnerProfile?.vehicleNumber || copy.numberNotAdded}`}
            onPress={() => openPage('vehicle')}
          />
          <AccountMenuRow
            icon="shield-checkmark-outline"
            title={copy.documentsKyc}
            subtitle={documentsVerified ? copy.allDocumentsVerified : copy.documentsNeedAttention}
            onPress={() => openPage('documents')}
          />
          <AccountMenuRow
            icon="wallet-outline"
            title={copy.bankAccount}
            subtitle={docs?.bank ? `${bankDetails?.accountNumberMasked || copy.accountSaved} • ${bankDetails?.ifsc || copy.ifscSaved}` : copy.usedForPayouts}
            onPress={() => openPage('bank')}
          />
          <AccountMenuRow
            icon="language-outline"
            title={copy.changeLanguage}
            subtitle={languageNativeLabel(language)}
            onPress={() => openPage('language')}
          />
          <AccountMenuRow
            icon="document-text-outline"
            title={copy.policiesLegal}
            subtitle={copy.policiesLegalSubtitle}
            onPress={() => openPage('legal')}
            last
          />
        </View>

        {progress.complete && user.partnerProfile?.kycStatus !== 'verified' ? (
          <View style={styles.notice}>
            <Ionicons name="time" size={18} color={colors.partner} />
            <Text style={styles.noticeText}>{copy.profileSubmittedNotice}</Text>
          </View>
        ) : null}

        <Pressable style={styles.deleteAccountButton} onPress={onRequestAccountDeletion}>
          <Ionicons name="trash-outline" size={18} color={colors.red} />
          <Text style={styles.deleteAccountButtonText}>{copy.requestAccountDeletion}</Text>
        </Pressable>
        <Pressable style={styles.logoutButton} onPress={onLogout}>
          <Ionicons name="log-out-outline" size={18} color={colors.red} />
          <Text style={styles.logoutButtonText}>{copy.logout}</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.authKeyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <AccountDetailHeader
          title={
            page === 'personal' ? copy.personalInformation
              : page === 'vehicle' ? copy.vehicleDetails
                : page === 'documents' ? copy.documentsKyc
                  : page === 'bank' ? copy.bankAccount
                    : page === 'language' ? copy.changeLanguage
                      : copy.policiesLegal
          }
          subtitle={
            page === 'personal' ? copy.keepDetailsUpdated
              : page === 'vehicle' ? copy.vehicleDetailsSubtitle
                : page === 'documents' ? copy.uploadDetailsSubtitle
                  : page === 'bank' ? copy.usedForPayouts
                    : page === 'language' ? copy.languageSubtitle
                      : copy.policiesLegalSubtitle
          }
          onBack={() => openPage('overview')}
        />

        {page === 'personal' ? (
          <View style={styles.accountDetailCard}>
            <AuthField label={copy.fullName} value={name} onChangeText={setName} icon="person" />
            <AuthField label={copy.loginMobileNumber} value={user.phone} editable={false} keyboardType="phone-pad" icon="lock-closed" />
            <AuthField label={copy.email} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" icon="mail" />
            <AuthField label={copy.city} value={city} onChangeText={setCity} icon="location" />
            <View style={styles.accountInfoStrip}>
              <Ionicons name="shield-checkmark" size={20} color={colors.partner} />
              <Text style={styles.accountInfoText}>{copy.mobileLinkedToAccount}</Text>
            </View>
            {profileError ? <Text style={styles.loginError}>{profileError}</Text> : null}
            <PrimaryButton title={busy ? copy.saving : copy.saveChanges} icon="checkmark" onPress={submitPersonalDetails} />
          </View>
        ) : null}

        {page === 'vehicle' ? (
          <View style={styles.accountDetailCard}>
            <VehiclePicker vehicles={vehicles} selectedId={vehicleId} onSelect={setVehicleId} />
            <AuthField label={copy.vehicleNumber} value={vehicleNumber} onChangeText={setVehicleNumber} icon="car" autoCapitalize="characters" />
            <KycStepCard
              icon="document-text"
              title={copy.vehicleRc}
              subtitle={copy.rcRequired}
              done={Boolean(docs?.rc)}
              busy={busy}
              onPress={() => onCapture('rc')}
            />
            {vehicleError ? <Text style={styles.loginError}>{vehicleError}</Text> : null}
            <PrimaryButton title={busy ? copy.saving : copy.saveChanges} icon="checkmark" onPress={submitVehicleDetails} />
          </View>
        ) : null}

        {page === 'documents' ? (
          <>
            <View style={styles.kycProgressCard}>
              <View style={styles.between}>
                <Text style={styles.cardTitle}>{copy.documentProgress}</Text>
                <Text style={styles.priceText}>{progress.completed}/{progress.total}</Text>
              </View>
              <View style={styles.kycProgressTrack}>
                <View style={[styles.kycProgressFill, { width: `${(progress.completed / progress.total) * 100}%` }]} />
              </View>
              <Text style={styles.mutedSmall}>{copy.status}: {kycStatusLabel(language, user.partnerProfile?.kycStatus)}</Text>
            </View>
            <KycStepCard icon="person-circle" title={copy.liveSelfie} subtitle={copy.captureClearFacePhoto} done={Boolean(docs?.selfie)} busy={busy} onPress={() => onCapture('selfie')} />
            <View style={styles.kycGroupCard}>
              <View style={styles.between}>
                <View style={styles.flex}>
                  <Text style={styles.cardTitle}>{copy.identityProof}</Text>
                  <Text style={styles.mutedSmall}>{copy.capturePanOrAadhaarRequired}</Text>
                </View>
                <Ionicons name={identityDone ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={identityDone ? colors.green : colors.muted} />
              </View>
              <View style={styles.row}>
                <SecondaryButton title={docs?.pan ? copy.panDone : copy.capturePan} icon="card" onPress={() => onCapture('pan')} />
                <SecondaryButton title={docs?.aadhaar ? copy.aadhaarDone : copy.captureAadhaar} icon="card" onPress={() => onCapture('aadhaar')} />
              </View>
            </View>
            <KycStepCard icon="document-text" title={copy.drivingLicence} subtitle={copy.captureFrontClearly} done={Boolean(docs?.drivingLicence)} busy={busy} onPress={() => onCapture('drivingLicence')} />
            <KycStepCard icon="car" title={copy.vehicleRc} subtitle={copy.rcRequired} done={Boolean(docs?.rc)} busy={busy} onPress={() => onCapture('rc')} />
          </>
        ) : null}

        {page === 'bank' ? (
          <View style={[styles.accountDetailCard, docs?.bank && styles.accountDetailCardComplete]}>
            <View style={styles.accountBankStatus}>
              <View style={[styles.accountMenuIcon, docs?.bank && styles.accountMenuIconComplete]}>
                <Ionicons name={docs?.bank ? 'checkmark' : 'wallet-outline'} size={20} color={docs?.bank ? colors.white : colors.partner} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.cardTitle}>{docs?.bank ? copy.accountSaved : copy.bankAccount}</Text>
                <Text style={styles.mutedSmall}>{docs?.bank ? `${bankDetails?.accountNumberMasked || ''} • ${bankDetails?.ifsc || ''}` : copy.usedForPayouts}</Text>
              </View>
            </View>
            <View style={styles.kycInputGroup}>
              <Text style={styles.fieldLabel}>{copy.accountHolder}</Text>
              <TextInput value={accountHolder} onChangeText={setAccountHolder} style={styles.kycInput} placeholder={copy.nameAsPerBank} />
            </View>
            <View style={styles.kycInputGroup}>
              <Text style={styles.fieldLabel}>{copy.accountNumber}</Text>
              <TextInput value={accountNumber} onChangeText={setAccountNumber} style={styles.kycInput} placeholder={bankDetails?.accountNumberMasked || copy.enterAccountNumber} keyboardType="numeric" secureTextEntry />
            </View>
            <View style={styles.kycInputGroup}>
              <Text style={styles.fieldLabel}>{copy.ifscCode}</Text>
              <TextInput value={ifsc} onChangeText={setIfsc} style={styles.kycInput} autoCapitalize="characters" placeholder="ABCD0123456" />
            </View>
            {bankError ? <Text style={styles.loginError}>{bankError}</Text> : null}
            <PrimaryButton title={busy ? copy.saving : docs?.bank ? copy.updateBank : copy.saveBank} icon="checkmark" onPress={submitBank} />
          </View>
        ) : null}

        {page === 'language' ? <LanguageSwitcher language={language} onChangeLanguage={onChangeLanguage} /> : null}
        {page === 'legal' ? <PolicyList /> : null}
      </ScrollView>
    </KeyboardAvoidingView>
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
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable style={[styles.accountMenuRow, last && styles.accountMenuRowLast]} onPress={onPress}>
      <View style={styles.accountMenuIcon}>
        <Ionicons name={icon} size={20} color={colors.partner} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.mutedSmall}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}

function AccountDetailHeader({ title, subtitle, onBack }: { title: string; subtitle: string; onBack: () => void }) {
  return (
    <View style={styles.accountDetailHeader}>
      <Pressable style={styles.accountBackButton} onPress={onBack}>
        <Ionicons name="arrow-back" size={21} color={colors.white} />
      </Pressable>
      <View style={styles.flex}>
        <Text style={styles.accountDetailTitle}>{title}</Text>
        <Text style={styles.accountDetailSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

function LanguageSwitcher({
  language,
  onChangeLanguage,
  compact
}: {
  language: AppLanguage;
  onChangeLanguage: (language: AppLanguage) => void;
  compact?: boolean;
}) {
  const copy = useCopy();
  return (
    <View style={[styles.languageCard, compact && styles.languageCardCompact]}>
      <View style={styles.languageHeader}>
        <Ionicons name="language-outline" size={18} color={colors.partner} />
        <View style={styles.flex}>
          <Text style={styles.cardTitle}>{copy.changeLanguage}</Text>
          <Text style={styles.mutedSmall}>{languageNativeLabel(language)}</Text>
        </View>
      </View>
      <View style={styles.languageOptionRow}>
        {(['en', 'hi'] as AppLanguage[]).map((option) => {
          const active = option === language;
          return (
            <Pressable
              key={option}
              style={[styles.languagePill, active && styles.languagePillActive]}
              onPress={() => onChangeLanguage(option)}
            >
              <Text style={[styles.languagePillText, active && styles.languagePillTextActive]}>
                {option === 'hi' ? copy.hindiNative : copy.english}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
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
  const copy = useCopy();
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
        {done ? copy.done : busy ? copy.opening : copy.capture}
      </Text>
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
          <Ionicons name={icons[policy.id]} size={18} color={colors.partner} />
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
  activeCount
}: {
  active: Tab;
  onChange: (tab: Tab) => void;
  activeCount: number;
}) {
  const copy = useCopy();
  const tabs: Array<[Tab, keyof typeof Ionicons.glyphMap, string, number?]> = [
    ['dashboard', 'home', copy.home],
    ['active', 'navigate', copy.active, activeCount],
    ['earnings', 'wallet', copy.earn],
    ['profile', 'person', copy.profile]
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

function getNextActions(order: Order, copy: Record<CopyKey, string>) {
  if (order.status === 'accepted') {
    return [{ kind: 'status' as const, label: copy.arrivedAtPickup, status: 'arrived_pickup' as const, icon: 'location' as const }];
  }
  if (order.status === 'arrived_pickup') {
    return [
      { kind: 'pod' as const, label: copy.capturePickupPod, type: 'pickup' as const, icon: 'camera' as const },
      ...(order.pod.pickupOtpVerified
        ? [{ kind: 'status' as const, label: copy.markPickedUp, status: 'picked_up' as const, icon: 'cube' as const }]
        : [])
    ];
  }
  if (order.status === 'picked_up') {
    return [{ kind: 'status' as const, label: copy.startTransit, status: 'in_transit' as const, icon: 'navigate' as const }];
  }
  if (order.status === 'in_transit') {
    return [
      { kind: 'pod' as const, label: copy.captureDropPod, type: 'drop' as const, icon: 'camera' as const },
      ...(order.pod.dropOtpVerified
        ? [{ kind: 'status' as const, label: copy.markDelivered, status: 'delivered' as const, icon: 'checkmark' as const }]
        : [])
    ];
  }
  return [{ kind: 'status' as const, label: copy.refreshTrip, status: 'in_transit' as const, icon: 'refresh' as const }];
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
  const copy = useCopy();
  const language = useLanguage();
  return (
    <View style={styles.between}>
      <View>
        <Text style={styles.orderNo}>{order.orderNo}</Text>
        <Text style={styles.cardTitle}>{order.customer?.name || copy.customer}</Text>
      </View>
      <Badge label={orderStatusLabel(language, order.status)} />
    </View>
  );
}

function RouteBlock({ order }: { order: Order }) {
  const copy = useCopy();
  return (
    <View>
      <View style={styles.route}>
        <View style={styles.routeDot} />
        <View style={styles.flex}>
          <Text style={styles.routeText}>{order.pickup.label}</Text>
          <Text style={styles.mutedSmall}>{copy.pickup}</Text>
        </View>
      </View>
      <View style={styles.route}>
        <View style={[styles.routeDot, styles.routeDotGreen]} />
        <View style={styles.flex}>
          <Text style={styles.routeText}>{order.drop.label}</Text>
          <Text style={styles.mutedSmall}>{copy.drop}</Text>
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
  const copy = useCopy();
  return (
    <View style={styles.map}>
      <View style={styles.mapRoad} />
      <View style={[styles.mapRoad, styles.mapRoadTwo]} />
      <View style={styles.mapRoute} />
      <View style={styles.mapPinA} />
      <View style={styles.mapPinB} />
      <View style={styles.etaChip}>
        <Text style={styles.etaValue}>{eta}</Text>
        <Text style={styles.etaLabel}>{copy.min}</Text>
      </View>
      <Text style={styles.mapText}>{pickup} {'->'} {drop}</Text>
    </View>
  );
}

function Timeline({ order }: { order: Order }) {
  const language = useLanguage();
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
            <Text style={styles.timelineTitle}>{timelineTitle(language, item.key, item.title)}</Text>
            {item.note ? <Text style={styles.mutedSmall}>{timelineNote(language, item.key, item.note)}</Text> : null}
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
  shell: { flex: 1, backgroundColor: colors.partner, paddingTop: androidStatusBarInset },
  loginShell: { flex: 1, backgroundColor: colors.white, paddingTop: androidStatusBarInset },
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
  loginBrandLogo: { width: 172, height: 54 },
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
  onboardingStepperCard: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.white, padding: 14, marginBottom: 12 },
  onboardingStepperRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 4 },
  onboardingStepperItem: { width: 76, alignItems: 'center' },
  onboardingStepperLine: { flex: 1, borderTopWidth: 1, borderStyle: 'dashed', borderColor: colors.line, marginTop: 17 },
  onboardingStepperLineDone: { borderColor: colors.partner },
  onboardingStepperCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.faint,
    alignItems: 'center',
    justifyContent: 'center'
  },
  onboardingStepperCircleActive: { borderColor: colors.partner, backgroundColor: colors.white },
  onboardingStepperCircleDone: { borderColor: colors.partner, backgroundColor: colors.partner },
  onboardingStepperNumber: { color: colors.muted, fontSize: 12, fontWeight: '900' },
  onboardingStepperNumberActive: { color: colors.partner },
  onboardingStepperLabel: { color: colors.muted, fontSize: 11, fontWeight: '900', marginTop: 6, textAlign: 'center' },
  onboardingStepperLabelActive: { color: colors.partner },
  onboardingStepCard: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.white, padding: 14, marginBottom: 12 },
  onboardingStepHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  onboardingStepIntro: { marginBottom: 12 },
  onboardingNavRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 2 },
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
  brandLogoImage: { width: 258, height: 88 },
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
  accountContent: { marginTop: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 },
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
  accountHero: { backgroundColor: colors.partner, borderRadius: 22, padding: 18, paddingBottom: 72, marginBottom: 68 },
  accountHeroGlow: { position: 'absolute', width: 130, height: 130, borderRadius: 65, right: 0, top: 0, backgroundColor: 'rgba(255,255,255,0.10)' },
  accountEyebrow: { color: colors.white, fontSize: 22, fontWeight: '900' },
  accountHeroSubtitle: { color: '#D1FAE5', fontSize: 13, fontWeight: '700', marginTop: 3 },
  accountIdentityCard: { position: 'absolute', left: 14, right: 14, top: 82, minHeight: 112, borderRadius: 18, backgroundColor: colors.white, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: '#0F172A', shadowOpacity: 0.13, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 4 },
  accountAvatar: { width: 62, height: 62, borderRadius: 31, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  accountAvatarText: { color: colors.white, fontSize: 20, fontWeight: '900' },
  accountName: { color: colors.ink, fontSize: 18, fontWeight: '900' },
  accountPhone: { color: colors.muted, fontSize: 12, fontWeight: '700', marginTop: 2 },
  accountVerifiedBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.partnerLight, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 8, marginTop: 7 },
  accountVerifiedText: { color: colors.partner, fontSize: 10, fontWeight: '900', textTransform: 'capitalize' },
  accountEditButton: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.partnerLight, alignItems: 'center', justifyContent: 'center' },
  accountProgressCard: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.white, padding: 14, marginBottom: 12 },
  accountMenuCard: { borderWidth: 1, borderColor: colors.line, borderRadius: 18, backgroundColor: colors.white, paddingHorizontal: 12, marginBottom: 14, overflow: 'hidden' },
  accountMenuRow: { minHeight: 74, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: colors.line, paddingVertical: 12 },
  accountMenuRowLast: { borderBottomWidth: 0 },
  accountMenuIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.partnerLight, alignItems: 'center', justifyContent: 'center' },
  accountMenuIconComplete: { backgroundColor: colors.partner },
  accountDetailHeader: { minHeight: 82, borderRadius: 18, backgroundColor: colors.partner, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14, overflow: 'hidden' },
  accountBackButton: { width: 40, height: 40, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  accountDetailTitle: { color: colors.white, fontSize: 18, fontWeight: '900' },
  accountDetailSubtitle: { color: '#D1FAE5', fontSize: 11, fontWeight: '700', marginTop: 3 },
  accountDetailCard: { borderWidth: 1, borderColor: colors.line, borderRadius: 18, backgroundColor: colors.white, padding: 14 },
  accountDetailCardComplete: { borderColor: colors.partner, backgroundColor: '#FAFFFD' },
  accountInfoStrip: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, backgroundColor: colors.partnerLight, padding: 12, marginBottom: 14 },
  accountInfoText: { flex: 1, color: colors.partner, fontSize: 12, fontWeight: '800', lineHeight: 17 },
  accountBankStatus: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  kycHero: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.partner, borderRadius: 18, padding: 16, marginBottom: 14 },
  kycHeroIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  kycHeroTitle: { color: colors.white, fontSize: 18, fontWeight: '900' },
  kycHeroText: { color: '#D1FAE5', fontSize: 12, fontWeight: '800', marginTop: 3, lineHeight: 17 },
  profileInfoCard: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.white, padding: 14, marginBottom: 12 },
  profileInfoHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatarDark: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  avatarDarkText: { color: colors.white, fontWeight: '900' },
  profileName: { color: colors.ink, fontSize: 18, fontWeight: '900' },
  profileInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderTopWidth: 1, borderTopColor: colors.line },
  profileInfoValue: { color: colors.ink, fontSize: 13, fontWeight: '900', marginTop: 2 },
  languageCard: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.white, padding: 12, marginBottom: 12 },
  languageCardCompact: { marginTop: -10, marginBottom: 16 },
  languageHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  languageOptionRow: { flexDirection: 'row', gap: 8 },
  languagePill: { flex: 1, minHeight: 38, borderRadius: 12, backgroundColor: colors.faint, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  languagePillActive: { backgroundColor: colors.partnerLight, borderWidth: 1, borderColor: colors.partner },
  languagePillText: { color: colors.muted, fontSize: 12, fontWeight: '900' },
  languagePillTextActive: { color: colors.partner },
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
