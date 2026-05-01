package com.nexuspay.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "bank_transactions")
public class BankTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "account_id", nullable = false)
    private String accountId;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false)
    private String direction; // DEBIT, CREDIT

    @Column(name = "txn_type", nullable = false)
    private String txnType; // CASH_DEPOSIT, TRANSFER

    @Column(name = "txn_reference")
    private String txnReference;

    @Column(name = "counterparty_name")
    private String counterpartyName;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
    }

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getAccountId() { return accountId; }
    public void setAccountId(String accountId) { this.accountId = accountId; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public String getDirection() { return direction; }
    public void setDirection(String direction) { this.direction = direction; }
    public String getTxnType() { return txnType; }
    public void setTxnType(String txnType) { this.txnType = txnType; }
    public String getTxnReference() { return txnReference; }
    public void setTxnReference(String txnReference) { this.txnReference = txnReference; }
    public String getCounterpartyName() { return counterpartyName; }
    public void setCounterpartyName(String counterpartyName) { this.counterpartyName = counterpartyName; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
