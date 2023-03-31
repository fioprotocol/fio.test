require('mocha')
const {expect} = require('chai')
const {newUser, callFioApi,fetchJson, createKeypair, stringToHash, timeout} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
const config = require('../config.js');
let faucet;
let permission_name = "register_address_on_domain";

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
})




describe(`************************** FIP-40-permissions-dev-tests.js ************************** \n    A. happy path smoke tests permissions add and remove \n `, () => {


  let permuser1,
      permuser2,
      permuser3,
      permuser4;


  before(async () => {
    permuser1 = await newUser(faucet);
    permuser2 = await newUser(faucet);
    permuser3 = await newUser(faucet);
    permuser4 = await newUser(faucet);


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

})

describe(`B. addperm -- argument validation tests`, () => {
    let user1, user2,
        permuser1,permuser2,permuser3;

    before(async () => {
        user1 = await newUser(faucet);
        user2 = await newUser(faucet);
        permuser1 = await newUser(faucet);
        permuser2 = await newUser(faucet);
        permuser3 = await newUser(faucet);
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
        user3,
        user4,
        permuser1,
        permuser2;
    let user6;
    let user5;


    before(async () => {
        user1 = await newUser(faucet);
        user2 = await newUser(faucet);
        user3 = await newUser(faucet);
        user4 = await newUser(faucet);
        permuser1 = await newUser(faucet);
        permuser2 = await newUser(faucet);
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

