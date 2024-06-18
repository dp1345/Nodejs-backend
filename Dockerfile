# Use the official Node.js 18 image as the base image
FROM node:18

# Install nodemon globally
RUN npm install -g nodemon

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code to the working directory
COPY . .

# Expose the port on which your application will run
EXPOSE 8000

# Command to run your application with nodemon
CMD ["npm", "start"]
