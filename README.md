![AIRO LOGO](https://images.squarespace-cdn.com/content/v1/63ac024c34ca051c07c3c294/5d7ea82b-71b9-4ab7-90a5-3479cb0a67b0/Airo+green+logo.png?format=200w)

# Airo Core Backend

This repository contains the backend code for Airo Core, a project that serves as the core infrastructure for various services. It is built using Node.js 18 and includes multiple dependencies. Below you will find important information about the project's configuration, setup, and usage.

## Table of Contents

- [Introduction](#introduction)
- [AIRO Network](#airo-network)
- [Importance of Air Quality Monitoring](#importance-of-air-quality-monitoring)
- [Global Impact](#global-impact)
- [Development Setup](#development-setup)
- [Docker Support](#docker-support)
- [Environment Variables](#environment-variables)
- [GitHub Actions Workflow](#github-actions-workflow)

## Introduction

Airo Core is part of the AIRO project, an initiative dedicated to reshaping air quality science and technology. We aim to combat the severe consequences of air pollution on the environment and human health. Our central mission is to empower individuals to lead healthy lives by providing cutting-edge air quality technology.

## AIRO Network

At the heart of AIRO is the revolutionary AIRO Network, which utilizes blockchain's decentralized model to involve the community in monitoring air quality. Contributors to the network share data from AIRO Monitoring Stations and are rewarded with AIRO Credits. This reward system encourages clean air behavior and the establishment of a wide-reaching network of air quality monitoring stations.

## Importance of Air Quality Monitoring

Monitoring and measuring air quality are vital for understanding environmental conditions and their impact on human health. Poor air quality is responsible for premature deaths worldwide. AIRO is dedicated to providing a solution to bring about positive change.

## Global Impact

The global rise in pollution levels is a significant concern, and AIRO is presented as a solution to create a healthier and cleaner future. Our team, consisting of engineers from Romania, Moldova, and Ukraine, is committed to this mission and environmental responsibility.

## Development Setup

Follow these steps to set up the Airo Core Backend for development:

1. Ensure you have Node.js v18.7.0 installed. You can use [Node Version Manager (NVM)](https://github.com/nvm-sh/nvm) to manage your Node.js versions. The `.nvmrc` file specifies the required version.

2. Install project dependencies using Yarn. Run the following command in the project root directory:

   ```bash
   yarn
   ```

3. Start the development server:

   ```bash
   yarn start
   ```

4. The server should now be running on port 3001.

## Docker Support

A Dockerfile is included to facilitate containerization of the Airo Core Backend. You can build and run the project within a Docker container. The Dockerfile uses the official Node.js 18 Alpine image as the base.

To build and run the Docker container:

1. Make sure you have Docker installed on your machine.

2. Build the Docker image using the following commands:

   ```bash
   docker build -t airo-core-backend .
   ```

3. Run the Docker container:

   ```bash
   docker run -p 3001:3001 -v /data:/app/data airo-core-backend
   ```

   The volume `/data` is mapped to the `/app/data` directory in the container. This is useful for persisting data if you are using NeDB as an alternative to MongoDB.

## Environment Variables

To run the Airo Core Backend, you need to set up the following environment variables. You can use the provided `.env.example` file as a reference.

```dotenv
ADMIN_AUTH_URL=https://auth.admin.example.com
CLIENT_AUTH_URL=https://auth.client.example.com
MQTT_URL=mqtt://mqtt.example.com
MQTT_USER=user
MQTT_PASS=pass
MULTIVERSX_API_URL=https://devnet-api.multiversx.com
MULTIVERSX_TOKEN_ID_HEX=AIRO-222d3c
MULTIVERSX_CHAIN_ID=D
MULTIVERSX_GAS_PRICE=1000000000
MULTIVERSX_GAS_LIMIT=500000
MONGO_CONNECT_URI=mongodb+srv://user:pass@mongodb.example.com/airodb
```

## GitHub Actions Workflow

This repository includes a GitHub Actions workflow defined in `.github/workflows/build.yml`. The workflow is triggered on every push to any branch.

Here's a summary of the workflow:

1. It runs on an Ubuntu environment.

2. It checks out the latest code using `actions/checkout`.

3. It sets up the Docker Buildx environment using `docker/setup-buildx-action`.

4. It extracts the repository, branch, and commit information for tagging the Docker image.

5. It uses `docker/build-push-action` to build and push the Docker image with appropriate tags.

The workflow automates building and publishing Docker images to GitHub Container Registry when changes are pushed to the repository.

For more details, refer to the [GitHub Actions documentation](https://docs.github.com/actions).
