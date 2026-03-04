import React from 'react';
import { Plane as PlaneIcon } from 'lucide-react';

interface PlaneProps {
  heading: number;
}

export const Plane: React.FC<PlaneProps> = ({ heading }) => {
  return (
    <div 
      style={{ transform: `rotate(${heading}deg)` }}
      className="transition-transform duration-300 ease-out"
    >
      <PlaneIcon size={32} className="text-white fill-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
    </div>
  );
};
