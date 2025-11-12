
'use client';
import React, { useEffect, useState, useRef } from 'react';
import { useUser, useFirestore, useAuth, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdminProvider, useAdmin } from '@/context/AdminContext';
import { UserProfile } from '@/lib/types';
import { useDoc } from '@/firebase/firestore/use-doc';

function RefereeLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  const auth = useAuth();
  const { isAdmin, setIsAdmin } = useAdmin();
  const [status, setStatus] = useState<'loading' | 'pending' | 'approved'>('loading');

  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: profile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const sessionId = useRef<string | null>(null);
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isAuthLoading || isProfileLoading) {
      setStatus('loading');
      return;
    }

    if (!user) {
      router.push('/login');
      return;
    }

    // Now profile is loaded or is null
    if (profile?.approved) {
      setStatus('approved');
    } else {
      // If not approved via profile, check if they are an admin
      const adminDocRef = doc(firestore, 'admins', user.uid);
      getDoc(adminDocRef).then((adminDoc) => {
        if (adminDoc.exists()) {
          setIsAdmin(true);
          setStatus('approved');
        } else {
          setStatus('pending');
        }
      }).catch(() => {
        // If the check fails (e.g. permissions), they are definitely not admin
        setStatus('pending');
      });
    }
  }, [user, isAuthLoading, profile, isProfileLoading, firestore, router, setIsAdmin]);

  useEffect(() => {
    if (status === 'approved' && user && firestore) {
      if (!sessionId.current) {
        sessionId.current = Date.now().toString(36) + Math.random().toString(36).substring(2);
      }
      const userDocRef = doc(firestore, 'users', user.uid);

      const sendHeartbeat = async () => {
        try {
          await updateDoc(userDocRef, {
            activeSessionId: sessionId.current,
            sessionLastActive: Date.now(),
          });
        } catch (error) {
          console.error("Failed to send session heartbeat:", error);
          if (heartbeatInterval.current) clearInterval(heartbeatInterval.current);
        }
      };

      sendHeartbeat();
      heartbeatInterval.current = setInterval(sendHeartbeat, 10000);

      const cleanup = async () => {
        if (heartbeatInterval.current) clearInterval(heartbeatInterval.current);
        // Check if this tab was the active one before clearing the session
        try {
          const currentDoc = await getDoc(userDocRef);
          if (currentDoc.exists() && currentDoc.data().activeSessionId === sessionId.current) {
             await updateDoc(userDocRef, { activeSessionId: null, sessionLastActive: null });
          }
        } catch (e) {
            console.error("Could not clear session on unload", e);
        }
      };
      
      window.addEventListener('beforeunload', cleanup);
      
      return () => {
        cleanup();
        window.removeEventListener('beforeunload', cleanup);
      };
    }
  }, [status, user, firestore]);

  const handleLogout = async () => {
    if (user && firestore) {
       const userDocRef = doc(firestore, 'users', user.uid);
       await updateDoc(userDocRef, { activeSessionId: null, sessionLastActive: null });
    }
    if (auth) {
      await signOut(auth);
    }
    // router.push('/login') should be handled by the main useEffect detecting no user
  };

  if (status === 'loading') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Verificando acceso...</p>
      </div>
    );
  }

  if (status === 'pending') {
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
