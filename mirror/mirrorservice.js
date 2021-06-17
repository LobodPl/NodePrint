const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline');
const io = require("socket.io-client");
const socketStream = require('socket.io-stream');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const bcrypt = require('bcrypt');
const lineByLine = require('n-readlines');

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
	static stream = null;
	state = "Idle";
	fileSize = 0;
	downloadFailCount = 0;

	constructor() {
		this.loadConfig();
		PrinterWorker.socket.on("connect", () => {
			PrinterWorker.socket.emit("nodeId", PrinterWorker.appId);
			if (PrinterWorker.apiKey == null) {
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
		if (!this.prepared) {
			PrinterWorker.socket.on("disconnect", () => {
				if (this.port != null && this.port.isOpen) {
					this.port.close();
				}
			});


			PrinterWorker.socket.on("command", (message) => {
				this.PermissionProxy(message.apiKey, () => { this.connect(message.command) });
			});

			PrinterWorker.socket.on("setComPort", (message) => {
				this.PermissionProxy(message.apiKey, () => { this.setComPort(message.port); });
			});

			PrinterWorker.socket.on("getPortList", (message) => {
				this.PermissionProxy(message.apiKey, () => { this.portList(); });
			});

			PrinterWorker.socket.on("kill", (message) => {
				this.PermissionProxy(message.apiKey, () => { this.kill(); });
			});

			PrinterWorker.socket.on("getState", (message) => {
				this.PermissionProxy(message.apiKey, () => { this.getState(); });
			});

			PrinterWorker.socket.on("startPrintJob", (message) => {
				this.PermissionProxy(message.apiKey, () => { this.startPrintJob(); });
			});

			PrinterWorker.socket.on("fileTransfer", (message) => {
				this.PermissionProxy(message.apiKey, () => {
					this.downloadFailCount = 0;
					this.fileTransfer(message.data, message.size);
				});
			});

			this.getState();

			this.prepared = true;
		}

	}
	loadConfig() {
		if (fs.existsSync("config.json")) {
			const data = fs.readFileSync('config.json')
			let parsedConfig = JSON.parse(data);
			PrinterWorker.apiKey = parsedConfig.apiKey;
			PrinterWorker.socket = io(parsedConfig.nodeAddress + "/mirror");
			PrinterWorker.comPort = parsedConfig.comPort;
			PrinterWorker.appId = parsedConfig.nodeId;
		} else {
			const blankConfig = { "nodeId": uuidv4(), "apiKey": null, "comPort": null, "nodeAddress": "ws://localhost:3000" };
			fs.writeFileSync("config.json", JSON.stringify(blankConfig));
			console.log("Fill missing fields in config.cfg");
			process.exit();
		}
	}
	getState() {
		PrinterWorker.socket.emit("State", this.state);
	}

	kill() {
		this.connect("M112");
		this.setState("Error");
	}

	setState(newState) {
		this.state = newState;
		PrinterWorker.socket.emit("stateChange", this.state);
	}

	pairRequest() {
		if (PrinterWorker.apiKey == null) {
			const token = uuidv4();
			PrinterWorker.apiKey = bcrypt.hashSync(token, 10);
			const data = fs.readFileSync('config.json')
			let parsedConfig = JSON.parse(data);
			parsedConfig.apiKey = PrinterWorker.apiKey;
			fs.writeFileSync("config.json", JSON.stringify(parsedConfig));
			PrinterWorker.socket.emit("pairResponse", { "id": PrinterWorker.appId, "secret": token })
			PrinterWorker.socket.emit("nodeId", PrinterWorker.appId);

		}
	}
	setComPort(comPort) {
		if (this.state == "Idle") {
			console.log("[CFG] >> COM port set to :" + comPort);
			PrinterWorker.comPort = comPort;
			const data = fs.readFileSync('config.json');
			let parsedConfig = JSON.parse(data);
			parsedConfig.comPort = PrinterWorker.comPort;
			fs.writeFileSync("config.json", JSON.stringify(parsedConfig));
		}

	}
	connect(SingleCommand) {
		if (this.state == "Idle" && (this.port == null || !this.port.isOpen)) {
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
						console.log('[Serial] Detected Speed:' + this.baudrates[this.baudratesUsedIndex]);
						if (typeof (SingleCommand) == "undefined") {
							setTimeout(() => {
								this.startTrueJob();
							}, 3000);
						} else {
							this.serialWrite(SingleCommand)
						}


					}
				}, 1000);
			});

			this.port.on('error', function (err) {
				PrinterWorker.socket.emit("error", "[Error] || " + err.message);
				console.log('Error: ', err.message)
				this.setState("Error");
			});

			this.parser.on('data', data => {
				if (!this.isDataReceived && data == "start") this.isDataReceived = true;
				if (data == "ok" && this.commandEnquedCount > 0) {
					this.commandEnquedCount--;
				}
				PrinterWorker.socket.emit("printerlog", "[Data] >> " + data);
				console.log('[Data] >>', data);
			});
		} else {
			if (typeof (SingleCommand) == "undefined") {
				setTimeout(() => {
					this.startTrueJob();
				}, 3000);
			} else {
				this.serialWrite(SingleCommand)
			}
		}
	}

	serialWrite(data) {
		this.port.write(data + '\n');
		this.commandEnquedCount++;
		PrinterWorker.socket.emit("printerlog", "[Data] << " + data);
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

	fileTransfer(data, fileSize) {
		if (this.state == "Idle") {
			this.setState("Downloading");
			console.log('[Stream] >> Incomming File Transfer');
			PrinterWorker.stream = socketStream.createStream();
			this.fileSize = 0;
			PrinterWorker.stream.on("data", (chunk) => {
				this.fileSize += chunk.length;
				console.log(this.fileSize + " of " + fileSize + "(" + Math.round(this.fileSize * 100 / fileSize) + "%)")
				if (this.fileSize == fileSize) {
					console.log('[Stream] >> File Transfer Complated');
					PrinterWorker.socket.emit("readyToPrint");
					this.isTranserComplated = true;
					this.setState("Idle");
				}
			})
			socketStream(PrinterWorker.socket).emit(data, PrinterWorker.stream)
			PrinterWorker.stream.pipe(fs.createWriteStream('printJob.gco'));
			setTimeout(() => (this.DownlaodHyperVisor(0, data, fileSize)), 2000)
		}
	}

	startPrintJob() {
		if (this.state == "Idle") {
			this.connect();
		}
	}

	async startTrueJob() {
		this.setState("Printing");
		this.serialWrite("M155 S5");
		const liner = new lineByLine('printJob.gco');
		let line;
		while ((line = liner.next()) && this.state != "Error") {
			while (this.commandEnquedCount >= 5) { await sleep(100) }
			this.serialWrite(line.toString('ascii'));
		}
		while (this.commandEnquedCount == 0) { await sleep(100) }
		this.setState("Idle");
	}

	portState() {
		PrinterWorker.socket.emit("state", this.state);
	}

	PermissionProxy(apiKey, callback) {
		if (bcrypt.compareSync(apiKey, PrinterWorker.apiKey)) {
			callback()
		} else {
			console.log("[SEC] >> Wrong Api KEY")
		}
	}
	DownlaodHyperVisor(prevSize, data, fileSize) {
		if (this.state == "Downloading" && this.downloadFailCount <= 3) {
			let newSize = this.fileSize;
			if (prevSize == newSize) {
				console.log("[Stream] >> File has been corrupted. Retrying.");
				this.setState("Idle");
				this.downloadFailCount++;
				setTimeout(() => { this.fileTransfer(data, fileSize) }, 5000);
			} else {
				setTimeout(() => { this.DownlaodHyperVisor(newSize, data, fileSize) }, 2000)
			}
		}
		else {
			if (this.downloadFailCount > 3) {
				console.log("[Stream] >> Failed to downlaod the file");
			}
		}
	}
}

const sleep = ms => {
	return new Promise(resolve => setTimeout(resolve, ms))
}

let worker = new PrinterWorker();