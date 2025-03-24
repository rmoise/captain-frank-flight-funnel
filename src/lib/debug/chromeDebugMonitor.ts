import { useEffect, useRef } from "react";

export interface ChromeDebugMonitorConfig {
  enabled?: boolean;
  port?: number;
  host?: string;
  retryInterval?: number;
  maxRetries?: number;
  isNetlify?: boolean;
}

// Cursor's console interface
declare global {
  interface Window {
    __CURSOR_CONSOLE__?: {
      log: (message: string, ...args: any[]) => void;
      error: (message: string, ...args: any[]) => void;
      warn: (message: string, ...args: any[]) => void;
      info: (message: string, ...args: any[]) => void;
      debug: (message: string, ...args: any[]) => void;
    };
    __CURSOR_EXTENSION__?: {
      isActive: boolean;
    };
    __CURSOR_API__?: {
      sendMessage: (type: string, data: any) => void;
    };
  }
}

type ConsoleMethodNames = "log" | "error" | "warn" | "info" | "debug";
type ConsoleMethods = Pick<Console, ConsoleMethodNames>;

export class ChromeDebugMonitor {
  private config: Required<ChromeDebugMonitorConfig>;
  private ws: WebSocket | null = null;
  private retryCount = 0;
  private messageQueue: any[] = [];
  private isConnecting = false;
  private originalConsole: ConsoleMethods = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
    debug: console.debug,
  };
  private isCursorActive: boolean = false;
  private cspRestrictionsDetected = false;
  private isOperationInProgress = false; // Track active operations to prevent nested calls

  constructor(config: ChromeDebugMonitorConfig = {}) {
    // Enhanced Netlify detection - detect both Netlify production and Netlify Dev
    const isNetlifyEnvironment =
      typeof process !== "undefined" &&
      (process.env.NETLIFY === "true" ||
        process.env.NEXT_PUBLIC_NETLIFY === "true" ||
        (typeof window !== "undefined" &&
          (window.location.hostname.includes("netlify.app") ||
            // Netlify Dev typically runs on port 8888
            window.location.port === "8888")));

    // Determine if we should be enabled by default
    const isProduction =
      typeof window !== "undefined" &&
      (window.location.hostname === "captain-frank.com" ||
        window.location.hostname.includes("netlify.app"));

    const defaultEnabled = !isProduction && !isNetlifyEnvironment;

    this.config = {
      enabled: config.enabled ?? defaultEnabled,
      port: config.port ?? 9223,
      host: config.host ?? "localhost",
      retryInterval: config.retryInterval ?? 5000,
      maxRetries: config.maxRetries ?? 5,
      isNetlify: config.isNetlify ?? isNetlifyEnvironment,
    };

    // Safety check - if we're in production, Netlify, or Netlify Dev force disable
    if (isProduction || isNetlifyEnvironment) {
      this.config.enabled = false;
      this.config.maxRetries = 0;
    }

    // Early return if disabled - avoid unnecessary setup
    if (!this.config.enabled) {
      this.cspRestrictionsDetected = true; // Set this to prevent any connection attempts
      return; // Skip the rest of initialization
    }

    // Check if we're running in Cursor
    this.isCursorActive =
      typeof window !== "undefined" &&
      (!!window.__CURSOR_EXTENSION__?.isActive ||
        !!window.__CURSOR_CONSOLE__ ||
        !!window.__CURSOR_API__);

    // Detect CSP restrictions early before attempting connections
    this.detectCSPRestrictions();

    // Log initial setup - safely
    try {
      this.originalConsole.log("=== ChromeDebugMonitor Setup ===", {
        isCursorActive: this.isCursorActive,
        hasCursorConsole:
          typeof window !== "undefined" && !!window.__CURSOR_CONSOLE__,
        hasCursorExtension:
          typeof window !== "undefined" && !!window.__CURSOR_EXTENSION__,
        hasCursorAPI: typeof window !== "undefined" && !!window.__CURSOR_API__,
        config: {
          enabled: this.config.enabled,
          maxRetries: this.config.maxRetries,
          host: this.config.host,
          port: this.config.port,
        },
        isProduction,
        isEnabled: this.config.enabled,
        cspRestrictionsDetected: this.cspRestrictionsDetected,
      });
    } catch (e) {
      // Silent fallback if logging fails
    }

    // Only setup console if enabled and not restricted by CSP
    if (this.config.enabled && !this.cspRestrictionsDetected) {
      this.setupConsole();
    } else if (this.cspRestrictionsDetected) {
      try {
        this.originalConsole.log(
          "=== ChromeDebugMonitor Disabled Due to CSP Restrictions ==="
        );
      } catch (e) {
        // Silent fallback if logging fails
      }
    }
  }

  // Detect CSP restrictions to avoid error loops
  private detectCSPRestrictions(): void {
    if (typeof window === "undefined") return;

    try {
      // First check if we have a CSP meta tag with connect-src restrictions
      const cspMetaTags = document.querySelectorAll(
        'meta[http-equiv="Content-Security-Policy"]'
      );
      for (let i = 0; i < cspMetaTags.length; i++) {
        const content = cspMetaTags[i].getAttribute("content") || "";
        if (
          content.includes("connect-src") &&
          !content.includes("localhost") &&
          !content.includes("ws://localhost")
        ) {
          this.cspRestrictionsDetected = true;
          return;
        }
      }

      // Check for secure context that would restrict localhost connections
      if (
        window.isSecureContext &&
        window.location.protocol === "https:" &&
        !window.location.hostname.includes("localhost") &&
        !window.location.hostname.includes("127.0.0.1")
      ) {
        // When running in HTTPS on a non-localhost domain, localhost connections are likely restricted
        this.cspRestrictionsDetected = true;
      }
    } catch (e) {
      // If there's any error during detection, assume restrictions exist to be safe
      this.cspRestrictionsDetected = true;
      this.originalConsole.error("Error detecting CSP restrictions:", e);
    }
  }

  private setupConsole() {
    // Skip if already set up or disabled
    if (!this.config.enabled || this.cspRestrictionsDetected) {
      return;
    }

    // Add flags to prevent recursive calls
    let isLogging = false;
    let maxRecursionDepth = 0;
    const MAX_SAFE_RECURSION = 2;

    // Store original methods outside the loop to avoid closures issues
    const originalMethods = { ...this.originalConsole };

    // Safely override each console method
    ["log", "error", "warn", "info", "debug"].forEach((method) => {
      const originalMethod = originalMethods[method as ConsoleMethodNames];

      // Replace the console method with our wrapped version
      console[method as ConsoleMethodNames] = (...args: any[]) => {
        // IMPORTANT: Prevent recursive calls from causing infinite loops
        if (isLogging) {
          maxRecursionDepth++;

          // If we detect potential recursion, just use the original method directly
          if (maxRecursionDepth > MAX_SAFE_RECURSION) {
            originalMethod.apply(console, args);
            return;
          }
        }

        try {
          isLogging = true;

          // Always call the original method first for immediate feedback
          originalMethod.apply(console, args);

          // Only send to debug monitor if connected and not in a recursive loop
          if (
            maxRecursionDepth < 1 &&
            this.ws &&
            this.ws.readyState === WebSocket.OPEN
          ) {
            try {
              // Safely prepare data to avoid circular references
              const safeArgs = args.map((arg) => {
                try {
                  // For DOM elements, extract basic info to avoid circular refs
                  if (arg instanceof Element) {
                    return `[DOM Element: ${arg.tagName}]`;
                  }

                  // For React objects, extract basic info
                  if (
                    arg &&
                    typeof arg === "object" &&
                    (arg.$$typeof || arg._reactInternalFiber)
                  ) {
                    return "[React Component]";
                  }

                  // For Error objects, extract just the message and stack
                  if (arg instanceof Error) {
                    return {
                      errorType: arg.name,
                      message: arg.message,
                      stack: arg.stack,
                    };
                  }

                  return arg;
                } catch (e) {
                  return "[Unserializable Object]";
                }
              });

              // Safely send message - only if we're not already in a recursive state
              if (!isLogging || maxRecursionDepth === 0) {
                this.sendMessage("Runtime.consoleAPICalled", {
                  type: method,
                  args: safeArgs,
                  timestamp: Date.now(),
                  executionContextId: 1,
                });
              }
            } catch (e) {
              // Silent fallback if sending fails
              // Do NOT log here to avoid recursion
            }
          }
        } catch (e) {
          // In case of any error, use the original method directly
          try {
            // Don't use console here (would cause recursion)
            // Use the stored original directly
            originalMethod.call(null, "[ChromeDebugMonitor Error]", e);
          } catch (innerError) {
            // Silent fallback if even that fails
          }
        } finally {
          isLogging = false;
          maxRecursionDepth = 0;
        }
      };
    });
  }

  private processMessageQueue() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        try {
          this.ws.send(JSON.stringify(message));
        } catch (error) {
          // Silent failure if sending fails
        }
      }
    }
  }

  public sendMessage(method: string, params?: any): void {
    const message = {
      method,
      params: params || {},
    };

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      // Queue message if not connected
      this.messageQueue.push(message);
      return;
    }

    try {
      this.ws.send(JSON.stringify(message));
    } catch (error) {
      // Silent failure
    }
  }

  async connect() {
    // Prevent nested calls to connect or connections in React render cycles
    if (this.isOperationInProgress) {
      try {
        this.originalConsole.log(
          "=== Chrome Debug Monitor - Skipping nested connect call ==="
        );
      } catch (e) {
        // Silent fallback if logging fails
      }
      return;
    }

    // Early exits for disabled/connecting/CSP cases
    if (
      !this.config.enabled ||
      this.isConnecting ||
      this.cspRestrictionsDetected
    ) {
      if (this.cspRestrictionsDetected) {
        try {
          this.originalConsole.log(
            "=== Chrome Debug Monitor - Connection Skipped Due to CSP Restrictions ==="
          );
        } catch (e) {
          // Silent fallback if logging fails
        }
      }
      return;
    }

    // Set flags to prevent recursive calls and loops
    this.isConnecting = true;
    this.isOperationInProgress = true;

    try {
      // Log connection attempt with minimal information to avoid circular refs
      try {
        // Use the original console to avoid triggering our own monitors
        this.originalConsole.log(
          "=== Chrome Debug Monitor - Connection Attempt ===",
          {
            attempt: this.retryCount + 1,
            maxRetries: this.config.maxRetries,
          }
        );
      } catch (e) {
        // Silent fallback if logging fails
      }

      const wsUrl = await this.getDebuggerUrl();
      if (!wsUrl) {
        try {
          this.originalConsole.warn(
            "=== Chrome Debug Monitor - No WebSocket URL available ==="
          );
        } catch (e) {
          // Silent fallback if logging fails
        }

        this.handleConnectionError();
        return;
      }

      try {
        this.originalConsole.log("=== Chrome Debug Monitor - Connecting ===", {
          wsUrl,
          timestamp: new Date().toISOString(),
        });
      } catch (e) {
        // Silent fallback if logging fails
      }

      // Create WebSocket with error handling for CSP violations
      try {
        this.ws = new WebSocket(wsUrl);
      } catch (wsError) {
        // Check if error message indicates CSP violation
        if (
          wsError instanceof DOMException &&
          (wsError.message.includes("Content Security Policy") ||
            wsError.message.includes("CSP"))
        ) {
          this.cspRestrictionsDetected = true;
          try {
            this.originalConsole.warn(
              "=== Chrome Debug Monitor - CSP Violation Detected ===",
              {
                error: wsError.message,
              }
            );
          } catch (e) {
            // Silent fallback if logging fails
          }
          this.isConnecting = false;
          return;
        }
        throw wsError;
      }

      // Add a connection timeout
      const connectionTimeout = setTimeout(() => {
        if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
          try {
            this.originalConsole.warn(
              "=== Chrome Debug Monitor - Connection timeout ==="
            );
          } catch (e) {
            // Silent fallback if logging fails
          }
          this.ws.close();
          this.handleConnectionError();
        }
      }, 10000); // 10 second timeout

      // Clear the timeout when connected
      this.ws.addEventListener("open", () => {
        clearTimeout(connectionTimeout);
        // Reset retry count on successful connection
        this.retryCount = 0;
        try {
          this.originalConsole.log(
            "=== Chrome Debug Monitor - Connected Successfully ==="
          );
        } catch (e) {
          // Silent fallback if logging fails
        }
      });

      this.setupWebSocketHandlers();
    } catch (error) {
      try {
        this.originalConsole.error(
          "=== Chrome Debug Monitor - Connection Failed ===",
          {
            error: error instanceof Error ? error.message : String(error),
          }
        );
      } catch (e) {
        // Silent fallback if logging fails
      }

      // Check if error is CSP-related and mark as detected
      if (
        error instanceof DOMException &&
        (error.message.includes("Content Security Policy") ||
          error.message.includes("CSP"))
      ) {
        this.cspRestrictionsDetected = true;
        try {
          this.originalConsole.warn(
            "=== Chrome Debug Monitor - Disabling due to CSP restrictions ==="
          );
        } catch (e) {
          // Silent fallback if logging fails
        }
      } else {
        this.handleConnectionError();
      }
    } finally {
      this.isConnecting = false;
      this.isOperationInProgress = false;
    }
  }

  private async getDebuggerUrl(): Promise<string | null> {
    try {
      // Super fast path - avoid all network activity in Netlify environments
      if (
        this.config.isNetlify ||
        !this.config.enabled ||
        this.cspRestrictionsDetected
      ) {
        return null;
      }

      // Additional fast check - if we're in Netlify Dev (port 8888), skip entirely
      if (typeof window !== "undefined" && window.location.port === "8888") {
        return null;
      }

      const origin = window.location.origin;
      const isSecure = window.location.protocol === "https:";

      // Skip Netlify proxy logic entirely in any Netlify environment
      if (this.config.isNetlify) {
        return null;
      }

      // Skip Netlify proxy if CSP restrictions detected
      if (this.config.isNetlify && !this.cspRestrictionsDetected) {
        const proxyUrl = `${origin}/.netlify/functions/chrome-debug-proxy`;

        console.log(
          "=== Chrome Debug Monitor - Fetching Debugger URL via Netlify Proxy ===",
          {
            origin,
            isSecure,
            proxyUrl,
            timestamp: new Date().toISOString(),
          }
        );

        try {
          const response = await fetch(proxyUrl, {
            headers: {
              Origin: origin,
              "X-Forwarded-Proto": isSecure ? "https" : "http",
            },
          });

          if (!response.ok) {
            console.warn(
              `Netlify proxy returned HTTP error! status: ${response.status}. Will try direct connection.`
            );
            // Don't throw, we'll try direct connection instead
          } else {
            const data = await response.json();
            if (Array.isArray(data) && data.length > 0) {
              const target = data[0];
              if (target.webSocketDebuggerUrl) {
                // Parse the WebSocket URL
                const wsUrl = new URL(target.webSocketDebuggerUrl);

                // Always use the same origin for WebSocket connections
                const wsOrigin = new URL(window.location.href);
                wsUrl.protocol =
                  wsOrigin.protocol === "https:" ? "wss:" : "ws:";
                wsUrl.hostname = wsOrigin.hostname;
                wsUrl.port = wsOrigin.port;

                // Keep the original path but prefix with our proxy path
                wsUrl.pathname = `/.netlify/functions/chrome-debug-proxy${wsUrl.pathname}`;

                // Log the WebSocket URL details
                console.log(
                  "=== Chrome Debug Monitor - WebSocket URL via Netlify ===",
                  {
                    originalUrl: target.webSocketDebuggerUrl,
                    modifiedUrl: wsUrl.toString(),
                    protocol: wsUrl.protocol,
                    hostname: wsUrl.hostname,
                    port: wsUrl.port,
                    pathname: wsUrl.pathname,
                    timestamp: new Date().toISOString(),
                  }
                );

                return wsUrl.toString();
              }
            }
          }
        } catch (netlifyError) {
          console.warn("Error using Netlify proxy:", netlifyError);

          // Check if error is CSP-related
          if (
            netlifyError instanceof DOMException &&
            (netlifyError.message.includes("Content Security Policy") ||
              netlifyError.message.includes("CSP"))
          ) {
            this.cspRestrictionsDetected = true;
            return null;
          }
          // Don't throw, we'll try direct connection instead
        }
      }

      // Skip direct connection if CSP restrictions detected
      if (this.cspRestrictionsDetected) {
        console.log(
          "=== Chrome Debug Monitor - Skipping Direct Connection Due to CSP ==="
        );
        return null;
      }

      // Try direct connection (either as fallback or primary method)
      try {
        const { host, port } = this.config;
        const directUrl = `http://${host}:${port}/json/list`;

        console.log("=== Chrome Debug Monitor - Trying Direct Connection ===", {
          directUrl,
          timestamp: new Date().toISOString(),
        });

        try {
          const directResponse = await fetch(directUrl);

          if (!directResponse.ok) {
            throw new Error(
              `Direct connection failed with status: ${directResponse.status}`
            );
          }

          const directData = await directResponse.json();
          if (!Array.isArray(directData) || directData.length === 0) {
            throw new Error("No debugger targets found in direct connection");
          }

          const directTarget = directData[0];
          if (!directTarget.webSocketDebuggerUrl) {
            throw new Error("No WebSocket URL found in direct debugger target");
          }

          console.log("=== Chrome Debug Monitor - Direct WebSocket URL ===", {
            webSocketUrl: directTarget.webSocketDebuggerUrl,
            timestamp: new Date().toISOString(),
          });

          return directTarget.webSocketDebuggerUrl;
        } catch (fetchError) {
          // Handle "Failed to fetch" and network errors specially
          if (
            fetchError instanceof TypeError &&
            (fetchError.message.includes("Failed to fetch") ||
              fetchError.message.includes("Network request failed"))
          ) {
            console.warn(
              "=== Chrome Debug Monitor - Chrome Debugger Not Available ===",
              {
                message:
                  "Failed to connect to Chrome debug port. Is Chrome running with --remote-debugging-port flag?",
                url: directUrl,
                error: fetchError.message,
                timestamp: new Date().toISOString(),
              }
            );

            // Mark this as a persistent connection issue that shouldn't trigger infinite retries
            this.retryCount = this.config.maxRetries;
            return null;
          }

          // Check for CSP violation in fetch error
          if (
            fetchError instanceof DOMException &&
            (fetchError.message.includes("Content Security Policy") ||
              fetchError.message.includes("CSP"))
          ) {
            console.error("CSP violation detected during fetch:", fetchError);
            this.cspRestrictionsDetected = true;
            return null;
          }

          throw fetchError; // Re-throw for other errors
        }
      } catch (directError) {
        console.error("Direct connection failed:", directError);

        // Check if we should skip inferred URL due to CSP
        if (this.cspRestrictionsDetected) {
          return null;
        }

        // Final fallback - try to infer the WebSocket URL
        try {
          const { host, port } = this.config;

          // Only try inferred URL if we haven't exhausted retries
          if (this.retryCount < this.config.maxRetries) {
            const inferredWsUrl = `ws://${host}:${port}/devtools/page/1`;

            console.log(
              "=== Chrome Debug Monitor - Using Inferred WebSocket URL ===",
              {
                inferredWsUrl,
                timestamp: new Date().toISOString(),
              }
            );

            return inferredWsUrl;
          } else {
            console.warn(
              "=== Chrome Debug Monitor - Skipping Inferred URL After Failed Attempts ==="
            );
            return null;
          }
        } catch (inferError) {
          console.error("Could not infer WebSocket URL:", inferError);
          return null;
        }
      }
    } catch (error) {
      console.error(
        "=== Chrome Debug Monitor - Error Getting Debugger URL ===",
        {
          error,
          timestamp: new Date().toISOString(),
        }
      );

      // Check for CSP violations
      if (
        error instanceof DOMException &&
        (error.message.includes("Content Security Policy") ||
          error.message.includes("CSP"))
      ) {
        this.cspRestrictionsDetected = true;
      }

      return null;
    }
  }

  private setupWebSocketHandlers() {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log("=== Chrome Debug Monitor - WebSocket Connected ===", {
        url: this.ws?.url,
        protocol: this.ws?.protocol,
        readyState: this.ws?.readyState,
        timestamp: new Date().toISOString(),
      });
      this.retryCount = 0;
      this.processMessageQueue();
    };

    this.ws.onclose = (event) => {
      console.log("=== Chrome Debug Monitor - WebSocket Closed ===", {
        url: this.ws?.url,
        protocol: this.ws?.protocol,
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
        timestamp: new Date().toISOString(),
      });
      this.handleConnectionError();
    };

    this.ws.onerror = (error) => {
      console.log("=== Chrome Debug Monitor - WebSocket Error ===", {
        url: this.ws?.url,
        protocol: this.ws?.protocol,
        error,
        timestamp: new Date().toISOString(),
      });

      // Check if this is a CSP violation
      const errorEvent = error as ErrorEvent;
      if (
        errorEvent &&
        errorEvent.message &&
        (errorEvent.message.includes("Content Security Policy") ||
          errorEvent.message.includes("CSP"))
      ) {
        this.cspRestrictionsDetected = true;
        console.warn(
          "=== Chrome Debug Monitor - CSP restriction detected, disabling ==="
        );
        this.ws?.close();
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.method === "Console.messageAdded") {
          this.handleConsoleMessage(message.params.message);
        }
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };
  }

  private handleConnectionError() {
    this.ws = null;

    // Don't retry if CSP restrictions detected
    if (this.cspRestrictionsDetected) {
      console.warn(
        "=== Chrome Debug Monitor - Not retrying due to CSP restrictions ==="
      );
      return;
    }

    if (this.retryCount < this.config.maxRetries) {
      this.retryCount++;
      console.log(
        `Retrying connection (${this.retryCount}/${this.config.maxRetries}) in ${this.config.retryInterval}ms`
      );
      setTimeout(() => this.connect(), this.config.retryInterval);
    } else {
      console.warn("Max retries reached, stopping reconnection attempts");
    }
  }

  private handleConsoleMessage(message: any) {
    const formattedMessage = this.formatConsoleMessage(message);
    console.log("Chrome Console:", formattedMessage);
  }

  private formatConsoleMessage(message: any): string {
    const parts = [
      new Date().toISOString(),
      message.type || "log",
      message.text || "",
    ];
    return parts.map((part) => `[${part}]`).join(" ");
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.retryCount = 0;
    this.messageQueue = [];
    this.isConnecting = false;

    // Restore original console methods
    Object.assign(console, this.originalConsole);
  }
}

