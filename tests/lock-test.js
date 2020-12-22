require('mocha')
const {expect} = require('chai')
const {newUser, existingUser, fetchJson, callFioApi, createKeypair} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/FIOSDK')
config = require('../config.js');
const fs = require('fs');

let vestingSchedule = [
  {
    "day": 0,
    "unlockPercent": 0
  },
  {
    "day": 2,
    "unlockPercent": 0.06
  },
  {
    "day": 7,
    "unlockPercent": 0.248
  },
  {
    "day": 12,
    "unlockPercent": 0.436
  },
  {
    "day": 17,
    "unlockPercent": 0.624
  },
  {
    "day": 22,
    "unlockPercent": 0.812
  },
  {
    "day": 27,
    "unlockPercent": 1
  }
]

let accounts = [
  { 
    "publicKey": "FIO5veJy6yh1wLK5D7shUH5vEzDWM2RuA6QUZHRu9kGxRwY3uB9UJ", 
    "privateKey": "5Jqhqfn4A7XYPWfFVciWiC9cReinov6JkivgKEU33GVk2PhLBHt", 
    "account": "cqanc3nofcdx", 
    "grantAmount": 536685000000000, 
    "locktype": 1 
    },
   { 
    "publicKey": "FIO74aFubSg2oDoCT65QVsMbhmu9Hstn4iu4kVcE31QzEim8RG6G5", 
    "privateKey": "5Kez2B4zxudcHMocKM1Xvgivj7oqMe7KQyPV8RH11mdiKQcaJBY", 
    "account": "yesnhk5owtrf", 
    "grantAmount": 577608000000000, 
    "locktype": 1 
    },
   { 
    "publicKey": "FIO5BpDqC2MLyuVqJ3rkqXkDa16dRGrsKt7ebyxukBddykLrCocgw", 
    "privateKey": "5HzFbcGwseYZgJvViPmLHyPFcVBZmpTVMCaKxuHcAkGV7FMAEu2", 
    "account": "bqtvtxeprr32", 
    "grantAmount": 1175718000000000, 
    "locktype": 1 
    },
   { 
    "publicKey": "FIO4x8rkZM9p8UxDHDV95fepG65EaB5XDgnH4hYNE53tZpJGfFUZJ", 
    "privateKey": "5K7AKKx7zUPwCh4oLUFayhFnJmSSc7xqyYNwQY5tYEFdX1VNszx", 
    "account": "cbqslo5dgogg", 
    "grantAmount": 1723128000000000, 
    "locktype": 1 
    },
   { 
    "publicKey": "FIO6n7BMKtBfmjFHxGdAL624wW6cXVpXNHzkX9ESmMPHQ35wx1Hpr", 
    "privateKey": "5HuQAEH96jSWiaTP8cLidQ8TTr7eLZhpi7vy9P7Y5RsdUpaSh6o", 
    "account": "saxvgku1zse4", 
    "grantAmount": 1814779000000000, 
    "locktype": 1 
    },
   { 
    "publicKey": "FIO5UgYYyxm1KnaHEom3y9jCUzT51m8zNUJX58u5wVEz1Qu4z6TyT", 
    "privateKey": "5Kdbon9aCpBnwu9Pq9nYRTwU8pMfvNqdUW3LuRxvcfnSbG1Agax", 
    "account": "h3b14o2voayh", 
    "grantAmount": 1980746000000000, 
    "locktype": 1 
    },
   { 
    "publicKey": "FIO81WpMRHc8zMghqcgB1ouq3CBvY9o31kWMADqiStQmTUWrvv1bo", 
    "privateKey": "5KRiLMWcDB2gEPxTf5Vv571r1o5VJR8BvPir7iW2AqHMx98yFRw", 
    "account": "vet5z1rc12mr", 
    "grantAmount": 2146740000000000, 
    "locktype": 1 
    },
   { 
    "publicKey": "FIO76kXqwTZhA8Wht9nkhiXUaG7TePtJitPFYdWVgjEMJ7HEHn3CU", 
    "privateKey": "5JcLodsYUJ8fBXdh4ERYK3yfNufgRdw2YisLn9bqNbaMnNYwmgx", 
    "account": "3vb1sno12gda", 
    "grantAmount": 2351464000000000, 
    "locktype": 1 
    },
   { 
    "publicKey": "FIO5vK1k4yNiyqvD3AkpkTpbQmVf9i3oMTqdRv6dCPzsCQvjwS75W", 
    "privateKey": "5KAnqhp83TS1CVHaeAo9Er85z3sDBk6io3ws7JE16nxZhcMMiNZ", 
    "account": "bp1tvoakumxt", 
    "grantAmount": 2795767000000000, 
    "locktype": 1 
    },
   { 
    "publicKey": "FIO6nkPQuPxXkLD8N911A6PaXBSopD6PRTVUqmiDv7PBRAY7WA4pQ", 
    "privateKey": "5KSR31TqVHH65AQaDUSKQbZYbN2JTAnhTc4m8hkkPwyc4JzJSvR", 
    "account": "uv4p4g4ha1wl", 
    "grantAmount": 3091301000000000, 
    "locktype": 1 
    },
   { 
    "publicKey": "FIO8HtqBWvQXqfMW2efijXmXn87x8o3r8o6CLns1o8AvZBRD98yNY", 
    "privateKey": "5KLkwB6NNWdEnCabmpnDbNnZt3s5zmo5zLN96PHoHxgAJvQ2NbT", 
    "account": "vmyb3gahhubo", 
    "grantAmount": 3629584000000000, 
    "locktype": 1 
    },
   { 
    "publicKey": "FIO6CDzRDqzTXMYXe4mJrft2qAxVFg6MuxxZkBFcfpk9eqsZoztN8", 
    "privateKey": "5J7zWhwRWV9k9rNau2pddBLVv1ZxLKwUZxDGkXvagh7s8pHhg4b", 
    "account": "fr2r4a4qzrqy", 
    "grantAmount": 4293480000000000, 
    "locktype": 1 
    },
   { 
    "publicKey": "FIO8Gct26EEe3WqNRBb8bAEgQhntwUDhCQVeUJzUrnWj5Pem7NcnE", 
    "privateKey": "5HrCEMvhgzSSuFNzYTtpydUKV1Z4euSz78akETqexXMaxzXKBRM", 
    "account": "xqidej5bnrqm", 
    "grantAmount": 4702954000000000, 
    "locktype": 1 
    },
   { 
    "publicKey": "FIO7dtpd8h7jQLMq3kUo2ztLSRfh3ME1zcH8BFspcb4QCTpY2gmSP", 
    "privateKey": "5HpgkAuHBujMk9AJCXusCL9vCkGttNxTat3VKKmSuV3nVvWp3MS", 
    "account": "dmwtpkaggrvo", 
    "grantAmount": 5366877000000000, 
    "locktype": 1 
    },
   { 
    "publicKey": "FIO8WmR71weVxrJuRfZ4AH5Ur1jjRu9jXmYWWbmYtwzd22gPe9TFU", 
    "privateKey": "5KFvXueMN6sEfjqYLX5ZqLoarNBaDGACqvMSFcRxDsBxQtEDXwz", 
    "account": "xp3puwvgmey1", 
    "grantAmount": 6598658000000000, 
    "locktype": 1 
    },
   { 
    "publicKey": "FIO5pc2gpT489dDQzr81Mzh18FK4zpasXTpYXVotAp2ZU8Q7QeHex", 
    "privateKey": "5KNUnXZsNTni41DUX2cqM24pHkEzgsaZGNMim4z7p2fh1Fdndds", 
    "account": "uzyl2wpdnrcv", 
    "grantAmount": 8408345000000000, 
    "locktype": 1 
    },
   { 
    "publicKey": "FIO7EDh5TBG9q26wcSkgKXAhAEqBPepeCW7ebtHPFxHeFW5ZL4zHX", 
    "privateKey": "5KLXAcoDuykmjZJVVie1YJseEWt39TRAKxod9nvV4BvB8KnaXYB", 
    "account": "ol5nbgugas33", 
    "grantAmount": 21259562000000000, 
    "locktype": 1 
    },
   { 
    "publicKey": "FIO6UKW8S2pzqkVjYtkD65vFFoadCbjL88AGYPY6Y59pofetxCQv2", 
    "privateKey": "5KaM3fBd2WMinrcE1hBf8U8Tqn9NhmSYXzRKnwQSVtkbS2Y8yR7", 
    "account": "k2tciid4ejvw", 
    "grantAmount": 48301893000000000, 
    "locktype": 1 
    },
   { 
    "publicKey": "FIO56G6NsgUtqHDtCUHaz5gEEp33rRt7DvFPVHgNGEURhPDDRzyrL", 
    "privateKey": "5JTtxYTdQC7qQXkfKpbUXyfCBvjhjSMhEygqhuEckrxwMaU5HEk", 
    "account": "uupfzmhrvxlq", 
    "grantAmount": 29253936000000000, 
    "locktype": 1 
    },
   { 
    "publicKey": "FIO78haXL6TsvuV3rZS6FVyRQR17DHsedDZ4UupVSB1NdN8msHsRp", 
    "privateKey": "5KYEJau8mbQHj3L47b85dHDYB8t88xKuBMbEZPDCsP8RtFT9Qpm", 
    "account": "bcpxf42u25bi", 
    "grantAmount": 41437168000000000, 
    "locktype": 1 
    },
   { 
    "publicKey": "FIO65xT3DL58T3B8KXAhZV3m4ZoprzaE3voxXGz6NgAE8LozdykJ1", 
    "privateKey": "5JAPyYMdoX4KnZKH5v5UJTLK3Yvt8ohWYzFrammrMtfb8agZQ8E", 
    "account": "xvob2mynuvqe", 
    "grantAmount": 10000000000, 
    "locktype": 1 
    },
   { 
    "publicKey": "FIO58uH7WZ6h8nHVguSNzig7zkScXMqmHKM673Q6dswBM2dSWfNR5", 
    "privateKey": "5K4N7mGQmcyQZaL99w6QB5yis9qaGJX7wFb7oNkVDRBr5z3r2kz", 
    "account": "tkugu1cemtig", 
    "grantAmount": 10000000000, 
    "locktype": 1 
    },
   { 
    "publicKey": "FIO7KPMLvtikVEW8PgBGdY9awwgoksd1Q7ec1prVbdKEcm3pffXvc", 
    "privateKey": "5Hti1S3wCTrC8s3ZG4bmQ7uCfDjFLP2sxfu84p25Hf85aJSQBZT", 
    "account": "zgvefkddrf32", 
    "grantAmount": 400000000000000, 
    "locktype": 1 
    },
   { 
    "publicKey": "FIO76UaDh974EcGvgnX5N44kJSxRUGy2mAKh7mGSc8chM7YHBxW5x", 
    "privateKey": "5JJtiCe3yYbXxCndC1p9yWEhQNC4wmnXN4E9Uv1nstB9d6nfJkL", 
    "account": "2vjybmeufvld", 
    "grantAmount": 406251000000000, 
    "locktype": 1 
    },
   { 
    "publicKey": "FIO62DtJ6j4pL34hVD6uF3PFVJtptma36ACtrvz1tts8ohHs1qw2g", 
    "privateKey": "5JR5bf83QDeBeGr1d8SQ46rDHe4r7AyjsUTvchCsCfV58D6vtML", 
    "account": "p1cljdxvagp4", 
    "grantAmount": 541668000000000, 
    "locktype": 1 
    },
   { 
    "publicKey": "FIO6nRGP9eQ1xHWwQUEp6yKXrvDwM6LGdf5ZzpFG8esViM1qgWjSp", 
    "privateKey": "5K4tMwvfH2r9r2vyoUocKrxJcnUbzUzEGuA9rT385ErK412wpKF", 
    "account": "tv2ksbwccwha", 
    "grantAmount": 800000000000000, 
    "locktype": 1 
    },
   { 
    "publicKey": "FIO7VSYQNjpy32ab4rtxsdgsgxYEgqBWRqSPTqwkeeFSopXGQMRob", 
    "privateKey": "5KEAUQBvM4TkRsc7uQcWdw4EEKdvzCzQbUAbmo1BqRFZTS5FaJy", 
    "account": "q1zpd4ev5i4b", 
    "grantAmount": 1300000000000000, 
    "locktype": 2 
    },
   { 
    "publicKey": "FIO8QgNswVWt8X2zX3g63rf3H5mUj8YWTRvFZLTRT4GFk59AeBaYM", 
    "privateKey": "5K4tDSnTPWyf6GzGbrQ3tTJXzGhczdV5MASGLGL9bpMmnwua1so", 
    "account": "j3rzza4aw3wr", 
    "grantAmount": 1500000000000000, 
    "locktype": 2 
    },
   { 
    "publicKey": "FIO5uR7PvEcq4LAkKPb3xXkeofrpnyBmMLcEUcgGieaT4AobtnK87", 
    "privateKey": "5JbXXwaiGo7TzaeXN1Mz6ff61Ahpa5UmdJaEoVeSXGC2jauDcsY", 
    "account": "5gp4swqeuucf", 
    "grantAmount": 1800000000000000, 
    "locktype": 2 
    },
   { 
    "publicKey": "FIO7WTCpFiYpHvXC2rtKYDgQnvM6DaawCcEif7HJS933ycPRAmCCo", 
    "privateKey": "5K6DvSVesgVsM6RpoDuqVXk4gLDywZksn17iVBSmGvJZYcQteFh", 
    "account": "tgecf5a44e4s", 
    "grantAmount": 1895839000000000, 
    "locktype": 1 
    },
   { 
    "publicKey": "FIO8EQquDpFaJMHVNo8q15KvVLoLDJzACah2tBsPf5fyATXVvoRSi", 
    "privateKey": "5JpTV2b6sqK5UVS7DH2P2m4fo8rV4BKEPfGC5BRjjhQ2PPLk1zt", 
    "account": "smxixj5oyjju", 
    "grantAmount": 2000000000000000, 
    "locktype": 2 
    },
   { 
    "publicKey": "FIO8CjnHBXAHBWZfwwBEjoz4REq6jYQbQmNNFNWa4TqYdsUvTbk6Q", 
    "privateKey": "5KHND4PU4v2e4Ab1ParnKfWBVr8E4MdqnJYAYSVQC1EiD9hGRC2", 
    "account": "oat3nnpab3f1", 
    "grantAmount": 2500000000000000, 
    "locktype": 2 
    },
   { 
    "publicKey": "FIO5e6KT7694GkiQjwjZKcWZfJPCE7dJEz6qyfTJgKAW1Gk474rfW", 
    "privateKey": "5Hv98tkHS3p5zKzz12PuQxQLE9BRvTttBebfBRJnLETgK1gtRKs", 
    "account": "31jcxmpx1mhg", 
    "grantAmount": 2708342000000000, 
    "locktype": 1 
    },
   { 
    "publicKey": "FIO7f2EPa273rNoceTHT4v1YZbYYKeoRCPTFhmEkk7HMd866j47AQ", 
    "privateKey": "5J5XhhKRyfCtFN3Ko2HTKiipLrqpPwiW9hNVijc5gxgjUhetWZZ", 
    "account": "g2aipjkttu1b", 
    "grantAmount": 3000000000000000, 
    "locktype": 2 
    },
   { 
    "publicKey": "FIO8SvUizuMV4Jein8EGcnPKTExUCp3i3PWRt1zjb6iiWLvSzcYpY", 
    "privateKey": "5JQM2zbZRSnuY979nBVmCBdPBACAyoDuCoJsiA4UYTSkKP5HHbi", 
    "account": "ovsbcvykaikd", 
    "grantAmount": 3489969000000000, 
    "locktype": 1 
    },
   { 
    "publicKey": "FIO6ARVvkBnjkbXQ2ce3vkuE2ba3eB7cZYpeuYjPabqU8YuP3SZqe", 
    "privateKey": "5JHcertG3iSWctifLxmbYXrQwMfPRoPCfYN9FbLpTGCoLsL2ReE", 
    "account": "bfcgyugbn2ew", 
    "grantAmount": 3530594000000000, 
    "locktype": 1 
    },
   { 
    "publicKey": "FIO8N1CWQ3TvnPSdVvWtCQF2kUs196Y4bfQpJELChfZC2nrd79WJM", 
    "privateKey": "5KXgZePGQL3TxDqXdsJzB5niUWn4pe7EEXRzSH1RGqDReMn2EXg", 
    "account": "dk1waedxwygx", 
    "grantAmount": 4000000000000000, 
    "locktype": 2 
    },
   { 
    "publicKey": "FIO5KRHsUAfdbVpkso4zkKM9Y33ek9t8aWDsLMN24ni2L9Zg13JJ5", 
    "privateKey": "5J1NbScMjJXUT1prVFXNR6KyVUfk5BVJtGe53SfR2mMAP9ooaU3", 
    "account": "svaozrovyc4j", 
    "grantAmount": 5500000000000000, 
    "locktype": 2 
    },
   { 
    "publicKey": "FIO5ZWv8p5nWCgg1yjc8KWbxjCcAKPwyeQDozktLe2SEZqXZA2xWH", 
    "privateKey": "5JFJMdtYndMvZPEqpnFhyAN627gXqKUmGzyD2TEamAGUxXmeuEB", 
    "account": "sxjice4lkgm2", 
    "grantAmount": 5965123000000000, 
    "locktype": 1 
    },
   { 
    "publicKey": "FIO7gjxhVwCbbUHFwRWGo9zsZf3X36CavzmyALLKmbwys4U89ZzZm", 
    "privateKey": "5KbHGztNYkqP3RdjVNdDU3oiFYRsybjNzQhaJHY5Sn7AuX1Jbd2", 
    "account": "kd51qpa3pjbb", 
    "grantAmount": 7000000000000000, 
    "locktype": 2 
    },
   { 
    "publicKey": "FIO4x3AEWTDcBpstzfqeYWdeRNdfwQgnvYfoJxW9s7re9Mz1DbGg1", 
    "privateKey": "5KXoeipWkZo15LE1rNHSRhAQ5nvGZZW5jd9S1uzd5XEoPnzucpq", 
    "account": "ciucfl1mgvuh", 
    "grantAmount": 7007834000000000, 
    "locktype": 1 
    },
   { 
    "publicKey": "FIO8JWdDvZPkVr33C6Gd5FydeCQFimCyGS3FwA6Lpa2nVjV73AysV", 
    "privateKey": "5JctDrW3X92Brqkjg7n6FwFYVKX5NNSgt6KoyT84G5vTLymk2ZV", 
    "account": "12gdxtxo1pqg", 
    "grantAmount": 8500000000000000, 
    "locktype": 2 
    },
   { 
    "publicKey": "FIO6AAHrmdewwbjnKY7rjumygYUo6pt1zeRtZdH1Tz9S51V1iupgT", 
    "privateKey": "5JgnXFMB7z5t6maDy4yHYWezXgs4BQPU6dz9W2hD7yTRBHZearF", 
    "account": "bbubsvffjcaq", 
    "grantAmount": 10000000000000000, 
    "locktype": 1 
    },
   { 
    "publicKey": "FIO4zWjmRh6uTAtyJTgd9P4dLv6ywQSzfaCBv3iDmZ6Rq6Nbm1z9M", 
    "privateKey": "5KSoT9BL53TPFGabwauTMgforM5Z9U6ujGG8VGVCMCSfGT3zvk6", 
    "account": "hhhsqgxaditg", 
    "grantAmount": 21678096000000000, 
    "locktype": 1 
    },
   { 
    "publicKey": "FIO5K5d7YJ9smEUvUTvuK5mDuJxKD81UbzXdKuUb9Zfe1g11G2hR2", 
    "privateKey": "5KT8p9kSXAs9v5k3GZdbk8o7pKeFPTxZS4bTw7KAc4cfLYvEKYG", 
    "account": "rqctshld5xuq", 
    "grantAmount": 222437168000000000, 
    "locktype": 1 
    }
]

