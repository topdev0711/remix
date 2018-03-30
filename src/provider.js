var Web3 = require('web3')
var utils = require('ethereumjs-util')
var RemixLib = require('remix-lib')
var TxExecution = RemixLib.execution.txExecution
var TxRunner = RemixLib.execution.txRunner
var executionContext = RemixLib.execution.executionContext

function jsonRPCResponse(id, result) {
  let json = {"id":id,"jsonrpc":"2.0","result":result};
  console.dir(json);
  return json;
}

// TODO: fix me; this is a temporary and very hackish thing just to get the receipts working for now
var deployedContracts = {
}

function processTx(accounts, payload, callback) {
  let api = {
    logMessage: (msg) => {
      //self._components.editorpanel.log({ type: 'log', value: msg })
    },
    logHtmlMessage: (msg) => {
      //self._components.editorpanel.log({ type: 'html', value: msg })
    },
    //config: self._api.config,
    config: {
      getUnpersistedProperty: (key) => {
        console.dir("== getUnpersistedProperty ==")
        console.dir(key)
        if (key === 'settings/always-use-vm') {
          return true
        }
        return true
      },
      get: () => {
        return true
      }
    },
    detectNetwork: (cb) => {
      //executionContext.detectNetwork(cb)
      cb()
    },
    personalMode: () => {
      //return self._api.config.get('settings/personal-mode')
      return false
    }
  }

  executionContext.init(api.config);

  console.dir(accounts);
  let txRunner = new TxRunner(accounts, api);

  if (payload.params[0].to) {
    // tx
  } else {
    console.dir("== contract creation");
    // contract creation
    let from = payload.params[0].from;
    let data = payload.params[0].data;
    let value = payload.params[0].value;
    let gasLimit = payload.params[0].gasLimit || 800000;

    let callbacks = {
      confirmationCb: (network, tx, gasEstimation, continueTxExecution, cancelCb) => {
        console.dir("confirmationCb");
        continueTxExecution(null);
      },
      gasEstimationForceSend: (error, continueTxExecution, cancelCb) => {
        console.dir("gasEstimationForceSend");
        continueTxExecution();
      },
      promptCb: (okCb, cancelCb) => {
        console.dir("promptCb");
        okCb();
      }
    }

    let finalCallback = function(err, result) {
      console.dir(arguments)
      console.log("called final callback")
      //console.dir(result)
      let contractAddress = ('0x' + result.result.createdAddress.toString('hex'))
      //console.dir(contractAddress)
      console.dir(result.transactionHash)

      // TODO: fix me; this is a temporary and very hackish thing just to get the receipts working for now
      // deployedContracts[contractAddress] = contractAddress;
      callback(null, jsonRPCResponse(payload.id, result.transactionHash))
    }

    TxExecution.createContract(from, data, value, gasLimit, txRunner, callbacks, finalCallback);
  }
}

Provider = function() {
  this.web3 = new Web3();
  this.accounts = [this.web3.eth.accounts.create(["abcd"])]
}

//Provider.prototype.send = function(payload) {
//  console.log("=========== send");
//  console.dir(payload);
//  //return this.manager.request(payload);
//}

