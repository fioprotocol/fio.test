
/*
   This file is intended to test FIP-10 redesign of fee voting and fee setting.
   These tests run only on the dev net, they will not run completely on other test net
   configurations. The test will vote for fees for the top 18 BPs, then will create over 100 backup producers.
   After creating the backup producers, we wait for the schedule to update (3 minutes) then
   we vote for fees for all of the backup producers. some of these operations fail, this is ok,
   we are most concerned with loading the registered block producers, and also loading up the votes for fees.


   setup,

   you must get a copy of the csv file with the keys for dev net, this is available from Ed.
   you must set the config.ProdKeyFile to be this file. The file needs to have a header line to be processed
   properly..
 */


require('mocha')
const {expect} = require('chai')
const {readProdFile, fetchJson, newUser, existingUser, generateFioAddress,generateFioDomain,timeout } = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
config = require('../config.js');

let producersList = [], producers = [], newprods = [], sdkprods = []

before(async () => {

  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson)
  casey = new FIOSDK('5JLxoeRoMDGBbkLdXJjxuh3zHsSS7Lg6Ak9Ft8v8sSdYPkFuABF', 'FIO5oBUYbtGTxMS66pPkjC2p8pbA3zCtc8XD4dq9fMut867GRdh82', config.BASE_URL, fetchJson)

  // Create sdk objects for the orinigal localhost BPs
  producers['qbxn5zhw2ypw'] = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
  producers['hfdg2qumuvlc'] = await existingUser('hfdg2qumuvlc', '5JnhMxfnLhZeRCRvCUsaHbrvPSxaqjkQAgw4ZFodx4xXyhZbC9P', 'FIO7uTisye5w2hgrCSE1pJhBKHfqDzhvqDJJ4U3vN9mbYWzataS2b', 'dapixdev', 'bp2@dapixdev');
  producers['wttywsmdmfew'] = await existingUser('wttywsmdmfew', '5JvmPVxPxypQEKPwFZQW4Vx7EC8cDYzorVhSWZvuYVFMccfi5mU', 'FIO6oa5UV9ghWgYH9en8Cv8dFcAxnZg2i9z9gKbnHahciuKNRPyHc', 'dapixdev', 'bp3@dapixdev');


  // NOTE -- file needs to contain a header row/line ending with CR, then comma delimited data after the first line.
  // Reads in the producers from the fio.devtools keys.csv file and puts them in an array with producersList[0] = producer1@dapixdev (producer[0] is null)
  /*
   domain: prodInfo[0].split('@').pop(),
   address: prodInfo[0],
   privateKey: prodInfo[1],
   publicKey: prodInfo[2],
   account: prodInfo[3],
   fioBalance: parseInt(prodInfo[4])
   */
  producersList = await readProdFile(config.PRODKEYFILE);
})

