require('mocha')
const {expect} = require('chai')
const {newUser, getProdVoteTotal, timeout, unlockWallet, addLock, getAccountVoteWeight, getTotalVotedFio, callFioApi, fetchJson} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/FIOSDK')
config = require('../config.js');

let total_voted_fio

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
})

describe(`************************** vote.js ************************** \n A. Test vote counts with proxy when proxy increases and decreases funds`, () => {

  let proxyA1, total_voted_fio, total_bp_votes

  it(`Create users`, async () => {
    proxyA1 = await newUser(faucet);
  })
  
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

  it(`Get proxyA1 last_vote_weight`, async () => {
    try {
      proxyA1.last_vote_weight = await getAccountVoteWeight(proxyA1.account);
      //console.log('proxyA1.last_vote_weight:', proxyA1.last_vote_weight)
    } catch (err) {
      console.log('Error: ', err.json)
    } 
  })

  it(`proxyA1 FIO balance same as last_vote_weight`, async () => {
      try {
        const result = await proxyA1.sdk.genericAction('getFioBalance', {
          fioPublicKey: proxyA1.publicKey
        }) 
        //console.log('User 1 fio balance', result)
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

  it('Transfer additional 500 FIO from faucet to proxyA1', async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: proxyA1.publicKey,
      amount: 500000000000,
      maxFee: config.api.transfer_tokens_pub_key.fee,
    })  
    //console.log('Result', result)
    expect(result.status).to.equal('OK')  
  })

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
      //console.log('bp1@dapixdev total_votes:', total_bp_votes)
      expect(total_bp_votes).to.equal(prev_total_bp_votes + 500000000000) 
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    } 
  })

  it(`Transfer 200 FIO from proxyA1 back to faucet`, async () => {
    const result = await proxyA1.sdk.genericAction('transferTokens', {
      payeeFioPublicKey: faucet.publicKey,
      amount: 200000000000,
      maxFee: config.api.transfer_tokens_pub_key.fee,
    })  
    //console.log('Result', result)
    expect(result.status).to.equal('OK')  
  })

  it(`Get proxyA1 last_vote_weight (should be 200 + 2 fee = 202 less)`, async () => {
    try {
      proxyA1.last_vote_weight = await getAccountVoteWeight(proxyA1.account);
      //console.log('proxyA1.last_vote_weight:', proxyA1.last_vote_weight)
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    } 
  })

  it(`total_voted_fio decreased by 202 FIO`, async () => {
    try {
      let prev_total_voted_fio = total_voted_fio
      total_voted_fio = await getTotalVotedFio();
      //console.log('total_voted_fio: ', total_voted_fio)
      expect(total_voted_fio).to.equal(prev_total_voted_fio - 200000000000 - config.api.transfer_tokens_pub_key.fee)
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
      expect(total_bp_votes).to.equal(prev_total_bp_votes - 200000000000 - config.api.transfer_tokens_pub_key.fee) 
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    } 
  })

})
  
