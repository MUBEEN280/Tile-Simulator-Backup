import React, { useState, useEffect } from "react";
import { useTileSimulator } from "../context/TileSimulatorContext";
import axios from "axios";

const API_URL = "https://tile-simulator-dashboard.onrender.com";


const ColorEditor = ({ tile, tileMasks, setTileMaskColor, borderMasks, setBorderMaskColor }) => {
  const {
    selectedColor,
  } = useTileSimulator();

  const [hoveredPaletteColor, setHoveredPaletteColor] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [selectedMaskId, setSelectedMaskId] = useState(null);
  const [selectedBorderMaskId, setSelectedBorderMaskId] = useState(null);
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

  // Initialize selected mask when tile changes
  useEffect(() => {
    if (tileMasks && tileMasks.length > 0) {
      setSelectedMaskId(tileMasks[0].id);
      setSelectedBorderMaskId(null);
    }
  }, [tileMasks]);

  if (!tile || !Array.isArray(tileMasks)) return null;

  // Get all available colors from the selected tile's masks
  const allAvailableColors = Array.from(
    new Set(
      tileMasks.flatMap((mask) => mask.availableColors || [])
    )
  );

  // Combine API colors with available colors
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

  // Get unique colors used by masks
  const getUniqueColors = () => {
    const colorSet = new Set();
    
    // Add colors from colorsUsed array by matching IDs with API colors
    if (tile?.colorsUsed && Array.isArray(tile.colorsUsed)) {
      tile.colorsUsed.forEach(colorId => {
        const colorObj = apiColors.find(c => c._id === colorId);
        if (colorObj && colorObj.hexCode) {
          colorSet.add(colorObj.hexCode);
        }
      });
    }

    // Add colors from masks that aren't already in colorsUsed
    tileMasks.forEach((mask) => {
      if (mask.color) {
        const colorValue = typeof mask.color === 'object' ? mask.color.hexCode : mask.color;
        if (colorValue && !colorSet.has(colorValue)) {
          colorSet.add(colorValue);
        }
      }
    });

    // Add colors from border masks that aren't already in colorsUsed
    borderMasks?.forEach((mask) => {
      if (mask.color) {
        const colorValue = typeof mask.color === 'object' ? mask.color.hexCode : mask.color;
        if (colorValue && !colorSet.has(colorValue)) {
          colorSet.add(colorValue);
        }
      }
    });

    return Array.from(colorSet);
  };

  // When a palette color is clicked, update only the selected mask
  const handlePaletteColorSelect = async (paletteColor) => {
    try {
      // If color doesn't exist in API, add it
      if (!apiColors.some(c => c.hexCode === paletteColor)) {
        await addTileColor(paletteColor);
      }

      if (selectedBorderMaskId) {
        setBorderMaskColor(selectedBorderMaskId, paletteColor);
      } else if (selectedMaskId) {
        setTileMaskColor(selectedMaskId, paletteColor);
      } else {
        // If no mask is selected, select the first mask and apply the color
        if (tileMasks && tileMasks.length > 0) {
          setSelectedMaskId(tileMasks[0].id);
          setTileMaskColor(tileMasks[0].id, paletteColor);
        }
      }
      setPreviewMode(false);
      setHoveredPaletteColor(null);
    } catch (error) {
      console.error("Failed to apply color:", error);
    }
  };

  // When a color is clicked, select the first mask with that color
  const handleColorClick = (color) => {
    // First try to find a tile mask with this color
    const maskWithColor = tileMasks.find((mask) => {
      const maskColor = typeof mask.color === 'object' ? mask.color.hexCode : mask.color;
      return maskColor === color;
    });
    
    if (maskWithColor) {
      setSelectedMaskId(maskWithColor.id);
      setSelectedBorderMaskId(null);
      return;
    }

    // If no tile mask found, try to find a border mask with this color
    const borderMaskWithColor = borderMasks?.find((mask) => {
      const maskColor = typeof mask.color === 'object' ? mask.color.hexCode : mask.color;
      return maskColor === color;
    });
    
    if (borderMaskWithColor) {
      setSelectedBorderMaskId(borderMaskWithColor.maskId);
      setSelectedMaskId(null);
      return;
    }

    // If no mask found with this color, select the first available mask
    if (tileMasks && tileMasks.length > 0) {
      setSelectedMaskId(tileMasks[0].id);
      setSelectedBorderMaskId(null);
    }
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
        <div className="flex flex-wrap gap-3">
          {getUniqueColors().map((color) => {
            const isSelected = (selectedMaskId && tileMasks.find(mask => {
              const maskColor = typeof mask.color === 'object' ? mask.color.hexCode : mask.color;
              return mask.id === selectedMaskId && maskColor === color;
            })) || (selectedBorderMaskId && borderMasks?.find(mask => {
              const maskColor = typeof mask.color === 'object' ? mask.color.hexCode : mask.color;
              return mask.maskId === selectedBorderMaskId && maskColor === color;
            }));
            return (
              <button
                key={color}
                className={`w-6 h-6 transition-all duration-300 ease-in-out transform hover:scale-110
                  ${isSelected
                    ? "rounded-md ring-2 ring-[#bd5b4c]"
                    : "rounded-full hover:rounded-full hover:ring-1 hover:ring-[#bd5b4c]"
                  }`}
                style={{ backgroundColor: color }}
                title={color}
                onClick={() => handleColorClick(color)}
                onMouseEnter={() => {
                  setPreviewMode(true);
                  setHoveredPaletteColor(color);
                }}
                onMouseLeave={() => {
                  setPreviewMode(false);
                  setHoveredPaletteColor(null);
                }}
              />
            );
          })}
        </div>
      </div>

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
                const isActive = (selectedMaskId && tileMasks.find(mask => {
                  const maskColor = typeof mask.color === 'object' ? mask.color.hexCode : mask.color;
                  return mask.id === selectedMaskId && maskColor === paletteColor;
                })) || (selectedBorderMaskId && borderMasks?.find(mask => {
                  const maskColor = typeof mask.color === 'object' ? mask.color.hexCode : mask.color;
                  return mask.maskId === selectedBorderMaskId && maskColor === paletteColor;
                }));
                const isHovered = hoveredPaletteColor === paletteColor;
                return (
                  <button
                    key={`palette-color-${rowIndex}-${index}-${paletteColor}`}
                    className={`w-6 h-6 transition-all duration-300 ease-in-out transform hover:scale-110
                      ${isActive || isHovered
                        ? "rounded-md ring-2 ring-[#bd5b4c]"
                        : "rounded-full hover:rounded-full hover:ring-1 hover:ring-[#bd5b4c]"
                      }`}
                    style={{ backgroundColor: paletteColor }}
                    title={paletteColor}
                    onClick={() => handlePaletteColorSelect(paletteColor)}
                    onMouseEnter={() => {
                      setPreviewMode(true);
                      setHoveredPaletteColor(paletteColor);
                    }}
                    onMouseLeave={() => {
                      setPreviewMode(false);
                      setHoveredPaletteColor(null);
                    }}
                    disabled={colorLoading}
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
