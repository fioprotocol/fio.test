require('mocha')
const {expect} = require('chai')
const {newUser, existingUser, getTestType, getProdVoteTotal, createKeypair,getAccountFromKey, generateFioAddress, generateFioDomain, timeout, getBundleCount, getAccountVoteWeight, getTotalVotedFio, callFioApi, fetchJson} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk');
const config = require('../config.js');
const { readBufferWithDetectedEncoding } = require('tslint/lib/utils');
const testType = getTestType();

let total_voted_fio, transfer_tokens_pub_key_fee, unregister_proxy_fee, register_proxy_fee

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

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);

  result = await faucet.getFee('transfer_tokens_pub_key');
  transfer_tokens_pub_key_fee = result.fee;

  result = await faucet.getFee('unregister_proxy');
  unregister_proxy_fee = result.fee;

  result = await faucet.getFee('register_proxy');
  register_proxy_fee = result.fee;
})

describe(' AE. load voters with data ordering issues, call audit vote in all phases', () => {
  let voter1, phase_change = 0
  let voter2,voter3,voter4,voter5,voter6;
  let auditacc;
  let keys1, keys2;
  let key1sdk, key2sdk;
  let keys1account, keys2account;

  it(`Create users`, async () => {
    voter1 = await newUser(faucet);
    voter2 = await newUser(faucet);
    voter3 = await newUser(faucet);
    voter4 = await newUser(faucet);
    voter5 = await newUser(faucet);
    voter6 = await newUser(faucet);

    auditacc = await newUser(faucet);
    keys1 = await createKeypair();
    keys2 = await createKeypair();


    let taccsdk = await new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson);
    let taccount = await getAccountFromKey(keys.publicKey);
  })

  it(`Wait a few seconds.`, async () => { await timeout(3000) })

  //transfer locked tokens to voter 2,3
  it(`transfer locked tokens to voter2`, async () => {
    try {
      const result = await auditacc.sdk.genericAction('pushTransaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        data: {
          payee_public_key: keys1.publicKey,
          can_vote: 0,
          periods: [
            {
              duration: 2628000,
              amount: 100000000000,
            },
            {
              duration: 2629000,
              amount: 100000000000,
            }
          ],
          amount: 200000000000,
          max_fee: config.maxFee,
          tpid: '',
          actor: auditacc.account,
        }

      })
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
    }
  })


  //send alittle more to account so it can operate and vote

  it(`transfer some tokens to keys1`, async () => {
    try {
      const result = await faucet.genericAction('transferTokens', {
        payeeFioPublicKey: keys1.publicKey,
        amount: 550000000000,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        technologyProviderId: ''
      })

      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
    }
  })

  it(`transfer locked tokens to voter3`, async () => {
    try {
      const result = await auditacc.sdk.genericAction('pushTransaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        data: {
          payee_public_key: keys2.publicKey,
          can_vote: 0,
          periods: [
            {
              duration: 2628000,
              amount: 100000000000,
            },
            {
              duration: 2629000,
              amount: 100000000000,
            }
          ],
          amount: 200000000000,
          max_fee: config.maxFee,
          tpid: '',
          actor: auditacc.account,
        }

      })
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
    }
  })
  it(`transfer some tokens to keys2`, async () => {
    try {
      const result = await faucet.genericAction('transferTokens', {
        payeeFioPublicKey: keys2.publicKey,
        amount: 550000000000,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        technologyProviderId: ''
      })

      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
    }
  })

  it(`voter1 votes for bp1@dapixdev using address #1`, async () => {
    try {
      const result = await voter1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: voter1.address,
          actor: voter1.account,
          max_fee: config.maxFee
        }
      })
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }
  })
  it(`voter2 votes for bp1@dapixdev using address #1`, async () => {
    try {
      const result = await voter2.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: voter2.address,
          actor: voter2.account,
          max_fee: config.maxFee
        }
      })
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }
  })
  it(`voter3 votes for bp1@dapixdev using address #1`, async () => {
    try {
      const result = await voter3.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: voter3.address,
          actor: voter3.account,
          max_fee: config.maxFee
        }
      })
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }
  })
  it(`voter4 votes for bp1@dapixdev using address #1`, async () => {
    try {
      const result = await voter4.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: voter4.address,
          actor: voter4.account,
          max_fee: config.maxFee
        }
      })
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }
  })
  it(`voter5 votes for bp1@dapixdev using address #1`, async () => {
    try {
      const result = await voter5.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: voter5.address,
          actor: voter5.account,
          max_fee: config.maxFee
        }
      })
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }
  })

  it(`Success, stake voter5 450 tokens `, async () => {
    try{
      const result = await voter5.sdk.genericAction('pushTransaction', {
        action: 'stakefio',
        account: 'fio.staking',
        data: {
          fio_address: voter5.address,
          amount: 450000000000,
          actor: voter5.account,
          max_fee: config.maxFee,
          tpid:''
        }
      })
      // console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
    }
  })
  it(`voter6 votes for bp1@dapixdev using address #1`, async () => {
    try {
      const result = await voter6.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: voter6.address,
          actor: voter6.account,
          max_fee: config.maxFee
        }
      })
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }
  })

  it(`Set voter1 domain as public so newkeypair can register address on it`, async () => {
    const result = await voter1.sdk.genericAction('setFioDomainVisibility', {
      fioDomain: voter1.domain,
      isPublic: true,
      maxFee: config.maxFee
    })
    //console.log('Result: ', result)
    expect(result.status).to.equal('OK')
    //const result = await user1Ram.setRamData('SETDOMAINPUBRAM', user1Ram)
  })

  it(`regaddress for keys1 so it can vote`, async () => {
    try {
      keys1.address = await generateFioAddress(voter1.domain, 8)
      key1sdk = await new FIOSDK(keys1.privateKey, keys1.publicKey, config.BASE_URL, fetchJson);
      keys1account = await getAccountFromKey(keys1.publicKey);
      const result = await key1sdk.genericAction('pushTransaction', {
        action: 'regaddress',
        account: 'fio.address',
        data: {
          fio_address: keys1.address,
          owner_fio_public_key: keys1.publicKey,
          max_fee: config.maxFee,
          tpid: ''
        }
      })
      //console.log('Result: ', result);
      expect(result.status).to.equal('OK');
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })


  it(`regaddress for keys2 so it can vote`, async () => {
    try {
      keys2.address = await generateFioAddress(voter1.domain, 8)
      key2sdk = await new FIOSDK(keys2.privateKey, keys2.publicKey, config.BASE_URL, fetchJson);
      keys2account = await getAccountFromKey(keys2.publicKey);
      const result = await key2sdk.genericAction('pushTransaction', {
        action: 'regaddress',
        account: 'fio.address',
        data: {
          fio_address: keys2.address,
          owner_fio_public_key: keys2.publicKey,
          max_fee: config.maxFee,
          tpid: ''
        }
      })
      //console.log('Result: ', result);
      expect(result.status).to.equal('OK');
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

  it(`keys1 votes for bp1@dapixdev using address #1`, async () => {
    try {
      const result = await key1sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: keys1.address,
          actor: keys1account,
          max_fee: config.maxFee
        }
      })
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }
  })
  it(`keys2 votes for bp1@dapixdev using address #1`, async () => {
    try {
      const result = await key2sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: keys2.address,
          actor: keys2account,
          max_fee: config.maxFee
        }
      })
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }
  })
  //register keys1 as proxy
  it(`Register keys1 as a proxy`, async () => {
    try {
      const result = await key1sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: keys1.address,
          actor: keys1account,
          max_fee: config.maxFee
        }
      })
      expect(result.status).to.equal('OK')
    } catch (err) {
      expect(err).to.equal('null')
    }
  })
  it(`Register voter5 as a proxy`, async () => {
    try {
      const result = await voter5.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: voter5.address,
          actor: voter5.account,
          max_fee: config.maxFee
        }
      })
      expect(result.status).to.equal('OK')
    } catch (err) {
      expect(err).to.equal('null')
    }
  })

  it(`Wait a few seconds.`, async () => { await timeout(3000) })

  //keys2 proxy to keys1
  it(`keys2 proxy votes to keys1`, async () => {
    try {
      const result = await key2sdk.genericAction('pushTransaction', {
        action: 'voteproxy',
        account: 'eosio',
        data: {
          proxy: keys1.address,
          fio_address: keys2.address,
          actor: keys2account,
          max_fee: config.api.proxy_vote.fee
        }
      })
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
    }
  })


  it(`voter5 votes for bp1@dapixdev using address #1`, async () => {
    try {
      const result = await voter5.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: voter5.address,
          actor: voter5.account,
          max_fee: config.maxFee
        }
      })
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }
  })

  //now make voter2,3 to proxy to voter5
  it(`voter2 proxy votes to voter5`, async () => {
    try {
      const result = await voter2.sdk.genericAction('pushTransaction', {
        action: 'voteproxy',
        account: 'eosio',
        data: {
          proxy: voter5.address,
          fio_address: voter2.address,
          actor: voter2.account,
          max_fee: config.api.proxy_vote.fee
        }
      })
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
    }
  })
  it(`voter3 proxy votes to voter5`, async () => {
    try {
      const result = await voter3.sdk.genericAction('pushTransaction', {
        action: 'voteproxy',
        account: 'eosio',
        data: {
          proxy: voter5.address,
          fio_address: voter3.address,
          actor: voter3.account,
          max_fee: config.api.proxy_vote.fee
        }
      })
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
    }
  })

  it(`Success, stake voter5 450 tokens `, async () => {
    try{
      const result = await voter5.sdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: voter5.address,
          amount: 225000000000,
          actor: voter5.account,
          max_fee: config.maxFee,
          tpid:''
        }
      })
      // console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
    }
  })





  it.skip(`call audit vote until its in phase 1, max number of calls to audit vote is 20`, async () => {
    try {
      let audit_phase = '10'
      let last_phase = "9"
      let n_called = 0;
      let max_calls_audit = 100
      console.log("this test will call audit a max of "+max_calls_audit+" times")

      while(((audit_phase.localeCompare('4') != 0) || (phase_change < 3)) ) {
        n_called++;
        const result = await auditacc.sdk.genericAction('pushTransaction', {
          action: 'auditvote',
          account: 'eosio',
          data: {
            actor: auditacc.account,
            max_fee: config.api.audit_vote.fee
          }
        })
        audit_phase = result.audit_phase

        //if there is lots of voters the account may run out of funds and
        //throw exceptions...
        if(n_called > max_calls_audit) break;

        if(last_phase.localeCompare(audit_phase) != 0){
          if(last_phase.localeCompare("9") != 0){
            phase_change ++
          }
          last_phase = audit_phase;

        }
        console.log("completed call to audit vote, audit phase "+result.audit_phase)
        console.log("          records processed "+result.records_processed)
        expect(result.status).to.equal('OK')
        expect(result.fee_collected).to.equal(config.api.audit_vote.fee)

        await timeout(3000)
      }
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal('null');
    }
  })


})
