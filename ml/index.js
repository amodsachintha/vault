const smart = require('./smart');

const getNodeInfo = () => {
    return new Promise((resolve, reject) => {
        let val2 = smart.getSMARTDetails('c:');
        val2.then((results) => {
            resolve(results);
        }).catch(function (error) {
            console.log(error);
            reject(error);
        });
    })
};

module.exports = {getNodeInfo};