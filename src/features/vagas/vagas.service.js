const VAGAS_CSV_URL =
  "https://raw.githubusercontent.com/jfilhoempresarial-ops/tralienigena/main/vagas.csv";

const IDT_URL = "https://idt.org.br/vagas-disponiveis";

const CACHE_CHAVE = "tra_v2_vagas";
const CACHE_DURACAO = 6 * 60 * 60 * 1000;

const PALAVRAS_TRANSPORTE = [
  "motorista",
  "caminhão",
  "caminhoneiro",
  "carreta",
  "carreteiro",
  "caçambeiro",
  "bitrem",
  "basculante",
  "guincho",
  "munck",
  "munk",
  "guindaste",
  "ajudante de motorista",
  "ajudante de carga",
  "ajudante de descarga",
  "carregador e descarregador",
  "operador de retro",
  "retroescavadeira",
  "retro-escavadeira",
  "operador de máquina",
  "operador de máquinas",
  "operador de trator",
  "motofretista",
  "motoboy",
  "fiscal de transporte",
  "controlador de tráfego",
  "manobrador",
  "manobrista",
  "ônibus",
  "condutor",
  "operador de balança rodoviária",
];

const PALAVRAS_EXCLUIDAS = ["estoquista", "almoxarife"];

function normalizarTexto(texto = "") {
  return String(texto)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function escaparCSV(linha) {
  const valores = [];
  let valorAtual = "";
  let dentroDeAspas = false;

  for (let indice = 0; indice < linha.length; indice += 1) {
    const caractere = linha[indice];
    const proximo = linha[indice + 1];

    if (caractere === '"' && dentroDeAspas && proximo === '"') {
      valorAtual += '"';
      indice += 1;
      continue;
    }

    if (caractere === '"') {
      dentroDeAspas = !dentroDeAspas;
      continue;
    }

    if (caractere === "," && !dentroDeAspas) {
      valores.push(valorAtual.trim());
      valorAtual = "";
      continue;
    }

    valorAtual += caractere;
  }

  valores.push(valorAtual.trim());

  return valores;
}

function obterValor(objeto, nomes, fallback = "") {
  for (const nome of nomes) {
    if (objeto[nome] !== undefined && objeto[nome] !== "") {
      return objeto[nome];
    }
  }

  return fallback;
}

function padronizarVaga(vaga) {
  const cidade = String(
    vaga.cidade || vaga.municipio || vaga.local || ""
  ).trim();

  const cargo = String(
    vaga.cargo ||
      vaga.funcao ||
      vaga["função"] ||
      vaga.vaga ||
      vaga.ocupacao ||
      ""
  ).trim();

  const quantidade =
    Number.parseInt(
      vaga.quantidade || vaga.total || vaga.vagas || vaga.qtd || "1",
      10
    ) || 1;

  const telefone = String(
    vaga.telefone || vaga.fone || vaga.whatsapp || ""
  ).trim();

  return {
    cidade,
    cidadeBase: String(vaga.cidadeBase || cidade.split(" - ")[0]).trim(),
    cargo,
    quantidade,
    telefone,
    email: String(vaga.email || "").trim(),
    endereco: String(vaga.endereco || "").trim(),
    fonte: String(vaga.fonte || "SINE/IDT").trim(),
  };
}

export function lerCSVVagas(textoCSV) {
  const linhas = textoCSV
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((linha) => linha.trim());

  if (linhas.length < 2) {
    return [];
  }

  const cabecalhos = escaparCSV(linhas[0]).map((cabecalho) =>
    normalizarTexto(cabecalho)
  );

  return linhas
    .slice(1)
    .map((linha) => {
      const valores = escaparCSV(linha);
      const objeto = {};

      cabecalhos.forEach((cabecalho, indice) => {
        objeto[cabecalho] = valores[indice] || "";
      });

      return padronizarVaga({
        cidade: obterValor(objeto, [
          "cidade",
          "municipio",
          "local",
          cabecalhos[0],
        ]),
        cargo: obterValor(objeto, [
          "funcao",
          "cargo",
          "vaga",
          "ocupacao",
          cabecalhos[1],
        ]),
        quantidade: obterValor(objeto, [
          "total",
          "quantidade",
          "vagas",
          "qtd",
          cabecalhos[2],
        ]),
        telefone: obterValor(objeto, [
          "telefone",
          "fone",
          "whatsapp",
        ]),
        email: obterValor(objeto, ["email", "e-mail"]),
        endereco: obterValor(objeto, ["endereco", "logradouro"]),
      });
    })
    .filter((vaga) => vaga.cidade && vaga.cargo);
}

async function fetchComTimeout(url, tempo = 12000) {
  const controlador = new AbortController();

  const temporizador = setTimeout(() => {
    controlador.abort();
  }, tempo);

  try {
    return await fetch(url, {
      signal: controlador.signal,
      cache: "no-store",
    });
  } finally {
    clearTimeout(temporizador);
  }
}

export async function buscarVagasCSV() {
  const resposta = await fetchComTimeout(
    `${VAGAS_CSV_URL}?t=${Date.now()}`,
    10000
  );

  if (!resposta.ok) {
    throw new Error("Não foi possível carregar o arquivo de vagas.");
  }

  const texto = await resposta.text();
  const vagas = lerCSVVagas(texto);

  if (!vagas.length) {
    throw new Error("O arquivo de vagas está vazio.");
  }

  return vagas;
}

function ehVagaDeTransporte(cargo) {
  const cargoNormalizado = normalizarTexto(cargo);

  const possuiPalavraValida = PALAVRAS_TRANSPORTE.some((palavra) =>
    cargoNormalizado.includes(normalizarTexto(palavra))
  );

  const possuiPalavraExcluida = PALAVRAS_EXCLUIDAS.some((palavra) =>
    cargoNormalizado.includes(normalizarTexto(palavra))
  );

  return possuiPalavraValida && !possuiPalavraExcluida;
}

function formatarNome(texto = "") {
  return texto
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (letra) => letra.toUpperCase());
}

