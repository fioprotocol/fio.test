require('mocha')
const {expect} = require('chai')
const {newUser, getProdVoteTotal, fetchJson, generateFioDomain, getTotalVotedFio,getAccountVoteWeight, callFioApi,  generateFioAddress, createKeypair, getTestType, timeout} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk');
const config = require('../config.js');
const testType = getTestType();

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
})

let userA1, userA2, userA3, userA4, keys, keys1, keys2, keys3,keys4, locksdk,
    locksdk1, locksdk2, locksdk3,locksdk4, newFioAddress, newFioDomain, newFioDomain2, newFioAddress2,
    total_bp_votes_before, total_bp_votes_after,total_voted_fio,balancebefore
const fundsAmount = 500000000000
const maxTestFundsAmount = 5000000000
const halfundsAmount = 220000000000

describe(`************************** locks-transfer-locked-tokens.js ************************** \n    A. Create accounts for tests`, () => {


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
    keys4 = await createKeypair();
    locksdk4 = new FIOSDK(keys4.privateKey, keys4.publicKey, config.BASE_URL, fetchJson);
  })

  /*
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
  */
})

describe(`B. Parameter tests`, () => {

  it(`(${testType}) Failure test, Transfer locked tokens,  periods total not equal to amount`, async () => {
    if (testType == 'sdk') {
      try {
        const result = await userA1.sdk.genericAction('transferLockedTokens', {
          payeePublicKey: keys.publicKey,
          canVote: 0,
          periods: [
            {
              duration: 120,
              amount: 220000000000,
            },
            {
              duration: 240,
              amount: 280000000000,
            }
          ],
          amount: 600000000000,
          maxFee: 400000000000,
          tpid: '',

        })
        expect(result.status).to.not.equal('OK')
      } catch (err) {
        //console.log('error: ', err)
        var expected = `Error 400`
        expect(err.message).to.include(expected)
      }
    } else {  
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
                amount: 220000000000,
              },
              {
                duration: 240,
                amount: 280000000000,
              }
            ],
            amount: 600000000000,
            max_fee: 400000000000,
            tpid: '',
            actor: userA1.account,
          }
        })
        expect(result.status).to.not.equal('OK')
      } catch (err) {
        //console.log(JSON.stringify(err, null, 4));
        expect(err.json.fields[0].error).to.equal(config.error2.invalidUnlockPeriodTotal.message);
        expect(err.code).to.equal(config.error2.invalidUnlockPeriodTotal.statusCode);
      }
    }
  })

  it(`(${testType}) Failure test, Transfer locked tokens, periods are not in ascending order of duration`, async () => {

    if (testType == 'sdk') {
      try {
        const result = await userA1.sdk.genericAction('transferLockedTokens', {
          payeePublicKey: keys.publicKey,
          canVote: 0,
          periods: [
            {
              duration: 240,
              amount: 220000000000,
            },
            {
              duration: 120,
              amount: 280000000000,
            }
          ],
          amount: fundsAmount,
          maxFee: 400000000000,
          tpid: '',

        })
        expect(result.status).to.not.equal('OK')
      } catch (err) {
       // console.log('error: ', err)
        var expected = `Error 400`
        expect(err.message).to.include(expected)
      }
    } else {
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
                amount: 220000000000,
              },
              {
                duration: 120,
                amount: 280000000000,
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
        //console.log(JSON.stringify(err, null, 4));
        expect(err.json.fields[0].error).to.equal(config.error2.invalidUnlockPeriodSorted.message);
        expect(err.code).to.equal(config.error2.invalidUnlockPeriodSorted.statusCode);
      }
    }
  })

  it(`(${testType}) Failure test, Transfer locked tokens, duration 0`, async () => {
    if (testType == 'sdk') {
      try {
        const result = await userA1.sdk.genericAction('transferLockedTokens', {
          payeePublicKey: keys.publicKey,
          canVote: 0,
          periods: [
            {
              duration: 0,
              amount: 220000000000,
            },
            {
              duration: 120,
              amount: 280000000000,
            }
          ],
          amount: fundsAmount,
          maxFee: 400000000000,
          tpid: '',

        })
        expect(result.status).to.not.equal('OK')
      } catch (err) {
        //console.log('error: ', err)
        var expected = `Error 400`
        expect(err.message).to.include(expected)
      }
    } else {
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
                amount: 220000000000,
              },
              {
                duration: 120,
                amount: 280000000000,
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
        //console.log(JSON.stringify(err, null, 4));
        expect(err.json.fields[0].error).to.equal(config.error2.invalidUnlockPeriodDuration.message);
        expect(err.code).to.equal(config.error2.invalidUnlockPeriodDuration.statusCode);
      }
    }
  })

  it(`(${testType}) success test,  50 lock periods`, async () => {
    if (testType == 'sdk') {
      try {
        const result = await userA4.sdk.genericAction('transferLockedTokens', {
          payeePublicKey: keys2.publicKey,
          canVote: 0,
          periods: [
            {
              duration: 1,
              amount: 1000000000,
            },
            {
              duration: 2,
              amount: 1000000000,
            },
            {
              duration: 3,
              amount: 1000000000,
            },
            {
              duration: 4,
              amount: 1000000000,
            },
            {
              duration: 5,
              amount: 1000000000,
            },
            {
              duration: 6,
              amount: 1000000000,
            },
            {
              duration: 7,
              amount: 1000000000,
            },
            {
              duration: 8,
              amount: 1000000000,
            },
            {
              duration: 9,
              amount: 1000000000,
            },
            {
              duration: 10,
              amount: 1000000000,
            },
            {
              duration: 11,
              amount: 1000000000,
            },
            {
              duration: 12,
              amount: 1000000000,
            },
            {
              duration: 13,
              amount: 1000000000,
            },
            {
              duration: 14,
              amount: 1000000000,
            },
            {
              duration: 15,
              amount: 1000000000,
            },
            {
              duration: 16,
              amount: 1000000000,
            },
            {
              duration: 17,
              amount: 1000000000,
            },
            {
              duration: 18,
              amount: 1000000000,
            },
            {
              duration: 19,
              amount: 1000000000,
            },
            {
              duration: 20,
              amount: 1000000000,
            },
            {
              duration: 21,
              amount: 1000000000,
            },
            {
              duration: 22,
              amount: 1000000000,
            },
            {
              duration: 23,
              amount: 1000000000,
            },
            {
              duration: 24,
              amount: 1000000000,
            },
            {
              duration: 25,
              amount: 1000000000,
            },
            {
              duration: 26,
              amount: 1000000000,
            },
            {
              duration: 27,
              amount: 1000000000,
            },
            {
              duration: 28,
              amount: 1000000000,
            },
            {
              duration: 29,
              amount: 1000000000,
            },
            {
              duration: 30,
              amount: 1000000000,
            },
            {
              duration: 31,
              amount: 1000000000,
            },
            {
              duration: 32,
              amount: 1000000000,
            },
            {
              duration: 33,
              amount: 1000000000,
            },
            {
              duration: 34,
              amount: 1000000000,
            },
            {
              duration: 35,
              amount: 1000000000,
            },
            {
              duration: 36,
              amount: 1000000000,
            },
            {
              duration: 37,
              amount: 1000000000,
            },
            {
              duration: 38,
              amount: 1000000000,
            },
            {
              duration: 39,
              amount: 1000000000,
            },
            {
              duration: 40,
              amount: 1000000000,
            },
            {
              duration: 41,
              amount: 1000000000,
            },
            {
              duration: 42,
              amount: 1000000000,
            },
            {
              duration: 43,
              amount: 1000000000,
            },
            {
              duration: 44,
              amount: 1000000000,
            },
            {
              duration: 45,
              amount: 1000000000,
            },
            {
              duration: 46,
              amount: 1000000000,
            },
            {
              duration: 47,
              amount: 1000000000,
            },
            {
              duration: 48,
              amount: 1000000000,
            },
            {
              duration: 49,
              amount: 1000000000,
            },
            {
              duration: 50,
              amount: 1000000000,
            }
          ],
          amount: 50000000000,
          maxFee: 400000000000,
          tpid: '',

        })
        expect(result.status).to.equal('OK')
      } catch (err) {
        //console.log('error: ', err)
        expect(err).to.equal(null);
      }
    } else {
        const result = await userA4.sdk.genericAction('pushTransaction', {
          action: 'trnsloctoks',
          account: 'fio.token',
          data: {
            payee_public_key: keys2.publicKey,
            can_vote: 0,
            periods: [
              {
                duration: 1,
                amount: 1000000000,
              },
              {
                duration: 2,
                amount: 1000000000,
              },
              {
                duration: 3,
                amount: 1000000000,
              },
              {
                duration: 4,
                amount: 1000000000,
              },
              {
                duration: 5,
                amount: 1000000000,
              },
              {
                duration: 6,
                amount: 1000000000,
              },
              {
                duration: 7,
                amount: 1000000000,
              },
              {
                duration: 8,
                amount: 1000000000,
              },
              {
                duration: 9,
                amount: 1000000000,
              },
              {
                duration: 10,
                amount: 1000000000,
              },
              {
                duration: 11,
                amount: 1000000000,
              },
              {
                duration: 12,
                amount: 1000000000,
              },
              {
                duration: 13,
                amount: 1000000000,
              },
              {
                duration: 14,
                amount: 1000000000,
              },
              {
                duration: 15,
                amount: 1000000000,
              },
              {
                duration: 16,
                amount: 1000000000,
              },
              {
                duration: 17,
                amount: 1000000000,
              },
              {
                duration: 18,
                amount: 1000000000,
              },
              {
                duration: 19,
                amount: 1000000000,
              },
              {
                duration: 20,
                amount: 1000000000,
              },
              {
                duration: 21,
                amount: 1000000000,
              },
              {
                duration: 22,
                amount: 1000000000,
              },
              {
                duration: 23,
                amount: 1000000000,
              },
              {
                duration: 24,
                amount: 1000000000,
              },
              {
                duration: 25,
                amount: 1000000000,
              },
              {
                duration: 26,
                amount: 1000000000,
              },
              {
                duration: 27,
                amount: 1000000000,
              },
              {
                duration: 28,
                amount: 1000000000,
              },
              {
                duration: 29,
                amount: 1000000000,
              },
              {
                duration: 30,
                amount: 1000000000,
              },
              {
                duration: 31,
                amount: 1000000000,
              },
              {
                duration: 32,
                amount: 1000000000,
              },
              {
                duration: 33,
                amount: 1000000000,
              },
              {
                duration: 34,
                amount: 1000000000,
              },
              {
                duration: 35,
                amount: 1000000000,
              },
              {
                duration: 36,
                amount: 1000000000,
              },
              {
                duration: 37,
                amount: 1000000000,
              },
              {
                duration: 38,
                amount: 1000000000,
              },
              {
                duration: 39,
                amount: 1000000000,
              },
              {
                duration: 40,
                amount: 1000000000,
              },
              {
                duration: 41,
                amount: 1000000000,
              },
              {
                duration: 42,
                amount: 1000000000,
              },
              {
                duration: 43,
                amount: 1000000000,
              },
              {
                duration: 44,
                amount: 1000000000,
              },
              {
                duration: 45,
                amount: 1000000000,
              },
              {
                duration: 46,
                amount: 1000000000,
              },
              {
                duration: 47,
                amount: 1000000000,
              },
              {
                duration: 48,
                amount: 1000000000,
              },
              {
                duration: 49,
                amount: 1000000000,
              },
              {
                duration: 50,
                amount: 1000000000,
              }
            ],
            amount: 50000000000,
            max_fee: 400000000000,
            tpid: '',
            actor: userA4.account,
          }

        })
        //console.log(result);
        expect(result.status).to.equal('OK')
    }
  })

})

