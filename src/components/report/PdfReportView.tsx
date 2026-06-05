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

const YellowCardIcon = () => (
  <span className="inline-flex items-center justify-center align-middle ml-1">
    <span className="w-2 h-3 bg-[#FFD700] border border-[#E6B800] rounded-[1px] shadow-sm inline-block" />
  </span>
);

const RedCardIcon = () => (
  <span className="inline-flex items-center justify-center align-middle ml-1">
    <span className="w-2 h-3 bg-[#FF3B30] border border-[#D62F27] rounded-[1px] shadow-sm inline-block" />
  </span>
);

const GoalIcon = () => (
  <span className="inline-flex items-center justify-center align-middle ml-1">
    <svg className="w-3.5 h-3.5 text-slate-800" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
      <polygon points="12,7.5 8.5,10 9.8,14.2 14.2,14.2 15.5,10" />
      <line x1="12" y1="7.5" x2="12" y2="2" stroke="currentColor" strokeWidth="1.5" />
      <line x1="8.5" y1="10" x2="3.3" y2="8.3" stroke="currentColor" strokeWidth="1.5" />
      <line x1="9.8" y1="14.2" x2="6.5" y2="19" stroke="currentColor" strokeWidth="1.5" />
      <line x1="14.2" y1="14.2" x2="17.5" y2="19" stroke="currentColor" strokeWidth="1.5" />
      <line x1="15.5" y1="10" x2="20.7" y2="8.3" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  </span>
);

const OwnGoalIcon = () => (
  <span className="inline-flex items-center justify-center align-middle ml-1">
    <svg className="w-4 h-3.5 text-slate-800" viewBox="0 0 24 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="16" rx="1" />
      <path d="M2 6h20M2 10h20M2 14h20" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.4" />
      <path d="M6 2v16M10 2v16M14 2v16M18 2v16" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.4" strokeDasharray="1,1" />
      <path d="M2 18V2h20v16" stroke="currentColor" strokeWidth="2" />
    </svg>
  </span>
);

const YellowCardHeaderIcon = () => (
  <span className="w-2.5 h-3.5 bg-[#FFD700] border border-[#E6B800] rounded-[1.5px] shadow-sm inline-block mr-1.5 align-middle" />
);