function extrairCidadeDoTexto(texto) {
  const primeiraLinha = String(texto)
    .split(/\r?\n/)[0]
    .replace(/\*/g, "")
    .trim();

  if (!primeiraLinha) {
    return {
      cidade: "",
      cidadeBase: "",
    };
  }

  if (primeiraLinha.includes(":")) {
    const [base, complemento = ""] = primeiraLinha.split(":");

    const cidadeBase = base.trim().toUpperCase();
    const bairro = complemento
      .split(/[-–/]/)[0]
      .trim();

    return {
      cidadeBase,
      cidade: bairro
        ? `${formatarNome(cidadeBase)} - ${formatarNome(bairro)}`
        : formatarNome(cidadeBase),
    };
  }

  const cidadeBase = primeiraLinha
    .split(/[-–]\s*(Rua|Av\.?|Avenida|Fone|Telefone)/i)[0]
    .trim()
    .toUpperCase();

  return {
    cidadeBase,
    cidade: formatarNome(cidadeBase),
  };
}

function extrairVagasDoHTML(html) {
  const parser = new DOMParser();
  const documento = parser.parseFromString(html, "text/html");

  const vagas = [];

  let cidade = "";
  let cidadeBase = "";
  let endereco = "";
  let telefone = "";
  let email = "";

  const linhas = documento.querySelectorAll("tr");

  linhas.forEach((linha) => {
    const colunas = [...linha.querySelectorAll("td")];
    const textoLinha = linha.textContent?.trim() || "";

    if (!colunas.length) {
      return;
    }

    if (colunas.length === 1 || /SINE|IDT|OCUPAÇÕES/i.test(textoLinha)) {
      const dadosCidade = extrairCidadeDoTexto(textoLinha);

      if (dadosCidade.cidade) {
        cidade = dadosCidade.cidade;
        cidadeBase = dadosCidade.cidadeBase;
      }

      const enderecoEncontrado = textoLinha.match(
        /(?:Rua|Avenida|Av\.?|Rodovia|BR-\d+)[^\n\r,]*/i
      );

      const telefoneEncontrado = textoLinha.match(
        /(?:Fone|Tel|Telefone)[:\s]*\(?\d{2}\)?[\s.-]?\d{4,5}[\s.-]?\d{4}/i
      );

      const emailEncontrado = textoLinha.match(
        /[\w.-]+@[\w.-]+\.[a-z]{2,}/i
      );

      endereco = enderecoEncontrado?.[0]?.trim() || endereco;

      telefone =
        telefoneEncontrado?.[0]
          ?.replace(/(?:Fone|Tel|Telefone)[:\s]*/i, "")
          .trim() || telefone;

      email = emailEncontrado?.[0] || email;

      return;
    }

    if (colunas.length < 2 || !cidade) {
      return;
    }

    const cargo = colunas[0]?.textContent?.trim() || "";
    const quantidade =
      Number.parseInt(colunas[1]?.textContent?.trim() || "0", 10) || 0;

    if (
      !cargo ||
      !quantidade ||
      normalizarTexto(cargo) === "ocupacoes" ||
      normalizarTexto(cargo).startsWith("total")
    ) {
      return;
    }

    if (!ehVagaDeTransporte(cargo)) {
      return;
    }

    vagas.push(
      padronizarVaga({
        cidade,
        cidadeBase,
        cargo: formatarNome(cargo),
        quantidade,
        telefone,
        email,
        endereco,
        fonte: "SINE/IDT",
      })
    );
  });

  return vagas;
}

