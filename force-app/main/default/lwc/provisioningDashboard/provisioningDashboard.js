
import { LightningElement, wire, track } from 'lwc';
import getApprovalMetrics from '@salesforce/apex/ProvisioningDashboardController.getApprovalMetrics';

export default class ProvisioningDashboard extends LightningElement {
    @track formattedAmount = '$0.00';
    @track percentageGrowth = '0.0';
    @track card2Value = '0%';
    @track card2Trend = '0.0%';

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
    @track card1Error = false;
    @track card2Error = false;
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
                    this.card1Error = false; 
                } else {
                    throw new Error('Missing card 1 payload');
                }
            } catch (err) {
                console.error('Card 1 breakdown caught:', err);
                this.card1Error = true;
            }

            // --- TRY CARD 2: APPROVAL GROWTH % (Filter-Responsive) ---
            try {
                if (data.currentGrowthRate !== undefined) {
                    this.card2Value = `${data.currentGrowthRate}%`;
                    const currentRate = data.currentGrowthRate;
                    const previousRate = data.previousGrowthRate || 0;
                    
                    if (previousRate !== 0) {
                        const trendCalculation = ((currentRate - previousRate) / previousRate) * 100;
                        this.card2Trend = `${Math.abs(trendCalculation).toFixed(1)}%`;
                    } else {
                        this.card2Trend = '0.0%';
                    }
                    this.card2Error = false;
                } else {
                    throw new Error('Missing card 2 payload');
                }
            } catch (err) {
                console.error('Card 2 breakdown caught:', err);
                this.card2Error = true;
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
            this.card1Error = true;
            this.card2Error = true;
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