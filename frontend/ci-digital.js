// ═══════════════════════════════════════════════════════
//  CONFIGURAÇÃO DA API
// ═══════════════════════════════════════════════════════
const API_URL = 'http://localhost:3000/api';

// ═══════════════════════════════════════════════════════
//  ESTADO GLOBAL
// ═══════════════════════════════════════════════════════
const state = {
  token: null,
  usuario: null,
  departamentos: [],
  ciAtual: null,
  rascunhoAtual: null,
  filtroDepartamento: null,
  abaAtiva: 'recebidas',
  paginaAtual: 1,
  limiteCI: 5,
  totalCI: 0,
};

// ═══════════════════════════════════════════════════════
//  HELPERS HTTP
// ═══════════════════════════════════════════════════════
async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (state.token) opts.headers['Authorization'] = 'Bearer ' + state.token;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(API_URL + path, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.erro || data.mensagem || 'Erro na requisição');
  return data;
}

async function apiForm(path, formData) {
  const res = await fetch(API_URL + path, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + state.token },
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.erro || data.mensagem || 'Erro no upload');
  return data;
}

// ═══════════════════════════════════════════════════════
//  TOAST
// ═══════════════════════════════════════════════════════
function toast(msg, tipo = 'success') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = 'toast ' + tipo;
  const icon = tipo === 'success' ? 'circle-check' : tipo === 'error' ? 'alert-circle' : 'info-circle';
  el.innerHTML = `<i class="ti ti-${icon}"></i> ${msg}`;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ═══════════════════════════════════════════════════════
//  AUTENTICAÇÃO
// ═══════════════════════════════════════════════════════
async function fazerLogin() {
  const email = document.getElementById('login-email').value.trim();
  const senha = document.getElementById('login-senha').value;
  const errEl = document.getElementById('login-error');
  const btn = document.getElementById('login-btn');
  errEl.style.display = 'none';
  if (!email || !senha) { errEl.textContent = 'Preencha e-mail e senha.'; errEl.style.display = 'block'; return; }
  btn.disabled = true;
  btn.innerHTML = '<span class="spin"></span> Entrando...';
  try {
    const data = await api('POST', '/usuarios/login', { email, senha });
    state.token = data.dados.token;
    state.usuario = data.dados.usuario;
    localStorage.setItem('ci_token', state.token);
    localStorage.setItem('ci_usuario', JSON.stringify(state.usuario));
    iniciarApp();
  } catch (err) {
    errEl.textContent = err.message || 'E-mail ou senha incorretos.';
    errEl.style.display = 'block';
    btn.disabled = false;
    btn.innerHTML = 'Entrar no sistema';
  }
}

const forgotState = {
  expiresAt: null,
  timerId: null
};

function mostrarEsqueciSenha() {
  document.getElementById('login-panel').style.display = 'none';
  document.getElementById('login-error').style.display = 'none';
  document.getElementById('forgot-panel').style.display = 'block';
  document.getElementById('forgot-code-section').style.display = 'none';
  document.getElementById('forgot-reset-section').style.display = 'none';
  document.getElementById('forgot-status').style.display = 'none';
  document.getElementById('forgot-email').value = '';
  document.getElementById('forgot-code').value = '';
  document.getElementById('forgot-new-password').value = '';
  document.getElementById('forgot-confirm-password').value = '';
  document.getElementById('forgot-verify-btn').disabled = true;
  document.getElementById('forgot-reset-btn').disabled = true;
  clearInterval(forgotState.timerId);
  forgotState.expiresAt = null;
}

function mostrarLogin() {
  document.getElementById('login-panel').style.display = 'block';
  document.getElementById('login-error').style.display = 'none';
  document.getElementById('forgot-panel').style.display = 'none';
  clearInterval(forgotState.timerId);
  forgotState.expiresAt = null;
}

function mostrarForgotStatus(message, type = 'error') {
  const status = document.getElementById('forgot-status');
  status.textContent = message;
  status.style.display = message ? 'block' : 'none';
  status.style.background = type === 'success' ? '#DCFCE7' : '#FEE2E2';
  status.style.borderColor = type === 'success' ? '#86EFAC' : '#FCA5A5';
  status.style.color = type === 'success' ? '#166534' : '#B91C1C';
}

function atualizarBotaoVerificarCodigo() {
  const codigo = document.getElementById('forgot-code').value.trim();
  const btn = document.getElementById('forgot-verify-btn');
  btn.disabled = codigo.length !== 8 || !forgotState.expiresAt || new Date() > forgotState.expiresAt;
}

function validarSenhaRecuperacao() {
  const senha = document.getElementById('forgot-new-password').value;
  const confirmar = document.getElementById('forgot-confirm-password').value;
  const error = document.getElementById('forgot-match-error');
  const btn = document.getElementById('forgot-reset-btn');

  if (!senha || !confirmar) {
    error.style.display = 'none';
    btn.disabled = true;
    return;
  }

  if (senha !== confirmar) {
    error.textContent = 'Senhas diferentes uma da outra tente novamente';
    error.style.display = 'block';
    btn.disabled = true;
    return;
  }

  error.style.display = 'none';
  btn.disabled = senha.length < 8;
}

function atualizarTimer() {
  const timer = document.getElementById('forgot-timer');
  if (!forgotState.expiresAt) {
    timer.textContent = 'Código inválido ou não enviado ainda.';
    return;
  }

  const remaining = Math.max(0, forgotState.expiresAt - new Date());
  const minutes = String(Math.floor(remaining / 60000)).padStart(2, '0');
  const seconds = String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0');
  timer.textContent = `Código válido por ${minutes}:${seconds}`;

  if (remaining <= 0) {
    clearInterval(forgotState.timerId);
    document.getElementById('forgot-verify-btn').disabled = true;
    timer.textContent = 'Código expirou. Solicite um novo código.';
  }
}

async function enviarCodigoRecuperacao() {
  const email = document.getElementById('forgot-email').value.trim();
  const sendBtn = document.getElementById('forgot-send-btn');
  mostrarForgotStatus('', 'error');

  if (!email) {
    mostrarForgotStatus('Digite o e-mail da conta para enviar o código.', 'error');
    return;
  }

  sendBtn.disabled = true;
  sendBtn.textContent = 'Enviando...';

  try {
    await api('POST', '/usuarios/recuperar-senha', { email });
    forgotState.expiresAt = new Date(Date.now() + 4 * 60 * 1000);
    document.getElementById('forgot-code-section').style.display = 'block';
    document.getElementById('forgot-reset-section').style.display = 'none';
    document.getElementById('forgot-code').value = '';
    document.getElementById('forgot-new-password').value = '';
    document.getElementById('forgot-confirm-password').value = '';
    atualizarBotaoVerificarCodigo();
    validarSenhaRecuperacao();
    mostrarForgotStatus('Código enviado. Verifique seu e-mail e digite o código em até 4 minutos.', 'success');
    clearInterval(forgotState.timerId);
    atualizarTimer();
    forgotState.timerId = setInterval(atualizarTimer, 1000);
  } catch (err) {
    mostrarForgotStatus(err.message || 'Erro ao enviar código.', 'error');
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = 'Confirmar';
  }
}

async function validarCodigoRecuperacao() {
  const email = document.getElementById('forgot-email').value.trim();
  const codigo = document.getElementById('forgot-code').value.trim();
  const btn = document.getElementById('forgot-verify-btn');

  mostrarForgotStatus('', 'error');
  btn.disabled = true;
  btn.textContent = 'Verificando...';

  try {
    await api('POST', '/usuarios/recuperar-senha/validar', { email, codigo });
    document.getElementById('forgot-reset-section').style.display = 'block';
    mostrarForgotStatus('Código validado. Agora escolha sua nova senha.', 'success');
  } catch (err) {
    mostrarForgotStatus(err.message || 'Código inválido.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Verificar código';
    atualizarBotaoVerificarCodigo();
  }
}

async function resetarSenha() {
  const email = document.getElementById('forgot-email').value.trim();
  const codigo = document.getElementById('forgot-code').value.trim();
  const senhaNova = document.getElementById('forgot-new-password').value;
  const btn = document.getElementById('forgot-reset-btn');

  mostrarForgotStatus('', 'error');
  btn.disabled = true;
  btn.textContent = 'Alterando...';

  try {
    await api('POST', '/usuarios/recuperar-senha/confirmar', { email, codigo, senhaNova });
    mostrarLogin();
    document.getElementById('login-email').value = email;
    document.getElementById('login-senha').value = '';
    const errElLogin = document.getElementById('login-error');
    errElLogin.textContent = 'Senha alterada com sucesso. Faça login com a nova senha.';
    errElLogin.style.display = 'block';
  } catch (err) {
    mostrarForgotStatus(err.message || 'Erro ao alterar senha.', 'error');
    btn.disabled = false;
    btn.textContent = 'Continuar';
  }
}


// ═══════════════════════════════════════════════════════
//  CONFIGURAÇÕES
// ═══════════════════════════════════════════════════════
async function previewFotoPerfil(input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) { toast('Imagem deve ter no máximo 2 MB', 'error'); return; }

  const formData = new FormData();
  formData.append('foto', file);

  try {
    const resp = await fetch(`http://localhost:3000/api/usuarios/${state.usuario.id}/foto`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + state.token },
      body: formData
    });
    const data = await resp.json();
    if (!data.sucesso) throw new Error(data.erro || 'Erro ao salvar');

    const url = 'http://localhost:3000' + data.dados.foto_url;
    state.usuario.foto_url = data.dados.foto_url;
    localStorage.setItem('ci_usuario', JSON.stringify(state.usuario));
    aplicarFotoAvatar(url);
    toast('Foto de perfil atualizada!');
  } catch (err) {
    toast('Erro ao salvar foto: ' + err.message, 'error');
  }
}

