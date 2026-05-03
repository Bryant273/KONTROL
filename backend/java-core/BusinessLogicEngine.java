package com.kontrol.erp.core;

import java.util.*;

/**
 * Coeur de logique métier KONTROL (Spring)
 * Orchestration des fonctions Admin et Client.
 */
public class BusinessLogicEngine {

    // --- FONCTIONS ADMIN ---
    
    public Map<String, Object> calculateGlobalRiskScore(double mrr, int companies, double churnRate) {
        Map<String, Object> riskData = new HashMap<>();
        double score = (mrr * (1 - churnRate)) / companies;
        riskData.put("health_index", score);
        riskData.put("status", score > 5000 ? "OPTIMAL" : "CRITICAL_ATTENTION");
        riskData.put("recommendations", List.of("Increase liquidity bridge", "Audit high-risk companies"));
        return riskData;
    }

    // --- FONCTIONS CLIENT / ENTREPRISE ---

    public Map<String, Object> processFinancialBridge(double currentCash, double requestedAmount) {
        Map<String, Object> bridgeResult = new HashMap<>();
        boolean approved = requestedAmount <= (currentCash * 0.3); // Max 30% du flux cash
        
        bridgeResult.put("approved", approved);
        bridgeResult.put("limit", currentCash * 0.3);
        bridgeResult.put("interest_rate", 0.05); // 5% annuel KONTROL
        bridgeResult.put("message", approved ? "Financement prêt pour déblocage" : "Capacité de remboursement insuffisante");
        return bridgeResult;
    }
}
