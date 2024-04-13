const deltaEmission = function() {
    const now = new Date().getTime();
    let lastConsumption = 1 * $('#startConsumption').attr('data');
    let deltaConsumption = $('#consumedWh').val() - lastConsumption;
    let emissionNow = 0;
    let lastBaseTime =  1 * $('#startConsumption').attr('data-baseTime');
    let nowBaseTime =  1 * lastBaseTime;
    let oracle = {};
    for(let i=0;i<window.gsiData.forecast.length;i++) {
        if(window.gsiData.forecast[i].timeStamp < now) {
            emissionNow = 0.001 * window.gsiData.forecast[i].co2_g_standard * deltaConsumption;
            nowBaseTime = window.gsiData.forecast[i].timeStamp;
            oracle = window.gsiData.forecast[i];
        }
    }
    window.emissionProfile.pop();
    if(lastBaseTime !== nowBaseTime) {
        window.emissionProfile.push({
                time:lastBaseTime,
                consumption:lastConsumption,
                emission:$('#consumptionResult').attr("data") * 1,
                oracle:oracle
                
        });       
        $('#startConsumption').attr('data-baseTime',nowBaseTime);
    }
 
    let totalEmission = $('#consumptionResult').attr("data") * 1;
    totalEmission += 1 * emissionNow;

    window.emissionProfile.push({
        time:new Date().getTime(),
        consumption:$('#consumedWh').val() * 1,
        emission:totalEmission,
        oracle:oracle
    }); 

    $('#consumptionResult').html(Math.round(totalEmission) +"g CO<sub>2</sub>eq");
    $('#consumptionResult').attr('data',totalEmission);
    $('#startConsumption').attr('data',$('#consumedWh').val());

    $('#chartLabel').html("Laufender Bezug in ");
    const rawData =  window.emissionProfile.slice(1);

    const labels = rawData.map(hourlyData => {
        let date = new Date(hourlyData.time);
        return date.toLocaleTimeString('de-DE', {weekday: 'short',hour: '2-digit', minute:'2-digit'});
    });
   
    const co2Intensities = rawData.map(hourlyData => hourlyData.emission);

    renderForecastChart({labels, data: co2Intensities},"CO2 Emisssion Vorgang","line");
    
}

