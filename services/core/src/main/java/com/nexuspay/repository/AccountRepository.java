package com.nexuspay.repository;

import com.nexuspay.entity.Account;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface AccountRepository extends JpaRepository<Account, String> {
    Optional<Account> findByUserId(UUID userId);
}
