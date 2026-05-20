'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';

import { useUser, useFirestore, useDoc, useMemoFirebase, useAuth, errorEmitter, FirestorePermissionError } from '@/firebase';
import { MatchEvent, MatchState, Player, UserProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { PdfReportView } from '@/components/report/PdfReportView';
import { ReportView } from '@/components/report/ReportView';
import { Logo } from '@/components/ui/Logo';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Plus, Trash2, FileText, UserPlus, LogOut, Settings2, Mic, MicOff, AlertCircle, Image as ImageIcon, ShieldAlert, Clock, RotateCcw, ChevronLeft } from 'lucide-react';
import { causalesAmarilla, causalesRoja } from '@/lib/causales';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();

  const [modal, setModal] = useState<string | null>(null);
  const [currentSide, setCurrentSide] = useState<'home' | 'away'>('home');
  const [isPdfReportOpen, setIsPdfReportOpen] = useState(false);
  const [isImageReportOpen, setIsImageReportOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<{player: Player, side: 'home' | 'away'} | null>(null);
  const [cardType, setCardType] = useState<'yellow' | 'red' | null>(null);
  const [newPlayerNumber, setNewPlayerNumber] = useState('');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [tempIncidents, setTempIncidents] = useState('');
  const [currentMinute, setCurrentMinute] = useState('');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);

  const userProfileRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const matchRef = useMemoFirebase(
    () => (user ? doc(firestore, 'matches', user.uid) : null),
    [user, firestore]
  );
  const { data: matchState, isLoading: isMatchLoading } = useDoc<MatchState>(matchRef);

  useEffect(() => {
    if (isUserLoading || isProfileLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    const isSuperAdmin = user.email === 'omar850413@gmail.com';
    if (!isSuperAdmin && !userProfile?.isApproved) {
      router.push('/pending-approval');
    }
  }, [user, userProfile, isUserLoading, isProfileLoading, router]);

  useEffect(() => {
    if (modal?.startsWith('sign-')) {
      const timer = setTimeout(() => initCanvas(), 200);
      return () => clearTimeout(timer);
    }
  }, [modal]);

  const updateMatch = (data: Partial<MatchState>) => {
    if (!matchRef) return;
    updateDoc(matchRef, data).catch((error) => {
      const permissionError = new FirestorePermissionError({
        path: matchRef.path,
        operation: 'update',
        requestResourceData: data,
      });
      errorEmitter.emit('permission-error', permissionError);
    });
  };

  const handleResetMatch = () => {
    if (!matchRef || !user) return;
    const advisorName = user.email?.toUpperCase() || '';
    const resetState: MatchState = {
      title: 'INFORME ARBITRAL',
      scores: { home: 0, away: 0 },
      fouls: { home: 0, away: 0 },
      teamNames: { home: 'LOCAL', away: 'VISITA' },
      events: [],
      matchInfo: { advisor: advisorName, league: '', round: '', place: '', date: new Date().toISOString().split('T')[0], referee: '', assistant1: '', assistant2: '', fourthOfficial: '', var: '', avar: '' },
      timer: { status: 'NOT_STARTED', startTime: 0, elapsedSeconds: 0, isRunning: false },
      penaltyShootout: { home: 0, away: 0, active: false },
      lineups: { home: [], away: [] },
      staff: { home: [], away: [] },
      signatures: {},
      ownerId: user.uid
    };
    setDoc(matchRef, resetState).then(() => {
      toast({ title: "Información Reiniciada" });
      setModal(null);
    });
  };

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  };

  const getCoordinates = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDrawing = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    isDrawingRef.current = true;
  };

  const draw = (e: React.PointerEvent) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const saveSignature = (type: 'captainHome' | 'captainAway' | 'referee') => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    updateMatch({ signatures: { ...(matchState?.signatures || {}), [type]: dataUrl } });
    setModal(null);
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'es-ES';
      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setNewPlayerName(transcript.toUpperCase());
      };
      recognition.start();
    } catch (e) { setIsListening(false); }
  };

  const handleAddPlayer = (side: 'home' | 'away') => {
    if (!newPlayerNumber || !newPlayerName || !matchState) return;
    const player: Player = { id: Date.now().toString(), number: newPlayerNumber, name: newPlayerName.toUpperCase(), type: 'starter' };
    const currentLineups = matchState.lineups || { home: [], away: [] };
    updateMatch({ lineups: { ...currentLineups, [side]: [...currentLineups[side], player] } });
    setNewPlayerNumber(''); setNewPlayerName(''); setModal(null);
  };

  const handleAddGoal = (side: 'home' | 'away', player: Player) => {
    if (!matchState) return;
    const newScores = { ...matchState.scores, [side]: (matchState.scores[side] || 0) + 1 };
    const timeDisplay = currentMinute ? `${currentMinute}'` : '--';
    const newEvent: MatchEvent = { id: Date.now(), time: timeDisplay, category: 'goals', message: `⚽ GOL #${player.number} ${player.name}${currentMinute ? ` (${currentMinute}')` : ''}`, side, playerNumber: player.number, playerName: player.name };
    updateMatch({ scores: newScores, events: [newEvent, ...(matchState.events || [])] });
    setCurrentMinute(''); setModal(null);
  };

  const handleAddOwnGoal = (playerSide: 'home' | 'away', player: Player) => {
    if (!matchState) return;
    const opponentSide = playerSide === 'home' ? 'away' : 'home';
    const newScores = { ...matchState.scores, [opponentSide]: (matchState.scores[opponentSide] || 0) + 1 };
    const timeDisplay = currentMinute ? `${currentMinute}'` : '--';
    const newEvent: MatchEvent = { id: Date.now(), time: timeDisplay, category: 'goals', message: `🥅 AUTOGOL #${player.number} ${player.name}${currentMinute ? ` (${currentMinute}')` : ''}`, side: playerSide, playerNumber: player.number, playerName: player.name };
    updateMatch({ scores: newScores, events: [newEvent, ...(matchState.events || [])] });
    setCurrentMinute(''); setModal(null);
  };

  const handleAddCard = (side: 'home' | 'away', player: Player, type: 'yellow' | 'red', causalIdx: number, causalText: string) => {
    if (!matchState) return;
    const symbol = type === 'yellow' ? '🟨' : '🟥';
    const timeDisplay = currentMinute ? `${currentMinute}'` : '--';
    const newEvent: MatchEvent = { id: Date.now(), time: timeDisplay, category: 'cards', message: `${symbol} #${player.number} ${player.name} - #${causalIdx + 1} ${causalText.toUpperCase()}${currentMinute ? ` (${currentMinute}')` : ''}`, side, playerNumber: player.number, playerName: player.name };
    updateMatch({ events: [newEvent, ...(matchState.events || [])] });
    setCurrentMinute(''); setModal('player-actions');
  };

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.removeItem('sessionId');
    router.push('/login');
  };

  if (isUserLoading || isProfileLoading || isMatchLoading) {
    return <div className="p-4 bg-sky-50 min-h-screen flex items-center justify-center"><Skeleton className="h-40 w-full max-w-4xl" /></div>;
  }

  if (!matchState) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-sky-50 p-4">
        <Logo className="mb-8" />
        <Card className="w-full max-w-md text-center">
          <CardHeader><CardTitle>BIENVENIDO A REFEREE ELITE</CardTitle></CardHeader>
          <CardContent>
            <p className="mb-6 text-slate-500">PRESIONA EL BOTÓN PARA INICIAR TU PRIMER REPORTE ARBITRAL.</p>
            <Button onClick={handleResetMatch} className="w-full bg-primary h-12 font-black italic uppercase">COMENZAR REPORTE</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { teamNames, matchInfo, lineups = { home: [], away: [] }, events = [], signatures = {}, scores } = matchState;
  const isAdmin = userProfile?.isAdmin || user?.email === 'omar850413@gmail.com';

  const renderPlayerTable = (side: 'home' | 'away', players: Player[], title: string) => (
    <div className="mb-4">
      <div className="bg-slate-100 p-2 border-y"><p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{title}</p></div>
      <table className="w-full text-left border-collapse">
        <tbody className="text-sm">
          {players.map((p) => {
            const playerEvs = events.filter(e => e.side === side && e.playerNumber === p.number);
            const goals = playerEvs.filter(e => e.category === 'goals' && !e.message.includes('AUTOGOL')).length;
            const ownGoals = playerEvs.filter(e => e.category === 'goals' && e.message.includes('AUTOGOL')).length;
            const yellow = playerEvs.some(e => e.category === 'cards' && e.message.includes('🟨'));
            const red = playerEvs.some(e => e.category === 'cards' && e.message.includes('🟥'));
            return (
              <tr key={p.id} className="border-b hover:bg-slate-50 cursor-pointer" onClick={() => { setSelectedPlayer({ player: p, side }); setModal('player-actions'); }}>
                <td className="p-2 text-center font-bold text-slate-400 w-10">#{p.number}</td>
                <td className="p-2">
                  <div className="flex justify-between items-center">
                    <p className="font-bold uppercase text-slate-700 text-xs">{p.name}</p>
                    <div className="flex gap-4 items-center">
                      {goals > 0 && <span className="text-[11px] font-black text-emerald-600">⚽{goals}</span>}
                      {ownGoals > 0 && <span className="text-[11px] font-black text-orange-600">🥅{ownGoals}</span>}
                      {yellow && <span className="text-[11px]">🟨</span>}
                      {red && <span className="text-[11px]">🟥</span>}
                    </div>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="p-2 md:p-6 bg-slate-50 min-h-screen font-sans text-slate-900">
      <div className="max-w-5xl mx-auto space-y-4">
        
        <div className="flex flex-col gap-4 bg-white p-4 rounded-xl shadow-sm border">
          <div className="flex justify-between items-center w-full">
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
            <Button onClick={handleLogout} variant="ghost" size="sm" className="text-red-500 font-bold"><LogOut className="h-4 w-4 mr-1" /> SALIR</Button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Button onClick={() => setModal('info')} className="bg-indigo-600 text-white font-black h-12 shadow-md"><Settings2 className="h-5 w-5 mr-2" /> DATOS PARTIDO</Button>
            <Button onClick={() => { setTempIncidents(events.find(e => e.category === 'notes')?.message.replace('📝 ', '') || ''); setModal('incidents'); }} className="bg-rose-500 text-white font-black h-12 shadow-md"><AlertCircle className="h-5 w-5 mr-2" /> INCIDENTES</Button>
            <Button onClick={() => setIsPdfReportOpen(true)} className="bg-slate-900 text-white font-black h-12 shadow-md">PDF</Button>
            <Button onClick={() => setIsImageReportOpen(true)} className="bg-emerald-500 text-white font-black h-12 shadow-md">IMAGEN</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(['home', 'away'] as const).map(side => (
            <Card key={side} className="border-none shadow-md overflow-hidden">
              <CardHeader className={`${side === 'home' ? 'bg-amber-500' : 'bg-blue-600'} text-white p-4`}>
                <div className="flex justify-between items-center mb-2">
                  <CardTitle className="text-lg font-black uppercase italic">{teamNames[side]}</CardTitle>
                  <Button onClick={() => { setCurrentSide(side); setModal('add-player'); }} variant="secondary" size="sm" className="bg-white text-slate-800 font-bold text-[10px]"><UserPlus className="h-3 w-3 mr-1" /> JUGADOR</Button>
                </div>
                <div className="text-center bg-black/20 rounded-lg p-2">
                  <Input type="number" value={scores[side]} onChange={e => updateMatch({ scores: { ...scores, [side]: parseInt(e.target.value) || 0 } })} className="bg-transparent border-none text-center text-4xl font-black text-white h-auto p-0 focus-visible:ring-0" />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {renderPlayerTable(side, lineups[side].slice(0, 11), "TITULARES")}
                {renderPlayerTable(side, lineups[side].slice(11), "SUPLENTES")}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-8 pt-6 pb-4">
          {(['captainHome', 'referee', 'captainAway'] as const).map(type => (
            <div key={type} className="text-center">
              <button onClick={() => setModal(`sign-${type}`)} className="border-2 border-dashed border-slate-300 w-full h-24 mb-2 flex items-center justify-center hover:bg-slate-100 rounded-xl bg-white overflow-hidden">
                {signatures[type] ? <img src={signatures[type]} className="max-h-full" /> : <span className="text-slate-300 italic text-[10px]">FIRMA {type.toUpperCase()}</span>}
              </button>
              <p className="text-[8px] font-black uppercase text-slate-400">{type === 'referee' ? 'ÁRBITRO CENTRAL' : `CAPITÁN ${type.includes('Home') ? 'LOCAL' : 'VISITANTE'}`}</p>
            </div>
          ))}
        </div>

        <div className="flex justify-center pt-10 pb-10">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="font-black gap-2 opacity-60 hover:opacity-100 transition-opacity">
                <RotateCcw className="h-4 w-4" /> REINICIAR REPORTE
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿REINICIAR INFORMACIÓN?</AlertDialogTitle>
                <AlertDialogDescription>
                  ¿ESTÁS SEGURO DE REINICIAR LOS DATOS DEL PARTIDO? ESTA ACCIÓN NO SE PUEDE DESHACER.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>CANCELAR</AlertDialogCancel>
                <AlertDialogAction onClick={handleResetMatch} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">ACEPTAR</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Dialog open={modal === 'add-player'} onOpenChange={() => setModal(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader><DialogTitle className="text-center font-black uppercase">INSCRIBIR JUGADOR</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <Input type="number" placeholder="00" className="text-2xl h-14 text-center font-black" value={newPlayerNumber} onChange={e => setNewPlayerNumber(e.target.value)} />
            <div className="relative">
              <Input placeholder="NOMBRE COMPLETO" className="uppercase font-bold pr-10" value={newPlayerName} onChange={e => setNewPlayerName(e.target.value.toUpperCase())} />
              <button onClick={startListening} className={`absolute right-2 top-1/2 -translate-y-1/2 ${isListening ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}>
                {isListening ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
            </div>
            <Button onClick={() => handleAddPlayer(currentSide)} className="w-full h-12 font-black bg-primary text-white">AGREGAR</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={modal === 'player-actions'} onOpenChange={() => setModal(null)}>
        <DialogContent className="max-w-sm rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
          {selectedPlayer && (
            <div className="flex flex-col">
              <div className={`p-6 text-white text-center ${selectedPlayer.side === 'home' ? 'bg-amber-500' : 'bg-blue-600'}`}><p className="text-4xl font-black">#{selectedPlayer.player.number}</p><p className="text-xl font-bold uppercase italic">{selectedPlayer.player.name}</p></div>
              <div className="p-6 space-y-4 bg-white">
                <div className="space-y-2"><Label className="flex items-center gap-2 text-xs font-black uppercase text-slate-400"><Clock size={14} /> MINUTO (OPCIONAL)</Label><Input type="number" placeholder="MIN" className="h-10 text-center font-bold" value={currentMinute} onChange={e => setCurrentMinute(e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-3"><Button onClick={() => handleAddGoal(selectedPlayer.side, selectedPlayer.player)} className="h-16 font-black bg-emerald-600 text-white">⚽ GOL</Button><Button onClick={() => handleAddOwnGoal(selectedPlayer.side, selectedPlayer.player)} className="h-16 font-black bg-orange-600 text-white">🥅 AUTOGOL</Button></div>
                <div className="grid grid-cols-2 gap-3"><Button onClick={() => { setCardType('yellow'); setModal('causales'); }} className="h-14 font-black bg-yellow-400 text-yellow-900">🟨 AMONESTACION</Button><Button onClick={() => { setCardType('red'); setModal('causales'); }} className="h-14 font-black bg-red-600 text-white">🟥 EXPULSION</Button></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={modal === 'causales'} onOpenChange={() => setModal('player-actions')}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-black uppercase">CAUSALES - #{selectedPlayer?.player.number}</DialogTitle></DialogHeader>
          <div className="space-y-2 py-4">{(cardType === 'yellow' ? causalesAmarilla : causalesRoja).map((causal, idx) => (<Button key={idx} variant="outline" className="w-full justify-start text-left h-auto py-2 text-xs" onClick={() => handleAddCard(selectedPlayer!.side, selectedPlayer!.player, cardType!, idx, causal)}><span className="font-bold mr-2 text-primary">#{idx + 1}</span> {causal.toUpperCase()}</Button>))}</div>
        </DialogContent>
      </Dialog>

      <Dialog open={modal === 'incidents'} onOpenChange={() => setModal(null)}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader><DialogTitle className="font-black uppercase">INCIDENTES</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4"><Textarea className="min-h-[200px]" value={tempIncidents} onChange={e => setTempIncidents(e.target.value.toUpperCase())} /><Button onClick={() => { updateMatch({ events: [ { id: Date.now(), time: '--', category: 'notes', message: `📝 ${tempIncidents.toUpperCase()}` }, ...events.filter(e => e.category !== 'notes') ] }); setModal(null); }} className="w-full font-bold bg-primary text-white">GUARDAR</Button></div>
        </DialogContent>
      </Dialog>

      <Dialog open={modal?.startsWith('sign-')} onOpenChange={() => setModal(null)}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <DialogHeader className="p-4 bg-slate-50 border-b">
            <DialogTitle className="text-center font-black uppercase">FIRMA</DialogTitle>
          </DialogHeader>
          <div className="p-4 space-y-4">
            <div className="bg-white border-2 border-dashed rounded-xl overflow-hidden touch-none relative">
              <canvas 
                ref={canvasRef} 
                width={800} 
                height={400} 
                className="w-full h-48 cursor-crosshair" 
                onPointerDown={startDrawing} 
                onPointerMove={draw} 
                onPointerUp={() => isDrawingRef.current = false} 
                onPointerLeave={() => isDrawingRef.current = false}
                style={{ touchAction: 'none' }} 
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={initCanvas} className="flex-1 font-bold">LIMPIAR</Button>
              <Button onClick={() => saveSignature(modal!.split('-')[1] as any)} className="flex-1 bg-emerald-600 text-white font-bold">GUARDAR</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={modal === 'info'} onOpenChange={() => setModal(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-black uppercase">DATOS GENERALES</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4"><div><Label>LOCAL</Label><Input value={teamNames.home} onChange={e => updateMatch({teamNames: {...teamNames, home: e.target.value.toUpperCase()}})} /></div><div><Label>VISITA</Label><Input value={teamNames.away} onChange={e => updateMatch({teamNames: {...teamNames, away: e.target.value.toUpperCase()}})} /></div></div>
            <Input value={matchInfo.league} onChange={e => updateMatch({matchInfo: {...matchInfo, league: e.target.value.toUpperCase()}})} placeholder="LIGA" />
            <div className="grid grid-cols-2 gap-4"><Input value={matchInfo.round} onChange={e => updateMatch({matchInfo: {...matchInfo, round: e.target.value.toUpperCase()}})} placeholder="JORNADA" /><Input value={matchInfo.place} onChange={e => updateMatch({matchInfo: {...matchInfo, place: e.target.value.toUpperCase()}})} placeholder="CAMPO" /></div>
            <Input type="date" value={matchInfo.date} onChange={e => updateMatch({matchInfo: {...matchInfo, date: e.target.value}})} />
            <div className="border-t pt-4 space-y-2"><Input value={matchInfo.referee} onChange={e => updateMatch({matchInfo: {...matchInfo, referee: e.target.value.toUpperCase()}})} placeholder="ÁRBITRO CENTRAL" /><Input value={matchInfo.assistant1} onChange={e => updateMatch({matchInfo: {...matchInfo, assistant1: e.target.value.toUpperCase()}})} placeholder="ASISTENTE 1" /><Input value={matchInfo.assistant2} onChange={e => updateMatch({matchInfo: {...matchInfo, assistant2: e.target.value.toUpperCase()}})} placeholder="ASISTENTE 2" /></div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isPdfReportOpen} onOpenChange={setIsPdfReportOpen}><DialogContent className="max-w-5xl h-[95vh] p-0 overflow-auto bg-transparent border-none"><PdfReportView matchState={matchState} /></DialogContent></Dialog>
      <Dialog open={isImageReportOpen} onOpenChange={setIsImageReportOpen}><DialogContent className="max-w-5xl p-0 bg-transparent border-none"><ReportView matchState={matchState} /></DialogContent></Dialog>
    </div>
  );
}
