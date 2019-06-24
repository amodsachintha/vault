const realm = require('./realm');
const {MerkleTree} = require('merkletreejs');
const SHA256 = require('crypto-js/sha256');
const logger = require('../../logger').getLogger('blockchain');

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
        previousHash: '0000000000000000000000000000000000000000000000000000000000000000',
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
            fileName: 'vault.genesis',
            fileSize: 0,
            fileHash: '0000000000000000000000000000000000000000000000000000000000000000'
        },
        transactions: [{
            index: 1,
            encFragCount: 2,
            fragHash: '0000000000000000000000000000000000000000000000000000000000000000',
            encFragHash: '0000000000000000000000000000000000000000000000000000000000000000',
            frags: [{
                index: 1,
                RSfragCount: 1,
                fileHash: '0000000000000000000000000000000000000000000000000000000000000000',
                fragHash: '0000000000000000000000000000000000000000000000000000000000000000',
                fragLocation: 'Mars :D',
            }],
            merkleRoot: '0000000000000000000000000000000000000000000000000000000000000000',
            transactionHash: '0000000000000000000000000000000000000000000000000000000000000000',
            rsConfig: '4+2'
        }],
        timestamp: new Date(),
        merkleRoot: '0000000000000000000000000000000000000000000000000000000000000000',
        blockHash: '0000000000000000000000000000000000000000000000000000000000000000'
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
    const txs = transactions.map(tx=> createTransaction(tx.frags,tx.index,tx.encFragCount,tx.fragHash,tx.encFragHash,tx.rsConfig))
    const block = {
        index: prevBlock.index + 1,
        previousHash: prevBlock.blockHash,
        owner: owner,
        file: file,
        transactions: txs,
        timestamp: new Date(),
        merkleRoot: generateTransactionMerkleRoot(txs),
        blockHash: null
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
        transaction.encFragHash +
        transaction.fragHash +
        transaction.merkleRoot +
        transaction.rsConfig
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
const createTransaction = (fragments, index, encFragCount, fragHash, encFragHash, rsConfig) => {
    let frgs = fragments.map(fr => createRSFragment(fr.index,fr.RSfragCount,fr.fragHash,fr.fragLocation));
    const transaction = {
        index: index,
        encFragCount: encFragCount,
        fragHash: fragHash,
        encFragHash: encFragHash,
        frags: frgs,
        merkleRoot: generateRSFragMerkleRoot(frgs),
        transactionHash: null,
        rsConfig: rsConfig
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
                    fragHash: transaction.fragHash,
                    encFragHash: transaction.encFragHash,
                    frags: frags,
                    merkleRoot: transaction.merkleRoot,
                    transactionHash: transaction.transactionHash,
                    rsConfig: transaction.rsConfig
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
    replaceChain
};