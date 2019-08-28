const realm = require('./realm');
const {MerkleTree} = require('merkletreejs');
const SHA256 = require('crypto-js/sha256');
const logger = require('../../logger').getLogger('blockchain');
const uuid = require('uuid/v4');

/* Initializes the blockchain. Generates the genesis block when run for the first time. */
const initializeChain = () => {
    let size = realm.objects('Block').length;
    if (size === 0)
        generateGenesisBlock();
};

/* Generate the genesis block. */
const generateGenesisBlock = () => {
    logger.info('Generating Genesis Block!');
    const block = {
        index: 0,

        fileId: uuid(),
        state: 'GENESIS',
        version: 1,
        sharedWith: [],

        previousHash: '0000000000000000000000000000000000000000000000000000000000000000',
        owner: null,
        file: null,
        transactions: [],
        timestamp: new Date(),
        merkleRoot: '0000000000000000000000000000000000000000000000000000000000000000',
        blockHash: '0000000000000000000000000000000000000000000000000000000000000000',
        key: '0000000000000'
    };
    // GENESIS should be the same on all nodes
    // block.blockHash = generateBlockHash(block);
    try {
        realm.write(() => {
            realm.create('Block', block);
        });
    } catch (e) {
        logger.error('Error generating Genesis Block!!!');
        logger.debug(e.toString());
    }
    logger.info('Genesis block generated successfully!');
    logger.info('Local chain is at idx: 1');
};

/* Store a block in the local-chain. returns a Promise. */
const storeBlock = (owner, file, transactions) => {
    // previous block is the latest block
    const prevBlock = getLatestBlock();
    const txs = transactions.map(tx => createTransaction(tx.frags, tx.index, tx.encFragCount, tx.txSize, tx.fragHash, tx.encFragHash, tx.rsConfig, tx.name, tx.extension));
    const block = {
        index: prevBlock.index + 1,

        fileId: uuid(),
        state: 'STORED',
        version: 1,
        sharedWith: [],

        previousHash: prevBlock.blockHash,
        owner: owner,
        file: file,
        transactions: txs,
        timestamp: new Date(),
        merkleRoot: generateTransactionMerkleRoot(txs),
        blockHash: null,
        key: 'mysecretkey',
    };
    block.blockHash = generateBlockHash(block);
    return new Promise((resolve, reject) => {
        try {
            realm.write(() => {
                realm.create('Block', block);
                resolve(block);
            })

        } catch (e) {
            logger.error(e);
            reject(e);
        }
    })
};

/* Store entire block as is into the local chain */
const storeBlockFromRemote = (block) => {
    return new Promise((resolve, reject) => {
        // if(block.previousHash === getLatestBlock().previousHash){
        try {
            realm.write(() => {
                resolve(realm.create('Block', block));
            });
        } catch (e) {
            reject(e);
        }
        // }else {
        //     reject('ERROR: SYNC_CHAIN first!');
        // }
    });
};

/* Generate Merkle root of -ALL- Transactions from Transaction Hash (transactionHash) */
const generateTransactionMerkleRoot = (transactions) => {
    const trLeaves = transactions.map(x => x.transactionHash);
    const trTree = new MerkleTree(trLeaves, SHA256);
    logger.info('Generating the Merkle Root of Transactions..');
    trTree.print();
    return trTree.getRoot().toString('hex');
};

/* Generate Merkle root of -ALL- Reed Solomon Fragments from Fragment Hash (fragHash) */
const generateRSFragMerkleRoot = (fragments) => {
    const fragLeaves = fragments.map(x => x.fragHash);
    const fragTree = new MerkleTree(fragLeaves, SHA256);
    logger.info('Generating the Merkle Root of Fragments..');
    fragTree.print();
    return fragTree.getRoot().toString('hex');
};

/* Generate the main Block Hash */
const generateBlockHash = (block) => {
    return SHA256(
        block.previousHash +
        block.owner.uuid +
        block.file.fileHash +
        block.timestamp.getTime() +
        block.merkleRoot
    ).toString();
};

