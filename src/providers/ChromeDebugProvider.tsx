import React, { createContext, useContext } from 'react';
import { ChromeDebugMonitor, useChromeDebugMonitor } from '../lib/debug/chromeDebugMonitor';

interface ChromeDebugContextValue {
  monitor: ChromeDebugMonitor | null;
}

const ChromeDebugContext = createContext<ChromeDebugContextValue>({ monitor: null });

interface ChromeDebugProviderProps {
  children: React.ReactNode;
  enabled?: boolean;
  port?: number;
  host?: string;
  retryInterval?: number;
  maxRetries?: number;
}

export function ChromeDebugProvider({
  children,
  enabled = process.env.NEXT_PUBLIC_DEBUG_ENABLED === 'true',
  port = 9222,
  host = 'localhost',
  retryInterval = 1000,
  maxRetries = 5
}: ChromeDebugProviderProps) {
  const isNetlify = process.env.NEXT_PUBLIC_NETLIFY === 'true';
  const monitor = useChromeDebugMonitor({
    enabled: enabled && (process.env.NODE_ENV === 'development' || isNetlify),
    port,
    host,
    retryInterval,
    maxRetries,
    isNetlify
  });

  return (
    <ChromeDebugContext.Provider value={{ monitor }}>
      {children}
    </ChromeDebugContext.Provider>
  );
}

export function useChromeDebug() {
  const context = useContext(ChromeDebugContext);
  if (!context) {
    throw new Error('useChromeDebug must be used within a ChromeDebugProvider');
  }
  return context.monitor;
}