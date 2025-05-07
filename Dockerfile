FROM node:lts-alpine

RUN mkdir -p /usr/src/node-app && chown -R node:node /usr/src/node-app

WORKDIR /usr/src/node-app

COPY package.json package-lock.json ./

USER node

#RUN yarn install --pure-lockfile
RUN npm ci 


COPY --chown=node:node . .

CMD ["yarn", "start"]

EXPOSE 3000
