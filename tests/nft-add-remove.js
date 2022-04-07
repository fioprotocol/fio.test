require('mocha');
const {expect} = require('chai');
const { newUser, fetchJson, callFioApi, callFioApiSigned, randStr, timeout} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk');
const config = require('../config.js');
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
      "metadata": ""
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

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
});

describe(`************************** nft-add-remove.js ************************** \n    A. (sdk) Add and remove NFTs`, () => {
  let user1, user2, user3, user4, user1Bundles, add_nft_fee, remove_nft_fee, remove_all_nfts_fee;
  const metadata128 = '12345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678';
  const id128 = randStr(128);
  const id129 = randStr(129);
  const contractAddress = randStr(5);

  before(async () => {
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
    user3 = await newUser(faucet);
    user4 = await newUser(faucet);
  })

  it(`Get user1 initial bundle count`, async () => {
    user1Bundles = await getBundleCount(user1.sdk);
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
          max_fee: config.maxFee,
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

  it('Wait 5 seconds. (Slower test systems)', async () => {
    await timeout(5000);
  })

  it(`Confirm 2 bundles were used for addnft (BUG BD-2878)`, async () => {
    let prevBundles = user1Bundles;
    user1Bundles = await getBundleCount(user1.sdk);
    expect(user1Bundles).to.equal(prevBundles - 2);
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
        console.log('Error', err)
        expect(err).to.equal(null);
    }
  })

  it(`Try to add same NFT to user1 FIO Address. Expect: `, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: [{
            "chain_code": "ETH", "contract_address": "0x123456789ABCDEF", "token_id": "1", "url": "", "hash": "", "metadata": ""
          }],
          max_fee: config.maxFee,
          actor: user1.account,
          tpid: ""
        }
      })
      //console.log(`Result: `, result)
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      //console.log(err.json)
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].error).to.equal('Nothing to update for this token_id');
    }
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
          max_fee: config.maxFee,
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

  it(`Confirm 1 bundle were used for remnft`, async () => {
    let prevBundles = user1Bundles;
    user1Bundles = await getBundleCount(user1.sdk);
    expect(user1Bundles).to.equal(prevBundles - 1);
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
          max_fee: config.maxFee,
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

  it(`Get bundle count for user1`, async () => {
    user1Bundles = await getBundleCount(user1.sdk);
  })

  it(`Remove all NFTs from user1 FIO Address`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remallnfts',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          max_fee: config.maxFee,
          actor: user1.account,
          tpid: ""
        }
      })
      //console.log(`Result: `, result)
      expect(result.status).to.equal('OK')

    } catch (err) {
      console.log(err)
      expect(err).to.equal(null);
    }
  })

  it(`Confirm 1 bundle were used for remallnfts`, async () => {
    let prevBundles = user1Bundles;
    user1Bundles = await getBundleCount(user1.sdk);
    expect(user1Bundles).to.equal(prevBundles - 1);
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
          max_fee: config.maxFee,
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
            max_fee: config.maxFee,
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

  it(`user3 attempts to create NFT on transferred address before NFTs are burned. Expect 400 failure: FIO Address NFTs are being burned`, async () => {
    try {
      const addnftResult = await user3.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: user2.address,
          nfts: [{
            "chain_code": "ETH", "contract_address": "0x123456789ABCDEF2", "token_id": "2", "url": "", "hash": "", "metadata": ""
          }],
          max_fee: config.maxFee,
          actor: user3.account,
          tpid: ""
        }
      })
      expect(addnftResult).to.not.equal('OK');
    } catch (err) {
      //console.log('Error', err.json);
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].error).to.equal('FIO Address NFTs are being burned');
    }
  })

  it(`verify user2 NFTs were added to nftburnq on address transfer`, async () => {
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
          max_fee: config.maxFee,
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

  it(`Call burnnfts until burnnftq is empty`, async () => {
    let empty = false;
    try {
      while (!empty) {
        const result = await user1.sdk.genericAction('pushTransaction', {
          action: 'burnnfts',
          account: 'fio.address',
          data: {
            actor: user1.account,
          }
        })
        //console.log(`Result: `, result)
        expect(result.status).to.equal('OK')
        await timeout(1000); // To avoid duplicate transaction
      }
    } catch (err) {
      console.log(err.json.error);
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].error).to.equal('Nothing to burn');
    }
  })

  it(`Get burnnftq table. Confirm it is empty.`, async () => {
    try {
      const json = {
        json: true,
        code: 'fio.address',
        scope: 'fio.address',
        table: 'nftburnq',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      result = await callFioApi("get_table_rows", json);
      //console.log('result: ', result);
      expect(result.rows.length).to.equal(0);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

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

  it('Get add_nft_fee', async () => {
    try {
      result = await user1.sdk.getFee('add_nft', user1.address);
      add_nft_fee = result.fee;
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  });

  it(`Add NFT to user1 FIO Address, no bundles remaining. Confirm fee is collected.`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: [{
            "chain_code": "ETH", "contract_address": "0x123456789ABCDEFG", "token_id": "2", "url": "", "hash": "", "metadata": ""
          }],
          max_fee: config.maxFee,
          actor: user1.account,
          tpid: ""
        }
      })
      //console.log(`Result: `, result);
      const feeCollected = result.fee_collected;
      expect(feeCollected).to.equal(add_nft_fee);
      expect(result.status).to.equal('OK');

    } catch (err) {
      console.log(err.json.error)
      expect(err).to.equal(null);
    }
  })

  it('Get remove_nft_fee', async () => {
    try {
      result = await user1.sdk.getFee('remove_nft', user1.address);
      remove_nft_fee = result.fee;
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  });

  it(`Remove NFT from user1 FIO Address. Confirm fee is collected`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: [{
            "chain_code": "ETH", "contract_address": "0x123456789ABCDEFG", "token_id": "2", "url": "", "hash": "", "metadata": ""
          }],
          max_fee: config.maxFee,
          actor: user1.account,
          tpid: ""
        }
      })
      //console.log(`Result: `, result)
      const feeCollected = result.fee_collected;
      expect(feeCollected).to.equal(remove_nft_fee);
      expect(result.status).to.equal('OK')

    } catch (err) {
      console.log(err)
      expect(err).to.equal(null);
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
            "chain_code": "ETH", "contract_address": "0x123456789ABCDE1", "token_id": "15", "url": "", "hash": "", "metadata": ""
          }, {
            "chain_code": "ETH", "contract_address": "0x123456789ABCDE2", "token_id": "16", "url": "", "hash": "", "metadata": ""
          }, {
            "chain_code": "ETH", "contract_address": "0x123456789ABCDE3", "token_id": "17", "url": "", "hash": "", "metadata": ""
          }],
          max_fee: config.maxFee,
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

  it('Get remove_all_nfts_fee', async () => {
    try {
      result = await user1.sdk.getFee('remove_all_nfts', user1.address);
      remove_all_nfts_fee = result.fee;
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  });

  it(`Remove all NFTs from user1 FIO Address. Confirm fee collected.`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remallnfts',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          max_fee: config.maxFee,
          actor: user1.account,
          tpid: ""
        }
      })
      //console.log(`Result: `, result)
      expect(result.status).to.equal('OK')
      const feeCollected = result.fee_collected;
      expect(feeCollected).to.equal(remove_all_nfts_fee);

    } catch (err) {
      console.log(err);
      expect(err).to.equal(null);
    }
  })

  it(`Try to add an NFT with 128 char metadata to user1 FIO Address, expect Success`, async () => {
    try {
      const result = await user3.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: user3.address,
          nfts: [{
            "chain_code": "ETH",
            "contract_address": "0x123456789ABCDEFG",
            "token_id": "321",
            "url": "",
            "hash": "",
            "metadata": metadata128
          }],
          max_fee: config.maxFee,
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

  it(`(FIP-35) Try to add an NFT with 128 char id to user4 FIO Address, expect Success`, async () => {
    try {
      const result = await user4.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: user4.address,
          nfts: [
            {
              "chain_code": "ETH",
              "contract_address": contractAddress,
              "token_id": id128,
              "url": "",
              "hash": "",
              "metadata": ""
            }
          ],
          max_fee: config.maxFee,
          actor: user4.account,
          tpid: ""
        }
      })
      expect(result.status).to.equal('OK');
    } catch (err) {
      console.log(err.json);
      expect(err).to.equal(null);
    }
  });

  it(`(FIP-35) Try to add an NFT with 129 char id to user4 FIO Address, expect Error`, async () => {
    try {
      const result = await user4.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: user4.address,
          nfts: [
            {
              "chain_code": "ETH",
              "contract_address": contractAddress,
              "token_id": id129,
              "url": "",
              "hash": "",
              "metadata": ""
            }
          ],
          max_fee: config.maxFee,
          actor: user4.account,
          tpid: ""
        }
      })
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      //console.log('Error: ', err.json);
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].error).to.equal('Invalid Token ID');
    }
  });

});

