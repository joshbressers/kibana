# SLO

Starting in 8.8, SLO is enabled by default.

## Supported SLI

We currently support the following SLI:

- APM Transaction Error Rate, known as APM Availability
- APM Transaction Duration, known as APM Latency
- Custom KQL

For the APM SLIs, customer can provide the service, environment, transaction name and type to configure them. For the **APM Latency** SLI, a threshold in milliseconds needs to be provided to discriminate the good and bad responses (events). For the **APM Availability** SLI, a list of good status codes needs to be provided to discriminate the good and bad responses (events). The API supports an optional kql filter to further filter the apm data.

The **custom KQL** SLI requires an index pattern, an optional filter query, a numerator query, and denominator query. A custom 'timestampField' can be provided to override the default @timestamp field.

## SLO configuration

### Time window

We support **calendar aligned** and **rolling** time windows. Any duration greater than 1 day can be used: days, weeks, months, quarters, years.

**Rolling time window:** Requires a duration, e.g. `1w` for one week, and `isRolling: true`. SLOs defined with such time window, will only considere the SLI data from the last duration period as a moving window.

**Calendar aligned time window:** Requires a duration, e.g. `1M` for one month, and a `calendar.startTime` date in ISO 8601 in UTC, which marks the beginning of the first period. From start time and the duration, the system will compute the different time windows. For example, starting the calendar on the **01/01/2022** with a monthly duration, if today is the **24/10/2022**, the window associated is: `[2022-10-01T00:00:00Z, 2022-11-01T00:00:00Z]`

### Budgeting method

An SLO can be configured with an **occurrences** or **timeslices** budgeting method.

An **occurrences** budgeting method uses the number of **good** and **total** events during the time window.

A **timeslices** budgeting method uses the number of **good slices** and **total slices** during the time window. A slice is an arbitrary time window (smaller than the overall SLO time window) that is either considered good or bad, calculated from the timeslice threshold and the ratio of good over total events that happened during the slice window.

For example, defining a **timeslices** budgeting method with a `95%` slice threshold and `5m` slice window means that a 1 week SLO is split in 2,016 slices (`7*24*60 / 5`); for a 99% SLO target there will be approximately 20 minutes of available error budget. Each bucket is either good or bad depending on the ratio of good over total events during that bucket, compared to the slice threshold of 95%.

### Objective

The target objective is the value the SLO needs to meet during the time window.
If a **timeslices** budgeting method is used, we also need to define the **timesliceTarget** which can be different than the overall SLO target.

### Optional settings

The default settings should be sufficient for most users, but if needed, the following properties can be overwritten:

- **syncDelay**: The ingest delay in the source data
- **frequency**: How often do we query the source data

## Example

### Availability

<details>
<summary>99% availability for GET /api over the last 30 days</summary>

```
curl --request POST \
  --url http://localhost:5601/cyp/api/observability/slos \
  --header 'Authorization: Basic ZWxhc3RpYzpjaGFuZ2VtZQ==' \
  --header 'Content-Type: application/json' \
  --header 'kbn-xsrf: oui' \
  --data '{
	"name": "My SLO Name",
	"description": "My SLO Description",
	"indicator": {
		"type": "sli.apm.transactionErrorRate",
		"params": {
			"environment": "production",
			"service": "o11y-app",
			"transactionType": "request",
			"transactionName": "GET /api",
			"goodStatusCodes": ["2xx", "3xx", "4xx"],
			"index": "metrics-apm*"
		}
	},
	"timeWindow": {
		"duration": "30d",
		"isRolling": true
	},
	"budgetingMethod": "occurrences",
	"objective": {
		"target": 0.99
	}
}'
```

</details>

<details>
<summary>95% availability for GET /api quarterly aligned</summary>

```
curl --request POST \
  --url http://localhost:5601/cyp/api/observability/slos \
  --header 'Authorization: Basic ZWxhc3RpYzpjaGFuZ2VtZQ==' \
  --header 'Content-Type: application/json' \
  --header 'kbn-xsrf: oui' \
  --data '{
	"name": "My SLO Name",
	"description": "My SLO Description",
	"indicator": {
		"type": "sli.apm.transactionErrorRate",
		"params": {
			"environment": "production",
			"service": "o11y-app",
			"transactionType": "request",
			"transactionName": "GET /api",
			"goodStatusCodes": ["2xx", "3xx", "4xx"],
			"index": "metrics-apm*"
		}
	},
	"timeWindow": {
		"duration": "1q",
		"calendar": {
            "startTime": "2022-06-01T00:00:00.000Z"
        }
	},
	"budgetingMethod": "occurrences",
	"objective": {
		"target": 0.95
	}
}'
```

</details>

<details>
<summary>90% availability for GET /api over the last week (5m timeslices)</summary>

