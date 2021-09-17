/**
 * This test requires manually updating xyz contract to shorten the expiration for domains and addresses
 * to 2 minutes. 
 * 
 * In fio.address.cpp:
 * 
 * For Addresses: Line 162, change:
 *   const uint32_t expiration_time = get_now_plus_one_year();
 * to
 *   const uint32_t expiration_time = now() + 120;
 * 
 * For Domains: Line 245, change:
 *   expiration_time = get_now_plus_one_year();
 * to
 *   expiration_time = now() + 120;
 * 
 * Once updated:
 * - Rebuild the contracts with the fix
 * - run expired-address-domain.js
 */

require('mocha')
const {expect} = require('chai')
const { newUser, fetchJson, timeout, generateFioAddress, generateFioDomain, callFioApi, callFioApiSigned} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
config = require('../config.js');

function mintNfts(num) {
  let nfts = [];
  if (num === 0) return nfts;
  for (let i = 1; i <= num; i++) {
    nfts.push({
      "chain_code": "ETH",
      "contract_address": "0x123456789ABCDEF",
      "token_id": `${i}`,
      "url": "",
      "hash": "",
      "metadata": ""
    });
  }
  return nfts;
}

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson)
})

describe('************************** expired-address-domain.js ************************** \n A. General testing for expired domains and addresses', () => {

  let userA1, userA2

  it(`Create users`, async () => {
    userA1 = await newUser(faucet);
    userA2 = await newUser(faucet);
  })

  it(`getFioNames for userA1 and confirm the address and domain are NOT expired`, async () => {
    try {
      curdate = new Date()
      var utcSeconds = (curdate.getTime() + curdate.getTimezoneOffset()*60*1000)/1000;  // Convert to UTC
      const result = await userA1.sdk.genericAction('getFioNames', {
          fioPublicKey: userA1.publicKey
      })
      expect(result.fio_domains[0].fio_domain).to.equal(userA1.domain);
      expect(Date.parse(result.fio_domains[0].expiration)/1000).to.be.greaterThan(utcSeconds);
      expect(result.fio_addresses[0].fio_address).to.equal(userA1.address);
      expect(Date.parse(result.fio_addresses[0].expiration)/1000).to.be.greaterThan(utcSeconds);
    } catch (err) {
        console.log('Error', err)
        expect(err).to.equal(null)
    }
  })

  it(`Check isAvailable for domain. Expect is_registered = 1`, async () => {
    try {
        const result = await userA1.sdk.genericAction('isAvailable', {
            fioName: userA1.domain,
        })
        //console.log('Result: ', result);
        expect(result.is_registered).to.equal(1);
    } catch (err) {
        console.log('Error: ', err);
        expect(err).to.equal(null);
    }
  })

  it(`Check isAvailable for address. Expect is_registered = 1`, async () => {
    try {
        const result = await userA1.sdk.genericAction('isAvailable', {
            fioName: userA1.address,
        })
        //console.log('Result: ', result);
        expect(result.is_registered).to.equal(1);
    } catch (err) {
        console.log('Error: ', err);
        expect(err).to.equal(null);
    }
  })

  it(`Wait 2 minutes for the addresses and domains to expire`, async () => {
    await timeout(125000);
  })

  it(`getFioNames for userA1 and confirm the address and domain ARE expired`, async () => {
    try {
      curdate = new Date()
      var utcSeconds = (curdate.getTime() + curdate.getTimezoneOffset()*60*1000)/1000;  // Convert to UTC
      const result = await userA1.sdk.genericAction('getFioNames', {
          fioPublicKey: userA1.publicKey
      })
      //console.log('getFioNames', result);
      expect(result.fio_domains[0].fio_domain).to.equal(userA1.domain);
      expect(Date.parse(result.fio_domains[0].expiration)/1000).to.be.lessThan(utcSeconds);
      expect(result.fio_addresses[0].fio_address).to.equal(userA1.address);
      expect(Date.parse(result.fio_addresses[0].expiration)/1000).to.be.lessThan(utcSeconds);
    } catch (err) {
        console.log('Error', err);
        expect(err).to.equal(null);
    }
  })

  it(`Check isAvailable for expired domain. Expect is_registered = 1`, async () => {
    try {
        const result = await userA1.sdk.genericAction('isAvailable', {
            fioName: userA1.domain,
        })
        //console.log('Result: ', result);
        expect(result.is_registered).to.equal(1);
    } catch (err) {
        console.log('Error: ', err);
        expect(err).to.equal(null);
    }
  })

  it(`Check isAvailable for expired (but not burned) address. Expect is_registered = 1`, async () => {
    try {
        const result = await userA1.sdk.genericAction('isAvailable', {
            fioName: userA1.address,
        })
        //console.log('Result: ', result);
        expect(result.is_registered).to.equal(1);
    } catch (err) {
        console.log('Error: ', err);
        expect(err).to.equal(null);
    }
  })

  it(`Transfer expired domain. Expect error type 400: ${config.error.fioDomainNeedsRenew}`, async () => {
    try {
      const result = await userA1.sdk.genericAction('transferFioDomain', {
        fioDomain: userA1.domain,
        newOwnerKey: userA2.publicKey,
        maxFee: config.api.transfer_fio_domain.fee,
        technologyProviderId: ''
      })
      expect(result.status).to.equal(null);
    } catch (err) {
      //console.log('Error: ', err.json);
      expect(err.json.fields[0].error).to.equal(config.error.fioDomainNeedsRenew);
      expect(err.errorCode).to.equal(400);
    }
  })

  it(`Burn userA1.address. Expect error type 400: ${config.error.fioDomainNeedsRenew} (BD-2475)`, async () => {
    try {
        const result = await callFioApiSigned('push_transaction', {
            action: 'burnaddress',
            account: 'fio.address',
            actor: userA1.account,
            privKey: userA1.privateKey,
            data: {
                "fio_address": userA1.address,
                "max_fee": config.maxFee,
                "tpid": '',
                "actor": userA1.account
            }
        })
        console.log('Result: ', result);
        expect(result.fields[0].error).to.equal(config.error.fioDomainNeedsRenew);
        //expect(err.errorCode).to.equal(400);
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  })

})

describe('B. Confirm Addresses with NFTS are added to nftburnq when burning expired domains', () => {

  let user1, user2, nftburnqCount;
  const addressBlockCount = 2;
  const nftBlockCount = 3;  // Must be divisible by 3

  it(`Create users`, async () => {
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
  })

  it(`Get nftburnq table number of rows (in case there are existing entries)`, async () => {
    try {
      const json = {
        json: true,
        code: 'fio.address',
        scope: 'fio.address',
        table: 'nftburnq',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      result = await callFioApi("get_table_rows", json);
      //console.log('result: ', result);
      nftburnqCount = result.rows.length;
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Create domain with ${addressBlockCount} addresses and ${nftBlockCount} NFTs`, async () => {
    let address = [], addedNfts;
    try {

        user1 = await newUser(faucet);

        console.log('Adding Addresses with NFTs');
        for (j = 0; j < addressBlockCount; j++) {
          address[j] = generateFioAddress(user1.domain, 10)

          const addressResult = await user1.sdk.genericAction('registerFioAddress', {
            fioAddress: address[j],
            maxFee: config.maxFee,
            technologyProviderId: ''
          })
          console.log('addressResult: ', addressResult)
          expect(addressResult.status).to.equal('OK')

          for (k = 0; k < nftBlockCount / 3; k++) {
            addedNfts = mintNfts(3);
            const addnftResult = await user1.sdk.genericAction('pushTransaction', {
              action: 'addnft',
              account: 'fio.address',
              data: {
                fio_address: address[j],
                nfts: addedNfts,
                max_fee: config.maxFee,
                actor: user1.account,
                tpid: ""
              }
            })
            console.log(`addnftResult: `, addnftResult)
            expect(addnftResult.status).to.equal('OK')
          } // k - nfts 
        }  // j - addresses

    } catch (err) {
      console.log(err.json)
      expect(err).to.equal(null);
    }
  })

  it.skip(`TODO: Expire domain`, async () => {

  })

  it(`Call burnexpired until empty`, async () => {
    let empty = false;
    try {
      while (!empty) {
        const result = await user1.sdk.genericAction('pushTransaction', {
          action: 'burnexpired',
          account: 'fio.address',
          data: {
            actor: user1.account,
          }
        })
        //console.log(`Result: `, result)
        expect(result.status).to.equal('OK')
        await timeout(1000); // To avoid duplicate transaction
      }
    } catch (err) {
      console.log(err);
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].error).to.equal('No work.');
    }
  })

  it(`Get burnnftq table. Confirm additional entries = ${addressBlockCount}`, async () => {
    try {
      const json = {
        json: true,
        code: 'fio.address',
        scope: 'fio.address',
        table: 'nftburnq',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      const burnnftq = await callFioApi("get_table_rows", json);
      console.log('burnnftq: ', burnnftq);
      expect(burnnftq.rows.length).to.equal(nftburnqCount + addressBlockCount);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Call burnnfts until burnnftq is empty`, async () => {
    let empty = false;
    try {
      while (!empty) {
        const result = await user1.sdk.genericAction('pushTransaction', {
          action: 'burnnfts',
          account: 'fio.address',
          data: {
            actor: user1.account,
          }
        })
        //console.log(`Result: `, result)
        expect(result.status).to.equal('OK')
        await timeout(1000); // To avoid duplicate transaction
      }
    } catch (err) {
      //console.log(err.json);
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].error).to.equal('Nothing to burn');
    }
  })

  it(`Get burnnftq table. Confirm it is empty.`, async () => {
    try {
      const json = {
        json: true,
        code: 'fio.address',
        scope: 'fio.address',
        table: 'nftburnq',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      result = await callFioApi("get_table_rows", json);
      //console.log('result: ', result);
      expect(result.rows.length).to.equal(0);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

})

describe('B. Burn large number of expired domains with gaps between expired and non-expired', () => {

  let nftburnqCount;
  let user = [];
  const domainBlockCount = 2;
  const addressBlockCount = 2;
  const nftBlockCount = 3;  // Must be divisible by 3

  it(`Get nftburnq table number of rows (in case there are existing entries)`, async () => {
    try {
      const json = {
        json: true,
        code: 'fio.address',
        scope: 'fio.address',
        table: 'nftburnq',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      result = await callFioApi("get_table_rows", json);
      //console.log('result: ', result);
      nftburnqCount = result.rows.length;
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`#1 - Create domain block: ${domainBlockCount} domains, ${addressBlockCount} addresses, ${nftBlockCount} NFTs`, async () => {
    let domain, address = [], addedNfts;
    try {

      for (i = 0; i < domainBlockCount; i++) {
        console.log('Adding Domain');
        user[i] = await newUser(faucet);

        console.log('Adding Addresses with NFTs');
        for (j = 0; j < addressBlockCount; j++) {
          address[j] = generateFioAddress(user[i].domain, 10)

          const addressResult = await user[i].sdk.genericAction('registerFioAddress', {
            fioAddress: address[j],
            maxFee: config.maxFee,
            technologyProviderId: ''
          })
          console.log('addressResult: ', addressResult)
          expect(addressResult.status).to.equal('OK')

          for (k = 0; k < nftBlockCount / 3; k++) {
            addedNfts = mintNfts(3);
            const addnftResult = await user[i].sdk.genericAction('pushTransaction', {
              action: 'addnft',
              account: 'fio.address',
              data: {
                fio_address: address[j],
                nfts: addedNfts,
                max_fee: config.maxFee,
                actor: user[i].account,
                tpid: ""
              }
            })
            console.log(`addnftResult: `, addnftResult)
            expect(addnftResult.status).to.equal('OK')
          } // k - nfts 
        }  // j - addresses
      } // i - domains

    } catch (err) {
      console.log(err.json)
      expect(err).to.equal(null);
    }
  })

  it(`#2 - Create EXPIRED domains block: ${domainBlockCount} domains, ${addressBlockCount} addresses, ${nftBlockCount} NFTs`, async () => {
    let domain, address = [], addedNfts;
    try {

      for (i = domainBlockCount; i < domainBlockCount * 2; i++) {
        console.log('Adding Domain');
        user[i] = await newUser(faucet);

        console.log('Adding Addresses with NFTs');
        for (j = 0; j < addressBlockCount; j++) {
          address[j] = generateFioAddress(user[i].domain, 10)

          const addressResult = await user[i].sdk.genericAction('registerFioAddress', {
            fioAddress: address[j],
            maxFee: config.maxFee,
            technologyProviderId: ''
          })
          console.log('addressResult: ', addressResult)
          expect(addressResult.status).to.equal('OK')

          for (k = 0; k < nftBlockCount / 3; k++) {
            addedNfts = mintNfts(3);
            const addnftResult = await user[i].sdk.genericAction('pushTransaction', {
              action: 'addnft',
              account: 'fio.address',
              data: {
                fio_address: address[j],
                nfts: addedNfts,
                max_fee: config.maxFee,
                actor: user[i].account,
                tpid: ""
              }
            })
            console.log(`addnftResult: `, addnftResult)
            expect(addnftResult.status).to.equal('OK')
          } // k - nfts 
        }  // j - addresses
      } // i - domains

    } catch (err) {
      console.log(err.json)
      expect(err).to.equal(null);
    }
  })

  it.skip(`(TODO: update to expire the domains)`, async () => {
    try {
      for (i = domainBlockCount; i < domainBlockCount * 2; i++) {
        const result = await callFioApiSigned('push_transaction', {
          action: 'burndomain',
          account: 'fio.address',
          actor: user[i].account,
          privKey: user[i].privateKey,
          data: {
            "fio_address": user[i].domain,
            "max_fee": config.maxFee,
            "tpid": '',
            "actor": user[i].account
          }
        })
        //console.log('Result: ', JSON.parse(result.processed.action_traces[0].receipt.response));
        expect(JSON.parse(result.processed.action_traces[0].receipt.response).status).to.equal('OK');
        expect(JSON.parse(result.processed.action_traces[0].receipt.response).fee_collected).to.equal(0);
      }
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  })

  it(`#3 - Create domains block: ${domainBlockCount} domains, ${addressBlockCount} addresses, ${nftBlockCount} NFTs`, async () => {
    let domain, address = [], addedNfts;
    try {

      for (i = domainBlockCount * 2; i < domainBlockCount * 3; i++) {
        console.log('Adding Domain');
        user[i] = await newUser(faucet);

        console.log('Adding Addresses with NFTs');
        for (j = 0; j < addressBlockCount; j++) {
          address[j] = generateFioAddress(user[i].domain, 10)

          const addressResult = await user[i].sdk.genericAction('registerFioAddress', {
            fioAddress: address[j],
            maxFee: config.maxFee,
            technologyProviderId: ''
          })
          console.log('addressResult: ', addressResult)
          expect(addressResult.status).to.equal('OK')

          for (k = 0; k < nftBlockCount / 3; k++) {
            addedNfts = mintNfts(3);
            const addnftResult = await user[i].sdk.genericAction('pushTransaction', {
              action: 'addnft',
              account: 'fio.address',
              data: {
                fio_address: address[j],
                nfts: addedNfts,
                max_fee: config.maxFee,
                actor: user[i].account,
                tpid: ""
              }
            })
            console.log(`addnftResult: `, addnftResult)
            expect(addnftResult.status).to.equal('OK')
          } // k - nfts 
        }  // j - addresses
      } // i - domains

    } catch (err) {
      console.log(err.json)
      expect(err).to.equal(null);
    }
  })

  it(`#4 - Create EXPIRED domains block: ${domainBlockCount} domains, ${addressBlockCount} addresses, ${nftBlockCount} NFTs`, async () => {
    let domain, address = [], addedNfts;
    try {

      for (i = domainBlockCount * 3; i < domainBlockCount * 4; i++) {
        console.log('Adding Domain');
        user[i] = await newUser(faucet);

        console.log('Adding Addresses with NFTs');
        for (j = 0; j < addressBlockCount; j++) {
          address[j] = generateFioAddress(user[i].domain, 10)

          const addressResult = await user[i].sdk.genericAction('registerFioAddress', {
            fioAddress: address[j],
            maxFee: config.maxFee,
            technologyProviderId: ''
          })
          console.log('addressResult: ', addressResult)
          expect(addressResult.status).to.equal('OK')

          for (k = 0; k < nftBlockCount / 3; k++) {
            addedNfts = mintNfts(3);
            const addnftResult = await user[i].sdk.genericAction('pushTransaction', {
              action: 'addnft',
              account: 'fio.address',
              data: {
                fio_address: address[j],
                nfts: addedNfts,
                max_fee: config.maxFee,
                actor: user[i].account,
                tpid: ""
              }
            })
            console.log(`addnftResult: `, addnftResult)
            expect(addnftResult.status).to.equal('OK')
          } // k - nfts 
        }  // j - addresses
      } // i - domains

    } catch (err) {
      console.log(err.json)
      expect(err).to.equal(null);
    }
  })

  it.skip(`(TODO: update to expire the domains)`, async () => {
    try {
      for (i = domainBlockCount * 3; i < domainBlockCount * 4; i++) {
        const result = await callFioApiSigned('push_transaction', {
          action: 'burndomain',
          account: 'fio.address',
          actor: user[i].account,
          privKey: user[i].privateKey,
          data: {
            "fio_address": user[i].domain,
            "max_fee": config.maxFee,
            "tpid": '',
            "actor": user[i].account
          }
        })
        //console.log('Result: ', JSON.parse(result.processed.action_traces[0].receipt.response));
        expect(JSON.parse(result.processed.action_traces[0].receipt.response).status).to.equal('OK');
        expect(JSON.parse(result.processed.action_traces[0].receipt.response).fee_collected).to.equal(0);
      }
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  })




  it(`Call burnexpired until empty`, async () => {
    let empty = false;
    try {
      while (!empty) {
        const result = await user[0].sdk.genericAction('pushTransaction', {
          action: 'burnexpired',
          account: 'fio.address',
          data: {
            actor: user[0].account,
          }
        })
        //console.log(`Result: `, result)
        expect(result.status).to.equal('OK')
        await timeout(1000); // To avoid duplicate transaction
      }
    } catch (err) {
      //console.log(err.json);
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].error).to.equal('No work.');
    }
  })

  it(`Get burnnftq table. Confirm additional entries = ${domainBlockCount} * ${addressBlockCount} * 2 = ${domainBlockCount * addressBlockCount * 2}`, async () => {
    try {
      const json = {
        json: true,
        code: 'fio.address',
        scope: 'fio.address',
        table: 'nftburnq',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      const burnnftq = await callFioApi("get_table_rows", json);
      console.log('burnnftq: ', burnnftq);
      expect(burnnftq.rows.length).to.equal(nftburnqCount + (domainBlockCount * addressBlockCount * 2));
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Call burnnfts until burnnftq is empty`, async () => {
    let empty = false;
    try {
      while (!empty) {
        const result = await user[0].sdk.genericAction('pushTransaction', {
          action: 'burnnfts',
          account: 'fio.address',
          data: {
            actor: user[0].account,
          }
        })
        //console.log(`Result: `, result)
        expect(result.status).to.equal('OK')
        await timeout(1000); // To avoid duplicate transaction
      }
    } catch (err) {
      //console.log(err.json);
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].error).to.equal('Nothing to burn');
    }
  })

  it(`Get burnnftq table. Confirm it is empty.`, async () => {
    try {
      const json = {
        json: true,
        code: 'fio.address',
        scope: 'fio.address',
        table: 'nftburnq',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      result = await callFioApi("get_table_rows", json);
      //console.log('result: ', result);
      expect(result.rows.length).to.equal(0);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

})