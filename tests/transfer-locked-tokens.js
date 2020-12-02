require('mocha')
const {expect} = require('chai')
const {newUser, getProdVoteTotal, fetchJson, generateFioDomain, callFioApi,  generateFioAddress, createKeypair} = require('../utils.js');
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
const maxTestFundsAmount = 5000000000
const halfundsAmount = 220000000000

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



describe(`B. Parameter tests`, () => {



  it(`Failure test, Transfer locked tokens,  periods total percent not 100`, async () => {
    try {

      const result = await userA1.sdk.genericAction('pushTransaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        data: {
          payee_public_key: keys.publicKey,
          can_vote: 0,
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
          max_fee: 400000000000,
          tpid: '',
          actor: userA1.account,
        }
      })
      expect(result.status).to.not.equal('OK')

    } catch (err) {
      var expected = `Error 400`
      expect(err.message).to.include(expected)
    }
  })

  it(`Failure test, Transfer locked tokens, period percent larger than 3 decimals`, async () => {
    try {
      const result = await userA1.sdk.genericAction('pushTransaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        data: {
          payee_public_key: keys.publicKey,
          can_vote: 0,
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
          max_fee: 400000000000,
          tpid: '',
          actor: userA1.account,
        }

      })
      expect(result.status).to.not.equal('OK')

    } catch (err) {
      var expected = `Error 400`
      expect(err.message).to.include(expected)
    }
  })

  it(`Failure test, Transfer locked tokens, periods are not in ascending order of duration`, async () => {
    try {
      const result = await userA1.sdk.genericAction('pushTransaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        data: {
          payee_public_key: keys.publicKey,
          can_vote: 0,
          periods: [
            {
              duration: 240,
              percent: 50.4444,
            },
            {
              duration: 120,
              percent: 49.5556,
            }
          ],
          amount: fundsAmount,
          max_fee: 400000000000,
          tpid: '',
          actor: userA1.account,
        }

      })
      expect(result.status).to.not.equal('OK')

    } catch (err) {
      var expected = `Error 400`
      expect(err.message).to.include(expected)
    }
  })

  it(`Failure test, Transfer locked tokens, duration 0`, async () => {
    try {
      const result = await userA1.sdk.genericAction('pushTransaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        data: {
          payee_public_key: keys.publicKey,
          can_vote: 0,
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
          max_fee: 400000000000,
          tpid: '',
          actor: userA1.account
        }

      })
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      var expected = `Error 400`
      expect(err.message).to.include(expected)
    }
  })

  it(`Failute test, Transfer locked tokens, pub key account pre exists`, async () => {
    try {
      const result = await userA1.sdk.genericAction('pushTransaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        data: {
          payee_public_key: userA1.publicKey,
          can_vote: 0,
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
          max_fee: 400000000000,
          tpid: '',
          actor: userA1.account
        }

      })
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      var expected = `Error 400`
      expect(err.message).to.include(expected)
    }
  })

  it(`Failute test, Too many lock periods`, async () => {
    try {
      const result = await userA4.sdk.genericAction('pushTransaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        data: {
          payee_public_key: keys2.publicKey,
          can_vote: 0,
          periods: [
            {
              duration: 1,
              percent: 0.273,
            },
            {
              duration: 2,
              percent: .273,
            },
            {
              duration: 3,
              percent: .273,
            },
            {
              duration: 4,
              percent: .273,
            },
            {
              duration: 5,
              percent: .273,
            },
            {
              duration: 6,
              percent: .273,
            },
            {
              duration: 7,
              percent: .273,
            },
            {
              duration: 8,
              percent: .273,
            },
            {
              duration: 9,
              percent: .273,
            },
            {
              duration: 10,
              percent: .273,
            },
            {
              duration: 11,
              percent: .273,
            },
            {
              duration: 12,
              percent: .273,
            },
            {
              duration: 13,
              percent: .273,
            },
            {
              duration: 14,
              percent: .273,
            },
            {
              duration: 15,
              percent: .273,
            },
            {
              duration: 16,
              percent: .273,
            },
            {
              duration: 17,
              percent: .273,
            },
            {
              duration: 18,
              percent: .273,
            },
            {
              duration: 19,
              percent: .273,
            },
            {
              duration: 20,
              percent: .273,
            },
            {
              duration: 21,
              percent: .273,
            },
            {
              duration: 22,
              percent: .273,
            },
            {
              duration: 23,
              percent: .273,
            },
            {
              duration: 24,
              percent: .273,
            },
            {
              duration: 25,
              percent: .273,
            },
            {
              duration: 26,
              percent: .273,
            },
            {
              duration: 27,
              percent: .273,
            },
            {
              duration: 28,
              percent: .273,
            },
            {
              duration: 29,
              percent: .273,
            },
            {
              duration: 30,
              percent: .273,
            },
            {
              duration: 31,
              percent: .273,
            },
            {
              duration: 32,
              percent: .273,
            },
            {
              duration: 33,
              percent: .273,
            },
            {
              duration: 34,
              percent: .273,
            },
            {
              duration: 35,
              percent: .273,
            },
            {
              duration: 36,
              percent: .273,
            },
            {
              duration: 37,
              percent: .273,
            },
            {
              duration: 38,
              percent: .273,
            },
            {
              duration: 39,
              percent: .273,
            },
            {
              duration: 40,
              percent: .273,
            },
            {
              duration: 41,
              percent: .273,
            },
            {
              duration: 42,
              percent: .273,
            },
            {
              duration: 43,
              percent: .273,
            },
            {
              duration: 44,
              percent: .273,
            },
            {
              duration: 45,
              percent: .273,
            },
            {
              duration: 46,
              percent: .273,
            },
            {
              duration: 47,
              percent: .273,
            },
            {
              duration: 48,
              percent: .273,
            },
            {
              duration: 49,
              percent: .273,
            },
            {
              duration: 50,
              percent: .273,
            },
            {
              duration: 51,
              percent: 86.35,
            }
          ],
          amount: fundsAmount,
          max_fee: 400000000000,
          tpid: '',
          actor: userA4.account,
        }

      })
      expect(result.status).to.not.equal('OK')

    } catch (err) {
      var expected = `Error 400`
      expect(err.message).to.include(expected)
    }
  })

})

