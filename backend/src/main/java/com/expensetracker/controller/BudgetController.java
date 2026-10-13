package com.expensetracker.controller;

import com.expensetracker.dto.Dto;
import com.expensetracker.model.Budget;
import com.expensetracker.service.*;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/budgets")
public class BudgetController {
    private final UserService users;
    private final BudgetService service;

    public BudgetController(UserService users, BudgetService service) {
        this.users = users;
        this.service = service;
    }

    @GetMapping
    List<Dto.BudgetResponse> list(Authentication auth) {
        return service.statuses(users.byEmail(auth.getName()));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    Dto.BudgetResponse create(@Valid @RequestBody Dto.BudgetRequest r, Authentication auth) {
        if (r.endDate().isBefore(r.startDate())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "End date must be on or after the start date");
        }
        Budget b = new Budget();
        b.setCategory(r.category());
        b.setLimitAmount(r.limitAmount());
        b.setStartDate(r.startDate());
        b.setEndDate(r.endDate());
        return service.save(b, users.byEmail(auth.getName()));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@PathVariable Long id, Authentication auth) {
        service.delete(id, users.byEmail(auth.getName()));
    }
}
