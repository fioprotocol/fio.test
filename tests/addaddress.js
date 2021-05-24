require('mocha')
const fs = require("fs");
const {expect} = require('chai')
const {newUser, fetchJson, timeout, callFioApi} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
config = require('../config.js');

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
})

describe(`************************** addaddress.js ************************** \n    A. Add 2 addresses, then add 3 addresses including the original 2`, () => {

  let userA1;

  before(async () => {
    userA1 = await newUser(faucet);
  });

  it(`Add new ELA address to user`, async () => {
    try {
      const result = await userA1.sdk.genericAction('addPublicAddresses', {
        fioAddress: userA1.address,
        publicAddresses: [
          {
            chain_code: 'ELA',
            token_code: 'ELA',
            public_address: 'EQH6o4xfaR5fbhV8cDbDGRxwJRJn3qeo41',
          }
        ],
        maxFee: config.api.add_pub_address.fee,
        technologyProviderId: ''
      });
      //console.log('Result:', result)
      expect(result.status).to.equal('OK');
      expect(result).to.have.property('fee_collected').which.is.a('number');
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  }).timeout(3000);

  it(`Add additional DASH and BCH addresses to user`, async () => {
    try {
      const result = await userA1.sdk.genericAction('addPublicAddresses', {
        fioAddress: userA1.address,
        publicAddresses: [
          {
            chain_code: 'BCH',
            token_code: 'BCH',
            public_address: 'bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9',
          },
          {
            chain_code: 'DASH',
            token_code: 'DASH',
            public_address: 'XyCyPKzTWvW2XdcYjPaPXGQDCGk946ywEv',
          }
        ],
        maxFee: config.api.add_pub_address.fee,
        technologyProviderId: ''
      });
      //console.log('Result:', result)
      expect(result.status).to.equal('OK');
      expect(result).to.have.property('fee_collected').which.is.a('number');
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  }).timeout(3000);

  after(async () => {
    try {
      const result = await callFioApi("get_pub_addresses", {
        fio_address: userA1.address,
        limit: 0,
        offset: 0
      });
      //  console.log('Result', result)
      expect(result.public_addresses.length).to.equal(4)
      expect(result.public_addresses[0].token_code).to.equal("FIO");
      expect(result.public_addresses[1].public_address).to.equal("EQH6o4xfaR5fbhV8cDbDGRxwJRJn3qeo41");
      expect(result.public_addresses[1].token_code).to.equal("ELA");
      expect(result.public_addresses[1].chain_code).to.equal("ELA");
      expect(result.public_addresses[2].public_address).to.equal("bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9");
      expect(result.public_addresses[2].token_code).to.equal("BCH");
      expect(result.public_addresses[2].chain_code).to.equal("BCH");
      expect(result.public_addresses[3].public_address).to.equal("XyCyPKzTWvW2XdcYjPaPXGQDCGk946ywEv");
      expect(result.public_addresses[3].token_code).to.equal("DASH");
      expect(result.public_addresses[3].chain_code).to.equal("DASH");
      expect(result.more).to.equal(false);
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null);
    }
  });
});

describe(`B. Add three new addresses at once`, async () => {

  let userB1;

  before(async () => {
    userB1 = await newUser(faucet);
  });

  it(`Add BCH, DASH, and ELA simultaneously`, async () => {
    try {
      const result = await userB1.sdk.genericAction('addPublicAddresses', {
        fioAddress: userB1.address,
        publicAddresses: [
          {
            chain_code: 'BCH',
            token_code: 'BCH',
            public_address: 'bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9',
          },
          {
            chain_code: 'DASH',
            token_code: 'DASH',
            public_address: 'XyCyPKzTWvW2XdcYjPaPXGQDCGk946ywEv',
          },
          {
            chain_code: 'ELA',
            token_code: 'ELA',
            public_address: 'EQH6o4xfaR5fbhV8cDbDGRxwJRJn3qeo41',
          }
        ],
        maxFee: config.api.add_pub_address.fee,
        technologyProviderId: ''
      })
      //console.log('Result:', result)
      expect(result.status).to.equal('OK');
      expect(result).to.have.property('fee_collected').which.is.a('number');
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  });

  after(async () => {
    try {
      const result = await callFioApi("get_pub_addresses", {
        fio_address: userB1.address,
        limit: 0,
        offset: 0
      });
      //  console.log('Result', result)
      expect(result.public_addresses.length).to.equal(4)
      expect(result.public_addresses[0].token_code).to.equal("FIO");
      expect(result.public_addresses[1].public_address).to.equal("bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9");
      expect(result.public_addresses[1].token_code).to.equal("BCH");
      expect(result.public_addresses[1].chain_code).to.equal("BCH");
      expect(result.public_addresses[2].public_address).to.equal("XyCyPKzTWvW2XdcYjPaPXGQDCGk946ywEv");
      expect(result.public_addresses[2].token_code).to.equal("DASH");
      expect(result.public_addresses[2].chain_code).to.equal("DASH");
      expect(result.public_addresses[3].public_address).to.equal("EQH6o4xfaR5fbhV8cDbDGRxwJRJn3qeo41");
      expect(result.public_addresses[3].token_code).to.equal("ELA");
      expect(result.public_addresses[3].chain_code).to.equal("ELA");
      expect(result.more).to.equal(false);
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null);
    }
  });
});

describe(`C. Add the same address twice`, () => {

  let userC1;

  before(async () => {
    userC1 = await newUser(faucet);
  });

  it(`Add BCH addresses to userC1`, async () => {
    const result = await userC1.sdk.genericAction('addPublicAddresses', {
      fioAddress: userC1.address,
      publicAddresses: [
        {
          chain_code: 'BCH',
          token_code: 'BCH',
          public_address: 'bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9',
        }
      ],
      maxFee: config.api.add_pub_address.fee,
      walletFioAddress: ''
    })
    //console.log('Result:', result)
    expect(result.status).to.equal('OK')
    expect(result).to.have.property('fee_collected').which.is.a('number');
  }).timeout(3000);

  it(`Re-add the same BCH address to userC1`, async () => {
    try {
      const result = await userC1.sdk.genericAction('addPublicAddresses', {
        fioAddress: userC1.address,
        publicAddresses: [
          {
            chain_code: 'BCH',
            token_code: 'BCH',
            public_address: 'bitcoincash:qzf8zha74adsfasdf0xnwlffdn0zuyaslx3c90q7n9g9',
          }
        ],
        maxFee: config.api.add_pub_address.fee,
        walletFioAddress: ''
      })
      //console.log('Result:', result)
      expect(result.status).to.equal('OK');
      expect(result).to.have.property('fee_collected').which.is.a('number');
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null);
    }
  }).timeout(3000);

  after(async () => {
    try {
      const result = await callFioApi("get_pub_addresses", {
        fio_address: userC1.address,
        limit: 0,
        offset: 0
      });
      //  console.log('Result', result)
      expect(result.public_addresses.length).to.equal(2)
      expect(result.public_addresses[0].token_code).to.equal("FIO");
      expect(result.public_addresses[1].public_address).to.equal("bitcoincash:qzf8zha74adsfasdf0xnwlffdn0zuyaslx3c90q7n9g9");
      expect(result.public_addresses[1].token_code).to.equal("BCH");
      expect(result.public_addresses[1].chain_code).to.equal("BCH");
      // expect(result.more).to.equal(false);
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null);
    }
  });
});

