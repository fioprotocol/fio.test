require('mocha')
const {expect} = require('chai')
const {newUser, existingUser, getTestType, getProdVoteTotal, timeout, getBundleCount, getAccountVoteWeight, getTotalVotedFio, callFioApi, fetchJson} = require('../utils.js');
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

describe(`************************** vote.js ************************** \n    A. Test vote counts with proxy when proxy increases and decreases funds`, () => {

  let proxyA1, user2, total_voted_fio, total_bp_votes, transfer_tokens_pub_key_fee

  it(`Create users`, async () => {
    proxyA1 = await newUser(faucet);
    user2 = await newUser(faucet);

    //console.log('proxyA1.account: ', proxyA1.account)
    //console.log('proxyA1.publicKey: ', proxyA1.publicKey)
    //console.log('proxyA1.privateKey: ', proxyA1.privateKey)
  })

  it(`Wait a few seconds.`, async () => { await timeout(3000) })

  it(`Get initial total_voted_fio`, async () => {
    total_voted_fio = await getTotalVotedFio();
    //console.log('total_voted_fio:', total_voted_fio)
  })

  it(`Get proxyA1 last_vote_weight. Expect: null`, async () => {
    try {
      proxyA1.last_vote_weight = await getAccountVoteWeight(proxyA1.account);
      //console.log('proxyA1.last_vote_weight:', proxyA1.last_vote_weight)
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }
  })

  it(`Get bp1@dapixdev total_votes`, async () => {
    try {
      total_bp_votes = await getProdVoteTotal('bp1@dapixdev');
      //console.log('bp1@dapixdev total_votes:', total_bp_votes)
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

  it(`Register proxyA1 as a proxy`, async () => {
    try {
      const result = await proxyA1.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: proxyA1.address,
          actor: proxyA1.account,
          max_fee: config.maxFee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      //console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }
  })

  it(`Wait a few seconds.`, async () => { await timeout(3000) })

  it(`Get total_voted_fio before proxyA1 votes`, async () => {
    total_voted_fio = await getTotalVotedFio();
    //console.log('total_voted_fio:', total_voted_fio)
  })

  it(`proxyA1 votes for bp1@dapixdev using address #1`, async () => {
    try {
      const result = await proxyA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: proxyA1.address,
          actor: proxyA1.account,
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

  it(`Wait a few seconds.`, async () => { await timeout(3000) })

  it(`Get proxyA1 last_vote_weight`, async () => {
    try {
      proxyA1.last_vote_weight = await getAccountVoteWeight(proxyA1.account);
      //console.log('proxyA1.last_vote_weight: ', proxyA1.last_vote_weight)
    } catch (err) {
      console.log('Error: ', err.json)
    }
  })

  it(`proxyA1 FIO balance same as last_vote_weight`, async () => {
    try {
      const result = await proxyA1.sdk.genericAction('getFioBalance', {
        fioPublicKey: proxyA1.publicKey
      })
      //console.log('proxyA1 fio balance', result)
      expect(result.balance).to.equal(proxyA1.last_vote_weight)
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal('null')
    }
  })

  it(`total_voted_fio increased by proxyA1 last_vote_weight`, async () => {
    try {
      let prev_total_voted_fio = total_voted_fio
      total_voted_fio = await getTotalVotedFio();
      //console.log('total_voted_fio: ', total_voted_fio)
      expect(total_voted_fio).to.equal(prev_total_voted_fio + proxyA1.last_vote_weight)
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal('null')
    }
  })

  it(`bp1@dapixdev total_votes increased by proxyA1 last_vote_weight`, async () => {
    try {
      let prev_total_bp_votes = total_bp_votes;
      total_bp_votes = await getProdVoteTotal('bp1@dapixdev');
      //console.log('bp1@dapixdev total_votes:', total_bp_votes)
      expect(total_bp_votes).to.equal(prev_total_bp_votes + proxyA1.last_vote_weight)
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

  it('Transfer additional 50 FIO from user2 to proxyA1', async () => {
    const result = await user2.sdk.genericAction('transferTokens', {
      payeeFioPublicKey: proxyA1.publicKey,
      amount: 50000000000,
      maxFee: config.maxFee,
    })
    //console.log('Result', result)
    expect(result.status).to.equal('OK')
  })

  it(`Wait a few seconds.`, async () => { await timeout(3000) })

  it(`Get proxyA1 last_vote_weight (should be 500 more)`, async () => {
    try {
      proxyA1.last_vote_weight = await getAccountVoteWeight(proxyA1.account);
      //console.log('proxyA1.last_vote_weight:', proxyA1.last_vote_weight)
    } catch (err) {
      console.log('Error: ', err.json)
    }
  })

  it(`total_voted_fio increased by 500 FIO`, async () => {
    try {
      let prev_total_voted_fio = total_voted_fio
      total_voted_fio = await getTotalVotedFio();
      //console.log('total_voted_fio: ', total_voted_fio)
      expect(total_voted_fio).to.equal(prev_total_voted_fio + 50000000000)
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal('null')
    }
  })

  it(`bp1@dapixdev total_votes increased by 500 FIO`, async () => {
    try {
      let prev_total_bp_votes = total_bp_votes;
      total_bp_votes = await getProdVoteTotal('bp1@dapixdev');
      //console.log('bp1@dapixdev total_votes:', total_bp_votes)
      expect(total_bp_votes).to.equal(prev_total_bp_votes + 50000000000)
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

  it('Get transfer_tokens_pub_key fee', async () => {
    try {
        result = await proxyA1.sdk.getFee('transfer_tokens_pub_key');
        //console.log('result: ', result);
        transfer_tokens_pub_key_fee = result.fee;
        expect(result.fee).to.be.greaterThan(0);
    } catch (err) {
        console.log('Error', err);
        expect(err).to.equal(null);
    }
  })

  it(`Transfer 20 FIO from proxyA1 back to user2`, async () => {
    const result = await proxyA1.sdk.genericAction('transferTokens', {
      payeeFioPublicKey: user2.publicKey,
      amount: 20000000000,
      maxFee: config.maxFee,
    })
    //console.log('Result', result)
    expect(result.status).to.equal('OK')
  })

  it(`Wait a few seconds.`, async () => { await timeout(3000) })

  it(`Get proxyA1 last_vote_weight (should be 20 - transfer_tokens_pub_key_fee  less)`, async () => {
    try {
      proxyA1.last_vote_weight = await getAccountVoteWeight(proxyA1.account);
      //console.log('proxyA1.last_vote_weight:', proxyA1.last_vote_weight)
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }
  })

  it(`total_voted_fio decreased by 20 FIO (minus the transferTokens fee)`, async () => {
    try {
      let prev_total_voted_fio = total_voted_fio
      total_voted_fio = await getTotalVotedFio();
      //console.log('total_voted_fio: ', total_voted_fio)
      expect(total_voted_fio).to.equal(prev_total_voted_fio - 20000000000 - transfer_tokens_pub_key_fee)
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal('null')
    }
  })

  it(`bp1@dapixdev total_votes increased by 20 FIO (minus the transferTokens fee)`, async () => {
    try {
      let prev_total_bp_votes = total_bp_votes;
      total_bp_votes = await getProdVoteTotal('bp1@dapixdev');
      //console.log('bp1@dapixdev total_votes:', total_bp_votes)
      expect(total_bp_votes).to.equal(prev_total_bp_votes - 20000000000 - transfer_tokens_pub_key_fee)
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

})

describe('B. Test vote counts with proxy when proxy increases and decreases funds', () => {

  let proxyB1, voterB1, user1, total_voted_fio, prev_total_voted_fio, total_bp_votes, transfer_tokens_pub_key_fee, prev_vote_weight

  it(`Create users`, async () => {
    try {
      proxyB1 = await newUser(faucet);
      voterB1 = await newUser(faucet);
      user1 = await newUser(faucet);
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`Wait a few seconds.`, async () => { await timeout(3000) })

  it(`Get initial total_voted_fio`, async () => {
    total_voted_fio = await getTotalVotedFio();
    //console.log('total_voted_fio:', total_voted_fio)
  })

  it(`Get bp1@dapixdev total_votes`, async () => {
    try {
      total_bp_votes = await getProdVoteTotal('bp1@dapixdev');
      //console.log('bp1@dapixdev total_votes:', total_bp_votes)
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`Get proxyB1 FIO Balance`, async () => {
    try {
      const result = await proxyB1.sdk.genericAction('getFioBalance', {
        fioPublicKey: proxyB1.publicKey
      })
      proxyB1.fioBalance = result.balance
      //console.log('proxyB1 getFioBalance: ', result.balance)
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`Get voterB1 FIO Balance`, async () => {
    try {
      const result = await voterB1.sdk.genericAction('getFioBalance', {
        fioPublicKey: voterB1.publicKey
      })
      voterB1.fioBalance = result.balance
      //console.log('voterB1 getFioBalance: ', result.balance)
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`Register proxyB1 as a proxy`, async () => {
    try {
      const result = await proxyB1.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: proxyB1.address,
          actor: proxyB1.account,
          max_fee: config.api.register_proxy.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
    }
  })

  it(`Wait a few seconds.`, async () => { await timeout(3000) })

  it(`voterB1 proxy votes to proxyB1`, async () => {
    try {
      const result = await voterB1.sdk.genericAction('pushTransaction', {
        action: 'voteproxy',
        account: 'eosio',
        data: {
          proxy: proxyB1.address,
          fio_address: voterB1.address,
          actor: voterB1.account,
          max_fee: config.api.proxy_vote.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
    }
  })

  it(`proxyB1 votes for bp1@dapixdev`, async () => {
    try {
      const result = await proxyB1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: proxyB1.address,
          actor: proxyB1.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
    }
  })

  it(`Get proxyB1 FIO Balance`, async () => {
    try {
      const result = await proxyB1.sdk.genericAction('getFioBalance', {
        fioPublicKey: proxyB1.publicKey
      })
      proxyB1.fioBalance = result.balance
      //console.log('proxyB1 getFioBalance: ', result.balance)
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`voterB1 last_vote_weight = voterB1 FIO Balance`, async () => {
    try {
      voterB1.last_vote_weight  = await getAccountVoteWeight(voterB1.account);
      //console.log('voterB1.last_vote_weight:', voterB1.last_vote_weight)
      expect(voterB1.last_vote_weight).to.equal(voterB1.fioBalance)
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`proxyB1 last_vote_weight = proxyB1 FIO Balance + voterB1 last_vote_weight`, async () => {
    try {
      proxyB1.last_vote_weight = await getAccountVoteWeight(proxyB1.account);
      //console.log('proxyB1.last_vote_weight:', proxyB1.last_vote_weight)
      expect(proxyB1.last_vote_weight).to.equal(proxyB1.fioBalance + voterB1.last_vote_weight)
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`bp1@dapixdev total_votes increased by proxyB1 last_vote_weight`, async () => {
    try {
      let prev_total_bp_votes = total_bp_votes;
      total_bp_votes = await getProdVoteTotal('bp1@dapixdev');
      //console.log('bp1@dapixdev total_votes:', total_bp_votes)
      expect(total_bp_votes).to.equal(prev_total_bp_votes + proxyB1.last_vote_weight)
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it('total_voted_fio is increases by proxyB1 last_vote_weight (fixed by MAS-1489)', async () => {
    try {
      prev_total_voted_fio = total_voted_fio
      total_voted_fio = await getTotalVotedFio();
      //console.log('total_voted_fio: ', total_voted_fio)
      expect(total_voted_fio).to.equal(prev_total_voted_fio + proxyB1.last_vote_weight)
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`Get total_voted_fio`, async () => {
    try {
      total_voted_fio = await getTotalVotedFio();
      //console.log('total_voted_fio: ', total_voted_fio)
    } catch (err) {
      console.log('Error', err)
    }
  })

  it('Get transfer_tokens_pub_key fee', async () => {
    try {
        result = await proxyB1.sdk.getFee('transfer_tokens_pub_key');
        //console.log('result: ', result);
        transfer_tokens_pub_key_fee = result.fee;
        expect(result.fee).to.be.greaterThan(0);
    } catch (err) {
        console.log('Error', err);
        expect(err).to.equal(null);
    }
  })

  it('Transfer additional 500 FIO from user1 to voterB1', async () => {
    const result = await user1.sdk.genericAction('transferTokens', {
      payeeFioPublicKey: voterB1.publicKey,
      amount: 500000000000,
      maxFee: config.maxFee,
    })
    //console.log('Result', result)
    expect(result.status).to.equal('OK')
  })

  it(`Wait a few seconds.`, async () => { await timeout(3000) })

  it(`voterB1 last_vote_weight increases by 500 FIO`, async () => {
    try {
      prev_vote_weight = voterB1.last_vote_weight;
      voterB1.last_vote_weight = await getAccountVoteWeight(voterB1.account);
      //console.log('voterB1.last_vote_weight:', voterB1.last_vote_weight);
      expect(voterB1.last_vote_weight).to.equal(prev_vote_weight + 500000000000);
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`proxyB1 last_vote_weight increases by 500 FIO`, async () => {
    try {
      prev_vote_weight = proxyB1.last_vote_weight;
      proxyB1.last_vote_weight = await getAccountVoteWeight(proxyB1.account);
      //console.log('proxyB1.last_vote_weight:', proxyB1.last_vote_weight);
      expect(proxyB1.last_vote_weight).to.equal(prev_vote_weight + 500000000000);
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`total_voted_fio increased by 500 FIO`, async () => {
    try {
      prev_total_voted_fio = total_voted_fio;
      total_voted_fio = await getTotalVotedFio();
      //console.log('total_voted_fio: ', total_voted_fio)
      expect(total_voted_fio).to.equal(prev_total_voted_fio + 500000000000)
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`bp1@dapixdev total_votes increased by 500 FIO`, async () => {
    try {
      let prev_total_bp_votes = total_bp_votes;
      total_bp_votes = await getProdVoteTotal('bp1@dapixdev');
      //console.log('bp1@dapixdev total_votes:', total_bp_votes)
      expect(total_bp_votes).to.equal(prev_total_bp_votes + 500000000000)
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it('Transfer 1000 FIO from voterB1 to user1', async () => {
    try {
      const result = await voterB1.sdk.genericAction('transferTokens', {
        payeeFioPublicKey: user1.publicKey,
        amount: 1000000000000,
        maxFee: config.maxFee,
      })
      //console.log('Result', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`Wait a few seconds.`, async () => { await timeout(3000) })

  it(`voterB1 last_vote_weight decreases by (1000 + xfer fee) FIO)`, async () => {
    try {
      prev_vote_weight = voterB1.last_vote_weight;
      voterB1.last_vote_weight = await getAccountVoteWeight(voterB1.account);
      //console.log('voterB1.last_vote_weight:', voterB1.last_vote_weight);
      expect(voterB1.last_vote_weight).to.equal(prev_vote_weight - 1000000000000 - transfer_tokens_pub_key_fee);
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`proxyB1 last_vote_weight decreases by (1000 + xfer fee) FIO)`, async () => {
    try {
      prev_vote_weight = proxyB1.last_vote_weight;
      proxyB1.last_vote_weight = await getAccountVoteWeight(proxyB1.account);
      //console.log('proxyB1.last_vote_weight:', proxyB1.last_vote_weight);
      expect(proxyB1.last_vote_weight).to.equal(prev_vote_weight - 1000000000000 - transfer_tokens_pub_key_fee);
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`total_voted_fio decreases by (1000 + xfer fee) FIO`, async () => {
    try {
      prev_total_voted_fio = total_voted_fio;
      total_voted_fio = await getTotalVotedFio();
      //console.log('total_voted_fio: ', total_voted_fio)
      expect(total_voted_fio).to.equal(prev_total_voted_fio - 1000000000000 - transfer_tokens_pub_key_fee)
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`bp1@dapixdev total_votes increased by (1000 + xfer fee) FIO`, async () => {
    try {
      let prev_total_bp_votes = total_bp_votes;
      total_bp_votes = await getProdVoteTotal('bp1@dapixdev');
      //console.log('bp1@dapixdev total_votes:', total_bp_votes)
      expect(total_bp_votes).to.equal(prev_total_bp_votes - 1000000000000 - transfer_tokens_pub_key_fee)
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it('Transfer 800 FIO from proxyB1 to voterB1', async () => {
    const result = await proxyB1.sdk.genericAction('transferTokens', {
      payeeFioPublicKey: voterB1.publicKey,
      amount: 800000000000,
      maxFee: config.maxFee,
    })
    //console.log('Result', result)
    expect(result.status).to.equal('OK')
  })

  it(`Wait a few seconds.`, async () => { await timeout(3000) })

  it(`voterB1 last_vote_weight increases by 800 FIO)`, async () => {
    try {
      prev_vote_weight = voterB1.last_vote_weight;
      voterB1.last_vote_weight = await getAccountVoteWeight(voterB1.account);
      //console.log('voterB1.last_vote_weight:', voterB1.last_vote_weight);
      expect(voterB1.last_vote_weight).to.equal(prev_vote_weight + 800000000000);
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`proxyB1 last_vote_weight decreases by xfer fee only (since votes are still proxied)`, async () => {
    try {
      prev_vote_weight = proxyB1.last_vote_weight;
      proxyB1.last_vote_weight = await getAccountVoteWeight(proxyB1.account);
      //console.log('proxyB1.last_vote_weight:', proxyB1.last_vote_weight);
      expect(proxyB1.last_vote_weight).to.equal(prev_vote_weight - transfer_tokens_pub_key_fee);
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`total_voted_fio does decreases by xfer fee`, async () => {
    try {
      prev_total_voted_fio = total_voted_fio;
      total_voted_fio = await getTotalVotedFio();
      //console.log('total_voted_fio: ', total_voted_fio)
      expect(total_voted_fio).to.equal(prev_total_voted_fio - transfer_tokens_pub_key_fee)
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`Get proxyB1 FIO Balance pre unregproxy`, async () => {
    try {
      const result = await proxyB1.sdk.genericAction('getFioBalance', {
        fioPublicKey: proxyB1.publicKey
      })
      proxyB1.fioBalance = result.balance
      //console.log('proxyB1 getFioBalance: ', result.balance)
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`Get proxyB1 last_vote_weight pre unregproxy`, async () => {
    try {
      proxyB1.last_vote_weight = await getAccountVoteWeight(proxyB1.account)
      //console.log('proxyB1.last_vote_weight: ', proxyB1.last_vote_weight)
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`Un-register proxyB1 as a proxy`, async () => {
    try {
      const result = await proxyB1.sdk.genericAction('pushTransaction', {
        action: 'unregproxy',
        account: 'eosio',
        data: {
          fio_address: proxyB1.address,
          actor: proxyB1.account,
          max_fee: config.api.unregister_proxy.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
    }
  })

  it(`Wait a few seconds.`, async () => { await timeout(3000) })

  it(`Get proxyB1 FIO Balance post unregproxy`, async () => {
    try {
      const result = await proxyB1.sdk.genericAction('getFioBalance', {
        fioPublicKey: proxyB1.publicKey
      })
      proxyB1.fioBalance = result.balance
      //console.log('proxyB1 getFioBalance: ', result.balance)
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`Get new proxyB1 vote_weight`, async () => {
    try {
      prev_vote_weight = proxyB1.last_vote_weight;
      proxyB1.last_vote_weight = await getAccountVoteWeight(proxyB1.account);
      //console.log('proxyB1.last_vote_weight: ', proxyB1.last_vote_weight)
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it.skip(`(BUG: BD-2317) Expect: proxyB1 last_vote_weight = proxyB1.prev_vote_weight - voterB1.last_vote_weight - unregister_proxy_fee (also subtracting voterB1 votes after unregstering)`, async () => {
    try {
      expect(proxyB1.last_vote_weight).to.equal(prev_vote_weight - voterB1.last_vote_weight - unregister_proxy_fee);
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`Get new total_voted_fio`, async () => {
    try {
      let prev_total_voted_fio = total_voted_fio;
      total_voted_fio = await getTotalVotedFio();
      //console.log('total_voted_fio: ', total_voted_fio)
    } catch (err) {
      console.log('Error', err)
    }
  })

  it.skip(`(BUG: BD-2317) Expect: total_voted_fio = prev_total_voted_fio - voterB1.last_vote_weight (remove voterB1 votes after unregistering their proxy)`, async () => {
    try {
      expect(total_voted_fio).to.equal(prev_total_voted_fio - voterB1.last_vote_weight - unregister_proxy_fee)
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`Transfer 200 FIO from proxyB1 back to user1`, async () => {
    const result = await proxyB1.sdk.genericAction('transferTokens', {
      payeeFioPublicKey: user1.publicKey,
      amount: 200000000000,
      maxFee: config.maxFee,
    });
    //console.log('Result', result)
    expect(result.status).to.equal('OK')  ;
  })

  it(`Wait a few seconds.`, async () => { await timeout(4000) })

  it('(WORKAROUND: Need to update after BD-2317 is fixed) proxyB1 last_vote_weight decreases by (200 + xfer fee) ', async () => {
    try {
      let previous_vote_weight = proxyB1.last_vote_weight;
      proxyB1.last_vote_weight = await getAccountVoteWeight(proxyB1.account);
      //console.log('previous_vote_weight:', previous_vote_weight);
      //BUG: need to subtract the unregproxy fee, because now it is showing up.
      expect(proxyB1.last_vote_weight).to.equal(previous_vote_weight - 200000000000 - transfer_tokens_pub_key_fee - unregister_proxy_fee);
    } catch (err) {
      console.log('Error: ', err);
    }
  })

  it(`(WORKAROUND: Need to update after BD-2317 is fixed) total_voted_fio decreased by (200 + xfer fee)`, async () => {
    try {
      let prev_total_voted_fio = total_voted_fio;
      total_voted_fio = await getTotalVotedFio();
      //console.log('total_voted_fio: ', total_voted_fio);
      //BUG: need to subtract the unregproxy fee, because now it is showing up.
      expect(total_voted_fio).to.equal(prev_total_voted_fio - 200000000000 - transfer_tokens_pub_key_fee - unregister_proxy_fee);
    } catch (err) {
      console.log('Error', err);
    }
  })

})

describe('C. Test proxying to a user who is also proxying (should fail)', () => {
  let proxyE1, proxyE2, voterE1, voterE2

  it(`Create users`, async () => {
    try {
      proxyE1 = await newUser(faucet);
      proxyE2 = await newUser(faucet);
      voterE1 = await newUser(faucet);
      voterE2 = await newUser(faucet);
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null)
    }
  })

  it(`Wait a few seconds.`, async () => { await timeout(3000) })

  it(`proxyE1 votes for bp1@dapixdev`, async () => {
    try {
      const result = await proxyE1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: proxyE1.address,
          actor: proxyE1.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null)
    }
  })

  it(`Register proxyE1 as a proxy`, async () => {
    try {
      const result = await proxyE1.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: proxyE1.address,
          actor: proxyE1.account,
          max_fee: config.api.register_proxy.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null)
    }
  })

  it(`Register proxyE2 as a proxy`, async () => {
    try {
      const result = await proxyE2.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: proxyE2.address,
          actor: proxyE2.account,
          max_fee: config.api.register_proxy.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null)
    }
  })

  it(`proxyE2 proxies votes to proxyE1 fails (FIO does not allow a nested proxy)`, async () => {
    try {
      const result = await proxyE2.sdk.genericAction('pushTransaction', {
        action: 'voteproxy',
        account: 'eosio',
        data: {
          proxy: proxyE1.address,
          fio_address: proxyE2.address,
          actor: proxyE2.account,
          max_fee: config.api.proxy_vote.fee
        }
      })
      //console.log('Result: ', result)
    } catch (err) {
      //console.log('Error: ', err.json.error)
      expect(err.json.error.details[0].message).to.equal(config.error.nestedProxy)
    }
  })

})

describe('D. last_voting_weight not updated when paying fee for register/unregister proxy (fixed MAS-1539)', () => {
  let proxyF1, voterF1, original_last_vote_weight

  it(`Create users`, async () => {
    proxyF1 = await newUser(faucet);
    voterF1 = await newUser(faucet);
    //console.log("proxyF1 account: ", proxyF1.account)
    //console.log("voterF1 account: ", voterF1.account)
  })

  it(`proxyF1 votes for bp1@dapixdev`, async () => {
    try {
      const result = await proxyF1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: proxyF1.address,
          actor: proxyF1.account,
          max_fee: config.maxFee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`Get proxyF1 original_last_vote_weight`, async () => {
    try {
      proxyF1.last_vote_weight  = await getAccountVoteWeight(proxyF1.account);
      original_last_vote_weight = proxyF1.last_vote_weight
      //console.log('proxyF1 original_last_vote_weight: ', original_last_vote_weight/config.BILLION)
    } catch (err) {
      console.log('Error: ', err.json)
    }
  })

  it(`Register proxyF1 as a proxy`, async () => {
    try {
      const result = await proxyF1.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: proxyF1.address,
          actor: proxyF1.account,
          max_fee: config.maxFee
        }
      })
      //console.log('Result: ', result)
      //console.log('register_proxy_fee: ', register_proxy_fee/config.BILLION)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`Get proxyF1 last_vote_weight`, async () => {
    try {
      proxyF1.last_vote_weight  = await getAccountVoteWeight(proxyF1.account);
      //console.log('proxyF1 last_vote_weight: ', proxyF1.last_vote_weight/config.BILLION)
    } catch (err) {
      console.log('Error: ', err.json)
    }
  })

  it(`Expect: proxyF1 last_vote_weight = original_last_vote_weight - register_proxy_fee (fixed in Gemini)`, async () => {
    //console.log('proxyF1 original_last_vote_weight: ', original_last_vote_weight/config.BILLION)
    //console.log('register_proxy_fee: ', register_proxy_fee/config.BILLION)
    //console.log('proxyF1 last_vote_weight: ', proxyF1.last_vote_weight/config.BILLION)
    expect(proxyF1.last_vote_weight).to.equal(original_last_vote_weight - register_proxy_fee)
  })

  it(`Un-register proxyF1 as a proxy`, async () => {
    try {
      const result = await proxyF1.sdk.genericAction('pushTransaction', {
        action: 'unregproxy',
        account: 'eosio',
        data: {
          fio_address: proxyF1.address,
          actor: proxyF1.account,
          max_fee: config.maxFee
        }
      })
      //console.log('Result: ', result)
      //console.log('register_proxy_fee: ', register_proxy_fee/config.BILLION)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it.skip(`(BUG BD-2317) Expect: proxyF1 last_vote_weight = original_last_vote_weight - unregister_proxy_fee `, async () => {
    original_last_vote_weight = proxyF1.last_vote_weight
    proxyF1.last_vote_weight  = await getAccountVoteWeight(proxyF1.account);
    console.log('proxyF1 original_last_vote_weight: ', original_last_vote_weight/config.BILLION)
    console.log('unregister_proxy_fee: ', unregister_proxy_fee/config.BILLION)
    console.log('proxyF1 last_vote_weight: ', proxyF1.last_vote_weight/config.BILLION)
    expect(proxyF1.last_vote_weight).to.equal(original_last_vote_weight - unregister_proxy_fee)
  })

})

describe('E. Test multiple users proxying and unproxying votes to same proxy', () => {
  let proxyG1, voterG1, voterG2, voterG3, voterG4, total_bp_votes

  it(`Create users`, async () => {
    proxyG1 = await newUser(faucet);
    voterG1 = await newUser(faucet);
    voterG2 = await newUser(faucet);
    voterG3 = await newUser(faucet);
    voterG4 = await newUser(faucet);
  })

  it(`Get bp1@dapixdev total_votes`, async () => {
    try {
      total_bp_votes = await getProdVoteTotal('bp1@dapixdev');
      //console.log('bp1@dapixdev total_votes:', total_bp_votes)
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`proxyG1 votes for bp1@dapixdev`, async () => {
    try {
      const result = await proxyG1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: proxyG1.address,
          actor: proxyG1.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`Wait a few seconds.`, async () => { await timeout(3000) })

  it(`Register proxyG1 as a proxy`, async () => {
    try {
      const result = await proxyG1.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: proxyG1.address,
          actor: proxyG1.account,
          max_fee: config.api.register_proxy.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`Wait a few seconds.`, async () => { await timeout(3000) })

  it(`Get proxyG1 last_vote_weight`, async () => {
    try {
      proxyG1.last_vote_weight = await getAccountVoteWeight(proxyG1.account);
      //console.log('proxyG1 last_vote_weight:', proxyG1.last_vote_weight)
    } catch (err) {
      console.log('Error: ', err.json)
    }
  })

  it('Wait a few seconds.', async () => {
    await timeout(3000);
  })

  it(`bp1@dapixdev total_votes increased by proxyG1 last_vote_weight`, async () => {
    try {
      prev_total_bp_votes = total_bp_votes;
      total_bp_votes = await getProdVoteTotal('bp1@dapixdev');
      //console.log('bp1@dapixdev total_votes:', total_bp_votes)
      expect(total_bp_votes).to.equal(prev_total_bp_votes + proxyG1.last_vote_weight)
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`Proxy voterG1 votes to proxyG1`, async () => {
    try {
      const result = await voterG1.sdk.genericAction('pushTransaction', {
        action: 'voteproxy',
        account: 'eosio',
        data: {
          proxy: proxyG1.address,
          fio_address: voterG1.address,
          actor: voterG1.account,
          max_fee: config.api.proxy_vote.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`Wait a few seconds.`, async () => { await timeout(3000) })

  it(`Get voterG1 last_vote_weight (Fixed in Gemini)`, async () => {
    try {
      voterG1.last_vote_weight = await getAccountVoteWeight(voterG1.account);
      //console.log('voterG1.last_vote_weight:', voterG1.last_vote_weight)
    } catch (err) {
      console.log('Error: ', err.json)
    }
  })

  it(`proxyG1 last_vote_weight increased by voterG1 vote weight (Fixed in Gemini)`, async () => {
    try {
      prev_last_vote_weight = proxyG1.last_vote_weight
      proxyG1.last_vote_weight = await getAccountVoteWeight(proxyG1.account);
      //console.log('proxyG1.last_vote_weight:', proxyE1.last_vote_weight)
      expect(proxyG1.last_vote_weight).to.equal(prev_last_vote_weight + voterG1.last_vote_weight)
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`bp1@dapixdev total_votes increased by voterG1 last_vote_weight (Fixed in Gemini)`, async () => {
    try {
      prev_total_bp_votes = total_bp_votes;
      total_bp_votes = await getProdVoteTotal('bp1@dapixdev');
      //console.log('bp1@dapixdev total_votes:', total_bp_votes)
      expect(total_bp_votes).to.equal(prev_total_bp_votes + voterG1.last_vote_weight)
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`Proxy voterG2 votes to proxyG1`, async () => {
    try {
      const result = await voterG2.sdk.genericAction('pushTransaction', {
        action: 'voteproxy',
        account: 'eosio',
        data: {
          proxy: proxyG1.address,
          fio_address: voterG2.address,
          actor: voterG2.account,
          max_fee: config.api.proxy_vote.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`Wait a few seconds.`, async () => { await timeout(3000) })

  it(`Get voterG2 last_vote_weight`, async () => {
    try {
      voterG2.last_vote_weight = await getAccountVoteWeight(voterG2.account);
      //console.log('voterG2.last_vote_weight:', voterG2.last_vote_weight)
    } catch (err) {
      console.log('Error: ', err.json)
    }
  })

  it(`proxyG1 last_vote_weight increased by voterG2 vote weight (Fixed in Gemini)`, async () => {
    try {
      prev_last_vote_weight = proxyG1.last_vote_weight
      proxyG1.last_vote_weight = await getAccountVoteWeight(proxyG1.account);
      //console.log('proxyG1.last_vote_weight:', proxyE1.last_vote_weight)
      expect(proxyG1.last_vote_weight).to.equal(prev_last_vote_weight + voterG2.last_vote_weight)
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`bp1@dapixdev total_votes increased by voterG2 last_vote_weight (Fixed in Gemini)`, async () => {
    try {
      prev_total_bp_votes = total_bp_votes;
      total_bp_votes = await getProdVoteTotal('bp1@dapixdev');
      //console.log('bp1@dapixdev total_votes:', total_bp_votes)
      expect(total_bp_votes).to.equal(prev_total_bp_votes + voterG2.last_vote_weight)
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`Proxy voterG3 votes to proxyG1`, async () => {
    try {
      const result = await voterG3.sdk.genericAction('pushTransaction', {
        action: 'voteproxy',
        account: 'eosio',
        data: {
          proxy: proxyG1.address,
          fio_address: voterG3.address,
          actor: voterG3.account,
          max_fee: config.api.proxy_vote.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`Wait a few seconds.`, async () => { await timeout(3000) })

  it(`Get voterG3 last_vote_weight`, async () => {
    try {
      voterG3.last_vote_weight  = await getAccountVoteWeight(voterG3.account);
      //console.log('voterG3.last_vote_weight:', voterG3.last_vote_weight)
    } catch (err) {
      console.log('Error: ', err.json)
    }
  })

  it(`proxyG1 last_vote_weight increased by voterG3 vote weight (Fixed in Gemini)`, async () => {
    try {
      prev_last_vote_weight = proxyG1.last_vote_weight
      proxyG1.last_vote_weight = await getAccountVoteWeight(proxyG1.account);
      //console.log('proxyG1.last_vote_weight:', proxyE1.last_vote_weight)
      expect(proxyG1.last_vote_weight).to.equal(prev_last_vote_weight + voterG3.last_vote_weight)
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`bp1@dapixdev total_votes increased by voterG3 last_vote_weight (Fixed in Gemini)`, async () => {
    try {
      prev_total_bp_votes = total_bp_votes;
      total_bp_votes = await getProdVoteTotal('bp1@dapixdev');
      //console.log('bp1@dapixdev total_votes:', total_bp_votes)
      expect(total_bp_votes).to.equal(prev_total_bp_votes + voterG3.last_vote_weight)
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`voterG1 votes for bp1@dapixdev (and thus no longer proxies vote)`, async () => {
    try {
      const result = await voterG1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: voterG1.address,
          actor: voterG1.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`Wait a few seconds.`, async () => { await timeout(3000) })

  it(`bp1@dapixdev does not change (Fixed in Gemini)`, async () => {
    try {
      prev_total_bp_votes = total_bp_votes;
      total_bp_votes = await getProdVoteTotal('bp1@dapixdev');
      //console.log('bp1@dapixdev total_votes:', total_bp_votes)
      expect(total_bp_votes).to.equal(prev_total_bp_votes)
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`proxyG1 last_vote_weight decreased by voterG1 vote weight (Fixed in Gemini)`, async () => {
    try {
      prev_last_vote_weight = proxyG1.last_vote_weight
      proxyG1.last_vote_weight = await getAccountVoteWeight(proxyG1.account);
      //console.log('proxyG1.last_vote_weight:', proxyE1.last_vote_weight)
      expect(proxyG1.last_vote_weight).to.equal(prev_last_vote_weight - voterG1.last_vote_weight)
    } catch (err) {
      console.log('Error: ', err)
    }
  })

})

describe('E.2 Test vote_producer with and without FIO Address (FIP-9)', () => {
  let voterG3, voterG4, voterG5, voterG6, total_bp_votes, bundleCount, balance

  it(`Create users`, async () => {
    //proxyG1 = await newUser(faucet);
    voterG1 = await newUser(faucet);
    voterG2 = await newUser(faucet);
    voterG3 = await newUser(faucet);
    voterG4 = await newUser(faucet);
    voterG5 = await newUser(faucet);
    voterG6 = await newUser(faucet);
  })

  it(`Wait a few seconds.`, async () => { await timeout(3000) })

  it(`Get bp1@dapixdev total_votes`, async () => {
    try {
      total_bp_votes = await getProdVoteTotal('bp1@dapixdev');
      //console.log('bp1@dapixdev total_votes:', total_bp_votes)
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it('Confirm vote_producer fee for voterG3 is zero (bundles remaining)', async () => {
    try {
      result = await voterG3.sdk.getFee('vote_producer', voterG3.address);
      //console.log('result: ', result)
      expect(result.fee).to.equal(0);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Get balance for voterG3`, async () => {
    try {
        const result = await voterG3.sdk.genericAction('getFioBalance', {
            fioPublicKey: voterG3.publicKey
        })
        balance = result.balance
        //console.log('balance: ', balance)
    } catch (err) {
        //console.log('Error', err)
        expect(err).to.equal(null)
    }
  })

  it(`Get bundle count for voterG3 `, async () => {
    const result = await voterG3.sdk.genericAction('getFioNames', { fioPublicKey: voterG3.publicKey })
    //console.log('Result: ', result)
    bundleCount = result.fio_addresses[0].remaining_bundled_tx;
    expect(bundleCount).to.be.greaterThan(0);
  })

  it(`Execute vote_producer WITH FIO Address (with bundled tx left), confirm fee_collected = 0`, async () => {
    try {
      const result = await voterG3.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: voterG3.address,
          actor: voterG3.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
      expect(result.fee_collected).to.equal(0)
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`Get bundle count for voterG3 `, async () => {
    prevBundleCount = bundleCount;
    const result = await voterG3.sdk.genericAction('getFioNames', { fioPublicKey: voterG3.publicKey })
    //console.log('Result: ', result)
    bundleCount = result.fio_addresses[0].remaining_bundled_tx;
    expect(bundleCount).to.equal(prevBundleCount - 1);
  })

  it('Confirm no fee was deducted from voterG3 account', async () => {
    let origBalance = balance
    try {
        const result = await voterG3.sdk.genericAction('getFioBalance', {
            fioPublicKey: voterG3.publicKey
        })
        //console.log('balance: ', result.balance)
        expect(result.balance).to.equal(origBalance)
    } catch (err) {
        //console.log('Error', err)
        expect(err).to.equal(null)
    }
})

  it(`Get voterG3 last_vote_weight`, async () => {
    try {
      voterG3.last_vote_weight = await getAccountVoteWeight(voterG3.account);
      //console.log('voterG3 last_vote_weight:', voterG3.last_vote_weight)
    } catch (err) {
      console.log('Error: ', err.json)
    }
  })

  it(`Confirm bp1@dapixdev total_votes increased by voterG3 last_vote_weight`, async () => {
    try {
      prev_total_bp_votes = total_bp_votes;
      total_bp_votes = await getProdVoteTotal('bp1@dapixdev');
      //console.log('bp1@dapixdev total_votes:', total_bp_votes)
      expect(total_bp_votes).to.equal(prev_total_bp_votes + voterG3.last_vote_weight)
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`Use up all of voterG4's bundles with 51 record_obt_data transactions`, async () => {
    for (i = 0; i < 51; i++) {
      try {
        const result = await voterG4.sdk.genericAction('recordObtData', {
          payerFioAddress: voterG4.address,
          payeeFioAddress: voterG3.address,
          payerTokenPublicAddress: voterG4.publicKey,
          payeeTokenPublicAddress: voterG3.publicKey,
          amount: 5000000000,
          chainCode: "BTC",
          tokenCode: "BTC",
          status: '',
          obtId: '',
          maxFee: config.api.record_obt_data.fee,
          technologyProviderId: '',
          payeeFioPublicKey: voterG3.publicKey,
          memo: '',
          hash: '',
          offLineUrl: ''
        })
        //console.log('Result: ', result)
        expect(result.status).to.equal('sent_to_blockchain')
      } catch (err) {
        console.log('Error', err.json)
        expect(err).to.equal(null)
      }
    }
  })

  it(`Add public addresses to voterG4 to use up one more bundle`, async () => {
    try {
      const result = await voterG4.sdk.genericAction('addPublicAddresses', {
        fioAddress: voterG4.address,
        publicAddresses: [
          {
            chain_code: 'ETH',
            token_code: 'ETH',
            public_address: 'ethaddress',
            }
        ],
        maxFee: config.api.add_pub_address.fee,
        walletFioAddress: ''
      })
      //console.log('Result:', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`Get balance for voterG4`, async () => {
    try {
        const result = await voterG4.sdk.genericAction('getFioBalance', {
            fioPublicKey: voterG4.publicKey
        })
        balance = result.balance
        //console.log('balance: ', balance)
    } catch (err) {
        //console.log('Error', err)
        expect(err).to.equal(null)
    }
})

  it(`Confirm vote_producer fee for voterG4 = ${config.api.vote_producer.fee}`, async () => {
    try {
      result = await voterG4.sdk.getFee('vote_producer', voterG4.address);
      //console.log('result: ', result)
      expect(result.fee).to.equal(config.api.vote_producer.fee);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Execute vote_producer WITH FIO Address (no bundled tx left), confirm fee_collected = ${config.api.vote_producer.fee}`, async () => {
    try {
      const result = await voterG4.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: voterG4.address,
          actor: voterG4.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
      expect(result.fee_collected).to.equal(config.api.vote_producer.fee)
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null);
    }
  })

  it('Confirm fee was deducted from voterG4 account', async () => {
    let origBalance = balance
    try {
        const result = await voterG4.sdk.genericAction('getFioBalance', {
            fioPublicKey: voterG4.publicKey
        })
        //console.log('balance: ', result.balance)
        expect(result.balance).to.equal(origBalance - config.api.vote_producer.fee)
    } catch (err) {
        //console.log('Error', err)
        expect(err).to.equal(null)
    }
})

  it(`Get voterG4 last_vote_weight`, async () => {
    try {
      voterG4.last_vote_weight = await getAccountVoteWeight(voterG4.account);
      //console.log('voterG4 last_vote_weight:', voterG4.last_vote_weight)
    } catch (err) {
      console.log('Error: ', err.json)
    }
  })

  it(`Confirm bp1@dapixdev total_votes increased by voterG4 last_vote_weight`, async () => {
    try {
      prev_total_bp_votes = total_bp_votes;
      total_bp_votes = await getProdVoteTotal('bp1@dapixdev');
      //console.log('bp1@dapixdev total_votes:', total_bp_votes)
      expect(total_bp_votes).to.equal(prev_total_bp_votes + voterG4.last_vote_weight)
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null);
    }
  })

  it('Confirm vote_producer fee for voterG5 is zero (bundles remaining)', async () => {
    try {
      result = await voterG5.sdk.getFee('vote_producer', voterG5.address);
      //console.log('result: ', result)
      expect(result.fee).to.equal(0);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Get balance for voterG5`, async () => {
    try {
        const result = await voterG5.sdk.genericAction('getFioBalance', {
            fioPublicKey: voterG5.publicKey
        })
        balance = result.balance
        //console.log('balance: ', balance)
    } catch (err) {
        //console.log('Error', err)
        expect(err).to.equal(null)
    }
})

  it(`Execute vote_producer WITHOUT FIO Address (with bundled tx left), Confirm fee collected because no address passed in = ${config.api.vote_producer.fee}`, async () => {
    try {
      const result = await voterG5.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: '',
          actor: voterG5.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
      expect(result.fee_collected).to.equal(config.api.vote_producer.fee)
    } catch (err) {
      console.log('Error: ', err.json.fields);
      expect(err).to.equal(null);
    }
  })

  it('Confirm fee was deducted from voterG5 account', async () => {
    let origBalance = balance
    try {
        const result = await voterG5.sdk.genericAction('getFioBalance', {
            fioPublicKey: voterG5.publicKey
        })
        //console.log('balance: ', result.balance)
        expect(result.balance).to.equal(origBalance - config.api.vote_producer.fee)
    } catch (err) {
        //console.log('Error', err)
        expect(err).to.equal(null)
    }
})

  it(`Get voterG5 last_vote_weight`, async () => {
    try {
      voterG5.last_vote_weight = await getAccountVoteWeight(voterG5.account);
    } catch (err) {
      console.log('Error: ', err.json)
    }
  })

  it(`Confirm bp1@dapixdev total_votes increased by voterG5 last_vote_weight`, async () => {
    try {
      prev_total_bp_votes = total_bp_votes;
      total_bp_votes = await getProdVoteTotal('bp1@dapixdev');
      expect(total_bp_votes).to.equal(prev_total_bp_votes + voterG5.last_vote_weight)
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`Use up all of voterG6's bundles with 51 record_obt_data transactions`, async () => {
    for (i = 0; i < 51; i++) {
      try {
        const result = await voterG6.sdk.genericAction('recordObtData', {
          payerFioAddress: voterG6.address,
          payeeFioAddress: voterG5.address,
          payerTokenPublicAddress: voterG6.publicKey,
          payeeTokenPublicAddress: voterG5.publicKey,
          amount: 5000000000,
          chainCode: "BTC",
          tokenCode: "BTC",
          status: '',
          obtId: '',
          maxFee: config.api.record_obt_data.fee,
          technologyProviderId: '',
          payeeFioPublicKey: voterG5.publicKey,
          memo: '',
          hash: '',
          offLineUrl: ''
        })
        //console.log('Result: ', result)
        expect(result.status).to.equal('sent_to_blockchain')
      } catch (err) {
        console.log('Error', err.json)
        expect(err).to.equal(null)
      }
    }
  })

  it(`Add public addresses to voterG6 to use up one more bundle`, async () => {
    try {
      const result = await voterG6.sdk.genericAction('addPublicAddresses', {
        fioAddress: voterG6.address,
        publicAddresses: [
          {
            chain_code: 'ETH',
            token_code: 'ETH',
            public_address: 'ethaddress',
            }
        ],
        maxFee: config.api.add_pub_address.fee,
        walletFioAddress: ''
      })
      //console.log('Result:', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`Confirm vote_producer fee for voterG6 = ${config.api.vote_producer.fee}`, async () => {
    try {
      result = await voterG6.sdk.getFee('vote_producer', voterG6.address);
      //console.log('result: ', result)
      expect(result.fee).to.equal(config.api.vote_producer.fee);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Execute vote_producer WITHOUT FIO Address (no bundled tx left), confirm fee_collected = ${config.api.vote_producer.fee}`, async () => {
    try {
      const result = await voterG6.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: '',
          actor: voterG6.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
      expect(result.fee_collected).to.equal(config.api.vote_producer.fee)
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null);
    }
  })

  it(`Get voterG6 last_vote_weight`, async () => {
    try {
      voterG6.last_vote_weight = await getAccountVoteWeight(voterG6.account);
    } catch (err) {
      console.log('Error: ', err.json)
    }
  })

  it(`Confirm bp1@dapixdev total_votes increased by voterG6 last_vote_weight`, async () => {
    try {
      prev_total_bp_votes = total_bp_votes;
      total_bp_votes = await getProdVoteTotal('bp1@dapixdev');
      expect(total_bp_votes).to.equal(prev_total_bp_votes + voterG6.last_vote_weight)
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null);
    }
  })

})

describe('E.3 Test proxy_vote with and without FIO Address (FIP-9)', () => {
  let proxyG1, voterG7, voterG8, voterG9, voterG10, total_bp_votes, bundleCount, balance

  it(`Create users`, async () => {
    proxyG1 = await newUser(faucet);

    voterG7 = await newUser(faucet);
    voterG8 = await newUser(faucet);
    voterG9 = await newUser(faucet);
    voterG10 = await newUser(faucet);
  })

  it(`Get bp1@dapixdev total_votes`, async () => {
    try {
      total_bp_votes = await getProdVoteTotal('bp1@dapixdev');
      //console.log('bp1@dapixdev total_votes:', total_bp_votes)
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`Register proxyG1 as a proxy`, async () => {
    try {
      const result = await proxyG1.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: proxyG1.address,
          actor: proxyG1.account,
          max_fee: config.api.register_proxy.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`Execute proxyG1 vote_producer`, async () => {
    try {
      const result = await proxyG1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: proxyG1.address,
          actor: proxyG1.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
      expect(result.fee_collected).to.equal(0)
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`Get proxyG1 last_vote_weight`, async () => {
    try {
      proxyG1.last_vote_weight = await getAccountVoteWeight(proxyG1.account);
      //console.log('proxyG1 last_vote_weight:', proxyG1.last_vote_weight)
    } catch (err) {
      console.log('Error: ', err.json)
    }
  })

  it(`Confirm bp1@dapixdev total_votes increased by proxyG1 last_vote_weight`, async () => {
    try {
      prev_total_bp_votes = total_bp_votes;
      total_bp_votes = await getProdVoteTotal('bp1@dapixdev');
      expect(total_bp_votes).to.equal(prev_total_bp_votes + proxyG1.last_vote_weight)
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it('Confirm proxy_vote fee for voterG7 is zero (bundles remaining)', async () => {
    try {
      result = await voterG7.sdk.getFee('proxy_vote', voterG7.address);
      //console.log('result: ', result)
      expect(result.fee).to.equal(0);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it('Get initial bundle count for voterG7', async () => {
    bundleCount = await getBundleCount(voterG7.sdk);
    expect(bundleCount).to.be.greaterThan(0);
  })

  it(`Get balance for voterG7`, async () => {
    try {
        const result = await voterG7.sdk.genericAction('getFioBalance', {
            fioPublicKey: voterG7.publicKey
        })
        balance = result.balance
        //console.log('balance: ', balance)
    } catch (err) {
        //console.log('Error', err)
        expect(err).to.equal(null)
    }
})

  it(`Execute proxy_vote WITH FIO Address (with bundled tx left), expect fee = 0`, async () => {
    try {
      const result = await voterG7.sdk.genericAction('pushTransaction', {
        action: 'voteproxy',
        account: 'eosio',
        data: {
          proxy: proxyG1.address,
          fio_address: voterG7.address,
          actor: voterG7.account,
          max_fee: config.api.proxy_vote.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
      expect(result.fee_collected).to.equal(0)
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it('Confirm NO fee was deducted from voterG7 account', async () => {
    let origBalance = balance
    try {
        const result = await voterG7.sdk.genericAction('getFioBalance', {
            fioPublicKey: voterG7.publicKey
        })
        //console.log('balance: ', result.balance)
        expect(result.balance).to.equal(origBalance)
    } catch (err) {
        //console.log('Error', err)
        expect(err).to.equal(null)
    }
  })

  it('Confirm bundle count for voterG7', async () => {
    prevBundleCount = bundleCount;
    bundleCount = await getBundleCount(voterG7.sdk);
    expect(bundleCount).to.equal(prevBundleCount - 1);
  })

  it(`Get voterG7 last_vote_weight`, async () => {
    try {
      voterG7.last_vote_weight = await getAccountVoteWeight(voterG7.account);
      //console.log('voterG7 last_vote_weight:', voterG7.last_vote_weight)
    } catch (err) {
      console.log('Error: ', err.json)
    }
  })

  it(`Confirm bp1@dapixdev total_votes increased by voterG7 last_vote_weight`, async () => {
    try {
      prev_total_bp_votes = total_bp_votes;
      total_bp_votes = await getProdVoteTotal('bp1@dapixdev');
      expect(total_bp_votes).to.equal(prev_total_bp_votes + voterG7.last_vote_weight)
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`Use up all of voterG8's bundles with 51 record_obt_data transactions`, async () => {
    for (i = 0; i < 51; i++) {
      try {
        const result = await voterG8.sdk.genericAction('recordObtData', {
          payerFioAddress: voterG8.address,
          payeeFioAddress: voterG7.address,
          payerTokenPublicAddress: voterG8.publicKey,
          payeeTokenPublicAddress: voterG7.publicKey,
          amount: 5000000000,
          chainCode: "BTC",
          tokenCode: "BTC",
          status: '',
          obtId: '',
          maxFee: config.api.record_obt_data.fee,
          technologyProviderId: '',
          payeeFioPublicKey: voterG7.publicKey,
          memo: '',
          hash: '',
          offLineUrl: ''
        })
        //console.log('Result: ', result)
        expect(result.status).to.equal('sent_to_blockchain')
      } catch (err) {
        console.log('Error', err.json);
        expect(err).to.equal(null);
      }
    }
  })

  it(`Add public addresses to voterG8 to use up one more bundle`, async () => {
    try {
      const result = await voterG8.sdk.genericAction('addPublicAddresses', {
        fioAddress: voterG8.address,
        publicAddresses: [
          {
            chain_code: 'ETH',
            token_code: 'ETH',
            public_address: 'ethaddress',
            }
        ],
        maxFee: config.api.add_pub_address.fee,
        walletFioAddress: ''
      })
      //console.log('Result:', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it('Wait a few seconds.', async () => {
    await timeout(5000);
  })

  it(`Confirm proxy_vote fee for voterG8 = ${config.api.proxy_vote.fee}`, async () => {
    try {
      result = await voterG8.sdk.getFee('proxy_vote', voterG8.address);
      //console.log('result: ', result)
      expect(result.fee).to.equal(config.api.proxy_vote.fee);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Get balance for voterG8`, async () => {
    try {
        const result = await voterG8.sdk.genericAction('getFioBalance', {
            fioPublicKey: voterG8.publicKey
        })
        balance = result.balance
        //console.log('balance: ', balance)
    } catch (err) {
        //console.log('Error', err)
        expect(err).to.equal(null)
    }
  })

  it(`Execute proxy_vote WITH FIO Address (no bundled tx left), confirm fee_collected = ${config.api.proxy_vote.fee}`, async () => {
    try {
      const result = await voterG8.sdk.genericAction('pushTransaction', {
        action: 'voteproxy',
        account: 'eosio',
        data: {
          proxy: proxyG1.address,
          fio_address: voterG8.address,
          actor: voterG8.account,
          max_fee: config.api.proxy_vote.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
      expect(result.fee_collected).to.equal(config.api.proxy_vote.fee)
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null);
    }
  })

  it('Confirm fee WAS deducted from voterG8 account', async () => {
    let origBalance = balance
    try {
        const result = await voterG8.sdk.genericAction('getFioBalance', {
            fioPublicKey: voterG8.publicKey
        })
        //console.log('balance: ', result.balance)
        expect(result.balance).to.equal(origBalance - config.api.proxy_vote.fee)
    } catch (err) {
        //console.log('Error', err)
        expect(err).to.equal(null)
    }
  })

  it(`Get voterG8 last_vote_weight`, async () => {
    try {
      voterG8.last_vote_weight = await getAccountVoteWeight(voterG8.account);
    } catch (err) {
      console.log('Error: ', err.json)
    }
  })

  it(`Confirm bp1@dapixdev total_votes increased by voterG8 last_vote_weight`, async () => {
    try {
      prev_total_bp_votes = total_bp_votes;
      total_bp_votes = await getProdVoteTotal('bp1@dapixdev');
      //console.log('bp1@dapixdev total_votes:', total_bp_votes)
      expect(total_bp_votes).to.equal(prev_total_bp_votes + voterG8.last_vote_weight)
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null);
    }
  })

  it('Confirm proxy_vote fee for voterG9 is zero (bundles remaining)', async () => {
    try {
      result = await voterG9.sdk.getFee('proxy_vote', voterG9.address);
      //console.log('result: ', result)
      expect(result.fee).to.equal(0);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Get balance for voterG9`, async () => {
    try {
        const result = await voterG9.sdk.genericAction('getFioBalance', {
            fioPublicKey: voterG9.publicKey
        })
        balance = result.balance
        //console.log('balance: ', balance)
    } catch (err) {
        //console.log('Error', err)
        expect(err).to.equal(null)
    }
  })

  it(`Execute proxy_vote WITHOUT FIO Address (with bundled tx left), Confirm fee collected because no address passed in = ${config.api.proxy_vote.fee}`, async () => {
    try {
      const result = await voterG9.sdk.genericAction('pushTransaction', {
        action: 'voteproxy',
        account: 'eosio',
        data: {
          proxy: proxyG1.address,
          fio_address: '',
          actor: voterG9.account,
          max_fee: config.api.proxy_vote.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
      expect(result.fee_collected).to.equal(config.api.proxy_vote.fee)
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  })

  it('Confirm fee deducted from voterG9 account', async () => {
    let origBalance = balance
    try {
        const result = await voterG9.sdk.genericAction('getFioBalance', {
            fioPublicKey: voterG9.publicKey
        })
        //console.log('balance: ', result.balance)
        expect(result.balance).to.equal(origBalance - config.api.proxy_vote.fee)
    } catch (err) {
        //console.log('Error', err)
        expect(err).to.equal(null)
    }
  })

  it(`Get voterG9 last_vote_weight`, async () => {
    try {
      voterG9.last_vote_weight = await getAccountVoteWeight(voterG9.account);
    } catch (err) {
      console.log('Error: ', err.json)
    }
  })

  it(`Confirm bp1@dapixdev total_votes increased by voterG9 last_vote_weight`, async () => {
    try {
      prev_total_bp_votes = total_bp_votes;
      total_bp_votes = await getProdVoteTotal('bp1@dapixdev');
      expect(total_bp_votes).to.equal(prev_total_bp_votes + voterG9.last_vote_weight)
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  })

  it(`Use up all of voterG10's bundles with 51 record_obt_data transactions`, async () => {
    for (i = 0; i < 51; i++) {
      try {
        const result = await voterG10.sdk.genericAction('recordObtData', {
          payerFioAddress: voterG10.address,
          payeeFioAddress: voterG9.address,
          payerTokenPublicAddress: voterG10.publicKey,
          payeeTokenPublicAddress: voterG9.publicKey,
          amount: 5000000000,
          chainCode: "BTC",
          tokenCode: "BTC",
          status: '',
          obtId: '',
          maxFee: config.api.record_obt_data.fee,
          technologyProviderId: '',
          payeeFioPublicKey: voterG9.publicKey,
          memo: '',
          hash: '',
          offLineUrl: ''
        })
        //console.log('Result: ', result)
        expect(result.status).to.equal('sent_to_blockchain')
      } catch (err) {
        console.log('Error', err.json);
        expect(err).to.equal(null);
      }
    }
  })

  it(`Add public addresses to voterG10 to use up one more bundle`, async () => {
    try {
      const result = await voterG10.sdk.genericAction('addPublicAddresses', {
        fioAddress: voterG10.address,
        publicAddresses: [
          {
            chain_code: 'ETH',
            token_code: 'ETH',
            public_address: 'ethaddress',
            }
        ],
        maxFee: config.api.add_pub_address.fee,
        walletFioAddress: ''
      })
      //console.log('Result:', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it('Wait a few seconds.', async () => {
    await timeout(3000);
  })

  it(`Confirm proxy_vote fee for voterG10 = ${config.api.proxy_vote.fee}`, async () => {
    try {
      result = await voterG10.sdk.getFee('proxy_vote', voterG10.address);
      //console.log('result: ', result)
      expect(result.fee).to.equal(config.api.proxy_vote.fee);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Get balance for voterG10`, async () => {
    try {
        const result = await voterG10.sdk.genericAction('getFioBalance', {
            fioPublicKey: voterG10.publicKey
        })
        balance = result.balance
        //console.log('balance: ', balance)
    } catch (err) {
        //console.log('Error', err)
        expect(err).to.equal(null)
    }
  })

  it(`Execute proxy_vote WITHOUT FIO Address (no bundled tx left), confirm fee_collected = ${config.api.proxy_vote.fee}`, async () => {
    try {
      const result = await voterG10.sdk.genericAction('pushTransaction', {
        action: 'voteproxy',
        account: 'eosio',
        data: {
          proxy: proxyG1.address,
          fio_address: '',
          actor: voterG10.account,
          max_fee: config.api.proxy_vote.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
      expect(result.fee_collected).to.equal(config.api.proxy_vote.fee)
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null);
    }
  })

  it('Confirm fee WAS deducted from voterG10 account', async () => {
    let origBalance = balance
    try {
        const result = await voterG10.sdk.genericAction('getFioBalance', {
            fioPublicKey: voterG10.publicKey
        })
        //console.log('balance: ', result.balance)
        expect(result.balance).to.equal(origBalance - config.api.proxy_vote.fee)
    } catch (err) {
        //console.log('Error', err)
        expect(err).to.equal(null)
    }
  })

  it(`Get voterG10 last_vote_weight`, async () => {
    try {
      voterG10.last_vote_weight = await getAccountVoteWeight(voterG10.account);
    } catch (err) {
      console.log('Error: ', err.json)
    }
  })

  it(`Confirm bp1@dapixdev total_votes increased by voterG10 last_vote_weight`, async () => {
    try {
      prev_total_bp_votes = total_bp_votes;
      total_bp_votes = await getProdVoteTotal('bp1@dapixdev');
      expect(total_bp_votes).to.equal(prev_total_bp_votes + voterG10.last_vote_weight)
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null);
    }
  })

})

describe('F. When a user proxies their vote, the total_voted_fio increases by 2x their vote strength (Fixed in Gemini: MAS-1489)', () => {
  let proxyH1, voterH1, total_voted_fio, original_total_voted_fio

  it(`Create users`, async () => {
    proxyH1 = await newUser(faucet);
    voterH1 = await newUser(faucet);
  })

  it(`Get original total_voted_fio`, async () => {
    total_voted_fio = await getTotalVotedFio();
    original_total_voted_fio = total_voted_fio;
    //console.log('total_voted_fio:', total_voted_fio)
  })

  it(`Register proxyH1 as a proxy`, async () => {
    try {
      const result = await proxyH1.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: proxyH1.address,
          actor: proxyH1.account,
          max_fee: config.api.register_proxy.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
    }
  })

  it(`Wait a few seconds.`, async () => { await timeout(3000) })

  it(`proxyH1 votes for bp1@dapixdev`, async () => {
    try {
      const result = await proxyH1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: proxyH1.address,
          actor: proxyH1.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
    }
  })

  it(`Get proxyH1 last_vote_weight`, async () => {
    try {
      proxyH1.last_vote_weight = await getAccountVoteWeight(proxyH1.account)
      //console.log('proxyH1.last_vote_weight: ', proxyH1.last_vote_weight)
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`total_voted_fio increased by proxyH1 last_vote_weight`, async () => {
    try {
      let prev_total_voted_fio = total_voted_fio
      total_voted_fio = await getTotalVotedFio();
      //console.log('total_voted_fio: ', total_voted_fio)
      expect(total_voted_fio).to.equal(prev_total_voted_fio + proxyH1.last_vote_weight)
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`voterH1 proxy votes to proxyH1`, async () => {
    try {
      const result = await voterH1.sdk.genericAction('pushTransaction', {
        action: 'voteproxy',
        account: 'eosio',
        data: {
          proxy: proxyH1.address,
          fio_address: voterH1.address,
          actor: voterH1.account,
          max_fee: config.api.proxy_vote.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
    }
  })

  it(`Get proxyH1 last_vote_weight`, async () => {
    try {
      proxyH1.last_vote_weight = await getAccountVoteWeight(proxyH1.account)
      //console.log('proxyH1.last_vote_weight: ', proxyH1.last_vote_weight)
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`Get voterH1 last_vote_weight`, async () => {
    try {
      voterH1.last_vote_weight = await getAccountVoteWeight(voterH1.account);
      //console.log('voterH1.last_vote_weight:', voterH1.last_vote_weight)
    } catch (err) {
      console.log('Error: ', err.json)
    }
  })

  it(`total_voted_fio increased by voterH1 last_vote_weight`, async () => {
    try {
      let prev_total_voted_fio = total_voted_fio
      total_voted_fio = await getTotalVotedFio();
      //console.log('original_total_voted_fio: ', original_total_voted_fio/config.BILLION)
      //console.log('proxyH1.last_vote_weight: ', proxyH1.last_vote_weight/config.BILLION)
      //console.log('voterH1.last_vote_weight:', voterH1.last_vote_weight/config.BILLION)
      //console.log('total_voted_fio: ', total_voted_fio/config.BILLION)
      //console.log('total_voted_fio - original_total_voted_fio = ', total_voted_fio/config.BILLION - original_total_voted_fio/config.BILLION)
      expect(total_voted_fio).to.equal(prev_total_voted_fio + voterH1.last_vote_weight)
    } catch (err) {
      console.log('Error', err)
    }
  })

})

describe('G. Confirm voter data is returned with get_account', () => {
  let voterH1

  it(`Create users`, async () => {
    voterH1 = await newUser(faucet);
  })

  it(`Wait a few seconds.`, async () => { await timeout(3000) })

  it(`Get account info for voterH1`, async () => {
    try {
      const json = {
        "account_name": voterH1.account
      }
      result = await callFioApi("get_account", json);
      //console.log('Result: ', result);
      expect(result.voter_info).to.equal(null);
    } catch (err) {
      //console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`voterH1 votes for bp1@dapixdev`, async () => {
    try {
      const result = await voterH1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: voterH1.address,
          actor: voterH1.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal(null)
    }
  })

  it(`Get account info for voterH1 and confirm voter_info has owner:voterH1.account and producers:[bp1]`, async () => {
    try {
      const json = {
        "account_name": voterH1.account
      }
      result = await callFioApi("get_account", json);
      //console.log('Result: ', result);
      expect(result.voter_info.owner).to.equal(voterH1.account);
      expect(result.voter_info.producers[0]).to.equal('qbxn5zhw2ypw');  // bp1@dapixdev account
    } catch (err) {
      //console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

})

describe(`H. Test proxy re-vote of proxy, re-proxy of voter`, () => {

  let user1, proxyA1, total_voted_fio, total_bp_votes

  it(`Create users`, async () => {
    user1 = await newUser(faucet);
    proxyA1 = await newUser(faucet);
  })

  it(`Wait a few seconds.`, async () => { await timeout(3000) })

  it(`Register proxyA1 as a proxy`, async () => {
    try {
      const result = await proxyA1.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: proxyA1.address,
          actor: proxyA1.account,
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

  it(`Wait a few seconds.`, async () => { await timeout(5000) })

  it(`proxyA1 votes for bp1@dapixdev using address #1`, async () => {
    try {
      const result = await proxyA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: proxyA1.address,
          actor: proxyA1.account,
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

  it(`Wait a few seconds.`, async () => { await timeout(5000) })

  it(`user1 proxies votes to proxyA1`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'voteproxy',
        account: 'eosio',
        data: {
          proxy: proxyA1.address,
          fio_address: user1.address,
          actor: user1.account,
          max_fee: config.maxFee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`Get total_voted_fio`, async () => {
    total_voted_fio = await getTotalVotedFio();
    //console.log('total_voted_fio:', total_voted_fio)
  })

  it(`Get proxyA1 last_vote_weight`, async () => {
    try {
      proxyA1.last_vote_weight = await getAccountVoteWeight(proxyA1.account);
      //console.log('proxyA1.last_vote_weight: ', proxyA1.last_vote_weight)
    } catch (err) {
      console.log('Error: ', err.json)
    }
  })

  it(`Get bp1@dapixdev total_votes`, async () => {
    try {
      total_bp_votes = await getProdVoteTotal('bp1@dapixdev');
      //console.log('bp1@dapixdev total_votes:', total_bp_votes)
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

  it(`proxyA1 votes AGAIN for bp1@dapixdev using address #1`, async () => {
    try {
      const result = await proxyA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: proxyA1.address,
          actor: proxyA1.account,
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

  it(`bp1@dapixdev total_votes did not change`, async () => {
    try {
      let prev_total_bp_votes = total_bp_votes;
      total_bp_votes = await getProdVoteTotal('bp1@dapixdev');
      //console.log('bp1@dapixdev total_votes:', total_bp_votes)
      expect(total_bp_votes).to.equal(prev_total_bp_votes)
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

  it(`prev_total_voted_fio did not change`, async () => {
    try {
      let prev_total_voted_fio = total_voted_fio;
      total_voted_fio = await getTotalVotedFio();
      //console.log('total_voted_fio:', total_voted_fio)
      expect(total_voted_fio).to.equal(prev_total_voted_fio)
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

  it(`Get user1 last_vote_weight`, async () => {
    try {
      user1.last_vote_weight = await getAccountVoteWeight(user1.account);
      //console.log('user1.last_vote_weight: ', user1.last_vote_weight)
    } catch (err) {
      console.log('Error: ', err.json)
    }
  })

  it(`Wait a few seconds.`, async () => { await timeout(5000) })

  it(`user1 proxies votes AGAIN to proxyA1`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'voteproxy',
        account: 'eosio',
        data: {
          proxy: proxyA1.address,
          fio_address: user1.address,
          actor: user1.account,
          max_fee: config.maxFee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`bp1@dapixdev total_votes did not change`, async () => {
    try {
      let prev_total_bp_votes = total_bp_votes;
      total_bp_votes = await getProdVoteTotal('bp1@dapixdev');
      //console.log('bp1@dapixdev total_votes:', total_bp_votes)
      expect(total_bp_votes).to.equal(prev_total_bp_votes)
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

  it(`prev_total_voted_fio did not change`, async () => {
    try {
      let prev_total_voted_fio = total_voted_fio;
      total_voted_fio = await getTotalVotedFio();
      //console.log('total_voted_fio:', total_voted_fio)
      expect(total_voted_fio).to.equal(prev_total_voted_fio)
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

})

describe(`I. Test impact on total_voted_fio when User 1 votes then proxies their votes`, () => {

  let user1, proxyA1, total_voted_fio, total_bp_votes

  it(`Create users`, async () => {
    user1 = await newUser(faucet);
    proxyA1 = await newUser(faucet);
  })

  it(`Wait a few seconds.`, async () => { await timeout(3000) })

  it(`Register proxyA1 as a proxy`, async () => {
    try {
      const result = await proxyA1.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: proxyA1.address,
          actor: proxyA1.account,
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

  it(`Wait a few seconds.`, async () => { await timeout(3000) })

  it(`proxyA1 votes for bp1@dapixdev using address #1`, async () => {
    try {
      const result = await proxyA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: proxyA1.address,
          actor: proxyA1.account,
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

  it(`user1 votes for bp1@dapixdev`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: user1.address,
          actor: user1.account,
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

  it(`Wait a few seconds.`, async () => { await timeout(4000) })

  it(`Get total_voted_fio`, async () => {
    total_voted_fio = await getTotalVotedFio();
    //console.log('total_voted_fio:', total_voted_fio)
  })

  it(`Get proxyA1 last_vote_weight`, async () => {
    try {
      proxyA1.last_vote_weight = await getAccountVoteWeight(proxyA1.account);
      //console.log('proxyA1.last_vote_weight: ', proxyA1.last_vote_weight)
    } catch (err) {
      console.log('Error: ', err.json)
    }
  })

  it(`Get user1 FIO Balance, set user1.last_vote_weight = balance`, async () => {
    try {
      const result = await user1.sdk.genericAction('getFioBalance', {
        fioPublicKey: user1.publicKey
      })
      user1.last_vote_weight = result.balance
      //console.log('user1 fio balance', result.balance)
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal('null')
    }
  })

  it(`Get bp1@dapixdev total_votes`, async () => {
    try {
      total_bp_votes = await getProdVoteTotal('bp1@dapixdev');
      //console.log('bp1@dapixdev total_votes:', total_bp_votes)
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

  it(`user1 proxies votes to proxyA1 (after having already directly voted for bp1@dapixdev)`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'voteproxy',
        account: 'eosio',
        data: {
          proxy: proxyA1.address,
          fio_address: user1.address,
          actor: user1.account,
          max_fee: config.maxFee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`Wait a few seconds.`, async () => { await timeout(4000) })

  it(`bp1@dapixdev total_votes did not change (votes just shifted from direct vote to proxy vote via proxyA1)`, async () => {
    try {
      let prev_total_bp_votes = total_bp_votes;
      total_bp_votes = await getProdVoteTotal('bp1@dapixdev');
      //console.log('bp1@dapixdev total_votes:', total_bp_votes)
      expect(total_bp_votes).to.equal(prev_total_bp_votes)
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

  it.skip(`BUG BD-2280: prev_total_voted_fio did not change (votes just shifted from direct vote to proxy vote via proxyA1)`, async () => {
    try {
      let prev_total_voted_fio = total_voted_fio;
      total_voted_fio = await getTotalVotedFio();
      //console.log('total_voted_fio:', total_voted_fio)
      expect(total_voted_fio).to.equal(prev_total_voted_fio)
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

})

describe(`J. Test total_voted_fio when user votes for proxy`, () => {

  let user1, proxyA1, total_voted_fio, total_bp_votes

  it(`Create users`, async () => {
    user1 = await newUser(faucet);
    proxyA1 = await newUser(faucet);
  })

  it(`Wait a few seconds.`, async () => { await timeout(5000) })

  it(`Get initial total_voted_fio`, async () => {
    total_voted_fio = await getTotalVotedFio();
    //console.log('total_voted_fio:', total_voted_fio)
  })

  it(`Get proxyA1 last_vote_weight`, async () => {
    try {
      proxyA1.last_vote_weight = await getAccountVoteWeight(proxyA1.account);
      //console.log('proxyA1.last_vote_weight:', proxyA1.last_vote_weight)
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }
  })

  it(`Get bp1@dapixdev total_votes`, async () => {
    try {
      total_bp_votes = await getProdVoteTotal('bp1@dapixdev');
      //console.log('bp1@dapixdev total_votes:', total_bp_votes)
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

  it(`Register proxyA1 as a proxy`, async () => {
    try {
      const result = await proxyA1.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: proxyA1.address,
          actor: proxyA1.account,
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

  it(`Wait a few seconds.`, async () => { await timeout(5000) })

  it(`Get total_voted_fio before proxyA1 votes`, async () => {
    total_voted_fio = await getTotalVotedFio();
    //console.log('total_voted_fio:', total_voted_fio)
  })

  it(`proxyA1 votes for bp1@dapixdev using address #1`, async () => {
    try {
      const result = await proxyA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: proxyA1.address,
          actor: proxyA1.account,
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

  it(`Wait a few seconds.`, async () => { await timeout(5000) })

  it(`Get proxyA1 last_vote_weight`, async () => {
    try {
      proxyA1.last_vote_weight = await getAccountVoteWeight(proxyA1.account);
      //console.log('proxyA1.last_vote_weight: ', proxyA1.last_vote_weight)
    } catch (err) {
      console.log('Error: ', err.json)
    }
  })

  it(`Get user1 last_vote_weight. Expect null`, async () => {
    try {
      user1.last_vote_weight = await getAccountVoteWeight(user1.account);
      //console.log('user1.last_vote_weight: ', user1.last_vote_weight)
      expect(user1.last_vote_weight).to.equal(null)
    } catch (err) {
      console.log('Error: ', err.json)
    }
  })

  it(`Get user1 FIO Balance, set user1.last_vote_weight = balance`, async () => {
    try {
      const result = await user1.sdk.genericAction('getFioBalance', {
        fioPublicKey: user1.publicKey
      })
      user1.last_vote_weight = result.balance
      //console.log('user1 fio balance', result.balance)
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal('null')
    }
  })

  it(`Get total_voted_fio`, async () => {
    total_voted_fio = await getTotalVotedFio();
    //console.log('total_voted_fio:', total_voted_fio)
  })

  it(`Get bp1@dapixdev total_votes`, async () => {
    try {
      total_bp_votes = await getProdVoteTotal('bp1@dapixdev');
      //console.log('bp1@dapixdev total_votes:', total_bp_votes)
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

  it(`Wait a few seconds.`, async () => { await timeout(5000) })

  it(`Proxy user1 votes to proxyA1`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'voteproxy',
        account: 'eosio',
        data: {
          proxy: proxyA1.address,
          fio_address: user1.address,
          actor: user1.account,
          max_fee: config.maxFee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`Wait a few seconds.`, async () => { await timeout(5000) })

  it(`bp1@dapixdev total_votes increased by user1 last_vote_weight`, async () => {
    try {
      let prev_total_bp_votes = total_bp_votes;
      total_bp_votes = await getProdVoteTotal('bp1@dapixdev');
      //console.log('bp1@dapixdev total_votes:', total_bp_votes)
      expect(total_bp_votes).to.equal(prev_total_bp_votes + user1.last_vote_weight)
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

  it(`prev_total_voted_fio increased by user1 last_vote_weight`, async () => {
    try {
      let prev_total_voted_fio = total_voted_fio;
      total_voted_fio = await getTotalVotedFio();
      //console.log('total_voted_fio:', total_voted_fio)
      expect(total_voted_fio).to.equal(prev_total_voted_fio + user1.last_vote_weight)
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

  it(`Get faucet last_vote_weight`, async () => {
    try {
      faucet.last_vote_weight = await getAccountVoteWeight(faucet.account);
      //console.log('faucet.last_vote_weight: ', faucet.last_vote_weight)
    } catch (err) {
      console.log('Error: ', err.json)
    }
  })

  it(`faucet votes for bp1@dapixdev using address #1`, async () => {
    try {
      const result = await faucet.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: faucet.address,
          actor: faucet.account,
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

  it(`Wait a few seconds.`, async () => { await timeout(6000) })

  it.skip(`Always fails on first run. Need to fix. bp1@dapixdev total_votes increased by faucet last_vote_weight`, async () => {
    try {
      let prev_total_bp_votes = total_bp_votes;
      total_bp_votes = await getProdVoteTotal('bp1@dapixdev');
      //console.log('bp1@dapixdev total_votes:', total_bp_votes)
      expect(total_bp_votes).to.equal(prev_total_bp_votes + faucet.last_vote_weight)
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

  it.skip(`Always fails on first run. Need to fix. prev_total_voted_fio increased by faucet last_vote_weight`, async () => {
    try {
      let prev_total_voted_fio = total_voted_fio;
      total_voted_fio = await getTotalVotedFio();
      //console.log('total_voted_fio:', total_voted_fio)
      expect(total_voted_fio).to.equal(prev_total_voted_fio + faucet.last_vote_weight)
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

})

describe(`K. regproxy results in faulty record in voters table if account already has a voteproducer record (fixed BD-2028)`, () => {

  let proxyA1

  it(`Create users`, async () => {
    proxyA1 = await newUser(faucet);
  })

  it(`Wait a few seconds.`, async () => { await timeout(3000) })

  it(`Create voters record: proxyA1 votes for bp1@dapixdev using address #1`, async () => {
    try {
      const result = await proxyA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: proxyA1.address,
          actor: proxyA1.account,
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

  it('Confirm voters record:  ', async () => {
    try {
        const json = {
            json: true,
            code: 'eosio',
            scope: 'eosio',
            table: 'voters',
            limit: 1000,
            reverse: false,
            show_payer: false
        }
        voters = await callFioApi("get_table_rows", json);
        //console.log('voters: ', voters);
        for (voter in voters.rows) {
            if (voters.rows[voter].owner == proxyA1.account) {
              //console.log('voters.rows[voter]: ', voters.rows[voter]);
              break;
            }
        }
        expect(voters.rows[voter].owner).to.equal(proxyA1.account);
        expect(voters.rows[voter].is_proxy).to.equal(0);
        expect(voters.rows[voter].fioaddress).to.equal('');
        //expect(voters.rows[voter].addresshash).to.equal('0x00000000000000000000000000000000');
        
    } catch (err) {
        console.log('Error', err);
        expect(err).to.equal(null);
    }
  })

  it(`Register proxyA1 as a proxy`, async () => {
    try {
      const result = await proxyA1.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: proxyA1.address,
          actor: proxyA1.account,
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

  it('Confirm voters record:  ', async () => {
    try {
        const json = {
            json: true,               // Get the response as json
            code: 'eosio',      // Contract that we target
            scope: 'eosio',         // Account that owns the data
            table: 'voters',        // Table name
            limit: 1000,                // Maximum number of rows that we want to get
            reverse: false,           // Optional: Get reversed data
            show_payer: false          // Optional: Show ram payer
        }
        voters = await callFioApi("get_table_rows", json);
        //console.log('voters: ', voters);
        for (voter in voters.rows) {
            if (voters.rows[voter].owner == proxyA1.account) {
              //console.log('voters.rows[voter]: ', voters.rows[voter]);
              break;
            }
        }
        expect(voters.rows[voter].owner).to.equal(proxyA1.account);
        expect(voters.rows[voter].is_proxy).to.equal(1);
        expect(voters.rows[voter].fioaddress).to.equal(proxyA1.address);
        expect(voters.rows[voter].addresshash).to.not.equal('0x00000000000000000000000000000000');
    } catch (err) {
        console.log('Error', err);
        expect(err).to.equal(null);
    }
  })

})

describe(`L. Test total_voted_fio when user changes votes`, () => {

  let user1, total_voted_fio, totalVotesBP1, totalVotesBP2, totalVotesBP3

  it(`Create users`, async () => {
    user1 = await newUser(faucet);
  })

  it(`Wait a few seconds.`, async () => { await timeout(3000) })

  it(`Get initial total_voted_fio`, async () => {
    total_voted_fio = await getTotalVotedFio();
    //console.log('total_voted_fio:', total_voted_fio / 1000000000)
  })

  it(`Get bp1@dapixdev total_votes`, async () => {
    try {
      totalVotesBP1 = await getProdVoteTotal('bp1@dapixdev');
      //console.log('bp1@dapixdev total_votes:', totalVotesBP1 / 1000000000)
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

  it(`Get bp2@dapixdev total_votes`, async () => {
    try {
      totalVotesBP2 = await getProdVoteTotal('bp2@dapixdev');
      //console.log('bp2@dapixdev total_votes:', totalVotesBP2 / 1000000000)
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

  it(`Get bp3@dapixdev total_votes`, async () => {
    try {
      totalVotesBP3 = await getProdVoteTotal('bp3@dapixdev');
      //console.log('bp1@dapixdev total_votes:', totalVotesBP3)
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

  it(`Get user1.last_vote_weight`, async () => {
    try {
      user1.last_vote_weight = await getAccountVoteWeight(user1.account);
      //console.log('user1.last_vote_weight: ', user1.last_vote_weight / 1000000000)
    } catch (err) {
      console.log('Error: ', err.json)
    }
  })

  it(`user1 votes for bp1 and bp2`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev',
            'bp2@dapixdev'
          ],
          fio_address: user1.address,
          actor: user1.account,
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

  it(`Wait a few seconds.`, async () => { await timeout(3000) })

  it(`Get user1.last_vote_weight`, async () => {
    try {
      user1.last_vote_weight = await getAccountVoteWeight(user1.account);
      //console.log('user1.last_vote_weight: ', user1.last_vote_weight / 1000000000)
    } catch (err) {
      console.log('Error: ', err.json)
    }
  })

  it(`prev_total_voted_fio increased by user1 vote weight`, async () => {
    try {
      let prev_total_voted_fio = total_voted_fio;
      //console.log('prev_total_voted_fio:', prev_total_voted_fio / 1000000000)
      total_voted_fio = await getTotalVotedFio();
      //console.log('total_voted_fio:', total_voted_fio / 1000000000)
      expect(total_voted_fio).to.equal(prev_total_voted_fio + user1.last_vote_weight)
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

  it(`Expect: totalVotesBP1 increases by user1.last_vote_weight`, async () => {
    try {
      let prevVotes = totalVotesBP1
      totalVotesBP1 = await getProdVoteTotal('bp1@dapixdev');
      //console.log('bp1@dapixdev total_votes:', totalVotesBP1 / 1000000000)
      expect(totalVotesBP1).to.equal(prevVotes + user1.last_vote_weight)
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

  it(`Expect: totalVotesBP2 increases by user1.last_vote_weight`, async () => {
    try {
      let prevVotes = totalVotesBP2
      totalVotesBP2 = await getProdVoteTotal('bp2@dapixdev');
      //console.log('bp2@dapixdev total_votes:', totalVotesBP2 / 1000000000)
      expect(totalVotesBP2).to.equal(prevVotes + user1.last_vote_weight)
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })
 
  it(`user1 votes for bp1 only`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: user1.address,
          actor: user1.account,
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

  it(`Wait a few seconds.`, async () => { await timeout(3000) })

  it(`total_voted_fio does not change`, async () => {
    try {
      let prev_total_voted_fio = total_voted_fio;
      total_voted_fio = await getTotalVotedFio();
      //console.log('total_voted_fio:', total_voted_fio)
      expect(total_voted_fio).to.equal(prev_total_voted_fio)
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

  it(`Expect: totalVotesBP1 to stay the same`, async () => {
    try {
      let prevVotes = totalVotesBP1
      totalVotesBP1 = await getProdVoteTotal('bp1@dapixdev');
      //console.log('bp1@dapixdev total_votes:', totalVotesBP1)
      expect(totalVotesBP1).to.equal(prevVotes)
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

  it(`Expect: totalVotesBP2 decrease by user1.last_vote_weight`, async () => {
    try {
      let prevVotes = totalVotesBP2
      totalVotesBP2 = await getProdVoteTotal('bp2@dapixdev');
      //console.log('bp2@dapixdev total_votes:', totalVotesBP2)
      expect(totalVotesBP2).to.equal(prevVotes - user1.last_vote_weight)
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

})


describe(`M. Set Auto-proxy, then vote for producer (attempting to repro BD-3800 but failed)`, () => {

  let user1, proxy1, total_voted_fio, totalVotesBP1, totalVotesBP2, totalVotesBP3

  it(`Create users`, async () => {
    user1 = await newUser(faucet);
    proxy1 = await newUser(faucet);
  })

  it(`Wait a few seconds.`, async () => { await timeout(1000) })

  it(`Register proxy1 as a proxy`, async () => {
    try {
      const result = await proxy1.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: proxy1.address,
          actor: proxy1.account,
          max_fee: config.maxFee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      //console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }
  })

  it(`Transfer 100 FIO tokens with a registered proxy as TPID to set autoproxy for user1`, async function () {
    await user1.sdk.genericAction('pushTransaction', {
      action: 'trnsfiopubky',
      account: 'fio.token',
      data: {
        payee_public_key: proxy1.publicKey,
        amount: 100000000000,
        max_fee: config.maxFee,
        actor: faucet.account,
        tpid: proxy1.address
      }
    });
  });


  it(`Wait a few seconds.`, async () => { await timeout(2000) })

  it('confirm user1: is in the voters table and is_auto_proxy = 1, proxy is proxy1.account', async () => {
    let inVotersTable;
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'voters',
        lower_bound: user1.account,
        upper_bound: user1.account,
        key_type: "name",
        index_position: 3,
      }
      const voterInfo = await callFioApi("get_table_rows", json);
      //console.log('voterInfo: ', voterInfo);
      expect(voterInfo.rows[0].is_auto_proxy).to.equal(1);
      expect(voterInfo.rows[0].producers.length).to.equal(0);  // Has not voted for producers
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  });
 
 
  it(`user1 votes for bp1 and bp2`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev',
            'bp2@dapixdev'
          ],
          fio_address: user1.address,
          actor: user1.account,
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

  it('confirm user1: is in the voters table and is_auto_proxy = 0, proxy is proxy1.account', async () => {
    let inVotersTable;
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'voters',
        lower_bound: user1.account,
        upper_bound: user1.account,
        key_type: "name",
        index_position: 3,
      }
      const voterInfo = await callFioApi("get_table_rows", json);
      //console.log('voterInfo: ', voterInfo);
      expect(voterInfo.rows[0].is_auto_proxy).to.equal(0);
      expect(voterInfo.rows[0].producers.length).to.equal(2);  // Has not voted for producers
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  });

  it(`Transfer more FIO to user1. Expect success`, async function () {
    await faucet.genericAction('pushTransaction', {
      action: 'trnsfiopubky',
      account: 'fio.token',
      data: {
        payee_public_key: user1.publicKey,
        amount: 100000000000,
        max_fee: config.maxFee,
        actor: faucet.account,
        tpid: ''
      }
    });
  });
  

})
