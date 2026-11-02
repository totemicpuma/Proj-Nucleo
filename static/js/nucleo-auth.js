// static/js/nucleo-auth.js
// Helper compartilhado de autenticação e requisições à API.
(function (global) {
  
  // Define em qual "mundo" estamos navegando (Acesso A ou Acesso B)
  const isAdminArea = () => window.location.pathname.includes("/admin");

  // Chaves completamente separadas (se logar em um, não afeta o outro)
  const getKeys = () => {
    return isAdminArea() 
      ? { token: "nucleo_admin_token", user: "nucleo_admin_user" }
      : { token: "nucleo_token", user: "nucleo_user" };
  };

  const NucleoAuth = {
    // Retorna o token do cofre correto
    token() {
      return sessionStorage.getItem(getKeys().token);
    },

    isLoggedIn() {
      return !!this.token();
    },

    setSession(token, colaborador) {
      const keys = getKeys();
      sessionStorage.setItem(keys.token, token);
      if (colaborador) {
        sessionStorage.setItem(keys.user, JSON.stringify(colaborador));
      }
    },

    user() {
      try {
        return JSON.parse(sessionStorage.getItem(getKeys().user) || "null");
      } catch (_) {
        return null;
      }
    },

    // Apenas limpa a memória, SÓ redireciona se uma URL for passada de propósito
    logout(redirectUrl) {
      const keys = getKeys();
      sessionStorage.removeItem(keys.token);
      sessionStorage.removeItem(keys.user);
      
      if (redirectUrl) {
          window.location.href = redirectUrl;
      }
    },

    async api(url, { method = "GET", body = null, json = true } = {}) {
      const headers = {};
      const tk = this.token();
      
      if (tk) headers["Authorization"] = "Bearer " + tk;
      
      const opts = { method, headers };
      
      if (body != null) {
        if (json) { 
            headers["Content-Type"] = "application/json"; 
            opts.body = JSON.stringify(body); 
        } else { 
            opts.body = body;
        }
      }
      
      const r = await fetch(url, opts);
      
      // SE NÃO ESTIVER LOGADO (401):
      // Limpa os dados de sessão fantasma, MAS NÃO MUDA A PÁGINA.
      // Isso salva a página inicial de ser jogada para o login sem querer!
      if (r.status === 401) { 
          this.logout(); 
          throw new Error("Sessão expirada ou usuário não autenticado."); 
      }
      
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.detail || `Erro ${r.status}`);
      }
      
      return r.status === 204 ? null : r.json();
    },

    async me() {
      if (!this.isLoggedIn()) return null;
      
      try {
        const colaborador = await this.api("/api/me");
        sessionStorage.setItem(getKeys().user, JSON.stringify(colaborador));
        return colaborador;
      } catch (_) {
        return null;
      }
    }
  };

  global.NucleoAuth = NucleoAuth;
})(window);