function aplicarFotoAvatar(url) {
  ['sidebar-avatar', 'config-avatar'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.backgroundImage = `url(${url})`;
    el.style.backgroundSize = 'cover';
    el.style.backgroundPosition = 'center';
    el.textContent = '';
  });
}

async function removerFotoPerfil() {
  try {
    await api('DELETE', '/usuarios/' + state.usuario.id + '/foto');
    state.usuario.foto_url = null;
    localStorage.setItem('ci_usuario', JSON.stringify(state.usuario));
    const iniciais = (state.usuario.nome || '').split(' ').map(p => p[0]).join('').slice(0,2).toUpperCase();
    ['sidebar-avatar', 'config-avatar'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.style.backgroundImage = '';
      el.textContent = iniciais || '--';
    });
    document.getElementById('btn-remover-foto').style.display = 'none';
    toast('Foto removida.');
  } catch (err) {
    toast('Erro ao remover foto: ' + err.message, 'error');
  }
}

async function trocarSenha() {
  const senhaAtual = document.getElementById('config-senha-atual').value;
  const senhaNova = document.getElementById('config-senha-nova').value;
  const senhaConfirmar = document.getElementById('config-senha-confirmar').value;

  if (!senhaAtual || !senhaNova || !senhaConfirmar) {
    toast('Preencha todos os campos de senha.', 'error'); return;
  }
  if (senhaNova.length < 8) {
    toast('A nova senha deve ter no mínimo 8 caracteres.', 'error'); return;
  }
  if (senhaNova !== senhaConfirmar) {
    toast('As senhas não coincidem.', 'error'); return;
  }

  try {
    await api('PUT', '/usuarios/' + state.usuario.id + '/senha', {
      senhaAtual,
      senhaNova
    });
    toast('Senha alterada com sucesso!');
    ['config-senha-atual','config-senha-nova','config-senha-confirmar'].forEach(id => {
      document.getElementById(id).value = '';
    });
  } catch (err) {
    toast('Erro ao trocar senha: ' + err.message, 'error');
  }
}

function fazerLogout() {
  localStorage.removeItem('ci_token');
  localStorage.removeItem('ci_usuario');
  state.token = null; state.usuario = null;
  document.getElementById('app').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('login-email').value = '';
  document.getElementById('login-senha').value = '';
}

// ═══════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════
async function iniciarApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = '';
  const u = state.usuario;
  const iniciais = u.nome.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
  if (u.foto_url) {
    aplicarFotoAvatar('http://localhost:3000' + u.foto_url);
  } else {
    document.getElementById('sidebar-avatar').textContent = iniciais;
  }
  document.getElementById('sidebar-nome').textContent = u.nome;
  await carregarDepartamentos();
  const depto = state.departamentos.find(d => d.id === u.departamento_id);
  document.getElementById('sidebar-depto').textContent = depto ? 'Depto. ' + depto.nome : 'Depto. —';
  document.getElementById('ci-data').value = new Date().toISOString().split('T')[0];
  await Promise.all([carregarCIs(), carregarNotificacoes()]);
  atualizarStats();
  carregarDeptDashboard();
  if (state.usuario.cargo_id <= 2) carregarAuditDashboard();
  aplicarPermissoesFrontend(state.usuario);
}

function verificarSessao() {
  const token = localStorage.getItem('ci_token');
  const usuarioStr = localStorage.getItem('ci_usuario');
  if (token && usuarioStr) {
    state.token = token;
    state.usuario = JSON.parse(usuarioStr);
    iniciarApp();
  } else {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
  }
}

// ═══════════════════════════════════════════════════════
//  DEPARTAMENTOS
// ═══════════════════════════════════════════════════════
async function carregarDepartamentos() {
  try {
    const data = await api('GET', '/departamentos/listar');
    state.departamentos = data.dados || [];
    const sel = document.getElementById('ci-departamento');
    const cargo = state.usuario?.cargo_id || 4;

    // Cargo 3 e 4: só pode enviar para o próprio departamento
    const deptosPerm = (cargo <= 2)
      ? state.departamentos
      : state.departamentos.filter(d => d.id === state.usuario.departamento_id);

    sel.innerHTML = '<option value="">Selecionar...</option>';
    deptosPerm.forEach(d => {
      sel.innerHTML += `<option value="${d.id}">${NOMES_DEPT[d.nome.toUpperCase()] || d.nome}</option>`;
    });

    // Pré-seleciona quando só há uma opção disponível
    if (deptosPerm.length === 1) {
      sel.value = deptosPerm[0].id;
      sel.dispatchEvent(new Event('change'));
    }
  } catch (e) { /* ignora */ }
}

// ═══════════════════════════════════════════════════════
//  CIs — LISTAR
// ═══════════════════════════════════════════════════════
async function carregarCIs() {
  const tbody = document.getElementById('ci-tbody');
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text-muted)"><i class="ti ti-loader" style="animation:spin .6s linear infinite;display:inline-block;margin-right:6px"></i> Carregando...</td></tr>';
  try {
    const dept = state.filtroDepartamento ? `&departamento_filtro=${state.filtroDepartamento}` : '';
    const epMap = {
      recebidas:  `/comunicacoes/recebidas?pagina=${state.paginaAtual}&limite=${state.limiteCI}${dept}`,
      enviadas:   `/comunicacoes/enviadas?pagina=${state.paginaAtual}&limite=${state.limiteCI}${dept}`,
      minhas:     `/comunicacoes/minhas?pagina=${state.paginaAtual}&limite=${state.limiteCI}${dept}`,
      arquivadas: `/comunicacoes/arquivadas?pagina=${state.paginaAtual}&limite=${state.limiteCI}`
    };
    const data = await api('GET', epMap[state.abaAtiva]);
    const cis = data.dados || [];
    state.totalCI = data.paginacao?.total || cis.length;
    const countEl = document.getElementById('tab-count-' + state.abaAtiva);
    if (countEl) countEl.textContent = state.totalCI;
    if (cis.length === 0) {
      const labels = { recebidas: 'recebida', enviadas: 'enviada', minhas: 'encontrada' };
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><i class="ti ti-inbox"></i><p>Nenhuma C.I ${labels[state.abaAtiva]} encontrada.</p></div></td></tr>`;
      document.getElementById('ci-table-info').textContent = '0 comunicações';
      document.getElementById('ci-pagination').innerHTML = '';
      return;
    }
    tbody.innerHTML = cis.map(ci => renderizarLinhaCI(ci)).join('');
    const inicio = (state.paginaAtual - 1) * state.limiteCI + 1;
    const fim = Math.min(state.paginaAtual * state.limiteCI, state.totalCI);
    document.getElementById('ci-table-info').innerHTML = `Exibindo <strong>${inicio}–${fim}</strong> de <strong>${state.totalCI}</strong> comunicações`;
    renderizarPaginacao();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><i class="ti ti-alert-circle"></i><p>Erro ao carregar: ${err.message}</p></div></td></tr>`;
  }
}

function statusLeituraEnvio(ci) {
  if (ci.estado === 'rascunho')   return '<span class="status-badge pending">Rascunho</span>';
  if (ci.estado === 'arquivada')  return '<span class="status-badge archived">Arquivada</span>';
  const total = ci.total_destinatarios || 0;
  const lidas = ci.total_lidas || 0;
  if (total === 0 || total === 1) {
    return lidas > 0
      ? '<span class="status-badge read">✓ Lida</span>'
      : '<span class="status-badge unread">Pendente</span>';
  }
  if (lidas === 0)        return '<span class="status-badge unread">Pendente</span>';
  if (lidas >= total)     return '<span class="status-badge read">✓ Todos leram</span>';
  return `<span class="status-badge partial">${lidas}/${total} leram</span>`;
}

function renderizarLinhaCI(ci) {
  const data = ci.data_hora ? new Date(ci.data_hora).toLocaleDateString('pt-BR') : '—';

  let statusLabel;
  if (state.abaAtiva === 'recebidas') {
    statusLabel = ci.lida
      ? '<span class="status-badge read">✓ Lida</span>'
      : '<span class="status-badge unread">Não lida</span>';
  } else if (state.abaAtiva === 'minhas') {
    const isMinha = ci.usuario_id === state.usuario?.id;
    if (isMinha) {
      statusLabel = statusLeituraEnvio(ci);
    } else {
      if (ci.estado === 'rascunho')   statusLabel = '<span class="status-badge pending">Rascunho</span>';
      else if (ci.estado === 'arquivada') statusLabel = '<span class="status-badge archived">Arquivada</span>';
      else statusLabel = ci.lida
        ? '<span class="status-badge read">✓ Lida</span>'
        : '<span class="status-badge unread">Não lida</span>';
    }
  } else {
    statusLabel = statusLeituraEnvio(ci);
  }

  const depto = state.departamentos.find(d => d.id === ci.departamento_id);
  const nomeDepto = depto ? (NOMES_DEPT[depto.nome.toUpperCase()] || depto.nome) : `Depto. ${ci.departamento_id}`;

  return `<tr onclick="abrirCIDoBackend(${ci.id})" style="cursor:pointer">
    <td><span class="priority-dot medium"></span></td>
    <td><span class="ci-num">CI-${String(ci.id).padStart(4,'0')}</span></td>
    <td class="ci-subject">${ci.titulo}<small>${ci.usuario_id === state.usuario?.id ? 'enviada' : 'recebida'} · ${data}</small></td>
    <td><span class="dept-tag"><i class="ti ti-building" style="font-size:11px"></i> ${nomeDepto}</span></td>
    <td>${statusLabel}</td>
    <td class="ci-date">${data}</td>
    <td></td>
  </tr>`;
}

