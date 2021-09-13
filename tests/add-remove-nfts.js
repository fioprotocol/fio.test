require('mocha');
const {expect} = require('chai');
const {newUser, fetchJson, callFioApi, timeout} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk');
config = require('../config.js');
let faucet;

function mintNfts (num) {
  let nfts = [];
  if (num === 0) return nfts;
  for (let i=1; i<=num; i++) {
    nfts.push({
      "chain_code":"ETH",
      "contract_address":"0x123456789ABCDEF",
      "token_id":`${i}`,
      "url":"",
      "hash":"",
      "metadata":`${Math.random().toString(32).substr(2, 8)}`
    });
  }
  return nfts;
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

/**
 * for pretty much all parameters in the data object, test if the value is:
 * missing
 * invalid
 * empty
 * negative
 * (only if nonnumeric type) integer
 *
 * invalid/empty NFT array
 * missing NFTs
 * missing max_fee
 * max_fee = -1
 * invalid max_fee
 *
 * consume all bundles
 *
 * max_fee again (missing, -1, invalid)
 * valid request but zero bundles and zero balance to pay fees
 */

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
});

describe(`************************** add-remote-nfts.js ************************** \n    A. Add NFTS`, () => {
  let user1, user2, user3;

  const fundsAmount = 10000000000000

  before(async () => {
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
    user3 = await newUser(faucet);
  })

  it(`Add NFT to user1 FIO Address`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: [{
              "chain_code":"ETH","contract_address":"0x123456789ABCDEF", "token_id":"1", "url":"", "hash":"","metadata":""
            }],
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      })
      //console.log(`Result: `, result)
      expect(result.status).to.equal('OK')

    } catch (err) {
     //console.log(err.message)
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

  it(`Remove NFT from user1 FIO Address`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: [{
              "chain_code":"ETH","contract_address":"0x123456789ABCDEF", "token_id":"1", "url":"", "hash":"","metadata":""
            }],
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      })
      //console.log(`Result: `, result)
      expect(result.status).to.equal('OK')

    } catch (err) {
     console.log(err.message)
    }
  })

  it(`Add 3 NFTs to user1 FIO Address`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: [{
              "chain_code":"ETH","contract_address":"0x123456789ABCDEF", "token_id":"7", "url":"", "hash":"","metadata":""
            },{
              "chain_code":"ETH","contract_address":"0x123456789ABCDEF", "token_id":"8", "url":"", "hash":"","metadata":""
            },{
              "chain_code":"ETH","contract_address":"0x123456789ABCDEF", "token_id":"9", "url":"", "hash":"","metadata":""
            }],
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      })
      //console.log(`Result: `, result)
      expect(result.status).to.equal('OK')

    } catch (err) {
     //console.log(err.message)
     expect(err).to.equal(null);
    }
  })

  it('Wait 2 seconds. (Slower test systems)', async () => {
    await timeout(2000);
  })

  it(`Remove all NFTs from user1 FIO Address`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remallnfts',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      })
      //console.log(`Result: `, result)
      expect(result.status).to.equal('OK')

    } catch (err) {
     console.log(err.message)
    }
  })

  it(`Add 3 NFTs to user2 FIO Address`, async () => {
    try {
      const result = await user2.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: user2.address,
          nfts: [{
              "chain_code":"ETH","contract_address":"0x123456789ABCDEF", "token_id":"10", "url":"", "hash":"","metadata":""
            },{
              "chain_code":"ETH","contract_address":"0x123456789ABCDEF", "token_id":"11", "url":"", "hash":"","metadata":""
            },{
              "chain_code":"ETH","contract_address":"0x123456789ABCDEF", "token_id":"12", "url":"", "hash":"","metadata":""
            }],
          max_fee: 5000000000,
          actor: user2.account,
          tpid: ""
        }
      })
      //console.log(`Result: `, result)
      expect(result.status).to.equal('OK')

    } catch (err) {
     //console.log(err.message)
     expect(err).to.equal(null);
    }
  })

  it('Wait 2 seconds. (Slower test systems)', async () => {
    await timeout(2000);
  })

  it(`Transfer address from user2 to user3`, async () => {
      try {
        const result = await user2.sdk.genericAction('pushTransaction', {
          action: 'xferaddress',
          account: 'fio.address',
          data: {
            fio_address: user2.address,
            new_owner_fio_public_key: user3.publicKey,
            max_fee: 50000000000,
            actor: user2.account,
            tpid: ""
          }
        })
        //console.log(`Result: `, result)
        expect(result.status).to.equal('OK')

      } catch (err) {
       //console.log(err.message)
       expect(err).to.equal(null);
      }
    })

  it(`verify user2 NFTs were burned on address transfer`, async () => {
    try {
      const json = {
        "fio_address": user2.address
      }
      const result = await callFioApi("get_nfts_fio_address", json);
    } catch (err) {
      //console.log('Error', err)
      expect(err.error.message).to.equal("No NFTS are mapped");
      expect(err.statusCode).to.equal(404);
    }
  })

  it(`Add NFT to user3 FIO Address`, async () => {
    try {
      const result = await user3.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: user3.address,
          nfts: [{
              "chain_code":"ETH","contract_address":"0x123456789ABCDEF", "token_id":"999", "url":"", "hash":"B8CB100B12807BD8A8267800477EE5BA4BD387E840BBEDF02E31787CA9430BB0","metadata":""
            }],
          max_fee: 5000000000,
          actor: user3.account,
          tpid: ""
        }
      })
      //console.log(`Result: `, result)
      expect(result.status).to.equal('OK')
    } catch (err) {
     //console.log(err.message)
     expect(err).to.equal(null);
    }
  })

  it(`verify user3 has NFT with get_nfts_contract endpoint`, async () => {
    try {
      const json = {
          "chain_code": "ETH",
          "contract_address": "0x123456789ABCDEF",
          "token_id":"999"
      }
      result = await callFioApi("get_nfts_contract", json);
      expect(result.nfts.length).to.not.equal(0)
      expect(result.nfts[0].chain_code).to.equal("ETH")
      expect(result.nfts[0].contract_address).to.equal("0x123456789ABCDEF")
      expect(result.nfts[0].token_id).to.equal("999")
    } catch (err) {
      //console.log('Error', err)
      expect(err).to.equal(null);
    }


    });

    it(`verify user3 has NFT with get_nfts_hash endpoint`, async () => {
      try {
        const json = {
            "hash": "B8CB100B12807BD8A8267800477EE5BA4BD387E840BBEDF02E31787CA9430BB0",
        }
        result = await callFioApi("get_nfts_hash", json);
        expect(result.nfts.length).to.not.equal(0)
        expect(result.nfts[0].chain_code).to.equal("ETH")
        expect(result.nfts[0].contract_address).to.equal("0x123456789ABCDEF")
        expect(result.nfts[0].token_id).to.equal("999")
      } catch (err) {
        //console.log('Error', err)
        expect(err).to.equal(null);
      }
    });
});

describe(`B. Mint an unreasonable number of NFTs`, () => {
  let user1, user2, user3;

  const fundsAmount = 10000000000000;

  before(async () => {
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
    user3 = await newUser(faucet);
  });

  it(`add 50 NFTs, expect Error Min 1, Max 3 NFTs are allowed`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: mintNfts(50),
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      })
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].error).to.equal('Min 1, Max 3 NFTs are allowed');
    }
  });

  it(`add 4 NFTs, expect Error Min 1, Max 3 NFTs are allowed`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: mintNfts(4),
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      })
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].error).to.equal('Min 1, Max 3 NFTs are allowed');
    }
  });

  it(`add 0 NFTs, expect Error Min 1, Max 3 NFTs are allowed`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: mintNfts(0),
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      })
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].error).to.equal('Min 1, Max 3 NFTs are allowed');
    }
  });

  it(`add an improperly formatted NFT (missing chain_code), expect Error TBD`, async () => {
    let nfts = [{
      // "chain_code":"ETH",
      "contract_address":"0x123456789ABCDEF",
      "token_id":"1",
      "url":"",
      "hash":"",
      "metadata":""
    }];
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: nfts,
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      })
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('missing nftparam.chain_code (type=string)');
    }
  });

  it(`add an improperly formatted NFT (missing contract_address), expect Error TBD`, async () => {
    let nfts = [{
      "chain_code":"ETH",
      // "contract_address":"0x123456789ABCDEF",
      "token_id":"1",
      "url":"",
      "hash":"",
      "metadata":""
    }];
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: nfts,
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      })
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('missing nftparam.contract_address (type=string)');
    }
  });

  it(`add an improperly formatted NFT (missing token_id), expect Error TBD`, async () => {
    let nfts = [{
      "chain_code":"ETH",
      "contract_address":"0x123456789ABCDEF",
      // "token_id":"1",
      "url":"",
      "hash":"",
      "metadata":""
    }];
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: nfts,
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      })
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('missing nftparam.token_id (type=string)');
    }
  });

  it(`add an improperly formatted NFT (missing url), expect Error TBD`, async () => {
    let nfts = [{
      "chain_code":"ETH",
      "contract_address":"0x123456789ABCDEF",
      "token_id":"1",
      // "url":"",
      "hash":"",
      "metadata":""
    }];
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: nfts,
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      })
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('missing nftparam.url (type=string)');
    }
  });

  it(`add an improperly formatted NFT (missing hash), expect Error TBD`, async () => {
    let nfts = [{
      "chain_code":"ETH",
      "contract_address":"0x123456789ABCDEF",
      "token_id":"1",
      "url":"",
      // "hash":"",
      "metadata":""
    }];
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: nfts,
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      })
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('missing nftparam.hash (type=string)');
    }
  });

  it(`add an improperly formatted NFT (missing metadata), expect Error TBD`, async () => {
    let nfts = [{
      "chain_code":"ETH",
      "contract_address":"0x123456789ABCDEF",
      "token_id":"1",
      "url":"",
      "hash":"",
      // "metadata":""
    }];
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: nfts,
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      })
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('missing nftparam.metadata (type=string)');
    }
  });
});

