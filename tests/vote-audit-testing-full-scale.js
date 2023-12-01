require('mocha')
require('fs')
const {expect} = require('chai')
const {newUser, existingUser, getTestType, getProdVoteTotal, timeout, generateFioDomain, getBundleCount, getAccountVoteWeight, getTotalVotedFio, appendAccountFile, appendCommentAccountFile, readAccountFile, callFioApi, fetchJson} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk');
const config = require('../config.js');
const { readBufferWithDetectedEncoding } = require('tslint/lib/utils');
const testType = getTestType();

let total_voted_fio, bp1sdk,opproxy1sdk, transfer_tokens_pub_key_fee, unregister_proxy_fee, register_proxy_fee

const eosio = {
  account: 'eosio',
  publicKey: 'FIO7isxEua78KPVbGzKemH4nj2bWE52gqj8Hkac3tc7jKNvpfWzYS',
  privateKey: '5KBX1dwHME4VyuUss2sYM25D5ZTDvyYrbEz37UJqwAVAsR4tGuY'
}

const fiotoken = {
  account: 'fio.token',
  publicKey: 'FIO7isxEua78KPVbGzKemH4nj2bWE52gqj8Hkac3tc7jKNvpfWzYS',
  privateKey: '5KBX1dwHME4VyuUss2sYM25D5ZTDvyYrbEz37UJqwAVAsR4tGuY'
}



const bp1 = {
  account: 'qbxn5zhw2ypw',
  publicKey: 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr',
  privateKey: '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R'
}

const opproxy1 = {
  account: 'aghsbgzbx3iz',
  publicKey: 'FIO5uoS7DFdG643vCU5Ko5YW4ch8Y8NoJ5HSLCAdxdVP4fw6AAsvx',
  privateKey: 'K7mT9syr4ts3uqQiHsFeyor5Ge6JXvQWBdFtozoupWQHfMJaCE'
}




before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);

  bp1sdk = new FIOSDK(bp1.privateKey,bp1.publicKey, config.BASE_URL, fetchJson);
  opproxy1sdk = new FIOSDK(opproxy1.privateKey,opproxy1.publicKey, config.BASE_URL, fetchJson);

  result = await faucet.getFee('transfer_tokens_pub_key');

  transfer_tokens_pub_key_fee = result.fee;

  result = await faucet.getFee('unregister_proxy');
  unregister_proxy_fee = result.fee;

  result = await faucet.getFee('register_proxy');
  register_proxy_fee = result.fee;
})





describe.skip(`Initialize blockchain server for local dev testing`, () => {

  let accountA, accountB, accountC, accountD, accountE, accountF, accountG,total_voted_fio, start_bp_votes, proxied_weightC, proxied_weightB,  total_bp_votes,regproxyfee

  let accountfilename = '../edscripts/votingAccounts.csv';

  it(`Create users`, async () => {
    accountA = await newUser(faucet); //proxy.
    accountB = await newUser(faucet); //auto proxy 1 300k ++ fio
    accountC = await newUser(faucet); //auto proxy 2 13 fio
    accountD = await newUser(faucet); //auto proxy 3 0 fio
    accountE = await newUser(faucet);
    accountF = await newUser(faucet);
    accountG = await newUser(faucet);
  })


  it(`Initialize blockchain with voting proxies, and auto proxy participants, store account info to ../edscripts/eddiefile.csv`, async () => {

    const fs = require('fs');
    if (fs.existsSync(accountfilename)) {
      fs.unlinkSync(accountfilename)
    }

    ///////////first account 40 proxy participants

    accountA = await newUser(faucet);



    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.register_proxy.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }

    await appendCommentAccountFile(accountfilename,"# first proxy has 1123 participating accounts");
    await appendAccountFile(accountfilename, accountA);

    await timeout(5000);

    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev','bp2@dapixdev'
          ],
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }




    for (let numits = 0; numits < 20; numits++) {

      console.log("making proxy1 participant ",numits);
      accountB = await newUser(faucet);
      await accountB.sdk.genericAction('pushTransaction', {
        action: 'trnsfiopubky',
        account: 'fio.token',
        data: {
          payee_public_key: accountF.publicKey,
          amount: 1700000000000,
          max_fee: config.maxFee,
          actor: accountB.account,
          tpid: accountA.address
        }
      });

      await appendAccountFile(accountfilename, accountB);



    } //end for loop

    //unreg proxy for dev test.

    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'unregproxy',
        account: 'eosio',
        data: {
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.register_proxy.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }



    ///////////second account 32 participants


        accountA = await newUser(faucet);

        await appendAccountFile(accountfilename, accountA);

        try {
          const result = await accountA.sdk.genericAction('pushTransaction', {
            action: 'regproxy',
            account: 'eosio',
            data: {
              fio_address: accountA.address,
              actor: accountA.account,
              max_fee: config.api.register_proxy.fee
            }
          })
          //console.log('Result: ', result)
          expect(result.status).to.equal('OK')
        } catch (err) {
          console.log('Error: ', err.json)
          expect(err).to.equal('null')
        }

        await timeout(5000);

        try {
          const result = await accountA.sdk.genericAction('pushTransaction', {
            action: 'voteproducer',
            account: 'eosio',
            data: {
              "producers": [
                'bp1@dapixdev','bp2@dapixdev','bp3@dapixdev'
              ],
              fio_address: accountA.address,
              actor: accountA.account,
              max_fee: config.api.vote_producer.fee
            }
          })
          //console.log('Result: ', result)
          expect(result.status).to.equal('OK')
        } catch (err) {
          console.log('Error: ', err.json)
          expect(err).to.equal('null')
        }


        for (let numits = 0; numits < 32; numits++) {

          console.log("making proxy2 participant ",numits);
          accountB = await newUser(faucet);
          await accountB.sdk.genericAction('pushTransaction', {
            action: 'trnsfiopubky',
            account: 'fio.token',
            data: {
              payee_public_key: accountF.publicKey,
              amount: 1700000000000,
              max_fee: config.maxFee,
              actor: accountB.account,
              tpid: accountA.address
            }
          });
          await appendAccountFile(accountfilename, accountB);


        } //end for loop



    /*

     try {
       // let accountA = await newUser(faucet);

       const result = await accountA.sdk.genericAction('pushTransaction', {
         action: 'setvoting',
         account: 'eosio',
         data: {
           proxiedweight: 1970,
           lastvoteweight: 30,
           voteracct: accountA.account
         }
       })
       console.log('Result: ', result)
       // expect(result.status).to.equal('OK')
     } catch (err) {
       console.log('Error: ', err.json)
       expect(err).to.equal('null')
     }


 */




  })

})

describe.skip(`Initialize blockchain server for dev testing on AWS hosted dev platform. 1 previous proxy, 3 active proxies`, () => {

  let accountA, accountB, accountC, accountD, accountE, accountF, accountG,total_voted_fio, start_bp_votes, proxied_weightC, proxied_weightB,  total_bp_votes,regproxyfee

  let accountfilename = '../edscripts/votingAccounts.csv';

  it(`Create users`, async () => {
    accountA = await newUser(faucet); //proxy.
    accountB = await newUser(faucet); //auto proxy 1 300k ++ fio
    accountC = await newUser(faucet); //auto proxy 2 13 fio
    accountD = await newUser(faucet); //auto proxy 3 0 fio
    accountE = await newUser(faucet);
    accountF = await newUser(faucet);
    accountG = await newUser(faucet);
  })


  // 0 first account is proxy, unreg proxy,
  // 1-10 next ten accounts are participants
  // 11 next account is proxy,
  // 12-31 next twenty re participants
  // 32 next account is proxy
  // 33-36 next four are participants
  // set account 0 proxied vote weight to be big value,
  //set account 11 proxied vote wiehgt to be big value, set last vote weight also big
  //set account 32 proxied vote weight to large neg number, set last vote wieght large neg number.
  //this test sets a few proxies with errant voting data, this is a minimal dev test for the audit machine.
  it(`Initialize blockchain with voting proxies, and auto proxy participants, store account info to ../edscripts/eddiefile.csv`, async () => {

    const fs = require('fs');
    if (fs.existsSync(accountfilename)) {
      fs.unlinkSync(accountfilename)
    }

    accountA = await newUser(faucet);

    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.register_proxy.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }

    await appendCommentAccountFile(accountfilename,"# first proxy has 1123 participating accounts");
    await appendAccountFile(accountfilename, accountA);

    await timeout(5000);

    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev','bp2@dapixdev'
          ],
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }




    for (let numits = 0; numits < 10; numits++) {

      console.log("making proxy1 participant ",numits);
      accountB = await newUser(faucet);
      await accountB.sdk.genericAction('pushTransaction', {
        action: 'trnsfiopubky',
        account: 'fio.token',
        data: {
          payee_public_key: accountF.publicKey,
          amount: 1700000000000,
          max_fee: config.maxFee,
          actor: accountB.account,
          tpid: accountA.address
        }
      });

      await appendAccountFile(accountfilename, accountB);



    } //end for loop

    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'setvoting',
        account: 'eosio',
        data: {
          voteraccount: accountA.account,
          last_vote_weight: 345000000000000000,
          proxy_vote_weight: 34000000000000000
        }
      })
      //console.log('Result: ', result)
     // expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null)
    }


      try {
        const result = await accountB.sdk.genericAction('pushTransaction', {
          action: 'trnsfiopubky',
          account: 'fio.token',
          data: {
            payee_public_key: accountA.publicKey,
            amount: 1000000000,
            max_fee: config.maxFee,
            tpid: ''
          }
        })
        //console.log('Result: ', result)
        expect(result.status).to.equal('OK')
      } catch (err) {
        console.log('Error: ', err)
        expect(err).to.equal(null)
      }


    //unreg proxy for dev test.

    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'unregproxy',
        account: 'eosio',
        data: {
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.register_proxy.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }



    ///////////second proxy account 20 participants


    accountA = await newUser(faucet);

    await appendAccountFile(accountfilename, accountA);

    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.register_proxy.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }

    await timeout(5000);

    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev','bp2@dapixdev','bp3@dapixdev'
          ],
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }


    for (let numits = 0; numits < 20; numits++) {

      console.log("making proxy2 participant ", numits);
      accountB = await newUser(faucet);
      await accountB.sdk.genericAction('pushTransaction', {
        action: 'trnsfiopubky',
        account: 'fio.token',
        data: {
          payee_public_key: accountF.publicKey,
          amount: 1700000000000,
          max_fee: config.maxFee,
          actor: accountB.account,
          tpid: accountA.address
        }
      });
      await appendAccountFile(accountfilename, accountB);
    }

    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'setvoting',
        account: 'eosio',
        data: {
          voteraccount: accountA.account,
          last_vote_weight: 376000000000000000,
          proxy_vote_weight: 37000000000000000
        }
      })
      //console.log('Result: ', result)
     // expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null)
    }


    try {
      const result = await accountB.sdk.genericAction('pushTransaction', {
        action: 'trnsfiopubky',
        account: 'fio.token',
        data: {
          payee_public_key: accountA.publicKey,
          amount: 1000000000,
          max_fee: config.maxFee,
          tpid: ''
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null)
    }



    ///////////third proxy account 4 participants


      accountA = await newUser(faucet);

      await appendAccountFile(accountfilename, accountA);

      try {
        const result = await accountA.sdk.genericAction('pushTransaction', {
          action: 'regproxy',
          account: 'eosio',
          data: {
            fio_address: accountA.address,
            actor: accountA.account,
            max_fee: config.api.register_proxy.fee
          }
        })
        //console.log('Result: ', result)
        expect(result.status).to.equal('OK')
      } catch (err) {
        console.log('Error: ', err.json)
        expect(err).to.equal('null')
      }

      await timeout(5000);

      try {
        const result = await accountA.sdk.genericAction('pushTransaction', {
          action: 'voteproducer',
          account: 'eosio',
          data: {
            "producers": [
              'bp1@dapixdev','bp2@dapixdev','bp3@dapixdev'
            ],
            fio_address: accountA.address,
            actor: accountA.account,
            max_fee: config.api.vote_producer.fee
          }
        })
        //console.log('Result: ', result)
        expect(result.status).to.equal('OK')
      } catch (err) {
        console.log('Error: ', err.json)
        expect(err).to.equal('null')
      }


      for (let numits = 0; numits < 4; numits++) {

        console.log("making proxy2 participant ",numits);
        accountB = await newUser(faucet);
        await accountB.sdk.genericAction('pushTransaction', {
          action: 'trnsfiopubky',
          account: 'fio.token',
          data: {
            payee_public_key: accountF.publicKey,
            amount: 1700000000000,
            max_fee: config.maxFee,
            actor: accountB.account,
            tpid: accountA.address
          }
        });
        await appendAccountFile(accountfilename, accountB);


    } //end for loop

    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'setvoting',
        account: 'eosio',
        data: {
          voteraccount: accountA.account,
          last_vote_weight: -123456789876544345,
          proxy_vote_weight: -456123344566656456454,
        }
      })
      //console.log('Result: ', result)
     // expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null)
    }


    try {
      const result = await accountB.sdk.genericAction('pushTransaction', {
        action: 'trnsfiopubky',
        account: 'fio.token',
        data: {
          payee_public_key: accountA.publicKey,
          amount: 1000000000,
          max_fee: config.maxFee,
          tpid: ''
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null)
    }



  })

})

