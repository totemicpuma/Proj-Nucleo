# Catálogo de Tecnologias — NÚCLEO (Dashboard Nuclear)

> Documento de referência técnica do projeto.
> Última atualização: 2026-07-29.
> Contexto: projeto acadêmico para a disciplina de Segurança da Informação — IFF Campus Bom Jesus do Itabapoana.

---

## Visão geral da arquitetura

```
Cliente (navegador)
    │
    │  HTTP/JSON
    ▼
Flask (app.py)
    │
    ├── Templates Jinja2 (HTML)
    ├── CSS estático
    ├── JavaScript estático
    └── SQLite via SQLAlchemy
```

O projeto é uma aplicação web servida por Flask, com frontend estático enriquecido por JavaScript e um banco de dados SQLite local. Não há build step, Webpack, SPA framework ou backend separado: é Flask "unificado" na própria pasta do projeto.

---

## 1. Linguagem e runtime

| Tecnologia | Versão / contexto | Função no projeto |
| --- | --- | --- |
| **Python 3.11** | runtime local | Linguagem do backend. Todo o servidor, banco de dados, autenticação e regras de negócio rodam em Python. |

---

## 2. Backend — framework e servidor WSGI

| Tecnologia | Função no projeto |
| --- | --- |
| **Flask** | Framework WSGI principal. Define rotas, serve templates Jinja2, serve arquivos estáticos, gerencia request/response JSON e orquestra todo o fluxo (login, cadastro, admin, quiz, ranking, uploads). |
| **Werkzeug / built-in dev server** | Em desenvolvimento, o `app.run(host='0.0.0.0', port=5000, debug=True)` usa o servidor de desenvolvimento do Werkzeug. Não indicado para produção. |

Observação de implementação:
- O `SECRET_KEY` é carregado de variável de ambiente, com fallback para `dev-secret-troque-isso-em-producao`. Em produção, a troca dessa variável é obrigatória.

---

## 3. ORM e banco de dados

| Tecnologia | Função no projeto |
| --- | --- |
| **SQLite** | Banco de dados embutido, representado pelo arquivo `nucleo.db` na raiz. Não requer servidor externo e basta um arquivo no filesystem. |
| **Flask-SQLAlchemy** | ORM sobre SQLite. Mapeia tabelas como classes Python (`Colaborador`, `Sugestao`), abstrai criação de tabelas (`db.create_all()`) e fornece interface de queries. |

Modelos definidos:

- `Colaborador` — usuários do sistema. Campos: nome, email, senha_hash, ocupação, lattes_url, status, verificado, is_admin, comprovante_path, timestamps.
- `Sugestao` — contribuições anônimas ou de colaborador. Campos: titulo, tipo, email, descricao, status, criado_em, vínculo opcional com `Colaborador`.

---

## 4. Segurança e autenticação

| Tecnologia | Função no projeto |
| --- | --- |
| **Werkzeug — `generate_password_hash` / `check_password_hash`** | Armazena senhas de forma irreversível (hash). A senha em texto puro nunca é salva no banco. |
| **itsdangerous — `URLSafeTimedSerializer`** | Assina e serializa tokens de sessão do usuário. O token emitido no login carrega apenas o `id` do usuário, é assinado com `SECRET_KEY` e tem validade de 7 dias (`TOKEN_MAX_AGE`). |
| **sessionStorage (browser)** | Armazena tokens e dados do usuário no lado do cliente, separados entre `nucleo_token` / `nucleo_user` para usuários comuns e `nucleo_admin_token` / `nucleo_admin_user` para área ` /admin`. Isso evita vazamento de sessão entre os dois contextos. |

Decisões de arquitetura relevantes:
- Autenticação stateless: não há sessão no banco; a autenticidade do usuário depende apenas do token assinado e válido.
- O administrador padrão é criado automaticamente na primeira execução via `_bootstrap_admin()`, usando `ADMIN_EMAIL` / `ADMIN_SENHA` de variáveis de ambiente ou defaults fixos. A senha padrão inicial exibe no banner de inicialização para obrigar a troca.
- Upload de comprovante de verificação restringe extensões e usa `secure_filename` do Werkzeug antes de salvar em `uploads/`.

