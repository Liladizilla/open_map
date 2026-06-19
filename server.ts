import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

interface OfflineLandmark {
  name: string;
  lat: number;
  lng: number;
  description: string;
}

const OFFLINE_LANDMARKS: OfflineLandmark[] = [
  // Paris
  { name: "Eiffel Tower", lat: 48.8584, lng: 2.2945, description: "A famous 19th-century wrought-iron lattice tower on the Champ de Mars, standing 330 meters tall. Designed by Gustave Eiffel, it has become a global cultural icon of France." },
  { name: "Louvre Museum", lat: 48.8606, lng: 2.3376, description: "The world's largest art museum and a historic monument in Paris. It houses iconic masterpieces, including the Mona Lisa and the Venus de Milo." },
  { name: "Arc de Triomphe", lat: 48.8738, lng: 2.2950, description: "One of the most famous monuments in Paris, standing at the western end of the Champs-Élysées. It honors those who fought and died for France in the French Revolutionary and Napoleonic Wars." },
  { name: "Notre-Dame Cathedral", lat: 48.8530, lng: 2.3499, description: "A historic medieval Catholic cathedral located on the Île de la Cité in Paris, renowned for its French Gothic architecture, spectacular stained glass, and gargoyles." },

  // London
  { name: "Big Ben", lat: 51.5007, lng: -0.1246, description: "The iconic clock tower at the north end of the Palace of Westminster in London. Elizabeth Tower, commonly called Big Ben, is a symbol of the UK's heritage." },
  { name: "Tower Bridge", lat: 51.5055, lng: -0.0754, description: "A combined bascule and suspension bridge in London, built between 1886 and 1894 over the River Thames. Known for its twin Victorian Gothic towers." },
  { name: "London Eye", lat: 51.5033, lng: -0.1195, description: "A giant cantilevered observation wheel on the South Bank of the River Thames. It is Europe's tallest cantilevered observation wheel, offering stunning panoramic views of London." },

  // New York
  { name: "Statue of Liberty", lat: 40.6892, lng: -74.0445, description: "A colossal neoclassical copper sculpture on Liberty Island in New York Harbor. A gift from France, it stands as a universal symbol of freedom and democracy." },
  { name: "Empire State Building", lat: 40.7484, lng: -73.9857, description: "A legendary 102-story Art Deco skyscraper in Midtown Manhattan, New York City. It was the world's tallest building for nearly 40 years." },
  { name: "Times Square", lat: 40.7580, lng: -73.9855, description: "Often referred to as the 'Crossroads of the World', this brightly adorned, bustling commercial intersection in Midtown Manhattan is famous for its digital billboard displays." },

  // San Francisco
  { name: "Golden Gate Bridge", lat: 37.8199, lng: -122.4783, description: "An internationally recognized suspension bridge spanning the Golden Gate, the strait connecting San Francisco Bay and the Pacific Ocean. Famous for its International Orange color." },
  { name: "Alcatraz Island", lat: 37.8270, lng: -122.4230, description: "A rugged island in San Francisco Bay. Originally a military fortification and lighthouse, it became a notorious federal prison housing high-profile convicts." },

  // Tokyo
  { name: "Tokyo Tower", lat: 35.6586, lng: 139.7454, description: "A vibrant red and white Eiffel-inspired communications and observation tower in the Shiba-koen district of Minato, Tokyo. It is Japan's second-tallest structure." },
  { name: "Mount Fuji", lat: 35.3606, lng: 138.7274, description: "An active, elegant stratovolcano located 100km southwest of Tokyo. As the tallest peak in Japan, it is treated as a sacred spot and a source of artistic inspiration." },
  { name: "Shibuya Crossing", lat: 35.6595, lng: 139.7006, description: "A legendary scramble crossing in front of the Shibuya Station. It is celebrated as the world's busiest pedestrian crossing, with thousands crossing simultaneously." },

  // Sydney
  { name: "Sydney Opera House", lat: -33.8568, lng: 151.2153, description: "A multi-venue performing arts centre in Sydney, Australia. Conceptualized as sail-like shells, it is widely regarded as an architectural masterpiece of the 20th century." },
  { name: "Sydney Harbour Bridge", lat: -33.8523, lng: 151.2108, description: "The iconic steel arch bridge across Sydney Harbour, carrying rail, vehicular, bicycle, and pedestrian traffic. Nicknamed 'The Coathanger' by locals." },

  // Rome
  { name: "Colosseum", lat: 41.8902, lng: 12.4922, description: "A breathtaking oval amphitheatre in the heart of Rome, Italy. Completed in AD 80, it was used for gladiatorial contests, dramas, and public spectacles." },
  { name: "St. Peter's Basilica", lat: 41.9022, lng: 12.4539, description: "An Italian Renaissance church in Vatican City. It has the largest interior of any Christian church in the world and is a major site of pilgrimage." },

  // Egypt
  { name: "Great Pyramid of Giza", lat: 29.9792, lng: 31.1342, description: "The oldest and only remaining wonder of the Seven Wonders of the Ancient World. Built as a tomb for the Fourth Dynasty Pharaoh Khufu." },

  // Rio
  { name: "Christ the Redeemer", lat: -22.9519, lng: -43.2105, description: "An imposing 30-meter-tall Art Deco statue of Jesus Christ overlooking Rio de Janeiro, Brazil, from the peak of the 700-meter Corcovado Mountain." },

  // Athens
  { name: "Acropolis of Athens", lat: 37.9715, lng: 23.7257, description: "An ancient citadel located on a high rocky outcrop above Athens, Greece. It contains the ruins of the Parthenon, reflecting classical Greek architecture." },

  // India
  { name: "Taj Mahal", lat: 27.1751, lng: 78.0421, description: "An ivory-white marble mausoleum on the south bank of the Yamuna River in Agra, India. It was commissioned in 1632 by the Mughal emperor Shah Jahan to house his favorite wife's tomb." }
];