describe(`B. transfer with 2 unlock periods, canvote = false`, () => {

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

    expect(result).to.have.all.keys('balance')
    balancebefore = result.balance;
  })

  it(`SUCCESS transferLockedTokens ${fundsAmount}, canvote false, (20,40 seconds) and (40,60%)`, async () => {
    try {
      const result = await userA1.sdk.genericAction('pushTransaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        data: {
          payee_public_key: keys.publicKey,
          can_vote: 0,
          periods: [
            {
              duration: 20,
              percent: 40.0,
            },
            {
              duration: 40,
              percent: 60.0,
            }
          ],
          amount: fundsAmount,
          max_fee: 400000000000,
          tpid: '',
          actor: userA1.account,
        }

      })
      expect(result.status).to.equal('OK')
      expect(result).to.have.all.keys( 'status', 'fee_collected')
    } catch (err) {
      console.log(' Error', err)
    }
  })

  it(`getFioBalance after, verify Fee transfer_locked_tokens was collected`, async () => {
    const result = await userA1.sdk.genericAction('getFioBalance', {})

    expect(result).to.have.all.keys('balance')
    balanceafter = result.balance;
    const result1 = await userA1.sdk.genericAction('getFee', {
      endPoint: 'transfer_locked_tokens',
      fioAddress: ''
    })

    let diff1 = balancebefore - balanceafter - fundsAmount
    //console.log('Returned fee: ', result)
    expect(diff1).to.equal(result1.fee)

  })

  it.skip(`Verify locks were set with get_locks`, async () => {
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

    expect(result).to.have.all.keys('balance')
    expect(result.balance).to.be.a('number')
    expect(result.balance).to.equal(500000000000)

  })

  //try to transfer whole amount, fail.
  it(`FAIL Transfer ${fundsAmount} from locked token account, no funds unlocked`, async () => {
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

  it(`Test Case: Check that we arent able to vote with this lock`, async () => { })

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

  let transferdomainkey, domsdk;
  //test transfer of domain with account that has locked and unlocked funds
  //first create a locked token grant
  it(`SUCCESS transferLockedTokens ${fundsAmount}, canvote false, (20000,40000 seconds) and (40,60%)`, async () => {
    try {
      transferdomainkey= await createKeypair();
      const result = await userA1.sdk.genericAction('pushTransaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        data: {
          payee_public_key: transferdomainkey.publicKey,
          can_vote: 0,
          periods: [
            {
              duration: 20000,
              percent: 40.0,
            },
            {
              duration: 40000,
              percent: 60.0,
            }
          ],
          amount: fundsAmount,
          max_fee: 400000000000,
          tpid: '',
          actor: userA1.account,
        }

      })
      expect(result.status).to.equal('OK')
      expect(result).to.have.all.keys( 'status', 'fee_collected')
    } catch (err) {
      console.log('Error', err)
    }
  })

  //now add some other funds to the locked token grant, so its a mix of locked and unlocked
  it(`Transfer 1000 FIO to locked token holder FIO public key`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: transferdomainkey.publicKey,
      amount: 1000000000000,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
   // console.log('Result: ', result)
    expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected')
  })

  it(`Get balance for the locked token holder, should have 1500 balance`, async () => {
    try {
      const json = {
        "fio_public_key": transferdomainkey.publicKey
      }
      result = await callFioApi("get_fio_balance", json);
      walletA1OrigRam = result.balance;
      expect(result.balance).to.equal(1500000000000)
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`Register domain:  succeeds`, async () => {
    try {
    domsdk = new FIOSDK(transferdomainkey.privateKey, transferdomainkey.publicKey, config.BASE_URL, fetchJson);
    domsdk.domain2 = generateFioDomain(8)
    const result = await domsdk.genericAction('registerFioDomain', {
      fioDomain: domsdk.domain2,
      maxFee: config.api.register_fio_domain.fee ,
      technologyProviderId: ''
    })
    //console.log('Result: ', result)
    expect(result).to.have.all.keys('status', 'expiration', 'fee_collected')
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  })

  it(`Transfer domain from locked token holder to userA1`, async () => {
    try {
      const result = await domsdk.genericAction('transferFioDomain', {
        fioDomain: domsdk.domain2,
        newOwnerKey: userA1.publicKey,
        maxFee: 400000000000,
        technologyProviderId: ''
      })
      feeCollected = result.fee_collected;
      //console.log('Result: ', result);
      expect(result.status).to.equal('OK');
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  })


  //end check that we arent abl to vote with this lock
})


describe(`C. staking incentives, canvote = false`, () => {

  let balancebefore, balanceafter, feetransferlocked,
  stakeKey1, stakeKey2, stakeKey3,stakeKey4, stakeKey5

  let totalstaking = 0

  describe(`Failure test -- incentivised period but not 100 percent`, () => {
    //error tests, not set 100%.
    it(`Failure test, transferLockedTokens ${fundsAmount}, not 100 percent`, async () => {
      try {
        stakeKey1 = await createKeypair();
        const result = await userA1.sdk.genericAction('pushTransaction', {
          action: 'trnsloctoks',
          account: 'fio.token',
          data: {
            payee_public_key: stakeKey1.publicKey,
            can_vote: 0,
            periods: [
              {
                duration: 15552000,
                percent: 90.0,
              }
            ],
            amount: fundsAmount,
            max_fee: 400000000000,
            tpid: '',
            actor: userA1.account,
          }

        })

      } catch (err) {
        //console.log('Error', err)
        var expected = `Error 400`
        expect(err.message).to.include(expected)
      }
    })

    //specify a first period that is incentivised and specify an additional period.
    it('get total staking rewards in state, ', async () => {
      let bundleCount
      try {
        const json = {
          json: true,               // Get the response as json
          code: 'eosio',      // Contract that we target
          scope: 'eosio',         // Account that owns the data
          table: 'global4',        // Table name
          limit: 1000,                // Maximum number of rows that we want to get
          reverse: false,           // Optional: Get reversed data
          show_payer: false          // Optional: Show ram payer
        }
        result = await callFioApi("get_table_rows", json);
        totalstaking = result.rows[0].total_staking_incentives_granted
      } catch (err) {
        console.log('Error', err);
        expect(err).to.equal(null);
      }
    })
  })


  describe(`SUCCESS -- no incentive given when first period is incentivised and second period exists`, () => {
    it(`transferLockedTokens ${fundsAmount}, no incentive test, set first period as incentive, then also spec a second period`, async () => {
      try {
        stakeKey1 = await createKeypair();
        userA1 = await newUser(faucet);
        const result = await userA1.sdk.genericAction('pushTransaction', {
          action: 'trnsloctoks',
          account: 'fio.token',
          data: {
            payee_public_key: stakeKey1.publicKey,
            can_vote: 0,
            periods: [
              {
                duration: 15552000,
                percent: 50.0,
              },
              {
                duration: 15552075,
                percent: 50.0,
              }
            ],
            amount: fundsAmount*2,
            max_fee: 400000000000,
            tpid: '',
            actor: userA1.account,
          }
        })
        expect(result.status).to.equal('OK')
        expect(result).to.have.all.keys('status', 'fee_collected')
      } catch (err) {
        console.log('edededed Error', err)
      }
    })

    it(`Get balance for Payee, should have 500`, async () => {
      try {
        const json = {
          "fio_public_key": stakeKey1.publicKey
        }
        result = await callFioApi("get_fio_balance", json);
        walletA1OrigRam = result.balance;
        expect(result.balance).to.equal(1000000000000)
        //console.log('result is : ', result);
      } catch (err) {
        //console.log('Error', err)
        expect(err).to.equal(null)
      }
    })
  })

  describe(`FAILURE -- general locked grants cannot be used for fees.`, () => {
    it(`Register domain for voting for locked funds account `, async () => {
      try {
        newFioDomain2 = generateFioDomain(15)
        const result = await userA1.sdk.genericAction('registerFioDomain', {
          fioDomain: newFioDomain2,
          maxFee: 800000000000,
          tpid: '',
        })
      } catch (err) {
        var expected = `Error 400`
        expect(err.message).to.include(expected)
      }
    })
  })

  describe(`SUCCESS -- no incentive given when two periods specified both are incentive duration.`, () => {
    it(`transferLockedTokens ${fundsAmount}, no incentive test, set first period as incentive, then also spec a second period as incentive`, async () => {
      try {
        stakeKey1 = await createKeypair();
        userA1 = await newUser(faucet);
        const result = await userA1.sdk.genericAction('pushTransaction', {
          action: 'trnsloctoks',
          account: 'fio.token',
          data: {
            payee_public_key: stakeKey1.publicKey,
            can_vote: 0,
            periods: [
              {
                duration: 15552000,
                percent: 50.0,
              },
              {
                duration: 31536000,
                percent: 50.0,
              }
            ],
            amount: fundsAmount,
            max_fee: 400000000000,
            tpid: '',
            actor: userA1.account,
          }

        })
        expect(result.status).to.equal('OK')
        expect(result).to.have.all.keys('status', 'fee_collected')
      } catch (err) {
        console.log('edeeedeeedeed 1 Error', err)
      }
    })

    it(`Get balance for Payee, should have 500`, async () => {
      try {
        const json = {
          "fio_public_key": stakeKey1.publicKey
        }
        result = await callFioApi("get_fio_balance", json);
        walletA1OrigRam = result.balance;
        expect(result.balance).to.equal(500000000000)
        //console.log('result is : ', result);
      } catch (err) {
        //console.log('Error', err)
        expect(err).to.equal(null)
      }
    })

    it('Verify total staking rewards in state, same as previous', async () => {
      let bundleCount
      try {
        const json = {
          json: true,               // Get the response as json
          code: 'eosio',      // Contract that we target
          scope: 'eosio',         // Account that owns the data
          table: 'global4',        // Table name
          limit: 1000,                // Maximum number of rows that we want to get
          reverse: false,           // Optional: Get reversed data
          show_payer: false          // Optional: Show ram payer
        }
        result = await callFioApi("get_table_rows", json);
        expect(result.rows[0].total_staking_incentives_granted).to.equal(totalstaking )
      } catch (err) {
        console.log('Error', err);
        expect(err).to.equal(null);
      }
    })
  })


  describe(`SUCCESS -- incentive period 15552000 gives 5%`, () => {
    //First tier tests
    it('get total staking rewards in state, ', async () => {
      let bundleCount
      try {
        const json = {
          json: true,               // Get the response as json
          code: 'eosio',      // Contract that we target
          scope: 'eosio',         // Account that owns the data
          table: 'global4',        // Table name
          limit: 1000,                // Maximum number of rows that we want to get
          reverse: false,           // Optional: Get reversed data
          show_payer: false          // Optional: Show ram payer
        }
        result = await callFioApi("get_table_rows", json);
        totalstaking = result.rows[0].total_staking_incentives_granted
      } catch (err) {
        console.log('Error', err);
        expect(err).to.equal(null);
      }
    })

    it(`transferLockedTokens ${fundsAmount}, canVote false, first tier staking incentive duration 15552000 percent incentive 5%`, async () => {
      try {
        stakeKey1 = await createKeypair();
        userA1 = await newUser(faucet);
        const result = await userA1.sdk.genericAction('pushTransaction', {
          action: 'trnsloctoks',
          account: 'fio.token',
          data: {
            payee_public_key: stakeKey1.publicKey,
            can_vote: 0,
            periods: [
              {
                duration: 15552000,
                percent: 100.0,
              }
            ],
            amount: fundsAmount,
            max_fee: 400000000000,
            tpid: '',
            actor: userA1.account,
          }

        })
        expect(result.status).to.equal('OK')
        expect(result).to.have.all.keys('status', 'fee_collected')
      } catch (err) {
        console.log('Error', err)
      }
    })

    it(`Get balance for Payee, should have 500 + 25`, async () => {
      try {
        const json = {
          "fio_public_key": stakeKey1.publicKey
        }
        result = await callFioApi("get_fio_balance", json);
        walletA1OrigRam = result.balance;
        expect(result.balance).to.equal(525000000000)
        //console.log('result is : ', result);
      } catch (err) {
        //console.log('Error', err)
        expect(err).to.equal(null)
      }
    })

    it('Verify total staking rewards in state, previous plus 25000000000', async () => {
      let bundleCount
      try {
        const json = {
          json: true,               // Get the response as json
          code: 'eosio',      // Contract that we target
          scope: 'eosio',         // Account that owns the data
          table: 'global4',        // Table name
          limit: 1000,                // Maximum number of rows that we want to get
          reverse: false,           // Optional: Get reversed data
          show_payer: false          // Optional: Show ram payer
        }
        result = await callFioApi("get_table_rows", json);
        expect(result.rows[0].total_staking_incentives_granted).to.equal(totalstaking + 25000000000)
      } catch (err) {
        console.log('Error', err);
        expect(err).to.equal(null);
      }
    })
  })

  describe(`SUCCESS -- incentive period 31536000 gives 15%`, () => {
    //second tier tests
    it('get total staking rewards in state, ', async () => {
      let bundleCount
      try {
        const json = {
          json: true,               // Get the response as json
          code: 'eosio',      // Contract that we target
          scope: 'eosio',         // Account that owns the data
          table: 'global4',        // Table name
          limit: 1000,                // Maximum number of rows that we want to get
          reverse: false,           // Optional: Get reversed data
          show_payer: false          // Optional: Show ram payer
        }
        result = await callFioApi("get_table_rows", json);
        totalstaking = result.rows[0].total_staking_incentives_granted
      } catch (err) {
        console.log('Error', err);
        expect(err).to.equal(null);
      }
    })

    it(`transferLockedTokens ${fundsAmount}, canVote false, second tier staking incentive duration 31536000 percent incentive 15%`, async () => {
      try {
        stakeKey2 = await createKeypair();
        userA1 = await newUser(faucet);
        const result = await userA1.sdk.genericAction('pushTransaction', {
          action: 'trnsloctoks',
          account: 'fio.token',
          data: {
            payee_public_key: stakeKey2.publicKey,
            can_vote: 0,
            periods: [
              {
                duration: 31536000,
                percent: 100.0,
              }
            ],
            amount: fundsAmount,
            max_fee: 400000000000,
            tpid: '',
            actor: userA1.account,
          }

        })
        expect(result.status).to.equal('OK')
        expect(result).to.have.all.keys('status', 'fee_collected')
      } catch (err) {
        console.log('Error', err)
      }
    })

    it(`Get balance for Payee, should have 500 + 75`, async () => {
      try {
        const json = {
          "fio_public_key": stakeKey2.publicKey
        }
        result = await callFioApi("get_fio_balance", json);
        walletA1OrigRam = result.balance;
        expect(result.balance).to.equal(575000000000)
        //console.log('result is : ', result);
      } catch (err) {
        //console.log('Error', err)
        expect(err).to.equal(null)
      }
    })

    it('Verify total staking rewards in state, previous plus 75000000000', async () => {
      let bundleCount
      try {
        const json = {
          json: true,               // Get the response as json
          code: 'eosio',      // Contract that we target
          scope: 'eosio',         // Account that owns the data
          table: 'global4',        // Table name
          limit: 1000,                // Maximum number of rows that we want to get
          reverse: false,           // Optional: Get reversed data
          show_payer: false          // Optional: Show ram payer
        }
        result = await callFioApi("get_table_rows", json);
        expect(result.rows[0].total_staking_incentives_granted).to.equal(totalstaking + 75000000000)
      } catch (err) {
        console.log('Error', err);
        expect(err).to.equal(null);
      }
    })
  })

  describe(`SUCCESS -- incentive period 63072000 gives 40%`, () => {
    //third tier tests
    it('get total staking rewards in state, ', async () => {
      let bundleCount
      try {
        const json = {
          json: true,               // Get the response as json
          code: 'eosio',      // Contract that we target
          scope: 'eosio',         // Account that owns the data
          table: 'global4',        // Table name
          limit: 1000,                // Maximum number of rows that we want to get
          reverse: false,           // Optional: Get reversed data
          show_payer: false          // Optional: Show ram payer
        }
        result = await callFioApi("get_table_rows", json);
        totalstaking = result.rows[0].total_staking_incentives_granted
      } catch (err) {
        console.log('Error', err);
        expect(err).to.equal(null);
      }
    })

    it(`transferLockedTokens ${fundsAmount}, canVote false, third tier staking incentive duration 63072000 percent incentive 40%`, async () => {
      try {
        stakeKey3 = await createKeypair();
        userA1 = await newUser(faucet);
        const result = await userA1.sdk.genericAction('pushTransaction', {
          action: 'trnsloctoks',
          account: 'fio.token',
          data: {
            payee_public_key: stakeKey3.publicKey,
            can_vote: 0,
            periods: [
              {
                duration: 63072000,
                percent: 100.0,
              }
            ],
            amount: fundsAmount,
            max_fee: 400000000000,
            tpid: '',
            actor: userA1.account,
          }

        })
        expect(result.status).to.equal('OK')
        expect(result).to.have.all.keys('status', 'fee_collected')
      } catch (err) {
        console.log('Error', err)
      }
    })

    it(`Get balance for Payee, should have 500 + 200`, async () => {
      try {
        const json = {
          "fio_public_key": stakeKey3.publicKey
        }
        result = await callFioApi("get_fio_balance", json);
        walletA1OrigRam = result.balance;
        expect(result.balance).to.equal(700000000000)
        //console.log('result is : ', result);
      } catch (err) {
        //console.log('Error', err)
        expect(err).to.equal(null)
      }
    })

    it('Verify total staking rewards in state, previous plus 200000000000', async () => {
      let bundleCount
      try {
        const json = {
          json: true,               // Get the response as json
          code: 'eosio',      // Contract that we target
          scope: 'eosio',         // Account that owns the data
          table: 'global4',        // Table name
          limit: 1000,                // Maximum number of rows that we want to get
          reverse: false,           // Optional: Get reversed data
          show_payer: false          // Optional: Show ram payer
        }
        result = await callFioApi("get_table_rows", json);
        expect(result.rows[0].total_staking_incentives_granted).to.equal(totalstaking + 200000000000)
      } catch (err) {
        console.log('Error', err);
        expect(err).to.equal(null);
      }
    })
  })

  describe(`SUCCESS -- incentive period 94608000 gives 90%`, () => {
    //fourth tier tests
    it('get total staking rewards in state, ', async () => {
      let bundleCount
      try {
        const json = {
          json: true,               // Get the response as json
          code: 'eosio',      // Contract that we target
          scope: 'eosio',         // Account that owns the data
          table: 'global4',        // Table name
          limit: 1000,                // Maximum number of rows that we want to get
          reverse: false,           // Optional: Get reversed data
          show_payer: false          // Optional: Show ram payer
        }
        result = await callFioApi("get_table_rows", json);
        totalstaking = result.rows[0].total_staking_incentives_granted
      } catch (err) {
        console.log('Error', err);
        expect(err).to.equal(null);
      }
    })

    it(`transferLockedTokens ${fundsAmount}, canVote false, fourth tier staking incentive duration 94608000 percent incentive 90%`, async () => {
      try {
        stakeKey4 = await createKeypair();
        userA1 = await newUser(faucet);
        const result = await userA1.sdk.genericAction('pushTransaction', {
          action: 'trnsloctoks',
          account: 'fio.token',
          data: {
            payee_public_key: stakeKey4.publicKey,
            can_vote: 0,
            periods: [
              {
                duration: 94608000,
                percent: 100.0,
              }
            ],
            amount: fundsAmount,
            max_fee: 400000000000,
            tpid: '',
            actor: userA1.account,
          }

        })
        expect(result.status).to.equal('OK')
        expect(result).to.have.all.keys('status', 'fee_collected')
      } catch (err) {
        console.log('Error', err)
      }
    })

    it(`Get balance for Payee, should have 500 + 450`, async () => {
      try {
        const json = {
          "fio_public_key": stakeKey4.publicKey
        }
        result = await callFioApi("get_fio_balance", json);
        walletA1OrigRam = result.balance;
        expect(result.balance).to.equal(950000000000)
        //console.log('result is : ', result);
      } catch (err) {
        //console.log('Error', err)
        expect(err).to.equal(null)
      }
    })

    it('Verify total staking rewards in state, previous plus 450000000000', async () => {
      let bundleCount
      try {
        const json = {
          json: true,               // Get the response as json
          code: 'eosio',      // Contract that we target
          scope: 'eosio',         // Account that owns the data
          table: 'global4',        // Table name
          limit: 1000,                // Maximum number of rows that we want to get
          reverse: false,           // Optional: Get reversed data
          show_payer: false          // Optional: Show ram payer
        }
        result = await callFioApi("get_table_rows", json);
        expect(result.rows[0].total_staking_incentives_granted).to.equal(totalstaking + 450000000000)
      } catch (err) {
        console.log('Error', err);
        expect(err).to.equal(null);
      }
    })
  })

  describe(`FAILURE -- try to transfer locked tokens to an incentivised grant fails`, () => {
    //try to re-lock a grant with one period that is incentivised.
    it(`transferLockedTokens ${fundsAmount}, Error, try to re-lock a grant that is incentivised`, async () => {
      try {
        userA1 = await newUser(faucet);
        const result = await userA1.sdk.genericAction('pushTransaction', {
          action: 'trnsloctoks',
          account: 'fio.token',
          data: {
            payee_public_key: stakeKey4.publicKey,
            can_vote: 0,
            periods: [
              {
                duration: 94608000,
                percent: 100.0,
              }
            ],
            amount: fundsAmount,
            max_fee: 400000000000,
            tpid: '',
            actor: userA1.account,
          }

        })
        expect(1).to.equal(2)
      } catch (err) {
        var expected = `Error 400`
        expect(err.message).to.include(expected)
      }
    })
  })

  describe(`SUCCESS -- no incentives given to one period grant not specifying the incentive duration`, () => {
    //no incentive one period  tests
    it('get total staking rewards in state, ', async () => {
      let bundleCount
      try {
        const json = {
          json: true,               // Get the response as json
          code: 'eosio',      // Contract that we target
          scope: 'eosio',         // Account that owns the data
          table: 'global4',        // Table name
          limit: 1000,                // Maximum number of rows that we want to get
          reverse: false,           // Optional: Get reversed data
          show_payer: false          // Optional: Show ram payer
        }
        result = await callFioApi("get_table_rows", json);
        totalstaking = result.rows[0].total_staking_incentives_granted
      } catch (err) {
        console.log('Error', err);
        expect(err).to.equal(null);
      }
    })

    it(`transferLockedTokens ${fundsAmount}, canVote false, NO staking incentive duration 1000 `, async () => {
      try {
        stakeKey5 = await createKeypair();
        userA1 = await newUser(faucet);
        const result = await userA1.sdk.genericAction('pushTransaction', {
          action: 'trnsloctoks',
          account: 'fio.token',
          data: {
            payee_public_key: stakeKey5.publicKey,
            can_vote: 0,
            periods: [
              {
                duration: 1000,
                percent: 100.0,
              }
            ],
            amount: fundsAmount,
            max_fee: 400000000000,
            tpid: '',
            actor: userA1.account,
          }

        })
        expect(result.status).to.equal('OK')
        expect(result).to.have.all.keys('status', 'fee_collected')
      } catch (err) {
        console.log('Error', err)
      }
    })

    it(`Get balance for Payee, should have 500`, async () => {
      try {
        const json = {
          "fio_public_key": stakeKey5.publicKey
        }
        result = await callFioApi("get_fio_balance", json);
        walletA1OrigRam = result.balance;
        expect(result.balance).to.equal(500000000000)
        //console.log('result is : ', result);
      } catch (err) {
        //console.log('Error', err)
        expect(err).to.equal(null)
      }
    })

    it('Verify total staking rewards in state, unchanged', async () => {
      let bundleCount
      try {
        const json = {
          json: true,               // Get the response as json
          code: 'eosio',      // Contract that we target
          scope: 'eosio',         // Account that owns the data
          table: 'global4',        // Table name
          limit: 1000,                // Maximum number of rows that we want to get
          reverse: false,           // Optional: Get reversed data
          show_payer: false          // Optional: Show ram payer
        }
        result = await callFioApi("get_table_rows", json);
        expect(result.rows[0].total_staking_incentives_granted).to.equal(totalstaking )
      } catch (err) {
        console.log('Error', err);
        expect(err).to.equal(null);
      }
    })
  })


  describe(`SUCCESS -- lock one SUF as incetivised, no incentive given, 0 incentive calculated`, () => {
    it(`transferLockedTokens ${fundsAmount}, canVote false, staking incentive 1 SUF duration 15552000 `, async () => {
      try {
        stakeKey5 = await createKeypair();
        userA1 = await newUser(faucet);
        const result = await userA1.sdk.genericAction('pushTransaction', {
          action: 'trnsloctoks',
          account: 'fio.token',
          data: {
            payee_public_key: stakeKey5.publicKey,
            can_vote: 0,
            periods: [
              {
                duration: 15552000,
                percent: 100.0,
              }
            ],
            amount: 1,
            max_fee: 400000000000,
            tpid: '',
            actor: userA1.account,
          }

        })
        expect(result.status).to.equal('OK')
        expect(result).to.have.all.keys('status', 'fee_collected')
      } catch (err) {
        console.log('Error', err)
      }
    })

    it(`Get balance for Payee, should have 1 suf`, async () => {
      try {
        const json = {
          "fio_public_key": stakeKey5.publicKey
        }
        result = await callFioApi("get_fio_balance", json);
        walletA1OrigRam = result.balance;
        expect(result.balance).to.equal(1)
        //console.log('result is : ', result);
      } catch (err) {
        //console.log('Error', err)
        expect(err).to.equal(null)
      }
    })
  })


  //end check that we arent abl to vote with this lock
})
//end new tests matching testing requirements.


describe(`D. Canvote true, verify tokens are voted.`, () => {

  //test cases
  it(`Test Case: create votable locked tokens. verify they are votable`, async () => { })

  it(`Transfer ${fundsAmount} locked FIO, canVote true`, async () => {
    try {
      const result = await userA1.sdk.genericAction('pushTransaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        data: {
          payee_public_key: keys3.publicKey,
          can_vote: 1,
          periods: [
            {
              duration: 20,
              percent: 50.0,
            },
            {
              duration: 40,
              percent: 50.0,
            }
          ],
          amount: fundsAmount,
          max_fee: 400000000000,
          tpid: '',
          actor: userA1.account,
        }

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

describe(`E. Token unlocking tests`, () => {

  it(`Transfer ${fundsAmount} locked FIO using canvote false, two lock periods of 20 sec and 50 percent`, async () => {
    try {
      userA1 = await newUser(faucet);
      const result = await userA1.sdk.genericAction('pushTransaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        data: {
          payee_public_key: keys2.publicKey,
          can_vote: 0,
          periods: [
            {
              duration: 1,
              percent: 0.273,
            },
            {
              duration: 2,
              percent: .273,
            },
            {
              duration: 3,
              percent: .273,
            },
            {
              duration: 4,
              percent: .273,
            },
            {
              duration: 5,
              percent: .273,
            },
            {
              duration: 6,
              percent: .273,
            },
            {
              duration: 7,
              percent: .273,
            },
            {
              duration: 8,
              percent: .273,
            },
            {
              duration: 9,
              percent: .273,
            },
            {
              duration: 10,
              percent: .273,
            },
            {
              duration: 11,
              percent: .273,
            },
            {
              duration: 12,
              percent: .273,
            },
            {
              duration: 13,
              percent: .273,
            },
            {
              duration: 14,
              percent: .273,
            },
            {
              duration: 15,
              percent: .273,
            },
            {
              duration: 16,
              percent: .273,
            },
            {
              duration: 17,
              percent: .273,
            },
            {
              duration: 18,
              percent: .273,
            },
            {
              duration: 19,
              percent: .273,
            },
            {
              duration: 20,
              percent: .273,
            },
            {
              duration: 21,
              percent: .273,
            },
            {
              duration: 22,
              percent: .273,
            },
            {
              duration: 23,
              percent: .273,
            },
            {
              duration: 24,
              percent: .273,
            },
            {
              duration: 25,
              percent: .273,
            },
            {
              duration: 26,
              percent: .273,
            },
            {
              duration: 27,
              percent: .273,
            },
            {
              duration: 28,
              percent: .273,
            },
            {
              duration: 29,
              percent: .273,
            },
            {
              duration: 30,
              percent: .273,
            },
            {
              duration: 31,
              percent: .273,
            },
            {
              duration: 32,
              percent: .273,
            },
            {
              duration: 33,
              percent: .273,
            },
            {
              duration: 34,
              percent: .273,
            },
            {
              duration: 35,
              percent: .273,
            },
            {
              duration: 36,
              percent: .273,
            },
            {
              duration: 37,
              percent: .273,
            },
            {
              duration: 38,
              percent: .273,
            },
            {
              duration: 39,
              percent: .273,
            },
            {
              duration: 40,
              percent: .273,
            },
            {
              duration: 41,
              percent: .273,
            },
            {
              duration: 42,
              percent: .273,
            },
            {
              duration: 43,
              percent: .273,
            },
            {
              duration: 44,
              percent: .273,
            },
            {
              duration: 45,
              percent: .273,
            },
            {
              duration: 46,
              percent: .273,
            },
            {
              duration: 47,
              percent: .273,
            },
            {
              duration: 48,
              percent: .273,
            },
            {
              duration: 49,
              percent: .273,
            },
            {
              duration: 50,
              percent: 86.623,
            }
          ],
          amount: fundsAmount,
          max_fee: 400000000000,
          tpid: '',
          actor: userA1.account,
        }

      })
      expect(result.status).to.equal('OK')
      expect(result).to.have.all.keys( 'status', 'fee_collected')
    } catch (err) {
      console.log('Error', err)
    }
  })


  it(`Waiting 20 seconds`, async () => {
    console.log("            waiting 20 seconds ")
  })

  it(` wait 20 seconds`, async () => {
    try {
     wait(20000)
    } catch (err) {
      console.log('Error', err)
    }
  })

  //try to transfer whole amount, fail.
  it(`Transfer ${fundsAmount} Fail, fail to transfer entire amount`, async () => {
    try{
    const result = await locksdk2.genericAction('transferTokens', {
      payeeFioPublicKey: userA1.publicKey,
      amount: 495000000000,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
      expect(result.status).to.not.equal('OK')
  } catch (err) {
    var expected = `Error 400`
    expect(err.message).to.include(expected)
  }
  })


it(`Transfer 1 FIO to another account`, async () => {
  const result = await locksdk2.genericAction('transferTokens', {
    payeeFioPublicKey: userA1.publicKey,
    amount: 1000000000,
    maxFee: config.api.transfer_tokens_pub_key.fee,
    technologyProviderId: ''
  })
  expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected')
})

  it(`Waiting 20 seconds`, async () => {
    console.log("            waiting 20 seconds ")
  })

it(` wait 20 seconds`, async () => {
  try {
    wait(20000)
  } catch (err) {
    console.log('Error', err)
  }
})


it(`Transfer 5 FIO to another account`, async () => {
  const result = await locksdk2.genericAction('transferTokens', {
    payeeFioPublicKey: userA1.publicKey,
    amount: 5000000000,
    maxFee: config.api.transfer_tokens_pub_key.fee,
    technologyProviderId: ''
  })
  expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected')
})

  it(`Waiting 20 seconds`, async () => {
    console.log("            waiting 20 seconds ")
  })
  it(` wait 20 seconds`, async () => {
    try {
      wait(20000)
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`Transfer 400 FIO to another account`, async () => {
    const result = await locksdk2.genericAction('transferTokens', {
      payeeFioPublicKey: userA1.publicKey,
      amount: 400000000000,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected')
  })

})




let accounts = [], privkeys = [], pubkeys = []
let lockholder

//to perform max tests, comment out the tests (B,C,D), then run the load the protocol with 50k general grants
//test (E), add the desired number of grants to the system, then skip the load the protocol with 50k general grants test (E)
//and run (A,B,C,D). this proves the loaded system runs without issue.
describe(`F. MAX tests`, () => {

  /*
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                percent: 0.273,
              },
              {
                duration: 2,
                percent: .273,
              },
              {
                duration: 3,
                percent: .273,
              },
              {
                duration: 4,
                percent: .273,
              },
              {
                duration: 5,
                percent: .273,
              },
              {
                duration: 6,
                percent: .273,
              },
              {
                duration: 7,
                percent: .273,
              },
              {
                duration: 8,
                percent: .273,
              },
              {
                duration: 9,
                percent: .273,
              },
              {
                duration: 10,
                percent: .273,
              },
              {
                duration: 11,
                percent: .273,
              },
              {
                duration: 12,
                percent: .273,
              },
              {
                duration: 13,
                percent: .273,
              },
              {
                duration: 14,
                percent: .273,
              },
              {
                duration: 15,
                percent: .273,
              },
              {
                duration: 16,
                percent: .273,
              },
              {
                duration: 17,
                percent: .273,
              },
              {
                duration: 18,
                percent: .273,
              },
              {
                duration: 19,
                percent: .273,
              },
              {
                duration: 20,
                percent: .273,
              },
              {
                duration: 21,
                percent: .273,
              },
              {
                duration: 22,
                percent: .273,
              },
              {
                duration: 23,
                percent: .273,
              },
              {
                duration: 24,
                percent: .273,
              },
              {
                duration: 25,
                percent: .273,
              },
              {
                duration: 26,
                percent: .273,
              },
              {
                duration: 27,
                percent: .273,
              },
              {
                duration: 28,
                percent: .273,
              },
              {
                duration: 29,
                percent: .273,
              },
              {
                duration: 30,
                percent: .273,
              },
              {
                duration: 31,
                percent: .273,
              },
              {
                duration: 32,
                percent: .273,
              },
              {
                duration: 33,
                percent: .273,
              },
              {
                duration: 34,
                percent: .273,
              },
              {
                duration: 35,
                percent: .273,
              },
              {
                duration: 36,
                percent: .273,
              },
              {
                duration: 37,
                percent: .273,
              },
              {
                duration: 38,
                percent: .273,
              },
              {
                duration: 39,
                percent: .273,
              },
              {
                duration: 40,
                percent: .273,
              },
              {
                duration: 41,
                percent: .273,
              },
              {
                duration: 42,
                percent: .273,
              },
              {
                duration: 43,
                percent: .273,
              },
              {
                duration: 44,
                percent: .273,
              },
              {
                duration: 45,
                percent: .273,
              },
              {
                duration: 46,
                percent: .273,
              },
              {
                duration: 47,
                percent: .273,
              },
              {
                duration: 48,
                percent: .273,
              },
              {
                duration: 49,
                percent: .273,
              },
              {
                duration: 50,
                percent: 86.623,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
      }
    catch
      (err)
      {
        console.log('Error', err)
      }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                percent: 0.273,
              },
              {
                duration: 2,
                percent: .273,
              },
              {
                duration: 3,
                percent: .273,
              },
              {
                duration: 4,
                percent: .273,
              },
              {
                duration: 5,
                percent: .273,
              },
              {
                duration: 6,
                percent: .273,
              },
              {
                duration: 7,
                percent: .273,
              },
              {
                duration: 8,
                percent: .273,
              },
              {
                duration: 9,
                percent: .273,
              },
              {
                duration: 10,
                percent: .273,
              },
              {
                duration: 11,
                percent: .273,
              },
              {
                duration: 12,
                percent: .273,
              },
              {
                duration: 13,
                percent: .273,
              },
              {
                duration: 14,
                percent: .273,
              },
              {
                duration: 15,
                percent: .273,
              },
              {
                duration: 16,
                percent: .273,
              },
              {
                duration: 17,
                percent: .273,
              },
              {
                duration: 18,
                percent: .273,
              },
              {
                duration: 19,
                percent: .273,
              },
              {
                duration: 20,
                percent: .273,
              },
              {
                duration: 21,
                percent: .273,
              },
              {
                duration: 22,
                percent: .273,
              },
              {
                duration: 23,
                percent: .273,
              },
              {
                duration: 24,
                percent: .273,
              },
              {
                duration: 25,
                percent: .273,
              },
              {
                duration: 26,
                percent: .273,
              },
              {
                duration: 27,
                percent: .273,
              },
              {
                duration: 28,
                percent: .273,
              },
              {
                duration: 29,
                percent: .273,
              },
              {
                duration: 30,
                percent: .273,
              },
              {
                duration: 31,
                percent: .273,
              },
              {
                duration: 32,
                percent: .273,
              },
              {
                duration: 33,
                percent: .273,
              },
              {
                duration: 34,
                percent: .273,
              },
              {
                duration: 35,
                percent: .273,
              },
              {
                duration: 36,
                percent: .273,
              },
              {
                duration: 37,
                percent: .273,
              },
              {
                duration: 38,
                percent: .273,
              },
              {
                duration: 39,
                percent: .273,
              },
              {
                duration: 40,
                percent: .273,
              },
              {
                duration: 41,
                percent: .273,
              },
              {
                duration: 42,
                percent: .273,
              },
              {
                duration: 43,
                percent: .273,
              },
              {
                duration: 44,
                percent: .273,
              },
              {
                duration: 45,
                percent: .273,
              },
              {
                duration: 46,
                percent: .273,
              },
              {
                duration: 47,
                percent: .273,
              },
              {
                duration: 48,
                percent: .273,
              },
              {
                duration: 49,
                percent: .273,
              },
              {
                duration: 50,
                percent: 86.623,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                percent: 0.273,
              },
              {
                duration: 2,
                percent: .273,
              },
              {
                duration: 3,
                percent: .273,
              },
              {
                duration: 4,
                percent: .273,
              },
              {
                duration: 5,
                percent: .273,
              },
              {
                duration: 6,
                percent: .273,
              },
              {
                duration: 7,
                percent: .273,
              },
              {
                duration: 8,
                percent: .273,
              },
              {
                duration: 9,
                percent: .273,
              },
              {
                duration: 10,
                percent: .273,
              },
              {
                duration: 11,
                percent: .273,
              },
              {
                duration: 12,
                percent: .273,
              },
              {
                duration: 13,
                percent: .273,
              },
              {
                duration: 14,
                percent: .273,
              },
              {
                duration: 15,
                percent: .273,
              },
              {
                duration: 16,
                percent: .273,
              },
              {
                duration: 17,
                percent: .273,
              },
              {
                duration: 18,
                percent: .273,
              },
              {
                duration: 19,
                percent: .273,
              },
              {
                duration: 20,
                percent: .273,
              },
              {
                duration: 21,
                percent: .273,
              },
              {
                duration: 22,
                percent: .273,
              },
              {
                duration: 23,
                percent: .273,
              },
              {
                duration: 24,
                percent: .273,
              },
              {
                duration: 25,
                percent: .273,
              },
              {
                duration: 26,
                percent: .273,
              },
              {
                duration: 27,
                percent: .273,
              },
              {
                duration: 28,
                percent: .273,
              },
              {
                duration: 29,
                percent: .273,
              },
              {
                duration: 30,
                percent: .273,
              },
              {
                duration: 31,
                percent: .273,
              },
              {
                duration: 32,
                percent: .273,
              },
              {
                duration: 33,
                percent: .273,
              },
              {
                duration: 34,
                percent: .273,
              },
              {
                duration: 35,
                percent: .273,
              },
              {
                duration: 36,
                percent: .273,
              },
              {
                duration: 37,
                percent: .273,
              },
              {
                duration: 38,
                percent: .273,
              },
              {
                duration: 39,
                percent: .273,
              },
              {
                duration: 40,
                percent: .273,
              },
              {
                duration: 41,
                percent: .273,
              },
              {
                duration: 42,
                percent: .273,
              },
              {
                duration: 43,
                percent: .273,
              },
              {
                duration: 44,
                percent: .273,
              },
              {
                duration: 45,
                percent: .273,
              },
              {
                duration: 46,
                percent: .273,
              },
              {
                duration: 47,
                percent: .273,
              },
              {
                duration: 48,
                percent: .273,
              },
              {
                duration: 49,
                percent: .273,
              },
              {
                duration: 50,
                percent: 86.623,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                percent: 0.273,
              },
              {
                duration: 2,
                percent: .273,
              },
              {
                duration: 3,
                percent: .273,
              },
              {
                duration: 4,
                percent: .273,
              },
              {
                duration: 5,
                percent: .273,
              },
              {
                duration: 6,
                percent: .273,
              },
              {
                duration: 7,
                percent: .273,
              },
              {
                duration: 8,
                percent: .273,
              },
              {
                duration: 9,
                percent: .273,
              },
              {
                duration: 10,
                percent: .273,
              },
              {
                duration: 11,
                percent: .273,
              },
              {
                duration: 12,
                percent: .273,
              },
              {
                duration: 13,
                percent: .273,
              },
              {
                duration: 14,
                percent: .273,
              },
              {
                duration: 15,
                percent: .273,
              },
              {
                duration: 16,
                percent: .273,
              },
              {
                duration: 17,
                percent: .273,
              },
              {
                duration: 18,
                percent: .273,
              },
              {
                duration: 19,
                percent: .273,
              },
              {
                duration: 20,
                percent: .273,
              },
              {
                duration: 21,
                percent: .273,
              },
              {
                duration: 22,
                percent: .273,
              },
              {
                duration: 23,
                percent: .273,
              },
              {
                duration: 24,
                percent: .273,
              },
              {
                duration: 25,
                percent: .273,
              },
              {
                duration: 26,
                percent: .273,
              },
              {
                duration: 27,
                percent: .273,
              },
              {
                duration: 28,
                percent: .273,
              },
              {
                duration: 29,
                percent: .273,
              },
              {
                duration: 30,
                percent: .273,
              },
              {
                duration: 31,
                percent: .273,
              },
              {
                duration: 32,
                percent: .273,
              },
              {
                duration: 33,
                percent: .273,
              },
              {
                duration: 34,
                percent: .273,
              },
              {
                duration: 35,
                percent: .273,
              },
              {
                duration: 36,
                percent: .273,
              },
              {
                duration: 37,
                percent: .273,
              },
              {
                duration: 38,
                percent: .273,
              },
              {
                duration: 39,
                percent: .273,
              },
              {
                duration: 40,
                percent: .273,
              },
              {
                duration: 41,
                percent: .273,
              },
              {
                duration: 42,
                percent: .273,
              },
              {
                duration: 43,
                percent: .273,
              },
              {
                duration: 44,
                percent: .273,
              },
              {
                duration: 45,
                percent: .273,
              },
              {
                duration: 46,
                percent: .273,
              },
              {
                duration: 47,
                percent: .273,
              },
              {
                duration: 48,
                percent: .273,
              },
              {
                duration: 49,
                percent: .273,
              },
              {
                duration: 50,
                percent: 86.623,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                percent: 0.273,
              },
              {
                duration: 2,
                percent: .273,
              },
              {
                duration: 3,
                percent: .273,
              },
              {
                duration: 4,
                percent: .273,
              },
              {
                duration: 5,
                percent: .273,
              },
              {
                duration: 6,
                percent: .273,
              },
              {
                duration: 7,
                percent: .273,
              },
              {
                duration: 8,
                percent: .273,
              },
              {
                duration: 9,
                percent: .273,
              },
              {
                duration: 10,
                percent: .273,
              },
              {
                duration: 11,
                percent: .273,
              },
              {
                duration: 12,
                percent: .273,
              },
              {
                duration: 13,
                percent: .273,
              },
              {
                duration: 14,
                percent: .273,
              },
              {
                duration: 15,
                percent: .273,
              },
              {
                duration: 16,
                percent: .273,
              },
              {
                duration: 17,
                percent: .273,
              },
              {
                duration: 18,
                percent: .273,
              },
              {
                duration: 19,
                percent: .273,
              },
              {
                duration: 20,
                percent: .273,
              },
              {
                duration: 21,
                percent: .273,
              },
              {
                duration: 22,
                percent: .273,
              },
              {
                duration: 23,
                percent: .273,
              },
              {
                duration: 24,
                percent: .273,
              },
              {
                duration: 25,
                percent: .273,
              },
              {
                duration: 26,
                percent: .273,
              },
              {
                duration: 27,
                percent: .273,
              },
              {
                duration: 28,
                percent: .273,
              },
              {
                duration: 29,
                percent: .273,
              },
              {
                duration: 30,
                percent: .273,
              },
              {
                duration: 31,
                percent: .273,
              },
              {
                duration: 32,
                percent: .273,
              },
              {
                duration: 33,
                percent: .273,
              },
              {
                duration: 34,
                percent: .273,
              },
              {
                duration: 35,
                percent: .273,
              },
              {
                duration: 36,
                percent: .273,
              },
              {
                duration: 37,
                percent: .273,
              },
              {
                duration: 38,
                percent: .273,
              },
              {
                duration: 39,
                percent: .273,
              },
              {
                duration: 40,
                percent: .273,
              },
              {
                duration: 41,
                percent: .273,
              },
              {
                duration: 42,
                percent: .273,
              },
              {
                duration: 43,
                percent: .273,
              },
              {
                duration: 44,
                percent: .273,
              },
              {
                duration: 45,
                percent: .273,
              },
              {
                duration: 46,
                percent: .273,
              },
              {
                duration: 47,
                percent: .273,
              },
              {
                duration: 48,
                percent: .273,
              },
              {
                duration: 49,
                percent: .273,
              },
              {
                duration: 50,
                percent: 86.623,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                percent: 0.273,
              },
              {
                duration: 2,
                percent: .273,
              },
              {
                duration: 3,
                percent: .273,
              },
              {
                duration: 4,
                percent: .273,
              },
              {
                duration: 5,
                percent: .273,
              },
              {
                duration: 6,
                percent: .273,
              },
              {
                duration: 7,
                percent: .273,
              },
              {
                duration: 8,
                percent: .273,
              },
              {
                duration: 9,
                percent: .273,
              },
              {
                duration: 10,
                percent: .273,
              },
              {
                duration: 11,
                percent: .273,
              },
              {
                duration: 12,
                percent: .273,
              },
              {
                duration: 13,
                percent: .273,
              },
              {
                duration: 14,
                percent: .273,
              },
              {
                duration: 15,
                percent: .273,
              },
              {
                duration: 16,
                percent: .273,
              },
              {
                duration: 17,
                percent: .273,
              },
              {
                duration: 18,
                percent: .273,
              },
              {
                duration: 19,
                percent: .273,
              },
              {
                duration: 20,
                percent: .273,
              },
              {
                duration: 21,
                percent: .273,
              },
              {
                duration: 22,
                percent: .273,
              },
              {
                duration: 23,
                percent: .273,
              },
              {
                duration: 24,
                percent: .273,
              },
              {
                duration: 25,
                percent: .273,
              },
              {
                duration: 26,
                percent: .273,
              },
              {
                duration: 27,
                percent: .273,
              },
              {
                duration: 28,
                percent: .273,
              },
              {
                duration: 29,
                percent: .273,
              },
              {
                duration: 30,
                percent: .273,
              },
              {
                duration: 31,
                percent: .273,
              },
              {
                duration: 32,
                percent: .273,
              },
              {
                duration: 33,
                percent: .273,
              },
              {
                duration: 34,
                percent: .273,
              },
              {
                duration: 35,
                percent: .273,
              },
              {
                duration: 36,
                percent: .273,
              },
              {
                duration: 37,
                percent: .273,
              },
              {
                duration: 38,
                percent: .273,
              },
              {
                duration: 39,
                percent: .273,
              },
              {
                duration: 40,
                percent: .273,
              },
              {
                duration: 41,
                percent: .273,
              },
              {
                duration: 42,
                percent: .273,
              },
              {
                duration: 43,
                percent: .273,
              },
              {
                duration: 44,
                percent: .273,
              },
              {
                duration: 45,
                percent: .273,
              },
              {
                duration: 46,
                percent: .273,
              },
              {
                duration: 47,
                percent: .273,
              },
              {
                duration: 48,
                percent: .273,
              },
              {
                duration: 49,
                percent: .273,
              },
              {
                duration: 50,
                percent: 86.623,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                percent: 0.273,
              },
              {
                duration: 2,
                percent: .273,
              },
              {
                duration: 3,
                percent: .273,
              },
              {
                duration: 4,
                percent: .273,
              },
              {
                duration: 5,
                percent: .273,
              },
              {
                duration: 6,
                percent: .273,
              },
              {
                duration: 7,
                percent: .273,
              },
              {
                duration: 8,
                percent: .273,
              },
              {
                duration: 9,
                percent: .273,
              },
              {
                duration: 10,
                percent: .273,
              },
              {
                duration: 11,
                percent: .273,
              },
              {
                duration: 12,
                percent: .273,
              },
              {
                duration: 13,
                percent: .273,
              },
              {
                duration: 14,
                percent: .273,
              },
              {
                duration: 15,
                percent: .273,
              },
              {
                duration: 16,
                percent: .273,
              },
              {
                duration: 17,
                percent: .273,
              },
              {
                duration: 18,
                percent: .273,
              },
              {
                duration: 19,
                percent: .273,
              },
              {
                duration: 20,
                percent: .273,
              },
              {
                duration: 21,
                percent: .273,
              },
              {
                duration: 22,
                percent: .273,
              },
              {
                duration: 23,
                percent: .273,
              },
              {
                duration: 24,
                percent: .273,
              },
              {
                duration: 25,
                percent: .273,
              },
              {
                duration: 26,
                percent: .273,
              },
              {
                duration: 27,
                percent: .273,
              },
              {
                duration: 28,
                percent: .273,
              },
              {
                duration: 29,
                percent: .273,
              },
              {
                duration: 30,
                percent: .273,
              },
              {
                duration: 31,
                percent: .273,
              },
              {
                duration: 32,
                percent: .273,
              },
              {
                duration: 33,
                percent: .273,
              },
              {
                duration: 34,
                percent: .273,
              },
              {
                duration: 35,
                percent: .273,
              },
              {
                duration: 36,
                percent: .273,
              },
              {
                duration: 37,
                percent: .273,
              },
              {
                duration: 38,
                percent: .273,
              },
              {
                duration: 39,
                percent: .273,
              },
              {
                duration: 40,
                percent: .273,
              },
              {
                duration: 41,
                percent: .273,
              },
              {
                duration: 42,
                percent: .273,
              },
              {
                duration: 43,
                percent: .273,
              },
              {
                duration: 44,
                percent: .273,
              },
              {
                duration: 45,
                percent: .273,
              },
              {
                duration: 46,
                percent: .273,
              },
              {
                duration: 47,
                percent: .273,
              },
              {
                duration: 48,
                percent: .273,
              },
              {
                duration: 49,
                percent: .273,
              },
              {
                duration: 50,
                percent: 86.623,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                percent: 0.273,
              },
              {
                duration: 2,
                percent: .273,
              },
              {
                duration: 3,
                percent: .273,
              },
              {
                duration: 4,
                percent: .273,
              },
              {
                duration: 5,
                percent: .273,
              },
              {
                duration: 6,
                percent: .273,
              },
              {
                duration: 7,
                percent: .273,
              },
              {
                duration: 8,
                percent: .273,
              },
              {
                duration: 9,
                percent: .273,
              },
              {
                duration: 10,
                percent: .273,
              },
              {
                duration: 11,
                percent: .273,
              },
              {
                duration: 12,
                percent: .273,
              },
              {
                duration: 13,
                percent: .273,
              },
              {
                duration: 14,
                percent: .273,
              },
              {
                duration: 15,
                percent: .273,
              },
              {
                duration: 16,
                percent: .273,
              },
              {
                duration: 17,
                percent: .273,
              },
              {
                duration: 18,
                percent: .273,
              },
              {
                duration: 19,
                percent: .273,
              },
              {
                duration: 20,
                percent: .273,
              },
              {
                duration: 21,
                percent: .273,
              },
              {
                duration: 22,
                percent: .273,
              },
              {
                duration: 23,
                percent: .273,
              },
              {
                duration: 24,
                percent: .273,
              },
              {
                duration: 25,
                percent: .273,
              },
              {
                duration: 26,
                percent: .273,
              },
              {
                duration: 27,
                percent: .273,
              },
              {
                duration: 28,
                percent: .273,
              },
              {
                duration: 29,
                percent: .273,
              },
              {
                duration: 30,
                percent: .273,
              },
              {
                duration: 31,
                percent: .273,
              },
              {
                duration: 32,
                percent: .273,
              },
              {
                duration: 33,
                percent: .273,
              },
              {
                duration: 34,
                percent: .273,
              },
              {
                duration: 35,
                percent: .273,
              },
              {
                duration: 36,
                percent: .273,
              },
              {
                duration: 37,
                percent: .273,
              },
              {
                duration: 38,
                percent: .273,
              },
              {
                duration: 39,
                percent: .273,
              },
              {
                duration: 40,
                percent: .273,
              },
              {
                duration: 41,
                percent: .273,
              },
              {
                duration: 42,
                percent: .273,
              },
              {
                duration: 43,
                percent: .273,
              },
              {
                duration: 44,
                percent: .273,
              },
              {
                duration: 45,
                percent: .273,
              },
              {
                duration: 46,
                percent: .273,
              },
              {
                duration: 47,
                percent: .273,
              },
              {
                duration: 48,
                percent: .273,
              },
              {
                duration: 49,
                percent: .273,
              },
              {
                duration: 50,
                percent: 86.623,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                percent: 0.273,
              },
              {
                duration: 2,
                percent: .273,
              },
              {
                duration: 3,
                percent: .273,
              },
              {
                duration: 4,
                percent: .273,
              },
              {
                duration: 5,
                percent: .273,
              },
              {
                duration: 6,
                percent: .273,
              },
              {
                duration: 7,
                percent: .273,
              },
              {
                duration: 8,
                percent: .273,
              },
              {
                duration: 9,
                percent: .273,
              },
              {
                duration: 10,
                percent: .273,
              },
              {
                duration: 11,
                percent: .273,
              },
              {
                duration: 12,
                percent: .273,
              },
              {
                duration: 13,
                percent: .273,
              },
              {
                duration: 14,
                percent: .273,
              },
              {
                duration: 15,
                percent: .273,
              },
              {
                duration: 16,
                percent: .273,
              },
              {
                duration: 17,
                percent: .273,
              },
              {
                duration: 18,
                percent: .273,
              },
              {
                duration: 19,
                percent: .273,
              },
              {
                duration: 20,
                percent: .273,
              },
              {
                duration: 21,
                percent: .273,
              },
              {
                duration: 22,
                percent: .273,
              },
              {
                duration: 23,
                percent: .273,
              },
              {
                duration: 24,
                percent: .273,
              },
              {
                duration: 25,
                percent: .273,
              },
              {
                duration: 26,
                percent: .273,
              },
              {
                duration: 27,
                percent: .273,
              },
              {
                duration: 28,
                percent: .273,
              },
              {
                duration: 29,
                percent: .273,
              },
              {
                duration: 30,
                percent: .273,
              },
              {
                duration: 31,
                percent: .273,
              },
              {
                duration: 32,
                percent: .273,
              },
              {
                duration: 33,
                percent: .273,
              },
              {
                duration: 34,
                percent: .273,
              },
              {
                duration: 35,
                percent: .273,
              },
              {
                duration: 36,
                percent: .273,
              },
              {
                duration: 37,
                percent: .273,
              },
              {
                duration: 38,
                percent: .273,
              },
              {
                duration: 39,
                percent: .273,
              },
              {
                duration: 40,
                percent: .273,
              },
              {
                duration: 41,
                percent: .273,
              },
              {
                duration: 42,
                percent: .273,
              },
              {
                duration: 43,
                percent: .273,
              },
              {
                duration: 44,
                percent: .273,
              },
              {
                duration: 45,
                percent: .273,
              },
              {
                duration: 46,
                percent: .273,
              },
              {
                duration: 47,
                percent: .273,
              },
              {
                duration: 48,
                percent: .273,
              },
              {
                duration: 49,
                percent: .273,
              },
              {
                duration: 50,
                percent: 86.623,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })

  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                percent: 0.273,
              },
              {
                duration: 2,
                percent: .273,
              },
              {
                duration: 3,
                percent: .273,
              },
              {
                duration: 4,
                percent: .273,
              },
              {
                duration: 5,
                percent: .273,
              },
              {
                duration: 6,
                percent: .273,
              },
              {
                duration: 7,
                percent: .273,
              },
              {
                duration: 8,
                percent: .273,
              },
              {
                duration: 9,
                percent: .273,
              },
              {
                duration: 10,
                percent: .273,
              },
              {
                duration: 11,
                percent: .273,
              },
              {
                duration: 12,
                percent: .273,
              },
              {
                duration: 13,
                percent: .273,
              },
              {
                duration: 14,
                percent: .273,
              },
              {
                duration: 15,
                percent: .273,
              },
              {
                duration: 16,
                percent: .273,
              },
              {
                duration: 17,
                percent: .273,
              },
              {
                duration: 18,
                percent: .273,
              },
              {
                duration: 19,
                percent: .273,
              },
              {
                duration: 20,
                percent: .273,
              },
              {
                duration: 21,
                percent: .273,
              },
              {
                duration: 22,
                percent: .273,
              },
              {
                duration: 23,
                percent: .273,
              },
              {
                duration: 24,
                percent: .273,
              },
              {
                duration: 25,
                percent: .273,
              },
              {
                duration: 26,
                percent: .273,
              },
              {
                duration: 27,
                percent: .273,
              },
              {
                duration: 28,
                percent: .273,
              },
              {
                duration: 29,
                percent: .273,
              },
              {
                duration: 30,
                percent: .273,
              },
              {
                duration: 31,
                percent: .273,
              },
              {
                duration: 32,
                percent: .273,
              },
              {
                duration: 33,
                percent: .273,
              },
              {
                duration: 34,
                percent: .273,
              },
              {
                duration: 35,
                percent: .273,
              },
              {
                duration: 36,
                percent: .273,
              },
              {
                duration: 37,
                percent: .273,
              },
              {
                duration: 38,
                percent: .273,
              },
              {
                duration: 39,
                percent: .273,
              },
              {
                duration: 40,
                percent: .273,
              },
              {
                duration: 41,
                percent: .273,
              },
              {
                duration: 42,
                percent: .273,
              },
              {
                duration: 43,
                percent: .273,
              },
              {
                duration: 44,
                percent: .273,
              },
              {
                duration: 45,
                percent: .273,
              },
              {
                duration: 46,
                percent: .273,
              },
              {
                duration: 47,
                percent: .273,
              },
              {
                duration: 48,
                percent: .273,
              },
              {
                duration: 49,
                percent: .273,
              },
              {
                duration: 50,
                percent: 86.623,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                percent: 0.273,
              },
              {
                duration: 2,
                percent: .273,
              },
              {
                duration: 3,
                percent: .273,
              },
              {
                duration: 4,
                percent: .273,
              },
              {
                duration: 5,
                percent: .273,
              },
              {
                duration: 6,
                percent: .273,
              },
              {
                duration: 7,
                percent: .273,
              },
              {
                duration: 8,
                percent: .273,
              },
              {
                duration: 9,
                percent: .273,
              },
              {
                duration: 10,
                percent: .273,
              },
              {
                duration: 11,
                percent: .273,
              },
              {
                duration: 12,
                percent: .273,
              },
              {
                duration: 13,
                percent: .273,
              },
              {
                duration: 14,
                percent: .273,
              },
              {
                duration: 15,
                percent: .273,
              },
              {
                duration: 16,
                percent: .273,
              },
              {
                duration: 17,
                percent: .273,
              },
              {
                duration: 18,
                percent: .273,
              },
              {
                duration: 19,
                percent: .273,
              },
              {
                duration: 20,
                percent: .273,
              },
              {
                duration: 21,
                percent: .273,
              },
              {
                duration: 22,
                percent: .273,
              },
              {
                duration: 23,
                percent: .273,
              },
              {
                duration: 24,
                percent: .273,
              },
              {
                duration: 25,
                percent: .273,
              },
              {
                duration: 26,
                percent: .273,
              },
              {
                duration: 27,
                percent: .273,
              },
              {
                duration: 28,
                percent: .273,
              },
              {
                duration: 29,
                percent: .273,
              },
              {
                duration: 30,
                percent: .273,
              },
              {
                duration: 31,
                percent: .273,
              },
              {
                duration: 32,
                percent: .273,
              },
              {
                duration: 33,
                percent: .273,
              },
              {
                duration: 34,
                percent: .273,
              },
              {
                duration: 35,
                percent: .273,
              },
              {
                duration: 36,
                percent: .273,
              },
              {
                duration: 37,
                percent: .273,
              },
              {
                duration: 38,
                percent: .273,
              },
              {
                duration: 39,
                percent: .273,
              },
              {
                duration: 40,
                percent: .273,
              },
              {
                duration: 41,
                percent: .273,
              },
              {
                duration: 42,
                percent: .273,
              },
              {
                duration: 43,
                percent: .273,
              },
              {
                duration: 44,
                percent: .273,
              },
              {
                duration: 45,
                percent: .273,
              },
              {
                duration: 46,
                percent: .273,
              },
              {
                duration: 47,
                percent: .273,
              },
              {
                duration: 48,
                percent: .273,
              },
              {
                duration: 49,
                percent: .273,
              },
              {
                duration: 50,
                percent: 86.623,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                percent: 0.273,
              },
              {
                duration: 2,
                percent: .273,
              },
              {
                duration: 3,
                percent: .273,
              },
              {
                duration: 4,
                percent: .273,
              },
              {
                duration: 5,
                percent: .273,
              },
              {
                duration: 6,
                percent: .273,
              },
              {
                duration: 7,
                percent: .273,
              },
              {
                duration: 8,
                percent: .273,
              },
              {
                duration: 9,
                percent: .273,
              },
              {
                duration: 10,
                percent: .273,
              },
              {
                duration: 11,
                percent: .273,
              },
              {
                duration: 12,
                percent: .273,
              },
              {
                duration: 13,
                percent: .273,
              },
              {
                duration: 14,
                percent: .273,
              },
              {
                duration: 15,
                percent: .273,
              },
              {
                duration: 16,
                percent: .273,
              },
              {
                duration: 17,
                percent: .273,
              },
              {
                duration: 18,
                percent: .273,
              },
              {
                duration: 19,
                percent: .273,
              },
              {
                duration: 20,
                percent: .273,
              },
              {
                duration: 21,
                percent: .273,
              },
              {
                duration: 22,
                percent: .273,
              },
              {
                duration: 23,
                percent: .273,
              },
              {
                duration: 24,
                percent: .273,
              },
              {
                duration: 25,
                percent: .273,
              },
              {
                duration: 26,
                percent: .273,
              },
              {
                duration: 27,
                percent: .273,
              },
              {
                duration: 28,
                percent: .273,
              },
              {
                duration: 29,
                percent: .273,
              },
              {
                duration: 30,
                percent: .273,
              },
              {
                duration: 31,
                percent: .273,
              },
              {
                duration: 32,
                percent: .273,
              },
              {
                duration: 33,
                percent: .273,
              },
              {
                duration: 34,
                percent: .273,
              },
              {
                duration: 35,
                percent: .273,
              },
              {
                duration: 36,
                percent: .273,
              },
              {
                duration: 37,
                percent: .273,
              },
              {
                duration: 38,
                percent: .273,
              },
              {
                duration: 39,
                percent: .273,
              },
              {
                duration: 40,
                percent: .273,
              },
              {
                duration: 41,
                percent: .273,
              },
              {
                duration: 42,
                percent: .273,
              },
              {
                duration: 43,
                percent: .273,
              },
              {
                duration: 44,
                percent: .273,
              },
              {
                duration: 45,
                percent: .273,
              },
              {
                duration: 46,
                percent: .273,
              },
              {
                duration: 47,
                percent: .273,
              },
              {
                duration: 48,
                percent: .273,
              },
              {
                duration: 49,
                percent: .273,
              },
              {
                duration: 50,
                percent: 86.623,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                percent: 0.273,
              },
              {
                duration: 2,
                percent: .273,
              },
              {
                duration: 3,
                percent: .273,
              },
              {
                duration: 4,
                percent: .273,
              },
              {
                duration: 5,
                percent: .273,
              },
              {
                duration: 6,
                percent: .273,
              },
              {
                duration: 7,
                percent: .273,
              },
              {
                duration: 8,
                percent: .273,
              },
              {
                duration: 9,
                percent: .273,
              },
              {
                duration: 10,
                percent: .273,
              },
              {
                duration: 11,
                percent: .273,
              },
              {
                duration: 12,
                percent: .273,
              },
              {
                duration: 13,
                percent: .273,
              },
              {
                duration: 14,
                percent: .273,
              },
              {
                duration: 15,
                percent: .273,
              },
              {
                duration: 16,
                percent: .273,
              },
              {
                duration: 17,
                percent: .273,
              },
              {
                duration: 18,
                percent: .273,
              },
              {
                duration: 19,
                percent: .273,
              },
              {
                duration: 20,
                percent: .273,
              },
              {
                duration: 21,
                percent: .273,
              },
              {
                duration: 22,
                percent: .273,
              },
              {
                duration: 23,
                percent: .273,
              },
              {
                duration: 24,
                percent: .273,
              },
              {
                duration: 25,
                percent: .273,
              },
              {
                duration: 26,
                percent: .273,
              },
              {
                duration: 27,
                percent: .273,
              },
              {
                duration: 28,
                percent: .273,
              },
              {
                duration: 29,
                percent: .273,
              },
              {
                duration: 30,
                percent: .273,
              },
              {
                duration: 31,
                percent: .273,
              },
              {
                duration: 32,
                percent: .273,
              },
              {
                duration: 33,
                percent: .273,
              },
              {
                duration: 34,
                percent: .273,
              },
              {
                duration: 35,
                percent: .273,
              },
              {
                duration: 36,
                percent: .273,
              },
              {
                duration: 37,
                percent: .273,
              },
              {
                duration: 38,
                percent: .273,
              },
              {
                duration: 39,
                percent: .273,
              },
              {
                duration: 40,
                percent: .273,
              },
              {
                duration: 41,
                percent: .273,
              },
              {
                duration: 42,
                percent: .273,
              },
              {
                duration: 43,
                percent: .273,
              },
              {
                duration: 44,
                percent: .273,
              },
              {
                duration: 45,
                percent: .273,
              },
              {
                duration: 46,
                percent: .273,
              },
              {
                duration: 47,
                percent: .273,
              },
              {
                duration: 48,
                percent: .273,
              },
              {
                duration: 49,
                percent: .273,
              },
              {
                duration: 50,
                percent: 86.623,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                percent: 0.273,
              },
              {
                duration: 2,
                percent: .273,
              },
              {
                duration: 3,
                percent: .273,
              },
              {
                duration: 4,
                percent: .273,
              },
              {
                duration: 5,
                percent: .273,
              },
              {
                duration: 6,
                percent: .273,
              },
              {
                duration: 7,
                percent: .273,
              },
              {
                duration: 8,
                percent: .273,
              },
              {
                duration: 9,
                percent: .273,
              },
              {
                duration: 10,
                percent: .273,
              },
              {
                duration: 11,
                percent: .273,
              },
              {
                duration: 12,
                percent: .273,
              },
              {
                duration: 13,
                percent: .273,
              },
              {
                duration: 14,
                percent: .273,
              },
              {
                duration: 15,
                percent: .273,
              },
              {
                duration: 16,
                percent: .273,
              },
              {
                duration: 17,
                percent: .273,
              },
              {
                duration: 18,
                percent: .273,
              },
              {
                duration: 19,
                percent: .273,
              },
              {
                duration: 20,
                percent: .273,
              },
              {
                duration: 21,
                percent: .273,
              },
              {
                duration: 22,
                percent: .273,
              },
              {
                duration: 23,
                percent: .273,
              },
              {
                duration: 24,
                percent: .273,
              },
              {
                duration: 25,
                percent: .273,
              },
              {
                duration: 26,
                percent: .273,
              },
              {
                duration: 27,
                percent: .273,
              },
              {
                duration: 28,
                percent: .273,
              },
              {
                duration: 29,
                percent: .273,
              },
              {
                duration: 30,
                percent: .273,
              },
              {
                duration: 31,
                percent: .273,
              },
              {
                duration: 32,
                percent: .273,
              },
              {
                duration: 33,
                percent: .273,
              },
              {
                duration: 34,
                percent: .273,
              },
              {
                duration: 35,
                percent: .273,
              },
              {
                duration: 36,
                percent: .273,
              },
              {
                duration: 37,
                percent: .273,
              },
              {
                duration: 38,
                percent: .273,
              },
              {
                duration: 39,
                percent: .273,
              },
              {
                duration: 40,
                percent: .273,
              },
              {
                duration: 41,
                percent: .273,
              },
              {
                duration: 42,
                percent: .273,
              },
              {
                duration: 43,
                percent: .273,
              },
              {
                duration: 44,
                percent: .273,
              },
              {
                duration: 45,
                percent: .273,
              },
              {
                duration: 46,
                percent: .273,
              },
              {
                duration: 47,
                percent: .273,
              },
              {
                duration: 48,
                percent: .273,
              },
              {
                duration: 49,
                percent: .273,
              },
              {
                duration: 50,
                percent: 86.623,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                percent: 0.273,
              },
              {
                duration: 2,
                percent: .273,
              },
              {
                duration: 3,
                percent: .273,
              },
              {
                duration: 4,
                percent: .273,
              },
              {
                duration: 5,
                percent: .273,
              },
              {
                duration: 6,
                percent: .273,
              },
              {
                duration: 7,
                percent: .273,
              },
              {
                duration: 8,
                percent: .273,
              },
              {
                duration: 9,
                percent: .273,
              },
              {
                duration: 10,
                percent: .273,
              },
              {
                duration: 11,
                percent: .273,
              },
              {
                duration: 12,
                percent: .273,
              },
              {
                duration: 13,
                percent: .273,
              },
              {
                duration: 14,
                percent: .273,
              },
              {
                duration: 15,
                percent: .273,
              },
              {
                duration: 16,
                percent: .273,
              },
              {
                duration: 17,
                percent: .273,
              },
              {
                duration: 18,
                percent: .273,
              },
              {
                duration: 19,
                percent: .273,
              },
              {
                duration: 20,
                percent: .273,
              },
              {
                duration: 21,
                percent: .273,
              },
              {
                duration: 22,
                percent: .273,
              },
              {
                duration: 23,
                percent: .273,
              },
              {
                duration: 24,
                percent: .273,
              },
              {
                duration: 25,
                percent: .273,
              },
              {
                duration: 26,
                percent: .273,
              },
              {
                duration: 27,
                percent: .273,
              },
              {
                duration: 28,
                percent: .273,
              },
              {
                duration: 29,
                percent: .273,
              },
              {
                duration: 30,
                percent: .273,
              },
              {
                duration: 31,
                percent: .273,
              },
              {
                duration: 32,
                percent: .273,
              },
              {
                duration: 33,
                percent: .273,
              },
              {
                duration: 34,
                percent: .273,
              },
              {
                duration: 35,
                percent: .273,
              },
              {
                duration: 36,
                percent: .273,
              },
              {
                duration: 37,
                percent: .273,
              },
              {
                duration: 38,
                percent: .273,
              },
              {
                duration: 39,
                percent: .273,
              },
              {
                duration: 40,
                percent: .273,
              },
              {
                duration: 41,
                percent: .273,
              },
              {
                duration: 42,
                percent: .273,
              },
              {
                duration: 43,
                percent: .273,
              },
              {
                duration: 44,
                percent: .273,
              },
              {
                duration: 45,
                percent: .273,
              },
              {
                duration: 46,
                percent: .273,
              },
              {
                duration: 47,
                percent: .273,
              },
              {
                duration: 48,
                percent: .273,
              },
              {
                duration: 49,
                percent: .273,
              },
              {
                duration: 50,
                percent: 86.623,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                percent: 0.273,
              },
              {
                duration: 2,
                percent: .273,
              },
              {
                duration: 3,
                percent: .273,
              },
              {
                duration: 4,
                percent: .273,
              },
              {
                duration: 5,
                percent: .273,
              },
              {
                duration: 6,
                percent: .273,
              },
              {
                duration: 7,
                percent: .273,
              },
              {
                duration: 8,
                percent: .273,
              },
              {
                duration: 9,
                percent: .273,
              },
              {
                duration: 10,
                percent: .273,
              },
              {
                duration: 11,
                percent: .273,
              },
              {
                duration: 12,
                percent: .273,
              },
              {
                duration: 13,
                percent: .273,
              },
              {
                duration: 14,
                percent: .273,
              },
              {
                duration: 15,
                percent: .273,
              },
              {
                duration: 16,
                percent: .273,
              },
              {
                duration: 17,
                percent: .273,
              },
              {
                duration: 18,
                percent: .273,
              },
              {
                duration: 19,
                percent: .273,
              },
              {
                duration: 20,
                percent: .273,
              },
              {
                duration: 21,
                percent: .273,
              },
              {
                duration: 22,
                percent: .273,
              },
              {
                duration: 23,
                percent: .273,
              },
              {
                duration: 24,
                percent: .273,
              },
              {
                duration: 25,
                percent: .273,
              },
              {
                duration: 26,
                percent: .273,
              },
              {
                duration: 27,
                percent: .273,
              },
              {
                duration: 28,
                percent: .273,
              },
              {
                duration: 29,
                percent: .273,
              },
              {
                duration: 30,
                percent: .273,
              },
              {
                duration: 31,
                percent: .273,
              },
              {
                duration: 32,
                percent: .273,
              },
              {
                duration: 33,
                percent: .273,
              },
              {
                duration: 34,
                percent: .273,
              },
              {
                duration: 35,
                percent: .273,
              },
              {
                duration: 36,
                percent: .273,
              },
              {
                duration: 37,
                percent: .273,
              },
              {
                duration: 38,
                percent: .273,
              },
              {
                duration: 39,
                percent: .273,
              },
              {
                duration: 40,
                percent: .273,
              },
              {
                duration: 41,
                percent: .273,
              },
              {
                duration: 42,
                percent: .273,
              },
              {
                duration: 43,
                percent: .273,
              },
              {
                duration: 44,
                percent: .273,
              },
              {
                duration: 45,
                percent: .273,
              },
              {
                duration: 46,
                percent: .273,
              },
              {
                duration: 47,
                percent: .273,
              },
              {
                duration: 48,
                percent: .273,
              },
              {
                duration: 49,
                percent: .273,
              },
              {
                duration: 50,
                percent: 86.623,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                percent: 0.273,
              },
              {
                duration: 2,
                percent: .273,
              },
              {
                duration: 3,
                percent: .273,
              },
              {
                duration: 4,
                percent: .273,
              },
              {
                duration: 5,
                percent: .273,
              },
              {
                duration: 6,
                percent: .273,
              },
              {
                duration: 7,
                percent: .273,
              },
              {
                duration: 8,
                percent: .273,
              },
              {
                duration: 9,
                percent: .273,
              },
              {
                duration: 10,
                percent: .273,
              },
              {
                duration: 11,
                percent: .273,
              },
              {
                duration: 12,
                percent: .273,
              },
              {
                duration: 13,
                percent: .273,
              },
              {
                duration: 14,
                percent: .273,
              },
              {
                duration: 15,
                percent: .273,
              },
              {
                duration: 16,
                percent: .273,
              },
              {
                duration: 17,
                percent: .273,
              },
              {
                duration: 18,
                percent: .273,
              },
              {
                duration: 19,
                percent: .273,
              },
              {
                duration: 20,
                percent: .273,
              },
              {
                duration: 21,
                percent: .273,
              },
              {
                duration: 22,
                percent: .273,
              },
              {
                duration: 23,
                percent: .273,
              },
              {
                duration: 24,
                percent: .273,
              },
              {
                duration: 25,
                percent: .273,
              },
              {
                duration: 26,
                percent: .273,
              },
              {
                duration: 27,
                percent: .273,
              },
              {
                duration: 28,
                percent: .273,
              },
              {
                duration: 29,
                percent: .273,
              },
              {
                duration: 30,
                percent: .273,
              },
              {
                duration: 31,
                percent: .273,
              },
              {
                duration: 32,
                percent: .273,
              },
              {
                duration: 33,
                percent: .273,
              },
              {
                duration: 34,
                percent: .273,
              },
              {
                duration: 35,
                percent: .273,
              },
              {
                duration: 36,
                percent: .273,
              },
              {
                duration: 37,
                percent: .273,
              },
              {
                duration: 38,
                percent: .273,
              },
              {
                duration: 39,
                percent: .273,
              },
              {
                duration: 40,
                percent: .273,
              },
              {
                duration: 41,
                percent: .273,
              },
              {
                duration: 42,
                percent: .273,
              },
              {
                duration: 43,
                percent: .273,
              },
              {
                duration: 44,
                percent: .273,
              },
              {
                duration: 45,
                percent: .273,
              },
              {
                duration: 46,
                percent: .273,
              },
              {
                duration: 47,
                percent: .273,
              },
              {
                duration: 48,
                percent: .273,
              },
              {
                duration: 49,
                percent: .273,
              },
              {
                duration: 50,
                percent: 86.623,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                percent: 0.273,
              },
              {
                duration: 2,
                percent: .273,
              },
              {
                duration: 3,
                percent: .273,
              },
              {
                duration: 4,
                percent: .273,
              },
              {
                duration: 5,
                percent: .273,
              },
              {
                duration: 6,
                percent: .273,
              },
              {
                duration: 7,
                percent: .273,
              },
              {
                duration: 8,
                percent: .273,
              },
              {
                duration: 9,
                percent: .273,
              },
              {
                duration: 10,
                percent: .273,
              },
              {
                duration: 11,
                percent: .273,
              },
              {
                duration: 12,
                percent: .273,
              },
              {
                duration: 13,
                percent: .273,
              },
              {
                duration: 14,
                percent: .273,
              },
              {
                duration: 15,
                percent: .273,
              },
              {
                duration: 16,
                percent: .273,
              },
              {
                duration: 17,
                percent: .273,
              },
              {
                duration: 18,
                percent: .273,
              },
              {
                duration: 19,
                percent: .273,
              },
              {
                duration: 20,
                percent: .273,
              },
              {
                duration: 21,
                percent: .273,
              },
              {
                duration: 22,
                percent: .273,
              },
              {
                duration: 23,
                percent: .273,
              },
              {
                duration: 24,
                percent: .273,
              },
              {
                duration: 25,
                percent: .273,
              },
              {
                duration: 26,
                percent: .273,
              },
              {
                duration: 27,
                percent: .273,
              },
              {
                duration: 28,
                percent: .273,
              },
              {
                duration: 29,
                percent: .273,
              },
              {
                duration: 30,
                percent: .273,
              },
              {
                duration: 31,
                percent: .273,
              },
              {
                duration: 32,
                percent: .273,
              },
              {
                duration: 33,
                percent: .273,
              },
              {
                duration: 34,
                percent: .273,
              },
              {
                duration: 35,
                percent: .273,
              },
              {
                duration: 36,
                percent: .273,
              },
              {
                duration: 37,
                percent: .273,
              },
              {
                duration: 38,
                percent: .273,
              },
              {
                duration: 39,
                percent: .273,
              },
              {
                duration: 40,
                percent: .273,
              },
              {
                duration: 41,
                percent: .273,
              },
              {
                duration: 42,
                percent: .273,
              },
              {
                duration: 43,
                percent: .273,
              },
              {
                duration: 44,
                percent: .273,
              },
              {
                duration: 45,
                percent: .273,
              },
              {
                duration: 46,
                percent: .273,
              },
              {
                duration: 47,
                percent: .273,
              },
              {
                duration: 48,
                percent: .273,
              },
              {
                duration: 49,
                percent: .273,
              },
              {
                duration: 50,
                percent: 86.623,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                percent: 0.273,
              },
              {
                duration: 2,
                percent: .273,
              },
              {
                duration: 3,
                percent: .273,
              },
              {
                duration: 4,
                percent: .273,
              },
              {
                duration: 5,
                percent: .273,
              },
              {
                duration: 6,
                percent: .273,
              },
              {
                duration: 7,
                percent: .273,
              },
              {
                duration: 8,
                percent: .273,
              },
              {
                duration: 9,
                percent: .273,
              },
              {
                duration: 10,
                percent: .273,
              },
              {
                duration: 11,
                percent: .273,
              },
              {
                duration: 12,
                percent: .273,
              },
              {
                duration: 13,
                percent: .273,
              },
              {
                duration: 14,
                percent: .273,
              },
              {
                duration: 15,
                percent: .273,
              },
              {
                duration: 16,
                percent: .273,
              },
              {
                duration: 17,
                percent: .273,
              },
              {
                duration: 18,
                percent: .273,
              },
              {
                duration: 19,
                percent: .273,
              },
              {
                duration: 20,
                percent: .273,
              },
              {
                duration: 21,
                percent: .273,
              },
              {
                duration: 22,
                percent: .273,
              },
              {
                duration: 23,
                percent: .273,
              },
              {
                duration: 24,
                percent: .273,
              },
              {
                duration: 25,
                percent: .273,
              },
              {
                duration: 26,
                percent: .273,
              },
              {
                duration: 27,
                percent: .273,
              },
              {
                duration: 28,
                percent: .273,
              },
              {
                duration: 29,
                percent: .273,
              },
              {
                duration: 30,
                percent: .273,
              },
              {
                duration: 31,
                percent: .273,
              },
              {
                duration: 32,
                percent: .273,
              },
              {
                duration: 33,
                percent: .273,
              },
              {
                duration: 34,
                percent: .273,
              },
              {
                duration: 35,
                percent: .273,
              },
              {
                duration: 36,
                percent: .273,
              },
              {
                duration: 37,
                percent: .273,
              },
              {
                duration: 38,
                percent: .273,
              },
              {
                duration: 39,
                percent: .273,
              },
              {
                duration: 40,
                percent: .273,
              },
              {
                duration: 41,
                percent: .273,
              },
              {
                duration: 42,
                percent: .273,
              },
              {
                duration: 43,
                percent: .273,
              },
              {
                duration: 44,
                percent: .273,
              },
              {
                duration: 45,
                percent: .273,
              },
              {
                duration: 46,
                percent: .273,
              },
              {
                duration: 47,
                percent: .273,
              },
              {
                duration: 48,
                percent: .273,
              },
              {
                duration: 49,
                percent: .273,
              },
              {
                duration: 50,
                percent: 86.623,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })

  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                percent: 0.273,
              },
              {
                duration: 2,
                percent: .273,
              },
              {
                duration: 3,
                percent: .273,
              },
              {
                duration: 4,
                percent: .273,
              },
              {
                duration: 5,
                percent: .273,
              },
              {
                duration: 6,
                percent: .273,
              },
              {
                duration: 7,
                percent: .273,
              },
              {
                duration: 8,
                percent: .273,
              },
              {
                duration: 9,
                percent: .273,
              },
              {
                duration: 10,
                percent: .273,
              },
              {
                duration: 11,
                percent: .273,
              },
              {
                duration: 12,
                percent: .273,
              },
              {
                duration: 13,
                percent: .273,
              },
              {
                duration: 14,
                percent: .273,
              },
              {
                duration: 15,
                percent: .273,
              },
              {
                duration: 16,
                percent: .273,
              },
              {
                duration: 17,
                percent: .273,
              },
              {
                duration: 18,
                percent: .273,
              },
              {
                duration: 19,
                percent: .273,
              },
              {
                duration: 20,
                percent: .273,
              },
              {
                duration: 21,
                percent: .273,
              },
              {
                duration: 22,
                percent: .273,
              },
              {
                duration: 23,
                percent: .273,
              },
              {
                duration: 24,
                percent: .273,
              },
              {
                duration: 25,
                percent: .273,
              },
              {
                duration: 26,
                percent: .273,
              },
              {
                duration: 27,
                percent: .273,
              },
              {
                duration: 28,
                percent: .273,
              },
              {
                duration: 29,
                percent: .273,
              },
              {
                duration: 30,
                percent: .273,
              },
              {
                duration: 31,
                percent: .273,
              },
              {
                duration: 32,
                percent: .273,
              },
              {
                duration: 33,
                percent: .273,
              },
              {
                duration: 34,
                percent: .273,
              },
              {
                duration: 35,
                percent: .273,
              },
              {
                duration: 36,
                percent: .273,
              },
              {
                duration: 37,
                percent: .273,
              },
              {
                duration: 38,
                percent: .273,
              },
              {
                duration: 39,
                percent: .273,
              },
              {
                duration: 40,
                percent: .273,
              },
              {
                duration: 41,
                percent: .273,
              },
              {
                duration: 42,
                percent: .273,
              },
              {
                duration: 43,
                percent: .273,
              },
              {
                duration: 44,
                percent: .273,
              },
              {
                duration: 45,
                percent: .273,
              },
              {
                duration: 46,
                percent: .273,
              },
              {
                duration: 47,
                percent: .273,
              },
              {
                duration: 48,
                percent: .273,
              },
              {
                duration: 49,
                percent: .273,
              },
              {
                duration: 50,
                percent: 86.623,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                percent: 0.273,
              },
              {
                duration: 2,
                percent: .273,
              },
              {
                duration: 3,
                percent: .273,
              },
              {
                duration: 4,
                percent: .273,
              },
              {
                duration: 5,
                percent: .273,
              },
              {
                duration: 6,
                percent: .273,
              },
              {
                duration: 7,
                percent: .273,
              },
              {
                duration: 8,
                percent: .273,
              },
              {
                duration: 9,
                percent: .273,
              },
              {
                duration: 10,
                percent: .273,
              },
              {
                duration: 11,
                percent: .273,
              },
              {
                duration: 12,
                percent: .273,
              },
              {
                duration: 13,
                percent: .273,
              },
              {
                duration: 14,
                percent: .273,
              },
              {
                duration: 15,
                percent: .273,
              },
              {
                duration: 16,
                percent: .273,
              },
              {
                duration: 17,
                percent: .273,
              },
              {
                duration: 18,
                percent: .273,
              },
              {
                duration: 19,
                percent: .273,
              },
              {
                duration: 20,
                percent: .273,
              },
              {
                duration: 21,
                percent: .273,
              },
              {
                duration: 22,
                percent: .273,
              },
              {
                duration: 23,
                percent: .273,
              },
              {
                duration: 24,
                percent: .273,
              },
              {
                duration: 25,
                percent: .273,
              },
              {
                duration: 26,
                percent: .273,
              },
              {
                duration: 27,
                percent: .273,
              },
              {
                duration: 28,
                percent: .273,
              },
              {
                duration: 29,
                percent: .273,
              },
              {
                duration: 30,
                percent: .273,
              },
              {
                duration: 31,
                percent: .273,
              },
              {
                duration: 32,
                percent: .273,
              },
              {
                duration: 33,
                percent: .273,
              },
              {
                duration: 34,
                percent: .273,
              },
              {
                duration: 35,
                percent: .273,
              },
              {
                duration: 36,
                percent: .273,
              },
              {
                duration: 37,
                percent: .273,
              },
              {
                duration: 38,
                percent: .273,
              },
              {
                duration: 39,
                percent: .273,
              },
              {
                duration: 40,
                percent: .273,
              },
              {
                duration: 41,
                percent: .273,
              },
              {
                duration: 42,
                percent: .273,
              },
              {
                duration: 43,
                percent: .273,
              },
              {
                duration: 44,
                percent: .273,
              },
              {
                duration: 45,
                percent: .273,
              },
              {
                duration: 46,
                percent: .273,
              },
              {
                duration: 47,
                percent: .273,
              },
              {
                duration: 48,
                percent: .273,
              },
              {
                duration: 49,
                percent: .273,
              },
              {
                duration: 50,
                percent: 86.623,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                percent: 0.273,
              },
              {
                duration: 2,
                percent: .273,
              },
              {
                duration: 3,
                percent: .273,
              },
              {
                duration: 4,
                percent: .273,
              },
              {
                duration: 5,
                percent: .273,
              },
              {
                duration: 6,
                percent: .273,
              },
              {
                duration: 7,
                percent: .273,
              },
              {
                duration: 8,
                percent: .273,
              },
              {
                duration: 9,
                percent: .273,
              },
              {
                duration: 10,
                percent: .273,
              },
              {
                duration: 11,
                percent: .273,
              },
              {
                duration: 12,
                percent: .273,
              },
              {
                duration: 13,
                percent: .273,
              },
              {
                duration: 14,
                percent: .273,
              },
              {
                duration: 15,
                percent: .273,
              },
              {
                duration: 16,
                percent: .273,
              },
              {
                duration: 17,
                percent: .273,
              },
              {
                duration: 18,
                percent: .273,
              },
              {
                duration: 19,
                percent: .273,
              },
              {
                duration: 20,
                percent: .273,
              },
              {
                duration: 21,
                percent: .273,
              },
              {
                duration: 22,
                percent: .273,
              },
              {
                duration: 23,
                percent: .273,
              },
              {
                duration: 24,
                percent: .273,
              },
              {
                duration: 25,
                percent: .273,
              },
              {
                duration: 26,
                percent: .273,
              },
              {
                duration: 27,
                percent: .273,
              },
              {
                duration: 28,
                percent: .273,
              },
              {
                duration: 29,
                percent: .273,
              },
              {
                duration: 30,
                percent: .273,
              },
              {
                duration: 31,
                percent: .273,
              },
              {
                duration: 32,
                percent: .273,
              },
              {
                duration: 33,
                percent: .273,
              },
              {
                duration: 34,
                percent: .273,
              },
              {
                duration: 35,
                percent: .273,
              },
              {
                duration: 36,
                percent: .273,
              },
              {
                duration: 37,
                percent: .273,
              },
              {
                duration: 38,
                percent: .273,
              },
              {
                duration: 39,
                percent: .273,
              },
              {
                duration: 40,
                percent: .273,
              },
              {
                duration: 41,
                percent: .273,
              },
              {
                duration: 42,
                percent: .273,
              },
              {
                duration: 43,
                percent: .273,
              },
              {
                duration: 44,
                percent: .273,
              },
              {
                duration: 45,
                percent: .273,
              },
              {
                duration: 46,
                percent: .273,
              },
              {
                duration: 47,
                percent: .273,
              },
              {
                duration: 48,
                percent: .273,
              },
              {
                duration: 49,
                percent: .273,
              },
              {
                duration: 50,
                percent: 86.623,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                percent: 0.273,
              },
              {
                duration: 2,
                percent: .273,
              },
              {
                duration: 3,
                percent: .273,
              },
              {
                duration: 4,
                percent: .273,
              },
              {
                duration: 5,
                percent: .273,
              },
              {
                duration: 6,
                percent: .273,
              },
              {
                duration: 7,
                percent: .273,
              },
              {
                duration: 8,
                percent: .273,
              },
              {
                duration: 9,
                percent: .273,
              },
              {
                duration: 10,
                percent: .273,
              },
              {
                duration: 11,
                percent: .273,
              },
              {
                duration: 12,
                percent: .273,
              },
              {
                duration: 13,
                percent: .273,
              },
              {
                duration: 14,
                percent: .273,
              },
              {
                duration: 15,
                percent: .273,
              },
              {
                duration: 16,
                percent: .273,
              },
              {
                duration: 17,
                percent: .273,
              },
              {
                duration: 18,
                percent: .273,
              },
              {
                duration: 19,
                percent: .273,
              },
              {
                duration: 20,
                percent: .273,
              },
              {
                duration: 21,
                percent: .273,
              },
              {
                duration: 22,
                percent: .273,
              },
              {
                duration: 23,
                percent: .273,
              },
              {
                duration: 24,
                percent: .273,
              },
              {
                duration: 25,
                percent: .273,
              },
              {
                duration: 26,
                percent: .273,
              },
              {
                duration: 27,
                percent: .273,
              },
              {
                duration: 28,
                percent: .273,
              },
              {
                duration: 29,
                percent: .273,
              },
              {
                duration: 30,
                percent: .273,
              },
              {
                duration: 31,
                percent: .273,
              },
              {
                duration: 32,
                percent: .273,
              },
              {
                duration: 33,
                percent: .273,
              },
              {
                duration: 34,
                percent: .273,
              },
              {
                duration: 35,
                percent: .273,
              },
              {
                duration: 36,
                percent: .273,
              },
              {
                duration: 37,
                percent: .273,
              },
              {
                duration: 38,
                percent: .273,
              },
              {
                duration: 39,
                percent: .273,
              },
              {
                duration: 40,
                percent: .273,
              },
              {
                duration: 41,
                percent: .273,
              },
              {
                duration: 42,
                percent: .273,
              },
              {
                duration: 43,
                percent: .273,
              },
              {
                duration: 44,
                percent: .273,
              },
              {
                duration: 45,
                percent: .273,
              },
              {
                duration: 46,
                percent: .273,
              },
              {
                duration: 47,
                percent: .273,
              },
              {
                duration: 48,
                percent: .273,
              },
              {
                duration: 49,
                percent: .273,
              },
              {
                duration: 50,
                percent: 86.623,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                percent: 0.273,
              },
              {
                duration: 2,
                percent: .273,
              },
              {
                duration: 3,
                percent: .273,
              },
              {
                duration: 4,
                percent: .273,
              },
              {
                duration: 5,
                percent: .273,
              },
              {
                duration: 6,
                percent: .273,
              },
              {
                duration: 7,
                percent: .273,
              },
              {
                duration: 8,
                percent: .273,
              },
              {
                duration: 9,
                percent: .273,
              },
              {
                duration: 10,
                percent: .273,
              },
              {
                duration: 11,
                percent: .273,
              },
              {
                duration: 12,
                percent: .273,
              },
              {
                duration: 13,
                percent: .273,
              },
              {
                duration: 14,
                percent: .273,
              },
              {
                duration: 15,
                percent: .273,
              },
              {
                duration: 16,
                percent: .273,
              },
              {
                duration: 17,
                percent: .273,
              },
              {
                duration: 18,
                percent: .273,
              },
              {
                duration: 19,
                percent: .273,
              },
              {
                duration: 20,
                percent: .273,
              },
              {
                duration: 21,
                percent: .273,
              },
              {
                duration: 22,
                percent: .273,
              },
              {
                duration: 23,
                percent: .273,
              },
              {
                duration: 24,
                percent: .273,
              },
              {
                duration: 25,
                percent: .273,
              },
              {
                duration: 26,
                percent: .273,
              },
              {
                duration: 27,
                percent: .273,
              },
              {
                duration: 28,
                percent: .273,
              },
              {
                duration: 29,
                percent: .273,
              },
              {
                duration: 30,
                percent: .273,
              },
              {
                duration: 31,
                percent: .273,
              },
              {
                duration: 32,
                percent: .273,
              },
              {
                duration: 33,
                percent: .273,
              },
              {
                duration: 34,
                percent: .273,
              },
              {
                duration: 35,
                percent: .273,
              },
              {
                duration: 36,
                percent: .273,
              },
              {
                duration: 37,
                percent: .273,
              },
              {
                duration: 38,
                percent: .273,
              },
              {
                duration: 39,
                percent: .273,
              },
              {
                duration: 40,
                percent: .273,
              },
              {
                duration: 41,
                percent: .273,
              },
              {
                duration: 42,
                percent: .273,
              },
              {
                duration: 43,
                percent: .273,
              },
              {
                duration: 44,
                percent: .273,
              },
              {
                duration: 45,
                percent: .273,
              },
              {
                duration: 46,
                percent: .273,
              },
              {
                duration: 47,
                percent: .273,
              },
              {
                duration: 48,
                percent: .273,
              },
              {
                duration: 49,
                percent: .273,
              },
              {
                duration: 50,
                percent: 86.623,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                percent: 0.273,
              },
              {
                duration: 2,
                percent: .273,
              },
              {
                duration: 3,
                percent: .273,
              },
              {
                duration: 4,
                percent: .273,
              },
              {
                duration: 5,
                percent: .273,
              },
              {
                duration: 6,
                percent: .273,
              },
              {
                duration: 7,
                percent: .273,
              },
              {
                duration: 8,
                percent: .273,
              },
              {
                duration: 9,
                percent: .273,
              },
              {
                duration: 10,
                percent: .273,
              },
              {
                duration: 11,
                percent: .273,
              },
              {
                duration: 12,
                percent: .273,
              },
              {
                duration: 13,
                percent: .273,
              },
              {
                duration: 14,
                percent: .273,
              },
              {
                duration: 15,
                percent: .273,
              },
              {
                duration: 16,
                percent: .273,
              },
              {
                duration: 17,
                percent: .273,
              },
              {
                duration: 18,
                percent: .273,
              },
              {
                duration: 19,
                percent: .273,
              },
              {
                duration: 20,
                percent: .273,
              },
              {
                duration: 21,
                percent: .273,
              },
              {
                duration: 22,
                percent: .273,
              },
              {
                duration: 23,
                percent: .273,
              },
              {
                duration: 24,
                percent: .273,
              },
              {
                duration: 25,
                percent: .273,
              },
              {
                duration: 26,
                percent: .273,
              },
              {
                duration: 27,
                percent: .273,
              },
              {
                duration: 28,
                percent: .273,
              },
              {
                duration: 29,
                percent: .273,
              },
              {
                duration: 30,
                percent: .273,
              },
              {
                duration: 31,
                percent: .273,
              },
              {
                duration: 32,
                percent: .273,
              },
              {
                duration: 33,
                percent: .273,
              },
              {
                duration: 34,
                percent: .273,
              },
              {
                duration: 35,
                percent: .273,
              },
              {
                duration: 36,
                percent: .273,
              },
              {
                duration: 37,
                percent: .273,
              },
              {
                duration: 38,
                percent: .273,
              },
              {
                duration: 39,
                percent: .273,
              },
              {
                duration: 40,
                percent: .273,
              },
              {
                duration: 41,
                percent: .273,
              },
              {
                duration: 42,
                percent: .273,
              },
              {
                duration: 43,
                percent: .273,
              },
              {
                duration: 44,
                percent: .273,
              },
              {
                duration: 45,
                percent: .273,
              },
              {
                duration: 46,
                percent: .273,
              },
              {
                duration: 47,
                percent: .273,
              },
              {
                duration: 48,
                percent: .273,
              },
              {
                duration: 49,
                percent: .273,
              },
              {
                duration: 50,
                percent: 86.623,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                percent: 0.273,
              },
              {
                duration: 2,
                percent: .273,
              },
              {
                duration: 3,
                percent: .273,
              },
              {
                duration: 4,
                percent: .273,
              },
              {
                duration: 5,
                percent: .273,
              },
              {
                duration: 6,
                percent: .273,
              },
              {
                duration: 7,
                percent: .273,
              },
              {
                duration: 8,
                percent: .273,
              },
              {
                duration: 9,
                percent: .273,
              },
              {
                duration: 10,
                percent: .273,
              },
              {
                duration: 11,
                percent: .273,
              },
              {
                duration: 12,
                percent: .273,
              },
              {
                duration: 13,
                percent: .273,
              },
              {
                duration: 14,
                percent: .273,
              },
              {
                duration: 15,
                percent: .273,
              },
              {
                duration: 16,
                percent: .273,
              },
              {
                duration: 17,
                percent: .273,
              },
              {
                duration: 18,
                percent: .273,
              },
              {
                duration: 19,
                percent: .273,
              },
              {
                duration: 20,
                percent: .273,
              },
              {
                duration: 21,
                percent: .273,
              },
              {
                duration: 22,
                percent: .273,
              },
              {
                duration: 23,
                percent: .273,
              },
              {
                duration: 24,
                percent: .273,
              },
              {
                duration: 25,
                percent: .273,
              },
              {
                duration: 26,
                percent: .273,
              },
              {
                duration: 27,
                percent: .273,
              },
              {
                duration: 28,
                percent: .273,
              },
              {
                duration: 29,
                percent: .273,
              },
              {
                duration: 30,
                percent: .273,
              },
              {
                duration: 31,
                percent: .273,
              },
              {
                duration: 32,
                percent: .273,
              },
              {
                duration: 33,
                percent: .273,
              },
              {
                duration: 34,
                percent: .273,
              },
              {
                duration: 35,
                percent: .273,
              },
              {
                duration: 36,
                percent: .273,
              },
              {
                duration: 37,
                percent: .273,
              },
              {
                duration: 38,
                percent: .273,
              },
              {
                duration: 39,
                percent: .273,
              },
              {
                duration: 40,
                percent: .273,
              },
              {
                duration: 41,
                percent: .273,
              },
              {
                duration: 42,
                percent: .273,
              },
              {
                duration: 43,
                percent: .273,
              },
              {
                duration: 44,
                percent: .273,
              },
              {
                duration: 45,
                percent: .273,
              },
              {
                duration: 46,
                percent: .273,
              },
              {
                duration: 47,
                percent: .273,
              },
              {
                duration: 48,
                percent: .273,
              },
              {
                duration: 49,
                percent: .273,
              },
              {
                duration: 50,
                percent: 86.623,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                percent: 0.273,
              },
              {
                duration: 2,
                percent: .273,
              },
              {
                duration: 3,
                percent: .273,
              },
              {
                duration: 4,
                percent: .273,
              },
              {
                duration: 5,
                percent: .273,
              },
              {
                duration: 6,
                percent: .273,
              },
              {
                duration: 7,
                percent: .273,
              },
              {
                duration: 8,
                percent: .273,
              },
              {
                duration: 9,
                percent: .273,
              },
              {
                duration: 10,
                percent: .273,
              },
              {
                duration: 11,
                percent: .273,
              },
              {
                duration: 12,
                percent: .273,
              },
              {
                duration: 13,
                percent: .273,
              },
              {
                duration: 14,
                percent: .273,
              },
              {
                duration: 15,
                percent: .273,
              },
              {
                duration: 16,
                percent: .273,
              },
              {
                duration: 17,
                percent: .273,
              },
              {
                duration: 18,
                percent: .273,
              },
              {
                duration: 19,
                percent: .273,
              },
              {
                duration: 20,
                percent: .273,
              },
              {
                duration: 21,
                percent: .273,
              },
              {
                duration: 22,
                percent: .273,
              },
              {
                duration: 23,
                percent: .273,
              },
              {
                duration: 24,
                percent: .273,
              },
              {
                duration: 25,
                percent: .273,
              },
              {
                duration: 26,
                percent: .273,
              },
              {
                duration: 27,
                percent: .273,
              },
              {
                duration: 28,
                percent: .273,
              },
              {
                duration: 29,
                percent: .273,
              },
              {
                duration: 30,
                percent: .273,
              },
              {
                duration: 31,
                percent: .273,
              },
              {
                duration: 32,
                percent: .273,
              },
              {
                duration: 33,
                percent: .273,
              },
              {
                duration: 34,
                percent: .273,
              },
              {
                duration: 35,
                percent: .273,
              },
              {
                duration: 36,
                percent: .273,
              },
              {
                duration: 37,
                percent: .273,
              },
              {
                duration: 38,
                percent: .273,
              },
              {
                duration: 39,
                percent: .273,
              },
              {
                duration: 40,
                percent: .273,
              },
              {
                duration: 41,
                percent: .273,
              },
              {
                duration: 42,
                percent: .273,
              },
              {
                duration: 43,
                percent: .273,
              },
              {
                duration: 44,
                percent: .273,
              },
              {
                duration: 45,
                percent: .273,
              },
              {
                duration: 46,
                percent: .273,
              },
              {
                duration: 47,
                percent: .273,
              },
              {
                duration: 48,
                percent: .273,
              },
              {
                duration: 49,
                percent: .273,
              },
              {
                duration: 50,
                percent: 86.623,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                percent: 0.273,
              },
              {
                duration: 2,
                percent: .273,
              },
              {
                duration: 3,
                percent: .273,
              },
              {
                duration: 4,
                percent: .273,
              },
              {
                duration: 5,
                percent: .273,
              },
              {
                duration: 6,
                percent: .273,
              },
              {
                duration: 7,
                percent: .273,
              },
              {
                duration: 8,
                percent: .273,
              },
              {
                duration: 9,
                percent: .273,
              },
              {
                duration: 10,
                percent: .273,
              },
              {
                duration: 11,
                percent: .273,
              },
              {
                duration: 12,
                percent: .273,
              },
              {
                duration: 13,
                percent: .273,
              },
              {
                duration: 14,
                percent: .273,
              },
              {
                duration: 15,
                percent: .273,
              },
              {
                duration: 16,
                percent: .273,
              },
              {
                duration: 17,
                percent: .273,
              },
              {
                duration: 18,
                percent: .273,
              },
              {
                duration: 19,
                percent: .273,
              },
              {
                duration: 20,
                percent: .273,
              },
              {
                duration: 21,
                percent: .273,
              },
              {
                duration: 22,
                percent: .273,
              },
              {
                duration: 23,
                percent: .273,
              },
              {
                duration: 24,
                percent: .273,
              },
              {
                duration: 25,
                percent: .273,
              },
              {
                duration: 26,
                percent: .273,
              },
              {
                duration: 27,
                percent: .273,
              },
              {
                duration: 28,
                percent: .273,
              },
              {
                duration: 29,
                percent: .273,
              },
              {
                duration: 30,
                percent: .273,
              },
              {
                duration: 31,
                percent: .273,
              },
              {
                duration: 32,
                percent: .273,
              },
              {
                duration: 33,
                percent: .273,
              },
              {
                duration: 34,
                percent: .273,
              },
              {
                duration: 35,
                percent: .273,
              },
              {
                duration: 36,
                percent: .273,
              },
              {
                duration: 37,
                percent: .273,
              },
              {
                duration: 38,
                percent: .273,
              },
              {
                duration: 39,
                percent: .273,
              },
              {
                duration: 40,
                percent: .273,
              },
              {
                duration: 41,
                percent: .273,
              },
              {
                duration: 42,
                percent: .273,
              },
              {
                duration: 43,
                percent: .273,
              },
              {
                duration: 44,
                percent: .273,
              },
              {
                duration: 45,
                percent: .273,
              },
              {
                duration: 46,
                percent: .273,
              },
              {
                duration: 47,
                percent: .273,
              },
              {
                duration: 48,
                percent: .273,
              },
              {
                duration: 49,
                percent: .273,
              },
              {
                duration: 50,
                percent: 86.623,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                percent: 0.273,
              },
              {
                duration: 2,
                percent: .273,
              },
              {
                duration: 3,
                percent: .273,
              },
              {
                duration: 4,
                percent: .273,
              },
              {
                duration: 5,
                percent: .273,
              },
              {
                duration: 6,
                percent: .273,
              },
              {
                duration: 7,
                percent: .273,
              },
              {
                duration: 8,
                percent: .273,
              },
              {
                duration: 9,
                percent: .273,
              },
              {
                duration: 10,
                percent: .273,
              },
              {
                duration: 11,
                percent: .273,
              },
              {
                duration: 12,
                percent: .273,
              },
              {
                duration: 13,
                percent: .273,
              },
              {
                duration: 14,
                percent: .273,
              },
              {
                duration: 15,
                percent: .273,
              },
              {
                duration: 16,
                percent: .273,
              },
              {
                duration: 17,
                percent: .273,
              },
              {
                duration: 18,
                percent: .273,
              },
              {
                duration: 19,
                percent: .273,
              },
              {
                duration: 20,
                percent: .273,
              },
              {
                duration: 21,
                percent: .273,
              },
              {
                duration: 22,
                percent: .273,
              },
              {
                duration: 23,
                percent: .273,
              },
              {
                duration: 24,
                percent: .273,
              },
              {
                duration: 25,
                percent: .273,
              },
              {
                duration: 26,
                percent: .273,
              },
              {
                duration: 27,
                percent: .273,
              },
              {
                duration: 28,
                percent: .273,
              },
              {
                duration: 29,
                percent: .273,
              },
              {
                duration: 30,
                percent: .273,
              },
              {
                duration: 31,
                percent: .273,
              },
              {
                duration: 32,
                percent: .273,
              },
              {
                duration: 33,
                percent: .273,
              },
              {
                duration: 34,
                percent: .273,
              },
              {
                duration: 35,
                percent: .273,
              },
              {
                duration: 36,
                percent: .273,
              },
              {
                duration: 37,
                percent: .273,
              },
              {
                duration: 38,
                percent: .273,
              },
              {
                duration: 39,
                percent: .273,
              },
              {
                duration: 40,
                percent: .273,
              },
              {
                duration: 41,
                percent: .273,
              },
              {
                duration: 42,
                percent: .273,
              },
              {
                duration: 43,
                percent: .273,
              },
              {
                duration: 44,
                percent: .273,
              },
              {
                duration: 45,
                percent: .273,
              },
              {
                duration: 46,
                percent: .273,
              },
              {
                duration: 47,
                percent: .273,
              },
              {
                duration: 48,
                percent: .273,
              },
              {
                duration: 49,
                percent: .273,
              },
              {
                duration: 50,
                percent: 86.623,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })

  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                percent: 0.273,
              },
              {
                duration: 2,
                percent: .273,
              },
              {
                duration: 3,
                percent: .273,
              },
              {
                duration: 4,
                percent: .273,
              },
              {
                duration: 5,
                percent: .273,
              },
              {
                duration: 6,
                percent: .273,
              },
              {
                duration: 7,
                percent: .273,
              },
              {
                duration: 8,
                percent: .273,
              },
              {
                duration: 9,
                percent: .273,
              },
              {
                duration: 10,
                percent: .273,
              },
              {
                duration: 11,
                percent: .273,
              },
              {
                duration: 12,
                percent: .273,
              },
              {
                duration: 13,
                percent: .273,
              },
              {
                duration: 14,
                percent: .273,
              },
              {
                duration: 15,
                percent: .273,
              },
              {
                duration: 16,
                percent: .273,
              },
              {
                duration: 17,
                percent: .273,
              },
              {
                duration: 18,
                percent: .273,
              },
              {
                duration: 19,
                percent: .273,
              },
              {
                duration: 20,
                percent: .273,
              },
              {
                duration: 21,
                percent: .273,
              },
              {
                duration: 22,
                percent: .273,
              },
              {
                duration: 23,
                percent: .273,
              },
              {
                duration: 24,
                percent: .273,
              },
              {
                duration: 25,
                percent: .273,
              },
              {
                duration: 26,
                percent: .273,
              },
              {
                duration: 27,
                percent: .273,
              },
              {
                duration: 28,
                percent: .273,
              },
              {
                duration: 29,
                percent: .273,
              },
              {
                duration: 30,
                percent: .273,
              },
              {
                duration: 31,
                percent: .273,
              },
              {
                duration: 32,
                percent: .273,
              },
              {
                duration: 33,
                percent: .273,
              },
              {
                duration: 34,
                percent: .273,
              },
              {
                duration: 35,
                percent: .273,
              },
              {
                duration: 36,
                percent: .273,
              },
              {
                duration: 37,
                percent: .273,
              },
              {
                duration: 38,
                percent: .273,
              },
              {
                duration: 39,
                percent: .273,
              },
              {
                duration: 40,
                percent: .273,
              },
              {
                duration: 41,
                percent: .273,
              },
              {
                duration: 42,
                percent: .273,
              },
              {
                duration: 43,
                percent: .273,
              },
              {
                duration: 44,
                percent: .273,
              },
              {
                duration: 45,
                percent: .273,
              },
              {
                duration: 46,
                percent: .273,
              },
              {
                duration: 47,
                percent: .273,
              },
              {
                duration: 48,
                percent: .273,
              },
              {
                duration: 49,
                percent: .273,
              },
              {
                duration: 50,
                percent: 86.623,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                percent: 0.273,
              },
              {
                duration: 2,
                percent: .273,
              },
              {
                duration: 3,
                percent: .273,
              },
              {
                duration: 4,
                percent: .273,
              },
              {
                duration: 5,
                percent: .273,
              },
              {
                duration: 6,
                percent: .273,
              },
              {
                duration: 7,
                percent: .273,
              },
              {
                duration: 8,
                percent: .273,
              },
              {
                duration: 9,
                percent: .273,
              },
              {
                duration: 10,
                percent: .273,
              },
              {
                duration: 11,
                percent: .273,
              },
              {
                duration: 12,
                percent: .273,
              },
              {
                duration: 13,
                percent: .273,
              },
              {
                duration: 14,
                percent: .273,
              },
              {
                duration: 15,
                percent: .273,
              },
              {
                duration: 16,
                percent: .273,
              },
              {
                duration: 17,
                percent: .273,
              },
              {
                duration: 18,
                percent: .273,
              },
              {
                duration: 19,
                percent: .273,
              },
              {
                duration: 20,
                percent: .273,
              },
              {
                duration: 21,
                percent: .273,
              },
              {
                duration: 22,
                percent: .273,
              },
              {
                duration: 23,
                percent: .273,
              },
              {
                duration: 24,
                percent: .273,
              },
              {
                duration: 25,
                percent: .273,
              },
              {
                duration: 26,
                percent: .273,
              },
              {
                duration: 27,
                percent: .273,
              },
              {
                duration: 28,
                percent: .273,
              },
              {
                duration: 29,
                percent: .273,
              },
              {
                duration: 30,
                percent: .273,
              },
              {
                duration: 31,
                percent: .273,
              },
              {
                duration: 32,
                percent: .273,
              },
              {
                duration: 33,
                percent: .273,
              },
              {
                duration: 34,
                percent: .273,
              },
              {
                duration: 35,
                percent: .273,
              },
              {
                duration: 36,
                percent: .273,
              },
              {
                duration: 37,
                percent: .273,
              },
              {
                duration: 38,
                percent: .273,
              },
              {
                duration: 39,
                percent: .273,
              },
              {
                duration: 40,
                percent: .273,
              },
              {
                duration: 41,
                percent: .273,
              },
              {
                duration: 42,
                percent: .273,
              },
              {
                duration: 43,
                percent: .273,
              },
              {
                duration: 44,
                percent: .273,
              },
              {
                duration: 45,
                percent: .273,
              },
              {
                duration: 46,
                percent: .273,
              },
              {
                duration: 47,
                percent: .273,
              },
              {
                duration: 48,
                percent: .273,
              },
              {
                duration: 49,
                percent: .273,
              },
              {
                duration: 50,
                percent: 86.623,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                percent: 0.273,
              },
              {
                duration: 2,
                percent: .273,
              },
              {
                duration: 3,
                percent: .273,
              },
              {
                duration: 4,
                percent: .273,
              },
              {
                duration: 5,
                percent: .273,
              },
              {
                duration: 6,
                percent: .273,
              },
              {
                duration: 7,
                percent: .273,
              },
              {
                duration: 8,
                percent: .273,
              },
              {
                duration: 9,
                percent: .273,
              },
              {
                duration: 10,
                percent: .273,
              },
              {
                duration: 11,
                percent: .273,
              },
              {
                duration: 12,
                percent: .273,
              },
              {
                duration: 13,
                percent: .273,
              },
              {
                duration: 14,
                percent: .273,
              },
              {
                duration: 15,
                percent: .273,
              },
              {
                duration: 16,
                percent: .273,
              },
              {
                duration: 17,
                percent: .273,
              },
              {
                duration: 18,
                percent: .273,
              },
              {
                duration: 19,
                percent: .273,
              },
              {
                duration: 20,
                percent: .273,
              },
              {
                duration: 21,
                percent: .273,
              },
              {
                duration: 22,
                percent: .273,
              },
              {
                duration: 23,
                percent: .273,
              },
              {
                duration: 24,
                percent: .273,
              },
              {
                duration: 25,
                percent: .273,
              },
              {
                duration: 26,
                percent: .273,
              },
              {
                duration: 27,
                percent: .273,
              },
              {
                duration: 28,
                percent: .273,
              },
              {
                duration: 29,
                percent: .273,
              },
              {
                duration: 30,
                percent: .273,
              },
              {
                duration: 31,
                percent: .273,
              },
              {
                duration: 32,
                percent: .273,
              },
              {
                duration: 33,
                percent: .273,
              },
              {
                duration: 34,
                percent: .273,
              },
              {
                duration: 35,
                percent: .273,
              },
              {
                duration: 36,
                percent: .273,
              },
              {
                duration: 37,
                percent: .273,
              },
              {
                duration: 38,
                percent: .273,
              },
              {
                duration: 39,
                percent: .273,
              },
              {
                duration: 40,
                percent: .273,
              },
              {
                duration: 41,
                percent: .273,
              },
              {
                duration: 42,
                percent: .273,
              },
              {
                duration: 43,
                percent: .273,
              },
              {
                duration: 44,
                percent: .273,
              },
              {
                duration: 45,
                percent: .273,
              },
              {
                duration: 46,
                percent: .273,
              },
              {
                duration: 47,
                percent: .273,
              },
              {
                duration: 48,
                percent: .273,
              },
              {
                duration: 49,
                percent: .273,
              },
              {
                duration: 50,
                percent: 86.623,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                percent: 0.273,
              },
              {
                duration: 2,
                percent: .273,
              },
              {
                duration: 3,
                percent: .273,
              },
              {
                duration: 4,
                percent: .273,
              },
              {
                duration: 5,
                percent: .273,
              },
              {
                duration: 6,
                percent: .273,
              },
              {
                duration: 7,
                percent: .273,
              },
              {
                duration: 8,
                percent: .273,
              },
              {
                duration: 9,
                percent: .273,
              },
              {
                duration: 10,
                percent: .273,
              },
              {
                duration: 11,
                percent: .273,
              },
              {
                duration: 12,
                percent: .273,
              },
              {
                duration: 13,
                percent: .273,
              },
              {
                duration: 14,
                percent: .273,
              },
              {
                duration: 15,
                percent: .273,
              },
              {
                duration: 16,
                percent: .273,
              },
              {
                duration: 17,
                percent: .273,
              },
              {
                duration: 18,
                percent: .273,
              },
              {
                duration: 19,
                percent: .273,
              },
              {
                duration: 20,
                percent: .273,
              },
              {
                duration: 21,
                percent: .273,
              },
              {
                duration: 22,
                percent: .273,
              },
              {
                duration: 23,
                percent: .273,
              },
              {
                duration: 24,
                percent: .273,
              },
              {
                duration: 25,
                percent: .273,
              },
              {
                duration: 26,
                percent: .273,
              },
              {
                duration: 27,
                percent: .273,
              },
              {
                duration: 28,
                percent: .273,
              },
              {
                duration: 29,
                percent: .273,
              },
              {
                duration: 30,
                percent: .273,
              },
              {
                duration: 31,
                percent: .273,
              },
              {
                duration: 32,
                percent: .273,
              },
              {
                duration: 33,
                percent: .273,
              },
              {
                duration: 34,
                percent: .273,
              },
              {
                duration: 35,
                percent: .273,
              },
              {
                duration: 36,
                percent: .273,
              },
              {
                duration: 37,
                percent: .273,
              },
              {
                duration: 38,
                percent: .273,
              },
              {
                duration: 39,
                percent: .273,
              },
              {
                duration: 40,
                percent: .273,
              },
              {
                duration: 41,
                percent: .273,
              },
              {
                duration: 42,
                percent: .273,
              },
              {
                duration: 43,
                percent: .273,
              },
              {
                duration: 44,
                percent: .273,
              },
              {
                duration: 45,
                percent: .273,
              },
              {
                duration: 46,
                percent: .273,
              },
              {
                duration: 47,
                percent: .273,
              },
              {
                duration: 48,
                percent: .273,
              },
              {
                duration: 49,
                percent: .273,
              },
              {
                duration: 50,
                percent: 86.623,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                percent: 0.273,
              },
              {
                duration: 2,
                percent: .273,
              },
              {
                duration: 3,
                percent: .273,
              },
              {
                duration: 4,
                percent: .273,
              },
              {
                duration: 5,
                percent: .273,
              },
              {
                duration: 6,
                percent: .273,
              },
              {
                duration: 7,
                percent: .273,
              },
              {
                duration: 8,
                percent: .273,
              },
              {
                duration: 9,
                percent: .273,
              },
              {
                duration: 10,
                percent: .273,
              },
              {
                duration: 11,
                percent: .273,
              },
              {
                duration: 12,
                percent: .273,
              },
              {
                duration: 13,
                percent: .273,
              },
              {
                duration: 14,
                percent: .273,
              },
              {
                duration: 15,
                percent: .273,
              },
              {
                duration: 16,
                percent: .273,
              },
              {
                duration: 17,
                percent: .273,
              },
              {
                duration: 18,
                percent: .273,
              },
              {
                duration: 19,
                percent: .273,
              },
              {
                duration: 20,
                percent: .273,
              },
              {
                duration: 21,
                percent: .273,
              },
              {
                duration: 22,
                percent: .273,
              },
              {
                duration: 23,
                percent: .273,
              },
              {
                duration: 24,
                percent: .273,
              },
              {
                duration: 25,
                percent: .273,
              },
              {
                duration: 26,
                percent: .273,
              },
              {
                duration: 27,
                percent: .273,
              },
              {
                duration: 28,
                percent: .273,
              },
              {
                duration: 29,
                percent: .273,
              },
              {
                duration: 30,
                percent: .273,
              },
              {
                duration: 31,
                percent: .273,
              },
              {
                duration: 32,
                percent: .273,
              },
              {
                duration: 33,
                percent: .273,
              },
              {
                duration: 34,
                percent: .273,
              },
              {
                duration: 35,
                percent: .273,
              },
              {
                duration: 36,
                percent: .273,
              },
              {
                duration: 37,
                percent: .273,
              },
              {
                duration: 38,
                percent: .273,
              },
              {
                duration: 39,
                percent: .273,
              },
              {
                duration: 40,
                percent: .273,
              },
              {
                duration: 41,
                percent: .273,
              },
              {
                duration: 42,
                percent: .273,
              },
              {
                duration: 43,
                percent: .273,
              },
              {
                duration: 44,
                percent: .273,
              },
              {
                duration: 45,
                percent: .273,
              },
              {
                duration: 46,
                percent: .273,
              },
              {
                duration: 47,
                percent: .273,
              },
              {
                duration: 48,
                percent: .273,
              },
              {
                duration: 49,
                percent: .273,
              },
              {
                duration: 50,
                percent: 86.623,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                percent: 0.273,
              },
              {
                duration: 2,
                percent: .273,
              },
              {
                duration: 3,
                percent: .273,
              },
              {
                duration: 4,
                percent: .273,
              },
              {
                duration: 5,
                percent: .273,
              },
              {
                duration: 6,
                percent: .273,
              },
              {
                duration: 7,
                percent: .273,
              },
              {
                duration: 8,
                percent: .273,
              },
              {
                duration: 9,
                percent: .273,
              },
              {
                duration: 10,
                percent: .273,
              },
              {
                duration: 11,
                percent: .273,
              },
              {
                duration: 12,
                percent: .273,
              },
              {
                duration: 13,
                percent: .273,
              },
              {
                duration: 14,
                percent: .273,
              },
              {
                duration: 15,
                percent: .273,
              },
              {
                duration: 16,
                percent: .273,
              },
              {
                duration: 17,
                percent: .273,
              },
              {
                duration: 18,
                percent: .273,
              },
              {
                duration: 19,
                percent: .273,
              },
              {
                duration: 20,
                percent: .273,
              },
              {
                duration: 21,
                percent: .273,
              },
              {
                duration: 22,
                percent: .273,
              },
              {
                duration: 23,
                percent: .273,
              },
              {
                duration: 24,
                percent: .273,
              },
              {
                duration: 25,
                percent: .273,
              },
              {
                duration: 26,
                percent: .273,
              },
              {
                duration: 27,
                percent: .273,
              },
              {
                duration: 28,
                percent: .273,
              },
              {
                duration: 29,
                percent: .273,
              },
              {
                duration: 30,
                percent: .273,
              },
              {
                duration: 31,
                percent: .273,
              },
              {
                duration: 32,
                percent: .273,
              },
              {
                duration: 33,
                percent: .273,
              },
              {
                duration: 34,
                percent: .273,
              },
              {
                duration: 35,
                percent: .273,
              },
              {
                duration: 36,
                percent: .273,
              },
              {
                duration: 37,
                percent: .273,
              },
              {
                duration: 38,
                percent: .273,
              },
              {
                duration: 39,
                percent: .273,
              },
              {
                duration: 40,
                percent: .273,
              },
              {
                duration: 41,
                percent: .273,
              },
              {
                duration: 42,
                percent: .273,
              },
              {
                duration: 43,
                percent: .273,
              },
              {
                duration: 44,
                percent: .273,
              },
              {
                duration: 45,
                percent: .273,
              },
              {
                duration: 46,
                percent: .273,
              },
              {
                duration: 47,
                percent: .273,
              },
              {
                duration: 48,
                percent: .273,
              },
              {
                duration: 49,
                percent: .273,
              },
              {
                duration: 50,
                percent: 86.623,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                percent: 0.273,
              },
              {
                duration: 2,
                percent: .273,
              },
              {
                duration: 3,
                percent: .273,
              },
              {
                duration: 4,
                percent: .273,
              },
              {
                duration: 5,
                percent: .273,
              },
              {
                duration: 6,
                percent: .273,
              },
              {
                duration: 7,
                percent: .273,
              },
              {
                duration: 8,
                percent: .273,
              },
              {
                duration: 9,
                percent: .273,
              },
              {
                duration: 10,
                percent: .273,
              },
              {
                duration: 11,
                percent: .273,
              },
              {
                duration: 12,
                percent: .273,
              },
              {
                duration: 13,
                percent: .273,
              },
              {
                duration: 14,
                percent: .273,
              },
              {
                duration: 15,
                percent: .273,
              },
              {
                duration: 16,
                percent: .273,
              },
              {
                duration: 17,
                percent: .273,
              },
              {
                duration: 18,
                percent: .273,
              },
              {
                duration: 19,
                percent: .273,
              },
              {
                duration: 20,
                percent: .273,
              },
              {
                duration: 21,
                percent: .273,
              },
              {
                duration: 22,
                percent: .273,
              },
              {
                duration: 23,
                percent: .273,
              },
              {
                duration: 24,
                percent: .273,
              },
              {
                duration: 25,
                percent: .273,
              },
              {
                duration: 26,
                percent: .273,
              },
              {
                duration: 27,
                percent: .273,
              },
              {
                duration: 28,
                percent: .273,
              },
              {
                duration: 29,
                percent: .273,
              },
              {
                duration: 30,
                percent: .273,
              },
              {
                duration: 31,
                percent: .273,
              },
              {
                duration: 32,
                percent: .273,
              },
              {
                duration: 33,
                percent: .273,
              },
              {
                duration: 34,
                percent: .273,
              },
              {
                duration: 35,
                percent: .273,
              },
              {
                duration: 36,
                percent: .273,
              },
              {
                duration: 37,
                percent: .273,
              },
              {
                duration: 38,
                percent: .273,
              },
              {
                duration: 39,
                percent: .273,
              },
              {
                duration: 40,
                percent: .273,
              },
              {
                duration: 41,
                percent: .273,
              },
              {
                duration: 42,
                percent: .273,
              },
              {
                duration: 43,
                percent: .273,
              },
              {
                duration: 44,
                percent: .273,
              },
              {
                duration: 45,
                percent: .273,
              },
              {
                duration: 46,
                percent: .273,
              },
              {
                duration: 47,
                percent: .273,
              },
              {
                duration: 48,
                percent: .273,
              },
              {
                duration: 49,
                percent: .273,
              },
              {
                duration: 50,
                percent: 86.623,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                percent: 0.273,
              },
              {
                duration: 2,
                percent: .273,
              },
              {
                duration: 3,
                percent: .273,
              },
              {
                duration: 4,
                percent: .273,
              },
              {
                duration: 5,
                percent: .273,
              },
              {
                duration: 6,
                percent: .273,
              },
              {
                duration: 7,
                percent: .273,
              },
              {
                duration: 8,
                percent: .273,
              },
              {
                duration: 9,
                percent: .273,
              },
              {
                duration: 10,
                percent: .273,
              },
              {
                duration: 11,
                percent: .273,
              },
              {
                duration: 12,
                percent: .273,
              },
              {
                duration: 13,
                percent: .273,
              },
              {
                duration: 14,
                percent: .273,
              },
              {
                duration: 15,
                percent: .273,
              },
              {
                duration: 16,
                percent: .273,
              },
              {
                duration: 17,
                percent: .273,
              },
              {
                duration: 18,
                percent: .273,
              },
              {
                duration: 19,
                percent: .273,
              },
              {
                duration: 20,
                percent: .273,
              },
              {
                duration: 21,
                percent: .273,
              },
              {
                duration: 22,
                percent: .273,
              },
              {
                duration: 23,
                percent: .273,
              },
              {
                duration: 24,
                percent: .273,
              },
              {
                duration: 25,
                percent: .273,
              },
              {
                duration: 26,
                percent: .273,
              },
              {
                duration: 27,
                percent: .273,
              },
              {
                duration: 28,
                percent: .273,
              },
              {
                duration: 29,
                percent: .273,
              },
              {
                duration: 30,
                percent: .273,
              },
              {
                duration: 31,
                percent: .273,
              },
              {
                duration: 32,
                percent: .273,
              },
              {
                duration: 33,
                percent: .273,
              },
              {
                duration: 34,
                percent: .273,
              },
              {
                duration: 35,
                percent: .273,
              },
              {
                duration: 36,
                percent: .273,
              },
              {
                duration: 37,
                percent: .273,
              },
              {
                duration: 38,
                percent: .273,
              },
              {
                duration: 39,
                percent: .273,
              },
              {
                duration: 40,
                percent: .273,
              },
              {
                duration: 41,
                percent: .273,
              },
              {
                duration: 42,
                percent: .273,
              },
              {
                duration: 43,
                percent: .273,
              },
              {
                duration: 44,
                percent: .273,
              },
              {
                duration: 45,
                percent: .273,
              },
              {
                duration: 46,
                percent: .273,
              },
              {
                duration: 47,
                percent: .273,
              },
              {
                duration: 48,
                percent: .273,
              },
              {
                duration: 49,
                percent: .273,
              },
              {
                duration: 50,
                percent: 86.623,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                percent: 0.273,
              },
              {
                duration: 2,
                percent: .273,
              },
              {
                duration: 3,
                percent: .273,
              },
              {
                duration: 4,
                percent: .273,
              },
              {
                duration: 5,
                percent: .273,
              },
              {
                duration: 6,
                percent: .273,
              },
              {
                duration: 7,
                percent: .273,
              },
              {
                duration: 8,
                percent: .273,
              },
              {
                duration: 9,
                percent: .273,
              },
              {
                duration: 10,
                percent: .273,
              },
              {
                duration: 11,
                percent: .273,
              },
              {
                duration: 12,
                percent: .273,
              },
              {
                duration: 13,
                percent: .273,
              },
              {
                duration: 14,
                percent: .273,
              },
              {
                duration: 15,
                percent: .273,
              },
              {
                duration: 16,
                percent: .273,
              },
              {
                duration: 17,
                percent: .273,
              },
              {
                duration: 18,
                percent: .273,
              },
              {
                duration: 19,
                percent: .273,
              },
              {
                duration: 20,
                percent: .273,
              },
              {
                duration: 21,
                percent: .273,
              },
              {
                duration: 22,
                percent: .273,
              },
              {
                duration: 23,
                percent: .273,
              },
              {
                duration: 24,
                percent: .273,
              },
              {
                duration: 25,
                percent: .273,
              },
              {
                duration: 26,
                percent: .273,
              },
              {
                duration: 27,
                percent: .273,
              },
              {
                duration: 28,
                percent: .273,
              },
              {
                duration: 29,
                percent: .273,
              },
              {
                duration: 30,
                percent: .273,
              },
              {
                duration: 31,
                percent: .273,
              },
              {
                duration: 32,
                percent: .273,
              },
              {
                duration: 33,
                percent: .273,
              },
              {
                duration: 34,
                percent: .273,
              },
              {
                duration: 35,
                percent: .273,
              },
              {
                duration: 36,
                percent: .273,
              },
              {
                duration: 37,
                percent: .273,
              },
              {
                duration: 38,
                percent: .273,
              },
              {
                duration: 39,
                percent: .273,
              },
              {
                duration: 40,
                percent: .273,
              },
              {
                duration: 41,
                percent: .273,
              },
              {
                duration: 42,
                percent: .273,
              },
              {
                duration: 43,
                percent: .273,
              },
              {
                duration: 44,
                percent: .273,
              },
              {
                duration: 45,
                percent: .273,
              },
              {
                duration: 46,
                percent: .273,
              },
              {
                duration: 47,
                percent: .273,
              },
              {
                duration: 48,
                percent: .273,
              },
              {
                duration: 49,
                percent: .273,
              },
              {
                duration: 50,
                percent: 86.623,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })

  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                percent: 0.273,
              },
              {
                duration: 2,
                percent: .273,
              },
              {
                duration: 3,
                percent: .273,
              },
              {
                duration: 4,
                percent: .273,
              },
              {
                duration: 5,
                percent: .273,
              },
              {
                duration: 6,
                percent: .273,
              },
              {
                duration: 7,
                percent: .273,
              },
              {
                duration: 8,
                percent: .273,
              },
              {
                duration: 9,
                percent: .273,
              },
              {
                duration: 10,
                percent: .273,
              },
              {
                duration: 11,
                percent: .273,
              },
              {
                duration: 12,
                percent: .273,
              },
              {
                duration: 13,
                percent: .273,
              },
              {
                duration: 14,
                percent: .273,
              },
              {
                duration: 15,
                percent: .273,
              },
              {
                duration: 16,
                percent: .273,
              },
              {
                duration: 17,
                percent: .273,
              },
              {
                duration: 18,
                percent: .273,
              },
              {
                duration: 19,
                percent: .273,
              },
              {
                duration: 20,
                percent: .273,
              },
              {
                duration: 21,
                percent: .273,
              },
              {
                duration: 22,
                percent: .273,
              },
              {
                duration: 23,
                percent: .273,
              },
              {
                duration: 24,
                percent: .273,
              },
              {
                duration: 25,
                percent: .273,
              },
              {
                duration: 26,
                percent: .273,
              },
              {
                duration: 27,
                percent: .273,
              },
              {
                duration: 28,
                percent: .273,
              },
              {
                duration: 29,
                percent: .273,
              },
              {
                duration: 30,
                percent: .273,
              },
              {
                duration: 31,
                percent: .273,
              },
              {
                duration: 32,
                percent: .273,
              },
              {
                duration: 33,
                percent: .273,
              },
              {
                duration: 34,
                percent: .273,
              },
              {
                duration: 35,
                percent: .273,
              },
              {
                duration: 36,
                percent: .273,
              },
              {
                duration: 37,
                percent: .273,
              },
              {
                duration: 38,
                percent: .273,
              },
              {
                duration: 39,
                percent: .273,
              },
              {
                duration: 40,
                percent: .273,
              },
              {
                duration: 41,
                percent: .273,
              },
              {
                duration: 42,
                percent: .273,
              },
              {
                duration: 43,
                percent: .273,
              },
              {
                duration: 44,
                percent: .273,
              },
              {
                duration: 45,
                percent: .273,
              },
              {
                duration: 46,
                percent: .273,
              },
              {
                duration: 47,
                percent: .273,
              },
              {
                duration: 48,
                percent: .273,
              },
              {
                duration: 49,
                percent: .273,
              },
              {
                duration: 50,
                percent: 86.623,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                percent: 0.273,
              },
              {
                duration: 2,
                percent: .273,
              },
              {
                duration: 3,
                percent: .273,
              },
              {
                duration: 4,
                percent: .273,
              },
              {
                duration: 5,
                percent: .273,
              },
              {
                duration: 6,
                percent: .273,
              },
              {
                duration: 7,
                percent: .273,
              },
              {
                duration: 8,
                percent: .273,
              },
              {
                duration: 9,
                percent: .273,
              },
              {
                duration: 10,
                percent: .273,
              },
              {
                duration: 11,
                percent: .273,
              },
              {
                duration: 12,
                percent: .273,
              },
              {
                duration: 13,
                percent: .273,
              },
              {
                duration: 14,
                percent: .273,
              },
              {
                duration: 15,
                percent: .273,
              },
              {
                duration: 16,
                percent: .273,
              },
              {
                duration: 17,
                percent: .273,
              },
              {
                duration: 18,
                percent: .273,
              },
              {
                duration: 19,
                percent: .273,
              },
              {
                duration: 20,
                percent: .273,
              },
              {
                duration: 21,
                percent: .273,
              },
              {
                duration: 22,
                percent: .273,
              },
              {
                duration: 23,
                percent: .273,
              },
              {
                duration: 24,
                percent: .273,
              },
              {
                duration: 25,
                percent: .273,
              },
              {
                duration: 26,
                percent: .273,
              },
              {
                duration: 27,
                percent: .273,
              },
              {
                duration: 28,
                percent: .273,
              },
              {
                duration: 29,
                percent: .273,
              },
              {
                duration: 30,
                percent: .273,
              },
              {
                duration: 31,
                percent: .273,
              },
              {
                duration: 32,
                percent: .273,
              },
              {
                duration: 33,
                percent: .273,
              },
              {
                duration: 34,
                percent: .273,
              },
              {
                duration: 35,
                percent: .273,
              },
              {
                duration: 36,
                percent: .273,
              },
              {
                duration: 37,
                percent: .273,
              },
              {
                duration: 38,
                percent: .273,
              },
              {
                duration: 39,
                percent: .273,
              },
              {
                duration: 40,
                percent: .273,
              },
              {
                duration: 41,
                percent: .273,
              },
              {
                duration: 42,
                percent: .273,
              },
              {
                duration: 43,
                percent: .273,
              },
              {
                duration: 44,
                percent: .273,
              },
              {
                duration: 45,
                percent: .273,
              },
              {
                duration: 46,
                percent: .273,
              },
              {
                duration: 47,
                percent: .273,
              },
              {
                duration: 48,
                percent: .273,
              },
              {
                duration: 49,
                percent: .273,
              },
              {
                duration: 50,
                percent: 86.623,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                percent: 0.273,
              },
              {
                duration: 2,
                percent: .273,
              },
              {
                duration: 3,
                percent: .273,
              },
              {
                duration: 4,
                percent: .273,
              },
              {
                duration: 5,
                percent: .273,
              },
              {
                duration: 6,
                percent: .273,
              },
              {
                duration: 7,
                percent: .273,
              },
              {
                duration: 8,
                percent: .273,
              },
              {
                duration: 9,
                percent: .273,
              },
              {
                duration: 10,
                percent: .273,
              },
              {
                duration: 11,
                percent: .273,
              },
              {
                duration: 12,
                percent: .273,
              },
              {
                duration: 13,
                percent: .273,
              },
              {
                duration: 14,
                percent: .273,
              },
              {
                duration: 15,
                percent: .273,
              },
              {
                duration: 16,
                percent: .273,
              },
              {
                duration: 17,
                percent: .273,
              },
              {
                duration: 18,
                percent: .273,
              },
              {
                duration: 19,
                percent: .273,
              },
              {
                duration: 20,
                percent: .273,
              },
              {
                duration: 21,
                percent: .273,
              },
              {
                duration: 22,
                percent: .273,
              },
              {
                duration: 23,
                percent: .273,
              },
              {
                duration: 24,
                percent: .273,
              },
              {
                duration: 25,
                percent: .273,
              },
              {
                duration: 26,
                percent: .273,
              },
              {
                duration: 27,
                percent: .273,
              },
              {
                duration: 28,
                percent: .273,
              },
              {
                duration: 29,
                percent: .273,
              },
              {
                duration: 30,
                percent: .273,
              },
              {
                duration: 31,
                percent: .273,
              },
              {
                duration: 32,
                percent: .273,
              },
              {
                duration: 33,
                percent: .273,
              },
              {
                duration: 34,
                percent: .273,
              },
              {
                duration: 35,
                percent: .273,
              },
              {
                duration: 36,
                percent: .273,
              },
              {
                duration: 37,
                percent: .273,
              },
              {
                duration: 38,
                percent: .273,
              },
              {
                duration: 39,
                percent: .273,
              },
              {
                duration: 40,
                percent: .273,
              },
              {
                duration: 41,
                percent: .273,
              },
              {
                duration: 42,
                percent: .273,
              },
              {
                duration: 43,
                percent: .273,
              },
              {
                duration: 44,
                percent: .273,
              },
              {
                duration: 45,
                percent: .273,
              },
              {
                duration: 46,
                percent: .273,
              },
              {
                duration: 47,
                percent: .273,
              },
              {
                duration: 48,
                percent: .273,
              },
              {
                duration: 49,
                percent: .273,
              },
              {
                duration: 50,
                percent: 86.623,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                percent: 0.273,
              },
              {
                duration: 2,
                percent: .273,
              },
              {
                duration: 3,
                percent: .273,
              },
              {
                duration: 4,
                percent: .273,
              },
              {
                duration: 5,
                percent: .273,
              },
              {
                duration: 6,
                percent: .273,
              },
              {
                duration: 7,
                percent: .273,
              },
              {
                duration: 8,
                percent: .273,
              },
              {
                duration: 9,
                percent: .273,
              },
              {
                duration: 10,
                percent: .273,
              },
              {
                duration: 11,
                percent: .273,
              },
              {
                duration: 12,
                percent: .273,
              },
              {
                duration: 13,
                percent: .273,
              },
              {
                duration: 14,
                percent: .273,
              },
              {
                duration: 15,
                percent: .273,
              },
              {
                duration: 16,
                percent: .273,
              },
              {
                duration: 17,
                percent: .273,
              },
              {
                duration: 18,
                percent: .273,
              },
              {
                duration: 19,
                percent: .273,
              },
              {
                duration: 20,
                percent: .273,
              },
              {
                duration: 21,
                percent: .273,
              },
              {
                duration: 22,
                percent: .273,
              },
              {
                duration: 23,
                percent: .273,
              },
              {
                duration: 24,
                percent: .273,
              },
              {
                duration: 25,
                percent: .273,
              },
              {
                duration: 26,
                percent: .273,
              },
              {
                duration: 27,
                percent: .273,
              },
              {
                duration: 28,
                percent: .273,
              },
              {
                duration: 29,
                percent: .273,
              },
              {
                duration: 30,
                percent: .273,
              },
              {
                duration: 31,
                percent: .273,
              },
              {
                duration: 32,
                percent: .273,
              },
              {
                duration: 33,
                percent: .273,
              },
              {
                duration: 34,
                percent: .273,
              },
              {
                duration: 35,
                percent: .273,
              },
              {
                duration: 36,
                percent: .273,
              },
              {
                duration: 37,
                percent: .273,
              },
              {
                duration: 38,
                percent: .273,
              },
              {
                duration: 39,
                percent: .273,
              },
              {
                duration: 40,
                percent: .273,
              },
              {
                duration: 41,
                percent: .273,
              },
              {
                duration: 42,
                percent: .273,
              },
              {
                duration: 43,
                percent: .273,
              },
              {
                duration: 44,
                percent: .273,
              },
              {
                duration: 45,
                percent: .273,
              },
              {
                duration: 46,
                percent: .273,
              },
              {
                duration: 47,
                percent: .273,
              },
              {
                duration: 48,
                percent: .273,
              },
              {
                duration: 49,
                percent: .273,
              },
              {
                duration: 50,
                percent: 86.623,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                percent: 0.273,
              },
              {
                duration: 2,
                percent: .273,
              },
              {
                duration: 3,
                percent: .273,
              },
              {
                duration: 4,
                percent: .273,
              },
              {
                duration: 5,
                percent: .273,
              },
              {
                duration: 6,
                percent: .273,
              },
              {
                duration: 7,
                percent: .273,
              },
              {
                duration: 8,
                percent: .273,
              },
              {
                duration: 9,
                percent: .273,
              },
              {
                duration: 10,
                percent: .273,
              },
              {
                duration: 11,
                percent: .273,
              },
              {
                duration: 12,
                percent: .273,
              },
              {
                duration: 13,
                percent: .273,
              },
              {
                duration: 14,
                percent: .273,
              },
              {
                duration: 15,
                percent: .273,
              },
              {
                duration: 16,
                percent: .273,
              },
              {
                duration: 17,
                percent: .273,
              },
              {
                duration: 18,
                percent: .273,
              },
              {
                duration: 19,
                percent: .273,
              },
              {
                duration: 20,
                percent: .273,
              },
              {
                duration: 21,
                percent: .273,
              },
              {
                duration: 22,
                percent: .273,
              },
              {
                duration: 23,
                percent: .273,
              },
              {
                duration: 24,
                percent: .273,
              },
              {
                duration: 25,
                percent: .273,
              },
              {
                duration: 26,
                percent: .273,
              },
              {
                duration: 27,
                percent: .273,
              },
              {
                duration: 28,
                percent: .273,
              },
              {
                duration: 29,
                percent: .273,
              },
              {
                duration: 30,
                percent: .273,
              },
              {
                duration: 31,
                percent: .273,
              },
              {
                duration: 32,
                percent: .273,
              },
              {
                duration: 33,
                percent: .273,
              },
              {
                duration: 34,
                percent: .273,
              },
              {
                duration: 35,
                percent: .273,
              },
              {
                duration: 36,
                percent: .273,
              },
              {
                duration: 37,
                percent: .273,
              },
              {
                duration: 38,
                percent: .273,
              },
              {
                duration: 39,
                percent: .273,
              },
              {
                duration: 40,
                percent: .273,
              },
              {
                duration: 41,
                percent: .273,
              },
              {
                duration: 42,
                percent: .273,
              },
              {
                duration: 43,
                percent: .273,
              },
              {
                duration: 44,
                percent: .273,
              },
              {
                duration: 45,
                percent: .273,
              },
              {
                duration: 46,
                percent: .273,
              },
              {
                duration: 47,
                percent: .273,
              },
              {
                duration: 48,
                percent: .273,
              },
              {
                duration: 49,
                percent: .273,
              },
              {
                duration: 50,
                percent: 86.623,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                percent: 0.273,
              },
              {
                duration: 2,
                percent: .273,
              },
              {
                duration: 3,
                percent: .273,
              },
              {
                duration: 4,
                percent: .273,
              },
              {
                duration: 5,
                percent: .273,
              },
              {
                duration: 6,
                percent: .273,
              },
              {
                duration: 7,
                percent: .273,
              },
              {
                duration: 8,
                percent: .273,
              },
              {
                duration: 9,
                percent: .273,
              },
              {
                duration: 10,
                percent: .273,
              },
              {
                duration: 11,
                percent: .273,
              },
              {
                duration: 12,
                percent: .273,
              },
              {
                duration: 13,
                percent: .273,
              },
              {
                duration: 14,
                percent: .273,
              },
              {
                duration: 15,
                percent: .273,
              },
              {
                duration: 16,
                percent: .273,
              },
              {
                duration: 17,
                percent: .273,
              },
              {
                duration: 18,
                percent: .273,
              },
              {
                duration: 19,
                percent: .273,
              },
              {
                duration: 20,
                percent: .273,
              },
              {
                duration: 21,
                percent: .273,
              },
              {
                duration: 22,
                percent: .273,
              },
              {
                duration: 23,
                percent: .273,
              },
              {
                duration: 24,
                percent: .273,
              },
              {
                duration: 25,
                percent: .273,
              },
              {
                duration: 26,
                percent: .273,
              },
              {
                duration: 27,
                percent: .273,
              },
              {
                duration: 28,
                percent: .273,
              },
              {
                duration: 29,
                percent: .273,
              },
              {
                duration: 30,
                percent: .273,
              },
              {
                duration: 31,
                percent: .273,
              },
              {
                duration: 32,
                percent: .273,
              },
              {
                duration: 33,
                percent: .273,
              },
              {
                duration: 34,
                percent: .273,
              },
              {
                duration: 35,
                percent: .273,
              },
              {
                duration: 36,
                percent: .273,
              },
              {
                duration: 37,
                percent: .273,
              },
              {
                duration: 38,
                percent: .273,
              },
              {
                duration: 39,
                percent: .273,
              },
              {
                duration: 40,
                percent: .273,
              },
              {
                duration: 41,
                percent: .273,
              },
              {
                duration: 42,
                percent: .273,
              },
              {
                duration: 43,
                percent: .273,
              },
              {
                duration: 44,
                percent: .273,
              },
              {
                duration: 45,
                percent: .273,
              },
              {
                duration: 46,
                percent: .273,
              },
              {
                duration: 47,
                percent: .273,
              },
              {
                duration: 48,
                percent: .273,
              },
              {
                duration: 49,
                percent: .273,
              },
              {
                duration: 50,
                percent: 86.623,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                percent: 0.273,
              },
              {
                duration: 2,
                percent: .273,
              },
              {
                duration: 3,
                percent: .273,
              },
              {
                duration: 4,
                percent: .273,
              },
              {
                duration: 5,
                percent: .273,
              },
              {
                duration: 6,
                percent: .273,
              },
              {
                duration: 7,
                percent: .273,
              },
              {
                duration: 8,
                percent: .273,
              },
              {
                duration: 9,
                percent: .273,
              },
              {
                duration: 10,
                percent: .273,
              },
              {
                duration: 11,
                percent: .273,
              },
              {
                duration: 12,
                percent: .273,
              },
              {
                duration: 13,
                percent: .273,
              },
              {
                duration: 14,
                percent: .273,
              },
              {
                duration: 15,
                percent: .273,
              },
              {
                duration: 16,
                percent: .273,
              },
              {
                duration: 17,
                percent: .273,
              },
              {
                duration: 18,
                percent: .273,
              },
              {
                duration: 19,
                percent: .273,
              },
              {
                duration: 20,
                percent: .273,
              },
              {
                duration: 21,
                percent: .273,
              },
              {
                duration: 22,
                percent: .273,
              },
              {
                duration: 23,
                percent: .273,
              },
              {
                duration: 24,
                percent: .273,
              },
              {
                duration: 25,
                percent: .273,
              },
              {
                duration: 26,
                percent: .273,
              },
              {
                duration: 27,
                percent: .273,
              },
              {
                duration: 28,
                percent: .273,
              },
              {
                duration: 29,
                percent: .273,
              },
              {
                duration: 30,
                percent: .273,
              },
              {
                duration: 31,
                percent: .273,
              },
              {
                duration: 32,
                percent: .273,
              },
              {
                duration: 33,
                percent: .273,
              },
              {
                duration: 34,
                percent: .273,
              },
              {
                duration: 35,
                percent: .273,
              },
              {
                duration: 36,
                percent: .273,
              },
              {
                duration: 37,
                percent: .273,
              },
              {
                duration: 38,
                percent: .273,
              },
              {
                duration: 39,
                percent: .273,
              },
              {
                duration: 40,
                percent: .273,
              },
              {
                duration: 41,
                percent: .273,
              },
              {
                duration: 42,
                percent: .273,
              },
              {
                duration: 43,
                percent: .273,
              },
              {
                duration: 44,
                percent: .273,
              },
              {
                duration: 45,
                percent: .273,
              },
              {
                duration: 46,
                percent: .273,
              },
              {
                duration: 47,
                percent: .273,
              },
              {
                duration: 48,
                percent: .273,
              },
              {
                duration: 49,
                percent: .273,
              },
              {
                duration: 50,
                percent: 86.623,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                percent: 0.273,
              },
              {
                duration: 2,
                percent: .273,
              },
              {
                duration: 3,
                percent: .273,
              },
              {
                duration: 4,
                percent: .273,
              },
              {
                duration: 5,
                percent: .273,
              },
              {
                duration: 6,
                percent: .273,
              },
              {
                duration: 7,
                percent: .273,
              },
              {
                duration: 8,
                percent: .273,
              },
              {
                duration: 9,
                percent: .273,
              },
              {
                duration: 10,
                percent: .273,
              },
              {
                duration: 11,
                percent: .273,
              },
              {
                duration: 12,
                percent: .273,
              },
              {
                duration: 13,
                percent: .273,
              },
              {
                duration: 14,
                percent: .273,
              },
              {
                duration: 15,
                percent: .273,
              },
              {
                duration: 16,
                percent: .273,
              },
              {
                duration: 17,
                percent: .273,
              },
              {
                duration: 18,
                percent: .273,
              },
              {
                duration: 19,
                percent: .273,
              },
              {
                duration: 20,
                percent: .273,
              },
              {
                duration: 21,
                percent: .273,
              },
              {
                duration: 22,
                percent: .273,
              },
              {
                duration: 23,
                percent: .273,
              },
              {
                duration: 24,
                percent: .273,
              },
              {
                duration: 25,
                percent: .273,
              },
              {
                duration: 26,
                percent: .273,
              },
              {
                duration: 27,
                percent: .273,
              },
              {
                duration: 28,
                percent: .273,
              },
              {
                duration: 29,
                percent: .273,
              },
              {
                duration: 30,
                percent: .273,
              },
              {
                duration: 31,
                percent: .273,
              },
              {
                duration: 32,
                percent: .273,
              },
              {
                duration: 33,
                percent: .273,
              },
              {
                duration: 34,
                percent: .273,
              },
              {
                duration: 35,
                percent: .273,
              },
              {
                duration: 36,
                percent: .273,
              },
              {
                duration: 37,
                percent: .273,
              },
              {
                duration: 38,
                percent: .273,
              },
              {
                duration: 39,
                percent: .273,
              },
              {
                duration: 40,
                percent: .273,
              },
              {
                duration: 41,
                percent: .273,
              },
              {
                duration: 42,
                percent: .273,
              },
              {
                duration: 43,
                percent: .273,
              },
              {
                duration: 44,
                percent: .273,
              },
              {
                duration: 45,
                percent: .273,
              },
              {
                duration: 46,
                percent: .273,
              },
              {
                duration: 47,
                percent: .273,
              },
              {
                duration: 48,
                percent: .273,
              },
              {
                duration: 49,
                percent: .273,
              },
              {
                duration: 50,
                percent: 86.623,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                percent: 0.273,
              },
              {
                duration: 2,
                percent: .273,
              },
              {
                duration: 3,
                percent: .273,
              },
              {
                duration: 4,
                percent: .273,
              },
              {
                duration: 5,
                percent: .273,
              },
              {
                duration: 6,
                percent: .273,
              },
              {
                duration: 7,
                percent: .273,
              },
              {
                duration: 8,
                percent: .273,
              },
              {
                duration: 9,
                percent: .273,
              },
              {
                duration: 10,
                percent: .273,
              },
              {
                duration: 11,
                percent: .273,
              },
              {
                duration: 12,
                percent: .273,
              },
              {
                duration: 13,
                percent: .273,
              },
              {
                duration: 14,
                percent: .273,
              },
              {
                duration: 15,
                percent: .273,
              },
              {
                duration: 16,
                percent: .273,
              },
              {
                duration: 17,
                percent: .273,
              },
              {
                duration: 18,
                percent: .273,
              },
              {
                duration: 19,
                percent: .273,
              },
              {
                duration: 20,
                percent: .273,
              },
              {
                duration: 21,
                percent: .273,
              },
              {
                duration: 22,
                percent: .273,
              },
              {
                duration: 23,
                percent: .273,
              },
              {
                duration: 24,
                percent: .273,
              },
              {
                duration: 25,
                percent: .273,
              },
              {
                duration: 26,
                percent: .273,
              },
              {
                duration: 27,
                percent: .273,
              },
              {
                duration: 28,
                percent: .273,
              },
              {
                duration: 29,
                percent: .273,
              },
              {
                duration: 30,
                percent: .273,
              },
              {
                duration: 31,
                percent: .273,
              },
              {
                duration: 32,
                percent: .273,
              },
              {
                duration: 33,
                percent: .273,
              },
              {
                duration: 34,
                percent: .273,
              },
              {
                duration: 35,
                percent: .273,
              },
              {
                duration: 36,
                percent: .273,
              },
              {
                duration: 37,
                percent: .273,
              },
              {
                duration: 38,
                percent: .273,
              },
              {
                duration: 39,
                percent: .273,
              },
              {
                duration: 40,
                percent: .273,
              },
              {
                duration: 41,
                percent: .273,
              },
              {
                duration: 42,
                percent: .273,
              },
              {
                duration: 43,
                percent: .273,
              },
              {
                duration: 44,
                percent: .273,
              },
              {
                duration: 45,
                percent: .273,
              },
              {
                duration: 46,
                percent: .273,
              },
              {
                duration: 47,
                percent: .273,
              },
              {
                duration: 48,
                percent: .273,
              },
              {
                duration: 49,
                percent: .273,
              },
              {
                duration: 50,
                percent: 86.623,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                percent: 0.273,
              },
              {
                duration: 2,
                percent: .273,
              },
              {
                duration: 3,
                percent: .273,
              },
              {
                duration: 4,
                percent: .273,
              },
              {
                duration: 5,
                percent: .273,
              },
              {
                duration: 6,
                percent: .273,
              },
              {
                duration: 7,
                percent: .273,
              },
              {
                duration: 8,
                percent: .273,
              },
              {
                duration: 9,
                percent: .273,
              },
              {
                duration: 10,
                percent: .273,
              },
              {
                duration: 11,
                percent: .273,
              },
              {
                duration: 12,
                percent: .273,
              },
              {
                duration: 13,
                percent: .273,
              },
              {
                duration: 14,
                percent: .273,
              },
              {
                duration: 15,
                percent: .273,
              },
              {
                duration: 16,
                percent: .273,
              },
              {
                duration: 17,
                percent: .273,
              },
              {
                duration: 18,
                percent: .273,
              },
              {
                duration: 19,
                percent: .273,
              },
              {
                duration: 20,
                percent: .273,
              },
              {
                duration: 21,
                percent: .273,
              },
              {
                duration: 22,
                percent: .273,
              },
              {
                duration: 23,
                percent: .273,
              },
              {
                duration: 24,
                percent: .273,
              },
              {
                duration: 25,
                percent: .273,
              },
              {
                duration: 26,
                percent: .273,
              },
              {
                duration: 27,
                percent: .273,
              },
              {
                duration: 28,
                percent: .273,
              },
              {
                duration: 29,
                percent: .273,
              },
              {
                duration: 30,
                percent: .273,
              },
              {
                duration: 31,
                percent: .273,
              },
              {
                duration: 32,
                percent: .273,
              },
              {
                duration: 33,
                percent: .273,
              },
              {
                duration: 34,
                percent: .273,
              },
              {
                duration: 35,
                percent: .273,
              },
              {
                duration: 36,
                percent: .273,
              },
              {
                duration: 37,
                percent: .273,
              },
              {
                duration: 38,
                percent: .273,
              },
              {
                duration: 39,
                percent: .273,
              },
              {
                duration: 40,
                percent: .273,
              },
              {
                duration: 41,
                percent: .273,
              },
              {
                duration: 42,
                percent: .273,
              },
              {
                duration: 43,
                percent: .273,
              },
              {
                duration: 44,
                percent: .273,
              },
              {
                duration: 45,
                percent: .273,
              },
              {
                duration: 46,
                percent: .273,
              },
              {
                duration: 47,
                percent: .273,
              },
              {
                duration: 48,
                percent: .273,
              },
              {
                duration: 49,
                percent: .273,
              },
              {
                duration: 50,
                percent: 86.623,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })

  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                percent: 0.273,
              },
              {
                duration: 2,
                percent: .273,
              },
              {
                duration: 3,
                percent: .273,
              },
              {
                duration: 4,
                percent: .273,
              },
              {
                duration: 5,
                percent: .273,
              },
              {
                duration: 6,
                percent: .273,
              },
              {
                duration: 7,
                percent: .273,
              },
              {
                duration: 8,
                percent: .273,
              },
              {
                duration: 9,
                percent: .273,
              },
              {
                duration: 10,
                percent: .273,
              },
              {
                duration: 11,
                percent: .273,
              },
              {
                duration: 12,
                percent: .273,
              },
              {
                duration: 13,
                percent: .273,
              },
              {
                duration: 14,
                percent: .273,
              },
              {
                duration: 15,
                percent: .273,
              },
              {
                duration: 16,
                percent: .273,
              },
              {
                duration: 17,
                percent: .273,
              },
              {
                duration: 18,
                percent: .273,
              },
              {
                duration: 19,
                percent: .273,
              },
              {
                duration: 20,
                percent: .273,
              },
              {
                duration: 21,
                percent: .273,
              },
              {
                duration: 22,
                percent: .273,
              },
              {
                duration: 23,
                percent: .273,
              },
              {
                duration: 24,
                percent: .273,
              },
              {
                duration: 25,
                percent: .273,
              },
              {
                duration: 26,
                percent: .273,
              },
              {
                duration: 27,
                percent: .273,
              },
              {
                duration: 28,
                percent: .273,
              },
              {
                duration: 29,
                percent: .273,
              },
              {
                duration: 30,
                percent: .273,
              },
              {
                duration: 31,
                percent: .273,
              },
              {
                duration: 32,
                percent: .273,
              },
              {
                duration: 33,
                percent: .273,
              },
              {
                duration: 34,
                percent: .273,
              },
              {
                duration: 35,
                percent: .273,
              },
              {
                duration: 36,
                percent: .273,
              },
              {
                duration: 37,
                percent: .273,
              },
              {
                duration: 38,
                percent: .273,
              },
              {
                duration: 39,
                percent: .273,
              },
              {
                duration: 40,
                percent: .273,
              },
              {
                duration: 41,
                percent: .273,
              },
              {
                duration: 42,
                percent: .273,
              },
              {
                duration: 43,
                percent: .273,
              },
              {
                duration: 44,
                percent: .273,
              },
              {
                duration: 45,
                percent: .273,
              },
              {
                duration: 46,
                percent: .273,
              },
              {
                duration: 47,
                percent: .273,
              },
              {
                duration: 48,
                percent: .273,
              },
              {
                duration: 49,
                percent: .273,
              },
              {
                duration: 50,
                percent: 86.623,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                percent: 0.273,
              },
              {
                duration: 2,
                percent: .273,
              },
              {
                duration: 3,
                percent: .273,
              },
              {
                duration: 4,
                percent: .273,
              },
              {
                duration: 5,
                percent: .273,
              },
              {
                duration: 6,
                percent: .273,
              },
              {
                duration: 7,
                percent: .273,
              },
              {
                duration: 8,
                percent: .273,
              },
              {
                duration: 9,
                percent: .273,
              },
              {
                duration: 10,
                percent: .273,
              },
              {
                duration: 11,
                percent: .273,
              },
              {
                duration: 12,
                percent: .273,
              },
              {
                duration: 13,
                percent: .273,
              },
              {
                duration: 14,
                percent: .273,
              },
              {
                duration: 15,
                percent: .273,
              },
              {
                duration: 16,
                percent: .273,
              },
              {
                duration: 17,
                percent: .273,
              },
              {
                duration: 18,
                percent: .273,
              },
              {
                duration: 19,
                percent: .273,
              },
              {
                duration: 20,
                percent: .273,
              },
              {
                duration: 21,
                percent: .273,
              },
              {
                duration: 22,
                percent: .273,
              },
              {
                duration: 23,
                percent: .273,
              },
              {
                duration: 24,
                percent: .273,
              },
              {
                duration: 25,
                percent: .273,
              },
              {
                duration: 26,
                percent: .273,
              },
              {
                duration: 27,
                percent: .273,
              },
              {
                duration: 28,
                percent: .273,
              },
              {
                duration: 29,
                percent: .273,
              },
              {
                duration: 30,
                percent: .273,
              },
              {
                duration: 31,
                percent: .273,
              },
              {
                duration: 32,
                percent: .273,
              },
              {
                duration: 33,
                percent: .273,
              },
              {
                duration: 34,
                percent: .273,
              },
              {
                duration: 35,
                percent: .273,
              },
              {
                duration: 36,
                percent: .273,
              },
              {
                duration: 37,
                percent: .273,
              },
              {
                duration: 38,
                percent: .273,
              },
              {
                duration: 39,
                percent: .273,
              },
              {
                duration: 40,
                percent: .273,
              },
              {
                duration: 41,
                percent: .273,
              },
              {
                duration: 42,
                percent: .273,
              },
              {
                duration: 43,
                percent: .273,
              },
              {
                duration: 44,
                percent: .273,
              },
              {
                duration: 45,
                percent: .273,
              },
              {
                duration: 46,
                percent: .273,
              },
              {
                duration: 47,
                percent: .273,
              },
              {
                duration: 48,
                percent: .273,
              },
              {
                duration: 49,
                percent: .273,
              },
              {
                duration: 50,
                percent: 86.623,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })

  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general incentivised grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another incentivised granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 15552000,
                percent: 100,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')

          console.log(" max test incentivised iteration: ", step)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  */
})




/*
   THIS manual test will verify the system is handling the edge case of approaching the max FIO to grant for incentives
   IT is a manual test.
  this test is a one time test, setup the startup as indicated below and start the chain
  then do this test.

  TO setup the chain startup we issue 21M to 2 well known accounts in the dev env.
  we set up these 2 accounts in the chain genesis, so that they each have 21M FIO.

  go to fio.devtools/scripts/launch/08_token_issue.sh.
  modify the 2 commands for the accounts below so that they match below (change tokens to issue to 21M tokens for these 2 accounts).
  ./clio -u http://localhost:8879 push action -j fio.token issue '["htjonrkf1lgs","21000000.000000000 FIO","memo"]' -p eosio@active
  ./clio -u http://localhost:8879 push action -j fio.token issue '["euwdcp13zlrj","21000000.000000000 FIO","memo"]' -p eosio@active
  restart the chain.


  1) get a key to use  ../fio/build/bin/clio -u http://localhost:8889 create key --to-console
  Note the public key and account name (this is called account1 by these instructions)
  2) get another key to use.
  Note the public key and account, these are called account2 by these instructions.

  now we will stake 20M of the tokens into account1 at 90% incentive.

  ../fio/build/bin/clio -u http://localhost:8889 push action fio.token trnsloctoks '{"payee_public_key":"ACCOUNT2PUBLICKEY","can_vote":1,"periods":[{"duration": 94608000,"percent": 100.0}],"amount":20000000000000000,"max_fee":400000000000,"actor":htjonrkf1lgs,"tpid":""}' --permission htjonrkf1lgs

  this command should succeed.
  next we will verify the incentivised grant amount, and total incentivised tokens used by the protocol.

  verify the total incentive tokens, should be 18M
  ../fio/build/bin/clio -u http://localhost:8889 get table eosio eosio global4

  next verify the amount in account1
  ../fio/build/bin/clio -u http://localhost:8889 get currency balance fio.token ACCOUNT1ACCOUNT

  the result should be 38M tokens

  next we will stake the same amount in aacount2, the result should be that the incentive is
  computed at 2M tokens

  lock the tokens
  ../fio/build/bin/clio -u http://localhost:8889 push action fio.token trnsloctoks '{"payee_public_key":"ACCOUNT2PUBLICKEY","can_vote":1,"periods":[{"duration": 94608000,"percent": 100.0}],"amount":20000000000000000,"max_fee":400000000000,"actor":euwdcp13zlrj,"tpid":""}' --permission euwdcp13zlrj

  note that the 20M threshold of incentive tokens has been reached
  ../fio/build/bin/clio -u http://localhost:8889 get table eosio eosio global4
  the result should be 20M total granted.

  note the amount in the account2 is given 2M in incentives.(Because we reached max incentives)
  ../fio/build/bin/clio -u http://localhost:8889 get currency balance fio.token ACCOUNT2ACCOUNT
  the result should be 22M

  EXTRA CREDIT,
  generate one more set of keys.
  lock 1M FIO from the first account holding 21M be sure to specify one period, and incentivized duration.
  note that no incentives are granted (because we already reached the max.
  YOU can also run the lock tests and note the staking tests fail (because no incentives are given).



  FIRST 21M holding account!

  ACCOUNT htjonrkf1lgs    -- adam.dapix
  OWNER KEYS
  PUBLIC FIO7uRvrLVrZCbCM2DtCgUMospqUMnP3JUC1sKHA8zNoF835kJBvN
  PRIVATE 5JCpqkvsrCzrAC3YWhx7pnLodr3Wr9dNMULYU8yoUrPRzu269Xz

  SECOND 21M holding account!!

  ACCOUNT euwdcp13zlrj
  OWNER KEYS
  PUBLIC FIO8NToQB65dZHv28RXSBBiyMCp55M7FRFw6wf4G3GeRt1VsiknrB
  PRIVATE 5HvaoRV9QrbbxhLh6zZHqTzesFEG5vusVJGbUazFi5xQvKMMt6U
  */


