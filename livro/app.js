/* Rolagem vertical única, índice fixo à esquerda. Todo texto visível vem de window.LIVRO. */

const CHAVE_POSICAO = "pravoceisa:posicao";
const CHAVE_TEMA = "pravoceisa:tema";
const CHAVE_FONTE = "pravoceisa:fonte";
const ESCALAS = [0.9, 1, 1.1, 1.2, 1.3];

const LIVRO = window.LIVRO;
let escala = 1;
let secoes = [];

function ler(chave) {
  try {
    return localStorage.getItem(chave);
  } catch (e) {
    return null;
  }
}

function gravar(chave, valor) {
  try {
    localStorage.setItem(chave, valor);
  } catch (e) {
    /* o livro segue sem memória */
  }
}

function el(tag, attrs, texto) {
  const node = document.createElement(tag);
  if (attrs) {
    for (const [chave, valor] of Object.entries(attrs)) {
      if (valor == null) continue;
      if (chave === "class") node.className = valor;
      else node.setAttribute(chave, valor);
    }
  }
  if (texto != null) node.textContent = texto;
  return node;
}

function hashAtual() {
  const bruto = location.hash.replace(/^#/, "");
  try {
    return decodeURIComponent(bruto);
  } catch (e) {
    return bruto;
  }
}

function blocoLinhas(texto, classe) {
  const box = el("div", { class: classe });
  for (const linha of String(texto).split("\n")) {
    box.append(el("span", { class: "linha" }, linha));
  }
  return box;
}

/* Linha vazia separa estrofes. Cada verso é um bloco com recuo pendente. */
function versos(texto) {
  const box = el("div", { class: "versos" });
  let estrofe = null;
  for (const linha of String(texto).split("\n")) {
    if (linha === "") {
      estrofe = null;
      continue;
    }
    if (!estrofe) {
      estrofe = el("p", { class: "estrofe" });
      box.append(estrofe);
    }
    estrofe.append(el("span", { class: "verso" }, linha));
  }
  return box;
}

function notaEl(texto) {
  return el("p", { class: "nota" }, texto);
}

function tituloPoema(poema) {
  const h = el("h1", { class: "titulo-poema" });
  if (poema.titulo) {
    h.textContent = poema.titulo;
  } else {
    h.classList.add("sem-titulo");
    h.textContent = poema.primeiro_verso + "…";
  }
  return h;
}

function paginaCapitulo(cap) {
  const classes = ["abertura"];
  if (cap.nota) classes.push("com-nota");
  if (cap.em_branco) classes.push("folha-vazia");
  const bloco = el("div", { class: classes.join(" ") });
  const miolo = el("div", { class: "abertura-miolo" });
  miolo.append(el("p", { class: "versalete" }, cap.numero));
  if (cap.titulo) miolo.append(el("h1", { class: "titulo-capitulo" }, cap.titulo));
  if (cap.epigrafe) miolo.append(blocoLinhas(cap.epigrafe, "epigrafe"));
  if (cap.em_branco) miolo.append(blocoLinhas(cap.em_branco, "em-branco"));
  bloco.append(miolo);
  if (cap.nota) bloco.append(notaEl(cap.nota));
  return bloco;
}

function paginaPoema(poema) {
  const artigo = el("article", { class: poema.nota ? "poema com-nota" : "poema" });
  const cabeca = el("header", { class: "cabeca-poema" });
  cabeca.append(tituloPoema(poema));
  if (poema.subtitulo) cabeca.append(el("p", { class: "subtitulo" }, poema.subtitulo));
  artigo.append(cabeca, versos(poema.texto));
  if (poema.nota) artigo.append(notaEl(poema.nota));
  return artigo;
}

function temaAtual() {
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "dia" || attr === "noite") return attr;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "noite" : "dia";
}

function sincronizarTema() {
  const rotulo = temaAtual() === "noite" ? "Dia" : "Noite";
  const btn = document.getElementById("tema");
  btn.textContent = rotulo;
  btn.setAttribute("aria-label", rotulo);
  const papel = getComputedStyle(document.documentElement).getPropertyValue("--papel").trim();
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta && papel) meta.setAttribute("content", papel);
}

function aplicarTemaInicial() {
  const salvo = ler(CHAVE_TEMA);
  if (salvo === "dia" || salvo === "noite") {
    document.documentElement.setAttribute("data-theme", salvo);
  }
  sincronizarTema();
}

function alternarTema() {
  const proximo = temaAtual() === "noite" ? "dia" : "noite";
  document.documentElement.setAttribute("data-theme", proximo);
  gravar(CHAVE_TEMA, proximo);
  sincronizarTema();
}

function aplicarFonte(valor) {
  escala = valor;
  document.documentElement.style.setProperty("--escala", String(valor));
  document.getElementById("fonte-menos").disabled = valor <= 0.9 + 0.001;
  document.getElementById("fonte-mais").disabled = valor >= 1.3 - 0.001;
}

function aplicarFonteInicial() {
  const n = Number(ler(CHAVE_FONTE));
  const valida = ESCALAS.find((item) => Math.abs(item - n) < 0.001);
  aplicarFonte(valida || 1);
}

function mudarFonte(delta) {
  const i = ESCALAS.findIndex((item) => Math.abs(item - escala) < 0.001);
  const j = i + delta;
  if (j < 0 || j >= ESCALAS.length) return;
  aplicarFonte(ESCALAS[j]);
  gravar(CHAVE_FONTE, String(ESCALAS[j]));
}

