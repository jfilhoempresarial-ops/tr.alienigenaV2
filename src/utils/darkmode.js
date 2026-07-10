// ===== INIT DARK MODE =====
// Extraído do index.html (bloco "INIT DARK MODE")
(function(){
  try{
    if(localStorage.getItem('darkMode')==='1'){
      document.body.classList.add('dark-mode');
      const btn=document.getElementById('btn-dark-toggle');
      if(btn) btn.textContent='☀️';
    }
  }catch(e){}
})();
