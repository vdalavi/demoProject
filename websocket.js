const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const sql = require('mssql');
const mongooseLib = require('mongoose');
const MongoDBConnectedDb = require('./mongodb');
const { count } = require('console');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const config = {
  user: 'vijayuser',
  password: 'vijayuser@123',
  server: 'DESKTOP-R58USEU',
  database: 'SandMan',
  options: {
    trustServerCertificate: true, 
  },
};

let rownum = 0;

async function createPatObjects(socket){
  await sql.connect(config);
  const rowscount = MongoDBConnectedDb.collection('rowscount');
  const query = {_id:"MouldRecord"};
  const rows = await rowscount.findOne(query);
  const sqlQuerym = `select * from (select ROW_NUMBER() over (order by (timestamp))rownum, TimeStamp, PatNo, OkQty from MouldRecord) as tbl where rownum>${+rows['counter']} and rownum<= ${+rows['counter']+10}`
  // const sqlQuerym = `select * from (select ${+rows['counter']} - 1 + row_number() over (order by (select NULL)) as rownum, TimeStamp from MouldRecord) as tbl where rownum between ${+rows['counter']} and ${+rows['counter']+10}`
  const resultall = await sql.query(sqlQuerym);
  console.log(resultall.recordset[0]['PatNo'].trim(), rows, resultall.recordset);
const qtyPerHit = 17;
let okQty = 0;
let badQty = 0;
let sets = [];
let alarmnolist = [];
if(resultall.recordset[0]['patno'].trim()== rows['patno']){
    okQty += 1;
}else{
  badQty += 1;
}
for (let i = 0; i < resultall.recordset.length - 1; i++) {
  const currentRow = resultall.recordset[i];
  const nextRow = resultall.recordset[i + 1];

  if (+currentRow.PatNo.trim() === +nextRow.PatNo.trim()) {
    if (+nextRow.OkQty.trim() === +currentRow.OkQty.trim() + 1) {
      okQty += 1;
    } else {
      badQty += 1;
      // okQty += nextRow.OkQty - currentRow.OkQty;
    }
  }


  // Check if it's time to create a new set
  if ((i + 1) % qtyPerHit === 0 || i === resultall.recordset.length - 1) {
    
    const set = {
      patno: currentRow.PatNo,
      okqty: okQty,
      badqty: badQty,
      // startdaydowntime: 338, 
      // enddaydowntime: 373,  
      starttime: resultall.recordset[i - qtyPerHit + 1].TimeStamp, 
      endtime: currentRow.TimeStamp, 
      srnoFrom: i - qtyPerHit + 2, 
      srnoto: i + 1, 
      shfitno: currentRow.ShiftNo    
    };
    socket.emit("data", set);
    console.log("object set", typeof(set));
    console.log(JSON.stringify(set));
    sets.push(set);
    // console.log("set ::::::::              ", JSON.stringify(set));
    // Reset counters for the next set
    okQty = 0;
    badQty = 0;
  }

}

// MongoDBConnectedDb.collection("partNoObjects").insertMany(sets);
console.log(resultall.recordset.slice(-1)[0]['rownum']);
const updatemongo = await rowscount.updateOne({_id:"MouldRecord"}, {$set:{counter:resultall.recordset.slice(-1)[0]['rownum']}});
// Print the sets (you can use the sets variable as needed)
// console.log(sets);

}


