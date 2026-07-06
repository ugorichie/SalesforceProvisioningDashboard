public with sharing class ProvisioningDashboardController {
    
    public ProvisioningDashboardController() {
        // Constructor
    }

    @AuraEnabled(cacheable=true)
    public static Map<String, Object> getApprovalMetrics(String timePeriod, String startRange, String endRange) {
        Map<String, Object> result = new Map<String, Object>();
        
        try {
            System.debug('Selected Filter from UI: ' + timePeriod);
            System.debug('Custom Date Bounds: ' + startRange + ' to ' + endRange);
            
            Decimal totalAmount = 0;
            Decimal percentageGrowth = 0;
            Decimal currentGrowthRate = 0;
            Decimal previousGrowthRate = 0;
            String timeframe = '';

            switch on timePeriod {
                                
                when 'this_week' {
                    totalAmount = 850000;
                    percentageGrowth = 4.2;
                    currentGrowthRate = 8.0;
                    previousGrowthRate = 10.5;
                    timeframe = 'Vs Last Week';
                }
                when 'this_month' {
                    totalAmount = 4820000; 
                    percentageGrowth = 12.4;
                    currentGrowthRate = 12.0;
                    previousGrowthRate = 11.628;
                    timeframe = 'Vs Last Month';
                }
                when 'this_quarter' {
                    totalAmount = 14200000;
                    percentageGrowth = 18.1;
                    currentGrowthRate = 14.5;
                    previousGrowthRate = -12.2;
                    timeframe = 'Vs Last Quarter';
                }
                when 'ytd' {
                    totalAmount = 45800000;
                    percentageGrowth = 24.7;
                    currentGrowthRate = 19.2;
                    previousGrowthRate = 15.0;
                    timeframe = 'Vs Last YearToDate';
                }
                when 'custom' {
                    totalAmount = 2350000;
                    percentageGrowth = 9.3;
                    currentGrowthRate = 10.5;
                    previousGrowthRate = 9.8;
                    //timeframe = 'Vs Custom Range';
                }
                when else {
                    totalAmount = 4820000;
                    percentageGrowth = 12.4;
                    currentGrowthRate = 12.0;
                    previousGrowthRate = 11.628;
                }
            }

             // ==================== ADDED THIS BLOCK FOR THE CHART ====================
            List<Decimal> monthlyMrcValues = new List<Decimal>();
            // Scale points corresponding to values between $1.8M and $3.2M from your image
            monthlyMrcValues.add(1850000);  // Jan 2026
            monthlyMrcValues.add(2100000);  // Feb 2026
            monthlyMrcValues.add(2500000);  // Mar 2026
            monthlyMrcValues.add(2350000);  // Apr 2026
            monthlyMrcValues.add(2900000);  // May 2026
            monthlyMrcValues.add(3200000);  // Jun 2026
            monthlyMrcValues.add(1200000);  // Jul 2026 (Lowest value because it's only July 2nd)
            // // =========================================================================

            // Add the monthly MRC values to the result map
            result.put('monthlyMrcValues', monthlyMrcValues);
           
            // Add the other metrics to the result map
            result.put('totalAmount', totalAmount);
            result.put('percentageGrowth', percentageGrowth);
            result.put('currentGrowthRate', currentGrowthRate);
            result.put('previousGrowthRate', previousGrowthRate);
            result.put('status', 'Success');
            
        } catch (Exception e) {
            throw new AuraHandledException('Error retrieving dashboard metrics: ' + e.getMessage());
        }
        
        return result;
    }
}