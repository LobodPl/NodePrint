
function hideall() {
    $("#Dashboard").addClass("hide")
    $("#PrinterList").addClass("hide")
    $("#Options").addClass("hide")
}
$("#DashboardButton").click(() => {
    hideall()
    $("#Dashboard").removeClass("hide")
})
$("#PrinterListButton").click(() => {
    hideall()
    $("#PrinterList").removeClass("hide")
})
$("#OptionsButton").click(() => {
    hideall()
    $("#Options").removeClass("hide")
})
$("#SendGcode").click(() => {
    let command = $("#command")[0].value;
    $("#command")[0].value = "";
    socket.emit("command", { id: $(".printerid",$("#PrinterTerminal"))[0].value, "command": command })

})
$("#SaveSettings").click(() => {
    if ($("#printernameinput")[0].value != $("#printername")[0].innerText) {
        socket.emit("setPrinterName", { id: $("#printerid")[0].value, "newname": $("#printernameinput")[0].value })
    }
    if ($("#comport").val() != "NoChange") {
        socket.emit("setPrinterPort", { "id": $("#printerid")[0].value, "port": $("#comport").val()})
    }
})

var selectModal = null
var settingsModal = null
var terminalModal = null
let modalDrawdone = true;
let selectedFile = null;

let currentid = null;

function openPrinterSelectModal(name) {
    selectedFile = name;
    selectModal.open();
    modalDrawdone = false;
    socket.emit("getPrinterList");
}

function openPrinterSettingsModal(id) {
    settingsModal.open();
    $("#printerid")[0].value = id;
    socket.once("getPortList", function (response) {
        $("#printernameinput")[0].value = (response.name != null ? response.name : "Printer");
        $("#printername")[0].innerText = (response.name != null ? response.name : "");

        $("#comport")[0].innerHTML = `<option value="NoChange">No Change</option>`;
        const ports = JSON.parse(response.ports)
        for (port of ports) {
            $("#comport")[0].innerHTML += `<option value="${port.path}">${port.path} - ${port.manufacturer}</option>`
        }
    })
    socket.emit("getPortList", id);
}

function openPrinterTerminalModal(id) {
    terminalModal.open();
    currentid = id;
    $(".printerid",$("#PrinterTerminal"))[0].value = id;
    $("#Terminal")[0].value = ""

}


function modalPrintFile(id) {
    if (selectedFile != null) {
        socket.emit("sendFile", [id, selectedFile]);
        selectedFile = null;
    }
    selectModal.close();
}

function deletefile(name) {
    socket.emit("deleteFile", name);

}
$(document).ready(function () {
    $('.sidenav').sidenav();
    $('.modal').modal();
    selectModal = M.Modal.getInstance($("#PrinterSelectmodal")[0]);
    settingsModal = M.Modal.getInstance($("#PrinterSettings")[0]);
    terminalModal = M.Modal.getInstance($("#PrinterTerminal")[0]);
    settingsModal.options.dismissible = false;
    terminalModal.options.dismissible = false;

});