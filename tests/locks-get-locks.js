require('mocha');
const {expect} = require('chai');
const {newUser, getProdVoteTotal, fetchJson, generateFioDomain, callFioApi, getAccountFromKey, generateFioAddress, createKeypair, getTestType} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk');
const config = require('../config.js');
const testType = getTestType();
let faucet;

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
});

function wait(ms){
  var start = new Date().getTime();
  var end = start;
  while(end < start + ms) {
    end = new Date().getTime();
  }
}

describe(`************************** locks-get-locks.js ************************** \n    A. Get Locks Parameter error tests`, () => {
  let userA1, userA2, userA3, userA4, keys, keys1, keys2, keys3,keys4, locksdk,
    locksdk1, locksdk2, locksdk3,locksdk4, newFioAddress, newFioDomain, newFioDomain2, newFioAddress2,
    total_bp_votes_before, total_bp_votes_after
  const fundsAmount = 500000000000
  const maxTestFundsAmount = 5000000000
  const halfundsAmount = 220000000000

  before(async () => {
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
  });

  it(`(${testType}) Failure test, Bad pub key`, async () => {
    try {
      const result = await locksdk.genericAction('getLocks', {fioPublicKey: 'FIO1234'});
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.include("400");
      expect(err.json.type).to.include("invalid_input");
      expect(err.json.fields[0].name).to.include("fio_public_key");
      expect(err.json.fields[0].value).to.include("FIO1234");
      expect(err.json.fields[0].error).to.include("Invalid FIO Public Key");
    }
  });

  it(`(${testType}) Failure test, Empty pub key`, async () => {
    try {
      const result = await locksdk.genericAction('getLocks', {fioPublicKey: ''});
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.include("400");
      expect(err.json.type).to.include("invalid_input");
      expect(err.json.fields[0].name).to.include("fio_public_key");
      expect(err.json.fields[0].value).to.include("");
      expect(err.json.fields[0].error).to.include("Invalid FIO Public Key");
    }
  });

  it(`(${testType}) Failure test, too long pub key`, async () => {
    try {
      const result = await locksdk.genericAction('getLocks', {fioPublicKey: 'FIO7uRvrLVrZCbCM2DtCgUMospqUMnP3JUC1sKHA8zNoF835kJBvNa'});
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.include("400");
      expect(err.json.type).to.include("invalid_input");
      expect(err.json.fields[0].name).to.include("fio_public_key");
      expect(err.json.fields[0].value).to.include("FIO7uRvrLVrZCbCM2DtCgUMospqUMnP3JUC1sKHA8zNoF835kJBvNa");
      expect(err.json.fields[0].error).to.include("Invalid FIO Public Key");
    }
  });
});

