-- Tiers (Clients and Suppliers)
CREATE TABLE tiers (
    id VARCHAR(128) PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    telephone VARCHAR(50),
    type ENUM('CLIENT', 'FOURNISSEUR') NOT NULL,
    adresse TEXT,
    statut ENUM('ACTIF', 'INACTIF') DEFAULT 'ACTIF',
    ownerId VARCHAR(128) NOT NULL, -- companyId
    createdAt BIGINT NOT NULL,
    FOREIGN KEY (ownerId) REFERENCES users(companyId)
);
