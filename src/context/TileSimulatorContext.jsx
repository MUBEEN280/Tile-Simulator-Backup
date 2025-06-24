import React, { createContext, useContext, useState, useEffect } from "react";
import axios from 'axios';

const TileSimulatorContext = createContext();
 
// Sample tiles with mask data

export const TileSimulatorProvider = ({ children }) => {
  const [tileCollections, setTileCollections] = useState({});
  const [selectedCategory, setSelectedCategory] = useState("Pattern Collection");
  const [categories, setCategories] = useState([]);
  const [selectedBorder, setSelectedBorder] = useState(null);
  const [selectedSize, setSelectedSize] = useState(() => {
    const savedSize = localStorage.getItem("selectedSize");
    return savedSize || "8x8";
  });
  const [selectedEnvironment, setSelectedEnvironment] = useState(null);
  const [groutColor, setGroutColor] = useState("#f5f5f5");
  const [groutThickness, setGroutThickness] = useState("none");
  const [selectedTile, setSelectedTile] = useState(null);
  const [selectedColor, setSelectedColor] = useState(() => {
    const savedColor = localStorage.getItem("selectedColor");
    return savedColor || null;
  });
  const [tileMasks, setTileMasks] = useState([]);
  const [borderMasks, setBorderMasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMaskId, setSelectedMaskId] = useState(null);
  const [selectedBorderMaskId, setSelectedBorderMaskId] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [hoveredPaletteColor, setHoveredPaletteColor] = useState(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        console.log('Fetching categories from:', '/api/categories');
        const response = await axios.get('/api/categories');
        console.log('Categories API Response:', response.data);
        if (response.data) {
          setCategories(response.data);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
        console.error('Error details:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          config: error.config
        });
        setError('Failed to fetch categories: ' + (error.response?.data?.message || error.message));
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchTiles = async () => {
      try {
        console.log('Fetching tiles from:', '/api/tiles');
        const response = await axios.get('/api/tiles');
        console.log('Raw Tiles API Response:', response.data);

        if (!response.data || !Array.isArray(response.data)) {
          throw new Error('Invalid API response format');
        }

        // Group tiles by their category
        const transformedTiles = response.data.reduce((acc, tile) => {
          // Log the raw tile data to see its structure
          console.log('Raw tile data:', tile);
          
          // Get the category ID, trying different possible field names
          const categoryId = tile.categoryId || tile.category?._id || tile.category || "Pattern Collection";
          console.log('Tile:', tile.name, 'Category ID:', categoryId);
          
          if (!acc[categoryId]) {
            acc[categoryId] = [];
          }
          
          const transformedTile = {
            id: tile._id,
            name: tile.tileName || tile.name,
            image: tile.mainMask || tile.image,
            shape: tile.shapeStyle || "square",
            grout: tile.groutShape || "cross",
            scale: tile.scale || 1,
            colorsUsed: tile.colorsUsed || ["#ffffff"],
            subMasks: (tile.subMasks || []).map(mask => ({
              id: mask._id,
              image: mask.image,
              color: mask.backgroundColor,
              publicId: mask.publicId
            }))
          };
          
          console.log('Adding tile to category:', categoryId, transformedTile);
          acc[categoryId].push(transformedTile);
          
          return acc;
        }, {});

        console.log('Categories from API:', categories);
        console.log('Final transformed tiles by category:', transformedTiles);
        setTileCollections(transformedTiles);
      } catch (error) {
        console.error('Error fetching tiles:', error);
        console.error('Error details:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          config: error.config
        });
        setError('Failed to fetch tiles: ' + (error.response?.data?.message || error.message));
      } finally {
        setLoading(false);
      }
    };

    fetchTiles();
  }, [categories]);

  useEffect(() => {
    if (selectedBorder && selectedBorder.subMasks) {
      setBorderMasks(selectedBorder.subMasks.map(mask => ({
        maskId: mask.id,
        image: mask.image,
        color: mask.color,
      })));
    } else {
      setBorderMasks([]);
    }
  }, [selectedBorder]);

  const handleTileSelect = (tile) => {
    setSelectedTile(tile);
    // Initialize tileMasks with the selected tile's subMasks
    if (tile && tile.subMasks) {
      setTileMasks(tile.subMasks.map(mask => ({
        id: mask.id,
        image: mask.image,
        color: mask.color,
        publicId: mask.publicId
      })));
    } else {
      setTileMasks([]);
    }
    localStorage.setItem("selectedTile", JSON.stringify(tile));
  };

  const setTileMaskColor = (maskId, newColor) => {
    // Update tileMasks
    setTileMasks(prevMasks =>
      prevMasks.map(mask =>
        mask.id === maskId ? { ...mask, color: newColor } : mask
      )
    );

    // Update selectedTile's subMasks without modifying colorsUsed
    setSelectedTile(prevTile => {
      if (!prevTile) return prevTile;
      return {
        ...prevTile,
        subMasks: prevTile.subMasks.map(mask =>
          mask.id === maskId ? { ...mask, color: newColor } : mask
        )
      };
    });

    // Keep the same mask selected
    setSelectedMaskId(maskId);
  };

  const handleBorderSelect = (border) => {
    setSelectedBorder(border);
  };

  const setBorderMaskColor = (maskId, newColor) => {
    // Get the old color before updating
    const oldColor = borderMasks.find(mask => mask.maskId === maskId)?.color;
    const oldColorHex = typeof oldColor === 'object' ? oldColor.hexCode : oldColor;
    
    // Update borderMasks
    setBorderMasks(prevMasks =>
      prevMasks.map(mask =>
        mask.maskId === maskId ? { ...mask, color: newColor } : mask
      )
    );

    // Update selectedTile's colorsUsed if it exists
    setSelectedTile(prevTile => {
      if (!prevTile) return prevTile;
      return {
        ...prevTile,
        colorsUsed: prevTile.colorsUsed.map(colorId => {
          // If this color ID corresponds to the old color, replace it with the new color
          if (colorId === oldColorHex) {
            return newColor;
          }
          return colorId;
        })
      };
    });
  };

  const handleTileClick = (tile) => {
    if (selectedCategory === "Border Collection") {
      setSelectedBorder(tile.image);
    } else {
      handleTileSelect(tile);
      if (onSelectTile) {
        onSelectTile(tile);
      }
    }
  };

  const handlePaletteColorSelect = async (paletteColor) => {
    try {
      if (selectedBorderMaskId) {
        setBorderMaskColor(selectedBorderMaskId, paletteColor);
      } else if (selectedMaskId) {
        setTileMaskColor(selectedMaskId, paletteColor);
      }
      setPreviewMode(false);
      setHoveredPaletteColor(null);
    } catch (error) {
      console.error("Failed to apply color:", error);
    }
  };

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
    // ... similar logic for border masks
  };

  const value = {
    tileCollections,
    selectedCategory,
    setSelectedCategory,
    categories,
    selectedBorder,
    setSelectedBorder,
    selectedSize,
    setSelectedSize,
    selectedEnvironment,
    setSelectedEnvironment,
    groutColor,
    setGroutColor,
    groutThickness,
    setGroutThickness,
    selectedTile,
    setSelectedTile: handleTileSelect,
    tileMasks,
    setTileMaskColor,
    borderMasks,
    setBorderMaskColor,
    loading,
    error,
    selectedMaskId,
    setSelectedMaskId,
    selectedBorderMaskId,
    setSelectedBorderMaskId,
    previewMode,
    setPreviewMode,
    hoveredPaletteColor,
    setHoveredPaletteColor
  };

  return (
    <TileSimulatorContext.Provider value={value}>
      {children}
    </TileSimulatorContext.Provider>
  );
};
export const useTileSimulator = () => {
  const context = useContext(TileSimulatorContext);
  if (!context) {
    throw new Error("useTileSimulator must be used within a TileSimulatorProvider");
  }
  return context;
};

