# Container for the FarmTown engagement bot (engagement-bot.js).
# The one-shot server builder (discord-setup.js) is also included so you can run
# it from the image if you like: `docker run ... node discord-setup.js`.
FROM node:22-alpine

WORKDIR /app

# Install production deps first for better layer caching.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# App source.
COPY . .

ENV NODE_ENV=production

# Default process: the always-on engagement bot.
CMD ["node", "engagement-bot.js"]
