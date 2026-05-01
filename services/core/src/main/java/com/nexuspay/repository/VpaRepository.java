package com.nexuspay.repository;

import com.nexuspay.entity.Vpa;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface VpaRepository extends JpaRepository<Vpa, UUID> {
    Optional<Vpa> findByUserId(UUID userId);
    Optional<Vpa> findByAddress(String address);
}
