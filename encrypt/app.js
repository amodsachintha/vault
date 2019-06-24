const express = require('express');
const fs = require('fs');
const path = require('path');
const Busboy = require('busboy');
const zlib = require('zlib');
const crypto = require('crypto');
const md5File = require('md5-file');
const app = express();
const enc = require('../redundancy/index');
const logger = require('../logger').getLogger('encrypt');
const config = require('../config');


app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});


app.post('/encrypt', function (req, res) {
    const block = {
        owner:{
            uuid: '000000-00000000-00000000',
            name: 'Vault Genesis Block',
            username: 'vault',
            privateKey: 'vault.genesis',
            publicKey: 'vault.genesis',
            masterKey: 'vault.genesis',
            createdAt: new Date()
        },
        file:{
            fileName: '',
            fileSize: 0,
            fileHash: ''
        },
        key: 'mysecretkey',
        transactions: [],
        timestamp: null
    };
    let busboy = new Busboy({headers: req.headers});
    busboy.on('file', function (fieldname, file, filename, encoding, mimetype) {
        logger.info(`Uploading: ${filename} mime: ${mimetype}`);
        block.file.fileName = filename;
        block.file.fileSize = 12345;
        block.file.fileHash = '0000000000000000000000000000000000000000000000000000000000000000';
        let transaction = {
            index: 1,
            encFragCount: 1,
            fragHash: '0000000000000000000000000000000000000000000000000000000000000000',
            encFragHash: null,
            frags: [],
            rsConfig: '4+2',
            name: filename,
            extension: '.enc',
        };
        let handle = null;
        if (checkExtension(filename)) {
            const cipher = crypto.createCipher('aes-256-cbc', 'mysecretkey');
            try{
                handle = file.pipe(cipher).
                pipe(fs.createWriteStream(`${config.TEMP_DIR}/${filename}.enc`));
            }catch (e) {
                logger.error(e)
            }

        } else {
            const zip = zlib.createGzip();
            const cipher = crypto.createCipher('aes-256-cbc', 'mysecretkey');
            try{
                handle = file.pipe(zip).pipe(cipher).pipe(fs.createWriteStream(`${config.TEMP_DIR}/${filename}.enc`));
            }catch (e) {
                logger.error(e)
            }
        }

        handle.on('finish',()=>{
            logger.warn('Handle Finish');
            transaction.encFragHash = md5File.sync(`${config.TEMP_DIR}/${filename}.enc`);
            block.transactions.push(transaction);
            logger.info('Upload complete');
            enc.encodeFile(filename,transaction.extension,block);
        });

    });
    busboy.on('finish', function () {
        res.send('done');
    });
    req.pipe(busboy);
});

app.post('/decrypt', function (req, res) {
    const busboy = new Busboy({headers: req.headers});
    busboy.on('file', function (fieldname, file, filename, encoding, mimetype) {
        console.log('Uploading: ');
        console.log(mimetype);

        if (checkOriginalExtension(filename)) {
            const decipher = crypto.createDecipher('aes-256-cbc', 'mysecretkey');
            file.pipe(decipher).pipe(fs.createWriteStream('./temp/' + filename.split('.').slice(0, -1).join('.')));
        } else {
            const unzip = zlib.createUnzip();
            const decipher = crypto.createDecipher('aes-256-cbc', 'mysecretkey');
            file.pipe(decipher).pipe(unzip).pipe(fs.createWriteStream('./temp/' + filename.split('.').slice(0, -1).join('.')));
        }
    });
    busboy.on('finish', function () {
        console.log('Upload complete');
        res.send('done');
    });
    return req.pipe(busboy);

});

const checkExtension = (filename) => {
    switch (path.extname(filename)) {
        case '.zip':
            return true;
        case '.rar':
            return true;
        case '.7z':
            return true;
        case '.gzip':
            return true;
        case '.mp4':
            return true;
        default:
            return false;
    }
};

const checkOriginalExtension = (filename) => {
    switch (filename.split('.').slice(-2, -1)) {
        case '.zip':
            return true;
        case '.rar':
            return true;
        case '.7z':
            return true;
        case '.gzip':
            return true;
        case '.mp4':
            return true;
        default:
            return false;
    }
};

const startWebServer = () => {
    app.listen(3000, () => {
        logger.info('App listening on port 3000');
    });
};

const setBlockchainRef = (blockchain)=>{
    enc.setBlockchainRef(blockchain);
};

module.exports = {startWebServer, setBlockchainRef};
