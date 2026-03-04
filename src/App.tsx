import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapDisplay } from './components/MapDisplay';
import { HUD } from './components/HUD';
import { getNearbyLandmarks, LocationInfo, Landmark } from './services/gemini';

export interface Mission {
  id: string;
  title: string;
  description: string;
  type: 'waypoint' | 'discovery' | 'time-trial';
  targetPos?: [number, number];
  targetLandmark?: string;
  timeLimit?: number;
  startTime?: number;
  progress: number;
  isCompleted: boolean;
}

const INITIAL_LAT = 48.8584; // Paris
const INITIAL_LNG = 2.2945;

const MISSIONS: Mission[] = [
  {
    id: 'm1',
    title: 'Paris Sightseeing',
    description: 'Fly to the Eiffel Tower coordinates.',
    type: 'waypoint',
    targetPos: [48.8584, 2.2945],
    progress: 0,
    isCompleted: false
  },
  {
    id: 'm2',
    title: 'The Great Discovery',
    description: 'Scan and discover 3 unique landmarks.',
    type: 'discovery',
    progress: 0,
    isCompleted: false
  },
  {
    id: 'm3',
    title: 'Supersonic Sprint',
    description: 'Maintain speed above 400 knots for 10 seconds.',
    type: 'time-trial',
    timeLimit: 10,
    progress: 0,
    isCompleted: false
  }
];

