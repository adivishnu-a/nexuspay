package com.nexuspay.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "transactions")
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "txn_reference", nullable = false, unique = true)
    private String txnReference;

    @Column(name = "sender_account_id", nullable = false)
    private String senderAccountId;

    @Column(name = "receiver_account_id", nullable = false)
    private String receiverAccountId;

    @Column(name = "sender_user_id", nullable = false)
    private UUID senderUserId;

    @Column(name = "receiver_user_id", nullable = false)
    private UUID receiverUserId;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false)
    private String status;

    @Column(name = "failure_code")
    private String failureCode;

    @Column(name = "correlation_id", nullable = false)
    private UUID correlationId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
    }

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getTxnReference() { return txnReference; }
    public void setTxnReference(String txnReference) { this.txnReference = txnReference; }
    public String getSenderAccountId() { return senderAccountId; }
    public void setSenderAccountId(String senderAccountId) { this.senderAccountId = senderAccountId; }
    public String getReceiverAccountId() { return receiverAccountId; }
    public void setReceiverAccountId(String receiverAccountId) { this.receiverAccountId = receiverAccountId; }
    public UUID getSenderUserId() { return senderUserId; }
    public void setSenderUserId(UUID senderUserId) { this.senderUserId = senderUserId; }
    public UUID getReceiverUserId() { return receiverUserId; }
    public void setReceiverUserId(UUID receiverUserId) { this.receiverUserId = receiverUserId; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getFailureCode() { return failureCode; }
    public void setFailureCode(String failureCode) { this.failureCode = failureCode; }
    public UUID getCorrelationId() { return correlationId; }
    public void setCorrelationId(UUID correlationId) { this.correlationId = correlationId; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