async function createPatObjects_2(socket){
  await sql.connect(config);
  const query = `select top 50 *  from (select ROW_NUMBER() over (order by (timestamp)) as rownum, TimeStamp, PatNo, OkQty from MouldRecord) as tbl  `; 
// const sql = `select * from (select ROW_NUMBER() over (order by (select null))rownum, TimeStamp from MouldRecord) as tbl where rownum>=1 and rownum<10`
  const resultall = await sql.query(query);

  const partNoObjects = MongoDBConnectedDb.collection('partNoObjects');
  const rowscount = MongoDBConnectedDb.collection('rowscount');
  const squery = {_id:"MouldRecord"};
  const rows = await rowscount.findOne(squery);
  console.log("rows : ", rows);
  // const itemmaster = MongoDBConnectedDb.collection('itemmaster');
  // const mongoqueryForPartQty = `({hid:"HN8"}, {qty:1})`;
  // const resultFormongoqueryForPartQty = await itemmaster.findOne(mongoqueryForPartQty);
  // const qtyPerHit = resultFormongoqueryForPartQty['qty'];
  // console.log("qtyPerHit : ", qtyPerHit);

const qtyPerHit = 17;
let okQty = 0;
let badQty = 0;
let sets = [];
let alarmnolist = [];
for (let i = 0; i < resultall.recordset.length - 1; i++) {
  const currentRow = resultall.recordset[i];
  const nextRow = resultall.recordset[i + 1];

  if (+currentRow.PatNo.trim() === +nextRow.PatNo.trim()) {
    if (+nextRow.OkQty.trim() === +currentRow.OkQty.trim() + 1) {
      okQty += 1;
    } else {
      badQty += 1;
      // okQty += nextRow.OkQty - currentRow.OkQty;
    }
  }


  // Check if it's time to create a new set
  if ((i + 1) % qtyPerHit === 0 || i === resultall.recordset.length - 1) {
    
    const set = {
      patno: currentRow.PatNo,
      okqty: okQty,
      badqty: badQty,
      // startdaydowntime: 338, 
      // enddaydowntime: 373,  
      starttime: resultall.recordset[i - qtyPerHit + 1].TimeStamp, 
      endtime: currentRow.TimeStamp, 
      srnoFrom: i - qtyPerHit + 2, 
      srnoto: i + 1, 
      shfitno: currentRow.ShiftNo    
    };
    socket.emit("data", set);
    console.log("object set", typeof(set));
    console.log(JSON.stringify(set));
    sets.push(set);
    // console.log("set ::::::::              ", JSON.stringify(set));
    // Reset counters for the next set
    okQty = 0;
    badQty = 0;
  }

}

MongoDBConnectedDb.collection("partNoObjects").insertMany(sets);
// Print the sets (you can use the sets variable as needed)
// console.log(sets);

}

async function itemdata(){
  const rowscount = MongoDBConnectedDb.collection('itemmaster');
  const query = {};
  const rows = await rowscount.find(query).toArray();
  return rows;
}

async function shiftdata(){
  const shiftdata = MongoDBConnectedDb.collection('shiftmaster');
  const query = {};
  const rows = await shiftdata.find(query).toArray();
  return rows;
}


