import { LocationInfo } from '../types';

export async function getNearbyLandmarks(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<LocationInfo> {
  try {
    const response = await fetch('/api/landmarks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ lat, lng }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    return (await response.json()) as LocationInfo;
  } catch (error) {
    if (signal?.aborted) {
      return {
        text: '',
        groundingChunks: [],
        landmarks: [],
      };
    }

    console.error('Error calling backend landmarks API:', error);
    return {
      text: 'Error fetching location data. Make sure the backend server is running and the API key is configured.',
      groundingChunks: [],
      landmarks: [],
    };
  }
}

