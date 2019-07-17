const data = require('./blockchain/mock/data');
const blockchain = require('./blockchain/blockchain');
const messenger = require('./messenger/messenger');
const CONSTANTS = require('./messenger/constants');
const logger = require('../logger').getLogger('index');

// initializing
logger.info('Initializing....');
blockchain.initializeChain();
messenger.initMessenger(blockchain);

const store = (owner, file, transactions) => {
    return new Promise((resolve, reject) => {
        blockchain.storeBlock(owner, file, transactions).then((block) => {
            messenger.broadcast(CONSTANTS.BROADCAST_NEW_BLOCK, block);
            resolve(block);
        }).catch(e => {
            logger.crit(e);
            reject(e)
        });
    })
};

const find = (index) => {
    return blockchain.findBlockByIndex(index).then(block => block);
};

const getChain = () => {
    return blockchain.getChain();
};

module.exports = {
    store,
    find,
    getChain
};