let faucet;
require('mocha')
const {expect} = require('chai')
const {newUser, existingUser,callFioApi,getAccountFromKey,fetchJson, generateFioDomain, generateFioAddress, createKeypair, getTotalVotedFio, getProdVoteTotal} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
config = require('../config.js');

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
})

function wait(ms){
  var start = new Date().getTime();
  var end = start;
  while(end < start + ms) {
    end = new Date().getTime();
  }
}

describe(`************************** stake-tokens.js ************************** \n    A. Test staking and unstaking various amounts of tokens, including locked tokens.`, () => {

  let bp1, bp2, bp3, userA, userB, userC, userP, prevFundsAmount, locksdk, keys, accountnm, newFioDomain1, newFioAddress1, newFioDomain2, newFioAddress2, total_bp_votes, total_voted_fio;

  const fundsAmount = 1000000000000

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
    // console.log(result)
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
      expect(err.json.fields[0].error).to.contain('Funds locked');
    }
  })

  it(`Transfer ${fundsAmount} FIO to locked account`, async () => {
    const result = await userA.sdk.genericAction('transferTokens', {
      payeeFioPublicKey: keys.publicKey,
      amount: fundsAmount,
      maxFee: 400000000000,
      tpid: '',
    });
    expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected');
    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(2000000000);
  });

  it(`getFioBalance for general lock token holder, available balance 0 `, async () => {
    const result = await locksdk.genericAction('getFioBalance', { });
    prevFundsAmount = result.balance;
    expect(result.available).to.equal(1000000000000);
  });

  it(`transfer 100 tokens to account A`, async () => {
    try {
      const result = await locksdk.genericAction('transferTokens', {
        payeeFioPublicKey: userA.publicKey,
        amount: 10000000000,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        technologyProviderId: ''
      });
      expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected')
      expect(result.transaction_id).to.be.a('string');
      expect(result.block_num).to.be.a('number');
      expect(result.fee_collected).to.be.a('number').and.equal(2000000000);
      expect(result.status).to.be.a('string').and.equal('OK');
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it(`transfer 1000 tokens to account B`, async () => {
    let userBal = await userB.sdk.genericAction('getFioBalance', {});
    let lockBal = await locksdk.genericAction('getFioBalance', {});
    const result = await locksdk.genericAction('transferTokens', {
      payeeFioPublicKey: userB.publicKey,
      amount: 100000000000,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    });
    expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected')
    expect(result.transaction_id).to.be.a('string');
    expect(result.block_num).to.be.a('number');
    expect(result.fee_collected).to.be.a('number').and.equal(2000000000);
    expect(result.status).to.be.a('string').and.equal('OK');
    let newUserBal = await userB.sdk.genericAction('getFioBalance', {});
    let newLockBal = await locksdk.genericAction('getFioBalance', {});
    expect(userBal.available).to.be.a('number');
    expect(newUserBal.available).to.be.greaterThan(userBal.available);
    expect(newUserBal.available - userBal.available).to.equal(100000000000);
    expect(newLockBal.available).to.be.lessThan(lockBal.available);
    expect(lockBal.available - newLockBal.available).to.equal(102000000000);
  });

  it(`transfer 1000 tokens to account C`, async () => {
    let userBal = await userC.sdk.genericAction('getFioBalance', {});
    let lockBal = await locksdk.genericAction('getFioBalance', {});
    const result = await locksdk.genericAction('transferTokens', {
      payeeFioPublicKey: userC.publicKey,
      amount: 100000000000,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    });
    expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected')
    expect(result.transaction_id).to.be.a('string');
    expect(result.block_num).to.be.a('number');
    expect(result.fee_collected).to.be.a('number').and.equal(2000000000);
    expect(result.status).to.be.a('string').and.equal('OK');
    let newUserBal = await userC.sdk.genericAction('getFioBalance', {});
    let newLockBal = await locksdk.genericAction('getFioBalance', {});
    expect(userBal.available).to.be.a('number');
    expect(newUserBal.available).to.be.greaterThan(userBal.available);
    expect(newUserBal.available - userBal.available).to.equal(100000000000);
    expect(newLockBal.available).to.be.lessThan(lockBal.available);
    expect(lockBal.available - newLockBal.available).to.equal(102000000000);
  });

  it(`Register domain for voting for account C `, async () => {
    newFioDomain1 = generateFioDomain(15);
    const result = await userC.sdk.genericAction('registerFioDomain', {
      fioDomain: newFioDomain1,
      maxFee: 800000000000,
      tpid: '',
    });
    expect(result).to.have.all.keys('status', 'expiration', 'fee_collected');
    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(800000000000);
  });

  it(`Register address for voting for account C`, async () => {
    newFioAddress1 = generateFioAddress(newFioDomain1,15)
    const result = await userC.sdk.genericAction('registerFioAddress', {
      fioAddress: newFioAddress1,
      maxFee: 400000000000,
      tpid: '',
    });
    expect(result).to.have.all.keys('status', 'expiration', 'fee_collected');
    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(40000000000);
  })

  it(`account C votes for bp1@dapixdev`, async () => {
    // before vote
    let totalBeforeVote = await getTotalVotedFio();
    const result = await userC.sdk.genericAction('pushTransaction', {
      action: 'voteproducer',
      account: 'eosio',
      data: {
        producers: [bp1.address],
        fio_address: newFioAddress1,
        actor: accountnm,
        max_fee: config.maxFee
      }
    });
    expect(result).to.have.all.keys('status', 'fee_collected');
    expect(result.status).to.equal('OK');
    // after vote
    let totalAfterVote = await getTotalVotedFio()
    expect(totalAfterVote).to.be.greaterThan(totalBeforeVote);
  });

  it(`transfer 1000 tokens to account P`, async () => {
    let userBal = await userP.sdk.genericAction('getFioBalance', {});
    let lockBal = await locksdk.genericAction('getFioBalance', {});
    const result = await locksdk.genericAction('transferTokens', {
      payeeFioPublicKey: userP.publicKey,
      amount: 100000000000,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    });
    expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected')
    expect(result.transaction_id).to.be.a('string');
    expect(result.block_num).to.be.a('number');
    expect(result.fee_collected).to.be.a('number').and.equal(2000000000);
    expect(result.status).to.be.a('string').and.equal('OK');
    let newUserBal = await userP.sdk.genericAction('getFioBalance', {});
    let newLockBal = await locksdk.genericAction('getFioBalance', {});
    expect(userBal.available).to.be.a('number');
    expect(newUserBal.available).to.be.greaterThan(userBal.available);
    expect(newUserBal.available - userBal.available).to.equal(100000000000);
    expect(newLockBal.available).to.be.lessThan(lockBal.available);
    expect(lockBal.available - newLockBal.available).to.equal(102000000000);
  });

  it(`register a FIO address for account P`, async () => {
    newFioDomain2 = generateFioDomain(15);
    await userP.sdk.genericAction('registerFioDomain', {
      fioDomain: newFioDomain2,
      maxFee: 800000000000,
      tpid: '',
    });
    newFioAddress2 = generateFioAddress(newFioDomain2,15)
    const result = await userP.sdk.genericAction('registerFioAddress', {
      fioAddress: newFioAddress2,
      maxFee: config.maxFee,
      tpid: '',
    });
    expect(result).to.have.all.keys('status', 'expiration', 'fee_collected');
    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(40000000000);

    // make the domain public
    const result2 = await userP.sdk.genericAction('setFioDomainVisibility', {
      fioDomain: userP.domain,
      isPublic: true,
      maxFee: config.maxFee,
      technologyProviderId: ''
    });
    expect(result2).to.have.all.keys('status', 'fee_collected');
    expect(result2.status).to.be.a('string').and.equal('OK');
    expect(result2.fee_collected).to.be.a('number').and.equal(600000000);
  });

  it(`register account P as proxy`, async () => {
    const result = await userP.sdk.genericAction('pushTransaction', {
      action: 'regproxy',
      account: 'eosio',
      data: {
        fio_address: userP.address,
        actor: userP.account,
        max_fee: config.maxFee
      }
    });
    expect(result).to.have.all.keys('status', 'fee_collected');
    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(20000000000);
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
    })

    const result2 = await userA.sdk.genericAction('addPublicAddress', {
      fioAddress: userA.address,
      chainCode: 'BCH',
      tokenCode: 'BCH',
      publicAddress: 'bitcoincash:qzf8zha74adsfasdf0xnwlffdn0zuyaslx3c90q7n9g9',
      technologyProviderId: userP.address,
      maxFee: config.api.add_pub_address.fee,
    })
    expect(result).to.have.all.keys('status', 'fee_collected');
    expect(result2).to.have.all.keys('status', 'fee_collected');
    expect(result.status).to.equal('OK');
    expect(result2.status).to.equal('OK');
  });

  it(`Get total_voted_fio`, async () => {
    total_voted_fio = await getTotalVotedFio();
    console.log('total_voted_fio:', total_voted_fio);
  });

  it(`Get bp1@dapixdev total_votes`, async () => {
    try {
      total_bp_votes = await getProdVoteTotal('bp1@dapixdev');
      console.log('bp1@dapixdev total_votes:', total_bp_votes)
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal('null');
    }
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
  });

  it(`Wait a few seconds.`, async () => {
    try {
      wait(4000)
    } catch (err) {
      console.log('Error', err)
    }
  });

  it(`bp1@dapixdev total_votes did not change (votes just shifted from direct vote to proxy vote via proxyA1)`, async () => {
    try {
      let prev_total_bp_votes = total_bp_votes;
      total_bp_votes = await getProdVoteTotal('bp1@dapixdev');
      expect(total_bp_votes).to.equal(prev_total_bp_votes)
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

  // test 2
  // it(`Failure test stake tokens before unlocking, Error Insufficient balance `, async () => {
  //   // proxy first so we can stake
  //   const proxyvote = await userA.sdk.genericAction('pushTransaction', {
  //     action: 'voteproxy',
  //     account: 'eosio',
  //     data: {
  //       proxy: userP.address,
  //       fio_address: userA.address,
  //       actor: userA.account,
  //       max_fee: config.api.proxy_vote.fee
  //     }
  //   });
  //   expect(proxyvote.status).to.equal('OK');
  //   let bal = await userA.sdk.genericAction('getFioBalance', {});
  //   try {
  //     const result = await userA.sdk.genericAction('pushTransaction', {
  //       action: 'stakefio',
  //       account: 'fio.staking',
  //       data: {
  //         fio_address: userA.address,
  //         // fio_address: newFioAddress1,
  //         // amount: 10000000000000000000,
  //         amount: 50000000000,
  //         // actor: userB.address,
  //         actor: locksdk.account,
  //         max_fee: config.maxFee,
  //         tpid:''
  //       }
  //     });
  //
  //     // console.log("address is ",newFioAddress)
  //     // const result = await locksdk.genericAction('pushTransaction', {
  //     //   action: 'stakefio',
  //     //   account: 'fio.staking',
  //     //   data: {
  //     //     fio_address: newFioAddress1,
  //     //     amount: 50000000000,
  //     //     actor: accountnm,
  //     //     max_fee: config.maxFee,
  //     //     tpid:''
  //     //   }
  //     // });
  //     // console.log('Result: ', result)
  //     let newBal = await userA.sdk.genericAction('getFioBalance', {});
  //     expect(newBal.staked).to.equal(bal.staked);
  //     expect(result.status).to.not.equal('OK')
  //   } catch (err) {
  //     // console.log("Error : ", err.json)
  //     expect(err.json.fields[0].error).to.contain('Insufficient balance')
  //   }
  // });

  // it(`wait 120 seconds`, async () => {
  //   console.log("            waiting 120 seconds ");
  //   try {
  //     wait(120000)
  //   } catch (err) {
  //     console.log('Error', err)
  //   }
  // })

  it(`stake 50 tokens from account A`, async () => {
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
    try {
      const result = await userA.sdk.genericAction('pushTransaction', {
        action: 'stakefio',
        account: 'fio.staking',
        data: {
          fio_address: "",
          amount: 50000000000,
          actor: accountnm,
          max_fee: config.maxFee,
          tpid:''
        }
      });
      let newBalA = await userA.sdk.genericAction('getFioBalance', { });
      let newBalLock = await locksdk.genericAction('getFioBalance', { });
      expect(result).to.have.all.keys('status', 'fee_collected');
      expect(result.status).to.equal('OK');
      expect(result.fee_collected).to.equal(3000000000);
      expect(newBalA.staked - balA.staked).to.equal(50000000000);
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  // TODO: Test that the global pool went down by 50 tokens

  it(`get_fio_balance for account A`, async () => {
    const lockedBal = await locksdk.genericAction('getFioBalance', {})
    const result = await userA.sdk.genericAction('getFioBalance', {})
    expect(result.staked).to.be.greaterThanOrEqual(500000000);
  });

  // Test 3
  it(`register domain from any other account`, async () => {
    let newDomain = generateFioDomain(4);
    try {
      const result = await userA.sdk.genericAction('registerFioDomain', {
        fioDomain: newDomain,
        maxFee: config.api.register_fio_domain.fee,
        technologyProviderId: ''
      });
      expect(result.status).to.equal('OK');
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it.skip(`wait until next BP claim can be run`, async () => {
    console.log("            waiting 120 seconds ");
    try {
      wait(120000);
    } catch (err) {
      console.log('Error', err);
    }
  });

  it.skip(`run bpclaim from any other account`, async () => {
    try {
      const result = await bp1.sdk.genericAction('pushTransaction', {
        account: 'fio.treasury',
        action: 'bpclaim',
        data: {
          fio_address: bp1.address,
          actor: bp1.account
        }
      });
      expect(result).to.have.all.keys('status');
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  // test 4
  it(`unstake 25 tokens (unstake_fio_tokens) from account A`, async () => {
    let bal = await userA.sdk.genericAction('getFioBalance', {});
    // try {
    const result = await userA.sdk.genericAction('pushTransaction', {
      action: 'unstakefio',
      account: 'fio.staking',
      data: {
        fio_address: '',
        amount: 25000000000,
        actor: userA.account,
        max_fee: config.maxFee +1,
        tpid:''
      }
    })
    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(3000000000);
    let newBal = await userA.sdk.genericAction('getFioBalance', {});
    expect(bal.staked - newBal.staked).to.equal(25000000000);
    // } catch (err) {
    //   console.log("ERROR :", err.json)
    //   expect(err.json.fields[0].error).to.contain('Cannot unstake more than staked')
    // }
  });

  // TODO: Test that the global pool went up by 25 tokens

  // test 5
  it(`stake 500 tokens from account B`, async () => {
    // pretty sure we need to proxy account B first

    let bal = await userB.sdk.genericAction('getFioBalance', { });
    try {
      const result = await userB.sdk.genericAction('pushTransaction', {
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
      expect(result).to.have.all.keys('status', 'fee_collected');
      expect(result.status).to.equal('OK');
      expect(result.fee_collected).to.equal(3000000000);

      // make sure staked balance updates
      let newBal = await userB.sdk.genericAction('getFioBalance', { });
      expect(newBal.staked - bal.staked).to.equal(50000000000);
    } catch (err) {
      let newBal = await userB.sdk.genericAction('getFioBalance', { });
      expect(err).to.equal(null);
    }
  });

  // TODO: Test that the global pool went down by 500 tokens

  // test 6
  it.skip(`wait until next BP claim can be run`, async () => {
    console.log("            waiting 120 seconds ");
    try {
      wait(120000);
    } catch (err) {
      console.log('Error', err);
    }
  });

  it.skip(`run bpclaim from any other account`, async () => {
    try {
      const result = await userC.sdk.genericAction('pushTransaction', {
        account: 'fio.treasury',
        action: 'bpclaim',
        data: {
          fio_address: locksdk.address,
          actor: accountnm
        }
      });
      expect(result).to.have.all.keys('status');
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  // test 7
  it(`get_fio_balance for account A`, async () => {
    const result = await userA.sdk.genericAction('getFioBalance', {})
    expect(result.staked).to.equal(25000000000);
  });

  // test 8
  it(`unstake 25 tokens (unstake_fio_tokens) from account A`, async () => {
    let bal = await userA.sdk.genericAction('getFioBalance', {});
    try {
      const result = await userA.sdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: '',
          amount: 25000000000,
          actor: userA.account,
          max_fee: config.maxFee +1,
          tpid: bp1.address
        }
      })
      expect(result.status).to.equal('OK')
      let newBal = await userA.sdk.genericAction('getFioBalance', {});
      expect(bal.staked - newBal.staked).to.equal(25000000000);
    } catch (err) {
      console.log("ERROR :", err.json)
      expect(err.json.fields[0].error).to.contain('Cannot unstake more than staked')
    }
  });

  // TODO: Test that the global pool went up by 25 tokens

  // test 9
  it(`unstake 25 tokens (unstake_fio_tokens) from account B`, async () => {
    let bal = await userB.sdk.genericAction('getFioBalance', {});
    try {
      const result = await userB.sdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: userB.sdk.fio_address,
          amount: 25000000000,
          actor: userB.sdk.account,
          max_fee: config.maxFee +1,
          tpid:''
        }
      })
      expect(result.status).to.equal('OK')
      let newBal = await userB.sdk.genericAction('getFioBalance', {});
      expect(bal.staked - newBal.staked).to.equal(25000000000);
    } catch (err) {
      console.log("ERROR :", err.json)
      expect(err.json.fields[0].error).to.contain('Cannot unstake more than staked')
    }
  });

  // TODO: Test that the global pool went up by 25 tokens

  // test 10
  it.skip(`wait until next BP claim can be run`, async () => {
    console.log("            waiting 120 seconds ");
    try {
      wait(120000);
    } catch (err) {
      console.log('Error', err);
    }
  });

  it.skip(`run bpclaim from any other account`, async () => {
    try {
      const result = await userP.sdk.genericAction('pushTransaction', {
        account: 'fio.treasury',
        action: 'bpclaim',
        data: {
          fio_address: "producer@bob",
          actor: "aftyershcu22"
        }
      });
      expect(result).to.have.all.keys('status');
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it(`run get_fio_balance for account A`, async () => {
    const result = await userA.sdk.genericAction('getFioBalance', {})
    // expect(result.staked).to.be.greaterThanOrEqual(500000000);
    expect(result.staked).to.be.greaterThanOrEqual(0);
  });

  it(`run get_fio_balance for account B`, async () => {
    const result = await userB.sdk.genericAction('getFioBalance', {})
    expect(result.staked).to.be.greaterThanOrEqual(500000000);
  });

  // test 11
  it(`stake 900 tokens (stake_fio_tokens) from account C`, async () => {
    let bal = await userB.sdk.genericAction('getFioBalance', { });
    try {
      const result = await userB.sdk.genericAction('pushTransaction', {
        action: 'stakefio',
        account: 'fio.staking',
        data: {
          fio_address: userB.fio_address,
          amount: 900000000000,
          actor: accountnm,
          max_fee: config.maxFee,
          tpid:''
        }
      });
      expect(result).to.have.all.keys('status', 'fee_collected');
      expect(result.status).to.equal('OK');
      expect(result.fee_collected).to.equal(3000000000);

      // make sure staked balance updates
      let newBal = await userB.sdk.genericAction('getFioBalance', { });
      expect(newBal.staked - bal.staked).to.equal(900000000000);
    } catch (err) {
      expect(err).to.equal(null);
    }
  });
});

describe(`Unhappy Tests`, () => {

  let userA, userB, userC, userD, userP, prevFundsAmount, locksdk, keys, accountnm, newFioDomain1, newFioAddress1, newFioDomain2, newFioAddress2, total_bp_votes, total_voted_fio;
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

  // it(`attempt to stake 100 tokens, insufficient balance tokens locked.`, async () => {
  //   // vote first so we're eligible
  //   // const vote = await userB.sdk.genericAction('pushTransaction', {
  //   //   action: 'voteproducer',
  //   //   account: 'eosio',
  //   //   data: {
  //   //     producers: ["bp1@dapixdev"],
  //   //     // fio_address: newFioAddress1,
  //   //     fio_address: '',
  //   //     actor: accountnm,
  //   //     max_fee: config.maxFee
  //   //   }
  //   // });
  //   // expect(vote).to.have.all.keys('status', 'fee_collected');
  //   // expect(vote.status).to.equal('OK');
  //
  //   try {
  //     const result = await locksdk.genericAction('pushTransaction', {
  //       action: 'stakefio',
  //       account: 'fio.staking',
  //       data: {
  //         fio_address: userB.address,
  //         amount: 100000000000,
  //         actor: accountnm,
  //         max_fee: config.maxFee,
  //         tpid:'casey@dapixdev'
  //       }
  //     });
  //     expect(result.status).to.not.equal('OK');
  //   } catch (err) {
  //     expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
  //     expect(err.errorCode).to.equal(400);
  //     expect(err.json).to.have.all.keys('type', 'message', 'fields');
  //     expect(err.json.fields[0].error).to.equal('Insufficient balance tokens locked');
  //   }
  // });

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
    ////// TODO: fail -- stakes even with an invalid fee

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

  it.skip(`attempt to stake with max_fee 1, expect Error 400`, async () => {
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
          // actor: accountnm,
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

  it.skip(`attempt to unstake with max_fee 1, expect Error 400`, async () => {
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


// TODO: Test with bundles

// https://github.com/fioprotocol/fips/blob/master/fip-0021.md#key-concepts

