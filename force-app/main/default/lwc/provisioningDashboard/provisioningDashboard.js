import { LightningElement, wire, track } from 'lwc';
import getProvisioningMetrics from '@salesforce/apex/ProvisioningDashboardController.getProvisioningMetrics';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { loadStyle } from 'lightning/platformResourceLoader';
import getCard3ProductMetrics from '@salesforce/apex/ProvisioningDashboardController.getCard3ProductMetrics';
import getCard4GrowthMetrics from '@salesforce/apex/ProvisioningDashboardController.getCard4GrowthMetrics';
import getCard5WipMetrics from '@salesforce/apex/ProvisioningDashboardController.getCard5WipMetrics';
import getCard6BacklogMetrics from '@salesforce/apex/ProvisioningDashboardController.getCard6BacklogMetrics';

export default class ProvisioningDashboard extends LightningElement {
    // ==========================================
    // GLOBAL FILTER CONTROLS
    // ==========================================
    @track selectedFilter = 'this_month'; 
    @track startDate = '';
    @track endDate = '';
    @track isCustomDate = false;
    timeframeText = 'vs Last Month';
    globalError = false;

    // ==========================================
    // CARD 1 PROPERTIES (Provisioning Completed)
    // ==========================================
    card1_formattedMrc = '$0K';
    card1_percentageGrowth = '0.0%';
    card1_isZero = true;
    card1_trendIcon = '';
    card1_trendClass = 'trend-neutral';

    // ==========================================
    // CARD 2 PROPERTIES (Approval Growth %)
    // ==========================================
    card2_MainValue = '0.0%';
    card2_percentageGrowth = '0.0%';
    card2_isZero = true;
    card2_trendIcon = '';
    card2_trendClass = 'trend-neutral';

    // ==========================================
    // CARD 3 PROPERTIES (Provisioning Completed / Net MRC)
    // ==========================================
    ProvisioningCompletedcard3Error = false;
    
    // Top Section (Volume Count)
    provisioningCompletedValue = '0';
    provisioningTrend = '0.0%';
    card3_countIsZero = true;
    card3_countTrendIcon = '';
    card3_countTrendClass = 'trend-neutral';

    // Bottom Section (Net MRC Value & Dual Trends)
    ProvisioningCompletedMRC = '$0K';
    netMrcTrend = '$0K';
    percentageMrcTrend = '0.0%';
    card3_mrcIsZero = true;
    card3_mrcTrendIcon = '';
    card3_mrcTrendClass = 'trend-neutral';

    // ==========================================
    // CARD 4 PROPERTIES (Provisioning Completed Growth %)
    // ==========================================
    ProvisioningCompletedGrowthcard4Error = false;
    
    // Main Value (MRC Percentage Growth)
    ProvisioningCompletedGrowthPercent = '0.0%';
    
    // Sub-Trend Value (Volume/Count Percentage Growth)
    ProvisioningCompletedGrowthTrend = '0.0%';
    card4_isZero = true;
    card4_trendIcon = '';
    card4_trendClass = 'trend-neutral';
    // ==========================================
    // END OF CARD 4 PROPERTIES
    // ==========================================


    // ==========================================
    // CARD 5 PROPERTIES (Work In Progress - WIP)
    // ==========================================
    WorkInProgresscardError = false;
    
    // Main Value (Cumulative MRC of In Progress Services)
    card5_wipMrcValue = '$0K';
    
    // Trend Value (Percentage Ratio of WIP vs All Created Services)
    card5_wipPercentage = '0.0%';
    card5_isZero = true;
    card5_trendIcon = '';
    card5_trendClass = 'trend-neutral';
    // ==========================================
    // END OF CARD 5 PROPERTIES
    // ==========================================   

    // ==========================================
    // CARD 6 PROPERTIES (Provisioning Backlogs %)
    // ==========================================
    // Matches the unique error variable name defined in your HTML snippet
    ProvisioningBacklogscard5Error = false; 
    
    // Main Value containing the calculated Backlog Percentage string
    ProvisioningBacklogsPercent = '0.0%';
    // ===========================================
    // END OF CARD 6 PROPERTIES
    // ===========================================


    filterOptions = [
        { label: 'This Week', value: 'this_week' },
        { label: 'This Month', value: 'this_month' },
        { label: 'This Quarter', value: 'this_quarter' },
        { label: 'YTD', value: 'ytd' },
        { label: 'Custom Date', value: 'custom' }
    ];

