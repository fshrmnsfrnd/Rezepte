FROM node:25

WORKDIR /app

COPY . .

# Remove Windows-compiled node_modules (if any) and reinstall for Linux
RUN rm -rf node_modules package-lock.json
RUN npm install
RUN npx auth@latest generate
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "start"]