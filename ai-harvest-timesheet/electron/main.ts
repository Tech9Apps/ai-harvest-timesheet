import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, nativeTheme, Notification } from 'electron';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import axios from 'axios';
import fs from 'fs';
import { startOfWeek, startOfMonth, format, parse, isWeekend } from 'date-fns';

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
let notificationScheduler: NodeJS.Timeout | null = null;

// Store Harvest credentials in main process
let harvestToken: string | null = null;
let harvestAccountId: string | null = null;

// Add test mode flag
let notificationTestMode = false; // Set to true for testing

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

// Function to get the preferences file path
function getPreferencesPath() {
  return join(app.getPath('userData'), 'preferences.json');
}

// Function to load preferences
function loadPreferences() {
  try {
    const preferencesPath = getPreferencesPath();
    if (fs.existsSync(preferencesPath)) {
      const data = JSON.parse(fs.readFileSync(preferencesPath, 'utf8'));
      return data;
    }
  } catch (error) {
    console.error('[Main] Error loading preferences:', error);
  }
  return {};
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
    // In production, use path relative to the app.getAppPath()
    return join(app.getAppPath(), 'assets', 'tray-icons', iconName);
  }
  // In development
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
  const iconPath = getIconPath();
  console.log('[Main] Loading tray icon from:', iconPath);
  
  const icon = nativeImage.createFromPath(iconPath);
  const sizes = icon.getSize();
  console.log('[Main] Created tray icon with size:', sizes.width, 'x', sizes.height);
  
  tray = new Tray(icon);
  tray.setToolTip('AI Harvest Timesheet');

  // Update menu
  updateTrayMenu();

  // Listen for theme changes
  nativeTheme.on('updated', updateTrayIcon);
}

// Function to get the app icon path
function getAppIconPath(): string {
  const iconName = 'icon_512x512@2x.png';
  
  if (app.isPackaged) {
    return join(process.resourcesPath, 'assets', 'icons', 'icon.iconset', iconName);
  }
  
  // In development mode
  const projectRoot = join(__dirname, '..');
  return join(projectRoot, 'assets', 'icons', 'icon.iconset', iconName);
}

function createWindow() {
  // Create the icon before using it
  const iconPath = getAppIconPath();
  console.log('[Main] Loading app icon from:', iconPath);
  
  // Create native image
  const icon = nativeImage.createFromPath(iconPath);
  const sizes = icon.getSize();
  console.log('[Main] Created native image with size:', sizes.width, 'x', sizes.height);
  
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#121212',
    icon: icon,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    show: false,
  });

  // // Set window to be visible on all workspaces (helps with fullscreen app menu visibility)
  // win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

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
  } else if (win !== null) {
    win.show();
  }
});

app.on('before-quit', () => {
  forceQuit = true;
  stopHarvestPolling();
  if (notificationScheduler) {
    clearInterval(notificationScheduler);
    notificationScheduler = null;
  }
});

// Function to save preferences
function savePreferences(preferences: any) {
  try {
    const preferencesPath = getPreferencesPath();
    fs.writeFileSync(preferencesPath, JSON.stringify(preferences, null, 2));
    console.log('[Main] Preferences saved successfully:', preferences);
  } catch (error) {
    console.error('[Main] Error saving preferences:', error);
  }
}

// Function to schedule daily notification
function scheduleDailyNotification(time: string) {
  // Clear existing scheduler if any
  if (notificationScheduler) {
    clearInterval(notificationScheduler);
    notificationScheduler = null;
  }

  // Parse the time string (HH:mm format)
  const [targetHours, targetMinutes] = time.split(':').map(Number);
  let lastNotificationDate: string | null = null;

  console.log('[Main] Scheduling daily notification for', time, 'local time', 
    notificationTestMode ? '(Test Mode - including weekends)' : '(Normal Mode - weekdays only)');

  // Schedule the notification check
  notificationScheduler = setInterval(() => {
    const now = new Date();
    const today = now.toDateString();
    
    // Debug logging every minute
    if (now.getSeconds() === 0) {
      console.log('[Main] Checking notification time:', {
        current: `${now.getHours()}:${now.getMinutes()}`,
        target: `${targetHours}:${targetMinutes}`,
        lastNotification: lastNotificationDate,
        isWeekend: isWeekend(now),
        testMode: notificationTestMode,
        timeUntilNext: `${targetHours - now.getHours()}h ${targetMinutes - now.getMinutes()}m`
      });
    }
    
    // Skip if we already notified today
    if (lastNotificationDate === today) {
      return;
    }

    // Skip weekends only if not in test mode
    if (isWeekend(now) && !notificationTestMode) {
      // console.log('[Main] Skipping notification - weekend (disable test mode to skip weekends)');
      return;
    }

    // Check if it's time to show notification
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();

    if (currentHours === targetHours && currentMinutes === targetMinutes) {
      console.log('[Main] Showing notification at', now.toLocaleTimeString(), 
        isWeekend(now) ? '(Weekend - Test Mode)' : '');
      
      const notification = new Notification({
        title: 'Time Logging Reminder',
        body: notificationTestMode && isWeekend(now) 
          ? 'Test Mode: Weekend Notification' 
          : 'Remember to log your time for today!',
        silent: false,
        icon: getAppIconPath(),
      });

      notification.show();
      lastNotificationDate = today;

      // Add click handler to open the app
      notification.on('click', () => {
        if (win) {
          if (win.isMinimized()) win.restore();
          if (!win.isVisible()) win.show();
          win.focus();
        }
      });
    }
  }, 10000); // Check every 10 seconds for more precision
}

