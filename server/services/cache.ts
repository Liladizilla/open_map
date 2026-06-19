import Database from 'better-sqlite3';
import path from 'path';
import { Landmark, LocationInfo } from '../../src/types';

export interface CachedBriefing {
  id: string;
  lat: number;
  lng: number;
  geohash: string;
  text: string;
  landmarks: Landmark[];
  groundingChunks: unknown[];
  createdAt: number;
  expiresAt: number;
  source: 'gemini' | 'offline';
}

const DB_PATH = path.join(process.cwd(), 'data', 'open_map.db');
const TTL_MS = 1000 * 60 * 30;
const CACHE_PRECISION = 5;

function encodeGeohash(lat: number, lng: number, precision = CACHE_PRECISION): string {
  const base32 = '0123456789bcdefghjkmnpqrstuvwxyz';
  let latMin = -90;
  let latMax = 90;
  let lngMin = -180;
  let lngMax = 180;
  let hash = '';
  let isEven = true;
  let bit = 0;
  let ch = 0;

  while (hash.length < precision) {
    if (isEven) {
      const mid = (lngMin + lngMax) / 2;
      if (lng > mid) {
        ch |= 1 << (4 - bit);
        lngMin = mid;
      } else {
        lngMax = mid;
      }
    } else {
      const mid = (latMin + latMax) / 2;
      if (lat > mid) {
        ch |= 1 << (4 - bit);
        latMin = mid;
      } else {
        latMax = mid;
      }
    }

    isEven = !isEven;
    bit += 1;

    if (bit === 5) {
      hash += base32[ch];
      bit = 0;
      ch = 0;
    }
  }

  return hash;
}

class CacheService {
  private db: Database.Database;

  constructor() {
    this.db = new Database(DB_PATH);
    this.db.pragma('journal_mode = WAL');
    this.init();
  }

  private init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS briefing_cache (
        id TEXT PRIMARY KEY,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        geohash TEXT NOT NULL,
        text TEXT NOT NULL,
        landmarks TEXT NOT NULL,
        grounding_chunks TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        source TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_briefing_cache_geohash ON briefing_cache(geohash);
      CREATE INDEX IF NOT EXISTS idx_briefing_cache_expires_at ON briefing_cache(expires_at);
    `);
  }

  getKey(lat: number, lng: number) {
    return `${lat.toFixed(4)},${lng.toFixed(4)}`;
  }

  getGeohash(lat: number, lng: number) {
    return encodeGeohash(lat, lng);
  }

  getByLocation(lat: number, lng: number): CachedBriefing | null {
    const geohash = this.getGeohash(lat, lng);
    const row = this.db
      .prepare(`
        SELECT id, lat, lng, geohash, text, landmarks, grounding_chunks, created_at, expires_at, source
        FROM briefing_cache
        WHERE geohash = ? AND expires_at > ?
        ORDER BY created_at DESC
        LIMIT 1
      `)
      .get(geohash, Date.now()) as
      | {
          id: string;
          lat: number;
          lng: number;
          geohash: string;
          text: string;
          landmarks: string;
          grounding_chunks: string;
          created_at: number;
          expires_at: number;
          source: 'gemini' | 'offline';
        }
      | undefined;

    if (!row) {
      return null;
    }

    return {
      ...row,
      landmarks: JSON.parse(row.landmarks),
      groundingChunks: JSON.parse(row.grounding_chunks),
      createdAt: row.created_at,
      expiresAt: row.expires_at,
    };
  }

  set(
    lat: number,
    lng: number,
    info: LocationInfo,
    source: 'gemini' | 'offline',
  ) {
    const geohash = this.getGeohash(lat, lng);
    const now = Date.now();
    const payload: CachedBriefing = {
      id: `${geohash}:${now}`,
      lat,
      lng,
      geohash,
      text: info.text,
      landmarks: info.landmarks,
      groundingChunks: info.groundingChunks,
      createdAt: now,
      expiresAt: now + TTL_MS,
      source,
    };

    this.db.prepare(`
      INSERT OR REPLACE INTO briefing_cache (
        id, lat, lng, geohash, text, landmarks, grounding_chunks, created_at, expires_at, source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      payload.id,
      payload.lat,
      payload.lng,
      payload.geohash,
      payload.text,
      JSON.stringify(payload.landmarks),
      JSON.stringify(payload.groundingChunks),
      payload.createdAt,
      payload.expiresAt,
      payload.source,
    );
  }

  sweepExpired() {
    this.db.prepare(`DELETE FROM briefing_cache WHERE expires_at <= ?`).run(Date.now());
  }
}

export const cacheService = new CacheService();
export const CACHE_TTL_MS = TTL_MS;
export const CACHE_PRECISION_VALUE = CACHE_PRECISION;
