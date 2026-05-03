package com.kontrol.erp.finance;

import java.util.*;

/**
 * Expert Bridge : Eligibilité Bancaire et Financement
 */
public class BridgeEligibilityService {
    public Map<String, Object> checkEligibility(double mrr, double cash, int creditScore) {
        Map<String, Object> eligibility = new HashMap<>();
        double limit = (mrr * 2.0) + (cash * 0.1);
        eligibility.put("eligible", creditScore > 650);
        eligibility.put("max_amount", limit);
        eligibility.put("suggested_rate", creditScore > 800 ? 0.03 : 0.05);
        return eligibility;
    }
}
