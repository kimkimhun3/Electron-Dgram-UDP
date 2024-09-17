const { ipcRenderer } = require('electron');

// Handle button click to start UDP socket without buffering
document.getElementById('buffer2-main-execute').addEventListener('click', () => {
  const inputPort = document.getElementById('input-port').value;
  const outputAddress = document.getElementById('output-address').value;
  const bufferTime = document.getElementById('buffer2-times').value;

  if (bufferTime > 0) {
    // Start UDP with buffering
    ipcRenderer.send('start-udp-buffer', {
      inputPort: parseInt(inputPort, 10),
      outputAddress: outputAddress,
      bufferTime: parseInt(bufferTime, 10),
    });
  } else {
    // Start UDP without buffering
    ipcRenderer.send('start-udp', {
      inputPort: parseInt(inputPort, 10),
      outputAddress: outputAddress,
    });
  }
});
