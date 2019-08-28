const MLR = require('ml-regression-multivariate-linear');
const inputs = require('./input');
const outputs = require('./output');
const fs = require('fs');
const x = inputs;
const y = outputs;
var newInput=[];
var newOutput=[];

const startModel = (node) => {
    return new Promise((resolve, reject) => {
        let val = predict(node);
        val.then((results)=>{
            resolve(results);
        })
            .catch(function (error) {
                reject(error);
            });
    })
};

const predict = (node) => {
    return new Promise((resolve, reject) => {
        try{
            if(node[4] === 0){
                reject(0);
            }
            else{
                const mlr = new MLR(x, y);
                let results = mlr.predict(node);
                newInput = inputs;
                newInput.push(node);
                newOutput = outputs;
                newOutput.push(results);
                // fs.writeFile('inputs.json', JSON.stringify(newInput), function (err) {
                //     if (err)
                //         reject(-1);
                // });
                // fs.writeFile('outputs.json', JSON.stringify(newOutput), function (err) {
                //     if (err)
                //         reject(-1);
                // });
                resolve(results);
            }
        }
        catch(error){
            reject(-1);
        }
    })
};

module.exports = {
    startModel
};