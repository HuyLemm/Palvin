export function formatAmountDigits(digits: string): string {
  const clean = digits.replace(/\D/g, '');
  if (!clean) return '';
  return Number(clean).toLocaleString('vi-VN');
}
