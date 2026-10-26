export function normalizePhone(phoneInput: string) {
  const phone = phoneInput.trim().replace(/[^\d+]/g, '');
  if (phone.startsWith('+91')) return phone.slice(3);
  if (phone.startsWith('91') && phone.length === 12) return phone.slice(2);
  return phone.replace(/^\+/, '');
}
