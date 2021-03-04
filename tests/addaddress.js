require('mocha')
const {expect} = require('chai')
const {newUser, fetchJson, timeout, callFioApi} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
config = require('../config.js');

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
})

describe(`************************** addaddress.js ************************** \n    A. Add 2 addresses, then add 3 addresses including the original 2`, () => {

    let userA1

    it(`Create users`, async () => {
        userA1 = await newUser(faucet);
    })

    it(`Add DASH and BCH addresses to userA1`, async () => {
      try {
        const result = await userA1.sdk.genericAction('addPublicAddresses', {
          fioAddress: userA1.address,
          publicAddresses: [
            {
              chain_code: 'BCH',
              token_code: 'BCH',
              public_address: 'bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9',
            },
            {
              chain_code: 'DASH',
              token_code: 'DASH',
              public_address: 'XyCyPKzTWvW2XdcYjPaPXGQDCGk946ywEv',
            }
          ],
          maxFee: config.api.add_pub_address.fee,
          technologyProviderId: ''
        })
        //console.log('Result:', result)
        expect(result.status).to.equal('OK')
      } catch (err) {
        console.log('Error', err)
        expect(err).to.equal(null)
      }
    })

    it(`Wait a few seconds.`, async () => { await timeout(3000) })

    it('getPublicAddress for DASH', async () => {
      try {
        const result = await userA1.sdk.genericAction('getPublicAddress', {
          fioAddress: userA1.address,
          chainCode: "DASH",
          tokenCode: "DASH"
        })
        //console.log('Result', result)
        expect(result.public_address).to.equal('XyCyPKzTWvW2XdcYjPaPXGQDCGk946ywEv')
      } catch (err) {
        //console.log('Error', err)
        expect(err).to.equal(null)
      }
    })

    it('getPublicAddress for BCH', async () => {
      try {
        const result = await userA1.sdk.genericAction('getPublicAddress', {
          fioAddress: userA1.address,
          chainCode: "BCH",
          tokenCode: "BCH"
        })
        //console.log('Result', result)
        expect(result.public_address).to.equal('bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9')
      } catch (err) {
        console.log('Error', err)
        expect(err).to.equal(null);
      }
    })

    it(`Re-add DASH and BCH addresses plus additional ELA address to userA1`, async () => {
      try {
        const result = await userA1.sdk.genericAction('addPublicAddresses', {
          fioAddress: userA1.address,
          publicAddresses: [
            {
              chain_code: 'BCH',
              token_code: 'BCH',
              public_address: 'bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9',
            },
            {
              chain_code: 'DASH',
              token_code: 'DASH',
              public_address: 'XyCyPKzTWvW2XdcYjPaPXGQDCGk946ywEv',
            },
            {
              chain_code: 'ELA',
              token_code: 'ELA',
              public_address: 'EQH6o4xfaR5fbhV8cDbDGRxwJRJn3qeo41',
            }
          ],
          maxFee: config.api.add_pub_address.fee,
          technologyProviderId: ''
        })
        //console.log('Result:', result)
        expect(result.status).to.equal('OK')
      } catch (err) {
        console.log('Error', err)
        expect(err).to.equal(null)
      }
    })

    it('getPublicAddress for ELA', async () => {
      try {
        const result = await userA1.sdk.genericAction('getPublicAddress', {
          fioAddress: userA1.address,
          chainCode: "ELA",
          tokenCode: "ELA"
        })
        //console.log('Result', result)
        expect(result.public_address).to.equal('EQH6o4xfaR5fbhV8cDbDGRxwJRJn3qeo41')
      } catch (err) {
        console.log('Error', err)
        expect(err).to.equal(null)
      }
    })

    it('removeAllPublicAddresses', async () => {
      try {
        const result = await userA1.sdk.genericAction('removeAllPublicAddresses', {
          fioAddress: userA1.address,
          maxFee: config.api.add_pub_address.fee,
          technologyProviderId: ''
        })
        //console.log('Result', result)
        expect(result.status).to.equal('OK')
      } catch (err) {
        console.log('Error', err)
        expect(err).to.equal(null)
        expect(err).to.equal(null);
      }
    })

})

