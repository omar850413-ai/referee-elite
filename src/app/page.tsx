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
  
  // Effect to prepare the match document reference
  useEffect(() => {
    if (!user || !firestore || !userProfile) return;

    // Use a predictable ID for the match document, tied to the user
    const ref = doc(firestore, 'matches', user.uid);

    getDoc(ref).then(docSnap => {
      if (!docSnap.exists()) {
        const advisorName = userProfile.email || '';
        // Document doesn't exist, create it with initial state
        const initialState: MatchState = {
            scores: { home: 0, away: 0 },
            fouls: { home: 0, away: 0 },
            teamNames: { home: 'LOCAL', away: 'VISITA' },
            events: [],
            matchInfo: { advisor: advisorName, league: '', round: '', place: '', date: '', referee: '', assistant1: '', assistant2: '', fourthOfficial: '', var: '', avar: '' },
            timer: { status: 'NOT_STARTED', startTime: 0, elapsedSeconds: 0, isRunning: false },
            penaltyShootout: { home: 0, away: 0, active: false },
        };
        // Use setDoc to create the new match document
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
        // Document already exists, just set the reference
        setMatchDocRef(ref);
      }
    });

  }, [user, firestore, userProfile]);

  // This combined effect handles all session state logic: auth, approval, token freshness, and multi-device logout.
  React.useEffect(() => {
    // Wait until we have all the necessary information
    if (isUserLoading || isProfileLoading) {
      return;
    }

    // 1. If no user is logged in, redirect to login page.
    if (!user) {
      router.push('/login');
      return;
    }

    const isSuperAdmin = user.email === 'omar850413@gmail.com';
    const isApproved = userProfile?.isApproved === true;

    // 2. Multi-device logout check. If session ID doesn't match, log this device out.
    const localSessionId = localStorage.getItem('sessionId');
    if (userProfile?.sessionId && localSessionId !== userProfile.sessionId) {
      console.warn('Stale session detected. Logging out from this device.');
      signOut(auth).then(() => {
        localStorage.removeItem('sessionId');
        localStorage.removeItem('matchSession'); // Also clear old match data
        router.push('/login');
      });
      return; // Stop further execution
    }

    // 3. Handle unapproved users.
    if (!isSuperAdmin && !isApproved) {
      // This covers both users with `isApproved: false` and users without a profile document yet.
      router.push('/pending-approval');
      return;
    }
    
    // 4. For approved users (or super admin), ensure their auth token is fresh.
    // This is crucial for security rules to recognize their approved status correctly.
    // It will attempt to refresh, but if it fails (e.g., offline), it will
    // proceed with the cached token, allowing offline startup.
    if ((isSuperAdmin || isApproved) && !hasTokenBeenRefreshed) {
      user.getIdToken(true).then(() => {
        console.log('Auth token has been refreshed to ensure up-to-date permissions.');
        setHasTokenBeenRefreshed(true); // Mark as refreshed for this app session.
      }).catch(error => {
        console.warn("Could not refresh token (likely offline). Proceeding with cached token.");
        // We still mark as "refreshed" to allow the app to proceed.
        // Firebase will use the cached user data which is sufficient for offline use.
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
  // A user is considered "ready" if they are the super admin, or if their profile is approved AND their token has been refreshed.
  const isReady = (isSuperAdmin || (userProfile?.isApproved ?? false)) && hasTokenBeenRefreshed;

  // Show loading skeleton if the user/profile is loading OR if they are not yet fully ready (e.g., token is refreshing) OR match doc not ready.
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

  // Once loading is complete and user is ready, render the actual match page.
  // We can be sure user and matchDocRef are non-null here because of the checks above.
  return <MatchPage user={user!} userProfile={userProfile} matchDocRef={matchDocRef!} />;
}
