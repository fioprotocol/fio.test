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

add this action to the fio.system contract

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

after the chain starts add this action.

../fio/build/bin/clio -u http://localhost:8889 push action eosio addaction '{"action":"addlocked1","contract":"eosio","actor":"eosio"}' --permission eosio
//release action must be added
../fio/build/bin/clio -u http://localhost:8889 push action eosio addaction '{"action":"rmovegenesis","contract":"eosio","actor":"eosio"}' --permission eosio
../fio/build/bin/clio -u http://localhost:8889 push action eosio addaction '{"action":"updrcvrlcks","contract":"eosio","actor":"eosio"}' --permission eosio
../fio/build/bin/clio -u http://localhost:8889 push action eosio addaction '{"action":"fipxlviii","contract":"fio.token","actor":"eosio"}' --permission eosio

you may now run these tests.

to run fipxlviii you must call it from clio using this command...the fiosdk does not sign transactions as a named system account

../fio/build/bin/clio -u http://localhost:8889 push action fio.token fipxlviii '{}' --permission eosio@active


*/

const lockdurationseconds = 10;   // What was set in the contract above in place of SECONDSPERDAY
const lockType = 1;  // Default


/* accounts for setup of type 2 lock grants for re-allocation.


amounts per account
xkezj1ocwe4r	9,999,960
mck32myftiau	10,000,000
hjvwdy5p4zvs	7,000,000
2mskjvkhj334	5,500,000
oadme4v54cly	2,500,000
jsniuyaaeblr	1,999,999.4
nadppzyxtxjx	1,500,000
zvt11xu5czlk	1,000
dioxleem5hmr	1,000
iud1tjwtt2ey	1,000
xgyg22tfizja	1,000
4urqjmtfvmjj	1,000
deq54dxuyquh	1,000
TOTAL	38,505,959.4


make a test to transfer these amounts to these accounts.
then addgenlocked for each account.
then we are ready to run this action and see how it works


Private key: 5HtvSyYQm5aNjuhKzHqDtgkCeHjqbybehhsrdgr9Jt29ERAD5ib
Public key: FIO5p54hi18swMeJMdVD7cdn1kKh76sa8QWhoCumeymHeHFkS9UTy
FIO Public Address (actor name): tdcfarsowlnk
9,999,960

Private key: 5KK3HbWJrD1ejXa7tYxo78WAcq2upVRUSjKrZviGTZT1DsZYCoy
Public key: FIO5hViAQMMTjhkmyqJE3hN98MxKybXe8jFDgRsbt4Q684BgzeBi4
FIO Public Address (actor name): evorvygfnrzk
10,000,000



Private key: 5JwmDtsJDTY2M3h9bsXZDD2tHPj3UgQf7FVpptaLeC7NzxeXnXu
Public key: FIO8WaU8ZT9YLixZZ41uHiYmkoRSZHgCR3anfL3YupC3boQpwvXqG
FIO Public Address (actor name): xbfugtkzvowu
7,000,000



Private key: 5J3u7pZpoLN1zxM8ZDfnaxvTLaJxcyuZ4mWB5V9xgESCC9Wgqck
Public key: FIO5sHPV7sVTNNvMZag7HMJyTWPJVVLgueUuWTfNSbxQwByM9gp9D
FIO Public Address (actor name): p1kv5e2zdxbh
5,500,000


Private key: 5JvnF4B2g34pnexdrTMP7TMcRXz34FUNGhMQG9nR1mzRbX2s5QD
Public key: FIO5ju7xzrDLUwC93ZhHjewWJqb1m2ihcxjiN9N9UDasn5FCpgJT2
FIO Public Address (actor name): kk2gys4vl5ve
2,500,000


Private key: 5KXSKdDrM1yJMTVthXH2aGzhzaoC7HwBdk9ADJhz8jJxGt77PxL
Public key: FIO7vQq9XfSrvDD4uPF4EN2UNE4xXRXMyNmWdtbSKGFktkFAQ2Xuy
FIO Public Address (actor name): jnp3viqz32tc
1,999,999.4



Private key: 5KZPzhRT7g4K2cdiXYf4Jwu6jBgu69FaDYsPKNJ3Xs3A617fkeQ
Public key: FIO5EKfrouMtuS8tY8xZXmhiSHeMJFaPVjG9qCeq2fR4WUXSd2NNf
FIO Public Address (actor name): hcfsdi2vybrv
1,500,000


Private key: 5JrKqjNYw4p65csSXbanj7KdbiAConME66ybjwQx9cUwHX7jUK9
Public key: FIO75t8gA8JPJqGgMAjpvFhkKtK2dPtRdLiyxUG6kTNogXPq1A1bF
FIO Public Address (actor name): 125nkypgqojv
1000


Private key: 5JeBBi58iKkxdwWJBz85vLfcBBC8uRGKaocLR16QoGQQFT8qpNT
Public key: FIO5oQPqujG8qiKkNPuWbdm8NGiYM3STuhHS8bXQ2dgNDaEg1aYNr
FIO Public Address (actor name): sauhngb2eq1c
1000

Private key: 5J5dtsQA8zWpq1QuJXuD564ZHXupGq9y11TDeXLNr6o9xWxykKk
Public key: FIO5EpXzNWv9qDbhgnN3dMcAXVZykSHZswktarqC9G6W2HwEGA26v
FIO Public Address (actor name): idmwqtsmij4i
1000


Private key: 5Jm7GhEMzA3Ck9xougP5hhCPcFa6bBLNFAzCSdff9eevuVy4AGh
Public key: FIO6BEUsLHUGJcC89RQYVQJRbSF8Za5PdiD5bzZiCnpirTSBLaUmy
FIO Public Address (actor name): dq5q2kx5oioa
1000

Private key: 5JKBCzEUSejvayhhrLW88bCn4ReaZekU3wgGLTcW2CDKS1vkGS4
Public key: FIO5vP2CiVzeM2HntW9MPLGG2RWkAxfNyv3DgGL5EDoef6gALb4pR
FIO Public Address (actor name): bxg2u5gpgoc2
1000


Private key: 5J8wgFpv919HmjppHjGsQQuSYqa4AeLxwtAR8a4WaEtZeNin4Ue
Public key: FIO7svM1qskdtW37AbKvuKyrjm182en1xuskh8zcPHozyhfGuqt53
FIO Public Address (actor name): dffmxsxuq1gt
1000



receiving account
Private key: 5JGyp6ZDEYHsPfEGrEXQdKNJFSvtvMoBuPNWwpfkUi5vQFsu5PU
Public key: FIO6gPtYH9FzBNSqEfft143Xzt7M5HMW2C3XNSe2aQDAA2csSBP4s
FIO Public Address (actor name): fidgtwmzrrjq


eosio keys.
eosio
pub    FIO7isxEua78KPVbGzKemH4nj2bWE52gqj8Hkac3tc7jKNvpfWzYS
priv   5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3

 */

describe.skip(`A OBSOLETE TEST!!!!     do not usedev test just call fipxlviii.`, () => {

  let userA1, eosiosdk, locksdktype2, keys1, keys2, accountnm1, accountnm2, transfer_tokens_pub_key_fee
  const lockAmount1 = 12345000000000;
  const lockAmount2 = 56789000000000;

  const lockType1 = 1;
  const lockType2 = 2;
  /*
  const eosio = {
  account: 'eosio',
  publicKey: 'FIO6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV',
  privateKey: '5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3'
}
   */

  const eosiodevInfo = {
    account: 'eosio',
    publicKey: 'FIO6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV',
    privateKey: '5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3'
  }


  it(`Create users: `, async () => {

    userA1 = await newUser(faucet);
   let bp1 = await existingUser('eosio', '5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3', 'FIO6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV', 'x', 'y');
    eosiosdk = bp1.sdk;
  });

  it(`call fipxlviii`, async () => {
    try {
      let t = getAccountFromKey(eosiodevInfo.publicKey);
      console.log("EDEDEDEDEDEDEDED account is ",t);
      const result1 = await eosiosdk.genericAction('pushTransaction', {
        action: 'fipxlviii',
        account: 'fio.token',
        authPermission: 'eosio',
        signingAccount: 'eosio',
        data: {
          actor: 'eosio'
        }
      })

      console.log(result1);
      // expect(result.status).to.equal('OK')
    }catch(err){
      console.log(err)
    }
  });





});


