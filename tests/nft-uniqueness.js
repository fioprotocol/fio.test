require('mocha');
const {expect} = require('chai');
const {newUser, fetchJson, callFioApi, timeout} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk');
config = require('../config.js');
let faucet;

function mintNfts (num) {
  let nfts = [];
  if (num === 0) return nfts;
  for (let i=1; i<=num; i++) {
    nfts.push({
      "chain_code":"ETH",
      "contract_address":"0x123456789ABCDEF",
      "token_id":`${i}`,
      "url":"",
      "hash":"",
      "metadata": ""
    });
  }
  return nfts;
}

async function getBundleCount (user) {
  const result = await user.genericAction('getFioNames', { fioPublicKey: user.publicKey });
  return result.fio_addresses[0].remaining_bundled_tx;
}

async function consumeRemainingBundles (user, user2) {
  let bal, bundles;
  bundles = await getBundleCount(user.sdk);
  bal = await user.sdk.genericAction('getFioBalance', {});
  process.stdout.write('\tconsuming remaining bundled transactions\n\tthis may take a while');
  if (bundles % 2 !== 0) {
    try {
      const result = await user.sdk.genericAction('addPublicAddresses', {
        fioAddress: user.address,
        publicAddresses: [
          {
            chain_code: 'ETH',
            token_code: 'ETH',
            public_address: 'ethaddress',
          }
        ],
        maxFee: config.api.add_pub_address.fee,
        walletFioAddress: ''
      })
      //console.log('Result:', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log(`Error consuming bundle, retrying (${err.message})`);
      wait(1000);
      bal = await user.sdk.genericAction('getFioBalance', {});
    } finally {
      bundles = await getBundleCount(user.sdk);
      bal = await user.sdk.genericAction('getFioBalance', {});
      expect(bundles % 2).to.equal(0);
    }
  }

  while (bundles > 0) {
    try {
      await user.sdk.genericAction('recordObtData', {
        payerFioAddress: user.address,
        payeeFioAddress: user2.address,
        payerTokenPublicAddress: user.publicKey,
        payeeTokenPublicAddress: user2.publicKey,
        amount: 5000000000,
        chainCode: "BTC",
        tokenCode: "BTC",
        status: '',
        obtId: '',
        maxFee: config.api.record_obt_data.fee,
        technologyProviderId: '',
        payeeFioPublicKey: user2.publicKey,
        memo: 'this is a test',
        hash: '',
        offLineUrl: ''
      })
      process.stdout.write('.');
      bal = await user.sdk.genericAction('getFioBalance', {});
      // wait(500);  //1000);
    } catch (err) {
      console.log(`Error consuming bundle, retrying (${err.message})`);
      wait(1000);
      bal = await user.sdk.genericAction('getFioBalance', {});
    } finally {
      bundles = await getBundleCount(user.sdk);
      bal = await user.sdk.genericAction('getFioBalance', {});
    }
  }
}

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
});

/**
 * Add the same NFT (chain_code, contract_address, token_id, url, hash) to large number of different FIO addresses

 Observe:

 That it works

 get_nfts_hash, get_nfts_contract, get_nfts_fio_address perform well

 Add similar NFT to same FIO Address

 chain_code, contract_address, token_id populated

 chain_code, contract_address, token_id blank

 Observe

 That 2 NFTs are added

 Burn FIO Address

 Observe

 NFTs being burned

 Burn expired FIO Domain which has a FIO Address, which has NFTs

 Observe

 NFTs being burned
 */

