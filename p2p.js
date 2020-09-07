"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const back = require('androidjs').back;

//try {
	const WebSocket = require("ws");

	const blockchain_1 = require("./blockchain");
	const transactionPool_1 = require("./transactionPool");
	//dewcoin
	const config_1 = require("./config");
	let mode;
	let wsCloud;
	const getWsCloud = () => wsCloud;
	const sockets = [];
	var MessageType;
	(function (MessageType) {
		MessageType[MessageType["QUERY_LATEST"] = 0] = "QUERY_LATEST";
		MessageType[MessageType["QUERY_ALL"] = 1] = "QUERY_ALL";
		MessageType[MessageType["RESPONSE_BLOCKCHAIN"] = 2] = "RESPONSE_BLOCKCHAIN";
		MessageType[MessageType["QUERY_TRANSACTION_POOL"] = 3] = "QUERY_TRANSACTION_POOL";
		MessageType[MessageType["RESPONSE_TRANSACTION_POOL"] = 4] = "RESPONSE_TRANSACTION_POOL";
		MessageType[MessageType["QUERY_ACCOUNTS"] = 5] = "QUERY_ACCOUNTS";
		MessageType[MessageType["RESPONSE_ACCOUNTS"] = 6] = "RESPONSE_ACCOUNTS";
		MessageType[MessageType["ALTERNATE_ADDRESS"] = 7] = "ALTERNATE_ADDRESS";
		MessageType[MessageType["MINING_REQUEST"] = 8] = "MINING_REQUEST";
	})(MessageType || (MessageType = {}));
	class Message {
		// Likely empty because instances will be added to as the program runs.
	}
	/*
	const initP2PServer = (p2pPort: number) => {
		const server: Server = new WebSocket.Server({port: p2pPort});
		server.on('connection', (ws: WebSocket) => {
			initConnection(ws);
		});
		back.send('debug-error','p2p.initMessageHandler:listening websocket p2p port on: ' + p2pPort);
	};
	*/
	const initP2PServer = (p2pPort) => {
		back.send('debug-info','p2p.initP2PServer('+p2pPort+')');
		
		try {
			back.send('debug-info','p2p.initP2PServer: new WebSocket.Server');
			const server = new WebSocket.Server({ port: p2pPort });
			
			back.send('debug-info','p2p.initP2PServer: adding connection listener');
			server.on('connection', (ws) => {
				//incoming connections.
				initConnection(ws);
			});
			back.send('debug-info', 'p2p.initP2PServer: p2p websocket listening on port: ' + p2pPort);
			
			back.send('start-indication', 'p2p');
			
			back.send('debug-info','p2p.initP2PServer: config.getMode()');
			mode = config_1.getMode();
			back.send('debug-info','p2p.initP2PServer: config returned mode: '+mode);
			
			if (mode == 'dew') {
				back.send('debug-info','p2p.initP2PServer: setModeDew()');
				setModeDew();
			}
			else if (mode == 'local') {
				back.send('debug-info','p2p.initP2PServer: setModeLocal()');
				setModeLocal();
			}
			back.send('mode-update', mode);
			
			back.send('debug-info','p2p.initP2PServer: p2p running in '+mode+' mode');
		} catch(e) {
			back.send('debug-error','p2p.initP2PServer: Error: '+e.message);
		}
		
		back.send('debug-info','/p2p.initP2PServer');
	};
	exports.initP2PServer = initP2PServer;

	const getSockets = () => sockets;
	exports.getSockets = getSockets;

	const initConnection = (ws) => {
		back.send('debug-info','p2p.initConnection('+ws+')');
		
		try {
			back.send('debug-info','p2p.initConnection: socket added: ' + ws.url);
			
			sockets.push(ws);
			
			back.send('debug-info','p2p.initConnection: initMessageHandler(ws)');
			initMessageHandler(ws);
			
			back.send('debug-info','p2p.initConnection: initErrorHandler(ws)');
			initErrorHandler(ws);
			
			back.send('debug-info','p2p.initConnection: writing queryChainLengthMsg()');
			write(ws, queryChainLengthMsg());
			// query transactions pool only some time after chain query
			setTimeout(() => {
				broadcast(queryTransactionPoolMsg());
			}, 500);
		} catch(e) {
			back.send('debug-error','p2p.initConnection: Error: '+e.message);
		}
		
		back.send('debug-info','/p2p.initConnection');
	};

	const JSONToObject = (data) => {
		try {
			return JSON.parse(data);
		}
		catch (e) {
			back.send('debug-error','p2p.JSONToObject: Error: '+e.message);
			return null;
		}
	};
	/*
	const initMessageHandler = (ws: WebSocket) => {
		ws.on('message', (data: string) => {

			try {
				const message: Message = JSONToObject<Message>(data);
				if (message === null) {
					back.send('debug-error','p2p.initMessageHandler:could not parse received JSON message: ' + data);
					return;
				}
				back.send('debug-error','p2p.initMessageHandler:Received message: %s', JSON.stringify(message));
				switch (message.type) {
					case MessageType.QUERY_LATEST:
						write(ws, responseLatestMsg());
						break;
					case MessageType.QUERY_ALL:
						write(ws, responseChainMsg());
						break;
					case MessageType.RESPONSE_BLOCKCHAIN:
						const receivedBlocks: Block[] = JSONToObject<Block[]>(message.data);
						if (receivedBlocks === null) {
							back.send('debug-error','p2p.initMessageHandler:invalid blocks received: %s', JSON.stringify(message.data));
							break;
						}
						handleBlockchainResponse(receivedBlocks);
						break;
					case MessageType.QUERY_TRANSACTION_POOL:
						write(ws, responseTransactionPoolMsg());
						break;
					case MessageType.RESPONSE_TRANSACTION_POOL:
						const receivedTransactions: Transaction[] = JSONToObject<Transaction[]>(message.data);
						if (receivedTransactions === null) {
							back.send('debug-error','p2p.initMessageHandler:invalid transaction received: %s', JSON.stringify(message.data));
							break;
						}
						receivedTransactions.forEach((transaction: Transaction) => {
							try {
								handleReceivedTransaction(transaction);
								// if no error is thrown, transaction was indeed added to the pool
								// let's broadcast transaction pool
								broadCastTransactionPool();
							} catch (e) {
								console.log(e.message);
							}
						});
						break;
				}
			} catch (e) {
				console.log(e);
			}
		});
	};
	*/
	const initMessageHandler = (ws) => {
		back.send('debug-info','p2p.initMessageHandler('+ws+')');
		
		ws.on('message', (data) => {
			mode = config_1.getMode();
			try {
				const message = JSONToObject(data);
				if (message === null) {
					back.send('debug-error','p2p.initMessageHandler:could not parse received JSON message: ' + data);
					return;
				}
				back.send('debug-info','p2p.initMessageHandler:[Received message: '+data);
				switch (message.type) {
					case MessageType.QUERY_LATEST:
						write(ws, responseLatestMsg());
						break;
					case MessageType.QUERY_ALL:
						if (mode == 'local') {
							write(ws, responseChainMsg());
						}
						break;
					case MessageType.RESPONSE_BLOCKCHAIN:
						const receivedBlocks = JSONToObject(message.data);
						if (receivedBlocks === null) {
							back.send('debug-error','p2p.initMessageHandler:invalid blocks received: '+ JSON.stringify(message.data));
							break;
						}
						handleBlockchainResponse(receivedBlocks);
						break;
					case MessageType.QUERY_TRANSACTION_POOL:
						write(ws, responseTransactionPoolMsg());
						break;
					case MessageType.RESPONSE_TRANSACTION_POOL:
						const receivedTransactions = JSONToObject(message.data);
						if (receivedTransactions === null) {
							back.send('debug-error','p2p.initMessageHandler:invalid transaction received: '+ JSON.stringify(message.data));
							break;
						}
						receivedTransactions.forEach((transaction) => {
							try {
								blockchain_1.handleReceivedTransaction(transaction);
								// if no error is thrown, transaction was indeed added to the pool
								// let's broadcast transaction pool
								broadCastTransactionPool();
							}
							catch (e) {
								console.log(e.message);
							}
						});
						break;
					case MessageType.ALTERNATE_ADDRESS:
						back.send('debug-info','p2p.initMessageHandler:Alternate address received: '+ message.data);
						if (config_1.getMode() == 'dew') {
							write(wsCloud, message);
						}
						else {
							connectToPeers('ws://' + message.data);
						}
						break;
				}
			}
			catch (e) {
				console.log(e);
			}
			back.send('debug-info','p2p.initMessageHandler:message processing]');
		});
		
		back.send('debug-info','/p2p.initMessageHandler');
	};
	//for cloud-dew channel
	const initCloudMessageHandler = (ws) => {
		back.send('debug-info','p2p.initCloudMessageHandler('+ws+')');
		
		ws.on('message', (data) => {
			try {
				const message = JSONToObject(data);
				if (message === null) {
					back.send('debug-error','p2p.initCloudMessageHandler:could not parse received JSON message: ' + data);
					return;
				}
				back.send('debug-info','p2p.initCloudMessageHandler:[Received cloud message: '+ data);
				switch (message.type) {
					case MessageType.QUERY_LATEST:
						write(ws, responseLatestMsg());
						break;
					case MessageType.QUERY_ALL:
						write(ws, responseChainMsg());
						break;
					case MessageType.RESPONSE_BLOCKCHAIN:
						const receivedBlocks = JSONToObject(message.data);
						if (receivedBlocks === null) {
							back.send('debug-error','p2p.initCloudMessageHandler:invalid blocks received: '+ JSON.stringify(message.data));
							break;
						}
						handleBlockchainResponse(receivedBlocks);
						break;
					case MessageType.QUERY_TRANSACTION_POOL:
						write(ws, responseTransactionPoolMsg());
						break;
					case MessageType.RESPONSE_TRANSACTION_POOL:
						const receivedTransactions = JSONToObject(message.data);
						if (receivedTransactions === null) {
							back.send('debug-error','p2p.initCloudMessageHandler:invalid transaction received: '+ JSON.stringify(message.data));
							break;
						}
						receivedTransactions.forEach((transaction) => {
							try {
								blockchain_1.handleReceivedTransaction(transaction);
								// if no error is thrown, transaction was indeed added to the pool
								// let's broadcast transaction pool
								broadCastTransactionPool();
							}
							catch (e) {
								console.log(e.message);
								back.send('debug-error','p2p.initCloudMessageHandler error handled in blockchain.handleReceivedTransaction:'+e.message)
							}
						});
						break;
					case MessageType.QUERY_ACCOUNTS:
						write(ws, responseAccountsMsg());
						break;
					case MessageType.RESPONSE_ACCOUNTS:
						const receivedAccounts = JSONToObject(message.data);
						if (receivedAccounts === null) {
							back.send('debug-error','p2p.initCloudMessageHandler:invalid accounts received: '+ JSON.stringify(message.data));
							break;
						}
						receivedAccounts.forEach((account) => {
							try {
								blockchain_1.validateAccount(account);
								// if no error is thrown, accounts is valid
							}
							catch (e) {
								console.log(e.message);
							}
						});
						blockchain_1.setAccounts(receivedAccounts);
						break;
				}
			}
			catch (e) {
				console.log(e);
			}
			back.send('debug-info','p2p.initCloudMessageHandler:Cloud message processing]');
		});
		
		back.send('debug-info','/p2p.initCloudMessageHandler');
	};
	const write = (ws, message) => ws.send(JSON.stringify(message));
	//const broadcast = (message: Message): void => sockets.forEach((socket) => write(socket, message));
	const broadcast = (message) => {
		sockets.forEach((socket) => write(socket, message));
		mode = config_1.getMode();
		if (mode == 'dew') {
			write(wsCloud, message);
		}
	};
	const queryChainLengthMsg = () => ({ 'type': MessageType.QUERY_LATEST, 'data': null });
	const queryAllMsg = () => ({ 'type': MessageType.QUERY_ALL, 'data': null });
	const responseChainMsg = () => ({
		'type': MessageType.RESPONSE_BLOCKCHAIN, 'data': JSON.stringify(blockchain_1.getBlockchain())
	});
	const responseLatestMsg = () => ({
		'type': MessageType.RESPONSE_BLOCKCHAIN,
		'data': JSON.stringify([blockchain_1.getLatestBlock()])
	});
	const queryTransactionPoolMsg = () => ({
		'type': MessageType.QUERY_TRANSACTION_POOL,
		'data': null
	});
	const responseTransactionPoolMsg = () => ({
		'type': MessageType.RESPONSE_TRANSACTION_POOL,
		'data': JSON.stringify(transactionPool_1.getTransactionPool())
	});
	const queryAccountsMsg = () => ({
		'type': MessageType.QUERY_ACCOUNTS,
		'data': JSON.stringify(blockchain_1.getAccounts())
	});
	const responseAccountsMsg = () => ({
		'type': MessageType.RESPONSE_ACCOUNTS,
		'data': JSON.stringify(blockchain_1.getAccounts())
	});
	const alternateAddressMsg = (address) => ({
		'type': MessageType.ALTERNATE_ADDRESS,
		'data': address
	});
	const sendMiningRequest = (newBlock) => (write(wsCloud, { 'type': MessageType.MINING_REQUEST, 'data': JSON.stringify(newBlock) }));
	exports.sendMiningRequest = sendMiningRequest;
	const initErrorHandler = (ws) => {
		back.send('debug-info','p2p.initConnection('+ws+')');
		
		const closeConnection = (myWs) => {
			back.send('debug-error','p2p.initErrorHandler:connection failed to peer: ' + myWs.url);
			sockets.splice(sockets.indexOf(myWs), 1);
		};
		ws.on('close', () => closeConnection(ws));
		ws.on('error', () => closeConnection(ws));
	};
	const fetchAccounts = () => {
		if ((typeof wsCloud !== undefined) && (wsCloud.readyState == 1)) {
			write(wsCloud, queryAccountsMsg());
			back.send('debug-info','p2p.fetchAccounts:Accounts fetched.');
		}
		else {
			back.send('debug-error','p2p.fetchAccounts:Accounts fetch failed.');
		}
	};
	exports.fetchAccounts = fetchAccounts;
	const handleBlockchainResponse = (receivedBlocks) => {
		if (receivedBlocks.length === 0) {
			back.send('debug-error','p2p.handleBlockchainResponse:received block chain size of 0');
			return;
		}
		const latestBlockReceived = receivedBlocks[receivedBlocks.length - 1];
		if (!blockchain_1.isValidBlockStructure(latestBlockReceived)) {
			back.send('debug-error','p2p.handleBlockchainResponse:block structuture not valid');
			return;
		}
		const latestBlockHeld = blockchain_1.getLatestBlock();
		if (latestBlockReceived.index > latestBlockHeld.index) {
			back.send('debug-warn','p2p.handleBlockchainResponse:blockchain possibly behind. We got: ' + latestBlockHeld.index + ' Peer got: ' + latestBlockReceived.index);
			if (latestBlockHeld.hash === latestBlockReceived.previousHash) {
				if (blockchain_1.addBlockToChain(latestBlockReceived)) {
					broadcast(responseLatestMsg());
				}
			}
			else if (receivedBlocks.length === 1) {
				back.send('debug-info','p2p.handleBlockchainResponse:We have to query the chain from our peer');
				broadcast(queryAllMsg());
			}
			else {
				back.send('debug-info','p2p.handleBlockchainResponse:Received blockchain is longer than current blockchain');
				blockchain_1.replaceChain(receivedBlocks);
			}
		}
		else {
			back.send('debug-info','p2p.handleBlockchainResponse:received blockchain is not longer than received blockchain. Do nothing');
		}
	};
	const broadcastLatest = () => {
		broadcast(responseLatestMsg());
	};
	exports.broadcastLatest = broadcastLatest;
	/*
	const connectToPeers = (newPeer: string): void => {
		const ws: WebSocket = new WebSocket(newPeer);
		ws.on('open', () => {
			initConnection(ws);
		});
		ws.on('error', () => {
			back.send('debug-error','p2p.initMessageHandler:connection failed');
		});
	};
	*/
	const connectToPeers = (newPeer) => {
		const ws = new WebSocket(newPeer);
		ws.on('open', () => {
			if (config_1.getMode() == 'dew') {
				write(ws, alternateAddressMsg(config_1.getCloud()));
			}
			initConnection(ws);
		});
		ws.on('error', () => {
			back.send('debug-error','p2p.connectToPeers:connection failed');
		});
	};
	exports.connectToPeers = connectToPeers;
	const broadCastTransactionPool = () => {
		broadcast(responseTransactionPoolMsg());
	};
	exports.broadCastTransactionPool = broadCastTransactionPool;
	const setModeLocal = () => {
		config_1.setMode('local');
		mode = config_1.getMode();
		back.send('debug-info','p2p.setModeLocal:running on ' + mode + ' mode.');
		connectToPeers('ws://' + config_1.getCloud());
		if (typeof wsCloud !== "undefined") {
			wsCloud.close();
		}
		
		broadcast(queryChainLengthMsg());
		//query transactions pool only some time after chain query
		setTimeout(() => {
			broadcast(queryTransactionPoolMsg());
		}, 500);
	};
	exports.setModeLocal = setModeLocal;
	const setModeDew = () => {
		config_1.setMode('dew');
		mode = config_1.getMode();
		back.send('debug-info','p2p.setModeDew:running on ' + mode + ' mode.');
		wsCloud = new WebSocket('ws://' + config_1.getCloud());
		wsCloud.on('open', () => {
			back.send('debug-info','p2p.setModeDew:connection with the cloud established');
			initCloudMessageHandler(wsCloud);
			blockchain_1.resetBlockchain();
			write(wsCloud, queryChainLengthMsg());
			//query transactions pool only some time after chain query
			setTimeout(() => {
				write(wsCloud, queryTransactionPoolMsg());
				//broadcast(queryTransactionPoolMsg());
			}, 500);
		});
		wsCloud.on('error', () => {
			back.send('debug-error','p2p.setModeDew.wsCloud.on.error:connection with the cloud failed');
		});
		wsCloud.on('close', () => {
			back.send('debug-error','p2p.setModeDew.wsCloud.on.error:connection with the cloud was closed');
		});
	};
	exports.setModeDew = setModeDew;
//} catch(e) {
	// back.send('debug-error','p2p: Major Error: '+e.message);
	// back.send('debug-error','p2p: Major Error: '+e.toString());
	// back.send('debug-error','p2p: Major Error: '+e.fileName);
	// back.send('debug-error','p2p: Major Error: '+e.lineNumber);
	// back.send('debug-error','p2p: Major Error: '+e.stack);
//}
//# sourceMappingURL=p2p.js.map