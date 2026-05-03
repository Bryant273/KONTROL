package com.kontrol.erp.enterprise;

import java.util.*;

/**
 * GESTION DES TIERS (Clients & Fournisseurs)
 */
public class TiersManager {
    public Map<String, Object> validateTier(Map<String, Object> data) {
        Map<String, Object> res = new HashMap<>();
        String nif = (String) data.get("nif");
        res.put("is_valid_fiscal", nif != null && nif.length() > 8);
        res.put("tier_category", "ENTREPRISE");
        return res;
    }
}
