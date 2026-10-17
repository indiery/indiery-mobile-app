"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./control-center.module.css";

const EMPTY_SETTINGS = {
  companyName: "",
  supportEmail: "",
  supportPhone: "",
  autoAssign: false,
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
        if (response.ok && payload?.value != null) nextValue = payload.value;
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

function SupportModule({ tickets, setTickets, notify }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [newOpen, setNewOpen] = useState(false);
  const [draft, setDraft] = useState({ party: "Customer", name: "", booking: "", category: "", priority: "medium", description: "" });
  const list = tickets.filter((ticket) => `${ticket.id} ${ticket.name} ${ticket.booking} ${ticket.category}`.toLowerCase().includes(query.toLowerCase()));
  const updateTicket = (ticket, status) => { setTickets((previous) => previous.map((item) => item.id === ticket.id ? { ...item, status, assignee: item.assignee === "Unassigned" ? "Signed-in administrator" : item.assignee, updated: new Date().toISOString() } : item)); setSelected((current) => current?.id === ticket.id ? { ...current, status } : current); notify?.(`${ticket.id} moved to ${status}.`); };
  const create = (event) => { event.preventDefault(); const ticket = { ...draft, id: `TKT-${Date.now()}`, status: "open", assignee: "Unassigned", updated: new Date().toISOString() }; setTickets((previous) => [ticket, ...previous]); setNewOpen(false); setDraft({ party: "Customer", name: "", booking: "", category: "", priority: "medium", description: "" }); notify?.(`${ticket.id} created.`); };
  return <section className={styles.module}><PageHeading eyebrow="Complaints and support" title="Unified support inbox" detail="Triage customer and driver complaints, assignments, escalations, responses and closures." actions={<button className={styles.primaryButton} type="button" onClick={() => setNewOpen(true)}>New ticket</button>} />
    <div className={styles.stats}><Stat label="Open tickets" value={tickets.filter((ticket) => ticket.status === "open").length} note="Awaiting action" /><Stat label="Unassigned" value={tickets.filter((ticket) => ticket.assignee === "Unassigned").length} note="Needs an owner" tone="blue" /><Stat label="High priority" value={tickets.filter((ticket) => ["high", "urgent"].includes(ticket.priority)).length} note="SLA attention" tone="orange" /><Stat label="Escalated" value={tickets.filter((ticket) => ticket.status === "escalated").length} note="Operations review" tone="red" /></div>
    <div className={styles.panel}><SearchFilter value={query} onChange={setQuery} placeholder="Search ticket, booking or person..." /><div className={styles.ticketGrid}>{list.map((ticket) => <button type="button" key={ticket.id} onClick={() => setSelected(ticket)}><div><Status value={ticket.priority} /><Status value={ticket.status} /></div><strong>{ticket.category}</strong><span>{ticket.party}: {ticket.name}</span><small>{ticket.booking || "No related booking"} · {ticket.assignee} · {ticket.updated}</small></button>)}</div></div>
    {selected ? <Sheet title={`${selected.id} · ${selected.category}`} subtitle={`${selected.party}: ${selected.name}`} onClose={() => setSelected(null)} footer={<><button className={styles.secondaryButton} type="button" onClick={() => updateTicket(selected, "waiting")}>Awaiting response</button><button className={styles.primaryButton} type="button" onClick={() => updateTicket(selected, "resolved")}>Resolve ticket</button></>}><div className={styles.detailGrid}><div><span>Related booking</span><strong>{selected.booking || "Not linked"}</strong></div><div><span>Assigned agent</span><strong>{selected.assignee}</strong></div><div><span>Priority</span><Status value={selected.priority} /></div><div><span>Status</span><Status value={selected.status} /></div></div><h4 className={styles.sectionTitle}>Complaint description</h4><p className={styles.note}>{selected.description || "No extended description was supplied."}</p></Sheet> : null}
    {newOpen ? <Sheet title="Create support ticket" subtitle="Log a customer or driver complaint" onClose={() => setNewOpen(false)} footer={<button className={styles.primaryButton} type="submit" form="new-ticket-form">Create ticket</button>}><form id="new-ticket-form" className={styles.formGrid} onSubmit={create}><label><span>Party</span><select value={draft.party} onChange={(event) => setDraft({ ...draft, party: event.target.value })}><option>Customer</option><option>Driver</option></select></label><label><span>Name</span><input required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label><label><span>Related booking</span><input value={draft.booking} onChange={(event) => setDraft({ ...draft, booking: event.target.value })} /></label><label><span>Priority</span><select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value })}><option>low</option><option>medium</option><option>high</option><option>urgent</option></select></label><label className={styles.spanTwo}><span>Category</span><input required value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} /></label><label className={styles.spanTwo}><span>Description</span><textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label></form></Sheet> : null}
  </section>;
}

