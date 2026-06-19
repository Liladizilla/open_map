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
    const response = await fetch("/api/landmarks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ lat, lng })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error calling backend landmarks API:", error);
    return {
      text: "Error fetching location data. Make sure the backend server is running and the API key is configured.",
      groundingChunks: [],
      landmarks: []
    };
  }
}