describe.skip(`call auditvote 50 times.`, () => {

  let accountA

  it(`Create users`, async () => {
    accountA = await newUser(faucet);
  })



  it(`call auditvote `, async () => {
    try {
      for (let numits = 0; numits < 50; numits++) {
        const result = await accountA.sdk.genericAction('pushTransaction', {
          action: 'auditvote',
          account: 'eosio',
          data: {
            actor: accountA.account,
            max_fee: config.api.register_proxy.fee
          }
        })
        console.log('Result: ', result)
        auditphase = result.audit_phase;

        await timeout(1000);
      }
      }
    catch
      (err)
      {
        console.log('Error: ', err)
        expect(err).to.equal('null')
      }


  })


})

describe.skip(`Initialize blockchain server with all flavors of test data 11 voting accounts`, () => {

  let accountA, accountB, accountC, accountD, accountE, accountF, accountG,total_voted_fio, start_bp_votes, proxied_weightC, proxied_weightB,  total_bp_votes,regproxyfee

  let accountfilename = '../edscripts/votingAccounts.csv';
  /*
  make voters for all of these flavors/scenarios...


  1. Non proxy non auto proxy Voting account has last vote weight less than actual voting weight.
2. Voting account is auto proxy and last vote weight incorrect  last vote weight larger than actual.
3. Proxy who has voted for producers (non empty producers specified) with last vote weight and proxy vote weight incorrect
    1. last vote weight and proxied vote weight much less than actual.
    2. last vote weight and proxied vote weight more than actual.
    3.  vote weight more than actual, proxied vote weight less than actual.
    4. last vote weight and proxied vote weight negative.
4. Proxy who has voted for producers [] with last vote weight inaccuracies 2,3,4.
    1. last vote weight and proxied vote weight much less than actual.
    2. last vote weight and proxied vote weight more than actual.
    3.  vote weight more than actual, proxied vote weight less than actual.
    4. last vote weight and proxied vote weight negative.
5. Voter is auto proxy and has no proxy set (there are 2 of these in our main net voter table)




   */

  it(`Create users`, async () => {
    accountA = await newUser(faucet);
    accountB = await newUser(faucet);
    accountC = await newUser(faucet);
    accountD = await newUser(faucet);
    accountE = await newUser(faucet);
    accountF = await newUser(faucet);
    accountG = await newUser(faucet);
  })


  it(`voter is non proxy, non auto proxy account has last vote weight less than actual`, async () => {

    //init the accounts file.
    const fs = require('fs');
    if (fs.existsSync(accountfilename)) {
      fs.unlinkSync(accountfilename)
    }

    accountA = await newUser(faucet);




    await appendCommentAccountFile(accountfilename,"# first account is non proxy non auto proxy");
    await appendAccountFile(accountfilename, accountA);

    await timeout(5000);

    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')


      const result1 = await accountA.sdk.genericAction('pushTransaction', {
        action: 'setvoting',
        account: 'eosio',
        data: {
          voteraccount: accountA.account,
          last_vote_weight: 56700000000000,
          proxy_vote_weight: 0
        }
      })

    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }









  })

  /*
  Proxy who has voted for producers (non empty producers specified) with last vote weight and proxy vote weight incorrect
  1. last vote weight and proxied vote weight much less than actual.
  2. last vote weight and proxied vote weight more than actual.
  3.  vote weight more than actual, proxied vote weight less than actual.
  4. last vote weight and proxied vote weight negative.
  */
  it(`Proxy who has voted for producers, last vote weight and proxied less than actual`, async () => {


    ///////////proxy has 10 participants

    accountA = await newUser(faucet);


    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.register_proxy.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }

    await appendCommentAccountFile(accountfilename, "# first proxy has 1123 participating accounts");
    await appendAccountFile(accountfilename, accountA);

    await timeout(5000);

    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }


    try {
      for (let numits = 0; numits < 10; numits++) {

        console.log("making proxy1 participant ", numits);
        accountB = await newUser(faucet);
        await accountB.sdk.genericAction('pushTransaction', {
          action: 'trnsfiopubky',
          account: 'fio.token',
          data: {
            payee_public_key: accountF.publicKey,
            amount: 1700000000000,
            max_fee: config.maxFee,
            actor: accountB.account,
            tpid: accountA.address
          }
        });

        await appendAccountFile(accountfilename, accountB);


      } //end for loop

    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }


    const result1 = await accountA.sdk.genericAction('pushTransaction', {
      action: 'setvoting',
      account: 'eosio',
      data: {
        voteraccount: accountA.account,
        last_vote_weight:  120000000000,
        proxy_vote_weight: 120000000000
      }
    })



  })

  it(`Proxy who has voted for producers, last vote weight and proxied more than actual`, async () => {


    ///////////proxy has 10 participants

    accountA = await newUser(faucet);


    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.register_proxy.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }

    await appendCommentAccountFile(accountfilename, "# first proxy has 1123 participating accounts");
    await appendAccountFile(accountfilename, accountA);

    await timeout(5000);

    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }


    for (let numits = 0; numits < 10; numits++) {

      console.log("making proxy1 participant ", numits);
      accountB = await newUser(faucet);
      await accountB.sdk.genericAction('pushTransaction', {
        action: 'trnsfiopubky',
        account: 'fio.token',
        data: {
          payee_public_key: accountF.publicKey,
          amount: 1700000000000,
          max_fee: config.maxFee,
          actor: accountB.account,
          tpid: accountA.address
        }
      });

      await appendAccountFile(accountfilename, accountB);


    } //end for loop


    const result1 = await accountA.sdk.genericAction('pushTransaction', {
      action: 'setvoting',
      account: 'eosio',
      data: {
        voteraccount: accountA.account,
        last_vote_weight:  120000000000000,
        proxy_vote_weight: 120000000000000
      }
    })



  })

  it(`Proxy who has voted for producers, last vote weight more than actual and proxied less than actual`, async () => {


    ///////////proxy has 10 participants

    accountA = await newUser(faucet);


    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.register_proxy.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }

    await appendCommentAccountFile(accountfilename, "# first proxy has 1123 participating accounts");
    await appendAccountFile(accountfilename, accountA);

    await timeout(5000);

    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }


    for (let numits = 0; numits < 10; numits++) {

      console.log("making proxy1 participant ", numits);
      accountB = await newUser(faucet);
      await accountB.sdk.genericAction('pushTransaction', {
        action: 'trnsfiopubky',
        account: 'fio.token',
        data: {
          payee_public_key: accountF.publicKey,
          amount: 1700000000000,
          max_fee: config.maxFee,
          actor: accountB.account,
          tpid: accountA.address
        }
      });

      await appendAccountFile(accountfilename, accountB);


    } //end for loop


    const result1 = await accountA.sdk.genericAction('pushTransaction', {
      action: 'setvoting',
      account: 'eosio',
      data: {
        voteraccount: accountA.account,
        last_vote_weight:  120000000000000,
        proxy_vote_weight: 120000000000
      }
    })



  })

  it(`Proxy who has voted for producers, last vote weight and proxied negative`, async () => {


    ///////////proxy has 10 participants

    accountA = await newUser(faucet);


    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.register_proxy.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }

    await appendCommentAccountFile(accountfilename, "# first proxy has 1123 participating accounts");
    await appendAccountFile(accountfilename, accountA);

    await timeout(5000);

    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }


    for (let numits = 0; numits < 10; numits++) {

      console.log("making proxy1 participant ", numits);
      accountB = await newUser(faucet);
      await accountB.sdk.genericAction('pushTransaction', {
        action: 'trnsfiopubky',
        account: 'fio.token',
        data: {
          payee_public_key: accountF.publicKey,
          amount: 1700000000000,
          max_fee: config.maxFee,
          actor: accountB.account,
          tpid: accountA.address
        }
      });

      await appendAccountFile(accountfilename, accountB);


    } //end for loop


    const result1 = await accountA.sdk.genericAction('pushTransaction', {
      action: 'setvoting',
      account: 'eosio',
      data: {
        voteraccount: accountA.account,
        last_vote_weight:  -120000000000000,
        proxy_vote_weight: -120000000000
      }
    })



  })


  it(`Proxy who has voted for [] producers, last vote weight and proxied less than actual`, async () => {


    ///////////proxy has 10 participants

    accountA = await newUser(faucet);


    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.register_proxy.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }

    await appendCommentAccountFile(accountfilename, "# first proxy has 1123 participating accounts");
    await appendAccountFile(accountfilename, accountA);

    await timeout(5000);

    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [],
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }


    try {
      for (let numits = 0; numits < 10; numits++) {

        console.log("making proxy1 participant ", numits);
        accountB = await newUser(faucet);
        await accountB.sdk.genericAction('pushTransaction', {
          action: 'trnsfiopubky',
          account: 'fio.token',
          data: {
            payee_public_key: accountF.publicKey,
            amount: 1700000000000,
            max_fee: config.maxFee,
            actor: accountB.account,
            tpid: accountA.address
          }
        });

        await appendAccountFile(accountfilename, accountB);


      } //end for loop

    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }


    const result1 = await accountA.sdk.genericAction('pushTransaction', {
      action: 'setvoting',
      account: 'eosio',
      data: {
        voteraccount: accountA.account,
        last_vote_weight:  120000000000,
        proxy_vote_weight: 120000000000
      }
    })



  })

  it(`Proxy who has voted for [] producers, last vote weight and proxied more than actual`, async () => {


    ///////////proxy has 10 participants

    accountA = await newUser(faucet);


    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.register_proxy.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }

    await appendCommentAccountFile(accountfilename, "# first proxy has 1123 participating accounts");
    await appendAccountFile(accountfilename, accountA);

    await timeout(5000);

    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [],
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }


    for (let numits = 0; numits < 10; numits++) {

      console.log("making proxy1 participant ", numits);
      accountB = await newUser(faucet);
      await accountB.sdk.genericAction('pushTransaction', {
        action: 'trnsfiopubky',
        account: 'fio.token',
        data: {
          payee_public_key: accountF.publicKey,
          amount: 1700000000000,
          max_fee: config.maxFee,
          actor: accountB.account,
          tpid: accountA.address
        }
      });

      await appendAccountFile(accountfilename, accountB);


    } //end for loop


    const result1 = await accountA.sdk.genericAction('pushTransaction', {
      action: 'setvoting',
      account: 'eosio',
      data: {
        voteraccount: accountA.account,
        last_vote_weight:  120000000000000,
        proxy_vote_weight: 120000000000000
      }
    })



  })

  it(`Proxy who has voted for [] producers, last vote weight more than actual and proxied less than actual`, async () => {


    ///////////proxy has 10 participants

    accountA = await newUser(faucet);


    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.register_proxy.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }

    await appendCommentAccountFile(accountfilename, "# first proxy has 1123 participating accounts");
    await appendAccountFile(accountfilename, accountA);

    await timeout(5000);

    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [],
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }


    for (let numits = 0; numits < 10; numits++) {

      console.log("making proxy1 participant ", numits);
      accountB = await newUser(faucet);
      await accountB.sdk.genericAction('pushTransaction', {
        action: 'trnsfiopubky',
        account: 'fio.token',
        data: {
          payee_public_key: accountF.publicKey,
          amount: 1700000000000,
          max_fee: config.maxFee,
          actor: accountB.account,
          tpid: accountA.address
        }
      });

      await appendAccountFile(accountfilename, accountB);


    } //end for loop


    const result1 = await accountA.sdk.genericAction('pushTransaction', {
      action: 'setvoting',
      account: 'eosio',
      data: {
        voteraccount: accountA.account,
        last_vote_weight:  120000000000000,
        proxy_vote_weight: 120000000000
      }
    })



  })

  it(`Proxy who has voted for [] producers, last vote weight and proxied negative`, async () => {


    ///////////proxy has 10 participants

    accountA = await newUser(faucet);


    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.register_proxy.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }

    await appendCommentAccountFile(accountfilename, "# first proxy has 1123 participating accounts");
    await appendAccountFile(accountfilename, accountA);

    await timeout(5000);

    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [],
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }


    for (let numits = 0; numits < 10; numits++) {

      console.log("making proxy1 participant ", numits);
      accountB = await newUser(faucet);
      await accountB.sdk.genericAction('pushTransaction', {
        action: 'trnsfiopubky',
        account: 'fio.token',
        data: {
          payee_public_key: accountF.publicKey,
          amount: 1700000000000,
          max_fee: config.maxFee,
          actor: accountB.account,
          tpid: accountA.address
        }
      });

      await appendAccountFile(accountfilename, accountB);


    } //end for loop


    const result1 = await accountA.sdk.genericAction('pushTransaction', {
      action: 'setvoting',
      account: 'eosio',
      data: {
        voteraccount: accountA.account,
        last_vote_weight:  -120000000000000,
        proxy_vote_weight: -120000000000
      }
    })



  })

})

