// Parses VietQR / Napas banking QR codes, which follow the EMVCo Merchant
// Presented Mode QR Code spec: a flat string of TLV (tag-length-value)
// fields, some of which (merchant account info, additional data) are
// themselves TLV-encoded strings nested one level deep. Only the handful of
// fields useful for prefilling an expense are extracted — this is not a
// full EMVCo/VietQR validator (no CRC check, no bank-BIN-to-name lookup).
//
// Reference fields (top-level tags):
//   54 = transaction amount (present only on a "dynamic" QR with a fixed
//        amount already set — a "static" QR, where the payer types the
//        amount in their banking app, omits this)
//   59 = beneficiary/merchant name
//   62 = additional data template (nested; 08 = purpose of transaction /
//        transfer message — the line people usually put a note in)
//   38 = merchant account info (nested; VietQR's beneficiary bank + account)

function parseTLV(data: string): Record<string, string> {
  const result: Record<string, string> = {};
  let i = 0;
  while (i + 4 <= data.length) {
    const tag = data.slice(i, i + 2);
    const len = parseInt(data.slice(i + 2, i + 4), 10);
    if (isNaN(len) || i + 4 + len > data.length) break;
    result[tag] = data.slice(i + 4, i + 4 + len);
    i += 4 + len;
  }
  return result;
}

export interface VietQRInfo {
  amount?: number;
  note?: string;
  beneficiaryName?: string;
  bankBin?: string;
  accountNumber?: string;
}

// Returns null if `raw` doesn't look like an EMVCo QR payload at all (e.g.
// it's some other kind of QR code entirely), so callers can tell "not a
// payment QR" apart from "a payment QR with nothing useful in it".
export function parseVietQR(raw: string): VietQRInfo | null {
  if (!raw) return null;
  const top = parseTLV(raw);
  if (!top['00'] || !top['38']) return null;

  const info: VietQRInfo = {};

  if (top['54']) {
    const n = parseFloat(top['54']);
    if (!isNaN(n) && n > 0) info.amount = n;
  }
  if (top['59']) info.beneficiaryName = top['59'].trim();

  if (top['62']) {
    const additional = parseTLV(top['62']);
    if (additional['08']) info.note = additional['08'].trim();
  }

  const merchant = parseTLV(top['38']);
  if (merchant['01']) {
    const beneficiary = parseTLV(merchant['01']);
    if (beneficiary['00']) info.bankBin = beneficiary['00'];
    if (beneficiary['01']) info.accountNumber = beneficiary['01'];
  }

  return info;
}
