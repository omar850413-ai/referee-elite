'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, signOut } from 'firebase/auth';
import { DocumentReference, updateDoc, setDoc } from 'firebase/firestore';

import { useAuth, useDoc, errorEmitter, FirestorePermissionError } from '@/firebase';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
import { Switch } from '@/components/ui/switch';
import { MatchEvent, MatchInfo, TeamNames, Scores, UserProfile, Timer, MatchState, Player, StaffMember } from '@/lib/types';
import { formatTime, cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ReportView } from '@/components/report/ReportView';
import { PdfReportView } from '@/components/report/PdfReportView';
import { Logo } from '@/components/ui/Logo';
import { Skeleton } from '@/components/ui/skeleton';
import { causalesAmarilla, causalesRoja, causalesStaff } from '@/lib/causales';
import { Plus, Trash2, Users } from 'lucide-react';

interface MatchPageProps {
  user: User;
  userProfile: UserProfile | null;
  matchDocRef: DocumentReference;
}

export default function MatchPage({ user, userProfile, matchDocRef }: MatchPageProps) {
  const { toast } = useToast();
  const router = useRouter();
  const auth = useAuth();
  
  const { data: matchState, isLoading: isMatchLoading } = useDoc<MatchState>(matchDocRef);

  const [displaySeconds, setDisplaySeconds] = useState(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Modal and temporary input states
  const [modal, setModal] = useState<string | null>(null);
  const [currentSide, setCurrentSide] = useState<'home' | 'away'>('home');
  const [currentCardType, setCurrentCardType] = useState<'amarilla' | 'roja'>('amarilla');
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
  const [editEventPdfDescription, setEditEventPdfDescription] = useState('');
  const [editEventSide, setEditEventSide] = useState<'home' | 'away'>();
  
  const [pegiDecision, setPegiDecision] = useState<'yes' | 'no' | null>(null);
  const [pegiDescription, setPegiDescription] = useState('');
  
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isPdfReportOpen, setIsPdfReportOpen] = useState(false);
  const [manualScores, setManualScores] = useState<Scores>({ home: 0, away: 0 });
  const [manualPenaltyScores, setManualPenaltyScores] = useState<Scores>({ home: 0, away: 0 });
  const [selectedGoalType, setSelectedGoalType] = useState<'GOL' | 'PENAL' | 'AUTOGOL' | null>(null);
  const [selectedCausal, setSelectedCausal] = useState<string | null>(null);

  // Player Management
  const [newPlayerNumber, setNewPlayerNumber] = useState('');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerType, setNewPlayerType] = useState<'starter' | 'substitute'>('starter');
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('DT');

  const capturedTimeRef = useRef('00:00');

  // --- Firestore update helper ---
  const updateMatch = (data: Partial<MatchState>) => {
    const sanitizeData = (obj: any): any => {
      if (obj === null || typeof obj !== 'object') {
        return obj;
      }
      if (Array.isArray(obj)) {
        return obj.map(sanitizeData).filter(v => v !== undefined);
      }
      return Object.entries(obj).reduce((acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = sanitizeData(value);
        }
        return acc;
      }, {} as any);
    };
    const sanitizedData = sanitizeData(data);

    return updateDoc(matchDocRef, sanitizedData)
      .catch((error) => {
        const permissionError = new FirestorePermissionError({
          path: matchDocRef.path,
          operation: 'update',
          requestResourceData: sanitizedData,
        });
        errorEmitter.emit('permission-error', permissionError);
        toast({
          variant: "destructive",
          title: "Error de Sincronización",
          description: "No se pudieron guardar los cambios. Revisa tu conexión.",
        });
      });
  };

  useEffect(() => {
    if (!matchState) return;
    const { timer } = matchState;
    const calculateTotalElapsedSeconds = () => {
        if (!timer.isRunning) return timer.elapsedSeconds;
        const timeSinceStart = (Date.now() - timer.startTime) / 1000;
        return timer.elapsedSeconds + timeSinceStart;
    };
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setDisplaySeconds(calculateTotalElapsedSeconds());
    if (timer.isRunning) {
        timerIntervalRef.current = setInterval(() => {
            setDisplaySeconds(calculateTotalElapsedSeconds());
        }, 1000);
    }
    return () => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [matchState?.timer]);

  const getSmartTime = () => {
    if (!matchState) return '00:00';
    const totalSeconds = displaySeconds;
    const { status, firstHalfEndSeconds } = matchState.timer;
    if (status === 'NOT_STARTED') return '00:00';
    if (status === 'FIRST_HALF' || status === 'HALF_TIME') {
      const secondsToFormat = status === 'HALF_TIME' ? (firstHalfEndSeconds ?? 2700) : totalSeconds;
      const minutes = Math.floor(secondsToFormat / 60);
      if (minutes >= 45) {
        const extraSeconds = secondsToFormat - 45 * 60;
        const extraMinutes = Math.floor(extraSeconds / 60) + 1;
        return `45+${extraMinutes}`;
      }
      return formatTime(secondsToFormat);
    }
    if (status === 'SECOND_HALF' || status === 'FINISHED') {
        const firstHalfDuration = firstHalfEndSeconds ?? 2700;
        const secondHalfSeconds = Math.max(0, totalSeconds - firstHalfDuration);
        const gameTimeSeconds = (45 * 60) + secondHalfSeconds;
        const gameMinute = Math.floor(gameTimeSeconds / 60);
        if (gameMinute >= 90) {
            const extraTimeSeconds = gameTimeSeconds - 90 * 60;
            const extraMinutes = Math.floor(extraTimeSeconds / 60) + 1;
            return `90+${extraMinutes}`;
        }
        return formatTime(gameTimeSeconds);
    }
    return formatTime(totalSeconds);
  };

  const addEvent = (category: string, message: string, time: string, side?: 'home' | 'away', pNum?: string, pName?: string) => {
    const newEvent: MatchEvent = { id: Date.now(), time, category, message, side, playerNumber: pNum, playerName: pName };
    const updatedEvents = [newEvent, ...(matchState?.events ?? [])];
    updateMatch({ events: updatedEvents });
  };
  
  const handleTimerClick = () => {
    if (!matchState) return;
    const { timer, timing } = matchState;
    const now = Date.now();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let newTimerState: Partial<Timer> = {};
    let newTiming: Partial<MatchState['timing']> = { ...timing };

    const calculateCurrentElapsed = () => {
        if (!timer.isRunning) return timer.elapsedSeconds;
        return timer.elapsedSeconds + (now - timer.startTime) / 1000;
    };

    switch (timer.status) {
        case 'NOT_STARTED':
            newTimerState = { status: 'FIRST_HALF', isRunning: true, startTime: now, elapsedSeconds: 0 };
            newTiming.firstHalfStart = timeStr;
            break;
        case 'FIRST_HALF':
            const firstHalfElapsed = calculateCurrentElapsed();
            newTimerState = { status: 'HALF_TIME', isRunning: false, startTime: 0, elapsedSeconds: firstHalfElapsed, firstHalfEndSeconds: firstHalfElapsed };
            newTiming.firstHalfEnd = timeStr;
            break;
        case 'HALF_TIME':
            newTimerState = { status: 'SECOND_HALF', isRunning: true, startTime: now, elapsedSeconds: matchState.timer.firstHalfEndSeconds ?? 2700 };
            newTiming.secondHalfStart = timeStr;
            break;
        case 'SECOND_HALF':
            newTimerState = { status: 'FINISHED', isRunning: false, startTime: 0, elapsedSeconds: calculateCurrentElapsed() };
            newTiming.secondHalfEnd = timeStr;
            break;
        case 'FINISHED': return;
    }
    updateMatch({ timer: { ...timer, ...newTimerState }, timing: newTiming as any });
  };

  const triggerResetCrono = () => setModal('reset-crono-confirm');
  const handleResetCrono = () => {
      if (!matchState) return;
      const { status, firstHalfEndSeconds } = matchState.timer;
      let newTimerState: Timer;
      if (status === 'NOT_STARTED' || status === 'FIRST_HALF' || status === 'HALF_TIME') {
        newTimerState = { status: 'NOT_STARTED', startTime: 0, elapsedSeconds: 0, isRunning: false };
      } else {
        newTimerState = { status: 'HALF_TIME', startTime: 0, elapsedSeconds: firstHalfEndSeconds || 2700, isRunning: false, firstHalfEndSeconds: firstHalfEndSeconds };
      }
      updateMatch({ timer: newTimerState });
      setModal(null);
  };
  
  const triggerFullReset = () => setModal('reset-full-confirm');
  const handleFullReset = () => {
      const initialState: MatchState = {
        scores: { home: 0, away: 0 },
        fouls: { home: 0, away: 0 },
        teamNames: { home: 'LOCAL', away: 'VISITA' },
        events: [],
        matchInfo: { advisor: userProfile?.email || '', league: '', round: '', place: '', date: '', referee: '', assistant1: '', assistant2: '', fourthOfficial: '', var: '', avar: '' },
        timer: { status: 'NOT_STARTED', startTime: 0, elapsedSeconds: 0, isRunning: false },
        penaltyShootout: { home: 0, away: 0, active: false },
        reportSettings: { showFouls: false },
        lineups: { home: [], away: [] },
        staff: { home: [], away: [] },
        attendance: '',
        timing: { firstHalfStart: '', firstHalfEnd: '', secondHalfStart: '', secondHalfEnd: '' }
      };
      setDoc(matchDocRef, initialState).catch((error) => {
        const permissionError = new FirestorePermissionError({
            path: matchDocRef.path,
            operation: 'write',
            requestResourceData: initialState,
        });
        errorEmitter.emit('permission-error', permissionError);
      });
      setModal(null);
  };

  const addFoul = (side: 'home' | 'away') => {
    if (!matchState || matchState.timer.status === 'NOT_STARTED') {
      toast({ title: 'El partido no ha comenzado.', variant: 'destructive' });
      return;
    }
    const time = getSmartTime();
    const newFoulsCount = (matchState.fouls[side] ?? 0) + 1;
    const newEvent: MatchEvent = { 
      id: Date.now(), time, category: 'fouls', message: `🚩 Falta ${matchState.teamNames[side]}`, side 
    };
    updateMatch({ events: [newEvent, ...(matchState.events ?? [])], fouls: { ...matchState.fouls, [side]: newFoulsCount } });
  };

  const captureTimeAndTrigger = (type: string, side: 'home' | 'away') => {
    if (!matchState || matchState.timer.status === 'NOT_STARTED') {
      toast({ title: 'El partido no ha comenzado', variant: 'destructive' });
      return;
    }
    capturedTimeRef.current = matchState.timer.status === 'HALF_TIME' ? '45' : getSmartTime();
    setCurrentSide(side);
    setModal(type);
  };

  const registerGoal = (type: string | null) => {
    if (!matchState || !type) return;
    const n = playerNumber || 'S/N';
    const lineups = matchState.lineups || { home: [], away: [] };
    const player = lineups[currentSide].find(p => p.number === n);
    const sideToScore = type === 'AUTOGOL' ? (currentSide === 'home' ? 'away' : 'home') : currentSide;
    const newScores = { ...matchState.scores, [sideToScore]: (matchState.scores[sideToScore] ?? 0) + 1 };
    addEvent('goals', `⚽ ${type} #${n} (${matchState.teamNames[currentSide]})`, capturedTimeRef.current, currentSide, n, player?.name);
    updateMatch({ scores: newScores });
    setPlayerNumber('');
    setSelectedGoalType(null);
    setModal(null);
  };

  const registerSub = () => {
    if (!matchState) return;
    const i = playerIn || '?';
    const o = playerOut || '?';
    addEvent('subs', `🔄 Cambio (${matchState.teamNames[currentSide]}): ↑#${i} ↓#${o}`, capturedTimeRef.current, currentSide);
    setPlayerIn('');
    setPlayerOut('');
    setModal(null);
  };

  const openCardSubMenu = (side: 'home' | 'away', type: 'amarilla' | 'roja') => {
    if (!matchState || matchState.timer.status === 'NOT_STARTED') {
      toast({ title: 'El partido no ha comenzado', variant: 'destructive' });
      return;
    }
    capturedTimeRef.current = matchState.timer.status === 'HALF_TIME' ? '45' : getSmartTime();
    setSelectedCausal(null);
    setCurrentCardTarget('jugador');
    setCurrentStaffRole('');
    setCurrentSide(side);
    setCurrentCardType(type);
    setModal('card-submenu');
  };

  const selectCardTarget = (target: string) => {
    setCurrentCardTarget(target);
    setModal('card-detail');
  };
  
  const selectStaffRole = (role: string) => {
    setCurrentCardTarget('staff');
    setCurrentStaffRole(role);
    setModal('card-detail');
  };

  const registerCard = (causal: string | null) => {
    if (!matchState || !causal) return;
    const p = playerNumber || 'S/N';
    const lineups = matchState.lineups || { home: [], away: [] };
    const player = lineups[currentSide].find(pl => pl.number === p);
    const symbol = currentCardType === 'amarilla' ? '🟨' : '🟥';
    const target = currentCardTarget === 'jugador' ? `#${p}` : currentStaffRole;
    const message = `${symbol} ${target} (${matchState.teamNames[currentSide]}) - ${causal}`;
    addEvent('cards', message, capturedTimeRef.current, currentSide, p, player?.name);
    setPlayerNumber('');
    setSelectedCausal(null);
    setCurrentStaffRole('');
    setCurrentCardTarget('jugador');
    setModal(null);
  };

  const handleAddPlayer = () => {
    if (!matchState || !newPlayerNumber || !newPlayerName) return;
    const lineups = matchState.lineups || { home: [], away: [] };
    const player: Player = { id: Date.now().toString(), number: newPlayerNumber, name: newPlayerName, type: newPlayerType };
    const updatedLineups = { ...lineups, [currentSide]: [...lineups[currentSide], player] };
    updateMatch({ lineups: updatedLineups });
    setNewPlayerNumber('');
    setNewPlayerName('');
  };

  const handleRemovePlayer = (id: string) => {
    const lineups = matchState!.lineups || { home: [], away: [] };
    const updatedPlayers = lineups[currentSide].filter(p => p.id !== id);
    updateMatch({ lineups: { ...lineups, [currentSide]: updatedPlayers } });
  };

  const handleAddStaff = () => {
    if (!matchState || !newStaffName) return;
    const staff = matchState.staff || { home: [], away: [] };
    const member: StaffMember = { id: Date.now().toString(), name: newStaffName, role: newStaffRole };
    updateMatch({ staff: { ...staff, [currentSide]: [...staff[currentSide], member] } });
    setNewStaffName('');
  };

  const handleRemoveStaff = (id: string) => {
    const staff = matchState!.staff || { home: [], away: [] };
    updateMatch({ staff: { ...staff, [currentSide]: staff[currentSide].filter(s => s.id !== id) } });
  };

  const handleLogout = async () => {
    localStorage.removeItem('sessionId');
    await signOut(auth);
    router.push('/login');
  };
  
  const isAdmin = userProfile?.isAdmin || user?.email === 'omar850413@gmail.com';

  if (isMatchLoading || !matchState) {
    return (
      <div className="p-4 bg-sky-100 min-h-screen flex items-center justify-center">
        <Skeleton className="h-20 w-full max-w-md" />
      </div>
    );
  }

  const { 
    scores, 
    fouls, 
    teamNames, 
    events, 
    matchInfo, 
    timer, 
    attendance,
    lineups = { home: [], away: [] },
    staff = { home: [], away: [] }
  } = matchState;

  return (
    <div className="p-4 bg-sky-100 min-h-screen">
      <div className="max-w-md mx-auto space-y-4 pb-12">
        <div className="flex items-center justify-center gap-3 border-b-4 border-primary/50 pb-2">
          <Logo />
          {isAdmin && (
            <Link href="/admin">
              <Button variant="outline" size="sm">Admin</Button>
            </Link>
          )}
        </div>

        <Card>
          <CardHeader className="rounded-t-lg p-6 text-center border-b bg-sky-100">
            <div className="text-7xl font-mono font-black text-gray-800 tracking-tighter mb-2 bg-amber-100 rounded-2xl py-4 border-b-4 border-amber-200">
              {getSmartTime()}
            </div>
            <Button onClick={handleTimerClick} size="lg" className="w-full font-black text-lg shadow-lg uppercase italic bg-slate-800 hover:bg-slate-900 text-white" disabled={timer.status === 'FINISHED'}>
              { { 'NOT_STARTED': 'Iniciar Partido', 'FIRST_HALF': 'Fin 1T', 'HALF_TIME': 'Iniciar 2T', 'SECOND_HALF': 'Fin Partido', 'FINISHED': 'Finalizado' }[timer.status] }
            </Button>
            <div className="flex justify-between items-center px-2 mt-2">
              <span className="text-[10px] font-black text-primary/80 uppercase italic">Status: {timer.status}</span>
              {timer.status !== 'NOT_STARTED' && <button onClick={triggerResetCrono} className="text-[10px] font-black text-red-500 uppercase italic underline">Reiniciar Crono</button>}
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center space-y-2">
                <Button variant="ghost" className="font-black text-lg p-0 h-auto" onClick={() => { setCurrentSide('home'); setNewTeamName(teamNames.home); setModal('edit-name'); }}>{teamNames.home}</Button>
                <div className="text-5xl font-black">{scores.home}</div>
                <Button onClick={() => addFoul('home')} className="bg-slate-800 text-white w-full h-auto py-2 flex flex-col">
                  <span className="text-[10px]">FALTAS</span>
                  <span className="text-2xl font-black">{fouls.home}</span>
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setCurrentSide('home'); setModal('manage-lineup'); }} className="w-full"><Users className="h-4 w-4 mr-2"/> Plantilla</Button>
              </div>
              <div className="text-center space-y-2">
                <Button variant="ghost" className="font-black text-lg p-0 h-auto" onClick={() => { setCurrentSide('away'); setNewTeamName(teamNames.away); setModal('edit-name'); }}>{teamNames.away}</Button>
                <div className="text-5xl font-black">{scores.away}</div>
                <Button onClick={() => addFoul('away')} className="bg-slate-800 text-white w-full h-auto py-2 flex flex-col">
                  <span className="text-[10px]">FALTAS</span>
                  <span className="text-2xl font-black">{fouls.away}</span>
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setCurrentSide('away'); setModal('manage-lineup'); }} className="w-full"><Users className="h-4 w-4 mr-2"/> Plantilla</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Button onClick={() => captureTimeAndTrigger('goal', 'home')} className="bg-emerald-600 font-black h-16 uppercase italic">⚽ GOL {teamNames.home}</Button>
          <Button onClick={() => captureTimeAndTrigger('goal', 'away')} className="bg-emerald-600 font-black h-16 uppercase italic">⚽ GOL {teamNames.away}</Button>
          <Button onClick={() => openCardSubMenu('home', 'amarilla')} className="bg-yellow-400 text-black font-black uppercase italic">🟨 Amarilla {teamNames.home}</Button>
          <Button onClick={() => openCardSubMenu('away', 'amarilla')} className="bg-yellow-400 text-black font-black uppercase italic">🟨 Amarilla {teamNames.away}</Button>
          <Button onClick={() => openCardSubMenu('home', 'roja')} className="bg-red-600 text-white font-black uppercase italic">🟥 Roja {teamNames.home}</Button>
          <Button onClick={() => openCardSubMenu('away', 'roja')} className="bg-red-600 text-white font-black uppercase italic">🟥 Roja {teamNames.away}</Button>
          <Button onClick={() => captureTimeAndTrigger('sub', 'home')} className="bg-blue-500 font-black uppercase italic">🔄 Cambio {teamNames.home}</Button>
          <Button onClick={() => captureTimeAndTrigger('sub', 'away')} className="bg-blue-500 font-black uppercase italic">🔄 Cambio {teamNames.away}</Button>
        </div>

        <div className="space-y-2 pt-2">
          <Button onClick={() => setModal('info')} variant="outline" className="w-full font-black uppercase italic">📋 Datos de Cédula</Button>
          <Button onClick={() => setIsPdfReportOpen(true)} className="w-full bg-slate-700 h-14 font-black text-lg uppercase italic">📄 Generar Cédula (PDF)</Button>
          <Button onClick={triggerFullReset} variant="destructive" className="w-full font-bold uppercase italic text-[10px]">Reiniciar Todo</Button>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-black text-gray-400 uppercase italic">Bitácora de eventos</p>
          <div className="space-y-2 text-sm max-h-60 overflow-y-auto bg-white p-4 rounded-2xl border shadow-inner">
            {events.map((e) => (
              <div key={e.id} className="flex justify-between p-2 border-b last:border-0">
                <span className="font-bold">{e.message}</span>
                <span className="font-mono text-primary">{e.time}</span>
              </div>
            ))}
          </div>
        </div>

        <Button onClick={handleLogout} variant="outline" className="w-full">Cerrar Sesión</Button>
      </div>

      {/* MODALS */}
      <Dialog open={modal === 'manage-lineup'} onOpenChange={() => setModal(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Plantilla - {teamNames[currentSide]}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Input placeholder="#" className="w-16" value={newPlayerNumber} onChange={e => setNewPlayerNumber(e.target.value)}/>
              <Input placeholder="Nombre del Jugador" className="flex-1" value={newPlayerName} onChange={e => setNewPlayerName(e.target.value)}/>
              <select className="border rounded px-2 text-xs" value={newPlayerType} onChange={e => setNewPlayerType(e.target.value as any)}>
                <option value="starter">Titular</option>
                <option value="substitute">Suplente</option>
              </select>
              <Button size="icon" onClick={handleAddPlayer}><Plus className="h-4 w-4"/></Button>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase text-gray-500">Jugadores Registrados:</p>
              {lineups[currentSide].map(p => (
                <div key={p.id} className="flex justify-between items-center p-2 bg-slate-50 rounded border">
                  <span className="text-sm font-bold">#{p.number} - {p.name} <span className="text-[10px] text-gray-400">({p.type === 'starter' ? 'T' : 'S'})</span></span>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleRemovePlayer(p.id)}><Trash2 className="h-4 w-4"/></Button>
                </div>
              ))}
            </div>
            <div className="border-t pt-4 space-y-2">
              <p className="text-xs font-bold uppercase text-gray-500">Cuerpo Técnico:</p>
              <div className="flex gap-2">
                <Input placeholder="Nombre" className="flex-1" value={newStaffName} onChange={e => setNewStaffName(e.target.value)}/>
                <select className="border rounded px-2 text-xs" value={newStaffRole} onChange={e => setNewStaffRole(e.target.value)}>
                  <option value="DT">DT</option>
                  <option value="AUX">Auxiliar</option>
                  <option value="MED">Médico</option>
                  <option value="PF">PF</option>
                </select>
                <Button size="icon" onClick={handleAddStaff}><Plus className="h-4 w-4"/></Button>
              </div>
              {staff[currentSide].map(s => (
                <div key={s.id} className="flex justify-between items-center p-2 bg-slate-50 rounded border">
                  <span className="text-sm">{s.name} <span className="text-[10px] font-bold">({s.role})</span></span>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleRemoveStaff(s.id)}><Trash2 className="h-4 w-4"/></Button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={modal === 'info'} onOpenChange={() => setModal(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Datos de la Cédula</DialogTitle></DialogHeader>
          <div className="space-y-3 py-4">
            <Input value={matchInfo.league} onChange={e => updateMatch({matchInfo: {...matchInfo, league: e.target.value}})} placeholder="Torneo" />
            <Input value={matchInfo.round} onChange={e => updateMatch({matchInfo: {...matchInfo, round: e.target.value}})} placeholder="Jornada" />
            <Input value={matchInfo.place} onChange={e => updateMatch({matchInfo: {...matchInfo, place: e.target.value}})} placeholder="Estadio / Lugar" />
            <Input value={matchInfo.date} onChange={e => updateMatch({matchInfo: {...matchInfo, date: e.target.value}})} placeholder="Fecha" />
            <Input value={attendance} onChange={e => updateMatch({attendance: e.target.value})} placeholder="Asistencia" />
            <div className="grid grid-cols-1 gap-2 border-t pt-4">
              <p className="text-xs font-bold uppercase">Cuerpo Arbitral:</p>
              <Input value={matchInfo.referee} onChange={e => updateMatch({matchInfo: {...matchInfo, referee: e.target.value}})} placeholder="Árbitro Central" />
              <Input value={matchInfo.assistant1} onChange={e => updateMatch({matchInfo: {...matchInfo, assistant1: e.target.value}})} placeholder="Asistente 1" />
              <Input value={matchInfo.assistant2} onChange={e => updateMatch({matchInfo: {...matchInfo, assistant2: e.target.value}})} placeholder="Asistente 2" />
              <Input value={matchInfo.fourthOfficial} onChange={e => updateMatch({matchInfo: {...matchInfo, fourthOfficial: e.target.value}})} placeholder="4to Árbitro" />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Goal, Sub, Card modals similar to original but using Dialog components */}
      <Dialog open={modal === 'goal'} onOpenChange={() => setModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registro de GOL - {teamNames[currentSide]}</DialogTitle></DialogHeader>
          <Input type="number" value={playerNumber} onChange={e => setPlayerNumber(e.target.value)} className="text-center text-4xl font-black h-20" placeholder="00" />
          <div className="grid grid-cols-1 gap-2">
            <Button onClick={() => setSelectedGoalType('GOL')} className={cn(selectedGoalType === 'GOL' && 'ring-2 ring-primary')}>Gol Jugada</Button>
            <Button onClick={() => setSelectedGoalType('PENAL')} className={cn(selectedGoalType === 'PENAL' && 'ring-2 ring-primary')}>Penal</Button>
            <Button onClick={() => setSelectedGoalType('AUTOGOL')} className={cn(selectedGoalType === 'AUTOGOL' && 'ring-2 ring-primary')}>Autogol</Button>
          </div>
          <Button onClick={() => registerGoal(selectedGoalType)} disabled={!selectedGoalType} className="w-full mt-4">Confirmar</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={modal === 'card-submenu'} onOpenChange={() => setModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{currentCardType === 'amarilla' ? '🟨' : '🟥'} Sanción - {teamNames[currentSide]}</DialogTitle></DialogHeader>
          <div className="grid gap-2">
            <Button onClick={() => selectCardTarget('jugador')}>🏃 Jugador</Button>
            <Button onClick={() => selectStaffRole('DT')}>👔 Staff</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={modal === 'card-detail'} onOpenChange={() => setModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{currentCardType === 'amarilla' ? '🟨' : '🟥'} Detalles</DialogTitle></DialogHeader>
          <Input type="number" value={playerNumber} onChange={e => setPlayerNumber(e.target.value)} className="text-center text-4xl font-black h-20" placeholder="00" />
          <p className="text-xs font-bold uppercase mt-2">Causal:</p>
          <div className="max-h-60 overflow-y-auto space-y-1">
            {(currentCardTarget === 'jugador' ? (currentCardType === 'amarilla' ? causalesAmarilla : causalesRoja) : causalesStaff).map(c => (
              <Button key={c} variant="ghost" className={cn("w-full text-left justify-start text-[10px] h-auto py-2", selectedCausal === c && "bg-primary/10")} onClick={() => setSelectedCausal(c)}>{c}</Button>
            ))}
          </div>
          <Button onClick={() => registerCard(selectedCausal)} disabled={!selectedCausal} className="w-full mt-4">Confirmar</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={modal === 'sub'} onOpenChange={() => setModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Sustitución - {teamNames[currentSide]}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Entra ↑</Label><Input type="number" value={playerIn} onChange={e => setPlayerIn(e.target.value)} placeholder="00"/></div>
            <div><Label>Sale ↓</Label><Input type="number" value={playerOut} onChange={e => setPlayerOut(e.target.value)} placeholder="00"/></div>
          </div>
          <Button onClick={registerSub} className="w-full mt-4">Confirmar Cambio</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={isPdfReportOpen} onOpenChange={setIsPdfReportOpen}>
        <DialogContent className="max-w-5xl p-0 bg-transparent border-none shadow-none h-[95vh]">
          <PdfReportView matchState={matchState} />
        </DialogContent>
      </Dialog>

      {/* Confirmation Modals */}
      <Dialog open={modal === 'reset-full-confirm'} onOpenChange={() => setModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>¿Borrar todo?</DialogTitle><DialogDescription>Esta acción eliminará alineaciones y eventos permanentemente.</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => setModal(null)}>Cancelar</Button><Button variant="destructive" onClick={handleFullReset}>Eliminar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
