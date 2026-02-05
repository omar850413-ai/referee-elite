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
    style.innerHTML = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
    svg { font-family: 'Inter', sans-serif; }`;
    svg.insertBefore(style, svg.firstChild);

    const svgData = new XMLSerializer().serializeToString(svg);
    svg.removeChild(style);

    const canvas = document.createElement('canvas');
    const scale = 2;
    canvas.width = 800 * scale;
    canvas.height = 1200 * scale;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    const img = new Image();
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));

    img.onload = () => {
      ctx.fillStyle = '#0F172A';
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
      console.error('Error loading SVG image for download', e);
    };
  };

  const homeEvents: MatchEvent[] = [];
  const awayEvents: MatchEvent[] = [];
  const noteEvents: MatchEvent[] = [];
  const pegiPlays: MatchEvent[] = [];

  events.forEach(e => {
    if (e.side === 'home') {
      homeEvents.push(e);
    } else if (e.side === 'away') {
      awayEvents.push(e);
    } else if (e.category === 'notes') {
      noteEvents.push(e);
    } else if (e.category === 'pegi') {
      pegiPlays.push(e);
    }
  });

  const homeGoals = homeEvents.filter(e => e.category === 'goals');
  const awayGoals = awayEvents.filter(e => e.category === 'goals');

  const homeYellows = homeEvents.filter(e => e.category === 'cards' && e.message.includes('🟨'));
  const awayYellows = awayEvents.filter(e => e.category === 'cards' && e.message.includes('🟨'));

  const homeReds = homeEvents.filter(e => e.category === 'cards' && e.message.includes('🟥'));
  const awayReds = awayEvents.filter(e => e.category === 'cards' && e.message.includes('🟥'));

  const homeSubs = homeEvents.filter(e => e.category === 'subs');
  const awaySubs = awayEvents.filter(e => e.category === 'subs');


  const parseEvent = (event: MatchEvent) => {
    const time = event.time;
    // Use a case-insensitive regex to find and remove team name
    const teamNameRegex = new RegExp(`\\((${teamNames.home}|${teamNames.away})\\)`, 'i');
    let message = event.message.replace(teamNameRegex, '').trim();

    if (event.category === 'cards') {
        const symbol = message.includes('🟨') ? '🟨' : '🟥';
        message = message.replace(symbol, '').trim();
        const parts = message.split(' - ');
        const target = parts[0]?.trim() || '';
        const causal = parts.slice(1).join(' - ').trim();

        return {
            isCard: true,
            targetInfo: `${target} min ${time}`,
            causal: causal || null,
        };
    }
    
    // Clean up various symbols
    message = message
      .replace(/⚽|🔄|📝|🔎/g, '')
      .trim();
      
    if (event.category === 'subs') {
        message = message.replace('Cambio:', '').trim();
        const parts = message.split(' ');
        const pIn = parts.find(p => p.startsWith('↑'))?.replace('↑', '#');
        const pOut = parts.find(p => p.startsWith('↓'))?.replace('↓', '#');
        message = `Entra ${pIn || '?'} Sale ${pOut || '?'}`;
    } else if (event.category === 'goals') {
        message = message.replace('GOL', '').replace('PENAL', '(P)').replace('AUTOGOL', '(AG)').trim();
    } else if (event.category === 'pegi') {
        message = message.replace('JUGADAS PEGI:', '').trim();
    }
    
    return {
        isCard: false,
        text: `${message} ${event.category !== 'notes' ? `min ${time}` : ''}`.trim(),
    };
  };

  const renderEventList = (title: string, items: MatchEvent[], x: number, y: number, textColor: string, titleColor: string) => {
    const elements: JSX.Element[] = [];
    if (items.length === 0) return { elements, endY: y };

    elements.push(
      <text key={title} x={x} y={y} fontSize="22" fontFamily="Inter, sans-serif" fontWeight="900" fill={titleColor} textAnchor="middle">
        {title}
      </text>
    );

    let currentY = y + 40;
    items.forEach((item, index) => {
      const parsed = parseEvent(item);
      if (parsed.isCard && parsed.causal) {
        elements.push(
          <text key={`${index}-target`} x={x} y={currentY} fontSize="16" fontFamily="Inter, sans-serif" fill={textColor} textAnchor="middle">
            {parsed.targetInfo}
          </text>
        );
        currentY += 22;

        elements.push(
          <foreignObject key={`${index}-causal`} x={x - 175} y={currentY - 15} width="350" height="40">
            <p xmlns="http://www.w3.org/1999/xhtml" style={{
              color: '#A1A1AA',
              fontSize: '14px',
              fontStyle: 'italic',
              whiteSpace: 'normal',
              textAlign: 'center',
              lineHeight: 1.2,
              margin: 0,
            }}>
              {parsed.causal}
            </p>
          </foreignObject>
        );
        currentY += 32;
      } else {
        const textToShow = parsed.isCard ? parsed.targetInfo : parsed.text;
        elements.push(
          <text key={index} x={x} y={currentY} fontSize="16" fontFamily="Inter, sans-serif" fill={textColor} textAnchor="middle">
            {textToShow}
          </text>
        );
        currentY += 30;
      }
    });
    return { elements, endY: currentY };
  };

  const homeColumn = [];
  let yHome = 550;

  const homeGoalsSection = renderEventList('Anotadores', homeGoals, 200, yHome, '#E2E8F0', '#FFFFFF');
  if (homeGoals.length > 0) {
    homeColumn.push(...homeGoalsSection.elements);
    yHome = homeGoalsSection.endY + 40;
  }

  const homeYellowsSection = renderEventList('Amonestaciones', homeYellows, 200, yHome, '#E2E8F0', '#FFFFFF');
  if (homeYellows.length > 0) {
    homeColumn.push(...homeYellowsSection.elements);
    yHome = homeYellowsSection.endY + 40;
  }

  const homeRedsSection = renderEventList('Expulsiones', homeReds, 200, yHome, '#E2E8F0', '#FFFFFF');
   if (homeReds.length > 0) {
    homeColumn.push(...homeRedsSection.elements);
    yHome = homeRedsSection.endY + 40;
  }

  const homeSubsSection = renderEventList('Sustituciones', homeSubs, 200, yHome, '#E2E8F0', '#FFFFFF');
   if (homeSubs.length > 0) {
    homeColumn.push(...homeSubsSection.elements);
    yHome = homeSubsSection.endY + 40;
  }
  
  const awayColumn = [];
  let yAway = 550;

  const awayGoalsSection = renderEventList('Anotadores', awayGoals, 600, yAway, '#E2E8F0', '#FFFFFF');
  if (awayGoals.length > 0) {
    awayColumn.push(...awayGoalsSection.elements);
    yAway = awayGoalsSection.endY + 40;
  }
  
  const awayYellowsSection = renderEventList('Amonestaciones', awayYellows, 600, yAway, '#E2E8F0', '#FFFFFF');
  if (awayYellows.length > 0) {
    awayColumn.push(...awayYellowsSection.elements);
    yAway = awayYellowsSection.endY + 40;
  }

  const awayRedsSection = renderEventList('Expulsiones', awayReds, 600, yAway, '#E2E8F0', '#FFFFFF');
  if (awayReds.length > 0) {
    awayColumn.push(...awayRedsSection.elements);
    yAway = awayRedsSection.endY + 40;
  }
  
  const awaySubsSection = renderEventList('Sustituciones', awaySubs, 600, yAway, '#E2E8F0', '#FFFFFF');
  if (awaySubs.length > 0) {
    awayColumn.push(...awaySubsSection.elements);
    yAway = awaySubsSection.endY + 40;
  }


  return (
    <div className="w-full">
      <div className="bg-slate-900 p-2 md:p-4 rounded-lg border border-slate-700 aspect-[2/3] overflow-auto">
        <svg ref={svgRef} viewBox="0 0 800 1200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <defs>
            <linearGradient id="orangeScoreGradient" x1="0.5" y1="0" x2="0.5" y2="1">
              <stop offset="0%" stopColor="#FDBA74" />
              <stop offset="100%" stopColor="#FB923C" />
            </linearGradient>
            <linearGradient id="turquoiseScoreGradient" x1="0.5" y1="0" x2="0.5" y2="1">
              <stop offset="0%" stopColor="#22D3EE" />
              <stop offset="100%" stopColor="#06B6D4" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="text-shadow" x="-0.1" y="-0.1" width="1.2" height="1.2">
              <feDropShadow dx="3" dy="3" stdDeviation="3" floodColor="rgba(0,0,0,0.3)" />
            </filter>
          </defs>

          {/* Backgrounds */}
          <rect x="0" y="0" width="400" height="1200" fill="#064E3B" />
          <rect x="400" y="0" width="400" height="1200" fill="#1E40AF" />

          {localBg && <image href={localBg} data-ai-hint="jaguar pattern" x="-200" y="150" width="800" height="800" opacity="0.05" />}
          {awayBg && <image href={awayBg} data-ai-hint="gopher animal" x="200" y="150" width="800" height="800" opacity="0.05" />}

          {/* Header */}
          <text x="400" y="60" textAnchor="middle" fill="white" fontSize="24" fontWeight="900" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {`${matchInfo.league || 'TORNEO'} - JORNADA ${matchInfo.round || 'N/A'}`}
          </text>
          <text x="400" y="90" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="16">
            {`${matchInfo.place || 'Lugar no especificado'} | ${matchInfo.date || 'Fecha no especificada'}`}
          </text>
           <text x="400" y="120" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="16">
            Asesor: {matchInfo.advisor || 'No especificado'}
          </text>

          {/* Main Content */}
          <text x="200" y="190" fontFamily="Inter, sans-serif" fontSize="56" fontWeight="900" fill="url(#orangeScoreGradient)" textAnchor="middle" style={{ textTransform: 'uppercase' }}>{teamNames.home}</text>
          <text x="200" y="380" fontFamily="Inter, sans-serif" fontSize="240" fontWeight="900" fill="url(#orangeScoreGradient)" textAnchor="middle" filter="url(#text-shadow)">{scores.home}</text>
          <text x="200" y="440" textAnchor="middle" fill="#FDBA74" fontSize="22" fontWeight="900" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Faltas</text>
          <text x="200" y="480" textAnchor="middle" fill="white" fontSize="48" fontWeight="900" filter="url(#text-shadow)">{fouls.home}</text>


          <text x="600" y="190" fontFamily="Inter, sans-serif" fontSize="56" fontWeight="900" fill="url(#turquoiseScoreGradient)" textAnchor="middle" style={{ textTransform: 'uppercase' }}>{teamNames.away}</text>
          <text x="600" y="380" fontFamily="Inter, sans-serif" fontSize="240" fontWeight="900" fill="url(#turquoiseScoreGradient)" textAnchor="middle" filter="url(#text-shadow)">{scores.away}</text>
          <text x="600" y="440" textAnchor="middle" fill="#22D3EE" fontSize="22" fontWeight="900" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Faltas</text>
          <text x="600" y="480" textAnchor="middle" fill="white" fontSize="48" fontWeight="900" filter="url(#text-shadow)">{fouls.away}</text>

          {/* Event Columns */}
          {homeColumn}
          {awayColumn}

          {/* Footer */}
          <rect y="1020" width="800" height="180" fill="rgba(0,0,0,0.2)" />
          <g transform="translate(0, 1040)">
            {(noteEvents.length > 0 || pegiPlays.length > 0) && (
                 <text x="400" y="0" textAnchor='middle' fontSize="20" fontWeight="700" fill="#A1A1AA" style={{textTransform: 'uppercase'}}>Anotaciones del Asesor</text>
            )}
            {noteEvents.length > 0 && (
                 <foreignObject x="50" y="25" width="700" height="60">
                  <p xmlns="http://www.w3.org/1999/xhtml" style={{ color: '#E2E8F0', fontSize: '16px', whiteSpace: 'pre-wrap', textAlign: 'center' }}>
                    {noteEvents.map(e => parseEvent(e).text).join('; ')}
                  </p>
                </foreignObject>
            )}
            {pegiPlays.length > 0 && (
              <>
                <text x="400" y={noteEvents.length > 0 ? "95" : "25"} textAnchor='middle' fontSize="20" fontWeight="700" fill="#D8B4FE" style={{textTransform: 'uppercase'}}>Jugadas PEGI</text>
                 <foreignObject x="50" y={noteEvents.length > 0 ? "120" : "50"} width="700" height="60">
                  <p xmlns="http://www.w3.org/1999/xhtml" style={{ color: '#E9D5FF', fontSize: '16px', whiteSpace: 'pre-wrap', textAlign: 'center' }}>
                    {pegiPlays.map(p => p.message.replace(/🔎|JUGADAS PEGI: /g, '').trim()).join('; ')}
                  </p>
                </foreignObject>
              </>
            )}
          </g>

          <text x="20" y="1180" fontFamily="Inter, sans-serif" fontSize="14" fontWeight="900" fill="hsl(var(--primary))" textAnchor="start" style={{ fontStyle: 'italic', textTransform: 'uppercase' }}>Asesor Pro</text>

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
