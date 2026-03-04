import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface Landmark {
  name: string;
  lat: number;
  lng: number;
}

export interface LocationInfo {
  text: string;
  groundingChunks: any[];
  landmarks: Landmark[];
}

export async function getNearbyLandmarks(lat: number, lng: number): Promise<LocationInfo> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
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
    
    // Parse landmarks from text
    const landmarks: Landmark[] = [];
    const regex = /\[\[NAME: (.*?), LAT: ([-+]?\d*\.\d+|\d+), LNG: ([-+]?\d*\.\d+|\d+)\]\]/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      landmarks.push({
        name: match[1],
        lat: parseFloat(match[2]),
        lng: parseFloat(match[3])
      });
    }

    return {
      text,
      groundingChunks,
      landmarks
    };
  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      text: "Error fetching location data. Check your connection or API key.",
      groundingChunks: [],
      landmarks: []
    };
  }
}
