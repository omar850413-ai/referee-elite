'use client';

import React, { useRef } from 'react';
import { MatchState, MatchEvent } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';

interface ReportViewProps {
  matchState: MatchState;
}

export function ReportView({ matchState }: ReportViewProps) {
  const { scores, teamNames, matchInfo, events, fouls } = matchState;
  const svgRef = useRef<SVGSVGElement>(null);
  
  const localBg = PlaceHolderImages.find(p => p.id === 'local-team-bg')?.imageUrl;
  const awayBg = PlaceHolderImages.find(p => p.id === 'away-team-bg')?.imageUrl;

  const handleDownload = () => {
    if (!svgRef.current) return;

    const svg = svgRef.current;
    const style = document.createElement('style');
    // It's important to embed the font that the SVG uses.
    style.innerHTML = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
    svg { font-family: 'Inter', sans-serif; }`;
    svg.insertBefore(style, svg.firstChild);

    const svgData = new XMLSerializer().serializeToString(svg);
    svg.removeChild(style);

    const canvas = document.createElement('canvas');
    const scale = 2; // For higher resolution
    canvas.width = 800 * scale;
    canvas.height = 1200 * scale;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    const img = new Image();
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));

    img.onload = () => {
      ctx.fillStyle = '#0F172A'; // Set a background color for the JPEG
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const jpegUrl = canvas.toDataURL('image/jpeg', 0.95);
      const link = document.createElement('a');
      link.href = jpegUrl;
      link.download = `informe-asesor-${matchInfo.league || 'partido'}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };
     img.onerror = (e) => {
      console.error("Error loading SVG image for download", e);
    };
  };

  const homeEvents = events.filter(e => e.message.includes(`(${teamNames.home})`));
  const awayEvents = events.filter(e => e.message.includes(`(${teamNames.away})`));

  const homeGoals = homeEvents.filter(e => e.category === 'goals');
  const awayGoals = awayEvents.filter(e => e.category === 'goals');
  const homeYellows = homeEvents.filter(e => e.category === 'cards' && e.message.includes('🟨'));
  const homeReds = homeEvents.filter(e => e.category === 'cards' && e.message.includes('🟥'));
  const homeSubs = homeEvents.filter(e => e.category === 'subs');
  const allRedCards = events.filter(e => e.category === 'cards' && e.message.includes('🟥'));
  const notes = events.filter(e => e.category === 'notes');
  
  const parseEvent = (event: MatchEvent) => {
    let message = event.message
      .replace(/(\(|\))|(\s?-\s?.+)/g, '') // remove team name and causal
      .replace(/🟨|🟥|⚽|🔄|📝/g, '')
      .replace('GOL', '')
      .replace('PENAL', '(P)')
      .replace('AUTOGOL', '(AG)')
      .replace('Cambio:', '')
      .trim();
      
      const time = event.time;
      const parts = message.split(' ').filter(p => p.trim() !== '');

      if (event.category === 'subs') {
        const pIn = parts.find(p => p.startsWith('↑'))?.replace('↑','#');
        const pOut = parts.find(p => p.startsWith('↓'))?.replace('↓','#');
        return `Entra ${pIn || '?'} Sale ${pOut || '?'} min ${time}`;
      }
      if (event.category === 'goals' || event.category === 'cards') {
        const player = parts.find(p => p.startsWith('#'));
        const type = parts.filter(p=> !p.startsWith('#')).join(' ');
        return `${player || ''} ${type} min ${time}`;
      }
      return `${message} min ${time}`;
  };

  const renderEventList = (title: string, items: MatchEvent[], x: number, y: number, textColor: string, titleColor: string) => {
    const elements: JSX.Element[] = [];
    if (items.length === 0) return { elements, endY: y };
  
    elements.push(
      <text key={title} x={x} y={y} fontSize="22" fontFamily="Inter, sans-serif" fontWeight="900" fill={titleColor} textAnchor='middle'>
        {title}
      </text>
    );
  
    let currentY = y + 35;
    items.forEach((item, index) => {
      elements.push(
        <text key={index} x={x} y={currentY} fontSize="16" fontFamily="Inter, sans-serif" fill={textColor} textAnchor='middle'>
          {parseEvent(item)}
        </text>
      );
      currentY += 25;
    });
    return { elements, endY: currentY + 20 };
  };
  
  let yHome = 400;
  const homeColumn = [];
  
  const homeGoalsSection = renderEventList('Anotadores', homeGoals, 200, yHome, '#E2E8F0', '#FFFFFF');
  homeColumn.push(...homeGoalsSection.elements);
  yHome = homeGoalsSection.endY;

  const homeYellowsSection = renderEventList('Amonestaciones', homeYellows, 200, yHome, '#E2E8F0', '#FFFFFF');
  homeColumn.push(...homeYellowsSection.elements);
  yHome = homeYellowsSection.endY;

  const homeSubsSection = renderEventList('Sustituciones', homeSubs, 200, yHome, '#E2E8F0', '#FFFFFF');
  homeColumn.push(...homeSubsSection.elements);
  yHome = homeSubsSection.endY;

  let yAway = 400;
  const awayColumn = [];

  const awayGoalsSection = renderEventList('Anotadores', awayGoals, 600, yAway, '#E2E8F0', '#FFFFFF');
  awayColumn.push(...awayGoalsSection.elements);
  yAway = awayGoalsSection.endY;
  
  const awayYellowsSection = renderEventList('Amonestaciones', awayYellows, 600, yAway, '#E2E8F0', '#FFFFFF');
  awayColumn.push(...awayYellowsSection.elements);
  yAway = awayYellowsSection.endY;

  const awaySubsSection = renderEventList('Sustituciones', awaySubs, 600, yAway, '#E2E8F0', '#FFFFFF');
  awayColumn.push(...awaySubsSection.elements);
  yAway = awaySubsSection.endY;


  return (
    <div className="w-full">
      <div className="bg-slate-900 p-2 md:p-4 rounded-lg border border-slate-700 aspect-[2/3] overflow-auto">
        <svg ref={svgRef} viewBox="0 0 800 1200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <defs>
             <linearGradient id="localGradient" x1="0" y1="0.5" x2="1" y2="0.5">
              <stop offset="0%" stopColor="#059669" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="awayGradient" x1="0" y1="0.5" x2="1" y2="0.5">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0" />
              <stop offset="100%" stopColor="#2563EB" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3.5" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Backgrounds */}
          <rect x="0" y="0" width="400" height="1200" fill="#064E3B" />
          <rect x="400" y="0" width="400" height="1200" fill="#1E40AF" />
          
          {localBg && <image href={localBg} data-ai-hint="jaguar pattern" x="-200" y="150" width="800" height="800" opacity="0.05" />}
          {awayBg && <image href={awayBg} data-ai-hint="gopher animal" x="200" y="150" width="800" height="800" opacity="0.05" />}
          
          {/* Main Content */}
          <text x="200" y="100" fontFamily="Inter, sans-serif" fontSize="48" fontWeight="900" fill="white" textAnchor="middle" style={{textTransform: 'uppercase'}}>{teamNames.home}</text>
          <text x="200" y="140" fontFamily="Inter, sans-serif" fontSize="16" fill="rgba(255,255,255,0.7)" textAnchor="middle">{matchInfo.league} - Jornada {matchInfo.round}</text>
          <text x="200" y="280" fontFamily="Inter, sans-serif" fontSize="150" fontWeight="900" fill="white" textAnchor="middle" filter="url(#glow)">{scores.home}</text>
          <text x="280" y="280" fontFamily="Inter, sans-serif" fontSize="18" fontWeight="700" fill="rgba(255,255,255,0.7)" textAnchor="start">Faltas<tspan x="280" dy="22">Cometidas: {fouls.home}</tspan></text>


          <text x="600" y="100" fontFamily="Inter, sans-serif" fontSize="48" fontWeight="900" fill="white" textAnchor="middle" style={{textTransform: 'uppercase'}}>{teamNames.away}</text>
          <text x="600" y="140" fontFamily="Inter, sans-serif" fontSize="16" fill="rgba(255,255,255,0.7)" textAnchor="middle">{matchInfo.league} - Jornada {matchInfo.round}</text>
          <text x="600" y="280" fontFamily="Inter, sans-serif" fontSize="150" fontWeight="900" fill="white" textAnchor="middle" filter="url(#glow)">{scores.away}</text>
          <text x="680" y="280" fontFamily="Inter, sans-serif" fontSize="18" fontWeight="700" fill="rgba(255,255,255,0.7)" textAnchor="start">Faltas<tspan x="680" dy="22">Cometidas: {fouls.away}</tspan></text>

          <text x="400" y="280" fontFamily="Inter, sans-serif" fontSize="40" fontWeight="900" fill="white" textAnchor="middle" opacity="0.8">{scores.home} - {scores.away}</text>

          {/* Event Columns */}
          {homeColumn}
          {awayColumn}
          
          {/* Footer */}
          <rect y="1000" width="800" height="200" fill="rgba(0,0,0,0.2)" />
          <g transform="translate(0, 1050)">
            <text x="400" y="0" textAnchor='middle' fontSize="20" fontWeight="700" fill="#A1A1AA">EXPULSIONES</text>
            {allRedCards.length > 0 ? allRedCards.map((event, index) => (
                <text key={`red-${index}`} x="400" y={30 + index * 25} textAnchor='middle' fontSize="16" fill="#F87171">
                  {parseEvent(event)} ({event.message.includes(teamNames.home) ? teamNames.home.substring(0,3) : teamNames.away.substring(0,3)})
                </text>
              )) : (
                <text x="400" y="30" textAnchor='middle' fontSize="16" fill="#A1A1AA">No hubo</text>
              )
            }
            {notes.length > 0 && (
                <text x="50" y="100" textAnchor='start' fontSize="16" fill="#A1A1AA" fontWeight="700">
                    Anotaciones: {notes.map(n => n.message.replace('📝','')).join(', ')}
                </text>
            )}
          </g>

          <text x="780" y="1180" fontFamily="Inter, sans-serif" fontSize="14" fontWeight="700" fill="rgba(255,255,255,0.5)" textAnchor="end">Asesor: {matchInfo.advisor || 'N/A'}</text>
          <text x="20" y="1180" fontFamily="Inter, sans-serif" fontSize="14" fontWeight="900" fill="hsl(var(--primary))" textAnchor="start" style={{fontStyle: 'italic', textTransform: 'uppercase'}}>Asesor Pro</text>

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
