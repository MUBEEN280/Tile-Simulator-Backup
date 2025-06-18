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
  const [selectedEnvironment, setSelectedEnvironment] = useState("bedroom");
  const [groutColor, setGroutColor] = useState("#f5f5f5");
  const [groutThickness, setGroutThickness] = useState("none");
  const [selectedTile, setSelectedTile] = useState(() => {
    const savedTile = localStorage.getItem("selectedTile");
    return savedTile ? JSON.parse(savedTile) : null;
  });
  const [selectedColor, setSelectedColor] = useState(() => {
    const savedColor = localStorage.getItem("selectedColor");
    return savedColor || null;
  });
  const [tileMasks, setTileMasks] = useState([]);
  const [borderMasks, setBorderMasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const handleTileSelect = (tile) => {
    setSelectedTile(tile);
    localStorage.setItem("selectedTile", JSON.stringify(tile));
  };

  const setTileMaskColor = (maskId, color) => {
    setTileMasks(prevMasks =>
      prevMasks.map(mask =>
        mask.id === maskId ? { ...mask, color } : mask
      )
    );
  };

  const handleBorderSelect = (border) => {
    setSelectedBorder(border);
  };

  const setBorderMaskColor = (maskId, color) => {
    setBorderMasks(prevMasks =>
      prevMasks.map(mask =>
        mask.id === maskId ? { ...mask, color } : mask
      )
    );
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
    error
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

