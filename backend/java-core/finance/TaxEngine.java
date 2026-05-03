package com.kontrol.erp.finance;

/**
 * Moteur Fiscal UEMOA/Global
 */
public class TaxEngine {
    public double calculateVat(double amount, String region) {
        double rate = region.equalsIgnoreCase("UEMOA") ? 0.18 : 0.20;
        return amount * rate;
    }

    public double calculateCorporateTax(double profit) {
        return profit * 0.25; // Taux standard 25%
    }
}
