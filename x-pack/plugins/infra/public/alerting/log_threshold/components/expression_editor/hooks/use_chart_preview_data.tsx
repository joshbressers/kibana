/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useMemo } from 'react';
import { HttpHandler } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ExecutionTimeRange } from '../../../../../types';
import { useTrackedPromise } from '../../../../../utils/use_tracked_promise';
import {
  GetLogAlertsChartPreviewDataSuccessResponsePayload,
  getLogAlertsChartPreviewDataSuccessResponsePayloadRT,
  getLogAlertsChartPreviewDataRequestPayloadRT,
  LOG_ALERTS_CHART_PREVIEW_DATA_PATH,
} from '../../../../../../common/http_api';
import { decodeOrThrow } from '../../../../../../common/runtime_types';
import { GetLogAlertsChartPreviewDataAlertParamsSubset } from '../../../../../../common/http_api/log_alerts';

interface Options {
  sourceId: string;
  ruleParams: GetLogAlertsChartPreviewDataAlertParamsSubset;
  buckets: number;
  executionTimeRange?: ExecutionTimeRange;
}

export const useChartPreviewData = ({
  sourceId,
  ruleParams,
  buckets,
  executionTimeRange,
}: Options) => {
  const { http } = useKibana().services;
  const [chartPreviewData, setChartPreviewData] = useState<
    GetLogAlertsChartPreviewDataSuccessResponsePayload['data']['series']
  >([]);
  const [hasError, setHasError] = useState<boolean>(false);
  const [getChartPreviewDataRequest, getChartPreviewData] = useTrackedPromise(
    {
      cancelPreviousOn: 'creation',
      createPromise: async () => {
        setHasError(false);
        return await callGetChartPreviewDataAPI(
          sourceId,
          http!.fetch,
          ruleParams,
          buckets,
          executionTimeRange
        );
      },
      onResolve: ({ data: { series } }) => {
        setHasError(false);
        setChartPreviewData(series);
      },
      onReject: (error) => {
        setHasError(true);
      },
    },
    [sourceId, http, ruleParams, buckets]
  );

  const isLoading = useMemo(
    () => getChartPreviewDataRequest.state === 'pending',
    [getChartPreviewDataRequest.state]
  );

  return {
    chartPreviewData,
    hasError,
    isLoading,
    getChartPreviewData,
  };
};

export const callGetChartPreviewDataAPI = async (
  sourceId: string,
  fetch: HttpHandler,
  alertParams: GetLogAlertsChartPreviewDataAlertParamsSubset,
  buckets: number,
  executionTimeRange?: ExecutionTimeRange
) => {
  const response = await fetch(LOG_ALERTS_CHART_PREVIEW_DATA_PATH, {
    method: 'POST',
    body: JSON.stringify(
      getLogAlertsChartPreviewDataRequestPayloadRT.encode({
        data: {
          logView: { type: 'log-view-reference', logViewId: sourceId },
          alertParams,
          buckets,
          executionTimeRange,
        },
      })
    ),
  });

  return decodeOrThrow(getLogAlertsChartPreviewDataSuccessResponsePayloadRT)(response);
};