---

## 5. Frontend

### 5.1 HTML e templating

| Tecnologia | Função no projeto |
| --- | --- |
| **HTML5** | Estrutura semântica das páginas. |
| **Jinja2** | Servido pelo Flask em templates dentro de `templates/`. Usado principalmente para injetar URLs de arquivos estáticos via `url_for('static', filename=...)` e evitar hardcode. |

Templates principais:
- `index.html` — página inicial, roadmap, ranking, destaques de comunidade.
- `admin.html` / `admin-login.html` — área administrativa.
- `login.html` / `cadastro.html` / `perfil.html` — fluxos de autenticação e conta.
- `estrutura-atomica.html` / `fisica-nuclear.html` / `redes-neurais.html` — módulos de conteúdo.
- `quiz-estrutura-atomica.html` / `quiz-fisica-nuclear.html` — avaliações por módulo.
- `sugestoes.html` / `ranking.html` — comunidade e ranking.

### 5.2 CSS

| Tecnologia | Função no projeto |
| --- | --- |
| **CSS puro + Custom Properties** | Todo o estilo vive em `static/css/style.css`. Usa variáveis em `:root` para tema escuro consistente (`--bg`, `--panel`, `--amber`, `--teal`, `--danger`, etc.). Layout usa Flexbox e componentes domésticos (cards, badges, botões, roadmap SVG). Sem framework CSS externo. |

### 5.3 JavaScript

| Tecnologia / padrão | Função no projeto |
| --- | --- |
| **Vanilla JS ES6+** | Nenhum framework ou bundler. Todo o JS é puro, modular por arquivo e carregado estaticamente. |
| **nucleo-auth.js** | Camada de autenticação compartilhada. Fornece `token()`, `isLoggedIn()`, `setSession()`, `logout()`, `api()`. Separa contexto admin/user por meio de `sessionStorage`. |
| **nav-user.js** | Injeta o widget de perfil na navbar lateral, consumindo `NucleoAuth` e `/api/me`. |
| **script.js** | Controla o roadmap interativo na home: define `NODES` e `EDGES`, desenha arestas via SVG, trata cliques e estados `done / active / locked / current`. |
| **admin.js** | Painel administrativo: renderiza cards de colaboradores e sugestões, aplica filtros, aproxima as ações de aprovar / recusar / excluir para a API. |
| **quiz.js** | Engine genérica de quiz. Espera um objeto global `QUIZ` definido no HTML da página e aplica Fisher-Yates opcional via `quizSize` para re-sortear perguntas a cada execução. |
| **perfil.js** | Página do usuário: carrega perfil via `/api/me`, muda nome, muda senha, envia comprovante de verificação. |

### 5.4 SVG

| Tecnologia | Função no projeto |
| --- | --- |
| **SVG inline / dinâmico** | Usado no roadmap da home (`#roadmap-svg`) para desenhar nós e arestas de um grafo de tópicos de estudo. Criado via DOM em Vanilla JS — sem biblioteca de gráficos. |

### 5.5 Fontes

| Tecnologia | Função no projeto |
| --- | --- |
| **Google Fonts** | Carregamento remoto de IBM Plex Sans, IBM Plex Mono e Big Shoulders Display. Usado para identidade tipográfica técnica e institucional. |

---

## 6. Armazenamento de arquivos

| Tecnologia / recurso | Função no projeto |
| --- | --- |
| **Filesystem local (`uploads/`)** | Armazena comprovantes enviados por colaboradores (`.pdf`, `.png`, `.jpg`, `.jpeg`). Acesso ao arquivo é restrito pela rota `@admin_required`. |

---

## 7. Dependências Python utilizadas

Relevantes para documentação acadêmica:

