require('mocha')
const {expect} = require('chai')
const {newUser, randStr, generateFioDomain, generateFioAddress, unlockWallet, callFioApi, fetchJson} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/FIOSDK')
config = require('../config.js');

const exec = require('child_process').exec;
const clio = "../fio.devtools/bin/clio";
const url = config.URL

const max_fee = 80000000000
const tpid = 'tpid@testnet'
const randString = randStr(10)
const content = `"one ${randString}"`
const content2 = `"two ${randString}"`

async function runClio(parms) {
    return new Promise(function(resolve, reject) {
        command = clio + " -u " + url + " " + parms
        console.log('command = ', command)
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
    let fio_request_id, user1, user2

    it(`Create users and import private keys`, async () => {
        user1 = await newUser(faucet);
        result = await runClio('wallet import -n fio --private-key ' + user1.privateKey);
        user2 = await newUser(faucet);
        result = await runClio('wallet import -n fio --private-key ' + user2.privateKey);
    })

    it(`Request new`, async () => {
        result = await runClio(`request new ${user1.account} ${user1.address} ${user2.address} ${content} ${tpid} ${max_fee}`);
        console.log('Result: ', result)
        //fio_request_id = result.something
    })

    it(`Request reject`, async () => {
        result = await runClio(`request reject ${user2.account} ${fio_request_id} ${tpid} ${max_fee}`);
        console.log('Result: ', result)
    })

    it(`Request new`, async () => {
        result = await runClio(`request new ${user1.account} ${user1.address} ${user2.address} ${content} ${tpid} ${max_fee}`);
        console.log('Result: ', result)
        //fio_request_id = result.something
    })

    it(`Request cancel`, async () => {
        result = await runClio(`request cancel ${user1.account} ${fio_request_id} ${tpid} ${max_fee}`);
        console.log('Result: ', result)
    })

    it(`Request new`, async () => {
        result = await runClio(`request new ${user1.account} ${user1.address} ${user2.address} ${content} ${tpid} ${max_fee}`);
        console.log('Result: ', result)
         //fio_request_id = result.something
    })

    it(`Record`, async () => {
        result = await runClio(`data record ${user1.account} ${fio_request_id} ${user1.address} ${user2.address} ${content2} ${tpid} ${max_fee}`);
        console.log('Result: ', result)
    })

})
describe(`C. Domain`, () => {
    let user1, user2

    it(`Create users and import private keys`, async () => {
        user1 = await newUser(faucet);
        result = await runClio('wallet import -n fio --private-key ' + user1.privateKey);
        user1.domain2 = generateFioDomain(7)

        user2 = await newUser(faucet);
        result = await runClio('wallet import -n fio --private-key ' + user2.privateKey);
    })

    it(`domain register`, async () => {
        result = await runClio(`domain register ${user1.account} ${user1.domain2} ${user1.publicKey} ${tpid} ${max_fee}`);
        expect(JSON.parse(result).head_block_num).to.be.a('number')
    })

    it(`domain renew`, async () => {
        result = await runClio(`domain renew ${user1.account} ${user1.domain2} ${tpid} ${max_fee}`);
        expect(JSON.parse(result).head_block_num).to.be.a('number')
    })

    it(`domain set_public`, async () => {
        result = await runClio(`domain set_public ${user1.account} ${user1.domain2} true ${tpid} ${max_fee}`);
        expect(JSON.parse(result).head_block_num).to.be.a('number')
    })

    it(`domain transfer`, async () => {
        result = await runClio(`domain set_public ${user1.account} ${user1.domain2} ${user2.publicKey} ${tpid} ${max_fee}`);
        expect(JSON.parse(result).head_block_num).to.be.a('number')
    })

})

describe(`D. Address`, () => {
    let user1, user2

    let publicAddresses = [
        {
          chain_code: 'BCH',
          token_code: 'BCH',
          public_address: 'bitcoincash:qg9',
          },
        {
          chain_code: 'DASH',
          token_code: 'DASH',
          public_address: 'XyCyPKzTWvW2XdcYjPaPXGQDCGk946ywEv',
        }
      ]

    it(`Create users and import private keys`, async () => {
        user1 = await newUser(faucet);
        result = await runClio('wallet import -n fio --private-key ' + user1.privateKey);
        user1.address2 = generateFioAddress(user1.domain)

        user2 = await newUser(faucet);
        result = await runClio('wallet import -n fio --private-key ' + user2.privateKey);
    })

    it(`address register`, async () => {
        result = await runClio(`address register ${user1.account} ${user1.address2} ${user1.publicKey} ${tpid} ${max_fee}`);
        expect(JSON.parse(result).head_block_num).to.be.a('number')
    })

    it(`address renew`, async () => {
        result = await runClio(`domain renew ${user1.account} ${user1.address2} ${tpid} ${max_fee}`);
        expect(JSON.parse(result).head_block_num).to.be.a('number')
    })

    it(`address transfer`, async () => {
        result = await runClio(`domain set_public ${user1.account} ${user1.address} ${user2.publicKey} ${tpid} ${max_fee}`);
        expect(JSON.parse(result).head_block_num).to.be.a('number')
    })

    it(`address add_pub. Add BCH address `, async () => {
        result = await runClio(`address add_pub ${user1.account} ${publicAddresses[0].chain_code} ${publicAddresses[0].token_code} ${publicAddresses[0].public_address} ${user1.address} ${tpid} ${max_fee}`);
        expect(JSON.parse(result).head_block_num).to.be.a('number')
    })

    it(`address add_pub. Add DASH address `, async () => {
        result = await runClio(`address add_pub ${user1.account} ${publicAddresses[1].chain_code} ${publicAddresses[1].token_code} ${publicAddresses[1].public_address} ${user1.address} ${tpid} ${max_fee}`);
        expect(JSON.parse(result).head_block_num).to.be.a('number')
    })

    it(`address remove_pub for BCH`, async () => {
        result = await runClio(`address remove_pub ${user1.account} ${publicAddresses[0].chain_code} ${publicAddresses[0].token_code} ${publicAddresses[0].public_address} ${user1.address} ${tpid} ${max_fee}`);
        expect(JSON.parse(result).head_block_num).to.be.a('number')
    })

    it('confirm BCH address was removed', async () => {
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

    it(`Re-add BCH address`, async () => {
        result = await runClio(`address add_pub ${user1.account} ${publicAddresses[0].chain_code} ${publicAddresses[0].token_code} ${publicAddresses[0].public_address} ${user1.address} ${tpid} ${max_fee}`);
        expect(JSON.parse(result).head_block_num).to.be.a('number')
    })

    it(`address remove_all_pub`, async () => {
        result = await runClio(`address remove_all_pub ${user1.account} ${user1.address} ${tpid} ${max_fee}`);
        expect(JSON.parse(result).head_block_num).to.be.a('number')
    })

    it('Get all public addresses for user1 FIO Address (get_pub_addresses). Expect only FIO address to be returned.', async () => {
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
        result = await runClio(`convert fiokey_to_account ${user1.publicKey}`);
        expect(JSON.parse(result).head_block_num).to.equal(user1.account)
    })
})

describe(`F. Transfer`, () => {
    let user1, user2, prevFundsAmount
    const fundsAmount = 1000000000000

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
        result = await runClio(`transfer ${user2.publicKey} ${fundsAmount} ${max_fee} ${user1.account} ${tpid}`);
        expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected')
    })
          
    it(`user2's FIO public key has an additional ${fundsAmount} FIO`, async () => {
        const result = await user2.sdk.genericAction('getFioBalance', {})
        //console.log('Result: ', result)
        expect(result.balance).to.equal(fundsAmount + prevFundsAmount)
    })

})