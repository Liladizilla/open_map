import React, { useState } from 'react';
import { Compass, Wind, Navigation, MapPin, Search, Save, Download, CheckCircle2, Loader2, Trophy, Target, Eye, EyeOff, X, Grid, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { BriefingSource, DiscoveryState, Mission } from '../types';

interface HUDProps {
  lat: number;
  lng: number;
  speed: number;
  altitude: number;
  heading: number;
  discovery: DiscoveryState | null;
  onScan: () => void;
  onSave: () => void;
  onLoad: () => void;
  saveStatus: 'idle' | 'saving' | 'saved' | 'loaded' | 'locating';
  missions: Mission[];
  activeMissionId: string | null;
  onSelectMission: (id: string) => void;
  isFreeLook: boolean;
  onToggleFreeLook: () => void;
}

export const HUD: React.FC<HUDProps> = ({ 
  lat, lng, speed, altitude, heading, discovery, onScan, onSave, onLoad, saveStatus,
  missions, activeMissionId, onSelectMission, isFreeLook, onToggleFreeLook
}) => {
  const activeMission = missions.find(m => m.id === activeMissionId);
  const sourceLabel: Record<BriefingSource, string> = {
    cache: 'CACHE',
    gemini: 'LIVE',
    offline: 'OFFLINE',
  };

  // States to toggle visibility of individual cockpit instrument panels
  const [showAvionics, setShowAvionics] = useState(true);
  const [showActiveMission, setShowActiveMission] = useState(true);
  const [showCoordinates, setShowCoordinates] = useState(true);
  const [showAreaIntel, setShowAreaIntel] = useState(true);
  const [showMissionLog, setShowMissionLog] = useState(true);
  const [showControlsGuide, setShowControlsGuide] = useState(true);

  // Main master control for the Dashboard Dock itself
  const [showDashboardController, setShowDashboardController] = useState(true);

  return (
    <div className="fixed inset-0 pointer-events-none z-1000 flex flex-col justify-between p-6">
      
      {/* Central Avionics Control Dashboard Menu (Top Center) */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 pointer-events-auto z-2000 flex flex-col items-center">
        {showDashboardController ? (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="bg-[#0b1319]/90 border border-green-500/30 shadow-[0_0_20px_rgba(34,197,94,0.15)] rounded-2xl p-3 flex flex-col items-center gap-2 max-w-[92vw]"
          >
            {/* Header with Title and Minimize Dashboard Action */}
            <div className="flex items-center justify-between w-full px-2 border-b border-white/5 pb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 bg-green-500 animate-pulse rounded-full"></span>
                <span className="text-[9px] font-mono tracking-[0.15em] text-green-400 font-bold uppercase">
                  Avionics Systems Panel
                </span>
              </div>
              <button
                onClick={() => setShowDashboardController(false)}
                className="text-[9px] font-mono bg-white/5 hover:bg-white/10 text-white/50 hover:text-white px-1.5 py-0.5 rounded transition-colors flex items-center gap-1"
                title="Hide system bar"
              >
                <X size={10} />
                <span>HIDE</span>
              </button>
            </div>

            {/* Squeezed menu layout with status lights */}
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              
              {/* 1. Avionics Toggle */}
              <button
                onClick={() => setShowAvionics(prev => !prev)}
                className={`flex items-center gap-2 p-1.5 px-3 rounded-lg transition-all border text-[10px] ${
                  showAvionics 
                    ? 'bg-green-500/15 text-green-400 border-green-500/40 shadow-[0_0_8px_rgba(34,197,94,0.1)]' 
                    : 'bg-zinc-900/60 text-white/40 border-white/5 hover:bg-zinc-800 hover:text-white/60'
                }`}
                title="Toggle Avionics Stats"
              >
                <Compass size={12} className={showAvionics ? 'text-green-400 animate-pulse' : ''} />
                <span className="font-mono tracking-wide font-medium">Avionics</span>
                <span className={`w-1.5 h-1.5 rounded-full ${showAvionics ? 'bg-green-500 shadow-[0_0_4px_#22c55e]' : 'bg-zinc-600'}`}></span>
              </button>

              {/* 2. Active Tracker Toggle */}
              <button
                onClick={() => setShowActiveMission(prev => !prev)}
                className={`flex items-center gap-2 p-1.5 px-3 rounded-lg transition-all border text-[10px] ${
                  showActiveMission 
                    ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/40 shadow-[0_0_8px_rgba(234,179,8,0.1)]' 
                    : 'bg-zinc-900/60 text-white/40 border-white/5 hover:bg-zinc-800 hover:text-white/60'
                }`}
                title="Toggle Active Mission Tracker"
              >
                <Trophy size={12} className={showActiveMission ? 'text-yellow-400' : ''} />
                <span className="font-mono tracking-wide font-medium">Goal</span>
                <span className={`w-1.5 h-1.5 rounded-full ${showActiveMission ? 'bg-yellow-500 shadow-[0_0_4px_#eab308]' : 'bg-zinc-600'}`}></span>
              </button>

              {/* 3. Coordinates / Telemetry Toggle */}
              <button
                onClick={() => setShowCoordinates(prev => !prev)}
                className={`flex items-center gap-2 p-1.5 px-3 rounded-lg transition-all border text-[10px] ${
                  showCoordinates 
                    ? 'bg-blue-500/15 text-blue-400 border-blue-500/40 shadow-[0_0_8px_rgba(59,130,246,0.1)]' 
                    : 'bg-zinc-900/60 text-white/40 border-white/5 hover:bg-zinc-800 hover:text-white/60'
                }`}
                title="Toggle GPS & Save Controls"
              >
                <Navigation size={12} className={showCoordinates ? 'text-blue-400' : ''} />
                <span className="font-mono tracking-wide font-medium">Telemetry</span>
                <span className={`w-1.5 h-1.5 rounded-full ${showCoordinates ? 'bg-blue-500 shadow-[0_0_4px_#3b82f6]' : 'bg-zinc-600'}`}></span>
              </button>

              {/* 4. Area Intel / Explorer Toggle */}
              <button
                onClick={() => setShowAreaIntel(prev => !prev)}
                className={`flex items-center gap-2 p-1.5 px-3 rounded-lg transition-all border text-[10px] ${
                  showAreaIntel 
                    ? 'bg-red-500/15 text-red-500 border-red-500/40 shadow-[0_0_8px_rgba(239,68,68,0.1)]' 
                    : 'bg-zinc-900/60 text-white/40 border-white/5 hover:bg-zinc-800 hover:text-white/60'
                }`}
                title="Toggle Live Area Intelligence"
              >
                <MapPin size={12} className={showAreaIntel ? 'text-red-400' : ''} />
                <span className="font-mono tracking-wide font-medium">Intel</span>
                <span className={`w-1.5 h-1.5 rounded-full ${showAreaIntel ? 'bg-red-500 shadow-[0_0_4px_#ef4444]' : 'bg-zinc-600'}`}></span>
              </button>

              {/* 5. Mission Log Toggle */}
              <button
                onClick={() => setShowMissionLog(prev => !prev)}
                className={`flex items-center gap-2 p-1.5 px-3 rounded-lg transition-all border text-[10px] ${
                  showMissionLog 
                    ? 'bg-purple-500/15 text-purple-400 border-purple-500/40 shadow-[0_0_8px_rgba(168,85,247,0.1)]' 
                    : 'bg-zinc-900/60 text-white/40 border-white/5 hover:bg-zinc-800 hover:text-white/60'
                }`}
                title="Toggle Mission Logs"
              >
                <Target size={12} className={showMissionLog ? 'text-purple-400' : ''} />
                <span className="font-mono tracking-wide font-medium">Logs</span>
                <span className={`w-1.5 h-1.5 rounded-full ${showMissionLog ? 'bg-purple-500 shadow-[0_0_4px_#a855f7]' : 'bg-zinc-600'}`}></span>
              </button>

              {/* 6. Controls Guide Toggle */}
              <button
                onClick={() => setShowControlsGuide(prev => !prev)}
                className={`flex items-center gap-2 p-1.5 px-3 rounded-lg transition-all border text-[10px] ${
                  showControlsGuide 
                    ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.1)]' 
                    : 'bg-zinc-900/60 text-white/40 border-white/5 hover:bg-zinc-800 hover:text-white/60'
                }`}
                title="Toggle Help Controls Indicator"
              >
                <Wind size={12} className={showControlsGuide ? 'text-cyan-400' : ''} />
                <span className="font-mono tracking-wide font-medium">Controls</span>
                <span className={`w-1.5 h-1.5 rounded-full ${showControlsGuide ? 'bg-cyan-500 shadow-[0_0_4px_#06b6d4]' : 'bg-zinc-600'}`}></span>
              </button>

            </div>
          </motion.div>
        ) : (
          /* Sleek minimized tab if completely hidden to restore the system controller bar */
          <motion.button
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setShowDashboardController(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-b-xl bg-[#0b1319]/90 border border-t-0 border-green-500/30 text-green-400 hover:bg-zinc-900 transition-all shadow-[0_0_10px_rgba(34,197,94,0.1)] pointer-events-auto"
          >
            <Grid size={12} className="animate-spin-slow" />
            <span className="text-[9px] font-mono tracking-widest font-bold uppercase">Show Avionics Controls</span>
          </motion.button>
        )}
      </div>

      {/* Top Bar: Stats & Missions */}
      <div className="flex justify-between items-start">
        <div className="flex gap-4">
          <AnimatePresence>
            {showAvionics && (
              <motion.div 
                initial={{ opacity: 0, x: -30, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -30, scale: 0.95 }}
                className="cockpit-panel p-4 rounded-xl flex flex-col gap-2 pointer-events-auto"
              >
                {/* Panel Header with close button */}
                <div className="flex items-center justify-between border-b border-white/10 pb-1 mb-1">
                  <span className="text-[9px] font-mono uppercase tracking-widest text-green-400 font-semibold">PFD Telemetry Instruments</span>
                  <button 
                    onClick={() => setShowAvionics(false)}
                    className="p-0.5 hover:bg-white/10 rounded text-white/40 hover:text-white transition-colors"
                    title="Minimize"
                  >
                    <X size={10} />
                  </button>
                </div>

                <div className="flex gap-8">
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] uppercase tracking-widest text-white/50 mb-1">Altitude</span>
                    <div className="flex items-baseline gap-1">
                      <span className="hud-text text-2xl font-bold">{altitude.toFixed(0)}</span>
                      <span className="hud-text text-xs opacity-70">FT</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] uppercase tracking-widest text-white/50 mb-1">Speed</span>
                    <div className="flex items-baseline gap-1">
                      <span className="hud-text text-2xl font-bold">{speed.toFixed(0)}</span>
                      <span className="hud-text text-xs opacity-70">KTS</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] uppercase tracking-widest text-white/50 mb-1">Heading</span>
                    <div className="flex items-baseline gap-1">
                      <span className="hud-text text-2xl font-bold">{heading.toFixed(0)}°</span>
                      <Compass size={14} className="text-green-500" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mission Status Tracker */}
          <AnimatePresence>
            {showActiveMission && (
              <motion.div 
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                className="cockpit-panel p-4 rounded-xl pointer-events-auto w-64 flex flex-col gap-1"
              >
                {/* Panel Header with close button */}
                <div className="flex items-center justify-between border-b border-white/10 pb-1 mb-1">
                  <div className="flex items-center gap-1.5">
                    <Trophy size={11} className="text-yellow-500" />
                    <span className="text-[9px] uppercase tracking-widest text-white/50 font-semibold">Active Objective</span>
                  </div>
                  <button 
                    onClick={() => setShowActiveMission(false)}
                    className="p-0.5 hover:bg-white/10 rounded text-white/40 hover:text-white transition-colors"
                    title="Minimize"
                  >
                    <X size={10} />
                  </button>
                </div>

                {activeMission ? (
                  <div>
                    <div className="text-xs font-bold text-white mb-1 truncate">{activeMission.title}</div>
                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mb-2">
                      <motion.div 
                        className={`h-full ${activeMission.isCompleted ? 'bg-green-500' : 'bg-yellow-500'}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${activeMission.progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-white/40 uppercase tracking-tighter block max-w-50 truncate">
                        {activeMission.isCompleted ? 'Objective Complete' : activeMission.description}
                      </span>
                      {activeMission.isCompleted && <CheckCircle2 size={12} className="text-green-500" />}
                    </div>
                  </div>
                ) : (
                  <div className="text-[10px] text-white/30 italic">No active mission. Plan a flight path.</div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* GPS coordinates & Telemetry Controls */}
        <AnimatePresence>
          {showCoordinates && (
            <motion.div 
              initial={{ opacity: 0, x: 30, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 30, scale: 0.95 }}
              className="cockpit-panel p-4 rounded-xl pointer-events-auto flex flex-col items-end w-64"
            >
              <div className="flex justify-between items-center w-full border-b border-white/10 pb-1 mb-2">
                <div className="flex items-center gap-1.5">
                  <Navigation size={12} className="text-blue-500" />
                  <span className="text-[9px] uppercase tracking-widest text-white/50 font-semibold">GPS Flight Deck</span>
                </div>
                <button 
                  onClick={() => setShowCoordinates(false)}
                  className="p-0.5 hover:bg-white/10 rounded text-white/40 hover:text-white transition-colors"
                  title="Minimize"
                >
                  <X size={10} />
                </button>
              </div>

              <div className="hud-text text-sm font-mono mb-3 w-full text-right tracking-wider">
                {lat.toFixed(4)}N, {lng.toFixed(4)}E
              </div>
              
              <div className="flex flex-wrap gap-1.5 justify-end w-full">
                <button
                  onClick={onToggleFreeLook}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] uppercase tracking-wider transition-colors border ${
                    isFreeLook 
                      ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' 
                      : 'bg-green-500/20 text-green-400 border-green-500/30'
                  }`}
                >
                  {isFreeLook ? <EyeOff size={11} /> : <Eye size={11} />}
                  {isFreeLook ? 'Free Look' : 'Following'}
                </button>
                <button
                  onClick={onSave}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[9px] uppercase tracking-wider text-white/70 transition-colors border border-white/10"
                >
                  <Save size={11} />
                  Save
                </button>
                <button
                  onClick={onLoad}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[9px] uppercase tracking-wider text-white/70 transition-colors border border-white/10"
                >
                  <Download size={11} />
                  Load
                </button>
              </div>
              
              <AnimatePresence>
                {saveStatus !== 'idle' && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-2 text-[10px] font-mono text-green-400 flex items-center gap-1 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20"
                  >
                    {saveStatus === 'saving' && <Loader2 size={10} className="animate-spin" />}
                    {saveStatus === 'saved' && <CheckCircle2 size={10} />}
                    {saveStatus === 'loaded' && <CheckCircle2 size={10} />}
                    <span className="uppercase tracking-widest text-[8px] font-bold">{saveStatus}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Center: Crosshair/Horizon (Visual only) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20 pointer-events-none">
        <div className="w-64 h-px bg-green-500 relative">
          <div className="absolute left-1/2 -top-2 w-px h-4 bg-green-500"></div>
        </div>
      </div>

      {/* Bottom: Discovery & Controls */}
      <div className="flex justify-between items-end">
        {/* Discovery Panel */}
        <div className="w-95 max-w-[90vw] pointer-events-auto">
          <AnimatePresence>
            {showAreaIntel && discovery && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                className="cockpit-panel p-5 rounded-2xl mb-3 max-h-80 overflow-y-auto custom-scrollbar flex flex-col"
              >
                <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-red-500" />
                    <h3 className="text-white text-xs font-semibold tracking-wide">Area Airspace Intelligence</h3>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {discovery.source && (
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-mono uppercase tracking-widest text-white/70">
                        {sourceLabel[discovery.source]}
                      </span>
                    )}
                    {discovery.loading && (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        className="mr-1"
                      >
                        <Search size={14} className="text-blue-400" />
                      </motion.div>
                    )}
                    <button 
                      onClick={() => setShowAreaIntel(false)}
                      className="p-1 hover:bg-white/10 rounded text-white/40 hover:text-white transition-colors"
                      title="Minimize info panel"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>

                {discovery.loading ? (
                  <div className="space-y-3 py-2">
                    <div className="h-3.5 bg-white/5 rounded w-3/4 animate-pulse"></div>
                    <div className="h-3.5 bg-white/5 rounded w-full animate-pulse"></div>
                    <div className="h-3.5 bg-white/5 rounded w-5/6 animate-pulse"></div>
                  </div>
                ) : (
                  <div className="text-xs text-white/80 leading-relaxed markdown-body prose prose-invert prose-xs max-w-none">
                    <ReactMarkdown>
                      {discovery.text.replace(/\[\[NAME: (.*?), LAT: ([-+]?\d*\.\d+|\d+), LNG: ([-+]?\d*\.\d+|\d+)\]\]/g, '')}
                    </ReactMarkdown>
                    
                    {discovery.groundingChunks && discovery.groundingChunks.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <p className="text-[9px] uppercase tracking-widest text-white/40 mb-1.5 font-bold">Verified Sources</p>
                        <div className="flex flex-wrap gap-1.5">
                          {discovery.groundingChunks.map((chunk, idx) => (
                            chunk.maps?.uri && (
                              <a
                                key={idx}
                                href={chunk.maps.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[9px] bg-blue-500/10 text-blue-400 px-2 py-1 rounded hover:bg-blue-500/20 border border-blue-500/20 transition-colors flex items-center gap-1"
                              >
                                <Navigation size={9} />
                                {chunk.maps.title || "View on Maps"}
                              </a>
                            )
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={() => {
              setShowAreaIntel(true);
              onScan();
            }}
            disabled={discovery?.loading}
            className="cockpit-panel px-5 py-2.5 rounded-xl text-white flex items-center gap-2.5 hover:bg-white/10 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 pointer-events-auto shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
          >
            <Search size={16} className="text-blue-400" />
            <span className="text-xs font-semibold tracking-wider font-mono">SCAN RADIUS</span>
          </button>
        </div>

        {/* Mission Selector & Flight Controls Reference Guide */}
        <div className="flex flex-col gap-3 items-end pointer-events-auto">
          
          {/* Mission Selector Panel */}
          <AnimatePresence>
            {showMissionLog && (
              <motion.div 
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                className="cockpit-panel p-4 rounded-xl w-64 flex flex-col"
              >
                <div className="flex justify-between items-center border-b border-white/10 pb-1.5 mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <Target size={12} className="text-blue-400" />
                    <span className="text-[9px] uppercase tracking-widest text-white/50 font-semibold">Active Mission Log</span>
                  </div>
                  <button 
                    onClick={() => setShowMissionLog(false)}
                    className="p-0.5 hover:bg-white/10 rounded text-white/40 hover:text-white transition-colors"
                    title="Minimize"
                  >
                    <X size={10} />
                  </button>
                </div>

                <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                  {missions.map(m => (
                    <button
                      key={m.id}
                      onClick={() => onSelectMission(m.id)}
                      className={`w-full text-left p-1.5 rounded-lg transition-all border text-[10px] ${
                        activeMissionId === m.id 
                          ? 'bg-blue-500/10 border-blue-500/30 text-blue-300' 
                          : 'bg-white/5 border-transparent hover:bg-white/10 text-white/80'
                      }`}
                    >
                      <div className="flex justify-between items-center gap-2">
                        <span className={`font-medium truncate ${m.isCompleted ? 'text-green-400 line-through' : ''}`}>
                          {m.title}
                        </span>
                        {m.isCompleted ? (
                          <CheckCircle2 size={10} className="text-green-500 shrink-0" />
                        ) : (
                          <span className="text-[8px] bg-white/10 text-white/40 px-1 rounded shrink-0">
                            {m.type}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Controls Help Panel */}
          <AnimatePresence>
            {showControlsGuide && (
              <motion.div 
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                className="cockpit-panel p-4 rounded-xl text-[9px] text-white/40 uppercase tracking-widest flex flex-col w-64"
              >
                <div className="flex justify-between items-center border-b border-white/10 pb-1.5 mb-2">
                  <div className="flex items-center gap-1">
                    <Info size={11} className="text-cyan-500" />
                    <span className="text-[9px] uppercase tracking-widest text-white/50 font-semibold">Autopilot Checklists</span>
                  </div>
                  <button 
                    onClick={() => setShowControlsGuide(false)}
                    className="p-0.5 hover:bg-white/10 rounded text-white/40 hover:text-white transition-colors"
                    title="Minimize"
                  >
                    <X size={10} />
                  </button>
                </div>

                <div className="flex flex-col gap-1.5 mt-0.5">
                  <div className="flex justify-between gap-6 py-0.5 border-b border-white/5">
                    <span>Altitude Control</span>
                    <span className="text-white font-mono bg-white/10 px-1 rounded">▲ / ▼</span>
                  </div>
                  <div className="flex justify-between gap-6 py-0.5 border-b border-white/5">
                    <span>Wing Pitch (Steer)</span>
                    <span className="text-white font-mono bg-white/10 px-1 rounded">A / D</span>
                  </div>
                  <div className="flex justify-between gap-6 py-0.5">
                    <span>Engine Thrust</span>
                    <span className="text-white font-mono bg-white/10 px-1 rounded">W / S</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
};