describe.only(`Set up all sending accounts, and receiving account.`, () => {

  let userA1;
  let account1sdk;
  let account2sdk;
  let account3sdk;
  let account4sdk;
  let account5sdk;
  let account6sdk;
  let account7sdk;
  let account8sdk;
  let account9sdk;
  let account10sdk;
  let account11sdk;
  let account12sdk;
  let account13sdk;
  let receiveraccountsdk;
  let transfer_tokens_pub_key_fee;
  const lockAmount = 7075065123456789

  const lockType4 = 4;
  const lockType2 = 2;

  /*
Private key: 5HtvSyYQm5aNjuhKzHqDtgkCeHjqbybehhsrdgr9Jt29ERAD5ib
Public key: FIO5p54hi18swMeJMdVD7cdn1kKh76sa8QWhoCumeymHeHFkS9UTy
FIO Public Address (actor name): tdcfarsowlnk
9,999,960
*/
  const account1Info = {
    account: 'tdcfarsowlnk',
    publicKey: 'FIO5p54hi18swMeJMdVD7cdn1kKh76sa8QWhoCumeymHeHFkS9UTy',
    privateKey: '5HtvSyYQm5aNjuhKzHqDtgkCeHjqbybehhsrdgr9Jt29ERAD5ib'
  }

  //set up 12 more
/*
  Private key: 5KK3HbWJrD1ejXa7tYxo78WAcq2upVRUSjKrZviGTZT1DsZYCoy
  Public key: FIO5hViAQMMTjhkmyqJE3hN98MxKybXe8jFDgRsbt4Q684BgzeBi4
  FIO Public Address (actor name): evorvygfnrzk
  10,000,000

*/
  const account2Info = {
    account: 'evorvygfnrzk',
    publicKey: 'FIO5hViAQMMTjhkmyqJE3hN98MxKybXe8jFDgRsbt4Q684BgzeBi4',
    privateKey: '5KK3HbWJrD1ejXa7tYxo78WAcq2upVRUSjKrZviGTZT1DsZYCoy'
  }
  /*
  Private key: 5JwmDtsJDTY2M3h9bsXZDD2tHPj3UgQf7FVpptaLeC7NzxeXnXu
  Public key: FIO8WaU8ZT9YLixZZ41uHiYmkoRSZHgCR3anfL3YupC3boQpwvXqG
  FIO Public Address (actor name): xbfugtkzvowu
  7,000,000
  */
  const account3Info = {
    account: 'xbfugtkzvowu',
    publicKey: 'FIO8WaU8ZT9YLixZZ41uHiYmkoRSZHgCR3anfL3YupC3boQpwvXqG',
    privateKey: '5JwmDtsJDTY2M3h9bsXZDD2tHPj3UgQf7FVpptaLeC7NzxeXnXu'
  }
/*
  Private key: 5J3u7pZpoLN1zxM8ZDfnaxvTLaJxcyuZ4mWB5V9xgESCC9Wgqck
  Public key: FIO5sHPV7sVTNNvMZag7HMJyTWPJVVLgueUuWTfNSbxQwByM9gp9D
  FIO Public Address (actor name): p1kv5e2zdxbh
  5,500,000
*/
  const account4Info = {
    account: 'p1kv5e2zdxbh',
    publicKey: 'FIO5sHPV7sVTNNvMZag7HMJyTWPJVVLgueUuWTfNSbxQwByM9gp9D',
    privateKey: '5J3u7pZpoLN1zxM8ZDfnaxvTLaJxcyuZ4mWB5V9xgESCC9Wgqck'
  }
  /*
  Private key: 5JvnF4B2g34pnexdrTMP7TMcRXz34FUNGhMQG9nR1mzRbX2s5QD
  Public key: FIO5ju7xzrDLUwC93ZhHjewWJqb1m2ihcxjiN9N9UDasn5FCpgJT2
  FIO Public Address (actor name): kk2gys4vl5ve
  2,500,000
  */
  const account5Info = {
    account: 'kk2gys4vl5ve',
    publicKey: 'FIO5ju7xzrDLUwC93ZhHjewWJqb1m2ihcxjiN9N9UDasn5FCpgJT2',
    privateKey: '5JvnF4B2g34pnexdrTMP7TMcRXz34FUNGhMQG9nR1mzRbX2s5QD'
  }
  /*
  Private key: 5KXSKdDrM1yJMTVthXH2aGzhzaoC7HwBdk9ADJhz8jJxGt77PxL
  Public key: FIO7vQq9XfSrvDD4uPF4EN2UNE4xXRXMyNmWdtbSKGFktkFAQ2Xuy
  FIO Public Address (actor name): jnp3viqz32tc
  1,999,999.4
  */
  const account6Info = {
    account: 'jnp3viqz32tc',
    publicKey: 'FIO7vQq9XfSrvDD4uPF4EN2UNE4xXRXMyNmWdtbSKGFktkFAQ2Xuy',
    privateKey: '5KXSKdDrM1yJMTVthXH2aGzhzaoC7HwBdk9ADJhz8jJxGt77PxL'
  }
/*
  Private key: 5KZPzhRT7g4K2cdiXYf4Jwu6jBgu69FaDYsPKNJ3Xs3A617fkeQ
  Public key: FIO5EKfrouMtuS8tY8xZXmhiSHeMJFaPVjG9qCeq2fR4WUXSd2NNf
  FIO Public Address (actor name): hcfsdi2vybrv
  1,500,000
  */
  const account7Info = {
    account: 'hcfsdi2vybrv',
    publicKey: 'FIO5EKfrouMtuS8tY8xZXmhiSHeMJFaPVjG9qCeq2fR4WUXSd2NNf',
    privateKey: '5KZPzhRT7g4K2cdiXYf4Jwu6jBgu69FaDYsPKNJ3Xs3A617fkeQ'
  }
/*
  Private key: 5JrKqjNYw4p65csSXbanj7KdbiAConME66ybjwQx9cUwHX7jUK9
  Public key: FIO75t8gA8JPJqGgMAjpvFhkKtK2dPtRdLiyxUG6kTNogXPq1A1bF
  FIO Public Address (actor name): 125nkypgqojv
  1000
  */
  const account8Info = {
    account: '125nkypgqojv',
    publicKey: 'FIO75t8gA8JPJqGgMAjpvFhkKtK2dPtRdLiyxUG6kTNogXPq1A1bF',
    privateKey: '5JrKqjNYw4p65csSXbanj7KdbiAConME66ybjwQx9cUwHX7jUK9'
  }
  /*
  Private key: 5JeBBi58iKkxdwWJBz85vLfcBBC8uRGKaocLR16QoGQQFT8qpNT
  Public key: FIO5oQPqujG8qiKkNPuWbdm8NGiYM3STuhHS8bXQ2dgNDaEg1aYNr
  FIO Public Address (actor name): sauhngb2eq1c
  1000
  */
  const account9Info = {
    account: 'sauhngb2eq1c',
    publicKey: 'FIO5oQPqujG8qiKkNPuWbdm8NGiYM3STuhHS8bXQ2dgNDaEg1aYNr',
    privateKey: '5JeBBi58iKkxdwWJBz85vLfcBBC8uRGKaocLR16QoGQQFT8qpNT'
  }
  /*
  Private key: 5J5dtsQA8zWpq1QuJXuD564ZHXupGq9y11TDeXLNr6o9xWxykKk
  Public key: FIO5EpXzNWv9qDbhgnN3dMcAXVZykSHZswktarqC9G6W2HwEGA26v
  FIO Public Address (actor name): idmwqtsmij4i
  1000
  */
  const account10Info = {
    account: 'idmwqtsmij4i',
    publicKey: 'FIO5EpXzNWv9qDbhgnN3dMcAXVZykSHZswktarqC9G6W2HwEGA26v',
    privateKey: '5J5dtsQA8zWpq1QuJXuD564ZHXupGq9y11TDeXLNr6o9xWxykKk'
  }
  /*
  Private key: 5Jm7GhEMzA3Ck9xougP5hhCPcFa6bBLNFAzCSdff9eevuVy4AGh
  Public key: FIO6BEUsLHUGJcC89RQYVQJRbSF8Za5PdiD5bzZiCnpirTSBLaUmy
  FIO Public Address (actor name): dq5q2kx5oioa
  1000
  */
  const account11Info = {
    account: 'dq5q2kx5oioa',
    publicKey: 'FIO6BEUsLHUGJcC89RQYVQJRbSF8Za5PdiD5bzZiCnpirTSBLaUmy',
    privateKey: '5Jm7GhEMzA3Ck9xougP5hhCPcFa6bBLNFAzCSdff9eevuVy4AGh'
  }
  /*
  Private key: 5JKBCzEUSejvayhhrLW88bCn4ReaZekU3wgGLTcW2CDKS1vkGS4
  Public key: FIO5vP2CiVzeM2HntW9MPLGG2RWkAxfNyv3DgGL5EDoef6gALb4pR
  FIO Public Address (actor name): bxg2u5gpgoc2
  1000
  */
  const account12Info = {
    account: 'bxg2u5gpgoc2',
    publicKey: 'FIO5vP2CiVzeM2HntW9MPLGG2RWkAxfNyv3DgGL5EDoef6gALb4pR',
    privateKey: '5JKBCzEUSejvayhhrLW88bCn4ReaZekU3wgGLTcW2CDKS1vkGS4'
  }
/*
  Private key: 5J8wgFpv919HmjppHjGsQQuSYqa4AeLxwtAR8a4WaEtZeNin4Ue
  Public key: FIO7svM1qskdtW37AbKvuKyrjm182en1xuskh8zcPHozyhfGuqt53
  FIO Public Address (actor name): dffmxsxuq1gt
  1000
  */
  const account13Info = {
    account: 'dffmxsxuq1gt',
    publicKey: 'FIO7svM1qskdtW37AbKvuKyrjm182en1xuskh8zcPHozyhfGuqt53',
    privateKey: '5J8wgFpv919HmjppHjGsQQuSYqa4AeLxwtAR8a4WaEtZeNin4Ue'
  }


  //end set up 12 more

  /*
  Private key: 5JGyp6ZDEYHsPfEGrEXQdKNJFSvtvMoBuPNWwpfkUi5vQFsu5PU
  Public key: FIO6gPtYH9FzBNSqEfft143Xzt7M5HMW2C3XNSe2aQDAA2csSBP4s
  FIO Public Address (actor name): fidgtwmzrrjq
  */
  const receiveraccountInfo = {
    account: 'fidgtwmzrrjq',
    publicKey: 'FIO6gPtYH9FzBNSqEfft143Xzt7M5HMW2C3XNSe2aQDAA2csSBP4s',
    privateKey: '5JGyp6ZDEYHsPfEGrEXQdKNJFSvtvMoBuPNWwpfkUi5vQFsu5PU'
  }






  it(`Create accounts and sdks`, async () => {
    try {
      userA1 = await newUser(faucet);
      account1sdk = new FIOSDK(account1Info.privateKey, account1Info.publicKey, config.BASE_URL, fetchJson);

      account2sdk = new FIOSDK(account2Info.privateKey, account2Info.publicKey, config.BASE_URL, fetchJson);
      account3sdk = new FIOSDK(account3Info.privateKey, account3Info.publicKey, config.BASE_URL, fetchJson);
      account4sdk = new FIOSDK(account4Info.privateKey, account4Info.publicKey, config.BASE_URL, fetchJson);
      account5sdk = new FIOSDK(account5Info.privateKey, account5Info.publicKey, config.BASE_URL, fetchJson);
      account6sdk = new FIOSDK(account6Info.privateKey, account6Info.publicKey, config.BASE_URL, fetchJson);
      account7sdk = new FIOSDK(account7Info.privateKey, account7Info.publicKey, config.BASE_URL, fetchJson);
      account8sdk = new FIOSDK(account8Info.privateKey, account8Info.publicKey, config.BASE_URL, fetchJson);
      account9sdk = new FIOSDK(account9Info.privateKey, account9Info.publicKey, config.BASE_URL, fetchJson);
      account10sdk = new FIOSDK(account10Info.privateKey, account10Info.publicKey, config.BASE_URL, fetchJson);
      account11sdk = new FIOSDK(account11Info.privateKey, account11Info.publicKey, config.BASE_URL, fetchJson);
      account12sdk = new FIOSDK(account12Info.privateKey, account12Info.publicKey, config.BASE_URL, fetchJson);
      account13sdk = new FIOSDK(account13Info.privateKey, account13Info.publicKey, config.BASE_URL, fetchJson);

      receiveraccountsdk = new FIOSDK(receiveraccountInfo.privateKey, receiveraccountInfo.publicKey, config.BASE_URL, fetchJson);
    }catch (err){
      console.log("ERROR CREATING USERS " + err);
    }
  });

  //account 1 start
  it(`Transfer 2500 tokens to account1`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: account1Info.publicKey,
      amount: 2500000000000,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    expect(result.status).to.equal('OK')
  });

  it(`Lock 2500 tokens account1 lock type 2`, async () => {
    /*

  set up one account and the receiving account.

  sending account.

   "owner": "xkezj1ocwe4r",
              "total_grant_amount": 10000000000000000,
              "unlocked_period_count": 0,
              "grant_type": 2,
              "inhibit_unlocking": 1,
              "remaining_locked_amount": 9999960000000000,
              "timestamp": 1585094915

              */


    const result1 = await userA1.sdk.genericAction('pushTransaction', {
      action: 'addlocked1',
      account: 'eosio',
      data: {
        owner: account1Info.account,
        unlockperiodcount: 0,
        amount: 2500000000000,
        remaining: 2500000000000,
        locktype: lockType2
      }
    })
    expect(result1.status).to.equal('OK')
  });
  //account 1 end

  //account 2 start
  it(`Transfer 2501 tokens to account2`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: account2Info.publicKey,
      amount: 2501000000000,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    expect(result.status).to.equal('OK')
  });

  it(`Lock 2501 tokens account2 lock type 2`, async () => {
    const result1 = await userA1.sdk.genericAction('pushTransaction', {
      action: 'addlocked1',
      account: 'eosio',
      data: {
        owner: account2Info.account,
        unlockperiodcount: 0,
        amount: 2501000000000,
        remaining: 2501000000000,
        locktype: lockType2
      }
    })
    expect(result1.status).to.equal('OK')
  });
  //account 2 end

  //account 3 start
  it(`Transfer 2502 tokens to account3`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: account3Info.publicKey,
      amount: 2502000000000,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    expect(result.status).to.equal('OK')
  });

  it(`Lock 2502 tokens account3 lock type 2`, async () => {
    const result1 = await userA1.sdk.genericAction('pushTransaction', {
      action: 'addlocked1',
      account: 'eosio',
      data: {
        owner: account3Info.account,
        unlockperiodcount: 0,
        amount: 2502000000000,
        remaining: 2502000000000,
        locktype: lockType2
      }
    })
    expect(result1.status).to.equal('OK')
  });
  //account 3 end

  //account 4 start
  it(`Transfer 2503 tokens to account4`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: account4Info.publicKey,
      amount: 2503000000000,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    expect(result.status).to.equal('OK')
  });

  it(`Lock 2503 tokens account4 lock type 2`, async () => {
    const result1 = await userA1.sdk.genericAction('pushTransaction', {
      action: 'addlocked1',
      account: 'eosio',
      data: {
        owner: account4Info.account,
        unlockperiodcount: 0,
        amount: 2503000000000,
        remaining: 2503000000000,
        locktype: lockType2
      }
    })
    expect(result1.status).to.equal('OK')
  });
  //account 4 end

  //account 5 start
  it(`Transfer 2504 tokens to account5`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: account5Info.publicKey,
      amount: 2504000000000,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    expect(result.status).to.equal('OK')
  });

  it(`Lock 2504 tokens account5 lock type 2`, async () => {
    try {
      const result1 = await userA1.sdk.genericAction('pushTransaction', {
        action: 'addlocked1',
        account: 'eosio',
        data: {
          owner: account5Info.account,
          unlockperiodcount: 0,
          amount: 2504000000000,
          remaining: 2504000000000,
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
  it(`Transfer 2505 tokens to account6`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: account6Info.publicKey,
      amount: 2505000000000,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    expect(result.status).to.equal('OK')
  });

  it(`Lock 2505 tokens account6 lock type 2`, async () => {
    const result1 = await userA1.sdk.genericAction('pushTransaction', {
      action: 'addlocked1',
      account: 'eosio',
      data: {
        owner: account6Info.account,
        unlockperiodcount: 0,
        amount: 2505000000000,
        remaining: 2505000000000,
        locktype: lockType2
      }
    })
    expect(result1.status).to.equal('OK')
  });
  //account 6 end

  //account 7 start
  it(`Transfer 2506 tokens to account7`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: account7Info.publicKey,
      amount: 2506000000000,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    expect(result.status).to.equal('OK')
  });

  it(`Lock 2506 tokens account7 lock type 2`, async () => {
    const result1 = await userA1.sdk.genericAction('pushTransaction', {
      action: 'addlocked1',
      account: 'eosio',
      data: {
        owner: account7Info.account,
        unlockperiodcount: 0,
        amount: 2506000000000,
        remaining: 2506000000000,
        locktype: lockType2
      }
    })
    expect(result1.status).to.equal('OK')
  });
  //account 7 end


  //account 8 start
  it(`Transfer 2507 tokens to account8`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: account8Info.publicKey,
      amount: 2507000000000,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    expect(result.status).to.equal('OK')
  });

  it(`Lock 2507 tokens account8 lock type 2`, async () => {
    const result1 = await userA1.sdk.genericAction('pushTransaction', {
      action: 'addlocked1',
      account: 'eosio',
      data: {
        owner: account8Info.account,
        unlockperiodcount: 0,
        amount: 2507000000000,
        remaining: 2507000000000,
        locktype: lockType2
      }
    })
    expect(result1.status).to.equal('OK')
  });
  //account 8 end


  //account 9 start
  it(`Transfer 2508 tokens to account9`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: account9Info.publicKey,
      amount: 2508000000000,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    expect(result.status).to.equal('OK')
  });

  it(`Lock 2508 tokens account9 lock type 2`, async () => {
    const result1 = await userA1.sdk.genericAction('pushTransaction', {
      action: 'addlocked1',
      account: 'eosio',
      data: {
        owner: account9Info.account,
        unlockperiodcount: 0,
        amount: 2508000000000,
        remaining: 2508000000000,
        locktype: lockType2
      }
    })
    expect(result1.status).to.equal('OK')
  });
  //account 9 end

  //account 10 start
  it(`Transfer 2509 tokens to account10`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: account10Info.publicKey,
      amount: 2509000000000,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    expect(result.status).to.equal('OK')
  });

  it(`Lock 2509 tokens account10 lock type 2`, async () => {
    const result1 = await userA1.sdk.genericAction('pushTransaction', {
      action: 'addlocked1',
      account: 'eosio',
      data: {
        owner: account10Info.account,
        unlockperiodcount: 0,
        amount: 2509000000000,
        remaining: 2509000000000,
        locktype: lockType2
      }
    })
    expect(result1.status).to.equal('OK')
  });
  //account 10 end

  //account 11 start
  it(`Transfer 2510 tokens to account11`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: account11Info.publicKey,
      amount: 2510000000000,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    expect(result.status).to.equal('OK')
  });

  it(`Lock 2510 tokens account11 lock type 2`, async () => {
    const result1 = await userA1.sdk.genericAction('pushTransaction', {
      action: 'addlocked1',
      account: 'eosio',
      data: {
        owner: account11Info.account,
        unlockperiodcount: 0,
        amount: 2510000000000,
        remaining: 2510000000000,
        locktype: lockType2
      }
    })
    expect(result1.status).to.equal('OK')
  });
  //account 11 end

  //account 12 start
  it(`Transfer 2511 tokens to account12`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: account12Info.publicKey,
      amount: 2511000000000,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    expect(result.status).to.equal('OK')
  });

  it(`Lock 2511 tokens account12 lock type 2`, async () => {
    const result1 = await userA1.sdk.genericAction('pushTransaction', {
      action: 'addlocked1',
      account: 'eosio',
      data: {
        owner: account12Info.account,
        unlockperiodcount: 0,
        amount: 2511000000000,
        remaining: 2511000000000,
        locktype: lockType2
      }
    })
    expect(result1.status).to.equal('OK')
  });
  //account 12 end


  //account 13 start
  it(`Transfer 2512 tokens to account13`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: account13Info.publicKey,
      amount: 2512000000000,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    expect(result.status).to.equal('OK')
  });

  it(`Lock 2512 tokens account13 lock type 2`, async () => {
    const result1 = await userA1.sdk.genericAction('pushTransaction', {
      action: 'addlocked1',
      account: 'eosio',
      data: {
        owner: account13Info.account,
        unlockperiodcount: 0,
        amount: 2512000000000,
        remaining: 2512000000000,
        locktype: lockType2
      }
    })
    expect(result1.status).to.equal('OK')
  });
  //account 13 end

  it(`Transfer 1 tokens to receiveraccount`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: receiveraccountInfo.publicKey,
      amount: 1000000000,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    expect(result.status).to.equal('OK')
  });

  it(`Lock 1000000000000000 tokens account1 lock type 4 remaining 0`, async () => {
    /*

 receiving account
  "owner": "rqm4vtblgokh",
             "total_grant_amount": 1000000000000000,
             "unlocked_period_count": 0,
             "grant_type": 4,
             "inhibit_unlocking": 1,
             "remaining_locked_amount": 0,
             "timestamp": 1585094965



  */

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

describe(`************************** locks-mainnet-locked-tokens.js ************************** \n    A. Smoke test for Lock Type 2 grant.`, () => {

  let userA1, locksdk, keys, accountnm, transfer_tokens_pub_key_fee
  const lockAmount = 7075065123456789

  const lockType = 2;


  it(`Create users: locksdk`, async () => {
    userA1 = await newUser(faucet);

    keys = await createKeypair();

    accountnm = await getAccountFromKey(keys.publicKey);
    //console.log("priv key ", keys.privateKey);
    //console.log("pub key ", keys.publicKey);
    //console.log("account ",accountnm);

    locksdk = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson);
  });

  it(`Transfer ${lockAmount} tokens to locksdk`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: keys.publicKey,
      amount: lockAmount,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    expect(result.status).to.equal('OK')
  });

  it(`Lock ${lockAmount} tokens for locksdk`, async () => {
    const result1 = await userA1.sdk.genericAction('pushTransaction', {
      action: 'addlocked',
      account: 'eosio',
      data: {
        owner: accountnm,
        amount: lockAmount,
        locktype: lockType
      }
    })
    expect(result1.status).to.equal('OK')
  });

  it(`getFioBalance for genesis locksdk (lock token holder). Expect: available balance 0 `, async () => {
    const result = await locksdk.genericAction('getFioBalance', {});
    //console.log('Result: ', result);
    expect(result.available).to.equal(0);
  });

  it(`Failure test. Transfer 700 FIO from locksdk to userA1. Expect error: ${config.error.insufficientBalance}`, async () => {
    try {
      const result = await locksdk.genericAction('transferTokens', {
        payeeFioPublicKey: userA1.publicKey,
        amount: 700000000000,
        maxFee: config.maxFee,
        technologyProviderId: ''
      })
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      // console.log('Error: ', err)
      expect(err.json.fields[0].error).to.contain(config.error.insufficientBalance)
    }
  });

  it(`Set userA1 domain public to test regaddress from locked token account`, async () => {
    const result = await userA1.sdk.genericAction('setFioDomainVisibility', {
      fioDomain: userA1.domain,
      isPublic: true,
      maxFee: config.maxFee,
      technologyProviderId: ''
    });
    expect(result.status).to.be.a('string').and.equal('OK');
  });

  it(`Confirm that fees in locked account are still usable for regaddress`, async () => {
    try {
      userA1.address2 = generateFioAddress(userA1.domain, 5)
      const result = await locksdk.genericAction('registerFioAddress', {
        fioAddress: userA1.address2,
        maxFee: config.maxFee,
        technologyProviderId: ''
      })
      //console.log('Result: ', result)
      expirationYear = parseInt(result.expiration.split('-', 1));
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json);
      expect(err).to.equal(null);
    }
  })

  it(`Transfer 10 FIO to locksdk`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: keys.publicKey,
      amount: 10000000000,
      maxFee: config.maxFee,
      technologyProviderId: ''
    })
    expect(result.status).to.equal('OK')
  });

  it(`getFioBalance for genesis locksdk (lock token holder). Expect: available balance 10 `, async () => {
    const result = await locksdk.genericAction('getFioBalance', {})
    expect(result.available).to.equal(10000000000)
  });

  it('Get /transfer_tokens_pub_key fee', async () => {
    try {
      const result = await userA1.sdk.getFee('transfer_tokens_pub_key');
      transfer_tokens_pub_key_fee = result.fee;
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  });

  it(`Transfer 10 FIO - transfer_tokens_pub_key_fee from locksdk to userA1`, async () => {
    try {
      const result = await locksdk.genericAction('transferTokens', {
        payeeFioPublicKey: userA1.publicKey,
        amount: 10000000000 - transfer_tokens_pub_key_fee,
        maxFee: config.maxFee,
        technologyProviderId: ''
      })
      //console.log("Result: ", result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error', err.json)
      expect(err).to.equal(null);
    }
  });

  it(`getFioBalance for genesis locksdk (lock token holder). Expect: available balance 0 `, async () => {
    const result = await locksdk.genericAction('getFioBalance', {})
    expect(result.available).to.equal(0)
  });
});

