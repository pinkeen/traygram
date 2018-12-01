const {app, session, BrowserWindow, Menu, Tray} = require('electron');

const SCREEN_RATIO = 0.60,
      SCREEN_WIDTH = 500,
      USER_AGENT = 'Mozilla/5.0 (Linux; Android 8.0; Pixel 2 Build/OPD3.170816.012) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.102 Mobile Safari/537.36',
      DEBUGGER_API_LEVEL = '1.3',
      BIG_MODE_SCALE_FACTOR = 1.5,
      APP_NAME = 'TrayGram';

let win,
    tray,
    bigMode = false;

const uri = 'https://www.instagram.com/';

function sendCommandToDebugger(name, params = {}, callback) {
    win.webContents.debugger.sendCommand(name, params, (error, result) => {
        const cmdString = 'Debugger::' + name + '(' + JSON.stringify(params) + '):';

        if (Object.keys(error).length > 0) {
            console.warn(cmdString, 'Error:', error);
            return;
        }

        console.log(cmdString, result);

        if (callback) {
            callback(result);
        }
    });
}

function enableMobile() {
    try {
        win.webContents.setUserAgent(USER_AGENT);
        win.webContents.debugger.attach(DEBUGGER_API_LEVEL);

        sendCommandToDebugger('Browser.getVersion');
        sendCommandToDebugger('Emulation.canEmulate');
        sendCommandToDebugger('Emulation.setTouchEmulationEnabled', {
            enabled: true,
            maxTouchPoints: 2,
        });

        sendCommandToDebugger('Emulation.setEmitTouchEventsForMouse', {
            enabled: true
        });
    } catch (err) {
        console.error('Could not enable debugging: ', err);
    }
}

function getZoomFactor() {
    return bigMode ? BIG_MODE_SCALE_FACTOR : 1.0;
}

function getScreenWidth() {
    return Math.floor(SCREEN_WIDTH * getZoomFactor());
}

function getScreenHeight() {
    return Math.floor(getScreenWidth() / SCREEN_RATIO);
}

function updateScreenSizing() {
    win.webContents.setZoomFactor(getZoomFactor());
    win.setSize(getScreenWidth(), getScreenHeight(), true);
}

function getWindowOptions() {
    return {
        title: APP_NAME,
        icon: './icon.ico',
        width: getScreenWidth(),
        height: getScreenHeight(),
        resizable: false,
        show: false,
        webPreferences: {
            nodeIntegration: false,
        }
    };
}

function onBigModeToggleClick(menuItem, browserWindow, event) {
    bigMode = menuItem.checked;
    updateScreenSizing();
}

function createMainMenu() {
    return Menu.buildFromTemplate([
        {label: 'Big Mode', type: 'checkbox', click: onBigModeToggleClick},
        {type: "separator"},
        {role: "quit", label: `Quit ${APP_NAME}`},
    ]);
}

function createTray() {
    tray = new Tray('./tray.jpg');

    tray.setToolTip(APP_NAME);
    tray.setContextMenu(createMainMenu());
}

function createWindow () {
    win = new BrowserWindow(getWindowOptions());
    win.setMenu(null);

    enableMobile();

    win.loadURL(uri, {
        userAgent: USER_AGENT
    });

    win.on('closed', () => {
        win = null;
    });

    win.once('ready-to-show', () => {
        win.webContents.setZoomFactor(getZoomFactor());
        win.show()
    });

    win.webContents.on('dom-ready', function(e) {
        // win.webContents.executeJavaScript('alert("dupa");');
        win.webContents.insertCSS('* { outline: none !important; }');
    });

    createTray();
}

app.on('ready', createWindow);
app.on('activate', () => { if (null === win) { createWindow(); } });
app.on('window-all-closed', () => { app.quit() });
