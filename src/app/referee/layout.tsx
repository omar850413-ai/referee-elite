'use client';
import React, { useEffect, useMemo } from 'react';
import { useUser, useFirestore, useAuth, useDoc, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { doc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdminProvider, useAdmin } from '@/context/AdminContext';
import { UserProfile } from '@/lib/types';


function RefereeLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  const auth = useAuth();
  const { setIsAdmin } = useAdmin();

  // Step 1: Create memoized document references
  const userProfileRef = useMemoFirebase(() => 
    user && firestore ? doc(firestore, 'users', user.uid) : null,
  [user, firestore]);

  const adminDocRef = useMemoFirebase(() =>
    user && firestore ? doc(firestore, 'admins', user.uid) : null,
  [user, firestore]);

  // Step 2: Use the real-time hooks
  const { data: profile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
  const { data: adminDoc, isLoading: isAdminLoading } = useDoc(adminDocRef);

  // Step 3: Update admin context whenever admin status changes
  useEffect(() => {
    setIsAdmin(!!adminDoc);
  }, [adminDoc, setIsAdmin]);

  const handleLogout = () => {
    if (auth) {
      signOut(auth).then(() => {
        router.push('/login');
      });
    } else {
      router.push('/login');
    }
  };

  // Centralized loading state
  const isLoading = isAuthLoading || isProfileLoading || isAdminLoading;

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Verificando acceso...</p>
      </div>
    );
  }
  
  // After all loading is done, check auth status
  if (!user) {
    router.push('/login');
    return ( // Return loader while redirecting
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  // User is authenticated, now check for approval
  const isApproved = profile?.approved;
  const isAdmin = !!adminDoc;

  if (!isAdmin && !isApproved) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background p-8 text-center">
        <h1 className="text-3xl font-bold text-primary-dark mb-4">
          Pendiente de Aprobación
        </h1>
        <p className="max-w-md text-muted-foreground mb-8">
          Tu cuenta ha sido registrada, pero un administrador necesita aprobarla. Por favor, contacta al administrador y vuelve a iniciar sesión después de ser aprobado.
        </p>
        <Button onClick={handleLogout}>
          Volver a Inicio de Sesión
        </Button>
      </div>
    );
  }
  
  // If we reach here, the user is either an admin or is an approved user.
  return <>{children}</>;
}


export default function RefereeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
    return (
        <AdminProvider>
            <RefereeLayoutContent>{children}</RefereeLayoutContent>
        </AdminProvider>
    )
}
