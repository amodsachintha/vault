//global modules
const PrimeField = require('rye').PrimeField;
const field = new PrimeField(257);
const fs = require("fs");

class Decode {
    constructor(metadata) {
        this.name = metadata.name;
        this.extension = metadata.extension;
        this.shardCount = metadata.shards;
        this.mainBuffSize = metadata.length;
        this.subBuffSize = 0;
    }

    start() {
        return new Promise((resolve, reject) => {
            if (this.inputValidation() === 1) {
                this.init();
                this.Decoder();
            } else {
                reject('invalid file');
            }
        })
    }

    inputValidation() {
        if (this.name && this.extension) {
            return 1;
        } else {
            console.log('Invalid file name or extension');
            return 0;
        }
    }

    init() {
        this.subBuffSize = 0;
        if (this.mainBuffSize % this.shardCount === 0) {
            this.subBuffSize = parseInt(this.mainBuffSize / this.shardCount);
        } else {
            this.subBuffSize = (parseInt(this.mainBuffSize / this.shardCount)) + 1;
        }

    }

    Decoder() {
        if (this.getFileCount() >= this.shardCount) {
            let data = [];

            for (let i = 1; i <= this.shardCount; i++) {
                if (this.checkAvailability(this.name + '.' + i + this.extension)) {
                    if (i === this.shardCount) {
                        let end = this.mainBuffSize - ((this.shardCount - 1) * this.subBuffSize);
                        data.push(fs.readFileSync(this.name + '.' + i + this.extension).slice(0, end));
                    } else {
                        data.push(fs.readFileSync(this.name + '.' + i + this.extension));
                    }
                } else {
                    data.push(this.generateShard(i));
                }
            }

            try {
                fs.writeFile(this.name + '.decode' + this.extension, Buffer.concat(data), function (err) {
                    if (err) throw err;
                    console.log('File decoded successfully.');
                });
            } catch (e) {
                console.log('Error:', e.stack);
            }
        } else {
            console.log('Wait until all the files are available ');
        }
    }

    static checkAvailability(name) {
        return fs.existsSync(name);
    }

    getFileCount() {
        let count = 0;
        for (let i = 1; i <= this.shardCount; i++) {
            if (this.checkAvailability(this.name + '.' + i + this.extension)) {
                count++;
            }
        }

        for (let k = 1; k <= this.shardCount / 2; k++) {
            if (this.checkAvailability(this.name + '.p' + k + this.extension)) {
                count++;
            }
        }

        return count;
    }

    getDataCount() {
        let count = 0;
        for (let i = 1; i <= this.shardCount; i++) {
            if (this.checkAvailability(this.name + '.' + i + this.extension)) {
                count++;
            }
        }

        return count;
    }

    generateShard(position) {
        if (this.shardCount === 4) {
            if (position === 4) {
                let withPadding = this.generateModeOne(position);
                let end = this.mainBuffSize - (3 * this.subBuffSize);

                return withPadding.slice(0, end);
            } else {
                return this.generateModeOne(position);
            }
        }
    }

