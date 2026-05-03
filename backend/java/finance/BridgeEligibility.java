package com.kontrol.erp.finance;

import java.util.*;

/**
 * Éligibilité au Bridge Financier
 * Calcul du crédit instantané basé sur le MRR et le Cash.
 */
public class BridgeEligibility {
    public static double calculateLimit(double mrr, double cash, double unpaidInvoices) {
        return (mrr * 3.0) + (cash * 0.15) + (unpaidInvoices * 0.5);
    }
}
