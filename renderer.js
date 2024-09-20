const { ipcRenderer } = require('electron');

// Handle button click to start UDP socket without buffering
document.getElementById('buffer2-main-execute').addEventListener('click', () => {
  const inputPort = document.getElementById('input-port').value;
  const outputAddress = document.getElementById('output-address').value;
  const bufferTime = document.getElementById('buffer2-times').value;

  // Check if buffer time is set (greater than 0), and perform buffering if required!
  if (parseInt(bufferTime, 10) > 0) {
    ipcRenderer.send('start-udp-buffer', {
      inputPort: parseInt(inputPort, 10),
      outputAddress: outputAddress,
      bufferTime: parseInt(bufferTime, 10)
    });
  } else {
    ipcRenderer.send('start-udp', {
      inputPort: parseInt(inputPort, 10),
      outputAddress: outputAddress
    });
  }
});