let okQty = 0;
let badQty = 0;
let sets = [];
async function fetchDataAndSendToClient(socket) {
  try {
    await sql.connect(config);
    const rowscount = MongoDBConnectedDb.collection('rowscount');
    const query = {_id:"MouldRecord"};
    const rows = await rowscount.findOne(query);
    const mongoresultForGetAllParts = await itemdata();
    const mongoresultForGetShift = await shiftdata();
    console.log(rows);
    const sqlQuerym = `select * from (select ROW_NUMBER() over (order by (timestamp))rownum, TimeStamp, PatNo, OkQty from MouldRecord) as tbl where rownum>${+rows['counter']} and rownum<= ${+rows['counter']+10}`
    const resultall = await sql.query(sqlQuerym);

    let qtyPerHit = 17;

let alarmnolist = [];
console.log(  resultall.recordset[0].PatNo.trim() , " ::::::::::::::::     ", resultall.recordset[0] );
if(resultall.recordset[0]['PatNo'].trim()== rows['currentjson']['PatNo'].trim()){
  if(+resultall.recordset[0]['OkQty'].trim() == +rows['currentjson']['OkQty'].trim() + 1 ){
    okQty += 1;
  }else{
    badQty += 1;
  }
}else{
okQty = 0;
badQty = 0;
}
for (let i = 0; i < resultall.recordset.length - 1; i++) {
  const currentRow = resultall.recordset[i];
  const nextRow = resultall.recordset[i + 1];

  if (+currentRow.PatNo.trim() === +nextRow.PatNo.trim()) {
    if (+nextRow.OkQty.trim() === +currentRow.OkQty.trim() + 1) {
      okQty += 1;
    } else {
      badQty += 1;
      // okQty += nextRow.OkQty - currentRow.OkQty;
    }
  }else{
    qtyPerHit = mongoresultForGetAllParts.find((ele) => {
      ele.hid = nextRow.PatNo.trim();
    });
    console.log("qtyPerHit :: ", mongoresultForGetAllParts, typeof(mongoresultForGetAllParts),  qtyPerHit);
  }


  // Check if it's time to create a new set
  // if ((i + 1) % qtyPerHit === 0 || i === resultall.recordset.length - 1) {
  if (okQty % qtyPerHit === 0 ) {
    
    const set = {
      patno: currentRow.PatNo,
      okqty: okQty,
      badqty: badQty,
      // startdaydowntime: 338, 
      // enddaydowntime: 373,  
      // starttime: , 
      // starttime: resultall.recordset[i - qtyPerHit + 1].TimeStamp, 
      endtime: currentRow.TimeStamp, 
      srnoFrom: i - qtyPerHit + 2, 
      srnoto: i + 1, 
      shfitno: currentRow.ShiftNo    
    };
    socket.emit("data", set);
    sets.push(set);
    badQty = 0;
    okQty = 0;
  }

}

    // socket.emit('data', result.recordset);  
    const updatemongo = await rowscount.updateOne({_id:"MouldRecord"}, {$set:{counter:resultall.recordset.slice(-1)[0]['rownum'], currentjson : resultall.recordset.slice(-1)[0]}});
  } catch (error) {
    console.error('Error fetching data:', error.message);
  } finally {
    await sql.close();
  }
}



async function getShiftForTimestamp(shifts, timestamp) {
  console.log("timestamp ::::::::::::: ", timestamp);
  const date = new Date(timestamp);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const timestampMinutes = hours * 60 + minutes;

  // Find the shift where the timestamp lies
  for (const shift of shifts) {
      const startMinutes = await convertToMinutes(shift.starttime);
      const endMinutes = await convertToMinutes(shift.endtime);

      if (timestampMinutes >= startMinutes && timestampMinutes <= endMinutes) {
          return shift;
      }
  }
  return null;
}
async function convertToMinutes(time) {
    // Convert time in HH:MM format to minutes
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
}

async function getPartnameForPartNo(data, partno) {
  const result = data.find((ele) => 
  ele.partnumber.trim() === partno)
  if(result){
    return result.partname;
  }
  return null;
}


