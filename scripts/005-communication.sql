-- Messaging / Communication Schema (MySQL)

-- Message threads between buyer and supplier (1:1 per relationship)
CREATE TABLE IF NOT EXISTS message_threads (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  buyer_id CHAR(36) NOT NULL,
  supplier_id CHAR(36) NOT NULL,
  subject VARCHAR(255) NULL,
  last_message_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_pair (buyer_id, supplier_id),
  FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (supplier_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_threads_last_msg ON message_threads(last_message_at);

-- Messages in a thread
CREATE TABLE IF NOT EXISTS messages (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  thread_id CHAR(36) NOT NULL,
  sender_id CHAR(36) NOT NULL,
  recipient_id CHAR(36) NOT NULL,
  body TEXT NOT NULL,
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (thread_id) REFERENCES message_threads(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_messages_thread_created (thread_id, created_at)
);
