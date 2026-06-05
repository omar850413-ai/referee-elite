
'use client';
import React, { useState, useRef, useEffect } from 'react';
import { User } from 'firebase/auth';
import { DocumentReference, updateDoc } from 'firebase/firestore';

import { useDoc, errorEmitter, FirestorePermissionError } from '@/firebase';
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
import { MatchEvent, MatchState, Player, UserProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { PdfReportView } from '@/components/report/PdfReportView';
import { ReportView } from '@/components/report/ReportView';
import { Logo } from '@/components/ui/Logo';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Trash2, FileText, UserPlus, LogOut, Settings2, Mic, MicOff, Eraser, Check, Pencil, AlertCircle, Image as ImageIcon, ShieldAlert, Clock, RotateCcw, ChevronLeft } from 'lucide-react';
import { causalesAmarilla, causalesRoja } from '@/lib/causales';

interface MatchPageProps {
  user: User;
  userProfile: UserProfile | null;
  matchDocRef: DocumentReference;
  onBack: () => void;
}

export default function MatchPage({ user, userProfile, matchDocRef, onBack }: MatchPageProps) {
  const { toast } = useToast();
  
  const { data: matchState, isLoading: isMatchLoading } = useDoc<MatchState>(matchDocRef);

  const [modal, setModal] = useState<string | null>(null);
  const [currentSide, setCurrentSide] = useState<'home' | 'away'>('home');
  const [isPdfReportOpen, setIsPdfReportOpen] = useState(false);
  const [isImageReportOpen, setIsImageReportOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<{player: Player, side: 'home' | 'away'} | null>(null);
  const [cardType, setCardType] = useState<'yellow' | 'red' | null>(null);

  const [newPlayerNumber, setNewPlayerNumber] = useState('');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [editPlayerNumber, setEditPlayerNumber] = useState('');
  const [editPlayerName, setEditPlayerName] = useState('');
  
  const [isListening, setIsListening] = useState(false);
  const [tempIncidents, setTempIncidents] = useState('');
  const [currentMinute, setCurrentMinute] = useState('');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);

  useEffect(() => {
    if (modal?.startsWith('sign-')) {
      const timer = setTimeout(() => {
        initCanvas();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [modal]);

  if (isMatchLoading || !matchState) {
    return (
      <div className="p-4 bg-sky-50 min-h-screen flex items-center justify-center">
        <Skeleton className="h-40 w-full max-w-4xl" />
      </div>
    );
  }

  const { teamNames, matchInfo, lineups = { home: [], away: [] }, events = [], signatures = {}, scores } = matchState;

  const updateMatch = (data: Partial<MatchState>) => {
    return updateDoc(matchDocRef, data)
      .catch((error) => {
        const permissionError = new FirestorePermissionError({
          path: matchDocRef.path,
          operation: 'update',
          requestResourceData: data,
        });
        errorEmitter.emit('permission-error', permissionError);
        toast({
          variant: "destructive",
          title: "Error de Sincronización",
          description: "No se pudieron guardar los cambios.",
        });
      });
  };

  const handleResetMatch = () => {
    const advisorName = user.email || '';
    const resetState: Partial<MatchState> = {
      scores: { home: 0, away: 0 },
      fouls: { home: 0, away: 0 },
      teamNames: { home: 'LOCAL', away: 'VISITA' },
      events: [],
      matchInfo: { 
        advisor: advisorName, 
        league: '', 
        round: '', 
        place: '', 
        date: new Date().toISOString().split('T')[0], 
        referee: '', 
        assistant1: '', 
        assistant2: '', 
        fourthOfficial: '', 
        var: '', 
        avar: '' 
      },
      timer: { status: 'NOT_STARTED', startTime: 0, elapsedSeconds: 0, isRunning: false },
      penaltyShootout: { home: 0, away: 0, active: false },
      lineups: { home: [], away: [] },
      staff: { home: [], away: [] },
      signatures: {},
    };

    updateMatch(resetState).then(() => {
      toast({ title: "Partido Reiniciado" });
    });
  };

  const startListening = (target: 'new' | 'edit') => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'es-ES';
      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (target === 'new') setNewPlayerName(transcript.toUpperCase());
        else setEditPlayerName(transcript.toUpperCase());
      };
      recognition.start();
    } catch (e) { setIsListening(false); }
  };

  const handleAddPlayer = (side: 'home' | 'away') => {
    if (!newPlayerNumber || !newPlayerName) return;
    const currentLineups = matchState.lineups || { home: [], away: [] };
    
    // Validar si el número de camiseta ya existe en la alineación del equipo
    const isDuplicateNumber = (currentLineups[side] || []).some(p => p.number === newPlayerNumber);
    if (isDuplicateNumber) {
      toast({
        variant: "destructive",
        title: "NÚMERO REPETIDO",
        description: `EL NÚMERO DE JUGADOR #${newPlayerNumber} YA SE ENCUENTRA REGISTRADO EN LA ALINEACIÓN.`,
      });
      return;
    }

    const startersCount = (currentLineups[side] || []).filter(p => p.type === 'starter').length;
    const type = startersCount < 11 ? 'starter' : 'substitute';

    const player: Player = { id: Date.now().toString(), number: newPlayerNumber, name: newPlayerName.toUpperCase(), type };
    const updatedLineup = [...(currentLineups[side] || []), player];
    
    updateMatch({ lineups: { ...currentLineups, [side]: updatedLineup } });

    // Notificación al completar 11 titulares
    if (type === 'starter') {
      const newStartersCount = updatedLineup.filter(p => p.type === 'starter').length;
      if (newStartersCount === 11) {
        toast({
          title: "ONCE TITULAR COMPLETO",
          description: "HAS REGISTRADO LOS 11 TITULARES. A PARTIR DE AHORA SE INSCRIBIRÁN COMO SUPLENTES.",
        });
      }
    }

    setNewPlayerNumber(''); setNewPlayerName(''); setModal(null);
  };

  const handleUpdatePlayer = () => {
    if (!selectedPlayer || !editPlayerNumber || !editPlayerName) return;
    const { side, player } = selectedPlayer;
    const updatedLineups = { ...matchState.lineups, [side]: matchState.lineups[side].map(p => p.id === player.id ? { ...p, number: editPlayerNumber, name: editPlayerName.toUpperCase() } : p) };
    const updatedEvents = events.map(e => e.side === side && e.playerNumber === player.number ? { ...e, playerNumber: editPlayerNumber, playerName: editPlayerName.toUpperCase() } : e);
    updateMatch({ lineups: updatedLineups, events: updatedEvents });
    setModal('player-actions');
  };

  const handleRemovePlayer = (side: 'home' | 'away', id: string) => {
    const updatedPlayers = matchState.lineups[side].filter(p => p.id !== id);
    updateMatch({ lineups: { ...matchState.lineups, [side]: updatedPlayers } });
    setModal(null);
  };

  const handleAddGoal = (side: 'home' | 'away', player: Player) => {
    const newScores = { ...scores, [side]: (scores[side] || 0) + 1 };
    const timeDisplay = currentMinute ? `${currentMinute}'` : '--';
    const newEvent: MatchEvent = { id: Date.now(), time: timeDisplay, category: 'goals', message: `⚽ GOL #${player.number} ${player.name}${currentMinute ? ` (${currentMinute}')` : ''}`, side, playerNumber: player.number, playerName: player.name };
    updateMatch({ scores: newScores, events: [newEvent, ...events] });
    setCurrentMinute(''); setModal(null);
  };

  const handleAddOwnGoal = (playerSide: 'home' | 'away', player: Player) => {
    const opponentSide = playerSide === 'home' ? 'away' : 'home';
    const newScores = { ...scores, [opponentSide]: (scores[opponentSide] || 0) + 1 };
    const timeDisplay = currentMinute ? `${currentMinute}'` : '--';
    const newEvent: MatchEvent = { id: Date.now(), time: timeDisplay, category: 'goals', message: `🥅 AUTOGOL #${player.number} ${player.name}${currentMinute ? ` (${currentMinute}')` : ''}`, side: playerSide, playerNumber: player.number, playerName: player.name };
    updateMatch({ scores: newScores, events: [newEvent, ...events] });
    setCurrentMinute(''); setModal(null);
  };

  const handleAddCard = (side: 'home' | 'away', player: Player, type: 'yellow' | 'red', causalIdx: number, causalText: string) => {
    const symbol = type === 'yellow' ? '🟨' : '🟥';
    const timeDisplay = currentMinute ? `${currentMinute}'` : '--';
    const newEvent: MatchEvent = { id: Date.now(), time: timeDisplay, category: 'cards', message: `${symbol} #${player.number} ${player.name} - #${causalIdx + 1} ${causalText}${currentMinute ? ` (${currentMinute}')` : ''}`, side, playerNumber: player.number, playerName: player.name };
    updateMatch({ events: [newEvent, ...events] });
    setCurrentMinute(''); setModal('player-actions');
  };

  const handleRemoveEvent = (eventId: number) => {
    const event = events.find(e => e.id === eventId);
    if (!event) return;
    let update: Partial<MatchState> = { events: events.filter(e => e.id !== eventId) };
    if (event.category === 'goals' && event.side) {
      const isOwnGoal = event.message.includes('AUTOGOL');
      const pointSide = isOwnGoal ? (event.side === 'home' ? 'away' : 'home') : event.side;
      update.scores = { ...scores, [pointSide]: Math.max(0, (scores[pointSide] || 0) - 1) };
    }
    updateMatch(update);
  };

  const handleSaveIncidents = () => {
    const otherEvents = events.filter(e => e.category !== 'notes');
    const incidentEvent: MatchEvent = { id: Date.now(), time: '--', category: 'notes', message: `📝 ${tempIncidents}` };
    updateMatch({ events: [incidentEvent, ...otherEvents] });
    setModal(null);
  };

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#000000"; ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.lineJoin = "round";
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
    ctx.beginPath(); ctx.moveTo(x, y);
    isDrawingRef.current = true;
  };

  const draw = (e: React.PointerEvent) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y); ctx.stroke();
  };

  const saveSignature = (type: 'captainHome' | 'captainAway' | 'referee') => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    updateMatch({ signatures: { ...(matchState.signatures || {}), [type]: dataUrl } });
    setModal(null);
  };

  const currentIncidents = events.find(e => e.category === 'notes')?.message.replace('📝 ', '') || '';
  const getPlayerEvents = (side: 'home' | 'away', number: string) => events.filter(e => e.side === side && e.playerNumber === number);

  const renderPlayerTable = (side: 'home' | 'away', players: Player[], title: string) => (
    <div className="mb-4">
      <div className="bg-slate-100 p-2 border-y">
        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{title}</p>
      </div>
      <table className="w-full text-left border-collapse">
        <tbody className="text-sm">
          {players.map((p) => {
            const playerEvs = getPlayerEvents(side, p.number);
            const goalsCount = playerEvs.filter(e => e.category === 'goals' && !e.message.includes('AUTOGOL')).length;
            const ownGoalsCount = playerEvs.filter(e => e.category === 'goals' && e.message.includes('AUTOGOL')).length;
            const yellowCount = playerEvs.filter(e => e.category === 'cards' && e.message.includes('🟨')).length;
            const redCount = playerEvs.filter(e => e.category === 'cards' && e.message.includes('🟥')).length;
            return (
              <tr key={p.id} className="border-b hover:bg-slate-50 cursor-pointer" onClick={() => { setSelectedPlayer({ player: p, side }); setCurrentMinute(''); setModal('player-actions'); }}>
                <td className="p-2 text-center font-bold text-slate-500 w-10">#{p.number}</td>
                <td className="p-2">
                  <div className="flex justify-between items-center pr-2">
                    <p className="font-bold uppercase text-slate-700 text-xs truncate max-w-[150px]">{p.name}</p>
                    <div className="flex gap-4 items-center">
                      {goalsCount > 0 && <span className="text-[11px] font-black text-emerald-600 ml-4">⚽{goalsCount}</span>}
                      {ownGoalsCount > 0 && <span className="text-[11px] font-black text-orange-600 ml-4">🥅{ownGoalsCount}</span>}
                      {yellowCount > 0 && <span className="text-[11px] ml-4">🟨</span>}
                      {redCount > 0 && <span className="text-[11px] ml-4">🟥</span>}
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
              <Button onClick={onBack} variant="ghost" size="sm" className="font-bold text-primary">
                <ChevronLeft className="h-4 w-4 mr-1" /> VOLVER
              </Button>
              <Logo />
            </div>
            <div className="flex items-center gap-2">
               <p className="hidden md:block text-xs font-bold text-slate-400 uppercase italic">Edición: {matchState.title}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="default" size="sm" className="bg-amber-500 hover:bg-amber-600 text-white font-black h-12 shadow-md">
                  <RotateCcw className="h-5 w-5 mr-2" /> REINICIAR
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>¿Reiniciar información?</AlertDialogTitle><AlertDialogDescription>¿Estás seguro de reiniciar los datos del partido?</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleResetMatch}>Aceptar</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button onClick={() => setModal('info')} className="bg-indigo-600 text-white font-black h-12 shadow-md"><Settings2 className="h-5 w-5 mr-2" /> DATOS PARTIDO</Button>
            <Button onClick={() => { setTempIncidents(currentIncidents); setModal('incidents'); }} className="bg-rose-500 text-white font-black h-12 shadow-md"><AlertCircle className="h-5 w-5 mr-2" /> INCIDENTES</Button>
            <Button onClick={() => setIsPdfReportOpen(true)} className="bg-slate-900 text-white font-black h-12 shadow-md"><FileText className="h-5 w-5 mr-2" /> CÉDULA PDF</Button>
            <Button onClick={() => setIsImageReportOpen(true)} className="bg-emerald-500 text-white font-black h-12 shadow-md"><ImageIcon className="h-5 w-5 mr-2" /> IMAGEN</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(['home', 'away'] as const).map(side => (
            <Card key={side} className="border-none shadow-md overflow-hidden">
              <CardHeader className={`${side === 'home' ? 'bg-amber-500' : 'bg-blue-600'} text-white p-4`}>
                <div className="flex justify-between items-center mb-2">
                  <CardTitle className="text-lg font-black uppercase italic">{teamNames[side]}</CardTitle>
                  <Button onClick={() => { setCurrentSide(side); setModal('add-player'); }} variant="secondary" size="sm" className="bg-white text-slate-800 font-bold text-[10px]"><UserPlus className="h-3 w-3 mr-1" /> ALINEACIONES</Button>
                </div>
                <div className="text-center bg-black/20 rounded-lg p-2">
                  <Input type="number" value={scores[side]} onChange={e => updateMatch({ scores: { ...scores, [side]: parseInt(e.target.value) || 0 } })} className="bg-transparent border-none text-center text-4xl font-black text-white h-auto p-0 focus-visible:ring-0" />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {renderPlayerTable(side, lineups[side].slice(0, 11), "Titulares")}
                {renderPlayerTable(side, lineups[side].slice(11), "Suplentes")}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-8 pt-6 pb-10">
          {(['captainHome', 'referee', 'captainAway'] as const).map(type => (
            <div key={type} className="text-center">
              <button onClick={() => setModal(`sign-${type}`)} className="border-2 border-dashed border-slate-300 w-full h-24 mb-2 flex items-center justify-center hover:bg-slate-100 rounded-xl bg-white overflow-hidden">
                {signatures[type] ? <img src={signatures[type]} className="max-h-full" /> : <span className="text-slate-300 italic text-[10px]">FIRMA {type.toUpperCase()}</span>}
              </button>
              <p className="text-[8px] font-black uppercase text-slate-400">{type === 'referee' ? 'Árbitro Central' : `Capitán ${type.includes('Home') ? 'Local' : 'Visitante'}`}</p>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={modal === 'add-player'} onOpenChange={() => setModal(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader><DialogTitle className="text-center font-black uppercase">Inscribir Jugador</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <Input type="number" placeholder="00" className="text-2xl h-14 text-center font-black" value={newPlayerNumber} onChange={e => setNewPlayerNumber(e.target.value)} />
            <div className="relative"><Input placeholder="Nombre completo" className="uppercase font-bold pr-10" value={newPlayerName} onChange={e => setNewPlayerName(e.target.value)} /><button onClick={() => startListening('new')} className={`absolute right-2 top-1/2 -translate-y-1/2 ${isListening ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}>{isListening ? <MicOff size={20} /> : <Mic size={20} />}</button></div>
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
                <div className="space-y-2"><Label className="flex items-center gap-2 text-xs font-black uppercase text-slate-400"><Clock size={14} /> Minuto (Opcional)</Label><Input type="number" placeholder="Min" className="h-10 text-center font-bold" value={currentMinute} onChange={e => setCurrentMinute(e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-3"><Button onClick={() => handleAddGoal(selectedPlayer.side, selectedPlayer.player)} className="h-16 font-black bg-emerald-600 text-white">⚽ GOL</Button><Button onClick={() => handleAddOwnGoal(selectedPlayer.side, selectedPlayer.player)} className="h-16 font-black bg-orange-600 text-white">🥅 AUTOGOL</Button></div>
                <div className="grid grid-cols-2 gap-3"><Button onClick={() => { setCardType('yellow'); setModal('causales'); }} className="h-14 font-black bg-yellow-400 text-yellow-900">🟨 AMARILLA</Button><Button onClick={() => { setCardType('red'); setModal('causales'); }} className="h-14 font-black bg-red-600 text-white">🟥 ROJA</Button></div>
                
                <div className="border-t pt-4"><p className="text-[10px] font-black text-slate-400 uppercase mb-2">Eventos</p>
                  {getPlayerEvents(selectedPlayer.side, selectedPlayer.player.number).map(ev => (
                    <div key={ev.id} className="flex justify-between items-center p-2 bg-slate-50 border rounded-lg mb-1"><span className="text-[11px] font-bold">{ev.message}</span><Button variant="ghost" size="icon" className="h-6 w-6 text-red-400" onClick={() => handleRemoveEvent(ev.id)}><Trash2 size={12} /></Button></div>
                  ))}
                </div>

                <div className="border-t pt-4 grid grid-cols-2 gap-3">
                  <Button 
                    onClick={() => { 
                      setEditPlayerNumber(selectedPlayer.player.number); 
                      setEditPlayerName(selectedPlayer.player.name); 
                      setModal('edit-player'); 
                    }} 
                    variant="outline" 
                    className="h-10 font-bold border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-[11px]"
                  >
                    <Pencil className="h-4 w-4 mr-1.5" /> EDITAR JUGADOR
                  </Button>
                  <Button 
                    onClick={() => { 
                      if (confirm(`¿Estás seguro de eliminar a ${selectedPlayer.player.name}?`)) {
                        handleRemovePlayer(selectedPlayer.side, selectedPlayer.player.id); 
                      }
                    }} 
                    variant="outline" 
                    className="h-10 font-bold border-red-200 text-red-600 hover:bg-red-50 text-[11px]"
                  >
                    <Trash2 className="h-4 w-4 mr-1.5" /> ELIMINAR
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={modal === 'edit-player'} onOpenChange={() => setModal('player-actions')}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader><DialogTitle className="text-center font-black uppercase">Editar Jugador</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase text-slate-400">Número</Label>
              <Input type="number" placeholder="00" className="text-2xl h-14 text-center font-black" value={editPlayerNumber} onChange={e => setEditPlayerNumber(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase text-slate-400">Nombre completo</Label>
              <div className="relative">
                <Input placeholder="Nombre completo" className="uppercase font-bold pr-10" value={editPlayerName} onChange={e => setEditPlayerName(e.target.value)} />
                <button onClick={() => startListening('edit')} className={`absolute right-2 top-1/2 -translate-y-1/2 ${isListening ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}>
                  {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                </button>
              </div>
            </div>
            <Button onClick={handleUpdatePlayer} className="w-full h-12 font-black bg-indigo-600 text-white uppercase shadow-md">GUARDAR CAMBIOS</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={modal === 'causales'} onOpenChange={() => setModal('player-actions')}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-black uppercase">Causales - #{selectedPlayer?.player.number}</DialogTitle></DialogHeader>
          <div className="space-y-2 py-4">{(cardType === 'yellow' ? causalesAmarilla : causalesRoja).map((causal, idx) => (<Button key={idx} variant="outline" className="w-full justify-start text-left h-auto py-2 text-xs" onClick={() => handleAddCard(selectedPlayer!.side, selectedPlayer!.player, cardType!, idx, causal)}><span className="font-bold mr-2 text-primary">#{idx + 1}</span> {causal}</Button>))}</div>
        </DialogContent>
      </Dialog>

      <Dialog open={modal === 'incidents'} onOpenChange={() => setModal(null)}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader><DialogTitle className="font-black uppercase">Incidentes</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4"><Textarea className="min-h-[200px]" value={tempIncidents} onChange={e => setTempIncidents(e.target.value)} /><Button onClick={handleSaveIncidents} className="w-full font-bold bg-primary text-white">GUARDAR</Button></div>
        </DialogContent>
      </Dialog>

      <Dialog open={modal?.startsWith('sign-')} onOpenChange={() => setModal(null)}>
        <DialogContent className="max-w-md p-0 overflow-hidden"><DialogHeader className="p-4 bg-slate-50 border-b"><DialogTitle className="text-center font-black uppercase">Firma</DialogTitle></DialogHeader><div className="p-4 space-y-4"><div className="bg-white border-2 border-dashed rounded-xl overflow-hidden touch-none relative"><canvas ref={canvasRef} width={800} height={400} className="w-full h-48 cursor-crosshair" onPointerDown={startDrawing} onPointerMove={draw} onPointerUp={() => isDrawingRef.current = false} style={{ touchAction: 'none' }} /></div><div className="flex gap-2"><Button variant="outline" onClick={initCanvas} className="flex-1 font-bold">LIMPIAR</Button><Button onClick={() => saveSignature(modal!.split('-')[1] as any)} className="flex-1 bg-emerald-600 text-white font-bold">GUARDAR</Button></div></div></DialogContent>
      </Dialog>

      <Dialog open={modal === 'info'} onOpenChange={() => setModal(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-black uppercase">Datos Generales</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Título del Reporte</Label><Input value={matchState.title} onChange={e => updateMatch({title: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4"><div><Label>Local</Label><Input value={teamNames.home} onChange={e => updateMatch({teamNames: {...teamNames, home: e.target.value.toUpperCase()}})} /></div><div><Label>Visita</Label><Input value={teamNames.away} onChange={e => updateMatch({teamNames: {...teamNames, away: e.target.value.toUpperCase()}})} /></div></div>
            <Input value={matchInfo.league} onChange={e => updateMatch({matchInfo: {...matchInfo, league: e.target.value}})} placeholder="Liga" />
            <div className="grid grid-cols-2 gap-4"><Input value={matchInfo.round} onChange={e => updateMatch({matchInfo: {...matchInfo, round: e.target.value}})} placeholder="Jornada" /><Input value={matchInfo.place} onChange={e => updateMatch({matchInfo: {...matchInfo, place: e.target.value}})} placeholder="Campo" /></div>
            <Input type="date" value={matchInfo.date} onChange={e => updateMatch({matchInfo: {...matchInfo, date: e.target.value}})} />
            <div className="border-t pt-4 space-y-2"><Input value={matchInfo.referee} onChange={e => updateMatch({matchInfo: {...matchInfo, referee: e.target.value}})} placeholder="Árbitro Central" /><Input value={matchInfo.assistant1} onChange={e => updateMatch({matchInfo: {...matchInfo, assistant1: e.target.value}})} placeholder="Asistente 1" /><Input value={matchInfo.assistant2} onChange={e => updateMatch({matchInfo: {...matchInfo, assistant2: e.target.value}})} placeholder="Asistente 2" /></div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isPdfReportOpen} onOpenChange={setIsPdfReportOpen}><DialogContent className="max-w-5xl h-[95vh] p-0 overflow-auto bg-transparent border-none"><PdfReportView matchState={matchState} /></DialogContent></Dialog>
      <Dialog open={isImageReportOpen} onOpenChange={setIsImageReportOpen}><DialogContent className="max-w-5xl p-0 bg-transparent border-none"><ReportView matchState={matchState} /></DialogContent></Dialog>
    </div>
  );
}
