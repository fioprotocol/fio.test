require('mocha')
const {expect} = require('chai')
const {newUser, existingUser, getTestType, getProdVoteTotal, timeout, getBundleCount, getAccountVoteWeight, getTotalVotedFio, callFioApi, fetchJson} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk');
const config = require('../config.js');
const { readBufferWithDetectedEncoding } = require('tslint/lib/utils');
const testType = getTestType();

let calling_account;
/*
 This test tool will invoke auditvote on the target environment.
 the tool will call audit vote until phase 4 is completed by the audit vote engine.
 the account used to call auditvote must have adequate funds to pay the fee of auditvote each time it is called
 see setup for further details.
 */

/* SETUP --
      onNetAccount is used when running on test net or main net, it should contain the
      keys and account for an account on the chain that is funded with enough
      FIO to cover the fees of calling the auditvote the number of time required
      to perform the audit, it is recommended that the account be funded with enough
      FIO to call auditvote 250 times.

      onNetAccout is NOT used when running on a private test net, instead the faucet
      is used to create and fund the account used to call auditvote.

      test net account that may be used (NOTE please verify account balance before running)
      account: 'v2lgwcdkb5gn',
      publicKey: 'FIO8k7N7jU9eyj57AfazGxMuvPGZG5hvXNUyxt9pBchnkXXx9KUuD',
      privateKey: '5Jw78NzS2QMvjcyemCgJ9XQv8SMSEvTEuLxF8TcKf27xWcX5fmw'

      for main net account info please contact the FIO release manager.

 */
const onNetAccount = {
  account: 'v2lgwcdkb5gn',
  publicKey: 'FIO8k7N7jU9eyj57AfazGxMuvPGZG5hvXNUyxt9pBchnkXXx9KUuD',
  privateKey: '5Jw78NzS2QMvjcyemCgJ9XQv8SMSEvTEuLxF8TcKf27xWcX5fmw'
}
const sdkAcc = {
  sdk: 'undefined',
  account: 'undefined'
}


/* SETUP
    for private test net use the following block

    //local private network setup
    faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
    calling_account = await newUser(faucet);

    for test net main net use use the following block

    //testnet main net setup
    let analysis_sdk = new FIOSDK(onNetAccount.privateKey, onNetAccount.publicKey, config.BASE_URL, fetchJson);
    let tacc = sdkAcc
    tacc.sdk = analysis_sdk
    calling_account = tacc;
    calling_account.account = onNetAccount.account;
 */
before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);

  calling_account = await newUser(faucet);
})




describe(' A. call audit vote until phase 4 completes or max calls exceeded', () => {
  let  phase_change = 0


  it(`call audit vote until it has completed phase 4, max number of calls to audit vote is 100`, async () => {
    try {
      let audit_phase = '10' //init to phase number not used by audit
      let last_phase = "9" //init to phase not used by audit
      let n_called = 0;  //number times called this run
      let max_calls_audit = 100; //max number of times to call the auditvote

      console.log("          this test will call audit a max of "+max_calls_audit+" times")

      //do until the next audit phase is 1 and the previous phase completed is 4
      while(!((audit_phase.localeCompare('1') == 0)&&(last_phase.localeCompare('4') == 0)) ) {

        n_called++;
        const result = await calling_account.sdk.genericAction('pushTransaction', {
          action: 'auditvote',
          account: 'eosio',
          data: {
            actor: calling_account.account,
            max_fee: config.api.audit_vote.fee
          }
        })

          last_phase = audit_phase;
        audit_phase = result.audit_phase

        //if there is lots of voters the account may run out of funds and
        //throw exceptions...
        if(n_called > max_calls_audit) {
          console.log("max number of calls to auditvote exceeded, to continue run this step again");
          break;
        }

        let tx = "completed call to audit vote ";
        if (last_phase != 10){
          tx = tx + " phase executed is " + last_phase + " next phase is " + audit_phase;
        } else {
          tx = tx + " next phase is " + audit_phase;
        }
        console.log("       ", tx);
        //phase 4 reports no records processed, do not output records processed if its 0 its just confusing.
        if (result.records_processed > 0) {
          console.log("          records processed " + result.records_processed)
        }
        expect(result.status).to.equal('OK')
        expect(result.fee_collected).to.equal(config.api.audit_vote.fee)

        await timeout(3000)
      }
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal('null');
    }
  })


})
