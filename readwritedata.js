const express = require('express');
const http = require('http');
const sql = require('mssql');
const MongoDBConnectedDb = require('./mongodb');
const moment = require('moment');

const storedRecordInDB = MongoDBConnectedDb.collection('referencerecord');
const heatRecords = MongoDBConnectedDb.collection('heatRecords');
const app = express();
const server = http.createServer(app);

const config = {
  user: 'vijayuser',
  password: 'vijayuser@123',
  server: 'DESKTOP-R58USEU',
  database: 'SandMan',
  options: {
    trustServerCertificate: true, 
  },
};

sql.connect(config);


let currentBatchObj = {
    partNo: 1234,
    curTimeStamp: "XXXX",
    okQty: 97,
    okCount: 1,
    dwonTime:''
 }


 let RefRecord = {
    currentTimeStamp : '',
    startTimestamp : '',
    partNo : '',
    okQty : '',
    ngQty : ''

}

okheatqty = 9;
const callProcessRecordsFunction = async () => {
    await sql.connect(config);
    await processRecords();
}

// At First time set currentTimeStamp = '2022-07-09 04:51:38.543'
RefRecord.currentTimeStamp = moment('2022-07-09T04:31:25.610Z').format('YYYY-MM-DD  HH:mm:ss.ms');
const processRecords = async () => {
    console.log("RefRecord.currentTimeStamp :::: ", RefRecord.currentTimeStamp);
    let records = await getRecordsFromDB(RefRecord.currentTimeStamp);
    console.log("records :::: ", records.recordset);
    for(const record of records.recordset){
        if (record.partNo.trim() != RefRecord.partNo){
            if (RefRecord.partNo ) {
                RefRecord.endTimestamp = RefRecord.currentTimeStamp;
                // writeor update MainRecord()
                writeHeatRecord()
            }

            // this is the first record that is going to be saved so...
            RefRecord.partNo = record.partNo.trim();
            RefRecord.startTimestamp = record.timeStamp;
            RefRecord.endTimestamp = record.timeStamp
            RefRecord.okQty = record.okQty.trim();
            RefRecord.okQtyCount = 1;
            RefRecord.ngQty = record.ngQty.trim();
            RefRecord.ngQtyCount = 0; 
            await updateStoredRefRecordInDB(record.timeStamp, record.partNo.trim(), record.okQty.trim(), record.ngQty.trim());
        }else {
            // record.partNo == RefRecord.partNo
            RefRecord.okQtyCount = +record.okQty.trim() - +RefRecord.okQty.trim()
            RefRecord.ngQtyCount = +record.ngQty.trim() - +RefRecord.ngQty.trim()
            // RefRecord.okQty = record.okQty
            // RefRecord.ngQty = record.ngQty
            RefRecord.endTimestamp = record.timeStamp
            if (RefRecord.okQtyCount == okheatqty) {
                writeHeatRecord(RefRecord.okQtyCount, RefRecord.ngQtyCount, RefRecord.startTimestamp, RefRecord.endTimestamp);
                RefRecord.currentTimeStamp = RefRecord.endTimestamp
                await updateStoredRefRecordInDB(RefRecord.currentTimeStamp, record.partNo.trim(), record.okQty.trim(), record.ngQty.trim());
                RefRecord.okQtyCount = 0;
                RefRecord.okQty = record.okQty.trim();
                RefRecord.ngQty = record.ngQty.trim();
            }
        }
    }
    setTimeout(processRecords, 10000);

 }


const getRecordsFromDB = async (currentTimeStamp) => {

    const sqlQueryForgetRecordsFromDB = `SELECT TOP 10 TimeStamp as timeStamp, PatNo as partNo, OkQty as okQty, NGQty as ngQty, DayDownTime as dayDownTime, ShiftNo as shiftNo
                                        FROM MouldRecord
                                        WHERE TimeStamp > '${new Date(currentTimeStamp).toISOString()}'
                                        ORDER BY TimeStamp ASC`;
    console.log(sqlQueryForgetRecordsFromDB, typeof(currentTimeStamp));
    const resultForgetRecordsFromDB = await sql.query(sqlQueryForgetRecordsFromDB);
    return resultForgetRecordsFromDB;

}

const updateStoredRefRecordInDB = async (currentTimeStamp, partNo, okQty, ngQty) => {
    const updatemongo = await storedRecordInDB.updateOne({_id:"MouldRecord"}, {$set:{currentTimeStamp : currentTimeStamp, partNo : partNo, okQty : okQty, ngQty : ngQty}});
    
}

 const writeHeatRecord = async(okQtyCount, ngQtyCount, startTimestamp, endTimestamp ) => {
    const HeatRecord = {
        batchID: '',
        okQty : okQtyCount,
        ngQty : ngQtyCount,
        startTimestamp : startTimestamp,
        endTimestamp : endTimestamp,
        delayDuration : '',
        delayReason : '',
        HeatNo : '',
        bloster : '',
    }

    const writeHeatRecordToDb = await heatRecords.insertOne(HeatRecord);
 }

 app.get("/processData" , callProcessRecordsFunction);



 server.listen(3000, () => {
    console.log('Server listening on port 3000');
  });