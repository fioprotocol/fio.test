require('mocha')
const {expect} = require('chai')
const { newUser, callFioApi, generateFioAddress, generateFioDomain, fetchJson} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
config = require('../config.js');

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson)
})

/**
 * Important notes:
 * 
 * BP fees for FIO Address and Domain Registration go into bpbucketpool (which is distributed over 365 days).
 * BP fees for all other transactions goes into bprewards.
 * 
*/

// v2.6.x
const foundationRewardPercent = '0.05',
  tpidRewardPercent = '0.1',
  tpidNewuserbountyPercent = '0.4',
  tpidPlusNewuserbountyPercent = '0.5',   // New user bounty is for ALL fees, not just regaddress and regdomain
  bpRewardPercent = '0.6',
  bpRewardNoTpidPercent = '0.7',     // If no TPID is sent, the tpidRewardPercent goes to the bp bucket
  stakingRewardPercent = '0.25';
  
const tpid = 'bp1@dapixdev';   // TPID hash = 0x7916edce0b58512453e0e94d9ad67c46

describe('************************** fee-distribution.js ************************** \n    Test transfer_tokens_pub_key fee distribution (with TPID)', () => {
  let user1, user2, foundationBalance, tpidBalance, tpidBounty, stakingBalance, bpBalance, endpoint_fee, feeCollected
  
  const endpoint = "transfer_tokens_pub_key"
  const transferAmount = 1000000000   // 1 FIO

  it(`Create users`, async () => {
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
  })

  it(`Get balance for user1`, async () => {
    try {
      const result = await user1.sdk.genericAction('getFioBalance', {
        fioPublicKey: user1.publicKey
      })
      user1PrevBalance = result.balance
      //console.log('user1 fio balance', result)
    } catch (err) {
      //console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`Get current foundation rewards`, async () => {
    try {
      const json = {
        json: true,
        code: 'fio.treasury',
        scope: 'fio.treasury',
        table: 'fdtnrewards',
        limit: 10,
        reverse: false
      }
      result = await callFioApi("get_table_rows", json);
      foundationBalance = result.rows[0].rewards;
      //console.log('foundationBalance: ', foundationBalance);
      expect(foundationBalance).to.greaterThan(0);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Get current bprewards`, async () => {
    try {
      const json = {
        json: true,
        code: 'fio.treasury',
        scope: 'fio.treasury',
        table: 'bprewards',
        limit: 10,
        reverse: false
      }
      result = await callFioApi("get_table_rows", json);
      bpBalance = result.rows[0].rewards;
      //console.log('bpBalance: ', bpBalance);
      expect(bpBalance).to.greaterThan(0);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Get current tpid bounties table`, async () => {
    try {
      const json = {
        json: true,
        code: 'fio.tpid',
        scope: 'fio.tpid',
        table: 'bounties',
        limit: 10,
        reverse: false
      }
      result = await callFioApi("get_table_rows", json);
      tpidBounty = result.rows[0].tokensminted;
      //console.log('tpidBounty: ', tpidBounty);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Get current rewards balance for the TPID`, async () => {
    tpidBalance = null;
    try {
      const json = {
        json: true,
        code: 'fio.tpid',
        scope: 'fio.tpid',
        table: 'tpids',
        limit: 10,
        reverse: false
      }
      result = await callFioApi("get_table_rows", json);
      //console.log('result: ', result);
      for (request in result.rows) {
        if (result.rows[request].fioaddress == tpid) {
          //console.log('TPID: ', result.rows[request].fioaddress);
          tpidBalance = result.rows[request].rewards;
          break;
        }
      }
      if (tpidBalance == null) {
        console.log('TPID not found: ', tpid)
      }
      //console.log('tpidBounty: ', tpidBounty);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Get current staking rewards`, async () => {
    try {
      const json = {
        json: true,
        code: 'fio.staking',
        scope: 'fio.staking',
        table: 'staking',
        limit: 10,
        reverse: false
      }
      result = await callFioApi("get_table_rows", json);
      stakingBalance = result.rows[0].rewards_token_pool;
      //console.log('stakingBalance: ', stakingBalance);
      expect(stakingBalance).to.greaterThan(0);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it('Get endpoint fee', async () => {
    try {
      result = await user1.sdk.getFee(endpoint);
      endpoint_fee = result.fee;
      //console.log('endpoint_fee: ', endpoint_fee)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it('Test: transferTokens. Transfer FIO from user1 to user2', async () => {
    try {
      const result = await user1.sdk.genericAction('transferTokens', {
        payeeFioPublicKey: user2.publicKey,
        amount: transferAmount,
        maxFee: endpoint_fee,
        technologyProviderId: tpid
      })
      //console.log('Result: ', result)
      feeCollected = result.fee_collected;
      expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected')
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  })

  it(`Confirm fee collected > 0`, async () => {
    expect(feeCollected).to.greaterThan(0)
  })

  it(`Get updated foundation rewards. Expect increase of ${foundationRewardPercent} * fee`, async () => {
    const balancePrev = foundationBalance;
    try {
      const json = {
        json: true,
        code: 'fio.treasury',
        scope: 'fio.treasury',
        table: 'fdtnrewards',
        limit: 10,
        reverse: false
      }
      result = await callFioApi("get_table_rows", json);
      const balance = result.rows[0].rewards;
      //console.log('balance: ', balance);
      percentDiff = (balance - balancePrev) / endpoint_fee;
      percentDiffRnd = percentDiff.toFixed(2);
      expect(percentDiffRnd).to.equal(foundationRewardPercent);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Get updated bprewards. Expect increase of ${bpRewardPercent} * fee`, async () => {
    const balancePrev = bpBalance;
    try {
      const json = {
        json: true,
        code: 'fio.treasury',
        scope: 'fio.treasury',
        table: 'bprewards',
        limit: 10,
        reverse: false
      }
      result = await callFioApi("get_table_rows", json);
      const balance = result.rows[0].rewards;
      //console.log('balance: ', balance);
      percentDiff = (balance - balancePrev) / endpoint_fee;
      percentDiffRnd = percentDiff.toFixed(1);
      expect(percentDiffRnd).to.equal(bpRewardPercent);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Get updated balance in tpid bounties table. Expect increase of ${tpidNewuserbountyPercent} * fee`, async () => {
    const balancePrev = tpidBounty;
    try {
      const json = {
        json: true,
        code: 'fio.tpid',
        scope: 'fio.tpid',
        table: 'bounties',
        limit: 10,
        reverse: false
      }
      result = await callFioApi("get_table_rows", json);
      const balance = result.rows[0].tokensminted;
      //console.log('balance: ', balance);
      percentDiff = (balance - balancePrev) / endpoint_fee;
      percentDiffRnd = percentDiff.toFixed(1);
      expect(percentDiffRnd).to.equal(tpidNewuserbountyPercent);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Get udpated rewards balance for the TPID. Expect increase of ${tpidRewardPercent} + ${tpidNewuserbountyPercent} * fee`, async () => {
    const balancePrev = tpidBalance;
    let balance;
    try {
      const json = {
        json: true,
        code: 'fio.tpid',
        scope: 'fio.tpid',
        table: 'tpids',
        limit: 10,
        reverse: false
      }
      result = await callFioApi("get_table_rows", json);
      //console.log('result: ', result);
      for (request in result.rows) {
        if (result.rows[request].fioaddress == tpid) {
          //console.log('TPID: ', result.rows[request].fioaddress);
          balance = result.rows[request].rewards;
          break;
        }
      }
      percentDiff = (balance - balancePrev) / endpoint_fee;
      percentDiffRnd = percentDiff.toFixed(1);
      expect(percentDiffRnd).to.equal(tpidPlusNewuserbountyPercent);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Get updated staking rewards. Expect increase of ${stakingRewardPercent} * fee`, async () => {
    let balancePrev = stakingBalance;
    try {
      const json = {
        json: true,
        code: 'fio.staking',
        scope: 'fio.staking',
        table: 'staking',
        limit: 10,
        reverse: false
      }
      result = await callFioApi("get_table_rows", json);
      balance = result.rows[0].rewards_token_pool;
      //console.log('balance: ', balance);
      percentDiff = (balance - balancePrev) / endpoint_fee;
      percentDiffRnd = percentDiff.toFixed(2);
      expect(percentDiffRnd).to.equal(stakingRewardPercent);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

})

describe('Test transfer_tokens_pub_key fee distribution (NO TPID)', () => {
  let user1, user2, foundationBalance, tpidBounty, stakingBalance, bpBalance, endpoint_fee, feeCollected
  
  const endpoint = "transfer_tokens_pub_key"
  const transferAmount = 1000000000   // 1 FIO

  it(`Create users`, async () => {
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
  })

  it(`Get balance for user1`, async () => {
    try {
      const result = await user1.sdk.genericAction('getFioBalance', {
        fioPublicKey: user1.publicKey
      })
      user1PrevBalance = result.balance
      //console.log('user1 fio balance', result)
    } catch (err) {
      //console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`Get current foundation rewards`, async () => {
    try {
      const json = {
        json: true,
        code: 'fio.treasury',
        scope: 'fio.treasury',
        table: 'fdtnrewards',
        limit: 10,
        reverse: false
      }
      result = await callFioApi("get_table_rows", json);
      foundationBalance = result.rows[0].rewards;
      //console.log('foundationBalance: ', foundationBalance);
      expect(foundationBalance).to.greaterThan(0);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Get current bprewards`, async () => {
    try {
      const json = {
        json: true,
        code: 'fio.treasury',
        scope: 'fio.treasury',
        table: 'bprewards',
        limit: 10,
        reverse: false
      }
      result = await callFioApi("get_table_rows", json);
      bpBalance = result.rows[0].rewards;
      //console.log('bpBalance: ', bpBalance);
      expect(bpBalance).to.greaterThan(0);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Get current tpid rewards`, async () => {
    try {
      const json = {
        json: true,
        code: 'fio.tpid',
        scope: 'fio.tpid',
        table: 'bounties',
        limit: 10,
        reverse: false
      }
      result = await callFioApi("get_table_rows", json);
      tpidBounty = result.rows[0].tokensminted;
      //console.log('tpidBounty: ', tpidBounty);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Get current rewards balance for the TPID`, async () => {
    tpidBalance = null;
    try {
      const json = {
        json: true,
        code: 'fio.tpid',
        scope: 'fio.tpid',
        table: 'tpids',
        limit: 10,
        reverse: false
      }
      result = await callFioApi("get_table_rows", json);
      //console.log('result: ', result);
      for (request in result.rows) {
        if (result.rows[request].fioaddress == tpid) {
          //console.log('TPID: ', result.rows[request].fioaddress);
          tpidBalance = result.rows[request].rewards;
          break;
        }
      }
      if (tpidBalance == null) {
        console.log('TPID not found: ', tpid)
      }
      //console.log('tpidBounty: ', tpidBounty);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Get current staking rewards`, async () => {
    try {
      const json = {
        json: true,
        code: 'fio.staking',
        scope: 'fio.staking',
        table: 'staking',
        limit: 10,
        reverse: false
      }
      result = await callFioApi("get_table_rows", json);
      stakingBalance = result.rows[0].rewards_token_pool;
      //console.log('stakingBalance: ', stakingBalance);
      expect(stakingBalance).to.greaterThan(0);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it('Get endpoint fee', async () => {
    try {
      result = await user1.sdk.getFee(endpoint);
      endpoint_fee = result.fee;
      //console.log('endpoint_fee: ', endpoint_fee)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it('Test: transferTokens. Transfer FIO from user1 to user2', async () => {
    try {
      const result = await user1.sdk.genericAction('transferTokens', {
        payeeFioPublicKey: user2.publicKey,
        amount: transferAmount,
        maxFee: endpoint_fee,
        technologyProviderId: ''
      })
      //console.log('Result: ', result)
      feeCollected = result.fee_collected;
      expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected')
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  })

  it(`Confirm fee collected > 0`, async () => {
    expect(feeCollected).to.greaterThan(0)
  })

  it(`Get updated foundation rewards. Expect increase of ${foundationRewardPercent} * fee`, async () => {
    const balancePrev = foundationBalance;
    try {
      const json = {
        json: true,
        code: 'fio.treasury',
        scope: 'fio.treasury',
        table: 'fdtnrewards',
        limit: 10,
        reverse: false
      }
      result = await callFioApi("get_table_rows", json);
      const balance = result.rows[0].rewards;
      //console.log('balance: ', balance);
      percentDiff = (balance - balancePrev) / endpoint_fee;
      percentDiffRnd = percentDiff.toFixed(2);
      expect(percentDiffRnd).to.equal(foundationRewardPercent);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Get updated bprewards. Expect increase of ${bpRewardNoTpidPercent} * fee`, async () => {
    const balancePrev = bpBalance;
    try {
      const json = {
        json: true,
        code: 'fio.treasury',
        scope: 'fio.treasury',
        table: 'bprewards',
        limit: 10,
        reverse: false
      }
      result = await callFioApi("get_table_rows", json);
      const balance = result.rows[0].rewards;
      //console.log('balance: ', balance);
      percentDiff = (balance - balancePrev) / endpoint_fee;
      percentDiffRnd = percentDiff.toFixed(1);
      expect(percentDiffRnd).to.equal(bpRewardNoTpidPercent);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Get updated tpid balance. Expect no increase.`, async () => {
    const balancePrev = tpidBounty;
    try {
      const json = {
        json: true,
        code: 'fio.tpid',
        scope: 'fio.tpid',
        table: 'bounties',
        limit: 10,
        reverse: false
      }
      result = await callFioApi("get_table_rows", json);
      const balance = result.rows[0].tokensminted;
      //console.log('balance: ', balance);
      percentDiff = (balance - balancePrev) / endpoint_fee;
      percentDiffRnd = percentDiff.toFixed(1);
      expect(percentDiffRnd).to.equal('0.0');
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Get udpated rewards balance for the TPID. Expect no increase.`, async () => {
    const balancePrev = tpidBalance;
    let balance;
    try {
      const json = {
        json: true,
        code: 'fio.tpid',
        scope: 'fio.tpid',
        table: 'tpids',
        limit: 10,
        reverse: false
      }
      result = await callFioApi("get_table_rows", json);
      //console.log('result: ', result);
      for (request in result.rows) {
        if (result.rows[request].fioaddress == tpid) {
          //console.log('TPID: ', result.rows[request].fioaddress);
          balance = result.rows[request].rewards;
          break;
        }
      }
      percentDiff = (balance - balancePrev) / endpoint_fee;
      percentDiffRnd = percentDiff.toFixed(1);
      expect(percentDiffRnd).to.equal('0.0');
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Get updated staking rewards. Expect increase of ${stakingRewardPercent} * fee`, async () => {
    let balancePrev = stakingBalance;
    try {
      const json = {
        json: true,
        code: 'fio.staking',
        scope: 'fio.staking',
        table: 'staking',
        limit: 10,
        reverse: false
      }
      result = await callFioApi("get_table_rows", json);
      balance = result.rows[0].rewards_token_pool;
      //console.log('balance: ', balance);
      percentDiff = (balance - balancePrev) / endpoint_fee;
      percentDiffRnd = percentDiff.toFixed(2);
      expect(percentDiffRnd).to.equal(stakingRewardPercent);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

})


describe('Test register_fio_address fee distribution', () => {
  let user1, foundationBalance, tpidBounty, stakingBalance, bpBalance, endpoint_fee, feeCollected

  const endpoint = "register_fio_address"

  it(`Create users`, async () => {
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
  })

  it(`Get balance for user1`, async () => {
    try {
      const result = await user1.sdk.genericAction('getFioBalance', {
        fioPublicKey: user1.publicKey
      })
      user1PrevBalance = result.balance
      //console.log('user1 fio balance', result)
    } catch (err) {
      //console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`Get current foundation rewards`, async () => {
    try {
      const json = {
        json: true,
        code: 'fio.treasury',
        scope: 'fio.treasury',
        table: 'fdtnrewards',
        limit: 10,
        reverse: false
      }
      result = await callFioApi("get_table_rows", json);
      foundationBalance = result.rows[0].rewards;
      //console.log('foundationBalance: ', foundationBalance);
      expect(foundationBalance).to.greaterThan(0);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Get current bpbucketpool (since FIO Address fees go into 365 day buckets)`, async () => {
    try {
      const json = {
        json: true,
        code: 'fio.treasury',
        scope: 'fio.treasury',
        table: 'bpbucketpool',
        limit: 10,
        reverse: false
      }
      result = await callFioApi("get_table_rows", json);
      bpBalance = result.rows[0].rewards;
      //console.log('bpBalance: ', bpBalance);
      expect(bpBalance).to.greaterThan(0);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Get current tpid rewards`, async () => {
    try {
      const json = {
        json: true,
        code: 'fio.tpid',
        scope: 'fio.tpid',
        table: 'bounties',
        limit: 10,
        reverse: false
      }
      result = await callFioApi("get_table_rows", json);
      tpidBounty = result.rows[0].tokensminted;
      //console.log('tpidBounty: ', tpidBounty);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Get current rewards balance for the TPID`, async () => {
    tpidBalance = null;
    try {
      const json = {
        json: true,
        code: 'fio.tpid',
        scope: 'fio.tpid',
        table: 'tpids',
        limit: 10,
        reverse: false
      }
      result = await callFioApi("get_table_rows", json);
      //console.log('result: ', result);
      for (request in result.rows) {
        if (result.rows[request].fioaddress == tpid) {
          //console.log('TPID: ', result.rows[request].fioaddress);
          tpidBalance = result.rows[request].rewards;
          break;
        }
      }
      if (tpidBalance == null) {
        console.log('TPID not found: ', tpid)
      }
      //console.log('tpidBounty: ', tpidBounty);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Get current staking rewards`, async () => {
    try {
      const json = {
        json: true,
        code: 'fio.staking',
        scope: 'fio.staking',
        table: 'staking',
        limit: 10,
        reverse: false
      }
      result = await callFioApi("get_table_rows", json);
      stakingBalance = result.rows[0].rewards_token_pool;
      //console.log('stakingBalance: ', stakingBalance);
      expect(stakingBalance).to.greaterThan(0);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it('Get endpoint fee', async () => {
    try {
      result = await user1.sdk.getFee(endpoint);
      endpoint_fee = result.fee;
      //console.log('endpoint_fee: ', endpoint_fee)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Test: registerFioAddress`, async () => {
    try {
      newFioAddress = generateFioAddress(user1.domain, 15)
      const result = await user1.sdk.genericAction('registerFioAddress', {
        fioAddress: newFioAddress,
        maxFee: endpoint_fee,
        technologyProviderId: 'bp1@dapixdev'
      });
      //console.log('Result: ', result)
      feeCollected = result.fee_collected;
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  });

  it(`Confirm fee collected > 0`, async () => {
    expect(feeCollected).to.greaterThan(0)
  })

  it(`Get updated foundation rewards. Expect increase of ${foundationRewardPercent} * fee`, async () => {
    const balancePrev = foundationBalance;
    try {
      const json = {
        json: true,
        code: 'fio.treasury',
        scope: 'fio.treasury',
        table: 'fdtnrewards',
        limit: 10,
        reverse: false
      }
      result = await callFioApi("get_table_rows", json);
      const balance = result.rows[0].rewards;
      //console.log('balance: ', balance);
      percentDiff = (balance - balancePrev) / endpoint_fee;
      percentDiffRnd = percentDiff.toFixed(2);
      expect(percentDiffRnd).to.equal(foundationRewardPercent);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Get updated bpbucketpool. Expect increase of ${bpRewardPercent} * fee`, async () => {
    const balancePrev = bpBalance;
    try {
      const json = {
        json: true,
        code: 'fio.treasury',
        scope: 'fio.treasury',
        table: 'bpbucketpool',
        limit: 10,
        reverse: false
      }
      result = await callFioApi("get_table_rows", json);
      const balance = result.rows[0].rewards;
      //console.log('balance: ', balance);
      percentDiff = (balance - balancePrev) / endpoint_fee;
      percentDiffRnd = percentDiff.toFixed(1);
      expect(percentDiffRnd).to.equal(bpRewardPercent);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Get updated tpid balance. Include new user bounty. Expect increase of ${tpidNewuserbountyPercent} * fee`, async () => {
    const balancePrev = tpidBounty;
    try {
      const json = {
        json: true,
        code: 'fio.tpid',
        scope: 'fio.tpid',
        table: 'bounties',
        limit: 10,
        reverse: false
      }
      result = await callFioApi("get_table_rows", json);
      const balance = result.rows[0].tokensminted;
      //console.log('balance: ', balance);
      percentDiff = (balance - balancePrev) / endpoint_fee;
      percentDiffRnd = percentDiff.toFixed(1);
      expect(percentDiffRnd).to.equal(tpidNewuserbountyPercent);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Get udpated rewards balance for the TPID. Expect increase of ${tpidRewardPercent} + ${tpidNewuserbountyPercent} * fee`, async () => {
    const balancePrev = tpidBalance;
    let balance;
    try {
      const json = {
        json: true,
        code: 'fio.tpid',
        scope: 'fio.tpid',
        table: 'tpids',
        limit: 10,
        reverse: false
      }
      result = await callFioApi("get_table_rows", json);
      //console.log('result: ', result);
      for (request in result.rows) {
        if (result.rows[request].fioaddress == tpid) {
          //console.log('TPID: ', result.rows[request].fioaddress);
          balance = result.rows[request].rewards;
          break;
        }
      }
      percentDiff = (balance - balancePrev) / endpoint_fee;
      percentDiffRnd = percentDiff.toFixed(1);
      expect(percentDiffRnd).to.equal(tpidPlusNewuserbountyPercent);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Get updated staking rewards. Expect increase of ${stakingRewardPercent} * fee`, async () => {
    let balancePrev = stakingBalance;
    try {
      const json = {
        json: true,
        code: 'fio.staking',
        scope: 'fio.staking',
        table: 'staking',
        limit: 10,
        reverse: false
      }
      result = await callFioApi("get_table_rows", json);
      balance = result.rows[0].rewards_token_pool;
      //console.log('balance: ', balance);
      percentDiff = (balance - balancePrev) / endpoint_fee;
      percentDiffRnd = percentDiff.toFixed(2);
      expect(percentDiffRnd).to.equal(stakingRewardPercent);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

})


describe('Test register_fio_domain fee distribution', () => {
  let user1, foundationBalance, tpidBounty, stakingBalance, bpBalance, endpoint_fee, feeCollected

  const endpoint = "register_fio_domain"

  it(`Create users`, async () => {
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
  })

  it(`Get balance for user1`, async () => {
    try {
      const result = await user1.sdk.genericAction('getFioBalance', {
        fioPublicKey: user1.publicKey
      })
      user1PrevBalance = result.balance
      //console.log('user1 fio balance', result)
    } catch (err) {
      //console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`Get current foundation rewards`, async () => {
    try {
      const json = {
        json: true,
        code: 'fio.treasury',
        scope: 'fio.treasury',
        table: 'fdtnrewards',
        limit: 10,
        reverse: false
      }
      result = await callFioApi("get_table_rows", json);
      foundationBalance = result.rows[0].rewards;
      //console.log('foundationBalance: ', foundationBalance);
      expect(foundationBalance).to.greaterThan(0);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Get current bpbucketpool (since FIO Address fees go into 365 day buckets)`, async () => {
    try {
      const json = {
        json: true,
        code: 'fio.treasury',
        scope: 'fio.treasury',
        table: 'bpbucketpool',
        limit: 10,
        reverse: false
      }
      result = await callFioApi("get_table_rows", json);
      bpBalance = result.rows[0].rewards;
      //console.log('bpBalance: ', bpBalance);
      expect(bpBalance).to.greaterThan(0);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

    it(`Get current tpid rewards`, async () => {
    try {
      const json = {
        json: true,
        code: 'fio.tpid',
        scope: 'fio.tpid',
        table: 'bounties',
        limit: 10,
        reverse: false
      }
      result = await callFioApi("get_table_rows", json);
      tpidBounty = result.rows[0].tokensminted;
      //console.log('tpidBounty: ', tpidBounty);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
    })
  
  it(`Get current rewards balance for the TPID`, async () => {
    tpidBalance = null;
    try {
      const json = {
        json: true,
        code: 'fio.tpid',
        scope: 'fio.tpid',
        table: 'tpids',
        limit: 10,
        reverse: false
      }
      result = await callFioApi("get_table_rows", json);
      //console.log('result: ', result);
      for (request in result.rows) {
        if (result.rows[request].fioaddress == tpid) {
          //console.log('TPID: ', result.rows[request].fioaddress);
          tpidBalance = result.rows[request].rewards;
          break;
        }
      }
      if (tpidBalance == null) {
        console.log('TPID not found: ', tpid)
      }
      //console.log('tpidBounty: ', tpidBounty);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Get current staking rewards`, async () => {
    try {
      const json = {
        json: true,
        code: 'fio.staking',
        scope: 'fio.staking',
        table: 'staking',
        limit: 10,
        reverse: false
      }
      result = await callFioApi("get_table_rows", json);
      stakingBalance = result.rows[0].rewards_token_pool;
      //console.log('stakingBalance: ', stakingBalance);
      expect(stakingBalance).to.greaterThan(0);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it('Get endpoint fee', async () => {
    try {
      result = await user1.sdk.getFee(endpoint);
      endpoint_fee = result.fee;
      //console.log('endpoint_fee: ', endpoint_fee)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Test: registerFioAddress`, async () => {
    try {
      newDomain = generateFioDomain(7);
      const result = await user1.sdk.genericAction('registerFioDomain', {
        fioDomain: newDomain,
        maxFee: endpoint_fee,
        technologyProviderId: 'bp1@dapixdev'
      });
      //console.log('Result: ', result)
      feeCollected = result.fee_collected;
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  });

  it(`Confirm fee collected > 0`, async () => {
    expect(feeCollected).to.greaterThan(0)
  })

  it(`Get updated foundation rewards. Expect increase of ${foundationRewardPercent} * fee`, async () => {
    const balancePrev = foundationBalance;
    try {
      const json = {
        json: true,
        code: 'fio.treasury',
        scope: 'fio.treasury',
        table: 'fdtnrewards',
        limit: 10,
        reverse: false
      }
      result = await callFioApi("get_table_rows", json);
      const balance = result.rows[0].rewards;
      //console.log('balance: ', balance);
      percentDiff = (balance - balancePrev) / endpoint_fee;
      percentDiffRnd = percentDiff.toFixed(2);
      expect(percentDiffRnd).to.equal(foundationRewardPercent);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Get updated bpbucketpool. Expect increase of ${bpRewardPercent} * fee`, async () => {
    const balancePrev = bpBalance;
    try {
      const json = {
        json: true,
        code: 'fio.treasury',
        scope: 'fio.treasury',
        table: 'bpbucketpool',
        limit: 10,
        reverse: false
      }
      result = await callFioApi("get_table_rows", json);
      const balance = result.rows[0].rewards;
      //console.log('balance: ', balance);
      percentDiff = (balance - balancePrev) / endpoint_fee;
      percentDiffRnd = percentDiff.toFixed(1);
      expect(percentDiffRnd).to.equal(bpRewardPercent);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Get updated tpid balance. Include new user bounty. Expect increase of ${tpidNewuserbountyPercent} * fee`, async () => {
    const balancePrev = tpidBounty;
    try {
      const json = {
        json: true,
        code: 'fio.tpid',
        scope: 'fio.tpid',
        table: 'bounties',
        limit: 10,
        reverse: false
      }
      result = await callFioApi("get_table_rows", json);
      const balance = result.rows[0].tokensminted;
      //console.log('balance: ', balance);
      percentDiff = (balance - balancePrev) / endpoint_fee;
      percentDiffRnd = percentDiff.toFixed(1);
      expect(percentDiffRnd).to.equal(tpidNewuserbountyPercent);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Get udpated rewards balance for the TPID. Expect increase of ${tpidRewardPercent} + ${tpidNewuserbountyPercent} * fee`, async () => {
    const balancePrev = tpidBalance;
    let balance;
    try {
      const json = {
        json: true,
        code: 'fio.tpid',
        scope: 'fio.tpid',
        table: 'tpids',
        limit: 10,
        reverse: false
      }
      result = await callFioApi("get_table_rows", json);
      //console.log('result: ', result);
      for (request in result.rows) {
        if (result.rows[request].fioaddress == tpid) {
          //console.log('TPID: ', result.rows[request].fioaddress);
          balance = result.rows[request].rewards;
          break;
        }
      }
      percentDiff = (balance - balancePrev) / endpoint_fee;
      percentDiffRnd = percentDiff.toFixed(1);
      expect(percentDiffRnd).to.equal(tpidPlusNewuserbountyPercent);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Get updated staking rewards. Expect increase of ${stakingRewardPercent} * fee`, async () => {
    let balancePrev = stakingBalance;
    try {
      const json = {
        json: true,
        code: 'fio.staking',
        scope: 'fio.staking',
        table: 'staking',
        limit: 10,
        reverse: false
      }
      result = await callFioApi("get_table_rows", json);
      balance = result.rows[0].rewards_token_pool;
      //console.log('balance: ', balance);
      percentDiff = (balance - balancePrev) / endpoint_fee;
      percentDiffRnd = percentDiff.toFixed(2);
      expect(percentDiffRnd).to.equal(stakingRewardPercent);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

})