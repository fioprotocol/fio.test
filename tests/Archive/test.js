//const exampleMnemonic = 'valley alien library bread worry brother bundle hammer loyal barely dune brave'
const mnemonic = 'valley alien library bread worry brother bundle hammer loyal barely dune brave'

const hdkey = require('hdkey');
const wif = require('wif');
const bip39 = require('bip39');
const seedBytes =  bip39.mnemonicToSeed(mnemonic);
//console.log('SeedBytes: ', SeedBytes)
const seed =  seedBytes.toString('hex');
//console.log('seed: ', seed)
const master = hdkey.fromMasterSeed(new Buffer(seed, 'hex'));
//console.log('master: ', master)
const node = master.derive('m/44\'/235\'/0\'/0/0');
//console.log('node: ', node)
const fioKey = wif.encode(128, node._privateKey, false);
//console.log('mnemonic: ', mnemonic)
//console.log('Private Key: ', fioKey)

class fioPrivateKey {
    static createPrivateKeyMnemonic(mnemonic) {
        return __awaiter(this, void 0, void 0, function* () {
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
        });
    }
}

async function mytest() {
    let examplerivateKeyRes = await createPrivateKeyMnemonic(mnemonic)
    examplePrivateKey = examplerivateKeyRes.fioKey
    return examplePrivateKey
  }

let asdf = fioPrivateKey.createPrivateKeyMnemonic(mnemonic);

