require('mocha');
const {expect} = require('chai');
const {newUser, existingUser,callFioApi,fetchJson, generateFioDomain, getAccountFromKey, generateFioAddress, createKeypair} = require('../utils.js');
const {FIOSDK} = require('@fioprotocol/fiosdk');
const config = require('../config.js');
const {timeout} = require("../utils");
let faucet;

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
})

/*

add this action to the fio.system contract locally on your testing box,

 //TESTING ONLY DO NOT DELIVER
    void eosiosystem::system_contract::addlocked1(const name &owner,
            const int64_t &unlockperiodcount,
            const int64_t &amount,
            const int64_t &remaining,
            const int16_t &locktype) {


        check(is_account(owner),"account must pre exist");

        check(locktype == 1 || locktype == 2 || locktype == 3 || locktype == 4,"lock type must be 1,2,3,4");

        _lockedtokens.emplace(owner, [&](struct locked_token_holder_info &a) {
            a.owner = owner;
            a.total_grant_amount = amount;
            a.unlocked_period_count = unlockperiodcount;
            a.grant_type = locktype;
            a.inhibit_unlocking = 1;
            a.remaining_locked_amount = remaining;
            a.timestamp = now();
        });
        //return status added for staking, to permit unit testing using typescript sdk.
        const string response_string = string("{\"status\": \"OK\"}");
        send_response(response_string.c_str());
    }


    rebuild contracts and restart chain.

after the chain starts add the testing action and release actions manually.

triple click these after cd into the fio.devtools directory. copy/paste into a command line on the local blockchain box

for testing, once the test action is in your copy of the contracts you must add it to the chain.

../fio/build/bin/clio -u http://localhost:8889 push action eosio addaction '{"action":"addlocked1","contract":"eosio","actor":"eosio"}' --permission eosio


//release actions must be added and are added in the PR for fio.devtools

you may now run these tests.

the test "setup fipxlviii" will setup your newly started chain with the reallocation accounts.
once this test is run you may look on chain, and see the rows for these accounts in the lockedtokens table

you can verify that the FIP named accounts are the 13 in the table. you can also verify the lock amount of these accounts matches fip 48

../fio/build/bin/clio -u http://localhost:8889 get table eosio eosio lockedtokens --limit 2000

to run fipxlviii you must call it from clio using this command on the command line on the local host...


../fio/build/bin/clio -u http://localhost:8889 push action fio.token fipxlviii '{}' --permission eosio@active

after running this command you should see that their is now just one account (the receiving account) remaining in the lockedtokens table
and that its locks have been adapted to contain the total of the re-allocation.

../fio/build/bin/clio -u http://localhost:8889 get table eosio eosio lockedtokens --limit 2000


*/

const lockdurationseconds = 10;   // What was set in the contract above in place of SECONDSPERDAY
const lockType = 1;  // Default


/* list of accounts for setup of type 2 lock grants for re-allocation.
PLEASE VERIFY THE ACCOUNTS AMOUNTS AND OTHER INFO MATCHES THE FIP-48


amounts per account
xkezj1ocwe4r	FIO8Wyh738QK7iZRyL1tBZredeubrHugjYCjEPJGxc7Cvj3niML9G	9,999,960
mck32myftiau	FIO7DVJTbCjmBev9oAggRP7kRjXJfZAE4228SnMfsyyBhv7wggxDB	10,000,000
hjvwdy5p4zvs	FIO7BQfxKtfebgrTZYbMYi6gvcWZwU8dogL78jAwNgeQVn5xazKAv	7,000,000
2mskjvkhj334	FIO5PyTGT7AitAcCEcmVhwfsWQ6DnGhai73wgGA4wxk7KQfpck9YX	5,500,000
oadme4v54cly	FIO6z6cPxUx9S7r9qaPzLZCsWADYha8RbXcL58vcGfLg89JdssBv3	2,500,000
jsniuyaaeblr	FIO5FZVQ6ehswr1Mig5a18r3FwdfFmXDVjn6TrAKLHZa3KUrpvSs3	1,999,999.4
nadppzyxtxjx	FIO5HBTJeDZqbmVNXJy9CxJyKyeg6aLXMtfXoi7GddftjnFf3UKUt	1,500,000
zvt11xu5czlk	FIO7K8wwggViLpSoEKXUbLirCpr7eFprWnaxq8ZMG7remasvmuGYo	1,000
dioxleem5hmr	FIO6R6JTP1CNsX4PyNwPXf3RWQ4NswRV1P4wpVtn8Fu5hqdbmjaAu	1,000
iud1tjwtt2ey	FIO7v6KMR6imo4EqZUBEJA51xL4ZjEaZtxNBT7zbHPm45mNnQGvBP	1,000
xgyg22tfizja	FIO82nTSBe3CHeZnAACqHwLFSUENZGJd7h6Fo5rAzV6E2mvadFWzB	1,000
4urqjmtfvmjj	FIO5QebHVoKoETsA9aGXET5XdAeGwA1AcqRHGxawgGfDNPZwuwdtJ	1,000
deq54dxuyquh	FIO8MmqVkbBEj6vkXFuQRM8p6AC94zJCWsLHxmUengkUvSwD7Fths	1,000
TOTAL	38,505,959.4

receiving account
pkfbwyi2qzii          FIO6WYaLQzB196NAyrfqCBQzJXYkDk99B2by1F8MHyEbAWHYJRnK2
 */



