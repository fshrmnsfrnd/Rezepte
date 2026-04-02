FROM node:25

WORKDIR /app

#RUN apt-get update && \
#	apt-get install -y python3 make g++ && \
#	rm -rf /var/lib/apt/lists/*

#ENV npm_config_build_from_source=true \
#	npm_config_nodedir=/usr/local \
#	npm_config_fetch_retries=5 \
#	npm_config_fetch_retry_mintimeout=20000 \
#	npm_config_fetch_retry_maxtimeout=120000

COPY . .

RUN rm -rf node_modules package-lock.json
RUN npm -v
RUN npm install --build-from-source
#RUN npx auth@latest generate
RUN npm run build
EXPOSE 3000
ENTRYPOINT ["npx", "auth@latest", "migrate", "--yes", "&&", "npm", "run", "start"]