describe(`C. Remove more NFTs than minted`, () => {
  let user1, user2, user3;

  const fundsAmount = 10000000000000;
  const addedNfts = mintNfts(2);

  before(async () => {
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
    user3 = await newUser(faucet);
    const nft = await user1.sdk.genericAction('pushTransaction', {
      action: 'addnft',
      account: 'fio.address',
      data: {
        fio_address: user1.address,
        nfts: addedNfts,
        max_fee: 5000000000,
        actor: user1.account,
        tpid: ""
      }
    })
    expect(nft.status).to.equal('OK');
  });

  it(`verify user1 NFTs are present in table`, async () => {
    const json = {
      "fio_address": user1.address
    }
    try {
      const result = await callFioApi("get_nfts_fio_address", json);
      expect(result.nfts.length).to.not.equal(0);
      expect(result.nfts[0].chain_code).to.equal("ETH");
      expect(result.nfts[0].contract_address).to.equal("0x123456789ABCDEF");
      expect(result.nfts[0].token_id).to.equal("1");
      expect(result.nfts[1].chain_code).to.equal("ETH");
      expect(result.nfts[1].contract_address).to.equal("0x123456789ABCDEF");
      expect(result.nfts[1].token_id).to.equal("2");
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it(`user1 tries to remove 3 NFTs when only 2 are minted, expect the nonexistent one to simply be ignored`, async () => {
    let nfts = mintNfts(2);
    nfts = nfts.concat([{
      "chain_code":"ETH","contract_address":"0x123456789ABCDEF", "token_id":"77932", "url":"", "hash":"","metadata":"nonexistent"
    }]);
    // try {
    const result = await user1.sdk.genericAction('pushTransaction', {
      action: 'remnft',
      account: 'fio.address',
      data: {
        fio_address: user1.address,
        nfts: nfts,
        max_fee: 5000000000,
        actor: user1.account,
        tpid: ""
      }
    })
    expect(result.status).to.equal('OK')
    // } catch (err) {
    //   console.log(err.message);
    //   //TODO: Should a bad entry in the nfts list be ignored or throw an exception?
    // }
  });

  it(`verify no user1 NFTs are present in table`, async () => {
    const json = {
      "fio_address": user1.address
    }
    try {
      const result = await callFioApi("get_nfts_fio_address", json);
      expect(result.nfts.length).to.equal(0);
    } catch (err) {
      expect(err).to.have.all.keys('name', 'statusCode', 'message', 'error', 'options', 'response');
      expect(err.statusCode).to.equal(404);
      expect(err.message).to.equal('404 - {"message":"No NFTS are mapped"}');
    }
  });

  it(`Remove an NFT that does not exist from user1 FIO Address, expect Error NFT not currently mapped`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: [{
            "chain_code":"ETH","contract_address":"0x123456789ABCDEF", "token_id":"77932", "url":"", "hash":"","metadata":"donkey"
          }],
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      })
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].value).to.equal(user1.address);
      expect(err.json.fields[0].error).to.equal('NFT not currently mapped');
    }
  });

  // TODO: mint some more in a couple transactions, try to remove more than was minted
});

