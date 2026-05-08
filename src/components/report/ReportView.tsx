'use client';

import React, { useRef } from 'react';
import { MatchState, MatchEvent } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { DialogClose, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { parseTimeToMinutes } from '@/lib/utils';

interface ReportViewProps {
  matchState: MatchState;
}

export function ReportView({ matchState }: ReportViewProps) {
  const { scores, teamNames, matchInfo, events, fouls, penaltyShootout, reportSettings } = matchState;
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
    
    const svgHeight = parseFloat(svg.getAttribute('height') || '1200');
    const svgData = new XMLSerializer().serializeToString(svg);
    svg.removeChild(style);

    const canvas = document.createElement('canvas');
    const scale = 2;
    canvas.width = 800 * scale;
    canvas.height = svgHeight * scale;
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
  
  const noteEvents = safeEvents.filter(e => e.category === 'notes').sort(sorter);
  const pegiPlays = safeEvents.filter(e => e.category === 'pegi');
  const foulEvents = safeEvents.filter(e => 
    e.category === 'fouls' || 
    (e.category === 'general' && e.message.includes('🚩 Falta'))
  ).sort(sorter);

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
      <text key={`${title}-${x}`} x={x} y={y} fontSize="22" fontFamily="Inter, sans-serif" fontWeight="900" fill={titleColor} textAnchor="middle">
        {title.toUpperCase()}
      </text>
    );
  
    let currentY = y + 10;
    items.forEach((item) => {
      const parsed = parseEventMessage(item);
      const mainText = parsed.isCard ? parsed.targetInfo : parsed.text;
      
      let itemHeight = 20;
  
      elements.push(
        <text key={`${item.id}-main`} x={x} y={currentY + 16} fontSize="16" fontFamily="Inter, sans-serif" fill={textColor} textAnchor="middle">
          {mainText}
        </text>
      );
  
      if (parsed.isCard && parsed.causal) {
        const causalText = parsed.causal;
        const foreignObjectHeight = 40;

        elements.push(
            <foreignObject key={`${item.id}-causal-fo`} x={x - 175} y={currentY + 22} width="350" height={foreignObjectHeight}>
                <p xmlns="http://www.w3.org/1999/xhtml" style={{ color: '#A1A1AA', fontSize: '14px', fontStyle: 'italic', textAlign: 'center', margin: 0, padding: 0, lineHeight: '1.2', wordWrap: 'break-word' }}>
                    {causalText}
                </p>
            </foreignObject>
        );
        itemHeight += foreignObjectHeight - 18; 
      }
        currentY += itemHeight;
    });
  
    return { elements, endY: currentY };
  };

  const renderFoulListElements = (faltas: MatchEvent[], x: number, startY: number, color: string) => {
    if (!reportSettings?.showFouls || faltas.length === 0) return null;

    const chunkSize = 2;
    const lines: string[] = [];
    for (let i = 0; i < faltas.length; i += chunkSize) {
      const chunk = faltas.slice(i, i + chunkSize);
      const line = chunk.map((f, idx) => {
        const globalIdx = i + idx + 1;
        return `${globalIdx} min ${f.time}`;
      }).join(' , ');
      lines.push(line);
    }

    return (
      <g>
        {lines.map((line, index) => (
          <text
            key={index}
            x={x}
            y={startY + 12 + (index * 15)}
            textAnchor="middle"
            fill="#A1A1AA"
            fontSize="11"
            fontFamily="Inter, sans-serif"
            fontWeight="700"
            fontStyle="italic"
            opacity="0.6"
          >
            {line}
          </text>
        ))}
      </g>
    );
  };

  const foulsHome = foulEvents.filter(e => e.side === 'home');
  const foulsAway = foulEvents.filter(e => e.side === 'away');

  const getFoulSpaceHeight = (faltas: MatchEvent[]) => {
    if (!reportSettings?.showFouls || faltas.length === 0) return 0;
    const lines = Math.ceil(faltas.length / 2);
    return lines * 15 + 10; 
  };

  const allRenderedElements: JSX.Element[] = [];
  
  const homeFoulSpace = getFoulSpaceHeight(foulsHome);
  const awayFoulSpace = getFoulSpaceHeight(foulsAway);
  const baseColumnY = 640; 
  const extraBuffer = 15; 

  let homeColumnY = baseColumnY + homeFoulSpace + (homeFoulSpace > 0 ? extraBuffer : 0);
  let awayColumnY = baseColumnY + awayFoulSpace + (awayFoulSpace > 0 ? extraBuffer : 0);
  
  const homeGoalsSection = renderEventSection('GOLES', homeGoals, 200, homeColumnY, '#E2E8F0', '#FFFFFF');
  homeColumnY = homeGoalsSection.endY + (homeGoals.length > 0 ? 30 : 0);
  allRenderedElements.push(...homeGoalsSection.elements);
  
  const homeYellowsSection = renderEventSection('AMONESTACIONES', homeYellowCards, 200, homeColumnY, '#E2E8F0', '#FFFFFF');
  homeColumnY = homeYellowsSection.endY + (homeYellowCards.length > 0 ? 30 : 0);
  allRenderedElements.push(...homeYellowsSection.elements);

  const homeRedsSection = renderEventSection('EXPULSIONES', homeRedCards, 200, homeColumnY, '#E2E8F0', '#FFFFFF');
  homeColumnY = homeRedsSection.endY + (homeRedCards.length > 0 ? 30 : 0);
  allRenderedElements.push(...homeRedsSection.elements);
  
  const homeSubsSection = renderEventSection('SUSTITUCIONES', homeSubs, 200, homeColumnY, '#E2E8F0', '#FFFFFF');
  homeColumnY = homeSubsSection.endY;
  allRenderedElements.push(...homeSubsSection.elements);
  
  const awayGoalsSection = renderEventSection('GOLES', awayGoals, 600, awayColumnY, '#E2E8F0', '#FFFFFF');
  awayColumnY = awayGoalsSection.endY + (awayGoals.length > 0 ? 30 : 0);
  allRenderedElements.push(...awayGoalsSection.elements);

  const awayYellowsSection = renderEventSection('AMONESTACIONES', awayYellowCards, 600, awayColumnY, '#E2E8F0', '#FFFFFF');
  awayColumnY = awayYellowsSection.endY + (awayYellowCards.length > 0 ? 30 : 0);
  allRenderedElements.push(...awayYellowsSection.elements);
  
  const awayRedsSection = renderEventSection('EXPULSIONES', awayRedCards, 600, awayColumnY, '#E2E8F0', '#FFFFFF');
  awayColumnY = awayRedsSection.endY + (awayRedCards.length > 0 ? 30 : 0);
  allRenderedElements.push(...awayRedsSection.elements);

  const awaySubsSection = renderEventSection('SUSTITUCIONES', awaySubs, 600, awayColumnY, '#E2E8F0', '#FFFFFF');
  awayColumnY = awaySubsSection.endY;
  allRenderedElements.push(...awaySubsSection.elements);

  const maxEventsY = Math.max(homeColumnY, awayColumnY);
  let footerCurrentY = Math.max(baseColumnY + 50, maxEventsY);

  const footerElements: JSX.Element[] = [];

  if (noteEvents.length > 0 || pegiPlays.length > 0) {
    footerCurrentY += 30;

    if (noteEvents.length > 0) {
      footerElements.push(<text key="notes-title" x="400" y={footerCurrentY} textAnchor="middle" fontSize="20" fontWeight="700" fill="#A1A1AA">{'Anotaciones del Asesor'.toUpperCase()}</text>);
      footerCurrentY += 30;

      noteEvents.forEach((note, index) => {
        const noteText = `${index + 1}. ${note.message.replace('📝 ', '')}`;
        const timeText = `(min ${note.time})`;

        const approxLines = Math.ceil(noteText.length / 60) || 1;
        const requiredHeight = approxLines * 24 + 10;

        footerElements.push(
          <foreignObject key={`note-fo-${note.id}`} x="50" y={footerCurrentY} width="700" height={requiredHeight}>
            <div xmlns="http://www.w3.org/1999/xhtml" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', color: '#E2E8F0', fontSize: '16px', lineHeight: '1.5', padding: '0 20px' }}>
              <p style={{ margin: 0, padding: 0, textAlign: 'left', flexGrow: 1, paddingRight: '20px', wordBreak: 'break-word' }}>
                {noteText}
              </p>
              <span style={{ margin: 0, padding: 0, whiteSpace: 'nowrap', color: '#A1A1AA', fontStyle: 'italic', fontSize: '14px' }}>
                {timeText}
              </span>
            </div>
          </foreignObject>
        );
        footerCurrentY += requiredHeight;
      });

      footerCurrentY += 15;
    }

    if (pegiPlays.length > 0) {
      footerElements.push(<text key="pegi-title" x="400" y={footerCurrentY} textAnchor='middle' fontSize="20" fontWeight="700" fill="#D8B4FE">{'Jugadas PEGI'.toUpperCase()}</text>);
      footerCurrentY += 25;
      footerElements.push(
          <foreignObject key="pegi-fo" x="50" y={footerCurrentY} width="700" height="60">
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
      );
      footerCurrentY += 60;
    }
  }

  const bottomPadding = 40;
  const svgHeight = Math.max(1200, footerCurrentY + bottomPadding);

  // Colores personalizados
  const homeColor = reportSettings?.homeColor || '#064E3B';
  const awayColor = reportSettings?.awayColor || '#1E40AF';

  return (
    <div className="w-full max-h-[90vh] overflow-y-auto p-4 bg-slate-900 rounded-lg">
       <DialogHeader className="px-2 pb-4 text-left">
            <DialogTitle className="text-white">Informe del Partido</DialogTitle>
            <DialogDescription>
             Vista previa para descargar como imagen. Puedes pellizcar para hacer zoom.
            </DialogDescription>
        </DialogHeader>
      <div className="relative w-full max-w-[800px] mx-auto">
        <DialogClose className="absolute -top-14 right-0 z-10 rounded-full bg-black/30 p-1 text-white/70 backdrop-blur-sm transition-all hover:bg-black/50 hover:text-white">
          <X className="h-5 w-5" />
          <span className="sr-only">Cerrar</span>
        </DialogClose>
        <svg
          ref={svgRef}
          viewBox={`0 0 800 ${svgHeight}`}
          height={svgHeight}
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
            <filter id="text-shadow" x="-0.1" y="-0.1" width="1.2" height="1.2">
              <feDropShadow dx="3" dy="3" stdDeviation="3" floodColor="rgba(0,0,0,0.3)" />
            </filter>
          </defs>

          {/* Backgrounds */}
          <rect x="0" y="0" width="800" height={svgHeight} fill="#0F172A" />
          <rect x="0" y="0" width="400" height={svgHeight} fill={homeColor} />
          <rect x="400" y="0" width="400" height={svgHeight} fill={awayColor} />

          {localBg && <image href={localBg} data-ai-hint="jaguar pattern" x="-200" y="150" width="800" height="800" opacity="0.05" />}
          {awayBg && <image href={awayBg} data-ai-hint="gopher animal" x="200" y="150" width="800" height="800" opacity="0.05" />}

          {/* Header */}
          <text x="400" y="60" textAnchor="middle" fill="white" fontSize="24" fontWeight="900" style={{ letterSpacing: '0.05em' }}>
            {`${matchInfo.league || 'TORNEO'} - JORNADA ${matchInfo.round || 'N/A'}`.toUpperCase()}
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
          <text x="200" y="280" fontFamily="Inter, sans-serif" fontSize="28" fontWeight="900" fill="url(#orangeScoreGradient)" textAnchor="middle" textLength="380" lengthAdjust="spacingAndGlyphs">{teamNames.home.toUpperCase()}</text>
          <text x="200" y="450" fontFamily="Inter, sans-serif" fontSize="120" fontWeight="900" fill="url(#orangeScoreGradient)" textAnchor="middle" filter="url(#text-shadow)">{scores.home}</text>
          <text x="200" y="530" textAnchor="middle" fill="#FDBA74" fontSize="22" fontWeight="900" style={{ letterSpacing: '0.05em' }}>FALTAS</text>
          <text x="200" y="580" textAnchor="middle" fill="white" fontSize="48" fontWeight="900" filter="url(#text-shadow)">{fouls.home}</text>
          {renderFoulListElements(foulsHome, 200, 580, "#FDBA74")}

          <text x="600" y="280" fontFamily="Inter, sans-serif" fontSize="28" fontWeight="900" fill="url(#turquoiseScoreGradient)" textAnchor="middle" textLength="380" lengthAdjust="spacingAndGlyphs">{teamNames.away.toUpperCase()}</text>
          <text x="600" y="450" fontFamily="Inter, sans-serif" fontSize="120" fontWeight="900" fill="url(#turquoiseScoreGradient)" textAnchor="middle" filter="url(#text-shadow)">{scores.away}</text>
          <text x="600" y="530" textAnchor="middle" fill="#22D3EE" fontSize="22" fontWeight="900" style={{ letterSpacing: '0.05em' }}>FALTAS</text>
          <text x="600" y="580" textAnchor="middle" fill="white" fontSize="48" fontWeight="900" filter="url(#text-shadow)">{fouls.away}</text>
          {renderFoulListElements(foulsAway, 600, 580, "#22D3EE")}

          {/* Penalty shootout score */}
          {penaltyShootout && penaltyShootout.active && (
              <text x="400" y="485" textAnchor="middle" fill="white" fontSize="22" fontWeight="700" style={{ letterSpacing: '0.05em' }}>
                  {`Penales (${penaltyShootout.home} - ${penaltyShootout.away})`.toUpperCase()}
              </text>
          )}

          {/* Event Columns */}
          {allRenderedElements}
          
          {(homeGoals.length === 0 && homeYellowCards.length === 0 && homeRedCards.length === 0 && homeSubs.length === 0 &&
            awayGoals.length === 0 && awayYellowCards.length === 0 && awayRedCards.length === 0 && awaySubs.length === 0 &&
            noteEvents.length === 0 && pegiPlays.length === 0) && (
            <text x="400" y="700" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="20" fontStyle="italic">No hay incidentes para mostrar en el informe.</text>
          )}

          {/* Footer Elements (Notes, PEGI) */}
          {footerElements}

          <text x="20" y={svgHeight - 20} fontFamily="Inter, sans-serif" fontSize="14" fontWeight="900" fill="hsl(var(--primary))" style={{ fontStyle: 'italic' }}>{'Asesor Pro'.toUpperCase()}</text>

        </svg>
      </div>
      <div className="sticky bottom-0 -mx-4 -mb-4 mt-4 flex justify-end bg-slate-900/80 p-4 backdrop-blur-sm border-t border-slate-700">
        <Button onClick={handleDownload}>
          <Download className="mr-2 h-4 w-4" />
          Descargar como JPEG
        </Button>
      </div>
    </div>
  );
}