function NotificationsModule({ notifications, setNotifications, notify }) {
  const [draft, setDraft] = useState({ title: "", audience: "all_customers", message: "" });
  const [sending, setSending] = useState(false);
  const audienceLabels = { all_customers: "All customers", all_drivers: "All drivers", pending_kyc_drivers: "Pending KYC drivers", active_delivery_customers: "Active delivery customers" };
  const deliver = async (campaign) => {
    setSending(true);
    try {
      const response = await fetch("/api/admin/notifications/send", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: campaign.title, message: campaign.message, audience: campaign.audience }) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message || "Notification delivery failed");
      const status = result.attempted === 0 ? "no devices" : result.rejected === 0 ? "sent" : result.accepted > 0 ? "partial" : "failed";
      const item = { ...campaign, id: result.campaignId, audienceLabel: audienceLabels[campaign.audience], channel: "Push", delivery: "Immediate", status, success: `${result.accepted} accepted / ${result.attempted} attempted`, createdAt: new Date().toISOString() };
      setNotifications((previous) => [item, ...previous.filter((entry) => entry.id !== campaign.id)]);
      notify?.(result.attempted === 0 ? "No registered push devices matched this audience." : `Push provider accepted ${result.accepted} of ${result.attempted} messages.`);
      return true;
    } catch (error) {
      const failed = { ...campaign, id: campaign.id || `NTF-${Date.now()}`, audienceLabel: audienceLabels[campaign.audience], channel: "Push", delivery: "Immediate", status: "failed", success: error?.message || "Notification delivery failed", createdAt: campaign.createdAt || new Date().toISOString() };
      setNotifications((previous) => [failed, ...previous.filter((entry) => entry.id !== campaign.id)]);
      notify?.(failed.success, true);
      return false;
    } finally {
      setSending(false);
    }
  };
  const send = async (event) => { event.preventDefault(); if (await deliver(draft)) setDraft({ title: "", audience: "all_customers", message: "" }); };
  return <section className={styles.module}><PageHeading eyebrow="Notifications" title="Templates, campaigns and delivery logs" detail="Manage transactional alerts, document reminders, announcements and failed delivery retries." />
    <form className={styles.panel} onSubmit={send}><div className={styles.panelTitle}><div><h3>Compose push campaign</h3><p>Delivery results come directly from the configured push provider</p></div></div><div className={styles.formGrid}><label className={styles.spanTwo}><span>Campaign title</span><input required value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Short notification title" /></label><label><span>Audience</span><select value={draft.audience} onChange={(event) => setDraft({ ...draft, audience: event.target.value })}><option value="all_customers">All customers</option><option value="all_drivers">All drivers</option><option value="pending_kyc_drivers">Pending KYC drivers</option><option value="active_delivery_customers">Active delivery customers</option></select></label><label className={styles.spanTwo}><span>Message</span><textarea required value={draft.message} onChange={(event) => setDraft({ ...draft, message: event.target.value })} placeholder="Write the announcement..." /></label></div><button className={styles.primaryButton} type="submit" disabled={sending}>{sending ? "Sending..." : "Send push now"}</button></form>
    <div className={styles.panel}><div className={styles.panelTitle}><div><h3>Campaign and failure log</h3><p>Only campaigns sent through the application backend are shown</p></div></div>{notifications.length ? <div className={styles.tableWrap}><table><thead><tr><th>Campaign</th><th>Audience</th><th>Channel</th><th>Delivery</th><th>Status</th><th>Provider result</th><th></th></tr></thead><tbody>{notifications.map((item) => <tr key={item.id}><td><strong>{item.title}</strong><small>{item.id}</small></td><td>{item.audienceLabel || audienceLabels[item.audience] || "Not available"}</td><td>{item.channel}</td><td>{item.delivery}</td><td><Status value={item.status} /></td><td>{item.success || "Not available"}</td><td>{item.status === "failed" ? <button className={styles.miniButton} type="button" disabled={sending} onClick={() => deliver(item)}>Retry</button> : null}</td></tr>)}</tbody></table></div> : <Empty title="No notification campaigns" detail="No campaign records exist in the admin database." />}</div>
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
  const openCreate = () => setSelected({ id: "", city: "", zone: "", coverage: "", hours: "", vehicles: "", manager: "", active: true });
  const save = () => {
    if (!selected?.city.trim() || !selected?.zone.trim()) return;
    if (selected.id) setAreas((previous) => previous.map((item) => item.id === selected.id ? selected : item));
    else setAreas((previous) => [...previous, { ...selected, id: `AREA-${Date.now()}`, vehicles: Number(selected.vehicles || 0) }]);
    setSelected(null);
    notify?.("Service zone saved.");
  };
  return <section className={styles.module}><PageHeading eyebrow="Service areas" title="Cities, zones and coverage" detail="Administrative coverage records are shown here; booking enforcement is not claimed unless exposed by the backend." actions={<button className={styles.primaryButton} type="button" onClick={openCreate}>Add service zone</button>} />
    <div className={styles.stats}><Stat label="Supported cities" value={new Set(areas.map((area) => area.city)).size} note="Configured records" /><Stat label="Service zones" value={areas.length} note={`${areas.filter((area) => area.active).length} marked active`} tone="green" /><Stat label="Paused records" value={areas.filter((area) => !area.active).length} note="Administrative status" tone="orange" /><Stat label="City managers" value={new Set(areas.map((area) => area.manager).filter(Boolean)).size} note="Recorded owners" tone="blue" /></div>
    {areas.length ? <div className={styles.areaGrid}>{areas.map((area) => <article key={area.id}><header><div><span>{area.city}</span><h3>{area.zone}</h3></div><Status value={area.active ? "active" : "unavailable"} /></header><p>{area.coverage || "Coverage not configured"}</p><dl><div><dt>Operating hours</dt><dd>{area.hours || "Not configured"}</dd></div><div><dt>Vehicle categories</dt><dd>{area.vehicles ?? "Not configured"}</dd></div><div><dt>City manager</dt><dd>{area.manager || "Not assigned"}</dd></div></dl><footer><button type="button" onClick={() => setSelected(area)}>Edit zone</button><button type="button" className={area.active ? styles.dangerText : ""} onClick={() => toggle(area)}>{area.active ? "Pause area" : "Resume area"}</button></footer></article>)}</div> : <Empty title="No service areas configured" detail="Add a service zone to create the first real record." />}
    {selected ? <Sheet title={selected.id ? `Edit ${selected.city} · ${selected.zone}` : "Add service zone"} subtitle="Service-zone configuration" onClose={() => setSelected(null)} footer={<button className={styles.primaryButton} type="button" onClick={save}>Save zone</button>}><div className={styles.formGrid}>{[["City", "city"], ["Zone", "zone"], ["Coverage", "coverage"], ["Operating hours", "hours"], ["City manager", "manager"]].map(([label, field]) => <label className={field === "coverage" ? styles.spanTwo : ""} key={field}><span>{label}</span><input required={field === "city" || field === "zone"} value={selected[field]} onChange={(event) => setSelected({ ...selected, [field]: event.target.value })} /></label>)}<label><span>Vehicle categories</span><input type="number" value={selected.vehicles} onChange={(event) => setSelected({ ...selected, vehicles: event.target.value })} /></label></div></Sheet> : null}
  </section>;
}

