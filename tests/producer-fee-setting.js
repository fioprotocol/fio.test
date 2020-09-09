require('mocha')
const {expect} = require('chai')
const {runClio, getBlock, readProdFile, getTopprods, getTable, timeout, callFioApi, getFees, newUser, existingUser, fetchJson} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/FIOSDK')
config = require('../config.js');

let producersList = [], producers = [], submit_fee_ratios_fee, submit_fee_multiplier_fee

async function createProds() {
  for (prod in producersList) {  
    // Create the producers on the node and make a test sdk object for them
    //producers[prod] = await newUser(faucet, producersList[prod].account, producersList[prod].privateKey, producersList[prod].publicKey, producersList[prod].domain, producersList[prod].address);
    prodAccount = producersList[prod].account;
    producers[prodAccount] = await newUser(faucet, producersList[prod].account, producersList[prod].privateKey, producersList[prod].publicKey, producersList[prod].domain, producersList[prod].address);
    // Register the producers
    const result1 = await producers[prodAccount].sdk.genericAction('pushTransaction', {
      action: 'regproducer',
      account: 'eosio',
      data: {
        fio_address: producers[prodAccount].address,
        fio_pub_key: producers[prodAccount].publicKey,
        url: "https://mywebsite.io/",
        location: 80,
        actor: producers[prodAccount].account,
        max_fee: config.api.register_producer.fee
      }
    })
    // Have the producers vote for themselves
    const result2 = await producers[prodAccount].sdk.genericAction('pushTransaction', {
      action: 'voteproducer',
      account: 'eosio',
      data: {
        "producers": [
          producers[prodAccount].address
        ],
        fio_address: producers[prodAccount].address,
        actor: producers[prodAccount].account,
        max_fee: config.api.vote_producer.fee
      }
    })
  }
}

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson)

  // Create sdk objects for the orinigal localhost BPs
  producers['qbxn5zhw2ypw'] = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
  producers['hfdg2qumuvlc'] = await existingUser('hfdg2qumuvlc', '5JnhMxfnLhZeRCRvCUsaHbrvPSxaqjkQAgw4ZFodx4xXyhZbC9P', 'FIO7uTisye5w2hgrCSE1pJhBKHfqDzhvqDJJ4U3vN9mbYWzataS2b', 'dapixdev', 'bp2@dapixdev');
  producers['wttywsmdmfew'] = await existingUser('wttywsmdmfew', '5JvmPVxPxypQEKPwFZQW4Vx7EC8cDYzorVhSWZvuYVFMccfi5mU', 'FIO6oa5UV9ghWgYH9en8Cv8dFcAxnZg2i9z9gKbnHahciuKNRPyHc', 'dapixdev', 'bp3@dapixdev');

  // Reads in the producers from the fio.devtools keys.csv file and puts them in an array with producersList[0] = producer1@dapixdev (producer[0] is null)
  producersList = await readProdFile(config.PRODKEYFILE);

  it('Get submit_fee_ratios fee', async () => {
    try {
      result = await walletB1.sdk.getFee('submit_fee_ratios', producers['qbxn5zhw2ypw'].address);
      submit_fee_ratios_fee = result.fee;
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it('Get submit_fee_multiplier fee', async () => {
    try {
      result = await walletB1.sdk.getFee('submit_fee_multiplier', producers['qbxn5zhw2ypw'].address);
      submit_fee_multiplier_fee = result.fee;
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })
})

describe('************************** producer_fee-setting.js ************************** \n A. Set fee ratio to zero for bp1 and confirm no exceptions thrown (MAS-1888).', () => {
  let bp = 'qbxn5zhw2ypw' // (bp1)
 
  it('Get action_mroot from latest block and confirm it is not zero.', async () => {
    getInfo = await runClio('get info');
    console.log("getInfo head_block_num: ", getInfo.head_block_num)
    block = await getBlock(getInfo.head_block_num);
    console.log("Block: ", block)
    expect(block.action_mroot).to.not.equal('0000000000000000000000000000000000000000000000000000000000000000')
  })

  it('Set multiplier to 1 for bp1', async () => {
    try {
      const result = await producers[bp].sdk.genericAction('pushTransaction', {
        action: 'setfeemult',
        account: 'fio.fee',
        data: {
          multiplier: 1,
          actor: bp
          //max_fee: config.api.unregister_producer.fee
        }
      })
      console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    } 
  })

  it('Set fee ratio to 0 for bp1', async () => {
    try {
      const result = await producers[bp].sdk.genericAction('pushTransaction', {
        action: 'setfeevote',
        account: 'fio.fee',
        data: {
          fee_ratios: [
            {"end_point": "register_fio_domain", "value": 0}
          ],
          actor: bp
        }
      })
      console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json);
      expect(err).to.equal(null);
    } 
  })

  it('Wait 120 seconds for fee setting.', async () => {
    await timeout(125000);
  })

  it('Get action_mroot from latest block and confirm it is not zero.', async () => {
    getInfo = await runClio('get info');
    console.log("getInfo head_block_num: ", getInfo.head_block_num)
    block = await getBlock(getInfo.head_block_num);
    console.log("Block: ", block)
    expect(block.action_mroot).to.not.equal('0000000000000000000000000000000000000000000000000000000000000000')
  })

})

describe('B. Test 15 prod activation for fee setting.', () => {

  let fees, topprods

  it('If running on non-21 node localhost and this is the first test run, load and register BPs table', async () => {
    try {
      topprods = await getTopprods();
      //console.log("topprods: ", topprods)
      if (topprods.rows.length == 3) {  // This is a first test run for a localhost 3 node test environment, so register the 21 producers
        for (prod in producersList) {  
          // Create the producers on the node and make a test sdk object for them
          //producers[prod] = await newUser(faucet, producersList[prod].account, producersList[prod].privateKey, producersList[prod].publicKey, producersList[prod].domain, producersList[prod].address);
          let prodAccount = producersList[prod].account;
          producers[prodAccount] = await newUser(faucet, producersList[prod].account, producersList[prod].privateKey, producersList[prod].publicKey, producersList[prod].domain, producersList[prod].address);        
          // Register the producer
          console.log('Register the producer'); 
          console.log('ProdAccount: ', producers[prodAccount].sdk); 
          console.log('ProdAccount: ', producers[prodAccount].privateKey); 
          const result1 = await producers[prodAccount].sdk.genericAction('pushTransaction', {
            action: 'regproducer',
            account: 'eosio',
            data: {
              fio_address: producers[prodAccount].address,
              fio_pub_key: producers[prodAccount].publicKey,
              url: "https://mywebsite.io/",
              location: 80,
              actor: producers[prodAccount].account,
              max_fee: config.api.register_producer.fee
            }
          })
          // Have the producer vote for themselves
          console.log('Have the producer vote for themselves'); 
          const result2 = await producers[prodAccount].sdk.genericAction('pushTransaction', {
            action: 'voteproducer',
            account: 'eosio',
            data: {
              "producers": [
                producers[prodAccount].address
              ],
              fio_address: producers[prodAccount].address,
              actor: producers[prodAccount].account,
              max_fee: config.api.vote_producer.fee
            }
          })
        }
        //Wait for topprods table to update (is it 1 minute?)
        console.log('Wait 60 seconds for topprods table to update');
        await timeout(60000);
      } else { // Just create the test sdk objects for the existing producers
        for (prod in producersList) {  
          //console.log("producersList[prod]: ", producersList[prod])
          //producers[prod] = await existingUser(producersList[prod].account, producersList[prod].privateKey, producersList[prod].publicKey, producersList[prod].domain, producersList[prod].address)
          producers[producersList[prod].account] = await existingUser(producersList[prod].account, producersList[prod].privateKey, producersList[prod].publicKey, producersList[prod].domain, producersList[prod].address)
        }
      }
    } catch (err) {
      console.log('Error: ', err.json);
      expect(err).to.equal(null);
    } 
  }) 

  it('Get current fees', async () => {
    try {
      fees = await getFees();
      expect(fees['register_fio_domain']).to.be.greaterThan(0);
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    } 
  })

  it('Get top prods', async () => {
    try {
      let test = [];
      topprods = await getTopprods();
      //console.log("topprods: ", topprods)
      for (prod in topprods.rows) {
        //console.log("prod: ", topprods.rows[prod].producer)
        test[topprods.rows[prod].producer] = topprods.rows[prod].producer
      }
      expect(topprods.rows.length).to.equal(21);
    } catch (err) {
      console.log('Error: ', err.json);
      expect(err).to.equal(null);
    } 
  })

  it.skip('Confirm multipliers table is empty', async () => {
    try {
      feevoters = await getTable('fio.fee', 'feevoters');
      //console.log("feevoters: ", feevoters)
      expect(feevoters.rows.length).to.equal(0);
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal(null);
    } 
  }) 

  it.skip('Not working. Need to convert to calFioApi! Confirm multipliers table is empty', async () => {
    try {
      const json = {
        json: true,               // Get the response as json
        code: 'fio.address',      // Contract that we target
        scope: 'fio.address',         // Account that owns the data
        table: 'fionames',        // Table name
        limit: 1000,                // Maximum number of rows that we want to get
        reverse: false,           // Optional: Get reversed data
        show_payer: false          // Optional: Show ram payer
      }
      fionames = await callFioApi("get_table_rows", json);
      //console.log('fionames: ', fionames);
      for (name in fionames.rows) {
        if (fionames.rows[name].name == userC1.address) {
          //console.log('bundleeligiblecountdown: ', fionames.rows[name].bundleeligiblecountdown); 
          bundleCount = fionames.rows[name].bundleeligiblecountdown;
        }
      }
      expect(bundleCount).to.equal(0);  
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  }) 

  it.skip('Confirm ratio table is empty', async () => {
    try {
      feevotes = await getTable('fio.fee', 'feevotes');
      //console.log("feevotes: ", feevotes)
      expect(feevotes.rows.length).to.equal(0);
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal(null);
    } 
  }) 

  it('Set multipliers to 1 for topprods', async () => {
    try {
      topprods = await getTable('eosio', 'topprods');
      for (prod in topprods.rows) {
        //console.log("prod: ", topprods.rows[prod].producer)
        account = topprods.rows[prod].producer
        const result = await producers[account].sdk.genericAction('pushTransaction', {
          action: 'setfeemult',
          account: 'fio.fee',
          data: {
            multiplier: 1,
            actor: account
            //max_fee: config.api.unregister_producer.fee
          }
        })
        //console.log('Result: ', result)
        expect(result.status).to.equal('OK')
      }
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    } 
  })

  it('Get current fees', async () => {
    try {
      fees = await getFees();
      expect(fees['register_fio_domain']).to.be.greaterThan(0);
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    } 
  })

  it('Set register_fio_domain fee ratio for 1-7 prods to 100 FIO', async () => {
    try {
      let endpoint = 'register_fio_domain'
      let value = 100000000000
      for (i = 0; i < 7; i++) {
        console.log("prod: ", topprods.rows[i].producer)
        account = topprods.rows[i].producer
        const result = await producers[account].sdk.genericAction('pushTransaction', {
          action: 'setfeevote',
          account: 'fio.fee',
          data: {
            fee_ratios: [
              {
                "end_point": endpoint,
                "value": value
              }
            ],
            actor: account
          }
        })
        console.log('Result: ', result)
        expect(result.status).to.equal('OK')
      }
    } catch (err) {
      console.log('Error: ', err.json);
      expect(err).to.equal(null);
    } 
  })

  it('Wait 60 seconds for fee setting.', async () => {
    await timeout(60000);
  })

  it('Confirm fees have not changed', async () => {
    try {
      let prevFees = fees;
      fees = await getFees();
      for (endpoint in fees) { 
        expect(fees[endpoint]).to.equal(prevFees[endpoint]);
      }
    } catch (err) {
      console.log('Error: ', err.json);
      expect(err).to.equal(null);
    } 
  })

  it('Set register_fio_domain fee ratio for 8-14 prods to 200 FIO', async () => {
    try {
      let endpoint = 'register_fio_domain'
      let value = 200000000000
      for (i = 7; i < 14; i++) {
        console.log("prod: ", topprods.rows[i].producer)
        account = topprods.rows[i].producer
        const result = await producers[account].sdk.genericAction('pushTransaction', {
          action: 'setfeevote',
          account: 'fio.fee',
          data: {
            fee_ratios: [
              {
                "end_point": endpoint,
                "value": value
              }
            ],
            actor: account
          }
        })
        console.log('Result: ', result)
        expect(result.status).to.equal('OK')
      }
    } catch (err) {
      console.log('Error: ', err.json);
      expect(err).to.equal(null);
    } 
  })

  it('Wait 60 seconds for fee setting.', async () => {
    await timeout(60000);
  })

  it('Confirm fees have not changed (only 14 fee ratio votes)', async () => {
    try {
      let prevFees = fees;
      fees = await getFees();
      for (endpoint in fees) { 
        expect(fees[endpoint]).to.equal(prevFees[endpoint]);
      }
    } catch (err) {
      console.log('Error: ', err.json);
      expect(err).to.equal(null);
    } 
  })

  it('Set register_fio_domain fee ratio for 15th prod to 100 FIO', async () => {
    try {
      let endpoint = 'register_fio_domain'
      let value = 100000000000
      console.log("prod: ", topprods.rows[14].producer)
      account = topprods.rows[14].producer
      const result = await producers[account].sdk.genericAction('pushTransaction', {
        action: 'setfeevote',
        account: 'fio.fee',
        data: {
          fee_ratios: [
            {
              "end_point": endpoint,
              "value": value
            }
          ],
          actor: account
        }
      })
      console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json);
      expect(err).to.equal(null);
    } 
  })

  it('Confirm fees have not changed since fee setting has not yet been triggered', async () => {
    try {
      let prevFees = fees;
      fees = await getFees();
      for (endpoint in fees) { 
        expect(fees[endpoint]).to.equal(prevFees[endpoint]);
      }
    } catch (err) {
      console.log('Error: ', err.json);
      expect(err).to.equal(null);
    } 
  })

  it('Wait 60 seconds for fee setting.', async () => {
    await timeout(60000);
  })

  it('Confirm only register_fio_domain fee changed to 100 FIO', async () => {
    try {
      let value = 100000000000;
      let prevFees = fees;
      fees = await getFees();
      for (endpoint in fees) { 
        console.log(endpoint + ' = ' + fees[endpoint])
        if (endpoint == 'register_fio_domain') {
          expect(fees[endpoint]).to.equal(value);
        } else {
          expect(fees[endpoint]).to.equal(prevFees[endpoint]);
        }
      }
    } catch (err) {
      console.log('Error: ', err.json);
      expect(err).to.equal(null);
    } 
  })

  it('Set register_fio_domain fee ratio for 16th prod to 200 FIO', async () => {
    try {
      let endpoint = 'register_fio_domain'
      let value = 200000000000
      console.log("prod: ", topprods.rows[15].producer)
      account = topprods.rows[15].producer
      const result = await producers[account].sdk.genericAction('pushTransaction', {
        action: 'setfeevote',
        account: 'fio.fee',
        data: {
          fee_ratios: [
            {
              "end_point": endpoint,
              "value": value
            }
          ],
          actor: account
        }
      })
      console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json);
      expect(err).to.equal(null);
    } 
  })

  it('Wait 60 seconds for fee setting.', async () => {
    await timeout(60000);
  })

  it('Confirm fees have not changed (even amount does what??)', async () => {
    try {
      let prevFees = fees;
      fees = await getFees();
      for (endpoint in fees) { 
        expect(fees[endpoint]).to.equal(prevFees[endpoint]);
      }
    } catch (err) {
      console.log('Error: ', err.json);
      expect(err).to.equal(null);
    } 
  })

   it('Set register_fio_domain fee ratio for 17th prod to 200 FIO', async () => {
    try {
      let endpoint = 'register_fio_domain'
      let value = 200000000000
      console.log("prod: ", topprods.rows[15].producer)
      account = topprods.rows[15].producer
      const result = await producers[account].sdk.genericAction('pushTransaction', {
        action: 'setfeevote',
        account: 'fio.fee',
        data: {
          fee_ratios: [
            {
              "end_point": endpoint,
              "value": value
            }
          ],
          actor: account
        }
      })
      console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json);
      expect(err).to.equal(null);
    } 
  })

  it('Wait 60 seconds for fee setting.', async () => {
    await timeout(60000);
  })

  it('Confirm only register_fio_domain fee changed to 200 FIO', async () => {
    try {
      let value = 200000000000;
      let prevFees = fees;
      fees = await getFees();
      for (endpoint in fees) { 
        console.log(endpoint + ' = ' + fees[endpoint])
        if (endpoint == 'register_fio_domain') {
          expect(fees[endpoint]).to.equal(value);
        } else {
          expect(fees[endpoint]).to.equal(prevFees[endpoint]);
        }
      }
    } catch (err) {
      console.log('Error: ', err.json);
      expect(err).to.equal(null);
    } 
  })

  it('2 minutes has passed, so set multipliers to 2 for topprods', async () => {
    try {
      topprods = await getTable('eosio', 'topprods');
      for (prod in topprods.rows) {
        //console.log("prod: ", topprods.rows[prod].producer)
        account = topprods.rows[prod].producer
        const result = await producers[account].sdk.genericAction('pushTransaction', {
          action: 'setfeemult',
          account: 'fio.fee',
          data: {
            multiplier: 2,
            actor: account
            //max_fee: config.api.unregister_producer.fee
          }
        })
        //console.log('Result: ', result)
        expect(result.status).to.equal('OK')
      }
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    } 
  })

  it('Wait 60 seconds for fee setting.', async () => {
    await timeout(60000);
  })

  it('Confirm only register_fio_domain fee changed to 400 FIO', async () => {
    try {
      let value = 400000000000;
      let prevFees = fees;
      fees = await getFees();
      for (endpoint in fees) { 
        console.log(endpoint + ' = ' + fees[endpoint])
        if (endpoint == 'register_fio_domain') {
          expect(fees[endpoint]).to.equal(value);
        } else {
          expect(fees[endpoint]).to.equal(prevFees[endpoint]);
        }
      }
    } catch (err) {
      console.log('Error: ', err.json);
      expect(err).to.equal(null);
    } 
  })
})

