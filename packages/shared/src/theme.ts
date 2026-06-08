export const colors = {
  customer: '#7C3AED',
  customerLight: '#EDE9FE',
  partner: '#059669',
  partnerLight: '#D1FAE5',
  ink: '#111827',
  muted: '#6B7280',
  faint: '#F3F4F6',
  line: '#E5E7EB',
  white: '#FFFFFF',
  green: '#10B981',
  red: '#DC2626',
  amber: '#F59E0B',
  blue: '#2563EB'
};

export const statusLabels: Record<string, string> = {
  searching: 'Searching',
  offered: 'Available',
  accepted: 'Accepted',
  arrived_pickup: 'At pickup',
  picked_up: 'Picked up',
  in_transit: 'In transit',
  delivered: 'Delivered',
  cancelled: 'Cancelled'
};

export function money(value: number) {
  return `INR ${Math.round(value).toLocaleString('en-IN')}`;
}

export function weight(value: number) {
  return value >= 1000 ? `${value / 1000} ton` : `${value} kg`;
}
