const server = require('./server');
const client = require('./client');
const ip = require('ip');
const config = require('../../config');

console.log('Node Address: ' + ip.address());
if (ip.address() === '172.16.0.10') {
    config.VAULTS = config.VAULTS.filter(ip => ip !== '172.16.0.10')
} else if (ip.address() === '172.16.0.20') {
    config.VAULTS = config.VAULTS.filter(ip => ip !== '172.16.0.20')
} else if (ip.address() === '172.16.0.30') {
    config.VAULTS = config.VAULTS.filter(ip => ip !== '172.16.0.30')
} else if (ip.address() === '172.16.0.40') {
    config.VAULTS = config.VAULTS.filter(ip => ip !== '172.16.0.40')
}

// client.bootstrap();
const initMessenger = (blockchain) => {
    server.bootstrap(blockchain);
    client.bootstrap(blockchain);
};

// broadcast via server sockets
const broadcast = (type, data) => {
    server.broadcastMessage(type, data);
};

const getConnectedClientsToServer = () => {
    return server.getClients();
};


module.exports = {
    initMessenger,
    broadcast,
    getConnectedClientsToServer
};
