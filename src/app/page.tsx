'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { doc } from 'firebase/firestore';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { MatchEvent, MatchInfo, TeamNames, Scores, Fouls, UserProfile } from '@/lib/types';
import { formatTime } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

const causalesAmarilla = [
  'Conducta antideportiva',
  'Desaprobar con palabras',
  'Infracción persistente',
  'Retardar reanudación',
  'No respetar distancia',
];
const causalesRoja = [
  'Juego brusco grave',
  'Conducta violenta',
  'Escupir',
  'Mano (DOGSO)',
  'Falta (DOGSO)',
  'Lenguaje ofensivo',
];
const causalesStaff = [
  'Protestar airadamente',
  'Entrar al terreno',
  'Gritar al árbitro',
  'Abandono área técnica',
  'Faltar al respeto',
];

export default function Home() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const [matchState, setMatchState] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [scores, setScores] = useState<Scores>({ home: 0, away: 0 });
  const [fouls, setFouls] = useState<Fouls>({ home: 0, away: 0 });
  const [teamNames, setTeamNames] = useState<TeamNames>({
    home: 'LOCAL',
    away: 'VISITA',
  });
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [matchInfo, setMatchInfo] = useState<MatchInfo>({
    advisor: '',
    league: '',
    round: '',
  });

  const [modal, setModal] = useState<string | null>(null);
  const [currentSide, setCurrentSide] = useState<'home' | 'away'>('home');
  const [currentCardType, setCurrentCardType] = useState<'amarilla' | 'roja'>(
    'amarilla'
  );
  const [currentCardTarget, setCurrentCardTarget] = useState('jugador');
  const [currentStaffRole, setCurrentStaffRole] = useState('');
  const [editingEventId, setEditingEventId] = useState<number | null>(null);

  const [playerNumber, setPlayerNumber] = useState('');
  const [playerIn, setPlayerIn] = useState('');
  const [playerOut, setPlayerOut] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  const [editEventMsg, setEditEventMsg] = useState('');
  const [editEventTime, setEditEventTime] = useState('');
  
  // PEGGI states
  const [peggiDecision, setPeggiDecision] = useState<'yes' | 'no' | null>(null);
  const [peggiDescription, setPeggiDescription] = useState('');

  // Report Generation states
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [generatedReportUrl, setGeneratedReportUrl] = useState<string | null>(null);

  const capturedTimeRef = useRef('00:00');
  
  useEffect(() => {
    if (isUserLoading || isProfileLoading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    const isSuperAdmin = user.email === 'omar850413@gmail.com';

    if (!isSuperAdmin && !userProfile?.isApproved) {
      router.push('/pending-approval');
      return;
    }
  }, [user, userProfile, isUserLoading, isProfileLoading, router]);

  const getSmartTime = () => {
    const totalSeconds = Math.floor(elapsedSeconds);
    let mins = Math.floor(totalSeconds / 60);
    let secs = totalSeconds % 60;
    if (matchState === 1 && mins >= 45) {
      return `45+${mins - 45}:${secs.toString().padStart(2, '0')}`;
    }
    if (matchState === 3 && mins >= 90) {
      return `90+${mins - 90}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  useEffect(() => {
    if (isRunning) {
      const startTime = Date.now() - elapsedSeconds * 1000;
      timerIntervalRef.current = setInterval(() => {
        const newElapsedSeconds = (Date.now() - startTime) / 1000;
        setElapsedSeconds(newElapsedSeconds);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isRunning]);

  const addEvent = (category: string, message: string, time: string) => {
    const newEvent: MatchEvent = {
      id: Date.now(),
      time,
      category,
      message,
    };
    setEvents((prev) => [newEvent, ...prev]);
  };

  const handleTimerClick = () => {
    if (matchState === 0) { // To 1st Half
      setMatchState(1);
      setIsRunning(true);
      addEvent('general', '▶️ INICIO PARTIDO', '00:00');
    } else if (matchState === 1) { // To Half Time
      addEvent('general', `⏹️ FIN 1T`, getSmartTime());
      setIsRunning(false);
      setMatchState(2);
      setElapsedSeconds(45 * 60);
    } else if (matchState === 2) { // To 2nd Half
      setMatchState(3);
      setIsRunning(true);
      addEvent('general', '▶️ INICIO 2T', '45:00');
    } else if (matchState === 3) { // To Full Time
      addEvent('general', `🏁 FIN PARTIDO`, getSmartTime());
      setIsRunning(false);
      setMatchState(4);
    }
  };

  const triggerResetCrono = () => setModal('reset-crono-confirm');

  const handleResetCrono = () => {
    setIsRunning(false);
    if (matchState <= 2) {
      setElapsedSeconds(0);
      setMatchState(0);
    } else {
      setElapsedSeconds(45 * 60);
      setMatchState(2);
    }
    setModal(null);
  };
  
  const triggerFullReset = () => setModal('reset-full-confirm');

  const handleFullReset = () => {
      setIsRunning(false);
      setMatchState(0);
      setElapsedSeconds(0);
      setScores({ home: 0, away: 0 });
      setFouls({ home: 0, away: 0 });
      setTeamNames({ home: 'LOCAL', away: 'VISITA' });
      setEvents([]);
      setMatchInfo({ advisor: '', league: '', round: '' });
      setModal(null);
  };

  const addFoul = (side: 'home' | 'away') => {
    if (matchState === 0) return;
    setFouls((prev) => ({ ...prev, [side]: prev[side] + 1 }));
    addEvent('general', `🚩 Falta ${teamNames[side]}`, getSmartTime());
  };

  const captureTimeAndTrigger = (type: string, side: 'home' | 'away') => {
    if (matchState === 0) return;
    capturedTimeRef.current = getSmartTime();
    setCurrentSide(side);
    setModal(type);
  };

  const registerGoal = (type: string) => {
    const n = playerNumber || 'S/N';
    if (type === 'AUTOGOL') {
      const otherSide = currentSide === 'home' ? 'away' : 'home';
      setScores((prev) => ({ ...prev, [otherSide]: prev[otherSide] + 1 }));
    } else {
      setScores((prev) => ({ ...prev, [currentSide]: prev[currentSide] + 1 }));
    }
    addEvent(
      'goals',
      `⚽ ${type} #${n} (${teamNames[currentSide]})`,
      capturedTimeRef.current
    );
    setPlayerNumber('');
    setModal(null);
  };

  const registerSub = () => {
    const i = playerIn || '?';
    const o = playerOut || '?';
    addEvent(
      'subs',
      `🔄 Cambio (${teamNames[currentSide]}): ↑#${i} ↓#${o}`,
      capturedTimeRef.current
    );
    setPlayerIn('');
    setPlayerOut('');
    setModal(null);
  };

  const openCardSubMenu = (side: 'home' | 'away', type: 'amarilla' | 'roja') => {
    if (matchState === 0) return;
    capturedTimeRef.current = getSmartTime();
    setCurrentSide(side);
    setCurrentCardType(type);
    setModal('card-submenu');
  };

  const selectCardTarget = (target: string) => {
    setCurrentCardTarget(target);
    setModal('card-detail');
  };
  
  const openStaffRoleMenu = () => setModal('staff-role');

  const selectStaffRole = (role: string) => {
    setCurrentCardTarget('staff');
    setCurrentStaffRole(role);
    setModal('card-detail');
  };

  const registerCard = (causal: string) => {
    const p = playerNumber || 'S/N';
    const symbol = currentCardType === 'amarilla' ? '🟨' : '🟥';
    const target = currentCardTarget === 'jugador' ? `#${p}` : currentStaffRole;
    const message = `${symbol} ${target} (${teamNames[currentSide]}) - ${causal}`;
    addEvent('cards', message, capturedTimeRef.current);
    setPlayerNumber('');
    setModal(null);
  };

  const openNoteModal = () => {
    capturedTimeRef.current = getSmartTime();
    setModal('note');
  };
  
  const saveNote = () => {
    if (noteInput.trim()) {
      addEvent('notes', `📝 ${noteInput.trim()}`, capturedTimeRef.current);
    }
    setNoteInput('');
    setModal(null);
  };
  
  const openEditEvent = (event: MatchEvent) => {
    setEditingEventId(event.id);
    setEditEventMsg(event.message);
    setEditEventTime(event.time);
    setModal('edit-event');
  }

  const saveEventEdit = () => {
    setEvents(events.map(e => e.id === editingEventId ? {...e, message: editEventMsg, time: editEventTime} : e));
    setModal(null);
  }

  const deleteEvent = () => {
    setEvents(events.filter(e => e.id !== editingEventId));
    setModal(null);
  }

  const openPeggiModal = () => {
    if (matchState === 0) return;
    capturedTimeRef.current = getSmartTime();
    setPeggiDecision(null);
    setPeggiDescription('');
    setModal('peggi');
  };

  const handleSavePeggi = () => {
    if (!peggiDecision) return;
    if (peggiDecision === 'yes' && !peggiDescription.trim()) {
      alert('Por favor, ingresa una descripción para la jugada PEGGI.');
      return;
    }

    let message = '';
    if (peggiDecision === 'yes') {
      message = `🔎 PEGGI: Sí - ${peggiDescription.trim()}`;
    } else {
      message = '🔎 PEGGI: No';
    }

    addEvent('peggi', message, capturedTimeRef.current);
    setModal(null);
  };

  const handleGenerateReport = async () => {
    alert('La generación de informes visuales se ha deshabilitado temporalmente para resolver un problema de dependencias. Se restaurará pronto.');
  };

  const timerButtonLabel = [
    'Iniciar Partido',
    'Fin 1er Tiempo',
    'Iniciar 2do Tiempo',
    'Fin Partido',
    'Finalizado',
  ][matchState];
  const periodIndicator = `Status: ${
    ['Sin iniciar', '1T Corriendo', 'Descanso', '2T Corriendo', 'Finalizado'][
      matchState
    ]
  }`;

  const isSuperAdmin = user?.email === 'omar850413@gmail.com';
  const isApproved = userProfile?.isApproved || isSuperAdmin;

  if (isUserLoading || isProfileLoading || !isApproved) {
    return (
      <div className="p-4 bg-slate-100 min-h-screen flex items-center justify-center">
        <div className="max-w-md mx-auto space-y-4 w-full">
          <div className="flex items-center justify-center gap-3 border-b-4 border-primary/50 pb-2">
             <h1 className="text-2xl font-black text-center text-primary-foreground bg-primary/90 px-3 rounded-md uppercase italic tracking-tighter">
              Asesor Pro
            </h1>
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

  return (
    <div className="p-4 bg-slate-100">
      <div className="max-w-md mx-auto space-y-4 pb-12">
        <div className="flex items-center justify-center gap-3 border-b-4 border-primary/50 pb-2">
          <h1 className="text-2xl font-black text-center text-primary-foreground bg-primary/90 px-3 rounded-md uppercase italic tracking-tighter">
            Asesor Pro
          </h1>
          {(userProfile?.isAdmin || isSuperAdmin) && (
            <Link href="/admin">
              <Button variant="outline" size="sm">Panel de Control</Button>
            </Link>
          )}
        </div>

        <Card>
          <CardHeader className="bg-primary/5 rounded-t-lg p-6 text-center border-b">
            <div
              id="timer-display"
              className="text-7xl font-mono font-black text-gray-800 tracking-tighter mb-2"
            >
              {formatTime(elapsedSeconds)}
            </div>
            <div className="flex flex-col gap-2">
              <Button
                onClick={handleTimerClick}
                size="lg"
                className="w-full font-black text-lg shadow-lg uppercase italic"
                disabled={matchState === 4}
              >
                {timerButtonLabel}
              </Button>
              <div className="flex justify-between items-center px-2">
                <div className="text-[10px] font-black text-primary/80 uppercase tracking-widest italic">
                  {periodIndicator}
                </div>
                {matchState > 0 && (
                  <button
                    onClick={triggerResetCrono}
                    className="text-[10px] font-black text-red-500 uppercase italic underline bg-transparent border-none cursor-pointer"
                  >
                    Reiniciar Crono
                  </button>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 flex flex-col gap-6">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1 text-center">
                <p
                  onClick={() => {
                    setCurrentSide('home');
                    setNewTeamName(teamNames.home);
                    setModal('edit-name');
                  }}
                  className="text-xs font-black text-primary/80 uppercase mb-3 border-b-2 border-dashed border-primary/20 inline-block cursor-pointer px-2"
                >
                  {teamNames.home}
                </p>
                <div className="text-8xl font-black text-primary/90 leading-none">
                  {scores.home}
                </div>
                <div className="mt-6 bg-red-50 rounded-2xl p-3 border border-red-100">
                  <p className="text-[9px] font-black text-red-400 uppercase mb-1">
                    Faltas
                  </p>
                  <div className="text-4xl font-black text-red-600 leading-none">
                    {fouls.home}
                  </div>
                </div>
              </div>
              <div className="pt-8 text-3xl font-black text-gray-200 italic">
                VS
              </div>
              <div className="flex-1 text-center">
                <p
                  onClick={() => {
                    setCurrentSide('away');
                    setNewTeamName(teamNames.away);
                    setModal('edit-name');
                  }}
                  className="text-xs font-black text-primary/80 uppercase mb-3 border-b-2 border-dashed border-primary/20 inline-block cursor-pointer px-2"
                >
                  {teamNames.away}
                </p>
                <div className="text-8xl font-black text-primary/90 leading-none">
                  {scores.away}
                </div>
                <div className="mt-6 bg-red-50 rounded-2xl p-3 border border-red-100">
                  <p className="text-[9px] font-black text-red-400 uppercase mb-1">
                    Faltas
                  </p>
                  <div className="text-4xl font-black text-red-600 leading-none">
                    {fouls.away}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* QUICK ACTION BUTTONS */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => captureTimeAndTrigger('goal', 'home')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white py-6 rounded-3xl font-black shadow-lg uppercase text-[11px] italic leading-tight"
            >
              ⚽ GOL {teamNames.home}
            </Button>
            <Button
              onClick={() => addFoul('home')}
              className="bg-slate-800 hover:bg-slate-900 text-white py-4 rounded-2xl font-bold uppercase text-[10px] italic"
            >
              🚩 Falta {teamNames.home}
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => captureTimeAndTrigger('goal', 'away')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white py-6 rounded-3xl font-black shadow-lg uppercase text-[11px] italic leading-tight"
            >
              ⚽ GOL {teamNames.away}
            </Button>
            <Button
              onClick={() => addFoul('away')}
              className="bg-slate-800 hover:bg-slate-900 text-white py-4 rounded-2xl font-bold uppercase text-[10px] italic"
            >
              🚩 Falta {teamNames.away}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Button
              onClick={() => openCardSubMenu('home', 'amarilla')}
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-black py-4 rounded-2xl font-black text-[9px] border-b-4 border-yellow-600 uppercase italic"
            >
              🟨 Amonestación {teamNames.home}
            </Button>
            <Button
              onClick={() => openCardSubMenu('home', 'roja')}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-2xl font-black text-[9px] border-b-4 border-red-800 uppercase italic"
            >
              🟥 Expulsión {teamNames.home}
            </Button>
          </div>
          <div className="space-y-2">
            <Button
              onClick={() => openCardSubMenu('away', 'amarilla')}
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-black py-4 rounded-2xl font-black text-[9px] border-b-4 border-yellow-600 uppercase italic"
            >
              🟨 Amonestación {teamNames.away}
            </Button>
            <Button
              onClick={() => openCardSubMenu('away', 'roja')}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-2xl font-black text-[9px] border-b-4 border-red-800 uppercase italic"
            >
              🟥 Expulsión {teamNames.away}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Button
            onClick={() => captureTimeAndTrigger('sub', 'home')}
            className="bg-blue-500 hover:bg-blue-600 text-white py-4 rounded-2xl font-bold uppercase text-[10px] italic"
          >
            🔄 Cambio {teamNames.home}
          </Button>
          <Button
            onClick={() => captureTimeAndTrigger('sub', 'away')}
            className="bg-blue-500 hover:bg-blue-600 text-white py-4 rounded-2xl font-bold uppercase text-[10px] italic"
          >
            🔄 Cambio {teamNames.away}
          </Button>
        </div>

        <div className="pt-2 space-y-3">
          <Button
            onClick={() => setModal('info')}
            variant="outline"
            className="w-full bg-white text-primary/90 py-4 rounded-2xl font-black border-2 border-primary/5 uppercase text-xs shadow-sm italic"
          >
            🏟️ Datos del Partido
          </Button>
          <Button
            onClick={handleGenerateReport}
            disabled={true}
            variant="secondary"
            title="Deshabilitado temporalmente"
            className="w-full bg-gray-400 hover:bg-gray-500 text-white py-5 rounded-2xl font-black uppercase text-sm shadow-xl italic"
          >
            {'📄 Informe Visual (Temporalmente Deshabilitado)'}
          </Button>
          <Button
            onClick={openNoteModal}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black uppercase text-xs shadow-md italic"
          >
            📝 Nota Asesor
          </Button>
           <Button
            onClick={openPeggiModal}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-4 rounded-2xl font-black uppercase text-xs shadow-md italic"
          >
            🔎 Jugada PEGGI
          </Button>
          <Button
            onClick={triggerFullReset}
            variant="destructive"
            className="w-full bg-red-100 text-red-800 py-4 rounded-2xl font-bold uppercase text-[11px] italic"
          >
            Reiniciar Partido Completo
          </Button>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-black text-gray-400 uppercase ml-2 italic">
            Bitácora de eventos
          </p>
          <div className="space-y-2 text-sm max-h-80 overflow-y-auto bg-white p-4 rounded-3xl border border-primary/10 shadow-inner">
            {events.map((e) => (
              <div
                key={e.id}
                onClick={() => openEditEvent(e)}
                className="flex justify-between p-3 border-b bg-white rounded-lg mb-1 shadow-sm cursor-pointer hover:bg-slate-50"
              >
                <span className="text-[11px] font-black uppercase text-slate-700">
                  {e.message}
                </span>
                <span className="font-mono text-primary font-black ml-2">
                  {e.time}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center mt-8">
          <p className="text-xs text-gray-400 font-light">by Omar Saldaña</p>
        </div>
      </div>

      {/* MODALS */}
      <Dialog open={modal === 'goal'} onOpenChange={() => setModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-center text-emerald-600 uppercase italic">
              Registro de GOL
            </DialogTitle>
            <p className="text-center text-[11px] font-black text-gray-400 uppercase">
              {teamNames[currentSide]}
            </p>
            <p className="text-center text-[10px] font-mono font-bold text-emerald-500 italic">
              {capturedTimeRef.current}
            </p>
          </DialogHeader>
          <Input
            type="number"
            value={playerNumber}
            onChange={(e) => setPlayerNumber(e.target.value)}
            className="w-full text-center text-5xl font-black border-2 p-4 rounded-2xl my-4 h-auto"
            placeholder="00"
          />
          <div className="grid grid-cols-1 gap-2">
            <Button onClick={() => registerGoal('GOL')} className="bg-emerald-600 hover:bg-emerald-700 text-white">Gol Normal</Button>
            <Button onClick={() => registerGoal('PENAL')} className="bg-blue-600 hover:bg-blue-700 text-white">Penal</Button>
            <Button onClick={() => registerGoal('AUTOGOL')} className="bg-red-600 hover:bg-red-700 text-white">Autogol</Button>
          </div>
        </DialogContent>
      </Dialog>
      
      <Dialog open={modal === 'sub'} onOpenChange={() => setModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-center text-blue-600 uppercase italic">Sustitución</DialogTitle>
             <p className="text-center text-[11px] font-black text-gray-400 mb-1 uppercase">{teamNames[currentSide]}</p>
             <p className="text-center text-[10px] font-mono font-bold text-blue-500 mb-4 italic">{capturedTimeRef.current}</p>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
                <label className="block text-[10px] font-black text-emerald-600 uppercase text-center mb-1">Entra ↑</label>
                <Input type="number" value={playerIn} onChange={e => setPlayerIn(e.target.value)} className="w-full text-center text-4xl font-black border-2 p-3 rounded-2xl shadow-inner outline-none h-auto" placeholder="00" />
            </div>
            <div>
                <label className="block text-[10px] font-black text-red-600 uppercase text-center mb-1">Sale ↓</label>
                <Input type="number" value={playerOut} onChange={e => setPlayerOut(e.target.value)} className="w-full text-center text-4xl font-black border-2 p-3 rounded-2xl shadow-inner outline-none h-auto" placeholder="00" />
            </div>
          </div>
          <Button onClick={registerSub} className="w-full shadow-lg">Confirmar Cambio</Button>
        </DialogContent>
      </Dialog>
      
      <Dialog open={modal === 'card-submenu'} onOpenChange={() => setModal(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle className="text-center uppercase text-primary/90 italic">{currentCardType === 'amarilla' ? '🟨' : '🟥'} Sanción ({teamNames[currentSide]})</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 gap-4 mt-6">
                <Button onClick={() => selectCardTarget('jugador')} variant="outline" className="py-6 font-black uppercase italic text-base">🏃 Jugador</Button>
                <Button onClick={openStaffRoleMenu} variant="outline" className="py-6 font-black uppercase italic text-base">👔 Cuerpo Técnico</Button>
            </div>
        </DialogContent>
      </Dialog>

      <Dialog open={modal === 'staff-role'} onOpenChange={() => setModal(null)}>
        <DialogContent>
            <DialogHeader>
                 <DialogTitle className="text-center uppercase italic text-primary/90">Seleccionar Rol</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 gap-3 mt-6">
                <Button onClick={() => selectStaffRole('DT')} className="bg-blue-900 text-white py-5 font-black uppercase italic">Director Técnico</Button>
                <Button onClick={() => selectStaffRole('AUX')} className="bg-slate-800 text-white py-5 font-black uppercase italic">Auxiliar Técnico</Button>
                <Button onClick={() => selectStaffRole('OTROS')} variant="outline" className="py-5 font-black uppercase italic">Otros (Médico / PF)</Button>
            </div>
        </DialogContent>
      </Dialog>

       <Dialog open={modal === 'card-detail'} onOpenChange={() => setModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-center uppercase italic">{currentCardType === 'amarilla' ? '🟨 Amonestación' : '🟥 Expulsión'}</DialogTitle>
            <p className="text-center text-[11px] font-black text-gray-400 uppercase">{teamNames[currentSide]}</p>
          </DialogHeader>
          {currentCardTarget === 'jugador' && (
             <div className="mb-4">
                <label className="text-[10px] font-black text-gray-400 uppercase text-center block mb-1">Número</label>
                <Input type="number" value={playerNumber} onChange={e => setPlayerNumber(e.target.value)} className="w-full text-center text-5xl font-black border-4 p-4 rounded-2xl h-auto" placeholder="00" />
            </div>
          )}
           <p className="text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">Selecciona Causal:</p>
           <div className="space-y-2 max-h-64 overflow-y-auto">
            {(currentCardTarget === 'jugador' ? (currentCardType === 'amarilla' ? causalesAmarilla : causalesRoja) : causalesStaff).map(c => (
              <Button key={c} variant="outline" className="w-full text-left p-4 h-auto text-[11px] font-black uppercase justify-start" onClick={() => registerCard(c)}>{c}</Button>
            ))}
           </div>
        </DialogContent>
      </Dialog>

      <Dialog open={modal === 'info'} onOpenChange={() => setModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-center uppercase italic text-primary/90">Ficha Técnica</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            <Input value={matchInfo.advisor} onChange={e => setMatchInfo({...matchInfo, advisor: e.target.value})} placeholder="Nombre Asesor" />
            <Input value={matchInfo.league} onChange={e => setMatchInfo({...matchInfo, league: e.target.value})} placeholder="Torneo / Liga" />
            <Input type="number" value={matchInfo.round} onChange={e => setMatchInfo({...matchInfo, round: e.target.value})} placeholder="Jornada" />
          </div>
          <Button onClick={() => setModal(null)} className="w-full mt-6 shadow-lg">Guardar Datos</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={modal === 'note'} onOpenChange={() => setModal(null)}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle className="text-center uppercase italic text-blue-600">Nueva Observación</DialogTitle>
              </DialogHeader>
              <Textarea value={noteInput} onChange={e => setNoteInput(e.target.value)} className="my-4" rows={5} placeholder="Escribe aquí tu nota..." />
              <Button onClick={saveNote} className="w-full shadow-lg">Guardar Nota</Button>
          </DialogContent>
      </Dialog>

      <Dialog open={modal === 'edit-name'} onOpenChange={() => setModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-center uppercase italic text-gray-400">Editar Nombre</DialogTitle>
          </DialogHeader>
          <Input value={newTeamName} onChange={e => setNewTeamName(e.target.value)} className="w-full text-center text-2xl font-black border-2 p-4 rounded-2xl uppercase h-auto my-4" maxLength={15} />
          <Button onClick={() => { teamNames[currentSide] = newTeamName; setModal(null); }} className="w-full shadow-lg">Actualizar</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={modal === 'edit-event'} onOpenChange={() => setModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-center uppercase italic text-primary/90">Editar Registro</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-[10px] font-black uppercase text-gray-400">Mensaje:</label>
              <Input value={editEventMsg} onChange={e => setEditEventMsg(e.target.value)} className="font-bold" />
            </div>
             <div>
              <label className="text-[10px] font-black uppercase text-gray-400">Tiempo:</label>
              <Input value={editEventTime} onChange={e => setEditEventTime(e.target.value)} className="font-mono font-bold" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={saveEventEdit} className="flex-1">Guardar</Button>
              <Button onClick={deleteEvent} variant="destructive" className="px-4">🗑️</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <Dialog open={modal === 'peggi'} onOpenChange={() => setModal(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle className="text-center uppercase italic text-purple-600">Análisis PEGGI</DialogTitle>
                <DialogDescription className="text-center pt-2">
                    ¿La jugada es un incidente claro y obvio que el árbitro omitió o erró? (PEGGI)
                </DialogDescription>
            </DialogHeader>
            <RadioGroup value={peggiDecision ?? undefined} onValueChange={(value: 'yes' | 'no') => setPeggiDecision(value)} className="my-4 grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="peggi-yes" />
                    <Label htmlFor="peggi-yes" className="text-2xl font-black text-emerald-600">SÍ</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="peggi-no" />
                    <Label htmlFor="peggi-no" className="text-2xl font-black text-red-600">NO</Label>
                </div>
            </RadioGroup>

            {peggiDecision === 'yes' && (
                <Textarea 
                    value={peggiDescription}
                    onChange={e => setPeggiDescription(e.target.value)}
                    placeholder="Describe brevemente la jugada..."
                    className="mt-2"
                />
            )}
            
            <DialogFooter className="mt-4">
                <Button onClick={handleSavePeggi} disabled={!peggiDecision} className="w-full shadow-lg">Guardar Análisis</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={modal === 'view-report'} onOpenChange={() => setModal(null)}>
        <DialogContent className="max-w-lg">
            <DialogHeader>
                <DialogTitle className="text-center uppercase italic text-primary/90">Informe del Partido</DialogTitle>
            </DialogHeader>
            {generatedReportUrl ? (
                <div className="mt-4 space-y-4">
                    <div className="border rounded-lg overflow-hidden">
                        <Image src={generatedReportUrl} alt="Informe del partido generado" width={600} height={800} style={{ width: '100%', height: 'auto' }} />
                    </div>
                    <a href={generatedReportUrl} download="informe-partido.png" className="block w-full">
                        <Button className="w-full">Descargar Informe</Button>
                    </a>
                </div>
            ) : (
                <div className="text-center p-8">
                    <p>Generando informe...</p>
                </div>
            )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Modals */}
      <Dialog open={modal === 'reset-crono-confirm'} onOpenChange={() => setModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Reiniciar cronómetro?</DialogTitle>
            <DialogDescription className="pt-2">
              Se reiniciará el tiempo para el periodo actual. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4">
              <Button variant="outline" onClick={() => setModal(null)}>Cancelar</Button>
              <Button variant="destructive" onClick={handleResetCrono}>Sí, reiniciar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={modal === 'reset-full-confirm'} onOpenChange={() => setModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>🚨 ¿Estás absolutamente seguro?</DialogTitle>
            <DialogDescription className="pt-2">
              Esto borrará TODOS los datos del partido de forma permanente: marcadores, faltas, bitácora e información.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4">
              <Button variant="outline" onClick={() => setModal(null)}>Cancelar</Button>
              <Button variant="destructive" onClick={handleFullReset}>Sí, borrar todo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
