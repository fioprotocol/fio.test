/*

https://en.wikipedia.org/wiki/Elliptic-curve_Diffie–Hellman
fiojs/src/ecc/key_private.js > getSharedSecret

public_key = private_key * G (the public key is the result of adding G to itself private_key times)
alice_private * bob_public = alice_private * bob_private * G = bob_private * alice_private * G = bob_private * alice_public

*/

const { Ecc } = require('@fioprotocol/fiojs');

const bob_private='5JoQtsKQuH8hC9MyvfJAqo6qmKLm8ePYNucs7tPu2YxG12trzBt'
const bob_public='FIO5VE6Dgy9FUmd1mFotXwF88HkQN1KysCWLPqpVnDMjRvGRi1YrM'

const alice_private='5J9bWm2ThenDm3tjvmUgHtWCVMUdjRR1pxnRtnJjvKA4b2ut5WK'
const alice_public='FIO7zsqi7QUAjTAdyynd6DVe8uv4K8gCTRHnAoMN9w9CA1xLCTDVv'

bob = Ecc.PrivateKey(bob_private).getSharedSecret(alice_public)
alice = Ecc.PrivateKey(alice_private).getSharedSecret(bob_public)

console.log('bob: ', bob) 
//  = <Buffer a7 1b 4e c5 a9 57 79 26 a1 d2 aa 1d 9d 99 32 7f d3 b6 8f 6a 1e a5 97 20 0a 0d 89 0b d3 33 1d f3 00 a2 d4 9f ec 0b 2b 3e 69 69 ce 92 63 c5 d6 cf 47 c1 ... 14 more bytes>

console.log('alice: ', alice) 
// = <Buffer a7 1b 4e c5 a9 57 79 26 a1 d2 aa 1d 9d 99 32 7f d3 b6 8f 6a 1e a5 97 20 0a 0d 89 0b d3 33 1d f3 00 a2 d4 9f ec 0b 2b 3e 69 69 ce 92 63 c5 d6 cf 47 c1 ... 14 more bytes>
