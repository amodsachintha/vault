//file-split modules
const encoder = require('./src/Encode.js');
const decoder = require('./src/Decode.js');
const HashCheck = require('./src/HashCheck.js');
const logger = require('../logger').getLogger('redundancy-index');
let blockchainRef = null;
const upload = require('../distribute/upload.js').upload;
const config = require('../config');
const fs = require('fs')
const request = require('request');
const path = require('path');

let frags = [];
let size = 0;
let decoded = null;

const encodeFile = (fname, ext, blk) => {
    encoder.start(fname, ext, blk).then((bl) => {
        //logger.warn(bl.transactions.length);
        logger.info('successfully encoded');
        for(let i=0; i < bl.transactions[0].frags.length ; i++)
        {
            upload('localhost', config.TEMP_DIR + '/' + bl.transactions[0].frags[i].fragLocation).then((msg)=>
            {
                try {
                    fs.unlinkSync(config.TEMP_DIR + '/' + bl.transactions[0].frags[i].fragLocation)
                    //file removed
                  } catch(err) {
                    console.error(err)
                  }
                  bl.transactions[0].frags[i].fragLocation = 'localhost/'+bl.transactions[0].frags[i].fragLocation;
            });
        }
        logger.info(bl.transactions[0].frags);
    }).catch((e) => {
        logger.error(e);
    });
};

const  preDecode = (frag,len,name) => {
    size = len;
    decoded = name;
    frags = frag;
    download().then(()=>
    {
        frags[0].name = config.TEMP_DIR +'/'+ frags[0].name.split("/")[1];
        frags[1].name = config.TEMP_DIR +'/'+ frags[1].name.split("/")[1];
        frags[2].name = config.TEMP_DIR +'/'+ frags[2].name.split("/")[1];
        frags[3].name = config.TEMP_DIR +'/'+ frags[3].name.split("/")[1];

        setTimeout(function afterTwoSeconds() {
            decodeFile();
          }, 1000)
    });
}

const  download = () => {
    return new Promise((resolve, reject) => {
        for(let i=0; i < frags.length ; i++)
        {
            request.post('http://'+frags[i].name.split("/")[0]+':3000/downloading/' + 'localhost/' +path.basename(frags[i].name.split("/")[1]))
            .on('response', function(response) {
                if( i === frags.length-1){resolve();}
              })
        }
    });

}
const decodeFile = () => {
    decoder.start(frags,size,decoded).then(() => {
        logger.info('successfully decoded');
    }).catch((e) => {
        logger.error(e);
    });
};


const verifyHash = (file1, file2) => {
    HashCheck.verifyIntegrity(file1, file2);
};

const setBlockchainRef = (blkchainrf) => {
    blockchainRef = blkchainrf;
};

module.exports = {
    setBlockchainRef,
    encodeFile,
    decodeFile,
    verifyHash,
    download,
    preDecode
};