describe(`B. (sdk) Try to modify existing NFTs`, () => {
  let user1, user2, user3;

  const fundsAmount = 10000000000000;
  const addedNfts = mintNfts(3);

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
      expect(result.nfts.length).to.equal(3);
      expect(result.nfts[0].chain_code).to.equal("ETH");
      expect(result.nfts[0].contract_address).to.equal("0x123456789ABCDEF");
      expect(result.nfts[0].token_id).to.equal("1");
      expect(result.nfts[0].url).to.equal("");
      expect(result.nfts[0].hash).to.equal("");
      expect(result.nfts[0].metadata).to.equal("");
      expect(result.nfts[1].chain_code).to.equal("ETH");
      expect(result.nfts[1].contract_address).to.equal("0x123456789ABCDEF");
      expect(result.nfts[1].token_id).to.equal("2");
      expect(result.nfts[1].url).to.equal("");
      expect(result.nfts[1].hash).to.equal("");
      expect(result.nfts[1].metadata).to.equal("");
      expect(result.nfts[2].chain_code).to.equal("ETH");
      expect(result.nfts[2].contract_address).to.equal("0x123456789ABCDEF");
      expect(result.nfts[2].token_id).to.equal("3");
      expect(result.nfts[2].url).to.equal("");
      expect(result.nfts[2].hash).to.equal("");
      expect(result.nfts[2].metadata).to.equal("");
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it(`try to update an NFT's URL field`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: [{
            "chain_code": "ETH",
            "contract_address": "0x123456789ABCDEF",
            "token_id": "1",
            "url": "new_url",
            "hash": "",
            "metadata": ""
          }],
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      });
      expect(result.status).to.equal('OK');
      expect(result.fee_collected).to.equal(0);
    } catch (err) {
      expect(err).to.equal(null);
    }
  });
  it(`verify updated NFT values are present in table`, async () => {
    const json = {
      "fio_address": user1.address
    }
    try {
      const result = await callFioApi("get_nfts_fio_address", json);
      expect(result.nfts[0].url).to.equal("new_url");
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it.skip(`try to update an NFT's hash field`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: [{
            "chain_code": "ETH",
            "contract_address": "0x123456789ABCDEF",
            "token_id": "2",
            "url": "",
            "hash": "newhash12345678901234567890qazwsxedcrfvtgbyhnujmikolpqwertyasdfg",
            "metadata": ""
          }],
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      });
      expect(result.status).to.equal('OK');
      expect(result.fee_collected).to.equal(0);
    } catch (err) {
      expect(err).to.equal(null);
    }
  });
  it.skip(`verify updated NFT values are present in table`, async () => {
    const json = {
      "fio_address": user1.address
    }
    try {
      const result = await callFioApi("get_nfts_fio_address", json);
      expect(result.nfts[1].hash).to.equal("newhash12345678901234567890qazwsxedcrfvtgbyhnujmikolpqwertyasdfg");
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it(`try to update an NFT's metadata field`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: [{
            "chain_code": "ETH",
            "contract_address": "0x123456789ABCDEF",
            "token_id": "3",
            "url": "",
            "hash": "",
            "metadata": "new_metadata"
          }],
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      });
      expect(result.status).to.equal('OK');
      expect(result.fee_collected).to.equal(0);
    } catch (err) {
      expect(err).to.equal(null);
    }
  });
  it(`verify updated NFT values are present in table`, async () => {
    const json = {
      "fio_address": user1.address
    }
    try {
      const result = await callFioApi("get_nfts_fio_address", json);
      expect(result.nfts[2].metadata).to.equal("new_metadata");
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it(`(unhappy - missing URL) try to update an NFT's URL field`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: [{
            "chain_code": "ETH",
            "contract_address": "0x123456789ABCDEF",
            "token_id": "1",
            //"url": "new_url",
            "hash": "",
            "metadata": ""
          }],
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('missing nftparam.url (type=string)');
    }
  });
  it(`(unhappy - missing hash) try to update an NFT's hash field`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: [{
            "chain_code": "ETH",
            "contract_address": "0x123456789ABCDEF",
            "token_id": "1",
            "url": "",
            // "hash": "",
            "metadata": ""
          }],
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('missing nftparam.hash (type=string)');
    }
  });
  it(`(unhappy - metadata) try to update an NFT's metadata field`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: [{
            "chain_code": "ETH",
            "contract_address": "0x123456789ABCDEF",
            "token_id": "1",
            "url": "",
            "hash": "",
            // "metadata": ""
          }],
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('missing nftparam.metadata (type=string)');
    }
  });
});

