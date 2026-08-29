import type { CSSProperties } from 'react';
import { formatAmountDigits } from '../lib/amount';

export default function AmountInput({ value, onChange, placeholder, style }: {
  value: string;
  onChange: (digits: string) => void;
  placeholder?: string;
  style?: CSSProperties;
}) {
  return (
    <input
      className="input-field"
      type="text"
      inputMode="numeric"
      placeholder={placeholder}
      value={formatAmountDigits(value)}
      onChange={e => onChange(e.target.value.replace(/\D/g, ''))}
      style={style}
    />
  );
}
