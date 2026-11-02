// admin.js — painel de moderação (colaboradores + sugestões)

const escapeHtml = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[c]));

const fmtData = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
};

// estado dos filtros ativos
const filtros = { col: "todos", sug: "todos" };
let cacheCol = [];
let cacheSug = [];

// ---------- COLABORADORES ----------
function cardColaborador(c) {
  const comp = c.comprovante_path
    ? `<a href="/uploads/${escapeHtml(c.comprovante_path)}" target="_blank" class="admin-link">ver comprovante ↗</a>`
    : `<span class="admin-dim">sem comprovante</span>`;
  const lattes = c.lattes_url
    ? `<a href="${escapeHtml(c.lattes_url)}" target="_blank" class="admin-link">Lattes ↗</a>`
    : `<span class="admin-dim">sem Lattes</span>`;
  return `
    <div class="admin-card">
      <div class="admin-card-main">
        <div class="admin-card-title">${escapeHtml(c.nome)}
          <span class="badge badge-${c.status}">${c.status}</span>
          <span class="badge ${c.verificado ? "badge-aprovado" : "badge-analisando"}">${c.verificado ? "verificado ✓" : "não verif."}</span>
        </div>
        <div class="admin-card-meta">
          <span>${escapeHtml(c.email)}</span>
          <span class="admin-sep">·</span>
          <span>${escapeHtml(c.ocupacao)}</span>
          <span class="admin-sep">·</span>
          <span>${fmtData(c.criado_em)}</span>
        </div>
        <div class="admin-card-meta">${lattes} <span class="admin-sep">·</span> ${comp}</div>
      </div>
      <div class="admin-actions">
        <button class="mini-btn ok"   data-type="col" data-id="${c.id}" data-status="aprovar">Aprovar</button>
        <button class="mini-btn bad"  data-type="col" data-id="${c.id}" data-status="recusar">Recusar</button>
        <button class="mini-btn bad danger" data-delete-id="${c.id}">Deletar conta</button>
      </div>
    </div>`;
}

// ---------- SUGESTÕES ----------
function cardSugestao(s) {
  let ident = `<span class="admin-dim">anônima</span>`;
  
  if (s.autor_nome) {
      ident = `<span style="color: var(--teal); font-weight: 500;">✓ Colaborador: ${escapeHtml(s.autor_nome)}</span>`;
  } else if (s.email) {
      ident = `<a href="mailto:${escapeHtml(s.email)}" class="admin-link">${escapeHtml(s.email)}</a>`;
  }

  return `
    <div class="admin-card">
      <div class="admin-card-main">
        <div class="admin-card-title">${escapeHtml(s.titulo)}
          <span class="badge badge-${s.status}">${s.status}</span>
        </div>
        <div class="admin-card-meta">
          <span class="admin-tag">${escapeHtml(s.tipo)}</span>
          <span class="admin-sep">·</span>
          <span>${ident}</span>
          <span class="admin-sep">·</span>
          <span>${fmtData(s.criado_em)}</span>
        </div>
        <div class="admin-card-desc">${escapeHtml(s.descricao)}</div>
      </div>
      <div class="admin-actions">
        <button class="mini-btn"     data-type="sug" data-id="${s.id}" data-status="analisando">Analisando</button>
        <button class="mini-btn ok"  data-type="sug" data-id="${s.id}" data-status="aplicada">Aplicada</button>
        <button class="mini-btn bad" data-type="sug" data-id="${s.id}" data-status="arquivada">Arquivar</button>
      </div>
    </div>`;
}

function render() {
  const col = cacheCol.filter((c) => filtros.col === "todos" || c.status === filtros.col);
  const sug = cacheSug.filter((s) => filtros.sug === "todos" || s.status === filtros.sug);

  document.getElementById("col-count").textContent = col.length;
  document.getElementById("sug-count").textContent = sug.length;

  document.getElementById("col-list").innerHTML = col.length
    ? col.map(cardColaborador).join("")
    : `<div class="admin-empty">Nenhum colaborador neste filtro.</div>`;
  document.getElementById("sug-list").innerHTML = sug.length
    ? sug.map(cardSugestao).join("")
    : `<div class="admin-empty">Nenhuma sugestão neste filtro.</div>`;
}

async function carregar() {
  try {
    [cacheCol, cacheSug] = await Promise.all([
      NucleoAuth.api("/api/colaboradores"),
      NucleoAuth.api("/api/sugestoes"),
    ]);
    render();
  } catch (e) {
    const msg = `<div class="admin-empty err">✗ Erro: ${escapeHtml(e.message)} — O usuário tem permissão?</div>`;
    document.getElementById("col-list").innerHTML = msg;
    document.getElementById("sug-list").innerHTML = "";
  }
}

// ---------- eventos (delegação) ----------
document.addEventListener("click", async (e) => {

  // botão de ação (aprovar/recusar colaborador ou mudar status da sugestão)
  const btn = e.target.closest(".mini-btn");
  if (btn && !btn.dataset.deleteId) {
    const { type, id, status } = btn.dataset;
    btn.disabled = true;
    try {
      const url = type === "col" ? `/api/colaboradores/${id}` : `/api/sugestoes/${id}`;
      const body_data = type === "col" ? { acao: status } : { status: status }; 
      
      const updated = await NucleoAuth.api(url, { method: "PATCH", body: body_data });
      
      const cache = type === "col" ? cacheCol : cacheSug;
      const i = cache.findIndex((x) => x.id === Number(id));
      if (i >= 0) cache[i] = updated;
      
      render();
    } catch (err) {
      alert("Erro: " + err.message);
      btn.disabled = false;
    }
    return;
  }

  // botão de deletar conta
  const delBtn = e.target.closest("[data-delete-id]");
  if (delBtn) {
    const id = delBtn.dataset.deleteId;
    if (!confirm("Tem certeza que deseja excluir esta conta? Esta ação é irreversível.")) return;
    delBtn.disabled = true;
    try {
      await NucleoAuth.api(`/api/colaboradores/${id}`, { method: "DELETE" });
      cacheCol = cacheCol.filter((x) => x.id !== Number(id));
      render();
    } catch (err) {
      alert("Erro: " + err.message);
      delBtn.disabled = false;
    }
    return;
  }

  // botão de filtro
  const fbtn = e.target.closest(".filter-btn");
  if (fbtn) {
    const group = fbtn.closest("#col-filters") ? "col" : "sug";
    filtros[group] = fbtn.dataset.f;
    fbtn.parentElement.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
    fbtn.classList.add("active");
    render();
  }
});

carregar();

setInterval(carregar, 5000);