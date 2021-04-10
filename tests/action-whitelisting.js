require('mocha')
const {expect} = require('chai')
const {newUser, fetchJson, callFioApi, callFioApiSigned, generateFioDomain, timeout} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
config = require('../config.js');

/**
 * Whitelisting does not work with the eosio account
 *
const eosio = {
  account: 'eosio',
  publicKey: 'FIO7isxEua78KPVbGzKemH4nj2bWE52gqj8Hkac3tc7jKNvpfWzYS',
  privateKey: '5KBX1dwHME4VyuUss2sYM25D5ZTDvyYrbEz37UJqwAVAsR4tGuY'
}
*/

const fiotoken = {
  account: 'fio.token',
  publicKey: 'FIO7isxEua78KPVbGzKemH4nj2bWE52gqj8Hkac3tc7jKNvpfWzYS',
  privateKey: '5KBX1dwHME4VyuUss2sYM25D5ZTDvyYrbEz37UJqwAVAsR4tGuY'
}

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
})

describe(`************************** action-whitelisting.js ************************** \n    A. Remove action, add action, action testing `, () => {
  let userA1, userA2
  const fundsAmount = 1000000000

  it(`Create users`, async () => {
      userA1 = await newUser(faucet);
  })

  it(`remove action .`, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'remaction',
        account: 'eosio',
        actor: fiotoken.account,
        privKey: fiotoken.privateKey,
        data: {
          action: 'trnsfiopubky',
          actor: fiotoken.account
        }
      })
      //console.log('Result: ', result)
      expect(result.processed.receipt.status).to.equal('executed');
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`action not found test, Transfer FIO to userA1 FIO public key`, async () => {
    try{
      const result = await faucet.genericAction('transferTokens', {
        payeeFioPublicKey: userA1.publicKey,
        amount: fundsAmount,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        technologyProviderId: ''
      })
      console.log('Result: ', result)
      expect(result).to.equal(null);
    } catch (err) {
    //  console.log("err.json ", err.json);
        expect(err.json.error.what).to.equal('Action validate exception');
        expect(err.json.code).to.equal(500);
    }
  })

  it(`addaction trnsfiopubky.`, async () => {
    try{
      const result = await callFioApiSigned('push_transaction', {
        action: 'addaction',
        account: 'eosio',
        actor: fiotoken.account,
        privKey: fiotoken.privateKey,
        data: {
          action: 'trnsfiopubky',
          contract: 'fio.token',
          actor: fiotoken.account
        }
      })
      //console.log('Result: ', result)
      expect(result.processed.receipt.status).to.equal('executed');
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`confirm success after addaction: Transfer FIO to userA1 FIO public key`, async () => {
    try{
      const result = await faucet.genericAction('transferTokens', {
        payeeFioPublicKey: userA1.publicKey,
        amount: fundsAmount,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        technologyProviderId: ''
      })
      //console.log('Result: ', result.status)
      expect(result.status).to.equal('OK');
    } catch (err) {
    //  console.log("err.json ", err.json);
        expect(err).to.equal(null);
    }
  })

  it(`Confirm create users works`, async () => {
    userA2 = await newUser(faucet);
  })

})

describe('A.2. Add random action hoses up the SDK session. Non recoverable. So, only run addaction as a separate test.', () => {
  let user1, user2, user3, newAction, newContract

  it(`Create users`, async () => {
    try {
      user1 = await newUser(faucet);
      newAction = generateFioDomain(7);
      newContract = generateFioDomain(7);
    } catch (err) {
      console.log('Err: ', err)
      expect(err).to.equal(null);
    }
  })

  it('addaction with random action and contract name succeeds.', async () => {
    const result = await callFioApiSigned('push_transaction', {
      action: 'addaction',
      account: 'eosio',
      actor: fiotoken.account,
      privKey: fiotoken.privateKey,
      data: {
        action: newAction,
        contract: newContract,
        actor: fiotoken.account,
      }
    })
     //console.log('Result: ', result)
     expect(result.processed.receipt.status).to.equal('executed');
  })

  it('Wait a few seconds.', async () => {
    await timeout(5000);
  })

  it(`Create users`, async () => {
    try {
      user2 = await newUser(faucet);
    } catch (err) {
      console.log('Err: ', err)
      expect(err).to.equal(null);
    }
  })

})

