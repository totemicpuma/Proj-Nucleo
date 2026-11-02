// ---- Roadmap data (DAG: topics that build on one another) ----
const NODES = [
  { id:"n0", label:"FÍSICA NUCLEAR",        x:125, y:10,  status:"done",
    desc:"Estrutura atômica, núcleo, energia de ligação — a base que sustenta todo o resto do percurso.", href:"fisica-nuclear.html" },
  { id:"n1", label:"ESTRUTURA ATÔMICA",     x:15,  y:85,  status:"done",
    desc:"Prótons, nêutrons, isótopos e estabilidade nuclear.", href:"estrutura-atomica.html" },
  { id:"n2", label:"RADIOATIVIDADE",        x:235, y:85,  status:"active",
    desc:"Decaimento radioativo, meia-vida e tipos de radiação emitida." },
  { id:"n3", label:"FISSÃO NUCLEAR",        x:125, y:160, status:"locked",
    desc:"Divisão do núcleo pesado, liberação de energia e reações em cadeia." },
  { id:"n4", label:"MODERAÇÃO DE NÊUTRONS", x:125, y:235, status:"locked",
    desc:"Seção de choque, termalização e materiais moderadores." },
  { id:"n5", label:"TIPOS DE REATORES",     x:125, y:310, status:"locked",
    desc:"PWR, BWR e outras arquiteturas de reatores comerciais." },
  { id:"n6", label:"TERMO-HIDRÁULICA",      x:15,  y:385, status:"locked",
    desc:"Transferência de calor, ciclo de vapor e escoamento no núcleo do reator." },
  { id:"n7", label:"INSTRUMENTAÇÃO",        x:235, y:385, status:"locked",
    desc:"Detectores de nêutrons, sistemas de monitoramento e controle de potência." },
  { id:"n8", label:"SEGURANÇA NUCLEAR",     x:125, y:460, status:"locked",
    desc:"Sistemas de segurança, defesa em profundidade e análise de acidentes." },
  { id:"n9", label:"REDES NEURAIS APLICADAS", x:125, y:535, status:"done",
    desc:"MLP e CNN aplicadas à reconstrução de potência do núcleo do reator.", href:"redes-neurais.html" },
];

const EDGES = [
  ["n0","n1"], ["n0","n2"],
  ["n1","n3"], ["n2","n3"],
  ["n3","n4"], ["n4","n5"],
  ["n5","n6"], ["n5","n7"],
  ["n6","n8"], ["n7","n8"],
  ["n7","n9"], ["n8","n9"],
];

const NODE_W = 150, NODE_H = 38;
const byId = Object.fromEntries(NODES.map(n => [n.id, n]));

const roadmapSvg = document.getElementById("roadmap-svg");
const CURRENT_ID = roadmapSvg ? roadmapSvg.dataset.current || null : null;

function anchor(node, edge){
  // top-center and bottom-center anchor points
  const cx = node.x + NODE_W/2;
  return { top: {x:cx, y:node.y}, bottom: {x:cx, y:node.y+NODE_H} };
}

const edgesG = document.getElementById("rm-edges");
const nodesG = document.getElementById("rm-nodes");

EDGES.forEach(([a,b]) => {
  const na = byId[a], nb = byId[b];
  const pa = anchor(na).bottom;
  const pb = anchor(nb).top;
  const midY = (pa.y + pb.y) / 2;
  const d = `M ${pa.x} ${pa.y} C ${pa.x} ${midY}, ${pb.x} ${midY}, ${pb.x} ${pb.y}`;
  const path = document.createElementNS("http://www.w3.org/2000/svg","path");
  path.setAttribute("d", d);
  const isFlow = (na.status === "done" || na.status === "active");
  path.setAttribute("class", "rm-edge" + (isFlow ? " flow" : ""));
  edgesG.appendChild(path);
});

