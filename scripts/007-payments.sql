-- Payments Table for Buyer-Supplier Invoice Tracking
CREATE TABLE IF NOT EXISTS payments (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  buyer_id CHAR(36) NOT NULL,
  supplier_user_id CHAR(36) NOT NULL,
  invoice_row_id CHAR(36) NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_reference VARCHAR(100),
  status ENUM('pending','paid','failed','reversed') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (supplier_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (invoice_row_id) REFERENCES ap_batch_rows(id) ON DELETE CASCADE
);

CREATE INDEX idx_payments_buyer_supplier ON payments(buyer_id, supplier_user_id, status);
CREATE INDEX idx_payments_invoice ON payments(invoice_row_id, status);
