const { parentPort, workerData } = require('worker_threads');
const dgram = require('dgram');

const { inputPort } = workerData;

const client = dgram.createSocket('udp4');

client.on('message', (msg, rinfo) => {
  // Send the packet to the main process for buffering or forwarding
  parentPort.postMessage({ packet: msg });
});

client.bind(inputPort);

client.on('listening', () => {
  const address = client.address();
  console.log(`Receiving worker listening on ${address.address}:${address.port}`);
});

client.on('error', (err) => {
  console.error(`Receiving worker error: ${err.message}`);
});
