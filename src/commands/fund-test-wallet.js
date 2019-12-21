/*
  Reference:
  https://docs.google.com/document/d/1qtleJjNQ7b8v--RBEN17p56HqtHf9j4Bvtap4YRLXBs/edit#heading=h.vjv6nnxj3xmw

  This command funds a test wallet and prepars it for running a benchmark test.
*/

"use strict"

const config = require("../../config")

const AppUtils = require("../util")
const appUtils = new AppUtils()

const Send = require("./send")
const send = new Send()

const GetAddress = require("./get-address")
const getAddress = new GetAddress()

const UpdateBalances = require("./update-balances")

// Mainnet by default
const BITBOX = new config.BCHLIB({
  restURL: config.MAINNET_REST,
  apiToken: config.JWT
})

// The number of addresses to fund for the test.
const NUMBER_OF_ADDRESSES = 3

const { Command, flags } = require("@oclif/command")

class FundTest extends Command {
  constructor(argv, config) {
    super(argv, config)
    //_this = this

    this.BITBOX = BITBOX
    this.appUtils = appUtils
  }

  async run() {
    try {
      const { flags } = this.parse(FundTest)

      // Ensure flags meet qualifiying critieria.
      this.validateFlags(flags)

      // Fund the wallet
      await this.fundTestWallet(flags)
    } catch (err) {
      console.log(`Error in fund-test-wallet: `, err)
    }
  }

  // Parent function that starts funding.
  async fundTestWallet(flags) {
    try {
      const source = flags.name // Name of the source wallet.
      const dest = flags.dest // Name of the destination wallet.

      // Open the source wallet data file.
      const sourceFilename = `${__dirname}/../../wallets/${source}.json`
      let sourceWalletInfo = this.appUtils.openWallet(sourceFilename)
      sourceWalletInfo.name = source

      // Open the destination wallet data file.
      const destFilename = `${__dirname}/../../wallets/${dest}.json`
      const destWalletInfo = this.appUtils.openWallet(destFilename)
      destWalletInfo.name = dest

      // Determine if this is a testnet wallet or a mainnet wallet.
      if (sourceWalletInfo.network === "testnet") {
        this.BITBOX = new config.BCHLIB({ restURL: config.TESTNET_REST })
        this.appUtils.BITBOX = this.BITBOX
      }

      // Update balances before sending.
      const updateBalances = new UpdateBalances()
      updateBalances.BITBOX = this.BITBOX
      sourceWalletInfo = await updateBalances.updateBalances(flags)

      // Generate 300 addresses from the test wallet.
      const addresses = await this.generateAddresses(
        destWalletInfo,
        NUMBER_OF_ADDRESSES
      )
      console.log(`addresses: ${JSON.stringify(addresses, null, 2)}`)

      // Loop through each address and generate a transaction for each one.

      // Add each transaction to the queue.
    } catch (err) {
      console.log(`Error in fundTestWallet()`)
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
