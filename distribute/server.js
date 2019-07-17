const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const download = require('./download.js').download;

const app = express();
app.set('port', process.env.PORT || 3000);

app.post('/upload/:filename', function (req, res) {
    let filename = path.basename(req.params.filename);
    //filename = path.resolve(__dirname, filename);
    let dst = fs.createWriteStream('../files/'+filename);
    req.pipe(dst);
    dst.on('drain', function() {
      // console.log('drain', new Date());
      req.resume();
    });
    req.on('end', function () {
      res.send(200);
    });
});

app.post('/download/:filename', function (req, res) {
    let filename = path.basename(req.params.filename);
    let dst = fs.createWriteStream('../tmp/'+filename);
    req.pipe(dst);
    dst.on('drain', function() {
      // console.log('drain', new Date());
      req.resume();
    });
    req.on('end', function () {
      res.send(200);
    });
  });

  app.post('/downloading/:location/:filename', function (req, res) {
    let filename = path.basename(req.params.filename);
    let location = path.basename(req.params.location);
    download(location,  filename).then((msg)=>
    {
        res.send('200');
    });
  });

http.createServer(app).listen(app.get('port'), function () {
  console.log('file distribution server listening on port ' + app.get('port'));
});