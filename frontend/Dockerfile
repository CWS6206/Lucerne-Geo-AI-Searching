FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

# Vite default port is 5173, but we expose 3000 as requested
CMD ["npm", "run", "dev", "--", "--port", "3000", "--host"]
