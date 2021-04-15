-- phpMyAdmin SQL Dump
-- version 5.0.4deb2~bpo10+1
-- https://www.phpmyadmin.net/
--
-- Server version: 10.3.27-MariaDB-0+deb10u1
-- PHP Version: 7.4.16

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

-- This file is meant for database setup on a local development server.

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `wiki_ww`
--
CREATE DATABASE IF NOT EXISTS `wiki_ww` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `wiki_ww`;

-- --------------------------------------------------------

--
-- Table structure for table `accounts`
--

CREATE TABLE `accounts` (
  `acc_id` bigint(20) UNSIGNED NOT NULL,
  `acc_access` varchar(1536) NOT NULL,
  `acc_refresh` varchar(1536) NOT NULL,
  `acc_token_expiry` datetime NOT NULL,
  `acc_token_registry` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `pages`
--

CREATE TABLE `pages` (
  `pge_id` bigint(20) UNSIGNED NOT NULL,
  `pge_watchlist` bigint(20) UNSIGNED NOT NULL,
  `pge_namespace` int(11) NOT NULL,
  `pge_page` varbinary(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `routes`
--

CREATE TABLE `routes` (
  `rte_id` bigint(20) UNSIGNED NOT NULL,
  `rte_wiki` varchar(16) NOT NULL,
  `rte_type` tinyint(4) UNSIGNED NOT NULL,
  `rte_webhook` bigint(20) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `sessions`
--

CREATE TABLE `sessions` (
  `ses_id` char(64) NOT NULL,
  `ses_account` bigint(20) UNSIGNED NOT NULL,
  `ses_expiry` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `watchlists`
--

CREATE TABLE `watchlists` (
  `wtl_id` bigint(20) UNSIGNED NOT NULL,
  `wtl_account` bigint(20) UNSIGNED NOT NULL,
  `wtl_wiki` varchar(16) NOT NULL,
  `wtl_interval` int(11) NOT NULL,
  `wtl_update` datetime NOT NULL,
  `wtl_update_manual` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `webhooks`
--

CREATE TABLE `webhooks` (
  `whk_id` bigint(20) UNSIGNED NOT NULL,
  `whk_account` bigint(20) UNSIGNED NOT NULL,
  `whk_url` varchar(2048) NOT NULL,
  `whk_format` text CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `accounts`
--
ALTER TABLE `accounts`
  ADD PRIMARY KEY (`acc_id`);

--
-- Indexes for table `pages`
--
ALTER TABLE `pages`
  ADD PRIMARY KEY (`pge_id`),
  ADD KEY `pge_watchlist` (`pge_watchlist`);

--
-- Indexes for table `routes`
--
ALTER TABLE `routes`
  ADD PRIMARY KEY (`rte_id`),
  ADD KEY `rte_webhook` (`rte_webhook`);

--
-- Indexes for table `sessions`
--
ALTER TABLE `sessions`
  ADD PRIMARY KEY (`ses_id`),
  ADD KEY `ses_account` (`ses_account`);

--
-- Indexes for table `watchlists`
--
ALTER TABLE `watchlists`
  ADD PRIMARY KEY (`wtl_id`),
  ADD KEY `wtl_account` (`wtl_account`);

--
-- Indexes for table `webhooks`
--
ALTER TABLE `webhooks`
  ADD PRIMARY KEY (`whk_id`),
  ADD KEY `whk_account` (`whk_account`);

--
-- Constraints for dumped tables
--

--
-- Constraints for table `pages`
--
ALTER TABLE `pages`
  ADD CONSTRAINT `pge_watchlist` FOREIGN KEY (`pge_watchlist`) REFERENCES `watchlists` (`wtl_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `routes`
--
ALTER TABLE `routes`
  ADD CONSTRAINT `rte_webhook` FOREIGN KEY (`rte_webhook`) REFERENCES `webhooks` (`whk_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `sessions`
--
ALTER TABLE `sessions`
  ADD CONSTRAINT `ses_account` FOREIGN KEY (`ses_account`) REFERENCES `accounts` (`acc_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `watchlists`
--
ALTER TABLE `watchlists`
  ADD CONSTRAINT `wtl_account` FOREIGN KEY (`wtl_account`) REFERENCES `accounts` (`acc_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `webhooks`
--
ALTER TABLE `webhooks`
  ADD CONSTRAINT `whk_account` FOREIGN KEY (`whk_account`) REFERENCES `accounts` (`acc_id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
