package com.expensetracker.dto;

import com.expensetracker.model.*;
import com.expensetracker.model.SavingsGoal;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** Request and response shapes for the JSON API. */
public final class Dto {
    private Dto() {}

    public record RegisterRequest(
            @NotBlank(message = "Enter your name") @Size(max = 80) String name,
            @NotBlank(message = "Enter your email") @Email(message = "Enter a valid email address") String email,
            @NotNull(message = "Enter a password") @Size(min = 8, max = 72, message = "Password must be 8 to 72 characters") String password) {}

    public record LoginRequest(@NotBlank(message = "Enter your email") String email,
                               @NotBlank(message = "Enter your password") String password) {}

    public record AuthResponse(String token, String name, String email) {}

    public record TransactionRequest(
            @NotNull(message = "Choose income or expense") TransactionType type,
            @NotNull(message = "Enter an amount") @Positive(message = "Amount must be greater than zero")
            @Digits(integer = 10, fraction = 2, message = "Use at most 2 decimal places") BigDecimal amount,
            @NotBlank(message = "Choose a category") @Size(max = 50) String category,
            @NotNull(message = "Pick a date") LocalDate date,
            @Size(max = 255) String description) {}

    public record TransactionResponse(Long id, TransactionType type, BigDecimal amount, String category,
                                      LocalDate date, String description) {
        public static TransactionResponse of(Transaction t) {
            return new TransactionResponse(t.getId(), t.getType(), t.getAmount(), t.getCategory(), t.getDate(), t.getDescription());
        }
    }

    // Paginated response for GET /api/transactions
    public record TransactionPage(
            List<TransactionResponse> content,
            int page, int size, long totalElements, int totalPages) {}

    // Monthly income/expense summary row
    public record MonthlySummary(int year, int month, BigDecimal income, BigDecimal expenses) {}

    // Savings goals
    public record SavingsGoalRequest(
            @NotBlank(message = "Enter a goal name") @Size(max = 100) String name,
            @NotNull(message = "Enter a target amount") @Positive(message = "Target must be greater than zero")
            @Digits(integer = 10, fraction = 2, message = "Use at most 2 decimal places") BigDecimal targetAmount,
            LocalDate targetDate,
            @Size(max = 500) String notes) {}

    public record SavingsGoalResponse(
            Long id, String name, BigDecimal targetAmount, BigDecimal savedAmount,
            LocalDate targetDate, String notes, int percent, boolean achieved) {}

    public record DepositRequest(
            @NotNull(message = "Enter an amount") @Positive(message = "Amount must be greater than zero")
            @Digits(integer = 10, fraction = 2, message = "Use at most 2 decimal places") BigDecimal amount) {}

    public record BudgetRequest(
            @NotBlank(message = "Choose a category") @Size(max = 50) String category,
            @NotNull(message = "Enter a limit") @Positive(message = "Limit must be greater than zero")
            @Digits(integer = 10, fraction = 2, message = "Use at most 2 decimal places") BigDecimal limitAmount,
            @NotNull(message = "Pick a start date") LocalDate startDate,
            @NotNull(message = "Pick an end date") LocalDate endDate) {}

    public record BudgetResponse(Long id, String category, BigDecimal limitAmount, LocalDate startDate,
                                 LocalDate endDate, BigDecimal spent, BigDecimal remaining, int percent,
                                 boolean exceeded) {}

    public record CategorySpend(String category, BigDecimal total, int percent) {}

    public record DashboardResponse(BigDecimal income, BigDecimal expenses, BigDecimal balance,
                                    List<CategorySpend> spending, List<TransactionResponse> recent) {}
}
