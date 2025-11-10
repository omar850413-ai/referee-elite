
import PrivateRoute from '@/components/auth/PrivateRoute';

export default function RefereeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PrivateRoute>{children}</PrivateRoute>;
}
