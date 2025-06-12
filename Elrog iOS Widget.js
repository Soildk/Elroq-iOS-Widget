// Config
const HA_URL = "https://ha-url.com";
const TOKEN = Keychain.get("HaToken");

const carImageUrl = "https://ha-url.com/local/images/Elroq_side.png";
const carCableUrl = "https://ha-url.com/local/images/Elroq_cablewhite.png";
const carChargingUrl = "https://ha-url.com/local/images/Elroq_charging.png";

var widget = new ListWidget();
widget.setPadding(22, 12, 12, 12);

// Sensor
async function fetchSensor(entityId) {
    const req = new Request(`${HA_URL}/api/states/${entityId}`);
    req.headers = {
        "Authorization": `Bearer ${TOKEN}`,
        "Content-Type": "application/json"
    };
    return await req.loadJSON();
}

// Image
async function fetchImage(url) {
    const req = new Request(url);
    return await req.loadImage();
}

// Entity Value
async function getEntityValue(sensorName) {
    let state;

    try {
        const data = await fetchSensor(sensorName);
        state = data.state;

    } catch (e) {
        state = `${sensorName}: ⚠️`;
    }

 return state;
}

//Two coloured row
async function addTwoColouredRow(firstText, secondText) {
    let row = widget.addStack();

    let leftSpaceStack = row.addStack();
    leftSpaceStack.size = new Size(40, 22);
    
    let leftStack = row.addStack();
    leftStack.size = new Size(90, 22);

    let rightStack = row.addStack();

    let rightSpaceStack = row.addStack();
    rightSpaceStack.size = new Size(40, 22);
    rightSpaceStack.addSpacer();
    
    let rowLabel = leftStack.addText(firstText);
    rowLabel.textColor = Color.lightGray();
    leftStack.addSpacer();

    rightStack.addSpacer();
    let rowValue = rightStack.addText(secondText);
    rowValue.textColor = Color.white();

    rowValue.font = Font.systemFont(16);
}

// Widget
async function createWidget() {
    let imageUrl;
   

    // Check the charging state
    let chargingState = await getEntityValue("sensor.skoda_elroq_charging_state");
    let chargerConnected = await getEntityValue("binary_sensor.skoda_elroq_charger_connected");
    
    if (chargerConnected == "on") {
        imageUrl = carCableUrl;
        if (chargingState == "charging") {
            imageUrl = carChargingUrl;
        }
    } else {
        imageUrl = carImageUrl;
    }

    try {
        const image = await fetchImage(imageUrl);
        const img = widget.addImage(image);
        
        img.centerAlignImage();
    } catch (e) {
        const errorText = widget.addText("⚠️ Image failed to load");

    }
    widget.addSpacer(22);

    let currentPercentage = await getEntityValue("sensor.skoda_elroq_battery_percentage");
    let currentRange = await getEntityValue("sensor.skoda_elroq_range");
    let currentMileage = await getEntityValue("sensor.skoda_elroq_mileage");
    let outsideTemperature = await getEntityValue("sensor.skoda_elroq_outside_temperature");

    let lastChargedPercentage = await getEntityValue("input_text.last_charged_percentage");
    let lastChargedMileage = await getEntityValue("input_text.last_charged_mileage");

    const batteryUsed = lastChargedPercentage - currentPercentage;
    const distanceDriven = currentMileage - lastChargedMileage;

    let energyUsed = (batteryUsed / 100) * 60; // 60 kWh is what the Elroq's 100% is
    energyUsed = Math.round(energyUsed * 100) / 100;
    let efficiency = distanceDriven / energyUsed;
    efficiency = Math.round(efficiency * 100) / 100;

    addTwoColouredRow("Battery: ", `${currentPercentage}% / ${currentRange} km`)
    addTwoColouredRow("Mileage: ", `${currentMileage} km`)
    addTwoColouredRow("Outside: ", `${outsideTemperature} °C`)

    widget.addSpacer();

    let row = widget.addStack();
    let leftSpaceStack = row.addStack();
    leftSpaceStack.size = new Size(40, 22);

    rowLabel = row.addText(`Since Last Charge:`);
    rowLabel.textColor = Color.lightGray();
    rowLabel.font = Font.boldSystemFont(16);

    addTwoColouredRow("Distance: ", `${distanceDriven} km`)
    addTwoColouredRow("Used: ", `${energyUsed} kWh`)
    addTwoColouredRow("Efficiency: ", `${efficiency} km/kWh`)

}

// ===== Run Script =====
await createWidget();
widget.refreshAfterDate = new Date(Date.now() + 10 * 60 * 1000); // refresh in 10 minutes

Script.setWidget(widget);
Script.complete();

