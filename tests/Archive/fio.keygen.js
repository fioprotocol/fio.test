//const fiojs_1 = require("@fioprotocol/fiojs")
const { Fio, Ecc } = require("@fioprotocol/fiojs")
const privateKey = '5KHY3QDaotFwSp18Bfchk1Az8mHtixA2JCnrsaJSmwUpRvLijnL'
const publicKey = 'FIO6uNVAFCsHwDr3EqnonXonJAveUFwTfDEPnAGWqvN8Ppvtgdipz'
  //actor = d4v2i5aok1gr

//console.log ('account', fiojs_1.Fio.accountHash('FIO6uNVAFCsHwDr3EqnonXonJAveUFwTfDEPnAGWqvN8Ppvtgdipz'))
//asdf = fiojs_1.Fio.

//const cipher = fiojs_1.Fio.createSharedCipher({ privateKey, publicKey, textEncoder, textDecoder });

async () => {info = await rpc.get_info()}
async () => {blockInfo = await rpc.get_block(info.last_irreversible_block_num)}
currentDate = new Date();
timePlusTen = currentDate.getTime() + 10000;
timeInISOString = (new Date(timePlusTen)).toISOString();
expiration = timeInISOString.substr(0, timeInISOString.length - 1);

transaction = {
    expiration,
    ref_block_num: blockInfo.block_num & 0xffff,
    ref_block_prefix: blockInfo.ref_block_prefix,
    actions: [{
        account: 'eosio.token',
        name: 'transfer',
        authorization: [{
            actor: 'bob',
            permission: 'active',
        }],
        data: {
            from: 'bob',
            to: 'alice',
            quantity: '0.0001 SYS',
            memo: '',
        },
    }]
};

abiMap = new Map()
async () => {tokenRawAbi = await rpc.get_raw_abi('eosio.token')}
abiMap.set('eosio.token', tokenRawAbi)

async () => {
    tx = await Fio.prepareTransaction({transaction, chainId, privateKeys, abiMap,
    textDecoder: new TextDecoder(), textEncoder: new TextEncoder()}) 
}

async () => {
        pushResult = await fetch(httpEndpoint + '/v1/chain/push_transaction', {
        body: JSON.stringify(tx),
        method: 'POST',
    });
}

async () => {json = await pushResult.json()}
if (json.processed && json.processed.except) {
    throw new RpcError(json);
}

expect(Object.keys(json)).toContain('transaction_id');