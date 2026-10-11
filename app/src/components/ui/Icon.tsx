/**
 * Minimal SVG icon set — Feather-style, 1.75px stroke, 24×24 viewBox.
 * Pass `size` (default 16) and `className` for colour/spacing overrides.
 */
interface P { size?: number; className?: string }

const svg = (children: React.ReactNode, { size = 16, className = '' }: P) => (
  <svg
    width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor"
    strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
    className={`shrink-0 ${className}`}
  >{children}</svg>
);

export const IconDashboard    = (p: P) => svg(<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>, p);
export const IconUsers        = (p: P) => svg(<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>, p);
export const IconClock        = (p: P) => svg(<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>, p);
export const IconCreditCard   = (p: P) => svg(<><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></>, p);
export const IconBarChart     = (p: P) => svg(<><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></>, p);
export const IconLogOut       = (p: P) => svg(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>, p);
export const IconArrowLeft    = (p: P) => svg(<><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></>, p);
export const IconTrendingUp   = (p: P) => svg(<><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>, p);
export const IconTrendingDown = (p: P) => svg(<><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></>, p);
export const IconWallet       = (p: P) => svg(<><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 7v13a2 2 0 0 0 2 2h16v-5"/><path d="M18 12h3v4h-3a2 2 0 0 1 0-4z"/></>, p);
export const IconCheck        = (p: P) => svg(<><polyline points="20 6 9 17 4 12"/></>, p);
export const IconAlertTriangle= (p: P) => svg(<><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>, p);
export const IconPlus         = (p: P) => svg(<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>, p);
export const IconChevronDown  = (p: P) => svg(<><polyline points="6 9 12 15 18 9"/></>, p);
export const IconChevronUp    = (p: P) => svg(<><polyline points="18 15 12 9 6 15"/></>, p);
export const IconChevronRight = (p: P) => svg(<><polyline points="9 18 15 12 9 6"/></>, p);
export const IconEdit         = (p: P) => svg(<><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>, p);
export const IconCalendar     = (p: P) => svg(<><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>, p);
export const IconFilter       = (p: P) => svg(<><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></>, p);
export const IconActivity     = (p: P) => svg(<><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></>, p);