/* Generate the Transaction Hash */
const generateTransactionHash = (transaction) => {
    return SHA256(
        transaction.index +
        transaction.encFragCount +
        transaction.txSize +
        transaction.encFragHash +
        transaction.fragHash +
        transaction.merkleRoot +
        transaction.rsConfig +
        transaction.name
    ).toString();
};

/* Generate the Reed Solomon Fragment Hash */
const generateRSFragmentHash = (fragment) => {
    return SHA256(
        fragment.index +
        fragment.RSfragCount +
        fragment.fileHash +
        fragment.fragLocation
    ).toString();
};

/* Creates a single Transaction Object from redundant fragment data */
const createTransaction = (fragments, index, encFragCount, txSize, fragHash, encFragHash, rsConfig, name, extension) => {
    let frgs = fragments.map(fr => createRSFragment(fr.index, fr.RSfragCount, fr.fragHash, fr.fragLocation));
    const transaction = {
        index: index,
        encFragCount: encFragCount,
        txSize: txSize,
        fragHash: fragHash,
        encFragHash: encFragHash,
        frags: frgs,
        merkleRoot: generateRSFragMerkleRoot(frgs),
        transactionHash: null,
        rsConfig: rsConfig,
        name: name,
        extension: extension

    };
    transaction.transactionHash = generateTransactionHash(transaction);
    return transaction;
};

/* Creates a single RSFragment Object from fragmented file data */
const createRSFragment = (index, rsFragCount, fileHash, fragLocation) => {
    const frag = {
        index: index,
        RSfragCount: rsFragCount,
        fileHash: fileHash,
        fragLocation: fragLocation,
        fragHash: null,
    };
    frag.fragHash = generateRSFragmentHash(frag);
    return frag;
};

/* Get a lazy loaded object mapping to the local chain. */
const getChain = (reversed = true) => {
    return realm.objects('Block').sorted('index', reversed);
};

/* Gets the latest (top) block */
const getLatestBlock = () => {
    try {
        let sortedChain = realm.objects('Block').sorted('index', true);
        return sortedChain[0];
    } catch (e) {
        logger.debug(e);
        return null;
    }
};

/* Find all Blocks in the local chain by user.uuid. Returns a promise */
const findBlocksByOwner = (owner) => {
    return new Promise((resolve => {
        let localChain = realm.objects('Block');
        let filteredBlocks = localChain.filtered('owner.uuid = "' + owner.uuid + '"');
        resolve(filteredBlocks);
    }))
};

/* Validate the Localchain. Returns a promise */
const validateLocalChain = () => {
    return new Promise((resolve, reject) => {
        // get chain with the latest block on top
        let blockchain = realm.objects('Block').sorted('index', true);
        const chainLength = blockchain.length;
        logger.info('Blockchain Length: ' + chainLength);
        let currentBlock, previousBlock, currentBlockHash, previousBlockHash;
        try {
            for (let i = 0; i < chainLength; i++) {
                logger.info('Iteration: ' + (i + 1));
                if (blockchain[i].index === 0) {
                    logger.info('On genesis block now.\n└─Local chain integrity verified!\n');
                    return resolve(true);
                }
                currentBlock = blockchain[i];
                currentBlockHash = generateBlockHash(currentBlock);

                previousBlock = blockchain[i + 1];
                previousBlockHash = generateBlockHash(previousBlock);

                logger.info('(Current Block) index: ' + currentBlock.index + ', hash: ' + currentBlock.blockHash);
                logger.info('(Previous Block) index: ' + previousBlock.index + ', hash: ' + previousBlock.blockHash);

                // step 1: validate current Block Hash
                process.stdout.write('Validating current block hash...');
                if (currentBlockHash !== currentBlock.blockHash) {
                    console.log('\n└─Current block hash does not match generated hash!');
                    return reject(false);
                }
                console.log('ok');

                // step 2: validate prev Block Hash
                process.stdout.write('Validating previous block hash...');
                if (previousBlock.index === 0) {
                    console.log('ok');
                } else if (previousBlockHash !== previousBlock.blockHash) {
                    console.log('\n└─Previous block hash does not match generated hash!');
                    return reject(false);
                }

                // step 3: validate hash link
                process.stdout.write('Validating hash chain link...');
                if (currentBlock.previousHash !== previousBlock.blockHash) {
                    console.log('\n└─Current block\'s previous hash does not match current block\'s hash!');
                    return reject(false);
                }
                console.log('ok');

                console.log('---------------------------------------');
            }
        } catch (e) {
            reject(e);
        }
    });

};