function getOfflineResponse(lat: number, lng: number, hasKeyButFailed: boolean = false, isMissingKey: boolean = false) {
  // Sort OFFLINE_LANDMARKS by distance to current flying position
  const sorted = OFFLINE_LANDMARKS.map(l => {
    const dist = Math.sqrt(Math.pow(l.lat - lat, 2) + Math.pow(l.lng - lng, 2));
    return { ...l, dist };
  }).sort((a, b) => a.dist - b.dist);

  const nearest = sorted.slice(0, 3);
  const landmarksToReturn: any[] = [];
  
  // Add nearest global landmarks if they are relatively close
  nearest.forEach(n => {
    if (n.dist < 2.0) { // within ~200km range to keep it grounded
      landmarksToReturn.push({
        name: n.name,
        lat: n.lat,
        lng: n.lng,
        description: n.description
      });
    }
  });

  // If we don't have enough local landmarks, generate beautiful, interactive local waypoints
  // around the current lat/lng so the player can always discover, scan list, and complete missions!
  if (landmarksToReturn.length < 3) {
    const latOffset1 = 0.008;
    const lngOffset1 = 0.012;
    const latOffset2 = -0.012;
    const lngOffset2 = -0.008;
    
    landmarksToReturn.push({
      name: `Navigator Beacon - Alpha`,
      lat: Number((lat + latOffset1).toFixed(4)),
      lng: Number((lng + lngOffset1).toFixed(4)),
      description: `An operational flight navigation beacon guiding explorers through this radar sector. Excellent coordinate marker for speed and precision flight trials.`
    });
    
    landmarksToReturn.push({
      name: `Scenic Flight Waypoint - Bravo`,
      lat: Number((lat + latOffset2).toFixed(4)),
      lng: Number((lng + lngOffset2).toFixed(4)),
      description: `A beautifully high-altitude flight checkpoint. Scanning this waypoint confirms secure passage through regional airspace coordinates.`
    });

    // Append the closest global landmark as a far horizon peak
    if (nearest.length > 0) {
      landmarksToReturn.push({
        name: `${nearest[0].name} (Horizon Peak)`,
        lat: nearest[0].lat,
        lng: nearest[0].lng,
        description: `Visible on long-distance flight maps. ${nearest[0].description}`
      });
    }
  }

  // Format the text perfectly
  let text = "";
  if (isMissingKey) {
    text += `⚠️ **Notice: Running in Offline Local Simulator Mode.**\nGemini API key was not found. Configure your \`GEMINI_API_KEY\` inside the settings menu for real-time live-world Google Maps scanning!\n\n---\n\n`;
  } else if (hasKeyButFailed) {
    text += `📡 **Notice: Running in Network Offline Fallback.**\nLive-world scanning limit or API rate limits were temporarily exceeded. Ground sensors successfully switched to high-accuracy offline flight plans.\n\n---\n\n`;
  }

  text += `## Area Airspace Intelligence Briefing\n\nWelcome back, Captain. Sensors have finished mapping the sector coordinate airspace at **LAT: ${lat.toFixed(4)}, LNG: ${lng.toFixed(4)}**. Three nearby landmarks and aerial navigation points have been resolved:\n\n`;
  
  landmarksToReturn.forEach((landmark, index) => {
    text += `### ${index + 1}. ${landmark.name}\n`;
    text += `${landmark.description}\n`;
    text += `[[NAME: ${landmark.name}, LAT: ${landmark.lat.toFixed(4)}, LNG: ${landmark.lng.toFixed(4)}]]\n\n`;
  });

  text += `*Telemetry operational. Local flight computer is running stable coordinates trackers.*`;

  return {
    text,
    groundingChunks: [],
    landmarks: landmarksToReturn.map(l => ({ name: l.name, lat: l.lat, lng: l.lng }))
  };
}

