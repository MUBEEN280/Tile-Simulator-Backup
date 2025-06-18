import React, { useState, useEffect } from "react";
import { useTileSimulator } from "../context/TileSimulatorContext";
import {
  FaBed,
  FaUtensils,
  FaBath,
  FaStore,
  FaWarehouse,
} from "react-icons/fa";

import ColorEditor from "./ColorEditor";

const environments = [
  { icon: <FaBed />, label: "bedroom", image: "/Images/bedroomjpg.png" },
  { icon: <FaUtensils />, label: "dining", image: "/Images/livingjpg.png" },
  { icon: <FaWarehouse />, label: "kitchen", image: "/Images/kitchen.png" },
  { icon: <FaBath />, label: "bathroom", image: "/Images/env/bathroom.png" },
  { icon: <FaStore />, label: "store", image: "/Images/commercial_old.png" },
];

const groutColors = ["#f5f5f5", "#d3d3d3", "#aaaaaa"];
const thicknessLevels = ["none", "thin", "thick"];

const TileSelector = ({ onSelectTile }) => {
  const {
    tileCollections,
    selectedCategory,
    setSelectedCategory,
    categories,
    setSelectedBorder,
    selectedSize,
    setSelectedSize,
    selectedEnvironment,
    setSelectedEnvironment,
    groutColor,
    setGroutColor,
    groutThickness,
    setGroutThickness,
    subMasks,
    setTileMaskColor,
    borderMasks,
    setBorderMaskColor,
    selectedTile,
    setSelectedTile: handleTileSelect,
    loading,
    error
  } = useTileSimulator();

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

  if (loading) {
    return (
      <div className="w-full h-auto p-1">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-auto p-1">
        <div className="text-red-500 text-center p-4">
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <section className="w-full h-auto p-1">
      <h2 className="font-poppins font-semibold tracking-wide text-lg mb-2">
        Tile Customization
      </h2>
      <div className="flex flex-col gap-2">
        <h2 className="font-poppins">Select Category</h2>
        <div className="w-full rounded-lg">
          <select
            value={selectedCategory}
            onChange={(e) => {
              console.log('Selected category ID:', e.target.value);
              setSelectedCategory(e.target.value);
            }}
            className="w-full p-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 font-poppins text-sm"
          >
            <option value="">Select a category</option>
            {categories.map((category) => (
              <option key={category._id} value={category._id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-2">
          <h3 className="font-poppins">Select Tile Pattern</h3>
          <div className="w-[512px] overflow-x-auto gap-2 mt-2 pb-2 custom-scrollbar">
            {selectedCategory ? (
              <>
                {console.log('Selected Category:', selectedCategory)}
                {console.log('Available Categories:', Object.keys(tileCollections))}
                {console.log('Tiles in selected category:', tileCollections[selectedCategory])}
                {tileCollections[selectedCategory]?.length > 0 ? (
                  <div className="flex gap-2">
                    {tileCollections[selectedCategory].map((tile) => (
                      <div
                        key={tile.id}
                        className="flex-none w-[120px] relative aspect-square group cursor-pointer bg-gray-200 p-2 rounded-sm"
                        onClick={() => handleTileClick(tile)}
                      >
                        <img
                          src={tile.image}
                          alt={tile.name}
                          className="w-full h-full object-cover rounded-lg transition-transform group-hover:scale-105"
                        />
                        <div className="mt-1 text-center text-xs font-medium text-gray-700">
                          {tile.name}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-4">
                    No tiles found in this category. Please check if tiles are assigned to this category.
                  </div>
                )}
              </>
            ) : (
              <div className="text-center text-gray-500 py-4">
                Please select a category to view tiles
              </div>
            )}
          </div>
        </div>

        {/* Tile Size Selection */}
        <div className="mt-2">
          <h4 className="font-poppins mb-2">Select Tile Size</h4>
          <div className="flex gap-2">
            {["8x8", "12x12"].map((size) => {
              const isSelected = selectedSize === size;

              return (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={` py-1 px-10 rounded-md font-poppins font-light text-sm transition-all duration-300 ease-in-out
            ${
              isSelected
                ? "bg-black text-white"
                : "bg-white border border-gray-200 shadow-sm hover:bg-black hover:text-white"
            }`}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </div>

        {/* Choose Environment Section */}
        <div className="mt-2">
          <h4 className="font-poppins">Choose Environment</h4>
          <div className="flex flex-wrap gap-2 mt-2">
            {environments.map((env) => (
              <button
                key={env.label}
                onClick={() => setSelectedEnvironment(env.label)}
                className={`flex text-2xl items-center gap-2 p-4 rounded-md border 
          ${
            selectedEnvironment === env.label
              ? "bg-black text-white"
              : "bg-white border-gray-300"
          } 
          hover:bg-black hover:text-white transition-all`}
              >
                {env.icon}
              </button>
            ))}
          </div>
        </div>

        {/* Grout Controls */}
        <div className="mt-2">
          <h3 className="font-poppins">Grout Options</h3>
          <div className="mt-1">
            <h4 className="font-poppins text-gray-600">Colors</h4>
            <div className="flex gap-4 mt-1">
              {groutColors.map((color, index) => (
                <div
                  key={index}
                  className={`w-6 h-6 rounded-full border cursor-pointer hover:ring-1 hover:ring-[#bd5b4c] transition-all duration-300 ease-in-out ${
                    groutColor === color ? "ring-2 ring-[#bd5b4c]" : ""
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setGroutColor(color)}
                />
              ))}
            </div>
          </div>

          <div className="mt-2">
            <h3 className="font-poppins text-gray-600">Thickness</h3>
            <div className="flex flex-wrap gap-4 mt-2">
              {thicknessLevels.map((level) => (
                <label
                  key={level}
                  className={`flex items-center gap-2 cursor-pointer uppercase text-xs tracking-wide font-poppins transition-all duration-300 ease-in-out
                    ${
                      groutThickness === level
                        ? "bg-black text-white rounded-md shadow-md px-2 py-1"
                        : "text-black"
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="groutThickness"
                    value={level}
                    checked={groutThickness === level}
                    onChange={() => setGroutThickness(level)}
                  />
                  {level}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Color Editor Section */}
        <div className="mt-2">
          <h3 className="font-poppins">Choose Color</h3>
          {selectedTile && (
            <div className="mt-1">
              <ColorEditor
                tile={selectedTile}
                tileMasks={selectedTile.subMasks}
                setTileMaskColor={setTileMaskColor}
                borderMasks={borderMasks}
                setBorderMaskColor={setBorderMaskColor}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default TileSelector;
