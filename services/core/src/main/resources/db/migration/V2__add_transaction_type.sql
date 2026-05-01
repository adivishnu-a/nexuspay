ALTER TABLE transactions ADD COLUMN txn_type TEXT NOT NULL DEFAULT 'TRANSFER';
ALTER TABLE transactions ALTER COLUMN sender_account_id DROP NOT NULL;
ALTER TABLE transactions ALTER COLUMN sender_user_id DROP NOT NULL;
