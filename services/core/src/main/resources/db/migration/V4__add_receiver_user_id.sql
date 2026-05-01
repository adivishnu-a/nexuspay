-- Since we are refactoring to a dual-ledger system and the existing data 
-- in psp_transactions is missing the required receiver_user_id, 
-- we clear the table to ensure a clean state for the new schema.
DELETE FROM psp_transactions;

ALTER TABLE psp_transactions ADD COLUMN receiver_user_id UUID NOT NULL;
ALTER TABLE psp_transactions ADD COLUMN sender_name VARCHAR(255);
ALTER TABLE psp_transactions ADD COLUMN receiver_name VARCHAR(255);

CREATE INDEX idx_psp_receiver_user ON psp_transactions(receiver_user_id);