describe.skip(`Initialize blockchain server for full scale testing of audit machine, over 2k voting accounts plus all flavors`, () => {

  let accountA, accountB, accountC, accountD, accountE, accountF, accountG,total_voted_fio, start_bp_votes, proxied_weightC, proxied_weightB,  total_bp_votes,regproxyfee

  let accountfilename = '../edscripts/votingAccounts.csv';
  /*
  make voters for all of these scenarios...


  1. Non proxy non auto proxy Voting account has last vote weight less than actual voting weight.
2. Voting account is auto proxy and last vote weight incorrect  last vote weight larger than actual.
3. Proxy who has voted for producers (non empty producers specified) with last vote weight and proxy vote weight incorrect
    1. last vote weight and proxied vote weight much less than actual.
    2. last vote weight and proxied vote weight more than actual.
    3.  vote weight more than actual, proxied vote weight less than actual.
    4. last vote weight and proxied vote weight negative.
4. Proxy who has voted for producers [] with last vote weight inaccuracies 2,3,4.
    1. last vote weight and proxied vote weight much less than actual.
    2. last vote weight and proxied vote weight more than actual.
    3.  vote weight more than actual, proxied vote weight less than actual.
    4. last vote weight and proxied vote weight negative.
5. Voter is auto proxy and has no proxy set (there are 2 of these in our main net voter table)




   */

  it(`Create users`, async () => {
    accountA = await newUser(faucet);
    accountB = await newUser(faucet);
    accountC = await newUser(faucet);
    accountD = await newUser(faucet);
    accountE = await newUser(faucet);
    accountF = await newUser(faucet);
    accountG = await newUser(faucet);
  })


  it(`voter is non proxy, non auto proxy account has last vote weight less than actual`, async () => {

    //init the accounts file.
    const fs = require('fs');
    if (fs.existsSync(accountfilename)) {
      fs.unlinkSync(accountfilename)
    }

    accountA = await newUser(faucet);




    await appendCommentAccountFile(accountfilename,"# first account is non proxy non auto proxy");
    await appendAccountFile(accountfilename, accountA);

    await timeout(5000);

    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')


      const result1 = await accountA.sdk.genericAction('pushTransaction', {
        action: 'setvoting',
        account: 'eosio',
        data: {
          voteraccount: accountA.account,
          last_vote_weight: 56700000000000,
          proxy_vote_weight: 0
        }
      })

    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }









  })

  /*
  Proxy who has voted for producers (non empty producers specified) with last vote weight and proxy vote weight incorrect
  1. last vote weight and proxied vote weight much less than actual.
  2. last vote weight and proxied vote weight more than actual.
  3.  vote weight more than actual, proxied vote weight less than actual.
  4. last vote weight and proxied vote weight negative.
  */
  it(`Proxy who has voted for producers, last vote weight and proxied less than actual`, async () => {


    ///////////proxy has 10 participants

    accountA = await newUser(faucet);


    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.register_proxy.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }

    await appendCommentAccountFile(accountfilename, "# first proxy has 1123 participating accounts");
    await appendAccountFile(accountfilename, accountA);

    await timeout(5000);

    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }


    try {
    for (let numits = 0; numits < 10; numits++) {

      console.log("making proxy1 participant ", numits);
      accountB = await newUser(faucet);
      await accountB.sdk.genericAction('pushTransaction', {
        action: 'trnsfiopubky',
        account: 'fio.token',
        data: {
          payee_public_key: accountF.publicKey,
          amount: 1700000000000,
          max_fee: config.maxFee,
          actor: accountB.account,
          tpid: accountA.address
        }
      });

      await appendAccountFile(accountfilename, accountB);


    } //end for loop

    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }


    const result1 = await accountA.sdk.genericAction('pushTransaction', {
      action: 'setvoting',
      account: 'eosio',
      data: {
        voteraccount: accountA.account,
        last_vote_weight:  120000000000,
        proxy_vote_weight: 120000000000
      }
    })



  })

  it(`Proxy who has voted for producers, last vote weight and proxied more than actual`, async () => {


    ///////////proxy has 10 participants

    accountA = await newUser(faucet);


    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.register_proxy.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }

    await appendCommentAccountFile(accountfilename, "# first proxy has 1123 participating accounts");
    await appendAccountFile(accountfilename, accountA);

    await timeout(5000);

    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }


    for (let numits = 0; numits < 10; numits++) {

      console.log("making proxy1 participant ", numits);
      accountB = await newUser(faucet);
      await accountB.sdk.genericAction('pushTransaction', {
        action: 'trnsfiopubky',
        account: 'fio.token',
        data: {
          payee_public_key: accountF.publicKey,
          amount: 1700000000000,
          max_fee: config.maxFee,
          actor: accountB.account,
          tpid: accountA.address
        }
      });

      await appendAccountFile(accountfilename, accountB);


    } //end for loop


    const result1 = await accountA.sdk.genericAction('pushTransaction', {
      action: 'setvoting',
      account: 'eosio',
      data: {
        voteraccount: accountA.account,
        last_vote_weight:  120000000000000,
        proxy_vote_weight: 120000000000000
      }
    })



  })

  it(`Proxy who has voted for producers, last vote weight more than actual and proxied less than actual`, async () => {


    ///////////proxy has 10 participants

    accountA = await newUser(faucet);


    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.register_proxy.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }

    await appendCommentAccountFile(accountfilename, "# first proxy has 1123 participating accounts");
    await appendAccountFile(accountfilename, accountA);

    await timeout(5000);

    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }


    for (let numits = 0; numits < 10; numits++) {

      console.log("making proxy1 participant ", numits);
      accountB = await newUser(faucet);
      await accountB.sdk.genericAction('pushTransaction', {
        action: 'trnsfiopubky',
        account: 'fio.token',
        data: {
          payee_public_key: accountF.publicKey,
          amount: 1700000000000,
          max_fee: config.maxFee,
          actor: accountB.account,
          tpid: accountA.address
        }
      });

      await appendAccountFile(accountfilename, accountB);


    } //end for loop


    const result1 = await accountA.sdk.genericAction('pushTransaction', {
      action: 'setvoting',
      account: 'eosio',
      data: {
        voteraccount: accountA.account,
        last_vote_weight:  120000000000000,
        proxy_vote_weight: 120000000000
      }
    })



  })

  it(`Proxy who has voted for producers, last vote weight and proxied negative`, async () => {


    ///////////proxy has 10 participants

    accountA = await newUser(faucet);


    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.register_proxy.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }

    await appendCommentAccountFile(accountfilename, "# first proxy has 1123 participating accounts");
    await appendAccountFile(accountfilename, accountA);

    await timeout(5000);

    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }


    for (let numits = 0; numits < 10; numits++) {

      console.log("making proxy1 participant ", numits);
      accountB = await newUser(faucet);
      await accountB.sdk.genericAction('pushTransaction', {
        action: 'trnsfiopubky',
        account: 'fio.token',
        data: {
          payee_public_key: accountF.publicKey,
          amount: 1700000000000,
          max_fee: config.maxFee,
          actor: accountB.account,
          tpid: accountA.address
        }
      });

      await appendAccountFile(accountfilename, accountB);


    } //end for loop


    const result1 = await accountA.sdk.genericAction('pushTransaction', {
      action: 'setvoting',
      account: 'eosio',
      data: {
        voteraccount: accountA.account,
        last_vote_weight:  -120000000000000,
        proxy_vote_weight: -120000000000
      }
    })



  })


  it(`Proxy who has voted for [] producers, last vote weight and proxied less than actual`, async () => {


    ///////////proxy has 10 participants

    accountA = await newUser(faucet);


    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.register_proxy.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }

    await appendCommentAccountFile(accountfilename, "# first proxy has 1123 participating accounts");
    await appendAccountFile(accountfilename, accountA);

    await timeout(5000);

    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [],
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }


    try {
      for (let numits = 0; numits < 10; numits++) {

        console.log("making proxy1 participant ", numits);
        accountB = await newUser(faucet);
        await accountB.sdk.genericAction('pushTransaction', {
          action: 'trnsfiopubky',
          account: 'fio.token',
          data: {
            payee_public_key: accountF.publicKey,
            amount: 1700000000000,
            max_fee: config.maxFee,
            actor: accountB.account,
            tpid: accountA.address
          }
        });

        await appendAccountFile(accountfilename, accountB);


      } //end for loop

    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }


    const result1 = await accountA.sdk.genericAction('pushTransaction', {
      action: 'setvoting',
      account: 'eosio',
      data: {
        voteraccount: accountA.account,
        last_vote_weight:  120000000000,
        proxy_vote_weight: 120000000000
      }
    })



  })

  it(`Proxy who has voted for [] producers, last vote weight and proxied more than actual`, async () => {


    ///////////proxy has 10 participants

    accountA = await newUser(faucet);


    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.register_proxy.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }

    await appendCommentAccountFile(accountfilename, "# first proxy has 1123 participating accounts");
    await appendAccountFile(accountfilename, accountA);

    await timeout(5000);

    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [],
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }


    for (let numits = 0; numits < 10; numits++) {

      console.log("making proxy1 participant ", numits);
      accountB = await newUser(faucet);
      await accountB.sdk.genericAction('pushTransaction', {
        action: 'trnsfiopubky',
        account: 'fio.token',
        data: {
          payee_public_key: accountF.publicKey,
          amount: 1700000000000,
          max_fee: config.maxFee,
          actor: accountB.account,
          tpid: accountA.address
        }
      });

      await appendAccountFile(accountfilename, accountB);


    } //end for loop


    const result1 = await accountA.sdk.genericAction('pushTransaction', {
      action: 'setvoting',
      account: 'eosio',
      data: {
        voteraccount: accountA.account,
        last_vote_weight:  120000000000000,
        proxy_vote_weight: 120000000000000
      }
    })



  })

  it(`Proxy who has voted for [] producers, last vote weight more than actual and proxied less than actual`, async () => {


    ///////////proxy has 10 participants

    accountA = await newUser(faucet);


    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.register_proxy.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }

    await appendCommentAccountFile(accountfilename, "# first proxy has 1123 participating accounts");
    await appendAccountFile(accountfilename, accountA);

    await timeout(5000);

    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [],
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }


    for (let numits = 0; numits < 10; numits++) {

      console.log("making proxy1 participant ", numits);
      accountB = await newUser(faucet);
      await accountB.sdk.genericAction('pushTransaction', {
        action: 'trnsfiopubky',
        account: 'fio.token',
        data: {
          payee_public_key: accountF.publicKey,
          amount: 1700000000000,
          max_fee: config.maxFee,
          actor: accountB.account,
          tpid: accountA.address
        }
      });

      await appendAccountFile(accountfilename, accountB);


    } //end for loop


    const result1 = await accountA.sdk.genericAction('pushTransaction', {
      action: 'setvoting',
      account: 'eosio',
      data: {
        voteraccount: accountA.account,
        last_vote_weight:  120000000000000,
        proxy_vote_weight: 120000000000
      }
    })



  })

  it(`Proxy who has voted for [] producers, last vote weight and proxied negative`, async () => {


    ///////////proxy has 10 participants

    accountA = await newUser(faucet);


    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.register_proxy.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }

    await appendCommentAccountFile(accountfilename, "# first proxy has 1123 participating accounts");
    await appendAccountFile(accountfilename, accountA);

    await timeout(5000);

    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [],
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }


    for (let numits = 0; numits < 10; numits++) {

      console.log("making proxy1 participant ", numits);
      accountB = await newUser(faucet);
      await accountB.sdk.genericAction('pushTransaction', {
        action: 'trnsfiopubky',
        account: 'fio.token',
        data: {
          payee_public_key: accountF.publicKey,
          amount: 1700000000000,
          max_fee: config.maxFee,
          actor: accountB.account,
          tpid: accountA.address
        }
      });

      await appendAccountFile(accountfilename, accountB);


    } //end for loop


    const result1 = await accountA.sdk.genericAction('pushTransaction', {
      action: 'setvoting',
      account: 'eosio',
      data: {
        voteraccount: accountA.account,
        last_vote_weight:  -120000000000000,
        proxy_vote_weight: -120000000000
      }
    })



  })

  //now do alot of proxies similar scale to main net voters
  it(`Initialize blockchain with voting proxy with 1123 participants`, async () => {

    accountA = await newUser(faucet);


    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.register_proxy.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }

    await appendCommentAccountFile(accountfilename, "# first proxy has 1123 participating accounts");
    await appendAccountFile(accountfilename, accountA);

    await timeout(5000);

    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }


    for (let numits = 0; numits < 1123; numits++) {

      console.log("making proxy1 participant ", numits);
      accountB = await newUser(faucet);
      await accountB.sdk.genericAction('pushTransaction', {
        action: 'trnsfiopubky',
        account: 'fio.token',
        data: {
          payee_public_key: accountF.publicKey,
          amount: 1700000000000,
          max_fee: config.maxFee,
          actor: accountB.account,
          tpid: accountA.address
        }
      });

      await appendAccountFile(accountfilename, accountB);


    } //end for loop



  })

  it(`Initialize blockchain with voting proxy with 342 participants`, async () => {

    accountA = await newUser(faucet);


    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.register_proxy.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }

    await appendCommentAccountFile(accountfilename, "# first proxy has 1123 participating accounts");
    await appendAccountFile(accountfilename, accountA);

    await timeout(5000);

    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }


    for (let numits = 0; numits < 342; numits++) {

      console.log("making proxy1 participant ", numits);
      accountB = await newUser(faucet);
      await accountB.sdk.genericAction('pushTransaction', {
        action: 'trnsfiopubky',
        account: 'fio.token',
        data: {
          payee_public_key: accountF.publicKey,
          amount: 1700000000000,
          max_fee: config.maxFee,
          actor: accountB.account,
          tpid: accountA.address
        }
      });

      await appendAccountFile(accountfilename, accountB);


    } //end for loop



  })

  it(`Initialize blockchain with voting proxy with 245 participants`, async () => {

    accountA = await newUser(faucet);


    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.register_proxy.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }

    await appendCommentAccountFile(accountfilename, "# first proxy has 1123 participating accounts");
    await appendAccountFile(accountfilename, accountA);

    await timeout(5000);

    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }


    for (let numits = 0; numits < 245; numits++) {

      console.log("making proxy1 participant ", numits);
      accountB = await newUser(faucet);
      await accountB.sdk.genericAction('pushTransaction', {
        action: 'trnsfiopubky',
        account: 'fio.token',
        data: {
          payee_public_key: accountF.publicKey,
          amount: 1700000000000,
          max_fee: config.maxFee,
          actor: accountB.account,
          tpid: accountA.address
        }
      });

      await appendAccountFile(accountfilename, accountB);


    } //end for loop



  })

  it(`Initialize blockchain with voting proxy with 95 participants`, async () => {

    accountA = await newUser(faucet);


    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.register_proxy.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }

    await appendCommentAccountFile(accountfilename, "# first proxy has 1123 participating accounts");
    await appendAccountFile(accountfilename, accountA);

    await timeout(5000);

    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }


    for (let numits = 0; numits < 95; numits++) {

      console.log("making proxy1 participant ", numits);
      accountB = await newUser(faucet);
      await accountB.sdk.genericAction('pushTransaction', {
        action: 'trnsfiopubky',
        account: 'fio.token',
        data: {
          payee_public_key: accountF.publicKey,
          amount: 1700000000000,
          max_fee: config.maxFee,
          actor: accountB.account,
          tpid: accountA.address
        }
      });

      await appendAccountFile(accountfilename, accountB);


    } //end for loop



  })

  it(`Initialize blockchain with voting proxy with 15 participants`, async () => {

    accountA = await newUser(faucet);


    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.register_proxy.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }

    await appendCommentAccountFile(accountfilename, "# first proxy has 1123 participating accounts");
    await appendAccountFile(accountfilename, accountA);

    await timeout(5000);

    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }


    for (let numits = 0; numits < 15; numits++) {

      console.log("making proxy1 participant ", numits);
      accountB = await newUser(faucet);
      await accountB.sdk.genericAction('pushTransaction', {
        action: 'trnsfiopubky',
        account: 'fio.token',
        data: {
          payee_public_key: accountF.publicKey,
          amount: 1700000000000,
          max_fee: config.maxFee,
          actor: accountB.account,
          tpid: accountA.address
        }
      });

      await appendAccountFile(accountfilename, accountB);


    } //end for loop



  })

  it(`Initialize blockchain with voting proxy with 15 participants`, async () => {

    accountA = await newUser(faucet);


    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.register_proxy.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }

    await appendCommentAccountFile(accountfilename, "# first proxy has 1123 participating accounts");
    await appendAccountFile(accountfilename, accountA);

    await timeout(5000);

    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }


    for (let numits = 0; numits < 15; numits++) {

      console.log("making proxy1 participant ", numits);
      accountB = await newUser(faucet);
      await accountB.sdk.genericAction('pushTransaction', {
        action: 'trnsfiopubky',
        account: 'fio.token',
        data: {
          payee_public_key: accountF.publicKey,
          amount: 1700000000000,
          max_fee: config.maxFee,
          actor: accountB.account,
          tpid: accountA.address
        }
      });

      await appendAccountFile(accountfilename, accountB);


    } //end for loop



  })

  it(`Initialize blockchain with voting proxy with 15 participants`, async () => {

    accountA = await newUser(faucet);


    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.register_proxy.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }

    await appendCommentAccountFile(accountfilename, "# first proxy has 1123 participating accounts");
    await appendAccountFile(accountfilename, accountA);

    await timeout(5000);

    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }


    for (let numits = 0; numits < 15; numits++) {

      console.log("making proxy1 participant ", numits);
      accountB = await newUser(faucet);
      await accountB.sdk.genericAction('pushTransaction', {
        action: 'trnsfiopubky',
        account: 'fio.token',
        data: {
          payee_public_key: accountF.publicKey,
          amount: 1700000000000,
          max_fee: config.maxFee,
          actor: accountB.account,
          tpid: accountA.address
        }
      });

      await appendAccountFile(accountfilename, accountB);


    } //end for loop



  })

  it(`Initialize blockchain with voting proxy with 15 participants`, async () => {

    accountA = await newUser(faucet);


    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.register_proxy.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }

    await appendCommentAccountFile(accountfilename, "# first proxy has 1123 participating accounts");
    await appendAccountFile(accountfilename, accountA);

    await timeout(5000);

    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }


    for (let numits = 0; numits < 15; numits++) {

      console.log("making proxy1 participant ", numits);
      accountB = await newUser(faucet);
      await accountB.sdk.genericAction('pushTransaction', {
        action: 'trnsfiopubky',
        account: 'fio.token',
        data: {
          payee_public_key: accountF.publicKey,
          amount: 1700000000000,
          max_fee: config.maxFee,
          actor: accountB.account,
          tpid: accountA.address
        }
      });

      await appendAccountFile(accountfilename, accountB);


    } //end for loop



  })

  it(`Initialize blockchain with voting proxy with 15 participants`, async () => {

    accountA = await newUser(faucet);


    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.register_proxy.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }

    await appendCommentAccountFile(accountfilename, "# first proxy has 1123 participating accounts");
    await appendAccountFile(accountfilename, accountA);

    await timeout(5000);

    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }


    for (let numits = 0; numits < 15; numits++) {

      console.log("making proxy1 participant ", numits);
      accountB = await newUser(faucet);
      await accountB.sdk.genericAction('pushTransaction', {
        action: 'trnsfiopubky',
        account: 'fio.token',
        data: {
          payee_public_key: accountF.publicKey,
          amount: 1700000000000,
          max_fee: config.maxFee,
          actor: accountB.account,
          tpid: accountA.address
        }
      });

      await appendAccountFile(accountfilename, accountB);


    } //end for loop



  })

  it(`Initialize blockchain with voting proxy with 15 participants`, async () => {

    accountA = await newUser(faucet);


    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.register_proxy.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }

    await appendCommentAccountFile(accountfilename, "# first proxy has 1123 participating accounts");
    await appendAccountFile(accountfilename, accountA);

    await timeout(5000);

    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }


    for (let numits = 0; numits < 15; numits++) {

      console.log("making proxy1 participant ", numits);
      accountB = await newUser(faucet);
      await accountB.sdk.genericAction('pushTransaction', {
        action: 'trnsfiopubky',
        account: 'fio.token',
        data: {
          payee_public_key: accountF.publicKey,
          amount: 1700000000000,
          max_fee: config.maxFee,
          actor: accountB.account,
          tpid: accountA.address
        }
      });

      await appendAccountFile(accountfilename, accountB);


    } //end for loop



  })

  it(`Initialize blockchain with voting proxy with 15 participants`, async () => {

    accountA = await newUser(faucet);


    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.register_proxy.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }

    await appendCommentAccountFile(accountfilename, "# first proxy has 1123 participating accounts");
    await appendAccountFile(accountfilename, accountA);

    await timeout(5000);

    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }


    for (let numits = 0; numits < 15; numits++) {

      console.log("making proxy1 participant ", numits);
      accountB = await newUser(faucet);
      await accountB.sdk.genericAction('pushTransaction', {
        action: 'trnsfiopubky',
        account: 'fio.token',
        data: {
          payee_public_key: accountF.publicKey,
          amount: 1700000000000,
          max_fee: config.maxFee,
          actor: accountB.account,
          tpid: accountA.address
        }
      });

      await appendAccountFile(accountfilename, accountB);


    } //end for loop



  })

  it(`Initialize blockchain with voting proxy with 15 participants`, async () => {

    accountA = await newUser(faucet);


    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.register_proxy.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }

    await appendCommentAccountFile(accountfilename, "# first proxy has 1123 participating accounts");
    await appendAccountFile(accountfilename, accountA);

    await timeout(5000);

    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }


    for (let numits = 0; numits < 15; numits++) {

      console.log("making proxy1 participant ", numits);
      accountB = await newUser(faucet);
      await accountB.sdk.genericAction('pushTransaction', {
        action: 'trnsfiopubky',
        account: 'fio.token',
        data: {
          payee_public_key: accountF.publicKey,
          amount: 1700000000000,
          max_fee: config.maxFee,
          actor: accountB.account,
          tpid: accountA.address
        }
      });

      await appendAccountFile(accountfilename, accountB);


    } //end for loop



  })

  it(`Initialize blockchain with voting proxy with 15 participants`, async () => {

    accountA = await newUser(faucet);


    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.register_proxy.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }

    await appendCommentAccountFile(accountfilename, "# first proxy has 1123 participating accounts");
    await appendAccountFile(accountfilename, accountA);

    await timeout(5000);

    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }


    for (let numits = 0; numits < 15; numits++) {

      console.log("making proxy1 participant ", numits);
      accountB = await newUser(faucet);
      await accountB.sdk.genericAction('pushTransaction', {
        action: 'trnsfiopubky',
        account: 'fio.token',
        data: {
          payee_public_key: accountF.publicKey,
          amount: 1700000000000,
          max_fee: config.maxFee,
          actor: accountB.account,
          tpid: accountA.address
        }
      });

      await appendAccountFile(accountfilename, accountB);


    } //end for loop



  })

  it(`Initialize blockchain with voting proxy with 15 participants`, async () => {

    accountA = await newUser(faucet);


    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.register_proxy.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }

    await appendCommentAccountFile(accountfilename, "# first proxy has 1123 participating accounts");
    await appendAccountFile(accountfilename, accountA);

    await timeout(5000);

    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }


    for (let numits = 0; numits < 15; numits++) {

      console.log("making proxy1 participant ", numits);
      accountB = await newUser(faucet);
      await accountB.sdk.genericAction('pushTransaction', {
        action: 'trnsfiopubky',
        account: 'fio.token',
        data: {
          payee_public_key: accountF.publicKey,
          amount: 1700000000000,
          max_fee: config.maxFee,
          actor: accountB.account,
          tpid: accountA.address
        }
      });

      await appendAccountFile(accountfilename, accountB);


    } //end for loop



  })

  it(`Initialize blockchain with voting proxy with 15 participants`, async () => {

    accountA = await newUser(faucet);


    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.register_proxy.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }

    await appendCommentAccountFile(accountfilename, "# first proxy has 1123 participating accounts");
    await appendAccountFile(accountfilename, accountA);

    await timeout(5000);

    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }


    for (let numits = 0; numits < 15; numits++) {

      console.log("making proxy1 participant ", numits);
      accountB = await newUser(faucet);
      await accountB.sdk.genericAction('pushTransaction', {
        action: 'trnsfiopubky',
        account: 'fio.token',
        data: {
          payee_public_key: accountF.publicKey,
          amount: 1700000000000,
          max_fee: config.maxFee,
          actor: accountB.account,
          tpid: accountA.address
        }
      });

      await appendAccountFile(accountfilename, accountB);


    } //end for loop



  })

  it(`Initialize blockchain with voting proxy with 15 participants`, async () => {

    accountA = await newUser(faucet);


    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.register_proxy.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }

    await appendCommentAccountFile(accountfilename, "# first proxy has 1123 participating accounts");
    await appendAccountFile(accountfilename, accountA);

    await timeout(5000);

    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }


    for (let numits = 0; numits < 15; numits++) {

      console.log("making proxy1 participant ", numits);
      accountB = await newUser(faucet);
      await accountB.sdk.genericAction('pushTransaction', {
        action: 'trnsfiopubky',
        account: 'fio.token',
        data: {
          payee_public_key: accountF.publicKey,
          amount: 1700000000000,
          max_fee: config.maxFee,
          actor: accountB.account,
          tpid: accountA.address
        }
      });

      await appendAccountFile(accountfilename, accountB);


    } //end for loop



  })

  it(`Initialize blockchain with voting proxy with 15 participants`, async () => {

    accountA = await newUser(faucet);


    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.register_proxy.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }

    await appendCommentAccountFile(accountfilename, "# first proxy has 1123 participating accounts");
    await appendAccountFile(accountfilename, accountA);

    await timeout(5000);

    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }


    for (let numits = 0; numits < 15; numits++) {

      console.log("making proxy1 participant ", numits);
      accountB = await newUser(faucet);
      await accountB.sdk.genericAction('pushTransaction', {
        action: 'trnsfiopubky',
        account: 'fio.token',
        data: {
          payee_public_key: accountF.publicKey,
          amount: 1700000000000,
          max_fee: config.maxFee,
          actor: accountB.account,
          tpid: accountA.address
        }
      });

      await appendAccountFile(accountfilename, accountB);


    } //end for loop



  })

  it(`Initialize blockchain with voting proxy with 15 participants`, async () => {

    accountA = await newUser(faucet);


    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.register_proxy.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }

    await appendCommentAccountFile(accountfilename, "# first proxy has 1123 participating accounts");
    await appendAccountFile(accountfilename, accountA);

    await timeout(5000);

    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }


    for (let numits = 0; numits < 15; numits++) {

      console.log("making proxy1 participant ", numits);
      accountB = await newUser(faucet);
      await accountB.sdk.genericAction('pushTransaction', {
        action: 'trnsfiopubky',
        account: 'fio.token',
        data: {
          payee_public_key: accountF.publicKey,
          amount: 1700000000000,
          max_fee: config.maxFee,
          actor: accountB.account,
          tpid: accountA.address
        }
      });

      await appendAccountFile(accountfilename, accountB);


    } //end for loop



  })

  it(`Initialize blockchain with voting proxy with 15 participants`, async () => {

    accountA = await newUser(faucet);


    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.register_proxy.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }

    await appendCommentAccountFile(accountfilename, "# first proxy has 1123 participating accounts");
    await appendAccountFile(accountfilename, accountA);

    await timeout(5000);

    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }


    for (let numits = 0; numits < 15; numits++) {

      console.log("making proxy1 participant ", numits);
      accountB = await newUser(faucet);
      await accountB.sdk.genericAction('pushTransaction', {
        action: 'trnsfiopubky',
        account: 'fio.token',
        data: {
          payee_public_key: accountF.publicKey,
          amount: 1700000000000,
          max_fee: config.maxFee,
          actor: accountB.account,
          tpid: accountA.address
        }
      });

      await appendAccountFile(accountfilename, accountB);


    } //end for loop



  })

  it(`Initialize blockchain with voting proxy with 15 participants`, async () => {

    accountA = await newUser(faucet);


    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.register_proxy.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }

    await appendCommentAccountFile(accountfilename, "# first proxy has 1123 participating accounts");
    await appendAccountFile(accountfilename, accountA);

    await timeout(5000);

    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }


    for (let numits = 0; numits < 15; numits++) {

      console.log("making proxy1 participant ", numits);
      accountB = await newUser(faucet);
      await accountB.sdk.genericAction('pushTransaction', {
        action: 'trnsfiopubky',
        account: 'fio.token',
        data: {
          payee_public_key: accountF.publicKey,
          amount: 1700000000000,
          max_fee: config.maxFee,
          actor: accountB.account,
          tpid: accountA.address
        }
      });

      await appendAccountFile(accountfilename, accountB);


    } //end for loop



  })

  it(`Initialize blockchain with voting proxy with 15 participants`, async () => {

    accountA = await newUser(faucet);


    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.register_proxy.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }

    await appendCommentAccountFile(accountfilename, "# first proxy has 1123 participating accounts");
    await appendAccountFile(accountfilename, accountA);

    await timeout(5000);

    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }


    for (let numits = 0; numits < 15; numits++) {

      console.log("making proxy1 participant ", numits);
      accountB = await newUser(faucet);
      await accountB.sdk.genericAction('pushTransaction', {
        action: 'trnsfiopubky',
        account: 'fio.token',
        data: {
          payee_public_key: accountF.publicKey,
          amount: 1700000000000,
          max_fee: config.maxFee,
          actor: accountB.account,
          tpid: accountA.address
        }
      });

      await appendAccountFile(accountfilename, accountB);


    } //end for loop



  })


})

