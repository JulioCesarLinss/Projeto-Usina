//lista de padroes de SQL injection
// São comandos perigosos que alguém pode tentar mandar no lugar de um nome normal
const SQL_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
  /(--|\/\*|\*\/)/gi,
  /('|('')|(%27))/gi,
];

// Vasculha todos os campos recebidos em busca de ataques
const scanForAttacks = (obj, prefix = '') => {
  if (typeof obj === 'string') {
    for (const p of SQL_PATTERNS) {
      p.lastIndex = 0;
      if (p.test(obj)) return { tipo: 'sql-injection', campo: prefix };
    }
    for (const p of XSS_PATTERNS) {
      p.lastIndex = 0;
      if (p.test(obj)) return { tipo: 'xss', campo: prefix };
    }
    return null;
  }

  if (typeof obj === 'object' && obj !== null) {
    for (const [key, value] of Object.entries(obj)) {
      const result = scanForAttacks(value, prefix ? `${prefix}.${key}` : key);
      if (result) return result;
    }
  }

  return null;
};

//middlewere pricinpal - verifica tudo que chega antes de processae
export const sanitizeInus = (req, res, next) => {
    const attack =
    scanForAttacks(req.body, 'body') ||
    scanForAttacks(req.query, 'query');

    if(attack) {
        //avisa o admin mo console do servidor
         console.warn(
        ' ATAQUE DETECTADO: tipo=${attack.tipo} campo=${attack.campo} ip=${req.ip}'
    );
    return res.status(400).json({
      sucesso: false,
      tipo: 'validacao',
      erro: 'Entrada inválida detectada',
      codigo: 'ENTRADA_INVALIDA'
    });
    }

    next();
};

//garante que so chegue JSON nas rotas que esperam JSON
export const validateContentType = (req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('application/json')) {
      return res.status(415).json({
        sucesso: false,
        erro: 'Content-Type deve ser application/json',
        codigo: 'CONTENT_TYPE_INVALIDO'
      });
    }
  }
  next();
};