require('mocha');
const config = require('../config.js');
const {expect} = require('chai');
const {
  newUser,
  existingUser,
  fetchJson,
  generateFioDomain,
  generateFioAddress,
  callFioApi,
  callFioApiSigned,
    timeout,
  getRamForUser
} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk');
const MS_YEAR = 31557600000;
let faucet;

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
});

describe(`************************** register-fio-domain-address.js ************************** \n    A. Register a FIO domain and addres in one transaction`, function () {

  let user1, user2, user3, user4, bp, regDomAddObj, preRegBal, npreRegBal, postRegBal, npostRegBal, regFeeCharged, preRegRAM, npreRegRAM, postRegRAM, npostRegRAM, domainRows, fionameRows, blockTime, expDateObj;
  let domain1 = generateFioDomain(5);
  let domain2 = generateFioDomain(10);
  let domain3 = generateFioDomain(10);
  let address1 = generateFioAddress(domain1, 5);
  let address2 = generateFioAddress(domain2, 9);
  let address3 = generateFioAddress(domain3, 9);
  const domainSmall = generateFioDomain(2);
  const addressSmall = generateFioAddress(domainSmall, 2);
  const domainLarge = generateFioDomain(65);
  const addressLarge = generateFioDomain(8) + '@' + domainLarge;

  before(async function () {
    bp = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
    user3 = await newUser(faucet);
    user4 = await newUser(faucet);
    preRegBal = await user1.sdk.genericAction('getFioBalance', {});
    preRegRAM = await getRamForUser(user1);
  });

  it(`(happy path 1) register an address and public domain`, async function () {
    regDomAddObj = await callFioApiSigned('push_transaction', {
      action: 'regdomadd',
      account: 'fio.address',
      actor: user1.account,
      privKey: user1.privateKey,
      data: {
        fio_address: address1,
        is_public: 1,
        owner_fio_public_key: user1.publicKey,
        max_fee: config.maxFee,
        tpid: bp.address,
        actor: user1.account
      }
    });
    console.log(JSON.stringify(regDomAddObj, null, 4));
    expect(regDomAddObj).to.have.all.keys('transaction_id', 'processed');
    expect(regDomAddObj.processed.receipt.status).to.equal('executed');
    expect(regDomAddObj.processed.action_traces[0].receipt.response).to.contain('"status": "OK"').and.contain('"fee_collected":800000000000').and.contain('"expiration":');
    expect(regDomAddObj.processed.action_traces[0].act.data.fio_address).to.equal(address1);
    expect(regDomAddObj.processed.action_traces[0].act.data.is_public).to.equal(1);
    expect(regDomAddObj.processed.action_traces[0].act.data.owner_fio_public_key).to.equal(user1.publicKey);
  });

  it(`Date in the response is getting incremented an extra year. confirm response contains correct domain expiration date (BD-4244)`, async function () {
    blockTime = regDomAddObj.processed.block_time.split('.')[0];
    console.log("processed block time ",regDomAddObj.processed.block_time);
    console.log("response ",regDomAddObj.processed.action_traces[0].receipt.response);
    expDateObj = JSON.parse(regDomAddObj.processed.action_traces[0].receipt.response);
    let blockTimeStamp = new Date(Date(blockTime)).getTime();
    let expDateTimeStamp = new Date(expDateObj.expiration).getTime();
    console.log("blocktimestamp ",blockTimeStamp);
    console.log("exptimestamp ",expDateTimeStamp);
    console.log("diff is ",expDateTimeStamp - blockTimeStamp);
    expect(expDateTimeStamp).to.be.greaterThan(blockTimeStamp + MS_YEAR - 5000).and.lessThan(blockTimeStamp + MS_YEAR + 5000);
  });

  it(`confirm fee charged to user1`, async function () {
    regFeeCharged = regDomAddObj.processed.action_traces[0].act.data.max_fee;
    postRegBal = await user1.sdk.genericAction('getFioBalance', {});
    expect(preRegBal.available - postRegBal.available).to.equal(regFeeCharged)
    expect(preRegBal.balance - postRegBal.balance).to.equal(regFeeCharged)
  });

  it(`confirm user1 RAM usage increased after regping`, async function () {
    postRegRAM= await getRamForUser(user1);
    expect(postRegRAM).to.be.greaterThan(preRegRAM);
  });

  it(`get_table_rows (fio.address - domains)`, async function () {
    domainRows = await callFioApi('get_table_rows', {
      code: "fio.address",
      scope: "fio.address",
      table: "domains",
      limit: 10,
      index_position: "1",
      json: true,
      reverse: true
    });
    expect(domainRows.rows[0]).to.have.all.keys('id', 'name', 'domainhash', 'account', 'is_public', 'expiration');
  });

  it(`confirm domains entry contains correct domain expiration date`, async function () {
    blockTime = regDomAddObj.processed.block_time.split('.')[0];
    let blockTimeStamp = new Date(Date(blockTime)).getTime();
    let expDateTimeStamp = new Date(domainRows.rows[0].expiration).getTime();
    let timeDelta = expDateTimeStamp - blockTimeStamp;
    let window = MS_YEAR - timeDelta;   // allow an ~hour window
    expect(timeDelta).to.be.greaterThan(MS_YEAR - window-1).and.lessThan(MS_YEAR+1);
  });

  it(`get_table_rows (fio.address - fionames)`, async function () {
    fionameRows = await callFioApi('get_table_rows', {
      code: "fio.address",
      scope: "fio.address",
      table: "fionames",
      limit: 10,
      index_position: "1",
      json: true,
      reverse: true
    });
    expect(fionameRows.rows[0]).to.have.all.keys('id', 'name', 'namehash', 'domain', 'domainhash', 'expiration', 'owner_account', 'addresses', 'bundleeligiblecountdown');
    expect(fionameRows.rows[0].addresses[0]).to.have.all.keys('token_code', 'chain_code', 'public_address');
  });

  it(`confirm owner_fio_public_key is user1.publicKey`, async function () {
    expect(domainRows.rows[0].account).to.equal(user1.account);
    expect(domainRows.rows[0].name).to.equal(domain1);
    expect(domainRows.rows[0].is_public).to.equal(1);
    expect(fionameRows.rows[0].domain).to.equal(domain1).and.equal(domainRows.rows[0].name);
    expect(fionameRows.rows[0].name).to.equal(address1);
    expect(fionameRows.rows[0].owner_account).to.equal(domainRows.rows[0].account);
    expect(fionameRows.rows[0].addresses[0].public_address).to.equal(user1.publicKey);
  });

  it(`store prereg account values for user1`, async function () {
    preRegBal = await user1.sdk.genericAction('getFioBalance', {});
    preRegRAM = await getRamForUser(user1);
  });

  it(`(happy path 2) register an address and private domain`, async function () {
    regDomAddObj = await callFioApiSigned('push_transaction', {
      action: 'regdomadd',
      account: 'fio.address',
      actor: user1.account,
      privKey: user1.privateKey,
      data: {
        fio_address: address2,
        is_public: 0,
        owner_fio_public_key: user1.publicKey,
        max_fee: config.maxFee,
        tpid: bp.address,
        actor: user1.account
      }
    });
    expect(regDomAddObj).to.have.all.keys('transaction_id', 'processed');
    expect(regDomAddObj.processed.receipt.status).to.equal('executed');
    expect(regDomAddObj.processed.action_traces[0].receipt.response).to.contain('"status": "OK"').and.contain('"fee_collected":800000000000').and.contain('"expiration":');
    expect(regDomAddObj.processed.action_traces[0].act.data.fio_address).to.equal(address2);
    expect(regDomAddObj.processed.action_traces[0].act.data.is_public).to.equal(0);
    expect(regDomAddObj.processed.action_traces[0].act.data.owner_fio_public_key).to.equal(user1.publicKey);
  });

  it(`Confirm response contains correct domain expiration date`, async function () {
    blockTime = regDomAddObj.processed.block_time.split('.')[0];
    expDateObj = JSON.parse(regDomAddObj.processed.action_traces[0].receipt.response);
    let blockTimeStamp = new Date(Date(blockTime)).getTime();
    let expDateTimeStamp = new Date(expDateObj.expiration).getTime();
    expect(expDateTimeStamp).to.be.greaterThan(blockTimeStamp + MS_YEAR - 1  - 5000).and.lessThan(blockTimeStamp + MS_YEAR + 1 + 5000);
  });

  it(`confirm fee charged to user1`, async function () {
    regFeeCharged = regDomAddObj.processed.action_traces[0].act.data.max_fee;
    postRegBal = await user1.sdk.genericAction('getFioBalance', {});
    expect(preRegBal.available - postRegBal.available).to.equal(regFeeCharged)
    expect(preRegBal.balance - postRegBal.balance).to.equal(regFeeCharged)
  });

  it(`confirm user1 RAM usage increased after regping`, async function () {
    postRegRAM = await getRamForUser(user1);
    expect(postRegRAM).to.be.greaterThan(preRegRAM);
  });

  it(`get_table_rows (fio.address - domains)`, async function () {
    domainRows = await callFioApi('get_table_rows', {
      code: "fio.address",
      scope: "fio.address",
      table: "domains",
      limit: 10,
      index_position: "1",
      json: true,
      reverse: true
    });
    expect(domainRows.rows[0]).to.have.all.keys('id', 'name', 'domainhash', 'account', 'is_public', 'expiration');
  });

  it(`confirm domains entry contains correct domain expiration date`, async function () {
    blockTime = regDomAddObj.processed.block_time.split('.')[0];
    let blockTimeStamp = new Date(Date(blockTime)).getTime();
    let expDateTimeStamp = new Date(domainRows.rows[0].expiration).getTime();
    let timeDelta = expDateTimeStamp - blockTimeStamp;
    let window = MS_YEAR - timeDelta;   // allow an ~hour window
    expect(timeDelta).to.be.greaterThan(MS_YEAR - window -1).and.lessThan(MS_YEAR+1);
  });

  it(`get_table_rows (fio.address - fionames)`, async function () {
    fionameRows = await callFioApi('get_table_rows', {
      code: "fio.address",
      scope: "fio.address",
      table: "fionames",
      limit: 10,
      index_position: "1",
      json: true,
      reverse: true
    });
    expect(fionameRows.rows[0]).to.have.all.keys('id', 'name', 'namehash', 'domain', 'domainhash', 'expiration', 'owner_account', 'addresses', 'bundleeligiblecountdown');
    expect(fionameRows.rows[0].addresses[0]).to.have.all.keys('token_code', 'chain_code', 'public_address');
  });

  it(`confirm owner_fio_public_key is user1.publicKey`, async function () {
    expect(domainRows.rows[0].account).to.equal(user1.account);
    expect(domainRows.rows[0].name).to.equal(domain2);
    expect(domainRows.rows[0].is_public).to.equal(0);
    expect(fionameRows.rows[0].domain).to.equal(domain2).and.equal(domainRows.rows[0].name);
    expect(fionameRows.rows[0].name).to.equal(address2);
    expect(fionameRows.rows[0].owner_account).to.equal(domainRows.rows[0].account);
    expect(fionameRows.rows[0].addresses[0].public_address).to.equal(user1.publicKey);
  });

  it(`store prereg account values for user4`, async function () {
    preRegBal = await user4.sdk.genericAction('getFioBalance', {});
    preRegRAM = await getRamForUser(user4);
  });

  it(`store prereg account values for user3`, async function () {
    npreRegBal = await user3.sdk.genericAction('getFioBalance', {});
    npreRegRAM = await getRamForUser(user3);
  });

  it(`(happy path 3) register a FIO address and a public FIO domain with an owner_fio_public_key different from the actor`, async function () {
    regDomAddObj = await callFioApiSigned('push_transaction', {
      action: 'regdomadd',
      account: 'fio.address',
      actor: user4.account,
      privKey: user4.privateKey,
      data: {
        fio_address: address3,
        is_public: 1,
        owner_fio_public_key: user3.publicKey,
        max_fee: config.maxFee,
        tpid: bp.address,
        actor: user4.account
      }
    });
    //console.log(JSON.stringify(regDomAddObj, null, 4));
    expect(regDomAddObj).to.have.all.keys('transaction_id', 'processed');
    expect(regDomAddObj.processed.receipt.status).to.equal('executed');
    expect(regDomAddObj.processed.action_traces[0].receipt.response).to.contain('"status": "OK"').and.contain('"fee_collected":800000000000').and.contain('"expiration":');
    expect(regDomAddObj.processed.action_traces[0].act.data.fio_address).to.equal(address3);
    expect(regDomAddObj.processed.action_traces[0].act.data.is_public).to.equal(1);
    expect(regDomAddObj.processed.action_traces[0].act.data.owner_fio_public_key).to.equal(user3.publicKey);
  });

  it(`Confirm response contains correct domain expiration date`, async function () {
    blockTime = regDomAddObj.processed.block_time.split('.')[0];
    expDateObj = JSON.parse(regDomAddObj.processed.action_traces[0].receipt.response);
    let blockTimeStamp = new Date(Date(blockTime)).getTime();
    let expDateTimeStamp = new Date(expDateObj.expiration).getTime();
    expect(expDateTimeStamp).to.be.greaterThan(blockTimeStamp + MS_YEAR - 1 - 5000).and.lessThan(blockTimeStamp + MS_YEAR + 1 + 5000);
  });

  it(`confirm fee charged to user4`, async function () {
    regFeeCharged = regDomAddObj.processed.action_traces[0].act.data.max_fee;
    postRegBal = await user4.sdk.genericAction('getFioBalance', {});
    expect(preRegBal.available - postRegBal.available).to.equal(regFeeCharged)
    expect(preRegBal.balance - postRegBal.balance).to.equal(regFeeCharged)
  });

  it(`confirm NO FEE charged to user3`, async function () {
    npostRegBal = await user3.sdk.genericAction('getFioBalance', {});
    expect(npreRegBal.available - npostRegBal.available).to.equal(0)
    expect(npreRegBal.balance - npostRegBal.balance).to.equal(0)
  });

  it(`confirm user4 RAM usage increased after regping`, async function () {
    postRegRAM = await getRamForUser(user4);
    expect(postRegRAM).to.be.greaterThan(preRegRAM);
  });

  it(`confirm user3 RAM usage NOT increased after regping`, async function () {
    npostRegRAM = await getRamForUser(user3);
    expect(npostRegRAM).to.equal(npreRegRAM);
  });

  it(`get_table_rows (fio.address - domains)`, async function () {
    domainRows = await callFioApi('get_table_rows', {
      code: "fio.address",
      scope: "fio.address",
      table: "domains",
      limit: 10,
      index_position: "1",
      json: true,
      reverse: true
    });
    expect(domainRows.rows[0]).to.have.all.keys('id', 'name', 'domainhash', 'account', 'is_public', 'expiration');
  });

  it(`get_table_rows (fio.address - fionames)`, async function () {
    fionameRows = await callFioApi('get_table_rows', {
      code: "fio.address",
      scope: "fio.address",
      table: "fionames",
      limit: 10,
      index_position: "1",
      json: true,
      reverse: true
    });
    expect(fionameRows.rows[0]).to.have.all.keys('id', 'name', 'namehash', 'domain', 'domainhash', 'expiration', 'owner_account', 'addresses', 'bundleeligiblecountdown');
    expect(fionameRows.rows[0].addresses[0]).to.have.all.keys('token_code', 'chain_code', 'public_address');
  });

  it(`confirm domains entry contains correct domain expiration date`, async function () {
    blockTime = regDomAddObj.processed.block_time.split('.')[0];
    let blockTimeStamp = new Date(Date(blockTime)).getTime();
    let expDateTimeStamp = new Date(domainRows.rows[0].expiration).getTime();
    let timeDelta = expDateTimeStamp - blockTimeStamp;
    let window = MS_YEAR - timeDelta;   // allow an ~hour window
    expect(timeDelta).to.be.greaterThan(MS_YEAR - window - 1).and.lessThan(MS_YEAR + 1);
  });

  it(`confirm owner_fio_public_key is user3.publicKey`, async function () {
    expect(domainRows.rows[0].account).to.equal(user3.account);
    expect(domainRows.rows[0].name).to.equal(domain3);
    expect(domainRows.rows[0].is_public).to.equal(1);
    expect(fionameRows.rows[0].domain).to.equal(domain3).and.equal(domainRows.rows[0].name);
    expect(fionameRows.rows[0].name).to.equal(address3);
    expect(fionameRows.rows[0].owner_account).to.equal(domainRows.rows[0].account).and.equal(user3.account);
    expect(fionameRows.rows[0].addresses[0].public_address).to.equal(user3.publicKey);
  });

  //add wait to avoid dup tx error
  it(`Waiting 2 seconds for no duplicate`, async () => {

    console.log("      wait 2 seconds ")
  })

  it(`wait 2 seconds for unlock`, async () => {
    await timeout(2 * 1000);
  })

  // unhappy
  it(`(domain already registered) try to register a FIO address and a public FIO domain`, async function () {
    const result = await callFioApiSigned('push_transaction', {
      action: 'regdomadd',
      account: 'fio.address',
      actor: user1.account,
      privKey: user1.privateKey,
      data: {
        fio_address: address1,
        is_public: 1,
        owner_fio_public_key: user1.publicKey,
        max_fee: config.maxFee,
        tpid: bp.address,
        actor: user1.account
      }
    });
    expect(result.type).to.equal('invalid_input');
   // console.log ("pass 1");
    expect(result.fields[0].name).to.equal('fio_name');
   // console.log ("pass 2");
    expect(result.fields[0].value).to.equal(address1);
   // console.log ("pass 3");
    expect(result.fields[0].error).to.equal('Domain already registered, use regaddress instead.');
    //console.log ("pass 4");
  });

  it(`(fee exceeds supplied maximum) try to register a FIO address and a public FIO domain`, async function () {
    const result = await callFioApiSigned('push_transaction', {
      action: 'regdomadd',
      account: 'fio.address',
      actor: user2.account,
      privKey: user2.privateKey,
      data: {
        fio_address: generateFioAddress(generateFioDomain(5), 5),
        is_public: 1,
        owner_fio_public_key: user2.publicKey,
        max_fee: config.maxFee / 2,
        tpid: bp.address,
        actor: user2.account
      }
    });
    expect(result.type).to.equal('invalid_input');
    expect(result.fields[0].name).to.equal('max_fee');
    expect(result.fields[0].value).to.equal((config.maxFee / 2).toString());
    expect(result.fields[0].error).to.equal('Fee exceeds supplied maximum.');
  });

  it(`(invalid_signature) try to register a FIO address and a public FIO domain`, async function () {
    const result = await callFioApiSigned('push_transaction', {
      action: 'regdomadd',
      account: 'fio.address',
      actor: user1.account,
      privKey: user2.privateKey,
      data: {
        fio_address: generateFioAddress(generateFioDomain(5), 5),
        is_public: 1,
        owner_fio_public_key: user2.publicKey,
        max_fee: config.maxFee,
        tpid: bp.address,
        actor: user2.account
      }
    });
    expect(result.type).to.equal('invalid_signature');
    expect(result.message).to.equal('Request signature is not valid or this user is not allowed to sign this transaction.');
  });

  it(`(invalid fio_address) try to register a FIO address and a public FIO domain`, async function () {
    const result = await callFioApiSigned('push_transaction', {
      action: 'regdomadd',
      account: 'fio.address',
      actor: user1.account,
      privKey: user1.privateKey,
      data: {
        fio_address: "!$Invalid#",
        is_public: 1,
        owner_fio_public_key: user1.publicKey,
        max_fee: 30000000000,
        tpid: bp.address,
        actor: user1.account
      }
    });
    expect(result.type).to.equal('invalid_input');
    expect(result.fields[0].name).to.equal('fio_address');
    expect(result.fields[0].value).to.equal('!$invalid#');
    expect(result.fields[0].error).to.equal('Invalid FIO Address format');
  });

  it(`(empty fio_address) try to register a FIO address and a public FIO domain`, async function () {
    const result = await callFioApiSigned('push_transaction', {
      action: 'regdomadd',
      account: 'fio.address',
      actor: user1.account,
      privKey: user1.privateKey,
      data: {
        fio_address: "",
        is_public: 1,
        owner_fio_public_key: user1.publicKey,
        max_fee: 30000000000,
        tpid: bp.address,
        actor: user1.account
      }
    });
    expect(result.type).to.equal('invalid_input');
    expect(result.fields[0].name).to.equal('fio_address');
    expect(result.fields[0].value).to.equal('');
    expect(result.fields[0].error).to.equal('Invalid FIO Address format');
  });

  it(`(missing fio_address) try to register a FIO address and a public FIO domain`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'regdomadd',
        account: 'fio.address',
        actor: user1.account,
        privKey: user1.privateKey,
        data: {
          is_public: 1,
          owner_fio_public_key: user1.publicKey,
          max_fee: 30000000000,
          tpid: bp.address,
          actor: user1.account
        }
      });
      expect(result).to.equal(null);
    } catch (err) {
      expect(err.message).to.equal('missing regdomadd.fio_address (type=string)');
    }
  });

  it(`(invalid is_public) try to register a FIO address and a public FIO domain`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'regdomadd',
        account: 'fio.address',
        actor: user2.account,
        privKey: user2.privateKey,
        data: {
          fio_address: generateFioAddress(generateFioDomain(5), 5),
          is_public: "!@invalid#$",
          owner_fio_public_key: user2.publicKey,
          max_fee: config.maxFee,
          tpid: bp.address,
          actor: user2.account
        }
      });
      expect(result).to.equal(null);
    } catch (err) {
      expect(err.message).to.equal('Expected number');
    }
  });

  it(`(negative is_public) try to register a FIO address and a public FIO domain`, async function () {
    const result = await callFioApiSigned('push_transaction', {
      action: 'regdomadd',
      account: 'fio.address',
      actor: user2.account,
      privKey: user2.privateKey,
      data: {
        fio_address: generateFioAddress(generateFioDomain(5), 5),
        is_public: -9,
        owner_fio_public_key: user2.publicKey,
        max_fee: config.maxFee,
        tpid: bp.address,
        actor: user2.account
      }
    });
    expect(result.type).to.equal('invalid_input');
    expect(result.fields[0].name).to.equal('is_public');
    expect(result.fields[0].value).to.equal('247');
    expect(result.fields[0].error).to.equal('Only 0 or 1 allowed');
  });

  it(`(missing is_public) try to register a FIO address and a public FIO domain`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'regdomadd',
        account: 'fio.address',
        actor: user2.account,
        privKey: user2.privateKey,
        data: {
          fio_address: generateFioAddress(generateFioDomain(5), 5),
          owner_fio_public_key: user2.publicKey,
          max_fee: config.maxFee,
          tpid: bp.address,
          actor: user2.account
        }
      });
      expect(result).to.equal(null);
    } catch (err) {
      expect(err.message).to.equal('missing regdomadd.is_public (type=int8)');
    }
  });

  it(`(invalid owner_fio_public_key) try to register a FIO address and a public FIO domain`, async function () {
    const result = await callFioApiSigned('push_transaction', {
      action: 'regdomadd',
      account: 'fio.address',
      actor: user2.account,
      privKey: user2.privateKey,
      data: {
        fio_address: generateFioAddress(generateFioDomain(5), 5),
        is_public: 1,
        owner_fio_public_key: "!@invalid#$",
        max_fee: config.maxFee,
        tpid: bp.address,
        actor: user2.account
      }
    });
    expect(result.type).to.equal('invalid_input');
    expect(result.fields[0].name).to.equal('owner_fio_public_key');
    expect(result.fields[0].value).to.equal('!@invalid#$');
    expect(result.fields[0].error).to.equal('Invalid FIO Public Key');
  });

  it(`(missing owner_fio_public_key) try to register a FIO address and a public FIO domain`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'regdomadd',
        account: 'fio.address',
        actor: user2.account,
        privKey: user2.privateKey,
        data: {
          fio_address: generateFioAddress(generateFioDomain(5), 5),
          is_public: 1,
          max_fee: config.maxFee,
          tpid: bp.address,
          actor: user2.account
        }
      });
      expect(result).to.equal(null);
    } catch (err) {
      expect(err.message).to.equal('missing regdomadd.owner_fio_public_key (type=string)');
    }
  });

  it(`(invalid max_fee) try to register a FIO address and a public FIO domain`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'regdomadd',
        account: 'fio.address',
        actor: user2.account,
        privKey: user2.privateKey,
        data: {
          fio_address: generateFioAddress(generateFioDomain(5), 5),
          is_public: 1,
          owner_fio_public_key: user2.publicKey,
          max_fee: "!@invalid#$",
          tpid: bp.address,
          actor: user2.account
        }
      });
      expect(result).to.equal(null);
    } catch (err) {
      expect(err.message).to.equal('invalid number');
    }
  });

  it(`(negative max_fee) try to register a FIO address and a public FIO domain`, async function () {
    const result = await callFioApiSigned('push_transaction', {
      action: 'regdomadd',
      account: 'fio.address',
      actor: user2.account,
      privKey: user2.privateKey,
      data: {
        fio_address: generateFioAddress(generateFioDomain(5), 5),
        is_public: 1,
        owner_fio_public_key: user2.publicKey,
        max_fee: -config.maxFee,
        tpid: bp.address,
        actor: user2.account
      }
    });
    expect(result.type).to.equal('invalid_input');
    expect(result.fields[0].name).to.equal('max_fee');
    expect(result.fields[0].value).to.equal(`${-config.maxFee}`);
    expect(result.fields[0].error).to.equal('Invalid fee value');
  });

  it(`(missing max_fee) try to register a FIO address and a public FIO domain`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'regdomadd',
        account: 'fio.address',
        actor: user2.account,
        privKey: user2.privateKey,
        data: {
          fio_address: generateFioAddress(generateFioDomain(5), 5),
          is_public: 1,
          owner_fio_public_key: user2.publicKey,
          tpid: bp.address,
          actor: user2.account
        }
      });
      expect(result).to.equal(null);
    } catch (err) {
      expect(err.message).to.equal('missing regdomadd.max_fee (type=int64)');
    }
  });

  it(`(invalid tpid) try to register a FIO address and a public FIO domain`, async function () {
    const result = await callFioApiSigned('push_transaction', {
      action: 'regdomadd',
      account: 'fio.address',
      actor: user2.account,
      privKey: user2.privateKey,
      data: {
        fio_address: generateFioAddress(generateFioDomain(5), 5),
        is_public: 1,
        owner_fio_public_key: user2.publicKey,
        max_fee: config.maxFee,
        tpid: "!@invalid#$",
        actor: user2.account
      }
    });
    expect(result.type).to.equal('invalid_input');
    expect(result.fields[0].name).to.equal('tpid');
    expect(result.fields[0].value).to.equal('!@invalid#$');
    expect(result.fields[0].error).to.equal('TPID must be empty or valid FIO address');
  });

  it(`(missing tpid) try to register a FIO address and a public FIO domain`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'regdomadd',
        account: 'fio.address',
        actor: user2.account,
        privKey: user2.privateKey,
        data: {
          fio_address: generateFioAddress(generateFioDomain(5), 5),
          is_public: 1,
          owner_fio_public_key: user2.publicKey,
          max_fee: config.maxFee,
          actor: user2.account
        }
      });
      expect(result).to.equal(null);
    } catch (err) {
      expect(err.message).to.equal('missing regdomadd.tpid (type=string)');
    }
  });

  it(`(invalid actor) try to register a FIO address and a public FIO domain`, async function () {
    const result = await callFioApiSigned('push_transaction', {
      action: 'regdomadd',
      account: 'fio.address',
      actor: user2.account,
      privKey: user2.privateKey,
      data: {
        fio_address: generateFioAddress(generateFioDomain(5), 5),
        is_public: 1,
        owner_fio_public_key: user2.publicKey,
        max_fee: config.maxFee,
        tpid: bp.address,
        actor: "!#invalid$%"
      }
    });
    expect(result.error.name).to.equal('missing_auth_exception');
    expect(result.error.details[0].message).to.equal('missing authority of ..invalid');
  });

  it(`(empty actor) try to register a FIO address and a public FIO domain`, async function () {
    const result = await callFioApiSigned('push_transaction', {
      action: 'regdomadd',
      account: 'fio.address',
      actor: user2.account,
      privKey: user2.privateKey,
      data: {
        fio_address: generateFioAddress(generateFioDomain(5), 5),
        is_public: 1,
        owner_fio_public_key: user2.publicKey,
        max_fee: config.maxFee,
        tpid: bp.address,
        actor: ""
      }
    });
    expect(result.error.name).to.equal('missing_auth_exception');
    expect(result.error.details[0].message).to.equal('missing authority of ');
  });

  it(`(missing actor) try to register a FIO address and a public FIO domain`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'regdomadd',
        account: 'fio.address',
        actor: user2.account,
        privKey: user2.privateKey,
        data: {
          fio_address: generateFioAddress(generateFioDomain(5), 5),
          is_public: 1,
          owner_fio_public_key: user2.publicKey,
          max_fee: config.maxFee,
          tpid: bp.address,
        }
      });
      expect(result).to.equal(null);
    } catch (err) {
      expect(err.message).to.equal('missing regdomadd.actor (type=name)');
    }
  });

  it(`(happy path) register a FIO address on a small domain`, async function () {
    result = await callFioApiSigned('push_transaction', {
      action: 'regdomadd',
      account: 'fio.address',
      actor: user4.account,
      privKey: user4.privateKey,
      data: {
        fio_address: addressSmall,
        is_public: 0,
        owner_fio_public_key: user4.publicKey,
        max_fee: config.maxFee,
        tpid: bp.address,
        actor: user4.account
      }
    });
    expect(result).to.have.all.keys('transaction_id', 'processed');
    expect(result.processed.receipt.status).to.equal('executed');
    expect(result.processed.action_traces[0].receipt.response).to.contain('"status": "OK"').and.contain('"fee_collected":800000000000').and.contain('"expiration":');
    expect(result.processed.action_traces[0].act.data.fio_address).to.equal(addressSmall);
    expect(result.processed.action_traces[0].act.data.is_public).to.equal(0);
    expect(result.processed.action_traces[0].act.data.owner_fio_public_key).to.equal(user4.publicKey);
  });

  it(`(fail large domain) register a FIO address on a domain with too many characters`, async function () {
      result = await callFioApiSigned('push_transaction', {
      action: 'regdomadd',
      account: 'fio.address',
      actor: user4.account,
      privKey: user4.privateKey,
      data: {
        fio_address: addressLarge,
        is_public: 0,
        owner_fio_public_key: user4.publicKey,
        max_fee: config.maxFee,
        tpid: bp.address,
        actor: user4.account
      }
    });
    expect(result.fields[0].error).to.equal('Invalid FIO Address format');
  });
});

