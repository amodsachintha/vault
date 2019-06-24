const config = require('./../../config');
const server = require('http').createServer();
const io = require('socket.io')(server, {path: '/messenger', serveClient: false, cookie: false});
const c = require('./constants');
const logger = require('../../logger').getLogger('messenger-server');
let blockchainRef = undefined;
// connections to vault clients via server handle.
let clients = [];

const bootstrap = (blockchain) => {
    blockchainRef = blockchain;
    io.on('connection', client => {
        let host = client.handshake.address;
        clients.push({
            client: client,
            host: host
        });
        logger.info(`Client connected: ${host}`);

        client.on(c.SYNC_CHAIN_VERSION, () => {
            logger.info(`recv: ${c.SYNC_CHAIN_VERSION} from: ${host}`);
            // send local chain version
            client.emit(c.SYNC_CHAIN_VERSION_RESPONSE, {
                chain_version: blockchainRef.getLocalChainVersion()
            });
            logger.info(`send: ${c.SYNC_CHAIN_VERSION_RESPONSE} to: ${host}`);
        });

        client.on(c.SYNC_CHAIN, data => {
            logger.info(`recv: ${c.SYNC_CHAIN} from: ${host}`);
            // send local chain
            let chain = blockchainRef.getChain(false).map(bl => {
                let transactions = bl.transactions.map((transaction) => {
                    let frags = transaction.frags.map((frag) => {
                        return {
                            index: frag.index,
                            RSfragCount: frag.RSfragCount,
                            fileHash: frag.fileHash,
                            fragHash: frag.fileHash,
                            fragLocation: frag.fragLocation,
                        }
                    });
                    return {
                        index: transaction.index,
                        encFragCount: transaction.encFragCount,
                        fragHash: transaction.fragHash,
                        encFragHash: transaction.encFragHash,
                        frags: frags,
                        merkleRoot: transaction.merkleRoot,
                        transactionHash: transaction.transactionHash,
                        rsConfig: transaction.rsConfig
                    }
                });
                return {
                    index: bl.index,
                    previousHash: bl.previousHash,
                    owner: bl.owner,
                    file: bl.file,
                    transactions: transactions,
                    merkleRoot: bl.merkleRoot,
                    timestamp: bl.timestamp,
                    blockHash: bl.blockHash
                }
            });
            client.emit(c.SYNC_CHAIN_RESPONSE, chain);
            logger.info(`send: ${c.SYNC_CHAIN_RESPONSE} to: ${host}`);
        });

        client.on('disconnect', (reason) => {
            clients = clients.filter((cl)=>{
                return cl.client !== client
            });
            logger.warn(`Disconnected from client at ${client.handshake.address} reason: ${reason}`);
        });

    });

    server.listen(config.MESSENGER_SERVER_PORT || 4444, '0.0.0.0');
    logger.info(`SocketIO Server started. Listening on ${config.MESSENGER_SERVER_PORT || 4444}`);
};

const broadcastMessage = (type, data) => {
    if (type === c.BROADCAST_NEW_BLOCK) {
        logger.info(`bcast: ${c.BROADCAST_NEW_BLOCK}`);
        logger.info(`CLIENTS.LENGTH: ${clients.length}`);
        clients.forEach(client => {
            client.client.emit(c.RECV_NEW_BLOCK, data)
        });
    }

};

const getClients = () => {
    return clients.map(cl => cl.host);
};

module.exports = {
    bootstrap,
    broadcastMessage,
    getClients
};