/* Gets local chain version. Returns the chain length as an integer. */
const getLocalChainVersion = () => {
    return realm.objects('Block').length;
};

const replaceChain = (newChain) => {
    let deletePromise = new Promise((resolve, reject) => {
        try {
            realm.write(() => {
                let localChain = realm.objects('Block');
                realm.delete(localChain); // Deletes all Blocks
            });
            resolve(true);
        } catch (e) {
            reject(e);
        }
    });
    let replacePromise = new Promise((resolve, reject) => {
        let newChainObjects = newChain.map((block) => {
            let transactions = block.transactions.map((transaction) => {
                let frags = transaction.frags.map((frag) => {
                    return {
                        index: frag.index,
                        RSfragCount: frag.RSfragCount,
                        fileHash: frag.fileHash,
                        fragHash: frag.fileHash,
                        fragLocation: frag.fragLocation,
                    }
                });
                return {
                    index: transaction.index,
                    encFragCount: transaction.encFragCount,
                    txSize: transaction.txSize,
                    fragHash: transaction.fragHash,
                    encFragHash: transaction.encFragHash,
                    frags: frags,
                    merkleRoot: transaction.merkleRoot,
                    transactionHash: transaction.transactionHash,
                    rsConfig: transaction.rsConfig,
                    name: transaction.name,
                    extension: transaction.extension
                }
            });
            return {
                index: block.index,
                previousHash: block.previousHash,
                owner: block.owner,
                file: block.file,
                transactions: transactions,
                merkleRoot: block.merkleRoot,
                timestamp: block.timestamp,
                blockHash: block.blockHash
            }
        });

        newChainObjects.forEach(block => {
            try {
                realm.write(() => {
                    resolve(realm.create('Block', block));
                });
            } catch (e) {
                reject(e);
            }
        });
    });

    deletePromise.then(() => {
        replacePromise.then(bl => {
            logger.warn('******** LOCAL CHAIN REPLACED ********')
        }).catch(e => {
            console.log(e);
        })
    }).catch(e => {
        console.log(e);
    });
};

const findBlockByIndex = (index) => {
    return new Promise(resolve => {
        let localChain = realm.objects('Block');
        let filtered = localChain.filtered('index = "' + index + '"');
        resolve(filtered[0]);
    });
};

const saveUser = user =>{
    realm.write(() => {
        realm.create('Owner', {...user});
    });
    return user;
};

const findUserByUsername = username => {
    return realm.objects('Owner').filtered(`username = "${username}"`)[0];
};

const findUserByUUID = uuid => {
    return realm.objects('Owner').filtered(`username = "${uuid}"`)[0];
};

const getAllUsers = () => {
  return realm.objects('Owner')
};

/* Good old exports */
module.exports = {
    initializeChain,
    storeBlock,
    getChain,
    getLatestBlock,
    generateTransactionMerkleRoot,
    createTransaction,
    findBlocksByOwner,
    validateLocalChain,
    createRSFragment,
    getLocalChainVersion,
    storeBlockFromRemote,
    replaceChain,
    findBlockByIndex,
    saveUser,
    findUserByUsername,
    findUserByUUID,
    getAllUsers
};