describe(`D. FIP18 Chain-level addressing`, () => {

  let userD1
  let addressA = 'fdsfsdfsdzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9'
  let addressB = 'j0xnwlffdn0zuyaslx3c90q7n9g9cvbfbjndghj56ufhghfdgh'
  let addressC = 'fdn0zuyaslx3c90q7n9g9cvbfbjndghj56ufhghdfsgfsfdgh'
  let addressD = 'k0n0zuyaslx3c90q7n9g9cvbfockeahj56ufhghdfsgfsfdgh'

  before(async () => {
    userD1 = await newUser(faucet);
  });

  it(`(sdk) add_pub_address with chain_code ETH, token_code ETH, and public_address addressA`, async () => {
    const result = await userD1.sdk.genericAction('addPublicAddresses', {
      fioAddress: userD1.address,
      publicAddresses: [
        {
          chain_code: 'ETH',
          token_code: 'ETH',
          public_address: addressA,
        }
      ],
      maxFee: config.api.add_pub_address.fee,
      walletFioAddress: ''
    });
    //console.log('Result:', result)
    expect(result.status).to.equal('OK');
  });

  it(`(sdk) add_pub_address with chain_code ETH, token_code *, and public_address addressB`, async () => {
    const result = await userD1.sdk.genericAction('addPublicAddresses', {
      fioAddress: userD1.address,
      publicAddresses: [
        {
          chain_code: 'ETH',
          token_code: '*',
          public_address: addressB,
        }
      ],
      maxFee: config.api.add_pub_address.fee,
      walletFioAddress: ''
    });
    //console.log('Result:', result)
    expect(result.status).to.equal('OK')
  });

  it(`(sdk) add_pub_address with chain_code ETH,, token_code *, and public_address addressC`, async () => {
    const result = await userD1.sdk.genericAction('addPublicAddresses', {
      fioAddress: userD1.address,
      publicAddresses: [
        {
          chain_code: 'ETH',
          token_code: '*',
          public_address: addressC,
        }
      ],
      maxFee: config.api.add_pub_address.fee,
      walletFioAddress: ''
    })
    //console.log('Result:', result)
    expect(result.status).to.equal('OK')
  });

  // sad test
  it(`add_pub_address with chain_code ETH,, token_code **, and public_address addressD. Expect ${config.error.invalidTokenCode}`, async () => {
    try {
      const result = await userD1.sdk.genericAction('addPublicAddresses', {
        fioAddress: userD1.address,
        publicAddresses: [
          {
            chain_code: 'ETH',
            token_code: '**',
            public_address: addressD,
          }
        ],
        maxFee: config.api.add_pub_address.fee,
        walletFioAddress: ''
      });
      expect(result).to.equal(null)
    } catch (err) {
      //console.log('err:', err.json.fields)
      expect(err.json.fields[0].error).to.equal(config.error.invalidTokenCode)
    }
  });
});

