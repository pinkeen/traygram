const {app, session, nativeImage, BrowserWindow, Menu, Tray} = require('electron');

const SCREEN_RATIO = 0.60,
      SCREEN_WIDTH = 500,
      USER_AGENT = 'Mozilla/5.0 (Linux; Android 8.0; Pixel 2 Build/OPD3.170816.012) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.102 Mobile Safari/537.36',
      DEBUGGER_API_LEVEL = '1.3',
      BIG_MODE_SCALE_FACTOR = 1.5,
      APP_NAME = 'TrayGram';

let win,
    tray,
    bigMode = false,
    menu;

const uri = 'https://www.instagram.com';

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
    win.setSize(getScreenWidth(), getScreenHeight());

    const pos = getWindowPosition();
    win.setPosition(pos.x, pos.y);
}

function getWindowOptions() {
    return {
        title: APP_NAME,
        icon: __dirname + '/assets/icon.png',
        width: getScreenWidth(),
        height: getScreenHeight(),
        frame: false,
        resizable: false,
        show: false,
        alwaysOnTop: true,
        webPreferences: {
            nodeIntegration: false,
        }
    };
}

function onBigModeToggleClick(menuItem, browserWindow, event) {
    bigMode = menuItem.checked;
    updateScreenSizing();
}

function onQuitClick() {
    app.isQuiting = true;
    app.quit();
}

function createMainMenu() {
    return Menu.buildFromTemplate([
        {label: 'Big Mode', type: 'checkbox', click: onBigModeToggleClick},
        {type: "separator"},
        {label: `Quit ${APP_NAME}`, click: onQuitClick},
    ]);
}

function getTrayIcon() {
    let image = nativeImage.createFromPath(__dirname + '/assets/icon-tray.png');

    image.setTemplateImage(true);

    return image;
}

function createTray() {
    let tray = new Tray(getTrayIcon());

    tray.setToolTip(APP_NAME);

    tray.on('click', toggleWindowShown);
    tray.on('double-click', showWindow);

    tray.on('right-click', () => {
        tray.popUpContextMenu(menu);
    });

    return tray;
}

function getWindowPosition() {
    const wb = win.getBounds();
    const tb = tray.getBounds();

    return {
        x: Math.round(tb.x + tb.width / 2 - wb.width / 2),
        y: Math.round(tb.y + tb.height + 10),
    };
}

function showWindow() {
    const p = getWindowPosition();

    win.setPosition(p.x, p.y);
    win.show();
}

function toggleWindowShown() {
    if (win.isVisible()) {
        win.hide();
    } else {
        showWindow();
    }
}

function createWindow () {
    win = new BrowserWindow(getWindowOptions());
    win.setMenu(null);
    win.setSkipTaskbar(true);

    menu = createMainMenu();
    tray = createTray();

    enableMobile();

    win.loadURL(uri, {
        userAgent: USER_AGENT
    });

    win.on('minimize',function(event){
        event.preventDefault();
        win.hide();
    });

    win.on('close', function (event) {
        if (!app.isQuiting){
            event.preventDefault();
            win.hide();
        }

        return false;
    });

    win.webContents.on('dom-ready', function(e) {
        win.webContents.insertCSS('* { outline: none !important; }');
        win.webContents.setZoomFactor(getZoomFactor());
    });

    win.on('page-title-updated', (evt) => {
        evt.preventDefault();
    });
}

app.on('ready', createWindow);
app.on('activate', () => { if (null === win) { createWindow(); } });
// app.on('window-all-closed', () => { app.quit() });
