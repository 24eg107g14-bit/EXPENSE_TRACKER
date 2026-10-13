package com.expensetracker.service;

import com.expensetracker.dto.Dto;
import com.expensetracker.model.Transaction;
import com.expensetracker.model.TransactionType;
import com.expensetracker.model.User;
import com.expensetracker.repository.CategoryTotal;
import com.expensetracker.repository.TransactionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TransactionServiceTest {

    @Mock
    private TransactionRepository repo;

    @InjectMocks
    private TransactionService service;

    @Test
    void dashboardReturnsCorrectBalance() {
        User u = new User();
        u.setName("Alex");
        u.setEmail("alex@example.com");

        when(repo.total(u, TransactionType.INCOME)).thenReturn(new BigDecimal("1000.00"));
        when(repo.total(u, TransactionType.EXPENSE)).thenReturn(new BigDecimal("400.00"));
        when(repo.totalsByCategory(u, TransactionType.EXPENSE)).thenReturn(Collections.emptyList());
        when(repo.findTop5ByUserOrderByDateDescIdDesc(u)).thenReturn(Collections.emptyList());

        Dto.DashboardResponse dashboard = service.dashboard(u);

        assertEquals(new BigDecimal("1000.00"), dashboard.income());
        assertEquals(new BigDecimal("400.00"), dashboard.expenses());
        assertEquals(new BigDecimal("600.00"), dashboard.balance());
    }

    @Test
    void nzReturnsZeroForNullInput() {
        assertEquals(BigDecimal.ZERO, TransactionService.nz(null));
        assertEquals(BigDecimal.TEN, TransactionService.nz(BigDecimal.TEN));
    }

    @Test
    void saveSetsAllFieldsCorrectlyOnNewTransaction() {
        User u = new User();
        u.setName("Alex");
        u.setEmail("alex@example.com");

        Transaction form = new Transaction();
        form.setType(TransactionType.EXPENSE);
        form.setAmount(new BigDecimal("50.00"));
        form.setCategory("Groceries");
        form.setDate(LocalDate.of(2026, 10, 13));
        form.setDescription("Supermarket purchase");

        when(repo.save(any(Transaction.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Transaction saved = service.save(form, u);

        assertNotNull(saved);
        assertSame(u, saved.getUser());
        assertEquals(TransactionType.EXPENSE, saved.getType());
        assertEquals(new BigDecimal("50.00"), saved.getAmount());
        assertEquals("Groceries", saved.getCategory());
        assertEquals(LocalDate.of(2026, 10, 13), saved.getDate());
        assertEquals("Supermarket purchase", saved.getDescription());
        verify(repo).save(any(Transaction.class));
    }

    @Test
    void getThrows404WhenTransactionNotFound() {
        User u = new User();
        when(repo.findByIdAndUser(99L, u)).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> service.get(99L, u));

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
        assertEquals("Transaction not found", ex.getReason());
    }
}
