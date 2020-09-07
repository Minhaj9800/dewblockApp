"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const back = require('androidjs').back;
const _ = require("lodash");

//try {
	const path = require('path');
	var elliptic_1 = require("elliptic");
	const fs_1 = require("fs");
	var EC = new elliptic_1.ec('secp256k1');
	
	const transaction_1 = require("./transaction");
	const blockchain_1 = require("./blockchain");

	var privateKeyLocation = 'node/wallet/private_key'; // We skipped process.env.PRIVATE_KEY ||

	const getPrivateFromWallet = () => {
		const buffer = fs_1.readFileSync(privateKeyLocation, 'utf8');
		return buffer.toString();
	};
	exports.getPrivateFromWallet = getPrivateFromWallet;

	const getPublicFromWallet = () => {
		back.send('debug-info','wallet.getPublicFromWallet()');
		
		back.send('debug-info','wallet.getPublicFromWallet: getPrivateFromWallet()');
		const privateKey = getPrivateFromWallet();
		
		back.send('debug-info','wallet.getPublicFromWallet: EC.keyFromPrivate(privateKey, "hex")');
		const key = EC.keyFromPrivate(privateKey, 'hex');
		
		back.send('debug-info','wallet.getPublicFromWallet: key.getPublic().encode("hex")');
		const encoded = key.getPublic().encode('hex');
		
		back.send('debug-info','/wallet.getPublicFromWallet');
		return encoded;

		/*Following code was originally there I switched 
		with above in a way which Android.js support
		//const privateKey = getPrivateFromWallet();
		//const key = EC.keyFromPrivate(privateKey, 'hex');
		//return key.getPublic().encode('hex');*/
	};
	exports.getPublicFromWallet = getPublicFromWallet;

	const generatePrivateKey = () => {
		back.send('debug-info','wallet.generatePrivateKey()');
		try{
			if(!elliptic_1){
				back.send('debug-warn','wallet.generatePrivateKey: elliptic not initialized');
				elliptic_1 = require("elliptic");
			}
			if(!EC){
				back.send('debug-warn','wallet.generatePrivateKey: EC not initialized');
				EC = new elliptic_1.ec('secp256k1');
			}
		} catch(e){
			back.send('debug-error', 'wallet.generatePrivateKey: Error: '+e.message);
		}
		
		back.send('debug-info','wallet.generatePrivateKey: EC.genKeyPair()');
		const keyPair = EC.genKeyPair();
		
		back.send('debug-info','wallet.generatePrivateKey: keyPair.getPrivate()');
		const privateKey = keyPair.getPrivate();
		
		back.send('debug-info','/wallet.generatePrivateKey');
		return privateKey.toString(16);
	};
	exports.generatePrivateKey = generatePrivateKey;

	const initWallet = (usr_datapath) => {
		back.send('debug-info','wallet.initWallet('+usr_datapath+')');
		
		
		try{
			privateKeyLocation = path.join(usr_datapath,'private_key');
		} catch(e){
			back.send('debug-error', 'wallet.initWallet: Error: '+e.message);
		}

		back.send('debug-info','wallet.initWallet: privateKeyLocation = '+privateKeyLocation);

		try {
			back.send('debug-info','wallet.initWallet: fs.existsSync('+privateKeyLocation+')');
			if (!fs_1.existsSync(privateKeyLocation)) {
				back.send('debug-info', 'wallet.initWallet: No private key at '+privateKeyLocation+' (fs.existsSync -> false)');
				
				back.send('debug-info','wallet.initWallet: generatePrivateKey()');
				const newPrivateKey = generatePrivateKey();
				back.send('debug-info','wallet.initWallet: Generated new private key');
				
				back.send('debug-info','wallet.initWallet: fs.writeFileSync(...)');
				fs_1.writeFileSync(privateKeyLocation, newPrivateKey);
				back.send('debug-info','wallet.initWallet: Generated new wallet with private key to '+privateKeyLocation);
			}

			back.send('debug-info','wallet.initWallet: generatePrivateKey()');
			const newPrivateKey = generatePrivateKey();
			back.send('debug-info','wallet.initWallet: Generated new private key');
			
			back.send('debug-info','wallet.initWallet: fs.writeFileSync(...)');
			fs_1.writeFileSync(privateKeyLocation, newPrivateKey);
			back.send('debug-info','wallet.initWallet: Generated new wallet with private key to '+privateKeyLocation);
			
			back.send('debug-info','wallet.initWallet: blockchain.getAccounts()');
			const accounts = blockchain_1.getAccounts();
			
			back.send('debug-info','wallet.initWallet: getPublicFromWallet()');
			const address = getPublicFromWallet();
			back.send('debug-info','wallet.initWallet: received address "'+address+'"');
			
			back.send('debug-info','wallet.initWallet: transaction.existAccount(...)');
			if (!transaction_1.existAccount(address, accounts)) {
				back.send('debug-info','wallet.initWallet: transaction.createAccount(...)');
				transaction_1.createAccount(address, accounts);
				back.send('debug-info','wallet.initWallet: An account was created');
			}
			
			back.send('start-indication', 'wallet');
			
			back.send('debug-info','/wallet.initWallet');
		} catch(e){ 
			back.send('debug-error', 'wallet.initWallet: Error: '+e.message);
		}
		back.send('debug-info','/wallet.initWallet');
	};

	exports.initWallet = initWallet;

	const deleteWallet = () => {
		if (fs_1.existsSync(privateKeyLocation)) {
			fs_1.unlinkSync(privateKeyLocation);
		}
	};
	exports.deleteWallet = deleteWallet;
	/*
	const getBalance = (address: string, unspentTxOuts: UnspentTxOut[]): number => {
		return _(findUnspentTxOuts(address, unspentTxOuts))
			.map((uTxO: UnspentTxOut) => uTxO.amount)
			.sum();
	};
	*/
	const getBalance = (address, accounts) => {
		let acct = transaction_1.findAccount(address, accounts);
		if (acct == undefined) {
			console.log('getBalance: no account found.');
			back.send('debug-info','No Account Found');
			return 0;
		}
		return acct.balance;
	};
	exports.getBalance = getBalance;
	const createTransaction = (receiverAddress, amount, privateKey, accounts, txPool) => {
		//console.log('txPool: %s', JSON.stringify(txPool));
		// txPool did not get used in anywhere in this class other than a parameter.
		const myAddress = transaction_1.getPublicKey(privateKey);
		const myAccount = transaction_1.findAccount(myAddress, accounts);
		if (amount > myAccount.balance) {
			console.log('No enough coins.');
			back.send('debug-info', 'Not Enough Coins to create a Transaction');
			return undefined;
		}
		const tx = new transaction_1.Transaction(myAddress, receiverAddress, amount);
		tx.timestamp = blockchain_1.getCurrentTimestamp();
		tx.id = transaction_1.getTransactionId(tx);
		tx.signature = transaction_1.signTransaction(tx, privateKey);
		//what is the role of transaction pool?
		return tx;
	};
	exports.createTransaction = createTransaction;
