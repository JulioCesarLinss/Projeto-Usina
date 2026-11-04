import { ValidationError, AuthorizationError } from '../utils/appError.js';
import { CARGO_SECRETARIO } from './aprovacaoService.js';

export const PRIORIDADES = ['normal', 'importante', 'urgente'];
const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;

// data local no formato AAAA-MM-DD (evita o deslocamento de fuso do toISOString)
const hojeISO = (somarDias = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + somarDias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Valida prioridade e prazo de leitura de uma C.I.
// "urgente" só para supervisor ou acima (cargo <= 3), ou secretário enviando em nome
// de um gerente (o gerente aprova antes do envio). O prazo é opcional: de hoje até 1 ano.
export const validarPrioridadePrazo = ({ prioridade, prazo_leitura }, usuario, emNomeDeGerente = false) => {
  const prio = prioridade || 'normal';
  if (!PRIORIDADES.includes(prio))
    throw new ValidationError('Prioridade inválida', 'PRIORIDADE_INVALIDA', []);

  if (prio === 'urgente') {
    const podeUrgente = usuario.cargo_id <= 3
      || (usuario.cargo_id === CARGO_SECRETARIO && emNomeDeGerente);
    if (!podeUrgente)
      throw new AuthorizationError('Apenas supervisores ou acima podem enviar C.I. urgente', 'URGENTE_NAO_PERMITIDO');
  }

  let prazo = null;
  if (prazo_leitura) {
    if (!DATA_RE.test(prazo_leitura) || isNaN(new Date(prazo_leitura)))
      throw new ValidationError('Prazo de leitura deve estar no formato AAAA-MM-DD', 'PRAZO_INVALIDO', []);
    if (prazo_leitura < hojeISO())
      throw new ValidationError('O prazo de leitura não pode ser anterior a hoje', 'PRAZO_INVALIDO', []);
    if (prazo_leitura > hojeISO(365))
      throw new ValidationError('O prazo de leitura não pode passar de 1 ano', 'PRAZO_INVALIDO', []);
    prazo = prazo_leitura;
  }

  return { prioridade: prio, prazo_leitura: prazo };
};