describe(`E. Remap FIO Address`, () => {

  let userE1;
  let newAddress = "FIOxyz"

  before(async () => {
    userE1 = await newUser(faucet);
  });

  it(`Remap FIO address to ${newAddress}`, async () => {
    const result = await userE1.sdk.genericAction('addPublicAddresses', {
      fioAddress: userE1.address,
      publicAddresses: [
        {
          chain_code: 'FIO',
          token_code: 'FIO',
          public_address: newAddress,
        }
      ],
      maxFee: config.api.add_pub_address.fee,
      walletFioAddress: ''
    })
    console.log('Result:', result)
    expect(result.status).to.equal('OK')
  });
});

describe(`F. (unhappy path) Add a new address`, () => {

  let userF1;

  before(async () => {
    userF1 = await newUser(faucet);
  });

  it(`(bad fioAddress) Add new public address to user. Expect ValidationError.`, async () => {
    try {
      const result = await userF1.sdk.genericAction('addPublicAddresses', {
        fioAddress: 'donkey',
        publicAddresses: [
          {
            chain_code: 'ELA',
            token_code: 'ELA',
            public_address: 'EQH6o4xfaR5fbhV8cDbDGRxwJRJn3qeo41',
          }
        ],
        maxFee: config.api.add_pub_address.fee,
        technologyProviderId: ''
      });
      //console.log('Result:', result)
      expect(result.status).to.equal('OK');
      expect(result).to.have.property('fee_collected').which.is.a('number');
    } catch (err) {
      // console.log('Error', err);
      expect(err.name).to.equal('ValidationError');
      expect(err.message).to.equal('Validation error');
    }
  }).timeout(3000);

  it(`(empty fioAddress) Add new public address to user. Expect ValidationError.`, async () => {
    try {
      const result = await userF1.sdk.genericAction('addPublicAddresses', {
        fioAddress: '',
        publicAddresses: [
          {
            chain_code: 'ELA',
            token_code: 'ELA',
            public_address: 'EQH6o4xfaR5fbhV8cDbDGRxwJRJn3qeo41',
          }
        ],
        maxFee: config.api.add_pub_address.fee,
        technologyProviderId: ''
      });
      //console.log('Result:', result)
      expect(result.status).to.equal('OK');
      expect(result).to.have.property('fee_collected').which.is.a('number');
    } catch (err) {
      // console.log('Error', err);
      expect(err.name).to.equal('ValidationError');
      expect(err.message).to.equal('Validation error');
    }
  }).timeout(3000);

  it(`(bad maxFee) Add new public address to user. Expect invalid number Error.`, async () => {
    try {
      const result = await userF1.sdk.genericAction('addPublicAddresses', {
        fioAddress: userF1.address,
        publicAddresses: [
          {
            chain_code: 'BCH',
            token_code: 'BCH',
            public_address: 'bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9',
          }
        ],
        maxFee: 'donkey',
        technologyProviderId: ''
      });
      //console.log('Result:', result)
      expect(result.status).to.equal('OK');
      expect(result).to.have.property('fee_collected').which.is.a('number');
    } catch (err) {
      // console.log('Error', err);
      expect(err.name).to.equal('Error');
      expect(err.message).to.equal('invalid number');
    }
  }).timeout(3000);

  it(`(bad public_addresses) Add new public address to user. Expect missing tokenpubaddr.public_address.`, async () => {
    try {
      const result = await userF1.sdk.genericAction('addPublicAddresses', {
        fioAddress: userF1.address,
        publicAddresses: [
          {
            chain_code: 'dogfish',    // TODO: it looks like it doesn't validate publicAddress fields... should it?
            token_code: 'ELA',
            // public_address: 'EQH6o4xfaR5fbhV8cDbDGRxwJRJn3qeo41',
          }
        ],
        maxFee: config.api.add_pub_address.fee,
        technologyProviderId: ''
      });
      //console.log('Result:', result)
      expect(result.status).to.equal('OK');
      expect(result).to.have.property('fee_collected').which.is.a('number');
    } catch (err) {
      // console.log('Error', err);
      expect(err.message).to.equal('missing tokenpubaddr.public_address (type=string)')
    }
  }).timeout(3000);

  it(`(empty public_addresses) Add new public address to user`, async () => {
    try {
      const result = await userF1.sdk.genericAction('addPublicAddresses', {
        fioAddress: userF1.address,
        publicAddresses: [],
        maxFee: config.api.add_pub_address.fee,
        technologyProviderId: ''
      });
      //console.log('Result:', result)
      expect(result.status).to.equal('OK');
      expect(result).to.have.property('fee_collected').which.is.a('number');
    } catch (err) {
      // console.log('Error', err);
      expect(err.errorCode).to.equal(400);
      expect(err.json.message).to.equal('An invalid request was sent in, please check the nested errors for details.');
    }
  }).timeout(3000);

  after(async () => {
    try {
      const result = await callFioApi("get_pub_addresses", {
        fio_address: userF1.address,
        limit: 0,
        offset: 0
      });
      //  console.log('Result', result)
      expect(result.public_addresses.length).to.equal(1)
      expect(result.public_addresses[0].token_code).to.equal("FIO");
      expect(result.public_addresses[0].chain_code).to.equal("FIO");
      expect(result.more).to.equal(false);
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null);
    }
  });
});