let grants = [
  {
    "amount": 536685000000000,
    "locktype": 1
  },
  { 
    "amount": 577608000000000,
    "locktype": 1
  },
  { 
    "amount": 1175718000000000,
    "locktype": 1
  },
  { 
    "amount": 1723128000000000,
    "locktype": 1
  },
  { 
    "amount": 1814779000000000,
    "locktype": 1
  },
  { 
    "amount": 1980746000000000,
    "locktype": 1
  },
  { 
    "amount": 2146740000000000,
    "locktype": 1
  },
  { 
    "amount": 2351464000000000,
    "locktype": 1
  },
  { 
    "amount": 2795767000000000,
    "locktype": 1
  },
  { 
    "amount": 3091301000000000,
    "locktype": 1
  },
  { 
    "amount": 3629584000000000,
    "locktype": 1
  },
  { 
    "amount": 4293480000000000,
    "locktype": 1
  },
  { 
    "amount": 4702954000000000,
    "locktype": 1
  },
  { 
    "amount": 5366877000000000,
    "locktype": 1
  },
  { 
    "amount": 6598658000000000,
    "locktype": 1
  },
  { 
    "amount": 8408345000000000,
    "locktype": 1
  },
  { 
    "amount": 21259562000000000,
    "locktype": 1
  },
  { 
    "amount": 48301893000000000,
    "locktype": 1
  },
  { 
    "amount": 29253936000000000,
    "locktype": 1
  },
  { 
    "amount": 41437168000000000,
    "locktype": 1
  },
  { 
    "amount": 10000000000,
    "locktype": 1
  },
  { 
    "amount": 10000000000,
    "locktype": 1
  },
  { 
    "amount": 400000000000000,
    "locktype": 1
  },
  { 
    "amount": 406251000000000,
    "locktype": 1
  },
  { 
    "amount": 541668000000000,
    "locktype": 1
  },
  { 
    "amount": 800000000000000,
    "locktype": 1
  },
  { 
    "amount": 1300000000000000,
    "locktype": 2
  },
  { 
    "amount": 1500000000000000,
    "locktype": 2
  },
  { 
    "amount": 1800000000000000,
    "locktype": 2
  },
  { 
    "amount": 1895839000000000,
    "locktype": 1
  },
  { 
    "amount": 2000000000000000,
    "locktype": 2
  },
  { 
    "amount": 2500000000000000,
    "locktype": 2
  },
  { 
    "amount": 2708342000000000,
    "locktype": 1
  },
  { 
    "amount": 3000000000000000,
    "locktype": 2
  },
  { 
    "amount": 3489969000000000,
    "locktype": 1
  },
  { 
    "amount": 3530594000000000,
    "locktype": 1
  },
  { 
    "amount": 4000000000000000,
    "locktype": 2
  },
  { 
    "amount": 5500000000000000,
    "locktype": 2
  },
  { 
    "amount": 5965123000000000,
    "locktype": 1
  },
  { 
    "amount": 7000000000000000,
    "locktype": 2
  },
  { 
    "amount": 7007834000000000,
    "locktype": 1
  },
  { 
    "amount": 8500000000000000,
    "locktype": 2
  },
  { 
    "amount": 10000000000000000,
    "locktype": 1
  },
  { 
    "amount": 21678096000000000,
    "locktype": 1
  },
  { 
    "amount": 222437168000000000,
    "locktype": 1
  }
]

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
})