function renderizarPaginacao() {
  const totalPaginas = Math.ceil(state.totalCI / state.limiteCI);
  const pag = document.getElementById('ci-pagination');
  if (totalPaginas <= 1) { pag.innerHTML = ''; return; }
  let html = '';
  if (state.paginaAtual > 1) html += `<button class="page-btn" onclick="irParaPagina(${state.paginaAtual-1})"><i class="ti ti-chevron-left"></i></button>`;
  for (let i = 1; i <= totalPaginas; i++) {
    if (i === state.paginaAtual) html += `<button class="page-btn active">${i}</button>`;
    else if (i <= 2 || i >= totalPaginas-1 || Math.abs(i-state.paginaAtual) <= 1) html += `<button class="page-btn" onclick="irParaPagina(${i})">${i}</button>`;
    else if (!html.endsWith('…</button>')) html += `<button class="page-btn" style="cursor:default">…</button>`;
  }
  if (state.paginaAtual < totalPaginas) html += `<button class="page-btn" onclick="irParaPagina(${state.paginaAtual+1})"><i class="ti ti-chevron-right"></i></button>`;
  pag.innerHTML = html;
}

function irParaPagina(p) { state.paginaAtual = p; carregarCIs(); }

let _buscaTimer = null;

function buscarCILocal(termo) {
  clearTimeout(_buscaTimer);
  if (!termo.trim()) {
    carregarCIs();
    return;
  }
  _buscaTimer = setTimeout(() => _executarBusca(termo.trim()), 300);
}

async function _executarBusca(q) {
  const tbody = document.getElementById('ci-tbody');
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text-muted)"><i class="ti ti-loader" style="animation:spin .6s linear infinite;display:inline-block;margin-right:6px"></i> Buscando...</td></tr>';
  document.getElementById('ci-pagination').innerHTML = '';
  try {
    const dept = state.filtroDepartamento ? `&departamento_filtro=${state.filtroDepartamento}` : '';
    const data = await api('GET', `/comunicacoes/minhas?pagina=1&limite=100${dept}`);
    const qLow = q.toLowerCase();
    const cis = (data.dados || []).filter(ci => {
      const titulo = ci.titulo?.toLowerCase() || '';
      const dataFmt = ci.data_hora ? new Date(ci.data_hora).toLocaleDateString('pt-BR') : '';
      const numero = `ci-${String(ci.id).padStart(4,'0')}`;
      return titulo.includes(qLow) || dataFmt.includes(q) || numero.includes(qLow);
    });

    // renderiza com a lógica de "minhas" para mostrar todos os estados
    const abaAnterior = state.abaAtiva;
    state.abaAtiva = 'minhas';

    if (cis.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><i class="ti ti-search-off"></i><p>Nenhuma C.I encontrada para "<strong>${q}</strong>".</p></div></td></tr>`;
    } else {
      tbody.innerHTML = cis.map(ci => renderizarLinhaCI(ci)).join('');
    }

    state.abaAtiva = abaAnterior;
    document.getElementById('ci-table-info').innerHTML =
      `<strong>${cis.length}</strong> resultado${cis.length !== 1 ? 's' : ''} para "<strong>${q}</strong>"`;
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><i class="ti ti-alert-circle"></i><p>Erro: ${err.message}</p></div></td></tr>`;
  }
}

function mudarAbaCI(aba, el) {
  state.abaAtiva = aba; state.paginaAtual = 1;
  document.querySelectorAll('.tab-bar .tab').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');
  const busca = document.getElementById('ci-busca');
  if (busca) busca.value = '';
  carregarCIs();
}

// ═══════════════════════════════════════════════════════
//  CI — ABRIR MODAL
// ═══════════════════════════════════════════════════════
async function abrirCIDoBackend(id, modoAdmin = false) {
  document.getElementById('modal-ci').classList.add('open');
  document.getElementById('btn-confirmar-leitura').style.display = modoAdmin ? 'none' : '';
  document.getElementById('modal-read-indicator').style.display = modoAdmin ? 'none' : '';
  document.getElementById('modal-ci-num').innerHTML = '<span class="spin"></span> Carregando...';
  document.getElementById('modal-body-text').textContent = '';
  try {
    const data = await api('GET', '/comunicacoes/' + id);
    const ci = data.dados;
    state.ciAtual = ci;
    const dataFmt = ci.data_hora ? new Date(ci.data_hora).toLocaleString('pt-BR') : '—';
    document.getElementById('modal-ci-num').innerHTML = `<i class="ti ti-file-text" style="color:var(--usga-mid)"></i> CI-${String(ci.id).padStart(4,'0')}`;
    const deptoRemetente = state.departamentos.find(d => d.id === ci.departamento_id);
    const nomeDeptoRemetente = deptoRemetente
      ? (NOMES_DEPT[deptoRemetente.nome.toUpperCase()] || deptoRemetente.nome)
      : `Depto. ${ci.departamento_id}`;
    const fotoUrl = ci.usuario_foto ? `http://localhost:3000${ci.usuario_foto}` : null;
    const nomeRem = ci.usuario_nome || `Usuário ${ci.usuario_id}`;
    const iniciaisRem = nomeRem.split(' ').map(p => p[0]).slice(0,2).join('').toUpperCase();
    document.getElementById('modal-from').innerHTML = `
      <div style="display:flex;align-items:center;gap:10px">
        <div style="width:38px;height:38px;border-radius:50%;background:var(--usga-mid);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:white;overflow:hidden;${fotoUrl ? `background-image:url(${fotoUrl});background-size:cover;background-position:center` : ''}">
          ${fotoUrl ? '' : iniciaisRem}
        </div>
        <div>
          <div style="font-weight:500">${nomeRem}</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:1px">${nomeDeptoRemetente}</div>
        </div>
      </div>`;

    // busca destinatários para exibir nomes reais
    try {
      const destData = await api('GET', '/comunicacoes/' + id + '/destinatarios');
      const dests = destData.dados || [];
      const toEl = document.getElementById('modal-to');

      if (destData.para_todos) {
        toEl.textContent = nomeDeptoRemetente;
      } else if (dests.length === 0) {
        toEl.textContent = nomeDeptoRemetente;
      } else if (dests.length === 1) {
        toEl.textContent = dests[0].usuario_nome || '—';
      } else if (dests.length <= 3) {
        toEl.textContent = dests.map(d => d.usuario_nome || '—').join(', ');
      } else {
        const primeiros = dests.slice(0, 2).map(d => d.usuario_nome).join(', ');
        toEl.textContent = `${primeiros} e mais ${dests.length - 2}`;
      }
    } catch {
      document.getElementById('modal-to').textContent = nomeDeptoRemetente;
    }
    document.getElementById('modal-date').textContent = dataFmt;
    document.getElementById('modal-subject').textContent = ci.titulo;
    document.getElementById('modal-body-text').innerHTML = linkificar(ci.descricao);
    const podeArquivar = state.usuario?.cargo_id <= 2;
    document.getElementById('btn-arquivar').style.display = (podeArquivar && ci.estado !== 'arquivada') ? '' : 'none';

    try {
      const anexosData = await api('GET', '/comunicacoes/' + id + '/anexos');
      const anexos = anexosData.dados;
      const secao = document.getElementById('modal-anexos');
      const lista = document.getElementById('modal-anexos-lista');
      lista.innerHTML = '';
      if (anexos && anexos.length > 0) {
        secao.style.display = '';
        anexos.forEach(a => {
          const tamanhoKB = a.tamanho ? (parseInt(a.tamanho) / 1024).toFixed(1) + ' KB' : '';
          lista.innerHTML += `
            <div onclick="baixarAnexo('http://localhost:3000${a.caminho}','${a.nome.replace(/'/g,"\\'")}')"
               style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--usga-xpale);border:1px solid var(--border);border-radius:var(--radius);cursor:pointer;color:var(--text-primary)">
              <i class="ti ti-paperclip" style="color:var(--usga-mid);font-size:16px"></i>
              <span style="flex:1;font-size:13px;font-weight:500">${a.nome}</span>
              ${tamanhoKB ? `<span style="font-size:11px;color:var(--text-muted)">${tamanhoKB}</span>` : ''}
              <i class="ti ti-download" style="color:var(--usga-mid);font-size:15px"></i>
            </div>`;
        });
      } else {
        secao.style.display = 'none';
      }
    } catch (e) {
      document.getElementById('modal-anexos').style.display = 'none';
    }
    const btnLer = document.getElementById('btn-confirmar-leitura');
    btnLer.disabled = false;
    btnLer.innerHTML = '<i class="ti ti-check"></i> Confirmar Leitura';
  } catch (err) {
    document.getElementById('modal-body-text').textContent = 'Erro ao carregar: ' + err.message;
  }
}

