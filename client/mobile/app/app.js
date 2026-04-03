import { initNavigation } from './navigation.js';
import { AuthProvider } from './providers/authProvider.js';
import { ThemeProvider } from './providers/themeProvider.js';
import { SocketProvider } from './providers/socketProvider.js';
import { loadSettings } from '../store/settingsStore.js';
import { Logger } from '../../../server/gateway/apiGateway.js';

const APP_VERSION = '1.0.0';
const APP_NAME = 'CraneApp';

class App {
  constructor() {
    this.initialized = false;
    this.providers = [];
  }

  async init() {
    try {
      console.info(`[${APP_NAME}] v${APP_VERSION} starting...`);

      await loadSettings();

      this.themeProvider = new ThemeProvider();
      await this.themeProvider.init();

      this.authProvider = new AuthProvider();
      await this.authProvider.init();

      this.socketProvider = new SocketProvider();
      await this.socketProvider.init();

      await initNavigation({
        auth: this.authProvider,
        theme: this.themeProvider,
        socket: this.socketProvider,
      });

      this.initialized = true;
      console.info(`[${APP_NAME}] initialized successfully`);
    } catch (error) {
      console.error(`[${APP_NAME}] initialization failed:`, error);
      this.handleCriticalError(error);
    }
  }

  handleCriticalError(error) {
    const root = document.getElementById('root');
    if (root) {
      root.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background:#0f0f18;color:#fff;font-family:sans-serif;padding:24px;text-align:center;">
          <h2 style="color:#ff5252;">Application Error</h2>
          <p style="color:#aaa;margin-top:8px;">${error.message || 'Unknown error occurred'}</p>
          <button onclick="location.reload()" style="margin-top:24px;padding:12px 32px;background:#7a5cff;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:16px;">Reload</button>
        </div>`;
    }
  }

  getProvider(name) {
    const map = {
      auth: this.authProvider,
      theme: this.themeProvider,
      socket: this.socketProvider,
    };
    return map[name] || null;
  }

  async destroy() {
    try {
      await this.socketProvider?.disconnect();
      await this.authProvider?.cleanup();
      this.initialized = false;
    } catch (error) {
      console.error(`[${APP_NAME}] destroy error:`, error);
    }
  }
}

const app = new App();

document.addEventListener('DOMContentLoaded', () => {
  app.init();
});

window.addEventListener('beforeunload', () => {
  app.destroy();
});

export default app;
