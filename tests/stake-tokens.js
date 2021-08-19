require('mocha');
const {expect} = require('chai');
const {newUser, existingUser, getAccountFromKey, fetchJson, generateFioDomain, generateFioAddress, createKeypair, getTotalVotedFio, getProdVoteTotal, callFioApi} = require('../utils.js');
const {FIOSDK} = require('@fioprotocol/fiosdk');
const config = require('../config.js');
const {getStakedTokenPool, getCombinedTokenPool, getGlobalSrpCount} = require('./Helpers/token-pool.js');
let faucet;

function wait(ms){
  var start = new Date().getTime();
  var end = start;
  while(end < start + ms) {
    end = new Date().getTime();
  }
}

async function getBundleCount(user) {
  const result = await user.genericAction('getFioNames', { fioPublicKey: user.publicKey });
  return result.fio_addresses[0].remaining_bundled_tx;
}

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
});

describe(`************************** stake-tokens.js ************************** \n    A. Test staking and unstaking various amounts of tokens, including locked tokens.`, () => {
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
    // console.log("priv key ", keys.privateKey);
    // console.log("pub key ", keys.publicKey);
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

  it(`transfer 100 tokens to account A`, async () => {
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

  it(`transfer 100 tokens to account B`, async () => {
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

  it(`transfer 100 tokens to account C`, async () => {
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

  it(`Register domain for voting for account C `, async () => {
    newFioDomain1 = generateFioDomain(15);
    let bal = await userC.sdk.genericAction('getFioBalance', {});
    const result = await userC.sdk.genericAction('registerFioDomain', {
      fioDomain: newFioDomain1,
      maxFee: config.api.register_fio_domain.fee,
      tpid: '',
    });
    let newBal = await userC.sdk.genericAction('getFioBalance', {});
    expect(result).to.have.all.keys('status', 'expiration', 'fee_collected');
    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(config.api.register_fio_domain.fee);
    expect(bal.available - newBal.available).to.equal(config.api.register_fio_domain.fee);
  });

  it(`Register address for voting for account C`, async () => {
    newFioAddress1 = generateFioAddress(newFioDomain1,15)
    let bal = await userC.sdk.genericAction('getFioBalance', {});
    const result = await userC.sdk.genericAction('registerFioAddress', {
      fioAddress: newFioAddress1,
      maxFee: config.api.register_fio_address.fee,
      tpid: '',
    });
    let newBal = await userC.sdk.genericAction('getFioBalance', {});
    expect(result).to.have.all.keys('status', 'expiration', 'fee_collected');
    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(config.api.register_fio_address.fee);
    expect(bal.available - newBal.available).to.equal(config.api.register_fio_address.fee);
  });

  it(`account C votes for bp1@dapixdev`, async () => {
    let totalBeforeVote = await getTotalVotedFio();
    const result = await userC.sdk.genericAction('pushTransaction', {
      action: 'voteproducer',
      account: 'eosio',
      data: {
        producers: [bp1.address],
        fio_address: newFioAddress1,
        actor: accountnm,
        max_fee: config.api.vote_producer.fee
      }
    });
    expect(result).to.have.all.keys('status', 'fee_collected');
    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(0);
    // after vote
    let totalAfterVote = await getTotalVotedFio()
    expect(totalAfterVote).to.be.greaterThan(totalBeforeVote);
  });

  it(`transfer 100 tokens to account P`, async () => {
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

  it(`register a FIO address for account P`, async () => {
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
    expect(result).to.have.all.keys('status', 'expiration', 'fee_collected');
    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(config.api.register_fio_address.fee);

    // make the domain public
    const result2 = await userP.sdk.genericAction('setFioDomainVisibility', {
      fioDomain: userP.domain,
      isPublic: true,
      maxFee: config.api.set_fio_domain_public.fee,
      technologyProviderId: ''
    });
    expect(result2).to.have.all.keys('status', 'fee_collected');
    expect(result2.status).to.be.a('string').and.equal('OK');
    expect(result2.fee_collected).to.be.a('number').and.equal(config.api.set_fio_domain_public.fee);
  });

  it(`register account P as proxy`, async () => {
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
    expect(result).to.have.all.keys('status', 'fee_collected');
    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(config.api.register_proxy.fee);
    expect(bal.available - newBal.available).to.equal(config.api.register_proxy.fee);
  });

  it(`run add_pub_address for account A with account P's FIO address as TPID`, async () => {
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
    expect(result).to.have.all.keys('status', 'fee_collected');
    expect(result2).to.have.all.keys('status', 'fee_collected');
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

  it(`account B proxy votes to account P`, async () => {
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

  it(`account B proxy votes to account P (empty fio_address, expect fee_collected to be ${config.api.proxy_vote.fee})`, async () => {
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
    wait(4000);
  });

  it(`bp1@dapixdev total_votes did not change (votes just shifted from direct vote to proxy vote via proxyA1)`, async () => {
    let prev_total_bp_votes = total_bp_votes;
    total_bp_votes = await getProdVoteTotal('bp1@dapixdev');
    expect(total_bp_votes).to.equal(prev_total_bp_votes)
  });

  it(`stake 50 tokens from account A`, async () => {
    let stakedTokenPool, combinedTokenPool, globalSrpCount, stakeAmt, newStakedTokenPool, newCombinedTokenPool, newGlobalSrpCount;
    stakeAmt = 50000000000;
    stakedTokenPool = await getStakedTokenPool();
    combinedTokenPool = await getCombinedTokenPool();
    globalSrpCount = await getGlobalSrpCount();

    // proxy first so we can stake
    const proxyvote = await userA.sdk.genericAction('pushTransaction', {
      action: 'voteproxy',
      account: 'eosio',
      data: {
        proxy: userP.address,
        fio_address: userA.address,
        actor: accountnm,
        max_fee: config.api.proxy_vote.fee
      }
    });
    expect(proxyvote.status).to.equal('OK');
    let balA = await userA.sdk.genericAction('getFioBalance', { });
    expect(balA.staked).to.equal(0);
    const result = await userA.sdk.genericAction('pushTransaction', {
      action: 'stakefio',
      account: 'fio.staking',
      data: {
        fio_address: userA.address,
        amount: stakeAmt,
        actor: userA.address,
        max_fee: config.maxFee,
        tpid: userP.address
      }
    });
    let newBalA = await userA.sdk.genericAction('getFioBalance', { });
    newStakedTokenPool = await getStakedTokenPool();
    newCombinedTokenPool = await getCombinedTokenPool();
    newGlobalSrpCount = await getGlobalSrpCount();
    expect(result).to.have.all.keys('status', 'fee_collected');
    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(0);
    expect(newBalA.staked - balA.staked).to.equal(stakeAmt);
    expect(newStakedTokenPool).to.be.greaterThan(stakedTokenPool);
    expect(newStakedTokenPool - stakedTokenPool).to.equal(stakeAmt);
    expect(newCombinedTokenPool - combinedTokenPool).to.equal(stakeAmt);
    expect(newGlobalSrpCount - globalSrpCount).to.equal(stakeAmt);
  });

  it(`stake 50 tokens from account A (no fio_address, expect fee_collected to be 3000000000)`, async () => {
    let stakedTokenPool, combinedTokenPool, globalSrpCount, stakeAmt, feeAmt, newStakedTokenPool, newCombinedTokenPool, newGlobalSrpCount;
    stakeAmt = 50000000000;
    feeAmt = 3000000000;
    stakedTokenPool = await getStakedTokenPool();
    combinedTokenPool = await getCombinedTokenPool();
    globalSrpCount = await getGlobalSrpCount();

    let balA = await userA.sdk.genericAction('getFioBalance', { });
    expect(balA.staked).to.equal(50000000000);
    const result = await userA.sdk.genericAction('pushTransaction', {
      action: 'stakefio',
      account: 'fio.staking',
      data: {
        fio_address: '',
        amount: stakeAmt,
        actor: userA.address,
        max_fee: feeAmt,
        tpid: userP.address
      }
    });
    let newBalA = await userA.sdk.genericAction('getFioBalance', { });
    newStakedTokenPool = await getStakedTokenPool();
    newCombinedTokenPool = await getCombinedTokenPool();
    newGlobalSrpCount = await getGlobalSrpCount();
    expect(result).to.have.all.keys('status', 'fee_collected');
    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(feeAmt);
    expect(newBalA.staked - balA.staked).to.equal(stakeAmt);
    expect(newStakedTokenPool).to.be.greaterThan(stakedTokenPool);
    expect(newStakedTokenPool - stakedTokenPool).to.equal(stakeAmt);
    expect(newCombinedTokenPool - combinedTokenPool).to.be.greaterThanOrEqual(stakeAmt);
    expect(newGlobalSrpCount - globalSrpCount).to.equal(stakeAmt);
  });

  // Test 3
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

  // test 4
  it(`unstake 25 tokens (unstake_fio_tokens) from account A`, async () => {
    let stakedTokenPool, combinedTokenPool, globalSrpCount, stakeAmt, feeAmt, newStakedTokenPool, newCombinedTokenPool, newGlobalSrpCount;
    stakeAmt = 25000000000;
    feeAmt = 3000000000;
    stakedTokenPool = await getStakedTokenPool();
    combinedTokenPool = await getCombinedTokenPool();
    globalSrpCount = await getGlobalSrpCount();
    let bal = await userA.sdk.genericAction('getFioBalance', {});
    const result = await userA.sdk.genericAction('pushTransaction', {
      action: 'unstakefio',
      account: 'fio.staking',
      data: {
        fio_address: userA.address,
        amount: stakeAmt,
        actor: userA.account,
        max_fee: feeAmt,
        tpid:''
      }
    });
    newStakedTokenPool = await getStakedTokenPool();
    newCombinedTokenPool = await getCombinedTokenPool();
    newGlobalSrpCount = await getGlobalSrpCount();
    let newBal = await userA.sdk.genericAction('getFioBalance', {});
    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(0);
    expect(bal.staked - newBal.staked).to.equal(stakeAmt);
    expect(newStakedTokenPool).to.be.lessThan(stakedTokenPool);
    expect(stakedTokenPool - newStakedTokenPool).to.equal(stakeAmt);
    expect(combinedTokenPool - newCombinedTokenPool).to.equal(stakeAmt);
    expect(globalSrpCount - newGlobalSrpCount).to.equal(stakeAmt);
  });

  it(`unstake 25 tokens from account A, no fio_address, fee_collected should be 3000000000`, async () => {
    let stakedTokenPool, combinedTokenPool, globalSrpCount, stakeAmt, feeAmt, newStakedTokenPool, newCombinedTokenPool, newGlobalSrpCount;
    stakeAmt = 25000000000;
    feeAmt = 3000000000;
    stakedTokenPool = await getStakedTokenPool();
    combinedTokenPool = await getCombinedTokenPool();
    globalSrpCount = await getGlobalSrpCount();
    let bal = await userA.sdk.genericAction('getFioBalance', {});
    const result = await userA.sdk.genericAction('pushTransaction', {
      action: 'unstakefio',
      account: 'fio.staking',
      data: {
        fio_address: '',
        amount: stakeAmt,
        actor: userA.account,
        max_fee: feeAmt,
        tpid:''
      }
    });
    newStakedTokenPool = await getStakedTokenPool();
    newCombinedTokenPool = await getCombinedTokenPool();
    newGlobalSrpCount = await getGlobalSrpCount();
    let newBal = await userA.sdk.genericAction('getFioBalance', {});
    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(feeAmt);
    expect(bal.staked - newBal.staked).to.equal(stakeAmt);
    expect(newStakedTokenPool).to.be.lessThan(stakedTokenPool);
    expect(stakedTokenPool - newStakedTokenPool).to.equal(stakeAmt);
    expect(combinedTokenPool - newCombinedTokenPool).to.be.lessThan(stakeAmt);
    expect(globalSrpCount - newGlobalSrpCount).to.equal(stakeAmt);
  });

  // test 5
  it(`stake 500 tokens from account B`, async () => {
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
        actor: accountnm,
        max_fee: config.maxFee,
        tpid:''
      }
    });
    newStakedTokenPool = await getStakedTokenPool();
    newCombinedTokenPool = await getCombinedTokenPool();
    newGlobalSrpCount = await getGlobalSrpCount();
    expect(result).to.have.all.keys('status', 'fee_collected');
    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(0);
    let newBal = await userB.sdk.genericAction('getFioBalance', { });
    expect(newBal.staked - bal.staked).to.equal(stakeAmt);
    expect(newStakedTokenPool).to.be.greaterThan(stakedTokenPool);
    expect(newStakedTokenPool - stakedTokenPool).to.equal(stakeAmt);
    expect(newCombinedTokenPool - combinedTokenPool).to.be.greaterThanOrEqual(stakeAmt);
    expect(newGlobalSrpCount - globalSrpCount).to.equal(stakeAmt);
  });

  // test 7
  it(`get_fio_balance for account A`, async () => {
    const result = await userA.sdk.genericAction('getFioBalance', {});
    expect(result.staked).to.equal(50000000000);
  });

  // test 8
  it(`unstake 25 tokens (unstake_fio_tokens) from account A`, async () => {
    let stakedTokenPool, combinedTokenPool, globalSrpCount, stakeAmt, newStakedTokenPool, newCombinedTokenPool, newGlobalSrpCount;
    stakeAmt = 25000000000;
    stakedTokenPool = await getStakedTokenPool();
    combinedTokenPool = await getCombinedTokenPool();
    globalSrpCount = await getGlobalSrpCount();
    let bal = await userA.sdk.genericAction('getFioBalance', {});
    const result = await userA.sdk.genericAction('pushTransaction', {
      action: 'unstakefio',
      account: 'fio.staking',
      data: {
        fio_address: userA.address,
        amount: stakeAmt,
        actor: userA.account,
        max_fee: config.maxFee +1,
        tpid: bp1.address
      }
    });
    newStakedTokenPool = await getStakedTokenPool();
    newCombinedTokenPool = await getCombinedTokenPool();
    newGlobalSrpCount = await getGlobalSrpCount();
    let newBal = await userA.sdk.genericAction('getFioBalance', {});
    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(0);
    expect(bal.staked - newBal.staked).to.equal(stakeAmt);
    expect(newStakedTokenPool).to.be.lessThan(stakedTokenPool);
    expect(stakedTokenPool - newStakedTokenPool).to.equal(stakeAmt);
    expect(combinedTokenPool - newCombinedTokenPool).to.equal(stakeAmt);
    expect(globalSrpCount - newGlobalSrpCount).to.equal(stakeAmt);
  });

  // test 9
  it(`unstake 25 tokens (unstake_fio_tokens) from account B`, async () => {
    let stakedTokenPool, combinedTokenPool, globalSrpCount, stakeAmt, newStakedTokenPool, newCombinedTokenPool, newGlobalSrpCount;
    stakeAmt = 25000000000;
    stakedTokenPool = await getStakedTokenPool();
    combinedTokenPool = await getCombinedTokenPool();
    globalSrpCount = await getGlobalSrpCount();
    let bal = await userB.sdk.genericAction('getFioBalance', {});
    const result = await userB.sdk.genericAction('pushTransaction', {
      action: 'unstakefio',
      account: 'fio.staking',
      data: {
        fio_address: userB.address,
        amount: stakeAmt,
        actor: userB.account,
        max_fee: config.maxFee +1,
        tpid:''
      }
    });
    newStakedTokenPool = await getStakedTokenPool();
    newCombinedTokenPool = await getCombinedTokenPool();
    newGlobalSrpCount = await getGlobalSrpCount();
    let newBal = await userB.sdk.genericAction('getFioBalance', {});
    expect(result.status).to.equal('OK');
    expect(bal.staked - newBal.staked).to.equal(stakeAmt);
    expect(newStakedTokenPool).to.be.lessThan(stakedTokenPool);
    expect(stakedTokenPool - newStakedTokenPool).to.equal(stakeAmt);
    expect(combinedTokenPool - newCombinedTokenPool).to.equal(stakeAmt);
    expect(globalSrpCount - newGlobalSrpCount).to.equal(stakeAmt);
  });

  it(`run get_fio_balance for account A`, async () => {
    const result = await userA.sdk.genericAction('getFioBalance', {});
    expect(result.staked).to.equal(25000000000);
  });

  it(`run get_fio_balance for account B`, async () => {
    const result = await userB.sdk.genericAction('getFioBalance', {});
    expect(result.staked).to.equal(475000000000);
  });

  // test 11
  it(`stake 900 tokens (stake_fio_tokens) from account C`, async () => {
    let stakedTokenPool, combinedTokenPool, globalSrpCount, stakeAmt, newStakedTokenPool, newCombinedTokenPool, newGlobalSrpCount;
    stakeAmt = 900000000000;
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
        actor: accountnm,
        max_fee: config.maxFee,
        tpid:''
      }
    });
    newStakedTokenPool = await getStakedTokenPool();
    newCombinedTokenPool = await getCombinedTokenPool();
    newGlobalSrpCount = await getGlobalSrpCount();
    let newBal = await userC.sdk.genericAction('getFioBalance', { });
    expect(result).to.have.all.keys('status', 'fee_collected');
    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(0);
    expect(newBal.staked - bal.staked).to.equal(stakeAmt);
    expect(newStakedTokenPool).to.be.greaterThan(stakedTokenPool);
    expect(newStakedTokenPool - stakedTokenPool).to.equal(stakeAmt);
    expect(newCombinedTokenPool - combinedTokenPool).to.be.greaterThanOrEqual(stakeAmt);
    expect(newGlobalSrpCount - globalSrpCount).to.equal(stakeAmt);
  });
});

describe('B. Test stakefio Bundled transactions', () => {
  let bp1, bp2, bp3, user1, user2, proxy1, bundleCount1, bundleCount2, locksdk, accountnm, keys;
  const fundsAmount = 1000000000000

  before(async () => {
    // Create sdk objects for the orinigal localhost BPs
    bp1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
    bp2 = await existingUser('hfdg2qumuvlc', '5JnhMxfnLhZeRCRvCUsaHbrvPSxaqjkQAgw4ZFodx4xXyhZbC9P', 'FIO7uTisye5w2hgrCSE1pJhBKHfqDzhvqDJJ4U3vN9mbYWzataS2b', 'dapixdev', 'bp2@dapixdev');
    bp3 = await existingUser('wttywsmdmfew', '5JvmPVxPxypQEKPwFZQW4Vx7EC8cDYzorVhSWZvuYVFMccfi5mU', 'FIO6oa5UV9ghWgYH9en8Cv8dFcAxnZg2i9z9gKbnHahciuKNRPyHc', 'dapixdev', 'bp3@dapixdev');

    user1 = await newUser(faucet);

    keys = await createKeypair();
    // console.log("priv key ", keys.privateKey);
    // console.log("pub key ", keys.publicKey);
    accountnm =  await getAccountFromKey(keys.publicKey);

    const transfer = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: keys.publicKey,
      amount: fundsAmount,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    });
    expect(transfer.status).to.equal('OK');

    // const result1 = await userA1.sdk.genericAction('pushTransaction', {
    //   action: 'addlocked',
    //   account: 'eosio',
    //   data: {
    //     owner : accountnm,
    //     amount: 7075065123456789,
    //     locktype: 1
    //   }
    // })
    // expect(result1.status).to.equal('OK')

    proxy1 = await newUser(faucet);
    //now transfer 1k fio from the faucet to this account
    // const result = await faucet.genericAction('transferTokens', {
    //   payeeFioPublicKey: user1.publicKey,
    //   amount: 1000000000000,
    //   maxFee: config.api.transfer_tokens_pub_key.fee,
    //   technologyProviderId: ''
    // });
    // expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected');

    // locksdk = await existingUser('ni1eyydbdpht', '5Ke8oZdtefgVEC6GDUeo7FW9xC7WgdxC9Fi92b3YmTrPynWb4Rb', 'FIO6ydLCnUfsEMpbp35kF8oaUbHvcmLEyswMUF75C4FQAm78DUhAi', 'dapixdev', 'stake@dapixdev');
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
    expect(result.roe).to.equal('1.000000000000000');
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
        max_fee: config.maxFee
      }
    });
    expect(result).to.have.all.keys('status', 'fee_collected');
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
    feeAmt = 3000000000;
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
        actor: accountnm,
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
        actor: accountnm,
        max_fee: config.maxFee,
        tpid: ''
      }
    });
    let newBal = await user2.genericAction('getFioBalance', { });
    newStakedTokenPool = await getStakedTokenPool();
    newCombinedTokenPool = await getCombinedTokenPool();
    newGlobalSrpCount = await getGlobalSrpCount();
    expect(result).to.have.all.keys('status', 'fee_collected');
    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(feeAmt);
    expect(newBal.staked - bal.staked).to.equal(stakeAmt);
    expect(newStakedTokenPool).to.be.greaterThan(stakedTokenPool);
    expect(newStakedTokenPool - stakedTokenPool).to.equal(stakeAmt);
    expect(newCombinedTokenPool - combinedTokenPool).to.be.greaterThanOrEqual(stakeAmt);
    expect(newGlobalSrpCount - globalSrpCount).to.equal(stakeAmt);

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
    feeAmt = 3000000000;
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
        actor: user1.address,
        max_fee: feeAmt,
        tpid: proxy1.address
      }
    });
    newStakedTokenPool = await getStakedTokenPool();
    newCombinedTokenPool = await getCombinedTokenPool();
    newGlobalSrpCount = await getGlobalSrpCount();
    let newBal = await user1.sdk.genericAction('getFioBalance', { });
    expect(result).to.have.all.keys('status', 'fee_collected');
    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(0);
    expect(newBal.staked - bal.staked).to.equal(stakeAmt);
    expect(newStakedTokenPool).to.be.greaterThan(stakedTokenPool);
    expect(newStakedTokenPool - stakedTokenPool).to.equal(stakeAmt);
    expect(newCombinedTokenPool - combinedTokenPool).to.equal(stakeAmt);
    expect(newGlobalSrpCount - globalSrpCount).to.equal(stakeAmt);

    let bundles = await getBundleCount(user1.sdk);
    expect(bundles).to.equal(99);
  });

  it('stake small amounts of FIO so that all bundled tx get consumed', async () => {
    let stakeAmt = 1;
    let feeAmt = 3000000000;
    let bundles = await getBundleCount(user1.sdk)
    process.stdout.write('\tconsuming remaining bundled transactions, this may take a while');
    while (bundles > 0) {
      process.stdout.write('.');
      await user1.sdk.genericAction('pushTransaction', {
        action: 'stakefio',
        account: 'fio.staking',
        data: {
          fio_address: user1.address,
          amount: stakeAmt,
          actor: user1.address,
          max_fee: feeAmt,
          tpid: proxy1.address
        }
      });
      wait(3000);
      bundles = await getBundleCount(user1.sdk);
    }
    console.log('done');
    bundles = await getBundleCount(user1.sdk);
    expect(bundles).to.equal(0);
  });

  it(`stake FIO with no bundles remaining, expect fee_collected > 0`, async () => {
    let stakedTokenPool, combinedTokenPool, globalSrpCount, stakeAmt, feeAmt, newStakedTokenPool, newCombinedTokenPool, newGlobalSrpCount;
    stakeAmt = 50000000000;
    feeAmt = 3000000000;
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
        actor: user1.address,
        max_fee: feeAmt,
        tpid: proxy1.address
      }
    });
    newStakedTokenPool = await getStakedTokenPool();
    newCombinedTokenPool = await getCombinedTokenPool();
    newGlobalSrpCount = await getGlobalSrpCount();
    let newBal = await user1.sdk.genericAction('getFioBalance', {});
    expect(result).to.have.all.keys('status', 'fee_collected');
    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(feeAmt);
    expect(newBal.staked - bal.staked).to.equal(stakeAmt);
    expect(newStakedTokenPool).to.be.greaterThan(stakedTokenPool);
    expect(newStakedTokenPool - stakedTokenPool).to.equal(stakeAmt);
    let dbg = newCombinedTokenPool - combinedTokenPool;
    expect(newCombinedTokenPool - combinedTokenPool).to.be.greaterThanOrEqual(stakeAmt);
    expect(newGlobalSrpCount - globalSrpCount).to.equal(stakeAmt);
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
    // console.log("priv key ", keys.privateKey);
    // console.log("pub key ", keys.publicKey);
    accountnm =  await getAccountFromKey(keys.publicKey);

    const transfer = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: keys.publicKey,
      amount: fundsAmount,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    });
    expect(transfer.status).to.equal('OK');

    proxy1 = await newUser(faucet);
    // locksdk = await existingUser('ni1eyydbdpht', '5Ke8oZdtefgVEC6GDUeo7FW9xC7WgdxC9Fi92b3YmTrPynWb4Rb', 'FIO6ydLCnUfsEMpbp35kF8oaUbHvcmLEyswMUF75C4FQAm78DUhAi', 'dapixdev', 'stake@dapixdev');
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
    expect(result.roe).to.equal('1.000000000000000');
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
        max_fee: config.maxFee
      }
    });
    expect(result).to.have.all.keys('status', 'fee_collected');
    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(config.api.register_proxy.fee);
  });

  it(`stake 50000000000 FIO so user1 has funds to unstake`, async () => {
    let stakedTokenPool, combinedTokenPool, globalSrpCount, stakeAmt, feeAmt, newStakedTokenPool, newCombinedTokenPool, newGlobalSrpCount;
    stakeAmt = 50000000000;
    feeAmt = 3000000000;
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
        actor: user1.address,
        max_fee: feeAmt,
        tpid: proxy1.address
      }
    });
    newStakedTokenPool = await getStakedTokenPool();
    newCombinedTokenPool = await getCombinedTokenPool();
    newGlobalSrpCount = await getGlobalSrpCount();
    let newBal = await user1.sdk.genericAction('getFioBalance', { });
    expect(result).to.have.all.keys('status', 'fee_collected');
    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(0);
    expect(newBal.staked - bal.staked).to.equal(stakeAmt);
    expect(newStakedTokenPool).to.be.greaterThan(stakedTokenPool);
    expect(newStakedTokenPool - stakedTokenPool).to.equal(stakeAmt);
    expect(newCombinedTokenPool - combinedTokenPool).to.equal(stakeAmt);
    expect(newGlobalSrpCount - globalSrpCount).to.equal(stakeAmt);

    let bundles = await getBundleCount(user1.sdk);
    expect(bundles).to.equal(99);
  });

  it(`unstake FIO from user1`, async () => {
    let stakedTokenPool, combinedTokenPool, globalSrpCount, stakeAmt, feeAmt, newStakedTokenPool, newCombinedTokenPool, newGlobalSrpCount;
    stakeAmt = 10000000000;
    feeAmt = 3000000000;
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
        max_fee: feeAmt,
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
    expect(globalSrpCount - newGlobalSrpCount).to.equal(stakeAmt);

    let bundles = await getBundleCount(user1.sdk);
    expect(bundles).to.equal(98);
  });

  it('stake small amounts of FIO so that all bundled tx get consumed', async () => {
    let stakeAmt = 1;
    let feeAmt = 3000000000;
    let bundles = await getBundleCount(user1.sdk)
    process.stdout.write('\tconsuming remaining bundled transactions, this may take a while');
    while (bundles > 0) {
      process.stdout.write('.');
      await user1.sdk.genericAction('pushTransaction', {
        action: 'stakefio',
        account: 'fio.staking',
        data: {
          fio_address: user1.address,
          amount: stakeAmt,
          actor: user1.address,
          max_fee: feeAmt,
          tpid: proxy1.address
        }
      });
      wait(3000);
      bundles = await getBundleCount(user1.sdk);
    }
    console.log('done');
    bundles = await getBundleCount(user1.sdk);
    expect(bundles).to.equal(0);
  });

  it(`get locks for user1`, async () => {
    let locks = await user1.sdk.genericAction('getLocks', {fio_public_key: user1.publicKey});
    console.log(locks)

  });

  it(`unstake FIO with no bundles remaining, expect fee_collected > 0`, async () => {
    let stakedTokenPool, combinedTokenPool, globalSrpCount, stakeAmt, feeAmt, newStakedTokenPool, newCombinedTokenPool, newGlobalSrpCount;
    stakeAmt = 20000000000;
    feeAmt = 3000000000;
    stakedTokenPool = await getStakedTokenPool();
    combinedTokenPool = await getCombinedTokenPool();
    globalSrpCount = await getGlobalSrpCount();
    let bal = await user1.sdk.genericAction('getFioBalance', { });
    expect(bal.staked).to.be.greaterThanOrEqual(stakeAmt);

    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: user1.address,
          amount: stakeAmt,
          actor: user1.account,
          max_fee: feeAmt,
          tpid: proxy1.address
        }
      });
      newStakedTokenPool = await getStakedTokenPool();
      newCombinedTokenPool = await getCombinedTokenPool();
      newGlobalSrpCount = await getGlobalSrpCount();
      let newBal = await user1.sdk.genericAction('getFioBalance', {});
      expect(result.status).to.equal('OK');
      expect(result.fee_collected).to.equal(feeAmt);
      expect(bal.staked - newBal.staked).to.equal(stakeAmt);
      expect(newStakedTokenPool).to.be.lessThan(stakedTokenPool);
      expect(stakedTokenPool - newStakedTokenPool).to.equal(stakeAmt);
      expect(combinedTokenPool - newCombinedTokenPool).to.equal(stakeAmt);
      expect(globalSrpCount - newGlobalSrpCount).to.equal(stakeAmt);

      let bundleCount = await getBundleCount(user1.sdk);
      expect(bundleCount).to.equal(98);
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  // it.skip(`stake 10000000000 of user3's FIO balance`, async () => {
  //   let stakedTokenPool, combinedTokenPool, globalSrpCount, stakeAmt, feeAmt, newStakedTokenPool, newCombinedTokenPool, newGlobalSrpCount;
  //   stakeAmt = 50000000000;
  //   feeAmt = 3000000000;
  //   stakedTokenPool = await getStakedTokenPool();
  //   combinedTokenPool = await getCombinedTokenPool();
  //   globalSrpCount = await getGlobalSrpCount();
  //   let bal = await user3.sdk.genericAction('getFioBalance', { });
  //   expect(bal.staked).to.equal(0);
  //
  //   const result = await user3.sdk.genericAction('pushTransaction', {
  //     action: 'stakefio',
  //     account: 'fio.staking',
  //     data: {
  //       fio_address: user3.address,
  //       amount: stakeAmt,
  //       actor: user3.address,
  //       max_fee: feeAmt,
  //       tpid: proxy1.address
  //     }
  //   });
  //   newStakedTokenPool = await getStakedTokenPool();
  //   newCombinedTokenPool = await getCombinedTokenPool();
  //   newGlobalSrpCount = await getGlobalSrpCount();
  //   let newBal = await user3.sdk.genericAction('getFioBalance', { });
  //   expect(result).to.have.all.keys('status', 'fee_collected');
  //   expect(result.status).to.equal('OK');
  //   expect(result.fee_collected).to.equal(0);
  //   expect(newBal.staked - bal.staked).to.equal(stakeAmt);
  //   expect(newStakedTokenPool).to.be.greaterThan(stakedTokenPool);
  //   expect(newStakedTokenPool - stakedTokenPool).to.equal(stakeAmt);
  //   expect(newCombinedTokenPool - combinedTokenPool).to.equal(stakeAmt);
  //   expect(newGlobalSrpCount - globalSrpCount).to.equal(stakeAmt);
  //
  //   let bundles = await getBundleCount(user3.sdk);
  //   expect(bundles).to.equal(99);
  // });

  it(`try to unstake with 0 staked balance, expect error`, async () => {
    let stakedTokenPool, combinedTokenPool, globalSrpCount, stakeAmt, feeAmt, newStakedTokenPool, newCombinedTokenPool, newGlobalSrpCount;
    stakeAmt = 20000000000;
    feeAmt = 3000000000;
    stakedTokenPool = await getStakedTokenPool();
    combinedTokenPool = await getCombinedTokenPool();
    globalSrpCount = await getGlobalSrpCount();
    let bal = await user3.sdk.genericAction('getFioBalance', { });
    expect(bal.staked).to.be.greaterThanOrEqual(0);

    try {
      const result = await user3.sdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: '',
          amount: stakeAmt,
          actor: user3.account,
          max_fee: feeAmt,
          tpid: proxy1.address
        }
      });
    } catch (err) {
      newStakedTokenPool = await getStakedTokenPool();
      newCombinedTokenPool = await getCombinedTokenPool();
      newGlobalSrpCount = await getGlobalSrpCount();
      let newBal = await user3.sdk.genericAction('getFioBalance', {});
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

  // //TODO: Test unstaking with staked balance = 0 and also available balance also = 0
  // it.skip(`try to unstake with 0 staked balance and 0 available balance, expect error`, async () => {
  //
  // });

  //TODO: Repeat both of the above with user1 (no bundles)
  it(`try to unstake with 0 bundles and 0 staked balance, expect error`, async () => {
    let stakedTokenPool, combinedTokenPool, globalSrpCount, stakeAmt, feeAmt, newStakedTokenPool, newCombinedTokenPool, newGlobalSrpCount;
    stakeAmt = 20000000000;
    feeAmt = 3000000000;
    stakedTokenPool = await getStakedTokenPool();
    combinedTokenPool = await getCombinedTokenPool();
    globalSrpCount = await getGlobalSrpCount();
    let bal = await user1.sdk.genericAction('getFioBalance', { });
    // expect(bal.staked).to.be.greaterThanOrEqual(0);
    stakeAmt = bal.staked - feeAmt;
    const unstake = await user1.sdk.genericAction('pushTransaction', {
      action: 'unstakefio',
      account: 'fio.staking',
      data: {
        fio_address: user1.address,
        amount: stakeAmt,
        actor: user1.account,
        max_fee: feeAmt,
        tpid: proxy1.address
      }
    });
    expect(unstake.status).to.equal('OK');    //TODO: assertion failure with message: unstakefio,  internal error decrementing payouts.

    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: user1.address,
          amount: stakeAmt,
          actor: user1.account,
          max_fee: feeAmt,
          tpid: proxy1.address
        }
      });
    } catch (err) {
      newStakedTokenPool = await getStakedTokenPool();
      newCombinedTokenPool = await getCombinedTokenPool();
      newGlobalSrpCount = await getGlobalSrpCount();
      let newBal = await user3.sdk.genericAction('getFioBalance', {});
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

  // it.skip(`try to unstake with 0 bundles, 0 staked balance and 0 available balance, expect error`, async () => {
  //
  // });
});

