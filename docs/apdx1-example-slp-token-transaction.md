# Appendix 1 - Example SLP token transaction

Below is the output of a wallet managed by [slp-cli-wallet](https://github.com/christroutner/bch-cli-wallet). It contains an ideal balance of 1 token UTXO and one non-token UTXO. The transaction includes sending a token from the wallet to an address.

`./bin/run send-tokens -n temp -q 20 -a simpleledger:qqwnssxngyzkz77lh0vvggek48rmm40t6vum2jw7sn -t 497291b8a1dfe69c8daea50677a3d31a5ef0e9484d8bebb610dac64bbc202fb7`

```
Existing balance: 0.00010546 BCH
debug: walletInfo.nextAddress = 6
Getting address data at index 0 up to index 20
Getting address data at index 20 up to index 40

SLP Token Summary:
Ticker Balance TokenID
TOK-CH 20 497291b8a1dfe69c8daea50677a3d31a5ef0e9484d8bebb610dac64bbc202fb7

TXID: 20bab2096ed950c14f47d28fa114394d4f65671fea08c2a68206df79d6dc8398
View on the block explorer: https://explorer.bitcoin.com/bch/tx/20bab2096ed950c14f47d28fa114394d4f65671fea08c2a68206df79d6dc8398
```


The above transaction generated the following API calls when sending a single token:
```
::ffff:127.0.0.1 - POST /v3/blockbook/balance 200 500.559 ms - 4447 axios/0.19.0
::ffff:127.0.0.1 - POST /v3/slp/balancesForAddress 200 2095.747 ms - 261 axios/0.19.0
::ffff:127.0.0.1 - GET /v3/blockbook/utxos/bitcoincash:qpzwmx5t8gh72vtnj6jkr4q0eatp5n0dtqcl9danc2 200 319.715 ms - 151 axios/0.19.0
::ffff:127.0.0.1 - POST /v3/slp/validateTxid 200 744.846 ms - 90 axios/0.19.0
::ffff:127.0.0.1 - GET /v3/rawtransactions/getRawTransaction/35750cb68b4063f8e0fe8d41d571efe67aa3411d3df98a3b0fca86844c17acc8?verbose=true 200 216.192 ms - 3683 axios/0.19.0
::ffff:127.0.0.1 - GET /v3/rawtransactions/getRawTransaction/497291b8a1dfe69c8daea50677a3d31a5ef0e9484d8bebb610dac64bbc202fb7?verbose=true 200 220.132 ms - 2364 axios/0.19.0
::ffff:127.0.0.1 - POST /v3/blockbook/balance 200 556.909 ms - 4281 axios/0.19.0
::ffff:127.0.0.1 - POST /v3/slp/balancesForAddress 200 1086.352 ms - 61 axios/0.19.0
::ffff:127.0.0.1 - GET /v3/blockbook/utxos/bitcoincash:qz0ts8qlldfhq5nhdu7mamy6qv6s7djfnyk9hfvwa0 200 484.426 ms - 155 axios/0.19.0
::ffff:127.0.0.1 - GET /v3/blockbook/utxos/bitcoincash:qpzwmx5t8gh72vtnj6jkr4q0eatp5n0dtqcl9danc2 200 510.438 ms - 151 axios/0.19.0
::ffff:127.0.0.1 - GET /v3/blockchain/getTxOut/a1e43bc7e1a107177a9e82fb41de0ffef4deea2e274f31f643286d14dc847753/0?include_mempool=true 200 304.750 ms - 405 axios/0.19.0
::ffff:127.0.0.1 - POST /v3/rawtransactions/sendRawTransaction 200 223.042 ms - 68 axios/0.19.0
```

### Conclusion
A single ‘action’ such as sending a token resulted in 12 API calls to the REST API. This is an idealized wallet; real-world wallets may make significantly more API calls.
