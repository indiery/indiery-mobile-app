export interface PublicTrackingPoint {
  label: string;
  lat?: number;
  lng?: number;
}

export interface PublicTrackingState {
  orderNo: string;
  status: string;
  statusLabel: string;
  active: boolean;
  serverTime: string;
  updatedAt: string;
  etaMinutes: number;
  etaTargetAt?: string;
  pickup: PublicTrackingPoint;
  extraStops: PublicTrackingPoint[];
  drop: PublicTrackingPoint;
  routePath?: Array<{ lat: number; lng: number }>;
  vehicle: {
    name: string;
  };
  goods: {
    type: string;
    weightKg: number;
    distanceKm: number;
  };
  partner?: {
    name: string;
    vehicleNumber?: string;
  };
  driverLocation: {
    lat: number;
    lng: number;
    heading?: number;
    updatedAt?: string;
  } | null;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeJson(value: unknown) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function routeRows(state: PublicTrackingState) {
  const points = [
    { point: state.pickup, kind: 'pickup', badge: 'P', caption: 'Pickup' },
    ...state.extraStops.map((point, index) => ({
      point,
      kind: 'stop',
      badge: String(index + 1),
      caption: `Stop ${index + 1}`
    })),
    { point: state.drop, kind: 'drop', badge: 'D', caption: 'Drop' }
  ];

  return points
    .map(
      ({ point, kind, badge, caption }) => `
        <li class="route-row">
          <span class="route-badge route-badge--${kind}">${badge}</span>
          <span class="route-copy">
            <strong>${escapeHtml(point.label)}</strong>
            <small>${escapeHtml(caption)}</small>
          </span>
        </li>`
    )
    .join('');
}

export function trackingContentSecurityPolicy(nonce: string) {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' https://unpkg.com`,
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline' https://unpkg.com",
    "img-src 'self' data: blob: https://*.tile.openstreetmap.org https://unpkg.com",
    "connect-src 'self'",
    "font-src 'self' data:",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
    "worker-src 'none'"
  ].join('; ');
}

