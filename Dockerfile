###################
# BUILD FOR LOCAL DEVELOPMENT
###################

FROM node:20-alpine As development

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY  . .

RUN npx prisma generate



