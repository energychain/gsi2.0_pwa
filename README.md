# GrünstromIndex 2.0 PWA

The GrünstromIndex 2.0 PWA (Progressive Web Application) aims to empower users to minimize the CO2 footprint of their electricity consumption. By providing CO2 footprint forecasts and enabling consumption planning and tracking, it facilitates environmentally conscious electricity use.

## Overview

This application is built as a Progressive Web Application (PWA), featuring a simple Express.js backend for serving static assets and a client-side frontend for dynamic interaction. The application integrates with the GrünstromIndex API to fetch real-time CO2 intensity forecasts, making use of service workers for offline functionality and Bootstrap for UI styling.

## Features

- **Forecast Viewing**: Access real-time forecasts of CO2 footprint for the next 36 hours.
- **Consumption Planning**: Schedule electricity consumption based on low CO2 footprint periods.
- **Consumption Tracking**: Log and track electricity consumption events, including their CO2 footprint.
- **Event History**: View a history of past consumption events, complete with detailed statistics.

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

Copyright (c) 2024.