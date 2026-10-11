import type { Metadata, Viewport } from 'next';
import { Toaster } from 'react-hot-toast';
import './globals.css';

export const metadata: Metadata = {
  title: 'CashDesk',
  description: 'Cashier Shift & Cash Management',
};

// This is what makes the app look correct on mobile browsers
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,   // prevent accidental zoom on input focus (iOS)
  userScalable: false,
  themeColor: '#ffffff',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3500,
            style: { fontSize: '13px', maxWidth: '92vw' },
          }}
        />
      </body>
    </html>
  );
}
