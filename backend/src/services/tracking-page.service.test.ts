import assert from 'node:assert/strict';
import test from 'node:test';
import { renderLiveTrackingPage, type PublicTrackingState, visibleSharedDeliveryOtp } from './tracking-page.service';

const baseState: PublicTrackingState = {
  orderNo: 'IND-123',
  status: 'in_transit',
  statusLabel: 'In transit',
  active: true,
  serverTime: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
  etaMinutes: 20,
  pickup: { label: 'Pickup' },
  extraStops: [],
  drop: { label: 'Drop' },
  senderName: '<Sender>',
  receiverName: 'Receiver & Co',
  deliveryOtp: '123456',
  vehicle: { name: 'Mini truck' },
  goods: { type: 'Parcel', weightKg: 2, distanceKm: 5 },
  partner: { name: 'Driver', vehicleNumber: 'UP 12 AB 1234' },
  driverLocation: null
};

test('shared delivery OTP is available only after pickup and before verification', () => {
  assert.equal(visibleSharedDeliveryOtp('accepted', false, '123456'), undefined);
  assert.equal(visibleSharedDeliveryOtp('picked_up', false, '123456'), '123456');
  assert.equal(visibleSharedDeliveryOtp('in_transit', false, '123456'), '123456');
  assert.equal(visibleSharedDeliveryOtp('in_transit', true, '123456'), undefined);
  assert.equal(visibleSharedDeliveryOtp('delivered', false, '123456'), undefined);
  assert.equal(visibleSharedDeliveryOtp('cancelled', false, '123456'), undefined);
});

test('shared tracking page shows delivery details without a Google Maps route link', () => {
  const html = renderLiveTrackingPage(baseState, 'test-nonce');
  assert.match(html, /Sent by/);
  assert.match(html, /&lt;Sender&gt;/);
  assert.match(html, /Receiver &amp; Co/);
  assert.match(html, /UP 12 AB 1234/);
  assert.match(html, /123456/);
  assert.doesNotMatch(html, /Open route in Google Maps|google\.com\/maps\/dir|routeLink/);
});
