//file-split modules
const encoder = require('./src/Encode.js');
const decoder = require('./src/Decode.js');
const HashCheck = require('./src/HashCheck.js');
const logger = require('../logger').getLogger('redundancy-index');
let blockchainRef = null;
const upload = require('../distribute/upload.js').upload;
const config = require('../config');
const fs = require('fs');
const request = require('request');
const path = require('path');

let frags = [];
let size = 0;
let decoded = null;
const ips = ['172.16.0.10', '172.16.0.20', '172.16.0.30', '172.16.0.40'];

const encodeFile = (fname, ext, blk) => {
    encoder.start(fname, ext, blk).then((bl) => {
        //logger.warn(bl.transactions.length);
        logger.info('successfully encoded');
        let asyncsLeft = 0;
        for (let i = 0; i < bl.transactions[0].frags.length; i++) {
            asyncsLeft++;
            upload(`${ips[i % 4]}`, config.TEMP_DIR + '/' + bl.transactions[0].frags[i].fragLocation).then((msg) => {
                try {
                    // fs.unlinkSync(config.TEMP_DIR + '/' + bl.transactions[0].frags[i].fragLocation)
                    // file removed
                } catch (err) {
                    console.error(err)
                }
                bl.transactions[0].frags[i].fragLocation = ips[i % 4] + '/' + bl.transactions[0].frags[i].fragLocation;
                asyncsLeft--;
                if(asyncsLeft === 0 ){
                    blockchainRef.store(bl.owner, bl.file, bl.transactions);
                }
            });
        }
        logger.info(bl.transactions[0].frags);
    }).catch((e) => {
        logger.error(e);
    });
};

const preDecode = (frag, len, name) => {
    size = len;
    decoded = name;
    frags = frag;
    return new Promise((resolve, reject) => {
        download().then(() => {
            frags[0].name = config.TEMP_DIR + '/' + frags[0].name.split("/")[1];
            frags[1].name = config.TEMP_DIR + '/' + frags[1].name.split("/")[1];
            frags[2].name = config.TEMP_DIR + '/' + frags[2].name.split("/")[1];
            frags[3].name = config.TEMP_DIR + '/' + frags[3].name.split("/")[1];
            decodeFile().then(()=>{
                resolve()
            }).catch(e=>{
                reject(e)
            });

        });
    });
};

const download = () => {
    return new Promise((resolve, reject) => {
        let asyncsLeft = 0;
        for (let i = 0; i < frags.length; i++) {
            asyncsLeft++;
            request.post('http://' + frags[i].name.split("/")[0] + ':4000/downloading/' + '172.16.0.10/' + path.basename(frags[i].name.split("/")[1]))
                .on('response', function (response) {
                    asyncsLeft--;
                    if(asyncsLeft === 0){
                        resolve();
                    }
                })
        }
    });

};
const decodeFile = () => {
    return new Promise((resolve, reject) => {
        decoder.start(frags, size, decoded).then(() => {
            logger.info('successfully decoded');
            resolve();
        }).catch((e) => {
            logger.error(e.toString());
            reject();
        });
    });

};


const verifyHash = (file1, file2) => {
    HashCheck.verifyIntegrity(file1, file2);
};

const setBlockchainRef = (blkchainrf) => {
    blockchainRef = blkchainrf;
};

module.exports = {
    setBlockchainRef,
    encodeFile,
    decodeFile,
    verifyHash,
    download,
    preDecode
};