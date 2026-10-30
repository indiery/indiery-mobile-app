"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import styles from "./admin.module.css";
import AdminControlCenter, { EXTENDED_TAB_TITLES } from "./AdminControlCenter";

const LiveFleetMap = dynamic(() => import("./LiveFleetMap"), {
  ssr: false,
  loading: () => <div className={styles.mapLoading}>Loading live street map...</div>,
});
const OrderRouteMap = dynamic(() => import("./OrderRouteMap"), {
  ssr: false,
  loading: () => <div className={styles.routeMapMessage}>Loading driving route…</div>,
});

const API_BASE = "/api/admin";
let redirectingToAdminLogin = false;

async function adminFetch(input, init) {
  const response = await fetch(input, { credentials: "same-origin", ...init });
  if (response.ok) redirectingToAdminLogin = false;
  if (response.status === 401 && typeof window !== "undefined") {
    if (!redirectingToAdminLogin) {
      redirectingToAdminLogin = true;
      await fetch("/api/auth/admin-logout", { method: "POST", credentials: "same-origin" }).catch(() => null);
      window.location.replace("/admin/login?expired=1");
    }
    const sessionError = new Error("Admin session expired");
    sessionError.name = "AdminSessionExpired";
    throw sessionError;
  }
  return response;
}

const KYC_DOCUMENTS = [
  { title: "Driver selfie", key: "selfie" },
  { title: "Aadhaar card", key: "aadhaar" },
  { title: "Driving licence", key: "drivingLicence" },
  { title: "Vehicle RC", key: "rc" },
  { title: "Vehicle insurance", key: "insurance" },
  { title: "PAN card", key: "pan" },
  { title: "Bank passbook or cheque", key: "bank" }
];

function SidebarIcon({ name }) {
  const commonProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true
  };

  const icons = {
    overview: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="3" width="7" height="7" rx="2" />
        <rect x="3" y="14" width="7" height="7" rx="2" />
        <rect x="14" y="14" width="7" height="7" rx="2" />
      </>
    ),
    orders: (
      <>
        <path d="M7 4h10a2 2 0 0 1 2 2v14H5V6a2 2 0 0 1 2-2Z" />
        <path d="M9 4V2h6v2M8.5 10h7M8.5 14h5" />
      </>
    ),
    drivers: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 19a5.5 5.5 0 0 1 11 0M16 6.5a3 3 0 0 1 0 5.8M17 15a4.5 4.5 0 0 1 3.5 4" />
      </>
    ),
    kyc: (
      <>
        <path d="M12 3 5 6v5c0 4.6 2.8 8 7 10 4.2-2 7-5.4 7-10V6l-7-3Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    payouts: (
      <>
        <path d="M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
        <path d="M3 8V6a2 2 0 0 1 2-2h13M16 13h5" />
        <circle cx="16" cy="13" r="1" fill="currentColor" stroke="none" />
      </>
    ),
    coins: (
      <>
        <ellipse cx="12" cy="6" rx="7" ry="3" />
        <path d="M5 6v5c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 11v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" />
      </>
    ),
    business: (
      <>
        <path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M16 9h2a2 2 0 0 1 2 2v10M8 7h4M8 11h4M8 15h4M9 21v-2h2v2" />
      </>
    ),
    customers: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 19a5.5 5.5 0 0 1 11 0M17 8h4M19 6v4" />
      </>
    ),
    vehicles: (
      <>
        <path d="M3 15V8l2-4h10l4 5v6M5 15h12M7 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM21 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z" />
      </>
    ),
    payments: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 10h18M7 15h4" />
      </>
    ),
    pricing: (
      <>
        <path d="M20 13 13 20 4 11V4h7l9 9Z" />
        <circle cx="8.5" cy="8.5" r="1" />
      </>
    ),
    disputes: (
      <>
        <path d="M12 3 4 7v5c0 4 3 7 8 9 5-2 8-5 8-9V7l-8-4Z" />
        <path d="M12 8v5M12 17h.01" />
      </>
    ),
    deletion: (
      <>
        <path d="M6 3h8l4 4v14H6zM14 3v5h5" />
        <path d="m9 12 6 6m0-6-6 6" />
      </>
    ),
    support: (
      <>
        <path d="M4 13a8 8 0 0 1 16 0M4 13v5h3v-5H4ZM20 13v5h-3v-5h3ZM17 20h-4" />
      </>
    ),
    notifications: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" />
      </>
    ),
    reports: (
      <>
        <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
      </>
    ),
    areas: (
      <>
        <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
      </>
    )
  };

  return <svg {...commonProps}>{icons[name]}</svg>;
}

function uploadedKycDocuments(driver) {
  const urls = driver?.partnerProfile?.docUrls || {};
  return KYC_DOCUMENTS.filter(({ key }) => typeof urls[key] === "string" && urls[key].trim());
}

