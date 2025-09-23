-- Buyer-Supplier Relationship Links (MySQL)
-- Tracks a direct relationship between a buyer user and a supplier user, optionally created via an invitation

CREATE TABLE IF NOT EXISTS buyer_supplier_links (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  buyer_id CHAR(36) NOT NULL,
  supplier_user_id CHAR(36) NOT NULL,
  invitation_id CHAR(36) NULL,
  status ENUM('initiated','active','suspended','revoked') NOT NULL DEFAULT 'initiated',
  relationship_source ENUM('invitation','consent','manual','ap_upload') NOT NULL DEFAULT 'invitation',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_buyer_supplier (buyer_id, supplier_user_id),
  FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (supplier_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (invitation_id) REFERENCES supplier_invitations(id) ON DELETE SET NULL
);

CREATE INDEX idx_bsl_buyer ON buyer_supplier_links(buyer_id, status);
CREATE INDEX idx_bsl_supplier ON buyer_supplier_links(supplier_user_id, status);
