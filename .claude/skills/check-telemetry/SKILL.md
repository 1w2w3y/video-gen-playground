---
name: check-telemetry
description: Check the app's Application Insights telemetry for errors, failures, and exceptions. Use when you want to understand what's failing in production or any deployed environment.
user-invocable: true
---

Query Application Insights for the video-gen-playground app and report on errors, failures, and health.

## Resource

- Application Insights resource ID: `/subscriptions/d21a525e-7c86-486d-a79e-a4f3622f639a/resourceGroups/5e-sample-app-telemetry/providers/microsoft.insights/components/video-gen-2603`
- Azure Monitor datasource UID: `azure-monitor-oob`

## Steps

### 1. Get failure overview

Use `amgmcp_insights_get_failures` to get a high-level summary of failures. Use the timeRange from $ARGUMENTS if provided (default: 1 day).

### 2. Drill into failed requests

Use `amgmcp_query_resource_log` against the resource above with this KQL:

```kql
requests
| where timestamp > ago({timeRange})
| where success == false
| project timestamp, operation_Name, resultCode, duration, url, operation_Id, cloud_RoleInstance
| order by timestamp desc
| limit 50
```

### 3. Drill into exceptions

Use `amgmcp_query_resource_log` with:

```kql
exceptions
| where timestamp > ago({timeRange})
| project timestamp, problemId, outerMessage, innermostMessage, operation_Id, cloud_RoleInstance
| order by timestamp desc
| limit 50
```

### 4. Drill into failed dependencies

Use `amgmcp_query_resource_log` with:

```kql
dependencies
| where timestamp > ago({timeRange})
| where success == false
| project timestamp, target, type, name, resultCode, duration, operation_Id, cloud_RoleInstance, data
| order by timestamp desc
| limit 50
```

### 5. Run steps 2–4 in parallel when possible.

### 6. Analyze and report

Group all failures by **root cause** and present a structured report with:

- A summary table of distinct error categories, their count, affected endpoints, and affected instances
- For each category, include:
  - **What**: the error message or pattern
  - **Where**: which endpoints, instances, and operation IDs are affected
  - **When**: time range of occurrences
  - **Why** (if determinable): likely root cause based on the error details and known architecture (e.g., IMDS not reachable in Docker, expired tokens, invalid API parameters)
  - **Suggested fix**: actionable recommendation

### 7. If the user provides an operation ID in $ARGUMENTS

Use `amgmcp_query_application_insights_trace` to get the full end-to-end trace for that specific operation.

### Scope control

- If $ARGUMENTS specifies a time range (e.g., "7d", "3d", "12h"), use that instead of the default 1 day.
- If $ARGUMENTS specifies an operation ID, focus on tracing that specific operation.
- If $ARGUMENTS specifies an endpoint (e.g., "/api/videos"), filter queries to that endpoint.
- If $ARGUMENTS says "brief", only run step 1 and give a one-paragraph summary.

$ARGUMENTS