describe(`G. (unhappy path) Add multiple addresses`, () => {

  let userG1;

  before(async () => {
    userG1 = await newUser(faucet);
  });

  it(`(bad fioAddress) Add multiple public addresses to user. Expect ValidationError.`, async () => {
    try {
      const result = await userG1.sdk.genericAction('addPublicAddresses', {
        fioAddress: 'kitten',
        publicAddresses: [
          {
            chain_code: 'BCH',
            token_code: 'BCH',
            public_address: 'bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9',
          },
          {
            chain_code: 'DASH',
            token_code: 'DASH',
            public_address: 'XyCyPKzTWvW2XdcYjPaPXGQDCGk946ywEv',
          }
        ],
        maxFee: config.api.add_pub_address.fee,
        technologyProviderId: ''
      });
      //console.log('Result:', result)
      expect(result.status).to.equal('OK');
      expect(result).to.have.property('fee_collected').which.is.a('number');
    } catch (err) {
      // console.log('Error', err);
      expect(err.name).to.equal('ValidationError');
      expect(err.message).to.equal('Validation error');
    }
  }).timeout(3000);

  it(`(empty fioAddress) Add multiple public addresses to user. Expect ValidationError.`, async () => {
    try {
      const result = await userG1.sdk.genericAction('addPublicAddresses', {
        fioAddress: '',
        publicAddresses: [
          {
            chain_code: 'BCH',
            token_code: 'BCH',
            public_address: 'bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9',
          },
          {
            chain_code: 'DASH',
            token_code: 'DASH',
            public_address: 'XyCyPKzTWvW2XdcYjPaPXGQDCGk946ywEv',
          }
        ],
        maxFee: config.api.add_pub_address.fee,
        technologyProviderId: ''
      });
      //console.log('Result:', result)
      expect(result.status).to.equal('OK');
      expect(result).to.have.property('fee_collected').which.is.a('number');
    } catch (err) {
      // console.log('Error', err);
      expect(err.name).to.equal('ValidationError');
      expect(err.message).to.equal('Validation error');    }
  }).timeout(3000);

  it(`(bad maxFee) Add new public address to user. Expect invalid number Error.`, async () => {
    try {
      const result = await userG1.sdk.genericAction('addPublicAddresses', {
        fioAddress: userG1.address,
        publicAddresses: [
          {
            chain_code: 'ELA',
            token_code: 'ELA',
            public_address: 'EQH6o4xfaR5fbhV8cDbDGRxwJRJn3qeo41'
          },{
            chain_code: 'BCH',
            token_code: 'BCH',
            public_address: 'bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9',
          }
        ],
        maxFee: 'donkey',
        technologyProviderId: ''
      });
      //console.log('Result:', result)
      expect(result.status).to.equal('OK');
      expect(result).to.have.property('fee_collected').which.is.a('number');
    } catch (err) {
      // console.log('Error', err);
      expect(err.name).to.equal('Error');
      expect(err.message).to.equal('invalid number');
    }
  }).timeout(3000);

  it(`(bad public_addresses) Add new public address to user. Expect missing tokenpubaddr.public_address.`, async () => {
    try {
      const result = await userG1.sdk.genericAction('addPublicAddresses', {
        fioAddress: userG1.address,
        publicAddresses: [
          {
            chain_code: 'dogfish',    // presently it looks like the chain_code might not be validated... should it?
            token_code: 'ELA',
            // public_address: 'EQH6o4xfaR5fbhV8cDbDGRxwJRJn3qeo41',
          },{
            chain_code: 'BCH',
            token_code: 'BCH',
            public_address: 'bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9',
          }
        ],
        maxFee: config.api.add_pub_address.fee,
        technologyProviderId: ''
      });
      //console.log('Result:', result)
      expect(result.status).to.equal('OK');
      expect(result).to.have.property('fee_collected').which.is.a('number');
    } catch (err) {
      // console.log('Error', err);
      expect(err.message).to.equal('missing tokenpubaddr.public_address (type=string)')
    }
  }).timeout(3000);

  after(async () => {
    try {
      const result = await callFioApi("get_pub_addresses", {
        fio_address: userG1.address,
        limit: 0,
        offset: 0
      });
      //  console.log('Result', result)
      expect(result.public_addresses.length).to.equal(1)
      expect(result.public_addresses[0].token_code).to.equal("FIO");
      expect(result.public_addresses[0].chain_code).to.equal("FIO");
      expect(result.more).to.equal(false);
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null);
    }
  });
});

