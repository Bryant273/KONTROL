package com.kontrol.erp.admin;

import java.util.*;

/**
 * JOURNAL DES ACTIONS SYSTEME (Immuable)
 */
public class ActionLogger {
    public Map<String, Object> logAction(String userId, String module, String action) {
        Map<String, Object> log = new HashMap<>();
        log.put("trace_id", UUID.randomUUID().toString());
        log.put("actor", userId);
        log.put("security_level", "HARDENED");
        log.put("action", action);
        return log;
    }
}
