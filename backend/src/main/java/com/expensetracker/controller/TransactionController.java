package com.expensetracker.controller;

import com.expensetracker.dto.Dto;
import com.expensetracker.model.Transaction;
import com.expensetracker.model.TransactionType;
import com.expensetracker.model.User;
import com.expensetracker.service.*;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {
    private final UserService users;
    private final TransactionService service;

    public TransactionController(UserService users, TransactionService service) {
        this.users = users;
        this.service = service;
    }

    @GetMapping
    Object list(@RequestParam(required = false) String category,
                @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                @RequestParam(required = false) String type,
                @RequestParam(defaultValue = "0") int page,
                @RequestParam(defaultValue = "50") int size,
                Authentication auth) {
        User u = users.byEmail(auth.getName());
        TransactionType txType = null;
        if (type != null && !type.isBlank()) {
            try { txType = TransactionType.valueOf(type.toUpperCase()); }
            catch (IllegalArgumentException ignored) {}
        }
        // If no filters and no pagination beyond defaults, return plain list for backward compat
        boolean hasFilter = category != null || from != null || to != null || txType != null || page > 0 || size != 50;
        if (!hasFilter) {
            return service.list(u).stream().map(Dto.TransactionResponse::of).toList();
        }
        return service.listFiltered(u, category, from, to, txType, page, size);
    }

    @GetMapping("/summary")
    List<Dto.MonthlySummary> summary(
            @RequestParam(defaultValue = "#{T(java.time.LocalDate).now().getYear()}") int year,
            Authentication auth) {
        return service.monthlySummary(users.byEmail(auth.getName()), year);
    }

    @GetMapping(value = "/export", produces = "text/csv")
    ResponseEntity<byte[]> export(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            Authentication auth) {
        byte[] csv = service.exportCsv(users.byEmail(auth.getName()), category, from, to);
        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=transactions.csv")
                .header("Content-Type", "text/csv; charset=UTF-8")
                .body(csv);
    }

    @GetMapping("/{id}")
    Dto.TransactionResponse one(@PathVariable Long id, Authentication auth) {
        return Dto.TransactionResponse.of(service.get(id, users.byEmail(auth.getName())));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    Dto.TransactionResponse create(@Valid @RequestBody Dto.TransactionRequest r, Authentication auth) {
        return Dto.TransactionResponse.of(service.save(toEntity(r, null), users.byEmail(auth.getName())));
    }

    @PutMapping("/{id}")
    Dto.TransactionResponse update(@PathVariable Long id, @Valid @RequestBody Dto.TransactionRequest r, Authentication auth) {
        return Dto.TransactionResponse.of(service.save(toEntity(r, id), users.byEmail(auth.getName())));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@PathVariable Long id, Authentication auth) {
        service.delete(id, users.byEmail(auth.getName()));
    }

    private static Transaction toEntity(Dto.TransactionRequest r, Long id) {
        Transaction t = new Transaction();
        t.setId(id);
        t.setType(r.type());
        t.setAmount(r.amount());
        t.setCategory(r.category());
        t.setDate(r.date());
        t.setDescription(r.description());
        return t;
    }
}
