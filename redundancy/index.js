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
const axios = require('axios');
const path = require('path');

let frags = [];
let size = 0;
let decoded = null;
const ips = ['172.16.0.10', '172.16.0.20', '172.16.0.30', '172.16.0.40', '172.16.0.40', '172.16.0.40'];

const encodeFile = (fname, blk, idx) => {
    return encoder.start(fname, blk, idx).then((bl) => {
        return new Promise((resolve, reject) => {
            logger.info('successfully encoded');
            let asyncsLeft = 0;
            for (let j = 0; j < 6; j++) {
                asyncsLeft++;
                console.log(idx + '-' + j + ' test test :::' + path.basename(bl.transactions[idx].frags[j].fragLocation));
                upload(`${ips[j % 4]}`, config.TEMP_DIR + '/' + bl.transactions[idx].frags[j].fragLocation).then((msg) => {
                    try {
                        fs.unlinkSync(config.TEMP_DIR + '/' + path.basename(bl.transactions[idx].frags[j].fragLocation))
                        // file removed
                    } catch (err) {
                        logger.error(err)
                    }
                    bl.transactions[idx].frags[j].fragLocation = ips[j % 4] + '/' + bl.transactions[idx].frags[j].fragLocation;
                    asyncsLeft--;
                    if (asyncsLeft === 0) {
                        resolve(bl.transactions[idx]);
                    }
                });
            }
            logger.info(bl.transactions);
        });
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

            decodeFile().then(() => {
                resolve()
            }).catch(e => {
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
            let url = 'http://' + frags[i].name.split("/")[0] + ':4000/downloading/' + path.basename(frags[i].name.split("/")[1]);
            axios({
                method: 'POST',
                url: url,
                responseType: 'stream'
            }).then(resp => {
                let handle = resp.data.pipe(fs.createWriteStream(__dirname + '/../tmp/' + frags[i].name.split("/")[1]));
                handle.on('finish', () => {
                    asyncsLeft--;
                    if (asyncsLeft === 0) {
                        resolve();
                    }
                });
            }).catch(e => {
                asyncsLeft--;
                if (asyncsLeft === 0) {
                    resolve();
                }
                logger.warn(e);
            });
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