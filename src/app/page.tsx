
'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, doc, addDoc, query, where, orderBy, DocumentReference, deleteDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useUser, useFirestore, useDoc, useMemoFirebase, useAuth, useCollection } from '@/firebase';
import { UserProfile, MatchState } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Logo } from '@/components/ui/Logo';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FileText, Trash2, LogOut, ShieldAlert, ChevronRight, Calendar } from 'lucide-react';
import MatchPage from '@/components/MatchPage';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();

  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  const userProfileRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const matchesQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, 'matches'),
      where('ownerId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
  }, [user, firestore]);

  const { data: matches, isLoading: areMatchesLoading } = useCollection<MatchState>(matchesQuery);

  useEffect(() => {
    if (isUserLoading || isProfileLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }

    const isSuperAdmin = user.email === 'omar850413@gmail.com';
    const isApproved = userProfile?.isApproved === true;

    if (!isSuperAdmin && !isApproved) {
      router.push('/pending-approval');
    }
  }, [user, userProfile, isUserLoading, isProfileLoading, router]);

  const handleCreateMatch = async () => {
    if (!user || !firestore) return;
    const advisorName = user.email || '';
    const newMatch: MatchState = {
      title: `Partido ${new Date().toLocaleDateString()}`,
      scores: { home: 0, away: 0 },
      fouls: { home: 0, away: 0 },
      teamNames: { home: 'LOCAL', away: 'VISITA' },
      events: [],
      matchInfo: { advisor: advisorName, league: '', round: '', place: '', date: new Date().toISOString().split('T')[0], referee: '', assistant1: '', assistant2: '', fourthOfficial: '', var: '', avar: '' },
      timer: { status: 'NOT_STARTED', startTime: 0, elapsedSeconds: 0, isRunning: false },
      penaltyShootout: { home: 0, away: 0, active: false },
      lineups: { home: [], away: [] },
      staff: { home: [], away: [] },
      ownerId: user.uid,
      createdAt: Date.now()
    };

    const docRef = await addDoc(collection(firestore, 'matches'), newMatch);
    setSelectedMatchId(docRef.id);
  };

  const handleDeleteMatch = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('¿Estás seguro de que quieres eliminar este reporte permanentemente?')) {
      await deleteDoc(doc(firestore, 'matches', id));
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.removeItem('sessionId');
    router.push('/login');
  };

  if (isUserLoading || isProfileLoading || areMatchesLoading) {
    return (
      <div className="p-4 bg-sky-100 min-h-screen flex items-center justify-center">
        <Skeleton className="h-40 w-full max-w-4xl" />
      </div>
    );
  }

  if (selectedMatchId) {
    const matchRef = doc(firestore, 'matches', selectedMatchId);
    return <MatchPage user={user!} userProfile={userProfile} matchDocRef={matchRef} onBack={() => setSelectedMatchId(null)} />;
  }

  const isAdmin = userProfile?.isAdmin || user?.email === 'omar850413@gmail.com';

  return (
    <div className="p-4 md:p-8 bg-sky-50 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Logo />
            {isAdmin && (
              <Link href="/admin">
                <Button variant="ghost" size="sm" className="text-primary font-bold gap-2">
                  <ShieldAlert className="h-4 w-4" /> PANEL ADMIN
                </Button>
              </Link>
            )}
          </div>
          <Button onClick={handleLogout} variant="ghost" size="sm" className="text-red-500">
            <LogOut className="h-4 w-4 mr-2" /> Salir
          </Button>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-3xl font-black italic uppercase text-slate-800">Mis Reportes</h2>
              <p className="text-slate-500">Gestiona tus cédulas arbitrales guardadas.</p>
            </div>
            <Button onClick={handleCreateMatch} className="bg-primary text-white font-black uppercase italic shadow-lg">
              <Plus className="h-5 w-5 mr-2" /> NUEVO JUEGO
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {matches && matches.length > 0 ? (
              matches.map((match) => (
                <Card 
                  key={match.id} 
                  className="hover:shadow-md transition-all cursor-pointer group border-l-4 border-l-primary"
                  onClick={() => setSelectedMatchId(match.id!)}
                >
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-black uppercase italic text-slate-700">{match.teamNames.home} vs {match.teamNames.away}</h3>
                          <span className="text-lg font-bold text-primary">{match.scores.home} - {match.scores.away}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-500 font-bold">
                          <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {match.matchInfo.date}</span>
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] uppercase">{match.matchInfo.league || 'Sin Liga'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-slate-300 hover:text-red-500 transition-colors"
                          onClick={(e) => handleDeleteMatch(e, match.id!)}
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                        <ChevronRight className="h-6 w-6 text-slate-300 group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="border-dashed border-2 bg-transparent text-center py-20">
                <CardContent>
                  <FileText className="h-16 w-16 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-400 font-bold">No tienes reportes guardados aún.</p>
                  <Button variant="link" onClick={handleCreateMatch} className="text-primary mt-2">Crea tu primer partido aquí</Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