// auto-proxy tests taken from stake-regression.js
describe(`D. Stake tokens using auto proxy without voting first, \n Then do a full pull through unstaking including testing the locking period.`, () => {
  let user1, proxy1;
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
      //console.log('voters: ', voter);
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
          max_fee: config.maxFee
        }
      });
      //console.log('Result: ', result)
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
      //console.log('voters: ', voter);
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
      //console.log('voters: ', voter);
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
      // console.log("address used ",user1.address)
      // console.log("account used ",user1.account)
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'stakefio',
        account: 'fio.staking',
        data: {
          fio_address: user1.address,
          amount: 3000000000000,
          actor: user1.account,
          max_fee: config.maxFee,
          tpid: proxy1.address
        }
      });

      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("Error : ", err)
      // expect(err.json.fields[0].error).to.contain('has not voted')
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
      // console.log('voters: ', voters.rows);
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
          max_fee: config.maxFee,
          tpid:''
        }
      });
      // console.log('Result: ', result)
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      //  console.log('Error: ', err)
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
          max_fee: config.maxFee,
          tpid:''
        }
      });
      // console.log('Result: ', result)
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      //console.log('Error: ', err)
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
        max_fee: config.maxFee,
        tpid:''
      }
    });
    // console.log('Result: ', result)
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
      // console.log("ERROR: ", err)
      expect(err.json.fields[0].error).to.contain('Funds locked');
    }
  });

  it(`wait 60 seconds for unlock`, async () => {
    try {
      wait(60000);
    } catch (err) {
      console.log('Error', err);
    }
  });

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
    }
  });
});

