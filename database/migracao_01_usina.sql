-- Migração para bancos JÁ existentes (instalações novas usam schema.sql + dados.sql).
-- Tudo o que existe hoje é atribuído à Usina Trapiche (id 1).
USE cidigital;

CREATE TABLE usina (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nome VARCHAR(100) NOT NULL,
  logo_url VARCHAR(255) NOT NULL
);

INSERT INTO usina(id,nome,logo_url) VALUES
(1,'Usina Trapiche','fotos_usinas/Trapiche.png'),
(2,'USGA','fotos_usinas/USGA.png');

ALTER TABLE departamento ADD COLUMN usina_id INT NOT NULL DEFAULT 1;
ALTER TABLE departamento ADD FOREIGN KEY (usina_id) REFERENCES usina(id);
ALTER TABLE departamento ALTER COLUMN usina_id DROP DEFAULT;

ALTER TABLE usuario ADD COLUMN usina_id INT NOT NULL DEFAULT 1;
ALTER TABLE usuario ADD FOREIGN KEY (usina_id) REFERENCES usina(id);
ALTER TABLE usuario ALTER COLUMN usina_id DROP DEFAULT;
