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
    const style = document.createElement('style');
    style.innerHTML = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
    svg { font-family: 'Inter', sans-serif; }`;
    svg.insertBefore(style, svg.firstChild);
    
    const svgWidth = 800;
    const svgHeight = parseFloat(svg.getAttribute('height') || '2000');
    const svgData = new XMLSerializer().serializeToString(svg);
    svg.removeChild(style);

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
  const homePlayers = lineups.home || [];
  const awayPlayers = lineups.away || [];
  const homeStaff = staff.home || [];
  const awayStaff = staff.away || [];

  const cardEventsSorted = [...safeEvents]
    .filter(e => e.category === 'cards')
    .sort((a, b) => {
      const numA = parseInt(a.playerNumber || '999');
      const numB = parseInt(b.playerNumber || '999');
      if (numA !== numB) return numA - numB;
      const nameA = a.playerName || '';
      const nameB = b.playerName || '';
      if (nameA < nameB) return -1;
      if (nameA > nameB) return 1;
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
  const incidents = safeEvents.find(e => e.category === 'notes')?.message.replace('📝 ', '') || 'SIN INCIDENTES REPORTADOS.';

  const getPlayerEventsSummary = (side: 'home' | 'away', number: string, isSub: boolean, p?: Player) => {
    const playerEvs = safeEvents.filter(e => e.side === side && e.playerNumber === number);
    const goals = playerEvs.filter(e => e.category === 'goals');
    const yellows = playerEvs.filter(e => e.category === 'cards' && e.message.includes('🟨'));
    const reds = playerEvs.filter(e => e.category === 'cards' && e.message.includes('🟥'));
    const subEv = playerEvs.find(e => e.category === 'substitution');
    
    let summary = '';
    goals.forEach(e => { 
      const icon = e.message.includes('AUTOGOL') ? '🥅' : '⚽';
      summary += ` ${icon}${e.time !== '--' && e.time !== '' ? ` (${e.time})` : ''}`; 
    });
    yellows.forEach(e => { summary += ` 🟨${e.time !== '--' && e.time !== '' ? ` (${e.time})` : ''}`; });
    reds.forEach(e => { summary += ` 🟥${e.time !== '--' && e.time !== '' ? ` (${e.time})` : ''}`; });
    
    if (isSub && p?.replacedNumber) {
      summary += ` (POR: #${p.replacedNumber}${subEv?.time !== '--' && subEv?.time !== '' ? ` ${subEv?.time}` : ''})`;
    }
    return summary;
  };

  const getStaffEventsSummary = (side: 'home' | 'away', name: string) => {
    const staffEvs = safeEvents.filter(e => e.side === side && e.playerName === name);
    const yellows = staffEvs.filter(e => e.category === 'cards' && e.message.includes('🟨'));
    const reds = staffEvs.filter(e => e.category === 'cards' && e.message.includes('🟥'));
    
    let summary = '';
    yellows.forEach(e => { summary += ` 🟨${e.time !== '--' && e.time !== '' ? ` (${e.time})` : ''}`; });
    reds.forEach(e => { summary += ` 🟥${e.time !== '--' && e.time !== '' ? ` (${e.time})` : ''}`; });
    return summary;
  };

  // CONFIGURACIÓN DE ESPACIADO
  const ROW_HEIGHT = 24;
  const SECTION_GAP = 80;
  
  const homeRows = homePlayers.length + homeStaff.length + 3; // +3 para títulos y gaps
  const awayRows = awayPlayers.length + awayStaff.length + 3;
  const lineupsHeight = Math.max(homeRows, awayRows) * ROW_HEIGHT + SECTION_GAP;
  
  const maxSancionesPerSide = Math.max(
    (homeSanciones.yellows.length + homeSanciones.reds.length + 4),
    (awaySanciones.yellows.length + awaySanciones.reds.length + 4)
  );
  const sancionesHeight = maxSancionesPerSide * ROW_HEIGHT + SECTION_GAP;
  
  const incidentRows = Math.ceil(incidents.length / 70); 
  const incidentsHeight = Math.max(150, incidentRows * 20 + 60);
  
  const totalHeight = 550 + lineupsHeight + sancionesHeight + incidentsHeight + 250;

  const homeColor = '#064E3B'; 
  const awayColor = '#1E3A8A'; 

  return (
    <div className="w-full h-full flex flex-col bg-slate-900 overflow-hidden" ref={containerRef}>
      <div className="p-4 flex justify-between items-center bg-slate-800 border-b border-white/10 shrink-0 z-10">
        <div>
          <h2 className="text-white font-black italic uppercase text-sm md:text-base">Cédula Digital Profesional</h2>
          <p className="text-slate-400 text-[10px] uppercase font-bold">Pellizca para zoom, desliza para mover.</p>
        </div>
        <DialogClose className="text-white hover:bg-white/10 p-2 rounded-full">
          <X size={24} />
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
          className="relative border-4 border-white/10 shadow-2xl bg-white shrink-0"
        >
          <svg
            ref={svgRef}
            viewBox={`0 0 800 ${totalHeight}`}
            width="800"
            height={totalHeight}
            xmlns="http://www.w3.org/2000/svg"
            className="block"
          >
            {/* FONDOS LATERALES */}
            <rect x="0" y="0" width="400" height={totalHeight} fill={homeColor} />
            <rect x="400" y="0" width="400" height={totalHeight} fill={awayColor} />

            {/* HEADER */}
            <rect x="0" y="0" width="800" height="220" fill="rgba(0,0,0,0.4)" />
            <g transform="translate(400, 60)">
              <text textAnchor="middle" fill="white" fontSize="38" fontWeight="900" style={{ letterSpacing: '0.15em' }} className="uppercase">INFORME ARBITRAL</text>
              <text y="45" textAnchor="middle" fill="white" fontSize="20" fontWeight="800" className="uppercase">{matchInfo.league || 'LIGA'}</text>
              <text y="75" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="16" fontWeight="700" className="uppercase">{`JORNADA ${matchInfo.round || 'S/N'} | ${matchInfo.date || ''}`}</text>
              <text y="100" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="14" fontWeight="600" className="uppercase">{matchInfo.place || 'CAMPO'}</text>
            </g>

            {/* MARCADOR */}
            <g transform="translate(200, 320)">
               <text textAnchor="middle" fill="white" fontSize="42" fontWeight="900" className="uppercase" style={{ letterSpacing: '0.05em' }}>{teamNames.home}</text>
               <text y="110" textAnchor="middle" fill="white" fontSize="150" fontWeight="900">{scores.home}</text>
               <text y="155" textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="24" fontWeight="800">{`(${numberToSpanishWords(scores.home)})`}</text>
            </g>
            <g transform="translate(600, 320)">
               <text textAnchor="middle" fill="white" fontSize="42" fontWeight="900" className="uppercase" style={{ letterSpacing: '0.05em' }}>{teamNames.away}</text>
               <text y="110" textAnchor="middle" fill="white" fontSize="150" fontWeight="900">{scores.away}</text>
               <text y="155" textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="24" fontWeight="800">{`(${numberToSpanishWords(scores.away)})`}</text>
            </g>

            {/* ALINEACIONES LOCAL */}
            <g transform="translate(40, 560)">
               <text x="0" y="0" fontSize="22" fontWeight="900" fill="white" textAnchor="start" className="uppercase">ALINEACIÓN LOCAL</text>
               <rect x="0" y="10" width="320" height="2" fill="white" opacity="0.3" />
               <g transform="translate(0, 50)">
                 <text x="0" y="-15" fontSize="12" fontWeight="900" fill="white" opacity="0.5" className="uppercase">TITULARES</text>
                 {homePlayers.slice(0, 11).map((p, i) => (
                   <text key={p.id} y={i * ROW_HEIGHT} fontSize="13" fill="white" fontWeight="700" className="uppercase">
                     {`#${p.number} ${p.name}${getPlayerEventsSummary('home', p.number, false, p)}`}
                   </text>
                 ))}
                 
                 <g transform={`translate(0, ${11 * ROW_HEIGHT + 40})`}>
                   <text x="0" y="-15" fontSize="12" fontWeight="900" fill="white" opacity="0.5" className="uppercase">SUPLENTES / CAMBIOS</text>
                   {homePlayers.slice(11).map((p, i) => (
                     <text key={p.id} y={i * ROW_HEIGHT} fontSize="13" fill="white" fontWeight="700" className="uppercase">
                       {`#${p.number} ${p.name}${getPlayerEventsSummary('home', p.number, true, p)}`}
                     </text>
                   ))}
                   
                   <g transform={`translate(0, ${Math.max(1, homePlayers.length - 11) * ROW_HEIGHT + 40})`}>
                     <text x="0" y="-15" fontSize="12" fontWeight="900" fill="white" opacity="0.5" className="uppercase">CUERPO TÉCNICO</text>
                     {homeStaff.map((s, i) => (
                       <text key={s.id} y={i * ROW_HEIGHT} fontSize="13" fill="white" fontWeight="700" className="uppercase">
                         {`${s.role}: ${s.name}${getStaffEventsSummary('home', s.name)}`}
                       </text>
                     ))}
                   </g>
                 </g>
               </g>
            </g>

            {/* ALINEACIONES VISITA */}
            <g transform="translate(440, 560)">
               <text x="0" y="0" fontSize="22" fontWeight="900" fill="white" textAnchor="start" className="uppercase">ALINEACIÓN VISITA</text>
               <rect x="0" y="10" width="320" height="2" fill="white" opacity="0.3" />
               <g transform="translate(0, 50)">
                 <text x="0" y="-15" fontSize="12" fontWeight="900" fill="white" opacity="0.5" className="uppercase">TITULARES</text>
                 {awayPlayers.slice(0, 11).map((p, i) => (
                   <text key={p.id} y={i * ROW_HEIGHT} fontSize="13" fill="white" fontWeight="700" className="uppercase">
                     {`#${p.number} ${p.name}${getPlayerEventsSummary('away', p.number, false, p)}`}
                   </text>
                 ))}
                 
                 <g transform={`translate(0, ${11 * ROW_HEIGHT + 40})`}>
                   <text x="0" y="-15" fontSize="12" fontWeight="900" fill="white" opacity="0.5" className="uppercase">SUPLENTES / CAMBIOS</text>
                   {awayPlayers.slice(11).map((p, i) => (
                     <text key={p.id} y={i * ROW_HEIGHT} fontSize="13" fill="white" fontWeight="700" className="uppercase">
                       {`#${p.number} ${p.name}${getPlayerEventsSummary('away', p.number, true, p)}`}
                     </text>
                   ))}
                   
                   <g transform={`translate(0, ${Math.max(1, awayPlayers.length - 11) * ROW_HEIGHT + 40})`}>
                     <text x="0" y="-15" fontSize="12" fontWeight="900" fill="white" opacity="0.5" className="uppercase">CUERPO TÉCNICO</text>
                     {awayStaff.map((s, i) => (
                       <text key={s.id} y={i * ROW_HEIGHT} fontSize="13" fill="white" fontWeight="700" className="uppercase">
                         {`${s.role}: ${s.name}${getStaffEventsSummary('away', s.name)}`}
                       </text>
                     ))}
                   </g>
                 </g>
               </g>
            </g>

            {/* SANCIONES DINÁMICAS */}
            <g transform={`translate(0, ${580 + lineupsHeight})`}>
              <rect width="800" height={sancionesHeight} fill="rgba(0,0,0,0.3)" />
              
              {/* SANCIONES LOCAL */}
              <g transform="translate(40, 50)">
                <text fontSize="14" fontWeight="900" fill="white" opacity="0.6" className="uppercase">AMONESTADOS LOCAL</text>
                <g transform="translate(0, 30)">
                  {homeSanciones.yellows.map((e, idx) => (
                    <text key={e.id} y={idx * 22} x="0" fill="white" fontSize="11" fontWeight="700" className="uppercase">
                       {`#${e.playerNumber} ${e.playerName} 🟨 ${e.message.split(' - ').pop()} ${e.time !== '--' && e.time !== '' ? `(${e.time})` : ''}`}
                    </text>
                  ))}
                </g>
                <g transform={`translate(0, ${homeSanciones.yellows.length * 22 + 50})`}>
                  <text fontSize="14" fontWeight="900" fill="white" opacity="0.6" className="uppercase">EXPULSADOS LOCAL</text>
                  <g transform="translate(0, 30)">
                    {homeSanciones.reds.map((e, idx) => (
                      <text key={e.id} y={idx * 22} x="0" fill="white" fontSize="11" fontWeight="700" className="uppercase">
                        {`#${e.playerNumber} ${e.playerName} 🟥 ${e.message.split(' - ').pop()} ${e.time !== '--' && e.time !== '' ? `(${e.time})` : ''}`}
                      </text>
                    ))}
                  </g>
                </g>
              </g>

              {/* SANCIONES VISITA */}
              <g transform="translate(440, 50)">
                <text fontSize="14" fontWeight="900" fill="white" opacity="0.6" className="uppercase">AMONESTADOS VISITA</text>
                <g transform="translate(0, 30)">
                  {awaySanciones.yellows.map((e, idx) => (
                    <text key={e.id} y={idx * 22} x="0" fill="white" fontSize="11" fontWeight="700" className="uppercase">
                       {`#${e.playerNumber} ${e.playerName} 🟨 ${e.message.split(' - ').pop()} ${e.time !== '--' && e.time !== '' ? `(${e.time})` : ''}`}
                    </text>
                  ))}
                </g>
                <g transform={`translate(0, ${awaySanciones.yellows.length * 22 + 50})`}>
                  <text fontSize="14" fontWeight="900" fill="white" opacity="0.6" className="uppercase">EXPULSADOS VISITA</text>
                  <g transform="translate(0, 30)">
                    {awaySanciones.reds.map((e, idx) => (
                      <text key={e.id} y={idx * 22} x="0" fill="white" fontSize="11" fontWeight="700" className="uppercase">
                        {`#${e.playerNumber} ${e.playerName} 🟥 ${e.message.split(' - ').pop()} ${e.time !== '--' && e.time !== '' ? `(${e.time})` : ''}`}
                      </text>
                    ))}
                  </g>
                </g>
              </g>
            </g>

            {/* INCIDENTES */}
            <g transform={`translate(400, ${640 + lineupsHeight + sancionesHeight})`}>
               <text textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="20" fontWeight="900" className="uppercase" style={{ letterSpacing: '0.1em' }}>INCIDENTES DEL PARTIDO</text>
               <rect x="-360" y="25" width="720" height="2" fill="white" opacity="0.2" />
               <foreignObject x="-350" y="50" width="700" height={incidentsHeight}>
                  <div xmlns="http://www.w3.org/1999/xhtml" style={{ color: 'white', fontSize: '13px', textAlign: 'center', lineHeight: '1.6', opacity: 0.9, textTransform: 'uppercase', whiteSpace: 'pre-wrap', fontWeight: 'bold' }}>
                    {incidents}
                  </div>
               </foreignObject>
            </g>

            {/* FIRMAS */}
            <g transform={`translate(0, ${totalHeight - 160})`}>
              <g transform="translate(150, 0)">
                {signatures.captainHome && <image href={signatures.captainHome} x="-75" y="-90" width="150" height="75" />}
                <line x1="-100" x2="100" y1="0" y2="0" stroke="white" strokeWidth="2" opacity="0.5" />
                <text y="25" textAnchor="middle" fill="white" fontSize="11" fontWeight="900" className="uppercase" style={{ letterSpacing: '0.05em' }}>CAPITÁN LOCAL</text>
              </g>
              <g transform="translate(400, 0)">
                {signatures.referee && <image href={signatures.referee} x="-75" y="-90" width="150" height="75" />}
                <line x1="-100" x2="100" y1="0" y2="0" stroke="white" strokeWidth="2" opacity="0.5" />
                <text y="25" textAnchor="middle" fill="white" fontSize="11" fontWeight="900" className="uppercase" style={{ letterSpacing: '0.05em' }}>ÁRBITRO CENTRAL</text>
              </g>
              <g transform="translate(650, 0)">
                {signatures.captainAway && <image href={signatures.captainAway} x="-75" y="-90" width="150" height="75" />}
                <line x1="-100" x2="100" y1="0" y2="0" stroke="white" strokeWidth="2" opacity="0.5" />
                <text y="25" textAnchor="middle" fill="white" fontSize="11" fontWeight="900" className="uppercase" style={{ letterSpacing: '0.05em' }}>CAPITÁN VISITANTE</text>
              </g>
            </g>

            {/* MARCA DE AGUA / PIE */}
            <text x="400" y={totalHeight - 30} textAnchor="middle" fill="white" fontSize="10" fontWeight="900" opacity="0.3" className="uppercase">REFEREE ELITE - SISTEMA PROFESIONAL DE ASESORÍA ARBITRAL</text>
          </svg>
        </div>
      </div>

      <div className="p-4 bg-slate-800 border-t border-white/10 shrink-0 flex justify-center z-10">
        <Button onClick={handleDownload} className="bg-emerald-600 hover:bg-emerald-700 font-black px-10 h-12 uppercase shadow-xl w-full max-w-md">
          <Download className="mr-2 h-5 w-5" /> Descargar Imagen JPG
        </Button>
      </div>
    </div>
  );
}
