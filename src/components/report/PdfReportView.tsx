
'use client';

import React, { useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { MatchEvent, MatchState, Player } from '@/lib/types';
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
    signatures = {}
  } = matchState;
  const reportRef = useRef<HTMLDivElement>(null);

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
      pdf.save(`cedula-${matchInfo.league || 'partido'}.pdf`);
    });
  };

  const getStarters = (team: 'home' | 'away') => {
    return (lineups[team] || []).slice(0, 11);
  };

  const getSubs = (team: 'home' | 'away') => {
    return (lineups[team] || []).slice(11);
  };

  const getPlayerEvents = (team: 'home' | 'away', number: string) => {
    return (events || []).filter(e => e.side === team && e.playerNumber === number);
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
        const playerEvs = getPlayerEvents(side, p.number);
        const goalsCount = playerEvs.filter(e => e.category === 'goals').length;
        const hasYellow = playerEvs.some(e => e.category === 'cards' && e.message.includes('🟨'));
        const hasRed = playerEvs.some(e => e.category === 'cards' && e.message.includes('🟥'));

        return (
          <div key={p.id} className="flex justify-between items-center text-[9px] border-b border-gray-100 py-0.5">
            <span className="flex items-center gap-1 uppercase flex-1 truncate">
              {hasRed && '🟥'}{hasYellow && '🟨'}{p.number}.- {p.name}
            </span>
            <div className="flex gap-2 items-center min-w-[60px] justify-end font-black">
              {isSub && p.replacedNumber && <span className="text-[8px] text-rose-600">SALIÓ: #{p.replacedNumber}</span>}
              {goalsCount > 0 && <span className="text-emerald-600">⚽{goalsCount}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="bg-gray-100 p-4 max-h-screen overflow-y-auto rounded-lg relative">
      <DialogClose className="absolute right-4 top-4 z-50 bg-black/20 p-2 rounded-full">
        <X className="h-5 w-5" />
      </DialogClose>
      
      <div className="flex justify-center mb-4">
        <Button onClick={handleDownloadPdf}>
          <Download className="mr-2 h-4 w-4" /> Descargar PDF
        </Button>
      </div>

      <div ref={reportRef} className="p-10 bg-white text-black font-sans mx-auto shadow-2xl" style={{ width: '210mm', minHeight: '297mm' }}>
        <div className="text-center space-y-1 mb-6">
          <h1 className="text-2xl font-black uppercase tracking-tighter">INFORME ARBITRAL</h1>
          <h2 className="text-xs font-bold uppercase tracking-widest">{matchInfo.league || 'LIGA'} | JORNADA {matchInfo.round || 'S/N'}</h2>
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
            <h3 className="text-lg font-black uppercase">{teamNames.home}</h3>
          </div>
          <div className="p-2">
            <p className="text-[9px] font-bold">CLUB VISITANTE</p>
            <p className="text-[12px] font-black">{scores.away} ({numberToSpanishWords(scores.away)})</p>
            <h3 className="text-lg font-black uppercase">{teamNames.away}</h3>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-10">
          <div>
            <div className="text-center font-black text-[12px] mb-2 border-b uppercase">ALINEACIONES LOCAL</div>
            <p className="text-[8px] font-black text-slate-400 mb-1">TITULARES</p>
            {renderPlayerList(getStarters('home'), 'home', false)}
            <p className="text-[8px] font-black text-slate-400 mt-4 mb-1">SUPLENTES / CAMBIOS</p>
            {renderPlayerList(getSubs('home'), 'home', true)}
          </div>
          <div>
            <div className="text-center font-black text-[12px] mb-2 border-b uppercase">ALINEACIONES VISITA</div>
            <p className="text-[8px] font-black text-slate-400 mb-1">TITULARES</p>
            {renderPlayerList(getStarters('away'), 'away', false)}
            <p className="text-[8px] font-black text-slate-400 mt-4 mb-1">SUPLENTES / CAMBIOS</p>
            {renderPlayerList(getSubs('away'), 'away', true)}
          </div>
        </div>

        <div className="mt-8 border-t-2 border-black pt-4">
          <h2 className="text-[11px] font-black mb-2 uppercase">DETALLE DE SANCIONES:</h2>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-[10px] font-black border-b uppercase">{teamNames.home}</h3>
              <div className="text-[9px] space-y-2">
                <p className="font-bold underline">AMONESTACIONES:</p>
                {homeSanciones.yellows.map(e => (
                  <div key={e.id} className="border-b pb-0.5 uppercase"><strong>#{e.playerNumber} ({e.time})</strong>: {e.message.split(' - ').pop()}</div>
                ))}
                <p className="font-bold underline pt-2">EXPULSIONES:</p>
                {homeSanciones.reds.map(e => (
                  <div key={e.id} className="border-b pb-0.5 uppercase"><strong>#{e.playerNumber} ({e.time})</strong>: {e.message.split(' - ').pop()}</div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-[10px] font-black border-b uppercase">{teamNames.away}</h3>
              <div className="text-[9px] space-y-2">
                <p className="font-bold underline">AMONESTACIONES:</p>
                {awaySanciones.yellows.map(e => (
                  <div key={e.id} className="border-b pb-0.5 uppercase"><strong>#{e.playerNumber} ({e.time})</strong>: {e.message.split(' - ').pop()}</div>
                ))}
                <p className="font-bold underline pt-2">EXPULSIONES:</p>
                {awaySanciones.reds.map(e => (
                  <div key={e.id} className="border-b pb-0.5 uppercase"><strong>#{e.playerNumber} ({e.time})</strong>: {e.message.split(' - ').pop()}</div>
                ))}
              </div>
            </div>
          </div>

          <h2 className="text-[11px] font-black mt-6 mb-2 uppercase">INCIDENTES:</h2>
          <div className="text-[9px] p-2 border border-slate-200 rounded min-h-[100px] whitespace-pre-wrap uppercase">
            {incidentNote}
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
  );
}