describe(`C. (sdk)(unhappy) Try to add NFTs with invalid user input`, () => {
  let user1, user2, user3;
  const metadata129 = '123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789';
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
  it(`(invalid metadata) Try to add an NFT with 129 char metadata to user1 FIO Address, expect Error`, async () => {
    let badUser1Nfts = user1Nfts.concat({
      "chain_code":"ETH",
      "contract_address":"0x123456789ABCDEF",
      "token_id":"1",
      "url":"",
      "hash":"",
      "metadata": metadata129
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
      //console.log('Error: ', err.json)
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].error).to.equal('Invalid metadata');
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
      expect(err.json.fields[0].error).to.equal('Fee exceeds supplied maximum.');
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

describe(`D. (sdk)(unhappy) Try to add an unreasonable number of NFTs`, () => {
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

describe(`E. (sdk)(unhappy) Try to remove more NFTs than minted`, () => {
  let user1, user2, user3;

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

  it(`user1 tries to remove 3 NFTs when only 2 are minted. Expect error: NFT not found (BUG BD-2879)`, async () => {
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
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      //console.log(err.json);
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].error).to.equal('NFT not found');
    }
  });

  it(`Remove an NFT that does not exist from user1 FIO Address, expect Error: NFT not found`, async () => {
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
      //console.log(err.json);
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].value).to.equal(user1.address);
      expect(err.json.fields[0].error).to.equal('NFT not found');
    }
  });

  it(`success user1 removes 2 NFTs.`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: addedNfts,
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      })
      expect(result.status).to.equal('OK');
    } catch (err) {
      console.log(err.json);
      expect(err).to.equal(null);
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
  });
});

