-- Activity Logs
CREATE TABLE actions (
    id VARCHAR(128) PRIMARY KEY,
    companyId VARCHAR(128) NOT NULL,
    userId VARCHAR(128) NOT NULL,
    userName VARCHAR(255),
    action VARCHAR(255) NOT NULL,
    details TEXT,
    timestamp BIGINT NOT NULL
);
