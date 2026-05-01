package com.nexuspay.transfer;

import com.nexuspay.entity.Account;
import com.nexuspay.entity.Transaction;
import com.nexuspay.entity.User;
import com.nexuspay.entity.Vpa;
import com.nexuspay.exception.NexusPayException;
import com.nexuspay.repository.AccountRepository;
import com.nexuspay.repository.TransactionRepository;
import com.nexuspay.repository.UserRepository;
import com.nexuspay.repository.VpaRepository;
import com.nexuspay.transfer.dto.TransactionResponse;
import com.nexuspay.transfer.dto.TransferRequest;
import com.nexuspay.transfer.dto.TransferResponse;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

@Service
public class TransferService {

    private final AccountRepository accountRepository;
    private final VpaRepository vpaRepository;
    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public TransferService(
            AccountRepository accountRepository,
            VpaRepository vpaRepository,
            TransactionRepository transactionRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.accountRepository = accountRepository;
        this.vpaRepository = vpaRepository;
        this.transactionRepository = transactionRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(noRollbackFor = NexusPayException.class)
    public TransferResponse transfer(UUID senderUserId, TransferRequest request) {
        try {
            return doTransfer(senderUserId, request);
        } catch (DataIntegrityViolationException e) {
            // Concurrent idempotency race: another thread inserted the transaction.
            return transactionRepository.findByTxnReference(request.txnReference())
                    .map(txn -> {
                        if (txn.getSenderUserId().equals(senderUserId) && txn.getAmount().compareTo(request.amount()) == 0) {
                            return mapToTransferResponse(txn, request.receiverVpa(), "UNKNOWN"); // In a real app we'd resolve the name again
                        }
                        throw new NexusPayException("IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD", "Transaction reference already used.");
                    })
                    .orElseThrow(() -> e);
        }
    }

    private TransferResponse doTransfer(UUID senderUserId, TransferRequest request) {
        // Idempotency Check
        Optional<Transaction> existingTxn = transactionRepository.findByTxnReference(request.txnReference());
        if (existingTxn.isPresent()) {
            Transaction txn = existingTxn.get();
            if (txn.getSenderUserId().equals(senderUserId) && txn.getAmount().compareTo(request.amount()) == 0) {
                return mapToTransferResponse(txn, request.receiverVpa(), "UNKNOWN");
            }
            throw new NexusPayException("IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD", "Transaction reference already used.");
        }

        // Resolution
        Vpa senderVpa = vpaRepository.findByUserId(senderUserId)
                .orElseThrow(() -> new NexusPayException("NO_ACCOUNT", "Sender has no VPA configured."));
        
        Vpa receiverVpa = vpaRepository.findByAddress(request.receiverVpa())
                .orElseThrow(() -> new NexusPayException("RECIPIENT_NOT_FOUND", "Receiver VPA not found."));

        if (senderVpa.getUserId().equals(receiverVpa.getUserId())) {
            throw new NexusPayException("CANNOT_PAY_SELF", "You cannot transfer to your own VPA.");
        }

        String senderAccountId = senderVpa.getAccountId();
        String receiverAccountId = receiverVpa.getAccountId();

        // Lock ordering to prevent deadlocks
        Account senderAccount;
        Account receiverAccount;

        if (senderAccountId.compareTo(receiverAccountId) < 0) {
            senderAccount = accountRepository.findByIdForUpdate(senderAccountId).orElseThrow();
            receiverAccount = accountRepository.findByIdForUpdate(receiverAccountId).orElseThrow();
        } else {
            receiverAccount = accountRepository.findByIdForUpdate(receiverAccountId).orElseThrow();
            senderAccount = accountRepository.findByIdForUpdate(senderAccountId).orElseThrow();
        }

        // Validate Sender Status
        if (!"ACTIVE".equals(senderAccount.getStatus())) {
            throw new NexusPayException("ACCOUNT_LOCKED", "Your account is locked or closed.");
        }

        // Validate PIN
        if (!passwordEncoder.matches(request.pin(), senderAccount.getPinHash())) {
            int attempts = senderAccount.getPinAttemptCount() + 1;
            senderAccount.setPinAttemptCount(attempts);
            if (attempts >= 3) {
                senderAccount.setStatus("LOCKED");
                accountRepository.save(senderAccount);
                recordFailedTransfer(request, senderAccountId, receiverAccountId, senderUserId, receiverVpa.getUserId(), "ACCOUNT_LOCKED");
                throw new NexusPayException("ACCOUNT_LOCKED", "Account locked due to 3 failed PIN attempts.");
            }
            accountRepository.save(senderAccount);
            recordFailedTransfer(request, senderAccountId, receiverAccountId, senderUserId, receiverVpa.getUserId(), "INVALID_PIN");
            throw new NexusPayException("INVALID_PIN", "Invalid PIN. Attempts remaining: " + (3 - attempts));
        }

        // Reset PIN attempts on success
        senderAccount.setPinAttemptCount(0);

        // Validate Balance
        if (senderAccount.getBalance().compareTo(request.amount()) < 0) {
            recordFailedTransfer(request, senderAccountId, receiverAccountId, senderUserId, receiverVpa.getUserId(), "INSUFFICIENT_FUNDS");
            throw new NexusPayException("INSUFFICIENT_FUNDS", "Insufficient balance.");
        }

        // Validate Receiver Status
        if (!"ACTIVE".equals(receiverAccount.getStatus())) {
            recordFailedTransfer(request, senderAccountId, receiverAccountId, senderUserId, receiverVpa.getUserId(), "RECIPIENT_ACCOUNT_LOCKED");
            throw new NexusPayException("UNPROCESSABLE_ENTITY", "Recipient account is not active.");
        }

        // Debit and Credit
        senderAccount.setBalance(senderAccount.getBalance().subtract(request.amount()).setScale(2, java.math.RoundingMode.UNNECESSARY));
        receiverAccount.setBalance(receiverAccount.getBalance().add(request.amount()).setScale(2, java.math.RoundingMode.UNNECESSARY));
        
        accountRepository.save(senderAccount);
        accountRepository.save(receiverAccount);

        // Record Transaction
        Transaction transaction = new Transaction();
        transaction.setTxnReference(request.txnReference());
        transaction.setSenderAccountId(senderAccountId);
        transaction.setReceiverAccountId(receiverAccountId);
        transaction.setSenderUserId(senderUserId);
        transaction.setReceiverUserId(receiverVpa.getUserId());
        transaction.setAmount(request.amount());
        transaction.setStatus("SUCCESS");
        // correlationId is required, we pull it from MDC context or generate it
        String correlationStr = org.slf4j.MDC.get("correlationId");
        transaction.setCorrelationId(correlationStr != null ? UUID.fromString(correlationStr) : UUID.randomUUID());
        
        Transaction saved = transactionRepository.save(transaction);

        User receiverUser = userRepository.findById(receiverVpa.getUserId()).orElseThrow();
        return mapToTransferResponse(saved, request.receiverVpa(), receiverUser.getFullName());
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordFailedTransfer(TransferRequest request, String senderAccId, String recAccId, UUID senderId, UUID recId, String failCode) {
        // Prevent duplicate unique constraint if retry comes fast
        if (transactionRepository.findByTxnReference(request.txnReference()).isPresent()) return;

        Transaction transaction = new Transaction();
        transaction.setTxnReference(request.txnReference());
        transaction.setSenderAccountId(senderAccId);
        transaction.setReceiverAccountId(recAccId);
        transaction.setSenderUserId(senderId);
        transaction.setReceiverUserId(recId);
        transaction.setAmount(request.amount());
        transaction.setStatus("FAILED");
        transaction.setFailureCode(failCode);
        
        String correlationStr = org.slf4j.MDC.get("correlationId");
        transaction.setCorrelationId(correlationStr != null ? UUID.fromString(correlationStr) : UUID.randomUUID());
        
        transactionRepository.save(transaction);
    }

    @Transactional(readOnly = true)
    public TransferResponse getStatus(UUID senderUserId, String txnReference) {
        Transaction txn = transactionRepository.findByTxnReference(txnReference)
                .orElseThrow(() -> new NexusPayException("NOT_FOUND", "Transaction not found."));

        if (!txn.getSenderUserId().equals(senderUserId)) {
            throw new NexusPayException("NOT_FOUND", "Transaction not found."); // IDOR protection
        }

        return mapToTransferResponse(txn, "UNKNOWN", "UNKNOWN");
    }

    @Transactional(readOnly = true)
    public Page<TransactionResponse> listUserTransactions(UUID userId, Pageable pageable) {
        Page<Transaction> txns = transactionRepository.findByUserId(userId, pageable);
        return txns.map(t -> {
            String direction = t.getSenderUserId().equals(userId) ? "DEBIT" : "CREDIT";
            return new TransactionResponse(
                    t.getId().toString(),
                    t.getTxnReference(),
                    t.getStatus(),
                    t.getFailureCode(),
                    t.getAmount(),
                    "N/A", // In a real app we'd join VPAs
                    "N/A",
                    "N/A",
                    direction,
                    t.getCreatedAt()
            );
        });
    }

    private TransferResponse mapToTransferResponse(Transaction txn, String vpa, String name) {
        return new TransferResponse(
                txn.getId().toString(),
                txn.getTxnReference(),
                txn.getStatus(),
                txn.getFailureCode(),
                txn.getAmount(),
                vpa,
                name,
                txn.getCreatedAt()
        );
    }
}
