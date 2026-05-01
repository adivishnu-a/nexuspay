CREATE TABLE users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_sub   TEXT NOT NULL UNIQUE,         -- Google's stable user id ("sub" claim)
  email        TEXT NOT NULL,
  full_name    TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users (email);

CREATE TABLE accounts (
  id                  TEXT PRIMARY KEY,                       -- 'ACC-{10 digits}'
  user_id             UUID NOT NULL UNIQUE REFERENCES users(id),  -- one account per user
  ifsc                TEXT NOT NULL DEFAULT 'NXSB0000001',
  balance             NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  status              TEXT NOT NULL DEFAULT 'ACTIVE',         -- ACTIVE | LOCKED | CLOSED
  pin_hash            TEXT,                                   -- nullable until first set
  pin_attempt_count   INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_balance_non_negative CHECK (balance >= 0),
  CONSTRAINT chk_status_valid CHECK (status IN ('ACTIVE', 'LOCKED', 'CLOSED')),
  CONSTRAINT chk_pin_attempts_in_range CHECK (pin_attempt_count BETWEEN 0 AND 3)
);

CREATE TABLE vpas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address     TEXT NOT NULL UNIQUE,                          -- e.g., 'adi@nexus'
  account_id  TEXT NOT NULL UNIQUE REFERENCES accounts(id),  -- one VPA per account
  user_id     UUID NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vpas_user ON vpas (user_id);

CREATE TABLE transactions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  txn_reference        TEXT NOT NULL UNIQUE,         -- client-generated UUID (idempotency key)
  sender_account_id    TEXT NOT NULL REFERENCES accounts(id),
  receiver_account_id  TEXT NOT NULL REFERENCES accounts(id),
  sender_user_id       UUID NOT NULL REFERENCES users(id),
  receiver_user_id     UUID NOT NULL REFERENCES users(id),
  amount               NUMERIC(12, 2) NOT NULL,
  status               TEXT NOT NULL,                -- SUCCESS | FAILED
  failure_code         TEXT,                         -- nullable; populated when status=FAILED
  correlation_id       UUID NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_amount_positive CHECK (amount > 0),
  CONSTRAINT chk_status_valid CHECK (status IN ('SUCCESS', 'FAILED'))
);

CREATE INDEX idx_txn_sender_created  ON transactions (sender_user_id, created_at DESC);
CREATE INDEX idx_txn_receiver_created ON transactions (receiver_user_id, created_at DESC);

CREATE TABLE refresh_tokens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id),
  family_id    UUID NOT NULL,                       -- session family
  token_hash   TEXT NOT NULL UNIQUE,                -- SHA-256 of plaintext
  issued_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMPTZ NOT NULL,
  used_at      TIMESTAMPTZ,                         -- null until rotated
  revoked_at   TIMESTAMPTZ                          -- null until logged out / family revoked
);

CREATE INDEX idx_refresh_user ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_family ON refresh_tokens (family_id);