export async function buscarVagasIDT() {
  const proxies = [
    `https://corsproxy.io/?${encodeURIComponent(IDT_URL)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(IDT_URL)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(IDT_URL)}`,
  ];

  let ultimoErro = null;

  for (const proxy of proxies) {
    try {
      const resposta = await fetchComTimeout(proxy);

      if (!resposta.ok) {
        continue;
      }

      const html = await resposta.text();

      if (!html.includes("OCUPAÇÕES") && !html.includes("SOBRAL")) {
        continue;
      }

      const vagas = extrairVagasDoHTML(html);

      if (vagas.length) {
        salvarCacheVagas(vagas);
        return vagas;
      }
    } catch (erro) {
      ultimoErro = erro;
    }
  }

  throw ultimoErro || new Error("Não foi possível acessar o SINE/IDT.");
}

export function salvarCacheVagas(vagas) {
  try {
    localStorage.setItem(
      CACHE_CHAVE,
      JSON.stringify({
        atualizadoEm: Date.now(),
        vagas,
      })
    );
  } catch (erro) {
    console.warn("Não foi possível salvar o cache das vagas.", erro);
  }
}

export function carregarCacheVagas() {
  try {
    const conteudo = localStorage.getItem(CACHE_CHAVE);

    if (!conteudo) {
      return null;
    }

    const cache = JSON.parse(conteudo);

    if (!Array.isArray(cache.vagas) || !cache.vagas.length) {
      return null;
    }

    return {
      vagas: cache.vagas.map(padronizarVaga),
      atualizadoEm: Number(cache.atualizadoEm) || 0,
      valido:
        Date.now() - Number(cache.atualizadoEm || 0) < CACHE_DURACAO,
    };
  } catch (erro) {
    console.warn("Não foi possível ler o cache das vagas.", erro);
    return null;
  }
}

export async function carregarVagas() {
  const cache = carregarCacheVagas();

  if (cache?.valido) {
    return {
      vagas: cache.vagas,
      fonte: "cache",
      atualizadoEm: cache.atualizadoEm,
    };
  }

  try {
    const vagasIDT = await buscarVagasIDT();

    return {
      vagas: vagasIDT,
      fonte: "SINE/IDT",
      atualizadoEm: Date.now(),
    };
  } catch (erroIDT) {
    console.warn("Falha na captura direta do IDT.", erroIDT);
  }

  try {
    const vagasCSV = await buscarVagasCSV();

    salvarCacheVagas(vagasCSV);

    return {
      vagas: vagasCSV,
      fonte: "CSV",
      atualizadoEm: Date.now(),
    };
  } catch (erroCSV) {
    console.warn("Falha ao carregar o CSV.", erroCSV);
  }

  if (cache?.vagas?.length) {
    return {
      vagas: cache.vagas,
      fonte: "cache antigo",
      atualizadoEm: cache.atualizadoEm,
    };
  }

  throw new Error("Nenhuma vaga pôde ser carregada.");
}
