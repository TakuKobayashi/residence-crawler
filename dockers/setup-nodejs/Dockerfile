FROM node:22.13.0-slim
COPY ./ /app
WORKDIR /app

RUN apt update
RUN apt install -y default-mysql-client git
RUN yarn install