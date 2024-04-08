const dbRequest = indexedDB.open("gsi2.0", 1);

dbRequest.onupgradeneeded = function(event) {
    const db = event.target.result;
    if (!db.objectStoreNames.contains('eventHistory')) {
        const eventHistoryStore = db.createObjectStore('eventHistory', { keyPath: 'id', autoIncrement: true });
        eventHistoryStore.createIndex('startTimestamp', 'startTimestamp', { unique: false });
        eventHistoryStore.createIndex('endTimestamp', 'endTimestamp', { unique: false });
        eventHistoryStore.createIndex('consumptionWh', 'consumptionWh', { unique: false });
        eventHistoryStore.createIndex('footprint', 'footprint', { unique: false });
        eventHistoryStore.createIndex('eventId', 'eventId', { unique: true });
    }
};

dbRequest.onerror = function(event) {
    console.error("Database error: ", event.target.errorCode);
};

function addEventHistory(eventData) {
    const dbConnection = indexedDB.open("gsi2.0");
    dbConnection.onsuccess = function(event) {
        const db = event.target.result;
        const transaction = db.transaction(["eventHistory"], "readwrite");
        const eventHistoryStore = transaction.objectStore("eventHistory");
        const request = eventHistoryStore.add({
            startTimestamp: eventData.startTimestamp,
            endTimestamp: eventData.endTimestamp,
            consumptionWh: eventData.consumptionWh,
            footprint: eventData.footprint,
            eventId: eventData.eventId
        });

        request.onsuccess = function() {
            console.log("Event successfully added to the history.");
        };

        request.onerror = function(event) {
            console.error("Error adding event to the history:", event.target.error);
        };
    };

    dbConnection.onerror = function(event) {
        console.error("Database connection error:", event.target.errorCode);
    };
}

function fetchEventHistory(callback, pageNumber = 1, pageSize = 5) {
    const dbConnection = indexedDB.open("gsi2.0");
    dbConnection.onsuccess = function(event) {
        const db = event.target.result;
        const transaction = db.transaction(["eventHistory"], "readonly");
        const eventHistoryStore = transaction.objectStore("eventHistory");
        const index = eventHistoryStore.index('startTimestamp');

        let range = IDBKeyRange.upperBound(Infinity);
        let direction = 'prev';
        let results = [];
        let skipped = 0;
        let skip = (pageNumber - 1) * pageSize;
        let hasMore = false;

        index.openCursor(range, direction).onsuccess = function(event) {
            let cursor = event.target.result;
            if (cursor) {
                if (skipped < skip) {
                    skipped++;
                    cursor.continue();
                } else if (results.length < pageSize) {
                    results.push(cursor.value);
                    cursor.continue();
                } else {
                    // Additional check to set hasMore accurately
                    hasMore = true;
                }
            }
            if (!cursor || results.length === pageSize) {
                // Final callback call with accurate hasMore value
                callback(null, results, hasMore);
            }
        };

        index.openCursor(range, direction).onerror = function(event) {
            console.error("Error fetching event history:", event.target.error);
            callback(event.target.error, null);
        };
    };

    dbConnection.onerror = function(event) {
        console.error("Database connection error during fetchEventHistory:", event.target.errorCode);
        callback(event.target.errorCode, null);
    };
}

function fetchEventSummary(callback) {
    const dbConnection = indexedDB.open("gsi2.0");
    dbConnection.onsuccess = function(event) {
        const db = event.target.result;
        const transaction = db.transaction(["eventHistory"], "readonly");
        const eventHistoryStore = transaction.objectStore("eventHistory");

        let totalConsumptionWh = 0;
        let totalFootprint = 0;
        let eventCount = 0;

        eventHistoryStore.openCursor().onsuccess = function(event) {
            const cursor = event.target.result;
            if (cursor) {
                totalConsumptionWh += cursor.value.consumptionWh;
                totalFootprint += cursor.value.footprint;
                eventCount++;
                cursor.continue();
            } else {
                // Once iteration is complete, call the callback with the calculated summary
                callback(null, {
                    totalConsumptionWh,
                    totalFootprint,
                    eventCount
                });
            }
        };

        eventHistoryStore.openCursor().onerror = function(event) {
            console.error("Error fetching event summary:", event.target.error);
            callback(event.target.error, null);
        };
    };

    dbConnection.onerror = function(event) {
        console.error("Database connection error during fetchEventSummary:", event.target.errorCode);
        callback(event.target.errorCode, null);
    };
}

