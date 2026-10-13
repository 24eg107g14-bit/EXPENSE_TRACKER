package com.expensetracker.repository;

import com.expensetracker.model.TransactionType;
import java.math.BigDecimal;

public interface MonthlyTotal {
    Integer getYear();
    Integer getMonth();
    TransactionType getType();
    BigDecimal getTotal();
}
