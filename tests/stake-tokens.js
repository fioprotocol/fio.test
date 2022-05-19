require('mocha');
const {expect} = require('chai');
const {newUser, existingUser, getAccountFromKey, fetchJson, generateFioDomain, generateFioAddress, createKeypair, getTotalVotedFio, getProdVoteTotal, timeout, callFioApi} = require('../utils.js');
const {FIOSDK} = require('@fioprotocol/fiosdk');
const config = require('../config.js');
const {getStakedTokenPool, getCombinedTokenPool, getGlobalSrpCount} = require('./Helpers/token-pool.js');
const UNSTAKELOCKDURATIONSECONDS = config.UNSTAKELOCKDURATIONSECONDS;
const SECONDSPERDAY = config.SECONDSPERDAY;
let faucet;

/********************* setting up these tests
 *
 * !!! IF YOU DON'T WANT TO MESS WITH THESE STEPS MANUALLY !!!
 *
 * The changes are already made in fio.contracts branch ben/develop
 *
 * I will do mybest to keep ben/develop current with the latest develop updates
 *
 * If the branch falls out of date or you would rather make the changes yourself, perform the steps below
 *
 *
 *
 *
 * 1. you must shorten the unstake locking period
 *
 *  go to the contract fio.staking.cpp and change the following lines
 *
 *  change
 *
 *  int64_t UNSTAKELOCKDURATIONSECONDS = 604800;
 *
 *    to become
 *
 *  int64_t UNSTAKELOCKDURATIONSECONDS = 70;
 *
 *  Next, update both instances of SECONDSPERDAY in the unstakefio function to 10:
 *
 *   //the days since launch.
 *   uint32_t insertday = (lockiter->timestamp + insertperiod) / SECONDSPERDAY;
 *
 *     to become
 *
 *   //the days since launch.
 *   uint32_t insertday = (lockiter->timestamp + insertperiod) / 10;
 *
 *     and
 *
 *   daysforperiod = (lockiter->timestamp + lockiter->periods[i].duration)/SECONDSPERDAY;
 *
 *     to become
 *
 *   daysforperiod = (lockiter->timestamp + lockiter->periods[i].duration)/10;
 *
 *
 *  2. To enable daily staking rewards, change the foundation account to be one of the accounts we use to test:
 *
 *    2.1 In fio.accounts.hpp
 *
 *      change the following line:
 *
 *      static const name FOUNDATIONACCOUNT = name("tw4tjkmo4eyd");
 *
 *      to become:
 *
 *     //must change foundation account for testing BPCLAIM...test change only!!
 *     static const name FOUNDATIONACCOUNT = name("htjonrkf1lgs");
 *
 *  3. Change the allowable BP claim time (usually 4 hours)
 *
 *    In fio.common.hpp
 *
 *      change the following line:
 *
 *      #define SECONDSBETWEENBPCLAIM (SECONDSPERHOUR * 4)
 *
 *      to become
 *
 *      #define SECONDSBETWEENBPCLAIM (5)
 */

/********************* Calculations
 *
 * For getFioBalance:
 *   balance =
 *
 *   available = balance - staked - unstaked & locked
 *
 *   staked = Total staked. Changes when staking/unstaking.
 *
 *   srps =
 *     When Staking: srps = prevSrps + stakeAmount/roe
 *     When Unstaking: srps = prevSrps - (prevSrps * (unstakeAmount/totalStaked))
 *
 *   roe = Calculated (1 SRP = [ Tokens in Combined Token Pool / Global SRPs ] FIO)
 */

function wait (ms){
  let start = new Date().getTime();
  let end = start;
  while(end < start + ms) {
    end = new Date().getTime();
  }
}

async function getBundleCount (user) {
  const result = await user.genericAction('getFioNames', { fioPublicKey: user.publicKey });
  return result.fio_addresses[0].remaining_bundled_tx;
}

async function consumeRemainingBundles (user, user2) {
  let bal, bundles;
  bundles = await getBundleCount(user.sdk);
  bal = await user.sdk.genericAction('getFioBalance', {});
  process.stdout.write('\tconsuming remaining bundled transactions\n\tthis may take a while');
  if (bundles % 2 !== 0) {
    try {
      const result = await user.sdk.genericAction('addPublicAddresses', {
        fioAddress: user.address,
        publicAddresses: [
          {
            chain_code: 'ETH',
            token_code: 'ETH',
            public_address: 'ethaddress',
          }
        ],
        maxFee: config.api.add_pub_address.fee,
        walletFioAddress: ''
      })
      //console.log('Result:', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log(`Error consuming bundle, retrying (${err.message})`);
      wait(1000);
      bal = await user.sdk.genericAction('getFioBalance', {});
    } finally {
      bundles = await getBundleCount(user.sdk);
      bal = await user.sdk.genericAction('getFioBalance', {});
      expect(bundles % 2).to.equal(0);
    }
  }



  while (bundles > 0) {
    try {
      // await user.sdk.genericAction('pushTransaction', {
      //   action: 'voteproxy',
      //   account: 'eosio',
      //   data: {
      //     proxy: user2.address,
      //     fio_address: user.address,
      //     actor: user.account,
      //     max_fee: config.api.proxy_vote.fee
      //   }
      // });

      await user.sdk.genericAction('recordObtData', {
        payerFioAddress: user.address,
        payeeFioAddress: user2.address,
        payerTokenPublicAddress: user.publicKey,
        payeeTokenPublicAddress: user2.publicKey,
        amount: 5000000000,
        chainCode: "BTC",
        tokenCode: "BTC",
        status: '',
        obtId: '',
        maxFee: config.api.record_obt_data.fee,
        technologyProviderId: '',
        payeeFioPublicKey: user2.publicKey,
        memo: 'this is a test',
        hash: '',
        offLineUrl: ''
      })
      process.stdout.write('.');
      bal = await user.sdk.genericAction('getFioBalance', {});
      // wait(500);  //1000);
    } catch (err) {
      console.log(`Error consuming bundle, retrying (${err.message})`);
      wait(1000);
      bal = await user.sdk.genericAction('getFioBalance', {});
    } finally {
      bundles = await getBundleCount(user.sdk);
      bal = await user.sdk.genericAction('getFioBalance', {});
    }
  }
}

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
});

describe(`************************** stake-tokens.js ************************** \n    A1. Verify staking preconditions`, () => {
  let bp1, bp2, bp3, userA, userB, userC, userP, prevFundsAmount, locksdk, keys, accountnm, newFioDomain1, newFioAddress1, newFioDomain2, newFioAddress2, total_bp_votes, total_voted_fio;
  const fundsAmount = 1000000000000;

  before(async () => {
    // Create sdk objects for the orinigal localhost BPs
    bp1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
    bp2 = await existingUser('hfdg2qumuvlc', '5JnhMxfnLhZeRCRvCUsaHbrvPSxaqjkQAgw4ZFodx4xXyhZbC9P', 'FIO7uTisye5w2hgrCSE1pJhBKHfqDzhvqDJJ4U3vN9mbYWzataS2b', 'dapixdev', 'bp2@dapixdev');
    bp3 = await existingUser('wttywsmdmfew', '5JvmPVxPxypQEKPwFZQW4Vx7EC8cDYzorVhSWZvuYVFMccfi5mU', 'FIO6oa5UV9ghWgYH9en8Cv8dFcAxnZg2i9z9gKbnHahciuKNRPyHc', 'dapixdev', 'bp3@dapixdev');
    // create a user and give it 10k fio.
    userA = await newUser(faucet);
    userB = await newUser(faucet);
    userC = await newUser(faucet);
    userP = await newUser(faucet);
    keys = await createKeypair();
    accountnm =  await getAccountFromKey(keys.publicKey);
    // transfer some locked tokens
    const locktokens = await faucet.genericAction('pushTransaction', {
      action: 'trnsloctoks',
      account: 'fio.token',
      data: {
        payee_public_key: keys.publicKey,
        can_vote: 0,
        periods: [
          {
            duration: 120,
            amount: 5000000000000,
          },
          {
            duration: 180,
            amount: 4000000000000,
          },
          {
            duration: 1204800,
            amount: 1000000000000,
          }
        ],
        amount: 10000000000000,
        max_fee: 400000000000,
        tpid: '',
        actor: 'qhh25sqpktwh',
      }
    });
    expect(locktokens.status).to.equal('OK');
    locksdk = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson);
  });

  it(`getFioBalance for general lock token holder, available balance 0 `, async () => {
    const result = await locksdk.genericAction('getFioBalance', { });
    prevFundsAmount = result.balance;
    expect(result.available).to.equal(0);
  });

  it(`Failure test Transfer 700 FIO to userA FIO public key, insufficient balance tokens locked`, async () => {
    try {
      const result = await locksdk.genericAction('transferTokens', {
        payeeFioPublicKey: userA.publicKey,
        amount: 70000000000,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        technologyProviderId: ''
      })
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].error).to.contain('Funds locked');
    }
  });

  it(`Transfer ${fundsAmount} FIO to locked account`, async () => {
    const result = await userA.sdk.genericAction('transferTokens', {
      payeeFioPublicKey: keys.publicKey,
      amount: fundsAmount,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      tpid: '',
    });
    expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected');
    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(config.api.transfer_tokens_pub_key.fee);
  });

  it(`getFioBalance for general lock token holder, available balance 0 `, async () => {
    const result = await locksdk.genericAction('getFioBalance', { });
    prevFundsAmount = result.balance;
    expect(result.available).to.equal(fundsAmount);
  });

  it(`transfer 100 tokens to userA`, async () => {
    let transferAmt = 100000000000;
    const result = await locksdk.genericAction('transferTokens', {
      payeeFioPublicKey: userA.publicKey,
      amount: transferAmt,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    });
    expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected')
    expect(result.transaction_id).to.be.a('string');
    expect(result.block_num).to.be.a('number');
    expect(result.fee_collected).to.be.a('number').and.equal(config.api.transfer_tokens_pub_key.fee);
    expect(result.status).to.be.a('string').and.equal('OK');
  });

  it(`transfer 100 tokens to userB`, async () => {
    let transferAmt = 100000000000;
    let userBal = await userB.sdk.genericAction('getFioBalance', {});
    let lockBal = await locksdk.genericAction('getFioBalance', {});
    const result = await locksdk.genericAction('transferTokens', {
      payeeFioPublicKey: userB.publicKey,
      amount: transferAmt,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    });
    expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected')
    expect(result.transaction_id).to.be.a('string');
    expect(result.block_num).to.be.a('number');
    expect(result.fee_collected).to.be.a('number').and.equal(config.api.transfer_tokens_pub_key.fee);
    expect(result.status).to.be.a('string').and.equal('OK');
    let newUserBal = await userB.sdk.genericAction('getFioBalance', {});
    let newLockBal = await locksdk.genericAction('getFioBalance', {});
    expect(userBal.available).to.be.a('number');
    expect(newUserBal.available).to.be.greaterThan(userBal.available);
    expect(newUserBal.available - userBal.available).to.equal(transferAmt);
    expect(newLockBal.available).to.be.lessThan(lockBal.available);
    expect(lockBal.available - newLockBal.available).to.equal(transferAmt + config.api.transfer_tokens_pub_key.fee);
  });

  it(`transfer 100 tokens to userC`, async () => {
    let transferAmt = 100000000000;
    let userBal = await userC.sdk.genericAction('getFioBalance', {});
    let lockBal = await locksdk.genericAction('getFioBalance', {});
    const result = await locksdk.genericAction('transferTokens', {
      payeeFioPublicKey: userC.publicKey,
      amount: transferAmt,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    });
    expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected')
    expect(result.transaction_id).to.be.a('string');
    expect(result.block_num).to.be.a('number');
    expect(result.fee_collected).to.be.a('number').and.equal(config.api.transfer_tokens_pub_key.fee);
    expect(result.status).to.be.a('string').and.equal('OK');
    let newUserBal = await userC.sdk.genericAction('getFioBalance', {});
    let newLockBal = await locksdk.genericAction('getFioBalance', {});
    expect(userBal.available).to.be.a('number');
    expect(newUserBal.available).to.be.greaterThan(userBal.available);
    expect(newUserBal.available - userBal.available).to.equal(transferAmt);
    expect(newLockBal.available).to.be.lessThan(lockBal.available);
    expect(lockBal.available - newLockBal.available).to.equal(transferAmt + config.api.transfer_tokens_pub_key.fee);
  });

  it(`Register domain for voting for userC `, async () => {
    newFioDomain1 = generateFioDomain(15);
    let bal = await userC.sdk.genericAction('getFioBalance', {});
    const result = await userC.sdk.genericAction('registerFioDomain', {
      fioDomain: newFioDomain1,
      maxFee: config.api.register_fio_domain.fee,
      tpid: '',
    });
    let newBal = await userC.sdk.genericAction('getFioBalance', {});
    expect(result).to.have.all.keys('status', 'expiration', 'fee_collected', 'block_num', 'transaction_id');
    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(config.api.register_fio_domain.fee);
    expect(bal.available - newBal.available).to.equal(config.api.register_fio_domain.fee);
  });

  it(`Register address for voting for userC`, async () => {
    newFioAddress1 = generateFioAddress(newFioDomain1,15)
    let bal = await userC.sdk.genericAction('getFioBalance', {});
    const result = await userC.sdk.genericAction('registerFioAddress', {
      fioAddress: newFioAddress1,
      maxFee: config.api.register_fio_address.fee,
      tpid: '',
    });
    let newBal = await userC.sdk.genericAction('getFioBalance', {});
    expect(result).to.have.all.keys('status', 'expiration', 'fee_collected', 'block_num', 'transaction_id');
    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(config.api.register_fio_address.fee);
    expect(bal.available - newBal.available).to.equal(config.api.register_fio_address.fee);
  });

  it(`userC votes for bp1@dapixdev`, async () => {
    let totalBeforeVote = await getTotalVotedFio();
    const result = await userC.sdk.genericAction('pushTransaction', {
      action: 'voteproducer',
      account: 'eosio',
      data: {
        producers: [bp1.address],
        fio_address: newFioAddress1,
        actor: userC.account,
        max_fee: config.api.vote_producer.fee
      }
    });
    expect(result).to.have.all.keys('block_num', 'fee_collected', 'status', 'transaction_id');
    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(0);
    // after vote
    let totalAfterVote = await getTotalVotedFio()
    expect(totalAfterVote).to.be.greaterThan(totalBeforeVote);
  });

  it(`transfer 100 tokens to userP`, async () => {
    let transferAmt = 100000000000;
    let userBal = await userP.sdk.genericAction('getFioBalance', {});
    let lockBal = await locksdk.genericAction('getFioBalance', {});
    const result = await locksdk.genericAction('transferTokens', {
      payeeFioPublicKey: userP.publicKey,
      amount: transferAmt,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    });
    expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected')
    expect(result.transaction_id).to.be.a('string');
    expect(result.block_num).to.be.a('number');
    expect(result.fee_collected).to.be.a('number').and.equal(config.api.transfer_tokens_pub_key.fee);
    expect(result.status).to.be.a('string').and.equal('OK');
    let newUserBal = await userP.sdk.genericAction('getFioBalance', {});
    let newLockBal = await locksdk.genericAction('getFioBalance', {});
    expect(userBal.available).to.be.a('number');
    expect(newUserBal.available).to.be.greaterThan(userBal.available);
    expect(newUserBal.available - userBal.available).to.equal(transferAmt);
    expect(newLockBal.available).to.be.lessThan(lockBal.available);
    expect(lockBal.available - newLockBal.available).to.equal(transferAmt + config.api.transfer_tokens_pub_key.fee);
  });

  it(`register a FIO address for userP`, async () => {
    newFioDomain2 = generateFioDomain(15);
    await userP.sdk.genericAction('registerFioDomain', {
      fioDomain: newFioDomain2,
      maxFee: config.api.register_fio_domain.fee,
      tpid: '',
    });
    newFioAddress2 = generateFioAddress(newFioDomain2,15)
    const result = await userP.sdk.genericAction('registerFioAddress', {
      fioAddress: newFioAddress2,
      maxFee: config.api.register_fio_address.fee,
      tpid: '',
    });
    expect(result).to.have.all.keys('status', 'expiration', 'fee_collected', 'block_num', 'transaction_id');
    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(config.api.register_fio_address.fee);

    // make the domain public
    const result2 = await userP.sdk.genericAction('setFioDomainVisibility', {
      fioDomain: userP.domain,
      isPublic: true,
      maxFee: config.api.set_fio_domain_public.fee,
      technologyProviderId: ''
    });
    expect(result2).to.have.all.keys('block_num', 'fee_collected', 'status', 'transaction_id');
    expect(result2.status).to.be.a('string').and.equal('OK');
    expect(result2.fee_collected).to.be.a('number').and.equal(config.api.set_fio_domain_public.fee);
  });

  it(`register userP as proxy`, async () => {
    let bal = await userP.sdk.genericAction('getFioBalance', {});
    const result = await userP.sdk.genericAction('pushTransaction', {
      action: 'regproxy',
      account: 'eosio',
      data: {
        fio_address: userP.address,
        actor: userP.account,
        max_fee: config.api.register_proxy.fee
      }
    });
    let newBal = await userP.sdk.genericAction('getFioBalance', {});
    expect(result).to.have.all.keys('block_num', 'fee_collected', 'status', 'transaction_id');
    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(config.api.register_proxy.fee);
    expect(bal.available - newBal.available).to.equal(config.api.register_proxy.fee);
  });

  it(`run add_pub_address for userA with userP's FIO address as TPID`, async () => {
    const result = await userA.sdk.genericAction('addPublicAddresses', {
      fioAddress: userA.address,
      publicAddresses: [{
        chain_code: 'ELA',
        token_code: 'ELA',
        public_address: 'EQH6o4xfaR5fbhV8cDbDGRxwJRJn3qeo41',
      }],
      technologyProviderId: userP.address,
      maxFee: config.api.add_pub_address.fee
    });

    const result2 = await userA.sdk.genericAction('addPublicAddress', {
      fioAddress: userA.address,
      chainCode: 'BCH',
      tokenCode: 'BCH',
      publicAddress: 'bitcoincash:qzf8zha74adsfasdf0xnwlffdn0zuyaslx3c90q7n9g9',
      technologyProviderId: userP.address,
      maxFee: config.api.add_pub_address.fee,
    });
    expect(result).to.have.all.keys('block_num', 'fee_collected', 'status', 'transaction_id');
    expect(result2).to.have.all.keys('block_num', 'fee_collected', 'status', 'transaction_id');
    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(0);
    expect(result2.status).to.equal('OK');
    expect(result2.fee_collected).to.equal(0);
  });

  it(`Get total_voted_fio`, async () => {
    total_voted_fio = await getTotalVotedFio();
    expect(total_voted_fio).to.be.a('number').and.greaterThanOrEqual(0);
  });

  it(`Get bp1@dapixdev total_votes`, async () => {
    total_bp_votes = await getProdVoteTotal('bp1@dapixdev');
    expect(total_bp_votes).to.be.a('number').and.greaterThanOrEqual(0);
  });

  it(`userB proxy votes to userP`, async () => {
    const result = await userB.sdk.genericAction('pushTransaction', {
      action: 'voteproxy',
      account: 'eosio',
      data: {
        proxy: userP.address,
        fio_address: userB.address,
        actor: userB.account,
        max_fee: config.api.proxy_vote.fee
      }
    });
    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(0);
  });

  it(`userB proxy votes to userP (empty fio_address, expect fee_collected to be ${config.api.proxy_vote.fee})`, async () => {
    const result = await userB.sdk.genericAction('pushTransaction', {
      action: 'voteproxy',
      account: 'eosio',
      data: {
        proxy: userP.address,
        fio_address: '',
        actor: userB.account,
        max_fee: config.api.proxy_vote.fee
      }
    });
    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(config.api.proxy_vote.fee);
  });

  it(`Wait a few seconds.`, async () => {
    await timeout(5000);
  });

  it(`bp1@dapixdev total_votes did not change (votes just shifted from direct vote to proxy vote via proxyA1)`, async () => {
    let prev_total_bp_votes = total_bp_votes;
    total_bp_votes = await getProdVoteTotal('bp1@dapixdev');
    expect(total_bp_votes).to.equal(prev_total_bp_votes)
  });
});

describe(`A2. Stake some FIO from userA`, () => {
  let bp1, bp2, bp3, userA, userB, userC, userP, prevFundsAmount, locksdk, keys, accountnm, newFioDomain1, newFioAddress1, newFioDomain2, newFioAddress2, total_bp_votes, total_voted_fio;
  const fundsAmount = 1000000000000;
  const transferAmt = 100000000000;
  const stakeAmt = 50000000000;

  before(async () => {
    // Create sdk objects for the orinigal localhost BPs
    bp1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
    bp2 = await existingUser('hfdg2qumuvlc', '5JnhMxfnLhZeRCRvCUsaHbrvPSxaqjkQAgw4ZFodx4xXyhZbC9P', 'FIO7uTisye5w2hgrCSE1pJhBKHfqDzhvqDJJ4U3vN9mbYWzataS2b', 'dapixdev', 'bp2@dapixdev');
    bp3 = await existingUser('wttywsmdmfew', '5JvmPVxPxypQEKPwFZQW4Vx7EC8cDYzorVhSWZvuYVFMccfi5mU', 'FIO6oa5UV9ghWgYH9en8Cv8dFcAxnZg2i9z9gKbnHahciuKNRPyHc', 'dapixdev', 'bp3@dapixdev');
    //create a user and give it 10k fio.
    userA = await newUser(faucet);
    userB = await newUser(faucet);
    userC = await newUser(faucet);
    userP = await newUser(faucet);
    keys = await createKeypair();

    accountnm =  await getAccountFromKey(keys.publicKey);
    await faucet.genericAction('pushTransaction', {
      action: 'trnsloctoks',
      account: 'fio.token',
      data: {
        payee_public_key: keys.publicKey,
        can_vote: 0,
        periods: [
          {
            duration: 120,
            amount: 5000000000000,
          },
          {
            duration: 180,
            amount: 4000000000000,
          },
          {
            duration: 1204800,
            amount: 1000000000000,
          }
        ],
        amount: 10000000000000,
        max_fee: 400000000000,
        tpid: '',
        actor: 'qhh25sqpktwh',
      }
    });
    locksdk = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson);

    // transfer some test FIO
    await userA.sdk.genericAction('transferTokens', {
      payeeFioPublicKey: keys.publicKey,
      amount: fundsAmount,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      tpid: '',
    });

    await locksdk.genericAction('transferTokens', {
      payeeFioPublicKey: userA.publicKey,
      amount: transferAmt,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    });

    // register our proxy
    await userP.sdk.genericAction('pushTransaction', {
      action: 'regproxy',
      account: 'eosio',
      data: {
        fio_address: userP.address,
        actor: userP.account,
        max_fee: config.api.register_proxy.fee
      }
    });

    // proxy first so userA can stake
    await userA.sdk.genericAction('pushTransaction', {
      action: 'voteproxy',
      account: 'eosio',
      data: {
        proxy: userP.address,
        fio_address: userA.address,
        actor: userA.account,
        max_fee: config.api.proxy_vote.fee
      }
    });
  });

  it(`stake 50 tokens from userA`, async () => {
    let stakedTokenPool, combinedTokenPool, globalSrpCount, newStakedTokenPool, newCombinedTokenPool, newGlobalSrpCount;
    stakedTokenPool = await getStakedTokenPool();
    combinedTokenPool = await getCombinedTokenPool();
    globalSrpCount = await getGlobalSrpCount();

    let balA = await userA.sdk.genericAction('getFioBalance', { });
    expect(balA.staked).to.equal(0);
    const result = await userA.sdk.genericAction('pushTransaction', {
      action: 'stakefio',
      account: 'fio.staking',
      data: {
        fio_address: userA.address,
        amount: stakeAmt,
        actor: userA.account,
        max_fee: config.api.stake_fio_tokens.fee,
        tpid: userP.address
      }
    });
    let newBalA = await userA.sdk.genericAction('getFioBalance', { });
    newStakedTokenPool = await getStakedTokenPool();
    newCombinedTokenPool = await getCombinedTokenPool();
    newGlobalSrpCount = await getGlobalSrpCount();
    expect(result).to.have.all.keys('block_num', 'fee_collected', 'status', 'transaction_id');
    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(0);
    expect(newBalA.staked - balA.staked).to.equal(stakeAmt);
    expect(newStakedTokenPool).to.be.greaterThan(stakedTokenPool);
    expect(newStakedTokenPool - stakedTokenPool).to.equal(stakeAmt);
    expect(newCombinedTokenPool - combinedTokenPool).to.equal(stakeAmt);
    expect(newGlobalSrpCount - globalSrpCount).to.equal(stakeAmt * 2);
  });

  it(`stake 50 tokens from userA (no fio_address, expect fee_collected to be 3000000000)`, async () => {
    let stakedTokenPool, combinedTokenPool, globalSrpCount, newStakedTokenPool, newCombinedTokenPool, newGlobalSrpCount;
    stakedTokenPool = await getStakedTokenPool();
    combinedTokenPool = await getCombinedTokenPool();
    globalSrpCount = await getGlobalSrpCount();

    let balA = await userA.sdk.genericAction('getFioBalance', { });
    expect(balA.staked).to.equal(stakeAmt);
    const result = await userA.sdk.genericAction('pushTransaction', {
      action: 'stakefio',
      account: 'fio.staking',
      data: {
        fio_address: '',
        amount: stakeAmt,
        actor: userA.account,
        max_fee: config.api.stake_fio_tokens.fee,
        tpid: userP.address
      }
    });
    let newBalA = await userA.sdk.genericAction('getFioBalance', { });
    newStakedTokenPool = await getStakedTokenPool();
    newCombinedTokenPool = await getCombinedTokenPool();
    newGlobalSrpCount = await getGlobalSrpCount();
    expect(result).to.have.all.keys('block_num', 'fee_collected', 'status', 'transaction_id');
    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(config.api.stake_fio_tokens.fee);
    expect(newBalA.staked - balA.staked).to.equal(stakeAmt);
    expect(newStakedTokenPool).to.be.greaterThan(stakedTokenPool);
    expect(newStakedTokenPool - stakedTokenPool).to.equal(stakeAmt);
    expect(newCombinedTokenPool - combinedTokenPool).to.be.greaterThanOrEqual(stakeAmt);
    expect(newGlobalSrpCount - globalSrpCount).to.equal(stakeAmt * 2);
  });
});

