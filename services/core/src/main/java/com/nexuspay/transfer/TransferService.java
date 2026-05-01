package com.nexuspay.transfer;

import com.nexuspay.entity.*;
import com.nexuspay.exception.NexusPayException;
import com.nexuspay.repository.*;
import com.nexuspay.transfer.dto.PspTransactionResponse;
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
    private final PspTransactionRepository pspTransactionRepository;
    private final BankTransactionRepository bankTransactionRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public TransferService(
            AccountRepository accountRepository,
            VpaRepository vpaRepository,
            PspTransactionRepository pspTransactionRepository,
            BankTransactionRepository bankTransactionRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.accountRepository = accountRepository;
        this.vpaRepository = vpaRepository;
        this.pspTransactionRepository = pspTransactionRepository;
        this.bankTransactionRepository = bankTransactionRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(noRollbackFor = NexusPayException.class)
    public TransferResponse transfer(UUID senderUserId, TransferRequest request) {
        try {
            return doTransfer(senderUserId, request);
        } catch (DataIntegrityViolationException e) {
            return pspTransactionRepository.findByTxnReference(request.txnReference())
                    .map(txn -> mapToTransferResponse(txn, txn.getReceiverVpa(), txn.getReceiverName()))
                    .orElseThrow(() -> e);
        }
    }

    private TransferResponse doTransfer(UUID senderUserId, TransferRequest request) {
        // Idempotency Check
        Optional<PspTransaction> existingTxn = pspTransactionRepository.findByTxnReference(request.txnReference());
        if (existingTxn.isPresent()) {
            PspTransaction txn = existingTxn.get();
            return mapToTransferResponse(txn, txn.getReceiverVpa(), txn.getReceiverName());
        }

        // Resolution
        Vpa senderVpa = vpaRepository.findByUserId(senderUserId)
                .orElseThrow(() -> new NexusPayException("NO_ACCOUNT", "Sender has no VPA configured."));
        
        Vpa receiverVpa = vpaRepository.findByAddress(request.receiverVpa())
                .orElseThrow(() -> new NexusPayException("RECIPIENT_NOT_FOUND", "Receiver VPA not found."));

        if (senderVpa.getUserId().equals(receiverVpa.getUserId())) {
            throw new NexusPayException("CANNOT_PAY_SELF", "You cannot transfer to your own VPA.");
        }

        // Create PSP Transaction record (PENDING)
        PspTransaction pspTxn = new PspTransaction();
        pspTxn.setTxnReference(request.txnReference());
        pspTxn.setSenderUserId(senderUserId);
        pspTxn.setReceiverUserId(receiverVpa.getUserId());
        pspTxn.setSenderVpa(senderVpa.getAddress());
        pspTxn.setSenderName(userRepository.findById(senderUserId).map(User::getFullName).orElse("Unknown"));
        pspTxn.setReceiverVpa(receiverVpa.getAddress());
        pspTxn.setReceiverName(userRepository.findById(receiverVpa.getUserId()).map(User::getFullName).orElse("Unknown"));
        pspTxn.setAmount(request.amount());
        pspTxn.setStatus("PENDING");
        pspTransactionRepository.save(pspTxn);

        // Banking Operations
        String senderAccountId = senderVpa.getAccountId();
        String receiverAccountId = receiverVpa.getAccountId();

        Account senderAccount;
        Account receiverAccount;

        if (senderAccountId.compareTo(receiverAccountId) < 0) {
            senderAccount = accountRepository.findByIdForUpdate(senderAccountId).orElseThrow();
            receiverAccount = accountRepository.findByIdForUpdate(receiverAccountId).orElseThrow();
        } else {
            receiverAccount = accountRepository.findByIdForUpdate(receiverAccountId).orElseThrow();
            senderAccount = accountRepository.findByIdForUpdate(senderAccountId).orElseThrow();
        }

        if (!"ACTIVE".equals(senderAccount.getStatus())) {
            updatePspStatus(pspTxn, "FAILED", "ACCOUNT_LOCKED");
            throw new NexusPayException("ACCOUNT_LOCKED", "Your account is locked.");
        }

        if (!passwordEncoder.matches(request.pin(), senderAccount.getPinHash())) {
            int attempts = senderAccount.getPinAttemptCount() + 1;
            senderAccount.setPinAttemptCount(attempts);
            if (attempts >= 3) {
                senderAccount.setStatus("LOCKED");
                accountRepository.save(senderAccount);
                updatePspStatus(pspTxn, "FAILED", "ACCOUNT_LOCKED");
                throw new NexusPayException("ACCOUNT_LOCKED", "Account locked.");
            }
            accountRepository.save(senderAccount);
            updatePspStatus(pspTxn, "FAILED", "INVALID_PIN");
            throw new NexusPayException("INVALID_PIN", "Invalid PIN.");
        }

        if (senderAccount.getBalance().compareTo(request.amount()) < 0) {
            updatePspStatus(pspTxn, "FAILED", "INSUFFICIENT_FUNDS");
            throw new NexusPayException("INSUFFICIENT_FUNDS", "Insufficient balance.");
        }

        if (!"ACTIVE".equals(receiverAccount.getStatus())) {
            updatePspStatus(pspTxn, "FAILED", "RECIPIENT_ACCOUNT_LOCKED");
            throw new NexusPayException("UNPROCESSABLE_ENTITY", "Recipient account inactive.");
        }

        // Execute Money Movement
        senderAccount.setBalance(senderAccount.getBalance().subtract(request.amount()));
        receiverAccount.setBalance(receiverAccount.getBalance().add(request.amount()));
        senderAccount.setPinAttemptCount(0);
        
        accountRepository.save(senderAccount);
        accountRepository.save(receiverAccount);

        // Record Bank Ledger Entries (Isolated from VPAs)
        BankTransaction debit = new BankTransaction();
        debit.setAccountId(senderAccountId);
        debit.setAmount(request.amount());
        debit.setDirection("DEBIT");
        debit.setTxnType("TRANSFER");
        debit.setTxnReference(request.txnReference());
        debit.setCounterpartyName(pspTxn.getReceiverName());
        bankTransactionRepository.save(debit);

        BankTransaction credit = new BankTransaction();
        credit.setAccountId(receiverAccountId);
        credit.setAmount(request.amount());
        credit.setDirection("CREDIT");
        credit.setTxnType("TRANSFER");
        credit.setTxnReference(request.txnReference());
        credit.setCounterpartyName(pspTxn.getSenderName());
        bankTransactionRepository.save(credit);

        // Finalize PSP Transaction
        pspTxn.setStatus("SUCCESS");
        pspTransactionRepository.save(pspTxn);

        return mapToTransferResponse(pspTxn, receiverVpa.getAddress(), pspTxn.getReceiverName());
    }

    private void updatePspStatus(PspTransaction txn, String status, String failCode) {
        txn.setStatus(status);
        txn.setFailureCode(failCode);
        pspTransactionRepository.save(txn);
    }

    @Transactional(readOnly = true)
    public TransferResponse getStatus(UUID senderUserId, String txnReference) {
        PspTransaction txn = pspTransactionRepository.findByTxnReference(txnReference)
                .orElseThrow(() -> new NexusPayException("NOT_FOUND", "Transaction not found."));

        if (!txn.getSenderUserId().equals(senderUserId) && !txn.getReceiverUserId().equals(senderUserId)) {
            throw new NexusPayException("NOT_FOUND", "Transaction not found.");
        }

        return mapToTransferResponse(txn, txn.getReceiverVpa(), txn.getReceiverName());
    }

    @Transactional(readOnly = true)
    public Page<PspTransactionResponse> listUserTransactions(UUID userId, Pageable pageable) {
        Page<PspTransaction> txns = pspTransactionRepository.findByUserHistory(userId, pageable);
        return txns.map(t -> {
            String direction = userId.equals(t.getSenderUserId()) ? "DEBIT" : "CREDIT";
            String counterpartyVpa = direction.equals("DEBIT") ? t.getReceiverVpa() : t.getSenderVpa();
            String counterpartyName = direction.equals("DEBIT") ? t.getReceiverName() : t.getSenderName();
            return new PspTransactionResponse(
                t.getId(),
                t.getTxnReference(),
                t.getAmount(),
                direction,
                counterpartyVpa,
                counterpartyName,
                t.getStatus(),
                t.getFailureCode(),
                t.getCreatedAt()
            );
        });
    }

    @Transactional(readOnly = true)
    public BigDecimal getBalance(UUID userId) {
        Account account = accountRepository.findByUserId(userId)
                .orElseThrow(() -> new NexusPayException("NO_ACCOUNT", "User has no bank account."));
        return account.getBalance();
    }

    private TransferResponse mapToTransferResponse(PspTransaction txn, String vpa, String name) {
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
