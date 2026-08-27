# Backend container for Render.
# Render has no native PHP runtime, so we ship a small PHP image that includes
# the pdo_pgsql extension (required to reach Neon) and serve the API.
FROM php:8.2-cli

# pdo_pgsql needs libpq headers to build.
RUN apt-get update \
 && apt-get install -y --no-install-recommends libpq-dev \
 && docker-php-ext-install pdo pdo_pgsql \
 && apt-get purge -y --auto-remove \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . /app

# A few concurrent workers so parallel dashboard requests don't queue behind
# each other on PHP's built-in server. Fine for a low-traffic staff portal.
ENV PHP_CLI_SERVER_WORKERS=4

# Render provides $PORT and terminates TLS in front of us. Bind to it.
CMD ["sh", "-c", "php -S 0.0.0.0:${PORT:-10000} -t /app"]
