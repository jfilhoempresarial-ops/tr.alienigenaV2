// ===== ROTEAMENTO (popstate) =====
// Extraído do index.html (listener de popstate, navegação pelo botão voltar do navegador)
window.addEventListener('popstate',()=>{
  if(window.APP && typeof APP.abrirRotaDireta==='function'){
    APP.abrirRotaDireta();
    if((window.location.pathname||'/')==='/') APP.inicio();
  }
});
