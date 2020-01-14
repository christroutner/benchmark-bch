# Test 01 - Full Node

## Overview
This test focuses on the full nodes ability to rapidly receive and broadcast new transactions in the face of real-world network conditions.

## Steps

- Average the last 7 days of daily transaction volume. The current network transaction volume will skew results, so it's important to record before conducting the test. Daily transaction volume can be retrieved from [this 3 month chart](https://bitinfocharts.com/comparison/bitcoin%20cash-transactions.html#3m).

- Use the `create-wallet` command to create a funding wallet for funding the test. This wallet will be called *funding*. Generate an address with the `get-address` command and send BCH to that wallet.

- Use the `create-wallet` command to create a test wallet. This wallet will be called *uut*.

- Use the `fund-test-wallet` command to stage the *uut* wallet and fund it with the *funding* wallet. Before running the command, edit the following constant variables:
  - `NUMBER_OF_ADDRESSES` should be set to `300` to `30000`, depending the test conditions.
  - `BCH_TO_SEND` should be set to `0.00002`.
This will be a long-running command. Wait until it completes and the last transaction is confirmed in a block.

- Set up any monitoring required to record the results on the systems subcomponents. If using Digital Ocean, you can use the 6-hour real-time graphs. Software like [netdata](https://github.com/netdata/netdata) can also be used, or even a command-line metrics software like [glances](https://nicolargo.github.io/glances/).

- Open the `run-node-test` command source file and edit the `NUMBER_OF_ADDRESSES` and `TIME_BETWEEN_TXS` constants to set the speed and duration of the test. Make a note of the values used.

- Execute the `run-node-test` command to execute the test, while monitoring the performance of each subcomponent.

## Data

| Date     | 7-day average TXs per day | NUMBER_OF_ADDRESSES | TIME_BETWEEN_TXS | Notes |
| -------- | ------------------------- | ------------------- | ---------------- | ----- |
| 01/12/20 | 48706                     | 300                 | 1000             |       |
