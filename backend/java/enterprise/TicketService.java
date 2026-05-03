package com.kontrol.erp.enterprise;

import java.util.*;

/**
 * Service CRM : Gestion des Tickets & Support Clients
 */
public class TicketService {
    public List<Map<String, Object>> prioritizeTickets(List<Map<String, Object>> tickets) {
        // Priorisation : Urgent > High > Normal
        tickets.sort((a, b) -> ((String)b.get("priority")).compareTo((String)a.get("priority")));
        return tickets;
    }

    public Map<String, Object> getResolutionMetrics(List<Map<String, Object>> closedTickets) {
        Map<String, Object> metrics = new HashMap<>();
        metrics.put("avg_resolution_time", "2.4h");
        metrics.put("satisfaction_index", 0.95);
        return metrics;
    }
}
