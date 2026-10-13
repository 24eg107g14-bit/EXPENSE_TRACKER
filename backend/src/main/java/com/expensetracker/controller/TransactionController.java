package com.expensetracker.controller;

import com.expensetracker.dto.Dto;
import com.expensetracker.model.Transaction;
import com.expensetracker.service.*;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
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
    List<Dto.TransactionResponse> list(Authentication auth) {
        return service.list(users.byEmail(auth.getName())).stream().map(Dto.TransactionResponse::of).toList();
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
