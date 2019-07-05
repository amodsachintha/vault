const dec = require('../redundancy/index');
const config = require('../config');

dec.verifyHash('E:/Research-Split/test/video.mkv',`${config.TEMP_DIR}/video.decode.mkv`);