describe.skip(`************************** lock-test.js ************************** \n A. File and devtools output. Only run once.`, () => {
  var keys = []

  it(`Create accounts`, async () => {
    for (i = 0; i < grants.length; i++) {
      keys[i] = await createKeypair();
    }

    for (i = 0; i < keys.length; i++) {
      console.log('# Create locked token account')
      console.log(`#Public key: '${keys[i].publicKey}'`)
      console.log(`#Private key: '${keys[i].privateKey}'`)
      console.log(`#FIO Public Address (actor name): '${keys[i].account}'`)
      console.log(`./clio -u http://localhost:8889 create account eosio ${keys[i].account} ${keys[i].publicKey} ${keys[i].publicKey} \n`)
    }

    for (i = 0; i < keys.length; i++) {
      console.log(`# issue locked token grant to ${keys[i].account} as lock type ${grants[i].locktype} in the amount of ${grants[i].amount}`)
      console.log(`./clio -u http://localhost:8889 push action -j eosio addlocked '{"owner":"${keys[i].account}","amount":${grants[i].amount},"locktype":${grants[i].locktype}}' -p eosio@active\n`)
    }

    console.log("accounts = ")
    for (i = 0; i < keys.length; i++) {
      console.log(`{ \n "publicKey": "${keys[i].publicKey}", \n "privateKey": "${keys[i].privateKey}", \n "account": "${keys[i].account}", \n "grantAmount": ${grants[i].amount}, \n "locktype": ${grants[i].locktype} \n },`)
    }

    for (i = 0; i < keys.length; i++) {
      console.log('# Create locked token account')
      console.log(`#Public key: '${keys[i].publicKey}'`)
      console.log(`#FIO Public Address (actor name): '${keys[i].account}'`)
      console.log(`./clio -u http://localhost:8889 push action -j fio.token trnsfiopubky '{"payee_public_key": "'${keys[i].publicKey}'", "amount": ${grants[i].amount}, "max_fee": "40000000000", "actor": "eosio","tpid":""}' -p eosio@active\n`)
    }
  })
})

