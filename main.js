"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const back = require('androidjs').back;
//const fs_1 = require("fs");
//const path = require('path');

back.on('init-delayed', function(ignored){

try {
	var elliptic_1 = require("elliptic");
	var EC = new elliptic_1.ec('secp256k1');
	const _ = require("lodash");


	const p2p_1 = require("./p2p");
	const blockchain_1 = require("./blockchain");
	const transaction_1 = require("./transaction");
	const config_1 = require("./config");
	const transactionPool_1 = require("./transactionPool");
	const wallet_1 = require("./wallet");


	let mode = 'local'; //config_1.getMode();

	// To start the P2P server send the port number to this -- Need Explanaton here.
	back.on('init-p2p', function(p2pPortString){
		try {
			back.send('debug-info','main.init-p2p('+p2pPortString+')'); // log method start
			
			back.send('status-update','P2P attempting to initialize');
			
			// Parse port number
			var p2pPort = 6001; // use 6001 if p2pPortString is bad
			try {
				p2pPort = p2pPortString && parseInt(p2pPortString) || 6001;
			} catch(e) {
				back.send('debug-warn','main.init-p2p: error parsing "'+p2pPort+'" '+e.message);
				p2pPort = 6001; // shouldn't be necessary
			}
			
			// Initialize p2p
			back.send('debug-info','main.init-p2p: p2p using port: '+p2pPort);
			try {
				p2p_1.initP2PServer(p2pPort);
				back.send('status-update','P2P Initialized');
				back.send('report-result',{'type':'init-p2p', 'result':'success'});
			} catch(e) {
				back.send('debug-error','main.init-p2p: Failed to initialize P2P: '+e.message);
				back.send('status-update','P2P Not Initialized');
				back.send('report-result',{'type':'init-p2p', 'result':'fail'});
			}
			
			back.send('debug-info','/main.init-p2p'); // log method end
		} catch(e) {
			back.send('debug-error','main.init-p2p: Major Error: '+e.message);
			back.send('status-update','Major Error');
			back.send('report-result',{'type':'init-p2p', 'result':'fail'});
		}
	});



	back.on('init-wallet', function(user_datapath){
		back.send('debug-info','main.init-wallet('+user_datapath+')');
		
		back.send('status-update','Wallet attempting to initialize');
		try {
			wallet_1.initWallet(user_datapath);
			back.send('status-update','Wallet Initialized');
			back.send('report-result',{'type':'init-wallet', 'result':'success'});
		} catch(e) {
			back.send('debug-error','main.init-wallet: Failed to initialize wallet: '+e.message);
			back.send('status-update','Wallet Not Initialized');
			back.send('report-result',{'type':'init-wallet', 'result':'fail'});
		}
		
		back.send('debug-info','/main.init-wallet');
	});


	back.on('get-mode', function(ignored){
		back.send('debug-info','main.get-mode()');
		
		back.send('debug-info','main.get-mode: config.getMode()');
		mode = config_1.getMode();
		back.send('debug-info','main.get-mode: config returned mode: '+mode);
		
		back.send('mode-update', mode);
		
		back.send('debug-info','/main.set-mode');
	});


	// Better way to do this
	back.on('set-mode', function(new_mode){
		back.send('debug-info','main.set-mode('+new_mode+')');
		
		back.send('status-update','Changing to '+new_mode+' mode');
		
		try { switch (new_mode) { // switch to mode.toLowerCase()
			case 'local':
				back.send('debug-info','main.set-mode: p2p.setModeLocal()');
				p2p_1.setModeLocal();
				break;
			case 'dew':
				back.send('debug-info','main.set-mode: p2p.setModeDew()');
				p2p_1.setModeDew();
				break;
			default:
				back.send('debug-warn','Did not recognize mode: '+new_mode);
		}} catch(e) {
			back.send('debug-error','main.set-mode: Error setting mode to "'+new_mode+'": '+e.message);
		}
		
		back.send('debug-info','main.set-mode: config.getMode()');
		mode = config_1.getMode();
		back.send('debug-info','main.set-mode: config returned mode: '+mode);
		
		back.send('mode-update', mode);
		
		back.send('debug-info','/main.set-mode');
	});


	// Set the Mode to Local
	// setmodelocal follows dew server convention
	back.on('setmodelocal', function(ignored){
		back.send('debug-info','main.setmodelocal()');
		
		back.send('status-update','Changing to local mode');
		
		try {
			back.send('debug-info','main.setmodelocal: p2p.setModeLocal()');
			p2p_1.setModeLocal();
		} catch(e) {
			back.send('debug-error','main.setmodelocal: Error setting mode: '+e.message);
		}
		
		back.send('debug-info','main.setmodelocal: config.getMode()');
		mode = config_1.getMode();
		back.send('debug-info','main.setmodelocal: config returned mode: '+mode);
		
		back.send('mode-update', mode);
		
		back.send('debug-info','/main.setmodelocal');
	});


	// Set Mode to Dew
	// setmodedew follows dew server convention
	back.on('setmodedew', function(ignored){
		back.send('debug-info','main.setmodedew()');
		
		back.send('status-update','Changing to dew mode');
		
		try {
			back.send('debug-info','main.setmodedew: p2p.setModeDew()');
			p2p_1.setModeDew();
		} catch(e) {
			back.send('debug-error','main.setmodedew: Error setting mode: '+e.message);
		}
		
		back.send('debug-info','main.setmodedew: config.getMode()');
		mode = config_1.getMode();
		back.send('debug-info','main.setmodedew: config returned mode: '+mode);
		
		back.send('mode-update', mode);
		
		back.send('debug-info','/main.setmodedew');
	});


	// Fetch Dew Server Account to Cloud Server for Verification.
	// fetchAccounts follows dew server convention
	back.on('fetchAccounts', function(ignored){
		back.send('debug-info','main.fetchAccounts()');
		//This one should not be available in Local Mode.
		try { switch (mode) {
			case 'dew':
				back.send('debug-info','main.fetchAccounts: p2p.fetchAccounts()');
				p2p_1.fetchAccounts();
				back.send('status-update','Accounts fetch requested');
				break;
			case 'local':
				back.send('debug-warn','main.fetchAccounts: Unable to fetch accounts in local mode');
				back.send('status-update','Accounts fetch impossible in local mode');
			default:
				back.send('debug-error','main.fetchAccounts: Unable to recognize current mode "'+mode+'"');
				back.send('status-update','Mode error');
		}} catch(e) {
			back.send('debug-error','main.fetchAccounts: Error requesting accounts fetch: '+e.message);
		}
		
		back.send('debug-info','/main.fetchAccounts');
	})


	// Get Whole Blockchain
	// blocks follows dew server convention
	back.on('blocks',function(ignored){
		back.send('debug-info','main.blocks()');
		back.send('status-update','Getting blockchain');
		
		try {
			back.send('debug-info','main.blocks: blockchain.getBlockchain()');
			const blockchain = blockchain_1.getBlockchain();
			back.send('status-update','Blockchain received');
			back.send('blockchain-data', blockchain); // May need JSON.stringify(blockchain)
		} catch(e) {
			back.send('debug-error','main.blocks: Error getting blockchain: '+e.message);
		}
		
		back.send('debug-info','/main.blocks');
	})


	// Find a block by hash
	// block follows dew server convention
	back.on('block',function(hash){ // hash is the hashcode for the desired block
		back.send('debug-info','main.block('+hash+')');
		
		back.send('status-update','Getting requested block');
		
		try {
			back.send('debug-info','main.block: blockchain.getBlockchain()');
			const blockchain = blockchain_1.getBlockchain();
			
			back.send('debug-info','main.block: lodash.find: locating block');
			const block = _.find(blockchain, { 'hash': hash });
			
			if (block) {
				back.send('status-update','Block found');
				back.send('block-data', block); // May need JSON.stringify(block)
			} else {
				back.send('status-update','Block not found');
			}
		} catch(e) {
			back.send('debug-error','main.block: Error getting block: '+e.message);
		}
		
		back.send('debug-info','/main.block');
	})


	// Query accounts.
	// accounts follows dew server convention
	back.on('accounts', function(ignored){
		back.send('debug-info','main.accounts()');
		
		back.send('status-update','Getting accounts');
		
		try {
			back.send('debug-info','main.accounts: blockchain.getAccounts()');
			const accounts = blockchain_1.getAccounts();
			back.send('accounts-data', accounts); // May need JSON.stringify(accounts)
		} catch(e) {
			back.send('debug-error','main.accounts: Error getting accounts: '+e.message);
		}
		
		back.send('debug-info','/main.accounts');
	});


	// Query account by Account Address.
	// account follows dew server convention
	back.on('account', function(address){
		back.send('debug-info','main.account('+address+')');
		
		back.send('status-update','Getting requested account');
		
		try {
			back.send('debug-info','main.account: blockchain.getAccounts()');
			const accounts = blockchain_1.getAccounts();
			
			back.send('debug-info','main.account: transaction.findAccount');
			let acc = transaction_1.findAccount(address, accounts);
			
			if (acc == undefined) {
				back.send('debug-warn','main.account: bad address');
				back.send('status-update','Incorrect account address');
			} else {
				back.send('status-update','Account found');
				back.send('account-data', acc); // May need JSON.stringify(acc)
			}
		} catch(e) {
			back.send('debug-error','main.account: Error getting account: '+e.message);
		}
		
		back.send('debug-info','/main.account');
	});


	// Check User Account
	// account follows dew server convention
	back.on('myaccount', function(ignored){
		back.send('debug-info','main.myaccount()');
		
		back.send('status-update','Getting your account');
		
		try {
			back.send('debug-info','main.myaccount: blockchain.getAccounts()');
			const accounts = blockchain_1.getAccounts();
			
			back.send('debug-info','main.myaccount: wallet.getPublicFromWallet()');
			const address = wallet_1.getPublicFromWallet();
			back.send('debug-info','main.myaccount: received address "'+address+'"');
			
			back.send('debug-info','main.myaccount: transaction.findAccount');
			let acc = transaction_1.findAccount(address, accounts);
			
			if (acc == undefined) {
				back.send('debug-warn','main.myaccount: account not found');
				back.send('status-update','No account found');
			} else {
				back.send('status-update','Account found');
				back.send('my-account-data', acc); // May need JSON.stringify(acc)
			}
		} catch(e) {
			back.send('debug-error','main.myaccount: Error getting accounts: '+e.message);
		}
		
		back.send('debug-info','/main.myaccount');
	});


	// Check User Balance
	// mybalance follows dew server convention
	back.on('mybalance', function(ignored){
		back.send('debug-info','main.mybalance()');
		
		back.send('status-update','Getting ballance');
		
		try {
			back.send('debug-info','main.mybalance: blockchain.getAccounts()');
			const accounts = blockchain_1.getAccounts();
			
			back.send('debug-info','main.mybalance: wallet.getPublicFromWallet()');
			const address = wallet_1.getPublicFromWallet();
			back.send('debug-info','main.mybalance: received address "'+address+'"');
			
			back.send('debug-info','main.mybalance: transaction.findAccount');
			let acc = transaction_1.findAccount(address, accounts);
			
			if (acc == undefined) {
				back.send('debug-warn','main.mybalance: account not found');
				back.send('status-update','No account found');
			} else {
				back.send('status-update','Account balance: '+acc.balance);
				back.send('my-account-balance', String(acc.balance));
			}
		} catch(e) {
			back.send('debug-error','main.mybalance: Error getting accounts: '+e.message);
		}
		
		back.send('debug-info','/main.mybalance');
	});


	// Check User Address
	// myaddress follows dew server convention
	back.on('myaddress', function(ignored){
		back.send('debug-info','main.myaddress()');
		
		back.send('status-update','Getting your address');
		
		try {
			back.send('debug-info','main.myaddress: wallet.getPublicFromWallet()');
			const address = wallet_1.getPublicFromWallet();
			back.send('debug-info','main.myaddress: received address "'+address+'"');
			
			if (address) {
				back.send('status-update','Address found');
				back.send('my-address', String(address));
			} else {
				back.send('debug-warn','main.myaddress: address not found');
				back.send('status-update','No address found');
			}
		} catch(e) {
			back.send('debug-error','main.myaddress: Error getting address: '+e.message);
		}
		
		back.send('debug-info','/main.myaddress');
	});


	// Mine a block
	// mineBlock follows dew server convention
	back.on('mineBlock', function(ignored){
		back.send('debug-info','main.mineBlock()');
		
		back.send('status-update','Generating block');
		
		try {
			back.send('debug-info','main.mineBlock: blockchain.generateNextBlock()');
			const newBlock = blockchain_1.generateNextBlock();
			
			if (newBlock === null) {
				back.send('debug-warn','main.mineBlock: new block null');
				back.send('status-update','Could not generate block');
			} else {
				back.send('status-update','Block mined');
				back.send('mined-block-data', newBlock); // May need JSON.stringify(newBlock)
			}
		} catch(e) {
			back.send('debug-error','main.mineBlock: Error mininening block: '+e.message);
		}
		
		back.send('debug-info','/main.mineBlock');
	});


	// Generate block from raw data
	// mineRawBlock follows dew server convention
	back.on('mineRawBlock', function(blockData){
		back.send('debug-info','main.mineRawBlock('+blockData+')');
		
		if (blockData == null) {
			back.send('status-update','Block data parameter is missing');
			back.send('debug-info','/main.mineRawBlock');
			return;
		}
		
		back.send('status-update','Generating block');
		
		try {
			back.send('debug-info','main.mineRawBlock: blockchain.generateRawNextBlock(...)');
			const newBlock = blockchain_1.generateRawNextBlock(blockData);
			
			if (newBlock === null) {
				back.send('debug-warn','main.mineRawBlock: new block null');
				back.send('status-update','Could not generate block');
			} else {
				back.send('status-update','Block mined');
				back.send('raw-mined-block-data', newBlock); // May need JSON.stringify(newBlock)
			}
		} catch(e) {
			back.send('debug-error','main.mineRawBlock: Error generating block: '+e.message);
		}
		
		back.send('debug-info','/main.mineRawBlock');
	});


	// Generate block with transaction
	// mineTransaction follows dew server convention
	back.on('mineTransaction', function(data){
		back.send('debug-info','main.mineTransaction('+data+')');
		
		if (data == null) {
			back.send('status-update','Parameters missing');
			back.send('debug-info','/main.mineTransaction');
			return;
		}
		
		try {
			back.send('debug-info','main.mineTransaction: JSON.parse(...)');
			const parsedData = JSON.parse(data);
			const address = parsedData.address;
			const amount = parsedData.amount;
			if (address === undefined || amount === undefined) {
				back.send('debug-error','main.mineTransaction: Invalid address or amount');
				return;
			}
			
			back.send('debug-info','main.mineTransaction: blockchain.generateRawNextBlockWithTransaction('+address+', '+amount+')');
			const newBlock = blockchain_1.generatenextBlockWithTransaction(address, amount);
			
			if (newBlock === null) {
				back.send('debug-warn','main.mineTransaction: new block null');
				back.send('status-update','Could not generate block');
			} else {
				back.send('status-update','Block mined');
				back.send('transaction-mined-block-data', String(newBlock));
			}
		} catch(e) {
			back.send('debug-error','main.mineTransaction: Error generating block: '+e.message);
		}
		
		back.send('debug-info','/main.mineTransaction');
	});


	// Mine block in cloud
	// mineInCloud follows dew server convention
	back.on('mineInCloud', function(ignored){
		back.send('debug-info','main.mineInCloud()');
		
		back.send('status-update','Attempting to mine block in the cloud');
		
		try {
			back.send('debug-info','main.mineInCloud: blockchain.mineInCloud()');
			const newBlock = blockchain_1.mineInCloud();
			back.send('status-update','Mining block in the cloud');
		} catch(e) {
			back.send('debug-error','main.mineInCloud: Error generating block: '+e.message);
		}
		
		back.send('debug-info','/main.mineInCloud');
	});


	// Find transaction by id
	// transaction follows dew server convention
	back.on('transaction',function(id){
		back.send('debug-info','main.transaction('+id+')');
		
		back.send('status-update','Getting requested transaction');
		
		try {
			back.send('debug-info','main.transaction: blockchain.getBlockchain()');
			const blockchain = blockchain_1.getBlockchain();
			
			back.send('debug-info','main.transaction: lodash.find: locating transaction');
			const tx = _(blockchain_1.getBlockchain())
					.map((blocks) => blocks.data)
					.flatten()
					.find({ 'id': id });
			if (tx) {
				back.send('status-update','Transaction found');
				back.send('transaction-data', tx); // May need JSON.stringify(tx)
			} else {
				back.send('status-update','Transaction not found');
			}
		} catch(e) {
			back.send('debug-error','main.transaction: Error getting transaction: '+e.message);
		}
		
		back.send('debug-info','/main.transaction');
	});


	// Send transaction
	// sendTransaction follows dew server convention
	back.on('sendTransaction', function(data){
		back.send('debug-info','main.sendTransaction('+data+')');
		
		if (data == null) {
			back.send('status-update','Parameters missing');
			back.send('debug-info','/main.sendTransaction');
			return;
		}
		
		try {
			back.send('debug-info','main.sendTransaction: JSON.parse(...)');
			const parsedData = JSON.parse(data);
			const address = parsedData.address;
			const amount = parsedData.amount;
			if (address === undefined || amount === undefined) {
				back.send('debug-error','main.mineTransaction: Invalid address or amount');
				return;
			}
			
			back.send('debug-info','main.sendTransaction: blockchain.sendTransaction('+address+', '+amount+')');
			const response = blockchain_1.sendTransaction(address, amount);
			back.send('status-update','Response to sent transaction: '+response);
			back.send('sent-transaction-response', String(response));
		} catch(e) {
			back.send('debug-error','main.sendTransaction: Error with send transaction: '+e.message);
		}
		
		back.send('debug-info','/main.sendTransaction');
	});


	// Transaction pool
	// transactionpool follows dew server convention
	back.on('transactionpool',function(ignored){
		back.send('debug-info','main.transactionpool()');
		
		back.send('status-update','Getting blockchain');
		
		try {
			back.send('debug-info','main.transactionpool: transactionPool.getTransactionPool()');
			const transactionpool = transactionPool_1.getTransactionPool();
			back.send('status-update','Transaction Pool received');
			back.send('transactionpool-data', transactionpool); // May need JSON.stringify(transactionpool)
		} catch(e) {
			back.send('debug-error','main.transactionpool: Error getting transaction pool: '+e.message);
		}
		
		back.send('debug-info','/main.transactionpool');
	});


	// Get all peers
	// peers follows dew server convention
	back.on('peers',function(ignored){
		back.send('debug-info','main.peers()');
		
		back.send('status-update','Getting peers');
		
		try {
			back.send('debug-info','main.peers: p2p_1.getSockets().map(...)');
			const peers = p2p_1.getSockets()
				.map((s) => s._socket.remoteAddress + ':' + s._socket.remotePort)
			back.send('status-update','Peers received');
			back.send('peers-data', peers); // May need JSON.stringify(peers)
		} catch(e) {
			back.send('debug-error','main.peers: Error getting peers: '+e.message);
		}
		
		back.send('debug-info','/main.peers');
	});


	// Add peer
	// addpeer follows dew server convention
	back.on('addpeer',function(peer){
		back.send('debug-info','main.addpeer('+peer+')');
		
		back.send('status-update','Adding peers');
		
		try {
			back.send('debug-info','main.addpeer: p2p.connectToPeers(...)');
			p2p_1.connectToPeers(peer);
			back.send('status-update','Peer added');
		} catch(e) {
			back.send('debug-error','main.addpeer: Error adding peers: '+e.message);
		}
		
		back.send('debug-info','/main.addpeer');
	});
	
	back.send('report-result',{'type':'init-delayed', 'result':'success'});
} catch(e) {
	back.send('report-result',{'type':'init-delayed', 'result':'fail'});
	back.send('debug-error','main: Major Error: '+e.message);
	back.send('debug-error','main: Major Error: '+e.toString());
	back.send('debug-error','main: Major Error: '+e.fileName);
	back.send('debug-error','main: Major Error: '+e.lineNumber);
	back.send('debug-error','main: Major Error: '+e.stack);
}
})