describe(`A3. Verify staking rewards for block producer`, () => {
  let bp1, bp2, bp3, userA, userB, userC, userP, prevFundsAmount, locksdk, keys, accountnm, newFioDomain1, newFioAddress1, newFioDomain2, newFioAddress2, total_bp_votes, total_voted_fio;
  const fundsAmount = 1000000000000;
  const transferAmt = 100000000000;
  const stakeAmt = 50000000000;

  before(async () => {
    // Create sdk objects for the orinigal localhost BPs
    bp1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
    bp2 = await existingUser('hfdg2qumuvlc', '5JnhMxfnLhZeRCRvCUsaHbrvPSxaqjkQAgw4ZFodx4xXyhZbC9P', 'FIO7uTisye5w2hgrCSE1pJhBKHfqDzhvqDJJ4U3vN9mbYWzataS2b', 'dapixdev', 'bp2@dapixdev');
    bp3 = await existingUser('wttywsmdmfew', '5JvmPVxPxypQEKPwFZQW4Vx7EC8cDYzorVhSWZvuYVFMccfi5mU', 'FIO6oa5UV9ghWgYH9en8Cv8dFcAxnZg2i9z9gKbnHahciuKNRPyHc', 'dapixdev', 'bp3@dapixdev');
    //create a user and give it 10k fio.
    userA = await newUser(faucet);
    userB = await newUser(faucet);
    userC = await newUser(faucet);
    userP = await newUser(faucet);
    keys = await createKeypair();

    accountnm =  await getAccountFromKey(keys.publicKey);
    await faucet.genericAction('pushTransaction', {
      action: 'trnsloctoks',
      account: 'fio.token',
      data: {
        payee_public_key: keys.publicKey,
        can_vote: 0,
        periods: [
          {
            duration: 120,
            amount: 5000000000000,
          },
          {
            duration: 180,
            amount: 4000000000000,
          },
          {
            duration: 1204800,
            amount: 1000000000000,
          }
        ],
        amount: 10000000000000,
        max_fee: 400000000000,
        tpid: '',
        actor: 'qhh25sqpktwh',
      }
    });
    locksdk = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson);

    // transfer some test FIO
    await userA.sdk.genericAction('transferTokens', {
      payeeFioPublicKey: keys.publicKey,
      amount: fundsAmount,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      tpid: '',
    });

    await locksdk.genericAction('transferTokens', {
      payeeFioPublicKey: userA.publicKey,
      amount: transferAmt,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    });

    // register our proxy
    await userP.sdk.genericAction('pushTransaction', {
      action: 'regproxy',
      account: 'eosio',
      data: {
        fio_address: userP.address,
        actor: userP.account,
        max_fee: config.api.register_proxy.fee
      }
    });

    // proxy first so userA can stake
    await userA.sdk.genericAction('pushTransaction', {
      action: 'voteproxy',
      account: 'eosio',
      data: {
        proxy: userP.address,
        fio_address: userA.address,
        actor: userA.account,
        max_fee: config.api.proxy_vote.fee
      }
    });

    // stake some FIO
    await userA.sdk.genericAction('pushTransaction', {
      action: 'stakefio',
      account: 'fio.staking',
      data: {
        fio_address: '',
        amount: stakeAmt,
        actor: userA.account,
        max_fee: config.api.stake_fio_tokens.fee,
        tpid: userP.address
      }
    });
  });

  it(`register domain from any other account`, async () => {
    let newDomain = generateFioDomain(4);
    const result = await userA.sdk.genericAction('registerFioDomain', {
      fioDomain: newDomain,
      maxFee: config.api.register_fio_domain.fee,
      technologyProviderId: ''
    });
    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(config.api.register_fio_domain.fee);
  });

  // it(`wait for next BP claim`);

  it(`run bpclaim from any other account, expect minted = 25000 - stake fees`, async () => {
    try {
      const result = await bp1.sdk.genericAction('pushTransaction', {
        action: 'bpclaim',
        account: 'fio.treasury',
        data: {
          fio_address: bp1.address,
          actor: bp1.account
        }
      })
      //console.log('BPCLAIM Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error', err.json);
      expect(err).to.equal(null);
    }
  });
});

describe(`A4. Unstake some staked FIO from userA, observe staking reward changes`, () => {
  let bp1, bp2, bp3, userA, userB, userC, userP, prevFundsAmount, locksdk, keys, accountnm, newFioDomain1, newFioAddress1, newFioDomain2, newFioAddress2, total_bp_votes, total_voted_fio;
  const fundsAmount = 1000000000000;
  const transferAmt = 100000000000;
  const stakeAmt = 50000000000;
  const unstakeAmt = 25000000000;

  before(async () => {
    // Create sdk objects for the orinigal localhost BPs
    bp1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
    bp2 = await existingUser('hfdg2qumuvlc', '5JnhMxfnLhZeRCRvCUsaHbrvPSxaqjkQAgw4ZFodx4xXyhZbC9P', 'FIO7uTisye5w2hgrCSE1pJhBKHfqDzhvqDJJ4U3vN9mbYWzataS2b', 'dapixdev', 'bp2@dapixdev');
    bp3 = await existingUser('wttywsmdmfew', '5JvmPVxPxypQEKPwFZQW4Vx7EC8cDYzorVhSWZvuYVFMccfi5mU', 'FIO6oa5UV9ghWgYH9en8Cv8dFcAxnZg2i9z9gKbnHahciuKNRPyHc', 'dapixdev', 'bp3@dapixdev');
    //create a user and give it 10k fio.
    userA = await newUser(faucet);
    userB = await newUser(faucet);
    userC = await newUser(faucet);
    userP = await newUser(faucet);
    keys = await createKeypair();

    accountnm =  await getAccountFromKey(keys.publicKey);
    await faucet.genericAction('pushTransaction', {
      action: 'trnsloctoks',
      account: 'fio.token',
      data: {
        payee_public_key: keys.publicKey,
        can_vote: 0,
        periods: [
          {
            duration: 120,
            amount: 5000000000000,
          },
          {
            duration: 180,
            amount: 4000000000000,
          },
          {
            duration: 1204800,
            amount: 1000000000000,
          }
        ],
        amount: 10000000000000,
        max_fee: 400000000000,
        tpid: '',
        actor: 'qhh25sqpktwh',
      }
    });
    locksdk = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson);

    // transfer some test FIO
    await userA.sdk.genericAction('transferTokens', {
      payeeFioPublicKey: keys.publicKey,
      amount: fundsAmount,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      tpid: '',
    });

    await locksdk.genericAction('transferTokens', {
      payeeFioPublicKey: userA.publicKey,
      amount: transferAmt,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    });

    // register our proxy
    await userP.sdk.genericAction('pushTransaction', {
      action: 'regproxy',
      account: 'eosio',
      data: {
        fio_address: userP.address,
        actor: userP.account,
        max_fee: config.api.register_proxy.fee
      }
    });

    // proxy first so userA can stake
    await userA.sdk.genericAction('pushTransaction', {
      action: 'voteproxy',
      account: 'eosio',
      data: {
        proxy: userP.address,
        fio_address: userA.address,
        actor: userA.account,
        max_fee: config.api.proxy_vote.fee
      }
    });

    // stake some FIO
    await userA.sdk.genericAction('pushTransaction', {
      action: 'stakefio',
      account: 'fio.staking',
      data: {
        fio_address: '',
        amount: stakeAmt,
        actor: userA.account,
        max_fee: config.api.stake_fio_tokens.fee,
        tpid: userP.address
      }
    });
  });

  it(`unstake 25 tokens (unstake_fio_tokens) from userA`, async () => {
    let stakedTokenPool, combinedTokenPool, globalSrpCount, newStakedTokenPool, newCombinedTokenPool, newGlobalSrpCount;
    stakedTokenPool = await getStakedTokenPool();
    combinedTokenPool = await getCombinedTokenPool();
    globalSrpCount = await getGlobalSrpCount();
    let bal = await userA.sdk.genericAction('getFioBalance', {});
    const result = await userA.sdk.genericAction('pushTransaction', {
      action: 'unstakefio',
      account: 'fio.staking',
      data: {
        fio_address: userA.address,
        amount: unstakeAmt,
        actor: userA.account,
        max_fee: config.api.unstake_fio_tokens.fee,
        tpid:''
      }
    });
    newStakedTokenPool = await getStakedTokenPool();
    newCombinedTokenPool = await getCombinedTokenPool();
    newGlobalSrpCount = await getGlobalSrpCount();
    let newBal = await userA.sdk.genericAction('getFioBalance', {});
    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(0);
    expect(bal.staked - newBal.staked).to.equal(unstakeAmt);
    expect(newStakedTokenPool).to.be.lessThan(stakedTokenPool);
    expect(stakedTokenPool - newStakedTokenPool).to.equal(unstakeAmt);
    expect(combinedTokenPool - newCombinedTokenPool).to.equal(unstakeAmt);
    expect(globalSrpCount - newGlobalSrpCount).to.equal(unstakeAmt * 2);
  });

  it(`unstake 25 tokens from userA, no fio_address, fee_collected should be 3000000000`, async () => {
    let stakedTokenPool, combinedTokenPool, globalSrpCount, newStakedTokenPool, newCombinedTokenPool, newGlobalSrpCount;
    stakedTokenPool = await getStakedTokenPool();
    combinedTokenPool = await getCombinedTokenPool();
    globalSrpCount = await getGlobalSrpCount();
    let bal = await userA.sdk.genericAction('getFioBalance', {});
    const result = await userA.sdk.genericAction('pushTransaction', {
      action: 'unstakefio',
      account: 'fio.staking',
      data: {
        fio_address: '',
        amount: unstakeAmt,
        actor: userA.account,
        max_fee: config.api.unstake_fio_tokens.fee,
        tpid:''
      }
    });
    newStakedTokenPool = await getStakedTokenPool();
    newCombinedTokenPool = await getCombinedTokenPool();
    newGlobalSrpCount = await getGlobalSrpCount();
    let newBal = await userA.sdk.genericAction('getFioBalance', {});
    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(config.api.unstake_fio_tokens.fee);
    expect(bal.staked - newBal.staked).to.equal(unstakeAmt);
    expect(newStakedTokenPool).to.be.lessThan(stakedTokenPool);
    expect(stakedTokenPool - newStakedTokenPool).to.equal(unstakeAmt);
    expect(combinedTokenPool - newCombinedTokenPool).to.be.lessThan(unstakeAmt);


    //new - 300000000000
    //old - 350000000000
    let srpct = globalSrpCount - newGlobalSrpCount;
    expect(globalSrpCount - newGlobalSrpCount).to.equal(unstakeAmt * 2);
  });
});

describe(`A5. Stake some FIO from userB, observe staking reward changes`, () => {
  let bp1, bp2, bp3, userA, userB, userC, userP, prevFundsAmount, locksdk, keys, accountnm, newFioDomain1, newFioAddress1, newFioDomain2, newFioAddress2, total_bp_votes, total_voted_fio;
  const fundsAmount = 1000000000000;
  const transferAmt = 100000000000;
  const stakeAmt = 500000000000;

  before(async () => {
    // Create sdk objects for the orinigal localhost BPs
    bp1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
    bp2 = await existingUser('hfdg2qumuvlc', '5JnhMxfnLhZeRCRvCUsaHbrvPSxaqjkQAgw4ZFodx4xXyhZbC9P', 'FIO7uTisye5w2hgrCSE1pJhBKHfqDzhvqDJJ4U3vN9mbYWzataS2b', 'dapixdev', 'bp2@dapixdev');
    bp3 = await existingUser('wttywsmdmfew', '5JvmPVxPxypQEKPwFZQW4Vx7EC8cDYzorVhSWZvuYVFMccfi5mU', 'FIO6oa5UV9ghWgYH9en8Cv8dFcAxnZg2i9z9gKbnHahciuKNRPyHc', 'dapixdev', 'bp3@dapixdev');
    //create a user and give it 10k fio.
    userA = await newUser(faucet);
    userB = await newUser(faucet);
    userC = await newUser(faucet);
    userP = await newUser(faucet);
    keys = await createKeypair();

    accountnm =  await getAccountFromKey(keys.publicKey);
    await faucet.genericAction('pushTransaction', {
      action: 'trnsloctoks',
      account: 'fio.token',
      data: {
        payee_public_key: keys.publicKey,
        can_vote: 0,
        periods: [
          {
            duration: 120,
            amount: 5000000000000,
          },
          {
            duration: 180,
            amount: 4000000000000,
          },
          {
            duration: 1204800,
            amount: 1000000000000,
          }
        ],
        amount: 10000000000000,
        max_fee: 400000000000,
        tpid: '',
        actor: 'qhh25sqpktwh',
      }
    });
    locksdk = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson);

    // transfer some test FIO
    await userA.sdk.genericAction('transferTokens', {
      payeeFioPublicKey: keys.publicKey,
      amount: fundsAmount,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      tpid: '',
    });

    await locksdk.genericAction('transferTokens', {
      payeeFioPublicKey: userA.publicKey,
      amount: transferAmt,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    });

    // register our proxy
    await userP.sdk.genericAction('pushTransaction', {
      action: 'regproxy',
      account: 'eosio',
      data: {
        fio_address: userP.address,
        actor: userP.account,
        max_fee: config.api.register_proxy.fee
      }
    });

    // proxy first so userA can stake
    await userA.sdk.genericAction('pushTransaction', {
      action: 'voteproxy',
      account: 'eosio',
      data: {
        proxy: userP.address,
        fio_address: userA.address,
        actor: userA.account,
        max_fee: config.api.proxy_vote.fee
      }
    });

    // stake some FIO for our first test acct
    await userA.sdk.genericAction('pushTransaction', {
      action: 'stakefio',
      account: 'fio.staking',
      data: {
        fio_address: '',
        amount: stakeAmt,
        actor: userA.account,
        max_fee: config.api.stake_fio_tokens.fee,
        tpid: userP.address
      }
    });

    // transfer some FIO to the other test account
    await locksdk.genericAction('transferTokens', {
      payeeFioPublicKey: userB.publicKey,
      amount: transferAmt,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    });

    // vote with the other test account so it can stake
    await userB.sdk.genericAction('pushTransaction', {
      action: 'voteproxy',
      account: 'eosio',
      data: {
        proxy: userP.address,
        fio_address: userB.address,
        actor: userB.account,
        max_fee: config.api.proxy_vote.fee
      }
    });
  });

  it(`stake 500 tokens from userB`, async () => {
    let stakedTokenPool, combinedTokenPool, globalSrpCount, stakeAmt, newStakedTokenPool, newCombinedTokenPool, newGlobalSrpCount;
    stakeAmt = 500000000000;
    stakedTokenPool = await getStakedTokenPool();
    combinedTokenPool = await getCombinedTokenPool();
    globalSrpCount = await getGlobalSrpCount();
    let bal = await userB.sdk.genericAction('getFioBalance', { });
    const result = await userB.sdk.genericAction('pushTransaction', {
      action: 'stakefio',
      account: 'fio.staking',
      data: {
        fio_address: userB.address,
        amount: stakeAmt,
        actor: userB.account,
        max_fee: config.api.stake_fio_tokens.fee,
        tpid:''
      }
    });
    newStakedTokenPool = await getStakedTokenPool();
    newCombinedTokenPool = await getCombinedTokenPool();
    newGlobalSrpCount = await getGlobalSrpCount();
    expect(result).to.have.all.keys('block_num', 'fee_collected', 'status', 'transaction_id');
    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(0);
    let newBal = await userB.sdk.genericAction('getFioBalance', { });
    expect(newBal.staked - bal.staked).to.equal(stakeAmt);
    expect(newStakedTokenPool).to.be.greaterThan(stakedTokenPool);
    expect(newStakedTokenPool - stakedTokenPool).to.equal(stakeAmt);
    expect(newCombinedTokenPool - combinedTokenPool).to.be.greaterThanOrEqual(stakeAmt);
    expect(newGlobalSrpCount - globalSrpCount).to.equal(stakeAmt * 2);
  });
});

describe(`A6. Verify next set of staking rewards for block producer`, () => {
  let bp1, bp2, bp3, userA, userB, userC, userP, prevFundsAmount, locksdk, keys, accountnm, newFioDomain1, newFioAddress1, newFioDomain2, newFioAddress2, total_bp_votes, total_voted_fio;
  const fundsAmount = 1000000000000;
  const transferAmt = 100000000000;
  const stakeAmt = 50000000000;

  before(async () => {
    // Create sdk objects for the orinigal localhost BPs
    bp1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
    bp2 = await existingUser('hfdg2qumuvlc', '5JnhMxfnLhZeRCRvCUsaHbrvPSxaqjkQAgw4ZFodx4xXyhZbC9P', 'FIO7uTisye5w2hgrCSE1pJhBKHfqDzhvqDJJ4U3vN9mbYWzataS2b', 'dapixdev', 'bp2@dapixdev');
    bp3 = await existingUser('wttywsmdmfew', '5JvmPVxPxypQEKPwFZQW4Vx7EC8cDYzorVhSWZvuYVFMccfi5mU', 'FIO6oa5UV9ghWgYH9en8Cv8dFcAxnZg2i9z9gKbnHahciuKNRPyHc', 'dapixdev', 'bp3@dapixdev');
    //create a user and give it 10k fio.
    userA = await newUser(faucet);
    userB = await newUser(faucet);
    userC = await newUser(faucet);
    userP = await newUser(faucet);
    keys = await createKeypair();

    accountnm =  await getAccountFromKey(keys.publicKey);
    await faucet.genericAction('pushTransaction', {
      action: 'trnsloctoks',
      account: 'fio.token',
      data: {
        payee_public_key: keys.publicKey,
        can_vote: 0,
        periods: [
          {
            duration: 120,
            amount: 5000000000000,
          },
          {
            duration: 180,
            amount: 4000000000000,
          },
          {
            duration: 1204800,
            amount: 1000000000000,
          }
        ],
        amount: 10000000000000,
        max_fee: 400000000000,
        tpid: '',
        actor: 'qhh25sqpktwh',
      }
    });
    locksdk = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson);

    // transfer some test FIO
    await userA.sdk.genericAction('transferTokens', {
      payeeFioPublicKey: keys.publicKey,
      amount: fundsAmount,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      tpid: '',
    });

    await locksdk.genericAction('transferTokens', {
      payeeFioPublicKey: userA.publicKey,
      amount: transferAmt,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    });

    // register our proxy
    await userP.sdk.genericAction('pushTransaction', {
      action: 'regproxy',
      account: 'eosio',
      data: {
        fio_address: userP.address,
        actor: userP.account,
        max_fee: config.api.register_proxy.fee
      }
    });

    // proxy first so userA can stake
    await userA.sdk.genericAction('pushTransaction', {
      action: 'voteproxy',
      account: 'eosio',
      data: {
        proxy: userP.address,
        fio_address: userA.address,
        actor: userA.account,
        max_fee: config.api.proxy_vote.fee
      }
    });

    // stake some FIO
    await userA.sdk.genericAction('pushTransaction', {
      action: 'stakefio',
      account: 'fio.staking',
      data: {
        fio_address: '',
        amount: stakeAmt,
        actor: userA.account,
        max_fee: config.api.stake_fio_tokens.fee,
        tpid: userP.address
      }
    });
  });

  // it(`wait for next BP claim`);

  it(`run bpclaim from any other account, expect minted = 25000 - stake fees`, async () => {
    try {
      const result = await bp1.sdk.genericAction('pushTransaction', {
        action: 'bpclaim',
        account: 'fio.treasury',
        data: {
          fio_address: bp1.address,
          actor: bp1.account
        }
      })
      //console.log('BPCLAIM Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  });
});

describe(`A8. Unstake some more FIO from userA, observe staking reward changes`, () => {
  let bp1, bp2, bp3, userA, userB, userC, userP, prevFundsAmount, locksdk, keys, accountnm, newFioDomain1, newFioAddress1, newFioDomain2, newFioAddress2, total_bp_votes, total_voted_fio;
  const fundsAmount = 1000000000000;
  const transferAmt = 100000000000;
  const stakeAmt = 50000000000;
  const unstakeAmt = 25000000000;

    before(async () => {
      // Create sdk objects for the orinigal localhost BPs
      bp1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
      bp2 = await existingUser('hfdg2qumuvlc', '5JnhMxfnLhZeRCRvCUsaHbrvPSxaqjkQAgw4ZFodx4xXyhZbC9P', 'FIO7uTisye5w2hgrCSE1pJhBKHfqDzhvqDJJ4U3vN9mbYWzataS2b', 'dapixdev', 'bp2@dapixdev');
      bp3 = await existingUser('wttywsmdmfew', '5JvmPVxPxypQEKPwFZQW4Vx7EC8cDYzorVhSWZvuYVFMccfi5mU', 'FIO6oa5UV9ghWgYH9en8Cv8dFcAxnZg2i9z9gKbnHahciuKNRPyHc', 'dapixdev', 'bp3@dapixdev');
      //create a user and give it 10k fio.
      userA = await newUser(faucet);
      userB = await newUser(faucet);
      userC = await newUser(faucet);
      userP = await newUser(faucet);
      keys = await createKeypair();

      accountnm =  await getAccountFromKey(keys.publicKey);
      await faucet.genericAction('pushTransaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        data: {
          payee_public_key: keys.publicKey,
          can_vote: 0,
          periods: [
            {
              duration: 120,
              amount: 5000000000000,
            },
            {
              duration: 180,
              amount: 4000000000000,
            },
            {
              duration: 1204800,
              amount: 1000000000000,
            }
          ],
          amount: 10000000000000,
          max_fee: 400000000000,
          tpid: '',
          actor: 'qhh25sqpktwh',
        }
      });
      locksdk = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson);

      // transfer some test FIO
      await userA.sdk.genericAction('transferTokens', {
        payeeFioPublicKey: keys.publicKey,
        amount: fundsAmount,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        tpid: '',
      });

      await locksdk.genericAction('transferTokens', {
        payeeFioPublicKey: userA.publicKey,
        amount: transferAmt,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        technologyProviderId: ''
      });

      // register our proxy
      await userP.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: userP.address,
          actor: userP.account,
          max_fee: config.api.register_proxy.fee
        }
      });

      // proxy first so userA can stake
      await userA.sdk.genericAction('pushTransaction', {
        action: 'voteproxy',
        account: 'eosio',
        data: {
          proxy: userP.address,
          fio_address: userA.address,
          actor: userA.account,
          max_fee: config.api.proxy_vote.fee
        }
      });

      // stake some FIO
      await userA.sdk.genericAction('pushTransaction', {
        action: 'stakefio',
        account: 'fio.staking',
        data: {
          fio_address: '',
          amount: stakeAmt,
          actor: userA.account,
          max_fee: config.api.stake_fio_tokens.fee,
          tpid: userP.address
        }
      });
    });

  it(`unstake 25 tokens (unstake_fio_tokens) from userA`, async () => {
    let stakedTokenPool, combinedTokenPool, globalSrpCount, newStakedTokenPool, newCombinedTokenPool, newGlobalSrpCount;
    stakedTokenPool = await getStakedTokenPool();
    combinedTokenPool = await getCombinedTokenPool();
    globalSrpCount = await getGlobalSrpCount();
    let bal = await userA.sdk.genericAction('getFioBalance', {});
    const result = await userA.sdk.genericAction('pushTransaction', {
      action: 'unstakefio',
      account: 'fio.staking',
      data: {
        fio_address: userA.address,
        amount: unstakeAmt,
        actor: userA.account,
        max_fee: config.api.unstake_fio_tokens.fee,
        tpid: bp1.address
      }
    });
    newStakedTokenPool = await getStakedTokenPool();
    newCombinedTokenPool = await getCombinedTokenPool();
    newGlobalSrpCount = await getGlobalSrpCount();
    let newBal = await userA.sdk.genericAction('getFioBalance', {});
    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(0);
    expect(bal.staked - newBal.staked).to.equal(unstakeAmt);
    expect(newStakedTokenPool).to.be.lessThan(stakedTokenPool);
    expect(stakedTokenPool - newStakedTokenPool).to.equal(unstakeAmt);
    expect(combinedTokenPool - newCombinedTokenPool).to.equal(unstakeAmt);
    expect(globalSrpCount - newGlobalSrpCount).to.equal(unstakeAmt * 2);
  });
});

