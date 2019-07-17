const express = require('express');
const md5File = require('md5-file');
const enc = require('../redundancy/index');
const logger = require('../logger').getLogger('encrypt');
const config = require('../config');

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

        let filename = 'video';

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
            extension: '.mkv',
        };

            transaction.encFragHash = md5File.sync(`${config.TEMP_DIR}/${filename}.mkv`);
            block.transactions.push(transaction);
            logger.info('Upload complete');
            enc.encodeFile(filename,transaction.extension,block);



