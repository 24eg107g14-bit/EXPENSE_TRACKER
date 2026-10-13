package com.expensetracker.service;

import com.expensetracker.dto.Dto;
import com.expensetracker.model.SavingsGoal;
import com.expensetracker.model.User;
import com.expensetracker.repository.SavingsGoalRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class SavingsGoalService {
    private final SavingsGoalRepository repo;

    public SavingsGoalService(SavingsGoalRepository repo) { this.repo = repo; }

    public List<Dto.SavingsGoalResponse> list(User u) {
        return repo.findByUserOrderByIdDesc(u).stream().map(this::toResponse).toList();
    }

    @Transactional
    public Dto.SavingsGoalResponse save(Dto.SavingsGoalRequest r, User u) {
        SavingsGoal g = new SavingsGoal();
        g.setUser(u);
        g.setName(r.name().trim());
        g.setTargetAmount(r.targetAmount());
        g.setTargetDate(r.targetDate());
        g.setNotes(r.notes() == null || r.notes().isBlank() ? null : r.notes().trim());
        return toResponse(repo.save(g));
    }

    @Transactional
    public Dto.SavingsGoalResponse deposit(Long id, BigDecimal amount, User u) {
        SavingsGoal g = getOwned(id, u);
        g.setSavedAmount(g.getSavedAmount().add(amount));
        return toResponse(repo.save(g));
    }

    @Transactional
    public void delete(Long id, User u) { repo.delete(getOwned(id, u)); }

    private SavingsGoal getOwned(Long id, User u) {
        return repo.findByIdAndUser(id, u)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Goal not found"));
    }

    private Dto.SavingsGoalResponse toResponse(SavingsGoal g) {
        BigDecimal target = g.getTargetAmount();
        BigDecimal saved = g.getSavedAmount() == null ? BigDecimal.ZERO : g.getSavedAmount();
        int pct = target.compareTo(BigDecimal.ZERO) == 0 ? 0 :
                saved.multiply(BigDecimal.valueOf(100))
                     .divide(target, 0, RoundingMode.HALF_UP).intValue();
        return new Dto.SavingsGoalResponse(
                g.getId(), g.getName(), target, saved,
                g.getTargetDate(), g.getNotes(),
                Math.min(pct, 100), saved.compareTo(target) >= 0);
    }
}
