import { MapDisplay } from './components/MapDisplay';
import { HUD } from './components/HUD';
import { useFlightSimulation } from './hooks/useFlightSimulation';

export default function App() {
  const {
    position,
    speed,
    altitude,
    heading,
    allLandmarks,
    missions,
    activeMissionId,
    discovery,
    isFreeLook,
    saveStatus,
    setActiveMissionId,
    setIsFreeLook,
    handleScan,
    saveProgress,
    loadProgress,
  } = useFlightSimulation();

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden select-none">
      <MapDisplay
        position={position}
        heading={heading}
        landmarks={allLandmarks}
        activeMission={missions.find((mission) => mission.id === activeMissionId)}
        isFreeLook={isFreeLook}
        onMapInteraction={() => setIsFreeLook(true)}
      />
      <HUD
        lat={position[0]}
        lng={position[1]}
        speed={speed}
        altitude={altitude}
        heading={heading}
        discovery={discovery}
        onScan={handleScan}
        onSave={saveProgress}
        onLoad={loadProgress}
        saveStatus={saveStatus}
        missions={missions}
        activeMissionId={activeMissionId}
        onSelectMission={setActiveMissionId}
        isFreeLook={isFreeLook}
        onToggleFreeLook={() => setIsFreeLook(!isFreeLook)}
      />

      <div className="fixed inset-0 pointer-events-none shadow-[inset_0_0_200px_rgba(0,0,0,0.8)] z-50" />
    </div>
  );
}
