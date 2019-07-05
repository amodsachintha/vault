const md5File = require('md5-file');
const crypto = require('crypto');

    const verifyIntegrity = (original, copy) => {
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

    const  getHash = (file) => {
        return md5File.sync(file);
    }

    const  getStringHash = (string) => {
        return crypto.createHash('md5').update(string).digest('hex');
    }

    module.exports = {
        verifyIntegrity,getHash,getStringHash
    };