describe(`B. General addaction testing with random contracts and domains (can be run pre and post fork)`, () => {
  let newAction, newContract, newAction2

  it(`Create users`, async () => {
    newAction = generateFioDomain(7);
    newAction2 = generateFioDomain(7);
    newContract = generateFioDomain(7);

    contract_50 = generateFioDomain(50) // Use as random 50 character contract
    contract_1000 = generateFioDomain(1000) // Use as random 50 character contract
  })

  it(`addaction with random action and contract name succeeds.`, async () => {
    const result = await callFioApiSigned('push_transaction', {
      action: 'addaction',
      account: 'eosio',
      actor: fiotoken.account,
      privKey: fiotoken.privateKey,
      data: {
        action: newAction,
        contract: newContract,
        actor: fiotoken.account
      }
    })
     //console.log('Result: ', result)
     expect(result.processed.receipt.status).to.equal('executed');
  })

  it('Call get_actions and confirm action is in table', async () => {
    try {
      const json = {
        //limit: 100,
        //offset: 0
      }
      actionList = await callFioApi("get_actions", json);
      //console.log('actions: ', actions);
      let found = false;
      for (action in actionList.actions) {
        if (actionList.actions[action].action == newAction) {
          found = true;
        }
      }
      expect(found).to.equal(true);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`addaction with 7 character action and 50 character contract FAILS.`, async () => {
    const result = await callFioApiSigned('push_transaction', {
      action: 'addaction',
      account: 'eosio',
      actor: fiotoken.account,
      privKey: fiotoken.privateKey,
      data: {
        action: newAction + 'a',
        contract: contract_50,
        actor: fiotoken.account
      }
    })
    //console.log('Result: ', result)
    expect(result.code).to.equal(config.error2.invalidContract.statusCode);
  })

  it(`addaction with 7 character action and 1000 character contract FAILS.`, async () => {
    const result = await callFioApiSigned('push_transaction', {
      action: 'addaction',
      account: 'eosio',
      actor: fiotoken.account,
      privKey: fiotoken.privateKey,
      data: {
        action: newAction + 'b',
        contract: contract_1000,
        actor: fiotoken.account
      }
    })
    //console.log('Result: ', result)
    expect(result.code).to.equal(config.error2.invalidContract.statusCode);
  })

})

describe(`C. Test addaction error conditions`, () => {
  let newAction, newContract, newAction2, newContract2

  it(`Create users`, async () => {
    newAction = generateFioDomain(7);
    newContract = generateFioDomain(7);
    newAction2 = generateFioDomain(7);
    newContract2 = generateFioDomain(7);

    action_13 = 'eddie1233213a' // Use as 13 character name string
  })

  it(`addaction with empty action.  Returns Error: ${config.error2.invalidAction.statusCode}: ${config.error2.invalidAction.message}`, async () => {
    const result = await callFioApiSigned('push_transaction', {
      action: 'addaction',
      account: 'eosio',
      actor: fiotoken.account,
      privKey: fiotoken.privateKey,
      data: {
        action: '',
        contract: newContract,
        actor: fiotoken.account
      }
    })
   // console.log('Result: ', result)
    expect(result.error.details[0].message).to.equal(config.error2.invalidAction.message);
    expect(result.code).to.equal(config.error2.invalidAction.statusCode);
  })

  it(`addaction with empty contract.  Returns Error: ${config.error2.invalidContract.statusCode}: ${config.error2.invalidContract.message}`, async () => {
    const result = await callFioApiSigned('push_transaction', {
      action: 'addaction',
      account: 'eosio',
      actor: fiotoken.account,
      privKey: fiotoken.privateKey,
      data: {
        action: newAction,
        contract: '',
        actor: fiotoken.account
      }
    })
   // console.log('Result: ', result.error)
    expect(result.error.details[0].message).to.equal(config.error2.invalidContract.message);
    expect(result.code).to.equal(config.error2.invalidContract.statusCode);
  })

  it(`addaction with invalid actor.  Returns Error: 500: 'missing authority of otheractor'`, async () => {
    const result = await callFioApiSigned('push_transaction', {
      action: 'addaction',
      account: 'eosio',
      actor: fiotoken.account,
      privKey: fiotoken.privateKey,
      data: {
        action: newAction,
        contract: newContract,
        actor: 'otheractor'
      }
    })
    //console.log('Result: ', result)
    expect(result.error.details[0].message).contains('missing authority of otheractor');
    expect(result.code).to.equal(500);
  })

  it(`addaction with 7 character action and contract name succeeds.`, async () => {
    const result = await callFioApiSigned('push_transaction', {
      action: 'addaction',
      account: 'eosio',
      actor: fiotoken.account,
      privKey: fiotoken.privateKey,
      data: {
        action: newAction,
        contract: newContract,
        actor: fiotoken.account
      }
    })
    //console.log('Result: ', result.processed.action_traces)
    //expect(result.error.details[0].message).to.equal(config.error2.invalidAction.message);
    //expect(result.code).to.equal(config.error2.invalidAction.statusCode);
  })

  it('Wait a few seconds to avoid duplicate transaction.', async () => {
    await timeout(2000);
  })

  it(`addaction with existing action AND existing contract.  Returns Error: ${config.error2.accountExists.statusCode}: ${config.error2.accountExists.message} <invalidactor>`, async () => {
    const result = await callFioApiSigned('push_transaction', {
      action: 'addaction',
      account: 'eosio',
      actor: fiotoken.account,
      privKey: fiotoken.privateKey,
      data: {
        action: newAction,
        contract: newContract,
        actor: fiotoken.account
      }
    })
    //console.log('Result: ', result)
    expect(result.error.what).contains(config.error2.accountExists.message);
    expect(result.code).to.equal(config.error2.accountExists.statusCode);
  })

  it(`addaction with existing action but DIFFERENT contract. Returns Error: ${config.error2.invalidAction.statusCode}: ${config.error2.invalidAction.message}`, async () => {
    const result = await callFioApiSigned('push_transaction', {
      action: 'addaction',
      account: 'eosio',
      actor: fiotoken.account,
      privKey: fiotoken.privateKey,
      data: {
        action: newAction,
        contract: newContract2,
        actor: fiotoken.account
      }
    })
    //console.log('Result: ', result)
    expect(result.error.details[0].message).to.equal(config.error2.invalidAction.message);
    expect(result.code).to.equal(config.error2.invalidAction.statusCode);
  })

  it(`addaction with 13 character action and 7 character contract. Returns Error: ${config.error2.invalidAction.statusCode}: ${config.error2.invalidAction.message}`, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'addaction',
        account: 'eosio',
        actor: fiotoken.account,
        privKey: fiotoken.privateKey,
        data: {
          action: action_13,
          contract: newContract,
          actor: fiotoken.account
        }
      })

    //console.log('Result: ', result.error.details)
    expect(result.error.details[0].message).to.equal(config.error2.invalidAction.message);
    expect(result.code).to.equal(config.error2.invalidAction.statusCode);
    } catch (err) {
      console.log('Error: ', err)
    }
  })

})