describe(`D. (unhappy) Try to add NFTs with invalid user input`, () => {
  let user1, user2, user3;

  const fundsAmount = 10000000000000;
  const user1Nfts = mintNfts(2);

  before(async () => {
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
    user3 = await newUser(faucet);
  });

  it(`(missing chain_code) Try to add an NFT to user1 FIO Address, expect Error`, async () => {
    let badUser1Nfts = user1Nfts.concat({
      // "chain_code":"ETH",
      "contract_address":"0x123456789ABCDEF",
      "token_id":"77932",
      "url":"",
      "hash":"",
      "metadata":""
    });
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: badUser1Nfts,
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      })
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      expect(err.message).to.equal('missing nftparam.chain_code (type=string)');
    }
  });
  it(`(missing contract_address) Try to add an NFT to user1 FIO Address, expect Error`, async () => {
    let badUser1Nfts = user1Nfts.concat({
      "chain_code":"ETH",
      //"contract_address":"0x123456789ABCDEF",
      "token_id":"77932",
      "url":"",
      "hash":"",
      "metadata":""
    });
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: badUser1Nfts,
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      })
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      expect(err.message).to.equal('missing nftparam.contract_address (type=string)');
    }
  });
  it(`(missing token_id) Try to add an NFT to user1 FIO Address, expect Error`, async () => {
    let badUser1Nfts = user1Nfts.concat({
      "chain_code":"ETH",
      "contract_address":"0x123456789ABCDEF",
      // "token_id":"77932",
      "url":"",
      "hash":"",
      "metadata":""
    });
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: badUser1Nfts,
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      })
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      expect(err.message).to.equal('missing nftparam.token_id (type=string)');
    }
  });
  it(`(missing url) Try to add an NFT to user1 FIO Address, expect Error`, async () => {
    let badUser1Nfts = user1Nfts.concat({
      "chain_code":"ETH",
      "contract_address":"0x123456789ABCDEF",
      "token_id":"77932",
      // "url":"",
      "hash":"",
      "metadata":""
    });
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: badUser1Nfts,
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      })
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      expect(err.message).to.equal('missing nftparam.url (type=string)');
    }
  });
  it(`(missing hash) Try to add an NFT to user1 FIO Address, expect Error`, async () => {
    let badUser1Nfts = user1Nfts.concat({
      "chain_code":"ETH",
      "contract_address":"0x123456789ABCDEF",
      "token_id":"77932",
      "url":"",
      // "hash":"",
      "metadata":""
    });
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: badUser1Nfts,
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      })
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      expect(err.message).to.equal('missing nftparam.hash (type=string)');
    }
  });
  it(`(missing metadata) Try to add an NFT to user1 FIO Address, expect Error`, async () => {
    let badUser1Nfts = user1Nfts.concat({
      "chain_code":"ETH",
      "contract_address":"0x123456789ABCDEF",
      "token_id":"77932",
      "url":"",
      "hash":"",
      // "metadata":""
    });
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: badUser1Nfts,
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      })
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      expect(err.message).to.equal('missing nftparam.metadata (type=string)');
    }
  });

  it(`(invalid chain_code) Try to add an NFT to user1 FIO Address, expect Error`, async () => {
    let badUser1Nfts = user1Nfts.concat({
      "chain_code":"invalid!3",
      "contract_address":"0x123456789ABCDEF",
      "token_id":"77932",
      "url":"",
      "hash":"",
      "metadata":""
    });
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: badUser1Nfts,
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      })
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].error).to.equal('Invalid chain code format');
    }
  });
  it.skip(`(invalid contract_address) Try to add an NFT to user1 FIO Address, expect Error`, async () => {
    let badUser1Nfts = user1Nfts.concat({
      "chain_code":"ETH",
      "contract_address":"inv@71#D",
      "token_id":"77932",
      "url":"",
      "hash":"",
      "metadata":""
    });
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: badUser1Nfts,
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      })
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      expect(err.message).to.equal('missing nftparam.contract_address (type=string)');
    }
  });
  it.skip(`(invalid token_id) Try to add an NFT to user1 FIO Address, expect Error`, async () => {
    let badUser1Nfts = user1Nfts.concat({
      "chain_code":"ETH",
      "contract_address":"0x123456789ABCDEF",
      "token_id":"1nv@71D#!",
      "url":"",
      "hash":"",
      "metadata":""
    });
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: badUser1Nfts,
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      })
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      expect(err.message).to.equal('missing nftparam.token_id (type=string)');
    }
  });
  it.skip(`(invalid url) Try to add an NFT to user1 FIO Address, expect Error`, async () => {
    let badUser1Nfts = user1Nfts.concat({
      "chain_code":"ETH",
      "contract_address":"0x123456789ABCDEF",
      "token_id":"77932",
      "url":"inv@71D!#",
      "hash":"",
      "metadata":""
    });
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: badUser1Nfts,
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      })
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      expect(err.message).to.equal('missing nftparam.url (type=string)');
    }
  });
  it(`(invalid hash) Try to add an NFT to user1 FIO Address, expect Error`, async () => {
    let badUser1Nfts = user1Nfts.concat({
      "chain_code":"ETH",
      "contract_address":"0x123456789ABCDEF",
      "token_id":"77932",
      "url":"",
      "hash":"!nv@7!d#",
      "metadata":""
    });
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: badUser1Nfts,
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      })
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].error).to.equal('Invalid hash');
    }
  });
  it.skip(`(invalid metadata) Try to add an NFT to user1 FIO Address, expect Error`, async () => {
    let badUser1Nfts = user1Nfts.concat({
      "chain_code":"ETH",
      "contract_address":"0x123456789ABCDEF",
      "token_id":"1",
      "url":"",
      "hash":"",
      "metadata":"!nv@7!d#$"
    });
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: badUser1Nfts,
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      })
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      expect(err.message).to.equal('missing nftparam.metadata (type=string)');
    }
  });

  it(`(empty chain_code) Try to add an NFT to user1 FIO Address, expect Error`, async () => {
    let badUser1Nfts = user1Nfts.concat({
      "chain_code":"",
      "contract_address":"0x123456789ABCDEF",
      "token_id":"77932",
      "url":"",
      "hash":"",
      "metadata":""
    });
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: badUser1Nfts,
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      })
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].error).to.equal('Invalid chain code format');
    }
  });
  it(`(empty contract_address) Try to add an NFT to user1 FIO Address, expect Error`, async () => {
    let badUser1Nfts = user1Nfts.concat({
      "chain_code":"ETH",
      "contract_address":"",
      "token_id":"77932",
      "url":"",
      "hash":"",
      "metadata":""
    });
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: badUser1Nfts,
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      })
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].error).to.equal('Invalid Contract Address');
    }
  });
  it.skip(`(empty token_id) Try to add an NFT to user1 FIO Address, expect Error`, async () => {
    let badUser1Nfts = user1Nfts.concat({
      "chain_code":"ETH",
      "contract_address":"0x123456789ABCDEF",
      "token_id":"",
      "url":"",
      "hash":"",
      "metadata":""
    });
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: badUser1Nfts,
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      })
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      expect(err.message).to.equal('missing nftparam.token_id (type=string)');
    }
  });

  it(`(negative chain_code) Try to add an NFT to user1 FIO Address, expect Error`, async () => {
    let badUser1Nfts = user1Nfts.concat({
      "chain_code": -100,
      "contract_address":"0x123456789ABCDEF",
      "token_id":"1",
      "url":"",
      "hash":"",
      "metadata":""
    });
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: badUser1Nfts,
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      })
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].error).to.equal('Invalid chain code format');
    }
  });
  it.skip(`(negative contract_address) Try to add an NFT to user1 FIO Address, expect Error`, async () => {
    let badUser1Nfts = user1Nfts.concat({
      "chain_code":"ETH",
      "contract_address":-100,
      "token_id":"77932",
      "url":"",
      "hash":"",
      "metadata":""
    });
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: badUser1Nfts,
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      })
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].error).to.equal('Invalid Contract Address');    }
  });
  it.skip(`(negative token_id) Try to add an NFT to user1 FIO Address, expect Error`, async () => {
    let badUser1Nfts = user1Nfts.concat({
      "chain_code":"ETH",
      "contract_address":"0x123456789ABCDEF",
      "token_id":-77932,
      "url":"",
      "hash":"",
      "metadata":""
    });
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: badUser1Nfts,
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      })
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      expect(err.message).to.equal('missing nftparam.token_id (type=string)');
    }
  });

  it(`(missing fio_address) Try to add an NFT to user1, expect Error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          // fio_address: user1.address,
          nfts: mintNfts(1),
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      })
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('missing addnft.fio_address (type=string)');
    }
  });
  it(`(invalid fio_address) Try to add an NFT to user1, expect Error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: '~!nv@7!d',
          nfts: mintNfts(1),
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      })
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].error).to.equal('Invalid FIO Address');
    }
  });
  it(`(empty fio_address) Try to add an NFT to user1, expect Error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: "",
          nfts: mintNfts(1),
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      })
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].error).to.equal('Invalid FIO Address');
    }
  });
  it(`(negative fio_address) Try to add an NFT to user1, expect Error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: -100,
          nfts: mintNfts(1),
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      })
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].error).to.equal('Invalid FIO Address');
    }
  });

  it(`(missing nfts) Try to add an NFT to user1, expect Error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          //nfts: mintNfts(1),
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      })
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('missing addnft.nfts (type=nftparam[])');
    }
  });
  it(`(invalid nfts) Try to add an NFT to user1, expect Error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: ['invalid'],
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      })
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('expected object containing data: "invalid"');
    }
  });

  it(`(missing max_fee) Try to add an NFT to user1, expect Error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: mintNfts(1),
          // max_fee: -1,
          actor: user1.account,
          tpid: ""
        }
      })
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('missing addnft.max_fee (type=int64)');
    }
  });
  it(`(max_fee=-1) Try to add an NFT to user1, expect Error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: mintNfts(1),
          max_fee: -1,
          actor: user1.account,
          tpid: ""
        }
      })
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].error).to.equal('Invalid fee value');
    }
  });
  it(`(invalid max_fee) Try to add an NFT to user1, expect Error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: mintNfts(1),
          max_fee: "@invalid!$#",
          actor: user1.account,
          tpid: ""
        }
      })
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('invalid number');
    }
  });

  it(`consume user1's remaining bundled transactions`, async () => {
    try {
      await consumeRemainingBundles(user1, user3);
    } catch (err) {
      expect(err).to.equal(null);
    } finally {
      let bundleCount = await getBundleCount(user1.sdk);
      expect(bundleCount).to.equal(0);
    }
  });

  it(`(max_fee=1, zero bundles) Try to add an NFT to user1, expect Error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: mintNfts(1),
          max_fee: 1,
          actor: user1.account,
          tpid: ""
        }
      })
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].error).to.equal('Fee exceeds supplied maximum.');
    }
  });
  it(`(invalid max_fee, zero bundles) Try to add an NFT to user1, expect Error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: mintNfts(1),
          max_fee: "@invalid!$#",
          actor: user1.account,
          tpid: ""
        }
      })
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('invalid number');
    }
  });
  it(`(empty max_fee, zero bundles) Try to add an NFT to user1, expect Error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: mintNfts(1),
          max_fee: "",
          actor: user1.account,
          tpid: ""
        }
      })
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].error).to.equal('Fee exceeds supplied maximum.');
    }
  });

  it(`transfer remaining balance`, async () => {
    let bal = await user1.sdk.genericAction('getFioBalance', {});
    const result = await user1.sdk.genericAction('transferTokens', {
      payeeFioPublicKey: user3.publicKey,
      amount: bal.available - config.api.transfer_tokens_pub_key.fee,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      tpid: '',
    });
    let newBal = await user1.sdk.genericAction('getFioBalance', {});
    expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected');
    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(config.api.transfer_tokens_pub_key.fee);
    expect(newBal.available).to.equal(0);
  });
  it(`(valid request, zero bundles, zero balance) Try to add an NFT to user1, expect Error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: mintNfts(3),
          max_fee: 300000000,
          actor: user1.account,
          tpid: ""
        }
      })
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].error).to.equal('Insufficient funds to cover fee');
    }
  });

  it(`verify the bad NFT is NOT present in table`, async () => {
    const json = {
      "fio_address": user1.address
    }
    try {
      const result = await callFioApi("get_nfts_fio_address", json);
      expect(result.nfts.length).to.equal(0);
    } catch (err) {
      expect(err).to.have.all.keys('name', 'statusCode', 'message', 'error', 'options', 'response');
      expect(err.statusCode).to.equal(404);
      expect(err.message).to.equal('404 - {"message":"No NFTS are mapped"}');
    }
  });
});

