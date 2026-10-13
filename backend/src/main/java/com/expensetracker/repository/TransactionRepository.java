package com.expensetracker.repository;

import com.expensetracker.model.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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

    // Filtered + paginated list
    @Query("select t from Transaction t where t.user = :user " +
           "and (:category is null or t.category = :category) " +
           "and (:from is null or t.date >= :from) " +
           "and (:to is null or t.date <= :to) " +
           "and (:type is null or t.type = :type) " +
           "order by t.date desc, t.id desc")
    Page<Transaction> findFiltered(@Param("user") User user,
                                   @Param("category") String category,
                                   @Param("from") LocalDate from,
                                   @Param("to") LocalDate to,
                                   @Param("type") TransactionType type,
                                   Pageable pageable);

    // Monthly aggregation — uses JPQL extract()
    @Query("select extract(year from t.date) as year, extract(month from t.date) as month, " +
           "t.type as type, sum(t.amount) as total " +
           "from Transaction t where t.user = :user and extract(year from t.date) = :year " +
           "group by extract(year from t.date), extract(month from t.date), t.type " +
           "order by extract(month from t.date) asc")
    List<MonthlyTotal> monthlySummary(@Param("user") User user, @Param("year") int year);

    // All transactions for export (no page limit)
    List<Transaction> findByUserAndCategoryAndDateBetweenOrderByDateDescIdDesc(
        User user, String category, LocalDate start, LocalDate end);
}
