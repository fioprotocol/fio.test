/**
 * Adds a new permission to an account. In this example it adds a "regaddress" permission to the account.
 * This permission can then be linked to a contract action (see eosio-linkauth.js) to enable a secondary 
 * account to execute actions on the primary accounts behalf.
 */

 require('mocha')
 const {expect} = require('chai')
 const {newUser, fetchJson} = require('../utils.js');
 const {FIOSDK } = require('@fioprotocol/fiosdk')
 const config = require('../config.js');

describe.only(`************************** eosio-updateauth.js ************************** \n    A. Create a new account permission`, () => {

  let user1, user2
  const   permissionName = 'regaddress',
  parent = 'active',
  permission = 'active'

  it(`Create users`, async () => {
      user1 = await newUser(faucet);
      user2 = await newUser(faucet);
  });

  it(`updateauth - pushTransaction`, async () => {
    const registrarAccount = user2.account;
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'updateauth',
        account: 'eosio',
        data: {
          account: user1.account,
          permission: permissionName,
          parent: parent,
          auth: {
            threshold: 1,
            keys: [],
            waits: [],
            accounts: [{
              permission: {
                actor: registrarAccount,
                permission: permission
              },
              weight: 1
            }
            ]
          },
          max_fee: config.maxFee
        }
      })
      console.log('Result: ', result);
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null)
    };
  });

});