describe(`B. Get locks success tests. `, () => {
  let userA1, userA2, userA3, userA4, keys, keys1, keys2, keys3,keys4, locksdk,
    locksdk1, locksdk2, locksdk3,locksdk4, newFioAddress, newFioDomain, newFioDomain2, newFioAddress2,
    total_bp_votes_before, total_bp_votes_after;
  const fundsAmount = 500000000000;
  const maxTestFundsAmount = 5000000000;
  const halfundsAmount = 220000000000;

  let rambefore, ramafter, balancebefore, balanceafter, feetransferlocked, domainFee, addressFee;

  before(async () => {
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
  });

  it(`(${testType}) SUCCESS transferLockedTokens ${fundsAmount}, canvote false, (20,40 seconds) and  (200000000000 FIO,300000000000 FIO)`, async () => {
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

        });
        expect(result.status).to.equal('OK');
        expect(result).to.have.all.keys('status', 'fee_collected');
      } catch (err) {
        console.log(' Error', err)
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

        });
        expect(result.status).to.equal('OK');
        expect(result).to.have.all.keys('status', 'fee_collected');
      } catch (err) {
        console.log(' Error', err)
      }
    }
  });
  it(`Verify locks were set with get_locks`, async () => {
    try{
      const result = await locksdk.genericAction('getLocks', {fioPublicKey:keys.publicKey});

      expect(result).to.have.all.keys('lock_amount', 'remaining_lock_amount',
          'time_stamp','payouts_performed','can_vote','unlock_periods');

      expect(result.lock_amount).to.equal(500000000000)
      expect(result.can_vote).to.equal(0)
      expect(result.unlock_periods[0].amount).to.equal(200000000000)
      expect(result.unlock_periods[0].duration).to.equal(20)
      expect(result.unlock_periods[1].amount).to.equal(300000000000)
      expect(result.unlock_periods[1].duration).to.equal(40)
    } catch (err) {
      console.log('Error', err)
    }
  });

  it(`(${testType}) SUCCESS transferLockedTokens ${fundsAmount}, canvote true, (30,60 seconds) and (200000000000 FIO,300000000000 FIO)`, async () => {
    if (testType == 'sdk') {

        const result = await userA1.sdk.genericAction('transferLockedTokens', {
          payeePublicKey: keys1.publicKey,
          canVote: 1,
          periods: [
            {
              duration: 30,
              amount: 200000000000,
            },
            {
              duration: 60,
              amount: 300000000000,
            }
          ],
          amount: fundsAmount,
          maxFee: config.maxFee,
          tpid: '',

        });
        expect(result.status).to.equal('OK');
        expect(result).to.have.all.keys('status', 'fee_collected');
    } else {
        const result = await userA1.sdk.genericAction('pushTransaction', {
          action: 'trnsloctoks',
          account: 'fio.token',
          data: {
            payee_public_key: keys1.publicKey,
            can_vote: 1,
            periods: [
              {
                duration: 30,
                amount: 200000000000,
              },
              {
                duration: 60,
                amount: 300000000000,
              }
            ],
            amount: fundsAmount,
            max_fee: config.maxFee,
            tpid: '',
            actor: userA1.account,
          }

        });
        expect(result.status).to.equal('OK');
        expect(result).to.have.all.keys('status', 'fee_collected');
    }
  });
  it(`Verify locks were set with get_locks`, async () => {
      const result = await locksdk1.genericAction('getLocks', {fioPublicKey:keys1.publicKey});
      expect(result).to.have.all.keys('lock_amount', 'remaining_lock_amount',
          'time_stamp','payouts_performed','can_vote','unlock_periods');

      expect(result.lock_amount).to.equal(500000000000)
      expect(result.can_vote).to.equal(1)
      expect(result.unlock_periods[0].amount).to.equal(200000000000)
      expect(result.unlock_periods[0].duration).to.equal(30)
      expect(result.unlock_periods[1].amount).to.equal(300000000000)
      expect(result.unlock_periods[1].duration).to.equal(60)
  });
});