describe(`B. Add the same address twice`, () => {

  let userB1

  it(`Create users`, async () => {
      userB1 = await newUser(faucet);
  })

  it(`Add DASH and BCH addresses to userB1`, async () => {
    const result = await userB1.sdk.genericAction('addPublicAddresses', {
      fioAddress: userB1.address,
      publicAddresses: [
        {
          chain_code: 'BCH',
          token_code: 'BCH',
          public_address: 'bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9',
        }
      ],
      maxFee: config.api.add_pub_address.fee,
      walletFioAddress: ''
    })
    //console.log('Result:', result)
    expect(result.status).to.equal('OK')
  })

  it('getPublicAddress for BCH', async () => {
    try {
      const result = await userB1.sdk.genericAction('getPublicAddress', {
        fioAddress: userB1.address,
        chainCode: "BCH",
        tokenCode: "BCH"
      })
      //console.log('Result', result)
      expect(result.public_address).to.equal('bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9')
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null);
    }
  })

  it(`Re-add BCH address`, async () => {
    try {
      const result = await userB1.sdk.genericAction('addPublicAddresses', {
        fioAddress: userB1.address,
        publicAddresses: [
          {
            chain_code: 'BCH',
            token_code: 'BCH',
            public_address: 'bitcoincash:qzf8zha74adsfasdf0xnwlffdn0zuyaslx3c90q7n9g9',
          }
        ],
        maxFee: config.api.add_pub_address.fee,
        walletFioAddress: ''
      })
      //console.log('Result:', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null);
    }
  })

  it('getPublicAddress for BCH', async () => {
    try {
      const result = await userB1.sdk.genericAction('getPublicAddress', {
        fioAddress: userB1.address,
        chainCode: "BCH",
        tokenCode: "BCH"
      })
      //console.log('Result', result)
      expect(result.public_address).to.equal('bitcoincash:qzf8zha74adsfasdf0xnwlffdn0zuyaslx3c90q7n9g9')
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null);
    }
  })

})

