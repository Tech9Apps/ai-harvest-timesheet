import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, nativeTheme } from 'electron';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import axios from 'axios';
import fs from 'fs';
import { startOfWeek, startOfMonth, format } from 'date-fns';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.js
// │
process.env.DIST = join(__dirname, '../dist');
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : join(process.env.DIST, '../public');

let win: BrowserWindow | null;
let tray: Tray | null = null;
let forceQuit = false;
let billableHours = { today: 0, week: 0, month: 0 };
let harvestPollInterval: NodeJS.Timeout | null = null;

// Store Harvest credentials in main process
let harvestToken: string | null = null;
let harvestAccountId: string | null = null;

// Function to get the credentials file path
function getCredentialsPath() {
  return join(app.getPath('userData'), 'harvest-credentials.json');
}

// Function to save credentials
function saveCredentials() {
  try {
    const credentialsPath = getCredentialsPath();
    const data = {
      token: harvestToken,
      accountId: harvestAccountId,
    };
    fs.writeFileSync(credentialsPath, JSON.stringify(data, null, 2));
    console.log('[Main] Credentials saved successfully');
  } catch (error) {
    console.error('[Main] Error saving credentials:', error);
  }
}

// Function to load credentials
function loadCredentials() {
  try {
    const credentialsPath = getCredentialsPath();
    if (fs.existsSync(credentialsPath)) {
      const data = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
      harvestToken = data.token;
      harvestAccountId = data.accountId;
      console.log('[Main] Credentials loaded successfully');
      return true;
    }
  } catch (error) {
    console.error('[Main] Error loading credentials:', error);
  }
  return false;
}

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];

async function fetchHarvestHours() {
  try {
    if (!harvestToken || !harvestAccountId) {
      console.log('[Main] No Harvest credentials in main process');
      return;
    }

    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Start week on Monday
    const monthStart = startOfMonth(today);

    // Format dates as YYYYMMDD for reports API
    const todayStr = format(today, 'yyyyMMdd');
    const weekStartStr = format(weekStart, 'yyyyMMdd');
    const monthStartStr = format(monthStart, 'yyyyMMdd');

    // Create request configs
    const todayConfig = {
      url: 'https://api.harvestapp.com/v2/reports/time/team',
      params: {
        user_id: harvestAccountId,
        from: todayStr,
        to: todayStr
      }
    };

    const weekConfig = {
      url: 'https://api.harvestapp.com/v2/reports/time/team',
      params: {
        user_id: harvestAccountId,
        from: weekStartStr,
        to: todayStr
      }
    };

    const monthConfig = {
      url: 'https://api.harvestapp.com/v2/reports/time/team',
      params: {
        user_id: harvestAccountId,
        from: monthStartStr,
        to: todayStr
      }
    };

    // Fetch all periods in parallel using reports API
    const [todayReport, weekReport, monthReport] = await Promise.all([
      axios.get(todayConfig.url, {
        headers: {
          'Authorization': `Bearer ${harvestToken}`,
          'Harvest-Account-ID': harvestAccountId,
          'Content-Type': 'application/json',
        },
        params: todayConfig.params
      }),
      axios.get(weekConfig.url, {
        headers: {
          'Authorization': `Bearer ${harvestToken}`,
          'Harvest-Account-ID': harvestAccountId,
          'Content-Type': 'application/json',
        },
        params: weekConfig.params
      }),
      axios.get(monthConfig.url, {
        headers: {
          'Authorization': `Bearer ${harvestToken}`,
          'Harvest-Account-ID': harvestAccountId,
          'Content-Type': 'application/json',
        },
        params: monthConfig.params
      })
    ]);

    // Validate responses and extract billable hours
    const validateAndExtractHours = (response: any) => {
      if (!response?.data?.results?.length) {
        return 0;
      }
      const hours = response.data.results[0]?.billable_hours;
      return typeof hours === 'number' ? hours : 0;
    };

    billableHours = {
      today: validateAndExtractHours(todayReport),
      week: validateAndExtractHours(weekReport),
      month: validateAndExtractHours(monthReport)
    };

    // Update tray menu with new hours
    updateTrayMenu();
  } catch (error) {
    console.error('[Main] Error fetching Harvest hours:', error);
    if (axios.isAxiosError(error)) {
      console.error('[Main] Response details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
    }
  }
}

function startHarvestPolling() {
  console.log('[Main] Starting Harvest polling (15-minute interval)');
  // Initial fetch
  fetchHarvestHours();
  
  // Set up polling every 15 minutes
  harvestPollInterval = setInterval(fetchHarvestHours, 15 * 60 * 1000);
}

function stopHarvestPolling() {
  console.log('[Main] Stopping Harvest polling');
  if (harvestPollInterval) {
    clearInterval(harvestPollInterval);
    harvestPollInterval = null;
  }
}

function getIconPath(): string {
  const iconName = 'tray-icon.png';
  if (app.isPackaged) {
    return join(process.resourcesPath, 'assets', 'tray-icons', iconName);
  }
  return join(__dirname, '../assets/tray-icons', iconName);
}

function updateTrayIcon() {
  if (!tray) return;
  const icon = nativeImage.createFromPath(getIconPath());
  tray.setImage(icon);
}

function updateTrayMenu() {
  if (!tray) return;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Billable Hours',
      enabled: false
    },
    {
      label: `• Today: ${billableHours.today.toFixed(2)}h`,
      enabled: false
    },
    {
      label: `• Week: ${billableHours.week.toFixed(2)}h`,
      enabled: false
    },
    {
      label: `• Month: ${billableHours.month.toFixed(2)}h`,
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Show/Hide Timesheet',
      click: () => win?.isVisible() ? win?.hide() : win?.show()
    },
    { type: 'separator' },
    {
      label: 'Refresh Hours',
      click: fetchHarvestHours
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        forceQuit = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
}

function createTray() {
  // Create initial tray with default icon
  const icon = nativeImage.createFromPath(getIconPath());
  tray = new Tray(icon);
  tray.setToolTip('AI Harvest Timesheet');

  // Update menu
  updateTrayMenu();

  // Listen for theme changes
  nativeTheme.on('updated', updateTrayIcon);
}

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#121212', // Match dark theme background
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    show: false, // Don't show the window until it's ready
  });

  // Set window to be visible on all workspaces (helps with fullscreen app menu visibility)
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString());
  });

  // Show window when it's ready to prevent flickering
  win.once('ready-to-show', () => {
    win?.show();
    updateTrayMenu(); // Update menu when window is shown
  });

  // Update tray menu when window is shown or hidden
  win.on('show', updateTrayMenu);
  win.on('hide', updateTrayMenu);

  // Prevent window from being closed, hide it instead
  win.on('close', (event) => {
    if (!forceQuit) {
      event.preventDefault();
      win?.hide();
      return false;
    }
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(join(process.env.DIST || 'dist', 'index.html'));
  }
}

