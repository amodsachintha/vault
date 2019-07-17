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
const download = require('../distribute/download').download;
const fragchain = require('../fragchain/index');
const cors = require('cors');
const mimecheck = require('mime');
let chain = null;

app.use(cors());

enc.setBlockchainRef(fragchain);

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

app.post('/encrypt', function (req, res) {
    const block = {
        owner: {
            uuid: '000000-00000000-00000000',
            name: 'Vault Genesis Block',
            username: 'vault',
            privateKey: 'vault.genesis',
            publicKey: 'vault.genesis',
            masterKey: 'vault.genesis',
            createdAt: new Date()
        },
        file: {
            fileName: '',
            fileSize: 0,
            mimeType: '',
            extension: '',
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
        block.file.fileHash = '';
        console.log(mimetype);
        block.file.mimeType = mimetype;
        block.file.extension = mimecheck.getExtension(mimetype);
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

        if (checkExtension(block.file.extension)) {
            // encrypt only
            logger.info('Encrypting...');
            const cipher = crypto.createCipher('aes-256-cbc', 'mysecretkey');
            try {
                handle = file.pipe(cipher).pipe(fs.createWriteStream(`${config.TEMP_DIR}/${filename}.enc`));
            } catch (e) {
                logger.error(e)
            }
        } else {
            // zip and encrypt
            logger.info('Gzippping and Encrypting...');
            const zip = zlib.createGzip();
            const cipher = crypto.createCipher('aes-256-cbc', 'mysecretkey');
            try {
                handle = file.pipe(zip).pipe(cipher).pipe(fs.createWriteStream(`${config.TEMP_DIR}/${filename}.enc`));
            } catch (e) {
                logger.error(e)
            }
        }

        handle.on('finish', () => {
            logger.warn('Handle Finish');
            transaction.encFragHash = md5File.sync(`${config.TEMP_DIR}/${filename}.enc`);
            block.transactions.push(transaction);
            block.file.fileSize = getFilesizeInBytes(`${config.TEMP_DIR}/${filename}.enc`);
            logger.info('Upload complete');
            enc.encodeFile(filename, transaction.extension, block);
        });

    });
    busboy.on('finish', function () {
        res.send('done');
    });
    req.pipe(busboy);
});

// handle upload of a fragment
app.post('/upload/:filename', function (req, res) {
    let filename = path.basename(req.params.filename);
    //filename = path.resolve(__dirname, filename);
    let dst = fs.createWriteStream(__dirname + '/../files/' + filename);
    req.pipe(dst);
    dst.on('drain', function () {
        // console.log('drain', new Date());
        req.resume();
    });
    req.on('end', function () {
        res.send(200);
    });
});

app.post('/download/:filename', function (req, res) {
    let filename = path.basename(req.params.filename);
    let dst = fs.createWriteStream(__dirname + '/../tmp/' + filename);
    req.pipe(dst);
    dst.on('drain', function () {
        req.resume();
    });
    req.on('end', function () {
        res.send();
    });
});

app.post('/downloading/:filename', function (req, res) {
    let filename = path.basename(req.params.filename);
    let rs = fs.createReadStream(__dirname + '/../files/'+filename);
    rs.pipe(res);
});

app.get('/files', (req, res) => {
    let c = fragchain.getChain();
    let d = c.map(x => x);
    d.pop();
    res.json({
        blocks: d
    });
});

app.get('/file/:index', (req, res) => {
    let blockIndex = req.params.index;
    console.log(blockIndex);
    fragchain.find(blockIndex).then(block => {
        res.json(block);
    });
});

app.get('/download/file/:index', (req, res) => {
    if(req.method === 'HEAD'){
        res.send();
    }
    if(req.method === 'GET'){
        try {
            fragchain.find(req.params.index).then(block => {
                let frags = block.transactions[0].frags.map(frag => {
                    return {
                        name: frag.fragLocation,
                        type: frag.index
                    }
                });
                frags.pop();
                frags.pop();

                logger.warn(frags);
                let size = block.file.fileSize;

                let filename = block.file.fileName;
                enc.preDecode(frags,size,'tmp/'+filename).then(()=>{
                    let decFilePath = __dirname + '/../tmp/' + filename;
                    logger.info(decFilePath);
                    let handle = null;
                    const deCipher = crypto.createDecipher('aes-256-cbc', 'mysecretkey');
                    try {
                        res.setHeader('content-type', 'application/octet-stream');

                        if(checkExtension(block.file.extension)){
                            // no unzip
                            handle = fs.createReadStream(decFilePath).pipe(deCipher).pipe(res);
                        }else{
                            // should unzip
                            const unzip = zlib.createUnzip();
                            handle = fs.createReadStream(decFilePath).pipe(deCipher).pipe(unzip).pipe(res);
                        }
                        handle.on('finish', () => {
                            try {
                                fs.unlinkSync(decFilePath);
                            }catch (e) {
                               logger.warn(e.toString())
                            }
                            res.end();
                        });
                    } catch (e) {
                        logger.error(e)
                    }
                }).catch(e=> {
                    logger.warn(e.toString());
                    res.end();
                });
            }).catch(e => {logger.warn(e.toString()); res.end()});
        } catch (e) {
            logger.warn(e.toString());
        }
    }
});

const checkExtension = (extension) => {
    switch (extension) {
        case 'zip':
            return true;
        case 'rar':
            return true;
        case '7z':
            return true;
        case 'tgz':
            return true;
        case 'gzip':
            return true;
        case 'mp4':
            return true;
        default:
            return false;
    }
};

const getFilesizeInBytes = (path) => {
    let stats = fs.statSync(path);
    return stats["size"];
};

const startWebServer = () => {
    app.listen(4000, () => {
        logger.info('App listening on port 3000');
    });
};

module.exports = {startWebServer};