describe(`A9. Unstake some more FIO from userB, observe staking reward changes`, () => {
  let bp1, bp2, bp3, userA, userB, userC, userP, prevFundsAmount, locksdk, keys, accountnm, newFioDomain1, newFioAddress1, newFioDomain2, newFioAddress2, total_bp_votes, total_voted_fio;
  const fundsAmount = 1000000000000;
  const transferAmt = 100000000000;
  const stakeAmt = 900000000000;
  const unstakeAmt = 25000000000;

  before(async () => {
    // Create sdk objects for the orinigal localhost BPs
    bp1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
    bp2 = await existingUser('hfdg2qumuvlc', '5JnhMxfnLhZeRCRvCUsaHbrvPSxaqjkQAgw4ZFodx4xXyhZbC9P', 'FIO7uTisye5w2hgrCSE1pJhBKHfqDzhvqDJJ4U3vN9mbYWzataS2b', 'dapixdev', 'bp2@dapixdev');
    bp3 = await existingUser('wttywsmdmfew', '5JvmPVxPxypQEKPwFZQW4Vx7EC8cDYzorVhSWZvuYVFMccfi5mU', 'FIO6oa5UV9ghWgYH9en8Cv8dFcAxnZg2i9z9gKbnHahciuKNRPyHc', 'dapixdev', 'bp3@dapixdev');
    //create a user and give it 10k fio.
    userA = await newUser(faucet);
    userB = await newUser(faucet);
    userC = await newUser(faucet);
    userP = await newUser(faucet);
    keys = await createKeypair();

    accountnm =  await getAccountFromKey(keys.publicKey);
    await faucet.genericAction('pushTransaction', {
      action: 'trnsloctoks',
      account: 'fio.token',
      data: {
        payee_public_key: keys.publicKey,
        can_vote: 0,
        periods: [
          {
            duration: 120,
            amount: 5000000000000,
          },
          {
            duration: 180,
            amount: 4000000000000,
          },
          {
            duration: 1204800,
            amount: 1000000000000,
          }
        ],
        amount: 10000000000000,
        max_fee: 400000000000,
        tpid: '',
        actor: 'qhh25sqpktwh',
      }
    });
    locksdk = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson);

    // transfer some test FIO
    await userB.sdk.genericAction('transferTokens', {
      payeeFioPublicKey: keys.publicKey,
      amount: fundsAmount,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      tpid: '',
    });

    await locksdk.genericAction('transferTokens', {
      payeeFioPublicKey: userB.publicKey,
      amount: transferAmt,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    });

    // register our proxy
    await userP.sdk.genericAction('pushTransaction', {
      action: 'regproxy',
      account: 'eosio',
      data: {
        fio_address: userP.address,
        actor: userP.account,
        max_fee: config.api.register_proxy.fee
      }
    });

    // proxy first so userB can stake
    await userB.sdk.genericAction('pushTransaction', {
      action: 'voteproxy',
      account: 'eosio',
      data: {
        proxy: userP.address,
        fio_address: userB.address,
        actor: userB.account,
        max_fee: config.api.proxy_vote.fee
      }
    });

    // stake some FIO
    await userB.sdk.genericAction('pushTransaction', {
      action: 'stakefio',
      account: 'fio.staking',
      data: {
        fio_address: '',
        amount: stakeAmt,
        actor: userB.account,
        max_fee: config.api.stake_fio_tokens.fee,
        tpid: userP.address
      }
    });
  });

  it(`unstake 25 tokens (unstake_fio_tokens) from userB`, async () => {
    let stakedTokenPool, combinedTokenPool, globalSrpCount, stakeAmt, newStakedTokenPool, newCombinedTokenPool, newGlobalSrpCount;
    stakedTokenPool = await getStakedTokenPool();
    combinedTokenPool = await getCombinedTokenPool();
    globalSrpCount = await getGlobalSrpCount();
    let bal = await userB.sdk.genericAction('getFioBalance', {});
    const result = await userB.sdk.genericAction('pushTransaction', {
      action: 'unstakefio',
      account: 'fio.staking',
      data: {
        fio_address: userB.address,
        amount: unstakeAmt,
        actor: userB.account,
        max_fee: config.api.unstake_fio_tokens.fee,
        tpid:''
      }
    });
    newStakedTokenPool = await getStakedTokenPool();
    newCombinedTokenPool = await getCombinedTokenPool();
    newGlobalSrpCount = await getGlobalSrpCount();
    let newBal = await userB.sdk.genericAction('getFioBalance', {});
    expect(result.status).to.equal('OK');
    expect(bal.staked - newBal.staked).to.equal(unstakeAmt);
    expect(newStakedTokenPool).to.be.lessThan(stakedTokenPool);
    expect(stakedTokenPool - newStakedTokenPool).to.equal(unstakeAmt);
    expect(combinedTokenPool - newCombinedTokenPool).to.equal(unstakeAmt);
    expect(globalSrpCount - newGlobalSrpCount).to.equal(unstakeAmt * 2);
  });

  // it(`run get_fio_balance for userA`, async () => {
  //   const result = await userA.sdk.genericAction('getFioBalance', {});
  //   expect(result.staked).to.equal(25000000000);
  // });

  it(`run get_fio_balance for userB`, async () => {
    const result = await userB.sdk.genericAction('getFioBalance', {});
    expect(result.staked).to.equal(stakeAmt - 25000000000);
  });
});

describe(`A10. Verify next set of staking rewards and user balances`, () => {
  let bp1, bp2, bp3, userA, userB, userC, userP, prevFundsAmount, locksdk, keys, accountnm, newFioDomain1, newFioAddress1, newFioDomain2, newFioAddress2, total_bp_votes, total_voted_fio;
  const fundsAmount = 1000000000000;

  before(async () => {
    // Create sdk objects for the orinigal localhost BPs
    bp1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
    bp2 = await existingUser('hfdg2qumuvlc', '5JnhMxfnLhZeRCRvCUsaHbrvPSxaqjkQAgw4ZFodx4xXyhZbC9P', 'FIO7uTisye5w2hgrCSE1pJhBKHfqDzhvqDJJ4U3vN9mbYWzataS2b', 'dapixdev', 'bp2@dapixdev');
    bp3 = await existingUser('wttywsmdmfew', '5JvmPVxPxypQEKPwFZQW4Vx7EC8cDYzorVhSWZvuYVFMccfi5mU', 'FIO6oa5UV9ghWgYH9en8Cv8dFcAxnZg2i9z9gKbnHahciuKNRPyHc', 'dapixdev', 'bp3@dapixdev');
    //create a user and give it 10k fio.
    userA = await newUser(faucet);
    userB = await newUser(faucet);
    userC = await newUser(faucet);
    userP = await newUser(faucet);
    keys = await createKeypair();

    accountnm =  await getAccountFromKey(keys.publicKey);
    const locktokens = await faucet.genericAction('pushTransaction', {
      action: 'trnsloctoks',
      account: 'fio.token',
      data: {
        payee_public_key: keys.publicKey,
        can_vote: 0,
        periods: [
          {
            duration: 120,
            amount: 5000000000000,
          },
          {
            duration: 180,
            amount: 4000000000000,
          },
          {
            duration: 1204800,
            amount: 1000000000000,
          }
        ],
        amount: 10000000000000,
        max_fee: 400000000000,
        tpid: '',
        actor: 'qhh25sqpktwh',
      }
    });
    expect(locktokens.status).to.equal('OK');
    locksdk = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson);
  });

  // it(`wait for next BP claim`);

  it(`run bpclaim from any other account, expect minted = 25000 - stake fees`, async () => {
    try {
      const result = await bp1.sdk.genericAction('pushTransaction', {
        action: 'bpclaim',
        account: 'fio.treasury',
        data: {
          fio_address: bp1.address,
          actor: bp1.account
        }
      })
      //console.log('BPCLAIM Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  });
});

describe(`A11. Stake some FIO from userC, observe staking reward changes`, () => {
  let bp1, bp2, bp3, userA, userB, userC, userP, prevFundsAmount, locksdk, keys, accountnm, newFioDomain1, newFioAddress1, newFioDomain2, newFioAddress2, total_bp_votes, total_voted_fio;
  const fundsAmount = 1000000000000;
  const transferAmt = 100000000000;
  const stakeAmt = 900000000000;

  before(async () => {
    // Create sdk objects for the orinigal localhost BPs
    bp1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
    bp2 = await existingUser('hfdg2qumuvlc', '5JnhMxfnLhZeRCRvCUsaHbrvPSxaqjkQAgw4ZFodx4xXyhZbC9P', 'FIO7uTisye5w2hgrCSE1pJhBKHfqDzhvqDJJ4U3vN9mbYWzataS2b', 'dapixdev', 'bp2@dapixdev');
    bp3 = await existingUser('wttywsmdmfew', '5JvmPVxPxypQEKPwFZQW4Vx7EC8cDYzorVhSWZvuYVFMccfi5mU', 'FIO6oa5UV9ghWgYH9en8Cv8dFcAxnZg2i9z9gKbnHahciuKNRPyHc', 'dapixdev', 'bp3@dapixdev');
    //create a user and give it 10k fio.
    userA = await newUser(faucet);
    userB = await newUser(faucet);
    userC = await newUser(faucet);
    userP = await newUser(faucet);
    keys = await createKeypair();

    accountnm =  await getAccountFromKey(keys.publicKey);
    await faucet.genericAction('pushTransaction', {
      action: 'trnsloctoks',
      account: 'fio.token',
      data: {
        payee_public_key: keys.publicKey,
        can_vote: 0,
        periods: [
          {
            duration: 120,
            amount: 5000000000000,
          },
          {
            duration: 180,
            amount: 4000000000000,
          },
          {
            duration: 1204800,
            amount: 1000000000000,
          }
        ],
        amount: 10000000000000,
        max_fee: 400000000000,
        tpid: '',
        actor: 'qhh25sqpktwh',
      }
    });
    locksdk = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson);

    // transfer some test FIO
    await userC.sdk.genericAction('transferTokens', {
      payeeFioPublicKey: keys.publicKey,
      amount: fundsAmount,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      tpid: '',
    });

    await locksdk.genericAction('transferTokens', {
      payeeFioPublicKey: userC.publicKey,
      amount: transferAmt,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    });

    // register our proxy
    await userP.sdk.genericAction('pushTransaction', {
      action: 'regproxy',
      account: 'eosio',
      data: {
        fio_address: userP.address,
        actor: userP.account,
        max_fee: config.api.register_proxy.fee
      }
    });

    // proxy first so userA can stake
    await userC.sdk.genericAction('pushTransaction', {
      action: 'voteproxy',
      account: 'eosio',
      data: {
        proxy: userP.address,
        fio_address: userC.address,
        actor: userC.account,
        max_fee: config.api.proxy_vote.fee
      }
    });
  });

  it(`stake 900 tokens (stake_fio_tokens) from userC`, async () => {
    let stakedTokenPool, combinedTokenPool, globalSrpCount, newStakedTokenPool, newCombinedTokenPool, newGlobalSrpCount;
    stakedTokenPool = await getStakedTokenPool();
    combinedTokenPool = await getCombinedTokenPool();
    globalSrpCount = await getGlobalSrpCount();
    let bal = await userC.sdk.genericAction('getFioBalance', { });
    const result = await userC.sdk.genericAction('pushTransaction', {
      action: 'stakefio',
      account: 'fio.staking',
      data: {
        fio_address: userC.address,
        amount: stakeAmt,
        actor: userC.account,
        max_fee: config.api.stake_fio_tokens.fee,
        tpid:''
      }
    });
    newStakedTokenPool = await getStakedTokenPool();
    newCombinedTokenPool = await getCombinedTokenPool();
    newGlobalSrpCount = await getGlobalSrpCount();
    let newBal = await userC.sdk.genericAction('getFioBalance', { });
    expect(result).to.have.all.keys('block_num', 'fee_collected', 'status', 'transaction_id');
    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(0);
    expect(newBal.staked - bal.staked).to.equal(stakeAmt);
    expect(newStakedTokenPool).to.be.greaterThan(stakedTokenPool);
    expect(newStakedTokenPool - stakedTokenPool).to.equal(stakeAmt);
    expect(newCombinedTokenPool - combinedTokenPool).to.be.greaterThanOrEqual(stakeAmt);
    expect(newGlobalSrpCount - globalSrpCount).to.equal(stakeAmt * 2);
  });
});

describe('B. Test stakefio Bundled transactions', () => {
  let bp1, bp2, bp3, user1, user2, proxy1, bundleCount1, bundleCount2, accountnm, keys;
  const fundsAmount = 1000000000000

  before(async () => {
    // Create sdk objects for the orinigal localhost BPs
    bp1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
    bp2 = await existingUser('hfdg2qumuvlc', '5JnhMxfnLhZeRCRvCUsaHbrvPSxaqjkQAgw4ZFodx4xXyhZbC9P', 'FIO7uTisye5w2hgrCSE1pJhBKHfqDzhvqDJJ4U3vN9mbYWzataS2b', 'dapixdev', 'bp2@dapixdev');
    bp3 = await existingUser('wttywsmdmfew', '5JvmPVxPxypQEKPwFZQW4Vx7EC8cDYzorVhSWZvuYVFMccfi5mU', 'FIO6oa5UV9ghWgYH9en8Cv8dFcAxnZg2i9z9gKbnHahciuKNRPyHc', 'dapixdev', 'bp3@dapixdev');

    user1 = await newUser(faucet);

    keys = await createKeypair();

    accountnm =  await getAccountFromKey(keys.publicKey);

    const transfer = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: keys.publicKey,
      amount: fundsAmount,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    });
    expect(transfer.status).to.equal('OK');

    proxy1 = await newUser(faucet);
    user2 = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson);
  });

  it('Confirm stake_fio_tokens fee for user1 is zero (bundles remaining)', async () => {
    let result = await user1.sdk.getFee('stake_fio_tokens', user1.address);
    expect(result.fee).to.equal(0);
  });

  it(`Get balance for user1`, async () => {
    const result = await user1.sdk.genericAction('getFioBalance', {
      fioPublicKey: user1.publicKey
    });
    expect(result).to.have.all.keys('balance', 'available', 'staked', 'srps', 'roe');
    expect(result.balance).to.equal(2160000000000);
    expect(result.available).to.equal(2160000000000);
    expect(result.staked).to.equal(0);
    expect(result.srps).to.equal(0);
    expect(result.roe).to.equal('0.500000000000000');
  });

  it(`get addresses for user1`, async () => {
    const result = await user1.sdk.genericAction('getPublicAddresses', {
      fioAddress: user1.address,
      limit: 0,
      offset: 0
    });
    expect(result.public_addresses.length).to.equal(1);
  });

  it(`Get bundle count for user1 `, async () => {
    bundleCount1 = await getBundleCount(user1.sdk);
    expect(bundleCount1).to.equal(100);
  });

  it(`Get bundle count for user2 (expect No FIO names)`, async () => {
    try {
      bundleCount2 = await getBundleCount(user2);
    } catch (err) {
      expect(err.errorCode).to.equal(404);
      expect(err.json.message).to.equal('No FIO names');
    }
  });

  it(`register a proxy so user1 can stake with bundles`, async () => {
    const result = await proxy1.sdk.genericAction('pushTransaction', {
      action: 'regproxy',
      account: 'eosio',
      data: {
        fio_address: proxy1.address,
        actor: proxy1.account,
        max_fee: config.api.register_proxy.fee
      }
    });
    expect(result).to.have.all.keys('block_num', 'fee_collected', 'status', 'transaction_id');
    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(config.api.register_proxy.fee);
  });

  // TODO: find out why user has bundle even though I followed Eric's instructions
  // I know for sure that user2 has no FIO names because the call to get them returns "No FIO names"
  // therefore, there are no bundles
  // non-bundled users should not have to proxy, so why is this telling me I need to proxy before staking?

  // get global pool

  // get_table_rows
  // table: accountstake
  // reward  -> function of fees collected while staked
  //         -> function of how much is staked
  //         -> function of how much we are unstaking
  // from FIP: SRPs to Unstake = SRPs in Account * (Unstaked Tokens/Total Tokens Staked in Account)

  it(`stake FIO from user2, expect bundled tx count to remain the same (no FIO names)`, async () => {
    let stakedTokenPool, combinedTokenPool, globalSrpCount, stakeAmt, feeAmt, newStakedTokenPool, newCombinedTokenPool, newGlobalSrpCount;
    stakeAmt = 50000000000;
    //feeAmt = 3000000000;
    stakedTokenPool = await getStakedTokenPool();
    combinedTokenPool = await getCombinedTokenPool();
    globalSrpCount = await getGlobalSrpCount();

    // proxy first so we can stake
    const proxyvote = await user2.genericAction('pushTransaction', {
      action: 'voteproxy',
      account: 'eosio',
      data: {
        proxy: proxy1.address,
        fio_address: '',
        actor: user2.account,
        max_fee: config.api.proxy_vote.fee
      }
    });
    expect(proxyvote.status).to.equal('OK');

    let bal = await user2.genericAction('getFioBalance', { });
    const result = await user2.genericAction('pushTransaction', {
      action: 'stakefio',
      account: 'fio.staking',
      data: {
        fio_address: '',
        amount: stakeAmt,
        actor: user2.account,
        max_fee: config.api.stake_fio_tokens.fee,
        tpid: ''
      }
    });
    let newBal = await user2.genericAction('getFioBalance', { });
    newStakedTokenPool = await getStakedTokenPool();
    newCombinedTokenPool = await getCombinedTokenPool();
    newGlobalSrpCount = await getGlobalSrpCount();
    expect(result).to.have.all.keys('block_num', 'fee_collected', 'status', 'transaction_id');
    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(config.api.stake_fio_tokens.fee);
    expect(newBal.staked - bal.staked).to.equal(stakeAmt);
    expect(newStakedTokenPool).to.be.greaterThan(stakedTokenPool);
    expect(newStakedTokenPool - stakedTokenPool).to.equal(stakeAmt);
    expect(newCombinedTokenPool - combinedTokenPool).to.be.greaterThanOrEqual(stakeAmt);
    expect(newGlobalSrpCount - globalSrpCount).to.equal(stakeAmt * 2);

    try {
      let fioNames = await user2.genericAction('getFioNames', { fioPublicKey: user2.publicKey })
      let bundleCount = fioNames.fio_addresses[0].remaining_bundled_tx;
      expect(bundleCount).to.equal(100);
    } catch (err) {
      expect(err.errorCode).to.equal(404);
      expect(err.json.message).to.equal('No FIO names');
    }
  });

  it(`stake FIO from user1, expect bundle count to change`, async () => {
    let stakedTokenPool, combinedTokenPool, globalSrpCount, stakeAmt, feeAmt, newStakedTokenPool, newCombinedTokenPool, newGlobalSrpCount;
    stakeAmt = 50000000000;
    //feeAmt = 3000000000;
    stakedTokenPool = await getStakedTokenPool();
    combinedTokenPool = await getCombinedTokenPool();
    globalSrpCount = await getGlobalSrpCount();
    let bal = await user1.sdk.genericAction('getFioBalance', { });
    expect(bal.staked).to.equal(0);

    const result = await user1.sdk.genericAction('pushTransaction', {
      action: 'stakefio',
      account: 'fio.staking',
      data: {
        fio_address: user1.address,
        amount: stakeAmt,
        actor: user1.account,
        max_fee: config.api.stake_fio_tokens.fee,
        tpid: proxy1.address
      }
    });
    newStakedTokenPool = await getStakedTokenPool();
    newCombinedTokenPool = await getCombinedTokenPool();
    newGlobalSrpCount = await getGlobalSrpCount();
    let newBal = await user1.sdk.genericAction('getFioBalance', { });
    expect(result).to.have.all.keys('block_num', 'fee_collected', 'status', 'transaction_id');
    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(0);
    expect(newBal.staked - bal.staked).to.equal(stakeAmt);
    expect(newStakedTokenPool).to.be.greaterThan(stakedTokenPool);
    expect(newStakedTokenPool - stakedTokenPool).to.equal(stakeAmt);
    expect(newCombinedTokenPool - combinedTokenPool).to.equal(stakeAmt);
    expect(newGlobalSrpCount - globalSrpCount).to.equal(stakeAmt * 2);

    let bundles = await getBundleCount(user1.sdk);
    expect(bundles).to.equal(99);
  });

  // it.skip('stake small amounts of FIO so that all bundled tx get consumed', async () => {
  //   let stakeAmt = 1;
  //   let feeAmt = 3000000000;
  //   let bundles = await getBundleCount(user1.sdk)
  //   process.stdout.write('\tconsuming remaining bundled transactions\n\tthis may take a while');
  //   while (bundles > 0) {
  //     process.stdout.write('.');
  //     await user1.sdk.genericAction('pushTransaction', {
  //       action: 'stakefio',
  //       account: 'fio.staking',
  //       data: {
  //         fio_address: user1.address,
  //         amount: stakeAmt,
  //         actor: user1.address,
  //         max_fee: feeAmt,
  //         tpid: proxy1.address
  //       }
  //     });
  //     wait(1000); //3000);
  //     bundles = await getBundleCount(user1.sdk);
  //   }
  //   console.log('done');
  //   bundles = await getBundleCount(user1.sdk);
  //   expect(bundles).to.equal(0);
  // });

  it(`consume user1's remaining bundled transactions`, async () => {
    try {
      await consumeRemainingBundles(user1, proxy1);
    } catch (err) {
      expect(err).to.equal(null);
    } finally {
      let bundleCount = await getBundleCount(user1.sdk);
      expect(bundleCount).to.equal(0);
    }
  });

  it(`stake FIO with no bundles remaining, expect fee_collected > 0`, async () => {
    let stakedTokenPool, combinedTokenPool, globalSrpCount, stakeAmt, feeAmt, newStakedTokenPool, newCombinedTokenPool, newGlobalSrpCount;
    stakeAmt = 50000000000;
    //feeAmt = 3000000000;
    stakedTokenPool = await getStakedTokenPool();
    combinedTokenPool = await getCombinedTokenPool();
    globalSrpCount = await getGlobalSrpCount();
    let bal = await user1.sdk.genericAction('getFioBalance', { });
    let fioNames = await user1.sdk.genericAction('getFioNames', { fioPublicKey: user1.publicKey })
    let bundleCount = fioNames.fio_addresses[0].remaining_bundled_tx;
    expect(bundleCount).to.equal(0);

    const result = await user1.sdk.genericAction('pushTransaction', {
      action: 'stakefio',
      account: 'fio.staking',
      data: {
        fio_address: user1.address,
        amount: stakeAmt,
        actor: user1.account,
        max_fee: config.api.stake_fio_tokens.fee,
        tpid: proxy1.address
      }
    });
    newStakedTokenPool = await getStakedTokenPool();
    newCombinedTokenPool = await getCombinedTokenPool();
    newGlobalSrpCount = await getGlobalSrpCount();
    let newBal = await user1.sdk.genericAction('getFioBalance', {});
    expect(result).to.have.all.keys('block_num', 'fee_collected', 'status', 'transaction_id');
    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(config.api.stake_fio_tokens.fee);
    expect(newBal.staked - bal.staked).to.equal(stakeAmt);
    expect(newStakedTokenPool).to.be.greaterThan(stakedTokenPool);
    expect(newStakedTokenPool - stakedTokenPool).to.equal(stakeAmt);
    expect(newCombinedTokenPool - combinedTokenPool).to.be.greaterThanOrEqual(stakeAmt);
    expect(newGlobalSrpCount - globalSrpCount).to.equal(stakeAmt * 2);
  });
});