describe(`E. (unhappy) Try to remove NFTs with invalid user input`, () => {
  let user1, user2, user3;

  const fundsAmount = 10000000000000;
  const user1Nfts = mintNfts(2);

  before(async () => {
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
    user3 = await newUser(faucet);
    const nft = await user1.sdk.genericAction('pushTransaction', {
      action: 'addnft',
      account: 'fio.address',
      data: {
        fio_address: user1.address,
        nfts: user1Nfts,
        max_fee: 5000000000,
        actor: user1.account,
        tpid: ""
      }
    })
    expect(nft.status).to.equal('OK');
  });

  it(`verify user1 NFTs are present in table`, async () => {
    try {
      const result = await callFioApi("get_nfts_fio_address", {
        "fio_address": user1.address
      });
      expect(result.nfts.length).to.not.equal(0);
      expect(result.nfts[0].chain_code).to.equal("ETH");
      expect(result.nfts[0].contract_address).to.equal("0x123456789ABCDEF");
      expect(result.nfts[0].token_id).to.equal("1");
      expect(result.nfts[1].chain_code).to.equal("ETH");
      expect(result.nfts[1].contract_address).to.equal("0x123456789ABCDEF");
      expect(result.nfts[1].token_id).to.equal("2");
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it(`(missing chain_code) try to burn an NFT for user1, expect error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: [{
            // "chain_code":"ETH",
            "contract_address":"0x123456789ABCDEF",
            "token_id":"1",
            "url":"",
            "hash":"",
            "metadata":""
          }],
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('missing remnftparam.chain_code (type=string)');
    }
  });
  it(`(missing contract_address) try to burn an NFT for user1, expect error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: [{
            "chain_code":"ETH",
            // "contract_address":"0x123456789ABCDEF",
            "token_id":"1",
            "url":"",
            "hash":"",
            "metadata":""
          }],
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('missing remnftparam.contract_address (type=string)');
    }
  });
  it(`(missing token_id) try to burn an NFT for user1, expect error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: [{
            "chain_code":"ETH",
            "contract_address":"0x123456789ABCDEF",
            // "token_id":"1",
            "url":"",
            "hash":"",
            "metadata":""
          }],
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('missing remnftparam.token_id (type=string)');
    }
  });
  it.skip(`(missing url) try to burn an NFT for user1, expect error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: [{
            "chain_code":"ETH",
            "contract_address":"0x123456789ABCDEF",
            "token_id":"1",
            // "url":"",
            "hash":"",
            "metadata":""
          }],
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].value).to.equal(user1.address);
      expect(err.json.fields[0].error).to.equal('NFT not currently mapped')
    }
  });
  it.skip(`(missing hash) try to burn an NFT for user1, expect error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: [{
            "chain_code":"ETH",
            "contract_address":"0x123456789ABCDEF",
            "token_id":"1",
            "url":"",
            // "hash":"",
            "metadata":""
          }],
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].value).to.equal(user1.address);
      expect(err.json.fields[0].error).to.equal('NFT not currently mapped')
    }
  });
  it.skip(`(missing metadata) try to burn an NFT for user1, expect error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: [{
            "chain_code":"ETH",
            "contract_address":"0x123456789ABCDEF",
            "token_id":"1",
            "url":"",
            "hash":"",
            // "metadata":""
          }],
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].value).to.equal(user1.address);
      expect(err.json.fields[0].error).to.equal('NFT not currently mapped')
    }
  });

  it(`(invalid chain_code) try to burn an NFT for user1, expect error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: [{
            "chain_code":"!invalid$#",
            "contract_address":"0x123456789ABCDEF",
            "token_id":"1",
            "url":"",
            "hash":"",
            "metadata":""
          }],
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].error).to.equal('Invalid chain code format');
    }
  });
  it(`(invalid contract_address) try to burn an NFT for user1, expect error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: [{
            "chain_code":"ETH",
            "contract_address":"!invalid$#",
            // "contract_address":"0x123456789ABCDEF",
            "token_id":"1",
            "url":"",
            "hash":"",
            "metadata":""
          }],
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].error).to.equal('NFT not currently mapped');
    }
  });
  it(`(invalid token_id) try to burn an NFT for user1, expect error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: [{
            "chain_code":"ETH",
            "contract_address":"0x123456789ABCDEF",
            "token_id":"!#inv@lid$",
            "url":"",
            "hash":"",
            "metadata":""
          }],
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].error).to.equal('NFT not currently mapped');
    }
  });
  it.skip(`(invalid url) try to burn an NFT for user1, expect error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: [{
            "chain_code":"ETH",
            "contract_address":"0x123456789ABCDEF",
            "token_id":"1",
            "url":"!inv@liD$%#",
            "hash":"",
            "metadata":""
          }],
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].value).to.equal(user1.address);
      expect(err.json.fields[0].error).to.equal('NFT not currently mapped')
    }
  });
  it.skip(`(invalid hash) try to burn an NFT for user1, expect error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: [{
            "chain_code":"ETH",
            "contract_address":"0x123456789ABCDEF",
            "token_id":"1",
            "url":"",
            "hash":"!inv@l1D#$%",
            "metadata":""
          }],
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].value).to.equal(user1.address);
      expect(err.json.fields[0].error).to.equal('NFT not currently mapped')
    }
  });
  it.skip(`(invalid metadata) try to burn an NFT for user1, expect error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: [{
            "chain_code":"ETH",
            "contract_address":"0x123456789ABCDEF",
            "token_id":"1",
            "url":"",
            "hash":"",
            "metadata":"!inv@l1D#$%"
          }],
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].value).to.equal(user1.address);
      expect(err.json.fields[0].error).to.equal('NFT not currently mapped');
    }
  });

  it(`(empty chain_code) try to burn an NFT for user1, expect error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: [{
            "chain_code":"",
            "contract_address":"0x123456789ABCDEF",
            "token_id":"1",
            "url":"",
            "hash":"",
            "metadata":""
          }],
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].error).to.equal('Invalid chain code format');
    }
  });
  it(`(empty contract_address) try to burn an NFT for user1, expect error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: [{
            "chain_code":"ETH",
            "contract_address":"",
            "token_id":"1",
            "url":"",
            "hash":"",
            "metadata":""
          }],
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].error).to.equal('Invalid Contract Address');
    }
  });
  it(`(empty token_id) try to burn an NFT for user1, expect error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: [{
            "chain_code":"ETH",
            "contract_address":"0x123456789ABCDEF",
            "token_id":"",
            "url":"",
            "hash":"",
            "metadata":""
          }],
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].value).to.equal(user1.address);
      expect(err.json.fields[0].error).to.equal('NFT not currently mapped');
    }
  });

  it(`(negative chain_code) try to burn an NFT for user1, expect error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: [{
            "chain_code": -100,
            "contract_address":"0x123456789ABCDEF",
            "token_id":"1",
            "url":"",
            "hash":"",
            "metadata":""
          }],
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].error).to.equal('Invalid chain code format');
    }
  });
  it(`(negative contract_address) try to burn an NFT for user1, expect error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: [{
            "chain_code":"ETH",
            "contract_address":-100,
            "token_id":"1",
            "url":"",
            "hash":"",
            "metadata":""
          }],
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].error).to.equal('NFT not currently mapped');   //('Invalid Contract Address');
    }
  });
  it(`(negative token_id) try to burn an NFT for user1, expect error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: [{
            "chain_code":"ETH",
            "contract_address":"0x123456789ABCDEF",
            "token_id": -100,
            "url":"",
            "hash":"",
            "metadata":""
          }],
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].value).to.equal(user1.address);
      expect(err.json.fields[0].error).to.equal('NFT not currently mapped');
    }
  });

  it(`(missing fio_address) try to burn an NFT for user1, expect error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remnft',
        account: 'fio.address',
        data: {
          //fio_address: user1.address,
          nfts: [{
            "chain_code":"ETH",
            "contract_address":"0x123456789ABCDEF",
            "token_id":"1",
            "url":"",
            "hash":"",
            "metadata":""
          }],
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      })
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      expect(err.message).to.equal('missing remnft.fio_address (type=string)');
    }
  });
  it(`(invalid fio_address) try to burn an NFT for user1, expect error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remnft',
        account: 'fio.address',
        data: {
          fio_address: "invalid!@address$#",
          nfts: [{
            "chain_code":"ETH",
            "contract_address":"0x123456789ABCDEF",
            "token_id":"1",
            "url":"",
            "hash":"",
            "metadata":""
          }],
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      })
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].error).to.equal('Invalid FIO Address');
    }
  });
  it(`(empty fio_address) try to burn an NFT for user1, expect error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remnft',
        account: 'fio.address',
        data: {
          fio_address: "",
          nfts: [{
            "chain_code":"ETH",
            "contract_address":"0x123456789ABCDEF",
            "token_id":"1",
            "url":"",
            "hash":"",
            "metadata":""
          }],
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      })
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].error).to.equal('Invalid FIO Address');
    }
  });
  it(`(negative fio_address) try to burn an NFT for user1, expect error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remnft',
        account: 'fio.address',
        data: {
          fio_address: -100,
          nfts: [{
            "chain_code":"ETH",
            "contract_address":"0x123456789ABCDEF",
            "token_id":"1",
            "url":"",
            "hash":"",
            "metadata":""
          }],
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      })
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].error).to.equal('Invalid FIO Address');
    }
  });

  it(`(missing nfts) try to burn an NFT for user1, expect error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          // nfts: [{
          //   "chain_code":"ETH",
          //   "contract_address":"0x123456789ABCDEF",
          //   "token_id":"1",
          //   "url":"",
          //   "hash":"",
          //   "metadata":""
          // }],
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('missing remnft.nfts (type=remnftparam[])');
    }
  });
  it(`(invalid nfts) try to burn an NFT for user1, expect error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: ["invalid!#$"],
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('expected object containing data: "invalid!#$"');
    }
  });

  it(`(missing max_fee) try to burn an NFT for user1, expect error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: [{
            "chain_code":"ETH",
            "contract_address":"0x123456789ABCDEF",
            "token_id":"1",
            "url":"",
            "hash":"",
            "metadata":""
          }],
          // max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('missing remnft.max_fee (type=int64)');
    }
  });
  it(`(max_fee=-1) try to burn an NFT for user1, expect error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: [{
            "chain_code":"ETH",
            "contract_address":"0x123456789ABCDEF",
            "token_id":"1",
            "url":"",
            "hash":"",
            "metadata":""
          }],
          max_fee: -1,
          actor: user1.account,
          tpid: ""
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].error).to.equal('Invalid fee value');
    }
  });
  it(`(invalid max_fee) try to burn an NFT for user1, expect error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: [{
            "chain_code":"ETH",
            "contract_address":"0x123456789ABCDEF",
            "token_id":"1",
            "url":"",
            "hash":"",
            "metadata":""
          }],
          max_fee: '!inv@liD$#%',
          actor: user1.account,
          tpid: ""
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('invalid number');
    }
  });

  it(`consume user1's remaining bundled transactions`, async () => {
    try {
      await consumeRemainingBundles(user1, user3);
    } catch (err) {
      expect(err).to.equal(null);
    } finally {
      let bundleCount = await getBundleCount(user1.sdk);
      expect(bundleCount).to.equal(0);
    }
  });

  it(`(max_fee=1, zero bundles) Try to add an NFT to user1, expect Error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: [{
            "chain_code":"ETH",
            "contract_address":"0x123456789ABCDEF",
            "token_id":"1",
            "url":"",
            "hash":"",
            "metadata":""
          }],
          max_fee: 1,
          actor: user1.account,
          tpid: ""
        }
      })
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].error).to.equal('Fee exceeds supplied maximum.');
    }
  });
  it(`(invalid max_fee, zero bundles) Try to add an NFT to user1, expect Error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: [{
            "chain_code":"ETH",
            "contract_address":"0x123456789ABCDEF",
            "token_id":"1",
            "url":"",
            "hash":"",
            "metadata":""
          }],
          max_fee: '!inv@liD$#%',
          actor: user1.account,
          tpid: ""
        }
      })
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('invalid number');
    }
  });
  it(`(empty max_fee, zero bundles) Try to add an NFT to user1, expect Error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: [{
            "chain_code":"ETH",
            "contract_address":"0x123456789ABCDEF",
            "token_id":"1",
            "url":"",
            "hash":"",
            "metadata":""
          }],
          max_fee: '',
          actor: user1.account,
          tpid: ""
        }
      })
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].error).to.equal('Fee exceeds supplied maximum.');
    }
  });

  it(`transfer remaining balance`, async () => {
    let bal = await user1.sdk.genericAction('getFioBalance', {});
    const result = await user1.sdk.genericAction('transferTokens', {
      payeeFioPublicKey: user3.publicKey,
      amount: bal.available - config.api.transfer_tokens_pub_key.fee,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      tpid: '',
    });
    let newBal = await user1.sdk.genericAction('getFioBalance', {});
    expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected');
    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(config.api.transfer_tokens_pub_key.fee);
    expect(newBal.available).to.equal(0);
  });

  it(`(valid request, zero bundles, zero balance) Try to add an NFT to user1, expect Error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: [{
            "chain_code":"ETH",
            "contract_address":"0x123456789ABCDEF",
            "token_id":"1",
            "url":"",
            "hash":"",
            "metadata":""
          }],
          max_fee: "",
          actor: user1.account,
          tpid: ""
        }
      })
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].error).to.equal('Fee exceeds supplied maximum.');   //('Insufficient funds to cover fee');
    }
  });

  it(`verify user1 NFTs are present in table`, async () => {
    try {
      const result = await callFioApi("get_nfts_fio_address", {
        "fio_address": user1.address
      });
      expect(result.nfts.length).to.not.equal(0);
      expect(result.nfts[0].chain_code).to.equal("ETH");
      expect(result.nfts[0].contract_address).to.equal("0x123456789ABCDEF");
      expect(result.nfts[0].token_id).to.equal("1");
      expect(result.nfts[1].chain_code).to.equal("ETH");
      expect(result.nfts[1].contract_address).to.equal("0x123456789ABCDEF");
      expect(result.nfts[1].token_id).to.equal("2");
    } catch (err) {
      expect(err).to.equal(null);
    }
  });
});

