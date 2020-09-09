const { Fio } = require('@fioprotocol/fiojs');
const { TextEncoder, TextDecoder } = require('text-encoding');
const fetch = require('isomorphic-fetch') // or 'node-fetch'

const httpEndpoint = 'http://testnet.fioprotocol.io'

// Create keypair on Testnet monitor and fund from faucet. 
const user = {
  privateKey: '5KUDbyT8y9TrKqUmjtBgU3q3jSdr6iB9AwGL7Ckiux5gThrTY8F',
  publicKey: 'FIO7xSZcwyrhbSc6StgCbwpyQKfhewEUCjXkMRKyqDCKMvEqT3arN',
  account: 'ojqvu4snzuxa',
  domain: 'mytestdomain',  // The domain you want to register
  address: 'mytestaddress@mytestdomain'  // The address you want to register
}

const fioRegisterDomain = async () => {
  info = await (await fetch(httpEndpoint + '/v1/chain/get_info')).json();
  blockInfo = await (await fetch(httpEndpoint + '/v1/chain/get_block', {body: `{"block_num_or_id": ${info.last_irreversible_block_num}}`, method: 'POST'})).json()
  chainId = info.chain_id;
  currentDate = new Date();
  timePlusTen = currentDate.getTime() + 10000;
  timeInISOString = (new Date(timePlusTen)).toISOString();
  expiration = timeInISOString.substr(0, timeInISOString.length - 1);
  
  transaction = {
     expiration,
     ref_block_num: blockInfo.block_num & 0xffff,
     ref_block_prefix: blockInfo.ref_block_prefix,
     actions: [{
         account: 'fio.address',
         name: 'regdomain',
         authorization: [{
             actor: user.account,
             permission: 'active',
         }],
         data: {
             fio_domain: user.domain,
             owner_fio_public_key: user.publicKey,
             max_fee: 800000000000,
             tpid: 'rewards@wallet',
             actor: user.account,
         },
     }]
  };

  abiMap = new Map()
  tokenRawAbi = await (await fetch(httpEndpoint + '/v1/chain/get_raw_abi', {body: `{"account_name": "fio.address"}`, method: 'POST'})).json()
  abiMap.set('fio.address', tokenRawAbi)
 
  var privateKeys = [user.privateKey];
  
  const tx = await Fio.prepareTransaction({
    transaction,
    chainId,
    privateKeys,
    abiMap,
    textDecoder: new TextDecoder(),
    textEncoder: new TextEncoder()
  });

  pushResult = await fetch(httpEndpoint + '/v1/chain/register_fio_domain', {
      body: JSON.stringify(tx),
      method: 'POST',
  });
  
  json = await pushResult.json()

  if (json.type) {
    console.log('Error: ', json.fields[0].error);
  } else if (json.error) {
    console.log('Error: ', json.error)
  } else {
    console.log('Success. Transaction ID: ', json.transaction_id)
  }
  
};

const fioRegisterAddress = async () => {
  info = await (await fetch(httpEndpoint + '/v1/chain/get_info')).json();
  blockInfo = await (await fetch(httpEndpoint + '/v1/chain/get_block', {body: `{"block_num_or_id": ${info.last_irreversible_block_num}}`, method: 'POST'})).json()
  chainId = info.chain_id;
  currentDate = new Date();
  timePlusTen = currentDate.getTime() + 10000;
  timeInISOString = (new Date(timePlusTen)).toISOString();
  expiration = timeInISOString.substr(0, timeInISOString.length - 1);
  
  transaction = {
     expiration,
     ref_block_num: blockInfo.block_num & 0xffff,
     ref_block_prefix: blockInfo.ref_block_prefix,
     actions: [{
         account: 'fio.address',
         name: 'regaddress',
         authorization: [{
             actor: user.account,
             permission: 'active',
         }],
         data: {
             fio_address: user.address,
             owner_fio_public_key: user.publicKey,
             max_fee: 40000000000,
             tpid: 'rewards@wallet',
             actor: user.account,
         },
     }]
  };

  abiMap = new Map()
  tokenRawAbi = await (await fetch(httpEndpoint + '/v1/chain/get_raw_abi', {body: `{"account_name": "fio.address"}`, method: 'POST'})).json()
  abiMap.set('fio.address', tokenRawAbi)
 
  var privateKeys = [user.privateKey];
  
  const tx = await Fio.prepareTransaction({
    transaction,
    chainId,
    privateKeys,
    abiMap,
    textDecoder: new TextDecoder(),
    textEncoder: new TextEncoder()
  });

  pushResult = await fetch(httpEndpoint + '/v1/chain/register_fio_address', {
      body: JSON.stringify(tx),
      method: 'POST',
  });
  
  json = await pushResult.json();

  if (json.type) {
    console.log('Error: ', json.fields[0].error);
  } else {
    console.log('Success. Transaction ID: ', json.transaction_id)
  }
   
};

const fioAddPublicAddress = async () => {
  info = await (await fetch(httpEndpoint + '/v1/chain/get_info')).json();
  blockInfo = await (await fetch(httpEndpoint + '/v1/chain/get_block', {body: `{"block_num_or_id": ${info.last_irreversible_block_num}}`, method: 'POST'})).json()
  chainId = info.chain_id;
  currentDate = new Date();
  timePlusTen = currentDate.getTime() + 10000;
  timeInISOString = (new Date(timePlusTen)).toISOString();
  expiration = timeInISOString.substr(0, timeInISOString.length - 1);
  
  transaction = {
     expiration,
     ref_block_num: blockInfo.block_num & 0xffff,
     ref_block_prefix: blockInfo.ref_block_prefix,
     actions: [{
         account: 'fio.address',
         name: 'addaddress',
         authorization: [{
             actor: user.account,
             permission: 'active',
         }],
         data: {
            fio_address: user.address,
            public_addresses: [
              {
                chain_code: 'BCH',
                token_code: 'BCH',
                public_address: 'bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9',
              },
              {
                chain_code: 'DASH',
                token_code: 'DASH',
                public_address: 'XyCyPKzTWvW2XdcYjPaPXGQDCGk946ywEv',
              }
            ],
            max_fee: 600000000,
            tpid: 'rewards@wallet',
            actor: user.account,
         },
     }]
  };

  abiMap = new Map()
  tokenRawAbi = await (await fetch(httpEndpoint + '/v1/chain/get_raw_abi', {body: `{"account_name": "fio.address"}`, method: 'POST'})).json()
  abiMap.set('fio.address', tokenRawAbi)
 
  var privateKeys = [user.privateKey];
  
  const tx = await Fio.prepareTransaction({
    transaction,
    chainId,
    privateKeys,
    abiMap,
    textDecoder: new TextDecoder(),
    textEncoder: new TextEncoder()
  });

  pushResult = await fetch(httpEndpoint + '/v1/chain/add_pub_address', {
      body: JSON.stringify(tx),
      method: 'POST',
  });
  
  json = await pushResult.json();

  if (json.transaction_id) {
    console.log('Success. Transaction ID: ', json.transaction_id);
  } else if (json.code) {
    console.log('Error: ', json.error);
  } else {
    console.log('Error: ', json)
  }

};

fioRegisterDomain();
fioRegisterAddress();
fioAddPublicAddress();

