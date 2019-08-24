const Realm = require('realm');
const models = require(__dirname + '/models');
const ip = require('ip');

let path=null;
if(ip.address() === '172.16.0.10')
    path='./../../db/10/vault.realm';
else if(ip.address() === '172.16.0.20')
    path='./../../db/20/vault.realm';
else if(ip.address() === '172.16.0.30')
    path='./../../db/30/vault.realm';
else if(ip.address() === '172.16.0.40')
    path='./../../db/40/vault.realm';
else if(ip.address() === '172.16.0.50')
    path='./../../db/50/vault.realm';
else if(ip.address() === '172.16.0.60')
    path='./../../db/60/vault.realm';

const realm = new Realm({
    path: __dirname + path,
    inMemory: false,
    schema: [
        models.Block,
        models.File,
        models.Frag,
        models.Owner,
        models.Transaction
    ]
});

module.exports = realm;