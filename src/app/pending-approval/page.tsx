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
    const handleApproval = async () => {
      if (isUserLoading || isProfileLoading) {
        return;
      }
      
      if (!user) {
        router.push('/login');
        return;
      }

      const isSuperAdmin = user.email === 'omar850413@gmail.com';
      if ((userProfile && userProfile.isApproved) || isSuperAdmin) {
        console.log('User approved. Forcing token refresh before redirecting...');
        try {
          // Force a refresh of the user's ID token.
          // This ensures the security rules will see the updated user status.
          await user.getIdToken(true);
          console.log('Token refreshed successfully.');
          router.push('/');
        } catch (error) {
          console.error("Error refreshing token:", error);
          // Still redirect, but log the error. The user might need to
          // manually log out and back in if permissions issues persist.
          router.push('/');
        }
      }
    };
    
    handleApproval();
  }, [user, userProfile, isUserLoading, isProfileLoading, router]);

  const handleLogout = async () => {
    localStorage.removeItem('sessionId');
    localStorage.removeItem('matchSession');
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
