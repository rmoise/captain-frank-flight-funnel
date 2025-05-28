import React, { useRef, useEffect, useState } from "react";

export interface SignaturePadRef {
  clear: () => void;
  toDataURL: () => string;
  isEmpty: () => boolean;
  fromDataURL: (dataUrl: string) => void;
}

interface SignaturePadProps {
  width?: number;
  height?: number;
  onBegin?: () => void;
  onChange?: (data: string) => void;
  onEnd?: () => void;
}

const SignaturePad = React.forwardRef<SignaturePadRef, SignaturePadProps>(
  ({ width = 600, height = 200, onBegin, onChange, onEnd }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const contextRef = useRef<CanvasRenderingContext2D | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const hasContentRef = useRef(false);
    const pendingSignatureRef = useRef<string | null>(null);
    const scaleRef = useRef(1);
    const initAttempts = useRef(0);
    const maxInitAttempts = 5;
    const justLoadedImageRef = useRef(false);
    const justLoadedImageTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const strokePointsCountRef = useRef(0);
    const lastPointRef = useRef<{ x: number; y: number } | null>(null);
    const strokeTotalDistanceRef = useRef(0);

    // Initialize canvas on mount
    useEffect(() => {
      const initCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) {
          // If we still don't have a canvas ref and haven't exceeded max attempts,
          // try again shortly
          if (initAttempts.current < maxInitAttempts) {
            initAttempts.current += 1;
            console.log(
              `Canvas not available yet, attempt ${initAttempts.current}/${maxInitAttempts}`
            );
            setTimeout(initCanvas, 100);
          }
          return;
        }

        console.log("Canvas initialization starting");

        // Get device pixel ratio
        const dpr = window.devicePixelRatio || 1;
        scaleRef.current = dpr;

        // Set display size (CSS)
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        // Set actual size in memory (scaled for DPI)
        canvas.width = width * dpr;
        canvas.height = height * dpr;

        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) {
          console.error("Failed to get canvas context");
          return;
        }

        // Scale drawing operations by the device pixel ratio, but
        // don't scale the CSS width and height
        context.scale(dpr, dpr);
        context.lineCap = "round";
        context.lineJoin = "round";
        context.lineWidth = 2.5;
        context.strokeStyle = "#000";

        contextRef.current = context;
        console.log("Canvas initialization complete");

        // Apply any pending signature if it exists
        if (pendingSignatureRef.current) {
          console.log("Applying pending signature after canvas init");
          fromDataURLInternal(pendingSignatureRef.current);
          pendingSignatureRef.current = null;
        }
      };

      // Start initialization
      initCanvas();

      // Cleanup function
      return () => {
        initAttempts.current = 0;
        if (justLoadedImageTimeoutRef.current) {
          clearTimeout(justLoadedImageTimeoutRef.current);
        }
      };
    }, [width, height]);

    const startDrawing = (
      e:
        | React.MouseEvent<HTMLCanvasElement>
        | React.TouchEvent<HTMLCanvasElement>
    ) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      const context = contextRef.current;
      if (!canvas || !context) return;

      // Clear the justLoadedImage flag and its timeout if drawing starts
      if (justLoadedImageTimeoutRef.current) {
        clearTimeout(justLoadedImageTimeoutRef.current);
        justLoadedImageTimeoutRef.current = null;
      }
      justLoadedImageRef.current = false;

      setIsDrawing(true);
      hasContentRef.current = false; // Reset at start, will be set true if draw occurs

      let clientX, clientY;

      if ("touches" in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      const rect = canvas.getBoundingClientRect();
      const actualX = clientX - rect.left;
      const actualY = clientY - rect.top;

      context.beginPath();
      context.moveTo(actualX, actualY);

      strokePointsCountRef.current = 1; // Start with 1 point
      lastPointRef.current = { x: actualX, y: actualY };
      strokeTotalDistanceRef.current = 0;

      if (onBegin) onBegin();
    };

    const draw = (
      e:
        | React.MouseEvent<HTMLCanvasElement>
        | React.TouchEvent<HTMLCanvasElement>
    ) => {
      e.preventDefault();
      if (!isDrawing) return;

      const canvas = canvasRef.current;
      const context = contextRef.current;
      if (!canvas || !context) return;

      let clientX, clientY;

      if ("touches" in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      const rect = canvas.getBoundingClientRect();
      const actualX = clientX - rect.left;
      const actualY = clientY - rect.top;

      if (lastPointRef.current) {
        const dist = Math.sqrt(
          Math.pow(actualX - lastPointRef.current.x, 2) +
            Math.pow(actualY - lastPointRef.current.y, 2)
        );
        strokeTotalDistanceRef.current += dist;
      }

      context.lineTo(actualX, actualY);
      context.stroke();

      strokePointsCountRef.current++;
      lastPointRef.current = { x: actualX, y: actualY };
      hasContentRef.current = true; // Actual drawing has occurred
    };

    const endDrawing = () => {
      if (!isDrawing) return;

      const context = contextRef.current;
      if (context) {
        context.closePath();
      }
      setIsDrawing(false); // Set before checks

      const MIN_STROKE_POINTS_FOR_SIGNATURE = 15;
      const MIN_STROKE_DISTANCE_FOR_SIGNATURE = 100;

      // Check if the stroke was substantial enough
      if (
        strokePointsCountRef.current < MIN_STROKE_POINTS_FOR_SIGNATURE ||
        strokeTotalDistanceRef.current < MIN_STROKE_DISTANCE_FOR_SIGNATURE
      ) {
        console.log(
          `endDrawing: Stroke too short/small. Points: ${
            strokePointsCountRef.current
          }, Distance: ${strokeTotalDistanceRef.current.toFixed(
            2
          )}. Treating as empty.`
        );
        hasContentRef.current = false; // Mark as empty
      } else {
        // If draw was called, hasContentRef would be true.
        // This ensures it remains true if the stroke is substantial.
        if (strokePointsCountRef.current > 0) {
          // Ensure draw was actually called
          hasContentRef.current = true;
        }
        console.log(
          `endDrawing: Stroke considered substantial. Points: ${
            strokePointsCountRef.current
          }, Distance: ${strokeTotalDistanceRef.current.toFixed(2)}.`
        );
      }

      // Defer operations that depend on the canvas being fully updated
      requestAnimationFrame(() => {
        if (canvasRef.current && onChange) {
          // If hasContentRef is true, it means draw() was called.
          // Otherwise, it was likely just a click without drawing.
          if (hasContentRef.current) {
            const dataUrl = canvasRef.current.toDataURL();
            console.log(
              `endDrawing: hasContent is true, calling onChange with dataUrl length: ${dataUrl.length}`
            );
            // The setTimeout 0 was already a form of deferral,
            // requestAnimationFrame is a more standard way for rendering-related deferrals.
            onChange(dataUrl);
          } else {
            console.log(
              "endDrawing: hasContent is false (likely a click), calling onChange with empty string."
            );
            onChange("");
          }
        }

        if (onEnd) onEnd();
      });
    };

    const clearCanvas = () => {
      const canvas = canvasRef.current;
      const context = contextRef.current;
      if (!canvas || !context) return;

      // Clear the justLoadedImage flag and its timeout if canvas is cleared
      if (justLoadedImageTimeoutRef.current) {
        clearTimeout(justLoadedImageTimeoutRef.current);
        justLoadedImageTimeoutRef.current = null;
      }
      justLoadedImageRef.current = false;

      context.clearRect(
        0,
        0,
        canvas.width / scaleRef.current,
        canvas.height / scaleRef.current
      );
      hasContentRef.current = false; // Explicitly set to false on clear
      strokePointsCountRef.current = 0; // Reset
      strokeTotalDistanceRef.current = 0; // Reset
      lastPointRef.current = null; // Reset

      console.log("Canvas cleared successfully, hasContentRef set to false");

      if (onChange) {
        onChange("");
      }
    };

    const fromDataURLInternal = (dataUrl: string) => {
      if (!dataUrl || dataUrl.length < 100) {
        console.log("Invalid signature data URL, not restoring");
        return;
      }

      const canvas = canvasRef.current;
      const context = contextRef.current;

      // If canvas or context not available, save for later
      if (!canvas || !context) {
        console.log(
          "Canvas not ready for image load, storing for later application"
        );
        pendingSignatureRef.current = dataUrl;
        return;
      }

      // Set loading state
      setIsLoading(true);

      console.log("Loading signature from dataURL", {
        dataLength: dataUrl.length,
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
      });

      // Create image and load data
      const image = new Image();

      image.onload = () => {
        if (!canvas || !context) {
          console.log("Canvas lost during image load");
          setIsLoading(false);
          return;
        }

        // Clear existing content
        context.clearRect(
          0,
          0,
          canvas.width / scaleRef.current,
          canvas.height / scaleRef.current
        );

        // Draw the image, taking into account the scale
        context.drawImage(
          image,
          0,
          0,
          canvas.width / scaleRef.current,
          canvas.height / scaleRef.current
        );

        // Update content state AFTER drawing is complete
        hasContentRef.current = true;
        justLoadedImageRef.current = true; // Set the flag indicating an image was just loaded

        // Clear any pending timeout for resetting this flag, as we're setting it fresh
        if (justLoadedImageTimeoutRef.current) {
          clearTimeout(justLoadedImageTimeoutRef.current);
          justLoadedImageTimeoutRef.current = null;
        }
        // Set a timeout to reset this flag automatically
        justLoadedImageTimeoutRef.current = setTimeout(() => {
          console.log(
            "Resetting justLoadedImageRef after timeout from image load."
          );
          justLoadedImageRef.current = false;
          justLoadedImageTimeoutRef.current = null;
        }, 500); // 500ms should be enough for initial validation pass

        setIsLoading(false);

        console.log(
          "Notifying onChange after image load (with increased delay)"
        );
        if (onChange) {
          // Increased delay to ensure canvas paints before isEmpty check via onChange
          setTimeout(() => {
            onChange(dataUrl);
          }, 100); // Increased from 0 to 100ms
        }

        console.log("Signature loaded from dataURL successfully");
      };

      image.onerror = (err) => {
        console.error("Error loading signature image:", err);
        setIsLoading(false);
      };

      // Set the source - this triggers the load
      image.src = dataUrl;
    };

    const isEmptyInternal = (): boolean => {
      if (justLoadedImageRef.current) {
        console.log(
          "isEmpty: Image was recently loaded via fromDataURL. Assuming NOT empty for this check."
        );
        // The flag will be auto-cleared by its own timeout,
        // or by startDrawing/clearCanvas.
        return false;
      }

      const canvas = canvasRef.current;
      const context = contextRef.current;

      if (!canvas || !context) {
        if (hasContentRef.current) {
          console.log(
            "isEmpty: Canvas/context not ready, but drawing/loading was initiated. Assuming NOT empty for now."
          );
          return false;
        } else {
          console.log(
            "isEmpty: Canvas/context not ready and no drawing/loading action recorded. Assuming empty."
          );
          return true;
        }
      }

      if (!hasContentRef.current) {
        console.log(
          "isEmpty: No drawing/loading action recorded (hasContentRef is false). Assuming empty."
        );
        return true;
      }

      console.log(
        "isEmpty: Checking canvas pixels as hasContentRef is true and canvas is ready.",
        {
          canvasPhysicalWidth: canvas.width,
          canvasPhysicalHeight: canvas.height,
          scale: scaleRef.current,
        }
      );

      try {
        const logicalWidth = canvas.width / scaleRef.current;
        const logicalHeight = canvas.height / scaleRef.current;

        const gridSize = 6;
        const stepX = logicalWidth / gridSize;
        const stepY = logicalHeight / gridSize;

        let markedPixelCount = 0;
        const minMarkedPixelsForSignature = 1; // Minimum number of grid cells that must have a mark
        const sampleBoxSize = 3; // Physical pixels (e.g., 3x3)

        for (let i = 0; i < gridSize; i++) {
          for (let j = 0; j < gridSize; j++) {
            const logicalSampleX = i * stepX;
            const logicalSampleY = j * stepY;

            // Aim to center the 3x3 sample box around the logical point
            const physicalCenterX = Math.floor(
              logicalSampleX * scaleRef.current
            );
            const physicalCenterY = Math.floor(
              logicalSampleY * scaleRef.current
            );

            let physicalSampleX =
              physicalCenterX - Math.floor(sampleBoxSize / 2);
            let physicalSampleY =
              physicalCenterY - Math.floor(sampleBoxSize / 2);

            // Clamp coordinates to be within canvas boundaries
            physicalSampleX = Math.max(0, physicalSampleX);
            physicalSampleY = Math.max(0, physicalSampleY);

            physicalSampleX = Math.min(
              canvas.width - sampleBoxSize,
              physicalSampleX
            );
            physicalSampleY = Math.min(
              canvas.height - sampleBoxSize,
              physicalSampleY
            );

            if (
              physicalSampleX < 0 || // Should be redundant now due to clamping
              physicalSampleX + sampleBoxSize > canvas.width ||
              physicalSampleY < 0 || // Should be redundant now due to clamping
              physicalSampleY + sampleBoxSize > canvas.height
            ) {
              console.warn(
                "isEmpty: Sample box out of physical bounds AFTER CLAMPING (should not happen)",
                {
                  physicalSampleX,
                  physicalSampleY,
                  sampleBoxSize,
                  canvasWidth: canvas.width,
                  canvasHeight: canvas.height,
                }
              );
              continue; // Should not happen if clamping is correct
            }

            const imageData = context.getImageData(
              physicalSampleX,
              physicalSampleY,
              sampleBoxSize,
              sampleBoxSize
            );
            const data = imageData.data;
            let foundPixelInBox = false;
            for (let k = 0; k < data.length; k += 4) {
              if (data[k + 3] > 0) {
                // Check alpha channel
                foundPixelInBox = true;
                break;
              }
            }

            if (foundPixelInBox) {
              markedPixelCount++;
            }
          }
        }

        if (markedPixelCount >= minMarkedPixelsForSignature) {
          console.log(
            `isEmpty: Canvas is NOT empty. Marked pixels: ${markedPixelCount} (threshold: ${minMarkedPixelsForSignature})`
          );
          return false;
        } else {
          console.log(
            `isEmpty: Canvas IS empty after pixel check. Marked pixels: ${markedPixelCount} (threshold: ${minMarkedPixelsForSignature})`
          );
          return true;
        }
      } catch (e) {
        console.error("isEmpty: Error checking canvas emptiness:", e);
        return true;
      }
    };

    // Expose methods via ref
    React.useImperativeHandle(ref, () => ({
      clear: clearCanvas,
      toDataURL: () => canvasRef.current?.toDataURL() || "",
      isEmpty: isEmptyInternal,
      fromDataURL: fromDataURLInternal,
    }));

    return (
      <div className="relative w-full h-full border border-gray-300 rounded-md bg-gray-50 overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-full touch-none cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={endDrawing}
          onMouseLeave={endDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={endDrawing}
        />
      </div>
    );
  }
);

SignaturePad.displayName = "SignaturePad";

export default SignaturePad;
