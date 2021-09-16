const {expect} = require("chai");
const {newUser, callFioApi, fetchJson} = require("../utils.js");
const {FIOSDK} = require("@fioprotocol/fiosdk");
const config = require('../config.js');
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

//the other NFT file was getting too out of hand
describe(`************************** nft-remove-burn.js ************************** \n    A. Add all NFTs to nftburnq at once using remallnfts`, () => {
  let user1, user2, user3;
  let feeAmt = 100000000;
  let user1Hash, user2Hash;

  const fundsAmount = 10000000000000;

  before(async () => {
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
    user3 = await newUser(faucet);

    //grab our user records from fionames so we can use their fio_address_hash
    let fionames = await callFioApi("get_table_rows", {
      json: true,               // Get the response as json
      code: 'fio.address',      // Contract that we target
      scope: 'fio.address',         // Account that owns the data
      table: 'fionames',        // Table name
      limit: 1000,                // Maximum number of rows that we want to get
      reverse: false,           // Optional: Get reversed data
      show_payer: false          // Optional: Show ram payer
    });
    fionames.rows = fionames.rows.slice(-3);    // only need the last 3 accounts
    try {
      user1Hash = fionames.rows[0].namehash
      user2Hash = fionames.rows[1].namehash
    } catch (err) {
      console.log('user namehash not found in table');
      throw err;
    }

    await user1.sdk.genericAction('pushTransaction', {
      action: 'addnft',
      account: 'fio.address',
      data: {
        fio_address: user1.address,
        nfts: mintNfts(3),
        max_fee: 5000000000,
        actor: user1.account,
        tpid: ""
      }
    });
    await user2.sdk.genericAction('pushTransaction', {
      action: 'addnft',
      account: 'fio.address',
      data: {
        fio_address: user2.address,
        nfts: mintNfts(3),
        max_fee: 5000000000,
        actor: user2.account,
        tpid: ""
      }
    });

    //verify user1 and user2 NFTs are present in table
    const user1Nfts = await callFioApi("get_nfts_fio_address", {
      "fio_address": user1.address
    });

    const user2Nfts = await callFioApi("get_nfts_fio_address", {
      "fio_address": user2.address
    });
    expect(user1Nfts.nfts.length).to.not.equal(0);
    expect(user1Nfts.nfts[0].chain_code).to.equal("ETH");
    expect(user1Nfts.nfts[0].contract_address).to.equal("0x123456789ABCDEF");
    expect(user1Nfts.nfts[0].token_id).to.equal("1");
    expect(user1Nfts.nfts[1].chain_code).to.equal("ETH");
    expect(user1Nfts.nfts[1].contract_address).to.equal("0x123456789ABCDEF");
    expect(user1Nfts.nfts[1].token_id).to.equal("2");
    expect(user1Nfts.nfts[2].chain_code).to.equal("ETH");
    expect(user1Nfts.nfts[2].contract_address).to.equal("0x123456789ABCDEF");
    expect(user1Nfts.nfts[2].token_id).to.equal("3");

    expect(user2Nfts.nfts.length).to.not.equal(0);
    expect(user2Nfts.nfts[0].chain_code).to.equal("ETH");
    expect(user2Nfts.nfts[0].contract_address).to.equal("0x123456789ABCDEF");
    expect(user2Nfts.nfts[0].token_id).to.equal("1");
    expect(user2Nfts.nfts[1].chain_code).to.equal("ETH");
    expect(user2Nfts.nfts[1].contract_address).to.equal("0x123456789ABCDEF");
    expect(user2Nfts.nfts[1].token_id).to.equal("2");
    expect(user2Nfts.nfts[2].chain_code).to.equal("ETH");
    expect(user2Nfts.nfts[2].contract_address).to.equal("0x123456789ABCDEF");
    expect(user2Nfts.nfts[2].token_id).to.equal("3");
  });

  it(`user1 removes all 3 NFTs`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remallnfts',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      });
      expect(result.status).to.equal('OK');
      expect(result.fee_collected).to.equal(0);
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it(`verify a hash of user1.address added to nftburnq`, async () => {
    try {
      const result = await callFioApi("get_table_rows", {
        json: true,
        code: 'fio.address',
        scope: 'fio.address',
        table: 'nftburnq',
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

  it(`consume user2's remaining bundled transactions`, async () => {
    try {
      await consumeRemainingBundles(user2, user3);
    } catch (err) {
      expect(err).to.equal(null);
    } finally {
      let bundleCount = await getBundleCount(user2.sdk);
      expect(bundleCount).to.equal(0);
    }
  });

  it(`user2 removes all 3 NFTs, expect status=OK and fee_collected=${feeAmt}`, async () => {
    const result = await user2.sdk.genericAction('pushTransaction', {
      action: 'remallnfts',
      account: 'fio.address',
      data: {
        fio_address: user2.address,
        max_fee: feeAmt,
        actor: user2.account,
        tpid: ""
      }
    });
    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(feeAmt);
  });

  it(`verify a hash of user2.address added to nftburnq`, async () => {
    try {
      const result = await callFioApi("get_table_rows", {
        json: true,
        code: 'fio.address',
        scope: 'fio.address',
        table: 'nftburnq',
        lower_bound: user2Hash,
        upper_bound: user2Hash,
        key_type: 'i128',
        index_position: '2'
      });
      expect(result.rows.length).to.equal(1);
    } catch (err) {
      expect(err).to.equal(null);
    }
  });
});

describe(`B. (unhappy) Try to add all NFTs to nftburnq with invalid user input`, () => {
  let user1, user2, user3;
  let feeAmt = 100000000;
  const fundsAmount = 10000000000000;

  before(async () => {
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
    user3 = await newUser(faucet);
    await user1.sdk.genericAction('pushTransaction', {
      action: 'addnft',
      account: 'fio.address',
      data: {
        fio_address: user1.address,
        nfts: mintNfts(3),
        max_fee: 5000000000,
        actor: user1.account,
        tpid: ""
      }
    });

    await user2.sdk.genericAction('pushTransaction', {
      action: 'addnft',
      account: 'fio.address',
      data: {
        fio_address: user2.address,
        nfts: mintNfts(3),
        max_fee: 5000000000,
        actor: user2.account,
        tpid: ""
      }
    });

    //verify user1 and user2 NFTs are present in table
    const user1Nfts = await callFioApi("get_nfts_fio_address", {
      "fio_address": user1.address
    });

    const user2Nfts = await callFioApi("get_nfts_fio_address", {
      "fio_address": user2.address
    });
    expect(user1Nfts.nfts.length).to.not.equal(0);
    expect(user1Nfts.nfts[0].chain_code).to.equal("ETH");
    expect(user1Nfts.nfts[0].contract_address).to.equal("0x123456789ABCDEF");
    expect(user1Nfts.nfts[0].token_id).to.equal("1");
    expect(user1Nfts.nfts[1].chain_code).to.equal("ETH");
    expect(user1Nfts.nfts[1].contract_address).to.equal("0x123456789ABCDEF");
    expect(user1Nfts.nfts[1].token_id).to.equal("2");
    expect(user1Nfts.nfts[2].chain_code).to.equal("ETH");
    expect(user1Nfts.nfts[2].contract_address).to.equal("0x123456789ABCDEF");
    expect(user1Nfts.nfts[2].token_id).to.equal("3");

    expect(user2Nfts.nfts.length).to.not.equal(0);
    expect(user2Nfts.nfts[0].chain_code).to.equal("ETH");
    expect(user2Nfts.nfts[0].contract_address).to.equal("0x123456789ABCDEF");
    expect(user2Nfts.nfts[0].token_id).to.equal("1");
    expect(user2Nfts.nfts[1].chain_code).to.equal("ETH");
    expect(user2Nfts.nfts[1].contract_address).to.equal("0x123456789ABCDEF");
    expect(user2Nfts.nfts[1].token_id).to.equal("2");
    expect(user2Nfts.nfts[2].chain_code).to.equal("ETH");
    expect(user2Nfts.nfts[2].contract_address).to.equal("0x123456789ABCDEF");
    expect(user2Nfts.nfts[2].token_id).to.equal("3");
  });

  it(`(invalid fio_address) try to remove all 3 NFTs, expect error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remallnfts',
        account: 'fio.address',
        data: {
          fio_address: "invalid@address",
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.errorCode).to.equal(404);
      expect(err.json.fields[0].error).to.equal('Invalid FIO Address');
    }
  });
  it(`(empty fio_address) try to remove all 3 NFTs, expect error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remallnfts',
        account: 'fio.address',
        data: {
          fio_address: "",
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].error).to.equal('Invalid FIO Address');
    }
  });
  it(`(missing fio_address) try to remove all 3 NFTs, expect error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remallnfts',
        account: 'fio.address',
        data: {
          // fio_address: user1.address,
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('missing remallnfts.fio_address (type=string)');
    }
  });
  it(`(integer fio_address) try to remove all 3 NFTs, expect error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remallnfts',
        account: 'fio.address',
        data: {
          fio_address: 98737889500,
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].error).to.equal('Invalid FIO Address');
    }
  });
  it(`(negative fio_address) try to remove all 3 NFTs, expect error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remallnfts',
        account: 'fio.address',
        data: {
          fio_address: -100,
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].error).to.equal('Invalid FIO Address');
    }
  });

  it(`verify user1 NFTs are still present in table`, async () => {
    const json = {
      "fio_address": user1.address
    }
    try {
      const result = await callFioApi("get_nfts_fio_address", json);
      expect(result.nfts.length).to.not.equal(0);
      expect(result.nfts[0].chain_code).to.equal("ETH");
      expect(result.nfts[0].contract_address).to.equal("0x123456789ABCDEF");
      expect(result.nfts[0].token_id).to.equal("1");
      expect(result.nfts[1].chain_code).to.equal("ETH");
      expect(result.nfts[1].contract_address).to.equal("0x123456789ABCDEF");
      expect(result.nfts[1].token_id).to.equal("2");
      expect(result.nfts[2].chain_code).to.equal("ETH");
      expect(result.nfts[2].contract_address).to.equal("0x123456789ABCDEF");
      expect(result.nfts[2].token_id).to.equal("3");
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it(`(invalid max_fee) try to remove all 3 NFTs, expect error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remallnfts',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          max_fee: "invalid-fee",
          actor: user1.account,
          tpid: ""
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('invalid number');
    }
  });
  it(`(missing max_fee) try to remove all 3 NFTs, expect error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remallnfts',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          // max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('missing remallnfts.max_fee (type=int64)');
    }
  });
  it(`(negative max_fee) try to remove all 3 NFTs, expect error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remallnfts',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          max_fee: -5000000000,
          actor: user1.account,
          tpid: ""
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].error).to.equal('Invalid fee value');
    }
  });

  it(`verify user1 NFTs are still present in table`, async () => {
    const json = {
      "fio_address": user1.address
    }
    try {
      const result = await callFioApi("get_nfts_fio_address", json);
      expect(result.nfts.length).to.not.equal(0);
      expect(result.nfts[0].chain_code).to.equal("ETH");
      expect(result.nfts[0].contract_address).to.equal("0x123456789ABCDEF");
      expect(result.nfts[0].token_id).to.equal("1");
      expect(result.nfts[1].chain_code).to.equal("ETH");
      expect(result.nfts[1].contract_address).to.equal("0x123456789ABCDEF");
      expect(result.nfts[1].token_id).to.equal("2");
      expect(result.nfts[2].chain_code).to.equal("ETH");
      expect(result.nfts[2].contract_address).to.equal("0x123456789ABCDEF");
      expect(result.nfts[2].token_id).to.equal("3");
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  // BUG
  it.skip(`(invalid actor) try to remove all 3 NFTs, expect error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remallnfts',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          max_fee: 5000000000,
          actor: "invalidACtor1@",
          tpid: ""
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it.skip(`(empty actor) try to remove all 3 NFTs, expect error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remallnfts',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          max_fee: 5000000000,
          actor: "",
          tpid: ""
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it.skip(`(missing actor) try to remove all 3 NFTs, expect error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remallnfts',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          max_fee: 5000000000,
          // actor: user1.account,
          tpid: ""
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err).to.equal(null);
    }
  });
  it.skip(`(integer actor) try to remove all 3 NFTs, expect error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remallnfts',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          max_fee: 5000000000,
          actor: 98737889500,
          tpid: ""
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err).to.equal(null);
    }
  });
  it.skip(`(negative actor) try to remove all 3 NFTs, expect error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remallnfts',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          max_fee: 5000000000,
          actor: -100,
          tpid: ""
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err).to.equal(null);
    }
  });
  it.skip(`verify user1 NFTs are still present in table`, async () => {
    const json = {
      "fio_address": user1.address
    }
    try {
      const result = await callFioApi("get_nfts_fio_address", json);
      expect(result.nfts.length).to.not.equal(0);
      expect(result.nfts[0].chain_code).to.equal("ETH");
      expect(result.nfts[0].contract_address).to.equal("0x123456789ABCDEF");
      expect(result.nfts[0].token_id).to.equal("1");
      expect(result.nfts[1].chain_code).to.equal("ETH");
      expect(result.nfts[1].contract_address).to.equal("0x123456789ABCDEF");
      expect(result.nfts[1].token_id).to.equal("2");
      expect(result.nfts[2].chain_code).to.equal("ETH");
      expect(result.nfts[2].contract_address).to.equal("0x123456789ABCDEF");
      expect(result.nfts[2].token_id).to.equal("3");
    } catch (err) {
      expect(err).to.equal(null);
    }
  });
});

describe(`C. Transfer a FIO address to another user and make sure any NFTs get added to nftburnq`, () => {
  let user1, user2, user3;
  let user1Hash, user2Hash;
  let burnqnum, newBurnqnum = 0;

  const fundsAmount = 10000000000000;
  const user1Nfts = mintNfts(3);

  before(async () => {
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
    user3 = await newUser(faucet);
    const nft = await user1.sdk.genericAction('pushTransaction', {
      action: 'addnft',
      account: 'fio.address',
      data: {
        fio_address: user1.address,
        nfts: user1Nfts,
        max_fee: 5000000000,
        actor: user1.account,
        tpid: ""
      }
    })
    expect(nft.status).to.equal('OK');
    //grab our user records from fionames so we can use their fio_address_hash
    let fionames = await callFioApi("get_table_rows", {
      json: true,               // Get the response as json
      code: 'fio.address',      // Contract that we target
      scope: 'fio.address',         // Account that owns the data
      table: 'fionames',        // Table name
      limit: 1000,                // Maximum number of rows that we want to get
      reverse: false,           // Optional: Get reversed data
      show_payer: false          // Optional: Show ram payer
    });
    fionames.rows = fionames.rows.slice(-3);    // only need the last 3 accounts
    try {
      user1Hash = fionames.rows[0].namehash
      user2Hash = fionames.rows[1].namehash
    } catch (err) {
      console.log('user namehash not found in table');
      throw err;
    }
  });

  it(`verify user1 NFTs are present in table`, async () => {
    try {
      const result = await callFioApi("get_nfts_fio_address", {
        "fio_address": user1.address
      });
      expect(result.nfts.length).to.not.equal(0);
      expect(result.nfts[0].chain_code).to.equal("ETH");
      expect(result.nfts[0].contract_address).to.equal("0x123456789ABCDEF");
      expect(result.nfts[0].token_id).to.equal("1");
      expect(result.nfts[1].chain_code).to.equal("ETH");
      expect(result.nfts[1].contract_address).to.equal("0x123456789ABCDEF");
      expect(result.nfts[1].token_id).to.equal("2");
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it(`verify user1 NFTs not yet added to nftburnq`, async () => {
    try {
      const result = await callFioApi("get_table_rows", {
        json: true,
        code: 'fio.address',
        scope: 'fio.address',
        table: 'nftburnq',
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

  it(`user1 transfers FIO address to user2, expect NFTs to get added to nftburnq`, async () => {
    try {
      const result = await user1.sdk.genericAction('transferFioAddress', {
        fioAddress: user1.address,
        newOwnerKey: user2.publicKey,
        maxFee: config.api.transfer_fio_address.fee,  // transfer_fio_address_fee,
        technologyProviderId: ''
      })
      const feeCollected = result.fee_collected;
      expect(feeCollected).to.equal(config.api.transfer_fio_address.fee);
      expect(result.status).to.equal('OK');
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it(`verify a hash of user1.address added to nftburnq`, async () => {
    try {
      const result = await callFioApi("get_table_rows", {
        json: true,
        code: 'fio.address',
        scope: 'fio.address',
        table: 'nftburnq',
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
});

describe(`D. Burn a FIO address and make sure any NFTS also get added to nftburnq`, () => {
  let user1, user2, user3;
  let user1Hash, user2Hash;
  let burnqnum, newBurnqnum = 0;

  const fundsAmount = 10000000000000;
  const user1Nfts = mintNfts(3);

  before(async () => {
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
    user3 = await newUser(faucet);
    const nft = await user1.sdk.genericAction('pushTransaction', {
      action: 'addnft',
      account: 'fio.address',
      data: {
        fio_address: user1.address,
        nfts: user1Nfts,
        max_fee: 5000000000,
        actor: user1.account,
        tpid: ""
      }
    })
    expect(nft.status).to.equal('OK');
    //grab our user records from fionames so we can use their fio_address_hash
    let fionames = await callFioApi("get_table_rows", {
      json: true,               // Get the response as json
      code: 'fio.address',      // Contract that we target
      scope: 'fio.address',         // Account that owns the data
      table: 'fionames',        // Table name
      limit: 1000,                // Maximum number of rows that we want to get
      reverse: false,           // Optional: Get reversed data
      show_payer: false          // Optional: Show ram payer
    });
    fionames.rows = fionames.rows.slice(-3);    // only need the last 3 accounts
    try {
      user1Hash = fionames.rows[0].namehash
      user2Hash = fionames.rows[1].namehash
    } catch (err) {
      console.log('user namehash not found in table');
      throw err;
    }
  });

  it(`verify user1 NFTs are present in table`, async () => {
    try {
      const result = await callFioApi("get_nfts_fio_address", {
        "fio_address": user1.address
      });
      expect(result.nfts.length).to.not.equal(0);
      expect(result.nfts[0].chain_code).to.equal("ETH");
      expect(result.nfts[0].contract_address).to.equal("0x123456789ABCDEF");
      expect(result.nfts[0].token_id).to.equal("1");
      expect(result.nfts[1].chain_code).to.equal("ETH");
      expect(result.nfts[1].contract_address).to.equal("0x123456789ABCDEF");
      expect(result.nfts[1].token_id).to.equal("2");
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it(`verify user1 NFTs not yet added to nftburnq`, async () => {
    try {
      const result = await callFioApi("get_table_rows", {
        json: true,
        code: 'fio.address',
        scope: 'fio.address',
        table: 'nftburnq',
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
});

describe.skip(`E. Burn an expired FIO address and make sure any NFTS also get added to nftburnq`, () => {
  let user1, user2, user3;
  let user1Hash, user2Hash;
  let burnqnum, newBurnqnum = 0;

  const fundsAmount = 10000000000000;
  const user1Nfts = mintNfts(3);

  before(async () => {
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
    user3 = await newUser(faucet);
    const nft = await user1.sdk.genericAction('pushTransaction', {
      action: 'addnft',
      account: 'fio.address',
      data: {
        fio_address: user1.address,
        nfts: user1Nfts,
        max_fee: 5000000000,
        actor: user1.account,
        tpid: ""
      }
    })
    expect(nft.status).to.equal('OK');
    //grab our user records from fionames so we can use their fio_address_hash
    let fionames = await callFioApi("get_table_rows", {
      json: true,               // Get the response as json
      code: 'fio.address',      // Contract that we target
      scope: 'fio.address',         // Account that owns the data
      table: 'fionames',        // Table name
      limit: 1000,                // Maximum number of rows that we want to get
      reverse: false,           // Optional: Get reversed data
      show_payer: false          // Optional: Show ram payer
    });
    fionames.rows = fionames.rows.slice(-3);    // only need the last 3 accounts
    try {
      user1Hash = fionames.rows[0].namehash
      user2Hash = fionames.rows[1].namehash
    } catch (err) {
      console.log('user namehash not found in table');
      throw err;
    }
  });

  // need to find a way to make the fio address expire

  it(`verify user1 NFTs are present in table`, async () => {
    try {
      const result = await callFioApi("get_nfts_fio_address", {
        "fio_address": user1.address
      });
      expect(result.nfts.length).to.not.equal(0);
      expect(result.nfts[0].chain_code).to.equal("ETH");
      expect(result.nfts[0].contract_address).to.equal("0x123456789ABCDEF");
      expect(result.nfts[0].token_id).to.equal("1");
      expect(result.nfts[1].chain_code).to.equal("ETH");
      expect(result.nfts[1].contract_address).to.equal("0x123456789ABCDEF");
      expect(result.nfts[1].token_id).to.equal("2");
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it(`verify user1 NFTs not yet added to nftburnq`, async () => {
    try {
      const result = await callFioApi("get_table_rows", {
        json: true,
        code: 'fio.address',
        scope: 'fio.address',
        table: 'nftburnq',
        lower_bound: user1Hash,
        upper_bound: user1Hash,
        key_type: 'i128',
        index_position: '2'
      });
      // burnqnum = result.rows.length;
      expect(result.rows.length).to.equal(0);
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  //and then its burnin time!



});

describe(`F. Burn all NFTs in nftburnq`, () => {
  let user1, user2, user3;
  let user1Hash, user2Hash, user3Hash;
  let burnqnum, newBurnqnum = 0;

  const fundsAmount = 10000000000000;
  const user3Nfts = mintNfts(5);

  before(async () => {
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
    user3 = await newUser(faucet);
    await user1.sdk.genericAction('pushTransaction', {
      action: 'addnft',
      account: 'fio.address',
      data: {
        fio_address: user1.address,
        nfts: mintNfts(3),
        max_fee: 5000000000,
        actor: user1.account,
        tpid: ""
      }
    });
    await user2.sdk.genericAction('pushTransaction', {
      action: 'addnft',
      account: 'fio.address',
      data: {
        fio_address: user2.address,
        nfts: mintNfts(1),
        max_fee: 5000000000,
        actor: user2.account,
        tpid: ""
      }
    });
    await user3.sdk.genericAction('pushTransaction', {
      action: 'addnft',
      account: 'fio.address',
      data: {
        fio_address: user3.address,
        nfts: user3Nfts.slice(0, 3),
        max_fee: 5000000000,
        actor: user3.account,
        tpid: ""
      }
    });
    await user3.sdk.genericAction('pushTransaction', {
      action: 'addnft',
      account: 'fio.address',
      data: {
        fio_address: user3.address,
        nfts: user3Nfts.slice(-2),
        max_fee: 5000000000,
        actor: user3.account,
        tpid: ""
      }
    });

    //grab our user records from fionames so we can use their fio_address_hash
    let fionames = await callFioApi("get_table_rows", {
      json: true,               // Get the response as json
      code: 'fio.address',      // Contract that we target
      scope: 'fio.address',         // Account that owns the data
      table: 'fionames',        // Table name
      limit: 1000,                // Maximum number of rows that we want to get
      reverse: false,           // Optional: Get reversed data
      show_payer: false          // Optional: Show ram payer
    });
    fionames.rows = fionames.rows.slice(-3);    // only need the last 3 accounts
    try {
      user1Hash = fionames.rows[0].namehash;
      user2Hash = fionames.rows[1].namehash;
      user3Hash = fionames.rows[2].namehash;
    } catch (err) {
      console.log('user namehash not found in table');
      throw err;
    }
  });

  it(`verify user1 NFTs are present in table`, async () => {
    try {
      const result = await callFioApi("get_nfts_fio_address", {
        "fio_address": user1.address
      });
      expect(result.nfts.length).to.equal(3);
      expect(result.nfts[0].chain_code).to.equal("ETH");
      expect(result.nfts[0].contract_address).to.equal("0x123456789ABCDEF");
      expect(result.nfts[0].token_id).to.equal("1");
      expect(result.nfts[1].chain_code).to.equal("ETH");
      expect(result.nfts[1].contract_address).to.equal("0x123456789ABCDEF");
      expect(result.nfts[1].token_id).to.equal("2");
      expect(result.nfts[2].chain_code).to.equal("ETH");
      expect(result.nfts[2].contract_address).to.equal("0x123456789ABCDEF");
      expect(result.nfts[2].token_id).to.equal("3");
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it(`verify user2 NFTs are present in table`, async () => {
    try {
      const result = await callFioApi("get_nfts_fio_address", {
        "fio_address": user2.address
      });
      expect(result.nfts.length).to.equal(1);
      expect(result.nfts[0].chain_code).to.equal("ETH");
      expect(result.nfts[0].contract_address).to.equal("0x123456789ABCDEF");
      expect(result.nfts[0].token_id).to.equal("1");
      // expect(result.nfts[1].chain_code).to.equal("ETH");
      // expect(result.nfts[1].contract_address).to.equal("0x123456789ABCDEF");
      // expect(result.nfts[1].token_id).to.equal("2");
      // expect(result.nfts[2].chain_code).to.equal("ETH");
      // expect(result.nfts[2].contract_address).to.equal("0x123456789ABCDEF");
      // expect(result.nfts[2].token_id).to.equal("3");
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it(`verify user3 NFTs are present in table`, async () => {
    try {
      const result = await callFioApi("get_nfts_fio_address", {
        "fio_address": user3.address
      });
      expect(result.nfts.length).to.equal(5);
      expect(result.nfts[0].chain_code).to.equal("ETH");
      expect(result.nfts[0].contract_address).to.equal("0x123456789ABCDEF");
      expect(result.nfts[0].token_id).to.equal("1");
      expect(result.nfts[1].chain_code).to.equal("ETH");
      expect(result.nfts[1].contract_address).to.equal("0x123456789ABCDEF");
      expect(result.nfts[1].token_id).to.equal("2");
      expect(result.nfts[2].chain_code).to.equal("ETH");
      expect(result.nfts[2].contract_address).to.equal("0x123456789ABCDEF");
      expect(result.nfts[2].token_id).to.equal("3");
      expect(result.nfts[3].chain_code).to.equal("ETH");
      expect(result.nfts[3].contract_address).to.equal("0x123456789ABCDEF");
      expect(result.nfts[3].token_id).to.equal("4");
      expect(result.nfts[4].chain_code).to.equal("ETH");
      expect(result.nfts[4].contract_address).to.equal("0x123456789ABCDEF");
      expect(result.nfts[4].token_id).to.equal("5");
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it(`verify user1 NFTs not yet added to nftburnq`, async () => {
    try {
      const result = await callFioApi("get_table_rows", {
        json: true,
        code: 'fio.address',
        scope: 'fio.address',
        table: 'nftburnq',
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

  it(`verify user2 NFTs not yet added to nftburnq`, async () => {
    try {
      const result = await callFioApi("get_table_rows", {
        json: true,
        code: 'fio.address',
        scope: 'fio.address',
        table: 'nftburnq',
        lower_bound: user2Hash,
        upper_bound: user2Hash,
        key_type: 'i128',
        index_position: '2'
      });
      expect(result.rows.length).to.equal(0);
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it(`verify user3 NFTs not yet added to nftburnq`, async () => {
    try {
      const result = await callFioApi("get_table_rows", {
        json: true,
        code: 'fio.address',
        scope: 'fio.address',
        table: 'nftburnq',
        lower_bound: user3Hash,
        upper_bound: user3Hash,
        key_type: 'i128',
        index_position: '2'
      });
      expect(result.rows.length).to.equal(0);
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  //add some stuff to nftburnq with remallnfts, xferaddress, burnaddress, burnexpired
  it(`user1 removes all NFTs by calling remallnfts`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remallnfts',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      });
      expect(result.status).to.equal('OK');
      expect(result.fee_collected).to.equal(0);
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it(`user2 transfers FIO address to user3, expect NFTs to get added to nftburnq`, async () => {
    try {
      const result = await user2.sdk.genericAction('transferFioAddress', {
        fioAddress: user2.address,
        newOwnerKey: user3.publicKey,
        maxFee: config.api.transfer_fio_address.fee,
        technologyProviderId: ''
      })
      const feeCollected = result.fee_collected;
      expect(feeCollected).to.equal(config.api.transfer_fio_address.fee);
      expect(result.status).to.equal('OK');
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it(`user3 burns FIO address, expect NFTs attached to it to get added to nftburnq`, async () => {
    try {
      const result = await user3.sdk.genericAction('burnFioAddress', {
        fioAddress: user3.address,
        ownerKey: user3.publicKey,
        maxFee: config.api.transfer_fio_address.fee,
        technologyProviderId: ''
      })
      expect(result.fee_collected).to.equal(0);
      expect(result.status).to.equal('OK');
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it(`verify a hash of user1.address added to nftburnq`, async () => {
    try {
      const result = await callFioApi("get_table_rows", {
        json: true,
        code: 'fio.address',
        scope: 'fio.address',
        table: 'nftburnq',
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

  it(`verify a hash of user2.address added to nftburnq`, async () => {
    try {
      const result = await callFioApi("get_table_rows", {
        json: true,
        code: 'fio.address',
        scope: 'fio.address',
        table: 'nftburnq',
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

  it(`verify a hash of user3.address added to nftburnq`, async () => {
    try {
      const result = await callFioApi("get_table_rows", {
        json: true,
        code: 'fio.address',
        scope: 'fio.address',
        table: 'nftburnq',
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

  // it(`burns user1 NFTs in nftburnq`, async () => {
  //   try {
  //     const result = await user1.sdk.genericAction('pushTransaction', {
  //       action: 'burnnfts',
  //       account: 'fio.address',
  //       data: {
  //         actor: user1.account,
  //       }
  //     });
  //     expect(result.status).to.equal('OK');
  //   } catch (err) {
  //     expect(err).to.equal(null);
  //   }
  // });
  it(`burns user2 NFTs in nftburnq`, async () => {
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
  // it(`burns user3 NFTs in nftburnq`, async () => {
  //   try {
  //     const result = await user3.sdk.genericAction('pushTransaction', {
  //       action: 'burnnfts',
  //       account: 'fio.address',
  //       data: {
  //         actor: user3.account,
  //       }
  //     });
  //     expect(result.status).to.equal('OK');
  //   } catch (err) {
  //     expect(err).to.equal(null);
  //   }
  // });

  it(`verify NFTs no longer in nftburnq`, async () => {
    try {
      const result = await callFioApi("get_table_rows", {
        json: true,
        code: 'fio.address',
        scope: 'fio.address',
        table: 'nftburnq',
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

  // it.skip(`verify nftburnq contains only user2 after burning NFTs`, async () => {
  //   try {
  //     const result = await callFioApi("get_table_rows", {
  //       json: true,
  //       code: 'fio.address',
  //       scope: 'fio.address',
  //       table: 'nftburnq',
  //       lower_bound: user2Hash,
  //       upper_bound: user2Hash,
  //       key_type: 'i128',
  //       index_position: '2'
  //     });
  //     expect(result.rows.length).to.equal(1);
  //   } catch (err) {
  //     expect(err).to.equal(null);
  //   }
  // });
});

describe.only(`G. (unhappy) Try to burn NFTs in nftburnq, invalid user input`, () => {
  let user1, user2, user3;
  let user1Hash, user2Hash, user3Hash;
  let burnqnum, newBurnqnum = 0;

  const fundsAmount = 10000000000000;
  const user3Nfts = mintNfts(5);

  before(async () => {
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
    user3 = await newUser(faucet);
    await user1.sdk.genericAction('pushTransaction', {
      action: 'addnft',
      account: 'fio.address',
      data: {
        fio_address: user1.address,
        nfts: mintNfts(3),
        max_fee: 5000000000,
        actor: user1.account,
        tpid: ""
      }
    });
    await user2.sdk.genericAction('pushTransaction', {
      action: 'addnft',
      account: 'fio.address',
      data: {
        fio_address: user2.address,
        nfts: mintNfts(1),
        max_fee: 5000000000,
        actor: user2.account,
        tpid: ""
      }
    });
    await user3.sdk.genericAction('pushTransaction', {
      action: 'addnft',
      account: 'fio.address',
      data: {
        fio_address: user3.address,
        nfts: user3Nfts.slice(0, 3),
        max_fee: 5000000000,
        actor: user3.account,
        tpid: ""
      }
    });
    await user3.sdk.genericAction('pushTransaction', {
      action: 'addnft',
      account: 'fio.address',
      data: {
        fio_address: user3.address,
        nfts: user3Nfts.slice(-2),
        max_fee: 5000000000,
        actor: user3.account,
        tpid: ""
      }
    });

    //grab our user records from fionames so we can use their fio_address_hash
    let fionames = await callFioApi("get_table_rows", {
      json: true,               // Get the response as json
      code: 'fio.address',      // Contract that we target
      scope: 'fio.address',         // Account that owns the data
      table: 'fionames',        // Table name
      limit: 1000,                // Maximum number of rows that we want to get
      reverse: false,           // Optional: Get reversed data
      show_payer: false          // Optional: Show ram payer
    });
    fionames.rows = fionames.rows.slice(-3);    // only need the last 3 accounts
    try {
      user1Hash = fionames.rows[0].namehash;
      user2Hash = fionames.rows[1].namehash;
      user3Hash = fionames.rows[2].namehash;
    } catch (err) {
      console.log('user namehash not found in table');
      throw err;
    }
  });

  it(`try to burn NFTs in nftburnq, expect error - Nothing to burn`, async () => {
    try {
      const result = await user2.sdk.genericAction('pushTransaction', {
        action: 'burnnfts',
        account: 'fio.address',
        data: {
          actor: user2.account,
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.json.fields[0].error).to.equal('Nothing to burn');
    }
  });




});
