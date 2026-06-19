import { useCallback, useEffect, useRef, useState } from 'react';
import { getNearbyLandmarks } from '../services/gemini';
import { haversineKm } from '../services/geospatial';
import { DEFAULT_MISSION_ID, INITIAL_ALTITUDE, INITIAL_POSITION, MISSIONS, SAVE_KEY } from '../constants';
import { DiscoveryState, Landmark, Mission, SaveStatus } from '../types';

interface FlightStateRef {
  lat: number;
  lng: number;
  speed: number;
  altitude: number;
  heading: number;
  keys: Record<string, boolean>;
  missionTimer: number;
}

export function useFlightSimulation() {
  const [position, setPosition] = useState<[number, number]>(INITIAL_POSITION);
  const [speed, setSpeed] = useState(0);
  const [altitude, setAltitude] = useState(INITIAL_ALTITUDE);
  const [heading, setHeading] = useState(0);
  const [allLandmarks, setAllLandmarks] = useState<Landmark[]>([]);
  const [missions, setMissions] = useState<Mission[]>(MISSIONS);
  const [activeMissionId, setActiveMissionId] = useState<string | null>(DEFAULT_MISSION_ID);
  const [discovery, setDiscovery] = useState<DiscoveryState | null>(null);
  const [isFreeLook, setIsFreeLook] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  const stateRef = useRef<FlightStateRef>({
    lat: INITIAL_POSITION[0],
    lng: INITIAL_POSITION[1],
    speed: 0,
    altitude: INITIAL_ALTITUDE,
    heading: 0,
    keys: {},
    missionTimer: 0,
  });
  const allLandmarksRef = useRef<Landmark[]>([]);
  const lastScanRef = useRef({ lat: INITIAL_POSITION[0], lng: INITIAL_POSITION[1], at: 0 });
  const scanTimeoutRef = useRef<number | null>(null);
  const scanAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    allLandmarksRef.current = allLandmarks;
  }, [allLandmarks]);

  const cancelPendingScan = useCallback(() => {
    if (scanTimeoutRef.current) {
      window.clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }

    if (scanAbortRef.current) {
      scanAbortRef.current.abort();
      scanAbortRef.current = null;
    }
  }, []);

  const handleScan = useCallback(async () => {
    const lat = stateRef.current.lat;
    const lng = stateRef.current.lng;
    const now = Date.now();

    const distance = haversineKm(lat, lng, lastScanRef.current.lat, lastScanRef.current.lng);
    const tooSoon = now - lastScanRef.current.at < 800;
    const tooClose = distance < 0.3;

    if (tooSoon && tooClose) {
      return;
    }

    cancelPendingScan();

    setDiscovery((prev) => ({
      text: prev?.text ?? '',
      groundingChunks: prev?.groundingChunks ?? [],
      landmarks: prev?.landmarks ?? [],
      loading: true,
    }));

    const controller = new AbortController();
    scanAbortRef.current = controller;

    try {
      const info = await getNearbyLandmarks(lat, lng, controller.signal);

      if (controller.signal.aborted) {
        return;
      }

      setDiscovery({ ...info, loading: false });
      lastScanRef.current = { lat, lng, at: Date.now() };

      if (info.landmarks.length > 0) {
        setAllLandmarks((prev) => {
          const existingNames = new Set(prev.map((item) => item.name));
          const newLandmarks = info.landmarks.filter((item) => !existingNames.has(item.name));
          return [...prev, ...newLandmarks];
        });
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setDiscovery((prev) => ({
          text: prev?.text ?? '',
          groundingChunks: prev?.groundingChunks ?? [],
          landmarks: prev?.landmarks ?? [],
          loading: false,
        }));
      }
    } finally {
      if (scanAbortRef.current === controller) {
        scanAbortRef.current = null;
      }
    }
  }, [cancelPendingScan]);

  const saveProgress = useCallback(() => {
    setSaveStatus('saving');

    const progress = {
      position: [stateRef.current.lat, stateRef.current.lng] as [number, number],
      speed: stateRef.current.speed,
      altitude: stateRef.current.altitude,
      heading: stateRef.current.heading,
      allLandmarks,
      missions,
      activeMissionId,
      discovery: discovery ? { ...discovery, loading: false } : null,
      timestamp: Date.now(),
    };

    localStorage.setItem(SAVE_KEY, JSON.stringify(progress));

    window.setTimeout(() => {
      setSaveStatus('saved');
      window.setTimeout(() => setSaveStatus('idle'), 2000);
    }, 500);
  }, [activeMissionId, allLandmarks, discovery, missions]);

  const loadProgress = useCallback(() => {
    const saved = localStorage.getItem(SAVE_KEY);

    if (!saved) {
      return;
    }

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
      setMissions(progress.missions || MISSIONS);
      setActiveMissionId(progress.activeMissionId || DEFAULT_MISSION_ID);

      setSaveStatus('loaded');
      window.setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to load progress', error);
    }
  }, []);

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      return;
    }

    setSaveStatus('locating');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        stateRef.current.lat = latitude;
        stateRef.current.lng = longitude;
        setPosition([latitude, longitude]);
        setSaveStatus('idle');
        cancelPendingScan();
        scanTimeoutRef.current = window.setTimeout(() => {
          void handleScan();
        }, 300);
      },
      (error) => {
        console.warn('Geolocation failed, staying in Paris:', error);
        setSaveStatus('idle');
      },
      { enableHighAccuracy: true },
    );

    return () => {
      cancelPendingScan();
    };
  }, [cancelPendingScan, handleScan]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      stateRef.current.keys[event.key.toLowerCase()] = true;
      stateRef.current.keys[event.code] = true;
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      stateRef.current.keys[event.key.toLowerCase()] = false;
      stateRef.current.keys[event.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    let lastTime = performance.now();
    let frameId = 0;

    const loop = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;
      const { keys } = stateRef.current;

      if (keys.w) {
        stateRef.current.speed = Math.min(stateRef.current.speed + 50 * dt, 500);
      }
      if (keys.s) {
        stateRef.current.speed = Math.max(stateRef.current.speed - 50 * dt, 0);
      }

      const turnSpeed = stateRef.current.speed > 50 ? 45 : 20;
      if (keys.a) {
        stateRef.current.heading = (stateRef.current.heading - turnSpeed * dt + 360) % 360;
      }
      if (keys.d) {
        stateRef.current.heading = (stateRef.current.heading + turnSpeed * dt) % 360;
      }

      if (keys.ArrowUp) {
        stateRef.current.altitude = Math.min(stateRef.current.altitude + 500 * dt, 40000);
      }
      if (keys.ArrowDown) {
        stateRef.current.altitude = Math.max(stateRef.current.altitude - 500 * dt, 0);
      }

      const speedFactor = 0.00005 * (stateRef.current.speed / 100);
      const rad = (stateRef.current.heading - 90) * (Math.PI / 180);
      stateRef.current.lat += Math.sin(rad) * speedFactor;
      stateRef.current.lng += Math.cos(rad) * speedFactor;

      setMissions((prev) =>
        prev.map((mission) => {
          if (mission.isCompleted) {
            return mission;
          }

          if (mission.type === 'waypoint' && mission.targetPos) {
            const dist = Math.sqrt(
              Math.pow(stateRef.current.lat - mission.targetPos[0], 2) +
                Math.pow(stateRef.current.lng - mission.targetPos[1], 2),
            );

            if (dist < 0.005) {
              return { ...mission, isCompleted: true, progress: 100 };
            }

            return {
              ...mission,
              progress: Math.max(0, Math.min(100, (1 - dist / 0.1) * 100)),
            };
          }

          if (mission.type === 'discovery') {
            const count = allLandmarksRef.current.length;
            if (count >= 3) {
              return { ...mission, isCompleted: true, progress: 100 };
            }
            return { ...mission, progress: (count / 3) * 100 };
          }

          if (mission.type === 'time-trial' && mission.timeLimit) {
            if (stateRef.current.speed > 400) {
              stateRef.current.missionTimer += dt;
              if (stateRef.current.missionTimer >= mission.timeLimit) {
                return { ...mission, isCompleted: true, progress: 100 };
              }
              return {
                ...mission,
                progress: (stateRef.current.missionTimer / mission.timeLimit) * 100,
              };
            }

            stateRef.current.missionTimer = 0;
            return { ...mission, progress: 0 };
          }

          return mission;
        }),
      );

      setPosition([stateRef.current.lat, stateRef.current.lng]);
      setSpeed(stateRef.current.speed);
      setAltitude(stateRef.current.altitude);
      setHeading(stateRef.current.heading);

      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, []);

  return {
    position,
    speed,
    altitude,
    heading,
    allLandmarks,
    missions,
    activeMissionId,
    discovery,
    isFreeLook,
    saveStatus,
    setActiveMissionId,
    setIsFreeLook,
    handleScan,
    saveProgress,
    loadProgress,
  };
}
