ALTER TABLE psp_transactions ADD COLUMN receiver_user_id UUID NOT NULL;
ALTER TABLE psp_transactions ADD COLUMN sender_name VARCHAR(255);
ALTER TABLE psp_transactions ADD COLUMN receiver_name VARCHAR(255);

CREATE INDEX idx_psp_receiver_user ON psp_transactions(receiver_user_id);
