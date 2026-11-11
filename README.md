# Reddit Promotion Heatmap

Painel estático de prontidão, cooldowns, desempenho e regras por subreddit para **Dayle** e **Soulcrate**.

Acesse: https://rabpaulo.github.io/dashboard-posts/

## Como funciona

- `index.html` — o painel completo (HTML, CSS e JS em um único arquivo, sem build).
- `posts.live.js` — dados opcionais gerados por `atualizar.mjs`. Quando presente, o painel lê esse arquivo ao abrir. Sem ele, o painel usa os dados embutidos (`SEED_POSTS`).
- `atualizar.mjs` — busca seu histórico de posts na API oficial do Reddit e grava `posts.live.js`.

## Atualizar os dados

1. Crie um app tipo **script** em https://www.reddit.com/prefs/apps (redirect: `http://localhost:8080`).
2. Copie `.env.example` para `.env` e preencha as credenciais.
3. Rode:

```bash
node atualizar.mjs
```

4. Faça commit e push de `posts.live.js` para publicar os dados no painel.

> O `.env` fica fora do repositório. Nunca comite credenciais.

## Deploy

Publicado via **GitHub Pages** a partir da branch `main` (raiz do repositório). Qualquer push na `main` atualiza o site em alguns instantes.
