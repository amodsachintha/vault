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
const fragchain = require('../fragchain/index');
const cors = require('cors');
const mimecheck = require('mime');
const splitfile = require('split-file');
const nodeInfo = require('../ml/index');
const axios = require('axios');
const regression = require('../ml/prediction');
const _ = require('lodash');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const uuid = require('uuid/v4');
const NodeRSA = require('node-rsa');
const bodyParser = require('body-parser');
const asyncPool = require('tiny-async-pool');
app.use(cors());
app.use(express.json());

enc.setBlockchainRef(fragchain);

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

app.get('/owners', (req, res) => {
    return res.status(200).json(fragchain.getAllUsers())
});

app.post('/login', (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    logger.debug(username);
    fragchain.findUserByUsername(username).then(user => {
        logger.debug(user.uuid);
        if (bcrypt.compareSync(password, user.masterKey)) {
            const expiresIn = 24 * 60 * 60;
            const token = jwt.sign({uuid: user.uuid}, config.JWT_SECRET, {expiresIn: expiresIn});
            res.status(200).json({
                uuid: user.uuid,
                username: user.username,
                token: token,
                expiresIn: expiresIn
            });
        } else {
            res.status(401).json({status: 'fail', msg: 'Invalid Password!'});
        }
    }).catch(() => {
        res.status(401).json({status: 'fail', msg: 'User not found!'});
    });
});

app.post('/register', (req, res) => {
    const username = req.body.username;
    const password = bcrypt.hashSync(req.body.password);
    const name = req.body.name;
    if (name.length >= 3 && username.length >= 4 && req.body.password.length >= 6) {
        fragchain.findUserByUsername(username).then(user => {
            logger.debug(user.uuid);
            res.status(422).json({
                status: 'fail',
                msg: 'User Exists'
            });
        }).catch(() => {
            const key = new NodeRSA().generateKeyPair(1024, 65537);
            fragchain.storeUser({
                uuid: uuid(),
                name: name,
                username: username,
                privateKey: key.exportKey('pkcs8-private'),
                publicKey: key.exportKey('pkcs8-public'),
                masterKey: password,
                createdAt: new Date()
            }).then(u => {
                const expiresIn = 24 * 60 * 60;
                const accessToken = jwt.sign({uuid: u.uuid}, config.JWT_SECRET, {expiresIn: expiresIn});
                res.status(201).json({u, accessToken, expiresIn});
            }).catch(e => {
                res.status(422).json({
                    status: 'fail',
                    msg: e
                });
            });
        });
    } else {
        return res.status(422).json({
            status: 'fail',
            msg: 'Input Validation Failed!'
        });
    }
});

app.post('/encrypt', async (req, res) => {
    const token = req.get('X-TOKEN');
    if (!token) {
        return res.status(401).json({status: 'fail', msg: 'token not found in request'});
    }
    try {
        const tokenData = jwt.verify(token, config.JWT_SECRET);
        const user = await fragchain.findUserByUUID(tokenData.uuid);

        const block = {
            owner: {
                uuid: '000000-00000000-00000000',
                name: 'amodsachintha',
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

            handle.on('finish', async () => {
                logger.warn('Handle Finish');
                logger.info('Starting Transaction Split');
                splitfile.splitFileBySize(`${config.TEMP_DIR}/${filename}.enc`, config.TRANSACTION_SPLIT_SIZE).then(async names => {
                    logger.info('Transaction Split Complete: Parts - ' + names.length);
                    let i = 0;
                    names.forEach(filename => {
                        let hash = md5File.sync(filename);
                        block.transactions.push({
                            index: i++,
                            encFragCount: names.length,
                            txSize: getFilesizeInBytes(filename),
                            fragHash: hash,
                            encFragHash: hash,
                            frags: [],
                            rsConfig: '4+2',
                            name: path.basename(filename),
                            extension: '.enc',
                        });
                    });

                    block.file.fileSize = getFilesizeInBytes(`${config.TEMP_DIR}/${filename}.enc`);
                    try {
                        fs.unlinkSync(`${config.TEMP_DIR}/${filename}.enc`)
                    } catch (e) {
                        logger.error(e);
                    }
                    logger.info('Starting Encode');
                    let j = 0;

                    let ips = await resolveWeightedIps();

                    asyncPool(1, names, name => {
                        return enc.encodeFile(path.basename(name), block, j++, ips);
                    }).then(txes => {
                        fragchain.store(user, block.file, txes);
                    })
                }).catch(err => {
                    logger.error(err);
                });
            });

        });
        busboy.on('finish', function () {
            res.send('done');
        });
        req.pipe(busboy);

    } catch (e) {

    }
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
        res.sendStatus(200);
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
    let rs = fs.createReadStream(__dirname + '/../files/' + filename);
    rs.pipe(res);
});

