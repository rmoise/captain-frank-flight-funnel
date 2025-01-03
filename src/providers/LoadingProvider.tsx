'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

interface LoadingContextType {
  showLoading: (message?: string) => void;
  hideLoading: () => void;
  setLoading: (isLoading: boolean, message?: string) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

interface LoadingProviderProps {
  children: ReactNode;
}

export function LoadingProvider({ children }: LoadingProviderProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | undefined>();

  const showLoading = (message?: string) => {
    setMessage(message);
    setIsLoading(true);
  };

  const hideLoading = () => {
    setIsLoading(false);
    setMessage(undefined);
  };

  const setLoading = (isLoading: boolean, message?: string) => {
    setIsLoading(isLoading);
    setMessage(message);
  };

  return (
    <LoadingContext.Provider value={{ showLoading, hideLoading, setLoading }}>
      {children}
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 text-center">
            <LoadingSpinner size="large" />
            {message && <p className="mt-4 text-gray-600">{message}</p>}
          </div>
        </div>
      )}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}
