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
      "metadata":`${Math.random().toString(32).substr(2, 8)}`
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

describe(`************************** nft-performance-tests.js ************************** \n    A. Add a large number of users, mint and remove NFTs for all of them`, () => {
  let users = [];
  let user1Hash;
  let massNft;
  let nftHash = 'f83b5702557b1ee76d966c6bf92ae0d038cd176aaf36f86a18e2ab59e6aefa4b';
  let nftHash2 = 'f83b5702557b1ee76d966c6bf92ae0d038cd176aaf36f86a18e2ab59e6aefa4C';
  let ethContractAddr = '0x123456789ABCDEF';
  // let numUsers = 10000;
  let numUsers = 5000;
  // let numUsers = 500;
  // let numUsers = 50;

  before(async () => {
    for (let i=0; i<numUsers; i++) {
      users[i] = await newUser(faucet);
    }
    console.log('test users created');

    //grab our user records from fionames so we can use their fio_address_hash
    let fionames = await callFioApi("get_table_rows", {
      json: true,               // Get the response as json
      code: 'fio.address',      // Contract that we target
      scope: 'fio.address',         // Account that owns the data
      table: 'fionames',        // Table name
      //limit: 1000,                // Maximum number of rows that we want to get
      reverse: false,           // Optional: Get reversed data
      show_payer: false          // Optional: Show ram payer
    });
    fionames.rows = fionames.rows.slice(-numUsers);    // only need the last 3 accounts
    try {
      user1Hash = fionames.rows[0].namehash;
      // user2Hash = fionames.rows[1].namehash;
      // user3Hash = fionames.rows[2].namehash;
    } catch (err) {
      console.log('user namehash not found in table');
      throw err;
    }


  });

  it(`has ${numUsers} new users`, async () => {
    expect(users.length).to.equal(numUsers);
  });

  it(`mint NFTs for every user`, async () => {
    for (let i=0; i<users.length; i++) {
      massNft = {
        "chain_code":"ETH",
        "contract_address":`${ethContractAddr}`,
        "token_id":`${i+1}`,
        "url":"http://fio.example.nft",
        "hash":`${nftHash}`,
        "metadata": "abc-xyz-123"
      };
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
    console.log('test NFTs minted');
  });

  it(`verify NFTs have been added to the table`, async () => {
    const result = await callFioApi("get_table_rows", {
      code: "fio.address",
      scope: "fio.address",
      table: "nfts",
      index_position: "1",
      json: true,
      reverse: false
    });
    const rows = result.rows.slice(-numUsers);
    expect(rows[0].fio_address).to.equal(users[0].address);
    expect(rows[rows.length-1].fio_address).to.equal(users[users.length-1].address);
  });

  it(`verify get_nfts_contract returns NFTs at ${ethContractAddr}`, async () => {
    try {
      const result = await callFioApi('get_nfts_contract', {
        chain_code: "ETH",
        contract_address: `${ethContractAddr}`
      });
      const rowpos = result.nfts.slice(0, numUsers);
      const rows = result.nfts.slice(-numUsers);

      expect(result.nfts.length).to.be.greaterThanOrEqual(numUsers);
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  // it(`verify nftburnq is empty`, async () => {
  //
  // });

  it(`remove NFTs for all ${numUsers} users`, async () => {
    for (let i=0; i<users.length; i++) {
      try {
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
      } catch (err) {
        expect(err).to.equal(null);
      }
    }
  });

  it(`verify NFTs added to nftburnq`, async () => {
    try {
      const result = await callFioApi("get_table_rows", {
        json: true,
        code: 'fio.address',
        scope: 'fio.address',
        table: 'nftburnq',
        limit:numNfts,
        // lower_bound: user1Hash,
        // upper_bound: user1Hash,
        key_type: 'i128',
        index_position: '2'
      });
      expect(result.rows.length).to.be.greaterThanOrEqual(1);
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  // burn all in nftburnq
});

describe.only(`B. Add and remove a huge number of NFTs for a single user`, () => {
  let user1, user2, user1Hash, massNft, bal;
  let nftHash = 'f83b5702557b1ee76d966c6bf92ae0d038cd176aaf36f86a18e2ab59e6aefa4b';
  // let nftHash2 = 'f83b5702557b1ee76d966c6bf92ae0d038cd176aaf36f86a18e2ab59e6aefa4C';
  let ethContractAddr = '0x123456789ABCDEF';
  // let numNfts = 100000;
  // let numNfts = 10000;
  // let numNfts = 5000;
  // let numNfts = 500;
  let numNfts = 100;
  const fundsAmount = config.api.add_nft.fee * (numNfts);  //1800000000000000;
  const rmFundsAmt = config.api.remove_all_nfts.fee * (numNfts);

  before(async () => {
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
    let fionames = await callFioApi("get_table_rows", {
      json: true,               // Get the response as json
      code: 'fio.address',      // Contract that we target
      scope: 'fio.address',         // Account that owns the data
      table: 'fionames',        // Table name
      //limit: 1000,                // Maximum number of rows that we want to get
      reverse: false,           // Optional: Get reversed data
      show_payer: false          // Optional: Show ram payer
    });
    fionames.rows = fionames.rows.slice(-2);
    try {
      expect(fionames.rows[0].name).to.equal(user1.address);
      user1Hash = fionames.rows[0].namehash;
    } catch (err) {
      console.log('user namehash not found in table');
      throw err;
    }
  });

  it(`getFioBalance for user1`, async () => {
    bal = await user1.sdk.genericAction('getFioBalance', {});
  });

  it(`Transfer ${fundsAmount} FIO to userA1 FIO public key`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: user1.publicKey,
      amount: fundsAmount,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    });
    expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected');
  });

  it(`getFioBalance for user1`, async () => {
    const result = await user1.sdk.genericAction('getFioBalance', {});
    expect(result.available).to.equal(bal.available + fundsAmount)
    bal = result;
  });

  it(`get bundles for user1`, async () => {
    const result = await getBundleCount(user1.sdk);
    expect(result).to.equal(100);
  });

  it(`try to mint ${numNfts} NFTs for user1, expect TBD`, async () => {
    let nftCount = 0;
    while (nftCount < numNfts) {
      massNft = [{
        "chain_code":"ETH",
        "contract_address":`${ethContractAddr}`,
        "token_id":`${nftCount+1}`,
        "url":"http://fio.example.nft",
        "hash":`${nftHash}`,
        "metadata": "abc-xyz-123"
      // }, {
      //   "chain_code":"ETH",
      //   "contract_address":`${ethContractAddr}`,
      //   "token_id":`${nftCount+2}`,
      //   "url":"http://fio.example.nft",
      //   "hash":`${nftHash}`,
      //   "metadata": "abc-xyz-123"
      // }, {
      //   "chain_code":"ETH",
      //   "contract_address":`${ethContractAddr}`,
      //   "token_id":`${nftCount+3}`,
      //   "url":"http://fio.example.nft",
      //   "hash":`${nftHash}`,
      //   "metadata": "abc-xyz-123"
      }];

      try {
        const result = await user1.sdk.genericAction('pushTransaction', {
          action: 'addnft',
          account: 'fio.address',
          data: {
            fio_address: user1.address,
            nfts: massNft,
            max_fee: 600000000,
            actor: user1.account,
            tpid: ''
          }
        });
        expect(result.status).to.equal('OK');
        nftCount += massNft.length;
      } catch (err) {
        // expect(err.json.fields[0].error).to.equal('Insufficient funds to cover fee');
        expect(err).to.equal(null);
      }
    }
    console.log('done minting');
  });

  it(`verify NFTs have been added to the table`, async () => {
    try {
      const result = await callFioApi("get_table_rows", {
        code: "fio.address",
        scope: "fio.address",
        table: "nfts",
        index_position: "1",
        json: true,
        reverse: false
      });
      if (result.more === true) {
        expect(result.rows.length).to.be.greaterThanOrEqual(1000);
      } else {
        expect(result.rows.length).to.be.greaterThanOrEqual(numNfts);
      }
    } catch (err) {
      expect(err).to.equal(null);
    }
  });
  it(`verify get_nfts_fio_address returns ${numNfts} NFTs`, async () => {
    try {
      const result = await callFioApi('get_nfts_fio_address', {
        fio_address: user1.address
      });
      if (result.more > 0) {
        expect(result.nfts.length).to.be.greaterThanOrEqual(1000);
      } else {
        expect(result.nfts.length).to.be.greaterThanOrEqual(numNfts);
      }
    } catch (err) {
      expect(err).to.equal(null);
    }
  });
  it(`verify get_nfts_hash returns ${numNfts} NFTs`, async () => {
    try {
      const result = await callFioApi('get_nfts_hash', {
        hash: nftHash
      });
      if (result.more > 0) {
        expect(result.nfts.length).to.be.greaterThanOrEqual(1000);
      } else {
        expect(result.nfts.length).to.be.greaterThanOrEqual(numNfts);
      }
    } catch (err) {
      expect(err).to.equal(null);
    }
  });
  it(`verify get_nfts_contract returns ${numNfts} NFTs`, async () => {
    try {
      const result = await callFioApi('get_nfts_contract', {
        contract_address: ethContractAddr,
        chain_code: "ETH"
      });
      if (result.more > 0) {
        expect(result.nfts.length).to.be.greaterThanOrEqual(1000);
      } else {
        expect(result.nfts.length).to.be.greaterThanOrEqual(numNfts);
      }
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it(`verify nftburnq is empty`, async () => {
    try {
      const result = await callFioApi("get_table_rows", {
        json: true,
        code: 'fio.address',
        scope: 'fio.address',
        table: 'nftburnq',
        limit:numNfts,
        lower_bound: user1Hash,
        upper_bound: user1Hash,
        key_type: 'i128',
        index_position: '2'
      });
      expect(result.rows.length).to.equal(0);
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it(`Transfer another ${rmFundsAmt} FIO so user1 can burn NFTs`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: user1.publicKey,
      amount: rmFundsAmt,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected')
  });

  it(`Transfer another ${rmFundsAmt} FIO so user2 can burn NFTs`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: user2.publicKey,
      amount: rmFundsAmt,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected')
  });

  // remove a single NFT
  it.skip(`Remove a single NFT from user1 FIO Address`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: [{
            "chain_code":"ETH","contract_address":"0x123456789ABCDEF", "token_id":"1", "url":"", "hash":"","metadata":""
          }],
          max_fee: config.maxFee,
          actor: user1.account,
          tpid: ""
        }
      });
      expect(result.status).to.equal('OK');
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it(`remove all NFTs with remallnfts`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remallnfts',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          max_fee: config.api.remove_all_nfts.fee,
          actor: user1.account,
          tpid: ""
        }
      });
      expect(result.status).to.equal('OK');
      expect(result.fee_collected).to.equal(config.api.remove_all_nfts.fee);
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it(`verify user1's account hash was added to nftburnq`, async () => {
    try {
      const result = await callFioApi("get_table_rows", {
        json: true,
        code: 'fio.address',
        scope: 'fio.address',
        table: 'nftburnq',limit:numNfts,
        lower_bound: user1Hash,
        upper_bound: user1Hash,
        key_type: 'i128',
        index_position: '2'
      });
      expect(result.rows.length).to.equal(1);
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it(`get user1 bundles, expect 0`, async () => {
    const result = await getBundleCount(user1.sdk);
    expect(result).to.equal(0);
  });

  it(`user1 burns all NFTs in nftburnq`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'burnnfts',
        account: 'fio.address',
        data: {
          actor: user1.account,
        }
      });
      expect(result.status).to.equal('OK');
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it(`get user2 bundles, expect 100`, async () => {
    const result = await getBundleCount(user2.sdk);
    expect(result).to.equal(100);
  });

  it(`user2 burns all NFTs in nftburnq`, async () => {
    try {
      const result = await user2.sdk.genericAction('pushTransaction', {
        action: 'burnnfts',
        account: 'fio.address',
        data: {
          actor: user2.account,
        }
      });
      expect(result.status).to.equal('OK');
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  //TODO: bug -- If the nft-remove-burn tests work, why does burning not remove from nftburnq here?
  it(`(BD-2882) verify NFTs have been removed from the table`, async () => {
    try {
      const result = await callFioApi("get_table_rows", {
        code: "fio.address",
        scope: "fio.address",
        table: "nfts",
        index_position: "1",
        json: true,
        reverse: false
      });
      expect(result.rows.length).to.equal(0);
    } catch (err) {
      expect(err).to.equal(null);
    }
  });
  it(`(BD-2882) verify nftburnq is empty`, async () => {
    try {
      const result = await callFioApi("get_table_rows", {
        json: true,
        code: 'fio.address',
        scope: 'fio.address',
        table: 'nftburnq',
        limit:numNfts,
        lower_bound: user1Hash,
        upper_bound: user1Hash,
        key_type: 'i128',
        index_position: '2'
      });
      expect(result.rows.length).to.equal(0);
      // console.log(result.rows[0].fio_address_hash);
    } catch (err) {
      expect(err).to.equal(null);
    }
  });
  it(`(BD-2882) verify get_nfts_fio_address returns zero NFTs`, async () => {
    try {
      const result = await callFioApi('get_nfts_fio_address', {
        fio_address: user1.address
      });
      expect(result.nfts.length).to.equal(0);
    } catch (err) {
      expect(err).to.have.all.keys('name', 'statusCode', 'message', 'error', 'options', 'response');
      expect(err.statusCode).to.equal(404);
      expect(err.message).to.equal('404 - {"message":"No NFTS are mapped"}');
    }
  });
  it(`(BD-2882) verify get_nfts_hash returns zero NFTs`, async () => {
    try {
      const result = await callFioApi('get_nfts_hash', {
        hash: nftHash
      });
      expect(result.nfts.length).to.equal(0);
    } catch (err) {
      expect(err).to.have.all.keys('name', 'statusCode', 'message', 'error', 'options', 'response');
      expect(err.statusCode).to.equal(404);
      expect(err.message).to.equal('404 - {"message":"No NFTS are mapped"}');
    }
  });
  it(`(BD-2882) verify get_nfts_contract returns zero NFTs`, async () => {
    try {
      const result = await callFioApi('get_nfts_contract', {
        contract_address: ethContractAddr,
        chain_code: "ETH"
      });
      expect(result.nfts.length).to.equal(0);
    } catch (err) {
      expect(err).to.have.all.keys('name', 'statusCode', 'message', 'error', 'options', 'response');
      expect(err.statusCode).to.equal(404);
      expect(err.message).to.equal('404 - {"message":"No NFTS are mapped"}');
    }
  });
});
