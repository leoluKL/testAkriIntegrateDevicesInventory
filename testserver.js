import express from 'express'
import {open} from 'node:fs/promises';
import { readFileSync } from 'node:fs';

const app = express();
app.use(express.json());
app.use(express.urlencoded({extended: true}));

app.use(express.static('portal'));


var globalDevicesRecords=[];
var discoveredNewDevices=[];

function readAllDevicesRecords(){
  var dbFileName='deviceRecords.json'
  var fileContent = readFileSync(dbFileName,'utf8');
  try{
    globalDevicesRecords=JSON.parse(fileContent)
  }catch(e){
    console.error(`Invalid JSON in ${dbFileName}`)
  }

  var newDevicesFileName='newDiscoveredDevices.json'
  var fileContent = readFileSync(newDevicesFileName,'utf8');
  try{
    discoveredNewDevices=JSON.parse(fileContent)
  }catch(e){
    console.error(`Invalid JSON in ${newDevicesFileName}`)
  }
}
readAllDevicesRecords()

function recordNewlyDiscoveredDevice(newDeviceQueryPayload){
  var [targetDevice,i]=matchDeviceInArray(newDeviceQueryPayload,discoveredNewDevices);
  if(targetDevice!=null)  {
    targetDevice.Timestamp= Date.now()
    discoveredNewDevices.splice(i,1)
    discoveredNewDevices.unshift(targetDevice)
  }else {
    discoveredNewDevices.unshift({"queryPayload":newDeviceQueryPayload, "Timestamp":Date.now()}) 
  }
  writeNewlyDiscoveredDevices()
}

function matchDeviceInArray(deviceQueryPayload,devicesArr){
  var targetDevice=null
  for(var i=0;i<devicesArr.length;i++){
    var oneDevice=devicesArr[i]
    var queryProtocol = deviceQueryPayload.protocol;
    if(queryProtocol=="Onvif"){
      if(deviceQueryPayload.ip_and_mac_joined == oneDevice.queryPayload.ip_and_mac_joined){
        targetDevice= oneDevice;
        break;
      }
    }else if (queryProtocol=="DebugEcho"){
      if(deviceQueryPayload.id == oneDevice.queryPayload.id){
        targetDevice= oneDevice;
        break;
      }
    }else if (queryProtocol=="udev"){
      if(deviceQueryPayload.name == oneDevice.queryPayload.name && deviceQueryPayload.node_name == oneDevice.queryPayload.node_name ){
        targetDevice= oneDevice;
        break;
      }
    }else if (queryProtocol=="OPC"){
      if(deviceQueryPayload.discovery_url == oneDevice.queryPayload.discovery_url){
        targetDevice= oneDevice;
        break;
      }
    }
  }

  return [targetDevice,i];
}

async function writeNewlyDiscoveredDevices(){
  var newDevicesFileName='newDiscoveredDevices.json'
  var content = JSON.stringify(discoveredNewDevices)
  let filehandle=null;
  try{
    filehandle = await open(newDevicesFileName, 'w');
    await filehandle.write(content);
  } finally{
    filehandle?.close();
  }
}

app.post("/getAllDevices", (req,res)=>{
  res.set('Content-Type', 'application/json');
  res.send(globalDevicesRecords)
})

app.post("/getAllNewlyDiscoveredDevices", (req,res)=>{
  res.set('Content-Type', 'application/json');
  let needSave=false
  for(var i=discoveredNewDevices.length-1;i>=0;i--){
    var newDevice = discoveredNewDevices[i];
    let [targetDevice, index]= matchDeviceInArray(newDevice.queryPayload,globalDevicesRecords)
    if(targetDevice) {
      discoveredNewDevices.splice(i,1)
      needSave=true
    }
  }
  res.send(discoveredNewDevices)
  if(needSave) writeNewlyDiscoveredDevices
})


app.post("/saveAllDevices", async (req,res)=>{
  var dbFileName='deviceRecords.json'
  globalDevicesRecords=req.body;
  var content = JSON.stringify(req.body)
  let filehandle=null;
  try{
    filehandle = await open(dbFileName, 'w');
    await filehandle.write(content);
  } finally{
    res.end()
    filehandle?.close();
  }
})

app.post("/saveNewlyDiscoveredDevices", async (req,res)=>{
  var dbFileName='newDiscoveredDevices.json' 
  discoveredNewDevices=req.body;
  var content = JSON.stringify(req.body)
  let filehandle=null;
  try{
    filehandle = await open(dbFileName, 'w');
    await filehandle.write(content);
  } finally{
    res.end()
    filehandle?.close();
  }
})


app.post("/queryDevice", (req,res)=>{
  var [targetDevice,i]=matchDeviceInArray(req.body,globalDevicesRecords)
  if(targetDevice!=null)  res.send(targetDevice.queryResult)
  else {
    res.end()
    //also record this new device into newDiscoveredDevices
    recordNewlyDiscoveredDevice(req.body)
  }
})



const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log('Start http server on port ' + port);
});




/* 
  let filehandle=null;
  fs.stat(dbFileName,async (err, stats) => {
    if (err) {
      res.end()
    } else {
        let fileSize=stats.size;
        var buffer = new Buffer.alloc(fileSize);
        try{
          filehandle = await open(dbFileName, 'r');
          await filehandle.read(buffer,0, buffer.length, 0);
          res.set('Content-Type', 'application/json');
          res.send(buffer.toString())
        } catch(e){
          res.end()
        }finally{
          filehandle?.close();
        }
    }
  });
  */