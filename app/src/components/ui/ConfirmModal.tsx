'use client';

import { IconAlertTriangle } from '@/components/ui/Icon';

interface Props {
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Simple inline confirmation modal — no browser confirm() dialog.
 * Renders as a fixed overlay. Parent controls visibility via state.
 */
export default function ConfirmModal({
  message,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0"
         style={{ background: 'rgba(0,0,0,0.45)' }}
         onClick={onCancel}>
      <div
        className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon + message */}
        <div className="flex items-start gap-3 mb-5">
          <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <IconAlertTriangle size={16} className="text-red-500" />
          </div>
          <p className="text-sm text-gray-700 leading-relaxed pt-1">{message}</p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-700
                       bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-white
                       bg-red-600 hover:bg-red-700 active:bg-red-800 transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
