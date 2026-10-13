package com.expensetracker.repository;

import com.expensetracker.model.SavingsGoal;
import com.expensetracker.model.User;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SavingsGoalRepository extends JpaRepository<SavingsGoal, Long> {
    List<SavingsGoal> findByUserOrderByIdDesc(User user);
    Optional<SavingsGoal> findByIdAndUser(Long id, User user);
}
