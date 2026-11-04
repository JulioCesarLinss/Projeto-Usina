-- ja_aplicada_se: SELECT 1 FROM cargos WHERE id = 5
-- Cargo de secretário: único que pode enviar C.I. em nome de um gerente
-- (o envio só acontece depois da aprovação do gerente). Rode em bancos já existentes.
USE cidigital;

INSERT INTO cargos(id,nome) VALUES (5,'secretario');