export default function AdminPage() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState("radar");

  const handleAdminLogout = async () => {
    try {
      await fetch("/api/auth/admin-logout", { method: "POST", credentials: "same-origin" });
    } finally {
      window.location.replace("/admin/login");
    }
  };

  // Real-Time Data from MongoDB Backend
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState(null);
  const [syncError, setSyncError] = useState(null);

  // Core Datasets
  const [metrics, setMetrics] = useState({
    activeOrders: 0,
    searchingOrders: 0,
    totalOrders: 0,
    totalCustomers: 0,
    totalDrivers: 0,
    onlineDrivers: 0,
    pendingKyc: 0,
    b2bClients: 0,
    totalGmv: 0,
    platformCommission: 0,
    driverEarnings: 0,
    pendingDriverDisbursements: 0,
    coinsInCirculation: 0
  });

  const [orders, setOrders] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [b2bClients, setB2bClients] = useState([]);
  const [eligibleDrivers, setEligibleDrivers] = useState([]);
  const [recentPayouts, setRecentPayouts] = useState([]);
  const [coinUsers, setCoinUsers] = useState([]);
  const [coinLedger, setCoinLedger] = useState([]);
  const [vehicleCatalog, setVehicleCatalog] = useState([]);
  const [customerUsers, setCustomerUsers] = useState([]);

  // Search queries per tab
  const [orderSearch, setOrderSearch] = useState("");
  const [driverSearch, setDriverSearch] = useState("");
  const [kycSearch, setKycSearch] = useState("");
  const [coinSearch, setCoinSearch] = useState("");
  const [b2bSearch, setB2bSearch] = useState("");

  // Filters & Sorters
  const [fleetFilter, setFleetFilter] = useState("all"); // 'all' | 'online' | 'active_order' | 'offline'
  const [orderSortField, setOrderSortField] = useState("createdAt");
  const [orderSortAsc, setOrderSortAsc] = useState(false);
  const [driverSortField, setDriverSortField] = useState("name");
  const [driverSortAsc, setDriverSortAsc] = useState(true);

  // Drawers & Modals
  const [inspectOrder, setInspectOrder] = useState(null);
  const [inspectDriver, setInspectDriver] = useState(null);
  const [lightboxDoc, setLightboxDoc] = useState(null); // { title, url, verified }
  const [assignModalOrder, setAssignModalOrder] = useState(null);
  const [selectedDriverIdForAssign, setSelectedDriverIdForAssign] = useState("");
  const [rejectKycModalDriver, setRejectKycModalDriver] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [disburseModalDriver, setDisburseModalDriver] = useState(null);
  const [disburseAmount, setDisburseAmount] = useState("");
  const [disbursePaymentMode, setDisbursePaymentMode] = useState("upi");
  const [disburseReference, setDisburseReference] = useState("");
  const [disbursing, setDisbursing] = useState(false);
  const [coinModalUser, setCoinModalUser] = useState(null);
  const [coinAdjustAmount, setCoinAdjustAmount] = useState("");
  const [coinAdjustType, setCoinAdjustType] = useState("credit");
  const [coinAdjustReason, setCoinAdjustReason] = useState("");

  // Unified Dispatch Modal (On-Demand or B2B)
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [dispatchType, setDispatchType] = useState("on_demand"); // 'on_demand' | 'b2b'
  const [dispatchForm, setDispatchForm] = useState({
    customerName: "",
    customerPhone: "",
    b2bClientId: "",
    vehicleCode: "",
    pickupAddress: "",
    dropAddress: "",
    goodsType: "",
    weightKg: "",
    totalFare: "",
    driverId: ""
  });

  const [b2bRegisterOpen, setB2bRegisterOpen] = useState(false);
  const [newB2bData, setNewB2bData] = useState({
    companyName: "",
    contactPerson: "",
    phone: "",
    email: "",
    address: "",
    contractType: "on_demand",
    gstin: ""
  });

  // Radar Interactive Focus
  const [selectedRadarDriverId, setSelectedRadarDriverId] = useState(null);
  const [actionNotice, setActionNotice] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  const showNotification = (msg, isErr = false) => {
    setActionNotice({ msg, isErr });
    setTimeout(() => setActionNotice(null), 4000);
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Keyboard shortcut: Esc to close drawers
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setInspectOrder(null);
        setInspectDriver(null);
        setLightboxDoc(null);
        setAssignModalOrder(null);
        setRejectKycModalDriver(null);
        setDisburseModalDriver(null);
        setCoinModalUser(null);
        setDispatchModalOpen(false);
        setB2bRegisterOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Support direct links to a specific console section, for example
  // /admin?tab=payouts, while keeping the admin route out of public navigation.
  useEffect(() => {
    const requestedTab = new URLSearchParams(window.location.search).get("tab");
    const tabAliases = {
      overview: "radar",
      radar: "radar",
      orders: "orders",
      drivers: "drivers",
      kyc: "kyc",
      payouts: "finance",
      finance: "finance",
      coins: "coins",
      b2b: "b2b",
      customers: "customers",
      vehicles: "vehicles",
      payments: "payments",
      pricing: "pricing",
      disputes: "disputes",
      support: "support",
      notifications: "notifications",
      reports: "reports",
      areas: "areas",
      admins: "admins",
      settings: "settings",
      b2bOrders: "b2bOrders",
      billing: "billing"
    };
    if (requestedTab && tabAliases[requestedTab]) setActiveTab(tabAliases[requestedTab]);
  }, []);

  // ==========================================================================
  // FETCH ALL REAL DATA FROM BACKEND API
  // ==========================================================================
  const fetchAllRealtimeData = useCallback(async (isSilent = false) => {
    if (!isSilent) setSyncing(true);
    setSyncError(null);

    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 15000);
      let response;
      let snapshot;
      try {
        response = await adminFetch(`${API_BASE}/dashboard-snapshot`, {
          cache: "no-store",
          signal: controller.signal
        });
        snapshot = await response.json().catch(() => null);
      } finally {
        window.clearTimeout(timeout);
      }

      if (!response.ok) {
        const retryAfter = response.headers.get("Retry-After");
        const retryMessage = response.status === 429 && retryAfter
          ? ` Retry in ${retryAfter} seconds.`
          : "";
        throw new Error(`${snapshot?.message || `HTTP ${response.status}`}${retryMessage}`);
      }

      const overviewData = snapshot?.overview;
      const ordersData = snapshot?.orders;
      const driversData = snapshot?.drivers;
      const b2bData = snapshot?.b2b;
      const financeData = snapshot?.finance;
      const coinsData = snapshot?.coins;
      const vehiclesData = snapshot?.vehicles;
      const customersData = snapshot?.customers;

      if (overviewData) {
        const d = overviewData;
        if (d.metrics) setMetrics(d.metrics);
      }

      if (ordersData) {
        const d = ordersData;
        if (Array.isArray(d.orders)) {
          setOrders(d.orders);
          setInspectOrder((current) => current
            ? d.orders.find((order) => order._id === current._id) || current
            : null);
        }
      }

      if (driversData) {
        const d = driversData;
        if (Array.isArray(d.drivers)) {
          setDrivers(d.drivers);
          setSelectedRadarDriverId((current) => {
            if (current && d.drivers.some((driver) => driver._id === current)) return current;
            const firstLocatedDriver = d.drivers.find((driver) => (
              Number.isFinite(driver.partnerProfile?.currentLocation?.lat)
              && Number.isFinite(driver.partnerProfile?.currentLocation?.lng)
            ));
            return firstLocatedDriver?._id || d.drivers[0]?._id || null;
          });
          setInspectDriver((current) => current
            ? d.drivers.find((driver) => driver._id === current._id) || current
            : null);
        }
      }

      if (b2bData) {
        const d = b2bData;
        if (Array.isArray(d.clients)) setB2bClients(d.clients);
      }

      if (financeData) {
        const d = financeData;
        if (Array.isArray(d.eligibleDrivers)) setEligibleDrivers(d.eligibleDrivers);
        if (Array.isArray(d.recentPayouts)) setRecentPayouts(d.recentPayouts);
      }

      if (coinsData) {
        const d = coinsData;
        if (Array.isArray(d.users)) setCoinUsers(d.users);
        if (Array.isArray(d.coinLedger)) setCoinLedger(d.coinLedger);
      }

      if (vehiclesData && Array.isArray(vehiclesData.vehicles)) {
        setVehicleCatalog(vehiclesData.vehicles);
        const firstActiveCode = vehiclesData.vehicles.find((vehicle) => vehicle.active)?.code || "";
        setDispatchForm((current) => current.vehicleCode ? current : { ...current, vehicleCode: firstActiveCode });
      }

      if (customersData && Array.isArray(customersData.customers)) {
        setCustomerUsers(customersData.customers);
      }

      setLastSynced(snapshot?.generatedAt ? new Date(snapshot.generatedAt) : new Date());
    } catch (err) {
      if (err?.name === "AdminSessionExpired") return;
      console.error("Realtime sync error:", err);
      const message = err?.name === "AbortError" ? "request timed out" : err?.message;
      setSyncError(`Admin API unavailable: ${message || "connection failed"}`);
    } finally {
      setLoading(false);
      if (!isSilent) setSyncing(false);
    }
  }, []);

  // Refresh one consolidated snapshot while the dashboard is visible.
  useEffect(() => {
    fetchAllRealtimeData();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchAllRealtimeData(true);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchAllRealtimeData]);

  const handleInspectDriver = async (driver) => {
    setInspectDriver(driver);
    try {
      const response = await adminFetch(`${API_BASE}/drivers/${driver._id}`, { cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.driver) {
        throw new Error(data?.message || `Unable to load driver details (${response.status})`);
      }
      setInspectDriver({
        ...data.driver,
        activeOrder: data.activeOrder || null,
        recentOrders: Array.isArray(data.recentOrders) ? data.recentOrders : [],
        ledger: Array.isArray(data.ledger) ? data.ledger : []
      });
    } catch (error) {
      showNotification(error?.message || "Unable to load driver details", true);
    }
  };

  const handleInspectOrder = async (order) => {
    setInspectOrder(order);
    try {
      const response = await adminFetch(`${API_BASE}/orders/${order._id}`, { cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.order) {
        throw new Error(data?.message || `Unable to load order details (${response.status})`);
      }
      setInspectOrder(data.order);
    } catch (error) {
      showNotification(error?.message || "Unable to load order details", true);
    }
  };

  // ==========================================================================
  // DISPATCH OPERATIONS & LIFECYCLE ACTIONS
  // ==========================================================================

  // 1. Assign Driver to Order
  const handleAssignDriver = async () => {
    if (!assignModalOrder || !selectedDriverIdForAssign) {
      alert("Please choose an available driver partner.");
      return;
    }
    try {
      const res = await adminFetch(`${API_BASE}/orders/${assignModalOrder._id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverId: selectedDriverIdForAssign })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to assign driver");

      showNotification(`Order #${assignModalOrder.orderNo} successfully assigned!`);
      setAssignModalOrder(null);
      setSelectedDriverIdForAssign("");
      fetchAllRealtimeData();
    } catch (err) {
      showNotification(err.message, true);
    }
  };

  // 2. Advance Order Status
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      const res = await adminFetch(`${API_BASE}/orders/${orderId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Status update failed");

      showNotification(`Order status updated to '${newStatus}'!`);
      fetchAllRealtimeData();
    } catch (err) {
      showNotification(err.message, true);
    }
  };

  // 3. Cancel Order
  const handleCancelOrder = async (orderId) => {
    const reason = prompt("Enter cancellation reason for the audit trail:");
    if (!reason) return;

    try {
      const res = await adminFetch(`${API_BASE}/orders/${orderId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Cancellation failed");

      showNotification("Order cancelled and archived.");
      fetchAllRealtimeData();
    } catch (err) {
      showNotification(err.message, true);
    }
  };

  // 4. Create Unified Dispatch (On-Demand or B2B)
  const handleCreateUnifiedDispatch = async (e) => {
    e.preventDefault();
    try {
      const endpoint = dispatchType === "b2b" ? `${API_BASE}/orders/create-b2b` : `${API_BASE}/orders/create-on-demand`;
      const payload = dispatchType === "b2b" ? {
        b2bClientId: dispatchForm.b2bClientId,
        driverId: dispatchForm.driverId || undefined,
        vehicleCode: dispatchForm.vehicleCode,
        pickup: { address: dispatchForm.pickupAddress, label: dispatchForm.pickupAddress },
        drop: { address: dispatchForm.dropAddress, label: dispatchForm.dropAddress },
        goodsType: dispatchForm.goodsType,
        weightKg: Number(dispatchForm.weightKg),
        totalFare: Number(dispatchForm.totalFare)
      } : {
        customerName: dispatchForm.customerName,
        customerPhone: dispatchForm.customerPhone,
        pickupAddress: dispatchForm.pickupAddress,
        dropAddress: dispatchForm.dropAddress,
        vehicleCode: dispatchForm.vehicleCode,
        goodsType: dispatchForm.goodsType,
        weightKg: Number(dispatchForm.weightKg),
        totalFare: Number(dispatchForm.totalFare),
        driverId: dispatchForm.driverId || undefined
      };

      const res = await adminFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Dispatch creation failed");

      showNotification(`Order #${data.order?.orderNo || ""} created & dispatched!`);
      setDispatchModalOpen(false);
      fetchAllRealtimeData();
    } catch (err) {
      showNotification(err.message, true);
    }
  };

  // 5. Driver Safety Status Toggle (Suspend / Activate)
  const handleToggleDriverStatus = async (driver) => {
    const newStatus = driver.status === "active" ? "blocked" : "active";
    const promptMsg = newStatus === "blocked"
      ? `Confirm SUSPENSION for ${driver.name}? The driver will be disconnected from the app and unable to accept orders.`
      : `Re-activate driver ${driver.name}?`;
    if (!confirm(promptMsg)) return;

    try {
      const res = await adminFetch(`${API_BASE}/drivers/${driver._id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Status change failed");

      showNotification(`Driver status set to ${newStatus.toUpperCase()}`);
      fetchAllRealtimeData();
    } catch (err) {
      showNotification(err.message, true);
    }
  };

  // 6. KYC Approval & Rejection
  const handleApproveKyc = async (driver) => {
    if (!confirm(`Confirm full KYC verification for ${driver.name}?`)) return;
    try {
      const res = await adminFetch(`${API_BASE}/drivers/${driver._id}/kyc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "verified" })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "KYC approval failed");

      showNotification(`KYC Approved for ${driver.name}!`);
      fetchAllRealtimeData();
    } catch (err) {
      showNotification(err.message, true);
    }
  };

  const handleRejectKyc = async () => {
    if (!rejectKycModalDriver || !rejectReason.trim()) {
      alert("Please specify a reason for KYC rejection.");
      return;
    }
    try {
      const res = await adminFetch(`${API_BASE}/drivers/${rejectKycModalDriver._id}/kyc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected", reason: rejectReason.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "KYC rejection failed");

      showNotification(`KYC rejected for ${rejectKycModalDriver.name}.`);
      setRejectKycModalDriver(null);
      setRejectReason("");
      fetchAllRealtimeData();
    } catch (err) {
      showNotification(err.message, true);
    }
  };

  const handleReviewKycDocument = async (approved) => {
    if (!inspectDriver || !lightboxDoc?.key) return;
    const reason = approved
      ? "Verified against the submitted application"
      : window.prompt(`What should ${inspectDriver.name} correct in ${lightboxDoc.title}?`);
    if (!reason) return;
    try {
      const res = await adminFetch(`${API_BASE}/drivers/${inspectDriver._id}/kyc/document`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentKey: lightboxDoc.key, approved, reason })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Document review failed");
      setInspectDriver((current) => current ? {
        ...current,
        partnerProfile: {
          ...current.partnerProfile,
          docs: { ...current.partnerProfile?.docs, [lightboxDoc.key]: approved },
          kycStatus: approved ? current.partnerProfile?.kycStatus : "pending",
          kycRejectionReason: approved ? current.partnerProfile?.kycRejectionReason : reason
        }
      } : current);
      setLightboxDoc((current) => current ? { ...current, verified: approved } : current);
      showNotification(approved ? `${lightboxDoc.title} approved.` : `Correction requested for ${lightboxDoc.title}.`);
      fetchAllRealtimeData(true);
    } catch (err) {
      showNotification(err.message, true);
    }
  };

  const openPayoutModal = (requestedDriver) => {
    if (requestedDriver && requestedDriver.partnerProfile?.kycStatus !== "verified") {
      showNotification("Driver KYC must be verified before payout.", true);
      return;
    }
    if (requestedDriver && (requestedDriver.partnerProfile?.walletBalance || 0) <= 0) {
      showNotification("This driver has no payable wallet balance.", true);
      return;
    }

    const driver = requestedDriver || eligibleDrivers.find(
      (candidate) => candidate.partnerProfile?.kycStatus === "verified"
    );
    if (!driver) {
      showNotification("No KYC-verified driver currently has a payable balance.", true);
      return;
    }

    setDisburseModalDriver(driver);
    setDisburseAmount(String(driver.partnerProfile?.walletBalance || 0));
    setDisbursePaymentMode(
      driver.partnerProfile?.bankDetails?.accountNumberMasked && driver.partnerProfile?.bankDetails?.ifsc
        ? "neft"
        : "upi"
    );
    setDisburseReference("");
  };

  // 7. Record a completed driver payout with compliance and duplicate guards.
  const handleDisbursePayout = async () => {
    if (!disburseModalDriver || !disburseAmount || Number(disburseAmount) <= 0) {
      showNotification("Enter a valid payout amount.", true);
      return;
    }
    if (Number(disburseAmount) > (disburseModalDriver.partnerProfile?.walletBalance || 0)) {
      showNotification("Payout amount cannot exceed the current wallet balance.", true);
      return;
    }
    if (!disburseReference.trim()) {
      showNotification("Enter the bank, UPI, or cash receipt reference.", true);
      return;
    }

    setDisbursing(true);
    try {
      const res = await adminFetch(`${API_BASE}/finance/disburse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverId: disburseModalDriver._id,
          amount: Number(disburseAmount),
          paymentMode: disbursePaymentMode,
          reference: disburseReference.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Disbursement failed");

      showNotification(`Recorded ₹${disburseAmount} payout to ${disburseModalDriver.name}.`);
      setDisburseModalDriver(null);
      setDisburseAmount("");
      setDisburseReference("");
      await fetchAllRealtimeData();
    } catch (err) {
      showNotification(err.message, true);
    } finally {
      setDisbursing(false);
    }
  };

  // 8. Coin Adjustment
  const handleAdjustCoins = async () => {
    if (!coinModalUser || !coinAdjustAmount || Number(coinAdjustAmount) <= 0 || !coinAdjustReason.trim()) {
      alert("Enter a valid coin amount and reason.");
      return;
    }
    try {
      const res = await adminFetch(`${API_BASE}/coins/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: coinModalUser._id,
          amount: Number(coinAdjustAmount),
          type: coinAdjustType,
          reason: coinAdjustReason
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Adjustment failed");

      showNotification(`${coinAdjustType === "credit" ? "Credited" : "Debited"} ${coinAdjustAmount} coins!`);
      setCoinModalUser(null);
      fetchAllRealtimeData();
    } catch (err) {
      showNotification(err.message, true);
    }
  };

  // 9. Register Corporate B2B Client
  const handleCreateB2bClient = async (e) => {
    e.preventDefault();
    try {
      const res = await adminFetch(`${API_BASE}/b2b/clients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newB2bData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Client registration failed");

      showNotification(`B2B Client '${newB2bData.companyName}' registered!`);
      setB2bRegisterOpen(false);
      setNewB2bData({
        companyName: "",
        contactPerson: "",
        phone: "",
        email: "",
        address: "",
        contractType: "on_demand",
        gstin: ""
      });
      fetchAllRealtimeData();
    } catch (err) {
      showNotification(err.message, true);
    }
  };

  // 10. Refresh the latest driver GPS data without mutating live coordinates.
  const handleRefreshDriverLocation = async (driver) => {
    if (!driver) return;
    try {
      await fetchAllRealtimeData(true);
      showNotification(`Latest location loaded for ${driver.name}.`);
    } catch (err) {
      showNotification(err?.message || "Unable to refresh driver location", true);
    }
  };

  // 11. Export Table Data to CSV
  const exportToCsv = (filename, rows, headers) => {
    if (!rows.length) return alert("No records available to export.");
    let csvContent = headers.join(",") + "\n";
    rows.forEach((r) => {
      const row = headers.map((h) => `"${(r[h] ?? "").toString().replace(/"/g, '""')}"`);
      csvContent += row.join(",") + "\n";
    });
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ==========================================================================
  // FILTERED & SORTED DATASETS
  // ==========================================================================
  const filteredOrders = useMemo(() => {
    let list = [...orders];
    if (orderSearch.trim()) {
      const q = orderSearch.toLowerCase();
      list = list.filter(
        (o) =>
          o.orderNo?.toLowerCase().includes(q) ||
          o.partner?.name?.toLowerCase().includes(q) ||
          o.partner?.phone?.toLowerCase().includes(q) ||
          o.pickup?.address?.toLowerCase().includes(q) ||
          o.drop?.address?.toLowerCase().includes(q) ||
          o.status?.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      let valA = a[orderSortField];
      let valB = b[orderSortField];
      if (orderSortField === "fare") {
        valA = a.fare?.total || 0;
        valB = b.fare?.total || 0;
      }
      if (valA < valB) return orderSortAsc ? -1 : 1;
      if (valA > valB) return orderSortAsc ? 1 : -1;
      return 0;
    });
    return list;
  }, [orders, orderSearch, orderSortField, orderSortAsc]);

  const filteredDrivers = useMemo(() => {
    let list = [...drivers];
    if (fleetFilter === "online") list = list.filter((d) => d.partnerProfile?.online);
    if (fleetFilter === "active_order") list = list.filter((d) => d.activeOrder);
    if (fleetFilter === "offline") list = list.filter((d) => !d.partnerProfile?.online);

    if (driverSearch.trim()) {
      const q = driverSearch.toLowerCase();
      list = list.filter(
        (d) =>
          d.name?.toLowerCase().includes(q) ||
          d.phone?.toLowerCase().includes(q) ||
          d.partnerProfile?.vehicleNumber?.toLowerCase().includes(q) ||
          d.city?.toLowerCase().includes(q) ||
          d.status?.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      let valA = a[driverSortField] || "";
      let valB = b[driverSortField] || "";
      if (valA < valB) return driverSortAsc ? -1 : 1;
      if (valA > valB) return driverSortAsc ? 1 : -1;
      return 0;
    });
    return list;
  }, [drivers, fleetFilter, driverSearch, driverSortField, driverSortAsc]);

  const selectedRadarDriver = useMemo(() => {
    return drivers.find((d) => d._id === selectedRadarDriverId) || drivers[0] || null;
  }, [drivers, selectedRadarDriverId]);

  const assignableDrivers = useMemo(() => drivers
    .filter((driver) =>
      driver.status === "active" &&
      driver.partnerProfile?.kycStatus === "verified" &&
      !driver.activeOrder
    )
    .sort((left, right) => Number(Boolean(right.partnerProfile?.online)) - Number(Boolean(left.partnerProfile?.online))),
  [drivers]);

  return (
    <div className={styles.adminLayout}>
      {/* Toast Notification */}
      {actionNotice && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 24,
            zIndex: 9999,
            background: actionNotice.isErr ? "#fff1f2" : "#f4ecff",
            color: actionNotice.isErr ? "#e11d48" : "#7C3AED",
            border: `1px solid ${actionNotice.isErr ? "#fecdd3" : "#d8b4fe"}`,
            padding: "12px 20px",
            borderRadius: 12,
            boxShadow: "0 8px 30px rgba(124, 58, 237, 0.18)",
            fontWeight: 700,
            fontSize: 13.5,
            display: "flex",
            alignItems: "center",
            gap: 10
          }}
        >
          <span aria-hidden="true">{actionNotice.isErr ? "Error" : "Done"}</span>
          <span>{actionNotice.msg}</span>
        </div>
      )}

      {/* ======================================================================
          SIDEBAR NAVIGATION (WHITE & PURPLE)
          ====================================================================== */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <Link href="/" className={styles.brandLogo}>
            <div className={styles.brandIconWrap}>IN</div>
            <div className={styles.brandTitles}>
              <span className={styles.brandName}>INDIERY</span>
              <span className={styles.brandSubtitle}>Admin console</span>
            </div>
          </Link>
        </div>

        <nav className={styles.sidebarNav}>
          <span className={styles.navCategory}>Operations</span>

          <button
            type="button"
            className={`${styles.navItem} ${activeTab === "radar" ? styles.active : ""}`}
            onClick={() => setActiveTab("radar")}
          >
            <span className={styles.navIcon}><SidebarIcon name="overview" /></span>
            <span>Overview</span>
            <span className={styles.navBadge}>{metrics.onlineDrivers} Online</span>
          </button>

          <button
            type="button"
            className={`${styles.navItem} ${activeTab === "orders" ? styles.active : ""}`}
            onClick={() => setActiveTab("orders")}
          >
            <span className={styles.navIcon}><SidebarIcon name="orders" /></span>
            <span>Orders</span>
            {metrics.searchingOrders > 0 ? (
              <span className={`${styles.navBadge} ${styles.navBadgeAlert}`}>
                {metrics.searchingOrders} unassigned
              </span>
            ) : (
              <span className={styles.navBadge}>{orders.length}</span>
            )}
          </button>

          <button
            type="button"
            className={`${styles.navItem} ${activeTab === "b2bOrders" ? styles.active : ""}`}
            onClick={() => setActiveTab("b2bOrders")}
          >
            <span className={styles.navIcon}><SidebarIcon name="business" /></span>
            <span>B2B orders</span>
          </button>

          <button
            type="button"
            className={`${styles.navItem} ${activeTab === "drivers" ? styles.active : ""}`}
            onClick={() => setActiveTab("drivers")}
          >
            <span className={styles.navIcon}><SidebarIcon name="drivers" /></span>
            <span>Drivers</span>
            <span className={styles.navBadge}>{drivers.length}</span>
          </button>

          <button
            type="button"
            className={`${styles.navItem} ${activeTab === "customers" ? styles.active : ""}`}
            onClick={() => setActiveTab("customers")}
          >
            <span className={styles.navIcon}><SidebarIcon name="customers" /></span>
            <span>Customers</span>
            <span className={styles.navBadge}>{coinUsers.length}</span>
          </button>

          <button
            type="button"
            className={`${styles.navItem} ${activeTab === "vehicles" ? styles.active : ""}`}
            onClick={() => setActiveTab("vehicles")}
          >
            <span className={styles.navIcon}><SidebarIcon name="vehicles" /></span>
            <span>Vehicles</span>
          </button>

          <span className={styles.navCategory}>Compliance and finance</span>

          <button
            type="button"
            className={`${styles.navItem} ${activeTab === "kyc" ? styles.active : ""}`}
            onClick={() => setActiveTab("kyc")}
          >
            <span className={styles.navIcon}><SidebarIcon name="kyc" /></span>
            <span>KYC review</span>
            {metrics.pendingKyc > 0 && (
              <span className={`${styles.navBadge} ${styles.navBadgeAlert}`}>
                {metrics.pendingKyc} pending
              </span>
            )}
          </button>

          <button
            type="button"
            className={`${styles.navItem} ${activeTab === "finance" ? styles.active : ""}`}
            onClick={() => setActiveTab("finance")}
          >
            <span className={styles.navIcon}><SidebarIcon name="payouts" /></span>
            <span>Payouts</span>
            <span className={styles.navBadge}>₹{metrics.pendingDriverDisbursements.toLocaleString("en-IN")}</span>
          </button>

          <button
            type="button"
            className={`${styles.navItem} ${activeTab === "coins" ? styles.active : ""}`}
            onClick={() => setActiveTab("coins")}
          >
            <span className={styles.navIcon}><SidebarIcon name="coins" /></span>
            <span>Coin ledger</span>
          </button>

          <button
            type="button"
            className={`${styles.navItem} ${activeTab === "payments" ? styles.active : ""}`}
            onClick={() => setActiveTab("payments")}
          >
            <span className={styles.navIcon}><SidebarIcon name="payments" /></span>
            <span>Payments &amp; refunds</span>
          </button>

          <button
            type="button"
            className={`${styles.navItem} ${activeTab === "pricing" ? styles.active : ""}`}
            onClick={() => setActiveTab("pricing")}
          >
            <span className={styles.navIcon}><SidebarIcon name="pricing" /></span>
            <span>Pricing &amp; charges</span>
          </button>

          <span className={styles.navCategory}>Customer experience</span>

          <button
            type="button"
            className={`${styles.navItem} ${activeTab === "disputes" ? styles.active : ""}`}
            onClick={() => setActiveTab("disputes")}
          >
            <span className={styles.navIcon}><SidebarIcon name="disputes" /></span>
            <span>Cancellations</span>
          </button>

          <button
            type="button"
            className={`${styles.navItem} ${activeTab === "support" ? styles.active : ""}`}
            onClick={() => setActiveTab("support")}
          >
            <span className={styles.navIcon}><SidebarIcon name="support" /></span>
            <span>Support tickets</span>
          </button>

          <button
            type="button"
            className={`${styles.navItem} ${activeTab === "notifications" ? styles.active : ""}`}
            onClick={() => setActiveTab("notifications")}
          >
            <span className={styles.navIcon}><SidebarIcon name="notifications" /></span>
            <span>Notifications</span>
          </button>

          <span className={styles.navCategory}>Insights &amp; configuration</span>

          <button
            type="button"
            className={`${styles.navItem} ${activeTab === "reports" ? styles.active : ""}`}
            onClick={() => setActiveTab("reports")}
          >
            <span className={styles.navIcon}><SidebarIcon name="reports" /></span>
            <span>Reports</span>
          </button>

          <button
            type="button"
            className={`${styles.navItem} ${activeTab === "areas" ? styles.active : ""}`}
            onClick={() => setActiveTab("areas")}
          >
            <span className={styles.navIcon}><SidebarIcon name="areas" /></span>
            <span>Service areas</span>
          </button>

          <button
            type="button"
            className={`${styles.navItem} ${activeTab === "admins" ? styles.active : ""}`}
            onClick={() => setActiveTab("admins")}
          >
            <span className={styles.navIcon}><SidebarIcon name="customers" /></span>
            <span>Admin users</span>
          </button>

          <button
            type="button"
            className={`${styles.navItem} ${activeTab === "settings" ? styles.active : ""}`}
            onClick={() => setActiveTab("settings")}
          >
            <span className={styles.navIcon}><SidebarIcon name="settings" /></span>
            <span>Settings &amp; audit</span>
          </button>

          <span className={styles.navCategory}>Accounts</span>

          <button
            type="button"
            className={`${styles.navItem} ${activeTab === "b2b" ? styles.active : ""}`}
            onClick={() => setActiveTab("b2b")}
          >
            <span className={styles.navIcon}><SidebarIcon name="business" /></span>
            <span>B2B clients</span>
            <span className={styles.navBadge}>{b2bClients.length}</span>
          </button>

          <button
            type="button"
            className={`${styles.navItem} ${activeTab === "enterpriseEnquiries" ? styles.active : ""}`}
            onClick={() => setActiveTab("enterpriseEnquiries")}
          >
            <span className={styles.navIcon}><SidebarIcon name="business" /></span>
            <span>Enterprise enquiries</span>
          </button>

          <button
            type="button"
            className={`${styles.navItem} ${activeTab === "accountDeletionRequests" ? styles.active : ""}`}
            onClick={() => setActiveTab("accountDeletionRequests")}
          >
            <span className={styles.navIcon}><SidebarIcon name="deletion" /></span>
            <span>Account deletion</span>
          </button>

          <button
            type="button"
            className={`${styles.navItem} ${activeTab === "billing" ? styles.active : ""}`}
            onClick={() => setActiveTab("billing")}
          >
            <span className={styles.navIcon}><SidebarIcon name="payments" /></span>
            <span>Business billing</span>
          </button>
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.adminAvatar}><SidebarIcon name="drivers" /></div>
          <div className={styles.adminDetails}>
            <span className={styles.adminName}>Signed-in administrator</span>
            <span className={styles.adminRole}>Administrator</span>
          </div>
        </div>
      </aside>

      {/* ======================================================================
          MAIN SHELL
          ====================================================================== */}
      <main className={styles.mainShell}>
        {/* Top Header Bar */}
        <header className={styles.topBar}>
          <div className={styles.topBarLeft}>
            <div className={styles.pageTitleGroup}>
              <h1 className={styles.pageTitle}>
                {activeTab === "radar" && "Dashboard"}
                {activeTab === "orders" && "Orders"}
                {activeTab === "drivers" && "Drivers"}
                {activeTab === "kyc" && "KYC review"}
                {activeTab === "finance" && "Payouts"}
                {activeTab === "coins" && "Coin ledger"}
                {activeTab === "b2b" && "B2B clients"}
                {EXTENDED_TAB_TITLES[activeTab] || ""}
              </h1>
              <span className={styles.pageSubtitle}>
                <span>● Live data</span>
                <span>•</span>
                <span>{drivers.length} Drivers Attached</span>
                <span>•</span>
                <span>{orders.length} Orders Logged</span>
              </span>
            </div>
          </div>

          <div className={styles.topBarRight}>
            <div
              className={styles.realtimePill}
              title={syncError || (lastSynced ? `Last synced ${lastSynced.toLocaleTimeString()}` : "Connecting to MongoDB")}
              style={syncError ? { color: "#be123c", background: "#fff1f2", borderColor: "#fecdd3" } : undefined}
            >
              <span className={styles.pulseDot} style={syncError ? { background: "#e11d48" } : undefined}></span>
              <span>
                {syncing || loading
                  ? "Syncing MongoDB..."
                  : syncError
                    ? "Admin API disconnected"
                    : "Live DB Connected"}
              </span>
            </div>

            <button
              type="button"
              className={styles.refreshBtn}
              onClick={() => fetchAllRealtimeData()}
              title="Refresh from MongoDB"
            >
              <span>Sync</span>
            </button>

            <button
              type="button"
              className={styles.primaryBtn}
              onClick={() => setDispatchModalOpen(true)}
            >
              <span>New dispatch</span>
            </button>

            <Link href="/" className={styles.homeBackLink}>
              Website →
            </Link>

            <button type="button" className={styles.logoutBtn} onClick={handleAdminLogout}>
              Sign out
            </button>
          </div>
        </header>

        {syncError && (
          <div
            role="alert"
            style={{
              margin: "16px 24px 0",
              padding: "12px 16px",
              borderRadius: 10,
              border: "1px solid #fecdd3",
              background: "#fff1f2",
              color: "#9f1239",
              fontSize: 13,
              fontWeight: 600
            }}
          >
            {syncError}
          </div>
        )}

        <div className={styles.contentContainer}>
          {/* ==================================================================
              EXECUTIVE METRIC CARDS
              ================================================================== */}
          {!EXTENDED_TAB_TITLES[activeTab] && <section className={styles.metricsGrid}>
            <div className={styles.metricCard}>
              <div className={styles.metricHeader}>
                <span className={styles.metricTitle}>Active Deliveries</span>
                <span className={styles.metricIcon}><SidebarIcon name="orders" /></span>
              </div>
              <span className={styles.metricValue}>{metrics.activeOrders}</span>
              <span className={styles.metricSubtext}>
                <strong className={styles.trendPositive}>● {metrics.searchingOrders} unassigned</strong> in queue
              </span>
            </div>

            <div className={styles.metricCard}>
              <div className={styles.metricHeader}>
                <span className={styles.metricTitle}>Driver Fleet</span>
                <span className={styles.metricIcon}><SidebarIcon name="drivers" /></span>
              </div>
              <span className={styles.metricValue}>{drivers.length}</span>
              <span className={styles.metricSubtext}>
                <strong className={styles.trendPositive}>{metrics.onlineDrivers} Online</strong> currently
              </span>
            </div>

            <div className={styles.metricCard}>
              <div className={styles.metricHeader}>
                <span className={styles.metricTitle}>Gross Merchandise (GMV)</span>
                <span className={styles.metricIcon}><SidebarIcon name="coins" /></span>
              </div>
              <span className={styles.metricValue}>
                ₹{(metrics.totalGmv || 0).toLocaleString("en-IN")}
              </span>
              <span className={styles.metricSubtext}>
                Platform share: <strong>{metrics.totalGmv > 0 ? Math.round((metrics.platformCommission / metrics.totalGmv) * 100) : 0}%</strong>
              </span>
            </div>

            <div className={styles.metricCard}>
              <div className={styles.metricHeader}>
                <span className={styles.metricTitle}>Pending Payouts</span>
                <span className={styles.metricIcon}><SidebarIcon name="payouts" /></span>
              </div>
              <span className={styles.metricValue}>
                ₹{metrics.pendingDriverDisbursements.toLocaleString("en-IN")}
              </span>
              <span className={styles.metricSubtext}>Driver Wallet Liability</span>
            </div>
          </section>}

          {/* ==================================================================
              TAB 1: LIVE RADAR & TELEMETRY WITH ROUTE LINES
              ================================================================== */}
          {activeTab === "radar" && (
            <div className={styles.cardPanel}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitle}>
                  <span>Fleet status</span>
                  <span className={styles.cardTitleBadge}>Live GPS</span>
                </div>

                <div className={styles.cardActions}>
                  {/* Fleet status filter buttons */}
                  <div className={styles.filterButtonGroup}>
                    <button
                      type="button"
                      className={`${styles.filterBtn} ${fleetFilter === "all" ? styles.active : ""}`}
                      onClick={() => setFleetFilter("all")}
                    >
                      All ({drivers.length})
                    </button>
                    <button
                      type="button"
                      className={`${styles.filterBtn} ${fleetFilter === "online" ? styles.active : ""}`}
                      onClick={() => setFleetFilter("online")}
                    >
                      Online ({metrics.onlineDrivers})
                    </button>
                    <button
                      type="button"
                      className={`${styles.filterBtn} ${fleetFilter === "active_order" ? styles.active : ""}`}
                      onClick={() => setFleetFilter("active_order")}
                    >
                      On Trip ({drivers.filter((d) => d.activeOrder).length})
                    </button>
                  </div>

                  {selectedRadarDriver && (
                    <button
                      type="button"
                      className={styles.secondaryBtn}
                      onClick={() => handleRefreshDriverLocation(selectedRadarDriver)}
                    >
                      <span>Refresh GPS: {selectedRadarDriver.name.split(" ")[0]}</span>
                    </button>
                  )}
                </div>
              </div>

              <div className={styles.radarGridWrap}>
                {/* Interactive street map using the drivers' last reported GPS coordinates. */}
                <div className={styles.mapViewport}>
                  <LiveFleetMap
                    drivers={filteredDrivers}
                    selectedDriverId={selectedRadarDriverId}
                    onSelectDriver={setSelectedRadarDriverId}
                  />

                  {/* Telemetry HUD */}
                  <div className={styles.mapOverlayHUD}>
                    <span className={styles.hudTitle}>Latest location</span>
                    {selectedRadarDriver ? (
                      <>
                        <span className={styles.hudCoords}>
                          {Number.isFinite(selectedRadarDriver.partnerProfile?.currentLocation?.lat) && Number.isFinite(selectedRadarDriver.partnerProfile?.currentLocation?.lng)
                            ? `${selectedRadarDriver.partnerProfile.currentLocation.lat.toFixed(4)}° N, ${selectedRadarDriver.partnerProfile.currentLocation.lng.toFixed(4)}° E`
                            : "No GPS coordinates received"}
                        </span>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginTop: 2 }}>
                          {selectedRadarDriver.name} · {selectedRadarDriver.partnerProfile?.vehicleNumber || "No vehicle number"}
                        </div>
                        <span className={styles.hudStatus}>
                          Speed: <strong>{selectedRadarDriver.partnerProfile?.currentLocation?.speed != null ? `${selectedRadarDriver.partnerProfile.currentLocation.speed} km/h` : "Unavailable"}</strong> • Status:{" "}
                          <strong style={{ color: selectedRadarDriver.partnerProfile?.online ? "#059669" : "#94a3b8" }}>
                            {selectedRadarDriver.partnerProfile?.online ? "Online" : "Offline"}
                          </strong>
                        </span>
                        {selectedRadarDriver.activeOrder && (
                          <div style={{ marginTop: 4, padding: "4px 8px", background: "#f5f3ff", borderRadius: 6, fontSize: 11, color: "#7C3AED", fontWeight: 700 }}>
                            Active Trip: #{selectedRadarDriver.activeOrder.orderNo}
                          </div>
                        )}
                      </>
                    ) : (
                      <span className={styles.hudStatus}>Select a driver partner to inspect GPS feed.</span>
                    )}
                  </div>
                </div>

                {/* Driver Telemetry Sidebar */}
                <div className={styles.radarSidebar}>
                  <div className={styles.sectionSearchBox}>
                    <span className={styles.searchIcon} aria-hidden="true"></span>
                    <input
                      type="text"
                      className={styles.searchInput}
                      placeholder="Search active drivers..."
                      value={driverSearch}
                      onChange={(e) => setDriverSearch(e.target.value)}
                    />
                  </div>

                  <div className={styles.radarDriverList}>
                    {filteredDrivers.map((driver) => (
                      <div
                        key={driver._id}
                        className={`${styles.driverRadarItem} ${
                          selectedRadarDriverId === driver._id ? styles.selected : ""
                        }`}
                        onClick={() => setSelectedRadarDriverId(driver._id)}
                      >
                        <div className={styles.driverRadarTop}>
                          <span className={styles.driverRadarName}>{driver.name}</span>
                          <span className={styles.driverVehicleBadge}>
                            {driver.partnerProfile?.vehicleNumber || "No plate"}
                          </span>
                        </div>

                        <div className={styles.driverRadarMeta}>
                          <span>
                            {driver.partnerProfile?.online ? (
                              <strong style={{ color: "#059669" }}>● Online &amp; Active</strong>
                            ) : (
                              <span style={{ color: "#94a3b8" }}>○ Offline</span>
                            )}
                          </span>
                          <span className={styles.radarTelemetry}>
                            {driver.partnerProfile?.currentLocation?.speed != null ? `${driver.partnerProfile.currentLocation.speed} km/h` : "Speed unavailable"} · {driver.partnerProfile?.rating != null ? `${driver.partnerProfile.rating}/5` : "Not rated"}
                          </span>
                        </div>

                        <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                          <button
                            type="button"
                            className={styles.outlineBtn}
                            style={{ flex: 1, padding: "5px 8px", fontSize: 11 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInspectDriver(driver);
                            }}
                          >
                            View profile
                          </button>
                          <button
                            type="button"
                            className={styles.secondaryBtn}
                            style={{ padding: "5px 8px", fontSize: 11 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRefreshDriverLocation(driver);
                            }}
                          >
                            Refresh location
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================================
              TAB 2: ORDERS & DISPATCH OPERATIONS
              ================================================================== */}
          {activeTab === "orders" && (
            <div className={styles.cardPanel}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitle}>
                  <span>Orders</span>
                  <span className={styles.cardTitleBadge}>{filteredOrders.length} Orders</span>
                </div>

                <div className={styles.cardActions}>
                  <div className={styles.sectionSearchBox} style={{ width: 280 }}>
                    <span className={styles.searchIcon} aria-hidden="true"></span>
                    <input
                      type="text"
                      className={styles.searchInput}
                      placeholder="Search Order ID, Driver, Route..."
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                    />
                  </div>

                  <button
                    type="button"
                    className={styles.outlineBtn}
                    onClick={() =>
                      exportToCsv(
                        "indiery-orders",
                        orders.map((o) => ({
                          OrderID: o.orderNo,
                          Status: o.status,
                          Pickup: o.pickup?.address,
                          Drop: o.drop?.address,
                          Fare: o.fare?.total,
                          Driver: o.partner?.name || "Unassigned",
                          DriverPhone: o.partner?.phone || "",
                          Created: o.createdAt
                        })),
                        ["OrderID", "Status", "Pickup", "Drop", "Fare", "Driver", "DriverPhone", "Created"]
                      )
                    }
                  >
                    <span>Export CSV</span>
                  </button>

                  <button
                    type="button"
                    className={styles.primaryBtn}
                    onClick={() => setDispatchModalOpen(true)}
                  >
                    <span>New order</span>
                  </button>
                </div>
              </div>

              {filteredOrders.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>0</div>
                  <span className={styles.emptyTitle}>No Orders Found in Database</span>
                  <span className={styles.emptyText}>
                    Orders created by customers via the mobile app or manual dispatch will appear here immediately.
                  </span>
                  <button
                    type="button"
                    className={styles.primaryBtn}
                    onClick={() => setDispatchModalOpen(true)}
                  >
                    Dispatch First Order
                  </button>
                </div>
              ) : (
                <div className={styles.tableContainer}>
                  <table className={styles.dataTable}>
                    <thead>
                      <tr>
                        <th
                          className={styles.sortableTh}
                          onClick={() => {
                            setOrderSortField("orderNo");
                            setOrderSortAsc(!orderSortAsc);
                          }}
                        >
                          Order ID
                          <span className={styles.sortArrow}>{orderSortField === "orderNo" ? (orderSortAsc ? "▲" : "▼") : ""}</span>
                        </th>
                        <th>Pickup &amp; Drop Route</th>
                        <th>Goods &amp; Vehicle</th>
                        <th>Assigned Driver</th>
                        <th>Status</th>
                        <th
                          className={styles.sortableTh}
                          onClick={() => {
                            setOrderSortField("fare");
                            setOrderSortAsc(!orderSortAsc);
                          }}
                        >
                          Fare
                          <span className={styles.sortArrow}>{orderSortField === "fare" ? (orderSortAsc ? "▲" : "▼") : ""}</span>
                        </th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ textAlign: "center", padding: "48px 16px", color: "#64748b" }}>
                            <strong style={{ fontSize: 15, color: "#1e293b", display: "block", marginBottom: 4 }}>
                              No Orders in Database Currently
                            </strong>
                            <span style={{ fontSize: 13 }}>
                            Orders placed through the customer app or booked by an administrator appear here in real time.
                            </span>
                          </td>
                        </tr>
                      ) : (
                        filteredOrders.map((ord) => (
                          <tr key={ord._id}>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <strong style={{ color: "#0f172a" }}>{ord.orderNo}</strong>
                                <button
                                  type="button"
                                  className={styles.copyableBadge}
                                  onClick={() => copyToClipboard(ord.orderNo, ord._id)}
                                  title="Copy Order ID"
                                >
                                      {copiedKey === ord._id ? "Copied" : "Copy"}
                                </button>
                              </div>
                              <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                                {new Date(ord.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </div>
                            </td>
                            <td>
                                <div style={{ fontSize: 13, fontWeight: 600 }}>{ord.pickup?.address}</div>
                              <div style={{ fontSize: 12, color: "#7C3AED", marginTop: 2 }}>➔ {ord.drop?.address}</div>
                            </td>
                            <td>
                              <div>{ord.goodsType || "Not provided"}</div>
                              <div style={{ fontSize: 11, color: "#64748b" }}>
                                {ord.weightKg != null ? `${ord.weightKg} kg` : "Weight not provided"} · {ord.vehicle?.name || "Vehicle not provided"}
                              </div>
                            </td>
                            <td>
                              {ord.partner ? (
                                <div>
                                  <strong>{ord.partner.name}</strong>
                                  <div style={{ fontSize: 11, color: "#64748b" }}>{ord.partner.phone}</div>
                                </div>
                              ) : (
                                <span style={{ color: "#d97706", fontWeight: 700, fontSize: 12 }}>
                                      Needs driver
                                </span>
                              )}
                            </td>
                            <td>
                              <span className={`${styles.statusPill} ${styles[ord.status] || styles.pending}`}>
                                {ord.status?.replace("_", " ")}
                              </span>
                            </td>
                            <td>
                              <strong style={{ color: "#7C3AED", fontSize: 14 }}>
                                {ord.fare?.total != null ? `₹${ord.fare.total}` : "Not provided"}
                              </strong>
                            </td>
                            <td>
                              <div style={{ display: "flex", gap: 6 }}>
                                <button
                                  type="button"
                                  className={styles.outlineBtn}
                                  style={{ padding: "6px 12px", fontSize: 12 }}
                                  onClick={() => handleInspectOrder(ord)}
                                >
                                  Details
                                </button>
                                <button
                                  type="button"
                                  className={styles.secondaryBtn}
                                  style={{ padding: "6px 12px", fontSize: 12 }}
                                  onClick={() => {
                                    setAssignModalOrder(ord);
                                    setSelectedDriverIdForAssign(ord.partner?._id || "");
                                  }}
                                >
                                  {ord.partner ? "Reassign" : "Assign"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ==================================================================
              TAB 3: DRIVER 360° PROFILES
              ================================================================== */}
          {activeTab === "drivers" && (
            <div className={styles.cardPanel}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitle}>
                  <span>Drivers</span>
                  <span className={styles.cardTitleBadge}>{filteredDrivers.length} Partners</span>
                </div>

                <div className={styles.cardActions}>
                  <div className={styles.sectionSearchBox} style={{ width: 280 }}>
                    <span className={styles.searchIcon} aria-hidden="true"></span>
                    <input
                      type="text"
                      className={styles.searchInput}
                      placeholder="Search driver by name, phone, plate..."
                      value={driverSearch}
                      onChange={(e) => setDriverSearch(e.target.value)}
                    />
                  </div>

                  <button
                    type="button"
                    className={styles.outlineBtn}
                    onClick={() =>
                      exportToCsv(
                        "indiery-drivers",
                        drivers.map((d) => ({
                          Name: d.name,
                          Phone: d.phone,
                          Plate: d.partnerProfile?.vehicleNumber,
                          Status: d.status,
                          KYC: d.partnerProfile?.kycStatus,
                          Balance: d.partnerProfile?.walletBalance,
                          City: d.city
                        })),
                        ["Name", "Phone", "Plate", "Status", "KYC", "Balance", "City"]
                      )
                    }
                  >
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              <div className={styles.tableContainer}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th
                        className={styles.sortableTh}
                        onClick={() => {
                          setDriverSortField("name");
                          setDriverSortAsc(!driverSortAsc);
                        }}
                      >
                        Driver Partner
                        <span className={styles.sortArrow}>{driverSortField === "name" ? (driverSortAsc ? "▲" : "▼") : ""}</span>
                      </th>
                      <th>Phone &amp; City</th>
                      <th>Vehicle Registered</th>
                      <th>KYC Status</th>
                      <th>Account Status</th>
                      <th>Wallet Balance</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDrivers.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: "center", padding: "48px 16px", color: "#64748b" }}>
                          <strong style={{ fontSize: 15, color: "#1e293b", display: "block", marginBottom: 4 }}>
                            No Driver Partners in Database
                          </strong>
                          <span style={{ fontSize: 13 }}>
                            Drivers who register and complete onboarding in the mobile app will be displayed here in real-time.
                          </span>
                        </td>
                      </tr>
                    ) : (
                      filteredDrivers.map((driver) => (
                        <tr key={driver._id}>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div className={styles.adminAvatar}>{driver.initials || "D"}</div>
                              <div>
                                <strong>{driver.name}</strong>
                                <div style={{ fontSize: 11, color: "#64748b" }}>
                                {driver.partnerProfile?.online ? "Online" : "Offline"} · {driver.partnerProfile?.rating != null ? `${driver.partnerProfile.rating}/5` : "Not rated"}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div>{driver.phone}</div>
                            <div style={{ fontSize: 11, color: "#64748b" }}>{driver.city || "City not provided"}</div>
                          </td>
                          <td>
                            <strong>{driver.partnerProfile?.vehicleNumber || "Not provided"}</strong>
                            <div style={{ fontSize: 11, color: "#64748b" }}>
                              {driver.partnerProfile?.vehicleId?.name || "Vehicle not provided"}
                            </div>
                          </td>
                          <td>
                            <span className={`${styles.statusPill} ${styles[driver.partnerProfile?.kycStatus] || styles.pending}`}>
                              {driver.partnerProfile?.kycStatus || "pending"}
                            </span>
                          </td>
                          <td>
                            <span className={`${styles.statusPill} ${driver.status === "active" ? styles.active : styles.blocked}`}>
                              {driver.status === "active" ? "Active" : "Suspended"}
                            </span>
                          </td>
                          <td>
                            <strong style={{ color: "#7C3AED", fontSize: 14 }}>
                              ₹{(driver.partnerProfile?.walletBalance || 0).toLocaleString("en-IN")}
                            </strong>
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: 6 }}>
                              <button
                                type="button"
                                className={styles.secondaryBtn}
                                style={{ padding: "6px 12px", fontSize: 12 }}
                                onClick={() => handleInspectDriver(driver)}
                              >
                                View profile
                              </button>
                              <button
                                type="button"
                                className={driver.status === "active" ? styles.dangerBtn : styles.successBtn}
                                style={{ padding: "6px 10px", fontSize: 11 }}
                                onClick={() => handleToggleDriverStatus(driver)}
                              >
                                {driver.status === "active" ? "Suspend" : "Activate"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================================================================
              TAB 4: KYC VERIFICATION DESK
              ================================================================== */}
          {activeTab === "kyc" && (
            <div className={styles.cardPanel}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitle}>
                  <span>Driver KYC documents</span>
                  <span className={styles.cardTitleBadge}>Review queue</span>
                </div>

                <div className={styles.cardActions}>
                  <div className={styles.sectionSearchBox} style={{ width: 280 }}>
                    <span className={styles.searchIcon} aria-hidden="true"></span>
                    <input
                      type="text"
                      className={styles.searchInput}
                      placeholder="Search driver by name or phone..."
                      value={kycSearch}
                      onChange={(e) => setKycSearch(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className={styles.tableContainer}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>Driver Partner</th>
                      <th>Documents Uploaded</th>
                      <th>KYC Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drivers.filter((d) => !kycSearch || d.name.toLowerCase().includes(kycSearch.toLowerCase()) || d.phone.includes(kycSearch)).length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: "center", padding: "48px 16px", color: "#64748b" }}>
                          <strong style={{ fontSize: 15, color: "#1e293b", display: "block", marginBottom: 4 }}>
                            No Driver KYC Submissions Found
                          </strong>
                          <span style={{ fontSize: 13 }}>
                            When driver partners upload KYC documents via the mobile app, their profiles appear here for verification.
                          </span>
                        </td>
                      </tr>
                    ) : (
                      drivers
                        .filter((d) => !kycSearch || d.name.toLowerCase().includes(kycSearch.toLowerCase()) || d.phone.includes(kycSearch))
                        .map((driver) => {
                          const submittedCount = uploadedKycDocuments(driver).length;

                          return (
                            <tr key={driver._id}>
                              <td>
                                <strong>{driver.name}</strong>
                                <div style={{ fontSize: 11, color: "#64748b" }}>
                                  {driver.phone} • {driver.partnerProfile?.vehicleNumber}
                                </div>
                              </td>
                              <td>
                                <div style={{ fontWeight: 600 }}>{submittedCount} / 7 files available</div>
                                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                                  Aadhaar, DL, RC, Insurance, PAN, Bank Details
                                </div>
                              </td>
                              <td>
                                <span className={`${styles.statusPill} ${styles[driver.partnerProfile?.kycStatus] || styles.pending}`}>
                                  {driver.partnerProfile?.kycStatus || "pending"}
                                </span>
                                {driver.partnerProfile?.kycRejectionReason && (
                                  <div style={{ fontSize: 11, color: "#be123c", marginTop: 5, maxWidth: 220 }}>
                                    {driver.partnerProfile.kycRejectionReason}
                                  </div>
                                )}
                              </td>
                              <td>
                                <div style={{ display: "flex", gap: 8 }}>
                                  <button
                                    type="button"
                                    className={styles.outlineBtn}
                                    style={{ padding: "6px 12px", fontSize: 12 }}
                                    onClick={() => handleInspectDriver(driver)}
                                  >
                                    Review documents ({submittedCount})
                                  </button>
                                  <button
                                    type="button"
                                    className={styles.successBtn}
                                    onClick={() => handleApproveKyc(driver)}
                                  >
                                    ✓ Approve
                                  </button>
                                  <button
                                    type="button"
                                    className={styles.dangerBtn}
                                    onClick={() => {
                                      setRejectKycModalDriver(driver);
                                      setRejectReason("Document photo blurred or illegible");
                                    }}
                                  >
                                    ✕ Reject
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================================================================
              TAB 5: FINANCIAL DISBURSEMENT & COMMISSION SPLIT
              ================================================================== */}
          {activeTab === "finance" && (
            <div className={styles.cardPanel}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitle}>
                  <span>Payouts</span>
                  <span className={styles.cardTitleBadge}>Recorded settlements</span>
                </div>

                <div className={styles.cardActions}>
                  <button
                    type="button"
                    className={styles.primaryBtn}
                    onClick={() => openPayoutModal()}
                  >
                    <span>Pay a driver</span>
                  </button>
                  <button
                    type="button"
                    className={styles.outlineBtn}
                    onClick={() => window.open(`${API_BASE}/finance/export-payouts-csv`, "_blank")}
                  >
                    <span>Download payout CSV</span>
                  </button>
                </div>
              </div>

              {/* Commission Ledger Card */}
              <div
                style={{
                  background: "linear-gradient(135deg, #fbf8ff 0%, #f4ecff 100%)",
                  border: "1px solid #e9d5ff",
                  borderRadius: 14,
                  padding: "18px 24px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 16
                }}
              >
                <div>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: "#7C3AED", textTransform: "uppercase" }}>
                    Driver payout settlement
                  </span>
                  <div style={{ fontSize: 17, fontWeight: 800, color: "#0f172a", marginTop: 2 }}>
                    Record completed bank, UPI, or cash payments to drivers
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11.5, color: "#64748b" }}>Total Pending Disbursement Liability</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#7C3AED" }}>
                    ₹{metrics.pendingDriverDisbursements.toLocaleString("en-IN")}
                  </div>
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", marginBottom: 12 }}>
                  Drivers with Payable Balances
                </h3>

                <div className={styles.tableContainer}>
                  <table className={styles.dataTable}>
                    <thead>
                      <tr>
                        <th>Driver Partner</th>
                        <th>Registered Bank Account</th>
                        <th>KYC Compliance</th>
                        <th>Wallet Balance</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eligibleDrivers.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ textAlign: "center", padding: "48px 16px", color: "#64748b" }}>
                            <strong style={{ fontSize: 15, color: "#1e293b", display: "block", marginBottom: 4 }}>
                              No Pending Disbursements
                            </strong>
                            <span style={{ fontSize: 13 }}>
                              Driver partners with trip earnings and payable balances will appear here for settlement.
                            </span>
                          </td>
                        </tr>
                      ) : (
                        eligibleDrivers.map((driver) => {
                          const isKycVerified = driver.partnerProfile?.kycStatus === "verified";
                          return (
                            <tr key={driver._id}>
                              <td>
                                <strong>{driver.name}</strong>
                                <div style={{ fontSize: 11, color: "#64748b" }}>
                                  {driver.phone} • {driver.partnerProfile?.vehicleNumber}
                                </div>
                              </td>
                              <td>
                                <div style={{ fontWeight: 600 }}>
                                  {driver.partnerProfile?.bankDetails?.accountHolder || driver.name}
                                </div>
                                <div style={{ fontSize: 11, color: "#64748b" }}>
                                  A/C: {driver.partnerProfile?.bankDetails?.accountNumberMasked || "Not provided"} (IFSC:{" "}
                                  {driver.partnerProfile?.bankDetails?.ifsc || "Not provided"})
                                </div>
                              </td>
                              <td>
                                <span
                                  className={`${styles.statusPill} ${
                                    isKycVerified ? styles.verified : styles.pending
                                  }`}
                                >
                                  {isKycVerified ? "Verified (Approved)" : "Pending KYC"}
                                </span>
                              </td>
                              <td>
                                <strong style={{ color: "#7C3AED", fontSize: 15 }}>
                                  ₹{(driver.partnerProfile?.walletBalance || 0).toLocaleString("en-IN")}
                                </strong>
                              </td>
                              <td>
                                <div className={styles.rowActions}>
                                  <button
                                    type="button"
                                    className={styles.outlineBtn}
                                    style={{ padding: "7px 12px", fontSize: 12 }}
                                    onClick={() => handleInspectDriver(driver)}
                                  >
                                    View payout details
                                  </button>
                                  <button
                                    type="button"
                                    className={isKycVerified ? styles.primaryBtn : styles.outlineBtn}
                                    style={{ padding: "7px 12px", fontSize: 12 }}
                                    onClick={() => isKycVerified
                                      ? openPayoutModal(driver)
                                      : showNotification("Driver KYC must be verified before payout.", true)}
                                  >
                                    {isKycVerified ? "Pay driver" : "KYC locked"}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", marginBottom: 12 }}>
                  Recent payout records
                </h3>
                <div className={styles.tableContainer}>
                  <table className={styles.dataTable}>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Driver</th>
                        <th>Amount</th>
                        <th>Reference</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentPayouts.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ textAlign: "center", padding: "30px 16px", color: "#64748b" }}>
                            No completed payout records yet.
                          </td>
                        </tr>
                      ) : recentPayouts.map((payout) => (
                        <tr key={payout._id}>
                          <td>{payout.createdAt ? new Date(payout.createdAt).toLocaleString("en-IN") : "Not available"}</td>
                          <td>
                            <strong>{payout.user?.name || "Driver"}</strong>
                            <div style={{ fontSize: 11, color: "#64748b" }}>{payout.user?.phone || ""}</div>
                          </td>
                          <td><strong>₹{Number(payout.amount || 0).toLocaleString("en-IN")}</strong></td>
                          <td><span className={styles.copyableBadge}>{payout.reference || "Not provided"}</span></td>
                          <td><span className={`${styles.statusPill} ${styles.verified}`}>Recorded</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================================
              TAB 6: COIN REWARDS CONTROL
              ================================================================== */}
          {activeTab === "coins" && (
            <div className={styles.cardPanel}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitle}>
                  <span>Coin balances and ledger</span>
                  <span className={styles.cardTitleBadge}>Platform Rewards</span>
                </div>

                <div className={styles.cardActions}>
                  <div className={styles.sectionSearchBox} style={{ width: 280 }}>
                    <span className={styles.searchIcon} aria-hidden="true"></span>
                    <input
                      type="text"
                      className={styles.searchInput}
                      placeholder="Search user by name or phone..."
                      value={coinSearch}
                      onChange={(e) => setCoinSearch(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className={styles.tableContainer}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Phone</th>
                      <th>Role</th>
                      <th>Coin Balance</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coinUsers
                      .filter((u) => !coinSearch || u.name.toLowerCase().includes(coinSearch.toLowerCase()) || u.phone.includes(coinSearch))
                      .map((user) => (
                        <tr key={user._id}>
                          <td>
                            <strong>{user.name}</strong>
                          </td>
                          <td>{user.phone}</td>
                          <td>
                            <span className={styles.statusPill} style={{ background: "#ede9fe", color: "#7C3AED" }}>
                              {user.role}
                            </span>
                          </td>
                          <td>
                            <strong style={{ color: "#d97706", fontSize: 15 }}>
                              {user.customerProfile?.coins || 0} coins
                            </strong>
                          </td>
                          <td>
                            <button
                              type="button"
                              className={styles.secondaryBtn}
                              style={{ padding: "6px 12px", fontSize: 12 }}
                              onClick={() => {
                                setCoinModalUser(user);
                                setCoinAdjustAmount("50");
                              }}
                            >
                              Adjust Coins
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================================================================
              TAB 7: CORPORATE B2B HUB
              ================================================================== */}
          {activeTab === "b2b" && (
            <div className={styles.cardPanel}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitle}>
                  <span>B2B clients</span>
                  <span className={styles.cardTitleBadge}>{b2bClients.length} Enterprise Clients</span>
                </div>

                <div className={styles.cardActions}>
                  <div className={styles.sectionSearchBox} style={{ width: 280 }}>
                    <span className={styles.searchIcon} aria-hidden="true"></span>
                    <input
                      type="text"
                      className={styles.searchInput}
                      placeholder="Search corporate client..."
                      value={b2bSearch}
                      onChange={(e) => setB2bSearch(e.target.value)}
                    />
                  </div>

                  <button
                    type="button"
                    className={styles.outlineBtn}
                    onClick={() => setB2bRegisterOpen(true)}
                  >
                    <span>Add B2B client</span>
                  </button>

                  <button
                    type="button"
                    className={styles.primaryBtn}
                    onClick={() => {
                      setDispatchType("b2b");
                      setDispatchModalOpen(true);
                    }}
                  >
                    <span>Create B2B order</span>
                  </button>
                </div>
              </div>

              <div className={styles.tableContainer}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>Company Name</th>
                      <th>Contact Person</th>
                      <th>Contract Term</th>
                      <th>Outstanding Balance</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {b2bClients
                      .filter((c) => !b2bSearch || c.companyName.toLowerCase().includes(b2bSearch.toLowerCase()) || c.contactPerson.toLowerCase().includes(b2bSearch.toLowerCase()))
                      .map((client) => (
                        <tr key={client._id}>
                          <td>
                            <strong>{client.companyName}</strong>
                            <div style={{ fontSize: 11, color: "#64748b" }}>
                              GSTIN: {client.gstin || "Not provided"} · {client.address}
                            </div>
                          </td>
                          <td>
                            <div>{client.contactPerson}</div>
                            <div style={{ fontSize: 11, color: "#64748b" }}>{client.phone}</div>
                          </td>
                          <td>
                            <span className={styles.statusPill} style={{ background: "#f5f3ff", color: "#7C3AED" }}>
                              {client.contractType?.replace("_", " ")}
                            </span>
                          </td>
                          <td>
                            <strong style={{ color: "#0f172a" }}>
                              ₹{(client.outstandingBalance || 0).toLocaleString("en-IN")}
                            </strong>
                          </td>
                          <td>
                            <button
                              type="button"
                              className={styles.primaryBtn}
                              style={{ padding: "6px 12px", fontSize: 12 }}
                              onClick={() => {
                                setDispatchType("b2b");
                                setDispatchForm((prev) => ({
                                  ...prev,
                                  b2bClientId: client._id,
                                  pickupAddress: client.address
                                }));
                                setDispatchModalOpen(true);
                              }}
                            >
                              Dispatch Order
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <AdminControlCenter
            activeTab={activeTab}
            orders={orders}
            drivers={drivers}
            b2bClients={b2bClients}
            customerUsers={customerUsers}
            metrics={metrics}
            onInspectOrder={handleInspectOrder}
            onInspectDriver={handleInspectDriver}
            onAssignOrder={(order) => {
              setAssignModalOrder(order);
              setSelectedDriverIdForAssign(order.partner?._id || "");
            }}
            notify={showNotification}
          />
        </div>
      </main>

      {/* ======================================================================
          SLIDE-OVER INSPECTION DRAWER (ORDER DETAILS & LIFECYCLE CONTROLS)
          ====================================================================== */}
      {inspectOrder && (
        <div className={styles.drawerBackdrop} onClick={() => setInspectOrder(null)}>
          <div className={styles.drawerPanel} onClick={(e) => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <div className={styles.drawerTitleGroup}>
                <span className={styles.drawerTitle}>Order #{inspectOrder.orderNo}</span>
                <span className={styles.drawerSubtitle}>
                  Created {new Date(inspectOrder.createdAt).toLocaleString()}
                </span>
              </div>
              <button
                type="button"
                className={styles.closeModalBtn}
                onClick={() => setInspectOrder(null)}
              >
                ✕
              </button>
            </div>

            <div className={styles.drawerBody}>
              {/* Order Status & Quick Transition Controls */}
              <div className={styles.drawerSection}>
                <span className={styles.drawerSectionTitle}>Current Delivery State</span>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span className={`${styles.statusPill} ${styles[inspectOrder.status] || styles.pending}`} style={{ fontSize: 13, padding: "5px 14px" }}>
                    {inspectOrder.status?.replace("_", " ").toUpperCase()}
                  </span>
                  <div style={{ display: "flex", gap: 6 }}>
                    {inspectOrder.status === "accepted" && (
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={() => handleUpdateOrderStatus(inspectOrder._id, "arrived_pickup")}
                      >
                        Arrived Pickup ➔
                      </button>
                    )}
                    {inspectOrder.status === "arrived_pickup" && (
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={() => handleUpdateOrderStatus(inspectOrder._id, "picked_up")}
                      >
                        Goods Picked Up ➔
                      </button>
                    )}
                    {inspectOrder.status === "picked_up" && (
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={() => handleUpdateOrderStatus(inspectOrder._id, "in_transit")}
                      >
                        In Transit ➔
                      </button>
                    )}
                    {inspectOrder.status === "in_transit" && (
                      <button
                        type="button"
                        className={styles.successBtn}
                        onClick={() => handleUpdateOrderStatus(inspectOrder._id, "delivered")}
                      >
                        Mark Delivered ✓
                      </button>
                    )}
                    {inspectOrder.status !== "delivered" && inspectOrder.status !== "cancelled" && (
                      <button
                        type="button"
                        className={styles.dangerBtn}
                        onClick={() => handleCancelOrder(inspectOrder._id)}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Handover OTP Verification Codes */}
              <div className={styles.drawerSection} style={{ background: "#fbf9fe", border: "1px solid #e9d5ff" }}>
                <span className={styles.drawerSectionTitle}>Verification passcodes</span>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ background: "#ffffff", padding: 12, borderRadius: 8, border: "1px solid #ede8f5" }}>
                    <div style={{ fontSize: 11, color: "#64748b" }}>Pickup Handover OTP</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#7C3AED", fontFamily: "monospace" }}>
                      {inspectOrder.verification?.pickupOtp || "Not available"}
                    </div>
                  </div>
                  <div style={{ background: "#ffffff", padding: 12, borderRadius: 8, border: "1px solid #ede8f5" }}>
                    <div style={{ fontSize: 11, color: "#64748b" }}>Delivery Drop OTP</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#7C3AED", fontFamily: "monospace" }}>
                      {inspectOrder.verification?.dropOtp || "Not available"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Pickup and Drop Details */}
              <div className={styles.drawerSection}>
                <span className={styles.drawerSectionTitle}>Route Coordinates</span>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ borderLeft: "3px solid #059669", paddingLeft: 10 }}>
                    <div style={{ fontSize: 11, color: "#059669", fontWeight: 700 }}>PICKUP LOCATION</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{inspectOrder.pickup?.address}</div>
                    <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>
                      Contact: {inspectOrder.pickup?.contactName || "Sender"} ({inspectOrder.pickup?.contactPhone || inspectOrder.customer?.phone})
                    </div>
                  </div>

                  <div style={{ borderLeft: "3px solid #7C3AED", paddingLeft: 10 }}>
                    <div style={{ fontSize: 11, color: "#7C3AED", fontWeight: 700 }}>DELIVERY DESTINATION</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{inspectOrder.drop?.address}</div>
                    <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>
                      Contact: {inspectOrder.drop?.contactName || "Receiver"} ({inspectOrder.drop?.contactPhone || "Not provided"})
                    </div>
                  </div>
                </div>
              </div>

              {/* Fare Breakdown */}
              <div className={styles.drawerSection}>
                <span className={styles.drawerSectionTitle}>Financial Settlement Breakdown</span>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#64748b" }}>Total Customer Fare:</span>
                    <strong>{inspectOrder.fare?.total != null ? `₹${inspectOrder.fare.total}` : "Not provided"}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#64748b" }}>Driver payout:</span>
                    <strong style={{ color: "#059669" }}>
                      {inspectOrder.fare?.driverCommission != null ? `₹${inspectOrder.fare.driverCommission}` : "Not provided"}
                    </strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#64748b" }}>Platform share:</span>
                    <strong style={{ color: "#7C3AED" }}>
                      {inspectOrder.fare?.platformCommission != null ? `₹${inspectOrder.fare.platformCommission}` : "Not provided"}
                    </strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#64748b" }}>Payment Mode:</span>
                    <span className={styles.statusPill} style={{ background: "#ede9fe", color: "#7C3AED" }}>
                      {inspectOrder.paymentMode?.toUpperCase() || "Not provided"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Visual Audit Trail */}
              <div className={styles.drawerSection}>
                <span className={styles.drawerSectionTitle}>Operations Audit Timeline</span>
                <div className={styles.orderTimeline}>
                  {(inspectOrder.timeline || []).map((step, idx) => (
                    <div key={idx} className={styles.timelineStep}>
                      <span className={`${styles.timelineDot} ${step.state === "active" ? styles.active : ""}`}></span>
                      <span className={styles.timelineStepTitle}>{step.title}</span>
                      <span className={styles.timelineStepNote}>{step.note}</span>
                      <span className={styles.timelineStepTime}>
                        {new Date(step.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.drawerFooter}>
              <button
                type="button"
                className={styles.outlineBtn}
                onClick={() => setInspectOrder(null)}
              >
                Close Drawer
              </button>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => {
                  setAssignModalOrder(inspectOrder);
                  setSelectedDriverIdForAssign(inspectOrder.partner?._id || "");
                }}
              >
                {inspectOrder.partner ? "Change Driver" : "Assign Driver"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================
          DRIVER 360° PROFILE DRAWER & DOCUMENT LIGHTBOX
          ====================================================================== */}
      {inspectDriver && (
        <div className={styles.drawerBackdrop} onClick={() => setInspectDriver(null)}>
          <div className={styles.drawerPanel} style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <div className={styles.drawerTitleGroup}>
                <span className={styles.drawerTitle}>{inspectDriver.name}</span>
                <span className={styles.drawerSubtitle}>Driver Partner ID: {inspectDriver._id}</span>
              </div>
              <button
                type="button"
                className={styles.closeModalBtn}
                onClick={() => setInspectDriver(null)}
              >
                ✕
              </button>
            </div>

            <div className={styles.drawerBody}>
              {/* Profile Card */}
              <div className={styles.profileHeaderCard}>
                <div className={styles.profileAvatarLarge}>{inspectDriver.initials || "D"}</div>
                <div className={styles.profileMeta}>
                  <span className={styles.profileName}>{inspectDriver.name}</span>
                  <span className={styles.profileSpecs}>
                    {inspectDriver.phone} · {inspectDriver.city || "City not provided"}
                  </span>
                  <span className={styles.profileSpecs}>
                    {inspectDriver.email || "Email not provided"} · {inspectDriver.partnerProfile?.online ? "Online" : "Offline"}
                  </span>
                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    <span className={`${styles.statusPill} ${styles[inspectDriver.partnerProfile?.kycStatus] || styles.pending}`}>
                      KYC: {inspectDriver.partnerProfile?.kycStatus?.toUpperCase()}
                    </span>
                    <span className={`${styles.statusPill} ${inspectDriver.status === "active" ? styles.active : styles.blocked}`}>
                      {inspectDriver.status === "active" ? "Active" : "Suspended"}
                    </span>
                  </div>
                  {inspectDriver.partnerProfile?.kycRejectionReason && (
                    <span style={{ fontSize: 11.5, color: "#be123c", marginTop: 4 }}>
                      Rejection reason: {inspectDriver.partnerProfile.kycRejectionReason}
                    </span>
                  )}
                </div>
              </div>

              {/* Vehicle Specifications */}
              <div className={styles.drawerSection}>
                <span className={styles.drawerSectionTitle}>Attached Vehicle</span>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 13 }}>
                  <div>License plate: <strong>{inspectDriver.partnerProfile?.vehicleNumber || "Not provided"}</strong></div>
                  <div>Model class: <strong>{inspectDriver.partnerProfile?.vehicleId?.name || "Not provided"}</strong></div>
                  <div>Lifetime rating: <strong>{inspectDriver.partnerProfile?.rating != null ? `${inspectDriver.partnerProfile.rating}/5` : "Not rated"}</strong></div>
                  <div>Weekly Trips: <strong>{inspectDriver.partnerProfile?.weeklyOrders || 0} orders</strong></div>
                </div>
              </div>

              {/* Bank & Settlement Account */}
              <div className={styles.drawerSection}>
                <span className={styles.drawerSectionTitle}>Bank Settlement Account</span>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 13 }}>
                  <div>Account Holder: <strong>{inspectDriver.partnerProfile?.bankDetails?.accountHolder || inspectDriver.name}</strong></div>
                  <div>Account number: <strong>{inspectDriver.partnerProfile?.bankDetails?.accountNumberMasked || "Not provided"}</strong></div>
                  <div>Bank IFSC: <strong>{inspectDriver.partnerProfile?.bankDetails?.ifsc || "Not provided"}</strong></div>
                  <div>Wallet Balance: <strong style={{ color: "#7C3AED" }}>₹{(inspectDriver.partnerProfile?.walletBalance || 0).toLocaleString("en-IN")}</strong></div>
                </div>
                <span style={{ fontSize: 11.5, color: "#64748b" }}>
                  The account number is intentionally stored in masked form. Verify the destination through your secure banking or payout-provider record before recording payment.
                </span>
              </div>

              {/* Clickable Document Lightbox Cards */}
              <div className={`${styles.drawerSection} ${styles.documentsSection}`}>
                <span className={styles.drawerSectionTitle}>KYC documents</span>
                <div className={styles.docsInspectionGrid}>
                  {KYC_DOCUMENTS.map((doc) => {
                    const docUrl = inspectDriver.partnerProfile?.docUrls?.[doc.key] || null;
                    const isVerified = inspectDriver.partnerProfile?.docs?.[doc.key];
                    const hasDoc = Boolean(docUrl && docUrl.trim() !== "");

                    return (
                      <div
                        key={doc.title}
                        className={styles.docItemCard}
                        style={{
                          borderColor: hasDoc ? (isVerified ? "#86efac" : "#c084fc") : "#e2e8f0",
                          background: hasDoc ? "#ffffff" : "#f8fafc"
                        }}
                        onClick={() => setLightboxDoc({ key: doc.key, title: doc.title, url: docUrl, verified: isVerified, hasDoc })}
                      >
                        <div className={styles.docThumbWrap}>
                          {hasDoc ? (
                            <img
                              src={docUrl}
                              alt={doc.title}
                              style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8 }}
                              onError={(e) => {
                                e.target.style.display = "none";
                                e.target.nextSibling.style.display = "block";
                              }}
                            />
                          ) : null}
                          <span className={styles.docPlaceholder} style={{ display: hasDoc ? "none" : "block" }}>
                            No file
                          </span>
                        </div>
                        <span className={styles.docLabel}>{doc.title}</span>
                        <span
                          style={{
                            fontSize: 10.5,
                            fontWeight: 700,
                            color: isVerified ? "#059669" : hasDoc ? "#7C3AED" : "#94a3b8"
                          }}
                        >
                          {isVerified ? "Verified" : hasDoc ? "Ready for review" : "Not uploaded"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={styles.drawerSection}>
                <span className={styles.drawerSectionTitle}>Availability &amp; current trip</span>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 13 }}>
                  <div>Availability: <strong>{inspectDriver.partnerProfile?.online ? "Online and available" : "Offline"}</strong></div>
                  <div>Current trip: <strong>{inspectDriver.activeOrder?.orderNo || "No active delivery"}</strong></div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    Last location: <strong>
                      {Number.isFinite(inspectDriver.partnerProfile?.currentLocation?.lat)
                        ? `${inspectDriver.partnerProfile.currentLocation.lat.toFixed(5)}, ${inspectDriver.partnerProfile.currentLocation.lng.toFixed(5)}`
                        : "Location permission unavailable"}
                    </strong>
                  </div>
                </div>
              </div>

              <div className={styles.drawerSection}>
                <span className={styles.drawerSectionTitle}>Booking history</span>
                {(inspectDriver.recentOrders || []).length ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {inspectDriver.recentOrders.slice(0, 8).map((order) => (
                      <button
                        type="button"
                        key={order._id}
                        className={styles.outlineBtn}
                        style={{ justifyContent: "space-between", width: "100%" }}
                        onClick={() => handleInspectOrder(order)}
                      >
                        <span>{order.orderNo} · {order.vehicle?.name || "Vehicle"}</span>
                        <span className={`${styles.statusPill} ${styles[order.status] || styles.pending}`}>{order.status?.replaceAll("_", " ")}</span>
                      </button>
                    ))}
                  </div>
                ) : <span style={{ fontSize: 12, color: "#64748b" }}>No assigned, completed, cancelled or failed bookings recorded.</span>}
              </div>

              <div className={styles.drawerSection}>
                <span className={styles.drawerSectionTitle}>Earnings, payouts &amp; performance</span>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, fontSize: 13 }}>
                  <div>Completed deliveries: <strong>{(inspectDriver.recentOrders || []).filter((order) => order.status === "delivered").length}</strong></div>
                  <div>Cancellation count: <strong>{(inspectDriver.recentOrders || []).filter((order) => order.status === "cancelled").length}</strong></div>
                  <div>Acceptance rate: <strong>{inspectDriver.partnerProfile?.acceptanceRate != null ? `${inspectDriver.partnerProfile.acceptanceRate}%` : "Not calculated"}</strong></div>
                  <div>Driver rating: <strong>{inspectDriver.partnerProfile?.rating != null ? `${inspectDriver.partnerProfile.rating}/5` : "Not rated"}</strong></div>
                </div>
                {(inspectDriver.ledger || []).length ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 4 }}>
                    {inspectDriver.ledger.slice(0, 6).map((entry) => (
                      <div key={entry._id} style={{ display: "flex", justifyContent: "space-between", gap: 12, borderTop: "1px solid #ede9f2", paddingTop: 8, fontSize: 12 }}>
                        <span>{entry.title || entry.type || "Wallet entry"}<small style={{ display: "block", color: "#94a3b8" }}>{new Date(entry.createdAt).toLocaleString()}</small></span>
                        <strong style={{ color: Number(entry.amount) < 0 ? "#be123c" : "#059669" }}>₹{Number(entry.amount || 0).toLocaleString("en-IN")}</strong>
                      </div>
                    ))}
                  </div>
                ) : <span style={{ fontSize: 12, color: "#64748b" }}>No payout or deduction entries recorded.</span>}
              </div>

              <div className={styles.drawerSection}>
                <span className={styles.drawerSectionTitle}>Complaints, notes &amp; activity log</span>
                <div style={{ fontSize: 12.5, color: "#475569", lineHeight: 1.6 }}>
                  <div><strong>Support cases:</strong> Support case data is not available on this profile.</div>
                  <div><strong>KYC reviewed:</strong> {inspectDriver.partnerProfile?.kycReviewedAt ? new Date(inspectDriver.partnerProfile.kycReviewedAt).toLocaleString() : "Awaiting first review"}</div>
                  <div><strong>Profile updated:</strong> {inspectDriver.updatedAt ? new Date(inspectDriver.updatedAt).toLocaleString() : "Not available"}</div>
                  <div><strong>Account control:</strong> {inspectDriver.status === "active" ? "Eligible for operations" : "Restricted by administrator"}</div>
                </div>
              </div>
            </div>

            <div className={styles.drawerFooter}>
              <button
                type="button"
                className={inspectDriver.status === "active" ? styles.dangerBtn : styles.successBtn}
                onClick={() => handleToggleDriverStatus(inspectDriver)}
              >
                {inspectDriver.status === "active" ? "Suspend Driver" : "Activate Driver"}
              </button>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className={styles.successBtn}
                  onClick={() => handleApproveKyc(inspectDriver)}
                >
                  Approve KYC
                </button>
                <button
                  type="button"
                  className={styles.primaryBtn}
                  onClick={() => openPayoutModal(inspectDriver)}
                >
                  Pay driver
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================
          HIGH-RESOLUTION DOCUMENT LIGHTBOX MODAL (REAL DOCUMENTS ONLY)
          ====================================================================== */}
      {lightboxDoc && (
        <div className={styles.lightboxBackdrop} onClick={() => setLightboxDoc(null)}>
          <div className={styles.lightboxCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>Verification Document: {lightboxDoc.title}</span>
              <button
                type="button"
                className={styles.closeModalBtn}
                onClick={() => setLightboxDoc(null)}
              >
                ✕
              </button>
            </div>
            <div className={styles.lightboxImageWrap}>
              {lightboxDoc.url ? (
                <>
                  <img
                    src={lightboxDoc.url}
                    alt={lightboxDoc.title}
                    style={{ width: "100%", height: "100%", objectFit: "contain", background: "#f8fafc" }}
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                      if (event.currentTarget.nextElementSibling) {
                        event.currentTarget.nextElementSibling.style.display = "flex";
                      }
                    }}
                  />
                  <div className={styles.documentLoadError}>
                    <strong>Preview could not be loaded.</strong>
                    <span>Use “Open original” below to check the uploaded file.</span>
                  </div>
                </>
              ) : (
                <div style={{ padding: "48px 24px", textAlign: "center", background: "#fbfbfe" }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#1e293b", marginBottom: 6 }}>
                    No Document Uploaded Yet
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: "#64748b", maxWidth: 360, marginInline: "auto" }}>
                    The driver partner has not submitted their {lightboxDoc.title} through the mobile app.
                  </p>
                </div>
              )}
            </div>
            <div className={styles.lightboxFooter}>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: lightboxDoc.verified ? "#059669" : lightboxDoc.hasDoc ? "#7C3AED" : "#64748b"
                }}
              >
                Status: {lightboxDoc.verified ? "Verified by admin" : lightboxDoc.hasDoc ? "Uploaded, awaiting review" : "Document not uploaded"}
              </span>
              <div style={{ display: "flex", gap: 10 }}>
                {lightboxDoc.url && (
                  <a
                    href={lightboxDoc.url}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.outlineBtn}
                    style={{ textDecoration: "none" }}
                  >
                    Open original
                  </a>
                )}
                {lightboxDoc.hasDoc && (
                  <button
                    type="button"
                    className={styles.dangerBtn}
                    onClick={() => handleReviewKycDocument(false)}
                  >
                    Request correction
                  </button>
                )}
                {lightboxDoc.hasDoc && !lightboxDoc.verified && (
                  <button
                    type="button"
                    className={styles.successBtn}
                    onClick={() => handleReviewKycDocument(true)}
                  >
                    Approve document
                  </button>
                )}
                <button
                  type="button"
                  className={styles.primaryBtn}
                  onClick={() => setLightboxDoc(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================
          UNIFIED DISPATCH MODAL (ON-DEMAND & B2B)
          ====================================================================== */}
      {dispatchModalOpen && (
        <div className={styles.modalBackdrop} onClick={() => setDispatchModalOpen(false)}>
          <div className={styles.modalCard} style={{ maxWidth: 680 }} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleCreateUnifiedDispatch}>
              <div className={styles.modalHeader}>
            <span className={styles.modalTitle}>Create and dispatch order</span>
                <button
                  type="button"
                  className={styles.closeModalBtn}
                  onClick={() => setDispatchModalOpen(false)}
                >
                  ✕
                </button>
              </div>

              <div className={styles.modalBody}>
                {/* Mode Selector */}
                <div style={{ display: "flex", gap: 10, background: "#f1ecf9", padding: 4, borderRadius: 10 }}>
                  <button
                    type="button"
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "none",
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: "pointer",
                      background: dispatchType === "on_demand" ? "#ffffff" : "transparent",
                      color: dispatchType === "on_demand" ? "#7C3AED" : "#64748b",
                      boxShadow: dispatchType === "on_demand" ? "0 2px 6px rgba(0,0,0,0.06)" : "none"
                    }}
                    onClick={() => setDispatchType("on_demand")}
                  >
                        Retail or customer order
                  </button>
                  <button
                    type="button"
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "none",
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: "pointer",
                      background: dispatchType === "b2b" ? "#ffffff" : "transparent",
                      color: dispatchType === "b2b" ? "#7C3AED" : "#64748b",
                      boxShadow: dispatchType === "b2b" ? "0 2px 6px rgba(0,0,0,0.06)" : "none"
                    }}
                    onClick={() => setDispatchType("b2b")}
                  >
                        Corporate B2B order
                  </button>
                </div>

                {dispatchType === "on_demand" ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Customer Name:</label>
                      <input
                        type="text"
                        required
                        className={styles.formInput}
                        placeholder="Customer's full name"
                        value={dispatchForm.customerName}
                        onChange={(e) => setDispatchForm({ ...dispatchForm, customerName: e.target.value })}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Customer Phone Number:</label>
                      <input
                        type="text"
                        required
                        className={styles.formInput}
                        placeholder="Customer's phone number"
                        value={dispatchForm.customerPhone}
                        onChange={(e) => setDispatchForm({ ...dispatchForm, customerPhone: e.target.value })}
                      />
                    </div>
                  </div>
                ) : (
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Corporate Enterprise Account:</label>
                    <select
                      className={styles.formSelect}
                      required
                      value={dispatchForm.b2bClientId}
                      onChange={(e) => {
                        const sel = b2bClients.find((c) => c._id === e.target.value);
                        setDispatchForm({
                          ...dispatchForm,
                          b2bClientId: e.target.value,
                          pickupAddress: sel ? sel.address : dispatchForm.pickupAddress
                        });
                      }}
                    >
                      <option value="">-- Choose Corporate Account --</option>
                      {b2bClients.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.companyName} ({c.contactPerson})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Pickup Address:</label>
                    <input
                      type="text"
                      required
                      className={styles.formInput}
                      value={dispatchForm.pickupAddress}
                      onChange={(e) => setDispatchForm({ ...dispatchForm, pickupAddress: e.target.value })}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Drop Address:</label>
                    <input
                      type="text"
                      required
                      className={styles.formInput}
                      value={dispatchForm.dropAddress}
                      onChange={(e) => setDispatchForm({ ...dispatchForm, dropAddress: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Vehicle Class:</label>
                    <select
                      className={styles.formSelect}
                      required
                      value={dispatchForm.vehicleCode}
                      onChange={(e) => setDispatchForm({ ...dispatchForm, vehicleCode: e.target.value })}
                    >
                      <option value="">-- Choose an active vehicle --</option>
                      {vehicleCatalog.filter((vehicle) => vehicle.active).map((vehicle) => (
                        <option key={vehicle._id} value={vehicle.code}>
                          {vehicle.name} ({vehicle.capacityKg} kg)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Assign Driver Partner:</label>
                    <select
                      className={styles.formSelect}
                      value={dispatchForm.driverId}
                      onChange={(e) => setDispatchForm({ ...dispatchForm, driverId: e.target.value })}
                    >
                      <option value="">-- Auto-Queue for Nearby Online Fleet --</option>
                      {assignableDrivers.map((d) => (
                        <option key={d._id} value={d._id}>
                          {d.name} ({d.partnerProfile?.vehicleNumber || "No plate"}) · {d.partnerProfile?.online ? "Online" : "Offline"} · Available for manual assignment
                        </option>
                      ))}
                    </select>
                    <small style={{ color: "#64748b" }}>
                      Manual assignment includes active, KYC-verified drivers without another active order. Offline drivers receive an app notification.
                    </small>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Goods Description:</label>
                    <input
                      type="text"
                      required
                      className={styles.formInput}
                      value={dispatchForm.goodsType}
                      onChange={(e) => setDispatchForm({ ...dispatchForm, goodsType: e.target.value })}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Weight (kg):</label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      className={styles.formInput}
                      value={dispatchForm.weightKg}
                      onChange={(e) => setDispatchForm({ ...dispatchForm, weightKg: e.target.value })}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Total Delivery Fare (₹):</label>
                    <input
                      type="number"
                      required
                      className={styles.formInput}
                      value={dispatchForm.totalFare}
                      onChange={(e) => setDispatchForm({ ...dispatchForm, totalFare: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.outlineBtn}
                  onClick={() => setDispatchModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.primaryBtn}>
                  Create order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================================
          ASSIGN DRIVER MODAL
          ====================================================================== */}
      {assignModalOrder && (
        <div className={styles.modalBackdrop} onClick={() => setAssignModalOrder(null)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>Assign Driver to Order #{assignModalOrder.orderNo}</span>
              <button
                type="button"
                className={styles.closeModalBtn}
                onClick={() => setAssignModalOrder(null)}
              >
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <div style={{ background: "#fbf8fe", padding: 14, borderRadius: 10, border: "1px solid #ede8f5" }}>
                <div><strong>Route:</strong> {assignModalOrder.pickup?.address} ➔ {assignModalOrder.drop?.address}</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                  Goods: {assignModalOrder.goodsType || "Not provided"} · Fare: {assignModalOrder.fare?.total != null ? `₹${assignModalOrder.fare.total}` : "Not provided"}
                </div>
              </div>

              <OrderRouteMap orderId={assignModalOrder._id} />

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Select Driver Partner:</label>
                <select
                  className={styles.formSelect}
                  value={selectedDriverIdForAssign}
                  onChange={(e) => setSelectedDriverIdForAssign(e.target.value)}
                >
                  <option value="">-- Choose Verified Driver --</option>
                  {assignableDrivers.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name} ({d.partnerProfile?.vehicleNumber || "No plate"}) · {d.partnerProfile?.online ? "Online" : "Offline"} · Available for manual assignment
                    </option>
                  ))}
                </select>
                <small style={{ color: "#64748b" }}>
                  Active, KYC-verified drivers without another active order are listed. Offline drivers receive an app notification after assignment.
                </small>
                {assignableDrivers.length === 0 ? (
                  <div style={{ marginTop: 8, color: "#b45309", fontSize: 12.5, fontWeight: 700 }}>
                    No active KYC-verified driver is currently free from another order.
                  </div>
                ) : null}
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.outlineBtn}
                onClick={() => setAssignModalOrder(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={handleAssignDriver}
              >
                Confirm Driver Assignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================
          REJECT KYC MODAL
          ====================================================================== */}
      {rejectKycModalDriver && (
        <div className={styles.modalBackdrop} onClick={() => setRejectKycModalDriver(null)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>Reject KYC for {rejectKycModalDriver.name}</span>
              <button
                type="button"
                className={styles.closeModalBtn}
                onClick={() => setRejectKycModalDriver(null)}
              >
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Rejection Reason (Audited &amp; sent to driver):</label>
                <textarea
                  className={styles.formTextarea}
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Expired vehicle commercial insurance, Aadhaar photo blurred..."
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.outlineBtn}
                onClick={() => setRejectKycModalDriver(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.dangerBtn}
                onClick={handleRejectKyc}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================
          DISBURSEMENT MODAL (WITH KYC COMPLIANCE CHECK)
          ====================================================================== */}
      {disburseModalDriver && (
        <div className={styles.modalBackdrop} onClick={() => setDisburseModalDriver(null)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>Pay driver</span>
              <button
                type="button"
                className={styles.closeModalBtn}
                onClick={() => setDisburseModalDriver(null)}
              >
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <div style={{ background: "#fffbeb", padding: 12, borderRadius: 10, border: "1px solid #fde68a", fontSize: 12.5, color: "#92400e" }}>
                Complete the payment using your bank, UPI app, or cash counter first. This action records the completed payment and deducts it from the driver wallet; it does not transfer money automatically.
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Driver:</label>
                <select
                  className={styles.formSelect}
                  value={disburseModalDriver._id}
                  onChange={(e) => {
                    const driver = eligibleDrivers.find((candidate) => candidate._id === e.target.value);
                    if (driver) openPayoutModal(driver);
                  }}
                >
                  {eligibleDrivers
                    .filter((driver) => driver.partnerProfile?.kycStatus === "verified")
                    .map((driver) => (
                      <option key={driver._id} value={driver._id}>
                        {driver.name} — ₹{(driver.partnerProfile?.walletBalance || 0).toLocaleString("en-IN")}
                      </option>
                    ))}
                </select>
              </div>

              <div style={{ background: "#f8fafc", padding: 12, borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 13 }}>
                <div>Payable Wallet Balance: <strong>₹{(disburseModalDriver.partnerProfile?.walletBalance || 0).toLocaleString("en-IN")}</strong></div>
                <div style={{ marginTop: 2, color: "#64748b" }}>
                  Destination: {disburseModalDriver.partnerProfile?.bankDetails?.accountNumberMasked || "Bank account not provided"} (IFSC: {disburseModalDriver.partnerProfile?.bankDetails?.ifsc || "Not provided"})
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Disbursement Amount (₹):</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  className={styles.formInput}
                  value={disburseAmount}
                  onChange={(e) => setDisburseAmount(e.target.value)}
                  max={disburseModalDriver.partnerProfile?.walletBalance || 0}
                  min="0.01"
                  step="0.01"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Payment method:</label>
                <select
                  className={styles.formSelect}
                  value={disbursePaymentMode}
                  onChange={(e) => setDisbursePaymentMode(e.target.value)}
                >
                  <option value="upi">UPI payment</option>
                  <option value="neft">NEFT / RTGS bank transfer</option>
                  <option value="cash">Cash counter payment</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Transaction or receipt reference:</label>
                <input
                  type="text"
                  required
                  className={styles.formInput}
                  value={disburseReference}
                  onChange={(e) => setDisburseReference(e.target.value)}
                  placeholder="Bank UTR, UPI reference, or cash receipt number"
                  maxLength={80}
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.outlineBtn}
                onClick={() => setDisburseModalDriver(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={handleDisbursePayout}
                disabled={disbursing}
              >
                {disbursing ? "Recording payout..." : disburseAmount ? `Record ₹${disburseAmount} payout` : "Enter payout amount"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================
          COIN ADJUSTMENT MODAL
          ====================================================================== */}
      {coinModalUser && (
        <div className={styles.modalBackdrop} onClick={() => setCoinModalUser(null)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>Adjust Coins for {coinModalUser.name}</span>
              <button
                type="button"
                className={styles.closeModalBtn}
                onClick={() => setCoinModalUser(null)}
              >
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <div style={{ background: "#fffbeb", padding: 12, borderRadius: 10, border: "1px solid #fde68a", fontSize: 13, color: "#92400e" }}>
            Current wallet balance: <strong>{coinModalUser.customerProfile?.coins || 0} coins</strong>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Adjustment Type:</label>
                <select
                  className={styles.formSelect}
                  value={coinAdjustType}
                  onChange={(e) => setCoinAdjustType(e.target.value)}
                >
                  <option value="credit">Credit (+) Coins</option>
                  <option value="debit">Debit (-) Coins</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Coin Amount:</label>
                <input
                  type="number"
                  className={styles.formInput}
                  value={coinAdjustAmount}
                  onChange={(e) => setCoinAdjustAmount(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Audit Reason:</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={coinAdjustReason}
                  onChange={(e) => setCoinAdjustReason(e.target.value)}
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.outlineBtn}
                onClick={() => setCoinModalUser(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={handleAdjustCoins}
              >
                Apply Coins Adjustment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================
          REGISTER B2B CLIENT MODAL
          ====================================================================== */}
      {b2bRegisterOpen && (
        <div className={styles.modalBackdrop} onClick={() => setB2bRegisterOpen(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleCreateB2bClient}>
              <div className={styles.modalHeader}>
                <span className={styles.modalTitle}>Register Corporate B2B Account</span>
                <button
                  type="button"
                  className={styles.closeModalBtn}
                  onClick={() => setB2bRegisterOpen(false)}
                >
                  ✕
                </button>
              </div>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Company Name:</label>
                  <input
                    type="text"
                    required
                    className={styles.formInput}
                    value={newB2bData.companyName}
                    onChange={(e) => setNewB2bData({ ...newB2bData, companyName: e.target.value })}
                    placeholder="e.g. Zomato Hyperpure Logistics"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Contact Person:</label>
                  <input
                    type="text"
                    required
                    className={styles.formInput}
                    value={newB2bData.contactPerson}
                    onChange={(e) => setNewB2bData({ ...newB2bData, contactPerson: e.target.value })}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Phone Number:</label>
                  <input
                    type="text"
                    required
                    className={styles.formInput}
                    value={newB2bData.phone}
                    onChange={(e) => setNewB2bData({ ...newB2bData, phone: e.target.value })}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Depot / Billing Address:</label>
                  <input
                    type="text"
                    required
                    className={styles.formInput}
                    value={newB2bData.address}
                    onChange={(e) => setNewB2bData({ ...newB2bData, address: e.target.value })}
                  />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.outlineBtn}
                  onClick={() => setB2bRegisterOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.primaryBtn}>
                  Save Corporate Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
