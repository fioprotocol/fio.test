/**
 * This test requires manually updating fio.address to shorten the expiration for domains and addresses
 * to 10 seconds.
 *
 * For Domains we want to expire them after the Address expiration to allow for testing expired Addresses.
 * Otherwise calls like get_pub_address will return that the Address does not exist if it is on an expired Domain.
 *
 * In regdomadd, change:
 *
 *   uint32_t domain_expiration = get_now_plus_one_year();
 * to
 *   uint32_t domain_expiration = now() + 10;
 *
 *
 * Next, update the number of days past expiration when certain calls are disallowed
 *
 * In fio.common.hpp:
 *
 * For the domain expire + 30 day check, change:
 *   #define SECONDS30DAYS 2592000
 * to
 *   #define SECONDS30DAYS 10
 *
 *
 *   OR
 *
 * Checkout the branch of fio.contracts with the changes already made: ben/fip42-develop-expirationdates
 *
 *
 *
 * Once updated:
 * - Rebuild the contracts with the fix
 */

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
let faucet;

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
});

describe(`************************** register-fio-domain-address-expired-domain.js ************************** \n    A. Use regdomadd to add an expired address`, function () {

  let user1, user2, bp, regFeeCharged, domainRows, fionameRows, regDomAddObj, dateObj, expDateObj;
  let domain1 = generateFioDomain(5);
  let address1 = generateFioAddress(domain1, 5);


  before(async function () {
    bp = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
  });

  it(`register an address and public domain`, async function () {
    dateObj = new Date(Date.now());  // TZ difference hack
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
    regFeeCharged = regDomAddObj.processed.action_traces[0].act.data.max_fee;
    expect(regDomAddObj).to.have.all.keys('transaction_id', 'processed');
    expect(regDomAddObj.processed.receipt.status).to.equal('executed');
    expect(regDomAddObj.processed.action_traces[0].receipt.response).to.contain('"status": "OK"').and.contain('"fee_collected":800000000000').and.contain('"expiration":');
    expect(regDomAddObj.processed.action_traces[0].act.data.fio_address).to.equal(address1);
    expect(regDomAddObj.processed.action_traces[0].act.data.is_public).to.equal(1);
    expect(regDomAddObj.processed.action_traces[0].act.data.owner_fio_public_key).to.equal(user1.publicKey);
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

  it(`wait for domain to expire`, async function () {
    await timeout(11000);
  });

  it(`getFioNames for user1 and confirm the domain is expired`, async () => {
    try {
      curdate = new Date()
      var utcSeconds = (curdate.getTime() + curdate.getTimezoneOffset()*60*1000)/1000;  // Convert to UTC
      const result = await user1.sdk.genericAction('getFioNames', {
          fioPublicKey: user1.publicKey
      })
      expect(result.fio_domains[1].fio_domain).to.equal(domain1);
      expect(Date.parse(result.fio_domains[1].expiration)/1000).to.be.lessThan(utcSeconds);
    } catch (err) {
        console.log('Error', err);
        expect(err).to.equal(null);
    }
  })

  it(`try to register recently expired address and public domain. Expect 'Domain already registered, use regaddress instead.'`, async function () {
    const result = await callFioApiSigned('push_transaction', {
      action: 'regdomadd',
      account: 'fio.address',
      actor: user2.account,
      privKey: user2.privateKey,
      data: {
        fio_address: address1,
        is_public: 1,
        owner_fio_public_key: user2.publicKey,
        max_fee: config.maxFee,
        tpid: bp.address,
        actor: user2.account
      }
    });
    expect(result.fields[0].name).to.equal('fio_name');
    expect(result.fields[0].value).to.equal(address1);
    expect(result.fields[0].error).to.equal('Domain already registered, use regaddress instead.');
  });
});