Provider.prototype.sendAsync = function(payload, callback) {
  console.log("=========== sendAsync");
  console.dir(payload);

  if (payload.method === 'eth_accounts') {
    return callback(null, jsonRPCResponse(payload.id, this.accounts.map((x) => x.address)))
  }
  if (payload.method === 'eth_estimateGas') {
    //return callback(null, jsonRPCResponseutils.bufferToInt(this.web3.utils.toHex(800000)))
    callback(null, jsonRPCResponse(payload.id, 800000))
  }
  if (payload.method === 'eth_gasPrice') {
    //return callback(null, jsonRPCResponseutils.bufferToInt(this.web3.utils.toHex(800000)))
    callback(null, jsonRPCResponse(payload.id, 1))
  }
  if (payload.method === 'eth_sendTransaction') {
    let _accounts = {};
    _accounts[this.accounts[0].address.toLowerCase()] = this.accounts[0];
    //_accounts[this.accounts[0].address.toLowerCase()].privateKey = Buffer(_accounts[this.accounts[0].address.toLowerCase()].privateKey);
    _accounts[this.accounts[0].address.toLowerCase()].privateKey = Buffer.from(_accounts[this.accounts[0].address.toLowerCase()].privateKey.slice(2), 'hex');
    processTx(_accounts, payload, callback)
  }
  if (payload.method === 'eth_getTransactionReceipt') {
    executionContext.web3().eth.getTransactionReceipt(payload.params[0], (error, receipt) => {
      console.dir(receipt);

      var r = { 
        "transactionHash": receipt.hash,
        "transactionIndex": "0x00",
        "blockHash": "0x766d18646a06cf74faeabf38597314f84a82c3851859d9da9d94fc8d037269e5",
        "blockNumber": "0x06",
        "gasUsed": "0x06345f",
        "cumulativeGasUsed": "0x06345f",
        "contractAddress": receipt.contractAddress,
        "logs": [],
        "status": 1
      }

      callback(null, jsonRPCResponse(payload.id, r));
    });
  }
  if (payload.method === 'eth_getCode') {
    let address = payload.params[0];
    let block   = payload.params[1];
    let data = "0x6060604052341561000f57600080fd5b610ee18061001e6000396000f3006060604052600436106100af576000357c0100000000000000000000000000000000000000000000000000000000900463ffffffff16806339df137f146100b457806344781a00146101295780634e3e4035146101a9578063556fe56214610225578063561015e2146102a9578063767392b314610325578063abcd7960146103a5578063b8f2853114610421578063bfba5dd6146104c9578063ea79dd7914610571578063f5bae6b6146105f5575b600080fd5b61010f6004808035151590602001909190803590602001908201803590602001908080601f01602080910402602001604051908101604052809392919081815260200183838082843782019150505050505091905050610671565b604051808215151515815260200191505060405180910390f35b61018f60048080351515906020019091908035151590602001909190803590602001908201803590602001908080601f01602080910402602001604051908101604052809392919081815260200183838082843782019150505050505091905050610724565b604051808215151515815260200191505060405180910390f35b61020b600480803590602001909190803590602001909190803590602001908201803590602001908080601f016020809104026020016040519081016040528093929190818152602001838380828437820191505050505050919050506107df565b604051808215151515815260200191505060405180910390f35b61028f6004808035600019169060200190919080356000191690602001909190803590602001908201803590602001908080601f01602080910402602001604051908101604052809392919081815260200183838082843782019150505050505091905050610896565b604051808215151515815260200191505060405180910390f35b61030b600480803590602001909190803590602001909190803590602001908201803590602001908080601f01602080910402602001604051908101604052809392919081815260200183838082843782019150505050505091905050610955565b604051808215151515815260200191505060405180910390f35b61038b60048080351515906020019091908035151590602001909190803590602001908201803590602001908080601f01602080910402602001604051908101604052809392919081815260200183838082843782019150505050505091905050610a0c565b604051808215151515815260200191505060405180910390f35b610407600480803590602001909190803590602001909190803590602001908201803590602001908080601f01602080910402602001604051908101604052809392919081815260200183838082843782019150505050505091905050610ac6565b604051808215151515815260200191505060405180910390f35b6104af600480803573ffffffffffffffffffffffffffffffffffffffff1690602001909190803573ffffffffffffffffffffffffffffffffffffffff1690602001909190803590602001908201803590602001908080601f01602080910402602001604051908101604052809392919081815260200183838082843782019150505050505091905050610b7c565b604051808215151515815260200191505060405180910390f35b610557600480803573ffffffffffffffffffffffffffffffffffffffff1690602001909190803573ffffffffffffffffffffffffffffffffffffffff1690602001909190803590602001908201803590602001908080601f01602080910402602001604051908101604052809392919081815260200183838082843782019150505050505091905050610c5f565b604051808215151515815260200191505060405180910390f35b6105db6004808035600019169060200190919080356000191690602001909190803590602001908201803590602001908080601f01602080910402602001604051908101604052809392919081815260200183838082843782019150505050505091905050610d41565b604051808215151515815260200191505060405180910390f35b610657600480803590602001909190803590602001909190803590602001908201803590602001908080601f01602080910402602001604051908101604052809392919081815260200183838082843782019150505050505091905050610dff565b604051808215151515815260200191505060405180910390f35b60008290507fe81a864f5996ae49db556bf6540209c15b8077395a85ede9dfa17ad07d9ff3668183604051808315151515815260200180602001828103825283818151815260200191508051906020019080838360005b838110156106e35780820151818401526020810190506106c8565b50505050905090810190601f1680156107105780820380516001836020036101000a031916815260200191505b50935050505060405180910390a192915050565b6000821515841515141590507fe81a864f5996ae49db556bf6540209c15b8077395a85ede9dfa17ad07d9ff3668183604051808315151515815260200180602001828103825283818151815260200191508051906020019080838360005b8381101561079d578082015181840152602081019050610782565b50505050905090810190601f1680156107ca5780820380516001836020036101000a031916815260200191505b50935050505060405180910390a19392505050565b60008284141590507fe81a864f5996ae49db556bf6540209c15b8077395a85ede9dfa17ad07d9ff3668183604051808315151515815260200180602001828103825283818151815260200191508051906020019080838360005b83811015610854578082015181840152602081019050610839565b50505050905090810190601f1680156108815780820380516001836020036101000a031916815260200191505b50935050505060405180910390a19392505050565b600082600019168460001916141590507fe81a864f5996ae49db556bf6540209c15b8077395a85ede9dfa17ad07d9ff3668183604051808315151515815260200180602001828103825283818151815260200191508051906020019080838360005b838110156109135780820151818401526020810190506108f8565b50505050905090810190601f1680156109405780820380516001836020036101000a031916815260200191505b50935050505060405180910390a19392505050565b60008284141590507fe81a864f5996ae49db556bf6540209c15b8077395a85ede9dfa17ad07d9ff3668183604051808315151515815260200180602001828103825283818151815260200191508051906020019080838360005b838110156109ca5780820151818401526020810190506109af565b50505050905090810190601f1680156109f75780820380516001836020036101000a031916815260200191505b50935050505060405180910390a19392505050565b60008215158415151490507fe81a864f5996ae49db556bf6540209c15b8077395a85ede9dfa17ad07d9ff3668183604051808315151515815260200180602001828103825283818151815260200191508051906020019080838360005b83811015610a84578082015181840152602081019050610a69565b50505050905090810190601f168015610ab15780820380516001836020036101000a031916815260200191505b50935050505060405180910390a19392505050565b600082841490507fe81a864f5996ae49db556bf6540209c15b8077395a85ede9dfa17ad07d9ff3668183604051808315151515815260200180602001828103825283818151815260200191508051906020019080838360005b83811015610b3a578082015181840152602081019050610b1f565b50505050905090810190601f168015610b675780820380516001836020036101000a031916815260200191505b50935050505060405180910390a19392505050565b60008273ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff16141590507fe81a864f5996ae49db556bf6540209c15b8077395a85ede9dfa17ad07d9ff3668183604051808315151515815260200180602001828103825283818151815260200191508051906020019080838360005b83811015610c1d578082015181840152602081019050610c02565b50505050905090810190601f168015610c4a5780820380516001836020036101000a031916815260200191505b50935050505060405180910390a19392505050565b60008273ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff161490507fe81a864f5996ae49db556bf6540209c15b8077395a85ede9dfa17ad07d9ff3668183604051808315151515815260200180602001828103825283818151815260200191508051906020019080838360005b83811015610cff578082015181840152602081019050610ce4565b50505050905090810190601f168015610d2c5780820380516001836020036101000a031916815260200191505b50935050505060405180910390a19392505050565b6000826000191684600019161490507fe81a864f5996ae49db556bf6540209c15b8077395a85ede9dfa17ad07d9ff3668183604051808315151515815260200180602001828103825283818151815260200191508051906020019080838360005b83811015610dbd578082015181840152602081019050610da2565b50505050905090810190601f168015610dea5780820380516001836020036101000a031916815260200191505b50935050505060405180910390a19392505050565b600082841490507fe81a864f5996ae49db556bf6540209c15b8077395a85ede9dfa17ad07d9ff3668183604051808315151515815260200180602001828103825283818151815260200191508051906020019080838360005b83811015610e73578082015181840152602081019050610e58565b50505050905090810190601f168015610ea05780820380516001836020036101000a031916815260200191505b50935050505060405180910390a193925050505600a165627a7a723058200e3acac7a73f7bae3ab373cf9bc370676181158c3238de70fb8eaaa3dbd2f4a30029"

    callback(null, jsonRPCResponse(payload.id, data));
  }
  //return this.manager.request(payload, callback);
}

Provider.prototype.isConnected = function() {
  return true;
}

module.exports = Provider;