describe('************************** fee-voting-fee-setting.js ************************** \n A. Vote fees for top prods.', () => {

  let prodA1, userA1, result,  locksdk
  let timeafteraccountcreate = 5000

  let amount = 0

  let sdktopprods = []

  //first vote for the fees for the top prods.

  it(`Vote for fees for 18 top producers`, async () => {
    try{
      process.stdout.write("           Vote for 18 prods . ")
      for (let step = 1; step < 18; step++) {
        prodA1 = producersList[step]
        console.log("iteration ", step)
        console.log("Voting fees for producer ",prodA1.address)
        //create a new sdk instance for new keys.

        locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);
        sdktopprods.push(locksdk)
        newprods.push(prodA1)

        result = await locksdk.genericAction('pushTransaction', {
          action: 'setfeemult',
          account: 'fio.fee',
          data: {
            multiplier: 1,
            max_fee: config.api.register_producer.fee
          }
        })


        amount = step * 1000


        result = await locksdk.genericAction('pushTransaction', {
          action: 'setfeevote',
          account: 'fio.fee',
          data: {
            fee_ratios: [
              {end_point: "register_fio_domain", value: amount},
              {end_point: "register_fio_address", value: amount},
              {end_point: "renew_fio_domain", value: amount},
              {end_point: "renew_fio_address", value: amount},
              {end_point: "transfer_locked_tokens", value: amount},
              {end_point: "remove_pub_address", value: amount},
              {end_point: "remove_all_pub_addresses", value: amount},
              {end_point: "transfer_tokens_pub_key", value: amount},
              {end_point: "new_funds_request", value: amount},
              {end_point: "reject_funds_request", value: amount},
              {end_point: "cancel_funds_request", value: amount},
              {end_point: "record_obt_data", value: amount},
              {end_point: "set_fio_domain_public", value: amount},
              {end_point: "register_producer", value: amount},
              {end_point: "register_proxy", value: amount},
              {end_point: "unregister_proxy", value: amount},
              {end_point: "transfer_fio_domain", value: amount},
              {end_point: "transfer_fio_address", value: amount},
              {end_point: "unregister_producer", value: amount},
              {end_point: "proxy_vote", value: amount},
              {end_point: "vote_producer", value: amount},
              {end_point: "submit_bundled_transaction", value: amount},
              {end_point: "auth_delete", value: amount},
              {end_point: "auth_link", value: amount},
              {end_point: "auth_update", value: amount},
              {end_point: "msig_propose", value: amount},
              {end_point: "msig_approve", value: amount},
              {end_point: "msig_unapprove", value: amount},
              {end_point: "msig_cancel", value: amount},
              {end_point: "msig_exec", value: amount},
              {end_point: "msig_invalidate", value: amount
            ],
            max_fee: 4000000000,
            actor: prodA1.account
          }
          })
        process.stdout.write(". ")
      }
      console.log(" ")
    } catch (err) {
      console.log("Error is ",err);
    }
  })

  //next create backup producers, we create 140, some of these fail, thats ok,
  //we need to create the users, reg as producers, then vote for the producers,
  //then we wait, allowing the producer schedule to update on the chain,
  //then we perform the voting.
  it(`Create user 1 , set as backup producer,`, async () => {
      try {
        process.stdout.write("           Create and Vote for backup prods . ")


          prodA1 = await newUser(faucet);

          await timeout(timeafteraccountcreate)
          //create a new sdk instance for new keys.
          locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

          console.log("created sdk")

          //make the new prod a prod.

          result = await prodA1.sdk.genericAction('pushTransaction', {
            action: 'regproducer',
            account: 'eosio',
            data: {
              fio_address: prodA1.address,
              fio_pub_key: prodA1.publicKey,
              url: "https://mywebsite.io/",
              location: 80,
              max_fee: config.api.register_producer.fee
            }
          })
          console.log("regproducer")

          result = await prodA1.sdk.genericAction('pushTransaction', {
            action: 'voteproducer',
            account: 'eosio',
            data: {
              "producers": [
                prodA1.address
              ],
              fio_address: prodA1.address,
              actor: prodA1.account,
              max_fee: config.api.vote_producer.fee
            }
          })

          newprods.push(prodA1)
          sdkprods.push(locksdk)

          process.stdout.write(". ")
        console.log(" ")
      } catch (err) {
        console.log('Error  : ', err)
      }
    })
  it(`Create user 2 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 3 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")
      
      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 4 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 5 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 6 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 7 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 8 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 9 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 10 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 11 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 12 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 13 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 14 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 15 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 16 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 17 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 18 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 19 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 20 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 21 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 22 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 23 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 24 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 25 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 26 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 27 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 28 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 29 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 30 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 31 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 32 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 33 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 34 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 35 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 36 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 37 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 38 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 39 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 40 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 41 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 42 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 43 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 44 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 45 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 46 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 47 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 48 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 49 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 50 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 51 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 52 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 53 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 54 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 55 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 56 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 57 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 58 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 59 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 60 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 61 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 62 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 63 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 64 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 65 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 66 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 67 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 68 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 69 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 70 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 71 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 72 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 73 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 74 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 75 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 76 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 77 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 78 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 79 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 80 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 81 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 82 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 83 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 84 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 85 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 86 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 87 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 88 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 89 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 90 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 91 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 92 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 93 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 94 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 95 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 96 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 97 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 98 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 99 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 100 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 101 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 102 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 103 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 104 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 105 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 106 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 107 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 108 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 109 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 110 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 111 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 112 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 113 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 114 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 115 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 116 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 117 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 118 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 119 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 120 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 121 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 122 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 123 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 124 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 125 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 126 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 127 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 128 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 129 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 130 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 131 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 132 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 133 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 134 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 135 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 136 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 137 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 138 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 139 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })
  it(`Create user 140 , set as backup producer,`, async () => {
    try {
      process.stdout.write("           Create and Vote for backup prods . ")


      prodA1 = await newUser(faucet);

      await timeout(timeafteraccountcreate)
      //create a new sdk instance for new keys.
      locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);

      console.log("created sdk")

      //make the new prod a prod.

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          max_fee: config.api.register_producer.fee
        }
      })
      console.log("regproducer")

      result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: prodA1.address,
          actor: prodA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })

      newprods.push(prodA1)
      sdkprods.push(locksdk)

      process.stdout.write(". ")
      console.log(" ")
    } catch (err) {
      console.log('Error  : ', err)
    }
  })

  //wait 3 minutes for BP schedule to update and such.
  it(` wait 30 `, async () => {
    await timeout(30000)
  })
  it(` wait 30 `, async () => {
    await timeout(30000)
  })
  it(` wait 30 `, async () => {
    await timeout(30000)
  })
  it(` wait 30 `, async () => {
    await timeout(30000)
  })
  it(` wait 30 `, async () => {
    await timeout(30000)
  })
  it(` wait 30 `, async () => {
    await timeout(30000)
  })

  it(` fee vote them`, async () => {

      let countvotesperformed = 0
      process.stdout.write("           Create and Vote for backup prods . ")
      for (let step = 19; step < newprods.length; step++) {

        try {

        if (step > newprods.length)
          break

        let theprod = newprods[step]
        let thesdk = sdkprods[step]
        console.log("got sdk")

        result = await theprod.sdk.genericAction('pushTransaction', {
          action: 'setfeevote',
          account: 'fio.fee',
          data: {
            fee_ratios: [
              {end_point: "register_fio_domain", value: 50000000},
              {end_point: "register_fio_address", value: 50000000},
              {end_point: "renew_fio_domain", value: 500000000},
              {end_point: "renew_fio_address", value: 500000000},
              {end_point: "transfer_locked_tokens", value: 500000000},
              {end_point: "remove_pub_address", value: 500000000},
              {end_point: "remove_all_pub_addresses", value: 500000000},
              {end_point: "transfer_tokens_pub_key", value: 500000000},
              {end_point: "new_funds_request", value: 500000000},
              {end_point: "reject_funds_request", value: 500000000},
              {end_point: "cancel_funds_request", value: 500000000},
              {end_point: "record_obt_data", value: 500000000},
              {end_point: "set_fio_domain_public", value: 500000000},
              {end_point: "register_producer", value: 500000000},
              {end_point: "register_proxy", value: 500000000},
              {end_point: "unregister_proxy", value: 500000000},
              {end_point: "transfer_fio_domain", value: 500000000},
              {end_point: "transfer_fio_address", value: 500000000},
              {end_point: "unregister_producer", value: 500000000},
              {end_point: "proxy_vote", value: 500000000},
              {end_point: "vote_producer", value: 500000000},
              {end_point: "submit_bundled_transaction", value: 500000000},
              {end_point: "auth_delete", value: 500000000},
              {end_point: "auth_link", value: 500000000},
              {end_point: "auth_update", value: 500000000},
              {end_point: "msig_propose", value: 500000000},
              {end_point: "msig_approve", value: 500000000},
              {end_point: "msig_unapprove", value: 500000000},
              {end_point: "msig_cancel", value: 500000000},
              {end_point: "msig_exec", value: 500000000},
              {end_point: "msig_invalidate", value: 500000000}
            ],
            max_fee: 4000000000,
            actor: prodA1.account
          }

        })

        console.log("setfeevote")

          result = await theprod.sdk.genericAction('pushTransaction', {
            action: 'setfeemult',
            account: 'fio.fee',
            data: {
              multiplier: 1,
              max_fee: config.api.register_producer.fee
            }
          })
          console.log("setfeemult")

        console.log("iteration ", step)
          countvotesperformed = countvotesperformed + 1
        } catch (err) {
          console.log('Error 5 users set 2 : ', err)
        }
      }

      console.log("EDEDEDED BP list size is ", newprods.length )
      console.log("EDEDEDEDEDED voted successfully for ",countvotesperformed)
  })

})