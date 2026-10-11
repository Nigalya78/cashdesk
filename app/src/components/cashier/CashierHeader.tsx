'use client';

import { useRouter } from 'next/navigation';
import { getStoredUser } from '@/lib/auth';
import { IconArrowLeft } from '@/components/ui/Icon';

interface Props {
  title?: string;
  showBack?: boolean;
  backHref?: string; // explicit destination for back button; falls back to router.back()
}

export default function CashierHeader({ title, showBack = false, backHref }: Props) {
  const router = useRouter();
  const user   = getStoredUser();

  function handleBack() {
    if (backHref) router.push(backHref);
    else router.back();
  }

  return (
    <header className="bg-white border-b border-gray-200 px-4
                       flex items-center justify-between
                       sticky top-0 z-20 flex-shrink-0"
            style={{ minHeight: '56px', paddingTop: 'env(safe-area-inset-top)' }}>

      {/* Left — back + title */}
      <div className="flex items-center gap-2 min-w-0">
        {showBack && (
          <button
            onClick={handleBack}
            aria-label="Go back"
            className="w-7 h-7 flex items-center justify-center rounded-md
                       text-gray-400 hover:text-gray-700 hover:bg-gray-100
                       transition-colors flex-shrink-0"
          >
            <IconArrowLeft size={14} />
          </button>
        )}

        {title ? (
          <span className="font-semibold text-[14px] text-gray-900 truncate">{title}</span>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-xs leading-none">₹</span>
            </div>
            <span className="font-semibold text-[14px] text-gray-900">CashDesk</span>
          </div>
        )}
      </div>

      {/* Right — user name only */}
      {user && (
        <span className="text-xs text-gray-400 truncate max-w-[120px]">{user.name}</span>
      )}
    </header>
  );
}
