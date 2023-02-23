require('mocha')
const {expect} = require('chai')
const {newUser, timeout, fetchJson, callFioApi, callFioApiSigned, getBundleCount} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
config = require('../config.js');

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
})

describe(`************************** remove-address.js ************************** \n    A. Remove public address, address parameter tests`, () => {
  let userA1

  it(`Create users`, async () => {
      userA1 = await newUser(faucet);
  })

  it(`(SDK) removePublicAddress Fail, empty address. Expect SDK error: ${config.error.fioAddressRequired}`, async () => {
    try {
      const result = await userA1.sdk.genericAction('removePublicAddresses', {
        fioAddress: "",
        publicAddresses: config.public_addresses,
        maxFee: config.api.add_pub_address.fee,
        tpid: ''
      })

    } catch (err) {
      console.log('Error: ', err)
      //console.log(JSON.stringify(err, null, 4));
      expect(err.message).to.equal(config.error.validationError2)
      expect(err.list[0].message).to.equal(config.error.fioAddressRequired)
    }
  })


  it(`(SDK) removePublicAddress Fail, address has no domain. Expect SDK error: ${config.error.fioAddressInvalidChar}`, async () => {
    try {
      const result = await userA1.sdk.genericAction('removePublicAddresses', {
        fioAddress: "ed@",
        publicAddresses: config.public_addresses,
        maxFee: config.api.add_pub_address.fee,
        tpid: ''
      })

    } catch (err) {
      expect(err.message).to.equal(config.error.validationError2)
      expect(err.list[0].message).to.equal(config.error.fioAddressInvalidChar)
    }
  })

  it(`(SDK) removePublicAddress Fail, address has no @. Expect SDK error: ${config.error.fioAddressInvalidChar}`, async () => {
    try {
      const result = await userA1.sdk.genericAction('removePublicAddresses', {
        fioAddress: "eddapixdev",
        publicAddresses: config.public_addresses,
        maxFee: config.api.add_pub_address.fee,
        tpid: ''
      })

    } catch (err) {
      expect(err.message).to.equal(config.error.validationError2)
      expect(err.list[0].message).to.equal(config.error.fioAddressInvalidChar)
    }
  })

  it(`(SDK) removePublicAddress Fail, address has no name. Expect SDK error: ${config.error.fioAddressInvalidChar}`, async () => {
    try {
      const result = await userA1.sdk.genericAction('removePublicAddresses', {
        fioAddress: "@dapixdev",
        publicAddresses: config.public_addresses,
        maxFee: config.api.add_pub_address.fee,
        tpid: ''
      })

    } catch (err) {
      expect(err.message).to.equal(config.error.validationError2)
      expect(err.list[0].message).to.equal(config.error.fioAddressInvalidChar)
    }
  })

  it(`(SDK) removePublicAddress Fail, address has multiple @. Expect SDK error: ${config.error.fioAddressInvalidChar}`, async () => {
    try {
      const result = await userA1.sdk.genericAction('removePublicAddresses', {
        fioAddress: "ed@@dapixdev",
        publicAddresses: config.public_addresses,
        maxFee: config.api.add_pub_address.fee,
        tpid: ''
      })

    } catch (err) {
      expect(err.message).to.equal(config.error.validationError2)
      expect(err.list[0].message).to.equal(config.error.fioAddressInvalidChar)

    }
  })

  it(`(SDK) removePublicAddress Fail, address name has illegal chars. Expect SDK error: ${config.error.fioAddressInvalidChar}`, async () => {
    try {
      const result = await userA1.sdk.genericAction('removePublicAddresses', {
        fioAddress: "ed!#@dapixdev",
        publicAddresses: config.public_addresses,
        maxFee: config.api.add_pub_address.fee,
        tpid: ''
      })

    } catch (err) {
      expect(err.message).to.equal(config.error.validationError2)
      expect(err.list[0].message).to.equal(config.error.fioAddressInvalidChar)
    }
  })

  it(`(SDK) removePublicAddress Fail, address domain has illegal chars. Expect SDK error: ${config.error.fioAddressInvalidChar}`, async () => {
    try {
      const result = await userA1.sdk.genericAction('removePublicAddresses', {
        fioAddress: "ed@dapix#$%dev",
        publicAddresses: config.public_addresses,
        maxFee: config.api.add_pub_address.fee,
        tpid: ''
      })

    } catch (err) {
      expect(err.message).to.equal(config.error.validationError2)
      expect(err.list[0].message).to.equal(config.error.fioAddressInvalidChar)
    }
  })

  it(`(SDK) removePublicAddress Fail, address too long. Expect SDK error: ${config.error.fioAddressLengthErr}`, async () => {
    try {
      const result = await userA1.sdk.genericAction('removePublicAddresses', {
        fioAddress: "ed@dapix123456789012345466789012345234523452345234567890123344556dev",
        publicAddresses: config.public_addresses,
        maxFee: config.api.add_pub_address.fee,
        tpid: ''
      })
      expect(result).to.equal(null)
      console.log('err: ', err.json)
    } catch (err) {
      expect(err.message).to.equal(config.error.validationError2)
      expect(err.list[0].message).to.equal(config.error.fioAddressLengthErr)
    }
  })

  it(`(SDK) removePublicAddress Fail, address doesn't exist. Expect error code 404: Invalid FIO Address`, async () => {
    try {
      const result = await userA1.sdk.genericAction('removePublicAddresses', {
        fioAddress: "ed@dapixtt",
        publicAddresses: config.public_addresses,
        maxFee: config.api.remove_all_pub_addresses.fee,
        tpid: ''
      })
      expect(result).to.equal(null)
    } catch (err) {
      //console.log('err: ', err)
      expect(err.json.fields[0].error).to.equal('Invalid FIO Address')
      expect(err.errorCode).to.equal(404);
    }
  })
})


