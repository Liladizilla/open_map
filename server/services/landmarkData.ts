import fs from 'fs';
import path from 'path';
import { Landmark } from '../../src/types';

const dataPath = path.join(process.cwd(), 'data', 'landmarks.json');

let landmarkDataCache: Landmark[] | null = null;

export function loadLandmarkData(): Landmark[] {
  if (landmarkDataCache) {
    return landmarkDataCache;
  }

  try {
    const raw = fs.readFileSync(dataPath, 'utf8');
    const parsed = JSON.parse(raw) as Landmark[];
    landmarkDataCache = parsed;
    return parsed;
  } catch (error) {
    console.warn('Unable to load data/landmarks.json, using empty fallback dataset.', error);
    landmarkDataCache = [];
    return [];
  }
}