describe(`F. (sdk)(unhappy) Try to remove NFTs with invalid user input`, () => {
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

  it(`(missing chain_code) try to remove an NFT for user1, expect error`, async () => {
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
  it(`(missing contract_address) try to remove an NFT for user1, expect error`, async () => {
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
  it(`(missing token_id) try to remove an NFT for user1, expect error`, async () => {
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
  it.skip(`(missing url) try to remove an NFT for user1, expect error`, async () => {
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
  it.skip(`(missing hash) try to remove an NFT for user1, expect error`, async () => {
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
  it.skip(`(missing metadata) try to remove an NFT for user1, expect error`, async () => {
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

  it(`(invalid chain_code) try to remove an NFT for user1, expect error`, async () => {
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
  it(`(invalid contract_address) try to remove an NFT for user1, expect error`, async () => {
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
      //console.log('Error: ', err.json);
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].error).to.equal('NFT not found');
    }
  });
  it(`(invalid token_id) try to remove an NFT for user1, expect error`, async () => {
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
      expect(err.json.fields[0].error).to.equal('NFT not found');
    }
  });
  it.skip(`(invalid url) try to remove an NFT for user1, expect error`, async () => {
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
  it.skip(`(invalid hash) try to remove an NFT for user1, expect error`, async () => {
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
  it.skip(`(invalid metadata) try to remove an NFT for user1, expect error`, async () => {
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

  it(`(empty chain_code) try to remove an NFT for user1, expect error`, async () => {
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
  it(`(empty contract_address) try to remove an NFT for user1, expect error`, async () => {
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
  it(`(empty token_id) try to remove an NFT for user1, expect error`, async () => {
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
      expect(err.json.fields[0].error).to.equal('NFT not found');
    }
  });

  it(`(negative chain_code) try to remove an NFT for user1, expect error`, async () => {
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
  it(`(negative contract_address) try to remove an NFT for user1, expect error`, async () => {
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
      expect(err.json.fields[0].error).to.equal('NFT not found');   //('Invalid Contract Address');
    }
  });
  it(`(negative token_id) try to remove an NFT for user1, expect error`, async () => {
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
      expect(err.json.fields[0].error).to.equal('NFT not found');
    }
  });

  it(`(missing fio_address) try to remove an NFT for user1, expect error`, async () => {
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
  it(`(invalid fio_address) try to remove an NFT for user1, expect error`, async () => {
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
  it(`(empty fio_address) try to remove an NFT for user1, expect error`, async () => {
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
  it(`(negative fio_address) try to remove an NFT for user1, expect error`, async () => {
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

  it(`(missing nfts) try to remove an NFT for user1, expect error`, async () => {
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
  it(`(invalid nfts) try to remove an NFT for user1, expect error`, async () => {
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

  it(`(missing max_fee) try to remove an NFT for user1, expect error`, async () => {
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
  it(`(max_fee=-1) try to remove an NFT for user1, expect error`, async () => {
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
  it(`(invalid max_fee) try to remove an NFT for user1, expect error`, async () => {
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

describe(`G. (sdk)(unhappy) Try to remove an NFT belonging to another user`, () => {
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
          tpid: ""
        }
      })
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      //console.log('Error: ', err)
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

describe(`H. (api) Confirm that get_nfts_fio_address returns NFTs`, () => {
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

  it(`user1 calls get_nfts_fio_address, expect to see NFTs in table`, async () => {
    try {
      const result = await callFioApi('get_nfts_fio_address', {
        fio_address: user1.address
      });
      expect(result.nfts.length).to.equal(3);
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it(`user2 calls get_nfts_fio_address with limit of 2, expect to see NFTs in table`, async () => {
    try {
      const result = await callFioApi('get_nfts_fio_address', {
        fio_address: user2.address,
        limit: 2
      });
      expect(result.nfts.length).to.equal(2);
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it(`user2 calls get_nfts_fio_address with offset of 2, expect to see NFTs in table`, async () => {
    try {
      const result = await callFioApi('get_nfts_fio_address', {
        fio_address: user2.address,
        offset: 2
      });
      expect(result.nfts.length).to.equal(1);
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it(`(unhappy - invalid FIO address) user1 calls get_nfts_fio_address, expect error`, async () => {
    try {
      const result = await callFioApi('get_nfts_fio_address', {
        fio_address: "!invaliD$"  //user1.address
      });
      expect(result.nfts.length).to.equal(3);
    } catch (err) {
      expect(err.message).to.contain('Invalid FIO Address');
    }
  });
  it(`(unhappy - empty FIO address) call get_nfts_fio_address, expect error`, async () => {
    try {
      const result = await callFioApi('get_nfts_fio_address', {
        fio_address: ""
      });
      expect(result.nfts.length).to.equal(3);
    } catch (err) {
      expect(err.message).to.contain('Invalid FIO Address');
    }
  });
  it(`(unhappy - missing FIO address) user1 calls get_nfts_fio_address, expect error`, async () => {
    try {
      const result = await callFioApi('get_nfts_fio_address', {
        //fio_address: user1.address
      });
      expect(result.nfts.length).to.equal(3);
    } catch (err) {
      expect(err.message).to.contain('Invalid FIO Address');
    }
  });

  it(`(unhappy - negative limit) user1 calls get_nfts_fio_address, expect error`, async () => {
    try {
      const result = await callFioApi('get_nfts_fio_address', {
        fio_address: user1.address,
        limit: -100
      });
      expect(result.nfts.length).to.equal(0);
    } catch (err) {
      expect(err.message).to.contain('Invalid limit');
    }
  });
  it(`(unhappy - invalid limit) user3 calls get_nfts_fio_address, expect error`, async () => {
    try {
      const result = await callFioApi('get_nfts_fio_address', {
        fio_address: user3.address,
        limit: "!invalID$%"
      });
      expect(result.nfts.length).to.equal(0);
    } catch (err) {
      expect(err.message).to.contain('Couldn\'t parse int64_t');
    }
  });

  it(`(unhappy - negative offset) user2 calls get_nfts_fio_address, expect error`, async () => {
    try {
      const result = await callFioApi('get_nfts_fio_address', {
        fio_address: user2.address,
        offset: -100
      });
      expect(result.nfts.length).to.equal(0);
    } catch (err) {
      expect(err.message).to.contain('Invalid offset');
    }
  });
  it(`(unhappy - invalid offset) user2 calls get_nfts_fio_address, expect error`, async () => {
    try {
      const result = await callFioApi('get_nfts_fio_address', {
        fio_address: user2.address,
        offset: "$invalid!#"
      });
      expect(result.nfts.length).to.equal(0);
    } catch (err) {
      expect(err.message).to.contain('Couldn\'t parse int64_t');
    }
  });

  it(`(unhappy - NFTs not found) user3 calls get_nfts_fio_address, expect no NFTs to be in table`, async () => {
    try {
      const result = await callFioApi('get_nfts_fio_address', {
        fio_address: user3.address
      });
      expect(result.nfts.length).to.equal(0);
    } catch (err) {
      expect(err.message).to.equal('404 - {"message":"No NFTS are mapped"}');
    }
  });
});

describe(`I. (api) Confirm that get_nfts_contract returns NFTs at a specific contract address`, () => {
  let user1, user2, user3;
  let feeAmt = 100000000;
  let user1Hash, user2Hash;

  const fundsAmount = 10000000000000;
  const randEthAddr = `0x${Math.random().toString(32).substr(2, 15)}`;

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
        nfts: [{
          "chain_code":"ETH",
          "contract_address":"0x123456789ABCDEF",
          "token_id":"1",
          "url":"",
          "hash":"",
          "metadata": ""
        },{
          "chain_code":"ETH",
          "contract_address":"0x123456789ABCDEF",
          "token_id":"2",
          "url":"",
          "hash":"",
          "metadata": ""
        },{
          "chain_code":"ETH",
          "contract_address":`${randEthAddr}`,
          "token_id":"3",
          "url":"",
          "hash":"",
          "metadata": ""
        }],
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
    expect(user1Nfts.nfts.length).to.equal(3);
    expect(user1Nfts.nfts[0].chain_code).to.equal("ETH");
    expect(user1Nfts.nfts[0].contract_address).to.equal("0x123456789ABCDEF");
    expect(user1Nfts.nfts[0].token_id).to.equal("1");
    expect(user1Nfts.nfts[1].chain_code).to.equal("ETH");
    expect(user1Nfts.nfts[1].contract_address).to.equal("0x123456789ABCDEF");
    expect(user1Nfts.nfts[1].token_id).to.equal("2");
    expect(user1Nfts.nfts[2].chain_code).to.equal("ETH");
    expect(user1Nfts.nfts[2].contract_address).to.equal(randEthAddr);
    expect(user1Nfts.nfts[2].token_id).to.equal("3");

    expect(user2Nfts.nfts.length).to.equal(3);
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

  it(`user1 calls get_nfts_contract, expect to see NFTs in table`, async () => {
    try {
      const result = await callFioApi('get_nfts_contract', {
        chain_code: "ETH",
        contract_address:`${randEthAddr}`
      });
      expect(result.nfts.length).to.equal(1);
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it.skip(`BD-3265 (limit = 2) user1 calls get_nfts_contract, expect 2 NFTs`, async () => {
    try {
      const result = await callFioApi('get_nfts_contract', {
        chain_code: "ETH",
        contract_address: "0x123456789ABCDEF",
        offset: 0,
        limit: 2
      });
      console.log('Result: ', result);
      expect(result.nfts.length).to.equal(2);
    } catch (err) {
      console.log('err: ', err);
      expect(err).to.equal(null);
    }
  });

  it(`(limit = 3, offset = 2) user1 calls get_nfts_contract, expect 3 NFTs`, async () => {
    try {
      const result = await callFioApi('get_nfts_contract', {
        chain_code: "ETH",
        contract_address: "0x123456789ABCDEF",
        limit: 3,
        offset: 2
      });
      expect(result.nfts.length).to.equal(3);
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it(`(unhappy - invalid chain_code) user1 calls get_nfts_contract, expect zero NFTs in table`, async () => {
    try {
      const result = await callFioApi('get_nfts_contract', {
        chain_code: "!invalid#@",
        contract_address:`${randEthAddr}`
      });
      expect(result.nfts.length).to.equal(0);
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it(`(unhappy - empty chain_code) user1 calls get_nfts_contract, expect to see NFTs in table`, async () => {
    try {
      const result = await callFioApi('get_nfts_contract', {
        chain_code: "",
        contract_address:`${randEthAddr}`
      });
      expect(result.nfts.length).to.equal(0);
    } catch (err) {
      expect(err.message).to.contain('Invalid chain code');
    }
  });

  it(`(unhappy - missing chain_code) user1 calls get_nfts_contract, expect to see NFTs in table`, async () => {
    try {
      const result = await callFioApi('get_nfts_contract', {
        //chain_code: "!invalid#@",
        contract_address:`${randEthAddr}`
      });
      expect(result.nfts.length).to.equal(0);
    } catch (err) {
      expect(err.message).to.contain('Invalid chain code');
    }
  });

  it(`(unhappy - invalid contract_address) user1 calls get_nfts_contract, expect to see NFTs in table`, async () => {
    try {
      const result = await callFioApi('get_nfts_contract', {
        chain_code: "ETH",
        contract_address:"!invalid#@"
      });
      expect(result.nfts.length).to.equal(0);
    } catch (err) {
      expect(err.message).to.contain('No NFTS are mapped');
    }
  });

  it(`(unhappy - empty contract_address) user1 calls get_nfts_contract, expect to see NFTs in table`, async () => {
    try {
      const result = await callFioApi('get_nfts_contract', {
        chain_code: "ETH",
        contract_address:""
      });
      expect(result.nfts.length).to.equal(0);
    } catch (err) {
      expect(err.message).to.contain('Invalid contract address');
    }
  });

  it(`(unhappy - missing contract_address) user1 calls get_nfts_contract, expect to see NFTs in table`, async () => {
    try {
      const result = await callFioApi('get_nfts_contract', {
        chain_code: "ETH",
        //contract_address:"!invalid#@"
      });
      expect(result.nfts.length).to.equal(0);
    } catch (err) {
      expect(err.message).to.contain('Invalid contract address');
    }
  });

  it(`(unhappy - negative limit) user1 calls get_nfts_contract, expect error`, async () => {
    try {
      const result = await callFioApi('get_nfts_contract', {
        chain_code: "ETH",
        contract_address: "0x123456789ABCDEF",
        limit: -100
      });
      expect(result.nfts.length).to.equal(2);
    } catch (err) {
      expect(err.message).to.contain('Invalid limit');
    }
  });

  it(`(unhappy - invalid limit) user3 calls get_nfts_contract, expect error`, async () => {
    try {
      const result = await callFioApi('get_nfts_contract', {
        chain_code: "ETH",
        contract_address: "0x123456789ABCDEF",
        limit: "!invalID$%"
      });
      expect(result.nfts.length).to.equal(2);
    } catch (err) {
      expect(err.message).to.contain('Couldn\'t parse int64_t');
    }
  });

  it(`(unhappy - negative offset) user2 calls get_nfts_contract, expect error`, async () => {
    try {
      const result = await callFioApi('get_nfts_contract', {
        chain_code: "ETH",
        contract_address: "0x123456789ABCDEF",
        limit: 3,
        offset: -20
      });
      expect(result.nfts.length).to.equal(3);
    } catch (err) {
      expect(err.message).to.contain('Invalid offset');
    }
  });

  it(`(unhappy - invalid offset) user2 calls get_nfts_fio_address, expect error`, async () => {
    try {
      const result = await callFioApi('get_nfts_contract', {
        chain_code: "ETH",
        contract_address: "0x123456789ABCDEF",
        limit: 3,
        offset: "$invalid!#"
      });
      expect(result.nfts.length).to.equal(3);
    } catch (err) {
      expect(err.message).to.contain('Couldn\'t parse int64_t');
    }
  });

  it(`(unhappy - NFTs not found) user3 calls get_nfts_fio_address, expect no NFTs to be in table`, async () => {
    try {
      const result = await callFioApi('get_nfts_contract', {
        chain_code: "ETH",
        contract_address: "nonexistent-contract",
        limit: 3,
        offset: 2
      });
      expect(result.nfts.length).to.equal(3);
    } catch (err) {
      expect(err.message).to.contain('No NFTS are mapped');
    }
  });
});

describe(`J. (api) Confirm that get_nfts_hash returns NFTs with a specific hash`, () => {
  let user1, user2, user3;
  // let feeAmt = 100000000;
  let user1Hash, user2Hash, user3Hash;
  let nftHash = 'f83b5702557b1ee76d966c6bf92ae0d038cd176aaf36f86a18e2ab59e6aefa4b';
  let nftHash2 = 'f83b5702557b1ee76d966c6bf92ae0d038cd176aaf36f86a18e2ab59e6aefa4C';

  // const fundsAmount = 10000000000000;

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
      user3Hash = fionames.rows[2].namehash
    } catch (err) {
      console.log('user namehash not found in table');
      throw err;
    }

    await user1.sdk.genericAction('pushTransaction', {
      action: 'addnft',
      account: 'fio.address',
      data: {
        fio_address: user1.address,
        nfts: [{
          "chain_code":"ETH",
          "contract_address":"0x123456789ABCDEF",
          "token_id":"1",
          "url":"",
          "hash":`${nftHash}`,
          "metadata":""
        }],
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
    await user2.sdk.genericAction('pushTransaction', {
      action: 'addnft',
      account: 'fio.address',
      data: {
        fio_address: user2.address,
        nfts: [{
          "chain_code":"ETH",
          "contract_address":"0x123456789ABCDEG",
          "token_id":"4",
          "url":"",
          "hash":`${nftHash}`,
          "metadata":""
        }, {
          "chain_code":"ETH",
          "contract_address":"0x123456789ABCDEG",
          "token_id":"5",
          "url":"",
          "hash":`${nftHash2}`,
          "metadata":""
        }, {
          "chain_code":"ETH",
          "contract_address":"0x123456789ABCDEG",
          "token_id":"6",
          "url":"",
          "hash":`${nftHash2}`,
          "metadata":""
        }],
        max_fee: 5000000000,
        actor: user2.account,
        tpid: ""
      }
    });
    await user3.sdk.genericAction('pushTransaction', {
      action: 'addnft',
      account: 'fio.address',
      data: {
        fio_address: user3.address,
        nfts: [{
          "chain_code":"ETH",
          "contract_address":"0x123456789ABCDEG",
          "token_id":"1",
          "url":"",
          "hash":`${nftHash2}`,
          "metadata":""
        }, {
          "chain_code":"ETH",
          "contract_address":"0x123456789ABCDEG",
          "token_id":"2",
          "url":"",
          "hash":`${nftHash2}`,
          "metadata":""
        }, {
          "chain_code":"ETH",
          "contract_address":"0x123456789ABCDEG",
          "token_id":"3",
          "url":"",
          "hash":`${nftHash2}`,
          "metadata":""
        }],
        max_fee: 5000000000,
        actor: user3.account,
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

    const user3Nfts = await callFioApi("get_nfts_fio_address", {
      "fio_address": user3.address
    });
    expect(user1Nfts.nfts.length).to.equal(1);
    expect(user1Nfts.nfts[0].chain_code).to.equal("ETH");
    expect(user1Nfts.nfts[0].contract_address).to.equal("0x123456789ABCDEF");
    expect(user1Nfts.nfts[0].token_id).to.equal("1");
    expect(user1Nfts.nfts[0].hash).to.equal(nftHash);
    expect(user2Nfts.nfts.length).to.equal(6);
    expect(user2Nfts.nfts[0].chain_code).to.equal("ETH");
    expect(user2Nfts.nfts[0].contract_address).to.equal("0x123456789ABCDEF");
    expect(user2Nfts.nfts[0].token_id).to.equal("1");
    expect(user2Nfts.nfts[1].chain_code).to.equal("ETH");
    expect(user2Nfts.nfts[1].contract_address).to.equal("0x123456789ABCDEF");
    expect(user2Nfts.nfts[1].token_id).to.equal("2");
    expect(user2Nfts.nfts[2].chain_code).to.equal("ETH");
    expect(user2Nfts.nfts[2].contract_address).to.equal("0x123456789ABCDEF");
    expect(user2Nfts.nfts[2].token_id).to.equal("3");
    expect(user2Nfts.nfts[3].chain_code).to.equal("ETH");
    expect(user2Nfts.nfts[3].contract_address).to.equal("0x123456789ABCDEG");
    expect(user2Nfts.nfts[3].token_id).to.equal("4");
    expect(user2Nfts.nfts[3].hash).to.equal(nftHash);
    expect(user2Nfts.nfts[4].hash).to.equal(nftHash2);
    expect(user2Nfts.nfts[5].hash).to.equal(nftHash2);
    expect(user3Nfts.nfts.length).to.equal(3);
    expect(user3Nfts.nfts[0].chain_code).to.equal("ETH");
    expect(user3Nfts.nfts[0].contract_address).to.equal("0x123456789ABCDEG");
    expect(user3Nfts.nfts[0].token_id).to.equal("1");
    expect(user3Nfts.nfts[0].hash).to.equal(nftHash2);
    expect(user3Nfts.nfts[1].chain_code).to.equal("ETH");
    expect(user3Nfts.nfts[1].contract_address).to.equal("0x123456789ABCDEG");
    expect(user3Nfts.nfts[1].token_id).to.equal("2");
    expect(user3Nfts.nfts[1].hash).to.equal(nftHash2);
    expect(user3Nfts.nfts[2].chain_code).to.equal("ETH");
    expect(user3Nfts.nfts[2].contract_address).to.equal("0x123456789ABCDEG");
    expect(user3Nfts.nfts[2].token_id).to.equal("3");
    expect(user3Nfts.nfts[2].hash).to.equal(nftHash2);
  });

  it(`user1 calls get_nfts_hash, expect to see NFTs in table`, async () => {
    try {
      const result = await callFioApi('get_nfts_hash', {
        hash: nftHash
      });
      let nft = result.nfts.slice(-2);
      expect(nft[0].fio_address).to.equal(user1.address);
      expect(nft[1].fio_address).to.equal(user2.address);
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it(`(limit=5) user1 calls get_nfts_hash, expect NFTs in table`, async () => {
    try {
      const result = await callFioApi('get_nfts_hash', {
        hash: nftHash,
        limit: 5
      });
      expect(result.nfts.length).to.be.lessThanOrEqual(5);
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it(`(limit=5, offset=3) user1 calls get_nfts_hash, expect NFTs in table`, async () => {
    try {
      const result = await callFioApi('get_nfts_hash', {
        hash: nftHash,
        limit: 5,
        offset: 3
      });
      expect(result.nfts.length).to.be.lessThanOrEqual(5);
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it(`(unhappy - negative limit) user1 calls get_nfts_hash, expect error`, async () => {
    try {
      const result = await callFioApi('get_nfts_hash', {
        hash: nftHash,
        limit: -10
      });
      expect(result.nfts.length).to.be.lessThanOrEqual(5);
    } catch (err) {
      expect(err.message).to.contain('Invalid limit');
    }
  });

  it(`(unhappy - invalid limit) user3 calls get_nfts_hash, expect error`, async () => {
    try {
      const result = await callFioApi('get_nfts_hash', {
        hash: nftHash,
        limit: "!invalid#$@"
      });
      expect(result.nfts.length).to.be.lessThanOrEqual(5);
    } catch (err) {
      expect(err.message).to.contain('Couldn\'t parse int64_t');
    }
  });

  it(`(unhappy - negative offset) user2 calls get_nfts_hash, expect error`, async () => {
    try {
      const result = await callFioApi('get_nfts_hash', {
        hash: nftHash,
        limit: 5,
        offset: -5
      });
      expect(result.nfts.length).to.be.lessThanOrEqual(5);
    } catch (err) {
      expect(err.message).to.contain('Invalid offset');
    }
  });

  it(`(unhappy - invalid offset) user2 calls get_nfts_hash, expect error`, async () => {
    try {
      const result = await callFioApi('get_nfts_hash', {
        hash: nftHash,
        limit: 5,
        offset: '!invalid$%%'
      });
      expect(result.nfts.length).to.equal(5);
    } catch (err) {
      expect(err.message).to.contain('Couldn\'t parse int64_t');
    }
  });

  it(`(unhappy - NFTs not found) user3 calls get_nfts_hash, expect no NFTs to be in table`, async () => {
    try {
      const result = await callFioApi('get_nfts_hash', {
        hash: 'nonexistent-hash',
      });
      expect(result.nfts.length).to.equal(5);
    } catch (err) {
      expect(err.message).to.contain('No NFTS are mapped');
    }
  });
});


describe(`K. (api) Test add_nft, remove_nft, and remove_all_nfts API endpoints`, () => {
  let user1, user2, user3;

  const fundsAmount = 10000000000000

  before(async () => {
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
    user3 = await newUser(faucet);
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
          tpid: ""
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
          tpid: ""
        }
      })
      //console.log('Result: ', result)
      expect(result.processed.action_traces[0].receipt.response).to.contain("OK");
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null);
    }
  })

  it(`add_nft 3 NFTs to user1 FIO Address`, async () => {
    try {
      const result = await callFioApiSigned('add_nft', {
        action: 'addnft',
        account: 'fio.address',
        actor: user1.account,
        privKey: user1.privateKey,
        data: {
          fio_address: user1.address,
          nfts: [{
            "chain_code": "ETH", "contract_address": "0x123456789ABCDEF", "token_id": "7", "url": "", "hash": "", "metadata": ""
          }, {
            "chain_code": "ETH", "contract_address": "0x123456789ABCDEF", "token_id": "8", "url": "", "hash": "", "metadata": ""
          }, {
            "chain_code": "ETH", "contract_address": "0x123456789ABCDEF", "token_id": "9", "url": "", "hash": "", "metadata": ""
          }],
          max_fee: config.maxFee,
          actor: user1.account,
          tpid: ""
        }
      })
      //console.log('Result: ', result.processed.action_traces[0].receipt.response)
      expect(result.processed.action_traces[0].receipt.response).to.contain("OK");
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null);
    }
  })

  it('Wait 2 seconds. (Slower test systems)', async () => {
    await timeout(2000);
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
          tpid: ""
        }
      })
      //console.log('Result: ', result)
      expect(result.processed.action_traces[0].receipt.response).to.contain("OK");
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null);
    }
  })

  it(`add_nft 3 NFTs to user2 FIO Address`, async () => {
    try {
      const result = await callFioApiSigned('add_nft', {
        action: 'addnft',
        account: 'fio.address',
        actor: user2.account,
        privKey: user2.privateKey,
        data: {
          fio_address: user2.address,
          nfts: [{
            "chain_code": "ETH", "contract_address": "0x123456789ABCDEF", "token_id": "10", "url": "", "hash": "", "metadata": ""
          }, {
            "chain_code": "ETH", "contract_address": "0x123456789ABCDEF", "token_id": "11", "url": "", "hash": "", "metadata": ""
          }, {
            "chain_code": "ETH", "contract_address": "0x123456789ABCDEF", "token_id": "12", "url": "", "hash": "", "metadata": ""
          }],
          max_fee: config.maxFee,
          actor: user2.account,
          tpid: ""
        }
      })
      //console.log('Result: ', result.processed.action_traces[0].receipt.response)
      expect(result.processed.action_traces[0].receipt.response).to.contain("OK");
    } catch (err) {
      console.log('Error: ', err)
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
          max_fee: config.maxFee,
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

  it(`verify user2 NFTs were added to nftburnq on address transfer`, async () => {
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

  it(`add_nft to user3 FIO Address`, async () => {
    try {
      const result = await callFioApiSigned('add_nft', {
        action: 'addnft',
        account: 'fio.address',
        actor: user3.account,
        privKey: user3.privateKey,
        data: {
          fio_address: user3.address,
          nfts: [{
            "chain_code": "ETH", "contract_address": "0x123456789ABCDEF", "token_id": "999", "url": "", "hash": "B8CB100B12807BD8A8267800477EE5BA4BD387E840BBEDF02E31787CA9430BB0", "metadata": ""
          }],
          max_fee: config.maxFee,
          actor: user3.account,
          tpid: ""
        }
      })
      //console.log('Result: ', result.processed.action_traces[0].receipt.response)
      expect(result.processed.action_traces[0].receipt.response).to.contain("OK");
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null);
    }
  })

  it(`verify user3 has NFT with get_nfts_contract endpoint`, async () => {
    try {
      const json = {
        "chain_code": "ETH",
        "contract_address": "0x123456789ABCDEF",
        "token_id": "999"
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

describe(`L. verify empty token_id acts as wildcard and returns all NFTs`, () => {
  let user1;
  let contractAddress = randStr(17);

  before(async () => {
    user1 = await newUser(faucet);
  })

  it(`Add 3 NFTs to user1 FIO Address`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: [{
            "chain_code": "ETH", "contract_address": contractAddress, "token_id": "7", "url": "", "hash": "", "metadata": ""
          }, {
            "chain_code": "ETH", "contract_address": contractAddress, "token_id": "8", "url": "", "hash": "", "metadata": ""
          }, {
            "chain_code": "ETH", "contract_address": contractAddress, "token_id": "9", "url": "", "hash": "", "metadata": ""
          }],
          max_fee: config.maxFee,
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

  it(`verify user1 has 1 NFT with token_id=7 with get_nfts_contract endpoint`, async () => {
    try {
      const json = {
        "chain_code": "ETH",
        "contract_address": contractAddress,
        "token_id": "7"
      }
      result = await callFioApi("get_nfts_contract", json);
      //console.log('Result: ', result);
      expect(result.nfts.length).to.equal(1)
      expect(result.nfts[0].chain_code).to.equal("ETH")
      expect(result.nfts[0].contract_address).to.equal(contractAddress)
      expect(result.nfts[0].token_id).to.equal("7")
    } catch (err) {
      //console.log('Error', err)
      expect(err).to.equal(null);
    }
  });

  it(`verify empty token_id acts as wildcard and returns all NFTs`, async () => {
    try {
      const json = {
        "chain_code": "ETH",
        "contract_address": contractAddress,
        "token_id": ""
      }
      result = await callFioApi("get_nfts_contract", json);
      //console.log('Result: ', result);
      expect(result.nfts.length).to.equal(3)
      expect(result.nfts[2].chain_code).to.equal("ETH")
      expect(result.nfts[2].contract_address).to.equal(contractAddress)
      expect(result.nfts[2].token_id).to.equal("9")
    } catch (err) {
      //console.log('Error', err)
      expect(err).to.equal(null);
    }
  });
  
});

describe(`M. (BD-3034) Blank token ID acts as wild card in get_nfts_contract`, () => {
  let user1;
  const contractAddress = randStr(5);

  before(async () => {
    user1 = await newUser(faucet);
  })

  it(`Add NFT with empty token_id to user1 FIO Address`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: [{
            "chain_code": "ETH", "contract_address": contractAddress, "token_id": "", "url": "", "hash": "", "metadata": ""
          }],
          max_fee: config.maxFee,
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

  it(`Add same NFT with token_id = 1 to user1 FIO Address`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: [{
            "chain_code": "ETH", "contract_address": contractAddress, "token_id": "1", "url": "", "hash": "", "metadata": ""
          }],
          max_fee: config.maxFee,
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

  it(`Add same NFT with token_id = 2 to user1 FIO Address`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: [{
            "chain_code": "ETH", "contract_address": contractAddress, "token_id": "2", "url": "", "hash": "", "metadata": ""
          }],
          max_fee: config.maxFee,
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

  it('Wait 3 seconds. (Slower test systems)', async () => {
    await timeout(3000);
  })

  it(`verify get_nfts_contract with token_id = 1 returns signatures with token_id = blank and 1`, async () => {
    try {
      const json = {
        "chain_code": "ETH",
        "contract_address": contractAddress,
        "token_id": "1"
      }
      result = await callFioApi("get_nfts_contract", json);
      //console.log(`Result: `, result)
      expect(result.nfts.length).to.equal(2)
      expect(result.nfts[0].chain_code).to.equal("ETH")
      expect(result.nfts[0].contract_address).to.equal(contractAddress)
      expect(result.nfts[0].token_id).to.equal("")
      expect(result.nfts[1].chain_code).to.equal("ETH")
      expect(result.nfts[1].contract_address).to.equal(contractAddress)
      expect(result.nfts[1].token_id).to.equal("1")
    } catch (err) {
      //console.log('Error', err)
      expect(err).to.equal(null);
    }
  });

  it(`verify get_nfts_contract with token_id = 1 returns all 3 signatures`, async () => {
    try {
      const json = {
        "chain_code": "ETH",
        "contract_address": contractAddress,
        "token_id": ""
      }
      result = await callFioApi("get_nfts_contract", json);
      //console.log(`Result: `, result)
      expect(result.nfts.length).to.equal(3)
      expect(result.nfts[0].chain_code).to.equal("ETH")
      expect(result.nfts[0].contract_address).to.equal(contractAddress)
      expect(result.nfts[0].token_id).to.equal("")
      expect(result.nfts[1].chain_code).to.equal("ETH")
      expect(result.nfts[1].contract_address).to.equal(contractAddress)
      expect(result.nfts[1].token_id).to.equal("1")
      expect(result.nfts[2].chain_code).to.equal("ETH")
      expect(result.nfts[2].contract_address).to.equal(contractAddress)
      expect(result.nfts[2].token_id).to.equal("2")
    } catch (err) {
      //console.log('Error', err)
      expect(err).to.equal(null);
    }
  });

  it(`verify get_nfts_contract with NONEXISTANT token_id = 3 returns all single signature with empty token_id`, async () => {
    try {
      const json = {
        "chain_code": "ETH",
        "contract_address": contractAddress,
        "token_id": "3"
      }
      result = await callFioApi("get_nfts_contract", json);
      //console.log(`Result: `, result)
      expect(result.nfts.length).to.equal(1)
      expect(result.nfts[0].chain_code).to.equal("ETH")
      expect(result.nfts[0].contract_address).to.equal(contractAddress)
      expect(result.nfts[0].token_id).to.equal("")
    } catch (err) {
      //console.log('Error', err)
      expect(err).to.equal(null);
    }
  });
})