const ROLE_PERMISSIONS = {
  "Super Admin": "All modules and cities",
  "Operations Manager": "Bookings, drivers, dispatch, vehicles",
  "KYC Executive": "Driver profiles and document verification",
  "Support Executive": "Customers, complaints and support actions",
  "Finance Manager": "Payments, refunds, wallet and payouts",
  "City Manager": "Operations within assigned service areas",
};

function AdminUsersModule({ admins, setAdmins, audit, setAudit, notify }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ name: "", email: "", role: "Operations Manager", scope: "" });
  const create = (event) => { event.preventDefault(); const admin = { ...draft, id: `ADM-${Date.now()}`, status: "recorded", lastLogin: "Not available" }; setAdmins((previous) => [...previous, admin]); setAudit((previous) => [{ id: `AUD-${Date.now()}`, action: "Admin access record created", actor: "Signed-in administrator", target: admin.email, at: new Date().toISOString(), detail: admin.role }, ...previous]); setOpen(false); notify?.(`Access record saved for ${admin.email}.`); };
  const toggle = (admin) => { const status = admin.status === "active" ? "deactivated" : "active"; setAdmins((previous) => previous.map((item) => item.id === admin.id ? { ...item, status } : item)); notify?.(`${admin.name} is now ${status}.`); };
  return <section className={styles.module}><PageHeading eyebrow="Access control" title="Admin access records" detail="Store staff role and scope records. Authentication provisioning remains controlled by the configured admin identity service." actions={<button className={styles.primaryButton} type="button" onClick={() => setOpen(true)}>Add access record</button>} />
    <div className={styles.roleGrid}>{Object.entries(ROLE_PERMISSIONS).map(([role, permission]) => <div key={role}><strong>{role}</strong><p>{permission}</p><small>{admins.filter((admin) => admin.role === role).length} assigned</small></div>)}</div>
    <div className={styles.panel}>{admins.length ? <div className={styles.tableWrap}><table><thead><tr><th>Admin</th><th>Role</th><th>City / service scope</th><th>Last login</th><th>Status</th><th></th></tr></thead><tbody>{admins.map((admin) => <tr key={admin.id}><td><strong>{admin.name}</strong><small>{admin.email} · {admin.id}</small></td><td>{admin.role}<small>{ROLE_PERMISSIONS[admin.role]}</small></td><td>{admin.scope || "Not restricted"}</td><td>{admin.lastLogin || "Not available"}</td><td><Status value={admin.status} /></td><td><button className={styles.miniButton} type="button" onClick={() => toggle(admin)}>{admin.status === "active" ? "Deactivate" : "Activate"}</button></td></tr>)}</tbody></table></div> : <Empty title="No managed admin accounts" detail="No administrator records have been created in this module." />}</div>
    {open ? <Sheet title="Add admin access record" subtitle="This records intended access; it does not send an invitation" onClose={() => setOpen(false)} footer={<button className={styles.primaryButton} type="submit" form="create-admin">Save record</button>}><form id="create-admin" className={styles.formGrid} onSubmit={create}><label><span>Full name</span><input required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label><label><span>Email</span><input required type="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} /></label><label><span>Role</span><select value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value })}>{Object.keys(ROLE_PERMISSIONS).map((role) => <option key={role}>{role}</option>)}</select></label><label><span>City / service scope</span><input value={draft.scope} onChange={(event) => setDraft({ ...draft, scope: event.target.value })} /></label></form></Sheet> : null}
  </section>;
}

