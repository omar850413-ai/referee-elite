'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { doc } from 'firebase/firestore';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Logo } from '@/components/ui/Logo';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import MatchPage from '@/components/MatchPage';

export default function Home() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
  
  React.useEffect(() => {
    if (isUserLoading || isProfileLoading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    const isSuperAdmin = user.email === 'omar850413@gmail.com';

    // Redirect to pending approval ONLY if we have a profile and it's explicitly not approved.
    if (!isSuperAdmin && userProfile && !userProfile.isApproved) {
      router.push('/pending-approval');
      return;
    }
    
    // Also handle the case where a non-admin user somehow has no profile doc at all
    if (!isSuperAdmin && !userProfile) {
       router.push('/pending-approval');
    }
  }, [user, userProfile, isUserLoading, isProfileLoading, router]);

  const isSuperAdmin = user?.email === 'omar850413@gmail.com';
  // A user is considered "ready" if they are the super admin, or if their profile has loaded and is approved.
  const isReady = isSuperAdmin || (userProfile?.isApproved ?? false);
  
  // Show loading skeleton if user/profile is loading OR if they are not yet approved/ready.
  if (isUserLoading || isProfileLoading || !isReady) {
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

  // Once loading is complete and user is approved, render the actual match page.
  // We can be sure user is non-null here because of the earlier check.
  return <MatchPage user={user!} userProfile={userProfile} />;
}