describe(`C. Insert stake period in middle of locktokensv2 general locks, then unlock and unstake, skip two periods of general lock`, () => {

  let userA1, locksdk, keys, accountnm, newFioDomain, newFioAddress, lockDuration

  const genLock1Dur = 30, genLock1Amount = 5000000000000,  // 30 seconds minute, 5000 FIO
      genLock2Dur = 60, genLock2Amount = 4000000000000,     // 1 minute, 4000 FIO
      genLock3Dur = 1204800, genLock3Amount = 1000000000000  // 20080 minuteS, 1000 FIO

  const genLockTotal = genLock1Amount + genLock2Amount + genLock3Amount

  const fundsAmount = 1000000000000
  const stakeAmount = 1000000000000 // 1000 FIO
  const unstake1 = 100000000000     // 100 FIO
  const unstake2 = 2000000000       // 2 FIO
  const unstake3 = 2000000000       // 2 FIO

  before(async () => {
    userA1 = await newUser(faucet);

    keys = await createKeypair();
    accountnm = await getAccountFromKey(keys.publicKey);
    locksdk = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson);

    //console.log("locksdk priv key ", keys.privateKey);
    //console.log("locksdk pub key ", keys.publicKey);
    //console.log("locksdk Account name ", accountnm);
  });

  // before(async () => {
  //   userA1 = await newUser(faucet);
  //   userA2 = await newUser(faucet);
  //   userA3 = await newUser(faucet);
  //   userA4 = await newUser(faucet);
  //
  //   keys = await createKeypair();
  //   locksdk = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson);
  //   keys1 = await createKeypair();
  //   locksdk1 = new FIOSDK(keys1.privateKey, keys1.publicKey, config.BASE_URL, fetchJson);
  //   keys2 = await createKeypair();
  //   locksdk2 = new FIOSDK(keys2.privateKey, keys2.publicKey, config.BASE_URL, fetchJson);
  //   keys3 = await createKeypair();
  //   locksdk3 = new FIOSDK(keys3.privateKey, keys3.publicKey, config.BASE_URL, fetchJson);
  //   keys4 = await createKeypair();
  //   locksdk4 = new FIOSDK(keys4.privateKey, keys4.publicKey, config.BASE_URL, fetchJson);
  // });

  it(`trnsloctoks with three periods to locksdk: 5000 FIO - 1 min, 4000 FIO - 2 min, and 1000 FIO - 20080 minutes`, async () => {
    const result = await faucet.genericAction('pushTransaction', {
      action: 'trnsloctoks',
      account: 'fio.token',
      data: {
        payee_public_key: keys.publicKey,
        can_vote: 0,
        periods: [
          {
            duration: genLock1Dur,
            amount: genLock1Amount,
          },
          {
            duration: genLock2Dur,
            amount: genLock2Amount,
          },
          {
            duration: genLock3Dur,
            amount: genLock3Amount,
          }
        ],
        amount: genLockTotal,
        max_fee: config.maxFee,
        tpid: '',
        actor: config.FAUCET_ACCOUNT,
      }
    });
    expect(result.status).to.equal('OK');
  });

  it(`Verify locks were set with get_locks`, async () => {

      const result = await locksdk.genericAction('getLocks', {fioPublicKey: keys.publicKey});

      expect(result).to.have.all.keys('lock_amount', 'remaining_lock_amount',
          'time_stamp', 'payouts_performed', 'can_vote', 'unlock_periods');


     // console.log('Result: ', result)
      expect(result.can_vote).to.equal(0)
      expect(result.lock_amount).to.equal(genLockTotal)
      expect(result.remaining_lock_amount).to.equal(genLockTotal)
      expect(result.payouts_performed).to.equal(0)
      expect(result.unlock_periods[0].duration).to.equal(genLock1Dur)
      expect(result.unlock_periods[0].amount).to.equal(genLock1Amount)
      expect(result.unlock_periods[1].duration).to.equal(genLock2Dur)
      expect(result.unlock_periods[1].amount).to.equal(genLock2Amount)
      expect(result.unlock_periods[2].duration).to.equal(genLock3Dur)
      expect(result.unlock_periods[2].amount).to.equal(genLock3Amount)

  });



  it(`Transfer ${fundsAmount} FIO to locked account`, async () => {
    try {
      const result = await userA1.sdk.genericAction('transferTokens', {
        payeeFioPublicKey: keys.publicKey,
        amount: 1000000000000,
        maxFee: config.maxFee,
        tpid: '',
      });
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  });

  it(`Register domain for voting for locked account `, async () => {
    try {
      newFioDomain = generateFioDomain(15)
      const result = await locksdk.genericAction('registerFioDomain', {
        fioDomain: newFioDomain,
        maxFee: config.maxFee,
        tpid: '',
      });
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  });

  it(`Register address for voting for locked account`, async () => {
    try {
      newFioAddress = generateFioAddress(newFioDomain, 15)
      const result = await locksdk.genericAction('registerFioAddress', {
        fioAddress: newFioAddress,
        maxFee: config.maxFee,
        tpid: '',
      });
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  });


  it(`Success. locksdk vote for producers.`, async () => {
    try {
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          producers: ["bp1@dapixdev"],
          fio_address: newFioAddress,
          actor: accountnm,
          max_fee: config.maxFee
        }
      });
      // console.log('Result: ', result)
      expect(result.status).to.equal('OK');
    } catch (err) {
      console.log("Error : ", err.json)
      expect(err).to.equal(null)
    }
  });


  it(`Waiting 1 minute for unlock of genlock1 (5000 FIO) AND genlock2 (4000 FIO)`, async () => {
    console.log("            waiting 65 seconds ");
  });

  it(` wait 65 seconds`, async () => {
    try {
      wait(65000)
    } catch (err) {
      console.log('Error', err)
    }
  });

  it(`Transfer 1 FIO from locksdk to trigger update of locktokensv2`, async () => {
    try {
      const result = await locksdk.genericAction('transferTokens', {
        payeeFioPublicKey: userA1.publicKey,
        amount: 1000000000,
        maxFee: config.maxFee,
        tpid: '',
      });
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  });

  it(`Verify locks were set with get_locks`, async () => {

    const result = await locksdk.genericAction('getLocks', {fioPublicKey: keys.publicKey});

    expect(result).to.have.all.keys('lock_amount', 'remaining_lock_amount',
        'time_stamp', 'payouts_performed', 'can_vote', 'unlock_periods');


    // console.log('Result: ', result)
    expect(result.can_vote).to.equal(0)
    expect(result.lock_amount).to.equal(genLockTotal - genLock1Amount - genLock2Amount)
    expect(result.remaining_lock_amount).to.equal(genLockTotal - genLock1Amount - genLock2Amount)
    expect(result.payouts_performed).to.equal(0)
    expect(result.unlock_periods[0].duration).to.equal(genLock3Dur)
    expect(result.unlock_periods[0].amount).to.equal(genLock3Amount)

  });


  it(`Success. After unlock, transfer 700 FIO from locksdk to userA1`, async () => {
    try {
      const result = await locksdk.genericAction('transferTokens', {
        payeeFioPublicKey: userA1.publicKey,
        amount: 70000000000,
        maxFee: config.maxFee,
        technologyProviderId: ''
      });
      expect(result.status).to.equal('OK');
    } catch (err) {
      console.log("ERROR: ", err)
    }
  });

  it(`Success, stake ${stakeAmount / 1000000000} tokens `, async () => {
    const result = await locksdk.genericAction('pushTransaction', {
      action: 'stakefio',
      account: 'fio.staking',
      data: {
        fio_address: newFioAddress,
        amount: stakeAmount,
        actor: accountnm,
        max_fee: config.maxFee,
        tpid: ''
      }
    });
    // console.log('Result: ', result)
    expect(result.status).to.equal('OK');
  });

  it(`Success, unstake ${unstake1 / 1000000000} tokens `, async () => {
    const result = await locksdk.genericAction('pushTransaction', {
      action: 'unstakefio',
      account: 'fio.staking',
      data: {
        fio_address: newFioAddress,
        amount: unstake1,
        actor: accountnm,
        max_fee: config.maxFee,
        tpid: ''
      }
    });
    // console.log('Result: ', result)
    expect(result.status).to.equal('OK');
  });

  it(`Verify locks were set with get_locks`, async () => {

    const result = await locksdk.genericAction('getLocks', {fioPublicKey: keys.publicKey});

    expect(result).to.have.all.keys('lock_amount', 'remaining_lock_amount',
        'time_stamp', 'payouts_performed', 'can_vote', 'unlock_periods');


    // console.log('Result: ', result)
    expect(result.can_vote).to.equal(0)
    expect(result.lock_amount).to.equal(genLockTotal - genLock1Amount - genLock2Amount + unstake1)
    expect(result.remaining_lock_amount).to.equal(genLockTotal - genLock1Amount - genLock2Amount + unstake1)
    expect(result.payouts_performed).to.equal(0)
    expect(result.unlock_periods[0].duration).is.greaterThanOrEqual(config.UNSTAKELOCKDURATIONSECONDS);   //(UNSTAKELOCKDURATIONSECONDS)
    lockDuration = result.unlock_periods[0].duration  // Grab this to make sure it does not change later
    expect(result.unlock_periods[0].amount).to.equal(unstake1)
    expect(result.unlock_periods[1].duration).to.equal(genLock3Dur)
    expect(result.unlock_periods[1].amount).to.equal(genLock3Amount)

  });

  it(`Success, unstake ${unstake2 / 1000000000} tokens `, async () => {
    const result = await locksdk.genericAction('pushTransaction', {
      action: 'unstakefio',
      account: 'fio.staking',
      data: {
        fio_address: newFioAddress,
        amount: unstake2,
        actor: accountnm,
        max_fee: config.maxFee,
        tpid: ''
      }
    });
    // console.log('Result: ', result)
    expect(result.status).to.equal('OK');
  });

  it(`Verify locks were set with get_locks`, async () => {


    const result = await locksdk.genericAction('getLocks', {fioPublicKey: keys.publicKey});

    expect(result).to.have.all.keys('lock_amount', 'remaining_lock_amount',
        'time_stamp', 'payouts_performed', 'can_vote', 'unlock_periods');


    // console.log('Result: ', result)
    expect(result.can_vote).to.equal(0)
    expect(result.lock_amount).to.equal(genLockTotal - genLock1Amount - genLock2Amount + unstake1 + unstake2)
    expect(result.remaining_lock_amount).to.equal(genLockTotal - genLock1Amount - genLock2Amount + unstake1 + unstake2)
    expect(result.payouts_performed).to.equal(0)
    expect(result.unlock_periods[0].duration).to.equal(lockDuration)

    let penus = unstake1 + unstake2;
    expect(result.unlock_periods[0].amount).to.equal(unstake1 + unstake2)
    expect(result.unlock_periods[1].duration).to.equal(genLock3Dur)
    expect(result.unlock_periods[1].amount).to.equal(genLock3Amount)

  });


  it(`Success, unstake ${unstake3 / 1000000000} tokens `, async () => {
    try {
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: newFioAddress,
          amount: unstake3,
          actor: accountnm,
          max_fee: config.maxFee + 1,
          tpid: ''
        }
      });
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK');
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  });

  it(`Verify locks were set with get_locks`, async () => {

    const result = await locksdk.genericAction('getLocks', {fioPublicKey: keys.publicKey});

    expect(result).to.have.all.keys('lock_amount', 'remaining_lock_amount',
        'time_stamp', 'payouts_performed', 'can_vote', 'unlock_periods');

    // console.log('Result: ', result)
    expect(result.can_vote).to.equal(0)
    expect(result.lock_amount).to.equal(genLockTotal - genLock1Amount - genLock2Amount + unstake1 + unstake2 + unstake3)
    expect(result.remaining_lock_amount).to.equal(genLockTotal - genLock1Amount - genLock2Amount + unstake1 + unstake2 + unstake3)
    expect(result.payouts_performed).to.equal(0)
    expect(result.unlock_periods[0].duration).to.equal(lockDuration)
    expect(result.unlock_periods[0].amount).to.equal(unstake1 + unstake2 + unstake3)
    expect(result.unlock_periods[1].duration).to.equal(genLock3Dur)
    expect(result.unlock_periods[1].amount).to.equal(genLock3Amount)

  });


});

