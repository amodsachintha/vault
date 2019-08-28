//file-split modules
const encoder = require('./src/Encode.js');
const decoder = require('./src/Decode.js');
const HashCheck = require('./src/HashCheck.js');
const logger = require('../logger').getLogger('redundancy-index');
let blockchainRef = null;
const upload = require('../distribute/upload.js').upload;
const config = require('../config');
const fs = require('fs');
const axios = require('axios');
const path = require('path');

let decoded = null;

const encodeFile = (fname, blk, idx, ips) => {
    return encoder.start(fname, blk, idx).then((bl) => {
        return new Promise((resolve, reject) => {
            logger.info('successfully encoded');
            let asyncsLeft = 0;
            for (let j = 0; j < 6; j++) {
                asyncsLeft++;
                console.log(idx + '-' + j + ' test test :::' + path.basename(bl.transactions[idx].frags[j].fragLocation));
                upload(`${ips[j % ips.length]}`, config.TEMP_DIR + '/' + bl.transactions[idx].frags[j].fragLocation).then((msg) => {
                    try {
                        fs.unlinkSync(config.TEMP_DIR + '/' + path.basename(bl.transactions[idx].frags[j].fragLocation))
                        // file removed
                    } catch (err) {
                        logger.error(err);
                        reject()
                    }
                    bl.transactions[idx].frags[j].fragLocation = ips[j % ips.length] + '/' + bl.transactions[idx].frags[j].fragLocation;
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

const preDecode = (frags, size, name) => {
    decoded = name;
    return new Promise((resolve, reject) => {
        download(frags).then((fragR) => {
            fragR[0].name = config.TEMP_DIR + '/' + path.basename(fragR[0].name);
            fragR[1].name = config.TEMP_DIR + '/' + path.basename(fragR[1].name);
            fragR[2].name = config.TEMP_DIR + '/' + path.basename(fragR[2].name);
            fragR[3].name = config.TEMP_DIR + '/' + path.basename(fragR[3].name);
            decodeFile(fragR, name, size).then(() => {
                resolve()
            }).catch(e => {
                reject(e)
            });
        }).catch(e => {
            console.log(e)
        });
    });


};

const download = (frags) => {
    return new Promise((resolve, reject) => {
        let asyncsLeft = 0;
        for (let i = 0; i < frags.length; i++) {
            asyncsLeft++;
            let url = 'http://' + frags[i].name.split("/")[0] + ':4000/downloading/' + path.basename(frags[i].name);
            axios({
                method: 'POST',
                url: url,
                responseType: 'stream'
            }).then(resp => {
                let handle = resp.data.pipe(fs.createWriteStream(__dirname + '/../tmp/' + path.basename(frags[i].name)));
                handle.on('finish', () => {
                    asyncsLeft--;
                    if (asyncsLeft === 0) {
                        resolve(frags);
                    }
                });
            }).catch(e => {
                asyncsLeft--;
                if (asyncsLeft === 0) {
                    resolve();
                }
                logger.warn(e);
                reject(e)
            });
        }
    });

};
const decodeFile = (fragS, name, size) => {
    return new Promise((resolve, reject) => {
        decoder.start(fragS, size, name).then(() => {
            logger.info(`${name} successfully decoded`);
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