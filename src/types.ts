export type MissionType = 'waypoint' | 'discovery' | 'time-trial';

export interface Mission {
  id: string;
  title: string;
  description: string;
  type: MissionType;
  targetPos?: [number, number];
  targetLandmark?: string;
  timeLimit?: number;
  startTime?: number;
  progress: number;
  isCompleted: boolean;
}

export interface Landmark {
  name: string;
  lat: number;
  lng: number;
  description?: string;
}

export type BriefingSource = 'cache' | 'gemini' | 'offline';

export interface LocationInfo {
  text: string;
  groundingChunks: unknown[];
  landmarks: Landmark[];
  source?: BriefingSource;
}

export interface DiscoveryState extends LocationInfo {
  loading: boolean;
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'loaded' | 'locating';
