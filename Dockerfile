FROM node:10 as builder
WORKDIR /app
RUN npm set progress=false && npm config set depth 0 && npm cache clean --force
COPY package.json package-lock.json /app/
RUN npm ci
COPY . /app/
# RUN npm test
RUN npm run lint
RUN npm run check-format
RUN npm run build

FROM mhart/alpine-node:base-10
RUN mkdir /app
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/dist/*.js /app/
CMD ["node", "main.js"]
