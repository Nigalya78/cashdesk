import { ReactNode } from 'react';

interface Props {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export default function EmptyState({ icon, title, subtitle, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-2 px-4">
      {icon && (
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-1">
          {icon}
        </div>
      )}
      <p className="text-sm font-medium text-gray-600">{title}</p>
      {subtitle && <p className="text-xs text-gray-400 max-w-xs">{subtitle}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
