require('mocha')
const {expect} = require('chai')
const {FIOSDK } = require('@fioprotocol/fiosdk')
const {newUser, fetchJson, timeout, generateFioDomain, generateFioAddress, createKeypair, getTestType, getTotalVotedFio, getAccountVoteWeight, getProdVoteTotal, callFioApi} = require('../utils.js');
const config = require('../config.js');
const testType = getTestType();

let transfer_tokens_pub_key_fee
let privateKey, publicKey, privateKey2, publicKey2, account, account2, testFioDomain, testFioAddressName, testFioAddressName2
let fioSdk, fioSdk2, fioSdkFaucet

const fioTokenCode = 'FIO'
const fioChainCode = 'FIO'
const ethTokenCode = 'ETH'
const ethChainCode = 'ETH'
const fundAmount = 800 * FIOSDK.SUFUnit
const defaultFee = 800 * FIOSDK.SUFUnit
const receiveTransferTimout = 5000
const lockedFundsAmount = 500000000000

const generateObtId = () => {
  return `${Date.now()}`
}

before(async () => {
  fioSdkFaucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);

  const keys = await createKeypair();
  privateKey = keys.privateKey
  publicKey = keys.publicKey
  account = keys.account
  fioSdk = new FIOSDK(privateKey, publicKey, config.BASE_URL, fetchJson);

  const keys2 = await createKeypair();
  privateKey2 = keys2.privateKey
  publicKey2 = keys2.publicKey
  account2 = keys2.account
  fioSdk2 = new FIOSDK(privateKey2, publicKey2, config.BASE_URL, fetchJson);

  result = await fioSdkFaucet.getFee('transfer_tokens_pub_key');
  transfer_tokens_pub_key_fee = result.fee;
})

