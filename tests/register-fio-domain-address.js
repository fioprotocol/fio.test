require('mocha')
const config = require('../config.js');
const {expect} = require('chai')
const {newUser, existingUser, fetchJson, generateFioDomain, generateFioAddress, callFioApiSigned, timeout} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
let faucet;

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
});

describe(`************************** register-fio-domain-address.js ************************** \n    A. Register a FIO domain and addres in one transaction`, function () {

  let user1, user2, bp;
  let domain1 = generateFioDomain(5);
  let domain2 = generateFioDomain(10);
  let address1 = generateFioAddress(domain1, 5);
  let address2 = generateFioAddress(domain2, 9);

  before(async function () {
    bp = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
  });

  it(`register a FIO address and a public FIO domain`, async function () {
    const result = await callFioApiSigned('push_transaction', {
      action: 'regdomadd',
      account: 'fio.address',
      actor: user1.account,
      privKey: user1.privateKey,
      data: {
        fio_address: address1,
        is_public: 1,
        owner_fio_public_key: user1.publicKey,
        max_fee: config.maxFee,
        tpid: bp.address,
        actor: user1.account
      }
    });
    expect(result).to.have.all.keys('transaction_id', 'processed');
    expect(result.processed.receipt.status).to.equal('executed');
    expect(result.processed.action_traces[0].receipt.response).to.contain('"status": "OK"').and.contain('"fee_collected":800000000000').and.contain('"expiration":');
    expect(result.processed.action_traces[0].act.data.fio_address).to.equal(address1);
    expect(result.processed.action_traces[0].act.data.is_public).to.equal(1);
    expect(result.processed.action_traces[0].act.data.owner_fio_public_key).to.equal(user1.publicKey);
  });

  it(`register a FIO address and a private FIO domain`, async function () {
    const result = await callFioApiSigned('push_transaction', {
      action: 'regdomadd',
      account: 'fio.address',
      actor: user1.account,
      privKey: user1.privateKey,
      data: {
        fio_address: address2,
        is_public: 0,
        owner_fio_public_key: user1.publicKey,
        max_fee: config.maxFee,
        tpid: bp.address,
        actor: user1.account
      }
    });
    expect(result).to.have.all.keys('transaction_id', 'processed');
    expect(result.processed.receipt.status).to.equal('executed');
    expect(result.processed.action_traces[0].receipt.response).to.contain('"status": "OK"').and.contain('"fee_collected":800000000000').and.contain('"expiration":');
    expect(result.processed.action_traces[0].act.data.fio_address).to.equal(address2);
    expect(result.processed.action_traces[0].act.data.is_public).to.equal(0);
    expect(result.processed.action_traces[0].act.data.owner_fio_public_key).to.equal(user1.publicKey);
  });

  // unhappy
  it(`(domain already registered) try to register a FIO address and a public FIO domain`, async function () {
    const result = await callFioApiSigned('push_transaction', {
      action: 'regdomadd',
      account: 'fio.address',
      actor: user1.account,
      privKey: user1.privateKey,
      data: {
        fio_address: address1,
        is_public: 1,
        owner_fio_public_key: user1.publicKey,
        max_fee: config.maxFee,
        tpid: bp.address,
        actor: user1.account
      }
    });
    expect(result.type).to.equal('invalid_input');
    expect(result.fields[0].name).to.equal('fio_name');
    expect(result.fields[0].value).to.equal(address1);
    expect(result.fields[0].error).to.equal('Domain already registered, use regaddress instead.');
  });

  it(`(fee exceeds supplied maximum) try to register a FIO address and a public FIO domain`, async function () {
    const result = await callFioApiSigned('push_transaction', {
      action: 'regdomadd',
      account: 'fio.address',
      actor: user2.account,
      privKey: user2.privateKey,
      data: {
        fio_address: generateFioAddress(generateFioDomain(5), 5),
        is_public: 1,
        owner_fio_public_key: user2.publicKey,
        max_fee: config.maxFee / 2,
        tpid: bp.address,
        actor: user2.account
      }
    });
    expect(result.type).to.equal('invalid_input');
    expect(result.fields[0].name).to.equal('max_fee');
    expect(result.fields[0].value).to.equal((config.maxFee / 2).toString());
    expect(result.fields[0].error).to.equal('Fee exceeds supplied maximum.');
  });

  it(`(insufficient balance) try to register another FIO address and a public FIO domain`, async function () {
    const result = await callFioApiSigned('push_transaction', {
      action: 'regdomadd',
      account: 'fio.address',
      actor: user1.account,
      privKey: user1.privateKey,
      data: {
        fio_address: generateFioAddress(generateFioDomain(5), 5),
        is_public: 1,
        owner_fio_public_key: user1.publicKey,
        max_fee: config.maxFee,
        tpid: bp.address,
        actor: user1.account
      }
    });
    expect(result.type).to.equal('invalid_input');
    expect(result.fields[0].name).to.equal('max_fee');
    expect(result.fields[0].value).to.equal(config.maxFee.toString());
    expect(result.fields[0].error).to.equal('Insufficient funds to cover fee');
  });

  it(`(invalid_signature) try to register a FIO address and a public FIO domain`, async function () {
    const result = await callFioApiSigned('push_transaction', {
      action: 'regdomadd',
      account: 'fio.address',
      actor: user1.account,
      privKey: user2.privateKey,
      data: {
        fio_address: generateFioAddress(generateFioDomain(5), 5),
        is_public: 1,
        owner_fio_public_key: user2.publicKey,
        max_fee: config.maxFee,
        tpid: bp.address,
        actor: user2.account
      }
    });
    expect(result.type).to.equal('invalid_signature');
    expect(result.message).to.equal('Request signature is not valid or this user is not allowed to sign this transaction.');
  });

  it(`(invalid fio_address) try to register a FIO address and a public FIO domain`, async function () {
    const result = await callFioApiSigned('push_transaction', {
      action: 'regdomadd',
      account: 'fio.address',
      actor: user1.account,
      privKey: user1.privateKey,
      data: {
        fio_address: "!$Invalid#",
        is_public: 1,
        owner_fio_public_key: user1.publicKey,
        max_fee: 30000000000,
        tpid: bp.address,
        actor: user1.account
      }
    });
    expect(result.type).to.equal('invalid_input');
    expect(result.fields[0].name).to.equal('fio_address');
    expect(result.fields[0].value).to.equal('!$invalid#');
    expect(result.fields[0].error).to.equal('Invalid FIO Address format');
  });

  it(`(empty fio_address) try to register a FIO address and a public FIO domain`, async function () {
    const result = await callFioApiSigned('push_transaction', {
      action: 'regdomadd',
      account: 'fio.address',
      actor: user1.account,
      privKey: user1.privateKey,
      data: {
        fio_address: "",
        is_public: 1,
        owner_fio_public_key: user1.publicKey,
        max_fee: 30000000000,
        tpid: bp.address,
        actor: user1.account
      }
    });
    expect(result.type).to.equal('invalid_input');
    expect(result.fields[0].name).to.equal('fio_address');
    expect(result.fields[0].value).to.equal('');
    expect(result.fields[0].error).to.equal('Invalid FIO Address format');
  });

  it(`(missing fio_address) try to register a FIO address and a public FIO domain`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'regdomadd',
        account: 'fio.address',
        actor: user1.account,
        privKey: user1.privateKey,
        data: {
          is_public: 1,
          owner_fio_public_key: user1.publicKey,
          max_fee: 30000000000,
          tpid: bp.address,
          actor: user1.account
        }
      });
      expect(result).to.equal(null);
    } catch (err) {
      expect(err.message).to.equal('missing regdomadd.fio_address (type=string)');
    }
  });

  it(`(invalid is_public) try to register a FIO address and a public FIO domain`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'regdomadd',
        account: 'fio.address',
        actor: user2.account,
        privKey: user2.privateKey,
        data: {
          fio_address: generateFioAddress(generateFioDomain(5), 5),
          is_public: "!@invalid#$",
          owner_fio_public_key: user2.publicKey,
          max_fee: config.maxFee,
          tpid: bp.address,
          actor: user2.account
        }
      });
      expect(result).to.equal(null);
    } catch (err) {
      expect(err.message).to.equal('Expected number');
    }
  });

  it(`(negative is_public) try to register a FIO address and a public FIO domain`, async function () {
    const result = await callFioApiSigned('push_transaction', {
      action: 'regdomadd',
      account: 'fio.address',
      actor: user2.account,
      privKey: user2.privateKey,
      data: {
        fio_address: generateFioAddress(generateFioDomain(5), 5),
        is_public: -9,
        owner_fio_public_key: user2.publicKey,
        max_fee: config.maxFee,
        tpid: bp.address,
        actor: user2.account
      }
    });
    expect(result.type).to.equal('invalid_input');
    expect(result.fields[0].name).to.equal('is_public');
    expect(result.fields[0].value).to.equal('247');
    expect(result.fields[0].error).to.equal('Only 0 or 1 allowed');
  });

  it(`(missing is_public) try to register a FIO address and a public FIO domain`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'regdomadd',
        account: 'fio.address',
        actor: user2.account,
        privKey: user2.privateKey,
        data: {
          fio_address: generateFioAddress(generateFioDomain(5), 5),
          owner_fio_public_key: user2.publicKey,
          max_fee: config.maxFee,
          tpid: bp.address,
          actor: user2.account
        }
      });
      expect(result).to.equal(null);
    } catch (err) {
      expect(err.message).to.equal('missing regdomadd.is_public (type=int8)');
    }
  });

  it(`(invalid owner_fio_public_key) try to register a FIO address and a public FIO domain`, async function () {
    const result = await callFioApiSigned('push_transaction', {
      action: 'regdomadd',
      account: 'fio.address',
      actor: user2.account,
      privKey: user2.privateKey,
      data: {
        fio_address: generateFioAddress(generateFioDomain(5), 5),
        is_public: 1,
        owner_fio_public_key: "!@invalid#$",
        max_fee: config.maxFee,
        tpid: bp.address,
        actor: user2.account
      }
    });
    expect(result.type).to.equal('invalid_input');
    expect(result.fields[0].name).to.equal('owner_fio_public_key');
    expect(result.fields[0].value).to.equal('!@invalid#$');
    expect(result.fields[0].error).to.equal('Invalid FIO Public Key format');
  });

  it(`(missing owner_fio_public_key) try to register a FIO address and a public FIO domain`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'regdomadd',
        account: 'fio.address',
        actor: user2.account,
        privKey: user2.privateKey,
        data: {
          fio_address: generateFioAddress(generateFioDomain(5), 5),
          is_public: 1,
          max_fee: config.maxFee,
          tpid: bp.address,
          actor: user2.account
        }
      });
      expect(result).to.equal(null);
    } catch (err) {
      expect(err.message).to.equal('missing regdomadd.owner_fio_public_key (type=string)');
    }
  });

  it(`(invalid max_fee) try to register a FIO address and a public FIO domain`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'regdomadd',
        account: 'fio.address',
        actor: user2.account,
        privKey: user2.privateKey,
        data: {
          fio_address: generateFioAddress(generateFioDomain(5), 5),
          is_public: 1,
          owner_fio_public_key: user2.publicKey,
          max_fee: "!@invalid#$",
          tpid: bp.address,
          actor: user2.account
        }
      });
      expect(result).to.equal(null);
    } catch (err) {
      expect(err.message).to.equal('invalid number');
    }
  });

  it(`(negative max_fee) try to register a FIO address and a public FIO domain`, async function () {
    const result = await callFioApiSigned('push_transaction', {
      action: 'regdomadd',
      account: 'fio.address',
      actor: user2.account,
      privKey: user2.privateKey,
      data: {
        fio_address: generateFioAddress(generateFioDomain(5), 5),
        is_public: 1,
        owner_fio_public_key: user2.publicKey,
        max_fee: -config.maxFee,
        tpid: bp.address,
        actor: user2.account
      }
    });
    expect(result.type).to.equal('invalid_input');
    expect(result.fields[0].name).to.equal('max_fee');
    expect(result.fields[0].value).to.equal(`${-config.maxFee}`);
    expect(result.fields[0].error).to.equal('Invalid fee value');
  });

  it(`(missing max_fee) try to register a FIO address and a public FIO domain`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'regdomadd',
        account: 'fio.address',
        actor: user2.account,
        privKey: user2.privateKey,
        data: {
          fio_address: generateFioAddress(generateFioDomain(5), 5),
          is_public: 1,
          owner_fio_public_key: user2.publicKey,
          tpid: bp.address,
          actor: user2.account
        }
      });
      expect(result).to.equal(null);
    } catch (err) {
      expect(err.message).to.equal('missing regdomadd.max_fee (type=int64)');
    }
  });

  it(`(invalid tpid) try to register a FIO address and a public FIO domain`, async function () {
    const result = await callFioApiSigned('push_transaction', {
      action: 'regdomadd',
      account: 'fio.address',
      actor: user2.account,
      privKey: user2.privateKey,
      data: {
        fio_address: generateFioAddress(generateFioDomain(5), 5),
        is_public: 1,
        owner_fio_public_key: user2.publicKey,
        max_fee: config.maxFee,
        tpid: "!@invalid#$",
        actor: user2.account
      }
    });
    expect(result.type).to.equal('invalid_input');
    expect(result.fields[0].name).to.equal('tpid');
    expect(result.fields[0].value).to.equal('!@invalid#$');
    expect(result.fields[0].error).to.equal('TPID must be empty or valid FIO address');
  });

  it(`(missing tpid) try to register a FIO address and a public FIO domain`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'regdomadd',
        account: 'fio.address',
        actor: user2.account,
        privKey: user2.privateKey,
        data: {
          fio_address: generateFioAddress(generateFioDomain(5), 5),
          is_public: 1,
          owner_fio_public_key: user2.publicKey,
          max_fee: config.maxFee,
          actor: user2.account
        }
      });
      expect(result).to.equal(null);
    } catch (err) {
      expect(err.message).to.equal('missing regdomadd.tpid (type=string)');
    }
  });

  it(`(invalid actor) try to register a FIO address and a public FIO domain`, async function () {
    const result = await callFioApiSigned('push_transaction', {
      action: 'regdomadd',
      account: 'fio.address',
      actor: user2.account,
      privKey: user2.privateKey,
      data: {
        fio_address: generateFioAddress(generateFioDomain(5), 5),
        is_public: 1,
        owner_fio_public_key: user2.publicKey,
        max_fee: config.maxFee,
        tpid: bp.address,
        actor: "!#invalid$%"
      }
    });
    expect(result.error.name).to.equal('missing_auth_exception');
    expect(result.error.details[0].message).to.equal('missing authority of ..invalid');
  });

  it(`(empty actor) try to register a FIO address and a public FIO domain`, async function () {
    const result = await callFioApiSigned('push_transaction', {
      action: 'regdomadd',
      account: 'fio.address',
      actor: user2.account,
      privKey: user2.privateKey,
      data: {
        fio_address: generateFioAddress(generateFioDomain(5), 5),
        is_public: 1,
        owner_fio_public_key: user2.publicKey,
        max_fee: config.maxFee,
        tpid: bp.address,
        actor: ""
      }
    });
    expect(result.error.name).to.equal('missing_auth_exception');
    expect(result.error.details[0].message).to.equal('missing authority of ');
  });

  it(`(missing actor) try to register a FIO address and a public FIO domain`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'regdomadd',
        account: 'fio.address',
        actor: user2.account,
        privKey: user2.privateKey,
        data: {
          fio_address: generateFioAddress(generateFioDomain(5), 5),
          is_public: 1,
          owner_fio_public_key: user2.publicKey,
          max_fee: config.maxFee,
          tpid: bp.address,
        }
      });
      expect(result).to.equal(null);
    } catch (err) {
      expect(err.message).to.equal('missing regdomadd.actor (type=name)');
    }
  });
});