/* Following code is exactly there. I changed them
// //const httpPort = parseInt(process.env.HTTP_PORT) || 3001;
// //const p2pPort = parseInt(process.env.P2P_PORT) || 6001;
// /*const initHttpServer = (myHttpPort) => {
//     const app = express();
//     app.use(bodyParser.json());
//     app.use((err, req, res, next) => {
//         if (err) {
//             res.status(400).send(err.message);
//         }
//     });
//     app.get('/setmodelocal', (req, res) => {
//         p2p_1.setModeLocal();
//         mode = config_1.getMode();
//         res.send('The system is in ' + mode + ' mode.');
//     });
//     app.get('/setmodedew', (req, res) => {
//         p2p_1.setModeDew();
//         mode = config_1.getMode();
//         res.send('The system is in ' + mode + ' mode.');
//     });
//     app.get('/fetchAccounts', (req, res) => {
//         //This one should not be available in local mode.
//         p2p_1.fetchAccounts();
//         res.send('Accounts fetch requested.');
//     });
//     app.get('/blocks', (req, res) => {
//         mode = config_1.getMode();
//         //if(mode == 'local'){
//         res.send(blockchain_1.getBlockchain());
//         //}else if(mode == 'dew'){
//         //     res.send('This request is not available in dew mode.');
//         //}
//     });
//     app.get('/block/:hash', (req, res) => {
//         const block = _.find(blockchain_1.getBlockchain(), { 'hash': req.params.hash });
//         res.send(block);
//     });
//     app.get('/transaction/:id', (req, res) => {
//         const tx = _(blockchain_1.getBlockchain())
//             .map((blocks) => blocks.data)
//             .flatten()
//             .find({ 'id': req.params.id });
//         res.send(tx);
//     });
//     /*
//     app.get('/address/:address', (req, res) => {
//         const unspentTxOuts: UnspentTxOut[] =
//             _.filter(getUnspentTxOuts(), (uTxO) => uTxO.address === req.params.address);
//         res.send({'unspentTxOuts': unspentTxOuts});
//     });
//     */
//     app.get('/account/:address', (req, res) => {
//         let acc = transaction_1.findAccount(req.params.address, blockchain_1.getAccounts());
//         if (acc == undefined) {
//             res.send({ 'Error:': "address is wrong" });
//         }
//         res.send({ 'Account': acc });
//     });
//     /*
//     app.get('/unspentTransactionOutputs', (req, res) => {
//         res.send(getUnspentTxOuts());
//     });
//     */
//     //display all accounts
//     app.get('/accounts', (req, res) => {
//         res.send(blockchain_1.getAccounts());
//     });
//     /*
//     app.get('/myUnspentTransactionOutputs', (req, res) => {
//         res.send(getMyUnspentTransactionOutputs());
//     });
//     */
//     app.get('/myaccount', (req, res) => {
//         let acc = transaction_1.findAccount(wallet_1.getPublicFromWallet(), blockchain_1.getAccounts());
//         if (acc == undefined) {
//             res.send({ 'Error': 'No account was found.' });
//         }
//         else {
//             res.send({ 'My Account': acc });
//         }
//     });
//     app.post('/mineRawBlock', (req, res) => {
//         if (req.body.data == null) {
//             res.send('data parameter is missing');
//             return;
//         }
//         const newBlock = blockchain_1.generateRawNextBlock(req.body.data);
//         if (newBlock === null) {
//             res.status(400).send('could not generate block');
//         }
//         else {
//             res.send(newBlock);
//         }
//     });
//     app.post('/mineBlock', (req, res) => {
//         const newBlock = blockchain_1.generateNextBlock();
//         if (newBlock === null) {
//             res.status(400).send('could not generate block');
//         }
//         else {
//             res.send(newBlock);
//         }
//     });
//     app.post('/mineInCloud', (req, res) => {
//         blockchain_1.mineInCloud();
//         res.send();
//     });
//     app.get('/mybalance', (req, res) => {
//         let acc = transaction_1.findAccount(wallet_1.getPublicFromWallet(), blockchain_1.getAccounts());
//         if (acc == undefined) {
//             res.send({ 'Error:': "No such account." });
//         }
//         else {
//             res.send({ 'Balance': acc.balance });
//         }
//     });
//     app.get('/myaddress', (req, res) => {
//         const address = wallet_1.getPublicFromWallet();
//         res.send({ 'address': address });
//     });
//     app.post('/mineTransaction', (req, res) => {
//         const address = req.body.address;
//         const amount = req.body.amount;
//         try {
//             const resp = blockchain_1.generatenextBlockWithTransaction(address, amount);
//             res.send(resp);
//         }
//         catch (e) {
//             console.log(e.message);
//             res.status(400).send(e.message);
//         }
//     });
//     app.post('/sendTransaction', (req, res) => {
//         try {
//             const address = req.body.address;
//             const amount = req.body.amount;
//             if (address === undefined || amount === undefined) {
//                 throw Error('invalid address or amount');
//             }
//             const resp = blockchain_1.sendTransaction(address, amount);
//             res.send(resp);
//         }
//         catch (e) {
//             console.log(e.message);
//             res.status(400).send(e.message);
//         }
//     });
//     app.get('/transactionpool', (req, res) => {
//         res.send(transactionPool_1.getTransactionPool());
//     });
//     app.get('/peers', (req, res) => {
//         res.send(p2p_1.getSockets().map((s) => s._socket.remoteAddress + ':' + s._socket.remotePort));
//     });
//     app.post('/addpeer', (req, res) => {
//         p2p_1.connectToPeers(req.body.peer);
//         res.send();
//     });
//     app.post('/stop', (req, res) => {
//         res.send({ 'msg': 'stopping server' });
//         process.exit();
//     });
//     app.listen(myHttpPort, () => {
//         console.log('Listening http on port: ' + myHttpPort);
//     });
// };
// initHttpServer(httpPort);
// p2p_1.initP2PServer(p2pPort);
// wallet_1.initWallet();
// //# sourceMappingURL=main.js.map