describe('C. Test unstakefio Bundled transactions', () => {
  let bp1, bp2, bp3, user1, user2, user3, proxy1, bundleCount1, accountnm, keys;
  const fundsAmount = 1000000000000

  before(async () => {
    // Create sdk objects for the orinigal localhost BPs
    bp1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
    bp2 = await existingUser('hfdg2qumuvlc', '5JnhMxfnLhZeRCRvCUsaHbrvPSxaqjkQAgw4ZFodx4xXyhZbC9P', 'FIO7uTisye5w2hgrCSE1pJhBKHfqDzhvqDJJ4U3vN9mbYWzataS2b', 'dapixdev', 'bp2@dapixdev');
    bp3 = await existingUser('wttywsmdmfew', '5JvmPVxPxypQEKPwFZQW4Vx7EC8cDYzorVhSWZvuYVFMccfi5mU', 'FIO6oa5UV9ghWgYH9en8Cv8dFcAxnZg2i9z9gKbnHahciuKNRPyHc', 'dapixdev', 'bp3@dapixdev');

    user1 = await newUser(faucet);
    user3 = await newUser(faucet);

    keys = await createKeypair();

    accountnm =  await getAccountFromKey(keys.publicKey);

    const transfer = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: keys.publicKey,
      amount: fundsAmount,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    });
    expect(transfer.status).to.equal('OK');

    proxy1 = await newUser(faucet);
    user2 = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson);
  });

  it('Confirm stake_fio_tokens fee for user1 is zero (bundles remaining)', async () => {
    let result = await user1.sdk.getFee('stake_fio_tokens', user1.address);
    expect(result.fee).to.equal(0);
  });

  it(`Get balance for user1`, async () => {
    const result = await user1.sdk.genericAction('getFioBalance', {
      fioPublicKey: user1.publicKey
    });
    expect(result).to.have.all.keys('balance', 'available', 'staked', 'srps', 'roe');
    expect(result.balance).to.equal(2160000000000);
    expect(result.available).to.equal(2160000000000);
    expect(result.staked).to.equal(0);
    expect(result.srps).to.equal(0);
    expect(result.roe).to.equal('0.500000000000000');
  });

  it(`get addresses for user1`, async () => {
    const result = await user1.sdk.genericAction('getPublicAddresses', {
      fioAddress: user1.address,
      limit: 0,
      offset: 0
    });
    expect(result.public_addresses.length).to.equal(1);
  });

  it(`Get bundle count for user1 `, async () => {
    bundleCount1 = await getBundleCount(user1.sdk);
    expect(bundleCount1).to.equal(100);
  });

  it(`register a proxy so user1 can stake with bundles`, async () => {
    const result = await proxy1.sdk.genericAction('pushTransaction', {
      action: 'regproxy',
      account: 'eosio',
      data: {
        fio_address: proxy1.address,
        actor: proxy1.account,
        max_fee: config.api.register_proxy.fee
      }
    });
    expect(result).to.have.all.keys('block_num', 'fee_collected', 'status', 'transaction_id');
    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(config.api.register_proxy.fee);
  });

  it(`get initial locks for user1, expect error: no lock tokens in account`, async () => {
    try {
      const locks = await user1.sdk.genericAction('getLocks', {fioPublicKey: user1.publicKey});
      expect(locks).to.have.all.keys('lock_amount', 'remaining_lock_amount', 'time_stamp', 'payouts_performed', 'can_vote', 'unlock_periods')
    } catch (err) {
      expect(err.errorCode).to.equal(404);
      expect(err.json.message).to.equal('No lock tokens in account');
    }
  });

  it(`stake 50000000000 FIO so user1 has funds to unstake`, async () => {
    let stakedTokenPool, combinedTokenPool, globalSrpCount, stakeAmt, feeAmt, newStakedTokenPool, newCombinedTokenPool, newGlobalSrpCount;
    stakeAmt = 50000000000;
    //feeAmt = 3000000000;
    stakedTokenPool = await getStakedTokenPool();
    combinedTokenPool = await getCombinedTokenPool();
    globalSrpCount = await getGlobalSrpCount();
    let bal = await user1.sdk.genericAction('getFioBalance', { });
    expect(bal.staked).to.equal(0);

    const result = await user1.sdk.genericAction('pushTransaction', {
      action: 'stakefio',
      account: 'fio.staking',
      data: {
        fio_address: user1.address,
        amount: stakeAmt,
        actor: user1.account,
        max_fee: config.api.stake_fio_tokens.fee,
        tpid: proxy1.address
      }
    });
    newStakedTokenPool = await getStakedTokenPool();
    newCombinedTokenPool = await getCombinedTokenPool();
    newGlobalSrpCount = await getGlobalSrpCount();
    let newBal = await user1.sdk.genericAction('getFioBalance', { });
    expect(result).to.have.all.keys('block_num', 'fee_collected', 'status', 'transaction_id');
    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(0);
    expect(newBal.staked - bal.staked).to.equal(stakeAmt);
    expect(newStakedTokenPool).to.be.greaterThan(stakedTokenPool);
    expect(newStakedTokenPool - stakedTokenPool).to.equal(stakeAmt);
    expect(newCombinedTokenPool - combinedTokenPool).to.equal(stakeAmt);
    expect(newGlobalSrpCount - globalSrpCount).to.equal(stakeAmt * 2);

    let bundles = await getBundleCount(user1.sdk);
    expect(bundles).to.equal(99);
  });

  it(`get locks for user1, expect 404 error: No lock tokens in account`, async () => {
    try {
      const locks = await user1.sdk.genericAction('getLocks', {fioPublicKey: user1.publicKey});
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.errorCode).to.equal(404);
      expect(err.json.message).to.equal('No lock tokens in account');
    }
  });

  it(`unstake 10000000000 FIO from user1`, async () => {
    let stakedTokenPool, combinedTokenPool, globalSrpCount, stakeAmt, feeAmt, newStakedTokenPool, newCombinedTokenPool, newGlobalSrpCount;
    stakeAmt = 10000000000;
    //feeAmt = 3000000000;
    stakedTokenPool = await getStakedTokenPool();
    combinedTokenPool = await getCombinedTokenPool();
    globalSrpCount = await getGlobalSrpCount();
    let bal = await user1.sdk.genericAction('getFioBalance', { });

    const result = await user1.sdk.genericAction('pushTransaction', {
      action: 'unstakefio',
      account: 'fio.staking',
      data: {
        fio_address: user1.address,
        amount: stakeAmt,
        actor: user1.account,
        max_fee: config.api.unstake_fio_tokens.fee,
        tpid: proxy1.address
      }
    });
    newStakedTokenPool = await getStakedTokenPool();
    newCombinedTokenPool = await getCombinedTokenPool();
    newGlobalSrpCount = await getGlobalSrpCount();
    let newBal = await user1.sdk.genericAction('getFioBalance', { });
    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(0);
    expect(bal.staked - newBal.staked).to.equal(stakeAmt);
    expect(newStakedTokenPool).to.be.lessThan(stakedTokenPool);
    expect(stakedTokenPool - newStakedTokenPool).to.equal(stakeAmt);
    expect(combinedTokenPool - newCombinedTokenPool).to.equal(stakeAmt);
    expect(globalSrpCount - newGlobalSrpCount).to.equal(stakeAmt * 2);

    let bundles = await getBundleCount(user1.sdk);
    expect(bundles).to.equal(98);
  });

  it(`get locks for user1, expect lock_amount, remaining_lock_amount and unlock period amount to equal 10000000000`, async () => {
    const locks = await user1.sdk.genericAction('getLocks', {fioPublicKey: user1.publicKey});
    expect(locks).to.have.all.keys('lock_amount', 'remaining_lock_amount', 'time_stamp', 'payouts_performed', 'can_vote', 'unlock_periods');
    expect(locks.lock_amount).to.equal(10000000000);
    expect(locks.remaining_lock_amount).to.equal(10000000000);
    expect(locks.unlock_periods.length).to.equal(1);
    expect(locks.unlock_periods[0].amount).to.equal(10000000000);
  });

  it(`consume user1's remaining bundled transactions`, async () => {
    try {
      await consumeRemainingBundles(user1, proxy1);
    } catch (err) {
      expect(err).to.equal(null);
    } finally {
      let bundleCount = await getBundleCount(user1.sdk);
      expect(bundleCount).to.equal(0);
    }
  });

  it(`get locks for user1, expect lock_amount, remaining_lock_amount and unlock period amount to equal 0`, async () => {
    const locks = await user1.sdk.genericAction('getLocks', {fioPublicKey: user1.publicKey});
    expect(locks).to.have.all.keys('lock_amount', 'remaining_lock_amount', 'time_stamp', 'payouts_performed', 'can_vote', 'unlock_periods');
    // expect(locks.lock_amount).to.equal(0);
    // expect(locks.remaining_lock_amount).to.equal(0);
    // expect(locks.unlock_periods.length).to.equal(0);
    expect(locks.lock_amount).to.equal(10000000000);
    expect(locks.remaining_lock_amount).to.equal(10000000000);
    expect(locks.unlock_periods.length).to.equal(1);
    expect(locks.unlock_periods[0].amount).to.equal(10000000000);
  });

  it(`unstake FIO with no bundles remaining, expect fee_collected > 0`, async () => {
    let stakedTokenPool, combinedTokenPool, globalSrpCount, stakeAmt, feeAmt, newStakedTokenPool, newCombinedTokenPool, newGlobalSrpCount;
    stakeAmt = 20000000000;
    //feeAmt = 3000000000;
    stakedTokenPool = await getStakedTokenPool();
    combinedTokenPool = await getCombinedTokenPool();
    globalSrpCount = await getGlobalSrpCount();
    let bal = await user1.sdk.genericAction('getFioBalance', { });
    expect(bal.staked).to.be.greaterThanOrEqual(stakeAmt);

    const result = await user1.sdk.genericAction('pushTransaction', {
      action: 'unstakefio',
      account: 'fio.staking',
      data: {
        fio_address: user1.address,
        amount: stakeAmt,
        actor: user1.account,
        max_fee: config.api.unstake_fio_tokens.fee,
        tpid: proxy1.address
      }
    });
    newStakedTokenPool = await getStakedTokenPool();
    newCombinedTokenPool = await getCombinedTokenPool();
    newGlobalSrpCount = await getGlobalSrpCount();
    let newBal = await user1.sdk.genericAction('getFioBalance', {});
    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(config.api.unstake_fio_tokens.fee);
    expect(bal.staked - newBal.staked).to.equal(stakeAmt);
    expect(newStakedTokenPool).to.be.lessThan(stakedTokenPool);
    expect(stakedTokenPool - newStakedTokenPool).to.equal(stakeAmt);
    expect(combinedTokenPool - newCombinedTokenPool).to.be.lessThanOrEqual(stakeAmt);
    expect(globalSrpCount - newGlobalSrpCount).to.equal(stakeAmt * 2);

    let bundleCount = await getBundleCount(user1.sdk);
    expect(bundleCount).to.equal(0);
  });

  it(`get locks for user1, expect lock_amount, remaining_lock_amount and unlock period amount to equal 20000000000Z`, async () => {
    const locks = await user1.sdk.genericAction('getLocks', {fioPublicKey: user1.publicKey});
    expect(locks).to.have.all.keys('lock_amount', 'remaining_lock_amount', 'time_stamp', 'payouts_performed', 'can_vote', 'unlock_periods');
    expect(locks.lock_amount).to.equal(30000000000);
    expect(locks.payouts_performed).to.equal(0);
    expect(locks.remaining_lock_amount).to.equal(30000000000);
    expect(locks.unlock_periods.length).to.equal(2);
    expect(locks.unlock_periods[1].amount).to.equal(20000000000);
  });

  it(`try to unstake with 0 staked balance, expect error`, async () => {
    let bal, newBal, stakedTokenPool, combinedTokenPool, globalSrpCount, stakeAmt, feeAmt, newStakedTokenPool, newCombinedTokenPool, newGlobalSrpCount;
    stakeAmt = 20000000000;
    //feeAmt = 3000000000;
    stakedTokenPool = await getStakedTokenPool();
    combinedTokenPool = await getCombinedTokenPool();
    globalSrpCount = await getGlobalSrpCount();
    bal = await user3.sdk.genericAction('getFioBalance', { });
    expect(bal.staked).to.be.greaterThanOrEqual(0);

    try {
      const result = await user3.sdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: '',
          amount: stakeAmt,
          actor: user3.account,
          max_fee: config.api.unstake_fio_tokens.fee,
          tpid: proxy1.address
        }
      });
    } catch (err) {
      newStakedTokenPool = await getStakedTokenPool();
      newCombinedTokenPool = await getCombinedTokenPool();
      newGlobalSrpCount = await getGlobalSrpCount();
      newBal = await user3.sdk.genericAction('getFioBalance', {});
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.json).to.have.all.keys('code', 'message', 'error');
      expect(err.json.error.details[0].message).to.contain('incacctstake, actor has no accountstake record');
      expect(newStakedTokenPool).to.equal(stakedTokenPool);
      expect(newCombinedTokenPool).to.equal(combinedTokenPool);
      expect(newGlobalSrpCount).to.equal(globalSrpCount);
      expect(newBal.staked).to.equal(bal.staked);
      expect(await getBundleCount(user3.sdk)).to.equal(100);
    }
  });

  it(`try to unstake with 0 bundles and 0 staked balance, expect error`, async () => {
    let bal, newBal, stakedTokenPool, combinedTokenPool, globalSrpCount, stakeAmt, feeAmt, newStakedTokenPool, newCombinedTokenPool, newGlobalSrpCount;
    //feeAmt = 3000000000;
    bal = await user1.sdk.genericAction('getFioBalance', { });
    stakeAmt = bal.staked - config.api.unstake_fio_tokens.fee;
    const unstake = await user1.sdk.genericAction('pushTransaction', {
      action: 'unstakefio',
      account: 'fio.staking',
      data: {
        fio_address: user1.address,
        amount: stakeAmt,
        actor: user1.account,
        max_fee: config.api.unstake_fio_tokens.fee,
        tpid: proxy1.address
      }
    });
    expect(unstake.status).to.equal('OK');
    bal = await user1.sdk.genericAction('getFioBalance', { });
    stakedTokenPool = await getStakedTokenPool();
    combinedTokenPool = await getCombinedTokenPool();
    globalSrpCount = await getGlobalSrpCount();
    expect(bal.staked).to.equal(config.api.unstake_fio_tokens.fee);
    expect(await getBundleCount(user1.sdk)).to.equal(0);

    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: user1.address,
          amount: stakeAmt,
          actor: user1.account,
          max_fee: config.api.unstake_fio_tokens.fee,
          tpid: ''
        }
      });
    } catch (err) {
      newStakedTokenPool = await getStakedTokenPool();
      newCombinedTokenPool = await getCombinedTokenPool();
      newGlobalSrpCount = await getGlobalSrpCount();
      newBal = await user1.sdk.genericAction('getFioBalance', {});
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.json.fields[0].error).to.equal('Cannot unstake more than staked.');
      expect(newStakedTokenPool).to.equal(stakedTokenPool);
      expect(newCombinedTokenPool).to.equal(combinedTokenPool);
      expect(newGlobalSrpCount).to.equal(globalSrpCount);
      expect(newBal.staked).to.equal(bal.staked);
    }
  });

  it(`get locks for user1, expect lock_amount, remaining_lock_amount and unlock period amount to equal 20000000000Z`, async () => {
    const locks = await user1.sdk.genericAction('getLocks', {fioPublicKey: user1.publicKey});
    expect(locks).to.have.all.keys('lock_amount', 'remaining_lock_amount', 'time_stamp', 'payouts_performed', 'can_vote', 'unlock_periods');
    expect(locks.lock_amount).to.equal(47000000000);
    expect(locks.payouts_performed).to.equal(0);
    expect(locks.remaining_lock_amount).to.equal(47000000000);
    expect(locks.unlock_periods.length).to.equal(2);
    expect(locks.unlock_periods[1].amount).to.equal(37000000000);
  });

  it(`wait 70 seconds for unlock`, async () => {
    await timeout(UNSTAKELOCKDURATIONSECONDS * 1000);
  })

  it(`get locks for user1, expect lock_amount, remaining_lock_amount and unlock period amount to equal 20000000000Z`, async () => {
    const locks = await user1.sdk.genericAction('getLocks', {fioPublicKey: user1.publicKey});
    expect(locks).to.have.all.keys('lock_amount', 'remaining_lock_amount', 'time_stamp', 'payouts_performed', 'can_vote', 'unlock_periods');
    expect(locks.lock_amount).to.equal(0);
    expect(locks.payouts_performed).to.equal(0);
    expect(locks.remaining_lock_amount).to.equal(0);
    expect(locks.unlock_periods.length).to.equal(0);
  });
});

describe(`D. Stake tokens using auto proxy without voting first, \n Then do a full pull through unstaking including testing the locking period.`, () => {
  // auto-proxy tests taken from stake-regression.js
  let user1, proxy1, voter;
  const fundsAmount = 1000000000000;

  before(async () => {
    user1 = await newUser(faucet);
    proxy1 = await newUser(faucet);

    //now transfer 1k fio from the faucet to this account
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: user1.publicKey,
      amount: fundsAmount,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    });
    expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected');
  });

  it('confirm proxy1: not in the voters table', async () => {
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

      inVotersTable = false;
      for (voter in voters.rows) {
        if (voters.rows[voter].owner == proxy1.account) {
          inVotersTable = true;
          break;
        }
      }
      expect(inVotersTable).to.equal(false);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  });

  it(`register proxy1 as a proxy`, async () => {
    try {
      const result = await proxy1.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: proxy1.address,
          actor: proxy1.account,
          max_fee: config.api.register_proxy.fee
        }
      });
      expect(result.status).to.equal('OK');
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal('null');
    }
  });

  it('confirm proxy1: is_proxy = 1, is_auto_proxy = 0', async () => {
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
      inVotersTable = false;
      voters = await callFioApi("get_table_rows", json);
      for (voter in voters.rows) {
        if (voters.rows[voter].owner == proxy1.account) {
          inVotersTable = true;
          break;
        }
      }
      expect(voters.rows[voter].is_auto_proxy).to.equal(0);
      expect(voters.rows[voter].is_proxy).to.equal(1);
      expect(inVotersTable).to.equal(true);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  });

  it('confirm user1: not in voters table', async () => {
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
      inVotersTable = false;
      for (voter in voters.rows) {
        if (voters.rows[voter].owner == user1.account) {
          inVotersTable = true;
          break;
        }
      }
      expect(inVotersTable).to.equal(false)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  });

  it(`success user1 stake 3k FIO using tpid and auto proxy`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'stakefio',
        account: 'fio.staking',
        data: {
          fio_address: user1.address,
          amount: 3000000000000,
          actor: user1.account,
          max_fee: config.api.stake_fio_tokens.fee,
          tpid: proxy1.address
        }
      });

      expect(result.status).to.equal('OK')
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it('confirm user1: is in the voters table and is_auto_proxy = 1, proxy is proxy1.account', async () => {
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
      inVotersTable = false;
      for (voter in voters.rows) {
        if (voters.rows[voter].owner == user1.account) {
          inVotersTable = true;
          expect(voters.rows[voter].is_auto_proxy).to.equal(1);
          expect(voters.rows[voter].proxy).to.equal(proxy1.account);
          break;
        }
      }
      expect(inVotersTable).to.equal(true);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  });

  it(`failure, user1 try to stake again, stake 900 tokens, insufficient balance `, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'stakefio',
        account: 'fio.staking',
        data: {
          fio_address: user1.address,
          amount: 900000000000,
          actor: user1.account,
          max_fee: config.api.stake_fio_tokens.fee,
          tpid:''
        }
      });
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      expect(err.json.fields[0].error).to.contain('Insufficient balance');
    }
  });

  it(`failure, user1 unstake 4k tokens, cannot unstake more than staked `, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: user1.address,
          amount: 4000000000000,
          actor: user1.account,
          max_fee: config.api.unstake_fio_tokens.fee,
          tpid:''
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.json.fields[0].error).to.contain('Cannot unstake more than staked');
    }
  });

  it(`success, user1 unstake 2k tokens `, async () => {
    const result = await user1.sdk.genericAction('pushTransaction', {
      action: 'unstakefio',
      account: 'fio.staking',
      data: {
        fio_address: user1.address,
        amount: 2000000000000,
        actor: user1.account,
        max_fee: config.api.unstake_fio_tokens.fee,
        tpid:''
      }
    });
    expect(result.status).to.equal('OK');
  })

  it(`failure, transfer 2k FIO to proxy1 FIO public key from user1`, async () => {
    try {
      const result = await user1.sdk.genericAction('transferTokens', {
        payeeFioPublicKey: proxy1.publicKey,
        amount: 2000000000000,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        technologyProviderId: ''
      })
      expect(result.status).to.not.equal('OK');
    }catch (err){
      expect(err.json.fields[0].error).to.contain('Funds locked');
    }
  });

  it(`wait for unlock`, async () => {
    await timeout(UNSTAKELOCKDURATIONSECONDS * 1000);
  })

  it(`success, Transfer 2000 FIO to proxy1 FIO public key from user1`, async () => {
    try {
      const result = await user1.sdk.genericAction('transferTokens', {
        payeeFioPublicKey: proxy1.publicKey,
        amount: 2000000000000,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        technologyProviderId: ''
      });
      expect(result.status).to.equal('OK');
    }catch (err){
      console.log("ERROR: ", err);
      expect(err).to.equal(null);
    }
  });
});

describe(`E. (unhappy tests) stake and unstake FIO with invalid input parameters`, () => {

  let bp1, bp2, bp3, userA, userB, userC, userD, userP, locksdk, keys, accountnm, newFioDomain1, newFioAddress1, newFioAddress2;

  before(async () => {
    // Create sdk objects for the orinigal localhost BPs
    bp1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
    bp2 = await existingUser('hfdg2qumuvlc', '5JnhMxfnLhZeRCRvCUsaHbrvPSxaqjkQAgw4ZFodx4xXyhZbC9P', 'FIO7uTisye5w2hgrCSE1pJhBKHfqDzhvqDJJ4U3vN9mbYWzataS2b', 'dapixdev', 'bp2@dapixdev');
    bp3 = await existingUser('wttywsmdmfew', '5JvmPVxPxypQEKPwFZQW4Vx7EC8cDYzorVhSWZvuYVFMccfi5mU', 'FIO6oa5UV9ghWgYH9en8Cv8dFcAxnZg2i9z9gKbnHahciuKNRPyHc', 'dapixdev', 'bp3@dapixdev');
    // Create users
    userA = await newUser(faucet);
    userB = await newUser(faucet);
    userC = await newUser(faucet);
    userD = await newUser(faucet);
    userP = await newUser(faucet);
    keys = await createKeypair();

    accountnm =  await getAccountFromKey(keys.publicKey);
    try {
      const locked = await faucet.genericAction('pushTransaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        data: {
          payee_public_key: keys.publicKey,
          can_vote: 0,
          periods: [
            {
              duration: 120,
              amount: 5000000000000,
            },
            {
              duration: 180,
              amount: 4000000000000,
            },
            {
              duration: 1204800,
              amount: 1000000000000,
            }
          ],
          amount: 10000000000000,
          max_fee: 400000000000,
          tpid: '',
          actor: 'qhh25sqpktwh',
        }
      });
      expect(locked.status).to.equal('OK');
    } catch (err) {
      console.log('lock token transfer failed.... must already be set up or not need this precondition...');
    }

    locksdk = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson);

    newFioDomain1 = generateFioDomain(15);
    const domainRegistered = await userC.sdk.genericAction('registerFioDomain', {
      fioDomain: newFioDomain1,
      maxFee: config.api.register_fio_domain.fee,
      tpid: '',
    });
    expect(domainRegistered).to.have.all.keys('status', 'expiration', 'fee_collected');
    expect(domainRegistered.status).to.equal('OK');
    expect(domainRegistered.fee_collected).to.equal(config.api.register_fio_domain.fee);

    newFioAddress1 = generateFioAddress(newFioDomain1,15)
    const addressRegistered = await userC.sdk.genericAction('registerFioAddress', {
      fioAddress: newFioAddress1,
      maxFee: config.api.register_fio_address.fee,
      tpid: '',
    });
    expect(addressRegistered).to.have.all.keys('status', 'expiration', 'fee_collected');
    expect(addressRegistered.status).to.equal('OK');
    expect(addressRegistered.fee_collected).to.equal(config.api.register_fio_address.fee);

    const regproxy = await userP.sdk.genericAction('pushTransaction', {
      action: 'regproxy',
      account: 'eosio',
      data: {
        fio_address: userP.address,
        actor: userP.account,
        max_fee: config.api.register_proxy.fee
      }
    });
    expect(regproxy).to.have.all.keys('block_num', 'fee_collected', 'status', 'transaction_id');
    expect(regproxy.status).to.equal('OK');
    expect(regproxy.fee_collected).to.equal(config.api.register_proxy.fee);
  });

  it(`attempt to stake without voting, proxying or auto-proxy, expect Error 400`, async () => {
    try {
      await userC.sdk.genericAction('pushTransaction', {
        action: 'stakefio',
        account: 'fio.staking',
        data: {
          fio_address: userC.address,
          amount: 1000000000000,
          actor: userC.account,
          max_fee: config.api.stake_fio_tokens.fee,
          tpid:'casey@dapixdev'
        }
      });
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].error).to.equal('Account has not voted and has not proxied.');
    }
  });

  it(`attempt to stake with amount -100, expect Error 400`, async () => {
    // vote first so we're eligible
    const vote = await userC.sdk.genericAction('pushTransaction', {
      action: 'voteproducer',
      account: 'eosio',
      data: {
        producers: ["bp1@dapixdev"],
        fio_address: newFioAddress1,
        actor: userC.account,
        max_fee: config.api.vote_producer.fee
      }
    });
    expect(vote).to.have.all.keys('block_num', 'fee_collected', 'status', 'transaction_id');
    expect(vote.status).to.equal('OK');

    try {
      const result = await userC.sdk.genericAction('pushTransaction', {
        action: 'stakefio',
        account: 'fio.staking',
        data: {
          fio_address: userC.address,
          amount: -100000000000,
          actor: userC.account,
          max_fee: config.api.stake_fio_tokens.fee,
          tpid:'casey@dapixdev'
        }
      });
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.errorCode).to.equal(400);
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.json.fields[0].error).to.equal('Invalid amount value');
    }
  });

  it(`attempt to stake with max_fee -100, expect Error 400`, async () => {
    // vote/proxy first so we're eligible
    try {
      const vote = await userC.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          producers: ["bp1@dapixdev"],
          fio_address: newFioAddress2,
          actor: userC.account,
          max_fee: config.api.vote_producer.fee
        }
      });
      expect(vote).to.have.all.keys('block_num', 'fee_collected', 'status', 'transaction_id');
      expect(vote.status).to.equal('OK');
    } catch (err) {
      expect(err).to.equal(null);
    }

    let bal = await userC.sdk.genericAction('getFioBalance', {});
    let lockBal = await locksdk.genericAction('getFioBalance', {});
    try {
      await userC.sdk.genericAction('pushTransaction', {
        action: 'stakefio',
        account: 'fio.staking',
        data: {
          fio_address: userC.address,
          amount: 1000000000000,
          actor: userC.account,
          max_fee: -100,
          tpid:'casey@dapixdev'
        }
      });
      let newBal = await userC.sdk.genericAction('getFioBalance', {});
      let newLockBal = await locksdk.genericAction('getFioBalance', {});
      expect(newBal.staked).to.equal(bal.staked);
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.errorCode).to.equal(400);
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.json.fields[0].error).to.equal('Invalid fee value');
    }
  });

  it(`consume userC's remaining bundled transactions to force staking fee`, async () => {
    try {
      await consumeRemainingBundles(userC, userP);
    } catch (err) {
      expect(err).to.equal(null);
    } finally {
      let bundleCount = await getBundleCount(userC.sdk);
      expect(bundleCount).to.equal(0);
    }
  });

  it(`attempt to stake the exact amount of tokens available in account, expect Error 400`, async () => {
    let bal = await userC.sdk.genericAction('getFioBalance', {});
    try {
      const result = await userC.sdk.genericAction('pushTransaction', {
        action: 'stakefio',
        account: 'fio.staking',
        data: {
          fio_address: userC.address,
          amount: bal.balance,
          actor: userC.account,
          max_fee: config.api.stake_fio_tokens.fee,
          tpid: 'casey@dapixdev'
        }
      });
      expect(result.status).to.not.equal('OK');

    } catch (err) {
      let newBal = await userC.sdk.genericAction('getFioBalance', {});
      expect(newBal.staked).to.equal(0);
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.json.fields[0].name).to.equal('amount');
      expect(err.json.fields[0].error).to.equal('Insufficient balance.');
    }
  });

  it(`attempt to stake with TPID notvalidfioaddress, expect Error 400`, async () => {
    try {
      const result = await userC.sdk.genericAction('pushTransaction', {
        action: 'stakefio',
        account: 'fio.staking',
        data: {
          fio_address: userC.address,
          amount: 1000000000000,
          actor: locksdk.account,
          max_fee: config.api.stake_fio_tokens.fee,
          tpid:'invalidfioaddress!!!@@@#@'
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.errorCode).to.equal(400);
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.json.fields[0].error).to.equal('TPID must be empty or valid FIO address');
    }
  });

  it(`attempt to stake and sign with key not hashing to actor, expect Error 403`, async () => {
    try {
      const result = await userC.sdk.genericAction('pushTransaction', {
        action: 'stakefio',
        account: 'fio.staking',
        data: {
          fio_address: userB.address,
          amount: 50000000000,
          actor: userC.account,
          max_fee: config.api.stake_fio_tokens.fee,
          tpid:'casey@dapixdev'
        }
      });
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.errorCode).to.equal(403);
      expect(err.json).to.have.all.keys('type', 'message');
      expect(err.json.message).to.equal('Request signature is not valid or this user is not allowed to sign this transaction.');
    }
  });

  it(`attempt to unstake with amount -100, expect Error 400`, async () => {
    try {
      const result = await userC.sdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: userC.account,
          amount: -1000000000000,
          actor: userC.account,
          max_fee: config.api.unstake_fio_tokens.fee +1,
          tpid:'casey@dapixdev'
        }
      });
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.errorCode).to.equal(400);
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.json.fields[0].error).to.equal('Invalid amount value');
    }
  });

  it(`attempt to unstake amount larger than staked, expect Error 400`, async () => {
    const stake = await userC.sdk.genericAction('pushTransaction', {
      action: 'stakefio',
      account: 'fio.staking',
      data: {
        fio_address: '',
        amount: 50000000000,
        actor: userC.account,
        max_fee: config.api.stake_fio_tokens.fee,
        tpid:''
      }
    });
    expect(stake).to.have.all.keys('block_num', 'fee_collected', 'status', 'transaction_id');
    expect(stake.status).to.equal('OK');
    expect(stake.fee_collected).to.equal(config.api.stake_fio_tokens.fee);
    let bal = await userC.sdk.genericAction('getFioBalance', {});
    let unstakeAmt = bal.staked + 1000000000000;
    try {
      const result = await userC.sdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: userC.address,
          amount: 50000000001,
          actor: userC.account,
          max_fee: config.api.unstake_fio_tokens.fee +1,
          tpid:''
        }
      });
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.errorCode).to.equal(400);
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.json.fields[0].error).to.equal('Cannot unstake more than staked.');
    }
  });

  it(`attempt to unstake with max_fee -100, expect Error 400`, async () => {
    try {
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: "stake@dapixdev",
          amount: 1000000000000,
          actor: locksdk.account,
          max_fee: -100,
          tpid:'casey@dapixdev'
        }
      });
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.errorCode).to.equal(400);
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.json.fields[0].error).to.equal('Invalid fee value');
    }
  });

  it(`attempt to unstake from account with 0 available, expect Error 400`, async () => {
    let userDBal = await userD.sdk.genericAction('getFioBalance', {});
    try {
      // proxy first so we can stake
      const proxyvote = await userD.sdk.genericAction('pushTransaction', {
        action: 'voteproxy',
        account: 'eosio',
        data: {
          proxy: userP.address,
          fio_address: userD.address,
          actor: userD.account,
          max_fee: config.api.proxy_vote.fee
        }
      });
      expect(proxyvote.status).to.equal('OK');
      userDBal = await userD.sdk.genericAction('getFioBalance', {});
      // const stake = await userD.sdk.genericAction('pushTransaction', {
      //   action: 'stakefio',
      //   account: 'fio.staking',
      //   data: {
      //     fio_address: '',
      //     amount: 5000000000,
      //     actor: accountnm,
      //     max_fee: config.maxFee,
      //     tpid: ''
      //   }
      // });
      // expect(stake).to.have.all.keys('block_num', 'fee_collected', 'status', 'transaction_id');
      // expect(stake.status).to.equal('OK');
      // expect(stake.fee_collected).to.equal(3000000000);
      // userDBal = await userD.sdk.genericAction('getFioBalance', {});
      // expect(userDBal.staked).to.equal(5000000000);

      // then transfer tokens so balance == 0
      await userD.sdk.genericAction('transferTokens', {
        payeeFioPublicKey: keys.publicKey,
        amount: userDBal.available - config.api.transfer_tokens_pub_key.fee,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        tpid: '',
      });

      let newUserDBal = await userD.sdk.genericAction('getFioBalance', {});
      expect(newUserDBal.available).to.equal(0);
    } catch (err) {
      console.log('test likely already set up');
    }
    userDBal = await userD.sdk.genericAction('getFioBalance', {});
    try {
      const result = await userD.sdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: userD.address,
          amount: userDBal.staked,
          actor: userD.account,
          max_fee: config.api.unstake_fio_tokens.fee,
          tpid:''
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch(err) {
      let newUserDBal = await userD.sdk.genericAction('getFioBalance', {});
      expect(newUserDBal.balance).to.equal(0);
      expect(newUserDBal.available).to.equal(0);
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.errorCode).to.equal(400);
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.json.fields[0].error).to.equal('Invalid amount value');
    }
  });

  it(`attempt to unstake from account with 0 balance, expect Error 400`, async () => {
    let userDBal = await userD.sdk.genericAction('getFioBalance', {});
    try {
      // proxy first so we can stake
      const proxyvote = await userD.sdk.genericAction('pushTransaction', {
        action: 'voteproxy',
        account: 'eosio',
        data: {
          proxy: userP.address,
          fio_address: userD.address,
          actor: userD.account,
          max_fee: config.api.proxy_vote.fee
        }
      });
      expect(proxyvote.status).to.equal('OK');
      userDBal = await userD.sdk.genericAction('getFioBalance', {});
      const stake = await userD.sdk.genericAction('pushTransaction', {
        action: 'stakefio',
        account: 'fio.staking',
        data: {
          fio_address: '',
          amount: 5000000000,
          actor: userD.account,
          max_fee: config.api.stake_fio_tokens.fee,
          tpid: ''
        }
      });
      expect(stake).to.have.all.keys('block_num', 'fee_collected', 'status', 'transaction_id');
      expect(stake.status).to.equal('OK');
      expect(stake.fee_collected).to.equal(3000000000);
      userDBal = await userD.sdk.genericAction('getFioBalance', {});
      expect(userDBal.staked).to.equal(5000000000);
      // then transfer tokens so balance == 0
      await userD.sdk.genericAction('transferTokens', {
        payeeFioPublicKey: keys.publicKey,
        amount: userDBal.available - config.api.transfer_tokens_pub_key.fee,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        tpid: '',
      });
      let newUserDBal = await userD.sdk.genericAction('getFioBalance', {});
      expect(newUserDBal.available).to.equal(0);
    } catch (err) {
      console.log('test may already be set up');
    }
    userDBal = await userD.sdk.genericAction('getFioBalance', {});
    try {
      const result = await userD.sdk.genericAction('pushTransaction', {
        // action: 'unstakefio',
        // account: 'fio.staking',
        // data: {
        //   fio_address: locksdk.address,
        //   amount: 100000000000,
        //   actor: accountnm,
        //   max_fee: config.maxFee,
        //   tpid: ''
        // }
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: userD.address,
          amount: 5000000000, //userDBal.staked,
          actor: userD.account,
          max_fee: config.api.unstake_fio_tokens.fee,
          tpid:''
        }
      });
      userDBal = await userD.sdk.genericAction('getFioBalance', {});
      let newBalLock = await locksdk.genericAction('getFioBalance', {});
    } catch(err) {
      let newUserDBal = await userD.sdk.genericAction('getFioBalance', {});
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.errorCode).to.equal(500);
      expect(err.json).to.have.all.keys('code', 'message', 'error');
      expect(err.json.error.details[0].message).to.equal('assertion failure with message: incacctstake, actor has no accountstake record.');
    }
  });

  it(`Attempt to unstake with TPID notvalidfioaddress, expect Error 400`, async () => {
    try {
      const result = await userC.sdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: userC.address,
          amount: 1000000000000,
          actor: userC.account,
          max_fee: config.api.unstake_fio_tokens.fee,
          tpid: 'invalidfioaddress!!!@@@#@'
        }
      });
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.errorCode).to.equal(400);
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.json.fields[0].error).to.equal('TPID must be empty or valid FIO address');
    }
  });

  it(`Attempt to unstake and sign with key not hashing to actor, expect Error 403`, async () => {
    try {
      const result = await userC.sdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: userB.address,
          amount: 50000000000,
          actor: userC.account,
          max_fee: config.api.unstake_fio_tokens.fee,
          tpid:'casey@dapixdev'
        }
      });
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.errorCode).to.equal(403);
      expect(err.json).to.have.all.keys('type', 'message');
      expect(err.json.message).to.equal('Request signature is not valid or this user is not allowed to sign this transaction.');
    }
  });
});

