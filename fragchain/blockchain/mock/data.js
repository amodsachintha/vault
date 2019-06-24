const pvtKey = '-----BEGIN RSA PRIVATE KEY-----\n' +
    'MIIBOgIBAAJBAJSXLl4qsAAd1/ZtzXgdjB/GphnbVPESlHrN7sn39oO+mNQBXTt8\n' +
    'H3eyV79av5AH7n83qvM7NSaLll5u1joF0d8CAwEAAQJAD5XT3TipATogHs7hkEm5\n' +
    'GtQhM/EXdbm3LTJQa4rApoy8RGOkCLTp3P7QLlsU3VjJ5rZJAy9zcVTBugOCIz4E\n' +
    'kQIhANDWPGPSZqkad4sVf/K4kfkgGatxLSDF6ffC2R7FC93DAiEAtiXYUwBTHQ/Q\n' +
    '6h2OHHLYrV1Sl/7fR9EFBAaSW/aSbbUCIQCrULPlp3o0CtQ6Mn7tnF+TILQuIf/F\n' +
    'PNY8O4llZnvfhQIgZzn5Z8iWUbEF77gCMsMvYsixpywtM9EUK5zh0zZg88UCIGo9\n' +
    'GrmpRbsMpqXqw1XLA9H424qhyl/uZamRuqalUWjh\n' +
    '-----END RSA PRIVATE KEY-----';  // should be encrypted (symmetric)

const pubKey = '-----BEGIN PUBLIC KEY-----\n' +
    'MFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBAJSXLl4qsAAd1/ZtzXgdjB/GphnbVPES\n' +
    'lHrN7sn39oO+mNQBXTt8H3eyV79av5AH7n83qvM7NSaLll5u1joF0d8CAwEAAQ==\n' +
    '-----END PUBLIC KEY-----';

const owner = {
    uuid: '45d306d1-8b28-4a12-842d-cfaef4557ff4',
    name: 'Amod Sachintha',
    username: 'epsi',
    privateKey: pvtKey,
    publicKey: pubKey,
    masterKey: '82cc921c6a5c6707e1d6e6862ba3201a',
    createdAt: new Date()
};

const file = {
    fileName: 'video.mp4',
    fileSize: 65212500,
    fileHash: '5b31bc87b88a781bf3759193e6eef7f2e973eb7c0a2d597897138a95b198e005'
};

