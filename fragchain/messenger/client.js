const {VAULTS} = require('./../../config');
const ioClient = require('socket.io-client');
const c = require('./constants');
const logger = require('../../logger').getLogger('messenger-client');
let blockchainRef = undefined;
const ipaddr = require('ip');

// connections to vault servers via socket
let sockets = [];
let localChainVersion = 0;
let latestChainVersion = null;


const bootstrap = (blockchain) => {
    blockchainRef = blockchain;
    localChainVersion = blockchain.getLocalChainVersion();
    latestChainVersion = {socket: null, version: blockchain.getLocalChainVersion()};
    initializeSockets();
};

const initializeSockets = () => {
    let socketIps = VAULTS.filter(ip => ip !== ipaddr.address());
    sockets = socketIps.map(ip => {
        let url = 'http://' + ip + ':4444';
        logger.info(`connect: ${url}/messenger`);
        const s = ioClient(url, {path: '/messenger'});
        return {
            socket: s,
            ip: ip
        };
    });

    sockets.forEach(sock => {
        onConnectForSocket(sock.socket, sock.ip);
        registerBaseEventsOnSocket(sock.socket, sock.ip);
        registerEventsOnSocket(sock.socket, sock.ip);
    });
};

const addSocket = (serverIP) => {
    let url = `http://${serverIP}:4444`;
    const sock = ioClient(url, {path: '/messenger'});
    registerBaseEventsOnSocket(sock);
    registerEventsOnSocket(sock, serverIP);
    sockets.push(sock);
};

const synchronizeChainVersionBroadcast = () => {
    return new Promise((resolve) => {
        sockets.forEach(sock => {
            logger.info(`send: ${c.SYNC_CHAIN_VERSION} to: ${sock.ip}:4444`);
            sock.socket.emit(c.SYNC_CHAIN_VERSION);
        });
        // console.log('(client)(info) in setTimeout!');
        setTimeout(() => {
            if (latestChainVersion.version > localChainVersion) {
                logger.info(`send: ${c.SYNC_CHAIN}`);
                latestChainVersion.socket.emit(c.SYNC_CHAIN);
                localChainVersion = latestChainVersion.version;
            }
            resolve();
        }, 10000)
    });

};

const registerEventsOnSocket = (socket, ip) => {
    socket.on(c.SYNC_CHAIN_VERSION_RESPONSE, data => {
        logger.info(`recv: ${c.SYNC_CHAIN_VERSION_RESPONSE} from: ${ip}:4444`);
        logger.info(`recv: chain_version: ${data.chain_version}`);
        if (data.chain_version > latestChainVersion.version) {
            latestChainVersion = {socket: socket, version: data.chain_version};
        }
    });

    socket.on(c.SYNC_CHAIN_RESPONSE, data => {
        logger.info(`recv: ${c.SYNC_CHAIN_RESPONSE} from: ${ip}:4444`);
        logger.info(`LENGTH_OF_RECEIVED_CHAIN: ${data.length}`);
        // todo replace localchain for now.. add processing changes to later
        blockchainRef.replaceChain(data);
    });

    socket.on(c.RECV_NEW_BLOCK, block => {
        logger.info(`recv: ${c.RECV_NEW_BLOCK} from: ${ip}:4444`);
        blockchainRef.storeBlockFromRemote(block).then((block) => {
            logger.info(`Successfully Saved block to chain: ${block.blockHash}`)
        }).catch((e) => {
            logger.debug(e);
        });
    });
};

const onConnectForSocket = (socket, ip) => {
    socket.on('connect', () => {
        logger.info(`Connected to server at: ${ip}:4444`);
        synchronizeChainVersionBroadcast().then(() => {
            logger.info(`Sync Chain Loop complete!`);
            // blockchainRef.validateLocalChain().then(val =>{
            //     console.log("Chain valid")
            // }).catch(e =>{
            //     console.log("Chain invalid!")
            // });
        });
    });
};

const registerBaseEventsOnSocket = (socket, ip) => {
    socket.on('connect_error', (err) => {
        logger.warn(`connect_error to server at: ${ip}:4444`);
        logger.debug(err.toString());
    });

    socket.on('connect_timeout', (err) => {
        logger.warn(`connect_timeout to server at: ${ip}:4444`);
        logger.debug(err.toString());
    });
};


module.exports = {
    sockets,
    addSocket,
    bootstrap
};