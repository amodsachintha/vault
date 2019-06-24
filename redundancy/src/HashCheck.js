const md5File = require('md5-file');

class HashCheck {
    constructor() {
    }

    static verifyIntegrity(original, copy) {
        const hash1 = md5File.sync(original);
        console.log(hash1);
        const hash2 = md5File.sync(copy);
        console.log(hash2);

        if (hash1 === hash2) {
            console.log('verified');
        } else {
            console.log('Not verified');
        }
    }

    static getHash(file) {
        return md5File.sync(file);
    }
}

module.exports = HashCheck;
