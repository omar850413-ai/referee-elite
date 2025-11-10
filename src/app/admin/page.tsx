
'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import type { UserProfile } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { Loader, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdminPage() {
  const db = useFirestore();
  const { user: adminUser, signOut } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const usersCollection = collection(db, 'users');
    const unsubscribe = onSnapshot(usersCollection, (snapshot) => {
      const usersData = snapshot.docs.map(doc => doc.data() as UserProfile);
      // Filter out the current admin user from the list
      const filteredUsers = usersData.filter(user => user.uid !== adminUser?.uid);
      setUsers(filteredUsers);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [db, adminUser]);

  const handleApprovalChange = async (user: UserProfile) => {
    const userDocRef = doc(db, 'users', user.uid);
    await updateDoc(userDocRef, {
      approved: !user.approved,
    });
  };

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="bg-background border-b p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Panel de Administración</h1>
        <Button variant="ghost" onClick={signOut}>
            Cerrar Sesión <LogOut className="ml-2 h-4 w-4" />
        </Button>
      </header>
      <main className="p-4 sm:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Gestión de Usuarios</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center h-40">
                <Loader className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Aprobar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.uid}>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.displayName}</TableCell>
                      <TableCell>
                         <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                            {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.approved ? 'secondary' : 'destructive'}>
                          {user.approved ? 'Aprobado' : 'Pendiente'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Switch
                          checked={user.approved}
                          onCheckedChange={() => handleApprovalChange(user)}
                          aria-label={`Aprobar a ${user.email}`}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            )}
            {users.length === 0 && !loading && (
              <p className="text-center text-muted-foreground py-8">No hay usuarios pendientes de aprobación.</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