describe(`D. General remaction testing `, () => {

  let newAction, newContract

  it(`Create users`, async () => {
    newAction = generateFioDomain(7);
    newContract = generateFioDomain(7);
  })

  it('addaction with random action and contract name succeeds.', async () => {
    const result = await callFioApiSigned('push_transaction', {
      action: 'addaction',
      account: 'eosio',
      actor: fiotoken.account,
      privKey: fiotoken.privateKey,
      data: {
        action: newAction,
        contract: newContract,
        actor: fiotoken.account,
      }
    })
      //console.log('Result: ', result)
      expect(result.processed.receipt.status).to.equal('executed');
  })

  it(`remaction of new action succeeds.`, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'remaction',
        account: 'eosio',
        actor: fiotoken.account,
        privKey: fiotoken.privateKey,
        data: {
          action: newAction,
          actor: fiotoken.account
        }
      })
      expect(result.processed.receipt.status).to.equal('executed');
    } catch (err) {
      console.log('Error', err);
     expect(err).to.equal(null);
    }
  })

  it(`Wait a few seconds.`, async () => { await timeout(5000) })

  it(`remaction of same action fails`, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'remaction',
        account: 'eosio',
        actor: fiotoken.account,
        privKey: fiotoken.privateKey,
        data: {
          action: newAction,
          actor: fiotoken.account
        }
      })
      //console.log('Result', result);
      expect(result).to.equal(null);
    } catch (err) {
      //console.log('Error', err.actual.error.details);
      expect(err.actual.code).to.equal(500);
      expect(err.actual.error.details[0].message).to.equal('Action invalid or not found');
    }
  })

  it('Call get_actions and confirm action is gone', async () => {
    try {
      const json = {
        //limit: 100,
        //offset: 0
      }
      actionList = await callFioApi("get_actions", json);
      //console.log('actions: ', actions);
      let found = false;
      for (action in actionList.actions) {
        if (actionList.actions[action].action == newAction) {
          found = true;
        }
      }
      expect(found).to.equal(false);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`remaction of non-existent action fails, action not found.`, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'remaction',
        account: 'eosio',
        actor: fiotoken.account,
        privKey: fiotoken.privateKey,
        data: {
          action: "boggle",
          actor: fiotoken.account
        }
      })
    //  console.log("Result: ", result);
      expect(result.error.what).contains(config.error2.accountExists.message);
      expect(result.code).to.equal(config.error2.accountExists.statusCode);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })
  it(`remaction with invalid actor.  Returns Error: 500: Missing required authority`, async () => {
    const result = await callFioApiSigned('push_transaction', {
      action: 'remaction',
      account: 'eosio',
      actor: fiotoken.account,
      privKey: fiotoken.privateKey,
      data: {
        action: newAction,
        contract: newContract,
        actor: 'otheractor'
      }
    })
    //console.log('Result: ', result)
    expect(result.error.what).contains('Missing required authority');
    expect(result.code).to.equal(500);
  })

})

