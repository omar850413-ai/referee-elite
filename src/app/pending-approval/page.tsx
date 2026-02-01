'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { doc } from 'firebase/firestore';

import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function PendingApprovalPage() {
  const auth = useAuth();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  useEffect(() => {
    // Don't do anything while auth or profile data is loading
    if (isUserLoading || isProfileLoading) {
      return;
    }
    
    // If there's no user, send to login
    if (!user) {
      router.push('/login');
      return;
    }

    // If the user profile exists and is approved, or if the user is the super admin, navigate to home.
    const isSuperAdmin = user.email === 'omar850413@gmail.com';
    if (userProfile?.isApproved || isSuperAdmin) {
      router.push('/');
    }
  }, [user, userProfile, isUserLoading, isProfileLoading, router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-sky-100">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle>Cuenta Pendiente de Aprobación</CardTitle>
          <CardDescription className="pt-2">
            Tu cuenta ha sido registrada correctamente. Un administrador revisará tu solicitud y la aprobará pronto.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            {isUserLoading || isProfileLoading 
              ? 'Verificando estado de aprobación...' 
              : 'Por favor, espera a recibir la confirmación. Si tienes alguna duda, contacta al administrador.'}
          </p>
          <Button onClick={handleLogout} variant="outline">
            Cerrar Sesión
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
