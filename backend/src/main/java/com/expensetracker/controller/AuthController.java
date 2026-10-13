package com.expensetracker.controller;

import com.expensetracker.dto.Dto;
import com.expensetracker.model.User;
import com.expensetracker.service.*;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final UserService users;
    private final TokenService tokens;

    public AuthController(UserService users, TokenService tokens) {
        this.users = users;
        this.tokens = tokens;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    Dto.AuthResponse register(@Valid @RequestBody Dto.RegisterRequest request) {
        return respond(users.register(request));
    }

    @PostMapping("/login")
    Dto.AuthResponse login(@Valid @RequestBody Dto.LoginRequest request) {
        return respond(users.authenticate(request.email(), request.password()));
    }

    private Dto.AuthResponse respond(User u) {
        return new Dto.AuthResponse(tokens.issue(u.getEmail()), u.getName(), u.getEmail());
    }
}
