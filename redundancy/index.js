//file-split modules
const encoder = require('./src/Encode.js');
const Decode = require('./src/Decode.js');
const HashCheck = require('./src/HashCheck.js');
const logger = require('../logger').getLogger('redundancy-index');
let blockchainRef = null;


const encodeFile = (fname, ext, blk) => {
    encoder.start(fname, ext, blk).then((bl) => {
        logger.warn(bl.transactions.length);
        blockchainRef.store(bl.owner, bl.file, bl.transactions).then((blk) => {
            logger.info(`Saved block to local chain: ${blk.blockHash}`);
        }).catch(e => {
            logger.error(e);
        });
        logger.info('successfully encoded');
    }).catch((e) => {
        logger.error(e);
    });
};

const decodeFile = (block) => {
    let decode = new Decode(block);
    decode.start().then(() => {
        logger.info('successfully decoded');
    }).catch((e) => {
        logger.error(e);
    });
};


const verifyHash = (file1, file2) => {
    let hash = new HashCheck();
    hash.verifyIntegrity(file1, file2);
};

const setBlockchainRef = (blkchainrf) => {
    blockchainRef = blkchainrf;
};

module.exports = {
    setBlockchainRef,
    encodeFile,
    decodeFile,
    verifyHash
};