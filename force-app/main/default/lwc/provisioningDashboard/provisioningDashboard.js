import { LightningElement, wire, track } from 'lwc';
import getProvisioningMetrics from '@salesforce/apex/ProvisioningDashboardController.getProvisioningMetrics';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { loadStyle } from 'lightning/platformResourceLoader';
import getCard3ProductMetrics from '@salesforce/apex/ProvisioningDashboardController.getCard3ProductMetrics';

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