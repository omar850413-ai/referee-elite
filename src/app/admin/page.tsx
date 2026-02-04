'use client';
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signOut } from 'firebase/auth';
import { collection, doc, updateDoc } from 'firebase/firestore';
import { useAuth, useUser, useFirestore, useDoc, useCollection, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

type UserWithId = UserProfile & { id: string };

export default function AdminPage() {
  const router = useRouter();
  const auth = useAuth();
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
      return;
    }
    
    const isSuperAdmin = user.email === 'omar850413@gmail.com';
    const hasAdminRights = userProfile?.isAdmin || isSuperAdmin;

    if (!hasAdminRights) {
      router.push('/');
    }
  }, [user, userProfile, isUserLoading, isProfileLoading, router]);

  const handleApproveUser = (userId: string) => {
    const userDocRef = doc(firestore, 'users', userId);
    const updateData = { isApproved: true };
    updateDoc(userDocRef, updateData)
      .catch((error) => {
        const permissionError = new FirestorePermissionError({
          path: userDocRef.path,
          operation: 'update',
          requestResourceData: updateData,
        });
        errorEmitter.emit('permission-error', permissionError);
        alert('Hubo un error al aprobar el usuario.');
      });
  };

  const handleBlockUser = (userId: string) => {
    const userDocRef = doc(firestore, 'users', userId);
    const updateData = { isApproved: false };
    updateDoc(userDocRef, updateData)
      .catch((error) => {
        const permissionError = new FirestorePermissionError({
          path: userDocRef.path,
          operation: 'update',
          requestResourceData: updateData,
        });
        errorEmitter.emit('permission-error', permissionError);
        alert('Hubo un error al bloquear el usuario.');
      });
  };
  
  const handleLogout = async () => {
    localStorage.removeItem('sessionId');
    await signOut(auth);
    router.push('/login');
  };
  
  const isSuperAdmin = user?.email === 'omar850413@gmail.com';
  const hasAdminRights = userProfile?.isAdmin || isSuperAdmin;

  if (isUserLoading || isProfileLoading || !hasAdminRights) {
    return (
       <div className="p-4 md:p-8 min-h-screen bg-sky-100">
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
    <div className="p-4 md:p-8 min-h-screen bg-sky-100">
       <div className="flex justify-between items-center mb-4">
        <Link href="/" className="text-primary hover:underline">&larr; Volver a la App</Link>
        <Button onClick={handleLogout} variant="outline" size="sm">Cerrar Sesión</Button>
       </div>
      <Card>
        <CardHeader>
          <CardTitle>Panel de Control de Usuarios</CardTitle>
        </CardHeader>
        <CardContent>
          {areUsersLoading ? (
            <p>Cargando usuarios...</p>
          ) : (
            <div className="space-y-4">
              {users?.map((u) => {
                const canManage = user && u.id !== user.uid && u.email !== 'omar850413@gmail.com';
                const isTargetSuperAdmin = u.email === 'omar850413@gmail.com';

                return (
                  <div key={u.id} className="flex justify-between items-center p-4 border rounded-lg bg-white shadow-sm">
                    <div className='flex items-center gap-2'>
                      <p className="font-semibold">{u.email}</p>
                      {u.isApproved ? (
                        <Badge variant="default" className="bg-emerald-500">Aprobado</Badge>
                      ) : (
                        <Badge variant="destructive">No Aprobado</Badge>
                      )}
                      {u.isAdmin && !isTargetSuperAdmin && <Badge className="ml-2">Admin</Badge>}
                      {isTargetSuperAdmin && <Badge className="ml-2 bg-amber-500 text-white">Super Admin</Badge>}
                    </div>
                    {canManage && (
                       <div>
                        {u.isApproved ? (
                          <Button variant="destructive" size="sm" onClick={() => handleBlockUser(u.id)}>Bloquear</Button>
                        ) : (
                          <Button size="sm" onClick={() => handleApproveUser(u.id)}>Aprobar</Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
