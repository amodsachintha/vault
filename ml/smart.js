const si = require('systeminformation');
const disk = require('diskusage');
const os = require('os');
const information = {
    total: null,
    free: null,
    used: null,
    status: null
};

const getSMARTDetails = (p) => {
    return new Promise((resolve, reject) => {
        let val = storageDetails(p);
        val.then((results) => {
            let val2 = SMARTStatus();
            val2.then((results2) => {
                information.status = results2;
                resolve(information);
            }).catch(e => {
                information.status = 3;
                resolve(information);
            });
        }).catch(function (error) {
            reject(error);
        });
    })
};

const storageDetails = (p) => {
    return new Promise((resolve, reject) => {
        let path = os.platform() === 'win32' ? p : '/';
        try {
            let info = disk.checkSync(path);
            information.free = info.available;
            information.used = info.total - info.available;
            information.total = info.total;
            resolve(1);
        } catch (err) {
            reject(-1);
        }
    })
};

const SMARTStatus = () => {
    return new Promise((resolve, reject) => {
        si.diskLayout().then(data =>
            resolve(data[0].smartStatus))
            .catch(error =>
                reject(null));
    })
};

module.exports = {
    getSMARTDetails
};
