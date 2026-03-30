-- Transactions (Sales and Purchases)
CREATE TABLE transactions (
    id VARCHAR(128) PRIMARY KEY,
    reference VARCHAR(100) NOT NULL,
    date BIGINT NOT NULL,
    type ENUM('VENTE', 'ACHAT') NOT NULL,
    tiersId VARCHAR(128) NOT NULL,
    tiersNom VARCHAR(255),
    montantTotal DECIMAL(15, 2) NOT NULL,
    statut ENUM('PAYE', 'ATTENTE', 'ANNULE') DEFAULT 'ATTENTE',
    modePaiement VARCHAR(50),
    ownerId VARCHAR(128) NOT NULL,
    createdAt BIGINT NOT NULL,
    FOREIGN KEY (tiersId) REFERENCES tiers(id),
    FOREIGN KEY (ownerId) REFERENCES users(companyId)
);

-- Transaction Items
CREATE TABLE transaction_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transactionId VARCHAR(128) NOT NULL,
    produitId VARCHAR(128) NOT NULL,
    quantite INT NOT NULL,
    prixUnitaire DECIMAL(15, 2) NOT NULL,
    FOREIGN KEY (transactionId) REFERENCES transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (produitId) REFERENCES produits(id)
);
