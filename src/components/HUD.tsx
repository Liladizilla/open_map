import React from 'react';
import { Compass, Wind, Navigation, MapPin, Search, AlertCircle, Save, Download, CheckCircle2, Loader2, Trophy, Target, Timer, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { Mission } from '../App';

interface HUDProps {
  lat: number;
  lng: number;
  speed: number;
  altitude: number;
  heading: number;
  discovery: {
    text: string;
    groundingChunks: any[];
    landmarks: any[];
    loading: boolean;
  } | null;
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
  return (
    <div className="fixed inset-0 pointer-events-none z-[1000] flex flex-col justify-between p-6">
      {/* Top Bar: Stats & Missions */}
      <div className="flex justify-between items-start">
        <div className="flex gap-4">
          <div className="cockpit-panel p-4 rounded-xl flex gap-8 pointer-events-auto">
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

          {/* Mission Status */}
          <div className="cockpit-panel p-4 rounded-xl pointer-events-auto w-64">
            <div className="flex items-center gap-2 mb-2">
              <Trophy size={14} className="text-yellow-500" />
              <span className="text-[10px] uppercase tracking-widest text-white/50">Active Mission</span>
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
                  <span className="text-[9px] text-white/40 uppercase tracking-tighter">
                    {activeMission.isCompleted ? 'Objective Complete' : activeMission.description}
                  </span>
                  {activeMission.isCompleted && <CheckCircle2 size={12} className="text-green-500" />}
                </div>
              </div>
            ) : (
              <div className="text-[10px] text-white/30 italic">No active mission</div>
            )}
          </div>
        </div>

        <div className="cockpit-panel p-4 rounded-xl pointer-events-auto flex flex-col items-end">
          <div className="flex items-center gap-2 mb-1">
            <Navigation size={14} className="text-blue-500" />
            <span className="text-[10px] uppercase tracking-widest text-white/50">Coordinates</span>
          </div>
          <div className="hud-text text-sm font-mono mb-4">
            {lat.toFixed(4)}N, {lng.toFixed(4)}E
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={onToggleFreeLook}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider transition-colors border ${
                isFreeLook 
                  ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' 
                  : 'bg-green-500/20 text-green-400 border-green-500/30'
              }`}
            >
              {isFreeLook ? <EyeOff size={12} /> : <Eye size={12} />}
              {isFreeLook ? 'Free Look' : 'Following'}
            </button>
            <button
              onClick={onSave}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] uppercase tracking-wider text-white/70 transition-colors border border-white/10"
            >
              <Save size={12} />
              Save
            </button>
            <button
              onClick={onLoad}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] uppercase tracking-wider text-white/70 transition-colors border border-white/10"
            >
              <Download size={12} />
              Load
            </button>
          </div>
          
          <AnimatePresence>
            {saveStatus !== 'idle' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-2 text-[10px] font-mono text-green-400 flex items-center gap-1"
              >
                {saveStatus === 'saving' && <Loader2 size={10} className="animate-spin" />}
                {saveStatus === 'saved' && <CheckCircle2 size={10} />}
                {saveStatus === 'loaded' && <CheckCircle2 size={10} />}
                {saveStatus.toUpperCase()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Center: Crosshair/Horizon (Visual only) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20">
        <div className="w-64 h-px bg-green-500 relative">
          <div className="absolute left-1/2 -top-2 w-px h-4 bg-green-500"></div>
        </div>
      </div>

      {/* Bottom: Discovery & Controls */}
      <div className="flex justify-between items-end">
        {/* Discovery Panel */}
        <div className="w-96 pointer-events-auto">
          <AnimatePresence mode="wait">
            {discovery && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="cockpit-panel p-6 rounded-2xl mb-4 max-h-[400px] overflow-y-auto custom-scrollbar"
              >
                <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
                  <MapPin size={18} className="text-red-500" />
                  <h3 className="text-white font-medium">Area Intelligence</h3>
                  {discovery.loading && (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      className="ml-auto"
                    >
                      <Search size={16} className="text-blue-400" />
                    </motion.div>
                  )}
                </div>

                {discovery.loading ? (
                  <div className="space-y-3">
                    <div className="h-4 bg-white/5 rounded w-3/4 animate-pulse"></div>
                    <div className="h-4 bg-white/5 rounded w-full animate-pulse"></div>
                    <div className="h-4 bg-white/5 rounded w-5/6 animate-pulse"></div>
                  </div>
                ) : (
                  <div className="text-sm text-white/80 leading-relaxed markdown-body prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>
                      {discovery.text.replace(/\[\[NAME: (.*?), LAT: ([-+]?\d*\.\d+|\d+), LNG: ([-+]?\d*\.\d+|\d+)\]\]/g, '')}
                    </ReactMarkdown>
                    
                    {discovery.groundingChunks.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <p className="text-[10px] uppercase tracking-widest text-white/40 mb-2">Sources</p>
                        <div className="flex flex-wrap gap-2">
                          {discovery.groundingChunks.map((chunk, idx) => (
                            chunk.maps?.uri && (
                              <a
                                key={idx}
                                href={chunk.maps.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-1 rounded hover:bg-blue-500/30 transition-colors flex items-center gap-1"
                              >
                                <Navigation size={10} />
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
            onClick={onScan}
            disabled={discovery?.loading}
            className="cockpit-panel px-6 py-3 rounded-xl text-white flex items-center gap-3 hover:bg-white/10 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
          >
            <Search size={20} className="text-blue-400" />
            <span className="font-medium tracking-wide">SCAN AREA</span>
          </button>
        </div>

        {/* Mission Selector & Controls Help */}
        <div className="flex flex-col gap-4 items-end">
          <div className="cockpit-panel p-4 rounded-xl pointer-events-auto w-64">
            <div className="flex items-center gap-2 mb-3">
              <Target size={14} className="text-blue-400" />
              <span className="text-[10px] uppercase tracking-widest text-white/50">Mission Log</span>
            </div>
            <div className="space-y-2">
              {missions.map(m => (
                <button
                  key={m.id}
                  onClick={() => onSelectMission(m.id)}
                  className={`w-full text-left p-2 rounded-lg transition-all border ${
                    activeMissionId === m.id 
                      ? 'bg-blue-500/10 border-blue-500/30' 
                      : 'bg-white/5 border-transparent hover:bg-white/10'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className={`text-[10px] font-medium ${m.isCompleted ? 'text-green-400' : 'text-white/80'}`}>
                      {m.title}
                    </span>
                    {m.isCompleted && <CheckCircle2 size={10} className="text-green-500" />}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="cockpit-panel p-4 rounded-xl text-[10px] text-white/40 uppercase tracking-widest flex flex-col gap-2 w-64">
            <div className="flex justify-between gap-8">
              <span>Thrust</span>
              <span className="text-white">W / S</span>
            </div>
            <div className="flex justify-between gap-8">
              <span>Steer</span>
              <span className="text-white">A / D</span>
            </div>
            <div className="flex justify-between gap-8">
              <span>Altitude</span>
              <span className="text-white">UP / DOWN</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