describe(`F. (unhappy) Try to remove an NFT belonging to another user`, () => {
  let user1, user2, user3;

  const fundsAmount = 10000000000000;
  const user1Nfts = mintNfts(2);
  const user2Nfts = mintNfts(3);

  before(async () => {
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
    user3 = await newUser(faucet);
    const nftUser1 = await user1.sdk.genericAction('pushTransaction', {
      action: 'addnft',
      account: 'fio.address',
      data: {
        fio_address: user1.address,
        nfts: user1Nfts,
        max_fee: 5000000000,
        actor: user1.account,
        tpid: ""
      }
    })
    expect(nftUser1.status).to.equal('OK');
    const nftUser2 = await user2.sdk.genericAction('pushTransaction', {
      action: 'addnft',
      account: 'fio.address',
      data: {
        fio_address: user2.address,
        nfts: user2Nfts,
        max_fee: 5000000000,
        actor: user2.account,
        tpid: ""
      }
    })
    expect(nftUser2.status).to.equal('OK');
  });

  it(`verify user1 NFTs are present in table`, async () => {
    const json = {
      "fio_address": user1.address
    }
    try {
      const result = await callFioApi("get_nfts_fio_address", json);
      expect(result.nfts.length).to.not.equal(0);
      expect(result.nfts[0].chain_code).to.equal("ETH");
      expect(result.nfts[0].contract_address).to.equal("0x123456789ABCDEF");
      expect(result.nfts[0].token_id).to.equal("1");
      expect(result.nfts[1].chain_code).to.equal("ETH");
      expect(result.nfts[1].contract_address).to.equal("0x123456789ABCDEF");
      expect(result.nfts[1].token_id).to.equal("2");
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it(`verify user2 NFTs are present in table`, async () => {
    const json = {
      "fio_address": user2.address
    }
    try {
      const result = await callFioApi("get_nfts_fio_address", json);
      expect(result.nfts.length).to.not.equal(0);
      expect(result.nfts[0].chain_code).to.equal("ETH");
      expect(result.nfts[0].contract_address).to.equal("0x123456789ABCDEF");
      expect(result.nfts[0].token_id).to.equal("1");
      expect(result.nfts[1].chain_code).to.equal("ETH");
      expect(result.nfts[1].contract_address).to.equal("0x123456789ABCDEF");
      expect(result.nfts[1].token_id).to.equal("2");
      expect(result.nfts[2].chain_code).to.equal("ETH");
      expect(result.nfts[2].contract_address).to.equal("0x123456789ABCDEF");
      expect(result.nfts[2].token_id).to.equal("3");
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it(`user2 tries to remove user1's NFT, expect Error`, async () => {
    try {
      const result = await user2.sdk.genericAction('pushTransaction', {
        action: 'remnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: [user1Nfts[0]],
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      })
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      expect(err.json.message).to.equal('Request signature is not valid or this user is not allowed to sign this transaction.');
    }
  });

  it(`user3 tries to remove NFTs from user1 and user2, expect Error`, async () => {
    let theftTargets = [user1Nfts[0], user2Nfts[0]];
    try {
      const result = await user2.sdk.genericAction('pushTransaction', {
        action: 'remnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: theftTargets,
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      })
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      expect(err.json.message).to.equal('Request signature is not valid or this user is not allowed to sign this transaction.');
    }
  });

  it(`verify user1 NFTs are still in the table`, async () => {
    const json = {
      "fio_address": user1.address
    }
    try {
      const result = await callFioApi("get_nfts_fio_address", json);
      expect(result.nfts.length).to.not.equal(0);
      expect(result.nfts[0].chain_code).to.equal("ETH");
      expect(result.nfts[0].contract_address).to.equal("0x123456789ABCDEF");
      expect(result.nfts[0].token_id).to.equal("1");
      expect(result.nfts[1].chain_code).to.equal("ETH");
      expect(result.nfts[1].contract_address).to.equal("0x123456789ABCDEF");
      expect(result.nfts[1].token_id).to.equal("2");
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it(`verify user2 NFTs are still in the table`, async () => {
    const json = {
      "fio_address": user2.address
    }
    try {
      const result = await callFioApi("get_nfts_fio_address", json);
      expect(result.nfts.length).to.not.equal(0);
      expect(result.nfts[0].chain_code).to.equal("ETH");
      expect(result.nfts[0].contract_address).to.equal("0x123456789ABCDEF");
      expect(result.nfts[0].token_id).to.equal("1");
      expect(result.nfts[1].chain_code).to.equal("ETH");
      expect(result.nfts[1].contract_address).to.equal("0x123456789ABCDEF");
      expect(result.nfts[1].token_id).to.equal("2");
      expect(result.nfts[2].chain_code).to.equal("ETH");
      expect(result.nfts[2].contract_address).to.equal("0x123456789ABCDEF");
      expect(result.nfts[2].token_id).to.equal("3");
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it(`verify user3 has no NFTs in the table`, async () => {
    const json = {
      "fio_address": user3.address
    }
    try {
      const result = await callFioApi("get_nfts_fio_address", json);
      expect(result.nfts.length).to.equal(0);
    } catch (err) {
      expect(err).to.have.all.keys('name', 'statusCode', 'message', 'error', 'options', 'response');
      expect(err.statusCode).to.equal(404);
      expect(err.message).to.equal('404 - {"message":"No NFTS are mapped"}');
    }
  });
});

describe(`G. Add all NFTs to nftburnq at once using remallnfts`, () => {
  let user1, user2, user3;
  let feeAmt = 100000000;
  let user1Hash, user2Hash;

  const fundsAmount = 10000000000000;

  before(async () => {
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
    user3 = await newUser(faucet);

    //grab our user records from fionames so we can use their fio_address_hash
    let fionames = await callFioApi("get_table_rows", {
      json: true,               // Get the response as json
      code: 'fio.address',      // Contract that we target
      scope: 'fio.address',         // Account that owns the data
      table: 'fionames',        // Table name
      limit: 1000,                // Maximum number of rows that we want to get
      reverse: false,           // Optional: Get reversed data
      show_payer: false          // Optional: Show ram payer
    });
    fionames.rows = fionames.rows.slice(-3);    // only need the last 3 accounts
    try {
      user1Hash = fionames.rows[0].namehash
      user2Hash = fionames.rows[1].namehash
    } catch (err) {
      console.log('user namehash not found in table');
      throw err;
    }

    await user1.sdk.genericAction('pushTransaction', {
      action: 'addnft',
      account: 'fio.address',
      data: {
        fio_address: user1.address,
        nfts: mintNfts(3),
        max_fee: 5000000000,
        actor: user1.account,
        tpid: ""
      }
    });
    await user2.sdk.genericAction('pushTransaction', {
      action: 'addnft',
      account: 'fio.address',
      data: {
        fio_address: user2.address,
        nfts: mintNfts(3),
        max_fee: 5000000000,
        actor: user2.account,
        tpid: ""
      }
    });

    //verify user1 and user2 NFTs are present in table
    const user1Nfts = await callFioApi("get_nfts_fio_address", {
      "fio_address": user1.address
    });

    const user2Nfts = await callFioApi("get_nfts_fio_address", {
      "fio_address": user2.address
    });
    expect(user1Nfts.nfts.length).to.not.equal(0);
    expect(user1Nfts.nfts[0].chain_code).to.equal("ETH");
    expect(user1Nfts.nfts[0].contract_address).to.equal("0x123456789ABCDEF");
    expect(user1Nfts.nfts[0].token_id).to.equal("1");
    expect(user1Nfts.nfts[1].chain_code).to.equal("ETH");
    expect(user1Nfts.nfts[1].contract_address).to.equal("0x123456789ABCDEF");
    expect(user1Nfts.nfts[1].token_id).to.equal("2");
    expect(user1Nfts.nfts[2].chain_code).to.equal("ETH");
    expect(user1Nfts.nfts[2].contract_address).to.equal("0x123456789ABCDEF");
    expect(user1Nfts.nfts[2].token_id).to.equal("3");

    expect(user2Nfts.nfts.length).to.not.equal(0);
    expect(user2Nfts.nfts[0].chain_code).to.equal("ETH");
    expect(user2Nfts.nfts[0].contract_address).to.equal("0x123456789ABCDEF");
    expect(user2Nfts.nfts[0].token_id).to.equal("1");
    expect(user2Nfts.nfts[1].chain_code).to.equal("ETH");
    expect(user2Nfts.nfts[1].contract_address).to.equal("0x123456789ABCDEF");
    expect(user2Nfts.nfts[1].token_id).to.equal("2");
    expect(user2Nfts.nfts[2].chain_code).to.equal("ETH");
    expect(user2Nfts.nfts[2].contract_address).to.equal("0x123456789ABCDEF");
    expect(user2Nfts.nfts[2].token_id).to.equal("3");
  });

  it(`user1 removes all 3 NFTs`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remallnfts',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      });
      expect(result.status).to.equal('OK');
      expect(result.fee_collected).to.equal(0);
    } catch (err) {
      expect(err).to.equal(null)
    }
  });

  it(`verify a hash of user1.address added to nftburnq`, async () => {
    try {
      const result = await callFioApi("get_table_rows", json = {
        json: true,
        code: 'fio.address',
        scope: 'fio.address',
        table: 'nftburnq',
        lower_bound: user1Hash,
        upper_bound: user1Hash,
        key_type: 'i128',
        index_position: '2'
      });
      expect(result.rows.length).to.equal(1);
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it(`consume user2's remaining bundled transactions`, async () => {
    try {
      await consumeRemainingBundles(user2, user3);
    } catch (err) {
      expect(err).to.equal(null);
    } finally {
      let bundleCount = await getBundleCount(user2.sdk);
      expect(bundleCount).to.equal(0);
    }
  });

  it(`user2 removes all 3 NFTs, expect status=OK and fee_collected=${feeAmt}`, async () => {
    const result = await user2.sdk.genericAction('pushTransaction', {
      action: 'remallnfts',
      account: 'fio.address',
      data: {
        fio_address: user2.address,
        max_fee: feeAmt,
        actor: user2.account,
        tpid: ""
      }
    });
    expect(result.status).to.equal('OK');
    expect(result.fee_collected).to.equal(feeAmt);
  });

  it(`verify a hash of user2.address added to nftburnq`, async () => {
    try {
      const result = await callFioApi("get_table_rows", json = {
        json: true,
        code: 'fio.address',
        scope: 'fio.address',
        table: 'nftburnq',
        lower_bound: user2Hash,
        upper_bound: user2Hash,
        key_type: 'i128',
        index_position: '2'
      });
      expect(result.rows.length).to.equal(1);
    } catch (err) {
      expect(err).to.equal(null);
    }
  });
});

describe(`H. (unhappy) Try to burn all NFTs with invalid user input`, () => {
  let user1, user2, user3;
  let feeAmt = 100000000;
  const fundsAmount = 10000000000000;

  before(async () => {
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
    user3 = await newUser(faucet);
    await user1.sdk.genericAction('pushTransaction', {
      action: 'addnft',
      account: 'fio.address',
      data: {
        fio_address: user1.address,
        nfts: mintNfts(3),
        max_fee: 5000000000,
        actor: user1.account,
        tpid: ""
      }
    });

    await user2.sdk.genericAction('pushTransaction', {
      action: 'addnft',
      account: 'fio.address',
      data: {
        fio_address: user2.address,
        nfts: mintNfts(3),
        max_fee: 5000000000,
        actor: user2.account,
        tpid: ""
      }
    });

    //verify user1 and user2 NFTs are present in table
    const user1Nfts = await callFioApi("get_nfts_fio_address", {
      "fio_address": user1.address
    });

    const user2Nfts = await callFioApi("get_nfts_fio_address", {
      "fio_address": user2.address
    });
    expect(user1Nfts.nfts.length).to.not.equal(0);
    expect(user1Nfts.nfts[0].chain_code).to.equal("ETH");
    expect(user1Nfts.nfts[0].contract_address).to.equal("0x123456789ABCDEF");
    expect(user1Nfts.nfts[0].token_id).to.equal("1");
    expect(user1Nfts.nfts[1].chain_code).to.equal("ETH");
    expect(user1Nfts.nfts[1].contract_address).to.equal("0x123456789ABCDEF");
    expect(user1Nfts.nfts[1].token_id).to.equal("2");
    expect(user1Nfts.nfts[2].chain_code).to.equal("ETH");
    expect(user1Nfts.nfts[2].contract_address).to.equal("0x123456789ABCDEF");
    expect(user1Nfts.nfts[2].token_id).to.equal("3");

    expect(user2Nfts.nfts.length).to.not.equal(0);
    expect(user2Nfts.nfts[0].chain_code).to.equal("ETH");
    expect(user2Nfts.nfts[0].contract_address).to.equal("0x123456789ABCDEF");
    expect(user2Nfts.nfts[0].token_id).to.equal("1");
    expect(user2Nfts.nfts[1].chain_code).to.equal("ETH");
    expect(user2Nfts.nfts[1].contract_address).to.equal("0x123456789ABCDEF");
    expect(user2Nfts.nfts[1].token_id).to.equal("2");
    expect(user2Nfts.nfts[2].chain_code).to.equal("ETH");
    expect(user2Nfts.nfts[2].contract_address).to.equal("0x123456789ABCDEF");
    expect(user2Nfts.nfts[2].token_id).to.equal("3");
  });

  it(`(invalid fio_address) try to remove all 3 NFTs, expect error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remallnfts',
        account: 'fio.address',
        data: {
          fio_address: "invalid@address",
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.errorCode).to.equal(404);
      expect(err.json.fields[0].error).to.equal('Invalid FIO Address');
    }
  });
  it(`(empty fio_address) try to remove all 3 NFTs, expect error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remallnfts',
        account: 'fio.address',
        data: {
          fio_address: "",
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].error).to.equal('Invalid FIO Address');
    }
  });
  it(`(missing fio_address) try to remove all 3 NFTs, expect error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remallnfts',
        account: 'fio.address',
        data: {
          // fio_address: user1.address,
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('missing remallnfts.fio_address (type=string)');
    }
  });
  it(`(integer fio_address) try to remove all 3 NFTs, expect error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remallnfts',
        account: 'fio.address',
        data: {
          fio_address: 98737889500,
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].error).to.equal('Invalid FIO Address');
    }
  });
  it(`(negative fio_address) try to remove all 3 NFTs, expect error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remallnfts',
        account: 'fio.address',
        data: {
          fio_address: -100,
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].error).to.equal('Invalid FIO Address');
    }
  });

  it(`verify user1 NFTs are still present in table`, async () => {
    const json = {
      "fio_address": user1.address
    }
    try {
      const result = await callFioApi("get_nfts_fio_address", json);
      expect(result.nfts.length).to.not.equal(0);
      expect(result.nfts[0].chain_code).to.equal("ETH");
      expect(result.nfts[0].contract_address).to.equal("0x123456789ABCDEF");
      expect(result.nfts[0].token_id).to.equal("1");
      expect(result.nfts[1].chain_code).to.equal("ETH");
      expect(result.nfts[1].contract_address).to.equal("0x123456789ABCDEF");
      expect(result.nfts[1].token_id).to.equal("2");
      expect(result.nfts[2].chain_code).to.equal("ETH");
      expect(result.nfts[2].contract_address).to.equal("0x123456789ABCDEF");
      expect(result.nfts[2].token_id).to.equal("3");
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it(`(invalid max_fee) try to remove all 3 NFTs, expect error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remallnfts',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          max_fee: "invalid-fee",
          actor: user1.account,
          tpid: ""
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('invalid number');
    }
  });
  it(`(missing max_fee) try to remove all 3 NFTs, expect error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remallnfts',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          // max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('missing remallnfts.max_fee (type=int64)');
    }
  });
  it(`(negative max_fee) try to remove all 3 NFTs, expect error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remallnfts',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          max_fee: -5000000000,
          actor: user1.account,
          tpid: ""
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].error).to.equal('Invalid fee value');
    }
  });

  it(`verify user1 NFTs are still present in table`, async () => {
    const json = {
      "fio_address": user1.address
    }
    try {
      const result = await callFioApi("get_nfts_fio_address", json);
      expect(result.nfts.length).to.not.equal(0);
      expect(result.nfts[0].chain_code).to.equal("ETH");
      expect(result.nfts[0].contract_address).to.equal("0x123456789ABCDEF");
      expect(result.nfts[0].token_id).to.equal("1");
      expect(result.nfts[1].chain_code).to.equal("ETH");
      expect(result.nfts[1].contract_address).to.equal("0x123456789ABCDEF");
      expect(result.nfts[1].token_id).to.equal("2");
      expect(result.nfts[2].chain_code).to.equal("ETH");
      expect(result.nfts[2].contract_address).to.equal("0x123456789ABCDEF");
      expect(result.nfts[2].token_id).to.equal("3");
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  // BUG
  it.skip(`(invalid actor) try to remove all 3 NFTs, expect error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remallnfts',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          max_fee: 5000000000,
          actor: "invalidACtor1@",
          tpid: ""
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it.skip(`(empty actor) try to remove all 3 NFTs, expect error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remallnfts',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          max_fee: 5000000000,
          actor: "",
          tpid: ""
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it.skip(`(missing actor) try to remove all 3 NFTs, expect error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remallnfts',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          max_fee: 5000000000,
          // actor: user1.account,
          tpid: ""
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err).to.equal(null);
    }
  });
  it.skip(`(integer actor) try to remove all 3 NFTs, expect error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remallnfts',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          max_fee: 5000000000,
          actor: 98737889500,
          tpid: ""
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err).to.equal(null);
    }
  });
  it.skip(`(negative actor) try to remove all 3 NFTs, expect error`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remallnfts',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          max_fee: 5000000000,
          actor: -100,
          tpid: ""
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err).to.equal(null);
    }
  });
  it.skip(`verify user1 NFTs are still present in table`, async () => {
    const json = {
      "fio_address": user1.address
    }
    try {
      const result = await callFioApi("get_nfts_fio_address", json);
      expect(result.nfts.length).to.not.equal(0);
      expect(result.nfts[0].chain_code).to.equal("ETH");
      expect(result.nfts[0].contract_address).to.equal("0x123456789ABCDEF");
      expect(result.nfts[0].token_id).to.equal("1");
      expect(result.nfts[1].chain_code).to.equal("ETH");
      expect(result.nfts[1].contract_address).to.equal("0x123456789ABCDEF");
      expect(result.nfts[1].token_id).to.equal("2");
      expect(result.nfts[2].chain_code).to.equal("ETH");
      expect(result.nfts[2].contract_address).to.equal("0x123456789ABCDEF");
      expect(result.nfts[2].token_id).to.equal("3");
    } catch (err) {
      expect(err).to.equal(null);
    }
  });
});

