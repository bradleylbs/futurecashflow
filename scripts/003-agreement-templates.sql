-- Agreement Templates Schema for MySQL
-- Add agreement templates table and default templates

CREATE TABLE IF NOT EXISTS agreement_templates (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    template_name VARCHAR(255) NOT NULL,
    template_type ENUM('supplier_terms', 'buyer_terms', 'facility_agreement') NOT NULL,
    version VARCHAR(50) NOT NULL,
    content_template TEXT NOT NULL,
    variables JSON DEFAULT ('{}'),
    is_active BOOLEAN DEFAULT TRUE,
    effective_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by CHAR(36) NULL,
    approved_by CHAR(36) NULL,
    approval_date TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX idx_agreement_templates_type_active ON agreement_templates(template_type, is_active);
CREATE INDEX idx_agreement_templates_version ON agreement_templates(template_type, version);

-- Insert default agreement templates
INSERT INTO agreement_templates (template_name, template_type, version, content_template) VALUES 
('Standard Supplier Terms', 'supplier_terms', '1.0', 
'SUPPLIER TERMS AND CONDITIONS

1. DEFINITIONS
This Agreement is entered into between the Company (Buyer) and the Supplier for the provision of goods and services.

2. SCOPE OF SERVICES
The Supplier agrees to provide goods and services as specified in purchase orders issued by the Company.

3. PAYMENT TERMS
- Payment terms: Net 30 days from invoice date
- All invoices must include proper documentation
- Disputes must be raised within 10 business days

4. QUALITY STANDARDS
All goods and services must meet the Company\'s quality standards and specifications.

5. COMPLIANCE
The Supplier must comply with all applicable laws, regulations, and Company policies.

6. CONFIDENTIALITY
Both parties agree to maintain confidentiality of proprietary information.

7. TERMINATION
Either party may terminate this agreement with 30 days written notice.

By signing below, you acknowledge that you have read, understood, and agree to be bound by these terms and conditions.'),

('Standard Buyer Terms', 'buyer_terms', '1.0',
'BUYER TERMS AND CONDITIONS

1. DEFINITIONS
This Agreement governs the relationship between the Buyer and the Platform for accessing supplier management services.

2. PLATFORM SERVICES
The Platform provides KYC verification, supplier onboarding, and relationship management services.

3. BUYER OBLIGATIONS
- Provide accurate company information
- Maintain current business registrations
- Comply with all applicable regulations

4. PAYMENT AND FEES
- Service fees as agreed in the facility agreement
- Payment terms: Net 15 days from invoice date

5. DATA PROTECTION
Both parties commit to protecting confidential business information.

6. LIABILITY
Platform liability is limited to the service fees paid in the preceding 12 months.

7. GOVERNING LAW
This agreement is governed by applicable financial services regulations.

By signing below, you acknowledge that you have read, understood, and agree to be bound by these terms and conditions.'),

('Standard Facility Agreement', 'facility_agreement', '1.0',
'FACILITY AGREEMENT

1. FACILITY OVERVIEW
This agreement establishes a credit facility for the Buyer to manage supplier relationships and transactions.

2. CREDIT TERMS
- Credit limit: As approved by underwriting
- Interest rate: As specified in facility schedule
- Repayment terms: Monthly payments

3. SECURITY AND COLLATERAL
Security requirements as specified in the credit application.

4. REPRESENTATIONS AND WARRANTIES
The Buyer represents that all information provided is accurate and complete.

5. COVENANTS
The Buyer agrees to maintain financial ratios and reporting requirements.

6. EVENTS OF DEFAULT
Default events include non-payment, breach of covenants, or material adverse changes.

7. REMEDIES
Upon default, the Platform may accelerate all obligations and exercise security rights.

By signing below, you acknowledge that you have read, understood, and agree to be bound by this facility agreement.');