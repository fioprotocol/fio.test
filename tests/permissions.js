require('mocha')
const {expect} = require('chai')
const {getPermissions, newUser, fetchJson} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/FIOSDK')
config = require('../config.js');

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson)
})

describe('************************** permissions.js **************************', () => {})

describe.skip('TODO: A. Test transfer of permissions.', () => {

  let userA1

  it(`Create users`, async () => {
    userA1 = await newUser(faucet);
  })

  it(`Get permissions`, async () => {
    try {
      permissions = await getPermissions(userA1.publicKey);
      console.log('permission.active: ', permissions.active)
      //expect(total_bp_votes).to.equal(prev_total_bp_votes + proxyC1.fioBalance - lockAmount) 
    } catch (err) {
      console.log('Error: ', err)
    } 
  })

})

describe.skip('TODO: B. Apply investor permissions to lock type 3/4 foundation account', () => {

  let foundationB1, investorB1
  const lockType = 3 // 3 or 4

  it(`Create users`, async () => {
    foundationB1 = await newUser(faucet);
    investorB1 = await newUser(faucet);
  })

  it.skip(`Get foundationB1 FIO Balance`, async () => {
    try {
      const result = await foundationB1.sdk.genericAction('getFioBalance', {
        fioPublicKey: foundationB1.publicKey
      }) 
      foundationB1.fioBalance = result.balance;
      //console.log('foundationB1 fio balance', result)
      expect(result.balance).to.equal(proxyA1.last_vote_weight)
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`Apply Lock Type 3/4 to foundationB1 FIO balance`, async () => {
    try {
      let result = await addLock(foundationB1.account, foundationB1.fioBalance, lockType);
      //console.log('result:', result)
      expect(result).to.have.all.keys('transaction_id', 'processed')
    } catch (err) {
      console.log('Error: ', err.json)
    } 
  })


})