describe.only(`Setup fipxlviii on local test box.`, () => {

  let userA1;
  const lockType4 = 4;
  const lockType2 = 2;

  const account1Info = {
    account: 'xkezj1ocwe4r',
    publicKey: 'FIO8Wyh738QK7iZRyL1tBZredeubrHugjYCjEPJGxc7Cvj3niML9G',
    fioAmount: 9999960000000000
  }
  const account2Info = {
    account: 'mck32myftiau',
    publicKey: 'FIO7DVJTbCjmBev9oAggRP7kRjXJfZAE4228SnMfsyyBhv7wggxDB',
    fioAmount: 10000000000000000
  }
  const account3Info = {
    account: 'hjvwdy5p4zvs',
    publicKey: 'FIO7BQfxKtfebgrTZYbMYi6gvcWZwU8dogL78jAwNgeQVn5xazKAv',
    fioAmount: 7000000000000000
  }
  const account4Info = {
    account: '2mskjvkhj334',
    publicKey: 'FIO5PyTGT7AitAcCEcmVhwfsWQ6DnGhai73wgGA4wxk7KQfpck9YX',
    fioAmount: 5500000000000000
  }
  const account5Info = {
    account: 'oadme4v54cly',
    publicKey: 'FIO6z6cPxUx9S7r9qaPzLZCsWADYha8RbXcL58vcGfLg89JdssBv3',
    fioAmount: 2500000000000000
  }
  const account6Info = {
    account: 'jsniuyaaeblr',
    publicKey: 'FIO5FZVQ6ehswr1Mig5a18r3FwdfFmXDVjn6TrAKLHZa3KUrpvSs3',
    fioAmount: 1999999400000000
  }
  const account7Info = {
    account: 'nadppzyxtxjx',
    publicKey: 'FIO5HBTJeDZqbmVNXJy9CxJyKyeg6aLXMtfXoi7GddftjnFf3UKUt',
    fioAmount: 1500000000000000
  }
  const account8Info = {
    account: 'zvt11xu5czlk',
    publicKey: 'FIO7K8wwggViLpSoEKXUbLirCpr7eFprWnaxq8ZMG7remasvmuGYo',
    fioAmount: 1000000000000
  }
  const account9Info = {
    account: 'dioxleem5hmr',
    publicKey: 'FIO6R6JTP1CNsX4PyNwPXf3RWQ4NswRV1P4wpVtn8Fu5hqdbmjaAu',
    fioAmount: 1000000000000
  }
  const account10Info = {
    account: 'iud1tjwtt2ey',
    publicKey: 'FIO7v6KMR6imo4EqZUBEJA51xL4ZjEaZtxNBT7zbHPm45mNnQGvBP',
    fioAmount: 1000000000000
  }
  const account11Info = {
    account: 'xgyg22tfizja',
    publicKey: 'FIO82nTSBe3CHeZnAACqHwLFSUENZGJd7h6Fo5rAzV6E2mvadFWzB',
    fioAmount: 1000000000000
  }
  const account12Info = {
    account: '4urqjmtfvmjj',
    publicKey: 'FIO5QebHVoKoETsA9aGXET5XdAeGwA1AcqRHGxawgGfDNPZwuwdtJ',
    fioAmount: 1000000000000
  }
  const account13Info = {
    account: 'deq54dxuyquh',
    publicKey: 'FIO8MmqVkbBEj6vkXFuQRM8p6AC94zJCWsLHxmUengkUvSwD7Fths',
    fioAmount: 1000000000000
  }
  const receiveraccountInfo = {
    account: 'pkfbwyi2qzii',
    publicKey: 'FIO6WYaLQzB196NAyrfqCBQzJXYkDk99B2by1F8MHyEbAWHYJRnK2',
    fioamount: 1000000000
  }






  it(`Create account`, async () => {
    try {
      userA1 = await newUser(faucet);
    }catch (err){
      console.log("ERROR CREATING USERS " + err);
    }
  });


  //account 1 start
  it(`Transfer  tokens to account1`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: account1Info.publicKey,
      amount: account1Info.fioAmount,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    expect(result.status).to.equal('OK')
  });

  it(`Lock  tokens account1 lock type 2`, async () => {

    const result1 = await userA1.sdk.genericAction('pushTransaction', {
      action: 'addlocked1',
      account: 'eosio',
      data: {
        owner: account1Info.account,
        unlockperiodcount: 0,
        amount: account1Info.fioAmount,
        remaining: account1Info.fioAmount,
        locktype: lockType2
      }
    })
    expect(result1.status).to.equal('OK')
  });
  //account 1 end

  //account 2 start
  it(`Transfer  tokens to account2`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: account2Info.publicKey,
      amount: account2Info.fioAmount,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    expect(result.status).to.equal('OK')
  });

  it(`Lock  tokens account2 lock type 2`, async () => {
    const result1 = await userA1.sdk.genericAction('pushTransaction', {
      action: 'addlocked1',
      account: 'eosio',
      data: {
        owner: account2Info.account,
        unlockperiodcount: 0,
        amount: account2Info.fioAmount,
        remaining: account2Info.fioAmount,
        locktype: lockType2
      }
    })
    expect(result1.status).to.equal('OK')
  });
  //account 2 end

  //account 3 start
  it(`Transfer  tokens to account3`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: account3Info.publicKey,
      amount: account3Info.fioAmount,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    expect(result.status).to.equal('OK')
  });

  it(`Lock  tokens account3 lock type 2`, async () => {
    const result1 = await userA1.sdk.genericAction('pushTransaction', {
      action: 'addlocked1',
      account: 'eosio',
      data: {
        owner: account3Info.account,
        unlockperiodcount: 0,
        amount: account3Info.fioAmount,
        remaining: account3Info.fioAmount,
        locktype: lockType2
      }
    })
    expect(result1.status).to.equal('OK')
  });
  //account 3 end

  //account 4 start
  it(`Transfer  tokens to account4`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: account4Info.publicKey,
      amount: account4Info.fioAmount,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    expect(result.status).to.equal('OK')
  });

  it(`Lock  tokens account4 lock type 2`, async () => {
    try {
      const result1 = await userA1.sdk.genericAction('pushTransaction', {
        action: 'addlocked1',
        account: 'eosio',
        data: {
          owner: account4Info.account,
          unlockperiodcount: 0,
          amount: account4Info.fioAmount,
          remaining: account4Info.fioAmount,
          locktype: lockType2
        }
      })
      expect(result1.status).to.equal('OK')
    }catch (error){
      console.log(error);
      console.log(error.json.error.details[0])
    }
  });
  //account 4 end

  //account 5 start
  it(`Transfer  tokens to account5`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: account5Info.publicKey,
      amount: account5Info.fioAmount,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    expect(result.status).to.equal('OK')
  });

  it(`Lock  tokens account5 lock type 2`, async () => {
    try {
      const result1 = await userA1.sdk.genericAction('pushTransaction', {
        action: 'addlocked1',
        account: 'eosio',
        data: {
          owner: account5Info.account,
          unlockperiodcount: 0,
          amount: account5Info.fioAmount,
          remaining: account5Info.fioAmount,
          locktype: lockType2
        }
      })
      expect(result1.status).to.equal('OK')
    }catch(err){
      console.log("ERRROR : ",err);
    }
  });
  //account 5 end

  //account 6 start
  it(`Transfer  tokens to account6`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: account6Info.publicKey,
      amount: account6Info.fioAmount,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    expect(result.status).to.equal('OK')
  });

  it(`Lock  tokens account6 lock type 2`, async () => {
    const result1 = await userA1.sdk.genericAction('pushTransaction', {
      action: 'addlocked1',
      account: 'eosio',
      data: {
        owner: account6Info.account,
        unlockperiodcount: 0,
        amount: account6Info.fioAmount,
        remaining: account6Info.fioAmount,
        locktype: lockType2
      }
    })
    expect(result1.status).to.equal('OK')
  });
  //account 6 end

  //account 7 start
  it(`Transfer  tokens to account7`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: account7Info.publicKey,
      amount: account7Info.fioAmount,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    expect(result.status).to.equal('OK')
  });

  it(`Lock  tokens account7 lock type 2`, async () => {
    const result1 = await userA1.sdk.genericAction('pushTransaction', {
      action: 'addlocked1',
      account: 'eosio',
      data: {
        owner: account7Info.account,
        unlockperiodcount: 0,
        amount: account7Info.fioAmount,
        remaining: account7Info.fioAmount,
        locktype: lockType2
      }
    })
    expect(result1.status).to.equal('OK')
  });
  //account 7 end


  //account 8 start
  it(`Transfer  tokens to account8`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: account8Info.publicKey,
      amount: account8Info.fioAmount,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    expect(result.status).to.equal('OK')
  });

  it(`Lock  tokens account8 lock type 2`, async () => {
    const result1 = await userA1.sdk.genericAction('pushTransaction', {
      action: 'addlocked1',
      account: 'eosio',
      data: {
        owner: account8Info.account,
        unlockperiodcount: 0,
        amount: account8Info.fioAmount,
        remaining: account8Info.fioAmount,
        locktype: lockType2
      }
    })
    expect(result1.status).to.equal('OK')
  });
  //account 8 end


  //account 9 start
  it(`Transfer  tokens to account9`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: account9Info.publicKey,
      amount: account9Info.fioAmount,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    expect(result.status).to.equal('OK')
  });

  it(`Lock  tokens account9 lock type 2`, async () => {
    const result1 = await userA1.sdk.genericAction('pushTransaction', {
      action: 'addlocked1',
      account: 'eosio',
      data: {
        owner: account9Info.account,
        unlockperiodcount: 0,
        amount: account9Info.fioAmount,
        remaining: account9Info.fioAmount,
        locktype: lockType2
      }
    })
    expect(result1.status).to.equal('OK')
  });
  //account 9 end

  //account 10 start
  it(`Transfer  tokens to account10`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: account10Info.publicKey,
      amount: account10Info.fioAmount,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    expect(result.status).to.equal('OK')
  });

  it(`Lock  tokens account10 lock type 2`, async () => {
    const result1 = await userA1.sdk.genericAction('pushTransaction', {
      action: 'addlocked1',
      account: 'eosio',
      data: {
        owner: account10Info.account,
        unlockperiodcount: 0,
        amount: account10Info.fioAmount,
        remaining: account10Info.fioAmount,
        locktype: lockType2
      }
    })
    expect(result1.status).to.equal('OK')
  });
  //account 10 end

  //account 11 start
  it(`Transfer  tokens to account11`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: account11Info.publicKey,
      amount: account11Info.fioAmount,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    expect(result.status).to.equal('OK')
  });

  it(`Lock  tokens account11 lock type 2`, async () => {
    const result1 = await userA1.sdk.genericAction('pushTransaction', {
      action: 'addlocked1',
      account: 'eosio',
      data: {
        owner: account11Info.account,
        unlockperiodcount: 0,
        amount: account11Info.fioAmount,
        remaining: account11Info.fioAmount,
        locktype: lockType2
      }
    })
    expect(result1.status).to.equal('OK')
  });
  //account 11 end

  //account 12 start
  it(`Transfer  tokens to account12`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: account12Info.publicKey,
      amount: account12Info.fioAmount,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    expect(result.status).to.equal('OK')
  });

  it(`Lock  tokens account12 lock type 2`, async () => {
    const result1 = await userA1.sdk.genericAction('pushTransaction', {
      action: 'addlocked1',
      account: 'eosio',
      data: {
        owner: account12Info.account,
        unlockperiodcount: 0,
        amount: account12Info.fioAmount,
        remaining: account12Info.fioAmount,
        locktype: lockType2
      }
    })
    expect(result1.status).to.equal('OK')
  });
  //account 12 end


  //account 13 start
  it(`Transfer  tokens to account13`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: account13Info.publicKey,
      amount: account13Info.fioAmount,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    expect(result.status).to.equal('OK')
  });

  it(`Lock  tokens account13 lock type 2`, async () => {
    const result1 = await userA1.sdk.genericAction('pushTransaction', {
      action: 'addlocked1',
      account: 'eosio',
      data: {
        owner: account13Info.account,
        unlockperiodcount: 0,
        amount: account13Info.fioAmount,
        remaining: account13Info.fioAmount,
        locktype: lockType2
      }
    })
    expect(result1.status).to.equal('OK')
  });
  //account 13 end

  it(`Transfer 1 token to receiver account`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: receiveraccountInfo.publicKey,
      amount: 1000000000,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    expect(result.status).to.equal('OK')
  });

  it(`Lock 1000000000000000 tokens receiver account lock type 4 remaining 0`, async () => {
    const result1 = await userA1.sdk.genericAction('pushTransaction', {
      action: 'addlocked1',
      account: 'eosio',
      data: {
        owner: receiveraccountInfo.account,
        unlockperiodcount: 0,
        amount: 1000000000000000,
        remaining: 0,
        locktype: lockType4
      }
    })
    expect(result1.status).to.equal('OK')
  });


});