//TODO: Test xferaddress since it now burns NFTs
//https://fioprotocol.atlassian.net/browse/BD-2840
describe(`I. Transfer a FIO address to another user and make sure any NFTs get burned`, () => {
  let user1, user2, user3;
  let user1Hash, user2Hash;
  let burnqnum, newBurnqnum = 0;

  const fundsAmount = 10000000000000;
  const user1Nfts = mintNfts(3);

  before(async () => {
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
    user3 = await newUser(faucet);
    const nft = await user1.sdk.genericAction('pushTransaction', {
      action: 'addnft',
      account: 'fio.address',
      data: {
        fio_address: user1.address,
        nfts: user1Nfts,
        max_fee: 5000000000,
        actor: user1.account,
        tpid: ""
      }
    })
    expect(nft.status).to.equal('OK');
    //grab our user records from fionames so we can use their fio_address_hash
    let fionames = await callFioApi("get_table_rows", {
      json: true,               // Get the response as json
      code: 'fio.address',      // Contract that we target
      scope: 'fio.address',         // Account that owns the data
      table: 'fionames',        // Table name
      limit: 1000,                // Maximum number of rows that we want to get
      reverse: false,           // Optional: Get reversed data
      show_payer: false          // Optional: Show ram payer
    });
    fionames.rows = fionames.rows.slice(-3);    // only need the last 3 accounts
    try {
      user1Hash = fionames.rows[0].namehash
      user2Hash = fionames.rows[1].namehash
    } catch (err) {
      console.log('user namehash not found in table');
      throw err;
    }
  });

  it(`verify user1 NFTs are present in table`, async () => {
    try {
      const result = await callFioApi("get_nfts_fio_address", {
        "fio_address": user1.address
      });
      expect(result.nfts.length).to.not.equal(0);
      expect(result.nfts[0].chain_code).to.equal("ETH");
      expect(result.nfts[0].contract_address).to.equal("0x123456789ABCDEF");
      expect(result.nfts[0].token_id).to.equal("1");
      expect(result.nfts[1].chain_code).to.equal("ETH");
      expect(result.nfts[1].contract_address).to.equal("0x123456789ABCDEF");
      expect(result.nfts[1].token_id).to.equal("2");
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it(`verify user1 NFTs not yet added to nftburnq`, async () => {
    try {
      const result = await callFioApi("get_table_rows", {
        json: true,
        code: 'fio.address',
        scope: 'fio.address',
        table: 'nftburnq',
        lower_bound: user1Hash,
        upper_bound: user1Hash,
        key_type: 'i128',
        index_position: '2'
      });
      expect(result.rows.length).to.equal(0);
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it(`user1 transfers FIO address to user2, expect NFTs to get burned`, async () => {
    try {
      const result = await user1.sdk.genericAction('transferFioAddress', {
        fioAddress: user1.address,
        newOwnerKey: user2.publicKey,
        maxFee: config.api.transfer_fio_address.fee,  // transfer_fio_address_fee,
        technologyProviderId: ''
      })
      const feeCollected = result.fee_collected;
      expect(feeCollected).to.equal(config.api.transfer_fio_address.fee);
      //console.log('Result: ', result);
      expect(result.status).to.equal('OK');
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it(`verify a hash of user1.address added to nftburnq`, async () => {
    try {
      const result = await callFioApi("get_table_rows", json = {
        json: true,
        code: 'fio.address',
        scope: 'fio.address',
        table: 'nftburnq',
        lower_bound: user1Hash,
        upper_bound: user1Hash,
        key_type: 'i128',
        index_position: '2'
      });
      expect(result.rows.length).to.equal(1);
    } catch (err) {
      expect(err).to.equal(null);
    }
  });
});

describe(`J. Burn a FIO address and make sure any NFTS also get burned`, () => {
  let user1, user2, user3;
  let user1Hash, user2Hash;
  let burnqnum, newBurnqnum = 0;

  const fundsAmount = 10000000000000;
  const user1Nfts = mintNfts(3);

  before(async () => {
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
    user3 = await newUser(faucet);
    const nft = await user1.sdk.genericAction('pushTransaction', {
      action: 'addnft',
      account: 'fio.address',
      data: {
        fio_address: user1.address,
        nfts: user1Nfts,
        max_fee: 5000000000,
        actor: user1.account,
        tpid: ""
      }
    })
    expect(nft.status).to.equal('OK');
    //grab our user records from fionames so we can use their fio_address_hash
    let fionames = await callFioApi("get_table_rows", {
      json: true,               // Get the response as json
      code: 'fio.address',      // Contract that we target
      scope: 'fio.address',         // Account that owns the data
      table: 'fionames',        // Table name
      limit: 1000,                // Maximum number of rows that we want to get
      reverse: false,           // Optional: Get reversed data
      show_payer: false          // Optional: Show ram payer
    });
    fionames.rows = fionames.rows.slice(-3);    // only need the last 3 accounts
    try {
      user1Hash = fionames.rows[0].namehash
      user2Hash = fionames.rows[1].namehash
    } catch (err) {
      console.log('user namehash not found in table');
      throw err;
    }
  });

  it(`verify user1 NFTs are present in table`, async () => {
    try {
      const result = await callFioApi("get_nfts_fio_address", {
        "fio_address": user1.address
      });
      expect(result.nfts.length).to.not.equal(0);
      expect(result.nfts[0].chain_code).to.equal("ETH");
      expect(result.nfts[0].contract_address).to.equal("0x123456789ABCDEF");
      expect(result.nfts[0].token_id).to.equal("1");
      expect(result.nfts[1].chain_code).to.equal("ETH");
      expect(result.nfts[1].contract_address).to.equal("0x123456789ABCDEF");
      expect(result.nfts[1].token_id).to.equal("2");
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it(`verify user1 NFTs not yet added to nftburnq`, async () => {
    try {
      const result = await callFioApi("get_table_rows", {
        json: true,
        code: 'fio.address',
        scope: 'fio.address',
        table: 'nftburnq',
        lower_bound: user1Hash,
        upper_bound: user1Hash,
        key_type: 'i128',
        index_position: '2'
      });
      // burnqnum = result.rows.length;
      expect(result.rows.length).to.equal(0);
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  //now it's burnin time


});

describe(`K. Burn an expired FIO address and make sure any NFTS also get burned`, () => {
  let user1, user2, user3;
  let user1Hash, user2Hash;
  let burnqnum, newBurnqnum = 0;

  const fundsAmount = 10000000000000;
  const user1Nfts = mintNfts(3);

  before(async () => {
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
    user3 = await newUser(faucet);
    const nft = await user1.sdk.genericAction('pushTransaction', {
      action: 'addnft',
      account: 'fio.address',
      data: {
        fio_address: user1.address,
        nfts: user1Nfts,
        max_fee: 5000000000,
        actor: user1.account,
        tpid: ""
      }
    })
    expect(nft.status).to.equal('OK');
    //grab our user records from fionames so we can use their fio_address_hash
    let fionames = await callFioApi("get_table_rows", {
      json: true,               // Get the response as json
      code: 'fio.address',      // Contract that we target
      scope: 'fio.address',         // Account that owns the data
      table: 'fionames',        // Table name
      limit: 1000,                // Maximum number of rows that we want to get
      reverse: false,           // Optional: Get reversed data
      show_payer: false          // Optional: Show ram payer
    });
    fionames.rows = fionames.rows.slice(-3);    // only need the last 3 accounts
    try {
      user1Hash = fionames.rows[0].namehash
      user2Hash = fionames.rows[1].namehash
    } catch (err) {
      console.log('user namehash not found in table');
      throw err;
    }
  });

  // need to find a way to make the fio address expire

  it(`verify user1 NFTs are present in table`, async () => {
    try {
      const result = await callFioApi("get_nfts_fio_address", {
        "fio_address": user1.address
      });
      expect(result.nfts.length).to.not.equal(0);
      expect(result.nfts[0].chain_code).to.equal("ETH");
      expect(result.nfts[0].contract_address).to.equal("0x123456789ABCDEF");
      expect(result.nfts[0].token_id).to.equal("1");
      expect(result.nfts[1].chain_code).to.equal("ETH");
      expect(result.nfts[1].contract_address).to.equal("0x123456789ABCDEF");
      expect(result.nfts[1].token_id).to.equal("2");
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it(`verify user1 NFTs not yet added to nftburnq`, async () => {
    try {
      const result = await callFioApi("get_table_rows", {
        json: true,
        code: 'fio.address',
        scope: 'fio.address',
        table: 'nftburnq',
        lower_bound: user1Hash,
        upper_bound: user1Hash,
        key_type: 'i128',
        index_position: '2'
      });
      // burnqnum = result.rows.length;
      expect(result.rows.length).to.equal(0);
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  //and then its burnin time!



});

//TODO: Test burn queue
describe(`L. Burn all NFTs in nftburnq`, () => {
  let user1, user2, user3;
  let user1Hash, user2Hash, user3Hash;
  let burnqnum, newBurnqnum = 0;

  const fundsAmount = 10000000000000;
  const user1Nfts = mintNfts(3);

  before(async () => {
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
    user3 = await newUser(faucet);
    const nft = await user1.sdk.genericAction('pushTransaction', {
      action: 'addnft',
      account: 'fio.address',
      data: {
        fio_address: user1.address,
        nfts: user1Nfts,
        max_fee: 5000000000,
        actor: user1.account,
        tpid: ""
      }
    })
    expect(nft.status).to.equal('OK');
    //grab our user records from fionames so we can use their fio_address_hash
    let fionames = await callFioApi("get_table_rows", {
      json: true,               // Get the response as json
      code: 'fio.address',      // Contract that we target
      scope: 'fio.address',         // Account that owns the data
      table: 'fionames',        // Table name
      limit: 1000,                // Maximum number of rows that we want to get
      reverse: false,           // Optional: Get reversed data
      show_payer: false          // Optional: Show ram payer
    });
    fionames.rows = fionames.rows.slice(-3);    // only need the last 3 accounts
    try {
      user1Hash = fionames.rows[0].namehash
      user2Hash = fionames.rows[1].namehash
    } catch (err) {
      console.log('user namehash not found in table');
      throw err;
    }
  });

  it(`verify user1 NFTs are present in table`, async () => {
    try {
      const result = await callFioApi("get_nfts_fio_address", {
        "fio_address": user1.address
      });
      expect(result.nfts.length).to.not.equal(0);
      expect(result.nfts[0].chain_code).to.equal("ETH");
      expect(result.nfts[0].contract_address).to.equal("0x123456789ABCDEF");
      expect(result.nfts[0].token_id).to.equal("1");
      expect(result.nfts[1].chain_code).to.equal("ETH");
      expect(result.nfts[1].contract_address).to.equal("0x123456789ABCDEF");
      expect(result.nfts[1].token_id).to.equal("2");
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it(`verify user1 NFTs not yet added to nftburnq`, async () => {
    try {
      const result = await callFioApi("get_table_rows", {
        json: true,
        code: 'fio.address',
        scope: 'fio.address',
        table: 'nftburnq',
        lower_bound: user1Hash,
        upper_bound: user1Hash,
        key_type: 'i128',
        index_position: '2'
      });
      // burnqnum = result.rows.length;
      expect(result.rows.length).to.equal(0);
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  //add some stuff to nftburnq with remallnfts, xferaddress, burnaddress, burnexpired

  //then burnin time!



});
