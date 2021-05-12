const express = require("express");
const socket = require("socket.io");
const socketStream = require('socket.io-stream');
const prompt = require('prompt');
const db = require("./modules/databaseworker")
const fs = require('fs');
// App setup
const PORT = 3000;
var stream = socketStream.createStream();
const app = express();
const server = app.listen(PORT, function () {
	console.log(`Main app is listening on port ${PORT}`);
	console.log(`http://localhost:${PORT}`);
});

// Static files
app.use(express.static("public"));

// Socket setup
const io = socket(server).of("/mirror");

io.on("connection", function (socket) {
	console.log("Mirror node is connected");
	socket.on("log", console.log)
	socket.on("nodeId", (nodeId) => {
		const secret = db.getSecretById(nodeId);
		if (secret != 0) {
			socket.emit("apiKey", secret);
			const messageTemplate = { "apiKey": secret }
			let message = messageTemplate;
			socket.emit("getPortList", message);
			socket.on("ports", (portList) => {
				console.log(portList);
				prompt.start();
				prompt.get("index", (err, res) => {
					message = messageTemplate;
					if (res.index == "get") {
						socket.emit("getPortList", message);
					}
					else if (res.index == "file") {
						sendFile("test.txt", messageTemplate, socket)
					} else {
						message.port = JSON.parse(portList)[res.index].path;
						socket.emit("setComPort", message);
						socket.emit("connectPrinter", message);
						getGcode(messageTemplate, socket);
					}

				});
			});
		}
		else {
			socket.emit("pairRequest");
			socket.once("pairResponse", (responsedata) => {
				db.storeSecretWithId(responsedata.id, responsedata.secret);
			})
		}
	})
});

function getGcode(messageTemplate, socket) {
	prompt.get("Gcode", (err, res) => {
		message = messageTemplate;
		message.command = res["Gcode"];
		socket.emit("command", message);
		setTimeout(() => {
			getGcode(messageTemplate, socket);
		}, 100);
	});
}

function sendFile(filename, message, socket) {
	message.data = makeid(20);
	socket.emit("fileTransfer",message);
	socketStream(socket).once(message.data, function (stream) {
		fs.createReadStream(filename).pipe(stream);
	});
}

function makeid(length) {
	var result = [];
	var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	var charactersLength = characters.length;
	for (var i = 0; i < length; i++) {
		result.push(characters.charAt(Math.floor(Math.random() *
			charactersLength)));
	}
	return result.join('');
}