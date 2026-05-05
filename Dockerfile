# Coolify deploy — serve o BI RADKE estaticamente via Caddy.
# Os artefatos (data.js, app.bundle.js, report.json) sao pre-buildados
# localmente e commitados no repo. Container so serve files.

FROM caddy:2-alpine

# Static files (todos pre-buildados localmente: data.js, data-extras.js,
# app.bundle.js, report.json sao gerados via START.bat antes do git push).
COPY index.html /srv/
COPY styles.css /srv/
COPY data.js /srv/
COPY data-extras.js /srv/
COPY app.bundle.js /srv/
COPY report.json /srv/
COPY assets /srv/assets

# Caddyfile com basic_auth controlado por env vars
COPY Caddyfile /etc/caddy/Caddyfile

EXPOSE 80
