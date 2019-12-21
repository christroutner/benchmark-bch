/*
  oclif command to send SLP tokens to an address.

  This command is optimized for privacy the same way the 'send' command is. See
  that command for details.

  Spends all token UTXOs for the same token and will send token change to the
  same address the BCH change.

  Basic workflow of sending an SLP token:
  - Inputs:
    - token Id, amount, input token UTXOs, input BCH payment UTXO, token output addr, token change addr, bch change addr
    - Note: All UTXOs for the same token should be spent. This will consolidate token UTXOs.
  - Validate inputs
  - Convert token quantities into their base denomination (satoshis) with BigNumber lib.
  - Generate the OP_RETURN transaction
*/

"use strict"

const GetAddress = require("./get-address")
const UpdateBalances = require("./update-balances")
const Send = require("./send")
const config = require("../../config")

const AppUtils = require("../util")
const appUtils = new AppUtils()

const BigNumber = require("bignumber.js")

// Mainnet by default
const BITBOX = new config.BCHLIB({
  restURL: config.MAINNET_REST,
  apiToken: config.JWT
})

// Used for debugging and error reporting.
const util = require("util")
util.inspect.defaultOptions = { depth: 2 }

const { Command, flags } = require("@oclif/command")

class SendTokens extends Command {
  constructor(argv, config) {
    super(argv, config)
    //_this = this

    this.BITBOX = BITBOX
    this.appUtils = appUtils // Allows for easy mocking for unit tests.
  }

  async run() {
    try {
      const { flags } = this.parse(SendTokens)

      // Ensure flags meet qualifiying critieria.
      this.validateFlags(flags)

      const name = flags.name // Name of the wallet.
      const qty = flags.qty // Amount to send in BCH.
      const sendToAddr = flags.sendAddr // The address to send to.
      const tokenId = flags.tokenId // SLP token ID.

      // Open the wallet data file.
      const filename = `${__dirname}/../../wallets/${name}.json`
      let walletInfo = appUtils.openWallet(filename)
      walletInfo.name = name

      // Determine if this is a testnet wallet or a mainnet wallet.
      if (walletInfo.network === "testnet") {
        this.BITBOX = new config.BCHLIB({ restURL: config.TESTNET_REST })
        appUtils.BITBOX = this.BITBOX
      }

      // Update balances before sending.
      const updateBalances = new UpdateBalances()
      updateBalances.BITBOX = this.BITBOX
      walletInfo = await updateBalances.updateBalances(flags)
      //console.log(`walletInfo: ${JSON.stringify(walletInfo, null, 2)}`)

      // Get a list of token UTXOs from the wallet for this token.
      const tokenUtxos = this.getTokenUtxos(tokenId, walletInfo)

      // Get a list of BCH UTXOs in this wallet that can be used to pay for
      // the transaction fee.
      const utxos = await this.getBchUtxos(walletInfo)
      //console.log(`send utxos: ${util.inspect(utxos)}`)

      // Instatiate the Send class so this function can reuse its selectUTXO() code.
      const send = new Send()
      if (walletInfo.network === "testnet") {
        send.BITBOX = new config.BCHLIB({ restURL: config.TESTNET_REST })
        send.appUtils.BITBOX = new config.BCHLIB({
          restURL: config.TESTNET_REST
        })
      }

      // Select optimal UTXO
      // TODO: Figure out the appropriate amount of BCH to use in selectUTXO()
      const utxo = await send.selectUTXO(0.000015, utxos)
      // 1500 satoshis used until a more accurate calculation can be devised.
      //console.log(`selected utxo: ${util.inspect(utxo)}`)

      // Exit if there is no UTXO big enough to fulfill the transaction.
      if (!utxo.amount) {
        this.log(
          `Could not find a UTXO big enough for this transaction. More BCH needed.`
        )
        return
      }

      // Generate a new address, for sending change to.
      const getAddress = new GetAddress()
      getAddress.BITBOX = this.BITBOX
      const changeAddress = await getAddress.getAddress(filename)
      //console.log(`changeAddress: ${changeAddress}`)

      // Send the token, transfer change to the new address
      const hex = await this.sendTokens(
        utxo,
        qty,
        changeAddress,
        sendToAddr,
        walletInfo,
        tokenUtxos
      )
      // console.log(`hex: ${hex}`)

      const txid = await appUtils.broadcastTx(hex)
      appUtils.displayTxid(txid, walletInfo.network)
    } catch (err) {
      //if (err.message) console.log(err.message)
      //else console.log(`Error in .run: `, err)
      console.log(`Error in send-tokens.js/run(): `, err)
    }
  }