describe.only(`audit machine dev testing. minimal dev test check audit phase transitions`, () => {

  let accountA, accountB, accountC, accountD, accountE, accountF, accountG,total_voted_fio, start_bp_votes, proxied_weightC, proxied_weightB,  total_bp_votes,regproxyfee

  //NOTE -- this test assumes a server is set with just a few voters and nothing more

  it(`Create users`, async () => {
    accountA = await newUser(faucet);
    accountB = await newUser(faucet);
    accountC = await newUser(faucet);
    accountD = await newUser(faucet);
    accountE = await newUser(faucet);
    accountF = await newUser(faucet);
    accountG = await newUser(faucet);
  })


  it(`call voteproxy, verify reset`, async () => {

    try {
      const result = await accountB.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: accountB.address,
          actor: accountB.account,
          max_fee: config.api.register_proxy.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }

  })


  it(`call auditvote, verify phase 1`, async () => {
    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'auditvote',
        account: 'eosio',
        data: {
          actor: accountA.account,
          max_fee: config.api.register_proxy.fee
        }
      })
      console.log('Result: ', result)
      expect(result.status).to.equal('OK')
      expect(result.audit_phase).to.equal('2')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }


  })

  it('Confirm audit global info:  ', async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'auditglobal',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      let result  = await callFioApi("get_table_rows", json);
      console.log('result: ', result);

     // expect(voters.rows[voter].owner).to.equal(proxyA1.account);
     // expect(voters.rows[voter].is_proxy).to.equal(0);
     // expect(voters.rows[voter].fioaddress).to.equal('');
      //expect(voters.rows[voter].addresshash).to.equal('0x00000000000000000000000000000000');

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`call auditvote, verify phase 2`, async () => {

    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'auditvote',
        account: 'eosio',
        data: {
          actor: accountA.account,
          max_fee: config.api.register_proxy.fee +2
        }
      })
      console.log('Result: ', result)
      expect(result.status).to.equal('OK')
      expect(result.audit_phase).to.equal('3')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }



  })

  it(`call auditvote, verify phase 3`, async () => {



    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'auditvote',
        account: 'eosio',
        data: {
          actor: accountA.account,
          max_fee: config.api.register_proxy.fee +3
        }
      })
      console.log('Result: ', result)
      expect(result.status).to.equal('OK')
      expect(result.audit_phase).to.equal('4')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }



  })

  it(`call auditvote, verify phase 4`, async () => {



    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'auditvote',
        account: 'eosio',
        data: {
          actor: accountA.account,
          max_fee: config.api.register_proxy.fee+4
        }
      })
      console.log('Result: ', result)
      expect(result.status).to.equal('OK')
      expect(result.audit_phase).to.equal('1')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }



  })

  it(`call auditvote, verify phase 1`, async () => {



    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'auditvote',
        account: 'eosio',
        data: {
          actor: accountA.account,
          max_fee: config.api.register_proxy.fee+1
        }
      })
      console.log('Result: ', result)
      expect(result.status).to.equal('OK')
      expect(result.audit_phase).to.equal('2')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }



  })



})

