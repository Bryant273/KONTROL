package com.kontrol.erp.admin;

import java.util.Map;
import java.util.HashMap;

/**
 * Engine de Gouvernance Admin
 */
public class GovernanceEngine {
    public Map<String, Object> getSystemPulse(double mrr, int activeCompanies) {
        Map<String, Object> pulse = new HashMap<>();
        double arpu = mrr / activeCompanies;
        pulse.put("arpu", arpu);
        pulse.put("health_score", arpu > 500 ? "OPTIMAL" : "NEEDS_OVERSIGHT");
        pulse.put("automated_actions", arpu < 200);
        return pulse;
    }
}