describe.skip(`Fund Accounts`, () => {
  let user = []
  it(`Fund accounts`, async () => {
    for (i = 0; i < accounts.length; i++) {
      try {
        user[i] = await existingUser(accounts[i].account, accounts[i].privateKey, accounts[i].publicKey, '', '');
        const result = await faucet.genericAction('transferTokens', {
          payeeFioPublicKey: user[i].publicKey,
          amount: 20000000000,
          maxFee: config.maxFee,
        })
      } catch (err) {
        console.log('Error', err);
      }
    }
  })
})

describe.skip(`B. Test`, () => {
  let user = [], testUser
  const currentTime = Date.now()/1000

  it(`Create accounts`, async () => {
    testUser = await newUser(faucet);

    for (i = 0; i < accounts.length; i++) {
      try {
        user[i] = await existingUser(accounts[i].account, accounts[i].privateKey, accounts[i].publicKey, '', '');
        //console.log("i: ", i);
        //console.log("Public key: ", user[i].publicKey)
        //console.log("Private key: ", user[i].privateKey)
        //console.log("Account: ", user[i].account)
      } catch (err) {
        console.log('Error', err);
      }
    }

    console.log("secondsSinceEpoch: ", currentTime)
  })

  it('Show lock amount for user', async () => {
    let timestamp
    try {
      const json = {
        json: true,               // Get the response as json
        code: 'eosio',      // Contract that we target
        scope: 'eosio',         // Account that owns the data
        table: 'lockedtokens',        // Table name
        limit: 1000,                // Maximum number of rows that we want to get
        reverse: false,           // Optional: Get reversed data
        show_payer: false          // Optional: Show ram payer
      }
      lockedAccounts = await callFioApi("get_table_rows", json);
      //console.log('lockedAccounts: ', lockedAccounts)
      for (lockedAccount in lockedAccounts.rows) {
        //if (lockedAccounts.rows[lockedAccount].owner == accounts[0].account) {
        if (lockedAccounts.rows[lockedAccount].owner == 'hevknweneejq') {
          console.log('Count: ', lockedAccount)
          console.log('lockedAccounts.rows[lockedAccount].owner: ', lockedAccounts.rows[lockedAccount].owner); 
          console.log('lockedAccounts.rows[lockedAccount].total_grant_amount: ', lockedAccounts.rows[lockedAccount].total_grant_amount); 
          console.log('lockedAccounts.rows[lockedAccount].unlocked_period_count: ', lockedAccounts.rows[lockedAccount].unlocked_period_count); 
          console.log('lockedAccounts.rows[lockedAccount].grant_type: ', lockedAccounts.rows[lockedAccount].grant_type); 
          console.log('lockedAccounts.rows[lockedAccount].inhibit_unlocking: ', lockedAccounts.rows[lockedAccount].inhibit_unlocking); 
          console.log('lockedAccounts.rows[lockedAccount].remaining_locked_amount: ', lockedAccounts.rows[lockedAccount].remaining_locked_amount); 
          console.log('lockedAccounts.rows[lockedAccount].timestamp: ', lockedAccounts.rows[lockedAccount].timestamp); 
          timestamp = lockedAccounts.rows[lockedAccount].timestamp;
          break;
        }
      }

      let elapsedMin = Math.round((currentTime - timestamp) / 60);
      console.log('elapsedMin: ', elapsedMin)

      //expect(result.rows[0].total_staking_incentives_granted).to.equal(totalstaking )
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Get account[0] FIO Balance`, async () => {
    try {
      const result = await user[21].sdk.genericAction('getFioBalance', {
        fioPublicKey: accounts[21].publicKey
      })
      console.log('user[0] getFioBalance: ', result.balance)
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it('50 FIO from faucet to user', async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: user[21].publicKey,
      amount: 50000000000,
      maxFee: config.maxFee,
    })
    //console.log('Result', result)
    expect(result.status).to.equal('OK')
  })

  it(`Trigger lock by voting`, async () => {
    console.log("Account: ", user[21].account)
    try {
      const result = await user[21].sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: '',
          actor: user[0].account,
          max_fee: config.maxFee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json.error)
    }
  })

  it('5 FIO from user to faucet to trigger locked account update', async () => {
    try {
      const result = await user[21].sdk.genericAction('transferTokens', {
        payeeFioPublicKey: faucet.publicKey,
        amount: 5000000000,
        maxFee: config.maxFee,
      })
      //console.log('Result', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json.fields)
    }
  })

  it(`Get account[0] FIO Balance`, async () => {
    try {
      const result = await user[21].sdk.genericAction('getFioBalance', {
        fioPublicKey: accounts[21].publicKey
      })
      console.log('user[0] getFioBalance: ', result.balance)
    } catch (err) {
      console.log('Error: ', err)
    }
  })

})

describe.skip(`B. Test`, () => {
  let user = [], testUser
  const currentTime = Date.now()/1000

  it(`Create accounts`, async () => {
    testUser = await newUser(faucet);

    for (i = 0; i < accounts.length; i++) {
      try {
        user[i] = await existingUser(accounts[i].account, accounts[i].privateKey, accounts[i].publicKey, '', '');
        //console.log("i: ", i);
        //console.log("Public key: ", user[i].publicKey)
        //console.log("Private key: ", user[i].privateKey)
        //console.log("Account: ", user[i].account)
      } catch (err) {
        console.log('Error', err);
      }
    }

    console.log("secondsSinceEpoch: ", currentTime)
  })

  it('Show lock amount for user', async () => {
    try {
      const json = {
        json: true,               // Get the response as json
        code: 'eosio',      // Contract that we target
        scope: 'eosio',         // Account that owns the data
        table: 'lockedtokens',        // Table name
        limit: 1000,                // Maximum number of rows that we want to get
        reverse: false,           // Optional: Get reversed data
        show_payer: false          // Optional: Show ram payer
      }
      lockedAccounts = await callFioApi("get_table_rows", json);
      //console.log('lockedAccounts: ', lockedAccounts)
      for (lockedAccount in lockedAccounts.rows) {
        if (lockedAccounts.rows[lockedAccount].owner == accounts[0].account) {
          console.log('Count: ', lockedAccount)
          console.log('lockedAccounts.rows[lockedAccount].owner: ', lockedAccounts.rows[lockedAccount].owner); 
          console.log('lockedAccounts.rows[lockedAccount].total_grant_amount: ', lockedAccounts.rows[lockedAccount].total_grant_amount); 
          console.log('lockedAccounts.rows[lockedAccount].unlocked_period_count: ', lockedAccounts.rows[lockedAccount].unlocked_period_count); 
          console.log('lockedAccounts.rows[lockedAccount].grant_type: ', lockedAccounts.rows[lockedAccount].grant_type); 
          console.log('lockedAccounts.rows[lockedAccount].inhibit_unlocking: ', lockedAccounts.rows[lockedAccount].inhibit_unlocking); 
          console.log('lockedAccounts.rows[lockedAccount].remaining_locked_amount: ', lockedAccounts.rows[lockedAccount].remaining_locked_amount); 
          console.log('lockedAccounts.rows[lockedAccount].timestamp: ', lockedAccounts.rows[lockedAccount].timestamp); 
          break;
        }
      }


      //expect(result.rows[0].total_staking_incentives_granted).to.equal(totalstaking )
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Get account[0] FIO Balance`, async () => {
    try {
      const result = await user[0].sdk.genericAction('getFioBalance', {
        fioPublicKey: accounts[0].publicKey
      })
      console.log('user[0] getFioBalance: ', result.balance)
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it('20 FIO from faucet to user', async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: user[0].publicKey,
      amount: 20000000000,
      maxFee: config.maxFee,
    })
    //console.log('Result', result)
    expect(result.status).to.equal('OK')
  })

  it(`Trigger lock by voting`, async () => {
    console.log("Account: ", user[0].account)
    try {
      const result = await user[0].sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: '',
          actor: user[0].account,
          max_fee: config.maxFee
        }
      })
      console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json.error)
    }
  })

  it('5 FIO from user to faucet to trigger locked account update', async () => {
    try {
      const result = await user[0].sdk.genericAction('transferTokens', {
        payeeFioPublicKey: faucet.publicKey,
        amount: 5000000000,
        maxFee: config.maxFee,
      })
      //console.log('Result', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json.fields)
    }
  })

  it(`Get account[0] FIO Balance`, async () => {
    try {
      const result = await user[0].sdk.genericAction('getFioBalance', {
        fioPublicKey: accounts[0].publicKey
      })
      console.log('user[0] getFioBalance: ', result.balance)
    } catch (err) {
      console.log('Error: ', err)
    }
  })

})


