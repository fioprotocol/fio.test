require('mocha')
const {expect} = require('chai')
const {newUser, fetchJson, generateFioDomain, generateFioAddress, timeout, createKeypair, callFioApi} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
config = require('../config.js');

/*
SETUPREQUIRED!!!!!!!!!!
these are one off tests that introduce unexpected data into the voters and general locks,
   this test requires custom actions to be added to the contracts, and also to the list of allowed actions
   on the FIO protocol.

   add 2 new test actions to the system contract, this is NOT step by step for edits...add the new actions as needed..

 //////////TEST TEST TEST TEST TEST ONLY DO NOT DELIVER!!!!!!!
    //////////TEST TEST TEST TEST TEST ONLY DO NOT DELIVER!!!!!!!
    //////////TEST TEST TEST TEST TEST ONLY DO NOT DELIVER!!!!!!!
    //////////TEST TEST TEST TEST TEST ONLY DO NOT DELIVER!!!!!!!
    void system_contract::tvoteproxy(const name &proxy, const string &fio_address, const name &actor) {
        require_auth(actor);

        auto votersbyowner = _voters.get_index<"byowner"_n>();

        //now look at the actors existing vote, did they have a proxy
        auto voter_proxy_iter = votersbyowner.find(actor.value);

        votersbyowner.modify(voter_proxy_iter, same_payer, [&](auto &av) {
            av.proxy = proxy;
            av.is_auto_proxy = true;
        });

        const string response_string = string("{\"status\": \"OK\"}");

        send_response(response_string.c_str());
    }


 //////////////TEST TEST TEST TEST TEST ONLY DO NOT DELIVER!!!!
    //////////////TEST TEST TEST TEST TEST ONLY DO NOT DELIVER!!!!
    //////////////TEST TEST TEST TEST TEST ONLY DO NOT DELIVER!!!!
    //////////////TEST TEST TEST TEST TEST ONLY DO NOT DELIVER!!!!
    void eosiosystem::system_contract::tgenlocked(const name &owner, const vector<lockperiodv2> &periods, const bool &canvote,
                                                    const int64_t &amount) {

        _generallockedtokens.emplace(owner, [&](struct locked_tokens_info_v2 &a) {
            a.id = _generallockedtokens.available_primary_key();
            a.owner_account = owner;
            a.lock_amount = amount;
            a.payouts_performed = 0;
            a.can_vote = canvote?1:0;
            a.periods = periods;
            a.remaining_lock_amount = 0;
            a.timestamp = now();
        });

         const string response_string = string("{\"status\": \"OK\"}");

        send_response(response_string.c_str());
    }



  add these actions to the chain on the command line after startup....these dont copy paste well so re-edit!!
  ../fio/build/bin/clio -u http://localhost:8889 push action eosio addaction '{"action":"tvoteproxy","contract":"eosio","actor":"eosio"}' --permission eosio
  ../fio/build/bin/clio -u http://localhost:8889 push action eosio addaction '{"action”:”tgenlocked",”contract":"eosio","actor":"eosio"}' --permission eosio

 */


before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
})

