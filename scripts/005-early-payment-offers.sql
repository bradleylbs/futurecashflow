-- 005-early-payment-offers.sql (MySQL)
-- Adds a table to track supplier early payment offers decisions

CREATE TABLE IF NOT EXISTS early_payment_offers (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  invoice_row_id CHAR(36) NOT NULL,
  buyer_id CHAR(36) NOT NULL,
  supplier_user_id CHAR(36) NOT NULL,
  vendor_number VARCHAR(128) NOT NULL,
  invoice_number VARCHAR(256) NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  due_date DATE NOT NULL,
  fee_percent DECIMAL(5,2) NOT NULL,
  fee_amount DECIMAL(18,2) NOT NULL,
  offered_amount DECIMAL(18,2) NOT NULL,
  status ENUM('offered', 'accepted', 'declined', 'expired') NOT NULL DEFAULT 'offered',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  accepted_at TIMESTAMP NULL,
  declined_at TIMESTAMP NULL,
  UNIQUE KEY uq_offer_invoice_supplier (invoice_row_id, supplier_user_id),
  KEY idx_supplier_status (supplier_user_id, status),
  KEY idx_buyer (buyer_id),
  FOREIGN KEY (invoice_row_id) REFERENCES ap_batch_rows(id) ON DELETE CASCADE,
  FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (supplier_user_id) REFERENCES users(id) ON DELETE CASCADE
);
