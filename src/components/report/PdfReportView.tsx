'use client';

import React, { useRef, useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { MatchState, Player } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { DialogClose } from '@/components/ui/dialog';
import { Download, X } from 'lucide-react';
import { parseTimeToMinutes, numberToSpanishWords } from '@/lib/utils';

interface PdfReportViewProps {
  matchState: MatchState;
}

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
      const pdfHeight = pdf.internal.pageSize.getHeight();
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
      if (e.category === 'substitution' && p?.replacedNumber) {
        summary.push(` (POR: #${p.replacedNumber}${e.time !== '--' && e.time !== '' ? ` ${e.time}` : ''})`);
      }
    });
    return summary.join(' ');
  };

  const getStaffEventsSummary = (side: 'home' | 'away', name: string) => {
    const staffEvs = (events || []).filter(e => e.side === side && e.playerName === name);
    return staffEvs.map(e => `${e.message.includes('🟨') ? '🟨' : '🟥'}${e.time !== '--' && e.time !== '' ? ` (${e.time})` : ''}`).join(' ');
  };

  const getSortedCards = (side: 'home' | 'away') => {
    return (events || [])
      .filter(e => e.side === side && e.category === 'cards')
      .sort((a, b) => {
        const numA = parseInt(a.playerNumber || '999');
        const numB = parseInt(b.playerNumber || '999');
        if (numA !== numB) return numA - numB;
        return parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time);
      });
  };

  const incidentNote = (events || []).find(e => e.category === 'notes')?.message.replace('📝 ', '') || 'SIN INCIDENTES REPORTADOS.';

  return (
    <div className="w-full h-full flex flex-col bg-slate-900 overflow-hidden" ref={containerRef}>
      <div className="p-4 flex justify-between items-center bg-slate-800 border-b border-white/10 shrink-0 z-10">
        <div className="text-white font-black uppercase text-sm italic">Vista Previa Reporte PDF</div>
        <DialogClose className="text-white p-2 hover:bg-white/10 rounded-full"><X size={24} /></DialogClose>
      </div>

      <div className="flex-1 overflow-auto touch-none bg-slate-900 p-4 flex justify-center items-start" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
        <div style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, transformOrigin: 'center top' }}>
          <div ref={reportRef} className="p-8 bg-white text-black font-sans shadow-2xl" style={{ width: '210mm', minHeight: '297mm' }}>
            <div className="text-center mb-4">
              <h1 className="text-xl font-black uppercase tracking-tighter">INFORME ARBITRAL</h1>
              <p className="text-[9px] font-bold uppercase">{matchInfo.league} | JORNADA {matchInfo.round}</p>
              <div className="h-0.5 bg-black w-full mt-1"></div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[9px] mb-4">
              <div className="space-y-0.5">
                <p><strong>ÁRBITRO CENTRAL:</strong> <span className="uppercase">{matchInfo.referee}</span></p>
                <p><strong>ASISTENTE 1:</strong> <span className="uppercase">{matchInfo.assistant1}</span></p>
                <p><strong>ASISTENTE 2:</strong> <span className="uppercase">{matchInfo.assistant2}</span></p>
              </div>
              <div className="space-y-0.5 text-right">
                <p><strong>LUGAR:</strong> <span className="uppercase">{matchInfo.place}</span></p>
                <p><strong>FECHA:</strong> <span className="uppercase">{matchInfo.date}</span></p>
              </div>
            </div>

            <div className="grid grid-cols-2 border border-black mb-4 text-center divide-x divide-black">
              <div className="p-1.5 bg-gray-50">
                <p className="text-[8px] font-bold">LOCAL</p>
                <p className="text-xs font-black">{scores.home} ({numberToSpanishWords(scores.home)})</p>
                <p className="text-sm font-black uppercase">{teamNames.home}</p>
              </div>
              <div className="p-1.5 bg-gray-50">
                <p className="text-[8px] font-bold">VISITA</p>
                <p className="text-xs font-black">{scores.away} ({numberToSpanishWords(scores.away)})</p>
                <p className="text-sm font-black uppercase">{teamNames.away}</p>
              </div>
            </div>

            <div className="text-center font-black text-[10px] border-b border-black mb-2 pb-0.5 uppercase">Alineaciones y Cuerpo Técnico</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-[9px]">
                  <p className="text-[7px] font-black text-gray-400 mb-0.5 border-b uppercase">Titulares</p>
                  {(lineups.home || []).slice(0, 11).map(p => <p key={p.id} className="uppercase py-0.5 border-b border-gray-50 leading-tight"><strong>{p.number}.-</strong> {p.name} {getPlayerEventsSummary('home', p.number, p)}</p>)}
                  <p className="text-[7px] font-black text-gray-400 mt-2 mb-0.5 border-b uppercase">Suplentes</p>
                  {(lineups.home || []).slice(11).map(p => <p key={p.id} className="uppercase py-0.5 border-b border-gray-50 leading-tight"><strong>{p.number}.-</strong> {p.name} {getPlayerEventsSummary('home', p.number, p)}</p>)}
                  <p className="text-[7px] font-black text-gray-400 mt-2 mb-0.5 border-b uppercase">Staff</p>
                  {(staff.home || []).map(s => <p key={s.id} className="uppercase py-0.5 border-b border-gray-50 leading-tight"><strong>{s.role}:</strong> {s.name} {getStaffEventsSummary('home', s.name)}</p>)}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-[9px]">
                  <p className="text-[7px] font-black text-gray-400 mb-0.5 border-b uppercase">Titulares</p>
                  {(lineups.away || []).slice(0, 11).map(p => <p key={p.id} className="uppercase py-0.5 border-b border-gray-50 leading-tight"><strong>{p.number}.-</strong> {p.name} {getPlayerEventsSummary('away', p.number, p)}</p>)}
                  <p className="text-[7px] font-black text-gray-400 mt-2 mb-0.5 border-b uppercase">Suplentes</p>
                  {(lineups.away || []).slice(11).map(p => <p key={p.id} className="uppercase py-0.5 border-b border-gray-50 leading-tight"><strong>{p.number}.-</strong> {p.name} {getPlayerEventsSummary('away', p.number, p)}</p>)}
                  <p className="text-[7px] font-black text-gray-400 mt-2 mb-0.5 border-b uppercase">Staff</p>
                  {(staff.away || []).map(s => <p key={s.id} className="uppercase py-0.5 border-b border-gray-50 leading-tight"><strong>{s.role}:</strong> {s.name} {getStaffEventsSummary('away', s.name)}</p>)}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <div className="text-center font-black text-[10px] border-b border-black mb-2 pb-0.5 uppercase">Detalle de Sanciones</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-[8px] space-y-1 uppercase">
                  <p className="font-bold border-b border-gray-200">LOCAL: {teamNames.home}</p>
                  {getSortedCards('home').map(e => <p key={e.id} className="border-b border-gray-50 pb-0.5 leading-tight">#{e.playerNumber} {e.playerName} {e.message.includes('🟨') ? '🟨' : '🟥'} {e.message.split(' - ').pop()} {e.time !== '--' && e.time !== '' ? `(${e.time})` : ''}</p>)}
                </div>
                <div className="text-[8px] space-y-1 uppercase">
                  <p className="font-bold border-b border-gray-200">VISITA: {teamNames.away}</p>
                  {getSortedCards('away').map(e => <p key={e.id} className="border-b border-gray-50 pb-0.5 leading-tight">#{e.playerNumber} {e.playerName} {e.message.includes('🟨') ? '🟨' : '🟥'} {e.message.split(' - ').pop()} {e.time !== '--' && e.time !== '' ? `(${e.time})` : ''}</p>)}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <div className="text-center font-black text-[10px] border-b border-black mb-1 pb-0.5 uppercase">Incidentes del Partido</div>
              <div className="text-[9px] p-2 border border-gray-200 min-h-[80px] whitespace-pre-wrap uppercase font-bold bg-gray-50 leading-tight">{incidentNote}</div>
            </div>

            <div className="grid grid-cols-3 gap-8 mt-10 text-center">
              <div className="space-y-1">
                <div className="h-12 flex items-center justify-center">{signatures.captainHome && <img src={signatures.captainHome} className="max-h-full" />}</div>
                <div className="h-px bg-black w-full"></div>
                <p className="text-[7px] font-black uppercase">Capitán Local</p>
              </div>
              <div className="space-y-1">
                <div className="h-12 flex items-center justify-center">{signatures.referee && <img src={signatures.referee} className="max-h-full" />}</div>
                <div className="h-px bg-black w-full"></div>
                <p className="text-[7px] font-black uppercase">Árbitro Central</p>
              </div>
              <div className="space-y-1">
                <div className="h-12 flex items-center justify-center">{signatures.captainAway && <img src={signatures.captainAway} className="max-h-full" />}</div>
                <div className="h-px bg-black w-full"></div>
                <p className="text-[7px] font-black uppercase">Capitán Visitante</p>
              </div>
            </div>
            
            <p className="text-center text-[6px] text-gray-400 mt-6 font-bold uppercase tracking-widest">REFEREE ELITE - REPORTE OFICIAL INDEPENDIENTE</p>
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