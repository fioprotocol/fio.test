require('mocha')
const {expect} = require('chai')
const {newUser, existingUser, callFioApi, callFioApiSigned, generateFioDomain, generateFioAddress, createKeypair, timeout, fetchJson} = require('../utils.js');
const {FIOSDK} = require('@fioprotocol/fiosdk');
const config = require('../config.js');

let proxy1;
before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson)

  proxy1 = await newUser(faucet);
  try {
    const result = await proxy1.sdk.genericAction('pushTransaction', {
      action: 'regproxy',
      account: 'eosio',
      data: {
        fio_address: proxy1.address,
        actor: proxy1.account,
        max_fee: config.maxFee
      }
    })
   // console.log('Result: ', result)
    // expect(result.status).to.equal('OK')
  } catch (err) {
    console.log('Error: ', err)
    expect(err).to.equal('null')
  }
})

describe(`************************** tpid-autoproxy.js ************************** \n   A. check auto proxy after addaddress`, () => {

  let user1

  it(`Create user`, async () => {
    user1 = await newUser(faucet);
  })

  it(`Add DASH, BCH, ELA address to user1`, async () => {
    try {
      const result = await user1.sdk.genericAction('addPublicAddresses', {
        fioAddress: user1.address,
        publicAddresses: [
          {
            chain_code: 'BCH',
            token_code: 'BCH',
            public_address: 'bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9',
          },
          {
            chain_code: 'DASH',
            token_code: 'DASH',
            public_address: 'XyCyPKzTWvW2XdcYjPaPXGQDCGk946ywEv',
          },
          {
            chain_code: 'ELA',
            token_code: 'ELA',
            public_address: 'EQH6o4xfaR5fbhV8cDbDGRxwJRJn3qeo41',
          }
        ],
        maxFee: config.api.add_pub_address.fee,
        technologyProviderId: proxy1.address
      })
      //console.log('Result:', result)
     // expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`Wait a few seconds.`, async () => { await timeout(6000) })

  it('Confirm user1 is_auto_proxy = 1', async () => {
    let inVotersTable;
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'voters',
        limit: 1000,
        reverse: true,
        show_payer: false
      }
      inVotersTable = false;
      voters = await callFioApi("get_table_rows", json);
      //console.log('voters: ', voter);
      for (voter in voters.rows) {
        if (voters.rows[voter].owner == user1.account) {
          inVotersTable = true;
          break;
        }
      }
      expect(voters.rows[voter].is_auto_proxy).to.equal(1);
      expect(inVotersTable).to.equal(true)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

})
describe(`\n   B. request fio request, requestor auto proxies, expect requestor is auto proxy`, () => {

  let requesting_user, requestee_user;
  let requestid;

  //fio request
  it(`Create users`, async () => {
    requesting_user = await newUser(faucet);
    requestee_user = await newUser(faucet);
  })

  it(`requesting user requests funds from requestee user`, async () => {
    try {
      requesting_user.sdk.setSignedTrxReturnOption(true);
      const preparedTrx = await requesting_user.sdk.genericAction('requestFunds', {
        payerFioAddress: requestee_user.address,
        payeeFioAddress: requesting_user.address,
        payeeTokenPublicAddress: 'thisispayeetokenpublicaddress',
        amount: 2,
        chainCode: 'BTC',
        tokenCode: 'BTC',
        memo: 'services rendered',
        maxFee: config.api.new_funds_request.fee,
        payerFioPublicKey: requestee_user.publicKey,
        technologyProviderId: proxy1.address,
        hash: 'fmwazjvmenfz',  // This is the hash of off-chain data... ?
        offlineUrl: ''
      })

      //console.log('preparedTrx: ', preparedTrx)
      const result = await requesting_user.sdk.executePreparedTrx('new_funds_request', preparedTrx);
     // console.log("result ",result);

      requesting_user.sdk.setSignedTrxReturnOption(false);
      // expect(result.status).to.equal('requested')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null)
    }
  })

  it(`Wait a few seconds.`, async () => { await timeout(6000) })

  it('Confirm requesting account is_auto_proxy = 1', async () => {
    let inVotersTable;
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'voters',
        limit: 1000,
        reverse: true,
        show_payer: false
      }
      inVotersTable = false;
      voters = await callFioApi("get_table_rows", json);
      //console.log('voters: ', voter);
      for (voter in voters.rows) {
        if (voters.rows[voter].owner == requesting_user.account) {
          inVotersTable = true;
          break;
        }
      }
      expect(voters.rows[voter].is_auto_proxy).to.equal(1);
      expect(inVotersTable).to.equal(true)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

})
describe(`\n   C. reject fio request, requestee auto proxies, expect requestee is auto proxy`, () => {

  let requesting_user, requestee_user;
  let requestid;

  //fio request
  it(`Create users`, async () => {
    requesting_user = await newUser(faucet);
    requestee_user = await newUser(faucet);
  })

  it(`requesting user requests funds from requestee user`, async () => {
    try {
      requesting_user.sdk.setSignedTrxReturnOption(true);
      const preparedTrx = await requesting_user.sdk.genericAction('requestFunds', {
        payerFioAddress: requestee_user.address,
        payeeFioAddress: requesting_user.address,
        payeeTokenPublicAddress: 'thisispayeetokenpublicaddress',
        amount: 2,
        chainCode: 'BTC',
        tokenCode: 'BTC',
        memo: 'services rendered',
        maxFee: config.api.new_funds_request.fee,
        payerFioPublicKey: requestee_user.publicKey,
        technologyProviderId: proxy1.address,
        hash: 'fmwazjvmenfz',  // This is the hash of off-chain data... ?
        offlineUrl: ''
      })

      //console.log('preparedTrx: ', preparedTrx)
      const result = await requesting_user.sdk.executePreparedTrx('new_funds_request', preparedTrx);
     // console.log("result ",result);

      requesting_user.sdk.setSignedTrxReturnOption(false);
      // expect(result.status).to.equal('requested')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null)
    }
  })

  it(`Wait a few seconds.`, async () => { await timeout(6000) })

  it(`get_pending_fio_requests for requestee user`, async () => {
    try {
      const result = await requestee_user.sdk.genericAction('getPendingFioRequests', {
        limit: '',
        offset: ''
      })
      //console.log('result: ', result)
      requestid = result.requests[0].fio_request_id;
    //  console.log("request id " ,requestid);
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  })

  //reject request
  it(`requestee user rejects funds request`, async () => {
    try{
      const result = await requestee_user.sdk.genericAction('pushTransaction', {
        action: 'rejectfndreq',
        account: 'fio.reqobt',
        data: {
          "fio_request_id": requestid,
          "max_fee": config.api.cancel_funds_request.fee,
          "tpid": proxy1.address,
          "actor": requestee_user.account
        }
      })
     // console.log('Result:', result)
      // expect(result.status).to.equal('request_rejected')
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it('Confirm requestee account is_auto_proxy = 1', async () => {
    let inVotersTable;
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'voters',
        limit: 1000,
        reverse: true,
        show_payer: false
      }
      inVotersTable = false;
      voters = await callFioApi("get_table_rows", json);
      //console.log('voters: ', voter);
      for (voter in voters.rows) {
        if (voters.rows[voter].owner == requestee_user.account) {
          inVotersTable = true;
          break;
        }
      }
      expect(voters.rows[voter].is_auto_proxy).to.equal(1);
      expect(inVotersTable).to.equal(true)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

})
describe(`\n   D. cancel fio request, requestor auto proxies, expect requestor is auto proxy`, () => {

  let requesting_user, requestee_user;
  let requestid;

  //fio request
  it(`Create users`, async () => {
    requesting_user = await newUser(faucet);
    requestee_user = await newUser(faucet);
  })

  it(`requesting user requests funds from requestee user`, async () => {
    try {
      requesting_user.sdk.setSignedTrxReturnOption(true);
      const preparedTrx = await requesting_user.sdk.genericAction('requestFunds', {
        payerFioAddress: requestee_user.address,
        payeeFioAddress: requesting_user.address,
        payeeTokenPublicAddress: 'thisispayeetokenpublicaddress',
        amount: 2,
        chainCode: 'BTC',
        tokenCode: 'BTC',
        memo: 'services rendered',
        maxFee: config.api.new_funds_request.fee,
        payerFioPublicKey: requestee_user.publicKey,
        technologyProviderId: '',
        hash: 'fmwazjvmenfz',  // This is the hash of off-chain data... ?
        offlineUrl: ''
      })

      //console.log('preparedTrx: ', preparedTrx)
      const result = await requesting_user.sdk.executePreparedTrx('new_funds_request', preparedTrx);
     // console.log("result ",result);

      requesting_user.sdk.setSignedTrxReturnOption(false);
      // expect(result.status).to.equal('requested')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null)
    }
  })

  it(`Wait a few seconds.`, async () => { await timeout(6000) })

  it(`get_pending_fio_requests for requestee user`, async () => {
    try {
      const result = await requestee_user.sdk.genericAction('getPendingFioRequests', {
        limit: '',
        offset: ''
      })
      //console.log('result: ', result)
      requestid = result.requests[0].fio_request_id;
     // console.log("request id " ,requestid);
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  })

  it(`requesting user Call cancel_funds_request`, async () => {
    try{
      const result = await requesting_user.sdk.genericAction('cancelFundsRequest', {
        fioRequestId: requestid,
        maxFee: config.maxFee,
        technologyProviderId: proxy1.address
      })
      //console.log('Result: ', result);
      expect(result).to.have.any.keys('status');
      expect(result).to.have.any.keys('fee_collected');
      expect(result).to.have.any.keys('block_num');
      expect(result).to.have.any.keys('transaction_id');
      expect(result.status).to.equal('cancelled');
      //expect(result.fee_collected).to.equal(cancel_funds_request_fee);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })


  it('Confirm requestee account is_auto_proxy = 1', async () => {
    let inVotersTable;
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'voters',
        limit: 1000,
        reverse: true,
        show_payer: false
      }
      inVotersTable = false;
      voters = await callFioApi("get_table_rows", json);
      //console.log('voters: ', voter);
      for (voter in voters.rows) {
        if (voters.rows[voter].owner == requesting_user.account) {
          inVotersTable = true;
          break;
        }
      }
      expect(voters.rows[voter].is_auto_proxy).to.equal(1);
      expect(inVotersTable).to.equal(true)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })



})
describe(`\n   E. record OBT, payer auto proxies, expect payor is auto proxy`, () => {


  let payer_user, payee_user;

  //fio request
  it(`Create users`, async () => {
    payer_user = await newUser(faucet);
    payee_user = await newUser(faucet);
  })


  it(`record_obt_data`, async () => {
    try {
      const result = await payer_user.sdk.genericAction('recordObtData', {
        payerFioAddress: payer_user.address,
        payeeFioAddress: payee_user.address,
        payerTokenPublicAddress: payer_user.publicKey,
        payeeTokenPublicAddress: payee_user.publicKey,
        amount: 5000000000,
        chainCode: "BTC",
        tokenCode: "BTC",
        status: '',
        obtId: '',
        maxFee: config.api.record_obt_data.fee,
        technologyProviderId: proxy1.address,
        payeeFioPublicKey: payee_user.publicKey,
        memo: 'this is a test',
        hash: '',
        offLineUrl: ''
      })
     // console.log('Result: ', result)
      //expect(result.status).to.equal('sent_to_blockchain')
    } catch (err) {
      console.log('Error', err.json)
      expect(err).to.equal(null)
    }
  })

  it('Confirm payer account is_auto_proxy = 1', async () => {
    let inVotersTable;
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'voters',
        limit: 1000,
        reverse: true,
        show_payer: false
      }
      inVotersTable = false;
      voters = await callFioApi("get_table_rows", json);
      //console.log('voters: ', voter);
      for (voter in voters.rows) {
        if (voters.rows[voter].owner == payer_user.account) {
          inVotersTable = true;
          break;
        }
      }
      expect(voters.rows[voter].is_auto_proxy).to.equal(1);
      expect(inVotersTable).to.equal(true)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

})
describe(`\n   F. remove pub address, acting account auto proxies, expect actor is auto proxy`, () => {

  let user1

  it(`Create user`, async () => {
    user1 = await newUser(faucet);
  })

  it(`Add DASH, BCH, ELA address to user1`, async () => {
    try {
      const result = await user1.sdk.genericAction('addPublicAddresses', {
        fioAddress: user1.address,
        publicAddresses: [
          {
            chain_code: 'BCH',
            token_code: 'BCH',
            public_address: 'bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9',
          },
          {
            chain_code: 'DASH',
            token_code: 'DASH',
            public_address: 'XyCyPKzTWvW2XdcYjPaPXGQDCGk946ywEv',
          },
          {
            chain_code: 'ELA',
            token_code: 'ELA',
            public_address: 'EQH6o4xfaR5fbhV8cDbDGRxwJRJn3qeo41',
          }
        ],
        maxFee: config.api.add_pub_address.fee,
        technologyProviderId: ''
      })
      //console.log('Result:', result)
      // expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`Wait a few seconds.`, async () => { await timeout(6000) })


  it(`Remove FIO address from user1.`, async () => {
    try {
      const result = await user1.sdk.genericAction('removePublicAddresses', {
        fioAddress: user1.address,
        publicAddresses: [
          {
            chain_code: 'DASH',
            token_code: 'DASH',
            public_address: 'XyCyPKzTWvW2XdcYjPaPXGQDCGk946ywEv',
          }
        ],
        maxFee: config.api.remove_pub_address.fee,
        tpid: proxy1.address
      })
      //console.log('Result:', result)
      expect(result).to.have.any.keys('status');
      expect(result).to.have.any.keys('fee_collected');
      expect(result).to.have.any.keys('block_num');
      expect(result).to.have.any.keys('transaction_id');
      expect(result.status).to.equal('OK');
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it('Confirm user1 account is_auto_proxy = 1', async () => {
    let inVotersTable;
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'voters',
        limit: 1000,
        reverse: true,
        show_payer: false
      }
      inVotersTable = false;
      voters = await callFioApi("get_table_rows", json);
      //console.log('voters: ', voter);
      for (voter in voters.rows) {
        if (voters.rows[voter].owner == user1.account) {
          inVotersTable = true;
          break;
        }
      }
      expect(voters.rows[voter].is_auto_proxy).to.equal(1);
      expect(inVotersTable).to.equal(true)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })


})
describe(`\n   G. remove all pub addresses, acting account auto proxies, expect actor is auto proxy`, () => {

  let user1

  it(`Create user`, async () => {
    user1 = await newUser(faucet);
  })

  it(`Add DASH, BCH, ELA address to user1`, async () => {
    try {
      const result = await user1.sdk.genericAction('addPublicAddresses', {
        fioAddress: user1.address,
        publicAddresses: [
          {
            chain_code: 'BCH',
            token_code: 'BCH',
            public_address: 'bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9',
          },
          {
            chain_code: 'DASH',
            token_code: 'DASH',
            public_address: 'XyCyPKzTWvW2XdcYjPaPXGQDCGk946ywEv',
          },
          {
            chain_code: 'ELA',
            token_code: 'ELA',
            public_address: 'EQH6o4xfaR5fbhV8cDbDGRxwJRJn3qeo41',
          }
        ],
        maxFee: config.api.add_pub_address.fee,
        technologyProviderId: ''
      })
      //console.log('Result:', result)
      // expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`Wait a few seconds.`, async () => { await timeout(6000) })


  it('removeAllPublicAddresses', async () => {
    try {
      const result = await user1.sdk.genericAction('removeAllPublicAddresses', {
        fioAddress: user1.address,
        maxFee: config.api.add_pub_address.fee,
        technologyProviderId: proxy1.address
      })
      //console.log('Result', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it('Confirm user1 account is_auto_proxy = 1', async () => {
    let inVotersTable;
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'voters',
        limit: 1000,
        reverse: true,
        show_payer: false
      }
      inVotersTable = false;
      voters = await callFioApi("get_table_rows", json);
      //console.log('voters: ', voter);
      for (voter in voters.rows) {
        if (voters.rows[voter].owner == user1.account) {
          inVotersTable = true;
          break;
        }
      }
      expect(voters.rows[voter].is_auto_proxy).to.equal(1);
      expect(inVotersTable).to.equal(true)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

})
describe(`\n   H. burn address, acting account auto proxies, expect actor is auto proxy`, () => {

  let user1

  it(`Create user`, async () => {
    user1 = await newUser(faucet);
  })

  it(`Burn user1.address. Expect status = 'OK'. Expect fee_collected = 0`, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'burnaddress',
        account: 'fio.address',
        actor: user1.account,
        privKey: user1.privateKey,
        data: {
          "fio_address": user1.address,
          "max_fee": config.api.burn_fio_address.fee,
          "tpid": proxy1.address,
          "actor": user1.account
        }
      })
      //console.log('Result: ', JSON.parse(result.processed.action_traces[0].receipt.response));
      expect(JSON.parse(result.processed.action_traces[0].receipt.response).status).to.equal('OK');
      expect(JSON.parse(result.processed.action_traces[0].receipt.response).fee_collected).to.equal(0);
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  })

  it('Confirm user1 account is_auto_proxy = 1', async () => {
    let inVotersTable;
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'voters',
        limit: 1000,
        reverse: true,
        show_payer: false
      }
      inVotersTable = false;
      voters = await callFioApi("get_table_rows", json);
      //console.log('voters: ', voter);
      for (voter in voters.rows) {
        if (voters.rows[voter].owner == user1.account) {
          inVotersTable = true;
          break;
        }
      }
      expect(voters.rows[voter].is_auto_proxy).to.equal(1);
      expect(inVotersTable).to.equal(true)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })


})
describe(`\n   I. add_nft, acting account auto proxies, expect actor is auto proxy`, () => {
  let user1;

  const fundsAmount = 10000000000000

  before(async () => {
    user1 = await newUser(faucet);
  })

  it(`add_nft' to user1 FIO Address`, async () => {
    try {
      const result = await callFioApiSigned('add_nft', {
        action: 'addnft',
        account: 'fio.address',
        actor: user1.account,
        privKey: user1.privateKey,
        data: {
          fio_address: user1.address,
          nfts: [{
            "chain_code": "ETH", "contract_address": "0x123456789ABCDEF", "token_id": "1", "url": "", "hash": "", "metadata": ""
          }],
          max_fee: config.maxFee,
          actor: user1.account,
          tpid: proxy1.address
        }
      })
      //console.log('Result: ', result.processed.action_traces[0].receipt.response)
      expect(result.processed.action_traces[0].receipt.response).to.contain("OK");
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null);
    }
  })

  it('Confirm user1 account is_auto_proxy = 1', async () => {
    let inVotersTable;
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'voters',
        limit: 1000,
        reverse: true,
        show_payer: false
      }
      inVotersTable = false;
      voters = await callFioApi("get_table_rows", json);
      //console.log('voters: ', voter);
      for (voter in voters.rows) {
        if (voters.rows[voter].owner == user1.account) {
          inVotersTable = true;
          break;
        }
      }
      expect(voters.rows[voter].is_auto_proxy).to.equal(1);
      expect(inVotersTable).to.equal(true)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

});
describe(`\n   J. remove_nft, acting account auto proxies, expect actor is auto proxy`, () => {
  let user1;

  const fundsAmount = 10000000000000

  before(async () => {
    user1 = await newUser(faucet);
  })

  it(`add_nft' to user1 FIO Address`, async () => {
    try {
      const result = await callFioApiSigned('add_nft', {
        action: 'addnft',
        account: 'fio.address',
        actor: user1.account,
        privKey: user1.privateKey,
        data: {
          fio_address: user1.address,
          nfts: [{
            "chain_code": "ETH", "contract_address": "0x123456789ABCDEF", "token_id": "1", "url": "", "hash": "", "metadata": ""
          }],
          max_fee: config.maxFee,
          actor: user1.account,
          tpid: ''
        }
      })
      //console.log('Result: ', result.processed.action_traces[0].receipt.response)
      expect(result.processed.action_traces[0].receipt.response).to.contain("OK");
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null);
    }
  })

  it(`verify user1 NFT is present in table`, async () => {
    try {
      const json = {
        "fio_address": user1.address
      }
      result = await callFioApi("get_nfts_fio_address", json);
      //console.log(`Result: `, result)
      expect(result.nfts.length).to.not.equal(0)
      expect(result.nfts[0].chain_code).to.equal("ETH")
      expect(result.nfts[0].contract_address).to.equal("0x123456789ABCDEF")
      expect(result.nfts[0].token_id).to.equal("1")
    } catch (err) {
      //console.log('Error', err)
      expect(err).to.equal(null);
    }
  })

  it('Wait 5 seconds. (Slower test systems)', async () => {
    await timeout(5000);
  })

  it(`remove_nft from user1 FIO Address`, async () => {
    try {
      const result = await callFioApiSigned('remove_nft', {
        action: 'remnft',
        account: 'fio.address',
        actor: user1.account,
        privKey: user1.privateKey,
        data: {
          fio_address: user1.address,
          nfts: [{
            "chain_code": "ETH", "contract_address": "0x123456789ABCDEF", "token_id": "1", "url": "", "hash": "", "metadata": ""
          }],
          max_fee: config.maxFee,
          actor: user1.account,
          tpid: proxy1.address
        }
      })
      //console.log('Result: ', result)
      expect(result.processed.action_traces[0].receipt.response).to.contain("OK");
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null);
    }
  })

  it('Confirm user1 account is_auto_proxy = 1', async () => {
    let inVotersTable;
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'voters',
        limit: 1000,
        reverse: true,
        show_payer: false
      }
      inVotersTable = false;
      voters = await callFioApi("get_table_rows", json);
      //console.log('voters: ', voter);
      for (voter in voters.rows) {
        if (voters.rows[voter].owner == user1.account) {
          inVotersTable = true;
          break;
        }
      }
      expect(voters.rows[voter].is_auto_proxy).to.equal(1);
      expect(inVotersTable).to.equal(true)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })


});
describe(`\n   K. remove all nfts, acting account auto proxies, expect actor is auto proxy`, () => {
  let user1;

  const fundsAmount = 10000000000000

  before(async () => {
    user1 = await newUser(faucet);
  })

  it(`add_nft' to user1 FIO Address`, async () => {
    try {
      const result = await callFioApiSigned('add_nft', {
        action: 'addnft',
        account: 'fio.address',
        actor: user1.account,
        privKey: user1.privateKey,
        data: {
          fio_address: user1.address,
          nfts: [{
            "chain_code": "ETH", "contract_address": "0x123456789ABCDEF", "token_id": "1", "url": "", "hash": "", "metadata": ""
          }],
          max_fee: config.maxFee,
          actor: user1.account,
          tpid: ''
        }
      })
      //console.log('Result: ', result.processed.action_traces[0].receipt.response)
      expect(result.processed.action_traces[0].receipt.response).to.contain("OK");
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null);
    }
  })



  it(`verify user1 NFT is present in table`, async () => {
    try {
      const json = {
        "fio_address": user1.address
      }
      result = await callFioApi("get_nfts_fio_address", json);
      //console.log(`Result: `, result)
      expect(result.nfts.length).to.not.equal(0)
      expect(result.nfts[0].chain_code).to.equal("ETH")
      expect(result.nfts[0].contract_address).to.equal("0x123456789ABCDEF")
      expect(result.nfts[0].token_id).to.equal("1")
    } catch (err) {
      //console.log('Error', err)
      expect(err).to.equal(null);
    }
  })

  it('Wait 5 seconds. (Slower test systems)', async () => {
    await timeout(5000);
  })




  it(`remove_all_nfts from user1 FIO Address`, async () => {
    try {
      const result = await callFioApiSigned('remove_all_nfts', {
        action: 'remallnfts',
        account: 'fio.address',
        actor: user1.account,
        privKey: user1.privateKey,
        data: {
          fio_address: user1.address,
          max_fee: config.maxFee,
          actor: user1.account,
          tpid: proxy1.address
        }
      })
      //console.log('Result: ', result)
      expect(result.processed.action_traces[0].receipt.response).to.contain("OK");
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null);
    }
  })

  it('Confirm user1 account is_auto_proxy = 1', async () => {
    let inVotersTable;
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'voters',
        limit: 1000,
        reverse: true,
        show_payer: false
      }
      inVotersTable = false;
      voters = await callFioApi("get_table_rows", json);
      //console.log('voters: ', voter);
      for (voter in voters.rows) {
        if (voters.rows[voter].owner == user1.account) {
          inVotersTable = true;
          break;
        }
      }
      expect(voters.rows[voter].is_auto_proxy).to.equal(1);
      expect(inVotersTable).to.equal(true)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

});
