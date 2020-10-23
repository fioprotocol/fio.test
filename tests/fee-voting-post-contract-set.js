
/*
   This file is intended to test FIP-10 redesign of fee voting and fee setting. These tests will need some
   refinement once the FIP-10 comes back into focus...but use these tests once the FIP-10 becomes a focus
 */


require('mocha')
const {expect} = require('chai')
const {readProdFile, fetchJson, newUser, existingUser, generateFioAddress,generateFioDomain,timeout } = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/FIOSDK')
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
 // producersList = await readProdFile(config.PRODKEYFILE);
})

describe('************************** fee-voting-fee-setting.js ************************** \n A. Vote fees for top prods.', () => {

  let prodA1, userA1, result,  locksdk
  let timeafteraccountcreate = 5000

  let sdktopprods = []

  it(`Create user 1 of 21, set as backup producer,`, async () => {
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
  it(`Create user 2 of 21, set as backup producer,`, async () => {
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


  it(` wait 30 `, async () => {
    await timeout(30000)
  })


  it(` fee vote them`, async () => {

      process.stdout.write("           Create and Vote for backup prods . ")
      for (let step = 0; step < newprods.length; step++) {

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

          result = await theprod.sdk.genericAction('pushTransaction', {
            action: 'setfeevote',
            account: 'fio.fee',
            data: {
              fee_ratios: [
                {end_point: "boogy1", value: 500000000},
                {end_point: "boogy2", value: 500000000},
                {end_point: "boogy3", value: 500000000},
                {end_point: "boogy4", value: 500000000},
                {end_point: "boogy5", value: 500000000},
                {end_point: "boogy6", value: 500000000},
                {end_point: "boogy7", value: 500000000},
                {end_point: "boogy8", value: 500000000},
                {end_point: "boogy9", value: 500000000},
                {end_point: "boogy10", value: 500000000},
                {end_point: "boogy11", value: 500000000},
                {end_point: "boogy12", value: 500000000},
                {end_point: "boogy13", value: 500000000},
                {end_point: "boogy14", value: 500000000},
                {end_point: "boogy15", value: 500000000},
                {end_point: "boogy16", value: 500000000},
                {end_point: "boogy17", value: 500000000},
                {end_point: "boogy18", value: 500000000},
                {end_point: "boogy19", value: 500000000},
                {end_point: "boogy20", value: 500000000},
                {end_point: "boogy21", value: 500000000},
                {end_point: "boogy22", value: 500000000},
                {end_point: "boogy23", value: 500000000},
                {end_point: "boogy24", value: 500000000},
                {end_point: "boogy25", value: 500000000},
                {end_point: "boogy26", value: 500000000},
                {end_point: "boogy27", value: 500000000},
                {end_point: "boogy28", value: 500000000},
                {end_point: "boogy29", value: 500000000},
                {end_point: "boogy30", value: 500000000},
                {end_point: "boogy31", value: 500000000},
                {end_point: "boogy33", value: 500000000},
                {end_point: "boogy34", value: 500000000},
                {end_point: "boogy32", value: 500000000},
                {end_point: "boogy35", value: 500000000},
                {end_point: "boogy36", value: 500000000},
                {end_point: "boogy37", value: 500000000},
                {end_point: "boogy38", value: 500000000},
                {end_point: "boogy39", value: 500000000}
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
        process.stdout.write(". ")
        } catch (err) {
          console.log('Error 5 users set 2 : ', err)
        }
      }

      console.log("EDEDEDED BP list size is ", newprods.length )
  })



/*
  it(`Try to vote for fee multiplier for a 43rd BP, fails to vote for fees`, async () => {
    try {
        userA1 = await newUser(faucet);

        prodA1 = await newUser(faucet);
        prodA1.address2 = await generateFioAddress(prodA1.domain, 5)
        //create a new sdk instance for new keys.
        locksdk = new FIOSDK(prodA1.privateKey, prodA1.publicKey, config.BASE_URL, fetchJson);
        newprods.push(prodA1)
        sdkprods.push(locksdk)


        //give the new instance money.
        let result = await userA1.sdk.genericAction('transferTokens', {
          payeeFioPublicKey: prodA1.publicKey,
          amount: 100000000000,
          maxFee: 400000000000,
          technologyProviderId: '',
        })

        //create an address for the new prod.
        result = await prodA1.sdk.genericAction('registerFioAddress', {
          fioAddress: prodA1.address2,
          maxFee: config.api.register_fio_address.fee,
          walletFioAddress: ''
        })

        //make the new prod a prod.

        result = await prodA1.sdk.genericAction('pushTransaction', {
          action: 'regproducer',
          account: 'eosio',
          data: {
            fio_address: prodA1.address2,
            fio_pub_key: prodA1.publicKey,
            url: "https://mywebsite.io/",
            location: 80,
            max_fee: config.api.register_producer.fee
          }
        })

        result = await prodA1.sdk.genericAction('pushTransaction', {
          action: 'voteproducer',
          account: 'eosio',
          data: {
            "producers": [
              prodA1.address2
            ],
            fio_address: prodA1.address2,
            actor: prodA1.account,
            max_fee: config.api.vote_producer.fee
          }
        })


        result = await prodA1.sdk.genericAction('pushTransaction', {
          action: 'setfeemult',
          account: 'fio.fee',
          data: {
            multiplier: 1,
            max_fee: config.api.register_producer.fee
          }
        })

    } catch (err) {
    var expected = `Error 400`
    expect(err.message).to.include(expected)
    }
  })

  it(`Try to vote for fee ratios for a 43rd BP, fails to vote for fees`, async () => {
    try {

      result = await prodA1.sdk.genericAction('pushTransaction', {
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

    } catch (err) {
      var expected = `Error 400`
      expect(err.message).to.include(expected)
    }
  })
  */

  //wait ...then vote
  /*


   */
})

