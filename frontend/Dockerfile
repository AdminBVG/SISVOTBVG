FROM node:18-alpine
WORKDIR /app
COPY package.json tsconfig.json tsconfig.node.json vite.config.ts vitest.config.ts ./
COPY src ./src
COPY index.html ./
RUN npm install && npm run build
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0"]
