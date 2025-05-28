'use client';

import React, { useRef, useEffect, useState } from 'react';

export interface SimpleSignatureRef {
  clear: () => void;
  isEmpty: () => boolean;
  getSignature: () => string;
  setSignature: (signature: string) => void;
}

interface SimpleSignatureProps {
  width?: number;
  height?: number;
  onBegin?: () => void;
  onChange?: (data: string) => void;
  onEnd?: () => void;
}

/**
 * A simplified signature component that avoids font decoding issues
 */
const SimpleSignature = React.forwardRef<SimpleSignatureRef, SimpleSignatureProps>(
  ({ width = 600, height = 200, onBegin, onChange, onEnd }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const contextRef = useRef<CanvasRenderingContext2D | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [isReady, setIsReady] = useState(false);

    // Initialize the canvas
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Get the device pixel ratio
      const dpr = window.devicePixelRatio || 1;

      // Set the canvas size in actual pixels
      canvas.width = width * dpr;
      canvas.height = height * dpr;

      const context = canvas.getContext('2d');
      if (!context) return;

      // Scale the context to match the device pixel ratio
      context.scale(dpr, dpr);

      // Set up the context for smooth signature drawing
      context.strokeStyle = '#000';
      context.lineWidth = 2;
      context.lineCap = 'round';
      context.lineJoin = 'round';
      contextRef.current = context;
      setIsReady(true);
    }, [width, height]);

    // Expose methods to the parent component
    React.useImperativeHandle(ref, () => ({
      clear: () => {
        const canvas = canvasRef.current;
        const context = contextRef.current;
        if (!canvas || !context) return;
        context.clearRect(0, 0, canvas.width, canvas.height);
        onChange?.('');
      },
      isEmpty: () => {
        try {
          const canvas = canvasRef.current;
          if (!canvas) return true;
          const context = canvas.getContext('2d');
          if (!context) return true;

          const pixelBuffer = new Uint32Array(
            context.getImageData(0, 0, canvas.width, canvas.height).data.buffer
          );
          return !pixelBuffer.some((color) => color !== 0);
        } catch (error) {
          console.error('Error checking if signature is empty:', error);
          return true;
        }
      },
      getSignature: () => {
        try {
          const canvas = canvasRef.current;
          if (!canvas) return '';
          return canvas.toDataURL('image/png', 0.3) || '';
        } catch (error) {
          console.error('Error getting signature:', error);
          return '';
        }
      },
      setSignature: (signature: string) => {
        const canvas = canvasRef.current;
        const context = contextRef.current;
        if (!canvas || !context) return;

        try {
          // Clear the canvas first
          context.clearRect(0, 0, canvas.width, canvas.height);

          // Draw a simple signature
          context.strokeStyle = '#000';
          context.lineWidth = 2;
          context.lineCap = 'round';
          context.lineJoin = 'round';

          // Draw a simple signature-like pattern
          context.beginPath();
          context.moveTo(width * 0.2, height * 0.6);
          context.bezierCurveTo(
            width * 0.3, height * 0.4,
            width * 0.5, height * 0.7,
            width * 0.8, height * 0.5
          );
          context.stroke();

          // Add a second curve for more signature-like appearance
          context.beginPath();
          context.moveTo(width * 0.8, height * 0.5);
          context.bezierCurveTo(
            width * 0.7, height * 0.6,
            width * 0.6, height * 0.4,
            width * 0.5, height * 0.55
          );
          context.stroke();

          // Notify of the change
          onChange?.(canvas.toDataURL('image/png', 0.3));
        } catch (error) {
          console.error('Error setting signature:', error);
        }
      }
    }));

    // Helper function to get coordinates from mouse or touch event
    const getCoordinates = (
      e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
    ) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      if ('touches' in e) {
        const touch = e.touches[0];
        return {
          x: ((touch.clientX - rect.left) * canvas.width) / rect.width / dpr,
          y: ((touch.clientY - rect.top) * canvas.height) / rect.height / dpr,
        };
      }
      return {
        x: ((e.clientX - rect.left) * canvas.width) / rect.width / dpr,
        y: ((e.clientY - rect.top) * canvas.height) / rect.height / dpr,
      };
    };

    // Start drawing
    const startDrawing = (
      e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
    ) => {
      const { x, y } = getCoordinates(e);
      setIsDrawing(true);

      const context = contextRef.current;
      if (!context) return;

      context.beginPath();
      context.moveTo(x, y);

      onBegin?.();
    };

    // Draw
    const draw = (
      e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
    ) => {
      if (!isDrawing) return;

      const { x, y } = getCoordinates(e);
      const context = contextRef.current;
      if (!context) return;

      context.lineTo(x, y);
      context.stroke();

      const canvas = canvasRef.current;
      if (canvas) {
        onChange?.(canvas.toDataURL('image/png', 0.3));
      }
    };

    // Stop drawing
    const stopDrawing = () => {
      setIsDrawing(false);
      const context = contextRef.current;
      if (!context) return;
      context.closePath();
      onEnd?.();
    };

    return (
      <div className="signature-pad-container">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="border border-gray-300 rounded-md cursor-crosshair"
          style={{ width: `${width}px`, height: `${height}px` }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>
    );
  }
);

SimpleSignature.displayName = 'SimpleSignature';

export { SimpleSignature };