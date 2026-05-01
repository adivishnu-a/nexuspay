-- Add balance_after column to bank_transactions
ALTER TABLE bank_transactions ADD COLUMN balance_after DECIMAL(12, 2) NOT NULL DEFAULT 0.00;
