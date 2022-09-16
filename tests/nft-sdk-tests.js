require('mocha');
const {expect} = require('chai');
const { newUser, fetchJson, callFioApi, callFioApiSigned, timeout} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk');
const config = require("../config.js");
let faucet;

function shuffle (v) {
  return [...v].sort(_ => Math.random() - .5).join('');
}

async function getBundleCount (user) {
  const result = await user.genericAction('getFioNames', { fioPublicKey: user.publicKey });
  return result.fio_addresses[0].remaining_bundled_tx;
}

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
});

describe(`************************** nft-sdk-tests.js ************************** \n    A. (sdk) Verify the NFT getter method`, () => {
  let user1, user2, user1Hash, massNft, bal, nftCount, initNftCount, newNftCount, randomEthAddr, randomNftHash;
  let nftHash = 'f83b5702557b1ee76d966c6bf92ae0d038cd176aaf36f86a18e2ab59e6aefa4b';
  let ethContractPrefix = '0x';
  let ethContractSuffix = '123456789ABCDEF';
  let numNfts = 50;
  const fundsAmount = config.api.add_nft.fee * (numNfts);

  before(async () => {
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
    let fionames = await callFioApi("get_table_rows", {
      code: 'fio.address',
      scope: 'fio.address',
      table: 'fionames',
      lower_bound: user1.account,
      upper_bound: user1.account,
      key_type: 'i64',
      index_position: '4',
      json: true
    });
    //fionames.rows = fionames.rows.slice(-2);
    try {
      expect(fionames.rows[0].name).to.equal(user1.address);
      user1Hash = fionames.rows[0].namehash;
    } catch (err) {
      console.log('user namehash not found in table');
      throw err;
    }
    // setting some random known values
    randomEthAddr = `${ethContractPrefix}${shuffle(ethContractSuffix)}`;
    randomNftHash = shuffle(nftHash);
  });

  it(`getFioBalance for user1`, async () => {
    bal = await user1.sdk.genericAction('getFioBalance', {});
  });

  it(`Transfer ${fundsAmount} FIO to user1 FIO public key`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: user1.publicKey,
      amount: fundsAmount,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    });
    expect(result).to.have.any.keys('status');
    expect(result).to.have.any.keys('fee_collected');
    expect(result).to.have.any.keys('block_num');
    expect(result).to.have.any.keys('transaction_id');
  });

  it(`getFioBalance for user1`, async () => {
    const result = await user1.sdk.genericAction('getFioBalance', {});
    expect(result.available).to.equal(bal.available + fundsAmount)
    bal = result;
  });

  it(`get bundles for user1`, async () => {
    const result = await getBundleCount(user1.sdk);
    expect(result).to.equal(100);
  });

  it(`get initial NFT count`, async () => {
    try {
      const result = await callFioApi("get_table_rows", {
        code: "fio.address",
        scope: "fio.address",
        table: "nfts",
        index_position: "1",
        json: true,
        reverse: false
      });
      initNftCount = result.rows.length;
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it(`try to mint ${numNfts} NFTs with unique contract addresses and hashes for user1`, async () => {
    nftCount = 0;
    while (nftCount < numNfts) {
      massNft = [{
        "chain_code":"ETH",
        "contract_address":`${ethContractPrefix}${shuffle(ethContractSuffix)}`,
        "token_id":`${nftCount+1}`,
        "url":"http://fio.example.nft",
        "hash":shuffle(nftHash),
        "metadata": "abc-xyz-123"
      }];

      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: massNft,
          max_fee: config.api.add_nft.fee,
          actor: user1.account,
          tpid: ''
        }
      });
      expect(result.status).to.equal('OK');
      nftCount += massNft.length;
    }
    console.log('done minting');
  });

  it(`get user1 NFTs by calling getNfts() with a FIO address`, async () => {
    try {
      const result = await user1.sdk.getNfts({fioAddress: user1.address});
      expect(result.nfts.length).to.equal(numNfts);
      expect(result.nfts[numNfts - 1].token_id).to.equal(numNfts.toString());
    } catch (err) {
      expect(err.message).to.equal('At least one of these options should be set: fioAddress, chainCode/contractAddress, hash');
    }
  });

  it(`get user1 NFTs by calling getNfts() with a FIO address and limit`, async () => {
    try {
      const result = await user1.sdk.getNfts({fioAddress: user1.address}, 10);
      expect(result.nfts.length).to.equal(10);
      expect(result.nfts[9].token_id).to.equal('10');
    } catch (err) {
      expect(err.message).to.equal('At least one of these options should be set: fioAddress, chainCode/contractAddress, hash');
    }
  });

  it(`get user1 NFTs by calling getNfts() with a FIO address and offset`, async () => {
    try {
      const result = await user1.sdk.getNfts({fioAddress: user1.address}, 0, 10);
      expect(result.nfts.length).to.equal(40);
      expect(result.nfts[0].token_id).to.equal('11');
    } catch (err) {
      expect(err.message).to.equal('At least one of these options should be set: fioAddress, chainCode/contractAddress, hash');
    }
  });

  it(`get user1 NFTs by calling getNfts() with a FIO address, limit, and offset`, async () => {
    try {
      const result = await user1.sdk.getNfts({fioAddress: user1.address}, 10, 10);
      expect(result.more).to.equal(30)
      expect(result.nfts.length).to.equal(10);
      expect(result.nfts[0].token_id).to.equal('11');
      expect(result.nfts[9].token_id).to.equal('20');
    } catch (err) {
      expect(err.message).to.equal('At least one of these options should be set: fioAddress, chainCode/contractAddress, hash');
    }
  });

  it(`add another NFT with a known hash and contract address`, async () => {
    const result = await user1.sdk.genericAction('pushTransaction', {
      action: 'addnft',
      account: 'fio.address',
      data: {
        fio_address: user1.address,
        nfts: [{
          "chain_code":"ETH",
          "contract_address":randomEthAddr,
          "token_id":`${nftCount+1}`,
          "url":"http://fio.example.nft",
          "hash":randomNftHash,
          "metadata": "abc-xyz-123"
        }],
        max_fee: config.api.add_nft.fee,
        actor: user1.account,
        tpid: ''
      }
    });
    expect(result.status).to.equal('OK');
  });

  it(`getNfts() with a contractAddress and chainCode, expect 1 result`, async () => {
    try {
      const result = await user1.sdk.getNfts({chainCode: 'ETH', contractAddress: `${randomEthAddr}`});
      expect(result.nfts.length).to.equal(1);
      expect(result.nfts[0].contract_address).to.equal(randomEthAddr);
    } catch (err) {
      console.log(err);
      expect(err).to.equal(null);
    }
  });

  it(`getNfts() with an NFT hash, expect 1 result`, async () => {
    try {
      const result = await user1.sdk.getNfts({hash: `${randomNftHash}`});
      expect(result.nfts.length).to.equal(1);
      expect(result.nfts[0].contract_address).to.equal(randomEthAddr);
    } catch (err) {
      console.log(err);
      expect(err).to.equal(null);
    }
  });
});