describe(`F. (unhappy tests) Stake and unstake some FIO with no bundles tx remaining`, () => {
  let bp1, bp2, bp3, userA, userB, userC, userP, locksdk, keys, accountnm;
  const fundsAmount = 1000000000000;
  const transferAmt = 100000000000;
  const stakeAmt = 50000000000;
  const unstakeAmt = 30000000000;

  before(async () => {
    // Create sdk objects for the orinigal localhost BPs
    bp1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
    bp2 = await existingUser('hfdg2qumuvlc', '5JnhMxfnLhZeRCRvCUsaHbrvPSxaqjkQAgw4ZFodx4xXyhZbC9P', 'FIO7uTisye5w2hgrCSE1pJhBKHfqDzhvqDJJ4U3vN9mbYWzataS2b', 'dapixdev', 'bp2@dapixdev');
    bp3 = await existingUser('wttywsmdmfew', '5JvmPVxPxypQEKPwFZQW4Vx7EC8cDYzorVhSWZvuYVFMccfi5mU', 'FIO6oa5UV9ghWgYH9en8Cv8dFcAxnZg2i9z9gKbnHahciuKNRPyHc', 'dapixdev', 'bp3@dapixdev');
    //create a user and give it 10k fio.
    userA = await newUser(faucet);
    userB = await newUser(faucet);
    userC = await newUser(faucet);
    userP = await newUser(faucet);
    keys = await createKeypair();

    accountnm =  await getAccountFromKey(keys.publicKey);
    await faucet.genericAction('pushTransaction', {
      action: 'trnsloctoks',
      account: 'fio.token',
      data: {
        payee_public_key: keys.publicKey,
        can_vote: 0,
        periods: [
          {
            duration: 120,
            amount: 5000000000000,
          },
          {
            duration: 180,
            amount: 4000000000000,
          },
          {
            duration: 1204800,
            amount: 1000000000000,
          }
        ],
        amount: 10000000000000,
        max_fee: 400000000000,
        tpid: '',
        actor: 'qhh25sqpktwh',
      }
    });
    locksdk = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson);

    // transfer some test FIO
    await userA.sdk.genericAction('transferTokens', {
      payeeFioPublicKey: keys.publicKey,
      amount: fundsAmount,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      tpid: '',
    });

    await locksdk.genericAction('transferTokens', {
      payeeFioPublicKey: userA.publicKey,
      amount: transferAmt,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    });

    // register our proxy
    await userP.sdk.genericAction('pushTransaction', {
      action: 'regproxy',
      account: 'eosio',
      data: {
        fio_address: userP.address,
        actor: userP.account,
        max_fee: config.api.register_proxy.fee
      }
    });

    // proxy first so userA can stake
    await userA.sdk.genericAction('pushTransaction', {
      action: 'voteproxy',
      account: 'eosio',
      data: {
        proxy: userP.address,
        fio_address: userA.address,
        actor: userA.account,
        max_fee: config.api.proxy_vote.fee
      }
    });

    await userC.sdk.genericAction('pushTransaction', {
      action: 'voteproxy',
      account: 'eosio',
      data: {
        proxy: userP.address,
        fio_address: userC.address,
        actor: userC.account,
        max_fee: config.api.proxy_vote.fee
      }
    });
  });

  it(`attempt to stake with max_fee = 1 and bundles remaining, expect OK status`, async () => {
    const result = await userC.sdk.genericAction('pushTransaction', {
      action: 'stakefio',
      account: 'fio.staking',
      data: {
        fio_address: userC.address,
        amount: stakeAmt,
        actor: userC.account,
        max_fee: 1,
        tpid:'casey@dapixdev'
      }
    });
    expect(result.status).to.equal('OK');
  });

  // it('stake small amounts of FIO so that all bundled tx get consumed', async () => {
  //   let stakeAmt = 1;
  //   //feeAmt = 3000000000;
  //   let bundles = await getBundleCount(userC.sdk)
  //   process.stdout.write('\tconsuming remaining bundled transactions\n\tthis may take a while');
  //   while (bundles > 0) {
  //     process.stdout.write('.');
  //     await userC.sdk.genericAction('pushTransaction', {
  //       action: 'stakefio',
  //       account: 'fio.staking',
  //       data: {
  //         fio_address: userC.address,
  //         amount: stakeAmt,
  //         actor: userC.account,
  //         max_fee: config.api.stake_fio_tokens.fee,
  //         tpid: ''
  //       }
  //     });
  //     wait(1000); //3000);
  //     bundles = await getBundleCount(userC.sdk);
  //   }
  //   console.log('done');
  //   bundles = await getBundleCount(userC.sdk);
  //   expect(bundles).to.equal(0);
  // });


  it(`consume user1's remaining bundled transactions`, async () => {
    try {
      await consumeRemainingBundles(userC, userB);
    } catch (err) {
      expect(err).to.equal(null);
    } finally {
      let bundleCount = await getBundleCount(userC.sdk);
      expect(bundleCount).to.equal(0);
    }
  });


  it(`attempt to stake with max_fee = 1 and 0 bundles remaining, expect Error 400 Fee exceeds supplied maximum`, async () => {
    let bal = await userC.sdk.genericAction('getFioBalance', {});
    try {
      const result = await userC.sdk.genericAction('pushTransaction', {
        action: 'stakefio',
        account: 'fio.staking',
        data: {
          fio_address: userC.address,
          amount: stakeAmt,
          actor: userC.account,
          max_fee: 1,
          tpid:'casey@dapixdev'
        }
      });
      expect(result.status).to.not.equal('OK');

    } catch (err) {
      let newBal = await userC.sdk.genericAction('getFioBalance', {});
      expect(newBal.staked).to.equal(bal.staked);
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.errorCode).to.equal(400);
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.json.fields[0].error).to.equal('Fee exceeds supplied maximum.');
    }
  });

  it(`userA stakes ${stakeAmt} FIO`, async () => {
    const stake = await userA.sdk.genericAction('pushTransaction', {
      action: 'stakefio',
      account: 'fio.staking',
      data: {
        fio_address: '',
        amount: stakeAmt,
        actor: userA.account,
        max_fee: config.api.stake_fio_tokens.fee,
        tpid: ''
      }
    });
    expect(stake).to.have.all.keys('block_num', 'fee_collected', 'status', 'transaction_id');
    expect(stake.status).to.equal('OK');
    expect(stake.fee_collected).to.equal(3000000000);
  });

  it(`attempt to unstake with max_fee 1 and bundles remaining, expect OK status`, async () => {
    let bal = await userA.sdk.genericAction('getFioBalance', {});
    let bundles = await getBundleCount(userA.sdk);
    expect(bal.staked).to.equal(stakeAmt);

    const result = await userA.sdk.genericAction('pushTransaction', {
      action: 'unstakefio',
      account: 'fio.staking',
      data:{
        fio_address: userA.address,
        amount: unstakeAmt,
        actor: userA.account,
        max_fee: 1,
        tpid:'casey@dapixdev'
      }
    });
    expect(result).to.have.all.keys('block_num', 'fee_collected', 'status', 'transaction_id');
    expect(result.status).to.equal('OK');
    let newBal = await userA.sdk.genericAction('getFioBalance', {});
    let newBundles = await getBundleCount(userA.sdk);
    expect(newBundles).to.equal(bundles - 1);
    expect(newBal.staked).to.equal(bal.staked - unstakeAmt);
  });

  it(`attempt to unstake with max_fee 1 and 0 bundles remaining, expect Error 400 Fee exceeds supplied maximum`, async () => {
    let bal = await userC.sdk.genericAction('getFioBalance', {});
    let bundles = await getBundleCount(userC.sdk);
    try {
      const result = await userC.sdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data:{
          fio_address: userC.address,
          amount: unstakeAmt,
          actor: userC.account,
          max_fee: 1,
          tpid:'casey@dapixdev'
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      let newBal = await userC.sdk.genericAction('getFioBalance', {});
      let newBundles = await getBundleCount(userC.sdk);
      expect(newBundles).to.equal(bundles);
      expect(newBal.staked).to.equal(bal.staked);
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.errorCode).to.equal(400);
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.json.fields[0].error).to.equal('Fee exceeds supplied maximum.');
    }
  });
});

describe(`G1. Stake and unstake a single FIO`, () => {
  let bp1, bp2, bp3, userA, userB, userC, userP, prevFundsAmount, locksdk, keys, accountnm, newFioDomain1, newFioAddress1, newFioDomain2, newFioAddress2, total_bp_votes, total_voted_fio;
  const fundsAmount = 1000000000000;
  const transferAmt = 100000000000;
  const stakeAmt = 1000000000;
  const unstakeAmt = 1000000000;

  before(async () => {
    // Create sdk objects for the orinigal localhost BPs
    bp1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
    bp2 = await existingUser('hfdg2qumuvlc', '5JnhMxfnLhZeRCRvCUsaHbrvPSxaqjkQAgw4ZFodx4xXyhZbC9P', 'FIO7uTisye5w2hgrCSE1pJhBKHfqDzhvqDJJ4U3vN9mbYWzataS2b', 'dapixdev', 'bp2@dapixdev');
    bp3 = await existingUser('wttywsmdmfew', '5JvmPVxPxypQEKPwFZQW4Vx7EC8cDYzorVhSWZvuYVFMccfi5mU', 'FIO6oa5UV9ghWgYH9en8Cv8dFcAxnZg2i9z9gKbnHahciuKNRPyHc', 'dapixdev', 'bp3@dapixdev');
    //create a user and give it 10k fio.
    userA = await newUser(faucet);
    userB = await newUser(faucet);
    userC = await newUser(faucet);
    userP = await newUser(faucet);
    keys = await createKeypair();

    accountnm =  await getAccountFromKey(keys.publicKey);
    await faucet.genericAction('pushTransaction', {
      action: 'trnsloctoks',
      account: 'fio.token',
      data: {
        payee_public_key: keys.publicKey,
        can_vote: 0,
        periods: [
          {
            duration: 120,
            amount: 5000000000000,
          },
          {
            duration: 180,
            amount: 4000000000000,
          },
          {
            duration: 1204800,
            amount: 1000000000000,
          }
        ],
        amount: 10000000000000,
        max_fee: 400000000000,
        tpid: '',
        actor: 'qhh25sqpktwh',
      }
    });
    locksdk = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson);

    // transfer some test FIO
    await userA.sdk.genericAction('transferTokens', {
      payeeFioPublicKey: keys.publicKey,
      amount: fundsAmount,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      tpid: '',
    });

    await locksdk.genericAction('transferTokens', {
      payeeFioPublicKey: userA.publicKey,
      amount: transferAmt,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    });

    // register our proxy
    await userP.sdk.genericAction('pushTransaction', {
      action: 'regproxy',
      account: 'eosio',
      data: {
        fio_address: userP.address,
        actor: userP.account,
        max_fee: config.api.register_proxy.fee
      }
    });

    // proxy first so userA can stake
    await userA.sdk.genericAction('pushTransaction', {
      action: 'voteproxy',
      account: 'eosio',
      data: {
        proxy: userP.address,
        fio_address: userA.address,
        actor: userA.account,
        max_fee: config.api.proxy_vote.fee
      }
    });
  });

  it(`stake 1 FIO from userA`, async () => {
    let bal, newBal, stakedTokenPool, combinedTokenPool, globalSrpCount, newStakedTokenPool, newCombinedTokenPool, newGlobalSrpCount;
    stakedTokenPool = await getStakedTokenPool();
    combinedTokenPool = await getCombinedTokenPool();
    globalSrpCount = await getGlobalSrpCount();
    bal = await userA.sdk.genericAction('getFioBalance', { });
    expect(bal.staked).to.equal(0);

    const result = await userA.sdk.genericAction('pushTransaction', {
      action: 'stakefio',
      account: 'fio.staking',
      data: {
        fio_address: userA.address,
        amount: stakeAmt,
        actor: userA.account,
        max_fee: config.api.stake_fio_tokens.fee,
        tpid: userP.address
      }
    });

    newBal = await userA.sdk.genericAction('getFioBalance', { });
    newStakedTokenPool = await getStakedTokenPool();
    newCombinedTokenPool = await getCombinedTokenPool();
    newGlobalSrpCount = await getGlobalSrpCount();

    expect(result).to.have.all.keys('block_num', 'fee_collected', 'status', 'transaction_id');
    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(0);
    expect(newBal.staked - bal.staked).to.equal(stakeAmt);
    expect(newStakedTokenPool).to.be.greaterThan(stakedTokenPool);
    expect(newStakedTokenPool - stakedTokenPool).to.equal(stakeAmt);
    expect(newCombinedTokenPool - combinedTokenPool).to.equal(stakeAmt);
    expect(newGlobalSrpCount - globalSrpCount).to.equal(stakeAmt * 2);
  });

  it(`call get_table_rows from locktokensv2 and confirm: no periods added`, async () => {
    const json = {
      json: true,
      code: 'eosio',
      scope: 'eosio',
      table: 'locktokensv2',
      lower_bound: userA.account,
      upper_bound: userA.account,
      key_type: 'i64',
      index_position: '2'
    }
    const result = await callFioApi("get_table_rows", json);
    expect(result.rows.length).to.equal(0);
  });

  it(`wait ${SECONDSPERDAY} seconds`, async () => {
    await timeout(SECONDSPERDAY * 1000);
  })

  it(`unstake 1 FIO (unstake_fio_tokens) from userA, expect status=OK and fee_collected=0`, async () => {
    let bal, newBal, bundleCount, stakedTokenPool, combinedTokenPool, globalSrpCount, newStakedTokenPool, newCombinedTokenPool, newGlobalSrpCount;
    stakedTokenPool = await getStakedTokenPool();
    combinedTokenPool = await getCombinedTokenPool();
    globalSrpCount = await getGlobalSrpCount();
    bal = await userA.sdk.genericAction('getFioBalance', {});

    const result = await userA.sdk.genericAction('pushTransaction', {
      action: 'unstakefio',
      account: 'fio.staking',
      data: {
        fio_address: userA.address,
        amount: unstakeAmt,
        actor: userA.account,
        max_fee: config.api.unstake_fio_tokens.fee,
        tpid: ''
      }
    });

    newStakedTokenPool = await getStakedTokenPool();
    newCombinedTokenPool = await getCombinedTokenPool();
    newGlobalSrpCount = await getGlobalSrpCount();
    newBal = await userA.sdk.genericAction('getFioBalance', {});

    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(0);
    expect(bal.staked - newBal.staked).to.equal(unstakeAmt);
    expect(newStakedTokenPool).to.be.lessThan(stakedTokenPool);
    expect(stakedTokenPool - newStakedTokenPool).to.equal(unstakeAmt);
    expect(combinedTokenPool - newCombinedTokenPool).to.equal(unstakeAmt);
    expect(globalSrpCount - newGlobalSrpCount).to.equal(unstakeAmt * 2);
  });

  it(`call get_table_rows from locktokensv2 and confirm: 1 period added`, async () => {
    const json = {
      json: true,
      code: 'eosio',
      scope: 'eosio',
      table: 'locktokensv2',
      lower_bound: userA.account,
      upper_bound: userA.account,
      key_type: 'i64',
      index_position: '2'
    }
    const result = await callFioApi("get_table_rows", json);

    expect(result.rows.length).to.equal(1);
    expect(result.rows[0].remaining_lock_amount).to.equal(unstakeAmt);
    expect(result.rows[0].payouts_performed).to.equal(0);
    expect(result.rows[0].periods.length).to.equal(1);
    expect(result.rows[0].periods[0].amount).to.equal(unstakeAmt);
    expect(result.rows[0].periods[0].duration).is.greaterThanOrEqual(UNSTAKELOCKDURATIONSECONDS);
  });

  it(`consume remaining bundled transactions`, async () => {
    try {
      await consumeRemainingBundles(userA, userP);
    } catch (err) {
      expect(err).to.equal(null);
    } finally {
      let bundleCount = await getBundleCount(userA.sdk);
      expect(bundleCount).to.equal(0);
    }
  });

  it(`stake another 1 FIO from userA`, async () => {
    let bal, newBal, stakedTokenPool, combinedTokenPool, globalSrpCount, newStakedTokenPool, newCombinedTokenPool, newGlobalSrpCount;
    stakedTokenPool = await getStakedTokenPool();
    combinedTokenPool = await getCombinedTokenPool();
    globalSrpCount = await getGlobalSrpCount();
    bal = await userA.sdk.genericAction('getFioBalance', { });
    expect(bal.staked).to.equal(0);

    const result = await userA.sdk.genericAction('pushTransaction', {
      action: 'stakefio',
      account: 'fio.staking',
      data: {
        fio_address: userA.address,
        amount: stakeAmt,
        actor: userA.account,
        max_fee: config.api.stake_fio_tokens.fee,
        tpid: userP.address
      }
    });

    newBal = await userA.sdk.genericAction('getFioBalance', { });
    newStakedTokenPool = await getStakedTokenPool();
    newCombinedTokenPool = await getCombinedTokenPool();
    newGlobalSrpCount = await getGlobalSrpCount();

    expect(result).to.have.all.keys('block_num', 'fee_collected', 'status', 'transaction_id');
    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(config.api.stake_fio_tokens.fee);
    expect(newBal.staked - bal.staked).to.equal(stakeAmt);
    expect(newStakedTokenPool).to.be.greaterThan(stakedTokenPool);
    expect(newStakedTokenPool - stakedTokenPool).to.equal(stakeAmt);
    expect(newCombinedTokenPool - combinedTokenPool).to.equal(1750000000);
    expect(newGlobalSrpCount - globalSrpCount).to.equal(stakeAmt * 2);
  });

  it(`(zero bundles left) unstake 1 FIO from userA, expect Status=OK and fee_collected=${config.api.unstake_fio_tokens.fee}`, async () => {
    let bal, newBal, stakedTokenPool, combinedTokenPool, globalSrpCount, newStakedTokenPool, newCombinedTokenPool, newGlobalSrpCount;
    stakedTokenPool = await getStakedTokenPool();
    combinedTokenPool = await getCombinedTokenPool();
    globalSrpCount = await getGlobalSrpCount();
    bal = await userA.sdk.genericAction('getFioBalance', {});

    const result = await userA.sdk.genericAction('pushTransaction', {
      action: 'unstakefio',
      account: 'fio.staking',
      data: {
        fio_address: userA.address,
        amount: unstakeAmt,
        actor: userA.account,
        max_fee: config.api.unstake_fio_tokens.fee,
        tpid: ''
      }
    });

    newStakedTokenPool = await getStakedTokenPool();
    newCombinedTokenPool = await getCombinedTokenPool();
    newGlobalSrpCount = await getGlobalSrpCount();
    newBal = await userA.sdk.genericAction('getFioBalance', {});

    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(config.api.unstake_fio_tokens.fee);
    expect(bal.staked - newBal.staked).to.equal(unstakeAmt);
    expect(newStakedTokenPool).to.be.lessThan(stakedTokenPool);
    expect(stakedTokenPool - newStakedTokenPool).to.equal(unstakeAmt);
    expect(combinedTokenPool - newCombinedTokenPool).to.equal(250000000);
    expect(globalSrpCount - newGlobalSrpCount).to.equal(unstakeAmt * 2);
  });

  it(`call get_table_rows from locktokensv2 and confirm: 2 periods added`, async () => {
    const json = {
      json: true,
      code: 'eosio',
      scope: 'eosio',
      table: 'locktokensv2',
      lower_bound: userA.account,
      upper_bound: userA.account,
      key_type: 'i64',
      index_position: '2'
    }
    const result = await callFioApi("get_table_rows", json);

    expect(result.rows.length).to.equal(1);
    expect(result.rows[0].remaining_lock_amount).to.equal(unstakeAmt * 2);
    expect(result.rows[0].payouts_performed).to.equal(0);
    expect(result.rows[0].periods.length).to.equal(2);
    expect(result.rows[0].periods[0].amount).to.equal(unstakeAmt);
    expect(result.rows[0].periods[1].amount).to.equal(unstakeAmt);
    expect(result.rows[0].periods[0].duration).is.greaterThanOrEqual(UNSTAKELOCKDURATIONSECONDS);
    // expect(result.rows[0].periods[1].duration).is.greaterThanOrEqual(UNSTAKELOCKDURATIONSECONDS + 10);
  });
});

