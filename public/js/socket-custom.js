var socket = io("/web");
socket.on("connect", () => {
    socket.emit("getFileList");
    socket.emit("getPrintersStatus");
    socket.emit("getMessages");
})
socket.on("getPrintersStatus", (status) => {
    StatusChart.data.datasets[0].data = [status.Printing, status.Downloading, status.Idle, status.Error]
    StatusChart.update();
})
socket.on("getFileList", function (fileList) {
    $("#filelist")[0].innerHTML = "";
    for (file of fileList) {
        $("#filelist")[0].innerHTML += '<tr><td class="center">' + file + '</td><td width="12%"><a class="waves-effect print waves-light btn blue"><i class="material-icons">print</i></a></td><td width="12%"><a class="waves-effect waves-light btn delete red"><i class="material-icons">delete</i></a></td><td  width="12%"><a class="waves-effect waves-light btn" href="/gcode/' + file + '"><i class="material-icons">file_download</i></a></td></tr>'
    }
    $(".print").click(function (e) {
        openPrinterSelectModal(e.currentTarget.parentNode.parentNode.firstChild.innerText)
    })
    $(".delete").click(function (e) {
        deletefile(e.currentTarget.parentNode.parentNode.firstChild.innerText)
    })
})
socket.on("getPrinterList", function (printers) {
    if (!modalDrawdone) $("#printerlist")[0].innerHTML = "";
    $("#printerwraper")[0].innerHTML = "";
    for (printer of printers) {
        $("#printerwraper")[0].innerHTML += `<div class="col s3 m3">
            <div class="card tab-color">
                <div class="card-content white-text">
                    <span class="card-title">${printer.name == null ? "Printer" : printer.name}</span>
                    <div class="divider"></div>
                    <div class="right printer-list-gear"><input hidden type="text" disabled value="${printer.id}"></input><a href="#"class="printerSettings white-text"><i 
                        class="material-icons">settings</i></a><br><a href="#" class="printerTerminal white-text"><i class="material-icons">article</i></a></div>
                    <div class="circle center ${printer.status == "Idle" ? "green" : "red"} printer-list-circle"><i
                            class="material-icons printer-list-icon">print</i></div>
                    
                    <div class= "center"><p class = "printer-list-status">Status: <span>${printer.status}</span></p><div class="btn red waves-effect"><i class="material-icons left">report</i>EMERGENCY STOP</div></div>
                </div>
            </div>
        </div>`
        if (!modalDrawdone) {
            $("#printerlist")[0].innerHTML += `<li class="collection-item avatar tab-color">
                <input hidden type="text" disabled value="${printer.id}"></input>
                <i class="material-icons circle printerLogo ${printer.status == "Idle" ? "green" : "red"}">print</i>
                <span class="title">${printer.name == null ? "Printer" : printer.name}</span>
                <p>Status: ${printer.status}</p>
                <a href="#!" id="last" class="secondary-content btn confirmPrint waves-effect waves-light gray ${printer.status == "Idle" ? "" : "disabled"}">
                    <i class="material-icons">print</i>
                </a>
            </li>`
        }
    }
    if ($("#printerlist")[0].innerHTML == "") {
        $("#printerlist")[0].innerHTML = '<p class="center">Sorry, no connected printers</p>';
    } else {
        $(".confirmPrint").click(function (e) {
            modalPrintFile(e.currentTarget.parentNode.firstElementChild.value)
        })
    }
    if ($("#printerwraper")[0].innerHTML != "") {
        $(".printerSettings").click(function (e) {
            openPrinterSettingsModal(e.currentTarget.parentNode.firstChild.value)
        })
        $(".printerTerminal").click(function (e) {
            openPrinterTerminalModal(e.currentTarget.parentNode.firstChild.value)
        })
    }
    if(!modalDrawdone) modalDrawdone = true;
})
socket.on("log-message", function (message) {
    let d = new Date(message.date)
    var n = d.toLocaleTimeString();
    $("#message-wraper")[0].innerHTML += `<div class="message "><div class="time">[${n}]</div><div class="log-message">[<span class = "${message.class}">${message.tag}</span>] ${message.text}</div></div>`
    $("#message-wraper")[0].scrollTo(0, $("#message-wraper")[0].scrollHeight)
})
socket.on("printerlog", function (message) {
    if(currentid == message.id && terminalModal.isOpen){
        $("#Terminal")[0].value += message.message+"\n"
        $("#Terminal")[0].scrollTop =$("#Terminal")[0].scrollHeight;
    }
})
setInterval(() => {
    socket.emit("getPrintersStatus");
    if (modalDrawdone) {
        socket.emit("getPrinterList");
    }
}, 1000);