// ═══════════════════════════════════════════════════════
//  CI — ARQUIVAR
// ═══════════════════════════════════════════════════════
async function arquivarCIAtual() {
  if (!state.ciAtual) return;
  const btn = document.getElementById('btn-arquivar');
  btn.disabled = true;
  try {
    await api('POST', '/comunicacoes/' + state.ciAtual.id + '/arquivar');
    toast('C.I arquivada com sucesso!');
    closeModal();
    carregarCIs();
  } catch (err) {
    toast('Erro ao arquivar: ' + err.message, 'error');
    btn.disabled = false;
  }
}

// ═══════════════════════════════════════════════════════
//  CONFIRMAÇÃO DE LEITURA
// ═══════════════════════════════════════════════════════
async function confirmarLeituraAtual() {
  if (!state.ciAtual) return;
  const btn = document.getElementById('btn-confirmar-leitura');
  btn.disabled = true;
  btn.innerHTML = '<span class="spin"></span> Confirmando...';
  try {
    try {
      await api('POST', '/comunicacoes/' + state.ciAtual.id + '/confirmar');
    } catch (err) {
      if (!err.message?.includes('já confirmada')) throw err;
    }
    await api('PATCH', '/notificacoes/ci/' + state.ciAtual.id + '/lida');
    toast('Leitura confirmada!');
    btn.innerHTML = '<i class="ti ti-circle-check"></i> Leitura Confirmada';
    await carregarNotificacoes();
    atualizarStats();
  } catch (err) {
    toast('Erro ao confirmar leitura: ' + err.message, 'error');
    btn.disabled = false;
    btn.innerHTML = '<i class="ti ti-check"></i> Confirmar Leitura';
  }
}

// ═══════════════════════════════════════════════════════
//  NOTIFICAÇÕES
// ═══════════════════════════════════════════════════════
async function carregarNotificacoes() {
  try {
    const data = await api('GET', '/notificacoes/listar');
    const notifs = data.dados || [];
    const naoLidas = notifs.filter(n => !n.lida && !n.data_leitura).length;
    const badge = document.getElementById('notif-badge');
    const dot = document.getElementById('notif-dot');
    if (badge) { badge.textContent = naoLidas; badge.style.display = naoLidas > 0 ? '' : 'none'; }
    if (dot) { dot.style.display = naoLidas > 0 ? '' : 'none'; }
    const navBadge = document.querySelector('.nav-badge');
    if (navBadge) navBadge.textContent = naoLidas || '';
    const naoLidasList = notifs.filter(n => !n.lida && !n.data_leitura);
    const list = document.getElementById('notif-list');
    if (naoLidasList.length === 0) {
      list.innerHTML = '<div class="notif-item"><div class="notif-body"><div class="notif-text" style="color:var(--text-muted)">Nenhuma notificação.</div></div></div>';
    } else {
      list.innerHTML = naoLidasList.slice(0, 8).map(n => {
        const tempo = n.data_hora ? formatarTempoRelativo(new Date(n.data_hora)) : '';
        return `<div class="notif-item unread" onclick="marcarNotifLida(${n.id}, this)" style="cursor:pointer">
          <div class="notif-icon recv"><i class="ti ti-bell"></i></div>
          <div class="notif-body">
            <div class="notif-text">${n.mensagem}</div>
            <div class="notif-time">${tempo}</div>
          </div>
          <div class="notif-unread-dot"></div>
        </div>`;
      }).join('');
    }
    document.getElementById('stat-notif').textContent = naoLidas;
    document.getElementById('stat-pendentes').textContent = naoLidas;
  } catch (err) { console.error('Erro notificações:', err); }
}

async function marcarNotifLida(id, el) {
  try {
    await api('PATCH', '/notificacoes/' + id + '/lida');
    el.remove();
    await carregarNotificacoes();
  } catch (e) {}
}

async function marcarTodasLidas() {
  try {
    await api('PATCH', '/notificacoes/todas-lidas');
    toast('Todas as notificações marcadas como lidas.');
    carregarNotificacoes();
  } catch (err) { toast('Erro: ' + err.message, 'error'); }
}

function formatarTempoRelativo(data) {
  const diff = (Date.now() - data.getTime()) / 1000;
  if (diff < 60) return 'Agora mesmo';
  if (diff < 3600) return `Há ${Math.floor(diff/60)} min`;
  if (diff < 86400) return `Há ${Math.floor(diff/3600)}h`;
  return `Há ${Math.floor(diff/86400)}d`;
}

// ═══════════════════════════════════════════════════════
//  DESTINATÁRIOS
// ═══════════════════════════════════════════════════════
async function onDepartamentoChange() {
  const depId = document.getElementById('ci-departamento').value;
  const wrap = document.getElementById('ci-destinatarios-wrap');
  const lista = document.getElementById('ci-usuarios-lista');
  lista.innerHTML = '';
  document.querySelector('input[name="ci-dest-tipo"][value="todos"]').checked = true;
  lista.style.display = 'none';
  if (!depId) { wrap.style.display = 'none'; return; }
  wrap.style.display = '';
  try {
    const data = await api('GET', '/usuarios/departamento/' + depId);
    const usuarios = data.dados || [];
    lista.innerHTML = usuarios.map(u =>
      `<label style="display:flex;align-items:center;gap:8px;cursor:pointer">
        <input type="checkbox" class="ci-usuario-check" value="${u.id}"> ${u.nome}
       </label>`
    ).join('');
  } catch (e) {}
}

function onDestTipoChange() {
  const tipo = document.querySelector('input[name="ci-dest-tipo"]:checked')?.value;
  document.getElementById('ci-usuarios-lista').style.display = tipo === 'especificos' ? '' : 'none';
}

// ═══════════════════════════════════════════════════════
//  RASCUNHOS
// ═══════════════════════════════════════════════════════
async function carregarRascunhos() {
  const card = document.getElementById('card-rascunhos');
  const lista = document.getElementById('rascunhos-lista');
  if (!card || !lista) return;
  try {
    const data = await api('GET', '/comunicacoes/rascunhos');
    const rascunhos = data.dados || [];
    if (rascunhos.length === 0) {
      card.style.display = 'none';
      return;
    }
    card.style.display = '';
    lista.innerHTML = rascunhos.map(r => {
      const data = r.data_hora ? new Date(r.data_hora).toLocaleDateString('pt-BR') : '—';
      return `<div style="display:flex;align-items:center;gap:12px;padding:12px 20px;border-bottom:1px solid var(--border)">
        <i class="ti ti-file-pencil" style="color:var(--usga-mid);font-size:18px"></i>
        <div style="flex:1">
          <div style="font-weight:600;font-size:13px">${r.titulo || '(sem título)'}</div>
          <div style="font-size:11px;color:var(--text-muted)">${data}</div>
        </div>
        <button class="btn-ghost" style="font-size:12px" onclick="editarRascunho(${r.id}, '${encodeURIComponent(r.titulo || '')}', '${encodeURIComponent(r.descricao || '')}', ${r.departamento_id})">
          <i class="ti ti-edit"></i> Continuar
        </button>
      </div>`;
    }).join('');
  } catch (e) {
    card.style.display = 'none';
  }
}

