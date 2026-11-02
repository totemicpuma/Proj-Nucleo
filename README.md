# ☢️ NÚCLEO — Plataforma Interativa de Estudos em Física Nuclear e Redes Neurais

![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-3.x-000000?logo=flask&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-SQLAlchemy-003B57?logo=sqlite&logoColor=white)
![JavaScript](https://img.shields.io/badge/Frontend-Vanilla%20JS%20%2B%20SVG-F7DF1E?logo=javascript&logoColor=black)

---

## 📌 Sobre o Projeto

O **NÚCLEO (Dashboard Nuclear)** é uma plataforma web acadêmica e colaborativa voltada para o estudo estruturado de **Estrutura Atômica**, **Física de Reatores Nucleares** e **Redes Neurais Artificiais aplicadas à Engenharia Nuclear**.

A aplicação conta com uma trilha de aprendizagem interativa renderizada em grafo SVG, módulos teóricos, avaliações dinâmicas com amostragem aleatória (*Quiz Engine*), sistema de submissão de contribuições científicas, verificação de colaboradores (com vínculo ao Currículo Lattes) e painel administrativo dedicado.

---

## ✨ Principais Funcionalidades

- **🗺️ Roadmap Interativo em Grafo SVG:** Visualização dinâmica da trilha de estudos com estados de progresso (`done`, `active`, `locked`, `current`) e conexões curvas geradas nativamente via DOM/SVG.
- **📚 Módulos Didáticos Especializados:**
  - *Estrutura Atômica*
  - *Física Nuclear*
  - *Redes Neurais Artificiais na Engenharia Nuclear*
- **📝 Motor de Avaliação (*Quiz Engine*):** Sistema de questionários com embaralhamento *Fisher-Yates*, feedback explicativo imediato por questão e cálculo de aprovação por limiar (*threshold*).
- **🔐 Autenticação Stateless & Segurança:**
  - Senhas protegidas com hash criptográfico irreversível (`PBKDF2` via `Werkzeug`).
  - Tokens de sessão assinados digitalmente com `itsdangerous` (`URLSafeTimedSerializer`) e expiração configurável (7 dias).
  - Isolamento estrito de sessão entre área pública e área administrativa (`/admin`).
- **🤝 Comunidade, Verificação e Ranking:**
  - Cadastro de colaboradores com link para o **Currículo Lattes** e upload seguro de comprovante institucional (`.pdf`, `.png`, `.jpg`) sanitizado com `secure_filename`.
  - Envio e moderação de sugestões (`analisando` → `aplicada` / `arquivada`) com ranking automático de contribuidores aprovados.

---

## 🏗️ Arquitetura do Sistema

```text
Cliente (Navegador Web)
    │
    │  HTTP / REST JSON + Bearer Token
    ▼
Servidor Flask (app.py)
    ├── Templates HTML5 / Jinja2 (templates/)
    ├── Estilos Custom Properties Dark UI (static/css/style.css)
    ├── Módulos Vanilla JS ES6+ (static/js/)
    │     ├── nucleo-auth.js  (Autenticação e cliente API)
    │     ├── script.js       (Grafo SVG do Roadmap)
    │     ├── quiz.js         (Engine de avaliações)
    │     ├── perfil.js       (Gestão de conta e verificação)
    │     └── admin.js        (Moderação em tempo real)
    └── Persistência ORM (Flask-SQLAlchemy / SQLite)
```

Para detalhes profundos sobre todas as rotas da API, modelos de banco de dados (`Colaborador`, `Sugestao`) e decisões de segurança, consulte o documento técnico [**`CATALOGO_TECNOLOGIAS.md`**](./CATALOGO_TECNOLOGIAS.md).

---

## 🚀 Como Executar Localmente

### 1. Clonar o repositório e instalar dependências
```bash
git clone https://github.com/totemicpuma/Proj-Nucleo.git
cd Proj-Nucleo
pip install -r requirements.txt
```

### 2. Variáveis de ambiente (opcional em desenvolvimento)
```bash
# PowerShell
$env:SECRET_KEY="sua-chave-secreta-segura"
$env:ADMIN_EMAIL="admin@nucleo.local"
$env:ADMIN_SENHA="admin-password"
```

### 3. Iniciar o servidor
```bash
python app.py
```

Acesse no navegador:
- **Plataforma Principal:** `http://localhost:5000`
- **Painel Administrativo:** `http://localhost:5000/admin/login`

---

## 📂 Estrutura de Diretórios

```text
├── app.py                      # Aplicação principal Flask, modelos ORM e API REST
├── CATALOGO_TECNOLOGIAS.md     # Documentação arquitetural e catálogo técnico completo
├── requirements.txt            # Dependências Python do projeto
├── static/
│   ├── css/
│   │   └── style.css           # Design system em tema escuro (CSS Custom Properties)
│   └── js/
│       ├── admin.js            # Lógica do painel de moderação
│       ├── nav-user.js         # Widget dinâmico do usuário logado
│       ├── nucleo-auth.js      # Cliente HTTP e gestão de tokens Bearer
│       ├── perfil.js           # Atualização de dados e upload de comprovante
│       ├── quiz.js             # Motor de quizzes interativos
│       └── script.js           # Renderizador do grafo SVG do roadmap
├── templates/                  # Páginas HTML5 / Jinja2 (módulos, quizzes, login, admin)
└── uploads/                    # Diretório de armazenamento seguro de comprovantes
```

---

## 👤 Autor

**Isaac Salles** (`@totemicpuma`)
- Instituto Federal Fluminense (IFF)
