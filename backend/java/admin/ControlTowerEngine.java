package com.kontrol.erp.admin;

import java.util.*;

/**
 * Analyste & Architecte : Control Tower Engine
 * Supervision de l'écosystème global et détection d'anomalies.
 */
public class ControlTowerEngine {

    public Map<String, Object> runGlobalAudit(List<Map<String, Object>> companies) {
        Map<String, Object> audit = new HashMap<>();
        
        long criticalCompanies = companies.stream()
            .filter(c -> (double)c.get("churn") > 0.15)
            .count();
            
        double totalRev = companies.stream()
            .mapToDouble(c -> (double)c.get("mrr"))
            .sum();

        audit.put("ecosystem_health", criticalCompanies > 5 ? "DEGRADED" : "HEALTHY");
        audit.put("total_managed_revenue", totalRev);
        audit.put("anomalies_detected", criticalCompanies);
        audit.put("timestamp", System.currentTimeMillis());
        
        return audit;
    }
}