describe(`B. Smoke test for Lock Type 3 grant.`, () => {

  let userA1, locksdk, keys, accountnm, transfer_tokens_pub_key_fee
  const lockAmount = 7075065123456789

  const lockType = 3;


  it(`Create users: locksdk`, async () => {
    userA1 = await newUser(faucet);

    keys = await createKeypair();

    accountnm = await getAccountFromKey(keys.publicKey);
    //console.log("priv key ", keys.privateKey);
    //console.log("pub key ", keys.publicKey);
    //console.log("account ",accountnm);

    locksdk = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson);
  });

  it(`Transfer ${lockAmount} tokens to locksdk`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: keys.publicKey,
      amount: lockAmount,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    expect(result.status).to.equal('OK')
  });

  it(`Lock ${lockAmount} tokens for locksdk`, async () => {
    const result1 = await userA1.sdk.genericAction('pushTransaction', {
      action: 'addlocked',
      account: 'eosio',
      data: {
        owner: accountnm,
        amount: lockAmount,
        locktype: lockType
      }
    })
    expect(result1.status).to.equal('OK')
  });

  it(`getFioBalance for genesis locksdk (lock token holder). Expect: available balance 0 `, async () => {
    const result = await locksdk.genericAction('getFioBalance', {});
    //console.log('Result: ', result);
    expect(result.available).to.equal(0);
  });

  it(`Failure test. Transfer 700 FIO from locksdk to userA1. Expect error: ${config.error.insufficientBalance}`, async () => {
    try {
      const result = await locksdk.genericAction('transferTokens', {
        payeeFioPublicKey: userA1.publicKey,
        amount: 700000000000,
        maxFee: config.maxFee,
        technologyProviderId: ''
      })
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      // console.log('Error: ', err)
      expect(err.json.fields[0].error).to.contain(config.error.insufficientBalance)
    }
  });

  it(`Set userA1 domain public to test regaddress from locked token account`, async () => {
    const result = await userA1.sdk.genericAction('setFioDomainVisibility', {
      fioDomain: userA1.domain,
      isPublic: true,
      maxFee: config.maxFee,
      technologyProviderId: ''
    });
    expect(result.status).to.be.a('string').and.equal('OK');
  });

  it(`Confirm that fees in locked account are still usable for regaddress`, async () => {
    try {
      userA1.address2 = generateFioAddress(userA1.domain, 5)
      const result = await locksdk.genericAction('registerFioAddress', {
        fioAddress: userA1.address2,
        maxFee: config.maxFee,
        technologyProviderId: ''
      })
      //console.log('Result: ', result)
      expirationYear = parseInt(result.expiration.split('-', 1));
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json);
      expect(err).to.equal(null);
    }
  })

  it(`Transfer 10 FIO to locksdk`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: keys.publicKey,
      amount: 10000000000,
      maxFee: config.maxFee,
      technologyProviderId: ''
    })
    expect(result.status).to.equal('OK')
  });

  it(`getFioBalance for genesis locksdk (lock token holder). Expect: available balance 10 `, async () => {
    const result = await locksdk.genericAction('getFioBalance', {})
    expect(result.available).to.equal(10000000000)
  });

  it('Get /transfer_tokens_pub_key fee', async () => {
    try {
      const result = await userA1.sdk.getFee('transfer_tokens_pub_key');
      transfer_tokens_pub_key_fee = result.fee;
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  });

  it(`Transfer 10 FIO - transfer_tokens_pub_key_fee from locksdk to userA1`, async () => {
    try {
      const result = await locksdk.genericAction('transferTokens', {
        payeeFioPublicKey: userA1.publicKey,
        amount: 10000000000 - transfer_tokens_pub_key_fee,
        maxFee: config.maxFee,
        technologyProviderId: ''
      })
      //console.log("Result: ", result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error', err.json)
      expect(err).to.equal(null);
    }
  });

  it(`getFioBalance for genesis locksdk (lock token holder). Expect: available balance 0 `, async () => {
    const result = await locksdk.genericAction('getFioBalance', {})
    expect(result.available).to.equal(0)
  });
});

