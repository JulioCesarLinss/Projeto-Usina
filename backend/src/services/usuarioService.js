// ==================== VALIDAÇÕES ====================

export const validarDadosCadastro = (nome, email, senha, cargo_id, departamento_id) => {
  const erros = [];

  if (!nome || nome.trim().length === 0) {
    erros.push('Nome é obrigatório');
  } else if (nome.trim().length < 3) {
    erros.push('Nome deve ter pelo menos 3 caracteres');
  } else if (nome.trim().length > 100) {
    erros.push('Nome deve ter no máximo 100 caracteres');
  }

  if (!email || email.trim().length === 0) {
    erros.push('Email é obrigatório');
  } else if (!validarFormatoEmail(email)) {
    erros.push('Email inválido');
  }

  if (!senha || senha.length === 0) {
    erros.push('Senha é obrigatória');
  } else if (senha.length < 8) {
    erros.push('Senha deve ter pelo menos 8 caracteres');
  } else if (senha.length > 128) {
    erros.push('Senha muito longa');
  }

  if (!cargo_id || isNaN(cargo_id) || cargo_id <= 0) {
    erros.push('Cargo inválido');
  }

  if (!departamento_id || isNaN(departamento_id) || departamento_id <= 0) {
    erros.push('Departamento inválido');
  }

  return erros;
};

export const validarDadosAtualizacao = (nome, email, cargo_id, departamento_id) => {
  const erros = [];

  if (nome !== undefined) {
    if (nome.trim().length === 0) {
      erros.push('Nome não pode estar vazio');
    } else if (nome.trim().length < 3) {
      erros.push('Nome deve ter pelo menos 3 caracteres');
    } else if (nome.trim().length > 100) {
      erros.push('Nome deve ter no máximo 100 caracteres');
    }
  }

  if (email !== undefined) {
    if (email.trim().length === 0) {
      erros.push('Email não pode estar vazio');
    } else if (!validarFormatoEmail(email)) {
      erros.push('Email inválido');
    }
  }

  if (cargo_id !== undefined) {
    if (isNaN(cargo_id) || cargo_id <= 0) {
      erros.push('Cargo inválido');
    }
  }

  if (departamento_id !== undefined) {
    if (isNaN(departamento_id) || departamento_id <= 0) {
      erros.push('Departamento inválido');
    }
  }

  return erros;
};


export const validarFormatoEmail = (email) => {
  const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regexEmail.test(email);
};

export const verificarComplexidadeSenha = (senha) => {
  const temMaiuscula = /[A-Z]/.test(senha);
  const temMinuscula = /[a-z]/.test(senha);
  const temNumero = /\d/.test(senha);
  const temEspecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(senha);

  return {
    complexidade: (temMaiuscula ? 1 : 0) + (temMinuscula ? 1 : 0) + (temNumero ? 1 : 0) + (temEspecial ? 1 : 0),
    recomendacoes: {
      maiuscula: !temMaiuscula ? 'Adicione letras maiúsculas' : null,
      minuscula: !temMinuscula ? 'Adicione letras minúsculas' : null,
      numero: !temNumero ? 'Adicione números' : null,
      especial: !temEspecial ? 'Adicione caracteres especiais' : null
    }
  };
};


export const verificarPermissaoAtualizacao = (usuarioAutenticado, usuarioAlvo) => {
  if (usuarioAutenticado.id === usuarioAlvo) return true;
 
  if (usuarioAutenticado.cargo_id === 1) return true; // Assumindo que cargo_id 1 é admin
  
  return false;
};

export const verificarPermissaoDeleção = (usuarioAutenticado) => {

  return usuarioAutenticado.cargo_id === 1;
};



export const formatarUsuarioParaResposta = (usuario) => {
  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    cargo_id: usuario.cargo_id,
    departamento_id: usuario.departamento_id
  };
};
