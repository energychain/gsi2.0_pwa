const CACHE_NAME = 'gsi2.0-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/js/mqtt.js', // Added mqtt.js to the list of URLs to cache
  'https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css', // Updated Bootstrap CSS to version 5.0.2
  'https://code.jquery.com/jquery-3.3.1.slim.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.14.7/umd/popper.min.js',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/js/bootstrap.bundle.min.js', // Updated Bootstrap JS to version 5.0.2
  'https://cdnjs.cloudflare.com/ajax/libs/paho-mqtt/1.1.0/paho-mqtt.min.js' // Added Paho MQTT client library
];

self.addEventListener('install', event => {
  // Perform install steps
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('Failed to open cache:', error);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request).then(
          function(response) {
            // Check if we received a valid response
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            var responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
      .catch(error => {
        console.error('Failed to fetch data:', error);
      })
  );
});

let reconnectAttempts = 0;

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'MQTT_SETTINGS') {
    handleMQTTConnection(event.data.settings);
  }
});

function handleMQTTConnection(settings) {
  importScripts('https://cdnjs.cloudflare.com/ajax/libs/paho-mqtt/1.1.0/paho-mqtt.min.js');

  const useSSL = settings.port === 8883 || settings.useSSL === true;
  const client = new Paho.MQTT.Client(settings.hostname, Number(settings.port), "/mqtt", "gsi2.0_client_" + new Date().getTime());

  client.onConnectionLost = onConnectionLost;
  client.onMessageArrived = onMessageArrived;

  client.connect({
    onSuccess: () => {
      console.log("MQTT Client Connected");
      reconnectAttempts = 0; // Reset reconnect attempts upon successful connection
      const eventID = settings.eventID;
      if (eventID) {
        const topic = `/someRoot/${eventID}/consumption`;
        client.subscribe(topic);
        console.log(`Subscribed to topic: ${topic}`);
      } else {
        console.error("No eventID provided for MQTT subscription.");
      }
    },
    onFailure: (error) => {
      console.error("MQTT Connection Failed:", error.errorMessage);
    },
    useSSL: useSSL
  });

  function onConnectionLost(responseObject) {
    if (responseObject.errorCode !== 0) {
      console.error("MQTT Connection Lost:", responseObject.errorMessage);
      if (reconnectAttempts < 5) {
        let backoffDelay = Math.pow(2, reconnectAttempts) * 1000;
        console.log(`Attempting to reconnect in ${backoffDelay / 1000} seconds.`);
        setTimeout(() => {
          handleMQTTConnection(settings);
          reconnectAttempts++;
        }, backoffDelay); // Exponential backoff
      } else {
        console.error("Maximum reconnect attempts reached.");
      }
    }
  }

  function onMessageArrived(message) {
    console.log(`MQTT Message Arrived: ${message.payloadString}`);
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'MQTT_DATA',
          data: message.payloadString
        });
      });
    });
  }
}