describe(`C. Smoke test for Lock Type 4 grant.`, () => {

  let userA1, locksdk, keys, accountnm, transfer_tokens_pub_key_fee
  const lockAmount = 7075065123456789

  const lockType = 4;


  it(`Create users: locksdk`, async () => {
    userA1 = await newUser(faucet);

    keys = await createKeypair();

    accountnm = await getAccountFromKey(keys.publicKey);
    //console.log("priv key ", keys.privateKey);
    //console.log("pub key ", keys.publicKey);
    //console.log("account ",accountnm);

    locksdk = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson);
  });

  it(`Transfer ${lockAmount} tokens to locksdk`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: keys.publicKey,
      amount: lockAmount,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    expect(result.status).to.equal('OK')
  });

  it(`Lock ${lockAmount} tokens for locksdk`, async () => {
    const result1 = await userA1.sdk.genericAction('pushTransaction', {
      action: 'addlocked',
      account: 'eosio',
      data: {
        owner: accountnm,
        amount: lockAmount,
        locktype: lockType
      }
    })
    expect(result1.status).to.equal('OK')
  });

  it(`getFioBalance for genesis locksdk (lock token holder). Expect: available balance 0 `, async () => {
    const result = await locksdk.genericAction('getFioBalance', {});
    //console.log('Result: ', result);
    expect(result.available).to.equal(0);
  });

  it(`Failure test. Transfer 700 FIO from locksdk to userA1. Expect error: ${config.error.insufficientBalance}`, async () => {
    try {
      const result = await locksdk.genericAction('transferTokens', {
        payeeFioPublicKey: userA1.publicKey,
        amount: 700000000000,
        maxFee: config.maxFee,
        technologyProviderId: ''
      })
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      // console.log('Error: ', err)
      expect(err.json.fields[0].error).to.contain(config.error.insufficientBalance)
    }
  });

  it(`Set userA1 domain public to test regaddress from locked token account`, async () => {
    const result = await userA1.sdk.genericAction('setFioDomainVisibility', {
      fioDomain: userA1.domain,
      isPublic: true,
      maxFee: config.maxFee,
      technologyProviderId: ''
    });
    expect(result.status).to.be.a('string').and.equal('OK');
  });

  it(`Confirm that fees in locked account are still usable for regaddress`, async () => {
    try {
      userA1.address2 = generateFioAddress(userA1.domain, 5)
      const result = await locksdk.genericAction('registerFioAddress', {
        fioAddress: userA1.address2,
        maxFee: config.maxFee,
        technologyProviderId: ''
      })
      //console.log('Result: ', result)
      expirationYear = parseInt(result.expiration.split('-', 1));
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json);
      expect(err).to.equal(null);
    }
  })

  it(`Transfer 10 FIO to locksdk`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: keys.publicKey,
      amount: 10000000000,
      maxFee: config.maxFee,
      technologyProviderId: ''
    })
    expect(result.status).to.equal('OK')
  });

  it(`getFioBalance for genesis locksdk (lock token holder). Expect: available balance 10 `, async () => {
    const result = await locksdk.genericAction('getFioBalance', {})
    expect(result.available).to.equal(10000000000)
  });

  it('Get /transfer_tokens_pub_key fee', async () => {
    try {
      const result = await userA1.sdk.getFee('transfer_tokens_pub_key');
      transfer_tokens_pub_key_fee = result.fee;
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  });

  it(`Transfer 10 FIO - transfer_tokens_pub_key_fee from locksdk to userA1`, async () => {
    try {
      const result = await locksdk.genericAction('transferTokens', {
        payeeFioPublicKey: userA1.publicKey,
        amount: 10000000000 - transfer_tokens_pub_key_fee,
        maxFee: config.maxFee,
        technologyProviderId: ''
      })
      //console.log("Result: ", result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error', err.json)
      expect(err).to.equal(null);
    }
  });

  it(`getFioBalance for genesis locksdk (lock token holder). Expect: available balance 0 `, async () => {
    const result = await locksdk.genericAction('getFioBalance', {})
    expect(result.available).to.equal(0)
  });
});

