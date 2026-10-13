package com.expensetracker.service;

import com.expensetracker.dto.Dto;
import com.expensetracker.model.*;
import com.expensetracker.repository.*;
import com.expensetracker.repository.MonthlyTotal;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
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

    public Dto.TransactionPage listFiltered(User u, String category, LocalDate from, LocalDate to,
                                            TransactionType type, int page, int size) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 100));
        Page<Transaction> p = repo.findFiltered(u, category, from, to, type, pageable);
        return new Dto.TransactionPage(
                p.getContent().stream().map(Dto.TransactionResponse::of).toList(),
                p.getNumber(), p.getSize(), p.getTotalElements(), p.getTotalPages());
    }

    public List<Dto.MonthlySummary> monthlySummary(User u, int year) {
        List<MonthlyTotal> rows = repo.monthlySummary(u, year);
        // group by month, merge INCOME and EXPENSE rows
        java.util.Map<Integer, BigDecimal[]> map = new java.util.TreeMap<>();
        for (MonthlyTotal r : rows) {
            map.computeIfAbsent(r.getMonth(), k -> new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO});
            BigDecimal[] arr = map.get(r.getMonth());
            if (r.getType() == TransactionType.INCOME) arr[0] = r.getTotal();
            else arr[1] = r.getTotal();
        }
        return map.entrySet().stream()
                .map(e -> new Dto.MonthlySummary(year, e.getKey(), e.getValue()[0], e.getValue()[1]))
                .toList();
    }

    public byte[] exportCsv(User u, String category, LocalDate from, LocalDate to) {
        List<Transaction> rows;
        if (category != null && from != null && to != null) {
            rows = repo.findByUserAndCategoryAndDateBetweenOrderByDateDescIdDesc(u, category, from, to);
        } else {
            rows = repo.findByUserOrderByDateDescIdDesc(u);
        }
        try {
            java.io.StringWriter sw = new java.io.StringWriter();
            try (org.apache.commons.csv.CSVPrinter p = new org.apache.commons.csv.CSVPrinter(
                    sw, org.apache.commons.csv.CSVFormat.DEFAULT
                            .builder().setHeader("ID","Date","Type","Category","Amount","Description").build())) {
                for (Transaction t : rows) {
                    p.printRecord(t.getId(), t.getDate(), t.getType(), t.getCategory(),
                            t.getAmount(), t.getDescription() == null ? "" : t.getDescription());
                }
            }
            return sw.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
        } catch (java.io.IOException e) {
            throw new RuntimeException("CSV generation failed", e);
        }
    }

    static BigDecimal nz(BigDecimal v) { return v == null ? BigDecimal.ZERO : v; }
}
