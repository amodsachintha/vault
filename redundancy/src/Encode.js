//global modules
const PrimeField = require('rye').PrimeField;
const field = new PrimeField(257);
const fs = require("fs");
const logger = require('../../logger').getLogger('redundancy-encoder');
//file-split modules
const config = require('../../config');
const getHash = require("./HashCheck").getHash;
const getStringHash = require("./HashCheck").getStringHash;

let mainBuff, mainBuffSize, subBuffSize, shardCount = 4, block, filename, extension;

const start = (fname, ext, blk) => {
    filename = `${config.TEMP_DIR}/${fname}`;
    block = blk;
    logger.warn(filename);
    extension = ext;
    return new Promise((resolve, reject) => {
        if (validateInput(filename, extension) === 1) {
            init(fname, ext, blk);
            let bl = encode();
            bl.then((blb) => {
                resolve(blb)
            });
        } else {
            reject('invalid file');
        }
    })
};

const init = () => {
    mainBuff = fs.readFileSync(filename + extension);
    mainBuffSize = mainBuff.length;

    subBuffSize = 0;
    if (mainBuffSize % shardCount === 0) {
        subBuffSize = parseInt(mainBuffSize / shardCount);
    } else {
        subBuffSize = (parseInt(mainBuffSize / shardCount)) + 1;
    }
};

const validateInput = (filename, extension) => {
    logger.debug(filename);
    if (filename && extension) {
        if (fs.existsSync(filename + extension)) {
            return 1;
        } else {
            logger.error('File cannot be found !!');
            return 0;
        }
    } else {
        logger.error('Invalid file name or extension');
        return 0;
    }
};


