require('mocha')
const {expect} = require('chai')
const {getBlock, readProdFile, getTopprods, getTable, timeout, callFioApi, callFioApiSigned, getFees, newUser, existingUser, fetchJson} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
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
  producersList = await readProdFile(config.PRODKEYFILELOCAL);
})

describe.skip('************************** producer_fee-setting.js ************************** \n A. Set fee ratio to zero for bp1 and confirm no exceptions thrown (MAS-1888).', () => {
  let bp = 'qbxn5zhw2ypw' // (bp1)

  it('Get action_mroot from latest block and confirm it is not zero.', async () => {
    const fiourl = config.URL + "/v1/chain/";
    getInfo = await (await fetch(fiourl + 'get_info')).json();
    //console.log("getInfo head_block_num: ", getInfo.head_block_num)
    const block =  await (await fetch(fiourl + 'get_block', {body: `{"block_num_or_id": ${getInfo.head_block_num}}`, method: 'POST'})).json()
    //console.log("Block: ", block)
    expect(block.action_mroot).to.not.equal('0000000000000000000000000000000000000000000000000000000000000000')
  })

  it('Set multiplier to 1 for bp1', async () => {
    try {
      const result = await producers[bp].sdk.genericAction('pushTransaction', {
        action: 'setfeemult',
        account: 'fio.fee',
        data: {
          multiplier: 1,
          actor: bp,
          max_fee: config.maxFee
        }
      })
      //console.log('Result: ', result)
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
          actor: bp,
          max_fee: config.maxFee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json.fields);
      expect(err).to.equal(null);
    }
  })

  it('Call computefees action', async () => {
    try {
      const result = await producers[bp].sdk.genericAction('pushTransaction', {
        action: 'computefees',
        account: 'fio.fee',
        data: {
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json.fields);
      expect(err).to.equal(null);
    }
  })

  it('Get action_mroot from latest block and confirm it is not zero.', async () => {
    const fiourl = config.URL + "/v1/chain/";
    getInfo = await (await fetch(fiourl + 'get_info')).json();
    //console.log("getInfo head_block_num: ", getInfo.head_block_num)
    const block =  await (await fetch(fiourl + 'get_block', {body: `{"block_num_or_id": ${getInfo.head_block_num}}`, method: 'POST'})).json()
    //console.log("Block: ", block)
    expect(block.action_mroot).to.not.equal('0000000000000000000000000000000000000000000000000000000000000000')
  })

})

describe('B. Test 15 prod activation for fee setting.', () => {

  let fees, topprods, firstRun = false

  it('If running on non-21 node localhost and this is the first test run, load and register BPs table', async () => {
    try {
      topprods = await getTopprods();
      //console.log("topprods: ", topprods)
      if (topprods.rows.length == 3) {  // This is a first test run for a localhost 3 node test environment, so register the 21 producers
        firstRun = true;
        for (prod in producersList) {
          // Create the producers on the node and make a test sdk object for them
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
        //console.log('Wait 60 seconds for topprods table to update');
        //await timeout(60000);
      } else { // Just create the test sdk objects for the existing producers
        for (prod in producersList) {
          //console.log("producersList[prod]: ", producersList[prod])
          producers[producersList[prod].account] = await existingUser(producersList[prod].account, producersList[prod].privateKey, producersList[prod].publicKey, producersList[prod].domain, producersList[prod].address)
        }
      }
    } catch (err) {
      console.log('Error: ', err.json);
      expect(err).to.equal(null);
    }
  })

  it('If first run wait 30 seconds for topprods table to update.', async () => {
    if (firstRun) {
      await timeout(30000);
    }
  })

  it('If first run wait 30 more seconds.', async () => {
    if (firstRun) {
      await timeout(30000);
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
      console.log("topprods: ", topprods)
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

  it.skip('Confirm ratio table is empty', async () => {
    try {
      const feevotes2 = await getTable('fio.fee', 'feevotes2');
      console.log("feevotes2: ", feevotes2)
      expect(feevotes2.rows.length).to.equal(0);
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal(null);
    }
  })

  it('Set multipliers to 1 for topprods', async () => {
    let account;
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'topprods',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      const topprodsTable = await callFioApi("get_table_rows", json);

      for (prod in topprodsTable.rows) {
        //console.log("prod: ", topprodsTable.rows[prod].producer)
        account = topprodsTable.rows[prod].producer
        const result = await producers[account].sdk.genericAction('pushTransaction', {
          action: 'setfeemult',
          account: 'fio.fee',
          data: {
            multiplier: 1,
            actor: account,
            max_fee: config.maxFee
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

    it(`Show multipliers table.`, async () => {
    try {
      const json = {
        json: true,
        code: 'fio.fee',
        scope: 'fio.fee',
        table: 'feevoters',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      const table = await callFioApi("get_table_rows", json);
      console.log('fiovoters table: ', table);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it('Get current fees', async () => {
    try {
      fees = await getFees();
      console.log('Fees table: ', fees)
      expect(fees['register_fio_domain']).to.be.greaterThan(0);
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  })

  it('Set register_fio_domain fee ratio for 1-7 prods to 100 FIO', async () => {
    try {
      let endpoint = 'register_fio_domain';
      let value = 100000000000;
      let account;
      for (i = 0; i < 7; i++) {
        //console.log("prod: ", topprods.rows[i].producer)
        account = topprods.rows[i].producer
        const result = await producers[account].sdk.genericAction('pushTransaction', {
          action: 'setfeevote',
          account: 'fio.fee',
          data: {
            fee_ratios: [
              {
                end_point: endpoint,
                value: value,
              }
            ],
            actor: account,
            max_fee: config.maxFee
          }
        })
        //console.log('Result: ', result)
        expect(result.status).to.equal('OK')
      }
    } catch (err) {
      console.log('Error: ', err.json.fields);
      expect(err).to.equal(null);
    }
  })

  it('Call computefees action', async () => {
    try {
      const result = await producers[account].sdk.genericAction('pushTransaction', {
        action: 'computefees',
        account: 'fio.fee',
        data: {
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json.fields);
      expect(err).to.equal(null);
    }
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
        //console.log("prod: ", topprods.rows[i].producer)
        account = topprods.rows[i].producer
        const result = await producers[account].sdk.genericAction('pushTransaction', {
          action: 'setfeevote',
          account: 'fio.fee',
          data: {
            fee_ratios: [
              {
                end_point: endpoint,
                value: value
              }
            ],
            actor: account,
            max_fee: config.maxFee
          }
        })
        //console.log('Result: ', result)
        expect(result.status).to.equal('OK')
      }
    } catch (err) {
      console.log('Error: ', err.json);
      expect(err).to.equal(null);
    }
  })

  it('Call computefees action', async () => {
    try {
      const result = await producers[account].sdk.genericAction('pushTransaction', {
        action: 'computefees',
        account: 'fio.fee',
        data: {
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json.fields);
      expect(err).to.equal(null);
    }
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
              end_point: endpoint,
              value: value
            }
          ],
          actor: account,
          max_fee: config.maxFee
        }
      })
      console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json);
      expect(err).to.equal(null);
    }
  })

  it('Confirm fees have not changed since computefees has not been run', async () => {
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

  it(`Show ratios table.`, async () => {
    try {
      const json = {
        json: true,
        code: 'fio.fee',
        scope: 'fio.fee',
        table: 'feevotes2',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      const feevotes2 = await callFioApi("get_table_rows", json);
      for (voter in feevotes2.rows) {
        console.log('voter: ', feevotes2.rows[voter]);
      }
      //console.log('fiovotes (ratio) table: ', table);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it('Call computefees action', async () => {
    try {
      const result = await producers[account].sdk.genericAction('pushTransaction', {
        action: 'computefees',
        account: 'fio.fee',
        data: {
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json.fields);
      expect(err).to.equal(null);
    }
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
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  })
/*
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
          actor: account,
          max_fee: config.maxFee
        }
      })
      console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json);
      expect(err).to.equal(null);
    }
  })

  it('Call computefees action', async () => {
    try {
      const result = await producers[account].sdk.genericAction('pushTransaction', {
        action: 'computefees',
        account: 'fio.fee',
        data: {
        }
      })
      console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json.fields);
      expect(err).to.equal(null);
    }
  })

  it('Confirm fees have not changed (even amount does what??)', async () => {
    try {
      let prevFees = fees;
      console.log('prevFees: ', prevFees)
      fees = await getFees();
      console.log('Fees: ', fees)
      for (endpoint in fees) {
        expect(fees[endpoint]).to.equal(prevFees[endpoint]);
      }
    } catch (err) {
      console.log('Error: ', err);
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
          actor: account,
          max_fee: config.maxFee
        }
      })
      console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json);
      expect(err).to.equal(null);
    }
  })

  it('Call computefees action', async () => {
    try {
      const result = await producers[account].sdk.genericAction('pushTransaction', {
        action: 'computefees',
        account: 'fio.fee',
        data: {
        }
      })
      console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json.fields);
      expect(err).to.equal(null);
    }
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

  it('Wait 60 seconds.', async () => {
    await timeout(60000);
  })

  it('Wait 60 seconds.', async () => {
    await timeout(60000);
  })

  it('2 minutes has passed, so set multipliers to 2 for topprods', async () => {
    let account;
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'topprods',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      const topprodsTable = await callFioApi("get_table_rows", json);

      for (prod in topprodsTable.rows) {
        console.log("prod: ", topprodsTable.rows[prod].producer)
        account = topprodsTable.rows[prod].producer
        const result = await producers[account].sdk.genericAction('pushTransaction', {
          action: 'setfeemult',
          account: 'fio.fee',
          data: {
            multiplier: 2,
            actor: account,
            max_fee: config.maxFee
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

  it('Call computefees action', async () => {
    try {
      const result = await producers[account].sdk.genericAction('pushTransaction', {
        action: 'computefees',
        account: 'fio.fee',
        data: {
        }
      })
      console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json.fields);
      expect(err).to.equal(null);
    }
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
*/

})

describe('C. Test invalid multipliers and ratios (using producer #20)', () => {
  let topprods

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
