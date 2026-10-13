package com.expensetracker.controller;

import com.expensetracker.dto.Dto;
import com.expensetracker.service.SavingsGoalService;
import com.expensetracker.service.UserService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/goals")
public class SavingsGoalController {
    private final UserService users;
    private final SavingsGoalService service;

    public SavingsGoalController(UserService users, SavingsGoalService service) {
        this.users = users;
        this.service = service;
    }

    @GetMapping
    List<Dto.SavingsGoalResponse> list(Authentication auth) {
        return service.list(users.byEmail(auth.getName()));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    Dto.SavingsGoalResponse create(@Valid @RequestBody Dto.SavingsGoalRequest r, Authentication auth) {
        return service.save(r, users.byEmail(auth.getName()));
    }

    @PostMapping("/{id}/deposit")
    Dto.SavingsGoalResponse deposit(@PathVariable Long id,
                                    @Valid @RequestBody Dto.DepositRequest r,
                                    Authentication auth) {
        return service.deposit(id, r.amount(), users.byEmail(auth.getName()));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@PathVariable Long id, Authentication auth) {
        service.delete(id, users.byEmail(auth.getName()));
    }
}
