
class DatabaseWorker{
    db = null;
    constructor(){
        this.db = require('better-sqlite3')('db\\NodePrint.db', { verbose: console.log });
    }
    getSecretById(printerId){
        const row = this.db.prepare('SELECT SecretKey FROM Nodes WHERE Id = ?').get(printerId);
        if(row) return row.SecretKey;
        else return 0;
    }
    getPrinterNameById(printerId){
        const row = this.db.prepare('SELECT Name FROM Nodes WHERE Id = ?').get(printerId);
        if(row) return row.Name;
        else return 0;
    }
    setPrinterNameById(newname,printerId){
        const row = this.db.prepare('UPDATE Nodes SET Name = ? WHERE Id = ?').run(newname, printerId);
    }
    storeSecretWithId(printerId,secretKey){
        const row = this.db.prepare('INSERT INTO Nodes VALUES (?,?,null)').run(printerId,secretKey);
    }

}

module.exports = new DatabaseWorker();