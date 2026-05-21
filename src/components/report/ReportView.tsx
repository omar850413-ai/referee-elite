'use client';

import React, { useRef, useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { MatchState, Player } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import { DialogClose } from '@/components/ui/dialog';
import { numberToSpanishWords, parseTimeToMinutes } from '@/lib/utils';

interface ReportViewProps {
  matchState: MatchState;
}

export function ReportView({ matchState }: ReportViewProps) {
  const { scores, teamNames, matchInfo, events, lineups = { home: [], away: [] }, staff = { home: [], away: [] }, signatures = {} } = matchState;
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
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
      setInitialDistance(dist);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && lastTouch) {
      const deltaX = e.touches[0].pageX - lastTouch.x;
      const deltaY = e.touches[0].pageY - lastTouch.y;
      setOffset(prev => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
      setLastTouch({ x: e.touches[0].pageX, y: e.touches[0].pageY });
    } else if (e.touches.length === 2 && initialDistance) {
      const dist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
      const factor = dist / initialDistance;
      setScale(prev => Math.max(0.2, Math.min(4, prev * factor)));
      setInitialDistance(dist);
    }
  };

  const handleDownload = async () => {
    const input = reportRef.current;
    if (!input) return;

    const originalStyle = input.style.cssText;
    input.style.transform = 'none';
    input.style.position = 'fixed';
    input.style.top = '0';
    input.style.left = '0';
    input.style.zIndex = '-1000';

    try {
      const canvas = await html2canvas(input, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#FFFFFF',
        logging: false,
        windowWidth: input.scrollWidth,
        windowHeight: input.scrollHeight
      });
      const jpegUrl = canvas.toDataURL('image/jpeg', 0.95);
      const link = document.createElement('a');
      link.href = jpegUrl;
      link.download = `${teamNames.home}-VS-${teamNames.away}.jpg`.toUpperCase();
      link.click();
    } finally {
      input.style.cssText = originalStyle;
    }
  };

  const getPlayerEventsSummary = (side: 'home' | 'away', number: string, p?: Player) => {
    const playerEvs = (events || []).filter(e => e.side === side && e.playerNumber === number);
    return playerEvs.map(e => {
      if (e.category === 'goals') return `${e.message.includes('AUTOGOL') ? '🥅' : '⚽'}${e.time !== '--' ? ` (${e.time})` : ''}`;
      if (e.category === 'cards') return `${e.message.includes('🟨') ? '🟨' : '🟥'}${e.time !== '--' ? ` (${e.time})` : ''}`;
      if (e.category === 'substitution' && p?.replacedNumber) return ` (POR: #${p.replacedNumber}${e.time !== '--' ? ` ${e.time}` : ''})`;
      return '';
    }).join(' ');
  };

  const getStaffEventsSummary = (side: 'home' | 'away', name: string) => {
    return (events || []).filter(e => e.side === side && e.playerName === name && e.category === 'cards')
      .map(e => `${e.message.includes('🟨') ? '🟨' : '🟥'}${e.time !== '--' ? ` (${e.time})` : ''}`).join(' ');
  };

  const getSortedCards = (side: 'home' | 'away') => {
    return (events || []).filter(e => e.side === side && e.category === 'cards')
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
      <div className="p-4 flex justify-between items-center bg-slate-800 border-b border-white/10 z-10">
        <div className="text-white font-black uppercase text-sm italic">Cédula Digital</div>
        <DialogClose className="text-white p-2 hover:bg-white/10 rounded-full"><X size={24} /></DialogClose>
      </div>
      
      <div className="flex-1 overflow-auto touch-none bg-slate-900 p-4 flex justify-center items-start" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove}>
        <div style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, transformOrigin: 'center top' }}>
          <div ref={reportRef} className="p-12 bg-white text-black font-sans shadow-2xl" style={{ width: '800px', minHeight: '1100px' }}>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-black uppercase tracking-tighter">INFORME ARBITRAL</h1>
              <p className="text-[12px] font-bold uppercase tracking-widest">{matchInfo.league} | JORNADA {matchInfo.round}</p>
              <div className="h-1 bg-black w-full mt-2"></div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-[11px] mb-8">
              <div className="space-y-1">
                <p><strong>ÁRBITRO CENTRAL:</strong> <span className="uppercase">{matchInfo.referee}</span></p>
                <p><strong>ASISTENTE 1:</strong> <span className="uppercase">{matchInfo.assistant1}</span></p>
                <p><strong>ASISTENTE 2:</strong> <span className="uppercase">{matchInfo.assistant2}</span></p>
              </div>
              <div className="space-y-1 text-right">
                <p><strong>LUGAR:</strong> <span className="uppercase">{matchInfo.place}</span></p>
                <p><strong>FECHA:</strong> <span className="uppercase">{matchInfo.date}</span></p>
              </div>
            </div>

            <div className="grid grid-cols-2 border-2 border-black mb-10 text-center divide-x-2 divide-black">
              <div className="p-4 bg-gray-50">
                <p className="text-[10px] font-bold">LOCAL</p>
                <p className="text-lg font-black">{scores.home} ({numberToSpanishWords(scores.home)})</p>
                <p className="text-2xl font-black uppercase">{teamNames.home}</p>
              </div>
              <div className="p-4 bg-gray-50">
                <p className="text-[10px] font-bold">VISITA</p>
                <p className="text-lg font-black">{scores.away} ({numberToSpanishWords(scores.away)})</p>
                <p className="text-2xl font-black uppercase">{teamNames.away}</p>
              </div>
            </div>

            <div className="text-center font-black text-[14px] border-b-2 border-black mb-4 pb-1 uppercase">Alineaciones</div>
            <div className="grid grid-cols-2 gap-10">
              <div className="text-[10px] space-y-4">
                <div><p className="text-[8px] font-black text-gray-400 border-b mb-1">TITULARES</p>{lineups.home.slice(0, 11).map(p => <p key={p.id} className="uppercase py-1 border-b border-gray-50"><strong>{p.number}.-</strong> {p.name} {getPlayerEventsSummary('home', p.number, p)}</p>)}</div>
                <div><p className="text-[8px] font-black text-gray-400 border-b mb-1">SUPLENTES</p>{lineups.home.slice(11).map(p => <p key={p.id} className="uppercase py-1 border-b border-gray-50"><strong>{p.number}.-</strong> {p.name} {getPlayerEventsSummary('home', p.number, p)}</p>)}</div>
                <div><p className="text-[8px] font-black text-gray-400 border-b mb-1">CUERPO TÉCNICO</p>{staff.home.map(s => <p key={s.id} className="uppercase py-1 border-b border-gray-50"><strong>{s.role}:</strong> {s.name} {getStaffEventsSummary('home', s.name)}</p>)}</div>
              </div>
              <div className="text-[10px] space-y-4">
                <div><p className="text-[8px] font-black text-gray-400 border-b mb-1">TITULARES</p>{lineups.away.slice(0, 11).map(p => <p key={p.id} className="uppercase py-1 border-b border-gray-50"><strong>{p.number}.-</strong> {p.name} {getPlayerEventsSummary('away', p.number, p)}</p>)}</div>
                <div><p className="text-[8px] font-black text-gray-400 border-b mb-1">SUPLENTES</p>{lineups.away.slice(11).map(p => <p key={p.id} className="uppercase py-1 border-b border-gray-50"><strong>{p.number}.-</strong> {p.name} {getPlayerEventsSummary('away', p.number, p)}</p>)}</div>
                <div><p className="text-[8px] font-black text-gray-400 border-b mb-1">CUERPO TÉCNICO</p>{staff.away.map(s => <p key={s.id} className="uppercase py-1 border-b border-gray-50"><strong>{s.role}:</strong> {s.name} {getStaffEventsSummary('away', s.name)}</p>)}</div>
              </div>
            </div>

            <div className="mt-10">
              <div className="text-center font-black text-[14px] border-b-2 border-black mb-4 pb-1 uppercase">Sanciones</div>
              <div className="grid grid-cols-2 gap-10">
                <div className="text-[9px] space-y-2 uppercase">
                  <p className="font-bold border-b text-primary">LOCAL: {teamNames.home}</p>
                  {getSortedCards('home').map(e => <p key={e.id} className="border-b border-gray-50 pb-1">#{e.playerNumber} {e.playerName} {e.message.includes('🟨') ? '🟨' : '🟥'} {e.message.split(' - ').pop()} {e.time !== '--' ? `(${e.time})` : ''}</p>)}
                </div>
                <div className="text-[9px] space-y-2 uppercase">
                  <p className="font-bold border-b text-primary">VISITA: {teamNames.away}</p>
                  {getSortedCards('away').map(e => <p key={e.id} className="border-b border-gray-50 pb-1">#{e.playerNumber} {e.playerName} {e.message.includes('🟨') ? '🟨' : '🟥'} {e.message.split(' - ').pop()} {e.time !== '--' ? `(${e.time})` : ''}</p>)}
                </div>
              </div>
            </div>

            <div className="mt-10">
              <div className="text-center font-black text-[14px] border-b-2 border-black mb-4 pb-1 uppercase">Incidentes del Partido</div>
              <div className="text-[11px] p-5 border border-gray-200 min-h-[150px] whitespace-pre-wrap uppercase font-bold bg-gray-50 leading-relaxed">{incidentNote}</div>
            </div>

            <div className="grid grid-cols-3 gap-10 mt-20 text-center">
              <div className="space-y-3"><div className="h-20 flex items-center justify-center">{signatures.captainHome && <img src={signatures.captainHome} className="max-h-full" />}</div><div className="h-0.5 bg-black w-full"></div><p className="text-[10px] font-black uppercase">Capitán Local</p></div>
              <div className="space-y-3"><div className="h-20 flex items-center justify-center">{signatures.referee && <img src={signatures.referee} className="max-h-full" />}</div><div className="h-0.5 bg-black w-full"></div><p className="text-[10px] font-black uppercase">Árbitro Central</p></div>
              <div className="space-y-3"><div className="h-20 flex items-center justify-center">{signatures.captainAway && <img src={signatures.captainAway} className="max-h-full" />}</div><div className="h-0.5 bg-black w-full"></div><p className="text-[10px] font-black uppercase">Capitán Visitante</p></div>
            </div>
            
            <p className="text-center text-[8px] text-gray-400 mt-12 font-bold uppercase tracking-[0.2em]">REFEREE ELITE - REPORTE OFICIAL INDEPENDIENTE</p>
          </div>
        </div>
      </div>

      <div className="p-4 bg-slate-800 border-t border-white/10 shrink-0 flex justify-center">
        <Button onClick={handleDownload} className="bg-emerald-600 hover:bg-emerald-700 font-black px-10 h-12 uppercase shadow-xl w-full max-w-md">
          <Download className="mr-2 h-5 w-5" /> Descargar Imagen JPG
        </Button>
      </div>
    </div>
  );
}