    @wire(getProvisioningMetrics, { 
        timePeriod: '$selectedFilter', 
        startRange: '$startDate', 
        endRange: '$endDate' 
    })
    wiredMetrics({ error, data }) {
        if (data && data.status === 'Success') {
            try {
                this.timeframeText = data.timeframeText;
                
                // ==========================================
                // PROCESS CARD 1 (Cumulative MRC / MRC Growth)
                // ==========================================
                this.card1_formattedMrc = this.formatCurrencyDynamic(data.card1_currentMrc);
                
                const mrcGrowthData = this.evaluateTrendRules(data.card1_mrcGrowthPercent);
                this.card1_isZero = mrcGrowthData.isZero;
                this.card1_trendIcon = mrcGrowthData.icon;
                this.card1_trendClass = mrcGrowthData.cssClass;
                this.card1_percentageGrowth = mrcGrowthData.displayPercent;

                // ==========================================
                // PROCESS CARD 2 (MRC Growth / Volume Growth)
                // ==========================================
                // Main Value: The MRC Growth explicitly displayed as the large value
                const card2MainPrefix = data.card2_mrcGrowthPercent > 0 ? '+' : '';
                this.card2_MainValue = `${card2MainPrefix}${data.card2_mrcGrowthPercent}%`;

                // Trend Value: The Percentage increase/decrease in actual Approval records
                const countGrowthData = this.evaluateTrendRules(data.card2_countGrowthPercent);
                this.card2_isZero = countGrowthData.isZero;
                this.card2_trendIcon = countGrowthData.icon;
                this.card2_trendClass = countGrowthData.cssClass;
                this.card2_percentageGrowth = countGrowthData.displayPercent;

                this.globalError = false;
            } catch (err) {
                console.error('Data Unpacking Error:', err);
                this.globalError = true;
            }


        } else if (error) {
            console.error('Wired aggregate channel failure:', error);
            this.globalError = true;
        }
    }


    @wire(getCard3ProductMetrics, { 
        timePeriod: '$selectedFilter', 
        startRange: '$startDate', 
        endRange: '$endDate' 
    })
    wiredCard3Metrics({ error, data }) {
        if (data && data.status === 'Success') {
            try {
                // Shared timeframe label
                this.timeframeText = data.timeframeText;

                // --- TOP SECTION: Service Count ---
                this.provisioningCompletedValue = data.card3_currentCount.toLocaleString();
                
                const countTrendParams = this.evaluateTrendRules(data.card3_countGrowthPercent);
                this.card3_countIsZero = countTrendParams.isZero;
                this.card3_countTrendIcon = countTrendParams.icon;
                this.card3_countTrendClass = countTrendParams.cssClass;
                this.provisioningTrend = countTrendParams.displayPercent;

                // --- BOTTOM SECTION: Cumulative MRC & Double Trend ---
                // Format total actual MRC dynamically (K or M)
                this.ProvisioningCompletedMRC = this.formatCurrencyDynamic(data.card3_currentMrc);

                // Format the Net Difference (Increase/Decrease Amount)
                const differencePrefix = data.card3_mrcNetDifference >= 0 ? '+' : '-';
                this.netMrcTrend = `${differencePrefix}${this.formatCurrencyDynamic(Math.abs(data.card3_mrcNetDifference))} / `;

                // Format the Percentage Growth for MRC
                const mrcTrendParams = this.evaluateTrendRules(data.card3_mrcGrowthPercent);
                this.card3_mrcIsZero = mrcTrendParams.isZero;
                this.card3_mrcTrendIcon = mrcTrendParams.icon;
                this.card3_mrcTrendClass = mrcTrendParams.cssClass;
                this.percentageMrcTrend = mrcTrendParams.displayPercent;

                this.ProvisioningCompletedcard3Error = false;
            } catch (err) {
                console.error('Card 3 Data mapping failed:', err);
                this.ProvisioningCompletedcard3Error = true;
            }
        } else if (error) {
            console.error('Card 3 Wire Error:', error);
            this.ProvisioningCompletedcard3Error = true;
        }
    }


    // ==========================================
    // CARD 4 WIRE SERVICE (Customer_Products__c Growth)
    // ==========================================
    @wire(getCard4GrowthMetrics, { 
        timePeriod: '$selectedFilter', 
        startRange: '$startDate', 
        endRange: '$endDate' 
    })
    wiredCard4Metrics({ error, data }) {
        if (data && data.status === 'Success') {
            try {
                // Ensure the global timeframe text is synchronized
                this.timeframeText = data.timeframeText;

                // --- MAIN VALUE: MRC Growth Percentage ---
                // Assign a '+' prefix if the growth is positive, otherwise let the '-' show natively
                const mrcGrowthPrefix = data.card4_mrcGrowthPercent > 0 ? '+' : '';
                this.ProvisioningCompletedGrowthPercent = `${mrcGrowthPrefix}${data.card4_mrcGrowthPercent}%`;

                // --- SUB-TREND VALUE: Volume/Count Growth Percentage ---
                // Evaluate colors, icons, and zero-states using the reusable helper method
                const countTrendParams = this.evaluateTrendRules(data.card4_countGrowthPercent);
                this.card4_isZero = countTrendParams.isZero;
                this.card4_trendIcon = countTrendParams.icon;
                this.card4_trendClass = countTrendParams.cssClass;
                this.ProvisioningCompletedGrowthTrend = countTrendParams.displayPercent;

                this.ProvisioningCompletedGrowthcard4Error = false;
            } catch (err) {
                console.error('Card 4 Data mapping failed:', err);
                this.ProvisioningCompletedGrowthcard4Error = true;
            }
        } else if (error) {
            console.error('Card 4 Wire Error:', error);
            this.ProvisioningCompletedGrowthcard4Error = true;
        }
    }


