package com.kontrol.erp.finance;

import java.util.*;

/**
 * Expert Finance : Gestion des Flux de Trésorerie
 */
public class FinanceManager {
    public Map<String, Object> calculateNetPosition(double inflows, double outflows) {
        Map<String, Object> result = new HashMap<>();
        result.put("net", inflows - outflows);
        result.put("burn_rate", outflows / 30); // par jour
        result.put("stability_index", inflows > outflows ? 1.0 : 0.4);
        return result;
    }
}
