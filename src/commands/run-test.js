/*
  Reference:
  https://docs.google.com/document/d/1qtleJjNQ7b8v--RBEN17p56HqtHf9j4Bvtap4YRLXBs/edit#heading=h.vjv6nnxj3xmw

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
const NUMBER_OF_ADDRESSES = 3

const TOKEN_ID = `155784a206873c98acc09e8dabcccf6abf13c4c14d8662190534138a16bb93ce`

const TIME_BETWEEN_TXS = 20000 // time in milliseconds

const pRetry = require("p-retry")

const { Command, flags } = require("@oclif/command")

let _this

// Counters for tracking metrics during the test.
let errorCnt = 0
let txCnt = 0

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

    _this = this
  }

  async run() {
    try {
      const { flags } = this.parse(FundTest)

      // Ensure flags meet qualifiying critieria.
      this.validateFlags(flags)

      this.flags = flags

      // Fund the wallet
      await this.runTest(flags)
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
        const address = addresses[i]

        const txid = await this.generateTx(sourceWalletInfo, address, i)
        console.log(`Tokens sent with TXID: ${txid}`)

        await _this.sleep(TIME_BETWEEN_TXS) // Sleep between txs.
        console.log(" ")

        txCnt++
      }

      /*
      // Update the balances in the test wallet.
      walletInfo = await _this.updateBalances.updateBalances(_this.flags)

      // Loop through each address and generate a transaction for each one.
      // Add each transaction to a queue with automatic retry.
      for (let i = 0; i < addresses.length; i++) {
        const address = addresses[i]
        console.log(
          `Spending tokens with wallet index ${i}, address ${address}`
        )

        const txid = await pRetry(() => _this.generateTx(walletInfo, address), {
          onFailedAttempt: async () => {
            //   failed attempt.
            console.log(" ")
            console.log(
              `Attempt ${error.attemptNumber} failed. There are ${
                error.retriesLeft
              } retries left. Waiting ${TIME_BETWEEN_TXS /
                1000} seconds before trying again.`
            )
            console.log(" ")

            errorCnt++
            await _this.sleep(TIME_BETWEEN_TXS) // Sleep for 2 minutes
          },
          retries: 5 // Retry 5 times
        })

        console.log(`Successfully spend tokens at address ${address}`)
        console.log(`TXID: ${txid}`)
        console.log(" ")
        console.log(" ")
        txCnt++

        await _this.sleep(TIME_BETWEEN_TXS) // Wait some period of time before sending next tx.
      }
      // Add each transaction to the queue.

*/
      console.log(`test complete. txCnt: ${txCnt}, errorCnt: ${errorCnt}`)
    } catch (err) {
      // console.log(`Error in fundTestWallet()`)
      // throw err
      errorCnt++
    }
  }

  // Promise-based sleep function.
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Returns a promise that resolves to a txid string
  // This function runs a series of commands that correspond to the transaction
  // model in the appendix 2 of the test document.
  async generateTx(walletInfo, addr, walletIndex) {
    try {
      // Get the address balance
      const balance = await _this.BITBOX.Blockbook.balance(addr)
      console.log(`BCH balance for address ${addr}: ${balance.balance}`)

      // Get the SLP balance for the address.
      const tokenBalance = await _this.BITBOX.SLP.Utils.balancesForAddress(addr)
      // console.log(`token balance: ${JSON.stringify(tokenBalance, null, 2)}`)
      console.log(`token balance: ${tokenBalance[0].balance}`)

      // Get utxos
      const utxos = await _this.BITBOX.Blockbook.utxo(addr)
      // console.log(`utxos: ${JSON.stringify(utxos, null, 2)}`)

      // Get a list of token UTXOs from the wallet for this token.
      // const tokenUtxos = _this.sendTokens.getTokenUtxos(TOKEN_ID, walletInfo)
      let tokenUtxos = await _this.BITBOX.SLP.Utils.tokenUtxoDetails(utxos)
      tokenUtxos = tokenUtxos.filter(x => x)
      tokenUtxos[0].hdIndex = walletIndex // Expected by sendTokens()
      // console.log(`tokenUtxos: ${JSON.stringify(tokenUtxos, null, 2)}`)

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

      // Pad the test with extra calls to make it more closely resemble the
      // 'ideal' transaction from the test document.
      await _this.BITBOX.Blockbook.balance(addr)
      await _this.BITBOX.SLP.Utils.balancesForAddress(addr)
      await _this.BITBOX.Blockbook.utxo(addr)
      await _this.BITBOX.Blockbook.utxo(addr)

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
      // console.log(`hex: ${hex}`)

      const txid = await _this.appUtils.broadcastTx(hex)

      return txid
    } catch (err) {
      console.log(`Error in run-test.js/generateTx for address ${addr}: `, err)
      // throw new Error(`Error caught in generateTx()`)
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

    return true
  }
}

FundTest.description = `Runs the benchmark test
...
This command assumes that the wallet has been prepped to run the test by first
running these commands:
- fund-test-wallet
- tokenize-test-wallet
- update-balances

After running the above commands in that order, the wallet will then be prepared
to run this command, which executes the benchmark test.
`

FundTest.flags = {
  name: flags.string({
    char: "n",
    description: "source wallet name to source funds"
  })
}

module.exports = FundTest
