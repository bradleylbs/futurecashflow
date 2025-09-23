-- Agreements buyer context (MySQL)
-- Adds buyer linkage to agreements so supplier signing can be tied to the inviting buyer.

ALTER TABLE agreements
  ADD COLUMN counterparty_user_id CHAR(36) NULL AFTER user_id,
  ADD COLUMN buyer_supplier_link_id CHAR(36) NULL AFTER counterparty_user_id;

-- Optional: store which buyer this supplier agreement relates to
-- For supplier agreements, user_id = supplier, counterparty_user_id = buyer
-- For buyer agreements, user_id = buyer, counterparty_user_id = supplier (usually NULL)

ALTER TABLE agreements
  ADD CONSTRAINT fk_agreements_counterparty_user
    FOREIGN KEY (counterparty_user_id) REFERENCES users(id) ON DELETE SET NULL;

-- If relationship table exists, link to it
ALTER TABLE agreements
  ADD CONSTRAINT fk_agreements_bsl
    FOREIGN KEY (buyer_supplier_link_id) REFERENCES buyer_supplier_links(id) ON DELETE SET NULL;

CREATE INDEX idx_agreements_counterparty ON agreements(counterparty_user_id);
CREATE INDEX idx_agreements_bsl ON agreements(buyer_supplier_link_id);
