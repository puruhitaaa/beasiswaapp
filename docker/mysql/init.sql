-- Inisialisasi Multi-Database untuk Database-per-Service (ADR-004)
CREATE DATABASE IF NOT EXISTS rbac_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS master_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS transaksi_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Dedicated Per-Service Database Users for Strict Privilege Isolation
CREATE USER IF NOT EXISTS 'rbac_user'@'%' IDENTIFIED BY 'password';
CREATE USER IF NOT EXISTS 'master_user'@'%' IDENTIFIED BY 'password';
CREATE USER IF NOT EXISTS 'transaksi_user'@'%' IDENTIFIED BY 'password';

-- Grant isolated permissions (each service can only query its dedicated database)
GRANT ALL PRIVILEGES ON rbac_db.* TO 'rbac_user'@'%';
GRANT ALL PRIVILEGES ON master_db.* TO 'master_user'@'%';
GRANT ALL PRIVILEGES ON transaksi_db.* TO 'transaksi_user'@'%';

-- Fallback user for root dev operations / unified migrations
GRANT ALL PRIVILEGES ON rbac_db.* TO 'user'@'%';
GRANT ALL PRIVILEGES ON master_db.* TO 'user'@'%';
GRANT ALL PRIVILEGES ON transaksi_db.* TO 'user'@'%';

FLUSH PRIVILEGES;
