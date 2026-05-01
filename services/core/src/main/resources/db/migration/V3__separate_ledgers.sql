-- Separate Ledgers Migration
DROP TABLE IF EXISTS transactions;

CREATE TABLE psp_transactions (
    id UUID PRIMARY KEY,
    txn_reference VARCHAR(255) NOT NULL UNIQUE,
    sender_user_id UUID NOT NULL,
    sender_vpa VARCHAR(255) NOT NULL,
    receiver_vpa VARCHAR(255) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    status VARCHAR(50) NOT NULL,
    failure_code VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE bank_transactions (
    id UUID PRIMARY KEY,
    account_id VARCHAR(50) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    direction VARCHAR(20) NOT NULL, -- DEBIT, CREDIT
    txn_type VARCHAR(50) NOT NULL, -- CASH_DEPOSIT, TRANSFER
    txn_reference VARCHAR(255),
    counterparty_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Index for performance
CREATE INDEX idx_psp_txn_sender ON psp_transactions(sender_user_id);
CREATE INDEX idx_bank_txn_account ON bank_transactions(account_id);
