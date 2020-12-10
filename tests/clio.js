require('mocha')
const {expect} = require('chai')
const {newUser, randStr, generateFioDomain, generateFioAddress, unlockWallet, callFioApi, fetchJson} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/FIOSDK')
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

    result = await unlockWallet('fio');
})

describe(`************************** clio.js ************************** \n A. Test clio`, () => {

    it(`get info`, async () => {
        result = await runClio('get info');
        expect(JSON.parse(result).head_block_num).to.be.a('number')
      })
})

describe(`B. Request and OBT Data`, () => {
    let fio_request_id, fio_request_id2, fio_request_id3, user1, user2

    it(`Create users and import private keys`, async () => {
        user1 = await newUser(faucet);
        result = await runClio('wallet import -n fio --private-key ' + user1.privateKey);
        user2 = await newUser(faucet);
        result = await runClio('wallet import -n fio --private-key ' + user2.privateKey);
    })

    it(`Request new`, async () => {
        try {
            result = await runClio(`request new -j ${user2.address} ${user1.address} ${content} ${user1.account} ${tpid} ${max_fee} --permission ${user1.account}@active`);
            //console.log('Result: ', result)
            fio_request_id = JSON.parse(JSON.parse(result).processed.action_traces[0].receipt.response).fio_request_id
            //console.log('ID: ', JSON.parse(JSON.parse(result).processed.action_traces[0].receipt.response).fio_request_id)
            expect(JSON.parse(result).transaction_id).to.exist
        } catch (err) {
        console.log('Error', err)
        expect(err).to.equal(null)
        }
    })

    it(`Request reject`, async () => {
        try {
            result = await runClio(`request reject -j ${fio_request_id} ${user2.account} ${tpid} ${max_fee} --permission ${user2.account}@active`);
            //console.log('Result: ', result)
            expect(JSON.parse(result).transaction_id).to.exist
        } catch (err) {
            console.log('Error', err)
            expect(err).to.equal(null)
        }
    })

    it(`Request new`, async () => {
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

    it(`Request cancel`, async () => {
        try {
            result = await runClio(`request cancel -j ${fio_request_id2} ${user2.account} ${tpid} ${max_fee} --permission ${user2.account}@active`);
            //console.log('Result: ', result)
            expect(JSON.parse(result).transaction_id).to.exist
        } catch (err) {
            console.log('Error', err)
            expect(err).to.equal(null)
        }
    })

    it(`Request new`, async () => {
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

    it(`Record`, async () => {
        try {
            result = await runClio(`data record -j ${fio_request_id3} ${user2.address} ${user1.address} ${content3} ${user2.account} ${tpid} ${max_fee} --permission ${user2.account}@active`);
            //console.log('Result: ', result)
        } catch (err) {
            console.log('Error', err)
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
          console.log('user1 fio balance', result.balance)
        } catch (err) {
          //console.log('Error', err)
          expect(err).to.equal(null)
        }
      })

    it(`domain register`, async () => {
        try {
            result = await runClio(`domain register -j ${user1.domain2} ${user1.account} ${user1.publicKey} ${tpid} ${max_fee} --permission ${user1.account}@active`);
            //console.log('Result: ', JSON.parse(result));
            expect(JSON.parse(result).transaction_id).to.exist
        } catch (err) {
            console.log('Error', err)
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

    it(`domain renew`, async () => {
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

    it(`domain set_public`, async () => {
        try {
            result = await runClio(`domain set_public -j ${user1.domain2} 1 ${user1.account} ${tpid} ${max_fee} --permission ${user1.account}@active`);
            //console.log('Result: ', JSON.parse(result));
            expect(JSON.parse(result).transaction_id).to.exist
        } catch (err) {
            console.log('Error', err)
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

    it(`domain transfer`, async () => {
        try {
            result = await runClio(`domain transfer -j ${user1.domain2} ${user1.account} ${user2.publicKey} ${tpid} ${max_fee} --permission ${user1.account}@active`);
            //console.log('Result: ', JSON.parse(result));
            expect(JSON.parse(result).transaction_id).to.exist
        } catch (err) {
            console.log('Error', err)
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
            console.log('Domain Fee: ', register_fio_address_fee)
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
          console.log('user1 fio balance', result.balance)
        } catch (err) {
          //console.log('Error', err)
          expect(err).to.equal(null)
        }
      })

    it(`address register`, async () => {
        try {
            result = await runClio(`address register -j ${user1.address2} ${user1.account} ${user1.publicKey} ${tpid} ${max_fee} --permission ${user1.account}@active`);
            //console.log('Result: ', JSON.parse(result));
            expect(JSON.parse(result).transaction_id).to.exist
        } catch (err) {
            console.log('Error', err)
        }
    })

    it(`Verify balance for user1 = prev_balance - register_fio_address_fee`, async () => {
        let prevBalance = user1Balance;
        try {
          const result = await user1.sdk.genericAction('getFioBalance', {
            fioPublicKey: user1.publicKey
          })
          user1Balance = result.balance
          console.log('user1 fio balance', result.balance)
          expect(user1Balance).to.equal(prevBalance - register_fio_address_fee)
        } catch (err) {
          //console.log('Error', err)
          expect(err).to.equal(null)
        }
      })

    it(`address renew`, async () => {
        try {
            result = await runClio(`address renew -j ${user1.address2} ${user1.account} ${tpid} ${max_fee} --permission ${user1.account}@active`);
            //console.log('Result: ', JSON.parse(result));
            expect(JSON.parse(result).transaction_id).to.exist
        } catch (err) {
            console.log('Error', err)
        }
    })

    it.skip(`(Future release) address transfer`, async () => {
        try {
            result = await runClio(`address transfer -j ${user1.account} ${user1.address} ${user2.publicKey} ${tpid} ${max_fee} --permission ${user1.account}@active`);
            console.log('Result: ', JSON.parse(result));
            expect(JSON.parse(result).transaction_id).to.exist
        } catch (err) {
            console.log('Error', err)
        }
    })

    it.skip(`(Future release) address add_pub. Add BCH address `, async () => {
        try {
            result = await runClio(`address add_pub -j ${user1.account} ${BCHAddress.clioAddress} ${user1.address} ${tpid} ${max_fee} --permission ${user1.account}@active`);
            console.log('Result: ', JSON.parse(result));
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

    it(`transfer ${fundsAmount} FIO to user2 FIO public key`, async () => {
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

describe(`G. Vote Producer`, () => {
    let user1

    it(`Create users and import private keys`, async () => {
        user1 = await newUser(faucet);
        result = await runClio('wallet import -n fio --private-key ' + user1.privateKey);
    })

    it(`userA1 votes for bp@dapixdev`, async () => {
        try {
            result = await runClio(`system voteproducer prods -j ${user1.address} ${user1.account} ${max_fee} bp1@dapixdev --permission ${user1.account}@active`);
            //console.log('Result: ', JSON.parse(result));
            expect(JSON.parse(result).transaction_id).to.exist
        } catch (err) {
            console.log('Error', err)
        }
    })

})