  // Generates the SLP transaction in hex format, ready to broadcast to network.
  async sendTokens(
    utxo,
    qty,
    changeAddress,
    sendToAddr,
    walletInfo,
    tokenUtxos
  ) {
    try {
      //console.log(`utxo: ${util.inspect(utxo)}`)

      // instance of transaction builder
      let transactionBuilder
      if (walletInfo.network === `testnet`)
        transactionBuilder = new this.BITBOX.TransactionBuilder("testnet")
      else transactionBuilder = new this.BITBOX.TransactionBuilder()

      //const satoshisToSend = Math.floor(bch * 100000000)
      //console.log(`Amount to send in satoshis: ${satoshisToSend}`)
      const originalAmount = utxo.satoshis
      const vout = utxo.vout
      const txid = utxo.txid

      // add input utxo to pay for transaction.
      transactionBuilder.addInput(txid, vout)

      // add each token UTXO as an input.
      for (let i = 0; i < tokenUtxos.length; i++)
        transactionBuilder.addInput(tokenUtxos[i].txid, tokenUtxos[i].vout)

      // get byte count to calculate fee. paying 1 sat
      // Note: This may not be totally accurate. Just guessing on the byteCount size.
      // const byteCount = this.BITBOX.BitcoinCash.getByteCount(
      //   { P2PKH: 3 },
      //   { P2PKH: 5 }
      // )
      // //console.log(`byteCount: ${byteCount}`)
      // const satoshisPerByte = 1.1
      // const txFee = Math.floor(satoshisPerByte * byteCount)
      // console.log(`txFee: ${txFee} satoshis\n`)
      const txFee = 500

      // amount to send back to the sending address. It's the original amount - 1 sat/byte for tx size
      const remainder = originalAmount - txFee - 546 * 2
      if (remainder < 1)
        throw new Error(`Selected UTXO does not have enough satoshis`)
      //console.log(`remainder: ${remainder}`)

      // Generate the OP_RETURN entry for an SLP SEND transaction.
      //console.log(`Generating op-return.`)
      const { script, outputs } = this.generateOpReturn(tokenUtxos, qty)
      //console.log(`script: ${JSON.stringify(script, null, 2)}`)

      const data = BITBOX.Script.encode(script)
      //console.log(`data: ${JSON.stringify(data, null, 2)}`)

      // Add OP_RETURN as first output.
      transactionBuilder.addOutput(data, 0)

      // Send dust transaction representing tokens being sent.
      transactionBuilder.addOutput(
        this.BITBOX.Address.toLegacyAddress(sendToAddr),
        546
      )

      // Return any token change back to the sender.
      if (outputs > 1) {
        transactionBuilder.addOutput(
          this.BITBOX.Address.toLegacyAddress(changeAddress),
          546
        )
      }

      // Last output: send the change back to the wallet.
      transactionBuilder.addOutput(
        this.BITBOX.Address.toLegacyAddress(changeAddress),
        remainder
      )
      // console.log(`utxo: ${JSON.stringify(utxo, null, 2)}`)

      // Generate a keypair from the change address.
      const change = await appUtils.changeAddrFromMnemonic(
        walletInfo,
        utxo.hdIndex
      )
      //console.log(`change: ${JSON.stringify(change, null, 2)}`)
      const keyPair = this.BITBOX.HDNode.toKeyPair(change)

      // Sign the transaction with the private key for the UTXO paying the fees.
      let redeemScript
      transactionBuilder.sign(
        0,
        keyPair,
        redeemScript,
        transactionBuilder.hashTypes.SIGHASH_ALL,
        originalAmount
      )

      // Sign each token UTXO being consumed.
      for (let i = 0; i < tokenUtxos.length; i++) {
        const thisUtxo = tokenUtxos[i]
        // console.log(`thisUtxo: ${JSON.stringify(thisUtxo, null, 2)}`)

        // Generate a keypair to sign the SLP UTXO.
        const slpChangeAddr = await appUtils.changeAddrFromMnemonic(
          walletInfo,
          thisUtxo.hdIndex
        )

        const slpKeyPair = this.BITBOX.HDNode.toKeyPair(slpChangeAddr)
        //console.log(`slpKeyPair: ${JSON.stringify(slpKeyPair, null, 2)}`)

        transactionBuilder.sign(
          1 + i,
          slpKeyPair,
          redeemScript,
          transactionBuilder.hashTypes.SIGHASH_ALL,
          thisUtxo.satoshis
        )
      }

      // build tx
      const tx = transactionBuilder.build()

      // output rawhex
      const hex = tx.toHex()
      //console.log(`Transaction raw hex: `)
      //console.log(hex)

      return hex
    } catch (err) {
      console.log(`Error in sendTokens()`)
      throw err
    }
  }

