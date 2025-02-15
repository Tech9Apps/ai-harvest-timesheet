import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, nativeTheme } from 'electron';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];

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
      label: `Status: ${todaysHours.toFixed(2)} hours logged today`,
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Open Timesheet',
      click: () => win?.show(),
      visible: !win?.isVisible()
    },
    {
      label: 'Open Timesheet',
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
  todaysHours = hours;
  updateTrayMenu();
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
});

// Initialize app
app.whenReady().then(() => {
  createWindow();
  createTray();
}); 