describe.only(`vote proxy audit reset dev testing.`, () => {

  let accountA, accountB, accountC, accountD, accountE, accountF, accountG,total_voted_fio, start_bp_votes, proxied_weightC, proxied_weightB,  total_bp_votes,regproxyfee

  let auditphase;
  //let accountfilename = '../edscripts/votingAccounts.csv';

  it(`Create users`, async () => {
    accountA = await newUser(faucet);
    accountB = await newUser(faucet);
    accountC = await newUser(faucet);
    accountD = await newUser(faucet);
    accountE = await newUser(faucet);
    accountF = await newUser(faucet);
    accountG = await newUser(faucet);
  })



  it(`call auditvote, verify phase 1`, async () => {
    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'auditvote',
        account: 'eosio',
        data: {
          actor: accountA.account,
          max_fee: config.api.register_proxy.fee
        }
      })
      console.log('Result: ', result)
      expect(result.status).to.equal('OK')
     // expect(result.audit_phase).to.equal('2')
      auditphase = result.audit_phase;
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }


  })

  it('Confirm audit global info:  ', async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'auditglobal',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      let result  = await callFioApi("get_table_rows", json);
      console.log('result: ', result);

      expect(result.rows[0].audit_reset).to.equal(0);
      // expect(voters.rows[voter].is_proxy).to.equal(0);
      // expect(voters.rows[voter].fioaddress).to.equal('');
      //expect(voters.rows[voter].addresshash).to.equal('0x00000000000000000000000000000000');

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`call voteproxy, verify reset`, async () => {

    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: accountA.address,
          actor: accountA.account,
          max_fee: config.api.register_proxy.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }

  })

  it('Confirm audit global info reset is set:  ', async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'auditglobal',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      let result  = await callFioApi("get_table_rows", json);
      console.log('result: ', result);

      expect(result.rows[0].audit_reset).to.equal(1);
      // expect(voters.rows[voter].is_proxy).to.equal(0);
      // expect(voters.rows[voter].fioaddress).to.equal('');
      //expect(voters.rows[voter].addresshash).to.equal('0x00000000000000000000000000000000');

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`call auditvote, verify phase 1 completed cur phase 2`, async () => {



    try {
      const result = await accountB.sdk.genericAction('pushTransaction', {
        action: 'auditvote',
        account: 'eosio',
        data: {
          actor: accountB.account,
          max_fee: config.api.register_proxy.fee +3
        }
      })
      console.log('Result: ', result)
      expect(result.status).to.equal('OK')
      expect(result.audit_phase).to.equal('2')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }



  })

  it('Confirm audit global info:  ', async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'auditglobal',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      let result  = await callFioApi("get_table_rows", json);
      console.log('result: ', result);

      expect(result.rows[0].audit_reset).to.equal(0);
      // expect(voters.rows[voter].is_proxy).to.equal(0);
      // expect(voters.rows[voter].fioaddress).to.equal('');
      //expect(voters.rows[voter].addresshash).to.equal('0x00000000000000000000000000000000');

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })


})

