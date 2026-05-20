'use client';
import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, signOut } from 'firebase/auth';
import { DocumentReference, updateDoc } from 'firebase/firestore';

import { useAuth, useDoc, errorEmitter, FirestorePermissionError } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MatchEvent, MatchState, Player, UserProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { PdfReportView } from '@/components/report/PdfReportView';
import { Logo } from '@/components/ui/Logo';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Trash2, FileText, UserPlus, LogOut, Settings2, Mic, MicOff, Eraser, Check } from 'lucide-react';

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

  const [modal, setModal] = useState<string | null>(null);
  const [currentSide, setCurrentSide] = useState<'home' | 'away'>('home');
  const [isPdfReportOpen, setIsPdfReportOpen] = useState(false);

  // Form states
  const [newPlayerNumber, setNewPlayerNumber] = useState('');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [isListening, setIsListening] = useState(false);

  // Signature state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

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

  // Voice Dictation
  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: "No soportado", description: "El dictado no es compatible con este navegador." });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setNewPlayerName(transcript.toUpperCase());
    };
    recognition.start();
  };

  const handleAddPlayer = (side: 'home' | 'away') => {
    if (!matchState || !newPlayerNumber || !newPlayerName) return;
    const lineups = matchState.lineups || { home: [], away: [] };
    const player: Player = { id: Date.now().toString(), number: newPlayerNumber, name: newPlayerName.toUpperCase(), type: 'starter' };
    const updatedLineups = { ...lineups, [side]: [...lineups[side], player] };
    updateMatch({ lineups: updatedLineups });
    setNewPlayerNumber('');
    setNewPlayerName('');
    setModal(null);
  };

  const handleRemovePlayer = (side: 'home' | 'away', id: string) => {
    const lineups = matchState!.lineups || { home: [], away: [] };
    const updatedPlayers = lineups[side].filter(p => p.id !== id);
    updateMatch({ lineups: { ...lineups, [side]: updatedPlayers } });
  };

  const handleAddGoal = (side: 'home' | 'away', player: Player) => {
    if (!matchState) return;
    const currentScores = matchState.scores || { home: 0, away: 0 };
    const newScores = { ...currentScores, [side]: (currentScores[side] || 0) + 1 };
    
    const newEvent: MatchEvent = {
      id: Date.now(),
      time: '--',
      category: 'goals',
      message: `⚽ GOL #${player.number} ${player.name}`,
      side: side,
      playerNumber: player.number,
      playerName: player.name
    };

    updateMatch({ 
      scores: newScores,
      events: [newEvent, ...(matchState.events || [])]
    });
    
    toast({ title: `Gol registrado para #${player.number}` });
  };

  // Signature Canvas Logic
  const startDrawing = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.PointerEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveSignature = (type: 'captain' | 'referee') => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL();
    const signatures = matchState?.signatures || {};
    updateMatch({ signatures: { ...signatures, [type]: dataUrl } });
    setModal(null);
    toast({ title: "Firma guardada correctamente" });
  };

  const handleLogout = async () => {
    localStorage.removeItem('sessionId');
    await signOut(auth);
    router.push('/login');
  };
  
  const isAdmin = userProfile?.isAdmin || user?.email === 'omar850413@gmail.com';

  if (isMatchLoading || !matchState) {
    return (
      <div className="p-4 bg-sky-50 min-h-screen flex items-center justify-center">
        <Skeleton className="h-40 w-full max-w-4xl" />
      </div>
    );
  }

  const { teamNames, matchInfo, lineups = { home: [], away: [] }, events = [], signatures = {} } = matchState;

  const getPlayerGoals = (side: 'home' | 'away', number: string) => {
    return events.filter(e => e.side === side && e.playerNumber === number && e.category === 'goals').length;
  };

  return (
    <div className="p-2 md:p-6 bg-slate-50 min-h-screen font-sans text-slate-900">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* HEADER & NAV */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border">
          <Logo className="scale-110" />
          <div className="flex gap-2 flex-wrap justify-center">
            <Button onClick={() => setModal('info')} variant="outline" size="sm" className="font-bold border-2">
              <Settings2 className="h-4 w-4 mr-2" /> DATOS DEL PARTIDO
            </Button>
            <Button onClick={() => setIsPdfReportOpen(true)} variant="default" size="sm" className="bg-slate-800 font-bold">
              <FileText className="h-4 w-4 mr-2" /> GENERAR CÉDULA PDF
            </Button>
            {isAdmin && (
              <Link href="/admin">
                <Button variant="secondary" size="sm">Admin</Button>
              </Link>
            )}
            <Button onClick={handleLogout} variant="ghost" size="sm" className="text-red-500">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* INFO CÉDULA DISPLAY */}
        <div className="bg-white p-4 rounded-xl border-t-4 border-primary shadow-sm text-center">
          <h1 className="text-xl font-black uppercase italic text-slate-700">Informe de Árbitro</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
            {matchInfo.league || 'LIGA'} | JORNADA {matchInfo.round || 'S/N'} | {matchInfo.date || 'FECHA'}
          </p>
        </div>

        {/* MAIN GRID - 2 COLUMNS (LOCAL / VISITANTE) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* LOCAL TEAM */}
          <Card className="border-none shadow-md overflow-hidden">
            <CardHeader className="bg-amber-500 text-white p-4 flex flex-row justify-between items-center">
              <CardTitle className="text-lg font-black uppercase italic">{teamNames.home}</CardTitle>
              <Button onClick={() => { setCurrentSide('home'); setModal('add-player'); }} variant="secondary" size="sm" className="bg-white text-amber-600 hover:bg-white/90">
                <UserPlus className="h-4 w-4 mr-2" /> INSCRIBIR
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100 text-[10px] font-black uppercase text-slate-500">
                    <tr>
                      <th className="p-2 border-b w-12 text-center">GOL</th>
                      <th className="p-2 border-b w-12 text-center">NO.</th>
                      <th className="p-2 border-b">NOMBRE / APELLIDO</th>
                      <th className="p-2 border-b w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {lineups.home.length === 0 && (
                      <tr><td colSpan={4} className="p-8 text-center text-slate-300 italic">No hay jugadores registrados</td></tr>
                    )}
                    {lineups.home.map(p => (
                      <tr key={p.id} className="border-b hover:bg-slate-50">
                        <td className="p-2 text-center">
                          <button 
                            onClick={() => handleAddGoal('home', p)}
                            className="bg-emerald-100 text-emerald-700 font-bold px-2 py-1 rounded-md hover:bg-emerald-200 transition-colors"
                          >
                            {getPlayerGoals('home', p.number) || 0}
                          </button>
                        </td>
                        <td className="p-2 text-center font-bold text-slate-500">#{p.number}</td>
                        <td className="p-2 font-medium uppercase">{p.name}</td>
                        <td className="p-2 text-right">
                          <button onClick={() => handleRemovePlayer('home', p.id)} className="text-slate-300 hover:text-red-500">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* VISITANTE TEAM */}
          <Card className="border-none shadow-md overflow-hidden">
            <CardHeader className="bg-blue-600 text-white p-4 flex flex-row justify-between items-center">
              <CardTitle className="text-lg font-black uppercase italic">{teamNames.away}</CardTitle>
              <Button onClick={() => { setCurrentSide('away'); setModal('add-player'); }} variant="secondary" size="sm" className="bg-white text-blue-600 hover:bg-white/90">
                <UserPlus className="h-4 w-4 mr-2" /> INSCRIBIR
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100 text-[10px] font-black uppercase text-slate-500">
                    <tr>
                      <th className="p-2 border-b w-12 text-center">GOL</th>
                      <th className="p-2 border-b w-12 text-center">NO.</th>
                      <th className="p-2 border-b">NOMBRE / APELLIDO</th>
                      <th className="p-2 border-b w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {lineups.away.length === 0 && (
                      <tr><td colSpan={4} className="p-8 text-center text-slate-300 italic">No hay jugadores registrados</td></tr>
                    )}
                    {lineups.away.map(p => (
                      <tr key={p.id} className="border-b hover:bg-slate-50">
                        <td className="p-2 text-center">
                          <button 
                            onClick={() => handleAddGoal('away', p)}
                            className="bg-emerald-100 text-emerald-700 font-bold px-2 py-1 rounded-md hover:bg-emerald-200 transition-colors"
                          >
                            {getPlayerGoals('away', p.number) || 0}
                          </button>
                        </td>
                        <td className="p-2 text-center font-bold text-slate-500">#{p.number}</td>
                        <td className="p-2 font-medium uppercase">{p.name}</td>
                        <td className="p-2 text-right">
                          <button onClick={() => handleRemovePlayer('away', p.id)} className="text-slate-300 hover:text-red-500">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SIGNATURE SECTION */}
        <div className="grid grid-cols-2 gap-8 pt-10 pb-20">
          <div className="text-center">
            <button 
              onClick={() => setModal('sign-captain')}
              className="border-b-2 border-slate-300 w-full h-24 mb-2 flex items-center justify-center hover:bg-slate-100 transition-colors overflow-hidden"
            >
              {signatures.captain ? (
                <img src={signatures.captain} alt="Firma Capitán" className="max-h-full" />
              ) : (
                <span className="text-slate-300 italic text-xs">PULSAR PARA FIRMAR</span>
              )}
            </button>
            <p className="text-[10px] font-black uppercase text-slate-400">Firma del Capitán / Delegado</p>
          </div>
          <div className="text-center">
            <button 
              onClick={() => setModal('sign-referee')}
              className="border-b-2 border-slate-300 w-full h-24 mb-2 flex items-center justify-center hover:bg-slate-100 transition-colors overflow-hidden"
            >
              {signatures.referee ? (
                <img src={signatures.referee} alt="Firma Árbitro" className="max-h-full" />
              ) : (
                <span className="text-slate-300 italic text-xs">PULSAR PARA FIRMAR</span>
              )}
            </button>
            <p className="text-[10px] font-black uppercase text-slate-400">Firma del Árbitro</p>
          </div>
        </div>

      </div>

      {/* MODAL: ADD PLAYER */}
      <Dialog open={modal === 'add-player'} onOpenChange={() => setModal(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-center font-black uppercase italic">Inscribir Jugador - {teamNames[currentSide]}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Número del Jugador</Label>
              <Input 
                type="number" 
                placeholder="00" 
                className="text-2xl h-14 text-center font-black" 
                value={newPlayerNumber} 
                onChange={e => setNewPlayerNumber(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Nombre y Apellido</Label>
              <div className="relative">
                <Input 
                  placeholder="Nombre completo" 
                  className="uppercase font-bold pr-10"
                  value={newPlayerName} 
                  onChange={e => setNewPlayerName(e.target.value)}
                />
                <button 
                  onClick={startListening}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full ${isListening ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}
                >
                  {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                </button>
              </div>
            </div>
            <Button onClick={() => handleAddPlayer(currentSide)} className="w-full h-12 font-black uppercase italic bg-primary">
              <Plus className="h-5 w-5 mr-2" /> Agregar a Lista
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL: SIGNATURES */}
      <Dialog open={modal === 'sign-captain' || modal === 'sign-referee'} onOpenChange={() => setModal(null)}>
        <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden">
          <DialogHeader className="p-4 bg-slate-50 border-b">
            <DialogTitle className="text-center font-black uppercase">Captura de Firma Autógrafa</DialogTitle>
          </DialogHeader>
          <div className="p-4 space-y-4">
            <div className="bg-white border-2 border-dashed border-slate-300 rounded-xl relative touch-none">
              <canvas 
                ref={canvasRef}
                width={400}
                height={200}
                className="w-full h-48 cursor-crosshair"
                onPointerDown={startDrawing}
                onPointerMove={draw}
                onPointerUp={stopDrawing}
                onPointerOut={stopDrawing}
              />
              <p className="absolute bottom-2 left-0 right-0 text-center text-[10px] text-slate-300 pointer-events-none">FIRME DENTRO DEL RECUADRO</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={clearCanvas} className="flex-1">
                <Eraser className="h-4 w-4 mr-2" /> Limpiar
              </Button>
              <Button 
                onClick={() => saveSignature(modal === 'sign-captain' ? 'captain' : 'referee')} 
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                <Check className="h-4 w-4 mr-2" /> Guardar Firma
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={modal === 'info'} onOpenChange={() => setModal(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto rounded-2xl">
          <DialogHeader><DialogTitle className="font-black text-center uppercase">Datos Generales del Acta</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre Equipo Local</Label>
                <Input value={teamNames.home} onChange={e => updateMatch({teamNames: {...teamNames, home: e.target.value.toUpperCase()}})} />
              </div>
              <div className="space-y-2">
                <Label>Nombre Equipo Visitante</Label>
                <Input value={teamNames.away} onChange={e => updateMatch({teamNames: {...teamNames, away: e.target.value.toUpperCase()}})} />
              </div>
            </div>
            <Input value={matchInfo.league} onChange={e => updateMatch({matchInfo: {...matchInfo, league: e.target.value}})} placeholder="Nombre de la Liga / Torneo" />
            <div className="grid grid-cols-2 gap-4">
              <Input value={matchInfo.round} onChange={e => updateMatch({matchInfo: {...matchInfo, round: e.target.value}})} placeholder="Jornada / Temporada" />
              <Input value={matchInfo.place} onChange={e => updateMatch({matchInfo: {...matchInfo, place: e.target.value}})} placeholder="Campo / Estadio" />
            </div>
            <Input type="date" value={matchInfo.date} onChange={e => updateMatch({matchInfo: {...matchInfo, date: e.target.value}})} />
            <div className="border-t pt-4 space-y-2">
              <p className="text-[10px] font-black uppercase text-slate-400">Cuerpo Arbitral</p>
              <Input value={matchInfo.referee} onChange={e => updateMatch({matchInfo: {...matchInfo, referee: e.target.value}})} placeholder="Árbitro Central" />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isPdfReportOpen} onOpenChange={setIsPdfReportOpen}>
        <DialogContent className="max-w-5xl p-0 bg-transparent border-none shadow-none h-[95vh]">
          <PdfReportView matchState={matchState} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
