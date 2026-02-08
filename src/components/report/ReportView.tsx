'use client';

import React, { useRef } from 'react';
import { MatchState, MatchEvent } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { DialogClose, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { parseTimeToMinutes } from '@/lib/utils';

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
    canvas.height = svgHeight * scale; // Use dynamic height
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

  // --- Definitive Event Classification Logic ---
  const safeEvents = events || [];
  const sorter = (a: MatchEvent, b: MatchEvent) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time);

  const homeGoals = safeEvents.filter(e => e.side === 'home' && e.category === 'goals').sort(sorter);
  const homeYellowCards = safeEvents.filter(e => e.side === 'home' && e.category === 'cards' && e.message.includes('🟨')).sort(sorter);
  const homeRedCards = safeEvents.filter(e => e.side === 'home' && e.category === 'cards' && e.message.includes('🟥')).sort(sorter);
  const homeSubs = safeEvents.filter(e => e.side === 'home' && e.category === 'subs').sort(sorter);

  const awayGoals = safeEvents.filter(e => e.side === 'away' && e.category === 'goals').sort(sorter);
  const awayYellowCards = safeEvents.filter(e => e.side === 'away' && e.category === 'cards' && e.message.includes('🟨')).sort(sorter);
  const awayRedCards = safeEvents.filter(e => e.side === 'away' && e.category === 'cards' && e.message.includes('🟥')).sort(sorter);
  const awaySubs = safeEvents.filter(e => e.side === 'away' && e.category === 'subs').sort(sorter);
  
  const noteEvents = safeEvents.filter(e => e.category === 'notes');
  const pegiPlays = safeEvents.filter(e => e.category === 'pegi');

  const parseEventMessage = (event: MatchEvent) => {
    let message = event.message;
    const teamNameRegex = new RegExp(`\\((${teamNames.home}|${teamNames.away})\\)`, 'i');
    message = message.replace(teamNameRegex, '').trim();
    
    if (event.category === 'cards') {
        const symbol = message.includes('🟨') ? '🟨' : '🟥';
        message = message.replace(symbol, '').trim();
        const parts = message.split(' - ');
        const target = parts[0]?.trim() || '';
        const causal = parts.slice(1).join(' - ').trim();
        return { isCard: true, targetInfo: `${symbol} ${target} min ${event.time}`, causal: causal || null };
    }
    
    let icon = '';
    if (event.category === 'subs') {
        icon = '🔄';
        message = message.replace(icon, '').replace('Cambio:', '').trim();
        const parts = message.split(' ');
        const pIn = parts.find(p => p.startsWith('↑'))?.replace('↑', '');
        const pOut = parts.find(p => p.startsWith('↓'))?.replace('↓', '');
        message = `Entra ${pIn || '?'} Sale ${pOut || '?'}`;
    } else if (event.category === 'goals') {
        icon = '⚽';
        message = message.replace(icon, '').replace('GOL', '').replace('PENAL', '(P)').replace('AUTOGOL', '(AG)').trim();
    }
    
    return { isCard: false, text: `${icon} ${message} min ${event.time}`.trim() };
  };

  const renderEventSection = (title: string, items: MatchEvent[], x: number, y: number, textColor: string, titleColor: string) => {
    const elements: JSX.Element[] = [];
    if (!items || items.length === 0) return { elements, endY: y };

    elements.push(
      <text key={`${title}-${x}`} x={x} y={y} fontSize="22" fontFamily="Inter, sans-serif" fontWeight="900" fill={titleColor} textAnchor="middle" style={{ textTransform: 'uppercase' }}>
        {title}
      </text>
    );

    let currentY = y + 40;
    items.forEach((item, index) => {
      const parsed = parseEventMessage(item);
      
      const mainText = parsed.isCard ? parsed.targetInfo : parsed.text;
      elements.push(
          <text key={`${item.id}-main-${index}`} x={x} y={currentY} fontSize="16" fontFamily="Inter, sans-serif" fill={textColor} textAnchor="middle">
            {mainText}
          </text>
      );
      currentY += 18; // Move down for the next line (main text height)

      if (parsed.isCard && parsed.causal) {
        const causalHeight = 60; // Increased height
        elements.push(
          <foreignObject key={`${item.id}-causal-${index}`} x={x - 175} y={currentY} width="350" height={causalHeight}>
            <p xmlns="http://www.w3.org/1999/xhtml" style={{ color: '#A1A1AA', fontSize: '14px', fontStyle: 'italic', whiteSpace: 'normal', textAlign: 'center', lineHeight: 1.2, margin: 0 }}>
              {parsed.causal}
            </p>
          </foreignObject>
        );
        currentY += 40; // Adjusted increment for potentially 3 lines
      }

      if (item.pdfDescription) {
        const descriptionHeight = 55;
        elements.push(
          <foreignObject key={`${item.id}-pdfdesc-${index}`} x={x - 175} y={currentY} width="350" height={descriptionHeight}>
              <p xmlns="http://www.w3.org/1999/xhtml" style={{ color: '#94A3B8', fontSize: '13px', fontStyle: 'italic', whiteSpace: 'normal', textAlign: 'center', lineHeight: 1.3, margin: 0, borderTop: '1px dashed #475569', paddingTop: '6px', marginTop: '6px' }}>
              {item.pdfDescription}
            </p>
          </foreignObject>
        );
        currentY += 40;
      }
      
      currentY += 4;
    });
    
    if (items.length > 0) {
        currentY -= 4;
    }
    return { elements, endY: currentY };
  };

  const allRenderedElements: JSX.Element[] = [];
  let homeColumnY = 640;
  let awayColumnY = 640;
  
  const homeGoalsSection = renderEventSection('GOLES', homeGoals, 200, homeColumnY, '#E2E8F0', '#FFFFFF');
  if(homeGoals.length > 0) homeColumnY = homeGoalsSection.endY + 30;
  allRenderedElements.push(...homeGoalsSection.elements);
  
  const homeYellowsSection = renderEventSection('AMONESTACIONES', homeYellowCards, 200, homeColumnY, '#E2E8F0', '#FFFFFF');
  if(homeYellowCards.length > 0) homeColumnY = homeYellowsSection.endY + 30;
  allRenderedElements.push(...homeYellowsSection.elements);

  const homeRedsSection = renderEventSection('EXPULSIONES', homeRedCards, 200, homeColumnY, '#E2E8F0', '#FFFFFF');
  if(homeRedCards.length > 0) homeColumnY = homeRedsSection.endY + 30;
  allRenderedElements.push(...homeRedsSection.elements);
  
  const homeSubsSection = renderEventSection('SUSTITUCIONES', homeSubs, 200, homeColumnY, '#E2E8F0', '#FFFFFF');
  if(homeSubs.length > 0) homeColumnY = homeSubsSection.endY;
  allRenderedElements.push(...homeSubsSection.elements);
  
  const awayGoalsSection = renderEventSection('GOLES', awayGoals, 600, awayColumnY, '#E2E8F0', '#FFFFFF');
  if(awayGoals.length > 0) awayColumnY = awayGoalsSection.endY + 30;
  allRenderedElements.push(...awayGoalsSection.elements);

  const awayYellowsSection = renderEventSection('AMONESTACIONES', awayYellowCards, 600, awayColumnY, '#E2E8F0', '#FFFFFF');
  if(awayYellowCards.length > 0) awayColumnY = awayYellowsSection.endY + 30;
  allRenderedElements.push(...awayYellowsSection.elements);
  
  const awayRedsSection = renderEventSection('EXPULSIONES', awayRedCards, 600, awayColumnY, '#E2E8F0', '#FFFFFF');
  if(awayRedCards.length > 0) awayColumnY = awayRedsSection.endY + 30;
  allRenderedElements.push(...awayRedsSection.elements);

  const awaySubsSection = renderEventSection('SUSTITUCIONES', awaySubs, 600, awayColumnY, '#E2E8F0', '#FFFFFF');
  if(awaySubs.length > 0) awayColumnY = awaySubsSection.endY;
  allRenderedElements.push(...awaySubsSection.elements);

  const maxEventsY = Math.max(homeColumnY, awayColumnY);
  const footerStartY = maxEventsY < 640 ? 640 : maxEventsY + 40;
  const footerContentHeight = (noteEvents.length > 0 || pegiPlays.length > 0) ? 180 : 40;
  const bottomPadding = 40;
  const calculatedHeight = footerStartY + footerContentHeight + bottomPadding;
  const svgHeight = Math.max(1200, calculatedHeight);

  return (
    <div className="relative bg-slate-900 rounded-lg border border-slate-700 max-h-[85vh] flex flex-col">
      <DialogHeader className="p-4 flex-shrink-0 text-white text-center relative z-10">
        <DialogTitle>Informe del Partido</DialogTitle>
        <DialogDescription className="text-white/70 text-sm">
          Puedes pellizcar la pantalla para hacer zoom en la imagen.
        </DialogDescription>
        <DialogClose className="absolute top-3 right-3 rounded-full bg-black/30 p-1 text-white/70 backdrop-blur-sm transition-all hover:bg-black/50 hover:text-white">
          <X className="h-5 w-5" />
          <span className="sr-only">Cerrar</span>
        </DialogClose>
      </DialogHeader>
    
      <div className="flex-grow overflow-auto p-4 rounded-lg">
        <svg
          ref={svgRef}
          viewBox={`0 0 800 ${svgHeight}`}
          xmlns="http://www.w3.org/2000/svg"
          className="max-w-full h-auto bg-slate-900"
        >
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
          <rect x="0" y="0" width="800" height={svgHeight} fill="#0F172A" />
          <rect x="0" y="0" width="400" height={svgHeight} fill="#064E3B" />
          <rect x="400" y="0" width="400" height={svgHeight} fill="#1E40AF" />

          {localBg && <image href={localBg} data-ai-hint="jaguar pattern" x="-200" y="150" width="800" height="800" opacity="0.05" />}
          {awayBg && <image href={awayBg} data-ai-hint="gopher animal" x="200" y="150" width="800" height="800" opacity="0.05" />}

          {/* Header */}
          <text x="400" y="60" textAnchor="middle" fill="white" fontSize="24" fontWeight="900" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {`${matchInfo.league || 'TORNEO'} - JORNADA ${matchInfo.round || 'N/A'}`}
          </text>
          <text x="400" y="85" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="16">
            {`${matchInfo.place || 'Lugar no especificado'} | ${matchInfo.date || 'Fecha no especificada'}`}
          </text>
          <text x="400" y="110" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="16">
            Asesor: {matchInfo.advisor || 'No especificado'}
          </text>
          
          <rect y="125" x="200" width="400" height="1" fill="rgba(255,255,255,0.2)" />

          <text x="400" y="150" textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="14">
            Árbitro: {matchInfo.referee || 'N/A'}
          </text>
          <text x="250" y="175" textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="14">
            Asistente 1: {matchInfo.assistant1 || 'N/A'}
          </text>
          <text x="550" y="175" textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="14">
            Asistente 2: {matchInfo.assistant2 || 'N/A'}
          </text>
           <text x="400" y="200" textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="14">
            4to Árbitro: {matchInfo.fourthOfficial || 'N/A'}
          </text>
          <text x="250" y="225" textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="14">
            VAR: {matchInfo.var || 'N/A'}
          </text>
          <text x="550" y="225" textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="14">
            AVAR: {matchInfo.avar || 'N/A'}
          </text>

          {/* Main Content */}
          <text x="200" y="280" fontFamily="Inter, sans-serif" fontSize="24" fontWeight="900" fill="url(#orangeScoreGradient)" textAnchor="middle" style={{ textTransform: 'uppercase' }} textLength="380" lengthAdjust="spacingAndGlyphs">{teamNames.home}</text>
          <text x="200" y="450" fontFamily="Inter, sans-serif" fontSize="140" fontWeight="900" fill="url(#orangeScoreGradient)" textAnchor="middle" filter="url(#text-shadow)">{scores.home}</text>
          <text x="200" y="530" textAnchor="middle" fill="#FDBA74" fontSize="22" fontWeight="900" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Faltas</text>
          <text x="200" y="580" textAnchor="middle" fill="white" fontSize="48" fontWeight="900" filter="url(#text-shadow)">{fouls.home}</text>


          <text x="600" y="280" fontFamily="Inter, sans-serif" fontSize="24" fontWeight="900" fill="url(#turquoiseScoreGradient)" textAnchor="middle" style={{ textTransform: 'uppercase' }} textLength="380" lengthAdjust="spacingAndGlyphs">{teamNames.away}</text>
          <text x="600" y="450" fontFamily="Inter, sans-serif" fontSize="140" fontWeight="900" fill="url(#turquoiseScoreGradient)" textAnchor="middle" filter="url(#text-shadow)">{scores.away}</text>
          <text x="600" y="530" textAnchor="middle" fill="#22D3EE" fontSize="22" fontWeight="900" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Faltas</text>
          <text x="600" y="580" textAnchor="middle" fill="white" fontSize="48" fontWeight="900" filter="url(#text-shadow)">{fouls.away}</text>

          {/* Event Columns */}
          {allRenderedElements}
          
          {(homeGoals.length === 0 && homeYellowCards.length === 0 && homeRedCards.length === 0 && homeSubs.length === 0 &&
            awayGoals.length === 0 && awayYellowCards.length === 0 && awayRedCards.length === 0 && awaySubs.length === 0 &&
            noteEvents.length === 0 && pegiPlays.length === 0) && (
            <text x="400" y="650" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="20" fontStyle="italic">No hay incidentes para mostrar en el informe.</text>
          )}

          {/* Footer */}
          <rect y={footerStartY} width="800" height={footerContentHeight} fill="rgba(0,0,0,0.2)" />
          <g transform={`translate(0, ${footerStartY + 20})`}>
            {(noteEvents.length > 0 || pegiPlays.length > 0) && (
                 <text x="400" y="0" textAnchor='middle' fontSize="20" fontWeight="700" fill="#A1A1AA" style={{textTransform: 'uppercase'}}>Anotaciones del Asesor</text>
            )}
            {noteEvents.length > 0 && (
                 <foreignObject x="50" y="25" width="700" height="60">
                  <p xmlns="http://www.w3.org/1999/xhtml" style={{ color: '#E2E8F0', fontSize: '16px', whiteSpace: 'pre-wrap', textAlign: 'center' }}>
                    {noteEvents.map(e => e.message.replace('📝 ', '')).join('; ')}
                  </p>
                </foreignObject>
            )}
            {pegiPlays.length > 0 && (
              <>
                <text x="400" y={noteEvents.length > 0 ? "95" : "25"} textAnchor='middle' fontSize="20" fontWeight="700" fill="#D8B4FE" style={{textTransform: 'uppercase'}}>Jugadas PEGI</text>
                 <foreignObject x="50" y={noteEvents.length > 0 ? "120" : "50"} width="700" height="60">
                  <p xmlns="http://www.w3.org/1999/xhtml" style={{ color: '#E9D5FF', fontSize: '16px', whiteSpace: 'pre-wrap', textAlign: 'center' }}>
                    {pegiPlays.map(p => {
                      const msg = p.message;
                      if (msg.endsWith('No')) {
                          return 'Jugadas pegi no';
                      }
                      const yesPrefix = '🔎 JUGADAS PEGI: Sí - ';
                      if (msg.startsWith(yesPrefix)) {
                          return msg.substring(yesPrefix.length);
                      }
                      return msg.replace(/🔎|JUGADAS PEGI: /g, '').trim();
                    }).join('; ')}
                  </p>
                </foreignObject>
              </>
            )}
          </g>

          <text x="20" y={svgHeight - 20} fontFamily="Inter, sans-serif" fontSize="14" fontWeight="900" fill="hsl(var(--primary))" style={{ fontStyle: 'italic', textTransform: 'uppercase' }}>Asesor Pro</text>

        </svg>
      </div>

      <div className="flex-shrink-0 p-4 border-t border-slate-700">
        <Button onClick={handleDownload} className="w-full">
          <Download className="mr-2 h-4 w-4" />
          Descargar como JPEG
        </Button>
      </div>
    </div>
  );
}