```
curl --request POST \
  --url http://localhost:5601/cyp/api/observability/slos \
  --header 'Authorization: Basic ZWxhc3RpYzpjaGFuZ2VtZQ==' \
  --header 'Content-Type: application/json' \
  --header 'kbn-xsrf: oui' \
  --data '{
	"name": "My SLO Name",
	"description": "My SLO Description",
	"indicator": {
		"type": "sli.apm.transactionErrorRate",
		"params": {
            "environment": "production",
			"service": "o11y-app",
			"transactionType": "request",
			"transactionName": "GET /api",
			"goodStatusCodes": ["2xx", "3xx", "4xx"],
			"index": "metrics-apm*"
		}
	},
	"timeWindow": {
		"duration": "1w",
		"isRolling": true
	},
	"budgetingMethod": "timeslices",
	"objective": {
		"target": 0.90,
		"timesliceTarget": 0.86,
		"timesliceWindow": "5m"
	}
}'
```

</details>

### Latency

<details>
<summary>99% of GET /api under 500ms over the last week</summary>

```
curl --request POST \
  --url http://localhost:5601/cyp/api/observability/slos \
  --header 'Authorization: Basic ZWxhc3RpYzpjaGFuZ2VtZQ==' \
  --header 'Content-Type: application/json' \
  --header 'kbn-xsrf: oui' \
  --data '{
	"name": "My SLO Name",
	"description": "My SLO Description",
	"indicator": {
		"type": "sli.apm.transactionDuration",
		"params": {
			"environment": "production",
			"service": "o11y-app",
			"transactionType": "request",
			"transactionName": "GET /api",
			"threshold": 500,
			"index": "metrics-apm*"
		}
	},
	"timeWindow": {
		"duration": "7d",
		"isRolling": true
	},
	"budgetingMethod": "occurrences",
	"objective": {
		"target": 0.99
	}
}'
```

</details>

<details>
<summary>95% of GET /api under 500ms over the last week (1m timeslices)</summary>

```
curl --request POST \
  --url http://localhost:5601/cyp/api/observability/slos \
  --header 'Authorization: Basic ZWxhc3RpYzpjaGFuZ2VtZQ==' \
  --header 'Content-Type: application/json' \
  --header 'kbn-xsrf: oui' \
  --data '{
	"name": "My SLO Name",
	"description": "My SLO Description",
	"indicator": {
		"type": "sli.apm.transactionDuration",
		"params": {
			"environment": "production",
			"service": "o11y-app",
			"transactionType": "request",
			"transactionName": "GET /api",
			"threshold": 500,
			"index": "metrics-apm*"
		}
	},
	"timeWindow": {
		"duration": "7d",
		"isRolling": true
	},
	"budgetingMethod": "timeslices",
	"objective": {
		"target": 0.95,
		"timesliceTarget": 0.90,
		"timesliceWindow": "1m"
	}
}'
```

</details>

<details>
<summary>99.9% of GET /api under 500ms weekly aligned (5m timeslices)</summary>

```
curl --request POST \
  --url http://localhost:5601/cyp/api/observability/slos \
  --header 'Authorization: Basic ZWxhc3RpYzpjaGFuZ2VtZQ==' \
  --header 'Content-Type: application/json' \
  --header 'kbn-xsrf: oui' \
  --data '{
	"name": "My SLO Name",
	"description": "My SLO Description",
	"indicator": {
		"type": "sli.apm.transactionDuration",
		"params": {
			"environment": "production",
			"service": "o11y-app",
			"transactionType": "request",
			"transactionName": "GET /api",
			"threshold": 500,
			"index": "metrics-apm*"
		}
	},
	"timeWindow": {
		"duration": "7d",
		"calendar": {
			"startTime": "2022-01-01T00:00:00.000Z"
		}
	},
	"budgetingMethod": "timeslices",
	"objective": {
		"target": 0.999,
		"timesliceTarget": 0.95,
		"timesliceWindow": "5m"
	}
}'
```

</details>

### Custom

<details>
<summary>98.5% of 'logs lantency < 300ms' for 'groupId: group-0' over the last 7 days</summary>

```
curl --request POST \
  --url http://localhost:5601/cyp/api/observability/slos \
  --header 'Authorization: Basic ZWxhc3RpYzpjaGFuZ2VtZQ==' \
  --header 'Content-Type: application/json' \
  --header 'kbn-xsrf: oui' \
  --data '{
	"name": "My SLO Name",
	"description": "My SLO Description",
	"indicator": {
		"type": "sli.kql.custom",
		"params": {
			"index": "high-cardinality-data-fake_logs*",
			"good": "latency < 300",
			"total": "",
			"filter": "labels.groupId: group-0",
			"timestampField": "custom_timestamp"
		}
	},
	"timeWindow": {
		"duration": "7d",
		"isRolling": true
	},
	"budgetingMethod": "occurrences",
	"objective": {
		"target": 0.985
	}
}'
```

</details>
