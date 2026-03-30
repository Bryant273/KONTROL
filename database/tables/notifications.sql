-- Notifications
CREATE TABLE notifications (
    id VARCHAR(128) PRIMARY KEY,
    companyId VARCHAR(128) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('info', 'success', 'warning', 'error') DEFAULT 'info',
    `read` BOOLEAN DEFAULT FALSE,
    timestamp BIGINT NOT NULL
);
