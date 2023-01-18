FROM alpine:latest
LABEL org.opencontainers.image.maintainer="AsP3X"
LABEL org.opencontainers.image.name="healthcheck"

RUN apk update && apk upgrade
RUN apk add --no-cache bash curl nano wget
RUN rm /bin/sh && ln -s /bin/bash /bin/sh

ENV NVM_DIR /usr/local/nvm
ENV NODE_VERSION 18.12.0
RUN mkdir -p $NVM_DIR

RUN wget -qO- https://raw.githubusercontent.com/creationix/nvm/v0.33.11/install.sh | bash
RUN . $NVM_DIR/nvm.sh && nvm install $NODE_VERSION

ENV NODE_PATH $NVM_DIR/v$NODE_VERSION/lib/node_modules
ENV PATH      $NVM_DIR/v$NODE_VERSION/bin:$PATH

RUN apk add --no-cache nodejs npm
RUN npm install -g yarn

WORKDIR /service

COPY assets/ /service/assets/
COPY routes /service/routes/
COPY package.json /service/package.json
COPY yarn.lock /service/yarn.lock
COPY .env /service/.env

RUN yarn install

SHELL ["yarn", "start"]