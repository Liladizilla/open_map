import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { cacheService } from './server/services/cache';
import { haversineKm } from './server/services/haversine';
import { loadLandmarkData } from './server/services/landmarkData';
import { Landmark, LocationInfo } from './src/types';

dotenv.config();

function createOfflineResponse(
  lat: number,
  lng: number,
  hasKeyButFailed = false,
  isMissingKey = false,
): LocationInfo {
  const landmarks = loadLandmarkData();
  const sorted = landmarks
    .map((landmark) => ({
      ...landmark,
      dist: haversineKm(lat, lng, landmark.lat, landmark.lng),
    }))
    .sort((a, b) => a.dist - b.dist);

  const nearest = sorted.slice(0, 3);
  const offlineLandmarks: Landmark[] = [];

  nearest.forEach((item) => {
    if (item.dist < 200) {
      offlineLandmarks.push({
        name: item.name,
        lat: item.lat,
        lng: item.lng,
        description: item.description,
      });
    }
  });

  if (offlineLandmarks.length < 3) {
    const procedural = [
      {
        name: 'Navigator Beacon - Alpha',
        lat: Number((lat + 0.008).toFixed(4)),
        lng: Number((lng + 0.012).toFixed(4)),
        description: 'An operational flight navigation beacon guiding explorers through this radar sector.',
      },
      {
        name: 'Scenic Flight Waypoint - Bravo',
        lat: Number((lat - 0.012).toFixed(4)),
        lng: Number((lng - 0.008).toFixed(4)),
        description: 'A beautifully high-altitude flight checkpoint for regional airspace coordination.',
      },
    ];

    procedural.forEach((item) => offlineLandmarks.push(item));

    if (nearest.length > 0) {
      offlineLandmarks.push({
        name: `${nearest[0].name} (Horizon Peak)`,
        lat: nearest[0].lat,
        lng: nearest[0].lng,
        description: nearest[0].description,
      });
    }
  }

  let text = '';
  if (isMissingKey) {
    text += `⚠️ **Notice: Running in Offline Local Simulator Mode.**\nGemini API key was not found. Configure your \`GEMINI_API_KEY\` inside the settings menu for real-time live-world Google Maps scanning!\n\n---\n\n`;
  } else if (hasKeyButFailed) {
    text += `📡 **Notice: Running in Network Offline Fallback.**\nLive-world scanning limit or API rate limits were temporarily exceeded. Ground sensors successfully switched to high-accuracy offline flight plans.\n\n---\n\n`;
  }

  text += `## Area Airspace Intelligence Briefing\n\nWelcome back, Captain. Sensors have finished mapping the sector coordinate airspace at **LAT: ${lat.toFixed(4)}, LNG: ${lng.toFixed(4)}**. Three nearby landmarks and aerial navigation points have been resolved:\n\n`;

  offlineLandmarks.forEach((landmark, index) => {
    text += `### ${index + 1}. ${landmark.name}\n`;
    text += `${landmark.description}\n`;
    text += `[[NAME: ${landmark.name}, LAT: ${landmark.lat.toFixed(4)}, LNG: ${landmark.lng.toFixed(4)}]]\n\n`;
  });

  text += '*Telemetry operational. Local flight computer is running stable coordinate trackers.*';

  return {
    text,
    groundingChunks: [],
    landmarks: offlineLandmarks.map(({ name, lat, lng }) => ({ name, lat, lng })),
    source: 'offline' as const,
  };
}

function parseLandmarks(text: string): Landmark[] {
  const landmarks: Landmark[] = [];
  const regex = /\[\[NAME: (.*?), LAT: ([-+]?\d*\.\d+|\d+), LNG: ([-+]?\d*\.\d+|\d+)\]\]/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    landmarks.push({
      name: match[1],
      lat: Number(match[2]),
      lng: Number(match[3]),
    });
  }

  return landmarks;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(
    '/api/landmarks',
    rateLimit({
      windowMs: 60 * 1000,
      max: 30,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  const apiKey = process.env.GEMINI_API_KEY || '';
  const ai = apiKey
    ? new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      })
    : null;

  app.post('/api/landmarks', async (req, res) => {
    const { lat, lng } = req.body;

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({ error: 'Invalid coordinates provided' });
    }

    const cached = cacheService.getByLocation(lat, lng);
    if (cached) {
      return res.json({
        text: cached.text,
        groundingChunks: cached.groundingChunks,
        landmarks: cached.landmarks,
        source: cached.source,
      });
    }

    if (!apiKey || !ai) {
      const offlineResponse = createOfflineResponse(lat, lng, false, true);
      cacheService.set(lat, lng, offlineResponse, 'offline');
      return res.json({
        ...offlineResponse,
        source: 'offline',
      });
    }

    try {
      const response = await Promise.allSettled([
        ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: `I am flying a plane at coordinates ${lat}, ${lng}. What are the most interesting landmarks or places nearby? Provide a brief description and mention their names. For each major landmark you mention, please also include its coordinates in this exact format at the end of its description: [[NAME: Landmark Name, LAT: 0.0000, LNG: 0.0000]].`,
          config: {
            tools: [{ googleMaps: {} }],
            toolConfig: {
              retrievalConfig: {
                latLng: {
                  latitude: lat,
                  longitude: lng,
                },
              },
            },
          },
        }),
        ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: `I am flying a plane at coordinates ${lat}, ${lng}. Based on your general knowledge of this geographic location, what are the most interesting landmarks or places nearby? Provide a brief description and mention their names. For each major landmark you mention, please also include its coordinates in this exact format at the end of its description: [[NAME: Landmark name, LAT: 0.0000, LNG: 0.0000]].`,
        }),
      ]);

      const [groundedResult, fallbackResult] = response;
      const groundedText = groundedResult.status === 'fulfilled' ? groundedResult.value.text || '' : '';
      const fallbackText = fallbackResult.status === 'fulfilled' ? fallbackResult.value.text || '' : '';
      const groundedChunks =
        groundedResult.status === 'fulfilled'
          ? groundedResult.value.candidates?.[0]?.groundingMetadata?.groundingChunks || []
          : [];

      const selected =
        groundedText && parseLandmarks(groundedText).length > 0
          ? {
              text: groundedText,
              groundingChunks: groundedChunks,
              landmarks: parseLandmarks(groundedText),
            }
          : fallbackText && parseLandmarks(fallbackText).length > 0
            ? {
                text: fallbackText,
                groundingChunks: [],
                landmarks: parseLandmarks(fallbackText),
              }
            : null;

      if (selected) {
        cacheService.set(lat, lng, selected, 'gemini');
        return res.json({
          ...selected,
          source: 'gemini',
        });
      }

      const offlineResponse = createOfflineResponse(lat, lng, true, false);
      cacheService.set(lat, lng, offlineResponse, 'offline');
      return res.json({
        ...offlineResponse,
        source: 'offline',
      });
    } catch (error) {
      console.warn('Gemini request failed. Using offline fallback.', error);
      const offlineResponse = createOfflineResponse(lat, lng, true, false);
      cacheService.set(lat, lng, offlineResponse, 'offline');
      return res.json({
        ...offlineResponse,
        source: 'offline',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
