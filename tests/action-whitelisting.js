require('mocha')
config = require('../config.js');
const {expect} = require('chai')
const {newUser, fetchJson, callFioApi, callFioApiSigned, generateFioDomain, timeout} = require('../utils.js');
const {FIOSDK} = require('@fioprotocol/FIOSDK')

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

describe(`General addaction testing with random contracts and domains (can be run pre and post fork)`, () => {
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

  it(`addaction with 7 character action and 50 character contract succeeds.`, async () => {
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
    expect(result.processed.receipt.status).to.equal('executed');
  })

  it(`addaction with 7 character action and 1000 character contract succeeds.`, async () => {
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
    expect(result.processed.receipt.status).to.equal('executed');
  })

})


describe(`B. Test addaction error conditions`, () => {
  let newAction, newContract, newAction2, newContract2

  it(`Create users`, async () => {
    newAction = generateFioDomain(7);
    newContract = generateFioDomain(7);
    newAction2 = generateFioDomain(7);
    newContract2 = generateFioDomain(7);

    action_13 = generateFioDomain(13)  // Use as 13 character action
  })

  it(`addaction with empty action.  Returns Error: ${config.error2.invalidAction.type}: ${config.error2.invalidAction.message}`, async () => {
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
    //console.log('Result: ', result)
    expect(result.error.details[0].message).to.equal(config.error2.invalidAction.message);
    expect(result.code).to.equal(config.error2.invalidAction.type);
  })

  it(`addaction with empty contract.  Returns Error: ${config.error2.invalidContract.type}: ${config.error2.invalidContract.message}`, async () => {
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
    //console.log('Result: ', result.error)
    expect(result.error.details[0].message).to.equal(config.error2.invalidContract.message);
    expect(result.code).to.equal(config.error2.invalidContract.type);
  })

  it(`addaction with invalid actor.  Returns Error: ${config.error2.invalidActor.type}: ${config.error2.invalidActor.message} <invalidactor>`, async () => {
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
    expect(result.error.details[0].message).contains(config.error2.invalidActor.message);
    expect(result.code).to.equal(config.error2.invalidActor.type);
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
    //expect(result.code).to.equal(config.error2.invalidAction.type);
  })

  it('Wait a few seconds to avoid duplicate transaction.', async () => {
    await timeout(2000);
  })

  it(`addaction with existing action AND existing contract.  Returns Error: ${config.error2.accountExists.type}: ${config.error2.accountExists.message} <invalidactor>`, async () => {
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
    expect(result.code).to.equal(config.error2.accountExists.type);
  })

  it(`addaction with existing action but DIFFERENT contract. Returns Error: ${config.error2.invalidAction.type}: ${config.error2.invalidAction.message}`, async () => {
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
    expect(result.code).to.equal(config.error2.invalidAction.type);
  })

  it(`addaction with 13 character action and 7 character contract. Returns Error: ${config.error2.invalidAction.type}: ${config.error2.invalidAction.message}`, async () => {
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
    expect(result.code).to.equal(config.error2.invalidAction.type);
  })

})

describe(`C. get_actions paging tests`, () => {
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

  it(`Use floats in limit/offset. Expect error type ${config.error2.noActions.type}: ${config.error2.noActions.message}`, async () => {
    try {
      const json = {
        limit: 123.456,
        offset: 345.678
      }
      actionList = await callFioApi("get_actions", json);
      expect(actionList.status).to.equal(null);
    } catch (err) {
      //console.log('Error', err.error);
      expect(err.error.message).to.equal(config.error2.noActions.message);
      expect(err.statusCode).to.equal(config.error2.noActions.type);
    }
  })

})