export default function App() {
  const [position, setPosition] = useState<[number, number]>([INITIAL_LAT, INITIAL_LNG]);
  const [speed, setSpeed] = useState(0);
  const [altitude, setAltitude] = useState(1000);
  const [heading, setHeading] = useState(0);
  const [allLandmarks, setAllLandmarks] = useState<Landmark[]>([]);
  const [missions, setMissions] = useState<Mission[]>(MISSIONS);
  const [activeMissionId, setActiveMissionId] = useState<string | null>(MISSIONS[0].id);
  const [discovery, setDiscovery] = useState<{ 
    text: string; 
    groundingChunks: any[]; 
    landmarks: Landmark[];
    loading: boolean 
  } | null>(null);
  const [isFreeLook, setIsFreeLook] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'loaded' | 'locating'>('idle');
  
  // Refs for game state to avoid closure issues in the loop
  const stateRef = useRef({
    lat: INITIAL_LAT,
    lng: INITIAL_LNG,
    speed: 0,
    altitude: 1000,
    heading: 0,
    keys: {} as Record<string, boolean>,
    missionTimer: 0,
  });

  // Geolocation support
  useEffect(() => {
    if ("geolocation" in navigator) {
      setSaveStatus('locating');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          stateRef.current.lat = latitude;
          stateRef.current.lng = longitude;
          setPosition([latitude, longitude]);
          setSaveStatus('idle');
          handleScan(); // Scan the new real-world location
        },
        (err) => {
          console.warn("Geolocation failed, staying in Paris:", err);
          setSaveStatus('idle');
        },
        { enableHighAccuracy: true }
      );
    }
  }, []);

  // Handle key presses
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      stateRef.current.keys[e.key.toLowerCase()] = true;
      stateRef.current.keys[e.code] = true; // Support Arrow keys
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      stateRef.current.keys[e.key.toLowerCase()] = false;
      stateRef.current.keys[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Game Loop
  useEffect(() => {
    let lastTime = performance.now();
    let frameId: number;

    const loop = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      const { keys } = stateRef.current;
      
      // Controls
      // Thrust (W/S)
      if (keys['w']) stateRef.current.speed = Math.min(stateRef.current.speed + 50 * dt, 500);
      if (keys['s']) stateRef.current.speed = Math.max(stateRef.current.speed - 50 * dt, 0);

      // Heading (A/D)
      const turnSpeed = stateRef.current.speed > 50 ? 45 : 20; // Turn faster at speed
      if (keys['a']) stateRef.current.heading = (stateRef.current.heading - turnSpeed * dt + 360) % 360;
      if (keys['d']) stateRef.current.heading = (stateRef.current.heading + turnSpeed * dt) % 360;

      // Altitude (ArrowUp/ArrowDown)
      if (keys['ArrowUp']) stateRef.current.altitude = Math.min(stateRef.current.altitude + 500 * dt, 40000);
      if (keys['ArrowDown']) stateRef.current.altitude = Math.max(stateRef.current.altitude - 500 * dt, 0);

      // Movement calculation
      // Adjust speed factor to be more realistic but playable
      // At 100 knots, we want to move noticeably.
      const speedFactor = 0.00005 * (stateRef.current.speed / 100);
      const rad = (stateRef.current.heading - 90) * (Math.PI / 180);
      
      stateRef.current.lat += Math.sin(rad) * speedFactor;
      stateRef.current.lng += Math.cos(rad) * speedFactor;

      // Mission Logic
      setMissions(prev => prev.map(m => {
        if (m.isCompleted) return m;

        if (m.type === 'waypoint' && m.targetPos) {
          const dist = Math.sqrt(
            Math.pow(stateRef.current.lat - m.targetPos[0], 2) + 
            Math.pow(stateRef.current.lng - m.targetPos[1], 2)
          );
          if (dist < 0.005) {
            return { ...m, isCompleted: true, progress: 100 };
          }
          return { ...m, progress: Math.max(0, Math.min(100, (1 - dist / 0.1) * 100)) };
        }

        if (m.type === 'discovery') {
          const count = allLandmarks.length;
          if (count >= 3) return { ...m, isCompleted: true, progress: 100 };
          return { ...m, progress: (count / 3) * 100 };
        }

        if (m.type === 'time-trial' && m.timeLimit) {
          if (stateRef.current.speed > 400) {
            stateRef.current.missionTimer += dt;
            if (stateRef.current.missionTimer >= m.timeLimit) {
              return { ...m, isCompleted: true, progress: 100 };
            }
            return { ...m, progress: (stateRef.current.missionTimer / m.timeLimit) * 100 };
          } else {
            stateRef.current.missionTimer = 0;
            return { ...m, progress: 0 };
          }
        }

        return m;
      }));

      // Update React state at a lower frequency for the map to avoid stuttering
      // but keep the HUD snappy
      setPosition([stateRef.current.lat, stateRef.current.lng]);
      setSpeed(stateRef.current.speed);
      setAltitude(stateRef.current.altitude);
      setHeading(stateRef.current.heading);

      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, []);

  const handleScan = useCallback(async () => {
    setDiscovery(prev => ({ 
      text: prev?.text || "", 
      groundingChunks: prev?.groundingChunks || [], 
      landmarks: prev?.landmarks || [],
      loading: true 
    }));
    const info = await getNearbyLandmarks(stateRef.current.lat, stateRef.current.lng);
    setDiscovery({ ...info, loading: false });
    
    // Add new unique landmarks to the global list
    if (info.landmarks.length > 0) {
      setAllLandmarks(prev => {
        const existingNames = new Set(prev.map(l => l.name));
        const newLandmarks = info.landmarks.filter(l => !existingNames.has(l.name));
        return [...prev, ...newLandmarks];
      });
    }
  }, []);

  const saveProgress = useCallback(() => {
    setSaveStatus('saving');
    const progress = {
      position: [stateRef.current.lat, stateRef.current.lng],
      speed: stateRef.current.speed,
      altitude: stateRef.current.altitude,
      heading: stateRef.current.heading,
      allLandmarks,
      discovery: discovery ? { ...discovery, loading: false } : null,
      timestamp: Date.now()
    };
    localStorage.setItem('sky_explorer_save', JSON.stringify(progress));
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 500);
  }, [allLandmarks, discovery]);

  const loadProgress = useCallback(() => {
    const saved = localStorage.getItem('sky_explorer_save');
    if (saved) {
      try {
        const progress = JSON.parse(saved);
        stateRef.current = {
          ...stateRef.current,
          lat: progress.position[0],
          lng: progress.position[1],
          speed: progress.speed,
          altitude: progress.altitude,
          heading: progress.heading,
        };
        setPosition(progress.position);
        setSpeed(progress.speed);
        setAltitude(progress.altitude);
        setHeading(progress.heading);
        setAllLandmarks(progress.allLandmarks || []);
        setDiscovery(progress.discovery || null);
        
        setSaveStatus('loaded');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (e) {
        console.error("Failed to load progress", e);
      }
    }
  }, []);

  // Initial Scan
  useEffect(() => {
    handleScan();
  }, []);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden select-none">
      <MapDisplay 
        position={position} 
        heading={heading} 
        landmarks={allLandmarks} 
        activeMission={missions.find(m => m.id === activeMissionId)}
        isFreeLook={isFreeLook}
        onMapInteraction={() => setIsFreeLook(true)}
      />
      <HUD 
        lat={position[0]} 
        lng={position[1]} 
        speed={speed} 
        altitude={altitude} 
        heading={heading}
        discovery={discovery}
        onScan={handleScan}
        onSave={saveProgress}
        onLoad={loadProgress}
        saveStatus={saveStatus}
        missions={missions}
        activeMissionId={activeMissionId}
        onSelectMission={setActiveMissionId}
        isFreeLook={isFreeLook}
        onToggleFreeLook={() => setIsFreeLook(!isFreeLook)}
      />
      
      {/* Vignette effect for cockpit feel */}
      <div className="fixed inset-0 pointer-events-none shadow-[inset_0_0_200px_rgba(0,0,0,0.8)] z-50"></div>
    </div>
  );
}
