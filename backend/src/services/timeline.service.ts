import type { OrderDocument } from '../models/Order';

type TimelineState = 'done' | 'active' | 'pending';

const baseTimeline = [
  ['created', 'Order placed', 'Customer booking confirmed'],
  ['assigned', 'Partner assigned', 'Waiting for partner confirmation'],
  ['arrived_pickup', 'Arrived at pickup', 'Partner is at pickup location'],
  ['picked_up', 'Picked up', 'Goods picked up with proof'],
  ['in_transit', 'In transit', 'Moving toward drop location'],
  ['delivered', 'Delivered', 'Delivery completed']
] as const;

export function createTimeline(status: string) {
  const activeKeyByStatus: Record<string, string> = {
    searching: 'assigned',
    offered: 'assigned',
    accepted: 'arrived_pickup',
    arrived_pickup: 'picked_up',
    picked_up: 'in_transit',
    in_transit: 'delivered',
    delivered: ''
  };

  const doneUntil: Record<string, number> = {
    searching: 0,
    offered: 0,
    accepted: 1,
    arrived_pickup: 2,
    picked_up: 3,
    in_transit: 4,
    delivered: 5,
    cancelled: 0
  };

  const doneIndex = doneUntil[status] ?? 0;
  const activeKey = activeKeyByStatus[status];

  return baseTimeline.map(([key, title, note], index) => {
    let state: TimelineState = 'pending';
    if (index <= doneIndex) state = 'done';
    if (key === activeKey) state = 'active';
    return {
      key,
      title,
      note,
      state,
      at: state === 'done' ? new Date() : undefined
    };
  });
}

export function setOrderStatusTimeline(order: OrderDocument, status: string) {
  order.set('status', status);
  order.set('timeline', createTimeline(status));
}