  // Retrieve UTXOs associated with the user-specified token. Throws an error
  // if no UTXOs for that token can be found.
  getTokenUtxos(tokenId, walletInfo) {
    try {
      const tokenUtxos = walletInfo.SLPUtxos.filter(x => x.tokenId === tokenId)
      if (tokenUtxos.length === 0)
        throw new Error(`No tokens in the wallet matched the given token ID.`)

      // For debugging:
      //console.log(`tokenUtxos: ${JSON.stringify(tokenUtxos, null, 2)}`)

      return tokenUtxos
    } catch (err) {
      this.log(`Error in send-token.js/getTokenUtxos().`)
      throw err
    }
  }

  // A wrapper for the util library getUTXOs() call. Throws an error if there
  // are no BCH UTXOs to pay for the SLP transaction miner fees.
  async getBchUtxos(walletInfo) {
    try {
      const utxos = await this.appUtils.getUTXOs(walletInfo)
      if (utxos.length === 0) {
        throw new Error(
          `No BCH UTXOs found in wallet. No way to pay miner fees for transaction.`
        )
      }

      return utxos
    } catch (err) {
      this.log(`Error in send-tokens.js/getBchUtxos().`)
      throw err
    }
  }

  // Generate the OP_RETURN script for an SLP Send transaction.
  // It's assumed all elements in the tokenUtxos array belong to the same token.
  generateOpReturn(tokenUtxos, sendQty) {
    try {
      const tokenId = tokenUtxos[0].tokenId
      const decimals = tokenUtxos[0].decimals

      // Calculate the total amount of tokens owned by the wallet.
      let totalTokens = 0
      for (let i = 0; i < tokenUtxos.length; i++)
        totalTokens += tokenUtxos[i].tokenQty

      const change = totalTokens - sendQty

      let script
      let outputs = 1

      // The normal case, when there is token change to return to sender.
      if (change > 0) {
        outputs = 2

        let baseQty = new BigNumber(sendQty).times(10 ** decimals)
        baseQty = baseQty.absoluteValue()
        let baseQtyHex = baseQty.toString(16)
        baseQtyHex = baseQtyHex.padStart(16, "0")

        let baseChange = new BigNumber(change).times(10 ** decimals)
        baseChange = baseChange.absoluteValue()
        let baseChangeHex = baseChange.toString(16)
        baseChangeHex = baseChangeHex.padStart(16, "0")

        script = [
          BITBOX.Script.opcodes.OP_RETURN,
          Buffer.from("534c5000", "hex"),
          //BITBOX.Script.opcodes.OP_1,
          Buffer.from("01", "hex"),
          Buffer.from(`SEND`),
          Buffer.from(tokenId, "hex"),
          Buffer.from(baseQtyHex, "hex"),
          Buffer.from(baseChangeHex, "hex")
        ]
      } else {
        // Corner case, when there is no token change to send back.

        let baseQty = new BigNumber(sendQty).times(10 ** decimals)
        baseQty = baseQty.absoluteValue()
        let baseQtyHex = baseQty.toString(16)
        baseQtyHex = baseQtyHex.padStart(16, "0")

        //console.log(`baseQty: ${baseQty.toString()}`)

        script = [
          BITBOX.Script.opcodes.OP_RETURN,
          Buffer.from("534c5000", "hex"),
          //BITBOX.Script.opcodes.OP_1,
          Buffer.from("01", "hex"),
          Buffer.from(`SEND`),
          Buffer.from(tokenId, "hex"),
          Buffer.from(baseQtyHex, "hex")
        ]
      }

      return { script, outputs }
    } catch (err) {
      console.log(`Error in generateOpReturn()`)
      throw err
    }
  }

  // Validate the proper flags are passed in.
  validateFlags(flags) {
    //console.log(`flags: ${JSON.stringify(flags, null, 2)}`)

    // Exit if wallet not specified.
    const name = flags.name
    if (!name || name === "")
      throw new Error(`You must specify a wallet with the -n flag.`)

    const qty = flags.qty
    if (isNaN(Number(qty)))
      throw new Error(`You must specify a quantity of tokens with the -q flag.`)

    const sendAddr = flags.sendAddr
    if (!sendAddr || sendAddr === "")
      throw new Error(`You must specify a send-to address with the -a flag.`)

    const tokenId = flags.tokenId
    if (!tokenId || tokenId === "")
      throw new Error(`You must specifcy the SLP token ID`)

    // check Token Id should be hexademical chracters.
    const re = /^([A-Fa-f0-9]{2}){32,32}$/
    if (typeof tokenId !== "string" || !re.test(tokenId)) {
      throw new Error(
        "TokenIdHex must be provided as a 64 character hex string."
      )
    }

    return true
  }
}

SendTokens.description = `Send SLP tokens.`

SendTokens.flags = {
  name: flags.string({ char: "n", description: "Name of wallet" }),
  tokenId: flags.string({ char: "t", description: "Token ID" }),
  sendAddr: flags.string({
    char: "a",
    description: "Cash or SimpleLedger address to send to"
  }),
  qty: flags.string({ char: "q", decription: "Quantity of tokens to send" })
}

module.exports = SendTokens
