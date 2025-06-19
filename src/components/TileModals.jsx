import { useState, useRef, useEffect } from "react";
import { IoArrowBack } from "react-icons/io5";
import { IoMdClose } from "react-icons/io";
import { useForm } from "react-hook-form";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function TileModals({ isOpen, onClose, tileConfig }) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm();
  const previewRef = useRef(null);
  const canvasRef = useRef(null);
  const [loadedImages, setLoadedImages] = useState(new Map());
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Size conversion logic
  const sizeToPx = {
    "8x8": 8, // 8 inches
    "12x12": 12, // 12 inches
  };

  // Convert size to pixels for display
  const getTileSizeInPx = (size) => {
    const inches = sizeToPx[size] || 12;
    // Reverse the scale - larger number for smaller tiles
    // 8x8 should be largest, 16x16 should be smallest
    const scale = 96 - inches * 4; // This will give us 64px for 8x8, 48px for 12x12
    return `${scale}px`;
  };

  // Get the actual pixel size for the current tile
  const tileBgSize = getTileSizeInPx(tileConfig?.size);
  const tileSizePx = tileBgSize;

  const thicknessToPx = {
    none: "0px",
    thin: "2px",
    thick: "6px",
  };
  const groutThicknessPx = thicknessToPx[tileConfig?.thickness] || "2px";

  // Reset form when modal is closed
  useEffect(() => {
    if (!isOpen) {
      reset();
      setIsFormOpen(false);
    }
  }, [isOpen, reset]);

  // Function to load and cache images
  const loadImage = (src) => {
    if (loadedImages.has(src)) {
      return Promise.resolve(loadedImages.get(src));
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        loadedImages.set(src, img);
        resolve(img);
      };

      img.onerror = (e) => {
        console.error("Error loading image:", src, e);
        reject(new Error(`Failed to load image: ${src}`));
      };

      img.src = src;
    });
  };

  const onSubmit = async (data) => {
    try {
      console.log("Generating PDF...");
      const pdf = await generatePDF(data);
      const pdfBlob = pdf.output("blob");
      console.log('PDF generated successfully');

      // Get the currently selected tile image
      let selectedTileImage = null;
      if (tileConfig?.tile?.image) {
        try {
          // Get the current tile image URL
          const currentTileImageUrl = tileConfig.tile.image;
          console.log("Capturing selected tile image:", currentTileImageUrl);
          
          // Fetch and convert the image
          const response = await fetch(currentTileImageUrl);
          const blob = await response.blob();
          
          // Create a temporary canvas to compress the image
          const img = new Image();
          img.src = URL.createObjectURL(blob);
          await new Promise((resolve) => {
            img.onload = resolve;
          });
          
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800; // Maximum width for the image
          const scale = Math.min(1, MAX_WIDTH / img.width);
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // Convert to base64 with compression
          selectedTileImage = canvas.toDataURL('image/jpeg', 0.6); // 60% quality
          console.log("Selected tile image captured and compressed successfully");
          
          // Clean up
          URL.revokeObjectURL(img.src);
        } catch (error) {
          console.error("Error capturing selected tile image:", error);
          alert("Error capturing tile image. Please try again.");
          return;
        }
      } else {
        console.error("No tile image selected");
        alert("Please select a tile pattern first.");
        return;
      }

      // Prepare request data with only essential fields
      const requestData = {
        name: data.name,
        email: data.email,
        phoneNumber: data.phone,
        referenceNumber: data.reference || "N/A",
        tileQuantity: data.quantity,
        tileSize: data.tileSize,
        image: selectedTileImage, // Add the compressed image
        tileName: tileConfig?.tile?.name || "N/A",
        tileColor: tileConfig?.tile?.color || tileConfig?.color || "N/A"
      };

      // Send data to API
      const response = await fetch("http://localhost:5000/api/tile-submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      const contentType = response.headers.get("content-type");

      if (!response.ok) {
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          console.error("Error response:", errorData);
          alert("Submission failed: " + (errorData.error || "Unknown error"));
        } else {
          const text = await response.text();
          console.error("Server returned HTML:", text);
          alert("Server error (possibly wrong endpoint).");
        }
        return;
      }

      const result = await response.json();
      console.log("Success:", result);
      
      // Download PDF
      const blobUrl = URL.createObjectURL(pdfBlob);
      const downloadLink = document.createElement("a");
      downloadLink.href = blobUrl;
      downloadLink.download = `tile-configuration-${Date.now()}.pdf`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(blobUrl);

      alert("Form submitted successfully!");
      
      // Reset form but don't close modal
      reset();
    } catch (error) {
      console.error("Error submitting form:", error);
      alert("Something went wrong. Please try again.");
    }
  };

  // Function to draw tiles on canvas
  const drawTilesOnCanvas = async (canvas, ctx) => {
    if (!canvas || !tileConfig?.tile) return;

    // Get the actual size in inches
    const sizeInInches = sizeToPx[tileConfig.size] || 12;

    // Reverse the grid size logic
    // Smaller tiles (16x16) should show more tiles, larger tiles (8x8) should show fewer
    const gridSize = Math.max(2, Math.ceil(sizeInInches / 4));
    const tileSize = canvas.width / gridSize;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    try {
      // Load base tile image
      let baseImage = null;
      if (tileConfig.tile.image) {
        try {
          baseImage = await loadImage(tileConfig.tile.image);
        } catch (error) {
          console.error("Failed to load base tile image:", error);
          return;
        }
      }

      // Draw tiles in a grid pattern
      for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
          const x = col * tileSize;
          const y = row * tileSize;
          const blockIndex = (col % 2) + 2 * (row % 2);
          const rotation = tileConfig.rotations?.[blockIndex] || 0;

          // Draw base tile with proper scaling and rotation
          if (baseImage) {
            ctx.save();
            ctx.translate(x + tileSize/2, y + tileSize/2);
            ctx.rotate((rotation * Math.PI) / 180);
            ctx.translate(-tileSize/2, -tileSize/2);
            
            // Maintain aspect ratio while scaling
            const scale = Math.min(
              tileSize / baseImage.width,
              tileSize / baseImage.height
            );
            const scaledWidth = baseImage.width * scale;
            const scaledHeight = baseImage.height * scale;

            const offsetX = (tileSize - scaledWidth) / 2;
            const offsetY = (tileSize - scaledHeight) / 2;

            ctx.drawImage(
              baseImage,
              offsetX,
              offsetY,
              scaledWidth,
              scaledHeight
            );
            ctx.restore();
          }

          // Draw masks with proper scaling and rotation
          if (tileConfig.tile.subMasks) {
            for (const mask of tileConfig.tile.subMasks) {
              if (mask.image) {
                try {
                  const maskImg = await loadImage(mask.image);
                  ctx.save();
                  ctx.translate(x + tileSize/2, y + tileSize/2);
                  ctx.rotate((rotation * Math.PI) / 180);
                  ctx.translate(-tileSize/2, -tileSize/2);

                  const scale = Math.min(tileSize / maskImg.width, tileSize / maskImg.height);
                  const scaledWidth = maskImg.width * scale;
                  const scaledHeight = maskImg.height * scale;
                  const offsetX = (tileSize - scaledWidth) / 2;
                  const offsetY = (tileSize - scaledHeight) / 2;

                  ctx.globalCompositeOperation = "source-in";
                  ctx.drawImage(maskImg, offsetX, offsetY, scaledWidth, scaledHeight);
                  ctx.globalCompositeOperation = "source-atop";
                  ctx.fillStyle = mask.color;
                  ctx.fillRect(0, 0, tileSize, tileSize);
                  ctx.restore();
                } catch (error) {
                  console.error("Failed to load mask image:", error);
                }
              }
            }
          }

          // Draw grout with proper scaling
          if (tileConfig.thickness !== "none") {
            const groutWidth = parseInt(groutThicknessPx);
            ctx.fillStyle = tileConfig.groutColor || "#333333";
            // Vertical grout
            ctx.fillRect(x - groutWidth / 2, y, groutWidth, tileSize);
            // Horizontal grout
            ctx.fillRect(x, y - groutWidth / 2, tileSize, groutWidth);
          }
        }
      }

      // Add size indicator with more visible styling
      ctx.save();
      ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
      ctx.font = "bold 20px Arial";
      ctx.fillText(`${sizeInInches}" x ${sizeInInches}"`, 20, 40);
      ctx.restore();
    } catch (error) {
      console.error("Error in drawing process:", error);
    }
  };

  // Effect to draw on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size to maintain aspect ratio
    canvas.width = 800;
    canvas.height = 800;

    // Draw tiles on canvas
    drawTilesOnCanvas(canvas, ctx).catch(error => {
      console.error("Error drawing tiles:", error);
    });
  }, [tileConfig]);

  const tileSizes = [
    { value: "8x8", label: '8" x 8"' },
    { value: "12x12", label: '12" x 12"' },
    { value: "Box", label: "Box" },
    { value: "custom", label: "Custom Size" },
  ];

  // Add this function before generatePDF
  const ensureCanvasDrawn = async (canvas) => {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds maximum wait time

      const checkCanvas = () => {
        try {
          if (!canvas) {
            console.error("Canvas is null in checkCanvas");
            reject(new Error("Canvas is null"));
            return;
          }

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            console.error("Canvas context is null");
            reject(new Error("Canvas context is null"));
            return;
          }

          const imageData = ctx.getImageData(0, 0, 1, 1);
          
          // Check if canvas has content
          if (imageData.data[3] !== 0) {
            console.log("Canvas is drawn");
            resolve();
            return;
          }

          attempts++;
          if (attempts >= maxAttempts) {
            console.error("Canvas drawing timeout");
            reject(new Error("Canvas drawing timeout"));
            return;
          }

          // Try again after a short delay
          setTimeout(checkCanvas, 100);
        } catch (error) {
          console.error("Error checking canvas:", error);
          reject(error);
        }
      };

      checkCanvas();
    });
  };

  const generatePDF = async (formData) => {
    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 0; // 1. Margin 0

      // Add logo (top left, larger)
      try {
        const logoUrl = "/Images/logo.png";
        pdf.addImage(logoUrl, "PNG", margin + 20, 10, 35, 28, undefined, 'FAST'); // Logo width 50px
        // Company info (top right)
        pdf.setFontSize(8);
        pdf.text("1325 Exchange Drive", pageWidth - margin - 20, 15, { align: "right" });
        pdf.text("Richardson, TX 75081", pageWidth - margin - 20, 20, { align: "right" });
        pdf.text("Phone: 214-352-0000", pageWidth - margin - 20, 25, { align: "right" });
      } catch (error) {
        console.error("Error adding logo:", error);
      }

      // Title centered below header
      pdf.setFontSize(14);
      pdf.text("Tile Configuration Details", pageWidth / 2, 40, { align: "center" });

      // Add red horizontal line below header
      pdf.setDrawColor(189, 91, 76); // #BD5B4C
      pdf.setLineWidth(0);
      pdf.line(margin + 30, 45, pageWidth - margin - 30, 45);

      let yPosition = 55; // Start content below the header/title
      let leftColX = margin + 20; // 20px margin from left
      let rightColX = margin + 120; // 20px margin from left

      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      pdf.text("Tile Information", leftColX, yPosition);

      pdf.setFontSize(10);
      pdf.setTextColor(51, 51, 51);
      const tileInfo = [
        { label: "Tile Name", value: tileConfig?.tile?.name || "N/A" },
        { label: "Tile Size", value: formData.tileSize },
        { label: "Quantity", value: formData.quantity },
        { label: "Color", value: tileConfig?.tile?.color || tileConfig?.color || "N/A" },
        { label: "Grout Color", value: tileConfig?.groutColor || "N/A" },
        { label: "Grout Thickness", value: tileConfig?.thickness || "N/A" },
        { label: "Environment", value: tileConfig?.environment?.label || "N/A" },
      ];
      let tileY = yPosition + 6;
      tileInfo.forEach((info) => {
        pdf.text(`${info.label}: ${info.value}`, leftColX, tileY);
        tileY += 6;
      });

      // 3. Personal Information (right column)
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      pdf.text("Personal Information", rightColX, yPosition, { align: "left" });  // Align left for consistent spacing

      pdf.setFontSize(10);
      pdf.setTextColor(51, 51, 51);
      const personalInfo = [
        { label: "Name", value: formData.name },
        { label: "Email", value: formData.email },
        { label: "Phone", value: formData.phone },
        { label: "Reference", value: formData.reference || "N/A" },
      ];
      let personalY = yPosition + 6;
      personalInfo.forEach((info) => {
        pdf.text(`${info.label}: ${info.value}`, rightColX, personalY, { align: "left" }); // Align left for consistent spacing
        personalY += 6;
      });

      // Move yPosition down for next section
      yPosition = Math.max(tileY, personalY) + 10;

      // Check if we need a new page before adding images
      if (yPosition > pageHeight - 150) {
        pdf.addPage();
        yPosition = 20;
      }

      // Capture and add the tile pattern with environment
      try {
        // Create a temporary container for the tile pattern
        const tempContainer = document.createElement('div');
        tempContainer.style.width = '80px';
        tempContainer.style.height = '80px';
        tempContainer.style.position = 'relative';
        tempContainer.style.overflow = 'hidden';
        tempContainer.style.backgroundColor = tileConfig?.groutColor || '#333333';
        document.body.appendChild(tempContainer);

        // Add a single tile
        const tile = document.createElement('div');
        tile.style.position = 'relative';
        tile.style.width = '100%';
        tile.style.height = '100%';
        tile.style.backgroundColor = 'white';
        tempContainer.appendChild(tile);

        // Add tile image if available
        if (tileConfig?.tile?.image) {
          const img = document.createElement('img');
          img.src = tileConfig.tile.image;
          img.style.width = '100%';
          img.style.height = '100%';
          img.style.objectFit = 'cover';
          img.style.opacity = '0.8';
          tile.appendChild(img);
        }

        // Capture the tile pattern
        const tilePatternCanvas = await html2canvas(tempContainer, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: null
        });

        // Clean up
        document.body.removeChild(tempContainer);

        // Calculate center positions for both images
        const totalWidth = pageWidth - (margin * 2);
        const patternWidth = 80;
        const envWidth = 80;
        const gap = 20; // Gap between images
        const totalImagesWidth = patternWidth + envWidth + gap;
        const startX = (totalWidth - totalImagesWidth) / 2 + margin;

        // Add tile pattern to PDF
        pdf.setFontSize(14);
        pdf.text("Tile Pattern", startX + (patternWidth / 2), yPosition, { align: "center" });
        pdf.text("Tile Environment", startX + patternWidth + gap + (envWidth / 2), yPosition, { align: "center" });
        yPosition += 10;

        const tilePatternImage = tilePatternCanvas.toDataURL('image/png');
        pdf.addImage(tilePatternImage, 'PNG', startX, yPosition, 70, 70);

        // Add environment image side by side
        if (tileConfig?.environment?.image) {
          // Create a temporary container for the environment
          const envContainer = document.createElement('div');
          envContainer.style.width = '80px';
          envContainer.style.height = '80px';
          envContainer.style.position = 'relative';
          envContainer.style.overflow = 'hidden';
          document.body.appendChild(envContainer);

          // Add environment image
          const envImg = document.createElement('img');
          envImg.src = tileConfig.environment.image;
          envImg.style.width = '100%';
          envImg.style.height = '100%';
          envImg.style.objectFit = 'cover';
          envContainer.appendChild(envImg);

          // Capture the environment
          const envCanvas = await html2canvas(envContainer, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: null
          });

          // Clean up
          document.body.removeChild(envContainer);

          const environmentImage = envCanvas.toDataURL('image/png');
          pdf.addImage(environmentImage, 'PNG', startX + patternWidth + gap, yPosition, 70, 70);
        }
        yPosition += 90; // Adjusted spacing after both images

        // Thank You Section (immediately after images)
        yPosition += 10;
        pdf.setFontSize(16);
        pdf.setTextColor(189, 91, 76); // #BD5B4C or your brand color
        pdf.text("Thank You!", pageWidth / 2, yPosition, { align: "center" });
        yPosition += 10;

        pdf.setFontSize(12);
        pdf.setTextColor(51, 51, 51);
        const thankYouMessage =
          "Thank you for shopping with us! We appreciate your business and hope you love your new tile selection. If you have any questions or need assistance, please don't hesitate to contact us.";
        const splitMessage = pdf.splitTextToSize(
          thankYouMessage,
          pageWidth - 40 // 20px margin on each side
        );
        pdf.text(splitMessage, pageWidth / 2, yPosition, { align: "center" });
        yPosition += splitMessage.length * 8 + 10;

        pdf.setFontSize(10);
        pdf.setTextColor(139, 0, 0);
        pdf.text("Contact Us:", pageWidth / 2, yPosition, { align: "center" });
        yPosition += 8;
        pdf.text("Email: support@tilesimulator.com", pageWidth / 2, yPosition, {
          align: "center",
        });
        yPosition += 8;
        pdf.text("Phone: 214-352-0000", pageWidth / 2, yPosition, {
          align: "center",
        });

      } catch (error) {
        console.error("Error capturing images:", error);
      }

      return pdf;
    } catch (error) {
      console.error("Error in PDF generation:", error);
      throw error;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-xl w-full max-w-5xl overflow-y-auto h-full max-h-[80vh] custom-scrollbar">
        {!isFormOpen ? (
          <div>
            <div className="flex justify-end">
              <button
                onClick={() => onClose()}
                className="bg-black bg-opacity-70 text-white rounded-full p-1 hover:bg-[#bd5b4c] transition=all duration-300 ease-in-out"
              >
                <IoMdClose size={16} />
              </button>
            </div>
            <div className="flex gap-6 flex-wrap">
              <div className="max-w-[30%] h-20">
                <img
                  src="/Images/logo.png"
                  alt=""
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="font-light font-poppins italic">
                <h3 className="text-lg tracking-wide font-normal">
                  Lili Cement Tile Line
                </h3>
                <a
                  href="https://www.google.com/maps?q=1325+Exchange+Drive+Richardson,+TX+75081"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-700 hover:text-[#bd5b4c] transition-all duration-300 ease-in-out"
                >
                  1325 Exchange Drive <br /> Richardson, TX 75081
                </a>
                <br />
                <a
                  href="tel:2143520000"
                  className="text-sm text-gray-700 hover:text-[#bd5b4c] transition-all duration-300 ease-in-out"
                >
                  Tel: 214-352-0000
                </a>
                <br />
                <a
                  href="fax:2153520002"
                  className="text-sm text-gray-700 hover:text-[#bd5b4c] transition-all duration-300 ease-in-out"
                >
                  Fax: 215-352-0002
                </a>
              </div>

              <div className="font-light font-poppins">
                <br />
                <a
                  href="https://www.google.com/maps?q=8+East+Stow+Road+Suite+2000+Marlton,+NJ+08053"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-700 hover:text-[#bd5b4c] transition-all duration-300 ease-in-out"
                >
                  8 East Stow Road <br /> Suite 2000 <br /> Marlton, NJ 08053
                </a>
                <br />
                <a
                  href="tel:8569881802"
                  className="text-sm text-gray-700 hover:text-[#bd5b4c] transition-all duration-300 ease-in-out"
                >
                  Phone: 856-988-1802
                </a>{" "}
                <br />
                <a
                  href="fax:8569881803"
                  className="text-sm text-gray-700 hover:text-[#bd5b4c] transition-all duration-300 ease-in-out"
                >
                  Fax: 856-988-1803
                </a>
              </div>
            </div>

            {/* Configuration Details */}
            <div className="rounded-lg pt-4 font-poppins font-light mt-4 mb-4 text-sm space-y-2">
              <h3 className="font-semibold font-poppins uppercase text-lg ">
                Selected Configuration:
              </h3>
              <p>Tile Name: {tileConfig?.tile?.name || "N/A"}</p>
              <p>Tile Size: {tileConfig?.size}</p>
              <p>Color: {tileConfig?.color}</p>
              <p>Grout Color: {tileConfig?.groutColor}</p>
              <p>Grout Thickness: {tileConfig?.thickness}</p>
              {tileConfig?.environment && (
                <p>Environment: {tileConfig.environment.label}</p>
              )}
            </div>

            <div
              ref={previewRef}
              className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-10 mb-8"
            >
              {/* Tile Pattern Without Environment */}
              <div className="rounded-lg">
                <h3 className="mb-1 font-poppins">Tile Pattern</h3>
                <div
                  className="w-full rounded-lg overflow-hidden relative"
                  style={{
                    position: "relative",
                    overflow: "hidden",
                    height: "300px",
                    width: "100%",
                  }}
                >
                  <div className="relative w-full h-full">
                    <div
                      className="grid bg-white"
                      style={{
                        gridTemplateColumns: `repeat(${tileConfig?.size === "8x8" ? 9 : 12}, minmax(0, 1fr))`,
                        gridTemplateRows: `repeat(${tileConfig?.size === "8x8" ? 6 : 9}, minmax(0, 1fr))`,
                        gap: "0px",
                        width: "100%",
                        height: "100%",
                        backgroundColor: tileConfig?.groutColor || "#333333",
                        position: "relative",
                        aspectRatio: "1 / 1",
                        maxWidth: "100%",
                        maxHeight: "100%",
                        margin: "auto",
                      }}
                    >
                      {Array.from({ length: (tileConfig?.size === "8x8" ? 9 : 12) * (tileConfig?.size === "8x8" ? 6 : 9) }).map((_, index) => {
                        const patternIndex = (index % 2) + 2 * (Math.floor(index / (tileConfig?.size === "8x8" ? 9 : 12)) % 2);
                        return (
                          <div
                            key={index}
                            className="relative bg-white"
                            style={{
                              width: "100%",
                              aspectRatio: "1 / 1",
                              overflow: "hidden",
                              position: "relative",
                            }}
                          >
                            {tileConfig?.tile?.image && (
                              <img
                                src={tileConfig.tile.image}
                                alt={`Tile Block ${index + 1}`}
                                className="absolute inset-0 w-full h-full object-cover"
                                style={{
                                  transform: `scale(2)`,
                                  transformOrigin: `${index % 2 === 0 ? "0" : "100%"} ${index < (tileConfig?.size === "8x8" ? 9 : 12) ? "0" : "100%"}`,
                                  position: "absolute",
                                  top: 0,
                                  left: 0,
                                  right: 0,
                                  bottom: 0,
                                  objectFit: "cover",
                                }}
                              />
                            )}
                            {tileConfig?.tile?.subMasks?.map((mask) => (
                              <div
                                key={mask.id}
                                className="absolute inset-0"
                                style={{
                                  backgroundColor: mask.color,
                                  maskImage: mask.image ? `url(${mask.image})` : "none",
                                  WebkitMaskImage: mask.image ? `url(${mask.image})` : "none",
                                  maskSize: "cover",
                                  WebkitMaskSize: "cover",
                                  maskPosition: "center",
                                  WebkitMaskPosition: "center",
                                  maskRepeat: "no-repeat",
                                  WebkitMaskRepeat: "no-repeat",
                                  transform: `scale(2)`,
                                  transformOrigin: `${index % 2 === 0 ? "0" : "100%"} ${index < (tileConfig?.size === "8x8" ? 9 : 12) ? "0" : "100%"}`,
                                  zIndex: 1,
                                  position: "absolute",
                                  top: 0,
                                  left: 0,
                                  right: 0,
                                  bottom: 0,
                                }}
                              />
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tile Pattern With Environment */}
              {tileConfig?.environment && (
                <div className="rounded-lg">
                  <h3 className="mb-1 font-poppins">Tile Environment</h3>
                  <div
                    className="w-full rounded-lg overflow-hidden relative"
                    style={{
                      position: "relative",
                      overflow: "hidden",
                      height: "100%",
                      maxHeight: "300px",
                    }}
                  >
                    <img
                      src={tileConfig.environment.image}
                      alt="Room preview"
                      className="w-full h-full object-cover absolute inset-0"
                      style={{ zIndex: 3 }}
                    />
                    <div className="relative w-full max-h-[300px]">
                      <div
                        className="grid bg-white"
                        style={{
                          gridTemplateColumns: `repeat(${tileConfig?.size === "8x8" ? 8 : 12}, 1fr)`,
                          gridTemplateRows: `repeat(${tileConfig?.size === "8x8" ? 8 : 12}, 1fr)`,
                          gap: "0",
                          width: "100%",
                          height: "100%",
                          backgroundColor: tileConfig?.groutColor || "#333333",
                          position: "relative",
                          aspectRatio: "1 / 1",
                          maxWidth: "100%",
                          maxHeight: "100%",
                          margin: "auto",
                          display: "grid",
                          gridGap: "0",
                          padding: "0",
                          boxShadow: "none",
                        }}
                      >
                        {Array.from({ length: tileConfig?.size === "8x8" ? 64 : 144 }).map((_, index) => (
                          <div
                            key={index}
                            className="relative bg-white"
                            style={{
                              aspectRatio: "1 / 1",
                              transform: `rotate(${index % 2 === 0 ? "0deg" : "180deg"})`,
                              boxShadow: "none",
                            }}
                          >
                            {tileConfig?.tile?.image && (
                              <img
                                src={tileConfig.tile.image}
                                alt={`Tile Block ${index + 1}`}
                                className="absolute inset-0 w-full h-full object-cover"
                                style={{
                                  transform: `scale(2)`,
                                  transformOrigin: `${index % 2 === 0 ? "0" : "100%"} ${index < (tileConfig?.size === "8x8" ? 8 : 12) ? "0" : "100%"}`,
                                  opacity: 0.8,
                                  boxShadow: "none",
                                }}
                              />
                            )}
                            {tileConfig?.tile?.subMasks?.map((mask) => (
                              <div
                                key={mask.id}
                                className="absolute inset-0"
                                style={{
                                  backgroundColor: mask.color,
                                  maskImage: mask.image ? `url(${mask.image})` : "none",
                                  WebkitMaskImage: mask.image ? `url(${mask.image})` : "none",
                                  maskSize: "cover",
                                  WebkitMaskSize: "50px",
                                  maskPosition: "center",
                                  WebkitMaskPosition: "center",
                                  maskRepeat: "no-repeat",
                                  WebkitMaskRepeat: "no-repeat",
                                  transform: `scale(2)`,
                                  transformOrigin: `${index % 2 === 0 ? "0" : "100%"} ${index < (tileConfig?.size === "8x8" ? 8 : 12) ? "0" : "100%"}`,
                                  opacity: 0.8,
                                  zIndex: 1,
                                  boxShadow: "none",
                                }}
                              />
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              className="mt-6 bg-red-600 text-white px-4 py-3 rounded-md hover:bg-red-700 text-base  w-full  font-poppins"
              onClick={() => setIsFormOpen(true)}
            >
              Send Yourself a Copy!
            </button>
          </div>
        ) : (
          // Form Screen
          <div className="font-poppins">
            <button
              onClick={() => setIsFormOpen(false)}
              className="flex items-center text-[#bd5b4c] hover:text-red-700 mb-6 transition-all duration-300 ease-in-out"
            >
              <IoArrowBack size={16} />
              <span className="ml-1 font-light">Back</span>
            </button>
            <h2 className="text-2xl  mb-6">Your Details</h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

              {/* Personal Information */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm text-gray-700 mb-2 font-light">
                    Name
                  </label>
                  <input
                    type="text"
                    {...register("name", { required: "Name is required" })}
                    className="block w-full rounded-md border border-gray-400 shadow-sm focus:border-black focus:ring-black px-4 py-3 text-base font-light"
                  />
                  {errors.name && (
                    <p className="text-[#bd5b4c] text-sm mt-1 font-light">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm  text-gray-700 mb-2 font-light">
                    Email
                  </label>
                  <input
                    type="email"
                    {...register("email", {
                      required: "Email is required",
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: "Invalid email address",
                      },
                    })}
                    className="block w-full rounded-md border border-gray-400  shadow-sm focus:border-black focus:ring-black px-4 py-3 text-base font-light"
                  />
                  {errors.email && (
                    <p className="text-[#bd5b4c] text-sm mt-1 font-light">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm  text-gray-700 mb-2 font-light">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    {...register("phone", {
                      required: "Phone number is required",
                    })}
                    className="block w-full rounded-md border border-gray-400  shadow-sm focus:border-black focus:ring-black px-4 py-3 text-base font-light"
                  />
                  {errors.phone && (
                    <p className="text-[#bd5b4c] text-sm mt-1 font-light">
                      {errors.phone.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm  text-gray-700 mb-2 font-light">
                    Reference Number
                  </label>
                  <input
                    type="text"
                    {...register("reference")}
                    className="block w-full rounded-md border border-gray-400 shadow-sm focus:border-black focus:ring-black px-4 py-3 text-base font-light"
                    placeholder="Optional"
                  />
                </div>
              </div>
                   
              {/* Tile Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-light text-gray-700 mb-2">
                    Tile Quantity
                  </label>
                  <input
                    type="number"
                    {...register("quantity", {
                      required: "Quantity is required",
                      min: { value: 1, message: "Quantity must be at least 1" },
                    })}
                    className="block w-full rounded-md border border-gray-400  shadow-sm focus:border-black focus:ring-black px-4 py-3 text-base font-light"
                    min="1"
                  />
                  {errors.quantity && (
                    <p className="text-[#bd5b4c] text-sm mt-1 font-light">
                      {errors.quantity.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-light text-gray-700 mb-2">
                    Tile Size
                  </label>
                  <select
                    {...register("tileSize", {
                      required: "Tile size is required",
                    })}
                    className="block w-full rounded-md border border-gray-400  shadow-sm focus:border-black focus:ring-black px-4 py-3 text-base font-light"
                  >
                    <option value="" className="font-light font-poppins">
                      Select size
                    </option>
                    {tileSizes.map((size) => (
                      <option
                        key={size.value}
                        value={size.value}
                        className="font-light font-poppins"
                      >
                        {size.label}
                      </option>
                    ))}
                  </select>
                  {errors.tileSize && (
                    <p className="text-[#bd5b4c] text-sm mt-1 font-light">
                      {errors.tileSize.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Additional Information */}
              <div>
                <label className="block text-sm  text-gray-700 mb-2 font-light">
                  Message
                </label>
                <textarea
                  {...register("message")}
                  rows="4"
                  className="block w-full rounded-md border border-gray-400  shadow-sm focus:border-black focus:ring-black px-4 py-3 text-base font-light"
                  placeholder="Any additional information or requirements..."
                />
              </div>

              {/* Form Actions */}
              <div className="flex gap-4 mt-4 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setIsFormOpen(false);
                    onClose();
                  }}
                  className="flex-1 bg-gray-600 text-white px-4 py-3 rounded-md hover:bg-gray-700 text-base"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-red-600 text-white px-4 py-3 rounded-md hover:bg-red-700 text-base"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
