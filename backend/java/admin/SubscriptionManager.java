package com.kontrol.erp.admin;

import java.util.*;

/**
 * Expert Module: Souscriptions & Plans
 * Gère le cycle de vie des abonnements des entreprises clientes.
 */
public class SubscriptionManager {
    public Map<String, Object> calculateProjectedRevenue(List<Map<String, Object>> activeSubscriptions) {
        double mrr = activeSubscriptions.stream()
            .filter(s -> "ACTIVE".equals(s.get("status")))
            .mapToDouble(s -> (double)s.get("price"))
            .sum();
            
        Map<String, Object> result = new HashMap<>();
        result.put("mrr", mrr);
        result.put("arr", mrr * 12);
        result.put("next_billing_cycle", "1st-OF-MONTH");
        return result;
    }
}
