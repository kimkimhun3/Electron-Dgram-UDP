const { app, BrowserWindow, ipcMain, powerSaveBlocker } = require('electron');
const path = require('path');
const dgram = require('dgram');

let mainWindow;
let powerSaveBlockerId;
let server;
let client;
let packetBuffer = [];
let bufferTimeout;
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
    if (!server || !client) {
      startUdpSockets(inputPort, outputAddress);
    }
    isBuffering = false;  // Ensure normal operation
  });

  ipcMain.on('start-udp-buffer', (event, { inputPort, outputAddress, bufferTime }) => {
    if (!server || !client) {
      startUdpSockets(inputPort, outputAddress);
    }
    isBuffering = true;  // Activate buffering mode
    startBuffering(bufferTime, inputPort, outputAddress);
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
      packetBuffer.push(msg);  // Buffer the packets if in buffering mode
    } else {
      server.send(msg, inputPort, outputAddress, (err) => {
        if (err) {
          console.error(`Error sending message to ${outputAddress}: ${err.message}`);
        }
      });
    }
  });

  client.on('listening', () => {
    const address = client.address();
    console.log(`Client listening on ${address.address}:${address.port}`);
  });

  server.on('listening', () => {
    const address = server.address();
    console.log(`Server listening on ${address.address}:${address.port}`);
  });

  client.bind(inputPort);
}

function startBuffering(bufferTime, inputPort, outputAddress) {
  console.log(`Buffering for ${bufferTime} ms...`);

  bufferTimeout = setTimeout(() => {
    sendBufferedPackets(inputPort, outputAddress);
    isBuffering = false;  // Switch back to normal UDP forwarding
    packetBuffer = [];    // Clear the buffer after sending
  }, bufferTime);
}

function sendBufferedPackets(inputPort, outputAddress) {
  const totalPackets = packetBuffer.length;
  console.log(`Sending ${totalPackets} buffered packets...`);

  packetBuffer.forEach(packet => {
    server.send(packet, inputPort, outputAddress, (err) => {
      if (err) {
        console.error(`Error sending buffered packet: ${err.message}`);
      }
    });
  });
}
