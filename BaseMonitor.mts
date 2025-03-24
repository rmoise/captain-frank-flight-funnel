import { chromium, Page, Browser, Request, Response, ConsoleMessage } from 'playwright';

class BaseMonitor {
  private page: Page | null = null;
  private browser: Browser | null = null;

  constructor(
    private url: string,
    private options: {
      network?: boolean;
      exitOnError?: boolean;
      noClear?: boolean;
      breakNetwork?: boolean;
    } = {}
  ) {}

  async start() {
    try {
      console.log('[Monitor] Connecting to Chrome...');
      this.browser = await chromium.connectOverCDP('http://localhost:9222');
      console.log('[Monitor] Connected to Chrome');

      const context = await this.browser.newContext();
      this.page = await context.newPage();
      console.log('[Monitor] Created new page');

      // Setup monitoring
      await this.setupNetworkMonitoring();
      await this.setupConsoleMonitoring();
      await this.setupErrorMonitoring();

      // Navigate to the target URL with a longer timeout
      console.log(`[Monitor] Navigating to ${this.url}`);
      await this.page.goto(this.url, {
        timeout: 60000,
        waitUntil: 'networkidle'
      });
      console.log(`[Monitor] Successfully loaded ${this.url}`);

    } catch (error) {
      console.error('[Monitor] Failed to start:', error);
      if (this.options.exitOnError) {
        process.exit(1);
      }
    }
  }

  private async setupNetworkMonitoring() {
    if (!this.page || !this.options.network) return;

    this.page.on('request', (request: Request) => {
      console.log(`[Request] ${request.method()} ${request.url()}`);
    });

    this.page.on('response', async (response: Response) => {
      const status = response.status();
      console.log(`[Response] ${status} ${response.url()}`);

      if (this.options.breakNetwork && status >= 400) {
        console.error(`[Network Error] ${status} on ${response.url()}`);
        if (this.options.exitOnError) {
          process.exit(1);
        }
      }
    });
  }

  private async setupConsoleMonitoring() {
    if (!this.page) return;

    this.page.on('console', (msg: ConsoleMessage) => {
      const type = msg.type();
      const text = msg.text();
      console.log(`[Console] ${type}: ${text}`);
    });
  }

  private async setupErrorMonitoring() {
    if (!this.page) return;

    this.page.on('pageerror', (error: Error) => {
      console.error('[Page Error]', error);
      if (this.options.exitOnError) {
        process.exit(1);
      }
    });

    this.page.on('crash', () => {
      console.error('[Crash] Page crashed');
      if (this.options.exitOnError) {
        process.exit(1);
      }
    });
  }

  async stop() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Create and start the monitor
const url = process.argv[2] || 'http://localhost:3000';
console.log(`[Monitor] Starting monitor for ${url}`);
const monitor = new BaseMonitor(url, { network: true, exitOnError: true });
monitor.start().catch(error => {
  console.error('[Monitor] Fatal error:', error);
  process.exit(1);
});

export default BaseMonitor;