// nav-user.js — injeta o widget de perfil no canto sup. direito da nav.
// Requer nucleo-auth.js carregado antes. Uso: inclua os dois no fim da página.
(function () {
  const nav = document.querySelector("nav");
  if (!nav) return;
  const slot = nav.querySelector(".nav-status") || (() => {
    const d = document.createElement("div");
    nav.appendChild(d);
    return d;
  })();

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));

  const A = window.NucleoAuth;
  if (!A || !A.token()) {
    slot.outerHTML = `<div class="nav-user"><a href="login.html" class="nav-login">Entrar</a></div>`;
    return;
  }

  A.api("/api/me").then((u) => {
    const inicial = (u.nome || "?").trim().charAt(0).toUpperCase();
    const tick = u.verificado ? '<span class="tick" title="verificado">✓</span>' : "";
    slot.outerHTML = `
      <div class="nav-user">
        <a href="perfil.html" title="Meu perfil">
          <div class="nav-user-chip">
            <div class="nav-avatar ${u.verificado ? "verif" : ""}">${esc(inicial)}</div>
            <span class="nav-user-name">${esc(u.nome.split(" ")[0])}${tick}</span>
          </div>
        </a>
      </div>`;
  }).catch(() => {
    // token inválido/expirado: A.api já trata 401; fallback p/ botão Entrar
    slot.outerHTML = `<div class="nav-user"><a href="login.html" class="nav-login">Entrar</a></div>`;
  });
})();
