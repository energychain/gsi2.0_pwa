// This script is responsible for handling MQTT connections and message updates for the GrünstromIndex 2.0 application.

let mqttClient = null; // Define mqttClient at a higher scope to be accessible by both setup and disconnect functions

// Function to setup MQTT connection and subscribe to the appropriate topic
function setupMQTTConnection(eventID) {
    console.log('Attempting to setup MQTT connection for eventID:', eventID);

    // Retrieve MQTT settings from localStorage
    const mqttSettings = JSON.parse(localStorage.getItem('mqttSettings'));

    if (!mqttSettings || !mqttSettings.hostname || !mqttSettings.port) {
        console.error('MQTT settings are missing or incomplete. Please configure MQTT settings.');
        return;
    }

    // Determine if SSL should be used based on port number or a specific setting in mqttSettings
  //  const useSSL = mqttSettings.port === 8883 || mqttSettings.useSSL === true;
  const useSSL = true;
    console.log("MQTT SSL usage:", useSSL);

    // Create a new Paho MQTT client
    mqttClient = new Paho.Client(mqttSettings.hostname, Number(mqttSettings.port), "/mqtt", "clientId_" + new Date().getTime());

    // Set callback handlers
    mqttClient.onConnectionLost = onConnectionLost;
    mqttClient.onMessageArrived = onMessageArrived;

    // Connect the client with SSL configuration based on mqttSettings
    mqttClient.connect({
        onSuccess: function() {
            console.log("MQTT Client Connected");
            // Subscribe to the topic once connected
            const topic = `/gsitracker/${eventID}/consumption`;
            mqttClient.subscribe(topic, {
                onSuccess: function() {
                    console.log(`Successfully subscribed to topic: ${topic}`);
                },
                onFailure: function(err) {
                    console.error(`Failed to subscribe to topic ${topic}:`, err);
                }
            });
        },
        onFailure: onFailure,
        useSSL: useSSL
    });

    // Called when the client loses its connection
    function onConnectionLost(responseObject) {
        if (responseObject.errorCode !== 0) {
            console.error("MQTT Connection Lost:", responseObject.errorMessage);
        }
    }

    // Called when a message arrives
    function onMessageArrived(message) {
        console.log(`MQTT Message Arrived on topic ${message.destinationName}:`, message.payloadString);
        const customEvent = new CustomEvent('mqttMessageReceived', { detail: { consumedWh: message.payloadString } });
        document.dispatchEvent(customEvent);
    }

    // Called when the client fails to connect
    function onFailure(error) {
        console.error("MQTT Connection Failed:", error.errorMessage);
    }
}

// Function to disconnect from the MQTT broker
function disconnectMQTTConnection() {
    if (mqttClient && mqttClient.isConnected()) {
        mqttClient.disconnect();
        console.log("MQTT Client Disconnected");
        mqttClient = null; // Reset the mqttClient to null after disconnection
    } else {
        console.log("MQTT Client is not connected or undefined.");
    }
}

// Export the setup and disconnect functions for use in other modules
window.setupMQTTConnection = setupMQTTConnection;
window.disconnectMQTTConnection = disconnectMQTTConnection;