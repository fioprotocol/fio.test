require('mocha')
const {expect} = require('chai')
const {newUser, callFioApi,fetchJson, createKeypair, stringToHash, generateFioAddress, timeout, randStr, callFioApiSigned} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
const config = require('../config.js');
let faucet;
let permission_name = "register_address_on_domain";
const expireDate = 1527686000;  // May, 2018
let burnUser;

function mintNfts(num) {
    let nfts = [];
    if (num === 0) return nfts;
    for (let i = 1; i <= num; i++) {
        nfts.push({
            "chain_code": "ETH",
            "contract_address": "0x123456789ABCDEF",
            "token_id": `${randStr(6)}`,
            "url": "",
            "hash": "",
            "metadata": ""
        });
    }
    return nfts;
}

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
    burnUser = await newUser(faucet);
})

/**
 * these tests are designed to perform the QA level testing for FIP-40, including testing the new permissions
 * capability added into the FIO protocol for FIP-40
 */


describe(`************************** FIP-40-permissions-dev-tests.js ************************** \n    A. smoke tests permissions add and remove \n `, () => {


  let permuser1,
      permuser2,
      permuser3;


  before(async () => {
    permuser1 = await newUser(faucet);
    permuser2 = await newUser(faucet);
    permuser3 = await newUser(faucet);
      //now transfer 1k fio from the faucet to this account
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: permuser1.publicKey,
      amount: 1000000000000,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })

    console.log('permuser1.publicKey: ', permuser1.publicKey)

  })



    it(`SUCCESS, call addperm`, async () => {
    try {

      const result = await permuser1.sdk.genericAction('pushTransaction', {
        action: 'addperm',
        account: 'fio.perms',
        data: {
          grantee_account: permuser2.account,
          permission_name: "register_address_on_domain",
          permission_info: "",
          object_name: permuser1.domain,
          max_fee: config.maxFee,
          tpid: '',
          actor: permuser1.account
        }
      })


        expect(result.fee_collected).to.equal(514287432);
    // console.log("result ", result);
    } catch (err) {
        console.log('Error', err);
        expect(err).to.equal(null);
    }
  })

    it('SUCCESS confirm permissions and accesses table contents', async () => {
        try {

           // hash  object_type, object_name, and permission_name
            let control_string = "domain"+permuser1.domain+"register_address_on_domain";
            const control_hash  = stringToHash(control_string);
            //search for record in permissions using index 5 (bypermissioncontrolhash)
            const json = {
                json: true,
                code: 'fio.perms',
                scope: 'fio.perms',
                table: 'permissions',
                lower_bound: control_hash,
                upper_bound: control_hash,
                key_type: 'i128',
                index_position: '5'
            }
            result = await callFioApi("get_table_rows", json);
            //get the id for the record
            expect(result.rows.length).to.equal(1);
            //hash account and id
            let pid = result.rows[0].id;
            let access_control = permuser2.account + pid.toString();
            const access_hash = stringToHash(access_control);

            //search for record in accesses using index 4 (byaccesscontrolhash)
            const json1 = {
                json: true,
                code: 'fio.perms',
                scope: 'fio.perms',
                table: 'accesses',
                lower_bound: access_hash,
                upper_bound: access_hash,
                key_type: 'i128',
                index_position: '4'
            }
            result1 = await callFioApi("get_table_rows", json1);
            //get the id for the record
            expect(result1.rows.length).to.equal(1);

            //console.log('Result: ', result);
            //console.log('Result 1', result1);
            //console.log('periods : ', result.rows[0].periods)

        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    })

    it(`Waiting 3 seconds for no duplicate`, async () => {

        console.log("      wait 3 seconds ")
    })

    it(`wait 3 seconds for unlock`, async () => {
        await timeout(3 * 1000);
    })

    it(`FAILURE, call addperm again, permission exists`, async () => {
        try {

            const result = await permuser1.sdk.genericAction('pushTransaction', {
                action: 'addperm',
                account: 'fio.perms',
                data: {
                    grantee_account: permuser2.account,
                    permission_name: "register_address_on_domain",
                    permission_info: "",
                    object_name: permuser1.domain,
                    max_fee: config.maxFee,
                    tpid: '',
                    actor: permuser1.account
                }
            })


            expect(result.status).to.equal(null);

        } catch (err) {
           // console.log('Error', err);
            expect(err.json.fields[0].error).to.equal("Permission already exists")
        }
    })

    it(`SUCCESS, call addperm for a second account`, async () => {
        try {

            const result = await permuser1.sdk.genericAction('pushTransaction', {
                action: 'addperm',
                account: 'fio.perms',
                data: {
                    grantee_account: permuser3.account,
                    permission_name: "register_address_on_domain",
                    permission_info: "",
                    object_name: permuser1.domain,
                    max_fee: config.maxFee,
                    tpid: '',
                    actor: permuser1.account
                }
            })


            expect(result.fee_collected).to.equal(514287432);
            // console.log("result ", result);
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    })

    it(`SUCCESS, call remperm for first grantee`, async () => {
    try {

      const result = await permuser1.sdk.genericAction('pushTransaction', {
        action: 'remperm',
        account: 'fio.perms',
        data: {
          grantee_account: permuser2.account,
          permission_name: "register_address_on_domain",
          object_name: permuser1.domain,
          max_fee: config.maxFee,
          tpid: '',
          actor: permuser1.account
        }
      })
        expect(result.fee_collected).to.equal(212354321);

    //console.log("result ", result);
    } catch (err) {
     console.log("Error : ", err)
      // expect(err.json.fields[0].error).to.contain('has not voted')
    }
  })

    it('SUCCESS confirm removal in accesses table contents, permissions record remains', async () => {
        try {

            // hash  object_type, object_name, and permission_name
            let control_string = "domain"+permuser1.domain+"register_address_on_domain";
            const control_hash  = stringToHash(control_string);
            //search for record in permissions using index 5 (bypermissioncontrolhash)
            const json = {
                json: true,
                code: 'fio.perms',
                scope: 'fio.perms',
                table: 'permissions',
                lower_bound: control_hash,
                upper_bound: control_hash,
                key_type: 'i128',
                index_position: '5'
            }
            result = await callFioApi("get_table_rows", json);
            //get the id for the record
            expect(result.rows.length).to.equal(1);

            let pid = result.rows[0].id;
            let access_control = permuser2.account + pid.toString();
            const access_hash = stringToHash(access_control);

            //search for record in accesses using index 4 (byaccesscontrolhash)
            const json1 = {
                json: true,
                code: 'fio.perms',
                scope: 'fio.perms',
                table: 'accesses',
                lower_bound: access_hash,
                upper_bound: access_hash,
                key_type: 'i128',
                index_position: '4'
            }
            result1 = await callFioApi("get_table_rows", json1);
            //get the id for the record
            expect(result1.rows.length).to.equal(0);

            //console.log('Result: ', result);
            //console.log('Result 1', result1);
            //console.log('periods : ', result.rows[0].periods)

        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    })

    it(`Waiting 3 seconds for no duplicate`, async () => {

        console.log("      wait 3 seconds ")
    })

    it(`wait 3 seconds for unlock`, async () => {
        await timeout(3 * 1000);
    })

    it(`FAILURE, call remperm again for first grantee, perm not existing`, async () => {
        try {

            const result = await permuser1.sdk.genericAction('pushTransaction', {
                action: 'remperm',
                account: 'fio.perms',
                data: {
                    grantee_account: permuser2.account,
                    permission_name: "register_address_on_domain",
                    object_name: permuser1.domain,
                    max_fee: config.maxFee,
                    tpid: '',
                    actor: permuser1.account
                }
            })
            expect(result.status).to.equal(null);

            //console.log("result ", result);
        } catch (err) {
            //console.log("Error : ", err)
            expect(err.json.fields[0].error).to.contain('Permission not found')
        }
    })

    it(`SUCCESS, call remperm for second grantee`, async () => {
        try {

            const result = await permuser1.sdk.genericAction('pushTransaction', {
                action: 'remperm',
                account: 'fio.perms',
                data: {
                    grantee_account: permuser3.account,
                    permission_name: "register_address_on_domain",
                    object_name: permuser1.domain,
                    max_fee: config.maxFee,
                    tpid: '',
                    actor: permuser1.account
                }
            })
            expect(result.fee_collected).to.equal(212354321);

            //console.log("result ", result);
        } catch (err) {
            console.log("Error : ", err)
            // expect(err.json.fields[0].error).to.contain('has not voted')
        }
    })

    it('SUCCESS confirm removal in accesses table contents, permissions record removed', async () => {
        try {

            // hash  object_type, object_name, and permission_name
            let control_string = "domain"+permuser1.domain+"register_address_on_domain";
            const control_hash  = stringToHash(control_string);
            //search for record in permissions using index 5 (bypermissioncontrolhash)
            const json = {
                json: true,
                code: 'fio.perms',
                scope: 'fio.perms',
                table: 'permissions',
                lower_bound: control_hash,
                upper_bound: control_hash,
                key_type: 'i128',
                index_position: '5'
            }
            result = await callFioApi("get_table_rows", json);
            //get the id for the record
            expect(result.rows.length).to.equal(0);


            //search for record in accesses using index 3 (bygrantee)
            const json1 = {
                json: true,
                code: 'fio.perms',
                scope: 'fio.perms',
                table: 'accesses',
                lower_bound: permuser3.account,
                upper_bound: permuser3.account,
                key_type: 'i64',
                index_position: '3'
            }
            result1 = await callFioApi("get_table_rows", json1);
            //get the id for the record
            expect(result1.rows.length).to.equal(0);

            //console.log('Result: ', result);
            //console.log('Result 1', result1);
            //console.log('periods : ', result.rows[0].periods)

        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    })

    it(`FAILURE, call addperm for more than 100 accounts. fail on 101`, async () => {
        try {
            console.log("Creating 100 grantees for domain ",permuser1.domain);
            for (let i =0; i< 103; i++)
            {
                let taccount = await newUser(faucet);
                console.log("adding grantee ",i);

                const result = await permuser1.sdk.genericAction('pushTransaction', {
                    action: 'addperm',
                    account: 'fio.perms',
                    data: {
                        grantee_account: taccount.account,
                        permission_name: "register_address_on_domain",
                        permission_info: "",
                        object_name: permuser1.domain,
                        max_fee: config.maxFee,
                        tpid: '',
                        actor: permuser1.account
                    }
                })
            }
        } catch (err) {
            //console.log('Error', err);
            expect(err.json.fields[0].error).to.equal("Number of grantees exceeded, Max number grantees permitted is 100");
        }
    })


    it(`FAILURE, call clearperm from a non fio.address account`, async () => {
        try {

                const result = await permuser1.sdk.genericAction('pushTransaction', {
                    action: 'clearperm',
                    account: 'fio.perms',
                    data: {

                        permission_name: "register_address_on_domain",
                        object_name: permuser1.domain,
                    }
                })

        } catch (err) {
            //console.log('Error', err);
            expect(err.json.fields[0].error).to.equal("missing required authority of fio.addresss");
        }
    })


    //transfer the domain for permuser1.domain to new ownership verify all grantees are removed.
    it(`permuser1 transfers domain to permuser3`, async () => {
        try {
            const result = await permuser1.sdk.genericAction('transferFioDomain', {
                fioDomain: permuser1.domain,
                newOwnerKey: permuser3.publicKey,
                maxFee: config.api.transfer_fio_domain.fee,
                technologyProviderId: ''
            })
            expect(result.status).to.equal('OK');
        } catch (err) {
            console.log('Error: ', err)
            expect(err).to.equal(null);
        }
    })

    it('SUCCESS confirm removal in accesses table contents, permissions record also removed', async () => {
        try {

            // hash  object_type, object_name, and permission_name
            let control_string = "domain"+permuser1.domain+"register_address_on_domain";
            const control_hash  = stringToHash(control_string);
            //search for record in permissions using index 5 (bypermissioncontrolhash)
            const json = {
                json: true,
                code: 'fio.perms',
                scope: 'fio.perms',
                table: 'permissions',
                lower_bound: control_hash,
                upper_bound: control_hash,
                key_type: 'i128',
                index_position: '5'
            }
            result = await callFioApi("get_table_rows", json);
            //get the id for the record
            expect(result.rows.length).to.equal(0);

            //NOTE -- todo we could save the grantees and then check that the grantees are gone from accesses.
            /**
            //search for record in accesses using index 3 (bygrantee)
            const json1 = {
                json: true,
                code: 'fio.perms',
                scope: 'fio.perms',
                table: 'accesses',
                lower_bound: user[i].account,
                upper_bound: user[i].account,
                key_type: 'i64',
                index_position: '3'
            }
            let result1 = await callFioApi("get_table_rows", json1);
            //get the id for the record
            expect(result1.rows.length).to.equal(0);
             */

        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    })



})

describe(`   A.1. smoke tests regaddress with permissions integrated \n `, () => {


    let permuser1,
        permuser2,
        permuser3,
        user1Address,
        publicuser1;


    before(async () => {
        permuser1 = await newUser(faucet);    //owner of domain
        permuser2 = await newUser(faucet);    //grantee of access to perm1 domain
        permuser3 = await newUser(faucet);    //no access granted to perm1 domain
        publicuser1 = await newUser(faucet);    //user with public domain
        //now transfer 1k fio from the faucet to this account
        const result = await faucet.genericAction('transferTokens', {
            payeeFioPublicKey: permuser1.publicKey,
            amount: 1000000000000,
            maxFee: config.api.transfer_tokens_pub_key.fee,
            technologyProviderId: ''
        })
        user1Address = generateFioAddress(permuser1.domain, 7);
       // console.log("address to register is ",user1Address);

        console.log('permuser1.publicKey: ', permuser1.publicKey)

    })



    it(`SUCCESS, call addperm for user1 domain, grant access user2`, async () => {
        try {

            const result = await permuser1.sdk.genericAction('pushTransaction', {
                action: 'addperm',
                account: 'fio.perms',
                data: {
                    grantee_account: permuser2.account,
                    permission_name: "register_address_on_domain",
                    permission_info: "",
                    object_name: permuser1.domain,
                    max_fee: config.maxFee,
                    tpid: '',
                    actor: permuser1.account
                }
            })

            expect(result.fee_collected).to.equal(514287432);
            // console.log("result ", result);
        } catch (err) {
           // console.log('Error', err);
            expect(err).to.equal(null);
        }
    })

    it('SUCCESS confirm permissions and accesses table contents', async () => {
        try {

            // hash  object_type, object_name, and permission_name
            let control_string = "domain"+permuser1.domain+"register_address_on_domain";
            const control_hash  = stringToHash(control_string);
            //search for record in permissions using index 5 (bypermissioncontrolhash)
            const json = {
                json: true,
                code: 'fio.perms',
                scope: 'fio.perms',
                table: 'permissions',
                lower_bound: control_hash,
                upper_bound: control_hash,
                key_type: 'i128',
                index_position: '5'
            }
            result = await callFioApi("get_table_rows", json);
            //get the id for the record
            expect(result.rows.length).to.equal(1);
            //hash account and id
            let pid = result.rows[0].id;
            let access_control = permuser2.account + pid.toString();
            const access_hash = stringToHash(access_control);

            //search for record in accesses using index 4 (byaccesscontrolhash)
            const json1 = {
                json: true,
                code: 'fio.perms',
                scope: 'fio.perms',
                table: 'accesses',
                lower_bound: access_hash,
                upper_bound: access_hash,
                key_type: 'i128',
                index_position: '4'
            }
            result1 = await callFioApi("get_table_rows", json1);
            //get the id for the record
            expect(result1.rows.length).to.equal(1);

            //console.log('Result: ', result);
            //console.log('Result 1', result1);
            //console.log('periods : ', result.rows[0].periods)

        } catch (err) {
            //console.log('Error', err);
            expect(err).to.equal(null);
        }
    })

    it(`FAILURE user3 try to regaddress on user1 domain`, async () => {
        try {
            const result = await permuser3.sdk.genericAction('pushTransaction', {
                action: 'regaddress',
                account: 'fio.address',
                data: {
                    fio_address: user1Address,
                    owner_fio_public_key: permuser3.publicKey,
                    max_fee: config.maxFee,
                    tpid: '',
                    actor: permuser3.account
                }
            });
           // console.log('Result: ', result)
            expect(result).to.equal(null);
        } catch (err) {
           // console.log(err);
            expect(err.json.fields[0].error).to.equal("FIO Domain is not public. Only owner can create FIO Addresses.");
        }
    })

    it(`SUCCESS user2 try to regaddress on user1 domain`, async () => {
        try {
            const result = await permuser2.sdk.genericAction('pushTransaction', {
                action: 'regaddress',
                account: 'fio.address',
                data: {
                    fio_address: user1Address,
                    owner_fio_public_key: permuser2.publicKey,
                    max_fee: config.maxFee,
                    tpid: '',
                    actor: permuser2.account
                }
            });
           // console.log('Result: ', result)
            expect(result.status).to.equal('OK');
        } catch (err) {
           // console.log(err);
            expect(err).to.equal(null);
        }
    })

    //remove access for permuser2 see that regaddress now fails on permuser1 domain.
    it(`SUCCESS, call remperm for user1 domain, remove access of user2`, async () => {
        try {

            const result = await permuser1.sdk.genericAction('pushTransaction', {
                action: 'remperm',
                account: 'fio.perms',
                data: {
                    grantee_account: permuser2.account,
                    permission_name: "register_address_on_domain",
                    object_name: permuser1.domain,
                    max_fee: config.maxFee,
                    tpid: '',
                    actor: permuser1.account
                }
            })

            expect(result.fee_collected).to.equal(212354321);
            // console.log("result ", result);
        } catch (err) {
           // console.log('Error', err);
            expect(err).to.equal(null);
        }
    })

    it(`FAILURE user2 try to regaddress on user1 domain`, async () => {
        try {
            let addaddress3 = generateFioAddress(publicuser1.domain, 7);
            const result = await permuser2.sdk.genericAction('pushTransaction', {
                action: 'regaddress',
                account: 'fio.address',
                data: {
                    fio_address: addaddress3,
                    owner_fio_public_key: permuser3.publicKey,
                    max_fee: config.maxFee,
                    tpid: '',
                    actor: permuser2.account
                }
            });
           // console.log('Result: ', result)
            expect(result).to.equal(null);
        } catch (err) {
           // console.log(err);
            expect(err.json.fields[0].error).to.equal("FIO Domain is not public. Only owner can create FIO Addresses.");
        }
    })

    //make a domain public, see that others can register.
    it(`SUCCESS set_fio_domain_public = true for user1.domain`, async () => {
        try {
            const result = await publicuser1.sdk.genericAction('setFioDomainVisibility', {
                fioDomain: publicuser1.domain,
                isPublic: true,
                maxFee: config.maxFee,
                technologyProviderId: ''
            })
            //console.log('Result: ', result);
            expect(result.status).to.equal('OK');
        } catch (err) {
           // console.log('Error: ', err)
            expect(err).to.equal(null);
        }
    })

    it(`SUCCESS user2 try to regaddress on user1 domain`, async () => {
        try {
            let addaddress2 = generateFioAddress(publicuser1.domain, 7);

            const result = await permuser2.sdk.genericAction('pushTransaction', {
                action: 'regaddress',
                account: 'fio.address',
                data: {
                    fio_address: addaddress2,
                    owner_fio_public_key: permuser2.publicKey,
                    max_fee: config.maxFee,
                    tpid: '',
                    actor: permuser2.account
                }
            });
          //  console.log('Result: ', result)
            expect(result.status).to.equal('OK');
        } catch (err) {
           // console.log(err);
            expect(err).to.equal(null);
        }
    })

    it(`SUCCESS, call addperm for user1 domain, grant access user2`, async () => {
        try {

            const result = await publicuser1.sdk.genericAction('pushTransaction', {
                action: 'addperm',
                account: 'fio.perms',
                data: {
                    grantee_account: permuser2.account,
                    permission_name: "register_address_on_domain",
                    permission_info: "",
                    object_name: publicuser1.domain,
                    max_fee: config.maxFee,
                    tpid: '',
                    actor: publicuser1.account
                }
            })

            expect(result.fee_collected).to.equal(514287432);
            // console.log("result ", result);
        } catch (err) {
           // console.log('Error', err);
            expect(err).to.equal(null);
        }
    })

    it('SUCCESS confirm permissions and accesses table contents', async () => {
        try {

            // hash  object_type, object_name, and permission_name
            let control_string = "domain"+publicuser1.domain+"register_address_on_domain";
            const control_hash  = stringToHash(control_string);
            //search for record in permissions using index 5 (bypermissioncontrolhash)
            const json = {
                json: true,
                code: 'fio.perms',
                scope: 'fio.perms',
                table: 'permissions',
                lower_bound: control_hash,
                upper_bound: control_hash,
                key_type: 'i128',
                index_position: '5'
            }
            result = await callFioApi("get_table_rows", json);
            //get the id for the record
            expect(result.rows.length).to.equal(1);
            //hash account and id
            let pid = result.rows[0].id;
            let access_control = permuser2.account + pid.toString();
            const access_hash = stringToHash(access_control);

            //search for record in accesses using index 4 (byaccesscontrolhash)
            const json1 = {
                json: true,
                code: 'fio.perms',
                scope: 'fio.perms',
                table: 'accesses',
                lower_bound: access_hash,
                upper_bound: access_hash,
                key_type: 'i128',
                index_position: '4'
            }
            result1 = await callFioApi("get_table_rows", json1);
            //get the id for the record
            expect(result1.rows.length).to.equal(1);

            //console.log('Result: ', result);
            //console.log('Result 1', result1);
            //console.log('periods : ', result.rows[0].periods)

        } catch (err) {
           // console.log('Error', err);
            expect(err).to.equal(null);
        }
    })

    it(`SUCCESS user2 try to regaddress on user1 domain`, async () => {
        try {
            let addaddress2 = generateFioAddress(publicuser1.domain, 7);

            const result = await permuser2.sdk.genericAction('pushTransaction', {
                action: 'regaddress',
                account: 'fio.address',
                data: {
                    fio_address: addaddress2,
                    owner_fio_public_key: permuser2.publicKey,
                    max_fee: config.maxFee,
                    tpid: '',
                    actor: permuser2.account
                }
            });
           // console.log('Result: ', result)
            expect(result.status).to.equal('OK');
        } catch (err) {
           // console.log(err);
            expect(err).to.equal(null);
        }
    })

    it(`SUCCESS, call remperm for user1 domain, remove access of user2`, async () => {
        try {

            const result = await publicuser1.sdk.genericAction('pushTransaction', {
                action: 'remperm',
                account: 'fio.perms',
                data: {
                    grantee_account: permuser2.account,
                    permission_name: "register_address_on_domain",
                    object_name: publicuser1.domain,
                    max_fee: config.maxFee,
                    tpid: '',
                    actor: publicuser1.account
                }
            })
           // console.log("result ", result);

            expect(result.fee_collected).to.equal(212354321);
            // console.log("result ", result);
        } catch (err) {
           // console.log('Error', err);
            expect(err).to.equal(null);
        }
    })

    it(`SUCCESS user2 try to regaddress on user1 domain`, async () => {
        try {

            let addaddress2 = generateFioAddress(publicuser1.domain, 7);
            const result = await permuser2.sdk.genericAction('pushTransaction', {
                action: 'regaddress',
                account: 'fio.address',
                data: {
                    fio_address: addaddress2,
                    owner_fio_public_key: permuser2.publicKey,
                    max_fee: config.maxFee,
                    tpid: '',
                    actor: permuser2.account
                }
            });
           // console.log('Result: ', result)
            expect(result.status).to.equal('OK');
        } catch (err) {
           // console.log(err);
            expect(err).to.equal(null);
        }
    })

})

describe(`B. addperm -- argument validation tests`, () => {
    let user1, user2,
        permuser1,permuser2;

    before(async () => {
        user1 = await newUser(faucet);
        user2 = await newUser(faucet);
        permuser1 = await newUser(faucet);
        permuser2 = await newUser(faucet);
    });

    /*** grantee tests **/
    it(`FAILURE -- grantee account empty `, async () => {

            try {
                let result = await user1.sdk.genericAction('pushTransaction', {
                    action: 'addperm',
                    account: 'fio.perms',
                    data: {
                        grantee_account: "",
                        permission_name: permission_name,
                        permission_info: "",
                        object_name:  user1.domain,
                        max_fee: config.maxFee,
                        tpid: '',
                        actor: user1.account
                    }
                });
                expect(result.status).to.equal(null);
            } catch (err) {
               // console.log("Error ", err)
                expect(err.json.fields[0].error).to.equal("grantee account is invalid")
            }
    });
    it(`FAILURE -- grantee account too long `, async () => {

        try {
            let result = await user1.sdk.genericAction('pushTransaction', {
                action: 'addperm',
                account: 'fio.perms',
                data: {
                    grantee_account: "asdsasdsadsas",
                    permission_name: permission_name,
                    permission_info: "",
                    object_name:  user1.domain,
                    max_fee: config.maxFee,
                    tpid: '',
                    actor: user1.account
                }
            });
            expect(result.status).to.equal(null);
        } catch (err) {
            //console.log("Error ", err)
            expect(err.json.fields[0].error).to.equal("grantee account is invalid")
        }
    });
    it(`FAILURE -- grantee account illegal chars `, async () => {

        try {
            let result = await user1.sdk.genericAction('pushTransaction', {
                action: 'addperm',
                account: 'fio.perms',
                data: {
                    grantee_account: "asdsasd$adsa",
                    permission_name: permission_name,
                    permission_info: "",
                    object_name:  user1.domain,
                    max_fee: config.maxFee,
                    tpid: '',
                    actor: user1.account
                }
            });
            expect(result.status).to.equal(null);
        } catch (err) {
            //console.log("Error ", err)
            expect(err.json.fields[0].error).to.equal("grantee account is invalid")
        }
    });
    it(`FAILURE -- grantee account is actor `, async () => {

        try {
            let result = await user1.sdk.genericAction('pushTransaction', {
                action: 'addperm',
                account: 'fio.perms',
                data: {
                    grantee_account: user1.account,
                    permission_name: permission_name,
                    permission_info: "",
                    object_name:  user1.domain,
                    max_fee: config.maxFee,
                    tpid: '',
                    actor: user1.account
                }
            });
            expect(result.status).to.equal(null);
        } catch (err) {
            //console.log("Error ", err)
            expect(err.json.fields[0].error).to.equal("grantee account is invalid")
        }
    });
    it(`FAILURE -- grantee account does not exist `, async () => {

        try {

            let newKeyPair = await createKeypair();
            let result = await user1.sdk.genericAction('pushTransaction', {
                action: 'addperm',
                account: 'fio.perms',
                data: {
                    grantee_account: newKeyPair.account,
                    permission_name: permission_name,
                    permission_info: "",
                    object_name:  user1.domain,
                    max_fee: config.maxFee,
                    tpid: '',
                    actor: user1.account
                }
            });
            expect(result.status).to.equal(null);
        } catch (err) {
            //console.log("Error ", err)
            expect(err.json.fields[0].error).to.equal("grantee account is invalid")
        }
    });

    /*** permission name tests **/
    it(`SUCCESS -- permission name, mixed text case for permission name `, async () => {

        try {

            let result = await user1.sdk.genericAction('pushTransaction', {
                action: 'addperm',
                account: 'fio.perms',
                data: {
                    grantee_account: user2.account,
                    permission_name: "REgister_ADDress_oN_doMAIN",
                    permission_info: "",
                    object_name:  user1.domain,
                    max_fee: config.maxFee,
                    tpid: '',
                    actor: user1.account
                }
            });
            expect(result.status).to.equal('OK');
        } catch (err) {
            //console.log("Error ", err)
            expect(err).to.equal(null)
        }
    });
    it(`FAILURE -- invalid permission name, empty name `, async () => {

        try {

            let result = await user1.sdk.genericAction('pushTransaction', {
                action: 'addperm',
                account: 'fio.perms',
                data: {
                    grantee_account: user2.account,
                    permission_name: "",
                    permission_info: "",
                    object_name:  user1.domain,
                    max_fee: config.maxFee,
                    tpid: '',
                    actor: user1.account
                }
            });
            expect(result.status).to.equal(null);
        } catch (err) {
            //console.log("Error ", err)
            expect(err.json.fields[0].error).to.equal("Permission name is invalid")
        }
    });
    it(`FAILURE -- invalid permission name, unkown name `, async () => {

        try {

            let result = await user1.sdk.genericAction('pushTransaction', {
                action: 'addperm',
                account: 'fio.perms',
                data: {
                    grantee_account: user2.account,
                    permission_name: "booger",
                    permission_info: "",
                    object_name:  user1.domain,
                    max_fee: config.maxFee,
                    tpid: '',
                    actor: user1.account
                }
            });
            expect(result.status).to.equal(null);
        } catch (err) {
            //console.log("Error ", err)
            expect(err.json.fields[0].error).to.equal("Permission name is invalid")
        }
    });

    /** permission info tests **/
    it(`FAILURE -- invalid permission info, non empty value `, async () => {

        try {

            let result = await user1.sdk.genericAction('pushTransaction', {
                action: 'addperm',
                        account: 'fio.perms',
                        data: {
                            grantee_account: user2.account,
                            permission_name: "register_address_on_domain",
                            permission_info: "stuff",
                            object_name: user1.domain,
                            max_fee: config.maxFee,
                            tpid: '',
                            actor: user1.account
                        }
                    });
                    expect(result.status).to.equal(null);
        } catch (err) {
                    //console.log("Error ", err)
                    expect(err.json.fields[0].error).to.equal("Permission info is invalid")
        }
    });

    /** object name tests **/
    it(`FAILURE -- object name, invalid format `, async () => {

        try {

            let result = await user1.sdk.genericAction('pushTransaction', {
                action: 'addperm',
                account: 'fio.perms',
                data: {
                    grantee_account: user2.account,
                    permission_name: "register_address_on_domain",
                    permission_info: "",
                    object_name: "domain$%d",
                    max_fee: config.maxFee,
                    tpid: '',
                    actor: user1.account
                }
            });
            expect(result.status).to.equal(null);
        } catch (err) {
            //console.log("Error ", err)
            expect(err.json.fields[0].error).to.equal("Invalid object name")
        }
    });
    it(`FAILURE -- object name, value not domain only `, async () => {

        try {

            let result = await user1.sdk.genericAction('pushTransaction', {
                action: 'addperm',
                account: 'fio.perms',
                data: {
                    grantee_account: user2.account,
                    permission_name: "register_address_on_domain",
                    permission_info: "",
                    object_name: user1.address,
                    max_fee: config.maxFee,
                    tpid: '',
                    actor: user1.account
                }
            });
            expect(result.status).to.equal(null);
        } catch (err) {
            //console.log("Error ", err)
            expect(err.json.fields[0].error).to.equal("Invalid object name")
        }
    });
    it(`FAILURE -- object name, domain doesnt exist `, async () => {

        try {

            let result = await user1.sdk.genericAction('pushTransaction', {
                action: 'addperm',
                account: 'fio.perms',
                data: {
                    grantee_account: user2.account,
                    permission_name: "register_address_on_domain",
                    permission_info: "",
                    object_name: "fiction",
                    max_fee: config.maxFee,
                    tpid: '',
                    actor: user1.account
                }
            });
            expect(result.status).to.equal(null);
        } catch (err) {
            //console.log("Error ", err)
            expect(err.json.fields[0].error).to.equal("Invalid object name")
        }
    });
    it(`SUCCESS -- object name, case change in domain is ignored `, async () => {

        try {

            let result = await user1.sdk.genericAction('pushTransaction', {
                action: 'addperm',
                account: 'fio.perms',
                data: {
                    grantee_account: user2.account,
                    permission_name: "register_address_on_domain",
                    permission_info: "",
                    object_name: user1.domain.toUpperCase(),
                    max_fee: config.maxFee,
                    tpid: '',
                    actor: user1.account
                }
            });
            expect(result.status).to.equal('OK');
        } catch (err) {
            //console.log("Error ", err)
            expect(err).to.equal(null)
        }
    });
    it(`FAILURE -- object name, domain owner not actor `, async () => {

        try {

            let result = await user1.sdk.genericAction('pushTransaction', {
                action: 'addperm',
                account: 'fio.perms',
                data: {
                    grantee_account: user2.account,
                    permission_name: "register_address_on_domain",
                    permission_info: "",
                    object_name: user2.domain,
                    max_fee: config.maxFee,
                    tpid: '',
                    actor: user1.account
                }
            });
            expect(result.status).to.equal(null);
        } catch (err) {
            //console.log("Error ", err)
            expect(err.json.fields[0].error).to.equal("Invalid object name")
        }
    });
    it(`FAILURE -- object name, domain maxlen exceed `, async () => {

        try {

            let result = await user1.sdk.genericAction('pushTransaction', {
                action: 'addperm',
                account: 'fio.perms',
                data: {
                    grantee_account: user2.account,
                    permission_name: "register_address_on_domain",
                    permission_info: "",
                    object_name: "adsadsadsadsadsadsadsadsadsadsadsadsadsadsadsadsadsadsadsadsadsadsadsadsadsadsa",
                    max_fee: config.maxFee,
                    tpid: '',
                    actor: user1.account
                }
            });
            expect(result.status).to.equal(null);
        } catch (err) {
            //console.log("Error ", err)
            expect(err.json.fields[0].error).to.equal("Invalid object name")
        }
    });


    it(`SUCCESS, call addperm`, async () => {
        try {

            const result = await permuser1.sdk.genericAction('pushTransaction', {
                action: 'addperm',
                account: 'fio.perms',
                data: {
                    grantee_account: permuser2.account,
                    permission_name: "register_address_on_domain",
                    permission_info: "",
                    object_name: permuser1.domain,
                    max_fee: config.maxFee,
                    tpid: '',
                    actor: permuser1.account
                }
            })


            expect(result.fee_collected).to.equal(514287432);
            // console.log("result ", result);
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    })

    /** max fee **/
    it(`FAILURE -- max fee, zero `, async () => {

        try {
            let user4 = await newUser(faucet);

            let result = await  permuser1.sdk.genericAction('pushTransaction', {
                action: 'addperm',
                account: 'fio.perms',
                data: {
                    grantee_account: user4.account,
                    permission_name: "register_address_on_domain",
                    permission_info: "",
                    object_name: permuser1.domain,
                    max_fee: -1,
                    tpid: '',
                    actor: permuser1.account
                }
            });
            expect(result.status).to.equal(null);
        } catch (err) {
            //console.log("Error ", err)
            expect(err.json.fields[0].error).to.equal("Invalid fee value")
        }
    });



    /** tpid tests **/
    it(`FAILURE -- tpid, invalid format `, async () => {

        try {
            let user3 = await newUser(faucet);
            let user4 = await newUser(faucet);

            let result = await user3.sdk.genericAction('pushTransaction', {
                action: 'addperm',
                account: 'fio.perms',
                data: {
                    grantee_account: user4.account,
                    permission_name: "register_address_on_domain",
                    permission_info: "",
                    object_name: user3.domain,
                    max_fee: config.maxFee,
                    tpid: 'f$%#',
                    actor: user3.account
                }
            });
            expect(result.status).to.equal('OK');
        } catch (err) {
            //console.log("Error ", err)
            expect(err.json.fields[0].error).to.equal("TPID must be empty or valid FIO address")
        }
    });
    it(`SUCCESS -- tpid, value domain only `, async () => {

        try {

            let result = await user1.sdk.genericAction('pushTransaction', {
                action: 'addperm',
                account: 'fio.perms',
                data: {
                    grantee_account: user2.account,
                    permission_name: "register_address_on_domain",
                    permission_info: "",
                    object_name: user1.address,
                    max_fee: config.maxFee,
                    tpid: user1.domain,
                    actor: user1.account
                }
            });
            expect(result.status).to.equal(null);
        } catch (err) {
            //console.log("Error ", err)
            expect(err.json.fields[0].error).to.equal("Invalid object name")
        }
    });
    it(`SUCCESS -- tpid, doesnt exist `, async () => {

        try {

            let result = await user1.sdk.genericAction('pushTransaction', {
                action: 'addperm',
                account: 'fio.perms',
                data: {
                    grantee_account: user2.account,
                    permission_name: "register_address_on_domain",
                    permission_info: "",
                    object_name: user2.domain,
                    max_fee: config.maxFee,
                    tpid: 'fiction@fiction',
                    actor: user1.account
                }
            });
            expect(result.status).to.equal(null);
        } catch (err) {
            //console.log("Error ", err)
            expect(err.json.fields[0].error).to.equal("Invalid object name")
        }
    });


})

describe(`C. remperm -- argument validation tests`, () => {
    let user1,
        user2,
        user6,
        user5;


    before(async () => {
        user1 = await newUser(faucet);
        user2 = await newUser(faucet);
        user6 = await newUser(faucet);
        user5 = await newUser(faucet);
    });


    /*** grantee tests **/
    it(`FAILURE -- grantee account empty `, async () => {

        try {
            let result = await user1.sdk.genericAction('pushTransaction', {
                action: 'remperm',
                account: 'fio.perms',
                data: {
                    grantee_account: "",
                    permission_name: permission_name,
                    object_name:  user1.domain,
                    max_fee: config.maxFee,
                    tpid: '',
                    actor: user1.account
                }
            });
            expect(result.status).to.equal(null);
        } catch (err) {
            //console.log("Error ", err)
            expect(err.json.fields[0].error).to.equal("grantee account is invalid")
        }
    });
    it(`FAILURE -- grantee account too long `, async () => {

        try {
            let result = await user1.sdk.genericAction('pushTransaction', {
                action: 'remperm',
                account: 'fio.perms',
                data: {
                    grantee_account: "asdsasdsadsas",
                    permission_name: permission_name,
                    object_name:  user1.domain,
                    max_fee: config.maxFee,
                    tpid: '',
                    actor: user1.account
                }
            });
            expect(result.status).to.equal(null);
        } catch (err) {
            //console.log("Error ", err)
            expect(err.json.fields[0].error).to.equal("grantee account is invalid")
        }
    });
    it(`FAILURE -- grantee account illegal chars `, async () => {

        try {
            let result = await user1.sdk.genericAction('pushTransaction', {
                action: 'remperm',
                account: 'fio.perms',
                data: {
                    grantee_account: "asdsasd$adsa",
                    permission_name: permission_name,
                    object_name:  user1.domain,
                    max_fee: config.maxFee,
                    tpid: '',
                    actor: user1.account
                }
            });
            expect(result.status).to.equal(null);
        } catch (err) {
            //console.log("Error ", err)
            expect(err.json.fields[0].error).to.equal("grantee account is invalid")
        }
    });
    it(`FAILURE -- grantee account is actor `, async () => {

        try {
            let result = await user1.sdk.genericAction('pushTransaction', {
                action: 'remperm',
                account: 'fio.perms',
                data: {
                    grantee_account: user1.account,
                    permission_name: permission_name,
                    object_name:  user1.domain,
                    max_fee: config.maxFee,
                    tpid: '',
                    actor: user1.account
                }
            });
            expect(result.status).to.equal(null);
        } catch (err) {
            //console.log("Error ", err)
            expect(err.json.fields[0].error).to.equal("grantee account is invalid")
        }
    });
    it(`FAILURE -- grantee account does not exist `, async () => {

        try {

            let newKeyPair = await createKeypair();
            let result = await user1.sdk.genericAction('pushTransaction', {
                action: 'remperm',
                account: 'fio.perms',
                data: {
                    grantee_account: newKeyPair.account,
                    permission_name: permission_name,
                    object_name:  user1.domain,
                    max_fee: config.maxFee,
                    tpid: '',
                    actor: user1.account
                }
            });
            expect(result.status).to.equal(null);
        } catch (err) {
            //console.log("Error ", err)
            expect(err.json.fields[0].error).to.equal("grantee account is invalid")
        }
    });

    /*** permission name tests **/
    it(`SUCCESS -- permission name, mixed text case for permission name `, async () => {

        try {

            let result = await user1.sdk.genericAction('pushTransaction', {
                action: 'remperm',
                account: 'fio.perms',
                data: {
                    grantee_account: user2.account,
                    permission_name: "REgister_ADDress_oN_doMAIN",
                    object_name:  user1.domain,
                    max_fee: config.maxFee,
                    tpid: '',
                    actor: user1.account
                }
            });
            expect(result.status).to.equal(null);
        } catch (err) {
            //console.log("Error ", err)
            expect(err.json.fields[0].error).to.equal("Permission not found");
        }
    });
    it(`FAILURE -- invalid permission name, empty name `, async () => {

        try {

            let result = await user1.sdk.genericAction('pushTransaction', {
                action: 'remperm',
                account: 'fio.perms',
                data: {
                    grantee_account: user2.account,
                    permission_name: "",
                    object_name:  user1.domain,
                    max_fee: config.maxFee,
                    tpid: '',
                    actor: user1.account
                }
            });
            expect(result.status).to.equal(null);
        } catch (err) {
            //console.log("Error ", err)
            expect(err.json.fields[0].error).to.equal("Permission name is invalid")
        }
    });
    it(`FAILURE -- invalid permission name, unkown name `, async () => {

        try {

            let result = await user1.sdk.genericAction('pushTransaction', {
                action: 'remperm',
                account: 'fio.perms',
                data: {
                    grantee_account: user2.account,
                    permission_name: "booger",
                    object_name:  user1.domain,
                    max_fee: config.maxFee,
                    tpid: '',
                    actor: user1.account
                }
            });
            expect(result.status).to.equal(null);
        } catch (err) {
            //console.log("Error ", err)
            expect(err.json.fields[0].error).to.equal("Permission name is invalid")
        }
    });


    /** object name tests **/
    it(`FAILURE -- object name, invalid format `, async () => {

        try {

            let result = await user1.sdk.genericAction('pushTransaction', {
                action: 'remperm',
                account: 'fio.perms',
                data: {
                    grantee_account: user2.account,
                    permission_name: "register_address_on_domain",
                    object_name: "domain$%d",
                    max_fee: config.maxFee,
                    tpid: '',
                    actor: user1.account
                }
            });
            expect(result.status).to.equal(null);
        } catch (err) {
            //console.log("Error ", err)
            expect(err.json.fields[0].error).to.equal("Invalid object name")
        }
    });
    it(`FAILURE -- object name, value not domain only `, async () => {

        try {

            let result = await user1.sdk.genericAction('pushTransaction', {
                action: 'remperm',
                account: 'fio.perms',
                data: {
                    grantee_account: user2.account,
                    permission_name: "register_address_on_domain",
                    object_name: user1.address,
                    max_fee: config.maxFee,
                    tpid: '',
                    actor: user1.account
                }
            });
            expect(result.status).to.equal(null);
        } catch (err) {
            //console.log("Error ", err)
            expect(err.json.fields[0].error).to.equal("Invalid object name")
        }
    });
    it(`FAILURE -- object name, domain doesnt exist `, async () => {

        try {

            let result = await user1.sdk.genericAction('pushTransaction', {
                action: 'remperm',
                account: 'fio.perms',
                data: {
                    grantee_account: user2.account,
                    permission_name: "register_address_on_domain",
                    object_name: "fiction",
                    max_fee: config.maxFee,
                    tpid: '',
                    actor: user1.account
                }
            });
            expect(result.status).to.equal(null);
        } catch (err) {
            //console.log("Error ", err)
            expect(err.json.fields[0].error).to.equal("Invalid object name")
        }
    });
    it(`SUCCESS -- object name, case change in domain is ignored `, async () => {

        try {

            let result = await user1.sdk.genericAction('pushTransaction', {
                action: 'remperm',
                account: 'fio.perms',
                data: {
                    grantee_account: user2.account,
                    permission_name: "register_address_on_domain",
                    object_name: user1.domain.toUpperCase(),
                    max_fee: config.maxFee,
                    tpid: '',
                    actor: user1.account
                }
            });
            expect(result.status).to.equal(null);
        } catch (err) {
            //console.log("Error ", err)
            expect(err.json.fields[0].error).to.equal("Permission not found");
        }
    });
    it(`FAILURE -- object name, domain owner not actor `, async () => {

        try {

            let result = await user1.sdk.genericAction('pushTransaction', {
                action: 'remperm',
                account: 'fio.perms',
                data: {
                    grantee_account: user2.account,
                    permission_name: "register_address_on_domain",
                    object_name: user2.domain,
                    max_fee: config.maxFee,
                    tpid: '',
                    actor: user1.account
                }
            });
            expect(result.status).to.equal(null);
        } catch (err) {
            //console.log("Error ", err)
            expect(err.json.fields[0].error).to.equal("Invalid object name")
        }
    });
    it(`FAILURE -- object name, domain maxlen exceed `, async () => {

        try {

            let result = await user1.sdk.genericAction('pushTransaction', {
                action: 'remperm',
                account: 'fio.perms',
                data: {
                    grantee_account: user2.account,
                    permission_name: "register_address_on_domain",
                    object_name: "adsadsadsadsadsadsadsadsadsadsadsadsadsadsadsadsadsadsadsadsadsadsadsadsadsadsa",
                    max_fee: config.maxFee,
                    tpid: '',
                    actor: user1.account
                }
            });
            expect(result.status).to.equal(null);
        } catch (err) {
            //console.log("Error ", err)
            expect(err.json.fields[0].error).to.equal("Invalid object name")
        }
    });

    /** max fee **/
    it(`SUCCESS, add perm for user `, async () => {

        try {

            let result1 = await user6.sdk.genericAction('pushTransaction', {
                action: 'addperm',
                account: 'fio.perms',
                data: {
                    grantee_account: user5.account,
                    permission_name: "register_address_on_domain",
                    permission_info: "",
                    object_name: user6.domain,
                    max_fee:5000000000,
                    tpid: '',
                    actor: user6.account
                }
            });
           // console.log(result1);
            expect(result1.status).to.equal('OK');
        } catch (err) {
            //console.log("Error ", err)
            expect(err).to.equal(null)

        }

    });



    /** max fee **/
    it(`FAILURE -- max fee, zero `, async () => {

        try{

            let result = await user6.sdk.genericAction('pushTransaction', {
                action: 'remperm',
                account: 'fio.perms',
                data: {
                    grantee_account: user5.account,
                    permission_name: "register_address_on_domain",
                    object_name: user6.domain,
                    max_fee: -1,
                    tpid: '',
                    actor: user6.account
                }
            });
            expect(result.status).to.equal(null);
        } catch (err) {
            //console.log("Error ", err)
            expect(err.json.fields[0].error).to.equal("Invalid fee value")
        }
    });

    /** tpid tests **/
    it(`FAILURE -- tpid, invalid format `, async () => {

        try {

            let result = await user1.sdk.genericAction('pushTransaction', {
                action: 'addperm',
                account: 'fio.perms',
                data: {
                    grantee_account: user2.account,
                    permission_name: "register_address_on_domain",
                    permission_info: "",
                    object_name: user1.domain,
                    max_fee: config.maxFee,
                    tpid: 'f$%#',
                    actor: user1.account
                }
            });
            expect(result.status).to.equal('OK');
        } catch (err) {
            //console.log("Error ", err)
            expect(err.json.fields[0].error).to.equal("TPID must be empty or valid FIO address")
        }
    });
    it(`SUCCESS -- tpid, value domain only `, async () => {

        try {

            let result = await user1.sdk.genericAction('pushTransaction', {
                action: 'addperm',
                account: 'fio.perms',
                data: {
                    grantee_account: user2.account,
                    permission_name: "register_address_on_domain",
                    permission_info: "",
                    object_name: user1.address,
                    max_fee: config.maxFee,
                    tpid: user1.domain,
                    actor: user1.account
                }
            });
            expect(result.status).to.equal(null);
        } catch (err) {
            //console.log("Error ", err)
            expect(err.json.fields[0].error).to.equal("Invalid object name")
        }
    });
    it(`SUCCESS -- tpid, doesnt exist `, async () => {

        try {

            let result = await user1.sdk.genericAction('pushTransaction', {
                action: 'addperm',
                account: 'fio.perms',
                data: {
                    grantee_account: user2.account,
                    permission_name: "register_address_on_domain",
                    permission_info: "",
                    object_name: user2.domain,
                    max_fee: config.maxFee,
                    tpid: 'fiction@fiction',
                    actor: user1.account
                }
            });
            expect(result.status).to.equal(null);
        } catch (err) {
            //console.log("Error ", err)
            expect(err.json.fields[0].error).to.equal("Invalid object name")
        }
    });

})


/**
 * This test requires the "modexpire" action
 *
 * This test also requires a cleanly started chain to ensure all tests run successfully.
 *
 * Currently in:
 *   fio.contracts - dev/expire_helper
 *   fio.devtools - dev/expire_helper
 *
 * In fio.address.abi:
 *
 *   Add modexpire struct:

 {
        "name": "modexpire",
        "base": "",
        "fields": [
          {
            "name": "fio_address",
            "type": "string"
          },
          {
            "name": "expire",
            "type": "int64"
          }
        ]
      },

 *
 *  Add modexpire action:
 *

 {
      "name": "modexpire",
      "type": "modexpire",
      "ricardian_contract": ""
    },
 *
 *
 * In fio.address.cpp
 *
 *   Add modexpire action: (beware of autoformattig of the "byname"_n>)
 *

 [[eosio::action]]
 void modexpire(const string &fio_address, const int64_t &expire) {
            FioAddress fa;
            getFioAddressStruct(fio_address, fa);
            name actor = name{"eosio"};
            const uint128_t nameHash = string_to_uint128_hash(fa.fioaddress.c_str());
            auto namesbyname = domains.get_index<"byname"_n>();
            auto fioname_iter = namesbyname.find(nameHash);

            namesbyname.modify(fioname_iter, actor, [&](struct domain &a) {
                a.expiration = expire;
            });
        }
 *
 *
 *   Add modexpire to EOSIO_DISPATCH, e.g.:
 *
 *      EOSIO_DISPATCH(FioNameLookup, (regaddress)(addaddress)(remaddress)(remalladdr)(regdomain)(renewdomain)(renewaddress)(
 *          setdomainpub)(burnexpired)(modexpire)(decrcounter)
 *
 *
 *  Rebuild contracts
 *
 *  be sure to start the chain without many other CPU intensive things on the local dev box, exit clion etc etc.
 */

describe.skip('D. Burn large number of expired domains with gaps between expired and non-expired', () => {

    let nftburnqCount;
    let user = [];
    const domainBlockCount = 5;
    const addressBlockCount = 10;
    const nftBlockCount = 3;  // Must be divisible by 3
    let burnexpiredStepSize = 3; // Offset gets incremented by this number in the while loop. Also index is set to this number.
    const retryLimit = 1; // Number of times to call burnexpired with the same offset/limit when hitting a CPU limit error

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
    });

    it(`#1 - Create domain block: ${domainBlockCount} domains, ${addressBlockCount} addresses, ${nftBlockCount} NFTs`, async () => {
        let address = [], addedNfts;



        try {

            for (let i = 0; i < domainBlockCount; i++) {
                console.log('          (Adding Domain) #' + i);
                user[i] = await newUser(faucet);
               // console.log('user[i].privateKey: ', user[i].privateKey);
               // console.log('user[i].privateKey: ', user[i].publicKey);


                //console.log('          (Adding ' + addressBlockCount + ' Addresses with ' + nftBlockCount + ' NFTs)');
                for (let j = 0; j < addressBlockCount; j++) {
                    address[j] = generateFioAddress(user[i].domain, 10)
                  //  console.log('address[j]: ', address[j]);

                    const addressResult = await user[i].sdk.genericAction('registerFioAddress', {
                        fioAddress: address[j],
                        maxFee: config.maxFee,
                        technologyProviderId: ''
                    })
                   // console.log('addressResult: ', addressResult)
                    expect(addressResult.status).to.equal('OK')

                    let permgrantee = await newUser(faucet);
                    //make permission on user[i]
                    let permresult = await user[i].sdk.genericAction('pushTransaction', {
                        action: 'addperm',
                        account: 'fio.perms',
                        data: {
                            grantee_account: permgrantee.account,
                            permission_name: "register_address_on_domain",
                            permission_info: "",
                            object_name:user[i].domain,
                            max_fee: config.maxFee,
                            tpid: '',
                            actor: user[i].account
                        }
                    });

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
                        //console.log(`nft count: `, k)
                        //console.log(`addnftResult: `, addnftResult)
                        expect(addnftResult.status).to.equal('OK')
                    } // k - nfts
                }  // j - addresses
            } // i - domains

        } catch (err) {
            console.log(err.json)
            expect(err).to.equal(null);
        }
    });

    it(`(Expire the domains using modexpire)`, async () => {

            for (let i = 0; i < domainBlockCount; i++) {
                try {
                const result = await callFioApiSigned('push_transaction', {
                    action: 'modexpire',
                    account: 'fio.address',
                    actor: user[i].account,
                    privKey: user[i].privateKey,
                    data: {
                        "fio_address": user[i].domain,
                        "expire": expireDate,
                        "actor": user[i].account
                    }
                })
                //console.log('Result: ', result);
                expect(result.processed.receipt.status).to.equal('executed');
                } catch (err) {
                    console.log('Error: ', err);
                    // expect(err).to.equal(null);
                }
            }

    });

    it(`#2 - Create non expired domains block: ${domainBlockCount} domains, ${addressBlockCount} addresses, ${nftBlockCount} NFTs`, async () => {
        let address = [], addedNfts;
        try {

            for (i = domainBlockCount; i < domainBlockCount * 2; i++) {
                console.log('          (Adding Domain) #' + i);
                user[i] = await newUser(faucet);

                //console.log('          (Adding ' + addressBlockCount + ' Addresses with ' + nftBlockCount + ' NFTs)');
                for (j = 0; j < addressBlockCount; j++) {
                    address[j] = generateFioAddress(user[i].domain, 10)

                    const addressResult = await user[i].sdk.genericAction('registerFioAddress', {
                        fioAddress: address[j],
                        maxFee: config.maxFee,
                        technologyProviderId: ''
                    })
                    //console.log('addressResult: ', addressResult)
                    expect(addressResult.status).to.equal('OK')


                    //NO PERMISSIONS ON THESE DOMAINS


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
                        //console.log(`addnftResult: `, addnftResult)
                        expect(addnftResult.status).to.equal('OK')
                    } // k - nfts
                }  // j - addresses
            } // i - domains

        } catch (err) {
            console.log(err.json)
            expect(err).to.equal(null);
        }
    });

    it(`#3 - Create expired domains block: ${domainBlockCount} domains, ${addressBlockCount} addresses, ${nftBlockCount} NFTs`, async () => {
        let address = [], addedNfts;
        try {

            for (i = domainBlockCount * 2; i < domainBlockCount * 3; i++) {
                console.log('          (Adding Domain) #' + i);
                user[i] = await newUser(faucet);

                //console.log('          (Adding ' + addressBlockCount + ' Addresses with ' + nftBlockCount + ' NFTs)');
                for (j = 0; j < addressBlockCount; j++) {
                    address[j] = generateFioAddress(user[i].domain, 10)

                    const addressResult = await user[i].sdk.genericAction('registerFioAddress', {
                        fioAddress: address[j],
                        maxFee: config.maxFee,
                        technologyProviderId: ''
                    })
                    //console.log('addressResult: ', addressResult)
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
                        //console.log(`addnftResult: `, addnftResult)
                        expect(addnftResult.status).to.equal('OK')
                    } // k - nfts
                }  // j - addresses
            } // i - domains

        } catch (err) {
            console.log(err.json)
            expect(err).to.equal(null);
        }
    });
    it(`(Expire the domains using modexpire)`, async () => {
        try {
            for (i = domainBlockCount * 2; i < domainBlockCount * 3; i++) {
                const result = await callFioApiSigned('push_transaction', {
                    action: 'modexpire',
                    account: 'fio.address',
                    actor: user[i].account,
                    privKey: user[i].privateKey,
                    data: {
                        "fio_address": user[i].domain,
                        "expire": expireDate,
                        "actor": user[i].account
                    }
                })
                expect(result.processed.receipt.status).to.equal('executed');
            }
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);
        }
    });


    it(`Call burnexpired until empty`, async () => {
        let offset, limit;
        let retryCount = 0;
        let empty = false;
        let workDoneThisRound = true;
        let workDoneThisOffset = false;
        let count = 1;

        while (!empty) {
            offset = burnexpiredStepSize * count;
            limit = burnexpiredStepSize;

            try {
                const result = await burnUser.sdk.genericAction('pushTransaction', {
                    action: 'burnexpired',
                    account: 'fio.address',
                    data: {
                        actor: burnUser.account,
                        offset: offset,
                        limit: limit
                    }
                })
                console.log('Offset = ' + offset + ', Limit = ' + limit + ', Result: {status: ' + result.status + ', items_burned: ' + result.items_burned + ' }');
                expect(result.status).to.equal('OK');
                workDoneThisOffset = true;
                workDoneThisRound = true;
                retryCount = 0;
                await timeout(1000); // To avoid duplicate transaction
            } catch (err) {
                workDoneThisOffset = false;
                //console.log('Error: ', err);
                if (err.errorCode == 400 && err.json.fields[0].error == 'No work.') {
                    retryCount = 0;
                    console.log('Offset = ' + offset + ', Limit = ' + limit + ', Result: ' + err.json.fields[0].error);
                    expect(err.errorCode).to.equal(400);
                    expect(err.json.fields[0].error).to.equal('No work.');
                } else if (err.json.code == 500 && err.json.error.what == 'Transaction exceeded the current CPU usage limit imposed on the transaction') {
                    console.log('Offset = ' + offset + ', Limit = ' + limit + ', Result: Transaction exceeded the current CPU usage limit imposed on the transaction');
                    retryCount++;
                } else {
                    console.log('UNEXPECTED ERROR: ', err);
                }

            }

            const json = {
                json: true,
                code: 'fio.address',
                scope: 'fio.address',
                table: 'domains',
                limit: burnexpiredStepSize,
                lower_bound: burnexpiredStepSize * count,
                reverse: false,
                show_payer: false
            }
            result = await callFioApi("get_table_rows", json);
            //console.log('Table lookup: ', result);

            if (result.rows.length == 0) {
                console.log("DONE");
                count = 1;  // Start again
                // If this is the first round, or work was done during the round, reset
                if (workDoneThisRound) {
                    workDoneThisRound = false;
                } else {
                    empty = true;  // No work was done this round and we are at the end of the domains
                }
            } else {
                // Only increment the offset if no work was done
                if (!workDoneThisOffset) {
                    // If you have done several retries, move to next offset
                    if (retryCount == 0) {
                        count++;
                    } else if (retryCount >= retryLimit) {
                        retryCount = 0;
                        count++;
                    }
                }
            }
        }

    });

    it(`To confirm burnexpired, Call with limit = 1 with offset step size of 1`, async () => {
        let offset, limit;
        let retryCount = 0;
        let empty = false;
        let workDoneThisRound = true;
        let workDoneThisOffset = false;
        let count = 1;

        burnexpiredStepSize = 1;

        while (!empty) {
            offset = burnexpiredStepSize * count;
            limit = burnexpiredStepSize;

            try {
                const result = await burnUser.sdk.genericAction('pushTransaction', {
                    action: 'burnexpired',
                    account: 'fio.address',
                    data: {
                        actor: burnUser.account,
                        offset: offset,
                        limit: limit
                    }
                })
                console.log('Offset = ' + offset + ', Limit = ' + limit + ', Result: {status: ' + result.status + ', items_burned: ' + result.items_burned + ' }');
                expect(result.status).to.equal('OK');
                workDoneThisOffset = true;
                workDoneThisRound = true;
                retryCount = 0;
                await timeout(1000); // To avoid duplicate transaction
            } catch (err) {
                workDoneThisOffset = false;
                //console.log('Error: ', err);
                if (err.errorCode == 400 && err.json.fields[0].error == 'No work.') {
                    retryCount = 0;
                    console.log('Offset = ' + offset + ', Limit = ' + limit + ', Result: ' + err.json.fields[0].error);
                    expect(err.errorCode).to.equal(400);
                    expect(err.json.fields[0].error).to.equal('No work.');
                } else if (err.json.code == 500 && err.json.error.what == 'Transaction exceeded the current CPU usage limit imposed on the transaction') {
                    console.log('Offset = ' + offset + ', Limit = ' + limit + ', Result: Transaction exceeded the current CPU usage limit imposed on the transaction');
                    retryCount++;
                } else {
                    console.log('UNEXPECTED ERROR: ', err);
                }

            }

            const json = {
                json: true,
                code: 'fio.address',
                scope: 'fio.address',
                table: 'domains',
                limit: burnexpiredStepSize,
                lower_bound: burnexpiredStepSize * count,
                reverse: false,
                show_payer: false
            }
            result = await callFioApi("get_table_rows", json);
            //console.log('Table lookup: ', result);

            if (result.rows.length == 0) {
                console.log("DONE");
                count = 1;  // Start again
                // If this is the first round, or work was done during the round, reset
                if (workDoneThisRound) {
                    workDoneThisRound = false;
                } else {
                    empty = true;  // No work was done this round and we are at the end of the domains
                }
            } else {
                // Only increment the offset if no work was done
                if (!workDoneThisOffset) {
                    // If you have done several retries, move to next offset
                    if (retryCount == 0) {
                        count++;
                    } else if (retryCount >= retryLimit) {
                        retryCount = 0;
                        count++;
                    }
                }
            }
        }

    });

    /*check all domains see that no permissions exist. */
    it('SUCCESS confirm removal in accesses table contents, permissions record removed', async () => {
        try {

            for (let i = 0; i < domainBlockCount; i++) {
                // hash  object_type, object_name, and permission_name
                let control_string = "domain" + user[i].domain + "register_address_on_domain";
                const control_hash = stringToHash(control_string);
                //search for record in permissions using index 5 (bypermissioncontrolhash)
                const json = {
                    json: true,
                    code: 'fio.perms',
                    scope: 'fio.perms',
                    table: 'permissions',
                    lower_bound: control_hash,
                    upper_bound: control_hash,
                    key_type: 'i128',
                    index_position: '5'
                }
                let result = await callFioApi("get_table_rows", json);
                //get the id for the record
                expect(result.rows.length).to.equal(0);


                //search for record in accesses using index 3 (bygrantee)
                const json1 = {
                    json: true,
                    code: 'fio.perms',
                    scope: 'fio.perms',
                    table: 'accesses',
                    lower_bound: user[i].account,
                    upper_bound: user[i].account,
                    key_type: 'i64',
                    index_position: '3'
                }
                let result1 = await callFioApi("get_table_rows", json1);
                //get the id for the record
                expect(result1.rows.length).to.equal(0);
            }

            //console.log('Result: ', result);
            //console.log('Result 1', result1);
            //console.log('periods : ', result.rows[0].periods)

        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    })

})