function editarRascunho(id, titulo, descricao, departamento_id) {
  state.rascunhoAtual = id;
  document.getElementById('ci-titulo').value = decodeURIComponent(titulo);
  document.getElementById('ci-descricao').value = decodeURIComponent(descricao);
  document.getElementById('ci-departamento').value = departamento_id;
  onDepartamentoChange();
  document.getElementById('btn-cancelar-rascunho').style.display = '';
  document.getElementById('btn-enviar-ci').innerHTML = '<i class="ti ti-send"></i> Enviar Rascunho';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelarEdicaoRascunho() {
  state.rascunhoAtual = null;
  document.getElementById('btn-cancelar-rascunho').style.display = 'none';
  document.getElementById('btn-enviar-ci').innerHTML = '<i class="ti ti-send"></i> Enviar C.I';
  limparFormularioCI();
}

// ═══════════════════════════════════════════════════════
//  NOVA CI — ENVIAR / SALVAR
// ═══════════════════════════════════════════════════════
async function enviarCI(estado) {
  const titulo = document.getElementById('ci-titulo').value.trim();
  const descricao = document.getElementById('ci-descricao').value.trim();
  const departamento_id = parseInt(document.getElementById('ci-departamento').value);
  if (!titulo || !descricao || !departamento_id) { toast('Preencha todos os campos obrigatórios.', 'error'); return; }

  const tipo = document.querySelector('input[name="ci-dest-tipo"]:checked')?.value;
  let destinatarios = [];
  if (tipo === 'especificos') {
    const checks = document.querySelectorAll('.ci-usuario-check:checked');
    if (checks.length === 0) { toast('Selecione ao menos um destinatário.', 'error'); return; }
    destinatarios = Array.from(checks).map(c => ({ usuario_id: parseInt(c.value), departamento_id }));
  }

  const btn = document.getElementById('btn-enviar-ci');
  const btnRasc = document.getElementById('btn-salvar-rascunho');
  btn.disabled = true;
  btnRasc.disabled = true;
  btn.innerHTML = '<span class="spin"></span> ' + (estado === 'rascunho' ? 'Salvando...' : 'Enviando...');
  try {
    let data;
    if (state.rascunhoAtual) {
      data = await api('PUT', '/comunicacoes/' + state.rascunhoAtual, { titulo, descricao, departamento_id, estado, destinatarios });
    } else {
      data = await api('POST', '/comunicacoes/criar', { titulo, descricao, departamento_id, estado, destinatarios });
    }
    const ciId = data.dados?.id || state.rascunhoAtual;
    const arquivo = document.getElementById('ci-arquivo').files[0];
    if (arquivo && ciId) {
      try {
        const fd = new FormData();
        fd.append('arquivo', arquivo);
        fd.append('comunicacao_id', ciId);
        await apiForm('/upload', fd);
      } catch (e) { toast('C.I enviada, mas falha no anexo: ' + e.message, 'info'); }
    }
    if (estado === 'rascunho') {
      toast('Rascunho salvo!');
      cancelarEdicaoRascunho();
      await carregarRascunhos();
    } else {
      toast('C.I enviada com sucesso!');
      limparFormularioCI();
      showPage('dashboard');
      await Promise.all([carregarCIs(), carregarNotificacoes(), atualizarStats()]);
    }
  } catch (err) {
    toast('Erro: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btnRasc.disabled = false;
    btn.innerHTML = '<i class="ti ti-send"></i> ' + (state.rascunhoAtual ? 'Enviar Rascunho' : 'Enviar C.I');
  }
}

function limparFormularioCI() {
  document.getElementById('ci-titulo').value = '';
  document.getElementById('ci-descricao').value = '';
  document.getElementById('ci-departamento').value = '';
  document.getElementById('ci-arquivo').value = '';
  document.getElementById('upload-label').textContent = 'PDF, DOCX, XLSX, PNG — máx. 20 MB por arquivo';
  document.getElementById('ci-destinatarios-wrap').style.display = 'none';
  document.getElementById('ci-usuarios-lista').style.display = 'none';
  document.getElementById('ci-usuarios-lista').innerHTML = '';
  document.querySelector('input[name="ci-dest-tipo"][value="todos"]').checked = true;
}

function atualizarNomeArquivo() {
  const arquivo = document.getElementById('ci-arquivo').files[0];
  if (arquivo) document.getElementById('upload-label').textContent = '📎 ' + arquivo.name;
}

// ═══════════════════════════════════════════════════════
//  STATS
// ═══════════════════════════════════════════════════════
async function atualizarStats() {
  try {
    const [env, rec] = await Promise.all([
      api('GET', '/comunicacoes/enviadas?pagina=1&limite=1'),
      api('GET', '/comunicacoes/recebidas?pagina=1&limite=1'),
    ]);
    document.getElementById('stat-enviadas').textContent = env.paginacao?.total ?? '—';
    document.getElementById('stat-recebidas').textContent = rec.paginacao?.total ?? '—';
  } catch (e) {}
}

// ═══════════════════════════════════════════════════════
//  NAVEGAÇÃO
// ═══════════════════════════════════════════════════════
function showPage(name) {
  if (!validarAcessoPagina(name, state.usuario)) {
    toast('Você não tem permissão para acessar essa página.', 'error');
    return;
  }
  if (name === 'auditoria') carregarAuditoria(1);
  if (name === 'visaogeral') carregarVisaoGeral();
  if (name === 'controle') carregarControleAcesso();
  if (name === 'relatorios') carregarRelatorios();
  if (name === 'nova') { cancelarEdicaoRascunho(); carregarRascunhos(); }
  if (name === 'configuracoes' && state.usuario) {
    const u = state.usuario;
    const iniciais = (u.nome || '').split(' ').map(p => p[0]).join('').slice(0,2).toUpperCase();
    const NOMES_CARGO = { 1: 'Administrador Geral', 2: 'Gerente Administrativo', 3: 'Supervisor', 4: 'Funcionário' };
    const configAvatar = document.getElementById('config-avatar');
    if (u.foto_url) {
      aplicarFotoAvatar('http://localhost:3000' + u.foto_url);
    } else {
      configAvatar.style.backgroundImage = '';
      configAvatar.textContent = iniciais || '--';
    }
    document.getElementById('btn-remover-foto').style.display = u.foto_url ? '' : 'none';
    document.getElementById('config-info-nome').textContent = u.nome || '—';
    document.getElementById('config-info-cargo').textContent = NOMES_CARGO[u.cargo_id] || `Cargo ${u.cargo_id}`;
    document.getElementById('config-info-email').textContent = u.email || '—';
    const depto = state.departamentos.find(d => d.id === u.departamento_id);
    document.getElementById('config-info-depto').textContent = depto ? (NOMES_DEPT[depto.nome.toUpperCase()] || depto.nome) : '—';
    ['config-senha-atual','config-senha-nova','config-senha-confirmar'].forEach(id => {
      document.getElementById(id).value = '';
    });
  }
  ['dashboard','nova','auditoria','configuracoes','visaogeral','controle','relatorios'].forEach(p => {
    var el = document.getElementById('page-'+p);
    if(el) el.style.display = (p === name) ? '' : 'none';
  });
  var titles = {
    dashboard: 'Tela Inicial <span>/ Visão Geral</span>',
    nova: 'Nova C.I <span>/ Redigir Comunicação</span>',
    auditoria: 'Auditoria <span>/ Histórico do Sistema</span>',
    visaogeral: 'Visão Geral <span>/ Monitoramento</span>',
    cis: 'Minhas C.I <span>/ Caixa de Entrada</span>',
    configuracoes: 'Configurações <span>/ Minha Conta</span>',
    controle: 'Controle de Acesso <span>/ Usuários do Sistema</span>',
    relatorios: 'Relatórios <span>/ Análise de Comunicações</span>',
  };
  document.getElementById('page-title').innerHTML = titles[name] || 'C.I Digital';
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
}

function showModal() { showPage('nova'); }

// ═══════════════════════════════════════════════════════
//  MODAL
// ═══════════════════════════════════════════════════════
function openCI(num, subject, from, to, prio, date, body, fromName) {
  document.getElementById('modal-ci').classList.add('open');
  document.getElementById('modal-ci-num').innerHTML = '<i class="ti ti-file-text" style="color:var(--usga-mid)"></i> ' + num;
  document.getElementById('modal-from').textContent = (fromName || from) + ' · Depto. ' + from;
  document.getElementById('modal-to').textContent = to;
  document.getElementById('modal-date').textContent = date;
  document.getElementById('modal-subject').textContent = subject;
  document.getElementById('modal-body-text').innerHTML = linkificar(body);
}

async function baixarAnexo(url, nome) {
  try {
    const resp = await fetch(url);
    const blob = await resp.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch (err) {
    toast('Erro ao baixar arquivo: ' + err.message, 'error');
  }
}

function closeModal() {
  document.getElementById('modal-ci').classList.remove('open');
  state.ciAtual = null;
  const btn = document.getElementById('btn-confirmar-leitura');
  if (btn) { btn.disabled = false; btn.style.display = ''; btn.innerHTML = '<i class="ti ti-check"></i> Confirmar Leitura'; }
  const indicador = document.getElementById('modal-read-indicator');
  if (indicador) indicador.style.display = '';
}

document.getElementById('modal-ci').addEventListener('click', function(e) {
  if(e.target === this) closeModal();
});

// ═══════════════════════════════════════════════════════
//  EXPORTAÇÃO CSV
// ═══════════════════════════════════════════════════════
function exportAuditCSV() {
  const rows = document.querySelectorAll('#page-auditoria tbody tr');
  let csv = [['Data/Hora','Usuário','Ação','CI','Detalhes']];
  rows.forEach(row => {
    const cols = row.querySelectorAll('td');
    csv.push([cols[0]?.innerText.trim()||'',cols[1]?.innerText.trim()||'',cols[2]?.innerText.trim()||'',cols[3]?.innerText.trim()||'',cols[4]?.innerText.trim()||'']);
  });
  const csvContent = csv.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  const blob = new Blob([csvContent], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = 'auditoria-ci-digital.csv';
  document.body.appendChild(link); link.click(); document.body.removeChild(link);
  URL.revokeObjectURL(url);
  toast('CSV exportado!');
}

// ═══════════════════════════════════════════════════════
//  AUDITORIA
// ═══════════════════════════════════════════════════════
const auditState = { pagina: 1, limite: 10, total: 0, acao: null, nome: '' };
let _auditNomeTimer = null;

function filtrarAuditoria(acao, el) {
  auditState.acao = acao;
  document.querySelectorAll('#page-auditoria .tab-bar .tab').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');
  carregarAuditoria(1);
}

function buscarAuditoriaNome(termo) {
  clearTimeout(_auditNomeTimer);
  _auditNomeTimer = setTimeout(() => {
    auditState.nome = termo.trim();
    carregarAuditoria(1);
  }, 300);
}

async function carregarAuditoria(pagina = 1) {
  auditState.pagina = pagina;
  const tbody = document.getElementById('audit-tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--text-muted)"><i class="ti ti-loader" style="animation:spin .6s linear infinite;display:inline-block"></i> Carregando...</td></tr>';

  let url = `/auditoria/listar?pagina=${pagina}&limite=${auditState.limite}`;
  if (auditState.acao) url += `&acao=${encodeURIComponent(auditState.acao)}`;
  if (auditState.nome) url += `&nome=${encodeURIComponent(auditState.nome)}`;

  try {
    const data = await api('GET', url);
    const logs = data.dados || [];
    auditState.total = data.paginacao?.total || logs.length;

    if (logs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state"><i class="ti ti-clipboard-off"></i><p>Nenhum registro encontrado.</p></div></td></tr>';
    } else {
      tbody.innerHTML = logs.map(l => {
        const data = l.data_hora ? new Date(l.data_hora).toLocaleString('pt-BR') : '—';
        const ciNum = l.comunicacao_id ? `<span class="ci-num">CI-${String(l.comunicacao_id).padStart(4,'0')}</span>` : '—';
        return `<tr>
          <td class="ci-date">${data}</td>
          <td style="font-weight:500">${l.usuario_nome || '—'}</td>
          <td>${l.acao_realizada || '—'}</td>
          <td>${ciNum}</td>
          <td style="color:var(--text-muted);font-size:12px">${l.ip_usuario || '—'}</td>
        </tr>`;
      }).join('');
    }

    const inicio = (pagina - 1) * auditState.limite + 1;
    const fim = Math.min(pagina * auditState.limite, auditState.total);
    document.getElementById('audit-table-info').innerHTML = `Exibindo <strong>${inicio}–${fim}</strong> de <strong>${auditState.total}</strong> registros`;
    renderizarPaginacaoAudit();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><i class="ti ti-alert-circle"></i><p>Erro ao carregar: ${err.message}</p></div></td></tr>`;
  }
}

function renderizarPaginacaoAudit() {
  const totalPaginas = Math.ceil(auditState.total / auditState.limite);
  const pag = document.getElementById('audit-pagination');
  if (!pag || totalPaginas <= 1) { if(pag) pag.innerHTML = ''; return; }
  let html = '';
  if (auditState.pagina > 1) html += `<button class="page-btn" onclick="carregarAuditoria(${auditState.pagina-1})"><i class="ti ti-chevron-left"></i></button>`;
  for (let i = 1; i <= totalPaginas; i++) {
    if (i === auditState.pagina) html += `<button class="page-btn active">${i}</button>`;
    else if (i <= 2 || i >= totalPaginas-1 || Math.abs(i-auditState.pagina) <= 1) html += `<button class="page-btn" onclick="carregarAuditoria(${i})">${i}</button>`;
    else if (!html.endsWith('…</button>')) html += `<button class="page-btn" style="cursor:default">…</button>`;
  }
  if (auditState.pagina < totalPaginas) html += `<button class="page-btn" onclick="carregarAuditoria(${auditState.pagina+1})"><i class="ti ti-chevron-right"></i></button>`;
  pag.innerHTML = html;
}

// ═══════════════════════════════════════════════════════
//  DASHBOARD — departamentos e histórico
// ═══════════════════════════════════════════════════════
const NOMES_DEPT = {
  'RH':  'Recursos Humanos',
  'DP':  'Departamento Pessoal',
  'SST': 'Segurança do Trabalho',
  'ADM': 'Gerência Administrativa',
  'GA':  'Gerência Administrativa',
};

async function carregarDeptDashboard() {
  const container = document.getElementById('dept-list');
  if (!container) return;
  try {
    const data = await api('GET', '/departamentos/listar');
    const depts = data.dados || [];
    const cores = ['#43931F','#1A6B9A','#B07A18','#7AB260','#C8382A','#888','#5A3A1A'];
    if (depts.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>Nenhum departamento.</p></div>';
      return;
    }
    container.innerHTML = depts.map((d, i) => `
      <div class="dept-row" data-dept-id="${d.id}" onclick="filtrarPorDepartamento(${d.id})">
        <span class="dept-dot" style="background:${cores[i % cores.length]}"></span>
        ${NOMES_DEPT[d.nome.toUpperCase()] || d.nome}
      </div>`).join('');
  } catch (e) {
    container.innerHTML = '<div class="empty-state"><p>Erro ao carregar.</p></div>';
  }
}

function filtrarPorDepartamento(deptId) {
  state.filtroDepartamento = state.filtroDepartamento === deptId ? null : deptId;
  state.paginaAtual = 1;
  document.querySelectorAll('#dept-list .dept-row').forEach(el => {
    el.classList.toggle('ativo', parseInt(el.dataset.deptId) === state.filtroDepartamento);
  });
  carregarCIs();
}

async function carregarAuditDashboard() {
  const container = document.getElementById('audit-list-dashboard');
  if (!container) return;
  try {
    const data = await api('GET', '/auditoria/listar?limite=4');
    const logs = data.dados || [];
    if (logs.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>Nenhum registro.</p></div>';
      return;
    }
    container.innerHTML = logs.map((l, i) => `
      <div class="audit-item">
        <div class="audit-line">
          <div class="audit-dot"></div>
          ${i < logs.length - 1 ? '<div class="audit-connector"></div>' : ''}
        </div>
        <div class="audit-body">
          <div class="audit-action"><strong>${l.usuario_nome}</strong> — ${l.acao_realizada}</div>
          <div class="audit-meta">${new Date(l.data_hora).toLocaleString('pt-BR')}</div>
        </div>
      </div>`).join('');
  } catch (e) {
    container.innerHTML = '<div class="empty-state"><p>Sem permissão ou erro.</p></div>';
  }
}

// ═══════════════════════════════════════════════════════
//  PERMISSÕES
// ═══════════════════════════════════════════════════════
function aplicarPermissoesFrontend(usuario) {
  const cargo = usuario?.cargo_id || 4;
  document.querySelectorAll('.admin-only').forEach(el => {
    el.style.display = cargo === 1 ? '' : 'none';
  });
  document.querySelectorAll('.gerente-admin-only').forEach(el => {
    el.style.display = cargo <= 2 ? '' : 'none';
  });
  document.querySelectorAll('.supervisor-acima-only').forEach(el => {
    el.style.display = cargo <= 3 ? '' : 'none';
  });
  document.querySelectorAll('.admin-supervisor-only').forEach(el => {
    el.style.display = (cargo === 1 || cargo === 3) ? '' : 'none';
  });
}

function validarAcessoPagina(pagina, usuario) {
  const cargo = usuario?.cargo_id || 4;
  if (pagina === 'departamentos' && cargo !== 1) return false;
  if (pagina === 'visaogeral' && cargo > 3) return false;
  if (pagina === 'relatorios' && cargo > 2) return false;
  if (pagina === 'auditoria' && cargo > 2) return false;
  return true;
}

// ═══════════════════════════════════════════════════════
//  LOGIN COM ENTER
// ═══════════════════════════════════════════════════════
document.getElementById('login-senha').addEventListener('keydown', e => { if(e.key==='Enter') fazerLogin(); });
document.getElementById('login-email').addEventListener('keydown', e => { if(e.key==='Enter') document.getElementById('login-senha').focus(); });

// ═══════════════════════════════════════════════════════
//  VISÃO GERAL — monitoramento de departamentos
// ═══════════════════════════════════════════════════════
const vgState = { deptAtual: null, pagina: 1, limite: 15, total: 0, busca: '' };
let _vgBuscaTimer = null;
const VG_CORES = ['#43931F','#1A6B9A','#B07A18','#7AB260','#C8382A','#888','#5A3A1A'];

async function carregarVisaoGeral() {
  const lista = document.getElementById('vg-dept-lista');
  if (!lista) return;

  // Supervisor: exibe e carrega apenas o próprio departamento
  if (state.usuario?.cargo_id === 3) {
    const deptoId = state.usuario.departamento_id;
    const depto = state.departamentos.find(d => d.id === deptoId);
    if (!depto) {
      lista.innerHTML = '<div class="empty-state"><p>Departamento não encontrado.</p></div>';
      return;
    }
    const nomeDepto = NOMES_DEPT[depto.nome.toUpperCase()] || depto.nome;
    lista.innerHTML = `
      <div class="vg-dept-item ativo" data-id="${depto.id}">
        <span class="vg-dept-dot" style="background:#43931F"></span>
        <span style="flex:1">${nomeDepto}</span>
      </div>`;
    selecionarDeptVG(depto.id, depto.nome);
    return;
  }

  // Admin / Gerente: exibe todos os departamentos com stats
  try {
    const data = await api('GET', '/departamentos/stats');
    const depts = data.dados || [];
    if (depts.length === 0) {
      lista.innerHTML = '<div class="empty-state"><p>Nenhum departamento.</p></div>';
      return;
    }
    lista.innerHTML = depts.map((d, i) => `
      <div class="vg-dept-item" data-id="${d.id}" onclick="selecionarDeptVG(${d.id}, '${d.nome}')">
        <span class="vg-dept-dot" style="background:${VG_CORES[i % VG_CORES.length]}"></span>
        <span style="flex:1">${NOMES_DEPT[d.nome.toUpperCase()] || d.nome}</span>
        <div class="vg-dept-stats">
          <span class="vg-dept-total">${d.total_cis}</span>
          <span class="vg-dept-hoje">${d.cis_hoje} hoje</span>
        </div>
      </div>`).join('');
  } catch (e) {
    lista.innerHTML = '<div class="empty-state"><p>Erro ao carregar.</p></div>';
  }
}

function buscarVG(termo) {
  clearTimeout(_vgBuscaTimer);
  _vgBuscaTimer = setTimeout(() => {
    vgState.busca = termo.trim();
    if (vgState.deptAtual) selecionarDeptVG(vgState.deptAtual, '', 1, true);
  }, 300);
}

async function selecionarDeptVG(id, nome, pagina = 1, manterBusca = false) {
  if (!manterBusca) {
    vgState.busca = '';
    const inp = document.getElementById('vg-busca');
    if (inp) inp.value = '';
  }
  vgState.deptAtual = id;
  vgState.pagina = pagina;

  document.querySelectorAll('.vg-dept-item').forEach(el => {
    el.classList.toggle('ativo', parseInt(el.dataset.id) === id);
  });

  const nomeCompleto = NOMES_DEPT[nome.toUpperCase()] || nome;
  document.getElementById('vg-ci-titulo').innerHTML =
    `<i class="ti ti-building" style="color:var(--usga-mid)"></i> ${nomeCompleto}`;

  const placeholder = document.getElementById('vg-ci-placeholder');
  const table = document.getElementById('vg-ci-table');
  const footer = document.getElementById('vg-ci-footer');
  const tbody = document.getElementById('vg-ci-tbody');

  const buscaWrap = document.getElementById('vg-busca-wrap');
  if (buscaWrap) buscaWrap.style.display = '';

  placeholder.style.display = 'none';
  table.style.display = '';
  footer.style.display = '';
  tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--text-muted)">
    <i class="ti ti-loader" style="animation:spin .6s linear infinite;display:inline-block;margin-right:6px"></i> Carregando...
  </td></tr>`;

  try {
    const buscaParam = vgState.busca ? `&busca=${encodeURIComponent(vgState.busca)}` : '';
    const data = await api('GET', `/departamentos/${id}/comunicacoes?pagina=${pagina}&limite=${vgState.limite}${buscaParam}`);
    const cis = data.dados || [];
    vgState.total = data.paginacao?.total || 0;

    if (cis.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><i class="ti ti-inbox"></i><p>Nenhuma C.I encontrada.</p></div></td></tr>`;
      document.getElementById('vg-pag-info').textContent = '0 comunicações';
      document.getElementById('vg-pagination').innerHTML = '';
      return;
    }

    tbody.innerHTML = cis.map(ci => {
      const dataFmt = ci.data_hora ? new Date(ci.data_hora).toLocaleDateString('pt-BR') : '—';
      const status = statusLeituraEnvio(ci);
      return `<tr onclick="abrirCIDoBackend(${ci.id}, true)" style="cursor:pointer">
        <td><span class="ci-num">CI-${String(ci.id).padStart(4,'0')}</span></td>
        <td class="ci-subject">${ci.titulo}</td>
        <td style="font-size:12px;color:var(--text-mid)">${ci.usuario_nome || '—'}</td>
        <td>${status}</td>
        <td class="ci-date">${dataFmt}</td>
      </tr>`;
    }).join('');

    const inicio = (pagina - 1) * vgState.limite + 1;
    const fim = Math.min(pagina * vgState.limite, vgState.total);
    document.getElementById('vg-pag-info').innerHTML =
      `Exibindo <strong>${inicio}–${fim}</strong> de <strong>${vgState.total}</strong>`;
    renderizarPaginacaoVG();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><i class="ti ti-alert-circle"></i><p>Erro: ${err.message}</p></div></td></tr>`;
  }
}

function renderizarPaginacaoVG() {
  const totalPaginas = Math.ceil(vgState.total / vgState.limite);
  const pag = document.getElementById('vg-pagination');
  if (totalPaginas <= 1) { pag.innerHTML = ''; return; }
  let html = '';
  if (vgState.pagina > 1) html += `<button class="page-btn" onclick="selecionarDeptVG(${vgState.deptAtual},'',${vgState.pagina-1})"><i class="ti ti-chevron-left"></i></button>`;
  for (let i = 1; i <= totalPaginas; i++) {
    if (i === vgState.pagina) html += `<button class="page-btn active">${i}</button>`;
    else if (i <= 2 || i >= totalPaginas-1 || Math.abs(i-vgState.pagina) <= 1) html += `<button class="page-btn" onclick="selecionarDeptVG(${vgState.deptAtual},'',${i})">${i}</button>`;
    else if (!html.endsWith('…</button>')) html += `<button class="page-btn" style="cursor:default">…</button>`;
  }
  if (vgState.pagina < totalPaginas) html += `<button class="page-btn" onclick="selecionarDeptVG(${vgState.deptAtual},'',${vgState.pagina+1})"><i class="ti ti-chevron-right"></i></button>`;
  pag.innerHTML = html;
}

// ═══════════════════════════════════════════════════════
//  CONTROLE DE ACESSO
// ═══════════════════════════════════════════════════════
const CA_CARGOS = { 1: 'Administrador Geral', 2: 'Gerente Administrativo', 3: 'Supervisor', 4: 'Funcionário' };
const CA_CORES = { 1: '#C8382A', 2: '#1A6B9A', 3: '#B07A18', 4: '#43931F' };
let caUsuariosTodos = [];

async function carregarControleAcesso() {
  const sel = document.getElementById('ca-depto');
  if (sel && state.departamentos.length > 0) {
    sel.innerHTML = '<option value="">Selecione o departamento</option>' +
      state.departamentos.map(d =>
        `<option value="${d.id}">${NOMES_DEPT[d.nome.toUpperCase()] || d.nome}</option>`
      ).join('');
  }
  await carregarListaUsuariosCA();
}

async function carregarListaUsuariosCA() {
  const lista = document.getElementById('ca-lista');
  if (!lista) return;
  lista.innerHTML = '<div class="empty-state"><i class="ti ti-loader" style="animation:spin .6s linear infinite;display:inline-block"></i></div>';
  try {
    const data = await api('GET', '/usuarios?limite=100');
    caUsuariosTodos = data.dados || [];
    const busca = document.getElementById('ca-busca')?.value || '';
    renderizarUsuariosCA(busca ? caUsuariosTodos.filter(u =>
      u.nome.toLowerCase().includes(busca.toLowerCase()) ||
      u.email.toLowerCase().includes(busca.toLowerCase())
    ) : caUsuariosTodos);
  } catch (e) {
    lista.innerHTML = '<div class="empty-state"><i class="ti ti-alert-circle"></i><p>Erro ao carregar usuários.</p></div>';
  }
}

function renderizarUsuariosCA(usuarios) {
  const lista = document.getElementById('ca-lista');
  if (!lista) return;
  if (!usuarios.length) {
    lista.innerHTML = '<div class="empty-state"><i class="ti ti-users-off"></i><p>Nenhum usuário encontrado.</p></div>';
    return;
  }
  lista.innerHTML = `<table class="ci-table">
    <thead>
      <tr>
        <th>Usuário</th>
        <th>Cargo</th>
        <th>Departamento</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      ${usuarios.map(u => {
        const iniciais = u.nome.split(' ').map(p => p[0]).slice(0,2).join('').toUpperCase();
        const depto = state.departamentos.find(d => d.id === u.departamento_id);
        const nomeDepto = depto ? (NOMES_DEPT[depto.nome.toUpperCase()] || depto.nome) : '—';
        const cargoNome = CA_CARGOS[u.cargo_id] || `Cargo ${u.cargo_id}`;
        const cargoCor = CA_CORES[u.cargo_id] || '#888';
        const isSelf = u.id === state.usuario?.id;
        return `<tr>
          <td>
            <div style="display:flex;align-items:center;gap:12px">
              <div style="width:36px;height:36px;border-radius:50%;background:var(--usga-mid);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:white;flex-shrink:0;overflow:hidden;${u.foto_url ? `background-image:url(http://localhost:3000${u.foto_url});background-size:cover;background-position:center` : ''}">${u.foto_url ? '' : iniciais}</div>
              <div>
                <div style="font-weight:500;font-size:13.5px;color:var(--text-primary)">${u.nome}</div>
                <div style="font-size:11px;color:var(--text-muted)">${u.email}</div>
              </div>
            </div>
          </td>
          <td>
            <span style="font-size:11.5px;padding:3px 10px;border-radius:20px;background:${cargoCor}18;color:${cargoCor};font-weight:600;white-space:nowrap">${cargoNome}</span>
          </td>
          <td style="font-size:13px;color:var(--text-mid)">${nomeDepto}</td>
          <td id="ca-del-cell-${u.id}" style="text-align:right;white-space:nowrap">
            ${isSelf
              ? `<span style="font-size:11px;color:var(--text-muted);padding:4px 8px">você</span>`
              : `<button class="btn-ghost" style="color:var(--danger);padding:5px 8px;border-radius:var(--radius)" onclick="confirmarInativarCA(${u.id},'${u.nome.replace(/'/g,"\\'")}')" title="Desativar usuário"><i class="ti ti-trash" style="font-size:15px"></i></button>`
            }
          </td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>`;
}

function filtrarUsuariosCA(termo) {
  const t = termo.toLowerCase();
  renderizarUsuariosCA(caUsuariosTodos.filter(u =>
    u.nome.toLowerCase().includes(t) || u.email.toLowerCase().includes(t)
  ));
}

function confirmarInativarCA(id, nome) {
  const cell = document.getElementById(`ca-del-cell-${id}`);
  if (!cell) return;
  cell.innerHTML = `
    <div style="display:flex;align-items:center;gap:6px;justify-content:flex-end">
      <span style="font-size:12px;color:var(--text-muted)">Desativar?</span>
      <button onclick="inativarUsuarioCA(${id},'${nome.replace(/'/g,"\\'")}');event.stopPropagation()"
        style="background:var(--danger);color:white;border:none;border-radius:6px;padding:4px 12px;font-size:12px;cursor:pointer;font-family:inherit;font-weight:500">
        Sim
      </button>
      <button onclick="carregarListaUsuariosCA();event.stopPropagation()"
        style="background:none;border:1px solid var(--border);border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer;font-family:inherit;color:var(--text-mid)">
        Não
      </button>
    </div>`;
}

async function inativarUsuarioCA(id, nome) {
  try {
    await api('DELETE', '/usuarios/' + id);
    toast(`Usuário ${nome} desativado com sucesso.`);
    await carregarListaUsuariosCA();
  } catch (err) {
    toast('Erro ao desativar: ' + err.message, 'error');
  }
}

async function criarUsuarioCA() {
  const nome = document.getElementById('ca-nome').value.trim();
  const email = document.getElementById('ca-email').value.trim();
  const senha = document.getElementById('ca-senha').value;
  const cargo_id = parseInt(document.getElementById('ca-cargo').value);
  const departamento_id = parseInt(document.getElementById('ca-depto').value);

  if (!nome || !email || !senha || !cargo_id || !departamento_id) {
    toast('Preencha todos os campos.', 'error'); return;
  }
  if (senha.length < 8) {
    toast('A senha deve ter no mínimo 8 caracteres.', 'error'); return;
  }

  const btn = document.querySelector('#page-controle .btn-primary');
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spin"></span> Criando...';

  try {
    await api('POST', '/usuarios/cadastro', { nome, email, senha, cargo_id, departamento_id });
    toast(`Usuário ${nome} criado com sucesso!`);
    ['ca-nome','ca-email','ca-senha'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('ca-cargo').value = '';
    document.getElementById('ca-depto').value = '';
    await carregarListaUsuariosCA();
  } catch (err) {
    toast('Erro ao criar usuário: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = original;
  }
}

// ═══════════════════════════════════════════════════════
//  RELATÓRIOS
// ═══════════════════════════════════════════════════════
let relPeriodo = 30;
const relCharts = {};

// Desativa todas as animações do Chart.js globalmente
if (typeof Chart !== 'undefined') {
  Chart.defaults.animation = false;
  Chart.defaults.transitions.active.animation.duration = 0;
  Chart.defaults.transitions.resize.animation.duration = 0;
}

function selecionarPeriodoRel(dias, el) {
  relPeriodo = dias;
  document.querySelectorAll('.rel-periodo-btn').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  carregarRelatorios();
}

async function carregarRelatorios() {
  try {
    const [resumoData, deptoData, evolData] = await Promise.all([
      api('GET', `/relatorios/resumo?periodo=${relPeriodo}`),
      api('GET', `/relatorios/por-departamento?periodo=${relPeriodo}`),
      api('GET', '/relatorios/evolucao-mensal')
    ]);
    renderizarResumo(resumoData.dados);
    renderizarGraficoPorDepto(deptoData.dados);
    renderizarGraficoTaxaLeitura(deptoData.dados);
    renderizarGraficoEvolucao(evolData.dados);
  } catch (err) {
    toast('Erro ao carregar relatórios: ' + err.message, 'error');
  }
}

function renderizarResumo(d) {
  document.getElementById('rel-total').textContent     = d.total_cis;
  document.getElementById('rel-taxa').textContent      = d.taxa_leitura + '%';
  document.getElementById('rel-pendentes').textContent = d.total_pendentes;
  document.getElementById('rel-media').textContent     = d.media_por_dia;
}

function criarOuAtualizarChart(id, tipo, dados, opcoes) {
  if (relCharts[id]) relCharts[id].destroy();
  const ctx = document.getElementById(id)?.getContext('2d');
  if (!ctx) return;
  relCharts[id] = new Chart(ctx, { type: tipo, data: dados, options: opcoes });
}

function corDark() {
  return document.body.classList.contains('dark');
}

function hexRgba(hex, alpha) {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function corDepto(id) {
  const idx = state.departamentos.findIndex(d => d.id === parseInt(id));
  return VG_CORES[idx >= 0 ? idx % VG_CORES.length : 0];
}

function labelMultilinha(texto) {
  const palavras = texto.split(' ');
  if (palavras.length <= 1) return texto;
  const meio = Math.ceil(palavras.length / 2);
  return [palavras.slice(0, meio).join(' '), palavras.slice(meio).join(' ')];
}

function renderizarGraficoPorDepto(depts) {
  const dark = corDark();
  const labels = depts.map(d => labelMultilinha(NOMES_DEPT[d.nome.toUpperCase()] || d.nome));
  criarOuAtualizarChart('chart-por-depto', 'bar', {
    labels,
    datasets: [
      { label: 'Enviadas',  data: depts.map(d => d.enviadas),  backgroundColor: dark ? '#43931F' : '#1B5E20', borderRadius: 4 },
      { label: 'Recebidas', data: depts.map(d => d.recebidas), backgroundColor: dark ? '#7AB260' : '#1976D2', borderRadius: 4 }
    ]
  }, {
    responsive: false,
    plugins: { legend: { labels: { color: dark ? '#9AB882' : '#3D5C2A', font: { family: 'DM Sans' } } } },
    scales: {
      x: { ticks: { color: dark ? '#9AB882' : '#6B8C58', maxRotation: 0, minRotation: 0 }, grid: { color: dark ? '#1E2E14' : '#E8F2E0' } },
      y: { ticks: { color: dark ? '#9AB882' : '#6B8C58', stepSize: 1 }, grid: { color: dark ? '#1E2E14' : '#E8F2E0' }, beginAtZero: true }
    }
  });
}

function renderizarGraficoTaxaLeitura(depts) {
  const dark = corDark();
  const labels = depts.map(d => labelMultilinha(NOMES_DEPT[d.nome.toUpperCase()] || d.nome));
  criarOuAtualizarChart('chart-taxa-leitura', 'bar', {
    labels,
    datasets: [
      { label: 'Lidas',     data: depts.map(d => d.lidas),    backgroundColor: dark ? '#43931F' : '#388E3C', borderRadius: 4 },
      { label: 'Pendentes', data: depts.map(d => d.pendentes), backgroundColor: dark ? '#F0C050' : '#F9A825', borderRadius: 4 }
    ]
  }, {
    responsive: false,
    plugins: { legend: { labels: { color: dark ? '#9AB882' : '#3D5C2A', font: { family: 'DM Sans' } } } },
    scales: {
      x: { stacked: true, ticks: { color: dark ? '#9AB882' : '#6B8C58', maxRotation: 0, minRotation: 0 }, grid: { color: dark ? '#1E2E14' : '#E8F2E0' } },
      y: { stacked: true, ticks: { color: dark ? '#9AB882' : '#6B8C58', stepSize: 1 }, grid: { color: dark ? '#1E2E14' : '#E8F2E0' }, beginAtZero: true }
    }
  });
}

function renderizarGraficoEvolucao(dados) {
  const dark = corDark();
  const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const labels = dados.map(d => {
    const [ano, mes] = d.mes.split('-');
    return `${MESES[parseInt(mes) - 1]}/${ano.slice(2)}`;
  });
  criarOuAtualizarChart('chart-evolucao', 'line', {
    labels,
    datasets: [{
      label: 'C.I Enviadas',
      data: dados.map(d => d.total),
      borderColor: '#43931F',
      backgroundColor: 'rgba(67,147,31,0.08)',
      tension: 0.4,
      fill: true,
      pointBackgroundColor: '#43931F',
      pointRadius: 4
    }]
  }, {
    responsive: false,
    plugins: { legend: { labels: { color: dark ? '#9AB882' : '#3D5C2A', font: { family: 'DM Sans' } } } },
    scales: {
      x: { ticks: { color: dark ? '#9AB882' : '#6B8C58' }, grid: { color: dark ? '#1E2E14' : '#E8F2E0' } },
      y: { ticks: { color: dark ? '#9AB882' : '#6B8C58', stepSize: 1 }, grid: { color: dark ? '#1E2E14' : '#E8F2E0' }, beginAtZero: true }
    }
  });
}

// ═══════════════════════════════════════════════════════
//  UTILITÁRIOS DE TEXTO
// ═══════════════════════════════════════════════════════
function linkificar(texto) {
  if (!texto) return '';
  const escaped = texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  return escaped
    .replace(/(https?:\/\/[^\s]+)/g, url =>
      `<a href="${url}" target="_blank" rel="noopener noreferrer" class="ci-link">${url}</a>`)
    .replace(/\n/g, '<br>');
}

// ═══════════════════════════════════════════════════════
//  DARK MODE
// ═══════════════════════════════════════════════════════
function toggleDarkMode() {
  const isDark = document.body.classList.toggle('dark');
  localStorage.setItem('ci_dark', isDark ? '1' : '0');
  const btn = document.getElementById('btn-dark-mode');
  if (btn) btn.innerHTML = isDark
    ? '<i class="ti ti-sun"></i>'
    : '<i class="ti ti-moon"></i>';
}

function aplicarDarkModeInicial() {
  const salvo = localStorage.getItem('ci_dark');
  const prefereSistema = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (salvo === '1' || (salvo === null && prefereSistema)) {
    document.body.classList.add('dark');
    const btn = document.getElementById('btn-dark-mode');
    if (btn) btn.innerHTML = '<i class="ti ti-sun"></i>';
  }
}

// ═══════════════════════════════════════════════════════
//  BOOT
// ═══════════════════════════════════════════════════════
aplicarDarkModeInicial();
verificarSessao();
