'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, signOut } from 'firebase/auth';
import { DocumentReference, updateDoc, setDoc } from 'firebase/firestore';
import { X } from 'lucide-react';

import { useAuth, useDoc, errorEmitter, FirestorePermissionError } from '@/firebase';
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
  DialogClose,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { MatchEvent, MatchInfo, TeamNames, Scores, Fouls, UserProfile, Timer, MatchState } from '@/lib/types';
import { formatTime, cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ReportView } from '@/components/report/ReportView';
import { PdfReportView } from '@/components/report/PdfReportView';
import { Logo } from '@/components/ui/Logo';
import { Skeleton } from '@/components/ui/skeleton';
import { causalesAmarilla, causalesRoja, causalesStaff } from '@/lib/causales';

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

  const capturedTimeRef = useRef('00:00');

  // --- Firestore update helper ---
  const updateMatch = (data: Partial<MatchState>) => {
    // Firestore does not allow 'undefined' as a value.
    // This helper recursively removes any keys with 'undefined' values.
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


  // --- Timer Sync & Display Logic ---
  useEffect(() => {
    if (!matchState) return;

    const { timer } = matchState;

    // This function calculates the current total elapsed seconds based on server data.
    // It's the single source of truth for time.
    const calculateTotalElapsedSeconds = () => {
        if (!timer.isRunning) {
            return timer.elapsedSeconds;
        }
        // Time elapsed since the timer was last started.
        const timeSinceStart = (Date.now() - timer.startTime) / 1000;
        // Total time is the previously recorded elapsed time plus the new interval.
        return timer.elapsedSeconds + timeSinceStart;
    };

    if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
    }
    
    // Set the initial display time when the component loads or timer state changes.
    setDisplaySeconds(calculateTotalElapsedSeconds());

    // If the timer is running, set up an interval to update the display every second.
    if (timer.isRunning) {
        timerIntervalRef.current = setInterval(() => {
            setDisplaySeconds(calculateTotalElapsedSeconds());
        }, 1000);
    }

    // Cleanup interval on component unmount or when timer state changes.
    return () => {
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
        }
    };
}, [matchState?.timer]); // This effect re-runs whenever the timer object from Firestore changes.


  const getSmartTime = () => {
    if (!matchState) return '00:00';

    const totalSeconds = displaySeconds;
    const { status, firstHalfEndSeconds } = matchState.timer;

    if (status === 'NOT_STARTED') {
        return '00:00';
    }
    
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
            const regulationTimeInSeconds = 90 * 60;
            const extraTimeSeconds = gameTimeSeconds - regulationTimeInSeconds;
            const extraMinutes = Math.floor(extraTimeSeconds / 60) + 1;
            return `90+${extraMinutes}`;
        }
        
        return formatTime(gameTimeSeconds);
    }

    return formatTime(totalSeconds);
  };


  const addEvent = (category: string, message: string, time: string, side?: 'home' | 'away') => {
    const newEvent: MatchEvent = { id: Date.now(), time, category, message, side };
    const updatedEvents = [newEvent, ...(matchState?.events ?? [])];
    updateMatch({ events: updatedEvents });
  };
  
 const handleTimerClick = () => {
    if (!matchState) return;

    const { timer } = matchState;
    const now = Date.now();
    let newTimerState: Partial<Timer> = {};

    // This function calculates the most up-to-date elapsed time.
    const calculateCurrentElapsed = () => {
        if (!timer.isRunning) return timer.elapsedSeconds;
        return timer.elapsedSeconds + (now - timer.startTime) / 1000;
    };

    switch (timer.status) {
        case 'NOT_STARTED':
            newTimerState = {
                status: 'FIRST_HALF',
                isRunning: true,
                startTime: now,
                elapsedSeconds: 0,
            };
            break;
        case 'FIRST_HALF':
            const firstHalfElapsed = calculateCurrentElapsed();
            newTimerState = {
                status: 'HALF_TIME',
                isRunning: false,
                startTime: 0, // Reset startTime
                elapsedSeconds: firstHalfElapsed,
                firstHalfEndSeconds: firstHalfElapsed,
            };
            break;
        case 'HALF_TIME':
            newTimerState = {
                status: 'SECOND_HALF',
                isRunning: true,
                startTime: now,
                elapsedSeconds: matchState.timer.firstHalfEndSeconds ?? 2700,
            };
            break;
        case 'SECOND_HALF':
            newTimerState = {
                status: 'FINISHED',
                isRunning: false,
                startTime: 0,
                elapsedSeconds: calculateCurrentElapsed(),
            };
            break;
        case 'FINISHED':
            // No action when the match is finished.
            return;
    }
    updateMatch({ timer: { ...timer, ...newTimerState } });
};

  const triggerResetCrono = () => setModal('reset-crono-confirm');

  const handleResetCrono = () => {
      if (!matchState) return;
      const { status, firstHalfEndSeconds } = matchState.timer;
  
      let newTimerState: Timer;
  
      if (status === 'NOT_STARTED' || status === 'FIRST_HALF' || status === 'HALF_TIME') {
        newTimerState = {
          status: 'NOT_STARTED',
          startTime: 0,
          elapsedSeconds: 0,
          isRunning: false,
        };
      } else { // SECOND_HALF or FINISHED
        newTimerState = {
          status: 'HALF_TIME',
          startTime: 0,
          elapsedSeconds: firstHalfEndSeconds || 2700,
          isRunning: false,
          firstHalfEndSeconds: firstHalfEndSeconds,
        };
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
      toast({
        title: 'El partido no ha comenzado.',
        description: 'No se pueden registrar faltas cuando el juego está detenido.',
        variant: 'destructive',
      });
      return;
    }
    const newFoulsCount = (matchState.fouls[side] ?? 0) + 1;
    addEvent('general', `🚩 Falta ${matchState.teamNames[side]}`, getSmartTime(), side);
    updateMatch({ fouls: { ...matchState.fouls, [side]: newFoulsCount }});
  };

  const captureTimeAndTrigger = (type: string, side: 'home' | 'away') => {
    if (!matchState || matchState.timer.status === 'NOT_STARTED') {
      toast({
        title: 'El partido no ha comenzado',
        description: 'Debes iniciar el cronómetro para registrar eventos.',
        variant: 'destructive',
      });
      return;
    }

    if (matchState.timer.status === 'HALF_TIME') {
      capturedTimeRef.current = '45';
    } else {
      capturedTimeRef.current = getSmartTime();
    }

    if (type === 'goal') {
      setSelectedGoalType(null);
    }
    
    setCurrentSide(side);
    setModal(type);
  };

  const registerGoal = (type: string | null) => {
    if (!matchState || !type) return;

    const n = playerNumber || 'S/N';
    const otherSide = currentSide === 'home' ? 'away' : 'home';
    const sideToScore = type === 'AUTOGOL' ? otherSide : currentSide;
    
    const newScores = {
        ...matchState.scores,
        [sideToScore]: (matchState.scores[sideToScore] ?? 0) + 1,
    };
    
    addEvent('goals', `⚽ ${type} #${n} (${matchState.teamNames[currentSide]})`, capturedTimeRef.current, currentSide);
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
      toast({
        title: 'El partido no ha comenzado',
        description: 'Debes iniciar el cronómetro para registrar tarjetas.',
        variant: 'destructive',
      });
      return;
    }
    
    if (matchState.timer.status === 'HALF_TIME') {
      capturedTimeRef.current = '45';
    } else {
      capturedTimeRef.current = getSmartTime();
    }

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
  
  const openStaffRoleMenu = () => setModal('staff-role');

  const selectStaffRole = (role: string) => {
    setCurrentCardTarget('staff');
    setCurrentStaffRole(role);
    setModal('card-detail');
  };

  const registerCard = (causal: string | null) => {
    if (!matchState || !causal) return;
    const p = playerNumber || 'S/N';
    const symbol = currentCardType === 'amarilla' ? '🟨' : '🟥';
    const target = currentCardTarget === 'jugador' ? `#${p}` : currentStaffRole;
    const message = `${symbol} ${target} (${matchState.teamNames[currentSide]}) - ${causal}`;
    addEvent('cards', message, capturedTimeRef.current, currentSide);
    setPlayerNumber('');
    setSelectedCausal(null);
    setCurrentStaffRole('');
    setCurrentCardTarget('jugador');
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
    setEditEventPdfDescription(event.pdfDescription || '');
    setEditEventSide(event.side);
    setModal('edit-event');
  }

  const saveEventEdit = () => {
    if (!matchState) return;
    const updatedEvents = matchState.events.map(e => 
      e.id === editingEventId 
        ? {...e, message: editEventMsg, time: editEventTime, side: editEventSide} 
        : e
    );
    updateMatch({ events: updatedEvents });
    setModal(null);
  }

  const handleSetValuation = (valuation: 'correcta' | 'incorrecta') => {
    if (!matchState || editingEventId === null) return;
    const updatedEvents = matchState.events.map(e =>
      e.id === editingEventId
        ? { ...e, valuation }
        : e
    );
    updateMatch({ events: updatedEvents });
    setModal('edit-event');
  };

  const deleteEvent = () => {
    if (!matchState) return;
    const updatedEvents = matchState.events.filter(e => e.id !== editingEventId);
    updateMatch({ events: updatedEvents });
    setModal(null);
  }

  const openPegiModal = () => {
    capturedTimeRef.current = getSmartTime();
    setPegiDecision(null);
    setPegiDescription('');
    setModal('pegi');
  };

  const handleSavePegi = () => {
    if (!pegiDecision) {
      toast({
        title: 'Selección requerida',
        description: 'Por favor, elige "Sí" o "No".',
        variant: 'destructive',
      });
      return;
    }
    if (pegiDecision === 'yes' && !pegiDescription.trim()) {
      toast({
        title: 'Descripción requerida',
        description: 'Por favor, ingresa una descripción para la jugada PEGI.',
        variant: 'destructive',
      });
      return;
    }
    const message = pegiDecision === 'yes' ? `🔎 JUGADAS PEGI: Sí - ${pegiDescription.trim()}` : '🔎 JUGADAS PEGI: No';
    addEvent('pegi', message, capturedTimeRef.current);
    setModal(null);
  };
  
  const openPenaltyModal = () => {
    if (!matchState) return;
    if (matchState.timer.status !== 'FINISHED') {
        toast({
            title: 'Partido no ha finalizado',
            description: 'La tanda de penales solo se registra al finalizar el partido.',
            variant: 'destructive',
        });
        return;
    }
    if (matchState.scores.home !== matchState.scores.away) {
         toast({
            title: 'El partido no está empatado',
            description: 'La tanda de penales es para definir un ganador en caso de empate.',
            variant: 'default',
            duration: 4000,
        });
    }
    setManualPenaltyScores(matchState.penaltyShootout ?? { home: 0, away: 0, active: false });
    setModal('penalties');
  };

  const openScoreEditor = () => {
    setManualScores(matchState?.scores ?? { home: 0, away: 0 });
    setModal('edit-score');
  };
  
  const handleLogout = async () => {
    localStorage.removeItem('sessionId');
    await signOut(auth);
    router.push('/login');
  };
  
  const getTeamNameSizeClass = (name: string | undefined) => {
    if (!name) return 'text-lg';
    if (name.length > 12) return 'text-base';
    if (name.length > 9) return 'text-lg';
    return 'text-xl';
  };

  if (isMatchLoading || !matchState) {
     return (
      <div className="p-4 bg-sky-100 min-h-screen flex items-center justify-center">
        <div className="max-w-md mx-auto space-y-4 w-full">
          <Skeleton className="h-12 w-full" />
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

  const { scores, fouls, teamNames, events, matchInfo, timer, penaltyShootout } = matchState;
  const matchStatus = timer.status;
  const timerButtonLabel = {
    'NOT_STARTED': 'Iniciar Partido',
    'FIRST_HALF': 'Fin 1er Tiempo',
    'HALF_TIME': 'Iniciar 2do Tiempo',
    'SECOND_HALF': 'Fin Partido',
    'FINISHED': 'Finalizado',
  }[matchStatus];
  const periodIndicator = `Status: ${
    {
      'NOT_STARTED': 'Sin iniciar',
      'FIRST_HALF': '1T Corriendo',
      'HALF_TIME': 'Descanso',
      'SECOND_HALF': '2T Corriendo',
      'FINISHED': 'Finalizado',
    }[matchStatus]
  }`;

  const isSuperAdmin = user?.email === 'omar850413@gmail.com';
  const isAdmin = userProfile?.isAdmin || isSuperAdmin;
  
  return (
    <div className="p-4 bg-sky-100">
      <div className="max-w-md mx-auto space-y-4 pb-12">
        <div className="flex items-center justify-center gap-3 border-b-4 border-primary/50 pb-2">
          <Logo />
          {isAdmin && (
            <Link href="/admin">
              <Button variant="outline" size="sm">Panel de Control</Button>
            </Link>
          )}
        </div>

        <Card>
          <CardHeader className="rounded-t-lg p-6 text-center border-b bg-sky-100">
            <div
              id="timer-display"
              className="text-7xl font-mono font-black text-gray-800 tracking-tighter mb-2 bg-amber-100 rounded-2xl py-4 border-b-4 border-amber-200"
            >
              {getSmartTime()}
            </div>
            <div className="flex flex-col gap-2">
              <Button
                onClick={handleTimerClick}
                size="lg"
                className="w-full font-black text-lg shadow-lg uppercase italic bg-slate-800 hover:bg-slate-900 text-white"
                disabled={matchStatus === 'FINISHED'}
              >
                {timerButtonLabel}
              </Button>
              <div className="flex justify-between items-center px-2">
                <div className="text-[10px] font-black text-primary/80 uppercase tracking-widest italic">
                  {periodIndicator}
                </div>
                {matchStatus !== 'NOT_STARTED' && (
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
            <div className="grid grid-cols-2 gap-4">
              <div
                onClick={openScoreEditor}
                className="cursor-pointer p-2 rounded-2xl hover:bg-primary/5 transition-colors flex flex-col justify-between text-center space-y-2"
                title="Haz clic para corregir el marcador"
              >
                <div className="h-16 flex items-center justify-center">
                  <p
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentSide('home');
                        setNewTeamName(teamNames.home);
                        setModal('edit-name');
                      }}
                      className={cn(
                        "font-black text-blue-900 uppercase border-b-2 border-dashed border-blue-900/20 inline-block cursor-pointer px-2",
                        getTeamNameSizeClass(teamNames.home)
                      )}
                    >
                      {teamNames.home}
                    </p>
                  </div>
                  <div className="text-center text-5xl font-black text-gray-800 leading-none py-2">
                    {scores.home}
                  </div>
                 <Button
                    onClick={(e) => { e.stopPropagation(); addFoul('home'); }}
                    className="mt-2 w-28 mx-auto bg-slate-800 hover:bg-slate-900 text-white py-2 rounded-2xl font-bold uppercase text-xs italic flex flex-col items-center h-auto shadow-md"
                  >
                    <span className="text-sm flex items-center justify-center gap-1.5">🚩 FALTAS</span>
                    <span className="text-4xl font-black leading-none mt-1">{fouls.home}</span>
                  </Button>
              </div>

              <div
                onClick={openScoreEditor}
                className="cursor-pointer p-2 rounded-2xl hover:bg-primary/5 transition-colors flex flex-col justify-between text-center space-y-2"
                title="Haz clic para corregir el marcador"
              >
                <div className="h-16 flex items-center justify-center">
                    <p
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentSide('away');
                        setNewTeamName(teamNames.away);
                        setModal('edit-name');
                      }}
                      className={cn(
                        "font-black text-blue-900 uppercase border-b-2 border-dashed border-blue-900/20 inline-block cursor-pointer px-2",
                        getTeamNameSizeClass(teamNames.away)
                      )}
                    >
                      {teamNames.away}
                    </p>
                  </div>
                  <div className="text-center text-5xl font-black text-gray-800 leading-none py-2">
                    {scores.away}
                  </div>
                <Button
                    onClick={(e) => { e.stopPropagation(); addFoul('away'); }}
                    className="mt-2 w-28 mx-auto bg-slate-800 hover:bg-slate-900 text-white py-2 rounded-2xl font-bold uppercase text-xs italic flex flex-col items-center h-auto shadow-md"
                  >
                    <span className="text-sm flex items-center justify-center gap-1.5">🚩 FALTAS</span>
                    <span className="text-4xl font-black leading-none mt-1">{fouls.away}</span>
                  </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* QUICK ACTION BUTTONS */}
        <div className="grid grid-cols-2 gap-4">
          <Button
            onClick={() => captureTimeAndTrigger('goal', 'home')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white py-6 rounded-3xl font-black shadow-lg uppercase text-[11px] italic leading-tight"
          >
            ⚽ GOL {teamNames.home}
          </Button>
          <Button
            onClick={() => captureTimeAndTrigger('goal', 'away')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white py-6 rounded-3xl font-black shadow-lg uppercase text-[11px] italic leading-tight"
          >
            ⚽ GOL {teamNames.away}
          </Button>
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
            onClick={openNoteModal}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black uppercase text-xs shadow-md italic"
          >
            📝 Anotación de Asesor
          </Button>
          <Button
            onClick={openPenaltyModal}
            className="w-full bg-cyan-600 hover:bg-cyan-700 text-white py-4 rounded-2xl font-black uppercase text-xs shadow-md italic"
          >
            🥅 Tanda de Penales
          </Button>
          <Button
            onClick={() => setModal('info')}
            variant="outline"
            className="w-full bg-white text-primary/90 py-4 rounded-2xl font-black border-2 border-primary/5 uppercase text-xs shadow-sm italic"
          >
            🏟️ Datos del Partido
          </Button>
          <Button
            onClick={openPegiModal}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-4 rounded-2xl font-black uppercase text-xs shadow-md italic"
          >
            🔎 JUGADAS PEGI
          </Button>
          
          <div className="grid grid-cols-2 gap-4">
            <Button
              onClick={() => {
                if (!matchState || matchState.events.length === 0) {
                  toast({
                    title: 'No hay datos suficientes',
                    description: 'Aún no han ocurrido eventos para generar un informe.',
                    variant: 'destructive'
                  });
                  return;
                }
                setIsReportOpen(true);
              }}
              className="w-full bg-slate-700 hover:bg-slate-800 text-white py-5 rounded-2xl font-black uppercase text-sm shadow-xl italic"
            >
              Imagen
            </Button>
            <Button
              onClick={() => {
                 if (!matchState || matchState.events.length === 0) {
                  toast({
                    title: 'No hay datos suficientes',
                    description: 'Aún no han ocurrido eventos para generar un informe.',
                    variant: 'destructive'
                  });
                  return;
                }
                setIsPdfReportOpen(true);
              }}
              className="w-full bg-slate-700 hover:bg-slate-800 text-white py-5 rounded-2xl font-black uppercase text-sm shadow-xl italic"
            >
              PDF
            </Button>
          </div>

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
                className={cn(
                  "flex justify-between p-3 border-b bg-white rounded-lg mb-1 shadow-sm cursor-pointer hover:bg-slate-50",
                  e.side === 'home' ? 'border-l-4 border-l-blue-300' : e.side === 'away' ? 'border-l-4 border-l-green-300' : ''
                )}
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

        <div className="pt-4">
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full bg-white/60"
          >
            Cerrar Sesión
          </Button>
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
            <Button onClick={() => setSelectedGoalType('GOL')} className={cn("text-white", selectedGoalType === 'GOL' ? 'bg-emerald-800 ring-2 ring-white ring-offset-2' : 'bg-emerald-600 hover:bg-emerald-700')}>Gol Normal</Button>
            <Button onClick={() => setSelectedGoalType('PENAL')} className={cn("text-white", selectedGoalType === 'PENAL' ? 'bg-blue-800 ring-2 ring-white ring-offset-2' : 'bg-blue-600 hover:bg-blue-700')}>Penal</Button>
            <Button onClick={() => setSelectedGoalType('AUTOGOL')} className={cn("text-white", selectedGoalType === 'AUTOGOL' ? 'bg-red-800 ring-2 ring-white ring-offset-2' : 'bg-red-600 hover:bg-red-700')}>Autogol</Button>
          </div>
          <Button onClick={() => registerGoal(selectedGoalType)} disabled={!selectedGoalType} className="w-full mt-4 shadow-lg">Confirmar GOL</Button>
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
           <div className="space-y-1 max-h-64 overflow-y-auto p-1">
             <RadioGroup value={selectedCausal ?? ''} onValueChange={setSelectedCausal}>
                {(currentCardTarget === 'jugador' ? (currentCardType === 'amarilla' ? causalesAmarilla : causalesRoja) : causalesStaff).map(c => (
                  <div key={c} className="flex items-center space-x-3 p-2 rounded-md hover:bg-slate-100 cursor-pointer">
                    <RadioGroupItem value={c} id={c} />
                    <Label htmlFor={c} className="font-normal w-full cursor-pointer text-[11px] uppercase">{c}</Label>
                  </div>
                ))}
            </RadioGroup>
           </div>
           <Button onClick={() => registerCard(selectedCausal)} disabled={!selectedCausal} className="w-full mt-4 shadow-lg">Confirmar Tarjeta</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={modal === 'info'} onOpenChange={() => setModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-center uppercase italic text-primary/90">Ficha Técnica</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-4 max-h-[60vh] overflow-y-auto p-1">
            <Input value={matchInfo.advisor} onChange={e => updateMatch({matchInfo: {...matchInfo, advisor: e.target.value}})} placeholder="Nombre Asesor" />
            <Input value={matchInfo.league} onChange={e => updateMatch({matchInfo: {...matchInfo, league: e.target.value}})} placeholder="Torneo / Liga" />
            <Input type="number" value={matchInfo.round} onChange={e => updateMatch({matchInfo: {...matchInfo, round: e.target.value}})} placeholder="Jornada" />
            <Input value={matchInfo.place} onChange={e => updateMatch({matchInfo: {...matchInfo, place: e.target.value}})} placeholder="Lugar" />
            <Input value={matchInfo.date} onChange={e => updateMatch({matchInfo: {...matchInfo, date: e.target.value}})} placeholder="Fecha" />
            <Input value={matchInfo.referee || ''} onChange={e => updateMatch({matchInfo: {...matchInfo, referee: e.target.value}})} placeholder="Árbitro" />
            <Input value={matchInfo.assistant1 || ''} onChange={e => updateMatch({matchInfo: {...matchInfo, assistant1: e.target.value}})} placeholder="Asistente 1" />
            <Input value={matchInfo.assistant2 || ''} onChange={e => updateMatch({matchInfo: {...matchInfo, assistant2: e.target.value}})} placeholder="Asistente 2" />
            <Input value={matchInfo.fourthOfficial || ''} onChange={e => updateMatch({matchInfo: {...matchInfo, fourthOfficial: e.target.value}})} placeholder="Cuarto Árbitro" />
            <Input value={matchInfo.var || ''} onChange={e => updateMatch({matchInfo: {...matchInfo, var: e.target.value}})} placeholder="VAR" />
            <Input value={matchInfo.avar || ''} onChange={e => updateMatch({matchInfo: {...matchInfo, avar: e.target.value}})} placeholder="AVAR" />
          </div>
          <Button onClick={() => setModal(null)} className="w-full mt-6 shadow-lg">Cerrar</Button>
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
          <Input value={newTeamName} onChange={e => setNewTeamName(e.target.value)} className="w-full text-center text-xl font-black border-2 p-4 rounded-2xl uppercase h-auto my-4" maxLength={15} />
          <Button onClick={() => { updateMatch({ teamNames: { ...teamNames, [currentSide]: newTeamName }}); setModal(null); }} className="w-full shadow-lg">Actualizar</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={modal === 'edit-event'} onOpenChange={() => setModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-center uppercase italic text-primary/90">Editar Registro</DialogTitle>
            {matchState.events.find(e => e.id === editingEventId)?.valuation && (
                <DialogDescription className="text-center !mt-2">
                Valoración actual: <span className={cn('font-bold', matchState.events.find(e => e.id === editingEventId)?.valuation === 'correcta' ? 'text-emerald-600' : 'text-red-600' )}>
                    {matchState.events.find(e => e.id === editingEventId)?.valuation?.toUpperCase()}
                </span>
                </DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-[10px] font-black uppercase text-gray-400">Mensaje:</Label>
              <Input value={editEventMsg} onChange={e => setEditEventMsg(e.target.value)} className="font-bold" />
            </div>
             <div>
              <Label className="text-[10px] font-black uppercase text-gray-400">Tiempo:</Label>
              <Input value={editEventTime} onChange={e => setEditEventTime(e.target.value)} className="font-mono font-bold" />
            </div>

            {editEventSide !== undefined && (
              <div>
                <Label className="text-[10px] font-black uppercase text-gray-400">Equipo:</Label>
                <RadioGroup 
                  value={editEventSide} 
                  onValueChange={(value: 'home' | 'away') => setEditEventSide(value)} 
                  className="grid grid-cols-2 gap-4 mt-1"
                >
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="home" id="edit-side-home" />
                        <Label htmlFor="edit-side-home" className="font-normal">{teamNames.home}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="away" id="edit-side-away" />
                        <Label htmlFor="edit-side-away" className="font-normal">{teamNames.away}</Label>
                    </div>
                </RadioGroup>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
               <div className="flex gap-2">
                <Button onClick={saveEventEdit} className="flex-1">Guardar</Button>
                <Button onClick={deleteEvent} variant="destructive" className="px-4">🗑️</Button>
              </div>
              <Button
                variant="outline"
                onClick={() => setModal('edit-pdf-description')}
              >
                Descripción de la jugada (PDF)
              </Button>
              <Button
                variant="outline"
                onClick={() => setModal('edit-valuation')}
              >
                Valoración
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

       <Dialog open={modal === 'edit-pdf-description'} onOpenChange={() => setModal('edit-event')}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-center uppercase italic text-primary/90">Descripción para PDF</DialogTitle>
            <DialogDescription className="text-center pt-2">
              Esta descripción detallada solo aparecerá en el informe PDF.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={editEventPdfDescription}
            onChange={(e) => setEditEventPdfDescription(e.target.value)}
            className="my-4"
            rows={6}
            placeholder="Añade una descripción detallada de la jugada..."
          />
          <Button onClick={() => {
            if (!matchState || editingEventId === null) return;
            const updatedEvents = matchState.events.map(e => 
              e.id === editingEventId 
                ? { ...e, pdfDescription: editEventPdfDescription } 
                : e
            );
            updateMatch({ events: updatedEvents });
            setModal('edit-event');
          }}>
            Guardar Descripción
          </Button>
        </DialogContent>
      </Dialog>
      
      <Dialog open={modal === 'pegi'} onOpenChange={() => setModal(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle className="text-center uppercase italic text-purple-600">Análisis PEGI</DialogTitle>
                <DialogDescription className="text-center pt-2">
                    ¿La jugada es un incidente claro y obvio que el árbitro omitió o erró? (PEGI)
                </DialogDescription>
            </DialogHeader>
            <RadioGroup value={pegiDecision ?? undefined} onValueChange={(value: 'yes' | 'no') => setPegiDecision(value)} className="my-4 grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="pegi-yes" />
                    <Label htmlFor="pegi-yes" className="text-2xl font-black text-emerald-600">SÍ</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="pegi-no" />
                    <Label htmlFor="pegi-no" className="text-2xl font-black text-red-600">NO</Label>
                </div>
            </RadioGroup>

            {pegiDecision === 'yes' && (
                <Textarea 
                    value={pegiDescription}
                    onChange={e => setPegiDescription(e.target.value)}
                    placeholder="Describe brevemente la jugada..."
                    className="mt-2"
                />
            )}
            
            <DialogFooter className="mt-4">
                <Button onClick={handleSavePegi} className="w-full shadow-lg">Aceptar</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
        <DialogContent className="max-w-4xl p-0 bg-transparent border-none shadow-none">
          {isReportOpen && <ReportView matchState={matchState} />}
        </DialogContent>
      </Dialog>

      <Dialog open={isPdfReportOpen} onOpenChange={setIsPdfReportOpen}>
        <DialogContent className="max-w-4xl p-0 bg-transparent border-none shadow-none">
          <PdfReportView matchState={matchState} />
        </DialogContent>
      </Dialog>
      
      <Dialog open={modal === 'edit-score'} onOpenChange={() => setModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-center uppercase italic text-primary/90">Corregir Marcador</DialogTitle>
            <DialogDescription className="text-center pt-2">
                Ajusta los marcadores directamente. Esto registrará un evento de corrección.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 my-4">
            <div className="text-center">
                <Label htmlFor="home-score" className="text-xs font-black text-primary/80 uppercase mb-3">{teamNames.home}</Label>
                <Input
                    id="home-score"
                    type="number"
                    value={manualScores.home}
                    onChange={(e) => setManualScores(s => ({ ...s, home: Math.max(0, parseInt(e.target.value) || 0) }))}
                    className="w-full text-center text-5xl font-black border-2 p-4 rounded-2xl my-2 h-auto"
                />
            </div>
            <div className="text-center">
                <Label htmlFor="away-score" className="text-xs font-black text-primary/80 uppercase mb-3">{teamNames.away}</Label>
                <Input
                    id="away-score"
                    type="number"
                    value={manualScores.away}
                    onChange={(e) => setManualScores(s => ({ ...s, away: Math.max(0, parseInt(e.target.value) || 0) }))}
                     className="w-full text-center text-5xl font-black border-2 p-4 rounded-2xl my-2 h-auto"
                />
            </div>
          </div>
          <Button onClick={() => {
            addEvent('general', `✏️ Marcador corregido a ${manualScores.home} - ${manualScores.away}`, getSmartTime());
            updateMatch({ scores: manualScores });
            setModal(null);
          }} className="w-full shadow-lg">Actualizar Marcador</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={modal === 'edit-valuation'} onOpenChange={() => setModal('edit-event')}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle className="text-center uppercase italic text-primary/90">Valoración de la Jugada</DialogTitle>
                <DialogDescription className="text-center pt-2">
                    Califica la decisión arbitral para esta jugada.
                </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 pt-4">
                <Button onClick={() => handleSetValuation('correcta')} className="bg-emerald-600 hover:bg-emerald-700 text-white">Correcta</Button>
                <Button onClick={() => handleSetValuation('incorrecta')} variant="destructive">Incorrecta</Button>
            </div>
        </DialogContent>
      </Dialog>
      
      <Dialog open={modal === 'penalties'} onOpenChange={() => setModal(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle className="text-center uppercase italic text-cyan-600">Tanda de Penales</DialogTitle>
                <DialogDescription className="text-center pt-2">
                    Registra el resultado de la tanda de penales para el desempate.
                    Este resultado solo se mostrará en los informes si se activa.
                </DialogDescription>
            </DialogHeader>

            <div className="flex items-center justify-center space-x-3 my-4">
                <Label htmlFor="penalty-active" className="font-bold">Mostrar en Informe</Label>
                <Switch
                    id="penalty-active"
                    checked={penaltyShootout?.active ?? false}
                    onCheckedChange={(checked) => {
                        const currentScores = penaltyShootout ?? { home: 0, away: 0, active: false };
                        updateMatch({ penaltyShootout: { ...currentScores, active: checked } });
                    }}
                />
            </div>
            <div className="grid grid-cols-2 gap-4 my-4">
                <div className="text-center">
                    <Label htmlFor="home-penalty-score" className="text-xs font-black text-primary/80 uppercase mb-3">{teamNames.home}</Label>
                    <Input
                        id="home-penalty-score"
                        type="number"
                        value={manualPenaltyScores.home}
                        onChange={(e) => setManualPenaltyScores(s => ({ ...s, home: Math.max(0, parseInt(e.target.value) || 0) }))}
                        className="w-full text-center text-5xl font-black border-2 p-4 rounded-2xl my-2 h-auto"
                    />
                </div>
                <div className="text-center">
                    <Label htmlFor="away-penalty-score" className="text-xs font-black text-primary/80 uppercase mb-3">{teamNames.away}</Label>
                    <Input
                        id="away-penalty-score"
                        type="number"
                        value={manualPenaltyScores.away}
                        onChange={(e) => setManualPenaltyScores(s => ({ ...s, away: Math.max(0, parseInt(e.target.value) || 0) }))}
                        className="w-full text-center text-5xl font-black border-2 p-4 rounded-2xl my-2 h-auto"
                    />
                </div>
            </div>

            <Button onClick={() => {
                const currentPenaltyState = matchState.penaltyShootout ?? { home: 0, away: 0, active: false };
                addEvent('general', `🥅 Tanda de Penales: ${manualPenaltyScores.home} - ${manualPenaltyScores.away}`, 'PEN');
                updateMatch({ penaltyShootout: { ...currentPenaltyState, home: manualPenaltyScores.home, away: manualPenaltyScores.away } });
                setModal(null);
            }} className="w-full shadow-lg">
                Actualizar Marcador de Penales
            </Button>
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
