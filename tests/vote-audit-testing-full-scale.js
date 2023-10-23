require('mocha')
require('fs')
const {expect} = require('chai')
const {newUser, existingUser, getTestType, getProdVoteTotal, timeout, getBundleCount, getAccountVoteWeight, getTotalVotedFio, appendAccountFile, readAccountFile, callFioApi, fetchJson} = require('../utils.js');
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


describe(`Initialize blockchain server for scaled vote power testing`, () => {

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

    ///////////first account 1123 proxy participants

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

    ///////////second account 342 participants


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

    ////////////third account 245 participants

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

      console.log("making proxy3 participant ",numits);
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

    ///////////fourth account 95 participants


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

      console.log("making proxy4 participant ",numits);
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


 ///////////////next make 17 accounts each with 15 participants

    for (let cnt = 0; cnt < 17; cnt++) {
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

        console.log("making proxy" + cnt + " participant ", numits);
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

    }





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


describe.only(`voting power tests, test using account info`, () => {

  let accountA, accountB, accountC, accountD, accountE, accountF, accountG,total_voted_fio, start_bp_votes, proxied_weightC, proxied_weightB,  total_bp_votes,regproxyfee


  it(`read accounts file`, async () => {

    let accounts = [];
    accounts =  await readAccountFile('../edscripts/votingAccounts.csv');

    console.log(accounts[1000]);
  })





})
