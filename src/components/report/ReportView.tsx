'use client';

import React, { useRef } from 'react';
import { MatchState } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface ReportViewProps {
  matchState: MatchState;
}

export function ReportView({ matchState }: ReportViewProps) {
  const { scores, teamNames, matchInfo, events } = matchState;
  const svgRef = useRef<SVGSVGElement>(null);

  const handleDownload = () => {
    if (!svgRef.current) return;

    const svg = svgRef.current;
    // Get styles from stylesheet
    const style = document.createElement('style');
    style.innerHTML = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
    svg { font-family: 'Inter', sans-serif; }`;
    svg.insertBefore(style, svg.firstChild);


    const svgData = new XMLSerializer().serializeToString(svg);
    svg.removeChild(style);

    const canvas = document.createElement('canvas');
    // Upscale for better quality
    const scale = 2;
    canvas.width = 800 * scale;
    canvas.height = 1000 * scale;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    const img = new Image();
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));

    img.onload = () => {
      ctx.scale(scale, scale);
      ctx.fillStyle = '#0F172A'; // Dark background
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const jpegUrl = canvas.toDataURL('image/jpeg', 0.95);
      const link = document.createElement('a');
      link.href = jpegUrl;
      link.download = `informe-asesor-${matchInfo.league || 'partido'}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };
  };
  
  const importantEvents = events
    .filter(e => e.category === 'goals' || e.category === 'cards' || e.category === 'subs')
    .sort((a, b) => a.id - b.id)
    .slice(0, 7);

  return (
    <div className="w-full">
      <div className="bg-slate-900 p-2 md:p-4 rounded-lg border border-slate-700 aspect-[4/5] overflow-auto">
        <svg ref={svgRef} viewBox="0 0 800 1000" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <defs>
            <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 0.2 }} />
              <stop offset="100%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 0 }} />
            </linearGradient>
          </defs>
          <rect width="800" height="1000" fill="#0F172A" />
          <rect x="-200" y="-200" width="600" height="600" transform="rotate(45)" fill="url(#grad1)" />

          {/* Header */}
          <text x="400" y="80" fontFamily="Inter, sans-serif" fontSize="24" fontWeight="700" letterSpacing="0.1em" textAnchor="middle" fill="#94A3B8"
            style={{ textTransform: 'uppercase' }}>
            Informe Oficial del Partido
          </text>
          <text x="400" y="120" fontFamily="Inter, sans-serif" fontSize="32" fontWeight="900" textAnchor="middle" fill="#F1F5F9">
            {matchInfo.league || 'Liga Profesional'}
          </text>
          <text x="400" y="150" fontFamily="Inter, sans-serif" fontSize="20" textAnchor="middle" fill="#64748B">
            Jornada {matchInfo.round || 'N/A'}
          </text>
          
          {/* Main Score */}
          <text x="220" y="280" fontFamily="Inter, sans-serif" fontSize="40" fontWeight="900" textAnchor="end" fill="#F8FAFC"
            style={{ textTransform: 'uppercase' }}>
            {teamNames.home}
          </text>
          <text x="580" y="280" fontFamily="Inter, sans-serif" fontSize="40" fontWeight="900" textAnchor="start" fill="#F8FAFC"
            style={{ textTransform: 'uppercase' }}>
            {teamNames.away}
          </text>
          <text x="400" y="320" fontFamily="Inter, sans-serif" fontSize="160" fontWeight="900" textAnchor="middle" fill="hsl(var(--primary))">
            {`${scores.home} - ${scores.away}`}
          </text>
          <text x="400" y="360" fontFamily="Inter, sans-serif" fontSize="18" fontWeight="700" textAnchor="middle" fill="#475569"
            style={{ textTransform: 'uppercase', letterSpacing: '0.2em' }}>
            Marcador Final
          </text>

          {/* Separator */}
          <line x1="100" y1="420" x2="700" y2="420" stroke="hsl(var(--primary))" strokeWidth="2" strokeOpacity="0.3" />

          {/* Events */}
          <text x="100" y="480" fontFamily="Inter, sans-serif" fontSize="24" fontWeight="700" fill="#94A3B8">Bitácora de Eventos</text>
          <g transform="translate(100, 520)">
            {importantEvents.map((event, index) => (
              <text key={event.id} y={index * 50} fontFamily="Inter, sans-serif" fontSize="18" fill="#CBD5E1">
                <tspan fontWeight="900" fill="hsl(var(--primary))">{`${event.time}'`}</tspan>
                <tspan dx="20">{event.message}</tspan>
              </text>
            ))}
          </g>

          {/* Footer */}
          <line x1="100" y1="900" x2="700" y2="900" stroke="#334155" strokeWidth="1" />
          <text x="100" y="940" fontFamily="Inter, sans-serif" fontSize="16" fill="#64748B">
            Asesor: <tspan fontWeight="700">{matchInfo.advisor || 'No especificado'}</tspan>
          </text>
          <text x="700" y="940" fontFamily="Inter, sans-serif" fontSize="20" fontWeight="900" textAnchor="end" fill="hsl(var(--primary))"
             style={{ textTransform: 'uppercase', fontStyle: 'italic' }}>
            Asesor Pro
          </text>
        </svg>
      </div>
      <div className="mt-4 flex justify-end">
        <Button onClick={handleDownload}>
          <Download className="mr-2 h-4 w-4" />
          Descargar como JPEG
        </Button>
      </div>
    </div>
  );
}
