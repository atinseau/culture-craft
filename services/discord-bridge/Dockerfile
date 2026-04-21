# Stage "test" — runs the unit test suite. If any test fails, the whole
# `docker build` fails, which makes Coolify abort the deploy.
FROM node:22-alpine AS test
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY src ./src
COPY test ./test
RUN npm test

# Stage "production" — the `COPY --from=test` below forces the test stage to
# complete successfully before this stage runs, so the image is built only
# when the test suite is green. Test files are not copied in — the final
# image contains production code only.
FROM node:22-alpine AS production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=test /app/src ./src
CMD ["node", "src/index.js"]
