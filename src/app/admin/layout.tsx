
import PrivateRoute from '@/components/auth/PrivateRoute';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PrivateRoute adminOnly={true}>{children}</PrivateRoute>;
}
