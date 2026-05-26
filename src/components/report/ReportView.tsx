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

const roleInitials: Record<string, string> = {
  'DIRECTOR TÉCNICO': 'DT',
  'AUXILIAR': 'AUX',
  'PREPARADOR FÍSICO': 'PF',
  'UTILERO': 'UTI',
  'MÉDICO': 'MED'
};

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

    const clone = input.cloneNode(true) as HTMLDivElement;
    clone.style.transform = 'none';
    clone.style.position = 'fixed';
    clone.style.top = '0';
    clone.style.left = '-9999px';
    clone.style.width = '800px';
    clone.style.height = 'auto';
    clone.style.backgroundColor = '#FFFFFF';
    document.body.appendChild(clone);

    try {
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#FFFFFF',
        logging: false,
      });
      const jpegUrl = canvas.toDataURL('image/jpeg', 0.95);
      const link = document.createElement('a');
      link.href = jpegUrl;
      link.download = `${teamNames.home}-VS-${teamNames.away}.jpg`.toUpperCase();
      link.click();
    } finally {
      document.body.removeChild(clone);
    }
  };

  const getPlayerEventsSummary = (side: 'home' | 'away', number: string, p?: Player) => {
    const playerEvs = (events || []).filter(e => e.side === side && e.playerNumber === number);
    let summary = playerEvs.map(e => {
      if (e.category === 'goals') return `${e.message.includes('AUTOGOL') ? '🥅' : '⚽'}${e.time !== '--' && e.time !== '' ? ` (${e.time})` : ''}`;
      if (e.category === 'cards') return `${e.message.includes('🟨') ? '🟨' : '🟥'}${e.time !== '--' && e.time !== '' ? ` (${e.time})` : ''}`;
      return '';
    }).filter(Boolean).join(' ');

    if (p?.replacedNumber) {
      summary += ` (POR: #${p.replacedNumber})`;
    }
    return summary;
  };

  const getSortedCards = (side: 'home' | 'away', type?: 'yellow' | 'red') => {
    let filtered = (events || []).filter(e => e.side === side && e.category === 'cards');
    if (type) {
      const symbol = type === 'yellow' ? '🟨' : '🟥';
      filtered = filtered.filter(e => e.message.includes(symbol));
    }
    return filtered.sort((a, b) => {
      const numA = parseInt(a.playerNumber || '999');
      const numB = parseInt(b.playerNumber || '999');
      if (numA !== numB) return numA - numB;
      return parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time);
    });
  };

  const incidentNote = (events || []).find(e => e.category === 'notes')?.message.replace('📝 ', '') || 'SIN INCIDENTES REPORTADOS.';

  const renderPlayerRow = (p: Player, side: 'home' | 'away') => (
    <div key={p.id} className="flex uppercase leading-none items-baseline py-0">
      <div className="inline-block w-[18px] text-right mr-1 font-bold">{p.number}.-</div>
      <div className="flex-1 text-left">{p.name} {getPlayerEventsSummary(side, p.number, p)}</div>
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
      <div key={e.id} className="leading-none border-b border-gray-50 flex items-baseline py-0.5">
        <div className="inline-block w-[18px] text-right mr-1 font-bold">{numberDisplay}</div> 
        <div className="flex-1 text-left">{nameDisplay} {e.message.split(' - ').pop()}</div>
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-900 overflow-hidden" ref={containerRef}>
      <div className="p-4 flex justify-between items-center bg-slate-800 border-b border-white/10 z-10">
        <div className="text-white font-black uppercase text-sm italic">Cédula Digital (Imagen)</div>
        <DialogClose className="text-white p-2 hover:bg-white/10 rounded-full"><X size={24} /></DialogClose>
      </div>
      
      <div className="flex-1 overflow-auto touch-none bg-slate-900 p-4 flex justify-center items-start" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove}>
        <div style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, transformOrigin: 'center top' }}>
          <div ref={reportRef} className="p-8 bg-white text-black font-sans shadow-2xl" style={{ width: '800px', minHeight: '1100px' }}>
            <div className="text-center mb-6">
              <h1 className="text-3xl font-black uppercase tracking-tighter">INFORME ARBITRAL</h1>
              <div className="h-1 bg-black w-full mt-2"></div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-[10px] mb-6">
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
              </div>
            </div>

            <div className="flex justify-center mb-6">
              <div className="grid grid-cols-2 border-2 border-black text-center divide-x-2 divide-black w-full max-w-sm">
                <div className="p-3 bg-gray-50 flex flex-col justify-center">
                  <p className="text-xl font-black uppercase leading-tight">{teamNames.home}</p>
                  <p className="text-sm font-black mt-1">{scores.home} ({numberToSpanishWords(scores.home)})</p>
                </div>
                <div className="p-3 bg-gray-50 flex flex-col justify-center">
                  <p className="text-xl font-black uppercase leading-tight">{teamNames.away}</p>
                  <p className="text-sm font-black mt-1">{scores.away} ({numberToSpanishWords(scores.away)})</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="text-[9px] space-y-3">
                <div>
                  <p className="text-[8px] font-black border-b mb-1 uppercase">TITULARES</p>
                  {lineups.home.filter(p => p.type === 'starter').map(p => renderPlayerRow(p, 'home'))}
                </div>
                <div>
                  <p className="text-[8px] font-black border-b mb-1 uppercase">SUPLENTES</p>
                  {lineups.home.filter(p => p.type === 'substitute').map(p => renderPlayerRow(p, 'home'))}
                </div>
                <div>
                  <p className="text-[8px] font-black border-b mb-1 uppercase">CUERPO TÉCNICO</p>
                  {staff.home.map(s => <p key={s.id} className="uppercase leading-none py-0">{roleInitials[s.role] || 'STAFF'} - {s.name}</p>)}
                </div>
              </div>
              <div className="text-[9px] space-y-3">
                <div>
                  <p className="text-[8px] font-black border-b mb-1 uppercase">TITULARES</p>
                  {lineups.away.filter(p => p.type === 'starter').map(p => renderPlayerRow(p, 'away'))}
                </div>
                <div>
                  <p className="text-[8px] font-black border-b mb-1 uppercase">SUPLENTES</p>
                  {lineups.away.filter(p => p.type === 'substitute').map(p => renderPlayerRow(p, 'away'))}
                </div>
                <div>
                  <p className="text-[8px] font-black border-b mb-1 uppercase">CUERPO TÉCNICO</p>
                  {staff.away.map(s => <p key={s.id} className="uppercase leading-none py-0">{roleInitials[s.role] || 'STAFF'} - {s.name}</p>)}
                </div>
              </div>
            </div>

            <div className="mt-6 border-t pt-4">
              <p className="text-[9px] font-black uppercase text-black border-b mb-1">SANCIONES</p>
              <div className="grid grid-cols-2 gap-8">
                <div className="text-[8px] space-y-1 uppercase">
                  <p className="font-bold border-b border-gray-100 mb-1 text-gray-400">🟨 AMONESTACIÓN</p>
                  {getSortedCards('home', 'yellow').map(e => renderCardEntry(e, 'home'))}
                  <div className="mt-4 text-[8px] space-y-1 uppercase">
                    <p className="font-bold border-b border-gray-100 mb-1 text-gray-400">🟥 EXPULSIÓN</p>
                    {getSortedCards('home', 'red').map(e => renderCardEntry(e, 'home'))}
                  </div>
                </div>
                <div className="text-[8px] space-y-1 uppercase">
                  <p className="font-bold border-b border-gray-100 mb-1 text-gray-400">🟨 AMONESTACIÓN</p>
                  {getSortedCards('away', 'yellow').map(e => renderCardEntry(e, 'away'))}
                  <div className="mt-4 text-[8px] space-y-1 uppercase">
                    <p className="font-bold border-b border-gray-100 mb-1 text-gray-400">🟥 EXPULSIÓN</p>
                    {getSortedCards('away', 'red').map(e => renderCardEntry(e, 'away'))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <p className="text-[9px] font-black uppercase text-gray-400 border-b mb-1">INCIDENTES DEL PARTIDO</p>
              <div className="text-[9px] p-4 border border-gray-100 min-h-[100px] whitespace-pre-wrap uppercase font-bold bg-gray-50 leading-tight">{incidentNote}</div>
            </div>

            <div className="grid grid-cols-3 gap-10 mt-12 text-center">
              <div className="space-y-2">
                <div className="h-16 flex items-center justify-center">{signatures.captainHome && <img src={signatures.captainHome} className="max-h-full" />}</div>
                <div className="h-0.5 bg-black w-full"></div>
                <p className="text-[8px] font-black uppercase">Capitán Local</p>
              </div>
              <div className="space-y-2">
                <div className="h-16 flex items-center justify-center">{signatures.referee && <img src={signatures.referee} className="max-h-full" />}</div>
                <div className="h-0.5 bg-black w-full"></div>
                <p className="text-[8px] font-black uppercase">Árbitro Central</p>
              </div>
              <div className="space-y-2">
                <div className="h-16 flex items-center justify-center">{signatures.captainAway && <img src={signatures.captainAway} className="max-h-full" />}</div>
                <div className="h-0.5 bg-black w-full"></div>
                <p className="text-[8px] font-black uppercase">Capitán Visitante</p>
              </div>
            </div>
            
            <p className="text-center text-[7px] text-gray-400 mt-10 font-bold uppercase tracking-[0.2em]">REFEREE ELITE - REPORTE OFICIAL INDEPENDIENTE</p>
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