function SettingsModule({ settings, setSettings, audit }) {
  const [view, setView] = useState("settings");
  return <section className={styles.module}><PageHeading eyebrow="System administration" title="Settings and audit logs" detail="Store administrative configuration records and review privileged actions. Runtime enforcement is shown only where the backend supports it." actions={<div className={styles.segmented}><button type="button" className={view === "settings" ? styles.selected : ""} onClick={() => setView("settings")}>System settings</button><button type="button" className={view === "audit" ? styles.selected : ""} onClick={() => setView("audit")}>Audit log</button></div>} />
    {view === "settings" ? <div className={styles.settingsGrid}><div className={styles.panel}><div className={styles.panelTitle}><div><h3>Company profile</h3><p>Values remain blank until saved by an administrator</p></div></div><div className={styles.formGrid}>{[["Company name", "companyName"], ["Support email", "supportEmail"], ["Support phone", "supportPhone"]].map(([label, field]) => <label className={field === "companyName" ? styles.spanTwo : ""} key={field}><span>{label}</span><input value={settings[field]} onChange={(event) => setSettings({ ...settings, [field]: event.target.value })} /></label>)}</div></div><div className={styles.panel}><div className={styles.panelTitle}><div><h3>Booking and wallet rules</h3><p>No default operational numbers are assumed</p></div></div><div className={styles.formGrid}>{[["Re-KYC interval (days)", "reKycDays"], ["Customer wallet floor", "walletLimit"], ["Pickup search radius (km)", "maxPickupRadius"]].map(([label, field]) => <label key={field}><span>{label}</span><input type="number" value={settings[field]} onChange={(event) => setSettings({ ...settings, [field]: event.target.value === "" ? "" : Number(event.target.value) })} /></label>)}</div></div><div className={styles.panel}><div className={styles.panelTitle}><div><h3>Security and automation</h3><p>Configuration records only</p></div></div><div className={styles.toggleList}>{[["Automatic driver assignment", "autoAssign"], ["Require two-factor authentication", "requireTwoFactor"], ["Maintenance mode", "maintenanceMode"]].map(([label, field]) => <label key={field}><span><strong>{label}</strong><small>Saved preference; backend enforcement not yet reported</small></span><input type="checkbox" checked={settings[field]} onChange={(event) => setSettings({ ...settings, [field]: event.target.checked })} /></label>)}</div></div><div className={styles.panel}><Empty title="Provider status unavailable" detail="Integration health is not displayed until the backend exposes verified provider checks." /></div></div> : <div className={styles.panel}>{audit.length ? <div className={styles.tableWrap}><table><thead><tr><th>Time</th><th>Action</th><th>Actor</th><th>Target</th><th>Details</th></tr></thead><tbody>{audit.map((item) => <tr key={item.id}><td>{shortDate(item.at)}<small>{item.id}</small></td><td>{item.action}</td><td>{item.actor}</td><td>{item.target}</td><td>{item.detail}</td></tr>)}</tbody></table></div> : <Empty title="No audit entries" detail="Real administrator actions will appear here." />}</div>}
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
  const [selected, setSelected] = useState(null);
  const clientNames = new Set(b2bClients.map((client) => client.companyName));
  const b2bOrders = orders.filter((order) => order.b2bClient || order.orderType === "b2b" || order.type === "b2b" || clientNames.has(order.customer?.name));
  const invoices = b2bClients.map((client) => {
    const clientOrders = b2bOrders.filter((order) => String(order.b2bClient?._id || order.b2bClient || "") === String(client._id) || order.customer?.name === client.companyName || order.customer?.phone === client.phone);
    const amount = clientOrders.reduce((sum, order) => sum + Number(order.fare?.total || 0), 0);
    const unpaidOrderValue = clientOrders.filter((order) => !["paid", "refunded"].includes(order.paymentStatus)).reduce((sum, order) => sum + Number(order.fare?.total || 0), 0);
    const due = Math.max(0, Number(client.outstandingBalance || 0), unpaidOrderValue);
    return { id: `INV-${String(client._id).slice(-8)}`, client, orders: clientOrders, amount, paid: Math.max(0, amount - due), due, dueDate: client.paymentDueDate || "Not configured", status: amount === 0 ? "draft" : due > 0 ? "unpaid" : "paid" };
  });
  return <section className={styles.module}><PageHeading eyebrow="Business billing" title="Invoices, payments and statements" detail="Keep credit billing separate from customer wallets with order-level charges and reconciliation." actions={<button className={styles.secondaryButton} type="button" onClick={() => downloadCsv("indiery-business-billing.csv", invoices.map((invoice) => ({ Invoice: invoice.id, Business: invoice.client.companyName, Orders: invoice.orders.length, Total: invoice.amount, Paid: invoice.paid, Outstanding: invoice.due, DueDate: invoice.dueDate, Status: invoice.status })))}>Export statements</button>} />
    <div className={styles.stats}><Stat label="Invoice value" value={money(invoices.reduce((sum, invoice) => sum + invoice.amount, 0))} note={`${invoices.length} business accounts`} /><Stat label="Outstanding" value={money(invoices.reduce((sum, invoice) => sum + Math.max(0, invoice.due), 0))} note="Credit billing receivable" tone="orange" /><Stat label="Paid invoices" value={invoices.filter((invoice) => invoice.status === "paid").length} note="Reconciled accounts" tone="green" /><Stat label="Unpaid / draft" value={invoices.filter((invoice) => invoice.status !== "paid").length} note="Follow-up queue" tone="red" /></div>
    <div className={styles.panel}><div className={styles.tableWrap}><table><thead><tr><th>Invoice</th><th>Business partner</th><th>Orders</th><th>Total charges</th><th>Outstanding</th><th>Due</th><th>Status</th><th></th></tr></thead><tbody>{invoices.map((invoice) => <tr key={invoice.id}><td><strong>{invoice.id}</strong><small>Account statement</small></td><td>{invoice.client.companyName}<small>{invoice.client.contactPerson}</small></td><td>{invoice.orders.length}</td><td>{money(invoice.amount)}</td><td>{money(invoice.due)}</td><td>{invoice.dueDate}</td><td><Status value={invoice.status} /></td><td><button className={styles.miniButton} type="button" onClick={() => setSelected(invoice)}>Open</button></td></tr>)}</tbody></table></div>{!invoices.length ? <Empty title="No business accounts" detail="Create a business partner to begin invoice management." /> : null}</div>
    {selected ? <Sheet title={selected.client.companyName} subtitle={`${selected.id} · ${selected.orders.length} order charges`} onClose={() => setSelected(null)} footer={<button className={styles.secondaryButton} type="button" onClick={() => window.print()}>Download / print invoice</button>}><div className={styles.profileHero}><span className={styles.bigAvatar}>{selected.client.companyName.slice(0, 2).toUpperCase()}</span><div><h4>{selected.client.companyName}</h4><p>{selected.client.contactPerson} · {selected.client.email || selected.client.phone}</p><Status value={selected.status} /></div></div><div className={styles.detailGrid}><div><span>Invoice total</span><strong>{money(selected.amount)}</strong></div><div><span>Outstanding</span><strong>{money(selected.due)}</strong></div><div><span>Payment terms</span><strong>{selected.client.paymentTerms || selected.dueDate}</strong></div><div><span>GSTIN</span><strong>{selected.client.gstin || "Not provided"}</strong></div></div><h4 className={styles.sectionTitle}>Order-wise charges</h4><div className={styles.timeline}>{selected.orders.length ? selected.orders.map((order) => <div key={order._id}><i /><span><strong>{order.orderNo}</strong><small>{shortDate(order.createdAt)} · {order.status}</small></span><strong>{money(order.fare?.total)}</strong></div>) : <Empty title="No billed orders" detail="Completed orders will be added to the next invoice cycle." />}</div><h4 className={styles.sectionTitle}>Pricing, contacts and activity</h4><p className={styles.note}>Contract: {selected.client.contractType || "On-demand"}. Authorized contact: {selected.client.contactPerson}. Values shown here come from the client account and recorded orders.</p></Sheet> : null}
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
  billing: "Business billing",
};

