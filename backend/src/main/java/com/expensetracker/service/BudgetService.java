package com.expensetracker.service;

import com.expensetracker.dto.Dto;
import com.expensetracker.model.*;
import com.expensetracker.repository.*;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class BudgetService {
    private final BudgetRepository budgets;
    private final TransactionRepository transactions;

    public BudgetService(BudgetRepository budgets, TransactionRepository transactions) {
        this.budgets = budgets;
        this.transactions = transactions;
    }

    public List<Dto.BudgetResponse> statuses(User u) {
        return budgets.findByUserOrderByStartDateDescIdDesc(u).stream().map(b -> toStatus(b, u)).toList();
    }

    public Dto.BudgetResponse save(Budget b, User u) {
        b.setUser(u);
        return toStatus(budgets.save(b), u);
    }

    public void delete(Long id, User u) {
        budgets.delete(budgets.findByIdAndUser(id, u)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Budget not found")));
    }

    private Dto.BudgetResponse toStatus(Budget b, User u) {
        BigDecimal spent = TransactionService.nz(transactions.totalInPeriod(
                u, TransactionType.EXPENSE, b.getCategory(), b.getStartDate(), b.getEndDate()));
        int pct = spent.multiply(BigDecimal.valueOf(100)).divide(b.getLimitAmount(), 0, RoundingMode.HALF_UP).intValue();
        return new Dto.BudgetResponse(b.getId(), b.getCategory(), b.getLimitAmount(), b.getStartDate(), b.getEndDate(),
                spent, b.getLimitAmount().subtract(spent), Math.min(pct, 100), spent.compareTo(b.getLimitAmount()) > 0);
    }
}
