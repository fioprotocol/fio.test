
/*
 MANUAL CONFIGURATION REQUIRED TO RUN to run these TESTS

 The following changes must be made to run these tests:

  1. Shorten the unstake locking period

  go to the contract fio.staking.cpp and change the following lines

  change

  int64_t UNSTAKELOCKDURATIONSECONDS = 604800;

   to become

  int64_t UNSTAKELOCKDURATIONSECONDS = 70;

  Next, update both instances of SECONDSPERDAY in the unstakefio function to 10:

  //the days since launch.
  uint32_t insertday = (lockiter->timestamp + insertperiod) / SECONDSPERDAY;

    to become

  //the days since launch.
  uint32_t insertday = (lockiter->timestamp + insertperiod) / 10;

    and

  daysforperiod = (lockiter->timestamp + lockiter->periods[i].duration)/SECONDSPERDAY;

    to become

  daysforperiod = (lockiter->timestamp + lockiter->periods[i].duration)/10;
*/

require('mocha');
const {expect} = require('chai');
const {newUser, existingUser, fetchJson, createKeypair,getAccountFromKey,callFioApi, timeout} = require('../utils.js');
const {FIOSDK} = require('@fioprotocol/fiosdk');
const config = require('../config.js');
let faucet;

before(async function () {
    faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
  });


describe(`************************** BD-4162-unstake.js ************************** \n    A. BUG BD-4162 unstake throwing error`, function () {
    let userA1, userA1Keys;
    let userA2;
    let userA4;
    let prodA1
    let accountnm;
  
    const fundsAmount = 200000000000;   // 200 FIO
    const stakeAmt =    100000000000;      // 100 FIO
    const unstakeAmt =  50000000000;    // 50 FIO

    //create the users for the testing
    it(`Create Users`, async function () {
        //userA2 used to transfer funds
        userA2 = await newUser(faucet);
        //userA4 used to transfer funds
        userA4 = await newUser(faucet);
        //prodA1 is used to register a new producer, to permit voting.
        prodA1 = await newUser(faucet);
        //userA1 is the test account used for stake unstake to try to reproduce the bug.
        userA1Keys = await createKeypair();
        //accountnm used to store the account name of userA1
        accountnm = await getAccountFromKey(userA1Keys.publicKey);
        //set up userA1 without creating an account.
        userA1 = new FIOSDK(userA1Keys.privateKey, userA1Keys.publicKey, config.BASE_URL, fetchJson);
        userA1.publicKey = userA1Keys.publicKey;
        userA1.account = userA1Keys.account;
    });

    //transfer tokens to userA1, and create account
    it(`Transfer tokens to userA1`, async function () {
        await faucet.genericAction('transferTokens', {
            payeeFioPublicKey: userA1Keys.publicKey,
            amount: fundsAmount*3,
            maxFee: config.api.transfer_tokens_pub_key.fee,
            tpid: '',
        });
    });

    //transfer locked tokens, create a general lock in the locktoeknsv2 table.
    it(`(transfer locked tokens one period, 3 seconds to maturity.`, async () => {
        try {
            const result = await userA4.sdk.genericAction('transferLockedTokens', {
                payeePublicKey: userA1.publicKey,
                canVote: 1,
                periods: [
                    {
                        duration: 3,
                        amount: 100000000000,
                    }
                ],
                amount: 100000000000,
                maxFee: 400000000000,
                tpid: '',

            })
            expect(result.status).to.equal('OK')
        } catch (err) {
            //console.log('error: ', err)
            expect(err).to.equal(null);
        }


    })

    //wait 4 seconds.
    it(`Wait a few seconds.`, async () => { await timeout(4000) })


    //register prodA1 as new producer.
    it(`Register prodA1 as producer`, async () => {
        try {
            const result = await prodA1.sdk.genericAction('pushTransaction', {
                action: 'regproducer',
                account: 'eosio',
                data: {
                    fio_address: prodA1.address,
                    fio_pub_key: prodA1.publicKey,
                    url: "https://mywebsite.io/",
                    location: 80,
                    actor: prodA1.account,
                    max_fee: config.api.register_producer.fee
                }
            })
            //console.log('Result: ', result)
            expect(result.status).to.equal('OK')
        } catch (err) {
            console.log('Error: ', err.json)
        }
    })

    //userA1 votes, this updates accounting on the locks and results in locks that look just like what is in nthe operational bug
    it(`userA1 votes for bp1@dapixdev`, async () => {
        try {
            const result = await userA1.genericAction('pushTransaction', {
                action: 'voteproducer',
                account: 'eosio',
                data: {
                    "producers": [
                        'bp1@dapixdev'
                    ],
                    fio_address: '',
                    actor: userA1.account,
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

    //use get locks, but always better for lock testing to use get table rows.
    it(`getlocks for the account, note this does not show the true lock state in locktokensv2`, async function () {
        try {
            const result = await userA1.getLocks(userA1Keys.publicKey);
            console.log("RESULT ",result);

        } catch (err) {
            console.log('Error: ', err);
            throw err;
        }
    });

    //show the true state of the locks in the locktoeknsv2 table. this result should look exactly like the locks from the operational bug.
    it(`Call get_table_rows from locktokensv2 for the account`, async () => {
        try {
            const json = {
                json: true,
                code: 'eosio',
                scope: 'eosio',
                table: 'locktokensv2',
                lower_bound: accountnm,
                upper_bound: accountnm,
                key_type: 'i64',
                index_position: '2'
            }
            result = await callFioApi("get_table_rows", json);
            console.log('Result: ', result);
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    })


    //now stake and unstake 400 FIO see how that goes.
    it(`stake 400 FIO from userA1`, async function () {
        //let stake = stakeAmt * 2;

        try {
            const result = await userA1.genericAction('pushTransaction', {
                action: 'stakefio',
                account: 'fio.staking',
                data: {
                    fio_address: userA1.address,
                    amount: 400000000000,
                    actor: userA1.account,
                    max_fee: config.api.stake_fio_tokens.fee,
                    tpid: ''
                }
            });
            expect(result).to.have.any.keys('status');
            expect(result).to.have.any.keys('fee_collected');
            expect(result).to.have.any.keys('block_num');
            expect(result).to.have.any.keys('transaction_id');
            expect(result.status).to.equal('OK');
            expect(result.fee_collected).to.equal(config.api.stake_fio_tokens.fee);
        } catch (err) {
            console.log('Error: ', err);
            throw err;
        }
    });

    it(`unstake 300 FIO from userA1`, async function () {
        try {
            const result = await userA1.genericAction('pushTransaction', {
                action: 'unstakefio',
                account: 'fio.staking',
                data: {
                    fio_address: '',
                    amount: 300000000000,
                    actor: userA1.account,
                    max_fee: config.maxFee,
                    tpid: ''
                }
            });
            expect(result.status).to.equal('OK');
        } catch (err) {
            console.log('Error: ', err);
            throw err;
        }
    });

     //NO errors!!!!! this runs cleanly.
});

