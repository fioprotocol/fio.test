require('mocha')
const {expect} = require('chai')
const {newUser, existingUser, callFioApi, generateFioDomain, generateFioAddress, createKeypair, timeout, fetchJson} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/FIOSDK');
const config = require('../config.js');

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson)
})

describe(`************************** tpid.js ************************** \n    A. Test TPIDs with proxy`, () => {
  
  let proxy1, user1, user2, user3, user4, newPubKey

  it(`Create users`, async () => {
    proxy1 = await newUser(faucet);
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
    user3 = await newUser(faucet);
    user4 = await newUser(faucet);

    let keys = await createKeypair();
    newPubKey = keys.publicKey;
  })

  it('Confirm proxy1: is_proxy = 0, is_auto_proxy = 0', async () => {
    let inVotersTable;
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'voters',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      const voters = await callFioApi("get_table_rows", json);
      //console.log('voters: ', voter);
      inVotersTable = false;
      for (voter in voters.rows) {
        if (voters.rows[voter].owner == proxy1.account) {
          inVotersTable = true;
          break;
        }
      }
      expect(inVotersTable).to.equal(false)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Register proxy1 as a proxy`, async () => {
    try {
      const result = await proxy1.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: proxy1.address,
          actor: proxy1.account,
          max_fee: config.maxFee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

  it('Confirm proxy1: is_proxy = 1, is_auto_proxy = 0', async () => {
    let inVotersTable;
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'voters',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      inVotersTable = false;
      voters = await callFioApi("get_table_rows", json);
      //console.log('voters: ', voter);
      for (voter in voters.rows) {
        if (voters.rows[voter].owner == proxy1.account) {
          inVotersTable = true;
          //console.log('voters.rows[voter].is_proxy: ', voters.rows[voter].is_proxy); 
          //console.log('voters.rows[voter].is_auto_proxy: ', voters.rows[voter].is_auto_proxy); 
          //console.log('voters.rows[voter].proxy: ', voters.rows[voter].proxy); 
          break;
        }
      }
      expect(voters.rows[voter].is_auto_proxy).to.equal(0);  
      expect(voters.rows[voter].is_proxy).to.equal(1);  
      expect(inVotersTable).to.equal(true)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it('Confirm user1: is_proxy = 0, is_auto_proxy = 0', async () => {
    let inVotersTable;
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'voters',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      const voters = await callFioApi("get_table_rows", json);
      //console.log('voters: ', voter);
      inVotersTable = false;
      for (voter in voters.rows) {
        if (voters.rows[voter].owner == user1.account) {
          inVotersTable = true;
          break;
        }
      }
      expect(inVotersTable).to.equal(false)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`SUCCESS: user3 transfers 10 FIO to user1 using FIO Address of user2 (who is not a registered proxy). Expect: no proxy for user1.`, async () => {
    try {
      const result = await user3.sdk.genericAction('pushTransaction', {
        action: 'trnsfiopubky',
        account: 'fio.token',
        data: {
          payee_public_key: user1.publicKey,
          amount: 10000000000,
          max_fee: config.maxFee,
          tpid: user2.address,
          actor: user3.account
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

  it(`SUCCESS: user2 transfer 10 FIO to user1 using FIO Address of user2 (who is not a registered proxy). Expect: no proxy for user1.`, async () => {
    try {
      const result = await user2.sdk.genericAction('pushTransaction', {
        action: 'trnsfiopubky',
        account: 'fio.token',
        data: {
          payee_public_key: user1.publicKey,
          amount: 10000000000,
          max_fee: config.maxFee,
          tpid: user2.address,
          actor: user2.account
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

  it(`SUCCESS: regdomain: faucet registers new Domain for user1 using FIO Address of proxy1 (who IS a registered proxy). Expect: no auto_proxy for user1 to proxy1.`, async () => {
    user1.domain2 = generateFioDomain(8)
    try {
      const result = await faucet.genericAction('pushTransaction', {
        action: 'regdomain',
        account: 'fio.address',
        data: {
          fio_domain: user1.domain2,
          owner_fio_public_key: user1.publicKey,
          max_fee: config.maxFee,
          tpid: proxy1.address,
          actor: faucet.account
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

  it(`SUCCESS: renewdomain: faucet renews Domain for user1 using FIO Address of proxy1 (who IS a registered proxy). Expect: no auto_proxy for user1 to proxy1`, async () => {
    try {
      const result = await faucet.genericAction('pushTransaction', {
        action: 'renewdomain',
        account: 'fio.address',
        data: {
          fio_domain: user1.domain,
          max_fee: config.maxFee,
          tpid: proxy1.address,
          actor: faucet.account
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

  it(`Register new domain: user3.domain2`, async () => {
    user3.domain2 = generateFioDomain(8)
    try {
      const result = await user3.sdk.genericAction('pushTransaction', {
        action: 'regdomain',
        account: 'fio.address',
        data: {
          fio_domain: user3.domain2,
          owner_fio_public_key: user3.publicKey,
          max_fee: config.maxFee,
          tpid: '',
          actor: user3.account
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

  it(`SUCCESS: xferdomain: Transfer user3.domain2 to user1 using FIO Address of proxy1 (who IS a registered proxy). Expect: no proxy for user1.`, async () => {
    try{
      const result = await user3.sdk.genericAction('pushTransaction', {
        action: 'xferdomain',
        account: 'fio.address',
        data: {
          fio_domain: user3.domain2,
          new_owner_fio_public_key: user1.publicKey,
          max_fee: config.maxFee,
          tpid: proxy1.address,
          actor: user3.account
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

  it(`regaddress: user3 register new Address for user1 using FIO Address of proxy1 (who IS a registered proxy). Expect: no proxy for user1.`, async () => {
    user1.address2 = generateFioAddress(user3.domain, 8)
    try {
      const result = await user3.sdk.genericAction('pushTransaction', {
        action: 'regaddress',
        account: 'fio.address',
        data: {
          fio_address: user1.address2,
          owner_fio_public_key: user1.publicKey,
          max_fee: config.maxFee,
          tpid: proxy1.address,
          actor: user3.account
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

  it(`SUCCESS: renewaddress: user3 renews Address for user1 using FIO Address of proxy1 (who IS a registered proxy). Expect: no proxy for user1.`, async () => {
    try {
      const result = await user3.sdk.genericAction('pushTransaction', {
        action: 'renewaddress',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          max_fee: config.maxFee,
          tpid: proxy1.address,
          actor: user3.account
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

  it(`Register user3.address2`, async () => {
    user3.address2 = generateFioAddress(user3.domain, 8)
    try {
      const result = await user3.sdk.genericAction('pushTransaction', {
        action: 'regaddress',
        account: 'fio.address',
        data: {
          fio_address: user3.address2,
          owner_fio_public_key: user3.publicKey,
          max_fee: config.maxFee,
          tpid: '',
          actor: user3.account
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

  it(`xferaddress: user3 transfers user3.address2 to emptyAccount.publicKey using FIO Address of proxy1 (who IS a registered proxy). Expect: no proxy for user1.`, async () => {
    try{
        const result = await user3.sdk.genericAction('pushTransaction', {
            action: 'xferaddress',
            account: 'fio.address',
            data: {
              fio_address: user3.address2,
              new_owner_fio_public_key: newPubKey,
              max_fee: config.maxFee,
              tpid: proxy1.address,
              actor: user3.account
            }
        })
        expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json.error.details)
      expect(err).to.equal('null')
    }
  })

  it(`user 3 transfers 10 FIO to user1 using FIO Address of proxy1 (who IS a registered proxy). Expect: no proxy for user1.`, async () => {
    try {
      const result = await user3.sdk.genericAction('pushTransaction', {
        action: 'trnsfiopubky',
        account: 'fio.token',
        data: {
          payee_public_key: user1.publicKey,
          amount: 10000000000,
          max_fee: config.maxFee,
          tpid: proxy1.address,
          actor: user3.account
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

  it('Confirm user1 is still: is_proxy = 0, is_auto_proxy = 0', async () => {
    let inVotersTable;
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'voters',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      const voters = await callFioApi("get_table_rows", json);
      //console.log('voters: ', voter);
      inVotersTable = false;
      for (voter in voters.rows) {
        if (voters.rows[voter].owner == user1.account) {
          inVotersTable = true;
          break;
        }
      }
      expect(inVotersTable).to.equal(false)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

})

describe(`B. User that has proxied their vote is sent FIO with TPID registered as proxy`, () => {
  
  let proxy1, user1, user2

  it(`Create users`, async () => {
    proxy1 = await newUser(faucet);
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
  })

  it(`Register proxy1 as a proxy`, async () => {
    try {
      const result = await proxy1.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: proxy1.address,
          actor: proxy1.account,
          max_fee: config.maxFee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

  it('Confirm proxy1: is_proxy = 1, is_auto_proxy = 0', async () => {
    let inVotersTable;
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'voters',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      inVotersTable = false;
      voters = await callFioApi("get_table_rows", json);
      //console.log('voters: ', voter);
      for (voter in voters.rows) {
        if (voters.rows[voter].owner == proxy1.account) {
          inVotersTable = true;
          break;
        }
      }
      expect(voters.rows[voter].is_auto_proxy).to.equal(0);  
      expect(voters.rows[voter].is_proxy).to.equal(1);  
      expect(inVotersTable).to.equal(true)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it('Confirm user1 is NOT in voters table', async () => {
    let inVotersTable;
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'voters',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      const voters = await callFioApi("get_table_rows", json);
      //console.log('voters: ', voter);
      inVotersTable = false;
      for (voter in voters.rows) {
        if (voters.rows[voter].owner == user1.account) {
          //console.log('voters info: ', voters.rows[voter])
          inVotersTable = true;
          break;
        }
      }
      expect(inVotersTable).to.equal(false)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`user1 votes for bp1@dapixdev`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: user1.address,
          actor: user1.account,
          max_fee: config.maxFee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }
  })

  it('Confirm user1: proxy = NULL, producers = bp1', async () => {
    let inVotersTable;
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'voters',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      const voters = await callFioApi("get_table_rows", json);
      //console.log('voters: ', voter);
      inVotersTable = false;
      for (voter in voters.rows) {
        if (voters.rows[voter].owner == user1.account) {
          //console.log('voters info: ', voters.rows[voter])
          inVotersTable = true;
          break;
        }
      }
      expect(voters.rows[voter].proxy).to.equal('')
      expect(voters.rows[voter].producers[0]).to.equal('qbxn5zhw2ypw')  // bp1
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`user2 transfers 10 FIO to user1 using FIO Address of proxy1.`, async () => {
    try {
      const result = await user2.sdk.genericAction('pushTransaction', {
        action: 'trnsfiopubky',
        account: 'fio.token',
        data: {
          payee_public_key: user1.publicKey,
          amount: 10000000000,
          max_fee: config.maxFee,
          tpid: proxy1.address,
          actor: user2.account
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

  it('Confirm user1 is still: proxy = NULL, producers = bp1', async () => {
    let inVotersTable;
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'voters',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      const voters = await callFioApi("get_table_rows", json);
      //console.log('voters: ', voter);
      inVotersTable = false;
      for (voter in voters.rows) {
        if (voters.rows[voter].owner == user1.account) {
          //console.log('voters info: ', voters.rows[voter])
          inVotersTable = true;
          break;
        }
      }
      expect(voters.rows[voter].proxy).to.equal('')
      expect(voters.rows[voter].producers[0]).to.equal('qbxn5zhw2ypw')  // bp1
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

})

describe(`C. User that has proxied their votes is sent FIO with TPID registered as proxy`, () => {
  
  let proxy1, proxyThief, user1, user2

  it(`Create users`, async () => {
    proxy1 = await newUser(faucet);
    proxyThief = await newUser(faucet);
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
  })

  it(`Register proxy1 as a proxy`, async () => {
    try {
      const result = await proxy1.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: proxy1.address,
          actor: proxy1.account,
          max_fee: config.maxFee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

  it(`Register proxyThief as a proxy`, async () => {
    try {
      const result = await proxyThief.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: proxyThief.address,
          actor: proxyThief.account,
          max_fee: config.maxFee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

  it('Confirm proxyThief: is_proxy = 1, is_auto_proxy = 0', async () => {
    let inVotersTable;
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'voters',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      inVotersTable = false;
      voters = await callFioApi("get_table_rows", json);
      //console.log('voters: ', voter);
      for (voter in voters.rows) {
        if (voters.rows[voter].owner == proxyThief.account) {
          inVotersTable = true;
          break;
        }
      }
      expect(voters.rows[voter].is_auto_proxy).to.equal(0);  
      expect(voters.rows[voter].is_proxy).to.equal(1);  
      expect(inVotersTable).to.equal(true)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it('Confirm user1 is not in voters table', async () => {
    let inVotersTable;
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'voters',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      const voters = await callFioApi("get_table_rows", json);
      //console.log('voters: ', voter);
      inVotersTable = false;
      for (voter in voters.rows) {
        if (voters.rows[voter].owner == user1.account) {
          inVotersTable = true;
          break;
        }
      }
      expect(inVotersTable).to.equal(false)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`user1 proxy votes to proxy1`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'voteproxy',
        account: 'eosio',
        data: {
          proxy: proxy1.address,
          fio_address: user1.address,
          actor: user1.account,
          max_fee: config.maxFee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
    }
  })

  it('Confirm user1: proxy = NULL, is_auto_proxy = 0', async () => {
    let inVotersTable;
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'voters',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      const voters = await callFioApi("get_table_rows", json);
      //console.log('voters: ', voter);
      inVotersTable = false;
      for (voter in voters.rows) {
        if (voters.rows[voter].owner == user1.account) {
          //console.log('voters info: ', voters.rows[voter])
          inVotersTable = true;
          break;
        }
      }
      expect(voters.rows[voter].proxy).to.equal(proxy1.account);
      expect(voters.rows[voter].is_auto_proxy).to.equal(0);
      expect(inVotersTable).to.equal(true);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`user2 transfers 10 FIO to user1 using FIO Address of proxyThief as TPID`, async () => {
    try {
      const result = await user2.sdk.genericAction('pushTransaction', {
        action: 'trnsfiopubky',
        account: 'fio.token',
        data: {
          payee_public_key: user1.publicKey,
          amount: 10000000000,
          max_fee: config.maxFee,
          tpid: proxyThief.address,
          actor: user2.account
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

  it('Confirm user1 votes are still proxied to proxy1 (NOT proxyThief)', async () => {
    let inVotersTable;
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'voters',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      const voters = await callFioApi("get_table_rows", json);
      //console.log('voters: ', voter);
      inVotersTable = false;
      for (voter in voters.rows) {
        if (voters.rows[voter].owner == user1.account) {
          //console.log('voters info: ', voters.rows[voter])
          inVotersTable = true;
          break;
        }
      }
      expect(voters.rows[voter].proxy).to.equal(proxy1.account);
      expect(voters.rows[voter].is_auto_proxy).to.equal(0);
      expect(inVotersTable).to.equal(true);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

})

