'use client';

import React, { useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { MatchEvent, MatchState, Player } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { DialogClose, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, X } from 'lucide-react';
import { parseTimeToMinutes } from '@/lib/utils';

interface PdfReportViewProps {
  matchState: MatchState;
}

export function PdfReportView({ matchState }: PdfReportViewProps) {
  const { matchInfo, teamNames, scores, events, lineups, staff, attendance, timing } = matchState;
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

  const getPlayersByType = (team: 'home' | 'away', type: 'starter' | 'substitute') => {
    return lineups[team].filter(p => p.type === type).sort((a, b) => parseInt(a.number) - parseInt(b.number));
  };

  const getPlayerEvents = (team: 'home' | 'away', number: string) => {
    return events.filter(e => e.side === team && e.playerNumber === number);
  };

  const homeStarters = getPlayersByType('home', 'starter');
  const awayStarters = getPlayersByType('away', 'starter');
  const homeSubs = getPlayersByType('home', 'substitute');
  const awaySubs = getPlayersByType('away', 'substitute');
  const changes = events.filter(e => e.category === 'subs').sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));
  const cards = events.filter(e => e.category === 'cards').sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));

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
        {/* HEADER */}
        <div className="text-center space-y-1 mb-6">
          <h2 className="text-lg font-bold uppercase tracking-widest">{matchInfo.league || 'TORNEO LIGA'} JORNADA {matchInfo.round || '30'}</h2>
          <h1 className="text-2xl font-black uppercase">INFORME DEL ARBITRO</h1>
          <div className="border-b-2 border-black w-full mt-2"></div>
        </div>

        {/* OFFICIALS */}
        <div className="grid grid-cols-1 gap-1 text-[11px] mb-6">
          <p><strong>ÁRBITRO:</strong> {matchInfo.referee?.toUpperCase()}</p>
          <p><strong>ÁRBITRO ASISTENTE No. 1:</strong> {matchInfo.assistant1?.toUpperCase()}</p>
          <p><strong>ÁRBITRO ASISTENTE No. 2:</strong> {matchInfo.assistant2?.toUpperCase()}</p>
        </div>

        {/* MATCH DESC */}
        <div className="text-[10px] text-center italic mb-6 px-10">
          INFORME ARBITRAL DEL PARTIDO DE FÚTBOL EFECTUADO EL {matchInfo.date || '___'} A LAS {timing?.firstHalfStart || '___'} HRS. 
          EN EL ESTADIO {matchInfo.place || '___'} ENTRE LOS EQUIPOS DE:
        </div>

        {/* TEAMS HEADER */}
        <div className="grid grid-cols-2 gap-0 border-2 border-black mb-8 text-center bg-gray-50">
          <div className="border-r-2 border-black p-2">
            <p className="text-[10px] font-bold">CLUB LOCAL</p>
            <p className="text-[9px]">Total Tantos: {scores.home}</p>
            <h3 className="text-lg font-black uppercase">{teamNames.home}</h3>
          </div>
          <div className="p-2">
            <p className="text-[10px] font-bold">CLUB VISITANTE</p>
            <p className="text-[9px]">Total Tantos: {scores.away}</p>
            <h3 className="text-lg font-black uppercase">{teamNames.away}</h3>
          </div>
        </div>

        {/* LINEUPS SECTION */}
        <div className="text-center font-bold text-[12px] mb-2">ALINEACIÓN INICIAL</div>
        <div className="grid grid-cols-2 gap-10 mb-8">
          {/* HOME LINEUP */}
          <div className="space-y-1">
            {homeStarters.map(p => (
              <div key={p.id} className="flex justify-between items-center text-[10px] border-b border-gray-100">
                <span>{p.number}.- {p.name}</span>
                <div className="flex gap-2">
                  {getPlayerEvents('home', p.number).map(e => (
                    <span key={e.id} className="text-[9px] font-bold">
                      {e.category === 'goals' ? `G (${e.time})` : e.message.includes('🟨') ? '🟨' : '🟥'}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {/* AWAY LINEUP */}
          <div className="space-y-1">
            {awayStarters.map(p => (
              <div key={p.id} className="flex justify-between items-center text-[10px] border-b border-gray-100">
                <span>{p.number}.- {p.name}</span>
                <div className="flex gap-2">
                  {getPlayerEvents('away', p.number).map(e => (
                    <span key={e.id} className="text-[9px] font-bold">
                      {e.category === 'goals' ? `G (${e.time})` : e.message.includes('🟨') ? '🟨' : '🟥'}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SUBSTITUTES */}
        <div className="text-center font-bold text-[12px] mb-2">SUPLENTES</div>
        <div className="grid grid-cols-2 gap-10 mb-8">
          <div className="space-y-1">
            {homeSubs.map(p => (
              <div key={p.id} className="text-[10px] border-b border-gray-100">{p.number}.- {p.name}</div>
            ))}
          </div>
          <div className="space-y-1">
            {awaySubs.map(p => (
              <div key={p.id} className="text-[10px] border-b border-gray-100">{p.number}.- {p.name}</div>
            ))}
          </div>
        </div>

        {/* CHANGES */}
        <div className="text-center font-bold text-[12px] mb-2">CAMBIOS</div>
        <div className="grid grid-cols-2 gap-10 mb-8 text-[10px]">
          <div className="space-y-1">
            {changes.filter(e => e.side === 'home').map(e => (
              <div key={e.id}>{e.message} Min: {e.time}</div>
            ))}
          </div>
          <div className="space-y-1">
            {changes.filter(e => e.side === 'away').map(e => (
              <div key={e.id}>{e.message} Min: {e.time}</div>
            ))}
          </div>
        </div>

        {/* STAFF */}
        <div className="text-center font-bold text-[12px] mb-2">CUERPO TÉCNICO</div>
        <div className="grid grid-cols-2 gap-10 mb-10 text-[10px]">
          <div className="space-y-1">
            {staff.home.map(s => (
              <div key={s.id} className="flex justify-between"><span>{s.name}</span> <span className="italic">{s.role}</span></div>
            ))}
          </div>
          <div className="space-y-1">
            {staff.away.map(s => (
              <div key={s.id} className="flex justify-between"><span>{s.name}</span> <span className="italic">{s.role}</span></div>
            ))}
          </div>
        </div>

        {/* FOOTER TIMES */}
        <div className="grid grid-cols-2 gap-4 text-[11px] border-t-2 border-black pt-4">
          <div className="space-y-1">
            <p>El primer tiempo empezó a las: {timing?.firstHalfStart || '--:--'} Terminó a las: {timing?.firstHalfEnd || '--:--'}</p>
            <p>El segundo tiempo empezó a las: {timing?.secondHalfStart || '--:--'} Terminó a las: {timing?.secondHalfEnd || '--:--'}</p>
          </div>
          <div className="text-right">
            <p className="font-bold">Asistencia aproximada: {attendance || '0'}</p>
          </div>
        </div>

        {/* PAGE BREAK FOR CARDS & INCIDENTS */}
        <div className="mt-20 border-t-4 border-double border-gray-300 pt-10">
          <h2 className="text-lg font-bold mb-4 uppercase">TARJETAS {teamNames.home.toUpperCase()}:</h2>
          <div className="space-y-2 mb-8 text-[11px]">
            {cards.filter(e => e.side === 'home').map(e => (
              <div key={e.id} className="border-b pb-1">({e.playerNumber}) {e.playerName} - Min: {e.time}. {e.message.split(' - ')[1]}</div>
            ))}
          </div>

          <h2 className="text-lg font-bold mb-4 uppercase">TARJETAS {teamNames.away.toUpperCase()}:</h2>
          <div className="space-y-2 mb-8 text-[11px]">
            {cards.filter(e => e.side === 'away').map(e => (
              <div key={e.id} className="border-b pb-1">({e.playerNumber}) {e.playerName} - Min: {e.time}. {e.message.split(' - ')[1]}</div>
            ))}
          </div>

          <h2 className="text-lg font-black mb-4 uppercase">INCIDENTES DEL PARTIDO:</h2>
          <div className="text-[11px] space-y-4">
            {events.filter(e => e.category === 'notes' || e.category === 'general').map((e, idx) => (
              <p key={e.id}>{idx + 1}.- {e.message.replace('📝 ', '')}</p>
            ))}
            {events.filter(e => e.category === 'notes' || e.category === 'general').length === 0 && (
              <p className="italic text-gray-400">Sin incidentes reportados.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
