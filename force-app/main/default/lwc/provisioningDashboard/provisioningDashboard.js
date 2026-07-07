
import { LightningElement, wire, track } from 'lwc';
import getApprovalMetrics from '@salesforce/apex/ProvisioningDashboardController.getApprovalMetrics';

export default class ProvisioningDashboard extends LightningElement {
    // Card 1: Total Approvals Metrics
    @track formattedAmount = '$0.00';
    @track percentageGrowth = '0.0';
    @track totalAmount = 0;

    // Card 2: Approval Growth Metrics
    @track card2Value = '0%';
    @track card2Trend = '0.0%';

    // Card 3: Provisioning Completed Metrics
    @track provisioningCompletedValue = 0;
    @track provisioningTrend = '0.0%';
    @track ProvisioningCompletedMRC = '$0.00';
    @track netMrcTrend = '0.0%';
    @track lastPeriod = ''; 

    // Card 4: Provisioning Completed Growth Metrics
    @track ProvisioningCompletedGrowthPercent = '0%';
   // @track ProvisioningCompletedGrowthTrend = '0.0%';
    @track ProvisioningCompletedGrowthCurrent = 0;
    @track ProvisioningCompletedGrowthPrevious = 0;

    // Card 5: Provisioning Backlogs Metrics
    @track provisioningInProgress = 0;
    @track ProvisioningBacklogsPercent = '0.0%';

    // Filter and Date Range States
    @track selectedFilter = 'this_month'; 
    @track startDate = '';
    @track endDate = '';
    @track isCustomDate = false;

    // Fixed 12 Months horizontal axis array mapping data profiles
    chartMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Dynamic Chart Track States
    @track chartDataPoints = [];
    @track chartPathData = '';

    // Hardcoded Chart Axis Label Fallbacks
    @track yLabelMax = '$3.2M';
    @track yLabelMidHigh = '$2.8M';
    @track yLabelMid = '$2.5M';
    @track yLabelMidLow = '$2.1M';
    @track yLabelMin = '$1.8M';

    // Independent Error States
    @track TotalApprovalcardError = false;
    @track ApprovalGrowthcardError = false; 
    @track ProvisioningCompletedcard3Error = false;
    @track ProvisioningCompletedGrowthcard4Error = false;
    @track chartError = false;

    filterOptions = [
        { label: 'This Week', value: 'this_week' },
        { label: 'This Month', value: 'this_month' },
        { label: 'This Quarter', value: 'this_quarter' },
        { label: 'YTD', value: 'ytd' },
        { label: 'Custom Date Range', value: 'custom' }
    ];