const planner = function() {
    let availableHours = [];
    const now = new Date().getTime();
    let startTime = now;
    const endTime = new Date($('#endTimeRequired').val()).getTime();
    for(let i=0;i<window.gsiData.forecast.length;i++) {
        if((window.gsiData.forecast[i].timeStamp > now)  && (window.gsiData.forecast[i].timeStamp < endTime)) {
            availableHours.push(window.gsiData.forecast[i].timeStamp);
        }
    }
    if(availableHours.length > $('#duration').val()) {
        let bestOffset = 999999;
        let selectedOffset = -1;
        for(let i=0;i<availableHours.length - $('#duration').val();i++) {
            let thisOffset = 0;
            for(let j=0;j<$('#duration').val();j++) {
                thisOffset += 1 * window.gsiData.forecast[i+j].co2_g_standard;
            }
            if(thisOffset < bestOffset) {
                bestOffset=thisOffset;
                selectedOffset = i;
            }
        }
        startTime = availableHours[selectedOffset]
    }
    if(startTime <= now) {
        $('#scheduleConsumption').attr('disabled','disabled');
        $('#planedStart').html("nicht optimierbar");
    } else {
        $('#scheduleConsumption').removeAttr('disabled');
        $('#planedStart').html(new Date(startTime).toLocaleString('de-DE', {weekday: 'short',hour: '2-digit', minute:'2-digit'}));
        $('#planedStart').attr('data',startTime);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    $('#endTimeRequired').on('change',planner);
    $('#duration').on('change',function() {
        var currentDate = new Date();
        let hrs = $('#duration').val();
        if(hrs < 4 ) hrs = 4;
        var nextDay = new Date(currentDate.getTime() + hrs * 3600000 * 2);
        var formattedDateTime = nextDay.toISOString().slice(0, 16);
        $('#endTimeRequired').val(formattedDateTime);
        planner();
    });

    const fetchForecastBtn = document.getElementById('fetchForecast');
    fetchForecastBtn.addEventListener('click', fetchForecast);

    const startConsumptionBtn = document.getElementById('startConsumption');
    startConsumptionBtn.addEventListener('click', startConsumption);
    $('#startConsumption').attr('data',0);
    $('#startConsumption').attr('data-baseTime',new Date().getTime());
    const stopConsumptionBtn = document.getElementById('stopConsumption');
    stopConsumptionBtn.addEventListener('click', stopConsumption);
    var currentDate = new Date();
    let hrs = $('#duration').val();
    if(hrs < 4 ) hrs = 4;
    var nextDay = new Date(currentDate.getTime() + hrs * 3600000 * 2);
    var formattedDateTime = nextDay.toISOString().slice(0, 16);
    $('#endTimeRequired').val(formattedDateTime);
  
    $('#scheduleConsumption').click(function() {
            window.clearTimeout(window.schedulerId);
            window.schedulerId = window.setTimeout(function() {
                startConsumption();
            }, $('#planedStart').attr('data') - new Date().getTime());
            $('#scheduleConsumption').attr('disabled','disabled');
    });
    $('#fetchFrm').submit(function(e) {
        e.preventDefault();
        fetchForecast();
    });


    const updateConsumptionBtn = document.getElementById('updateConsumption');
    updateConsumptionBtn.addEventListener('click', updateConsumption);
    
    const viewHistoryBtn = document.getElementById('viewHistory');
    viewHistoryBtn.addEventListener('click', function() {
        let currentPage = 1;
        const pageSize = 5; // Set page size

        function updateHistoryView() {
            fetchEventSummary((error, summary) => {
                if (error) {
                    console.error('Failed to fetch event summary:', error);
                    return;
                }
                fetchEventHistory((error, events, hasMore) => {
                    if (error) {
                        console.error('Failed to fetch event history:', error);
                        alert('Failed to load consumption history. Please try again later.');
                        return;
                    }

                    renderHistoryTable(events, summary);

                    const historyContentEl = document.getElementById('historyContent');
                    document.getElementById('prevPage').addEventListener('click', () => {
                        if (currentPage > 1) {
                            currentPage -= 1;
                            updateHistoryView();
                        }
                    });

                    document.getElementById('nextPage').addEventListener('click', () => {
                        if (hasMore) {
                            currentPage += 1;
                            updateHistoryView();
                        }
                    });
                }, currentPage, pageSize);
            });
        }

        updateHistoryView();
        updateHistorySummary(); // Update the summary section whenever the history view is updated
        $('#historyModal').modal('show'); // Show the history modal
    });
    if(window.localStorage.getItem("defaultZip") !== null) {
        document.getElementById('postalCode').value = window.localStorage.getItem("defaultZip");
    }
    document.getElementById('saveMqttSettings').addEventListener('click', function() {
        const hostname = document.getElementById('mqttHostname').value.trim();
        const port = document.getElementById('mqttPort').value.trim();

        // Validate the input values for correctness and completeness
        if (!hostname || !port) {
            alert('Bitte füllen Sie alle Felder korrekt aus.');
            return;
        }

        // Validation for port to be a number
        if (isNaN(port) || port <= 0 || port > 65535) {
            alert('Bitte geben Sie eine gültige Portnummer ein (1-65535).');
            return;
        }

        // If validation passes, save the MQTT settings to localStorage
        localStorage.setItem('mqttSettings', JSON.stringify({ hostname, port }));
        
        // Close the modal after saving
        $('#mqttSettingsModal').modal('hide');
        console.log('MQTT settings saved successfully.');
    });

    // Listen for custom event to update consumedWh input field with the last received value
    document.addEventListener('mqttMessageReceived', function(e) {
        const consumedWh = e.detail.consumedWh;
        $('#consumption').html(consumedWh);
        $('#consumedWh').val(consumedWh);
        console.log('MQTT message received, updating consumedWh input field.');
        deltaEmission();
    });

    // Register service worker and handle incoming MQTT messages
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').then(function(registration) {
            console.log('Service Worker registered with scope:', registration.scope);
        }).catch(function(err) {
            console.error('Service Worker registration failed:', err);
        });

        navigator.serviceWorker.addEventListener('message', function(event) {
            console.log('Received message from service worker:', event.data);
            if (event.data.type === 'MQTT_DATA') {
                const data = JSON.parse(event.data.data); // Assuming the data is a JSON string
                const consumedWh = data.consumedWh; // Extracting the consumedWh value
                document.getElementById('consumption').textContent = consumedWh + ' Wh'; // Updating the UI
                console.log('Updated consumption in the UI with the latest value from MQTT:', consumedWh);
            }
        });
    }
    $('#showEditConsumption').click(function() {
        $('#editConsumptionModal').modal('show');
    });
});