describe.only(`vote producer audit reset dev testing.`, () => {

  let accountA, accountB, accountC, accountD, accountE, accountF, accountG,total_voted_fio, start_bp_votes, proxied_weightC, proxied_weightB,  total_bp_votes,regproxyfee

  let auditphase;
  //let accountfilename = '../edscripts/votingAccounts.csv';

  it(`Create users`, async () => {
    accountA = await newUser(faucet);
    accountB = await newUser(faucet);
    accountC = await newUser(faucet);
    accountD = await newUser(faucet);
    accountE = await newUser(faucet);
    accountF = await newUser(faucet);
    accountG = await newUser(faucet);
  })



  it(`call auditvote, verify phase 1`, async () => {
    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'auditvote',
        account: 'eosio',
        data: {
          actor: accountA.account,
          max_fee: config.api.register_proxy.fee
        }
      })
      console.log('Result: ', result)
      expect(result.status).to.equal('OK')
      // expect(result.audit_phase).to.equal('2')
      auditphase = result.audit_phase;
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }


  })

  it('Confirm audit global info:  ', async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'auditglobal',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      let result  = await callFioApi("get_table_rows", json);
      console.log('result: ', result);

      expect(result.rows[0].audit_reset).to.equal(0);
      // expect(voters.rows[voter].is_proxy).to.equal(0);
      // expect(voters.rows[voter].fioaddress).to.equal('');
      //expect(voters.rows[voter].addresshash).to.equal('0x00000000000000000000000000000000');

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`call voteproducer, verify reset`, async () => {

    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: accountA.address,
          actor: accountA.account,
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

  it('Confirm audit global info reset is set:  ', async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'auditglobal',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      let result  = await callFioApi("get_table_rows", json);
      console.log('result: ', result);

      expect(result.rows[0].audit_reset).to.equal(1);
      // expect(voters.rows[voter].is_proxy).to.equal(0);
      // expect(voters.rows[voter].fioaddress).to.equal('');
      //expect(voters.rows[voter].addresshash).to.equal('0x00000000000000000000000000000000');

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`call auditvote, verify phase 1 completed cur phase 2`, async () => {



    try {
      const result = await accountB.sdk.genericAction('pushTransaction', {
        action: 'auditvote',
        account: 'eosio',
        data: {
          actor: accountB.account,
          max_fee: config.api.register_proxy.fee +3
        }
      })
      console.log('Result: ', result)
      expect(result.status).to.equal('OK')
      expect(result.audit_phase).to.equal('2')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }



  })

  it('Confirm audit global info:  ', async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'auditglobal',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      let result  = await callFioApi("get_table_rows", json);
      console.log('result: ', result);

      expect(result.rows[0].audit_reset).to.equal(0);
      // expect(voters.rows[voter].is_proxy).to.equal(0);
      // expect(voters.rows[voter].fioaddress).to.equal('');
      //expect(voters.rows[voter].addresshash).to.equal('0x00000000000000000000000000000000');

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })


})

describe.skip(`register producer audit reset  dev testing.`, () => {

  let accountA, accountB, accountC, accountD, accountE, accountF, accountG,total_voted_fio, start_bp_votes, proxied_weightC, proxied_weightB,  total_bp_votes,regproxyfee

  let auditphase;
  //let accountfilename = '../edscripts/votingAccounts.csv';

  it(`Create users`, async () => {
    accountA = await newUser(faucet);
    accountB = await newUser(faucet);
    accountC = await newUser(faucet);
    accountD = await newUser(faucet);
    accountE = await newUser(faucet);
    accountF = await newUser(faucet);
    accountG = await newUser(faucet);
  })



  it(`call auditvote, verify phase 1`, async () => {
    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'auditvote',
        account: 'eosio',
        data: {
          actor: accountA.account,
          max_fee: config.api.register_proxy.fee
        }
      })
      console.log('Result: ', result)
      expect(result.status).to.equal('OK')
      // expect(result.audit_phase).to.equal('2')
      auditphase = result.audit_phase;
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }


  })

  it('Confirm audit global info:  ', async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'auditglobal',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      let result  = await callFioApi("get_table_rows", json);
      console.log('result: ', result);

      expect(result.rows[0].audit_reset).to.equal(0);
      // expect(voters.rows[voter].is_proxy).to.equal(0);
      // expect(voters.rows[voter].fioaddress).to.equal('');
      //expect(voters.rows[voter].addresshash).to.equal('0x00000000000000000000000000000000');

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`call registerproducer, verify reset`, async () => {
     try{
        result = await accountA.sdk.genericAction('pushTransaction', {
          action: 'regproducer',
          account: 'eosio',
          data: {
            fio_address: accountA.address,
            fio_pub_key: accountA.publicKey,
            url: "https://mywebsite.io/",
            location: 80,
            max_fee: config.api.register_producer.fee
          }
        })
      } catch (err) {
        console.log('Error: ', err)
        expect(err).to.equal('null')
      }


  })

  it('Confirm audit global info reset is set:  ', async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'auditglobal',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      let result  = await callFioApi("get_table_rows", json);
      console.log('result: ', result);

      expect(result.rows[0].audit_reset).to.equal(1);
      // expect(voters.rows[voter].is_proxy).to.equal(0);
      // expect(voters.rows[voter].fioaddress).to.equal('');
      //expect(voters.rows[voter].addresshash).to.equal('0x00000000000000000000000000000000');

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`call auditvote, verify phase 1 completed cur phase 2`, async () => {



    try {
      const result = await accountB.sdk.genericAction('pushTransaction', {
        action: 'auditvote',
        account: 'eosio',
        data: {
          actor: accountB.account,
          max_fee: config.api.register_proxy.fee +3
        }
      })
      console.log('Result: ', result)
      expect(result.status).to.equal('OK')
      expect(result.audit_phase).to.equal('2')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }



  })

  it('Confirm audit global info:  ', async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'auditglobal',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      let result  = await callFioApi("get_table_rows", json);
      console.log('result: ', result);

      expect(result.rows[0].audit_reset).to.equal(0);
      // expect(voters.rows[voter].is_proxy).to.equal(0);
      // expect(voters.rows[voter].fioaddress).to.equal('');
      //expect(voters.rows[voter].addresshash).to.equal('0x00000000000000000000000000000000');

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })


})

describe.only(`unregister producer audit reset dev testing.`, () => {

  let accountA, accountB, accountC, accountD, accountE, accountF, accountG,total_voted_fio, start_bp_votes, proxied_weightC, proxied_weightB,  total_bp_votes,regproxyfee

  let auditphase;
  //let accountfilename = '../edscripts/votingAccounts.csv';

  it(`Create users`, async () => {
    accountA = await newUser(faucet);
    accountB = await newUser(faucet);
    accountC = await newUser(faucet);
    accountD = await newUser(faucet);
    accountE = await newUser(faucet);
    accountF = await newUser(faucet);
    accountG = await newUser(faucet);
  })



  it(`call auditvote, verify phase 1`, async () => {
    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'auditvote',
        account: 'eosio',
        data: {
          actor: accountA.account,
          max_fee: config.api.register_proxy.fee
        }
      })
      console.log('Result: ', result)
      expect(result.status).to.equal('OK')
      // expect(result.audit_phase).to.equal('2')
      auditphase = result.audit_phase;
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }


  })

  it('Confirm audit global info:  ', async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'auditglobal',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      let result  = await callFioApi("get_table_rows", json);
      console.log('result: ', result);

      expect(result.rows[0].audit_reset).to.equal(0);
      // expect(voters.rows[voter].is_proxy).to.equal(0);
      // expect(voters.rows[voter].fioaddress).to.equal('');
      //expect(voters.rows[voter].addresshash).to.equal('0x00000000000000000000000000000000');

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`call registerproducer, verify reset`, async () => {
    try{
      result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: accountA.address,
          fio_pub_key: accountA.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }


  })

  it('Confirm audit global info reset is set:  ', async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'auditglobal',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      let result  = await callFioApi("get_table_rows", json);
      console.log('result: ', result);

      expect(result.rows[0].audit_reset).to.equal(1);
      // expect(voters.rows[voter].is_proxy).to.equal(0);
      // expect(voters.rows[voter].fioaddress).to.equal('');
      //expect(voters.rows[voter].addresshash).to.equal('0x00000000000000000000000000000000');

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`call auditvote, verify phase 1 completed cur phase 2`, async () => {



    try {
      const result = await accountB.sdk.genericAction('pushTransaction', {
        action: 'auditvote',
        account: 'eosio',
        data: {
          actor: accountB.account,
          max_fee: config.api.register_proxy.fee +3
        }
      })
      console.log('Result: ', result)
      expect(result.status).to.equal('OK')
      expect(result.audit_phase).to.equal('2')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }



  })

  it('Confirm audit global info:  ', async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'auditglobal',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      let result  = await callFioApi("get_table_rows", json);
      console.log('result: ', result);

      expect(result.rows[0].audit_reset).to.equal(0);
      // expect(voters.rows[voter].is_proxy).to.equal(0);
      // expect(voters.rows[voter].fioaddress).to.equal('');
      //expect(voters.rows[voter].addresshash).to.equal('0x00000000000000000000000000000000');

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`call unregprod, verify reset`, async () => {
    try{
      result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'unregprod',
        account: 'eosio',
        data: {
          fio_address: accountA.address,
          max_fee: config.api.register_producer.fee
        }
      })
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }


  })

  it('Confirm audit global info reset is set:  ', async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'auditglobal',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      let result  = await callFioApi("get_table_rows", json);
      console.log('result: ', result);

      expect(result.rows[0].audit_reset).to.equal(1);
      // expect(voters.rows[voter].is_proxy).to.equal(0);
      // expect(voters.rows[voter].fioaddress).to.equal('');
      //expect(voters.rows[voter].addresshash).to.equal('0x00000000000000000000000000000000');

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`call auditvote, verify phase 1 completed cur phase 2`, async () => {



    try {
      const result = await accountC.sdk.genericAction('pushTransaction', {
        action: 'auditvote',
        account: 'eosio',
        data: {
          actor: accountC.account,
          max_fee: config.api.register_proxy.fee +3
        }
      })
      console.log('Result: ', result)
      expect(result.status).to.equal('OK')
      expect(result.audit_phase).to.equal('2')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }



  })

  it('Confirm audit global info:  ', async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'auditglobal',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      let result  = await callFioApi("get_table_rows", json);
      console.log('result: ', result);

      expect(result.rows[0].audit_reset).to.equal(0);
      // expect(voters.rows[voter].is_proxy).to.equal(0);
      // expect(voters.rows[voter].fioaddress).to.equal('');
      //expect(voters.rows[voter].addresshash).to.equal('0x00000000000000000000000000000000');

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })


})

