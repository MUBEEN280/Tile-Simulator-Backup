import React, { useRef } from "react";
import { useTileSimulator } from "../context/TileSimulatorContext";
import TileSelector from "./TileSelector";
import TileCanvasView from "./TileCanvasView";


const TileSimulator = () => {
  const {
    selectedTile,
    setSelectedTile,
    selectedColor,
    setSelectedColor,
    selectedSize,
    setSelectedSize,
    selectedEnvironment,
    setSelectedEnvironment,
    groutColor,
    setGroutColor,
    groutThickness,
    setGroutThickness,
    tileMasks,
    setTileMaskColor,
    borderMasks,
    selectedBorder,
  } = useTileSimulator();
  return (
    <div className="min-h-screen  max-w-9xl p-3 lg:p-0 m-auto grid grid-cols-1 lg:grid-cols-[0.8fr_2.2fr] gap-0">
      {/* Tile Selection */}
      <div
        className="flex flex-col bg-gray-50 p-2"
      >
        <div className="py-4">
        </div>
        <div className="overflow-hidden">
          <TileSelector onSelectTile={setSelectedTile} />
        </div>
      </div>

      {/* View */}
      <div
        className="flex flex-col"
      >
        <div className="py-4">
        </div>
        <div className="mb-4 overflow-hidden">
          <TileCanvasView
            selectedTile={selectedTile}
            selectedColor={selectedColor}
            selectedSize={selectedSize}
            selectedEnvironment={selectedEnvironment}
            groutColor={groutColor}
            groutThickness={groutThickness}
            tileMasks={tileMasks}
            borderMasks={borderMasks}
            selectedBorder={selectedBorder}
          />
        </div>
      </div>
    </div>
  );
};

export default TileSimulator;
