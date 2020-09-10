require('mocha')
const {expect} = require('chai')
const {newUser, getBlock, fetchJson} = require('../../utils.js');
const {FIOSDK } = require('@fioprotocol/FIOSDK')
config = require('../../config.js');




before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson)
})

describe('************************** get-blocks.js ************************** \n A. Get blocks', () => {


  it(`Find next block with transaction`, async () => {
    let i = 1
    let result = await getBlock(i);
    console.log("Transaction1: ", result)
    while (true) {
        //result = await getBlock(i);
        console.log("Block num: ", result.block_num)
        console.log("Transaction: ", result.transactions[0])

        //if (result.transactions = null) {
        //    console.log("null")
        //} else {
        //    console.log("Transaction: ", result.transactions)
        //}
        result = await getBlock(i++);
    }
  })

})