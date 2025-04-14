require('mocha')
const config = require('../config.js');
const {expect} = require('chai')
const {newUser, fetchJson, generateFioDomain, callFioApiSigned, timeout} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')


before(async () => {
  try {
    faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
  }catch(e){
    console.log(e);
  }
  })

describe(`************************** fio-account-authorization.js ************************** \n    A. Call addaddress using FIO authorizations.`, () => {
  let user1, user2;

  const permissionName = 'addmyadd';   // Must be < 12 chars

  it('Create users', async () => {
    try {
      user1 = await newUser(faucet);
      user2 = await newUser(faucet);
    }catch(e){
      console.log(e);
    }
  });

  it(`user1 creates addmyadd permission and assigns to user2`, async () => {
    try {

      const authorization_object = {
        threshold: 1,
        accounts: [
          {
            permission: {
              actor: user2.account,
              permission: 'active'
            },
            weight: 1
          }
        ],
        keys: [],
        waits: [],
      };

      const result = await callFioApiSigned('push_transaction', {
        action: 'updateauth',
        account: 'eosio',
        actor: user1.account,
        privKey: user1.privateKey,
        data: {
          permission: permissionName, //addmyadd
          parent: 'active',
          auth: authorization_object,
          max_fee: config.maxFee,
          account: user1.account
        }
      });
      //console.log('Result: ', result);
      expect(result.processed.receipt.status).to.equal('executed');
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    };
  });

  it(`user1 links regmyadd permission to regaddress`, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'linkauth',
        account: 'eosio',
        actor: user1.account,
        privKey: user1.privateKey,
        data: {
          account: user1.account,                // the owner of the permission to be linked, this account will sign the transaction
          code: 'fio.address',                    // the contract owner of the action to be linked
          type: 'addaddress',                     // the action to be linked
          requirement: permissionName,            // the name of the custom permission (created by updateauth)
          max_fee: config.maxFee
        }
      });
      //console.log('Result: ', result);
      expect(result.processed.receipt.status).to.equal('executed');
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    };
  });

  it(`renewdomain for user1`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'renewdomain',
        account: 'fio.address',
        authPermission: 'active',
        data: {
          "fio_domain": user1.domain,
          "max_fee": config.maxFee,
          "tpid": '',
          "actor": user1.account
        }
      })
      //console.log('Result: ', result);
      expect(result.status).to.equal('OK');
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  })

  it(`addaddress as user2`, async () => {

    try {
      const result = await user2.sdk.genericAction('pushTransaction', {
        action: 'addaddress',
        account: 'fio.address',
        signingAccount: user2.account,
        authPermission: permissionName,
        data: {
          "fio_address": user1.address,
          "public_addresses":[
            {
              chain_code: 'BCH',
              token_code: 'BCH',
              public_address: 'bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9',
            }
          ],
          "max_fee": config.maxFee,
          "tpid": '',
          "actor": user1.account
        }
      })
      //console.log('Result: ', result);
      expect(result.status).to.equal('OK');
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  })


})

