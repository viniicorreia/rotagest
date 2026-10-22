# syntax=docker/dockerfile:1
#
# Build estático da SPA servido pelo Nginx (porta 8080, sem root).
#
#   docker build --build-arg VITE_API_URL=https://api.seudominio.com.br/api/v1 -t rotagest-web .
#   docker run --rm -p 8080:8080 rotagest-web
#
# VITE_API_URL é embutida no bundle (Vite) e a origem dela é liberada no
# Content-Security-Policy (connect-src). Mudou a URL da API? Gere a imagem de novo.
# Uma URL relativa (ex.: /api/v1, com a API atrás do mesmo domínio) mantém connect-src 'self'.

# --- Etapa 1: build ---
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL=http://localhost:3000/api/v1
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Preenche os marcadores do nginx.conf:
#   __CSP_CONNECT_SRC__  -> 'self' + origem de VITE_API_URL
#   __CSP_SCRIPT_HASHES__ -> hashes sha256 dos <script> inline do index.html (script de tema)
RUN node <<'JS'
const fs = require('node:fs');
const crypto = require('node:crypto');

const connect = ["'self'"];
try {
  connect.push(new URL(process.env.VITE_API_URL).origin);
} catch {
  // URL relativa: a API é servida na mesma origem.
}

const html = fs.readFileSync('dist/index.html', 'utf8');
const hashes = [];
for (const m of html.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)) {
  hashes.push(`'sha256-${crypto.createHash('sha256').update(m[1], 'utf8').digest('base64')}'`);
}

let conf = fs.readFileSync('nginx.conf', 'utf8');
for (const marker of ['__CSP_CONNECT_SRC__', '__CSP_SCRIPT_HASHES__']) {
  if (!conf.includes(marker)) throw new Error(`Marcador ${marker} ausente no nginx.conf`);
}
conf = conf.replaceAll('__CSP_CONNECT_SRC__', [...new Set(connect)].join(' '));
conf = conf.replaceAll('__CSP_SCRIPT_HASHES__', hashes.join(' '));
fs.writeFileSync('/tmp/nginx.conf', conf);
console.log(`CSP connect-src: ${connect.join(' ')} | scripts inline: ${hashes.length}`);
JS

# --- Etapa 2: Nginx ---
FROM nginx:1.27-alpine
# A config principal já define o server; o default.conf do pacote não é usado.
RUN rm -f /etc/nginx/conf.d/default.conf
COPY --from=build /tmp/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/dist /usr/share/nginx/html
# Usuário sem privilégios da imagem oficial (uid 101); pid e temporários ficam em /tmp.
USER nginx
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
