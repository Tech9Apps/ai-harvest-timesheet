import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, nativeTheme } from 'electron';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import axios from 'axios';
import fs from 'fs';

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
let todaysHours = 0;
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
    console.log('[Main] Starting to fetch Harvest hours');
    
    if (!harvestToken || !harvestAccountId) {
      console.log('[Main] No Harvest credentials in main process');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    console.log('[Main] Fetching Harvest time entries for date:', today);

    const response = await axios.get('https://api.harvestapp.com/v2/time_entries', {
      headers: {
        'Authorization': `Bearer ${harvestToken}`,
        'Harvest-Account-ID': harvestAccountId,
        'Content-Type': 'application/json',
      },
      params: {
        from: today,
        to: today,
      }
    });

    console.log('[Main] Received Harvest time entries', {
      entriesCount: response.data.time_entries.length,
      date: today
    });

    const hours = response.data.time_entries.reduce(
      (total: number, entry: any) => total + (entry.hours || 0),
      0
    );

    console.log('[Main] Calculated total hours', { hours, date: today });
    todaysHours = hours;
    updateTrayMenu();
  } catch (error) {
    console.error('[Main] Error fetching Harvest hours:', error);
    if (axios.isAxiosError(error)) {
      console.error('[Main] Response details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
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
      label: `Harvest Hours Today: ${todaysHours.toFixed(2)}`,
      enabled: false
    },
    {
      label: 'Refresh Hours',
      click: fetchHarvestHours
    },
    { type: 'separator' },
    {
      label: 'Timesheet',
      click: () => win?.show(),
      visible: !win?.isVisible()
    },
    {
      label: 'Timesheet',
      click: () => win?.hide(),
      visible: win?.isVisible()
    },
    { type: 'separator' },
    {
      label: 'Sync Time Entries',
      click: () => {
        win?.webContents.send('tray-action', 'sync');
      }
    },
    {
      label: 'Refresh Commits',
      click: () => {
        win?.webContents.send('tray-action', 'refresh');
      }
    },
    {
      label: 'Open Preferences',
      click: () => {
        win?.webContents.send('tray-action', 'preferences');
      }
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

// IPC Communication
ipcMain.on('update-hours', (_event, hours: number) => {
  console.log('[Main] Received hours update through IPC:', hours);
  todaysHours = hours;
  updateTrayMenu();
});

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