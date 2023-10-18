# This Dockerfile starts with the official Node.js 18 Alpine image as the base image.
FROM node:18-alpine

# Sets the working directory inside the container to /app.
WORKDIR /app

# Copies the yarn.lock file from the host machine to the working directory in the container.
COPY yarn.lock .

# Copies the package.json file from the host machine to the working directory in the container.
COPY package.json .

# Runs the 'yarn' command inside the container to install dependencies specified in package.json.
RUN yarn

# Changes the permissions of the /app directory to allow read, write, and execute access for all users.
RUN chmod 777 /app

# Copies all the files and directories from the host machine to the working directory in the container.
COPY . .

# Exposes port 3001 on the container to allow incoming traffic.
EXPOSE 3001

# Specifies the command that should be executed when the container starts.
CMD [ "yarn", "start" ]