function renderHistoryTable(events, summary) {
    const historyContentEl = document.getElementById('historyContent');
    historyContentEl.innerHTML = ''; // Clear previous content

    // Create table element
    const table = document.createElement('table');
    table.className = 'table table-striped'; // Bootstrap classes for styling

    // Create and append the table header
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th>Start</th>
            <th>Ende</th>
            <th>Stromverbrauch (Wh)</th>
            <th>CO<sub>2</sub> (g)</th>
        </tr>
    `;
    table.appendChild(thead);

    // Create and append table body
    const tbody = document.createElement('tbody');
    events.forEach(event => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${new Date(event.startTimestamp).toLocaleString()}</td>
            <td>${new Date(event.endTimestamp).toLocaleString()}</td>
            <td>${event.consumptionWh}</td>
            <td>${event.footprint}</td>
        `;
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    // Append the table to the history content element
    historyContentEl.appendChild(table);

    // Pagination controls
    const paginationControls = document.createElement('div');
    paginationControls.className = 'pagination-controls';
    paginationControls.innerHTML = `
        <button id="prevPage" class="btn btn-secondary">&laquo;</button>
        <span id="currentPageIndicator"></span>
        <button id="nextPage" class="btn btn-secondary">&raquo;</button>
    `;

    historyContentEl.appendChild(paginationControls);

    // Update current page indicator
    const currentPageIndicator = document.getElementById('currentPageIndicator');
    currentPageIndicator.textContent = `Seite ${currentPage}`;

    // Add event listeners for pagination buttons
    document.getElementById('prevPage').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            updateHistoryView();
        }
    });

    document.getElementById('nextPage').addEventListener('click', () => {
        currentPage++;
        updateHistoryView();
    });
}

let currentPage = 1; // Keep track of the current page at the top level of your script for access by the event listeners

function updateHistoryView() {
    fetchEventSummary((error, summary) => {
        if (error) {
            console.error('Failed to fetch event summary:', error);
            return;
        }
        updateHistorySummary();
        fetchEventHistory((error, events, hasMore) => {
            if (error) {
                console.error('Failed to fetch event history:', error);
                alert('Failed to load consumption history. Please try again later.');
                return;
            }

            renderHistoryTable(events, summary);

            // Disable/Enable pagination buttons based on page number and if there are more pages
            document.getElementById('prevPage').disabled = currentPage === 1;
            document.getElementById('nextPage').disabled = !hasMore;
        }, currentPage, 5); // Pass the current page and page size to the fetch function
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
        // Update the summary section with the new summary data
        summarySection.innerHTML = `
           <table class="table table-striped">
                <tr>
                   <th scope="col">Stromverbrauch</th>
                   <th scope="col">CO<sub>2</sub> Verbrauch</th>
                   <th scope="col">Anzahl der Ereignisse</th>
                </tr>
                <tr>
                    <td style="text-align:right">${summary.totalConsumptionWh} Wh</td>
                    <td style="text-align:right">${summary.totalFootprint} g</td>
                    <td style="text-align:right">${summary.eventCount}</td>
                </tr>
           </table>
        `;
    });
}

document.getElementById('viewHistory').addEventListener('click', function() {
    updateHistoryView();
    $('#historyModal').modal('show'); // Show the history modal
});

// Export functions for use in other modules
window.addEventHistory = addEventHistory;
window.fetchEventHistory = fetchEventHistory;
window.fetchEventSummary = fetchEventSummary;
window.renderHistoryTable = renderHistoryTable;
window.updateHistoryView = updateHistoryView;