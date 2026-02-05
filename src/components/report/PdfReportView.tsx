'use client';

import React, { useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { MatchState } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { parseTimeToMinutes } from '@/lib/utils';

interface PdfReportViewProps {
  matchState: MatchState;
}

export function PdfReportView({ matchState }: PdfReportViewProps) {
  const { matchInfo, teamNames, scores, events } = matchState;
  const reportRef = useRef<HTMLDivElement>(null);

  const handleDownloadPdf = () => {
    const input = reportRef.current;
    if (!input) return;

    html2canvas(input, {
      scale: 2, // Higher scale for better resolution
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

  const filteredAndSortedEvents = [...events]
    .filter(e => ['goals', 'cards', 'notes'].includes(e.category))
    .sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));

  // Function to clean up the message for the PDF report
  const cleanMessage = (message: string) => {
    return message
      .replace(/⚽|🟨|🟥|📝/g, '') // Remove emojis
      .replace(/\(LOCAL\)|\(VISITA\)/gi, '') // Remove team indicators
      .replace(/GOL|PENAL|AUTOGOL/gi, (match) => `${match.toUpperCase()}`) // Ensure goal types are uppercase
      .trim();
  };

  return (
    <div className="bg-gray-200 p-4 max-h-[70vh] overflow-y-auto">
      <div 
        ref={reportRef} 
        className="p-8 bg-white text-black font-sans shadow-lg"
        style={{ width: '210mm', minHeight: '297mm' }} // A4 size
      >
        <h1 className="text-2xl font-bold text-center mb-2">Informe de Asesor de Árbitros</h1>
        <hr className="my-4 border-black" />

        {/* Match Info */}
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
        </div>
        <hr className="my-4 border-black" />

        {/* Score */}
        <div className="text-center my-6">
          <span className="text-3xl font-bold uppercase">{teamNames.home}</span>
          <span className="text-4xl font-bold mx-4 p-2 bg-gray-200 rounded-md">{scores.home} - {scores.away}</span>
          <span className="text-3xl font-bold uppercase">{teamNames.away}</span>
        </div>
        <hr className="my-4 border-black" />

        {/* Incidents */}
        <h2 className="text-xl font-bold mb-4">Incidentes del Partido</h2>
        <div className="space-y-4 text-sm">
          {filteredAndSortedEvents.map(event => (
            <div key={event.id} className="border-b border-gray-200 pb-3">
              <p className="flex items-start">
                <span className="font-bold w-16 flex-shrink-0">{event.time}'</span>
                <span className="font-semibold">{cleanMessage(event.message)}</span>
              </p>
              {event.pdfDescription && (
                <p className="pl-16 mt-1 text-gray-700 italic">
                  <strong>Descripción Adicional:</strong> {event.pdfDescription}
                </p>
              )}
            </div>
          ))}
          {filteredAndSortedEvents.length === 0 && (
            <p className="text-gray-500">No hay incidentes (goles, tarjetas, notas) para reportar.</p>
          )}
        </div>
      </div>

      <div className="mt-4 flex justify-end sticky bottom-0 bg-gray-200 py-2 pr-2">
        <Button onClick={handleDownloadPdf}>
          <Download className="mr-2 h-4 w-4" />
          Descargar como PDF
        </Button>
      </div>
    </div>
  );
}
