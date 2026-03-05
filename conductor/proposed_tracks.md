# Proposed Project Tracks

This document outlines potential future tracks for the Pretoria Prepaid project. These tracks aim to enhance user experience, provide deeper insights, and improve the overall robustness of the application.

---

## 1. Track: Advanced Data Visualization and Analytics

**Goal**: Provide users with visual insights into their electricity consumption and spending patterns.

- [ ] **Research and Selection**: Evaluate and select a charting library (e.g., Recharts, Nivo) that fits the project's aesthetics and performance goals.
- [ ] **Consumption Trends Chart**: Implement a line/bar chart on the Dashboard showing monthly unit consumption over the past 12 months.
- [ ] **Spending Heatmap**: Create a visualization showing purchase frequency and amounts across different days of the week/month.
- [ ] **Strategic Purchase Insights**: Add a "Best Time to Buy" indicator based on current tier progress and remaining days in the month.

## 2. Track: Enhanced Data Portability and Integration

**Goal**: Allow users to easily move their data in and out of the platform.

- [ ] **Multi-Format Export**: Expand the existing JSON export to support CSV and PDF (formatted for printing/record-keeping).
- [ ] **Bulk Import Tool**: Create a user-friendly interface to upload past purchases from a CSV file, including validation and deduplication.
- [ ] **Email Summaries**: Implement a feature to receive a monthly spending summary via email.

## 3. Track: Smart Consumption Monitoring

**Goal**: Help users track actual meter usage vs. purchased units.

- [ ] **Manual Meter Readings**: Add a feature for users to log their actual physical meter readings.
- [ ] **Daily Burn Rate Calculation**: Calculate and display the average daily units consumed based on consecutive meter readings.
- [ ] **Remaining Days Estimation**: Predict how many days the current unit balance will last based on the calculated burn rate.
- [ ] **Low Balance Alerts**: Implement browser/system notifications when estimated units fall below a user-defined threshold.

## 4. Track: Admin Management Suite

**Goal**: Provide tools for system administrators to manage global data and monitor health.

- [ ] **Admin Dashboard UI**: Create a secure, restricted-access dashboard for administrators.
- [ ] **Dynamic Rate Management**: Implement a UI for updating municipal electricity rates in real-time, replacing manual backend updates.
- [ ] **User Analytics**: Provide high-level, anonymized metrics on system usage, popular purchase amounts, and user growth.
- [ ] **System Health Logs**: Add a view for monitoring backend errors and performance metrics.

## 5. Track: Performance and Offline Excellence (PWA)

**Goal**: Ensure the app is lightning fast and accessible even with intermittent connectivity.

- [ ] **PWA Configuration**: Configure service workers and manifest files for full "Installable" PWA support.
- [ ] **Offline Calculator**: Ensure the Purchase Calculator is fully functional without an internet connection.
- [ ] **Optimistic UI & Sync**: Implement background sync for purchase logs added while offline.
- [ ] **Asset Optimization**: Fine-tune Vite and Tailwind for minimal bundle sizes and faster initial paint.
