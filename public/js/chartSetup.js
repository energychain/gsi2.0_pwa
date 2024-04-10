// This function will be called with the forecast data to render the chart
function renderForecastChart(forecastData,city) {
    const ctx = document.getElementById('forecastChart').getContext('2d');
    
    // Check if the chart instance already exists
    if (window.forecastChartInstance) {
        window.forecastChartInstance.data.labels = forecastData.labels;
        window.forecastChartInstance.data.datasets[0].data = forecastData.data;
        window.forecastChartInstance.update();
        console.log("Forecast chart updated successfully.");
    } else {
        // Create a new chart instance if it doesn't exist
        window.forecastChartInstance = new Chart(ctx, {
            type: 'line', // Line chart to show forecast over time
            data: {
                labels: forecastData.labels, // x-axis labels (time slots)
                datasets: [{
                    label: 'g CO2/kWh',
                    data: forecastData.data, // y-axis data points (CO2 intensity)
                    backgroundColor: 'rgba(42, 157, 143, 0.8)', // Light blue fill
                    borderColor: 'rgba(36, 70, 83, 1)', // Blue borders
                    borderWidth: 1
                }]
            },
            options: {
                fill: 'origin',
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'CO2 Emission (g/kWh)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Tag/Zeit'
                        }
                    }
                },
                responsive: true,
                maintainAspectRatio: false,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: city,
                        font: {weight: 'bold'}
                    }
                }
            }
        });
        console.log("Forecast chart created successfully.");
    }
}

// Make renderForecastChart globally available
window.renderForecastChart = renderForecastChart;