async function createPatObjects30jan(socket){
  try{
    await sql.connect(config);
    const rowscount = MongoDBConnectedDb.collection('rowscount');
    const query = {_id:"MouldRecord"};
    const rows = await rowscount.findOne(query);
    // console.log("rows :::::: ", rows);
    const mongoresultForGetAllParts = await itemdata();
    const mongoresultForGetShift = await shiftdata();
    const sqlQuerym = `select * from (select ROW_NUMBER() over (order by (timestamp))rownum, TimeStamp as tstamp, PatNo, OkQty from MouldRecord) as tbl where rownum>${+rows['counter']} and rownum<= ${+rows['counter']+10}`
    const resultall = await sql.query(sqlQuerym);
    console.log("result all :::::::: ", resultall);
    let PatNoArr = [], qtyPerHit;

    if(resultall.recordset[0]['PatNo'].trim()== rows['currentjson']['PatNo'].trim()){

      qtyPerHit = mongoresultForGetAllParts.find((ele) => 
      ele.partnumber === resultall.recordset[0]['PatNo'].trim()).qty;
      if(+resultall.recordset[0]['OkQty'].trim() == +rows['currentjson']['OkQty'].trim() + 1 ){
        okQty += 1;
      }else{
        badQty += 1;
      }
      if (okQty % qtyPerHit === 0 ) {
        let shiftname, partname;
        const shiftDetail = await getShiftForTimestamp(mongoresultForGetShift, resultall.recordset[0]['tstamp']);
        partname = await getPartnameForPartNo(mongoresultForGetAllParts, resultall.recordset[0]['PatNo'].trim());
        if(shiftDetail){
          shiftname = shiftDetail.shiftname
        }else{
          shiftname = '';
        }
          const set = {
            patno: resultall.recordset[0].PatNo,
            partname:partname?partname:'',
            okqty: okQty,
            badqty: badQty,
            // starttime: resultall.recordset[i - qtyPerHit + 1].TimeStamp, 
            shiftname : shiftname,
            endtime: resultall.recordset[0].tstamp,
            shfitno: resultall.recordset[0].ShiftNo    
          };
          console.log("set :::::::: ", set);
          socket.emit("data", set);
          sets.push(set);
          badQty = 0;
          okQty = 0;
        }

    }else{
    okQty = 0;
    badQty = 0;
    }

    for (let i = 0; i < resultall.recordset.length - 1; i++) {
      if(PatNoArr.includes(resultall.recordset[i]['PatNo'].trim())){
        continue;
      }else{
        PatNoArr.push(resultall.recordset[i]['PatNo'].trim());
      }
      const filteredrecords = resultall.recordset.filter((ele) => ele.PatNo.trim() == resultall.recordset[i]['PatNo'].trim());
      qtyPerHit = mongoresultForGetAllParts.find((ele) => 
            ele.partnumber.trim() === resultall.recordset[i]['PatNo'].trim()
      ).qty;
      for(let j = 0; j< filteredrecords.length - 1; j++){
        const currentRow = filteredrecords[j];
        const nextRow = filteredrecords[j + 1];
        if (+currentRow.PatNo.trim() === +nextRow.PatNo.trim()) {
          if (+nextRow.OkQty.trim() === +currentRow.OkQty.trim() + 1) {
            okQty += 1;
          } else {
            badQty += 1;
          }
        }
      // console.log("qtyPerHit in Filtered for Loop ::::::::: ", qtyPerHit);
        if (okQty % qtyPerHit === 0 ) {
        let shiftname, partname;
        const shiftDetail = await getShiftForTimestamp(mongoresultForGetShift, currentRow['tstamp']);
        partname = await getPartnameForPartNo(mongoresultForGetAllParts, currentRow['PatNo'].trim());
        if(shiftDetail){
          shiftname = shiftDetail.shiftname
        }else{
          shiftname = '';
        }
          const set = {
            patno: currentRow.PatNo,
            partname:partname?partname:'',
            okqty: okQty,
            badqty: badQty,
            // starttime: resultall.recordset[i - qtyPerHit + 1].TimeStamp, 
            shiftname : shiftname,
            endtime: currentRow.tstamp, 
            // srnoFrom: i - qtyPerHit + 2, 
            // srnoto: i + 1, 
            shfitno: currentRow.ShiftNo    
          };
          console.log("set :::::::: ", set);
          socket.emit("data", set);
          sets.push(set);
          badQty = 0;
          okQty = 0;
        }
      }
    }

    const updatemongo = await rowscount.updateOne({_id:"MouldRecord"}, {$set:{counter:resultall.recordset.slice(-1)[0]['rownum'], currentjson : resultall.recordset.slice(-1)[0]}});
  }catch(error){
    console.error(error);
  }
}

io.on('connection', (socket) => {
  console.log('Client connected');

  const fetchDataInterval = setInterval(() => {
    createPatObjects30jan(socket);
    // fetchDataAndSendToClient(socket);
  }, 5000); 

  socket.on('disconnect', () => {
    console.log('Client disconnected');
    clearInterval(fetchDataInterval);
  });
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

server.listen(3000, () => {
  console.log('Server listening on port 3000');
});
