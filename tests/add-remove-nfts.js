require('mocha')
const {expect} = require('chai')
const {newUser, existingUser, fetchJson, generateFioDomain, generateFioAddress, createKeypair, callFioApi, timeout} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
config = require('../config.js');
let faucet;

function mintNfts (num) {
  let nfts = [];
  if (num === 0) return nfts;
  for (let i=1; i<=num; i++) {
    nfts.push({
      "chain_code":"ETH","contract_address":"0x123456789ABCDEF", "token_id":`${i}`, "url":"", "hash":"","metadata":""
    });
  }
  return nfts;
}

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
})

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
    try {
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
    } catch (err) {
      console.log(err.message);
      //TODO: Should a bad entry in the nfts list be ignored or throw an exception?
    }
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
  })

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
      expect(err.json.fields[0].error).to.equal('NFT not currently mapped')
    }
  })

  // TODO: mint some more in a couple transactions, try to remove more than was minted
});

describe(`D. Try to add a list of NFTs that contains an invalid NFT`, () => {
  let user1, user2, user3;

  const fundsAmount = 10000000000000;
  const user1Nfts = mintNfts(2);

  before(async () => {
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
    user3 = await newUser(faucet);
  });

  it(`Add list containing a bad NFT to user1 FIO Address, expect Error`, async () => {
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

describe(`E. Try to remove an NFT belonging to another user`, () => {
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
  })

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
  })

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
  })

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
  })
});
