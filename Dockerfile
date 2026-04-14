FROM node:25

WORKDIR /app
COPY . .

RUN rm -rf node_modules package-lock.json
RUN npm install 
RUN npm run build
RUN chmod +x entrypoint.sh
EXPOSE 3000
ENTRYPOINT [ "./entrypoint.sh" ]