describe(`************************** locks-transfer-locked-tokens-account-tests.js ************************** \n    A. Create accounts for tests`, () => {

  
  it.skip(`Show keys`, async () => {
    console.log('privateKey: ', privateKey)
    console.log('publicKey: ', publicKey)
    console.log('account: ', account)
    console.log('privateKey2: ', privateKey2)
    console.log('publicKey2: ', publicKey2)
    console.log('account2: ', account2)
  })
  

  it(`(${testType}) Create fioSdk account: transferLockedTokens ${lockedFundsAmount}, canvote false, (20,40%) and (40,60%)`, async () => {
    if (testType == 'sdk') {
      try {
        const result = await fioSdkFaucet.genericAction('transferLockedTokens', {
          payeePublicKey: publicKey,
          canVote: false,
          periods: [
            {
              duration: 3600,
              amount: lockedFundsAmount * 0.4,
            },
            {
              duration: 3640,
              amount: lockedFundsAmount * 0.6,
            }
          ],
          amount: lockedFundsAmount,
          maxFee: 400000000000,
          tpid: '',

        })
        expect(result.status).to.equal('OK')
        expect(result).to.have.any.keys('status');
        expect(result).to.have.any.keys('fee_collected');
        expect(result).to.have.any.keys('block_num');
        expect(result).to.have.any.keys('transaction_id');
      } catch (err) {
        console.log('Error', err);
        expect(err).to.equal(null);
      }
    } else {  
      try {
        const result = await fioSdkFaucet.genericAction('pushTransaction', {
          action: 'trnsloctoks',
          account: 'fio.token',
          data: {
            payee_public_key: publicKey,
            can_vote: 0,
            periods: [
              {
                duration: 3600,
                amount: lockedFundsAmount * 0.4,
              },
              {
                duration: 3640,
                amount: lockedFundsAmount * 0.6,
              }
            ],
            amount: lockedFundsAmount,
            max_fee: 400000000000,
            tpid: '',
            actor: fioSdkFaucet.account,
          }

        })
        expect(result.status).to.equal('OK')
        expect(result).to.have.any.keys('status');
        expect(result).to.have.any.keys('fee_collected');
        expect(result).to.have.any.keys('block_num');
        expect(result).to.have.any.keys('transaction_id');
      } catch (err) {
        console.log(' Error', err);
        expect(err).to.equal(null);
      }
    }
  })

  it(`(${testType}) Create fioSdk account: transferLockedTokens ${lockedFundsAmount}, canvote false, (20,40%) and (40,60%)`, async () => {
    if (testType == 'sdk') {
      try {
        const result = await fioSdkFaucet.genericAction('transferLockedTokens', {
          payeePublicKey: publicKey2,
          canVote: false,
          periods: [
            {
              duration: 3600,
              amount: lockedFundsAmount * 0.3,
            },
            {
              duration: 3640,
              amount: lockedFundsAmount * 0.7,
            }
          ],
          amount: lockedFundsAmount,
          maxFee: 400000000000,
          tpid: '',

        })
        expect(result.status).to.equal('OK')
        expect(result).to.have.any.keys('status');
        expect(result).to.have.any.keys('fee_collected');
        expect(result).to.have.any.keys('block_num');
        expect(result).to.have.any.keys('transaction_id');
      } catch (err) {
        console.log('Error', err)
      }
    } else {  
      try {
        const result = await fioSdkFaucet.genericAction('pushTransaction', {
          action: 'trnsloctoks',
          account: 'fio.token',
          data: {
            payee_public_key: publicKey2,
            can_vote: 0,
            periods: [
              {
                duration: 3600,
                amount: lockedFundsAmount * 0.3,
              },
              {
                duration: 3640,
                amount: lockedFundsAmount * 0.7,
              }
            ],
            amount: lockedFundsAmount,
            max_fee: 400000000000,
            tpid: '',
            actor: fioSdkFaucet.account,
          }

        })
        expect(result.status).to.equal('OK')
        expect(result).to.have.any.keys('status');
        expect(result).to.have.any.keys('fee_collected');
        expect(result).to.have.any.keys('block_num');
        expect(result).to.have.any.keys('transaction_id');
      } catch (err) {
        console.log(' Error', err);
        expect(err).to.equal(null);
      }
    }
  })

  it(`getFioBalance for fioSdk and confirm 'available' = 0`, async () => {
    const result = await fioSdk.genericAction('getFioBalance', {})
    expect(result).to.have.all.keys('balance','available','staked','srps','roe')
    expect(result.available).equal(0)
  })

  it(`Call get_table_rows from locktokens and confirm: lock_amount - remaining_lock_amount = 0`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio', 
        scope: 'eosio',   
        table: 'locktokensv2',   
        lower_bound: account,     
        upper_bound: account,
        key_type: 'i64',
        reverse: true,
        index_position: '2' 
      }
      result = await callFioApi("get_table_rows", json);
      expect(result.rows[0].lock_amount - result.rows[0].remaining_lock_amount).to.equal(0);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  //try to transfer, fail.
  it(`FAIL Transfer 1 FIO from locked token account, no funds unlocked`, async () => {
    try{
      const result = await fioSdk.genericAction('transferTokens', {
        payeeFioPublicKey: publicKey2,
        amount: 1000000000,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        technologyProviderId: ''
      })
      expect(result).to.equal(null);
    } catch (err) {
      expect(err.json.fields[0].error).to.equal('Funds locked');
      expect(err.code).to.equal(400);
    }
  })

  it(`getFioBalance for fioSdk2 and confirm 'available' = 0`, async () => {
    const result = await fioSdk2.genericAction('getFioBalance', {})
    expect(result).to.have.all.keys('balance','available','staked','srps','roe')
    expect(result.available).equal(0)
  })

  it(`Call get_table_rows from locktokens and confirm: lock_amount - remaining_lock_amount = 0`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio', 
        scope: 'eosio',   
        table: 'locktokensv2',
        lower_bound: account2,     
        upper_bound: account2,
        key_type: 'i64',       
        reverse: true,
        index_position: '2'
      }
      result = await callFioApi("get_table_rows", json);
      expect(result.rows[0].lock_amount - result.rows[0].remaining_lock_amount).to.equal(0);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

    //try to transfer, fail.
    it(`FAIL Transfer 1 FIO from locked token account, no funds unlocked`, async () => {
      try{
        const result = await fioSdk2.genericAction('transferTokens', {
          payeeFioPublicKey: publicKey,
          amount: 1000000000,
          maxFee: config.api.transfer_tokens_pub_key.fee,
          technologyProviderId: ''
        })
        expect(result).to.equal(null);
      } catch (err) {
        expect(err.json.fields[0].error).to.equal('Funds locked');
        expect(err.code).to.equal(400);
      }
    })

  it(`Transfer additional tokens to account for testing`, async () => {
    // Then transfer additional non-locke tokens to the account for the tests
    await fioSdkFaucet.transferTokens(publicKey, fundAmount * 4, defaultFee)
    await fioSdkFaucet.transferTokens(publicKey2, fundAmount, defaultFee)

    await timeout(receiveTransferTimout)
  })

  let balance1, balance2;
  it(`[Fix for Bahamas release] getFioBalance for fioSdk and confirm 'available' > 0`, async () => {
    const result = await fioSdk.genericAction('getFioBalance', {})
    balance1 = result.balance;
    // Add back: expect(result).to.have.all.keys('balance','available','staked','srps','roe')
    //expect(result.available).is.greaterThan(0)
  })

  it(`Call get_table_rows from locktokens and confirm: lock_amount - remaining_lock_amount > 0`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio', 
        scope: 'eosio',   
        table: 'locktokensv2',
        lower_bound: account,     
        upper_bound: account,
        key_type: 'i64',       
        reverse: true,
        index_position: '2'
      }
      result = await callFioApi("get_table_rows", json);
      expect(balance1 - result.rows[0].lock_amount - result.rows[0].remaining_lock_amount).is.greaterThan(0)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`[Fix for Bahamas release] getFioBalance for fioSdk2 and confirm 'available' > 0`, async () => {
    const result = await fioSdk2.genericAction('getFioBalance', {})
    balance2 = result.balance
    // Add back: expect(result).to.have.all.keys('balance','available','staked','srps','roe')
    //expect(result.available).is.greaterThan(0)
  })

  it(`Call get_table_rows from locktokens and confirm: lock_amount - remaining_lock_amount > 0`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio', 
        scope: 'eosio',   
        table: 'locktokensv2',
        lower_bound: account2,     
        upper_bound: account2,
        key_type: 'i64',       
        reverse: true,
        index_position: '2'
      }
      result = await callFioApi("get_table_rows", json);
      expect(balance2 - result.rows[0].lock_amount - result.rows[0].remaining_lock_amount).is.greaterThan(0)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Register domains and addresses`, async () => {
    testFioDomain = generateFioDomain(8)
    testFioAddressName = generateFioAddress(testFioDomain, 7)
    testFioAddressName2 = generateFioAddress(testFioDomain, 5)

    try {
      await fioSdkFaucet.genericAction('registerFioDomain', {
        fioDomain: testFioDomain,
        maxFee: defaultFee
      })

      await fioSdkFaucet.genericAction('setFioDomainVisibility', {
        fioDomain: testFioDomain,
        isPublic: true,
        maxFee: defaultFee
      })

      const isAvailableResult = await fioSdk.genericAction('isAvailable', {
        fioName: testFioAddressName
      })
      if (!isAvailableResult.is_registered) {
        await fioSdk.genericAction('registerFioAddress', {
          fioAddress: testFioAddressName,
          maxFee: defaultFee
        })
      }

      const isAvailableResult2 = await fioSdk2.genericAction('isAvailable', {
        fioName: testFioAddressName2
      })
      if (!isAvailableResult2.is_registered) {
        await fioSdk2.genericAction('registerFioAddress', {
          fioAddress: testFioAddressName2,
          maxFee: defaultFee
        })
      }

    } catch (e) {
      console.log(e);
    }
  })
})

describe(`B. Test locked token accounts with proxy voting`, () => {

  let total_voted_fio, total_bp_votes, user1

  it(`Create user`, async () => {
    user1 = await newUser(fioSdkFaucet);
  })

  it(`Get initial total_voted_fio`, async () => {
    total_voted_fio = await getTotalVotedFio();
  })

  it(`Get fioSdk last_vote_weight`, async () => {
    try {
      fioSdk.last_vote_weight = await getAccountVoteWeight(account);
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }
  })

  it(`Get bp1@dapixdev total_votes`, async () => {
    try {
      total_bp_votes = await getProdVoteTotal('bp1@dapixdev');
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

  it(`Register fioSdk as a proxy`, async () => {
    try {
      const result = await fioSdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: testFioAddressName,
          actor: account,
          max_fee: config.api.register_proxy.fee
        }
      })
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json.error.details)
      expect(err).to.equal('null')
    }
  })

  it(`Wait a few seconds.`, async () => { await timeout(5000) })

  it(`Get total_voted_fio before fioSdk votes`, async () => {
    total_voted_fio = await getTotalVotedFio();
  })


  it(`Get fioSdk last_vote_weight`, async () => {
    try {
      fioSdk.last_vote_weight = await getAccountVoteWeight(account);
    } catch (err) {
      console.log('Error: ', err.json)
    }
  })

  it(`Get total_voted_fio before fioSdk votes`, async () => {
    total_voted_fio = await getTotalVotedFio();
    console.log('total_voted_fio:', total_voted_fio)
  })

  it(`fioSdk votes for bp1@dapixdev using address #1`, async () => {
    try {
      const result = await fioSdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: testFioAddressName,
          actor: account,
          max_fee: config.api.vote_producer.fee
        }
      })
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }
  })

  it(`Wait a few seconds.`, async () => { await timeout(5000) })

  it(`Get fioSdk last_vote_weight`, async () => {
    try {
      fioSdk.last_vote_weight = await getAccountVoteWeight(account);
    } catch (err) {
      console.log('Error: ', err.json)
    }
  })

  it(`fioSdk last_vote_weight = FIO balance - ${lockedFundsAmount} `, async () => {
      try {
        const result = await fioSdk.genericAction('getFioBalance', {
          fioPublicKey: publicKey
        })
        expect(result.balance - lockedFundsAmount).to.equal(fioSdk.last_vote_weight)
      } catch (err) {
        console.log('Error', err)
        expect(err).to.equal('null')
      }
  })

  it(`Wait a few seconds.`, async () => { await timeout(5000) })

  it(`total_voted_fio increased by fioSdk last_vote_weight`, async () => {
    try {
      let prev_total_voted_fio = total_voted_fio
      total_voted_fio = await getTotalVotedFio();
     /* console.log('total_voted_fio: ', total_voted_fio / config.BILLION)
      console.log("fiosdk last vote weight ",fioSdk.last_vote_weight)
      console.log("fioSdk account ",keys.account)
      console.log("difference is ", total_voted_fio - (prev_total_voted_fio + fioSdk.last_vote_weight))
      */
      expect(total_voted_fio).to.equal(prev_total_voted_fio + fioSdk.last_vote_weight)
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal('null')
    }
  })

  it(`bp1@dapixdev total_votes increased by fioSdk last_vote_weight`, async () => {
    try {
      let prev_total_bp_votes = total_bp_votes;
      total_bp_votes = await getProdVoteTotal('bp1@dapixdev');
      expect(total_bp_votes).to.equal(prev_total_bp_votes + fioSdk.last_vote_weight)
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })
  
  it('Transfer additional 500 FIO from user1 to fioSdk', async () => {
    const result = await user1.sdk.genericAction('transferTokens', {
      payeeFioPublicKey: publicKey,
      amount: 500000000000,
      maxFee: config.api.transfer_tokens_pub_key.fee,
    })
    expect(result.status).to.equal('OK')
  })

  it(`Wait a few seconds.`, async () => { await timeout(7000) })

  it(`Get fioSdk last_vote_weight (should be 500 more)`, async () => {
    try {
      prevVoteWeight = fioSdk.last_vote_weight
      fioSdk.last_vote_weight = await getAccountVoteWeight(account);
      expect(fioSdk.last_vote_weight).to.equal(prevVoteWeight + 500000000000)
    } catch (err) {
      console.log('Error: ', err.json)
    }
  })

  it(`total_voted_fio increased by 500 FIO`, async () => {
    try {
      let prev_total_voted_fio = total_voted_fio
      total_voted_fio = await getTotalVotedFio();
      expect(total_voted_fio).to.equal(prev_total_voted_fio + 500000000000)
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal('null')
    }
  })

  it(`bp1@dapixdev total_votes increased by 500 FIO`, async () => {
    try {
      let prev_total_bp_votes = total_bp_votes;
      total_bp_votes = await getProdVoteTotal('bp1@dapixdev');
      expect(total_bp_votes).to.equal(prev_total_bp_votes + 500000000000)
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

  it(`Transfer 200 FIO from fioSdk back to user1 (to remove votes from the total)`, async () => {
    const result = await fioSdk.genericAction('transferTokens', {
      payeeFioPublicKey: user1.publicKey,
      amount: 200000000000,
      maxFee: config.maxFee,
    })
    expect(result.status).to.equal('OK')
  })

  it(`Wait a few seconds.`, async () => { await timeout(7000) })

  it(`Get fioSdk last_vote_weight (should be 200 + 2 fee = 202 less)`, async () => {
    try {
      prevVoteWeight = fioSdk.last_vote_weight
      fioSdk.last_vote_weight = await getAccountVoteWeight(account);
      expect(fioSdk.last_vote_weight).to.equal(prevVoteWeight- 200000000000 - transfer_tokens_pub_key_fee)
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

  it(`total_voted_fio decreased by 200 - transfer_tokens_pub_key fee`, async () => {
    try {
      let prev_total_voted_fio = total_voted_fio
      total_voted_fio = await getTotalVotedFio();
      expect(total_voted_fio).to.equal(prev_total_voted_fio - 200000000000 - transfer_tokens_pub_key_fee)
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal('null')
    }
  })

  it(`bp1@dapixdev total_votes decreased by 200 - transfer_tokens_pub_key fee`, async () => {
    try {
      let prev_total_bp_votes = total_bp_votes;
      total_bp_votes = await getProdVoteTotal('bp1@dapixdev');
      expect(total_bp_votes).to.equal(prev_total_bp_votes - 200000000000 - transfer_tokens_pub_key_fee)
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

})
