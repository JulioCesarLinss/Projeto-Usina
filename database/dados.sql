USE cidigital;

INSERT INTO usina(id,nome,logo_url) VALUES
(1,'Usina Trapiche','fotos_usinas/Trapiche.png'),
(2,'USGA','fotos_usinas/USGA.png');

INSERT INTO cargos(id,nome) VALUES
(1,'administrador_do_sistema'),
(2,'gerente_administrativo'),
(3,'supervisor'),
(4,'auxiliar_administrativo');


INSERT INTO departamento(id,nome,descricao,usina_id) VALUES
(1,'DP','departamento_pessoal',1),
(2,'GA','gerencia_administrativa',1),
(3,'SST','seguranca_do_trabalho',1),
(4,'RH','recursos_humanos',1);