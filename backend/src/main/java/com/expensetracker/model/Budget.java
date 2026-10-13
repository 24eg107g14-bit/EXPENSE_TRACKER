package com.expensetracker.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;

@Entity
@Table(name = "budgets")
public class Budget {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "user_id")
    private User user;

    @NotBlank(message = "Choose a category") @Size(max = 50) @Column(nullable = false, length = 50)
    private String category;

    @NotNull(message = "Enter a limit") @Positive(message = "Limit must be greater than zero")
    @Digits(integer = 10, fraction = 2, message = "Use at most 2 decimal places")
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal limitAmount;

    @NotNull(message = "Pick a start date") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    @Column(nullable = false) private LocalDate startDate;

    @NotNull(message = "Pick an end date") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    @Column(nullable = false) private LocalDate endDate;

    public Long getId() { return id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public BigDecimal getLimitAmount() { return limitAmount; }
    public void setLimitAmount(BigDecimal limitAmount) { this.limitAmount = limitAmount; }
    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }
    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }
}
