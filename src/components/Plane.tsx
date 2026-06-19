import React, { useEffect, useRef } from 'react';
import { Plane as PlaneIcon } from 'lucide-react';

interface PlaneProps {
  heading: number;
}

export const Plane: React.FC<PlaneProps> = ({ heading }) => {
  const planeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (planeRef.current) {
      planeRef.current.style.transform = `rotate(${heading}deg)`;
    }
  }, [heading]);

  return (
    <div
      ref={planeRef}
      className="plane-rotation transition-transform duration-300 ease-out"
    >
      <PlaneIcon size={32} className="text-white fill-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
    </div>
  );
};
