import React from "react";

// Helper to ensure absolute URLs for images or handle base64
const getAbsoluteUrl = (src) => {
  if (!src) return "";
  if (src.startsWith("http") || src.startsWith("data:image")) return src;
  return window.location.origin + src;
};

export default function TilePatternPreview({
  tileConfig,
  selectedMaskId,
  previewMode,
  hoveredPaletteColor,
  gridCols,
  gridRows,
  style,
}) {
  if (!tileConfig) return null;
  const cols = gridCols || (tileConfig?.size === "8x8" ? 8 : 12);
  const rows = gridRows || (tileConfig?.size === "8x8" ? 8 : 12);
  const totalTiles = cols * rows;

  return (
    <div
      className="relative w-full h-full"
      style={{ width: "100%", height: "100%", ...style }}
    >
      <div
        className="grid bg-white"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
          gap: "0px",
          gridGap: "0px",
          rowGap: "0px",
          columnGap: "0px",
          width: "100%",
          height: "100%",
          backgroundColor: tileConfig?.groutColor || "#333333",
          position: "relative",
          aspectRatio: "1 / 1",
          maxWidth: "100%",
          maxHeight: "100%",
          margin: "auto",
          border: "none",
          outline: "none",
          boxShadow: "none",
        }}
      >
        {Array.from({ length: totalTiles }).map((_, index) => (
          <div
            key={index}
            className="relative bg-white"
            style={{
              width: "100%",
              aspectRatio: "1 / 1",
              overflow: "hidden",
              position: "relative",
              margin: "0",
              padding: "0",
              border: "none",
              outline: "none",
              boxShadow: "none",
            }}
          >
            {tileConfig?.tile?.image && (
              <img
                crossOrigin="anonymous"
                src={getAbsoluteUrl(tileConfig.tile.image)}
                alt={`Tile Block ${index + 1}`}
                className="absolute inset-0 w-full h-full object-cover"
                style={{
                  transform: `scale(2)`,
                  transformOrigin: `${index % 2 === 0 ? "0" : "100%"} ${index < cols ? "0" : "100%"}`,
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  objectFit: "cover",
                  margin: "0",
                  padding: "0",
                  border: "none",
                  outline: "none",
                }}
              />
            )}
            {tileConfig?.tile?.subMasks?.map((mask) => {
              const maskColor = typeof mask.color === 'object' ? mask.color.hexCode : mask.color;
              const isSelected = mask.id === selectedMaskId;
              const previewColor = previewMode && hoveredPaletteColor;
              const displayColor = isSelected && previewColor ? previewColor : maskColor || '#ffffff';
              return (
                <div
                  key={mask.id}
                  className="absolute inset-0"
                  style={{
                    backgroundColor: displayColor,
                    maskImage: mask.image ? `url(${mask.image})` : "none",
                    WebkitMaskImage: mask.image ? `url(${mask.image})` : "none",
                    maskSize: "cover",
                    WebkitMaskSize: "cover",
                    maskPosition: "center",
                    WebkitMaskPosition: "center",
                    maskRepeat: "no-repeat",
                    WebkitMaskRepeat: "no-repeat",
                    transform: `scale(2)`,
                    transformOrigin: `${index % 2 === 0 ? "0" : "100%"} ${index < cols ? "0" : "100%"}`,
                    zIndex: 1,
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    margin: "0",
                    padding: "0",
                    border: "none",
                    outline: "none",
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
} 