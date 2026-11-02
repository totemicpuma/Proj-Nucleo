// perfil.js — página do colaborador logado
const $ = (id) => document.getElementById(id);
const A = window.NucleoAuth;

// sem token -> vai pro login
if (!A.token()) window.location.href = "login.html";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[c]));

function msg(el, texto, ok = true) {
  el.textContent = (ok ? "✓ " : "✗ ") + texto;
  el.style.borderColor = ok ? "var(--teal)" : "var(--danger)";
  el.style.background = ok ? "var(--teal-dim)" : "var(--danger-dim)";
  el.classList.add("show");
}

function pintarPerfil(u) {
  $("profile-avatar").textContent = (u.nome || "?").trim().charAt(0).toUpperCase();
  $("nome").value = u.nome;

  const verif = $("profile-verif");
  verif.hidden = false;
  verif.textContent = u.verificado ? "verificado" : "não verificado";
  verif.className = "badge " + (u.verificado ? "badge-aprovado" : "badge-pendente");

  $("profile-name").childNodes[0].nodeValue = u.nome + " ";
  $("profile-meta").innerHTML =
    `${esc(u.email)} <span class="admin-sep">·</span> ${esc(u.ocupacao)} ` +
    `<span class="admin-sep">·</span> conta: ${esc(u.status)}`;

  // seção de verificação
  const vs = $("verif-status");
  if (u.verificado) {
    vs.innerHTML = "Sua conta está <b>verificada</b>. ✓";
  } else if (u.comprovante_path) {
    vs.innerHTML = `Documento enviado (<a class="admin-link" target="_blank" href="/${esc(u.comprovante_path)}">ver</a>). Aguardando análise da equipe.`;
  } else {
    vs.innerHTML = "Sua conta ainda <b>não</b> está verificada. Envie um documento abaixo.";
  }
}

async function carregar() {
  try {
    pintarPerfil(await A.api("/api/me"));
  } catch (e) {
    // 401 já redireciona dentro do A.api; outros erros:
    $("profile-name").childNodes[0].nodeValue = "Erro ao carregar ";
  }
}

// ---- mudar nome ----
$("nome-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const u = await A.api("/api/me/nome", { method: "PATCH", body: { nome: $("nome").value } });
    pintarPerfil(u);
    msg($("nome-msg"), "Nome atualizado.");
  } catch (err) { msg($("nome-msg"), err.message, false); }
});

// ---- mudar senha ----
$("senha-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!e.target.checkValidity()) { e.target.reportValidity(); return; }
  try {
    await A.api("/api/me/senha", { method: "PATCH", body: {
      senha_atual: $("senha_atual").value, senha_nova: $("senha_nova").value,
    }});
    e.target.reset();
    msg($("senha-msg"), "Senha alterada com sucesso.");
  } catch (err) { msg($("senha-msg"), err.message, false); }
});

// ---- enviar verificação ----
$("verif-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!e.target.checkValidity()) { e.target.reportValidity(); return; }
  const fd = new FormData();
  fd.append("comprovante", $("comprovante").files[0]);
  try {
    const u = await A.api("/api/me/verificacao", { method: "POST", body: fd, json: false });
    pintarPerfil(u);
    e.target.reset();
    msg($("verif-msg"), "Documento enviado! Aguarde a análise da equipe.");
  } catch (err) { msg($("verif-msg"), err.message, false); }
});

$("logout-btn").addEventListener("click", () => A.logout("login.html"));

carregar();
