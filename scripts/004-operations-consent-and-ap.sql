-- Operations, Consent, AP Uploads, and Audit Schema (MySQL)

-- Vendor consent list (provided/managed via FMF)
CREATE TABLE IF NOT EXISTS vendor_consents (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  buyer_id CHAR(36) NOT NULL,
  vendor_number VARCHAR(100) NOT NULL,
  supplier_user_id CHAR(36) NULL,
  consent_status ENUM('pending','consented','revoked') NOT NULL DEFAULT 'consented',
  consented_at TIMESTAMP NULL,
  revoked_at TIMESTAMP NULL,
  source ENUM('fmf_list','manual','api') DEFAULT 'fmf_list',
  metadata JSON DEFAULT ('{}'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_buyer_vendor (buyer_id, vendor_number),
  FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (supplier_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_vendor_consents_status ON vendor_consents(buyer_id, consent_status);
CREATE INDEX idx_vendor_consents_vendor ON vendor_consents(vendor_number);

-- AP upload batches
CREATE TABLE IF NOT EXISTS ap_batches (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  buyer_id CHAR(36) NOT NULL,
  uploaded_by CHAR(36) NOT NULL,
  total_rows INT NOT NULL,
  valid_rows INT NOT NULL,
  invalid_rows INT NOT NULL,
  vendor_count INT NOT NULL,
  status ENUM('received','processed','failed') NOT NULL DEFAULT 'received',
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_ap_batches_buyer ON ap_batches(buyer_id, created_at);

-- AP batch rows (invoice lines)
CREATE TABLE IF NOT EXISTS ap_batch_rows (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  batch_id CHAR(36) NOT NULL,
  buyer_id CHAR(36) NOT NULL,
  vendor_number VARCHAR(100) NOT NULL,
  invoice_number VARCHAR(100) NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  due_date DATE NOT NULL,
  status ENUM('accepted','rejected') NOT NULL,
  validation_error TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (batch_id) REFERENCES ap_batches(id) ON DELETE CASCADE,
  FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_ap_rows_batch (batch_id),
  INDEX idx_ap_rows_vendor (buyer_id, vendor_number),
  INDEX idx_ap_rows_invoice (buyer_id, invoice_number)
);

-- Audit events for compliance
CREATE TABLE IF NOT EXISTS audit_events (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  actor_user_id CHAR(36) NULL,
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(100) NOT NULL,
  target_id CHAR(36) NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(255) NULL,
  metadata JSON DEFAULT ('{}'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_audit_action (action, created_at),
  INDEX idx_audit_target (target_type, target_id)
);
