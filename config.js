"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
let mode = 'local';
//If mode is dew and configured properly, dew can cloud can be automatically lined together through sockets.
//If mode is local, it has no connection with the cloud; it will have the complete blockchain. 
//modes can be switched through HTTP commands.
let cloudAddress = 'a949cdb4ba03.ngrok.io';
//let cloudAddress = '192.168.1.186:7001';
//let cloudAddress = '192.168.1.114:7001';
//If dew address is not correct, it can also be set using HTTP command. See Readme.
//Please notice: if only one machine is involved in testing, default config files are OK. 
//If more than one machine is involved, config files should not use localhost or 127.0.0.1 at all.
const getMode = () => { return mode; };
exports.getMode = getMode;
const setMode = (s) => { mode = s; };
exports.setMode = setMode;
const getCloud = () => { return cloudAddress; };
exports.getCloud = getCloud;
const setCloud = (address) => { cloudAddress = address; };
exports.setCloud = setCloud;
//# sourceMappingURL=config.js.map