// } catch(e) {
// 	back.send('debug-error','wallet: Major Error: '+e.message);
// 	back.send('debug-error','wallet: Major Error: '+e.toString());
// 	back.send('debug-error','wallet: Major Error: '+e.fileName);
// 	back.send('debug-error','wallet: Major Error: '+e.lineNumber);
// 	back.send('debug-error','wallet: Major Error: '+e.stack);
// }
//# sourceMappingURL=wallet.js.map


    //let's not override existing private keys
    //Following was orginally there I replaced them with above.
    /*if (fs_1.existsSync(privateKeyLocation)) {
        if (!transaction_1.existAccount(getPublicFromWallet(), blockchain_1.getAccounts())) {
            transaction_1.createAccount(getPublicFromWallet(), blockchain_1.getAccounts());
            console.log('an account was created.');
        }
        return;
    }
    const newPrivateKey = generatePrivateKey();
    fs_1.writeFileSync(privateKeyLocation, newPrivateKey);
    console.log('new wallet with private key created to : %s', privateKeyLocation);
    if (!transaction_1.existAccount(getPublicFromWallet(), blockchain_1.getAccounts())) {
        transaction_1.createAccount(getPublicFromWallet(), blockchain_1.getAccounts());
        console.log('an account was created.');
    }**/