describe(`B. Remove public addresses, public adresses parameter tests`, () => {
  let userA1

  it(`Create users`, async () => {
      userA1 = await newUser(faucet);
  })


  it(`removePublicAddress Fail, empty string for public addresses`, async () => {
    try {
      const result = await userA1.sdk.genericAction('removePublicAddresses', {
        fioAddress: userA1.address,
        publicAddresses: "",
        maxFee: config.api.add_pub_address.fee,
        tpid: ''
      })

    } catch (err) {
      //console.log('Error', err)
      //console.log('Error message', err.message)
      var expected = `Error 400`
      expect(err.message).to.include(expected)
    }
  })

  it(`removePublicAddress Fail, empty list of public addresses`, async () => {
    try {
      const result = await userA1.sdk.genericAction('removePublicAddresses', {
        fioAddress: userA1.address,
        publicAddresses: [],
        maxFee: config.api.add_pub_address.fee,
        tpid: ''
      })

    } catch (err) {
    //  console.log('Error', err)
    //  console.log('Error message', err.message)
      var expected = `Error 400`
      expect(err.message).to.include(expected)
    }
  })

  it(`removePublicAddress Fail, unexpected json attributes public addresses`, async () => {
    try {
      const result = await userA1.sdk.genericAction('removePublicAddresses', {
        fioAddress: userA1.address,
        publicAddresses: [
          {
            chain_code: 'BCH',
            foo_bar:"fjfjklfjfjkfljfkjfkljflkjfkfjlkfjklfjkfjlfkjfkljfkfklj",
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
        tpid: ''
      })

    } catch (err) {
    //  console.log('Error', err)
    //  console.log('Error message', err.message)
      var expected = `Error 400`
      expect(err.message).to.include(expected)
    }
  })

  it(`removePublicAddress Fail, missing token_code on one element`, async () => {
    try {
      const result = await userA1.sdk.genericAction('removePublicAddresses', {
        fioAddress: userA1.address,
        publicAddresses: [
          {
            chain_code: 'BCH',
            public_address: 'bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9',
          },
          {
            chain_code: 'DASH',
            token_code: 'DASH',
            public_address: 'XyCyPKzTWvW2XdcYjPaPXGQDCGk946ywEv',
          }
        ],
        maxFee: config.api.add_pub_address.fee,
        tpid: ''
      })

    } catch (err) {
    //console.log('Error', err)
    // console.log('Error message', err.message)
      var expected = `missing tokenpubaddr.token_code`
      expect(err.message).to.include(expected)
    }
  })

  it(`removePublicAddress Fail, missing chain_code on one element`, async () => {
    try {
      const result = await userA1.sdk.genericAction('removePublicAddresses', {
        fioAddress: userA1.address,
        publicAddresses: [
          {
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
        tpid: ''
      })

    } catch (err) {
      //console.log('Error', err)
      //console.log('Error message', err.message)
      var expected = `missing tokenpubaddr.chain_code`
      expect(err.message).to.include(expected)
    }
  })

  it(`removePublicAddress Fail, missing public_address on one element`, async () => {
    try {
      const result = await userA1.sdk.genericAction('removePublicAddresses', {
        fioAddress: userA1.address,
        publicAddresses: [
          {
            chain_code: 'BCH',
            token_code: 'BCH',
            },
          {
            chain_code: 'DASH',
            token_code: 'DASH',
            public_address: 'XyCyPKzTWvW2XdcYjPaPXGQDCGk946ywEv',
          }
        ],
        maxFee: config.api.add_pub_address.fee,
        tpid: ''
      })

    } catch (err) {
      //console.log('Error', err)
      //console.log('Error message', err.message)
      var expected = `missing tokenpubaddr.public_address`
      expect(err.message).to.include(expected)
    }
  })

  it(`Add DASH and BCH addresses to userA1`, async () => {
    try {
      const result = await userA1.sdk.genericAction('addPublicAddresses', {
        fioAddress: userA1.address,
        publicAddresses: config.public_addresses,
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


  it(`removePublicAddress Fail, non existent chain_code on address`, async () => {
    try {
      const result = await userA1.sdk.genericAction('removePublicAddresses', {
        fioAddress: userA1.address,
        publicAddresses: [
          {
            chain_code: 'BCHED',
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
        tpid: ''
      })

    } catch (err) {
      //console.log('Error', err)
      //console.log('Error message', err.message)
      var expected = `Error 400`
      expect(err.message).to.include(expected)
    }
  })

  it(`removePublicAddress Fail, non existent token_code on address`, async () => {
    try {
      const result = await userA1.sdk.genericAction('removePublicAddresses', {
        fioAddress: userA1.address,
        publicAddresses: [
          {
            chain_code: 'BCH',
            token_code: 'BCHED',
            public_address: 'bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9',
            },
          {
            chain_code: 'DASH',
            token_code: 'DASH',
            public_address: 'XyCyPKzTWvW2XdcYjPaPXGQDCGk946ywEv',
          }
        ],
        maxFee: config.api.add_pub_address.fee,
        tpid: ''
      })

    } catch (err) {
      //console.log('Error', err)
      //console.log('Error message', err.message)
      var expected = `Error 400`
      expect(err.message).to.include(expected)
    }
  })

  it(`removePublicAddress Fail, non existing public address`, async () => {
    try {
      const result = await userA1.sdk.genericAction('removePublicAddresses', {
        fioAddress: userA1.address,
        publicAddresses: [
          {
            chain_code: 'BCH',
            token_code: 'BCH',
            public_address: 'bitcoincash:qg9',
            },
          {
            chain_code: 'DASH',
            token_code: 'DASH',
            public_address: 'XyCyPKzTWvW2XdcYjPaPXGQDCGk946ywEv',
          }
        ],
        maxFee: config.api.add_pub_address.fee,
        tpid: ''
      })

    } catch (err) {
    // console.log('Error', err)
    // console.log('Error message', err.message)
      var expected = `Error 400`
      expect(err.message).to.include(expected)
    }
  })
})


describe(`C. Remove public address, max fee parameter tests`, () => {
    let userA1

    it(`Create users`, async () => {
        userA1 = await newUser(faucet);
    })

    it(`removePublicAddress , empty max fee, but bundle count is greater than zero`, async () => {

        const result = await userA1.sdk.genericAction('addPublicAddresses', {
          fioAddress: userA1.address,
          publicAddresses: config.public_addresses,
          maxFee: "",
          walletFioAddress: ''
        })
    })

    it('confirm BCH address was removed', async () => {
      try {
        const result = await userA1.sdk.genericAction('getPublicAddress', {
          fioAddress: userA1.address,
          chainCode: "BCH",
          tokenCode: "BCH"
        })
        //console.log('Result', result)
      } catch (err) {
        //console.log('Error', err)
        expect(err.json.message).to.equal(config.error.publicAddressFound)
      }
    })

    it(`removePublicAddress Fail, illegal chars in max fee`, async () => {
      try {
        const result = await userA1.sdk.genericAction('addPublicAddresses', {
          fioAddress: userA1.address,
          publicAddresses: config.public_addresses,
          maxFee: "400A000000000",
          walletFioAddress: ''
        })

      } catch (err) {
        //console.log('Error', err)
        //console.log('Error message', err.message)
        var expected = `invalid number`
        expect(err.message).to.include(expected)
      }
    })

    it(`removePublicAddress Fail, negative value max fee`, async () => {
      try {
        const result = await userA1.sdk.genericAction('addPublicAddresses', {
          fioAddress: userA1.address,
          publicAddresses: config.public_addresses,
          maxFee: -400000000000,
          walletFioAddress: ''
        })

      } catch (err) {
        //console.log('Error', err)
        //console.log('Error message', err.message)
        var expected = `Error 400`
        expect(err.message).to.include(expected)
      }
    })
})


describe(`D. Remove public address, tpid parameter tests`, () => {
  let userA1

  it(`Create users`, async () => {
      userA1 = await newUser(faucet);
  })



  it(`removePublicAddress Fail, tpid has no domain`, async () => {
    try {
      const result = await userA1.sdk.genericAction('removePublicAddresses', {
        fioAddress: userA1.address,
        publicAddresses: config.public_addresses,
        maxFee: config.api.add_pub_address.fee,
        tpid: "ed@"
      })

    } catch (err) {
      var expected = `Error 400`
      expect(err.message).to.include(expected)
    }
  })

  it(`removePublicAddress Fail, tpid has no @`, async () => {
    try {
      const result = await userA1.sdk.genericAction('removePublicAddresses', {
        fioAddress: userA1.address,
        publicAddresses: config.public_addresses,
        maxFee: config.api.add_pub_address.fee,
        tpid: "eddapixdev"
      })

    } catch (err) {
      var expected = `Error 400`
      expect(err.message).to.include(expected)
    }
  })

  it(`removePublicAddress Fail, tpid has no name`, async () => {
    try {
      const result = await userA1.sdk.genericAction('removePublicAddresses', {
        fioAddress: userA1.address,
        publicAddresses: config.public_addresses,
        maxFee: config.api.add_pub_address.fee,
        tpid: "@dapixdev"
      })

    } catch (err) {
      var expected = `Error 400`
      expect(err.message).to.include(expected)
    }
  })

  it(`removePublicAddress Fail, tpid has multiple @`, async () => {
    try {
      const result = await userA1.sdk.genericAction('removePublicAddresses', {
        fioAddress: userA1.address,
        publicAddresses: config.public_addresses,
        maxFee: config.api.add_pub_address.fee,
        tpid: "ed@@dapixdev"
      })

    } catch (err) {
      var expected = `Error 400`
      expect(err.message).to.include(expected)

    }
  })

  it(`removePublicAddress Fail, tpid name has illegal chars`, async () => {
    try {
      const result = await userA1.sdk.genericAction('removePublicAddresses', {
        fioAddress: userA1.address,
        publicAddresses: config.public_addresses,
        maxFee: config.api.add_pub_address.fee,
        tpid: "ed!#@dapixdev"
      })

    } catch (err) {
      var expected = `Error 400`
      expect(err.message).to.include(expected)

    }
  })

  it(`removePublicAddress Fail, tpid domain has illegal chars`, async () => {
    try {
      const result = await userA1.sdk.genericAction('removePublicAddresses', {
        fioAddress: userA1.address,
        publicAddresses: config.public_addresses,
        maxFee: config.api.add_pub_address.fee,
        tpid: "ed@dapix#$%dev"
      })

    } catch (err) {
      var expected = `Error 400`
      expect(err.message).to.include(expected)

    }
  })

  it(`removePublicAddress Fail, tpid too long`, async () => {
    try {
      const result = await userA1.sdk.genericAction('removePublicAddresses', {
        fioAddress: userA1.address,
        publicAddresses: config.public_addresses,
        maxFee: config.api.add_pub_address.fee,
        tpid: "ed@dapix12345678901234546678901234567890123344556dev"
      })

    } catch (err) {
      var expected = `Error 400`
      expect(err.message).to.include(expected)
    }
  })

  it(`removePublicAddress Fail, tpid address doesnt exist`, async () => {
    try {
      const result = await userA1.sdk.genericAction('removePublicAddresses', {
        fioAddress: userA1.address,
        publicAddresses: config.public_addresses,
        maxFee: config.api.add_pub_address.fee,
        tpid: "ed@dapix12567890123344556dev"
      })

    } catch (err) {
    //  console.log('Error', err)
    //  console.log('Error message', err.message)
      var expected = `Error 400`
      expect(err.message).to.include(expected)
    }
  })
})


describe(`E. Add and remove addresses with bundles remaining`, () => {
  let userA1

    it(`Create users`, async () => {
        userA1 = await newUser(faucet);
    })

    it('Wait a few seconds...', async () => { await timeout(2000); })

    it(`Add DASH and BCH addresses to userA1`, async () => {
      try {
        const result = await userA1.sdk.genericAction('addPublicAddresses', {
          fioAddress: userA1.address,
          publicAddresses: config.public_addresses,
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

    it('confirm BCH address was added', async () => {
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
      }
    })

    it('Wait a few seconds...', async () => {
      await timeout(2000);
    })

    it(`Remove BCH and DASH from userA1`, async () => {
      try {
        const result = await userA1.sdk.genericAction('removePublicAddresses', {
          fioAddress: userA1.address,
          publicAddresses: config.public_addresses,
          maxFee: config.api.add_pub_address.fee,
          tpid: ''
        })
        //console.log('Result:', result)
        expect(result.status).to.equal('OK')
      } catch (err) {
        console.log('Error', err)
        expect(err).to.equal(null)
      }
    })

    it('confirm BCH address was removed', async () => {
      try {
        const result = await userA1.sdk.genericAction('getPublicAddress', {
          fioAddress: userA1.address,
          chainCode: "BCH",
          tokenCode: "BCH"
        })
        //console.log('Result', result)
      } catch (err) {
        //console.log('Error', err)
        expect(err.json.message).to.equal(config.error.publicAddressFound)
      }
    })

    it(`Add DASH and BCH addresses to userA1`, async () => {
      try {
        const result = await userA1.sdk.genericAction('addPublicAddresses', {
          fioAddress: userA1.address,
          publicAddresses: [
            {
              chain_code: 'BCH',
              token_code: 'BCH',
              public_address: 'bitcoincash:qn9g9',
            },
            {
              chain_code: 'DASH',
              token_code: 'DASH',
              public_address: 'XyCyPKzTWvW2XdcYjPaPXGQDCGk946ywEv',
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

    it('confirm BCH address was added', async () => {
      try {
        const result = await userA1.sdk.genericAction('getPublicAddress', {
          fioAddress: userA1.address,
          chainCode: "BCH",
          tokenCode: "BCH"
        })
        //console.log('Result', result)
        expect(result.public_address).to.equal('bitcoincash:qn9g9')
      } catch (err) {
        console.log('Error', err)
        expect(err).to.equal(null)
      }
    })

    it(`Remove All public addresses from userA1`, async () => {
      try {
        const result = await userA1.sdk.genericAction('removeAllPublicAddresses', {
          fioAddress: userA1.address,
          maxFee: config.api.add_pub_address.fee,
          tpid: ''
        })
        //console.log('Result:', result)
        expect(result.status).to.equal('OK')
      } catch (err) {
        console.log('Error', err)
        expect(err).to.equal(null)
      }
    })

    it('confirm BCH address was removed', async () => {
      try {
        const result = await userA1.sdk.genericAction('getPublicAddress', {
          fioAddress: userA1.address,
          chainCode: "BCH",
          tokenCode: "BCH"
        })
        //console.log('Result', result)
      } catch (err) {
        //console.log('Error', err)
        expect(err.json.message).to.equal(config.error.publicAddressFound)
      }
    })

})


describe(`E-2. Add and remove addresses with NO bundles remaining`, () => {
  let userA1, userA2, remove_all_pub_addresses_fee, remove_pub_address_fee

    it(`Create users`, async () => {
        userA1 = await newUser(faucet);
        userA2 = await newUser(faucet);
    })

    it(`Wait a few seconds.`, async () => { await timeout(3000) })

    it(`Add DASH and BCH addresses to userA1`, async () => {
      try {
        const result = await userA1.sdk.genericAction('addPublicAddresses', {
          fioAddress: userA1.address,
          publicAddresses: config.public_addresses,
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

    it('confirm BCH address was added', async () => {
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
      }
    })

    it(`Remove BCH and DASH from userA1`, async () => {
      try {
        const result = await userA1.sdk.genericAction('removePublicAddresses', {
          fioAddress: userA1.address,
          publicAddresses: config.public_addresses,
          maxFee: config.api.add_pub_address.fee,
          tpid: ''
        })
        //console.log('Result:', result)
        expect(result.status).to.equal('OK')
      } catch (err) {
        console.log('Error', err)
        expect(err).to.equal(null)
      }
    })

    it('confirm BCH address was removed', async () => {
      try {
        const result = await userA1.sdk.genericAction('getPublicAddress', {
          fioAddress: userA1.address,
          chainCode: "BCH",
          tokenCode: "BCH"
        })
        //console.log('Result', result)
      } catch (err) {
        //console.log('Error', err)
        expect(err.json.message).to.equal(config.error.publicAddressFound)
      }
    })

    it(`Add DASH and BCH addresses to userA1`, async () => {
      try {
        const result = await userA1.sdk.genericAction('addPublicAddresses', {
          fioAddress: userA1.address,
          publicAddresses: [
            {
              chain_code: 'BCH',
              token_code: 'BCH',
              public_address: 'bitcoincash:qn9g9',
            },
            {
              chain_code: 'DASH',
              token_code: 'DASH',
              public_address: 'XyCyPKzTWvW2XdcYjPaPXGQDCGk946ywEv',
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

    it('confirm BCH address was added', async () => {
      try {
        const result = await userA1.sdk.genericAction('getPublicAddress', {
          fioAddress: userA1.address,
          chainCode: "BCH",
          tokenCode: "BCH"
        })
        //console.log('Result', result)
        expect(result.public_address).to.equal('bitcoincash:qn9g9')
      } catch (err) {
        console.log('Error', err)
        expect(err).to.equal(null)
      }
    })

    it(`Wait a few seconds.`, async () => { await timeout(3000) })

    it(`Use up all of userA1's bundles with 51 record_obt_data transactions`, async () => {
      for (i = 0; i < 51; i++) {
        try {
          const result = await userA1.sdk.genericAction('recordObtData', {
            payerFioAddress: userA1.address,
            payeeFioAddress: userA2.address,
            payerTokenPublicAddress: userA1.publicKey,
            payeeTokenPublicAddress: userA2.publicKey,
            amount: 5000000000,
            chainCode: "BTC",
            tokenCode: "BTC",
            status: '',
            obtId: '',
            maxFee: config.api.record_obt_data.fee,
            technologyProviderId: '',
            payeeFioPublicKey: userA2.publicKey,
            memo: 'this is a test',
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

    it(`Add public addresses to userA1 to use up one more bundle`, async () => {
      try {
        const result = await userA1.sdk.genericAction('addPublicAddresses', {
          fioAddress: userA1.address,
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

    it(`Get balance for userA1`, async () => {
      try {
        const result = await userA1.sdk.genericAction('getFioBalance', {
          fioPublicKey: userA1.publicKey
        })
        userA1Balance = result.balance
        //console.log('userA1 fio balance', result)
      } catch (err) {
        //console.log('Error', err)
        expect(err).to.equal(null)
      }
    })

    it('Confirm bundles remaining = 0', async () => {
      const bundleCount = await getBundleCount(userA1.sdk);
      expect(bundleCount).to.equal(0);
    })

    it(`Verify remove_all_pub_addresses fee is > 0 (no more bundles)`, async () => {
      try {
        result = await userA1.sdk.getFee('remove_all_pub_addresses', userA1.address);
        remove_all_pub_addresses_fee = result.fee;
        //console.log('result: ', result)
        expect(result.fee).to.be.greaterThan(0);
      } catch (err) {
        console.log('Error', err);
        expect(err).to.equal(null);
      }
    })

    it(`Remove All public addresses from userA1. Verify fee was collected.`, async () => {
      try {
        const result = await userA1.sdk.genericAction('removeAllPublicAddresses', {
          fioAddress: userA1.address,
          maxFee: config.api.add_pub_address.fee,
          tpid: ''
        })
        //console.log('Result:', result)
        expect(result).to.have.any.keys('status');
        expect(result).to.have.any.keys('fee_collected');
        expect(result).to.have.any.keys('block_num');
        expect(result).to.have.any.keys('transaction_id');
        expect(result.fee_collected).to.equal(remove_all_pub_addresses_fee);
      } catch (err) {
        console.log('Error', err)
        expect(err).to.equal(null)
      }
    })

    it('confirm BCH address was removed', async () => {
      try {
        const result = await userA1.sdk.genericAction('getPublicAddress', {
          fioAddress: userA1.address,
          chainCode: "BCH",
          tokenCode: "BCH"
        })
        //console.log('Result', result)
        expect(result).to.equal(null)
      } catch (err) {
        //console.log('Error', err)
        expect(err.json.message).to.equal(config.error.publicAddressFound)
      }
    })

    it('Wait a few seconds to avoid duplicate transaction.', async () => {
      await timeout(2000);
    })

    it(`Add ETH public addresses to userA1`, async () => {
      try {
        const result = await userA1.sdk.genericAction('addPublicAddresses', {
          fioAddress: userA1.address,
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

    it(`Verify remove_pub_address fee is > 0 (no more bundles)`, async () => {
      try {
        result = await userA1.sdk.getFee('remove_pub_address', userA1.address);
        remove_pub_address_fee = result.fee;
        //console.log('result: ', result)
        expect(result.fee).to.be.greaterThan(0);
      } catch (err) {
        console.log('Error', err.json);
        expect(err).to.equal(null);
      }
    })

    it('Wait a few seconds to avoid duplicate transaction.', async () => {
      await timeout(3000);
    })

    it(`Remove ETH address from userA1. Verify fee was collected.`, async () => {
      try {
        const result = await userA1.sdk.genericAction('removePublicAddresses', {
          fioAddress: userA1.address,
          publicAddresses: [
            {
              chain_code: 'ETH',
              token_code: 'ETH',
              public_address: 'ethaddress',
              }
          ],
          maxFee: config.api.add_pub_address.fee,
          tpid: ''
        })
        //console.log('Result:', result)
        expect(result).to.have.any.keys('status');
        expect(result).to.have.any.keys('fee_collected');
        expect(result).to.have.any.keys('block_num');
        expect(result).to.have.any.keys('transaction_id');
        expect(result.fee_collected).to.equal(remove_pub_address_fee);
      } catch (err) {
        console.log('Error', err)
        expect(err).to.equal(null)
      }
    })

    it('confirm address was removed', async () => {
      try {
        const result = await userA1.sdk.genericAction('getPublicAddress', {
          fioAddress: userA1.address,
          chainCode: "ETH",
          tokenCode: "ETH"
        })
        //console.log('Result', result)
      } catch (err) {
        //console.log('Error', err)
        expect(err.json.message).to.equal(config.error.publicAddressFound)
      }
    })

})


describe(`F. Sad - result in error`, () => {
  let userA1, userA2

  it(`Create users`, async () => {
      userA1 = await newUser(faucet);
      userA2 = await newUser(faucet);
  })

  it(`Add public addresses to userA1`, async () => {
    try {
      const result = await userA1.sdk.genericAction('addPublicAddresses', {
        fioAddress: userA1.address,
        publicAddresses: config.public_addresses,
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

  it(`Fixed in BD-1955, Remove with invalid FIO Address - Direct API call. Expect error: ${config.error2.invalidFioAddress.message}`, async () => {
    const result = await callFioApiSigned('push_transaction', {
      action: 'remaddress',
      account: 'fio.address',
      actor: userA1.account,
      privKey: userA1.privateKey,
      data: {
        "fio_address": 'invalid@@address',
        "public_addresses": config.public_addresses,
        "max_fee": config.api.remove_pub_address.fee,
        "tpid": '',
        "actor": userA1.account
      }
    })
    //console.log('Result: ', result)
    expect(result.fields[0].error).to.equal(config.error2.invalidFioAddress.message);
  })

  it(`Fixed in BD-1955, Remove with invalid FIO Address - push transaction. Expect error type ${config.error2.invalidFioAddress.statusCode}: ${config.error2.invalidFioAddress.message}`, async () => {
    try{
      const result = await userA1.sdk.genericAction('pushTransaction', {
        action: 'remaddress',
        account: 'fio.address',
        data: {
          "fio_address": 'invalid@@address',
          "public_addresses": config.public_addresses,
          "max_fee": config.api.remove_pub_address.fee,
          "tpid": '',
          "actor": userA1.account
        }
      })
      console.log('Result:', result)
      expect(result.status).to.equal(null);
    } catch (err) {
      //console.log('Error: ', err.json)
      expect(err.json.fields[0].error).to.equal(config.error2.invalidFioAddress.message)
      expect(err.errorCode).to.equal(config.error2.invalidFioAddress.statusCode);
    }
  })

  it(`Remove invalid public addresses. Expect error type ${config.error2.invalidPublicAddress.statusCode}: ${config.error2.invalidPublicAddress.message}`, async () => {
    try {
      const result = await userA1.sdk.genericAction('pushTransaction', {
        action: 'remaddress',
        account: 'fio.address',
        data: {
          "fio_address": userA1.address,
          "public_addresses": [
            {
              chain_code: 'BCH',
              token_code: 'BCH',
              public_address: 'invalidaddress',
              },
              {
                chain_code: 'DASH',
                token_code: 'DASH',
                public_address: 'alsoinvalid',
              }
          ],
          "max_fee": config.api.remove_pub_address.fee,
          "tpid": '',
          "actor": userA1.account
        }
      })
      expect(result.status).to.equal(null);
    } catch (err) {
      //console.log('Err: ', err.json);
      expect(err.json.fields[0].error).to.equal(config.error2.invalidPublicAddress.message)
      expect(err.errorCode).to.equal(config.error2.invalidPublicAddress.statusCode);
    }
  })

  it(`Remove with invalid TPID. Expect error type ${config.error2.invalidTpid.statusCode}: ${config.error2.invalidTpid.message}`, async () => {
    try{
      const result = await userA1.sdk.genericAction('pushTransaction', {
        action: 'remaddress',
        account: 'fio.address',
        data: {
          "fio_address": userA1.address,
          //"public_addresses": config.public_addresses,
          "public_addresses": [
            {
              chain_code: 'BCH',
              token_code: 'BCH',
              public_address: 'invalidaddress',
              },
              {
                chain_code: 'DASH',
                token_code: 'DASH',
                public_address: 'alsoinvalid',
              }
          ],
          "max_fee": config.api.remove_pub_address.fee,
          "tpid": 'invalid@@tpid',
          "actor": userA1.account
        }
      })
      expect(result.status).to.equal(null);
    } catch (err) {
      expect(err.json.fields[0].error).to.equal(config.error2.invalidTpid.message)
      expect(err.errorCode).to.equal(config.error2.invalidTpid.statusCode);
    }
  })

  it(`Remove with invalid actor - Direct API call. Expect error type ${config.error2.invalidActorAuth.statusCode}: ${config.error2.invalidActorAuth.message}`, async () => {
    const result = await callFioApiSigned('push_transaction', {
      action: 'remaddress',
      account: 'fio.address',
      actor: userA1.account,
      privKey: userA1.privateKey,
      data: {
        "fio_address": userA1.address,
        "public_addresses": [
          {
            chain_code: 'BCH',
            token_code: 'BCH',
            public_address: 'invalidaddress',
            },
            {
              chain_code: 'DASH',
              token_code: 'DASH',
              public_address: 'alsoinvalid',
            }
        ],
        "max_fee": config.api.remove_pub_address.fee,
        "tpid": '',
        "actor": 'invalidactor'
      }
    })
    //console.log('Result: ', result)
    expect(result.error.what).to.equal(config.error2.invalidActorAuth.message)
    expect(result.code).to.equal(config.error2.invalidActorAuth.statusCode);
  })


  it('Wait a few seconds to avoid duplicate transaction.', async () => {
    await timeout(2000);
  })

  it(`Add back public addresses to userA1`, async () => {
    try {
      const result = await userA1.sdk.genericAction('addPublicAddresses', {
        fioAddress: userA1.address,
        publicAddresses: config.public_addresses,
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

  it(`userA2 tries to remove userA1s public addresses. Expect error`, async () => {
    try{
      const result = await userA2.sdk.genericAction('pushTransaction', {
        action: 'remaddress',
        account: 'fio.address',
        data: {
          "fio_address": userA1.address,
          "public_addresses": config.public_addresses,
          "max_fee": config.api.remove_pub_address.fee,
          "tpid": '',
          "actor": userA1.account
        }
      })
      expect(result.status).to.equal(null);
    } catch (err) {
      //console.log('Error', err)
      expect(err.json.message).to.contain('Request signature is not valid or this user is not allowed to sign this transaction.');
      expect(err.errorCode).to.equal(403);
    }
  })

  it(`Use up all of userA1's bundles with 51 record_obt_data transactions`, async () => {
    for (i = 0; i < 51; i++) {
      try {
        const result = await userA1.sdk.genericAction('recordObtData', {
          payerFioAddress: userA1.address,
          payeeFioAddress: userA2.address,
          payerTokenPublicAddress: userA1.publicKey,
          payeeTokenPublicAddress: userA2.publicKey,
          amount: 5000000000,
          chainCode: "BTC",
          tokenCode: "BTC",
          status: '',
          obtId: '',
          maxFee: config.api.record_obt_data.fee,
          technologyProviderId: '',
          payeeFioPublicKey: userA2.publicKey,
          memo: 'this is a test',
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

  it(`Add public addresses to userA1 to use up one more bundle`, async () => {
    try {
      const result = await userA1.sdk.genericAction('addPublicAddresses', {
        fioAddress: userA1.address,
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

  it(`Get balance for userA1`, async () => {
    try {
      const result = await userA1.sdk.genericAction('getFioBalance', {
        fioPublicKey: userA1.publicKey
      })
      userA1Balance = result.balance
      //console.log('userA1 fio balance', result)
    } catch (err) {
      //console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it('Transfer entire balance for userA1 to userA2', async () => {
    try {
      const result = await userA1.sdk.genericAction('transferTokens', {
        payeeFioPublicKey: userA2.publicKey,
        amount: userA1Balance - config.api.transfer_tokens_pub_key.fee,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        technologyProviderId: ''
      })
      //console.log('Result: ', result)
      expect(result).to.have.any.keys('status');
      expect(result).to.have.any.keys('fee_collected');
      expect(result).to.have.any.keys('block_num');
      expect(result).to.have.any.keys('transaction_id');
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  })

  it(`Verify balance for userA1 = 0`, async () => {
    try {
      const result = await userA1.sdk.genericAction('getFioBalance', {
        fioPublicKey: userA1.publicKey
      })
      //console.log('userA1 fio balance', result)
      expect(result.balance).to.equal(0)
    } catch (err) {
      //console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it('Confirm bundles remaining = 0', async () => {
    const bundleCount = await getBundleCount(userA1.sdk);
    expect(bundleCount).to.equal(0);
  })

  it(`Remove with fee less than required fee. Expect error type 400: ${config.error.feeExceedsMax}`, async () => {
    try{
      const result = await userA1.sdk.genericAction('pushTransaction', {
        action: 'remaddress',
        account: 'fio.address',
        data: {
          "fio_address": userA1.address,
          "public_addresses": config.public_addresses,
          "max_fee": config.api.remove_pub_address.fee - 100000000,
          "tpid": '',
          "actor": userA1.account
        }
      })
      expect(result.status).to.equal(null);
    } catch (err) {
      //console.log('Error: ', err.json)
      expect(err.json.fields[0].error).to.equal(config.error.feeExceedsMax)
      expect(err.errorCode).to.equal(400);
    }
  })

  it(`Remove addresses with insufficient funds and no bundled transactions. Expect error type 400: ${config.error.insufficientFunds}`, async () => {
    try {
      const result = await userA1.sdk.genericAction('pushTransaction', {
        action: 'remaddress',
        account: 'fio.address',
        data: {
          "fio_address": userA1.address,
          "public_addresses": config.public_addresses,
          "max_fee": config.api.remove_pub_address.fee,
          "tpid": '',
          "actor": userA1.account
        }
      })
      expect(result.status).to.equal(null);
    } catch (err) {
      //console.log('Error: ', err.json)
      expect(err.json.fields[0].error).to.equal(config.error.insufficientFunds)
      expect(err.errorCode).to.equal(400);
    }
  })
})


describe(`(FIP-33) Test $ is allowed in chain and token code for removePublicAddresses`, () => {

  let user1

  it(`Create users`, async () => {
    user1 = await newUser(faucet);
  })

  it(`(SDK) Add $BCH in chain_code - Expect success`, async () => {
    try {
      const result = await user1.sdk.genericAction('addPublicAddresses', {
        fioAddress: user1.address,
        publicAddresses: [
          {
            chain_code: '$BCH',
            token_code: 'BCH',
            public_address: 'bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9',
          },
          {
            chain_code: '$TEST',
            token_code: '$TEST',
            public_address: 'bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9',
          }
        ],
        maxFee: config.maxFee,
        technologyProviderId: ''
      })
      //console.log('Result:', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`(SDK) removePublicAddress with chain_code = $BCH - expect success`, async () => {
    try {
      const result = await user1.sdk.genericAction('removePublicAddresses', {
        fioAddress: user1.address,
        publicAddresses: [
          {
            chain_code: '$BCH',
            token_code: 'BCH',
            public_address: 'bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9',
          }
        ],
        maxFee: config.maxFee,
        tpid: ''
      })
      //console.log('Result:', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`(SDK) Add $BCH in token_code - Expect success`, async () => {
    try {
      const result = await user1.sdk.genericAction('addPublicAddresses', {
        fioAddress: user1.address,
        publicAddresses: [
          {
            chain_code: 'BCH',
            token_code: '$BCH',
            public_address: 'bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9',
          }
        ],
        maxFee: config.maxFee,
        technologyProviderId: ''
      })
      //console.log('Result:', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`(SDK) removePublicAddress with token_code = $BCH - expect success`, async () => {
    try {
      const result = await user1.sdk.genericAction('removePublicAddresses', {
        fioAddress: user1.address,
        publicAddresses: [
          {
            chain_code: 'BCH',
            token_code: '$BCH',
            public_address: 'bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9',
          }
        ],
        maxFee: config.maxFee,
        tpid: ''
      })
      //console.log('Result:', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

})