export function useChromeDebugMonitor(config?: ChromeDebugMonitorConfig) {
  const monitorRef = useRef<ChromeDebugMonitor | null>(null);
  const configRef = useRef(config);

  // Update config reference if it changes (without causing effects to re-run)
  if (JSON.stringify(configRef.current) !== JSON.stringify(config)) {
    configRef.current = config;
  }

  // Use a layout effect for initial setup (before component renders)
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Skip monitor setup in production by default for safety
    const isProduction =
      typeof window !== "undefined" &&
      (window.location.hostname === "captain-frank.com" ||
        window.location.hostname.includes("netlify.app"));

    if (isProduction && configRef.current?.enabled !== true) {
      return; // Skip initialization in production unless explicitly enabled
    }

    try {
      // Only initialize once
      if (!monitorRef.current) {
        monitorRef.current = new ChromeDebugMonitor(configRef.current);

        // Delay connection attempt slightly to not block rendering
        const timer = setTimeout(() => {
          if (monitorRef.current) {
            try {
              monitorRef.current.connect().catch(() => {
                // Silently handle connection errors
              });
            } catch (err) {
              // Silent error handling to prevent infinite loops
            }
          }
        }, 100);

        return () => {
          clearTimeout(timer);
        };
      }
    } catch (error) {
      // Use the native console to avoid loops
      if (typeof console !== "undefined" && console.error) {
        const originalError = console.error;
        originalError.call(
          console,
          "Error initializing ChromeDebugMonitor:",
          error
        );
      }
    }
  }, []); // Only run once on mount

  // Clean up on unmount
  useEffect(() => {
    return () => {
      try {
        if (monitorRef.current) {
          monitorRef.current.disconnect();
          monitorRef.current = null;
        }
      } catch (error) {
        // Use the native console to avoid loops
        if (typeof console !== "undefined" && console.error) {
          const originalError = console.error;
          originalError.call(
            console,
            "Error disconnecting ChromeDebugMonitor:",
            error
          );
        }
      }
    };
  }, []);

  return monitorRef.current;
}

export default ChromeDebugMonitor;
