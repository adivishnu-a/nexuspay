package com.nexuspay.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "psp_transactions")
public class PspTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "txn_reference", nullable = false, unique = true)
    private String txnReference;

    @Column(name = "sender_user_id", nullable = false)
    private UUID senderUserId;

    @Column(name = "receiver_user_id", nullable = false)
    private UUID receiverUserId;

    @Column(name = "sender_vpa", nullable = false)
    private String senderVpa;

    @Column(name = "sender_name")
    private String senderName;

    @Column(name = "receiver_vpa", nullable = false)
    private String receiverVpa;

    @Column(name = "receiver_name")
    private String receiverName;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false)
    private String status;

    @Column(name = "failure_code")
    private String failureCode;

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
    public UUID getSenderUserId() { return senderUserId; }
    public void setSenderUserId(UUID senderUserId) { this.senderUserId = senderUserId; }
    public UUID getReceiverUserId() { return receiverUserId; }
    public void setReceiverUserId(UUID receiverUserId) { this.receiverUserId = receiverUserId; }
    public String getSenderVpa() { return senderVpa; }
    public void setSenderVpa(String senderVpa) { this.senderVpa = senderVpa; }
    public String getSenderName() { return senderName; }
    public void setSenderName(String senderName) { this.senderName = senderName; }
    public String getReceiverVpa() { return receiverVpa; }
    public void setReceiverVpa(String receiverVpa) { this.receiverVpa = receiverVpa; }
    public String getReceiverName() { return receiverName; }
    public void setReceiverName(String receiverName) { this.receiverName = receiverName; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getFailureCode() { return failureCode; }
    public void setFailureCode(String failureCode) { this.failureCode = failureCode; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
