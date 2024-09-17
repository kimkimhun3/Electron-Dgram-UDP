const { app, BrowserWindow, ipcMain, powerSaveBlocker } = require('electron');
const path = require('path');
const { Worker } = require('worker_threads');

let mainWindow;
let powerSaveBlockerId;
let receivingWorker;
let sendingWorker;
let packetBuffer = [];
let isBuffering = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      nodeIntegrationInWorker: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js'),
      backgroundThrottling: false,
    },
  });

  mainWindow.loadFile('index.html');
  mainWindow.on('focus', () => {
    console.log("Window focused");
  });

  mainWindow.on('blur', () => {
    console.log("Window lost focus");
  });

  powerSaveBlockerId = powerSaveBlocker.start('prevent-app-suspension');
  console.log(`Power save blocker started with id: ${powerSaveBlockerId}`);

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (powerSaveBlocker.isStarted(powerSaveBlockerId)) {
      powerSaveBlocker.stop(powerSaveBlockerId);
      console.log(`Power save blocker stopped with id: ${powerSaveBlockerId}`);
    }
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  ipcMain.on('start-udp', (event, { inputPort, outputAddress }) => {
    if (receivingWorker || sendingWorker) {
      console.log('UDP workers are already running');
      return;
    }
    startReceivingWorker(inputPort, outputAddress);
    startSendingWorker(inputPort, outputAddress);
  });

  ipcMain.on('start-udp-buffer', (event, { inputPort, outputAddress, bufferTime }) => {
    if (isBuffering) {
      console.log('Buffering is already in progress');
      return;
    }
    startBuffering(inputPort, outputAddress, bufferTime);
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

function startReceivingWorker(inputPort, outputAddress) {
  receivingWorker = new Worker(path.join(__dirname, 'receivingWorker.js'), {
    workerData: { inputPort, outputAddress },
  });

  receivingWorker.on('message', (message) => {
    if (isBuffering) {
      packetBuffer.push(message.packet); // Buffer packets during the buffering phase
    } else {
      // Immediately forward packets to the sending worker
      sendingWorker.postMessage({ packet: message.packet });
    }
  });

  receivingWorker.on('error', (err) => {
    console.error(`Receiving worker error: ${err.message}`);
  });

  receivingWorker.on('exit', (code) => {
    if (code !== 0) {
      console.error(`Receiving worker exited with error code ${code}`);
    }
  });
}

function startSendingWorker(inputPort, outputAddress) {
  sendingWorker = new Worker(path.join(__dirname, 'sendingWorker.js'), {
    workerData: { inputPort, outputAddress },
  });

  sendingWorker.on('error', (err) => {
    console.error(`Sending worker error: ${err.message}`);
  });

  sendingWorker.on('exit', (code) => {
    if (code !== 0) {
      console.error(`Sending worker exited with error code ${code}`);
    }
  });
}

function startBuffering(inputPort, outputAddress, bufferTime) {
  console.log('Starting buffering...');

  isBuffering = true;

  setTimeout(() => {
    console.log('Buffering complete. Sending buffered packets...');
    packetBuffer.forEach((packet) => {
      sendingWorker.postMessage({ packet });
    });
    packetBuffer = []; // Clear buffer after sending
    isBuffering = false;
  }, bufferTime);
}
