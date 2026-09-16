'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';

import { useUser, useFirestore, useDoc, useMemoFirebase, useAuth, errorEmitter, FirestorePermissionError } from '@/firebase';
import { MatchEvent, MatchState, Player, StaffMember, UserProfile } from '@/lib/types';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Plus, Trash2, FileText, UserPlus, LogOut, Settings2, Mic, MicOff, AlertCircle, Image as ImageIcon, ShieldAlert, Clock, RotateCcw, ChevronLeft, ArrowRightLeft, Users, Pencil, Camera } from 'lucide-react';
import { causalesAmarilla, causalesRoja, causalesStaff } from '@/lib/causales';
import Link from 'next/link';
import Tesseract from 'tesseract.js';

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_SIZE = 1000;
        
        if (width > height && width > MAX_SIZE) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        } else if (height > MAX_SIZE) {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.onerror = reject;
      img.src = event.target?.result as string;
    };
    reader.onerror = reject;
  });
};

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
  const [selectedPlayer, setSelectedPlayer] = useState<{player: Player, side: 'home' | 'away', isSub: boolean} | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<{staff: StaffMember, side: 'home' | 'away'} | null>(null);
  const [cardType, setCardType] = useState<'yellow' | 'red' | null>(null);
  const [newPlayerNumber, setNewPlayerNumber] = useState('');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [editPlayerNumber, setEditPlayerNumber] = useState('');
  const [editPlayerName, setEditPlayerName] = useState('');
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('DIRECTOR TÉCNICO');
  const [subReplacedNumber, setSubReplacedNumber] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [tempIncidents, setTempIncidents] = useState('');
  const [currentMinute, setCurrentMinute] = useState('');
  const [addPlayerType, setAddPlayerType] = useState<'starter' | 'substitute'>('starter');
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [tempFullName, setTempFullName] = useState('');
  const [scanTarget, setScanTarget] = useState<'starter' | 'substitute' | 'staff'>('starter');

  const formatName = (rawName: string) => {
    const words = rawName.trim().replace(/\s+/g, ' ').split(' ');
    if (words.length === 2) {
       return words[1] + ' ' + words[0];
    } else if (words.length === 3) {
       return words[1] + ' ' + words[2] + ' ' + words[0];
    } else if (words.length === 4) {
       return words[2] + ' ' + words[3] + ' ' + words[0] + ' ' + words[1];
    }
    return rawName;
  };

  const handleScanBatch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsScanning(true);
    try {
       const base64 = await fileToBase64(file);
       const res = await fetch('/api/vision', { method: 'POST', body: JSON.stringify({ imageBase64: base64 }) });
       const data = await res.json().catch(() => ({ error: 'Respuesta inválida del servidor' }));
       if (!res.ok) throw new Error(data.error || 'Error de conexión con Vision API');
       const text = data.text;
       
       if (!text) throw new Error("No text detected");

       const cleanText = text.toUpperCase();
       const forbidden = /LIGA|PRESIDENTE|TEMPORADA|VIGENCIA|FEDERACION|ASOCIACION|CREDENCIAL|FIRMA|EDAD|FECHA|CURP|FOLIO|JUGADOR|CATEGORIA|AFILIACION/;
       
       let parsedCount = 0;
       
       if (scanTarget === 'staff') {
          const newStaff: StaffMember[] = [];
          const names = cleanText.match(/(?:^|\s)([A-ZÑÁÉÍÓÚ]{3,}(?:\s+[A-ZÑÁÉÍÓÚ]{3,})+)(?=\s|$)/g)?.map((n: string) => n.trim()).filter((n: string) => !n.match(forbidden)) || [];
          for (const raw of names) {
              const name = formatName(raw);
              newStaff.push({
                id: Date.now().toString() + Math.random().toString(),
                name,
                role: 'AUXILIAR'
              });
          }
          if (newStaff.length > 0) {
               const currentStaff = matchState?.staff?.[currentSide] || [];
               const uniqueNewStaff: StaffMember[] = [];
               const existingNames = new Set(currentStaff.map(s => s.name.toUpperCase().replace(/\s+/g, ' ')));
               
               for (const s of newStaff) {
                  const normalizedName = s.name.toUpperCase().replace(/\s+/g, ' ');
                  if (existingNames.has(normalizedName)) continue;
                  existingNames.add(normalizedName);
                  uniqueNewStaff.push(s);
               }
               
               if (uniqueNewStaff.length > 0) {
                   updateMatch({ staff: { ...(matchState?.staff || {home:[], away:[]}), [currentSide]: [...currentStaff, ...uniqueNewStaff] } as any });
                   parsedCount = uniqueNewStaff.length;
               }
            }
         } else {
            let newPlayers: Player[] = [];
            const regex = /(?:^|\s)(\d{1,3})\s*[-.)|]?\s*([A-ZÑÁÉÍÓÚ]{2,}(?:\s+[A-ZÑÁÉÍÓÚ]{2,})+)/g;
            const matches = Array.from(cleanText.matchAll(regex));
            
            for (const match of matches as RegExpMatchArray[]) {
                let num = match[1];
                let raw = match[2].trim().replace(/[^A-ZÑÁÉÍÓÚ\s]/g, '').trim();
                if (raw.match(forbidden)) continue;
                newPlayers.push({
                  id: Date.now().toString() + Math.random().toString(),
                  number: num,
                  name: formatName(raw),
                  type: scanTarget as 'starter' | 'substitute'
                });
            }

            if (newPlayers.length < 3) {
                const numbers = cleanText.match(/(?:^|\s)(\d{1,3})(?=\s|$)/g)?.map((n: string) => n.trim()) || [];
                const names = cleanText.match(/(?:^|\s)([A-ZÑÁÉÍÓÚ]{3,}(?:\s+[A-ZÑÁÉÍÓÚ]{3,})+)(?=\s|$)/g)?.map((n: string) => n.trim().replace(/[^A-ZÑÁÉÍÓÚ\s]/g, '')).filter((n: string) => !n.match(forbidden)) || [];
                
                if (names.length > 0 && numbers.length > 0) {
                   newPlayers = [];
                   const limit = Math.min(numbers.length, names.length);
                   for (let i = 0; i < limit; i++) {
                      newPlayers.push({
                        id: Date.now().toString() + Math.random().toString(),
                        number: numbers[i],
                        name: formatName(names[i]),
                        type: scanTarget as 'starter' | 'substitute'
                      });
                   }
                }
            }

            if (newPlayers.length > 0) {
             const currentLineups = matchState?.lineups?.[currentSide] || [];
             const uniqueNewPlayers: Player[] = [];
             let hasDuplicateNumber = false;
             
             // Nombres y numeros actualmente registrados
             const existingNames = new Set(currentLineups.map(p => p.name.toUpperCase().replace(/\s+/g, ' ')));
             const existingNumbers = new Set(currentLineups.filter(p => p.number).map(p => p.number));
             let currentStartersCount = currentLineups.filter(p => p.type === 'starter').length;

             for (const p of newPlayers) {
                const normalizedName = p.name.toUpperCase().replace(/\s+/g, ' ');
                // 1. Omitir si el nombre ya existe
                if (existingNames.has(normalizedName)) continue;
                
                // 2. Si es un nuevo jugador, verificar numero repetido
                if (p.number && existingNumbers.has(p.number) && p.number !== '0') {
                    hasDuplicateNumber = true;
                    p.number = ''; // Limpiar el numero para ingreso manual
                } else if (p.number && p.number !== '0') {
                    existingNumbers.add(p.number);
                }
                
                // 3. Limitar titulares a 11
                if (p.type === 'starter') {
                    if (currentStartersCount < 11) {
                        currentStartersCount++;
                    } else {
                        p.type = 'substitute';
                    }
                }

                existingNames.add(normalizedName);
                uniqueNewPlayers.push(p);
             }

             if (uniqueNewPlayers.length > 0) {
                 const merged = [...currentLineups, ...uniqueNewPlayers];
                 merged.sort((a, b) => (parseInt(a.number)||0) - (parseInt(b.number)||0));
                 updateMatch({ lineups: { ...(matchState?.lineups || {home:[], away:[]}), [currentSide]: merged } as any });
                 parsedCount = uniqueNewPlayers.length;
                 
                 if (hasDuplicateNumber) {
                     setTimeout(() => {
                         toast({
                             variant: "destructive",
                             title: "NÚMERO REPETIDO DETECTADO",
                             description: "Se detectó un número que ya estaba en uso. El número de ese jugador quedó en blanco para que lo asignes a mano.",
                         });
                     }, 1000);
                 }
             }
          }
       }

       toast({
         title: "ESCANEO BATCH EXITOSO",
         description: `Se agregaron ${parsedCount} registros.`,
       });
    } catch (error) {
       console.error(error);
       toast({
         variant: "destructive",
         title: "ERROR AL ESCANEAR",
         description: (error as Error)?.message || "NO SE PUDO RECONOCER EL TEXTO. INTÉNTALO DE NUEVO.",
       });
    }
    e.target.value = '';
    setIsScanning(false);
  };

  const [isScanning, setIsScanning] = useState(false);

  const handleScanImage = async (e: React.ChangeEvent<HTMLInputElement>, target: 'player' | 'staff') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsScanning(true);
    try {
       const base64 = await fileToBase64(file);
       const res = await fetch('/api/vision', { method: 'POST', body: JSON.stringify({ imageBase64: base64 }) });
       const { text } = await res.json();
       
       if (!text) throw new Error("No text detected");

       const lines = text.split('\n').map((l: string) => l.trim().toUpperCase()).filter((l: string) => l.length > 3);
       const filteredLines = lines.filter((l: string) => !l.match(/LIGA|PRESIDENTE|TEMPORADA|VIGENCIA|FEDERACION|ASOCIACION|CREDENCIAL|FIRMA|EDAD|FECHA|CURP|FOLIO|JUGADOR|CATEGORIA|AFILIACION/));
       // Try to find the first line that looks like a full name (mostly letters and spaces)
       const bestLine = filteredLines.find((l: string) => /^[A-ZÑÁÉÍÓÚ\s]{5,}$/.test(l.replace(/[^A-ZÑÁÉÍÓÚ\s]/g, ''))) || filteredLines[0] || text.substring(0, 30).trim().toUpperCase();
       
       if (target === 'player') setNewPlayerName(formatName(bestLine));
       else setNewStaffName(formatName(bestLine));

       toast({
         title: "ESCANEO EXITOSO",
         description: `Texto detectado: ${formatName(bestLine)}`,
       });
    } catch (error) {
       console.error(error);
       toast({
         variant: "destructive",
         title: "ERROR AL ESCANEAR",
         description: (error as Error)?.message || "NO SE PUDO RECONOCER EL TEXTO. INTÉNTALO DE NUEVO.",
       });
    }
    e.target.value = '';
    setIsScanning(false);
  };

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
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
    if (userProfile && !userProfile.isApproved && !isSuperAdmin) {
      router.push('/pending-approval');
      return;
    }

    if (userProfile && !userProfile.fullName) {
      setShowNamePrompt(true);
    }
  }, [user, userProfile, isUserLoading, isProfileLoading, router]);

  const handleSaveFullName = async () => {
    if (tempFullName.trim().length < 3) return;
    if (!userProfileRef) return;
    try {
      await updateDoc(userProfileRef, { fullName: tempFullName.trim().toUpperCase() });
      setShowNamePrompt(false);
      toast({ title: "Nombre guardado", description: "Tu nombre se utilizará como Árbitro Central." });
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (modal?.startsWith('sign-')) {
      const timer = setTimeout(() => initCanvas(), 200);
      return () => clearTimeout(timer);
    }
  }, [modal]);

  useEffect(() => {
    if (userProfile?.fullName && matchState && matchState.matchInfo) {
      if (matchState.matchInfo.referee !== userProfile.fullName) {
        updateMatch({ matchInfo: { ...matchState.matchInfo, referee: userProfile.fullName } });
      }
    }
  }, [userProfile?.fullName, matchState?.matchInfo?.referee]);

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
      toast({ title: "INFORMACIÓN REINICIADA" });
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

  const startListening = (target: 'player' | 'staff' | 'edit') => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'es-ES';
      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (target === 'player') setNewPlayerName(transcript.toUpperCase());
        else if (target === 'edit') setEditPlayerName(transcript.toUpperCase());
        else setNewStaffName(transcript.toUpperCase());
      };
      recognition.start();
    } catch (e) { setIsListening(false); }
  };

  const handleAddPlayer = (side: 'home' | 'away') => {
    if (!newPlayerNumber || !newPlayerName || !matchState) return;
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

    const type = addPlayerType;

    const player: Player = { id: Date.now().toString(), number: newPlayerNumber, name: newPlayerName.toUpperCase(), type };
    const updatedLineup = [...(currentLineups[side] || []), player];
    
    updateMatch({ lineups: { ...currentLineups, [side]: updatedLineup } });

    // Notificación al completar 11 titulares
    if (type === 'starter') {
      const newStartersCount = updatedLineup.filter(p => p.type === 'starter').length;
      if (newStartersCount === 11) {
        toast({
          title: "ONCE TITULAR COMPLETO",
          description: "HAS REGISTRADO LOS 11 TITULARES.",
        });
      }
    }

    setNewPlayerNumber(''); setNewPlayerName(''); setModal(null);
  };

  const handleUpdatePlayer = () => {
    if (!selectedPlayer || !editPlayerNumber || !editPlayerName || !matchState) return;
    const { side, player } = selectedPlayer;
    const updatedLineups = { ...matchState.lineups, [side]: matchState.lineups[side].map(p => p.id === player.id ? { ...p, number: editPlayerNumber, name: editPlayerName.toUpperCase() } : p) };
    const updatedEvents = (matchState.events || []).map(e => e.side === side && e.playerNumber === player.number ? { ...e, playerNumber: editPlayerNumber, playerName: editPlayerName.toUpperCase() } : e);
    updateMatch({ lineups: updatedLineups, events: updatedEvents });
    setModal(null);
  };

  const handleRemovePlayer = (side: 'home' | 'away', id: string) => {
    if (!matchState) return;
    const updatedPlayers = matchState.lineups[side].filter(p => p.id !== id);
    updateMatch({ lineups: { ...matchState.lineups, [side]: updatedPlayers } });
    setModal(null);
  };

  const handleAddStaff = (side: 'home' | 'away') => {
    if (!newStaffName || !matchState) return;
    const currentStaff = matchState.staff || { home: [], away: [] };
    const member: StaffMember = { id: Date.now().toString(), name: newStaffName.toUpperCase(), role: newStaffRole.toUpperCase() };
    updateMatch({ staff: { ...currentStaff, [side]: [...currentStaff[side], member] } });
    setNewStaffName(''); setModal(null);
  };

  const handleAddGoal = (side: 'home' | 'away', player: Player) => {
    if (!matchState) return;
    if (!window.confirm(`¿Confirmar GOL de #${player.number} ${player.name}?`)) return;
    const newScores = { ...matchState.scores, [side]: (matchState.scores[side] || 0) + 1 };
    const timeDisplay = currentMinute ? `${currentMinute}'` : '--';
    const newEvent: MatchEvent = { id: Date.now(), time: timeDisplay, category: 'goals', message: `⚽ GOL #${player.number} ${player.name}${currentMinute ? ` (${currentMinute}')` : ''}`, side, playerNumber: player.number, playerName: player.name };
    updateMatch({ scores: newScores, events: [newEvent, ...(matchState.events || [])] });
    setCurrentMinute(''); setModal(null);
  };

  const handleAddOwnGoal = (playerSide: 'home' | 'away', player: Player) => {
    if (!matchState) return;
    if (!window.confirm(`¿Confirmar AUTOGOL de #${player.number} ${player.name}?`)) return;
    const benefitingSide = playerSide === 'home' ? 'away' : 'home';
    const newScores = { ...matchState.scores, [benefitingSide]: (matchState.scores[benefitingSide] || 0) + 1 };
    const timeDisplay = currentMinute ? `${currentMinute}'` : '--';
    const newEvent: MatchEvent = { id: Date.now(), time: timeDisplay, category: 'goals', message: `⚽ AUTOGOL #${player.number} ${player.name}${currentMinute ? ` (${currentMinute}')` : ''}`, side: benefitingSide, playerNumber: player.number, playerName: player.name };
    updateMatch({ scores: newScores, events: [newEvent, ...(matchState.events || [])] });
    setCurrentMinute(''); setModal(null);
  };

  const handleAddCard = (side: 'home' | 'away', player: Player, type: 'yellow' | 'red', causalIdx: number, causalText: string) => {
    if (!matchState) return;
    const cardName = type === 'yellow' ? 'AMONESTACIÓN' : 'EXPULSIÓN';
    if (!window.confirm(`¿Confirmar ${cardName} para #${player.number} ${player.name}?`)) return;
    const symbol = type === 'yellow' ? '🟨' : '🟥';
    const timeDisplay = currentMinute ? `${currentMinute}'` : '--';
    const newEvent: MatchEvent = { id: Date.now(), time: timeDisplay, category: 'cards', message: `${symbol} #${player.number} ${player.name} - #${causalIdx + 1} ${causalText.toUpperCase()}${currentMinute ? ` (${currentMinute}')` : ''}`, side, playerNumber: player.number, playerName: player.name };
    updateMatch({ events: [newEvent, ...(matchState.events || [])] });
    setCurrentMinute(''); setModal('player-actions');
  };

  const handleAddStaffCard = (side: 'home' | 'away', staff: StaffMember, type: 'yellow' | 'red', causalIdx: number, causalText: string) => {
    if (!matchState) return;
    const cardName = type === 'yellow' ? 'AMONESTACIÓN' : 'EXPULSIÓN';
    if (!window.confirm(`¿Confirmar ${cardName} para ${staff.name}?`)) return;
    const symbol = type === 'yellow' ? '🟨' : '🟥';
    const timeDisplay = currentMinute ? `${currentMinute}'` : '--';
    const newEvent: MatchEvent = { id: Date.now(), time: timeDisplay, category: 'cards', message: `${symbol} ${staff.role} ${staff.name} - #${causalIdx + 1} ${causalText.toUpperCase()}${currentMinute ? ` (${currentMinute}')` : ''}`, side, playerName: staff.name };
    updateMatch({ events: [newEvent, ...(matchState.events || [])] });
    setCurrentMinute(''); setModal('staff-actions');
  };

  const handleEditEvent = (ev: MatchEvent) => {
    const newMessage = window.prompt("Edita la descripción o el minuto del evento:", ev.message);
    if (newMessage !== null && newMessage.trim() !== '') {
      const newEvents = matchState!.events.map(e => e.id === ev.id ? { ...e, message: newMessage.toUpperCase() } : e);
      updateMatch({ events: newEvents });
    }
  };

  const handleDeleteEvent = (ev: MatchEvent) => {
    if (window.confirm("¿Seguro que deseas eliminar este evento?")) {
      const newEvents = matchState!.events.filter(e => e.id !== ev.id);
      if (ev.category === 'goals') {
        const sideToDecrement = ev.side as 'home' | 'away'; 
        const newScores = { ...matchState!.scores, [sideToDecrement]: Math.max(0, (matchState!.scores[sideToDecrement] || 0) - 1) };
        updateMatch({ events: newEvents, scores: newScores });
      } else {
        updateMatch({ events: newEvents });
      }
    }
  };

  const handleRegisterSubstitution = () => {
    if (!selectedPlayer || !matchState || !subReplacedNumber) return;
    const { side, player } = selectedPlayer;
    const updatedLineups = { ...matchState.lineups };
    updatedLineups[side] = updatedLineups[side].map(p => p.id === player.id ? { ...p, replacedNumber: subReplacedNumber } : p);
    
    const timeDisplay = currentMinute ? `${currentMinute}'` : '--';
    const newEvent: MatchEvent = { 
      id: Date.now(), 
      time: timeDisplay, 
      category: 'substitution', 
      message: `🔄 ENTRÓ #${player.number} ${player.name} SALIÓ #${subReplacedNumber}${currentMinute ? ` (${currentMinute}')` : ''}`, 
      side,
      playerNumber: player.number,
      playerName: player.name
    };
    
    updateMatch({ lineups: updatedLineups, events: [newEvent, ...(matchState.events || [])] });
    setSubReplacedNumber(''); setCurrentMinute(''); setModal(null);
  };

  const handleDefaultMatch = (winner: 'home' | 'away') => {
    if (!matchState) return;
    const loser = winner === 'home' ? 'away' : 'home';
    const winnerName = teamNames[winner];
    const loserName = teamNames[loser];
    const text = `EL PARTIDO SE DECLARA GANADO POR DEFAULT A FAVOR DE ${winnerName} POR UN MARCADOR DE 1-0, DEBIDO A QUE EL EQUIPO ${loserName} NO SE PRESENTÓ AL TERRENO DE JUEGO CUMPLIENDOSE LA TOLERANCIA.`.toUpperCase();
    
    setTempIncidents(text);
    updateMatch({
      scores: { [winner]: 1, [loser]: 0 } as any,
      events: [
        { id: Date.now(), time: '--', category: 'notes', message: `📝 ${text}` },
        ...events.filter(e => e.category !== 'notes')
      ]
    });
    
    toast({
      title: "PARTIDO RESUELTO POR DEFAULT",
      description: `${winnerName} GANA 1-0 AUTOMÁTICAMENTE.`,
    });
  };

  const handleNoIncidents = () => {
    const text = "SIN INCIDENTES REPORTADOS.";
    setTempIncidents(text);
    updateMatch({
      events: [
        { id: Date.now(), time: '--', category: 'notes', message: `📝 ${text}` },
        ...events.filter(e => e.category !== 'notes')
      ]
    });
    toast({
      title: "REPORTE LIMPIO",
      description: "SE REGISTRÓ SIN INCIDENTES.",
    });
  };

  const handlePlayerInjury = () => {
    const text = "EL JUGADOR NO. --- DE NOMBRE ----------- DEL EQUIPO ----------- ABANDONÓ EL TERRENO DE JUEGO POR UNA APARENTE LESIÓN EN ----------- SIENDO POSTERIORMENTE SUSTITUIDO.";
    setTempIncidents(text);
    updateMatch({
      events: [
        { id: Date.now(), time: '--', category: 'notes', message: `📝 ${text}` },
        ...events.filter(e => e.category !== 'notes')
      ]
    });
    toast({
      title: "PLANTILLA DE LESIÓN GENERADA",
      description: "LLENA LOS DATOS VACÍOS EN EL TEXTO.",
    });
  };

  const handleOtherIncident = () => {
    setTempIncidents('');
    updateMatch({
      events: events.filter(e => e.category !== 'notes')
    });
    toast({
      title: "REPORTE PERSONALIZADO",
      description: "ESCRIBE TU PROPIO REPORTE EN EL CUADRO DE TEXTO.",
    });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_DIM = 300;
        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
          updateMatch({ matchInfo: { ...(matchState?.matchInfo || {}), collegeLogo: compressedDataUrl } as any });
          toast({ title: "ESCUDO DEL COLEGIO CARGADO Y OPTIMIZADO" });
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
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

  const { teamNames, matchInfo, lineups = { home: [], away: [] }, staff = { home: [], away: [] }, events = [], signatures = {}, scores } = matchState;

  const renderPlayerTable = (side: 'home' | 'away', players: Player[], title: string, isSubList: boolean) => (
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
              <tr key={p.id} className="border-b hover:bg-slate-50 cursor-pointer" onClick={() => { setSelectedPlayer({ player: p, side, isSub: isSubList }); setModal('player-actions'); }}>
                <td className="p-2 text-center font-bold text-slate-400 w-10">#{p.number}</td>
                <td className="p-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-bold uppercase text-slate-700 text-xs">{p.name}</p>
                      {p.replacedNumber && <p className="text-[9px] font-black text-slate-400">ENTRÓ POR: #{p.replacedNumber}</p>}
                    </div>
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

  const renderStaffTable = (side: 'home' | 'away', staffMembers: StaffMember[]) => (
    <div className="mb-4">
      <div className="bg-slate-100 p-2 border-y"><p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">CUERPO TÉCNICO</p></div>
      <table className="w-full text-left border-collapse">
        <tbody className="text-sm">
          {staffMembers.map((s) => {
            const staffEvs = events.filter(e => e.side === side && e.playerName === s.name);
            const yellow = staffEvs.some(e => e.category === 'cards' && e.message.includes('🟨'));
            const red = staffEvs.some(e => e.category === 'cards' && e.message.includes('🟥'));
            return (
              <tr key={s.id} className="border-b hover:bg-slate-50 cursor-pointer" onClick={() => { setSelectedStaff({ staff: s, side }); setModal('staff-actions'); }}>
                <td className="p-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-bold uppercase text-slate-700 text-xs">{s.name}</p>
                      <p className="text-[9px] font-black text-slate-400">{s.role}</p>
                    </div>
                    <div className="flex gap-4 items-center">
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

  const isSuperAdmin = user?.email === 'omar850413@gmail.com';

  return (
    <div className="p-2 md:p-6 bg-slate-50 min-h-screen font-sans text-slate-900">
      <input id="camera-scan" type="file" accept="image/*" capture="environment" className="hidden" onChange={handleScanBatch} disabled={isScanning} />
      <div className="max-w-5xl mx-auto space-y-4">
        
        <div className="flex justify-between items-center py-6">
          <div className="flex-1"></div>
          <Logo />
          <div className="flex-1 flex justify-end">
            {isSuperAdmin && (
              <Link href="/admin">
                <Button variant="outline" size="sm" className="font-black gap-2 uppercase text-primary border-primary shadow-sm">
                  <ShieldAlert className="h-4 w-4" /> PANEL DE CONTROL
                </Button>
              </Link>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4 bg-white p-4 rounded-xl shadow-sm border">
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Button onClick={() => setModal('info')} className="bg-indigo-600 text-white font-black h-12 shadow-md uppercase"><Settings2 className="h-5 w-5 mr-2" /> DATOS PARTIDO</Button>
              <Button onClick={() => { setTempIncidents(events.find(e => e.category === 'notes')?.message.replace('📝 ', '') || ''); setModal('incidents'); }} className="bg-rose-500 text-white font-black h-12 shadow-md uppercase"><AlertCircle className="h-5 w-5 mr-2" /> INCIDENTES</Button>
              <Button onClick={() => setIsPdfReportOpen(true)} className="bg-slate-900 text-white font-black h-12 shadow-md uppercase">PDF</Button>
              <Button onClick={() => setIsImageReportOpen(true)} className="bg-emerald-500 text-white font-black h-12 shadow-md uppercase">IMAGEN</Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(['home', 'away'] as const).map(side => (
            <Card key={side} className="border-none shadow-md overflow-hidden">
              <CardHeader className={`${side === 'home' ? 'bg-amber-500' : 'bg-blue-600'} text-white p-4`}>
                <div className="flex flex-col gap-3 mb-2">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg font-black uppercase italic">{teamNames[side]}</CardTitle>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                           <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-white/20 rounded-full text-white" disabled={isScanning}>
                             {isScanning && currentSide === side ? <RotateCcw className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                           </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                           <DropdownMenuItem onClick={() => { setCurrentSide(side); setScanTarget('starter'); document.getElementById('camera-scan')?.click() }}>Cargar Titulares</DropdownMenuItem>
                           <DropdownMenuItem onClick={() => { setCurrentSide(side); setScanTarget('substitute'); document.getElementById('camera-scan')?.click() }}>Cargar Suplentes</DropdownMenuItem>
                           <DropdownMenuItem onClick={() => { setCurrentSide(side); setScanTarget('staff'); document.getElementById('camera-scan')?.click() }}>Cargar Cuerpo Técnico</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <Button 
                      onClick={() => { setCurrentSide(side); setAddPlayerType('starter'); setModal('add-player'); }} 
                      variant="secondary" 
                      size="sm" 
                      className="bg-white hover:bg-slate-100 text-slate-800 font-bold text-[8px] sm:text-[9px] uppercase px-1 h-8 shadow-sm flex items-center justify-center gap-1 border-none"
                    >
                      <Plus className="h-3 w-3 shrink-0" /> TITULAR
                    </Button>
                    <Button 
                      onClick={() => { setCurrentSide(side); setAddPlayerType('substitute'); setModal('add-player'); }} 
                      variant="secondary" 
                      size="sm" 
                      className="bg-white hover:bg-slate-100 text-slate-800 font-bold text-[8px] sm:text-[9px] uppercase px-1 h-8 shadow-sm flex items-center justify-center gap-1 border-none"
                    >
                      <Plus className="h-3 w-3 shrink-0" /> SUPLENTE
                    </Button>
                    <Button 
                      onClick={() => { setCurrentSide(side); setModal('add-staff'); }} 
                      variant="secondary" 
                      size="sm" 
                      className="bg-white hover:bg-slate-100 text-slate-800 font-bold text-[8px] sm:text-[9px] uppercase px-1 h-8 shadow-sm flex items-center justify-center gap-1 border-none"
                    >
                      <Plus className="h-3 w-3 shrink-0" /> C. TÉCNICO
                    </Button>
                  </div>
                </div>
                <div className="text-center bg-black/20 rounded-lg p-2">
                  <Input type="number" value={scores[side]} onChange={e => updateMatch({ scores: { ...scores, [side]: parseInt(e.target.value) || 0 } })} className="bg-transparent border-none text-center text-4xl font-black text-white h-auto p-0 focus-visible:ring-0" />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {renderPlayerTable(side, (lineups[side] || []).filter(p => p.type === 'starter'), "TITULARES", false)}
                {renderPlayerTable(side, (lineups[side] || []).filter(p => p.type === 'substitute'), "SUPLENTES", true)}
                {renderStaffTable(side, staff[side])}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-8 pt-6 pb-4">
          {(['captainHome', 'referee', 'captainAway'] as const).map(type => (
            <div key={type} className="text-center">
              <button onClick={() => setModal(`sign-${type}`)} className="border-2 border-dashed border-slate-300 w-full h-24 mb-2 flex items-center justify-center hover:bg-slate-100 rounded-xl bg-white overflow-hidden">
                {signatures[type] ? <img src={signatures[type]} className="max-h-full" /> : <span className="text-slate-300 italic text-[10px] uppercase">FIRMA {type.toUpperCase()}</span>}
              </button>
              <p className="text-[8px] font-black uppercase text-slate-400">{type === 'referee' ? 'ÁRBITRO CENTRAL' : `CAPITÁN ${type.includes('Home') ? 'LOCAL' : 'VISITANTE'}`}</p>
            </div>
          ))}
        </div>

        <div className="flex justify-center gap-6 pt-10 pb-10">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="font-black gap-2 opacity-60 hover:opacity-100 transition-opacity uppercase">
                <RotateCcw className="h-4 w-4" /> REINICIAR REPORTE
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="uppercase">¿REINICIAR INFORMACIÓN?</AlertDialogTitle>
                <AlertDialogDescription className="uppercase">
                  ¿ESTÁS SEGURO DE REINICIAR LOS DATOS DEL PARTIDO? ESTA ACCIÓN NO SE PUEDE DESHACER.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="uppercase">CANCELAR</AlertDialogCancel>
                <AlertDialogAction onClick={handleResetMatch} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 uppercase">ACEPTAR</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button onClick={handleLogout} variant="ghost" size="sm" className="text-red-500 font-black gap-2 opacity-60 hover:opacity-100 transition-opacity uppercase">
            <LogOut className="h-4 w-4" /> SALIR
          </Button>
        </div>
      </div>

      <Dialog open={modal === 'add-player'} onOpenChange={() => setModal(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader><DialogTitle className="text-center font-black uppercase">INSCRIBIR JUGADOR</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <Input type="number" placeholder="00" className="text-2xl h-14 text-center font-black" value={newPlayerNumber} onChange={e => setNewPlayerNumber(e.target.value)} />
            <div className="relative">
              <Input placeholder="NOMBRE COMPLETO" className="uppercase font-bold pr-10" value={newPlayerName} onChange={e => setNewPlayerName(e.target.value.toUpperCase())} />
              <button onClick={() => startListening('player')} className={`absolute right-2 top-1/2 -translate-y-1/2 ${isListening ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}>
                {isListening ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
            </div>
            <Button onClick={() => handleAddPlayer(currentSide)} className="w-full h-12 font-black bg-primary text-white uppercase">AGREGAR</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={modal === 'add-staff'} onOpenChange={() => setModal(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader><DialogTitle className="text-center font-black uppercase">INSCRIBIR CUERPO TÉCNICO</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase">CARGO</Label>
              <Select value={newStaffRole} onValueChange={setNewStaffRole}>
                <SelectTrigger className="w-full uppercase font-bold">
                  <SelectValue placeholder="SELECCIONE CARGO" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DIRECTOR TÉCNICO">DIRECTOR TÉCNICO</SelectItem>
                  <SelectItem value="AUXILIAR">AUXILIAR</SelectItem>
                  <SelectItem value="PREPARADOR FÍSICO">PREPARADOR FÍSICO</SelectItem>
                  <SelectItem value="UTILERO">UTILERO</SelectItem>
                  <SelectItem value="MÉDICO">MÉDICO</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase">NOMBRE</Label>
              <div className="relative">
                <Input placeholder="NOMBRE COMPLETO" className="uppercase font-bold pr-10" value={newStaffName} onChange={e => setNewStaffName(e.target.value.toUpperCase())} />
                <button onClick={() => startListening('staff')} className={`absolute right-2 top-1/2 -translate-y-1/2 ${isListening ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}>
                  {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                </button>
              </div>
            </div>
            <Button onClick={() => handleAddStaff(currentSide)} className="w-full h-12 font-black bg-primary text-white uppercase">AGREGAR</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={modal === 'player-actions'} onOpenChange={() => setModal(null)}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto rounded-3xl p-0 border-none shadow-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Acciones del Jugador</DialogTitle>
          </DialogHeader>
          {selectedPlayer && (
            <div className="flex flex-col">
              <div className={`p-6 text-white text-center ${selectedPlayer.side === 'home' ? 'bg-amber-500' : 'bg-blue-600'}`}><p className="text-4xl font-black">#{selectedPlayer.player.number}</p><p className="text-xl font-bold uppercase italic">{selectedPlayer.player.name}</p></div>
              <div className="p-6 space-y-4 bg-white">
                <div className="space-y-2"><Label className="flex items-center gap-2 text-xs font-black uppercase text-slate-400"><Clock size={14} /> MINUTO (OPCIONAL)</Label><Input type="number" placeholder="MIN" className="h-10 text-center font-bold" value={currentMinute} onChange={e => setCurrentMinute(e.target.value)} /></div>
                
                {selectedPlayer.isSub && (
                  <div className="space-y-2 border-b pb-4">
                    <Label className="text-xs font-black uppercase text-slate-400">REGISTRAR CAMBIO</Label>
                    <div className="flex gap-2">
                      <Input 
                        placeholder="N° SALE" 
                        className="font-bold text-center" 
                        value={subReplacedNumber} 
                        onChange={e => setSubReplacedNumber(e.target.value)} 
                      />
                      <Button onClick={handleRegisterSubstitution} className="bg-indigo-600 text-white font-bold uppercase">ENTRA POR</Button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3"><Button onClick={() => handleAddGoal(selectedPlayer.side, selectedPlayer.player)} className="h-16 font-black bg-emerald-600 text-white uppercase">⚽ GOL</Button><Button onClick={() => handleAddOwnGoal(selectedPlayer.side, selectedPlayer.player)} className="h-16 font-black bg-orange-600 text-white uppercase">🥅 AUTOGOL</Button></div>
                <div className="grid grid-cols-2 gap-3"><Button onClick={() => { setCardType('yellow'); setModal('causales'); }} className="h-14 font-black bg-yellow-400 text-yellow-900 uppercase">🟨 AMONESTACION</Button><Button onClick={() => { setCardType('red'); setModal('causales'); }} className="h-14 font-black bg-red-600 text-white uppercase">🟥 EXPULSION</Button></div>
                {(() => {
                  const playerEvents = (matchState?.events || []).filter(e => e.playerNumber === selectedPlayer.player.number && (e.side === selectedPlayer.side || e.message.includes('AUTOGOL')));
                  if (playerEvents.length === 0) return null;
                  return (
                    <div className="border-t pt-4 space-y-2">
                      <Label className="text-xs font-black uppercase text-slate-400">ACCIONES REGISTRADAS</Label>
                      {playerEvents.map(ev => (
                        <div key={ev.id} className="flex justify-between items-center bg-slate-50 p-2 rounded border text-xs font-bold">
                          <span className="flex-1 truncate pr-2" title={ev.message}>{ev.message}</span>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-full" onClick={() => handleEditEvent(ev)}><Pencil className="h-4 w-4"/></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 bg-red-50 hover:bg-red-100 rounded-full" onClick={() => handleDeleteEvent(ev)}><Trash2 className="h-4 w-4"/></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })()}
                <div className="border-t pt-4 grid grid-cols-2 gap-3">
                  <Button 
                    onClick={() => { 
                      setEditPlayerNumber(selectedPlayer.player.number); 
                      setEditPlayerName(selectedPlayer.player.name); 
                      setModal('edit-player'); 
                    }} 
                    variant="outline" 
                    className="h-10 font-bold border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-[11px] uppercase"
                  >
                    <Pencil className="h-4 w-4 mr-1.5" /> EDITAR JUGADOR
                  </Button>
                  <Button 
                    onClick={() => { 
                      if (confirm(`¿ESTÁS SEGURO DE ELIMINAR A ${selectedPlayer.player.name}?`)) {
                        handleRemovePlayer(selectedPlayer.side, selectedPlayer.player.id); 
                      }
                    }} 
                    variant="outline" 
                    className="h-10 font-bold border-red-200 text-red-600 hover:bg-red-50 text-[11px] uppercase"
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
          <DialogHeader><DialogTitle className="text-center font-black uppercase">EDITAR JUGADOR</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase text-slate-400">NÚMERO</Label>
              <Input type="number" placeholder="00" className="text-2xl h-14 text-center font-black" value={editPlayerNumber} onChange={e => setEditPlayerNumber(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase text-slate-400">NOMBRE COMPLETO</Label>
              <div className="relative">
                <Input placeholder="NOMBRE COMPLETO" className="uppercase font-bold pr-10" value={editPlayerName} onChange={e => setEditPlayerName(e.target.value.toUpperCase())} />
                <button onClick={() => startListening('edit')} className={`absolute right-2 top-1/2 -translate-y-1/2 ${isListening ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}>
                  {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                </button>
              </div>
            </div>
            <Button onClick={handleUpdatePlayer} className="w-full h-12 font-black bg-indigo-600 text-white uppercase shadow-md">GUARDAR CAMBIOS</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={modal === 'staff-actions'} onOpenChange={() => setModal(null)}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto rounded-3xl p-0 border-none shadow-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Acciones de Cuerpo Técnico</DialogTitle>
          </DialogHeader>
          {selectedStaff && (
            <div className="flex flex-col">
              <div className={`p-6 text-white text-center ${selectedStaff.side === 'home' ? 'bg-amber-500' : 'bg-blue-600'}`}><p className="text-2xl font-black uppercase">{selectedStaff.staff.role}</p><p className="text-xl font-bold uppercase italic">{selectedStaff.staff.name}</p></div>
              <div className="p-6 space-y-4 bg-white">
                <div className="space-y-2"><Label className="flex items-center gap-2 text-xs font-black uppercase text-slate-400"><Clock size={14} /> MINUTO (OPCIONAL)</Label><Input type="number" placeholder="MIN" className="h-10 text-center font-bold" value={currentMinute} onChange={e => setCurrentMinute(e.target.value)} /></div>
                
                <div className="grid grid-cols-2 gap-3">
                  <Button onClick={() => { setCardType('yellow'); setModal('causales-staff'); }} className="h-14 font-black bg-yellow-400 text-yellow-900 uppercase">🟨 AMONESTACION</Button>
                  <Button onClick={() => { setCardType('red'); setModal('causales-staff'); }} className="h-14 font-black bg-red-600 text-white uppercase">🟥 EXPULSION</Button>
                </div>
                {(() => { 
                  const staffEvents = (matchState?.events || []).filter(e => e.playerName === selectedStaff.staff.name); 
                  if (staffEvents.length === 0) return null; 
                  return ( 
                    <div className="border-t pt-4 mt-4 space-y-2"> 
                      <Label className="text-xs font-black uppercase text-slate-400">ACCIONES REGISTRADAS</Label> 
                      {staffEvents.map(ev => ( 
                        <div key={ev.id} className="flex justify-between items-center bg-slate-50 p-2 rounded border text-xs font-bold"> 
                          <span className="flex-1 truncate pr-2" title={ev.message}>{ev.message}</span> 
                          <div className="flex gap-1"> 
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-full" onClick={() => handleEditEvent(ev)}><Pencil className="h-4 w-4"/></Button> 
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 bg-red-50 hover:bg-red-100 rounded-full" onClick={() => handleDeleteEvent(ev)}><Trash2 className="h-4 w-4"/></Button> 
                          </div> 
                        </div> 
                      ))} 
                    </div> 
                  ) 
                })()}
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

      <Dialog open={modal === 'causales-staff'} onOpenChange={() => setModal('staff-actions')}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-black uppercase">CAUSALES STAFF - {selectedStaff?.staff.role}</DialogTitle></DialogHeader>
          <div className="space-y-2 py-4">{causalesStaff.map((causal, idx) => (<Button key={idx} variant="outline" className="w-full justify-start text-left h-auto py-2 text-xs" onClick={() => handleAddStaffCard(selectedStaff!.side, selectedStaff!.staff, cardType!, idx, causal)}><span className="font-bold mr-2 text-primary">#{idx + 1}</span> {causal.toUpperCase()}</Button>))}</div>
        </DialogContent>
      </Dialog>

      <Dialog open={modal === 'incidents'} onOpenChange={() => setModal(null)}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader><DialogTitle className="font-black uppercase">INCIDENTES</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-3">
              <Label className="text-xs font-black uppercase text-slate-500">PLANTILLAS RÁPIDAS</Label>
              <div className="grid grid-cols-3 gap-1.5">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleNoIncidents}
                  className="bg-white hover:bg-slate-100 border border-slate-200 text-[8px] sm:text-[9px] font-black uppercase py-2 h-auto flex items-center justify-center gap-0.5"
                >
                  ✅ NINGUNO
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handlePlayerInjury}
                  className="bg-white hover:bg-slate-100 border border-slate-200 text-[8px] sm:text-[9px] font-black uppercase py-2 h-auto flex items-center justify-center gap-0.5"
                >
                  🏥 LESIÓN
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleOtherIncident}
                  className="bg-white hover:bg-slate-100 border border-slate-200 text-[8px] sm:text-[9px] font-black uppercase py-2 h-auto flex items-center justify-center gap-0.5"
                >
                  📝 OTRO
                </Button>
              </div>
              <div className="h-px bg-slate-200 my-2"></div>
              <Label className="text-xs font-black uppercase text-slate-500">RESOLVER POR DEFAULT (1-0)</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleDefaultMatch('home')}
                  className="bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-black uppercase py-2 h-auto"
                >
                  🏆 GANA {teamNames.home}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleDefaultMatch('away')}
                  className="bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-black uppercase py-2 h-auto"
                >
                  🏆 GANA {teamNames.away}
                </Button>
              </div>
            </div>
            <Textarea className="min-h-[200px]" value={tempIncidents} onChange={e => setTempIncidents(e.target.value.toUpperCase())} />
            <Button onClick={() => { updateMatch({ events: [ { id: Date.now(), time: '--', category: 'notes', message: `📝 ${tempIncidents.toUpperCase()}` }, ...events.filter(e => e.category !== 'notes') ] }); setModal(null); }} className="w-full font-bold bg-primary text-white uppercase">GUARDAR</Button>
          </div>
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
              <Button variant="outline" onClick={initCanvas} className="flex-1 font-bold uppercase">LIMPIAR</Button>
              <Button onClick={() => saveSignature(modal!.split('-')[1] as any)} className="flex-1 bg-emerald-600 text-white font-bold uppercase">GUARDAR</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={modal === 'info'} onOpenChange={() => setModal(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-black uppercase">DATOS GENERALES</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4"><div><Label className="uppercase">LOCAL</Label><Input value={teamNames.home} onChange={e => updateMatch({teamNames: {...teamNames, home: e.target.value.toUpperCase()}})} /></div><div><Label className="uppercase">VISITA</Label><Input value={teamNames.away} onChange={e => updateMatch({teamNames: {...teamNames, away: e.target.value.toUpperCase()}})} /></div></div>
            <Input value={matchInfo.league} onChange={e => updateMatch({matchInfo: {...matchInfo, league: e.target.value.toUpperCase()}})} placeholder="LIGA" />
            <div className="grid grid-cols-2 gap-4"><Input value={matchInfo.round} onChange={e => updateMatch({matchInfo: {...matchInfo, round: e.target.value.toUpperCase()}})} placeholder="JORNADA" /><Input value={matchInfo.place} onChange={e => updateMatch({matchInfo: {...matchInfo, place: e.target.value.toUpperCase()}})} placeholder="CAMPO" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs font-black uppercase text-slate-500">FECHA</Label>
                <Input type="date" value={matchInfo.date} onChange={e => updateMatch({matchInfo: {...matchInfo, date: e.target.value}})} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-black uppercase text-slate-500">HORA</Label>
                <Input type="time" value={matchInfo.time || ''} onChange={e => updateMatch({matchInfo: {...matchInfo, time: e.target.value}})} />
              </div>
            </div>
            <div className="border-t pt-4 space-y-2">
              <div className="relative">
                <Input value={userProfile?.fullName || matchInfo.referee || ''} disabled className="bg-gray-100 cursor-not-allowed font-bold" />
                <div className="absolute right-3 top-2.5 text-gray-500">🔒</div>
              </div>
              <Input value={matchInfo.assistant1} onChange={e => updateMatch({matchInfo: {...matchInfo, assistant1: e.target.value.toUpperCase()}})} placeholder="ASISTENTE 1" />
              <Input value={matchInfo.assistant2} onChange={e => updateMatch({matchInfo: {...matchInfo, assistant2: e.target.value.toUpperCase()}})} placeholder="ASISTENTE 2" />
            </div>
            <div className="border-t pt-4 space-y-3">
              <Label className="text-xs font-black uppercase text-slate-500">COLEGIO DE ÁRBITROS</Label>
              <Input 
                value={matchInfo.refereeCollege || ''} 
                onChange={e => updateMatch({matchInfo: {...matchInfo, refereeCollege: e.target.value.toUpperCase()}})} 
                placeholder="EJ. COLEGIO DE ÁRBITROS DE MÉXICO" 
              />
              <div className="space-y-2">
                <input 
                  type="file" 
                  ref={logoInputRef}
                  accept="image/*" 
                  onChange={handleLogoUpload} 
                  className="hidden" 
                />
                <div className="flex items-center gap-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => logoInputRef.current?.click()}
                    className="w-full font-bold uppercase gap-2 flex-1"
                  >
                    <ImageIcon size={16} /> {matchInfo.collegeLogo ? 'CAMBIAR LOGO' : 'SUBIR ESCUDO COLEGIO'}
                  </Button>
                  {matchInfo.collegeLogo && (
                    <Button 
                      type="button" 
                      variant="destructive" 
                      onClick={() => updateMatch({ matchInfo: { ...matchInfo, collegeLogo: '' } as any })}
                      className="font-bold uppercase"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                {matchInfo.collegeLogo && (
                  <div className="flex justify-center border p-2 rounded-lg bg-slate-50">
                    <img src={matchInfo.collegeLogo} alt="Logo preview" className="h-16 object-contain" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isPdfReportOpen} onOpenChange={setIsPdfReportOpen}>
        <DialogContent className="max-w-5xl h-[95vh] p-0 overflow-auto bg-transparent border-none">
          <DialogHeader className="sr-only">
            <DialogTitle>Vista Previa de Cédula PDF</DialogTitle>
          </DialogHeader>
          <PdfReportView matchState={matchState} />
        </DialogContent>
      </Dialog>
      <Dialog open={isImageReportOpen} onOpenChange={setIsImageReportOpen}>
        <DialogContent className="max-w-5xl h-[95vh] p-0 overflow-auto bg-transparent border-none">
          <DialogHeader className="sr-only">
            <DialogTitle>Vista Previa de Cédula Imagen</DialogTitle>
          </DialogHeader>
          <ReportView matchState={matchState} />
        </DialogContent>
      </Dialog>

      <Dialog open={showNamePrompt}>
        <DialogContent className="max-w-md sm:rounded-2xl border-none shadow-2xl p-6 [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="text-center font-black uppercase text-2xl text-slate-900 tracking-tighter">
              TU NOMBRE COMPLETO
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-center text-slate-600">
              Para garantizar la autenticidad de las cédulas, ingresa tu nombre completo. Este será usado por defecto como <strong>Árbitro Central</strong> en todos tus reportes y aparecerá en las firmas de manera automática. No podrás cambiarlo después.
            </p>
            <Input 
              value={tempFullName} 
              onChange={e => setTempFullName(e.target.value)} 
              placeholder="EJ. JUAN PÉREZ GARCÍA" 
              className="text-center font-bold text-lg h-12 uppercase"
            />
            <Button 
              onClick={handleSaveFullName} 
              disabled={tempFullName.trim().length < 3}
              className="w-full h-12 text-lg font-black uppercase tracking-wider shadow-lg bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Confirmar y Continuar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
