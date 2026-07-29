import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  BackHandler,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  Vibration,
  View
} from 'react-native';
import { SafeAreaView, type Edge, useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Notifications from 'expo-notifications';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import RazorpayCheckout from 'react-native-razorpay';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { io, Socket } from 'socket.io-client';
import { Ionicons } from '@expo/vector-icons';
import indieryLogoImage from './assets/indiery-logo.png';
import partnerLoginBackgroundImage from './assets/bg1.png';
import {
  colors,
  IndieryApi,
  partnerLegalPolicies,
  LegalPolicy,
  money,
  LocationPoint,
  Order,
  PartnerBootstrap,
  PartnerLocation,
  PartnerRoutePath,
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
const googleMapsApiKey =
  process?.env?.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  process?.env?.GOOGLE_MAPS_API_KEY ||
  (Constants.expoConfig?.extra?.googleMapsApiKey as string | undefined) ||
  '';

if (!apiBaseUrl) throw new Error('EXPO_PUBLIC_API_URL is required for production builds');
if (!__DEV__ && !apiBaseUrl.startsWith('https://') && !allowInsecureApiBaseUrl) {
  throw new Error('Production API URL must use HTTPS');
}

const socketUrl = apiBaseUrl.replace(/\/api\/?$/, '');
const minPartnerWalletBalance = 200;
const expoProjectId =
  (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId ??
  (Constants.easConfig as { projectId?: string } | null)?.projectId;
const androidStatusBarInset = Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0;
const appSafeAreaEdges: Edge[] = Platform.OS === 'android'
  ? ['left', 'right', 'bottom']
  : ['top', 'right', 'bottom', 'left'];
const tabScreenSafeAreaEdges: Edge[] = appSafeAreaEdges.filter((edge) => edge !== 'bottom');

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    priority: Notifications.AndroidNotificationPriority.MAX
  })
});

type Tab = 'dashboard' | 'active' | 'earnings' | 'profile';
type KycDoc = 'selfie' | 'pan' | 'aadhaar' | 'drivingLicence' | 'rc';
type BankDetailsInput = { accountHolder: string; accountNumber: string; ifsc: string };
type PartnerProfileInput = { name: string; email: string; city: string; vehicleId: string; vehicleNumber: string };
type OnboardingStepId = 1 | 2 | 3;
type AppLanguage = 'en' | 'hi';
type ProfilePage = 'overview' | 'personal' | 'training' | 'vehicle' | 'documents' | 'bank' | 'language' | 'legal';
type OrderHistoryDateFilter = 'all' | 'today' | 'last7Days';

const enCopy = {
  appName: 'Indiery Partner',
  appEyebrow: 'INDIERY PARTNER',
  loadingPartner: 'Loading Indiery Partner',
  partnerSetup: 'Partner setup',
  welcomeBack: 'Welcome Back',
  loginSubtitle: 'Login to manage your deliveries',
  loginHeroCaption: 'Delivering trust, every mile.',
  byContinuingAgree: 'By continuing, you agree to the',
  termsAndConditions: 'Terms & Conditions',
  and: 'and',
  privacyPolicy: 'Privacy Policy',
  mobileNumber: 'Mobile Number',
  enterMobileNumber: 'Enter your mobile number',
  otpSent: 'OTP sent. Enter the code to verify.',
  otpCode: 'OTP code',
  otpVerification: 'OTP verification',
  otpDestination: 'Enter the 6-digit code sent to',
  verifyAndContinue: 'Verify and continue',
  changeNumber: 'Change number',
  didNotReceiveCode: "Didn't receive the code?",
  resendOtp: 'Resend OTP',
  resendIn: 'Resend OTP in',
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
  goOnline: 'GO ONLINE',
  goOffline: 'GO OFFLINE',
  slideToConfirm: 'Slide to confirm',
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
  pickupDistance: 'Approx. {distance} from your location to pickup',
  tripDistance: 'Trip distance',
  waitingForGpsDistance: 'Waiting for GPS to calculate pickup distance',
  noOrdersRightNow: 'No orders right now',
  stayOnlineRefresh: 'Stay online and refresh after a customer books.',
  skip: 'Skip',
  wait: 'Wait',
  accept: 'Accept',
  noActiveDelivery: 'No active delivery',
  acceptOrderFromHome: 'Accept an order from Home to start a delivery.',
  refresh: 'Refresh',
  refreshing: 'Refreshing...',
  dataRefreshed: 'Latest data loaded',
  activeOrders: 'Active Orders',
  activeTrips: 'Active Trips',
  orderHistory: 'Order History',
  allOrders: 'All',
  last7Days: 'Last 7 days',
  filters: 'Filters',
  filterOrders: 'Filter orders',
  filterOrdersSubtitle: 'Choose when the deliveries were completed.',
  date: 'Date',
  applyFilters: 'Apply filters',
  noMatchingOrders: 'No matching orders',
  adjustOrderFilters: 'Try a different date filter.',
  clearFilters: 'Clear filters',
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
  driverTraining: 'Driver Training',
  driverTrainingSubtitle: 'Learn how to use the partner app',
  trainingIntro: 'Complete every delivery correctly',
  trainingIntroText: 'Follow these steps from going online until the customer receives the goods.',
  trainingGoOnlineTitle: '1. Go online',
  trainingGoOnlineText: 'Keep GPS and notifications enabled, maintain the required wallet balance, then switch your status to ONLINE.',
  trainingAcceptTitle: '2. Review and accept an order',
  trainingAcceptText: 'Check pickup distance, trip distance, goods, vehicle requirement and earnings. Accept only when you are ready to complete it.',
  trainingPickupTitle: '3. Reach the pickup safely',
  trainingPickupText: 'Use navigation, contact the sender only when needed, match the order details and inspect the packed goods.',
  trainingPickupPhotoTitle: '4. Capture pickup proof',
  trainingPickupPhotoText: 'Use Capture Pickup POD to take a clear photo of the packed goods at the pickup. Make sure the goods are visible and the photo is not blurred.',
  trainingPickupOtpTitle: '5. Verify the pickup OTP',
  trainingPickupOtpText: 'Ask the sender for the six-digit pickup OTP only after you reach the pickup. Enter it before moving the goods.',
  trainingDeliverTitle: '6. Deliver with live tracking',
  trainingDeliverText: 'Keep location enabled, follow traffic rules, protect the goods and avoid unnecessary stops or route changes.',
  trainingDropPhotoTitle: '7. Capture delivery proof',
  trainingDropPhotoText: 'After handing over the goods, use Capture Drop POD to take a clear delivery-proof photo. Avoid including unrelated people or private information.',
  trainingDropOtpTitle: '8. Verify drop OTP and complete',
  trainingDropOtpText: 'At the destination, hand over the goods to the receiver, enter the drop OTP and mark the delivery complete.',
  trainingSafetyTitle: 'Safety rules',
  trainingSafetyText: 'Wear a helmet or seat belt, never use the phone while moving, and never carry illegal, leaking or hazardous goods.',
  trainingHelpTitle: 'Need help during a trip?',
  trainingHelpText: 'Open the active order and use support. For an immediate safety risk, stop in a safe place before taking action.',
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
  profileUnderReview: 'Profile submitted for verification',
  profileSubmittedNotice: 'Your profile and documents were submitted successfully. Our admin team will review them before order access is enabled.',
  checkVerificationStatus: 'Check verification status',
  verificationApproved: 'Profile verified. Order access is now enabled.',
  verificationStillPending: 'Admin verification is still pending.',
  verificationRejected: 'Verification needs attention. Review your documents and submit them again.',
  requestAccountDeletion: 'Request account deletion',
  requestAccountDeletionBody: 'We will review your request and delete eligible account data. Some order, payout, KYC, fraud prevention, tax, or legal records may be retained where required.',
  submitRequest: 'Submit request',
  cancel: 'Cancel',
  cancelDelivery: 'Cancel this order',
  cancelDeliveryTitle: 'Cancel this order?',
  cancelDeliveryBody: 'It will be offered to another driver. You have {remaining} cancellation(s) remaining today.',
  cancellationsRemaining: '{remaining} driver cancellation(s) remaining today',
  dailyCancellationLimit: 'Daily cancellation limit reached',
  driverCancellationSubmitted: 'Order cancelled. We are finding another driver for the customer.',
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
  stop: 'Stop',
  liveGps: 'Live GPS',
  waitingGps: 'Waiting for GPS',
  maximizeMap: 'Maximize map',
  minimizeMap: 'Minimize map',
  exactRoadRoute: 'Exact road route',
  loadingExactRoute: 'Loading exact route',
  exactRouteUnavailable: 'Exact road route is unavailable. Showing direct route.',
  panic: 'SOS',
  emergencyHelp: 'Emergency help',
  emergencyHelpBody: 'Choose who you want to call. Your phone dialer will open with the number.',
  emergencyWarning: 'Use SOS only in an emergency. Stay in a safe place before calling.',
  callAmbulance: 'Ambulance 108',
  callPolice: 'Police 112',
  ambulanceHint: 'Medical emergency support',
  policeHint: 'Police emergency assistance',
  callNow: 'Call now',
  unableToOpenDialer: 'Could not open phone dialer',
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
  locationDisclosureTitle: 'How Indiery Partner uses your location',
  locationDisclosureBody: 'Indiery Partner collects your precise location while this app is in use whenever you are online or handling an active delivery. It is sent to Indiery to show nearby orders, assign deliveries, update trips, and support safety. During an active delivery, it is shared with the customer for live tracking. The app does not request background location, and Indiery does not sell location data.',
  allowLocation: 'Allow location',
  turnOnGps: 'Turn on device location/GPS to receive nearby orders',
  gpsTakingTooLong: 'GPS is taking too long',
  notificationRegisterLater: 'Notifications allowed. Driver alerts will register when network is available',
  permissionSettings: 'Enable {permissions} permission in phone settings for driver app features',
  permissionLocation: 'location',
  permissionNotifications: 'notifications',
  permissionCamera: 'camera',
  orderAlerts: 'Order alerts',
  cameraPermissionRequired: 'Camera permission is required to capture proof',
  cameraDisclosureTitle: 'How Indiery Partner uses your camera',
  cameraDisclosureBody: 'Indiery Partner accesses your camera only when you choose to take a photo. Photos are uploaded to Indiery and stored with our media-storage provider for KYC or vehicle verification, pickup or delivery proof, safety, fraud prevention, and dispute handling. Delivery-proof photos may be accessed by the relevant customer and Indiery support. Indiery does not sell these photos.',
  allowCamera: 'Allow camera',
  notNow: 'Not now',
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
  refreshing: 'रिफ्रेश हो रहा है...',
  dataRefreshed: 'नई जानकारी लोड हो गई',
  loadingPartner: 'Indiery Partner लोड हो रहा है',
  partnerSetup: 'पार्टनर सेटअप',
  welcomeBack: 'वापसी पर स्वागत है',
  loginSubtitle: 'अपनी डिलीवरी संभालने के लिए लॉगिन करें',
  loginHeroCaption: 'हर सफर में भरोसेमंद डिलीवरी.',
  byContinuingAgree: 'जारी रखकर, आप सहमत हैं',
  termsAndConditions: 'नियम एवं शर्तों',
  and: 'और',
  privacyPolicy: 'गोपनीयता नीति',
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
  goOnline: 'ऑनलाइन हों',
  goOffline: 'ऑफलाइन हों',
  slideToConfirm: 'पुष्टि के लिए स्लाइड करें',
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
  driverTraining: 'ड्राइवर ट्रेनिंग',
  driverTrainingSubtitle: 'पार्टनर ऐप इस्तेमाल करना सीखें',
  trainingIntro: 'हर डिलीवरी सही तरीके से पूरी करें',
  trainingIntroText: 'ऑनलाइन होने से लेकर ग्राहक को सामान देने तक इन चरणों का पालन करें।',
  trainingGoOnlineTitle: '1. ऑनलाइन हों',
  trainingGoOnlineText: 'GPS और नोटिफिकेशन चालू रखें, जरूरी वॉलेट बैलेंस बनाए रखें और फिर अपना स्टेटस ONLINE करें।',
  trainingAcceptTitle: '2. ऑर्डर जांचें और स्वीकार करें',
  trainingAcceptText: 'पिकअप दूरी, ट्रिप दूरी, सामान, जरूरी वाहन और कमाई जांचें। तैयार होने पर ही ऑर्डर स्वीकार करें।',
  trainingPickupTitle: '3. सुरक्षित रूप से पिकअप पर पहुंचें',
  trainingPickupText: 'नेविगेशन इस्तेमाल करें, जरूरत पर ही सेंडर से संपर्क करें, ऑर्डर जानकारी मिलाएं और पैक सामान जांचें।',
  trainingPickupPhotoTitle: '4. पिकअप प्रूफ फोटो लें',
  trainingPickupPhotoText: 'Capture Pickup POD से पिकअप पर पैक सामान की साफ फोटो लें। सामान साफ दिखाई देना चाहिए और फोटो धुंधली नहीं होनी चाहिए।',
  trainingPickupOtpTitle: '5. पिकअप OTP सत्यापित करें',
  trainingPickupOtpText: 'पिकअप पर पहुंचने के बाद ही सेंडर से छह अंकों का OTP लें। सामान ले जाने से पहले इसे दर्ज करें।',
  trainingDeliverTitle: '6. लाइव ट्रैकिंग के साथ डिलीवर करें',
  trainingDeliverText: 'लोकेशन चालू रखें, ट्रैफिक नियम मानें, सामान सुरक्षित रखें और बिना जरूरत रुकने या रास्ता बदलने से बचें।',
  trainingDropPhotoTitle: '7. डिलीवरी प्रूफ फोटो लें',
  trainingDropPhotoText: 'सामान देने के बाद Capture Drop POD से साफ डिलीवरी प्रूफ फोटो लें। अनजान लोगों या निजी जानकारी को फोटो में शामिल न करें।',
  trainingDropOtpTitle: '8. ड्रॉप OTP डालकर पूरा करें',
  trainingDropOtpText: 'मंजिल पर रिसीवर को सामान दें, ड्रॉप OTP दर्ज करें और डिलीवरी पूरी मार्क करें।',
  trainingSafetyTitle: 'सुरक्षा नियम',
  trainingSafetyText: 'हेलमेट या सीट बेल्ट पहनें, चलते समय फोन न चलाएं और अवैध, रिसने वाला या खतरनाक सामान न ले जाएं।',
  trainingHelpTitle: 'ट्रिप के दौरान मदद चाहिए?',
  trainingHelpText: 'एक्टिव ऑर्डर खोलकर सपोर्ट इस्तेमाल करें। तुरंत सुरक्षा जोखिम होने पर पहले सुरक्षित जगह रुकें।',
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
  profileUnderReview: 'प्रोफाइल सत्यापन के लिए जमा है',
  profileSubmittedNotice: 'आपकी प्रोफाइल और दस्तावेज सफलतापूर्वक जमा हो गए हैं। ऑर्डर एक्सेस शुरू होने से पहले हमारी एडमिन टीम इनकी जांच करेगी।',
  checkVerificationStatus: 'सत्यापन स्टेटस जांचें',
  verificationApproved: 'प्रोफाइल सत्यापित हो गई है। अब ऑर्डर एक्सेस चालू है।',
  verificationStillPending: 'एडमिन सत्यापन अभी पेंडिंग है।',
  verificationRejected: 'सत्यापन के लिए सुधार जरूरी है। अपने दस्तावेज जांचकर दोबारा जमा करें।',
  requestAccountDeletion: 'अकाउंट डिलीट अनुरोध',
  requestAccountDeletionBody: 'हम आपका अनुरोध रिव्यू करेंगे और योग्य अकाउंट डेटा हटाएंगे. कुछ ऑर्डर, पेआउट, KYC, धोखाधड़ी रोकथाम, टैक्स या कानूनी रिकॉर्ड जरूरत के अनुसार रखे जा सकते हैं.',
  submitRequest: 'अनुरोध भेजें',
  cancel: 'रद्द करें',
  cancelDelivery: 'यह ऑर्डर रद्द करें',
  cancelDeliveryTitle: 'यह ऑर्डर रद्द करें?',
  cancelDeliveryBody: 'यह ऑर्डर दूसरे ड्राइवर को दिया जाएगा। आज {remaining} कैंसलेशन बाकी हैं।',
  cancellationsRemaining: 'आज {remaining} ड्राइवर कैंसलेशन बाकी हैं',
  dailyCancellationLimit: 'आज की कैंसलेशन सीमा पूरी हो गई',
  driverCancellationSubmitted: 'ऑर्डर रद्द हुआ। ग्राहक के लिए नया ड्राइवर खोजा जा रहा है।',
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
  maximizeMap: 'मैप बड़ा करें',
  minimizeMap: 'मैप छोटा करें',
  exactRoadRoute: 'सही सड़क मार्ग',
  loadingExactRoute: 'सही मार्ग लोड हो रहा है',
  exactRouteUnavailable: 'सही सड़क मार्ग उपलब्ध नहीं है। सीधा मार्ग दिखाया जा रहा है।',
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

function showAndroidPermissionDisclosure(input: {
  title: string;
  message: string;
  allowLabel: string;
  cancelLabel: string;
}) {
  if (Platform.OS !== 'android') return Promise.resolve(true);

  return new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (accepted: boolean) => {
      if (settled) return;
      settled = true;
      resolve(accepted);
    };

    Alert.alert(
      input.title,
      input.message,
      [
        { text: input.cancelLabel, style: 'cancel', onPress: () => finish(false) },
        { text: input.allowLabel, onPress: () => finish(true) }
      ],
      { cancelable: true, onDismiss: () => finish(false) }
    );
  });
}

let partnerLocationPermissionRequest:
  | Promise<Awaited<ReturnType<typeof Location.getForegroundPermissionsAsync>>>
  | null = null;

function requestPartnerLocationPermission(language: AppLanguage) {
  if (partnerLocationPermissionRequest) return partnerLocationPermissionRequest;

  const request = (async () => {
    const existingPermission = await Location.getForegroundPermissionsAsync();
    if (existingPermission.status === 'granted' || !existingPermission.canAskAgain) {
      return existingPermission;
    }

    const accepted = await showAndroidPermissionDisclosure({
      title: copyFor(language, 'locationDisclosureTitle'),
      message: copyFor(language, 'locationDisclosureBody'),
      allowLabel: copyFor(language, 'allowLocation'),
      cancelLabel: copyFor(language, 'notNow')
    });
    if (!accepted) return existingPermission;

    return Location.requestForegroundPermissionsAsync();
  })();

  partnerLocationPermissionRequest = request;
  const clearRequest = () => {
    if (partnerLocationPermissionRequest === request) partnerLocationPermissionRequest = null;
  };
  void request.then(clearRequest, clearRequest);
  return request;
}

let partnerCameraPermissionRequest:
  | Promise<Awaited<ReturnType<typeof ImagePicker.getCameraPermissionsAsync>>>
  | null = null;

function requestPartnerCameraPermission(language: AppLanguage) {
  if (partnerCameraPermissionRequest) return partnerCameraPermissionRequest;

  const request = (async () => {
    const existingPermission = await ImagePicker.getCameraPermissionsAsync();
    if (existingPermission.status === 'granted' || !existingPermission.canAskAgain) {
      return existingPermission;
    }

    const accepted = await showAndroidPermissionDisclosure({
      title: copyFor(language, 'cameraDisclosureTitle'),
      message: copyFor(language, 'cameraDisclosureBody'),
      allowLabel: copyFor(language, 'allowCamera'),
      cancelLabel: copyFor(language, 'notNow')
    });
    if (!accepted) return existingPermission;

    return ImagePicker.requestCameraPermissionsAsync();
  })();

  partnerCameraPermissionRequest = request;
  const clearRequest = () => {
    if (partnerCameraPermissionRequest === request) partnerCameraPermissionRequest = null;
  };
  void request.then(clearRequest, clearRequest);
  return request;
}

async function readDeviceLocation(
  language: AppLanguage = 'en',
  accuracy: Location.Accuracy = Location.Accuracy.Balanced
) {
  const permission = await requestPartnerLocationPermission(language);
  if (permission.status !== 'granted') {
    throw new Error(copyFor(language, 'locationPermissionRequired'));
  }

  const servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled) {
    throw new Error(copyFor(language, 'turnOnGps'));
  }

  const recentLocation = await Location.getLastKnownPositionAsync({ maxAge: 45000 }).catch(() => null);
  if (recentLocation) return recentLocation;

  try {
    return await withTimeout(
      Location.getCurrentPositionAsync({ accuracy }),
      5000,
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
  let registeredPushToken: string | undefined;

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('orders', {
        name: copyFor(language, 'orderAlerts'),
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        enableVibrate: true,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: colors.partner
      });
      await Notifications.setNotificationChannelAsync('driver-orders', {
        name: 'Driver order beep',
        description: 'Loud alerts for new delivery offers and urgent driver updates',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'default',
        enableVibrate: true,
        vibrationPattern: [0, 700, 250, 700, 250, 900],
        lightColor: colors.partner,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: false,
        showBadge: true,
        enableLights: true
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
          registeredPushToken = token.data;
        } catch {
          onMessage(copyFor(language, 'notificationRegisterLater'));
        }
      } else {
        onMessage('Push notification setup is incomplete. Link this app to an Expo project before release.');
      }
    } else {
      denied.push(copyFor(language, 'permissionNotifications'));
    }
  } catch {
    denied.push(copyFor(language, 'permissionNotifications'));
  }

  if (denied.length) {
    onMessage(fillCopy(copyFor(language, 'permissionSettings'), { permissions: denied.join(', ') }));
  }
  return registeredPushToken;
}