describe(`Trigger account with vote producer `, () => {
  let user = []

  it(`Create accounts`, async () => {
    for (i = 0; i < accounts.length; i++) {
      try {
        user[i] = await existingUser(accounts[i].account, accounts[i].privateKey, accounts[i].publicKey, '', '');
      } catch (err) {
        console.log('Error', err);
      }
    }
  })

  it(`Vote producer for every account`, async () => {
    for (i = 0; i < accounts.length; i++) {
      try {
        const result = await user[i].sdk.genericAction('pushTransaction', {
          action: 'voteproducer',
          account: 'eosio',
          data: {
            "producers": [
              'bp1@dapixdev'
            ],
            fio_address: '',
            actor: user[i].account,
            max_fee: config.maxFee
          }
        })
        //console.log('Result: ', result)
        expect(result.status).to.equal('OK')
      } catch (err) {
        console.log('Error: ', err)
      }
    }
  })
})

describe(`Full test`, () => {
  let user = [], testUser
  const currentTime = Date.now()/1000

  it(`Create accounts`, async () => {
    testUser = await newUser(faucet);

    for (i = 0; i < accounts.length; i++) {
      try {
        user[i] = await existingUser(accounts[i].account, accounts[i].privateKey, accounts[i].publicKey, '', '');
        //console.log("i: ", i);
        //console.log("Public key: ", user[i].publicKey)
        //console.log("Private key: ", user[i].privateKey)
        //console.log("Account: ", user[i].account)
      } catch (err) {
        console.log('Error', err);
      }
    }

    console.log("secondsSinceEpoch: ", currentTime)
  })

  it('Test locks for users after triggering unlock', async () => {
    let timestamp, lockedAccounts

    for (i = 0; i < accounts.length; i++) {
    //for (i = 0; i < 1; i++) {
      // Show account balance
      try {
        const result = await user[i].sdk.genericAction('getFioBalance', {
          fioPublicKey: accounts[i].publicKey
        })
        console.log('user[i] getFioBalance: ', result.balance)
      } catch (err) {
        console.log('Error: ', err)
      }
/*
      console.log('Trigger lock by voting (deducts .6 FIO)');
      try {
        const result = await user[i].sdk.genericAction('pushTransaction', {
          action: 'voteproducer',
          account: 'eosio',
          data: {
            "producers": [
              'bp1@dapixdev'
            ],
            fio_address: '',
            actor: user[i].account,
            max_fee: config.maxFee
          }
        })
        //console.log('Result: ', result)
        expect(result.status).to.equal('OK')
      } catch (err) {
        console.log('Error: ', err.json.error)
      }
*/
      // Now look up the account in the lockedtokens table
      try {
        const json = {
          json: true,               // Get the response as json
          code: 'eosio',      // Contract that we target
          scope: 'eosio',         // Account that owns the data
          table: 'lockedtokens',        // Table name
          limit: 1000,                // Maximum number of rows that we want to get
          reverse: false,           // Optional: Get reversed data
          show_payer: false          // Optional: Show ram payer
        }
        lockedAccounts = await callFioApi("get_table_rows", json);
        //console.log('lockedAccounts: ', lockedAccounts)
        for (lockedAccount in lockedAccounts.rows) {
          if (lockedAccounts.rows[lockedAccount].owner == accounts[i].account) {

            console.log('Count: ', lockedAccount)
            console.log('lockedAccounts.rows[lockedAccount].owner: ', lockedAccounts.rows[lockedAccount].owner); 
            console.log('lockedAccounts.rows[lockedAccount].total_grant_amount: ', lockedAccounts.rows[lockedAccount].total_grant_amount); 
            console.log('lockedAccounts.rows[lockedAccount].unlocked_period_count: ', lockedAccounts.rows[lockedAccount].unlocked_period_count); 
            console.log('lockedAccounts.rows[lockedAccount].grant_type: ', lockedAccounts.rows[lockedAccount].grant_type); 
            console.log('lockedAccounts.rows[lockedAccount].inhibit_unlocking: ', lockedAccounts.rows[lockedAccount].inhibit_unlocking); 
            console.log('lockedAccounts.rows[lockedAccount].remaining_locked_amount: ', lockedAccounts.rows[lockedAccount].remaining_locked_amount); 
            console.log('lockedAccounts.rows[lockedAccount].timestamp: ', lockedAccounts.rows[lockedAccount].timestamp); 
            timestamp = lockedAccounts.rows[lockedAccount].timestamp;

            break;
          }
        }

        let elapsedMin = Math.round((currentTime - timestamp) / 60);
        console.log('elapsedMin: ', elapsedMin)

        expectedUnlockedPercent = 1;  // (percent) Assume all periods have vested.
        for (period in vestingSchedule) {
          console.log('period: ', period);
          console.log('vestingSchedule[period].day: ', vestingSchedule[period].day);
          if (vestingSchedule[period].day > elapsedMin) {
            expectedUnlockedPercent = vestingSchedule[period-1].unlockPercent
            break;
          }
        }
        expectedUnlockedAmount = expectedUnlockedPercent * lockedAccounts.rows[lockedAccount].total_grant_amount;
        expectedRemainingLockedAmount = lockedAccounts.rows[lockedAccount].total_grant_amount - expectedUnlockedAmount;
        console.log('expectedUnlockedPercent: ', expectedUnlockedPercent);
        console.log('expectedUnlockedAmount: ', expectedUnlockedAmount);
        console.log('expectedRemainingLockedAmount - remaining_locked_amount = ', expectedRemainingLockedAmount - lockedAccounts.rows[lockedAccount].remaining_locked_amount);
        console.log('total_grant_amount - remaining_locked_amount = ', lockedAccounts.rows[lockedAccount].total_grant_amount - lockedAccounts.rows[lockedAccount].remaining_locked_amount);
        console.log('remaining_locked_amount / total_grant_amount  = ', lockedAccounts.rows[lockedAccount].remaining_locked_amount / lockedAccounts.rows[lockedAccount].total_grant_amount);

        if (lockedAccounts.rows[lockedAccount].grant_type === 1) {
          expect(lockedAccounts.rows[lockedAccount].remaining_locked_amount).to.equal(expectedRemainingLockedAmount);
        }

        console.log('\n\n');
      } catch (err) {
        console.log('Error', err);
        expect(err).to.equal(null);
      }
    } 
  })

})