describe(`E. Unhappy Tests`, () => {

  let userA, userB, userC, userD, userP, locksdk, keys, accountnm, newFioDomain1, newFioAddress1, newFioAddress2;
  const fundsAmount = 1000000000000

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
    // console.log("priv key ", keys.privateKey);
    // console.log("pub key ", keys.publicKey);
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
      console.log('')
    }

    locksdk = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson);

    newFioDomain1 = generateFioDomain(15);
    const domainRegistered = await userC.sdk.genericAction('registerFioDomain', {
      fioDomain: newFioDomain1,
      maxFee: 800000000000,
      tpid: '',
    });
    expect(domainRegistered).to.have.all.keys('status', 'expiration', 'fee_collected');
    expect(domainRegistered.status).to.equal('OK');
    expect(domainRegistered.fee_collected).to.equal(800000000000);

    newFioAddress1 = generateFioAddress(newFioDomain1,15)
    const addressRegistered = await userC.sdk.genericAction('registerFioAddress', {
      fioAddress: newFioAddress1,
      maxFee: 400000000000,
      tpid: '',
    });
    expect(addressRegistered).to.have.all.keys('status', 'expiration', 'fee_collected');
    expect(addressRegistered.status).to.equal('OK');
    expect(addressRegistered.fee_collected).to.equal(40000000000);

    const regproxy = await userP.sdk.genericAction('pushTransaction', {
      action: 'regproxy',
      account: 'eosio',
      data: {
        fio_address: userP.address,
        actor: userP.account,
        max_fee: config.maxFee
      }
    });
    expect(regproxy).to.have.all.keys('status', 'fee_collected');
    expect(regproxy.status).to.equal('OK');
    expect(regproxy.fee_collected).to.equal(20000000000);
  });

  it(`attempt to stake without voting, proxying or auto-proxy, expect Error 400`, async () => {
    try {
      const result = await userC.sdk.genericAction('pushTransaction', {
        action: 'stakefio',
        account: 'fio.staking',
        data: {
          fio_address: userC.address,
          amount: 1000000000000,
          actor: accountnm,
          max_fee: config.maxFee,
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
        actor: accountnm,
        max_fee: config.maxFee
      }
    });
    expect(vote).to.have.all.keys('status', 'fee_collected');
    expect(vote.status).to.equal('OK');

    try {
      const result = await userC.sdk.genericAction('pushTransaction', {
        action: 'stakefio',
        account: 'fio.staking',
        data: {
          fio_address: userC.address,
          amount: -100000000000,
          actor: accountnm,
          max_fee: config.maxFee,
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
          actor: accountnm,
          max_fee: config.maxFee
        }
      });

      expect(vote).to.have.all.keys('status', 'fee_collected');
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
          actor: locksdk.account,
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

  it(`attempt to stake with max_fee 1, expect Error 400`, async () => {
    const proxyvote = await userC.sdk.genericAction('pushTransaction', {
      action: 'voteproxy',
      account: 'eosio',
      data: {
        proxy: userP.address,
        fio_address: userC.address,
        actor: userC.account,
        max_fee: config.api.proxy_vote.fee
      }
    });
    expect(proxyvote.status).to.equal('OK');
    expect(proxyvote).to.have.all.keys('status', 'fee_collected');
    expect(proxyvote.status).to.equal('OK');

    // TODO: fail -- stakes even with an invalid fee

    let bal = await userC.sdk.genericAction('getFioBalance', {});
    let lockBal = await locksdk.genericAction('getFioBalance', {});
    try {
      const result = await userC.sdk.genericAction('pushTransaction', {
        action: 'stakefio',
        account: 'fio.staking',
        data: {
          fio_address: userC.address,
          amount: 1000000000000,
          // actor: locksdk.account,
          actor: accountnm,
          max_fee: 1,
          tpid:'casey@dapixdev'
        }
      });
      expect(result.status).to.not.equal('OK');

    } catch (err) {
      let newBal = await userC.sdk.genericAction('getFioBalance', {});
      let newLockBal = await locksdk.genericAction('getFioBalance', {});
      expect(newBal.staked).to.equal(bal.staked);

      // expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      // expect(err.errorCode).to.equal(400);
      // expect(err.json).to.have.all.keys('type', 'message', 'fields');
      // expect(err.json.fields[0].error).to.equal('Invalid fee value');
    }
  });

  it(`attempt to stake the exact amount of tokens available in account, expect Error 400`, async () => {
    let bal = await userC.sdk.genericAction('getFioBalance', {});
    try {
      const result = await userC.sdk.genericAction('pushTransaction', {
        action: 'stakefio',
        account: 'fio.staking',
        data: {
          fio_address: '',
          amount: bal.available,
          actor: accountnm,
          max_fee: config.maxFee,
          tpid: 'casey@dapixdev'
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      let newBal = await userC.sdk.genericAction('getFioBalance', {});
      let newLockBal = await locksdk.genericAction('getFioBalance', {});
      expect(newBal.staked).to.equal(bal.staked);
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.json.fields[0].name).to.equal('max_fee');
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
          max_fee: 1,
          tpid:'invalidfioaddress!!!@@@#@'
        }
      });
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.errorCode).to.equal(400);
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.json.fields[0].error).to.equal('FIO Address not registered');
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
          max_fee: config.maxFee,
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
          max_fee: config.maxFee +1,
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
    // TODO: Bug if stakefio throws a 500 if no prior staked amount exists?
    const stake = await userC.sdk.genericAction('pushTransaction', {
      action: 'stakefio',
      account: 'fio.staking',
      data: {
        fio_address: '',
        amount: 50000000000,
        actor: accountnm,
        max_fee: config.maxFee,
        tpid:''
      }
    });
    expect(stake).to.have.all.keys('status', 'fee_collected');
    expect(stake.status).to.equal('OK');
    expect(stake.fee_collected).to.equal(3000000000);
    let bal = await userC.sdk.genericAction('getFioBalance', {});
    let unstakeAmt = bal.staked + 1000000000000;
    try {
      const result = await userC.sdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: '',
          amount: unstakeAmt,
          actor: userC.account,
          max_fee: config.maxFee +1,
          tpid:''
        }
      });
    } catch (err) {
      expect(err).to.not.equal(null);
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

  it(`attempt to unstake with max_fee 1, expect Error 400`, async () => {
    const proxyvote = await userA.sdk.genericAction('pushTransaction', {
      action: 'voteproxy',
      account: 'eosio',
      data: {
        proxy: userP.address,
        fio_address: '',
        actor: userA.account,
        max_fee: config.api.proxy_vote.fee
      }
    });
    expect(proxyvote.status).to.equal('OK');
    const stake = await userA.sdk.genericAction('pushTransaction', {
      action: 'stakefio',
      account: 'fio.staking',
      data: {
        fio_address: '',
        amount: 50000000000,
        actor: accountnm,
        max_fee: config.maxFee,
        tpid: ''
      }
    });
    expect(stake).to.have.all.keys('status', 'fee_collected');
    expect(stake.status).to.equal('OK');
    expect(stake.fee_collected).to.equal(3000000000);
    let bal = await userA.sdk.genericAction('getFioBalance', {});
    try {
      const result = await userA.sdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data:{
          fio_address: userA.address,
          amount: 50000000000,
          actor: userA.account,
          max_fee: 1,
          tpid:'casey@dapixdev'
        }
      });
      let newBal = await userA.sdk.genericAction('getFioBalance', {});
      expect(newBal.staked).to.equal(bal.staked);
      console.log(result, newBal);
    } catch (err) {
      expect(err).to.equal(null);
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
          actor: accountnm,
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
      // expect(stake).to.have.all.keys('status', 'fee_collected');
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
          fio_address: '',
          amount: userDBal.staked,
          actor: userD.account,
          max_fee: config.maxFee,
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
          actor: accountnm,
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
          actor: accountnm,
          max_fee: config.maxFee,
          tpid: ''
        }
      });
      expect(stake).to.have.all.keys('status', 'fee_collected');
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
          amount: userDBal.staked,
          actor: accountnm,
          max_fee: config.maxFee,
          tpid:''
        }
      });
      userDBal = await userD.sdk.genericAction('getFioBalance', {});
      let newBalLock = await locksdk.genericAction('getFioBalance', {});
    } catch(err) {
      let newUserDBal = await userD.sdk.genericAction('getFioBalance', {});
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.errorCode).to.equal(400);
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.json.fields[0].error).to.equal('Invalid amount value');
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
          actor: locksdk.account,
          max_fee: config.maxFee,
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
          max_fee: config.maxFee,
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
