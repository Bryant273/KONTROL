-- Treasury (Payments and Movements)
CREATE TABLE payments (
    id VARCHAR(128) PRIMARY KEY,
    date BIGINT NOT NULL,
    montant DECIMAL(15, 2) NOT NULL,
    type ENUM('ENCAISSEMENT', 'DECAISSEMENT') NOT NULL,
    modePaiement VARCHAR(50) NOT NULL,
    walletId VARCHAR(128), -- For unified treasury, this can be 'TOTAL'
    transactionId VARCHAR(128),
    description TEXT,
    ownerId VARCHAR(128) NOT NULL,
    createdAt BIGINT NOT NULL,
    FOREIGN KEY (ownerId) REFERENCES users(companyId)
);
