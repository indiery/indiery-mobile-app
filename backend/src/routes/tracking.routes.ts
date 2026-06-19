import { Router } from 'express';
import { asyncRoute } from '../middleware/error';
import { Order } from '../models/Order';

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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatCountdown(targetAt: number) {
  const remaining = Math.max(0, targetAt - Date.now());
  const totalSeconds = Math.ceil(remaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function orderTimelineTime(order: { timeline?: Array<{ key?: string; at?: Date | string | null }> }, key: string) {
  const at = order.timeline?.find((item) => item.key === key)?.at;
  if (!at) return undefined;
  const time = new Date(at).getTime();
  return Number.isNaN(time) ? undefined : time;
}

trackingRouter.get(
  '/track/:orderNo',
  asyncRoute(async (req, res) => {
    const order = await Order.findOne({ orderNo: String(req.params.orderNo).toUpperCase() })
      .populate('vehicle')
      .populate('partner');

    if (!order) {
      return res.status(404).send(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Order not found</title></head><body><main style="font-family:Arial,sans-serif;padding:24px"><h1>Order not found</h1><p>Please check the tracking link.</p></main></body></html>`);
    }

    const vehicle = order.vehicle as unknown as { shortName?: string };
    const partner = order.partner as unknown as { name?: string; partnerProfile?: { vehicleNumber?: string } } | undefined;
    const delivered = ['delivered', 'cancelled'].includes(order.status);
    const timerCanStart = ['picked_up', 'in_transit'].includes(order.status);
    const pickedUpAt = orderTimelineTime(order, 'picked_up');
    const targetAt = pickedUpAt ? pickedUpAt + order.etaMinutes * 60_000 : undefined;
    const countdown = !delivered && timerCanStart && targetAt ? formatCountdown(targetAt) : '';
    const late = !delivered && timerCanStart && targetAt ? targetAt <= Date.now() : false;
    const timerHtml = delivered
      ? ''
      : !timerCanStart
        ? '<div class="timer waiting">Starts after pickup</div><div class="muted">Countdown will begin once the partner picks up the goods.</div>'
        : targetAt
          ? `<div class="timer">${late ? 'Running late' : escapeHtml(countdown)}</div><div class="muted">${late ? 'The estimated time has passed. Please stay available for delivery updates.' : 'Estimated time remaining after pickup'}</div>`
          : '<div class="timer waiting">Pickup time syncing</div><div class="muted">Countdown will appear after pickup is confirmed.</div>';

    res.send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta http-equiv="refresh" content="20" />
  <title>Track ${escapeHtml(order.orderNo)}</title>
  <style>
    body{font-family:Arial,sans-serif;margin:0;background:#f8fafc;color:#111827}
    main{max-width:520px;margin:0 auto;padding:24px 16px 36px}
    .card{background:#fff;border:1px solid #e5e7eb;border-radius:18px;padding:18px;margin-bottom:14px}
    .brand{color:#7c3aed;font-size:12px;font-weight:900;letter-spacing:.08em}
    h1{font-size:24px;margin:6px 0 4px}.muted{color:#6b7280;font-size:13px;line-height:1.45}
    .status{display:inline-block;background:#ede9fe;color:#7c3aed;border-radius:999px;padding:6px 10px;font-size:12px;font-weight:900}
    .timer{font-size:38px;font-weight:900;color:${late ? '#dc2626' : '#7c3aed'};margin:8px 0 0}.waiting{font-size:22px}
    .route{display:flex;gap:10px;padding:10px 0}.dot{width:11px;height:11px;border-radius:99px;background:#7c3aed;margin-top:4px}.green{background:#10b981}
    .label{font-weight:900}.footer{font-size:11px;color:#6b7280;text-align:center;margin-top:20px}
  </style>
</head>
<body>
  <main>
    <div class="card">
      <div class="brand">INDIERY TRACKING</div>
      <h1>${escapeHtml(order.orderNo)}</h1>
      <span class="status">${escapeHtml(statusLabels[order.status] || order.status)}</span>
      ${timerHtml}
    </div>
    <div class="card">
      <div class="route"><div class="dot"></div><div><div class="label">${escapeHtml(order.pickup.label)}</div><div class="muted">Pickup</div></div></div>
      <div class="route"><div class="dot green"></div><div><div class="label">${escapeHtml(order.drop.label)}</div><div class="muted">Drop</div></div></div>
      <p class="muted">${escapeHtml(vehicle?.shortName || 'Vehicle')} • ${escapeHtml(order.goodsType)} • ${order.weightKg} kg</p>
    </div>
    <div class="card">
      <div class="label">${partner?.name ? escapeHtml(partner.name) : 'Partner assignment pending'}</div>
      <div class="muted">${partner?.partnerProfile?.vehicleNumber ? escapeHtml(partner.partnerProfile.vehicleNumber) : 'This page refreshes automatically every 20 seconds.'}</div>
    </div>
    <div class="footer">Shared by the sender through Indiery. OTP and payment details are hidden.</div>
  </main>
</body>
</html>`);
  })
);
