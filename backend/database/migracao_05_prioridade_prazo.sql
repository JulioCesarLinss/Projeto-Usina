-- ja_aplicada_se: SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'comunicacao' AND COLUMN_NAME = 'prioridade'
-- Prioridade (normal / importante / urgente) e prazo de leitura das C.I.s.
-- lembrete_enviado_em marca que o lembrete automático do prazo já foi disparado.
-- Rode em bancos já existentes.
USE cidigital;

ALTER TABLE comunicacao
  ADD prioridade ENUM('normal','importante','urgente') NOT NULL DEFAULT 'normal',
  ADD prazo_leitura DATE NULL,
  ADD lembrete_enviado_em DATETIME NULL;

CREATE INDEX idx_comunicacao_prazo ON comunicacao(estado, prazo_leitura);
