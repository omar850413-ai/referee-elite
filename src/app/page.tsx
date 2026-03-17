'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, setDoc, DocumentReference } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useUser, useFirestore, useDoc, useMemoFirebase, useAuth, errorEmitter, FirestorePermissionError } from '@/firebase';
import { UserProfile, MatchState } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Logo } from '@/components/ui/Logo';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import MatchPage from '@/components/MatchPage';

export default function Home() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();

  const [hasTokenBeenRefreshed, setHasTokenBeenRefreshed] = useState(false);
  const [matchDocRef, setMatchDocRef] = useState<DocumentReference | null>(null);

  const userProfileRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
  
  useEffect(() => {
    if (!user || !firestore || matchDocRef || isProfileLoading) return;

    const isSuperAdmin = user.email === 'omar850413@gmail.com';
    const isApproved = userProfile?.isApproved === true;

    if (!isSuperAdmin && !isApproved) return;

    const ref = doc(firestore, 'matches', user.uid);

    getDoc(ref).then(docSnap => {
      if (!docSnap.exists()) {
        const advisorName = user.email || '';
        const initialState: MatchState = {
            scores: { home: 0, away: 0 },
            fouls: { home: 0, away: 0 },
            teamNames: { home: 'LOCAL', away: 'VISITA' },
            events: [],
            matchInfo: { advisor: advisorName, league: '', round: '', place: '', date: '', referee: '', assistant1: '', assistant2: '', fourthOfficial: '', var: '', avar: '' },
            timer: { status: 'NOT_STARTED', startTime: 0, elapsedSeconds: 0, isRunning: false },
            penaltyShootout: { home: 0, away: 0, active: false },
            reportSettings: { showFouls: false },
        };
        setDoc(ref, initialState).then(() => {
          setMatchDocRef(ref);
        }).catch(err => {
            const permissionError = new FirestorePermissionError({
              path: ref.path,
              operation: 'create',
              requestResourceData: initialState,
            });
            errorEmitter.emit('permission-error', permissionError);
        });
      } else {
        setMatchDocRef(ref);
      }
    }).catch(err => {
        const permissionError = new FirestorePermissionError({
          path: ref.path,
          operation: 'get',
        });
        errorEmitter.emit('permission-error', permissionError);
    });

  }, [user, firestore, matchDocRef, userProfile, isProfileLoading]);

  React.useEffect(() => {
    if (isUserLoading || isProfileLoading) {
      return;
    }

    if (!user) {
      router.push('/login');
      return;
    }

    const isSuperAdmin = user.email === 'omar850413@gmail.com';
    const isApproved = userProfile?.isApproved === true;

    const localSessionId = localStorage.getItem('sessionId');
    if (userProfile?.sessionId && localSessionId !== userProfile.sessionId) {
      signOut(auth).then(() => {
        localStorage.removeItem('sessionId');
        localStorage.removeItem('matchSession');
        router.push('/login');
      });
      return;
    }

    if (!isSuperAdmin && !isApproved) {
      router.push('/pending-approval');
      return;
    }
    
    if ((isSuperAdmin || isApproved) && !hasTokenBeenRefreshed) {
      user.getIdToken(true).then(() => {
        setHasTokenBeenRefreshed(true);
      }).catch(error => {
        setHasTokenBeenRefreshed(true);
      });
    }
  }, [
    user, 
    userProfile, 
    isUserLoading, 
    isProfileLoading, 
    hasTokenBeenRefreshed, 
    auth, 
    router
  ]);

  const isSuperAdmin = user?.email === 'omar850413@gmail.com';
  const isReady = (isSuperAdmin || (userProfile?.isApproved ?? false)) && hasTokenBeenRefreshed;

  if (isUserLoading || isProfileLoading || !isReady || !matchDocRef) {
    return (
      <div className="p-4 bg-sky-100 min-h-screen flex items-center justify-center">
        <div className="max-w-md mx-auto space-y-4 w-full">
          <div className="flex items-center justify-center gap-3 border-b-4 border-primary/50 pb-2">
             <Logo />
          </div>
          <Card>
            <CardHeader>
              <Skeleton className="h-16 w-full mb-2" />
              <Skeleton className="h-10 w-full" />
            </CardHeader>
            <CardContent className="p-6 flex flex-col gap-6">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-20 mx-auto" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-20 mx-auto" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return <MatchPage user={user!} userProfile={userProfile} matchDocRef={matchDocRef!} />;
}