- `Flask` — framework principal.
- `Flask-SQLAlchemy` — ORM.
- `SQLAlchemy` — engine e abstração do SQLite.
- `Werkzeug` — utilitários de segurança e servidor de desenvolvimento.
- `itsdangerous` — serialização e validação de tokens com expiração.

Todas essas dependências são comuns em pequenos aplicativos Flask e devem aparecer nas anotações de requisitos do projeto.

---

## 8. Boas práticas observadas no código

- Senhas não são armazenadas em texto puro.
- Tokens de autenticação possuem expiração.
- Área admin é rota separada (`/admin`, `/admin/dashboard`, `/admin/login`), sem compartilhamento com rotas públicas.
- Upload de arquivos é validado por extensão e por `secure_filename`.
- Side semantics: caminhos de templates usam `.html` apenas quando necessário por meio do catch-all.

---

## 9. Avisos para produção

1. Trocar `SECRET_KEY` por valor seguro e não comitar.
2. Remover `debug=True`.
3. Substituir servidor Werkzeug por um servidor WSGI/ASGI adequado.
4. Revisar permissões da pasta `uploads/`.
5. Avaliar migração do SQLite se o volume crescer.

---

## 10. Glossário técnico do sistema

> Objetivo: extrair o máximo de informações possíveis do sistema real catalogado,
> mapeando rotas, entidades, fluxos, componentes JS, regras de negócio e decisões arquiteturais.

### 10.1 Mapa de rotas e endpoints da aplicação

**Rotas de interface**

- `GET /` — Renderiza `index.html`.
- `GET /admin/login` — Renderiza `admin-login.html`.
- `GET /admin` — Renderiza `admin.html`.
- `GET /admin/dashboard` — Renderiza `admin.html`.
- `GET /<path:page_name>` — Catch-all para templates HTML. Ajusta o nome com sufixo `.html` quando necessário.

**Rotas de autenticação**

- `POST /api/login` — Autentica usuário e retorna token + colaborador.
- `GET /api/me` — Retorna o usuário autenticado atual; protegida por `login_required`.

**Rotas de colaboradores**

- `GET /api/colaboradores` — Lista todos os colaboradores.
- `POST /api/colaboradores` — Cria novo colaborador e aceita comprovante via multipart/form-data.
- `PATCH /api/colaboradores/<colab_id>` — Admin aprova/recusa colaborador via campo `acao`.
- `DELETE /api/colaboradores/<colab_id>` — Remove colaborador; protegida por `admin_required`.
- `PATCH /api/me/nome` — Atualiza o nome do usuário logado (chamada por `perfil.js`).
- `PATCH /api/me/senha` — Atualiza a senha do usuário logado; usa senha atual + nova senha.
- `POST /api/me/verificacao` — Envia comprovante de verificação do usuário logado.
- `GET /uploads/<filename>` — Download de comprovante; protegida por `admin_required`.

**Rotas de sugestões**

- `GET /api/sugestoes` — Lista sugestões; administrador visualiza todas, usuário comum apenas por meio do painel admin.
- `POST /api/sugestoes` — Cria sugestão anônima ou associada ao usuário autenticado.
- `PATCH /api/sugestoes/<sug_id>` — Admin atualiza status da sugestão; protegida por `admin_required`.
- `DELETE /api/sugestoes/<sug_id>` — Admin remove sugestão; protegida por `admin_required`.

**Rotas de ranking**

- `GET /api/ranking` — Lista apenas colaboradores aprovados que possuem sugestões com status `aplicada`.

**Observação arquitetural sobre rotas:** a aplicação é unificada em um único `app.py`, sem divisão por blueprints. Isso simplifica o deploy local, mas pode aumentar o acoplamento se o projeto crescer.

### 10.2 Entidades e domínio de dados

**Colaborador**