describe.skip(`transfer fio, sender is in voters table reset dev testing.`, () => {

  let accountA, accountB, accountC, accountD, accountE, accountF, accountG,total_voted_fio, start_bp_votes, proxied_weightC, proxied_weightB,  total_bp_votes,regproxyfee

  let auditphase;
  //let accountfilename = '../edscripts/votingAccounts.csv';

  it(`Create users`, async () => {
    accountA = await newUser(faucet);
    accountB = await newUser(faucet);
    accountC = await newUser(faucet);
    accountD = await newUser(faucet);
    accountE = await newUser(faucet);
    accountF = await newUser(faucet);
    accountG = await newUser(faucet);
  })



  it(`call auditvote, verify phase 1`, async () => {
    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'auditvote',
        account: 'eosio',
        data: {
          actor: accountA.account,
          max_fee: config.api.register_proxy.fee
        }
      })
      console.log('Result: ', result)
      expect(result.status).to.equal('OK')
      // expect(result.audit_phase).to.equal('2')
      auditphase = result.audit_phase;
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }


  })

  it('Confirm audit global info:  ', async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'auditglobal',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      let result  = await callFioApi("get_table_rows", json);
      console.log('result: ', result);

      expect(result.rows[0].audit_reset).to.equal(0);
      // expect(voters.rows[voter].is_proxy).to.equal(0);
      // expect(voters.rows[voter].fioaddress).to.equal('');
      //expect(voters.rows[voter].addresshash).to.equal('0x00000000000000000000000000000000');

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`call voteproducer, verify reset`, async () => {

    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: accountA.address,
          actor: accountA.account,
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

  it(`call auditvote, verify phase 1 completed cur phase 2`, async () => {



    try {
      const result = await accountB.sdk.genericAction('pushTransaction', {
        action: 'auditvote',
        account: 'eosio',
        data: {
          actor: accountB.account,
          max_fee: config.api.register_proxy.fee +3
        }
      })
      console.log('Result: ', result)
      expect(result.status).to.equal('OK')
      expect(result.audit_phase).to.equal('2')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }



  })

  it('Confirm audit global info:  ', async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'auditglobal',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      let result  = await callFioApi("get_table_rows", json);
      console.log('result: ', result);

      expect(result.rows[0].audit_reset).to.equal(0);
      // expect(voters.rows[voter].is_proxy).to.equal(0);
      // expect(voters.rows[voter].fioaddress).to.equal('');
      //expect(voters.rows[voter].addresshash).to.equal('0x00000000000000000000000000000000');

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Send FIO from account in voters table, verify reset audit. `, async () => {
    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'trnsfiopubky',
        account: 'fio.token',
        data: {
          payee_public_key: accountB.publicKey,
          amount: 10000000000,
          max_fee: config.maxFee,
          tpid: ''
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null)
    }
  })

  it('Confirm audit global info reset is set:  ', async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'auditglobal',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      let result  = await callFioApi("get_table_rows", json);
      console.log('result: ', result);

      expect(result.rows[0].audit_reset).to.equal(1);
      // expect(voters.rows[voter].is_proxy).to.equal(0);
      // expect(voters.rows[voter].fioaddress).to.equal('');
      //expect(voters.rows[voter].addresshash).to.equal('0x00000000000000000000000000000000');

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`call auditvote, verify phase 1 completed cur phase 2`, async () => {



    try {
      const result = await accountB.sdk.genericAction('pushTransaction', {
        action: 'auditvote',
        account: 'eosio',
        data: {
          actor: accountB.account,
          max_fee: config.api.register_proxy.fee +1
        }
      })
      console.log('Result: ', result)
      expect(result.status).to.equal('OK')
      expect(result.audit_phase).to.equal('2')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }



  })

  it('Confirm audit global info:  ', async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'auditglobal',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      let result  = await callFioApi("get_table_rows", json);
      console.log('result: ', result);

      expect(result.rows[0].audit_reset).to.equal(0);
      // expect(voters.rows[voter].is_proxy).to.equal(0);
      // expect(voters.rows[voter].fioaddress).to.equal('');
      //expect(voters.rows[voter].addresshash).to.equal('0x00000000000000000000000000000000');

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })


})

describe.only(`transfer fio, receiver is in voters table reset dev testing.`, () => {

  let accountA, accountB, accountC, accountD, accountE, accountF, accountG,total_voted_fio, start_bp_votes, proxied_weightC, proxied_weightB,  total_bp_votes,regproxyfee

  let auditphase;
  //let accountfilename = '../edscripts/votingAccounts.csv';

  it(`Create users`, async () => {
    accountA = await newUser(faucet);
    accountB = await newUser(faucet);
    accountC = await newUser(faucet);
    accountD = await newUser(faucet);
    accountE = await newUser(faucet);
    accountF = await newUser(faucet);
    accountG = await newUser(faucet);
  })



  it(`call auditvote, verify phase 1`, async () => {
    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'auditvote',
        account: 'eosio',
        data: {
          actor: accountA.account,
          max_fee: config.api.register_proxy.fee
        }
      })
      console.log('Result: ', result)
      expect(result.status).to.equal('OK')
      // expect(result.audit_phase).to.equal('2')
      auditphase = result.audit_phase;
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }


  })

  it('Confirm audit global info:  ', async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'auditglobal',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      let result  = await callFioApi("get_table_rows", json);
      console.log('result: ', result);

      expect(result.rows[0].audit_reset).to.equal(0);
      // expect(voters.rows[voter].is_proxy).to.equal(0);
      // expect(voters.rows[voter].fioaddress).to.equal('');
      //expect(voters.rows[voter].addresshash).to.equal('0x00000000000000000000000000000000');

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`call voteproducer, verify reset`, async () => {

    try {
      const result = await accountB.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: accountB.address,
          actor: accountB.account,
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

  it(`call auditvote, verify phase 1 completed cur phase 2`, async () => {



    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'auditvote',
        account: 'eosio',
        data: {
          actor: accountA.account,
          max_fee: config.api.register_proxy.fee +3
        }
      })
      console.log('Result: ', result)
      expect(result.status).to.equal('OK')
      expect(result.audit_phase).to.equal('2')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }



  })

  it('Confirm audit global info:  ', async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'auditglobal',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      let result  = await callFioApi("get_table_rows", json);
      console.log('result: ', result);

      expect(result.rows[0].audit_reset).to.equal(0);
      // expect(voters.rows[voter].is_proxy).to.equal(0);
      // expect(voters.rows[voter].fioaddress).to.equal('');
      //expect(voters.rows[voter].addresshash).to.equal('0x00000000000000000000000000000000');

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Send FIO TO account in voters table, verify reset audit. `, async () => {
    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'trnsfiopubky',
        account: 'fio.token',
        data: {
          payee_public_key: accountB.publicKey,
          amount: 10000000000,
          max_fee: config.maxFee,
          tpid: ''
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null)
    }
  })

  it('Confirm audit global info reset is set:  ', async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'auditglobal',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      let result  = await callFioApi("get_table_rows", json);
      console.log('result: ', result);

      expect(result.rows[0].audit_reset).to.equal(1);
      // expect(voters.rows[voter].is_proxy).to.equal(0);
      // expect(voters.rows[voter].fioaddress).to.equal('');
      //expect(voters.rows[voter].addresshash).to.equal('0x00000000000000000000000000000000');

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`call auditvote, verify phase 1 completed cur phase 2`, async () => {



    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'auditvote',
        account: 'eosio',
        data: {
          actor: accountA.account,
          max_fee: config.api.register_proxy.fee +1
        }
      })
      console.log('Result: ', result)
      expect(result.status).to.equal('OK')
      expect(result.audit_phase).to.equal('2')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }



  })

  it('Confirm audit global info:  ', async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'auditglobal',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      let result  = await callFioApi("get_table_rows", json);
      console.log('result: ', result);

      expect(result.rows[0].audit_reset).to.equal(0);
      // expect(voters.rows[voter].is_proxy).to.equal(0);
      // expect(voters.rows[voter].fioaddress).to.equal('');
      //expect(voters.rows[voter].addresshash).to.equal('0x00000000000000000000000000000000');

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })


})