//     const newPrivateKey = generatePrivateKey();
//     fs_1.writeFileSync(privateKeyLocation, newPrivateKey);
//     console.log('new wallet with private key created to : %s', privateKeyLocation);
//     if (!transaction_1.existAccount(getPublicFromWallet(), blockchain_1.getAccounts())) {
//         transaction_1.createAccount(getPublicFromWallet(), blockchain_1.getAccounts());
//         console.log('an account was created.');
//     }
// };
/*
const findUnspentTxOuts = (ownerAddress: string, unspentTxOuts: UnspentTxOut[]) => {
    return _.filter(unspentTxOuts, (uTxO: UnspentTxOut) => uTxO.address === ownerAddress);
};
*/
/*
const findTxOutsForAmount = (amount: number, myUnspentTxOuts: UnspentTxOut[]) => {
    let currentAmount = 0;
    const includedUnspentTxOuts = [];
    for (const myUnspentTxOut of myUnspentTxOuts) {
        includedUnspentTxOuts.push(myUnspentTxOut);
        currentAmount = currentAmount + myUnspentTxOut.amount;
        if (currentAmount >= amount) {
            const leftOverAmount = currentAmount - amount;
            return {includedUnspentTxOuts, leftOverAmount};
        }
    }

    const eMsg = 'Cannot create transaction from the available unspent transaction outputs.' +
        ' Required amount:' + amount + '. Available unspentTxOuts:' + JSON.stringify(myUnspentTxOuts);
    throw Error(eMsg);
};
*/
/*
const createTxOuts = (receiverAddress: string, myAddress: string, amount, leftOverAmount: number) => {
    const txOut1: TxOut = new TxOut(receiverAddress, amount);
    if (leftOverAmount === 0) {
        return [txOut1];
    } else {
        const leftOverTx = new TxOut(myAddress, leftOverAmount);
        return [txOut1, leftOverTx];
    }
};
*/
/*
const filterTxPoolTxs = (unspentTxOuts: UnspentTxOut[], transactionPool: Transaction[]): UnspentTxOut[] => {
    const txIns: TxIn[] = _(transactionPool)
        .map((tx: Transaction) => tx.txIns)
        .flatten()
        .value();
    const removable: UnspentTxOut[] = [];
    for (const unspentTxOut of unspentTxOuts) {
        const txIn = _.find(txIns, (aTxIn: TxIn) => {
            return aTxIn.txOutIndex === unspentTxOut.txOutIndex && aTxIn.txOutId === unspentTxOut.txOutId;
        });

        if (txIn === undefined) {

        } else {
            removable.push(unspentTxOut);
        }
    }

    return _.without(unspentTxOuts, ...removable);
};
*/
/*
const createTransaction = (receiverAddress: string, amount: number, privateKey: string,
                           unspentTxOuts: UnspentTxOut[], txPool: Transaction[]): Transaction => {

    console.log('txPool: %s', JSON.stringify(txPool));
    const myAddress: string = getPublicKey(privateKey);
    const myUnspentTxOutsA = unspentTxOuts.filter((uTxO: UnspentTxOut) => uTxO.address === myAddress);

    const myUnspentTxOuts = filterTxPoolTxs(myUnspentTxOutsA, txPool);

    // filter from unspentOutputs such inputs that are referenced in pool
    const {includedUnspentTxOuts, leftOverAmount} = findTxOutsForAmount(amount, myUnspentTxOuts);

    const toUnsignedTxIn = (unspentTxOut: UnspentTxOut) => {
        const txIn: TxIn = new TxIn();
        txIn.txOutId = unspentTxOut.txOutId;
        txIn.txOutIndex = unspentTxOut.txOutIndex;
        return txIn;
    };

    const unsignedTxIns: TxIn[] = includedUnspentTxOuts.map(toUnsignedTxIn);

    const tx: Transaction = new Transaction();
    tx.txIns = unsignedTxIns;
    tx.txOuts = createTxOuts(receiverAddress, myAddress, amount, leftOverAmount);
    tx.id = getTransactionId(tx);

    tx.txIns = tx.txIns.map((txIn: TxIn, index: number) => {
        txIn.signature = signTxIn(tx, index, privateKey, unspentTxOuts);
        return txIn;
    });

    return tx;
};
*/