describe(`G2. Stake and unstake an unreasonably samll (sub-FIO) denomination of tokens`, () => {
  let bp1, bp2, bp3, userA, userB, userC, userP, prevFundsAmount, locksdk, keys, accountnm, newFioDomain1, newFioAddress1, newFioDomain2, newFioAddress2, total_bp_votes, total_voted_fio;
  const fundsAmount = 1000000000000;
  const transferAmt = 100000000000;
  const stakeAmt = 1;
  const unstakeAmt = 1;
  const stakeB = 10000000000;

  before(async () => {
    // Create sdk objects for the orinigal localhost BPs
    bp1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
    bp2 = await existingUser('hfdg2qumuvlc', '5JnhMxfnLhZeRCRvCUsaHbrvPSxaqjkQAgw4ZFodx4xXyhZbC9P', 'FIO7uTisye5w2hgrCSE1pJhBKHfqDzhvqDJJ4U3vN9mbYWzataS2b', 'dapixdev', 'bp2@dapixdev');
    bp3 = await existingUser('wttywsmdmfew', '5JvmPVxPxypQEKPwFZQW4Vx7EC8cDYzorVhSWZvuYVFMccfi5mU', 'FIO6oa5UV9ghWgYH9en8Cv8dFcAxnZg2i9z9gKbnHahciuKNRPyHc', 'dapixdev', 'bp3@dapixdev');
    //create a user and give it 10k fio.
    userA = await newUser(faucet);
    userB = await newUser(faucet);
    userC = await newUser(faucet);
    userP = await newUser(faucet);
    keys = await createKeypair();

    accountnm =  await getAccountFromKey(keys.publicKey);
    await faucet.genericAction('pushTransaction', {
      action: 'trnsloctoks',
      account: 'fio.token',
      data: {
        payee_public_key: keys.publicKey,
        can_vote: 0,
        periods: [
          {
            duration: 120,
            amount: 5000000000000,
          },
          {
            duration: 180,
            amount: 4000000000000,
          },
          {
            duration: 1204800,
            amount: 1000000000000,
          }
        ],
        amount: 10000000000000,
        max_fee: 400000000000,
        tpid: '',
        actor: 'qhh25sqpktwh',
      }
    });
    locksdk = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson);

    // transfer some test FIO
    await userA.sdk.genericAction('transferTokens', {
      payeeFioPublicKey: keys.publicKey,
      amount: fundsAmount,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      tpid: '',
    });

    await locksdk.genericAction('transferTokens', {
      payeeFioPublicKey: userA.publicKey,
      amount: transferAmt,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    });

    // register our proxy
    await userP.sdk.genericAction('pushTransaction', {
      action: 'regproxy',
      account: 'eosio',
      data: {
        fio_address: userP.address,
        actor: userP.account,
        max_fee: config.api.register_proxy.fee
      }
    });

    // proxy first so userA can stake
    await userA.sdk.genericAction('pushTransaction', {
      action: 'voteproxy',
      account: 'eosio',
      data: {
        proxy: userP.address,
        fio_address: userA.address,
        actor: userA.account,
        max_fee: config.api.proxy_vote.fee
      }
    });
  });

  it(`stake 1 SUF from userA`, async () => {
    let bal, newBal, stakedTokenPool, combinedTokenPool, globalSrpCount, newStakedTokenPool, newCombinedTokenPool, newGlobalSrpCount;
    stakedTokenPool = await getStakedTokenPool();
    combinedTokenPool = await getCombinedTokenPool();
    globalSrpCount = await getGlobalSrpCount();
    bal = await userA.sdk.genericAction('getFioBalance', { });
    expect(bal.staked).to.equal(0);

    const result = await userA.sdk.genericAction('pushTransaction', {
      action: 'stakefio',
      account: 'fio.staking',
      data: {
        fio_address: userA.address,
        amount: stakeAmt,
        actor: userA.account,
        max_fee: config.api.stake_fio_tokens.fee,
        tpid: userP.address
      }
    });

    newBal = await userA.sdk.genericAction('getFioBalance', { });
    newStakedTokenPool = await getStakedTokenPool();
    newCombinedTokenPool = await getCombinedTokenPool();
    newGlobalSrpCount = await getGlobalSrpCount();

    expect(result).to.have.all.keys('block_num', 'fee_collected', 'status', 'transaction_id');
    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(0);
    expect(newBal.staked - bal.staked).to.equal(stakeAmt);
    expect(newStakedTokenPool).to.be.greaterThan(stakedTokenPool);
    expect(newStakedTokenPool - stakedTokenPool).to.equal(stakeAmt);
    expect(newCombinedTokenPool - combinedTokenPool).to.equal(stakeAmt);
    expect(newGlobalSrpCount - globalSrpCount).to.equal(stakeAmt * 2);
  });

  it(`call get_table_rows from locktokensv2 and confirm: no periods added`, async () => {
    const json = {
      json: true,
      code: 'eosio',
      scope: 'eosio',
      table: 'locktokensv2',
      lower_bound: userA.account,
      upper_bound: userA.account,
      key_type: 'i64',
      index_position: '2'
    }
    const result = await callFioApi("get_table_rows", json);
    expect(result.rows.length).to.equal(0);
  });

  it(`wait ${SECONDSPERDAY} seconds`, async () => {
    await timeout(SECONDSPERDAY * 1000);
  })

  it(`(unhappy) unstake 1 SUF (unstake_fio_tokens) from userA, expect Error Invalid amount value`, async () => {
    let bal, newBal, bundleCount, stakedTokenPool, combinedTokenPool, globalSrpCount, newStakedTokenPool, newCombinedTokenPool, newGlobalSrpCount;
    stakedTokenPool = await getStakedTokenPool();
    combinedTokenPool = await getCombinedTokenPool();
    globalSrpCount = await getGlobalSrpCount();
    bal = await userA.sdk.genericAction('getFioBalance', { });

    try {
      const result = await userA.sdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: userA.address,
          amount: unstakeAmt,
          actor: userA.account,
          max_fee: config.api.unstake_fio_tokens.fee,
          tpid: ''
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      newBal = await userA.sdk.genericAction('getFioBalance', { });
      newStakedTokenPool = await getStakedTokenPool();
      newCombinedTokenPool = await getCombinedTokenPool();
      newGlobalSrpCount = await getGlobalSrpCount();

      expect(newBal.available).to.equal(bal.available);
      expect(newStakedTokenPool).to.equal(stakedTokenPool);
      expect(newCombinedTokenPool).to.equal(combinedTokenPool);
      expect(newGlobalSrpCount).to.equal(globalSrpCount);

      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].error).to.equal('Invalid amount value');
    }
  });

  it(`call get_table_rows from locktokensv2 and confirm: no periods added`, async () => {
    const json = {
      json: true,
      code: 'eosio',
      scope: 'eosio',
      table: 'locktokensv2',
      lower_bound: userA.account,
      upper_bound: userA.account,
      key_type: 'i64',
      index_position: '2'
    }
    const result = await callFioApi("get_table_rows", json);
    expect(result.rows.length).to.equal(0);
  });

  it(`consume remaining bundled transactions`, async () => {
    try {
      await consumeRemainingBundles(userA, userP);
    } catch (err) {
      expect(err).to.equal(null);
    } finally {
      let bundleCount = await getBundleCount(userA.sdk);
      expect(bundleCount).to.equal(0);
    }
  });

  it(`stake another 1 SUF from userA`, async () => {
    let bal, newBal, stakedTokenPool, combinedTokenPool, globalSrpCount, newStakedTokenPool, newCombinedTokenPool,
      newGlobalSrpCount;
    stakedTokenPool = await getStakedTokenPool();
    combinedTokenPool = await getCombinedTokenPool();
    globalSrpCount = await getGlobalSrpCount();
    bal = await userA.sdk.genericAction('getFioBalance', {});
    // expect(bal.staked).to.equal(0);
    // try {
    const result = await userA.sdk.genericAction('pushTransaction', {
      action: 'stakefio',
      account: 'fio.staking',
      data: {
        fio_address: userA.address,
        amount: stakeAmt,
        actor: userA.account,
        max_fee: config.api.stake_fio_tokens.fee,
        tpid: userP.address
      }
    });
    newBal = await userA.sdk.genericAction('getFioBalance', {});
    newStakedTokenPool = await getStakedTokenPool();
    newCombinedTokenPool = await getCombinedTokenPool();
    newGlobalSrpCount = await getGlobalSrpCount();
    expect(result).to.have.all.keys('block_num', 'fee_collected', 'status', 'transaction_id');
    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(config.api.stake_fio_tokens.fee);
    expect(newBal.staked - bal.staked).to.equal(stakeAmt);
    expect(newStakedTokenPool).to.be.greaterThan(stakedTokenPool);
    expect(newStakedTokenPool - stakedTokenPool).to.equal(stakeAmt);
    expect(newCombinedTokenPool - combinedTokenPool).to.equal(750000001);
    expect(newGlobalSrpCount - globalSrpCount).to.equal(stakeAmt * 2);
    // } catch (err) {
    //   expect(err).to.equal(null);
    // }
  });

  it(`(unhappy)(zero bundles left) unstake 1 SUF from userA, expect Error Invalid amount value`, async () => {
    let bal, newBal, stakedTokenPool, combinedTokenPool, globalSrpCount, newStakedTokenPool, newCombinedTokenPool, newGlobalSrpCount;
    stakedTokenPool = await getStakedTokenPool();
    combinedTokenPool = await getCombinedTokenPool();
    globalSrpCount = await getGlobalSrpCount();
    bal = await userA.sdk.genericAction('getFioBalance', {});

    try{
      const result = await userA.sdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: userA.address,
          amount: unstakeAmt,
          actor: userA.account,
          max_fee: config.api.unstake_fio_tokens.fee,
          tpid: ''
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      newBal = await userA.sdk.genericAction('getFioBalance', { });
      newStakedTokenPool = await getStakedTokenPool();
      newCombinedTokenPool = await getCombinedTokenPool();
      newGlobalSrpCount = await getGlobalSrpCount();

      expect(newBal.available).to.equal(bal.available);
      expect(newStakedTokenPool).to.equal(stakedTokenPool);
      expect(newCombinedTokenPool).to.equal(combinedTokenPool);
      expect(newGlobalSrpCount).to.equal(globalSrpCount);

      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].error).to.equal('Invalid amount value');
    }
  });

  it(`stake 10000000000 SUF from userB`, async () => {
    let bal, newBal, stakedTokenPool, combinedTokenPool, globalSrpCount, newStakedTokenPool, newCombinedTokenPool, newGlobalSrpCount;
    stakedTokenPool = await getStakedTokenPool();
    combinedTokenPool = await getCombinedTokenPool();
    globalSrpCount = await getGlobalSrpCount();
    bal = await userB.sdk.genericAction('getFioBalance', { });
    expect(bal.staked).to.equal(0);

    const result = await userB.sdk.genericAction('pushTransaction', {
      action: 'stakefio',
      account: 'fio.staking',
      data: {
        fio_address: userB.address,
        amount: stakeB,
        actor: userB.account,
        max_fee: config.api.stake_fio_tokens.fee,
        tpid: userP.address
      }
    });

    newBal = await userB.sdk.genericAction('getFioBalance', { });
    newStakedTokenPool = await getStakedTokenPool();
    newCombinedTokenPool = await getCombinedTokenPool();
    newGlobalSrpCount = await getGlobalSrpCount();

    expect(result).to.have.all.keys('block_num', 'fee_collected', 'status', 'transaction_id');
    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(0);
    expect(newBal.staked - bal.staked).to.equal(stakeB);
    expect(newStakedTokenPool).to.be.greaterThan(stakedTokenPool);
    expect(newStakedTokenPool).to.equal(stakedTokenPool + stakeB);
    expect(newCombinedTokenPool).to.equal(combinedTokenPool + stakeB);
    expect(newGlobalSrpCount).to.equal(globalSrpCount + (stakeB * 2));
  });

  it(`(unhappy) unstake 9999 SUF (unstake_fio_tokens) from userB, expect Error Invalid amount value`, async () => {
    let bal, newBal, bundleCount, stakedTokenPool, combinedTokenPool, globalSrpCount, newStakedTokenPool, newCombinedTokenPool, newGlobalSrpCount;
    // stakedTokenPool = await getStakedTokenPool();
    // combinedTokenPool = await getCombinedTokenPool();
    // globalSrpCount = await getGlobalSrpCount();
    // bal = await userB.sdk.genericAction('getFioBalance', {});

    try {
      const result = await userB.sdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: userB.address,
          amount: 9999,
          actor: userB.account,
          max_fee: config.api.unstake_fio_tokens.fee,
          tpid: ''
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      // newBal = await userA.sdk.genericAction('getFioBalance', { });
      // newStakedTokenPool = await getStakedTokenPool();
      // newCombinedTokenPool = await getCombinedTokenPool();
      // newGlobalSrpCount = await getGlobalSrpCount();

      // expect(newBal.available).to.equal(bal.available);
      // expect(newStakedTokenPool).to.equal(stakedTokenPool);
      // expect(newCombinedTokenPool).to.equal(combinedTokenPool);
      // expect(newGlobalSrpCount).to.equal(globalSrpCount);

      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].error).to.equal('Invalid amount value');
    }
  });

  it(`(unhappy) unstake 10000 SUF (unstake_fio_tokens) from userB, expect Error Invalid amount value`, async () => {
    let bal, newBal, bundleCount, stakedTokenPool, combinedTokenPool, globalSrpCount, newStakedTokenPool, newCombinedTokenPool, newGlobalSrpCount;
    // stakedTokenPool = await getStakedTokenPool();
    // combinedTokenPool = await getCombinedTokenPool();
    // globalSrpCount = await getGlobalSrpCount();
    // bal = await userB.sdk.genericAction('getFioBalance', {});

    try {
      const result = await userB.sdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: userB.address,
          amount: 10000,
          actor: userB.account,
          max_fee: config.api.unstake_fio_tokens.fee,
          tpid: ''
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      // newBal = await userA.sdk.genericAction('getFioBalance', { });
      // newStakedTokenPool = await getStakedTokenPool();
      // newCombinedTokenPool = await getCombinedTokenPool();
      // newGlobalSrpCount = await getGlobalSrpCount();
      //
      // expect(newBal.available).to.equal(bal.available);
      // expect(newStakedTokenPool).to.equal(stakedTokenPool);
      // expect(newCombinedTokenPool).to.equal(combinedTokenPool);
      // expect(newGlobalSrpCount).to.equal(globalSrpCount);

      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].error).to.equal('Invalid amount value');
    }
  });

  it(`unstake 10001 SUF (unstake_fio_tokens) from userB, expect status=OK and fee_collected=0`, async () => {
    let bal, newBal, bundleCount, stakedTokenPool, combinedTokenPool, globalSrpCount, newStakedTokenPool, newCombinedTokenPool, newGlobalSrpCount;
    stakedTokenPool = await getStakedTokenPool();
    combinedTokenPool = await getCombinedTokenPool();
    globalSrpCount = await getGlobalSrpCount();
    bal = await userB.sdk.genericAction('getFioBalance', {});
    let unstakeB = 10001;

    const result = await userB.sdk.genericAction('pushTransaction', {
      action: 'unstakefio',
      account: 'fio.staking',
      data: {
        fio_address: userB.address,
        amount: unstakeB,
        actor: userB.account,
        max_fee: config.api.unstake_fio_tokens.fee,
        tpid: ''
      }
    });

    newStakedTokenPool = await getStakedTokenPool();
    newCombinedTokenPool = await getCombinedTokenPool();
    newGlobalSrpCount = await getGlobalSrpCount();
    newBal = await userB.sdk.genericAction('getFioBalance', {});

    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(0);
    expect(newBal.staked).to.equal(bal.staked - unstakeB);
    expect(newStakedTokenPool).to.equal(stakedTokenPool - unstakeB);
    expect(newCombinedTokenPool).to.equal(combinedTokenPool - unstakeB);
    expect(newGlobalSrpCount).to.equal(globalSrpCount -(unstakeB * 2));
  });

  it(`consume remaining bundled transactions`, async () => {
    try {
      await consumeRemainingBundles(userB, userP);
    } catch (err) {
      expect(err).to.equal(null);
    } finally {
      let bundleCount = await getBundleCount(userB.sdk);
      expect(bundleCount).to.equal(0);
    }
  });

  it(`(zero bundles left) unstake 10001 SUF (unstake_fio_tokens) from userB, expect status=OK and fee_collected=${config.api.unstake_fio_tokens.fee}`, async () => {
    let bal, newBal, bundleCount, stakedTokenPool, combinedTokenPool, globalSrpCount, newStakedTokenPool, newCombinedTokenPool, newGlobalSrpCount;
    stakedTokenPool = await getStakedTokenPool();
    combinedTokenPool = await getCombinedTokenPool();
    globalSrpCount = await getGlobalSrpCount();
    bal = await userB.sdk.genericAction('getFioBalance', {});
    let unstakeB = 10001;

    const result = await userB.sdk.genericAction('pushTransaction', {
      action: 'unstakefio',
      account: 'fio.staking',
      data: {
        fio_address: userB.address,
        amount: unstakeB,
        actor: userB.account,
        max_fee: config.api.unstake_fio_tokens.fee,
        tpid: bp1.address
      }
    });

    newStakedTokenPool = await getStakedTokenPool();
    newCombinedTokenPool = await getCombinedTokenPool();
    newGlobalSrpCount = await getGlobalSrpCount();
    newBal = await userB.sdk.genericAction('getFioBalance', {});

    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(config.api.unstake_fio_tokens.fee);
    expect(newBal.staked).to.equal(bal.staked - unstakeB);
    expect(newStakedTokenPool).to.equal(stakedTokenPool - unstakeB);
    expect(newCombinedTokenPool).to.be.greaterThan(combinedTokenPool);
    expect(newGlobalSrpCount).to.equal(globalSrpCount -(unstakeB * 2));
  });
});

describe(`G3. Stake some FIO, then try to unstake an unreasonably small amount (1 SUF)`, () => {
  let bp1, bp2, bp3, userA, userB, userC, userP, prevFundsAmount, locksdk, keys, accountnm, newFioDomain1, newFioAddress1, newFioDomain2, newFioAddress2, total_bp_votes, total_voted_fio;
  const fundsAmount = 1000000000000;
  const transferAmt = 100000000000;
  const stakeAmt = 50000000000;
  const unstakeAmt = 1;

  before(async () => {
    // Create sdk objects for the orinigal localhost BPs
    bp1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
    bp2 = await existingUser('hfdg2qumuvlc', '5JnhMxfnLhZeRCRvCUsaHbrvPSxaqjkQAgw4ZFodx4xXyhZbC9P', 'FIO7uTisye5w2hgrCSE1pJhBKHfqDzhvqDJJ4U3vN9mbYWzataS2b', 'dapixdev', 'bp2@dapixdev');
    bp3 = await existingUser('wttywsmdmfew', '5JvmPVxPxypQEKPwFZQW4Vx7EC8cDYzorVhSWZvuYVFMccfi5mU', 'FIO6oa5UV9ghWgYH9en8Cv8dFcAxnZg2i9z9gKbnHahciuKNRPyHc', 'dapixdev', 'bp3@dapixdev');
    //create a user and give it 10k fio.
    userA = await newUser(faucet);
    userB = await newUser(faucet);
    userC = await newUser(faucet);
    userP = await newUser(faucet);
    keys = await createKeypair();

    accountnm =  await getAccountFromKey(keys.publicKey);
    await faucet.genericAction('pushTransaction', {
      action: 'trnsloctoks',
      account: 'fio.token',
      data: {
        payee_public_key: keys.publicKey,
        can_vote: 0,
        periods: [
          {
            duration: 120,
            amount: 5000000000000,
          },
          {
            duration: 180,
            amount: 4000000000000,
          },
          {
            duration: 1204800,
            amount: 1000000000000,
          }
        ],
        amount: 10000000000000,
        max_fee: 400000000000,
        tpid: '',
        actor: 'qhh25sqpktwh',
      }
    });
    locksdk = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson);

    // transfer some test FIO
    await userA.sdk.genericAction('transferTokens', {
      payeeFioPublicKey: keys.publicKey,
      amount: fundsAmount,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      tpid: '',
    });

    await locksdk.genericAction('transferTokens', {
      payeeFioPublicKey: userA.publicKey,
      amount: transferAmt,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    });

    // register our proxy
    await userP.sdk.genericAction('pushTransaction', {
      action: 'regproxy',
      account: 'eosio',
      data: {
        fio_address: userP.address,
        actor: userP.account,
        max_fee: config.api.register_proxy.fee
      }
    });

    // proxy first so userA can stake
    await userA.sdk.genericAction('pushTransaction', {
      action: 'voteproxy',
      account: 'eosio',
      data: {
        proxy: userP.address,
        fio_address: userA.address,
        actor: userA.account,
        max_fee: config.api.proxy_vote.fee
      }
    });
  });

  it(`stake 50 tokens from userA`, async () => {
    let bal, newBal, stakedTokenPool, combinedTokenPool, globalSrpCount, newStakedTokenPool, newCombinedTokenPool, newGlobalSrpCount;
    stakedTokenPool = await getStakedTokenPool();
    combinedTokenPool = await getCombinedTokenPool();
    globalSrpCount = await getGlobalSrpCount();
    bal = await userA.sdk.genericAction('getFioBalance', { });
    expect(bal.staked).to.equal(0);

    const result = await userA.sdk.genericAction('pushTransaction', {
      action: 'stakefio',
      account: 'fio.staking',
      data: {
        fio_address: userA.address,
        amount: stakeAmt,
        actor: userA.account,
        max_fee: config.api.stake_fio_tokens.fee,
        tpid: userP.address
      }
    });

    newBal = await userA.sdk.genericAction('getFioBalance', { });
    newStakedTokenPool = await getStakedTokenPool();
    newCombinedTokenPool = await getCombinedTokenPool();
    newGlobalSrpCount = await getGlobalSrpCount();

    expect(result).to.have.all.keys('block_num', 'fee_collected', 'status', 'transaction_id');
    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(0);
    expect(newBal.staked - bal.staked).to.equal(stakeAmt);
    expect(newStakedTokenPool).to.be.greaterThan(stakedTokenPool);
    expect(newStakedTokenPool - stakedTokenPool).to.equal(stakeAmt);
    expect(newCombinedTokenPool - combinedTokenPool).to.equal(stakeAmt);
    expect(newGlobalSrpCount - globalSrpCount).to.equal(stakeAmt * 2);
  });

  it(`call get_table_rows from locktokensv2 and confirm: no periods added`, async () => {
    const json = {
      json: true,
      code: 'eosio',
      scope: 'eosio',
      table: 'locktokensv2',
      lower_bound: userA.account,
      upper_bound: userA.account,
      key_type: 'i64',
      index_position: '2'
    }
    const result = await callFioApi("get_table_rows", json);
    expect(result.rows.length).to.equal(0);
  })

  it(`wait ${SECONDSPERDAY} seconds`, async () => {
    await timeout(SECONDSPERDAY * 1000);
  })

  it(`unstake 1 SUF (unstake_fio_tokens) from userA, expect Error: Invalid amount value`, async () => {
    let bundleCount, newBundleCount, bal, newBal, stakedTokenPool, combinedTokenPool, globalSrpCount, newStakedTokenPool, newCombinedTokenPool, newGlobalSrpCount;
    try {
      const result = await userA.sdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: userA.address,
          amount: unstakeAmt,
          actor: userA.account,
          max_fee: config.api.unstake_fio_tokens.fee,
          tpid: ''
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.errorCode).to.equal(400);
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.json.fields.length).to.be.greaterThan(0);
      expect(err.json.fields[0].error).to.equal('Invalid amount value');
    }
  });

  it(`call get_table_rows from locktokensv2 and confirm: no periods added`, async () => {
    const json = {
      json: true,
      code: 'eosio',
      scope: 'eosio',
      table: 'locktokensv2',
      lower_bound: userA.account,
      upper_bound: userA.account,
      key_type: 'i64',
      index_position: '2'
    }
    const result = await callFioApi("get_table_rows", json);
    expect(result.rows.length).to.equal(0);
  });

  it(`consume remaining bundled transactions`, async () => {
    try {
      await consumeRemainingBundles(userA, userP);
    } catch (err) {
      expect(err).to.equal(null);
    } finally {
      let bundleCount = await getBundleCount(userA.sdk);
      expect(bundleCount).to.equal(0);
    }
  });

  it(`(zero bundles left) unstake 1 SUF from userA, expect Error: Invalid amount value`, async () => {
    let bal, newBal, stakedTokenPool, combinedTokenPool, globalSrpCount, newStakedTokenPool, newCombinedTokenPool, newGlobalSrpCount;
    stakedTokenPool = await getStakedTokenPool();
    combinedTokenPool = await getCombinedTokenPool();
    globalSrpCount = await getGlobalSrpCount();
    bal = await userA.sdk.genericAction('getFioBalance', {});
    try {
      const result = await userA.sdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: userA.address,
          amount: unstakeAmt,
          actor: userA.account,
          max_fee: config.api.unstake_fio_tokens.fee,
          tpid: ''
        }
      });
      expect(result.status).to.equal('OK');
    } catch (err) {
      // expect(err).to.equal(null);
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.errorCode).to.equal(400);
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.json.fields.length).to.be.greaterThan(0);
      expect(err.json.fields[0].error).to.equal('Invalid amount value');
      // newStakedTokenPool = await getStakedTokenPool();
      // newCombinedTokenPool = await getCombinedTokenPool();
      // newGlobalSrpCount = await getGlobalSrpCount();
      // newBal = await userA.sdk.genericAction('getFioBalance', {});
      // expect(bal.staked).to.equal(newBal.staked);
      // expect(newStakedTokenPool).to.equal(stakedTokenPool);
      // expect(newCombinedTokenPool).to.equal(combinedTokenPool);
      // expect(newGlobalSrpCount).to.equal(globalSrpCount);
    }
  });

  it(`call get_table_rows from locktokensv2 and confirm: no periods added`, async () => {
    const json = {
      json: true,
      code: 'eosio',
      scope: 'eosio',
      table: 'locktokensv2',
      lower_bound: userA.account,
      upper_bound: userA.account,
      key_type: 'i64',
      index_position: '2'
    }
    const result = await callFioApi("get_table_rows", json);
    expect(result.rows.length).to.equal(0);
  });
});