describe(`D. Make new lock skip 2 periods, then call get_locks, verify past periods not in results`, () => {

  let userA1, locksdk, keys, accountnm, newFioDomain, newFioAddress, lockDuration

  const genLock1Dur = 30, genLock1Amount = 5000000000000,  // 30 seconds minute, 5000 FIO
      genLock2Dur = 35, genLock2Amount = 4000000000000,     // 1 minute, 4000 FIO
      genLock3Dur = 1204800, genLock3Amount = 1000000000000  // 20080 minuteS, 1000 FIO

  const genLockTotal = genLock1Amount + genLock2Amount + genLock3Amount

  const fundsAmount = 1000000000000
  const stakeAmount = 1000000000000 // 1000 FIO
  const unstake1 = 100000000000     // 100 FIO
  const unstake2 = 2000000000       // 2 FIO
  const unstake3 = 2000000000       // 2 FIO

  before(async () => {

    userA1 = await newUser(faucet);

    keys = await createKeypair();
    accountnm = await getAccountFromKey(keys.publicKey);
    locksdk = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson);
  });

  it(`trnsloctoks with three periods to locksdk: 5000 FIO - 1 min, 4000 FIO - 2 min, and 1000 FIO - 20080 minutes`, async () => {
    const result = await faucet.genericAction('pushTransaction', {
      action: 'trnsloctoks',
      account: 'fio.token',
      data: {
        payee_public_key: keys.publicKey,
        can_vote: 0,
        periods: [
          {
            duration: genLock1Dur,
            amount: genLock1Amount,
          },
          {
            duration: genLock2Dur,
            amount: genLock2Amount,
          },
          {
            duration: genLock3Dur,
            amount: genLock3Amount,
          }
        ],
        amount: genLockTotal,
        max_fee: config.maxFee,
        tpid: '',
        actor: config.FAUCET_ACCOUNT,
      }
    });
    expect(result.status).to.equal('OK');
  });

  it(`Verify locks were set with get_locks`, async () => {

    const result = await locksdk.genericAction('getLocks', {fioPublicKey: keys.publicKey});

    //console.log('Result: ',result)
    expect(result).to.have.all.keys('lock_amount', 'remaining_lock_amount',
        'time_stamp', 'payouts_performed', 'can_vote', 'unlock_periods');


    // console.log('Result: ', result)
    expect(result.can_vote).to.equal(0)
    expect(result.lock_amount).to.equal(genLockTotal)
    expect(result.remaining_lock_amount).to.equal(genLockTotal)
    expect(result.payouts_performed).to.equal(0)
    expect(result.unlock_periods[0].duration).to.equal(genLock1Dur)
    expect(result.unlock_periods[0].amount).to.equal(genLock1Amount)
    expect(result.unlock_periods[1].duration).to.equal(genLock2Dur)
    expect(result.unlock_periods[1].amount).to.equal(genLock2Amount)
    expect(result.unlock_periods[2].duration).to.equal(genLock3Dur)
    expect(result.unlock_periods[2].amount).to.equal(genLock3Amount)

  });


  it(`Waiting 40 seconds for unlock of genlock1 (5000 FIO) AND genlock2 (4000 FIO)`, async () => {
    console.log("            waiting 40 seconds ");
  });

  it(` wait 40 seconds`, async () => {
    try {
      wait(40000)
    } catch (err) {
      console.log('Error', err)
    }
  });


  it(`Verify locks were set with get_locks`, async () => {

    const result = await locksdk.genericAction('getLocks', {fioPublicKey: keys.publicKey});

    expect(result).to.have.all.keys('lock_amount', 'remaining_lock_amount',
        'time_stamp', 'payouts_performed', 'can_vote', 'unlock_periods');

     //console.log('Result: ', result)
    expect(result.can_vote).to.equal(0)
    expect(result.lock_amount).to.equal(genLockTotal-genLock1Amount-genLock2Amount)
    expect(result.remaining_lock_amount).to.equal(genLockTotal - genLock1Amount - genLock2Amount)
    expect(result.payouts_performed).to.equal(0)
    expect(result.unlock_periods[0].duration).to.equal(genLock3Dur)
    expect(result.unlock_periods[0].amount).to.equal(genLock3Amount)
  });

});
