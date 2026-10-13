package com.expensetracker.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;

@Entity
@Table(name = "transactions", indexes = @Index(name = "idx_tx_user_date", columnList = "user_id, txn_date"))
public class Transaction {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "user_id")
    private User user;

    @NotNull @Enumerated(EnumType.STRING) @Column(nullable = false, length = 10)
    private TransactionType type = TransactionType.EXPENSE;

    @NotNull(message = "Enter an amount") @Positive(message = "Amount must be greater than zero")
    @Digits(integer = 10, fraction = 2, message = "Use at most 2 decimal places")
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @NotBlank(message = "Choose a category") @Size(max = 50) @Column(nullable = false, length = 50)
    private String category;

    @NotNull(message = "Pick a date") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    @Column(name = "txn_date", nullable = false)
    private LocalDate date = LocalDate.now();

    @Size(max = 255) private String description;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public TransactionType getType() { return type; }
    public void setType(TransactionType type) { this.type = type; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}
