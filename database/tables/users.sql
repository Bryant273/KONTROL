-- Users and Enterprises
CREATE TABLE users (
    uid VARCHAR(128) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    displayName VARCHAR(255),
    password VARCHAR(255), -- Stored for custom auth
    role ENUM('ADMINISTRATEUR_ERP', 'GESTIONNAIRE_ERP', 'ADMINISTRATEUR_ENTREPRISE', 'GESTIONNAIRE_ENTREPRISE') NOT NULL,
    companyId VARCHAR(128),
    companyName VARCHAR(255),
    companyLogo TEXT, -- Base64 encoded
    isProfileComplete BOOLEAN DEFAULT FALSE,
    active BOOLEAN DEFAULT TRUE,
    createdAt BIGINT NOT NULL
);
