import React, { useRef, useEffect, useState } from 'react';

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
    const [isReady, setIsReady] = useState(false);

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
      context.shadowBlur = 0;
      context.shadowColor = 'transparent';
      contextRef.current = context;
      setIsReady(true);
    }, [width, height]);

    React.useImperativeHandle(ref, () => ({
      clear: () => {
        const canvas = canvasRef.current;
        const context = contextRef.current;
        if (!canvas || !context) return;
        context.clearRect(0, 0, canvas.width, canvas.height);
        onChange?.('');
      },
      toDataURL: () => {
        // Convert to data URL with reduced quality PNG
        return canvasRef.current?.toDataURL('image/png', 0.5) || '';
      },
      isEmpty: () => {
        const canvas = canvasRef.current;
        if (!canvas) return true;
        const context = canvas.getContext('2d');
        if (!context) return true;

        const pixelBuffer = new Uint32Array(
          context.getImageData(0, 0, canvas.width, canvas.height).data.buffer
        );
        return !pixelBuffer.some((color) => color !== 0);
      },
      fromDataURL: (dataUrl: string) => {
        if (!isReady) return;
        const canvas = canvasRef.current;
        const context = contextRef.current;
        if (!canvas || !context) return;

        const img = new Image();
        img.onload = () => {
          const dpr = window.devicePixelRatio || 1;
          context.clearRect(0, 0, canvas.width, canvas.height);

          // Reset any transformations
          context.setTransform(1, 0, 0, 1, 0, 0);

          // Clear and scale the context
          context.clearRect(0, 0, canvas.width, canvas.height);
          context.scale(dpr, dpr);

          // Draw the image at the correct scale
          context.drawImage(img, 0, 0, width, height);

          // Reset the drawing settings
          context.strokeStyle = '#000';
          context.lineWidth = 2;
          context.lineCap = 'round';
          context.lineJoin = 'round';

          onChange?.(dataUrl);
        };
        img.src = dataUrl;
      },
    }));

    const getCoordinates = (
      e:
        | React.MouseEvent<HTMLCanvasElement>
        | React.TouchEvent<HTMLCanvasElement>
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

    const startDrawing = (
      e:
        | React.MouseEvent<HTMLCanvasElement>
        | React.TouchEvent<HTMLCanvasElement>
    ) => {
      const { x, y } = getCoordinates(e);
      setIsDrawing(true);
      onBegin?.();

      // Start the path
      if (contextRef.current) {
        contextRef.current.beginPath();
        contextRef.current.moveTo(x, y);
      }
    };

    const draw = (
      e:
        | React.MouseEvent<HTMLCanvasElement>
        | React.TouchEvent<HTMLCanvasElement>
    ) => {
      if (!isDrawing) return;
      e.preventDefault();

      const point = getCoordinates(e);
      if (!point) return;

      const ctx = contextRef.current;
      if (!ctx) return;

      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    };

    const stopDrawing = () => {
      setIsDrawing(false);
      if (onChange && canvasRef.current) {
        onChange(canvasRef.current.toDataURL());
      }
      onEnd?.();
    };

    return (
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onMouseDown={startDrawing}
        onMouseMove={(e) => {
          if (isDrawing) draw(e);
        }}
        onMouseUp={() => {
          stopDrawing();
          onEnd?.();
        }}
        onMouseOut={() => {
          stopDrawing();
          onEnd?.();
        }}
        onTouchStart={startDrawing}
        onTouchMove={(e) => {
          if (isDrawing) draw(e);
        }}
        onTouchEnd={() => {
          stopDrawing();
          onEnd?.();
        }}
        style={{
          width: '100%',
          height: '100%',
          touchAction: 'none',
          border: '1px solid #E5E7EB',
          borderRadius: '0.5rem',
          cursor: 'crosshair',
        }}
      />
    );
  }
);

SignaturePad.displayName = 'SignaturePad';

export default SignaturePad;