export function renderLiveTrackingPage(state: PublicTrackingState, nonce: string) {
  const initialState = safeJson(state);
  const partnerName = state.partner?.name || 'Driver assignment pending';
  const vehicleNumber = state.partner?.vehicleNumber || 'Vehicle number will appear after assignment';
  const routeMeta = `${state.goods.distanceKm.toFixed(1)} km · ${state.goods.type} · ${state.goods.weightKg} kg`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
  <meta name="theme-color" content="#6d28d9" />
  <meta name="robots" content="noindex,nofollow,noarchive" />
  <title>Live tracking ${escapeHtml(state.orderNo)}</title>
  <link rel="preconnect" href="https://unpkg.com" crossorigin />
  <link rel="preconnect" href="https://tile.openstreetmap.org" crossorigin />
  <link
    rel="stylesheet"
    href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
    integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
    crossorigin=""
    referrerpolicy="no-referrer"
  />
  <style>
    :root{
      color-scheme:light;
      --brand:#6d28d9;
      --brand-dark:#4c1d95;
      --brand-soft:#f3e8ff;
      --ink:#111827;
      --muted:#64748b;
      --line:#e2e8f0;
      --surface:#ffffff;
      --page:#f8fafc;
      --green:#10b981;
      --green-dark:#047857;
      --red:#ef4444;
      --amber:#f59e0b;
      --shadow:0 18px 50px rgba(15,23,42,.12);
    }
    *{box-sizing:border-box}
    html{min-height:100%;background:var(--page)}
    body{
      min-height:100%;
      margin:0;
      background:
        radial-gradient(circle at 8% -10%,rgba(124,58,237,.19),transparent 34rem),
        radial-gradient(circle at 100% 18%,rgba(16,185,129,.10),transparent 28rem),
        var(--page);
      color:var(--ink);
      font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
      -webkit-font-smoothing:antialiased;
    }
    button,a{font:inherit}
    button{touch-action:manipulation}
    .page{width:min(1120px,100%);margin:0 auto;padding:clamp(14px,2.5vw,28px)}
    .hero{
      position:relative;
      overflow:hidden;
      border-radius:24px;
      padding:clamp(18px,3vw,30px);
      color:#fff;
      background:linear-gradient(135deg,var(--brand-dark),var(--brand) 62%,#8b5cf6);
      box-shadow:var(--shadow);
    }
    .hero:before,.hero:after{
      content:"";
      position:absolute;
      border:1px solid rgba(255,255,255,.16);
      border-radius:999px;
      pointer-events:none;
    }
    .hero:before{width:260px;height:260px;right:-110px;top:-150px}
    .hero:after{width:180px;height:180px;right:80px;bottom:-150px}
    .brand-row,.order-row,.connection-row{position:relative;z-index:1;display:flex;align-items:center}
    .brand-row{justify-content:space-between;gap:14px}
    .brand{font-size:12px;font-weight:900;letter-spacing:.16em}
    .secure-chip{
      display:inline-flex;
      align-items:center;
      gap:7px;
      min-height:32px;
      padding:7px 11px;
      border:1px solid rgba(255,255,255,.22);
      border-radius:999px;
      background:rgba(255,255,255,.12);
      font-size:11px;
      font-weight:800;
      backdrop-filter:blur(12px);
    }
    .secure-chip svg{width:14px;height:14px;fill:currentColor}
    .order-row{justify-content:space-between;align-items:flex-end;gap:16px;margin-top:28px}
    .eyebrow{margin:0 0 5px;color:#ddd6fe;font-size:10px;font-weight:900;letter-spacing:.12em;text-transform:uppercase}
    h1{margin:0;font-size:clamp(27px,5vw,42px);line-height:1.05;letter-spacing:-.035em}
    .status-badge{
      flex:0 0 auto;
      display:inline-flex;
      align-items:center;
      justify-content:center;
      min-height:34px;
      padding:7px 12px;
      border-radius:999px;
      background:#fff;
      color:var(--brand-dark);
      font-size:12px;
      font-weight:900;
      text-align:center;
    }
    .connection-row{gap:8px;margin-top:14px;color:#ede9fe;font-size:12px;font-weight:700}
    .connection-dot{width:8px;height:8px;border-radius:50%;background:#86efac;box-shadow:0 0 0 5px rgba(134,239,172,.14)}
    .connection-dot.is-paused{background:#fbbf24;box-shadow:0 0 0 5px rgba(251,191,36,.14)}
    main{display:grid;gap:16px;margin-top:16px}
    .card{
      border:1px solid rgba(226,232,240,.9);
      border-radius:22px;
      background:rgba(255,255,255,.94);
      box-shadow:0 10px 30px rgba(15,23,42,.07);
    }
    .map-card{position:relative;overflow:hidden}
    .map-heading{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:12px;
      padding:15px 17px;
      border-bottom:1px solid var(--line);
      background:var(--surface);
    }
    .map-heading h2,.section-heading{margin:0;font-size:15px;line-height:1.25}
    .live-chip{
      display:inline-flex;
      align-items:center;
      gap:7px;
      min-height:30px;
      padding:6px 10px;
      border-radius:999px;
      background:#ecfdf5;
      color:var(--green-dark);
      font-size:11px;
      font-weight:900;
      white-space:nowrap;
    }
    .live-chip.is-stale{background:#fffbeb;color:#92400e}
    .live-chip.is-ended{background:#f1f5f9;color:#475569}
    .live-dot{width:7px;height:7px;border-radius:50%;background:currentColor;box-shadow:0 0 0 4px rgba(16,185,129,.14)}
    .map-wrap{position:relative;background:#e2e8f0}
    #map{width:100%;height:clamp(330px,54vh,620px);z-index:1}
    .map-loading{
      position:absolute;
      inset:0;
      z-index:3;
      display:flex;
      align-items:center;
      justify-content:center;
      padding:28px;
      background:linear-gradient(145deg,#ede9fe,#f8fafc);
      color:var(--muted);
      font-size:13px;
      font-weight:800;
      text-align:center;
    }
    .map-loading.is-hidden{display:none}
    .map-legend{
      position:absolute;
      z-index:500;
      left:12px;
      bottom:12px;
      display:flex;
      flex-wrap:wrap;
      gap:7px;
      max-width:calc(100% - 78px);
      padding:8px 10px;
      border:1px solid rgba(226,232,240,.88);
      border-radius:12px;
      background:rgba(255,255,255,.92);
      box-shadow:0 7px 22px rgba(15,23,42,.12);
      backdrop-filter:blur(10px);
      pointer-events:none;
    }
    .legend-item{display:inline-flex;align-items:center;gap:5px;color:#334155;font-size:10px;font-weight:800}
    .legend-dot{width:8px;height:8px;border-radius:50%}
    .legend-dot.pickup{background:var(--green)}
    .legend-dot.drop{background:var(--red)}
    .legend-dot.driver{background:var(--brand)}
    .recenter{
      position:absolute;
      z-index:500;
      right:12px;
      bottom:12px;
      width:48px;
      height:48px;
      border:1px solid rgba(226,232,240,.9);
      border-radius:15px;
      background:#fff;
      color:var(--brand);
      box-shadow:0 8px 24px rgba(15,23,42,.18);
      cursor:pointer;
    }
    .recenter:hover{background:var(--brand-soft)}
    .recenter:focus-visible,.route-link:focus-visible{outline:3px solid rgba(124,58,237,.34);outline-offset:2px}
    .recenter svg{width:22px;height:22px;fill:currentColor}
    .route-pin{
      display:flex;
      align-items:center;
      justify-content:center;
      width:32px;
      height:32px;
      border:3px solid #fff;
      border-radius:50% 50% 50% 10%;
      color:#fff;
      box-shadow:0 5px 14px rgba(15,23,42,.28);
      transform:rotate(-45deg);
    }
    .route-pin span{font-size:11px;font-weight:900;transform:rotate(45deg)}
    .route-pin--pickup{background:var(--green)}
    .route-pin--drop{background:var(--red)}
    .route-pin--stop{background:var(--amber)}
    .driver-icon-shell{position:relative;width:48px;height:48px}
    .driver-pulse{
      position:absolute;
      inset:3px;
      border-radius:50%;
      background:rgba(109,40,217,.24);
      animation:pulse 1.8s ease-out infinite;
    }
    .driver-pin{
      position:absolute;
      inset:8px;
      display:flex;
      align-items:center;
      justify-content:center;
      border:3px solid #fff;
      border-radius:50%;
      background:var(--brand);
      color:#fff;
      box-shadow:0 7px 18px rgba(76,29,149,.42);
    }
    .driver-arrow{display:flex;align-items:center;justify-content:center;transition:transform .3s ease}
    .driver-arrow svg{width:17px;height:17px;fill:currentColor}
    @keyframes pulse{0%{transform:scale(.65);opacity:.85}75%,100%{transform:scale(1.3);opacity:0}}
    .summary-grid{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(250px,.65fr);gap:16px}
    .route-card,.driver-card{padding:18px}
    .card-kicker{margin:0 0 5px;color:var(--brand);font-size:10px;font-weight:900;letter-spacing:.1em;text-transform:uppercase}
    .route-list{list-style:none;margin:16px 0 0;padding:0}
    .route-row{position:relative;display:flex;gap:12px;min-width:0;padding:0 0 18px}
    .route-row:not(:last-child):after{content:"";position:absolute;left:14px;top:31px;bottom:1px;width:2px;background:#ddd6fe}
    .route-row:last-child{padding-bottom:0}
    .route-badge{
      position:relative;
      z-index:1;
      flex:0 0 auto;
      display:flex;
      align-items:center;
      justify-content:center;
      width:30px;
      height:30px;
      border:3px solid #fff;
      border-radius:50%;
      color:#fff;
      box-shadow:0 0 0 1px rgba(226,232,240,.9);
      font-size:10px;
      font-weight:900;
    }
    .route-badge--pickup{background:var(--green)}
    .route-badge--drop{background:var(--red)}
    .route-badge--stop{background:var(--amber)}
    .route-copy{min-width:0;padding-top:1px}
    .route-copy strong{display:block;overflow-wrap:anywhere;font-size:13px;line-height:1.4}
    .route-copy small{display:block;margin-top:2px;color:var(--muted);font-size:10px;font-weight:700}
    .route-meta{margin:15px 0 0;padding-top:14px;border-top:1px solid var(--line);color:var(--muted);font-size:11px;font-weight:700;line-height:1.5}
    .driver-card{display:flex;flex-direction:column}
    .driver-status{
      display:flex;
      align-items:center;
      gap:12px;
      margin-top:14px;
      padding:13px;
      border-radius:16px;
      background:var(--brand-soft);
    }
    .driver-status-icon{
      flex:0 0 auto;
      display:flex;
      align-items:center;
      justify-content:center;
      width:42px;
      height:42px;
      border-radius:14px;
      background:var(--brand);
      color:#fff;
    }
    .driver-status-icon svg{width:21px;height:21px;fill:currentColor}
    .driver-status-copy{min-width:0}
    .driver-status-copy strong{display:block;font-size:13px}
    .driver-status-copy small{display:block;margin-top:3px;color:var(--muted);font-size:10px;font-weight:700;line-height:1.35}
    .driver-identity{margin-top:14px}
    .driver-name{margin:0;font-size:16px;font-weight:900;overflow-wrap:anywhere}
    .vehicle-number{margin:4px 0 0;color:var(--muted);font-size:11px;font-weight:700;overflow-wrap:anywhere}
    .eta-panel{
      margin-top:auto;
      padding-top:18px;
    }
    .eta-box{
      padding:13px;
      border:1px solid #ddd6fe;
      border-radius:15px;
      background:#faf5ff;
    }
    .eta-label{display:block;color:var(--muted);font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em}
    .eta-value{display:block;margin-top:4px;color:var(--brand-dark);font-size:18px;font-weight:900}
    .driver-coordinates{margin:10px 0 0;color:var(--muted);font-size:10px;font-weight:700;font-variant-numeric:tabular-nums}
    .route-link{
      display:none;
      align-items:center;
      justify-content:center;
      gap:7px;
      min-height:48px;
      margin-top:12px;
      padding:10px 14px;
      border-radius:14px;
      background:var(--brand);
      color:#fff;
      font-size:12px;
      font-weight:900;
      text-decoration:none;
    }
    .route-link.is-visible{display:flex}
    .route-link svg{width:16px;height:16px;fill:currentColor}
    .privacy-note{
      display:flex;
      align-items:flex-start;
      gap:10px;
      padding:14px 16px;
      color:var(--muted);
      font-size:11px;
      font-weight:650;
      line-height:1.55;
    }
    .privacy-note svg{flex:0 0 auto;width:17px;height:17px;margin-top:1px;fill:var(--brand)}
    footer{padding:18px 4px 8px;color:#94a3b8;font-size:10px;font-weight:700;text-align:center}
    .leaflet-container{font-family:inherit;background:#e2e8f0}
    .leaflet-control-attribution{font-size:9px!important}
    .leaflet-tooltip{border:0!important;border-radius:9px!important;box-shadow:0 5px 18px rgba(15,23,42,.16)!important;font-size:10px!important;font-weight:800!important}
    @media (max-width:760px){
      .page{padding:0 0 18px}
      .hero{border-radius:0 0 24px 24px;padding-top:max(18px,env(safe-area-inset-top))}
      main{padding:0 12px}
      .summary-grid{grid-template-columns:1fr}
      .driver-card{min-height:0}
      .eta-panel{margin-top:0}
    }
    @media (max-width:430px){
      .brand-row{align-items:flex-start}
      .secure-chip{max-width:52%;white-space:normal;text-align:center}
      .order-row{align-items:flex-start;flex-direction:column}
      .status-badge{align-self:flex-start}
      #map{height:clamp(310px,50vh,470px)}
      .map-heading{align-items:flex-start}
      .live-chip{max-width:48%;white-space:normal}
      .map-legend{max-width:calc(100% - 72px)}
      .privacy-note{padding:14px}
    }
    @media (max-height:620px) and (orientation:landscape){
      #map{height:max(280px,calc(100vh - 160px))}
      .page{width:min(1240px,100%)}
      .summary-grid{grid-template-columns:minmax(0,1.35fr) minmax(260px,.65fr)}
    }
    @media (prefers-reduced-motion:reduce){
      *{scroll-behavior:auto!important}
      .driver-pulse{animation:none}
      .driver-arrow{transition:none}
    }
  </style>
</head>
<body>
  <div class="page">
    <header class="hero">
      <div class="brand-row">
        <div class="brand">INDIERY LIVE TRACKING</div>
        <div class="secure-chip">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a5 5 0 0 0-5 5v2H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5Zm-3 7V7a3 3 0 1 1 6 0v2H9Zm3 4a2 2 0 0 1 1 3.73V19h-2v-2.27A2 2 0 0 1 12 13Z"/></svg>
          Secure shared link
        </div>
      </div>
      <div class="order-row">
        <div>
          <p class="eyebrow">Order</p>
          <h1 id="orderNo">${escapeHtml(state.orderNo)}</h1>
        </div>
        <span class="status-badge" id="statusBadge">${escapeHtml(state.statusLabel)}</span>
      </div>
      <div class="connection-row" aria-live="polite">
        <span class="connection-dot" id="connectionDot"></span>
        <span id="connectionText">Live updates connected</span>
      </div>
    </header>

    <main>
      <section class="card map-card" aria-labelledby="mapTitle">
        <div class="map-heading">
          <h2 id="mapTitle">Pickup, drop &amp; driver</h2>
          <span class="live-chip" id="liveChip">
            <span class="live-dot"></span>
            <span id="liveChipText">Connecting to driver GPS</span>
          </span>
        </div>
        <div class="map-wrap">
          <div id="map" role="application" aria-label="Live delivery map"></div>
          <div class="map-loading" id="mapLoading">Loading the live delivery map…</div>
          <div class="map-legend" aria-hidden="true">
            <span class="legend-item"><span class="legend-dot pickup"></span>Pickup</span>
            <span class="legend-item"><span class="legend-dot drop"></span>Drop</span>
            <span class="legend-item"><span class="legend-dot driver"></span>Driver</span>
          </div>
          <button class="recenter" id="recenterButton" type="button" aria-label="Recenter the full delivery route">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 2h2v2.06A8.001 8.001 0 0 1 19.94 11H22v2h-2.06A8.001 8.001 0 0 1 13 19.94V22h-2v-2.06A8.001 8.001 0 0 1 4.06 13H2v-2h2.06A8.001 8.001 0 0 1 11 4.06V2Zm1 4a6 6 0 1 0 0 12 6 6 0 0 0 0-12Zm0 3a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z"/></svg>
          </button>
        </div>
        <noscript><p class="privacy-note">JavaScript is required to display and update the live map.</p></noscript>
      </section>

      <section class="summary-grid" aria-label="Delivery details">
        <article class="card route-card">
          <p class="card-kicker">Delivery route</p>
          <h2 class="section-heading">Pickup to drop</h2>
          <ol class="route-list">${routeRows(state)}</ol>
          <p class="route-meta">${escapeHtml(routeMeta)}</p>
        </article>

        <article class="card driver-card">
          <p class="card-kicker">Driver location</p>
          <h2 class="section-heading" id="driverTitle">Live GPS</h2>
          <div class="driver-status">
            <span class="driver-status-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 11a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm14 0a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM9.7 5l1 2H15l2 4h-2.2l-1-2H10l-1.5 3.1A4.98 4.98 0 0 0 5 10c-.35 0-.69.04-1.02.1L6.3 5.5A1 1 0 0 1 7.2 5H9.7Zm7.8 0H20v2h-1.5l-1-2Z"/></svg>
            </span>
            <span class="driver-status-copy">
              <strong id="liveStatusText">Waiting for GPS</strong>
              <small id="liveStatusDetail">The marker appears as soon as the driver shares a location.</small>
            </span>
          </div>
          <div class="driver-identity">
            <p class="driver-name" id="partnerName">${escapeHtml(partnerName)}</p>
            <p class="vehicle-number" id="vehicleNumber">${escapeHtml(vehicleNumber)}</p>
          </div>
          <div class="eta-panel">
            <div class="eta-box">
              <span class="eta-label">Delivery timing</span>
              <strong class="eta-value" id="etaValue">Calculating…</strong>
            </div>
            <p class="driver-coordinates" id="driverCoordinates"></p>
            <a class="route-link" id="routeLink" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5Z"/></svg>
              Open route in Google Maps
            </a>
          </div>
        </article>
      </section>

      <section class="card privacy-note">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 4 5v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V5l-8-3Zm0 4a3 3 0 0 1 3 3v1h1v6H8v-6h1V9a3 3 0 0 1 3-3Zm0 2a1 1 0 0 0-1 1v1h2V9a1 1 0 0 0-1-1Z"/></svg>
        <span>This private link was shared by the sender. It shows only delivery tracking details—OTP, contact and payment information stay hidden. Driver location is removed when the trip ends.</span>
      </section>
    </main>
    <footer>Map data © OpenStreetMap contributors · Indiery shared tracking</footer>
  </div>

  <script id="tracking-state" type="application/json">${initialState}</script>
  <script
    nonce="${nonce}"
    src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
    integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
    crossorigin=""
    referrerpolicy="no-referrer"
  ></script>
  <script nonce="${nonce}">
    (function () {
      "use strict";

      var stateNode = document.getElementById("tracking-state");
      var state = JSON.parse(stateNode.textContent || "{}");
      var map = null;
      var routeLine = null;
      var routeMarkers = [];
      var driverMarker = null;
      var driverAnimationFrame = null;
      var pollTimer = null;
      var pollInFlight = false;
      var userMovedMap = false;
      var automaticMapMove = false;
      var serverClockOffsetMs = 0;

      function byId(id) {
        return document.getElementById(id);
      }

      function setText(id, value) {
        var element = byId(id);
        if (element) element.textContent = value || "";
      }

      function syncServerClock(serverTime) {
        var serverTimestamp = new Date(serverTime).getTime();
        if (Number.isFinite(serverTimestamp)) {
          serverClockOffsetMs = serverTimestamp - Date.now();
        }
      }

      function currentServerTime() {
        return Date.now() + serverClockOffsetMs;
      }

      function isCoordinate(point) {
        return Boolean(
          point &&
          typeof point.lat === "number" &&
          Number.isFinite(point.lat) &&
          point.lat >= -90 &&
          point.lat <= 90 &&
          typeof point.lng === "number" &&
          Number.isFinite(point.lng) &&
          point.lng >= -180 &&
          point.lng <= 180
        );
      }

      function routeCoordinates() {
        var path = Array.isArray(state.routePath) ? state.routePath.filter(isCoordinate) : [];
        if (path.length > 1) return path;
        return [state.pickup].concat(state.extraStops || [], [state.drop]).filter(isCoordinate);
      }

      function pickupCoordinate() {
        if (isCoordinate(state.pickup)) return state.pickup;
        var path = routeCoordinates();
        return path.length ? path[0] : null;
      }

      function dropCoordinate() {
        if (isCoordinate(state.drop)) return state.drop;
        var path = routeCoordinates();
        return path.length ? path[path.length - 1] : null;
      }

      function tooltipContent(label) {
        var content = document.createElement("span");
        content.textContent = label;
        return content;
      }

      function routeMarkerIcon(kind, text) {
        return window.L.divIcon({
          className: "",
          html: '<div class="route-pin route-pin--' + kind + '"><span>' + text + "</span></div>",
          iconSize: [32, 32],
          iconAnchor: [16, 29],
          tooltipAnchor: [0, -24]
        });
      }

      function driverMarkerIcon() {
        return window.L.divIcon({
          className: "",
          html:
            '<div class="driver-icon-shell">' +
              '<div class="driver-pulse"></div>' +
              '<div class="driver-pin">' +
                '<span class="driver-arrow">' +
                  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 5 21l7-4 7 4-7-19Z"></path></svg>' +
                "</span>" +
              "</div>" +
            "</div>",
          iconSize: [48, 48],
          iconAnchor: [24, 24],
          tooltipAnchor: [0, -24]
        });
      }

      function addRouteMarker(point, fallback, kind, text, label) {
        var coordinate = isCoordinate(point) ? point : fallback;
        if (!coordinate) return;
        var marker = window.L.marker([coordinate.lat, coordinate.lng], {
          icon: routeMarkerIcon(kind, text),
          keyboard: true,
          title: label,
          zIndexOffset: kind === "drop" ? 300 : 200
        }).addTo(map);
        marker.bindTooltip(tooltipContent(label), { direction: "top", offset: [0, -4] });
        routeMarkers.push(marker);
      }

      function beginAutomaticMapMove() {
        automaticMapMove = true;
        window.setTimeout(function () {
          automaticMapMove = false;
        }, 450);
      }

      function allVisibleCoordinates() {
        var coordinates = routeCoordinates().slice();
        var pickup = pickupCoordinate();
        var drop = dropCoordinate();
        if (pickup) coordinates.push(pickup);
        if (drop) coordinates.push(drop);
        if (isCoordinate(state.driverLocation)) coordinates.push(state.driverLocation);
        return coordinates;
      }

      function fitFullRoute() {
        if (!map) return;
        var coordinates = allVisibleCoordinates();
        if (!coordinates.length) return;
        beginAutomaticMapMove();
        userMovedMap = false;
        if (coordinates.length === 1) {
          map.setView([coordinates[0].lat, coordinates[0].lng], 15, { animate: true });
          return;
        }
        var bounds = window.L.latLngBounds(
          coordinates.map(function (point) {
            return [point.lat, point.lng];
          })
        );
        map.fitBounds(bounds, {
          paddingTopLeft: [46, 46],
          paddingBottomRight: [46, 72],
          maxZoom: 15,
          animate: true
        });
      }

      function showMapFallback(message) {
        var loading = byId("mapLoading");
        if (!loading) return;
        loading.textContent = message;
        loading.classList.remove("is-hidden");
        byId("recenterButton").hidden = true;
      }

      function initializeMap() {
        if (!window.L) {
          showMapFallback("The map could not load. Delivery details will continue updating below.");
          return;
        }

        var coordinates = allVisibleCoordinates();
        if (!coordinates.length) {
          showMapFallback("Pickup and drop coordinates are still syncing. The map will appear when location data is available.");
          return;
        }

        map = window.L.map("map", {
          zoomControl: false,
          attributionControl: true,
          preferCanvas: true
        });
        byId("recenterButton").hidden = false;
        map.setView([coordinates[0].lat, coordinates[0].lng], 13, { animate: false });
        window.L.control.zoom({ position: "topright" }).addTo(map);
        window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
        }).addTo(map);

        var path = routeCoordinates();
        if (path.length > 1) {
          routeLine = window.L.polyline(
            path.map(function (point) {
              return [point.lat, point.lng];
            }),
            {
              color: "#6d28d9",
              weight: 5,
              opacity: 0.85,
              lineCap: "round",
              lineJoin: "round"
            }
          ).addTo(map);
        }

        addRouteMarker(state.pickup, pickupCoordinate(), "pickup", "P", "Pickup: " + state.pickup.label);
        (state.extraStops || []).forEach(function (stop, index) {
          addRouteMarker(stop, null, "stop", String(index + 1), "Stop " + String(index + 1) + ": " + stop.label);
        });
        addRouteMarker(state.drop, dropCoordinate(), "drop", "D", "Drop: " + state.drop.label);

        map.on("dragstart zoomstart", function () {
          if (!automaticMapMove) userMovedMap = true;
        });
        byId("recenterButton").addEventListener("click", fitFullRoute);
        byId("mapLoading").classList.add("is-hidden");
        updateDriverMarker();
        window.setTimeout(function () {
          map.invalidateSize();
          fitFullRoute();
        }, 50);
      }

      function rotateDriverMarker() {
        if (!driverMarker) return;
        var element = driverMarker.getElement();
        if (!element) return;
        var arrow = element.querySelector(".driver-arrow");
        if (!arrow) return;
        var heading =
          state.driverLocation && typeof state.driverLocation.heading === "number"
            ? state.driverLocation.heading
            : 0;
        arrow.style.transform = "rotate(" + String(heading) + "deg)";
      }

      function animateDriverMarker(target) {
        if (!driverMarker) return;
        if (driverAnimationFrame) window.cancelAnimationFrame(driverAnimationFrame);
        var start = driverMarker.getLatLng();
        var startedAt = null;
        var duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 900;

        function step(timestamp) {
          if (startedAt === null) startedAt = timestamp;
          var progress = duration === 0 ? 1 : Math.min(1, (timestamp - startedAt) / duration);
          var eased = 1 - Math.pow(1 - progress, 3);
          driverMarker.setLatLng([
            start.lat + (target.lat - start.lat) * eased,
            start.lng + (target.lng - start.lng) * eased
          ]);
          if (progress < 1) {
            driverAnimationFrame = window.requestAnimationFrame(step);
          } else {
            driverAnimationFrame = null;
          }
        }

        driverAnimationFrame = window.requestAnimationFrame(step);
      }

      function updateDriverMarker() {
        if (!map) return;
        if (!isCoordinate(state.driverLocation)) {
          if (driverMarker) {
            map.removeLayer(driverMarker);
            driverMarker = null;
          }
          return;
        }

        var target = state.driverLocation;
        if (!driverMarker) {
          driverMarker = window.L.marker([target.lat, target.lng], {
            icon: driverMarkerIcon(),
            keyboard: true,
            title: "Live driver location",
            zIndexOffset: 1000
          }).addTo(map);
          driverMarker.bindTooltip(tooltipContent("Live driver location"), {
            direction: "top",
            offset: [0, -8]
          });
        } else {
          animateDriverMarker(target);
        }
        window.setTimeout(rotateDriverMarker, 0);

        if (!userMovedMap && !map.getBounds().pad(-0.15).contains([target.lat, target.lng])) {
          beginAutomaticMapMove();
          map.panInside([target.lat, target.lng], {
            paddingTopLeft: [64, 64],
            paddingBottomRight: [64, 82],
            animate: true
          });
        }
      }

      function formatAge(dateValue) {
        if (!dateValue) return "Update time unavailable";
        var timestamp = new Date(dateValue).getTime();
        if (!Number.isFinite(timestamp)) return "Update time unavailable";
        var seconds = Math.max(0, Math.round((currentServerTime() - timestamp) / 1000));
        if (seconds < 6) return "Updated just now";
        if (seconds < 60) return "Updated " + String(seconds) + " sec ago";
        var minutes = Math.floor(seconds / 60);
        if (minutes < 60) return "Updated " + String(minutes) + " min ago";
        return "Last GPS update " + new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      }

      function driverLocationAgeSeconds() {
        if (!state.driverLocation || !state.driverLocation.updatedAt) return Number.POSITIVE_INFINITY;
        var timestamp = new Date(state.driverLocation.updatedAt).getTime();
        if (!Number.isFinite(timestamp)) return Number.POSITIVE_INFINITY;
        return Math.max(0, (currentServerTime() - timestamp) / 1000);
      }

      function renderFreshness() {
        var chip = byId("liveChip");
        chip.classList.remove("is-stale", "is-ended");

        if (!state.active) {
          chip.classList.add("is-ended");
          setText("liveChipText", "Trip tracking ended");
          setText("liveStatusText", "Live tracking ended");
          setText("liveStatusDetail", "Driver location is no longer shared after the trip.");
          return;
        }

        if (!isCoordinate(state.driverLocation)) {
          chip.classList.add("is-stale");
          setText("liveChipText", "Waiting for driver GPS");
          setText("liveStatusText", "Waiting for GPS");
          setText(
            "liveStatusDetail",
            state.partner
              ? "The driver marker will appear after the next GPS update."
              : "A driver has not been assigned yet."
          );
          return;
        }

        var age = driverLocationAgeSeconds();
        if (age <= 45) {
          setText("liveChipText", "Driver location live");
          setText("liveStatusText", "Live GPS connected");
        } else {
          chip.classList.add("is-stale");
          setText("liveChipText", "GPS update delayed");
          setText("liveStatusText", "Last known location");
        }
        setText("liveStatusDetail", formatAge(state.driverLocation.updatedAt));
      }

      function renderEta() {
        if (!state.active) {
          setText(
            "etaValue",
            state.status === "delivered"
              ? "Delivered"
              : state.status === "cancelled"
                ? "Order cancelled"
                : "Tracking unavailable"
          );
          return;
        }
        if (!state.etaTargetAt) {
          if (state.status === "picked_up" || state.status === "in_transit") {
            setText("etaValue", "ETA syncing");
          } else {
            setText("etaValue", String(state.etaMinutes) + " min estimate");
          }
          return;
        }
        var target = new Date(state.etaTargetAt).getTime();
        var remaining = target - currentServerTime();
        if (!Number.isFinite(target)) {
          setText("etaValue", "ETA syncing");
        } else if (remaining <= 0) {
          setText("etaValue", "Running late");
        } else {
          setText("etaValue", String(Math.max(1, Math.ceil(remaining / 60000))) + " min remaining");
        }
      }

      function updateGoogleMapsLink() {
        var pickup = pickupCoordinate();
        var drop = dropCoordinate();
        var link = byId("routeLink");
        if (!pickup || !drop) {
          link.classList.remove("is-visible");
          link.removeAttribute("href");
          return;
        }
        var params = new URLSearchParams({
          api: "1",
          origin: String(pickup.lat) + "," + String(pickup.lng),
          destination: String(drop.lat) + "," + String(drop.lng),
          travelmode: "driving"
        });
        var stopCoordinates = (state.extraStops || []).filter(isCoordinate);
        if (stopCoordinates.length) {
          params.set(
            "waypoints",
            stopCoordinates.map(function (stop) {
              return String(stop.lat) + "," + String(stop.lng);
            }).join("|")
          );
        }
        link.href = "https://www.google.com/maps/dir/?" + params.toString();
        link.classList.add("is-visible");
      }

      function renderState() {
        setText("orderNo", state.orderNo);
        setText("statusBadge", state.statusLabel);
        setText("partnerName", state.partner && state.partner.name ? state.partner.name : "Driver assignment pending");
        setText(
          "vehicleNumber",
          state.partner && state.partner.vehicleNumber
            ? state.partner.vehicleNumber + " · " + state.vehicle.name
            : state.vehicle.name
        );
        setText(
          "driverCoordinates",
          isCoordinate(state.driverLocation)
            ? "GPS " + state.driverLocation.lat.toFixed(5) + ", " + state.driverLocation.lng.toFixed(5)
            : ""
        );
        renderFreshness();
        renderEta();
        updateGoogleMapsLink();
        if (!map && window.L && allVisibleCoordinates().length) {
          initializeMap();
        } else {
          updateDriverMarker();
        }
      }

      function setConnectionState(connected) {
        var dot = byId("connectionDot");
        dot.classList.toggle("is-paused", !connected);
        setText("connectionText", connected ? "Live updates connected" : "Updates paused — retrying");
      }

      function schedulePoll(delay) {
        if (pollTimer) window.clearTimeout(pollTimer);
        if (!state.active) return;
        pollTimer = window.setTimeout(poll, delay);
      }

      function poll() {
        if (pollInFlight || !state.active) return;
        if (document.hidden) {
          schedulePoll(6000);
          return;
        }
        pollInFlight = true;
        window.fetch(window.location.pathname.replace(/\\/$/, "") + "/data", {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
          credentials: "omit"
        })
          .then(function (response) {
            if (response.status === 404 || response.status === 410) {
              var expiredError = new Error("Tracking link expired");
              expiredError.stopPolling = true;
              throw expiredError;
            }
            if (!response.ok) throw new Error("Tracking update failed");
            return response.json();
          })
          .then(function (nextState) {
            var existingRoutePath = state.routePath;
            syncServerClock(nextState.serverTime);
            state = Object.assign({}, state, nextState);
            state.routePath = existingRoutePath;
            setConnectionState(true);
            renderState();
          })
          .catch(function (error) {
            if (error && error.stopPolling) {
              state.active = false;
              state.driverLocation = null;
              state.statusLabel = "Tracking unavailable";
              renderState();
              setConnectionState(false);
              setText("connectionText", "This tracking link has expired");
              return;
            }
            setConnectionState(false);
          })
          .finally(function () {
            pollInFlight = false;
            schedulePoll(6000);
          });
      }

      syncServerClock(state.serverTime);
      initializeMap();
      renderState();
      schedulePoll(6000);
      window.setInterval(function () {
        renderFreshness();
        renderEta();
      }, 1000);

      document.addEventListener("visibilitychange", function () {
        if (!document.hidden && state.active) {
          schedulePoll(50);
        }
      });
      window.addEventListener("online", function () {
        setConnectionState(true);
        schedulePoll(50);
      });
      window.addEventListener("offline", function () {
        setConnectionState(false);
      });
      window.addEventListener("resize", function () {
        if (map) {
          window.setTimeout(function () {
            map.invalidateSize();
          }, 80);
        }
      });
    })();
  </script>
</body>
</html>`;
}
