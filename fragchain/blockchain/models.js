const Owner = {
    name: 'Owner',
    properties: {
        uuid: 'string',
        name: 'string',
        username: 'string',
        privateKey: 'string',
        publicKey: 'string',
        masterKey: 'string',
        createdAt: 'date'
    }
};

const File = {
    name: 'File',
    properties: {
        fileName: 'string',
        fileSize: 'int',
        fileHash: 'string',
    }
};

const Transaction = {
    name: 'Transaction',
    properties: {
        index: 'int',
        encFragCount: 'int',
        fragHash: 'string',
        encFragHash: 'string',
        frags: 'Frag[]',
        merkleRoot: 'string',
        transactionHash: 'string',
        rsConfig: 'string'
    }
};

const Frag = {
    name: 'Frag',
    properties: {
        index: 'int',
        RSfragCount: 'int',
        fragHash: 'string',
        fragLocation: 'string',
    }
};


const Block = {
    name: 'Block',
    properties: {
        index: {type: 'int', indexed: true},
        previousHash: 'string',
        owner: {type: 'Owner'},
        file: {type: 'File'},
        transactions: {type: 'Transaction[]'},
        merkleRoot: 'string',
        timestamp: 'date',
        blockHash: {type: 'string', indexed: true},
    }
};

module.exports = {
    Owner,
    File,
    Transaction,
    Frag,
    Block
};