describe(`D. Create large 7075065.123456789 grant. Verify unlocking using voting, can't transfer more than unlocked amount, and multiple calls to voting do not have effect.`, () => {

  let userA1, locksdk, keys, accountnm, transfer_tokens_pub_key_fee
  
  const lockAmount = 7075065123456789
  const eightpercent = Math.trunc(lockAmount * 0.08);


  it(`Create users: locksdk`, async () => {
    userA1 = await newUser(faucet);

    keys = await createKeypair();

    accountnm =  await getAccountFromKey(keys.publicKey);
    //console.log("priv key ", keys.privateKey);
    //console.log("pub key ", keys.publicKey);
    //console.log("account ",accountnm);

    locksdk = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson);
  });

  it(`Transfer ${lockAmount} tokens to locksdk`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: keys.publicKey,
      amount: lockAmount,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    expect(result.status).to.equal('OK')
  });

  it(`Lock ${lockAmount} tokens for locksdk`, async () => {
    const result1 = await userA1.sdk.genericAction('pushTransaction', {
      action: 'addlocked',
      account: 'eosio',
      data: {
        owner: accountnm,
        amount: lockAmount,
        locktype: lockType
      }
    })
    expect(result1.status).to.equal('OK')
  });

  it(`getFioBalance for genesis locksdk (lock token holder). Expect: available balance 0 `, async () => {
      const result = await locksdk.genericAction('getFioBalance', { })
      expect(result.available).to.equal(0)
  });

  it(`Failure test. Transfer 700 FIO from locksdk to userA1. Expect error: ${config.error.insufficientBalance}`, async () => {
    try {
    const result = await locksdk.genericAction('transferTokens', {
      payeeFioPublicKey: userA1.publicKey,
      amount: 700000000000,
      maxFee: config.maxFee,
      technologyProviderId: ''
    })
      expect(result.status).to.not.equal('OK')
    } catch (err) {
     // console.log('Error: ', err)
      expect(err.json.fields[0].error).to.contain(config.error.insufficientBalance)
    }
  });

  it(`Set userA1 domain public to test regaddress from locked token account`, async () => {
    const result = await userA1.sdk.genericAction('setFioDomainVisibility', {
      fioDomain: userA1.domain,
      isPublic: true,
      maxFee: config.maxFee,
      technologyProviderId: ''
    });
    expect(result.status).to.be.a('string').and.equal('OK');
  });

  it(`Confirm that fees in locked account are still usable for regaddress`, async () => {
    try {
      userA1.address2 = generateFioAddress(userA1.domain, 5)
      const result = await locksdk.genericAction('registerFioAddress', {
        fioAddress: userA1.address2,
        maxFee: config.maxFee,
        technologyProviderId: ''
      })
      //console.log('Result: ', result)
      expirationYear = parseInt(result.expiration.split('-', 1));
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json);
      expect(err).to.equal(null);
    }
  })

  it(`Transfer 10 FIO to locksdk`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: keys.publicKey,
      amount: 10000000000,
      maxFee: config.maxFee,
      technologyProviderId: ''
    })
    expect(result.status).to.equal('OK')
  });

  it(`getFioBalance for genesis locksdk (lock token holder). Expect: available balance 10 `, async () => {
    const result = await locksdk.genericAction('getFioBalance', {})
    expect(result.available).to.equal(10000000000)
  });

  it('Get /transfer_tokens_pub_key fee', async () => {
    try {
      const result = await userA1.sdk.getFee('transfer_tokens_pub_key');
      transfer_tokens_pub_key_fee = result.fee;
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  });

  it(`Transfer 10 FIO - transfer_tokens_pub_key_fee from locksdk to userA1`, async () => {
    try {
      const result = await locksdk.genericAction('transferTokens', {
        payeeFioPublicKey: userA1.publicKey,
        amount: 10000000000 - transfer_tokens_pub_key_fee,
        maxFee: config.maxFee,
        technologyProviderId: ''
      })
      //console.log("Result: ", result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error', err.json)
      expect(err).to.equal(null);
    }
  });

  it(`getFioBalance for genesis locksdk (lock token holder). Expect: available balance 0 `, async () => {
    const result = await locksdk.genericAction('getFioBalance', {})
    expect(result.available).to.equal(0)
  });

  //wait for unlock 1
  it(`Waiting for unlock 1 of 6`, async () => {
    console.log("            waiting ",lockdurationseconds," seconds")
  });

  it('Wait for lock period', async () => {
    await timeout(lockdurationseconds * 1000);
  });

  it(`locksdk votes for producer`, async () => {
    try {
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          producers: ["bp1@dapixdev"],
          fio_address: '',
          actor: accountnm,
          max_fee: config.maxFee
        }
      })
      // console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("ERROR: ", err)
      expect(err).to.equal(null);
    }
  });

  //check that 6% was unlocked.
  it(`Call get_table_rows from lockedtokens and confirm: 6% unlocked amount`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'lockedtokens',
        lower_bound: accountnm,
        upper_bound: accountnm,
        key_type: 'i64',
        index_position: '1'
      }
      const result = await callFioApi("get_table_rows", json);
      // console.log('Result: ', result);
      expect(result.rows[0].unlocked_period_count).to.equal(1);
      expect(result.rows[0].remaining_locked_amount).to.equal(6650561216049387);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  });

  it(`locksdk votes for producer again`, async () => {
    try {
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          producers: ["bp2@dapixdev"],
          fio_address: '',
          actor: accountnm,
          max_fee: config.maxFee
        }
      })
      // console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("ERROR: ", err)
    }
  });

  //check that 6% was unlocked.
  it(`Call get_table_rows from lockedtokens. Expect: unlocked amount unchangd with multiple voting calls`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'lockedtokens',
        lower_bound: accountnm,
        upper_bound: accountnm,
        key_type: 'i64',
        index_position: '1'
      }
      const result = await callFioApi("get_table_rows", json);
      // console.log('Result: ', result);
      expect(result.rows[0].unlocked_period_count).to.equal(1);
      expect(result.rows[0].remaining_locked_amount).to.equal(6650561216049387);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  });

  it(`Failure. Try to transfer 8% of total FIO from locksdk to userA1. Expect: ${config.error.insufficientBalance}`, async () => {
    try {
      const result = await locksdk.genericAction('transferTokens', {
        payeeFioPublicKey: userA1.publicKey,
        amount: eightpercent,
        maxFee: config.maxFee,
        technologyProviderId: ''
      })
      console.log('Result: ', result)
      expect(result.status).to.equal(null)
    } catch (err) {
      //console.log("ERROR: ", err)
      expect(err.json.fields[0].error).to.contain(config.error.insufficientBalance)
    }
  });

  it(`Transfer 10 FIO from locksdk to userA1. Expect: success`, async () => {
    try {
      const result = await locksdk.genericAction('transferTokens', {
        payeeFioPublicKey: userA1.publicKey,
        amount: 10000000000,
        maxFee: config.maxFee,
        technologyProviderId: ''
      })
      expect(result.status).to.equal('OK')
    } catch (err) {
      //console.log("ERROR: ", err)
      expect(err).to.contain(null)
    }
  });

  //wait for unlock 2
  it(`Waiting for unlock 2 of 6`, async () => {
    console.log("            waiting ",lockdurationseconds," seconds")
  });

  it('Wait for lock period', async () => {
    await timeout(lockdurationseconds * 1000);
  })

  it(`locksdk votes for producer`, async () => {
    try {
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          producers: ["bp1@dapixdev"],
          fio_address: '',
          actor: accountnm,
          max_fee: config.maxFee
        }
      })
      // console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("ERROR: ", err)
    }
  });

  //check that 18.8% was unlocked.
  it(`Call get_table_rows from lockedtokens and confirm: unlocked amount`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'lockedtokens',
        lower_bound: accountnm,
        upper_bound: accountnm,
        key_type: 'i64',
        index_position: '1'
      }
      const result = await callFioApi("get_table_rows", json);
    // console.log('Result: ', result);

      expect(result.rows[0].unlocked_period_count).to.equal(2);
      expect(result.rows[0].remaining_locked_amount).to.equal(5320448972849387);

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  });

  //wait for unlock 3
  it(`Waiting for unlock 3 of 6`, async () => {
    console.log("            waiting ",lockdurationseconds," seconds")
  });

  it('Wait for lock period', async () => {
    await timeout(lockdurationseconds * 1000);
  })

  it(`locksdk votes for producer`, async () => {
    try {
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          producers: ["bp1@dapixdev"],
          fio_address: '',
          actor: accountnm,
          max_fee: config.maxFee
        }
      })
      // console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("ERROR: ", err)
    }
  });

  //check that 18.8% was unlocked.
  it(`Call get_table_rows from lockedtokens and confirm: unlocked amount`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'lockedtokens',
        lower_bound: accountnm,
        upper_bound: accountnm,
        key_type: 'i64',
        index_position: '1'
      }
      const result = await callFioApi("get_table_rows", json);
     // console.log('Result: ', result);

      expect(result.rows[0].unlocked_period_count).to.equal(3);
      expect(result.rows[0].remaining_locked_amount).to.equal(3990336729649387);

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  });

  //wait for unlock 4
  it(`Waiting for unlock 4 of 6`, async () => {
    console.log("            waiting ",lockdurationseconds," seconds")
  });

  it('Wait for lock period', async () => {
    await timeout(lockdurationseconds * 1000);
  })

  it(`locksdk votes for producer`, async () => {
    try {
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          producers: ["bp1@dapixdev"],
          fio_address: '',
          actor: accountnm,
          max_fee: config.maxFee
        }
      })
      // console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("ERROR: ", err)
    }
  });

  //check that 18.8% was unlocked.
  it(`Call get_table_rows from lockedtokens and confirm: unlocked amount`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'lockedtokens',
        lower_bound: accountnm,
        upper_bound: accountnm,
        key_type: 'i64',
        index_position: '1'
      }
      const result = await callFioApi("get_table_rows", json);
    //  console.log('Result: ', result);

      expect(result.rows[0].unlocked_period_count).to.equal(4);
      expect(result.rows[0].remaining_locked_amount).to.equal(2660224486449387);

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  });

  //wait for unlock 5
  it(`Waiting for unlock 5 of 6`, async () => {
    console.log("            waiting ",lockdurationseconds," seconds")
  });

  it('Wait for lock period', async () => {
    await timeout(lockdurationseconds * 1000);
  })

  it(`locksdk votes for producer`, async () => {
    try {
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          producers: ["bp1@dapixdev"],
          fio_address: '',
          actor: accountnm,
          max_fee: config.maxFee
        }
      })
      // console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("ERROR: ", err)
    }
  });

  //check that 18.8% was unlocked.
  it(`Call get_table_rows from lockedtokens and confirm: unlocked amount`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'lockedtokens',
        lower_bound: accountnm,
        upper_bound: accountnm,
        key_type: 'i64',
        index_position: '1'
      }
      const result = await callFioApi("get_table_rows", json);
    //  console.log('Result: ', result);

      expect(result.rows[0].unlocked_period_count).to.equal(5);
      expect(result.rows[0].remaining_locked_amount).to.equal(1330112243249387);

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  });

  //wait for unlock 6
  it(`Waiting for unlock 6 of 6`, async () => {
    console.log("            waiting ",lockdurationseconds," seconds")
  });

  it('Wait for lock period', async () => {
    await timeout(lockdurationseconds * 1000);
  })

  it(`locksdk votes for producer`, async () => {
    try {
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          producers: ["bp1@dapixdev"],
          fio_address: '',
          actor: accountnm,
          max_fee: config.maxFee
        }
      })
      // console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("ERROR: ", err)
    }
  });

  //check that 18.8% was unlocked.
  it(`Call get_table_rows from lockedtokens and confirm: remaining_locked_amount = 0`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'lockedtokens',
        lower_bound: accountnm,
        upper_bound: accountnm,
        key_type: 'i64',
        index_position: '1'
      }
      const result = await callFioApi("get_table_rows", json);
     // console.log('Result: ', result);
      expect(result.rows[0].unlocked_period_count).to.equal(6);
      expect(result.rows[0].remaining_locked_amount).to.equal(0);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  });

  it(`Success, re-vote for producers.`, async () => {
    try {
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          producers: ["bp2@dapixdev"],
          fio_address: '',
          actor: accountnm,
          max_fee: config.maxFee
        }
      })
      // console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("ERROR: ", err)
    }
  });

  it(`Call get_table_rows from lockedtokens and confirm: unlocked amount doesnt change due to re-vote`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'lockedtokens',
        lower_bound: accountnm,
        upper_bound: accountnm,
        key_type: 'i64',
        index_position: '1'
      }
      const result = await callFioApi("get_table_rows", json);
      // console.log('Result: ', result);

      expect(result.rows[0].unlocked_period_count).to.equal(6);
      expect(result.rows[0].remaining_locked_amount).to.equal(0);

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  });
});

