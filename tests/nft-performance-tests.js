require('mocha');
const {expect} = require('chai');
const {newUser, fetchJson, callFioApi, timeout} = require('../utils.js');
const {FIOSDK} = require('@fioprotocol/fiosdk');
const config = require('../config.js');
let faucet;

/**
 * These performance tests work most reliably when run against a fresh blockchain
 *
 * They also take a long time, so should not necessarily be included in every test run
 *
 * Due to known timeout issues with large numbers of database records, the NFT getters
 * (get_nfts_fio_address, get_nfts_hash, get_nfts_contract) will likely time out before
 * retrieving all records. These tests create large numbers of records, including up to
 * 1,000,000 NFTs for a single FIO address.
 *
 * The other reason the getters might fail: If there are any records in nfts or nftburnq
 * prior to running these tests, they may show up in the getter responses, thus throwing
 * off assertions that count the number of records.
 */

function shuffle (v) {
  return [...v].sort(_ => Math.random() - .5).join('');
}

async function getBundleCount (user) {
  const result = await user.genericAction('getFioNames', { fioPublicKey: user.publicKey });
  return result.fio_addresses[0].remaining_bundled_tx;
}

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
});

describe(`************************** nft-performance-tests.js ************************** \n    A. Add a large number of users, mint and remove NFTs for all of them`, () => {
  let users = [];
  let user1Hash, endUserHash, massNft;
  let nftHash = 'f83b5702557b1ee76d966c6bf92ae0d038cd176aaf36f86a18e2ab59e6aefa4b';
  // let nftHash2 = 'f83b5702557b1ee76d966c6bf92ae0d038cd176aaf36f86a18e2ab59e6aefa4C';
  let ethContractAddr = '0x123456789ABCDEF';

  // let numUsers = 10000;
  // let numUsers = 5000;
  let numUsers = 1000;
  // let numUsers = 500;
  // let numUsers = 100;

  before(async () => {
    for (let i=0; i<numUsers; i++) {
      users[i] = await newUser(faucet);
      // await timeout(1500);    //2000);
    }
    console.log('test users created');

    //grab our user records from fionames so we can use their fio_address_hash
    let fionames = await callFioApi("get_table_rows", {
      json: true,               // Get the response as json
      code: 'fio.address',      // Contract that we target
      scope: 'fio.address',     // Account that owns the data
      table: 'fionames',        // Table name
      reverse: false,           // Optional: Get reversed data
      show_payer: false         // Optional: Show ram payer
    });
    fionames.rows = fionames.rows.slice(-numUsers);    // only need the last 3 accounts
    try {
      user1Hash = fionames.rows[0].namehash;
      endUserHash = fionames.rows[fionames.rows.length - 1].namehash;
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
            max_fee: config.api.add_nft.fee,
            actor: users[i].account,
            tpid: ""
          }
        });
        expect(result.status).to.equal('OK');
      } catch (err) {
        if (err.json.fields[0].err === 'FIO Domain not registered') {
          continue;
        }
        expect(err).to.equal(null);
      }
    }
    console.log('test NFTs minted');
  });

  it(`verify NFTs have been added to the table`, async () => {
    // try {
    const user1Nft = await callFioApi("get_table_rows", {
      code: "fio.address",
      scope: "fio.address",
      table: "nfts",
      key_type: "i128",
      index_position: "2",
      lower_bound: user1Hash,
      upper_bound: user1Hash,
      json: true,
      reverse: false
    });
    // expect(user1Nft.rows[0].token_id).to.equal('1');
    expect(user1Nft.rows.length).to.equal(1);
    expect(user1Nft.rows[0].fio_address_hash).to.equal(user1Hash);
    // } catch (err) {
    //   expect(err).to.equal(null);
    // }

    // try {
    const lastUserNft = await callFioApi("get_table_rows", {
      code: "fio.address",
      scope: "fio.address",
      table: "nfts",
      key_type: "i128",
      index_position: "2",
      lower_bound: endUserHash,
      upper_bound: endUserHash,
      json: true,
      reverse: false
    });
    // expect(lastUserNft.rows[0].token_id).to.equal(numUsers.toString());
    expect(lastUserNft.rows[0].fio_address_hash).to.equal(endUserHash);
    expect(lastUserNft.rows.length).to.equal(1);
    // } catch (err) {
    //   expect(err).to.equal(null);
    // }
  });

  it(`verify get_nfts_contract returns NFTs at ${ethContractAddr}`, async () => {
    try {
      const result = await callFioApi('get_nfts_contract', {
        chain_code: "ETH",
        contract_address: `${ethContractAddr}`
      });
      const rowpos = result.nfts.slice(0, numUsers);
      const rows = result.nfts.slice(-numUsers);

      expect(result.nfts.length).to.be.greaterThan(numUsers-1);
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it(`remove NFTs for all ${numUsers} users`, async () => {
    for (let i=0; i<users.length; i++) {
      try {
        const result = await users[i].sdk.genericAction('pushTransaction', {
          action: 'remallnfts',
          account: 'fio.address',
          data: {
            fio_address: users[i].address,
            max_fee: config.api.remove_all_nfts.fee,
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
        key_type: 'i128',
        index_position: '2'
      });
      expect(result.rows.length).to.be.greaterThan(numUsers-1);
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  after(async () => {
    while (true) {
      try {
        await timeout(1500);
        const result = await users[0].sdk.genericAction('pushTransaction', {
          action: 'burnnfts',
          account: 'fio.address',
          data: {
            actor: users[0].account,
          }
        });
        expect(result.status).to.equal('OK');
        // nftCount -= 50;
      } catch (err) {
        expect(err.json.fields[0].error).to.equal('Nothing to burn');
        // nftCount = 0;
        break;
      }
    }

    try {
      const result = await callFioApi("get_table_rows", {
        json: true,
        code: 'fio.address',
        scope: 'fio.address',
        table: 'nftburnq',
        lower_bound: user1Hash,
        upper_bound: endUserHash,
        key_type: 'i128',
        index_position: '2'
      });
      expect(result.rows.length).to.equal(0);
    } catch (err) {
      expect(err).to.equal(null);
    }
  });
});

describe(`B. Add and remove a huge number of NFTs for a single user`, () => {
  let user1, user2, user1Hash, massNft, bal, nftCount, initNftCount, newNftCount, randomEthAddr, randomNftHash;
  let nftHash = 'f83b5702557b1ee76d966c6bf92ae0d038cd176aaf36f86a18e2ab59e6aefa4b';
  let ethContractPrefix = '0x';
  let ethContractSuffix = '123456789ABCDEF';
  let ethContractAddr = '0x123456789ABCDEF';

  // let numNfts = 100000;
  // let numNfts = 10000;
  let numNfts = 5000;
  // let numNfts = 1000;
  // let numNfts = 500;
  // let numNfts = 100;

  const fundsAmount = config.api.add_nft.fee * (numNfts);
  const rmFundsAmt = config.api.remove_all_nfts.fee * (numNfts);

  before(async () => {
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
    let fionames = await callFioApi("get_table_rows", {
      json: true,               // Get the response as json
      code: 'fio.address',      // Contract that we target
      scope: 'fio.address',     // Account that owns the data
      table: 'fionames',        // Table name
      reverse: false,           // Optional: Get reversed data
      show_payer: false         // Optional: Show ram payer
    });
    fionames.rows = fionames.rows.slice(-2);
    try {
      expect(fionames.rows[0].name).to.equal(user1.address);
      user1Hash = fionames.rows[0].namehash;
    } catch (err) {
      console.log('user namehash not found in table');
      throw err;
    }
    // setting some random known values
    randomEthAddr = `${ethContractPrefix}${shuffle(ethContractSuffix)}`;
    randomNftHash = shuffle(nftHash);
  });

  it(`getFioBalance for user1`, async () => {
    bal = await user1.sdk.genericAction('getFioBalance', {});
  });

  it(`Transfer ${fundsAmount} FIO to user1 FIO public key`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: user1.publicKey,
      amount: fundsAmount,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    });
    expect(result).to.have.any.keys('status');
    expect(result).to.have.any.keys('fee_collected');
    expect(result).to.have.any.keys('block_num');
    expect(result).to.have.any.keys('transaction_id');
  });

  it(`getFioBalance for user1`, async () => {
    const result = await user1.sdk.genericAction('getFioBalance', {});
    expect(result.available).to.equal(bal.available + fundsAmount);
    bal = result;
  });

  it(`get bundles for user1`, async () => {
    const result = await getBundleCount(user1.sdk);
    expect(result).to.equal(100);
  });

  it(`get initial NFT count`, async () => {
    try {
      const result = await callFioApi("get_table_rows", {
        code: "fio.address",
        scope: "fio.address",
        table: "nfts",
        key_type: "i128",
        index_position: "2",
        lower_bound: user1Hash,
        upper_bound: user1Hash,
        limit: numNfts,
        json: true,
        reverse: true
      });
      initNftCount = result.rows.length;
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it(`add an NFT with a known hash and contract address for searching`, async () => {
    const result = await user1.sdk.genericAction('pushTransaction', {
      action: 'addnft',
      account: 'fio.address',
      data: {
        fio_address: user1.address,
        nfts: [{
          "chain_code":"ETH",
          "contract_address":randomEthAddr,
          "token_id":"1",
          "url":"http://fio.example.nft",
          "hash":randomNftHash,
          "metadata": "abc-xyz-123"
        }],
        max_fee: config.api.add_nft.fee,
        actor: user1.account,
        tpid: ''
      }
    });
    expect(result.status).to.equal('OK');
  });

  it(`try to mint ${numNfts} NFTs for user1, expect TBD`, async () => {
    nftCount = initNftCount + 1;
    while (nftCount < numNfts) {
      massNft = [{
        "chain_code":"ETH",
        "contract_address":`${ethContractAddr}`,
        "token_id":`${nftCount+1}`,
        "url":"http://fio.example.nft",
        "hash":`${nftHash}`,
        "metadata": "abc-xyz-123"
      }];

      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: massNft,
          max_fee: config.api.add_nft.fee,
          actor: user1.account,
          tpid: ''
        }
      });
      expect(result.status).to.equal('OK');
      nftCount += massNft.length;
      await timeout(300);
    }
    console.log('done minting');
  });

  it(`verify NFTs have been added to the table`, async () => {
    try {
      const result = await callFioApi("get_table_rows", {
        code: "fio.address",
        scope: "fio.address",
        table: "nfts",
        key_type: "i128",
        index_position: "2",
        lower_bound: user1Hash,
        upper_bound: user1Hash,
        limit: 100,
        json: true,
        reverse: true
      });
      expect(result.rows[0].token_id).to.equal(nftCount.toString());
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it(`call get_nfts_fio_address, expect endpoint to return new NFTs`, async () => {
    try {
      const result = await callFioApi('get_nfts_fio_address', {
        fio_address: user1.address,
        limit: 100,
      });
      console.log(result);
      // expect(result.nfts.length).to.equal(100);
    } catch (err) {
      expect(err).to.equal(null);
    }
  });
  it(`call get_nfts_hash, expect endpoint to return new NFTs`, async () => {
    try {
      const result = await callFioApi('get_nfts_hash', {
        hash: nftHash,
        limit: 100,
      });
      console.log(result);

    } catch (err) {
      expect(err).to.equal(null);
    }
  });
  it(`call get_nfts_contract, expect endpoint to return new NFTs`, async () => {
    try {
      const result = await callFioApi('get_nfts_contract', {
        contract_address: ethContractAddr,
        chain_code: "ETH",
        limit: 100,
      });
      console.log(result);

    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it(`verify get_nfts_hash returns an NFT with a unique hash`, async () => {
    try {
      const result = await callFioApi('get_nfts_hash', {
        hash: randomNftHash,
      });
      expect(result.nfts.length).to.equal(1);
      expect(result.nfts[0].hash).to.equal(randomNftHash);
    } catch (err) {
      expect(err).to.equal(null);
    }
  });
  it(`verify get_nfts_contract returns an NFT with a unique contract_address`, async () => {
    try {
      const result = await callFioApi('get_nfts_contract', {
        contract_address: randomEthAddr,
        chain_code: "ETH",
      });
      expect(result.nfts.length).to.equal(1);
      expect(result.nfts[0].contract_address).to.equal(randomEthAddr);
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
        limit: numNfts,
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
    expect(result).to.have.any.keys('status');
    expect(result).to.have.any.keys('fee_collected');
    expect(result).to.have.any.keys('block_num');
    expect(result).to.have.any.keys('transaction_id');
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
        table: 'nftburnq',
        limit: numNfts,
        lower_bound: user1Hash,
        upper_bound: user1Hash,
        key_type: 'i128',
        index_position: '2'
      });
      expect(result.rows.length).to.equal(1);
      expect(result.rows[0].fio_address_hash).to.equal(user1Hash);
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it(`user1 burns 50 NFTs in nftburnq`, async () => {
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

  // it(`verify 50 NFTs have been removed from the table`, async () => {
  //   try {
  //     const result = await callFioApi("get_table_rows", {
  //       code: "fio.address",
  //       scope: "fio.address",
  //       table: "nfts",
  //       key_type: "i128",
  //       index_position: "2",
  //       lower_bound: user1Hash,
  //       upper_bound: user1Hash,
  //       limit: numNfts,
  //       json: true,
  //       reverse: false
  //     });
  //     let tokenId = nftCount - 50;
  //     expect(result.rows[0].token_id).to.equal(`${tokenId + 1}`);
  //
  //   } catch (err) {
  //     expect(err).to.equal(null);
  //   }
  // });

  it(`user1 burns the rest of their NFTs`, async () => {
    while (true) {
      try {
        await timeout(1500);
        const result = await user1.sdk.genericAction('pushTransaction', {
          action: 'burnnfts',
          account: 'fio.address',
          data: {
            actor: user1.account,
          }
        });
        expect(result.status).to.equal('OK');
        nftCount -= 50;
      } catch (err) {
        if (err.json.fields[0].error === 'Nothing to burn') {
          nftCount = 0;
          break;
        }
        expect(err).to.equal(null);
      }
    }
  });

  it(`verify NFTs have been removed from the table`, async () => {
    try {
      const result = await callFioApi("get_table_rows", {
        code: "fio.address",
        scope: "fio.address",
        table: "nfts",
        key_type: "i128",
        index_position: "2",
        lower_bound: user1Hash,
        upper_bound: user1Hash,
        limit: numNfts,
        json: true,
        reverse: false
      });
      expect(result.rows.length).to.equal(initNftCount)
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
        limit: numNfts,
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
  it(`verify get_nfts_fio_address returns zero NFTs`, async () => {
    try {
      const result = await callFioApi('get_nfts_fio_address', {
        fio_address: user1.address,
        limit: numNfts
      });
      expect(result.nfts.length).to.equal(0);
    } catch (err) {
      expect(err).to.have.all.keys('name', 'statusCode', 'message', 'error', 'options', 'response');
      expect(err.statusCode).to.equal(404);
      expect(err.message).to.equal('404 - {"message":"No NFTS are mapped"}');
    }
  });
  it(`verify get_nfts_hash returns zero NFTs`, async () => {
    try {
      const result = await callFioApi('get_nfts_hash', {
        hash: nftHash,
        limit: numNfts
      });
      expect(result.nfts.length).to.equal(0);
    } catch (err) {
      expect(err).to.have.all.keys('name', 'statusCode', 'message', 'error', 'options', 'response');
      expect(err.statusCode).to.equal(404);
      expect(err.message).to.equal('404 - {"message":"No NFTS are mapped"}');
    }
  });
  it(`verify get_nfts_contract returns zero NFTs`, async () => {
    try {
      const result = await callFioApi('get_nfts_contract', {
        contract_address: ethContractAddr,
        chain_code: "ETH",
        limit: numNfts
      });
      expect(result.nfts.length).to.equal(0);
    } catch (err) {
      expect(err).to.have.all.keys('name', 'statusCode', 'message', 'error', 'options', 'response');
      expect(err.statusCode).to.equal(404);
      expect(err.message).to.equal('404 - {"message":"No NFTS are mapped"}');
    }
  });
});

describe(`C. Try to individually remove a large number of NFTs`, () => {
  let user1, user2, user1Hash, massNft, bal, nftCount, initNftCount, newNftCount;
  let nftHash = 'f83b5702557b1ee76d966c6bf92ae0d038cd176aaf36f86a18e2ab59e6aefa4b';
  let ethContractAddr = '0x123456789ABCDEF';

  // let numNfts = 100000;
  // let numNfts = 10000;
  let numNfts = 5000;
  // let numNfts = 1000;
  // let numNfts = 500;
  // let numNfts = 100;

  const fundsAmount = config.api.add_nft.fee * (numNfts);
  const rmFundsAmt = config.api.remove_nft.fee * (numNfts);

  before(async () => {
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
    let fionames = await callFioApi("get_table_rows", {
      json: true,               // Get the response as json
      code: 'fio.address',      // Contract that we target
      scope: 'fio.address',     // Account that owns the data
      table: 'fionames',        // Table name
      reverse: false,           // Optional: Get reversed data
      show_payer: false         // Optional: Show ram payer
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

  it(`Transfer ${fundsAmount} FIO to user1 FIO public key`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: user1.publicKey,
      amount: fundsAmount,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    });
    expect(result).to.have.any.keys('status');
    expect(result).to.have.any.keys('fee_collected');
    expect(result).to.have.any.keys('block_num');
    expect(result).to.have.any.keys('transaction_id');
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

  it(`get initial NFT count`, async () => {
    try {
      const result = await callFioApi("get_table_rows", {
        code: "fio.address",
        scope: "fio.address",
        table: "nfts",
        index_position: "1",
        json: true,
        reverse: false
      });
      initNftCount = result.rows.length;
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it(`try to mint ${numNfts} NFTs for user1`, async () => {
    nftCount = 0;
    while (nftCount < numNfts) {
      massNft = [{
        "chain_code":"ETH",
        "contract_address":`${ethContractAddr}`,
        "token_id":`${nftCount+1}`,
        "url":"http://fio.example.nft",
        "hash":`${nftHash}`,
        "metadata": "abc-xyz-123"
      }];

      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: massNft,
          max_fee: config.api.add_nft.fee,
          actor: user1.account,
          tpid: ''
        }
      });
      expect(result.status).to.equal('OK');
      nftCount += massNft.length;
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
      newNftCount = result.rows.length;
      // expect(newNftCount - initNftCount).to.equal(nftCount);
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
    expect(result).to.have.any.keys('status');
    expect(result).to.have.any.keys('fee_collected');
    expect(result).to.have.any.keys('block_num');
    expect(result).to.have.any.keys('transaction_id');
  });

  it(`user1 individually removes all NFTs`, async () => {
    while (nftCount > 0) {
      massNft = [{
        "chain_code":"ETH",
        "contract_address":`${ethContractAddr}`,
        "token_id":`${nftCount}`,
        "url":"http://fio.example.nft",
        "hash":`${nftHash}`,
        "metadata": "abc-xyz-123"
      }];

      try {
        const result = await user1.sdk.genericAction('pushTransaction', {
          action: 'remnft',
          account: 'fio.address',
          data: {
            fio_address: user1.address,
            nfts: massNft,
            max_fee: config.api.remove_nft.fee,
            actor: user1.account,
            tpid: ""
          }
        });
        expect(result.status).to.equal('OK');
        nftCount -= 1;
      } catch (err) {
        expect(err).to.equal(null);
      }
    }
  });

  it(`verify NFTs have been removed from the table`, async () => {
    try {
      const result = await callFioApi("get_table_rows", {
        code: "fio.address",
        scope: "fio.address",
        table: "nfts",
        index_position: "1",
        json: true,
        reverse: false
      });
      expect(result.rows.length).to.equal(initNftCount)
    } catch (err) {
      expect(err).to.equal(null);
    }
  });
});

describe.skip(`D. Add a large number of users with NFT signatures then test getters`, () => {
  let users = [];
  let user1Hash, endUserHash, massNft;
  let nftHash = 'f83b5702557b1ee76d966c6bf92ae0d038cd176aaf36f86a18e2ab59e6aefa4b';
  let ethContractAddr = '0x123456789ABCDEF';

  // let numUsers = 10000;
  // let numUsers = 5000;
  //let numUsers = 1000;
  // let numUsers = 500;
  let numUsers = 100;

  before(async () => {
    for (let i=0; i<numUsers; i++) {
      users[i] = await newUser(faucet);
      console.log(users[i].account);
      console.log(users[i].publicKey);
      console.log(users[i].privateKey);
      console.log(users[i].address);
      // await timeout(1500);    //2000);
    }
    console.log('test users created');

    //grab our user records from fionames so we can use their fio_address_hash
    let fionames = await callFioApi("get_table_rows", {
      json: true,               // Get the response as json
      code: 'fio.address',      // Contract that we target
      scope: 'fio.address',     // Account that owns the data
      table: 'fionames',        // Table name
      reverse: false,           // Optional: Get reversed data
      show_payer: false         // Optional: Show ram payer
    });
    fionames.rows = fionames.rows.slice(-numUsers);    // only need the last 3 accounts
    try {
      user1Hash = fionames.rows[0].namehash;
      endUserHash = fionames.rows[fionames.rows.length - 1].namehash;
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
            max_fee: config.api.add_nft.fee,
            actor: users[i].account,
            tpid: ""
          }
        });
        console.log(result)
        expect(result.status).to.equal('OK');
      } catch (err) {
        if (err.json.fields[0].err === 'FIO Domain not registered') {
          continue;
        }
        expect(err).to.equal(null);
      }
    }
    console.log('test NFTs minted');
  });

  it(`verify NFTs have been added to the table`, async () => {
    // try {
    const user1Nft = await callFioApi("get_table_rows", {
      code: "fio.address",
      scope: "fio.address",
      table: "nfts",
      key_type: "i128",
      index_position: "2",
      lower_bound: user1Hash,
      upper_bound: user1Hash,
      json: true,
      reverse: false
    });
    console.log('user1Nft: ', user1Nft);
    // expect(user1Nft.rows[0].token_id).to.equal('1');
    expect(user1Nft.rows.length).to.equal(1);
    expect(user1Nft.rows[0].fio_address_hash).to.equal(user1Hash);
    // } catch (err) {
    //   expect(err).to.equal(null);
    // }

    // try {
    const lastUserNft = await callFioApi("get_table_rows", {
      code: "fio.address",
      scope: "fio.address",
      table: "nfts",
      key_type: "i128",
      index_position: "2",
      lower_bound: endUserHash,
      upper_bound: endUserHash,
      json: true,
      reverse: false
    });
    // expect(lastUserNft.rows[0].token_id).to.equal(numUsers.toString());
    expect(lastUserNft.rows[0].fio_address_hash).to.equal(endUserHash);
    expect(lastUserNft.rows.length).to.equal(1);
    // } catch (err) {
    //   expect(err).to.equal(null);
    // }
  });

  it(`verify get_nfts_contract returns all NFTs at ${ethContractAddr} (call without ID)`, async () => {
    try {
      const result = await callFioApi('get_nfts_contract', {
        chain_code: "ETH",
        contract_address: `${ethContractAddr}`
      });
      const rowpos = result.nfts.slice(0, numUsers);
      const rows = result.nfts.slice(-numUsers);

      expect(result.nfts.length).to.be.greaterThan(numUsers-1);
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it(`verify get_nfts_contract returns NFT for ID ${numUsers}`, async () => {
    try {
      const result = await callFioApi('get_nfts_contract', {
        chain_code: "ETH",
        contract_address: `${ethContractAddr}`,
        token_id: numUsers
      });
      console.log('Result: ', result);
      expect(result.nfts.length).to.be.greaterThan(numUsers-1);
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it.skip(`remove NFTs for all ${numUsers} users`, async () => {
    for (let i=0; i<users.length; i++) {
      try {
        const result = await users[i].sdk.genericAction('pushTransaction', {
          action: 'remallnfts',
          account: 'fio.address',
          data: {
            fio_address: users[i].address,
            max_fee: config.api.remove_all_nfts.fee,
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

  it.skip(`verify NFTs added to nftburnq`, async () => {
    try {
      const result = await callFioApi("get_table_rows", {
        json: true,
        code: 'fio.address',
        scope: 'fio.address',
        table: 'nftburnq',
        key_type: 'i128',
        index_position: '2'
      });
      expect(result.rows.length).to.be.greaterThan(numUsers-1);
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  after(async () => {
    while (true) {
      try {
        await timeout(1500);
        const result = await users[0].sdk.genericAction('pushTransaction', {
          action: 'burnnfts',
          account: 'fio.address',
          data: {
            actor: users[0].account,
          }
        });
        expect(result.status).to.equal('OK');
        // nftCount -= 50;
      } catch (err) {
        expect(err.json.fields[0].error).to.equal('Nothing to burn');
        // nftCount = 0;
        break;
      }
    }

    try {
      const result = await callFioApi("get_table_rows", {
        json: true,
        code: 'fio.address',
        scope: 'fio.address',
        table: 'nftburnq',
        lower_bound: user1Hash,
        upper_bound: endUserHash,
        key_type: 'i128',
        index_position: '2'
      });
      expect(result.rows.length).to.equal(0);
    } catch (err) {
      expect(err).to.equal(null);
    }
  });
});
