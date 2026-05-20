
'use client';
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signOut } from 'firebase/auth';
import { collection, doc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { useAuth, useUser, useFirestore, useDoc, useCollection, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

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

  const usersQuery = useMemoFirebase(
    () => {
      if (!firestore || isUserLoading || isProfileLoading || !user) return null;
      
      const isSuperAdmin = user.email === 'omar850413@gmail.com';
      if (!isSuperAdmin && !userProfile?.isAdmin) return null;

      // FILTRO CRÍTICO: Solo mostrar usuarios de esta aplicación
      return query(collection(firestore, 'users'), where('appId', '==', 'referee-elite'));
    },
    [firestore, isUserLoading, isProfileLoading, user, userProfile]
  );
  
  const { data: users, isLoading: areUsersLoading } = useCollection<UserWithId>(usersQuery);

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
      });
  };
  
  const handleDeleteUser = (userId: string) => {
    const userDocRef = doc(firestore, 'users', userId);
    deleteDoc(userDocRef)
      .catch((error) => {
        const permissionError = new FirestorePermissionError({
          path: userDocRef.path,
          operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
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
        <Link href="/" className="text-primary hover:underline font-bold uppercase italic">&larr; Volver a la App</Link>
        <Button onClick={handleLogout} variant="outline" size="sm" className="font-bold uppercase italic">Cerrar Sesión</Button>
       </div>
      <Card>
        <CardHeader>
          <CardTitle className="uppercase font-black italic text-primary">Panel de Control: Referee Elite</CardTitle>
        </CardHeader>
        <CardContent>
          {areUsersLoading ? (
            <p className="text-center font-bold">Cargando asesores...</p>
          ) : (
            <div className="space-y-4">
              {users?.length === 0 ? (
                <p className="text-center text-slate-500 py-8 font-bold">NO HAY ASESORES REGISTRADOS EN ESTA APP.</p>
              ) : (
                users?.map((u) => {
                  const canManage = user && u.id !== user.uid && u.email !== 'omar850413@gmail.com';
                  const isTargetSuperAdmin = u.email === 'omar850413@gmail.com';

                  return (
                    <div key={u.id} className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 border rounded-lg bg-white shadow-sm gap-4">
                      <div className='flex items-center gap-2 flex-wrap'>
                        <p className="font-semibold break-all">{u.email}</p>
                        {u.isApproved ? (
                          <Badge variant="default" className="bg-emerald-500 uppercase">Aprobado</Badge>
                        ) : (
                          <Badge variant="destructive" className="uppercase">No Aprobado</Badge>
                        )}
                        {u.isAdmin && !isTargetSuperAdmin && <Badge className="ml-2 uppercase">Admin</Badge>}
                        {isTargetSuperAdmin && <Badge className="ml-2 bg-amber-500 text-white uppercase">Super Admin</Badge>}
                      </div>
                      {canManage && (
                         <div className="flex gap-2 flex-shrink-0">
                          {u.isApproved ? (
                            <Button variant="destructive" size="sm" className="font-bold uppercase" onClick={() => handleBlockUser(u.id)}>Bloquear</Button>
                          ) : (
                            <Button size="sm" className="font-bold uppercase" onClick={() => handleApproveUser(u.id)}>Aprobar</Button>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm" className="font-bold uppercase">Eliminar</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle className="uppercase font-black">¿Estás seguro?</AlertDialogTitle>
                                <AlertDialogDescription className="uppercase font-bold text-xs">
                                  Esta acción eliminará el perfil del asesor permanentemente de Referee Elite.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="uppercase font-bold">Cancelar</AlertDialogCancel>
                                <AlertDialogAction 
                                  className="bg-destructive hover:bg-destructive/90 uppercase font-black italic"
                                  onClick={() => handleDeleteUser(u.id)}
                                >
                                  Sí, eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
