const fragchain = require('./fragchain/index');
const webServer = require('./encrypt/app');

webServer.setBlockchainRef(fragchain);
webServer.startWebServer();