describe(`************************** BD-4643-token-transfer-dev-only-tests.js ************************** \n    A. Setup required! Transfer tokens when voters has proxy and producers voted`, () => {
  let proxyB1, voterB1, user1, user2;

  it(`SUCCESS setup accounts`, async () => {

    try{

    proxyB1 = await newUser(faucet);
    voterB1 = await newUser(faucet);
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);

    } catch (err) {
      console.log('Error: ', err)
    }
  })
  it(`SUCCESS regproxy`, async () => {

    try{
      const result = await proxyB1.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: proxyB1.address,
          actor: proxyB1.account,
          max_fee: config.api.register_proxy.fee
        }
      })
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
    }
  })
  it(`SUCCESS vote proxy`, async () => {

    try{
      const result1 = await voterB1.sdk.genericAction('pushTransaction', {
        action: 'voteproxy',
        account: 'eosio',
        data: {
          proxy: proxyB1.address,
          fio_address: voterB1.address,
          actor: voterB1.account,
          max_fee: config.api.proxy_vote.fee
        }
      })
      expect(result1.status).to.equal('OK')

    } catch (err) {
      console.log('Error: ', err)
    }
  })
  it(`SUCCESS vote producer`, async () => {

    try{


      const result3 = await proxyB1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: proxyB1.address,
          actor: proxyB1.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      expect(result3.status).to.equal('OK')

    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`SUCCESS vote producer incoherency account`, async () => {

    try{


      const result3 = await user1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: user1.address,
          actor: user1.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      expect(result3.status).to.equal('OK')

    } catch (err) {
      console.log('Error: ', err)
    }
  })
  it(`SUCCESS set voter incoherent`, async () => {

    try{


      //void system_contract::tvoteproxy(const name &proxy, const string &fio_address, const name &actor) {
      const result5 = await user1.sdk.genericAction('pushTransaction', {
        action: 'tvoteproxy',
        account: 'eosio',
        data: {
          proxy: proxyB1.account,
          fio_address: user1.address,
          actor: user1.account,
          max_fee: config.api.vote_producer.fee
        }
      })



    } catch (err) {
      console.log('Error: ', err.json.error.details[0])
    }
  })
  it(`SUCCESS verify data incoherency`, async () => {

    try{



      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'voters',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      let voters = await callFioApi("get_table_rows", json);
      for (voter in voters.rows) {
        if (voters.rows[voter].owner == user1.account) {
          break;
        }
      }
      console.log("voter info before id: " + voters.rows[voter].id)
      console.log("voter info before owner: " + voters.rows[voter].owner)
      console.log("voter info before proxy: " + voters.rows[voter].proxy)
      console.log("voter info before is_proxy: " + voters.rows[voter].is_proxy)
      console.log("voter info before producers: " + voters.rows[voter].producers[0])
      console.log("voter info before is_auto_proxy: " + voters.rows[voter].is_auto_proxy)
      //horked
      expect(voters.rows[voter].proxy).to.equal(proxyB1.account);
      expect(voters.rows[voter].is_proxy).to.equal(0);
      expect(voters.rows[voter].producers.length).to.equal(1);
      expect(voters.rows[voter].is_auto_proxy).to.equal(1);



    } catch (err) {
      console.log('Error: ', err)
    }
  })
  it(`SUCCESS transfer funds `, async () => {

    try{


      const result6 = await user2.sdk.genericAction('pushTransaction', {
        action: 'trnsfiopubky',
        account: 'fio.token',
        data: {
          payee_public_key: user1.publicKey,
          amount: 10000000000,
          max_fee: config.maxFee,
          tpid: ''
        }
      })
      //console.log('Result: ', result)
      expect(result6.status).to.equal('OK')



    } catch (err) {
      console.log('Error: ', err)
    }
  })
  it(`SUCCESS verify proxy and is_auto_proxy cleared`, async () => {

    try{

      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'voters',
        limit: 1000,
        reverse: false,
        show_payer: false
      }


      let voters = await callFioApi("get_table_rows", json);
      for (voter in voters.rows) {
        if (voters.rows[voter].owner == user1.account) {
          break;
        }
      }
      console.log("voter info after id: " + voters.rows[voter].id)
      console.log("voter info after owner: " + voters.rows[voter].owner)
      console.log("voter info after proxy: " + voters.rows[voter].proxy)
      console.log("voter info after is_proxy: " + voters.rows[voter].is_proxy)
      console.log("voter info after producers: " + voters.rows[voter].producers[0])
      console.log("voter info after is_auto_proxy: " + voters.rows[voter].is_auto_proxy)
      //un horked
      expect(voters.rows[voter].proxy).to.equal(''); //proxy cleared
      expect(voters.rows[voter].is_proxy).to.equal(0); //not proxy
      expect(voters.rows[voter].producers.length).to.equal(1); //producers voted
      expect(voters.rows[voter].is_auto_proxy).to.equal(0); //is auto proxy cleared

    } catch (err) {
      console.log('Error: ', err)
    }
  })




});