function svgEl(tag, attrs){
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for(const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}

NODES.forEach(node => {
  const isCurrent = node.id === CURRENT_ID;
  const g = svgEl("g", { class: `rm-node ${node.status}${isCurrent ? " current" : ""}`, "data-id": node.id });

  const rect = svgEl("rect", {
    x: node.x, y: node.y, width: NODE_W, height: NODE_H, rx: 2
  });
  g.appendChild(rect);

  // corner ticks (signature schematic detail)
  const c = 7;
  const corners = [
    [node.x, node.y, c, 0, 0, c],
    [node.x+NODE_W, node.y, -c, 0, 0, c],
    [node.x, node.y+NODE_H, c, 0, 0, -c],
    [node.x+NODE_W, node.y+NODE_H, -c, 0, 0, -c],
  ];
  corners.forEach(([px,py,dx1,dy1,dx2,dy2]) => {
    const p = svgEl("path", {
      d: `M ${px+dx1} ${py+dy1} L ${px} ${py} L ${px+dx2} ${py+dy2}`,
      class: "rm-corner"
    });
    g.appendChild(p);
  });

  // status dot
  const dot = svgEl("circle", {
    cx: node.x+14, cy: node.y+NODE_H/2, r: 3,
    fill: node.status === "done" ? "var(--amber)" : node.status === "active" ? "var(--teal)" : "var(--text-dim)"
  });
  g.appendChild(dot);

  if(node.status === "active"){
    const ring = svgEl("circle", {
      cx: node.x+14, cy: node.y+NODE_H/2, r: 3,
      fill:"none", stroke:"var(--teal)", "stroke-width":1,
      class: "pulse-ring"
    });
    g.appendChild(ring);
  }

  const text = svgEl("text", {
    x: node.x+26, y: node.y+NODE_H/2+4,
    "font-size": 9.5, "letter-spacing":"0.03em"
  });
  text.textContent = node.label;
  g.appendChild(text);

  // accessible tooltip
  const title = svgEl("title", {});
  title.textContent = node.href
    ? `Abrir módulo: ${node.label}`
    : `${node.label} — bloqueado`;
  g.appendChild(title);

  // small "open" arrow for nodes that link to a built module page
  if(node.href){
    const arrow = svgEl("text", {
      x: node.x + NODE_W - 14, y: node.y + NODE_H/2 + 4,
      "font-size": 11, "class": "rm-open-arrow"
    });
    arrow.textContent = "↗";
    g.appendChild(arrow);
  }

  // "you are here" marker for the current page's node
  if(isCurrent){
    const tagY = node.y - 8;
    const tag = svgEl("text", {
      x: node.x + NODE_W/2, y: tagY,
      "text-anchor": "middle", "font-size": 8,
      class: "rm-here-tag"
    });
    tag.textContent = "VOCÊ ESTÁ AQUI";
    g.appendChild(tag);
    const pointer = svgEl("path", {
      d: `M ${node.x+NODE_W/2-4} ${tagY+4} L ${node.x+NODE_W/2+4} ${tagY+4} L ${node.x+NODE_W/2} ${tagY+9} Z`,
      class: "rm-here-pointer"
    });
    g.appendChild(pointer);
  }

  g.addEventListener("click", () => {
    selectNode(node);
    if(node.href && !isCurrent){
      window.location.href = node.href;
    }
  });
  nodesG.appendChild(g);
});

const infoBox = document.getElementById("rm-info");

function selectNode(node){
  const isCurrent = node.id === CURRENT_ID;
  const statusLabel = isCurrent
    ? "VOCÊ ESTÁ AQUI"
    : { done:"CONCLUÍDO", active:"EM ANDAMENTO", locked:"BLOQUEADO" }[node.status];
  infoBox.className = "rm-info " + node.status + (isCurrent ? " current" : "");
  infoBox.innerHTML = `
    <div class="rm-info-title">${node.label}<span class="rm-info-status">${statusLabel}</span></div>
    <div class="rm-info-desc">${node.desc}</div>
  `;
}

// on load, highlight the current page's node in the info panel (if any)
if(CURRENT_ID && byId[CURRENT_ID]){
  selectNode(byId[CURRENT_ID]);
}

const ctaStart = document.getElementById("cta-start");
if(ctaStart){
  ctaStart.addEventListener("click", () => {
    const active = NODES.find(n => n.status === "active") || NODES[0];
    selectNode(active);
    document.querySelector(".roadmap-panel").scrollIntoView({ behavior:"smooth", block:"center" });
  });
}

// ---- Mini-roadmap dock (páginas de módulo): clique alterna .open (fallback p/ toque) ----
// hover já expande no desktop; em telas de toque não há hover, então o toque abre/fecha.
const dock = document.querySelector(".module-page .roadmap-panel");
if (dock) {
  dock.addEventListener("click", (e) => {
    // não toggla se o clique foi num nó do roadmap (isso deve navegar)
    if (e.target.closest(".rm-node")) return;
    dock.classList.toggle("open");
  });
  document.addEventListener("click", (e) => {
    if (!dock.contains(e.target)) dock.classList.remove("open");
  });
}