require('mocha')
const {expect} = require('chai')
const {printUserRam, getAccountVoteWeight, getTotalVotedFio, setRam, user, generateFioDomain, generateFioAddress, fetchJson, randStr, timeout, createKeypair} = require('../../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
config = require('../../config.js');

let user1

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson)
  
  await timeout(1000)
  keys = await createKeypair();
  user1 = new user(keys.account, keys.privateKey, keys.publicKey)
  user1sdk = new FIOSDK(user1.privateKey, user1.publicKey, config.BASE_URL, fetchJson)

  await timeout(1000)
  keys = await createKeypair();
  user2 = new user(keys.account, keys.privateKey, keys.publicKey)
  user2sdk = new FIOSDK(user2.privateKey, user2.publicKey, config.BASE_URL, fetchJson)

  await timeout(1000)
  keys = await createKeypair();
  prod = new user(keys.account, keys.privateKey, keys.publicKey)
  prodsdk = new FIOSDK(prod.privateKey, prod.publicKey, config.BASE_URL, fetchJson)

})


describe('Test register as proxy after proxying your own vote.', () => {
  let fioDomain62, fioAddress64, walletDomain, walletAddress64, total_voted_fio

  it(`Create ramuser public/private keys`, async () => {
    user1Domain = generateFioDomain(20)
    user1Address = generateFioAddress(user1Domain, 20)
    user1Address2 = generateFioAddress(user1Domain, 20)
    user2Domain = generateFioDomain(20)
    user2Address = generateFioAddress(user2Domain, 20)
    prodDomain = generateFioDomain(31)
    prodAddress = generateFioAddress(prodDomain, 20)

    console.log('user1 Account: ', user1.account)
    console.log('user1 PublicKey: ', user1.publicKey)
    console.log('user1 PrivateKey: ', user1.privateKey)    
  })

  it(`Get initial total_voted_fio`, async () => {
    total_voted_fio = await getTotalVotedFio();
    console.log('total_voted_fio:', total_voted_fio)
  })

  it(`Transfer FIO to user1 to fund account`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: user1.publicKey,
      amount: config.FUNDS,
      maxFee: config.api.transfer_tokens_pub_key.fee,
    })  
    //console.log('Result', result)
    expect(result.status).to.equal('OK')  
    await setRam(user1, 'INITIALACCOUNTRAM', 0)
  })

  it(`Register user1 domain`, async () => {
    const result = await user1sdk.genericAction('registerFioDomain', { 
      fioDomain: user1Domain, 
      maxFee: config.api.register_fio_domain.fee ,
      walletFioAddress: ''
    })
    //console.log('Result', result)
    expect(result.status).to.equal('OK')  
    await setRam(user1, 'REGDOMAINRAM', result.fee_collected)
  })
  
  it(`Register user1 address #1`, async () => {
    try {
      const result = await user1sdk.genericAction('registerFioAddress', { 
        fioAddress: user1Address,
        maxFee: config.api.register_fio_address.fee,
        walletFioAddress: ''
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')  
      await setRam(user1, 'REGADDRESSRAM', result.fee_collected)
    } catch (err) {
      console.log('Error: ', err.json)
    }  
  })

  it(`Register user1 address #2`, async () => {
    try {
      const result = await user1sdk.genericAction('registerFioAddress', { 
        fioAddress: user1Address2,
        maxFee: config.api.register_fio_address.fee,
        walletFioAddress: ''
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')  
      await setRam(user1, 'REGADDRESSRAM', result.fee_collected)
    } catch (err) {
      console.log('Error: ', err.json)
    }  
  })


  //
  // Set up producer and register domain and address
  //
  /*
  it(`Transfer FIO to prod to fund account`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: prod.publicKey,
      amount: config.FUNDS,
      maxFee: config.api.transfer_tokens_pub_key.fee,
    })  
    //console.log('Result', result)
    expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected')
    expect(result.status).to.equal('OK')  
    await setRam(prod, 'INITIALACCOUNTRAM', 0)
  })

  it(`Register domain`, async () => {
    const result = await prodsdk.genericAction('registerFioDomain', { 
      fioDomain: prodDomain, 
      maxFee: config.api.register_fio_domain.fee ,
      walletFioAddress: walletAddress64
    })
    //console.log('Result', result)
    expect(result.status).to.equal('OK')  
    await setRam(prod, 'REGDOMAINRAM', result.fee_collected)
  })
  
  it(`Register address`, async () => {
    const result = await prodsdk.genericAction('registerFioAddress', { 
      fioAddress: prodAddress,
      maxFee: config.api.register_fio_address.fee,
      walletFioAddress: walletAddress64
    })
    //console.log('Result: ', result)
    expect(result.status).to.equal('OK')  
    await setRam(prod, 'REGADDRESSRAM', result.fee_collected)
  })

  it(`Register prod as producer`, async () => {
    try {
      const result = await prodsdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodAddress,
          fio_pub_key: prod.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          actor: prod.account,
          max_fee: config.api.register_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK') 
      await setRam(prod, 'REGPRODUCERRAM', result.fee_collected)
    } catch (err) {
      console.log('Error: ', err.json)
    } 
  })
*/


  it(`Get total_voted_fio before user1 votes`, async () => {
    total_voted_fio = await getTotalVotedFio();
    console.log('total_voted_fio:', total_voted_fio)
  })

  it(`user1 votes for bp1@dapixdev using address #1`, async () => {
    try {
      const result = await user1sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: user1Address,
          actor: user1.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK') 
      await setRam(user1,'VOTEPRODUCERRAM', result.fee_collected)
    } catch (err) {
      console.log('Error: ', err.json)
    } 
  })

  it(`Get user1 last_vote_weight`, async () => {
    try {
      let last_vote_weight = await getAccountVoteWeight(user1.account);
      //user1.last_vote_weight = last_vote_weight.split(".")[0]
      user1.last_vote_weight = Math.floor(last_vote_weight)
    } catch (err) {
      console.log('Error: ', err.json)
    } 
  })

  it(`User1 FIO balance same as last_vote_weight`, async () => {
      try {
        const result = await user1sdk.genericAction('getFioBalance', {
          fioPublicKey: user1.publicKey
        }) 
        console.log('User 1 fio balance', result)
        expect(result.balance).to.equal(user1.last_vote_weight)
      } catch (err) {
        console.log('Error', err)
      }
  })

  it(`total_voted_fio increased by user1 last_vote_weight`, async () => {
    try {
      let new_total_voted_fio = await getTotalVotedFio();
      console.log('user1.last_vote_weight: ', user1.last_vote_weight)
      console.log('new_total_voted_fio: ', new_total_voted_fio)
      console.log('new_total_voted_fio - total_voted_fio: ', new_total_voted_fio - total_voted_fio)
      expect(new_total_voted_fio).to.equal(total_voted_fio + user1.last_vote_weight)
      total_voted_fio = new_total_voted_fio
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`user1 removes vote for bp1@dapixdev.`, async () => {
    try {
      const result = await user1sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [ ],
          fio_address: user1Address,
          actor: user1.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK') 
      await setRam(user1,'VOTEPRODUCERRAM', result.fee_collected)
    } catch (err) {
      console.log('Error: ', err.json)
    } 
  })

  // Not true, this is bundled. Update for post bundle.
  /*
  it(`Get user1 last_vote_weight. Should change by the vote producer fee`, async () => {
    try {
      let last_vote_weight = await getAccountVoteWeight(user1.account);
      expect(last_vote_weight).to.equal(user1.last_vote_weight - config.api.vote_producer.fee)
      //user1.last_vote_weight = Math.floor(last_vote_weight)
    } catch (err) {
      console.log('Error: ', err)
    } 
  })


  it.skip(`User1 FIO balance has changed with vote payment. So should last_vote_weight`, async () => {
    try {
      const result = await user1sdk.genericAction('getFioBalance', {
        fioPublicKey: user1.publicKey
      }) 
      console.log('User 1 fio balance', result)
      expect(result.balance).to.equal(user1.last_vote_weight)
    } catch (err) {
      console.log('Error', err)
    }
  })
*/

  it(`Get user1 last_vote_weight`, async () => {
    try {
      let last_vote_weight = await getAccountVoteWeight(user1.account);
      //user1.last_vote_weight = last_vote_weight.split(".")[0]
      user1.last_vote_weight = Math.floor(last_vote_weight)
    } catch (err) {
      console.log('Error: ', err.json)
    } 
  })

  it(`Expect total_voted_fio to stay the same. But, the votes are still in the voters table`, async () => {
    try {
      let new_total_voted_fio = await getTotalVotedFio();
      console.log('user1.last_vote_weight: ', user1.last_vote_weight)
      console.log('new_total_voted_fio: ', new_total_voted_fio)
      expect(new_total_voted_fio).to.equal(total_voted_fio)
    } catch (err) {
      console.log('Error', err)
    }
  })

/*
  it(`user1 votes for prod1 using address #2`, async () => {
    try {
      const result = await user1sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodAddress
          ],
          fio_address: user1Address2,
          actor: user1.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK') 
      await setRam(user1,'VOTEPRODUCERRAM', result.fee_collected)
    } catch (err) {
      console.log('Error: ', err.json)
    } 
  })
*/

  // Register user1 as a proxy so others can proxy their votes to user1.
  it(`Register user1's user1Address as a proxy`, async () => {
    try {
      const result = await user1sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: user1Address,
          actor: user1.account,
          max_fee: config.api.register_proxy.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK') 
      await setRam(user1, 'REGPROXYRAM', result.fee_collected)
    } catch (err) {
      console.log('actor', user1.account)
      console.log('fio_address', user1Address)
      console.log('Error: ', err.json)
    } 
  })

  it(`Transfer FIO to user2 to fund account`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: user2.publicKey,
      amount: config.FUNDS,
      maxFee: config.api.transfer_tokens_pub_key.fee,
    })  
    //console.log('Result', result)
    expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected')
    expect(result.status).to.equal('OK')  
    await setRam(user2, 'INITIALACCOUNTRAM', 0)
  })

  it(`Register user2 domain`, async () => {
    const result = await user2sdk.genericAction('registerFioDomain', { 
      fioDomain: user2Domain, 
      maxFee: config.api.register_fio_domain.fee ,
      walletFioAddress: ''
    })
    //console.log('Result', result)
    expect(result).to.have.all.keys('status', 'expiration', 'fee_collected')
    expect(result.status).to.equal('OK')  
    await setRam(user2, 'REGDOMAINRAM', result.fee_collected)
  })
  
  it(`Register user2 address`, async () => {
    try {
      const result = await user2sdk.genericAction('registerFioAddress', { 
        fioAddress: user2Address,
        maxFee: config.api.register_fio_address.fee,
        walletFioAddress: ''
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
      await setRam(user2, 'REGADDRESSRAM', result.fee_collected)
    } catch (err) {
      console.log('Error: ', err.json)
    }  
  })

  it('Get total_voted_fio', async () => {
    try {
      let new_total_voted_fio = await getTotalVotedFio();
      console.log('total_voted_fio: ', new_total_voted_fio)
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`user2 proxy votes to user1`, async () => {
    try {
      const result = await user2sdk.genericAction('pushTransaction', {
        action: 'voteproxy',
        account: 'eosio',
        data: {
          proxy: user1Address,
          fio_address: user2Address,
          actor: user2.account,
          max_fee: config.api.proxy_vote.fee
        }
      })
      //console.log('Result: ', result)
      //console.log('Proxy user2 votes to: ', user1Address)
      expect(result.status).to.equal('OK') 
    } catch (err) {
      console.log('Error: ', err.json)
    } 
  })

  it('Get total_voted_fio', async () => {
    try {
      let new_total_voted_fio = await getTotalVotedFio();
      console.log('total_voted_fio: ', new_total_voted_fio)
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`Get user2 last_vote_weight`, async () => {
    try {
      let last_vote_weight = await getAccountVoteWeight(user2.account);
      //user1.last_vote_weight = last_vote_weight.split(".")[0]
      user2.last_vote_weight = Math.floor(last_vote_weight)
    } catch (err) {
      console.log('Error: ', err.json)
    } 
  })

  it(`total_voted_fio increased by user2 last_vote_weight after proxying votes`, async () => {
    try {
      let new_total_voted_fio = await getTotalVotedFio();
      console.log('user1.last_vote_weight: ', user1.last_vote_weight)
      console.log('user2.last_vote_weight: ', user2.last_vote_weight)
      console.log('new_total_voted_fio: ', new_total_voted_fio)
      console.log('new_total_voted_fio - total_voted_fio: ', new_total_voted_fio - total_voted_fio)
      expect(new_total_voted_fio).to.equal(total_voted_fio + user2.last_vote_weight)
    } catch (err) {
      console.log('Error', err)
    }
  })

  //Unregister as proxy
  it(`Unregister user1 as a proxy`, async () => {
    try {
      const result = await user1sdk.genericAction('pushTransaction', {
        action: 'unregproxy',
        account: 'eosio',
        data: {
          fio_address: user1Address,
          actor: user1.account,
          max_fee: config.api.unregister_proxy.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK') 
      await setRam(user1, 'UNREGPROXYRAM', result.fee_collected)
    } catch (err) {
      console.log('actor', user1.account)
      console.log('fio_address', user1Address)
      console.log('Error: ', err.json)
    } 
  })

  it.skip(`TODO: check to make sure the voters table is correct`, async () => {
  })

  it.skip(`Unregister prod as producer`, async () => {
    try {
      const result = await prodsdk.genericAction('pushTransaction', {
        action: 'unregprod',
        account: 'eosio',
        data: {
          fio_address: prodAddress,
          fio_pub_key: prod.publicKey,
          max_fee: config.api.unregister_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK') 
      await setRam(prod, 'UNREGPRODUCERRAM', result.fee_collected)
    } catch (err) {
      console.log('Error: ', err.json)
    } 
  })

  it(`Reset total_voted_fio`, async () => {
    try {
      total_voted_fio = await getTotalVotedFio();
      console.log('Reset total_voted_fio: ', total_voted_fio)
    } catch (err) {
      console.log('Error: ', err.json)
    } 
  })

  it(`Reset user1 last_vote_weight`, async () => {
    try {
      let last_vote_weight = await getAccountVoteWeight(user1.account);
      user1.last_vote_weight = Math.floor(last_vote_weight)
      console.log('user1.last_vote_weight: ', user1.last_vote_weight)
    } catch (err) {
      console.log('Error: ', err.json)
    } 
  })

  it(`Transfer 10000000000 to user1`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: user1.publicKey,
      amount: 100000000000,
      maxFee: config.api.transfer_tokens_pub_key.fee,
    })  
    //console.log('Result', result)
    expect(result.status).to.equal('OK')  
  })

  it(`Print new user1 last_vote_weight`, async () => {
    await timeout(2000)
    try {
      let last_vote_weight = await getAccountVoteWeight(user1.account);
      last_vote_weight = Math.floor(last_vote_weight)
      console.log('new user1 last_vote_weight: ', last_vote_weight)
    } catch (err) {
      console.log('Error: ', err.json)
    } 
  })

  it(`Confirm user1 last_vote_weight increases by 100000000000`, async () => {
    try {
      let last_vote_weight = await getAccountVoteWeight(user1.account);
      last_vote_weight = Math.floor(last_vote_weight)
      expect(last_vote_weight).to.equal(user1.last_vote_weight + 100000000000)
      user1.last_vote_weight = last_vote_weight
    } catch (err) {
      console.log('Error: ', err)
    } 
  })

  it(`total_voted_fio increased by user1 100000000000`, async () => {
    try {
      let new_total_voted_fio = await getTotalVotedFio();
      console.log('user1.last_vote_weight: ', user1.last_vote_weight)
      console.log('new_total_voted_fio: ', new_total_voted_fio)
      console.log('new_total_voted_fio - total_voted_fio: ', new_total_voted_fio - total_voted_fio)
      expect(new_total_voted_fio).to.equal(total_voted_fio + 100000000000)
      total_voted_fio = new_total_voted_fio
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`Reset total_voted_fio`, async () => {
    try {
      total_voted_fio = await getTotalVotedFio();
      console.log('Reset total_voted_fio: ', total_voted_fio)
    } catch (err) {
      console.log('Error: ', err.json)
    } 
  })

  it(`Reset user2 last_vote_weight`, async () => {
    try {
      let last_vote_weight = await getAccountVoteWeight(user2.account);
      user2.last_vote_weight = Math.floor(last_vote_weight)
      console.log('Reset user2.last_vote_weight: ', user2.last_vote_weight)
    } catch (err) {
      console.log('Error: ', err.json)
    } 
  })

  it(`Transfer 30000000000 to user2`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: user2.publicKey,
      amount: 300000000000,
      maxFee: config.api.transfer_tokens_pub_key.fee,
    })  
    console.log('Result', result)
    expect(result.status).to.equal('OK')  
  })

  it(`Print new user2 last_vote_weight`, async () => {
    await timeout(2000)
    try {
      let last_vote_weight = await getAccountVoteWeight(user2.account);
      last_vote_weight = Math.floor(last_vote_weight)
      console.log('New user2 last_vote_weight: ', last_vote_weight)
    } catch (err) {
      console.log('Error: ', err.json)
    } 
  })

  it(`Confirm user2 last_vote_weight increases by 300000000000`, async () => {
    try {
      let last_vote_weight = await getAccountVoteWeight(user2.account);
      last_vote_weight = Math.floor(last_vote_weight)
      expect(last_vote_weight).to.equal(user2.last_vote_weight + 300000000000)
      user2.last_vote_weight = last_vote_weight
    } catch (err) {
      console.log('Error: ', err)
    } 
  })

  it(`total_voted_fio increased by user2 300000000000`, async () => {
    try {
      let new_total_voted_fio = await getTotalVotedFio();
      console.log('user2.last_vote_weight: ', user2.last_vote_weight)
      console.log('new_total_voted_fio: ', new_total_voted_fio)
      console.log('new_total_voted_fio - total_voted_fio: ', new_total_voted_fio - total_voted_fio)
      expect(new_total_voted_fio).to.equal(total_voted_fio + 300000000000)
      total_voted_fio = new_total_voted_fio
    } catch (err) {
      console.log('Error', err)
    }
  })


  it.skip(`Print RAM Usage`, async () => {
    printUserRam(user1)
    printUserRam(user2)
    printUserRam(prod)
  })

})
