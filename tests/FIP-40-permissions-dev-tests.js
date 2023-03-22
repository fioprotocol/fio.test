require('mocha')
const {expect} = require('chai')
const {newUser, callFioApi,fetchJson, timeout} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
const config = require('../config.js');
let faucet;

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
})




describe(`************************** FIP-40-permissions-dev-tests.js ************************** \n    A. dev tests permissions \n `, () => {


  let permuser1;


  before(async () => {
    permuser1 = await newUser(faucet);

    //now transfer 1k fio from the faucet to this account
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: permuser1.publicKey,
      amount: 1000000000000,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })


    console.log('permuser1.publicKey: ', permuser1.publicKey)

  })


  it(`dev test, call addperm`, async () => {
    try {

      const result = await permuser1.sdk.genericAction('pushTransaction', {
        action: 'addperm',
        account: 'fio.perms',
        data: {
          grantee_account: permuser1.account,
          permission_name: "permname1",
          permission_info: "",
          object_name: "object1",
          max_fee: config.maxFee,
          tpid: '',
          actor: permuser1.account
        }
      })

      console.log("result ", result);
    } catch (err) {
      console.log("Error : ", err)
      // expect(err.json.fields[0].error).to.contain('has not voted')
    }
  })

  it(`dev test, call remperm`, async () => {
    try {

      const result = await permuser1.sdk.genericAction('pushTransaction', {
        action: 'remperm',
        account: 'fio.perms',
        data: {
          grantee_account: permuser1.account,
          permission_name: "freddy",
          object_name: "",
          max_fee: config.maxFee,
          tpid: '',
          actor: permuser1.account
        }
      })

      console.log("result ", result);
    } catch (err) {
      console.log("Error : ", err)
      // expect(err.json.fields[0].error).to.contain('has not voted')
    }
  })
})

describe(`B. indexing tests, Add a large number of users ech with 2 permissions, query tables`, () => {
    let users = [];
    let owners = [];

    // let numUsers = 10000;
    // let numUsers = 5000;
    let numUsers = 100;
    // let numUsers = 500;
    // let numUsers = 100;

    before(async () => {
      for (let j=0; j<2;j++){
        owners[j] = await newUser(faucet);
      }
      for (let i=0; i<numUsers; i++) {
        console.log("user ",i);
        users[i] = await newUser(faucet);
      }
      console.log('test users created');

    });

    it(`has ${numUsers} new users`, async () => {
      expect(users.length).to.equal(numUsers);
    });

    it(`make permissions for each user`, async () => {
      for (let i=0; i<users.length; i++) {
        try {
          console.log("creating perms for user ",i);
          let result = await owners[0].sdk.genericAction('pushTransaction', {
            action: 'addperm',
            account: 'fio.perms',
            data: {
              grantee_account: users[i].account,
              permission_name: "permname1",
              permission_info: "",
              object_name:"object1",
              max_fee: config.maxFee,
              tpid: '',
              actor: owners[0].account
            }
          });

          result = await owners[1].sdk.genericAction('pushTransaction', {
            action: 'addperm',
            account: 'fio.perms',
            data: {
              grantee_account: users[i].account,
              permission_name: "permname2",
              permission_info: "",
              object_name:"object2",
              max_fee: config.maxFee,
              tpid: '',
              actor: owners[1].account
            }
          });

        } catch (err) {
          Console.log("Error ",err)
        }
      }
      console.log('test NFTs minted');
    });

    it(`rem permissions for user`, async () => {

        try {
            console.log("rem  perms for user ");
            let result = await owners[0].sdk.genericAction('pushTransaction', {
                action: 'remperm',
                account: 'fio.perms',
                data: {
                    grantee_account: owners[0].account,
                    permission_name: "permname1",
                    permission_info: "",
                    object_name:"object1",
                    max_fee: config.maxFee,
                    tpid: '',
                    actor: owners[0].account
                }
            });



        } catch (err) {
            console.log("Error ",err)
        }
    })
/*
    it(`verify NFTs have been added to the table`, async () => {
      // try {
      const user1Nft = await callFioApi("get_table_rows", {
        code: "fio.address",
        scope: "fio.address",
        table: "nfts",
        key_type: "i128",
        index_position: "2",
        lower_bound: user1Hash,
        upper_bound: user1Hash,
        json: true,
        reverse: false
      });
      // expect(user1Nft.rows[0].token_id).to.equal('1');
      expect(user1Nft.rows.length).to.equal(1);
      expect(user1Nft.rows[0].fio_address_hash).to.equal(user1Hash);
      // } catch (err) {
      //   expect(err).to.equal(null);
      // }

      // try {
      const lastUserNft = await callFioApi("get_table_rows", {
        code: "fio.address",
        scope: "fio.address",
        table: "nfts",
        key_type: "i128",
        index_position: "2",
        lower_bound: endUserHash,
        upper_bound: endUserHash,
        json: true,
        reverse: false
      });
      // expect(lastUserNft.rows[0].token_id).to.equal(numUsers.toString());
      expect(lastUserNft.rows[0].fio_address_hash).to.equal(endUserHash);
      expect(lastUserNft.rows.length).to.equal(1);
      // } catch (err) {
      //   expect(err).to.equal(null);
      // }
    });
    */




})