const encode = () => {
    if (shardCount === 4) {
        let shard1 = mainBuff.slice(0, subBuffSize);
        let shard2 = mainBuff.slice(subBuffSize, subBuffSize * 2);
        let shard3 = mainBuff.slice(subBuffSize * 2, subBuffSize * 3);
        let shard4 = generateLastShard(mainBuff.slice(subBuffSize * 3, mainBuffSize));

        let parity1 = Buffer.allocUnsafe(subBuffSize);
        let parity2 = Buffer.allocUnsafe(subBuffSize);

        let additionalParity1Bytes = Buffer.allocUnsafe(Math.trunc(subBuffSize / 8) + 1);
        let additionalParity2Bytes = Buffer.allocUnsafe(Math.trunc(subBuffSize / 8) + 1);

        let additionalParity1Bits = [];
        let additionalParity2Bits = [];
        additionalParity1Bits.push(1);
        additionalParity2Bits.push(1);

        // generate parity shards
        for (let i = 0; i < subBuffSize; i++) {
            let parity1Byte = field.add(field.add(shard1[i], shard2[i]), field.add(shard3[i], shard4[i]));
            let parity2Byte = field.add(field.add(field.mul(2, shard1[i]), field.mul(4, shard2[i])), field.add(field.mul(6, shard3[i]), field.mul(8, shard4[i])));
            // parity 1, 0 check
            if (parity1Byte === 0) {
                additionalParity1Bits.push(1);
                parity1[i] = parity1Byte;
            } else {
                additionalParity1Bits.push(0);
                parity1[i] = parity1Byte - 1;
            }
            // parity 2, 0 check
            if (parity2Byte === 0) {
                additionalParity2Bits.push(1);
                parity2[i] = parity2Byte;
            } else {
                additionalParity2Bits.push(0);
                parity2[i] = parity2Byte - 1;
            }
        }

        // convert bit stream 1 to byte stream
        let extraBitsNeeded1 = (Math.trunc(additionalParity1Bits.length / 8) + 1) * 8 - (additionalParity1Bits.length);

        if (additionalParity1Bits.length / 8 === 0) {
            for (let t = 0; t < additionalParity1Bytes.length; t++) {
                additionalParity1Bytes[t] = '0b' + additionalParity1Bits[(t * 8)] + additionalParity1Bits[(t * 8) + 1] + additionalParity1Bits[(t * 8) + 2] + additionalParity1Bits[(t * 8) + 3] + additionalParity1Bits[(t * 8) + 4] + additionalParity1Bits[(t * 8) + 5] + additionalParity1Bits[(t * 8) + 6] + additionalParity1Bits[(t * 8) + 7];
            }
        } else {
            for (let u = 0; u < extraBitsNeeded1; u++) {
                additionalParity1Bits.push(0);
            }
            for (let t = 0; t < additionalParity1Bytes.length; t++) {
                additionalParity1Bytes[t] = '0b' + additionalParity1Bits[(t * 8)] + additionalParity1Bits[(t * 8) + 1] + additionalParity1Bits[(t * 8) + 2] + additionalParity1Bits[(t * 8) + 3] + additionalParity1Bits[(t * 8) + 4] + additionalParity1Bits[(t * 8) + 5] + additionalParity1Bits[(t * 8) + 6] + additionalParity1Bits[(t * 8) + 7];
            }
        }

        // convert bit stream 2 to byte stream
        let extraBitsNeeded2 = (Math.trunc(additionalParity2Bits.length / 8) + 1) * 8 - (additionalParity2Bits.length);

        if (additionalParity2Bits.length / 8 === 0) {
            let t;
            for (t = 0; t < additionalParity2Bytes.length; t++) {
                additionalParity2Bytes[t] = '0b' + additionalParity2Bits[(t * 8)] + additionalParity2Bits[(t * 8) + 1] + additionalParity2Bits[(t * 8) + 2] + additionalParity2Bits[(t * 8) + 3] + additionalParity2Bits[(t * 8) + 4] + additionalParity2Bits[(t * 8) + 5] + additionalParity2Bits[(t * 8) + 6] + additionalParity2Bits[(t * 8) + 7];
            }
        } else {
            for (let u = 0; u < extraBitsNeeded2; u++) {
                additionalParity2Bits.push(0);
            }
            for (let t = 0; t < additionalParity2Bytes.length; t++) {
                additionalParity2Bytes[t] = '0b' + additionalParity2Bits[(t * 8)] + additionalParity2Bits[(t * 8) + 1] + additionalParity2Bits[(t * 8) + 2] + additionalParity2Bits[(t * 8) + 3] + additionalParity2Bits[(t * 8) + 4] + additionalParity2Bits[(t * 8) + 5] + additionalParity2Bits[(t * 8) + 6] + additionalParity2Bits[(t * 8) + 7];
            }
        }

        let p1 = createShard(shard1, getStringHash(block.owner.uuid + '.1' + Date.now() + filename )+'1', 1);
        let p2 = createShard(shard2, getStringHash(block.owner.uuid + '.2' + Date.now() + filename )+'2', 2);
        let p3 = createShard(shard3, getStringHash(block.owner.uuid + '.3' + Date.now() + filename )+'3', 3);
        let p4 = createShard(shard4, getStringHash(block.owner.uuid + '.4' + Date.now() + filename )+'4', 4);
        let p5 = createShard(Buffer.concat([parity1, additionalParity1Bytes]), getStringHash(block.owner.uuid + '.5' + Date.now() + filename )+'5', 5);
        let p6 = createShard(Buffer.concat([parity2, additionalParity2Bytes]), getStringHash(block.owner.uuid + '.6' + Date.now() + filename )+'6', 6);
        return Promise.all([p1, p2, p3, p4, p5, p6]).then((arr) => {
            block.transactions[0].frags = arr;
            // try {
            //     fs.unlinkSync(filename + extension);
            // } catch(err) {console.error(err)}
            return block;
        }).catch(er => {
            logger.error(er);
        })
    }
};


const generateLastShard = (shard) => {
    let originalShard4 = shard;

    if ((mainBuffSize % shardCount) !== 0) {
        let neededBytes = subBuffSize % shard.length;
        const padding = Buffer.allocUnsafe(neededBytes);
        let i;
        for (i = 0; i < neededBytes; i++) {
            // add hex 0x00 as padding
            padding[i] = 0x00;
        }
        let array = [originalShard4, padding];
        return Buffer.concat(array);

    } else {
        let array = [originalShard4];
        return Buffer.concat(array);
    }
};

const createShard = (shard, name, count) => {
    return new Promise((resolve, reject) => {
        try {
            fs.writeFile(config.TEMP_DIR+'/'+name, shard, function (err) {
                if (err) {
                    reject(err)
                }
                let frag = {
                    index: count,
                    RSfragCount: 6,
                    fragHash: getHash(config.TEMP_DIR+'/'+name),
                    fragLocation: name
                };
                resolve(frag)
            });

        } catch (e) {
            console.log('Error:', e.stack);
            reject(e);
        }
    });
};

module.exports = {
    start
};
