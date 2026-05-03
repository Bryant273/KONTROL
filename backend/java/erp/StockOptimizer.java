package com.kontrol.erp.enterprise;

import java.util.*;

/**
 * Optimiseur de Stocks - Algorithme de Valorisation
 */
public class StockOptimizer {
    public static double valorizeInventory(List<Map<String, Object>> stocks) {
        return stocks.stream()
            .mapToDouble(s -> (double)s.get("valeur"))
            .sum();
    }
}