function pickupDistanceKm(currentLocation: PartnerLocation | undefined, pickup: Order['pickup']) {
  if (
    typeof currentLocation?.lat !== 'number' ||
    typeof currentLocation.lng !== 'number' ||
    typeof pickup.lat !== 'number' ||
    typeof pickup.lng !== 'number'
  ) {
    return undefined;
  }

  const earthRadiusKm = 6371;
  const dLat = ((pickup.lat - currentLocation.lat) * Math.PI) / 180;
  const dLng = ((pickup.lng - currentLocation.lng) * Math.PI) / 180;
  const currentLat = (currentLocation.lat * Math.PI) / 180;
  const pickupLat = (pickup.lat * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(currentLat) * Math.cos(pickupLat) * Math.sin(dLng / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatPickupDistance(distanceKm: number) {
  if (distanceKm < 0.1) return '< 0.1 km';
  if (distanceKm < 10) return `${distanceKm.toFixed(1)} km`;
  return `${Math.round(distanceKm)} km`;
}

const defaultMapCenter = { lat: 26.8467, lng: 80.9462 };

function hasValidCoordinates(lat?: number, lng?: number) {
  return typeof lat === 'number' && Number.isFinite(lat) && typeof lng === 'number' && Number.isFinite(lng);
}

function routeStopSummary(stops?: LocationPoint[]) {
  const count = stops?.filter((stop) => stop.label.trim().length > 1).length ?? 0;
  if (!count) return '';
  return count === 1 ? '1 stop' : `${count} stops`;
}

type PendingLocationUpdate = {
  coords: Location.LocationObjectCoords;
  waiters: Array<{
    resolve: () => void;
    reject: (error: unknown) => void;
  }>;
};

export default function App() {
  const api = useMemo(() => new IndieryApi(apiBaseUrl), []);
  const responsive = useResponsiveLayout();
  const socketRef = useRef<Socket | null>(null);
  const pushTokenRef = useRef<string | undefined>(undefined);
  const lastNotificationResponseIdRef = useRef<string | undefined>(undefined);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshInFlightRef = useRef(false);
  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const locationStreamModeRef = useRef<'online' | 'active' | null>(null);
  const locationStreamGenerationRef = useRef(0);
  const locationStreamRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locationStreamRetryCountRef = useRef(0);
  const locationSyncInFlightRef = useRef(false);
  const pendingLocationRef = useRef<PendingLocationUpdate | null>(null);
  const exitBackPressedAtRef = useRef(0);
  const knownAvailableOrderIdsRef = useRef<Set<string>>(new Set());
  const availableOrderTrackingReadyRef = useRef(false);
  const previousOnlineRef = useRef(false);
  const [tab, setTab] = useState<Tab>('dashboard');
  const [language, setLanguage] = useState<AppLanguage>('en');
  const [data, setData] = useState<PartnerBootstrap | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [profileDetailOpen, setProfileDetailOpen] = useState(false);
  const [panicOpen, setPanicOpen] = useState(false);
  const [selectedActiveOrderId, setSelectedActiveOrderId] = useState<string | undefined>();
  const [notificationIntent, setNotificationIntent] = useState<{
    responseId: string;
    orderId: string;
    screen?: string;
  } | null>(null);
  const activeOrderIds = (data?.activeOrders ?? []).map((order) => order.id).join('|');
  const availableOrderIds = (data?.availableOrders ?? []).map((order) => order.id).join('|');

  useEffect(() => {
    boot();
    return () => {
      socketRef.current?.disconnect();
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      stopLocationStream();
    };
  }, []);

  useEffect(() => {
    const handleResponse = (response: Notifications.NotificationResponse) => {
      const responseId = response.notification.request.identifier;
      if (lastNotificationResponseIdRef.current === responseId) return;
      const payload = response.notification.request.content.data ?? {};
      if (payload.role && payload.role !== 'partner') return;
      if (typeof payload.orderId !== 'string' || !payload.orderId) return;
      lastNotificationResponseIdRef.current = responseId;
      setNotificationIntent({
        responseId,
        orderId: payload.orderId,
        screen: typeof payload.screen === 'string' ? payload.screen : undefined
      });
      void Notifications.clearLastNotificationResponseAsync();
    };

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) handleResponse(response);
    });
    const subscription = Notifications.addNotificationResponseReceivedListener(handleResponse);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      const payload = notification.request.content.data ?? {};
      if (payload.role && payload.role !== 'partner') return;
      if (typeof payload.orderId !== 'string' || !payload.orderId) return;
      if (payload.screen === 'active') {
        setSelectedActiveOrderId(payload.orderId);
        setTab('active');
      } else {
        setTab('dashboard');
      }
      scheduleRefresh(50);
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!data || !notificationIntent) return;
    const isActive = data.activeOrders.some((order) => order.id === notificationIntent.orderId);
    if (notificationIntent.screen === 'active' || isActive) {
      setSelectedActiveOrderId(notificationIntent.orderId);
      setTab('active');
    } else {
      setTab('dashboard');
    }
    setNotificationIntent(null);
    void refresh();
  }, [data, notificationIntent]);

  useEffect(() => {
    if (data?.user.partnerProfile?.online || data?.activeOrders[0]) {
      startLocationStream(Boolean(data?.activeOrders[0]));
    } else {
      stopLocationStream();
    }
  }, [data?.user.partnerProfile?.online, activeOrderIds]);

  useEffect(() => {
    if (!data) return;
    const online = Boolean(data.user.partnerProfile?.online);
    const currentOrderIds = new Set(data.availableOrders.map((order) => order.id));

    if (!availableOrderTrackingReadyRef.current || !online || !previousOnlineRef.current) {
      knownAvailableOrderIdsRef.current = currentOrderIds;
      availableOrderTrackingReadyRef.current = true;
      previousOnlineRef.current = online;
      return;
    }

    const hasNewOrder = data.availableOrders.some(
      (order) => !knownAvailableOrderIdsRef.current.has(order.id)
    );
    knownAvailableOrderIdsRef.current = currentOrderIds;
    previousOnlineRef.current = online;

    if (hasNewOrder) {
      Vibration.vibrate([0, 700, 250, 700, 250, 900]);
    }
  }, [availableOrderIds, data?.user.partnerProfile?.online]);

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
    requestPartnerAppPermissions(api, showToast, language)
      .then((token) => {
        pushTokenRef.current = token;
      })
      .catch(() => undefined);
  }

  async function refresh(interactive = false) {
    if (refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;
    if (interactive) setRefreshing(true);
    try {
      const bootstrap = await api.partnerBootstrap();
      setData((current) => current ? bootstrap : current);
      if (interactive) showToast(copyFor(language, 'dataRefreshed'));
    } catch (err) {
      showToast(err instanceof Error ? err.message : copyFor(language, 'refreshFailed'));
    } finally {
      refreshInFlightRef.current = false;
      if (interactive) setRefreshing(false);
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
      if (hasConnectedOnce) scheduleRefresh(100);
      hasConnectedOnce = true;
    });
    socket.on('order:changed', (order: Order) => {
      mergeRealtimeOrder(order);
    });
    socket.on('partner:queue_changed', () => {
      scheduleRefresh();
    });
  }

  function toLocationPayload(coords: Location.LocationObjectCoords) {
    return {
      lat: coords.latitude,
      lng: coords.longitude,
      heading:
        typeof coords.heading === 'number' &&
        Number.isFinite(coords.heading) &&
        coords.heading >= 0 &&
        coords.heading <= 360
          ? coords.heading
          : undefined,
      speed:
        typeof coords.speed === 'number' &&
        Number.isFinite(coords.speed) &&
        coords.speed >= 0 &&
        coords.speed <= 100
          ? coords.speed
          : undefined
    };
  }

  async function performLocationUpdate(coords: Location.LocationObjectCoords, throwOnError: boolean) {
    locationSyncInFlightRef.current = true;
    try {
      const result = await api.updatePartnerLocation(toLocationPayload(coords));
      const nextLocation = result.user.partnerProfile?.currentLocation ?? toLocationPayload(coords);
      setData((current) => current ? {
        ...current,
        user: result.user,
        activeOrders: current.activeOrders.map((order) => ({
          ...order,
          partnerLocation: nextLocation
        }))
      } : current);
    } catch (err) {
      if (throwOnError) throw err;
      // Location is helpful but should not block accepting or completing jobs.
    } finally {
      locationSyncInFlightRef.current = false;
      const pendingLocation = pendingLocationRef.current;
      pendingLocationRef.current = null;
      if (pendingLocation) {
        void performLocationUpdate(pendingLocation.coords, true).then(
          () => pendingLocation.waiters.forEach((waiter) => waiter.resolve()),
          (error) => pendingLocation.waiters.forEach((waiter) => waiter.reject(error))
        );
      }
    }
  }

  async function refreshVerificationStatus() {
    setBusy(true);
    try {
      const bootstrap = await api.partnerBootstrap();
      setData((current) => current ? bootstrap : current);
      const status = bootstrap.user.partnerProfile?.kycStatus;
      showToast(
        status === 'verified'
          ? copyFor(language, 'verificationApproved')
          : status === 'rejected'
            ? copyFor(language, 'verificationRejected')
            : copyFor(language, 'verificationStillPending')
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : copyFor(language, 'refreshFailed'));
    } finally {
      setBusy(false);
    }
  }

  async function sendLocationUpdate(coords: Location.LocationObjectCoords, options: { throwOnError?: boolean } = {}) {
    if (!locationSyncInFlightRef.current) {
      return performLocationUpdate(coords, Boolean(options.throwOnError));
    }

    if (!options.throwOnError) {
      if (pendingLocationRef.current) {
        pendingLocationRef.current.coords = coords;
      } else {
        pendingLocationRef.current = { coords, waiters: [] };
      }
      return;
    }

    return new Promise<void>((resolve, reject) => {
      if (pendingLocationRef.current) {
        pendingLocationRef.current.coords = coords;
        pendingLocationRef.current.waiters.push({ resolve, reject });
      } else {
        pendingLocationRef.current = {
          coords,
          waiters: [{ resolve, reject }]
        };
      }
    });
  }

  async function startLocationStream(activeTrip = false, retry = false) {
    if (locationStreamRetryRef.current) {
      clearTimeout(locationStreamRetryRef.current);
      locationStreamRetryRef.current = null;
    }
    if (!retry) locationStreamRetryCountRef.current = 0;

    const mode = activeTrip ? 'active' : 'online';
    if (locationSubscriptionRef.current && locationStreamModeRef.current === mode) {
      locationStreamRetryCountRef.current = 0;
      return;
    }
    const previousSubscription = locationSubscriptionRef.current;
    const previousMode = locationStreamModeRef.current;
    const generation = locationStreamGenerationRef.current + 1;
    locationStreamGenerationRef.current = generation;
    locationStreamModeRef.current = mode;

    try {
      const accuracy = activeTrip ? Location.Accuracy.High : Location.Accuracy.Balanced;
      const current = await readDeviceLocation(language, accuracy);
      if (locationStreamGenerationRef.current !== generation || locationStreamModeRef.current !== mode) return;
      sendLocationUpdate(current.coords);
      const subscription = await Location.watchPositionAsync(
        {
          accuracy,
          timeInterval: activeTrip ? 6000 : 8000,
          distanceInterval: activeTrip ? 10 : 20
        },
        (currentPosition) => {
          sendLocationUpdate(currentPosition.coords);
        }
      );
      if (locationStreamGenerationRef.current !== generation || locationStreamModeRef.current !== mode) {
        subscription.remove();
        return;
      }
      previousSubscription?.remove();
      locationSubscriptionRef.current = subscription;
      locationStreamRetryCountRef.current = 0;
    } catch (err) {
      if (locationStreamGenerationRef.current !== generation || locationStreamModeRef.current !== mode) return;
      locationSubscriptionRef.current = previousSubscription;
      locationStreamModeRef.current = previousSubscription ? previousMode : null;
      const retryDelay = Math.min(60_000, 5_000 * (2 ** Math.min(locationStreamRetryCountRef.current, 4)));
      locationStreamRetryCountRef.current += 1;
      locationStreamRetryRef.current = setTimeout(() => {
        locationStreamRetryRef.current = null;
        void startLocationStream(activeTrip, true);
      }, retryDelay);
      if (!retry) {
        showToast(err instanceof Error ? err.message : copyFor(language, 'waitingGpsLocation'));
      }
    }
  }

  function stopLocationStream() {
    locationStreamGenerationRef.current += 1;
    if (locationStreamRetryRef.current) {
      clearTimeout(locationStreamRetryRef.current);
      locationStreamRetryRef.current = null;
    }
    locationStreamRetryCountRef.current = 0;
    locationSubscriptionRef.current?.remove();
    locationSubscriptionRef.current = null;
    locationStreamModeRef.current = null;
    const pendingLocation = pendingLocationRef.current;
    pendingLocationRef.current = null;
    pendingLocation?.waiters.forEach((waiter) => waiter.reject(new Error('Location tracking stopped')));
  }

  async function syncLocation() {
    const current = await readDeviceLocation(language);
    await sendLocationUpdate(current.coords, { throwOnError: true });
  }

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(''), 2600);
  }

  function openEmergencyNumber(phoneNumber: string) {
    setPanicOpen(false);
    Linking.openURL(`tel:${phoneNumber}`).catch(() => showToast(copyFor(language, 'unableToOpenDialer')));
  }

  function openPanicOptions() {
    setPanicOpen(true);
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
    const permission = await requestPartnerCameraPermission(language);
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
    const result = await api.uploadKyc(doc, { photoUrl });
    setData((current) => current ? { ...current, user: result.user } : current);
    showToast(copyFor(language, 'kycPhotoCaptured'));
  }

  async function submitKycBankDetails(bankDetails: BankDetailsInput) {
    const result = await api.uploadKyc('bank', { bankDetails });
    setData((current) => current ? { ...current, user: result.user } : current);
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
    setData(null);
    setTab('dashboard');
    setSelectedActiveOrderId(undefined);
    setProfileDetailOpen(false);
    setNotificationIntent(null);
    try {
      if (data?.user.partnerProfile?.online) {
        await api.setAvailability(false).catch(() => undefined);
      }
      stopLocationStream();
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      socketRef.current?.disconnect();
      socketRef.current = null;
      if (pushTokenRef.current) {
        await api.unregisterPartnerPushToken(pushTokenRef.current).catch(() => undefined);
        pushTokenRef.current = undefined;
      }
      api.setToken('');
      await auth().signOut();
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
        <SafeAreaView edges={appSafeAreaEdges} style={styles.center}>
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
      <SafeAreaView edges={appSafeAreaEdges} style={styles.shell}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.white} translucent={false} />
        <View style={[styles.appHeader, responsive.isCompact && styles.appHeaderCompact, responsive.isSmall && styles.appHeaderSmall]}>
          <View style={[
            styles.appHeaderInner,
            responsive.isCompact && styles.appHeaderInnerCompact,
            { maxWidth: responsive.contentMaxWidth }
          ]}>
            <View style={styles.appHeaderCopy}>
              <Text style={[styles.eyebrow, responsive.isCompact && styles.eyebrowCompact, responsive.isSmall && styles.eyebrowSmall]}>{copyFor(language, 'appEyebrow')}</Text>
              <Text
                style={[
                  styles.headerTitle,
                  responsive.isCompact && styles.headerTitleCompact,
                  responsive.isSmall && styles.headerTitleSmall
                ]}
                numberOfLines={2}
              >
                {copyFor(language, 'partnerSetup')}
              </Text>
            </View>
            <View style={[styles.headerActions, responsive.isCompact && styles.headerActionsCompact]}>
              <Pressable style={[styles.panicButton, responsive.isCompact && styles.panicButtonCompact, responsive.isSmall && styles.panicButtonSmall]} onPress={openPanicOptions}>
                <Ionicons name="alert-circle" size={responsive.isSmall ? 14 : responsive.isCompact ? 16 : 18} color={colors.white} />
                <Text style={[styles.panicButtonText, responsive.isCompact && styles.panicButtonTextCompact, responsive.isSmall && styles.panicButtonTextSmall]}>{copyFor(language, 'panic')}</Text>
              </Pressable>
              <View style={[styles.avatar, responsive.isCompact && styles.avatarCompact, responsive.isSmall && styles.avatarSmall]}>
                <Text style={[styles.avatarText, responsive.isCompact && styles.avatarTextCompact, responsive.isSmall && styles.avatarTextSmall]}>{data.user.initials}</Text>
              </View>
            </View>
          </View>
        </View>
        <View style={[styles.content, { maxWidth: responsive.contentMaxWidth }]}>
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
        <PanicSheet
          visible={panicOpen}
          onClose={() => setPanicOpen(false)}
          onCall={openEmergencyNumber}
        />
        {toast ? <View style={styles.toast}><Text style={styles.toastText}>{toast}</Text></View> : null}
      </SafeAreaView>
      </LanguageContext.Provider>
    );
  }

  const activeOrder = data.activeOrders.find((order) => order.id === selectedActiveOrderId) ?? data.activeOrders[0];

  return (
    <LanguageContext.Provider value={language}>
    <SafeAreaView edges={profileDetailOpen ? appSafeAreaEdges : tabScreenSafeAreaEdges} style={styles.shell}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} translucent={false} />
      {tab !== 'profile' ? (
        <View style={[styles.appHeader, responsive.isCompact && styles.appHeaderCompact, responsive.isSmall && styles.appHeaderSmall]}>
          <View style={[
            styles.appHeaderInner,
            responsive.isCompact && styles.appHeaderInnerCompact,
            { maxWidth: responsive.contentMaxWidth }
          ]}>
            <View style={styles.appHeaderCopy}>
              <Text style={[styles.eyebrow, responsive.isCompact && styles.eyebrowCompact, responsive.isSmall && styles.eyebrowSmall]}>{copyFor(language, 'appEyebrow')}</Text>
              <Text
                style={[
                  styles.headerTitle,
                  responsive.isCompact && styles.headerTitleCompact,
                  responsive.isSmall && styles.headerTitleSmall
                ]}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {data.user.name}
              </Text>
            </View>
            <View style={[styles.headerActions, responsive.isCompact && styles.headerActionsCompact]}>
              <Pressable style={[styles.panicButton, responsive.isCompact && styles.panicButtonCompact, responsive.isSmall && styles.panicButtonSmall]} onPress={openPanicOptions}>
                <Ionicons name="alert-circle" size={responsive.isSmall ? 14 : responsive.isCompact ? 16 : 18} color={colors.white} />
                <Text style={[styles.panicButtonText, responsive.isCompact && styles.panicButtonTextCompact, responsive.isSmall && styles.panicButtonTextSmall]}>{copyFor(language, 'panic')}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={copyFor(language, 'profile')}
                style={[styles.avatar, responsive.isCompact && styles.avatarCompact, responsive.isSmall && styles.avatarSmall]}
                onPress={() => setTab('profile')}
              >
                <Text style={[styles.avatarText, responsive.isCompact && styles.avatarTextCompact, responsive.isSmall && styles.avatarTextSmall]}>{data.user.initials}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}

      <View style={[
        styles.content,
        tab !== 'profile' && styles.partnerPageContent,
        tab === 'profile' && styles.accountContent,
        { maxWidth: responsive.contentMaxWidth }
      ]}>
        {tab !== 'profile' ? <View pointerEvents="none" style={styles.partnerPageCurveSurface} /> : null}
        {tab === 'dashboard' && (
          <DashboardScreen
            data={data}
            busy={busy}
            onToggle={() =>
              withBusy(async () => {
                const online = !data.user.partnerProfile?.online;
                if (online) await syncLocation();
                const result = await api.setAvailability(online);
                setData((current) => current ? { ...current, user: result.user } : current);
                showToast(online ? copyFor(language, 'youAreOnline') : copyFor(language, 'youAreOffline'));
                scheduleRefresh(50);
              })
            }
            onActive={() => setTab('active')}
            onTopup={(amount) => topUpPartnerWallet(amount)}
            onRefreshStatus={refreshVerificationStatus}
            onAccept={(orderId) =>
              withBusy(async () => {
                await syncLocation();
                if (!data.user.partnerProfile?.online) {
                  await api.setAvailability(true);
                }
                const accepted = await api.acceptOrder(orderId);
                setSelectedActiveOrderId(accepted.order.id);
                mergeRealtimeOrder(accepted.order);
                scheduleRefresh(50);
                setTab('active');
                showToast(copyFor(language, 'orderAccepted'));
              })
            }
            onReject={(orderId) =>
              withBusy(async () => {
                await api.rejectOrder(orderId);
                setData((current) => current ? {
                  ...current,
                  stats: {
                    ...current.stats,
                    availableCount: Math.max(0, current.stats.availableCount - 1)
                  },
                  availableOrders: current.availableOrders.filter((order) => order.id !== orderId)
                } : current);
                scheduleRefresh(50);
                showToast(copyFor(language, 'orderSkipped'));
              })
            }
          />
        )}
        {tab === 'active' && (
          <ActiveScreen
            api={api}
            orders={data.activeOrders}
            completedOrders={data.completedOrders}
            selectedOrderId={activeOrder?.id}
            cancellationsRemaining={data.stats.cancellationsRemaining}
            busy={busy}
            refreshing={refreshing}
            refresh={() => void refresh(true)}
            onSelectOrder={setSelectedActiveOrderId}
            onOtp={(orderId, type, otp) =>
              withBusy(async () => {
                const result = await api.verifyOrderOtp(orderId, type, otp);
                mergeRealtimeOrder(result.order);
                showToast(`${type === 'pickup' ? copyFor(language, 'pickup') : copyFor(language, 'drop')} ${copyFor(language, 'otpVerified')}`);
              })
            }
            onPod={(orderId, type) =>
              withBusy(async () => {
                const photoUrl = await captureAndUploadImage({ purpose: 'pod', orderId, documentKey: type });
                const result = await api.uploadPod(orderId, type, photoUrl);
                mergeRealtimeOrder(result.order);
                showToast(`${type === 'pickup' ? copyFor(language, 'pickup') : copyFor(language, 'drop')} ${copyFor(language, 'podCaptured')}`);
              })
            }
            onStatus={(orderId, status) =>
              withBusy(async () => {
                const result = await api.updateOrderStatus(orderId, status);
                mergeRealtimeOrder(result.order);
                if (status === 'delivered') scheduleRefresh(50);
                showToast(`${copyFor(language, 'orderUpdated')}: ${orderStatusLabel(language, status)}`);
              })
            }
            onCancel={(order) => {
              Alert.alert(
                copyFor(language, 'cancelDeliveryTitle'),
                fillCopy(copyFor(language, 'cancelDeliveryBody'), {
                  remaining: data.stats.cancellationsRemaining
                }),
                [
                  { text: copyFor(language, 'cancel'), style: 'cancel' },
                  {
                    text: copyFor(language, 'cancelDelivery'),
                    style: 'destructive',
                    onPress: () =>
                      withBusy(async () => {
                        const result = await api.cancelPartnerOrder(order.id, 'Cancelled by driver');
                        setData((current) => current ? {
                          ...current,
                          stats: {
                            ...current.stats,
                            activeCount: Math.max(0, current.stats.activeCount - 1),
                            cancellationsToday: current.stats.cancellationsToday + 1,
                            cancellationsRemaining: result.cancellationsRemaining
                          },
                          activeOrders: current.activeOrders.filter((item) => item.id !== order.id)
                        } : current);
                        scheduleRefresh(50);
                        showToast(
                          `${copyFor(language, 'driverCancellationSubmitted')} ${fillCopy(
                            copyFor(language, 'cancellationsRemaining'),
                            { remaining: result.cancellationsRemaining }
                          )}`
                        );
                      })
                  }
                ]
              );
            }}
          />
        )}
        {tab === 'earnings' && (
          <EarningsScreen
            data={data}
            busy={busy}
            onPayout={() =>
              withBusy(async () => {
                const balance = data.user.partnerProfile?.walletBalance ?? 0;
                const result = await api.requestPayout(balance);
                setData((current) => current ? { ...current, user: result.user } : current);
                scheduleRefresh(50);
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
      <PanicSheet
        visible={panicOpen}
        onClose={() => setPanicOpen(false)}
        onCall={openEmergencyNumber}
      />
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
  const loginViewport = useWindowDimensions();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [confirmation, setConfirmation] = useState<FirebaseAuthTypes.ConfirmationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [loginPolicy, setLoginPolicy] = useState<LegalPolicy | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const loginScrollRef = useRef<ScrollView | null>(null);
  const fullLoginViewportRef = useRef({
    width: loginViewport.width,
    height: loginViewport.height
  });
  if (Math.abs(fullLoginViewportRef.current.width - loginViewport.width) > 1) {
    fullLoginViewportRef.current = {
      width: loginViewport.width,
      height: loginViewport.height
    };
  } else if (!keyboardVisible && loginViewport.height > fullLoginViewportRef.current.height) {
    fullLoginViewportRef.current.height = loginViewport.height;
  }
  const loginViewportKeyboardShrink = Math.max(
    0,
    fullLoginViewportRef.current.height - loginViewport.height
  );
  const keyboardLayoutVisible =
    keyboardVisible || fullLoginViewportRef.current.height - loginViewport.height > 120;
  const androidKeyboardPadding =
    Platform.OS === 'android' && keyboardLayoutVisible
      ? Math.max(0, keyboardHeight - loginViewportKeyboardShrink)
      : 0;
  const normalizedPhone = phone.replace(/\D/g, '').slice(-10);
  const phoneReady = normalizedPhone.length === 10;
  const otpReady = code.trim().length === 6;

  useEffect(() => {
    setError(initialError);
  }, [initialError]);

  useEffect(() => {
    if (!confirmation || resendSeconds <= 0) return undefined;
    const timer = setTimeout(() => {
      setResendSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => clearTimeout(timer);
  }, [confirmation, resendSeconds]);

  useEffect(() => {
    if (!confirmation) return undefined;
    const timer = setTimeout(() => loginScrollRef.current?.scrollTo({ y: 0, animated: false }), 100);
    return () => clearTimeout(timer);
  }, [confirmation]);

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

  function changePhoneNumber() {
    Keyboard.dismiss();
    setConfirmation(null);
    setCode('');
    setError('');
    setResendSeconds(0);
  }

  useAndroidBackHandler(() => {
    if (loginPolicy) {
      setLoginPolicy(null);
      return true;
    }
    if (!confirmation) return false;
    changePhoneNumber();
    return true;
  }, [confirmation, loginPolicy]);

  function openLoginPolicy(policyId: LegalPolicy['id']) {
    setLoginPolicy(partnerLegalPolicies.find((policy) => policy.id === policyId) ?? null);
  }

  async function sendOtp() {
    if (!phoneReady || busy) return;
    setBusy(true);
    setError('');
    try {
      const result = await auth().signInWithPhoneNumber(formatPhoneForFirebase(normalizedPhone, language));
      setConfirmation(result);
      setCode('');
      setResendSeconds(30);
      Keyboard.dismiss();
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.unableToSendOtp);
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp() {
    if (!confirmation || !otpReady || busy) return;
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

  if (confirmation) {
    return (
      <>
      <SafeAreaView edges={appSafeAreaEdges} style={styles.loginShell}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.white} translucent={false} />
        <KeyboardAvoidingView
          style={[
            styles.authKeyboard,
            androidKeyboardPadding > 0 && { paddingBottom: androidKeyboardPadding }
          ]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <PartnerLoginOtpStep
            code={code}
            phone={normalizedPhone}
            error={error}
            busy={busy}
            otpReady={otpReady}
            resendSeconds={resendSeconds}
            keyboardVisible={keyboardLayoutVisible}
            scrollRef={loginScrollRef}
            onChangeCode={setCode}
            onBack={changePhoneNumber}
            onVerify={verifyOtp}
            onResend={sendOtp}
            onKeyboardFocus={() => setKeyboardVisible(true)}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
      <LoginPolicyModal policy={loginPolicy} onClose={() => setLoginPolicy(null)} />
      </>
    );
  }

  return (
    <>
    <SafeAreaView edges={appSafeAreaEdges} style={styles.loginShell}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} translucent={false} />
      <KeyboardAvoidingView
        style={[
          styles.authKeyboard,
          androidKeyboardPadding > 0 && { paddingBottom: androidKeyboardPadding }
          ]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <PartnerLoginPhoneStep
            phone={phone}
            error={error}
            busy={busy}
            phoneReady={phoneReady}
            language={language}
            keyboardVisible={keyboardLayoutVisible}
            compactKeyboardLayout={
              keyboardLayoutVisible && fullLoginViewportRef.current.height < 750
            }
            scrollRef={loginScrollRef}
            onChangePhone={setPhone}
            onChangeLanguage={onChangeLanguage}
            onContinue={sendOtp}
            onOpenPolicy={openLoginPolicy}
            onKeyboardFocus={() => setKeyboardVisible(true)}
          />
      </KeyboardAvoidingView>
    </SafeAreaView>
    <LoginPolicyModal policy={loginPolicy} onClose={() => setLoginPolicy(null)} />
    </>
  );
}

function LoginPolicyModal({
  policy,
  onClose
}: {
  policy: LegalPolicy | null;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={Boolean(policy)}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView edges={appSafeAreaEdges} style={styles.loginPolicyShell}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.white} translucent={false} />
        {policy ? <LoginPolicyDetail policy={policy} onBack={onClose} /> : null}
      </SafeAreaView>
    </Modal>
  );
}

function LoginPolicyDetail({ policy, onBack }: { policy: LegalPolicy; onBack: () => void }) {
  const copy = useCopy();
  const responsive = useResponsiveLayout();
  return (
    <ScrollView
      contentContainerStyle={[styles.scroll, responsive.isCompact && styles.scrollCompact]}
      showsVerticalScrollIndicator={false}
    >
      <AccountDetailHeader title={policy.title} subtitle={`${copy.updated} ${policy.updatedAt}`} onBack={onBack} />
      <View style={[styles.policyDetailHero, responsive.isCompact && styles.policyDetailHeroCompact]}>
        <Ionicons
          name={policy.id === 'privacy' ? 'lock-closed' : policy.id === 'terms' ? 'document-text' : 'cash'}
          size={responsive.isCompact ? 21 : 24}
          color={colors.partner}
        />
        <Text style={[styles.policyDetailSummary, responsive.isCompact && styles.policyDetailSummaryCompact]}>
          {policy.summary}
        </Text>
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

function PartnerLoginPhoneStep({
  phone,
  error,
  busy,
  phoneReady,
  language,
  keyboardVisible,
  compactKeyboardLayout,
  scrollRef,
  onChangePhone,
  onChangeLanguage,
  onContinue,
  onOpenPolicy,
  onKeyboardFocus
}: {
  phone: string;
  error: string;
  busy: boolean;
  phoneReady: boolean;
  language: AppLanguage;
  keyboardVisible: boolean;
  compactKeyboardLayout: boolean;
  scrollRef: React.RefObject<ScrollView | null>;
  onChangePhone: (value: string) => void;
  onChangeLanguage: (language: AppLanguage) => void;
  onContinue: () => void;
  onOpenPolicy: (policyId: LegalPolicy['id']) => void;
  onKeyboardFocus: () => void;
}) {
  const copy = useCopy();
  const responsive = useResponsiveLayout();
  const maxWidth = Math.min(640, responsive.width);
  const heroWidth = Math.min(responsive.width, maxWidth);
  const heroHeight = Math.round(heroWidth * 0.75);
  const heroVisibleHeight = keyboardVisible
    ? Math.round(heroHeight * (compactKeyboardLayout ? 0.86 : 0.9))
    : heroHeight;
  const consent = (
    <View style={[styles.loginConsent, keyboardVisible && styles.loginPhoneKeyboardConsent]}>
      <Text style={styles.loginConsentText}>{copy.byContinuingAgree}</Text>
      <Pressable accessibilityRole="link" hitSlop={5} onPress={() => onOpenPolicy('terms')}>
        <Text style={styles.loginConsentLink}>{copy.termsAndConditions}</Text>
      </Pressable>
      <Text style={styles.loginConsentText}>{copy.and}</Text>
      <Pressable accessibilityRole="link" hitSlop={5} onPress={() => onOpenPolicy('privacy')}>
        <Text style={styles.loginConsentLink}>{copy.privacyPolicy}</Text>
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
            title={copy.appName}
            caption={copy.loginHeroCaption}
            height={heroHeight}
            visibleHeight={heroVisibleHeight}
          />
          <View
            style={[
              styles.loginPhoneFormContent,
              responsive.isCompact && styles.loginPhoneFormContentCompact,
              responsive.isSmall && styles.loginPhoneFormContentSmall,
              keyboardVisible && styles.loginPhoneFormContentKeyboard
            ]}
          >
            {!keyboardVisible ? (
              <View style={[styles.loginPhoneHeadingRow, responsive.isCompact && styles.loginPhoneHeadingRowCompact]}>
                <View style={styles.loginPhoneHeadingCopy}>
                  <Text
                    style={[
                      styles.authKicker,
                      styles.loginPhoneKicker,
                      responsive.isCompact && styles.authKickerCompact,
                      responsive.isSmall && styles.authKickerSmall
                    ]}
                  >
                    FAST · SECURE · RELIABLE
                  </Text>
                  <Text
                    style={[
                      styles.authTitle,
                      styles.loginPhoneTitle,
                      responsive.isCompact && styles.authTitleCompact,
                      responsive.isSmall && styles.authTitleSmall
                    ]}
                  >
                    {copy.welcomeBack}
                  </Text>
                </View>
                <LoginLanguageToggle
                  language={language}
                  onChangeLanguage={onChangeLanguage}
                />
              </View>
            ) : !compactKeyboardLayout ? (
              <Text
                style={[
                  styles.authTitle,
                  styles.loginPhoneTitle,
                  styles.loginPhoneKeyboardTitle,
                  responsive.isCompact && styles.loginPhoneKeyboardTitleCompact,
                  responsive.isSmall && styles.loginPhoneKeyboardTitleSmall
                ]}
              >
                {copy.welcomeBack}
              </Text>
            ) : null}
            {!keyboardVisible ? (
              <Text
                style={[
                  styles.loginSubtitle,
                  responsive.isCompact && styles.loginSubtitleCompact,
                  responsive.isSmall && styles.loginSubtitleSmall
                ]}
              >
                {copy.loginSubtitle}
              </Text>
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
                  title={busy ? copy.sending : copy.continue}
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
            responsive.isCompact && styles.loginPhoneKeyboardFooterCompact,
            responsive.isSmall && styles.loginPhoneKeyboardFooterSmall,
            Platform.OS === 'android' && styles.androidKeyboardFooter
          ]}
        >
          <View style={[styles.loginPhoneKeyboardFooterInner, { maxWidth }]}>
            <AuthActionButton
              title={busy ? copy.sending : copy.continue}
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

function PartnerLoginOtpStep({
  code,
  phone,
  error,
  busy,
  otpReady,
  resendSeconds,
  keyboardVisible,
  scrollRef,
  onChangeCode,
  onBack,
  onVerify,
  onResend,
  onKeyboardFocus
}: {
  code: string;
  phone: string;
  error: string;
  busy: boolean;
  otpReady: boolean;
  resendSeconds: number;
  keyboardVisible: boolean;
  scrollRef: React.RefObject<ScrollView | null>;
  onChangeCode: (value: string) => void;
  onBack: () => void;
  onVerify: () => void;
  onResend: () => void;
  onKeyboardFocus: () => void;
}) {
  const copy = useCopy();
  const responsive = useResponsiveLayout();
  const maxWidth = Math.min(640, responsive.width);

  return (
    <View style={styles.partnerOtpLayout}>
      <ScrollView
        ref={scrollRef}
        style={styles.authScrollViewport}
        contentContainerStyle={[
          styles.authScroll,
          styles.partnerOtpScroll,
          keyboardVisible && styles.partnerOtpKeyboardScroll
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.authResponsiveFrame, { maxWidth }]}>
          <View
            style={[
              styles.authForm,
              styles.partnerOtpForm,
              responsive.isCompact && styles.partnerOtpFormCompact,
              responsive.isSmall && styles.partnerOtpFormSmall
            ]}
          >
            <Pressable
              style={[
                styles.partnerOtpBackButton,
                responsive.isCompact && styles.partnerOtpBackButtonCompact,
                responsive.isSmall && styles.partnerOtpBackButtonSmall
              ]}
              onPress={onBack}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={copy.changeNumber}
            >
              <Ionicons name="arrow-back" size={responsive.isCompact ? 18 : 21} color={colors.ink} />
            </Pressable>

            <View
              style={[
                styles.partnerOtpIcon,
                responsive.isCompact && styles.partnerOtpIconCompact,
                responsive.isSmall && styles.partnerOtpIconSmall
              ]}
            >
              <Ionicons name="shield-checkmark" size={responsive.isCompact ? 20 : 24} color={colors.partner} />
            </View>
            <Text
              style={[
                styles.partnerOtpTitle,
                responsive.isCompact && styles.partnerOtpTitleCompact,
                responsive.isSmall && styles.partnerOtpTitleSmall
              ]}
            >
              {copy.otpVerification}
            </Text>
            <Text
              style={[
                styles.partnerOtpSubtitle,
                responsive.isCompact && styles.partnerOtpSubtitleCompact,
                responsive.isSmall && styles.partnerOtpSubtitleSmall
              ]}
            >
              {copy.otpDestination}
            </Text>
            <View
              style={[
                styles.partnerOtpDestinationRow,
                responsive.isCompact && styles.partnerOtpDestinationRowCompact,
                responsive.isSmall && styles.partnerOtpDestinationRowSmall
              ]}
            >
              <Text style={[styles.partnerOtpPhone, responsive.isCompact && styles.partnerOtpPhoneCompact]}>
                +91 {phone}
              </Text>
              <Pressable onPress={onBack} hitSlop={7} accessibilityRole="button">
                <Text style={[styles.partnerOtpChange, responsive.isCompact && styles.partnerOtpChangeCompact]}>
                  {copy.change}
                </Text>
              </Pressable>
            </View>

            <PartnerOtpCodeField
              value={code}
              onChangeText={onChangeCode}
              onSubmit={otpReady && !busy ? onVerify : undefined}
              onFocus={onKeyboardFocus}
            />
            <View style={[styles.partnerOtpHintRow, responsive.isCompact && styles.partnerOtpHintRowCompact]}>
              <Ionicons name="lock-closed-outline" size={responsive.isCompact ? 11 : 13} color={colors.muted} />
              <Text style={[styles.partnerOtpHint, responsive.isCompact && styles.partnerOtpHintCompact]}>
                {copy.otpSent}
              </Text>
            </View>
            {error ? <Text style={styles.loginError}>{error}</Text> : null}
            {!keyboardVisible ? (
              <AuthActionButton
                title={busy ? copy.verifying : copy.verifyAndContinue}
                onPress={onVerify}
                disabled={!otpReady || busy}
              />
            ) : null}

            <View style={[styles.partnerOtpResendBlock, responsive.isCompact && styles.partnerOtpResendBlockCompact]}>
              <Text style={[styles.partnerOtpResendLabel, responsive.isCompact && styles.partnerOtpResendLabelCompact]}>
                {resendSeconds > 0
                  ? `${copy.resendIn} ${resendSeconds}s`
                  : copy.didNotReceiveCode}
              </Text>
              <Pressable
                style={[
                  styles.partnerOtpResendButton,
                  responsive.isCompact && styles.partnerOtpResendButtonCompact,
                  (resendSeconds > 0 || busy) && styles.partnerOtpResendButtonDisabled
                ]}
                onPress={onResend}
                disabled={resendSeconds > 0 || busy}
                accessibilityRole="button"
              >
                <Ionicons
                  name="refresh-outline"
                  size={responsive.isCompact ? 13 : 15}
                  color={resendSeconds > 0 || busy ? colors.muted : colors.partner}
                />
                <Text
                  style={[
                    styles.partnerOtpResendText,
                    responsive.isCompact && styles.partnerOtpResendTextCompact,
                    (resendSeconds > 0 || busy) && styles.partnerOtpResendTextDisabled
                  ]}
                >
                  {copy.resendOtp}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>

      {keyboardVisible ? (
        <View
          style={[
            styles.partnerOtpKeyboardFooter,
            responsive.isCompact && styles.partnerOtpKeyboardFooterCompact,
            responsive.isSmall && styles.partnerOtpKeyboardFooterSmall,
            Platform.OS === 'android' && styles.androidKeyboardFooter
          ]}
        >
          <View style={[styles.loginPhoneKeyboardFooterInner, { maxWidth }]}>
            <AuthActionButton
              title={busy ? copy.verifying : copy.verifyAndContinue}
              onPress={onVerify}
              disabled={!otpReady || busy}
            />
          </View>
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
    <View
      style={[
        styles.loginHero,
        { height: visibleHeight, minHeight: visibleHeight, maxHeight: visibleHeight }
      ]}
    >
      <Image
        source={partnerLoginBackgroundImage}
        style={[styles.loginHeroImage, { height }]}
        resizeMode="contain"
      />
      <View style={styles.loginHeroWash} />
      <View style={styles.loginBrandPanel}>
        <Image source={indieryLogoImage} style={styles.loginBrandLogo} resizeMode="contain" accessibilityLabel={title} />
        <Text style={styles.loginHeroCaption}>{caption}</Text>
      </View>
    </View>
  );
}

function LoginLanguageToggle({
  language,
  onChangeLanguage
}: {
  language: AppLanguage;
  onChangeLanguage: (language: AppLanguage) => void;
}) {
  const copy = useCopy();
  const nextLanguage: AppLanguage = language === 'en' ? 'hi' : 'en';
  return (
    <Pressable
      style={styles.loginLanguageToggle}
      onPress={() => onChangeLanguage(nextLanguage)}
      accessibilityRole="button"
      accessibilityLabel={copy.changeLanguage}
    >
      <Ionicons name="language-outline" size={15} color={colors.partner} />
      <Text style={styles.loginLanguageToggleText}>
        {language === 'hi' ? copy.hindiNative : copy.english}
      </Text>
      <Ionicons name="chevron-down" size={13} color={colors.partner} />
    </Pressable>
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
  const copy = useCopy();
  const responsive = useResponsiveLayout();
  return (
    <View
      style={[
        styles.authFieldGroup,
        responsive.isCompact && styles.authFieldGroupCompact,
        compact && styles.phoneFieldGroupCompact
      ]}
    >
      <Text style={[styles.fieldLabel, responsive.isCompact && styles.fieldLabelCompact, responsive.isSmall && styles.fieldLabelSmall]}>{copy.mobileNumber}</Text>
      <View
        style={[
          styles.phoneInputShell,
          (compact || responsive.isCompact) && styles.phoneInputShellCompact,
          responsive.isSmall && styles.phoneInputShellSmall
        ]}
      >
        <Ionicons name="phone-portrait-outline" size={responsive.isCompact ? 16 : 18} color={colors.partner} />
        <Text style={[styles.countryCode, responsive.isCompact && styles.countryCodeCompact]}>+91</Text>
        <Ionicons name="chevron-down" size={14} color={colors.muted} />
        <View style={styles.phoneDivider} />
        <TextInput
          value={value}
          onChangeText={(nextValue) => onChangeText(nextValue.replace(/\D/g, '').slice(0, 10))}
          keyboardType="phone-pad"
          maxLength={10}
          placeholder={copy.enterMobileNumber}
          placeholderTextColor="#9CA3AF"
          style={[styles.phoneInputText, responsive.isCompact && styles.phoneInputTextCompact]}
          onFocus={onFocus}
        />
      </View>
    </View>
  );
}

function PartnerOtpCodeField({
  value,
  onChangeText,
  onSubmit,
  onFocus
}: {
  value: string;
  onChangeText: (value: string) => void;
  onSubmit?: () => void;
  onFocus?: () => void;
}) {
  const inputRef = useRef<React.ElementRef<typeof TextInput> | null>(null);
  const responsive = useResponsiveLayout();
  const digits = value.replace(/\D/g, '').slice(0, 6);

  return (
    <Pressable
      style={styles.partnerOtpField}
      onPress={() => inputRef.current?.focus()}
      accessibilityRole="button"
      accessibilityLabel="Enter 6-digit OTP"
    >
      <View
        style={[
          styles.partnerOtpBoxes,
          responsive.isCompact && styles.partnerOtpBoxesCompact,
          responsive.isSmall && styles.partnerOtpBoxesSmall
        ]}
        pointerEvents="none"
      >
        {Array.from({ length: 6 }).map((_, index) => {
          const digit = digits[index] ?? '';
          const active = index === Math.min(digits.length, 5);
          return (
            <View
              key={index}
              style={[
                styles.partnerOtpBox,
                responsive.isCompact && styles.partnerOtpBoxCompact,
                responsive.isSmall && styles.partnerOtpBoxSmall,
                digit && styles.partnerOtpBoxFilled,
                active && styles.partnerOtpBoxActive
              ]}
            >
              <Text
                style={[
                  styles.partnerOtpDigit,
                  responsive.isCompact && styles.partnerOtpDigitCompact,
                  responsive.isSmall && styles.partnerOtpDigitSmall
                ]}
              >
                {digit}
              </Text>
            </View>
          );
        })}
      </View>
      <TextInput
        ref={inputRef}
        value={digits}
        onChangeText={(nextValue) => onChangeText(nextValue.replace(/\D/g, '').slice(0, 6))}
        onSubmitEditing={onSubmit}
        onFocus={onFocus}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={6}
        autoFocus
        caretHidden
        allowFontScaling={false}
        style={styles.partnerOtpHiddenInput}
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
  const responsive = useResponsiveLayout();
  return (
    <Pressable
      style={[
        styles.authPrimaryButton,
        responsive.isCompact && styles.authPrimaryButtonCompact,
        responsive.isSmall && styles.authPrimaryButtonSmall,
        disabled && styles.authPrimaryButtonDisabled
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text
        style={[
          styles.authPrimaryButtonText,
          responsive.isCompact && styles.authPrimaryButtonTextCompact,
          responsive.isSmall && styles.authPrimaryButtonTextSmall,
          disabled && styles.authPrimaryButtonTextDisabled
        ]}
      >
        {title}
      </Text>
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
  const responsive = useResponsiveLayout();
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
  const onboardingViewport = useWindowDimensions();
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const onboardingScrollRef = useRef<ScrollView | null>(null);
  const onboardingFocusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fullOnboardingViewportRef = useRef({
    width: onboardingViewport.width,
    height: onboardingViewport.height
  });
  if (Math.abs(fullOnboardingViewportRef.current.width - onboardingViewport.width) > 1) {
    fullOnboardingViewportRef.current = {
      width: onboardingViewport.width,
      height: onboardingViewport.height
    };
  } else if (!keyboardVisible && onboardingViewport.height > fullOnboardingViewportRef.current.height) {
    fullOnboardingViewportRef.current.height = onboardingViewport.height;
  }
  const onboardingViewportShrink = Math.max(
    0,
    fullOnboardingViewportRef.current.height - onboardingViewport.height
  );
  const keyboardLayoutVisible =
    keyboardVisible || fullOnboardingViewportRef.current.height - onboardingViewport.height > 120;
  const compactOnboardingKeyboard =
    keyboardLayoutVisible && fullOnboardingViewportRef.current.height < 750;
  const androidKeyboardPadding =
    Platform.OS === 'android' && keyboardLayoutVisible
      ? Math.max(0, keyboardHeight - onboardingViewportShrink)
      : 0;

  const onboardingSteps: { id: OnboardingStepId; label: string; done: boolean }[] = [
    { id: 1, label: copy.personal, done: personalDetailsDone },
    { id: 2, label: copy.uploads, done: documentsDone },
    { id: 3, label: copy.vehicle, done: vehicleDetailsDone }
  ];
  const stepProgress = onboardingSteps.filter((step) => step.done).length;

  function goToStep(step: OnboardingStepId) {
    Keyboard.dismiss();
    setLocalError('');
    setActiveStep(step);
  }

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
      if (onboardingFocusTimerRef.current) clearTimeout(onboardingFocusTimerRef.current);
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  function revealOnboardingField(y: number) {
    setKeyboardVisible(true);
    if (onboardingFocusTimerRef.current) clearTimeout(onboardingFocusTimerRef.current);
    onboardingFocusTimerRef.current = setTimeout(() => {
      onboardingScrollRef.current?.scrollTo({ y, animated: true });
      onboardingFocusTimerRef.current = null;
    }, Platform.OS === 'ios' ? 260 : 180);
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
    <KeyboardAvoidingView
      style={[
        styles.authKeyboard,
        androidKeyboardPadding > 0 && { paddingBottom: androidKeyboardPadding }
      ]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View
        style={[
          styles.onboardingFixedSection,
          compactOnboardingKeyboard && styles.onboardingFixedSectionCompact
        ]}
      >
        {!compactOnboardingKeyboard ? (
          <View style={styles.kycHero}>
            <View style={styles.kycHeroIcon}>
              <Ionicons name="shield-checkmark" size={26} color={colors.white} />
            </View>
            <View style={styles.flex}>
              <Text style={[styles.kycHeroTitle, responsive.isCompact && styles.kycHeroTitleCompact, responsive.isSmall && styles.kycHeroTitleSmall]}>{copy.completePartnerSetup}</Text>
              <Text style={[styles.kycHeroText, responsive.isCompact && styles.kycHeroTextCompact, responsive.isSmall && styles.kycHeroTextSmall]}>{copy.completePartnerSetupText}</Text>
            </View>
          </View>
        ) : null}

        <View
          style={[
            styles.onboardingStepperCard,
            styles.onboardingFixedStepperCard,
            compactOnboardingKeyboard && styles.onboardingFixedStepperCardCompact
          ]}
        >
          <View style={styles.between}>
            <Text style={[styles.cardTitle, responsive.isCompact && styles.cardTitleCompact, responsive.isSmall && styles.cardTitleSmall]}>{copy.setupProgress}</Text>
            <Text style={[styles.priceText, responsive.isCompact && styles.priceTextCompact, responsive.isSmall && styles.priceTextSmall]}>{stepProgress}/3</Text>
          </View>
          <OnboardingStepper steps={onboardingSteps} activeStep={activeStep} onSelect={goToStep} />
        </View>
      </View>

      <ScrollView
        ref={onboardingScrollRef}
        style={styles.authScrollViewport}
        contentContainerStyle={[
          styles.scroll,
          (activeStep === 1 || activeStep === 3) &&
            keyboardLayoutVisible &&
            styles.onboardingPersonalKeyboardScroll
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        showsVerticalScrollIndicator={false}
      >
        {activeStep === 1 ? (
          <View style={styles.onboardingStepCard}>
            <View style={styles.onboardingStepHeader}>
              <View style={[styles.kycStepIcon, personalDetailsDone && styles.kycStepIconDone]}>
                <Ionicons name={personalDetailsDone ? 'checkmark' : 'person'} size={20} color={personalDetailsDone ? colors.white : colors.partner} />
              </View>
              <View style={styles.flex}>
                <Text style={[styles.cardTitle, responsive.isCompact && styles.cardTitleCompact, responsive.isSmall && styles.cardTitleSmall]}>{copy.personalDetails}</Text>
                <Text style={[styles.mutedSmall, responsive.isCompact && styles.mutedSmallCompact, responsive.isSmall && styles.mutedSmallScreenText]}>{copy.personalDetailsSubtitle}</Text>
              </View>
            </View>
            <AuthField
              label={copy.fullName}
              value={name}
              onChangeText={setName}
              icon="person"
              onFocus={() => revealOnboardingField(0)}
            />
            <AuthField
              label={copy.email}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              icon="mail"
              autoCapitalize="none"
              onFocus={() => revealOnboardingField(90)}
            />
            <AuthField
              label={copy.city}
              value={city}
              onChangeText={setCity}
              icon="location"
              onFocus={() => revealOnboardingField(170)}
            />
            <AuthField label={copy.loginMobileNumber} value={user.phone} editable={false} keyboardType="phone-pad" icon="call" />
            {localError || error ? <Text style={styles.loginError}>{localError || error}</Text> : null}
            {!keyboardLayoutVisible ? (
              <PrimaryButton
                title={busy ? copy.saving : copy.saveAndNext}
                icon="arrow-forward"
                onPress={savePersonalDetails}
              />
            ) : null}
          </View>
        ) : null}

        {activeStep === 2 ? (
          <>
            <View style={styles.onboardingStepIntro}>
              <Text style={[styles.cardTitle, responsive.isCompact && styles.cardTitleCompact, responsive.isSmall && styles.cardTitleSmall]}>{copy.uploadDetails}</Text>
              <Text style={[styles.mutedSmall, responsive.isCompact && styles.mutedSmallCompact, responsive.isSmall && styles.mutedSmallScreenText]}>{copy.uploadDetailsSubtitle}</Text>
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
                  <Text style={[styles.cardTitle, responsive.isCompact && styles.cardTitleCompact, responsive.isSmall && styles.cardTitleSmall]}>{copy.panOrAadhaar}</Text>
                  <Text style={[styles.mutedSmall, responsive.isCompact && styles.mutedSmallCompact, responsive.isSmall && styles.mutedSmallScreenText]}>{copy.oneIdentityProofRequired}</Text>
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
                <Text style={[styles.cardTitle, responsive.isCompact && styles.cardTitleCompact, responsive.isSmall && styles.cardTitleSmall]}>{copy.vehicleDetails}</Text>
                <Text style={[styles.mutedSmall, responsive.isCompact && styles.mutedSmallCompact, responsive.isSmall && styles.mutedSmallScreenText]}>{copy.vehicleDetailsSubtitle}</Text>
              </View>
            </View>
            <VehiclePicker vehicles={vehicles} selectedId={vehicleId} onSelect={setVehicleId} />
            <AuthField
              label={copy.vehicleNumber}
              value={vehicleNumber}
              onChangeText={setVehicleNumber}
              icon="bicycle"
              autoCapitalize="characters"
              onFocus={() => revealOnboardingField(340)}
            />
            <PrimaryButton title={docs?.rc ? copy.rcCaptured : copy.captureRc} icon="camera" onPress={() => onCapture('rc')} />
            {localError || error ? <Text style={styles.loginError}>{localError || error}</Text> : null}
            {!keyboardLayoutVisible ? (
              <View style={styles.onboardingNavRow}>
                <SecondaryButton title={copy.back} icon="arrow-back" onPress={() => goToStep(2)} />
                <PrimaryButton title={busy ? copy.saving : copy.saveVehicle} icon="checkmark" onPress={saveVehicleDetails} />
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      {activeStep === 1 && keyboardLayoutVisible ? (
        <View
          style={[
            styles.onboardingPersonalKeyboardFooter,
            Platform.OS === 'android' && styles.androidKeyboardFooter,
            Platform.OS === 'android' && { bottom: androidKeyboardPadding }
          ]}
        >
          <View style={styles.onboardingPersonalKeyboardFooterInner}>
            <PrimaryButton
              title={busy ? copy.saving : copy.saveAndNext}
              icon="arrow-forward"
              onPress={savePersonalDetails}
            />
          </View>
        </View>
      ) : null}

      {activeStep === 3 && keyboardLayoutVisible ? (
        <View
          style={[
            styles.onboardingPersonalKeyboardFooter,
            Platform.OS === 'android' && styles.androidKeyboardFooter,
            Platform.OS === 'android' && { bottom: androidKeyboardPadding }
          ]}
        >
          <View style={styles.onboardingPersonalKeyboardFooterInner}>
            <SecondaryButton title={copy.back} icon="arrow-back" onPress={() => goToStep(2)} />
            <PrimaryButton
              title={busy ? copy.saving : copy.saveVehicle}
              icon="checkmark"
              onPress={saveVehicleDetails}
            />
          </View>
        </View>
      ) : null}
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
  const responsive = useResponsiveLayout();
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
                  <Text style={[styles.onboardingStepperNumber, responsive.isSmall && styles.onboardingStepperNumberSmall, active && styles.onboardingStepperNumberActive]}>{step.id}</Text>
                )}
              </View>
              <Text style={[styles.onboardingStepperLabel, responsive.isCompact && styles.onboardingStepperLabelCompact, responsive.isSmall && styles.onboardingStepperLabelSmall, active && styles.onboardingStepperLabelActive]}>{step.label}</Text>
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
    <SafeAreaView edges={appSafeAreaEdges} style={styles.loginShell}>
      <KeyboardAvoidingView style={styles.authKeyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.profileSetupScroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
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
  const responsive = useResponsiveLayout();
  return (
    <View style={[styles.authFieldGroup, responsive.isCompact && styles.authFieldGroupCompact]}>
      <Text style={[styles.fieldLabel, responsive.isCompact && styles.fieldLabelCompact, responsive.isSmall && styles.fieldLabelSmall]}>{copy.vehicleType}</Text>
      <View style={[styles.vehicleChoiceList, responsive.isCompact && styles.vehicleChoiceListCompact]}>
        {vehicles.map((vehicle) => {
          const selected = vehicle.id === selectedId;
          return (
            <Pressable
              key={vehicle.id}
              style={[styles.vehicleChoice, responsive.isCompact && styles.vehicleChoiceCompact, selected && styles.vehicleChoiceSelected]}
              onPress={() => onSelect(vehicle.id)}
            >
              <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={responsive.isCompact ? 16 : 18} color={selected ? colors.partner : colors.muted} />
              <View style={styles.flex}>
                <Text style={[styles.vehicleChoiceTitle, responsive.isCompact && styles.vehicleChoiceTitleCompact, responsive.isSmall && styles.vehicleChoiceTitleSmall]}>{vehicle.shortName}</Text>
                <Text style={[styles.vehicleChoiceMeta, responsive.isCompact && styles.vehicleChoiceMetaCompact, responsive.isSmall && styles.vehicleChoiceMetaSmall]}>{copy.upToKg} {vehicle.capacityKg} kg</Text>
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
  maxLength,
  autoFocus = false,
  onFocus
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
}) {
  const responsive = useResponsiveLayout();
  return (
    <View style={[styles.authFieldGroup, responsive.isCompact && styles.authFieldGroupCompact]}>
      <Text style={[styles.fieldLabel, responsive.isCompact && styles.fieldLabelCompact, responsive.isSmall && styles.fieldLabelSmall]}>{label}</Text>
      <View style={[styles.authInputShell, responsive.isCompact && styles.authInputShellCompact, !editable && styles.authInputReadonly]}>
        <Ionicons name={icon} size={responsive.isCompact ? 16 : 18} color={editable ? colors.partner : colors.muted} />
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
          style={[styles.authInputText, responsive.isCompact && styles.authInputTextCompact, responsive.isSmall && styles.authInputTextSmall]}
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

function AvailabilitySlider({
  online,
  busy,
  disabled,
  compact,
  onlineActionLabel,
  offlineActionLabel,
  rechargeLabel,
  slideHint,
  onSlide,
  onDisabledPress
}: {
  online: boolean;
  busy: boolean;
  disabled: boolean;
  compact: boolean;
  onlineActionLabel: string;
  offlineActionLabel: string;
  rechargeLabel: string;
  slideHint: string;
  onSlide: () => void;
  onDisabledPress: () => void;
}) {
  const thumbPosition = useRef(new Animated.Value(0)).current;
  const [trackWidth, setTrackWidth] = useState(0);
  const thumbSize = compact ? 42 : 50;
  const trackInset = 4;
  const travelDistance = Math.max(0, trackWidth - thumbSize - trackInset * 2);
  const actionColor = disabled ? colors.amber : online ? colors.red : colors.partner;
  const actionLabel = busy
    ? undefined
    : disabled
      ? rechargeLabel
      : online
        ? offlineActionLabel
        : onlineActionLabel;

  function resetThumb() {
    Animated.spring(thumbPosition, {
      toValue: 0,
      useNativeDriver: true,
      speed: 24,
      bounciness: 5
    }).start();
  }

  useEffect(() => {
    thumbPosition.setValue(0);
  }, [disabled, online, thumbPosition, travelDistance]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !busy && !disabled && travelDistance > 0,
    onMoveShouldSetPanResponder: (_, gesture) => (
      !busy && !disabled && travelDistance > 0 && gesture.dx > 3 && Math.abs(gesture.dx) > Math.abs(gesture.dy)
    ),
    onPanResponderGrant: () => thumbPosition.stopAnimation(),
    onPanResponderMove: (_, gesture) => {
      thumbPosition.setValue(Math.max(0, Math.min(travelDistance, gesture.dx)));
    },
    onPanResponderRelease: (_, gesture) => {
      const confirmed = gesture.dx >= Math.max(46, travelDistance * 0.58);
      if (!confirmed) {
        resetThumb();
        return;
      }
      Animated.timing(thumbPosition, {
        toValue: travelDistance,
        duration: 120,
        useNativeDriver: true
      }).start(() => {
        onSlide();
        setTimeout(resetThumb, 260);
      });
    },
    onPanResponderTerminationRequest: () => false,
    onPanResponderTerminate: resetThumb
  }), [busy, disabled, onSlide, thumbPosition, travelDistance]);

  return (
    <Pressable
      style={[
        styles.availabilitySlider,
        compact && styles.availabilitySliderCompact,
        { borderColor: actionColor },
        disabled && styles.availabilitySliderDisabled
      ]}
      onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
      onPress={disabled ? onDisabledPress : undefined}
      accessibilityRole="adjustable"
      accessibilityLabel={actionLabel ?? slideHint}
      accessibilityHint={disabled ? rechargeLabel : slideHint}
      accessibilityActions={[{ name: 'activate', label: actionLabel ?? slideHint }]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName !== 'activate' || busy) return;
        if (disabled) onDisabledPress();
        else onSlide();
      }}
    >
      <View style={[styles.availabilitySliderLabelWrap, { paddingLeft: thumbSize + 18 }]} pointerEvents="none">
        {busy ? <ActivityIndicator size="small" color={actionColor} /> : null}
        <Text style={[styles.availabilitySliderLabel, compact && styles.availabilitySliderLabelCompact, { color: actionColor }]}>
          {actionLabel ?? slideHint}
        </Text>
        {!busy && !disabled ? (
          <View style={styles.availabilitySliderChevrons}>
            <Ionicons name="chevron-forward" size={compact ? 13 : 15} color={actionColor} />
            <Ionicons name="chevron-forward" size={compact ? 13 : 15} color={actionColor} style={styles.availabilitySliderChevronOverlap} />
          </View>
        ) : null}
      </View>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.availabilitySliderThumb,
          compact && styles.availabilitySliderThumbCompact,
          { backgroundColor: actionColor, transform: [{ translateX: thumbPosition }] }
        ]}
      >
        <Ionicons name={disabled ? 'wallet-outline' : 'power'} size={compact ? 20 : 23} color={colors.white} />
      </Animated.View>
    </Pressable>
  );
}

function AcceptOrderSlider({
  label,
  busy,
  compact,
  onAccept
}: {
  label: string;
  busy: boolean;
  compact: boolean;
  onAccept: () => void;
}) {
  const thumbPosition = useRef(new Animated.Value(0)).current;
  const [trackWidth, setTrackWidth] = useState(0);
  const thumbSize = compact ? 42 : 48;
  const trackInset = 4;
  const travelDistance = Math.max(0, trackWidth - thumbSize - trackInset * 2);

  function resetThumb() {
    Animated.spring(thumbPosition, {
      toValue: 0,
      useNativeDriver: true,
      speed: 24,
      bounciness: 5
    }).start();
  }

  useEffect(() => {
    thumbPosition.setValue(0);
  }, [busy, thumbPosition, travelDistance]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !busy && travelDistance > 0,
    onMoveShouldSetPanResponder: (_, gesture) => (
      !busy && travelDistance > 0 && gesture.dx > 3 && Math.abs(gesture.dx) > Math.abs(gesture.dy)
    ),
    onPanResponderGrant: () => thumbPosition.stopAnimation(),
    onPanResponderMove: (_, gesture) => {
      thumbPosition.setValue(Math.max(0, Math.min(travelDistance, gesture.dx)));
    },
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx < Math.max(56, travelDistance * 0.7)) {
        resetThumb();
        return;
      }
      Animated.timing(thumbPosition, {
        toValue: travelDistance,
        duration: 120,
        useNativeDriver: true
      }).start(onAccept);
    },
    onPanResponderTerminationRequest: () => false,
    onPanResponderTerminate: resetThumb
  }), [busy, onAccept, thumbPosition, travelDistance]);

  return (
    <View
      style={[styles.acceptOrderSlider, compact && styles.acceptOrderSliderCompact, busy && styles.acceptOrderSliderBusy]}
      onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityHint="Slide right to accept this order"
      accessibilityActions={[{ name: 'activate', label }]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'activate' && !busy) onAccept();
      }}
    >
      <View style={[styles.acceptOrderSliderLabelWrap, { paddingLeft: thumbSize + 16 }]} pointerEvents="none">
        {busy ? <ActivityIndicator size="small" color={colors.partner} /> : null}
        <Text style={[styles.acceptOrderSliderLabel, compact && styles.acceptOrderSliderLabelCompact]} numberOfLines={1}>
          {label}
        </Text>
        {!busy ? (
          <View style={styles.availabilitySliderChevrons}>
            <Ionicons name="chevron-forward" size={compact ? 13 : 15} color={colors.partner} />
            <Ionicons name="chevron-forward" size={compact ? 13 : 15} color={colors.partner} style={styles.availabilitySliderChevronOverlap} />
          </View>
        ) : null}
      </View>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.acceptOrderSliderThumb,
          compact && styles.acceptOrderSliderThumbCompact,
          { transform: [{ translateX: thumbPosition }] }
        ]}
      >
        <Ionicons name="checkmark" size={compact ? 21 : 24} color={colors.white} />
      </Animated.View>
    </View>
  );
}

function DashboardScreen({
  data,
  busy,
  onToggle,
  onActive,
  onTopup,
  onRefreshStatus,
  onAccept,
  onReject
}: {
  data: PartnerBootstrap;
  busy: boolean;
  onToggle: () => void;
  onActive: () => void;
  onTopup: (amount: number) => void;
  onRefreshStatus: () => void;
  onAccept: (orderId: string) => void;
  onReject: (orderId: string) => void;
}) {
  const copy = useCopy();
  const responsive = useResponsiveLayout();
  const profile = data.user.partnerProfile;
  const online = Boolean(profile?.online);
  const balance = profile?.walletBalance ?? 0;
  const walletReady = balance >= minPartnerWalletBalance;
  const rechargeAmount = Math.max(50, Math.ceil(minPartnerWalletBalance - balance));
  return (
    <View style={styles.dashboardScreen}>
      <ScrollView
        style={styles.dashboardScroll}
        contentContainerStyle={[
          styles.scroll,
          styles.responsiveScreenContent,
          responsive.isCompact && styles.scrollCompact,
          responsive.isSmall && styles.scrollSmall,
          styles.dashboardScrollContent,
          {
            maxWidth: responsive.contentMaxWidth,
            paddingHorizontal: responsive.horizontalPadding
          }
        ]}
        showsVerticalScrollIndicator={false}
      >
      {profile?.kycStatus === 'pending' ? (
        <View style={[styles.verificationPendingCard, responsive.isCompact && styles.verificationPendingCardCompact]}>
          <View style={[styles.verificationPendingHeader, responsive.isCompact && styles.verificationPendingHeaderCompact]}>
            <View style={[styles.verificationPendingIcon, responsive.isCompact && styles.verificationPendingIconCompact]}>
              <Ionicons name="shield-checkmark-outline" size={responsive.isCompact ? 20 : 24} color={colors.partner} />
            </View>
            <View style={styles.flex}>
              <Text style={[styles.verificationPendingTitle, responsive.isCompact && styles.verificationPendingTitleCompact]}>{copy.profileUnderReview}</Text>
              <View style={styles.verificationPendingStatus}>
                <View style={styles.verificationPendingDot} />
                <Text style={[styles.verificationPendingStatusText, responsive.isCompact && styles.verificationPendingStatusTextCompact]}>{copy.submittedForReview}</Text>
              </View>
            </View>
          </View>
          <Text style={[styles.verificationPendingText, responsive.isCompact && styles.verificationPendingTextCompact]}>{copy.profileSubmittedNotice}</Text>
          <Pressable
            style={[styles.verificationPendingButton, responsive.isCompact && styles.verificationPendingButtonCompact]}
            onPress={onRefreshStatus}
            disabled={busy}
            accessibilityRole="button"
          >
            <Ionicons name="refresh-outline" size={16} color={colors.partner} />
            <Text style={styles.verificationPendingButtonText}>
              {busy ? copy.syncing : copy.checkVerificationStatus}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {!walletReady ? (
        <View style={[styles.walletBlockCard, responsive.isCompact && styles.walletBlockCardCompact]}>
          <View style={styles.walletBlockHeader}>
            <Ionicons name="wallet-outline" size={responsive.isCompact ? 19 : 22} color={colors.amber} />
            <View style={styles.flex}>
              <Text style={[styles.cardTitle, responsive.isCompact && styles.cardTitleCompact]}>{copy.rechargeDriverWallet}</Text>
              <Text style={[styles.mutedSmall, responsive.isCompact && styles.mutedSmallCompact]}>{fillCopy(copy.minimumBalanceRequired, { amount: money(minPartnerWalletBalance) })}</Text>
            </View>
          </View>
          <Text style={[styles.walletBlockBalance, responsive.isCompact && styles.walletBlockBalanceCompact]}>{copy.currentBalance}: {money(balance)}</Text>
          <PrimaryButton title={`${copy.recharge} ${money(rechargeAmount)}`} icon="add-circle" onPress={() => onTopup(rechargeAmount)} />
        </View>
      ) : null}

      <View style={[styles.statRow, responsive.isCompact && styles.statRowCompact]}>
        <StatCard title={copy.today} value={money(data.stats.todayEarn)} tone="green" />
        <StatCard title={copy.orders} value={String(data.stats.completedCount)} tone="blue" />
        <StatCard title={copy.rating} value={`${profile?.rating ?? 5}`} tone="amber" />
      </View>

      <View style={styles.row}>
        <SecondaryButton title={copy.activeTrip} icon="navigate" onPress={onActive} />
      </View>

      <SectionTitle title={`${copy.availableOrders} (${data.availableOrders.length})`} />
      <AvailableOrdersList
        orders={data.availableOrders}
        driverLocation={profile?.currentLocation}
        busy={busy}
        onAccept={onAccept}
        onReject={onReject}
      />
      </ScrollView>

      <View style={[styles.availabilityFooter, responsive.isCompact && styles.availabilityFooterCompact]}>
        <View
          style={[
            styles.availabilityFooterInner,
            {
              maxWidth: responsive.contentMaxWidth,
              paddingHorizontal: responsive.horizontalPadding
            }
          ]}
        >
          <View style={styles.availabilityStatusRow}>
            <View style={[
              styles.availabilityStatusDot,
              online && styles.availabilityStatusDotOnline,
              !walletReady && styles.availabilityStatusDotBlocked
            ]} />
            <Text style={[
              styles.availabilityStatusText,
              responsive.isCompact && styles.availabilityStatusTextCompact,
              online && styles.availabilityStatusTextOnline,
              !walletReady && styles.availabilityStatusTextBlocked
            ]}>
              {online ? copy.online : walletReady ? copy.offline : copy.rechargeStatus}
            </Text>
            <Text style={[styles.availabilityStatusMessage, responsive.isCompact && styles.availabilityStatusMessageCompact]} numberOfLines={1}>
              {walletReady ? (online ? copy.receivingNearbyOrders : copy.tapToStartReceivingOrders) : copy.walletBelowMinimum}
            </Text>
          </View>
          <AvailabilitySlider
            online={online}
            busy={busy}
            disabled={!walletReady}
            compact={responsive.isCompact}
            onlineActionLabel={copy.goOnline}
            offlineActionLabel={copy.goOffline}
            rechargeLabel={copy.rechargeStatus}
            slideHint={copy.slideToConfirm}
            onSlide={onToggle}
            onDisabledPress={() => onTopup(rechargeAmount)}
          />
        </View>
      </View>
    </View>
  );
}

function AvailableOrdersList({
  orders,
  driverLocation,
  busy,
  onAccept,
  onReject
}: {
  orders: Order[];
  driverLocation?: PartnerLocation;
  busy: boolean;
  onAccept: (orderId: string) => void;
  onReject: (orderId: string) => void;
}) {
  const copy = useCopy();
  const responsive = useResponsiveLayout();
  return (
    <>
      {orders.length === 0 ? (
        <Empty icon="time-outline" title={copy.noOrdersRightNow} subtitle={copy.stayOnlineRefresh} />
      ) : null}
      {orders.map((order) => {
        const distanceToPickup = pickupDistanceKm(driverLocation, order.pickup);
        return (
          <View key={order.id} style={[styles.orderCard, responsive.isCompact && styles.orderCardCompact]}>
            <OrderHeader order={order} />
            <RouteBlock order={order} />
            <View style={[styles.pickupDistanceBanner, responsive.isCompact && styles.pickupDistanceBannerCompact]}>
              <Ionicons name="navigate-circle" size={responsive.isCompact ? 19 : 22} color={colors.partner} />
              <Text style={[styles.pickupDistanceText, responsive.isCompact && styles.pickupDistanceTextCompact, responsive.isSmall && styles.pickupDistanceTextSmall]}>
                {distanceToPickup === undefined
                  ? copy.waitingForGpsDistance
                  : fillCopy(copy.pickupDistance, { distance: formatPickupDistance(distanceToPickup) })}
              </Text>
            </View>
            <View style={[styles.chips, responsive.isCompact && styles.chipsCompact]}>
              <Chip label={`${copy.tripDistance}: ${order.distanceKm} km`} />
              <Chip label={`${order.weightKg} kg`} />
              <Chip label={order.goodsType} />
            </View>
            <View style={[styles.row, responsive.isCompact && styles.rowCompact]}>
              <SecondaryButton title={copy.skip} icon="close" onPress={() => onReject(order.id)} />
            </View>
            <AcceptOrderSlider
              label={busy ? copy.wait : `${copy.slideToConfirm}: ${copy.accept} ${money(order.fare.partnerNet)}`}
              busy={busy}
              compact={responsive.isCompact}
              onAccept={() => onAccept(order.id)}
            />
          </View>
        );
      })}
    </>
  );
}

function ActiveScreen({
  api,
  orders,
  completedOrders,
  selectedOrderId,
  cancellationsRemaining,
  busy,
  refreshing,
  refresh,
  onSelectOrder,
  onOtp,
  onPod,
  onStatus,
  onCancel
}: {
  api: IndieryApi;
  orders: Order[];
  completedOrders: Order[];
  selectedOrderId?: string;
  cancellationsRemaining: number;
  busy: boolean;
  refreshing: boolean;
  refresh: () => void;
  onSelectOrder: (orderId: string) => void;
  onOtp: (orderId: string, type: 'pickup' | 'drop', otp: string) => void;
  onPod: (orderId: string, type: 'pickup' | 'drop') => void;
  onStatus: (orderId: string, status: 'arrived_pickup' | 'picked_up' | 'in_transit' | 'delivered') => void;
  onCancel: (order: Order) => void;
}) {
  const copy = useCopy();
  const language = useLanguage();
  const responsive = useResponsiveLayout();
  const { bottom: bottomInset, left: leftInset, right: rightInset } = useSafeAreaInsets();
  const [otp, setOtp] = useState('');
  const [historyDateFilter, setHistoryDateFilter] = useState<OrderHistoryDateFilter>('all');
  const [draftHistoryDateFilter, setDraftHistoryDateFilter] = useState<OrderHistoryDateFilter>('all');
  const [historyFilterOpen, setHistoryFilterOpen] = useState(false);
  const order = orders.find((item) => item.id === selectedOrderId) ?? orders[0];
  const nextActions = order ? getNextActions(order, copy) : [];
  const needsPickupOtp = order?.status === 'arrived_pickup' && !order.pod.pickupOtpVerified;
  const needsDropOtp = order?.status === 'in_transit' && !order.pod.dropOtpVerified;
  const canCancelOrder = Boolean(order && ['accepted', 'arrived_pickup'].includes(order.status));
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const lastSevenDaysStart = new Date(todayStart);
  lastSevenDaysStart.setDate(lastSevenDaysStart.getDate() - 6);
  const matchesHistoryDateFilter = (historyOrder: Order, filter: OrderHistoryDateFilter) => {
    if (filter === 'all') return true;
    const completedAt = new Date(historyOrder.updatedAt || historyOrder.createdAt).getTime();
    if (!Number.isFinite(completedAt)) return false;
    if (filter === 'today') {
      return completedAt >= todayStart.getTime() && completedAt < tomorrowStart.getTime();
    }
    return completedAt >= lastSevenDaysStart.getTime() && completedAt < tomorrowStart.getTime();
  };
  const todayOrderCount = completedOrders.filter((item) => matchesHistoryDateFilter(item, 'today')).length;
  const lastSevenDaysOrderCount = completedOrders.filter((item) => matchesHistoryDateFilter(item, 'last7Days')).length;
  const filteredCompletedOrders = completedOrders.filter((item) => matchesHistoryDateFilter(item, historyDateFilter));
  const historyDateFilterOptions: Array<{ id: OrderHistoryDateFilter; label: string; count: number }> = [
    { id: 'all', label: copy.allOrders, count: completedOrders.length },
    { id: 'today', label: copy.today, count: todayOrderCount },
    { id: 'last7Days', label: copy.last7Days, count: lastSevenDaysOrderCount }
  ];
  const historyFiltersActive = historyDateFilter !== 'all';

  function clearHistoryFilters() {
    setHistoryDateFilter('all');
    setDraftHistoryDateFilter('all');
    setHistoryFilterOpen(false);
  }

  return (
    <View style={styles.partnerCurvedScrollViewport}>
    <ScrollView
      style={styles.partnerCurvedScroll}
      contentContainerStyle={[
        styles.scroll,
        styles.responsiveScreenContent,
        responsive.isCompact && styles.scrollCompact,
        responsive.isSmall && styles.scrollSmall,
        {
          maxWidth: responsive.contentMaxWidth,
          paddingHorizontal: responsive.horizontalPadding
        },
        styles.partnerCurvedScrollContent
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <SectionTitle title={`${copy.activeOrders} (${orders.length})`} />
      {!order ? (
        <>
          <Empty icon="navigate-outline" title={copy.noActiveDelivery} subtitle={copy.acceptOrderFromHome} />
          <SecondaryButton title={refreshing ? copy.refreshing : copy.refresh} icon="refresh" onPress={refresh} disabled={refreshing} loading={refreshing} />
        </>
      ) : (
        <>
      {orders.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.activeTripSwitchRow, responsive.isCompact && styles.activeTripSwitchRowCompact]}>
            {orders.map((item) => {
              const selected = item.id === order.id;
              return (
                <Pressable
                  key={item.id}
                  style={[
                    styles.activeTripSwitchCard,
                    responsive.isCompact && styles.activeTripSwitchCardCompact,
                    responsive.isSmall && styles.activeTripSwitchCardSmall,
                    selected && styles.activeTripSwitchCardSelected
                  ]}
                  onPress={() => onSelectOrder(item.id)}
                >
                  <Text style={[styles.activeTripSwitchTitle, responsive.isCompact && styles.activeTripSwitchTitleCompact, responsive.isSmall && styles.activeTripSwitchTitleSmall, selected && styles.activeTripSwitchTitleSelected]}>{item.orderNo}</Text>
                  <Text style={[styles.activeTripSwitchMeta, responsive.isCompact && styles.activeTripSwitchMetaCompact, responsive.isSmall && styles.activeTripSwitchMetaSmall]} numberOfLines={1}>
                    {item.pickup.label} {copy.to} {item.drop.label}
                  </Text>
                  <Text style={[styles.activeTripSwitchMeta, responsive.isCompact && styles.activeTripSwitchMetaCompact, responsive.isSmall && styles.activeTripSwitchMetaSmall]}>{orderStatusLabel(language, item.status)}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
      ) : null}
      <MapPreview
        api={api}
        orderId={order.id}
        pickup={order.pickup}
        drop={order.drop}
        extraStops={order.extraStops}
        eta={order.etaMinutes}
        partnerLocation={order.partnerLocation}
      />
      <View style={[styles.orderCard, responsive.isCompact && styles.orderCardCompact]}>
        <OrderHeader order={order} />
        <ActiveOrderContacts order={order} />
        <RouteBlock order={order} />
      </View>

      <Timeline order={order} />

      <View style={[styles.payoutCard, responsive.isCompact && styles.payoutCardCompact]}>
        <FareLine label={copy.orderValue} value={money(order.fare.orderValue)} />
        <FareLine label={copy.driverCommission} value={money(order.fare.driverCommission)} />
        <FareLine label={copy.reserveReward} value={money(order.fare.reserveAmount)} />
        <FareLine label={copy.indieryCommission} value={money(order.fare.platformCommission)} />
        <FareLine label={copy.youReceiveOnTime} value={money(order.fare.onTimePartnerPayout)} bold />
        <FareLine label={copy.ifLateReceive} value={money(order.fare.latePartnerPayout)} />
      </View>

      <SectionTitle title={copy.tripActions} />
      {needsPickupOtp || needsDropOtp ? (
        <View style={[styles.otpPanel, responsive.isCompact && styles.otpPanelCompact]}>
          <Text style={[styles.fieldLabel, responsive.isCompact && styles.fieldLabelCompact, responsive.isSmall && styles.fieldLabelSmall]}>{needsPickupOtp ? copy.pickupOtp : copy.dropOtp}</Text>
          <View style={[styles.otpRow, responsive.isSmall && styles.otpRowSmall]}>
            <TextInput
              value={otp}
              onChangeText={setOtp}
              keyboardType="numeric"
              placeholder={copy.enter6DigitCode}
              style={[styles.otpInput, responsive.isCompact && styles.otpInputCompact, responsive.isSmall && styles.otpInputSmall]}
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
      {canCancelOrder ? (
        <Pressable
          style={[
            styles.cancelOrderButton,
            (busy || cancellationsRemaining <= 0) && styles.cancelOrderButtonDisabled
          ]}
          disabled={busy || cancellationsRemaining <= 0}
          onPress={() => order && onCancel(order)}
        >
          <Ionicons name="close-circle-outline" size={20} color={colors.red} />
          <View style={styles.flex}>
            <Text style={[styles.cancelOrderButtonText, responsive.isCompact && styles.cancelOrderButtonTextCompact, responsive.isSmall && styles.cancelOrderButtonTextSmall]}>
              {cancellationsRemaining > 0 ? copy.cancelDelivery : copy.dailyCancellationLimit}
            </Text>
            <Text style={[styles.cancelOrderButtonMeta, responsive.isCompact && styles.cancelOrderButtonMetaCompact, responsive.isSmall && styles.cancelOrderButtonMetaSmall]}>
              {fillCopy(copy.cancellationsRemaining, { remaining: cancellationsRemaining })}
            </Text>
          </View>
        </Pressable>
      ) : null}
      <SecondaryButton title={refreshing ? copy.refreshing : copy.refresh} icon="refresh" onPress={refresh} disabled={refreshing} loading={refreshing} />
        </>
      )}

      <View style={styles.orderHistoryHeader}>
        <SectionTitle title={`${copy.orderHistory} (${filteredCompletedOrders.length})`} />
        {completedOrders.length ? (
          <Pressable
            style={[styles.orderHistoryFilterButton, historyFiltersActive && styles.orderHistoryFilterButtonActive]}
            onPress={() => {
              setDraftHistoryDateFilter(historyDateFilter);
              setHistoryFilterOpen(true);
            }}
            accessibilityRole="button"
            accessibilityLabel={copy.filterOrders}
          >
            <Ionicons name="options-outline" size={15} color={historyFiltersActive ? colors.white : colors.partner} />
            <Text style={[styles.orderHistoryFilterButtonText, historyFiltersActive && styles.orderHistoryFilterButtonTextActive]}>
              {copy.filters}
            </Text>
            {historyFiltersActive ? (
              <View style={styles.orderHistoryFilterBadge}>
                <Text style={styles.orderHistoryFilterBadgeText}>1</Text>
              </View>
            ) : null}
          </Pressable>
        ) : null}
      </View>
      {completedOrders.length === 0 ? (
        <Empty icon="time-outline" title={copy.noOrderHistory} subtitle={copy.completedDeliveriesAppearHere} />
      ) : null}
      {completedOrders.length > 0 && filteredCompletedOrders.length === 0 ? (
        <View style={styles.orderHistoryEmpty}>
          <Ionicons name="filter-outline" size={28} color={colors.muted} />
          <Text style={styles.emptyTitle}>{copy.noMatchingOrders}</Text>
          <Text style={styles.muted}>{copy.adjustOrderFilters}</Text>
          <Pressable style={styles.orderHistoryClearButton} onPress={clearHistoryFilters}>
            <Ionicons name="refresh" size={15} color={colors.partner} />
            <Text style={styles.orderHistoryClearButtonText}>{copy.clearFilters}</Text>
          </Pressable>
        </View>
      ) : null}
      {filteredCompletedOrders.map((completedOrder) => (
        <OrderCard key={completedOrder.id} order={completedOrder} />
      ))}
      <Modal visible={historyFilterOpen} transparent animationType="slide" onRequestClose={() => setHistoryFilterOpen(false)}>
        <View style={styles.orderHistoryFilterOverlay}>
          <Pressable style={styles.orderHistoryFilterBackdrop} onPress={() => setHistoryFilterOpen(false)} />
          <View style={[
            styles.orderHistoryFilterSheet,
            {
              paddingBottom: Math.max(22, bottomInset + 12),
              paddingLeft: Math.max(16, leftInset + 12),
              paddingRight: Math.max(16, rightInset + 12)
            }
          ]}>
            <View style={styles.orderHistoryFilterHandle} />
            <View style={styles.orderHistoryFilterSheetHeader}>
              <View style={styles.flex}>
                <Text style={styles.orderHistoryFilterTitle}>{copy.filterOrders}</Text>
                <Text style={styles.orderHistoryFilterSubtitle}>{copy.filterOrdersSubtitle}</Text>
              </View>
              <Pressable style={styles.orderHistoryFilterClose} onPress={() => setHistoryFilterOpen(false)}>
                <Ionicons name="close" size={20} color={colors.ink} />
              </Pressable>
            </View>
            <Text style={styles.orderHistoryFilterGroupTitle}>{copy.date}</Text>
            <View style={styles.orderHistoryFilterOptionGrid}>
              {historyDateFilterOptions.map((option) => {
                const selected = draftHistoryDateFilter === option.id;
                return (
                  <Pressable
                    key={option.id}
                    style={[styles.orderHistoryFilterOption, selected && styles.orderHistoryFilterOptionActive]}
                    onPress={() => setDraftHistoryDateFilter(option.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <Text style={[styles.orderHistoryFilterOptionText, selected && styles.orderHistoryFilterOptionTextActive]}>
                      {option.label}
                    </Text>
                    <Text style={[styles.orderHistoryFilterOptionCount, selected && styles.orderHistoryFilterOptionCountActive]}>
                      {option.count}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.orderHistoryFilterActions}>
              <SecondaryButton title={copy.clearFilters} icon="refresh" onPress={clearHistoryFilters} />
              <PrimaryButton
                title={copy.applyFilters}
                icon="checkmark"
                onPress={() => {
                  setHistoryDateFilter(draftHistoryDateFilter);
                  setHistoryFilterOpen(false);
                }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
    </View>
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
  const responsive = useResponsiveLayout();
  const profile = data.user.partnerProfile;
  const balance = profile?.walletBalance ?? 0;
  const walletReady = balance >= minPartnerWalletBalance;
  const rechargeAmount = Math.max(50, Math.ceil(minPartnerWalletBalance - balance));
  return (
    <View style={styles.partnerCurvedScrollViewport}>
    <ScrollView
      style={styles.partnerCurvedScroll}
      contentContainerStyle={[
        styles.scroll,
        styles.responsiveScreenContent,
        responsive.isCompact && styles.scrollCompact,
        responsive.isSmall && styles.scrollSmall,
        {
          maxWidth: responsive.contentMaxWidth,
          paddingHorizontal: responsive.horizontalPadding
        },
        styles.partnerCurvedScrollContent
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.walletCard, responsive.isCompact && styles.walletCardCompact]}>
        <Text style={[styles.eyebrowDark, responsive.isCompact && styles.eyebrowDarkCompact, responsive.isSmall && styles.eyebrowDarkSmall]}>{copy.walletBalance}</Text>
        <Text style={[styles.walletValue, responsive.isCompact && styles.walletValueCompact, responsive.isSmall && styles.walletValueSmall]}>{money(balance)}</Text>
        <Text style={[styles.muted, responsive.isCompact && styles.mutedCompact, responsive.isSmall && styles.mutedSmallScreen]}>
          {walletReady
            ? `${profile?.weeklyOrders ?? 0} ${copy.tripsThisWeek}`
            : fillCopy(copy.rechargeToUnlock, { amount: money(rechargeAmount) })}
        </Text>
        {!walletReady ? (
          <PrimaryButton title={busy ? copy.opening : `${copy.recharge} ${money(rechargeAmount)}`} icon="add-circle" onPress={() => onTopup(rechargeAmount)} />
        ) : null}
        <PrimaryButton title={busy ? copy.requesting : copy.requestPayout} icon="send" onPress={onPayout} />
      </View>
      <View style={[styles.statRow, responsive.isCompact && styles.statRowCompact]}>
        <StatCard title={copy.today} value={money(data.stats.todayEarn)} tone="green" />
        <StatCard title={copy.done} value={String(data.stats.completedCount)} tone="blue" />
      </View>
      <SectionTitle title={copy.recentTransactions} />
      {data.stats.ledger.map((item) => (
        <View key={item.id} style={[styles.ledgerRow, responsive.isCompact && styles.ledgerRowCompact]}>
          <View style={[styles.ledgerIcon, responsive.isCompact && styles.ledgerIconCompact, item.kind === 'credit' ? styles.ledgerCredit : styles.ledgerDebit]}>
            <Ionicons name={item.kind === 'credit' ? 'arrow-down' : 'arrow-up'} size={responsive.isCompact ? 14 : 16} color={colors.white} />
          </View>
          <View style={styles.flex}>
            <Text style={[styles.cardTitle, responsive.isCompact && styles.cardTitleCompact, responsive.isSmall && styles.cardTitleSmall]}>{item.title}</Text>
            <Text style={[styles.mutedSmall, responsive.isCompact && styles.mutedSmallCompact, responsive.isSmall && styles.mutedSmallScreenText]}>{item.reference || copy.wallet}</Text>
          </View>
          <Text style={[styles.amount, responsive.isCompact && styles.amountCompact, responsive.isSmall && styles.amountSmall, item.kind === 'credit' ? styles.amountGreen : styles.amountRed]}>
            {item.kind === 'credit' ? '+' : '-'}{money(item.amount)}
          </Text>
        </View>
      ))}
    </ScrollView>
    </View>
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
  const responsive = useResponsiveLayout();
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
  const [detailKeyboardVisible, setDetailKeyboardVisible] = useState(false);
  const [detailKeyboardHeight, setDetailKeyboardHeight] = useState(0);

  const accountCompleted = progress.completed + (docs?.bank ? 1 : 0);
  const accountTotal = progress.total + 1;
  const documentsVerified = progress.complete && user.partnerProfile?.kycStatus === 'verified';
  const showDetailKeyboardAction =
    detailKeyboardVisible && (page === 'personal' || page === 'vehicle' || page === 'bank');
  const detailKeyboardOverlayInset = Platform.OS === 'android'
    ? Math.max(0, detailKeyboardHeight + 16)
    : 0;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setDetailKeyboardVisible(true);
      setDetailKeyboardHeight(event.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setDetailKeyboardVisible(false);
      setDetailKeyboardHeight(0);
    });
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  function markDetailFieldFocused() {
    setDetailKeyboardVisible(true);
    setTimeout(() => {
      const metrics = Keyboard.metrics();
      if (metrics?.height) setDetailKeyboardHeight(metrics.height);
    }, 50);
  }

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
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          styles.responsiveScreenContent,
          responsive.isCompact && styles.scrollCompact,
          responsive.isSmall && styles.scrollSmall,
          {
            maxWidth: responsive.contentMaxWidth,
            paddingHorizontal: responsive.horizontalPadding
          }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.accountHero, responsive.isCompact && styles.accountHeroCompact, responsive.isSmall && styles.accountHeroSmall]}>
          <View style={styles.accountHeroGlow} />
          <Text style={[styles.accountEyebrow, responsive.isCompact && styles.accountEyebrowCompact, responsive.isSmall && styles.accountEyebrowSmall]}>{copy.account}</Text>
          <Text style={[styles.accountHeroSubtitle, responsive.isCompact && styles.accountHeroSubtitleCompact, responsive.isSmall && styles.accountHeroSubtitleSmall]}>{copy.accountSubtitle}</Text>
          <View style={[styles.accountIdentityCard, responsive.isCompact && styles.accountIdentityCardCompact, responsive.isSmall && styles.accountIdentityCardSmall]}>
            <View style={[styles.accountAvatar, responsive.isCompact && styles.accountAvatarCompact, responsive.isSmall && styles.accountAvatarSmall]}>
              <Text style={[styles.accountAvatarText, responsive.isCompact && styles.accountAvatarTextCompact, responsive.isSmall && styles.accountAvatarTextSmall]}>{user.initials}</Text>
            </View>
            <View style={styles.flex}>
              <Text style={[styles.accountName, responsive.isCompact && styles.accountNameCompact, responsive.isSmall && styles.accountNameSmall]} numberOfLines={1}>{user.name}</Text>
              <Text style={[styles.accountPhone, responsive.isCompact && styles.accountPhoneCompact, responsive.isSmall && styles.accountPhoneSmall]}>{user.phone}</Text>
              <View style={[styles.accountVerifiedBadge, responsive.isCompact && styles.accountVerifiedBadgeCompact]}>
                <Ionicons name="checkmark-circle" size={responsive.isCompact ? 12 : 14} color={colors.partner} />
                <Text style={[styles.accountVerifiedText, responsive.isCompact && styles.accountVerifiedTextCompact, responsive.isSmall && styles.accountVerifiedTextSmall]} numberOfLines={1}>{kycStatusLabel(language, user.partnerProfile?.kycStatus)} {copy.verification}</Text>
              </View>
            </View>
            <Pressable style={[styles.accountEditButton, responsive.isCompact && styles.accountEditButtonCompact]} onPress={() => openPage('personal')}>
              <Ionicons name="create-outline" size={responsive.isCompact ? 16 : 18} color={colors.partner} />
            </Pressable>
          </View>
        </View>

        <View style={[styles.accountProgressCard, responsive.isCompact && styles.accountProgressCardCompact]}>
          <View style={styles.between}>
            <Text style={[styles.cardTitle, responsive.isCompact && styles.cardTitleCompact, responsive.isSmall && styles.cardTitleSmall]}>{copy.profileComplete}</Text>
            <Text style={[styles.priceText, responsive.isCompact && styles.priceTextCompact, responsive.isSmall && styles.priceTextSmall]}>{accountCompleted}/{accountTotal}</Text>
          </View>
          <View style={styles.kycProgressTrack}>
            <View style={[styles.kycProgressFill, { width: `${(accountCompleted / accountTotal) * 100}%` }]} />
          </View>
        </View>

        <View style={[styles.accountMenuCard, responsive.isCompact && styles.accountMenuCardCompact]}>
          <AccountMenuRow
            icon="school-outline"
            title={copy.driverTraining}
            subtitle={copy.driverTrainingSubtitle}
            onPress={() => openPage('training')}
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
            <Text style={[styles.noticeText, responsive.isCompact && styles.noticeTextCompact, responsive.isSmall && styles.noticeTextSmall]}>{copy.profileSubmittedNotice}</Text>
          </View>
        ) : null}

        <Pressable style={styles.deleteAccountButton} onPress={onRequestAccountDeletion}>
          <Ionicons name="trash-outline" size={18} color={colors.red} />
          <Text style={[styles.deleteAccountButtonText, responsive.isCompact && styles.accountActionTextCompact, responsive.isSmall && styles.accountActionTextSmall]}>{copy.requestAccountDeletion}</Text>
        </Pressable>
        <Pressable style={styles.logoutButton} onPress={onLogout}>
          <Ionicons name="log-out-outline" size={18} color={colors.red} />
          <Text style={[styles.logoutButtonText, responsive.isCompact && styles.accountActionTextCompact, responsive.isSmall && styles.accountActionTextSmall]}>{copy.logout}</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.authKeyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          styles.responsiveScreenContent,
          responsive.isCompact && styles.scrollCompact,
          responsive.isSmall && styles.scrollSmall,
          showDetailKeyboardAction && styles.profileDetailKeyboardScroll,
          {
            maxWidth: responsive.contentMaxWidth,
            paddingHorizontal: responsive.horizontalPadding
          }
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <AccountDetailHeader
          title={
            page === 'personal' ? copy.personalInformation
              : page === 'training' ? copy.driverTraining
                : page === 'vehicle' ? copy.vehicleDetails
                  : page === 'documents' ? copy.documentsKyc
                    : page === 'bank' ? copy.bankAccount
                      : page === 'language' ? copy.changeLanguage
                        : copy.policiesLegal
          }
          subtitle={
            page === 'personal' ? copy.keepDetailsUpdated
              : page === 'training' ? copy.driverTrainingSubtitle
                : page === 'vehicle' ? copy.vehicleDetailsSubtitle
                  : page === 'documents' ? copy.uploadDetailsSubtitle
                    : page === 'bank' ? copy.usedForPayouts
                      : page === 'language' ? copy.languageSubtitle
                        : copy.policiesLegalSubtitle
          }
          onBack={() => openPage('overview')}
        />

        {page === 'personal' ? (
          <View style={[styles.accountDetailCard, responsive.isCompact && styles.accountDetailCardCompact]}>
            <AuthField label={copy.fullName} value={name} onChangeText={setName} icon="person" onFocus={markDetailFieldFocused} />
            <AuthField label={copy.loginMobileNumber} value={user.phone} editable={false} keyboardType="phone-pad" icon="lock-closed" />
            <AuthField label={copy.email} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" icon="mail" onFocus={markDetailFieldFocused} />
            <AuthField label={copy.city} value={city} onChangeText={setCity} icon="location" onFocus={markDetailFieldFocused} />
            <View style={styles.accountInfoStrip}>
              <Ionicons name="shield-checkmark" size={20} color={colors.partner} />
              <Text style={[styles.accountInfoText, responsive.isCompact && styles.accountInfoTextCompact, responsive.isSmall && styles.accountInfoTextSmall]}>{copy.mobileLinkedToAccount}</Text>
            </View>
            {profileError ? <Text style={styles.loginError}>{profileError}</Text> : null}
            {!showDetailKeyboardAction ? (
              <PrimaryButton title={busy ? copy.saving : copy.saveChanges} icon="checkmark" onPress={submitPersonalDetails} />
            ) : null}
          </View>
        ) : null}

        {page === 'training' ? (
          <View style={[styles.trainingPage, responsive.isCompact && styles.trainingPageCompact]}>
            <View style={[styles.trainingHeroCard, responsive.isCompact && styles.trainingHeroCardCompact]}>
              <View style={[styles.trainingHeroIcon, responsive.isCompact && styles.trainingHeroIconCompact]}>
                <Ionicons name="school" size={responsive.isCompact ? 22 : 26} color={colors.white} />
              </View>
              <View style={styles.flex}>
                <Text style={[styles.trainingHeroTitle, responsive.isCompact && styles.trainingHeroTitleCompact, responsive.isSmall && styles.trainingHeroTitleSmall]}>{copy.trainingIntro}</Text>
                <Text style={[styles.trainingHeroText, responsive.isCompact && styles.trainingHeroTextCompact, responsive.isSmall && styles.trainingHeroTextSmall]}>{copy.trainingIntroText}</Text>
              </View>
            </View>

            {[
              { icon: 'power-outline' as const, title: copy.trainingGoOnlineTitle, text: copy.trainingGoOnlineText },
              { icon: 'reader-outline' as const, title: copy.trainingAcceptTitle, text: copy.trainingAcceptText },
              { icon: 'navigate-outline' as const, title: copy.trainingPickupTitle, text: copy.trainingPickupText },
              { icon: 'camera-outline' as const, title: copy.trainingPickupPhotoTitle, text: copy.trainingPickupPhotoText },
              { icon: 'key-outline' as const, title: copy.trainingPickupOtpTitle, text: copy.trainingPickupOtpText },
              { icon: 'location-outline' as const, title: copy.trainingDeliverTitle, text: copy.trainingDeliverText },
              { icon: 'camera-outline' as const, title: copy.trainingDropPhotoTitle, text: copy.trainingDropPhotoText },
              { icon: 'checkmark-done-outline' as const, title: copy.trainingDropOtpTitle, text: copy.trainingDropOtpText }
            ].map((item, index) => (
              <View key={item.title} style={[styles.trainingStepCard, responsive.isCompact && styles.trainingStepCardCompact]}>
                <View style={[styles.trainingStepRail, responsive.isCompact && styles.trainingStepRailCompact]}>
                  <View style={[styles.trainingStepIcon, responsive.isCompact && styles.trainingStepIconCompact]}>
                    <Ionicons name={item.icon} size={responsive.isCompact ? 17 : 20} color={colors.partner} />
                  </View>
                  {index < 7 ? <View style={styles.trainingStepLine} /> : null}
                </View>
                <View style={styles.trainingStepContent}>
                  <Text style={[styles.trainingStepTitle, responsive.isCompact && styles.trainingStepTitleCompact, responsive.isSmall && styles.trainingStepTitleSmall]}>{item.title}</Text>
                  <Text style={[styles.trainingStepText, responsive.isCompact && styles.trainingStepTextCompact, responsive.isSmall && styles.trainingStepTextSmall]}>{item.text}</Text>
                </View>
              </View>
            ))}

            <View style={styles.trainingSafetyCard}>
              <Ionicons name="shield-checkmark" size={22} color={colors.green} />
              <View style={styles.flex}>
                <Text style={[styles.trainingSafetyTitle, responsive.isCompact && styles.trainingSafetyTitleCompact, responsive.isSmall && styles.trainingSafetyTitleSmall]}>{copy.trainingSafetyTitle}</Text>
                <Text style={[styles.trainingSafetyText, responsive.isCompact && styles.trainingSafetyTextCompact, responsive.isSmall && styles.trainingSafetyTextSmall]}>{copy.trainingSafetyText}</Text>
              </View>
            </View>
            <View style={styles.trainingHelpCard}>
              <Ionicons name="headset" size={22} color={colors.partner} />
              <View style={styles.flex}>
                <Text style={[styles.trainingSafetyTitle, responsive.isCompact && styles.trainingSafetyTitleCompact, responsive.isSmall && styles.trainingSafetyTitleSmall]}>{copy.trainingHelpTitle}</Text>
                <Text style={[styles.trainingSafetyText, responsive.isCompact && styles.trainingSafetyTextCompact, responsive.isSmall && styles.trainingSafetyTextSmall]}>{copy.trainingHelpText}</Text>
              </View>
            </View>
          </View>
        ) : null}

        {page === 'vehicle' ? (
          <View style={[styles.accountDetailCard, responsive.isCompact && styles.accountDetailCardCompact]}>
            <VehiclePicker vehicles={vehicles} selectedId={vehicleId} onSelect={setVehicleId} />
            <AuthField label={copy.vehicleNumber} value={vehicleNumber} onChangeText={setVehicleNumber} icon="car" autoCapitalize="characters" onFocus={markDetailFieldFocused} />
            <KycStepCard
              icon="document-text"
              title={copy.vehicleRc}
              subtitle={copy.rcRequired}
              done={Boolean(docs?.rc)}
              busy={busy}
              onPress={() => onCapture('rc')}
            />
            {vehicleError ? <Text style={styles.loginError}>{vehicleError}</Text> : null}
            {!showDetailKeyboardAction ? (
              <PrimaryButton title={busy ? copy.saving : copy.saveChanges} icon="checkmark" onPress={submitVehicleDetails} />
            ) : null}
          </View>
        ) : null}

        {page === 'documents' ? (
          <>
            <View style={styles.kycProgressCard}>
              <View style={styles.between}>
                <Text style={[styles.cardTitle, responsive.isCompact && styles.cardTitleCompact, responsive.isSmall && styles.cardTitleSmall]}>{copy.documentProgress}</Text>
                <Text style={[styles.priceText, responsive.isCompact && styles.priceTextCompact, responsive.isSmall && styles.priceTextSmall]}>{progress.completed}/{progress.total}</Text>
              </View>
              <View style={styles.kycProgressTrack}>
                <View style={[styles.kycProgressFill, { width: `${(progress.completed / progress.total) * 100}%` }]} />
              </View>
              <Text style={[styles.mutedSmall, responsive.isCompact && styles.mutedSmallCompact, responsive.isSmall && styles.mutedSmallScreenText]}>{copy.status}: {kycStatusLabel(language, user.partnerProfile?.kycStatus)}</Text>
            </View>
            <KycStepCard icon="person-circle" title={copy.liveSelfie} subtitle={copy.captureClearFacePhoto} done={Boolean(docs?.selfie)} busy={busy} onPress={() => onCapture('selfie')} />
            <View style={styles.kycGroupCard}>
              <View style={styles.between}>
                <View style={styles.flex}>
                  <Text style={[styles.cardTitle, responsive.isCompact && styles.cardTitleCompact, responsive.isSmall && styles.cardTitleSmall]}>{copy.identityProof}</Text>
                  <Text style={[styles.mutedSmall, responsive.isCompact && styles.mutedSmallCompact, responsive.isSmall && styles.mutedSmallScreenText]}>{copy.capturePanOrAadhaarRequired}</Text>
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
          <View style={[styles.accountDetailCard, responsive.isCompact && styles.accountDetailCardCompact, docs?.bank && styles.accountDetailCardComplete]}>
            <View style={styles.accountBankStatus}>
              <View style={[styles.accountMenuIcon, docs?.bank && styles.accountMenuIconComplete]}>
                <Ionicons name={docs?.bank ? 'checkmark' : 'wallet-outline'} size={20} color={docs?.bank ? colors.white : colors.partner} />
              </View>
              <View style={styles.flex}>
                <Text style={[styles.cardTitle, responsive.isCompact && styles.cardTitleCompact, responsive.isSmall && styles.cardTitleSmall]}>{docs?.bank ? copy.accountSaved : copy.bankAccount}</Text>
                <Text style={[styles.mutedSmall, responsive.isCompact && styles.mutedSmallCompact, responsive.isSmall && styles.mutedSmallScreenText]}>{docs?.bank ? `${bankDetails?.accountNumberMasked || ''} • ${bankDetails?.ifsc || ''}` : copy.usedForPayouts}</Text>
              </View>
            </View>
            <View style={styles.kycInputGroup}>
              <Text style={[styles.fieldLabel, responsive.isCompact && styles.fieldLabelCompact, responsive.isSmall && styles.fieldLabelSmall]}>{copy.accountHolder}</Text>
              <TextInput value={accountHolder} onChangeText={setAccountHolder} onFocus={markDetailFieldFocused} style={[styles.kycInput, responsive.isCompact && styles.kycInputCompact, responsive.isSmall && styles.kycInputSmall]} placeholder={copy.nameAsPerBank} />
            </View>
            <View style={styles.kycInputGroup}>
              <Text style={[styles.fieldLabel, responsive.isCompact && styles.fieldLabelCompact, responsive.isSmall && styles.fieldLabelSmall]}>{copy.accountNumber}</Text>
              <TextInput value={accountNumber} onChangeText={setAccountNumber} onFocus={markDetailFieldFocused} style={[styles.kycInput, responsive.isCompact && styles.kycInputCompact, responsive.isSmall && styles.kycInputSmall]} placeholder={bankDetails?.accountNumberMasked || copy.enterAccountNumber} keyboardType="numeric" secureTextEntry />
            </View>
            <View style={styles.kycInputGroup}>
              <Text style={[styles.fieldLabel, responsive.isCompact && styles.fieldLabelCompact, responsive.isSmall && styles.fieldLabelSmall]}>{copy.ifscCode}</Text>
              <TextInput value={ifsc} onChangeText={setIfsc} onFocus={markDetailFieldFocused} style={[styles.kycInput, responsive.isCompact && styles.kycInputCompact, responsive.isSmall && styles.kycInputSmall]} autoCapitalize="characters" placeholder="ABCD0123456" />
            </View>
            {bankError ? <Text style={styles.loginError}>{bankError}</Text> : null}
            {!showDetailKeyboardAction ? (
              <PrimaryButton title={busy ? copy.saving : docs?.bank ? copy.updateBank : copy.saveBank} icon="checkmark" onPress={submitBank} />
            ) : null}
          </View>
        ) : null}

        {page === 'language' ? <LanguageSwitcher language={language} onChangeLanguage={onChangeLanguage} /> : null}
        {page === 'legal' ? <PolicyList /> : null}
      </ScrollView>
      {showDetailKeyboardAction ? (
        <View
          style={[
            styles.profileDetailKeyboardFooter,
            responsive.isCompact && styles.profileDetailKeyboardFooterCompact,
            detailKeyboardOverlayInset > 0 && {
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: detailKeyboardOverlayInset
            }
          ]}
        >
          <View style={[styles.profileDetailKeyboardFooterInner, { maxWidth: responsive.contentMaxWidth }]}>
            {page === 'personal' ? (
              <PrimaryButton title={busy ? copy.saving : copy.saveChanges} icon="checkmark" onPress={submitPersonalDetails} />
            ) : null}
            {page === 'vehicle' ? (
              <PrimaryButton title={busy ? copy.saving : copy.saveChanges} icon="checkmark" onPress={submitVehicleDetails} />
            ) : null}
            {page === 'bank' ? (
              <PrimaryButton title={busy ? copy.saving : docs?.bank ? copy.updateBank : copy.saveBank} icon="checkmark" onPress={submitBank} />
            ) : null}
          </View>
        </View>
      ) : null}
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
  const responsive = useResponsiveLayout();
  return (
    <Pressable style={[styles.accountMenuRow, responsive.isCompact && styles.accountMenuRowCompact, last && styles.accountMenuRowLast]} onPress={onPress}>
      <View style={[styles.accountMenuIcon, responsive.isCompact && styles.accountMenuIconCompact]}>
        <Ionicons name={icon} size={responsive.isCompact ? 17 : 20} color={colors.partner} />
      </View>
      <View style={styles.flex}>
        <Text style={[styles.cardTitle, responsive.isCompact && styles.cardTitleCompact, responsive.isSmall && styles.cardTitleSmall]}>{title}</Text>
        <Text style={[styles.mutedSmall, responsive.isCompact && styles.mutedSmallCompact, responsive.isSmall && styles.mutedSmallScreenText]} numberOfLines={2}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={responsive.isCompact ? 16 : 18} color={colors.muted} />
    </Pressable>
  );
}

function AccountDetailHeader({ title, subtitle, onBack }: { title: string; subtitle: string; onBack: () => void }) {
  const responsive = useResponsiveLayout();
  return (
    <View style={[styles.accountDetailHeader, responsive.isCompact && styles.accountDetailHeaderCompact]}>
      <Pressable style={[styles.accountBackButton, responsive.isCompact && styles.accountBackButtonCompact]} onPress={onBack}>
        <Ionicons name="arrow-back" size={responsive.isCompact ? 18 : 21} color={colors.white} />
      </Pressable>
      <View style={styles.flex}>
        <Text style={[styles.accountDetailTitle, responsive.isCompact && styles.accountDetailTitleCompact, responsive.isSmall && styles.accountDetailTitleSmall]}>{title}</Text>
        <Text style={[styles.accountDetailSubtitle, responsive.isCompact && styles.accountDetailSubtitleCompact, responsive.isSmall && styles.accountDetailSubtitleSmall]} numberOfLines={2}>{subtitle}</Text>
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
  const responsive = useResponsiveLayout();
  return (
    <View style={[styles.languageCard, (compact || responsive.isCompact) && styles.languageCardCompact]}>
      <View style={styles.languageHeader}>
        <Ionicons name="language-outline" size={18} color={colors.partner} />
        <View style={styles.flex}>
          <Text style={[styles.cardTitle, responsive.isCompact && styles.cardTitleCompact, responsive.isSmall && styles.cardTitleSmall]}>{copy.changeLanguage}</Text>
          <Text style={[styles.mutedSmall, responsive.isCompact && styles.mutedSmallCompact, responsive.isSmall && styles.mutedSmallScreenText]}>{languageNativeLabel(language)}</Text>
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
              <Text style={[styles.languagePillText, responsive.isCompact && styles.languagePillTextCompact, responsive.isSmall && styles.languagePillTextSmall, active && styles.languagePillTextActive]}>
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
  const responsive = useResponsiveLayout();
  return (
    <Pressable style={[styles.kycStepCard, responsive.isCompact && styles.kycStepCardCompact, done && styles.kycStepDone]} onPress={onPress}>
      <View style={[styles.kycStepIcon, responsive.isCompact && styles.kycStepIconCompact, done && styles.kycStepIconDone]}>
        <Ionicons name={done ? 'checkmark' : icon} size={responsive.isCompact ? 17 : 20} color={done ? colors.white : colors.partner} />
      </View>
      <View style={styles.flex}>
        <Text style={[styles.cardTitle, responsive.isCompact && styles.cardTitleCompact, responsive.isSmall && styles.cardTitleSmall]}>{title}</Text>
        <Text style={[styles.mutedSmall, responsive.isCompact && styles.mutedSmallCompact, responsive.isSmall && styles.mutedSmallScreenText]}>{subtitle}</Text>
      </View>
      <Text style={[styles.kycActionText, responsive.isCompact && styles.kycActionTextCompact, responsive.isSmall && styles.kycActionTextSmall, done && styles.docDoneText]}>
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
      {partnerLegalPolicies.map((policy) => (
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
  const responsive = useResponsiveLayout();
  const icons: Record<LegalPolicy['id'], keyof typeof Ionicons.glyphMap> = {
    privacy: 'lock-closed',
    terms: 'document-text',
    refunds: 'cash'
  };

  return (
    <View style={[styles.policyCard, responsive.isCompact && styles.policyCardCompact]}>
      <Pressable style={[styles.policyHeader, responsive.isCompact && styles.policyHeaderCompact]} onPress={onToggle}>
        <View style={[styles.policyIcon, responsive.isCompact && styles.policyIconCompact]}>
          <Ionicons name={icons[policy.id]} size={responsive.isSmall ? 14 : responsive.isCompact ? 16 : 18} color={colors.partner} />
        </View>
        <View style={styles.flex}>
          <Text style={[styles.cardTitle, responsive.isCompact && styles.cardTitleCompact, responsive.isSmall && styles.cardTitleSmall]}>{policy.title}</Text>
          <Text style={[styles.mutedSmall, responsive.isCompact && styles.mutedSmallCompact, responsive.isSmall && styles.mutedSmallScreenText]}>{copy.updated} {policy.updatedAt}</Text>
          <Text style={[styles.policySummary, responsive.isCompact && styles.policySummaryCompact, responsive.isSmall && styles.policySummarySmall]}>{policy.summary}</Text>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
      </Pressable>
      {expanded ? (
        <View style={styles.policyBody}>
          {policy.sections.map((section) => (
            <View key={section.heading} style={styles.policySection}>
              <Text style={[styles.policyHeading, responsive.isCompact && styles.policyHeadingCompact, responsive.isSmall && styles.policyHeadingSmall]}>{section.heading}</Text>
              {section.body.map((line) => (
                <Text key={line} style={[styles.policyText, responsive.isCompact && styles.policyTextCompact, responsive.isSmall && styles.policyTextSmall]}>{line}</Text>
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
  const responsive = useResponsiveLayout();
  const compact = responsive.isCompact;
  const { bottom: bottomInset } = useSafeAreaInsets();
  const tabs: Array<[Tab, keyof typeof Ionicons.glyphMap, string, number?]> = [
    ['dashboard', 'home', copy.home],
    ['active', 'navigate', copy.active, activeCount],
    ['earnings', 'wallet', copy.earn],
    ['profile', 'person', copy.profile]
  ];
  return (
    <View style={[
      styles.tabs,
      compact && styles.tabsCompact,
      { height: responsive.tabBarHeight + bottomInset, paddingBottom: bottomInset }
    ]}>
      <View style={[styles.tabsInner, { maxWidth: Math.min(720, responsive.contentMaxWidth) }]}>
        {tabs.map(([key, icon, label, count]) => {
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
                <Ionicons name={icon} size={responsive.isSmall ? 17 : compact ? 19 : 22} color={selected ? colors.partner : colors.muted} />
                {count ? (
                  <View style={[styles.tabBadge, compact && styles.tabBadgeCompact]}>
                    <Text style={styles.tabBadgeText}>{count}</Text>
                  </View>
                ) : null}
              </View>
              <Text numberOfLines={2} style={[styles.tabText, compact && styles.tabTextCompact, responsive.isSmall && styles.tabTextSmall, selected && styles.tabTextActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
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
  const responsive = useResponsiveLayout();
  return (
    <Pressable style={[styles.primaryButton, responsive.isCompact && styles.primaryButtonCompact, responsive.isSmall && styles.primaryButtonSmall]} onPress={onPress}>
      <Ionicons name={icon} size={responsive.isSmall ? 13 : responsive.isCompact ? 15 : 17} color={colors.white} />
      <Text style={[styles.primaryButtonText, responsive.isCompact && styles.primaryButtonTextCompact, responsive.isSmall && styles.primaryButtonTextSmall]}>{title}</Text>
    </Pressable>
  );
}

function SecondaryButton({
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
      style={[styles.secondaryButton, responsive.isCompact && styles.secondaryButtonCompact, responsive.isSmall && styles.secondaryButtonSmall, disabled && { opacity: 0.65 }]}
      onPress={onPress}
      disabled={disabled}
      accessibilityState={{ disabled, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.ink} />
      ) : (
        <Ionicons name={icon} size={responsive.isSmall ? 13 : responsive.isCompact ? 15 : 17} color={colors.ink} />
      )}
      <Text style={[styles.secondaryButtonText, responsive.isCompact && styles.secondaryButtonTextCompact, responsive.isSmall && styles.secondaryButtonTextSmall]}>{title}</Text>
    </Pressable>
  );
}

function SectionTitle({ title }: { title: string }) {
  const responsive = useResponsiveLayout();
  return <Text style={[styles.sectionTitle, responsive.isCompact && styles.sectionTitleCompact, responsive.isSmall && styles.sectionTitleSmall]}>{title}</Text>;
}

function StatCard({ title, value, tone }: { title: string; value: string; tone: 'green' | 'blue' | 'amber' }) {
  const responsive = useResponsiveLayout();
  const palette = {
    green: [colors.partnerLight, colors.partner],
    blue: ['#DBEAFE', colors.blue],
    amber: ['#FEF3C7', colors.amber]
  }[tone];
  return (
    <View style={[styles.statCard, responsive.isCompact && styles.statCardCompact, responsive.isSmall && styles.statCardSmall, { backgroundColor: palette[0] }]}>
      <Text style={[styles.statValue, responsive.isCompact && styles.statValueCompact, responsive.isSmall && styles.statValueSmall, { color: palette[1] }]}>{value}</Text>
      <Text style={[styles.statLabel, responsive.isCompact && styles.statLabelCompact, responsive.isSmall && styles.statLabelSmall, { color: palette[1] }]} numberOfLines={2}>{title}</Text>
    </View>
  );
}

function OrderCard({ order }: { order: Order }) {
  const responsive = useResponsiveLayout();
  return (
    <View style={[styles.orderCard, responsive.isCompact && styles.orderCardCompact]}>
      <OrderHeader order={order} />
      <RouteBlock order={order} />
      <View style={styles.between}>
        <Text style={[styles.mutedSmall, responsive.isCompact && styles.mutedSmallCompact, responsive.isSmall && styles.mutedSmallScreenText]}>{order.vehicle.shortName} - {order.distanceKm} km</Text>
        <Text style={[styles.priceText, responsive.isCompact && styles.priceTextCompact, responsive.isSmall && styles.priceTextSmall]}>{money(order.fare.partnerNet)}</Text>
      </View>
    </View>
  );
}

function OrderHeader({ order }: { order: Order }) {
  const copy = useCopy();
  const language = useLanguage();
  const responsive = useResponsiveLayout();
  return (
    <View style={[styles.between, responsive.isCompact && styles.betweenCompact]}>
      <View style={styles.flex}>
        <Text style={[styles.orderNo, responsive.isCompact && styles.orderNoCompact, responsive.isSmall && styles.orderNoSmall]}>{order.orderNo}</Text>
        <Text style={[styles.cardTitle, responsive.isCompact && styles.cardTitleCompact, responsive.isSmall && styles.cardTitleSmall]} numberOfLines={1}>{order.customer?.name || copy.customer}</Text>
      </View>
      <Badge label={orderStatusLabel(language, order.status)} />
    </View>
  );
}

function ActiveOrderContacts({ order }: { order: Order }) {
  const copy = useCopy();
  const responsive = useResponsiveLayout();
  const customerName = order.customer?.name || copy.customer;
  const customerPhone = order.customer?.phone;
  const contactRows = [
    { key: 'customer', icon: 'person-circle-outline' as const, label: copy.customer, name: customerName, phone: customerPhone },
    { key: 'pickup', icon: 'radio-button-on' as const, label: copy.pickup, name: order.pickup.contactName, phone: order.pickup.contactPhone },
    { key: 'drop', icon: 'location' as const, label: copy.drop, name: order.drop.contactName, phone: order.drop.contactPhone }
  ].filter((row) => row.name || row.phone);

  if (!contactRows.length) return null;

  return (
    <View style={[styles.activeContactCard, responsive.isCompact && styles.activeContactCardCompact]}>
      {contactRows.map((row) => (
        <View key={row.key} style={[styles.activeContactRow, responsive.isCompact && styles.activeContactRowCompact]}>
          <Ionicons name={row.icon} size={responsive.isCompact ? 16 : 18} color={colors.partner} />
          <View style={styles.flex}>
            <Text style={[styles.activeContactLabel, responsive.isCompact && styles.activeContactLabelCompact, responsive.isSmall && styles.activeContactLabelSmall]}>{row.label}</Text>
            <Text style={[styles.activeContactValue, responsive.isCompact && styles.activeContactValueCompact, responsive.isSmall && styles.activeContactValueSmall]} numberOfLines={1}>
              {[row.name, row.phone].filter(Boolean).join(' - ')}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function RouteBlock({ order }: { order: Order }) {
  const copy = useCopy();
  const responsive = useResponsiveLayout();
  return (
    <View>
      <View style={[styles.route, responsive.isCompact && styles.routeCompact]}>
        <View style={[styles.routeDot, responsive.isCompact && styles.routeDotCompact]} />
        <View style={styles.flex}>
          <Text style={[styles.routeText, responsive.isCompact && styles.routeTextCompact, responsive.isSmall && styles.routeTextSmall]} numberOfLines={2}>{order.pickup.label}</Text>
          <Text style={[styles.mutedSmall, responsive.isCompact && styles.mutedSmallCompact, responsive.isSmall && styles.mutedSmallScreenText]}>{copy.pickup}</Text>
        </View>
      </View>
      <View style={[styles.route, responsive.isCompact && styles.routeCompact]}>
        <View style={[styles.routeDot, responsive.isCompact && styles.routeDotCompact, styles.routeDotGreen]} />
        <View style={styles.flex}>
          <Text style={[styles.routeText, responsive.isCompact && styles.routeTextCompact, responsive.isSmall && styles.routeTextSmall]} numberOfLines={2}>{order.drop.label}</Text>
          <Text style={[styles.mutedSmall, responsive.isCompact && styles.mutedSmallCompact, responsive.isSmall && styles.mutedSmallScreenText]}>{copy.drop}</Text>
        </View>
      </View>
    </View>
  );
}

function Badge({ label }: { label: string }) {
  const responsive = useResponsiveLayout();
  return (
    <View style={[styles.badge, responsive.isCompact && styles.badgeCompact]}>
      <Text style={[styles.badgeText, responsive.isCompact && styles.badgeTextCompact, responsive.isSmall && styles.badgeTextSmall]} numberOfLines={2}>{label}</Text>
    </View>
  );
}

function Chip({ label }: { label: string }) {
  const responsive = useResponsiveLayout();
  return (
    <View style={[styles.chip, responsive.isCompact && styles.chipCompact]}>
      <Text style={[styles.chipText, responsive.isCompact && styles.chipTextCompact, responsive.isSmall && styles.chipTextSmall]}>{label}</Text>
    </View>
  );
}

function PanicSheet({
  visible,
  onClose,
  onCall
}: {
  visible: boolean;
  onClose: () => void;
  onCall: (phoneNumber: string) => void;
}) {
  const copy = useCopy();
  const { bottom: bottomInset } = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.panicOverlay} onPress={onClose}>
        <Pressable
          style={[styles.panicSheet, { paddingBottom: Math.max(24, bottomInset + 12) }]}
          onPress={(event) => event.stopPropagation()}
        >
          <View style={styles.panicHandle} />

          <View style={styles.panicHero}>
            <View style={styles.panicHeroTop}>
              <View style={styles.panicBadge}>
                <Ionicons name="shield-checkmark" size={26} color={colors.white} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.panicHeroLabel}>{copy.panic}</Text>
                <Text style={styles.panicTitle}>{copy.emergencyHelp}</Text>
              </View>
              <Pressable style={styles.panicCloseButton} onPress={onClose}>
                <Ionicons name="close" size={18} color={colors.ink} />
              </Pressable>
            </View>
            <Text style={styles.panicHeroText}>{copy.emergencyHelpBody}</Text>
          </View>

          <View style={styles.panicWarning}>
            <Ionicons name="information-circle" size={18} color={colors.amber} />
            <Text style={styles.panicWarningText}>{copy.emergencyWarning}</Text>
          </View>

          <View style={styles.panicCallGrid}>
            <Pressable style={[styles.panicCallCard, styles.panicAmbulanceCard]} onPress={() => onCall('108')}>
              <View style={[styles.panicCallIcon, styles.panicAmbulanceIcon]}>
                <Ionicons name="medical" size={24} color={colors.white} />
              </View>
              <Text style={styles.panicCallTitle}>{copy.callAmbulance}</Text>
              <Text style={styles.panicCallSubtitle}>{copy.ambulanceHint}</Text>
              <View style={styles.panicCallNowPill}>
                <Ionicons name="call" size={14} color={colors.white} />
                <Text style={styles.panicCallNowText}>{copy.callNow}</Text>
              </View>
            </Pressable>

            <Pressable style={[styles.panicCallCard, styles.panicPoliceCard]} onPress={() => onCall('112')}>
              <View style={[styles.panicCallIcon, styles.panicPoliceIcon]}>
                <Ionicons name="shield-checkmark" size={24} color={colors.white} />
              </View>
              <Text style={styles.panicCallTitle}>{copy.callPolice}</Text>
              <Text style={styles.panicCallSubtitle}>{copy.policeHint}</Text>
              <View style={[styles.panicCallNowPill, styles.panicPoliceCallNowPill]}>
                <Ionicons name="call" size={14} color={colors.white} />
                <Text style={styles.panicCallNowText}>{copy.callNow}</Text>
              </View>
            </Pressable>
          </View>

          <Pressable style={styles.panicCancelButton} onPress={onClose}>
            <Text style={styles.panicCancelText}>{copy.cancel}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function MapPreview({
  api,
  orderId,
  pickup,
  drop,
  extraStops = [],
  eta,
  partnerLocation
}: {
  api: IndieryApi;
  orderId: string;
  pickup: LocationPoint;
  drop: LocationPoint;
  extraStops?: LocationPoint[];
  eta: number;
  partnerLocation?: Order['partnerLocation'];
}) {
  const copy = useCopy();
  const responsive = useResponsiveLayout();
  const [expanded, setExpanded] = useState(false);
  const [exactRoute, setExactRoute] = useState<PartnerRoutePath | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState('');
  const hasLiveLocation = hasValidCoordinates(partnerLocation?.lat, partnerLocation?.lng);
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
  const fitCoordinates = partnerCoordinate
    ? [...routePoints.map((item) => item.coordinate), partnerCoordinate]
    : routePoints.map((item) => item.coordinate);
  const firstCoordinate = fitCoordinates[0];
  const canRenderNativeMap = (Platform.OS !== 'android' || Boolean(googleMapsApiKey)) && Boolean(firstCoordinate);
  const initialRegion: Region = {
    latitude: firstCoordinate?.latitude ?? defaultMapCenter.lat,
    longitude: firstCoordinate?.longitude ?? defaultMapCenter.lng,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05
  };
  const mapRef = useRef<React.ElementRef<typeof MapView> | null>(null);
  const expandedMapRef = useRef<React.ElementRef<typeof MapView> | null>(null);
  const fitKey = fitCoordinates.map((coordinate) => `${coordinate.latitude.toFixed(5)},${coordinate.longitude.toFixed(5)}`).join('|');
  const exactRouteCoordinates = exactRoute?.coordinates.length ? exactRoute.coordinates : routePoints.map((item) => item.coordinate);
  const expandedFitCoordinates = partnerCoordinate
    ? [...exactRouteCoordinates, partnerCoordinate]
    : exactRouteCoordinates;
  const expandedFitKey = [
    orderId,
    exactRoute?.source ?? 'pending',
    expandedFitCoordinates.length,
    expandedFitCoordinates[0]?.latitude,
    expandedFitCoordinates[0]?.longitude,
    expandedFitCoordinates[expandedFitCoordinates.length - 1]?.latitude,
    expandedFitCoordinates[expandedFitCoordinates.length - 1]?.longitude,
    partnerCoordinate?.latitude,
    partnerCoordinate?.longitude
  ].join('|');

  useEffect(() => {
    setExpanded(false);
    setExactRoute(null);
    setRouteError('');
    setRouteLoading(false);
  }, [orderId]);

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

  useEffect(() => {
    if (!expanded || !canRenderNativeMap || !expandedMapRef.current || !expandedFitCoordinates.length) return;
    const timer = setTimeout(() => {
      if (expandedFitCoordinates.length === 1) {
        expandedMapRef.current?.animateToRegion({ ...initialRegion, ...expandedFitCoordinates[0] }, 250);
        return;
      }
      expandedMapRef.current?.fitToCoordinates(expandedFitCoordinates, {
        edgePadding: { top: 90, right: 48, bottom: 150, left: 48 },
        animated: true
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [canRenderNativeMap, expanded, expandedFitKey]);

  async function openExpandedMap() {
    setExpanded(true);
    if (exactRoute || routeLoading) return;
    setRouteLoading(true);
    setRouteError('');
    try {
      const route = await api.partnerOrderRoute(orderId);
      setExactRoute(route);
      if (route.source !== 'google_directions') setRouteError(copy.exactRouteUnavailable);
    } catch (err) {
      setRouteError(err instanceof Error ? err.message : copy.exactRouteUnavailable);
    } finally {
      setRouteLoading(false);
    }
  }

  function renderRouteMarkers() {
    return (
      <>
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
      </>
    );
  }

  return (
    <>
    <View style={[styles.map, responsive.isCompact && styles.mapCompact, responsive.isSmall && styles.mapSmall]}>
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
              strokeColor={colors.partner}
              strokeWidth={4}
            />
          ) : null}
          {renderRouteMarkers()}
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
      <Pressable
        style={styles.mapExpandButton}
        onPress={openExpandedMap}
        accessibilityRole="button"
        accessibilityLabel={copy.maximizeMap}
      >
        <Ionicons name="expand-outline" size={20} color={colors.partner} />
      </Pressable>
      <Text style={[styles.mapText, styles.mapTextWithAction]} numberOfLines={1}>
        {pickup.label} {'->'} {stopLabel ? `${stopLabel} -> ` : ''}{drop.label}
      </Text>
    </View>
    <Modal
      visible={expanded}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={() => setExpanded(false)}
    >
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} translucent={false} />
      <SafeAreaView edges={appSafeAreaEdges} style={styles.expandedRouteShell}>
        <View style={styles.expandedRouteMap}>
          {canRenderNativeMap ? (
            <MapView
              ref={expandedMapRef}
              provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
              style={styles.mapNativeView}
              initialRegion={initialRegion}
              rotateEnabled={false}
              pitchEnabled={false}
              toolbarEnabled={false}
            >
              {exactRouteCoordinates.length > 1 ? (
                <Polyline
                  coordinates={exactRouteCoordinates}
                  strokeColor={colors.partner}
                  strokeWidth={5}
                  lineCap="round"
                  lineJoin="round"
                />
              ) : null}
              {renderRouteMarkers()}
            </MapView>
          ) : (
            <View style={styles.expandedRouteFallback}>
              <Ionicons name="map-outline" size={42} color={colors.partner} />
              <Text style={styles.expandedRouteFallbackText}>{copy.exactRouteUnavailable}</Text>
            </View>
          )}

          <View style={styles.expandedRouteHeaderCard}>
            <View style={styles.expandedRouteHeaderIcon}>
              {routeLoading ? (
                <ActivityIndicator size="small" color={colors.partner} />
              ) : (
                <Ionicons name="navigate" size={19} color={colors.partner} />
              )}
            </View>
            <View style={styles.flex}>
              <Text style={styles.expandedRouteTitle}>
                {routeLoading ? copy.loadingExactRoute : copy.exactRoadRoute}
              </Text>
              <Text style={styles.expandedRouteSubtitle} numberOfLines={2}>
                {pickup.label} {'->'} {stopLabel ? `${stopLabel} -> ` : ''}{drop.label}
              </Text>
              {routeError ? <Text style={styles.expandedRouteError}>{routeError}</Text> : null}
            </View>
          </View>

          <Pressable
            style={styles.expandedRouteMinimizeButton}
            onPress={() => setExpanded(false)}
            accessibilityRole="button"
            accessibilityLabel={copy.minimizeMap}
          >
            <Ionicons name="contract-outline" size={22} color={colors.partner} />
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
    </>
  );
}

function Timeline({ order }: { order: Order }) {
  const language = useLanguage();
  const responsive = useResponsiveLayout();
  return (
    <View style={[styles.orderCard, responsive.isCompact && styles.orderCardCompact]}>
      {order.timeline.map((item) => (
        <View key={item.key} style={[styles.timelineItem, responsive.isCompact && styles.timelineItemCompact]}>
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
            <Text style={[styles.timelineTitle, responsive.isCompact && styles.timelineTitleCompact, responsive.isSmall && styles.timelineTitleSmall]}>{timelineTitle(language, item.key, item.title)}</Text>
            {item.note ? <Text style={[styles.mutedSmall, responsive.isCompact && styles.mutedSmallCompact, responsive.isSmall && styles.mutedSmallScreenText]}>{timelineNote(language, item.key, item.note)}</Text> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

function FareLine({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  const responsive = useResponsiveLayout();
  return (
    <View style={[styles.between, responsive.isCompact && styles.betweenCompact]}>
      <Text style={[styles.fareLabel, bold && styles.bold, responsive.isCompact && styles.fareLabelCompact, responsive.isSmall && styles.fareLabelSmall]}>{label}</Text>
      <Text style={[styles.fareValue, bold && styles.bold, responsive.isCompact && styles.fareValueCompact, responsive.isSmall && styles.fareValueSmall]}>{value}</Text>
    </View>
  );
}

function Empty({ icon, title, subtitle }: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string }) {
  const responsive = useResponsiveLayout();
  return (
    <View style={[styles.empty, responsive.isCompact && styles.emptyCompact, responsive.isSmall && styles.emptySmall]}>
      <Ionicons name={icon} size={responsive.isSmall ? 30 : responsive.isCompact ? 34 : 42} color={colors.muted} />
      <Text style={[styles.emptyTitle, responsive.isCompact && styles.emptyTitleCompact, responsive.isSmall && styles.emptyTitleSmall]}>{title}</Text>
      <Text style={[styles.muted, responsive.isCompact && styles.mutedCompact, responsive.isSmall && styles.mutedSmallScreen]}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.white, paddingTop: androidStatusBarInset },
  loginShell: { flex: 1, backgroundColor: colors.white, paddingTop: androidStatusBarInset },
  authKeyboard: { flex: 1 },
  androidKeyboardFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 30
  },
  authScrollViewport: { flex: 1 },
  authScroll: { flexGrow: 1, backgroundColor: colors.white },
  authResponsiveFrame: { width: '100%', alignSelf: 'center', flexGrow: 1 },
  loginPhoneLayout: { flex: 1, backgroundColor: colors.white },
  loginPhoneKeyboardScrollContent: { paddingBottom: 88 },
  loginPhoneFormContent: {
    width: '100%',
    alignSelf: 'center',
    flexGrow: 1,
    backgroundColor: colors.white,
    paddingHorizontal: 22,
    paddingTop: 30,
    paddingBottom: 26
  },
  loginPhoneFormContentCompact: { paddingHorizontal: 16, paddingTop: 22, paddingBottom: 20 },
  loginPhoneFormContentSmall: { paddingHorizontal: 14, paddingTop: 18, paddingBottom: 18 },
  loginPhoneFormContentKeyboard: { paddingTop: 6, paddingBottom: 6 },
  loginPhoneHeadingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12
  },
  loginPhoneHeadingRowCompact: { gap: 8 },
  loginPhoneHeadingCopy: { flex: 1, minWidth: 0 },
  loginPhoneKicker: { fontWeight: '600' },
  loginPhoneTitle: { fontWeight: '700' },
  loginPhoneKeyboardTitle: { fontSize: 22, lineHeight: 26, marginBottom: 4 },
  loginPhoneKeyboardTitleCompact: { fontSize: 19, lineHeight: 23 },
  loginPhoneKeyboardTitleSmall: { fontSize: 18, lineHeight: 22 },
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
    elevation: 8,
    zIndex: 30
  },
  loginPhoneKeyboardFooterCompact: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 7 },
  loginPhoneKeyboardFooterSmall: { paddingHorizontal: 14, paddingTop: 7, paddingBottom: 6 },
  loginPhoneKeyboardFooterInner: { width: '100%', alignSelf: 'center' },
  loginConsent: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', columnGap: 4, rowGap: 2, marginTop: 12, marginBottom: 0, paddingHorizontal: 6 },
  loginPhoneKeyboardConsent: { marginTop: 9 },
  loginConsentText: { color: colors.muted, fontSize: 10, fontWeight: '500', lineHeight: 15 },
  loginConsentLink: { color: colors.partner, fontSize: 10, fontWeight: '700', lineHeight: 15, textDecorationLine: 'underline' },
  loginPolicyShell: { flex: 1, backgroundColor: colors.white, paddingTop: androidStatusBarInset },
  loginLanguageToggle: {
    minHeight: 32,
    maxWidth: 124,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 9,
    backgroundColor: '#F0FDF4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 9,
    marginTop: -2
  },
  loginLanguageToggleText: {
    flexShrink: 1,
    color: colors.partner,
    fontSize: 11,
    fontWeight: '700'
  },
  profileSetupScroll: { flexGrow: 1, backgroundColor: colors.white },
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
  loginHeroCaption: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
    marginTop: 5,
    maxWidth: 140
  },
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
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 26
  },
  authKicker: { color: colors.partner, fontSize: 12, fontWeight: '900', textTransform: 'uppercase', marginBottom: 8 },
  authKickerCompact: { fontSize: 10, marginBottom: 6 },
  authKickerSmall: { fontSize: 9, marginBottom: 5 },
  authTitle: { color: colors.ink, fontSize: 32, fontWeight: '900', marginBottom: 6 },
  authTitleCompact: { fontSize: 26, lineHeight: 31, marginBottom: 5 },
  authTitleSmall: { fontSize: 24, lineHeight: 29, marginBottom: 4 },
  authFieldGroup: { marginBottom: 14 },
  authFieldGroupCompact: { marginBottom: 10 },
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
  authInputShellCompact: { minHeight: 46, borderRadius: 13, gap: 8, paddingHorizontal: 11 },
  authInputReadonly: { backgroundColor: colors.faint },
  authInputText: { flex: 1, color: colors.ink, fontSize: 16, fontWeight: '800', paddingVertical: 12 },
  authInputTextCompact: { fontSize: 13, paddingVertical: 9 },
  authInputTextSmall: { fontSize: 12, paddingVertical: 8 },
  vehicleChoiceList: { gap: 8 },
  vehicleChoiceListCompact: { gap: 6 },
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
  vehicleChoiceCompact: { minHeight: 46, borderRadius: 12, gap: 8, paddingHorizontal: 10, paddingVertical: 8 },
  vehicleChoiceTitle: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  vehicleChoiceTitleCompact: { fontSize: 12 },
  vehicleChoiceTitleSmall: { fontSize: 10 },
  vehicleChoiceMeta: { color: colors.muted, fontSize: 11, fontWeight: '800', marginTop: 2 },
  vehicleChoiceMetaCompact: { fontSize: 9, marginTop: 1 },
  vehicleChoiceMetaSmall: { fontSize: 8 },
  onboardingStepperCard: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    backgroundColor: colors.white,
    paddingHorizontal: 11,
    paddingVertical: 9,
    marginBottom: 10
  },
  onboardingFixedSection: {
    flexShrink: 0,
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.line
  },
  onboardingFixedSectionCompact: { paddingTop: 6, paddingBottom: 6 },
  onboardingFixedStepperCard: { marginBottom: 0 },
  onboardingFixedStepperCardCompact: { paddingVertical: 7 },
  onboardingStepperRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 2 },
  onboardingStepperItem: { width: 72, alignItems: 'center' },
  onboardingStepperLine: { flex: 1, borderTopWidth: 1, borderStyle: 'dashed', borderColor: colors.line, marginTop: 14 },
  onboardingStepperLineDone: { borderColor: colors.partner },
  onboardingStepperCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.faint,
    alignItems: 'center',
    justifyContent: 'center'
  },
  onboardingStepperCircleActive: { borderColor: colors.partner, backgroundColor: colors.white },
  onboardingStepperCircleDone: { borderColor: colors.partner, backgroundColor: colors.partner },
  onboardingStepperNumber: { color: colors.muted, fontSize: 11, fontWeight: '900' },
  onboardingStepperNumberSmall: { fontSize: 9 },
  onboardingStepperNumberActive: { color: colors.partner },
  onboardingStepperLabel: { color: colors.muted, fontSize: 10, fontWeight: '900', marginTop: 3, textAlign: 'center' },
  onboardingStepperLabelCompact: { fontSize: 9, marginTop: 2 },
  onboardingStepperLabelSmall: { fontSize: 8, marginTop: 1 },
  onboardingStepperLabelActive: { color: colors.partner },
  onboardingStepCard: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.white, padding: 14, marginBottom: 12 },
  onboardingStepHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  onboardingStepIntro: { marginBottom: 12 },
  onboardingNavRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 2 },
  onboardingPersonalKeyboardScroll: { paddingBottom: 96 },
  onboardingPersonalKeyboardFooter: {
    flexShrink: 0,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingHorizontal: 16,
    paddingTop: 10,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -3 },
    elevation: 8
  },
  onboardingPersonalKeyboardFooterInner: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 10
  },
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
  phoneInputShellSmall: { minHeight: 48, paddingHorizontal: 10 },
  countryCode: { color: colors.ink, fontSize: 14, fontWeight: '600', marginLeft: 7 },
  countryCodeCompact: { fontSize: 12, marginLeft: 5 },
  phoneDivider: { width: 1, height: 24, backgroundColor: colors.line, marginHorizontal: 10 },
  phoneInputText: { flex: 1, color: colors.ink, fontSize: 13, fontWeight: '500', paddingVertical: 12 },
  phoneInputTextCompact: { fontSize: 12, paddingVertical: 10 },
  authPrimaryButton: {
    width: '100%',
    minHeight: 50,
    borderRadius: 8,
    backgroundColor: colors.partner,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16
  },
  authPrimaryButtonCompact: { minHeight: 44, paddingHorizontal: 14 },
  authPrimaryButtonSmall: { minHeight: 44, paddingHorizontal: 12 },
  authPrimaryButtonDisabled: { backgroundColor: '#A7DCC9' },
  authPrimaryButtonText: { color: colors.white, fontSize: 14, fontWeight: '600' },
  authPrimaryButtonTextCompact: { fontSize: 12 },
  authPrimaryButtonTextSmall: { fontSize: 11 },
  authPrimaryButtonTextDisabled: { color: 'rgba(255,255,255,0.86)' },
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
  partnerOtpLayout: { flex: 1, backgroundColor: colors.white },
  partnerOtpScroll: { paddingBottom: 24 },
  partnerOtpKeyboardScroll: { paddingBottom: 88 },
  partnerOtpForm: { paddingTop: 18 },
  partnerOtpFormCompact: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20 },
  partnerOtpFormSmall: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 18 },
  partnerOtpBackButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: colors.faint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22
  },
  partnerOtpBackButtonCompact: { width: 35, height: 35, borderRadius: 11, marginBottom: 15 },
  partnerOtpBackButtonSmall: { width: 33, height: 33, marginBottom: 13 },
  partnerOtpIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.partnerLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14
  },
  partnerOtpIconCompact: { width: 42, height: 42, borderRadius: 14, marginBottom: 11 },
  partnerOtpIconSmall: { width: 40, height: 40, borderRadius: 13, marginBottom: 10 },
  partnerOtpTitle: { color: colors.ink, fontSize: 28, fontWeight: '700', marginBottom: 7 },
  partnerOtpTitleCompact: { fontSize: 23, lineHeight: 28, marginBottom: 5 },
  partnerOtpTitleSmall: { fontSize: 21, lineHeight: 26, marginBottom: 4 },
  partnerOtpSubtitle: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 19
  },
  partnerOtpSubtitleCompact: { fontSize: 11, lineHeight: 16 },
  partnerOtpSubtitleSmall: { fontSize: 10, lineHeight: 15 },
  partnerOtpDestinationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 3,
    marginBottom: 24
  },
  partnerOtpDestinationRowCompact: { gap: 6, marginTop: 2, marginBottom: 17 },
  partnerOtpDestinationRowSmall: { marginBottom: 15 },
  partnerOtpPhone: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  partnerOtpPhoneCompact: { fontSize: 11 },
  partnerOtpChange: { color: colors.partner, fontSize: 12, fontWeight: '700' },
  partnerOtpChangeCompact: { fontSize: 10 },
  partnerOtpField: { position: 'relative', marginBottom: 13 },
  partnerOtpBoxes: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 0
  },
  partnerOtpBoxesCompact: { gap: 0 },
  partnerOtpBoxesSmall: { gap: 0 },
  partnerOtpBox: {
    width: '15%',
    flexGrow: 0,
    flexShrink: 0,
    maxWidth: 52,
    height: 54,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center'
  },
  partnerOtpBoxCompact: { height: 50, borderRadius: 9 },
  partnerOtpBoxSmall: { height: 48, borderRadius: 8 },
  partnerOtpBoxFilled: { borderColor: '#86E6C3', backgroundColor: colors.white },
  partnerOtpBoxActive: {
    borderWidth: 1.5,
    borderColor: colors.partner,
    backgroundColor: colors.partnerLight
  },
  partnerOtpDigit: { color: colors.ink, fontSize: 20, fontWeight: '700' },
  partnerOtpDigitCompact: { fontSize: 17 },
  partnerOtpDigitSmall: { fontSize: 16 },
  partnerOtpHiddenInput: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    opacity: 0,
    color: 'transparent'
  },
  partnerOtpHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 18
  },
  partnerOtpHintRowCompact: { gap: 5, marginBottom: 14 },
  partnerOtpHint: {
    flex: 1,
    color: colors.muted,
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 15
  },
  partnerOtpHintCompact: { fontSize: 9, lineHeight: 13 },
  partnerOtpKeyboardFooter: {
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
  partnerOtpKeyboardFooterCompact: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 7 },
  partnerOtpKeyboardFooterSmall: { paddingHorizontal: 14, paddingTop: 7, paddingBottom: 6 },
  partnerOtpResendBlock: { alignItems: 'center', gap: 9, marginTop: 22 },
  partnerOtpResendBlockCompact: { gap: 7, marginTop: 16 },
  partnerOtpResendLabel: { color: colors.muted, fontSize: 11, fontWeight: '500' },
  partnerOtpResendLabelCompact: { fontSize: 9 },
  partnerOtpResendButton: {
    minHeight: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 15
  },
  partnerOtpResendButtonCompact: { minHeight: 34, borderRadius: 9, gap: 5, paddingHorizontal: 12 },
  partnerOtpResendButtonDisabled: { borderColor: colors.line, backgroundColor: colors.faint },
  partnerOtpResendText: { color: colors.partner, fontSize: 12, fontWeight: '700' },
  partnerOtpResendTextCompact: { fontSize: 10 },
  partnerOtpResendTextDisabled: { color: colors.muted },
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
  loginSubtitleCompact: { fontSize: 11, marginBottom: 17 },
  loginSubtitleSmall: { fontSize: 10, marginBottom: 15 },
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
  eyebrow: { color: '#D1FAE5', fontSize: 11, fontWeight: '700', letterSpacing: 0.35 },
  eyebrowCompact: { fontSize: 9, letterSpacing: 0.25 },
  eyebrowSmall: { fontSize: 8, letterSpacing: 0.2 },
  eyebrowDark: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1, textAlign: 'center' },
  eyebrowDarkCompact: { fontSize: 9, letterSpacing: 0.8 },
  eyebrowDarkSmall: { fontSize: 8, letterSpacing: 0.6 },
  headerTitle: { color: colors.white, fontSize: 23, fontWeight: '800', marginTop: 2 },
  headerTitleCompact: { fontSize: 20, marginTop: 1 },
  headerTitleSmall: { fontSize: 18 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerActionsCompact: { gap: 7 },
  panicButton: { minHeight: 42, borderRadius: 14, backgroundColor: colors.red, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)' },
  panicButtonCompact: { minHeight: 36, borderRadius: 12, paddingHorizontal: 8, gap: 4 },
  panicButtonSmall: { minHeight: 33, borderRadius: 11, paddingHorizontal: 7 },
  panicButtonText: { color: colors.white, fontSize: 12, fontWeight: '900' },
  panicButtonTextCompact: { fontSize: 10 },
  panicButtonTextSmall: { fontSize: 9 },
  panicOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.48)' },
  panicSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: colors.white, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 24, gap: 12 },
  panicHandle: { width: 48, height: 5, borderRadius: 999, backgroundColor: colors.line, alignSelf: 'center', marginBottom: 4 },
  panicHero: { borderRadius: 22, backgroundColor: colors.red, padding: 15, overflow: 'hidden' },
  panicHeroTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  panicBadge: { width: 50, height: 50, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)' },
  panicHeroLabel: { color: '#FEE2E2', fontSize: 11, fontWeight: '900', letterSpacing: 1.1 },
  panicTitle: { color: colors.white, fontSize: 21, fontWeight: '900' },
  panicHeroText: { color: '#FFF1F2', fontSize: 12, fontWeight: '700', lineHeight: 17, marginTop: 12 },
  panicCloseButton: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  panicWarning: { borderRadius: 16, backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 11 },
  panicWarningText: { flex: 1, color: '#92400E', fontSize: 12, fontWeight: '800', lineHeight: 17 },
  panicCallGrid: { flexDirection: 'row', gap: 10 },
  panicCallCard: { flex: 1, minHeight: 158, borderRadius: 20, borderWidth: 1, alignItems: 'flex-start', gap: 7, padding: 13 },
  panicAmbulanceCard: { borderColor: '#FECACA', backgroundColor: '#FEF2F2' },
  panicPoliceCard: { borderColor: '#BFDBFE', backgroundColor: '#EFF6FF' },
  panicCallIcon: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  panicAmbulanceIcon: { backgroundColor: colors.red },
  panicPoliceIcon: { backgroundColor: colors.customer },
  panicCallTitle: { color: colors.ink, fontSize: 15, fontWeight: '900' },
  panicCallSubtitle: { color: colors.muted, fontSize: 11, fontWeight: '700', lineHeight: 15 },
  panicCallNowPill: { marginTop: 'auto', minHeight: 34, borderRadius: 999, backgroundColor: colors.red, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 10, alignSelf: 'stretch' },
  panicPoliceCallNowPill: { backgroundColor: colors.customer },
  panicCallNowText: { color: colors.white, fontSize: 11, fontWeight: '900' },
  panicCancelButton: { minHeight: 46, borderRadius: 15, backgroundColor: colors.faint, alignItems: 'center', justifyContent: 'center' },
  panicCancelText: { color: colors.ink, fontSize: 13, fontWeight: '900' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.34)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#064E3B',
    shadowOpacity: 0.18,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2
  },
  avatarCompact: { width: 38, height: 38, borderRadius: 12 },
  avatarSmall: { width: 34, height: 34, borderRadius: 11 },
  avatarText: { color: colors.white, fontWeight: '700' },
  avatarTextCompact: { fontSize: 13 },
  avatarTextSmall: { fontSize: 11 },
  content: { flex: 1, width: '100%', alignSelf: 'center', marginTop: -14, backgroundColor: colors.white, borderTopLeftRadius: 22, borderTopRightRadius: 22, overflow: 'hidden' },
  partnerPageContent: {
    marginTop: -20,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    backgroundColor: 'transparent',
    overflow: 'hidden'
  },
  partnerPageCurveSurface: {
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
  partnerCurvedScrollViewport: {
    flex: 1,
    marginHorizontal: 14,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    overflow: 'hidden'
  },
  partnerCurvedScroll: { flex: 1 },
  partnerCurvedScrollContent: { paddingHorizontal: 0 },
  accountContent: { marginTop: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 },
  scroll: { padding: 16, paddingBottom: 96 },
  responsiveScreenContent: { width: '100%', alignSelf: 'center' },
  scrollCompact: { paddingTop: 12, paddingBottom: 78 },
  scrollSmall: { paddingTop: 10, paddingBottom: 72 },
  dashboardScreen: { flex: 1 },
  dashboardScroll: { flex: 1 },
  dashboardScrollContent: { paddingBottom: 24 },
  availabilityFooter: { flexShrink: 0, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.white, paddingTop: 10, paddingBottom: 10 },
  availabilityFooterCompact: { paddingTop: 7, paddingBottom: 7 },
  availabilityFooterInner: { width: '100%', alignSelf: 'center', gap: 8 },
  availabilityStatusRow: { minHeight: 22, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 4 },
  availabilityStatusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#94A3B8' },
  availabilityStatusDotOnline: { backgroundColor: colors.partner },
  availabilityStatusDotBlocked: { backgroundColor: colors.amber },
  availabilityStatusText: { color: colors.ink, fontSize: 12, fontWeight: '900', letterSpacing: 0.55 },
  availabilityStatusTextCompact: { fontSize: 11 },
  availabilityStatusTextOnline: { color: colors.partner },
  availabilityStatusTextBlocked: { color: '#92400E' },
  availabilityStatusMessage: { flex: 1, color: colors.muted, fontSize: 11, fontWeight: '700', textAlign: 'right' },
  availabilityStatusMessageCompact: { fontSize: 9 },
  availabilitySlider: { height: 62, borderRadius: 31, borderWidth: 2, backgroundColor: colors.white, justifyContent: 'center', overflow: 'hidden', padding: 4 },
  availabilitySliderCompact: { height: 54, borderRadius: 27 },
  availabilitySliderDisabled: { backgroundColor: '#FFFBEB' },
  availabilitySliderLabelWrap: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, paddingRight: 14 },
  availabilitySliderLabel: { fontSize: 14, fontWeight: '900', letterSpacing: 0.8 },
  availabilitySliderLabelCompact: { fontSize: 12 },
  availabilitySliderChevrons: { flexDirection: 'row', alignItems: 'center', marginLeft: 3 },
  availabilitySliderChevronOverlap: { marginLeft: -7 },
  availabilitySliderThumb: { position: 'absolute', zIndex: 2, left: 4, top: 4, width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', elevation: 3, shadowColor: '#0F172A', shadowOpacity: 0.18, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  availabilitySliderThumbCompact: { width: 42, height: 42, borderRadius: 21 },
  acceptOrderSlider: { height: 60, borderRadius: 30, borderWidth: 2, borderColor: colors.partner, backgroundColor: colors.partnerLight, justifyContent: 'center', overflow: 'hidden', padding: 4, marginBottom: 12 },
  acceptOrderSliderCompact: { height: 52, borderRadius: 26, marginBottom: 8 },
  acceptOrderSliderBusy: { opacity: 0.72 },
  acceptOrderSliderLabelWrap: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, paddingRight: 14 },
  acceptOrderSliderLabel: { flexShrink: 1, color: colors.partner, fontSize: 13, fontWeight: '900', letterSpacing: 0.35, textAlign: 'center' },
  acceptOrderSliderLabelCompact: { fontSize: 11 },
  acceptOrderSliderThumb: { position: 'absolute', zIndex: 2, left: 4, top: 4, width: 48, height: 48, borderRadius: 24, backgroundColor: colors.partner, alignItems: 'center', justifyContent: 'center', elevation: 3, shadowColor: '#0F172A', shadowOpacity: 0.18, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  acceptOrderSliderThumbCompact: { width: 42, height: 42, borderRadius: 21 },
  verificationPendingCard: {
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 18,
    backgroundColor: '#FFFBEB',
    padding: 15,
    marginBottom: 12
  },
  verificationPendingCardCompact: { borderRadius: 15, padding: 11, marginBottom: 9 },
  verificationPendingHeader: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  verificationPendingHeaderCompact: { gap: 9 },
  verificationPendingIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center'
  },
  verificationPendingIconCompact: { width: 38, height: 38, borderRadius: 12 },
  verificationPendingTitle: { color: colors.ink, fontSize: 16, fontWeight: '900' },
  verificationPendingTitleCompact: { fontSize: 13 },
  verificationPendingStatus: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4
  },
  verificationPendingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.amber
  },
  verificationPendingStatusText: {
    color: '#92400E',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  verificationPendingStatusTextCompact: { fontSize: 9 },
  verificationPendingText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 11
  },
  verificationPendingTextCompact: { fontSize: 10, lineHeight: 15, marginTop: 8 },
  verificationPendingButton: {
    minHeight: 40,
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 11,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 12,
    paddingHorizontal: 12
  },
  verificationPendingButtonCompact: { minHeight: 36, borderRadius: 10, marginTop: 9 },
  verificationPendingButtonText: {
    color: colors.partner,
    fontSize: 12,
    fontWeight: '900'
  },
  walletBlockCard: { borderWidth: 1, borderColor: '#FDE68A', backgroundColor: '#FFFBEB', borderRadius: 16, padding: 14, marginBottom: 12 },
  walletBlockCardCompact: { borderRadius: 14, padding: 11, marginBottom: 9 },
  walletBlockHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  walletBlockBalance: { color: '#92400E', fontSize: 13, fontWeight: '900', marginBottom: 10 },
  walletBlockBalanceCompact: { fontSize: 11, marginBottom: 8 },
  statRow: { flexDirection: 'row', gap: 10, marginTop: 16, marginBottom: 16 },
  statRowCompact: { gap: 7, marginTop: 11, marginBottom: 11 },
  statCard: { flex: 1, borderRadius: 14, padding: 14 },
  statCardCompact: { borderRadius: 12, paddingHorizontal: 9, paddingVertical: 10 },
  statCardSmall: { borderRadius: 11, paddingHorizontal: 8, paddingVertical: 8 },
  statValue: { fontSize: 17, fontWeight: '900' },
  statValueCompact: { fontSize: 14 },
  statValueSmall: { fontSize: 12 },
  statLabel: { fontSize: 11, fontWeight: '800', marginTop: 4 },
  statLabelCompact: { fontSize: 9, marginTop: 2 },
  statLabelSmall: { fontSize: 8, marginTop: 1 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 12 },
  rowCompact: { gap: 7, marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: colors.ink, marginTop: 18, marginBottom: 10 },
  sectionTitleCompact: { fontSize: 14, marginTop: 13, marginBottom: 8 },
  sectionTitleSmall: { fontSize: 12, marginTop: 11, marginBottom: 7 },
  orderCard: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 14, marginBottom: 12, backgroundColor: colors.white },
  orderCardCompact: { borderRadius: 14, padding: 10, marginBottom: 8 },
  activeTripSwitchRow: { gap: 10, paddingBottom: 10 },
  activeTripSwitchRowCompact: { gap: 8, paddingBottom: 8 },
  activeTripSwitchCard: { width: 190, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.white, padding: 12 },
  activeTripSwitchCardCompact: { width: 168, borderRadius: 12, padding: 10 },
  activeTripSwitchCardSmall: { width: 154 },
  activeTripSwitchCardSelected: { borderColor: colors.partner, backgroundColor: colors.partnerLight },
  activeTripSwitchTitle: { color: colors.ink, fontSize: 13, fontWeight: '900' },
  activeTripSwitchTitleCompact: { fontSize: 11 },
  activeTripSwitchTitleSmall: { fontSize: 10 },
  activeTripSwitchTitleSelected: { color: colors.partner },
  activeTripSwitchMeta: { color: colors.muted, fontSize: 11, fontWeight: '800', marginTop: 5 },
  activeTripSwitchMetaCompact: { fontSize: 9, marginTop: 3 },
  activeTripSwitchMetaSmall: { fontSize: 8, marginTop: 2 },
  activeContactCard: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line, marginVertical: 10, paddingVertical: 4 },
  activeContactCardCompact: { marginVertical: 7, paddingVertical: 3 },
  activeContactRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  activeContactRowCompact: { gap: 8, paddingVertical: 4 },
  activeContactLabel: { color: colors.muted, fontSize: 10, fontWeight: '800' },
  activeContactLabelCompact: { fontSize: 9 },
  activeContactLabelSmall: { fontSize: 8 },
  activeContactValue: { color: colors.ink, fontSize: 13, fontWeight: '800', marginTop: 2 },
  activeContactValueCompact: { fontSize: 11, marginTop: 1 },
  activeContactValueSmall: { fontSize: 10 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 8 },
  betweenCompact: { gap: 8, marginBottom: 6 },
  orderNo: { color: colors.muted, fontSize: 11, fontWeight: '900' },
  orderNoCompact: { fontSize: 9 },
  orderNoSmall: { fontSize: 8 },
  cardTitle: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  cardTitleCompact: { fontSize: 12 },
  cardTitleSmall: { fontSize: 11 },
  badge: { backgroundColor: colors.partnerLight, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 },
  badgeCompact: { maxWidth: '48%', paddingVertical: 3, paddingHorizontal: 8 },
  badgeText: { color: colors.partner, fontSize: 11, fontWeight: '900' },
  badgeTextCompact: { fontSize: 9, textAlign: 'center' },
  badgeTextSmall: { fontSize: 8 },
  route: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  routeCompact: { gap: 8, paddingVertical: 4 },
  routeDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.partner },
  routeDotCompact: { width: 8, height: 8, borderRadius: 4 },
  routeDotGreen: { backgroundColor: colors.green },
  routeText: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  routeTextCompact: { fontSize: 12 },
  routeTextSmall: { fontSize: 10 },
  pickupDistanceBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, backgroundColor: colors.partnerLight, paddingVertical: 9, paddingHorizontal: 11, marginTop: 8 },
  pickupDistanceBannerCompact: { gap: 7, borderRadius: 10, paddingVertical: 7, paddingHorizontal: 9, marginTop: 6 },
  pickupDistanceText: { flex: 1, color: colors.partner, fontSize: 12, fontWeight: '800' },
  pickupDistanceTextCompact: { fontSize: 10 },
  pickupDistanceTextSmall: { fontSize: 9 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 8 },
  chipsCompact: { gap: 5, marginVertical: 6 },
  chip: { backgroundColor: colors.faint, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999 },
  chipCompact: { paddingVertical: 4, paddingHorizontal: 8 },
  chipText: { color: colors.muted, fontSize: 11, fontWeight: '800' },
  chipTextCompact: { fontSize: 9 },
  chipTextSmall: { fontSize: 8 },
  muted: { color: colors.muted, marginTop: 8, textAlign: 'center' },
  mutedCompact: { fontSize: 11, lineHeight: 15, marginTop: 5 },
  mutedSmallScreen: { fontSize: 10, lineHeight: 14, marginTop: 4 },
  mutedSmall: { color: colors.muted, fontSize: 12 },
  mutedSmallCompact: { fontSize: 10, lineHeight: 14 },
  mutedSmallScreenText: { fontSize: 9, lineHeight: 13 },
  priceText: { color: colors.partner, fontSize: 14, fontWeight: '900' },
  priceTextCompact: { fontSize: 12 },
  priceTextSmall: { fontSize: 10 },
  primaryButton: { flex: 1, minHeight: 46, borderRadius: 14, backgroundColor: colors.partner, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, paddingHorizontal: 12, marginBottom: 10 },
  primaryButtonCompact: { minHeight: 40, borderRadius: 12, gap: 5, paddingHorizontal: 9, marginBottom: 8 },
  primaryButtonSmall: { minHeight: 37, borderRadius: 11, gap: 4, paddingHorizontal: 8, marginBottom: 7 },
  primaryButtonText: { flexShrink: 1, color: colors.white, fontWeight: '900', textAlign: 'center' },
  primaryButtonTextCompact: { fontSize: 12 },
  primaryButtonTextSmall: { fontSize: 10 },
  secondaryButton: { flex: 1, minHeight: 46, borderRadius: 14, backgroundColor: colors.faint, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, paddingHorizontal: 12, marginBottom: 10 },
  secondaryButtonCompact: { minHeight: 40, borderRadius: 12, gap: 5, paddingHorizontal: 9, marginBottom: 8 },
  secondaryButtonSmall: { minHeight: 37, borderRadius: 11, gap: 4, paddingHorizontal: 8, marginBottom: 7 },
  secondaryButtonText: { flexShrink: 1, color: colors.ink, fontWeight: '900', textAlign: 'center' },
  secondaryButtonTextCompact: { fontSize: 12 },
  secondaryButtonTextSmall: { fontSize: 10 },
  deleteAccountButton: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: '#FECACA', backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 14, marginBottom: 10 },
  deleteAccountButtonText: { color: colors.red, fontWeight: '900' },
  logoutButton: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: '#FECACA', backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 14, marginBottom: 12 },
  logoutButtonText: { color: colors.red, fontWeight: '900' },
  accountActionTextCompact: { fontSize: 12 },
  accountActionTextSmall: { fontSize: 10 },
  cancelOrderButton: { minHeight: 58, borderRadius: 14, borderWidth: 1, borderColor: '#FECACA', backgroundColor: '#FEF2F2', flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13, paddingVertical: 9, marginBottom: 12 },
  cancelOrderButtonDisabled: { opacity: 0.5 },
  cancelOrderButtonText: { color: colors.red, fontSize: 13, fontWeight: '900' },
  cancelOrderButtonTextCompact: { fontSize: 11 },
  cancelOrderButtonTextSmall: { fontSize: 10 },
  cancelOrderButtonMeta: { color: colors.muted, fontSize: 10, fontWeight: '700', marginTop: 2 },
  cancelOrderButtonMetaCompact: { fontSize: 9 },
  cancelOrderButtonMetaSmall: { fontSize: 8 },
  map: { height: 170, borderRadius: 18, backgroundColor: '#ECFDF5', overflow: 'hidden', marginBottom: 14 },
  mapCompact: { height: 148, borderRadius: 15, marginBottom: 10 },
  mapSmall: { height: 136 },
  mapNativeView: { flex: 1 },
  mapRoad: { position: 'absolute', top: 72, left: -20, right: -20, height: 20, backgroundColor: '#BBF7D0', transform: [{ rotate: '-8deg' }] },
  mapRoadTwo: { top: 30, transform: [{ rotate: '12deg' }], opacity: 0.7 },
  mapRoute: { position: 'absolute', left: 72, top: 88, width: 190, height: 4, borderRadius: 2, backgroundColor: colors.partner },
  mapPinA: { position: 'absolute', left: 64, top: 78, width: 18, height: 18, borderRadius: 9, backgroundColor: colors.partner },
  mapPinB: { position: 'absolute', left: 248, top: 78, width: 18, height: 18, borderRadius: 9, backgroundColor: colors.green },
  mapStopPin: { position: 'absolute', left: 145, top: 76, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.amber, borderWidth: 2, borderColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  mapStopPinTwo: { left: 178, top: 63 },
  mapStopPinThree: { left: 210, top: 91 },
  mapStopText: { color: colors.white, fontSize: 10, fontWeight: '900' },
  vehiclePulse: { position: 'absolute', left: 135, top: 59, width: 58, height: 58, borderRadius: 29, backgroundColor: 'rgba(5,150,105,0.12)' },
  vehiclePulseLive: { backgroundColor: 'rgba(5,150,105,0.18)' },
  vehicleMarker: { position: 'absolute', left: 153, top: 77, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.partner, alignItems: 'center', justifyContent: 'center' },
  vehicleMarkerLive: { backgroundColor: colors.green },
  etaChip: { position: 'absolute', right: 12, top: 12, backgroundColor: colors.white, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center', shadowColor: '#0F172A', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  etaValue: { color: colors.partner, fontSize: 20, fontWeight: '900' },
  etaLabel: { color: colors.muted, fontSize: 9, fontWeight: '900' },
  liveChip: { position: 'absolute', left: 12, top: 12, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.white, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 10, shadowColor: '#0F172A', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.muted },
  liveDotOn: { backgroundColor: colors.green },
  liveText: { color: colors.ink, fontSize: 11, fontWeight: '900' },
  mapPartnerMarker: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.green, borderWidth: 3, borderColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  mapText: { position: 'absolute', left: 12, bottom: 12, right: 12, color: colors.ink, fontSize: 12, fontWeight: '900' },
  mapTextWithAction: { right: 58 },
  mapExpandButton: { position: 'absolute', right: 10, bottom: 9, width: 40, height: 40, borderRadius: 20, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', shadowColor: '#0F172A', shadowOpacity: 0.16, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  expandedRouteShell: { flex: 1, backgroundColor: colors.white },
  expandedRouteMap: { flex: 1, backgroundColor: '#ECFDF5' },
  expandedRouteFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 28, backgroundColor: colors.partnerLight },
  expandedRouteFallbackText: { color: colors.ink, fontSize: 13, fontWeight: '800', lineHeight: 19, textAlign: 'center' },
  expandedRouteHeaderCard: { position: 'absolute', left: 16, right: 16, top: Platform.OS === 'android' ? androidStatusBarInset + 16 : 16, minHeight: 72, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.96)', flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 13, shadowColor: '#0F172A', shadowOpacity: 0.14, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  expandedRouteHeaderIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.partnerLight, alignItems: 'center', justifyContent: 'center' },
  expandedRouteTitle: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  expandedRouteSubtitle: { color: colors.muted, fontSize: 10, fontWeight: '700', lineHeight: 14, marginTop: 2 },
  expandedRouteError: { color: '#B45309', fontSize: 10, fontWeight: '800', lineHeight: 14, marginTop: 4 },
  expandedRouteMinimizeButton: { position: 'absolute', right: 16, bottom: 20, width: 50, height: 50, borderRadius: 25, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', shadowColor: '#0F172A', shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  payoutCard: { backgroundColor: colors.partnerLight, borderRadius: 16, padding: 14, marginBottom: 14 },
  payoutCardCompact: { borderRadius: 14, padding: 10, marginBottom: 10 },
  fareLabel: { color: colors.partner, fontSize: 13 },
  fareLabelCompact: { flexShrink: 1, fontSize: 11 },
  fareLabelSmall: { fontSize: 10 },
  fareValue: { color: colors.partner, fontSize: 13, fontWeight: '800' },
  fareValueCompact: { fontSize: 11 },
  fareValueSmall: { fontSize: 10 },
  bold: { fontWeight: '900', fontSize: 15 },
  timelineItem: { flexDirection: 'row', gap: 10, paddingVertical: 8 },
  timelineItemCompact: { gap: 8, paddingVertical: 6 },
  timelineDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  timelineDone: { backgroundColor: colors.green },
  timelineActive: { backgroundColor: colors.partner },
  timelineTitle: { color: colors.ink, fontSize: 13, fontWeight: '900' },
  timelineTitleCompact: { fontSize: 11 },
  timelineTitleSmall: { fontSize: 10 },
  walletCard: { borderRadius: 18, padding: 20, borderWidth: 1, borderColor: colors.line, alignItems: 'center', gap: 10 },
  walletCardCompact: { borderRadius: 15, padding: 14, gap: 7 },
  walletValue: { color: colors.partner, fontSize: 36, fontWeight: '900' },
  walletValueCompact: { fontSize: 30 },
  walletValueSmall: { fontSize: 27 },
  ledgerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  ledgerRowCompact: { gap: 9, paddingVertical: 9 },
  ledgerIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  ledgerIconCompact: { width: 32, height: 32, borderRadius: 10 },
  ledgerCredit: { backgroundColor: colors.partner },
  ledgerDebit: { backgroundColor: colors.red },
  amount: { fontWeight: '900', fontSize: 13 },
  amountCompact: { fontSize: 11 },
  amountSmall: { fontSize: 10 },
  amountGreen: { color: colors.partner },
  amountRed: { color: colors.red },
  notice: { flexDirection: 'row', gap: 10, backgroundColor: colors.partnerLight, borderRadius: 14, padding: 14, alignItems: 'center' },
  noticeText: { flex: 1, color: colors.partner, fontSize: 13, fontWeight: '900' },
  noticeTextCompact: { fontSize: 11 },
  noticeTextSmall: { fontSize: 10 },
  fieldLabel: { color: colors.muted, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', marginBottom: 6 },
  fieldLabelCompact: { fontSize: 9, marginBottom: 4 },
  fieldLabelSmall: { fontSize: 8, marginBottom: 3 },
  accountHero: { backgroundColor: colors.partner, borderRadius: 22, padding: 18, paddingBottom: 72, marginBottom: 68 },
  accountHeroCompact: { borderRadius: 18, padding: 14, paddingBottom: 62, marginBottom: 58 },
  accountHeroSmall: { paddingHorizontal: 12 },
  accountHeroGlow: { position: 'absolute', width: 130, height: 130, borderRadius: 65, right: 0, top: 0, backgroundColor: 'rgba(255,255,255,0.10)' },
  accountEyebrow: { color: colors.white, fontSize: 22, fontWeight: '900' },
  accountEyebrowCompact: { fontSize: 18 },
  accountEyebrowSmall: { fontSize: 16 },
  accountHeroSubtitle: { color: '#D1FAE5', fontSize: 13, fontWeight: '700', marginTop: 3 },
  accountHeroSubtitleCompact: { fontSize: 11, marginTop: 2 },
  accountHeroSubtitleSmall: { fontSize: 9, marginTop: 1 },
  accountIdentityCard: { position: 'absolute', left: 14, right: 14, top: 82, minHeight: 112, borderRadius: 18, backgroundColor: colors.white, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: '#0F172A', shadowOpacity: 0.13, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 4 },
  accountIdentityCardCompact: { left: 10, right: 10, top: 68, minHeight: 96, borderRadius: 15, padding: 11, gap: 9 },
  accountIdentityCardSmall: { left: 8, right: 8, paddingHorizontal: 9 },
  accountAvatar: { width: 62, height: 62, borderRadius: 31, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  accountAvatarCompact: { width: 50, height: 50, borderRadius: 25 },
  accountAvatarSmall: { width: 44, height: 44, borderRadius: 22 },
  accountAvatarText: { color: colors.white, fontSize: 20, fontWeight: '900' },
  accountAvatarTextCompact: { fontSize: 17 },
  accountAvatarTextSmall: { fontSize: 14 },
  accountName: { color: colors.ink, fontSize: 18, fontWeight: '900' },
  accountNameCompact: { fontSize: 15 },
  accountNameSmall: { fontSize: 13 },
  accountPhone: { color: colors.muted, fontSize: 12, fontWeight: '700', marginTop: 2 },
  accountPhoneCompact: { fontSize: 10, marginTop: 1 },
  accountPhoneSmall: { fontSize: 9 },
  accountVerifiedBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.partnerLight, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 8, marginTop: 7 },
  accountVerifiedBadgeCompact: { gap: 3, paddingVertical: 3, paddingHorizontal: 6, marginTop: 5, maxWidth: '100%' },
  accountVerifiedText: { color: colors.partner, fontSize: 10, fontWeight: '900', textTransform: 'capitalize' },
  accountVerifiedTextCompact: { flexShrink: 1, fontSize: 8 },
  accountVerifiedTextSmall: { fontSize: 7 },
  accountEditButton: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.partnerLight, alignItems: 'center', justifyContent: 'center' },
  accountEditButtonCompact: { width: 33, height: 33, borderRadius: 11 },
  accountProgressCard: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.white, padding: 14, marginBottom: 12 },
  accountProgressCardCompact: { borderRadius: 14, padding: 11, marginBottom: 9 },
  accountMenuCard: { borderWidth: 1, borderColor: colors.line, borderRadius: 18, backgroundColor: colors.white, paddingHorizontal: 12, marginBottom: 14, overflow: 'hidden' },
  accountMenuCardCompact: { borderRadius: 15, paddingHorizontal: 10, marginBottom: 10 },
  accountMenuRow: { minHeight: 74, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: colors.line, paddingVertical: 12 },
  accountMenuRowCompact: { minHeight: 62, gap: 9, paddingVertical: 9 },
  accountMenuRowLast: { borderBottomWidth: 0 },
  accountMenuIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.partnerLight, alignItems: 'center', justifyContent: 'center' },
  accountMenuIconCompact: { width: 35, height: 35, borderRadius: 11 },
  accountMenuIconComplete: { backgroundColor: colors.partner },
  accountDetailHeader: { minHeight: 82, borderRadius: 18, backgroundColor: colors.partner, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14, overflow: 'hidden' },
  accountDetailHeaderCompact: { minHeight: 68, borderRadius: 15, padding: 11, gap: 9, marginBottom: 10 },
  accountBackButton: { width: 40, height: 40, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  accountBackButtonCompact: { width: 34, height: 34, borderRadius: 11 },
  accountDetailTitle: { color: colors.white, fontSize: 18, fontWeight: '900' },
  accountDetailTitleCompact: { fontSize: 15 },
  accountDetailTitleSmall: { fontSize: 13 },
  accountDetailSubtitle: { color: '#D1FAE5', fontSize: 11, fontWeight: '700', marginTop: 3 },
  accountDetailSubtitleCompact: { fontSize: 9, lineHeight: 12, marginTop: 2 },
  accountDetailSubtitleSmall: { fontSize: 8, lineHeight: 11, marginTop: 1 },
  accountDetailCard: { borderWidth: 1, borderColor: colors.line, borderRadius: 18, backgroundColor: colors.white, padding: 14 },
  accountDetailCardCompact: { borderRadius: 15, padding: 11 },
  accountDetailCardComplete: { borderColor: colors.partner, backgroundColor: '#FAFFFD' },
  accountInfoStrip: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, backgroundColor: colors.partnerLight, padding: 12, marginBottom: 14 },
  accountInfoText: { flex: 1, color: colors.partner, fontSize: 12, fontWeight: '800', lineHeight: 17 },
  accountInfoTextCompact: { fontSize: 10, lineHeight: 14 },
  accountInfoTextSmall: { fontSize: 9, lineHeight: 13 },
  profileDetailKeyboardScroll: { paddingBottom: 92 },
  profileDetailKeyboardFooter: {
    flexShrink: 0,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 0,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -3 },
    elevation: 8,
    zIndex: 30
  },
  profileDetailKeyboardFooterCompact: { paddingHorizontal: 12, paddingTop: 8 },
  profileDetailKeyboardFooterInner: { width: '100%', alignSelf: 'center' },
  trainingPage: { gap: 10, paddingBottom: 8 },
  trainingPageCompact: { gap: 8, paddingBottom: 5 },
  trainingHeroCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, backgroundColor: colors.partner, padding: 16 },
  trainingHeroCardCompact: { gap: 9, borderRadius: 15, padding: 12 },
  trainingHeroIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  trainingHeroIconCompact: { width: 40, height: 40, borderRadius: 13 },
  trainingHeroTitle: { color: colors.white, fontSize: 17, fontWeight: '900' },
  trainingHeroTitleCompact: { fontSize: 14 },
  trainingHeroTitleSmall: { fontSize: 12 },
  trainingHeroText: { color: '#D1FAE5', fontSize: 11, fontWeight: '700', lineHeight: 16, marginTop: 3 },
  trainingHeroTextCompact: { fontSize: 9, lineHeight: 13, marginTop: 2 },
  trainingHeroTextSmall: { fontSize: 8, lineHeight: 12, marginTop: 1 },
  trainingStepCard: { flexDirection: 'row', alignItems: 'stretch', gap: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.white, padding: 13 },
  trainingStepCardCompact: { gap: 9, borderRadius: 14, padding: 10 },
  trainingStepRail: { width: 40, alignItems: 'center' },
  trainingStepRailCompact: { width: 34 },
  trainingStepIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.partnerLight, alignItems: 'center', justifyContent: 'center' },
  trainingStepIconCompact: { width: 33, height: 33, borderRadius: 11 },
  trainingStepLine: { flex: 1, width: 2, minHeight: 18, borderRadius: 2, backgroundColor: '#A7F3D0', marginTop: 6, marginBottom: -24 },
  trainingStepContent: { flex: 1, paddingVertical: 1 },
  trainingStepTitle: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  trainingStepTitleCompact: { fontSize: 12 },
  trainingStepTitleSmall: { fontSize: 10 },
  trainingStepText: { color: colors.muted, fontSize: 11, fontWeight: '700', lineHeight: 17, marginTop: 4 },
  trainingStepTextCompact: { fontSize: 9, lineHeight: 14, marginTop: 3 },
  trainingStepTextSmall: { fontSize: 8, lineHeight: 13, marginTop: 2 },
  trainingSafetyCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, borderWidth: 1, borderColor: '#BBF7D0', borderRadius: 16, backgroundColor: '#F0FDF4', padding: 14 },
  trainingHelpCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, borderWidth: 1, borderColor: '#A7F3D0', borderRadius: 16, backgroundColor: colors.partnerLight, padding: 14 },
  trainingSafetyTitle: { color: colors.ink, fontSize: 13, fontWeight: '900' },
  trainingSafetyTitleCompact: { fontSize: 11 },
  trainingSafetyTitleSmall: { fontSize: 10 },
  trainingSafetyText: { color: colors.muted, fontSize: 11, fontWeight: '700', lineHeight: 16, marginTop: 3 },
  trainingSafetyTextCompact: { fontSize: 9, lineHeight: 13, marginTop: 2 },
  trainingSafetyTextSmall: { fontSize: 8, lineHeight: 12, marginTop: 1 },
  accountBankStatus: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  kycHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.partner,
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8
  },
  kycHeroIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  kycHeroTitle: { color: colors.white, fontSize: 16, fontWeight: '900' },
  kycHeroTitleCompact: { fontSize: 13 },
  kycHeroTitleSmall: { fontSize: 11 },
  kycHeroText: {
    color: '#D1FAE5',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
    lineHeight: 14
  },
  kycHeroTextCompact: { fontSize: 9, lineHeight: 12 },
  kycHeroTextSmall: { fontSize: 8, lineHeight: 11 },
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
  languagePillTextCompact: { fontSize: 10 },
  languagePillTextSmall: { fontSize: 9 },
  languagePillTextActive: { color: colors.partner },
  kycProgressCard: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.white, padding: 14, marginBottom: 12 },
  kycProgressTrack: { height: 8, borderRadius: 8, backgroundColor: colors.faint, overflow: 'hidden', marginBottom: 8 },
  kycProgressFill: { height: 8, borderRadius: 8, backgroundColor: colors.partner },
  kycStepCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.white, padding: 14, marginBottom: 10 },
  kycStepCardCompact: { gap: 9, borderRadius: 14, padding: 10, marginBottom: 8 },
  kycStepDone: { borderColor: colors.partner, backgroundColor: colors.partnerLight },
  kycStepIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.partnerLight, alignItems: 'center', justifyContent: 'center' },
  kycStepIconCompact: { width: 33, height: 33, borderRadius: 11 },
  kycStepIconDone: { backgroundColor: colors.partner },
  kycActionText: { color: colors.partner, fontSize: 12, fontWeight: '900' },
  kycActionTextCompact: { fontSize: 10 },
  kycActionTextSmall: { fontSize: 9 },
  kycGroupCard: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.white, padding: 14, marginBottom: 10 },
  kycInputGroup: { marginBottom: 10 },
  kycInput: { minHeight: 46, borderWidth: 1, borderColor: colors.line, borderRadius: 12, color: colors.ink, fontWeight: '800', paddingHorizontal: 12, backgroundColor: colors.white },
  kycInputCompact: { minHeight: 42, borderRadius: 10, paddingHorizontal: 10, fontSize: 12 },
  kycInputSmall: { minHeight: 39, paddingHorizontal: 9, fontSize: 11 },
  otpPanel: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 12, marginBottom: 12 },
  otpPanelCompact: { borderRadius: 14, padding: 10, marginBottom: 9 },
  otpRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  otpRowSmall: { flexDirection: 'column', alignItems: 'stretch', gap: 7 },
  otpInput: { flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 12, minHeight: 46, color: colors.ink, fontWeight: '800' },
  otpInputCompact: { minHeight: 42, borderRadius: 10, paddingHorizontal: 10, fontSize: 12 },
  otpInputSmall: { minHeight: 39, paddingHorizontal: 9, fontSize: 11 },
  orderHistoryHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  orderHistoryFilterButton: { minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: colors.partner, borderRadius: 10, backgroundColor: colors.white, paddingHorizontal: 10, paddingVertical: 5, marginBottom: 10 },
  orderHistoryFilterButtonActive: { backgroundColor: colors.partner },
  orderHistoryFilterButtonText: { color: colors.partner, fontSize: 12, fontWeight: '700' },
  orderHistoryFilterButtonTextActive: { color: colors.white },
  orderHistoryFilterBadge: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  orderHistoryFilterBadgeText: { color: colors.partner, fontSize: 9, fontWeight: '700' },
  orderHistoryEmpty: { borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.white, padding: 18, alignItems: 'center', gap: 7, marginBottom: 12 },
  orderHistoryClearButton: { minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, backgroundColor: colors.partnerLight, paddingHorizontal: 14, marginTop: 8 },
  orderHistoryClearButtonText: { color: colors.partner, fontSize: 12, fontWeight: '700' },
  orderHistoryFilterOverlay: { flex: 1, justifyContent: 'flex-end' },
  orderHistoryFilterBackdrop: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(17,24,39,0.42)' },
  orderHistoryFilterSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: colors.white, paddingTop: 10 },
  orderHistoryFilterHandle: { width: 44, height: 4, borderRadius: 4, backgroundColor: colors.line, alignSelf: 'center', marginBottom: 12 },
  orderHistoryFilterSheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 18 },
  orderHistoryFilterTitle: { color: colors.ink, fontSize: 20, fontWeight: '700' },
  orderHistoryFilterSubtitle: { color: colors.muted, fontSize: 12, fontWeight: '600', marginTop: 2 },
  orderHistoryFilterClose: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.faint, alignItems: 'center', justifyContent: 'center' },
  orderHistoryFilterGroupTitle: { color: colors.ink, fontSize: 13, fontWeight: '700', marginBottom: 9 },
  orderHistoryFilterOptionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  orderHistoryFilterOption: { flexGrow: 1, flexShrink: 1, flexBasis: '30%', minWidth: 92, minHeight: 54, borderWidth: 1, borderColor: colors.line, borderRadius: 13, backgroundColor: colors.white, paddingHorizontal: 11, paddingVertical: 9, justifyContent: 'center' },
  orderHistoryFilterOptionActive: { borderColor: colors.partner, backgroundColor: colors.partnerLight },
  orderHistoryFilterOptionText: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  orderHistoryFilterOptionTextActive: { color: colors.partner, fontWeight: '700' },
  orderHistoryFilterOptionCount: { color: colors.muted, fontSize: 10, fontWeight: '600', marginTop: 3 },
  orderHistoryFilterOptionCountActive: { color: colors.partner },
  orderHistoryFilterActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  docGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  docCard: { width: '48%', borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 14, alignItems: 'center', gap: 6 },
  docCardDone: { backgroundColor: colors.partnerLight, borderColor: colors.partner },
  docTitle: { color: colors.ink, fontWeight: '900', textAlign: 'center' },
  docDoneText: { color: colors.partner },
  policyList: { marginTop: 4, marginBottom: 12 },
  policyCard: { borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.white, marginBottom: 10, overflow: 'hidden' },
  policyCardCompact: { borderRadius: 12, marginBottom: 8 },
  policyHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  policyHeaderCompact: { gap: 9, padding: 10 },
  policyIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.partnerLight, alignItems: 'center', justifyContent: 'center' },
  policyIconCompact: { width: 32, height: 32, borderRadius: 10 },
  policySummary: { color: colors.ink, fontSize: 12, fontWeight: '700', marginTop: 5, lineHeight: 17 },
  policySummaryCompact: { fontSize: 10, lineHeight: 14, marginTop: 3 },
  policySummarySmall: { fontSize: 9, lineHeight: 13, marginTop: 2 },
  policyBody: { borderTopWidth: 1, borderTopColor: colors.line, paddingHorizontal: 14, paddingBottom: 12, backgroundColor: '#F8FFFC' },
  policySection: { marginTop: 12 },
  policyHeading: { color: colors.partner, fontSize: 13, fontWeight: '900', marginBottom: 4 },
  policyHeadingCompact: { fontSize: 11, marginBottom: 3 },
  policyHeadingSmall: { fontSize: 10, marginBottom: 2 },
  policyText: { color: colors.muted, fontSize: 12, lineHeight: 18, marginBottom: 4 },
  policyTextCompact: { fontSize: 10, lineHeight: 15, marginBottom: 3 },
  policyTextSmall: { fontSize: 9, lineHeight: 14, marginBottom: 2 },
  policyDetailHero: { borderWidth: 1, borderColor: colors.line, borderRadius: 18, backgroundColor: colors.white, padding: 15, marginBottom: 12, gap: 8 },
  policyDetailHeroCompact: { borderRadius: 14, padding: 11, marginBottom: 9, gap: 6 },
  policyDetailSummary: { color: colors.ink, fontSize: 13, fontWeight: '600', lineHeight: 19 },
  policyDetailSummaryCompact: { fontSize: 11, lineHeight: 16 },
  policyDetailSection: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.white, padding: 14, marginBottom: 10 },
  policyDetailSectionCompact: { borderRadius: 13, padding: 10, marginBottom: 8 },
  flex: { flex: 1 },
  tabs: { height: 68, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.white },
  tabsCompact: { height: 62 },
  tabsInner: { flex: 1, width: '100%', alignSelf: 'center', flexDirection: 'row' },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  tabCompact: { gap: 2 },
  tabText: { color: colors.muted, fontSize: 11, fontWeight: '800', textAlign: 'center' },
  tabTextCompact: { fontSize: 9 },
  tabTextSmall: { fontSize: 8 },
  tabTextActive: { color: colors.partner },
  tabBadge: { position: 'absolute', right: -8, top: -8, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  tabBadgeCompact: { right: -7, top: -7, minWidth: 16, height: 16 },
  tabBadgeText: { color: colors.white, fontSize: 9, fontWeight: '900' },
  toast: { position: 'absolute', left: 16, right: 16, bottom: 88, backgroundColor: colors.ink, borderRadius: 14, padding: 14 },
  toastText: { color: colors.white, fontWeight: '900' },
  empty: { alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  emptyCompact: { gap: 6, padding: 17 },
  emptySmall: { gap: 5, padding: 14 },
  emptyFull: { flex: 1, padding: 24, justifyContent: 'center' },
  emptyTitle: { color: colors.ink, fontSize: 18, fontWeight: '900' },
  emptyTitleCompact: { fontSize: 15 },
  emptyTitleSmall: { fontSize: 13 },
  errorTitle: { color: colors.red, fontSize: 18, fontWeight: '900', marginBottom: 6 }
});