describe(`   B. Setup required! Transfer tokens when gen locks contain incoherent data`, () => {

  let voterB1, user1, user2;

  it(`SUCCESS setup accounts `, async () => {

    try{

      voterB1 = await newUser(faucet);
      user1 = await newUser(faucet);
      user2 = await newUser(faucet);


    } catch (err) {
      console.log('Error: ', err.error.details[0])
    }
  })
  it(`SUCCESS voteproducer`, async () => {

    try{



      const result3 = await voterB1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: voterB1.address,
          actor: voterB1.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      expect(result3.status).to.equal('OK')



    } catch (err) {
      console.log('Error: ', err)
    }
  })
  it(`SUCCESS set inchorent gen locks for voting account`, async () => {

    try{




      let result4 = await voterB1.sdk.genericAction('pushTransaction', {
        action: 'tgenlocked',
        account: 'eosio',
        data: {
          "owner": voterB1.account,
          "periods": [
            {
              "duration": 17569,
              "amount": 1992528000000
            },
            {
              "duration": 2609569,
              "amount": 1992528000000
            },
            {
              "duration": 5201569,
              "amount": 1992528000000
            },
            {
              "duration": 7793569,
              "amount": 1992528000000
            },
            {
              "duration": 10385569,
              "amount": 1992528000000
            },
            {
              "duration": 12977569,
              "amount": 1992528000000
            },
            {
              "duration": 15569569,
              "amount": 1992528000000
            },
            {
              "duration": 18161569,
              "amount": 1992528000000
            },
            {
              "duration": 20753569,
              "amount": 1992528000000
            },
            {
              "duration": 23345569,
              "amount": 1992528000000
            },
            {
              "duration": 25937569,
              "amount": 1992528000000
            },
            {
              "duration": 28529569,
              "amount": 1992528000000
            },
            {
              "duration": 31121569,
              "amount": 1992528000000
            },
            {
              "duration": 33713569,
              "amount": 1992528000000
            },
            {
              "duration": 36305569,
              "amount": 1992528000000
            },
            {
              "duration": 38897569,
              "amount": 1992528000000
            },
            {
              "duration": 41489569,
              "amount": 1992528000000
            },
            {
              "duration": 44081569,
              "amount": 1992528000000
            },
            {
              "duration": 46673569,
              "amount": 1992528000000
            },
            {
              "duration": 49265569,
              "amount": 1992528000000
            },
            {
              "duration": 51857569,
              "amount": 1992528000000
            },
            {
              "duration": 54449569,
              "amount": 1992528000000
            },
            {
              "duration": 57041569,
              "amount": 1992528000000
            },
            {
              "duration": 59633569,
              "amount": 1992528000000
            },
            {
              "duration": 62225569,
              "amount": 1992528000000
            }
          ],
          "amount": 49813200000000,
          "canvote": true
        }
      })



    } catch (err) {
      console.log('Error: ', err)
    }
  })
  it(`SUCCESS set incoherent gen locks for non voting account`, async () => {

    try{



      let result4 = await user1.sdk.genericAction('pushTransaction', {
        action: 'tgenlocked',
        account: 'eosio',
        data: {
          "owner": user1.account,
          "periods": [
            {
              "duration": 17569,
              "amount": 1992528000000
            },
            {
              "duration": 2609569,
              "amount": 1992528000000
            },
            {
              "duration": 5201569,
              "amount": 1992528000000
            },
            {
              "duration": 7793569,
              "amount": 1992528000000
            },
            {
              "duration": 10385569,
              "amount": 1992528000000
            },
            {
              "duration": 12977569,
              "amount": 1992528000000
            },
            {
              "duration": 15569569,
              "amount": 1992528000000
            },
            {
              "duration": 18161569,
              "amount": 1992528000000
            },
            {
              "duration": 20753569,
              "amount": 1992528000000
            },
            {
              "duration": 23345569,
              "amount": 1992528000000
            },
            {
              "duration": 25937569,
              "amount": 1992528000000
            },
            {
              "duration": 28529569,
              "amount": 1992528000000
            },
            {
              "duration": 31121569,
              "amount": 1992528000000
            },
            {
              "duration": 33713569,
              "amount": 1992528000000
            },
            {
              "duration": 36305569,
              "amount": 1992528000000
            },
            {
              "duration": 38897569,
              "amount": 1992528000000
            },
            {
              "duration": 41489569,
              "amount": 1992528000000
            },
            {
              "duration": 44081569,
              "amount": 1992528000000
            },
            {
              "duration": 46673569,
              "amount": 1992528000000
            },
            {
              "duration": 49265569,
              "amount": 1992528000000
            },
            {
              "duration": 51857569,
              "amount": 1992528000000
            },
            {
              "duration": 54449569,
              "amount": 1992528000000
            },
            {
              "duration": 57041569,
              "amount": 1992528000000
            },
            {
              "duration": 59633569,
              "amount": 1992528000000
            },
            {
              "duration": 62225569,
              "amount": 1992528000000
            }
          ],
          "amount": 49813200000000,
          "canvote": true
        }
      })




    } catch (err) {
      console.log('Error: ', err)
    }
  })
  it(`SUCCESS verify remaining lock amount is 0 for voting account `, async () => {

    try{



      //get the locks

      let json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'locktokensv2',
        lower_bound: voterB1.account,
        upper_bound: voterB1.account,
        key_type: 'i64',
        reverse: true,
        index_position: '2'
      }
      result = await callFioApi("get_table_rows", json);
      expect(result.rows[0].remaining_lock_amount).to.equal(0);




    } catch (err) {
      console.log('Error: ', err)
    }
  })
  it(`SUCCESS transfer fio to voting account`, async () => {

    try{





      const result6 = await user2.sdk.genericAction('pushTransaction', {
        action: 'trnsfiopubky',
        account: 'fio.token',
        data: {
          payee_public_key: voterB1.publicKey,
          amount: 10000000000,
          max_fee: config.maxFee,
          tpid: ''
        }
      })
      //console.log('Result: ', result)
      expect(result6.status).to.equal('OK')



    } catch (err) {
      console.log('Error: ', err)
    }
  })



  it(`SUCCESS verify locks removed for voting account`, async () => {

    try{

      //get the locks

      let json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'locktokensv2',
        lower_bound: voterB1.account,
        upper_bound: voterB1.account,
        key_type: 'i64',
        reverse: true,
        index_position: '2'
      }


      let result = await callFioApi("get_table_rows", json);

      expect(result.rows.length).to.equal(0);




    } catch (err) {
      console.log('Error: ', err)
    }
  })
  it(`SUCCESS verify remaining lock amount is 0 for non voting account`, async () => {

    try{

      //user1 account non voting
     let json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'locktokensv2',
        lower_bound: user1.account,
        upper_bound: user1.account,
        key_type: 'i64',
        reverse: true,
        index_position: '2'
      }
     let  result = await callFioApi("get_table_rows", json);

      expect(result.rows[0].remaining_lock_amount).to.equal(0);



    } catch (err) {
      console.log('Error: ', err)
    }
  })
  it(`SUCCESS transfer fio to non voting account`, async () => {

    try{



      const result7 = await user2.sdk.genericAction('pushTransaction', {
        action: 'trnsfiopubky',
        account: 'fio.token',
        data: {
          payee_public_key: user1.publicKey,
          amount: 10000000000,
          max_fee: config.maxFee,
          tpid: ''
        }
      })
      //console.log('Result: ', result)
      expect(result7.status).to.equal('OK')


    } catch (err) {
      console.log('Error: ', err)
    }
  })
  it(`SUCCESS verify locks removed for non voting account `, async () => {

    try{



      //user1 account non voting
      let json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'locktokensv2',
        lower_bound: user1.account,
        upper_bound: user1.account,
        key_type: 'i64',
        reverse: true,
        index_position: '2'
      }
     let result = await callFioApi("get_table_rows", json);

      expect(result.rows.length).to.equal(0);

    } catch (err) {
      console.log('Error: ', err)
    }
  })

});
