require('mocha');
const { expect } = require('chai');
const { newUser} = require('../utils.js');
const { FIOSDK } = require('@fioprotocol/fiosdk');
const config = require('../config.js');

const createHash = require('create-hash');
const { arrayToHex } = require('@fioprotocol/fiojs/dist/chain-numeric');

describe(`************************** serialize-deserialize.js ************************** \n    A. Test for incremental serialization and signing`, () => {

    let user1, user2, chainData, transaction, serializedContextFreeData, serializedTransaction, signedTransaction, txnId, packedTrx;
    const fundsAmount = 2 * FIOSDK.SUFUnit

    it(`Create users`, async () => {
        user1 = await newUser(faucet);
        user2 = await newUser(faucet);
    });

    it(`Get data`, async () => {
        try {
            chainData = await user1.sdk.transactions.getChainDataForTx();
            //console.log('chainData: ', chainData);
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);
        }
    });

    it(`Get raw transaction`, async () => {
        try {
            transaction = await user1.sdk.transactions.createRawTransaction({
                action: 'trnsfiopubky',
                account: 'fio.token',
                data: {
                    payee_public_key: user1.publicKey,
                    amount: fundsAmount,
                    max_fee: config.maxFee,
                    tpid: ''
                },
                publicKey,
                chainData,
            });
            //console.log('transaction: ', transaction);
            //console.log('actions: ', transaction.actions);
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);
        }
    });

    it(`Serialize transaction`, async () => {
        try {
            const result = await user1.sdk.transactions.serialize({
                chainId: chainData.chain_id,
                transaction,
            });
            //console.log('Result: ', result);
            serializedContextFreeData = result.serializedContextFreeData;
            serializedTransaction = result.serializedTransaction;
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);
        }
    });

    it(`Get hex of serializedTransaction`, async () => {
        try {
            packedTrx =  arrayToHex(serializedTransaction);
            //console.log('packedTrx: ', packedTrx);
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);
        }
    });

    it(`Pre-compute Transaction ID`, async () => {
        try {
            txnId = createHash('sha256').update(serializedTransaction).digest().toString('hex')
            //console.log('txnId: ', txnId);
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);
        }
    });

    it(`Sign transaction`, async () => {
        try {
            signedTransaction = await user1.sdk.transactions.sign({
                chainId: chainData.chain_id,
                privateKeys: [privateKey],
                transaction,
                serializedTransaction,
                serializedContextFreeData,
            });
            //console.log('signedTransaction: ', signedTransaction);
            expect(signedTransaction.packed_trx).to.equal(packedTrx);
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);
        }
    });

    it(`Execute transaction`, async () => {
        try {
            const result = await user1.sdk.executePreparedTrx('transfer_tokens_pub_key', signedTransaction);
            //console.log('result: ', result);
            expect(result.transaction_id).to.equal(txnId);
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);
        }
    });
});