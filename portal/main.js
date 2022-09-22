//deviceInventory
function deviceInventory(){}

deviceInventory.prototype.init=async function(dom){
    this.DOM= dom
    //existing devices records section
    let devicesDBLbl= $("<div class='w3-padding-16' style='display:inline;margin-right:15px;font-weight:bold'>Devices Records</div>")
    let newRecordBtn=$('<a class="w3-button w3-green" href="#"><i class="fa fa-plus fa-lg"></i></a>')
    this.DOM.append(devicesDBLbl,newRecordBtn)
    newRecordBtn.on("click",async ()=>{
        let dlg= new simpleDialog()
        dlg.show((newDevice)=>{
            this.devicesJson.unshift(newDevice)
            this.redraw()
            //write back to server
            callAPI("saveAllDevices",this.devicesJson)
        })
    })
    this.devicesJson=await callAPI("getAllDevices")
    let devicesDOM=$("<table class='w3-border' style='cursor:default;width:100%;margin-top:5px'></table>")
    devicesDOM.css({"border-collapse":"collapse"})
    this.DOM.append(devicesDOM)
    this.devicesDOM=devicesDOM

    //newly discovered devices section
    let newDevicesLbl= $("<div class='w3-padding-48' style='font-weight:bold'>Newly Discovered Devices</div>")
    this.DOM.append(newDevicesLbl)
    let newDevicesDOM=$("<table class='w3-border' style='cursor:default;width:100%;margin-top:5px'></table>")
    newDevicesDOM.css({"border-collapse":"collapse"})
    this.DOM.append(newDevicesDOM)
    let tr=this.createARow("Discovered Device (New)","Time")
    tr.addClass("w3-text-gray")
    tr.css("font-weight","bold")
    newDevicesDOM.append(tr)
    var newlyDiscoveredDevices=await callAPI("getAllNewlyDiscoveredDevices")
    newlyDiscoveredDevices.forEach(aNewDevice=>{
        var newDate = new Date();
        newDate.setTime(aNewDevice["Timestamp"]);
        dateString = newDate.toUTCString();
        let deleteBtn=$('<button class="w3-bar-item w3-button w3-right w3-hover-amber"><i class="fa fa-trash fa-lg"></i></button>')
        let tr=this.createARow(JSON.stringify(aNewDevice['queryPayload']),dateString)
        tr.find("td:nth-child(3)").append(deleteBtn)
        newDevicesDOM.append(tr)
        deleteBtn.on("click",()=>{
            let index= newlyDiscoveredDevices.indexOf(aNewDevice)
            newlyDiscoveredDevices.splice(index,1)
            tr.remove()
            callAPI("saveNewlyDiscoveredDevices",newlyDiscoveredDevices)
        })
    })
}

deviceInventory.prototype.redraw=function(){
    this.devicesDOM.empty()
    let tr=this.createARow("Query Device Payload","Query Device Result")
    tr.addClass("w3-text-gray")
    tr.css("font-weight","bold")
    this.devicesDOM.append(tr)

    this.devicesJson.forEach(aDevice=>{
        let deleteBtn=$('<button class="w3-bar-item w3-button w3-right w3-hover-amber"><i class="fa fa-trash fa-lg"></i></button>')
        let tr=this.createARow(JSON.stringify(aDevice['queryPayload']),JSON.stringify(aDevice['queryResult']))
        tr.find("td:nth-child(3)").append(deleteBtn)
        this.devicesDOM.append(tr)

        deleteBtn.on("click",()=>{
            let index= this.devicesJson.indexOf(aDevice)
            this.devicesJson.splice(index,1)
            tr.remove()
            callAPI("saveAllDevices",this.devicesJson)
        })
    })
}
deviceInventory.prototype.createARow=function(f1,f2,f3){
    f3=f3||""
    return $('<tr class="w3-hover-light-gray" ><td style="border-right:solid 1px lightgrey;border-bottom:solid 1px lightgrey">'+f1+'</td><td style="border-right:solid 1px lightgrey;border-bottom:solid 1px lightgrey">'+f2+'</td><td style="border-bottom:solid 1px lightgrey">'+f3+'</td></tr>')
}

function simpleDialog(){
    this.DOM = $('<div style="position:absolute;top:50%;background-color:white;left:50%;transform: translateX(-50%) translateY(-50%);z-index:102" class="w3-card-4"></div>')
}

simpleDialog.prototype.show=function(callbackFn){
    this.DOM.append($('<div style="height:45px" class="w3-bar w3-red"><div class="w3-bar-item" style="cursor:default; font-size:1.2em">Add Device</div></div>'))
    
    let closeButton = $('<button class="w3-bar-item w3-button w3-right" style="font-size:1.5em;padding-top:4px">×</button>')
    this.DOM.children(':first').append(closeButton)
    closeButton.on("click", () => { this.DOM.remove()})

    let dialogDiv=$('<div class="w3-container" style="margin-top:10px;margin-bottom:10px;height:calc(100% - 60px)"></div>')
    this.DOM.append(dialogDiv)
    this.dialogDiv=dialogDiv

    let queryPayloadLbl= $("<div class='w3-padding' style='display:inline;'>Query Payload</div>")
    let queryPayloadInput=$('<input type="text" style="margin:8px 0;padding:2px;width:350px;outline:none;display:inline" placeholder=""/>').addClass("w3-input w3-border");

    let queryResLbl= $("<div class='w3-padding' style='display:inline;'>Query Result</div>")
    let queryResInput=$('<input type="text" style="margin:8px 0;padding:2px;width:350px;outline:none;display:inline"/>').addClass("w3-input w3-border");

    this.dialogDiv.append($("<div/>").append(queryPayloadLbl,queryPayloadInput))
    this.dialogDiv.append($("<div/>").append(queryResLbl,queryResInput))
    //this.contentDOM.append($("<div style='padding:8px 0px'/>").append(modelLableDiv,modelInput))

    this.bottomBar=$('<div class="w3-bar"></div>')
    this.DOM.append(this.bottomBar)

    let addButton=$('<button class="w3-ripple w3-button w3-right w3-green" style="margin-right:2px;margin-left:2px">Add</button>')
    addButton.on("click",()=> {
        var payload=queryPayloadInput.val()
        var result=queryResInput.val()
        var newDevice={}
        try{
            newDevice.queryPayload= JSON.parse(payload)
        }catch(e){
            alert("Query payload is not valid JSON: "+payload)
            return
        }
        try{
            newDevice.queryResult= JSON.parse(result)
        }catch(e){
            alert("Query result is not valid JSON:"+result)
            return
        }
        if(callbackFn) callbackFn(newDevice)
    
        this.DOM.remove()
    })
    this.bottomBar.append(addButton)

    $("body").append(this.DOM)
    queryPayloadInput.focus()
}

async function callAPI(APIString,payload){
    const url = new URL(window.location.href);
    return new Promise((resolve, reject) => {
        let ajaxContent={
            type: 'POST',
            url: url.origin+"/"+APIString,
            contentType: "application/json; charset=utf-8",
            crossDomain: true,
            success: function (responseData, textStatus, jqXHR) {
                try{
                    let parseResult=JSON.parse(responseData)
                    resolve(parseResult)
                }catch(e){
                    resolve(responseData)
                }
            },
            dataType:"text",
            error: function (responseData, textStatus, errorThrown) {
                console.log(errorThrown)
                reject(responseData)
            },
            data:JSON.stringify(payload)
        }
        $.ajax(ajaxContent);
    })
}

async function mainUI(){
    let devicesManager=new deviceInventory()
    await devicesManager.init($("#content"))
    devicesManager.redraw()
}

mainUI()