    generateModeOne(position) {
        let buff1 = Buffer.allocUnsafe(this.subBuffSize);
        let buff2 = Buffer.allocUnsafe(this.subBuffSize);
        let buff3 = Buffer.allocUnsafe(this.subBuffSize);
        let buff4 = Buffer.allocUnsafe(this.subBuffSize);
        let buffP1 = Buffer.allocUnsafe(this.subBuffSize);
        let buffP2 = Buffer.allocUnsafe(this.subBuffSize);

        let additionalParity1Bytes = Buffer.allocUnsafe(this.subBuffSize / 8);
        let additionalParity2Bytes = Buffer.allocUnsafe(this.subBuffSize / 8);

        let additionalParity1Bits = [];
        let additionalParity2Bits = [];

        if (this.checkAvailability(this.name + '.1' + this.extension)) {
            buff1 = fs.readFileSync(this.name + '.1' + this.extension);
        }
        if (this.checkAvailability(this.name + '.2' + this.extension)) {
            buff2 = fs.readFileSync(this.name + '.2' + this.extension);
        }
        if (this.checkAvailability(this.name + '.3' + this.extension)) {
            buff3 = fs.readFileSync(this.name + '.3' + this.extension);
        }
        if (this.checkAvailability(this.name + '.4' + this.extension)) {
            buff4 = fs.readFileSync(this.name + '.4' + this.extension);
        }

        if (this.checkAvailability(this.name + '.p1' + this.extension)) {
            buffP1 = fs.readFileSync(this.name + '.p1' + this.extension);
            additionalParity1Bytes = fs.readFileSync(this.name + '.p1' + this.extension).slice(this.subBuffSize, Math.trunc(this.subBuffSize + this.subBuffSize / 8) + 1);

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

        if (this.checkAvailability(this.name + '.p2' + this.extension)) {
            buffP2 = fs.readFileSync(this.name + '.p2' + this.extension);
            additionalParity2Bytes = fs.readFileSync(this.name + '.p2' + this.extension).slice(this.subBuffSize, Math.trunc(this.subBuffSize + this.subBuffSize / 8) + 1);

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

        let tempBuff = Buffer.allocUnsafe(this.subBuffSize);

        if (this.getDataCount() === 3) {
            if (this.checkAvailability(this.name + '.p1' + this.extension)) {
                if (position === 1) {
                    for (let k = 0; k < this.subBuffSize; k++) {
                        if (additionalParity1Bits[k + 1] === 1) {
                            tempBuff[k] = field.add(field.add(0, field.opp(buff2[k])), field.add(field.opp(buff3[k]), field.opp(buff4[k])));
                        } else {
                            tempBuff[k] = field.add(field.add(buffP1[k] + 1, field.opp(buff2[k])), field.add(field.opp(buff3[k]), field.opp(buff4[k])));
                        }
                    }
                } else if (position === 2) {
                    for (let k = 0; k < this.subBuffSize; k++) {
                        if (additionalParity1Bits[k + 1] === 1) {
                            tempBuff[k] = field.add(field.add(0, field.opp(buff1[k])), field.add(field.opp(buff3[k]), field.opp(buff4[k])));
                        } else {
                            tempBuff[k] = field.add(field.add(buffP1[k] + 1, field.opp(buff1[k])), field.add(field.opp(buff3[k]), field.opp(buff4[k])));
                        }
                    }
                } else if (position === 3) {
                    for (let k = 0; k < this.subBuffSize; k++) {
                        if (additionalParity1Bits[k + 1] === 1) {
                            tempBuff[k] = field.add(field.add(0, field.opp(buff1[k])), field.add(field.opp(buff2[k]), field.opp(buff4[k])));
                        } else {
                            tempBuff[k] = field.add(field.add(buffP1[k] + 1, field.opp(buff1[k])), field.add(field.opp(buff2[k]), field.opp(buff4[k])));
                        }
                    }
                } else if (position === 4) {
                    for (let k = 0; k < this.subBuffSize; k++) {
                        if (additionalParity1Bits[k + 1] === 1) {
                            tempBuff[k] = field.add(field.add(0, field.opp(buff1[k])), field.add(field.opp(buff2[k]), field.opp(buff3[k])));
                        } else {
                            tempBuff[k] = field.add(field.add(buffP1[k] + 1, field.opp(buff1[k])), field.add(field.opp(buff2[k]), field.opp(buff3[k])));
                        }
                    }
                }

                return tempBuff;
            } else if (this.checkAvailability(this.name + '.p2' + this.extension)) {
                if (position === 1) {
                    for (let k = 0; k < this.subBuffSize; k++) {
                        if (additionalParity2Bits[k + 1] === 1) {
                            tempBuff[k] = field.mul(field.add(field.add(0, field.opp(field.mul(4, buff2[k]))), field.add(field.opp(field.mul(6, buff3[k])), field.opp(field.mul(8, buff4[k])))), field.inv(2));
                        } else {
                            tempBuff[k] = field.mul(field.add(field.add(buffP2[k] + 1, field.opp(field.mul(4, buff2[k]))), field.add(field.opp(field.mul(6, buff3[k])), field.opp(field.mul(8, buff4[k])))), field.inv(2));
                        }
                    }
                } else if (position === 2) {
                    for (let k = 0; k < this.subBuffSize; k++) {
                        if (additionalParity2Bits[k + 1] === 1) {
                            tempBuff[k] = field.mul(field.add(field.add(0, field.opp(field.mul(2, buff1[k]))), field.add(field.opp(field.mul(6, buff3[k])), field.opp(field.mul(8, buff4[k])))), field.inv(4));
                        } else {
                            tempBuff[k] = field.mul(field.add(field.add(buffP2[k] + 1, field.opp(field.mul(2, buff1[k]))), field.add(field.opp(field.mul(6, buff3[k])), field.opp(field.mul(8, buff4[k])))), field.inv(4));
                        }
                    }
                } else if (position === 3) {
                    for (let k = 0; k < this.subBuffSize; k++) {
                        if (additionalParity2Bits[k + 1] === 1) {
                            tempBuff[k] = field.mul(field.add(field.add(0, field.opp(field.mul(2, buff1[k]))), field.add(field.opp(field.mul(4, buff2[k])), field.opp(field.mul(8, buff4[k])))), field.inv(6));
                        } else {
                            tempBuff[k] = field.mul(field.add(field.add(buffP2[k] + 1, field.opp(field.mul(2, buff1[k]))), field.add(field.opp(field.mul(4, buff2[k])), field.opp(field.mul(8, buff4[k])))), field.inv(6));
                        }
                    }
                } else if (position === 4) {
                    for (let k = 0; k < this.subBuffSize; k++) {
                        if (additionalParity2Bits[k + 1] === 1) {
                            tempBuff[k] = field.mul(field.add(field.add(0, field.opp(field.mul(2, buff1[k]))), field.add(field.opp(field.mul(4, buff2[k])), field.opp(field.mul(6, buff3[k])))), field.inv(8));
                        } else {
                            tempBuff[k] = field.mul(field.add(field.add(buffP2[k] + 1, field.opp(field.mul(2, buff1[k]))), field.add(field.opp(field.mul(4, buff2[k])), field.opp(field.mul(6, buff3[k])))), field.inv(8));
                        }
                    }
                }

                return tempBuff;
            }
        } else if (this.getDataCount() === 2) {
            let parity1;
            let parity2;

            if (this.checkAvailability(this.name + '.1' + this.extension) && this.checkAvailability(this.name + '.2' + this.extension)) {
                if (position === 3) {
                    for (let k = 0; k < this.subBuffSize; k++) {
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
                    for (let k = 0; k < this.subBuffSize; k++) {
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
            } else if (this.checkAvailability(this.name + '.1' + this.extension) && this.checkAvailability(this.name + '.3' + this.extension)) {
                if (position === 2) {
                    for (let k = 0; k < this.subBuffSize; k++) {
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
                    for (let k = 0; k < this.subBuffSize; k++) {
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
            } else if (this.checkAvailability(this.name + '.1' + this.extension) && this.checkAvailability(this.name + '.4' + this.extension)) {
                if (position === 2) {
                    for (let k = 0; k < this.subBuffSize; k++) {
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
                    for (let k = 0; k < this.subBuffSize; k++) {
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
            } else if (this.checkAvailability(this.name + '.2' + this.extension) && this.checkAvailability(this.name + '.3' + this.extension)) {
                if (position === 1) {
                    for (let k = 0; k < this.subBuffSize; k++) {
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
                    for (let k = 0; k < this.subBuffSize; k++) {
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
            } else if (this.checkAvailability(this.name + '.2' + this.extension) && this.checkAvailability(this.name + '.4' + this.extension)) {
                if (position === 1) {
                    for (let k = 0; k < this.subBuffSize; k++) {
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
                    for (let k = 0; k < this.subBuffSize; k++) {
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
            } else if (this.checkAvailability(this.name + '.3' + this.extension) && this.checkAvailability(this.name + '.4' + this.extension)) {
                if (position === 1) {
                    for (let k = 0; k < this.subBuffSize; k++) {
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
                    for (let k = 0; k < this.subBuffSize; k++) {
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

}

module.exports = Decode;
