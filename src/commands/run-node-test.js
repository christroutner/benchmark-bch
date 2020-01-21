/*
  Reference:
  https://github.com/christroutner/benchmark-bch/blob/master/docs/test01-node.md

  This command runs the test defined in the document above.
*/

"use strict"

const config = require("../../config")

const AppUtils = require("../util")
const appUtils = new AppUtils()

const Send = require("./send")
const send = new Send()

const SendTokens = require("./send-tokens")
const sendTokens = new SendTokens()

const UpdateBalances = require("./update-balances")

// Mainnet by default
const BITBOX = new config.BCHLIB({
  restURL: config.MAINNET_REST,
  apiToken: config.JWT
})

// The number of addresses to fund for the test.
const NUMBER_OF_ADDRESSES = 3000

const TIME_BETWEEN_TXS = 0 // time in milliseconds

const { Command, flags } = require("@oclif/command")

let _this

// Counters for tracking metrics during the test.
let errorCnt = 0
let txCnt = 0

class NodeTest extends Command {
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

    this.time = []

    _this = this
  }

  async run() {
    try {
      const { flags } = this.parse(NodeTest)

      // Ensure flags meet qualifiying critieria.
      this.validateFlags(flags)

      this.flags = flags

      // Fund the wallet
      await this.runTest(flags)

      // Report test results
      this.calcResults()
    } catch (err) {
      console.log(`Error in fund-test-wallet: `, err)
    }
  }

  // Run the test.
  async runTest(flags) {
    try {
      const source = flags.name // Name of the source wallet.

      // Open the source wallet data file.
      const sourceFilename = `${__dirname}/../../wallets/${source}.json`
      const sourceWalletInfo = this.appUtils.openWallet(sourceFilename)
      sourceWalletInfo.name = source

      // Determine if this is a testnet wallet or a mainnet wallet.
      if (sourceWalletInfo.network === "testnet") {
        this.BITBOX = new config.BCHLIB({ restURL: config.TESTNET_REST })
        this.appUtils.BITBOX = this.BITBOX
        this.send.BITBOX = this.BITBOX
      }

      // Generate addresses from the test wallet.
      const addresses = await this.generateAddresses(
        sourceWalletInfo,
        NUMBER_OF_ADDRESSES
      )
      console.log(`addresses: ${JSON.stringify(addresses, null, 2)}`)

      // Loop through each address and generate a transaction for each one.
      // Add each transaction to a queue with automatic retry.
      for (let i = 0; i < addresses.length; i++) {
        // for (let i = 0; i < 4; i++) {
        try {
          let startTime = new Date()
          startTime = startTime.getTime()

          const address = addresses[i]

          const txid = await this.generateTx(sourceWalletInfo, address, i)

          // Display the txid with a link to the block explorer.
          this.appUtils.displayTxid(txid, sourceWalletInfo.network)

          // Sleep between txs.
          // await _this.sleep(TIME_BETWEEN_TXS)

          txCnt++

          // Calculate time between transactions.
          let endTime = new Date()
          endTime = endTime.getTime()
          const timeDiff = endTime - startTime
          this.time.push(timeDiff)
          console.log(`TX processing took ${timeDiff} milliseconds`)

          console.log(" ")
        } catch (err) {
          console.log(`Error on iteration ${i}: ${err.message}`)
          errorCnt++
          continue
        }
      }

      console.log(`test complete. txCnt: ${txCnt}, errorCnt: ${errorCnt}`)
    } catch (err) {
      // console.log(`Error in NodeTestWallet()`)
      // throw err
      errorCnt++
    }
  }

  // Promise-based sleep function.
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Returns a promise that resolves to a txid string
  async generateTx(walletInfo, addr, walletIndex) {
    try {
      // Get the address balance
      const balance = await _this.BITBOX.Blockbook.balance(addr)
      console.log(
        `BCH balance for address ${addr}: ${balance.balance} satoshis`
      )

      // Get utxos
      const utxos = await _this.BITBOX.Blockbook.utxo(addr)
      // console.log(`utxos: ${JSON.stringify(utxos, null, 2)}`)

      // Select optimal BCH UTXO
      const utxo = await _this.send.selectUTXO(0.00001, utxos)
      utxo.hdIndex = walletIndex // Expected by sendTokens()
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

      // Send the BCH
      const hex = await _this.send.sendBCH(
        utxo,
        0.00001,
        changeAddr,
        addr,
        walletInfo
      )

      const txid = await _this.appUtils.broadcastTx(hex)

      return txid
    } catch (err) {
      console.log(`Error in run-test.js/generateTx for address ${addr}: `, err)
      // throw new Error(`Error caught in generateTx()`)
      throw err
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

  // Calcultate the results of the test by averaging the results array.
  calcResults() {
    try {
      let accum = 0
      for (let i = 0; i < this.time.length; i++) accum += this.time[i]

      const avg = accum / this.time.length

      console.log(" ")
      console.log(`Average time per transaction: ${avg} milliseconds`)
    } catch (err) {
      console.error(`Error in calcResults().`)
      throw err
    }
  }

  // Validate the proper flags are passed in.
  validateFlags(flags) {
    // Exit if wallet not specified.
    const name = flags.name
    if (!name || name === "")
      throw new Error(`You must specify a source wallet with the -n flag.`)

    return true
  }
}

NodeTest.description = `Runs the full-node benchmark test
...
This command assumes that the wallet has been prepped to run the test by first
running these commands:
- fund-test-wallet
- update-balances

After running the above commands in that order, the wallet will then be prepared
to run this command, which executes the benchmark test.
`

NodeTest.flags = {
  name: flags.string({
    char: "n",
    description: "source wallet name to source funds"
  })
}

module.exports = NodeTest
