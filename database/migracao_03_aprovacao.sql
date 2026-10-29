-- Fluxo de aprovação do gerente + comentários + versões. Rode em bancos já existentes.
USE cidigital;

ALTER TABLE comunicacao
  MODIFY estado ENUM('rascunho','aguardando_aprovacao','ajustes_solicitados','enviada','arquivada') NOT NULL,
  ADD COLUMN em_nome_de_id INT NULL,
  ADD COLUMN aprovado_por INT NULL,
  ADD COLUMN aprovado_em DATETIME NULL,
  ADD COLUMN assinatura_aprovacao VARCHAR(140) NULL,
  ADD FOREIGN KEY (em_nome_de_id) REFERENCES usuario(id),
  ADD FOREIGN KEY (aprovado_por) REFERENCES usuario(id);

CREATE TABLE comentario_comunicacao (
  id INT PRIMARY KEY AUTO_INCREMENT,
  comunicacao_id INT NOT NULL,
  usuario_id INT NOT NULL,
  tipo ENUM('comentario','solicitacao_ajuste','aprovacao','reenvio') NOT NULL DEFAULT 'comentario',
  texto TEXT NOT NULL,
  data_hora DATETIME NOT NULL,
  FOREIGN KEY (comunicacao_id) REFERENCES comunicacao(id),
  FOREIGN KEY (usuario_id) REFERENCES usuario(id)
);
CREATE INDEX idx_comentario_ci ON comentario_comunicacao (comunicacao_id, data_hora);

-- cópia do texto anterior a cada edição feita após pedido de ajuste
CREATE TABLE comunicacao_versao (
  id INT PRIMARY KEY AUTO_INCREMENT,
  comunicacao_id INT NOT NULL,
  titulo VARCHAR(150),
  descricao TEXT NOT NULL,
  usuario_id INT NOT NULL,
  data_hora DATETIME NOT NULL,
  FOREIGN KEY (comunicacao_id) REFERENCES comunicacao(id),
  FOREIGN KEY (usuario_id) REFERENCES usuario(id)
);
