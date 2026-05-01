package com.nexuspay.account;

import com.nexuspay.account.dto.AccountResponse;
import com.nexuspay.account.dto.BankTransactionResponse;
import com.nexuspay.entity.Account;
import com.nexuspay.entity.BankTransaction;
import com.nexuspay.exception.NexusPayException;
import com.nexuspay.repository.AccountRepository;
import com.nexuspay.repository.BankTransactionRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.util.Set;
import java.util.UUID;

@Service
public class AccountService {

    private final AccountRepository accountRepository;
    private final BankTransactionRepository bankTransactionRepository;
    private final PasswordEncoder passwordEncoder;
    private final SecureRandom secureRandom = new SecureRandom();

    private static final Set<String> TRIVIAL_PINS = Set.of("0000", "1111", "2222", "3333", "4444", "5555", "6666", "7777", "8888", "9999", "1234");

    public AccountService(AccountRepository accountRepository, BankTransactionRepository bankTransactionRepository, PasswordEncoder passwordEncoder) {
        this.accountRepository = accountRepository;
        this.bankTransactionRepository = bankTransactionRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public AccountResponse openAccount(UUID userId) {
        if (accountRepository.findByUserId(userId).isPresent()) {
            throw new NexusPayException("ACCOUNT_ALREADY_EXISTS", "User already has an account.");
        }

        String accountId = generateAccountId();
        int retries = 0;
        while (accountRepository.findById(accountId).isPresent() && retries < 3) {
            accountId = generateAccountId();
            retries++;
        }

        Account account = new Account();
        account.setId(accountId);
        account.setUserId(userId);
        account.setIfsc("NXSB0000001");
        account.setBalance(BigDecimal.ZERO.setScale(2, java.math.RoundingMode.UNNECESSARY));
        account.setStatus("ACTIVE");
        account.setPinAttemptCount(0);
        
        Account saved = accountRepository.save(account);
        return mapToResponse(saved);
    }

    @Transactional
    public void setPin(UUID userId, String accountId, String pin) {
        Account account = getAccountAndVerifyOwnership(userId, accountId);
        validatePin(pin);

        account.setPinHash(passwordEncoder.encode(pin));
        account.setPinAttemptCount(0);
        accountRepository.save(account);
    }

    @Transactional
    public void resetPin(UUID userId, String accountId, String pin) {
        Account account = getAccountAndVerifyOwnership(userId, accountId);
        validatePin(pin);

        account.setPinHash(passwordEncoder.encode(pin));
        account.setPinAttemptCount(0);
        account.setStatus("ACTIVE");
        accountRepository.save(account);
    }

    @Transactional(readOnly = true)
    public AccountResponse findOwnAccount(UUID userId) {
        Account account = accountRepository.findByUserId(userId)
                .orElseThrow(() -> new NexusPayException("NO_ACCOUNT", "User has no account."));
        return mapToResponse(account);
    }

    @Transactional(readOnly = true)
    public Page<BankTransactionResponse> listAccountTransactions(UUID userId, String accountId, Pageable pageable) {
        getAccountAndVerifyOwnership(userId, accountId);
        Page<BankTransaction> transactions = bankTransactionRepository.findByAccountId(accountId, pageable);
        return transactions.map(this::mapToBankTransactionResponse);
    }

    private BankTransactionResponse mapToBankTransactionResponse(BankTransaction t) {
        return new BankTransactionResponse(
                t.getId(),
                t.getTxnReference(),
                t.getAmount(),
                t.getDirection(),
                t.getTxnType(),
                t.getCounterpartyName(),
                "SUCCESS", // Bank ledger only has success records usually, or we can add status
                t.getCreatedAt()
        );
    }

    public Account getAccountAndVerifyOwnership(UUID userId, String accountId) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new NexusPayException("NOT_FOUND", "Account not found"));
        if (!account.getUserId().equals(userId)) {
            throw new NexusPayException("UNAUTHORIZED", "Not authorized to access this account");
        }
        return account;
    }

    private void validatePin(String pin) {
        if (pin == null || pin.length() != 4 || !pin.matches("\\d+")) {
            throw new NexusPayException("BAD_REQUEST", "PIN must be exactly 4 digits");
        }
        if (TRIVIAL_PINS.contains(pin)) {
            throw new NexusPayException("BAD_REQUEST", "PIN is too trivial");
        }
    }

    private String generateAccountId() {
        long number = (long) (secureRandom.nextDouble() * 1_000_000_000L);
        return String.format("ACC-1%09d", number);
    }

    private AccountResponse mapToResponse(Account account) {
        return new AccountResponse(
                account.getId(),
                account.getIfsc(),
                account.getBalance(),
                account.getStatus(),
                account.getPinHash() != null
        );
    }
}
