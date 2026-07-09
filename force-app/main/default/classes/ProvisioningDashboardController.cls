public with sharing class ProvisioningDashboardController {

    @AuraEnabled(cacheable=true)
    public static Map<String, Object> getProvisioningMetrics(String timePeriod, String startRange, String endRange) {
        Map<String, Object> result = new Map<String, Object>();
        
        try {
            // ==========================================
            // GLOBAL DATE BOUNDARIES
            // Evaluates dynamic date filters for all cards
            // ==========================================
            Map<String, Date> dateBounds = calculateDateBounds(timePeriod, startRange, endRange);
            Date currentStart = dateBounds.get('currentStart');
            Date currentEnd = dateBounds.get('currentEnd');
            Date priorStart = dateBounds.get('priorStart');
            Date priorEnd = dateBounds.get('priorEnd');

            // ==========================================
            // CURRENT PERIOD AGGREGATION
            // Gets SUM of MRC (Card 1 Main) & COUNT of Approvals (Card 2 Trend)
            // ==========================================
            AggregateResult[] currentAgg = [
                SELECT SUM(Computed_MRC__c) totalMrc, COUNT(Id) totalApprovals
                FROM Opportunity
                WHERE Provisioningapprovalstatus__c = 'completed'
                  AND Provisioning_Approval_Date__c >= :currentStart
                  AND Provisioning_Approval_Date__c <= :currentEnd
            ];
            
            Decimal currentMrc = currentAgg.isEmpty() || currentAgg[0].get('totalMrc') == null ? 0.0 : (Decimal) currentAgg[0].get('totalMrc');
            Decimal currentCount = currentAgg.isEmpty() || currentAgg[0].get('totalApprovals') == null ? 0.0 : (Decimal) currentAgg[0].get('totalApprovals');

            // ==========================================
            // PRIOR PERIOD AGGREGATION
            // Gets historical data to calculate the percentage growths
            // ==========================================
            Decimal priorMrc = 0.0;
            Decimal priorCount = 0.0;
            
            if (priorStart != null && priorEnd != null) {
                AggregateResult[] priorAgg = [
                    SELECT SUM(Computed_MRC__c) totalMrc, COUNT(Id) totalApprovals
                    FROM Opportunity
                    WHERE Provisioningapprovalstatus__c = 'completed'
                      AND Provisioning_Approval_Date__c >= :priorStart
                      AND Provisioning_Approval_Date__c <= :priorEnd
                ];
                priorMrc = priorAgg.isEmpty() || priorAgg[0].get('totalMrc') == null ? 0.0 : (Decimal) priorAgg[0].get('totalMrc');
                priorCount = priorAgg.isEmpty() || priorAgg[0].get('totalApprovals') == null ? 0.0 : (Decimal) priorAgg[0].get('totalApprovals');
            }

            // ==========================================
            // PERCENTAGE GROWTH CALCULATIONS
            // Formula: ((Current - Prior) / Prior) * 100
            // ==========================================
            
            // 1. Net MRC Growth (Affects: Card 1 Trend & Card 2 Main Value)
            Decimal mrcGrowthPercent = calculatePercentageGrowth(currentMrc, priorMrc);
            
            // 2. Approval Volume Growth (Affects: Card 2 Trend)
            Decimal countGrowthPercent = calculatePercentageGrowth(currentCount, priorCount);

            // ==========================================
            // PAYLOAD CONSTRUCTION
            // Sending mapped data back to the JavaScript
            // ==========================================
            
            // CARD 1 Payloads
            result.put('card1_currentMrc', currentMrc);
            result.put('card1_mrcGrowthPercent', mrcGrowthPercent.setScale(1));
            
            // CARD 2 Payloads
            result.put('card2_mrcGrowthPercent', mrcGrowthPercent.setScale(1)); // Duplicated key for logic clarity in JS
            result.put('card2_countGrowthPercent', countGrowthPercent.setScale(1));
            
            // Shared Context
            result.put('timeframeText', getPeriodLabel(timePeriod));
            result.put('status', 'Success');

        } catch (Exception e) {
            throw new AuraHandledException('Error executing dynamic dashboard metric load: ' + e.getMessage());
        }
        
        return result;
    }


    // =========================================================================
    // CARD 3 DATA RETRIEVAL: Customer Products (Provisioning Completed & Net MRC)
    // =========================================================================
    @AuraEnabled(cacheable=true)
    public static Map<String, Object> getCard3ProductMetrics(String timePeriod, String startRange, String endRange) {
        Map<String, Object> result = new Map<String, Object>();
        
        try {
            // 1. Fetch exact date boundaries using the shared helper method
            Map<String, Date> dateBounds = calculateDateBounds(timePeriod, startRange, endRange);
            Date currentStart = dateBounds.get('currentStart');
            Date currentEnd = dateBounds.get('currentEnd');
            Date priorStart = dateBounds.get('priorStart');
            Date priorEnd = dateBounds.get('priorEnd');

            // 2. CURRENT PERIOD QUERY: Customer_Products__c
            // Gets total count of active services and sum of MRC
            AggregateResult[] currentAgg = [
                SELECT COUNT(Id) totalProvisioned, SUM(MRC__c) totalMrc
                FROM Customer_Products__c
                WHERE Status__c = 'active'
                  AND Billing_Start_Date__c >= :currentStart  // UPDATE THIS to your actual date field API name
                  AND Billing_Start_Date__c <= :currentEnd
            ];
            
            Decimal currentCount = currentAgg.isEmpty() || currentAgg[0].get('totalProvisioned') == null ? 0.0 : (Decimal) currentAgg[0].get('totalProvisioned');
            Decimal currentMrc = currentAgg.isEmpty() || currentAgg[0].get('totalMrc') == null ? 0.0 : (Decimal) currentAgg[0].get('totalMrc');

            // 3. PRIOR PERIOD QUERY: Customer_Products__c
            Decimal priorCount = 0.0;
            Decimal priorMrc = 0.0;
            
            if (priorStart != null && priorEnd != null) {
                AggregateResult[] priorAgg = [
                    SELECT COUNT(Id) totalProvisioned, SUM(MRC__c) totalMrc
                    FROM Customer_Products__c
                    WHERE Status__c = 'active'
                      AND Billing_Start_Date__c >= :priorStart
                      AND Billing_Start_Date__c <= :priorEnd
                ];
                priorCount = priorAgg.isEmpty() || priorAgg[0].get('totalProvisioned') == null ? 0.0 : (Decimal) priorAgg[0].get('totalProvisioned');
                priorMrc = priorAgg.isEmpty() || priorAgg[0].get('totalMrc') == null ? 0.0 : (Decimal) priorAgg[0].get('totalMrc');
            }

            // 4. CALCULATE GROWTH METRICS FOR CARD 3
            // Top Section: Count of services
            Decimal countGrowthPercent = calculatePercentageGrowth(currentCount, priorCount);
            
            // Bottom Section: MRC Actual Difference and Percentage
            Decimal mrcNetDifference = currentMrc - priorMrc; // Actual amount increase/decrease
            Decimal mrcGrowthPercent = calculatePercentageGrowth(currentMrc, priorMrc);

            // 5. MAP RESULTS TO UNIQUE CARD 3 KEYS
            result.put('card3_currentCount', currentCount);
            result.put('card3_countGrowthPercent', countGrowthPercent.setScale(1));
            
            result.put('card3_currentMrc', currentMrc);
            result.put('card3_mrcNetDifference', mrcNetDifference);
            result.put('card3_mrcGrowthPercent', mrcGrowthPercent.setScale(1));
            
            result.put('timeframeText', getPeriodLabel(timePeriod));
            result.put('status', 'Success');

        } catch (Exception e) {
            throw new AuraHandledException('Error loading Card 3 metrics: ' + e.getMessage());
        }
        
        return result;
    }


    // =========================================================================
    // CARD 4 DATA RETRIEVAL: Customer Products (Provisioning Completed Growth %)
    // =========================================================================
    @AuraEnabled(cacheable=true)
    public static Map<String, Object> getCard4GrowthMetrics(String timePeriod, String startRange, String endRange) {
        Map<String, Object> result = new Map<String, Object>();
        
        try {
            // 1. Fetch exact date boundaries using the shared helper method
            Map<String, Date> dateBounds = calculateDateBounds(timePeriod, startRange, endRange);
            Date currentStart = dateBounds.get('currentStart');
            Date currentEnd = dateBounds.get('currentEnd');
            Date priorStart = dateBounds.get('priorStart');
            Date priorEnd = dateBounds.get('priorEnd');

            // 2. CURRENT PERIOD QUERY: Customer_Products__c
            // Targets 'active' status and filters by Billing_Start_Date__c
            AggregateResult[] currentAgg = [
                SELECT SUM(MRC__c) totalMrc, COUNT(Id) totalProvisioned
                FROM Customer_Products__c
                WHERE Status__c = 'active'
                  AND Billing_Start_Date__c >= :currentStart
                  AND Billing_Start_Date__c <= :currentEnd
            ];
            
            Decimal currentMrc = currentAgg.isEmpty() || currentAgg[0].get('totalMrc') == null ? 0.0 : (Decimal) currentAgg[0].get('totalMrc');
            Decimal currentCount = currentAgg.isEmpty() || currentAgg[0].get('totalProvisioned') == null ? 0.0 : (Decimal) currentAgg[0].get('totalProvisioned');

            // 3. PRIOR PERIOD QUERY: Customer_Products__c
            Decimal priorMrc = 0.0;
            Decimal priorCount = 0.0;
            
            if (priorStart != null && priorEnd != null) {
                AggregateResult[] priorAgg = [
                    SELECT SUM(MRC__c) totalMrc, COUNT(Id) totalProvisioned
                    FROM Customer_Products__c
                    WHERE Status__c = 'active'
                      AND Billing_Start_Date__c >= :priorStart
                      AND Billing_Start_Date__c <= :priorEnd
                ];
                priorMrc = priorAgg.isEmpty() || priorAgg[0].get('totalMrc') == null ? 0.0 : (Decimal) priorAgg[0].get('totalMrc');
                priorCount = priorAgg.isEmpty() || priorAgg[0].get('totalProvisioned') == null ? 0.0 : (Decimal) priorAgg[0].get('totalProvisioned');
            }

            // 4. CALCULATE GROWTH METRICS FOR CARD 4
            // Main Value: Percentage Growth of Cumulative MRC
            Decimal mrcGrowthPercent = calculatePercentageGrowth(currentMrc, priorMrc);
            
            // Sub-Trend Value: Percentage Growth of Volume (Count of active services)
            Decimal countGrowthPercent = calculatePercentageGrowth(currentCount, priorCount);

            // 5. MAP RESULTS TO UNIQUE CARD 4 KEYS
            result.put('card4_mrcGrowthPercent', mrcGrowthPercent.setScale(1));
            result.put('card4_countGrowthPercent', countGrowthPercent.setScale(1));
            
            result.put('timeframeText', getPeriodLabel(timePeriod));
            result.put('status', 'Success');

        } catch (Exception e) {
            throw new AuraHandledException('Error loading Card 4 metrics: ' + e.getMessage());
        }
        
        return result;
    }


    // =========================================================================
    // CARD 5 DATA RETRIEVAL: Customer Products (Work In Progress Metrics)
    // =========================================================================
    @AuraEnabled(cacheable=true)
    public static Map<String, Object> getCard5WipMetrics(String timePeriod, String startRange, String endRange) {
        Map<String, Object> result = new Map<String, Object>();
        
        try {
            // 1. Fetch exact date boundaries using the shared helper engine
            Map<String, Date> dateBounds = calculateDateBounds(timePeriod, startRange, endRange);
            Date currentStart = dateBounds.get('currentStart');
            Date currentEnd = dateBounds.get('currentEnd');

            // Convert Date boundaries to DateTime to map precisely against CreatedDate
            DateTime startDateTime = DateTime.newInstance(currentStart, Time.newInstance(0, 0, 0, 0));
            DateTime endDateTime = DateTime.newInstance(currentEnd, Time.newInstance(23, 59, 59, 999));

            // 2. RUN BULK AGGREGATION GROUPED BY STATUS
            // Fetches all records created within the timeframe to evaluate ratios
            AggregateResult[] groupedResults = [
                SELECT Status__c, SUM(MRC__c) statusMrc, COUNT(Id) statusCount
                FROM Customer_Products__c
                WHERE CreatedDate >= :startDateTime
                  AND CreatedDate <= :endDateTime
                GROUP BY Status__c
            ];

            Decimal wipCumulativeMrc = 0.0;
            Decimal wipRecordCount = 0.0;
            Decimal totalRecordCount = 0.0;

            // 3. PROCESS THE AGGREGATION MATRIX
            for (AggregateResult ar : groupedResults) {
                String status = (String) ar.get('Status__c');
                Decimal count = (Decimal) ar.get('statusCount');
                Decimal mrc = ar.get('statusMrc') == null ? 0.0 : (Decimal) ar.get('statusMrc');

                // Accumulate overall total count for the baseline ratio denominator
                totalRecordCount += count;

                // Capture targeted stats exclusively for "In Progress" services
                if (status == 'In Progress') {
                    wipCumulativeMrc = mrc;
                    wipRecordCount = count;
                }
            }

            // 4. CALCULATE DISTRIBUTION PERCENTAGE RATIO
            // Formula: (WIP Services / Total Services Created) * 100
            Decimal wipRatioPercent = 0.0;
            if (totalRecordCount > 0) {
                wipRatioPercent = (wipRecordCount / totalRecordCount) * 100;
            }

            // 5. PACK PAYLOAD WITH UNIQUE CARD 5 MAPPINGS
            result.put('card5_wipMrcValue', wipCumulativeMrc);
            result.put('card5_wipRatioPercent', wipRatioPercent.setScale(1));
            result.put('status', 'Success');

        } catch (Exception e) {
            throw new AuraHandledException('Error executing Card 5 metric aggregation: ' + e.getMessage());
        }
        
        return result;
    }


    // =========================================================================
    // CARD 6 DATA RETRIEVAL: Customer Products (Provisioning Backlogs %)
    // Formula: (WIP Services ÷ Total Services with Provisioning Approvals) * 100
    // =========================================================================
    @AuraEnabled(cacheable=true)
    public static Map<String, Object> getCard6BacklogMetrics(String timePeriod, String startRange, String endRange) {
        Map<String, Object> result = new Map<String, Object>();
        
        try {
            // 1. Resolve date boundaries based on global dashboard selections
            Map<String, Date> dateBounds = calculateDateBounds(timePeriod, startRange, endRange);
            Date currentStart = dateBounds.get('currentStart');
            Date currentEnd = dateBounds.get('currentEnd');

            // Convert Date filters to DateTime for accurate CreatedDate boundary filtering
            DateTime startDateTime = DateTime.newInstance(currentStart, Time.newInstance(0, 0, 0, 0));
            DateTime endDateTime = DateTime.newInstance(currentEnd, Time.newInstance(23, 59, 59, 999));

            // 2. QUERY: Fetch aggregated counts grouped by status within the timeframe
            AggregateResult[] groupedResults = [
                SELECT Status__c, COUNT(Id) statusCount
                FROM Customer_Products__c
                WHERE CreatedDate >= :startDateTime
                  AND CreatedDate <= :endDateTime
                GROUP BY Status__c
            ];

            Decimal wipCount = 0.0;
            Decimal totalCount = 0.0;

            // 3. PARSE AGGREGATION RESULTS
            for (AggregateResult ar : groupedResults) {
                String status = (String) ar.get('Status__c');
                Decimal count = (Decimal) ar.get('statusCount');

                // Accumulate every service record into the total baseline denominator
                totalCount += count;

                // Capture the exact count for Work In Progress items
                if (status == 'In Progress') {
                    wipCount = count;
                }
            }

            // 4. CALCULATE THE BACKLOG PERCENTAGE
            Decimal backlogPercent = 0.0;
            if (totalCount > 0) {
                backlogPercent = (wipCount / totalCount) * 100;
            }

            // 5. PACK RESULT MAP USING CARD 6 UNIQUE KEY
            result.put('card6_backlogPercent', backlogPercent.setScale(1));
            result.put('status', 'Success');

        } catch (Exception e) {
            throw new AuraHandledException('Error executing Card 6 metric calculation: ' + e.getMessage());
        }
        
        return result;
    }
    

    // HELPER: Standardized Growth Formula preventing divide-by-zero errors
    private static Decimal calculatePercentageGrowth(Decimal currentVal, Decimal priorVal) {
        if (priorVal > 0) {
            return ((currentVal - priorVal) / priorVal) * 100;
        } else if (priorVal == 0 && currentVal > 0) {
            return 100.0; // 100% Growth if starting from a baseline of zero
        } else {
            return 0.0; // 0% Growth if both are zero
        }
    }

    // HELPER: Dynamic Date Boundary Engine
    private static Map<String, Date> calculateDateBounds(String timePeriod, String startRange, String endRange) {
        Map<String, Date> bounds = new Map<String, Date>();
        Date today = Date.today();
        Date currentStart, currentEnd, priorStart, priorEnd;

        switch on timePeriod {
            when 'this_week' {
                currentStart = today.toStartOfWeek();
                currentEnd = currentStart.addDays(6);
                priorStart = currentStart.addDays(-7);
                priorEnd = currentStart.addDays(-1);
            }
            when 'this_month' {
                currentStart = today.toStartOfMonth();
                currentEnd = currentStart.addMonths(1).addDays(-1);
                priorStart = currentStart.addMonths(-1);
                priorEnd = currentStart.toStartOfMonth().addDays(-1);
            }
            when 'this_quarter' {
                Integer currentQuarter = ((today.month() - 1) / 3) + 1;
                currentStart = Date.newInstance(today.year(), (currentQuarter * 3) - 2, 1);
                currentEnd = currentStart.addMonths(3).addDays(-1);
                priorStart = currentStart.addMonths(-3);
                priorEnd = currentStart.addDays(-1);
            }
            when 'ytd' {
                currentStart = Date.newInstance(today.year(), 1, 1);
                currentEnd = today;
                priorStart = Date.newInstance(today.year() - 1, 1, 1);
                priorEnd = Date.newInstance(today.year() - 1, today.month(), today.day());
            }
            when 'custom' {
                currentStart = String.isNotBlank(startRange) ? Date.valueOf(startRange) : today;
                currentEnd = String.isNotBlank(endRange) ? Date.valueOf(endRange) : today;
                Integer daysSpanned = currentStart.daysBetween(currentEnd) + 1;
                priorStart = currentStart.addDays(-daysSpanned);
                priorEnd = currentStart.addDays(-1);
            }
            when else {
                currentStart = today.toStartOfMonth();
                currentEnd = today;
            }
        }

        bounds.put('currentStart', currentStart);
        bounds.put('currentEnd', currentEnd);
        bounds.put('priorStart', priorStart);
        bounds.put('priorEnd', priorEnd);
        return bounds;
    }

    private static String getPeriodLabel(String timePeriod) {
        if (timePeriod == 'this_week') return 'vs Last Week';
        if (timePeriod == 'this_month') return 'vs Last Month';
        if (timePeriod == 'this_quarter') return 'vs Last Quarter';
        if (timePeriod == 'ytd') return 'vs Last YTD';
        return 'vs Prior Period';
    }
}