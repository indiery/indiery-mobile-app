"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./control-center.module.css";

const EMPTY_SETTINGS = {
  companyName: "",
  supportEmail: "",
  supportPhone: "",
  autoAssign: true,
  reKycDays: "",
  walletLimit: "",
  maxPickupRadius: "",
  requireTwoFactor: false,
  maintenanceMode: false,
};

const ACTIVE_ORDER_STATUSES = new Set(["searching", "offered", "accepted", "arrived_pickup", "picked_up", "in_transit"]);

function useStoredState(key, fallback) {
  const [value, setValue] = useState(fallback);
  const [loaded, setLoaded] = useState(false);
  const skipInitialPersist = useRef(true);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      let nextValue = fallback;
      try {
        const saved = window.localStorage.getItem(key);
        if (saved) nextValue = JSON.parse(saved);
      } catch {
        // Admin workspaces still operate with in-memory state when storage is unavailable.
      }
      try {
        const resourceKey = key.replace(/^indiery-(?:live-)?admin-/, "");
        const response = await fetch(`/api/admin/workspace/${resourceKey}`, { credentials: "same-origin", cache: "no-store" });
        const payload = await response.json().catch(() => null);
        if (response.ok && payload?.value != null) {
          nextValue = resourceKey === "settings" && payload.value.autoAssignConfigured !== true
            ? { ...payload.value, autoAssign: true }
            : payload.value;
        }
      } catch {
        // The local copy remains available if the API is temporarily offline.
      }
      if (!cancelled) {
        setValue(nextValue);
        setLoaded(true);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [key]);
  useEffect(() => {
    if (!loaded) return;
    if (skipInitialPersist.current) {
      skipInitialPersist.current = false;
      return;
    }
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore private-mode and storage quota failures.
    }
    const resourceKey = key.replace(/^indiery-(?:live-)?admin-/, "");
    const timeout = window.setTimeout(() => {
      fetch(`/api/admin/workspace/${resourceKey}`, {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value })
      }).catch(() => null);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [key, loaded, value]);
  return [value, setValue];
}