- Representa usuários da plataforma.
- Campos:
  - identificação: `id`, `nome`, `email`
  - autenticação: `senha_hash`
  - perfil: `ocupacao`, `lattes_url`, `comprovante_path`
  - estado: `status`, `verificado`, `is_admin`
  - auditoria temporal: `criado_em`
- Regras observadas:
  - `email` é único.
  - Senha mínima de 6 caracteres no cadastro.
  - Não existe rota pública de listagem detalhada separada do ranking/admin.
  - A senha nunca é serializada em `to_dict()`.

**Sugestao**

- Representa contribuições enviadas por usuários autenticados ou anonimamente.
- Campos:
  - identificação: `id`, `titulo`, `tipo`
  - contato: `email`
  - conteúdo: `descricao`
  - estado: `status`, `criado_em`
  - vínculo: `colaborador_id` (FK opcional para `Colaborador`)
- Regras observadas:
  - Status padrão no cadastro: `analisando`.
  - Workflow administrativo suporta transcrição para `aplicada` ou `arquivada`.
  - O autor pode ser colaborador identificado ou e-mail anônimo.

### 10.3 Estados e transições do sistema

**Fluxo de colaborador**

```
cadastro -> pendente -> aprovado OU recusado
                        |
                   verificado? -> True/False
```

- `pendente`: padrão após cadastro.
- `aprovado`: define acesso ao ranking.
- `verificado`: separado de `status`; indica envio/aprovação de comprovante.
- `is_admin`: flag booleana independente; atribuída via bootstrap ou admin.

**Workflow de sugestão**

```
analisando -> aplicada -> arquivada
```

- Criada automaticamente com `analisando`.
- Pode ser promovida a `aplicada` — estado relevante para o ranking.
- Pode ser `arquivada`.

**Workflow de autenticação**

```
login -> token assinado -> sessionStorage -> /api/me -> contexto protegido
                                    |
                              expira em 7 dias
                                    |
                              401 -> redirecionamento/login
```

### 10.4 Componentes do frontend

**NucleoAuth (`nucleo-auth.js`)**

- Responsável por toda comunicação autenticada com a API.
- Separa contextos por meio de chaves distintas no `sessionStorage`:
  - área pública: `nucleo_token`, `nucleo_user`
  - área admin: `nucleo_admin_token`, `nucleo_admin_user`
- Encapsula `Authorization: Bearer <token>` em requisições.
- Trata 401 removendo sessão internamente.
- Expõe método genérico `.api(url, opts)`.

**Nav user widget (`nav-user.js`)**

- Injeta dinamicamente o widget de usuário na navbar.
- Exibe inicial do nome, indicação de verificação e link para perfil.
- Se não houver token, exibe botão de "Entrar".

**Roadmap interativo (`script.js`)**

- Define um grafo de tópicos de estudo (`NODES`, `EDGES`).
- Estados dos nós:
  - `done` — módulo concluído/clicável
  - `active` — módulo atual
  - `locked` — bloqueado até pré-requisitos
  - `current` — nó correspondente à página atual
- Gera arestas curvas via SVG paths.
- Detecta a página atual via `#roadmap-svg.dataset.current` para destacar o nó atual.

**Painel admin (`admin.js`)**

- Carrega listas de colaboradores e sugestões em paralelo com `Promise.all`.
- Renderiza cards com escape HTML para prevenir injeção de markup.
- Delegação de eventos para ações de:
  - aprovar/recusar colaborador
  - modificar status de sugestão
  - excluir conta/sugestão com `confirm` nativo
- Aplica filtros locais por status.
- Polling automático a cada 5 segundos por `setInterval`.

**Quiz engine (`quiz.js`)**

- Motor genérico: depende de objeto `QUIZ` global definido pelo HTML.
- Suporta:
  - `questions` — lista de objetos com `q`, `options`, `correct`, `explain`
  - `quizSize` — número de perguntas por rodada; se menor que o total, aplica Fisher-Yates e amostragem
  - `passThreshold` — percentual mínimo para aprovação
  - `moduleName`, `moduleHref`, `roadmapHref` — metadados de retorno