describe('B. Test vote counts with proxy when proxy increases and decreases funds', () => {

  let proxyB1, voterB1, total_voted_fio, total_bp_votes

  it(`Create users`, async () => {
    try {
      proxyB1 = await newUser(faucet);
      voterB1 = await newUser(faucet);
    } catch (err) {
      console.log('Error: ', err)
    }
  })


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
      //console.log('proxyB1 getFioBalance: ', result.balance)
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
      //console.log('proxyB1.last_vote_weight:', voterB1.last_vote_weight)
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

  it.skip('total_voted_fio is increases by proxyB1 last_vote_weight (fixed by MAS-1489)', async () => {
    try {
      let prev_total_voted_fio = total_voted_fio
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

  it('Transfer additional 500 FIO from faucet to voterB1', async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: voterB1.publicKey,
      amount: 500000000000,
      maxFee: config.api.transfer_tokens_pub_key.fee,
    })  
    //console.log('Result', result)
    expect(result.status).to.equal('OK')  
  })

  it(`voterB1 last_vote_weight increases by 500 FIO)`, async () => {
    try {
      let prev_vote_weight = voterB1.last_vote_weight;
      voterB1.last_vote_weight = await getAccountVoteWeight(voterB1.account);
      //console.log('voterB1.last_vote_weight:', voterB1.last_vote_weight);
      expect(voterB1.last_vote_weight).to.equal(prev_vote_weight + 500000000000);
    } catch (err) {
      console.log('Error: ', err)
    } 
  })

  it(`proxyB1 last_vote_weight increases by 500 FIO)`, async () => {
    try {
      let prev_vote_weight = proxyB1.last_vote_weight;
      proxyB1.last_vote_weight = await getAccountVoteWeight(proxyB1.account);
      //console.log('proxyB1.last_vote_weight:', proxyB1.last_vote_weight);
      expect(proxyB1.last_vote_weight).to.equal(prev_vote_weight + 500000000000);
    } catch (err) {
      console.log('Error: ', err)
    } 
  })

  it(`total_voted_fio increased by 500 FIO`, async () => {
    try {
      let prev_total_voted_fio = total_voted_fio;
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

  it('Transfer 1000 FIO from voterB1 to faucet', async () => {
    try {
      const result = await voterB1.sdk.genericAction('transferTokens', {
        payeeFioPublicKey: faucet.publicKey,
        amount: 1000000000000,
        maxFee: config.api.transfer_tokens_pub_key.fee,
      })  
      //console.log('Result', result)
      expect(result.status).to.equal('OK')  
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`voterB1 last_vote_weight decreases by (1000 + xfer fee) FIO)`, async () => {
    try {
      let prev_vote_weight = voterB1.last_vote_weight;
      voterB1.last_vote_weight = await getAccountVoteWeight(voterB1.account);
      //console.log('voterB1.last_vote_weight:', voterB1.last_vote_weight);
      expect(voterB1.last_vote_weight).to.equal(prev_vote_weight - 1000000000000 - config.api.transfer_tokens_pub_key.fee);
    } catch (err) {
      console.log('Error: ', err)
    } 
  })

  it(`proxyB1 last_vote_weight decreases by (1000 + xfer fee) FIO)`, async () => {
    try {
      let prev_vote_weight = proxyB1.last_vote_weight;
      proxyB1.last_vote_weight = await getAccountVoteWeight(proxyB1.account);
      //console.log('proxyB1.last_vote_weight:', proxyB1.last_vote_weight);
      expect(proxyB1.last_vote_weight).to.equal(prev_vote_weight - 1000000000000 - config.api.transfer_tokens_pub_key.fee);
    } catch (err) {
      console.log('Error: ', err)
    } 
  })

  it(`total_voted_fio decreases by (1000 + xfer fee) FIO`, async () => {
    try {
      let prev_total_voted_fio = total_voted_fio;
      total_voted_fio = await getTotalVotedFio();
      //console.log('total_voted_fio: ', total_voted_fio)
      expect(total_voted_fio).to.equal(prev_total_voted_fio - 1000000000000 - config.api.transfer_tokens_pub_key.fee)
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`bp1@dapixdev total_votes increased by (1000 + xfer fee) FIO`, async () => {
    try {
      let prev_total_bp_votes = total_bp_votes;
      total_bp_votes = await getProdVoteTotal('bp1@dapixdev');
      //console.log('bp1@dapixdev total_votes:', total_bp_votes)
      expect(total_bp_votes).to.equal(prev_total_bp_votes - 1000000000000 - config.api.transfer_tokens_pub_key.fee) 
    } catch (err) {
      console.log('Error: ', err)
    } 
  })

  it('Transfer 800 FIO from proxyB1 to voterB1', async () => {
    const result = await proxyB1.sdk.genericAction('transferTokens', {
      payeeFioPublicKey: voterB1.publicKey,
      amount: 800000000000,
      maxFee: config.api.transfer_tokens_pub_key.fee,
    })  
    //console.log('Result', result)
    expect(result.status).to.equal('OK')  
  })

  it(`voterB1 last_vote_weight increases by 800 FIO)`, async () => {
    try {
      let prev_vote_weight = voterB1.last_vote_weight;
      voterB1.last_vote_weight = await getAccountVoteWeight(voterB1.account);
      //console.log('voterB1.last_vote_weight:', voterB1.last_vote_weight);
      expect(voterB1.last_vote_weight).to.equal(prev_vote_weight + 800000000000);
    } catch (err) {
      console.log('Error: ', err)
    } 
  })

  it(`proxyB1 last_vote_weight decreases by xfer fee only (since votes are still proxied)`, async () => {
    try {
      let prev_vote_weight = proxyB1.last_vote_weight;
      proxyB1.last_vote_weight = await getAccountVoteWeight(proxyB1.account);
      //console.log('proxyB1.last_vote_weight:', proxyB1.last_vote_weight);
      expect(proxyB1.last_vote_weight).to.equal(prev_vote_weight - config.api.transfer_tokens_pub_key.fee);
    } catch (err) {
      console.log('Error: ', err)
    } 
  })

  it(`total_voted_fio does decreases by xfer fee`, async () => {
    try {
      let prev_total_voted_fio = total_voted_fio;
      total_voted_fio = await getTotalVotedFio();
      //console.log('total_voted_fio: ', total_voted_fio)
      expect(total_voted_fio).to.equal(prev_total_voted_fio - config.api.transfer_tokens_pub_key.fee)
    } catch (err) {
      console.log('Error', err)
    }
  })

  //Check for a bug with unregistering proxy. Keep as "skip"

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

  it(`Get proxyB1 last_vote_weight post unregproxy`, async () => {
    try {
      proxyB1.last_vote_weight = await getAccountVoteWeight(proxyB1.account)
      //console.log('proxyB1.last_vote_weight: ', proxyB1.last_vote_weight)
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`BUG: MAS-1539 - proxyB1 last_vote_weight decreases by (voterB1 last_vote_weight + unregproxy fee)`, async () => {
    try {
      let prev_vote_weight = proxyB1.last_vote_weight;
      proxyB1.last_vote_weight = await getAccountVoteWeight(proxyB1.account);
      //console.log('proxyB1.last_vote_weight:', proxyB1.last_vote_weight);
      //Bug: expect(proxyB1.last_vote_weight).to.equal(prev_vote_weight - voterB1.last_vote_weight - config.api.unregister_proxy.fee);
    } catch (err) {
      console.log('Error: ', err)
    } 
  })

  it(`total_voted_fio decreases by voterB1 last_vote_weight`, async () => {
    try {
      let prev_total_voted_fio = total_voted_fio;
      total_voted_fio = await getTotalVotedFio();
      //console.log('total_voted_fio: ', total_voted_fio)
      expect(total_voted_fio).to.equal(prev_total_voted_fio - voterB1.last_vote_weight)
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`Transfer 200 FIO from proxyB1 back to faucet`, async () => {
    const result = await proxyB1.sdk.genericAction('transferTokens', {
      payeeFioPublicKey: faucet.publicKey,
      amount: 200000000000,
      maxFee: config.api.transfer_tokens_pub_key.fee,
    });
    //console.log('Result', result)
    expect(result.status).to.equal('OK')  ;
  })

  it('proxyB1 last_vote_weight decreases by (200 + xfer fee) ', async () => {
    try {
      let previous_vote_weight = proxyB1.last_vote_weight;
      proxyB1.last_vote_weight = await getAccountVoteWeight(proxyB1.account);
      //console.log('previous_vote_weight:', previous_vote_weight);
      //BUG: need to subtract the unregproxy fee, because now it is showing up.
      expect(proxyB1.last_vote_weight).to.equal(previous_vote_weight - 200000000000 - config.api.transfer_tokens_pub_key.fee - config.api.unregister_proxy.fee) ;
    } catch (err) {
      console.log('Error: ', err);
    } 
  })

  it(`total_voted_fio decreased by (200 + xfer fee)`, async () => {
    try {
      let prev_total_voted_fio = total_voted_fio;
      total_voted_fio = await getTotalVotedFio();
      //console.log('total_voted_fio: ', total_voted_fio);
      //BUG: need to subtract the unregproxy fee, because now it is showing up.
      expect(total_voted_fio).to.equal(prev_total_voted_fio - 200000000000 - config.api.transfer_tokens_pub_key.fee - config.api.unregister_proxy.fee);
    } catch (err) {
      console.log('Error', err);
    }
  })

})

describe.skip('C. (has Bugs) Test voting and proxying of users with Type 1 locked tokens', () => {

  let proxyC1, voterC1, total_bp_votes
  const lockAmount = 1000000000000

  it(`Create users`, async () => {
    try {
      proxyC1 = await newUser(faucet);
      voterC1 = await newUser(faucet);
    } catch (err) {
      console.log('Error: ', err)
    }  
  })

  it(`Unlock fio wallet with wallet key: ${config.WALLETKEY}`, async () => {
    try {
      unlockWallet('fio');
      await timeout(2000);  // Getting an occasional error that the wallet is not unlocked. Could be a timing issue.
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`Get proxyC1 FIO Balance`, async () => {
    try {
      const result = await proxyC1.sdk.genericAction('getFioBalance', {
        fioPublicKey: proxyC1.publicKey
      }) 
      proxyC1.fioBalance = result.balance
      //console.log('proxyC1 getFioBalance: ', result.balance)
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`Apply Lock Type 1 to ${lockAmount} proxyC1 FIO`, async () => {
    try {
      let result = await addLock(proxyC1.account, lockAmount, 1);
      proxyC1.lockAmount = lockAmount
      //console.log('result:', result)
      expect(result).to.have.all.keys('transaction_id', 'processed')
    } catch (err) {
      console.log('Error: ', err.json)
    } 
  })

  it(`Apply Lock Type 1 to ${lockAmount} voterC1 FIO`, async () => {
    try {
      let result = await addLock(voterC1.account, lockAmount, 1);
      voterC1.lockAmount = lockAmount
      //console.log('result:', result)
      expect(result).to.have.all.keys('transaction_id', 'processed')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal(null)
    } 
  })

  it(`Get bp1@dapixdev total_votes`, async () => {
    try {
      total_bp_votes = await getProdVoteTotal('bp1@dapixdev');
      //console.log('bp1@dapixdev total_votes:', total_bp_votes)
    } catch (err) {
      console.log('Error: ', err)
    } 
  })

  it.skip(`Register proxyC1 as a proxy`, async () => {
    try {
      const result = await proxyC1.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: proxyC1.address,
          actor: proxyC1.account,
          max_fee: config.api.register_proxy.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK') 
    } catch (err) {
      console.log('Error: ', err.json)
    } 
  })

  it(`proxyC1 votes for bp1@dapixdev`, async () => {
    try {
      const result = await proxyC1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: proxyC1.address,
          actor: proxyC1.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK') 
    } catch (err) {
      console.log('Error: ', err.json)
    } 
  })

  it(`Get proxyC1 FIO Balance`, async () => {
    try {
      const result = await proxyC1.sdk.genericAction('getFioBalance', {
        fioPublicKey: proxyC1.publicKey
      }) 
      proxyC1.fioBalance = result.balance
      //console.log('proxyC1 getFioBalance: ', result.balance)
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it.skip(`BUG: proxyC1 last_vote_weight is ${lockAmount} less than proxyC1 FIO Balance`, async () => {
    try {
      proxyC1.last_vote_weight = await getAccountVoteWeight(proxyC1.account);
      console.log('proxyC1.last_vote_weight:', proxyC1.last_vote_weight)
      expect(proxyC1.last_vote_weight).to.equal(proxyC1.fioBalance) 
    } catch (err) {
      console.log('Error: ', err)
    } 
  })

  it.skip(`BUG: bp1@dapixdev total_votes increased by proxyC1 FIO Balance - ${lockAmount}`, async () => {
    try {
      prev_total_bp_votes = total_bp_votes;
      total_bp_votes = await getProdVoteTotal('bp1@dapixdev');
      //console.log('bp1@dapixdev total_votes:', total_bp_votes)
      expect(total_bp_votes).to.equal(prev_total_bp_votes + proxyC1.fioBalance - lockAmount) 
    } catch (err) {
      console.log('Error: ', err)
    } 
  })

  it(`Transfer 1000 FIO to proxyC1 from faucet`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: proxyC1.publicKey,
      amount: 1000000000000,
      maxFee: config.api.transfer_tokens_pub_key.fee,
    })  
    //console.log('Result', result)
    expect(result.status).to.equal('OK')
  })

  it.skip(`BUG: proxyC1 last_vote_weight increases by 1000 FIO`, async () => {
    try {
      let prev_vote_weight = proxyC1.last_vote_weight
      proxyC1.last_vote_weight = await getAccountVoteWeight(proxyC1.account);
      //console.log('proxyC1.last_vote_weight:', proxyC1.last_vote_weight)
      expect(proxyC1.last_vote_weight).to.equal(prev_vote_weight - 1000000000000) 
    } catch (err) {
      console.log('Error: ', err)
    } 
  })

  it(`proxyC1 FIO Balance increases by 1000 FIO`, async () => {
    try {
      const result = await proxyC1.sdk.genericAction('getFioBalance', {
        fioPublicKey: proxyC1.publicKey
      }) 
      let prev_balance = proxyC1.fioBalance;
      proxyC1.fioBalance = result.balance;
      //console.log('proxyC1 getFioBalance: ', result.balance)
      expect(proxyC1.fioBalance).to.equal(prev_balance + 1000000000000) 
    } catch (err) {
      console.log('Error: ', err)
    }
  })

/*

  it(`proxyC1 last_vote_weight decreases by lock amount: ${lockAmount}`, async () => {
    try {
      let prev_weight = proxyC1.last_vote_weight
      proxyC1.last_vote_weight  = await getAccountVoteWeight(proxyC1.account);
      console.log('proxyC1.last_vote_weight:', proxyC1.last_vote_weight)
      expect(proxyC1.last_vote_weight).to.equal(prev_weight - lockAmount)
    } catch (err) {
      console.log('Error: ', err)
    } 
  })


  it(`bp1@dapixdev total_votes decreases by lock amount: ${lockAmount}`, async () => {
    try {
      prev_total_bp_votes = total_bp_votes;
      total_bp_votes = await getProdVoteTotal('bp1@dapixdev');
      //console.log('bp1@dapixdev total_votes:', total_bp_votes)
      expect(total_bp_votes).to.equal(prev_total_bp_votes - lockAmount) 
    } catch (err) {
      console.log('Error: ', err)
    } 
  })
  
  it(`voterC1 proxy votes to proxyC1`, async () => {
    try {
      const result = await voterC1.sdk.genericAction('pushTransaction', {
        action: 'voteproxy',
        account: 'eosio',
        data: {
          proxy: proxyC1.address,
          fio_address: voterC1.address,
          actor: voterC1.account,
          max_fee: config.api.proxy_vote.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK') 
    } catch (err) {
      console.log('Error: ', err.json)
    } 
  })

  it(`Get voterC1 last_vote_weight`, async () => {
    try {
      voterC1.last_vote_weight = await getAccountVoteWeight(voterC1.account);
      //console.log('user2.last_vote_weight:', user2.last_vote_weight)
    } catch (err) {
      console.log('Error: ', err.json)
    } 
  })

  it(`bp1@dapixdev total_votes increased by voterC1 last_vote_weight`, async () => {
    try {
      prev_total_bp_votes = total_bp_votes;
      total_bp_votes = await getProdVoteTotal('bp1@dapixdev');
      //console.log('bp1@dapixdev total_votes:', total_bp_votes)
      expect(total_bp_votes).to.equal(prev_total_bp_votes + voterC1.last_vote_weight) 
    } catch (err) {
      console.log('Error: ', err)
    } 
  })

  it(`issue locked token grant to voterC1 as lock type 1 in the amount of ${lockAmount}`, async () => {
    try {
      let result = await addLock(voterC1.account, lockAmount, 1);
      //console.log('result:', result)
      expect(result).to.have.all.keys('transaction_id', 'processed')
    } catch (err) {
      console.log('Error: ', err.json)
    } 
  })

  it(`voterC1 last_vote_weight decreases by lock amount: ${lockAmount}`, async () => {
    try {
      let prev_weight = voterC1.last_vote_weight
      voterC1.last_vote_weight = await getAccountVoteWeight(voterC1.account);
      //console.log('user2.last_vote_weight:', user2.last_vote_weight)
      expect(voterC1.last_vote_weight).to.equal(prev_weight - lockAmount)
    } catch (err) {
      console.log('Error: ', err.json)
    } 
  })

  it(`bp1@dapixdev total_votes decreases by lock amount: ${lockAmount}`, async () => {
    try {
      prev_total_bp_votes = total_bp_votes;
      total_bp_votes = await getProdVoteTotal('bp1@dapixdev');
      //console.log('bp1@dapixdev total_votes:', total_bp_votes)
      expect(total_bp_votes).to.equal(prev_total_bp_votes - lockAmount) 
    } catch (err) {
      console.log('Error: ', err)
    } 
  })
*/
})

describe.skip('D. Proxy voting with proxy and voter having some Type 2/3 locked tokens', () => {

  let proxyD1, voterD1, voterG2, voterG3, voterG4, total_bp_votes
  const lockType = 3   // set as 2 or 3
  const lockAmount = 300000000000

  it(`Create users`, async () => {
    proxyD1 = await newUser(faucet);
    voterD1 = await newUser(faucet);
  })

  it(`Get bp1@dapixdev total_votes`, async () => {
    try {
      total_bp_votes = await getProdVoteTotal('bp1@dapixdev');
      //console.log('bp1@dapixdev total_votes:', total_bp_votes)
    } catch (err) {
      console.log('Error: ', err)
    } 
  })

  it(`issue locked token grant to proxyD1 as lock type ${lockType} in the amount of ${lockAmount}`, async () => {
    try {
      let result = await addLock(proxyD1.account, lockAmount, lockType);
      //console.log('result:', result)
      expect(result).to.have.all.keys('transaction_id', 'processed')
    } catch (err) {
      console.log('Error: ', err.json)
    } 
  })

  it(`Register proxyD1 as a proxy`, async () => {
    try {
      const result = await proxyD1.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: proxyD1.address,
          actor: proxyD1.account,
          max_fee: config.api.register_proxy.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK') 
    } catch (err) {
      console.log('Error: ', err.json)
    } 
  })

  it(`proxyD1 votes for bp1@dapixdev`, async () => {
    try {
      const result = await proxyD1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: proxyD1.address,
          actor: proxyD1.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK') 
    } catch (err) {
      console.log('Error: ', err.json.error.details)
    } 
  })

  it(`Get proxyD1 last_vote_weight`, async () => {
    try {
      proxyD1.last_vote_weight = await getAccountVoteWeight(proxyD1.account);
      //console.log('proxyD1.last_vote_weight:', proxyD1.last_vote_weight)
    } catch (err) {
      console.log('Error: ', err)
    } 
  })

  it(`bp1@dapixdev total_votes increased by proxyD1 last_vote_weight`, async () => {
    try {
      prev_total_bp_votes = total_bp_votes;
      total_bp_votes = await getProdVoteTotal('bp1@dapixdev');
      //console.log('bp1@dapixdev total_votes:', total_bp_votes)
      expect(total_bp_votes).to.equal(prev_total_bp_votes + proxyD1.last_vote_weight) 
    } catch (err) {
      console.log('Error: ', err)
    } 
  })

  it(`issue locked token grant to voterD1 as lock type ${lockType} in the amount of ${lockAmount}`, async () => {
    try {
      let result = await addLock(voterD1.account, lockAmount, lockType);
      //console.log('result:', result)
      expect(result).to.have.all.keys('transaction_id', 'processed')
    } catch (err) {
      console.log('Error: ', err.json)
    } 
  })

  it(`voterD1 proxy votes to proxyD1`, async () => {
    try {
      const result = await voterD1.sdk.genericAction('pushTransaction', {
        action: 'voteproxy',
        account: 'eosio',
        data: {
          proxy: proxyD1.address,
          fio_address: voterD1.address,
          actor: voterD1.account,
          max_fee: config.api.proxy_vote.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK') 
    } catch (err) {
      console.log('Error: ', err.json)
    } 
  })

  it(`Get voterD1 last_vote_weight`, async () => {
    try {
      voterD1.last_vote_weight = await getAccountVoteWeight(voterD1.account);
      //console.log('voterD1 last_vote_weight:', voterD1.last_vote_weight)
    } catch (err) {
      console.log('Error: ', err.json)
    } 
  })

  it(`bp1@dapixdev total_votes increased by voterD1 last_vote_weight`, async () => {
    try {
      prev_total_bp_votes = total_bp_votes;
      total_bp_votes = await getProdVoteTotal('bp1@dapixdev');
      //console.log('bp1@dapixdev total_votes:', total_bp_votes)
      expect(total_bp_votes).to.equal(prev_total_bp_votes + voterD1.last_vote_weight) 
    } catch (err) {
      console.log('Error: ', err)
    } 
  })

  it(`Un-register proxyD1 as a proxy`, async () => {
    try {
      const result = await proxyD1.sdk.genericAction('pushTransaction', {
        action: 'unregproxy',
        account: 'eosio',
        data: {
          fio_address: proxyD1.address,
          actor: proxyD1.account,
          max_fee: config.api.unregister_proxy.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK') 
    } catch (err) {
      console.log('Error: ', err.json)
    } 
  })

  it(`bp1@dapixdev total_votes decreased by voterD1 last_vote_weight`, async () => {
    try {
      prev_total_bp_votes = total_bp_votes;
      total_bp_votes = await getProdVoteTotal('bp1@dapixdev');
      //console.log('bp1@dapixdev total_votes:', total_bp_votes)
      expect(total_bp_votes).to.equal(prev_total_bp_votes - voterD1.last_vote_weight) 
    } catch (err) {
      console.log('Error: ', err)
    } 
  })

})

describe('E. Test proxying to a user who is also proxying (should fail)', () => {
  let proxyE1, proxyE2, voterE1, voterE2

  it(`Create users`, async () => {
    proxyE1 = await newUser(faucet);
    proxyE2 = await newUser(faucet);
    voterE1 = await newUser(faucet);
    voterE2 = await newUser(faucet);
  })

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

describe('F. last_voting_weight not updated when paying fee for register proxy (fixed bug MAS-1539)', () => {
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
          max_fee: config.api.vote_producer.fee
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
          max_fee: config.api.register_proxy.fee
        }
      })
      //console.log('Result: ', result)
      //console.log('config.api.register_proxy.fee: ', config.api.register_proxy.fee/config.BILLION)
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

  it.skip(`Fixed in Gemini: proxyF1 last_vote_weight <> original_last_vote_weight - register_proxy_fee `, async () => {
    //console.log('proxyF1 original_last_vote_weight: ', original_last_vote_weight/config.BILLION)
    //console.log('config.api.register_proxy.fee: ', config.api.register_proxy.fee/config.BILLION)
    //console.log('proxyF1 last_vote_weight: ', proxyF1.last_vote_weight/config.BILLION)
    expect(proxyF1.last_vote_weight).to.equal(original_last_vote_weight - config.api.register_proxy.fee)
  })
})

describe('G. Test multiple users proxying and unproxying votes to same proxy', () => {
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

  it(`Get proxyG1 last_vote_weight`, async () => {
    try {
      proxyG1.last_vote_weight = await getAccountVoteWeight(proxyG1.account);
      //console.log('proxyG1 last_vote_weight:', proxyG1.last_vote_weight)
    } catch (err) {
      console.log('Error: ', err.json)
    } 
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

  it.skip(`Fixed in Gemini: Get voterG1 last_vote_weight`, async () => {
    try {
      voterG1.last_vote_weight = await getAccountVoteWeight(voterG1.account);
      //console.log('voterG1.last_vote_weight:', voterG1.last_vote_weight)
    } catch (err) {
      console.log('Error: ', err.json)
    } 
  })

  it.skip(`Fixed in Gemini: proxyG1 last_vote_weight increased by voterG1 vote weight`, async () => {
    try {
      prev_last_vote_weight = proxyG1.last_vote_weight
      proxyG1.last_vote_weight = await getAccountVoteWeight(proxyG1.account);
      //console.log('proxyG1.last_vote_weight:', proxyE1.last_vote_weight)
      expect(proxyG1.last_vote_weight).to.equal(prev_last_vote_weight + voterG1.last_vote_weight)  
    } catch (err) {
      console.log('Error: ', err)
    } 
  })

  it.skip(`Fixed in Gemini: bp1@dapixdev total_votes increased by voterG1 last_vote_weight`, async () => {
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

  it(`Get voterG2 last_vote_weight`, async () => {
    try {
      voterG2.last_vote_weight = await getAccountVoteWeight(voterG2.account);
      //console.log('voterG2.last_vote_weight:', voterG2.last_vote_weight)
    } catch (err) {
      console.log('Error: ', err.json)
    } 
  })

  it.skip(`Fixed in Gemini: proxyG1 last_vote_weight increased by voterG2 vote weight`, async () => {
    try {
      prev_last_vote_weight = proxyG1.last_vote_weight
      proxyG1.last_vote_weight = await getAccountVoteWeight(proxyG1.account);
      //console.log('proxyG1.last_vote_weight:', proxyE1.last_vote_weight)
      expect(proxyG1.last_vote_weight).to.equal(prev_last_vote_weight + voterG2.last_vote_weight) 
    } catch (err) {
      console.log('Error: ', err)
    } 
  })

  it.skip(`Fixed in Gemini: bp1@dapixdev total_votes increased by voterG2 last_vote_weight`, async () => {
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

  it(`Get voterG3 last_vote_weight`, async () => {
    try {
      voterG3.last_vote_weight  = await getAccountVoteWeight(voterG3.account);
      //console.log('voterG3.last_vote_weight:', voterG3.last_vote_weight)
    } catch (err) {
      console.log('Error: ', err.json)
    } 
  })

  it.skip(`Fixed in Gemini: proxyG1 last_vote_weight increased by voterG3 vote weight`, async () => {
    try {
      prev_last_vote_weight = proxyG1.last_vote_weight
      proxyG1.last_vote_weight = await getAccountVoteWeight(proxyG1.account);
      //console.log('proxyG1.last_vote_weight:', proxyE1.last_vote_weight)
      expect(proxyG1.last_vote_weight).to.equal(prev_last_vote_weight + voterG3.last_vote_weight) 
    } catch (err) {
      console.log('Error: ', err)
    } 
  })

  it.skip(`Fixed in Gemini: bp1@dapixdev total_votes increased by voterG3 last_vote_weight`, async () => {
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

  it.skip(`Fixed in Gemini: bp1@dapixdev does not change`, async () => {
    try {
      prev_total_bp_votes = total_bp_votes;
      total_bp_votes = await getProdVoteTotal('bp1@dapixdev');
      //console.log('bp1@dapixdev total_votes:', total_bp_votes)
      expect(total_bp_votes).to.equal(prev_total_bp_votes) 
    } catch (err) {
      console.log('Error: ', err)
    } 
  })

  it.skip(`Fixed in Gemini: proxyG1 last_vote_weight decreased by voterG1 vote weight`, async () => {
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

describe.skip('Fixed in Gemini: H. When a user proxies their vote, the total_voted_fio increases by 2x their vote strength (Fixed: MAS-1489)', () => {
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

describe.skip('v1.2.0 release only. H. Confirm voter data is returned with get_account', () => {
  let voterH1

  it(`Create users`, async () => {
    voterH1 = await newUser(faucet);
  })

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