describe(`E. Create large 7075065.123456789 grant verify unlocking using transferTokens`, () => {

  let userA1, locksdk, keys, accountnm
  const lockAmount = 7075065123456789

  it(`Create users: locksdk`, async () => {
    userA1 = await newUser(faucet);

    keys = await createKeypair();

    accountnm = await getAccountFromKey(keys.publicKey);
    //console.log("priv key ", keys.privateKey);
    //console.log("pub key ", keys.publicKey);
    //console.log("account ",accountnm);

    locksdk = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson);
  })

  it(`Transfer ${lockAmount} tokens to locksdk`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: keys.publicKey,
      amount: lockAmount,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    expect(result.status).to.equal('OK')
  })

  it(`Lock ${lockAmount} tokens for locksdk`, async () => {
    const result1 = await userA1.sdk.genericAction('pushTransaction', {
      action: 'addlocked',
      account: 'eosio',
      data: {
        owner: accountnm,
        amount: lockAmount,
        locktype: lockType
      }
    })
    expect(result1.status).to.equal('OK')
  })

  it(`getFioBalance for genesis lock token holder, available balance 0 `, async () => {
    const result = await locksdk.genericAction('getFioBalance', { })
    expect(result.available).to.equal(0)
  })

  it(`Failure test Transfer 700 FIO to userA1 FIO public key, insufficient balance tokens locked`, async () => {
    try {
      const result = await locksdk.genericAction('transferTokens', {
        payeeFioPublicKey: userA1.publicKey,
        amount: 700000000000,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        technologyProviderId: ''
      })
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      // console.log('Error: ', err)
      expect(err.json.fields[0].error).to.contain(config.error.insufficientBalance)
    }
  })

  //wait for unlock 1
  it(`Waiting for unlock 1 of 6`, async () => {
    console.log("            waiting ",lockdurationseconds," seconds")
  })

  it('Wait for lock period', async () => {
    await timeout(lockdurationseconds * 1000);
  })

  it(`Success, Transfer 1 FIO to userA1 FIO public key`, async () => {
    try {
      const result = await locksdk.genericAction('transferTokens', {
        payeeFioPublicKey: userA1.publicKey,
        amount: 1000000000,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        technologyProviderId: ''
      })
      expect(result.status).to.equal('OK')
    }catch (err){
      console.log("ERROR: ", err)
      expect(err).to.equal(null);
    }
  })

  //check that 6% was unlocked.
  it(`Call get_table_rows from lockedtokens and confirm: unlocked amount`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'lockedtokens',
        lower_bound: accountnm,
        upper_bound: accountnm,
        key_type: 'i64',
        index_position: '1'
      }
      const result = await callFioApi("get_table_rows", json);
      // console.log('Result: ', result);
      expect(result.rows[0].unlocked_period_count).to.equal(1);
      expect(result.rows[0].remaining_locked_amount).to.equal(6650559216049387);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })


  //wait for unlock 2
  it(`Waiting for unlock 2 of 6`, async () => {
    console.log("            waiting ",lockdurationseconds," seconds")
  })

  it('Wait for lock period', async () => {
    await timeout(lockdurationseconds * 1000);
  })

  it(`Success, Transfer 1 FIO to userA1 FIO public key`, async () => {
    try {
      const result = await locksdk.genericAction('transferTokens', {
        payeeFioPublicKey: userA1.publicKey,
        amount: 1000000000,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        technologyProviderId: ''
      })
      expect(result.status).to.equal('OK')
    }catch (err){
      console.log("ERROR: ", err)
      expect(err).to.equal(null);
    }
  })

  //check that 18.8% was unlocked.
  it(`Call get_table_rows from lockedtokens and confirm: unlocked amount`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'lockedtokens',
        lower_bound: accountnm,
        upper_bound: accountnm,
        key_type: 'i64',
        index_position: '1'
      }
      const result = await callFioApi("get_table_rows", json);
      // console.log('Result: ', result);
      expect(result.rows[0].unlocked_period_count).to.equal(2);
      expect(result.rows[0].remaining_locked_amount).to.equal(5320446972849387);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  //wait for unlock 3
  it(`Waiting for unlock 3 of 6`, async () => {
    console.log("            waiting ",lockdurationseconds," seconds")
  })

  it('Wait for lock period', async () => {
    await timeout(lockdurationseconds * 1000);
  })

  it(`Success, Transfer 1 FIO to userA1 FIO public key`, async () => {
    try {
      const result = await locksdk.genericAction('transferTokens', {
        payeeFioPublicKey: userA1.publicKey,
        amount: 1000000000,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        technologyProviderId: ''
      })
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("ERROR: ", err)
      expect(err).to.equal(null);
    }
  })

  //check that 18.8% was unlocked.
  it(`Call get_table_rows from lockedtokens and confirm: unlocked amount`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'lockedtokens',
        lower_bound: accountnm,
        upper_bound: accountnm,
        key_type: 'i64',
        index_position: '1'
      }
      const result = await callFioApi("get_table_rows", json);
      //console.log('Result: ', result);
      expect(result.rows[0].unlocked_period_count).to.equal(3);
      expect(result.rows[0].remaining_locked_amount).to.equal(3990334729649387);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  //wait for unlock 4
  it(`Waiting for unlock 4 of 6`, async () => {
    console.log("            waiting ",lockdurationseconds," seconds")
  })

  it('Wait for lock period', async () => {
    await timeout(lockdurationseconds * 1000);
  })

  it(`Success, Transfer 1 FIO to userA1 FIO public key`, async () => {
    try {
      const result = await locksdk.genericAction('transferTokens', {
        payeeFioPublicKey: userA1.publicKey,
        amount: 1000000000,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        technologyProviderId: ''
      })
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("ERROR: ", err)
      expect(err).to.equal(null);
    }
  })

  //check that 18.8% was unlocked.
  it(`Call get_table_rows from lockedtokens and confirm: unlocked amount`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'lockedtokens',
        lower_bound: accountnm,
        upper_bound: accountnm,
        key_type: 'i64',
        index_position: '1'
      }
      const result = await callFioApi("get_table_rows", json);
      // console.log('Result: ', result);
      expect(result.rows[0].unlocked_period_count).to.equal(4);
      expect(result.rows[0].remaining_locked_amount).to.equal(2660222486449387);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  //wait for unlock 5
  it(`Waiting for unlock 5 of 6`, async () => {
    console.log("            waiting ",lockdurationseconds," seconds")
  })

  it('Wait for lock period', async () => {
    await timeout(lockdurationseconds * 1000);
  })

  it(`Success, Transfer 1 FIO to userA1 FIO public key`, async () => {
    try {
      const result = await locksdk.genericAction('transferTokens', {
        payeeFioPublicKey: userA1.publicKey,
        amount: 1000000000,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        technologyProviderId: ''
      })
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("ERROR: ", err)
      expect(err).to.equal(null);
    }
  })

  //check that 18.8% was unlocked.
  it(`Call get_table_rows from lockedtokens and confirm: unlocked amount`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'lockedtokens',
        lower_bound: accountnm,
        upper_bound: accountnm,
        key_type: 'i64',
        index_position: '1'
      }
      const result = await callFioApi("get_table_rows", json);
      // console.log('Result: ', result);
      expect(result.rows[0].unlocked_period_count).to.equal(5);
      expect(result.rows[0].remaining_locked_amount).to.equal(1330110243249387);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  //wait for unlock 6
  it(`Waiting for unlock 6 of 6`, async () => {
    console.log("            waiting ",lockdurationseconds," seconds")
  })

  it('Wait for lock period', async () => {
    await timeout(lockdurationseconds * 1000);
  })

  it(`Success, Transfer 1 FIO to userA1 FIO public key`, async () => {
    try {
      const result = await locksdk.genericAction('transferTokens', {
        payeeFioPublicKey: userA1.publicKey,
        amount: 1000000000,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        technologyProviderId: ''
      })
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("ERROR: ", err)
      expect(err).to.equal(null);
    }
  })

  //check that 18.8% was unlocked.
  it(`Call get_table_rows from lockedtokens and confirm: unlocked amount`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'lockedtokens',
        lower_bound: accountnm,
        upper_bound: accountnm,
        key_type: 'i64',
        index_position: '1'
      }
      const result = await callFioApi("get_table_rows", json);
      // console.log('Result: ', result);
      expect(result.rows[0].unlocked_period_count).to.equal(6);
      expect(result.rows[0].remaining_locked_amount).to.equal(0);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

});

describe(`F. Create large grant verify unlocking with skipped periods using voting`, () => {

  let userA1, locksdk, keys, accountnm
  const lockAmount = 7075065123456789

  it(`Create users: locksdk`, async () => {
    userA1 = await newUser(faucet);

    keys = await createKeypair();

    accountnm = await getAccountFromKey(keys.publicKey);
    //console.log("priv key ", keys.privateKey);
    //console.log("pub key ", keys.publicKey);
    //console.log("account ",accountnm);

    locksdk = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson);
  })

  it(`Transfer ${lockAmount} tokens to locksdk`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: keys.publicKey,
      amount: lockAmount,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    expect(result.status).to.equal('OK')
  })

  it(`Lock ${lockAmount} tokens for locksdk`, async () => {
    const result1 = await userA1.sdk.genericAction('pushTransaction', {
      action: 'addlocked',
      account: 'eosio',
      data: {
        owner: accountnm,
        amount: lockAmount,
        locktype: lockType
      }
    })
    expect(result1.status).to.equal('OK')
  })

  it(`getFioBalance for genesis lock token holder, available balance 0 `, async () => {
    const result = await locksdk.genericAction('getFioBalance', { })
    expect(result.available).to.equal(0)
  })

  it(`Failure test Transfer 700 FIO to userA1 FIO public key, insufficient balance tokens locked`, async () => {
    try {
      const result = await locksdk.genericAction('transferTokens', {
        payeeFioPublicKey: userA1.publicKey,
        amount: 700000000000,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        technologyProviderId: ''
      })
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      // console.log('Error: ', err)
      expect(err.json.fields[0].error).to.contain(config.error.insufficientBalance)
    }
  })

  //wait for unlock 3
  it(`Waiting for unlock 3 of 6, this is 3 minutes`, async () => {
    console.log("            waiting ",lockdurationseconds * 3," seconds")
  })

  it('Wait for lock period', async () => {
    await timeout(lockdurationseconds * 1000 * 3);
  })

  it(`Success, vote for producers.`, async () => {
    try {
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          producers: ["bp1@dapixdev"],
          fio_address: '',
          actor: accountnm,
          max_fee: config.maxFee
        }
      })
      // console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("ERROR: ", err)
      expect(err).to.equal(null);
    }
  })

  //check that 18.8% was unlocked.
  it(`Call get_table_rows from lockedtokens and confirm: unlocked amount`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'lockedtokens',
        lower_bound: accountnm,
        upper_bound: accountnm,
        key_type: 'i64',
        index_position: '1'
      }
      const result = await callFioApi("get_table_rows", json);
     // console.log('Result: ', result);
      expect(result.rows[0].unlocked_period_count).to.equal(3);
      expect(result.rows[0].remaining_locked_amount).to.equal(3990336729639387);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })


  //wait for unlock 6
  it(`Waiting for unlock 6 of 6, 3 minutes`, async () => {
    console.log("            waiting ",lockdurationseconds * 3," seconds")
  })

  it('Wait for lock period', async () => {
    await timeout(lockdurationseconds * 1000 * 3);
  })

  it(`Success, vote for producers.`, async () => {
    try {
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          producers: ["bp1@dapixdev"],
          fio_address: '',
          actor: accountnm,
          max_fee: config.maxFee
        }
      })
      // console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("ERROR: ", err)
    }
  })

  //check that 18.8% was unlocked.
  it(`Call get_table_rows from lockedtokens and confirm: unlocked amount`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'lockedtokens',
        lower_bound: accountnm,
        upper_bound: accountnm,
        key_type: 'i64',
        index_position: '1'
      }
      const result = await callFioApi("get_table_rows", json);
      // console.log('Result: ', result);
      expect(result.rows[0].unlocked_period_count).to.equal(6);
      expect(result.rows[0].remaining_locked_amount).to.equal(0);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

});

