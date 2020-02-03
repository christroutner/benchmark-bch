# Test 02 - Indexer

## Overview
This test focuses on the indexers ability to rapidly update its database to reflect the changing state of UTXOs associated with an address.

## Steps

- Average the last 7 days of daily transaction volume. The current network transaction volume will skew results, so it's important to record before conducting the test. Daily transaction volume can be retrieved from [this 3 month chart](https://bitinfocharts.com/comparison/bitcoin%20cash-transactions.html#3m).

- Use the `create-wallet` command to create a funding wallet for funding the test. This wallet will be called *funding*. Generate an address with the `get-address` command and send BCH to that wallet.

- Use the `create-wallet` command to create a test wallet. This wallet will be called *uut*.

- Use the `fund-test-wallet` command to stage the *uut* wallet and fund it with the *funding* wallet. This will be a long-running command. Wait until it completes and the last transaction is confirmed in a block. Before running the command, edit the following constants:
  - `NUMBER_OF_ADDRESSES` should be set to `10`.
  - `BCH_TO_SEND` should be set to `0.0004`.

- Set up any monitoring required to record the results on the systems subcomponents. If using Digital Ocean, you can use the 6-hour real-time graphs. Software like [netdata](https://github.com/netdata/netdata) can also be used, or even a command-line metrics software like [glances](https://nicolargo.github.io/glances/).

- Open the `run-indexer-test` command source file and edit the `NUMBER_OF_ADDRESSES` and `TIME_BETWEEN_TXS` constants to set the speed and duration of the test. Make a note of the values used.

- Execute the `run-indexer-test` command to execute the test, while monitoring the performance of each subcomponent.

## Data

- Test 01 - Blockbook (self hosted)
  - Date: 01/21/2020
  - 7-day average TXs per day: 52022
  - `NUMBER_OF_ADDRESSES`: 200
  - `TIME_BETWEEN_TXS`: 250
  - [YouTube Video](https://youtu.be/z8fwKPAYqf4)
  - Notes:
    - Results were **1411** milliseconds per transaction.
    - No significantly measurable change in resource usage during test compared to idle.
    - Used ABC v0.20.0 running on a Digital Ocean Droplet with 2 CPU & 4GB of memory.
    - Used Blockbook v0.3.1 on a Digital Ocean Droplet with 4 CPU and 8GB of memory.
    - REST API running on a Digital Ocean Droplet with 1 CPU and 2GB of memory.

- Test 02 - Open Bazaar (fork of Blockbook)
  - Date: 01/31/2020
  - 7-day average TXs per day: 45124
  - `NUMBER_OF_ADDRESSES`: 200
  - `TIME_BETWEEN_TXS`: 250
  - [YouTube Video](https://youtu.be/gTd3tp8dNsA)
  - Notes:
    - Results were **2050** milliseconds per transaction.
    - No significantly measurable change in resource usage during test compared to idle.
    - Used ABC v0.20.10 running on a Digital Ocean Droplet with 2 CPU & 4GB of memory.
    - Used Blockbook fork run by Open Bazaar's public API as indexer-under-test.
    - REST API running on a Digital Ocean Droplet with 1 CPU and 2GB of memory.

- Test 03 - Ninsight (Bitcoin.com indexer)
  - Date: 02/03/2020
  - 7-day average TXs per day: 48009
  - `NUMBER_OF_ADDRESSES`: 200
  - `TIME_BETWEEN_TXS`: 250
  - [YouTube Video](https://youtu.be/ItJpMcKD_sQ)
  - Notes:
    - Results were **1759** milliseconds per transaction.
    - No significantly measurable change in resource usage during test compared to idle.
    - Used ABC v0.20.10 running on a Digital Ocean Droplet with 2 CPU & 4GB of memory.
    - Used Blockbook fork run by Open Bazaar's public API as indexer-under-test.
    - REST API running on a Digital Ocean Droplet with 1 CPU and 2GB of memory.

## Requests vs Transactions
In this test, there are a variable amount of requests per transaction. The indexer is called every `TIME_BETWEEN_TXS` milliseconds for an updated UTXO. When a new UTXO is found, it is spent, and the cycle begins again. Based on the baseline test (01) this resulted in about 6 to 7 calls to Blockbook, then a single call to the Full Node for each transaction.

Typical REST API output per transaction:
```
0|start-bitcoincom  | ::ffff:162.243.168.8 - GET /v3/blockbook/utxos/bitcoincash:qzxnyax0pramt2zj2fargjwdsvmex5m40sy9wxxmnq 200 8.693 ms - 2 axios/0.19.1
0|start-bitcoincom  | ::ffff:162.243.168.8 - GET /v3/blockbook/utxos/bitcoincash:qzxnyax0pramt2zj2fargjwdsvmex5m40sy9wxxmnq 200 7.159 ms - 2 axios/0.19.1
0|start-bitcoincom  | ::ffff:162.243.168.8 - GET /v3/blockbook/utxos/bitcoincash:qzxnyax0pramt2zj2fargjwdsvmex5m40sy9wxxmnq 200 10.810 ms - 2 axios/0.19.1
0|start-bitcoincom  | ::ffff:162.243.168.8 - GET /v3/blockbook/utxos/bitcoincash:qzxnyax0pramt2zj2fargjwdsvmex5m40sy9wxxmnq 200 7.243 ms - 2 axios/0.19.1
0|start-bitcoincom  | ::ffff:162.243.168.8 - GET /v3/blockbook/utxos/bitcoincash:qzxnyax0pramt2zj2fargjwdsvmex5m40sy9wxxmnq 200 9.178 ms - 2 axios/0.19.1
0|start-bitcoincom  | ::ffff:162.243.168.8 - GET /v3/blockbook/utxos/bitcoincash:qzxnyax0pramt2zj2fargjwdsvmex5m40sy9wxxmnq 200 8.344 ms - 2 axios/0.19.1
0|start-bitcoincom  | ::ffff:162.243.168.8 - GET /v3/blockbook/utxos/bitcoincash:qzxnyax0pramt2zj2fargjwdsvmex5m40sy9wxxmnq 200 11.897 ms - 137 axios/0.19.1
0|start-bitcoincom  | ::ffff:162.243.168.8 - POST /v3/rawtransactions/sendRawTransaction 200 10.895 ms - 68 axios/0.19.1

```
