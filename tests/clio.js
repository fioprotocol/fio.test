require('mocha')
const {expect} = require('chai')
const {newUser, existingUser, randStr, generateFioDomain, generateFioAddress, unlockWallet, callFioApi, timeout, fetchJson} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
config = require('../config.js');

const exec = require('child_process').exec;
const clio = "../fio.devtools/bin/clio";
const url = config.URL

const max_fee = 900000000000
const tpid = 'tpid@testnet'
const randString = randStr(64)  // Content field requires min 64 max 296 size
const content = `"{"content":"one${randString}"}"`
const content2 = `"{"content":"two${randString}"}"`
const content3 = `"{"content":"three${randString}"}"`

async function runClio(parms) {
    return new Promise(function(resolve, reject) {
        command = clio + " -u " + url + " " + parms
        //console.log('command = ', command)
        //command = "../fio.devtools/bin/clio -u http://localhost:8889 get info"
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(stdout.trim());
        });
    });
}

before(async () => {
    faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson)

    const result = await unlockWallet('fio');
})

describe(`************************** clio.js ************************** \n    A. Test clio`, () => {

    it(`get info`, async () => {
        const result = await runClio('get info');
        expect(JSON.parse(result).head_block_num).to.be.a('number')
      })
})

describe(`B. Request and OBT Data`, () => {
    let fio_request_id, fio_request_id2, fio_request_id3, user1, user2, resultSdk, resultClio, contentSdk, contentClio

    it(`Create users and import private keys`, async () => {
        user1 = await newUser(faucet);
        await runClio('wallet import -n fio --private-key ' + user1.privateKey);
        user2 = await newUser(faucet);
        await runClio('wallet import -n fio --private-key ' + user2.privateKey);

        console.log('user1 pub key: ', user1.publicKey)
        console.log('user2 pub key: ', user2.publicKey)
    })

    it(`clio: request new (user1 requests funds from user2)`, async () => {
        try {
            const result = await runClio(`request new -j ${user2.address} ${user1.address} ${content} ${user1.account} ${tpid} ${max_fee} --permission ${user1.account}@active`);
            //console.log('Result: ', result)
            fio_request_id = JSON.parse(JSON.parse(result).processed.action_traces[0].receipt.response).fio_request_id
            //console.log('ID: ', JSON.parse(JSON.parse(result).processed.action_traces[0].receipt.response).fio_request_id)
            expect(JSON.parse(result).transaction_id).to.exist
        } catch (err) {
        console.log('Error', err)
        expect(err).to.equal(null)
        }
    })

    it(`SDK: user1 requests funds from user2`, async () => {
        try {
          const result = await user1.sdk.genericAction('requestFunds', {
            payerFioAddress: user2.address,
            payeeFioAddress: user1.address,
            payeeTokenPublicAddress: 'thisispayeetokenpublicaddress',
            amount: 500000,
            chainCode: 'BTC',
            tokenCode: 'BTC',
            memo: 'requestMemo',
            maxFee: config.maxFee,
            payerFioPublicKey: user2.publicKey,
            technologyProviderId: '',
          })
          requestId = result.fio_request_id
          //console.log('Result: ', result)
          expect(result.status).to.equal('requested')
        } catch (err) {
          console.log('Error: ', err)
          expect(err).to.equal(null)
        }
    })

    it(`Wait a few seconds.`, async () => { await timeout(2000) })

    it.skip(`(BUG BD-2358) get_sent_fio_requests for user1 (payee). Both clio and SDK requests to return same content.`, async () => {
        try {
            const result = await user1.sdk.genericAction('getSentFioRequests', {
                limit: '',
                offset: ''
            })
            //console.log('result: ', result);
            //console.log('fio_request_id: ', fio_request_id)
            expect(result.requests[0].fio_request_id).to.equal(result.requests[1].fio_request_id);
            expect(result.requests[0].payer_fio_address).to.equal(result.requests[1].payer_fio_address);
            expect(result.requests[0].payee_fio_address).to.equal(result.requests[1].payee_fio_address);
            expect(result.requests[0].payer_fio_public_key).to.equal(result.requests[1].payer_fio_public_key);
            expect(result.requests[0].payee_fio_public_key).to.equal(result.requests[1].payee_fio_public_key);
            expect(result.requests[0].status).to.equal(result.requests[1].status);
        } catch (err) {
            console.log('Error: ', err)
            expect(err).to.equal(null)
        }
    })
   
    it('(api) Call get_sent_fio_requests', async () => {
        try {
            const result = await callFioApi("get_sent_fio_requests", {
            fio_public_key: user1.publicKey,
            limit: 10,
            offset: 0
          })
          //console.log('Result', result)
          expect(result.requests[0].fio_request_id).to.equal(result.requests[1].fio_request_id - 1);
          expect(result.requests[0].payer_fio_address).to.equal(result.requests[1].payer_fio_address);
          expect(result.requests[0].payee_fio_address).to.equal(result.requests[1].payee_fio_address);
          expect(result.requests[0].payer_fio_public_key).to.equal(result.requests[1].payer_fio_public_key);
          expect(result.requests[0].payee_fio_public_key).to.equal(result.requests[1].payee_fio_public_key);
          expect(result.requests[0].status).to.equal(result.requests[1].status);
        } catch (err) {
          console.log('Error', err)
        }
    })

    it(`clio: request reject (user2 rejects request from user1)`, async () => {
        try {
            result = await runClio(`request reject -j ${fio_request_id} ${user2.account} ${tpid} ${max_fee} --permission ${user2.account}@active`);
            //console.log('Result: ', result)
            expect(JSON.parse(result).transaction_id).to.exist
        } catch (err) {
            console.log('Error', err)
            expect(err).to.equal(null)
        }
    })

    it.skip(`(BUG BD-2358) get_sent_fio_requests for user1 (payee). Expect one request with status = 'rejected'`, async () => {
        try {
            const result = await user1.sdk.genericAction('getSentFioRequests', {
                limit: '',
                offset: ''
            })
            console.log('result: ', result);
            //console.log('content: ', result.requests[0].content);
            //expect(result.requests[0].fio_request_id).to.equal(fio_request_id);
            //expect(result.requests[0].payer_fio_address).to.equal(user2.address);
            //expect(result.requests[0].payee_fio_address).to.equal(user1.address);
            //expect(result.requests[0].payer_fio_public_key).to.equal(user2.publicKey);
            //expect(result.requests[0].payee_fio_public_key).to.equal(user1.publicKey);
            //expect(result.requests[0].status).to.equal('rejected');
        } catch (err) {
            console.log('Error: ', err)
            expect(err).to.equal(null)
        }
    })

    it(`clio: request new (user2 requests funds from user1)`, async () => {
        try {
            result = await runClio(`request new -j ${user1.address} ${user2.address} ${content} ${user2.account} ${tpid} ${max_fee} --permission ${user2.account}@active`);
            //console.log('Result: ', result)
            fio_request_id2 = JSON.parse(JSON.parse(result).processed.action_traces[0].receipt.response).fio_request_id
            expect(JSON.parse(result).transaction_id).to.exist
        } catch (err) {
            console.log('Error', err)
            expect(err).to.equal(null)
        }
    })

    it.skip(`(BUG BD-2358) get_pending_fio_requests for user1 (payer). Expect one request with status = 'pending'`, async () => {
        try {
          const result = await user1.sdk.genericAction('getPendingFioRequests', {
            limit: '',
            offset: ''
          })
          console.log('result: ', result)
          //console.log('content: ', result.requests[0].content)
          expect(result.requests[0].fio_request_id).to.equal(fio_request_id2);
          expect(result.requests[0].payer_fio_address).to.equal(user1.address);
          expect(result.requests[0].payee_fio_address).to.equal(user2.address);
          expect(result.requests[0].payer_fio_public_key).to.equal(user1.publicKey);
          expect(result.requests[0].payee_fio_public_key).to.equal(user2.publicKey);
        } catch (err) {
          console.log('Error: ', err)
          expect(err).to.equal(null)
        }
    })

    it(`clio: request cancel (user2 cancels sent request)`, async () => {
        try {
            result = await runClio(`request cancel -j ${fio_request_id2} ${user2.account} ${tpid} ${max_fee} --permission ${user2.account}@active`);
            //console.log('Result: ', result)
            expect(JSON.parse(result).transaction_id).to.exist
        } catch (err) {
            console.log('Error', err)
            expect(err).to.equal(null)
        }
    })

    it.skip(`(BUG BD-2358) get_pending_fio_requests for user1 (payer). Expect one request with status = 'cancelled'`, async () => {
        try {
          const result = await user1.sdk.genericAction('getPendingFioRequests', {
            limit: '',
            offset: ''
          })
          console.log('result: ', result)
          //console.log('content: ', result.requests[0].content)
          expect(result.requests[0].fio_request_id).to.equal(fio_request_id2);
          expect(result.requests[0].payer_fio_address).to.equal(user1.address);
          expect(result.requests[0].payee_fio_address).to.equal(user2.address);
          expect(result.requests[0].payer_fio_public_key).to.equal(user1.publicKey);
          expect(result.requests[0].payee_fio_public_key).to.equal(user2.publicKey);
        } catch (err) {
          console.log('Error: ', err)
          expect(err).to.equal(null)
        }
    })

    it(`clio: request new (user1 requests funds from user2)`, async () => {
        try {
            result = await runClio(`request new -j ${user2.address} ${user1.address} ${content2} ${user1.account} ${tpid} ${max_fee} --permission ${user1.account}@active`);
            //console.log('Result: ', result)
            fio_request_id3 = JSON.parse(JSON.parse(result).processed.action_traces[0].receipt.response).fio_request_id
            expect(JSON.parse(result).transaction_id).to.exist
        } catch (err) {
            console.log('Error', err)
            expect(err).to.equal(null)
        }
    })

    it(`clio: record (user2 records obt record in response to request)`, async () => {
        try {
            result = await runClio(`data record -j ${fio_request_id3} ${user2.address} ${user1.address} ${content3} ${user2.account} ${tpid} ${max_fee} --permission ${user2.account}@active`);
            //console.log('Result: ', result)
        } catch (err) {
            console.log('Error', err)
            expect(err).to.equal(null)
        }
    })

    it(`getObtData for user2. Expect one record with status = 'sent_to_blockchain'`, async () => {
        try {
          const result = await user2.sdk.genericAction('getObtData', {
            limit: '',
            offset: '',
            tokenCode: 'BTC'
          })
          //console.log('result: ', result)
          //console.log('content: ', result.obt_data_records[0].content)
          expect(result.obt_data_records[0].fio_request_id).to.equal(fio_request_id3);
          expect(result.obt_data_records[0].payer_fio_address).to.equal(user2.address);
          expect(result.obt_data_records[0].payee_fio_address).to.equal(user1.address);
          expect(result.obt_data_records[0].payer_fio_public_key).to.equal(user2.publicKey);
          expect(result.obt_data_records[0].payee_fio_public_key).to.equal(user1.publicKey);
          expect(result.obt_data_records[0].status).to.equal('sent_to_blockchain');
        } catch (err) {
          console.log('Error: ', err)
          expect(err).to.equal(null)
        }
      })

    it.skip(`(BUG BD-2358) get_sent_fio_requests for user1 (payee). Expect one request with status = 'sent_to_blockchain'`, async () => {
        try {
            const result = await user1.sdk.genericAction('getSentFioRequests', {
                limit: '',
                offset: ''
            })
            console.log('result: ', result);
            //console.log('content: ', result.requests[0].content);
            expect(result.requests[0].fio_request_id).to.equal(fio_request_id);
            expect(result.requests[0].payer_fio_address).to.equal(user2.address);
            expect(result.requests[0].payee_fio_address).to.equal(user1.address);
            expect(result.requests[0].payer_fio_public_key).to.equal(user2.publicKey);
            expect(result.requests[0].payee_fio_public_key).to.equal(user1.publicKey);
            expect(result.requests[0].status).to.equal('sent_to_blockchain');
        } catch (err) {
            console.log('Error: ', err)
            expect(err).to.equal(null)
        }
    })

})

