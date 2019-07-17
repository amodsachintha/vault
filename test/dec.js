const dec = require('../redundancy/index.js');
const fs = require("fs");
const config = require('../config');

//blockchain re
//check availability
let frags = [
    {
        name:'localhost/ad353b79e0f379bfc8b771fd80c8c9ee1',
        type: 1,
    },
    {
        name:'localhost/7f9505a912bd900e8dfd7ec66860ca612',
        type: 2,
    },
    {
        name:'localhost/5ddd0f219081a11b803bca9393e8a1e83',
        type: 3,
    },
    {
        name:'localhost/fbf924b27b5950e7d9250deba8e3367a4',
        type: 4,
    }
];

let size = fs.readFileSync( '/home/amod/Desktop/heavydirtysoul - twenty one pilots (lyrics) - YouTube.MP4' ).length;
let decoded = `${config.TEMP_DIR}/video.decode.mkv`;

dec.preDecode(frags,size,decoded);

