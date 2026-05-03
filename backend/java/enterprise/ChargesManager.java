package com.kontrol.erp.enterprise;

import java.util.*;

/**
 * GESTION DES CHARGES DIVERSES
 */
public class ChargesManager {
    public double calculateTotalCharges(List<Map<String, Object>> charges) {
        return charges.stream()
            .mapToDouble(c -> (double)c.get("montant"))
            .sum();
    }

    public Map<String, Object> getRecurrentChargesForecast() {
        Map<String, Object> forecast = new HashMap<>();
        forecast.put("salaries", 12000000);
        forecast.put("rent", 1500000);
        forecast.put("cloud_costs", 450000);
        return forecast;
    }
}
