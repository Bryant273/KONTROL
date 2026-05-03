package com.kontrol.erp.erp;

import java.util.*;

/**
 * Expert Module: Stocks & Produits
 * Responsable de la valorisation des stocks et du réapprovisionnement automatique.
 */
public class ProductManager {
    
    public double calculateInventoryValue(List<Map<String, Object>> products) {
        return products.stream()
            .mapToDouble(p -> (double)p.get("stock") * (double)p.get("prix_achat"))
            .sum();
    }

    public List<String> getLowStockAlerts(List<Map<String, Object>> products) {
        List<String> alerts = new ArrayList<>();
        for (Map<String, Object> p : products) {
            if ((int)p.get("stock") < 10) {
                alerts.add("Alerte: Stock critique pour " + p.get("nom"));
            }
        }
        return alerts;
    }
}
