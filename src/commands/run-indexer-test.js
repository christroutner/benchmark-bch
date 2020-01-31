/*
  Reference:
  https://github.com/christroutner/benchmark-bch/blob/master/docs/test02-indexer.md

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

// const GetAddress = require("./get-address")
// const getAddress = new GetAddress()

const UpdateBalances = require("./update-balances")

// Mainnet by default
const BITBOX = new config.BCHLIB({
  restURL: config.MAINNET_REST,
  apiToken: config.JWT
})

// The number of addresses to fund for the test.
const NUMBER_OF_ADDRESSES = 200

const TIME_BETWEEN_TXS = 250 // time in milliseconds

// const pRetry = require("p-retry")

const { Command, flags } = require("@oclif/command")

let _this

// Counters for tracking metrics during the test.
let errorCnt = 0
const txCnt = 0

class IndexerTest extends Command {
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

    this.testResults = []

    _this = this
  }

  async run() {
    try {
      const { flags } = this.parse(IndexerTest)

      // Ensure flags meet qualifiying critieria.
      this.validateFlags(flags)

      this.flags = flags

      // Fund the wallet
      await this.runTest(flags)

      // Calculate the test results.
      this.calcResults()
    } catch (err) {
      console.log(`Error in fund-test-wallet: `, err)
    }
  }

  // Calcultate the results of the test by averaging the results array.
  calcResults() {
    try {
      let accum = 0
      for (let i = 0; i < this.testResults.length; i++)
        accum += this.testResults[i]

      const avg = accum / this.testResults.length

      console.log(" ")
      console.log(`Tests run: ${this.testResults.length}`)
      console.log(`Average time: ${avg} milliseconds`)
    } catch (err) {
      console.error(`Error in calcResults().`)
      throw err
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

      // Update balances before sending.
      this.walletInfo = await this.updateBalances.updateBalances(flags)

      // Validate that the wallet under test and been setup correctly.
      const utxos = await this.verifyTestWallet()
      if (!utxos) {
        const msg = `Test wallet does not meet the criteria listed in the testing docs.`
        console.log(msg)
        throw new Error(msg)
      } else {
        console.log(`Test wallet has been validated.`)
      }

      // Generate addresses from the test wallet.
      const addresses = await this.generateAddresses(
        sourceWalletInfo,
        NUMBER_OF_ADDRESSES
      )
      console.log(`addresses: ${JSON.stringify(addresses, null, 2)}`)

      console.log(`utxos: ${JSON.stringify(utxos, null, 2)}`)

      // Will iterate through the 200 addresses generated.
      let addrCnt = 0

      // Loop through each of the staged UTXOs.
      for (let i = 0; i < utxos.length; i++) {
        // values used by generateTx()
        // values set in j-for loop are overridden here.
        let sourceAddr = utxos[i].cashAddress
        let sourceIndex = utxos[i].index

        // Spend each utxo 20 times.
        for (let j = 0; j < 20; j++) {
          // Set the destination address.
          let addrData = addresses[addrCnt]
          let destAddr = addrData.address

          // Mark the time.
          let startTime = new Date()
          startTime = startTime.getTime()

          // Loop until the transaction completes.
          let txComplete = false
          while (!txComplete) {
            try {
              const hex = await this.generateTx(
                sourceAddr,
                sourceIndex,
                destAddr
              )
              // console.log(`hex: ${hex}`)

              const txid = await this.appUtils.broadcastTx(hex)
              console.log(`txid: ${txid}`)

              // Calculate the time between successful txs.
              let endTime = new Date()
              endTime = endTime.getTime()
              const duration = endTime - startTime

              // Record the test results.
              this.testResults.push(duration)

              console.log(
                `Completed TX ${addrCnt +
                  1}. Time between success txs: ${duration} milliseconds.`
              )
              console.log(" ")
              console.log(" ")

              // Exit the loop
              txComplete = true
            } catch (err) {
              if (err) {
                console.log(
                  `Error trying to generate transaction: ${err.message}`
                )
              }
            }

            await this.sleep(TIME_BETWEEN_TXS)
          }

          // Prepare for the next iteration
          sourceAddr = destAddr
          sourceIndex = addrData.index

          addrCnt++
          addrData = addresses[addrCnt]

          // Exit the loop once we run out of addresses.
          if (!addrData) {
            // console.log(`Exiting loop due to !addrData`)
            return
          }

          destAddr = addrData.address
        }
      }
    } catch (err) {
      console.log(`Error in runTest(): `, err)
      // throw err
      errorCnt++
    }
  }

  // Promise-based sleep function.
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Validates the test wallet. Ensures it's properly staged to run the index
  // test. Returns false if wallet does not meet criteria. Returns an array
  // of UTXOs if it does meet the criteria.
  async verifyTestWallet() {
    try {
      let validUtxoCnt = 0
      const testUtxos = []

      const hasBalance = this.walletInfo.hasBalance
      // console.log(`hasBalance: ${JSON.stringify(hasBalance, null, 2)}`)

      // Loop through each entry in the hasBalance array.
      for (let i = 0; i < hasBalance.length; i++) {
        const thisAddr = hasBalance[i]

        if (thisAddr.balance >= 0.0004) {
          validUtxoCnt++

          // const utxos = await this.BITBOX.Blockbook.utxo(thisAddr.cashAddress)
          const utxos = await this.BITBOX.Ninsight.utxo(thisAddr.cashAddress)

          // Assumption: each address has only one UTXO and it is the one for testing.
          const utxo = utxos[0]
          utxo.index = thisAddr.index
          utxo.cashAddress = thisAddr.cashAddress

          testUtxos.push(utxo)
        }
      }

      if (validUtxoCnt < 10) return false

      console.log(`validUtxoCnt = ${validUtxoCnt}`)
      return testUtxos
    } catch (err) {
      console.error(`Error in verifyTestWallet()`)
      throw err
    }
  }

  // Returns a promise that resolves to a txid string
  // This function expects 1 UTXO in the sourceAddr, and it spends that UTXO
  // completely to the destAddr. sourceIndex is the HD wallet index for the
  // sourceAddr.
  async generateTx(sourceAddr, sourceIndex, destAddr) {
    try {
      // Get the address balance
      const balance = await _this.BITBOX.Blockbook.balance(sourceAddr)
      console.log(
        `BCH balance for source address ${sourceAddr}: ${balance.balance}`
      )
      console.log(`destination address: ${destAddr}`)

      // Get utxos
      // const utxos = await _this.BITBOX.Blockbook.utxo(sourceAddr)
      const utxos = await _this.BITBOX.Ninsight.utxo(sourceAddr)
      console.log(`utxos: ${JSON.stringify(utxos, null, 2)}`)

      if (utxos.length === 0) throw new Error(`No UTXOs found`)

      // Select optimal BCH UTXO
      // const utxo = await _this.send.selectUTXO(0.00001, utxos)
      const utxo = utxos[0] // Assuming a single utxo.
      utxo.hdIndex = sourceIndex
      // console.log(`selected utxo: ${JSON.stringify(utxo, null, 2)}`)

      if (!utxo.txid) throw new Error(`No valid UTXO could be found`)

      // Send the BCH
      const hex = await _this.sendBch(utxo, destAddr)
      return hex

      // const txid = await _this.appUtils.broadcastTx(hex)

      // return txid
    } catch (err) {
      // console.log(
      //   `Error in run-test.js/generateTx for address ${sourceAddr}: `,
      //   err
      // )
      // throw new Error(`Error caught in generateTx()`)
      throw err
    }
  }

  // Sends the entire amount of a utxo to a destination address.
  async sendBch(utxo, destAddr) {
    try {
      //console.log(`utxo: ${util.inspect(utxo)}`)

      // instance of transaction builder
      let transactionBuilder
      if (this.walletInfo.network === `testnet`)
        transactionBuilder = new this.BITBOX.TransactionBuilder("testnet")
      else transactionBuilder = new this.BITBOX.TransactionBuilder()

      const originalAmount = utxo.satoshis

      const vout = utxo.vout
      const txid = utxo.txid

      // add input with txid and index of vout
      transactionBuilder.addInput(txid, vout)

      // get byte count to calculate fee. paying 1 sat/byte
      const byteCount = this.BITBOX.BitcoinCash.getByteCount(
        { P2PKH: 1 },
        { P2PKH: 1 }
      )
      //console.log(`byteCount: ${byteCount}`)
      const satoshisPerByte = 1.1
      const txFee = Math.floor(satoshisPerByte * byteCount)
      //console.log(`txFee: ${txFee} satoshis\n`)

      // amount to send back to the sending address. It's the original amount - 1 sat/byte for tx size
      const satoshisToSend = originalAmount - txFee
      //console.log(`remainder: ${remainder}`)

      // add output w/ address and amount to send
      transactionBuilder.addOutput(
        this.BITBOX.Address.toLegacyAddress(destAddr),
        satoshisToSend
      )

      // Generate a keypair from the change address.
      const change = await this.appUtils.changeAddrFromMnemonic(
        this.walletInfo,
        utxo.hdIndex
      )
      //console.log(`change: ${JSON.stringify(change, null, 2)}`)
      const keyPair = this.BITBOX.HDNode.toKeyPair(change)

      // Sign the transaction with the HD node.
      let redeemScript
      transactionBuilder.sign(
        0,
        keyPair,
        redeemScript,
        transactionBuilder.hashTypes.SIGHASH_ALL,
        originalAmount
      )

      // build tx
      const tx = transactionBuilder.build()

      // output rawhex
      const hex = tx.toHex()
      //console.log(`Transaction raw hex: `)
      //console.log(hex)

      return hex
    } catch (err) {
      console.error(`Error in sendBch()`)
      throw err
    }
  }

  // Generates numOfAddrs addresses from a wallet, starting at nextAddress.
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

      const startIndex = walletInfo.nextAddress
      const stopIndex = walletInfo.nextAddress + numOfAddrs
      console.log(`Generating ${numOfAddrs} addresses.`)

      const addrs = []
      for (let i = startIndex; i < stopIndex; i++) {
        // derive an external change address HDNode
        const change = this.BITBOX.HDNode.derivePath(account, `0/${i}`)

        // get the cash address
        const newAddress = this.BITBOX.HDNode.toCashAddress(change)

        const addrObj = {
          index: i,
          address: newAddress
        }

        // Add the address to the array
        addrs.push(addrObj)
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

    return true
  }
}

IndexerTest.description = `Runs the benchmark indexer-test
...
This command assumes that the wallet has been prepped to run the test by first
running these commands:
- fund-test-wallet
- update-balances

After running the above commands in that order, the wallet will then be prepared
to run this command, which executes the benchmark test.
`

IndexerTest.flags = {
  name: flags.string({
    char: "n",
    description: "source wallet name to source funds"
  })
}

module.exports = IndexerTest