describe.only(`transfer locked fio, receiver is in voters table reset dev testing.`, () => {

  let accountA, accountB, accountC, accountD, accountE, accountF, accountG,total_voted_fio, start_bp_votes, proxied_weightC, proxied_weightB,  total_bp_votes,regproxyfee

  let auditphase;
  //let accountfilename = '../edscripts/votingAccounts.csv';

  it(`Create users`, async () => {
    accountA = await newUser(faucet);
    accountB = await newUser(faucet);
    accountC = await newUser(faucet);
    accountD = await newUser(faucet);
    accountE = await newUser(faucet);
    accountF = await newUser(faucet);
    accountG = await newUser(faucet);
  })



  it(`call auditvote, verify phase 1`, async () => {
    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'auditvote',
        account: 'eosio',
        data: {
          actor: accountA.account,
          max_fee: config.api.register_proxy.fee
        }
      })
      console.log('Result: ', result)
      expect(result.status).to.equal('OK')
      // expect(result.audit_phase).to.equal('2')
      auditphase = result.audit_phase;
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }


  })

  it('Confirm audit global info:  ', async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'auditglobal',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      let result  = await callFioApi("get_table_rows", json);
      console.log('result: ', result);

      expect(result.rows[0].audit_reset).to.equal(0);
      // expect(voters.rows[voter].is_proxy).to.equal(0);
      // expect(voters.rows[voter].fioaddress).to.equal('');
      //expect(voters.rows[voter].addresshash).to.equal('0x00000000000000000000000000000000');

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`call voteproducer, verify reset`, async () => {

    try {
      const result = await accountB.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: accountB.address,
          actor: accountB.account,
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

  it(`call auditvote, verify phase 1 completed cur phase 2`, async () => {



    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'auditvote',
        account: 'eosio',
        data: {
          actor: accountA.account,
          max_fee: config.api.register_proxy.fee +3
        }
      })
      console.log('Result: ', result)
      expect(result.status).to.equal('OK')
      expect(result.audit_phase).to.equal('2')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }



  })

  it('Confirm audit global info:  ', async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'auditglobal',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      let result  = await callFioApi("get_table_rows", json);
      console.log('result: ', result);

      expect(result.rows[0].audit_reset).to.equal(0);
      // expect(voters.rows[voter].is_proxy).to.equal(0);
      // expect(voters.rows[voter].fioaddress).to.equal('');
      //expect(voters.rows[voter].addresshash).to.equal('0x00000000000000000000000000000000');

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`transfer locked tokens to account in voters table, verify audit reset`, async () => {
    try {
      let fundsAmount = 10000000000;
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        data: {
          payee_public_key: accountB.publicKey,
          can_vote: 1,
          periods: [
            {
              duration: 20,
              amount: fundsAmount * .4,
            },
            {
              duration: 40,
              amount: fundsAmount * .6,
            }
          ],
          amount: fundsAmount,
          max_fee: config.api.transfer_tokens_pub_key.fee,
          tpid: ''
        }

      })
      expect(result.status).to.equal('OK');
      expect(result.fee_collected).to.equal(config.api.transfer_tokens_pub_key.fee);
    } catch (err) {
      console.log(' Error', err)
    }
  })

  it('Confirm audit global info reset is set:  ', async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'auditglobal',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      let result  = await callFioApi("get_table_rows", json);
      console.log('result: ', result);

      expect(result.rows[0].audit_reset).to.equal(1);
      // expect(voters.rows[voter].is_proxy).to.equal(0);
      // expect(voters.rows[voter].fioaddress).to.equal('');
      //expect(voters.rows[voter].addresshash).to.equal('0x00000000000000000000000000000000');

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`call auditvote, verify phase 1 completed cur phase 2`, async () => {



    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'auditvote',
        account: 'eosio',
        data: {
          actor: accountA.account,
          max_fee: config.api.register_proxy.fee +1
        }
      })
      console.log('Result: ', result)
      expect(result.status).to.equal('OK')
      expect(result.audit_phase).to.equal('2')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }



  })

  it('Confirm audit global info:  ', async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'auditglobal',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      let result  = await callFioApi("get_table_rows", json);
      console.log('result: ', result);

      expect(result.rows[0].audit_reset).to.equal(0);
      // expect(voters.rows[voter].is_proxy).to.equal(0);
      // expect(voters.rows[voter].fioaddress).to.equal('');
      //expect(voters.rows[voter].addresshash).to.equal('0x00000000000000000000000000000000');

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })


})

describe.skip(`transfer locked fio, sender is in voters table reset dev testing.`, () => {

  let accountA, accountB, accountC, accountD, accountE, accountF, accountG,total_voted_fio, start_bp_votes, proxied_weightC, proxied_weightB,  total_bp_votes,regproxyfee

  let auditphase;
  //let accountfilename = '../edscripts/votingAccounts.csv';

  it(`Create users`, async () => {
    accountA = await newUser(faucet);
    accountB = await newUser(faucet);
    accountC = await newUser(faucet);
    accountD = await newUser(faucet);
    accountE = await newUser(faucet);
    accountF = await newUser(faucet);
    accountG = await newUser(faucet);
  })



  it(`call auditvote, verify phase 1`, async () => {
    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'auditvote',
        account: 'eosio',
        data: {
          actor: accountA.account,
          max_fee: config.api.register_proxy.fee
        }
      })
      console.log('Result: ', result)
      expect(result.status).to.equal('OK')
      // expect(result.audit_phase).to.equal('2')
      auditphase = result.audit_phase;
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }


  })

  it('Confirm audit global info:  ', async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'auditglobal',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      let result  = await callFioApi("get_table_rows", json);
      console.log('result: ', result);

      expect(result.rows[0].audit_reset).to.equal(0);
      // expect(voters.rows[voter].is_proxy).to.equal(0);
      // expect(voters.rows[voter].fioaddress).to.equal('');
      //expect(voters.rows[voter].addresshash).to.equal('0x00000000000000000000000000000000');

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`call voteproducer, verify reset`, async () => {

    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: accountA.address,
          actor: accountA.account,
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

  it(`call auditvote, verify phase 1 completed cur phase 2`, async () => {



    try {
      const result = await accountB.sdk.genericAction('pushTransaction', {
        action: 'auditvote',
        account: 'eosio',
        data: {
          actor: accountB.account,
          max_fee: config.api.register_proxy.fee +3
        }
      })
      console.log('Result: ', result)
      expect(result.status).to.equal('OK')
      expect(result.audit_phase).to.equal('2')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }



  })

  it('Confirm audit global info:  ', async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'auditglobal',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      let result  = await callFioApi("get_table_rows", json);
      console.log('result: ', result);

      expect(result.rows[0].audit_reset).to.equal(0);
      // expect(voters.rows[voter].is_proxy).to.equal(0);
      // expect(voters.rows[voter].fioaddress).to.equal('');
      //expect(voters.rows[voter].addresshash).to.equal('0x00000000000000000000000000000000');

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`transfer locked tokens from account in voters table, verify audit reset`, async () => {
    try {
      let fundsAmount = 10000000000;
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        data: {
          payee_public_key: accountB.publicKey,
          can_vote: 1,
          periods: [
            {
              duration: 20,
              amount: fundsAmount * .4,
            },
            {
              duration: 40,
              amount: fundsAmount * .6,
            }
          ],
          amount: fundsAmount,
          max_fee: config.api.transfer_tokens_pub_key.fee,
          tpid: ''
        }

      })
      expect(result.status).to.equal('OK');
      expect(result.fee_collected).to.equal(config.api.transfer_tokens_pub_key.fee);
    } catch (err) {
      console.log(' Error', err)
    }
  })

  it('Confirm audit global info reset is set:  ', async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'auditglobal',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      let result  = await callFioApi("get_table_rows", json);
      console.log('result: ', result);

      expect(result.rows[0].audit_reset).to.equal(1);
      // expect(voters.rows[voter].is_proxy).to.equal(0);
      // expect(voters.rows[voter].fioaddress).to.equal('');
      //expect(voters.rows[voter].addresshash).to.equal('0x00000000000000000000000000000000');

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`call auditvote, verify phase 1 completed cur phase 2`, async () => {



    try {
      const result = await accountB.sdk.genericAction('pushTransaction', {
        action: 'auditvote',
        account: 'eosio',
        data: {
          actor: accountB.account,
          max_fee: config.api.register_proxy.fee +1
        }
      })
      console.log('Result: ', result)
      expect(result.status).to.equal('OK')
      expect(result.audit_phase).to.equal('2')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }



  })

  it('Confirm audit global info:  ', async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'auditglobal',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      let result  = await callFioApi("get_table_rows", json);
      console.log('result: ', result);

      expect(result.rows[0].audit_reset).to.equal(0);
      // expect(voters.rows[voter].is_proxy).to.equal(0);
      // expect(voters.rows[voter].fioaddress).to.equal('');
      //expect(voters.rows[voter].addresshash).to.equal('0x00000000000000000000000000000000');

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })


})

describe.only(`register fio address,  mandatory fee (test transfer) sender is in voters table reset dev testing.`, () => {

  let accountA, accountB, accountC, accountD, accountE, accountF, accountG,total_voted_fio, start_bp_votes, proxied_weightC, proxied_weightB,  total_bp_votes,regproxyfee

  let auditphase;
  //let accountfilename = '../edscripts/votingAccounts.csv';

  it(`Create users`, async () => {
    accountA = await newUser(faucet);
    accountB = await newUser(faucet);
    accountC = await newUser(faucet);
    accountD = await newUser(faucet);
    accountE = await newUser(faucet);
    accountF = await newUser(faucet);
    accountG = await newUser(faucet);
  })



  it(`call auditvote, verify phase 1`, async () => {
    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'auditvote',
        account: 'eosio',
        data: {
          actor: accountA.account,
          max_fee: config.api.register_proxy.fee
        }
      })
      console.log('Result: ', result)
      expect(result.status).to.equal('OK')
      // expect(result.audit_phase).to.equal('2')
      auditphase = result.audit_phase;
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }


  })

  it('Confirm audit global info:  ', async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'auditglobal',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      let result  = await callFioApi("get_table_rows", json);
      console.log('result: ', result);

      expect(result.rows[0].audit_reset).to.equal(0);
      // expect(voters.rows[voter].is_proxy).to.equal(0);
      // expect(voters.rows[voter].fioaddress).to.equal('');
      //expect(voters.rows[voter].addresshash).to.equal('0x00000000000000000000000000000000');

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`call voteproducer, verify reset`, async () => {

    try {
      const result = await accountA.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: accountA.address,
          actor: accountA.account,
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

  it(`call auditvote, verify phase 1 completed cur phase 2`, async () => {



    try {
      const result = await accountB.sdk.genericAction('pushTransaction', {
        action: 'auditvote',
        account: 'eosio',
        data: {
          actor: accountB.account,
          max_fee: config.api.register_proxy.fee +3
        }
      })
      console.log('Result: ', result)
      expect(result.status).to.equal('OK')
      expect(result.audit_phase).to.equal('2')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }



  })

  it('Confirm audit global info:  ', async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'auditglobal',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      let result  = await callFioApi("get_table_rows", json);
      console.log('result: ', result);

      expect(result.rows[0].audit_reset).to.equal(0);
      // expect(voters.rows[voter].is_proxy).to.equal(0);
      // expect(voters.rows[voter].fioaddress).to.equal('');
      //expect(voters.rows[voter].addresshash).to.equal('0x00000000000000000000000000000000');

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`account in voters does a fee tx, test transfer send in voters, verify audit reset`, async () => {
    try {
      let domain = generateFioDomain(8)

          const result = await accountA.sdk.genericAction('pushTransaction', {
            action: 'regdomain',
            account: 'fio.address',
            data: {
              fio_domain: domain,
              owner_fio_public_key: accountA.publicKey,
              max_fee: config.maxFee,
              tpid: ''
            }
          })
          //console.log('Result: ', result)
          expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }

  })

  it('Confirm audit global info reset is set:  ', async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'auditglobal',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      let result  = await callFioApi("get_table_rows", json);
      console.log('result: ', result);

      expect(result.rows[0].audit_reset).to.equal(1);
      // expect(voters.rows[voter].is_proxy).to.equal(0);
      // expect(voters.rows[voter].fioaddress).to.equal('');
      //expect(voters.rows[voter].addresshash).to.equal('0x00000000000000000000000000000000');

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`call auditvote, verify phase 1 completed cur phase 2`, async () => {



    try {
      const result = await accountB.sdk.genericAction('pushTransaction', {
        action: 'auditvote',
        account: 'eosio',
        data: {
          actor: accountB.account,
          max_fee: config.api.register_proxy.fee +1
        }
      })
      console.log('Result: ', result)
      expect(result.status).to.equal('OK')
      expect(result.audit_phase).to.equal('2')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }



  })

  it('Confirm audit global info:  ', async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'auditglobal',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      let result  = await callFioApi("get_table_rows", json);
      console.log('result: ', result);

      expect(result.rows[0].audit_reset).to.equal(0);
      // expect(voters.rows[voter].is_proxy).to.equal(0);
      // expect(voters.rows[voter].fioaddress).to.equal('');
      //expect(voters.rows[voter].addresshash).to.equal('0x00000000000000000000000000000000');

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })


})




describe.skip(`voting power tests, test reading account info`, () => {

  let accountA, accountB, accountC, accountD, accountE, accountF, accountG,total_voted_fio, start_bp_votes, proxied_weightC, proxied_weightB,  total_bp_votes,regproxyfee


  it(`read accounts file`, async () => {

    let accounts = [];
    accounts =  await readAccountFile('../edscripts/votingAccounts.csv');

    console.log(accounts[1000]);
  })





})
