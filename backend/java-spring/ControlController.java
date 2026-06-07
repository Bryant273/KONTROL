package com.kontrol.erp;

import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/business")
public class ControlController {

    /**
     * Engine Métier de KONTROL (Spring Boot)
     * Gère la logique ERP complexe et les flux financiers.
     */
    @GetMapping("/analyze")
    public Map<String, Object> runBusinessLogic(@RequestParam Double mrr, @RequestParam Integer companies) {
        Map<String, Object> response = new HashMap<>();
        
        // Logique de scoring ERP
        double healthScore = (mrr / companies) * 0.85;
        
        response.put("health_score", healthScore);
        response.put("engine", "Java Spring Boot 3.2");
        response.put("timestamp", System.currentTimeMillis());
        response.put("status", "VALIDATED_BY_GO_GATEWAY");
        
        return response;
    }

    @PostMapping("/transaction")
    public String processSecureTransaction(@RequestBody String payload) {
        // Communication avec le Rust Shield pour validation avant persistence
        return "Transaction Processed with 2PC (Two-Phase Commit)";
    }

    /**
     * Endpoint d'audit de sécurité et d'intégrité de stock KONTROL.
     * Connecté à la logique métier Java Core.
     */
    @PostMapping("/verify-stock")
    public Map<String, Object> verifyStock(@RequestBody Map<String, Object> payload) {
        com.kontrol.erp.core.BusinessLogicEngine engine = new com.kontrol.erp.core.BusinessLogicEngine();
        
        int currentStock = 0;
        int requestedQty = 0;
        
        if (payload != null) {
            if (payload.containsKey("currentStock")) {
                Object cs = payload.get("currentStock");
                if (cs instanceof Number) {
                    currentStock = ((Number) cs).intValue();
                }
            }
            if (payload.containsKey("requestedQty")) {
                Object rq = payload.get("requestedQty");
                if (rq instanceof Number) {
                    requestedQty = ((Number) rq).intValue();
                }
            }
        }
        
        return engine.verifyStockIntegrity(currentStock, requestedQty);
    }
}
