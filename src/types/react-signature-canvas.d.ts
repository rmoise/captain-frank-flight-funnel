declare module 'react-signature-canvas' {
  import * as React from 'react';

  export interface SignatureCanvasProps extends React.CanvasHTMLAttributes<HTMLCanvasElement> {
    canvasProps?: React.CanvasHTMLAttributes<HTMLCanvasElement>;
    clearOnResize?: boolean;
    minWidth?: number;
    maxWidth?: number;
    penColor?: string;
    velocityFilterWeight?: number;
    backgroundColor?: string;
  }

  export default class SignatureCanvas extends React.Component<SignatureCanvasProps> {
    clear(): void;
    isEmpty(): boolean;
    toDataURL(type?: string): string;
    fromDataURL(dataURL: string): void;
  }
}