describe(`B. (unhappy) Test SDK getters with invalid method arguments`, () => {
  let user1, user2, user1Hash, massNft, bal, nftCount, initNftCount, newNftCount, randomEthAddr, randomNftHash;
  let nftHash = 'f83b5702557b1ee76d966c6bf92ae0d038cd176aaf36f86a18e2ab59e6aefa4b';
  let ethContractPrefix = '0x';
  let ethContractSuffix = '123456789ABCDEF';
  let numNfts = 50;
  const fundsAmount = config.api.add_nft.fee * (numNfts);

  before(async () => {
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
    let fionames = await callFioApi("get_table_rows", {
      json: true,               // Get the response as json
      code: 'fio.address',      // Contract that we target
      scope: 'fio.address',     // Account that owns the data
      table: 'fionames',        // Table name
      reverse: false,           // Optional: Get reversed data
      show_payer: false         // Optional: Show ram payer
    });
    fionames.rows = fionames.rows.slice(-2);
    try {
      expect(fionames.rows[0].name).to.equal(user1.address);
      user1Hash = fionames.rows[0].namehash;
    } catch (err) {
      console.log('user namehash not found in table');
      throw err;
    }
    // setting some random known values
    randomEthAddr = `${ethContractPrefix}${shuffle(ethContractSuffix)}`;
    randomNftHash = shuffle(nftHash);
  });

  it(`getFioBalance for user1`, async () => {
    bal = await user1.sdk.genericAction('getFioBalance', {});
  });

  it(`Transfer ${fundsAmount} FIO to user1 FIO public key`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: user1.publicKey,
      amount: fundsAmount,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    });
    expect(result).to.have.any.keys('status');
    expect(result).to.have.any.keys('fee_collected');
    expect(result).to.have.any.keys('block_num');
    expect(result).to.have.any.keys('transaction_id');
  });

  it(`getFioBalance for user1`, async () => {
    const result = await user1.sdk.genericAction('getFioBalance', {});
    expect(result.available).to.equal(bal.available + fundsAmount)
    bal = result;
  });

  it(`get bundles for user1`, async () => {
    const result = await getBundleCount(user1.sdk);
    expect(result).to.equal(100);
  });

  it(`get initial NFT count`, async () => {
    try {
      const result = await callFioApi("get_table_rows", {
        code: "fio.address",
        scope: "fio.address",
        table: "nfts",
        index_position: "1",
        json: true,
        reverse: false
      });
      initNftCount = result.rows.length;
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it(`try to mint ${numNfts} NFTs with unique contract addresses and hashes for user1`, async () => {
    nftCount = 0;
    while (nftCount < numNfts) {
      massNft = [{
        "chain_code":"ETH",
        "contract_address":`${ethContractPrefix}${shuffle(ethContractSuffix)}`,
        "token_id":`${nftCount+1}`,
        "url":"http://fio.example.nft",
        "hash":shuffle(nftHash),
        "metadata": "abc-xyz-123"
      }];

      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: massNft,
          max_fee: config.api.add_nft.fee,
          actor: user1.account,
          tpid: ''
        }
      });
      expect(result.status).to.equal('OK');
      nftCount += massNft.length;
    }
    console.log('done minting');
  });

  it(`(empty arguments) get user1 NFTs by calling getNfts(), expect Error`, async () => {
    try {
      const result = await user1.sdk.getNfts({});
      console.log(result);
    } catch (err) {
      expect(err.message).to.equal('At least one of these options should be set: fioAddress, chainCode/contractAddress, hash');
    }
  });
  it(`(empty fioAddress) get user1 NFTs by calling getNfts(), expect Error`, async () => {
    try {
      const result = await user1.sdk.getNfts({fioAddress: ''});
      console.log(result);
    } catch (err) {
      expect(err.message).to.equal('At least one of these options should be set: fioAddress, chainCode/contractAddress, hash');
    }
  });
  it(`(invalid fioAddress) get user1 NFTs by calling getNfts(), expect Error`, async () => {
    try {
      const result = await user1.sdk.getNfts({fioAddress: '!invaliD$@$%'});
      console.log(result);
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].error).to.equal('Invalid FIO Address');
    }
  });

  it(`(empty chainCode) get user1 NFTs by calling getNfts(), expect Error`, async () => {
    try {
      const result = await user1.sdk.getNfts({chainCode: '', contractAddress: randomEthAddr});
      console.log(result);
    } catch (err) {
      expect(err.message).to.equal('At least one of these options should be set: fioAddress, chainCode/contractAddress, hash');
    }
  });
  it(`(invalid chainCode) get user1 NFTs by calling getNfts(), expect Error`, async () => {
    try {
      const result = await user1.sdk.getNfts({chainCode: '!Invalid$#', contractAddress: randomEthAddr});
      console.log(result);
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.errorCode).to.equal(404);
      expect(err.json.message).to.equal('No NFTS are mapped');
    }
  });
  it(`(missing chainCode) get user1 NFTs by calling getNfts(), expect Error`, async () => {
    try {
      const result = await user1.sdk.getNfts({contractAddress: randomEthAddr});
      console.log(result);
    } catch (err) {
      expect(err.message).to.equal('At least one of these options should be set: fioAddress, chainCode/contractAddress, hash');
    }
  });
  it(`(empty contractAddress) get user1 NFTs by calling getNfts(), expect Error`, async () => {
    try {
      const result = await user1.sdk.getNfts({contractAddress: '', chainCode: 'ETH'});
      console.log(result);
    } catch (err) {
      expect(err.message).to.equal('At least one of these options should be set: fioAddress, chainCode/contractAddress, hash');
    }
  });
  it(`(invalid contractAddress) get user1 NFTs by calling getNfts(), expect Error`, async () => {
    try {
      const result = await user1.sdk.getNfts({contractAddress: 'Inval!d$#$@', chainCode: 'ETH'});
      console.log(result);
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.errorCode).to.equal(404);
      expect(err.json.message).to.equal('No NFTS are mapped');
    }
  });
  it(`(missing contractAddress) get user1 NFTs by calling getNfts(), expect Error`, async () => {
    try {
      const result = await user1.sdk.getNfts({chainCode: 'ETH'});
      console.log(result);
    } catch (err) {
      expect(err.message).to.equal('At least one of these options should be set: fioAddress, chainCode/contractAddress, hash');
    }
  });
  it(`(empty tokenId) get user1 NFTs by calling getNfts(), expect Error`, async () => {
    try {
      const result = await user1.sdk.getNfts({tokenId: ''});
      console.log(result);
    } catch (err) {
      expect(err.message).to.equal('At least one of these options should be set: fioAddress, chainCode/contractAddress, hash');
    }
  });
  it(`(invalid tokenId) get user1 NFTs by calling getNfts(), expect Error`, async () => {
    try {
      const result = await user1.sdk.getNfts({tokenId: '!invalid#@'});
      console.log(result);
    } catch (err) {
      expect(err.message).to.equal('At least one of these options should be set: fioAddress, chainCode/contractAddress, hash');
    }
  });
  it(`(empty hash) get user1 NFTs by calling getNfts(), expect Error`, async () => {
    try {
      const result = await user1.sdk.getNfts({hash: ''});
      console.log(result);
    } catch (err) {
      expect(err.message).to.equal('At least one of these options should be set: fioAddress, chainCode/contractAddress, hash');
    }
  });
  it(`(invalid hash) get user1 NFTs by calling getNfts(), expect Error`, async () => {
    try {
      const result = await user1.sdk.getNfts({hash: '$Invalid$#!'});
      console.log(result);
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.errorCode).to.equal(404);
      expect(err.json.message).to.equal('No NFTS are mapped');
    }
  });

  it(`(invalid limit) get user1 NFTs by calling getNfts(), expect Error`, async () => {
    try {
      const result = await user1.sdk.getNfts({fioAddress: user1.address}, "invalid", 10);
      console.log(result);
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.errorCode).to.equal(500);
      expect(err.json.error.details[0].message).to.equal('Couldn\'t parse int64_t');
    }
  });
  it(`(invalid offset) get user1 NFTs by calling getNfts(), expect Error`, async () => {
    try {
      const result = await user1.sdk.getNfts({fioAddress: user1.address}, 10, 'invalid');
      console.log(result);
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.errorCode).to.equal(500);
      expect(err.json.error.details[0].message).to.equal('Couldn\'t parse int64_t');
    }
  });
  it(`(negative limit) get user1 NFTs by calling getNfts(), expect Error`, async () => {
    try {
      const result = await user1.sdk.getNfts({fioAddress: user1.address}, -10, 10);
      console.log(result);
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].error).to.equal('Invalid limit');
    }
  });
  it(`(negative offset) get user1 NFTs by calling getNfts(), expect Error`, async () => {
    try {
      const result = await user1.sdk.getNfts({fioAddress: user1.address}, 10, -10);
      console.log(result);
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].error).to.equal('Invalid offset');
    }
  });
});
