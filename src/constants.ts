import { Mission } from './types';

export const INITIAL_POSITION: [number, number] = [48.8584, 2.2945];
export const INITIAL_ALTITUDE = 1000;
export const DEFAULT_MISSION_ID = 'm1';
export const SAVE_KEY = 'sky_explorer_save';

export const MISSIONS: Mission[] = [
  {
    id: 'm1',
    title: 'Paris Sightseeing',
    description: 'Fly to the Eiffel Tower coordinates.',
    type: 'waypoint',
    targetPos: [48.8584, 2.2945],
    progress: 0,
    isCompleted: false,
  },
  {
    id: 'm2',
    title: 'The Great Discovery',
    description: 'Scan and discover 3 unique landmarks.',
    type: 'discovery',
    progress: 0,
    isCompleted: false,
  },
  {
    id: 'm3',
    title: 'Supersonic Sprint',
    description: 'Maintain speed above 400 knots for 10 seconds.',
    type: 'time-trial',
    timeLimit: 10,
    progress: 0,
    isCompleted: false,
  },
];
