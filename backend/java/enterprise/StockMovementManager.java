package com.kontrol.erp.enterprise;

import java.util.*;

/**
 * GESTION DES MOUVEMENTS DE STOCK
 */
public class StockMovementManager {
    public void recordMovement(String productId, int quantity, String type) {
        // Logique Java pour les mouvements (Entrée/Sortie)
        System.out.println("Processing " + type + " for product " + productId + " qty: " + quantity);
    }
}
