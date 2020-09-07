"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const back = require('androidjs').back;

//try {
	const CryptoJS = require("crypto-js");
	const ecdsa = require("elliptic");
	const _ = require("lodash");
	//dewcoin
	const blockchain_1 = require("./blockchain");
	const transactionPool_1 = require("./transactionPool"); //debug
	const ec = new ecdsa.ec('secp256k1');
	const COINBASE_AMOUNT = 50;
	//dewcoin
	const ACCOUNT_ACTIVE_PERIOD = 60 * 60 * 24 * 31; //31 days.
	const ACCOUNT_PURGE_PERIOD = 60 * 60 * 24 * 32; //32 days.


	class Account {
		constructor(address) {
			this.address = address;
			this.balance = 0;
			this.available = 0;
			this.txHistory = [];
		}
	}
	exports.Account = Account;


	class Transaction {
		constructor(sender, receiver, amount) {
			this.sender = sender;
			this.receiver = receiver;
			this.amount = amount;
		}
	}
	exports.Transaction = Transaction;
	class TxHistory {
		constructor(txAccount, amount) {
			this.txAccount = txAccount;
			this.amount = amount;
		}
	}
	const existAccount = (address, accounts) => {
		//console.log('address: ' + address);
		//console.log('accounts: '+ JSON.stringify(accounts));
		return _(accounts).map((acc) => acc.address).includes(address);
	};
	exports.existAccount = existAccount;
	const createAccount = (address, accounts) => {
		let acc = new Account(address);
		accounts.push(acc);
		return true;
	};
	exports.createAccount = createAccount;
	const findAccount = (address, accounts) => {
		let account = _.find(accounts, (acc) => { return acc.address == address; });
		return account;
	};
	exports.findAccount = findAccount;


	const getTransactionId = (transaction) => {
		return CryptoJS.SHA256(transaction.sender + transaction.receiver + transaction.amount + transaction.timestamp).toString();
	};
	exports.getTransactionId = getTransactionId;


	const validateTransaction = (transaction, accounts) => {
		if (!isValidTransactionStructure(transaction)) {
			return false;
		}
		if (getTransactionId(transaction) !== transaction.id) {
			console.log('validateTransaction: invalid tx id: ' + transaction.id);
			console.log(getTransactionId(transaction));
			return false;
		}
		const hasValidSignature = validateSignature(transaction);
		if (!hasValidSignature) {
			console.log('The signature is invalid in tx: ' + transaction.id);
			return false;
		}
		if (transaction.timestamp < (blockchain_1.getCurrentTimestamp() - ACCOUNT_ACTIVE_PERIOD)) {
			console.log('The transaction is too old. tx: ' + transaction.id);
			return false;
		}
		let accSender = findAccount(transaction.sender, accounts);
		if (accSender == undefined) {
			console.log('validateTransaction: no account found.');
			return false;
		}
		if (_(accSender.txHistory).map((th) => { return th.id; }).includes(transaction.id)) {
			console.log(JSON.stringify(transactionPool_1.getTransactionPool()));
			console.log('validateTransaction: The transaction is duplicated with the chain. tx: ' + transaction.id);
			console.log(JSON.stringify(accSender.txHistory));
			return false;
		}
		return true;
	};
	exports.validateTransaction = validateTransaction;


	const validateBlockTransactions = (aTransactions, accounts) => {
		let accSender;
		const coinbaseTx = aTransactions[0];
		if (!validateCoinbaseTx(coinbaseTx)) {
			console.log('invalid coinbase transaction: ' + JSON.stringify(coinbaseTx));
			return false;
		}
		const txIds = _(aTransactions)
			.map((tx) => tx.id)
			.value();
		if (hasDuplicates(txIds)) {
			console.log('Transactions in block are duplicated.');
			return false;
		}
		for (let i = 0; i < accounts.length; i++) {
			accounts[i].available = accounts[i].balance;
		}
		for (let j = 1; j < aTransactions.length; j++) {
			accSender = findAccount(aTransactions[j].sender, accounts);
			if (accSender == undefined) {
				console.log('validateBlockTransactions: no account found.');
				return false;
			}
			if (aTransactions[j].amount > accSender.available) {
				console.log('The sender does not have enough coins. tx: ' + aTransactions[j].id);
				return false;
			}
			accSender.available -= aTransactions[j].amount;
		}
		// all but coinbase transactions
		const normalTransactions = aTransactions.slice(1);
		return normalTransactions.map((tx) => validateTransaction(tx, accounts))
			.reduce((a, b) => (a && b), true);
	};


	const hasDuplicates = (names) => {
		const groups = _.countBy(names);
		return _(groups)
			.map((value, key) => {
			if (value > 1) {
				console.log('duplicate string: ' + key);
				return true;
			}
			else {
				return false;
			}
		})
			.includes(true);
	};
	exports.hasDuplicates = hasDuplicates;


	const validateCoinbaseTx = (transaction) => {
		if (transaction == null) {
			console.log('the first transaction in the block must be coinbase transaction');
			return false;
		}
		if (getTransactionId(transaction) !== transaction.id) {
			console.log('invalid coinbase tx id: ' + transaction.id);
			return false;
		}
		if (transaction.sender !== "coinbase") {
			console.log('It is not a coinbase transaction');
			return;
		}
		if (transaction.amount !== COINBASE_AMOUNT) {
			console.log('invalid coinbase amount in coinbase transaction');
			return false;
		}
		return true;
	};


	const validateSignature = (transaction) => {
		const key = ec.keyFromPublic(transaction.sender, 'hex');
		const validSignature = key.verify(transaction.id, transaction.signature);
		if (!validSignature) {
			console.log('invalid tx signature: %s txId: %s address: %s', transaction.signature, transaction.id, transaction.sender);
			return false;
		}
		return true;
	};


	const getCoinbaseTransaction = (miner) => {
		back.send('debug-info', "blockchain.getCoinbaseTransaction() gets called");

		const t = new Transaction("coinbase", miner, COINBASE_AMOUNT);
		t.timestamp = blockchain_1.getCurrentTimestamp();
		t.id = getTransactionId(t);
		t.signature = '';
		back.send('debug-info', "blockchain_1. getCoinbaseTransaction() done successfully");
		return t;
	};
	exports.getCoinbaseTransaction = getCoinbaseTransaction;


	const signTransaction = (transaction, privateKey) => {
		const dataToSign = transaction.id;
		if (getPublicKey(privateKey) !== transaction.sender) {
			console.log('trying to sign an input with private' +
				' key that does not match the address');
			throw Error();
		}
		const key = ec.keyFromPrivate(privateKey, 'hex');
		const signature = toHexString(key.sign(dataToSign).toDER());
		return signature;
	};
	exports.signTransaction = signTransaction;


	const updateAccounts = (aTransactions, accounts) => {
		let amt;
		let thSender;
		let thReceiver;
		let accSender;
		let accReceiver;
		let now;
		for (let i = 0; i < aTransactions.length; i++) {
			amt = aTransactions[i].amount;
			now = blockchain_1.getCurrentTimestamp();
			if (aTransactions[i].sender !== "coinbase") {
				if (!existAccount(aTransactions[i].sender, accounts)) {
					createAccount(aTransactions[i].sender, accounts);
				}
				accSender = findAccount(aTransactions[i].sender, accounts);
				if (accSender == undefined) {
					console.log('updateAccounts: no account found.');
					return undefined;
				}
				thSender = new TxHistory(aTransactions[i].receiver, -amt);
				thSender.id = aTransactions[i].id;
				thSender.timestamp = aTransactions[i].timestamp;
				thSender.prevBalance = accSender.balance;
				accSender.balance -= amt;
				accSender.available = accSender.balance;
				thSender.afterBalance = accSender.balance;
				accSender.txHistory = _(accSender.txHistory).filter((th) => { return (th.timestamp < (now + ACCOUNT_PURGE_PERIOD)); }).push(thSender).value();
				//clean txHistory at the same time.
			}
			if (!existAccount(aTransactions[i].receiver, accounts)) {
				createAccount(aTransactions[i].receiver, accounts);
			}
			accReceiver = findAccount(aTransactions[i].receiver, accounts);
			if (accReceiver == undefined) {
				console.log('validateTransaction: no account found.');
				return undefined;
			}
			thReceiver = new TxHistory(aTransactions[i].sender, amt);
			thReceiver.id = aTransactions[i].id;
			thReceiver.timestamp = aTransactions[i].timestamp;
			thReceiver.prevBalance = accReceiver.balance;
			accReceiver.balance += amt;
			accReceiver.available = accReceiver.balance;
			thReceiver.afterBalance = accReceiver.balance;
			accReceiver.txHistory = _(accReceiver.txHistory).filter((th) => { return (th.timestamp < (now + ACCOUNT_PURGE_PERIOD)); }).push(thReceiver).value();
			//clean txHistory at the same time.
		}
		return accounts; //check again
	};


	const processTransactions = (aTransactions, accounts) => {
		if (!validateBlockTransactions(aTransactions, accounts)) {
			console.log('invalid block transactions');
			return null;
		}
		return updateAccounts(aTransactions, accounts);
	};
	exports.processTransactions = processTransactions;
	const toHexString = (byteArray) => {
		return Array.from(byteArray, (byte) => {
			return ('0' + (byte & 0xFF).toString(16)).slice(-2);
		}).join('');
	};
	const getPublicKey = (aPrivateKey) => {
		return ec.keyFromPrivate(aPrivateKey, 'hex').getPublic().encode('hex');
	};
	exports.getPublicKey = getPublicKey;


	const isValidTransactionStructure = (transaction) => {
		if (typeof transaction.id !== 'string') {
			console.log('transactionId missing');
			return false;
		}
		if (typeof transaction.sender !== 'string') {
			console.log('transaction sender missing');
			return false;
		}
		if (typeof transaction.receiver !== 'string') {
			console.log('transaction receiver missing');
			return false;
		}
		if (typeof transaction.amount !== 'number') {
			console.log('transaction amount missing');
			return false;
		}
		if (typeof transaction.timestamp !== 'number') {
			console.log('transaction timestamp missing');
			return false;
		}
		if (typeof transaction.signature !== 'string') {
			console.log('transaction signature missing');
			return false;
		}
		return true;
	};
	// valid address is a valid ecdsa public key in the 04 + X-coordinate + Y-coordinate format
	const isValidAddress = (address) => {
		if (address.length !== 130) {
			console.log(address);
			console.log('invalid public key length');
			return false;
		}
		else if (address.match('^[a-fA-F0-9]+$') === null) {
			console.log('public key must contain only hex characters');
			return false;
		}
		else if (!address.startsWith('04')) {
			console.log('public key must start with 04');
			return false;
		}
		return true;
	};
	exports.isValidAddress = isValidAddress;
	//# sourceMappingURL=transaction.js.map
// } catch(e) {
// 	back.send('debug-error','transaction: Major Error: '+e.message);
// }