describe(`G4. Stake some FIO, then try to unstake an unreasonably small amount (1 FIO)`, () => {
  let bp1, bp2, bp3, userA, userB, userC, userP, prevFundsAmount, locksdk, keys, accountnm, newFioDomain1, newFioAddress1, newFioDomain2, newFioAddress2, total_bp_votes, total_voted_fio;
  const fundsAmount = 1000000000000;
  const transferAmt = 100000000000;
  const stakeAmt = 50000000000;
  const unstakeAmt = 1000000000;

  before(async () => {
    // Create sdk objects for the orinigal localhost BPs
    bp1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
    bp2 = await existingUser('hfdg2qumuvlc', '5JnhMxfnLhZeRCRvCUsaHbrvPSxaqjkQAgw4ZFodx4xXyhZbC9P', 'FIO7uTisye5w2hgrCSE1pJhBKHfqDzhvqDJJ4U3vN9mbYWzataS2b', 'dapixdev', 'bp2@dapixdev');
    bp3 = await existingUser('wttywsmdmfew', '5JvmPVxPxypQEKPwFZQW4Vx7EC8cDYzorVhSWZvuYVFMccfi5mU', 'FIO6oa5UV9ghWgYH9en8Cv8dFcAxnZg2i9z9gKbnHahciuKNRPyHc', 'dapixdev', 'bp3@dapixdev');
    //create a user and give it 10k fio.
    userA = await newUser(faucet);
    userB = await newUser(faucet);
    userC = await newUser(faucet);
    userP = await newUser(faucet);
    keys = await createKeypair();

    accountnm =  await getAccountFromKey(keys.publicKey);
    await faucet.genericAction('pushTransaction', {
      action: 'trnsloctoks',
      account: 'fio.token',
      data: {
        payee_public_key: keys.publicKey,
        can_vote: 0,
        periods: [
          {
            duration: 120,
            amount: 5000000000000,
          },
          {
            duration: 180,
            amount: 4000000000000,
          },
          {
            duration: 1204800,
            amount: 1000000000000,
          }
        ],
        amount: 10000000000000,
        max_fee: 400000000000,
        tpid: '',
        actor: 'qhh25sqpktwh',
      }
    });
    locksdk = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson);

    // transfer some test FIO
    await userA.sdk.genericAction('transferTokens', {
      payeeFioPublicKey: keys.publicKey,
      amount: fundsAmount,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      tpid: '',
    });

    await locksdk.genericAction('transferTokens', {
      payeeFioPublicKey: userA.publicKey,
      amount: transferAmt,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    });

    // register our proxy
    await userP.sdk.genericAction('pushTransaction', {
      action: 'regproxy',
      account: 'eosio',
      data: {
        fio_address: userP.address,
        actor: userP.account,
        max_fee: config.api.register_proxy.fee
      }
    });

    // proxy first so userA can stake
    await userA.sdk.genericAction('pushTransaction', {
      action: 'voteproxy',
      account: 'eosio',
      data: {
        proxy: userP.address,
        fio_address: userA.address,
        actor: userA.account,
        max_fee: config.api.proxy_vote.fee
      }
    });
  });

  it(`stake 50 tokens from userA`, async () => {
    let bal, newBal, stakedTokenPool, combinedTokenPool, globalSrpCount, newStakedTokenPool, newCombinedTokenPool, newGlobalSrpCount;
    stakedTokenPool = await getStakedTokenPool();
    combinedTokenPool = await getCombinedTokenPool();
    globalSrpCount = await getGlobalSrpCount();
    bal = await userA.sdk.genericAction('getFioBalance', { });
    expect(bal.staked).to.equal(0);
    const result = await userA.sdk.genericAction('pushTransaction', {
      action: 'stakefio',
      account: 'fio.staking',
      data: {
        fio_address: userA.address,
        amount: stakeAmt,
        actor: userA.account,
        max_fee: config.api.stake_fio_tokens.fee,
        tpid: userP.address
      }
    });
    newBal = await userA.sdk.genericAction('getFioBalance', { });
    newStakedTokenPool = await getStakedTokenPool();
    newCombinedTokenPool = await getCombinedTokenPool();
    newGlobalSrpCount = await getGlobalSrpCount();
    expect(result).to.have.all.keys('block_num', 'fee_collected', 'status', 'transaction_id');
    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(0);
    expect(newBal.staked - bal.staked).to.equal(stakeAmt);
    expect(newStakedTokenPool).to.be.greaterThan(stakedTokenPool);
    expect(newStakedTokenPool - stakedTokenPool).to.equal(stakeAmt);
    expect(newCombinedTokenPool - combinedTokenPool).to.equal(stakeAmt);
    expect(newGlobalSrpCount - globalSrpCount).to.equal(stakeAmt * 2);
  });

  it(`call get_table_rows from locktokensv2 and confirm: no periods added`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'locktokensv2',
        lower_bound: userA.account,
        upper_bound: userA.account,
        key_type: 'i64',
        index_position: '2'
      }
      const result = await callFioApi("get_table_rows", json);
      console.log('Result: ', result);
      //console.log('periods : ', result.rows[0].periods)
      expect(result.rows.length).to.equal(0)
      // expect(result.rows[0].remaining_lock_amount).to.equal(unstakeAmt)
      // expect(result.rows[0].payouts_performed).to.equal(0)
      // expect(result.rows[0].periods[0].amount).to.equal(unstakeAmt)
      // expect(result.rows[0].periods[0].duration).is.greaterThanOrEqual(UNSTAKELOCKDURATIONSECONDS)  // Hard to know this. It is 7 days + the time that has elapsed since the original record was created (the timestamp)
      // lockDuration = result.rows[0].periods[0].duration  // Grab this to make sure it does not change later
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`wait ${SECONDSPERDAY} seconds`, async () => {
    await timeout(SECONDSPERDAY * 1000);
  })

  it(`unstake 1 FIO (unstake_fio_tokens) from userA, expect status=OK`, async () => {
    let bundleCount, newBundleCount, bal, newBal, stakedTokenPool, combinedTokenPool, globalSrpCount, newStakedTokenPool, newCombinedTokenPool, newGlobalSrpCount;
    bundleCount = await getBundleCount(userA.sdk);
    stakedTokenPool = await getStakedTokenPool();
    combinedTokenPool = await getCombinedTokenPool();
    globalSrpCount = await getGlobalSrpCount();
    bal = await userA.sdk.genericAction('getFioBalance', {});
    try {
      const result = await userA.sdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: userA.address,
          amount: unstakeAmt,
          actor: userA.account,
          max_fee: config.api.unstake_fio_tokens.fee,
          tpid: ''
        }
      });
      expect(result.status).to.equal('OK');
    } catch (err) {
      expect(err).to.equal(null);
      // expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      // expect(err.errorCode).to.equal(400);
      // expect(err.json).to.have.all.keys('type', 'message', 'fields');
      // expect(err.json.fields.length).to.be.greaterThan(0);
      // expect(err.json.fields[0].error).to.equal('Invalid amount value');
      // newStakedTokenPool = await getStakedTokenPool();
      // newCombinedTokenPool = await getCombinedTokenPool();
      // newGlobalSrpCount = await getGlobalSrpCount();
      // newBal = await userA.sdk.genericAction('getFioBalance', {});
      // newBundleCount = await getBundleCount(userA.sdk);
      // expect(newBundleCount).to.equal(bundleCount);
      // expect(bal.staked).to.equal(newBal.staked);
      // expect(newStakedTokenPool).to.equal(stakedTokenPool);
      // expect(newCombinedTokenPool).to.equal(combinedTokenPool);
      // expect(newGlobalSrpCount).to.equal(globalSrpCount);
    }
  });

  it(`call get_table_rows from locktokensv2 and confirm: no periods added`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'locktokensv2',
        lower_bound: userA.account,
        upper_bound: userA.account,
        key_type: 'i64',
        index_position: '2'
      }
      const result = await callFioApi("get_table_rows", json);
      // console.log('Result: ', result);
      //console.log('periods : ', result.rows[0].periods)
      expect(result.rows.length).to.equal(1)
      expect(result.rows[0].remaining_lock_amount).to.equal(unstakeAmt)
      expect(result.rows[0].payouts_performed).to.equal(0)
      expect(result.rows[0].periods[0].amount).to.equal(unstakeAmt)
      expect(result.rows[0].periods[0].duration).is.greaterThanOrEqual(UNSTAKELOCKDURATIONSECONDS)  // Hard to know this. It is 7 days + the time that has elapsed since the original record was created (the timestamp)
      // lockDuration = result.rows[0].periods[0].duration  // Grab this to make sure it does not change later
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`consume remaining bundled transactions`, async () => {
    try {
      await consumeRemainingBundles(userA, userP);
    } catch (err) {
      expect(err).to.equal(null);
    } finally {
      let bundleCount = await getBundleCount(userA.sdk);
      expect(bundleCount).to.equal(0);
    }
  });

  it(`stake 1 more FIO from userA`, async () => {
    let bal, newBal, stakedTokenPool, combinedTokenPool, globalSrpCount, newStakedTokenPool, newCombinedTokenPool, newGlobalSrpCount;
    let stakeAmt = 1000000000;
    stakedTokenPool = await getStakedTokenPool();
    combinedTokenPool = await getCombinedTokenPool();
    globalSrpCount = await getGlobalSrpCount();
    bal = await userA.sdk.genericAction('getFioBalance', { });
    // expect(bal.staked).to.equal(0);
    const result = await userA.sdk.genericAction('pushTransaction', {
      action: 'stakefio',
      account: 'fio.staking',
      data: {
        fio_address: userA.address,
        amount: stakeAmt,
        actor: userA.account,
        max_fee: config.api.stake_fio_tokens.fee,
        tpid: userP.address
      }
    });
    newBal = await userA.sdk.genericAction('getFioBalance', { });
    newStakedTokenPool = await getStakedTokenPool();
    newCombinedTokenPool = await getCombinedTokenPool();
    newGlobalSrpCount = await getGlobalSrpCount();
    expect(result).to.have.all.keys('block_num', 'fee_collected', 'status', 'transaction_id');
    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(config.api.stake_fio_tokens.fee);
    expect(newBal.staked - bal.staked).to.equal(1000000000);
    expect(newStakedTokenPool).to.be.greaterThan(stakedTokenPool);
    expect(newStakedTokenPool - stakedTokenPool).to.equal(1000000000);
    expect(newCombinedTokenPool - combinedTokenPool).to.equal(1750000000);
    expect(newGlobalSrpCount - globalSrpCount).to.equal(stakeAmt * 2);
  });

  it(`wait ${SECONDSPERDAY} seconds`, async () => {
    await timeout(SECONDSPERDAY * 1000);
  })

  it(`(zero bundles left) unstake 1 FIO from userA, expect status=OK, fee_collected=${config.api.unstake_fio_tokens.fee}`, async () => {
    let bal, newBal, stakedTokenPool, combinedTokenPool, globalSrpCount, newStakedTokenPool, newCombinedTokenPool, newGlobalSrpCount;
    stakedTokenPool = await getStakedTokenPool();
    combinedTokenPool = await getCombinedTokenPool();
    globalSrpCount = await getGlobalSrpCount();
    bal = await userA.sdk.genericAction('getFioBalance', {});

    const result = await userA.sdk.genericAction('pushTransaction', {
      action: 'unstakefio',
      account: 'fio.staking',
      data: {
        fio_address: userA.address,
        amount: unstakeAmt,
        actor: userA.account,
        max_fee: config.api.unstake_fio_tokens.fee,
        tpid: ''
      }
    });

    newStakedTokenPool = await getStakedTokenPool();
    newCombinedTokenPool = await getCombinedTokenPool();
    newGlobalSrpCount = await getGlobalSrpCount();
    newBal = await userA.sdk.genericAction('getFioBalance', {});

    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(config.api.unstake_fio_tokens.fee);
    expect(newBal.staked).to.equal(bal.staked - unstakeAmt);
    expect(newStakedTokenPool).to.equal(stakedTokenPool - unstakeAmt);
    expect(newCombinedTokenPool).to.be.lessThan(combinedTokenPool);
    expect(newGlobalSrpCount).to.equal(globalSrpCount -(unstakeAmt * 2));
  });
});

describe(`G5. Stake some FIO, then try to unstake an unreasonably small amount (999999999 SUF)`, () => {
  let bp1, bp2, bp3, userA, userB, userC, userP, prevFundsAmount, locksdk, keys, accountnm, newFioDomain1, newFioAddress1, newFioDomain2, newFioAddress2, total_bp_votes, total_voted_fio;
  const fundsAmount = 1000000000000;
  const transferAmt = 100000000000;
  const stakeAmt = 50000000000;
  const unstakeAmt = 999999999;

  before(async () => {
    // Create sdk objects for the orinigal localhost BPs
    bp1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
    bp2 = await existingUser('hfdg2qumuvlc', '5JnhMxfnLhZeRCRvCUsaHbrvPSxaqjkQAgw4ZFodx4xXyhZbC9P', 'FIO7uTisye5w2hgrCSE1pJhBKHfqDzhvqDJJ4U3vN9mbYWzataS2b', 'dapixdev', 'bp2@dapixdev');
    bp3 = await existingUser('wttywsmdmfew', '5JvmPVxPxypQEKPwFZQW4Vx7EC8cDYzorVhSWZvuYVFMccfi5mU', 'FIO6oa5UV9ghWgYH9en8Cv8dFcAxnZg2i9z9gKbnHahciuKNRPyHc', 'dapixdev', 'bp3@dapixdev');
    //create a user and give it 10k fio.
    userA = await newUser(faucet);
    userB = await newUser(faucet);
    userC = await newUser(faucet);
    userP = await newUser(faucet);
    keys = await createKeypair();

    accountnm =  await getAccountFromKey(keys.publicKey);
    await faucet.genericAction('pushTransaction', {
      action: 'trnsloctoks',
      account: 'fio.token',
      data: {
        payee_public_key: keys.publicKey,
        can_vote: 0,
        periods: [
          {
            duration: 120,
            amount: 5000000000000,
          },
          {
            duration: 180,
            amount: 4000000000000,
          },
          {
            duration: 1204800,
            amount: 1000000000000,
          }
        ],
        amount: 10000000000000,
        max_fee: 400000000000,
        tpid: '',
        actor: 'qhh25sqpktwh',
      }
    });
    locksdk = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson);

    // transfer some test FIO
    await userA.sdk.genericAction('transferTokens', {
      payeeFioPublicKey: keys.publicKey,
      amount: fundsAmount,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      tpid: '',
    });

    await locksdk.genericAction('transferTokens', {
      payeeFioPublicKey: userA.publicKey,
      amount: transferAmt,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    });

    // register our proxy
    await userP.sdk.genericAction('pushTransaction', {
      action: 'regproxy',
      account: 'eosio',
      data: {
        fio_address: userP.address,
        actor: userP.account,
        max_fee: config.api.register_proxy.fee
      }
    });

    // proxy first so userA can stake
    await userA.sdk.genericAction('pushTransaction', {
      action: 'voteproxy',
      account: 'eosio',
      data: {
        proxy: userP.address,
        fio_address: userA.address,
        actor: userA.account,
        max_fee: config.api.proxy_vote.fee
      }
    });
  });

  it(`stake 50 FIO from userA`, async () => {
    let bal, newBal, stakedTokenPool, combinedTokenPool, globalSrpCount, newStakedTokenPool, newCombinedTokenPool, newGlobalSrpCount;
    stakedTokenPool = await getStakedTokenPool();
    combinedTokenPool = await getCombinedTokenPool();
    globalSrpCount = await getGlobalSrpCount();
    bal = await userA.sdk.genericAction('getFioBalance', { });
    expect(bal.staked).to.equal(0);

    const result = await userA.sdk.genericAction('pushTransaction', {
      action: 'stakefio',
      account: 'fio.staking',
      data: {
        fio_address: userA.address,
        amount: stakeAmt,
        actor: userA.account,
        max_fee: config.api.stake_fio_tokens.fee,
        tpid: userP.address
      }
    });

    newBal = await userA.sdk.genericAction('getFioBalance', { });
    newStakedTokenPool = await getStakedTokenPool();
    newCombinedTokenPool = await getCombinedTokenPool();
    newGlobalSrpCount = await getGlobalSrpCount();

    expect(result).to.have.all.keys('block_num', 'fee_collected', 'status', 'transaction_id');
    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(0);
    expect(newBal.staked - bal.staked).to.equal(stakeAmt);
    expect(newStakedTokenPool).to.be.greaterThan(stakedTokenPool);
    expect(newStakedTokenPool - stakedTokenPool).to.equal(stakeAmt);
    expect(newCombinedTokenPool - combinedTokenPool).to.equal(stakeAmt);
    expect(newGlobalSrpCount - globalSrpCount).to.equal(stakeAmt * 2);
  });

  it(`call get_table_rows from locktokensv2 and confirm: no periods added`, async () => {
    const json = {
      json: true,
      code: 'eosio',
      scope: 'eosio',
      table: 'locktokensv2',
      lower_bound: userA.account,
      upper_bound: userA.account,
      key_type: 'i64',
      index_position: '2'
    }
    const result = await callFioApi("get_table_rows", json);
    expect(result.rows.length).to.equal(0);
  });

  it(`wait ${SECONDSPERDAY} seconds`, async () => {
    await timeout(SECONDSPERDAY * 1000);
  })

  it(`unstake 999999999 SUF (unstake_fio_tokens) from userA`, async () => { //, expect Error: Invalid amount value`, async () => {
    let bundleCount, newBundleCount, bal, newBal, stakedTokenPool, combinedTokenPool, globalSrpCount, newStakedTokenPool, newCombinedTokenPool, newGlobalSrpCount;
    // bundleCount = await getBundleCount(userA.sdk);
    stakedTokenPool = await getStakedTokenPool();
    combinedTokenPool = await getCombinedTokenPool();
    globalSrpCount = await getGlobalSrpCount();
    bal = await userA.sdk.genericAction('getFioBalance', {});

    const result = await userA.sdk.genericAction('pushTransaction', {
      action: 'unstakefio',
      account: 'fio.staking',
      data: {
        fio_address: userA.address,
        amount: unstakeAmt,
        actor: userA.account,
        max_fee: config.api.unstake_fio_tokens.fee,
        tpid: ''
      }
    });

    newBal = await userA.sdk.genericAction('getFioBalance', { });
    newStakedTokenPool = await getStakedTokenPool();
    newCombinedTokenPool = await getCombinedTokenPool();
    newGlobalSrpCount = await getGlobalSrpCount();

    expect(newBal.staked).to.equal(bal.staked - unstakeAmt);
    expect(newStakedTokenPool).to.equal(stakedTokenPool - unstakeAmt);
    expect(newCombinedTokenPool).to.equal(combinedTokenPool - unstakeAmt);
    expect(globalSrpCount - newGlobalSrpCount).to.equal(unstakeAmt * 2)
    expect(result.status).to.equal('OK');
  });

  it(`call get_table_rows from locktokensv2 and confirm: 1 period added`, async () => {
    const json = {
      json: true,
      code: 'eosio',
      scope: 'eosio',
      table: 'locktokensv2',
      lower_bound: userA.account,
      upper_bound: userA.account,
      key_type: 'i64',
      index_position: '2'
    }

    const result = await callFioApi("get_table_rows", json);

    expect(result.rows.length).to.equal(1);
    expect(result.rows[0].periods.length).to.equal(1);
    expect(result.rows[0].remaining_lock_amount).to.equal(unstakeAmt);
    expect(result.rows[0].payouts_performed).to.equal(0);
    expect(result.rows[0].periods[0].amount).to.equal(unstakeAmt);
    expect(result.rows[0].periods[0].duration).is.greaterThanOrEqual(UNSTAKELOCKDURATIONSECONDS);
  });

  it(`consume remaining bundled transactions`, async () => {
    try {
      await consumeRemainingBundles(userA, userP);
    } catch (err) {
      expect(err).to.equal(null);
    } finally {
      let bundleCount = await getBundleCount(userA.sdk);
      expect(bundleCount).to.equal(0);
    }
  });

  it(`(zero bundles left) unstake 999999999 SUF from userA`, async () => {
    let bal, newBal, stakedTokenPool, combinedTokenPool, globalSrpCount, newStakedTokenPool, newCombinedTokenPool, newGlobalSrpCount;
    stakedTokenPool = await getStakedTokenPool();
    combinedTokenPool = await getCombinedTokenPool();
    globalSrpCount = await getGlobalSrpCount();
    bal = await userA.sdk.genericAction('getFioBalance', {});
    try {
      const result = await userA.sdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: userA.address,
          amount: unstakeAmt,
          actor: userA.account,
          max_fee: config.api.unstake_fio_tokens.fee,
          tpid: ''
        }
      });
      newBal = await userA.sdk.genericAction('getFioBalance', { });
      newStakedTokenPool = await getStakedTokenPool();
      newCombinedTokenPool = await getCombinedTokenPool();
      newGlobalSrpCount = await getGlobalSrpCount();
      expect(newBal.staked).to.equal(bal.staked - unstakeAmt);
      expect(newStakedTokenPool).to.equal(stakedTokenPool - unstakeAmt);
      expect(newCombinedTokenPool).to.be.lessThanOrEqual(combinedTokenPool)// + unstakeAmt);
      expect(newCombinedTokenPool).to.be.lessThanOrEqual(combinedTokenPool + unstakeAmt)// + unstakeAmt);
      expect(globalSrpCount - newGlobalSrpCount).to.equal(unstakeAmt * 2)
      expect(result.status).to.equal('OK');
      expect(result.fee_collected).to.equal(config.api.unstake_fio_tokens.fee);
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it(`call get_table_rows from locktokensv2 and confirm: 2 periods added`, async () => {
    const json = {
      json: true,
      code: 'eosio',
      scope: 'eosio',
      table: 'locktokensv2',
      lower_bound: userA.account,
      upper_bound: userA.account,
      key_type: 'i64',
      index_position: '2'
    }
    const result = await callFioApi("get_table_rows", json);

    expect(result.rows.length).to.equal(1);
    expect(result.rows[0].periods.length).to.equal(2);
    expect(result.rows[0].remaining_lock_amount).to.equal(unstakeAmt * 2);
    expect(result.rows[0].payouts_performed).to.equal(0);
    expect(result.rows[0].periods[0].amount).to.equal(unstakeAmt);
    expect(result.rows[0].periods[1].amount).to.equal(unstakeAmt);
    expect(result.rows[0].periods[0].duration).is.greaterThanOrEqual(UNSTAKELOCKDURATIONSECONDS);
    // expect(result.rows[0].periods[1].duration).is.greaterThanOrEqual(UNSTAKELOCKDURATIONSECONDS + 10);
  });
});

