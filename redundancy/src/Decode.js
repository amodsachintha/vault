//global modules
const PrimeField = require('rye').PrimeField;
const field = new PrimeField(257);
const fs = require("fs");
const logger = require('../../logger').getLogger('redundancy-decode');

let mainBuffSize, subBuffSize, shardCount = 4, filenames , decodedFile;

const start = (frags,size,decoded) => {
    filenames = frags;
    mainBuffSize = size;
    decodedFile = decoded;

    return new Promise((resolve, reject) => {
            init();
            decode();
            resolve();
    })
};

const init = () => {
    subBuffSize = 0;
    if (mainBuffSize % shardCount === 0) {
        subBuffSize = parseInt(mainBuffSize / shardCount);
    } else {
        subBuffSize = (parseInt(mainBuffSize / shardCount)) + 1;
    }
};


const decode = () => {
    if (getFileCount() >= shardCount) {
        let data = [];

        for (let i = 1; i <= shardCount; i++) {
            if ( checkFile (i) ) {

                if ( i === shardCount) {
                    let end = mainBuffSize - ((shardCount - 1) * subBuffSize);
                    data.push(fs.readFileSync(getFileName(i)).slice(0, end));
                    console.log('done q' + i)
                } else {
                    data.push(fs.readFileSync(getFileName(i)));
                    console.log('done g' + i)
                }
            } else {
                data.push(generateShard(i));
            }
        }

        try {
            fs.writeFileSync(decodedFile, Buffer.concat(data))
                logger.info('File decoded successfully.');
                    // try {
                    //     fs.unlinkSync(filenames[0].name);
                    // } catch(err) {console.error(err)}
                    // try {
                    //     fs.unlinkSync(filenames[1].name);
                    // } catch(err) {console.error(err)}
                    // try {
                    //     fs.unlinkSync(filenames[2].name);
                    // } catch(err) {console.error(err)}
                    // try {
                    //     fs.unlinkSync(filenames[3].name);
                    // } catch(err) {console.error(err)}
        } catch (e) {
            console.log('Error:', e.stack);
        }
    } else {
        console.log('Wait until all the files are available ');
    }
};

    const checkAvailability = (name) => {
        return fs.existsSync(name);
    };

    const getFileCount = () => {
        return filenames.length;
    };

    const checkFile = (type) => {
        for (let i = 0; i < filenames.length; i++) {
            if(filenames[i].type === type )
            {
                return true;
            }
        }
        return false;
    }

    const getFileName = (type) => {
        for (let i = 0; i < filenames.length; i++) {
            if(filenames[i].type === type )
            {
                return filenames[i].name;
            }
        }
        return null;
    }

    const getDataCount = () => {
        let count = 0;
        for (let i = 1; i <= filenames.length; i++) {
            if (checkAvailability(filenames[i-1].name) && filenames[i-1].type <= 4 ) {
                count++;
            }
        }

        return count;
    }

    const generateShard= (position) => {
        if (shardCount === 4) {
            if (position === 4) {
                let withPadding = generateModeOne(position);
                let end = mainBuffSize - (3 * subBuffSize);

                return withPadding.slice(0, end);
            } else {
                return generateModeOne(position);
            }
        }
    }

    const generateModeOne = (position) => {
        let buff1 = Buffer.allocUnsafe(subBuffSize);
        let buff2 = Buffer.allocUnsafe(subBuffSize);
        let buff3 = Buffer.allocUnsafe(subBuffSize);
        let buff4 = Buffer.allocUnsafe(subBuffSize);
        let buffP1 = Buffer.allocUnsafe(subBuffSize);
        let buffP2 = Buffer.allocUnsafe(subBuffSize);

        let additionalParity1Bytes = Buffer.allocUnsafe(subBuffSize / 8);
        let additionalParity2Bytes = Buffer.allocUnsafe(subBuffSize / 8);

        let additionalParity1Bits = [];
        let additionalParity2Bits = [];

        if (checkFile(1)) {
            buff1 = fs.readFileSync(getFileName(1));
        }
        if (checkFile(2)) {
            buff2 = fs.readFileSync(getFileName(2));
        }
        if (checkFile(3)) {
            buff3 = fs.readFileSync ( getFileName(3));
        }
        if (checkFile(4)) {
            buff4 = fs.readFileSync(getFileName(4));
        }

        if (checkFile(5)) {
            buffP1 = fs.readFileSync(getFileName(5));
            additionalParity1Bytes = fs.readFileSync(getFileName(5)).slice(subBuffSize, Math.trunc(subBuffSize + subBuffSize / 8) + 1);

            for (let c = 0; c < additionalParity1Bytes.length; c++) {
                let bitStream = additionalParity1Bytes[c].toString(2);
                if (bitStream.length === 8) {
                    for (let b = 0; b < 8; b++) {
                        additionalParity1Bits.push(Number(bitStream[b]));
                    }
                } else {
                    for (let b = 0; b < (8 - bitStream.length); b++) {
                        additionalParity1Bits.push(0);
                    }
                    for (let v = 0; v < bitStream.length; v++) {
                        additionalParity1Bits.push(Number(bitStream[v]));
                    }

                }
            }

        }

        if (checkFile(6)) {
            buffP2 = fs.readFileSync(getFileName(6));
            additionalParity2Bytes = fs.readFileSync(getFileName(6)).slice(subBuffSize, Math.trunc(subBuffSize + subBuffSize / 8) + 1);

            for (let c = 0; c < additionalParity2Bytes.length; c++) {
                let bitStream = additionalParity2Bytes[c].toString(2);
                if (bitStream.length === 8) {
                    for (let b = 0; b < 8; b++) {
                        additionalParity2Bits.push(Number(bitStream[b]));
                    }
                } else {
                    for (let b = 0; b < (8 - bitStream.length); b++) {
                        additionalParity2Bits.push(0);
                    }
                    for (let v = 0; v < bitStream.length; v++) {
                        additionalParity2Bits.push(Number(bitStream[v]));
                    }

                }
            }
        }

        let tempBuff = Buffer.allocUnsafe(subBuffSize);

        if (getDataCount() === 3) {
            if (checkFile(5)) {
                if (position === 1) {
                    for (let k = 0; k < subBuffSize; k++) {
                        if (additionalParity1Bits[k + 1] === 1) {
                            tempBuff[k] = field.add(field.add(0, field.opp(buff2[k])), field.add(field.opp(buff3[k]), field.opp(buff4[k])));
                        } else {
                            tempBuff[k] = field.add(field.add(buffP1[k] + 1, field.opp(buff2[k])), field.add(field.opp(buff3[k]), field.opp(buff4[k])));
                        }
                    }
                } else if (position === 2) {
                    for (let k = 0; k < subBuffSize; k++) {
                        if (additionalParity1Bits[k + 1] === 1) {
                            tempBuff[k] = field.add(field.add(0, field.opp(buff1[k])), field.add(field.opp(buff3[k]), field.opp(buff4[k])));
                        } else {
                            tempBuff[k] = field.add(field.add(buffP1[k] + 1, field.opp(buff1[k])), field.add(field.opp(buff3[k]), field.opp(buff4[k])));
                        }
                    }
                } else if (position === 3) {
                    for (let k = 0; k < subBuffSize; k++) {
                        if (additionalParity1Bits[k + 1] === 1) {
                            tempBuff[k] = field.add(field.add(0, field.opp(buff1[k])), field.add(field.opp(buff2[k]), field.opp(buff4[k])));
                        } else {
                            tempBuff[k] = field.add(field.add(buffP1[k] + 1, field.opp(buff1[k])), field.add(field.opp(buff2[k]), field.opp(buff4[k])));
                        }
                    }
                } else if (position === 4) {
                    for (let k = 0; k < subBuffSize; k++) {
                        if (additionalParity1Bits[k + 1] === 1) {
                            tempBuff[k] = field.add(field.add(0, field.opp(buff1[k])), field.add(field.opp(buff2[k]), field.opp(buff3[k])));
                        } else {
                            tempBuff[k] = field.add(field.add(buffP1[k] + 1, field.opp(buff1[k])), field.add(field.opp(buff2[k]), field.opp(buff3[k])));
                        }
                    }
                }

                return tempBuff;
            } else if (checkFile(6)) {
                if (position === 1) {
                    for (let k = 0; k < subBuffSize; k++) {
                        if (additionalParity2Bits[k + 1] === 1) {
                            tempBuff[k] = field.mul(field.add(field.add(0, field.opp(field.mul(4, buff2[k]))), field.add(field.opp(field.mul(6, buff3[k])), field.opp(field.mul(8, buff4[k])))), field.inv(2));
                        } else {
                            tempBuff[k] = field.mul(field.add(field.add(buffP2[k] + 1, field.opp(field.mul(4, buff2[k]))), field.add(field.opp(field.mul(6, buff3[k])), field.opp(field.mul(8, buff4[k])))), field.inv(2));
                        }
                    }
                } else if (position === 2) {
                    for (let k = 0; k < subBuffSize; k++) {
                        if (additionalParity2Bits[k + 1] === 1) {
                            tempBuff[k] = field.mul(field.add(field.add(0, field.opp(field.mul(2, buff1[k]))), field.add(field.opp(field.mul(6, buff3[k])), field.opp(field.mul(8, buff4[k])))), field.inv(4));
                        } else {
                            tempBuff[k] = field.mul(field.add(field.add(buffP2[k] + 1, field.opp(field.mul(2, buff1[k]))), field.add(field.opp(field.mul(6, buff3[k])), field.opp(field.mul(8, buff4[k])))), field.inv(4));
                        }
                    }
                } else if (position === 3) {
                    for (let k = 0; k < subBuffSize; k++) {
                        if (additionalParity2Bits[k + 1] === 1) {
                            tempBuff[k] = field.mul(field.add(field.add(0, field.opp(field.mul(2, buff1[k]))), field.add(field.opp(field.mul(4, buff2[k])), field.opp(field.mul(8, buff4[k])))), field.inv(6));
                        } else {
                            tempBuff[k] = field.mul(field.add(field.add(buffP2[k] + 1, field.opp(field.mul(2, buff1[k]))), field.add(field.opp(field.mul(4, buff2[k])), field.opp(field.mul(8, buff4[k])))), field.inv(6));
                        }
                    }
                } else if (position === 4) {
                    for (let k = 0; k < subBuffSize; k++) {
                        if (additionalParity2Bits[k + 1] === 1) {
                            tempBuff[k] = field.mul(field.add(field.add(0, field.opp(field.mul(2, buff1[k]))), field.add(field.opp(field.mul(4, buff2[k])), field.opp(field.mul(6, buff3[k])))), field.inv(8));
                        } else {
                            tempBuff[k] = field.mul(field.add(field.add(buffP2[k] + 1, field.opp(field.mul(2, buff1[k]))), field.add(field.opp(field.mul(4, buff2[k])), field.opp(field.mul(6, buff3[k])))), field.inv(8));
                        }
                    }
                }

                return tempBuff;
            }
        } else if (getDataCount() === 2) {
            let parity1;
            let parity2;

            if (checkFile(1) && checkFile(2)) {
                if (position === 3) {
                    for (let k = 0; k < subBuffSize; k++) {
                        if (additionalParity1Bits[k + 1] === 1) {
                            parity1 = 0;
                        } else {
                            parity1 = buffP1[k] + 1;
                        }
                        if (additionalParity2Bits[k + 1] === 1) {
                            parity2 = 0;
                        } else {
                            parity2 = buffP2[k] + 1;
                        }
                        tempBuff[k] = field.mul(field.add(field.add(field.mul(8, parity1), field.opp(field.mul(6, buff1[k]))), field.add(field.opp(field.mul(4, buff2[k])), field.opp(parity2))), field.inv(2));
                    }
                } else if (position === 4) {
                    for (let k = 0; k < subBuffSize; k++) {
                        if (additionalParity1Bits[k + 1] === 1) {
                            parity1 = 0;
                        } else {
                            parity1 = buffP1[k] + 1;
                        }
                        if (additionalParity2Bits[k + 1] === 1) {
                            parity2 = 0;
                        } else {
                            parity2 = buffP2[k] + 1;
                        }
                        tempBuff[k] = field.mul(field.add(field.add(parity2, field.mul(4, buff1[k])), field.add(field.mul(2, buff2[k]), field.opp(field.mul(6, parity1)))), field.inv(2));
                    }
                }
            } else if (checkFile(1) && checkFile(3)) {
                if (position === 2) {
                    for (let k = 0; k < subBuffSize; k++) {
                        if (additionalParity1Bits[k + 1] === 1) {
                            parity1 = 0;
                        } else {
                            parity1 = buffP1[k] + 1;
                        }
                        if (additionalParity2Bits[k + 1] === 1) {
                            parity2 = 0;
                        } else {
                            parity2 = buffP2[k] + 1;
                        }
                        tempBuff[k] = field.mul(field.add(field.add(field.mul(8, parity1), field.opp(field.mul(6, buff1[k]))), field.add(field.opp(field.mul(2, buff3[k])), field.opp(parity2))), field.inv(4));
                    }
                } else if (position === 4) {
                    for (let k = 0; k < subBuffSize; k++) {
                        if (additionalParity1Bits[k + 1] === 1) {
                            parity1 = 0;
                        } else {
                            parity1 = buffP1[k] + 1;
                        }
                        if (additionalParity2Bits[k + 1] === 1) {
                            parity2 = 0;
                        } else {
                            parity2 = buffP2[k] + 1;
                        }
                        tempBuff[k] = field.mul(field.add(field.add(parity2, field.mul(2, buff1[k])), field.add(field.opp(field.mul(2, buff3[k])), field.opp(field.mul(4, parity1)))), field.inv(4));
                    }
                }
            } else if (checkFile(1) && checkFile(4)) {
                if (position === 2) {
                    for (let k = 0; k < subBuffSize; k++) {
                        if (additionalParity1Bits[k + 1] === 1) {
                            parity1 = 0;
                        } else {
                            parity1 = buffP1[k] + 1;
                        }
                        if (additionalParity2Bits[k + 1] === 1) {
                            parity2 = 0;
                        } else {
                            parity2 = buffP2[k] + 1;
                        }
                        tempBuff[k] = field.mul(field.add(field.add(field.mul(6, parity1), field.opp(field.mul(4, buff1[k]))), field.add(field.mul(2, buff4[k]), field.opp(parity2))), field.inv(2));
                    }
                } else if (position === 3) {
                    for (let k = 0; k < subBuffSize; k++) {
                        if (additionalParity1Bits[k + 1] === 1) {
                            parity1 = 0;
                        } else {
                            parity1 = buffP1[k] + 1;
                        }
                        if (additionalParity2Bits[k + 1] === 1) {
                            parity2 = 0;
                        } else {
                            parity2 = buffP2[k] + 1;
                        }
                        tempBuff[k] = field.mul(field.add(field.add(parity2, field.mul(2, buff1[k])), field.add(field.opp(field.mul(4, buff4[k])), field.opp(field.mul(4, parity1)))), field.inv(2));
                    }
                }
            } else if (checkFile(2) && checkFile(3)) {
                if (position === 1) {
                    for (let k = 0; k < subBuffSize; k++) {
                        if (additionalParity1Bits[k + 1] === 1) {
                            parity1 = 0;
                        } else {
                            parity1 = buffP1[k] + 1;
                        }
                        if (additionalParity2Bits[k + 1] === 1) {
                            parity2 = 0;
                        } else {
                            parity2 = buffP2[k] + 1;
                        }
                        tempBuff[k] = field.mul(field.add(field.add(field.mul(8, parity1), field.opp(field.mul(4, buff2[k]))), field.add(field.opp(field.mul(2, buff3[k])), field.opp(parity2))), field.inv(6));
                    }
                } else if (position === 4) {
                    for (let k = 0; k < subBuffSize; k++) {
                        if (additionalParity1Bits[k + 1] === 1) {
                            parity1 = 0;
                        } else {
                            parity1 = buffP1[k] + 1;
                        }
                        if (additionalParity2Bits[k + 1] === 1) {
                            parity2 = 0;
                        } else {
                            parity2 = buffP2[k] + 1;
                        }
                        tempBuff[k] = field.mul(field.add(field.add(parity2, field.opp(field.mul(2, buff2[k]))), field.add(field.opp(field.mul(4, buff3[k])), field.opp(field.mul(2, parity1)))), field.inv(6));
                    }
                }
            } else if (checkFile(2) && checkFile(4)) {
                if (position === 1) {
                    for (let k = 0; k < subBuffSize; k++) {
                        if (additionalParity1Bits[k + 1] === 1) {
                            parity1 = 0;
                        } else {
                            parity1 = buffP1[k] + 1;
                        }
                        if (additionalParity2Bits[k + 1] === 1) {
                            parity2 = 0;
                        } else {
                            parity2 = buffP2[k] + 1;
                        }
                        tempBuff[k] = field.mul(field.add(field.add(field.mul(6, parity1), field.opp(field.mul(2, buff2[k]))), field.add(field.mul(2, buff4[k]), field.opp(parity2))), field.inv(4));
                    }
                } else if (position === 3) {
                    for (let k = 0; k < subBuffSize; k++) {
                        if (additionalParity1Bits[k + 1] === 1) {
                            parity1 = 0;
                        } else {
                            parity1 = buffP1[k] + 1;
                        }
                        if (additionalParity2Bits[k + 1] === 1) {
                            parity2 = 0;
                        } else {
                            parity2 = buffP2[k] + 1;
                        }
                        tempBuff[k] = field.mul(field.add(field.add(parity2, field.opp(field.mul(2, buff2[k]))), field.add(field.opp(field.mul(6, buff4[k])), field.opp(field.mul(2, parity1)))), field.inv(4));
                    }
                }
            } else if (checkFile(3) && checkFile(4)) {
                if (position === 1) {
                    for (let k = 0; k < subBuffSize; k++) {
                        if (additionalParity1Bits[k + 1] === 1) {
                            parity1 = 0;
                        } else {
                            parity1 = buffP1[k] + 1;
                        }
                        if (additionalParity2Bits[k + 1] === 1) {
                            parity2 = 0;
                        } else {
                            parity2 = buffP2[k] + 1;
                        }
                        tempBuff[k] = field.mul(field.add(field.add(field.mul(4, parity1), field.mul(2, buff3[k])), field.add(field.mul(4, buff4[k]), field.opp(parity2))), field.inv(2));
                    }
                } else if (position === 2) {
                    for (let k = 0; k < subBuffSize; k++) {
                        if (additionalParity1Bits[k + 1] === 1) {
                            parity1 = 0;
                        } else {
                            parity1 = buffP1[k] + 1;
                        }
                        if (additionalParity2Bits[k + 1] === 1) {
                            parity2 = 0;
                        } else {
                            parity2 = buffP2[k] + 1;
                        }
                        tempBuff[k] = field.mul(field.add(field.add(parity2, field.opp(field.mul(4, buff3[k]))), field.add(field.opp(field.mul(6, buff4[k])), field.opp(field.mul(2, parity1)))), field.inv(2));
                    }
                }
            }

            return tempBuff;
        }
    }

    module.exports = {
        start
    };