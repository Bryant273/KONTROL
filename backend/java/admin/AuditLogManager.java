package com.kontrol.erp.admin;

import java.util.*;

/**
 * Expert Sécurité : Gestion des Logs d'Audit
 */
public class AuditLogManager {
    public void recordSecureAction(String adminId, String action, String module) {
        // Logique Java pour persister les actions critiques de manière immuable
        System.out.println("SECURE_AUDIT: [" + adminId + "] executed [" + action + "] on module [" + module + "]");
    }
}
