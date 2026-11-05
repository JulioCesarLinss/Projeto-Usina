-- Reuniões (agenda): presenciais ou online, com convidados, confirmação de presença
-- e lembrete automático 1 hora antes. Notificações passam a poder ser de reunião.

CREATE TABLE reuniao (
  id INT PRIMARY KEY AUTO_INCREMENT,
  titulo VARCHAR(150) NOT NULL,
  descricao TEXT NULL,
  inicio DATETIME NOT NULL,
  fim DATETIME NOT NULL,
  modalidade ENUM('presencial','online') NOT NULL,
  local VARCHAR(200) NULL,
  link VARCHAR(500) NULL,
  organizador_id INT NOT NULL,
  usina_id INT NOT NULL,
  estado ENUM('agendada','cancelada') NOT NULL DEFAULT 'agendada',
  lembrete_enviado_em DATETIME NULL,
  criado_em DATETIME NOT NULL,
  FOREIGN KEY (organizador_id) REFERENCES usuario(id),
  FOREIGN KEY (usina_id) REFERENCES usina(id)
);
CREATE INDEX idx_reuniao_inicio ON reuniao (estado, inicio);

CREATE TABLE reuniao_participante (
  reuniao_id INT NOT NULL,
  usuario_id INT NOT NULL,
  resposta ENUM('pendente','vou','nao_vou') NOT NULL DEFAULT 'pendente',
  respondido_em DATETIME NULL,
  PRIMARY KEY (reuniao_id, usuario_id),
  INDEX idx_participante_usuario (usuario_id, reuniao_id),
  FOREIGN KEY (reuniao_id) REFERENCES reuniao(id),
  FOREIGN KEY (usuario_id) REFERENCES usuario(id)
);

-- notificação pode ser de C.I. ou de reunião
ALTER TABLE notificacoes
  MODIFY comunicacao_id INT NULL,
  ADD reuniao_id INT NULL,
  ADD FOREIGN KEY (reuniao_id) REFERENCES reuniao(id);
