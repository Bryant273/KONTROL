-- Stock Movements
CREATE TABLE stock_movements (
    id VARCHAR(128) PRIMARY KEY,
    produitId VARCHAR(128) NOT NULL,
    type ENUM('ENTREE', 'SORTIE') NOT NULL,
    quantite INT NOT NULL,
    source ENUM('INITIAL', 'TRANSACTION', 'MANUEL', 'VENTE', 'ACHAT') NOT NULL,
    date BIGINT NOT NULL,
    ownerId VARCHAR(128) NOT NULL,
    FOREIGN KEY (produitId) REFERENCES produits(id),
    FOREIGN KEY (ownerId) REFERENCES users(companyId)
);