function nomePoema(poema) {
  return poema.titulo ? { texto: poema.titulo, italico: false } : { texto: poema.primeiro_verso + "…", italico: true };
}

function secaoCapa() {
  const sec = el("section", { class: "capa", id: "capa" });
  sec.append(el("h1", { class: "titulo-capa" }, LIVRO.titulo));
  if (LIVRO.dedicatoria != null) sec.append(blocoLinhas(LIVRO.dedicatoria, "dedicatoria-texto"));
  return sec;
}

function construirLivro() {
  const raiz = document.getElementById("pagina");
  const indice = document.getElementById("indice");
  const lista = [];

  const topo = el("a", { class: "indice-livro", href: "#capa", "data-alvo": "capa" }, LIVRO.titulo);
  indice.append(topo);
  lista.push({ id: "capa", link: topo });
  raiz.append(secaoCapa());

  for (const cap of LIVRO.capitulos) {
    const idCap = "cap-" + cap.id;
    const grupo = el("div", { class: "indice-cap" });
    const nome = el("a", { class: "indice-nome", href: "#" + idCap, "data-alvo": idCap });
    nome.append(el("span", { class: "versalete" }, cap.numero));
    if (cap.titulo) nome.append(el("span", { class: "indice-titulo" }, cap.titulo));
    grupo.append(nome);
    lista.push({ id: idCap, link: nome });

    const secCap = el("section", { class: "capitulo", id: idCap });
    secCap.append(paginaCapitulo(cap));
    raiz.append(secCap);

    const ul = el("ul", { class: "indice-poemas" });
    for (const id of cap.poemas) {
      const poema = LIVRO.poemas[id];
      if (!poema) continue;
      const idP = "p-" + poema.id;
      const a = el("a", { href: "#" + idP, "data-alvo": idP });
      const n = nomePoema(poema);
      if (n.italico) a.append(el("em", null, n.texto));
      else a.textContent = n.texto;
      const li = el("li");
      li.append(a);
      ul.append(li);
      lista.push({ id: idP, link: a });

      const secP = el("section", { class: "poema-sec", id: idP });
      secP.append(paginaPoema(poema));
      raiz.append(secP);
    }
    if (ul.children.length) grupo.append(ul);
    indice.append(grupo);
  }

  secoes = lista.map((item) => ({ ...item, alvo: document.getElementById(item.id) }));
}

let ativa = null;

function marcarAtiva(item) {
  if (ativa === item) return;
  if (ativa) {
    ativa.link.classList.remove("ativo");
    ativa.link.removeAttribute("aria-current");
  }
  ativa = item;
  if (!item) return;
  item.link.classList.add("ativo");
  item.link.setAttribute("aria-current", "location");
  const lateral = document.getElementById("lateral");
  const l = item.link.getBoundingClientRect();
  const r = lateral.getBoundingClientRect();
  if (l.top < r.top + 40 || l.bottom > r.bottom - 40) {
    lateral.scrollTop += l.top - r.top - r.height / 2;
  }
  if (item.id !== "capa") gravar(CHAVE_POSICAO, item.id);
  history.replaceState(null, "", "#" + item.id);
}

function atualizarPosicao() {
  const y = window.scrollY;
  const total = document.documentElement.scrollHeight - window.innerHeight;
  document.getElementById("progresso-barra").style.width = (total > 0 ? (y / total) * 100 : 0) + "%";

  const linha = window.innerHeight * 0.3;
  let atual = secoes[0];
  for (const s of secoes) {
    if (s.alvo.getBoundingClientRect().top <= linha) atual = s;
    else break;
  }
  if (total > 0 && y >= total - 2) atual = secoes[secoes.length - 1];
  marcarAtiva(atual);
}

function irPara(id, suave) {
  const alvo = document.getElementById(id);
  if (!alvo) return;
  const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  alvo.scrollIntoView({ behavior: suave && !reduzido ? "smooth" : "auto", block: "start" });
}

function gaveta(abrir) {
  document.body.classList.toggle("gaveta-aberta", abrir);
  document.getElementById("veu").hidden = !abrir;
}

function iniciar() {
  document.title = LIVRO.titulo;
  aplicarTemaInicial();
  aplicarFonteInicial();
  construirLivro();

  document.getElementById("fonte-menos").addEventListener("click", () => mudarFonte(-1));
  document.getElementById("fonte-mais").addEventListener("click", () => mudarFonte(1));
  document.getElementById("tema").addEventListener("click", alternarTema);
  document.getElementById("menu").addEventListener("click", () => gaveta(!document.body.classList.contains("gaveta-aberta")));
  document.getElementById("veu").addEventListener("click", () => gaveta(false));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") gaveta(false);
  });

  document.getElementById("indice").addEventListener("click", (e) => {
    const a = e.target.closest("a[data-alvo]");
    if (!a) return;
    e.preventDefault();
    gaveta(false);
    irPara(a.dataset.alvo, true);
  });

  let agendado = false;
  window.addEventListener("scroll", () => {
    if (agendado) return;
    agendado = true;
    requestAnimationFrame(() => {
      agendado = false;
      atualizarPosicao();
    });
  }, { passive: true });
  window.addEventListener("resize", atualizarPosicao);

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (!document.documentElement.hasAttribute("data-theme")) sincronizarTema();
  });

  /* Abre onde parou (ou no hash). Espera as fontes para a altura final. */
  const inicial = hashAtual() || ler(CHAVE_POSICAO);
  const abrir = () => {
    if (inicial && document.getElementById(inicial)) irPara(inicial, false);
    atualizarPosicao();
  };
  abrir();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(abrir);
}

iniciar();
