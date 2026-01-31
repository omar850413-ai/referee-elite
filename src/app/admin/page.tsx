'use client';
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, doc, updateDoc } from 'firebase/firestore';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

type UserWithId = UserProfile & { id: string };

export default function AdminPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const usersRef = useMemoFirebase(
    () => collection(firestore, 'users'),
    [firestore]
  );
  const { data: users, isLoading: areUsersLoading } = useCollection<UserWithId>(usersRef);

  useEffect(() => {
    if (isUserLoading || isProfileLoading) return;
    if (!user) {
      router.push('/login');
    } else if (!userProfile?.isAdmin) {
      router.push('/');
    }
  }, [user, userProfile, isUserLoading, isProfileLoading, router]);

  const handleApproveUser = async (userId: string) => {
    const userDocRef = doc(firestore, 'users', userId);
    try {
      await updateDoc(userDocRef, { isApproved: true });
    } catch (error) {
      console.error('Error approving user:', error);
      alert('Hubo un error al aprobar el usuario.');
    }
  };
  
  if (isUserLoading || isProfileLoading || !userProfile?.isAdmin) {
    return (
       <div className="p-4 md:p-8 min-h-screen bg-slate-100">
        <Skeleton className="h-10 w-48 mb-4" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex justify-between items-center p-4 border rounded-lg">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-10 w-24" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 min-h-screen bg-slate-100">
       <Link href="/" className="text-primary hover:underline mb-4 inline-block">&larr; Volver a la App</Link>
      <Card>
        <CardHeader>
          <CardTitle>Panel de Control de Usuarios</CardTitle>
        </CardHeader>
        <CardContent>
          {areUsersLoading ? (
            <p>Cargando usuarios...</p>
          ) : (
            <div className="space-y-4">
              {users?.map((u) => (
                <div key={u.id} className="flex justify-between items-center p-4 border rounded-lg bg-white shadow-sm">
                  <div>
                    <p className="font-semibold">{u.email}</p>
                    {u.isApproved ? (
                      <Badge variant="default" className="bg-emerald-500">Aprobado</Badge>
                    ) : (
                      <Badge variant="secondary">Pendiente</Badge>
                    )}
                     {u.isAdmin && <Badge className="ml-2">Admin</Badge>}
                  </div>
                  {!u.isApproved && (
                    <Button onClick={() => handleApproveUser(u.id)}>Aprobar</Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
