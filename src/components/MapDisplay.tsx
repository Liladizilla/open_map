import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Plane } from './Plane';
import { renderToStaticMarkup } from 'react-dom/server';

import { MapPin, Target } from 'lucide-react';
import { Landmark } from '../services/gemini';
import { Mission } from '../App';

interface MapDisplayProps {
  position: [number, number];
  heading: number;
  landmarks: Landmark[];
  activeMission?: Mission;
  isFreeLook: boolean;
  onMapInteraction: () => void;
}

// Custom Leaflet icon for the plane
const createPlaneIcon = (heading: number) => {
  const iconMarkup = renderToStaticMarkup(<Plane heading={heading} />);
  return L.divIcon({
    html: iconMarkup,
    className: 'plane-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

// Custom icon for landmarks
const createLandmarkIcon = () => {
  const iconMarkup = renderToStaticMarkup(
    <div className="text-red-500 drop-shadow-[0_0_4px_rgba(239,68,68,0.8)]">
      <MapPin size={24} fill="currentColor" fillOpacity={0.3} />
    </div>
  );
  return L.divIcon({
    html: iconMarkup,
    className: 'landmark-marker',
    iconSize: [24, 24],
    iconAnchor: [12, 24],
  });
};

// Custom icon for mission waypoints
const createMissionIcon = () => {
  const iconMarkup = renderToStaticMarkup(
    <div className="text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)] animate-pulse">
      <Target size={32} />
    </div>
  );
  return L.divIcon({
    html: iconMarkup,
    className: 'mission-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

// Component to handle map view updates
const MapUpdater: React.FC<{ position: [number, number]; isFreeLook: boolean; onMapInteraction: () => void }> = ({ position, isFreeLook, onMapInteraction }) => {
  const map = useMap();
  
  useEffect(() => {
    const handleInteraction = () => {
      onMapInteraction();
    };

    map.on('dragstart', handleInteraction);
    map.on('zoomstart', handleInteraction);

    return () => {
      map.off('dragstart', handleInteraction);
      map.off('zoomstart', handleInteraction);
    };
  }, [map, onMapInteraction]);

  useEffect(() => {
    if (!isFreeLook) {
      // Use panTo with no animation for high-frequency updates to prevent stuttering
      map.panTo(position, { animate: false });
    }
  }, [position, map, isFreeLook]);
  return null;
};

export const MapDisplay: React.FC<MapDisplayProps> = ({ position, heading, landmarks, activeMission, isFreeLook, onMapInteraction }) => {
  return (
    <MapContainer
      center={position}
      zoom={13}
      scrollWheelZoom={true}
      zoomControl={true}
      dragging={true}
      touchZoom={true}
      doubleClickZoom={true}
      className="z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={position} icon={createPlaneIcon(heading)} />
      
      {landmarks.map((landmark, idx) => (
        <Marker 
          key={`${landmark.name}-${idx}`} 
          position={[landmark.lat, landmark.lng]} 
          icon={createLandmarkIcon()}
        >
          <Popup>
            <div className="font-bold">{landmark.name}</div>
          </Popup>
        </Marker>
      ))}

      {activeMission?.type === 'waypoint' && activeMission.targetPos && !activeMission.isCompleted && (
        <Marker position={activeMission.targetPos} icon={createMissionIcon()}>
          <Popup>
            <div className="font-bold">Objective: {activeMission.title}</div>
          </Popup>
        </Marker>
      )}

      <MapUpdater position={position} isFreeLook={isFreeLook} onMapInteraction={onMapInteraction} />
    </MapContainer>
  );
};
