
const fioData = {
    minFundingAmount: 2000000000000,
        
    error: {
        validationError: 'ValidationError',
        invalidAmount: 'Invalid amount value',
        invalidKey: 'Invalid FIO Public Key',
        keyNotFound: 'Public key not found',
        insufficientBalance: 'Insufficient balance',
        feeExceedsMax: 'Fee exceeds supplied maximum.',
        domainNotPublic: 'FIO Domain is not public. Only owner can create FIO Addresses.',
        duplicateTxn: 'Duplicate transaction',
        domainRegistered: 'FIO domain already registered',
        invalidDomain: 'Invalid FIO domain',
        invalidFioName: 'Invalid FIO Name'
    },

    api: {
        register_fio_domain: {
            bundledEligible: false,
            fee: 800000000000
        },
        register_fio_address: {
            bundledEligible: false,
            fee: 40000000000
        },
        renew_fio_domain: {
            bundledEligible: false,
            fee: 800000000000
        },
        renew_fio_address: {
            bundledEligible: false,
            fee: 40000000000
        },
        add_pub_address: {
            bundledEligible: true,
            fee: 400000000
        },
        transfer_tokens_pub_key: {
            bundledEligible: false,
            fee: 2000000000
        },
        new_funds_request: {
            bundledEligible: true,
            fee: 800000000
        },
        reject_funds_request: {
            bundledEligible: true,
            fee: 400000000
        },
        record_obt_data: {
            bundledEligible: true,
            fee: 800 000 000
        },
        set_fio_domain_public: {
            bundledEligible: false,
            fee: 400000000
        },
        register_producer: {
            bundledEligible: false,
            fee: 200000000000
        },
        register_proxy: {
            bundledEligible: false,
            fee: 400000000
        },
        unregister_proxy: {
            bundledEligible: false,
            fee: 400000000
        },
        unregister_producer: {
            bundledEligible: false,
            fee: 400000000
        },
        proxy_vote: {
            bundledEligible: true,
            fee: 400000000
        },
        vote_producer: {
            bundledEligible: true,
            fee: 400000000
        }

    },

    fees: {
        FEE_register_fio_domain: 800000000000,
        FEE_register_fio_address: 40000000000,
        FEE_renew_fio_domain: 800000000000,
        FEE_renew_fio_address: 40000000000,
        FEE_add_pub_address: 400000000,
        FEE_transfer_tokens_pub_key: 2000000000,
        FEE_new_funds_request: 800000000,
        FEE_reject_funds_request: 400000000, 
        FEE_record_obt_data: 800000000, 
        FEE_set_fio_domain_public: 400000000,
        FEE_register_producer: 200000000000, 
        FEE_register_proxy: 400000000, 
        FEE_unregister_proxy: 400000000, 
        FEE_unregister_producer: 400000000, 
        FEE_proxy_vote: 400000000, 
        FEE_vote_producer: 400000000, 
        FEE_submit_bundled_transaction: 0
    },

    RAM: {
        INITIALACCOUNTRAM: 25600,
        REGDOMAINRAM: 2560,
        REGADDRESSRAM: 2560,
        ADDADDRESSRAM: 1024,
        SETDOMAINPUBRAM: 256,
        BURNEXPIREDRAM: 0,
        NEWFUNDSREQUESTRAM: 1536,
        RECORDOBTRAM: 1024,
        RENEWADDRESSRAM: 256, 
        RENEWDOMAINRAM: 256, 
        TPIDCLAIMRAM: 0,
        BPCLAIMRAM: 0, 
        TRANSFERRAM: 0, 
        TRANSFERPUBKEYRAM: 2560, 
        REJECTFUNDSRAM: 512, 
        UPDATEFEESRAM: 0, 
        SETFEEVOTERAM: 512, 
        SETFEEMULTRAM: 0
    },
    
    devBPs: [{
            "account": "3rmu4bip1dpi",
            "feeMultiplier": 1.0
        },
        {
            "account": "hpketsxgdcxe",
            "feeMultiplier": 1.0
        },
        {
            "account": "l4wbalfn5jcp",
            "feeMultiplier": 1.0
        }
    ]
}

module.exports = fioData;