describe(`E. get_actions paging tests`, () => {
  let newAction, newContract, currentCount

  it(`Create users`, async () => {
    newAction = generateFioDomain(7);
    newContract = generateFioDomain(7);
  })

  it('Call get_actions to get initial count', async () => {
    try {
      const json = { }
      actionList = await callFioApi("get_actions", json);
      currentCount = actionList.actions.length
      expect(currentCount).to.greaterThan(0);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`addaction with random action and contract name succeeds.`, async () => {
    const result = await callFioApiSigned('push_transaction', {
      action: 'addaction',
      account: 'eosio',
      actor: fiotoken.account,
      privKey: fiotoken.privateKey,
      data: {
        action: newAction,
        contract: newContract,
        actor: fiotoken.account
      }
    })
     //console.log('Result: ', result)
     expect(result.processed.receipt.status).to.equal('executed');
  })

  it(`Call (get_actions, no limit param, no offset param). Expect additional action`, async () => {
    try {
      const json = { }
      actionList = await callFioApi("get_actions", json);
      oldCount = currentCount;
      currentCount = actionList.actions.length
      expect(currentCount).to.equal(oldCount + 1);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Call (get_actions, limit=1, offset=0). Expect 1 request.`, async () => {
    try {
      const json = {
        limit: 1,
        offset: 0
      }
      actionList = await callFioApi("get_actions", json);
      expect(actionList.actions.length).to.equal(1);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Call (get_actions, limit=2, offset=4). Expect 2 requests.`, async () => {
    try {
      const json = {
        limit: 2,
        offset: 4
      }
      actionList = await callFioApi("get_actions", json);
      expect(actionList.actions.length).to.equal(2);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Call (get_actions, limit=10, offset=15). Expect 10 requests.`, async () => {
    try {
      const json = {
        limit: 10,
        offset: 15
      }
      actionList = await callFioApi("get_actions", json);
      expect(actionList.actions.length).to.equal(10);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Negative offset. Call (get_actions, limit=1, offset=-1). Expect error type 400: ${config.error.invalidOffset}`, async () => {
    try {
      const json = {
        limit: 1,
        offset: -1
      }
      actionList = await callFioApi("get_actions", json);
      expect(actionList.status).to.equal(null);
    } catch (err) {
      //console.log('Error', err.error);
      expect(err.error.fields[0].error).to.equal(config.error.invalidOffset);
      expect(err.statusCode).to.equal(400);
    }
  })

  it(`Negative limit. Call (get_actions, limit=-5, offset=5). Expect error type 400: ${config.error.invalidLimit}`, async () => {
    try {
      const json = {
        limit: -5,
        offset: 5
      }
      actionList = await callFioApi("get_actions", json);
      expect(actionList.status).to.equal(null);
    } catch (err) {
      //console.log('Error', err.error);
      expect(err.error.fields[0].error).to.equal(config.error.invalidLimit);
      expect(err.statusCode).to.equal(400);
    }
  })

  it(`Send string to limit/offset. Expect error type 500: ${config.error.parseError}`, async () => {
    try {
      const json = {
        limit: "string",
        offset: "string2"
      }
      actionList = await callFioApi("get_actions", json);
      expect(actionList.status).to.equal(null);
    } catch (err) {
      //console.log('Error', err.error.error);
      expect(err.error.error.what).to.equal(config.error.parseError);
      expect(err.error.code).to.equal(500);
    }
  })

  it(`Use floats in limit/offset. Expect error type ${config.error2.noActions.statusCode}: ${config.error2.noActions.message}`, async () => {
    try {
      const json = {
        limit: 123.456,
        offset: 345.678
      }
      actionList = await callFioApi("get_actions", json);
      expect(actionList.status).to.equal(undefined);
    } catch (err) {
      //console.log('Error', err.error);
      expect(err.error.message).to.equal(config.error2.noActions.message);
      expect(err.statusCode).to.equal(config.error2.noActions.statusCode);
    }
  })

})

/* run this test to verify performance only..otherwise leave it commented out
describe(`F. Test addaction perf`, () => {

  let findit;
  for ( j=0;j<500;j++)
  {
    it(`Create users`, async () => {
      newAction = generateFioDomain(7);
      newContract = generateFioDomain(7);
      findit= newAction;
    })


    it(`addaction.`, async () => {
      const result = await callFioApiSigned('push_transaction', {
        action: 'addaction',
        account: 'eosio',
        actor: fiotoken.account,
        privKey: fiotoken.privateKey,
        data: {
          action: newAction,
          contract: newContract,
          actor: fiotoken.account
        }
      })
      //console.log('Result: ', result.processed.action_traces)
      //expect(result.error.details[0].message).to.equal(config.error2.invalidAction.message);
      //expect(result.code).to.equal(config.error2.invalidAction.statusCode);
    })
  }

  it('Call get_actions and confirm action is in table', async () => {
    try {
      const json = {
        //limit: 100,
        //offset: 0
      }
      actionList = await callFioApi("get_actions", json);
      //console.log('actions: ', actions);
      let found = false;
      for (action in actionList.actions) {
        if (actionList.actions[action].action == findit) {
          found = true;
        }
      }
      expect(found).to.equal(true);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })
})
*/
