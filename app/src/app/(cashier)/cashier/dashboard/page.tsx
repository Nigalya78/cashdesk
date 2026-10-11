import { redirect } from 'next/navigation';

// Dashboard → redirect straight to the shift page
export default function DashboardPage() {
  redirect('/cashier/shift');
}