function fetchForecast() {
    const postalCode = document.getElementById('postalCode').value;
    if (!postalCode) {
        alert('Please enter a postal code.');
        return;
    }

    console.log('Attempting to fetch forecast for postal code:', postalCode);
    $('#fetchForecast').attr('disabled','disabled');
    $('#postalCode').attr('disabled','disabled');
    fetch(`https://api.corrently.io/v2.0/gsi/prediction?zip=${postalCode}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            window.gsiData = data;
            window.emissionProfile = [];

            $('#withForecast').show();
            $('#withoutForecast').hide();
            planner();
            // Prepare data for the chart
            const rawData = data.forecast.slice(0,48);

            const labels = rawData.map(hourlyData => {
                let date = new Date(hourlyData.timeStamp);
                return date.toLocaleTimeString('de-DE', {weekday: 'short',hour: '2-digit', minute:'2-digit'});
            });
           
            const co2Intensities = rawData.map(hourlyData => hourlyData.co2_g_standard);
            $('#zipCity').html(data.location.zip + ' ' + data.location.city);
            renderForecastChart({labels, data: co2Intensities},"gCO2/kWh","bar");
            console.log('Forecast data prepared and passed to renderForecastChart function.');
        })
        .catch(error => {
            console.error('Failed to fetch forecast data:', error);
            $('#withForecast').show();
            document.getElementById('forecastResult').innerHTML = 'Der GrünstromIndex konnte nicht geladen werden.';
        });
}

let consumptionTimer = null;
let startTimestamp = null;

function startConsumption() {
    const postalCode = document.getElementById('postalCode').value;
    if (!postalCode) {
        alert('Please enter a postal code.');
        return;
    }

    fetch(`https://api.corrently.io/v2.0/scope2/eventStart?zip=${postalCode}`)
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            window.localStorage.setItem("defaultZip",postalCode);
            const eventIdentifier = data.event;
            const dspeID = eventIdentifier.substring(0,7);
            document.getElementById('locationCode').innerHTML = `${postalCode}`;
            document.getElementById('eventIdentifier').innerHTML = `${eventIdentifier}`;
            document.getElementById('eventIdentifier').title = `${eventIdentifier}`;
            document.getElementById('startConsumption').style.display = 'none'; // Hide start button
            document.getElementById('consumedWh').style.display = 'block';
            sessionStorage.setItem('eventID', eventIdentifier);
            console.log('eventIdentifier:', eventIdentifier);
            $('#starterRows').hide();
            $('#runningConsumption').show();
            $('#forecastResult').hide();
            startTimestamp = Date.now();
            consumptionTimer = setInterval(() => {
                const elapsedTime = Date.now() - startTimestamp;
                const hours = Math.floor(elapsedTime / 3600000).toString().padStart(2, '0');
                const minutes = Math.floor((elapsedTime % 3600000) / 60000).toString().padStart(2, '0');
                const seconds = Math.floor((elapsedTime % 60000) / 1000).toString().padStart(2, '0');
                document.getElementById('timeElapsed').textContent = `${hours}:${minutes}:${seconds}`;
            }, 1000);

            // After starting consumption, post MQTT settings to the service worker
            const mqttSettings = JSON.parse(localStorage.getItem('mqttSettings'));
            setupMQTTConnection(eventIdentifier);
            console.log("Publish consumption in Wh via MQTT: ","mosquitto_pub -h "+mqttSettings.hostname+" -p 1883 -t /gsitracker/"+eventIdentifier+"/consumption -m <Wh>");
            
        })
        .catch(error => {
            console.error('Failed to start consumption tracking:', error);
            alert('Failed to start consumption tracking. Please try again.');
        });
}