describe(`H. (unhappy path) Add too many addresses at one time`, () => {

  let userH1;
  // let userH2;
  // let ethAddresses;

  before(async () => {
    userH1 = await newUser(faucet);
    // userH2 = await newUser(faucet);
    // ethAddresses = fs.readFileSync('assets/eth-addresses.txt', 'utf-8').split('\n').slice(0, 199)   // trying 199 first and adding multiple in one call
                                                                                                                           // .slice(0, 200);;
    // for (let i = 0; i < ethAddresses.length; i++) {
    //   try {
    //     const result = await userH2.sdk.genericAction('addPublicAddresses', {
    //       fioAddress: userH2.address,
    //       publicAddresses: [
    //         {
    //           chain_code: 'ETH',
    //           token_code: 'ETH',
    //           public_address: ethAddresses[i]
    //         }
    //       ],
    //       maxFee: config.api.add_pub_address.fee,
    //       technologyProviderId: ''
    //     });
    //     // debug
    //     expect(result.status).to.equal('OK');
    //   } catch (err) {
    //     console.log('Error', err)
    //     expect(err).to.equal(null);
    //   }
    // }
  });

  it(`Try to add more than five addresses at once. Expect Error`, async () => {
    try {
      const result = await userH1.sdk.genericAction('addPublicAddresses', {
        fioAddress: userH1.address,
        publicAddresses: [
          {
            chain_code: 'BCH',
            token_code: 'BCH',
            public_address: 'bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9',
          },
          {
            chain_code: 'DASH',
            token_code: 'DASH',
            public_address: 'XyCyPKzTWvW2XdcYjPaPXGQDCGk946ywEv',
          },
          {
            chain_code: 'ELA',
            token_code: 'ELA',
            public_address: 'EQH6o4xfaR5fbhV8cDbDGRxwJRJn3qeo41',
          },
          {
            chain_code: 'ETH',
            token_code: 'ETH',
            public_address: 'k0n0zuyaslx3c90q7n9g9cvbfockeahj56ufhghdfsgfsfdgh'
          },
          {
            chain_code: 'ETH',
            token_code: 'ETH',
            public_address: 'fdsfsdfsdzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9'
          },
          {
            chain_code: 'ETH',
            token_code: '*',
            public_address: 'j0xnwlffdn0zuyaslx3c90q7n9g9cvbfbjndghj56ufhghfdgh'
          }
        ],
        maxFee: config.api.add_pub_address.fee,
        technologyProviderId: ''
      })
      //console.log('Result:', result)
      expect(result.status).to.equal('OK');
      expect(result).to.have.property('fee_collected').which.is.a('number');
    } catch (err) {
      expect(err.errorCode).to.equal(400);
      expect(err.json.type).to.equal('invalid_input');
      expect(err.json.fields[0].name).to.equal('public_addresses');
      expect(err.json.fields[0].value).to.equal('public_addresses');
      expect(err.json.fields[0].error).to.equal('Min 1, Max 5 public addresses are allowed');
    }
  });

  // it(`Try to add more than 200 total addresses. Expect Error`, async () => {
  //   for (let i = 0; i < ethAddresses.length; i++) {
  //     try {
  //       const result = await userH2.sdk.genericAction('addPublicAddresses', {
  //         fioAddress: userH2.address,
  //         publicAddresses: [
  //           {
  //             chain_code: 'ETH',
  //             token_code: 'ETH',
  //             public_address: ethAddresses[i]
  //           }
  //         ],
  //         maxFee: config.api.add_pub_address.fee,
  //         technologyProviderId: ''
  //       });
  //       // debug
  //       expect(result.status).to.equal('OK');
  //     } catch (err) {
  //       console.log('Error', err)
  //       expect(err).to.equal(null);
  //     }
  //   }
  //
  //   try {
  //     const result = await userH2.sdk.genericAction('addPublicAddresses', {
  //       fioAddress: userH2.address,
  //       publicAddresses: [
  //         {
  //           chain_code: 'BCH',
  //           token_code: 'BCH',
  //           public_address: 'bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9',
  //         },
  //         {
  //           chain_code: 'DASH',
  //           token_code: 'DASH',
  //           public_address: 'XyCyPKzTWvW2XdcYjPaPXGQDCGk946ywEv',
  //         },
  //         {
  //           chain_code: 'ELA',
  //           token_code: 'ELA',
  //           public_address: 'EQH6o4xfaR5fbhV8cDbDGRxwJRJn3qeo41',
  //         }
  //       ],
  //       maxFee: config.api.add_pub_address.fee,
  //       technologyProviderId: ''
  //     })
  //
  //     expect(result.status).to.equal('OK');
  //   } catch (err) {
  //     expect(err.errorCode).to.equal(400);
  //     expect(err.json.type).to.equal('invalid_input');
  //     expect(err.json.fields[0].name).to.equal('public_addresses');
  //     expect(err.json.fields[0].value).to.equal('public_addresses');
  //     expect(err.json.fields[0].error).to.equal('Min 1, Max 5 public addresses are allowed');
  //   }
  // });

  // it(`should not have added the extra addresses`, async () => {
  //   const result = await callFioApi("get_pub_addresses", {
  //     fio_address: userH2.address,
  //     limit: 0,
  //     offset: 0
  //   });
  //   expect(result.status).to.equal('OK');
  // });

  after(async () => {
    try {
      const result = await callFioApi("get_pub_addresses", {
        fio_address: userH1.address,
        limit: 0,
        offset: 0
      });
      //  console.log('Result', result)
      expect(result.public_addresses.length).to.equal(1)
      expect(result.public_addresses[0].token_code).to.equal("FIO");
      expect(result.public_addresses[0].chain_code).to.equal("FIO");
      expect(result.more).to.equal(false);

      // const result2 = await callFioApi("get_pub_addresses", {
      //   fio_address: userH2.address,
      //   limit: 0,
      //   offset: 0
      // });
      //
      // expect(result2.public_addresses.length).to.equal(1)
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null);
    }
  });
});