    // Wire parameter dependencies watch the filters to modify Card calculations dynamically
    @wire(getApprovalMetrics, { 
        timePeriod: '$selectedFilter', 
        startRange: '$startDate', 
        endRange: '$endDate' 
    })
    wiredMetrics({ error, data }) {
        if (data && data.status === 'Success') {
            
            // --- TRY CARD 1: TOTAL APPROVALS (Filter-Responsive) ---
            try {
                if (data.totalAmount !== undefined) {
                    this.percentageGrowth = data.percentageGrowth;
                    this.formattedAmount = this.formatToMillions(data.totalAmount);
                    this.TotalApprovalcardError = false; 
                     this.lastPeriod = data.timeframe;
                } else {
                    throw new Error('Missing card 1 payload');
                }
            } catch (err) {
                console.error('Card 1 breakdown caught:', err);
                this.TotalApprovalcardError = true;
            }

            // --- TRY CARD 2: APPROVAL GROWTH % (Filter-Responsive) ---
            try {
                if (data.currentGrowthRate !== undefined) {
                    this.card2Value = `${data.currentGrowthRate}%`;
                     this.lastPeriod = data.timeframe;
                    const currentRate = data.currentGrowthRate;
                    const previousRate = data.previousGrowthRate || 0;
                    
                    if (previousRate !== 0) {
                        const trendCalculation = ((currentRate - previousRate) / previousRate) * 100;
                        this.card2Trend = `${Math.abs(trendCalculation).toFixed(1)}%`;
                    } else {
                        this.card2Trend = '0.0%';
                    }
                    this.ApprovalGrowthcardError = false;
                } else {
                    throw new Error('Missing card 2 payload');
                }
            } catch (err) {
                console.error('Card 2 breakdown caught:', err);
                this.ApprovalGrowthcardError = true;
            }


            // --- TRY CARD 3 Provisioninig Completed (Filter-Responsive) ---
            try {
                if (data.provisionedCompletedCount !== undefined) {
                // Assigning values to the tracked properties for card 3
                    this.provisioningCompletedValue = data.provisionedCompletedCount;
                    this.ProvisioningCompletedMRC = this.formatToMillions(data.ProvisionedCompletedMRC);
                    this.lastPeriod = data.timeframe;

                    const ProvisionedCompletedPercentageCurrent = data.ProvisionedCompletedPercentageCurrent;
                    const ProvisionedCompletedPercentagePrevious = data.ProvisionedCompletedPercentagePrevious;
                    const ProvisionedCompletedMRCPercentageCurrent = data.ProvisionedCompletedMRCPercentageCurrent;
                    const ProvisionedCompletedMRCPercentagePrevious = data.ProvisionedCompletedMRCPercentagePrevious;
                    if (ProvisionedCompletedPercentagePrevious !== 0) {
                        const trendProvisioningCalculation = ((ProvisionedCompletedPercentageCurrent - ProvisionedCompletedPercentagePrevious) / ProvisionedCompletedPercentagePrevious) * 100;
                        this.provisioningTrend = `${Math.abs(trendProvisioningCalculation).toFixed(1)}%`;
                        const trendMRCCalculation = ((ProvisionedCompletedMRCPercentageCurrent - ProvisionedCompletedMRCPercentagePrevious) / ProvisionedCompletedMRCPercentagePrevious) * 100;
                        this.netMrcTrend = `${Math.abs(trendMRCCalculation).toFixed(1)}%`;
                    } else {
                        this.provisioningTrend = '0.0%';
                        this.netMrcTrend = '0.0%';
                    }
                    this.ProvisioningCompletedcard3Error = false;

                } else {
                    throw new Error('Missing card 3 payload');
                }
            } catch (err) {
                console.error('Card 3 breakdown caught:', err);
                this.ProvisioningCompletedcard3Error = true;
            }


            // --- TRY CARD 4 Provisioninig Completed Growth (Filter-Responsive) ---
            try {
                if (data.ProvisioningCompletedGrowthPercent !== undefined) {
                    const ProvisioningCompletedGrowthCurrent = data.ProvisioningCompletedGrowthCurrent;
                    const ProvisioningCompletedGrowthPrevious = data.ProvisioningCompletedGrowthPrevious || 0;
                    // Formatting the value
                    this.ProvisioningCompletedGrowthPercent = `${data.ProvisioningCompletedGrowthPercent.toFixed(1)}%`;
                    const ProvisioningCompletedGrowthTrend = ((ProvisioningCompletedGrowthCurrent - ProvisioningCompletedGrowthPrevious) / ProvisioningCompletedGrowthPrevious) * 100;
                    // Formatting the trend
                    this.ProvisioningCompletedGrowthTrend = `${Math.abs(ProvisioningCompletedGrowthTrend).toFixed(1)}%`;
                    
                    this.ProvisioningCompletedGrowthcard4Error = false;
                } else {
                    throw new Error('Missing card 4 payload');
                }
            } catch (err) {
                console.error('Card 4 breakdown caught:', err);
                this.ProvisioningCompletedGrowthcard4Error = true;
            }


              // --- TRY CARD 5 Provisioning Backlogs  ---
            try {
    if (data.ProvisioningInProgress !== undefined) {
        // Assigning values to the tracked properties for card 5
        this.provisioningInProgress = data.ProvisioningInProgress;
        this.totalAmount = data.totalAmount;
        this.lastPeriod = data.timeframe;

        // FIX: Use data.ProvisioningInProgress and data.totalAmount (or use the "this." equivalents)
        // Also added a safety check to avoid division by zero or NaN if totalAmount is 0 or missing
        if (data.totalAmount && data.totalAmount !== 0) {
            const ProvisioningBacklogsPercent = (data.ProvisioningInProgress / data.totalAmount) * 100;
            
            if (ProvisioningBacklogsPercent !== 0) {
                this.ProvisioningBacklogsPercent = ProvisioningBacklogsPercent.toFixed(1) + '%';
            } else {
                this.ProvisioningBacklogsPercent = '0.0%';
            }
        } else {
            this.ProvisioningBacklogsPercent = '0.0%';
        }
        
        this.ProvisioningBacklogscard5Error = false;

    } else {
        throw new Error('Missing card 5 payload');
    }
} catch (err) {
    console.error('Card 5 breakdown caught:', err);
    this.ProvisioningBacklogscard5Error = true;
}


            // --- TRY CHART: MONTHLY TREND ANALYSIS (Static Jan-Jul Timeline, Filter Independent) ---
            try {
                if (data.monthlyMrcValues && data.monthlyMrcValues.length > 0) {
                    const xPositions = [80, 140, 200, 260, 320, 380, 440, 500, 560, 620, 680, 740]; 
                    
                    const calculatedPoints = data.monthlyMrcValues.map((val, index) => {
                        const baseValue = val - 1200000; 
                        const pixelHeightRange = 150; 
                        const valueRange = 2000000; 
                        
                        let computedY = 190 - ((baseValue / valueRange) * pixelHeightRange);
                        
                        if (computedY < 40) computedY = 40;
                        if (computedY > 190) computedY = 190;

                        return {
                            month: index,
                            x: xPositions[index],
                            y: computedY
                        };
                    });

                    this.chartDataPoints = calculatedPoints;
                    
                    this.chartPathData = calculatedPoints.reduce((path, pt, i) => {
                        return i === 0 
                            ? `M ${pt.x} ${pt.y}` 
                            : `${path} Q ${(pt.x + calculatedPoints[i-1].x) / 2} ${calculatedPoints[i-1].y}, ${pt.x} ${pt.y}`;
                    }, '');
                    
                    this.chartError = false;
                } else {
                    throw new Error('Empty chart array profile supplied');
                }
            } catch (err) {
                console.error('Chart visualization plotting caught:', err);
                this.chartError = true; 
            }

        } else if (error) {
            this.TotalApprovalcardError = true;
            this.ApprovalGrowthcardError = true;
            this.ProvisioningCompletedcard3Error = true;
             this.ProvisioningCompletedGrowthcard4Error = true;
            this.ProvisioningBacklogscard5Error = true;
            // this.ProvisioningBacklogscard6Error = true;
            this.chartError = true;
            console.error('Apex connection level failure:', error);
        }
    }


    // Event handler for filter selection changes
    handleFilterChange(event) {
        this.selectedFilter = event.detail.value;
        this.isCustomDate = (this.selectedFilter === 'custom');
        if (!this.isCustomDate) {
            this.startDate = '';
            this.endDate = '';
        }
    }

    // Event handlers for custom date range inputs
    handleStartDateChange(event) { this.startDate = event.detail.value; }
    handleEndDateChange(event) { this.endDate = event.detail.value; }


    // Utility function to format numbers into millions with two decimal places
    formatToMillions(value) {
        if (!value) return '$0.00';
        return `$${(value / 1000000).toFixed(2)}M`;
    }
}