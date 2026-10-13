package com.expensetracker.service;

import com.expensetracker.dto.Dto;
import com.expensetracker.model.*;
import com.expensetracker.repository.*;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class TransactionService {
    private final TransactionRepository repo;

    public TransactionService(TransactionRepository repo) { this.repo = repo; }

    public List<Transaction> list(User u) { return repo.findByUserOrderByDateDescIdDesc(u); }

    /** Ownership check: a user can only ever load their own records. */
    public Transaction get(Long id, User u) {
        return repo.findByIdAndUser(id, u).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Transaction not found"));
    }

    @Transactional
    public Transaction save(Transaction form, User u) {
        Transaction t = form.getId() == null ? new Transaction() : get(form.getId(), u);
        t.setUser(u);
        t.setType(form.getType());
        t.setAmount(form.getAmount());
        t.setCategory(form.getCategory());
        t.setDate(form.getDate());
        t.setDescription(form.getDescription() == null || form.getDescription().isBlank() ? null : form.getDescription().trim());
        return repo.save(t);
    }

    @Transactional
    public void delete(Long id, User u) { repo.delete(get(id, u)); }

    public Dto.DashboardResponse dashboard(User u) {
        BigDecimal income = nz(repo.total(u, TransactionType.INCOME));
        BigDecimal expenses = nz(repo.total(u, TransactionType.EXPENSE));
        List<CategoryTotal> totals = repo.totalsByCategory(u, TransactionType.EXPENSE);
        BigDecimal max = totals.isEmpty() ? BigDecimal.ONE : totals.get(0).getTotal();
        List<Dto.CategorySpend> spending = totals.stream().map(c -> new Dto.CategorySpend(c.getCategory(), c.getTotal(),
                c.getTotal().multiply(BigDecimal.valueOf(100)).divide(max, 0, RoundingMode.HALF_UP).intValue())).toList();
        List<Dto.TransactionResponse> recent = repo.findTop5ByUserOrderByDateDescIdDesc(u).stream()
                .map(Dto.TransactionResponse::of).toList();
        return new Dto.DashboardResponse(income, expenses, income.subtract(expenses), spending, recent);
    }

    static BigDecimal nz(BigDecimal v) { return v == null ? BigDecimal.ZERO : v; }
}
