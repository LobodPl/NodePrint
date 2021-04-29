const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline');
const readline = require("readline");
const io = require("socket.io-client");
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const bcrypt = require('bcrypt');


const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});
class PrinterWorker {
	isDataReceived = false;
	commandEnquedCount = 0;
	static comPort = null;
	baudrates = [115200, 250000, 230400, 57600, 38400, 19200, 9600]
	baudratesUsedIndex = 0;
	prepared = false;
	port = null;
	parser = null;
	static apiKey = null;
	static appId = null;
	static socket = null;

	constructor() {
		this.loadConfig();
		PrinterWorker.socket.on("connect", () => {
			PrinterWorker.socket.emit("nodeId", PrinterWorker.appId);
			if(PrinterWorker.apiKey == null){
				PrinterWorker.socket.once("pairRequest", () => {
					this.pairRequest();
				});
			}
			PrinterWorker.socket.on("apiKey", (remoteapiKey) => {
				if (bcrypt.compareSync(remoteapiKey, PrinterWorker.apiKey)) {
					console.log('[SEC] >> Server auth succ.');
					this.prepareSocket();
				}
			});
		});
	}

	prepareSocket() {
		if(! this.prepared){

			PrinterWorker.socket.on("disconnect",()=>{
				if (this.port.isOpen){
					this.port.close();
				}
			});

			PrinterWorker.socket.on("command", (message) => {
				this.PermissionProxy(message.apiKey,()=>{this.serialWrite(message.command)});
			});
	
			PrinterWorker.socket.on("setComPort", (message) => {
				this.PermissionProxy(message.apiKey,()=>{this.setComPort(message.port);});
			});
	
			PrinterWorker.socket.on("connectPrinter", (message) => {
				this.PermissionProxy(message.apiKey,()=>{this.connect();});
			});
	
			PrinterWorker.socket.on("getPortList", (message) => {
				this.PermissionProxy(message.apiKey,()=>{this.portList();});
			});
			this.prepared = true;
		}

	}
	loadConfig() {
		if (fs.existsSync("config.json")) {
			const data = fs.readFileSync('config.json')
			let parsedConfig = JSON.parse(data);
			PrinterWorker.apiKey = parsedConfig.apiKey;
			PrinterWorker.socket = io(parsedConfig.nodeAddress);
			PrinterWorker.comPort = parsedConfig.comPort;
			PrinterWorker.appId = parsedConfig.nodeId;
		} else {
			const blankConfig = { "nodeId": uuidv4(), "apiKey":null, "comPort": null, "nodeAddress": "ws://localhost:3000" };
			fs.writeFileSync("config.json", JSON.stringify(blankConfig));
			console.log("Proszę uzupełnic config.cfg");
			process.exit();
		}
	}
	pairRequest(){
		if(PrinterWorker.apiKey == null){
			const token = uuidv4();
			PrinterWorker.apiKey = bcrypt.hashSync(token, 10);
			const data = fs.readFileSync('config.json')
			let parsedConfig = JSON.parse(data);
			parsedConfig.apiKey = PrinterWorker.apiKey;
			fs.writeFileSync("config.json", JSON.stringify(parsedConfig));
			PrinterWorker.socket.emit("pairResponse",{"id":PrinterWorker.appId,"secret":token})
			PrinterWorker.socket.emit("nodeId", PrinterWorker.appId);

		}
	}
	setComPort(comPort) {
		console.log("[CFG] >> COM port set to :"+comPort)
		PrinterWorker.comPort = comPort;
		const data = fs.readFileSync('config.json')
		let parsedConfig = JSON.parse(data);
		parsedConfig.comPort = PrinterWorker.comPort;
		fs.writeFileSync("config.json", JSON.stringify(parsedConfig));

	}
	connect() {
		this.port = new SerialPort(PrinterWorker.comPort, { baudRate: this.baudrates[this.baudratesUsedIndex] });
		this.parser = this.port.pipe(new Readline({ delimiter: '\n' }));// Read the port data

		this.port.on("open", () => {
			console.log('[Serial] Checking Baudrate');
			setTimeout(() => {
				if (!this.isDataReceived) {
					if (this.baudratesUsedIndex + 1 < this.baudrates.length) {
						this.baudratesUsedIndex++;
						this.port.update({ baudRate: this.baudrates[this.baudratesUsedIndex] });
						this.port.flush();
						this.parser._flush((x) => { });
						setTimeout(() => {
							this.port.close();
							setTimeout(() => { this.port.open(); }, 200);
						}, 200);
					}
				} else {
					console.log('[Serial] Opened');
				}
			}, 1000);
		});

		this.port.on('error', function (err) {
			PrinterWorker.socket.emit("error", "[Error] || " + err.message);
			console.log('Error: ', err.message)
		})

		this.parser.on('data', data => {
			if (!this.isDataReceived && data == "start") this.isDataReceived = true;
			if (data == "ok") this.commandEnquedCount--;
			PrinterWorker.socket.emit("log", "[Data] >> " + data);
			console.log('[Data] >>', data);
		});
	}

	serialWrite(data) {
		this.port.write(data + '\n');
		this.commandEnquedCount++;
		PrinterWorker.socket.emit("log", "[Data] << " + data);
		console.log('[Data] <<', data);
	}

	portList() {
		SerialPort.list().then(
			(ports) => {
				PrinterWorker.socket.emit("ports", JSON.stringify(ports));
				console.log(JSON.stringify(ports));
			}
		)
	}
	PermissionProxy(apiKey,callback){
		if (bcrypt.compareSync(apiKey, PrinterWorker.apiKey)) {
			callback()
		}else{
			console.log("[SEC] >> Wrong Api KEY")
		}
	}
}

let worker = new PrinterWorker();