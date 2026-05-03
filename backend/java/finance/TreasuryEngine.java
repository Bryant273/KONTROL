package com.kontrol.erp.finance;

import java.util.*;

/**
 * Expert Module: Trésorerie & Bridge Financier
 * Algorithmes de prédiction de cash-flow et d'éligibilité bancaire KONTROL.
 */
public class TreasuryEngine {

    public Map<String, Object> analyzeCashFlow(List<Map<String, Object>> transactions) {
        double inflows = 0;
        double outflows = 0;
        
        for (Map<String, Object> tx : transactions) {
            double amount = (double) tx.get("amount");
            if (amount > 0) inflows += amount;
            else outflows += Math.abs(amount);
        }

        Map<String, Object> report = new HashMap<>();
        report.put("net_burn", inflows - outflows);
        report.put("runway_months", (inflows > 0) ? (inflows / (outflows / 12 || 1)) : 0);
        return report;
    }

    public Map<String, Object> computeBridge(double mrr, double currentCash) {
        // Logic KONTROL : Bridge = (MRR * 1.5) + (Cash * 0.2)
        double limit = (mrr * 1.5) + (currentCash * 0.2);
        
        Map<String, Object> result = new HashMap<>();
        result.put("approval_limit", limit);
        result.put("daily_rate", 0.0001); // Taux journalier bas
        result.put("is_eligible", mrr > 1000);
        return result;
    }
}
