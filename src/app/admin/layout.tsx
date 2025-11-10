
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Loader, ShieldX } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (!isAdmin) {
        router.push('/referee');
      }
    }
  }, [user, loading, isAdmin, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
     return (
      <div className="flex h-screen flex-col items-center justify-center text-center">
        <ShieldX className="h-16 w-16 text-destructive" />
        <h1 className="mt-4 text-2xl font-bold">Acceso Denegado</h1>
        <p className="mt-2 text-muted-foreground">No tienes permisos para acceder a esta página.</p>
      </div>
    );
  }

  return <>{children}</>;
}
