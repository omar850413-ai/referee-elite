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
      console.error('Error loading SVG image for download', e);
    };
  };

  const homeEvents = events.filter(e => e.message.includes(`(${teamNames.home})`));
  const awayEvents = events.filter(e => e.message.includes(`(${teamNames.away})`));

  const homeGoals = homeEvents.filter(e => e.category === 'goals');
  const awayGoals = awayEvents.filter(e => e.category === 'goals');

  const homeYellows = homeEvents.filter(e => e.category === 'cards' && e.message.includes('🟨'));
  const awayYellows = awayEvents.filter(e => e.category === 'cards' && e.message.includes('🟨'));

  const homeReds = homeEvents.filter(e => e.category === 'cards' && e.message.includes('🟥'));
  const awayReds = awayEvents.filter(e => e.category === 'cards' && e.message.includes('🟥'));

  const homeSubs = homeEvents.filter(e => e.category === 'subs');
  const awaySubs = awayEvents.filter(e => e.category === 'subs');

  const notes = events.filter(e => e.category === 'notes');
  const peggiPlays = events.filter(e => e.category === 'peggi');


  const parseEvent = (event: MatchEvent) => {
    const time = event.time;
    const teamNameRegex = new RegExp(`\\s\\((${teamNames.home}|${teamNames.away})\\)`);
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
    }
    
    return {
        isCard: false,
        text: `${message} min ${time}`,
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

    let currentY = y + 40; // Increased spacing after title
    items.forEach((item, index) => {
      const parsed = parseEvent(item);
      if (parsed.isCard && parsed.causal) {
        // Card with causal
        elements.push(
          <text key={`${index}-target`} x={x} y={currentY} fontSize="16" fontFamily="Inter, sans-serif" fill={textColor} textAnchor="middle">
            {parsed.targetInfo}
          </text>
        );
        currentY += 22; // Space for causal below

        elements.push(
          <foreignObject key={`${index}-causal`} x={x - 175} y={currentY - 15} width="350" height="40">
            <p xmlns="http://www.w3.org/1999/xhtml" style={{
              color: '#A1A1AA', // muted gray
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
        currentY += 28; // Extra space after causal
      } else {
        // Goal, sub, or card without causal
        const textToShow = parsed.isCard ? parsed.targetInfo : parsed.text;
        elements.push(
          <text key={index} x={x} y={currentY} fontSize="16" fontFamily="Inter, sans-serif" fill={textColor} textAnchor="middle">
            {textToShow}
          </text>
        );
        currentY += 28; // Standard spacing
      }
    });
    return { elements, endY: currentY };
  };

  let yHome = 400;
  const homeColumn = [];

  const homeGoalsSection = renderEventList('Anotadores', homeGoals, 200, yHome, '#E2E8F0', '#FFFFFF');
  homeColumn.push(...homeGoalsSection.elements);
  yHome = homeGoalsSection.endY;

  const homeYellowsSection = renderEventList('Amonestaciones', homeYellows, 200, yHome, '#E2E8F0', '#FFFFFF');
  homeColumn.push(...homeYellowsSection.elements);
  yHome = homeYellowsSection.endY;

  const homeRedsSection = renderEventList('Expulsiones', homeReds, 200, yHome, '#E2E8F0', '#FFFFFF');
  homeColumn.push(...homeRedsSection.elements);
  yHome = homeRedsSection.endY;

  const homeSubsSection = renderEventList('Sustituciones', homeSubs, 200, yHome, '#E2E8F0', '#FFFFFF');
  homeColumn.push(...homeSubsSection.elements);
  yHome = homeSubsSection.endY;

  homeColumn.push(
    <text key="home-fouls-title" x={200} y={yHome} fontSize="22" fontFamily="Inter, sans-serif" fontWeight="900" fill="#FFFFFF" textAnchor='middle'>
      Faltas
    </text>,
    <text key="home-fouls-count" x={200} y={yHome + 35} fontSize="16" fontFamily="Inter, sans-serif" fill="#E2E8F0" textAnchor='middle'>
      Total: {fouls.home}
    </text>
  );

  let yAway = 400;
  const awayColumn = [];

  const awayGoalsSection = renderEventList('Anotadores', awayGoals, 600, yAway, '#E2E8F0', '#FFFFFF');
  awayColumn.push(...awayGoalsSection.elements);
  yAway = awayGoalsSection.endY;

  const awayYellowsSection = renderEventList('Amonestaciones', awayYellows, 600, yAway, '#E2E8F0', '#FFFFFF');
  awayColumn.push(...awayYellowsSection.elements);
  yAway = awayYellowsSection.endY;

  const awayRedsSection = renderEventList('Expulsiones', awayReds, 600, yAway, '#E2E8F0', '#FFFFFF');
  awayColumn.push(...awayRedsSection.elements);
  yAway = awayRedsSection.endY;

  const awaySubsSection = renderEventList('Sustituciones', awaySubs, 600, yAway, '#E2E8F0', '#FFFFFF');
  awayColumn.push(...awaySubsSection.elements);
  yAway = awaySubsSection.endY;

  awayColumn.push(
    <text key="away-fouls-title" x={600} y={yAway} fontSize="22" fontFamily="Inter, sans-serif" fontWeight="900" fill="#FFFFFF" textAnchor='middle'>
      Faltas
    </text>,
    <text key="away-fouls-count" x={600} y={yAway + 35} fontSize="16" fontFamily="Inter, sans-serif" fill="#E2E8F0" textAnchor='middle'>
      Total: {fouls.away}
    </text>
  );


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
              <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Backgrounds */}
          <rect x="0" y="0" width="400" height="1200" fill="#064E3B" />
          <rect x="400" y="0" width="400" height="1200" fill="#1E40AF" />

          {localBg && <image href={localBg} data-ai-hint="jaguar pattern" x="-200" y="150" width="800" height="800" opacity="0.05" />}
          {awayBg && <image href={awayBg} data-ai-hint="gopher animal" x="200" y="150" width="800" height="800" opacity="0.05" />}

          {/* Header */}
          <text x="400" y="80" textAnchor="middle" fill="white" fontSize="24" fontWeight="900" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {`${matchInfo.league || 'TORNEO'} - JORNADA ${matchInfo.round || 'N/A'}`}
          </text>
          <text x="400" y="110" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="16">
            Asesor: {matchInfo.advisor || 'No especificado'}
          </text>

          {/* Main Content */}
          <text x="200" y="210" fontFamily="Inter, sans-serif" fontSize="48" fontWeight="900" fill="white" textAnchor="middle" style={{ textTransform: 'uppercase' }}>{teamNames.home}</text>
          <text x="200" y="320" fontFamily="Inter, sans-serif" fontSize="150" fontWeight="900" fill="white" textAnchor="middle" filter="url(#glow)">{scores.home}</text>

          <text x="600" y="210" fontFamily="Inter, sans-serif" fontSize="48" fontWeight="900" fill="white" textAnchor="middle" style={{ textTransform: 'uppercase' }}>{teamNames.away}</text>
          <text x="600" y="320" fontFamily="Inter, sans-serif" fontSize="150" fontWeight="900" fill="white" textAnchor="middle" filter="url(#glow)">{scores.away}</text>

          {/* Event Columns */}
          {homeColumn}
          {awayColumn}

          {/* Footer */}
          <rect y="1000" width="800" height="200" fill="rgba(0,0,0,0.2)" />
          <g transform="translate(0, 1020)">
            {notes.length > 0 && (
              <>
                <text x="400" y="0" textAnchor='middle' fontSize="20" fontWeight="700" fill="#A1A1AA">ANOTACIONES DEL ASESOR</text>
                 <foreignObject x="50" y="25" width="700" height="60">
                  <p xmlns="http://www.w3.org/1999/xhtml" style={{ color: '#E2E8F0', fontSize: '16px', whiteSpace: 'pre-wrap', textAlign: 'center' }}>
                    {notes.map(n => n.message.replace('📝', '').trim()).join('; ')}
                  </p>
                </foreignObject>
              </>
            )}
            {peggiPlays.length > 0 && (
              <>
                <text x="400" y="95" textAnchor='middle' fontSize="20" fontWeight="700" fill="#D8B4FE">JUGADAS PEGGI</text>
                 <foreignObject x="50" y="120" width="700" height="60">
                  <p xmlns="http://www.w3.org/1999/xhtml" style={{ color: '#E9D5FF', fontSize: '16px', whiteSpace: 'pre-wrap', textAlign: 'center' }}>
                    {peggiPlays.map(p => p.message.replace('🔎', '').trim()).join('; ')}
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
