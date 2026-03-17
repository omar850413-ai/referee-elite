'use client';

import React, { useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { MatchEvent, MatchState } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { DialogClose, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, X } from 'lucide-react';
import { parseTimeToMinutes } from '@/lib/utils';

interface PdfReportViewProps {
  matchState: MatchState;
}

export function PdfReportView({ matchState }: PdfReportViewProps) {
  const { matchInfo, teamNames, scores, events, penaltyShootout, reportSettings } = matchState;
  const reportRef = useRef<HTMLDivElement>(null);

  const handleDownloadPdf = () => {
    const input = reportRef.current;
    if (!input) return;

    html2canvas(input, {
      scale: 2,
      useCORS: true, 
      logging: false
    }).then((canvas) => {
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
      
      pdf.save(`informe-partido-${matchInfo.league || 'liga'}.pdf`);
    });
  };

  // Filtrar eventos basándose en la configuración del reporte
  const filteredAndSortedEvents = [...events]
    .filter(e => {
      const isStandard = ['goals', 'cards', 'notes'].includes(e.category);
      const isFoulEnabled = reportSettings?.showFouls && (e.category === 'fouls' || (e.category === 'general' && e.message.includes('🚩 Falta')));
      return isStandard || isFoulEnabled;
    })
    .sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));

  return (
    <div className="bg-gray-200 p-4 max-h-[85vh] overflow-y-auto rounded-lg relative">
        <DialogClose className="absolute right-4 top-4 z-10 rounded-full bg-black/10 p-1 text-black/60 backdrop-blur-sm transition-all hover:bg-black/20 hover:text-black">
            <X className="h-5 w-5" />
            <span className="sr-only">Cerrar</span>
        </DialogClose>
        <DialogHeader className="px-2 pb-4">
            <DialogTitle>Informe del Partido (PDF)</DialogTitle>
            <DialogDescription>
              Este es un resumen del partido para generar un PDF. Puedes descargarlo.
            </DialogDescription>
        </DialogHeader>

      <div 
        ref={reportRef} 
        className="p-6 bg-white text-black font-sans shadow-lg mx-auto"
        style={{ width: '210mm', minHeight: '297mm' }}
      >
        <h1 className="text-2xl font-bold text-center mb-2">Informe de Asesor de Árbitros</h1>
        <hr className="my-4 border-black" />

        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm mb-4">
          <div><strong>Torneo:</strong> {matchInfo.league || 'N/A'}</div>
          <div><strong>Jornada:</strong> {matchInfo.round || 'N/A'}</div>
          <div><strong>Lugar:</strong> {matchInfo.place || 'N/A'}</div>
          <div><strong>Fecha:</strong> {matchInfo.date || 'N/A'}</div>
          <div><strong>Asesor:</strong> {matchInfo.advisor || 'N/A'}</div>
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm mb-4">
          <div><strong>Árbitro:</strong> {matchInfo.referee || 'N/A'}</div>
          <div><strong>Asistente 1:</strong> {matchInfo.assistant1 || 'N/A'}</div>
          <div><strong>Asistente 2:</strong> {matchInfo.assistant2 || 'N/A'}</div>
          <div><strong>Cuarto Árbitro:</strong> {matchInfo.fourthOfficial || 'N/A'}</div>
          <div><strong>VAR:</strong> {matchInfo.var || 'N/A'}</div>
          <div><strong>AVAR:</strong> {matchInfo.avar || 'N/A'}</div>
        </div>
        <hr className="my-4 border-black" />

        <div className="text-center my-6">
          <span className="text-3xl font-bold uppercase">{teamNames.home}</span>
          <span className="text-4xl font-bold mx-4 p-2 bg-gray-200 rounded-md">{scores.home} - {scores.away}</span>
          <span className="text-3xl font-bold uppercase">{teamNames.away}</span>
          {penaltyShootout && penaltyShootout.active && (
            <div className="mt-2 text-lg font-semibold">
              (Penales: {penaltyShootout.home} - {penaltyShootout.away})
            </div>
          )}
        </div>
        <hr className="my-4 border-black" />

        <h2 className="text-xl font-bold mb-4">Incidentes del Partido</h2>
        <table className="w-full text-sm border-collapse">
            <thead>
                <tr className="border-b-2 border-black">
                    <th className="w-[12%] text-left font-bold p-2">Minuto</th>
                    <th className="w-[20%] text-left font-bold p-2">Acción</th>
                    <th className="w-[48%] text-left font-bold p-2">Descripción</th>
                    <th className="w-[20%] text-left font-bold p-2">Valoración</th>
                </tr>
            </thead>
            <tbody>
                {filteredAndSortedEvents.map(event => {
                    let accion = '';
                    let descripcion = '';
                    const message = event.message;

                    switch (event.category) {
                        case 'goals':
                            if (message.includes('PENAL')) accion = 'Penal';
                            else if (message.includes('AUTOGOL')) accion = 'Autogol';
                            else accion = 'Gol';
                            descripcion = message.replace(/⚽|GOL|PENAL|AUTOGOL/gi, '').trim();
                            break;
                        case 'cards':
                            if (message.includes('🟨')) accion = 'Amonestación';
                            else if (message.includes('🟥')) accion = 'Expulsión';
                            descripcion = message.replace(/🟨|🟥/g, '').trim();
                            break;
                        case 'notes':
                            accion = 'Anotación';
                            descripcion = message.replace('📝 ', '').trim();
                            break;
                        case 'fouls':
                            accion = 'Falta';
                            descripcion = message.replace('🚩 ', '').trim();
                            break;
                        case 'general':
                            if (message.includes('🚩 Falta')) {
                                accion = 'Falta';
                                descripcion = message.replace('🚩 ', '').trim();
                            } else {
                                accion = 'General';
                                descripcion = message;
                            }
                            break;
                        default:
                            accion = '';
                            descripcion = message;
                    }
                    
                    return (
                        <tr key={event.id} className="border-b border-gray-300 align-top">
                            <td className="p-2">{event.time}</td>
                            <td className="p-2 font-semibold">{accion}</td>
                            <td className="p-2">
                                {descripcion}
                                {event.pdfDescription && (
                                    <div className="mt-1 text-gray-600 italic">
                                        {event.pdfDescription}
                                    </div>
                                )}
                            </td>
                            <td className="p-2 font-bold">
                                {event.valuation === 'correcta' && <span style={{ color: 'green' }}>Correcto</span>}
                                {event.valuation === 'incorrecta' && <span style={{ color: 'red' }}>Incorrecto</span>}
                            </td>
                        </tr>
                    );
                })}

                {filteredAndSortedEvents.length === 0 && (
                    <tr>
                        <td colSpan={4} className="text-center text-gray-500 p-4">
                            No hay incidentes para reportar.
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
      </div>

      <div className="sticky bottom-0 -mx-4 -mb-4 mt-4 flex justify-end bg-gray-200/80 p-4 backdrop-blur-sm border-t border-gray-300">
        <Button onClick={handleDownloadPdf}>
          <Download className="mr-2 h-4 w-4" />
          Descargar como PDF
        </Button>
      </div>
    </div>
  );
}