/**
 * this test was used for early prototyping to prove adequate function of 128 bit indexes used by the table model.
 * this test DOES NOT need run as part of QA
 */
describe.skip(`AA. indexing tests, Add a large number of users each with 2 permissions, query tables`, () => {
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

})


/**
 *this test was made to better understand the max number of permissions that could be removed in one tx on the local dev box.
 *the number discovered was between 6-8k permissions.
 * this test does not need run as part of QA
 */
describe.skip(`AB. permissions performance tests \n `, () => {

    //setup, make the cost/fee of addperm to be zero. in the devtools

    /* contract setup , go to fio.perms.cpp in the remperm action.
    change the following code


                fio_400_assert((access_iter != accessbyhash.end() ), "grantee_account", grantee_account.to_string(),
                               "Permission not found", ErrorPermissionExists);
                accessbyhash.erase(access_iter);


    to become

                //TEST ONLY CODE!!! remove ALLLLL accesses for this permission!, prototype only code which is used
                //for performance testing.
                auto     accessbypermid1         = accesses.get_index<"bypermid"_n>();
                auto     accessbypermid_iter          = accessbypermid1.find(permid);

                fio_400_assert((accessbypermid_iter != accessbypermid1.end() ), "grantee_account", grantee_account.to_string(),
                               "Permission not found", ErrorPermissionExists);

                while (accessbypermid_iter != accessbypermid1.end()) {
                    auto nextaccess = accessbypermid_iter;
                    nextaccess++;
                    accessbypermid1.erase(accessbypermid_iter);
                    accessbypermid_iter = nextaccess;
                }


                fio_400_assert((access_iter != accessbyhash.end() ), "grantee_account", grantee_account.to_string(),
                               "permid Permission not found", ErrorPermissionExists);


               // comment out for TESTING ONLY!!!!! accessbyhash.erase(access_iter);
     */

    let
        numUsersToCreate = 6000,
    permuser1,
        permuser2,
        permuser3;


    before(async () => {
        permuser1 = await newUser(faucet);

        permuser3 = await newUser(faucet);
        //now transfer 1k fio from the faucet to this account
        const result = await faucet.genericAction('transferTokens', {
            payeeFioPublicKey: permuser1.publicKey,
            amount: 1000000000000,
            maxFee: config.api.transfer_tokens_pub_key.fee,
            technologyProviderId: ''
        })

        console.log('permuser1.publicKey: ', permuser1.publicKey)

    })



    it(`SUCCESS, call addperm for many new accounts`, async () => {
        try {

            let userCount = 0;
            while (userCount < numUsersToCreate) {

                userCount = userCount + 1;
                try {
                    permuser2 = await newUser(faucet);
                    const result = await permuser1.sdk.genericAction('pushTransaction', {
                        action: 'addperm',
                        account: 'fio.perms',
                        data: {
                            grantee_account: permuser2.account,
                            permission_name: "register_address_on_domain",
                            permission_info: "",
                            object_name: permuser1.domain,
                            max_fee: config.maxFee,
                            tpid: '',
                            actor: permuser1.account
                        }
                    })
                }catch(err){
                    console.log ("EERRROR creating ",userCount);
                }
                console.log("CREATED ACCOUNT ",userCount);
            }


           // expect(result.fee_collected).to.equal(514287432);
            // console.log("result ", result);
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    })





    it(`SUCCESS, call remperm for last grantee, removes ALL accesses!!`, async () => {
        try {

            const result = await permuser1.sdk.genericAction('pushTransaction', {
                action: 'remperm',
                account: 'fio.perms',
                data: {
                    grantee_account: permuser2.account,
                    permission_name: "register_address_on_domain",
                    object_name: permuser1.domain,
                    max_fee: config.maxFee,
                    tpid: '',
                    actor: permuser1.account
                }
            })
            expect(result.fee_collected).to.equal(212354321);

            //console.log("result ", result);
        } catch (err) {
            console.log("Error : ", err)
            // expect(err.json.fields[0].error).to.contain('has not voted')
        }
    })

    it('SUCCESS confirm removal in accesses table contents, permissions record should also be gone', async () => {
        try {

            // hash  object_type, object_name, and permission_name
            let control_string = "domain"+permuser1.domain+"register_address_on_domain";
            const control_hash  = stringToHash(control_string);
            //search for record in permissions using index 5 (bypermissioncontrolhash)
            const json = {
                json: true,
                code: 'fio.perms',
                scope: 'fio.perms',
                table: 'permissions',
                lower_bound: control_hash,
                upper_bound: control_hash,
                key_type: 'i128',
                index_position: '5'
            }
            result = await callFioApi("get_table_rows", json);
            //get the id for the record
            expect(result.rows.length).to.equal(0);


        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    })


})
