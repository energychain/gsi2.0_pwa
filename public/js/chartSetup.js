// This function will be called with the forecast data to render the chart
function renderForecastChart(forecastData,ylabel,chartType) {
    const ctx = document.getElementById('forecastChart').getContext('2d');
    
    // Check if the chart instance already exists
    if (window.forecastChartInstance) {
        window.forecastChartInstance.data.labels = forecastData.labels;
        window.forecastChartInstance.data.datasets[0].data = forecastData.data;
        window.forecastChartInstance.update();
        console.log("Forecast chart updated successfully.");
    } else {
        // Create a new chart instance if it doesn't exist
        const minValue = Math.min(...forecastData.data);
        const maxValue = Math.max(...forecastData.data);
        const range = maxValue - minValue;
        const third1 = minValue + range / 3;
        const third2 = minValue + (range / 3) * 2;
        window.forecastChartInstance = new Chart(ctx, {
            type: chartType, // Line chart to show forecast over time
            data: {
                labels: forecastData.labels, // x-axis labels (time slots)
                datasets: [{
                    label: 'g CO2/kWh',
                    data: forecastData.data, // y-axis data points (CO2 intensity)
                    //backgroundColor: 'rgba(42, 157, 143, 0.8)', // Light blue fill
                    backgroundColor: (context) => {
                        const value = context.dataset.data[context.dataIndex];
                        if (value < third1) {
                            return '#2a9d8f';
                        } else if (value < third2) {
                            return '#777777';
                        } else {
                            return '#f4a261';
                        }
                    },
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
                            text: ylabel
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
                        display: false,
                        text: ylabel,
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