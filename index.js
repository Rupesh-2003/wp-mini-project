const NodeRSA = require('node-rsa')


const key = new NodeRSA({ b: 1024 });

console.log(key.exportKey('public'))
console.log(key.exportKey('private'))