describe(`B. Register a FIO domain and address using /register_fio_domain_address`, function () {

  let user1, user2, bp;
  let domain1 = generateFioDomain(5);
  //let domain2 = generateFioDomain(10);
  let address1 = generateFioAddress(domain1, 5);
  //let address2 = generateFioAddress(domain2, 9);

  before(async function () {
    bp = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
  });

  it(`register a FIO address and a public FIO domain`, async function () {
    try {
      const result = await callFioApiSigned('register_fio_domain_address', {
        action: 'regdomadd',
        account: 'fio.address',
        actor: user1.account,
        privKey: user1.privateKey,
        data: {
          fio_address: address1,
          is_public: 1,
          owner_fio_public_key: user1.publicKey,
          max_fee: config.maxFee,
          tpid: bp.address,
          actor: user1.account
        }
      });
      expect(result).to.have.all.keys('transaction_id', 'processed');
      expect(result.processed.receipt.status).to.equal('executed');
      expect(result.processed.action_traces[0].receipt.response).to.contain('"status": "OK"').and.contain('"fee_collected":800000000000').and.contain('"expiration":');
      expect(result.processed.action_traces[0].act.data.fio_address).to.equal(address1);
      expect(result.processed.action_traces[0].act.data.is_public).to.equal(1);
      expect(result.processed.action_traces[0].act.data.owner_fio_public_key).to.equal(user1.publicKey);
    } catch (err) {
      throw err;
    }
  });

  it(`(invalid fio_address) try to register a FIO address and a public FIO domain`, async function () {
    const result = await callFioApiSigned('register_fio_domain_address', {
      action: 'regdomadd',
      account: 'fio.address',
      actor: user1.account,
      privKey: user1.privateKey,
      data: {
        fio_address: "!$Invalid#",
        is_public: 1,
        owner_fio_public_key: user1.publicKey,
        max_fee: 30000000000,
        tpid: bp.address,
        actor: user1.account
      }
    });
    expect(result.type).to.equal('invalid_input');
    expect(result.fields[0].name).to.equal('fio_address');
    expect(result.fields[0].value).to.equal('!$invalid#');
    expect(result.fields[0].error).to.equal('Invalid FIO Address format');
  });

  it(`(invalid is_public) try to register a FIO address and a public FIO domain`, async function () {
    try {
      const result = await callFioApiSigned('register_fio_domain_address', {
        action: 'regdomadd',
        account: 'fio.address',
        actor: user2.account,
        privKey: user2.privateKey,
        data: {
          fio_address: generateFioAddress(generateFioDomain(5), 5),
          is_public: "!@invalid#$",
          owner_fio_public_key: user2.publicKey,
          max_fee: config.maxFee,
          tpid: bp.address,
          actor: user2.account
        }
      });
      expect(result).to.equal(null);
    } catch (err) {
      expect(err.message).to.equal('Expected number');
    }
  });

  it(`(invalid owner_fio_public_key) try to register a FIO address and a public FIO domain`, async function () {
    const result = await callFioApiSigned('register_fio_domain_address', {
      action: 'regdomadd',
      account: 'fio.address',
      actor: user2.account,
      privKey: user2.privateKey,
      data: {
        fio_address: generateFioAddress(generateFioDomain(5), 5),
        is_public: 1,
        owner_fio_public_key: "!@invalid#$",
        max_fee: config.maxFee,
        tpid: bp.address,
        actor: user2.account
      }
    });
    //console.log('Result: ', result);
    expect(result.type).to.equal('invalid_input');
    expect(result.fields[0].name).to.equal('owner_fio_public_key');
    expect(result.fields[0].value).to.equal('!@invalid#$');
    expect(result.fields[0].error).to.equal('Invalid FIO Public Key');
  });

  it(`(invalid max_fee) try to register a FIO address and a public FIO domain`, async function () {
    try {
      const result = await callFioApiSigned('register_fio_domain_address', {
        action: 'regdomadd',
        account: 'fio.address',
        actor: user2.account,
        privKey: user2.privateKey,
        data: {
          fio_address: generateFioAddress(generateFioDomain(5), 5),
          is_public: 1,
          owner_fio_public_key: user2.publicKey,
          max_fee: "!@invalid#$",
          tpid: bp.address,
          actor: user2.account
        }
      });
      expect(result).to.equal(null);
    } catch (err) {
      expect(err.message).to.equal('invalid number');
    }
  });

  it(`(invalid tpid) try to register a FIO address and a public FIO domain`, async function () {
    const result = await callFioApiSigned('register_fio_domain_address', {
      action: 'regdomadd',
      account: 'fio.address',
      actor: user2.account,
      privKey: user2.privateKey,
      data: {
        fio_address: generateFioAddress(generateFioDomain(5), 5),
        is_public: 1,
        owner_fio_public_key: user2.publicKey,
        max_fee: config.maxFee,
        tpid: "!@invalid#$",
        actor: user2.account
      }
    });
    expect(result.type).to.equal('invalid_input');
    expect(result.fields[0].name).to.equal('tpid');
    expect(result.fields[0].value).to.equal('!@invalid#$');
    expect(result.fields[0].error).to.equal('TPID must be empty or valid FIO address');
  });

  it(`(invalid actor) try to register a FIO address and a public FIO domain`, async function () {
    const result = await callFioApiSigned('register_fio_domain_address', {
      action: 'regdomadd',
      account: 'fio.address',
      actor: user2.account,
      privKey: user2.privateKey,
      data: {
        fio_address: generateFioAddress(generateFioDomain(5), 5),
        is_public: 1,
        owner_fio_public_key: user2.publicKey,
        max_fee: config.maxFee,
        tpid: bp.address,
        actor: "!#invalid$%"
      }
    });
    expect(result.error.name).to.equal('missing_auth_exception');
    expect(result.error.details[0].message).to.equal('missing authority of ..invalid');
  });
});