app.get('/files', (req, res) => {
    const token = req.get('X-TOKEN');
    if (!token) {
        return res.status(401).json({status: 'fail', msg: 'token not found in request'});
    }
    try {
        const tokenData = jwt.verify(token, config.JWT_SECRET);
        fragchain.findUserByUUID(tokenData.uuid).then(user => {
            console.log(user.masterKey);
            fragchain.findBlocksByUUID(user.uuid).then(blocks => {
                let d = blocks.map(x => x);
                // d.pop();
                res.json({
                    blocks: d
                });
            }).catch(() => {
                res.status(422).json({status: 'fail', msg: 'invalid uuid'})
            });
        });
    } catch (e) {
        return res.status(401).json({status: 'fail', msg: 'token invalid'});
    }
});

app.get('/file/:index', (req, res) => {
    let blockIndex = req.params.index;
    fragchain.find(blockIndex).then(block => {
        logger.info({
            file_id: block.fileId,
            state: block.state,
            version: block.version,
            filename: block.file.fileName
        });
        res.json(block);
    });
});

app.get('/download/file/:index', (req, res) => {
    if (req.method === 'HEAD') {
        res.send();
    }
    if (req.method === 'GET') {
        try {
            res.setHeader('content-type', 'application/octet-stream');
            fragchain.find(req.params.index).then(block => {
                let decodePromiseArray = block.transactions.map(tr => {
                    let frags = tr.frags.map(frag => {
                        return {
                            name: frag.fragLocation,
                            type: frag.index
                        }
                    });
                    frags.pop();
                    frags.pop();
                    let size = tr.txSize;
                    let filename = tr.name;
                    return new Promise((resolve, reject) => {
                        return enc.preDecode(frags, size, 'tmp/' + filename).then(() => {
                            resolve(filename);
                        }).catch(e => {
                            logger.warn(e);
                            reject(e)
                        });
                    });
                });

                Promise.all(decodePromiseArray).then(decodedFileNames => {
                    let filenamesWithPath = decodedFileNames.map(f => `${config.TEMP_DIR}/${f}`);
                    let outfilename = `${config.TEMP_DIR}/${decodedFileNames[0].replace('.sf-part1', '')}`;
                    splitfile.mergeFiles(filenamesWithPath, outfilename).then(() => {
                        logger.info('Done');
                        filenamesWithPath.forEach(f => {
                            fs.unlink(f, (e) => {
                                if (e) logger.error(e);
                            });
                        });
                        let handle = null;
                        const deCipher = crypto.createDecipher('aes-256-cbc', block.key);
                        try {
                            if (checkExtension(block.file.extension)) {
                                // no unzip
                                logger.debug('inside no unzip');
                                // handle = fs.createReadStream(outfilename).pipe(deCipher).pipe(fs.createWriteStream(`${config.TEMP_DIR}/${block.file.fileName}`));
                                handle = fs.createReadStream(outfilename).pipe(deCipher).pipe(res);
                            } else {
                                // should unzip
                                logger.debug('inside unzip');
                                const unzip = zlib.createUnzip();
                                // handle = fs.createReadStream(outfilename).pipe(deCipher).pipe(unzip).pipe(fs.createWriteStream(`${config.TEMP_DIR}/${block.file.fileName}`));
                                handle = fs.createReadStream(outfilename).pipe(deCipher).pipe(unzip).pipe(res);
                            }
                            handle.on('finish', () => {
                                try {
                                    fs.unlinkSync(outfilename);
                                } catch (e) {
                                    logger.warn(e.toString())
                                }
                            });
                        } catch (e) {
                            logger.error(e);
                            res.end();
                        }

                    }).catch(e => {
                        logger.error(e);
                        res.end();
                    })

                }).catch(e => {
                    logger.error(e);
                    res.end();
                });

            }).catch(e => {
                logger.warn(e.toString());
                res.end()
            });
        } catch (e) {
            logger.warn(e.toString());
        }
    }
});


app.get('/node_info', (req, res) => {
    nodeInfo.getNodeInfo().then(results => {
        res.send(results);
    }).catch(e => {
        logger.error(e);
        res.sendStatus(500);
    })
});

const resolveWeightedIps = async () => {
    const dd = await getTopIPs();
    _.orderBy(dd, ['weight'], ['desc']);
    return dd.map(v => v.ip);
};

const checkExtension = (extension) => {
    switch (extension) {
        case 'zip':
        case 'rar':
        case '7z':
        case 'tgz':
        case 'gzip':
        case 'mp4':
        case 'gz':
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

const getTopIPs = async () => {
    // let hosts = config.VAULTS;
    // hosts.push(ipaddress.address());
    let ipPromises = config.VAULTS.map(ip => {
        return new Promise((resolve, reject) => {
            axios.get(`http://${ip}:4000/node_info`).then(res => {
                regression.startModel([res.data.total, res.data.free, res.data.used, res.data.status]).then((weight) => {
                    logger.debug('Weight : ' + weight);
                    resolve({
                        ip,
                        weight
                    });
                }).catch((error) => {
                    logger.error(error);
                    reject()
                });
            }).catch(e => {
                logger.error(e);
                reject()
            });
        });
    });
    return await Promise.all(ipPromises);
};

module.exports = {startWebServer};