function money(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function shortDate(value) {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function downloadCsv(filename, rows) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = [headers.map(escape).join(","), ...rows.map((row) => headers.map((header) => escape(row[header])).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function Status({ value }) {
  const normalized = String(value || "unknown").toLowerCase().replaceAll(" ", "-");
  return <span className={`${styles.status} ${styles[normalized] || ""}`}>{String(value || "Unknown").replaceAll("_", " ")}</span>;
}

function Empty({ title, detail }) {
  return <div className={styles.empty}><strong>{title}</strong><span>{detail}</span></div>;
}

function PageHeading({ eyebrow, title, detail, actions }) {
  return (
    <div className={styles.heading}>
      <div>
        <span className={styles.eyebrow}>{eyebrow}</span>
        <h2>{title}</h2>
        <p>{detail}</p>
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </div>
  );
}

function Stat({ label, value, note, tone = "purple" }) {
  return (
    <div className={`${styles.stat} ${styles[tone]}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}

function SearchFilter({ value, onChange, placeholder = "Search records...", children }) {
  return (
    <div className={styles.toolbar}>
      <label className={styles.search}>
        <span>Search</span>
        <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      </label>
      {children}
    </div>
  );
}

function Sheet({ title, subtitle, onClose, children, footer }) {
  return (
    <div className={styles.sheetBackdrop} onMouseDown={onClose}>
      <section className={styles.sheet} onMouseDown={(event) => event.stopPropagation()}>
        <header><div><h3>{title}</h3><p>{subtitle}</p></div><button type="button" onClick={onClose} aria-label="Close">×</button></header>
        <div className={styles.sheetBody}>{children}</div>
        {footer ? <footer>{footer}</footer> : null}
      </section>
    </div>
  );
}

function deriveCustomers(orders, customerUsers) {
  const records = new Map();
  const ensure = (raw) => {
    if (!raw) return null;
    const id = String(raw._id || raw.phone || raw.email || raw.name || `customer-${records.size}`);
    if (!records.has(id)) {
      records.set(id, {
        id,
        name: raw.name || "Unnamed customer",
        phone: raw.phone || "Not provided",
        email: raw.email || "Not provided",
        city: raw.city || "Not provided",
        accountStatus: raw.status === "blocked" ? "suspended" : "active",
        createdAt: raw.createdAt,
        wallet: Number(raw.customerProfile?.walletBalance || 0),
        coins: Number(raw.customerProfile?.coins || 0),
        bookings: [],
      });
    }
    return records.get(id);
  };
  customerUsers.forEach(ensure);
  orders.forEach((order) => {
    const customer = ensure(order.customer);
    if (customer) customer.bookings.push(order);
  });
  return [...records.values()].map((customer) => ({
    ...customer,
    totalBookings: customer.bookings.length,
    completed: customer.bookings.filter((order) => order.status === "delivered").length,
    cancelled: customer.bookings.filter((order) => order.status === "cancelled").length,
    totalValue: customer.bookings.reduce((sum, order) => sum + Number(order.fare?.total || 0), 0),
    currentBookings: customer.bookings.filter((order) => ACTIVE_ORDER_STATUSES.has(order.status)),
  }));
}

function DashboardSupplement({ orders, drivers, customers, metrics, onInspectOrder, onInspectDriver }) {
  const alerts = [
    ...drivers.filter((driver) => driver.partnerProfile?.kycStatus === "pending").slice(0, 3).map((driver) => ({ type: "KYC awaiting review", person: driver.name, meta: "Manual review required", driver })),
    ...orders.filter((order) => order.status === "searching").slice(0, 3).map((order) => ({ type: "Driver assignment", person: `Order ${order.orderNo}`, meta: "Booking is still unassigned", order })),
  ];
  return (
    <section className={styles.module}>
      <PageHeading eyebrow="Control room" title="Live operations at a glance" detail="Totals and exceptions calculated from the current application records." />
      <div className={styles.stats}>
        <Stat label="Total bookings" value={orders.length} note={`${orders.filter((order) => order.status === "delivered").length} completed`} />
        <Stat label="Registered customers" value={metrics?.totalCustomers ?? customers.length} note={`${customers.filter((customer) => customer.currentBookings.length).length} with loaded active bookings`} tone="blue" />
        <Stat label="Approved drivers" value={drivers.filter((driver) => driver.partnerProfile?.kycStatus === "verified").length} note={`${metrics?.pendingKyc || 0} pending KYC`} tone="green" />
        <Stat label="Cancelled bookings" value={orders.filter((order) => order.status === "cancelled").length} note="Review penalties and refunds" tone="orange" />
      </div>
      <div className={styles.twoColumns}>
        <div className={styles.panel}>
          <div className={styles.panelTitle}><div><h3>Admin attention</h3><p>Live exceptions across delivery operations</p></div><span className={styles.counter}>{alerts.length}</span></div>
          <div className={styles.alertList}>
            {alerts.length ? alerts.map((alert, index) => (
              <button key={`${alert.type}-${index}`} type="button" onClick={() => alert.driver ? onInspectDriver?.(alert.driver) : onInspectOrder?.(alert.order)}>
                <span className={styles.alertMark}>!</span><span><strong>{alert.type}</strong><small>{alert.person} · {alert.meta}</small></span><b>Review</b>
              </button>
            )) : <Empty title="No current alerts" detail="No matching exception was found in the loaded application records." />}
          </div>
        </div>
        <div className={styles.panel}>
          <div className={styles.panelTitle}><div><h3>Recent driver registrations</h3><p>Newest partners in the verification funnel</p></div></div>
          <div className={styles.compactList}>
            {drivers.length ? drivers.slice(0, 5).map((driver) => <button type="button" key={driver._id} onClick={() => onInspectDriver?.(driver)}><span className={styles.avatar}>{driver.initials || driver.name?.slice(0, 2).toUpperCase() || "DR"}</span><span><strong>{driver.name}</strong><small>{driver.partnerProfile?.vehicleId?.name || "Vehicle not selected"} · {shortDate(driver.createdAt)}</small></span><Status value={driver.partnerProfile?.kycStatus || "pending"} /></button>) : <Empty title="No drivers found" detail="Driver registrations will appear here from the application database." />}
          </div>
        </div>
      </div>
    </section>
  );
}

function CustomersModule({ customers, customerOverrides, setCustomerOverrides, notify }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const list = customers.filter((customer) => {
    const status = customerOverrides[customer.id]?.status || customer.accountStatus;
    const matchesQuery = `${customer.name} ${customer.phone} ${customer.email}`.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === "all" || (filter === "negative" ? customer.wallet < 0 || customer.coins < 0 : filter === "repeat" ? customer.totalBookings > 1 : status === filter);
    return matchesQuery && matchesFilter;
  });
  const toggleStatus = async (customer) => {
    const current = customerOverrides[customer.id]?.status || customer.accountStatus;
    const status = current === "active" ? "suspended" : "active";
    const reason = window.prompt(`Reason for ${status === "active" ? "reactivating" : "suspending"} ${customer.name}:`);
    if (!reason) return;
    try {
      const response = await fetch(`/api/admin/customers/${customer.id}/status`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: status === "suspended" ? "blocked" : "active", reason })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.message || "Customer status update failed");
    } catch (error) {
      notify?.(error?.message || "Customer status update failed", true);
      return;
    }
    setCustomerOverrides((previous) => ({ ...previous, [customer.id]: { status, reason, changedAt: new Date().toISOString() } }));
    notify?.(`${customer.name} is now ${status}.`);
  };
  return (
    <section className={styles.module}>
      <PageHeading eyebrow="Customer management" title="Customers and account risk" detail="Search profiles, review booking and wallet history, and manage restrictions." actions={<button className={styles.secondaryButton} type="button" onClick={() => downloadCsv("indiery-customers.csv", list.map((customer) => ({ ID: customer.id, Name: customer.name, Phone: customer.phone, Bookings: customer.totalBookings, Completed: customer.completed, Cancelled: customer.cancelled, Value: customer.totalValue, Wallet: customer.wallet, Coins: customer.coins, Status: customerOverrides[customer.id]?.status || customer.accountStatus })))}>Export CSV</button>} />
      <div className={styles.stats}>
        <Stat label="Registered customers" value={customers.length} note={`${customers.filter((customer) => customer.totalBookings > 1).length} repeat customers`} />
        <Stat label="Active bookings" value={customers.reduce((sum, customer) => sum + customer.currentBookings.length, 0)} note="Current and upcoming" tone="blue" />
        <Stat label="Negative balances" value={customers.filter((customer) => customer.wallet < 0 || customer.coins < 0).length} note="Booking restriction candidates" tone="orange" />
        <Stat label="Suspended" value={customers.filter((customer) => (customerOverrides[customer.id]?.status || customer.accountStatus) === "suspended").length} note="Restricted application accounts" tone="red" />
      </div>
      <div className={styles.panel}>
        <SearchFilter value={query} onChange={setQuery} placeholder="Search customer, phone or email...">
          <select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All customers</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="negative">Negative balance</option><option value="repeat">Repeat customers</option></select>
        </SearchFilter>
          <div className={styles.tableWrap}><table><thead><tr><th>Customer</th><th>Status</th><th>Bookings</th><th>Completed / cancelled</th><th>Booking value</th><th>Wallet / coins</th><th></th></tr></thead><tbody>{list.map((customer) => <tr key={customer.id}><td><button className={styles.linkButton} type="button" onClick={() => setSelected(customer)}><strong>{customer.name}</strong><small>{customer.phone} · {customer.id.slice(-8)}</small></button></td><td><Status value={customerOverrides[customer.id]?.status || customer.accountStatus} /></td><td>{customer.totalBookings}</td><td>{customer.completed} / {customer.cancelled}</td><td>{money(customer.totalValue)}</td><td>{money(customer.wallet)} / {customer.coins}</td><td><button className={styles.miniButton} type="button" onClick={() => setSelected(customer)}>Open profile</button></td></tr>)}</tbody></table></div>
        {!list.length ? <Empty title="No customers found" detail="Try a different search or account filter." /> : null}
      </div>
      {selected ? <Sheet title={selected.name} subtitle={`Customer ID ${selected.id}`} onClose={() => setSelected(null)} footer={<><button className={styles.secondaryButton} type="button" onClick={() => setSelected(null)}>Close</button><button className={(customerOverrides[selected.id]?.status || selected.accountStatus) === "suspended" ? styles.primaryButton : styles.dangerButton} type="button" onClick={() => toggleStatus(selected)}>{(customerOverrides[selected.id]?.status || selected.accountStatus) === "suspended" ? "Reactivate account" : "Suspend account"}</button></>}>
        <div className={styles.profileHero}><span className={styles.bigAvatar}>{selected.name.slice(0, 2).toUpperCase()}</span><div><h4>{selected.name}</h4><p>{selected.phone} · {selected.email}</p><Status value={customerOverrides[selected.id]?.status || selected.accountStatus} /></div></div>
        <div className={styles.detailGrid}><div><span>Contact record</span><strong>{selected.phone !== "Not provided" ? "Phone on file" : "Not provided"}</strong></div><div><span>Registered</span><strong>{shortDate(selected.createdAt)}</strong></div><div><span>Total booking value</span><strong>{money(selected.totalValue)}</strong></div><div><span>Wallet balance</span><strong>{money(selected.wallet)}</strong></div><div><span>Indiery Coins</span><strong>{selected.coins}</strong></div><div><span>Account note</span><strong>{customerOverrides[selected.id]?.reason || "No account note"}</strong></div></div>
        <h4 className={styles.sectionTitle}>Booking and payment history</h4>
        <div className={styles.timeline}>{selected.bookings.length ? selected.bookings.slice(0, 8).map((order) => <div key={order._id}><i /><span><strong>Order {order.orderNo}</strong><small>{order.pickup?.address || "Pickup"} → {order.drop?.address || "Drop"}</small></span><span><Status value={order.status} /><small>{money(order.fare?.total)}</small></span></div>) : <Empty title="No booking history" detail="This customer has not placed a recorded order." />}</div>
        <h4 className={styles.sectionTitle}>Support, refunds and wallet ledger</h4><p className={styles.note}>Customer-linked support cases, refund credits, cancellation penalties and manual wallet adjustments appear here as they are recorded.</p>
      </Sheet> : null}
    </section>
  );
}

function VehiclesModule({ drivers }) {
  const [query, setQuery] = useState("");
  const vehicleRecords = useMemo(() => drivers.map((driver) => ({ id: driver.partnerProfile?.vehicleId?._id || driver._id, driverId: driver._id, driver: driver.name, category: driver.partnerProfile?.vehicleId?.name || "Unassigned", registration: driver.partnerProfile?.vehicleNumber || "Not provided", capacity: driver.partnerProfile?.vehicleId?.capacityKg, verified: driver.partnerProfile?.kycStatus === "verified", status: driver.status === "active" ? "active" : "restricted", rc: Boolean(driver.partnerProfile?.docUrls?.rc), insurance: Boolean(driver.partnerProfile?.docUrls?.insurance) })), [drivers]);
  const list = vehicleRecords.filter((vehicle) => `${vehicle.driver} ${vehicle.category} ${vehicle.registration}`.toLowerCase().includes(query.toLowerCase()));
  const categories = [...new Set(vehicleRecords.map((vehicle) => vehicle.category))];
  return <section className={styles.module}><PageHeading eyebrow="Fleet registry" title="Vehicles and categories" detail="Manage capacity, compliance documents, expiry risk and operational availability." actions={<button className={styles.secondaryButton} type="button" onClick={() => downloadCsv("indiery-vehicles.csv", list)}>Export registry</button>} />
    <div className={styles.stats}><Stat label="Vehicle records" value={vehicleRecords.length} note={`${categories.length} categories`} /><Stat label="Verified" value={vehicleRecords.filter((vehicle) => vehicle.verified).length} note="KYC and vehicle checks passed" tone="green" /><Stat label="Missing RC" value={vehicleRecords.filter((vehicle) => !vehicle.rc).length} note="Document follow-up required" tone="orange" /><Stat label="Restricted" value={vehicleRecords.filter((vehicle) => vehicle.status === "restricted").length} note="Not eligible for assignment" tone="red" /></div>
    {categories.length ? <div className={styles.categoryGrid}>{categories.map((category) => <div key={category}><span className={styles.vehicleIcon}>{category.split(/\s+/).map((word) => word[0]).join("").slice(0, 2).toUpperCase()}</span><strong>{category}</strong><small>{vehicleRecords.filter((vehicle) => vehicle.category === category).length} registered</small></div>)}</div> : <Empty title="No vehicle records" detail="Vehicle categories will appear from registered driver records." />}
    <div className={styles.panel}><SearchFilter value={query} onChange={setQuery} placeholder="Search registration, driver or category..." /><div className={styles.tableWrap}><table><thead><tr><th>Vehicle ID</th><th>Driver</th><th>Category</th><th>Registration</th><th>Capacity</th><th>Documents</th><th>Status</th></tr></thead><tbody>{list.map((vehicle) => <tr key={`${vehicle.driverId}-${vehicle.registration}`}><td>{String(vehicle.id).slice(-8)}</td><td><strong>{vehicle.driver}</strong></td><td>{vehicle.category}</td><td>{vehicle.registration}</td><td>{vehicle.capacity ? `${vehicle.capacity} kg` : "Not set"}</td><td><span className={styles.documentPair}><b className={vehicle.rc ? styles.ok : styles.missing}>RC</b><b className={vehicle.insurance ? styles.ok : styles.missing}>Insurance</b></span></td><td><Status value={vehicle.status} /></td></tr>)}</tbody></table></div></div>
  </section>;
}

function PaymentsModule({ orders }) {
  const [view, setView] = useState("transactions");
  const [query, setQuery] = useState("");
  const transactions = orders.filter((order) => `${order.orderNo} ${order.customer?.name || ""} ${order.paymentStatus || ""}`.toLowerCase().includes(query.toLowerCase()));
  const effectiveRefunds = orders.filter((order) => order.customerCancellation).map((order) => ({ id: `RF-${String(order._id).slice(-8)}`, orderNo: order.orderNo, customer: order.customer?.name || "Customer", amount: Number(order.customerCancellation?.refundAmount ?? 0), method: "Indiery Coins", reason: order.cancellationReason || "No reason recorded", status: Number(order.customerCancellation?.refundAmount || 0) > 0 ? (order.paymentStatus === "refunded" ? "successful" : order.paymentStatus || "pending") : "not due", reference: order.paymentReference || "Not available" }));
  return <section className={styles.module}><PageHeading eyebrow="Payments and transactions" title="Collections, refunds and settlements" detail="Every transaction and refund state below comes directly from recorded orders." actions={<button className={styles.secondaryButton} type="button" onClick={() => downloadCsv(view === "transactions" ? "indiery-transactions.csv" : "indiery-refunds.csv", view === "transactions" ? transactions.map((order) => ({ Order: order.orderNo, Customer: order.customer?.name, Amount: order.fare?.total, Mode: order.paymentMode, Status: order.paymentStatus, Gateway: order.paymentReference })) : effectiveRefunds)}>Export CSV</button>} />
    <div className={styles.stats}><Stat label="Gross booking value" value={money(orders.reduce((sum, order) => sum + Number(order.fare?.total || 0), 0))} note="All recorded bookings" /><Stat label="Successful payments" value={orders.filter((order) => order.paymentStatus === "paid").length} note="Captured transactions" tone="green" /><Stat label="Pending / failed" value={orders.filter((order) => ["pending", "failed"].includes(order.paymentStatus)).length} note="Recorded payment states" tone="orange" /><Stat label="Recorded refunds" value={effectiveRefunds.filter((refund) => refund.status === "successful").length} note={money(effectiveRefunds.filter((refund) => refund.status === "successful").reduce((sum, refund) => sum + refund.amount, 0))} tone="blue" /></div>
    <div className={styles.segmented}><button type="button" className={view === "transactions" ? styles.selected : ""} onClick={() => setView("transactions")}>Customer payments</button><button type="button" className={view === "refunds" ? styles.selected : ""} onClick={() => setView("refunds")}>Recorded refunds</button></div>
    <div className={styles.panel}><SearchFilter value={query} onChange={setQuery} placeholder="Search order, customer or payment status..." />{view === "transactions" ? <div className={styles.tableWrap}><table><thead><tr><th>Booking</th><th>Customer</th><th>Amount</th><th>Payment mode</th><th>Gateway reference</th><th>Status</th></tr></thead><tbody>{transactions.map((order) => <tr key={order._id}><td><strong>{order.orderNo}</strong><small>{shortDate(order.createdAt)}</small></td><td>{order.customer?.name || "Customer"}</td><td>{money(order.fare?.total)}</td><td>{order.paymentMode || "Not set"}</td><td>{order.paymentReference || "Not available"}</td><td><Status value={order.paymentStatus || "pending"} /></td></tr>)}</tbody></table></div> : <div className={styles.tableWrap}><table><thead><tr><th>Refund</th><th>Booking / customer</th><th>Reason</th><th>Amount / method</th><th>Status</th></tr></thead><tbody>{effectiveRefunds.map((refund) => <tr key={refund.id}><td><strong>{refund.id}</strong><small>{refund.reference}</small></td><td>{refund.orderNo}<small>{refund.customer}</small></td><td>{refund.reason}</td><td>{money(refund.amount)}<small>{refund.method}</small></td><td><Status value={refund.status} /></td></tr>)}</tbody></table></div>}</div>
  </section>;
}

function PricingModule({ pricing, setPricing, audit, setAudit, notify }) {
  const [selectedId, setSelectedId] = useState(pricing[0]?.id);
  const [previewDistance, setPreviewDistance] = useState("");
  const selected = pricing.find((item) => item.id === selectedId) || pricing[0];
  const update = (field, value) => setPricing((previous) => previous.map((item) => item.id === selected.id ? { ...item, [field]: field === "active" ? value : Number(value) } : item));
  const save = async () => {
    if (!selected) return;
    try {
      const response = await fetch(`/api/admin/vehicles/${selected.id}/pricing`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseFare: selected.base, perKm: selected.perKm, partnerShare: selected.partnerShare, etaMinutes: selected.etaMinutes, active: selected.active })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.message || "Pricing update failed");
      setAudit((previous) => [{ id: `AUD-${Date.now()}`, action: "Pricing changed", actor: "Signed-in administrator", target: selected.name, at: new Date().toISOString(), detail: `Base ${money(selected.base)}, ${money(selected.perKm)}/km` }, ...previous]);
      notify?.(`${selected.name} pricing saved to the application database.`);
    } catch (error) {
      notify?.(error?.message || "Pricing update failed", true);
    }
  };
  const distance = Number(previewDistance);
  const billableKm = Number.isFinite(distance) && distance > 0 ? Math.ceil(distance) : 0;
  const estimate = selected && billableKm > 0
    ? (selected.serviceType === "intercity" ? billableKm * selected.perKm : selected.base + Math.max(0, billableKm - 1) * selected.perKm)
    : null;
  return <section className={styles.module}><PageHeading eyebrow="Pricing and charges" title="Fare rules by vehicle" detail="Prices are loaded from and saved directly to the application vehicle records." actions={<button className={styles.primaryButton} type="button" onClick={save} disabled={!selected}>Save pricing</button>} />
    {pricing.length ? <div className={styles.splitLayout}><aside className={styles.selector}>{pricing.map((item) => <button type="button" className={item.id === selected?.id ? styles.selectedItem : ""} onClick={() => setSelectedId(item.id)} key={item.id}><span>{item.name}</span><Status value={item.active ? "active" : "inactive"} /></button>)}</aside>{selected ? <div className={styles.panel}><div className={styles.formGrid}>{[["Base fare", "base"], ["Per-kilometre rate", "perKm"], ["Partner share (0 to 1)", "partnerShare"], ["ETA minutes", "etaMinutes"]].map(([label, field]) => <label key={field}><span>{label}</span><input type="number" step={field === "partnerShare" ? "0.01" : "1"} value={selected[field]} onChange={(event) => update(field, event.target.value)} /></label>)}<label><span>Service status</span><select value={selected.active ? "active" : "inactive"} onChange={(event) => update("active", event.target.value === "active")}><option value="active">Active</option><option value="inactive">Inactive</option></select></label><label><span>Fare preview distance (km)</span><input type="number" min="0" value={previewDistance} onChange={(event) => setPreviewDistance(event.target.value)} placeholder="Enter distance" /></label></div><div className={styles.farePreview}><span>Application fare preview</span><strong>{estimate == null ? "Enter distance" : money(estimate)}</strong><small>{estimate == null ? "Uses the same base-fare and per-kilometre formula as the app." : `${billableKm} billable km · ${selected.serviceType}`}</small></div></div> : null}</div> : <Empty title="No vehicle pricing found" detail="No vehicle records were returned by the backend." />}
    <div className={styles.panel}><div className={styles.panelTitle}><div><h3>Pricing change history</h3><p>Actions recorded after real database updates</p></div></div>{audit.filter((item) => item.action.toLowerCase().includes("pricing")).length ? <div className={styles.auditList}>{audit.filter((item) => item.action.toLowerCase().includes("pricing")).slice(0, 8).map((item) => <div key={item.id}><span>{item.action}</span><strong>{item.target}</strong><small>{item.actor} · {shortDate(item.at)} · {item.detail}</small></div>)}</div> : <Empty title="No pricing changes" detail="The audit history is empty." />}</div>
  </section>;
}

function DisputesModule({ orders, notify }) {
  const [query, setQuery] = useState("");
  const [resolutions, setResolutions] = useStoredState("indiery-live-admin-disputes", {});
  const cancelled = orders.filter((order) => order.status === "cancelled" && `${order.orderNo} ${order.customer?.name || ""} ${order.customerCancellation?.reason || order.cancellationReason || ""}`.toLowerCase().includes(query.toLowerCase()));
  const cancellationParty = (order) => order.customerCancellation ? "customer" : order.partnerCancellationHistory?.length ? "driver" : "admin / unknown";
  const resolve = (order) => { const outcome = window.prompt("Resolution note:"); if (!outcome) return; setResolutions((previous) => ({ ...previous, [order._id]: { outcome, at: new Date().toISOString(), status: "resolved" } })); notify?.(`Dispute for ${order.orderNo} resolved.`); };
  return <section className={styles.module}><PageHeading eyebrow="Cancellation and disputes" title="Cancellation review desk" detail="Review who cancelled, penalty calculations, exceptions, daily driver counts and resolution history." />
    <div className={styles.stats}><Stat label="Total cancellations" value={cancelled.length} note="Loaded application records" /><Stat label="Customer initiated" value={cancelled.filter((order) => cancellationParty(order) === "customer").length} note="Customer cancellation records" tone="blue" /><Stat label="Driver initiated" value={cancelled.filter((order) => cancellationParty(order) === "driver").length} note="Driver cancellation records" tone="orange" /><Stat label="Open disputes" value={cancelled.filter((order) => !resolutions[order._id]).length} note="Manual review queue" tone="red" /></div>
    <div className={styles.panel}><SearchFilter value={query} onChange={setQuery} placeholder="Search booking, party or cancellation reason..." /><div className={styles.tableWrap}><table><thead><tr><th>Booking</th><th>Cancelled by</th><th>Reason / timestamp</th><th>Penalty</th><th>Refund</th><th>Review status</th><th></th></tr></thead><tbody>{cancelled.map((order) => <tr key={order._id}><td><strong>{order.orderNo}</strong><small>{order.customer?.name || "Customer"}</small></td><td>{cancellationParty(order)}</td><td>{order.customerCancellation?.reason || order.cancellationReason || order.partnerCancellationHistory?.at(-1)?.reason || "No reason recorded"}<small>{shortDate(order.customerCancellation?.cancelledAt || order.partnerCancellationHistory?.at(-1)?.at || order.updatedAt)}</small></td><td>{money(order.customerCancellation?.charge || 0)}</td><td>{money(order.customerCancellation?.refundAmount || 0)}</td><td><Status value={resolutions[order._id]?.status || "open"} /></td><td>{!resolutions[order._id] ? <button className={styles.miniButton} type="button" onClick={() => resolve(order)}>Resolve</button> : <small>{resolutions[order._id].outcome}</small>}</td></tr>)}</tbody></table></div>{!cancelled.length ? <Empty title="No cancelled bookings" detail="Cancellation records will appear here from the application database." /> : null}</div>
  </section>;
}

function SupportModule({ notify }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [newOpen, setNewOpen] = useState(false);
  const [draft, setDraft] = useState({ party: "Customer", name: "", booking: "", category: "", priority: "medium", description: "" });
  const loadTickets = async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/support-tickets", { credentials: "same-origin", cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.message || "Unable to load support tickets");
      setTickets((payload?.tickets || []).map((ticket) => ({ ...ticket, recordId: ticket.id, id: ticket.ticketNo, updated: ticket.updated })));
    } catch (loadError) { setError(loadError?.message || "Unable to load support tickets"); }
    finally { setLoading(false); }
  };
  useEffect(() => { loadTickets(); }, []);
  const list = tickets.filter((ticket) => `${ticket.id} ${ticket.name} ${ticket.booking} ${ticket.category}`.toLowerCase().includes(query.toLowerCase()));
  const updateTicket = async (ticket, status) => {
    setSaving(true); setError("");
    try {
      const response = await fetch(`/api/admin/support-tickets/${ticket.recordId}`, { method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.message || "Unable to update support ticket");
      await loadTickets();
      setSelected((current) => current?.recordId === ticket.recordId ? { ...current, status, resolvedAt: payload.resolvedAt } : current);
      notify?.(`${ticket.id} moved to ${status}.`);
    } catch (updateError) { setError(updateError?.message || "Unable to update support ticket"); }
    finally { setSaving(false); }
  };
  const create = async (event) => {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const response = await fetch("/api/admin/support-tickets", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.message || "Unable to create support ticket");
      setNewOpen(false); setDraft({ party: "Customer", name: "", booking: "", category: "", priority: "medium", description: "" });
      await loadTickets(); notify?.(`${payload.ticketNo} created.`);
    } catch (createError) { setError(createError?.message || "Unable to create support ticket"); }
    finally { setSaving(false); }
  };
  return <section className={styles.module}><PageHeading eyebrow="Complaints and support" title="Unified support inbox" detail="Triage customer and driver complaints, assignments, escalations, responses and closures." actions={<button className={styles.primaryButton} type="button" onClick={() => setNewOpen(true)}>New ticket</button>} />
    {error ? <div role="alert" className={styles.errorBanner}>{error}</div> : null}
    <div className={styles.stats}><Stat label="Open tickets" value={tickets.filter((ticket) => ticket.status === "open").length} note="Awaiting action" /><Stat label="Unassigned" value={tickets.filter((ticket) => ticket.assignee === "Unassigned").length} note="Needs an owner" tone="blue" /><Stat label="High priority" value={tickets.filter((ticket) => ["high", "urgent"].includes(ticket.priority)).length} note="SLA attention" tone="orange" /><Stat label="Escalated" value={tickets.filter((ticket) => ticket.status === "escalated").length} note="Operations review" tone="red" /></div>
    <div className={styles.panel}><SearchFilter value={query} onChange={setQuery} placeholder="Search ticket, booking or person..." />{loading ? <p className={styles.note}>Loading support tickets…</p> : <div className={styles.ticketGrid}>{list.map((ticket) => <button type="button" key={ticket.recordId} onClick={() => setSelected(ticket)}><div><Status value={ticket.priority} /><Status value={ticket.status} /></div><strong>{ticket.category}</strong><span>{ticket.party}: {ticket.name}</span><small>{ticket.booking || "No related booking"} · {ticket.assignee} · {shortDate(ticket.updated)}</small></button>)}</div>}{!loading && !list.length ? <Empty title="No support tickets" detail="Create a ticket to record and track an issue." /> : null}</div>
    {selected ? <Sheet title={`${selected.id} · ${selected.category}`} subtitle={`${selected.party}: ${selected.name}`} onClose={() => setSelected(null)} footer={<><button className={styles.secondaryButton} type="button" disabled={saving} onClick={() => updateTicket(selected, "waiting")}>Awaiting response</button><button className={styles.secondaryButton} type="button" disabled={saving} onClick={() => updateTicket(selected, "escalated")}>Escalate</button><button className={styles.primaryButton} type="button" disabled={saving} onClick={() => updateTicket(selected, "resolved")}>{saving ? "Saving…" : "Resolve ticket"}</button></>}><div className={styles.detailGrid}><div><span>Related booking</span><strong>{selected.booking || "Not linked"}</strong></div><div><span>Contact</span><strong>{selected.contact || "Not provided"}</strong></div><div><span>Assigned agent</span><strong>{selected.assignee}</strong></div><div><span>Priority</span><Status value={selected.priority} /></div><div><span>Status</span><Status value={selected.status} /></div><div><span>Created</span><strong>{shortDate(selected.createdAt)}</strong></div></div><h4 className={styles.sectionTitle}>Complaint description</h4><p className={styles.note}>{selected.description || "No extended description was supplied."}</p></Sheet> : null}
    {newOpen ? <Sheet title="Create support ticket" subtitle="Log a customer, driver, or business complaint" onClose={() => setNewOpen(false)} footer={<button className={styles.primaryButton} type="submit" form="new-ticket-form" disabled={saving}>{saving ? "Saving…" : "Create ticket"}</button>}><form id="new-ticket-form" className={styles.formGrid} onSubmit={create}><label><span>Party</span><select value={draft.party} onChange={(event) => setDraft({ ...draft, party: event.target.value })}><option>Customer</option><option>Driver</option><option>Business</option></select></label><label><span>Name</span><input required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label><label><span>Contact</span><input value={draft.contact || ""} onChange={(event) => setDraft({ ...draft, contact: event.target.value })} /></label><label><span>Related booking</span><input value={draft.booking} onChange={(event) => setDraft({ ...draft, booking: event.target.value })} /></label><label><span>Priority</span><select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value })}><option>low</option><option>medium</option><option>high</option><option>urgent</option></select></label><label className={styles.spanTwo}><span>Category</span><input required value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} /></label><label className={styles.spanTwo}><span>Description</span><textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label></form></Sheet> : null}
  </section>;
}

function NotificationsModule({ notify }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState({ title: "", audience: "all_customers", message: "" });
  const [sending, setSending] = useState(false);
  const audienceLabels = { all_customers: "All customers", all_drivers: "All drivers", pending_kyc_drivers: "Pending KYC drivers", active_delivery_customers: "Active delivery customers" };
  const loadNotifications = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/notifications/campaigns", { credentials: "same-origin", cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.message || "Unable to load campaign history");
      setNotifications((payload?.campaigns || []).map((campaign) => ({
        ...campaign,
        id: campaign.campaignId,
        audienceLabel: audienceLabels[campaign.audience] || "Not available",
        channel: "Push",
        delivery: "Immediate",
        success: `${campaign.accepted || 0} accepted / ${campaign.attempted || 0} attempted`,
        createdAt: campaign.createdAt
      })));
      setError("");
    } catch (loadError) { setError(loadError?.message || "Unable to load campaign history"); }
    finally { setLoading(false); }
  };
  useEffect(() => { loadNotifications(); }, []);
  const deliver = async (campaign) => {
    setSending(true);
    setError("");
    try {
      const response = await fetch("/api/admin/notifications/send", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: campaign.title, message: campaign.message, audience: campaign.audience }) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message || "Notification delivery failed");
      await loadNotifications();
      notify?.(result.attempted === 0 ? "No registered push devices matched this audience." : `Push provider accepted ${result.accepted} of ${result.attempted} messages.`);
      return true;
    } catch (error) {
      setError(error?.message || "Notification delivery failed");
      notify?.(error?.message || "Notification delivery failed", true);
      return false;
    } finally {
      setSending(false);
    }
  };
  const send = async (event) => { event.preventDefault(); if (await deliver(draft)) setDraft({ title: "", audience: "all_customers", message: "" }); };
  return <section className={styles.module}><PageHeading eyebrow="Notifications" title="Templates, campaigns and delivery logs" detail="Send push announcements and review provider-accepted delivery results." actions={<button className={styles.secondaryButton} type="button" disabled={loading || sending} onClick={loadNotifications}>Refresh history</button>} />
    {error ? <div role="alert" className={styles.errorBanner}>{error}</div> : null}
    <form className={styles.panel} onSubmit={send}><div className={styles.panelTitle}><div><h3>Compose push campaign</h3><p>Delivery results come directly from the configured push provider</p></div></div><div className={styles.formGrid}><label className={styles.spanTwo}><span>Campaign title</span><input required value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Short notification title" /></label><label><span>Audience</span><select value={draft.audience} onChange={(event) => setDraft({ ...draft, audience: event.target.value })}><option value="all_customers">All customers</option><option value="all_drivers">All drivers</option><option value="pending_kyc_drivers">Pending KYC drivers</option><option value="active_delivery_customers">Active delivery customers</option></select></label><label className={styles.spanTwo}><span>Message</span><textarea required value={draft.message} onChange={(event) => setDraft({ ...draft, message: event.target.value })} placeholder="Write the announcement..." /></label></div><button className={styles.primaryButton} type="submit" disabled={sending}>{sending ? "Sending..." : "Send push now"}</button></form>
    <div className={styles.panel}><div className={styles.panelTitle}><div><h3>Campaign and failure log</h3><p>Persisted campaign records; “accepted” means the push provider accepted a message, not confirmed device delivery.</p></div></div>{loading ? <p className={styles.note}>Loading campaign history…</p> : notifications.length ? <div className={styles.tableWrap}><table><thead><tr><th>Campaign</th><th>Audience</th><th>Channel</th><th>Delivery</th><th>Status</th><th>Provider result</th><th></th></tr></thead><tbody>{notifications.map((item) => <tr key={item.id}><td><strong>{item.title}</strong><small>{item.id} · {shortDate(item.createdAt)}</small></td><td>{item.audienceLabel}</td><td>{item.channel}</td><td>{item.delivery}</td><td><Status value={item.status} /></td><td>{item.success}</td><td>{item.status === "failed" ? <button className={styles.miniButton} type="button" disabled={sending} onClick={() => deliver(item)}>Retry</button> : null}</td></tr>)}</tbody></table></div> : <Empty title="No notification campaigns" detail="No campaign records exist in the admin database." />}</div>
  </section>;
}

function ReportsModule({ orders, drivers, customers, metrics }) {
  const [period, setPeriod] = useState("all");
  const [city, setCity] = useState("all");
  const cities = [...new Set([...customers.map((customer) => customer.city), ...drivers.map((driver) => driver.city)].filter((value) => value && value !== "Not provided"))].sort();
  const cutoff = useMemo(() => {
    if (period === "all") return null;
    const date = new Date();
    if (period === "today") date.setHours(0, 0, 0, 0);
    else date.setDate(date.getDate() - Number(period));
    return date;
  }, [period]);
  const filteredOrders = orders.filter((order) => {
    const created = new Date(order.createdAt);
    const matchesDate = !cutoff || (!Number.isNaN(created.getTime()) && created >= cutoff);
    const orderCity = order.customer?.city || "";
    return matchesDate && (city === "all" || orderCity === city);
  });
  const delivered = filteredOrders.filter((order) => order.status === "delivered");
  const cancelled = filteredOrders.filter((order) => order.status === "cancelled");
  const active = filteredOrders.filter((order) => ACTIVE_ORDER_STATUSES.has(order.status));
  const gmv = filteredOrders.reduce((sum, order) => sum + Number(order.fare?.total || 0), 0);
  const platformCommission = filteredOrders.reduce((sum, order) => sum + Number(order.fare?.platformCommission || 0), 0);
  const driverEarnings = filteredOrders.reduce((sum, order) => sum + Number(order.fare?.driverCommission || 0), 0);
  const filteredCustomerIds = new Map();
  filteredOrders.forEach((order) => { const id = order.customer?._id; if (id) filteredCustomerIds.set(String(id), (filteredCustomerIds.get(String(id)) || 0) + 1); });
  const repeatRate = filteredCustomerIds.size ? Math.round([...filteredCustomerIds.values()].filter((count) => count > 1).length / filteredCustomerIds.size * 100) : 0;
  const max = Math.max(1, delivered.length, cancelled.length, active.length);
  const periodLabel = period === "all" ? "All recorded dates" : period === "today" ? "Today" : `Last ${period} days`;
  const exportReport = () => downloadCsv("indiery-business-report.csv", filteredOrders.map((order) => ({ Date: shortDate(order.createdAt), Booking: order.orderNo, City: order.customer?.city || "", Vehicle: order.vehicle?.name, Status: order.status, Value: order.fare?.total, Commission: order.fare?.platformCommission, DriverPayout: order.fare?.driverCommission })));
  return <section className={styles.module}><PageHeading eyebrow="Reports and analytics" title="Business intelligence" detail="Every total below is calculated from the orders, customers and drivers currently returned by the backend." actions={<><select value={period} onChange={(event) => setPeriod(event.target.value)}><option value="all">All dates</option><option value="today">Today</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select><select value={city} onChange={(event) => setCity(event.target.value)}><option value="all">All recorded cities</option>{cities.map((value) => <option value={value} key={value}>{value}</option>)}</select><button className={styles.primaryButton} type="button" onClick={exportReport}>Export CSV</button></>} />
    <div className={styles.stats}><Stat label="Gross booking value" value={money(gmv)} note={`${periodLabel} · ${city === "all" ? "All recorded cities" : city}`} /><Stat label="Indiery commission" value={money(platformCommission)} note={`${gmv ? Math.round(platformCommission / gmv * 100) : 0}% effective take rate`} tone="green" /><Stat label="Average booking value" value={money(filteredOrders.length ? gmv / filteredOrders.length : 0)} note={`${filteredOrders.length} bookings`} tone="blue" /><Stat label="Repeat customer rate" value={`${repeatRate}%`} note="Customers with 2+ filtered bookings" tone="orange" /></div>
    <div className={styles.threeColumns}><div className={styles.panel}><div className={styles.panelTitle}><div><h3>Booking outcomes</h3><p>Volume from filtered orders</p></div></div><div className={styles.barChart}>{[["Delivered", delivered.length, "green"], ["Active", active.length, "purple"], ["Cancelled", cancelled.length, "red"]].map(([label, value, tone]) => <div key={label}><span>{label}</span><i><b className={styles[tone]} style={{ width: `${value / max * 100}%` }} /></i><strong>{value}</strong></div>)}</div></div><div className={styles.panel}><div className={styles.panelTitle}><div><h3>Driver report</h3><p>Current fleet records</p></div></div><div className={styles.kpiList}><div><span>Registered</span><strong>{drivers.length}</strong></div><div><span>Approved</span><strong>{drivers.filter((driver) => driver.partnerProfile?.kycStatus === "verified").length}</strong></div><div><span>Online</span><strong>{drivers.filter((driver) => driver.partnerProfile?.online).length}</strong></div><div><span>Pending KYC</span><strong>{drivers.filter((driver) => driver.partnerProfile?.kycStatus === "pending").length}</strong></div></div></div><div className={styles.panel}><div className={styles.panelTitle}><div><h3>Financial position</h3><p>Calculated from filtered orders</p></div></div><div className={styles.kpiList}><div><span>Collections</span><strong>{money(gmv)}</strong></div><div><span>Driver earnings</span><strong>{money(driverEarnings)}</strong></div><div><span>Pending payouts</span><strong>{money(metrics?.pendingDriverDisbursements)}</strong></div><div><span>Wallet / coins</span><strong>{money(metrics?.coinsInCirculation)}</strong></div></div></div></div>
  </section>;
}

function AreasModule({ areas, setAreas, notify }) {
  const [selected, setSelected] = useState(null);
  const toggle = (area) => { setAreas((previous) => previous.map((item) => item.id === area.id ? { ...item, active: !item.active } : item)); notify?.(`${area.city} ${area.zone} coverage record marked ${area.active ? "paused" : "active"}.`); };
  const openCreate = () => setSelected({ id: "", city: "", zone: "", coverage: "", hours: "", vehicles: "", manager: "", centerLat: "", centerLng: "", radiusKm: "", active: true });
  const save = () => {
    if (!selected?.city.trim() || !selected?.zone.trim()) return;
    const hasGeofence = selected.centerLat !== "" || selected.centerLng !== "" || selected.radiusKm !== "";
    if (hasGeofence && (selected.centerLat === "" || selected.centerLng === "" || selected.radiusKm === "")) return;
    const saved = { ...selected, centerLat: selected.centerLat === "" ? undefined : Number(selected.centerLat), centerLng: selected.centerLng === "" ? undefined : Number(selected.centerLng), radiusKm: selected.radiusKm === "" ? undefined : Number(selected.radiusKm), vehicles: Number(selected.vehicles || 0) };
    if (saved.id) setAreas((previous) => previous.map((item) => item.id === saved.id ? saved : item));
    else setAreas((previous) => [...previous, { ...saved, id: `AREA-${Date.now()}` }]);
    setSelected(null);
    notify?.("Service zone saved.");
  };
  return <section className={styles.module}><PageHeading eyebrow="Service areas" title="Cities, zones and coverage" detail="Administrative coverage records are shown here; booking enforcement is not claimed unless exposed by the backend." actions={<button className={styles.primaryButton} type="button" onClick={openCreate}>Add service zone</button>} />
    <div className={styles.stats}><Stat label="Supported cities" value={new Set(areas.map((area) => area.city)).size} note="Configured records" /><Stat label="Service zones" value={areas.length} note={`${areas.filter((area) => area.active).length} marked active`} tone="green" /><Stat label="Paused records" value={areas.filter((area) => !area.active).length} note="Administrative status" tone="orange" /><Stat label="City managers" value={new Set(areas.map((area) => area.manager).filter(Boolean)).size} note="Recorded owners" tone="blue" /></div>
    {areas.length ? <div className={styles.areaGrid}>{areas.map((area) => <article key={area.id}><header><div><span>{area.city}</span><h3>{area.zone}</h3></div><Status value={area.active ? "active" : "unavailable"} /></header><p>{area.coverage || "Coverage not configured"}</p><dl><div><dt>Operating hours</dt><dd>{area.hours || "Not configured"}</dd></div><div><dt>Vehicle categories</dt><dd>{area.vehicles ?? "Not configured"}</dd></div><div><dt>City manager</dt><dd>{area.manager || "Not assigned"}</dd></div></dl><footer><button type="button" onClick={() => setSelected(area)}>Edit zone</button><button type="button" className={area.active ? styles.dangerText : ""} onClick={() => toggle(area)}>{area.active ? "Pause area" : "Resume area"}</button></footer></article>)}</div> : <Empty title="No service areas configured" detail="Add a service zone to create the first real record." />}
    {selected ? <Sheet title={selected.id ? `Edit ${selected.city} · ${selected.zone}` : "Add service zone"} subtitle="Circle geofence around the service zone" onClose={() => setSelected(null)} footer={<button className={styles.primaryButton} type="button" disabled={!selected.city.trim() || !selected.zone.trim() || (!selected.id && !hasGeofence) || (hasGeofence && (selected.centerLat === "" || selected.centerLng === "" || selected.radiusKm === ""))} onClick={save}>Save zone</button>}><div className={styles.formGrid}>{[["City", "city"], ["Zone", "zone"], ["Coverage notes", "coverage"], ["Operating hours", "hours"], ["City manager", "manager"]].map(([label, field]) => <label className={field === "coverage" ? styles.spanTwo : ""} key={field}><span>{label}</span><input required={field === "city" || field === "zone"} value={selected[field]} onChange={(event) => setSelected({ ...selected, [field]: event.target.value })} /></label>)}<label><span>Vehicle categories</span><input type="number" value={selected.vehicles} onChange={(event) => setSelected({ ...selected, vehicles: event.target.value })} /></label><label><span>Center latitude</span><input type="number" step="any" min="-90" max="90" value={selected.centerLat ?? ""} onChange={(event) => setSelected({ ...selected, centerLat: event.target.value })} /></label><label><span>Center longitude</span><input type="number" step="any" min="-180" max="180" value={selected.centerLng ?? ""} onChange={(event) => setSelected({ ...selected, centerLng: event.target.value })} /></label><label><span>Radius (km)</span><input type="number" step="any" min="0.1" max="500" value={selected.radiusKm ?? ""} onChange={(event) => setSelected({ ...selected, radiusKm: event.target.value })} /></label></div><p className={styles.note}>New zones require map-center coordinates and a radius. Once saved, pickup and drop-off are checked against active zones before a quote or booking is accepted. Legacy records without coordinates remain informational until configured.</p></Sheet> : null}
  </section>;
}

const ADMIN_ROLE_INFO = {
  super_admin: ["Super Admin", "All administrator modules and cities"],
  operations_manager: ["Operations Manager", "Bookings, drivers, dispatch, vehicles"],
  kyc_executive: ["KYC Executive", "Driver profiles and document verification"],
  support_executive: ["Support Executive", "Customer records and support workspace"],
  finance_manager: ["Finance Manager", "Payments, wallet, payouts and reports"],
  city_manager: ["City Manager", "City-scoped operations (not yet enabled)"]
};

function AdminUsersModule() {
  const [admins, setAdmins] = useState([]);
  const [open, setOpen] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [draft, setDraft] = useState({ name: "", email: "", roleKey: "operations_manager", cityScope: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const loadAdmins = async () => {
    try {
      const response = await fetch("/api/admin/admin-users", { credentials: "same-origin", cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.message || "Unable to load administrator accounts");
      setAdmins(Array.isArray(payload?.admins) ? payload.admins : []);
    } catch (loadError) { setError(loadError?.message || "Unable to load administrator accounts"); }
  };
  useEffect(() => { loadAdmins(); }, []);
  const createInvite = async (event) => {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/admin-users/invitations", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, cityScope: draft.cityScope.split(",").map((city) => city.trim()).filter(Boolean) })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.message || "Unable to create invitation");
      // Keep the one-time bearer token in the URL fragment so it is not sent in page requests or referrer headers.
      setInviteLink(`${window.location.origin}/admin/accept-invite#token=${encodeURIComponent(payload.inviteToken)}`);
      setOpen(false);
      setDraft({ name: "", email: "", roleKey: "operations_manager", cityScope: "" });
      await loadAdmins();
    } catch (inviteError) { setError(inviteError?.message || "Unable to create invitation"); }
    finally { setBusy(false); }
  };
  const setStatus = async (admin, status) => {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/admin/admin-users/${admin.id}/status`, {
        method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.message || "Unable to update administrator access");
      await loadAdmins();
    } catch (statusError) { setError(statusError?.message || "Unable to update administrator access"); }
    finally { setBusy(false); }
  };
  const cityRole = draft.roleKey === "city_manager";
  return <section className={styles.module}><PageHeading eyebrow="Access control" title="Administrator accounts" detail="Invite real administrator accounts, assign a role, and revoke access. Invitation links expire after 24 hours and work once." actions={<button className={styles.primaryButton} type="button" onClick={() => { setError(""); setOpen(true); }}>Invite administrator</button>} />
    <div className={styles.roleGrid}>{Object.entries(ADMIN_ROLE_INFO).map(([role, [label, permissions]]) => <div key={role}><strong>{label}</strong><p>{permissions}</p><small>{admins.filter((admin) => admin.roleKey === role).length} accounts</small></div>)}</div>
    {error ? <div role="alert" className={styles.errorBanner}>{error}</div> : null}
    <div className={styles.panel}>{admins.length ? <div className={styles.tableWrap}><table><thead><tr><th>Administrator</th><th>Role</th><th>City scope</th><th>Last login</th><th>Status</th><th></th></tr></thead><tbody>{admins.map((admin) => { const role = ADMIN_ROLE_INFO[admin.roleKey] || [admin.roleKey, ""] ; return <tr key={admin.id}><td><strong>{admin.name}</strong><small>{admin.email}</small></td><td>{role[0]}<small>{role[1]}</small></td><td>{admin.cityScope?.join(", ") || "All cities"}</td><td>{admin.lastLoginAt ? shortDate(admin.lastLoginAt) : "Never"}</td><td><Status value={admin.status} /></td><td>{admin.status !== "invited" ? <button className={styles.miniButton} type="button" disabled={busy} onClick={() => setStatus(admin, admin.status === "active" ? "deactivated" : "active")}>{admin.status === "active" ? "Deactivate" : "Reactivate"}</button> : <span>Invitation pending</span>}</td></tr>; })}</tbody></table></div> : <Empty title="No managed administrator accounts" detail="The configured bootstrap admin is available once it has signed in." />}</div>
    {open ? <Sheet title="Invite administrator" subtitle="The invitation token is shown once. Share it through your approved secure channel." onClose={() => setOpen(false)} footer={<button className={styles.primaryButton} type="submit" form="create-admin" disabled={busy || (cityRole && !draft.cityScope.trim())}>{busy ? "Creating..." : "Create invitation"}</button>}><form id="create-admin" className={styles.formGrid} onSubmit={createInvite}><label><span>Full name</span><input required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label><label><span>Email</span><input required type="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} /></label><label><span>Role</span><select value={draft.roleKey} onChange={(event) => setDraft({ ...draft, roleKey: event.target.value })}>{Object.entries(ADMIN_ROLE_INFO).map(([key, [label]]) => <option key={key} value={key} disabled={key === "city_manager"}>{key === "city_manager" ? `${label} (coming after city scoping)` : label}</option>)}</select></label><label><span>City scope (comma separated)</span><input value={draft.cityScope} onChange={(event) => setDraft({ ...draft, cityScope: event.target.value })} placeholder="Required for city managers" disabled={!cityRole} /></label></form></Sheet> : null}
    {inviteLink ? <Sheet title="Invitation link created" subtitle="This link expires in 24 hours and can only be accepted once." onClose={() => setInviteLink("")} footer={<button className={styles.primaryButton} type="button" onClick={() => setInviteLink("")}>Done</button>}><label className={styles.fullField}><span>Share securely with the invited administrator</span><input readOnly value={inviteLink} onFocus={(event) => event.target.select()} /></label><button className={styles.secondaryButton} type="button" onClick={() => navigator.clipboard?.writeText(inviteLink)}>Copy invitation link</button></Sheet> : null}
  </section>;
}

function SettingsModule({ settings, setSettings, audit }) {
  const [view, setView] = useState("settings");
  const [serverAudit, setServerAudit] = useState([]);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/audit-events", { credentials: "same-origin", cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        if (!cancelled && Array.isArray(payload?.events)) {
          setServerAudit(payload.events.map((event) => ({
            id: event._id,
            action: `${event.action} ${event.path}`,
            actor: event.actorId?.name || event.actorId?.email || event.actorEmail || event.actorId?._id || "Administrator",
            target: event.path,
            at: event.createdAt,
            detail: `${event.outcome} (HTTP ${event.statusCode}) · request ${event.requestId}`
          })));
        }
      })
      .catch(() => { if (!cancelled) setServerAudit([]); });
    return () => { cancelled = true; };
  }, []);
  const auditEntries = serverAudit.length ? serverAudit : audit;
  return <section className={styles.module}><PageHeading eyebrow="System administration" title="Settings and audit logs" detail="Store administrative configuration records and review privileged actions. Runtime enforcement is shown only where the backend supports it." actions={<div className={styles.segmented}><button type="button" className={view === "settings" ? styles.selected : ""} onClick={() => setView("settings")}>System settings</button><button type="button" className={view === "audit" ? styles.selected : ""} onClick={() => setView("audit")}>Audit log</button></div>} />
    {view === "settings" ? <div className={styles.settingsGrid}><div className={styles.panel}><div className={styles.panelTitle}><div><h3>Company profile</h3><p>Values remain blank until saved by an administrator</p></div></div><div className={styles.formGrid}>{[["Company name", "companyName"], ["Support email", "supportEmail"], ["Support phone", "supportPhone"]].map(([label, field]) => <label className={field === "companyName" ? styles.spanTwo : ""} key={field}><span>{label}</span><input value={settings[field]} onChange={(event) => setSettings({ ...settings, [field]: event.target.value })} /></label>)}</div></div><div className={styles.panel}><div className={styles.panelTitle}><div><h3>Booking and wallet rules</h3><p>No default operational numbers are assumed</p></div></div><div className={styles.formGrid}>{[["Re-KYC interval (days)", "reKycDays"], ["Customer wallet floor", "walletLimit"], ["Pickup search radius (km)", "maxPickupRadius"]].map(([label, field]) => <label key={field}><span>{label}</span><input type="number" value={settings[field]} onChange={(event) => setSettings({ ...settings, [field]: event.target.value === "" ? "" : Number(event.target.value) })} /></label>)}</div></div><div className={styles.panel}><div className={styles.panelTitle}><div><h3>Security and automation</h3><p>Runtime rules are applied by the backend where marked</p></div></div><div className={styles.toggleList}>{[["Automatic driver assignment", "autoAssign"], ["Require two-factor authentication", "requireTwoFactor"], ["Maintenance mode", "maintenanceMode"]].map(([label, field]) => <label key={field}><span><strong>{label}</strong><small>{field === "requireTwoFactor" ? "Saved only; multi-factor login is not integrated yet" : "Enforced for new booking and dispatch requests"}</small></span><input type="checkbox" checked={settings[field]} onChange={(event) => setSettings({ ...settings, [field]: event.target.checked, ...(field === "autoAssign" ? { autoAssignConfigured: true } : {}) })} /></label>)}</div></div><div className={styles.panel}><Empty title="Provider status unavailable" detail="Integration health is not displayed until the backend exposes verified provider checks." /></div></div> : <div className={styles.panel}>{auditEntries.length ? <div className={styles.tableWrap}><table><thead><tr><th>Time</th><th>Action</th><th>Actor</th><th>Target</th><th>Details</th></tr></thead><tbody>{auditEntries.map((item) => <tr key={item.id}><td>{shortDate(item.at)}<small>{item.id}</small></td><td>{item.action}</td><td>{item.actor}</td><td>{item.target}</td><td>{item.detail}</td></tr>)}</tbody></table></div> : <Empty title="No audit entries" detail="Real administrator actions will appear here." />}</div>}
  </section>;
}

function B2BOrdersModule({ orders, b2bClients, onInspectOrder, onAssignOrder }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const clientNames = new Set(b2bClients.map((client) => client.companyName));
  const b2bOrders = orders.filter((order) => order.b2bClient || order.orderType === "b2b" || order.type === "b2b" || clientNames.has(order.customer?.name));
  const list = b2bOrders.filter((order) => (status === "all" || order.status === status) && `${order.orderNo} ${order.b2bClient?.companyName || order.customer?.name || ""}`.toLowerCase().includes(query.toLowerCase()));
  return <section className={styles.module}><PageHeading eyebrow="Business partners" title="B2B orders" detail="Track every partner order, assignment, invoice state and delivery milestone in one queue." actions={<button className={styles.secondaryButton} type="button" onClick={() => downloadCsv("indiery-b2b-orders.csv", list.map((order) => ({ Order: order.orderNo, Business: order.b2bClient?.companyName || order.customer?.name, Vehicle: order.vehicle?.name, Driver: order.partner?.name, Fare: order.fare?.total, Delivery: order.status, Payment: order.paymentStatus })))}>Export CSV</button>} />
    <div className={styles.stats}><Stat label="B2B orders" value={b2bOrders.length} note={`${b2bClients.length} business partners`} /><Stat label="Unassigned" value={b2bOrders.filter((order) => !order.partner).length} note="Driver action required" tone="orange" /><Stat label="In transit" value={b2bOrders.filter((order) => ACTIVE_ORDER_STATUSES.has(order.status)).length} note="Live operations" tone="blue" /><Stat label="Delivered value" value={money(b2bOrders.filter((order) => order.status === "delivered").reduce((sum, order) => sum + Number(order.fare?.total || 0), 0))} note="Completed B2B deliveries" tone="green" /></div>
    <div className={styles.panel}><SearchFilter value={query} onChange={setQuery} placeholder="Search business or order ID..."><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All delivery states</option><option value="searching">Unassigned</option><option value="in_transit">In transit</option><option value="delivered">Delivered</option><option value="cancelled">Cancelled</option></select></SearchFilter><div className={styles.tableWrap}><table><thead><tr><th>Order / business</th><th>Route</th><th>Vehicle / driver</th><th>Fare</th><th>Payment / invoice</th><th>Delivery</th><th></th></tr></thead><tbody>{list.map((order) => <tr key={order._id}><td><strong>{order.orderNo}</strong><small>{order.b2bClient?.companyName || order.customer?.name || "Business client"}</small></td><td>{order.pickup?.address || "Pickup"}<small>→ {order.drop?.address || "Drop"}</small></td><td>{order.vehicle?.name || "Not selected"}<small>{order.partner?.name || "Unassigned"}</small></td><td>{money(order.fare?.total)}</td><td><Status value={order.paymentStatus || "pending"} /></td><td><Status value={order.status} /></td><td><div className={styles.inlineActions}><button type="button" onClick={() => onInspectOrder?.(order)}>View</button>{!order.partner ? <button type="button" onClick={() => onAssignOrder?.(order)}>Assign</button> : null}</div></td></tr>)}</tbody></table></div>{!list.length ? <Empty title="No matching B2B orders" detail="Create a B2B dispatch from the Business Partners page." /> : null}</div>
  </section>;
}

function BillingModule({ orders, b2bClients }) {
  const [invoices, setInvoices] = useState([]);
  const [selected, setSelected] = useState(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentDraft, setPaymentDraft] = useState({ amount: "", reference: "", note: "" });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const loadInvoices = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/b2b/invoices", { credentials: "same-origin", cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.message || "Unable to load invoices");
      setInvoices(payload?.invoices || []); setError("");
    } catch (loadError) { setError(loadError?.message || "Unable to load invoices"); }
    finally { setLoading(false); }
  };
  useEffect(() => { loadInvoices(); }, []);
  const readyOrders = orders.filter((order) => order.b2bClient && order.status === "delivered" && order.paymentStatus === "pending" && !order.b2bInvoice);
  const readyByClient = new Map();
  readyOrders.forEach((order) => {
    const clientId = String(order.b2bClient?._id || order.b2bClient);
    readyByClient.set(clientId, (readyByClient.get(clientId) || 0) + 1);
  });
  const totals = invoices.reduce((sum, invoice) => ({ billed: sum.billed + Number(invoice.total || 0), due: sum.due + Math.max(0, Number(invoice.total || 0) - Number(invoice.paidAmount || 0)) }), { billed: 0, due: 0 });
  const issueInvoice = async (clientId) => {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/b2b/invoices", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientId }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.message || "Unable to issue invoice");
      await loadInvoices(); setSelected(payload.invoice);
    } catch (issueError) { setError(issueError?.message || "Unable to issue invoice"); }
    finally { setBusy(false); }
  };
  const recordPayment = async (event) => {
    event.preventDefault(); if (!selected) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/admin/b2b/invoices/${selected._id}/payments`, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...paymentDraft, amount: Number(paymentDraft.amount) }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.message || "Unable to record payment");
      setSelected(payload.invoice); setPaymentOpen(false); setPaymentDraft({ amount: "", reference: "", note: "" }); await loadInvoices();
    } catch (paymentError) { setError(paymentError?.message || "Unable to record payment"); }
    finally { setBusy(false); }
  };
  const getClientName = (invoice) => invoice.companySnapshot?.companyName || invoice.client?.companyName || "Business client";
  return <section className={styles.module}><PageHeading eyebrow="Business billing" title="Invoices, payments and statements" detail="Persisted invoices cover completed B2B deliveries. Reconciliation records payments already received outside this app; tax is not calculated here." actions={<><button className={styles.secondaryButton} type="button" disabled={loading} onClick={loadInvoices}>Refresh</button><button className={styles.secondaryButton} type="button" onClick={() => downloadCsv("indiery-business-invoices.csv", invoices.map((invoice) => ({ Invoice: invoice.invoiceNo, Business: getClientName(invoice), Orders: invoice.lines?.length || 0, Total: invoice.total, Paid: invoice.paidAmount, Outstanding: Math.max(0, invoice.total - invoice.paidAmount), Status: invoice.status })))}>Export invoices</button></>} />
    {error ? <div role="alert" className={styles.errorBanner}>{error}</div> : null}
    <div className={styles.stats}><Stat label="Invoice value" value={money(totals.billed)} note={`${invoices.length} saved invoices`} /><Stat label="Outstanding" value={money(totals.due)} note="Unpaid invoice balances" tone="orange" /><Stat label="Paid invoices" value={invoices.filter((invoice) => invoice.status === "paid").length} note="Fully reconciled" tone="green" /><Stat label="Delivered unbilled" value={readyOrders.length} note="Eligible for invoicing" tone="blue" /></div>
    {readyByClient.size ? <div className={styles.panel}><div className={styles.panelTitle}><div><h3>Ready to invoice</h3><p>Delivered B2B bookings not already attached to an invoice</p></div></div><div className={styles.inlineActions}>{b2bClients.filter((client) => readyByClient.has(String(client._id))).map((client) => <button key={client._id} className={styles.secondaryButton} type="button" disabled={busy} onClick={() => issueInvoice(client._id)}>Create invoice · {client.companyName} ({readyByClient.get(String(client._id))})</button>)}</div></div> : null}
    <div className={styles.panel}>{loading ? <p className={styles.note}>Loading saved invoices…</p> : invoices.length ? <div className={styles.tableWrap}><table><thead><tr><th>Invoice</th><th>Business partner</th><th>Orders</th><th>Total</th><th>Outstanding</th><th>Due date</th><th>Status</th><th></th></tr></thead><tbody>{invoices.map((invoice) => <tr key={invoice._id}><td><strong>{invoice.invoiceNo}</strong><small>{shortDate(invoice.createdAt)}</small></td><td>{getClientName(invoice)}<small>{invoice.companySnapshot?.contactPerson}</small></td><td>{invoice.lines?.length || 0}</td><td>{money(invoice.total)}</td><td>{money(Math.max(0, invoice.total - invoice.paidAmount))}</td><td>{invoice.dueDate ? shortDate(invoice.dueDate) : "Not set"}</td><td><Status value={invoice.status} /></td><td><button className={styles.miniButton} type="button" onClick={() => setSelected(invoice)}>Open</button></td></tr>)}</tbody></table></div> : <Empty title="No invoices yet" detail="Delivered B2B orders will appear in the invoicing queue when ready." />}</div>
    {selected ? <Sheet title={getClientName(selected)} subtitle={`${selected.invoiceNo} · ${selected.lines?.length || 0} delivered orders`} onClose={() => { setSelected(null); setPaymentOpen(false); }} footer={<>{selected.status !== "paid" ? <button className={styles.primaryButton} type="button" onClick={() => { setPaymentDraft({ ...paymentDraft, amount: String(Math.max(0, selected.total - selected.paidAmount)) }); setPaymentOpen(true); }}>Record received payment</button> : null}<button className={styles.secondaryButton} type="button" onClick={() => window.print()}>Print / save</button></>}><div className={styles.profileHero}><span className={styles.bigAvatar}>{getClientName(selected).slice(0, 2).toUpperCase()}</span><div><h4>{getClientName(selected)}</h4><p>{selected.companySnapshot?.contactPerson} · {selected.companySnapshot?.email || selected.companySnapshot?.phone}</p><Status value={selected.status} /></div></div><div className={styles.detailGrid}><div><span>Subtotal</span><strong>{money(selected.subtotal)}</strong></div><div><span>Tax</span><strong>{money(selected.taxAmount)} (not configured)</strong></div><div><span>Invoice total</span><strong>{money(selected.total)}</strong></div><div><span>Paid / outstanding</span><strong>{money(selected.paidAmount)} / {money(Math.max(0, selected.total - selected.paidAmount))}</strong></div><div><span>GSTIN</span><strong>{selected.companySnapshot?.gstin || "Not provided"}</strong></div><div><span>Due date</span><strong>{selected.dueDate ? shortDate(selected.dueDate) : "Not set"}</strong></div></div><h4 className={styles.sectionTitle}>Delivered orders</h4><div className={styles.timeline}>{(selected.lines || []).map((line) => <div key={line.order}><i /><span><strong>{line.orderNo}</strong><small>{line.description} · {shortDate(line.serviceDate)}</small></span><strong>{money(line.amount)}</strong></div>)}</div><h4 className={styles.sectionTitle}>Recorded payments</h4><div className={styles.timeline}>{selected.payments?.length ? selected.payments.map((payment, index) => <div key={`${payment.reference}-${index}`}><i /><span><strong>{payment.reference}</strong><small>{shortDate(payment.receivedAt)}{payment.note ? ` · ${payment.note}` : ""}</small></span><strong>{money(payment.amount)}</strong></div>) : <p className={styles.note}>No payments recorded.</p>}</div></Sheet> : null}
    {paymentOpen && selected ? <Sheet title="Record payment received" subtitle="This records an external bank or other payment already received; it does not charge the customer." onClose={() => setPaymentOpen(false)} footer={<button className={styles.primaryButton} type="submit" form="b2b-payment-form" disabled={busy}>{busy ? "Saving…" : "Save reconciliation"}</button>}><form id="b2b-payment-form" className={styles.formGrid} onSubmit={recordPayment}><label><span>Amount received</span><input required type="number" min="0.01" max={Math.max(0, selected.total - selected.paidAmount)} step="0.01" value={paymentDraft.amount} onChange={(event) => setPaymentDraft({ ...paymentDraft, amount: event.target.value })} /></label><label><span>Bank / transaction reference</span><input required value={paymentDraft.reference} onChange={(event) => setPaymentDraft({ ...paymentDraft, reference: event.target.value })} /></label><label className={styles.spanTwo}><span>Note (optional)</span><textarea value={paymentDraft.note} onChange={(event) => setPaymentDraft({ ...paymentDraft, note: event.target.value })} /></label></form></Sheet> : null}
  </section>;
}

function EnterpriseEnquiriesModule({ notify }) {
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/enterprise-enquiries?page=1&limit=100", { credentials: "same-origin", cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.message || "Unable to load enterprise enquiries");
      setEnquiries(payload?.enquiries || []);
      setError("");
    } catch (loadError) { setError(loadError?.message || "Unable to load enterprise enquiries"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const updateStatus = async (enquiry, status) => {
    setBusyId(String(enquiry._id)); setError("");
    try {
      const response = await fetch(`/api/admin/enterprise-enquiries/${enquiry._id}/status`, { method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.message || "Unable to update enquiry");
      setEnquiries((items) => items.map((item) => item._id === enquiry._id ? payload.enquiry : item));
      notify?.(`Enquiry marked ${status}.`);
    } catch (updateError) { setError(updateError?.message || "Unable to update enquiry"); }
    finally { setBusyId(""); }
  };
  return <section className={styles.module}><PageHeading eyebrow="Business leads" title="Enterprise enquiries" detail="Requests submitted through the Customer app. Follow up with the contact and update each lead’s status." actions={<button className={styles.secondaryButton} type="button" disabled={loading} onClick={load}>Refresh</button>} />
    {error ? <div role="alert" className={styles.errorBanner}>{error}</div> : null}
    <div className={styles.stats}><Stat label="Total enquiries" value={enquiries.length} note="Latest 100 submissions" /><Stat label="New" value={enquiries.filter((item) => item.status === "new").length} note="Needs follow-up" tone="orange" /><Stat label="Contacted" value={enquiries.filter((item) => item.status === "contacted").length} note="Follow-up started" tone="blue" /><Stat label="Closed" value={enquiries.filter((item) => item.status === "closed").length} note="Completed leads" tone="green" /></div>
    <div className={styles.panel}>{loading ? <p className={styles.note}>Loading enquiries…</p> : enquiries.length ? <div className={styles.tableWrap}><table><thead><tr><th>Submitted</th><th>Company</th><th>Contact</th><th>Email</th><th>Mobile</th><th>Status</th><th>Follow-up</th></tr></thead><tbody>{enquiries.map((enquiry) => <tr key={enquiry._id}><td>{shortDate(enquiry.createdAt)}</td><td><strong>{enquiry.companyName}</strong></td><td>{enquiry.contactName}</td><td><a href={`mailto:${enquiry.email}`}>{enquiry.email}</a></td><td><a href={`tel:${enquiry.mobileNumber}`}>{enquiry.mobileNumber}</a></td><td><Status value={enquiry.status} /></td><td><select aria-label={`Update ${enquiry.companyName} enquiry status`} disabled={busyId === String(enquiry._id)} value={enquiry.status} onChange={(event) => updateStatus(enquiry, event.target.value)}><option value="new">New</option><option value="contacted">Contacted</option><option value="closed">Closed</option></select></td></tr>)}</tbody></table></div> : <Empty title="No enterprise enquiries yet" detail="Customer-app requests will appear here after submission." />}</div>
  </section>;
}

function AccountDeletionRequestsModule({ notify }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/account-deletion-requests?page=1&limit=100", { credentials: "same-origin", cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.message || "Unable to load deletion requests");
      setRequests(payload?.requests || []);
      setError("");
    } catch (loadError) { setError(loadError?.message || "Unable to load deletion requests"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const updateRequest = async (request, changes) => {
    const id = String(request._id);
    setBusyId(id);
    setError("");
    try {
      const response = await fetch(`/api/admin/account-deletion-requests/${encodeURIComponent(id)}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.message || "Unable to update deletion request");
      setRequests((items) => items.map((item) => String(item._id) === id ? payload.request : item));
      notify?.("Deletion request updated.");
    } catch (updateError) { setError(updateError?.message || "Unable to update deletion request"); }
    finally { setBusyId(""); }
  };
  const verified = requests.filter((item) => item.verificationStatus === "verified").length;
  return <section className={styles.module}>
    <PageHeading eyebrow="Privacy requests" title="Account deletion requests" detail="Review requests submitted from the customer and partner apps or public form. Mark a request complete only after identity verification and the eligible deletion process are finished." actions={<button className={styles.secondaryButton} type="button" disabled={loading} onClick={load}>Refresh</button>} />
    {error ? <div role="alert" className={styles.errorBanner}>{error}</div> : null}
    <div className={styles.stats}>
      <Stat label="Requests loaded" value={requests.length} note="Latest 100" />
      <Stat label="Needs review" value={requests.filter((item) => item.status === "requested").length} note="New requests" tone="orange" />
      <Stat label="Being reviewed" value={requests.filter((item) => item.status === "reviewing").length} note="In progress" tone="blue" />
      <Stat label="Ownership verified" value={verified} note="Eligible to process" tone="green" />
    </div>
    <div className={styles.panel}>
      {loading ? <p className={styles.note}>Loading deletion requests…</p> : requests.length ? <div className={styles.tableWrap}>
        <table><thead><tr><th>Requested</th><th>Account</th><th>Contact</th><th>Reason</th><th>Source / repeats</th><th>Ownership</th><th>Workflow</th></tr></thead>
          <tbody>{requests.map((request) => {
            const id = String(request._id);
            const isBusy = busyId === id;
            const isVerified = request.verificationStatus === "verified";
            return <tr key={id}>
              <td><strong>{shortDate(request.lastRequestedAt || request.createdAt)}</strong>{request.completedAt ? <small>Completed {shortDate(request.completedAt)}</small> : null}</td>
              <td><strong>{request.name || "Name not provided"}</strong><small>{request.role === "partner" ? "Driver partner" : "Customer"}</small></td>
              <td><a href={`tel:${request.phone}`}>{request.phone}</a>{request.email ? <small><a href={`mailto:${request.email}`}>{request.email}</a></small> : null}</td>
              <td>{request.reason || "No reason provided"}</td>
              <td>{request.source === "in_app" ? "In app" : "Public form"}<small>{request.requestCount || 1} submission(s)</small></td>
              <td><select aria-label={`Update ownership verification for ${request.name || request.phone}`} disabled={isBusy || request.status === "completed"} value={request.verificationStatus} onChange={(event) => updateRequest(request, { verificationStatus: event.target.value })}><option value="pending">Needs verification</option><option value="verified">Verified</option></select></td>
              <td><select aria-label={`Update deletion request status for ${request.name || request.phone}`} disabled={isBusy} value={request.status} onChange={(event) => updateRequest(request, { status: event.target.value })}><option value="requested">Requested</option><option value="reviewing">Reviewing</option><option value="completed" disabled={!isVerified}>Completed (verify first)</option><option value="rejected">Rejected</option></select></td>
            </tr>;
          })}</tbody>
        </table>
      </div> : <Empty title="No account deletion requests" detail="Customer and partner requests will appear here after submission." />}
    </div>
    <p className={styles.note}>This dashboard records review status only; it does not delete accounts automatically.</p>
  </section>;
}

export const EXTENDED_TAB_TITLES = {
  customers: "Customers",
  vehicles: "Vehicles",
  payments: "Payments & refunds",
  pricing: "Pricing & charges",
  disputes: "Cancellations & disputes",
  support: "Support tickets",
  notifications: "Notifications",
  reports: "Reports & analytics",
  areas: "Service areas",
  admins: "Admin users",
  settings: "Settings & audit",
  b2bOrders: "B2B orders",
  enterpriseEnquiries: "Enterprise enquiries",
  accountDeletionRequests: "Account deletion",
  billing: "Business billing",
};

export default function AdminControlCenter({ activeTab, orders = [], drivers = [], b2bClients = [], customerUsers = [], metrics = {}, onInspectOrder, onInspectDriver, onAssignOrder, notify }) {
  const customers = useMemo(() => deriveCustomers(orders, customerUsers), [orders, customerUsers]);
  const [pricing, setPricing] = useState([]);
  const [customerOverrides, setCustomerOverrides] = useStoredState("indiery-live-admin-customer-overrides", {});
  const [areas, setAreas] = useStoredState("indiery-live-admin-areas", []);
  const [settings, setSettings] = useStoredState("indiery-live-admin-settings", EMPTY_SETTINGS);
  const [audit, setAudit] = useStoredState("indiery-live-admin-audit", []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/vehicles", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.message || "Unable to load vehicle pricing");
        return payload;
      })
      .then((payload) => {
        if (cancelled) return;
        setPricing((payload.vehicles || []).map((vehicle) => ({
          id: vehicle._id || vehicle.id,
          code: vehicle.code,
          name: vehicle.name,
          serviceType: vehicle.serviceType,
          base: Number(vehicle.baseFare),
          perKm: Number(vehicle.perKm),
          partnerShare: Number(vehicle.partnerShare),
          etaMinutes: Number(vehicle.etaMinutes),
          active: Boolean(vehicle.active)
        })));
      })
      .catch((error) => { if (!cancelled) notify?.(error.message, true); });
    return () => { cancelled = true; };
  }, []);

  if (activeTab === "radar") return <DashboardSupplement orders={orders} drivers={drivers} customers={customers} metrics={metrics} onInspectOrder={onInspectOrder} onInspectDriver={onInspectDriver} />;
  if (activeTab === "customers") return <CustomersModule customers={customers} customerOverrides={customerOverrides} setCustomerOverrides={setCustomerOverrides} notify={notify} />;
  if (activeTab === "vehicles") return <VehiclesModule drivers={drivers} />;
  if (activeTab === "payments") return <PaymentsModule orders={orders} />;
  if (activeTab === "pricing") return <PricingModule pricing={pricing} setPricing={setPricing} audit={audit} setAudit={setAudit} notify={notify} />;
  if (activeTab === "disputes") return <DisputesModule orders={orders} notify={notify} />;
  if (activeTab === "support") return <SupportModule notify={notify} />;
  if (activeTab === "notifications") return <NotificationsModule notify={notify} />;
  if (activeTab === "reports") return <ReportsModule orders={orders} drivers={drivers} customers={customers} metrics={metrics} />;
  if (activeTab === "areas") return <AreasModule areas={areas} setAreas={setAreas} notify={notify} />;
  if (activeTab === "admins") return <AdminUsersModule />;
  if (activeTab === "settings") return <SettingsModule settings={settings} setSettings={setSettings} audit={audit} />;
  if (activeTab === "b2bOrders") return <B2BOrdersModule orders={orders} b2bClients={b2bClients} onInspectOrder={onInspectOrder} onAssignOrder={onAssignOrder} />;
  if (activeTab === "enterpriseEnquiries") return <EnterpriseEnquiriesModule notify={notify} />;
  if (activeTab === "accountDeletionRequests") return <AccountDeletionRequestsModule notify={notify} />;
  if (activeTab === "billing") return <BillingModule orders={orders} b2bClients={b2bClients} />;
  return null;
}
