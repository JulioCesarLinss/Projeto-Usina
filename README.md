<div align="center">

# Universidade Católica de Pernambuco (UNICAP)



## Projeto Sistema de Comunicação Interna — C.I Digital

---

</div>

---

## ℹ️ Sobre o Projeto

A aplicação simula o fluxo de **C.I (Comunicação Interna)** entre setores, permitindo o envio, controle e acompanhamento de documentos, garantindo **organização, rastreabilidade e segurança das informações**.

---

## 🎯 Objetivo

O projeto tem como objetivo:

- Garantir controle e rastreabilidade das comunicações (C.I) 
- Garantir que as informações sejam registradas e acompanhadas de forma confiável
- Apoiar a organização e transparência dos processos internos da usina  
---

## ⚙️ Principais Funcionalidades

- Envio e gerenciamento de comunicações internas (C.I)  
- Controle de leitura por usuários  
- Upload e download de documentos  
- Registro de histórico e auditoria  
- Organização por departamentos e filtros  
- Sistema de notificações e lembretes  

---

## 🏭 Contexto de Aplicação

O sistema foi pensado para  a **Usina Trapiche**, localizada em Recife(PE), onde há grande volume de informações sendo compartilhadas entre setores.  

A proposta é centralizar essas comunicações, reduzindo falhas, atrasos e falta de rastreabilidade nos processos internos.

---


## 📊 Estrutura do Sistema

O sistema é composto por:

- **Módulo de Usuários** (autenticação e controle de acesso)  
- **Módulo de Comunicações (C.I)**  
- **Módulo de Documentos**  
- **Módulo de Notificações**  
- **Módulo de Auditoria e Histórico**  

---

---

## Atualização — segurança, usinas, histórico e aprovação do gerente

**Para bancos já existentes, rode em ordem:** `database/migracao_01_usina.sql`, `migracao_02_indices.sql` e `migracao_03_aprovacao.sql` (instalações novas usam apenas `schema.sql` + `dados.sql`).

- **Administrador não lê conteúdo.** Título, descrição, anexos e comentários de C.I. só são acessíveis ao autor, aos destinatários e a gerente/supervisor do setor envolvido. O admin consulta `GET /api/historico` (somente metadados, paginação por cursor, últimos 30 dias por padrão).
- **Usuário inativo perde o acesso na hora** (o token é validado contra o banco a cada requisição).
- **Anexos** (`/uploads/<arquivo>`) exigem login e permissão de leitura da C.I.; só as fotos de perfil continuam públicas.
- **Usinas:** tabela `usina` e `usina_id` em usuários e departamentos; o login devolve a usina e o front destaca a logo dela.
- **Aprovação do gerente:** ao enviar "em nome de" um gerente, a C.I. fica em `aguardando_aprovacao` e só chega aos destinatários após `POST /:id/aprovar`. O gerente pode `POST /:id/solicitar-ajustes` (texto obrigatório); o autor edita, o texto anterior é guardado em `comunicacao_versao` e reenvia. Comentários entre autor e gerente: `/:id/comentarios`.
