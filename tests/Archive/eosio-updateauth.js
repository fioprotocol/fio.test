/**
 * Adds a new permission to an account. In this example it adds a "regaddress" permission to the account.
 * This permission can then be linked to a contract action (see eosio-linkauth.js) to enable a secondary 
 * account to execute actions on the primary accounts behalf.
 */

const { FIOSDK } = require('@fioprotocol/fiosdk')
fetch = require('node-fetch')
const properties = require('./properties.js')

const fetchJson = async (uri, opts = {}) => {
  return fetch(uri, opts)
}

const baseUrl = properties.server + '/v1/'

const privateKey = properties.privateKey,
  publicKey = properties.publicKey,
  permissionName = 'regaddress',
  parent = 'active',
  registrarAccount = '',  // The account that will register addresses on behalf of the domain owner
  permission = 'active',
  max_fee = 1000000000000


const regdomain = async () => {

  user = new FIOSDK(
    privateKey,
    publicKey,
    baseUrl,
    fetchJson
  )

  accountName = FIOSDK.accountHash(publicKey).accountnm;
  
  try {
      const result = await user.genericAction('pushTransaction', {
      action: 'updateauth',
      account: 'eosio',
      data: {
        account: accountName,
        permission: permissionName,
        parent: parent,
        auth: {
          threshold: 1,
          keys: [],
          waits: [],
          accounts: [{
            permission: {
              actor: registrarAccount,
              permission: permission
            },
            weight: 1
          }
          ]
        },
        max_fee: max_fee
      }
    })
    console.log('Result: ', result)
  } catch (err) {
    console.log('Error: ', err)
  }
}

regdomain();