// Add handler for refreshing Harvest hours
ipcMain.on('refresh-harvest-hours', () => {
  console.log('[Main] Received request to refresh Harvest hours');
  fetchHarvestHours();
});

// Add cookie update logging
ipcMain.on('harvest-auth-update', async (_event, { token, accountId }) => {
  console.log('[Main] Received Harvest authentication update');
  
  if (!win?.webContents.session) {
    console.error('[Main] No active session to store cookies');
    return;
  }

  try {
    // Set access token cookie
    await win.webContents.session.cookies.set({
      url: 'https://api.harvestapp.com',
      name: 'harvest_access_token',
      value: token,
      secure: true
    });
    console.log('[Main] Successfully set access token cookie');

    // Set account ID cookie
    await win.webContents.session.cookies.set({
      url: 'https://api.harvestapp.com',
      name: 'harvest_account_id',
      value: accountId,
      secure: true
    });
    console.log('[Main] Successfully set account ID cookie');

    // Trigger an immediate fetch of hours after setting new credentials
    fetchHarvestHours();
  } catch (error) {
    console.error('[Main] Error setting Harvest cookies:', error);
  }
});

// Update the set-harvest-credentials handler
ipcMain.on('set-harvest-credentials', async (_event, { token, accountId }) => {
  console.log('[Main] Setting Harvest credentials in main process');
  harvestToken = token;
  harvestAccountId = accountId;

  // Save credentials to disk
  saveCredentials();

  if (win?.webContents) {
    try {
      // Set cookies for web content
      await win.webContents.session.cookies.set({
        url: 'https://api.harvestapp.com',
        name: 'harvest_access_token',
        value: token,
        secure: true
      });

      await win.webContents.session.cookies.set({
        url: 'https://api.harvestapp.com',
        name: 'harvest_account_id',
        value: accountId,
        secure: true
      });

      console.log('[Main] Successfully set Harvest cookies');
      
      // Fetch hours immediately after setting credentials
      fetchHarvestHours();
    } catch (error) {
      console.error('[Main] Error setting cookies:', error);
    }
  }
});

// Add handler to check if we have credentials
ipcMain.handle('get-harvest-credentials', () => {
  return {
    hasCredentials: !!(harvestToken && harvestAccountId),
    token: harvestToken,
    accountId: harvestAccountId
  };
});

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require('electron').app.isPackaged) {
  // Custom protocol handler for deep linking
  app.setAsDefaultProtocolClient('ai-harvest-timesheet');
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  forceQuit = true;
  stopHarvestPolling();
});

// Initialize app
app.whenReady().then(() => {
  createWindow();
  createTray();
  
  // Load credentials and start polling if they exist
  if (loadCredentials()) {
    console.log('[Main] Starting with loaded credentials');
    startHarvestPolling();
  } else {
    console.log('[Main] No saved credentials found');
  }
}); 