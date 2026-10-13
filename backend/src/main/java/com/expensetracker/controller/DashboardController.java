package com.expensetracker.controller;

import com.expensetracker.dto.Dto;
import com.expensetracker.model.Categories;
import com.expensetracker.service.*;
import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class DashboardController {
    private final UserService users;
    private final TransactionService transactions;

    public DashboardController(UserService users, TransactionService transactions) {
        this.users = users;
        this.transactions = transactions;
    }

    @GetMapping("/dashboard")
    Dto.DashboardResponse dashboard(Authentication auth) {
        return transactions.dashboard(users.byEmail(auth.getName()));
    }

    @GetMapping("/categories")
    List<String> categories() { return Categories.ALL; }
}
