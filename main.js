const { app, BrowserWindow, ipcMain, powerSaveBlocker } = require('electron');
const path = require('path');
const dgram = require('dgram');
const { Worker } = require('worker_threads'); // Import Worker from worker_threads

let mainWindow;
let powerSaveBlockerId;
let server;
let client;
let worker;
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
    if (server || client) {
      console.log('UDP sockets are already running');
      return;
    }
    startUdpSockets(inputPort, outputAddress);
  });

  ipcMain.on('start-udp-buffer', (event, { inputPort, outputAddress, bufferTime }) => {
    if (isBuffering) {
      console.log('Buffering is already in progress');
      return;
    }
    startBufferingInWorker(inputPort, outputAddress, bufferTime);
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

function startUdpSockets(inputPort, outputAddress) {
  server = dgram.createSocket('udp4');
  client = dgram.createSocket('udp4');

  client.on('message', (msg, rinfo) => {
    if (isBuffering) {
      packetBuffer.push(msg); // Buffer packets during the buffering phase
    } else {
      server.send(msg, inputPort, outputAddress, (err) => {
        if (err) {
          console.error(`Error sending message to ${outputAddress}: ${err.message}`);
        }
      });
    }
  });

  client.bind(inputPort);

  client.on('listening', () => {
    const address = client.address();
    console.log(`Client listening on ${address.address}:${address.port}`);
  });

  server.on('listening', () => {
    const address = server.address();
    console.log(`Server listening on ${address.address}:${address.port}`);
  });
}

function startBufferingInWorker(inputPort, outputAddress, bufferTime) {
  console.log('Starting buffering in worker...');
  isBuffering = true;

  worker = new Worker(path.join(__dirname, 'worker.js'), {
    workerData: {
      bufferTime: bufferTime,
    },
  });

  worker.on('message', (message) => {
    if (message === 'sendBufferedPackets') {
      // Send the buffered packets after buffer time elapses
      sendBufferedPackets(inputPort, outputAddress);
      isBuffering = false;
      packetBuffer = []; // Clear the buffer
      console.log('Buffering complete. Switching back to normal operation.');
    }
  });

  worker.on('error', (err) => {
    console.error(`Worker error: ${err.message}`);
  });

  worker.on('exit', (code) => {
    console.log(`Worker exited with code ${code}`);
    if (code !== 0) {
      console.error(`Worker stopped unexpectedly`);
    }
  });
}

function sendBufferedPackets(inputPort, outputAddress) {
  const totalPackets = packetBuffer.length;
  console.log(`Sending ${totalPackets} buffered packets...`);

  packetBuffer.forEach((packet) => {
    server.send(packet, inputPort, outputAddress, (err) => {
      if (err) {
        console.error(`Error sending buffered packet: ${err.message}`);
      }
    });
  });
}