describe(`C. Domain`, () => {
    let user1, user2, user1Balance, register_fio_domain_fee, set_fio_domain_public_fee

    it(`Create users and import private keys`, async () => {
        user1 = await newUser(faucet);
        result = await runClio('wallet import -n fio --private-key ' + user1.privateKey);
        user1.domain2 = generateFioDomain(7)

        user2 = await newUser(faucet);
        result = await runClio('wallet import -n fio --private-key ' + user2.privateKey);
    })

    it('Get register_fio_domain fee', async () => {
        try {
            result = await user1.sdk.getFee('register_fio_domain');
            register_fio_domain_fee = result.fee;
            //console.log('Domain Fee: ', register_fio_domain_fee)
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    })

    it('Get set_fio_domain_public fee', async () => {
        try {
            result = await user1.sdk.getFee('set_fio_domain_public');
            set_fio_domain_public_fee = result.fee;
            //console.log('set_fio_domain_public Fee: ', set_fio_domain_public_fee)
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    })

    it(`Get balance for user1`, async () => {
        try {
          const result = await user1.sdk.genericAction('getFioBalance', {
            fioPublicKey: user1.publicKey
          })
          user1Balance = result.balance
          //console.log('user1 fio balance', result.balance)
        } catch (err) {
          //console.log('Error', err)
          expect(err).to.equal(null)
        }
      })

    it(`clio: domain register`, async () => {
        try {
            result = await runClio(`domain register -j ${user1.domain2} ${user1.account} ${user1.publicKey} ${tpid} ${max_fee} --permission ${user1.account}@active`);
            //console.log('Result: ', JSON.parse(result));
            expect(JSON.parse(result).transaction_id).to.exist
        } catch (err) {
            console.log('Error', err)
        }
    })

    it(`Call get_fio_domains for user1. Expect new domain.`, async () => {
        try {
          const json = {
            "fio_public_key": user1.publicKey
          }
          result = await callFioApi("get_fio_domains", json);
          //console.log('Result: ', result.fio_domains.length);
          expect(result.fio_domains.length).to.equal(2);
        } catch (err) {
          //console.log('Error', err)
          expect(err).to.equal(null)
        }
    })

    it(`Verify balance for user1 = prev_balance - reg_domain_fee`, async () => {
        let prevBalance = user1Balance;
        try {
          const result = await user1.sdk.genericAction('getFioBalance', {
            fioPublicKey: user1.publicKey
          })
          user1Balance = result.balance
          //console.log('user1 fio balance', result.balance)
          expect(user1Balance).to.equal(prevBalance - register_fio_domain_fee)
        } catch (err) {
          //console.log('Error', err)
          expect(err).to.equal(null)
        }
      })

    it(`clio: domain renew`, async () => {
        try {
            result = await runClio(`domain renew -j ${user1.account} ${user1.domain2} ${tpid} ${max_fee} --permission ${user1.account}@active`);
            //console.log('Result: ', JSON.parse(result));
            expect(JSON.parse(result).transaction_id).to.exist
        } catch (err) {
            console.log('Error', err)
        }
    })

    it(`Verify balance for user1 = prev_balance - renew_domain_fee`, async () => {
        let prevBalance = user1Balance;
        try {
            const result = await user1.sdk.genericAction('getFioBalance', {
                fioPublicKey: user1.publicKey
            })
            user1Balance = result.balance
            //console.log('user1 fio balance', result.balance)
            expect(user1Balance).to.equal(prevBalance - register_fio_domain_fee)
        } catch (err) {
            //console.log('Error', err)
            expect(err).to.equal(null)
        }
    })

    it(`clio: domain set_public`, async () => {
        try {
            result = await runClio(`domain set_public -j ${user1.domain2} 1 ${user1.account} ${tpid} ${max_fee} --permission ${user1.account}@active`);
            //console.log('Result: ', JSON.parse(result));
            expect(JSON.parse(result).transaction_id).to.exist
        } catch (err) {
            //console.log('Error', err)
            expect(err).to.equal(null)
        }
    })

    it(`Call get_fio_domains for user1. Verify is_public = 1`, async () => {
        try {
          const json = {
            "fio_public_key": user1.publicKey
          }
          result = await callFioApi("get_fio_domains", json);
          //console.log('Result: ', result);
          expect(result.fio_domains[0].is_public).to.equal(0);
          expect(result.fio_domains[1].is_public).to.equal(1);
        } catch (err) {
          //console.log('Error', err)
          expect(err).to.equal(null)
        }
    })

    it(`Verify balance for user1 = prev_balance - set_fio_domain_public_fee`, async () => {
        let prevBalance = user1Balance;
        try {
        const result = await user1.sdk.genericAction('getFioBalance', {
            fioPublicKey: user1.publicKey
        })
        user1Balance = result.balance
        //console.log('user1 fio balance', result.balance)
        expect(user1Balance).to.equal(prevBalance - set_fio_domain_public_fee)
        } catch (err) {
            //console.log('Error', err)
            expect(err).to.equal(null)
        }
    })

    it(`clio: domain transfer`, async () => {
        try {
            result = await runClio(`domain transfer -j ${user1.domain2} ${user1.account} ${user2.publicKey} ${tpid} ${max_fee} --permission ${user1.account}@active`);
            //console.log('Result: ', JSON.parse(result));
            expect(JSON.parse(result).transaction_id).to.exist
        } catch (err) {
            //console.log('Error', err)
            expect(err).to.equal(null)
        }
    })

    it(`Call get_fio_domains for user2. Expect new domain.`, async () => {
        try {
          const json = {
            "fio_public_key": user2.publicKey
          }
          result = await callFioApi("get_fio_domains", json);
          //console.log('Result: ', result);
          expect(result.fio_domains.length).to.equal(2)
          expect(result.fio_domains[1].fio_domain).to.equal(user1.domain2)
        } catch (err) {
            //console.log('Error', err)
            expect(err).to.equal(null)
        }
      })

})

describe(`D. Address`, () => {
    let user1, user2, user1Balance, register_fio_address_fee

    let BCHAddress =
        {
          chain_code: 'BCH',
          token_code: 'BCH',
          public_address: 'bitcoincashqg9',
          clioAddress: 'BCH,BCH,bitcoincashqg9'
          }

    let DASHAddress =
        {
          chain_code: 'DASH',
          token_code: 'DASH',
          public_address: 'XyCyPKzTWvW2XdcYjPaPXGQDCGk946ywEv',
          clioAddress: 'DASH,DASH,XyCyPKzTWvW2XdcYjPaPXGQDCGk946ywEv'
        }

    it(`Create users and import private keys`, async () => {
        user1 = await newUser(faucet);
        result = await runClio('wallet import -n fio --private-key ' + user1.privateKey);
        user1.address2 = generateFioAddress(user1.domain)

        user2 = await newUser(faucet);
        result = await runClio('wallet import -n fio --private-key ' + user2.privateKey);
    })

    it('Get register_fio_address fee', async () => {
        try {
            result = await user1.sdk.getFee('register_fio_address');
            register_fio_address_fee = result.fee;
            //console.log('Domain Fee: ', register_fio_address_fee)
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    })

    it(`Get balance for user1`, async () => {
        try {
          const result = await user1.sdk.genericAction('getFioBalance', {
            fioPublicKey: user1.publicKey
          })
          user1Balance = result.balance
          //console.log('user1 fio balance', result.balance)
        } catch (err) {
          //console.log('Error', err)
          expect(err).to.equal(null)
        }
      })

    it(`clio: address register`, async () => {
        try {
            result = await runClio(`address register -j ${user1.address2} ${user1.account} ${user1.publicKey} ${tpid} ${max_fee} --permission ${user1.account}@active`);
            //console.log('Result: ', JSON.parse(result));
            expect(JSON.parse(result).transaction_id).to.exist
        } catch (err) {
            console.log('Error', err)
        }
    })

    it(`Call get_fio_addresses for user1. Confirm new address.`, async () => {
        try {
          const json = {
            "fio_public_key": user1.publicKey
          }
          result = await callFioApi("get_fio_addresses", json);
          //console.log('Result: ', result);
          expect(result.fio_addresses.length).to.equal(2)
          expect(result.fio_addresses[1].fio_address).to.equal(user1.address2)
        } catch (err) {
          console.log('Error', err)
          expect(err).to.equal(null)
        }
    })

    it(`Verify balance for user1 = prev_balance - register_fio_address_fee`, async () => {
        let prevBalance = user1Balance;
        try {
          const result = await user1.sdk.genericAction('getFioBalance', {
            fioPublicKey: user1.publicKey
          })
          user1Balance = result.balance
          //console.log('user1 fio balance', result.balance)
          expect(user1Balance).to.equal(prevBalance - register_fio_address_fee)
        } catch (err) {
          //console.log('Error', err)
          expect(err).to.equal(null)
        }
      })

    it(`clio: address renew`, async () => {
        try {
            result = await runClio(`address renew -j ${user1.address2} ${user1.account} ${tpid} ${max_fee} --permission ${user1.account}@active`);
            //console.log('Result: ', JSON.parse(result));
            expect(JSON.parse(result).transaction_id).to.exist
        } catch (err) {
            console.log('Error', err)
        }
    })
    /*
    it.skip(`(Future release) address transfer`, async () => {
        try {
            result = await runClio(`address transfer -j ${user1.account} ${user1.address} ${user2.publicKey} ${tpid} ${max_fee} --permission ${user1.account}@active`);
            //console.log('Result: ', JSON.parse(result));
            expect(JSON.parse(result).transaction_id).to.exist
        } catch (err) {
            console.log('Error', err)
        }
    })

    it.skip(`(Future release) address add_pub. Add BCH address `, async () => {
        try {
            result = await runClio(`address add_pub -j ${user1.account} ${BCHAddress.clioAddress} ${user1.address} ${tpid} ${max_fee} --permission ${user1.account}@active`);
            //console.log('Result: ', JSON.parse(result));
            expect(JSON.parse(result).transaction_id).to.exist
        } catch (err) {
            console.log('Error', err)
        }
    })

    it.skip('(Future release) confirm BCH address was added', async () => {
        try {
          const result = await user1.sdk.genericAction('getPublicAddress', {
            fioAddress: user1.address,
            chainCode: "BCH",
            tokenCode: "BCH"
          })
          //console.log('Result', result)
          expect(result.public_address).to.equal(BCHAddress.public_address)
        } catch (err) {
          //console.log('Error', err)
          expect(err).to.equal(null)
        }
      })

    it.skip(`(Future release) address add_pub. Add DASH address `, async () => {
        try {
            result = await runClio(`address add_pub -j ${user1.account} ${DASHAddress.clioAddress} ${user1.address} ${tpid} ${max_fee} --permission ${user1.account}@active`);
            console.log('Result: ', JSON.parse(result));
            expect(JSON.parse(result).transaction_id).to.exist
        } catch (err) {
            console.log('Error', err)
        }
    })

    it.skip('(Future release) confirm DASH address was added', async () => {
        try {
          const result = await user1.sdk.genericAction('getPublicAddress', {
            fioAddress: user1.address,
            chainCode: "DASH",
            tokenCode: "DASH"
          })
          //console.log('Result', result)
          expect(result.public_address).to.equal(DASHAddress.public_address)
        } catch (err) {
          //console.log('Error', err)
          expect(err).to.equal(null)
        }
      })

    it.skip(`(Future release) address remove_pub for BCH`, async () => {
        try {
            result = await runClio(`address remove_pub -j ${user1.account} ${BCHAddress} ${user1.address} ${tpid} ${max_fee} --permission ${user1.account}@active`);
            console.log('Result: ', JSON.parse(result));
            expect(JSON.parse(result).transaction_id).to.exist
        } catch (err) {
            console.log('Error', err)
        }
    })

    it.skip('(Future release) confirm BCH address was removed', async () => {
        try {
          const result = await user1.sdk.genericAction('getPublicAddress', {
            fioAddress: user1.address,
            chainCode: "BCH",
            tokenCode: "BCH"
          })
          //console.log('Result', result)
        } catch (err) {
          //console.log('Error', err)
          expect(err.json.message).to.equal(config.error.publicAddressFound)
        }
      })

    it.skip(`(Future release) Re-add BCH address`, async () => {
        try {
            result = await runClio(`address add_pub -j ${user1.account} ${BCHAddress.clioAddress} ${user1.address} ${tpid} ${max_fee} --permission ${user1.account}@active`);
            console.log('Result: ', JSON.parse(result));
            expect(JSON.parse(result).transaction_id).to.exist
        } catch (err) {
            console.log('Error', err)
        }
    })

    it.skip(`(Future release) address remove_all_pub`, async () => {
        try {
            result = await runClio(`address remove_all_pub ${user1.account} ${user1.address} ${tpid} ${max_fee} --permission ${user1.account}@active`);
            console.log('Result: ', JSON.parse(result));
            expect(JSON.parse(result).transaction_id).to.exist
        } catch (err) {
            console.log('Error', err)
        }
    })

    it.skip('(Future release) Get all public addresses for user1 FIO Address (get_pub_addresses). Expect only FIO address to be returned.', async () => {
        try {
            const result = await callFioApi("get_pub_addresses", {
            fio_address: user1.address,
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
    */

})

describe(`E. Convert`, () => {

    it(`Create users and import private keys`, async () => {
        user1 = await newUser(faucet);
    })

    it(`convert fiokey_to_account`, async () => {
        try {
            result = await runClio(`convert fiokey_to_account ${user1.publicKey}`);
            //console.log('Result: ', result);
            expect(result).to.equal(user1.account)
        } catch (err) {
            console.log('Error', err)
        }
    })
})

describe(`F. Transfer`, () => {
    let user1, user2, prevFundsAmount
    const fundsAmount = 10000000000

    it(`Create users and import private keys`, async () => {
        user1 = await newUser(faucet);
        result = await runClio('wallet import -n fio --private-key ' + user1.privateKey);

        user2 = await newUser(faucet);
        result = await runClio('wallet import -n fio --private-key ' + user2.privateKey);
    })

    it(`getFioBalance for user2`, async () => {
        try {
          const result = await user2.sdk.genericAction('getFioBalance', { })
          //console.log('Result: ', result)
          prevFundsAmount = result.balance
        } catch (err) {
          expect(err.json.message).to.equal(null)
        }
    })

    it(`clio: transfer ${fundsAmount} FIO to user2 FIO public key`, async () => {
        try {
            result = await runClio(`transfer -j ${user2.publicKey} ${fundsAmount} ${user1.account} ${tpid} ${max_fee} --permission ${user1.account}@active`);
            //console.log('Result: ', JSON.parse(result));
            expect(JSON.parse(result).transaction_id).to.exist
        } catch (err) {
            console.log('Error', err)
        }
    })

    it(`user2's FIO public key has an additional ${fundsAmount} FIO`, async () => {
        const result = await user2.sdk.genericAction('getFioBalance', {})
        //console.log('Result: ', result)
        expect(result.balance).to.equal(fundsAmount + prevFundsAmount)
    })

})

describe(`G. Set ratios and multipliers`, () => {
    let multAmount = 5,
        endpoint1 = "register_fio_domain", ratio1 = 40000000000,
        endpoint2 = "register_fio_address", ratio2 = 50000000000

    it(`Create users and import private keys`, async () => {
        bp1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
        //user1 = await newUser(faucet);
        //result = await runClio('wallet import -n fio --private-key ' + user1.privateKey);
    })

    it(`Show multipliers table.`, async () => {
        try {
          const json = {
            json: true,
            code: 'fio.fee',
            scope: 'fio.fee',
            table: 'feevoters',
            limit: 1000,
            reverse: true,
            show_payer: false
          }
          const table = await callFioApi("get_table_rows", json);
          //console.log('fiovoters table: ', table);
        } catch (err) {
          console.log('Error', err);
          expect(err).to.equal(null);
        }
      })

      it.skip(`(BUG BD-2226) clio: bp1 fee submit_multiplier`, async () => {
        try {
            result = await runClio(`fee submit_multiplier -j ${multAmount} ${bp1.account} --permission ${bp1.account}@active`);
            //console.log('Result: ', JSON.parse(result));
            expect(JSON.parse(result).transaction_id).to.exist
        } catch (err) {
            console.log('Error', err)
        }
    })

    it(`Show multipliers table.`, async () => {
        try {
          const json = {
            json: true,
            code: 'fio.fee',
            scope: 'fio.fee',
            table: 'feevoters',
            limit: 1000,
            reverse: true,
            show_payer: false
          }
          const table = await callFioApi("get_table_rows", json);
          //console.log('fiovoters table: ', table);
        } catch (err) {
          console.log('Error', err);
          expect(err).to.equal(null);
        }
      })

      it(`Show ratios table.`, async () => {
        try {
          const json = {
            json: true,
            code: 'fio.fee',
            scope: 'fio.fee',
            table: 'feevotes2',
            limit: 1000,
            reverse: true,
            show_payer: false
          }
          const table = await callFioApi("get_table_rows", json);
          //console.log('feevotes2 table: ', table);
        } catch (err) {
          console.log('Error', err);
          expect(err).to.equal(null);
        }
      })

      it.skip(`(BUG BD-2226) clio: bp1 fee submit_ratios`, async () => {
        try {
            result = await runClio(`fee submit_ratios -j ${bp1.address} ${bp1.account} ${max_fee} ${endpoint1} ${ratio1} --permission ${bp1.account}@active`);
            //console.log('Result: ', JSON.parse(result));
            expect(JSON.parse(result).transaction_id).to.exist
        } catch (err) {
            console.log('Error', err)
        }
    })

    it(`Show ratios table.`, async () => {
        try {
          const json = {
            json: true,
            code: 'fio.fee',
            scope: 'fio.fee',
            table: 'feevotes2',
            limit: 1000,
            reverse: true,
            show_payer: false
          }
          const table = await callFioApi("get_table_rows", json);
          //console.log('feevotes2 table: ', table);
        } catch (err) {
          console.log('Error', err);
          expect(err).to.equal(null);
        }
      })

})

describe(`H. clio error testing`, () => {
    let user1, user2, fio_request_id
    const fundsAmount = 10000000000

    it(`Create users and import private keys`, async () => {
        user1 = await newUser(faucet);
        result = await runClio('wallet import -n fio --private-key ' + user1.privateKey);

        user2 = await newUser(faucet);
        result = await runClio('wallet import -n fio --private-key ' + user2.privateKey);
    })

    it(`clio: request new (user1 requests funds from user2)`, async () => {
        try {
            const result = await runClio(`request new -j ${user2.address} ${user1.address} ${content} ${user1.account} ${tpid} ${max_fee} --permission ${user1.account}@active`);
            //console.log('Result: ', result)
            fio_request_id = JSON.parse(JSON.parse(result).processed.action_traces[0].receipt.response).fio_request_id
            //console.log('ID: ', JSON.parse(JSON.parse(result).processed.action_traces[0].receipt.response).fio_request_id)
            expect(JSON.parse(result).transaction_id).to.exist
        } catch (err) {
            console.log('Error', err)
            expect(err).to.equal(null)
        }
    })

    it(`clio: request new with account which is not payee. Expect "Missing required authority"`, async () => {
        try {
            const result = await runClio(`request new -j ${user2.address} ${user1.address} ${content} ${user1.account} ${tpid} ${max_fee} --permission ${user2.account}@active`);
            //console.log('Result: ', result)
            expect(result).to.equal(null)
        } catch (err) {
            //console.log('Error: ', err)
            expect(String(err)).to.include('Missing required authority')
        }
    })

    // From FIP-16: max_fee is set to 800000000001 so user does not have to define manually. Any required fee set by the producers under this value will process
    it(`clio: request cancel with inadequate fee succeeds`, async () => {
        try {
            result = await runClio(`request cancel -j ${fio_request_id} ${user1.account} ${tpid} 100 --permission ${user1.account}@active`);
            //console.log('Result: ', result)
            expect(JSON.parse(result).transaction_id).to.exist
        } catch (err) {
            console.log('Error', err)
            expect(err).to.equal(null)
        }
    })

    it(`clio: request reject with invalid request ID`, async () => {
        try {
            result = await runClio(`request reject -j 777 ${user2.account} ${tpid} ${max_fee} --permission ${user2.account}@active`);
            //console.log('Result: ', result)
            expect(result).to.equal(null)
        } catch (err) {
            //console.log('Error', err)
            expect(String(err)).to.include('Error code 400')
        }
    })

    it(`clio: domain register with existing domain`, async () => {
        try {
            result = await runClio(`domain register -j ${user1.domain} ${user1.account} ${user1.publicKey} ${tpid} ${max_fee} --permission ${user1.account}@active`);
            //console.log('Result: ', JSON.parse(result));
            expect(result).to.equal(null)
        } catch (err) {
            //console.log('Error', err)
            expect(String(err)).to.include('FIO domain already registered')
        }
    })
})

