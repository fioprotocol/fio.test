require('mocha')
config = require('../config.js');
const {expect} = require('chai')
const {newUser, fetchJson, generateFioDomain, generateFioAddress, createKeypair, callFioApi} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/FIOSDK')


before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
})

describe(`************************** paging.js ************************** \n A. get_fio_domains paging: Register multiple domains and page through using get_fio_domains`, () => {
    let userA1, domainCount = 20

    it('Create userA1', async () => {
        let keys = await createKeypair();
        userA1 = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson)
        //console.log('userA1 pub key: ', userA1.publicKey)
    })

    it('Transfer 20,000 FIO to userA1', async () => {
      try {
        const result = await faucet.genericAction('transferTokens', {
          payeeFioPublicKey: userA1.publicKey,
          amount: 20000000000000,
          maxFee: config.api.transfer_tokens_pub_key.fee,
          walletFioAddress: ''
        })
        //console.log('Result: ', result)
        expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected')
      } catch (err) {
        //console.log('Error: ', err);
        //console.log('Error: ', err.json);
        expect(err).to.equal(null);
      } 
    })

    it(`API call (get_fio_domains, no limit param, no offset param). Expect error type 404: ${config.error.noFioDomains}`, async () => {
      try {
        const json = {
          "fio_public_key": userA1.publicKey
        }
        result = await callFioApi("get_fio_domains", json);
        console.log('Result: ', result);
        //expect(result.fio_domains.length).to.equal(0)
      } catch (err) {
        //console.log('Error', err)
        expect(err.error.message).to.equal(config.error.noFioDomains);
        expect(err.statusCode).to.equal(404);
      }
    })

    it(`Same call using SDK`, async () => {
      try {
        const result = await userA1.genericAction('getFioDomains', {
          fioPublicKey: userA1.publicKey
        })
        console.log('Result: ', result);
        //expect(result.fio_domains.length).to.equal(0)
      } catch (err) {
        //console.log('Error', err)
        expect(err.json.message).to.equal(config.error.noFioDomains);
        expect(err.errorCode).to.equal(404);
      }
    })

    it(`Register ${domainCount} domains for userA1`, async () => {
      for (i = 0; i < domainCount; i++) {
        try {
          newDomain = i + generateFioDomain(8);
          const result = await userA1.genericAction('registerFioDomain', { 
            fioDomain: newDomain, 
            maxFee: config.api.register_fio_domain.fee,
            technologyProviderId: ''
          })   
          //console.log('Result: ', result)
          expect(result.status).to.equal('OK')
        } catch (err) {
          console.log('Error: ', err)
        }
      }
    })

    it(`API call (get_fio_domains, no limit param, no offset param). Expect ${domainCount} results`, async () => {
      try {
        const json = {
          "fio_public_key": userA1.publicKey
        }
        result = await callFioApi("get_fio_domains", json);
        //console.log('Result: ', result);
        expect(result.fio_domains.length).to.equal(domainCount)
      } catch (err) {
        console.log('Error', err)
        expect(err).to.equal(null)
      }
    })

    it(`API call (get_fio_domains, limit=0, offset=0). Expect ${domainCount} results.`, async () => {
      try {
        const json = {
          "fio_public_key": userA1.publicKey,
          "limit": 0,
          "offset": 0
        }
        result = await callFioApi("get_fio_domains", json);
        //console.log('Result: ', result);
        expect(result.fio_domains.length).to.equal(domainCount)
      } catch (err) {
        console.log('Error', err)
        expect(err).to.equal(null)
      }
    })

    it(`Same call using SDK`, async () => {
      try {
        const result = await userA1.genericAction('getFioDomains', {
          fioPublicKey: userA1.publicKey,
          limit: 0,
          offset: 0
        })
        //console.log('Result: ', result);
        expect(result.fio_domains.length).to.equal(domainCount)
      } catch (err) {
        console.log('Error', err)
        expect(err).to.equal(null)
      }
    })

    it(`API call (get_fio_domains, limit=1, offset=0). Expect 1 domain. Expect domain #1`, async () => {
      try {
        const json = {
          "fio_public_key": userA1.publicKey,
          "limit": 1,
          "offset": 0
        }
        result = await callFioApi("get_fio_domains", json);
        //console.log('Result: ', result);
        expect(result.fio_domains.length).to.equal(1);
        expect(result.fio_domains[0].fio_domain.charAt(0)).to.equal('0'); // First character of domain = 0 (1st domain in list)
      } catch (err) {
        console.log('Error', err)
        expect(err).to.equal(null)
      }
    })

    it(`Same call using SDK`, async () => {
      try {
        const result = await userA1.genericAction('getFioDomains', {
          fioPublicKey: userA1.publicKey,
          limit: 1,
          offset: 0
        })
        //console.log('Result: ', result);
        expect(result.fio_domains.length).to.equal(1);
        expect(result.fio_domains[0].fio_domain.charAt(0)).to.equal('0'); // First character of domain = 0 (1st domain in list)
      } catch (err) {
        console.log('Error', err)
        expect(err).to.equal(null)
      }
    })

    it(`API call (get_fio_domains, limit=2, offset=4). Expect 2 domains. Expect domain #5-6`, async () => {
      try {
        const json = {
          "fio_public_key": userA1.publicKey,
          "limit": 2,
          "offset": 4
        }
        result = await callFioApi("get_fio_domains", json);
        //console.log('Result: ', result);
        expect(result.fio_domains.length).to.equal(2);
        expect(result.fio_domains[0].fio_domain.charAt(0)).to.equal('4'); // First character of domain = 4 (5th domain in list)
        expect(result.fio_domains[1].fio_domain.charAt(0)).to.equal('5'); 
      } catch (err) {
        console.log('Error', err)
        expect(err).to.equal(null)
      }
    })

    it(`Same call using SDK`, async () => {
      try {
        const result = await userA1.genericAction('getFioDomains', {
          fioPublicKey: userA1.publicKey,
          limit: 2,
          offset: 4
        })
        //console.log('Result: ', result);
        expect(result.fio_domains.length).to.equal(2);
        expect(result.fio_domains[0].fio_domain.charAt(0)).to.equal('4'); // First character of domain = 4 (5th domain in list)
        expect(result.fio_domains[1].fio_domain.charAt(0)).to.equal('5'); 
      } catch (err) {
        console.log('Error', err)
        expect(err).to.equal(null)
      }
    })

    it(`API call (get_fio_domains, limit=10, offset=15). Expect 5 domains. Expect domain #16-20`, async () => {
      try {
        const json = {
          "fio_public_key": userA1.publicKey,
          "limit": 10,
          "offset": 15
        }
        result = await callFioApi("get_fio_domains", json);
        //console.log('Result: ', result);
        expect(result.fio_domains.length).to.equal(5);
        expect(result.fio_domains[0].fio_domain.charAt(0)).to.equal('1'); 
        expect(result.fio_domains[0].fio_domain.charAt(1)).to.equal('5'); // 15         
        expect(result.fio_domains[4].fio_domain.charAt(0)).to.equal('1'); 
        expect(result.fio_domains[4].fio_domain.charAt(1)).to.equal('9'); // 19
      } catch (err) {
        console.log('Error', err)
        expect(err).to.equal(null)
      }
    })

    it(`Same call using SDK`, async () => {
      try {
        const result = await userA1.genericAction('getFioDomains', {
          fioPublicKey: userA1.publicKey,
          limit: 10,
          offset: 15
        })
        //console.log('Result: ', result);
        expect(result.fio_domains.length).to.equal(5);
        expect(result.fio_domains[0].fio_domain.charAt(0)).to.equal('1'); 
        expect(result.fio_domains[0].fio_domain.charAt(1)).to.equal('5'); // 15         
        expect(result.fio_domains[4].fio_domain.charAt(0)).to.equal('1'); 
        expect(result.fio_domains[4].fio_domain.charAt(1)).to.equal('9'); // 19
      } catch (err) {
        console.log('Error', err)
        expect(err).to.equal(null)
      }
    })

    it(`Negative offset. Call (get_fio_domains, limit=1, offset=-1). Expect error type 400: ${config.error.invalidOffset}`, async () => {
      try {
        const json = {
          "fio_public_key": userA1.publicKey,
          "limit": 1,
          "offset": -1
        }
        result = await callFioApi("get_fio_domains", json);
        expect(result.status).to.equal(null);
      } catch (err) {
        //console.log('Error', err);
        expect(err.error.fields[0].error).to.equal(config.error.invalidOffset);
        expect(err.statusCode).to.equal(400);
      }
    })

    it(`Same call using SDK`, async () => {
      try {
        const result = await userA1.genericAction('getFioDomains', {
          fioPublicKey: userA1.publicKey,
          limit: 1,
          offset: -1
        })
        console.log('Result: ', result);
        expect(result.status).to.equal(null);
      } catch (err) {
        //console.log('Error', err.json);
        expect(err.json.fields[0].error).to.equal(config.error.invalidOffset);
        expect(err.errorCode).to.equal(400);
      }
    })
   
    it(`Negative limit. Call (get_fio_domains, limit=-5, offset=5). Expect error type 400: ${config.error.invalidLimit}`, async () => {
      try {
        const json = {
          "fio_public_key": userA1.publicKey,
          "limit": -5,
          "offset": 5
        }
        result = await callFioApi("get_fio_domains", json);
        expect(result.status).to.equal(null);
      } catch (err) {
        //console.log('Error', err.error);
        expect(err.error.fields[0].error).to.equal(config.error.invalidLimit);
        expect(err.statusCode).to.equal(400);
      }
    })

    it(`Same call using SDK`, async () => {
      try {
        const result = await userA1.genericAction('getFioDomains', {
          fioPublicKey: userA1.publicKey,
          limit: -5,
          offset: 5
        })
        //console.log('Result: ', result);
        expect(result.status).to.equal(null);
      } catch (err) {
        //console.log('Error', err.json);
        expect(err.json.fields[0].error).to.equal(config.error.invalidLimit);
        expect(err.errorCode).to.equal(400);
      }
    })

    it(`API Send string to limit/offset. Expect error type 500: ${config.error.parseError}`, async () => {
      try {
        const json = {
          "fio_public_key": userA1.publicKey,
          "limit": "string",
          "offset": "string2"
        }
        result = await callFioApi("get_fio_domains", json);
        expect(result.status).to.equal(null);
      } catch (err) {
        //console.log('Error', err.error.error);
        expect(err.error.error.what).to.equal(config.error.parseError);
        expect(err.statusCode).to.equal(500);
      }
    })

    it(`Same call using SDK`, async () => {
      try {
        const result = await userA1.genericAction('getFioDomains', {
          fioPublicKey: userA1.publicKey,
          limit: "string",
          offset: "string"
        })
        //console.log('Result: ', result);
        expect(result.status).to.equal(null);
      } catch (err) {
        //console.log('Error', err.json.error);
        expect(err.json.error.what).to.equal(config.error.parseError);
        expect(err.errorCode).to.equal(500);
      }
    })

    it(`Invalid pub key. Expect error type 400: ${config.error.invalidKey}`, async () => {
      try {
        const json = {
          "fio_public_key": 'FIOXXXLGcmXLCw87pqNMFurd23SqqEDbCUirr7vwuwuzfaySxQ9w6',
          "limit": 5,
          "offset": 5
        }
        result = await callFioApi("get_fio_domains", json);
        expect(result.status).to.equal(null);
      } catch (err) {
        //console.log('Error', err.error);
        expect(err.error.fields[0].error).to.equal(config.error.invalidKey);
        expect(err.statusCode).to.equal(400);
      }
    })

    it(`Use floats in limit/offset. Expect valid return with zero results.`, async () => {
      try {
        const json = {
          "fio_public_key": userA1.publicKey,
          "limit": 123.456,
          "offset": 345.678
        }
        result = await callFioApi("get_fio_domains", json);
        //console.log('Result: ', result)
        expect(result.fio_domains.length).to.equal(0)
      } catch (err) {
        console.log('Error', err);
        expect(err).to.equal(null)
      }
    })

    it(`No pub key. Expect error type 400: ${config.error.invalidKey}`, async () => {
      try {
        const json = {
          "limit": 1,
          "offset": 1
        }
        result = await callFioApi("get_fio_domains", json);
        expect(result.status).to.equal(null);
      } catch (err) {
        //console.log('Error', err.error);
        expect(err.error.fields[0].error).to.equal(config.error.invalidKey);
        expect(err.statusCode).to.equal(400);
      }
    })

})

