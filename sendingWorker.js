const { parentPort, workerData } = require('worker_threads');
const dgram = require('dgram');

const { outputAddress } = workerData;

const server = dgram.createSocket('udp4');

parentPort.on('message', (message) => {
  const { packet } = message;
  server.send(packet, 5004, outputAddress, (err) => {
    if (err) {
      console.error(`Error sending packet to ${outputAddress}: ${err.message}`);
    }
  });
});

server.on('error', (err) => {
  console.error(`Sending worker error: ${err.message}`);
});
