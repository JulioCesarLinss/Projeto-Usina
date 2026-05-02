CREATE DATABASE cidigital;
USE cidigital;

CREATE TABLE cargos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nome VARCHAR(50) NOT NULL
);
 
CREATE TABLE departamento(
id INT PRIMARY KEY AUTO_INCREMENT,
nome VARCHAR(50) NOT NULL,
descricao TEXT NOT NULL
);

CREATE TABLE usuario (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  senha VARCHAR(255) NOT NULL,
  cargo_id INT NOT NULL,
  departamento_id INT NOT NULL,
  FOREIGN KEY (cargo_id) REFERENCES cargos(id),
  FOREIGN KEY (departamento_id) REFERENCES departamento(id)
);

CREATE TABLE comunicacao(
 id INT PRIMARY KEY AUTO_INCREMENT,
 titulo VARCHAR(150),
 data_hora DATETIME NOT NULL,
 estado ENUM('rascunho', 'enviada', 'arquivada') NOT NULL,
 descricao TEXT NOT NULL,
 usuario_id INT NOT NULL,
 departamento_id INT NOT NULL,
 FOREIGN KEY (usuario_id) REFERENCES usuario(id),
 FOREIGN KEY (departamento_id) REFERENCES departamento(id)

);

CREATE TABLE destinatario(
	id INT PRIMARY KEY AUTO_INCREMENT,
    comunicacao_id INT NOT NULL,
    usuario_id INT NOT NULL,
    departamento_id INT NOT NULL,
    FOREIGN KEY (comunicacao_id) REFERENCES comunicacao(id),
    FOREIGN KEY (usuario_id) REFERENCES usuario(id),
    FOREIGN KEY(departamento_id) REFERENCES departamento(id)
);

CREATE TABLE confirmacao_leitura(
	id INT PRIMARY KEY AUTO_INCREMENT,
    data_hora DATETIME NOT NULL,
    usuario_id INT NOT NULL,
    comunicacao_id INT NOT NULL,
    assinatura_digital VARCHAR(140) NOT NULL,
    FOREIGN KEY (usuario_id) REFERENCES usuario(id),
    FOREIGN KEY (comunicacao_id) REFERENCES comunicacao(id)
);

CREATE TABLE anexo(
	id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(140),
    tipo_arquivo VARCHAR (30),
    tamanho VARCHAR(40),
    caminho VARCHAR(50),
    comunicacao_id INT NOT NULL,
    FOREIGN KEY (comunicacao_id) REFERENCES comunicacao(id)
);

CREATE TABLE notificacoes(
	id INT PRIMARY KEY AUTO_INCREMENT,
    mensagem TEXT,
    data_hora DATETIME NOT NULL,
    usuario_id INT NOT NULL,
    comunicacao_id INT NOT NULL,
    FOREIGN KEY (usuario_id) REFERENCES usuario(id),
    FOREIGN KEY (comunicacao_id) REFERENCES comunicacao(id)
);

CREATE TABLE logs_sistema(
	id INT PRIMARY KEY AUTO_INCREMENT,
    acao_realizada VARCHAR(150),
    data_hora DATETIME NOT NULL,
    usuario_id INT NOT NULL,
    FOREIGN KEY (usuario_id) REFERENCES usuario(id),
    ip_usuario VARCHAR(45) NOT NULL
);