describe(`B. get_fio_addresses paging: Register multiple addresses and page through using get_fio_addresses`, () => {
  let userB1, addressCount = 20

  it('Create userB1', async () => {
      let keys = await createKeypair();
      userB1 = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson)
      //console.log('userB1 pub key: ', userB1.publicKey)
  })

  it('Transfer 5,000 FIO to userB1', async () => {
    try {
      const result = await faucet.genericAction('transferTokens', {
        payeeFioPublicKey: userB1.publicKey,
        amount: 5000000000000,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        walletFioAddress: ''
      })
      //console.log('Result: ', result)
      expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected')
    } catch (err) {
      //console.log('Error: ', err);
      expect(err).to.equal(null);
    } 
  })

  it(`Call (get_fio_addresses, no limit param, no offset param). Expect error type 404: ${config.error.noFioAddresses}`, async () => {
    try {
      const json = {
        "fio_public_key": userB1.publicKey
      }
      result = await callFioApi("get_fio_addresses", json);
      //console.log('Result: ', result);
      expect(result.fio_domains.length).to.equal(0)
    } catch (err) {
      //console.log('Error', err.error.message)
      expect(err.error.message).to.equal(config.error.noFioAddresses)
      expect(err.statusCode).to.equal(404);
    }
  })

  it(`Same call using SDK`, async () => {
    try {
      const result = await userB1.genericAction('getFioAddresses', {
        fioPublicKey: userB1.publicKey
      })
      console.log('Result: ', result);
      //expect(result.fio_domains.length).to.equal(0)
    } catch (err) {
      //console.log('Error', err)
      expect(err.json.message).to.equal(config.error.noFioAddresses);
      expect(err.errorCode).to.equal(404);
    }
  })

  it(`Register domain for userB1`, async () => {
    try {
      userB1.domain = generateFioDomain(8);
      const result = await userB1.genericAction('registerFioDomain', { 
        fioDomain: userB1.domain, 
        maxFee: config.api.register_fio_domain.fee,
        technologyProviderId: ''
      })   
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`Register ${addressCount} addresses for userB1`, async () => {
    for (i = 0; i < addressCount; i++) {
      try {
        newAddress = i + generateFioAddress(userB1.domain, 5)
        const result = await userB1.genericAction('registerFioAddress', { 
          fioAddress: newAddress, 
          maxFee: config.api.register_fio_address.fee,
          walletFioAddress: ''
        })   
        //console.log('Result: ', result)
        expect(result.status).to.equal('OK')
      } catch (err) {
        console.log('Error: ', err.json)
      }
    }
  })

  it(`Call (get_fio_addresses, no limit param, no offset param). Expect ${addressCount} results`, async () => {
    try {
      const json = {
        "fio_public_key": userB1.publicKey
      }
      result = await callFioApi("get_fio_addresses", json);
      //console.log('Result: ', result);
      expect(result.fio_addresses.length).to.equal(addressCount)
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`Call (get_fio_addresses, limit=0, offset=0). Expect ${addressCount} results.`, async () => {
    try {
      const json = {
        "fio_public_key": userB1.publicKey,
        "limit": 0,
        "offset": 0
      }
      result = await callFioApi("get_fio_addresses", json);
      //console.log('Result: ', result);
      expect(result.fio_addresses.length).to.equal(addressCount)
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`Same call using SDK`, async () => {
    try {
      const result = await userB1.genericAction('getFioAddresses', {
        fioPublicKey: userB1.publicKey,
        limit: 0,
        offset: 0
      })
      //console.log('Result: ', result);
      expect(result.fio_addresses.length).to.equal(addressCount)
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`Call (get_fio_addresses, limit=1, offset=0). Expect 1 address. Expect address #1`, async () => {
    try {
      const json = {
        "fio_public_key": userB1.publicKey,
        "limit": 1,
        "offset": 0
      }
      result = await callFioApi("get_fio_addresses", json);
      //console.log('Result: ', result);
      expect(result.fio_addresses.length).to.equal(1);
      expect(result.fio_addresses[0].fio_address.charAt(0)).to.equal('0'); // First character of address = 0 (1st address in list)
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`Same call using SDK`, async () => {
    try {
      const result = await userB1.genericAction('getFioAddresses', {
        fioPublicKey: userB1.publicKey,
        limit: 1,
        offset: 0
      })
      //console.log('Result: ', result);
      expect(result.fio_addresses.length).to.equal(1);
      expect(result.fio_addresses[0].fio_address.charAt(0)).to.equal('0'); 
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`Call (get_fio_addresses, limit=2, offset=4). Expect 2 address. Expect address #5-6`, async () => {
    try {
      const json = {
        "fio_public_key": userB1.publicKey,
        "limit": 2,
        "offset": 4
      }
      result = await callFioApi("get_fio_addresses", json);
      //console.log('Result: ', result);
      expect(result.fio_addresses.length).to.equal(2);
      expect(result.fio_addresses[0].fio_address.charAt(0)).to.equal('4'); // First character of address = 4 (5th address in list)
      expect(result.fio_addresses[1].fio_address.charAt(0)).to.equal('5'); 
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`Call (get_fio_addresses, limit=10, offset=15). Expect 5 addresses. Expect address #16-20`, async () => {
    try {
      const json = {
        "fio_public_key": userB1.publicKey,
        "limit": 10,
        "offset": 15
      }
      result = await callFioApi("get_fio_addresses", json);
      //console.log('Result: ', result);
      expect(result.fio_addresses.length).to.equal(5);
      expect(result.fio_addresses[0].fio_address.charAt(0)).to.equal('1'); 
      expect(result.fio_addresses[0].fio_address.charAt(1)).to.equal('5'); // 15         
      expect(result.fio_addresses[4].fio_address.charAt(0)).to.equal('1'); 
      expect(result.fio_addresses[4].fio_address.charAt(1)).to.equal('9'); // 19
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`Same call using SDK`, async () => {
    try {
      const result = await userB1.genericAction('getFioAddresses', {
        fioPublicKey: userB1.publicKey,
        limit: 10,
        offset: 15
      })
      //console.log('Result: ', result);
      expect(result.fio_addresses.length).to.equal(5);
      expect(result.fio_addresses[0].fio_address.charAt(0)).to.equal('1'); 
      expect(result.fio_addresses[0].fio_address.charAt(1)).to.equal('5'); // 15         
      expect(result.fio_addresses[4].fio_address.charAt(0)).to.equal('1'); 
      expect(result.fio_addresses[4].fio_address.charAt(1)).to.equal('9'); // 19
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`Negative offset. Call (get_fio_addresses, limit=1, offset=-1). Expect error type 400: ${config.error.invalidOffset}`, async () => {
    try {
      const json = {
        "fio_public_key": userB1.publicKey,
        "limit": 1,
        "offset": -1
      }
      result = await callFioApi("get_fio_addresses", json);
      expect(result.status).to.equal(null);
    } catch (err) {
      //console.log('Error', err.error);
      expect(err.error.fields[0].error).to.equal(config.error.invalidOffset);
      expect(err.statusCode).to.equal(400);
    }
  })

  it(`Same call using SDK`, async () => {
    try {
      const result = await userB1.genericAction('getFioAddresses', {
        fioPublicKey: userB1.publicKey,
        limit: 1,
        offset: -1
      })
      console.log('Result: ', result);
      expect(result.status).to.equal(null);
    } catch (err) {
      //console.log('Error', err.json);
      expect(err.json.fields[0].error).to.equal(config.error.invalidOffset);
      expect(err.errorCode).to.equal(400);
    }
  })
 
  it(`Negative limit. Call (get_fio_addresses, limit=-5, offset=5). Expect error type 400: ${config.error.invalidLimit}`, async () => {
    try {
      const json = {
        "fio_public_key": userB1.publicKey,
        "limit": -5,
        "offset": 5
      }
      result = await callFioApi("get_fio_addresses", json);
      expect(result.status).to.equal(null);
    } catch (err) {
      //console.log('Error', err.error);
      expect(err.error.fields[0].error).to.equal(config.error.invalidLimit);
      expect(err.statusCode).to.equal(400);
    }
  })

  it(`Same call using SDK`, async () => {
    try {
      const result = await userB1.genericAction('getFioAddresses', {
        fioPublicKey: userB1.publicKey,
        limit: -5,
        offset: 5
      })
      //console.log('Result: ', result);
      expect(result.status).to.equal(null);
    } catch (err) {
      //console.log('Error', err.json);
      expect(err.json.fields[0].error).to.equal(config.error.invalidLimit);
      expect(err.errorCode).to.equal(400);
    }
  })

  it(`Send string to limit/offset. Expect error type 500: ${config.error.parseError}`, async () => {
    try {
      const json = {
        "fio_public_key": userB1.publicKey,
        "limit": "string",
        "offset": "string2"
      }
      result = await callFioApi("get_fio_addresses", json);
      expect(result.status).to.equal(null);
    } catch (err) {
      //console.log('Error', err.error.error);
      expect(err.error.error.what).to.equal(config.error.parseError);
      expect(err.statusCode).to.equal(500);
    }
  })

  it(`Same call using SDK`, async () => {
    try {
      const result = await userB1.genericAction('getFioAddresses', {
        fioPublicKey: userB1.publicKey,
        limit: "string",
        offset: "string"
      })
      //console.log('Result: ', result);
      expect(result.status).to.equal(null);
    } catch (err) {
      //console.log('Error', err.json.error);
      expect(err.json.error.what).to.equal(config.error.parseError);
      expect(err.errorCode).to.equal(500);
    }
  })

  it(`Invalid pub key. Expect error type 400: ${config.error.invalidKey}`, async () => {
    try {
      const json = {
        "fio_public_key": 'FIOXXXLGcmXLCw87pqNMFurd23SqqEDbCUirr7vwuwuzfaySxQ9w6',
        "limit": 5,
        "offset": 5
      }
      result = await callFioApi("get_fio_addresses", json);
      expect(result.status).to.equal(null);
    } catch (err) {
      //console.log('Error', err.error);
      expect(err.error.fields[0].error).to.equal(config.error.invalidKey);
      expect(err.statusCode).to.equal(400);
    }
  })

  it(`Use floats in limit/offset. Expect valid return with zero results.`, async () => {
    try {
      const json = {
        "fio_public_key": userB1.publicKey,
        "limit": 123.456,
        "offset": 345.678
      }
      result = await callFioApi("get_fio_addresses", json);
      //console.log('Result: ', result)
      expect(result.fio_addresses.length).to.equal(0)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null)
    }
  })

  it(`No pub key. Expect error type 400: ${config.error.invalidKey}`, async () => {
    try {
      const json = {
        "limit": 1,
        "offset": 1
      }
      result = await callFioApi("get_fio_addresses", json);
      expect(result.status).to.equal(null);
    } catch (err) {
      //console.log('Error', err.error);
      expect(err.error.fields[0].error).to.equal(config.error.invalidKey);
      expect(err.statusCode).to.equal(400);
    }
  })

})


describe(`C. get_cancelled_fio_requests paging: Cancel multiple FIO requests and page through using get_cancelled_fio_requests`, () => {
  let userC1, requestID = [], requestCount = 20

  it('Create userC1', async () => {
    userC1 = await newUser(faucet);
    userC2 = await newUser(faucet);
  })

  it('Transfer 5,000 FIO to userC1', async () => {
    try {
      const result = await faucet.genericAction('transferTokens', {
        payeeFioPublicKey: userC1.publicKey,
        amount: 5000000000000,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        walletFioAddress: ''
      })
      //console.log('Result: ', result)
      expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected')
    } catch (err) {
      //console.log('Error: ', err);
      expect(err).to.equal(null);
    } 
  })

  it(`Add BTC address to userC1`, async () => {
    try {
      const result = await userC1.sdk.genericAction('addPublicAddresses', {
        fioAddress: userC1.address,
        publicAddresses: [
          {
            chain_code: 'BTC',
            token_code: 'BTC',
            public_address: 'btc:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9',
          }
        ],
        maxFee: config.api.add_pub_address.fee,
        technologyProviderId: ''
      })
      //console.log('Result:', result)
      expect(result.status).to.equal('OK') 
    } catch (err) {
      console.log('Error', err)
      //expect(err).to.equal(null)
    }      
  })

  it(`Make ${requestCount} requests for userC1`, async () => {
    for (i = 0; i < requestCount; i++) {
      try {
        const result = await userC1.sdk.genericAction('requestFunds', { 
          payerFioAddress: userC2.address, 
          payeeFioAddress: userC1.address,
          payeeTokenPublicAddress: i + 'thisispayeetokenpublicaddress',
          amount: i * 1000000000,
          chainCode: 'BTC',
          tokenCode: 'BTC',
          memo: i + ' Request Memo',
          maxFee: config.api.new_funds_request.fee,
          payerFioPublicKey: userC2.publicKey,
          technologyProviderId: '',
          hash: '',
          offLineUrl: ''
        })    
        //console.log('Result: ', result);
        requestID[i] = result.fio_request_id;
        expect(result.status).to.equal('requested');
      } catch (err) {
        console.log('Error: ', err);
        expect(err).to.equal(null);
      }
    }
  })

  it(`Call (get_cancelled_fio_requests, no limit param, no offset param). Expect error 404: ${config.error.noFioRequests}`, async () => {
    try {
      const json = {
        "fio_public_key": userC1.publicKey
      }
      result = await callFioApi("get_cancelled_fio_requests", json);
      //console.log('Result: ', result);
      expect(result.requests.length).to.equal(0)
    } catch (err) {
      //console.log('Error', err.error.message)
      expect(err.error.message).to.equal(config.error.noFioRequests);
      expect(err.statusCode).to.equal(404);
    }
  })

  it(`Call cancel_funds_request for all ${requestCount} pending requests`, async () => {
    for (i = 0; i < requestCount; i++) {
      try{
        const result = await userC1.sdk.genericAction('pushTransaction', {
          action: 'cancelfndreq',
          account: 'fio.reqobt',
          data: {
            fio_request_id: requestID[i],
            max_fee: config.api.cancel_funds_request.fee,
            tpid: '',
            actor: userC1.account
          }
        })
        //console.log('Result: ', result);
        expect(result.status).to.equal('cancelled');
      } catch (err) {
        console.log('Error', err.json);
        expect(err).to.equal(null);
      }
    }
  })

  it(`Call (get_cancelled_fio_requests, no limit param, no offset param). Expect ${requestCount} results`, async () => {
    try {
      const json = {
        "fio_public_key": userC1.publicKey
      }
      result = await callFioApi("get_cancelled_fio_requests", json);
      //console.log('Result: ', result);
      expect(result.requests.length).to.equal(requestCount)
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`Call (get_cancelled_fio_requests, limit=0, offset=0). Expect ${requestCount} results.`, async () => {
    try {
      const json = {
        "fio_public_key": userC1.publicKey,
        "limit": 0,
        "offset": 0
      }
      result = await callFioApi("get_cancelled_fio_requests", json);
      //console.log('Result: ', result);
      expect(result.requests.length).to.equal(requestCount)
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`Call (get_cancelled_fio_requests, limit=1, offset=0). Expect 1 request. Expect request #1`, async () => {
    try {
      const json = {
        "fio_public_key": userC1.publicKey,
        "limit": 1,
        "offset": 0
      }
      result = await callFioApi("get_cancelled_fio_requests", json);
      //console.log('Result: ', result);
      expect(result.requests.length).to.equal(1);
      expect(result.requests[0].fio_request_id).to.equal(requestID[0]); 
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`Call (get_cancelled_fio_requests, limit=2, offset=4). Expect 2 requests. Expect requests #5-6`, async () => {
    try {
      const json = {
        "fio_public_key": userC1.publicKey,
        "limit": 2,
        "offset": 4
      }
      result = await callFioApi("get_cancelled_fio_requests", json);
      //console.log('Result: ', result);
      expect(result.requests.length).to.equal(2);
      expect(result.requests[0].fio_request_id).to.equal(requestID[4]); 
      expect(result.requests[1].fio_request_id).to.equal(requestID[5]); 
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`Call (get_cancelled_fio_requests, limit=10, offset=15). Expect 5 requests. Expect requests #16-20`, async () => {
    try {
      const json = {
        "fio_public_key": userC1.publicKey,
        "limit": 10,
        "offset": 15
      }
      result = await callFioApi("get_cancelled_fio_requests", json);
      //console.log('Result: ', result);
      expect(result.requests.length).to.equal(5);
      expect(result.requests[0].fio_request_id).to.equal(requestID[15]); 
      expect(result.requests[4].fio_request_id).to.equal(requestID[19]); 
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`Negative offset. Call (get_cancelled_fio_requests, limit=1, offset=-1). Expect error type 400: ${config.error.invalidOffset}`, async () => {
    try {
      const json = {
        "fio_public_key": userC1.publicKey,
        "limit": 1,
        "offset": -1
      }
      result = await callFioApi("get_cancelled_fio_requests", json);
      expect(result.status).to.equal(null);
    } catch (err) {
      //console.log('Error', err.error);
      expect(err.error.fields[0].error).to.equal(config.error.invalidOffset);
      expect(err.statusCode).to.equal(400);
    }
  })
 
  it(`Negative limit. Call (get_cancelled_fio_requests, limit=-5, offset=5). Expect error type 400: ${config.error.invalidLimit}`, async () => {
    try {
      const json = {
        "fio_public_key": userC1.publicKey,
        "limit": -5,
        "offset": 5
      }
      result = await callFioApi("get_cancelled_fio_requests", json);
      expect(result.status).to.equal(null);
    } catch (err) {
      //console.log('Error', err.error);
      expect(err.error.fields[0].error).to.equal(config.error.invalidLimit);
      expect(err.statusCode).to.equal(400);
    }
  })

  it(`Send string to limit/offset. Expect error type 500: ${config.error.parseError}`, async () => {
    try {
      const json = {
        "fio_public_key": userC1.publicKey,
        "limit": "string",
        "offset": "string2"
      }
      result = await callFioApi("get_cancelled_fio_requests", json);
      expect(result.status).to.equal(null);
    } catch (err) {
      //console.log('Error', err);
      expect(err.error.error.what).to.equal(config.error.parseError);
      expect(err.statusCode).to.equal(500);
    }
  })

  it(`Invalid pub key. Expect error type 400: ${config.error.invalidKey}`, async () => {
    try {
      const json = {
        "fio_public_key": 'FIOXXXLGcmXLCw87pqNMFurd23SqqEDbCUirr7vwuwuzfaySxQ9w6',
        "limit": 5,
        "offset": 5
      }
      result = await callFioApi("get_cancelled_fio_requests", json);
      expect(result.status).to.equal(null);
    } catch (err) {
      //console.log('Error', err.error);
      expect(err.error.fields[0].error).to.equal(config.error.invalidKey);
      expect(err.statusCode).to.equal(400);
    }
  })

  it(`Use floats in limit/offset. Expect error type 404: ${config.error.noFioRequests}`, async () => {
    try {
      const json = {
        "fio_public_key": userC1.publicKey,
        "limit": 123.456,
        "offset": 345.678
      }
      result = await callFioApi("get_cancelled_fio_requests", json);
      //console.log('Result: ', result)
      expect(result.status).to.equal(null);
    } catch (err) {
      //console.log('Error', err);
      expect(err.error.message).to.equal(config.error.noFioRequests);
      expect(err.statusCode).to.equal(404);
    }
  })

  it(`No pub key. Expect error type 400: ${config.error.invalidKey}`, async () => {
    try {
      const json = {
        "limit": 1,
        "offset": 1
      }
      result = await callFioApi("get_cancelled_fio_requests", json);
      expect(result.status).to.equal(null);
    } catch (err) {
      //console.log('Error', err.error);
      expect(err.error.fields[0].error).to.equal(config.error.invalidKey);
      expect(err.statusCode).to.equal(400);
    }
  })

})
