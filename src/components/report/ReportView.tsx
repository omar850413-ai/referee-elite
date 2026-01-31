'use client';

import React, { useRef } from 'react';
import { MatchState, MatchEvent } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface ReportViewProps {
  matchState: MatchState;
}

export function ReportView({ matchState }: ReportViewProps) {
  const { scores, teamNames, matchInfo, events, fouls } = matchState;
  const svgRef = useRef<SVGSVGElement>(null);

  const handleDownload = () => {
    if (!svgRef.current) return;

    const svg = svgRef.current;
    const style = document.createElement('style');
    style.innerHTML = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
    svg { font-family: 'Inter', sans-serif; }`;
    svg.insertBefore(style, svg.firstChild);

    const svgData = new XMLSerializer().serializeToString(svg);
    svg.removeChild(style);

    const canvas = document.createElement('canvas');
    const scale = 2;
    canvas.width = 800 * scale;
    canvas.height = 1200 * scale; // Increased height for more content
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    const img = new Image();
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));

    img.onload = () => {
      ctx.scale(scale, scale);
      ctx.fillStyle = '#0F172A';
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

  const homeGoals = events.filter(e => e.category === 'goals' && e.message.includes(`(${teamNames.home})`));
  const awayGoals = events.filter(e => e.category === 'goals' && e.message.includes(`(${teamNames.away})`));
  const homeYellowCards = events.filter(e => e.category === 'cards' && e.message.includes('🟨') && e.message.includes(`(${teamNames.home})`));
  const awayYellowCards = events.filter(e => e.category === 'cards' && e.message.includes('🟨') && e.message.includes(`(${teamNames.away})`));
  const homeRedCards = events.filter(e => e.category === 'cards' && e.message.includes('🟥') && e.message.includes(`(${teamNames.home})`));
  const awayRedCards = events.filter(e => e.category === 'cards' && e.message.includes('🟥') && e.message.includes(`(${teamNames.away})`));
  const homeSubs = events.filter(e => e.category === 'subs' && e.message.includes(`(${teamNames.home})`));
  const awaySubs = events.filter(e => e.category === 'subs' && e.message.includes(`(${teamNames.away})`));
  const notes = events.filter(e => e.category === 'notes');

  const renderSection = (
    title: string,
    items: MatchEvent[] | number,
    x: number,
    startY: number,
    icon?: string,
    teamName?: string
  ) => {
    if (Array.isArray(items) && items.length === 0) return { elements: [], endY: startY };

    let y = startY;
    const elements: JSX.Element[] = [];

    elements.push(
      <text key={`${x}-${title}`} x={x} y={y} fontFamily="Inter, sans-serif" fontSize="16" fontWeight="700" fill="#94A3B8" style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        {title}
      </text>
    );
    y += 25;

    if (typeof items === 'number') {
      elements.push(
        <text key={`${x}-fouls-count`} x={x} y={y} fontFamily="Inter, sans-serif" fontSize="24" fontWeight="900" fill="#F8FAFC">
          {items}
        </text>
      );
      y += 35;
    } else {
      items.forEach(event => {
        let message = event.message;
        if (icon && teamName) {
          message = message.replace(`(${teamName})`, '').replace(icon, '').replace('GOL', '').replace('PENAL', '(P)').replace('AUTOGOL', '(AG)').replace('Cambio:', '').split(' - ')[0].trim();
        } else if (icon === '📝') {
          message = message.replace(icon, '').trim();
        }

        elements.push(
          <text key={event.id} x={x} y={y} fontFamily="Inter, sans-serif" fontSize="14" fill="#CBD5E1">
            <tspan fontWeight="700" fill="hsl(var(--primary))">{`${event.time}'`}</tspan>
            <tspan dx="15">{message}</tspan>
          </text>
        );
        y += 20;
      });
      y += 10;
    }
    return { elements, endY: y };
  };
  
  let yHome = 460;
  const homeColumn = [];
  const homeGoalsSection = renderSection('Goles', homeGoals, 50, yHome, '⚽', teamNames.home);
  homeColumn.push(...homeGoalsSection.elements);
  yHome = homeGoalsSection.endY;

  const homeYellowsSection = renderSection('Amarillas', homeYellowCards, 50, yHome, '🟨', teamNames.home);
  homeColumn.push(...homeYellowsSection.elements);
  yHome = homeYellowsSection.endY;

  const homeRedsSection = renderSection('Rojas', homeRedCards, 50, yHome, '🟥', teamNames.home);
  homeColumn.push(...homeRedsSection.elements);
  yHome = homeRedsSection.endY;

  const homeSubsSection = renderSection('Cambios', homeSubs, 50, yHome, '🔄', teamNames.home);
  homeColumn.push(...homeSubsSection.elements);
  yHome = homeSubsSection.endY;

  const homeFoulsSection = renderSection('Faltas', fouls.home, 50, yHome);
  homeColumn.push(...homeFoulsSection.elements);
  yHome = homeFoulsSection.endY;


  let yAway = 460;
  const awayColumn = [];
  const awayGoalsSection = renderSection('Goles', awayGoals, 420, yAway, '⚽', teamNames.away);
  awayColumn.push(...awayGoalsSection.elements);
  yAway = awayGoalsSection.endY;

  const awayYellowsSection = renderSection('Amarillas', awayYellowCards, 420, yAway, '🟨', teamNames.away);
  awayColumn.push(...awayYellowsSection.elements);
  yAway = awayYellowsSection.endY;

  const awayRedsSection = renderSection('Rojas', awayRedCards, 420, yAway, '🟥', teamNames.away);
  awayColumn.push(...awayRedsSection.elements);
  yAway = awayRedsSection.endY;
  
  const awaySubsSection = renderSection('Cambios', awaySubs, 420, yAway, '🔄', teamNames.away);
  awayColumn.push(...awaySubsSection.elements);
  yAway = awaySubsSection.endY;

  const awayFoulsSection = renderSection('Faltas', fouls.away, 420, yAway);
  awayColumn.push(...awayFoulsSection.elements);
  yAway = awayFoulsSection.endY;
  
  const contentEndY = Math.max(yHome, yAway);
  
  const notesSection = renderSection('Anotaciones del Asesor', notes, 50, contentEndY + 20, '📝');
  const finalY = notesSection.endY + 20;

  return (
    <div className="w-full">
      <div className="bg-slate-900 p-2 md:p-4 rounded-lg border border-slate-700 aspect-[2/3] overflow-auto">
        <svg ref={svgRef} viewBox="0 0 800 1200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <defs>
            <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 0.2 }} />
              <stop offset="100%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 0 }} />
            </linearGradient>
          </defs>
          <rect width="800" height="1200" fill="#0F172A" />
          <rect x="-200" y="-200" width="600" height="600" transform="rotate(45)" fill="url(#grad1)" />

          {/* Header */}
          <text x="400" y="80" fontFamily="Inter, sans-serif" fontSize="24" fontWeight="700" letterSpacing="0.1em" textAnchor="middle" fill="#94A3B8" style={{ textTransform: 'uppercase' }}>
            Informe Oficial del Partido
          </text>
          <text x="400" y="120" fontFamily="Inter, sans-serif" fontSize="32" fontWeight="900" textAnchor="middle" fill="#F1F5F9">
            {matchInfo.league || 'Liga Profesional'}
          </text>
          <text x="400" y="150" fontFamily="Inter, sans-serif" fontSize="20" textAnchor="middle" fill="#64748B">
            Jornada {matchInfo.round || 'N/A'}
          </text>
          
          {/* Main Score */}
          <text x="50" y="280" fontFamily="Inter, sans-serif" fontSize="32" fontWeight="900" textAnchor="start" fill="#F8FAFC" style={{ textTransform: 'uppercase' }}>
            {teamNames.home}
          </text>
          <text x="750" y="280" fontFamily="Inter, sans-serif" fontSize="32" fontWeight="900" textAnchor="end" fill="#F8FAFC" style={{ textTransform: 'uppercase' }}>
            {teamNames.away}
          </text>
          <text x="400" y="320" fontFamily="Inter, sans-serif" fontSize="120" fontWeight="900" textAnchor="middle" fill="hsl(var(--primary))">
            {`${scores.home} - ${scores.away}`}
          </text>
          <text x="400" y="360" fontFamily="Inter, sans-serif" fontSize="18" fontWeight="700" textAnchor="middle" fill="#475569" style={{ textTransform: 'uppercase', letterSpacing: '0.2em' }}>
            Marcador Final
          </text>

          {/* Separator */}
          <line x1="50" y1="420" x2="750" y2="420" stroke="hsl(var(--primary))" strokeWidth="2" strokeOpacity="0.3" />
          
          {/* Columns */}
          {homeColumn}
          {awayColumn}
          
          {/* Notes */}
          {notesSection.elements.length > 0 && (
            <line x1="50" y1={contentEndY} x2="750" y2={contentEndY} stroke="#334155" strokeWidth="1" strokeDasharray="5" />
          )}
          {notesSection.elements}

          {/* Footer */}
          <line x1="50" y1={finalY + 20} x2="750" y2={finalY + 20} stroke="#334155" strokeWidth="1" />
          <text x="50" y={finalY + 60} fontFamily="Inter, sans-serif" fontSize="16" fill="#64748B">
            Asesor: <tspan fontWeight="700">{matchInfo.advisor || 'No especificado'}</tspan>
          </text>
          <text x="750" y={finalY + 60} fontFamily="Inter, sans-serif" fontSize="20" fontWeight="900" textAnchor="end" fill="hsl(var(--primary))" style={{ textTransform: 'uppercase', fontStyle: 'italic' }}>
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
