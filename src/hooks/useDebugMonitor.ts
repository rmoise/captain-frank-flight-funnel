import { useEffect } from 'react';
import { useChromeDebug } from '@/providers/ChromeDebugProvider';

interface DebugMonitorOptions {
  enableConsoleLog?: boolean;
  enableNetworkLog?: boolean;
  enableExceptionLog?: boolean;
}

export function useDebugMonitor(options: DebugMonitorOptions = {}) {
  const monitor = useChromeDebug();
  const {
    enableConsoleLog = true,
    enableNetworkLog = false,
    enableExceptionLog = true
  } = options;

  useEffect(() => {
    if (!monitor) return;

    // Enable console API events
    if (enableConsoleLog) {
      monitor.sendMessage('Runtime.enable');
      monitor.sendMessage('Console.enable');
    }

    // Enable network events
    if (enableNetworkLog) {
      monitor.sendMessage('Network.enable');
    }

    // Enable exception events
    if (enableExceptionLog) {
      monitor.sendMessage('Runtime.enable');
      monitor.sendMessage('Runtime.setExceptionBreakpoint', {
        breakOnUncaught: true
      });
    }

    return () => {
      if (!monitor) return;

      // Disable all events on cleanup
      if (enableConsoleLog) {
        monitor.sendMessage('Console.disable');
        monitor.sendMessage('Runtime.disable');
      }
      if (enableNetworkLog) {
        monitor.sendMessage('Network.disable');
      }
    };
  }, [monitor, enableConsoleLog, enableNetworkLog, enableExceptionLog]);

  return monitor;
}