describe(`G. Create large grant verify unlocking with skipped periods using transfer`, () => {

  let userA1, locksdk, keys, accountnm
  const lockAmount = 7075065123456789

  it(`Create users: locksdk`, async () => {
    userA1 = await newUser(faucet);

    keys = await createKeypair();

    accountnm = await getAccountFromKey(keys.publicKey);
    //console.log("priv key ", keys.privateKey);
    //console.log("pub key ", keys.publicKey);
    //console.log("account ",accountnm);

    locksdk = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson);
  })

  it(`Transfer ${lockAmount} tokens to locksdk`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: keys.publicKey,
      amount: lockAmount,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    expect(result.status).to.equal('OK')
  })

  it(`Lock ${lockAmount} tokens for locksdk`, async () => {
    const result1 = await userA1.sdk.genericAction('pushTransaction', {
      action: 'addlocked',
      account: 'eosio',
      data: {
        owner: accountnm,
        amount: lockAmount,
        locktype: lockType
      }
    })
    expect(result1.status).to.equal('OK')
  })

  it(`getFioBalance for genesis lock token holder, available balance 0 `, async () => {
    const result = await locksdk.genericAction('getFioBalance', { })
    expect(result.available).to.equal(0)
  })

  it(`Failure test Transfer 700 FIO to userA1 FIO public key, insufficient balance tokens locked`, async () => {
    try {
      const result = await locksdk.genericAction('transferTokens', {
        payeeFioPublicKey: userA1.publicKey,
        amount: 700000000000,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        technologyProviderId: ''
      })
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      // console.log('Error: ', err)
      expect(err.json.fields[0].error).to.contain(config.error.insufficientBalance)
    }
  })

  //wait for unlock 3
  it(`Waiting for unlock 3 of 6`, async () => {
    console.log("            waiting ",lockdurationseconds * 3," seconds")
  })

  it('Wait for lock period', async () => {
    await timeout(lockdurationseconds * 1000 * 3);
  })

  it(`Success, Transfer 1 FIO to userA1 FIO public key`, async () => {
    try {
      const result = await locksdk.genericAction('transferTokens', {
        payeeFioPublicKey: userA1.publicKey,
        amount: 1000000000,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        technologyProviderId: ''
      })
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("ERROR: ", err)
      expect(err).to.equal(null);
    }
  })

  //check that 18.8% was unlocked.
  it(`Call get_table_rows from lockedtokens and confirm: unlocked amount`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'lockedtokens',
        lower_bound: accountnm,
        upper_bound: accountnm,
        key_type: 'i64',
        index_position: '1'
      }
      const result = await callFioApi("get_table_rows", json);
      //console.log('Result: ', result);
      expect(result.rows[0].unlocked_period_count).to.equal(3);
      expect(result.rows[0].remaining_locked_amount).to.equal(3990334729639387);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })


  //wait for unlock 6
  it(`Waiting for unlock 6 of 6`, async () => {
    console.log("            waiting ",lockdurationseconds * 3," seconds")
  })

  it('Wait for lock period', async () => {
    await timeout(lockdurationseconds * 1000 * 3);
  })

  it(`Success, Transfer 1 FIO to userA1 FIO public key`, async () => {
    try {
      const result = await locksdk.genericAction('transferTokens', {
        payeeFioPublicKey: userA1.publicKey,
        amount: 1000000000,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        technologyProviderId: ''
      })
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("ERROR: ", err)
      expect(err).to.equal(null);
    }
  })

  //check that 18.8% was unlocked.
  it(`Call get_table_rows from lockedtokens and confirm: unlocked amount`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'lockedtokens',
        lower_bound: accountnm,
        upper_bound: accountnm,
        key_type: 'i64',
        index_position: '1'
      }
      const result = await callFioApi("get_table_rows", json);
      // console.log('Result: ', result);
      expect(result.rows[0].unlocked_period_count).to.equal(6);
      expect(result.rows[0].remaining_locked_amount).to.equal(0);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  });
});

describe(`H. (BD-2632, BD-2759) Verify get_fio_balance returns accurate balance when an expired mainnet lock is in the table`, () => {
  // create two mainnet (genesis) locks
  let user1, locksdk1, locksdk2, keys1, keys2, accountnm1, accountnm2, transfer_tokens_pub_key_fee
  const lockAmount1 = 7000000000000;
  const lockAmount2 = 6000000000000;
  const eightpercent = Math.trunc(lockAmount1 * 0.08);
  let initialLockSdk1Bal, initialLockSdk2Bal;
  const numPeriods = 6;

  before(async () => {
    user1 = await newUser(faucet);
    keys1 = await createKeypair();
    keys2 = await createKeypair();
    accountnm1 =  await getAccountFromKey(keys1.publicKey);
    accountnm2 =  await getAccountFromKey(keys2.publicKey);
    //console.log("priv key ", keys.privateKey);
    //console.log("pub key ", keys.publicKey);
    //console.log("account ",accountnm);
    locksdk1 = new FIOSDK(keys1.privateKey, keys1.publicKey, config.BASE_URL, fetchJson);
    locksdk2 = new FIOSDK(keys2.privateKey, keys2.publicKey, config.BASE_URL, fetchJson);

    console.log(`Transfer ${lockAmount1} tokens to locksdk1`);
    const transfer1 = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: keys1.publicKey,
      amount: lockAmount1,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    });
    expect(transfer1.status).to.equal('OK');

    const transfer2 = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: keys2.publicKey,
      amount: lockAmount2,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    });
    expect(transfer2.status).to.equal('OK');

    console.log(`Lock ${lockAmount1} tokens for locksdk`);
    // const lock1 = await user1.sdk.genericAction('pushTransaction', {
    //   action: 'addlocked',
    //   account: 'eosio',
    //   data: {
    //     owner: accountnm1,
    //     amount: lockAmount1 - 1000000000,
    //     locktype: lockType
    //   }
    // });
    const lock1 = await locksdk1.genericAction('pushTransaction', {
      action: 'addlocked',
      account: 'eosio',
      data: {
        owner: accountnm1,
        amount: lockAmount1 - 1000000000,
        locktype: lockType
      }
    });
    expect(lock1.status).to.equal('OK');

    const lock2 = await locksdk2.genericAction('pushTransaction', {
      action: 'addlocked',
      account: 'eosio',
      data: {
        owner: accountnm2,
        amount: lockAmount2,
        locktype: lockType
      }
    })
    expect(lock2.status).to.equal('OK');

  });

  // call get_fio_balance, record results
  it(`getFioBalance for genesis locksdk1 (lock token holder). Expect: available balance 0 `, async () => {
    const result = await locksdk1.genericAction('getFioBalance', {});
    expect(result.available).to.equal(1000000000);
    initialLockSdk1Bal = result;
  });

  it(`getFioBalance for genesis locksdk2 (lock token holder). Expect: available balance 0 `, async () => {
    const result = await locksdk2.genericAction('getFioBalance', {});
    expect(result.available).to.equal(0);
    initialLockSdk2Bal = result;
  });

  it(`Call get_table_rows from lockedtokens and confirm: 6% unlocked amount`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'lockedtokens',
        lower_bound: accountnm1,
        upper_bound: accountnm1,
        key_type: 'i64',
        index_position: '1'
      }
      const result = await callFioApi("get_table_rows", json);
      // console.log('Result: ', result);
      expect(result.rows[0].unlocked_period_count).to.equal(0);
      expect(result.rows[0].remaining_locked_amount).to.equal(initialLockSdk1Bal.balance - initialLockSdk1Bal.available);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  });

  it(`wait for ${numPeriods} lock periods`, async () => {
    await timeout(lockdurationseconds * (numPeriods * 1000));
  })

  // call get_table on `eosio lockedtokens`, expect `lock_amount` and `remaining_lock_amount` to be correct and include the amount from the expired lock, even though it is still in the table
  it(`Call get_table_rows from lockedtokens and confirm: 6% unlocked amount`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'lockedtokens',
        lower_bound: accountnm1,
        upper_bound: accountnm1,
        key_type: 'i64',
        index_position: '1'
      }
      const result = await callFioApi("get_table_rows", json);
      // console.log('Result: ', result);
      expect(result.rows[0].unlocked_period_count).to.equal(0);
      expect(result.rows[0].remaining_locked_amount).to.equal(initialLockSdk1Bal.balance - initialLockSdk1Bal.available);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  });

  it(`Call get_table_rows from lockedtokens and confirm: 6% unlocked amount`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'lockedtokens',
        lower_bound: accountnm2,
        upper_bound: accountnm2,
        key_type: 'i64',
        index_position: '1'
      }
      const result = await callFioApi("get_table_rows", json);
      // console.log('Result: ', result);
      expect(result.rows[0].unlocked_period_count).to.equal(0);
      expect(result.rows[0].remaining_locked_amount).to.equal(initialLockSdk2Bal.balance);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`getFioBalance for genesis locksdk1 (lock token holder). Expect: available balance 0 `, async () => {
    const result = await locksdk1.genericAction('getFioBalance', {});
    expect(result.available).to.equal(1000000000);
  });

  it(`getFioBalance for genesis locksdk2 (lock token holder). Expect: available balance 0 `, async () => {
    const result = await locksdk2.genericAction('getFioBalance', {});
    expect(result.available).to.equal(0);
  });

});

