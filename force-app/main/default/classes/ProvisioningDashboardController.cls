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

            //Variable values for Card 3 : Provisioning Completed 
            decimal provisionedCompletedCount = 0;
            decimal ProvisionedCompletedPercentageCurrent = 0;
            decimal ProvisionedCompletedPercentagePrevious = 0;
            decimal ProvisionedCompletedMRC = 0;
            decimal ProvisionedCompletedMRCPercentageCurrent = 0;
            decimal ProvisionedCompletedMRCPercentagePrevious = 0;

            switch on timePeriod {
                                
                when 'this_week' {
                    timeframe = 'Vs Last Week';

                    // Sample data for this week card 1
                    totalAmount = 850000;
                    percentageGrowth = 4.2;

                    // Sample data for this week card 2
                    currentGrowthRate = 8.0;
                    previousGrowthRate = 10.5;

                    // Sample data for this week card 3
                    provisionedCompletedCount = 120; 
                    ProvisionedCompletedPercentageCurrent = 15.0;
                    ProvisionedCompletedPercentagePrevious = 12.0;
                    ProvisionedCompletedMRC = 180000;
                    ProvisionedCompletedMRCPercentageCurrent = 12.0;
                    ProvisionedCompletedMRCPercentagePrevious = 10.0;
                }

                when 'this_month' {
                    timeframe = 'Vs Last Month';

                    // Sample data for this month Card 1
                    totalAmount = 4820000; 
                    percentageGrowth = 12.4;

                    // Sample data for this month Card 2
                    currentGrowthRate = 12.0;
                    previousGrowthRate = 11.628;

                    // Sample data for this month Card 3
                    provisionedCompletedCount = 450;
                    ProvisionedCompletedPercentageCurrent = 18.0;
                    ProvisionedCompletedPercentagePrevious = 15.0;
                    ProvisionedCompletedMRC = 720000;
                    ProvisionedCompletedMRCPercentageCurrent = 15.0;
                    ProvisionedCompletedMRCPercentagePrevious = 10.0;   
                }

                when 'this_quarter' {
                    timeframe = 'Vs Last Quarter';

                    // Sample data for this quarter Card 1
                    totalAmount = 14200000;
                    percentageGrowth = 18.1;

                    // Sample data for this quarter Card 2
                    currentGrowthRate = 14.5;
                    previousGrowthRate = -12.2;

                    // Sample data for this quarter Card 3
                    provisionedCompletedCount = 1200;
                    ProvisionedCompletedPercentageCurrent = 20.0;
                    ProvisionedCompletedPercentagePrevious = 18.0;
                    ProvisionedCompletedMRC = 2160000;
                    ProvisionedCompletedMRCPercentageCurrent = 18.0;
                    ProvisionedCompletedMRCPercentagePrevious = 10.0;
                }

                when 'ytd' {
                    timeframe = 'Vs Last YearToDate';

                    // Sample data for YTD Card 1
                    totalAmount = 45800000;
                    percentageGrowth = 24.7;
                   
                    // Sample data for YTD Card 2
                    currentGrowthRate = 19.2;
                    previousGrowthRate = 15.0;
                   
                    // Sample data for YTD Card 3
                    provisionedCompletedCount = 3500;
                    ProvisionedCompletedPercentageCurrent = 22.0;
                    ProvisionedCompletedPercentagePrevious = 20.0;
                    ProvisionedCompletedMRC = 6300000;
                    ProvisionedCompletedMRCPercentageCurrent = 20.0;
                    ProvisionedCompletedMRCPercentagePrevious = 10.0;
                }
                when 'custom' {

                    // Sample data for custom range Card 1
                    totalAmount = 2350000;
                    percentageGrowth = 9.3;

                    // Sample data for custom range Card 2
                    currentGrowthRate = 10.5;
                    previousGrowthRate = 9.8;

                    // Sample data for custom range Card 3  
                    provisionedCompletedCount = 2500;
                    ProvisionedCompletedPercentageCurrent = 18.0;
                    ProvisionedCompletedPercentagePrevious = 15.0;
                    ProvisionedCompletedMRC = 4500000;
                    ProvisionedCompletedMRCPercentageCurrent = 15.0;
                    ProvisionedCompletedMRCPercentagePrevious = 10.0;
                }
                when else {
                    // Default case for 'all_time' or any other unspecified time period
                    timeframe = 'All Time';

                    // Sample data for all time Card 1
                    totalAmount = 4820000;
                    percentageGrowth = 12.4;
                    // Sample data for all time Card 2
                    currentGrowthRate = 12.0;
                    previousGrowthRate = 11.628;

                    // Sample data for all time Card 3
                    provisionedCompletedCount = 450;
                    ProvisionedCompletedPercentageCurrent = 18.0;
                    ProvisionedCompletedPercentagePrevious = 15.0;
                    ProvisionedCompletedMRC = 720000;
                    ProvisionedCompletedMRCPercentageCurrent = 15.0;
                    ProvisionedCompletedMRCPercentagePrevious = 10.0;
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
            //Add metrics for card 1
            result.put('totalAmount', totalAmount);
            result.put('percentageGrowth', percentageGrowth);
            //Add metrics for card 2
            result.put('currentGrowthRate', currentGrowthRate);
            result.put('previousGrowthRate', previousGrowthRate);
            //Add metrics for card 3
            result.put('provisionedCompletedCount', provisionedCompletedCount);
            result.put('ProvisionedCompletedPercentageCurrent', ProvisionedCompletedPercentageCurrent);
            result.put('ProvisionedCompletedPercentagePrevious', ProvisionedCompletedPercentagePrevious);
            result.put('ProvisionedCompletedMRC', ProvisionedCompletedMRC);
            result.put('ProvisionedCompletedMRCPercentageCurrent', ProvisionedCompletedMRCPercentageCurrent);
            result.put('ProvisionedCompletedMRCPercentagePrevious', ProvisionedCompletedMRCPercentagePrevious);
            result.put('timeframe', timeframe);

            
            result.put('status', 'Success');
            
        } catch (Exception e) {
            throw new AuraHandledException('Error retrieving dashboard metrics: ' + e.getMessage());
        }
        
        return result;
    }
}