describe(`G6. Stake some FIO, then try to unstake an unreasonably small amount (1000000001 SUF)`, () => {
  let bp1, bp2, bp3, userA, userB, userC, userP, prevFundsAmount, locksdk, keys, accountnm, newFioDomain1, newFioAddress1, newFioDomain2, newFioAddress2, total_bp_votes, total_voted_fio;
  const fundsAmount = 1000000000000;
  const transferAmt = 100000000000;
  const stakeAmt = 50000000000;
  const unstakeAmt = 1000000001;

  before(async () => {
    // Create sdk objects for the orinigal localhost BPs
    bp1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
    bp2 = await existingUser('hfdg2qumuvlc', '5JnhMxfnLhZeRCRvCUsaHbrvPSxaqjkQAgw4ZFodx4xXyhZbC9P', 'FIO7uTisye5w2hgrCSE1pJhBKHfqDzhvqDJJ4U3vN9mbYWzataS2b', 'dapixdev', 'bp2@dapixdev');
    bp3 = await existingUser('wttywsmdmfew', '5JvmPVxPxypQEKPwFZQW4Vx7EC8cDYzorVhSWZvuYVFMccfi5mU', 'FIO6oa5UV9ghWgYH9en8Cv8dFcAxnZg2i9z9gKbnHahciuKNRPyHc', 'dapixdev', 'bp3@dapixdev');
    //create a user and give it 10k fio.
    userA = await newUser(faucet);
    userB = await newUser(faucet);
    userC = await newUser(faucet);
    userP = await newUser(faucet);
    keys = await createKeypair();

    accountnm =  await getAccountFromKey(keys.publicKey);
    await faucet.genericAction('pushTransaction', {
      action: 'trnsloctoks',
      account: 'fio.token',
      data: {
        payee_public_key: keys.publicKey,
        can_vote: 0,
        periods: [
          {
            duration: 120,
            amount: 5000000000000,
          },
          {
            duration: 180,
            amount: 4000000000000,
          },
          {
            duration: 1204800,
            amount: 1000000000000,
          }
        ],
        amount: 10000000000000,
        max_fee: 400000000000,
        tpid: '',
        actor: 'qhh25sqpktwh',
      }
    });
    locksdk = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson);

    // transfer some test FIO
    await userA.sdk.genericAction('transferTokens', {
      payeeFioPublicKey: keys.publicKey,
      amount: fundsAmount,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      tpid: '',
    });

    await locksdk.genericAction('transferTokens', {
      payeeFioPublicKey: userA.publicKey,
      amount: transferAmt,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    });

    // register our proxy
    await userP.sdk.genericAction('pushTransaction', {
      action: 'regproxy',
      account: 'eosio',
      data: {
        fio_address: userP.address,
        actor: userP.account,
        max_fee: config.api.register_proxy.fee
      }
    });

    // proxy first so userA can stake
    await userA.sdk.genericAction('pushTransaction', {
      action: 'voteproxy',
      account: 'eosio',
      data: {
        proxy: userP.address,
        fio_address: userA.address,
        actor: userA.account,
        max_fee: config.api.proxy_vote.fee
      }
    });
  });

  it(`stake 50 FIO from userA`, async () => {
    let bal, newBal, stakedTokenPool, combinedTokenPool, globalSrpCount, newStakedTokenPool, newCombinedTokenPool, newGlobalSrpCount;
    stakedTokenPool = await getStakedTokenPool();
    combinedTokenPool = await getCombinedTokenPool();
    globalSrpCount = await getGlobalSrpCount();
    bal = await userA.sdk.genericAction('getFioBalance', { });
    expect(bal.staked).to.equal(0);

    const result = await userA.sdk.genericAction('pushTransaction', {
      action: 'stakefio',
      account: 'fio.staking',
      data: {
        fio_address: userA.address,
        amount: stakeAmt,
        actor: userA.account,
        max_fee: config.api.stake_fio_tokens.fee,
        tpid: userP.address
      }
    });

    newBal = await userA.sdk.genericAction('getFioBalance', { });
    newStakedTokenPool = await getStakedTokenPool();
    newCombinedTokenPool = await getCombinedTokenPool();
    newGlobalSrpCount = await getGlobalSrpCount();

    expect(result).to.have.all.keys('block_num', 'fee_collected', 'status', 'transaction_id');
    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(0);
    expect(newBal.staked - bal.staked).to.equal(stakeAmt);
    expect(newStakedTokenPool).to.be.greaterThan(stakedTokenPool);
    expect(newStakedTokenPool - stakedTokenPool).to.equal(stakeAmt);
    expect(newCombinedTokenPool - combinedTokenPool).to.equal(stakeAmt);
    expect(newGlobalSrpCount - globalSrpCount).to.equal(stakeAmt * 2);
  });

  it(`call get_table_rows from locktokensv2 and confirm: no periods added`, async () => {
    const json = {
      json: true,
      code: 'eosio',
      scope: 'eosio',
      table: 'locktokensv2',
      lower_bound: userA.account,
      upper_bound: userA.account,
      key_type: 'i64',
      index_position: '2'
    }
    const result = await callFioApi("get_table_rows", json);
    expect(result.rows.length).to.equal(0);
  })

  it(`wait ${SECONDSPERDAY} seconds`, async () => {
    await timeout(SECONDSPERDAY * 1000);
  })

  it(`unstake 1000000001 SUF (unstake_fio_tokens) from userA, expect Error: Invalid amount value`, async () => {
    let bundleCount, newBundleCount, bal, newBal, stakedTokenPool, combinedTokenPool, globalSrpCount, newStakedTokenPool, newCombinedTokenPool, newGlobalSrpCount;
    bundleCount = await getBundleCount(userA.sdk);
    stakedTokenPool = await getStakedTokenPool();
    combinedTokenPool = await getCombinedTokenPool();
    globalSrpCount = await getGlobalSrpCount();
    bal = await userA.sdk.genericAction('getFioBalance', {});

    const result = await userA.sdk.genericAction('pushTransaction', {
      action: 'unstakefio',
      account: 'fio.staking',
      data: {
        fio_address: userA.address,
        amount: unstakeAmt,
        actor: userA.account,
        max_fee: config.api.unstake_fio_tokens.fee,
        tpid: ''
      }
    });

    newBal = await userA.sdk.genericAction('getFioBalance', { });
    newStakedTokenPool = await getStakedTokenPool();
    newCombinedTokenPool = await getCombinedTokenPool();
    newGlobalSrpCount = await getGlobalSrpCount();

    expect(newBal.staked).to.equal(bal.staked - unstakeAmt);
    expect(newStakedTokenPool).to.equal(stakedTokenPool - unstakeAmt);
    expect(newCombinedTokenPool).to.equal(combinedTokenPool - unstakeAmt);
    expect(globalSrpCount - newGlobalSrpCount).to.equal(unstakeAmt * 2)
    expect(result.status).to.equal('OK');
  });

  it(`call get_table_rows from locktokensv2 and confirm: 1 period added`, async () => {
    const json = {
      json: true,
      code: 'eosio',
      scope: 'eosio',
      table: 'locktokensv2',
      lower_bound: userA.account,
      upper_bound: userA.account,
      key_type: 'i64',
      index_position: '2'
    }

    const result = await callFioApi("get_table_rows", json);

    expect(result.rows.length).to.equal(1);
    expect(result.rows[0].periods.length).to.equal(1);
    expect(result.rows[0].remaining_lock_amount).to.equal(unstakeAmt);
    expect(result.rows[0].payouts_performed).to.equal(0);
    expect(result.rows[0].periods[0].amount).to.equal(unstakeAmt);
    expect(result.rows[0].periods[0].duration).is.greaterThanOrEqual(UNSTAKELOCKDURATIONSECONDS);
  })

  it(`consume remaining bundled transactions`, async () => {
    try {
      await consumeRemainingBundles(userA, userP);
    } catch (err) {
      expect(err).to.equal(null);
    } finally {
      let bundleCount = await getBundleCount(userA.sdk);
      expect(bundleCount).to.equal(0);
    }
  });

  it(`(zero bundles left) unstake 1000000001 SUF from userA`, async () => {
    let bal, newBal, stakedTokenPool, combinedTokenPool, globalSrpCount, newStakedTokenPool, newCombinedTokenPool, newGlobalSrpCount;
    stakedTokenPool = await getStakedTokenPool();
    combinedTokenPool = await getCombinedTokenPool();
    globalSrpCount = await getGlobalSrpCount();
    bal = await userA.sdk.genericAction('getFioBalance', {});

    const result = await userA.sdk.genericAction('pushTransaction', {
      action: 'unstakefio',
      account: 'fio.staking',
      data: {
        fio_address: userA.address,
        amount: unstakeAmt,
        actor: userA.account,
        max_fee: config.api.unstake_fio_tokens.fee,
        tpid: ''
      }
    });

    newBal = await userA.sdk.genericAction('getFioBalance', { });
    newStakedTokenPool = await getStakedTokenPool();
    newCombinedTokenPool = await getCombinedTokenPool();
    newGlobalSrpCount = await getGlobalSrpCount();

    expect(newBal.staked).to.equal(bal.staked - unstakeAmt);
    expect(newStakedTokenPool).to.equal(stakedTokenPool - unstakeAmt);
    expect(newCombinedTokenPool).to.be.lessThanOrEqual(combinedTokenPool)// + unstakeAmt);
    expect(newCombinedTokenPool).to.be.lessThanOrEqual(combinedTokenPool + unstakeAmt)// + unstakeAmt);
    expect(globalSrpCount - newGlobalSrpCount).to.equal(unstakeAmt * 2)
    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(config.api.unstake_fio_tokens.fee);
  });

  it(`call get_table_rows from locktokensv2 and confirm: 2 periods added`, async () => {
    const json = {
      json: true,
      code: 'eosio',
      scope: 'eosio',
      table: 'locktokensv2',
      lower_bound: userA.account,
      upper_bound: userA.account,
      key_type: 'i64',
      index_position: '2'
    }
    const result = await callFioApi("get_table_rows", json);

    expect(result.rows.length).to.equal(1);
    expect(result.rows[0].periods.length).to.equal(2);
    expect(result.rows[0].remaining_lock_amount).to.equal(unstakeAmt * 2);
    expect(result.rows[0].payouts_performed).to.equal(0);
    expect(result.rows[0].periods[0].amount).to.equal(unstakeAmt);
    expect(result.rows[0].periods[1].amount).to.equal(unstakeAmt);
    expect(result.rows[0].periods[0].duration).is.greaterThanOrEqual(UNSTAKELOCKDURATIONSECONDS);
    // expect(result.rows[0].periods[1].duration).is.greaterThanOrEqual(UNSTAKELOCKDURATIONSECONDS + 10);
  });
});

describe(`H. Malicious staking actions`, () => {
  let bp1, bp2, bp3, userA, userB, userC, userP, prevFundsAmount, locksdk, keys, accountnm, newFioDomain1, newFioAddress1, newFioDomain2, newFioAddress2, total_bp_votes, total_voted_fio;
  const fundsAmount = 1000000000000;
  const transferAmt = 100000000000;
  const stakeAmt = 50000000000;

  before(async () => {
    // Create sdk objects for the orinigal localhost BPs
    bp1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
    bp2 = await existingUser('hfdg2qumuvlc', '5JnhMxfnLhZeRCRvCUsaHbrvPSxaqjkQAgw4ZFodx4xXyhZbC9P', 'FIO7uTisye5w2hgrCSE1pJhBKHfqDzhvqDJJ4U3vN9mbYWzataS2b', 'dapixdev', 'bp2@dapixdev');
    bp3 = await existingUser('wttywsmdmfew', '5JvmPVxPxypQEKPwFZQW4Vx7EC8cDYzorVhSWZvuYVFMccfi5mU', 'FIO6oa5UV9ghWgYH9en8Cv8dFcAxnZg2i9z9gKbnHahciuKNRPyHc', 'dapixdev', 'bp3@dapixdev');
    //create a user and give it 10k fio.
    userA = await newUser(faucet);
    userB = await newUser(faucet);
    userC = await newUser(faucet);
    userP = await newUser(faucet);
    keys = await createKeypair();

    accountnm =  await getAccountFromKey(keys.publicKey);
    await faucet.genericAction('pushTransaction', {
      action: 'trnsloctoks',
      account: 'fio.token',
      data: {
        payee_public_key: keys.publicKey,
        can_vote: 0,
        periods: [
          {
            duration: 120,
            amount: 5000000000000,
          },
          {
            duration: 180,
            amount: 4000000000000,
          },
          {
            duration: 1204800,
            amount: 1000000000000,
          }
        ],
        amount: 10000000000000,
        max_fee: 400000000000,
        tpid: '',
        actor: 'qhh25sqpktwh',
      }
    });
    locksdk = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson);

    // transfer some test FIO
    await userA.sdk.genericAction('transferTokens', {
      payeeFioPublicKey: keys.publicKey,
      amount: fundsAmount,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      tpid: '',
    });

    await locksdk.genericAction('transferTokens', {
      payeeFioPublicKey: userA.publicKey,
      amount: transferAmt,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    });

    // register our proxy
    await userP.sdk.genericAction('pushTransaction', {
      action: 'regproxy',
      account: 'eosio',
      data: {
        fio_address: userP.address,
        actor: userP.account,
        max_fee: config.api.register_proxy.fee
      }
    });

    // proxy first so userA can stake
    await userA.sdk.genericAction('pushTransaction', {
      action: 'voteproxy',
      account: 'eosio',
      data: {
        proxy: userP.address,
        fio_address: userA.address,
        actor: userA.account,
        max_fee: config.api.proxy_vote.fee
      }
    });
  });

  it(`(malicious) userB try to stake some FIO belonging to userA, expect Error`, async () => {
    try {
      const result = await userB.sdk.genericAction('pushTransaction', {
        action: 'stakefio',
        account: 'fio.staking',
        data: {
          fio_address: userA.address,
          amount: stakeAmt,
          actor: userA.account,
          max_fee: config.api.stake_fio_tokens.fee,
          tpid: userP.address
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.errorCode).to.equal(500);
      expect(err.json.error.what).to.equal('Missing required authority');
      expect(err.json.error.details[0].message).to.equal(`missing authority of ${userA.account}`);
    }
  });

  it(`(malicious) userB try to proxy first, then stake some FIO belonging to userA, expect Error`, async () => {
    // proxy first
    await userB.sdk.genericAction('pushTransaction', {
      action: 'voteproxy',
      account: 'eosio',
      data: {
        proxy: userP.address,
        fio_address: userB.address,
        actor: userB.account,
        max_fee: config.api.proxy_vote.fee
      }
    });

    try {
      const result = await userB.sdk.genericAction('pushTransaction', {
        action: 'stakefio',
        account: 'fio.staking',
        data: {
          fio_address: userA.address,
          amount: stakeAmt,
          actor: userA.account,
          max_fee: config.api.stake_fio_tokens.fee,
          tpid: userP.address
        }
      });
    } catch (err) {
      expect(err.errorCode).to.equal(500);
      expect(err.json.error.what).to.equal('Missing required authority');
      expect(err.json.error.details[0].message).to.equal(`missing authority of ${userA.account}`);
    }
  });
});

describe(`I. Malicious unstaking actions`, () => {
  let bp1, bp2, bp3, userA, userB, userC, userP, prevFundsAmount, locksdk, keys, accountnm, newFioDomain1, newFioAddress1, newFioDomain2, newFioAddress2, total_bp_votes, total_voted_fio;
  const fundsAmount = 1000000000000;
  const transferAmt = 100000000000;
  const stakeAmt = 50000000000;
  const unstakeAmt = 25000000000;

  before(async () => {
    // Create sdk objects for the orinigal localhost BPs
    bp1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
    bp2 = await existingUser('hfdg2qumuvlc', '5JnhMxfnLhZeRCRvCUsaHbrvPSxaqjkQAgw4ZFodx4xXyhZbC9P', 'FIO7uTisye5w2hgrCSE1pJhBKHfqDzhvqDJJ4U3vN9mbYWzataS2b', 'dapixdev', 'bp2@dapixdev');
    bp3 = await existingUser('wttywsmdmfew', '5JvmPVxPxypQEKPwFZQW4Vx7EC8cDYzorVhSWZvuYVFMccfi5mU', 'FIO6oa5UV9ghWgYH9en8Cv8dFcAxnZg2i9z9gKbnHahciuKNRPyHc', 'dapixdev', 'bp3@dapixdev');
    //create a user and give it 10k fio.
    userA = await newUser(faucet);
    userB = await newUser(faucet);
    userC = await newUser(faucet);
    userP = await newUser(faucet);
    keys = await createKeypair();

    accountnm =  await getAccountFromKey(keys.publicKey);
    await faucet.genericAction('pushTransaction', {
      action: 'trnsloctoks',
      account: 'fio.token',
      data: {
        payee_public_key: keys.publicKey,
        can_vote: 0,
        periods: [
          {
            duration: 120,
            amount: 5000000000000,
          },
          {
            duration: 180,
            amount: 4000000000000,
          },
          {
            duration: 1204800,
            amount: 1000000000000,
          }
        ],
        amount: 10000000000000,
        max_fee: 400000000000,
        tpid: '',
        actor: 'qhh25sqpktwh',
      }
    });
    locksdk = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson);

    // transfer some test FIO
    await userA.sdk.genericAction('transferTokens', {
      payeeFioPublicKey: keys.publicKey,
      amount: fundsAmount,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      tpid: '',
    });

    await locksdk.genericAction('transferTokens', {
      payeeFioPublicKey: userA.publicKey,
      amount: transferAmt,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    });

    // register our proxy
    await userP.sdk.genericAction('pushTransaction', {
      action: 'regproxy',
      account: 'eosio',
      data: {
        fio_address: userP.address,
        actor: userP.account,
        max_fee: config.api.register_proxy.fee
      }
    });

    // proxy first so userA can stake
    await userA.sdk.genericAction('pushTransaction', {
      action: 'voteproxy',
      account: 'eosio',
      data: {
        proxy: userP.address,
        fio_address: userA.address,
        actor: userA.account,
        max_fee: config.api.proxy_vote.fee
      }
    });

    // stake some FIO
    await userA.sdk.genericAction('pushTransaction', {
      action: 'stakefio',
      account: 'fio.staking',
      data: {
        fio_address: '',
        amount: stakeAmt,
        actor: userA.account,
        max_fee: config.api.stake_fio_tokens.fee,
        tpid: userP.address
      }
    });
  });

  it(`(malicious) userB try to unstake FIO from userA, expect Error`, async () => {
    try {
      const result = await userB.sdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: userA.address,
          amount: unstakeAmt,
          actor: userA.account,
          max_fee: config.api.unstake_fio_tokens.fee,
          tpid: bp1.address
        }
      });
    } catch (err) {
      expect(err.errorCode).to.equal(500);
      expect(err.json.error.what).to.equal('Missing required authority');
      expect(err.json.error.details[0].message).to.equal(`missing authority of ${userA.account}`);
    }
  })

  it(`(malicious) userB try to proxy first, then unstake FIO staked by userA, expect Error`, async () => {
    // proxy first
    await userB.sdk.genericAction('pushTransaction', {
      action: 'voteproxy',
      account: 'eosio',
      data: {
        proxy: userP.address,
        fio_address: userB.address,
        actor: userB.account,
        max_fee: config.api.proxy_vote.fee
      }
    });

    try {
      const result = await userB.sdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: userA.address,
          amount: unstakeAmt,
          actor: userA.account,
          max_fee: config.api.unstake_fio_tokens.fee,
          tpid: bp1.address
        }
      });
    } catch (err) {
      expect(err.errorCode).to.equal(500);
      expect(err.json.error.what).to.equal('Missing required authority');
      expect(err.json.error.details[0].message).to.equal(`missing authority of ${userA.account}`);
    }
  })
});

describe(`J. (BD-2991) Verify staking rewards when unstaking with TPID vs without`, () => {
  let bp1, bp2, bp3, userA, userB, userC, userP, prevFundsAmount, locksdk, keys, accountnm, newFioDomain1, newFioAddress1, newFioDomain2, newFioAddress2, total_bp_votes, total_voted_fio;
  const fundsAmount = 1000000000000;
  const transferAmt = 100000000000;
  const stakeAmt = 500000000000;
  const unstakeAmt = 100000000000;
  let tpidBalance;

  before(async () => {
    // Create sdk objects for the orinigal localhost BPs
    bp1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
    bp2 = await existingUser('hfdg2qumuvlc', '5JnhMxfnLhZeRCRvCUsaHbrvPSxaqjkQAgw4ZFodx4xXyhZbC9P', 'FIO7uTisye5w2hgrCSE1pJhBKHfqDzhvqDJJ4U3vN9mbYWzataS2b', 'dapixdev', 'bp2@dapixdev');
    bp3 = await existingUser('wttywsmdmfew', '5JvmPVxPxypQEKPwFZQW4Vx7EC8cDYzorVhSWZvuYVFMccfi5mU', 'FIO6oa5UV9ghWgYH9en8Cv8dFcAxnZg2i9z9gKbnHahciuKNRPyHc', 'dapixdev', 'bp3@dapixdev');
    //create a user and give it 10k fio.
    userA = await newUser(faucet);
    userB = await newUser(faucet);
    userC = await newUser(faucet);
    userP = await newUser(faucet);
    keys = await createKeypair();

    accountnm =  await getAccountFromKey(keys.publicKey);
    await faucet.genericAction('pushTransaction', {
      action: 'trnsloctoks',
      account: 'fio.token',
      data: {
        payee_public_key: keys.publicKey,
        can_vote: 0,
        periods: [
          {
            duration: 120,
            amount: 5000000000000,
          },
          {
            duration: 180,
            amount: 4000000000000,
          },
          {
            duration: 1204800,
            amount: 1000000000000,
          }
        ],
        amount: 10000000000000,
        max_fee: 400000000000,
        tpid: '',
        actor: 'qhh25sqpktwh',
      }
    });
    locksdk = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson);

    // transfer some test FIO
    await userA.sdk.genericAction('transferTokens', {
      payeeFioPublicKey: keys.publicKey,
      amount: fundsAmount,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      tpid: '',
    });

    await locksdk.genericAction('transferTokens', {
      payeeFioPublicKey: userA.publicKey,
      amount: transferAmt,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    });

    // register our proxy
    await userP.sdk.genericAction('pushTransaction', {
      action: 'regproxy',
      account: 'eosio',
      data: {
        fio_address: userP.address,
        actor: userP.account,
        max_fee: config.api.register_proxy.fee
      }
    });

    // proxy first so userA can stake
    await userA.sdk.genericAction('pushTransaction', {
      action: 'voteproxy',
      account: 'eosio',
      data: {
        proxy: userP.address,
        fio_address: userA.address,
        actor: userA.account,
        max_fee: config.api.proxy_vote.fee
      }
    });
  });

  it(`stake 500 tokens from userA`, async () => {
    let balA, newBalA, stakedTokenPool, combinedTokenPool, globalSrpCount, newStakedTokenPool, newCombinedTokenPool, newGlobalSrpCount;
    stakedTokenPool = await getStakedTokenPool();
    combinedTokenPool = await getCombinedTokenPool();
    globalSrpCount = await getGlobalSrpCount();
    balA = await userA.sdk.genericAction('getFioBalance', { });
    expect(balA.staked).to.equal(0);

    const result = await userA.sdk.genericAction('pushTransaction', {
      action: 'stakefio',
      account: 'fio.staking',
      data: {
        fio_address: userA.address,
        amount: stakeAmt,
        actor: userA.account,
        max_fee: config.api.stake_fio_tokens.fee,
        tpid: bp1.address
      }
    });

    newBalA = await userA.sdk.genericAction('getFioBalance', { });
    newStakedTokenPool = await getStakedTokenPool();
    newCombinedTokenPool = await getCombinedTokenPool();
    newGlobalSrpCount = await getGlobalSrpCount();

    expect(result).to.have.all.keys('block_num', 'fee_collected', 'status', 'transaction_id');
    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(0);
    expect(newBalA.staked).to.equal(balA.staked + stakeAmt);
    expect(newStakedTokenPool).to.equal(stakedTokenPool + stakeAmt);
    expect(newCombinedTokenPool).to.equal(combinedTokenPool + stakeAmt);
    expect(newGlobalSrpCount - globalSrpCount).to.equal(stakeAmt * 2);
  });

  it(`getFioBalance for bp1`, async () => {
    const result = await bp1.sdk.genericAction('getFioBalance', {});
    tpidBalance = result;
  });

  it(`unstake 100 tokens (unstake_fio_tokens) with a valid TPID from userA`, async () => {
    let bal, newBal, stakedTokenPool, combinedTokenPool, globalSrpCount, newStakedTokenPool, newCombinedTokenPool, newGlobalSrpCount;
    stakedTokenPool = await getStakedTokenPool();
    combinedTokenPool = await getCombinedTokenPool();
    globalSrpCount = await getGlobalSrpCount();
    bal = await userA.sdk.genericAction('getFioBalance', {});

    const result = await userA.sdk.genericAction('pushTransaction', {
      action: 'unstakefio',
      account: 'fio.staking',
      data: {
        fio_address: userA.address,
        amount: unstakeAmt,
        actor: userA.account,
        max_fee: config.api.unstake_fio_tokens.fee,
        tpid: bp1.address
      }
    });

    newStakedTokenPool = await getStakedTokenPool();
    newCombinedTokenPool = await getCombinedTokenPool();
    newGlobalSrpCount = await getGlobalSrpCount();
    newBal = await userA.sdk.genericAction('getFioBalance', {});

    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(0);
    expect(bal.staked - newBal.staked).to.equal(unstakeAmt);
    expect(newStakedTokenPool).to.be.lessThan(stakedTokenPool);
    expect(stakedTokenPool - newStakedTokenPool).to.equal(unstakeAmt);
    expect(combinedTokenPool - newCombinedTokenPool).to.equal(unstakeAmt);
    expect(globalSrpCount - newGlobalSrpCount).to.equal(unstakeAmt * 2);
  });

  it(`getFioBalance for bp1`, async () => {
    const result = await bp1.sdk.genericAction('getFioBalance', {});
    console.log(result);
  });

  it(`unstake 100 tokens (unstake_fio_tokens) with NO valid TPID from userA`, async () => {
    let bal, newBal, stakedTokenPool, combinedTokenPool, globalSrpCount, newStakedTokenPool, newCombinedTokenPool, newGlobalSrpCount;
    stakedTokenPool = await getStakedTokenPool();
    combinedTokenPool = await getCombinedTokenPool();
    globalSrpCount = await getGlobalSrpCount();
    bal = await userA.sdk.genericAction('getFioBalance', {});

    const result = await userA.sdk.genericAction('pushTransaction', {
      action: 'unstakefio',
      account: 'fio.staking',
      data: {
        fio_address: userA.address,
        amount: unstakeAmt,
        actor: userA.account,
        max_fee: config.api.unstake_fio_tokens.fee,
        tpid: ''
      }
    });

    newStakedTokenPool = await getStakedTokenPool();
    newCombinedTokenPool = await getCombinedTokenPool();
    newGlobalSrpCount = await getGlobalSrpCount();
    newBal = await userA.sdk.genericAction('getFioBalance', {});

    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(0);
    expect(bal.staked - newBal.staked).to.equal(unstakeAmt);
    expect(newStakedTokenPool).to.be.lessThan(stakedTokenPool);
    expect(stakedTokenPool - newStakedTokenPool).to.equal(unstakeAmt);
    expect(combinedTokenPool - newCombinedTokenPool).to.equal(unstakeAmt);
    expect(globalSrpCount - newGlobalSrpCount).to.equal(unstakeAmt * 2);
  });

  it(`getFioBalance for bp1`, async () => {
    const result = await bp1.sdk.genericAction('getFioBalance', {});
    console.log(result);
  });
});
