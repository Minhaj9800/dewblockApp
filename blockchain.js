"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const back = require('androidjs').back;

try {
	const CryptoJS = require("crypto-js");
	const _ = require("lodash");
	const p2p_1 = require("./p2p");
	const transaction_1 = require("./transaction");
	const transactionPool_1 = require("./transactionPool");
	const util_1 = require("./util");
	const wallet_1 = require("./wallet");
	//dewcoin
	const config_1 = require("./config");
	let mode;
	class Block {
		constructor(index, hash, previousHash, timestamp, data, difficulty, nonce) {
			this.index = index;
			this.previousHash = previousHash;
			this.timestamp = timestamp;
			this.data = data;
			this.hash = hash;
			this.difficulty = difficulty;
			this.nonce = nonce;
		}
	}
	exports.Block = Block;
	const getCurrentTimestamp = () => Math.round(new Date().getTime() / 1000);
	exports.getCurrentTimestamp = getCurrentTimestamp;
	/*
	const genesisTransaction = {
		'txIns': [{'signature': '', 'txOutId': '', 'txOutIndex': 0}],
		'txOuts': [{
			'address': '04bfcab8722991ae774db48f934ca79cfb7dd991229153b9f732ba5334aafcd8e7266e47076996b55a14bf9913ee3145ce0cfc1372ada8ada74bd287450313534a',
			'amount': 50
		}],
		'id': 'e655f6a5f26dc9b4cac6e46f52336428287759cf81ef5ff10854f69d68f43fa3'
	};
	*/
	const genesisTransaction = new transaction_1.Transaction('coinbase', '04c0a0903203a721fa43581cc53c9361862e2e5522310909fbfbf14203371c464f5bdbba42e16349e237e1adf65952d8301e071a40a76b1709954c8f0e3f253b2c', 50);
	genesisTransaction.timestamp = 1533641911;
	genesisTransaction.id = transaction_1.getTransactionId(genesisTransaction);
	genesisTransaction.signature = '';
	/*
	const genesisBlock: Block = new Block(
		0, '91a73664bc84c0baa1fc75ea6e4aa6d1d20c5df664c724e3159aefc2e1186627', '', 1465154705, [genesisTransaction], 0, 0
	);
	*/
	const genesisBlock = new Block(0, '91a73664bc84c0baa1fc75ea6e4aa6d1d20c5df664c724e3159aefc2e1186627', '', 1533641911, [genesisTransaction], 0, 0);
	let blockchain = [genesisBlock];
	const getBlockchain = () => blockchain;
	exports.getBlockchain = getBlockchain;
	//dewcoin
	const resetBlockchain = () => { blockchain = [genesisBlock]; };
	exports.resetBlockchain = resetBlockchain;
	// the unspent txOut of genesis block is set to unspentTxOuts on startup
	//let unspentTxOuts: UnspentTxOut[] = processTransactions(blockchain[0].data, []);
	let accounts = transaction_1.processTransactions(blockchain[0].data, []);
	//const getUnspentTxOuts = (): UnspentTxOut[] => _.cloneDeep(unspentTxOuts);
	//const getAccounts = (): Account[] => _.cloneDeep(accounts);
	const getAccounts = () => accounts;
	exports.getAccounts = getAccounts;
	// and txPool should be only updated at the same time
	/*
	const setUnspentTxOuts = (newUnspentTxOut: UnspentTxOut[]) => {
		console.log('replacing unspentTxouts with: %s', newUnspentTxOut);
		unspentTxOuts = newUnspentTxOut;
	};
	*/
	const setAccounts = (newAccounts) => {
		//console.log('replacing accounts with: %s', newAccounts);
		accounts = newAccounts;
	};
	exports.setAccounts = setAccounts;
	//dewcoin
	let theLatestBlock = genesisBlock;
	let previousAdjustBlock = genesisBlock;
	let accuDiff = 1;
	//const getLatestBlock = (): Block => blockchain[blockchain.length - 1];
	const getLatestBlock = () => {
		mode = config_1.getMode();
		if (mode == 'local') {
			return blockchain[blockchain.length - 1];
		}
		else if (mode == 'dew') {
			return theLatestBlock;
		}
	};
	exports.getLatestBlock = getLatestBlock;
	// in seconds
	const BLOCK_GENERATION_INTERVAL = 10;
	// in blocks
	const DIFFICULTY_ADJUSTMENT_INTERVAL = 10;
	const getDifficulty = (aBlockchain) => {
		const latestBlock = aBlockchain[blockchain.length - 1];
		if (latestBlock.index % DIFFICULTY_ADJUSTMENT_INTERVAL === 0 && latestBlock.index !== 0) {
			return getAdjustedDifficulty(latestBlock, aBlockchain);
		}
		else {
			return latestBlock.difficulty;
		}
	};
	const getDifficultyChain1 = () => {
		if (theLatestBlock.index % DIFFICULTY_ADJUSTMENT_INTERVAL === 0 && theLatestBlock.index !== 0) {
			return getAdjustedDifficultyChain1(theLatestBlock);
		}
		else {
			return theLatestBlock.difficulty;
		}
	};
	const getAdjustedDifficulty = (latestBlock, aBlockchain) => {
		const prevAdjustmentBlock = aBlockchain[blockchain.length - DIFFICULTY_ADJUSTMENT_INTERVAL];
		const timeExpected = BLOCK_GENERATION_INTERVAL * DIFFICULTY_ADJUSTMENT_INTERVAL;
		const timeTaken = latestBlock.timestamp - prevAdjustmentBlock.timestamp;
		if (timeTaken < timeExpected / 2) {
			return prevAdjustmentBlock.difficulty + 1;
		}
		else if (timeTaken > timeExpected * 2) {
			return prevAdjustmentBlock.difficulty - 1;
		}
		else {
			return prevAdjustmentBlock.difficulty;
		}
	};
	const getAdjustedDifficultyChain1 = (latestBlock) => {
		const prevAdjustmentBlock = previousAdjustBlock;
		const timeExpected = BLOCK_GENERATION_INTERVAL * DIFFICULTY_ADJUSTMENT_INTERVAL;
		const timeTaken = latestBlock.timestamp - prevAdjustmentBlock.timestamp;
		if (timeTaken < timeExpected / 2) {
			return prevAdjustmentBlock.difficulty + 1;
		}
		else if (timeTaken > timeExpected * 2) {
			return prevAdjustmentBlock.difficulty - 1;
		}
		else {
			return prevAdjustmentBlock.difficulty;
		}
	};
	/*
	const generateRawNextBlock = (blockData: Transaction[]) => {
		const previousBlock: Block = getLatestBlock();
		const difficulty: number = getDifficulty(getBlockchain());
		const nextIndex: number = previousBlock.index + 1;
		const nextTimestamp: number = getCurrentTimestamp();
		const newBlock: Block = findBlock(nextIndex, previousBlock.hash, nextTimestamp, blockData, difficulty);
		if (addBlockToChain(newBlock)) {
			broadcastLatest();
			return newBlock;
		} else {
			return null;
		}

	};
	*/
	const generateRawNextBlock = (blockData) => {
		const previousBlock = getLatestBlock();
		let difficulty;
		mode = config_1.getMode();
		if (mode == 'local') {
			difficulty = getDifficulty(getBlockchain());
		}
		else if (mode == 'dew') {
			difficulty = getDifficultyChain1();
		}
		const nextIndex = previousBlock.index + 1;
		const nextTimestamp = getCurrentTimestamp();
		const newBlock = findBlock(nextIndex, previousBlock.hash, nextTimestamp, blockData, difficulty);
		if (addBlockToChain(newBlock)) {
			p2p_1.broadcastLatest();
			return newBlock;
		}
		else {
			return null;
		}
	};
	exports.generateRawNextBlock = generateRawNextBlock;
	const generateRawNextBlockInCloud = (blockData) => {
		const previousBlock = getLatestBlock();
		let difficulty;
		mode = config_1.getMode();
		if (mode == 'local') {
			difficulty = getDifficulty(getBlockchain());
		}
		else if (mode == 'dew') {
			difficulty = getDifficultyChain1();
		}
		const nextIndex = previousBlock.index + 1;
		const nextTimestamp = getCurrentTimestamp();
		const newBlock = new Block(nextIndex, '', previousBlock.hash, nextTimestamp, blockData, difficulty, 0);
		p2p_1.sendMiningRequest(newBlock);
	};
	// gets the unspent transaction outputs owned by the wallet
	/*
	const getMyUnspentTransactionOutputs = () => {
		return findUnspentTxOuts(getPublicFromWallet(), getUnspentTxOuts());
	};
	*/
	const getMyAccount = () => {
		return transaction_1.findAccount(wallet_1.getPublicFromWallet(), getAccounts());
	};
	exports.getMyAccount = getMyAccount;
	/*
	const generateNextBlock = () => {
		const coinbaseTx: Transaction = getCoinbaseTransaction(getPublicFromWallet(), getLatestBlock().index + 1);
		const blockData: Transaction[] = [coinbaseTx].concat(getTransactionPool());
		return generateRawNextBlock(blockData);
	};
	*/
	const generateNextBlock = () => {
		back.send('debug-info', "blockchain_1.generateNextBlock() gets intialized");
		const coinbaseTx = transaction_1.getCoinbaseTransaction(wallet_1.getPublicFromWallet());
		back.send('debug-info', "coinbaseTX is okay");
		const blockData = [coinbaseTx].concat(transactionPool_1.getTransactionPool());
		back.send('debug-info', "blockdata is okay");
		back.send('debug-info', "generateNextBlock() return generateRawNextBlocked()");
		return generateRawNextBlock(blockData);
	};
	exports.generateNextBlock = generateNextBlock;
	const mineInCloud = () => {
		const coinbaseTx = transaction_1.getCoinbaseTransaction(wallet_1.getPublicFromWallet());
		const blockData = [coinbaseTx].concat(transactionPool_1.getTransactionPool());
		generateRawNextBlockInCloud(blockData);
	};
	exports.mineInCloud = mineInCloud;
	/*
	const generatenextBlockWithTransaction = (receiverAddress: string, amount: number) => {
		if (!isValidAddress(receiverAddress)) {
			throw Error('invalid address');
		}
		if (typeof amount !== 'number') {
			throw Error('invalid amount');
		}
		const coinbaseTx: Transaction = getCoinbaseTransaction(getPublicFromWallet(), getLatestBlock().index + 1);
		const tx: Transaction = createTransaction(receiverAddress, amount, getPrivateFromWallet(), getUnspentTxOuts(), getTransactionPool());
		const blockData: Transaction[] = [coinbaseTx, tx];
		return generateRawNextBlock(blockData);
	};
	*/
	const generatenextBlockWithTransaction = (receiverAddress, amount) => {
		let blockData;
		if (!transaction_1.isValidAddress(receiverAddress)) {
			throw Error('invalid address');
		}
		if (typeof amount !== 'number') {
			throw Error('invalid amount');
		}
		const coinbaseTx = transaction_1.getCoinbaseTransaction(wallet_1.getPublicFromWallet());
		const tx = wallet_1.createTransaction(receiverAddress, amount, wallet_1.getPrivateFromWallet(), getAccounts(), transactionPool_1.getTransactionPool());
		if (tx == undefined) {
			blockData = [coinbaseTx];
			console.log('The transaction is invalid. The block was mined.');
		}
		else {
			blockData = [coinbaseTx, tx];
		}
		return generateRawNextBlock(blockData);
	};
	exports.generatenextBlockWithTransaction = generatenextBlockWithTransaction;
	const findBlock = (index, previousHash, timestamp, data, difficulty) => {
		let nonce = 0;
		while (true) {
			const hash = calculateHash(index, previousHash, timestamp, data, difficulty, nonce);
			if (hashMatchesDifficulty(hash, difficulty)) {
				return new Block(index, hash, previousHash, timestamp, data, difficulty, nonce);
			}
			nonce++;
		}
	};
	/*
	const getAccountBalance = (): number => {
		return getBalance(getPublicFromWallet(), getUnspentTxOuts());
	};
	*/
	const getAccountBalance = () => {
		return wallet_1.getBalance(wallet_1.getPublicFromWallet(), getAccounts());
	};
	exports.getAccountBalance = getAccountBalance;
	/*
	const sendTransaction = (address: string, amount: number): Transaction => {
		const tx: Transaction = createTransaction(address, amount, getPrivateFromWallet(), getUnspentTxOuts(), getTransactionPool());
		addToTransactionPool(tx, getUnspentTxOuts());
		broadCastTransactionPool();
		return tx;
	};
	*/
	const sendTransaction = (address, amount) => {
		const tx = wallet_1.createTransaction(address, amount, wallet_1.getPrivateFromWallet(), getAccounts(), transactionPool_1.getTransactionPool());
		if (tx == undefined) {
			console.log('This transaction cannot be created.');
			return undefined;
		}
		else {
			transactionPool_1.addToTransactionPool(tx, getAccounts());
			p2p_1.broadCastTransactionPool();
			return tx;
		}
	};
	exports.sendTransaction = sendTransaction;
	const calculateHashForBlock = (block) => calculateHash(block.index, block.previousHash, block.timestamp, block.data, block.difficulty, block.nonce);
	const calculateHash = (index, previousHash, timestamp, data, difficulty, nonce) => CryptoJS.SHA256(index + previousHash + timestamp + data + difficulty + nonce).toString();
	const isValidBlockStructure = (block) => {
		return typeof block.index === 'number'
			&& typeof block.hash === 'string'
			&& typeof block.previousHash === 'string'
			&& typeof block.timestamp === 'number'
			&& typeof block.data === 'object';
	};
	exports.isValidBlockStructure = isValidBlockStructure;
	const isValidNewBlock = (newBlock, previousBlock) => {
		if (!isValidBlockStructure(newBlock)) {
			console.log('invalid block structure: %s', JSON.stringify(newBlock));
			return false;
		}
		if (previousBlock.index + 1 !== newBlock.index) {
			console.log('invalid index');
			return false;
		}
		else if (previousBlock.hash !== newBlock.previousHash) {
			console.log('invalid previoushash');
			return false;
		}
		else if (!isValidTimestamp(newBlock, previousBlock)) {
			console.log('invalid timestamp');
			return false;
		}
		else if (!hasValidHash(newBlock)) {
			return false;
		}
		return true;
	};
	const getAccumulatedDifficulty = (aBlockchain) => {
		return aBlockchain
			.map((block) => block.difficulty)
			.map((difficulty) => Math.pow(2, difficulty))
			.reduce((a, b) => a + b);
	};
	const getAccumulatedDifficultyChain1 = () => {
		return accuDiff;
	};
	const isValidTimestamp = (newBlock, previousBlock) => {
		return (previousBlock.timestamp - 60 < newBlock.timestamp)
			&& newBlock.timestamp - 60 < getCurrentTimestamp();
	};
	const hasValidHash = (block) => {
		if (!hashMatchesBlockContent(block)) {
			console.log('invalid hash, got:' + block.hash);
			return false;
		}
		if (!hashMatchesDifficulty(block.hash, block.difficulty)) {
			console.log('block difficulty not satisfied. Expected: ' + block.difficulty + 'got: ' + block.hash);
		}
		return true;
	};
	const hashMatchesBlockContent = (block) => {
		const blockHash = calculateHashForBlock(block);
		return blockHash === block.hash;
	};
	const hashMatchesDifficulty = (hash, difficulty) => {
		const hashInBinary = util_1.hexToBinary(hash);
		const requiredPrefix = '0'.repeat(difficulty);
		return hashInBinary.startsWith(requiredPrefix);
	};
	/*
		Checks if the given blockchain is valid. Return the unspent txOuts if the chain is valid
	 */
	/*
	const isValidChain = (blockchainToValidate: Block[]): UnspentTxOut[] => {
		console.log('isValidChain:');
		console.log(JSON.stringify(blockchainToValidate));
		const isValidGenesis = (block: Block): boolean => {
			return JSON.stringify(block) === JSON.stringify(genesisBlock);
		};

		if (!isValidGenesis(blockchainToValidate[0])) {
			return null;
		}
		
		//Validate each block in the chain. The block is valid if the block structure is valid
		//  and the transaction are valid
		 
		let aUnspentTxOuts: UnspentTxOut[] = [];

		for (let i = 0; i < blockchainToValidate.length; i++) {
			const currentBlock: Block = blockchainToValidate[i];
			if (i !== 0 && !isValidNewBlock(blockchainToValidate[i], blockchainToValidate[i - 1])) {
				return null;
			}

			aUnspentTxOuts = processTransactions(currentBlock.data, aUnspentTxOuts, currentBlock.index);
			if (aUnspentTxOuts === null) {
				console.log('invalid transactions in blockchain');
				return null;
			}
		}
		return aUnspentTxOuts;
	};
	*/
	//only used for chain2
	const isValidChain = (blockchainToValidate) => {
		console.log('isValidChain:');
		console.log(JSON.stringify(blockchainToValidate));
		const isValidGenesis = (block) => {
			return JSON.stringify(block) === JSON.stringify(genesisBlock);
		};
		if (!isValidGenesis(blockchainToValidate[0])) {
			return null;
		}
		/*
		Validate each block in the chain. The block is valid if the block structure is valid
		  and the transaction are valid
		 */
		let accountsTemp = [];
		for (let i = 0; i < blockchainToValidate.length; i++) {
			const currentBlock = blockchainToValidate[i];
			if (i !== 0 && !isValidNewBlock(blockchainToValidate[i], blockchainToValidate[i - 1])) {
				return null;
			}
			accountsTemp = transaction_1.processTransactions(currentBlock.data, accountsTemp);
			if (accountsTemp === null) {
				console.log('invalid transactions in blockchain');
				return null;
			}
		}
		return accountsTemp;
	};
	/*
	const addBlockToChain = (newBlock: Block): boolean => {
		if (isValidNewBlock(newBlock, getLatestBlock())) {
			const retVal: UnspentTxOut[] = processTransactions(newBlock.data, getUnspentTxOuts(), newBlock.index);
			if (retVal === null) {
				console.log('block is not valid in terms of transactions');
				return false;
			} else {
				blockchain.push(newBlock);
				setUnspentTxOuts(retVal);
				updateTransactionPool(unspentTxOuts);
				return true;
			}
		}
		return false;
	};
	*/
	const addBlockToChain = (newBlock) => {
		mode = config_1.getMode();
		if (isValidNewBlock(newBlock, getLatestBlock())) {
			const retVal = transaction_1.processTransactions(newBlock.data, getAccounts());
			if (retVal === null) {
				console.log('block is not valid in terms of transactions');
				return false;
			}
			else {
				if (mode == 'local') {
					blockchain.push(newBlock);
				}
				setAccounts(retVal);
				transactionPool_1.updateTransactionPool(newBlock.data);
				//The following is done even it is in local mode, preparing for mode change.
				theLatestBlock = newBlock;
				if (newBlock.index % DIFFICULTY_ADJUSTMENT_INTERVAL === 0) {
					previousAdjustBlock = newBlock;
				}
				accuDiff += Math.pow(2, newBlock.difficulty);
				return true;
			}
		}
		return false;
	};
	exports.addBlockToChain = addBlockToChain;
	/*
	const replaceChain = (newBlocks: Block[]) => {
		const aUnspentTxOuts = isValidChain(newBlocks);
		const validChain: boolean = aUnspentTxOuts !== null;
		if (validChain &&
			getAccumulatedDifficulty(newBlocks) > getAccumulatedDifficulty(getBlockchain())) {
			console.log('Received blockchain is valid. Replacing current blockchain with received blockchain');
			blockchain = newBlocks;
			setUnspentTxOuts(aUnspentTxOuts);
			updateTransactionPool(unspentTxOuts);
			broadcastLatest();
		} else {
			console.log('Received blockchain invalid');
		}
	};
	*/
	const replaceChain = (newBlocks) => {
		const accountsTemp = isValidChain(newBlocks);
		const validChain = accountsTemp !== null;
		mode = config_1.getMode();
		let currentDifficulty;
		if (mode == 'local') {
			currentDifficulty = getAccumulatedDifficulty(getBlockchain());
		}
		else if (mode == 'dew') {
			currentDifficulty = getAccumulatedDifficultyChain1();
		}
		if (validChain &&
			getAccumulatedDifficulty(newBlocks) > currentDifficulty) {
			console.log('Received blockchain is valid. Replacing current blockchain with received blockchain');
			if (mode == 'local') {
				blockchain = newBlocks;
			}
			setAccounts(accountsTemp);
			transactionPool_1.updateTransactionPoolReplace(accounts);
			theLatestBlock = newBlocks[newBlocks.length - 1];
			previousAdjustBlock = newBlocks[theLatestBlock.index - theLatestBlock.index % DIFFICULTY_ADJUSTMENT_INTERVAL];
			accuDiff = getAccumulatedDifficulty(newBlocks);
			p2p_1.broadcastLatest();
		}
		else {
			console.log('Received blockchain invalid');
		}
	};
	exports.replaceChain = replaceChain;
	/*
	const handleReceivedTransaction = (transaction: Transaction) => {
		addToTransactionPool(transaction, getUnspentTxOuts());
	};
	*/
	const handleReceivedTransaction = (transaction) => {
		//console.log('***handleReceivedTransacton:***');
		transactionPool_1.addToTransactionPool(transaction, getAccounts());
	};
	exports.handleReceivedTransaction = handleReceivedTransaction;
	const validateAccount = (account) => {
		/*
			if (!validateTransaction(tx, accounts)) {
				throw Error('Trying to add invalid tx to pool. Tx: ' + tx.id);
			}
		
			if (!isValidTxForPool(tx, transactionPool, accounts)) {
				throw Error('Tx is not valid for the pool, Tx: ' + tx.id);
			}
			//console.log('adding to txPool: %s', JSON.stringify(tx));
			transactionPool.push(tx);
		*/
	};
	exports.validateAccount = validateAccount;
} catch(e) {
	back.send('debug-error','blockchain: Major Error: '+e.message);
	back.send('debug-error','blockchain: Major Error: '+e.toString());
	back.send('debug-error','blockchain: Major Error: '+e.fileName);
	back.send('debug-error','blockchain: Major Error: '+e.lineNumber);
	back.send('debug-error','blockchain: Major Error: '+e.stack);
}
//# sourceMappingURL=blockchain.js.map