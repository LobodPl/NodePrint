const express = require("express");
const socket = require("socket.io");
const socketStream = require('socket.io-stream');
const db = require("./modules/databaseworker")
const Printer = require("./modules/printer")
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const fs = require('fs');
var minify = require('express-minify');
var compression = require('compression')


// App setup
const PORT = 3000;
var stream = socketStream.createStream();
const app = express();

let connectedPrinters = [];
let messages = []

const server = app.listen(PORT, function () {
	console.log(`Main app is listening on port ${PORT}`);
	console.log(`http://localhost:${PORT}`);
});

// Static files
app.use('/gcode', express.static("gcode"));
app.use(compression());
app.use(minify());
app.use(express.static("public"));

// Socket setup
const ioserver = socket(server);
const printerIo = ioserver.of("/mirror");
const webio = ioserver.of("/web");

webio.on("connection", function (socket) {
	socket.on("getPrintersStatus", function () {
		const status = getPrintersStatus();
		socket.emit("getPrintersStatus", status);
	})
	socket.on("getFileList", function () {
		fs.readdir("gcode", function (err, filesList) {
			socket.emit("getFileList", filesList);
		})
	})
	socket.on("getPrinterList", function () {
		let printerList = [];
		for (const printer of connectedPrinters) {
			printerList.push({ "name": printer.name, "status": printer.state, "id": printer.id });
		}
		socket.emit("getPrinterList", printerList);
	});
	socket.on("sendFile", function (data) {
		const printer = connectedPrinters.find(x => x.id == data.id);
		sendFile("gcode/" + data.file, printer.messageTemplate, printer.socket);
	});

	socket.on("deleteFile", function (data) {
		fs.unlinkSync("gcode/" + data.name);
		fs.readdir("gcode", function (err, filesList) {
			socket.emit("getFileList", filesList);
		});
	});
	socket.on("getPortList", function (data) {
		console.log(data.id);
		const printer = connectedPrinters.find(x => x.id == data.id);
		printer.socket.once("ports", function (list) {
			socket.emit("getPortList", { "name": printer.name, "ports": list });
		});
		printer.socket.emit("getPortList", printer.messageTemplate);
	});

	for (const message of messages) {
		socket.emit("log-message", message);
	}
	socket.on("setPrinterName", function (data) {
		const printer = connectedPrinters.find(x => x.id == data.id);
		db.setPrinterNameById(data.newname, data.id);
		printer.name = data.newname;
	});
	socket.on("setPrinterPort", function (msg) {
		const printer = connectedPrinters.find(x => x.id == msg.id);
		let message = printer.messageTemplate;
		message.port = msg.port;
		printer.socket.emit("setComPort", message);
	});
	socket.on("killAll", function () {
		for (const printer of connectedPrinters) {
			let msg = printer.messageTemplate;
			printer.socket.emit("kill", msg);
		}
	});
	socket.on("kill", function (data) {
		const printer = connectedPrinters.find(x => x.id == data.id);
		let message = printer.messageTemplate;
		printer.socket.emit("kill", message);
	});
	socket.on("command", function (data) {
		const printer = connectedPrinters.find(x => x.id == data.id);
		let msg = printer.messageTemplate;
		msg.command = data.command;
		printer.socket.emit("command", msg);
	});
});

printerIo.on("connection", function (socket) {
	console.log("Mirror node is connected");
	let thisNodeId = 0;
	socket.on("log", function (msg) {
		const message = { "class": "info", "tag": "Info", "text": msg };
		sendLog(message);
	});
	socket.on("printerlog", function (msg) {
		let message = { "id": thisNodeId, "message": msg };
		webio.emit("printerlog", message);
	});
	socket.on("nodeId", (nodeId) => {
		const secret = db.getSecretById(nodeId);
		if (secret != 0) {
			socket.emit("apiKey", secret);
			let printer = new Printer();
			thisNodeId = nodeId;
			printer.id = nodeId;
			printer.name = db.getPrinterNameById(nodeId);
			printer.secret = secret;
			printer.messageTemplate = { "apiKey": secret }
			printer.state = "Idle";
			printer.socket = socket;
			connectedPrinters.pushIfNotExist(printer, (e) => { return e.id == printer.id });
			const message = { "class": "info", "tag": "Info", "text": `Printer "${printer.name}" has connected` };
			sendLog(message);
		}
		else {
			socket.emit("pairRequest");
			socket.once("pairResponse", (responsedata) => {
				const token = uuidv4();
				const apiKey = bcrypt.hashSync(token, 10);
				socket.emit("pairResponse",{"encryptedKey":apiKey})
				db.storeSecretWithId(responsedata.id, token);
			})
		}
	})
	socket.on("stateChange", function (state) {
		let index = connectedPrinters.findIndex(x => x.id == thisNodeId);
		connectedPrinters[index].state = state
	})
	socket.on("readyToPrint", function () {
		let printer = connectedPrinters.find(x => x.id == thisNodeId);
		socket.emit("startPrintJob", printer.messageTemplate);
	})
	socket.on("PrintError", function (errorText) {
		let node = connectedPrinters.findIndex(x => x.id == thisNodeId)
		node.state = "Error";
		const message = { "class": "error", "tag": "Error", "text": `Printer "${connectedPrinters[node].name}" has enetred Error state\n ${errorText}` }
		sendLog(message)

	});
	socket.on("disconnect", function () {
		let node = connectedPrinters.findIndex(x => x.id == thisNodeId)
		const message = { "class": "caution", "tag": "Caution", "text": `Printer "${connectedPrinters[node].name}" has disconnected` }
		sendLog(message)
		connectedPrinters.splice(node, 1)

	});
});


function sendLog(message) {
	message.date = new Date();
	messages.push(message);
	webio.emit("log-message", message);
}

function sendFile(filename, messagetemplate, socket) {
	let message = messagetemplate
	message.data = uuidv4();
	const stats = fs.statSync(filename)
	message.size = stats.size;
	console.log('[Stream] >> Starting File Transfer on channel: ' + message.data);
	socket.emit("fileTransfer", message);
	socketStream(socket).on(message.data, function (stream) {
		fs.createReadStream(filename).pipe(stream);
	});
}

Array.prototype.inArray = function (comparer) {
	for (const elem of this) {
		if (comparer(elem)) return true;
	}
	return false;
};

Array.prototype.pushIfNotExist = function (element, comparer) {
	if (!this.inArray(comparer)) {
		this.push(element);
	}
};

function getPrintersStatus() {
	let status = { "Idle": 0, "Printing": 0, "Downloading": 0, "Error": 0 }
	for (let i = 0; i < connectedPrinters.length; i++) {
		status[connectedPrinters[i].state]++;
	}
	return status;
}