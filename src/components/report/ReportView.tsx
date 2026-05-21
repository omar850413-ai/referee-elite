'use client';

import React, { useRef, useState, useEffect } from 'react';
import { MatchState, Player, StaffMember } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import { DialogClose } from '@/components/ui/dialog';
import { numberToSpanishWords, parseTimeToMinutes } from '@/lib/utils';

interface ReportViewProps {
  matchState: MatchState;
}

export function ReportView({ matchState }: ReportViewProps) {
  const { scores, teamNames, matchInfo, events, lineups = { home: [], away: [] }, staff = { home: [], away: [] }, signatures = {} } = matchState;
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [initialDistance, setInitialDistance] = useState<number | null>(null);
  const [lastTouch, setLastTouch] = useState<{ x: number, y: number } | null>(null);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const targetWidth = 800;
        const newScale = Math.min(1, (containerWidth - 32) / targetWidth);
        setScale(newScale);
        setOffset({ x: 0, y: 0 });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setLastTouch({ x: e.touches[0].pageX, y: e.touches[0].pageY });
      setInitialDistance(null);
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      );
      setInitialDistance(dist);
      setLastTouch(null);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && lastTouch) {
      const deltaX = e.touches[0].pageX - lastTouch.x;
      const deltaY = e.touches[0].pageY - lastTouch.y;
      setOffset(prev => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
      setLastTouch({ x: e.touches[0].pageX, y: e.touches[0].pageY });
    } else if (e.touches.length === 2 && initialDistance) {
      const dist = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      );
      const factor = dist / initialDistance;
      setScale(prev => Math.max(0.2, Math.min(4, prev * factor)));
      setInitialDistance(dist);
    }
  };

  const handleTouchEnd = () => {
    setLastTouch(null);
    setInitialDistance(null);
  };

  const handleDownload = () => {
    if (!svgRef.current) return;
    const svg = svgRef.current;
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgWidth = 800;
    const svgHeight = parseFloat(svg.getAttribute('height') || '2000');

    const canvas = document.createElement('canvas');
    const exportScale = 2;
    canvas.width = svgWidth * exportScale;
    canvas.height = svgHeight * exportScale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    img.onload = () => {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const jpegUrl = canvas.toDataURL('image/jpeg', 0.95);
      const link = document.createElement('a');
      link.href = jpegUrl;
      const fileName = `${teamNames.home || 'LOCAL'}-VS-${teamNames.away || 'VISITA'}.jpg`.toUpperCase();
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };
  };

  const safeEvents = events || [];
  const cardEventsSorted = [...safeEvents]
    .filter(e => e.category === 'cards')
    .sort((a, b) => {
      const numA = parseInt(a.playerNumber || '999');
      const numB = parseInt(b.playerNumber || '999');
      if (numA !== numB) return numA - numB;
      return parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time);
    });

  const getSanciones = (side: 'home' | 'away') => {
    const sideCards = cardEventsSorted.filter(e => e.side === side);
    const yellows = sideCards.filter(e => e.message.includes('🟨'));
    const reds = sideCards.filter(e => e.message.includes('🟥'));
    return { yellows, reds };
  };

  const homeSanciones = getSanciones('home');
  const awaySanciones = getSanciones('away');
  const incidentsText = safeEvents.find(e => e.category === 'notes')?.message.replace('📝 ', '') || 'SIN INCIDENTES REPORTADOS.';

  const getEventsSummary = (side: 'home' | 'away', number: string, p?: Player) => {
    const playerEvs = safeEvents.filter(e => e.side === side && e.playerNumber === number);
    let summary = '';
    playerEvs.forEach(e => {
      if (e.category === 'goals') {
        const icon = e.message.includes('AUTOGOL') ? '🥅' : '⚽';
        summary += ` ${icon}${e.time !== '--' && e.time !== '' ? ` (${e.time})` : ''}`;
      }
      if (e.category === 'cards') {
        const icon = e.message.includes('🟨') ? '🟨' : '🟥';
        summary += ` ${icon}${e.time !== '--' && e.time !== '' ? ` (${e.time})` : ''}`;
      }
      if (e.category === 'substitution' && p?.replacedNumber) {
        summary += ` (POR: #${p.replacedNumber}${e.time !== '--' && e.time !== '' ? ` ${e.time}` : ''})`;
      }
    });
    return summary;
  };

  const getStaffEventsSummary = (side: 'home' | 'away', name: string) => {
    const staffEvs = safeEvents.filter(e => e.side === side && e.playerName === name);
    let summary = '';
    staffEvs.forEach(e => {
      if (e.category === 'cards') {
        const icon = e.message.includes('🟨') ? '🟨' : '🟥';
        summary += ` ${icon}${e.time !== '--' && e.time !== '' ? ` (${e.time})` : ''}`;
      }
    });
    return summary;
  };

  // --- DINAMIC HEIGHT CALCULATIONS ---
  const ROW_HEIGHT = 16;
  
  // Header height
  const headerHeight = 280;

  // Lineup Section Height
  const lineupRowsHome = Math.max(1, lineups.home.length) + (staff.home.length || 1);
  const lineupRowsAway = Math.max(1, lineups.away.length) + (staff.away.length || 1);
  const maxLineupRows = Math.max(lineupRowsHome, lineupRowsAway) + 12; // starters + subs + staff + headers
  const lineupSectionHeight = maxLineupRows * ROW_HEIGHT + 40;

  // Sanctions Section Height
  const sanctionsRowsHome = (homeSanciones.yellows.length + homeSanciones.reds.length);
  const sanctionsRowsAway = (awaySanciones.yellows.length + awaySanciones.reds.length);
  const maxSanctionsRows = Math.max(sanctionsRowsHome, sanctionsRowsAway) + 8;
  const sanctionsSectionHeight = maxSanctionsRows * ROW_HEIGHT + 40;

  // Incidents Section Height
  const charsPerLine = 85;
  const incidentsLines = Math.max(6, Math.ceil(incidentsText.length / charsPerLine));
  const incidentsBoxHeight = incidentsLines * 16 + 20;
  const incidentsSectionHeight = incidentsBoxHeight + 60;

  // Signatures Section Height
  const signaturesHeight = 160;
  const footerHeight = 40;

  // Final positions
  const lineupY = headerHeight + 20;
  const sanctionsY = lineupY + lineupSectionHeight + 40;
  const incidentsY = sanctionsY + sanctionsSectionHeight + 40;
  const signaturesY = incidentsY + incidentsSectionHeight + 40;
  const totalHeight = signaturesY + signaturesHeight + footerHeight;

  return (
    <div className="w-full h-full flex flex-col bg-slate-900 overflow-hidden" ref={containerRef}>
      <div className="p-4 flex justify-between items-center bg-slate-800 border-b border-white/10 shrink-0 z-10">
        <div>
          <h2 className="text-white font-black italic uppercase text-xs md:text-sm">Cédula Digital Profesional</h2>
          <p className="text-slate-400 text-[9px] uppercase font-bold">Pellizca para zoom, desliza para mover.</p>
        </div>
        <DialogClose className="text-white hover:bg-white/10 p-2 rounded-full">
          <X size={20} />
        </DialogClose>
      </div>
      
      <div 
        className="flex-1 overflow-hidden touch-none p-4 flex justify-center bg-slate-900 items-start"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div 
          style={{ 
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, 
            transformOrigin: 'center top',
            transition: initialDistance || lastTouch ? 'none' : 'transform 0.1s ease-out'
          }}
          className="relative shadow-2xl bg-white shrink-0"
        >
          <svg
            ref={svgRef}
            viewBox={`0 0 800 ${totalHeight}`}
            width="800"
            height={totalHeight}
            xmlns="http://www.w3.org/2000/svg"
            className="block"
          >
            <rect x="0" y="0" width="800" height={totalHeight} fill="#FFFFFF" />

            {/* HEADER */}
            <g transform="translate(400, 60)">
              <text textAnchor="middle" fill="#000000" fontSize="28" fontWeight="900" className="uppercase" style={{ letterSpacing: '0.1em' }}>INFORME ARBITRAL</text>
              <text y="35" textAnchor="middle" fill="#000000" fontSize="12" fontWeight="800" className="uppercase">{matchInfo.league || 'LIGA'} | JORNADA {matchInfo.round || 'S/N'}</text>
              <rect x="-360" y="50" width="720" height="2" fill="#000000" />
            </g>

            <g transform="translate(40, 135)">
              <text fontSize="10" fontWeight="700" fill="#000000">ÁRBITRO CENTRAL: <tspan fontWeight="900" className="uppercase">{matchInfo.referee}</tspan></text>
              <text y="18" fontSize="10" fontWeight="700" fill="#000000">ASISTENTE 1: <tspan fontWeight="900" className="uppercase">{matchInfo.assistant1}</tspan></text>
              <text y="36" fontSize="10" fontWeight="700" fill="#000000">ASISTENTE 2: <tspan fontWeight="900" className="uppercase">{matchInfo.assistant2}</tspan></text>
              <text x="500" y="0" fontSize="10" fontWeight="700" fill="#000000">LUGAR: <tspan fontWeight="900" className="uppercase">{matchInfo.place}</tspan></text>
              <text x="500" y="18" fontSize="10" fontWeight="700" fill="#000000">FECHA: <tspan fontWeight="900" className="uppercase">{matchInfo.date}</tspan></text>
            </g>

            <rect x="40" y="195" width="720" height="70" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1" />
            <g transform="translate(200, 230)">
              <text textAnchor="middle" fill="#000000" fontSize="16" fontWeight="900" className="uppercase">{teamNames.home}</text>
              <text y="18" textAnchor="middle" fill="#000000" fontSize="12" fontWeight="800">{scores.home} ({numberToSpanishWords(scores.home)})</text>
            </g>
            <text x="400" y="235" textAnchor="middle" fill="#CBD5E1" fontSize="28" fontWeight="900">VS</text>
            <g transform="translate(600, 230)">
              <text textAnchor="middle" fill="#000000" fontSize="16" fontWeight="900" className="uppercase">{teamNames.away}</text>
              <text y="18" textAnchor="middle" fill="#000000" fontSize="12" fontWeight="800">{scores.away} ({numberToSpanishWords(scores.away)})</text>
            </g>

            {/* ALINEACIONES */}
            <g transform={`translate(40, ${lineupY})`}>
              <g>
                <text fontSize="12" fontWeight="900" fill="#000000" className="uppercase" textDecoration="underline">ALINEACIÓN LOCAL</text>
                <g transform="translate(0, 25)">
                  <text fontSize="8" fontWeight="800" fill="#94A3B8" className="uppercase">TITULARES</text>
                  {lineups.home.slice(0, 11).map((p, i) => (
                    <text key={p.id} y={(i + 1) * ROW_HEIGHT} fontSize="9.5" fontWeight="700" fill="#000000" className="uppercase">
                      {`${p.number}.- ${p.name}${getEventsSummary('home', p.number, p)}`}
                    </text>
                  ))}
                  <g transform={`translate(0, ${12 * ROW_HEIGHT + 10})`}>
                    <text fontSize="8" fontWeight="800" fill="#94A3B8" className="uppercase">SUPLENTES / CAMBIOS</text>
                    {lineups.home.slice(11).map((p, i) => (
                      <text key={p.id} y={(i + 1) * ROW_HEIGHT} fontSize="9.5" fontWeight="700" fill="#000000" className="uppercase">
                        {`${p.number}.- ${p.name}${getEventsSummary('home', p.number, p)}`}
                      </text>
                    ))}
                  </g>
                  <g transform={`translate(0, ${(12 + Math.max(1, lineups.home.length - 11)) * ROW_HEIGHT + 25})`}>
                    <text fontSize="8" fontWeight="800" fill="#94A3B8" className="uppercase">CUERPO TÉCNICO</text>
                    {staff.home.map((s, i) => (
                      <text key={s.id} y={(i + 1) * ROW_HEIGHT} fontSize="9.5" fontWeight="700" fill="#000000" className="uppercase">
                        {`${s.role}: ${s.name}${getStaffEventsSummary('home', s.name)}`}
                      </text>
                    ))}
                  </g>
                </g>
              </g>

              <g transform="translate(400, 0)">
                <text fontSize="12" fontWeight="900" fill="#000000" className="uppercase" textDecoration="underline">ALINEACIÓN VISITANTE</text>
                <g transform="translate(0, 25)">
                  <text fontSize="8" fontWeight="800" fill="#94A3B8" className="uppercase">TITULARES</text>
                  {lineups.away.slice(0, 11).map((p, i) => (
                    <text key={p.id} y={(i + 1) * ROW_HEIGHT} fontSize="9.5" fontWeight="700" fill="#000000" className="uppercase">
                      {`${p.number}.- ${p.name}${getEventsSummary('away', p.number, p)}`}
                    </text>
                  ))}
                  <g transform={`translate(0, ${12 * ROW_HEIGHT + 10})`}>
                    <text fontSize="8" fontWeight="800" fill="#94A3B8" className="uppercase">SUPLENTES / CAMBIOS</text>
                    {lineups.away.slice(11).map((p, i) => (
                      <text key={p.id} y={(i + 1) * ROW_HEIGHT} fontSize="9.5" fontWeight="700" fill="#000000" className="uppercase">
                        {`${p.number}.- ${p.name}${getEventsSummary('away', p.number, p)}`}
                      </text>
                    ))}
                  </g>
                  <g transform={`translate(0, ${(12 + Math.max(1, lineups.away.length - 11)) * ROW_HEIGHT + 25})`}>
                    <text fontSize="8" fontWeight="800" fill="#94A3B8" className="uppercase">CUERPO TÉCNICO</text>
                    {staff.away.map((s, i) => (
                      <text key={s.id} y={(i + 1) * ROW_HEIGHT} fontSize="9.5" fontWeight="700" fill="#000000" className="uppercase">
                        {`${s.role}: ${s.name}${getStaffEventsSummary('away', s.name)}`}
                      </text>
                    ))}
                  </g>
                </g>
              </g>
            </g>

            {/* SANCIONES */}
            <g transform={`translate(40, ${sanctionsY})`}>
              <text fontSize="12" fontWeight="900" fill="#000000" className="uppercase" textDecoration="underline">DETALLE DE SANCIONES</text>
              
              <g transform="translate(0, 30)">
                <g>
                  <text fontSize="10" fontWeight="900" fill="#000000" className="uppercase" textDecoration="underline">CLUB LOCAL: {teamNames.home}</text>
                  <g transform="translate(0, 15)">
                    <text fontSize="8" fontWeight="800" fill="#94A3B8" className="uppercase italic">AMONESTACIONES</text>
                    {homeSanciones.yellows.map((e, i) => (
                      <text key={e.id} y={(i + 1) * 16} fontSize="9" fontWeight="700" fill="#000000" className="uppercase">
                        {`#${e.playerNumber} ${e.playerName} 🟨 ${e.message.split(' - ').pop()} ${e.time !== '--' && e.time !== '' ? `(${e.time})` : ''}`}
                      </text>
                    ))}
                    <g transform={`translate(0, ${(homeSanciones.yellows.length + 1) * 16 + 8})`}>
                      <text fontSize="8" fontWeight="800" fill="#94A3B8" className="uppercase italic">EXPULSIONES</text>
                      {homeSanciones.reds.map((e, i) => (
                        <text key={e.id} y={(i + 1) * 16} fontSize="9" fontWeight="700" fill="#000000" className="uppercase">
                          {`#${e.playerNumber} ${e.playerName} 🟥 ${e.message.split(' - ').pop()} ${e.time !== '--' && e.time !== '' ? `(${e.time})` : ''}`}
                        </text>
                      ))}
                    </g>
                  </g>
                </g>

                <g transform="translate(400, 0)">
                  <text fontSize="10" fontWeight="900" fill="#000000" className="uppercase" textDecoration="underline">CLUB VISITANTE: {teamNames.away}</text>
                  <g transform="translate(0, 15)">
                    <text fontSize="8" fontWeight="800" fill="#94A3B8" className="uppercase italic">AMONESTACIONES</text>
                    {awaySanciones.yellows.map((e, i) => (
                      <text key={e.id} y={(i + 1) * 16} fontSize="9" fontWeight="700" fill="#000000" className="uppercase">
                        {`#${e.playerNumber} ${e.playerName} 🟨 ${e.message.split(' - ').pop()} ${e.time !== '--' && e.time !== '' ? `(${e.time})` : ''}`}
                      </text>
                    ))}
                    <g transform={`translate(0, ${(awaySanciones.yellows.length + 1) * 16 + 8})`}>
                      <text fontSize="8" fontWeight="800" fill="#94A3B8" className="uppercase italic">EXPULSIONES</text>
                      {awaySanciones.reds.map((e, i) => (
                        <text key={e.id} y={(i + 1) * 16} fontSize="9" fontWeight="700" fill="#000000" className="uppercase">
                          {`#${e.playerNumber} ${e.playerName} 🟥 ${e.message.split(' - ').pop()} ${e.time !== '--' && e.time !== '' ? `(${e.time})` : ''}`}
                        </text>
                      ))}
                    </g>
                  </g>
                </g>
              </g>
            </g>

            {/* INCIDENTES */}
            <g transform={`translate(40, ${incidentsY})`}>
               <text fontSize="12" fontWeight="900" fill="#000000" className="uppercase" textDecoration="underline">INCIDENTES DEL PARTIDO</text>
               <foreignObject x="0" y="20" width="720" height={incidentsBoxHeight}>
                  <div xmlns="http://www.w3.org/1999/xhtml" style={{ 
                    color: '#000', 
                    fontSize: '10px', 
                    lineHeight: '1.4', 
                    textTransform: 'uppercase', 
                    whiteSpace: 'pre-wrap', 
                    fontWeight: '700', 
                    border: '1px solid #E2E8F0', 
                    padding: '8px', 
                    backgroundColor: '#F8FAFC',
                    minHeight: '80px',
                    boxSizing: 'border-box'
                  }}>
                    {incidentsText}
                  </div>
               </foreignObject>
            </g>

            {/* FIRMAS */}
            <g transform={`translate(0, ${signaturesY + 80})`}>
              <g transform="translate(150, 0)">
                {signatures.captainHome && <image href={signatures.captainHome} x="-60" y="-60" width="120" height="60" />}
                <line x1="-80" x2="80" y1="0" y2="0" stroke="#000" strokeWidth="1" />
                <text y="15" textAnchor="middle" fill="#000" fontSize="8" fontWeight="900" className="uppercase">CAPITÁN LOCAL</text>
              </g>
              <g transform="translate(400, 0)">
                {signatures.referee && <image href={signatures.referee} x="-60" y="-60" width="120" height="60" />}
                <line x1="-80" x2="80" y1="0" y2="0" stroke="#000" strokeWidth="1" />
                <text y="15" textAnchor="middle" fill="#000" fontSize="8" fontWeight="900" className="uppercase">ÁRBITRO CENTRAL</text>
              </g>
              <g transform="translate(650, 0)">
                {signatures.captainAway && <image href={signatures.captainAway} x="-60" y="-60" width="120" height="60" />}
                <line x1="-80" x2="80" y1="0" y2="0" stroke="#000" strokeWidth="1" />
                <text y="15" textAnchor="middle" fill="#000" fontSize="8" fontWeight="900" className="uppercase">CAPITÁN VISITANTE</text>
              </g>
            </g>

            <text x="400" y={totalHeight - 15} textAnchor="middle" fill="#94A3B8" fontSize="8" fontWeight="800" className="uppercase">REFEREE ELITE - REPORTE OFICIAL INDEPENDIENTE</text>
          </svg>
        </div>
      </div>

      <div className="p-4 bg-slate-800 border-t border-white/10 shrink-0 flex justify-center z-10">
        <Button onClick={handleDownload} className="bg-emerald-600 hover:bg-emerald-700 font-black px-10 h-12 uppercase shadow-xl w-full max-w-md">
          <Download className="mr-2 h-4 w-4" /> Descargar Imagen JPG
        </Button>
      </div>
    </div>
  );
}
