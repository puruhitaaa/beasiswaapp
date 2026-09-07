-- Inisialisasi Multi-Database untuk Database-per-Service (ADR-004)
CREATE DATABASE IF NOT EXISTS rbac_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS master_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS transaksi_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

GRANT ALL PRIVILEGES ON rbac_db.* TO 'user'@'%';
GRANT ALL PRIVILEGES ON master_db.* TO 'user'@'%';
GRANT ALL PRIVILEGES ON transaksi_db.* TO 'user'@'%';

FLUSH PRIVILEGES;