const frags1 = [
    {
        index: 1,
        RSfragCount: 6,
        fileHash: 'a3ddaabfbee595e98085f52cf2fd2450b81408d3d04dcb96e82474725de5bdc2',
        fragHash: '1a4364c35529616d8a8de5bac16ebb497357106bf74a734062ba5a7511f9ef5b',
        fragLocation: '192.168.56.112:4080',
    },
    {
        index: 2,
        RSfragCount: 6,
        fileHash: 'a3ddaabfbee595e98085f52cf2fd2450b81408d3d04dcb96e82474725de5bdc2',
        fragHash: 'e34f07888586bc7797b6b5748db0ab0e440ce6b50160c3569a13dfc7a7b31d7d',
        fragLocation: '192.168.56.102:4080',
    },
    {
        index: 3,
        RSfragCount: 6,
        fileHash: 'a3ddaabfbee595e98085f52cf2fd2450b81408d3d04dcb96e82474725de5bdc2',
        fragHash: '58bf0f878f897696f16248253f077f9c12a3a8924366677bf0ea13307bcc1715',
        fragLocation: '192.168.56.92:4080',
    },
    {
        index: 4,
        RSfragCount: 6,
        fileHash: 'a3ddaabfbee595e98085f52cf2fd2450b81408d3d04dcb96e82474725de5bdc2',
        fragHash: 'a44f3a48f4e1191b9e688e2a2123382d95443ab9cc2c64858b1e780e9492083c',
        fragLocation: '192.168.56.102:4080',
    },
    {
        index: 5,
        RSfragCount: 6,
        fileHash: 'a3ddaabfbee595e98085f52cf2fd2450b81408d3d04dcb96e82474725de5bdc2',
        fragHash: '7b3b91fa15cabf414057cd553dbad3d80c70b7b14ab8035e48c872b70d1f7653',
        fragLocation: '192.168.56.110:4080',
    },
    {
        index: 6,
        RSfragCount: 6,
        fileHash: 'a3ddaabfbee595e98085f52cf2fd2450b81408d3d04dcb96e82474725de5bdc2',
        fragHash: 'caced28323c51f563be4353e8ef8170b168cb0f5d9bf81833fa1dff84887497b',
        fragLocation: '192.168.56.105:4080',
    },
];
const frags2 = [
    {
        index: 1,
        RSfragCount: 6,
        fileHash: 'a3ddaabfbee595e98085f52cf2fd2450b81408d3d04dcb96e82474725de5bdc2',
        fragHash: 'a3ddaabfbee595e98085f52cf2fd2450b81408d3d04dcb96e82474725de5bdc2',
        fragLocation: '192.168.56.102:4080',
    },
    {
        index: 2,
        RSfragCount: 6,
        fileHash: 'a3ddaabfbee595e98085f52cf2fd2450b81408d3d04dcb96e82474725de5bdc2',
        fragHash: '17e6019cac434874184dcb7b2897760faf71f0bcdc1b53d2b4c5ae314b74c162',
        fragLocation: '192.168.56.122:4080',
    },
    {
        index: 3,
        RSfragCount: 6,
        fileHash: 'a3ddaabfbee595e98085f52cf2fd2450b81408d3d04dcb96e82474725de5bdc2',
        fragHash: '67aa971c68b6a78af3d722523ac07e6f47c56de756b915b42dc187486d741759',
        fragLocation: '192.168.56.104:4080',
    },
    {
        index: 4,
        RSfragCount: 6,
        fileHash: 'a3ddaabfbee595e98085f52cf2fd2450b81408d3d04dcb96e82474725de5bdc2',
        fragHash: '1a4364c35529616d8a8de5bac16ebb497357106bf74a734062ba5a7511f9ef5b',
        fragLocation: '192.168.56.112:4080',
    },
    {
        index: 5,
        RSfragCount: 6,
        fileHash: 'a3ddaabfbee595e98085f52cf2fd2450b81408d3d04dcb96e82474725de5bdc2',
        fragHash: 'e89b4d3e3a97a8de6ec1832f20c1c99a1b79cce86763dfe2835cbbfb12f00fec',
        fragLocation: '192.168.56.103:4080',
    },
    {
        index: 6,
        RSfragCount: 6,
        fileHash: 'a3ddaabfbee595e98085f52cf2fd2450b81408d3d04dcb96e82474725de5bdc2',
        fragHash: 'eba89e4c434f8671782f64f96ebb670cdfa0ecfd0db16c89c7d2743c9fad907d',
        fragLocation: '192.168.56.102:4080',
    },
];

const transactions = [
    {
        index: 1,
        encFragCount: 2,
        fragHash: 'a2aad661cabe4261d0d54bb7ea3e86daacc8768d233e9cc089d7badea025c71e',
        encFragHash: '9cc9bd5b21cbdef3c9e435cbfcecaa548c4674a16b3139dd671f8461991b0fcb',
        frags: frags1,
        merkleRoot: 'ec78f0d93adc8544c10e3d47fb342084228af603a27065380d060d307223ef9a',
        transactionHash: 'ffad05b8a082bf1144650ea5db4b76eded543b2de014d3142958d41b1c5645ea',
        rsConfig: '4+2'
    }, {
        index: 2,
        encFragCount: 2,
        fragHash: '43411e08a2b049ca2ddafc482ec688482b437309ce2c3b2c80c4d657ef17a86f',
        encFragHash: '12a0271abf09f42bd54180c615381b094d6674252103ac37c975e4fe101fe785',
        frags: frags2,
        merkleRoot: '182dc4c8aa8812a920b15a5db355dae6481cb47bf9bad5e255159bdb25fa57a6',
        transactionHash: 'a6c86126c27599005466310e393c7d6687e33c646f28fda6323dc1464362904c',
        rsConfig: '4+2'
    }];

const bl = {
    index: 2,
    previousHash: '9343626b6ab5ff9f73a033f83e5495bd48cc70a3361c32829855875e8bedaa57',
    owner: owner,
    file: file,
    transactions: transactions,
    merkleRoot: 'fe2df739486b70dc37ecc503618c1716d3e6ce63f9c04da4c8ceab33db2c5667',
    timestamp: new Date(),
    blockHash: '3190826b92f24ddb39465ae9937f93d21674c5a5d6493d4d7699694331768a07'
};

module.exports = {owner, file, transactions, block: bl};