-- KYC Platform Database Schema for MySQL
-- Initial setup for authentication and user management

-- Users table with role-based access control
CREATE TABLE IF NOT EXISTS users (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('supplier', 'buyer', 'admin', 'fm_admin', 'fa_admin') NOT NULL,
    account_status ENUM('pending_verification', 'active', 'locked', 'suspended') NOT NULL DEFAULT 'pending_verification',
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    failed_login_attempts INTEGER DEFAULT 0,
    lockout_until TIMESTAMP NULL
);

-- Email OTP verification table
CREATE TABLE IF NOT EXISTS email_otp_verification (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36),
    email_address VARCHAR(255) NOT NULL,
    otp_code_hash VARCHAR(255) NOT NULL,
    purpose ENUM('registration', 'login', 'password_reset', 'email_change') NOT NULL,
    attempts_count INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    expires_at TIMESTAMP NOT NULL,
    verified_at TIMESTAMP NULL,
    email_sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    email_delivery_status ENUM('pending', 'sent', 'delivered', 'failed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36),
    company_name VARCHAR(255) NOT NULL,
    registration_number VARCHAR(100) NOT NULL,
    tax_number VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    company_type ENUM('supplier', 'buyer') NOT NULL,
    status ENUM('draft', 'submitted', 'approved', 'rejected') DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_company_reg (registration_number, company_type),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Supplier invitations table
CREATE TABLE IF NOT EXISTS supplier_invitations (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    buyer_id CHAR(36),
    invited_company_name VARCHAR(255) NOT NULL,
    invited_email VARCHAR(255) NOT NULL,
    invitation_message TEXT,
    invitation_token VARCHAR(255) UNIQUE NOT NULL,
    status ENUM('sent', 'opened', 'registered', 'completed', 'expired', 'cancelled') DEFAULT 'sent',
    expires_at TIMESTAMP NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    opened_at TIMESTAMP NULL,
    registered_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    supplier_user_id CHAR(36) NULL,
    email_delivery_status ENUM('pending', 'sent', 'delivered', 'bounced', 'failed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (supplier_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_account_status ON users(account_status);
CREATE INDEX idx_otp_email_purpose ON email_otp_verification(email_address, purpose);
CREATE INDEX idx_otp_expires_at ON email_otp_verification(expires_at);
CREATE INDEX idx_companies_user_id ON companies(user_id);
CREATE INDEX idx_companies_type_status ON companies(company_type, status);
CREATE INDEX idx_invitations_buyer_id ON supplier_invitations(buyer_id);
CREATE INDEX idx_invitations_token ON supplier_invitations(invitation_token);
CREATE INDEX idx_invitations_status ON supplier_invitations(status);