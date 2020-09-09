require('mocha')
const {expect} = require('chai')
const {newUser, getProdVoteTotal, fetchJson, generateFioDomain, generateFioAddress, createKeypair} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/FIOSDK')
config = require('../config.js');

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
})

function wait(ms){
  var start = new Date().getTime();
  var end = start;
  while(end < start + ms) {
    end = new Date().getTime();
  }
}

let userA1, userA2, userA3, userA4, keys, keys1, keys2, keys3, locksdk,
    locksdk1, locksdk2, locksdk3, newFioAddress, newFioDomain, newFioDomain2, newFioAddress2,
    total_bp_votes_before, total_bp_votes_after
const fundsAmount = 500000000000
const halfundsAmount = 230000000000

describe(`************************** transfer-locked-tokens.js ************************** \n A. Create accounts for tests`, () => {


  it(`Create users`, async () => {
    userA1 = await newUser(faucet);
    userA2 = await newUser(faucet);
    userA3 = await newUser(faucet);
    userA4 = await newUser(faucet);

    keys = await createKeypair();
    locksdk = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson);
    keys1 = await createKeypair();
    locksdk1 = new FIOSDK(keys1.privateKey, keys1.publicKey, config.BASE_URL, fetchJson);
    keys2 = await createKeypair();
    locksdk2 = new FIOSDK(keys2.privateKey, keys2.publicKey, config.BASE_URL, fetchJson);
    keys3 = await createKeypair();
    locksdk3 = new FIOSDK(keys3.privateKey, keys3.publicKey, config.BASE_URL, fetchJson);
  })

  it.skip(`Show account info`, async () => {
    console.log('              userA1.account:', userA1.account)
    console.log('              userA1.publicKey:', userA1.publicKey)
    console.log('              userA1.privateKey:', userA1.privateKey)
    console.log('              userA1.domain:', userA1.domain)
    console.log('              userA1.address:', userA1.address)
    console.log("              locked token holder pub key ",keys.publicKey)
    console.log("              locked token holder account ",keys.account)
    console.log("              locked token holder priv key ",keys.privateKey)
    console.log("              locked token holder votable pub key ",keys1.publicKey)
    console.log("              locked token holder votable account ",keys1.account)
    console.log("              locked token holder votable priv key ",keys1.privateKey)
  })
})

describe(`************************** transfer-locked-tokens.js ************************** \n B. Parameter tests`, () => {



  it(`Transfer locked tokens, fail periods percent not 100`, async () => {
    try {
      const result = await userA1.sdk.genericAction('transferLockedTokens', {
        payeePublicKey: keys.publicKey,
        canVote: false,
        periods: [
          {
            duration: 120,
            percent: 50.30,
          },
          {
            duration: 240,
            percent: 50.0,
          }
        ],
        amount: fundsAmount,
        maxFee: 400000000000,
        tpid: '',

      })

    } catch (err) {
      var expected = `Error 400`
      expect(err.message).to.include(expected)
    }
  })

  it(`Transfer locked tokens, fail periods percent larger than 3 decimals`, async () => {
    try {
      const result = await userA1.sdk.genericAction('transferLockedTokens', {
        payeePublicKey: keys.publicKey,
        canVote: false,
        periods: [
          {
            duration: 120,
            percent: 50.4444,
          },
          {
            duration: 240,
            percent: 49.5556,
          }
        ],
        amount: fundsAmount,
        maxFee: 400000000000,
        tpid: '',

      })

    } catch (err) {
      var expected = `Error 400`
      expect(err.message).to.include(expected)
    }
  })


  it(`Transfer locked tokens, fail duration 0`, async () => {
    try {
      const result = await userA1.sdk.genericAction('transferLockedTokens', {
        payeePublicKey: keys.publicKey,
        canVote: false,
        periods: [
          {
            duration: 0,
            percent: 50.0,
          },
          {
            duration: 240,
            percent: 50.0,
          }
        ],
        amount: fundsAmount,
        maxFee: 400000000000,
        tpid: '',

      })
    } catch (err) {
      var expected = `Error 400`
      expect(err.message).to.include(expected)
    }
  })

  it(`Transfer locked tokens, fail pub key account pre exists`, async () => {
    try {
      const result = await userA1.sdk.genericAction('transferLockedTokens', {
        payeePublicKey: userA1.publicKey,
        canVote: false,
        periods: [
          {
            duration: 0,
            percent: 50.0,
          },
          {
            duration: 240,
            percent: 50.0,
          }
        ],
        amount: fundsAmount,
        maxFee: 400000000000,
        tpid: '',

      })
    } catch (err) {
      var expected = `Error 400`
      expect(err.message).to.include(expected)
    }
  })

})

