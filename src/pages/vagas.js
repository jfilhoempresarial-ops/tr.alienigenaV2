import { iniciarModuloVagas } from "../features/vagas/vagas.js";

export function paginaVagas() {
  setTimeout(() => {
    iniciarModuloVagas();
  }, 0);

  return `
    <main class="pagina pagina-vagas">
      <div class="vagas-topo">
        <a class="voltar" href="#/home">← Voltar</a>

        <div>
          <h1>💼 Vagas para motoristas</h1>
          <p>Oportunidades do SINE/IDT atualizadas para quem vive do trecho.</p>
        </div>
      </div>

      <section class="vagas-resumo">
        <div class="vagas-atualizacao">
          📅 Atualizado em:
          <strong id="vagas-data">Carregando...</strong>
        </div>

        <div id="vagas-total" class="vagas-total">
          Buscando vagas disponíveis...
        </div>

        <p class="vagas-orientacao">
          📌 Para se candidatar, procure a unidade do SINE/IDT indicada
          levando Carteira de Trabalho e documentos pessoais.
        </p>
      </section>

      <section class="vagas-ferramentas">
        <input
          id="vagas-filtro"
          class="vagas-input"
          type="search"
          placeholder="🔍 Pesquisar cargo ou cidade..."
          autocomplete="off"
        />

        <button
          id="vagas-atualizar"
          class="vagas-btn-atualizar"
          type="button"
        >
          🔄 Atualizar
        </button>
      </section>

      <div
        id="vagas-status"
        class="vagas-status"
        aria-live="polite"
      ></div>

      <div
        id="vagas-cidades"
        class="vagas-cidades"
        aria-label="Filtrar vagas por cidade"
      ></div>

      <section id="lista-vagas" class="lista-vagas">
        <div class="vagas-loading">Carregando vagas...</div>
      </section>
    </main>
  `;
}
