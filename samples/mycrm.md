# Ny CRM — SaaS CRM Application Mock

```wiretext
theme: ny-crm
---
primary: #4F46E5
success: #059669
danger: #DC2626
warning: #D97706
surface: #FFFFFF
bg: #F8FAFC
text: #0F172A
muted: #64748B
border: #E2E8F0
radius: 8px
font: Inter
```

```wiretext
macro: crm-nav
---
@header
  logo ~buildings Ny CRM → dashboard
  nav Dashboard* | Contacts | Deals | Tasks | Reports
  user-menu Olivia Chen | olivia@nycrm.com ~user-circle

@sidebar
  heading Navigation | 6
  nav
    ~house Dashboard* → dashboard
    ~users Contacts → contacts
    ~handshake Deals → deals
    ~check-square Tasks → tasks
    ~chart-bar Reports → reports
    ---
    ~gear Settings → settings
```

```wiretext
screen: dashboard
use: crm-nav
---
@main
  heading Dashboard | 1
  subtext Welcome back, Olivia. Here's your pipeline at a glance.
  spacer sm
  row
    stat Active Deals | 42 | +8
    stat Pipeline Value | $1.28M | +18%
    stat Won This Month | $340K | +12%
    stat Tasks Due Today | 7
  spacer sm
  row 7, 3
    card ~chart-line-up Revenue Trend
      chart Revenue | area
    card ~fire Hot Deals
      table Deal | Value | Stage | Close Date
        Acme Corp Expansion | $125,000 | Proposal | Mar 28
        GlobalTech License | $89,000 | Negotiation | Apr 02
        Starter Pack - Bloom | $34,500 | Discovery | Apr 10
        DataSync Integration | $67,000 | Proposal | Mar 31
  row 7, 3
    card ~clock-countdown Recent Activity
      feed
        item ~envelope Sarah replied to Acme Corp thread | 2 hours ago
        item ~phone-call Call scheduled with GlobalTech | 4 hours ago
        item ~handshake Deal stage changed: Bloom to Discovery | Yesterday
        item ~note Contract draft updated for DataSync | Yesterday
    card ~calendar-blank Upcoming
      text 3 meetings today
      text 2 follow-ups pending
      text 1 proposal due
      divider
      button View Calendar → tasks
```

```wiretext
screen: contacts
use: crm-nav
---
@main
  heading Contacts | 1
  subtext Manage your contacts and organizations.
  spacer sm
  row
    search Filter contacts...
    button ~plus Add Contact+
  spacer sm
  data-table Name | Company | Email | Phone | Last Contact | Status
    Sarah Mitchell | Acme Corp | sarah@acme.co | (415) 555-0142 | 2 days ago | Active
    James Park | GlobalTech | james@globaltech.io | (628) 555-0198 | Today | Active
    Maria Santos | Bloom Inc | maria@bloom.com | (510) 555-0234 | 1 week ago | Active
    David Kim | DataSync | david@datasync.dev | (925) 555-0167 | 3 days ago | Nurturing
    Lisa Chen | Vertex AI | lisa@vertex.ai | (650) 555-0189 | 2 weeks ago | Inactive
  pagination 1* | 2 | 3
```

```wiretext
screen: deals
use: crm-nav
---
@main
  heading Deals | 1
  subtext Track your sales pipeline and deal progress.
  spacer sm
  row
    search Filter deals...
    button ~plus New Deal+
  spacer sm
  tabs Discovery | Proposal* | Negotiation | Closed Won | Closed Lost
  spacer sm
  row
    card Acme Corp Expansion
      badge $125,000
      spacer sm
      text Contact: Sarah Mitchell
      subtext Expected close: Mar 28
      progress 65
      spacer sm
      button View Details → #deal-detail
    card GlobalTech License
      badge $89,000
      spacer sm
      text Contact: James Park
      subtext Expected close: Apr 02
      progress 80
      spacer sm
      button View Details → #deal-detail
    card Starter Pack - Bloom
      badge $34,500
      spacer sm
      text Contact: Maria Santos
      subtext Expected close: Apr 10
      progress 30
      spacer sm
      button View Details → #deal-detail
#deal-detail
  modal Deal Details
    heading Acme Corp Expansion | 2
    divider
    text Deal Value: $125,000
    text Stage: Proposal
    text Contact: Sarah Mitchell
    text Close Date: Mar 28
    divider
    subtext Last activity: Email sent 2 days ago
    spacer sm
    button Edit Deal+
    button Close Deal → !close
```

```wiretext
screen: tasks
use: crm-nav
---
@main
  heading Tasks | 1
  subtext Stay on top of your to-dos and follow-ups.
  spacer sm
  row
    search Filter tasks...
    button ~plus Add Task+
  spacer sm
  tabs All | Today* | This Week | Overdue
  spacer sm
  card ~phone-call Follow up with GlobalTech
    text Call James Park to discuss license terms and pricing. Prepare comparison sheet before the call.
    subtext Due: Today, 2:00 PM
    tag High | danger
    button Complete+
  card ~envelope Send proposal to Acme Corp
    text Draft and send the revised proposal with updated pricing tiers. Include case studies.
    subtext Due: Tomorrow, 10:00 AM
    tag Medium | warning
    button Complete+
  card ~note Review contract for DataSync
    text Legal review of the integration contract. Check SLA terms and data handling clauses.
    subtext Due: Mar 18
    tag Low | success
    button Complete+
```

```wiretext
screen: reports
use: crm-nav
---
@main
  heading Reports | 1
  subtext Analyze your sales performance and trends.
  spacer sm
  row
    stat Conversion Rate | 24% | +3%
    stat Avg Deal Size | $78K | +11%
    stat Sales Cycle | 32 days | -4
    stat Win Rate | 38% | +5%
  spacer sm
  row 5, 5
    card ~chart-line-up Monthly Revenue
      chart Monthly Revenue | bar
    card ~chart-pie Deal Distribution
      chart Deal by Stage | pie
  spacer sm
  row 5, 5
    card ~users Top Performers
      table Rep | Deals Won | Revenue | Win Rate
        Olivia Chen | 12 | $420K | 44%
        Marcus Johnson | 9 | $310K | 38%
        Priya Sharma | 8 | $285K | 35%
    card ~funnel Pipeline Funnel
      chart Pipeline Stages | bar
```

```wiretext
screen: settings
use: crm-nav
---
@main
  heading Settings | 1
  subtext Configure your CRM preferences.
  spacer sm
  tabs General* | Notifications | Integrations | Team
  spacer sm
  settings-form
    .section General
      input Company Name | Ny CRM Inc
      input Default Currency | USD
      select Timezone | Pacific Time (US & Canada)
      select Date Format | MM/DD/YYYY | DD/MM/YYYY | YYYY-MM-DD
    .section Notifications
      toggle Email notifications for new deals
      toggle Daily pipeline summary
      toggle Weekly performance report
    .section Data
      select Data retention | 1 year | 2 years* | 5 years | Forever
  spacer md
  row
    button Save Changes+
    button Cancel
```
