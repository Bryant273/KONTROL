-- Products
CREATE TABLE produits (
    id VARCHAR(128) PRIMARY KEY,
    reference VARCHAR(100) NOT NULL,
    designation VARCHAR(255) NOT NULL,
    prixAchat DECIMAL(15, 2),
    prixVente DECIMAL(15, 2) NOT NULL,
    stock INT DEFAULT 0,
    tva DECIMAL(5, 2),
    cump DECIMAL(15, 2),
    ownerId VARCHAR(128) NOT NULL,
    createdAt BIGINT NOT NULL,
    FOREIGN KEY (ownerId) REFERENCES users(companyId)
);
