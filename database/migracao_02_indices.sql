-- Índices para histórico paginado e listagens. Rode em bancos já existentes.
USE cidigital;

CREATE INDEX idx_comunicacao_data ON comunicacao (data_hora, id);
CREATE INDEX idx_comunicacao_dept_data ON comunicacao (departamento_id, data_hora);
CREATE INDEX idx_comunicacao_usuario_data ON comunicacao (usuario_id, data_hora);
CREATE INDEX idx_destinatario_ci_usuario ON destinatario (comunicacao_id, usuario_id);
CREATE INDEX idx_confirmacao_ci_usuario ON confirmacao_leitura (comunicacao_id, usuario_id);