describe('C. Test invalid multipliers and ratios (using producer #20)', () => {
  let topprods

  it('If running on non-21 node localhost and this is the first test run, load and register BPs table', async () => {
    try {
      topprods = await getTopprods();
      console.log("topprods: ", topprods)
      if (topprods.rows.length == 3) {  // This is a first test run for a localhost 3 node test environment, so register the 21 producers
        for (prod in producersList) {  
          // Create the producers on the node and make a test sdk object for them
          //producers[prod] = await newUser(faucet, producersList[prod].account, producersList[prod].privateKey, producersList[prod].publicKey, producersList[prod].domain, producersList[prod].address);
          let prodAccount = producersList[prod].account;
          producers[prodAccount] = await newUser(faucet, producersList[prod].account, producersList[prod].privateKey, producersList[prod].publicKey, producersList[prod].domain, producersList[prod].address);        
          // Register the producer
          console.log('Register the producer'); 
          console.log('ProdAccount: ', producers[prodAccount].sdk); 
          console.log('ProdAccount: ', producers[prodAccount].privateKey); 
          const result1 = await producers[prodAccount].sdk.genericAction('pushTransaction', {
            action: 'regproducer',
            account: 'eosio',
            data: {
              fio_address: producers[prodAccount].address,
              fio_pub_key: producers[prodAccount].publicKey,
              url: "https://mywebsite.io/",
              location: 80,
              actor: producers[prodAccount].account,
              max_fee: config.api.register_producer.fee
            }
          })
          // Have the producer vote for themselves
          console.log('Have the producer vote for themselves'); 
          const result2 = await producers[prodAccount].sdk.genericAction('pushTransaction', {
            action: 'voteproducer',
            account: 'eosio',
            data: {
              "producers": [
                producers[prodAccount].address
              ],
              fio_address: producers[prodAccount].address,
              actor: producers[prodAccount].account,
              max_fee: config.api.vote_producer.fee
            }
          })
        }
        //Wait for topprods table to update (is it 1 minute?)
        console.log('Wait 60 seconds for topprods table to update');
        await timeout(60000);
      } else { // Just create the test sdk objects for the existing producers
        for (prod in producersList) {  
          //console.log("producersList[prod]: ", producersList[prod])
          //producers[prod] = await existingUser(producersList[prod].account, producersList[prod].privateKey, producersList[prod].publicKey, producersList[prod].domain, producersList[prod].address)
          producers[producersList[prod].account] = await existingUser(producersList[prod].account, producersList[prod].privateKey, producersList[prod].publicKey, producersList[prod].domain, producersList[prod].address)
        }
      }
    } catch (err) {
      console.log('Error: ', err.json);
      expect(err).to.equal(null);
    } 
  }) 

  it.skip(`Bug: .Set fee ratio to negative number gives error: ${config.error.invalidRatioFeeError}`, async () => {
    try {
      let endpoint = 'register_fio_domain'
      let value = -400
      account = topprods.rows[19].producer
      const result = await producers[account].sdk.genericAction('pushTransaction', {
        action: 'setfeevote',
        account: 'fio.fee',
        data: {
          fee_ratios: [
            {
              "end_point": endpoint,
              "value": value
            }
          ],
          actor: account
        }
      })
      console.log('Result: ', result)
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      //console.log('Error: ', err.message);
      expect(err.message).to.equal(config.error.invalidRatioFeeError)
    } 
  })

  it(`Set fee ratio to float (123.456) number gives error: ${config.error.invalidRatioFeeError}`, async () => {
    try {
      let endpoint = 'register_fio_domain'
      let value = 123.456
      account = topprods.rows[19].producer
      const result = await producers[account].sdk.genericAction('pushTransaction', {
        action: 'setfeevote',
        account: 'fio.fee',
        data: {
          fee_ratios: [
            {
              "end_point": endpoint,
              "value": value
            }
          ],
          actor: account
        }
      })
      console.log('Result: ', result)
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      //console.log('Error: ', err.message);
      expect(err.message).to.equal(config.error.invalidRatioFeeError)
    } 
  })

  it(`Set fee ratio to 1,000,000,000,000,000,000,000,000 number gives error: ${config.error.invalidRatioFeeError}`, async () => {
    try {
      let endpoint = 'register_fio_domain'
      let value = 1000000000000000000000000
      //console.log('Producer: ', topprods.rows[18].producer)
      account = topprods.rows[18].producer
      const result = await producers[account].sdk.genericAction('pushTransaction', {
        action: 'setfeevote',
        account: 'fio.fee',
        data: {
          fee_ratios: [
            {
              "end_point": endpoint,
              "value": value
            }
          ],
          actor: account
        }
      })
      console.log('Result: ', result)
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      //console.log('Error: ', err.message);
      expect(err.message).to.equal(config.error.invalidRatioFeeError)
    } 
  })



  it(`Set multiplier to negative number gives error: ${config.error.invalidMultiplierFeeError}`, async () => {
    try {
      let endpoint = 'register_fio_domain'
      let value = -400.12
      account = topprods.rows[19].producer
      const result = await producers[account].sdk.genericAction('pushTransaction', {
        action: 'setfeemult',
        account: 'fio.fee',
        data: {
          fee_ratios: [
            {
              "multiplier": endpoint,
              "value": value
            }
          ],
          actor: account
        }
      })
      console.log('Result: ', result)
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      //console.log('Error: ', err);
      expect(err.message).to.equal(config.error.invalidMultiplierFeeError)
    } 
  })

  it(`Set fee multiplier to 1,000,000,000,000,000,000 number gives error: ${config.error.invalidMultiplierFeeError}`, async () => {
    try {
      let endpoint = 'register_fio_domain'
      let value = 1000000000000000000
      account = topprods.rows[19].producer
      const result = await producers[account].sdk.genericAction('pushTransaction', {
        action: 'setfeemult',
        account: 'fio.fee',
        data: {
          fee_ratios: [
            {
              "multiplier": endpoint,
              "value": value
            }
          ],
          actor: account
        }
      })
      console.log('Result: ', result)
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      //console.log('Error: ', err.message);
      expect(err.message).to.equal(config.error.invalidMultiplierFeeError)
    } 
  })
  
})

