# Test 01 - Full Node

## Overview
This test focuses on the full nodes ability to rapidly receive and broadcast new transactions in the face of real-world network conditions.

## Steps

- Average the last 7 days of daily transaction volume. The current network transaction volume will skew results, so it's important to record before conducting the test. Daily transaction volume can be retrieved from [this 3 month chart](https://bitinfocharts.com/comparison/bitcoin%20cash-transactions.html#3m).

- Use the `create-wallet` command to create a funding wallet for funding the test. This wallet will be called *funding*. Generate an address with the `get-address` command and send BCH to that wallet.

- Use the `create-wallet` command to create a test wallet. This wallet will be called *uut*.

- Use the `fund-test-wallet` command to stage the *uut* wallet and fund it with the *funding* wallet. This will be a long-running command. Wait until it completes and the last transaction is confirmed in a block. Before running the command, edit the following constant variables:
  - `NUMBER_OF_ADDRESSES` should be set to `300` to `30000`, depending the test conditions.
  - `BCH_TO_SEND` should be set to `0.00002`.

- Set up any monitoring required to record the results on the systems subcomponents. If using Digital Ocean, you can use the 6-hour real-time graphs. Software like [netdata](https://github.com/netdata/netdata) can also be used, or even a command-line metrics software like [glances](https://nicolargo.github.io/glances/).

- Open the `run-node-test` command source file and edit the `NUMBER_OF_ADDRESSES` and `TIME_BETWEEN_TXS` constants to set the speed and duration of the test. Make a note of the values used.

- Execute the `run-node-test` command to execute the test, while monitoring the performance of each subcomponent.

## Data

- Test 1
  - Date: 01/21/2020
  - 7-day average TXs per day: 52022
  - `NUMBER_OF_ADDRESSES`: 300
  - `TIME_BETWEEN_TXS`: 1000
  - YouTube Video (link here)
  - Notes:
    - Results were closer to 2 seconds per tx.
    - No significantly measurable change in resource usage during test compared to idle.
    - Used ABC v0.20.0 running on a Digitial Ocean Droplet with 2 CPU & 4GB of memory.
    - Used Blockbook v0.3.1 on a Digital Ocean Droplet with 4 CPU and 8GB of memory.
    - REST API running on a Digital Ocean Droplet with 1 CPU and 2GB of memory.

- Test 2
  - Date: 01/21/2020
  - 7-day average TXs per day: 52022
  - `NUMBER_OF_ADDRESSES`: 300
  - `TIME_BETWEEN_TXS`: 200
  - YouTube Video (link here)
  - Notes:
    - Results were closer to 750 milliseconds per tx.
    - No significantly measurable change in resource usage during test compared to idle.
    - Used ABC v0.20.0 running on a Digitial Ocean Droplet with 2 CPU & 4GB of memory.
    - Used Blockbook v0.3.1 on a Digital Ocean Droplet with 4 CPU and 8GB of memory.
    - REST API running on a Digital Ocean Droplet with 1 CPU and 2GB of memory.

- Test 3
  - Date: 01/21/2020
  - 7-day average TXs per day: 52022
  - `NUMBER_OF_ADDRESSES`: 3000
  - `TIME_BETWEEN_TXS`: 0
  - YouTube Video (link here)
  - Notes:
    - Over 3000 txs, the average time between tx was 433 milliseconds per tx.
    - No significantly measurable change in resource usage during test compared to idle.
    - Need to run multiple wallets in parallel to stress the system further.
    - Used ABC v0.20.0 running on a Digitial Ocean Droplet with 2 CPU & 4GB of memory.
    - Used Blockbook v0.3.1 on a Digital Ocean Droplet with 4 CPU and 8GB of memory.
    - REST API running on a Digital Ocean Droplet with 1 CPU and 2GB of memory.


## Requests vs Transactions
In this test, there are 4 REST API requests per transaction. Two calls to Blockbook, and two calls to the full node.

Typical REST API output per transaction:
```
0|start-bitcoincom  | ::ffff:162.243.168.8 - GET /v3/blockbook/balance/bitcoincash:qp2dqfj3np6led43538acf0pdag79szemurvlqp2xc 200 9.444 ms - 296 axios/0.19.1
0|start-bitcoincom  | ::ffff:162.243.168.8 - GET /v3/blockbook/utxos/bitcoincash:qp2dqfj3np6led43538acf0pdag79szemurvlqp2xc 200 9.389 ms - 154 axios/0.19.1
0|start-bitcoincom  | ::ffff:162.243.168.8 - GET /v3/blockchain/getTxOut/04c355f6890f780e7e6ca5816efcccc2068c919836eb7c95ea6de9afa812e621/0?include_mempool=true 200 9.181 ms - 407 axios/0.19.1
0|start-bitcoincom  | ::ffff:162.243.168.8 - POST /v3/rawtransactions/sendRawTransaction 200 8.739 ms - 68 axios/0.19.1
```
