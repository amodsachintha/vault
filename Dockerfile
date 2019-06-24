FROM ubuntu:xenial

# Install curl, wget, node, net-tools and npm
RUN apt-get update
RUN apt-get install -y curl wget
RUN apt-get install net-tools
RUN curl -sL https://deb.nodesource.com/setup_10.x | bash -
RUN apt install -y nodejs && node --version && npm --version

RUN npm install -g nodemon

# API and Socket.io server port
EXPOSE 3000
EXPOSE 4444

# START
ENTRYPOINT cd /vault && nodemon .