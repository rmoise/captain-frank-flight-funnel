/**
 * Utility functions for handling signatures
 */

// Save signature to localStorage
export const saveSignatureToLocalStorage = (dataUrl: string): void => {
  try {
    localStorage.setItem('signature', dataUrl);
    localStorage.setItem('hasSignature', 'true');
    console.log('Signature saved to localStorage');
  } catch (error) {
    console.error('Error saving signature to localStorage:', error);
  }
};

// Load signature from localStorage
export const loadSignatureFromLocalStorage = (): { signature: string | null; hasSignature: boolean } => {
  try {
    const signature = localStorage.getItem('signature');
    const hasSignature = localStorage.getItem('hasSignature') === 'true';
    return { signature, hasSignature };
  } catch (error) {
    console.error('Error loading signature from localStorage:', error);
    return { signature: null, hasSignature: false };
  }
};

// Create a simple signature data URL (for fallback)
export const createSimpleSignatureDataUrl = (width = 600, height = 200): string => {
  try {
    // Create a canvas element
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    // Get the context
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not get canvas context');
    }

    // Set up the context for drawing
    context.strokeStyle = '#000';
    context.lineWidth = 2;
    context.lineCap = 'round';
    context.lineJoin = 'round';

    // Clear the canvas
    context.clearRect(0, 0, width, height);

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

    // Convert to data URL with reduced quality PNG
    return canvas.toDataURL('image/png', 0.3);
  } catch (error) {
    console.error('Error creating simple signature:', error);
    return '';
  }
};

// Update store validation state for signature
export const updateStoreValidationState = (store: any): void => {
  try {
    const updatedValidationState = {
      ...store.validationState,
      isSignatureValid: true,
      stepValidation: {
        ...store.validationState.stepValidation,
        [6]: true
      },
      stepInteraction: {
        ...store.validationState.stepInteraction,
        [6]: true
      },
      _timestamp: Date.now()
    };

    store.updateValidationState(updatedValidationState);
  } catch (error) {
    console.error('Error updating store validation state:', error);
  }
};