describe(`I. (unhappy path) Add too many addresses overall`, () => {

  let userI1;
  let ethAddresses;

  before(async () => {
    userI1 = await newUser(faucet);
    ethAddresses = fs.readFileSync('assets/eth-addresses.txt', 'utf-8').split('\n').slice(0, 199);   // trying 199 first and adding multiple in one call

    for (let i = 0; i < ethAddresses.length; i++) {
      try {
        // const result =
        await userI1.sdk.genericAction('addPublicAddresses', {
          fioAddress: userI1.address,
          publicAddresses: [
            {
              chain_code: 'ETH',
              token_code: 'ETH',
              public_address: ethAddresses[i]
            }
          ],
          maxFee: config.api.add_pub_address.fee,
          technologyProviderId: ''
        });
        // debug
        expect(result.status).to.equal('OK');

        // it(`should not have added the extra addresses`, async () => {
        const result = await callFioApi("get_pub_addresses", {
          fio_address: userI1.address,
          limit: 0,
          offset: 0
        });
        expect(result.status).to.equal('OK');
      } catch (err) {
        console.log('Error', err)
        expect(err).to.equal(null);
      }
    }
  });

  it(`Try to add more than 200 total addresses. Expect Error`, async () => {
    try {
      const result = await userI1.sdk.genericAction('addPublicAddresses', {
        fioAddress: userI1.address,
        publicAddresses: [
          {
            chain_code: 'BCH',
            token_code: 'BCH',
            public_address: 'bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9',
          },
          {
            chain_code: 'DASH',
            token_code: 'DASH',
            public_address: 'XyCyPKzTWvW2XdcYjPaPXGQDCGk946ywEv',
          },
          {
            chain_code: 'ELA',
            token_code: 'ELA',
            public_address: 'EQH6o4xfaR5fbhV8cDbDGRxwJRJn3qeo41',
          }
        ],
        maxFee: config.api.add_pub_address.fee,
        technologyProviderId: ''
      })

      expect(result.status).to.equal('OK');
    } catch (err) {
      expect(err.errorCode).to.equal(400);
      expect(err.json.type).to.equal('invalid_input');
      expect(err.json.fields[0].name).to.equal('public_addresses');
      expect(err.json.fields[0].value).to.equal('public_addresses');
      expect(err.json.fields[0].error).to.equal('Min 1, Max 5 public addresses are allowed');
    }
  });

  after(async () => {
    try {
      const result = await callFioApi("get_pub_addresses", {
        fio_address: userI1.address,
        limit: 0,
        offset: 0
      });
      //  console.log('Result', result)
      expect(result.public_addresses.length).to.equal(199)
      // expect(result.public_addresses[0].token_code).to.equal("FIO");
      // expect(result.public_addresses[0].chain_code).to.equal("FIO");
      // expect(result.more).to.equal(false);

    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null);
    }
  });
});