    // ==========================================
    // CARD 5 WIRE SERVICE (Customer_Products__c WIP)
    // ==========================================
    @wire(getCard5WipMetrics, { 
        timePeriod: '$selectedFilter', 
        startRange: '$startDate', 
        endRange: '$endDate' 
    })
    wiredCard5Metrics({ error, data }) {
        if (data && data.status === 'Success') {
            try {
                // --- MAIN VALUE: Format WIP Cumulative MRC ---
                this.card5_wipMrcValue = this.formatCurrencyDynamic(data.card5_wipMrcValue);

                // --- TREND VALUE: Handle WIP Ratio Presentation Logic ---
                const wipRatio = data.card5_wipRatioPercent;
                this.card5_wipPercentage = `${wipRatio}%`;

                // Configure visual indicator thresholds for the creation ratio
                if (wipRatio > 0) {
                    this.card5_isZero = false;
                    this.card5_trendIcon = '▲';
                    this.card5_trendClass = 'trend-green'; // Styles container positive/active
                } else {
                    this.card5_isZero = true;
                    this.card5_trendIcon = '';
                    this.card5_trendClass = 'trend-neutral';
                }

                this.WorkInProgresscardError = false;
            } catch (err) {
                console.error('Card 5 Payload unpacking failure:', err);
                this.WorkInProgresscardError = true;
            }
        } else if (error) {
            console.error('Card 5 Wire Pipeline error:', error);
            this.WorkInProgresscardError = true;
        }
    }


    // ==========================================
    // CARD 6 WIRE SERVICE (Customer_Products__c Backlog)
    // ==========================================
    @wire(getCard6BacklogMetrics, { 
        timePeriod: '$selectedFilter', 
        startRange: '$startDate', 
        endRange: '$endDate' 
    })
    wiredCard6Metrics({ error, data }) {
        if (data && data.status === 'Success') {
            try {
                // --- MAIN VALUE: Map and append percent literal notation ---
                const backlogVal = data.card6_backlogPercent;
                this.ProvisioningBacklogsPercent = `${backlogVal}%`;

                // Reset error boundary state upon successful data load
                this.ProvisioningBacklogscard5Error = false;
            } catch (err) {
                console.error('Card 6 data assignment exception caught:', err);
                this.ProvisioningBacklogscard5Error = true;
            }
        } else if (error) {
            console.error('Card 6 operational channel failed:', error);
            this.ProvisioningBacklogscard5Error = true;
        }
    }

    handleFilterChange(event) {
        this.selectedFilter = event.detail.value;
        this.isCustomDate = (this.selectedFilter === 'custom');
        if (!this.isCustomDate) {
            this.startDate = '';
            this.endDate = '';
        }
    }

    handleStartDateChange(event) { this.startDate = event.detail.value; }
    handleEndDateChange(event) { this.endDate = event.detail.value; }

    // ==========================================
    // UTILITY FUNCTIONS
    // ==========================================
    
    // Formats numbers into K (thousands) or M (millions)
    formatCurrencyDynamic(value) {
        if (!value || value === 0) return '$0K';
        const absValue = Math.abs(value);
        
        if (absValue >= 1000000) {
            const millions = (value / 1000000).toFixed(1);
            return `$${millions.replace('.0', '')}M`;
        } else {
            const thousands = Math.round(value / 1000);
            return `$${thousands.toLocaleString()}K`;
        }
    }

    // Reusable logic engine to assign correct UI state based on growth values
    evaluateTrendRules(growthValue) {
        if (growthValue > 0) {
            return {
                isZero: false,
                icon: '▲',
                cssClass: 'trend-green',
                displayPercent: `${Math.abs(growthValue).toFixed(1)}%`
            };
        } else if (growthValue < 0) {
            return {
                isZero: false,
                icon: '▼',
                cssClass: 'trend-red',
                displayPercent: `${Math.abs(growthValue).toFixed(1)}%`
            };
        } else {
            return {
                isZero: true,
                icon: '',
                cssClass: 'trend-neutral',
                displayPercent: '0%'
            };
        }
    }
}