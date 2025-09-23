-- KYC Document Management Schema for MySQL
-- Add KYC records and document management tables

-- KYC Records table
CREATE TABLE IF NOT EXISTS kyc_records (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36),
    company_id CHAR(36),
    invitation_id CHAR(36) NULL,
    status ENUM('pending', 'under_review', 'ready_for_decision', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    submitted_at TIMESTAMP NULL,
    reviewed_at TIMESTAMP NULL,
    decided_at TIMESTAMP NULL,
    decision_notes TEXT,
    reviewer_id CHAR(36) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (invitation_id) REFERENCES supplier_invitations(id) ON DELETE SET NULL,
    FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    kyc_id CHAR(36),
    document_type ENUM('business_registration', 'mandate', 'proof_of_address', 'financial_statement', 'tax_clearance', 'bank_confirmation') NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    status ENUM('uploaded', 'pending', 'under_review', 'verified', 'rejected') NOT NULL DEFAULT 'uploaded',
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    review_date TIMESTAMP NULL,
    review_notes TEXT,
    reviewer_id CHAR(36) NULL,
    version INTEGER DEFAULT 1,
    replaced_by CHAR(36) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (kyc_id) REFERENCES kyc_records(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (replaced_by) REFERENCES documents(id) ON DELETE SET NULL
);

-- Banking details table
CREATE TABLE IF NOT EXISTS banking_details (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36),
    bank_name VARCHAR(255) NOT NULL,
    account_number VARCHAR(255) NOT NULL, -- Will be encrypted
    routing_number VARCHAR(255) NOT NULL, -- Will be encrypted
    account_holder_name VARCHAR(255) NOT NULL,
    status ENUM('pending', 'verified', 'rejected', 'resubmission_required') NOT NULL DEFAULT 'pending',
    submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verification_date TIMESTAMP NULL,
    verification_notes TEXT,
    admin_verifier_id CHAR(36) NULL,
    resubmission_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (admin_verifier_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Agreements table
CREATE TABLE IF NOT EXISTS agreements (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36),
    agreement_type ENUM('supplier_terms', 'buyer_terms', 'facility_agreement', 'cession_agreement') NOT NULL,
    agreement_version VARCHAR(50) NOT NULL,
    template_id CHAR(36) NULL,
    agreement_content TEXT NOT NULL,
    status ENUM('pending', 'presented', 'signed', 'expired', 'superseded') NOT NULL DEFAULT 'pending',
    presented_at TIMESTAMP NULL,
    signed_at TIMESTAMP NULL,
    signature_method ENUM('digital', 'electronic', 'wet_signature') NULL,
    signatory_name VARCHAR(255),
    signatory_title VARCHAR(255),
    signatory_ip_address VARCHAR(45),
    signature_data TEXT, -- Encrypted signature hash
    witness_required BOOLEAN DEFAULT FALSE,
    witness_name VARCHAR(255),
    witness_signature TEXT,
    expiry_date TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Dashboard access levels table
CREATE TABLE IF NOT EXISTS dashboard_access (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36),
    kyc_id CHAR(36),
    access_level ENUM('pre_kyc', 'kyc_approved', 'banking_submitted', 'agreement_signed', 'banking_verified') NOT NULL,
    dashboard_features JSON DEFAULT ('[]'),
    last_level_change TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    banking_submission_date TIMESTAMP NULL,
    agreement_signing_date TIMESTAMP NULL,
    banking_verification_date TIMESTAMP NULL,
    agreement_id CHAR(36) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (kyc_id) REFERENCES kyc_records(id) ON DELETE CASCADE,
    FOREIGN KEY (agreement_id) REFERENCES agreements(id) ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX idx_kyc_records_user_id ON kyc_records(user_id);
CREATE INDEX idx_kyc_records_status ON kyc_records(status);
CREATE INDEX idx_kyc_records_company_id ON kyc_records(company_id);
CREATE INDEX idx_documents_kyc_id ON documents(kyc_id);
CREATE INDEX idx_documents_type_status ON documents(document_type, status);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_banking_details_user_id ON banking_details(user_id);
CREATE INDEX idx_banking_details_status ON banking_details(status);
CREATE INDEX idx_agreements_user_id ON agreements(user_id);
CREATE INDEX idx_agreements_type_status ON agreements(agreement_type, status);
CREATE INDEX idx_dashboard_access_user_id ON dashboard_access(user_id);
CREATE INDEX idx_dashboard_access_level ON dashboard_access(access_level);