export default function AdminControlCenter({ activeTab, orders = [], drivers = [], b2bClients = [], customerUsers = [], metrics = {}, onInspectOrder, onInspectDriver, onAssignOrder, notify }) {
  const customers = useMemo(() => deriveCustomers(orders, customerUsers), [orders, customerUsers]);
  const [pricing, setPricing] = useState([]);
  const [customerOverrides, setCustomerOverrides] = useStoredState("indiery-live-admin-customer-overrides", {});
  const [tickets, setTickets] = useStoredState("indiery-live-admin-tickets", []);
  const [notifications, setNotifications] = useStoredState("indiery-live-admin-notifications", []);
  const [areas, setAreas] = useStoredState("indiery-live-admin-areas", []);
  const [admins, setAdmins] = useStoredState("indiery-live-admin-users", []);
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
  if (activeTab === "support") return <SupportModule tickets={tickets} setTickets={setTickets} notify={notify} />;
  if (activeTab === "notifications") return <NotificationsModule notifications={notifications} setNotifications={setNotifications} notify={notify} />;
  if (activeTab === "reports") return <ReportsModule orders={orders} drivers={drivers} customers={customers} metrics={metrics} />;
  if (activeTab === "areas") return <AreasModule areas={areas} setAreas={setAreas} notify={notify} />;
  if (activeTab === "admins") return <AdminUsersModule admins={admins} setAdmins={setAdmins} audit={audit} setAudit={setAudit} notify={notify} />;
  if (activeTab === "settings") return <SettingsModule settings={settings} setSettings={setSettings} audit={audit} />;
  if (activeTab === "b2bOrders") return <B2BOrdersModule orders={orders} b2bClients={b2bClients} onInspectOrder={onInspectOrder} onAssignOrder={onAssignOrder} />;
  if (activeTab === "billing") return <BillingModule orders={orders} b2bClients={b2bClients} />;
  return null;
}
