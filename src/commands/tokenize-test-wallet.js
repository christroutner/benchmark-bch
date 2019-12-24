/*
  Reference:
  https://docs.google.com/document/d/1qtleJjNQ7b8v--RBEN17p56HqtHf9j4Bvtap4YRLXBs/edit#heading=h.vjv6nnxj3xmw

  This command is based on the fund-test-wallet command. It should be run after
  running that command. This command sends 1 token to each of the addresses.
*/

"use strict"

const config = require("../../config")

const AppUtils = require("../util")
const appUtils = new AppUtils()

const Send = require("./send")
const send = new Send()

// const GetAddress = require("./get-address")
// const getAddress = new GetAddress()

const SendTokens = require("./send-tokens")
const sendTokens = new SendTokens()

const UpdateBalances = require("./update-balances")

// Mainnet by default
const BITBOX = new config.BCHLIB({
  restURL: config.MAINNET_REST,
  apiToken: config.JWT
})

// The number of addresses to fund for the test.
const NUMBER_OF_ADDRESSES = 10

const TOKEN_ID = `155784a206873c98acc09e8dabcccf6abf13c4c14d8662190534138a16bb93ce`

const pRetry = require("p-retry")

const { Command, flags } = require("@oclif/command")

let _this

class FundTest extends Command {
  constructor(argv, config) {
    super(argv, config)
    //_this = this

    this.BITBOX = BITBOX
    this.appUtils = appUtils

    this.updateBalances = new UpdateBalances()
    this.updateBalances.BITBOX = this.BITBOX

    this.send = send
    this.send.appUtils = this.appUtils

    this.sendTokens = sendTokens

    this.queueState = {}

    _this = this
  }

  async run() {
    try {
      const { flags } = this.parse(FundTest)

      // Ensure flags meet qualifiying critieria.
      this.validateFlags(flags)

      this.flags = flags

      // Fund the wallet
      await this.tokenizeTestWallet(flags)
    } catch (err) {
      console.log(`Error in fund-test-wallet: `, err)
    }
  }

  // Parent function that starts funding.
  async tokenizeTestWallet(flags) {
    try {
      const source = flags.name // Name of the source wallet.
      const dest = flags.dest // Name of the destination wallet.

      // Open the source wallet data file.
      const sourceFilename = `${__dirname}/../../wallets/${source}.json`
      const sourceWalletInfo = this.appUtils.openWallet(sourceFilename)
      sourceWalletInfo.name = source

      // Open the destination wallet data file.
      const destFilename = `${__dirname}/../../wallets/${dest}.json`
      const destWalletInfo = this.appUtils.openWallet(destFilename)
      destWalletInfo.name = dest

      // Determine if this is a testnet wallet or a mainnet wallet.
      if (sourceWalletInfo.network === "testnet") {
        this.BITBOX = new config.BCHLIB({ restURL: config.TESTNET_REST })
        this.appUtils.BITBOX = this.BITBOX
        this.send.BITBOX = this.BITBOX
      }

      // Generate 300 addresses from the test wallet.
      const addresses = await this.generateAddresses(
        destWalletInfo,
        NUMBER_OF_ADDRESSES
      )
      console.log(`addresses: ${JSON.stringify(addresses, null, 2)}`)

      await this.fundAddresses(sourceWalletInfo, addresses)

      // Add each transaction to the queue.
    } catch (err) {
      console.log(`Error in fundTestWallet()`)
      throw err
    }
  }

  // Generates a series of transactions to fund an array of addresses.
  // Funds one addresss at a time, and will auto-retry in the event of failure.
  async fundAddresses(walletInfo, addresses) {
    try {
      // Loop through each address and generate a transaction for each one.
      // Add each transaction to a queue with automatic retry.
      for (let i = 0; i < addresses.length; i++) {
        const address = addresses[i]
        console.log(`funding index ${i}, address ${address}`)

        // Load the state. p-retry functions can't pass arguments, so they
        // are passed this way.
        _this.queueState = {
          walletInfo,
          addr: address
        }

        const txid = await pRetry(_this.generateTx, {
          onFailedAttempt: async () => {
            //   failed attempt.
            console.log("P-retry error")
            await _this.sleep(60000 * 2) // Sleep for 2 minutes
          },
          retries: 5 // Retry 5 times
        })

        console.log(`Successfully send a token to ${address}`)
        console.log(`TXID: ${txid}`)
        console.log(" ")
        console.log(" ")

        await _this.sleep(60000 * 1) // Wait some period of time before sending next tx.
      }
    } catch (err) {
      console.log(`Error in fund-test-wallet.js/fundAddresses()`)
      throw err
    }
  }