describe(`************************** nft-uniqueness.js ************************** \n    A. Add same NFT to multiple users`, () => {
  let users = [];
  let massNft;
  let nftHash = 'f83b5702557b1ee76d966c6bf92ae0d038cd176aaf36f86a18e2ab59e6aefa4b';
  let nftHash2 = 'f83b5702557b1ee76d966c6bf92ae0d038cd176aaf36f86a18e2ab59e6aefa4C';
  let ethContractAddr = '0x123456789ABCDEF';
  let numUsers = 50;

  before(async () => {
    for (let i=0; i<numUsers; i++) {
      users[i] = await newUser(faucet);
    }

    massNft = {
      "chain_code":"ETH",
      "contract_address":`${ethContractAddr}`,
      "token_id":"1",
      "url":"http://fio.example.nft",
      "hash":`${nftHash}`,
      "metadata": "abc-xyz-123"
    };
  });

  it(`has ${numUsers} new users`, async () => {
    expect(users.length).to.equal(numUsers);
  });

  it(`add the same NFT to ${numUsers} users`, async () => {
    console.log(`          minting the same NFT for all ${numUsers} test users`);
    for (let i=0; i<numUsers; i++) {
      try {
        const result = await users[i].sdk.genericAction('pushTransaction', {
          action: 'addnft',
          account: 'fio.address',
          data: {
            fio_address: users[i].address,
            nfts: [massNft],
            max_fee: 5000000000,
            actor: users[i].account,
            tpid: ""
          }
        });
        expect(result.status).to.equal('OK');
      } catch (err) {
        expect(err).to.equal(null);
      }
    }
    console.log('          mass assignment complete');
  });

  it(`verify get_nfts_hash returns all ${numUsers} users NFTs`, async () => {
    const result = await callFioApi('get_nfts_hash', {
      hash: nftHash
    });
    let nfts = result.nfts.slice(-numUsers);

    expect(nfts.length).to.equal(users.length);
    expect(nfts[0].fio_address).to.equal(users[0].address);
    expect(nfts[nfts.length-1].fio_address).to.equal(users[users.length-1].address);
  });

  it(`verify get_nfts_contract returns all ${numUsers} users NFTs`, async () => {
    const result = await callFioApi('get_nfts_contract', {
      chain_code:"ETH",
      contract_address:`${ethContractAddr}`
    });
    let nfts = result.nfts.slice(-numUsers);

    expect(nfts.length).to.equal(users.length);
    expect(nfts[0].fio_address).to.equal(users[0].address);
    expect(nfts[nfts.length-1].fio_address).to.equal(users[users.length-1].address);
  });

  it(`verify get_nfts_fio_address returns all ${numUsers} users NFTs`, async () => {
    console.log(`          validating NFTs by FIO address for all ${numUsers} users`);
    for (let i=0; i<users.length; i++) {
      const result = await callFioApi('get_nfts_fio_address', {
        fio_address: users[i].address
      });
      let nfts = result.nfts.slice(-numUsers);

      expect(result.nfts.length).to.equal(1);
      expect(result.nfts[0].chain_code).to.equal(massNft.chain_code);
      expect(result.nfts[0].contract_address).to.equal(massNft.contract_address);
      expect(result.nfts[0].token_id).to.equal(massNft.token_id);
      expect(result.nfts[0].url).to.equal(massNft.url);
      expect(result.nfts[0].hash).to.equal(massNft.hash);
      expect(result.nfts[0].metadata).to.equal(massNft.metadata);
    }
    console.log('          done');
  });

  it(`(populated values) add a similar NFT to user1 FIO address`, async () => {
    try {
      const result = await users[0].sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: users[0].address,
          nfts: [{
            "chain_code": "ETH",
            "contract_address": `${ethContractAddr}`,
            "token_id": "1",
            "url": "http://fio.example.nft/updated",
            "hash": `${nftHash2}`,
            "metadata": "abc-xyz-123-456"
          }],
          max_fee: 5000000000,
          actor: users[0].account,
          tpid: ""
        }
      });
      expect(result.status).to.equal('OK');
      expect(result.fee_collected).to.equal(0);
    } catch (err) {
      expect(err.json.fields[0].error).to.equal('Invalid chain code format');
    }
  });

  it(`(unhappy - blank contract_address, chain_code, token_id) add a similar NFT to user1 FIO address`, async () => {
    try {
      const result = await users[0].sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: users[0].address,
          nfts: [{
            "contract_address": "",
            "chain_code": "",
            "token_id": "",
            "url": "http://fio.example.nft/updated",
            "hash": `${nftHash2}`,
            "metadata": "abc-xyz-123-456"
          }],
          max_fee: 5000000000,
          actor: users[0].account,
          tpid: ""
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.json.fields[0].error).to.equal('Invalid chain code format');
    }
  });

  it(`remove all ${numUsers} users NFTs`, async () => {
    console.log(`          removing all ${numUsers} users NFTs`);
    for (let i=0; i<numUsers; i++) {
      // try {
      const result = await users[i].sdk.genericAction('pushTransaction', {
        action: 'remallnfts',
        account: 'fio.address',
        data: {
          fio_address: users[i].address,
          max_fee: 5000000000,
          actor: users[i].account,
          tpid: ""
        }
      });
      expect(result.status).to.equal('OK');
      expect(result.fee_collected).to.equal(0);
      // } catch (err) {
      //   expect(err).to.equal(null);
      // }
    }
    console.log('          done');
  });
});
