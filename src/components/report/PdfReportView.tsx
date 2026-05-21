'use client';

import React, { useRef, useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { MatchEvent, MatchState, Player, StaffMember } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { DialogClose } from '@/components/ui/dialog';
import { Download, X, ZoomIn, ZoomOut } from 'lucide-react';
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

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const targetWidth = 794; // 210mm approx in pixels at 96dpi
        const newScale = Math.min(1, (containerWidth - 32) / targetWidth);
        setScale(newScale);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleDownloadPdf = () => {
    const input = reportRef.current;
    if (!input) return;

    html2canvas(input, { scale: 2, useCORS: true }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const ratio = canvasWidth / canvasHeight;
      const imgHeight = pdfWidth / ratio;
      
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;
      }
      
      const fileName = `${teamNames.home || 'LOCAL'}-VS-${teamNames.away || 'VISITA'}.pdf`.toUpperCase();
      pdf.save(fileName);
    });
  };

  const getStarters = (team: 'home' | 'away') => {
    return (lineups[team] || []).slice(0, 11);
  };

  const getSubs = (team: 'home' | 'away') => {
    return (lineups[team] || []).slice(11);
  };

  const getPlayerEventsSummary = (side: 'home' | 'away', number: string, isSub: boolean, p?: Player) => {
    const playerEvs = (events || []).filter(e => e.side === side && e.playerNumber === number);
    const goals = playerEvs.filter(e => e.category === 'goals');
    const yellows = playerEvs.filter(e => e.category === 'cards' && e.message.includes('🟨'));
    const reds = playerEvs.filter(e => e.category === 'cards' && e.message.includes('🟥'));
    const subEv = playerEvs.find(e => e.category === 'substitution');
    
    let summary = [];
    goals.forEach(e => { 
      const icon = e.message.includes('AUTOGOL') ? '🥅' : '⚽';
      summary.push(`${icon}${e.time !== '--' && e.time !== '' ? ` (${e.time})` : ''}`); 
    });
    yellows.forEach(e => { summary.push(` 🟨${e.time !== '--' && e.time !== '' ? ` (${e.time})` : ''}`); });
    reds.forEach(e => { summary.push(` 🟥${e.time !== '--' && e.time !== '' ? ` (${e.time})` : ''}`); });
    
    if (isSub && p?.replacedNumber) {
      summary.push(` (POR: #${p.replacedNumber}${subEv?.time !== '--' && subEv?.time !== '' ? ` ${subEv?.time}` : ''})`);
    }
    
    return summary.join(' ');
  };

  const getStaffEventsSummary = (side: 'home' | 'away', name: string) => {
    const staffEvs = (events || []).filter(e => e.side === side && e.playerName === name);
    const yellows = staffEvs.filter(e => e.category === 'cards' && e.message.includes('🟨'));
    const reds = staffEvs.filter(e => e.category === 'cards' && e.message.includes('🟥'));
    
    let summary = [];
    yellows.forEach(e => { summary.push(` 🟨${e.time !== '--' && e.time !== '' ? ` (${e.time})` : ''}`); });
    reds.forEach(e => { summary.push(` 🟥${e.time !== '--' && e.time !== '' ? ` (${e.time})` : ''}`); });
    
    return summary.join(' ');
  };

  const cardEvents = (events || []).filter(e => e.category === 'cards').sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));
  
  const getGroupedCards = (side: 'home' | 'away') => {
    const sideCards = cardEvents.filter(e => e.side === side);
    const yellows = sideCards.filter(e => e.message.includes('🟨'));
    const reds = sideCards.filter(e => e.message.includes('🟥'));
    return { yellows, reds };
  };

  const homeSanciones = getGroupedCards('home');
  const awaySanciones = getGroupedCards('away');

  const incidentNote = (events || []).find(e => e.category === 'notes')?.message.replace('📝 ', '') || 'SIN INCIDENTES REPORTADOS.';

  const renderPlayerList = (players: Player[], side: 'home' | 'away', isSub: boolean) => (
    <div className="space-y-1">
      {players.map(p => {
        const eventsSummary = getPlayerEventsSummary(side, p.number, isSub, p);

        return (
          <div key={p.id} className="flex justify-between items-center text-[9px] border-b border-gray-100 py-0.5">
            <div className="flex items-center gap-1 uppercase flex-1 truncate">
              <span className="font-bold">{p.number}.- {p.name.toUpperCase()}</span>
              <span className="ml-2 font-medium">{eventsSummary}</span>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderStaffList = (staffMembers: StaffMember[], side: 'home' | 'away') => (
    <div className="space-y-1">
      {staffMembers.map(s => {
        const eventsSummary = getStaffEventsSummary(side, s.name);

        return (
          <div key={s.id} className="flex justify-between items-center text-[9px] border-b border-gray-100 py-0.5">
            <div className="flex items-center gap-1 uppercase flex-1 truncate">
              <span className="font-bold">{s.role.toUpperCase()}: {s.name.toUpperCase()}</span>
              <span className="ml-2 font-medium">{eventsSummary}</span>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="w-full h-full flex flex-col bg-slate-900 overflow-hidden" ref={containerRef}>
      <div className="p-4 flex justify-between items-center bg-slate-800 border-b border-white/10 shrink-0">
        <div>
          <h2 className="text-white font-black italic uppercase text-sm md:text-base">Vista Previa PDF</h2>
          <p className="text-slate-400 text-xs">Ajuste automático para revisión completa.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-white" onClick={() => setScale(prev => Math.min(2, prev + 0.1))}>
            <ZoomIn size={20} />
          </Button>
          <Button variant="ghost" size="icon" className="text-white" onClick={() => setScale(prev => Math.max(0.1, prev - 0.1))}>
            <ZoomOut size={20} />
          </Button>
          <DialogClose className="text-white hover:bg-white/10 p-2 rounded-full">
            <X size={24} />
          </DialogClose>
        </div>
      </div>

      <div className="flex-1 overflow-auto touch-pan-x touch-pan-y p-4 flex justify-center bg-slate-900">
        <div 
          style={{ 
            transform: `scale(${scale})`, 
            transformOrigin: 'top center',
            transition: 'transform 0.1s ease-out'
          }}
          className="shrink-0"
        >
          <div ref={reportRef} className="p-10 bg-white text-black font-sans shadow-2xl" style={{ width: '210mm', minHeight: '297mm' }}>
            <div className="text-center space-y-1 mb-6">
              <h1 className="text-2xl font-black uppercase tracking-tighter">INFORME ARBITRAL</h1>
              <h2 className="text-xs font-bold uppercase tracking-widest">{matchInfo.league?.toUpperCase() || 'LIGA'} | JORNADA {matchInfo.round?.toUpperCase() || 'S/N'}</h2>
              <div className="border-b-2 border-black w-full mt-2"></div>
            </div>

            <div className="grid grid-cols-1 gap-1 text-[10px] mb-4">
              <p><strong>ÁRBITRO:</strong> {matchInfo.referee?.toUpperCase()}</p>
              <div className="grid grid-cols-2 gap-4">
                <p><strong>ASISTENTE 1:</strong> {matchInfo.assistant1?.toUpperCase()}</p>
                <p><strong>ASISTENTE 2:</strong> {matchInfo.assistant2?.toUpperCase()}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-0 border-2 border-black mb-6 text-center bg-gray-50">
              <div className="border-r-2 border-black p-2">
                <p className="text-[9px] font-bold">CLUB LOCAL</p>
                <p className="text-[12px] font-black">{scores.home} ({numberToSpanishWords(scores.home)})</p>
                <h3 className="text-lg font-black uppercase">{teamNames.home.toUpperCase()}</h3>
              </div>
              <div className="p-2">
                <p className="text-[9px] font-bold">CLUB VISITANTE</p>
                <p className="text-[12px] font-black">{scores.away} ({numberToSpanishWords(scores.away)})</p>
                <h3 className="text-lg font-black uppercase">{teamNames.away.toUpperCase()}</h3>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-10">
              <div>
                <div className="text-center font-black text-[12px] mb-2 border-b uppercase">ALINEACIONES LOCAL</div>
                <p className="text-[8px] font-black text-slate-400 mb-1">TITULARES</p>
                {renderPlayerList(getStarters('home'), 'home', false)}
                <p className="text-[8px] font-black text-slate-400 mt-4 mb-1">SUPLENTES / CAMBIOS</p>
                {renderPlayerList(getSubs('home'), 'home', true)}
                <p className="text-[8px] font-black text-slate-400 mt-4 mb-1">CUERPO TÉCNICO</p>
                {renderStaffList(staff.home, 'home')}
              </div>
              <div>
                <div className="text-center font-black text-[12px] mb-2 border-b uppercase">ALINEACIONES VISITA</div>
                <p className="text-[8px] font-black text-slate-400 mb-1">TITULARES</p>
                {renderPlayerList(getStarters('away'), 'away', false)}
                <p className="text-[8px] font-black text-slate-400 mt-4 mb-1">SUPLENTES / CAMBIOS</p>
                {renderPlayerList(getSubs('away'), 'away', true)}
                <p className="text-[8px] font-black text-slate-400 mt-4 mb-1">CUERPO TÉCNICO</p>
                {renderStaffList(staff.away, 'away')}
              </div>
            </div>

            <div className="mt-8 border-t-2 border-black pt-4">
              <h2 className="text-[11px] font-black mb-2 uppercase">DETALLE DE SANCIONES:</h2>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black border-b uppercase">{teamNames.home.toUpperCase()}</h3>
                  <div className="text-[9px] space-y-2">
                    <p className="font-bold underline">AMONESTACIONES:</p>
                    {homeSanciones.yellows.map(e => (
                      <div key={e.id} className="border-b pb-0.5 uppercase">
                        <strong>{e.playerName?.toUpperCase()} 🟨 {e.message.split(' - ').pop()?.toUpperCase()} {e.time !== '--' && e.time !== '' ? `(${e.time})` : ''}</strong>
                      </div>
                    ))}
                    <p className="font-bold underline pt-2">EXPULSIONES:</p>
                    {homeSanciones.reds.map(e => (
                      <div key={e.id} className="border-b pb-0.5 uppercase">
                        <strong>{e.playerName?.toUpperCase()} 🟥 {e.message.split(' - ').pop()?.toUpperCase()} {e.time !== '--' && e.time !== '' ? `(${e.time})` : ''}</strong>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black border-b uppercase">{teamNames.away.toUpperCase()}</h3>
                  <div className="text-[9px] space-y-2">
                    <p className="font-bold underline">AMONESTACIONES:</p>
                    {awaySanciones.yellows.map(e => (
                      <div key={e.id} className="border-b pb-0.5 uppercase">
                        <strong>{e.playerName?.toUpperCase()} 🟨 {e.message.split(' - ').pop()?.toUpperCase()} {e.time !== '--' && e.time !== '' ? `(${e.time})` : ''}</strong>
                      </div>
                    ))}
                    <p className="font-bold underline pt-2">EXPULSIONES:</p>
                    {awaySanciones.reds.map(e => (
                      <div key={e.id} className="border-b pb-0.5 uppercase">
                        <strong>{e.playerName?.toUpperCase()} 🟥 {e.message.split(' - ').pop()?.toUpperCase()} {e.time !== '--' && e.time !== '' ? `(${e.time})` : ''}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <h2 className="text-[11px] font-black mt-6 mb-2 uppercase">INCIDENTES:</h2>
              <div className="text-[9px] p-2 border border-slate-200 rounded min-h-[100px] whitespace-pre-wrap uppercase">
                {incidentNote.toUpperCase()}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6 mt-12 text-center">
              <div className="flex flex-col items-center">
                <div className="h-14 w-full flex items-center justify-center mb-1">
                  {signatures.captainHome && <img src={signatures.captainHome} alt="Firma Cap Local" className="max-h-full" />}
                </div>
                <div className="border-t border-black w-full mb-1"></div>
                <p className="text-[7px] font-bold uppercase">CAPITÁN LOCAL</p>
              </div>
              
              <div className="flex flex-col items-center">
                <div className="h-14 w-full flex items-center justify-center mb-1">
                  {signatures.referee && <img src={signatures.referee} alt="Firma Arb" className="max-h-full" />}
                </div>
                <div className="border-t border-black w-full mb-1"></div>
                <p className="text-[7px] font-bold uppercase">ÁRBITRO CENTRAL</p>
              </div>

              <div className="flex flex-col items-center">
                <div className="h-14 w-full flex items-center justify-center mb-1">
                  {signatures.captainAway && <img src={signatures.captainAway} alt="Firma Cap Visitante" className="max-h-full" />}
                </div>
                <div className="border-t border-black w-full mb-1"></div>
                <p className="text-[7px] font-bold uppercase">CAPITÁN VISITANTE</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 bg-slate-800 border-t border-white/10 shrink-0 flex justify-center">
        <Button onClick={handleDownloadPdf} className="bg-emerald-600 hover:bg-emerald-700 font-black px-10 h-12 uppercase shadow-xl w-full max-w-md">
          <Download className="mr-2 h-5 w-5" /> Descargar PDF
        </Button>
      </div>
    </div>
  );
}