//begin new tests matching testing requirements.
/*
After tokens are proxied and the proxy votes 0 weight is voted

Register FIO Address cannot be executed

At lock time, before first period, new tokens are transferred into locked account

Token transfer of amount greater than unlocked cannot be executed

Token transfer of unlocked amount is successful

On vote, unlocked token weight is voted

After tokens are proxied and the proxy votes unlocked token weight is voted

Register FIO Address can be paid with unlocked tokens

After first period passes

get_balance returns locked amount and available amount per unlock schedule

Token transfer of unlocked amount is successful

On vote, unlocked token weight is voted

After tokens are proxied and the proxy votes unlocked token weight is voted

Register FIO Address can be paid with unlocked tokens

After second period passes

get_balance returns locked amount and available amount per unlock schedule

Token transfer of unlocked amount is successful

On vote, unlocked token weight is voted

After tokens are proxied and the proxy votes unlocked token weight is voted

Register FIO Address can be paid with unlocked tokens
*/



describe(`************************** transfer-locked-tokens.js ************************** \n B. 2 unlock periods, Canvote set to false tests`, () => {

  let rambefore, ramafter, balancebefore, balanceafter, feetransferlocked

  it(`get account ram before `, async () => {
    try {
      let accountnm = await FIOSDK.accountHash(userA1.sdk.publicKey)
      const result = await userA1.sdk.genericAction('getAccount', {account:accountnm.accountnm})
      expect(result.ram_quota).to.be.a('number')
      rambefore = result.ram_quota
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`getFioBalance before `, async () => {
    const result = await userA1.sdk.genericAction('getFioBalance', {})

    expect(result).to.have.all.keys('balance','available')
    balancebefore = result.balance;
  })


  it(`Transfer ${fundsAmount} locked FIO using canvote false`, async () => {
    try {
      const result = await userA1.sdk.genericAction('transferLockedTokens', {
        payeePublicKey: keys.publicKey,
        canVote: false,
        periods: [
          {
            duration: 20,
            percent: 40.0,
          },
          {
            duration: 20,
            percent: 60.0,
          }
        ],
        amount: fundsAmount,
        maxFee: 400000000000,
        tpid: '',

      })
      expect(result.status).to.equal('OK')
      expect(result).to.have.all.keys( 'status', 'fee_collected')
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`getFioBalance after, verify Fee transfer_locked_tokens `, async () => {
    const result = await userA1.sdk.genericAction('getFioBalance', {})

    expect(result).to.have.all.keys('balance','available')
    balanceafter = result.balance;
    const result1 = await userA1.sdk.genericAction('getFee', {
      endPoint: 'transfer_locked_tokens',
      fioAddress: ''
    })

    let diff1 = balancebefore - balanceafter - fundsAmount
    //console.log('Returned fee: ', result)
    expect(diff1).to.equal(result1.fee)

  })

  it(`Get locks`, async () => {
    try{
    const result = await locksdk.genericAction('getLocks', {fioPublicKey:keys.publicKey})

    expect(result).to.have.all.keys('lock_amount', 'remaining_lock_amount',
        'time_stamp','payouts_performed','can_vote','unlock_periods')

    expect(result.lock_amount).to.equal(500000000000)
    expect(result.can_vote).to.equal(0)
    expect(result.unlock_periods[0].percent).to.equal('40.00000000000000000')
    expect(result.unlock_periods[1].percent).to.equal('60.00000000000000000')
    } catch (err) {
      console.log('Error', err)
    }
  })


  it(`verify get balance results for locked funds`, async () => {
    const result = await locksdk.genericAction('getFioBalance', {})

    expect(result).to.have.all.keys('balance','available')
    expect(result.balance).to.be.a('number')
    expect(result.available).to.be.a('number')
    expect(result.balance).to.equal(500000000000)
    expect(result.available).to.equal(0)

  })

  //try to transfer whole amount, fail.
  it(`Transfer ${fundsAmount} Fail from locked token account, no funds unlocked`, async () => {
    try{
      const result = await locksdk.genericAction('transferTokens', {
        payeeFioPublicKey: userA1.publicKey,
        amount: fundsAmount,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        technologyProviderId: ''
      })
    } catch (err) {
      var expected = `Error 400`
      expect(err.message).to.include(expected)
    }
  })


  it(`get account ram after, verify RAM bump `, async () => {
    try {
      let accountnm = await FIOSDK.accountHash(userA1.sdk.publicKey)
      const result = await userA1.sdk.genericAction('getAccount', {account:accountnm.accountnm})
      expect(result.ram_quota).to.be.a('number')
      ramafter = result.ram_quota
      let diffram = ramafter-rambefore
      expect(diffram).to.equal(1152)
  } catch (err) {
    console.log('Error', err)
  }
  })

  //begin check that we arent able to vote with this lock
  it(`Transfer 1000000000000 FIO into locked funds account`, async () => {
    try {
      const result = await userA3.sdk.genericAction('transferTokens', {
        payeeFioPublicKey: keys.publicKey,
        amount: 1000000000000,
        maxFee: 400000000000,
        tpid: '',
      })
    } catch (err) {
      console.log('Error', err)
    }
  })



  it(`Register domain for voting for locked funds account `, async () => {
    try {
      newFioDomain2 = generateFioDomain(15)
      const result = await locksdk.genericAction('registerFioDomain', {
        fioDomain: newFioDomain2,
        maxFee: 800000000000,
        tpid: '',
      })
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`Register address for voting for locked funds account`, async () => {
    try {
      newFioAddress2 = generateFioAddress(newFioDomain2,15)
      const result = await locksdk.genericAction('registerFioAddress', {
        fioAddress: newFioAddress2,
        maxFee: 400000000000,
        tpid: '',
      })
    } catch (err) {
      console.log('Error', err)
    }
  })



  it(`Get bp1@dapixdev total_votes before locked account votes`, async () => {
    try {
      total_bp_votes_before = await getProdVoteTotal('bp1@dapixdev');
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`locked account votes for bp1@dapixdev`, async () => {
    try {
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: newFioAddress2,
          actor: locksdk.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
    }
  })

  it(`Get bp1@dapixdev total_votes after locked account votes, verify NO locked tokens voted.`, async () => {
    try {
      total_bp_votes_after = await getProdVoteTotal('bp1@dapixdev');
      let diff = total_bp_votes_after - total_bp_votes_before
      expect(diff).to.equal(160000000000)
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  //end check that we arent abl to vote with this lock
})


//end new tests matching testing requirements.



describe(`************************** transfer-locked-tokens.js ************************** \n C. Canvote true, verify tokens are voted.`, () => {

  //test cases
  //1) create votable locked tokens. verify they are votable.
  it(`Transfer ${fundsAmount} locked FIO, canVote true`, async () => {
    try {
      const result = await userA4.sdk.genericAction('transferLockedTokens', {
        payeePublicKey: keys3.publicKey,
        canVote: true,
        periods: [
          {
            duration: 20,
            percent: 50.0,
          },
          {
            duration: 20,
            percent: 50.0,
          }
        ],
        amount: fundsAmount,
        maxFee: 400000000000,
        tpid: '',

      })
      expect(result.status).to.equal('OK')
      expect(result).to.have.all.keys( 'status', 'fee_collected')
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`Transfer ${fundsAmount} FIO to locked account`, async () => {
    try {
      const result = await userA2.sdk.genericAction('transferTokens', {
        payeeFioPublicKey: keys3.publicKey,
        amount: 1000000000000,
        maxFee: 400000000000,
        tpid: '',
      })
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`Register domain for voting for locked account `, async () => {
    try {
      newFioDomain = generateFioDomain(15)
      const result = await locksdk3.genericAction('registerFioDomain', {
        fioDomain: newFioDomain,
        maxFee: 800000000000,
        tpid: '',
      })
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`Register address for voting for locked account`, async () => {
    try {
      newFioAddress = generateFioAddress(newFioDomain,15)
      const result = await locksdk3.genericAction('registerFioAddress', {
        fioAddress: newFioAddress,
        maxFee: 400000000000,
        tpid: '',
      })
    } catch (err) {
      console.log('Error', err)
    }
  })



  it(`Get bp1@dapixdev total_votes before locked account votes`, async () => {
    try {
      total_bp_votes_before = await getProdVoteTotal('bp1@dapixdev');
      //console.log('bp1@dapixdev total_votes:', total_bp_votes)
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

  it(`locked account votes for bp1@dapixdev `, async () => {
    try {
      const result = await locksdk3.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: newFioAddress,
          actor: locksdk3.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }
  })

  it(`Get bp1@dapixdev total_votes after locked account votes, verify all locked tokens voted.`, async () => {
    try {
      total_bp_votes_after = await getProdVoteTotal('bp1@dapixdev');
      let diff = total_bp_votes_after - total_bp_votes_before
      expect(diff).to.equal(660000000000)
    } catch (err) {
      console.log('Error: ', err)
    }
  })
})



describe(`************************** transfer-locked-tokens.js ************************** \n D. Token unlocking tests`, () => {

  it(`Transfer ${fundsAmount} locked FIO using canvote false, two lock periods of 20 sec and 50 percent`, async () => {
    try {
      const result = await userA4.sdk.genericAction('transferLockedTokens', {
        payeePublicKey: keys2.publicKey,
        canVote: false,
        periods: [
          {
            duration: 20,
            percent: 50.0,
          },
          {
            duration: 20,
            percent: 50.0,
          }
        ],
        amount: fundsAmount,
        maxFee: 400000000000,
        tpid: '',

      })
      expect(result.status).to.equal('OK')
      expect(result).to.have.all.keys( 'status', 'fee_collected')
    } catch (err) {
      console.log('Error', err)
    }
  })


  it(`Waiting 20 seconds for first unlock`, async () => {
    console.log("            waiting 20 seconds for first unlock ")
  })

  it(` wait 20 seconds`, async () => {
    try {
     wait(20000)
    } catch (err) {
      console.log('Error', err)
    }
  })

  //try to transfer whole amount, fail.
  it(`Transfer ${fundsAmount} Fail, fail to transfer entire amount, only half is unlocked`, async () => {
    try{
    const result = await locksdk2.genericAction('transferTokens', {
      payeeFioPublicKey: userA1.publicKey,
      amount: fundsAmount,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
  } catch (err) {
    var expected = `Error 400`
    expect(err.message).to.include(expected)
  }
  })


it(`Transfer ${halfundsAmount} FIO to another account`, async () => {
  const result = await locksdk2.genericAction('transferTokens', {
    payeeFioPublicKey: userA1.publicKey,
    amount: halfundsAmount,
    maxFee: config.api.transfer_tokens_pub_key.fee,
    technologyProviderId: ''
  })
  expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected')
})

  it(`Waiting 20 seconds for second unlock`, async () => {
    console.log("            waiting 20 seconds for second unlock ")
  })

it(` wait 20 seconds`, async () => {
  try {
    wait(20000)
  } catch (err) {
    console.log('Error', err)
  }
})


it(`Transfer ${halfundsAmount} FIO to another account`, async () => {
  const result = await locksdk2.genericAction('transferTokens', {
    payeeFioPublicKey: userA1.publicKey,
    amount: halfundsAmount,
    maxFee: config.api.transfer_tokens_pub_key.fee,
    technologyProviderId: ''
  })
  expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected')
})

})


