package com.expensetracker.repository;

import com.expensetracker.model.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    List<Transaction> findByUserOrderByDateDescIdDesc(User user);
    List<Transaction> findTop5ByUserOrderByDateDescIdDesc(User user);
    Optional<Transaction> findByIdAndUser(Long id, User user);

    @Query("select sum(t.amount) from Transaction t where t.user = :user and t.type = :type")
    BigDecimal total(@Param("user") User user, @Param("type") TransactionType type);

    @Query("select sum(t.amount) from Transaction t where t.user = :user and t.type = :type "
         + "and t.category = :category and t.date between :start and :end")
    BigDecimal totalInPeriod(@Param("user") User user, @Param("type") TransactionType type,
                             @Param("category") String category,
                             @Param("start") LocalDate start, @Param("end") LocalDate end);

    @Query("select t.category as category, sum(t.amount) as total from Transaction t "
         + "where t.user = :user and t.type = :type group by t.category order by sum(t.amount) desc")
    List<CategoryTotal> totalsByCategory(@Param("user") User user, @Param("type") TransactionType type);
}
