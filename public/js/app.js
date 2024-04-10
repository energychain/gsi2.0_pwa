document.addEventListener('DOMContentLoaded', function() {
    const fetchForecastBtn = document.getElementById('fetchForecast');
    fetchForecastBtn.addEventListener('click', fetchForecast);

    const startConsumptionBtn = document.getElementById('startConsumption');
    startConsumptionBtn.addEventListener('click', startConsumption);

    const stopConsumptionBtn = document.getElementById('stopConsumption');
    stopConsumptionBtn.addEventListener('click', stopConsumption);

    const commitConsumptionBtn = document.getElementById('commitConsumption');
    commitConsumptionBtn.addEventListener('click', commitConsumption);

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

    // Initially hide the "Enter consumed Wh" input field
    document.getElementById('consumedWh').style.display = 'none';

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
});

function fetchForecast() {
    const postalCode = document.getElementById('postalCode').value;
    if (!postalCode) {
        alert('Please enter a postal code.');
        return;
    }

    console.log('Attempting to fetch forecast for postal code:', postalCode);

    fetch(`https://api.corrently.io/v2.0/gsi/prediction?zip=${postalCode}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            $('#withForecast').show();
            $('#withoutForecast').hide();
            // Prepare data for the chart
            const rawData = data.forecast.slice(0,48);

            const labels = rawData.map(hourlyData => {
                const date = new Date(hourlyData.timeStamp);
                return date.toLocaleTimeString('de-DE', {weekday: 'short',hour: '2-digit', minute:'2-digit'});
            });
           
            const co2Intensities = rawData.map(hourlyData => hourlyData.co2_g_oekostrom);

            renderForecastChart({labels, data: co2Intensities},data.location.zip + ' '+data.location.city);
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
            const eventIdentifier = data.event;
            const dspeID = eventIdentifier.substring(0,7);
            document.getElementById('eventIdentifier').innerHTML = `${dspeID}...`;
            document.getElementById('eventIdentifier').title = `${eventIdentifier}`;
            document.getElementById('startConsumption').style.display = 'none'; // Hide start button
            document.getElementById('consumedWh').style.display = 'block';
            sessionStorage.setItem('eventID', eventIdentifier);
            console.log('Ereignis:', eventIdentifier);
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
        $('#runningConsumption').hide();
        $('#eventIdentifier').hide();
        // Retrieve the last received MQTT message from sessionStorage
        const lastMQTTMessage = sessionStorage.getItem('lastMQTTMessage');
        if (lastMQTTMessage) {
            const lastConsumedWh = JSON.parse(lastMQTTMessage).consumedWh;
            document.getElementById('consumedWh').value = lastConsumedWh; // Pre-fill the 'consumedWh' input with the last received value
        }
        $('#consumptionInput').show();
        $('#stopConsumption').hide();
        $('#commitConsumption').show();
    }
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

    fetch(`https://api.corrently.io/v2.0/scope2/eventStop?event=${eventID}&wh=${consumedWhNumber}`)
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            if (!data.emission) throw new Error('Invalid or missing emission data');
            document.getElementById('consumptionResult').innerHTML = `Stromverbrauch protokolliert. CO2 Emission: ${data.emission} g.`;
            document.getElementById('stopConsumption').style.display = 'none';
            document.getElementById('startConsumption').style.display = 'none';
            document.getElementById('eventIdentifier').innerHTML = '';
            sessionStorage.removeItem('eventID');
            clearInterval(consumptionTimer);
            $('#commitConsumption').hide();
            document.getElementById('timeElapsed').textContent = '00:00:00';
            document.getElementById('consumptionInput').style.display = 'none';
            document.getElementById('consumedWh').value = '';

            // Add event to history
            addEventHistory({
                startTimestamp: startTimestamp,
                endTimestamp: endTimestamp,
                consumptionWh: consumedWhNumber,
                footprint: data.emission,
                eventId: eventID
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