describe(`I  Voting power test for type 1 locks.`, () => {

  let locksdktype1, locksdktype2, keys1, keys2, accountnm1, accountnm2, transfer_tokens_pub_key_fee
  const lockAmount1 = 12345000000000;
  const lockAmount2 = 56789000000000;

  const lockType1 = 1;
  const lockType2 = 2;


  it(`Create users: `, async () => {
    userA1 = await newUser(faucet);

    keys1 = await createKeypair();
    keys2 = await createKeypair();

    accountnm1 = await getAccountFromKey(keys1.publicKey);
    accountnm2 = await getAccountFromKey(keys2.publicKey);
    //console.log("priv key ", keys.privateKey);
    //console.log("pub key ", keys.publicKey);
    //console.log("account ",accountnm);

    locksdktype1 = new FIOSDK(keys1.privateKey, keys1.publicKey, config.BASE_URL, fetchJson);
    locksdktype2 = new FIOSDK(keys2.privateKey, keys2.publicKey, config.BASE_URL, fetchJson);

  });

  it(`Transfer ${lockAmount1} tokens to locksdktype1`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: keys1.publicKey,
      amount: lockAmount1,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    expect(result.status).to.equal('OK')
  });

  it(`Lock ${lockAmount1} tokens for locksdktype1`, async () => {
    const result1 = await userA1.sdk.genericAction('pushTransaction', {
      action: 'addlocked',
      account: 'eosio',
      data: {
        owner: accountnm1,
        amount: lockAmount1,
        locktype: lockType1
      }
    })
    expect(result1.status).to.equal('OK')
  });

  it(`getFioBalance for genesis locksdktype1 (lock token holder). Expect: available balance 0 `, async () => {
    const result = await locksdktype1.genericAction('getFioBalance', {});
    //console.log('Result: ', result);
    expect(result.available).to.equal(0);
  });

  it(`Set userA1 domain public to test regaddress from locked token account`, async () => {
    const result = await userA1.sdk.genericAction('setFioDomainVisibility', {
      fioDomain: userA1.domain,
      isPublic: true,
      maxFee: config.maxFee,
      technologyProviderId: ''
    });
    expect(result.status).to.be.a('string').and.equal('OK');
  });

  it(`Confirm that fees in locked account are still usable for regaddress`, async () => {
    try {
      userA1.address2 = generateFioAddress(userA1.domain, 5)
      const result = await locksdktype1.genericAction('registerFioAddress', {
        fioAddress: userA1.address2,
        maxFee: config.maxFee,
        technologyProviderId: ''
      })
      //console.log('Result: ', result)
      expirationYear = parseInt(result.expiration.split('-', 1));
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json);
      expect(err).to.equal(null);
    }
  })

  it(`locksdktype1 votes for bp1@dapixdev using address #1`, async () => {
    try {
      const result = await locksdktype1.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: userA1.address2,
          actor: accountnm1,
          max_fee: config.maxFee
        }
      })
      //console.log('Result: ', result)
      console.log('                   validate result status');
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }
  })

  it('Confirm locksdktype1: is in the voters table and last vote weight less than lock amount', async () => {
    let inVotersTable;
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'voters',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      console.log ("account is ", accountnm1)
      const voters = await callFioApi("get_table_rows", json);
      // console.log('voters: ', voters.rows);
      inVotersTable = false;
      for (voter in voters.rows) {
        if (voters.rows[voter].owner == accountnm1) {
          inVotersTable = true;
          console.log('                   validate is auto proxy');
          expect(voters.rows[voter].is_auto_proxy).to.equal(0)
          console.log('                   validate proxy');
          expect(voters.rows[voter].proxy).to.equal('')
          break;
        }
      }
      console.log('                   validate in voters table ');
      expect(inVotersTable).to.equal(true)
      console.log('                   validate last vote weight');
      console.log(' last vote weight is ',voters.rows[voter].last_vote_weight)
      expect(voters.rows[voter].last_vote_weight).not.equal( '12345000000000.00000000000000000');

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })


  it(`Waiting 70 seconds for unlock`, async () => {
    console.log("           70 seconds ")
  })

  it(`wait for 70 seconds`, async () => {
    await timeout(70 * 1000);
  })

  //check voting power it should be the full amount...but is not!!


  it('Confirm locksdktype1: is in the voters table and last vote weight less than lock amount', async () => {
    let inVotersTable;
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'voters',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      const voters = await callFioApi("get_table_rows", json);
      // console.log('voters: ', voters.rows);
      inVotersTable = false;
      for (voter in voters.rows) {
        if (voters.rows[voter].owner == accountnm1) {
          inVotersTable = true;
          console.log('                   validate is auto proxy');
          expect(voters.rows[voter].is_auto_proxy).to.equal(0)
          console.log('                   validate proxy');
          expect(voters.rows[voter].proxy).to.equal('')
          break;
        }
      }
      console.log('                   validate in voters table ');
      expect(inVotersTable).to.equal(true)
      console.log('                   validate last vote weight');
      console.log(' last vote weight is ',voters.rows[voter].last_vote_weight)
      expect(voters.rows[voter].last_vote_weight).not.equal( '12345000000000.00000000000000000');

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Transfer 1 token to locksdktype1`, async () => {
    const result = await userA1.sdk.genericAction('transferTokens', {
      payeeFioPublicKey: keys1.publicKey,
      amount: 1000000000,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    expect(result.status).to.equal('OK')
  });

  it('Confirm locksdktype1: is in the voters table and last vote weight corrects', async () => {
    let inVotersTable;
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'voters',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      const voters = await callFioApi("get_table_rows", json);
      // console.log('voters: ', voters.rows);
      inVotersTable = false;
      for (voter in voters.rows) {
        if (voters.rows[voter].owner == accountnm1) {
          inVotersTable = true;
          console.log('                   validate is auto proxy');
          expect(voters.rows[voter].is_auto_proxy).to.equal(0)
          console.log('                   validate proxy');
          expect(voters.rows[voter].proxy).to.equal('')
          break;
        }
      }
      console.log('                   validate in voters table ');
      expect(inVotersTable).to.equal(true)
      console.log('                   validate last vote weight');
      console.log(' last vote weight is ',voters.rows[voter].last_vote_weight)
      expect(voters.rows[voter].last_vote_weight).not.equal( '12346000000000.00000000000000000');

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })



});

describe(`J  Voting power test for type 2 locks.`, () => {

  let locksdktype1, locksdktype2, keys1, keys2, accountnm1, accountnm2, transfer_tokens_pub_key_fee
  const lockAmount1 = 12345000000000;
  const lockAmount2 = 56789000000000;

  const lockType1 = 1;
  const lockType2 = 2;


  it(`Create users: `, async () => {
    userA1 = await newUser(faucet);

    keys1 = await createKeypair();
    keys2 = await createKeypair();

    accountnm1 = await getAccountFromKey(keys1.publicKey);
    accountnm2 = await getAccountFromKey(keys2.publicKey);
    //console.log("priv key ", keys.privateKey);
    //console.log("pub key ", keys.publicKey);
    //console.log("account ",accountnm);

    locksdktype1 = new FIOSDK(keys1.privateKey, keys1.publicKey, config.BASE_URL, fetchJson);
    locksdktype2 = new FIOSDK(keys2.privateKey, keys2.publicKey, config.BASE_URL, fetchJson);

  });

  it(`Transfer ${lockAmount1} tokens to locksdktype1`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: keys1.publicKey,
      amount: lockAmount1,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    expect(result.status).to.equal('OK')
  });

  it(`Lock ${lockAmount1} tokens for locksdktype1`, async () => {
    const result1 = await userA1.sdk.genericAction('pushTransaction', {
      action: 'addlocked',
      account: 'eosio',
      data: {
        owner: accountnm1,
        amount: lockAmount1,
        locktype: lockType2
      }
    })
    expect(result1.status).to.equal('OK')
  });

  it(`getFioBalance for genesis locksdktype1 (lock token holder). Expect: available balance 0 `, async () => {
    const result = await locksdktype1.genericAction('getFioBalance', {});
    //console.log('Result: ', result);
    expect(result.available).to.equal(0);
  });

  it(`Set userA1 domain public to test regaddress from locked token account`, async () => {
    const result = await userA1.sdk.genericAction('setFioDomainVisibility', {
      fioDomain: userA1.domain,
      isPublic: true,
      maxFee: config.maxFee,
      technologyProviderId: ''
    });
    expect(result.status).to.be.a('string').and.equal('OK');
  });

  it(`Confirm that fees in locked account are still usable for regaddress`, async () => {
    try {
      userA1.address2 = generateFioAddress(userA1.domain, 5)
      const result = await locksdktype1.genericAction('registerFioAddress', {
        fioAddress: userA1.address2,
        maxFee: config.maxFee,
        technologyProviderId: ''
      })
      //console.log('Result: ', result)
      expirationYear = parseInt(result.expiration.split('-', 1));
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json);
      expect(err).to.equal(null);
    }
  })

  it(`locksdktype1 votes for bp1@dapixdev using address #1`, async () => {
    try {
      const result = await locksdktype1.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: userA1.address2,
          actor: accountnm1,
          max_fee: config.maxFee
        }
      })
      //console.log('Result: ', result)
      console.log('                   validate result status');
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }
  })

  it('Confirm locksdktype1: is in the voters table and last vote weight less than lock amount', async () => {
    let inVotersTable;
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'voters',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      console.log ("account is ", accountnm1)
      const voters = await callFioApi("get_table_rows", json);
      // console.log('voters: ', voters.rows);
      inVotersTable = false;
      for (voter in voters.rows) {
        if (voters.rows[voter].owner == accountnm1) {
          inVotersTable = true;
          console.log('                   validate is auto proxy');
          expect(voters.rows[voter].is_auto_proxy).to.equal(0)
          console.log('                   validate proxy');
          expect(voters.rows[voter].proxy).to.equal('')
          break;
        }
      }
      console.log('                   validate in voters table ');
      expect(inVotersTable).to.equal(true)
      console.log('                   validate last vote weight');
      console.log(' last vote weight is ',voters.rows[voter].last_vote_weight)
      expect(voters.rows[voter].last_vote_weight).not.equal( '12345000000000.00000000000000000');

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Waiting 70 seconds for unlock`, async () => {
    console.log("           70 seconds ")
  })

  it(`wait for 70 seconds`, async () => {
    await timeout(70 * 1000);
  })

  //check voting power it should be the full amount...but is not!!

  it('Confirm locksdktype1: is in the voters table and last vote weight less than lock amount', async () => {
    let inVotersTable;
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'voters',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      const voters = await callFioApi("get_table_rows", json);
      // console.log('voters: ', voters.rows);
      inVotersTable = false;
      for (voter in voters.rows) {
        if (voters.rows[voter].owner == accountnm1) {
          inVotersTable = true;
          console.log('                   validate is auto proxy');
          expect(voters.rows[voter].is_auto_proxy).to.equal(0)
          console.log('                   validate proxy');
          expect(voters.rows[voter].proxy).to.equal('')
          break;
        }
      }
      console.log('                   validate in voters table ');
      expect(inVotersTable).to.equal(true)
      console.log('                   validate last vote weight');
      console.log(' last vote weight is ',voters.rows[voter].last_vote_weight)
      expect(voters.rows[voter].last_vote_weight).not.equal( '12345000000000.00000000000000000');

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Transfer 1 token to locksdktype1`, async () => {
    const result = await userA1.sdk.genericAction('transferTokens', {
      payeeFioPublicKey: keys1.publicKey,
      amount: 1000000000,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    expect(result.status).to.equal('OK')
  });

  it('Confirm locksdktype1: is in the voters table and last vote weight corrects', async () => {
    let inVotersTable;
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'voters',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      const voters = await callFioApi("get_table_rows", json);
      // console.log('voters: ', voters.rows);
      inVotersTable = false;
      for (voter in voters.rows) {
        if (voters.rows[voter].owner == accountnm1) {
          inVotersTable = true;
          console.log('                   validate is auto proxy');
          expect(voters.rows[voter].is_auto_proxy).to.equal(0)
          console.log('                   validate proxy');
          expect(voters.rows[voter].proxy).to.equal('')
          break;
        }
      }
      console.log('                   validate in voters table ');
      expect(inVotersTable).to.equal(true)
      console.log('                   validate last vote weight');
      console.log(' last vote weight is ',voters.rows[voter].last_vote_weight)
      expect(voters.rows[voter].last_vote_weight).not.equal( '12346000000000.00000000000000000');

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })



});
