package com.expensetracker.repository;

import com.expensetracker.model.*;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BudgetRepository extends JpaRepository<Budget, Long> {
    List<Budget> findByUserOrderByStartDateDescIdDesc(User user);
    Optional<Budget> findByIdAndUser(Long id, User user);
}
