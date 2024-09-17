const { parentPort, workerData } = require('worker_threads');

// Destructure the bufferTime passed from the main thread
const { bufferTime } = workerData;

// Simulate buffering (in this case, just waiting for bufferTime)
console.log(`Buffering for ${bufferTime} ms...`);

setTimeout(() => {
  // Inform the main process to send buffered packets
  parentPort.postMessage('sendBufferedPackets');
}, bufferTime);