function stopConsumption() {
    const eventID = sessionStorage.getItem('eventID');
    window.clearInterval(consumptionTimer);
    if (!eventID) {
        alert('No consumption event to stop.');
        return;
    } else {
        const lastMQTTMessage = sessionStorage.getItem('lastMQTTMessage');
        if (lastMQTTMessage) {
            const lastConsumedWh = JSON.parse(lastMQTTMessage).consumedWh;
            document.getElementById('consumedWh').value = lastConsumedWh; // Pre-fill the 'consumedWh' input with the last received value
        }
        commitConsumption();
    }
}

function updateConsumption() {
    $('#consumption').html($('#consumedWh').val());
    $('#editConsumptionModal').modal('hide');
    deltaEmission();
}

function commitConsumption() {
    const eventID = sessionStorage.getItem('eventID');
    const consumedWhInput = document.getElementById('consumedWh').value;
    const consumedWhNumber = parseInt(consumedWhInput);
    const endTimestamp = Date.now();

    if (!eventID) {
        alert('No consumption event to stop.');
        return;
    } else if (isNaN(consumedWhNumber) || consumedWhNumber <= 0 || !Number.isInteger(consumedWhNumber)) {
        alert('Please enter a valid positive integer for consumed Wh.');
        return;
    }
    let footprint = $('#consumptionResult').attr('data') * 1;
    fetch(`https://api.corrently.io/v2.0/scope2/eventStop?event=${eventID}&wh=${consumedWhNumber}&emission=${footprint}`)
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            if (!data.emission) throw new Error('Invalid or missing emission data');
            document.getElementById('consumptionResult').innerHTML = `${data.emission}g CO<sub>2</sub>eq`;
            document.getElementById('stopConsumption').style.display = 'none';
            document.getElementById('startConsumption').style.display = 'none';
            //document.getElementById('eventIdentifier').innerHTML = '';
            $('#showEditConsumption').hide();
            sessionStorage.removeItem('eventID');
            clearInterval(consumptionTimer);
            $('#commitConsumption').hide();
            //document.getElementById('timeElapsed').textContent = '00:00:00';
            document.getElementById('consumptionInput').style.display = 'none';
//            document.getElementById('consumedWh').value = '';

            // Add event to history
            addEventHistory({
                startTimestamp: startTimestamp,
                endTimestamp: endTimestamp,
                consumptionWh: consumedWhNumber,
                footprint: $('#consumptionResult').attr('data') * 1,
                eventId: eventID,
                profile: JSON.stringify(window.emissionProfile),
                zipcode: $('#postalCode').val()
            });
        })
        .catch(error => {
            console.error('Error during stop consumption:', error);
            let errorMessage = 'Failed to stop consumption tracking. Please try again.';
            if (error.message.includes('Network response was not ok')) {
                errorMessage = 'Network issue or the server is unavailable. Please check your connection and try again later.';
            } else if (error.message.includes('Invalid or missing emission data')) {
                errorMessage = 'Unexpected response from the server. Please contact support.';
            }
            document.getElementById('consumptionResult').innerHTML = errorMessage;
        });
}

function updateHistorySummary() {
    fetchEventSummary((error, summary) => {
        if (error) {
            console.error('Failed to fetch event summary:', error);
            return;
        }
        const summarySection = document.getElementById('summarySection');
        if (!summarySection) {
            console.error('Summary section element not found');
            return;
        }
        // Check if the modal is already open
        if ($('#historyModal').hasClass('show')) {
            summarySection.innerHTML = `
                <h3>Summary</h3>
                <p>Total Consumption: ${summary.totalConsumptionWh} Wh</p>
                <p>Total Footprint: ${summary.totalFootprint} g</p>
                <p>Count of Events: ${summary.eventCount}</p>
            `;
        } else {
            // If the modal is not open yet, wait for it to be shown
            $('#historyModal').one('shown.bs.modal', function () {
                summarySection.innerHTML = `
                    <h3>Summary</h3>
                    <p>Total Consumption: ${summary.totalConsumptionWh} Wh</p>
                    <p>Total Footprint: ${summary.totalFootprint} g</p>
                    <p>Count of Events: ${summary.eventCount}</p>
                `;
            });
        }
    });
}