function parseLandmarks(text: string) {
  const landmarks: any[] = [];
  const regex = /\[\[NAME: (.*?), LAT: ([-+]?\d*\.\d+|\d+), LNG: ([-+]?\d*\.\d+|\d+)\]\]/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    landmarks.push({
      name: match[1],
      lat: parseFloat(match[2]),
      lng: parseFloat(match[3])
    });
  }
  return landmarks;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const apiKey = process.env.GEMINI_API_KEY || "";
  const ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // API Route FIRST
  app.post("/api/landmarks", async (req, res) => {
    const { lat, lng } = req.body;
    
    if (typeof lat !== "number" || typeof lng !== "number") {
      return res.status(400).json({ error: "Invalid coordinates provided" });
    }

    if (!apiKey) {
      console.log("No API key configured. Utilizing local high-altitude offline database fallback.");
      const offlineResponse = getOfflineResponse(lat, lng, false, true);
      return res.json(offlineResponse);
    }

    try {
      // Try with Google Maps grounding first
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `I am flying a plane at coordinates ${lat}, ${lng}. What are the most interesting landmarks or places nearby? 
        Provide a brief description and mention their names. 
        For each major landmark you mention, please also include its coordinates in this exact format at the end of its description: [[NAME: Landmark Name, LAT: 0.0000, LNG: 0.0000]].`,
        config: {
          tools: [{ googleMaps: {} }],
          toolConfig: {
            retrievalConfig: {
              latLng: {
                latitude: lat,
                longitude: lng
              }
            }
          }
        },
      });

      const text = response.text || "No information available for this area.";
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const landmarks = parseLandmarks(text);

      return res.json({
        text,
        groundingChunks,
        landmarks
      });

    } catch (error: any) {
      console.warn("Attempting tool-based grounding failed, using fallback:", error);
      
      // Fallback: request without googleMaps tool since we might have 403 PERMISSION_DENIED or other limitations
      try {
        const fallbackResponse = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: `I am flying a plane at coordinates ${lat}, ${lng}. Based on your general knowledge of this geographic location, what are the most interesting landmarks or places nearby?
          Provide a brief description and mention their names. 
          For each major landmark you mention, please also include its coordinates in this exact format at the end of its description: [[NAME: Landmark name, LAT: 0.0000, LNG: 0.0000]].`,
        });

        const text = fallbackResponse.text || "No landmarks discovered near these coordinates.";
        const landmarks = parseLandmarks(text);

        return res.json({
          text,
          groundingChunks: [],
          landmarks
        });
      } catch (fallbackError: any) {
        console.error("Gemini Fallback also failed (429/503 quota levels). Utilizing local high-altitude offline database fallback.");
        const offlineResponse = getOfflineResponse(lat, lng, true, false);
        return res.json(offlineResponse);
      }
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