describe(`B. Register a FIO domain and address using /register_fio_domain_address`, function () {

  let user1, user2, bp;
  let domain1 = generateFioDomain(5);
  let domain2 = generateFioDomain(10);
  let address1 = generateFioAddress(domain1, 5);
  let address2 = generateFioAddress(domain2, 9);

  before(async function () {
    bp = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
  });

  it(`register a FIO address and a public FIO domain`, async function () {
    try {
      const result = await callFioApiSigned('register_fio_domain_address', {
        action: 'regdomadd',
        account: 'fio.address',
        actor: user1.account,
        privKey: user1.privateKey,
        data: {
          fio_address: address1,
          is_public: 1,
          owner_fio_public_key: user1.publicKey,
          max_fee: config.maxFee,
          tpid: bp.address,
          actor: user1.account
        }
      });
      expect(result).to.have.all.keys('transaction_id', 'processed');
      expect(result.processed.receipt.status).to.equal('executed');
      expect(result.processed.action_traces[0].receipt.response).to.contain('"status": "OK"').and.contain('"fee_collected":800000000000').and.contain('"expiration":');
      expect(result.processed.action_traces[0].act.data.fio_address).to.equal(address1);
      expect(result.processed.action_traces[0].act.data.is_public).to.equal(1);
      expect(result.processed.action_traces[0].act.data.owner_fio_public_key).to.equal(user1.publicKey);
    } catch (err) {
      throw err;
    }
  });

  it(`(invalid fio_address) try to register a FIO address and a public FIO domain`, async function () {
    const result = await callFioApiSigned('register_fio_domain_address', {
      action: 'regdomadd',
      account: 'fio.address',
      actor: user1.account,
      privKey: user1.privateKey,
      data: {
        fio_address: "!$Invalid#",
        is_public: 1,
        owner_fio_public_key: user1.publicKey,
        max_fee: 30000000000,
        tpid: bp.address,
        actor: user1.account
      }
    });
    expect(result.type).to.equal('invalid_input');
    expect(result.fields[0].name).to.equal('fio_address');
    expect(result.fields[0].value).to.equal('!$invalid#');
    expect(result.fields[0].error).to.equal('Invalid FIO Address format');
  });

  it(`(invalid is_public) try to register a FIO address and a public FIO domain`, async function () {
    try {
      const result = await callFioApiSigned('register_fio_domain_address', {
        action: 'regdomadd',
        account: 'fio.address',
        actor: user2.account,
        privKey: user2.privateKey,
        data: {
          fio_address: generateFioAddress(generateFioDomain(5), 5),
          is_public: "!@invalid#$",
          owner_fio_public_key: user2.publicKey,
          max_fee: config.maxFee,
          tpid: bp.address,
          actor: user2.account
        }
      });
      expect(result).to.equal(null);
    } catch (err) {
      expect(err.message).to.equal('Expected number');
    }
  });

  it(`(invalid owner_fio_public_key) try to register a FIO address and a public FIO domain`, async function () {
    const result = await callFioApiSigned('register_fio_domain_address', {
      action: 'regdomadd',
      account: 'fio.address',
      actor: user2.account,
      privKey: user2.privateKey,
      data: {
        fio_address: generateFioAddress(generateFioDomain(5), 5),
        is_public: 1,
        owner_fio_public_key: "!@invalid#$",
        max_fee: config.maxFee,
        tpid: bp.address,
        actor: user2.account
      }
    });
    expect(result.type).to.equal('invalid_input');
    expect(result.fields[0].name).to.equal('owner_fio_public_key');
    expect(result.fields[0].value).to.equal('!@invalid#$');
    expect(result.fields[0].error).to.equal('Invalid FIO Public Key format');
  });

  it(`(invalid max_fee) try to register a FIO address and a public FIO domain`, async function () {
    try {
      const result = await callFioApiSigned('register_fio_domain_address', {
        action: 'regdomadd',
        account: 'fio.address',
        actor: user2.account,
        privKey: user2.privateKey,
        data: {
          fio_address: generateFioAddress(generateFioDomain(5), 5),
          is_public: 1,
          owner_fio_public_key: user2.publicKey,
          max_fee: "!@invalid#$",
          tpid: bp.address,
          actor: user2.account
        }
      });
      expect(result).to.equal(null);
    } catch (err) {
      expect(err.message).to.equal('invalid number');
    }
  });

  it(`(invalid tpid) try to register a FIO address and a public FIO domain`, async function () {
    const result = await callFioApiSigned('register_fio_domain_address', {
      action: 'regdomadd',
      account: 'fio.address',
      actor: user2.account,
      privKey: user2.privateKey,
      data: {
        fio_address: generateFioAddress(generateFioDomain(5), 5),
        is_public: 1,
        owner_fio_public_key: user2.publicKey,
        max_fee: config.maxFee,
        tpid: "!@invalid#$",
        actor: user2.account
      }
    });
    expect(result.type).to.equal('invalid_input');
    expect(result.fields[0].name).to.equal('tpid');
    expect(result.fields[0].value).to.equal('!@invalid#$');
    expect(result.fields[0].error).to.equal('TPID must be empty or valid FIO address');
  });

  it(`(invalid actor) try to register a FIO address and a public FIO domain`, async function () {
    const result = await callFioApiSigned('register_fio_domain_address', {
      action: 'regdomadd',
      account: 'fio.address',
      actor: user2.account,
      privKey: user2.privateKey,
      data: {
        fio_address: generateFioAddress(generateFioDomain(5), 5),
        is_public: 1,
        owner_fio_public_key: user2.publicKey,
        max_fee: config.maxFee,
        tpid: bp.address,
        actor: "!#invalid$%"
      }
    });
    expect(result.error.name).to.equal('missing_auth_exception');
    expect(result.error.details[0].message).to.equal('missing authority of ..invalid');
  });
});