describe(`C. transfer with 2 unlock periods, canvote = false`, () => {

  let rambefore, ramafter, balancebefore, balanceafter, feetransferlocked, domainFee, addressFee

  it(`Create users`, async () => {
    userA1 = await newUser(faucet);
    // userA2 = await newUser(faucet);
    userA3 = await newUser(faucet);
    // userA4 = await newUser(faucet);

    keys = await createKeypair();
    locksdk = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson);
    // keys1 = await createKeypair();
    // locksdk1 = new FIOSDK(keys1.privateKey, keys1.publicKey, config.BASE_URL, fetchJson);
    // keys2 = await createKeypair();
    // locksdk2 = new FIOSDK(keys2.privateKey, keys2.publicKey, config.BASE_URL, fetchJson);
    // keys3 = await createKeypair();
    // locksdk3 = new FIOSDK(keys3.privateKey, keys3.publicKey, config.BASE_URL, fetchJson);
    // keys4 = await createKeypair();
    // locksdk4 = new FIOSDK(keys4.privateKey, keys4.publicKey, config.BASE_URL, fetchJson);
  })

  it(`get account ram before `, async () => {
    try {
      let accountnm = await FIOSDK.accountHash(userA1.sdk.publicKey)
      const result = await userA1.sdk.genericAction('getAccount', {account:accountnm.accountnm})
      expect(result.ram_quota).to.be.a('number')
      rambefore = result.ram_quota
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`getFioBalance before `, async () => {
    const result = await userA1.sdk.genericAction('getFioBalance', {})

    expect(result).to.have.all.keys('balance','available','staked','srps','roe')
    balancebefore = result.balance;
  })

  it(`(${testType}) SUCCESS transferLockedTokens ${fundsAmount}, canvote true, (20,40 seconds) and (40,60%)`, async () => {
    if (testType == 'sdk') {
      try {
        const result = await userA1.sdk.genericAction('transferLockedTokens', {
          payeePublicKey: keys.publicKey,
          canVote: 0,
          periods: [
            {
              duration: 20,
              amount: 200000000000,
            },
            {
              duration: 40,
              amount: 300000000000,
            }
          ],
          amount: fundsAmount,
          maxFee: config.maxFee,
          tpid: '',

        })
        expect(result.status).to.equal('OK')
      } catch (err) {
        console.log(' Error', err);
        expect(err).to.equal(null);
      }
    } else {
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
                amount: 200000000000,
              },
              {
                duration: 40,
                amount: 300000000000,
              }
            ],
            amount: fundsAmount,
            max_fee: config.maxFee,
            tpid: '',
            actor: userA1.account,
          }

        })
        expect(result.status).to.equal('OK')
      } catch (err) {
        console.log(' Error', err);
        expect(err).to.equal(null);
      }
    }
  })

  it(`getFioBalance after, verify Fee transfer_locked_tokens was collected`, async () => {
    const result = await userA1.sdk.genericAction('getFioBalance', {})

    expect(result).to.have.all.keys('balance','available','staked','srps','roe')
    balanceafter = result.balance;
    const result1 = await userA1.sdk.genericAction('getFee', {
      endPoint: 'transfer_locked_tokens',
      fioAddress: ''
    })

    let diff1 = balancebefore - balanceafter - fundsAmount
    //console.log('Returned fee: ', result)
    expect(diff1).to.equal(result1.fee)

  })

  it(`Verify locks were set with get_locks`, async () => {
    try{
    const result = await locksdk.genericAction('getLocks', {fioPublicKey:keys.publicKey})

    expect(result).to.have.all.keys('lock_amount', 'remaining_lock_amount',
        'time_stamp','payouts_performed','can_vote','unlock_periods')

    expect(result.lock_amount).to.equal(500000000000)
    expect(result.can_vote).to.equal(0)
    expect(result.unlock_periods[0].amount).to.equal(200000000000)
    expect(result.unlock_periods[1].amount).to.equal(300000000000)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`verify get balance results for locked funds`, async () => {
    const result = await locksdk.genericAction('getFioBalance', {})

    expect(result).to.have.all.keys('balance','available','staked','srps','roe')
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
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      //console.log(err)
      expect(err.json.fields[0].error).to.equal('Funds locked');
      expect(err.code).to.equal(400);
    }
  })

  it(`get account ram after, verify RAM bump `, async () => {
    try {
      let accountnm = await FIOSDK.accountHash(userA1.sdk.publicKey)
      const result = await userA1.sdk.genericAction('getAccount', {account:accountnm.accountnm})
      expect(result.ram_quota).to.be.a('number')
      ramafter = result.ram_quota
      // fio.contracts: raminc = 1024 + (64 * periods.size());
      //hardcoded value ram bump for trnsloctoks
      const ramInc = 1200;
      let diffram = ramafter-rambefore
      expect(diffram).to.equal(ramInc)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Test Case: Check that we arent able to vote with this lock`, async () => { })

  it(`Transfer 1000 FIO into locked funds account`, async () => {
    try {
      const result = await userA3.sdk.genericAction('transferTokens', {
        payeeFioPublicKey: keys.publicKey,
        amount: 1000000000000,
        maxFee: config.maxFee,
        tpid: '',
      })
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Register domain for voting for locked funds account `, async () => {
    try {
      newFioDomain2 = generateFioDomain(15)
      const result = await locksdk.genericAction('registerFioDomain', {
        fioDomain: newFioDomain2,
        maxFee: config.maxFee,
        tpid: '',
      })
      //console.log('Result', result)
      domainFee = result.fee_collected
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Register address for voting for locked funds account`, async () => {
    try {
      newFioAddress2 = generateFioAddress(newFioDomain2,15)
      const result = await locksdk.genericAction('registerFioAddress', {
        fioAddress: newFioAddress2,
        maxFee: config.maxFee,
        tpid: '',
      })
      //console.log('Result', result)
      addressFee = result.fee_collected
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Get bp1@dapixdev total_votes before locked account votes`, async () => {
    try {
      total_bp_votes_before = await getProdVoteTotal('bp1@dapixdev');
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
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
      console.log('Error: ', err.json);
      expect(err).to.equal(null);
    }
  })

  it(`Get bp1@dapixdev total_votes after locked account votes, verify NO locked tokens voted.`, async () => {
    try {
      total_bp_votes_after = await getProdVoteTotal('bp1@dapixdev');
      let diff = total_bp_votes_after - total_bp_votes_before
      expect(diff).to.equal(1000000000000 - domainFee - addressFee)
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
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
              amount: 200000000000,
            },
            {
              duration: 40000,
              amount: 300000000000,
            }
          ],
          amount: fundsAmount,
          max_fee: config.maxFee,
          tpid: '',
          actor: userA1.account,
        }

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
   expect(result).to.have.any.keys('status');
   expect(result).to.have.any.keys('fee_collected');
   expect(result).to.have.any.keys('block_num');
   expect(result).to.have.any.keys('transaction_id');
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

  it(`Register domain:  succeeds (BD-2244)`, async () => {
    try {
    domsdk = new FIOSDK(transferdomainkey.privateKey, transferdomainkey.publicKey, config.BASE_URL, fetchJson);
    domsdk.domain2 = generateFioDomain(8)
    const result = await domsdk.genericAction('registerFioDomain', {
      fioDomain: domsdk.domain2,
      maxFee: config.api.register_fio_domain.fee ,
      technologyProviderId: ''
    })
    //console.log('Result: ', result)
    expect(result).to.have.any.keys('status');
    expect(result).to.have.any.keys('fee_collected');
    expect(result).to.have.any.keys('block_num');
    expect(result).to.have.any.keys('transaction_id');
    expect(result.status).to.equal('OK');
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
        maxFee: config.maxFee,
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


describe.skip(`FUTURE FEATURE (commented out) C. staking incentives, canvote = false`, () => {
/*
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
      } catch (err) {
        console.log(' Error', err)
      }
    })

    it(`Get balance for Payee, should have 1000`, async () => {
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

  describe(`FAILURE -- use account of previous test with 1000 fio, general locked grants cannot be used for fees.`, () => {
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
  */
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
              amount: 250000000000,
            },
            {
              duration: 40,
              amount: 250000000000,
            }
          ],
          amount: fundsAmount,
          max_fee: config.maxFee,
          tpid: '',
          actor: userA1.account,
        }

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
  })

  it(`Verify locks were set with get_locks`, async () => {
    try {
      const result = await userA1.sdk.genericAction('getLocks', { fioPublicKey: keys3.publicKey })

      expect(result).to.have.all.keys('lock_amount', 'remaining_lock_amount',
        'time_stamp', 'payouts_performed', 'can_vote', 'unlock_periods')

      expect(result.lock_amount).to.equal(500000000000)
      expect(result.can_vote).to.equal(1)
      expect(result.unlock_periods[0].amount).to.equal(250000000000)
      expect(result.unlock_periods[1].amount).to.equal(250000000000)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Transfer ${fundsAmount} FIO to locked account`, async () => {
    try {
      const result = await userA2.sdk.genericAction('transferTokens', {
        payeeFioPublicKey: keys3.publicKey,
        amount: 1000000000000,
        maxFee: config.maxFee,
        tpid: '',
      })
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
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
      console.log('Error', err);
      expect(err).to.equal(null);
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
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  //get total voted fio,
  it(`Get total_voted_fio before fioSdk votes`, async () => {
    try {
      total_voted_fio = await getTotalVotedFio();
      console.log('total_voted_fio:', total_voted_fio)
    }catch(err){
      console.log(err)
    }
  })
  //get the fio balance of the voting account.
  it(`getFioBalance after, verify Fee transfer_locked_tokens was collected`, async () => {
    const result = await locksdk3.genericAction('getFioBalance', {})
 console.log(result);
    expect(result).to.have.all.keys('balance','available','staked','srps','roe')
    balancebefore = result.balance;
  })



  it(`Get bp1@dapixdev total_votes before locked account votes`, async () => {
    try {
      total_bp_votes_before = await getProdVoteTotal('bp1@dapixdev');
      //console.log('bp1@dapixdev total_votes:', total_bp_votes)
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null);
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
      expect(err).to.equal(null);
    }
  })

  it(`Get bp1@dapixdev total_votes after locked account votes, verify all locked tokens voted.`, async () => {
    try {
      total_bp_votes_after = await getProdVoteTotal('bp1@dapixdev');
      let diff = total_bp_votes_after - total_bp_votes_before
      expect(diff).to.equal(660000000000)
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  })

  //get last vote weight of the voting account, should be total in the account.
  it(`Get B last_vote_weight`, async () => {
    try {
      let last_vote_weight = await getAccountVoteWeight(fiosdk3.account);
      expect(last_vote_weight).equal(balancebefore);
    } catch (err) {
      console.log('Error: ', err.json)
    }
  })


  //get the total_voted_fio after vote, diff should be balance of voting account.
  it(`Get total_voted_fio before fioSdk votes`, async () => {
    let prev_total_voted_fio = total_voted_fio;
    total_voted_fio = await getTotalVotedFio();
    console.log('total_voted_fio:', total_voted_fio)
    expect(total_voted_fio - prev_total_voted_fio).equal(balancebefore);
  })

})

describe(`E. Token unlocking tests`, () => {

  it(`Transfer ${fundsAmount} locked FIO using canvote false, 50 lock periods`, async () => {
      userA1 = await newUser(faucet);
      const result = await userA1.sdk.genericAction('pushTransaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        data: {
          payee_public_key: keys4.publicKey,
          can_vote: 0,
          periods: [
            {
              duration: 1,
              amount: 1000000000,
            },
            {
              duration: 2,
              amount: 1000000000,
            },
            {
              duration: 3,
              amount: 1000000000,
            },
            {
              duration: 4,
              amount: 1000000000,
            },
            {
              duration: 5,
              amount: 1000000000,
            },
            {
              duration: 6,
              amount: 1000000000,
            },
            {
              duration: 7,
              amount: 1000000000,
            },
            {
              duration: 8,
              amount: 1000000000,
            },
            {
              duration: 9,
              amount: 1000000000,
            },
            {
              duration: 10,
              amount: 1000000000,
            },
            {
              duration: 11,
              amount: 1000000000,
            },
            {
              duration: 12,
              amount: 1000000000,
            },
            {
              duration: 13,
              amount: 1000000000,
            },
            {
              duration: 14,
              amount: 1000000000,
            },
            {
              duration: 15,
              amount: 1000000000,
            },
            {
              duration: 16,
              amount: 1000000000,
            },
            {
              duration: 17,
              amount: 1000000000,
            },
            {
              duration: 18,
              amount: 1000000000,
            },
            {
              duration: 19,
              amount: 1000000000,
            },
            {
              duration: 20,
              amount: 1000000000,
            },
            {
              duration: 21,
              amount: 1000000000,
            },
            {
              duration: 22,
              amount: 1000000000,
            },
            {
              duration: 23,
              amount: 1000000000,
            },
            {
              duration: 24,
              amount: 1000000000,
            },
            {
              duration: 25,
              amount: 1000000000,
            },
            {
              duration: 26,
              amount: 1000000000,
            },
            {
              duration: 27,
              amount: 1000000000,
            },
            {
              duration: 28,
              amount: 1000000000,
            },
            {
              duration: 29,
              amount: 1000000000,
            },
            {
              duration: 30,
              amount: 1000000000,
            },
            {
              duration: 31,
              amount: 1000000000,
            },
            {
              duration: 32,
              amount: 1000000000,
            },
            {
              duration: 33,
              amount: 1000000000,
            },
            {
              duration: 34,
              amount: 1000000000,
            },
            {
              duration: 35,
              amount: 1000000000,
            },
            {
              duration: 36,
              amount: 1000000000,
            },
            {
              duration: 37,
              amount: 1000000000,
            },
            {
              duration: 38,
              amount: 1000000000,
            },
            {
              duration: 39,
              amount: 1000000000,
            },
            {
              duration: 40,
              amount: 1000000000,
            },
            {
              duration: 41,
              amount: 1000000000,
            },
            {
              duration: 42,
              amount: 1000000000,
            },
            {
              duration: 43,
              amount: 1000000000,
            },
            {
              duration: 44,
              amount: 1000000000,
            },
            {
              duration: 45,
              amount: 1000000000,
            },
            {
              duration: 46,
              amount: 1000000000,
            },
            {
              duration: 47,
              amount: 1000000000,
            },
            {
              duration: 48,
              amount: 1000000000,
            },
            {
              duration: 49,
              amount: 1000000000,
            },
            {
              duration: 50,
              amount: 1000000000,
            }
          ],
          amount: 50000000000,
          max_fee: config.maxFee,
          tpid: '',
          actor: userA1.account,
        }

      })
      expect(result.status).to.equal('OK')
      expect(result).to.have.any.keys('status');
      expect(result).to.have.any.keys('fee_collected');
      expect(result).to.have.any.keys('block_num');
      expect(result).to.have.any.keys('transaction_id');
  })


  it(`Waiting 20 seconds`, async () => {
    console.log("            waiting 20 seconds ")
  })

  it(`Wait 20 seconds.`, async () => { await timeout(20000) });

  //try to transfer whole amount, fail.
  it(`Transfer ${fundsAmount} Fail, fail to transfer entire amount`, async () => {
    try{
    const result = await locksdk4.genericAction('transferTokens', {
      payeeFioPublicKey: userA1.publicKey,
      amount: 49000000000,
      maxFee: config.maxFee,
      technologyProviderId: ''
    })
      expect(result.status).to.not.equal('OK')
  } catch (err) {
    //console.log(JSON.stringify(err, null, 4));
    expect(err.json.fields[0].error).to.equal('Funds locked');
    expect(err.code).to.equal(400);
  }
  })


  it(`Transfer 1 FIO to another account`, async () => {
    const result = await locksdk4.genericAction('transferTokens', {
      payeeFioPublicKey: userA1.publicKey,
      amount: 1000000000,
      maxFee: config.maxFee,
      technologyProviderId: ''
    })
    expect(result).to.have.any.keys('status');
    expect(result).to.have.any.keys('fee_collected');
    expect(result).to.have.any.keys('block_num');
    expect(result).to.have.any.keys('transaction_id');
  });

  it(`Waiting 20 seconds`, async () => {
    console.log("            waiting 20 seconds ")
  })

  it(`Wait 20 seconds.`, async () => { await timeout(20000) });


  it(`Transfer 30 FIO to another account`, async () => {
    const result = await locksdk4.genericAction('transferTokens', {
      payeeFioPublicKey: userA1.publicKey,
      amount: 30000000000,
      maxFee: config.maxFee,
      technologyProviderId: ''
    })
    expect(result).to.have.any.keys('status');
    expect(result).to.have.any.keys('fee_collected');
    expect(result).to.have.any.keys('block_num');
    expect(result).to.have.any.keys('transaction_id');
  });

  it(`Waiting 20 seconds`, async () => {
    console.log("            waiting 20 seconds ")
  })

  it(`Wait 20 seconds.`, async () => { await timeout(20000) });

  it(`Transfer 13 FIO to another account`, async () => {
    const result = await locksdk4.genericAction('transferTokens', {
      payeeFioPublicKey: userA1.publicKey,
      amount: 13000000000,
      maxFee: config.maxFee,
      technologyProviderId: ''
    })

    expect(result).to.have.any.keys('status');
    expect(result).to.have.any.keys('fee_collected');
    expect(result).to.have.any.keys('block_num');
    expect(result).to.have.any.keys('transaction_id');
  });

})


describe(`F. Test 50 (max number) lock periods`, () => {

  let lock1, lock2, totalAmount
  const maxPeriods = 50
  let periods = []
  const periodAmount = 10000000000  // 10 FIO

  it(`Create users`, async () => {
    keys1 = await createKeypair();
    lock1 = new FIOSDK(keys1.privateKey, keys1.publicKey, config.BASE_URL, fetchJson);
    //console.log('lock1.publickey: ', lock1.publicKey)

    keys2 = await createKeypair();
    lock2 = new FIOSDK(keys2.privateKey, keys2.publicKey, config.BASE_URL, fetchJson);
    //console.log('lock2.publickey: ', lock2.publicKey)
  })

  it(`Transfer locked FIO with ${maxPeriods} lock periods to lock1. Expect success.`, async () => {
    totalAmount = 0;
    periods = [];
    for (i = 1; i < maxPeriods; i++) {
      periods.push({ duration: i, amount: periodAmount},)
      totalAmount += periodAmount; 
    }
    periods.push({ duration: maxPeriods, amount: periodAmount })  // Final period without comma
    totalAmount += periodAmount;

    //console.log('totalAmount: ', totalAmount)
    //console.log('Periods: ', periods)

    try {
      const result = await faucet.genericAction('pushTransaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        data: {
          payee_public_key: lock1.publicKey,
          can_vote: 0,
          periods: periods,
          amount: totalAmount,
          max_fee: config.maxFee,
          tpid: '',
          actor: config.FAUCET_ACCOUNT,
        }
      })
      expect(result).to.have.any.keys('status');
      expect(result).to.have.any.keys('fee_collected');
      expect(result).to.have.any.keys('block_num');
      expect(result).to.have.any.keys('transaction_id');
      expect(result.status).to.equal('OK');
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null);
    }
  })

  it(`Transfer locked FIO with ${maxPeriods + 1} lock periods to lock2. Expect failure: 'Invalid number of unlock periods'`, async () => {
    totalAmount = 0;
    periods = [];
    for (i = 1; i < maxPeriods + 1; i++) {
      periods.push({ duration: i, amount: periodAmount },)
      totalAmount += periodAmount;
    }
    periods.push({ duration: maxPeriods + 1, amount: periodAmount })  // Final period without comma
    totalAmount += periodAmount;

    //console.log('totalAmount: ', totalAmount)
    //console.log('Periods: ', periods)

    try {
      const result = await faucet.genericAction('pushTransaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        data: {
          payee_public_key: lock2.publicKey,
          can_vote: 0,
          periods: periods,
          amount: totalAmount,
          max_fee: config.maxFee,
          tpid: '',
          actor: config.FAUCET_ACCOUNT,
        }
      })
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      //console.log('Error', err.json)
      expect(err.json.fields[0].error).to.equal('Invalid number of unlock periods')
    }
  })

})
