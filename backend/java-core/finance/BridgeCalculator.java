package com.kontrol.erp.finance;

import java.util.Map;
import java.util.HashMap;

/**
 * Calculateur de Bridge Financier KONTROL
 * Gère l'éligibilité aux lignes de crédit court terme.
 */
public class BridgeCalculator {
    public Map<String, Object> calculate(double cash, double invoices) {
        Map<String, Object> result = new HashMap<>();
        double amount = (cash * 0.25) + (invoices * 0.65);
        result.put("eligible_amount", amount);
        result.put("rate", 0.035);
        result.put("risk_category", amount > 50000000 ? "PREMIUM" : "STANDARD");
        return result;
    }
}
