const request = require('request');
const path = require('path');
const fs = require('fs');

const upload = (location, name) => {

    return new Promise((resolve, reject) => {

        let filename = name;
        let target = 'http://' + location + ':4000/upload/' + path.basename(filename);

        let rs = fs.createReadStream(filename);
        let ws = request.post(target);

        ws.on('drain', function () {
            // console.log('drain', new Date());
            rs.resume();
        });
        rs.on('end', function () {
            console.log('uploaded to ' + target);
            resolve('uploaded');
        });
        ws.on('error', function (err) {
            console.error('cannot send file to ' + target + ': ' + err);
            reject('Error uploading');
        });
        rs.pipe(ws);
    })

};


module.exports = {
    upload
};