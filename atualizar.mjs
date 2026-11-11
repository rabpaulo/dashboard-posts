#!/usr/bin/env node
/* Atualiza os dados do painel pela API oficial do Reddit (sem dependências, Node 18+).

   O Reddit bloqueia leitura anônima do seu histórico, então precisa de um app "script":
     1. https://www.reddit.com/prefs/apps → "create app" → tipo "script"
        (redirect uri: http://localhost:8080)
     2. Copie .env.example para .env e preencha.
     3. node atualizar.mjs

   Grava posts.live.js ao lado do HTML; o painel lê esse arquivo ao abrir.
   Para rodar sozinho todo dia (cron):  0 9 * * *  cd /caminho/do/projeto && node atualizar.mjs
*/
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dir = dirname(fileURLToPath(import.meta.url));
const envFile = join(dir, '.env');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

const { REDDIT_CLIENT_ID: id, REDDIT_CLIENT_SECRET: secret, REDDIT_USERNAME: user, REDDIT_PASSWORD: pass } = process.env;
if (!id || !secret || !user || !pass) {
  console.error('Faltam credenciais. Preencha o .env (veja .env.example e o cabeçalho deste arquivo).');
  process.exit(1);
}
const UA = `script:whatwepromote:1.0 (by /u/${user})`;

async function api(url, init = {}) {
  const res = await fetch(url, { ...init, headers: { 'User-Agent': UA, ...init.headers } });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { /* resposta não-JSON */ }
  if (!res.ok || !json || json.error) {
    throw new Error(`${res.status} em ${new URL(url).pathname}: ${json?.error_description || json?.error || json?.message || text.slice(0, 160)}`);
  }
  return json;
}

try {
  const { access_token: token } = await api('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: { Authorization: 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'password', username: user, password: pass })
  });

  const posts = [];
  let after = '';
  do {
    const page = await api(`https://oauth.reddit.com/user/${encodeURIComponent(user)}/submitted?limit=100&raw_json=1&after=${after}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    for (const { data: d } of page.data.children) {
      posts.push({
        id: d.id, sub: d.subreddit, title: d.title, score: d.score, comments: d.num_comments,
        permalink: d.permalink, timestamp: d.created_utc,
        body: `${(d.selftext || '').slice(0, 1500)} ${d.url || ''}`,
        removed: !!d.removed_by_category
      });
    }
    after = page.data.after || '';
  } while (after);

  const out = { fetchedAt: new Date().toISOString(), user, posts };
  writeFileSync(join(dir, 'posts.live.js'), `window.LIVE_POSTS = ${JSON.stringify(out, null, 1)};\n`);
  console.log(`✓ ${posts.length} posts de u/${user} gravados em posts.live.js`);
} catch (err) {
  console.error('Falhou:', err.message);
  if (/invalid_grant/.test(err.message)) console.error('→ Usuário/senha incorretos, ou a conta usa 2FA (nesse caso use a senha no formato  senha:código).');
  process.exit(1);
}
