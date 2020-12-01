const Web3 = require("web3");
const fs = require('fs');

const web3 = new Web3("wss://mainnet.infura.io/ws/v3/eac59ac8301e429aa7d149719e38544c");
const balTokenAbi = [{"inputs":[{"internalType":"string","name":"name","type":"string"},{"internalType":"string","name":"symbol","type":"string"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"spender","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Transfer","type":"event"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"burn","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"subtractedValue","type":"uint256"}],"name":"decreaseAllowance","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"addedValue","type":"uint256"}],"name":"increaseAllowance","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"mint","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"pool_address","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"to","type":"address"}],"name":"set_governance","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"sender","type":"address"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transferFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"}]

let addresses = {
  '0x9be973b1496e28b3b745742391b0e5977184f1ac': 'epoch-1-principal-s',
  '0x372Bc201134676c846F1fd07a2a059Fd18526De3': 'epoch-1-dsec-s',
  '0x28DcafcbF29A502B33a719d726B0E723A73b6AD3': 'epoch-1-dsec-a',
  '0x8364Cf2bc1504e05EfEd9b92Ee903b642B6f3Fb5': 'epoch-1-principal-a',
  '0x19e5a60c1646c921aC592409548d1bCe5B071Faa': 'epoch-1-dsec-uni',
  '0x87c4a23A15E2442422E5e43d08cEEF7D1F32792d': 'epoch-1-principal-uni'
}

async function retrieveEvents(contractAddress) {
  const contract = new web3.eth.Contract(balTokenAbi, contractAddress);
  return contract.getPastEvents('0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
    {
      fromBlock: 11261577,
      toBlock: 11354070
    });
}

async function processItem(item) {
  return {
    from: item.returnValues.from,
    to: item.returnValues.to,
    value: item.returnValues.value,
    contract: item.address,
    transactionHash: item.transactionHash
  }
}

async function writeTransfers() {
  for (const addressesKey in addresses) {
    let transferEvents = await retrieveEvents(addressesKey);
    console.log('Number of events', transferEvents.length);
    let transfersList = [];
    for (const event of transferEvents) {
      let processedItem = await processItem(event);
      transfersList.push(processedItem);
    }

    let transferLogName = `${addressesKey.substring(0,8)}-${addresses[addressesKey]}-log.json`;
    fs.writeFile(transferLogName, JSON.stringify(transfersList, null, 2), (err) => {
      if (err) throw err;
      console.log(`Completed writing to ${transferLogName}`);
    });
  }
}

writeTransfers().then(() => {
  console.log("done")
})
