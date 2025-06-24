import React, { useEffect, useState, useRef } from "react";
import { IoMdClose } from "react-icons/io";
import SaveButton from "./buttons/SaveButton";
import ShopButton from "./buttons/ShopButton";
import TileModal from "./TileModals";
import { useTileSimulator } from "../context/TileSimulatorContext";

const environments = [
  { icon: null, label: "bedroom", image: "/Images/bedroomjpg.png" },
  { icon: null, label: "dining", image: "/Images/livingjpg.png" },
  { icon: null, label: "kitchen", image: "/Images/kitchen.png" },
  { icon: null, label: "bathroom", image: "/Images/env/bathroom.png" },
  { icon: null, label: "store", image: "/Images/commercial_old.png" },
]; 

const thicknessToPx = {
  none: "0px",
  thin: "2px",
  thick: "6px",
};

const TileCanvasView = () => {
  const {
    selectedTile,
    selectedColor,
    selectedSize,
    selectedEnvironment,
    setSelectedEnvironment,
    groutColor,
    groutThickness,
    borderMasks,
    selectedBorder,
    rotateBlock,
    selectedMaskId,
    selectedBorderMaskId,
    previewMode,
    hoveredPaletteColor,
  } = useTileSimulator();

  const [blockRotations, setBlockRotations] = useState([0, 0, 0, 0]);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const tilePreviewRef = useRef(null);
  const pdfTilePreviewRef = useRef(null);

  const currentEnv = selectedEnvironment ? environments.find(
    (env) => env.label === selectedEnvironment
  ) : null;

  const gridSize = selectedSize === "8x8" ? 8 : 12;
  const totalTiles = gridSize * gridSize;

  const containerWidth = "100vw";
  const containerHeight = "100%";

  const getTileSizeInPx = (size) => {
    const baseSize = size === "8x8" ? 8 : 12;
    const tileSize = containerWidth / baseSize;
    return `${tileSize}px`;
  };

  const tileSizePx = getTileSizeInPx(selectedSize);
  const groutThicknessPx = thicknessToPx[groutThickness] || "2px";

  const tileStyles = [
    "bg-[0%_0%]",
    "bg-[100%_0%]",
    "bg-[0%_100%]",
    "bg-[100%_100%]",
  ];

  const handleSave = () => {
    setIsModalOpen(true);
  };

  const handleRotateBlock = (blockIndex) => {
    const newRotations = [...blockRotations];
    newRotations[blockIndex] = (newRotations[blockIndex] + 90) % 360;
    setBlockRotations(newRotations);
    if (rotateBlock) {
      rotateBlock(blockIndex);
    }
  };

  useEffect(() => {
    if (selectedColor) {
      setSelectedTile(prev => ({
        ...prev,
        colorsUsed: [selectedColor, ...(prev?.colorsUsed || []).slice(1)]
      }));
    }
  }, [selectedColor]);

  if (!selectedTile) {
    return (
      <div className="w-full mx-auto lg:mx-0 p-1">
        <h2 className="font-poppins font-semibold tracking-wide text-lg mb-2">
          TILE Preview
        </h2>
        <div 
          className="w-full rounded shadow flex items-start justify-center relative"
          style={{
            position: "relative",
            overflow: "hidden",
            width: `${containerWidth}px`,
            height: currentEnv ? "auto" : "300px",
            maxWidth: "100%",
            margin: "0 auto",
            backgroundColor: "#f5f5f5",
            border: "2px dashed #ccc"
          }}
        >
          {!currentEnv && (
            <p className="text-gray-500 text-lg font-medium mt-5 z-10">Please select a tile first</p>
          )}
          
          {/* Environment Image */}
          {currentEnv && (
            <>
              <img
                src={currentEnv.image}
                alt="Room preview"
                className="w-full h-auto object-cover"
                style={{
                  zIndex: 1,
                  position: "relative"
                }}
              />
              <button
                onClick={() => setSelectedEnvironment(null)}
                className="absolute top-3 right-3 bg-black bg-opacity-70 text-white rounded-full p-1 z-20 hover:ring-2 hover:ring-[#bd5b4c] hover:shadow-md hover:shadow-[#bd5b4c] transition-all duration-300 ease-in-out"
              >
                <IoMdClose size={20} />
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Hidden tile preview for PDF generation */}
      <div ref={pdfTilePreviewRef} style={{ position: 'absolute', left: '-9999px', top: 0, width: 300, height: 300, pointerEvents: 'none', zIndex: -1 }}>
        {/* Render the same tile preview here as in the main preview */}
        <div className="w-full h-full">
          {/* Copy the tile grid rendering logic here, or use a shared component if you have one */}
          {/* For simplicity, you can render the same JSX as your main tile preview grid */}
          <div className="relative">
            <div className="relative w-full h-full">
              <div
                className="grid bg-white"
                style={{
                  gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
                  gap: groutThickness !== "none" ? groutThicknessPx : "0px",
                  width: "100%",
                  height: "100%",
                  backgroundColor: groutColor,
                }}
              >
                {Array.from({ length: totalTiles }).map((_, index) => {
                  const patternIndex =
                    (index % 2) + 2 * (Math.floor(index / gridSize) % 2);
                  const bgPos = tileStyles[patternIndex];

                  // Calculate the block index for rotation (0-3 for each 2x2 block)
                  const blockIndex =
                    (index % 2) +
                    2 *
                      (Math.floor((index % gridSize) / 2) +
                        Math.floor(index / (gridSize * 2)) * 2);

                  return (
                    <div
                      key={index}
                      className="relative cursor-pointer"
                      style={{
                        width: "100%",
                        aspectRatio: "1 / 1",
                        overflow: "hidden",
                        backgroundColor: selectedColor || (selectedTile?.colorsUsed?.[0] || "#ffffff"),
                      }}
                      onClick={() => handleRotateBlock(blockIndex % 4)}
                    >
                      {/* Base Tile */}
                      <div
                        className="absolute inset-0"
                        style={{
                          transform: `rotate(${
                            blockRotations[blockIndex % 4] || 0
                          }deg)`,
                          transition: "transform 0.3s ease-in-out",
                          backgroundColor: selectedColor || (selectedTile?.colorsUsed?.[0] || "#ffffff"),
                        }}
                      >
                        {selectedTile?.image && (
                          <img
                            src={selectedTile.image}
                            alt={`Tile Block ${index + 1}`}
                            className="absolute inset-0 w-full h-full object-cover"
                            style={{
                              transform: `scale(2)`,
                              transformOrigin: `${
                                index % 2 === 0 ? "0" : "100%"
                              } ${index < gridSize ? "0" : "100%"}`,
                              backgroundColor: selectedColor || (selectedTile?.colorsUsed?.[0] || "#ffffff"),
                            }}
                            onError={(e) => {
                              console.error('Error loading image:', selectedTile.image);
                              e.target.style.display = 'none';
                            }}
                          />
                        )}

                        {/* Tile Masks */}
                        {selectedTile?.subMasks?.map((mask) => {
                          const maskColor = typeof mask.color === 'object' ? mask.color.hexCode : mask.color;
                          const isSelected = mask.id === selectedMaskId;
                          const previewColor = previewMode && hoveredPaletteColor;
                          const displayColor = isSelected && previewColor ? previewColor : maskColor || '#ffffff';
                          return (
                            <div
                              key={mask.id}
                              data-mask-id={mask.id}
                              className="absolute inset-0"
                              style={{
                                backgroundColor: displayColor,
                                maskImage: mask.image
                                  ? `url(${mask.image})`
                                  : "none",
                                WebkitMaskImage: mask.image
                                  ? `url(${mask.image})`
                                  : "none",
                                maskSize: "cover",
                                WebkitMaskSize: "cover",
                                maskPosition: "center",
                                WebkitMaskPosition: "center",
                                maskRepeat: "no-repeat",
                                WebkitMaskRepeat: "no-repeat",
                                transform: `scale(2)`,
                                transformOrigin: `${
                                  index % 2 === 0 ? "0" : "100%"
                                } ${index < gridSize ? "0" : "100%"}`,
                                zIndex: 1,
                                transition: "background-color 0.3s ease-in-out",
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Border Masks Layer */}
              {selectedBorder && borderMasks.length > 0 && (
                <>
                  {borderMasks.map(mask => {
                    const maskColor = typeof mask.color === 'object' ? mask.color.hexCode : mask.color;
                    const isSelected = mask.maskId === selectedBorderMaskId;
                    const previewColor = previewMode && hoveredPaletteColor;
                    const displayColor = isSelected && previewColor ? previewColor : maskColor || '#ffffff';

                    return (
                      <div
                        key={mask.maskId}
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          backgroundColor: displayColor,
                          maskImage: `url(${mask.image})`,
                          WebkitMaskImage: `url(${mask.image})`,
                          maskSize: 'cover',
                          WebkitMaskSize: 'cover',
                          maskPosition: 'center',
                          maskRepeat: 'no-repeat',
                          // This path creates a thinner 5% frame
                          clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, 5% 5%, 5% 95%, 95% 95%, 95% 5%, 5% 5%)',
                          zIndex: 2,
                          transition: "background-color 0.3s ease-in-out",
                        }}
                      />
                    );
                  })}
                </>
              )}

              {/* Environment Image */}
              {currentEnv && (
                <>
                  <img
                    src={currentEnv.image}
                    alt="Room preview"
                    className="w-full h-full object-cover absolute inset-0"
                    style={{
                      zIndex: 3,
                    }}
                  />
                  <button
                    onClick={() => setSelectedEnvironment(null)}
                    className="absolute top-3 right-3 bg-black bg-opacity-70 text-white rounded-full p-1 z-50 hover:ring-2 hover:ring-[#bd5b4c] hover:shadow-md hover:shadow-[#bd5b4c] transition-all duration-300 ease-in-out"
                  >
                    <IoMdClose size={20} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <div ref={tilePreviewRef} className="w-full mx-auto lg:mx-0 p-1">
        <h2 className="font-poppins font-semibold tracking-wide text-lg mb-2">
          TILE Preview
        </h2>
        <div className="relative mb-6">
          <div
            className="w-full  rounded shadow"
            style={{
              position: "relative",
              overflow: "hidden",
              width: `${containerWidth}px`,
              height: containerHeight,
              maxWidth: "100%",
              margin: "0 auto",
            }}
          >
            {/* Tile Grid Container */}
            <div className="relative">
              <div className="relative w-full h-full">
                <div
                  className="grid bg-white"
                  style={{
                    gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
                    gap: groutThickness !== "none" ? groutThicknessPx : "0px",
                    width: "100%",
                    height: "100%",
                    backgroundColor: groutColor,
                  }}
                >
                  {Array.from({ length: totalTiles }).map((_, index) => {
                    const patternIndex =
                      (index % 2) + 2 * (Math.floor(index / gridSize) % 2);
                    const bgPos = tileStyles[patternIndex];

                    // Calculate the block index for rotation (0-3 for each 2x2 block)
                    const blockIndex =
                      (index % 2) +
                      2 *
                        (Math.floor((index % gridSize) / 2) +
                          Math.floor(index / (gridSize * 2)) * 2);

                    return (
                      <div
                        key={index}
                        className="relative cursor-pointer"
                        style={{
                          width: "100%",
                          aspectRatio: "1 / 1",
                          overflow: "hidden",
                          backgroundColor: selectedColor || (selectedTile?.colorsUsed?.[0] || "#ffffff"),
                        }}
                        onClick={() => handleRotateBlock(blockIndex % 4)}
                      >
                        {/* Base Tile */}
                        <div
                          className="absolute inset-0"
                          style={{
                            transform: `rotate(${
                              blockRotations[blockIndex % 4] || 0
                            }deg)`,
                            transition: "transform 0.3s ease-in-out",
                            backgroundColor: selectedColor || (selectedTile?.colorsUsed?.[0] || "#ffffff"),
                          }}
                        >
                          {selectedTile?.image && (
                            <img
                              src={selectedTile.image}
                              alt={`Tile Block ${index + 1}`}
                              className="absolute inset-0 w-full h-full object-cover"
                              style={{
                                transform: `scale(2)`,
                                transformOrigin: `${
                                  index % 2 === 0 ? "0" : "100%"
                                } ${index < gridSize ? "0" : "100%"}`,
                                backgroundColor: selectedColor || (selectedTile?.colorsUsed?.[0] || "#ffffff"),
                              }}
                              onError={(e) => {
                                console.error('Error loading image:', selectedTile.image);
                                e.target.style.display = 'none';
                              }}
                            />
                          )}

                          {/* Tile Masks */}
                          {selectedTile?.subMasks?.map((mask) => {
                            const maskColor = typeof mask.color === 'object' ? mask.color.hexCode : mask.color;
                            const isSelected = mask.id === selectedMaskId;
                            const previewColor = previewMode && hoveredPaletteColor;
                            const displayColor = isSelected && previewColor ? previewColor : maskColor || '#ffffff';
                            return (
                              <div
                                key={mask.id}
                                data-mask-id={mask.id}
                                className="absolute inset-0"
                                style={{
                                  backgroundColor: displayColor,
                                  maskImage: mask.image
                                    ? `url(${mask.image})`
                                    : "none",
                                  WebkitMaskImage: mask.image
                                    ? `url(${mask.image})`
                                    : "none",
                                  maskSize: "cover",
                                  WebkitMaskSize: "cover",
                                  maskPosition: "center",
                                  WebkitMaskPosition: "center",
                                  maskRepeat: "no-repeat",
                                  WebkitMaskRepeat: "no-repeat",
                                  transform: `scale(2)`,
                                  transformOrigin: `${
                                    index % 2 === 0 ? "0" : "100%"
                                  } ${index < gridSize ? "0" : "100%"}`,
                                  zIndex: 1,
                                  transition: "background-color 0.3s ease-in-out",
                                }}
                              />
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Border Masks Layer */}
                {selectedBorder && borderMasks.length > 0 && (
                  <>
                    {borderMasks.map(mask => {
                      const maskColor = typeof mask.color === 'object' ? mask.color.hexCode : mask.color;
                      const isSelected = mask.maskId === selectedBorderMaskId;
                      const previewColor = previewMode && hoveredPaletteColor;
                      const displayColor = isSelected && previewColor ? previewColor : maskColor || '#ffffff';

                      return (
                        <div
                          key={mask.maskId}
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            backgroundColor: displayColor,
                            maskImage: `url(${mask.image})`,
                            WebkitMaskImage: `url(${mask.image})`,
                            maskSize: 'cover',
                            WebkitMaskSize: 'cover',
                            maskPosition: 'center',
                            maskRepeat: 'no-repeat',
                            // This path creates a thinner 5% frame
                            clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, 5% 5%, 5% 95%, 95% 95%, 95% 5%, 5% 5%)',
                            zIndex: 2,
                            transition: "background-color 0.3s ease-in-out",
                          }}
                        />
                      );
                    })}
                  </>
                )}

                {/* Environment Image */}
                {currentEnv && (
                  <>
                    <img
                      src={currentEnv.image}
                      alt="Room preview"
                      className="w-full h-full object-cover absolute inset-0"
                      style={{
                        zIndex: 3,
                      }}
                    />
                    <button
                      onClick={() => setSelectedEnvironment(null)}
                      className="absolute top-3 right-3 bg-black bg-opacity-70 text-white rounded-full p-1 z-50 hover:ring-2 hover:ring-[#bd5b4c] hover:shadow-md hover:shadow-[#bd5b4c] transition-all duration-300 ease-in-out"
                    >
                      <IoMdClose size={20} />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center items-center gap-2 sm:gap-20 mt-5 flex-wrap">
          <SaveButton onSave={handleSave} />
          <ShopButton />
        </div>
      </div>

      {/* TileModal */}
      <TileModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        tileConfig={{
          tile: {
            ...selectedTile,
            masks: selectedTile?.subMasks
          },
          color: selectedColor,
          size: selectedSize,
          groutColor: groutColor,
          thickness: groutThickness,
          environment: currentEnv
            ? {
                label: currentEnv.label,
                image: currentEnv.image,
              }
            : null,
          rotations: blockRotations,
        }}
        tilePreviewRef={pdfTilePreviewRef}
      />
    </>
  );
};

export default TileCanvasView;
