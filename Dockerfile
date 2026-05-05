# Coolify deploy — serve estatica RADKE BI via nginx (mais previsivel que Caddy
# no setup do Coolify; veja issue de "exited:unhealthy" com caddy:2-alpine).

FROM nginx:alpine

# Static files (todos pre-buildados localmente)
COPY index.html /usr/share/nginx/html/
COPY styles.css /usr/share/nginx/html/
COPY data.js /usr/share/nginx/html/
COPY data-extras.js /usr/share/nginx/html/
COPY app.bundle.js /usr/share/nginx/html/
# Reports são gerados on-the-fly via API Coolify (radke-bi-api). Sem cache estatico.
COPY assets /usr/share/nginx/html/assets

# Config minima — SPA fallback + gzip + cache de assets
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
