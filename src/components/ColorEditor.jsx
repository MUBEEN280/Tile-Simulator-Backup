import React, { useState, useEffect } from "react";
import { useTileSimulator } from "../context/TileSimulatorContext";
import axios from "axios";

const API_URL = "https://tile-simulator-dashboard.onrender.com";


const ColorEditor = ({ tile, tileMasks, borderMasks }) => {
  const {
    selectedMaskId,
    setSelectedMaskId,
    selectedBorderMaskId,
    setSelectedBorderMaskId,
    previewMode,
    setPreviewMode,
    hoveredPaletteColor,
    setHoveredPaletteColor,
    handlePaletteColorSelect,
  } = useTileSimulator();

  const [visibleRows, setVisibleRows] = useState(1);
  const [apiColors, setApiColors] = useState([]);
  const [colorLoading, setColorLoading] = useState(false);
  const [colorError, setColorError] = useState(null);

  // Fetch colors from API
  useEffect(() => {
    const fetchColors = async () => {
      try {
        const response = await axios.get('/api/colors');
        setApiColors(response.data);
      } catch (error) {
        console.error("Failed to fetch colors:", error);
        setColorError("Failed to fetch colors");
      }
    };
    fetchColors();
  }, []);

  // Add new color to API
  const addTileColor = async (hexCode) => {
    setColorLoading(true);
    setColorError(null);
    try {
      const response = await axios.post(
        '/api/colors/add',
        { hexCode }
      );
      setApiColors((prev) => [...prev, response.data]);
      return response.data;
    } catch (error) {
      const errMsg = error.response?.data?.error || "Failed to add color";
      setColorError(errMsg);
      throw new Error(errMsg);
    } finally {
      setColorLoading(false);
    }
  };

  if (!tile || !Array.isArray(tileMasks)) return null;

  // Get colors used by masks with their mask IDs
  const getMaskColors = () => {
    const maskColors = [];
    
    // Add colors from masks with their IDs
    tileMasks.forEach((mask) => {
      if (mask.color) {
        const colorValue = typeof mask.color === 'object' ? mask.color.hexCode : mask.color;
        if (colorValue) {
          maskColors.push({
            color: colorValue,
            maskId: mask.id
          });
        }
      }
    });

    return maskColors;
  };

  // Get all available colors from the selected tile's masks
  const allAvailableColors = Array.from(
    new Set(
      tileMasks.flatMap((mask) => mask.availableColors || [])
    )
  );

  // Combine API colors with available colors, removing duplicates
  const combinedColors = [...new Set([...apiColors.map(c => c.hexCode), ...allAvailableColors])];

  // Split colors into rows of 5
  const colorRows = [];
  for (let i = 0; i < combinedColors.length; i += 5) {
    colorRows.push(combinedColors.slice(i, i + 5));
  }

  // The currently selected mask objects
  const selectedMask = tileMasks.find((mask) => mask.id === selectedMaskId);
  const selectedBorderMask = borderMasks?.find(
    (mask) => mask.maskId === selectedBorderMaskId
  );

  const selectedMaskColor = selectedMask
    ? selectedMask.color
    : selectedBorderMask
    ? selectedBorderMask.color
    : null;

  // Find the hex code of the currently selected color
  let currentSelectedColorValue = null;
  if (selectedMaskId) {
    const currentMask = tileMasks.find(m => m.id === selectedMaskId);
    if (currentMask) {
      currentSelectedColorValue = typeof currentMask.color === 'object' ? currentMask.color.hexCode : currentMask.color;
    }
  } else if (selectedBorderMaskId) {
    const currentBorderMask = borderMasks.find(m => m.maskId === selectedBorderMaskId);
    if (currentBorderMask) {
      currentSelectedColorValue = typeof currentBorderMask.color === 'object' ? currentBorderMask.color.hexCode : currentBorderMask.color;
    }
  }

  // When a color is clicked, select the specific mask
  const handleColorClick = (maskId) => {
    setSelectedMaskId(maskId);
    setSelectedBorderMaskId(null);
  };

  // When a border color is clicked, select the specific border mask
  const handleBorderColorClick = (maskId) => {
    setSelectedBorderMaskId(maskId);
    setSelectedMaskId(null);
  };

  const handleShowMore = () => {
    setVisibleRows(prev => Math.min(prev + 1, colorRows.length));
  };

  // Preview color for selected mask
  const previewColor = previewMode && hoveredPaletteColor ? hoveredPaletteColor : null;

  return (
    <div className="pb-2">
      {/* Instructions */}
      <div className="mb-4">
        <div className="text-sm font-poppins text-gray-600">
          Customize Colors
        </div>
        <ol className="text-xs text-gray-500 mt-1 space-y-1">
          <li>Click on a color to select an area</li>
          <li>Choose a new color from "Available Colors" to apply it</li>
        </ol>
      </div>

      {/* Colors Used */}
      <div className="mb-6">
        <div className="text-sm mb-2 tracking-wider font-light font-poppins">
          Colors Used
        </div>
        <div className="flex flex-wrap gap-2">
          {getMaskColors().map(({ color, maskId }, index) => (
            <div
              key={`tile-color-${index}`}
              onClick={() => handleColorClick(maskId)}
              className={`w-6 h-6 cursor-pointer transition-all duration-300 ${
                selectedMaskId === maskId
                  ? 'rounded-lg shadow-inner'
                  : 'rounded-full'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      {/* Border Colors Used */}
      {borderMasks && borderMasks.length > 0 && (
        <div className="mb-4 mt-4">
          <div className="text-sm mb-3 tracking-wider font-light font-poppins">
            Border Colors
          </div>
          <div className="flex flex-wrap gap-2">
            {borderMasks.map((mask) => {
              const colorValue = typeof mask.color === 'object' ? mask.color.hexCode : mask.color;
              return (
                <div
                  key={`border-color-${mask.maskId}`}
                  onClick={() => handleBorderColorClick(mask.maskId)}
                  className={`w-6 h-6 cursor-pointer transition-all duration-300 ${
                    selectedBorderMaskId === mask.maskId
                      ? 'rounded-lg shadow-inner'
                      : 'rounded-full'
                  }`}
                  style={{ backgroundColor: colorValue }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Available Colors */}
      <div className="mb-4">
        <div className="text-sm mb-3 tracking-wider font-light font-poppins">
          Available Colors
        </div>
        {colorError && (
          <div className="text-red-500 text-sm mb-2">{colorError}</div>
        )}
        <div className="flex flex-col gap-2">
          {colorRows.slice(0, visibleRows).map((row, rowIndex) => (
            <div key={rowIndex} className="flex gap-2">
              {row.map((paletteColor, index) => {
                // Highlight the swatch if its color matches the selected mask's color
                const isActive = currentSelectedColorValue === paletteColor;
                const isHovered = hoveredPaletteColor === paletteColor;
                const finalColor = previewMode && isHovered ? hoveredPaletteColor : paletteColor;
                return (
                  <button
                    key={index}
                    className={`w-6 h-6 transition-all duration-200 ${
                      isActive
                        ? 'rounded-lg shadow-inner'
                        : 'rounded-full hover:rounded-full'
                    }`}
                    style={{ backgroundColor: finalColor }}
                    title={paletteColor}
                    onClick={() => handlePaletteColorSelect(paletteColor)}
                    onMouseEnter={() => {
                      if (selectedMaskId || selectedBorderMaskId) {
                        setPreviewMode(true);
                        setHoveredPaletteColor(paletteColor);
                      }
                    }}
                    onMouseLeave={() => {
                      setPreviewMode(false);
                      setHoveredPaletteColor(null);
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
        {visibleRows < colorRows.length && (
          <div className="mt-1">
            <button
              onClick={handleShowMore}
              className="p-1 font-poppins text-sm text-gray-600 hover:text-black transition-colors duration-300 ease"
            >
              More
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ColorEditor;
