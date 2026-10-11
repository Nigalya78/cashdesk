'use client';

import { formatRupees } from '@/lib/format';
import NumberInput from '@/components/ui/NumberInput';

export const DENOMINATIONS = [500, 200, 100, 50, 20, 10, 5, 2, 1] as const;
export type DenomValue = (typeof DENOMINATIONS)[number];

export interface DenomEntry {
  denomination: DenomValue;
  quantity: string; // kept as string for controlled input
}

export function initDenomEntries(): DenomEntry[] {
  return DENOMINATIONS.map((d) => ({ denomination: d, quantity: '' }));
}

export function computeCashTotal(entries: DenomEntry[]): number {
  return entries.reduce(
    (sum, e) => sum + (parseInt(e.quantity) || 0) * e.denomination,
    0
  );
}

interface Props {
  entries:   DenomEntry[];
  onChange:  (denomination: number, quantity: string) => void;
  cashTotal: number;
}

export default function DenominationGrid({ entries, onChange, cashTotal }: Props) {
  return (
    <div>
      {/* Column headers */}
      <div className="grid grid-cols-[56px_16px_72px_16px_1fr] gap-x-2 px-1 mb-1">
        <span className="text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Denom</span>
        <span />
        <span className="text-center text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Qty</span>
        <span />
        <span className="text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Amount</span>
      </div>

      {/* Rows */}
      <div className="space-y-1">
        {entries.map((entry) => {
          const qty       = parseInt(entry.quantity) || 0;
          const lineTotal = entry.denomination * qty;
          const hasValue  = qty > 0;

          return (
            <div
              key={entry.denomination}
              className={`grid grid-cols-[56px_16px_72px_16px_1fr] gap-x-2 items-center
                          px-1 py-1 rounded-lg transition-colors
                          ${hasValue ? 'bg-blue-50/60' : 'hover:bg-gray-50'}`}
            >
              {/* Denomination */}
              <span className={`text-right text-sm font-semibold tabular-nums
                                ${hasValue ? 'text-blue-700' : 'text-gray-600'}`}>
                ₹{entry.denomination}
              </span>

              {/* × */}
              <span className="text-center text-xs text-gray-300 select-none">×</span>

              {/* Quantity input */}
              <NumberInput
                min="0"
                value={entry.quantity}
                onChange={(e) =>
                  onChange(entry.denomination, e.target.value.replace(/[^0-9]/g, ''))
                }
                placeholder="0"
                className={`w-full border rounded-md px-2 py-2 text-center font-medium
                            transition-all duration-100
                            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                            ${hasValue
                              ? 'border-blue-300 bg-white text-blue-800'
                              : 'border-gray-200 bg-white text-gray-700'
                            }`}
                style={{ fontSize: '16px', minHeight: '44px' }}
              />

              {/* = */}
              <span className="text-center text-xs text-gray-300 select-none">=</span>

              {/* Line total */}
              <span className={`text-right text-sm font-semibold tabular-nums transition-colors
                                ${hasValue ? 'text-emerald-700' : 'text-gray-200'}`}>
                {hasValue ? formatRupees(lineTotal) : '—'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Cash total footer */}
      <div className={`flex items-center justify-between mt-3 pt-3 border-t-2
                       ${cashTotal > 0 ? 'border-blue-100' : 'border-gray-100'}`}>
        <span className="text-sm font-semibold text-gray-600">Cash Total</span>
        <span className={`text-lg font-bold tabular-nums transition-colors
                          ${cashTotal > 0 ? 'text-gray-900' : 'text-gray-300'}`}>
          {formatRupees(cashTotal)}
        </span>
      </div>
    </div>
  );
}
