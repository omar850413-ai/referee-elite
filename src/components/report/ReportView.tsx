'use client';

import React, { useRef } from 'react';
import { MatchState, MatchEvent, Player } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { DialogClose, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { parseTimeToMinutes, numberToSpanishWords } from '@/lib/utils';

interface ReportViewProps {
  matchState: MatchState;
}

export function ReportView({ matchState }: ReportViewProps) {
  const { scores, teamNames, matchInfo, events, lineups = { home: [], away: [] }, signatures = {} } = matchState;
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
    
    const svgHeight = parseFloat(svg.getAttribute('height') || '1400');
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
      link.download = `cedula-imagen-${matchInfo.league || 'partido'}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };
  };

  const safeEvents = events || [];
  const sorter = (a: MatchEvent, b: MatchEvent) => (a.id || 0) - (b.id || 0);

  const homePlayers = lineups.home || [];
  const awayPlayers = lineups.away || [];

  const homeEvents = safeEvents.filter(e => e.side === 'home').sort(sorter);
  const awayEvents = safeEvents.filter(e => e.side === 'away').sort(sorter);
  const incidents = safeEvents.find(e => e.category === 'notes')?.message.replace('📝 ', '') || 'SIN INCIDENTES.';

  // Render a column of players
  const renderPlayersList = (players: Player[], x: number, y: number, side: 'home' | 'away') => {
    return (
      <g>
        <text x={x} y={y - 15} fontSize="14" fontWeight="900" fill="white" opacity="0.5" textAnchor="middle">
          {players.length > 0 ? (players.length <= 11 ? 'TITULARES' : 'PLANTILLA') : ''}
        </text>
        {players.map((p, i) => (
          <text key={p.id} x={x} y={y + (i * 18)} fontSize="12" fill="white" textAnchor="middle" fontWeight="700">
            {`#${p.number} ${p.name}`}
          </text>
        ))}
      </g>
    );
  };

  const homeColor = '#065F46'; // Emerald 800
  const awayColor = '#1E40AF'; // Blue 800
  
  // Dynamic Height calculation
  const maxPlayers = Math.max(homePlayers.length, awayPlayers.length);
  const maxEvents = Math.max(homeEvents.length, awayEvents.length);
  const playersHeight = maxPlayers * 18 + 50;
  const eventsHeight = maxEvents * 25 + 100;
  const svgHeight = 750 + playersHeight + eventsHeight + 200;

  return (
    <div className="w-full max-h-[90vh] overflow-y-auto p-4 bg-slate-900 rounded-xl">
       <DialogHeader className="px-2 pb-4 text-left">
            <DialogTitle className="text-white font-black italic uppercase">Cédula Digital JPG</DialogTitle>
            <DialogDescription className="text-slate-400">
             Diseño optimizado para compartir. Incluye alineaciones y marcador en texto.
            </DialogDescription>
        </DialogHeader>
      
      <div className="relative w-full max-w-[800px] mx-auto border-4 border-white/10 rounded-lg overflow-hidden">
        <svg
          ref={svgRef}
          viewBox={`0 0 800 ${svgHeight}`}
          height={svgHeight}
          xmlns="http://www.w3.org/2000/svg"
          className="max-w-full h-auto"
        >
          {/* Backgrounds */}
          <rect x="0" y="0" width="800" height={svgHeight} fill="#0F172A" />
          <rect x="0" y="0" width="400" height={svgHeight} fill={homeColor} />
          <rect x="400" y="0" width="400" height={svgHeight} fill={awayColor} />

          {localBg && <image href={localBg} x="-100" y="200" width="600" height="600" opacity="0.08" />}
          {awayBg && <image href={awayBg} x="300" y="200" width="600" height="600" opacity="0.08" />}

          {/* Header */}
          <g transform="translate(400, 60)">
            <text textAnchor="middle" fill="white" fontSize="22" fontWeight="900" style={{ letterSpacing: '0.1em' }}>
              {matchInfo.league?.toUpperCase() || 'LIGA PROFESIONAL'}
            </text>
            <text y="25" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="14" fontWeight="700">
              {`JORNADA ${matchInfo.round || 'S/N'} | ${matchInfo.date || ''}`}
            </text>
            <text y="45" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="14" fontWeight="700">
              {matchInfo.place?.toUpperCase() || 'CAMPO POR DEFINIR'}
            </text>
          </g>

          {/* Team Names & Big Scores */}
          <g transform="translate(200, 180)">
             <text textAnchor="middle" fill="white" fontSize="32" fontWeight="900" style={{ letterSpacing: '-0.02em' }}>{teamNames.home.toUpperCase()}</text>
             <text y="100" textAnchor="middle" fill="white" fontSize="120" fontWeight="900">{scores.home}</text>
             <text y="140" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="18" fontWeight="800">{`(${numberToSpanishWords(scores.home)})`}</text>
          </g>

          <g transform="translate(600, 180)">
             <text textAnchor="middle" fill="white" fontSize="32" fontWeight="900" style={{ letterSpacing: '-0.02em' }}>{teamNames.away.toUpperCase()}</text>
             <text y="100" textAnchor="middle" fill="white" fontSize="120" fontWeight="900">{scores.away}</text>
             <text y="140" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="18" fontWeight="800">{`(${numberToSpanishWords(scores.away)})`}</text>
          </g>

          {/* Players Lists */}
          <g transform="translate(0, 400)">
             {renderPlayersList(homePlayers, 200, 30, 'home')}
             {renderPlayersList(awayPlayers, 600, 30, 'away')}
          </g>

          {/* Events Detail */}
          <g transform={`translate(0, ${400 + playersHeight})`}>
            <rect x="50" width="700" height="2" fill="white" opacity="0.1" />
            
            <g transform="translate(200, 40)">
              <text textAnchor="middle" fill="white" fontSize="16" fontWeight="900">INCIDENCIAS LOCAL</text>
              {homeEvents.map((e, idx) => (
                <text key={e.id} y={30 + (idx * 22)} x="0" textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize="12">
                  {e.message}
                </text>
              ))}
            </g>

            <g transform="translate(600, 40)">
              <text textAnchor="middle" fill="white" fontSize="16" fontWeight="900">INCIDENCIAS VISITA</text>
              {awayEvents.map((e, idx) => (
                <text key={e.id} y={30 + (idx * 22)} x="0" textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize="12">
                  {e.message}
                </text>
              ))}
            </g>
          </g>

          {/* Narrative / Notes */}
          <g transform={`translate(400, ${400 + playersHeight + eventsHeight})`}>
             <text textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="14" fontWeight="900">OBSERVACIONES DEL ENCUENTRO</text>
             <foreignObject x="-350" y="15" width="700" height="100">
                <p xmlns="http://www.w3.org/1999/xhtml" style={{ color: 'white', fontSize: '12px', textAlign: 'center', margin: 0, opacity: 0.8 }}>
                  {incidents}
                </p>
             </foreignObject>
          </g>

          {/* Signatures */}
          <g transform={`translate(0, ${svgHeight - 160})`}>
            <g transform="translate(150, 0)">
              {signatures.captainHome && <image href={signatures.captainHome} x="-60" y="-70" width="120" height="60" />}
              <line x1="-100" x2="100" y1="0" y2="0" stroke="white" strokeWidth="1" opacity="0.3" />
              <text y="15" textAnchor="middle" fill="white" fontSize="10" fontWeight="900">CAPITÁN LOCAL</text>
            </g>

            <g transform="translate(400, 0)">
              {signatures.referee && <image href={signatures.referee} x="-60" y="-70" width="120" height="60" />}
              <line x1="-100" x2="100" y1="0" y2="0" stroke="white" strokeWidth="1" opacity="0.3" />
              <text y="15" textAnchor="middle" fill="white" fontSize="10" fontWeight="900">ÁRBITRO CENTRAL</text>
            </g>

            <g transform="translate(650, 0)">
              {signatures.captainAway && <image href={signatures.captainAway} x="-60" y="-70" width="120" height="60" />}
              <line x1="-100" x2="100" y1="0" y2="0" stroke="white" strokeWidth="1" opacity="0.3" />
              <text y="15" textAnchor="middle" fill="white" fontSize="10" fontWeight="900">CAPITÁN VISITANTE</text>
            </g>
          </g>

          <text x="400" y={svgHeight - 20} textAnchor="middle" fill="white" opacity="0.3" fontSize="10" fontWeight="900" style={{ letterSpacing: '0.2em' }}>CEDULA DIGITAL GENERADA POR ASESOR PRO</text>
        </svg>
      </div>

      <div className="flex justify-center gap-3 mt-6">
        <Button onClick={handleDownload} className="bg-emerald-600 hover:bg-emerald-700 font-bold px-8">
          <Download className="mr-2 h-4 w-4" /> DESCARGAR JPG
        </Button>
        <DialogClose asChild>
          <Button variant="outline" className="text-white border-white/20 hover:bg-white/10">
            CERRAR
          </Button>
        </DialogClose>
      </div>
    </div>
  );
}
