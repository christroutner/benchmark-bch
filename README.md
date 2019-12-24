slp-cli-wallet
========

This is an npm library and Bitcoin Cash (BCH) wallet that runs on the command
line. Add this library to your app to instantly give it the ability to transact
on the BCH network! New to Bitcoin Cash? Learn the basics with [Mastering Bitcoin Cash](https://developer.bitcoin.com/mastering-bitcoin-cash/).

This project is forked from the Bitcoin.com [bch-cli-wallet](https://github.com/Bitcoin-com/bch-cli-wallet), and has been expanded to support SLP tokens. These new features may be rolled into that parent repository and this library deprecated. But for now, they are two separate libraries.

This project has the following goals:
- Create a code base for a wallet that is easily forkable and extensible by JavaScript developers.
- Provide a high-level abstraction to make it easy for new developers to add BCH and SLP wallet functionality into their apps.

If you want a wallet with a graphical user interface, check out
[Badger Wallet](http://badger.bitcoin.com/). BCH functionality is
implemented in both wallets with [BITBOX](https://developer.bitcoin.com/bitbox), and the command
line interface for this project is built with [oclif](https://oclif.io).

Also, be sure to check out the design decisions and trade-offs that went into the
creation of this project in the [docs directory](./docs)

[![Build Status](https://travis-ci.org/christroutner/bch-cli-wallet.svg?branch=master)](https://travis-ci.org/christroutner/bch-cli-wallet) [![Coverage Status](https://coveralls.io/repos/github/christroutner/bch-cli-wallet/badge.svg?branch=master)](https://coveralls.io/github/christroutner/bch-cli-wallet?branch=master) [![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release) [![Greenkeeper badge](https://badges.greenkeeper.io/christroutner/bch-cli-wallet.svg)](https://greenkeeper.io/)

<!-- toc -->
* [NPM Usage](#npm-usage)
* [Install Dev Environment](#install-dev-environment)
* [Command Line Usage](#command-line-usage)
* [Commands](#commands)
<!-- tocstop -->


# NPM Usage
The [npm library](https://www.npmjs.com/package/slp-cli-wallet) can be included
in your own app to instantly give it the ability to send and receive BCH transactions, including SLP tokens.
Here is an example of how to include it in your own app. This example will generate
a new HD wallet.

```javascript
// Instantiate the Create Wallet class from this library.
const CreateWallet = require('slp-cli-wallet/src/commands/create-wallet')
const createWallet = new CreateWallet()

const walletFile = './wallet.json'

async function makeNewWallet() {
  const wallet = await createWallet.createWallet(walletFile)

  console.log(`wallet: ${JSON.stringify(wallet,null,2)}`)
}
makeNewWallet()
```

# Install Dev Environment
While this npm library can be used globally, the intended audience is developers
familiar with the usage of `npm` and `git`. Here is how to set up your own
developer environment:

- Clone this repo with `git clone`.
- Install npm dependencies with `npm install`
- Execute the commands like this: `./bin/run help`

Running the wallet this way, you can edit the behavior of the wallet
by making changes to the code in the [src/commands](src/commands) directory.

# Command Line Usage
<!-- usage -->
```sh-session
$ npm install -g slp-cli-wallet
$ slp-cli-wallet COMMAND
running command...
$ slp-cli-wallet (-v|--version|version)
slp-cli-wallet/1.5.0 linux-x64 node-v10.16.3
$ slp-cli-wallet --help [COMMAND]
USAGE
  $ slp-cli-wallet COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`slp-cli-wallet burn-tokens`](#slp-cli-wallet-burn-tokens)
* [`slp-cli-wallet create-wallet`](#slp-cli-wallet-create-wallet)
* [`slp-cli-wallet derivation`](#slp-cli-wallet-derivation)
* [`slp-cli-wallet fund-test-wallet`](#slp-cli-wallet-fund-test-wallet)
* [`slp-cli-wallet get-address`](#slp-cli-wallet-get-address)
* [`slp-cli-wallet get-key`](#slp-cli-wallet-get-key)
* [`slp-cli-wallet hello`](#slp-cli-wallet-hello)
* [`slp-cli-wallet help [COMMAND]`](#slp-cli-wallet-help-command)
* [`slp-cli-wallet list-wallets`](#slp-cli-wallet-list-wallets)
* [`slp-cli-wallet remove-wallet`](#slp-cli-wallet-remove-wallet)
* [`slp-cli-wallet send`](#slp-cli-wallet-send)
* [`slp-cli-wallet send-all`](#slp-cli-wallet-send-all)
* [`slp-cli-wallet send-tokens`](#slp-cli-wallet-send-tokens)
* [`slp-cli-wallet sweep`](#slp-cli-wallet-sweep)
* [`slp-cli-wallet tokenize-test-wallet`](#slp-cli-wallet-tokenize-test-wallet)
* [`slp-cli-wallet update-balances`](#slp-cli-wallet-update-balances)

## `slp-cli-wallet burn-tokens`

Burn SLP tokens.

```
USAGE
  $ slp-cli-wallet burn-tokens

OPTIONS
  -n, --name=name        Name of wallet
  -q, --qty=qty
  -t, --tokenId=tokenId  Token ID
```

_See code: [src/commands/burn-tokens.js](https://github.com/christroutner/bch-cli-wallet/blob/v1.5.0/src/commands/burn-tokens.js)_

## `slp-cli-wallet create-wallet`

Generate a new HD Wallet.

```
USAGE
  $ slp-cli-wallet create-wallet

OPTIONS
  -n, --name=name  Name of wallet
  -t, --testnet    Create a testnet wallet
```

_See code: [src/commands/create-wallet.js](https://github.com/christroutner/bch-cli-wallet/blob/v1.5.0/src/commands/create-wallet.js)_

## `slp-cli-wallet derivation`

Display or set the derivation path used by the wallet.

```
USAGE
  $ slp-cli-wallet derivation

OPTIONS
  -n, --name=name  name to print
  -s, --save=save  save a new derivation path

DESCRIPTION
  This command is used to display the derivation path used by the wallet. The -s
  flag can be used to save a new derivation path.

  Common derivation paths used:
  145 - BIP44 standard path for Bitcoin Cash
  245 - BIP44 standard path for SLP tokens
  0 - Used by common software like the Bitcoin.com wallet and Honest.cash

  Wallets use the 245 derivation path by default.
```

_See code: [src/commands/derivation.js](https://github.com/christroutner/bch-cli-wallet/blob/v1.5.0/src/commands/derivation.js)_

## `slp-cli-wallet fund-test-wallet`

Prepares wallet to run benchmark test

```
USAGE
  $ slp-cli-wallet fund-test-wallet

OPTIONS
  -d, --dest=dest  destination wallet name, to send funds to
  -n, --name=name  source wallet name to source funds

DESCRIPTION
  ...
  This is a long-running command that funds a new wallet and prepares it to run
  a benchmark test of the BCH infrastructure.
```

_See code: [src/commands/fund-test-wallet.js](https://github.com/christroutner/bch-cli-wallet/blob/v1.5.0/src/commands/fund-test-wallet.js)_

## `slp-cli-wallet get-address`

Generate a new address to recieve BCH.

```
USAGE
  $ slp-cli-wallet get-address

OPTIONS
  -n, --name=name  Name of wallet
  -t, --token      Generate a simpledger: token address
```

_See code: [src/commands/get-address.js](https://github.com/christroutner/bch-cli-wallet/blob/v1.5.0/src/commands/get-address.js)_

## `slp-cli-wallet get-key`

Generate a new private/public key pair.

```
USAGE
  $ slp-cli-wallet get-key

OPTIONS
  -n, --name=name  Name of wallet
```

_See code: [src/commands/get-key.js](https://github.com/christroutner/bch-cli-wallet/blob/v1.5.0/src/commands/get-key.js)_

## `slp-cli-wallet hello`

Example command from oclif

```
USAGE
  $ slp-cli-wallet hello

OPTIONS
  -n, --name=name  name to print

DESCRIPTION
  ...
  Leaving it here for future reference in development.
```

_See code: [src/commands/hello.js](https://github.com/christroutner/bch-cli-wallet/blob/v1.5.0/src/commands/hello.js)_

## `slp-cli-wallet help [COMMAND]`

display help for slp-cli-wallet

```
USAGE
  $ slp-cli-wallet help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v2.2.1/src/commands/help.ts)_

## `slp-cli-wallet list-wallets`

List existing wallets.

```
USAGE
  $ slp-cli-wallet list-wallets
```

_See code: [src/commands/list-wallets.js](https://github.com/christroutner/bch-cli-wallet/blob/v1.5.0/src/commands/list-wallets.js)_

## `slp-cli-wallet remove-wallet`

Remove an existing wallet.

```
USAGE
  $ slp-cli-wallet remove-wallet

OPTIONS
  -n, --name=name  Name of wallet
```

_See code: [src/commands/remove-wallet.js](https://github.com/christroutner/bch-cli-wallet/blob/v1.5.0/src/commands/remove-wallet.js)_

## `slp-cli-wallet send`

Send an amount of BCH

```
USAGE
  $ slp-cli-wallet send

OPTIONS
  -a, --sendAddr=sendAddr  Cash address to send to
  -b, --bch=bch            Quantity in BCH
  -n, --name=name          Name of wallet
```

_See code: [src/commands/send.js](https://github.com/christroutner/bch-cli-wallet/blob/v1.5.0/src/commands/send.js)_

## `slp-cli-wallet send-all`

Send all BCH in a wallet to another address. **Degrades Privacy**

```
USAGE
  $ slp-cli-wallet send-all

OPTIONS
  -a, --sendAddr=sendAddr  Cash address to send to
  -n, --name=name          Name of wallet

DESCRIPTION
  Send all BCH in a wallet to another address.

  This method has a negative impact on privacy by linking all addresses in a
  wallet. If privacy of a concern, CoinJoin should be used.
  This is a good article describing the privacy concerns:
  https://bit.ly/2TnhdVc
```

_See code: [src/commands/send-all.js](https://github.com/christroutner/bch-cli-wallet/blob/v1.5.0/src/commands/send-all.js)_

## `slp-cli-wallet send-tokens`

Send SLP tokens.

```
USAGE
  $ slp-cli-wallet send-tokens

OPTIONS
  -a, --sendAddr=sendAddr  Cash or SimpleLedger address to send to
  -n, --name=name          Name of wallet
  -q, --qty=qty
  -t, --tokenId=tokenId    Token ID
```

_See code: [src/commands/send-tokens.js](https://github.com/christroutner/bch-cli-wallet/blob/v1.5.0/src/commands/send-tokens.js)_

## `slp-cli-wallet sweep`

Sweep a private key

```
USAGE
  $ slp-cli-wallet sweep

OPTIONS
  -a, --address=address  Address to sweep funds to.
  -b, --balanceOnly      Balance only, no claim.
  -t, --testnet          Testnet
  -w, --wif=wif          WIF private key

DESCRIPTION
  ...
  Sweeps a private key in WIF format.
  Supports SLP token sweeping, but only one token class at a time. It will throw
  an error if a WIF contains more than one class of token.
```

_See code: [src/commands/sweep.js](https://github.com/christroutner/bch-cli-wallet/blob/v1.5.0/src/commands/sweep.js)_

## `slp-cli-wallet tokenize-test-wallet`

Prepares wallet to run benchmark test

```
USAGE
  $ slp-cli-wallet tokenize-test-wallet

OPTIONS
  -d, --dest=dest  destination wallet name, to send funds to
  -n, --name=name  source wallet name to source funds

DESCRIPTION
  ...
  This is a long-running command that funds a new wallet and prepares it to run
  a benchmark test of the BCH infrastructure.
```

_See code: [src/commands/tokenize-test-wallet.js](https://github.com/christroutner/bch-cli-wallet/blob/v1.5.0/src/commands/tokenize-test-wallet.js)_

## `slp-cli-wallet update-balances`

Poll the network and update the balances of the wallet.

```
USAGE
  $ slp-cli-wallet update-balances

OPTIONS
  -n, --name=name  Name of wallet
```

_See code: [src/commands/update-balances.js](https://github.com/christroutner/bch-cli-wallet/blob/v1.5.0/src/commands/update-balances.js)_
<!-- commandsstop -->
