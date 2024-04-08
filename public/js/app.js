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
                    // Pagination controls
                    const paginationControls = document.createElement('div');
                    paginationControls.innerHTML = `
                        <button id="prevPage" ${currentPage === 1 ? 'disabled' : ''} class="btn btn-default">Previous</button>
                        <span>Page ${currentPage}</span>
                        <button id="nextPage" ${!hasMore ? 'disabled' : ''} class="btn btn-default">Next</button>
                    `;
               
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

    // Check if Service Worker API is available
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    // Registration was successful
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                }, err => {
                    // registration failed :(
                    console.error('ServiceWorker registration failed: ', err);
                });
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
            console.log('Forecast data received:', data);
            $('#withForecast').show();
            $('#withoutForecast').hide();
            // Prepare data for the chart
            const rawData = data.forecast.slice(0,48);

            const labels = rawData.map(hourlyData => {
                const date = new Date(hourlyData.timeStamp);
                return date.toLocaleTimeString('de-DE', {weekday: 'short',hour: '2-digit', minute:'2-digit'});
            });
           
            const co2Intensities = rawData.map(hourlyData => hourlyData.co2_g_oekostrom);

            renderForecastChart({labels, data: co2Intensities});
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
            document.getElementById('eventIdentifier').innerHTML = `Stromverbrauch gestartet: ${eventIdentifier}`;
            document.getElementById('stopConsumption').style.display = 'block'; // Display the stop button
            document.getElementById('startConsumption').style.display = 'none'; // Hide start button
            // Make the "Enter consumed Wh" input field visible and update its label
            document.getElementById('consumedWh').style.display = 'block';
//            document.querySelector('label[for="consumedWh"]').textContent = `Verbrauch für ${eventIdentifier} erfassen:`;
            // Store event ID for stopping consumption
            sessionStorage.setItem('eventID', eventIdentifier);
            console.log('Ereignis:', eventIdentifier);
            // Start timer
            startTimestamp = Date.now();
            document.getElementById('timerDisplay').style.display = 'block';
            consumptionTimer = setInterval(() => {
                const elapsedTime = Date.now() - startTimestamp;
                const hours = Math.floor(elapsedTime / 3600000).toString().padStart(2, '0');
                const minutes = Math.floor((elapsedTime % 3600000) / 60000).toString().padStart(2, '0');
                const seconds = Math.floor((elapsedTime % 60000) / 1000).toString().padStart(2, '0');
                document.getElementById('timeElapsed').textContent = `${hours}:${minutes}:${seconds}`;
            }, 1000);
        })
        .catch(error => {
            console.error('Failed to start consumption tracking:', error);
            alert('Failed to start consumption tracking. Please try again.');
        });
}

function stopConsumption() {
    const eventID = sessionStorage.getItem('eventID');
    const consumedWhInput = document.getElementById('consumedWh').value;
    const consumedWhNumber = parseInt(consumedWhInput);
    const endTimestamp = Date.now();
    window.clearInterval(consumptionTimer);
    if (!eventID) {
        alert('No consumption event to stop.');
        return;
    } else {
        $('#eventIdentifier').hide();
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
            document.getElementById('timerDisplay').style.display = 'none';
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