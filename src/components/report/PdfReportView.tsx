'use client';

import React, { useRef, useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { MatchState, Player } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { DialogClose } from '@/components/ui/dialog';
import { Download, X } from 'lucide-react';
import { parseTimeToMinutes, numberToSpanishWords } from '@/lib/utils';

interface PdfReportViewProps {
  matchState: MatchState;
}

const roleInitials: Record<string, string> = {
  'DIRECTOR TÉCNICO': 'DT',
  'AUXILIAR': 'AUX',
  'PREPARADOR FÍSICO': 'PF',
  'UTILERO': 'UTI',
  'MÉDICO': 'MED'
};

export function PdfReportView({ matchState }: PdfReportViewProps) {
  const { 
    matchInfo, 
    teamNames, 
    scores, 
    events, 
    lineups = { home: [], away: [] }, 
    staff = { home: [], away: [] },
    signatures = {}
  } = matchState;
  
  const reportRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [initialDistance, setInitialDistance] = useState<number | null>(null);
  const [lastTouch, setLastTouch] = useState<{ x: number, y: number } | null>(null);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const targetWidth = 800; 
        const newScale = Math.min(1, (containerWidth - 40) / targetWidth);
        setScale(newScale);
        setOffset({ x: 0, y: 0 });
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setLastTouch({ x: e.touches[0].pageX, y: e.touches[0].pageY });
      setInitialDistance(null);
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      );
      setInitialDistance(dist);
      setLastTouch(null);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && lastTouch) {
      const deltaX = e.touches[0].pageX - lastTouch.x;
      const deltaY = e.touches[0].pageY - lastTouch.y;
      setOffset(prev => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
      setLastTouch({ x: e.touches[0].pageX, y: e.touches[0].pageY });
    } else if (e.touches.length === 2 && initialDistance) {
      const dist = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      );
      const factor = dist / initialDistance;
      setScale(prev => Math.max(0.2, Math.min(4, prev * factor)));
      setInitialDistance(dist);
    }
  };

  const handleTouchEnd = () => {
    setLastTouch(null);
    setInitialDistance(null);
  };

  const handleDownloadPdf = async () => {
    const input = reportRef.current;
    if (!input) return;

    const clone = input.cloneNode(true) as HTMLDivElement;
    clone.style.transform = 'none';
    clone.style.position = 'fixed';
    clone.style.top = '0';
    clone.style.left = '-9999px';
    clone.style.width = '210mm';
    clone.style.height = 'auto';
    clone.style.backgroundColor = '#FFFFFF';
    document.body.appendChild(clone);

    try {
      const canvas = await html2canvas(clone, { 
        scale: 2, 
        useCORS: true,
        backgroundColor: '#FFFFFF',
        logging: false,
        width: 794,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`${teamNames.home}-VS-${teamNames.away}.pdf`.toUpperCase());
    } finally {
      document.body.removeChild(clone);
    }
  };

  const getPlayerEventsSummary = (side: 'home' | 'away', number: string, p?: Player) => {
    const playerEvs = (events || []).filter(e => e.side === side && e.playerNumber === number);
    let summary = [];
    playerEvs.forEach(e => {
      if (e.category === 'goals') {
        summary.push(`${e.message.includes('AUTOGOL') ? '🥅' : '⚽'}${e.time !== '--' && e.time !== '' ? ` (${e.time})` : ''}`);
      }
      if (e.category === 'cards') {
        summary.push(`${e.message.includes('🟨') ? '🟨' : '🟥'}${e.time !== '--' && e.time !== '' ? ` (${e.time})` : ''}`);
      }
    });
    if (p?.replacedNumber) {
      summary.push(` (POR: #${p.replacedNumber})`);
    }
    return summary.join(' ');
  };

  const getSortedCards = (side: 'home' | 'away', type: 'yellow' | 'red') => {
    const symbol = type === 'yellow' ? '🟨' : '🟥';
    return (events || [])
      .filter(e => e.side === side && e.category === 'cards' && e.message.includes(symbol))
      .sort((a, b) => {
        const numA = parseInt(a.playerNumber || '999');
        const numB = parseInt(b.playerNumber || '999');
        if (numA !== numB) return numA - numB;
        return parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time);
      });
  };

  const incidentNote = (events || []).find(e => e.category === 'notes')?.message.replace('📝 ', '') || 'SIN INCIDENTES REPORTADOS.';

  const renderPlayerRow = (p: Player, side: 'home' | 'away') => (
    <div key={p.id} className="flex uppercase leading-none items-baseline py-0.5 justify-between">
      <div className="flex items-baseline overflow-hidden pr-2">
        <div className="inline-block w-[28px] text-right mr-1.5 font-bold shrink-0">{p.number}.-</div>
        <div className="text-left truncate">{p.name}</div>
      </div>
      <div className="text-right shrink-0 font-medium tracking-tight">{getPlayerEventsSummary(side, p.number, p)}</div>
    </div>
  );

  const renderCardEntry = (e: any, side: 'home' | 'away') => {
    let nameDisplay = e.playerName;
    let numberDisplay = e.playerNumber ? `${e.playerNumber}.-` : '';

    if (!e.playerNumber) {
      const staffMember = (staff[side] || []).find(s => s.name === e.playerName);
      if (staffMember) {
        const initial = roleInitials[staffMember.role] || '';
        nameDisplay = `${initial} ${e.playerName}`;
      }
    }

    return (
      <div key={e.id} className="leading-none border-b border-gray-100 flex items-baseline justify-between py-1">
        <div className="flex items-baseline flex-1 overflow-hidden pr-2">
          <div className="inline-block w-[28px] text-right mr-1.5 font-bold shrink-0">{numberDisplay}</div> 
          <div className="text-left truncate flex-1">{nameDisplay}</div>
        </div>
        <div className="text-right shrink-0 text-gray-700 font-medium">{e.message.split(' - ').pop()}</div>
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-900 overflow-hidden" ref={containerRef}>
      <div className="p-4 flex justify-between items-center bg-slate-800 border-b border-white/10 shrink-0 z-10">
        <div className="text-white font-black uppercase text-sm italic">Vista Previa Reporte PDF</div>
        <DialogClose className="text-white p-2 hover:bg-white/10 rounded-full"><X size={24} /></DialogClose>
      </div>

      <div className="flex-1 overflow-auto touch-none bg-slate-900 p-4 flex justify-center items-start" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
        <div style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, transformOrigin: 'center top' }}>
          <div ref={reportRef} className="p-8 bg-white text-black font-sans shadow-2xl relative" style={{ width: '210mm', minHeight: '297mm' }}>
            <div className="flex items-center justify-between mb-3 relative min-h-[70px]">
              <div className="w-[80px] h-[80px] flex items-center justify-center absolute left-0 top-0">
                {matchInfo.collegeLogo && (
                  <img src={matchInfo.collegeLogo} className="max-w-full max-h-full object-contain" />
                )}
              </div>
              <div className="flex-1 text-center px-[90px]">
                <h1 className="text-2xl font-black uppercase tracking-tighter leading-none mb-1">INFORME ARBITRAL</h1>
                {matchInfo.refereeCollege && (
                  <p className="text-sm font-bold uppercase text-slate-700 leading-tight">{matchInfo.refereeCollege}</p>
                )}
              </div>
            </div>
            
            <div className="h-0.5 bg-black w-full mb-3"></div>

            <div className="grid grid-cols-2 gap-4 text-xs mb-3">
              <div className="space-y-1">
                <p><strong>ÁRBITRO CENTRAL:</strong> <span className="uppercase">{matchInfo.referee}</span></p>
                <p><strong>ASISTENTE 1:</strong> <span className="uppercase">{matchInfo.assistant1}</span></p>
                <p><strong>ASISTENTE 2:</strong> <span className="uppercase">{matchInfo.assistant2}</span></p>
              </div>
              <div className="space-y-1 text-right">
                <p><strong>LIGA:</strong> <span className="uppercase">{matchInfo.league}</span></p>
                <p><strong>JORNADA:</strong> <span className="uppercase">{matchInfo.round}</span></p>
                <p><strong>LUGAR:</strong> <span className="uppercase">{matchInfo.place}</span></p>
                <p><strong>FECHA:</strong> <span className="uppercase">{matchInfo.date}</span></p>
                <p><strong>HORA:</strong> <span className="uppercase">{matchInfo.time || '--'}</span></p>
              </div>
            </div>

            <div className="flex justify-center mb-3">
              <div className="flex border-2 border-black text-center shadow-sm bg-white w-full max-w-sm rounded-lg overflow-hidden items-stretch">
                <div className="flex-1 p-2 bg-gray-50 flex flex-col justify-center items-center">
                  <p className="text-sm font-black uppercase leading-tight text-center">{teamNames.home}</p>
                </div>
                <div className="flex-none px-4 py-1 bg-black text-white flex flex-col justify-center items-center min-w-[90px]">
                  <div className="text-xl font-black tracking-widest">{scores.home} - {scores.away}</div>
                </div>
                <div className="flex-1 p-2 bg-gray-50 flex flex-col justify-center items-center">
                  <p className="text-sm font-black uppercase leading-tight text-center">{teamNames.away}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-1 text-xs">
                <p className="text-xs font-black border-b border-gray-300 uppercase mb-2">TITULARES</p>
                {(lineups.home || []).filter(p => p.type === 'starter').map(p => renderPlayerRow(p, 'home'))}
                
                <p className="text-xs font-black border-b border-gray-300 uppercase mt-4 mb-2">SUPLENTES</p>
                {(lineups.home || []).filter(p => p.type === 'substitute').map(p => renderPlayerRow(p, 'home'))}
                
                <p className="text-xs font-black border-b border-gray-300 uppercase mt-4 mb-2">CUERPO TÉCNICO</p>
                {(staff.home || []).map(s => <p key={s.id} className="uppercase leading-tight py-0">{roleInitials[s.role] || 'STAFF'} - {s.name}</p>)}
              </div>
              <div className="space-y-1 text-xs">
                <p className="text-xs font-black border-b border-gray-300 uppercase mb-2">TITULARES</p>
                {(lineups.away || []).filter(p => p.type === 'starter').map(p => renderPlayerRow(p, 'away'))}
                
                <p className="text-xs font-black border-b border-gray-300 uppercase mt-4 mb-2">SUPLENTES</p>
                {(lineups.away || []).filter(p => p.type === 'substitute').map(p => renderPlayerRow(p, 'away'))}
                
                <p className="text-xs font-black border-b border-gray-300 uppercase mt-4 mb-2">CUERPO TÉCNICO</p>
                {(staff.away || []).map(s => <p key={s.id} className="uppercase leading-tight py-0">{roleInitials[s.role] || 'STAFF'} - {s.name}</p>)}
              </div>
            </div>

            <div className="mt-6 border-t-2 border-gray-300 pt-3">
              <p className="text-xs font-black uppercase text-black border-b border-gray-300 mb-2">SANCIONES</p>
              <div className="grid grid-cols-2 gap-8">
                <div className="text-xs space-y-2 uppercase">
                  <p className="font-bold border-b border-gray-200 mb-1 text-gray-500">🟨 AMONESTACIÓN</p>
                  <div className="space-y-1">{getSortedCards('home', 'yellow').map(e => renderCardEntry(e, 'home'))}</div>
                  <div className="mt-3 text-xs space-y-2 uppercase">
                    <p className="font-bold border-b border-gray-200 mb-1 text-gray-500">🟥 EXPULSIÓN</p>
                    <div className="space-y-1">{getSortedCards('home', 'red').map(e => renderCardEntry(e, 'home'))}</div>
                  </div>
                </div>
                <div className="text-xs space-y-2 uppercase">
                  <p className="font-bold border-b border-gray-200 mb-1 text-gray-500">🟨 AMONESTACIÓN</p>
                  <div className="space-y-1">{getSortedCards('away', 'yellow').map(e => renderCardEntry(e, 'away'))}</div>
                  <div className="mt-3 text-xs space-y-2 uppercase">
                    <p className="font-bold border-b border-gray-200 mb-1 text-gray-500">🟥 EXPULSIÓN</p>
                    <div className="space-y-1">{getSortedCards('away', 'red').map(e => renderCardEntry(e, 'away'))}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <p className="text-xs font-black uppercase text-gray-500 border-b border-gray-300 mb-2">INCIDENTES DEL PARTIDO</p>
              <div className="text-xs p-3 border-2 border-gray-200 min-h-[60px] whitespace-pre-wrap uppercase font-bold bg-gray-50 leading-tight">{incidentNote}</div>
            </div>

            <div className="grid grid-cols-3 gap-6 mt-6 text-center">
              <div className="space-y-1">
                <div className="h-8 flex items-center justify-center">{signatures.captainHome && <img src={signatures.captainHome} className="max-h-full" />}</div>
                <div className="h-px bg-black w-full"></div>
                <p className="text-[10px] font-black uppercase">Capitán Local</p>
              </div>
              <div className="space-y-1">
                <div className="h-8 flex items-center justify-center">{signatures.referee && <img src={signatures.referee} className="max-h-full" />}</div>
                <div className="h-px bg-black w-full"></div>
                <p className="text-[10px] font-black uppercase">Árbitro Central</p>
              </div>
              <div className="space-y-1">
                <div className="h-8 flex items-center justify-center">{signatures.captainAway && <img src={signatures.captainAway} className="max-h-full" />}</div>
                <div className="h-px bg-black w-full"></div>
                <p className="text-[10px] font-black uppercase">Capitán Visitante</p>
              </div>
            </div>
            <div className="mt-4 pt-2 border-t border-gray-200 text-center">
              <p className="text-[7px] font-black uppercase text-slate-700 tracking-wider">
                🔒 DOCUMENTO OFICIAL EMITIDO POR LA CUENTA VERIFICADA DE: <span className="text-blue-900">{matchInfo.advisor || 'ÁRBITRO REGISTRADO'}</span>
              </p>
              <p className="text-[5px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                REFEREE ELITE - REGISTRO INALTERABLE E INDEPENDIENTE
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 bg-slate-800 border-t border-white/10 shrink-0 flex justify-center z-10">
        <Button onClick={handleDownloadPdf} className="bg-emerald-600 hover:bg-emerald-700 font-black px-10 h-12 uppercase shadow-xl w-full max-w-md">
          <Download className="mr-2 h-5 w-5" /> Descargar PDF
        </Button>
      </div>
    </div>
  );
}