const RedCardHeaderIcon = () => (
  <span className="w-2.5 h-3.5 bg-[#FF3B30] border border-[#D62F27] rounded-[1.5px] shadow-sm inline-block mr-1.5 align-middle" />
);

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
    
    return (
      <span className="inline-flex items-center gap-1.5 ml-1.5">
        {playerEvs.map((e, idx) => {
          const timeStr = e.time !== '--' && e.time !== '' ? ` (${e.time})` : '';
          if (e.category === 'goals') {
            const isOwnGoal = e.message.includes('AUTOGOL');
            return (
              <span key={e.id || idx} className="inline-flex items-center text-[7px] font-bold text-slate-700">
                {isOwnGoal ? <OwnGoalIcon /> : <GoalIcon />}
                {timeStr}
              </span>
            );
          }
          if (e.category === 'cards') {
            const isYellow = e.message.includes('🟨');
            return (
              <span key={e.id || idx} className="inline-flex items-center text-[7px] font-bold text-slate-700">
                {isYellow ? <YellowCardIcon /> : <RedCardIcon />}
                {timeStr}
              </span>
            );
          }
          return null;
        })}
        {p?.replacedNumber && (
          <span className="text-[6.5px] font-semibold text-slate-500 lowercase">
            (por: #{p.replacedNumber})
          </span>
        )}
      </span>
    );
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
    <div key={p.id} className="flex uppercase leading-none items-baseline py-0">
      <div className="inline-block w-[18px] text-right mr-1 font-bold">{p.number}.-</div>
      <div className="flex-1 text-left">{p.name} {getPlayerEventsSummary(side, p.number, p)}</div>
    </div>
  );

  const renderCardEntry = (e: any, side: 'home' | 'away') => {
    let nameDisplay = e.playerName;
    let numberDisplay = e.playerNumber ? `${e.playerNumber}.-` : '';
    const isYellow = e.message.includes('🟨');

    if (!e.playerNumber) {
      const staffMember = (staff[side] || []).find(s => s.name === e.playerName);
      if (staffMember) {
        const initial = roleInitials[staffMember.role] || '';
        nameDisplay = `${initial} ${e.playerName}`;
      }
    }

    return (
      <div key={e.id} className="leading-none border-b border-gray-100 flex items-center py-1 gap-1.5 text-[7px]">
        <span className="flex-shrink-0 text-sm leading-none">
          {isYellow ? <YellowCardIcon /> : <RedCardIcon />}
        </span>
        <div className="inline-block w-[18px] text-right font-bold">{numberDisplay}</div> 
        <div className="flex-1 text-left truncate">{nameDisplay} - {e.message.split(' - ').pop()}</div>
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
          <div ref={reportRef} className="p-6 bg-white text-black font-sans shadow-2xl" style={{ width: '210mm', minHeight: '297mm' }}>
            <div className="text-center mb-2">
              <h1 className="text-xl font-black uppercase tracking-tighter">INFORME ARBITRAL</h1>
              <div className="h-0.5 bg-black w-full mt-1"></div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[8px] mb-2">
              <div className="space-y-0.5">
                <p><strong>ÁRBITRO CENTRAL:</strong> <span className="uppercase">{matchInfo.referee}</span></p>
                <p><strong>ASISTENTE 1:</strong> <span className="uppercase">{matchInfo.assistant1}</span></p>
                <p><strong>ASISTENTE 2:</strong> <span className="uppercase">{matchInfo.assistant2}</span></p>
              </div>
              <div className="space-y-0.5 text-right">
                <p><strong>LIGA:</strong> <span className="uppercase">{matchInfo.league}</span></p>
                <p><strong>JORNADA:</strong> <span className="uppercase">{matchInfo.round}</span></p>
                <p><strong>LUGAR:</strong> <span className="uppercase">{matchInfo.place}</span></p>
                <p><strong>FECHA:</strong> <span className="uppercase">{matchInfo.date}</span></p>
              </div>
            </div>

            <div className="flex justify-center mb-3">
              <div className="grid grid-cols-2 border border-black text-center divide-x divide-black w-full max-w-sm">
                <div className="p-1 bg-gray-50 flex flex-col justify-center">
                  <p className="text-[11px] font-black uppercase leading-none">{teamNames.home}</p>
                  <p className="text-[12px] font-black mt-0.5">{scores.home} ({numberToSpanishWords(scores.home)})</p>
                </div>
                <div className="p-1 bg-gray-50 flex flex-col justify-center">
                  <p className="text-[11px] font-black uppercase leading-none">{teamNames.away}</p>
                  <p className="text-[12px] font-black mt-0.5">{scores.away} ({numberToSpanishWords(scores.away)})</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-0 text-[8px]">
                <p className="text-[7px] font-black border-b uppercase mb-1">TITULARES</p>
                {(lineups.home || []).filter(p => p.type === 'starter').map(p => renderPlayerRow(p, 'home'))}
                
                <p className="text-[7px] font-black border-b uppercase mt-2 mb-1">SUPLENTES</p>
                {(lineups.home || []).filter(p => p.type === 'substitute').map(p => renderPlayerRow(p, 'home'))}
                
                <p className="text-[7px] font-black border-b uppercase mt-2 mb-1">CUERPO TÉCNICO</p>
                {(staff.home || []).map(s => <p key={s.id} className="uppercase leading-tight py-0">{roleInitials[s.role] || 'STAFF'} - {s.name}</p>)}
              </div>
              <div className="space-y-0 text-[8px]">
                <p className="text-[7px] font-black border-b uppercase mb-1">TITULARES</p>
                {(lineups.away || []).filter(p => p.type === 'starter').map(p => renderPlayerRow(p, 'away'))}
                
                <p className="text-[7px] font-black border-b uppercase mt-2 mb-1">SUPLENTES</p>
                {(lineups.away || []).filter(p => p.type === 'substitute').map(p => renderPlayerRow(p, 'away'))}
                
                <p className="text-[7px] font-black border-b uppercase mt-2 mb-1">CUERPO TÉCNICO</p>
                {(staff.away || []).map(s => <p key={s.id} className="uppercase leading-tight py-0">{roleInitials[s.role] || 'STAFF'} - {s.name}</p>)}
              </div>
            </div>

            <div className="mt-4 border-t pt-2">
              <p className="text-[8px] font-black uppercase text-black border-b mb-1">SANCIONES</p>
              <div className="grid grid-cols-2 gap-6">
                <div className="text-[7px] space-y-1 uppercase">
                  <p className="font-black border-b border-yellow-200 mb-1 text-yellow-600 flex items-center gap-1"><YellowCardHeaderIcon /> AMONESTACIÓN</p>
                  {getSortedCards('home', 'yellow').map(e => renderCardEntry(e, 'home'))}
                  <div className="mt-2 text-[7px] space-y-1 uppercase">
                    <p className="font-black border-b border-red-200 mb-1 text-red-600 flex items-center gap-1"><RedCardHeaderIcon /> EXPULSIÓN</p>
                    {getSortedCards('home', 'red').map(e => renderCardEntry(e, 'home'))}
                  </div>
                </div>
                <div className="text-[7px] space-y-1 uppercase">
                  <p className="font-black border-b border-yellow-200 mb-1 text-yellow-600 flex items-center gap-1"><YellowCardHeaderIcon /> AMONESTACIÓN</p>
                  {getSortedCards('away', 'yellow').map(e => renderCardEntry(e, 'away'))}
                  <div className="mt-2 text-[7px] space-y-1 uppercase">
                    <p className="font-black border-b border-red-200 mb-1 text-red-600 flex items-center gap-1"><RedCardHeaderIcon /> EXPULSIÓN</p>
                    {getSortedCards('away', 'red').map(e => renderCardEntry(e, 'away'))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-[8px] font-black uppercase text-gray-400 border-b mb-1">INCIDENTES DEL PARTIDO</p>
              <div className="text-[8px] p-2 border border-gray-100 min-h-[50px] whitespace-pre-wrap uppercase font-bold bg-gray-50 leading-tight">{incidentNote}</div>
            </div>

            <div className="grid grid-cols-3 gap-6 mt-6 text-center">
              <div className="space-y-1">
                <div className="h-8 flex items-center justify-center">{signatures.captainHome && <img src={signatures.captainHome} className="max-h-full" />}</div>
                <div className="h-px bg-black w-full"></div>
                <p className="text-[6px] font-black uppercase">Capitán Local</p>
              </div>
              <div className="space-y-1">
                <div className="h-8 flex items-center justify-center">{signatures.referee && <img src={signatures.referee} className="max-h-full" />}</div>
                <div className="h-px bg-black w-full"></div>
                <p className="text-[6px] font-black uppercase">Árbitro Central</p>
              </div>
              <div className="space-y-1">
                <div className="h-8 flex items-center justify-center">{signatures.captainAway && <img src={signatures.captainAway} className="max-h-full" />}</div>
                <div className="h-px bg-black w-full"></div>
                <p className="text-[6px] font-black uppercase">Capitán Visitante</p>
              </div>
            </div>
            <p className="text-center text-[5px] text-gray-300 mt-4 font-bold uppercase tracking-widest">REFEREE ELITE - REPORTE OFICIAL INDEPENDIENTE</p>
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
