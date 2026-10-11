import { redirect } from 'next/navigation';

// Root → middleware handles auth, redirect to login as default
export default function RootPage() {
  redirect('/login');
}