describe(`C. FIP-13. Get_pub_addresses endpoint`, () => {

    let userA3

    it(`Create users`, async () => {
        userA3 = await newUser(faucet);
    })

    it(`Add DASH, BCH, ELA address to userA3`, async () => {
      try {
        const result = await userA3.sdk.genericAction('addPublicAddresses', {
          fioAddress: userA3.address,
          publicAddresses: [
            {
              chain_code: 'BCH',
              token_code: 'BCH',
              public_address: 'bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9',
            },
            {
              chain_code: 'DASH',
              token_code: 'DASH',
              public_address: 'XyCyPKzTWvW2XdcYjPaPXGQDCGk946ywEv',
            },
            {
              chain_code: 'ELA',
              token_code: 'ELA',
              public_address: 'EQH6o4xfaR5fbhV8cDbDGRxwJRJn3qeo41',
            }
          ],
          maxFee: config.api.add_pub_address.fee,
          technologyProviderId: ''
        })
        //console.log('Result:', result)
        expect(result.status).to.equal('OK')
      } catch (err) {
        console.log('Error', err)
        expect(err).to.equal(null)
      }
    })

    it('(api) Get all public addresses for userA3 FIO Address (get_pub_addresses)', async () => {
      try {
          const result = await callFioApi("get_pub_addresses", {
          fio_address: userA3.address,
          limit: 10,
          offset: 0
        })
      //  console.log('Result', result)
        expect(result.public_addresses.length).to.equal(4)
        expect(result.public_addresses[0].token_code).to.equal("FIO");
        expect(result.public_addresses[1].public_address).to.equal("bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9");
        expect(result.public_addresses[1].token_code).to.equal("BCH");
        expect(result.public_addresses[1].chain_code).to.equal("BCH");
        expect(result.public_addresses[2].public_address).to.equal("XyCyPKzTWvW2XdcYjPaPXGQDCGk946ywEv");
        expect(result.public_addresses[2].token_code).to.equal("DASH");
        expect(result.public_addresses[2].chain_code).to.equal("DASH");
        expect(result.public_addresses[3].public_address).to.equal("EQH6o4xfaR5fbhV8cDbDGRxwJRJn3qeo41");
        expect(result.public_addresses[3].token_code).to.equal("ELA");
        expect(result.public_addresses[3].chain_code).to.equal("ELA");
        expect(result.more).to.equal(false);
      } catch (err) {
        console.log('Error', err)
        expect(err).to.equal(null);
      }
    })

    it.skip('(BUG BD-2382)(api) Get all public addresses for userA3 FIO Address (get_pub_addresses) with no limit/offset.', async () => {
      try {
          const result = await callFioApi("get_pub_addresses", {
          fio_address: userA3.address
        })
      //  console.log('Result', result)
        expect(result.public_addresses.length).to.equal(4)
        expect(result.public_addresses[0].token_code).to.equal("FIO");
        expect(result.public_addresses[1].public_address).to.equal("bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9");
        expect(result.public_addresses[1].token_code).to.equal("BCH");
        expect(result.public_addresses[1].chain_code).to.equal("BCH");
        expect(result.public_addresses[2].public_address).to.equal("XyCyPKzTWvW2XdcYjPaPXGQDCGk946ywEv");
        expect(result.public_addresses[2].token_code).to.equal("DASH");
        expect(result.public_addresses[2].chain_code).to.equal("DASH");
        expect(result.public_addresses[3].public_address).to.equal("EQH6o4xfaR5fbhV8cDbDGRxwJRJn3qeo41");
        expect(result.public_addresses[3].token_code).to.equal("ELA");
        expect(result.public_addresses[3].chain_code).to.equal("ELA");
        expect(result.more).to.equal(false);
      } catch (err) {
        console.log('Error', err)
        expect(err).to.equal(null);
      }
    })

    it.skip('(BUG BD-2382)(api) Get all public addresses for userA3 FIO Address (get_pub_addresses) with no offset.', async () => {
      try {
          const result = await callFioApi("get_pub_addresses", {
          fio_address: userA3.address,
          limit: 10
        })
      //  console.log('Result', result)
        expect(result.public_addresses.length).to.equal(4)
        expect(result.public_addresses[0].token_code).to.equal("FIO");
        expect(result.public_addresses[1].public_address).to.equal("bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9");
        expect(result.public_addresses[1].token_code).to.equal("BCH");
        expect(result.public_addresses[1].chain_code).to.equal("BCH");
        expect(result.public_addresses[2].public_address).to.equal("XyCyPKzTWvW2XdcYjPaPXGQDCGk946ywEv");
        expect(result.public_addresses[2].token_code).to.equal("DASH");
        expect(result.public_addresses[2].chain_code).to.equal("DASH");
        expect(result.public_addresses[3].public_address).to.equal("EQH6o4xfaR5fbhV8cDbDGRxwJRJn3qeo41");
        expect(result.public_addresses[3].token_code).to.equal("ELA");
        expect(result.public_addresses[3].chain_code).to.equal("ELA");
        expect(result.more).to.equal(false);
      } catch (err) {
        console.log('Error', err)
        expect(err).to.equal(null);
      }
    })

    it('(api) Get all public addresses for userA3 FIO Address (get_pub_addresses) with no limit', async () => {
      try {
          const result = await callFioApi("get_pub_addresses", {
          fio_address: userA3.address,
          offset: 0
        })
      //  console.log('Result', result)
        expect(result.public_addresses.length).to.equal(4)
        expect(result.public_addresses[0].token_code).to.equal("FIO");
        expect(result.public_addresses[1].public_address).to.equal("bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9");
        expect(result.public_addresses[1].token_code).to.equal("BCH");
        expect(result.public_addresses[1].chain_code).to.equal("BCH");
        expect(result.public_addresses[2].public_address).to.equal("XyCyPKzTWvW2XdcYjPaPXGQDCGk946ywEv");
        expect(result.public_addresses[2].token_code).to.equal("DASH");
        expect(result.public_addresses[2].chain_code).to.equal("DASH");
        expect(result.public_addresses[3].public_address).to.equal("EQH6o4xfaR5fbhV8cDbDGRxwJRJn3qeo41");
        expect(result.public_addresses[3].token_code).to.equal("ELA");
        expect(result.public_addresses[3].chain_code).to.equal("ELA");
        expect(result.more).to.equal(false);
      } catch (err) {
        console.log('Error', err)
        expect(err).to.equal(null);
      }
    })

    //***** SAD TESTS *****//

    it('(api) Call get_pub_addresses with invalid FIO Address. Expect error type 400: Invalid FIO Address format', async () => {
      try {
          const result = await callFioApi("get_pub_addresses", {
          fio_address: "intentionallybadformat@@@@@******",
          limit: 10,
          offset: 0
        })
        //console.log('Result', result)
        expect(result.status).to.equal(null);
      } catch (err) {
      //  console.log('Error', err)
        expect(err.statusCode).to.equal(400);
        expect(err.error.fields[0].error).to.equal("Invalid FIO Address format");
      }
    })


    it('(api) Call get_pub_addresses with unregistered FIO Address. Expect error type 404: FIO Address does not exist', async () => {
      try {
          const result = await callFioApi("get_pub_addresses", {
          fio_address: "eric@likesbeans",
          limit: 10,
          offset: 0
        })
        //console.log('Result', result)
        expect(result.status).to.equal(null);
      } catch (err) {
        //console.log('Error', err)
        expect(err.statusCode).to.equal(404);
        expect(err.error.message).to.equal("FIO Address does not exist");
      }
    })

    it('(api) Call get_pub_addresses with invalid limit parameter of -1. Expect error type 400: Invalid limit', async () => {
      try {
          const result = await callFioApi("get_pub_addresses", {
          fio_address: userA3.address,
          limit: -1,
          offset: 0
        })
        //console.log('Result', result)
        expect(result.status).to.equal(null);
      } catch (err) {
      //  console.log('Error', err)
        expect(err.statusCode).to.equal(400);
        expect(err.error.fields[0].error).to.equal("Invalid limit");
      }
    })

    it('(api) Call get_pub_addresses with invalid offset parameter of -1. Expect error type 400: Invalid offset', async () => {
      try {
          const result = await callFioApi("get_pub_addresses", {
          fio_address: userA3.address,
          limit:  10,
          offset: -1
        })
        //console.log('Result', result)
        expect(result.status).to.equal(null);
      } catch (err) {
        //console.log('Error', err)
        expect(err.statusCode).to.equal(400);
        expect(err.error.fields[0].error).to.equal("Invalid offset");
      }
    })

    it('removeAllPublicAddresses', async () => {
      try {
        const result = await userA3.sdk.genericAction('removeAllPublicAddresses', {
          fioAddress: userA3.address,
          maxFee: config.api.add_pub_address.fee,
          technologyProviderId: ''
        })
        //console.log('Result', result)
        expect(result.status).to.equal('OK')
      } catch (err) {
        console.log('Error', err)
        expect(err).to.equal(null)
      }
    })

    it('(api) Get all public addresses for userA3 FIO Address (get_pub_addresses). Expect only FIO address to be returned.', async () => {
      try {
          const result = await callFioApi("get_pub_addresses", {
          fio_address: userA3.address,
          limit: 10,
          offset: 0
        })
      //  console.log('Result', result)
        expect(result.public_addresses[0].token_code).to.equal("FIO")
        expect(result.public_addresses[0].chain_code).to.equal("FIO")
        expect(result.public_addresses.length).to.equal(1)

      } catch (err) {
        console.log('Error', err)
        expect(err).to.equal(null)
      }
    })

    it(`Remove FIO address from userA3.`, async () => {
      try {
        const result = await userA3.sdk.genericAction('removePublicAddresses', {
          fioAddress: userA3.address,
          publicAddresses: [
            {
              chain_code: 'FIO',
              token_code: 'FIO',
              public_address: userA3.publicKey,
              }
          ],
          maxFee: config.api.remove_pub_address.fee,
          tpid: ''
        })
        //console.log('Result:', result)
        expect(result).to.have.all.keys('status', 'fee_collected')
      } catch (err) {
        console.log('Error', err)
        expect(err).to.equal(null)
      }
    })

    it('(api) Get all public addresses for userA3 FIO Address (get_pub_addresses). Expect error type 404: Public Addresses not found', async () => {
      try {
          const result = await callFioApi("get_pub_addresses", {
          fio_address: userA3.address,
          limit: 10,
          offset: 0
        })
        console.log('Result', result)
        expect(result).to.equal(null)
      } catch (err) {
        //console.log('Error', err)
        expect(err.statusCode).to.equal(404);
        expect(err.error.message).to.equal("Public Addresses not found");
      }
    })

})

