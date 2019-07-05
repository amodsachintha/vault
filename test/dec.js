const dec = require('../redundancy/index.js');
const fs = require("fs");
const config = require('../config');

//blockchain re
//check availability
let frags = [
    {
        name:'localhost/a86b7fef110e14c65ced69453f400b5f1',
        type: 1,
    },
    {
        name:'localhost/d6957369674786278d2dfd3ab1e7aa803',
        type: 3,
    },
    {
        name:'localhost/c64e8e6741487b2a48f9ba14684370855',
        type: 5,
    },
    {
        name:'localhost/5e9fda69ae0e2b5a7ab32cba0f751cc02',
        type: 2,
    }
];

let size = fs.readFileSync( 'E:/Research-Split/test/video.mkv' ).length;
let decoded = `${config.TEMP_DIR}/video.decode.mkv`;

dec.preDecode(frags,size,decoded);