// Add handler for updating notification preferences
ipcMain.on('update-notification-preferences', (_event, { enableDailyReminder, reminderTime }) => {
  console.log('[Main] Updating notification preferences:', { 
    enableDailyReminder, 
    reminderTime,
    currentTime: new Date().toLocaleTimeString() 
  });
  
  // Save the preferences
  const preferences = loadPreferences();
  preferences.notifications = { enableDailyReminder, reminderTime };
  savePreferences(preferences);
  
  if (enableDailyReminder && reminderTime) {
    scheduleDailyNotification(reminderTime);
  } else if (notificationScheduler) {
    clearInterval(notificationScheduler);
    notificationScheduler = null;
  }
});

// Function to reset application data
function resetApplicationData() {
  try {
    const credentialsPath = getCredentialsPath();
    const preferencesPath = getPreferencesPath();

    // Clear credentials from memory
    harvestToken = null;
    harvestAccountId = null;

    // Delete files if they exist
    if (fs.existsSync(credentialsPath)) {
      fs.unlinkSync(credentialsPath);
      console.log('[Main] Credentials file deleted');
    }
    if (fs.existsSync(preferencesPath)) {
      fs.unlinkSync(preferencesPath);
      console.log('[Main] Preferences file deleted');
    }

    // Stop any running processes
    stopHarvestPolling();
    if (notificationScheduler) {
      clearInterval(notificationScheduler);
      notificationScheduler = null;
    }

    // Update UI
    if (win) {
      win.webContents.send('app-reset');
    }

    console.log('[Main] Application data reset successfully');
    return true;
  } catch (error) {
    console.error('[Main] Error resetting application data:', error);
    return false;
  }
}

// Add IPC handler for reset
ipcMain.handle('reset-application', async () => {
  return resetApplicationData();
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

  // Load and initialize notification preferences
  try {
    const preferences = loadPreferences();
    console.log('[Main] Loaded preferences:', preferences);
    
    if (preferences.notifications?.enableDailyReminder && preferences.notifications?.reminderTime) {
      console.log('[Main] Initializing notifications from saved preferences:', preferences.notifications);
      scheduleDailyNotification(preferences.notifications.reminderTime);
    } else {
      console.log('[Main] No notification preferences found or notifications disabled');
    }
  } catch (error) {
    console.error('[Main] Error loading notification preferences:', error);
  }

  // Also set the dock icon for macOS
  if (process.platform === 'darwin') {
    try {
      const iconPath = getAppIconPath();
      console.log('[Main] Setting dock icon from:', iconPath);
      
      const icon = nativeImage.createFromPath(iconPath);
      const sizes = icon.getSize();
      console.log('[Main] Created dock icon with size:', sizes.width, 'x', sizes.height);
      
      app.dock.setIcon(icon);
      console.log('[Main] Successfully set dock icon');
    } catch (error) {
      console.error('[Main] Error setting dock icon:', error);
    }
  }
});

// Add handler for test notifications
ipcMain.on('test-notification', () => {
  console.log('[Main] Showing test notification');
  const notification = new Notification({
    title: 'Test Notification',
    body: 'This is a test notification. Click to open the app.',
    silent: false,
    icon: getAppIconPath(),
  });

  notification.show();

  // Add click handler to open the app
  notification.on('click', () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      if (!win.isVisible()) win.show();
      win.focus();
    }
  });
}); 