- Estados da interface:
  - seleção de alternativa
  - confirmação manual por botão
  - feedback por questão
  - tela final com pontuação e botão de refazer

**Perfil (`perfil.js`)**

- Formulários:
  - mudança de nome (`/api/me/nome`)
  - mudança de senha com validação nativa de formulário (`/api/me/senha`)
  - envio de comprovante via `FormData` (`/api/me/verificacao`)
- Atualizações otimistas na UI após resposta da API.
- Redirecionamento automático para login se não houver token.

### 10.5 Segurança — componentes e decisões

**Hash de senha**

- Algoritmo: `generate_password_hash` do Werkzeug, que por padrão usa PBKDF2-based hash.
- Senha armazenada apenas como `senha_hash` com tamanho fixo de 255 caracteres.

**Tokens**

- Biblioteca: `itsdangerous.URLSafeTimedSerializer`.
- Sal (`salt`): fixo como `nucleo-auth`.
- Validade máxima: `7 * 24 * 60 * 60` segundos.
- Payload mínimo: apenas `{"id": user_id}`.
- Não há revogação explícita; a expiração e troca de `SECRET_KEY` invalidam tokens globalmente.

**Separação de sessões**

- Armazenamento client-side unificado em `sessionStorage`, mas com chaves separadas para admin e área pública.
- Motivo: impedir que um login comum conceda acesso ao painel `/admin`.

**Upload de arquivos**

- Extensões permitidas: `.pdf`, `.png`, `.jpg`, `.jpeg`.
- Nome seguro gerado por `secure_filename`.
- Salvo em `uploads/` na raiz do projeto.
- Download restrito a administradores autenticados via `@admin_required`.

**Proteção de rotas**

- `login_required` — bloqueia acesso quando token ausente ou inválido.
- `admin_required` — adicionalmente exige `is_admin == True`.

### 10.6 Regras de negócio

**Moderação**

- Administradores podem aprovar, recusar ou remover colaboradores.
- Administradores podem alterar status de sugestões e removê-las.
- Administrador padrão é criado automaticamente com `is_admin=True`, `status="aprovado"` e `verificado=True`.

**Verificação de conta**

- Colaborador sem comprovante pode enviar documento pela página de perfil.
- Administrador tem acesso direto ao arquivo enviado.
- Status `verificado` é independente de `status` (`aprovado`/`recusado`).

**Ranking**

- Considera apenas colaboradores com `status == "aprovado"`.
- Pontuação baseada em contagem de sugestões com `status == "aplicada"`.
- Ordenação: decrescente por pontos; desempate por ordem alfabética de nome.

### 10.7 Padrões arquiteturais observados

- **Servidor unificado:** Flask centraliza API + páginas em um único aplicativo.
- **Templates dinâmicos mínimos:** uso de Jinja2 quase só para `url_for('static', ...)`.
- **Stateless auth com tokens:** sem sessão no banco; sem CSRF token explícito observado nas rotas analisadas.
- **Vanilla frontend:** sem bundler ou framework; módulos JS formados por funções/IIFEs prontas para inclusão via `<script>`.
- **Separação por feature:** JS separado por domínio (`auth`, `nav`, `admin`, `quiz`, `perfil`, `roadmap`).
- **Topics as data:** roadmap definido como dados JS, não conteúdo hardcoded no HTML.

### 10.8 Limitações e pontos de atenção

- Autenticação stateless sem CSRF: se o sistema for usado em browser compartilhado, tokens em `sessionStorage` expiram só por inatividade; porém, se uma página legada chamar API via cookie Bearer, atenção adicional pode ser necessária.
- `debug=True` ativo por padrão: expõe stacktrace e reloader.
- SQLite sem bloqueio explícito: adequado para uso local/acadêmico, não para alta concorrência.
- IDs incrementais expostos em endpoints: padrão esperado em apps pequenos, mas relevante em avaliação de exposição de dados.

---

Fim do catálogo.
