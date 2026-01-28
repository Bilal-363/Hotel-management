const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let backendProcess;

function startBackend() {
    const isDev = !app.isPackaged;

    if (isDev) {
        console.log('Running in Development Mode. Skipping backend spawn.');
        return;
    }

    // In production, spawn the packaged backend executable
    // The executable is copied to 'resources/Backend/backend-server.exe'
    const backendExePath = path.join(process.resourcesPath, 'Backend', 'backend-server.exe');
    console.log('Starting backend from:', backendExePath);

    backendProcess = spawn(backendExePath, [], {
        cwd: path.dirname(backendExePath),
        env: { ...process.env, PORT: 5000 }
    });

    backendProcess.stdout.on('data', (data) => {
        console.log(`Backend: ${data}`);
    });

    backendProcess.stderr.on('data', (data) => {
        console.error(`Backend Error: ${data}`);
    });
}

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        title: "Haji Waris Ali Hotel - POS System",
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        },
        icon: path.join(__dirname, 'public/vite.svg') // Using default vite icon for now if custom not available
    });

    // Load the local index.html file
    // win.loadURL('http://localhost:5173'); // For dev

    // In production, load the built file
    const startUrl = process.env.ELECTRON_START_URL || `file://${path.join(__dirname, 'dist/index.html')}`;
    win.loadURL(startUrl);

    // Remove menu bar for a cleaner look (optional)
    win.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
    startBackend();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        if (backendProcess) {
            backendProcess.kill();
        }
        app.quit();
    }
});