describe('D. Set fees for all endpoints for all bps to see if we get any CPU limit errors.', () => {

  let fees, topprods, endpointJson

  it('If running on non-21 node localhost and this is the first test run, load and register BPs table', async () => {
    try {
      topprods = await getTopprods();
      //console.log("topprods: ", topprods)
      if (topprods.rows.length == 3) {  // This is a first test run for a localhost 3 node test environment, so register the 21 producers
        for (prod in producersList) {  
          // Create the producers on the node and make a test sdk object for them
          //producers[prod] = await newUser(faucet, producersList[prod].account, producersList[prod].privateKey, producersList[prod].publicKey, producersList[prod].domain, producersList[prod].address);
          prodAccount = producersList[prod].account;
          producers[prodAccount] = await newUser(faucet, producersList[prod].account, producersList[prod].privateKey, producersList[prod].publicKey, producersList[prod].domain, producersList[prod].address);
          // Register the producer
          const result1 = await producers[prodAccount].sdk.genericAction('pushTransaction', {
            action: 'regproducer',
            account: 'eosio',
            data: {
              fio_address: producers[prodAccount].address,
              fio_pub_key: producers[prodAccount].publicKey,
              url: "https://mywebsite.io/",
              location: 80,
              actor: producers[prodAccount].account,
              max_fee: config.api.register_producer.fee
            }
          })
          // Have the producer vote for themselves
          const result2 = await producers[prodAccount].sdk.genericAction('pushTransaction', {
            action: 'voteproducer',
            account: 'eosio',
            data: {
              "producers": [
                producers[prodAccount].address
              ],
              fio_address: producers[prodAccount].address,
              actor: producers[prodAccount].account,
              max_fee: config.api.vote_producer.fee
            }
          })
        }
        //Wait for topprods table to update (is it 1 minute?)
        console.log('Wait 60 seconds for topprods table to update');
        await timeout(60000);
      } else { // Just create the test sdk objects for the existing producers
        for (prod in producersList) {  
          //console.log("producersList[prod]: ", producersList[prod])
          //producers[prod] = await existingUser(producersList[prod].account, producersList[prod].privateKey, producersList[prod].publicKey, producersList[prod].domain, producersList[prod].address)
          producers[producersList[prod].account] = await existingUser(producersList[prod].account, producersList[prod].privateKey, producersList[prod].publicKey, producersList[prod].domain, producersList[prod].address)
        }
      }
    } catch (err) {
      console.log('Error: ', err.json);
      console.log('Error details: ', err.json.error.details[0]);
      expect(err).to.equal(null);
    } 
  }) 

  // Not working, trying to create the list of endpoints and values automatically. I just did it manually in the next section for now.
  it.skip('Create fee_ratios json', async () => {
    try {
      let value = 100000000000;
      endpointJson = '';
      fees = await getFees();
      for (endpoint in fees) { 
        endpointJson = endpointJson + '{"end_point": "' + endpoint + '", "value": ' + value + '},' 
      }
      // Remove the final comma
      endpointJson = endpointJson.replace(/,\s*$/, "");
      //console.log('endpointJson: ', endpointJson);
    } catch (err) {
      console.log('Error: ', err.json);
      expect(err).to.equal(null);
    } 
  })

  it('Set multipliers to 1 for initial 3 topprods', async () => {
    try {
      topprods = await getTable('eosio', 'topprods');
      for (prod = 0; prod < 16; prod++) {
        //console.log("prod: ", topprods.rows[prod].producer)
        account = topprods.rows[prod].producer
        const result = await producers[account].sdk.genericAction('pushTransaction', {
          action: 'setfeemult',
          account: 'fio.fee',
          data: {
            multiplier: 1,
            actor: account,
            max_fee: 1000000000
          }
        })
        //console.log('Result: ', result)
        expect(result.status).to.equal('OK')
      }
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    } 
  })

  it('Set fees for all endpoints for all 21 topprods', async () => {
    topprods = await getTopprods();
    //for (i = 0; i < 6; i++) {
    const endPoints = {
      "end_point": "register_fio_domain"
    }

    //for (prod in topprods.rows) {
    for (prod = 5; prod < 22; prod++) {
      console.log('prod: ', prod)
      account = topprods.rows[prod].producer
      console.log('Setting fees for: ', account);
      try {
        const result = await producers[account].sdk.genericAction('pushTransaction', {
          action: 'setfeevote',
          account: 'fio.fee',
          data: {
            fee_ratios: [
              {"end_point": "register_fio_domain", "value": 100000000000},
              {"end_point": "register_fio_address", "value": 100000000000}
              //{"end_point": "renew_fio_domain", "value": 100000000000},
              //{"end_point": "renew_fio_address", "value": 100000000000},
              //{"end_point": "add_pub_address", "value": 100000000000},
              //{"end_point": "transfer_fio_domain", "value": 100000000000},
              //{"end_point": "transfer_fio_address", "value": 100000000000},
              //{"end_point": "transfer_tokens_pub_key", "value": 100000000000},
              //{"end_point": "new_funds_request", "value": 100000000000},
              //{"end_point": "reject_funds_request", "value": 100000000000},
              //{"end_point": "record_obt_data", "value": 100000000000},
              //{"end_point": "set_fio_domain_public", "value": 100000000000},
              //{"end_point": "register_producer", "value": 100000000000},
              //{"end_point": "register_proxy", "value": 100000000000},
              //{"end_point": "unregister_proxy", "value": 100000000000},
              //{"end_point": "unregister_producer", "value": 100000000000},
              //{"end_point": "proxy_vote", "value": 100000000000},
              //{"end_point": "vote_producer", "value": 100000000000},
              //{"end_point": "submit_bundled_transaction", "value": 100000000000},
              //{"end_point": "auth_delete", "value": 100000000000},
              //{"end_point": "auth_link", "value": 100000000000},
              //{"end_point": "auth_update", "value": 100000000000},
              //{"end_point": "msig_propose", "value": 100000000000},
              //{"end_point": "msig_approve", "value": 100000000000},
              //{"end_point": "msig_unapprove", "value": 100000000000},
              //{"end_point": "msig_cancel", "value": 100000000000},
              //{"end_point": "msig_exec", "value": 100000000000},
              //{"end_point": "msig_invalidate", "value": 100000000000},
              //{"end_point": "remove_pub_address", "value": 100000000000},
              //{"end_point": "remove_all_pub_addresses", "value": 100000000000},
              //{"end_point": "cancel_funds_request", "value": 100000000000}
            ],
            actor: account,
            max_fee: 1000000000
          }
        })
        console.log('Result: ', result)
        expect(result.status).to.equal('OK')
       //if (prod == 5) { break; }
      } catch (err) {
        console.log('Error: ', err);
        console.log('Error details: ', err.json.error.details[0]);
        //expect(err).to.equal(null);
      } 
    }
  })

  /*
  it.skip('Need to make this an API call. updatefees with push action', async () => {
    try {
      result = await pushAction('fio.fee', 'updatefees', '{}', 'eosio@active');
      console.log('Result', result)
      //expect(fees['register_fio_domain']).to.be.greaterThan(0);
    } catch (err) {
      console.log('Error: ', err);
      //expect(err).to.equal(null);
    } 
  })

  it.skip('Call compute_fees API', async () => {
    try {
      const json = {}
      result = await callFioApi("compute_fees", json);
      //walletA1OrigRam = result.ram_quota;
      console.log('Result: ', result);
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })



  it.skip('Call compute_fees API', async () => {
    try {
      const result = await producers['qbxn5zhw2ypw'].sdk.genericAction('pushTransaction', {
        action: 'updatefees',
        account: 'fio.fee',
        data: {}
      })
      console.log('Result', result)
    } catch (err) {
      console.log('Error', err.json)
      console.log('Error', err.json.error.details)
      //expect(err).to.equal(null)
    }
  })
*/
})
