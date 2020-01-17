"use strict"

//const fs = require("fs")
//const BB = require("bitbox-sdk/lib/bitbox-sdk").default

const shelljs = require("shelljs")
const Table = require("cli-table")

const util = require("util")
util.inspect.defaultOptions = {
  showHidden: true,
  colors: true,
  depth: 1
}

const { Command, flags } = require("@oclif/command")

class ListWallets extends Command {
  async run() {
    const { flags } = this.parse(ListWallets)

    const walletData = this.parseWallets()

    this.displayTable(walletData)
  }

  // Parse data from the wallets directory into a formatted array.
  parseWallets() {
    const fileList = shelljs.ls(`${__dirname}/../../wallets/*.json`)
    //console.log(`fileList: ${JSON.stringify(fileList, null, 2)}`)

    if (fileList.length === 0) {
      console.log(`No wallets found.`)
      return []
    }

    const retData = []

    // Loop through each wallet returned.
    for (let i = 0; i < fileList.length; i++) {
      const thisFile = fileList[i]
      //console.log(`thisFile: ${thisFile}`)

      const lastPart = thisFile.indexOf(`.json`)

      const lastSlash = thisFile.indexOf(`wallets/`)
      //console.log(`lastSlash: ${lastSlash}`)

      let name = thisFile.slice(8, lastPart)
      //console.log(`name: ${name}`)

      name = name.slice(lastSlash)

      // Delete the cached copy of the wallet. This allows testing of list-wallets.
      delete require.cache[require.resolve(`${thisFile}`)]

      const walletInfo = require(`${thisFile}`)

      retData.push([name, walletInfo.network, walletInfo.balance])
    }

    return retData
  }

  // Display table in a table on the command line using cli-table.
  displayTable(data) {
    var table = new Table({
      head: ["Name", "Network", "Balance (BCH)"],
      colWidths: [25, 15, 15]
    })

    for (let i = 0; i < data.length; i++) table.push(data[i])

    console.log(table.toString())
  }
}

ListWallets.description = `List existing wallets.`

ListWallets.flags = {
  //testnet: flags.boolean({ char: "t", description: "Create a testnet wallet" }),
  //name: flags.string({ char: "n", description: "Name of wallet" })
}

module.exports = ListWallets