describe(`FIP18. Chain-level addressing`, () => {

    let userB1
    let addressA = 'fdsfsdfsdzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9'
    let addressB = 'j0xnwlffdn0zuyaslx3c90q7n9g9cvbfbjndghj56ufhghfdgh'
    let addressC = 'fdn0zuyaslx3c90q7n9g9cvbfbjndghj56ufhghdfsgfsfdgh'
    let addressD = 'k0n0zuyaslx3c90q7n9g9cvbfockeahj56ufhghdfsgfsfdgh'

    it(`Create users`, async () => {
        userB1 = await newUser(faucet);
    })

    it(`(sdk) add_pub_address with chain_code ETH, token_code ETH, and public_address addressA`, async () => {
        const result = await userB1.sdk.genericAction('addPublicAddresses', {
            fioAddress: userB1.address,
            publicAddresses: [
                {
                    chain_code: 'ETH',
                    token_code: 'ETH',
                    public_address: addressA,
                }
            ],
            maxFee: config.api.add_pub_address.fee,
            walletFioAddress: ''
        })
        //console.log('Result:', result)
        expect(result.status).to.equal('OK')
    })

    it(`(sdk) add_pub_address with chain_code ETH, token_code *, and public_address addressB`, async () => {
        const result = await userB1.sdk.genericAction('addPublicAddresses', {
            fioAddress: userB1.address,
            publicAddresses: [
                {
                    chain_code: 'ETH',
                    token_code: '*',
                    public_address: addressB,
                }
            ],
            maxFee: config.api.add_pub_address.fee,
            walletFioAddress: ''
        })
        //console.log('Result:', result)
        expect(result.status).to.equal('OK')
    })

    it(`(sdk) add_pub_address with chain_code ETH,, token_code *, and public_address addressC`, async () => {
        const result = await userB1.sdk.genericAction('addPublicAddresses', {
            fioAddress: userB1.address,
            publicAddresses: [
                {
                    chain_code: 'ETH',
                    token_code: '*',
                    public_address: addressC,
                }
            ],
            maxFee: config.api.add_pub_address.fee,
            walletFioAddress: ''
        })
        //console.log('Result:', result)
        expect(result.status).to.equal('OK')
    })

    it('get_pub_address with chain_code ETH and token_code *. Expect public_address addressC', async () => {
        try {
            const result = await userB1.sdk.genericAction('getPublicAddress', {
                fioAddress: userB1.address,
                chainCode: "ETH",
                tokenCode: "*"
            })
            //console.log('Result', result)
            expect(result.public_address).to.equal('fdn0zuyaslx3c90q7n9g9cvbfbjndghj56ufhghdfsgfsfdgh')
        } catch (err) {
            console.log('Error', err)
        }
    })

    it('get_pub_address with chain_code ETH and random token_code. Expect public_address addressC', async () => {
        try {
            const result = await userB1.sdk.genericAction('getPublicAddress', {
                fioAddress: userB1.address,
                chainCode: "ETH",
                tokenCode: "EKJTKG"
            })
            //console.log('Result', result)
            expect(result.public_address).to.equal(addressC)
        } catch (err) {
            console.log('Error', err)
        }
    })

    it('get_pub_address with chain_code ETH, token_code ETH. Expect public_address addressA', async () => {
        try {
            const result = await userB1.sdk.genericAction('getPublicAddress', {
                fioAddress: userB1.address,
                chainCode: "ETH",
                tokenCode: "ETH"
            })
            //console.log('Result', result)
            expect(result.public_address).to.equal(addressA)
        } catch (err) {
            console.log('Error', err)
        }
    })

    it(`(sdk) remove_pub_address with with chain_code ETH, token_code *, and public_address addressC`, async () => {
        try {
            const result = await userB1.sdk.genericAction('removePublicAddresses', {
                fioAddress: userB1.address,
                publicAddresses: [
                    {
                        chain_code: 'ETH',
                        token_code: '*',
                        public_address: addressC,
                    }
                ],
                maxFee: config.api.remove_pub_address.fee,
                tpid: ''
            })
            //console.log('Result:', result)
            expect(result).to.have.all.keys('status', 'fee_collected')
        } catch (err) {
            console.log('Error', err)
            expect(err).to.equal(null)
        }
    })

    it(`get_pub_address with chain_code ETH and random token_code. Expect ${config.error.publicAddressFound}`, async () => {
        try {
            const result = await userB1.sdk.genericAction('getPublicAddress', {
                fioAddress: userB1.address,
                chainCode: "ETH",
                tokenCode: "EKJTKG"
            })
        } catch (err) {
            expect(err.json.message).to.equal(config.error.publicAddressFound)
        }
    })

    it('get_pub_address with chain_code ETH, token code ETH. Expect public_address addressA', async () => {
        try {
            const result = await userB1.sdk.genericAction('getPublicAddress', {
                fioAddress: userB1.address,
                chainCode: "ETH",
                tokenCode: "ETH"
            })
            //console.log('Result', result)
            expect(result.public_address).to.equal(addressA)
        } catch (err) {
            console.log('Error', err)
            expect(err).to.equal(null);
        }
    })

    it(`add_pub_address with chain_code ETH,, token_code **, and public_address addressD. Expect ${config.error.invalidTokenCode}`, async () => {
      try {
        const result = await userB1.sdk.genericAction('addPublicAddresses', {
            fioAddress: userB1.address,
            publicAddresses: [
                {
                    chain_code: 'ETH',
                    token_code: '**',
                    public_address: addressD,
                }
            ],
            maxFee: config.api.add_pub_address.fee,
            walletFioAddress: ''
        })
        expect(result).to.equal(null)
      } catch (err) {
        //console.log('err:', err.json.fields)
        expect(err.json.fields[0].error).to.equal(config.error.invalidTokenCode)
    }
  })

})

describe(`Remap FIO Address`, () => {
  let user1
  let newAddress = "FIOxyz"

  it(`Create users`, async () => {
    user1 = await newUser(faucet);
  })

  it(`Wait a few seconds.`, async () => { await timeout(3000) })

  it(`Remap FIO address to ${newAddress}`, async () => {
    const result = await user1.sdk.genericAction('addPublicAddresses', {
        fioAddress: user1.address,
        publicAddresses: [
            {
                chain_code: 'FIO',
                token_code: 'FIO',
                public_address: newAddress,
            }
        ],
        maxFee: config.api.add_pub_address.fee,
        walletFioAddress: ''
    })
    //console.log('Result:', result)
    expect(result.status).to.equal('OK')
})

  it(`Get all public addresses for user1 FIO Address (get_pub_addresses). Expect public_address to be mapped to: ${newAddress}`, async () => {
    try {
      const result = await user1.sdk.genericAction('getPublicAddress', {
        fioAddress: user1.address,
        chainCode: "FIO",
        tokenCode: "FIO"
    })
      //console.log('Result', result)
      expect(result.public_address).to.equal(newAddress)
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })
})
