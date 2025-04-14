require('mocha')
const {expect} = require('chai')
const {newUser, callFioApi,fetchJson, createKeypair, stringToHash, generateFioAddress, generateFioDomain, timeout, randStr, callFioApiSigned} = require('../utils.js');
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
 * This test requires the "modexpire" action
 *
 * This test also requires a cleanly started chain to ensure all tests run successfully.
 *
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

describe(`************************** burn-expired-scale-tests.js ************************** \n    A. contract action smoke tests permissions add and remove \n `, () => {

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
                            object_name: user[i].domain,
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
            //log the tx and traces.
            console.log(result);
            await timeout(1000); // To avoid duplicate transaction
        } catch (err) {
            workDoneThisOffset = false;
            //console.log('Error: ', err);
            if (err.code == 400 && err.json.fields[0].error == 'No work.') {
                retryCount = 0;
                console.log('Offset = ' + offset + ', Limit = ' + limit + ', Result: ' + err.json.fields[0].error);
                expect(err.code).to.equal(400);
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
                if (err.code == 400 && err.json.fields[0].error == 'No work.') {
                    retryCount = 0;
                    console.log('Offset = ' + offset + ', Limit = ' + limit + ', Result: ' + err.json.fields[0].error);
                    expect(err.code).to.equal(400);
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

})


