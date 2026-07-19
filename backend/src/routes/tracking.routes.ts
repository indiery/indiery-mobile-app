import crypto from 'crypto';
import { Router } from 'express';
import { asyncRoute } from '../middleware/error';
import { Order, type OrderDocument } from '../models/Order';
import {
  renderLiveTrackingPage,
  trackingContentSecurityPolicy,
  type PublicTrackingState
} from '../services/tracking-page.service';
import { verifyTrackingToken } from '../services/tracking-link.service';

export const trackingRouter = Router();

const statusLabels: Record<string, string> = {
  searching: 'Searching',
  offered: 'Available',
  accepted: 'Accepted',
  arrived_pickup: 'At pickup',
  picked_up: 'Picked up',
  in_transit: 'In transit',
  delivered: 'Delivered',
  cancelled: 'Cancelled'
};

function orderTimelineTime(order: { timeline?: Array<{ key?: string; at?: Date | string | null }> }, key: string) {
  const at = order.timeline?.find((item) => item.key === key)?.at;
  if (!at) return undefined;
  const time = new Date(at).getTime();
  return Number.isNaN(time) ? undefined : time;
}

function validCoordinate(value: unknown, minimum: number, maximum: number) {
  return typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum
    ? value
    : undefined;
}

function publicPoint(point: {
  label: string;
  address: string;
  lat?: number | null;
  lng?: number | null;
}) {
  const lat = validCoordinate(point.lat, -90, 90);
  const lng = validCoordinate(point.lng, -180, 180);
  return {
    label: point.label,
    ...(lat !== undefined && lng !== undefined ? { lat, lng } : {})
  };
}

function publicTrackingState(order: OrderDocument, routePath?: PublicTrackingState['routePath']): PublicTrackingState {
  const vehicle = order.vehicle as unknown as { shortName?: string; name?: string };
  const partner = order.partner as unknown as {
    name?: string;
    partnerProfile?: { vehicleNumber?: string };
  } | undefined;
  const active = !['delivered', 'cancelled'].includes(order.status);
  const timerCanStart = ['picked_up', 'in_transit'].includes(order.status);
  const pickedUpAt = orderTimelineTime(order, 'picked_up');
  const targetAt = timerCanStart && pickedUpAt ? pickedUpAt + order.etaMinutes * 60_000 : undefined;
  const driverLat = active ? validCoordinate(order.partnerLocation?.lat, -90, 90) : undefined;
  const driverLng = active ? validCoordinate(order.partnerLocation?.lng, -180, 180) : undefined;
  const heading = validCoordinate(order.partnerLocation?.heading, 0, 360);

  return {
    orderNo: order.orderNo,
    status: order.status,
    statusLabel: statusLabels[order.status] || order.status,
    active,
    serverTime: new Date().toISOString(),
    updatedAt: new Date(order.updatedAt).toISOString(),
    etaMinutes: order.etaMinutes,
    etaTargetAt: targetAt ? new Date(targetAt).toISOString() : undefined,
    pickup: publicPoint(order.pickup),
    extraStops: (order.extraStops ?? []).map(publicPoint),
    drop: publicPoint(order.drop),
    routePath,
    vehicle: {
      name: vehicle?.shortName || vehicle?.name || 'Vehicle'
    },
    goods: {
      type: order.goodsType,
      weightKg: order.weightKg,
      distanceKm: order.distanceKm
    },
    partner: partner?.name
      ? {
          name: partner.name,
          vehicleNumber: partner.partnerProfile?.vehicleNumber || undefined
        }
      : undefined,
    driverLocation:
      driverLat !== undefined && driverLng !== undefined
        ? {
            lat: driverLat,
            lng: driverLng,
            heading,
            updatedAt: order.partnerLocation?.updatedAt
              ? new Date(order.partnerLocation.updatedAt).toISOString()
              : undefined
          }
        : null
  };
}

async function loadSharedTrackingOrder(token: string) {
  const claims = verifyTrackingToken(token);
  if (!claims) return undefined;
  const orderQuery =
    claims.orderId && claims.orderNo
      ? { _id: claims.orderId, orderNo: claims.orderNo }
      : claims.orderId
        ? { _id: claims.orderId }
        : { orderNo: claims.orderNo };
  const order = await Order.findOne(orderQuery)
    .select(
      'orderNo status pickup extraStops drop vehicle partner partnerLocation etaMinutes timeline goodsType weightKg distanceKm updatedAt'
    )
    .populate('vehicle', 'shortName name')
    .populate('partner', 'name partnerProfile.vehicleNumber');
  return order ?? undefined;
}

function routePathFor(order: OrderDocument): PublicTrackingState['routePath'] {
  return [order.pickup, ...(order.extraStops ?? []), order.drop]
    .map(publicPoint)
    .filter(
      (point): point is PublicTrackingState['pickup'] & { lat: number; lng: number } =>
        point.lat !== undefined && point.lng !== undefined
    )
    .map((point) => ({ lat: point.lat, lng: point.lng }));
}

trackingRouter.get(
  ['/t/:token/data', '/track/share/:token/data'],
  asyncRoute(async (req, res) => {
    const order = await loadSharedTrackingOrder(String(req.params.token));
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    if (!order) {
      return res.status(404).json({ message: 'Tracking link is invalid or has expired' });
    }
    return res.json(publicTrackingState(order));
  })
);

trackingRouter.get(
  ['/t/:token', '/track/share/:token'],
  asyncRoute(async (req, res) => {
    const order = await loadSharedTrackingOrder(String(req.params.token));
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    if (!order) {
      return res.status(404).send(
        '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tracking link unavailable</title></head><body><main style="max-width:520px;margin:64px auto;padding:24px;font-family:Arial,sans-serif"><h1>Tracking link unavailable</h1><p>This link is invalid or has expired. Ask the sender to share a new live-tracking link.</p></main></body></html>'
      );
    }

    const state = publicTrackingState(order, routePathFor(order));
    const nonce = crypto.randomBytes(18).toString('base64');
    res.setHeader('Content-Security-Policy', trackingContentSecurityPolicy(nonce));
    return res.send(renderLiveTrackingPage(state, nonce));
  })
);

trackingRouter.get('/track/:orderNo', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
  );
  return res.status(410).send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>New tracking link required</title>
  <style>
    body{font-family:Arial,sans-serif;margin:0;background:#f8fafc;color:#111827}
    main{max-width:520px;margin:64px auto;padding:24px}
    .card{background:#fff;border:1px solid #e5e7eb;border-radius:18px;padding:22px}
    .brand{color:#7c3aed;font-size:12px;font-weight:900;letter-spacing:.08em}
    h1{font-size:24px;margin:8px 0}.muted{color:#6b7280;font-size:14px;line-height:1.5}
  </style>
</head>
<body>
  <main>
    <div class="card">
      <div class="brand">INDIERY TRACKING</div>
      <h1>New tracking link required</h1>
      <p class="muted">For privacy, older order-number links no longer show delivery details. Ask the sender to tap Share again and send the new secure live-tracking link.</p>
    </div>
  </main>
</body>
</html>`);
});
