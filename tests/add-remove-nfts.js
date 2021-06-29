require('mocha')
const {expect} = require('chai')
const {newUser, existingUser, fetchJson, generateFioDomain, generateFioAddress, createKeypair, callFioApi, timeout} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
config = require('../config.js');

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
})

describe.only(`************************** retire-tokens.js ************************** \n    A. Add NFTS`, () => {
  let userA1, userA2, userA3;


  const fundsAmount = 10000000000000

  it(`Create users`, async () => {
    userA1 = await newUser(faucet);
    userA2 = await newUser(faucet);
    userA3 = await newUser(faucet);
  })

  it(`Transfer ${fundsAmount} FIO to userA1 FIO public key`, async () => {
      const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: userA1.publicKey,
      amount: fundsAmount,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    //console.log('Result: ', result)
    expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected')

  })


  it(`Add NFT to UserA1 FIO Address`, async () => {
    try {
      const result = await userA1.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: userA1.address,
          nfts: [{
              "chain_code":"ETH","contract_address":"0x123456789ABCDEF", "token_id":"1", "url":"", "hash":"","metadata":""
            }],
          max_fee: 5000000000,
          actor: userA1.account,
          tpid: ""
        }
      })
      //console.log(`Result: `, result)
      expect(result.status).to.equal('OK')

    } catch (err) {
     console.log(err.message)
    }
  })

  it('Wait 5 seconds. (Slower test systems)', async () => {
    await timeout(5000);
  })

  it(`Remove NFT from UserA1 FIO Address`, async () => {
    try {
      const result = await userA1.sdk.genericAction('pushTransaction', {
        action: 'remnft',
        account: 'fio.address',
        data: {
          fio_address: userA1.address,
          nfts: [{
              "chain_code":"ETH","contract_address":"0x123456789ABCDEF", "token_id":"1", "url":"", "hash":"","metadata":""
            }],
          max_fee: 5000000000,
          actor: userA1.account,
          tpid: ""
        }
      })
      //console.log(`Result: `, result)
      expect(result.status).to.equal('OK')

    } catch (err) {
     console.log(err.message)
    }
  })


  it(`Add 3 NFTs to UserA1 FIO Address`, async () => {
    try {
      const result = await userA1.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: userA1.address,
          nfts: [{
              "chain_code":"ETH","contract_address":"0x123456789ABCDEF", "token_id":"7", "url":"", "hash":"","metadata":""
            },{
              "chain_code":"ETH","contract_address":"0x123456789ABCDEF", "token_id":"8", "url":"", "hash":"","metadata":""
            },{
              "chain_code":"ETH","contract_address":"0x123456789ABCDEF", "token_id":"9", "url":"", "hash":"","metadata":""
            }],
          max_fee: 5000000000,
          actor: userA1.account,
          tpid: ""
        }
      })
      //console.log(`Result: `, result)
      expect(result.status).to.equal('OK')

    } catch (err) {
     console.log(err.message)
    }
  })

  it('Wait 2 seconds. (Slower test systems)', async () => {
    await timeout(2000);
  })


    it(`Remove all NFTs from UserA1 FIO Address`, async () => {
      try {
        const result = await userA1.sdk.genericAction('pushTransaction', {
          action: 'remallnfts',
          account: 'fio.address',
          data: {
            fio_address: userA1.address,
            max_fee: 5000000000,
            actor: userA1.account,
            tpid: ""
          }
        })
        //console.log(`Result: `, result)
        expect(result.status).to.equal('OK')

      } catch (err) {
       console.log(err.message)
      }
    })

})
