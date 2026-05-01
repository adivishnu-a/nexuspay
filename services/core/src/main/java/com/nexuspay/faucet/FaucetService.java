package com.nexuspay.faucet;

import com.nexuspay.account.AccountService;
import com.nexuspay.account.dto.AccountResponse;
import com.nexuspay.entity.Account;
import com.nexuspay.entity.BankTransaction;
import com.nexuspay.repository.AccountRepository;
import com.nexuspay.repository.BankTransactionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

@Service
public class FaucetService {

    private final AccountService accountService;
    private final AccountRepository accountRepository;
    private final BankTransactionRepository bankTransactionRepository;

    public FaucetService(AccountService accountService, AccountRepository accountRepository, BankTransactionRepository bankTransactionRepository) {
        this.accountService = accountService;
        this.accountRepository = accountRepository;
        this.bankTransactionRepository = bankTransactionRepository;
    }

    @Transactional
    public AccountResponse deposit(UUID userId, String accountId, BigDecimal amount) {
        Account account = accountService.getAccountAndVerifyOwnership(userId, accountId);
        
        // Single row update
        account.setBalance(account.getBalance().add(amount).setScale(2, java.math.RoundingMode.UNNECESSARY));
        Account saved = accountRepository.save(account);

        // Record Bank Transaction
        BankTransaction transaction = new BankTransaction();
        transaction.setAccountId(accountId);
        transaction.setAmount(amount);
        transaction.setDirection("CREDIT");
        transaction.setTxnType("CASH_DEPOSIT");
        transaction.setTxnReference("FCT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        transaction.setCounterpartyName("NexusPay Faucet");
        transaction.setBalanceAfter(saved.getBalance());
        
        bankTransactionRepository.save(transaction);

        return new AccountResponse(
                saved.getId(),
                saved.getIfsc(),
                saved.getBalance(),
                saved.getStatus(),
                saved.getPinHash() != null
        );
    }
}