  // Promise-based sleep function.
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Returns a promise that resolves to a txid string
  // The intention is for the promise to be added to a retry-queue that will
  // auto-retry if there is an error.
  async generateTx() {
    try {
      // Retrieve the state. p-rety functions can't pass arguments.
      let { walletInfo, addr } = _this.queueState

      // Update the wallet
      walletInfo = await _this.updateBalances.updateBalances(_this.flags)

      // Get a list of token UTXOs from the wallet for this token.
      const tokenUtxos = _this.sendTokens.getTokenUtxos(TOKEN_ID, walletInfo)
      // console.log(`tokenUtxos: ${JSON.stringify(tokenUtxos, null, 2)}`)

      // Get info on UTXOs controlled by this wallet.
      const utxos = await _this.sendTokens.getBchUtxos(walletInfo)
      // console.log(`bch utxos: ${JSON.stringify(utxos, null, 2)}`)

      // Select optimal UTXO
      const utxo = await _this.send.selectUTXO(0.000015, utxos)
      // console.log(`selected utxo: ${JSON.stringify(utxo, null, 2)}`)

      if (!utxo.txid) throw new Error(`No valid UTXO could be found`)

      // Exit if there is no UTXO big enough to fulfill the transaction.
      if (!utxo.amount) {
        this.log(
          `Could not find a UTXO big enough for this transaction. More BCH needed.`
        )
        return
      }

      // For now, change is sent to the root address of the source wallet.
      const changeAddr = walletInfo.rootAddress

      // Send the token, transfer change to the new address
      const hex = await _this.sendTokens.sendTokens(
        utxo,
        1,
        changeAddr,
        addr,
        walletInfo,
        tokenUtxos
      )

      const txid = await _this.appUtils.broadcastTx(hex)

      return txid
    } catch (err) {
      console.log(`Error in fund-test-wallet.js/generateTx: `, err)
      throw new Error(`Error caught in generateTx()`)
      // throw err
    }
  }

  // Generates numOfAddrs addresses from a wallet, starting at index 0.
  // Returns the addresses as an array of strings.
  async generateAddresses(walletInfo, numOfAddrs) {
    try {
      // Point to the correct rest server.
      if (walletInfo.network === "testnet")
        this.BITBOX = new config.BCHLIB({ restURL: config.TESTNET_REST })
      else this.BITBOX = new config.BCHLIB({ restURL: config.MAINNET_REST })

      // root seed buffer
      let rootSeed
      if (config.RESTAPI === "bitcoin.com")
        rootSeed = this.BITBOX.Mnemonic.toSeed(walletInfo.mnemonic)
      else rootSeed = await this.BITBOX.Mnemonic.toSeed(walletInfo.mnemonic)

      // master HDNode
      let masterHDNode
      if (walletInfo.network === "testnet")
        masterHDNode = this.BITBOX.HDNode.fromSeed(rootSeed, "testnet")
      else masterHDNode = this.BITBOX.HDNode.fromSeed(rootSeed)

      // HDNode of BIP44 account
      const account = this.BITBOX.HDNode.derivePath(
        masterHDNode,
        `m/44'/${walletInfo.derivation}'/0'`
      )

      const addrs = []
      for (let i = 0; i < numOfAddrs; i++) {
        // derive an external change address HDNode
        const change = this.BITBOX.HDNode.derivePath(account, `0/${i}`)

        // get the cash address
        const newAddress = this.BITBOX.HDNode.toCashAddress(change)

        // Add the address to the array
        addrs.push(newAddress)
      }

      return addrs
    } catch (err) {
      console.log(`Error in generateAddresses()`)
      throw error
    }
  }

  // Validate the proper flags are passed in.
  validateFlags(flags) {
    // Exit if wallet not specified.
    const name = flags.name
    if (!name || name === "")
      throw new Error(`You must specify a source wallet with the -n flag.`)

    const dest = flags.dest
    if (!dest || dest === "")
      throw new Error(`You must specify a destination wallet with the -d flag.`)

    return true
  }
}

FundTest.description = `Prepares wallet to run benchmark test
...
This is a long-running command that funds a new wallet and prepares it to run
a benchmark test of the BCH infrastructure.
`

FundTest.flags = {
  name: flags.string({
    char: "n",
    description: "source wallet name to source funds"
  }),

  dest: flags.string({
    char: "d",
    description: "destination wallet name, to send funds to"
  })
}

module.exports = FundTest
