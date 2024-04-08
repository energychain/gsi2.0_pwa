__This is an unmodified repository to show the results of a PoC using  [GPT-Pilot](https://github.com/Pythagora-io/gpt-pilot) to create the base line of a new consumer App using the GreenPowerIndex.
The API costs were arround 65$ to generate the results in aprox. 10 iterations. The implementation to this step saved aprox 6 days of development. We stopped the initial implementation at this stage to create a [MVP]() with some tweaking out of it.__

# GrünstromIndex 2.0 PWA (GPT-Pilot implementation)

The [GrünstromIndex](https://www.gruenstromindex.de/) 2.0 PWA (Progressive Web Application) empowers users to plan their electricity consumption with an eye toward environmental sustainability. It integrates real-time CO2 intensity forecasts allowing users to optimize their electricity usage, such as charging electric vehicles or running appliances during times of lower carbon footprint, thus contributing to a more sustainable environment.

## Overview

This application leverages a minimalist Express.js backend to serve static assets while the frontend, a rich Progressive Web Application, delivers dynamic content and offline capabilities. Integration with the GrünstromIndex API provides real-time CO2 intensity forecasts. Key technologies include service workers for offline functionality, Bootstrap for styling, and vanilla JavaScript for frontend logic and API interactions.

## Features

- **Forecast Viewing**: Access up-to-date CO2 intensity forecasts to plan electricity consumption.
- **Consumption Planning and Tracking**: Log start and end times of electricity usage, calculate the CO2 footprint, and view past consumption events including detailed statistics.
- **Interactive Forecast Chart**: Utilize Chart.js to visualize CO2 intensity over time, aiding in efficient consumption planning.
- **Event History with Pagination**: Review past electricity consumption events stored in the browser's IndexedDB, including timestamps, consumed Wh, CO2 footprint, and pagination for easy navigation.

## Getting started

### Requirements

- Node.js
- npm (Node Package Manager)

### Quickstart

1. Clone the repository to your local machine.
2. Navigate to the project directory.
3. Run `npm install` to install the dependencies.
4. Execute `npm start` to launch the server.
5. Open `http://localhost:3000` in a browser to view the application.

### License

Copyright (c) 2024 STROMDAO GmbH.