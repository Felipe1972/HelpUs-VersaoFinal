CREATE DATABASE  IF NOT EXISTS `help_us2` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `help_us2`;
-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: localhost    Database: help_us2
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `atendimento`
--

DROP TABLE IF EXISTS `atendimento`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `atendimento` (
  `id_atendimento` int NOT NULL AUTO_INCREMENT,
  `id_ocorrencia` int NOT NULL,
  `id_voluntario` int NOT NULL,
  `status` enum('aceito','recusado','finalizado','cancelado','desistiu') COLLATE utf8mb4_unicode_ci DEFAULT 'aceito',
  `aceito_em` datetime DEFAULT CURRENT_TIMESTAMP,
  `finalizado_em` datetime DEFAULT NULL,
  `recusado_em` datetime DEFAULT NULL,
  `recusa_desfeita_em` datetime DEFAULT NULL,
  `conclusao_solicitada_em` datetime DEFAULT NULL,
  `a_caminho_em` datetime DEFAULT NULL,
  `chegou_em` datetime DEFAULT NULL,
  `previsao_minutos` smallint unsigned DEFAULT NULL,
  `previsao_registrada_em` datetime DEFAULT NULL,
  PRIMARY KEY (`id_atendimento`),
  KEY `id_ocorrencia` (`id_ocorrencia`),
  KEY `id_voluntario` (`id_voluntario`),
  CONSTRAINT `atendimento_ibfk_1` FOREIGN KEY (`id_ocorrencia`) REFERENCES `ocorrencia` (`id_ocorrencia`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `atendimento_ibfk_2` FOREIGN KEY (`id_voluntario`) REFERENCES `usuario` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=172 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `avaliacao`
--

DROP TABLE IF EXISTS `avaliacao`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `avaliacao` (
  `id_avaliacao` int NOT NULL AUTO_INCREMENT,
  `id_ocorrencia` int NOT NULL,
  `id_avaliador` int NOT NULL,
  `id_avaliado` int NOT NULL,
  `nota` int NOT NULL,
  `comentario` text COLLATE utf8mb4_unicode_ci,
  `criada_em` datetime DEFAULT CURRENT_TIMESTAMP,
  `id_atendimento` int DEFAULT NULL,
  PRIMARY KEY (`id_avaliacao`),
  UNIQUE KEY `uq_avaliacao_atendimento` (`id_atendimento`),
  KEY `id_ocorrencia` (`id_ocorrencia`),
  KEY `id_avaliador` (`id_avaliador`),
  KEY `id_avaliado` (`id_avaliado`),
  CONSTRAINT `avaliacao_ibfk_1` FOREIGN KEY (`id_ocorrencia`) REFERENCES `ocorrencia` (`id_ocorrencia`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `avaliacao_ibfk_2` FOREIGN KEY (`id_avaliador`) REFERENCES `usuario` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `avaliacao_ibfk_3` FOREIGN KEY (`id_avaliado`) REFERENCES `usuario` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_avaliacao_atendimento` FOREIGN KEY (`id_atendimento`) REFERENCES `atendimento` (`id_atendimento`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `aviso_comunitario`
--

DROP TABLE IF EXISTS `aviso_comunitario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `aviso_comunitario` (
  `id_aviso` int NOT NULL AUTO_INCREMENT,
  `id_autor` int NOT NULL,
  `titulo` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descricao` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `bairro` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `ativo` tinyint(1) DEFAULT '1',
  `publicado_em` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_aviso`),
  KEY `id_autor` (`id_autor`),
  CONSTRAINT `aviso_comunitario_ibfk_1` FOREIGN KEY (`id_autor`) REFERENCES `usuario` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `consentimento_localizacao`
--

DROP TABLE IF EXISTS `consentimento_localizacao`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `consentimento_localizacao` (
  `id_consentimento` int NOT NULL AUTO_INCREMENT,
  `id_atendimento` int NOT NULL,
  `id_autor` int NOT NULL,
  `acao` enum('compartilhar','revogar') COLLATE utf8mb4_unicode_ci NOT NULL,
  `criado_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_consentimento`),
  KEY `id_autor` (`id_autor`),
  KEY `idx_consentimento_vinculo` (`id_atendimento`,`id_consentimento`),
  CONSTRAINT `consentimento_localizacao_ibfk_1` FOREIGN KEY (`id_atendimento`) REFERENCES `atendimento` (`id_atendimento`) ON DELETE CASCADE,
  CONSTRAINT `consentimento_localizacao_ibfk_2` FOREIGN KEY (`id_autor`) REFERENCES `usuario` (`id_usuario`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=129 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `contato_emergencia`
--

DROP TABLE IF EXISTS `contato_emergencia`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contato_emergencia` (
  `id_contato` int NOT NULL AUTO_INCREMENT,
  `id_usuario` int NOT NULL,
  `nome` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `telefone` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `parentesco` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `principal` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id_contato`),
  KEY `id_usuario` (`id_usuario`),
  CONSTRAINT `contato_emergencia_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `conversa`
--

DROP TABLE IF EXISTS `conversa`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `conversa` (
  `id_conversa` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `id_ocorrencia` int NOT NULL,
  `id_solicitante` int NOT NULL,
  `id_voluntario` int NOT NULL,
  `criada_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_conversa`),
  UNIQUE KEY `par` (`id_ocorrencia`,`id_solicitante`,`id_voluntario`),
  KEY `id_solicitante` (`id_solicitante`),
  KEY `id_voluntario` (`id_voluntario`),
  CONSTRAINT `conversa_ibfk_1` FOREIGN KEY (`id_ocorrencia`) REFERENCES `ocorrencia` (`id_ocorrencia`) ON DELETE CASCADE,
  CONSTRAINT `conversa_ibfk_2` FOREIGN KEY (`id_solicitante`) REFERENCES `usuario` (`id_usuario`) ON DELETE CASCADE,
  CONSTRAINT `conversa_ibfk_3` FOREIGN KEY (`id_voluntario`) REFERENCES `usuario` (`id_usuario`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `endereco`
--

DROP TABLE IF EXISTS `endereco`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `endereco` (
  `id_endereco` int NOT NULL AUTO_INCREMENT,
  `id_usuario` int NOT NULL,
  `cep` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cidade` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bairro` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rua` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `numero` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `complemento` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `estado` varchar(2) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `referencia` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sem_numero` tinyint(1) NOT NULL DEFAULT '0',
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id_endereco`),
  KEY `id_usuario` (`id_usuario`),
  CONSTRAINT `endereco_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=43 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mensagem`
--

DROP TABLE IF EXISTS `mensagem`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mensagem` (
  `id_mensagem` int NOT NULL AUTO_INCREMENT,
  `id_ocorrencia` int NOT NULL,
  `id_remetente` int NOT NULL,
  `id_destinatario` int NOT NULL,
  `texto` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `enviada_em` datetime DEFAULT CURRENT_TIMESTAMP,
  `request_id` varchar(80) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  `lida_em` datetime DEFAULT NULL,
  PRIMARY KEY (`id_mensagem`),
  UNIQUE KEY `uq_mensagem_envio` (`id_remetente`,`request_id`),
  KEY `id_ocorrencia` (`id_ocorrencia`),
  KEY `id_destinatario` (`id_destinatario`),
  CONSTRAINT `mensagem_ibfk_1` FOREIGN KEY (`id_ocorrencia`) REFERENCES `ocorrencia` (`id_ocorrencia`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `mensagem_ibfk_2` FOREIGN KEY (`id_remetente`) REFERENCES `usuario` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `mensagem_ibfk_3` FOREIGN KEY (`id_destinatario`) REFERENCES `usuario` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=58 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `notificacao_privada`
--

DROP TABLE IF EXISTS `notificacao_privada`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notificacao_privada` (
  `id_notificacao` int NOT NULL AUTO_INCREMENT,
  `id_usuario` int NOT NULL,
  `id_ocorrencia` int NOT NULL,
  `tipo` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `titulo` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `lida_em` datetime DEFAULT NULL,
  `criada_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `id_conversa` char(36) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  PRIMARY KEY (`id_notificacao`),
  KEY `id_ocorrencia` (`id_ocorrencia`),
  KEY `idx_notificacao_usuario` (`id_usuario`,`id_notificacao`),
  KEY `fk_notificacao_conversa` (`id_conversa`),
  CONSTRAINT `fk_notificacao_conversa` FOREIGN KEY (`id_conversa`) REFERENCES `conversa` (`id_conversa`) ON DELETE SET NULL,
  CONSTRAINT `notificacao_privada_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`) ON DELETE CASCADE,
  CONSTRAINT `notificacao_privada_ibfk_2` FOREIGN KEY (`id_ocorrencia`) REFERENCES `ocorrencia` (`id_ocorrencia`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5616 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ocorrencia`
--

DROP TABLE IF EXISTS `ocorrencia`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ocorrencia` (
  `id_ocorrencia` int NOT NULL AUTO_INCREMENT,
  `id_solicitante` int NOT NULL,
  `id_tipo` int NOT NULL,
  `titulo` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descricao` text COLLATE utf8mb4_unicode_ci,
  `nivel_urgencia` enum('baixa','media','alta') COLLATE utf8mb4_unicode_ci DEFAULT 'media',
  `status` enum('aberta','em_atendimento','finalizada','cancelada') COLLATE utf8mb4_unicode_ci DEFAULT 'aberta',
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `criada_em` datetime DEFAULT CURRENT_TIMESTAMP,
  `atualizada_em` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `endereco_referencia` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `descricao_publica` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `necessaria_em_utc` datetime(3) DEFAULT NULL,
  `fuso_horario` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `modalidade_horario` enum('agora','agendado') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `aguarda_reabertura` tinyint(1) NOT NULL DEFAULT '0',
  `endereco_snapshot` json DEFAULT NULL,
  PRIMARY KEY (`id_ocorrencia`),
  KEY `id_solicitante` (`id_solicitante`),
  KEY `id_tipo` (`id_tipo`),
  CONSTRAINT `ocorrencia_ibfk_1` FOREIGN KEY (`id_solicitante`) REFERENCES `usuario` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ocorrencia_ibfk_2` FOREIGN KEY (`id_tipo`) REFERENCES `tipo_ocorrencia` (`id_tipo`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=159 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tipo_ocorrencia`
--

DROP TABLE IF EXISTS `tipo_ocorrencia`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tipo_ocorrencia` (
  `id_tipo` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descricao` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id_tipo`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `usuario`
--

DROP TABLE IF EXISTS `usuario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuario` (
  `id_usuario` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `senha_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `telefone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tipo_usuario` enum('solicitante','voluntario','administrador') COLLATE utf8mb4_unicode_ci NOT NULL,
  `status_verificacao` enum('pendente','verificado','bloqueado') COLLATE utf8mb4_unicode_ci DEFAULT 'pendente',
  `criado_em` datetime DEFAULT CURRENT_TIMESTAMP,
  `eh_voluntario` tinyint(1) NOT NULL DEFAULT '0',
  `disponivel` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=128 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-18 21:44:40
