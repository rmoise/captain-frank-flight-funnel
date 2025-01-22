import { vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

// Mock matchMedia
window.matchMedia =
  window.matchMedia ||
  function () {
    return {
      matches: false,
      addListener: function () {},
      removeListener: function () {},
    };
  };

// Mock console methods to reduce noise in tests
console.log = vi.fn();
console.error = vi.fn();
console.warn = vi.fn();

// Reset all mocks before each test
beforeEach(() => {
  vi.resetAllMocks();
});
