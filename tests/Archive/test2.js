

    return new Promise(function(resolve, reject) {
        const hdkey = require('hdkey');
        const wif = require('wif');
        const bip39 = require('bip39');
        const seedBytes = yield bip39.mnemonicToSeed(mnemonic);
        const seed = yield seedBytes.toString('hex');
        const master = hdkey.fromMasterSeed(new Buffer(seed, 'hex'));
        const node = master.derive('m/44\'/235\'/0\'/0/0');
        const fioKey = wif.encode(128, node._privateKey, false);
        console.log('mnemonic: ', mnemonic)
        console.log('Private Key: ', fioKey)
        return { fioKey, mnemonic };
        resolve(fioKey);

    });