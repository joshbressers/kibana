/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import AbortController from 'abort-controller';
import fetch from 'node-fetch';

import { KibanaRequest, Logger } from '@kbn/core/server';
import { kibanaPackageJson } from '@kbn/repo-info';

import { ConfigType } from '..';
import { isVersionMismatch } from '../../common/is_version_mismatch';
import { stripTrailingSlash } from '../../common/strip_slashes';
import { InitialAppData } from '../../common/types';

import { entSearchHttpAgent } from './enterprise_search_http_agent';

interface Params {
  request: KibanaRequest;
  config: ConfigType;
  log: Logger;
}
interface Return extends InitialAppData {
  publicUrl?: string;
}
interface ResponseError {
  responseStatus: number;
  responseStatusText: string;
}

/**
 * Calls an internal Enterprise Search API endpoint which returns
 * useful various settings (e.g. product access, external URL)
 * needed by the Kibana plugin at the setup stage
 */
const ENDPOINT = '/api/ent/v2/internal/client_config';

export const callEnterpriseSearchConfigAPI = async ({
  config,
  log,
  request,
}: Params): Promise<Return | ResponseError> => {
  if (!config.host)
    // Return Access and Features for when running without `ent-search`
    return {
      access: {
        hasAppSearchAccess: false,
        hasSearchEnginesAccess: false, // TODO: update to read ES feature flag, or just refactor out
        hasWorkplaceSearchAccess: false,
      },
      features: {
        hasConnectors: config.hasConnectors,
        hasDefaultIngestPipeline: config.hasDefaultIngestPipeline,
        hasNativeConnectors: config.hasNativeConnectors,
        hasSearchApplications: false, // TODO: update to read ES feature flag, or just refactor out
        hasWebCrawler: config.hasWebCrawler,
      },
      kibanaVersion: kibanaPackageJson.version,
    };

  const TIMEOUT_WARNING = `Enterprise Search access check took over ${config.accessCheckTimeoutWarning}ms. Please ensure your Enterprise Search server is responding normally and not adversely impacting Kibana load speeds.`;
  const TIMEOUT_MESSAGE = `Exceeded ${config.accessCheckTimeout}ms timeout while checking ${config.host}. Please consider increasing your enterpriseSearch.accessCheckTimeout value so that users aren't prevented from accessing Enterprise Search plugins due to slow responses.`;
  const CONNECTION_ERROR = 'Could not perform access check to Enterprise Search';

  const warningTimeout = setTimeout(() => {
    log.warn(TIMEOUT_WARNING);
  }, config.accessCheckTimeoutWarning);

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, config.accessCheckTimeout);

  try {
    const enterpriseSearchUrl = encodeURI(`${config.host}${ENDPOINT}`);
    const options = {
      headers: {
        Authorization: request.headers.authorization as string,
        ...config.customHeaders,
      },
      signal: controller.signal,
      agent: entSearchHttpAgent.getHttpAgent(),
    };

    const response = await fetch(enterpriseSearchUrl, options);

    if (!response.ok) {
      return {
        responseStatus: response.status,
        responseStatusText: response.statusText,
      };
    }

    const data = await response.json();

    warnMismatchedVersions(data?.version?.number, log);

    return {
      enterpriseSearchVersion: data?.version?.number,
      kibanaVersion: kibanaPackageJson.version,
      access: {
        hasAppSearchAccess: !!data?.current_user?.access?.app_search,
        hasSearchEnginesAccess: !!data?.current_user?.access?.search_engines,
        hasWorkplaceSearchAccess: !!data?.current_user?.access?.workplace_search,
      },
      features: {
        hasConnectors: config.hasConnectors,
        hasDefaultIngestPipeline: config.hasDefaultIngestPipeline,
        hasNativeConnectors: config.hasNativeConnectors,
        hasSearchApplications: !!data?.current_user?.access?.search_engines,
        hasWebCrawler: config.hasWebCrawler,
      },
      publicUrl: stripTrailingSlash(data?.settings?.external_url),
      readOnlyMode: !!data?.settings?.read_only_mode,
      searchOAuth: {
        clientId: data?.settings?.search_oauth?.client_id,
        redirectUrl: data?.settings?.search_oauth?.redirect_url,
      },
      configuredLimits: {
        appSearch: {
          engine: {
            maxDocumentByteSize:
              data?.settings?.configured_limits?.app_search?.engine?.document_size_in_bytes,
            maxEnginesPerMetaEngine:
              data?.settings?.configured_limits?.app_search?.engine?.source_engines_per_meta_engine,
          },
        },
        workplaceSearch: {
          customApiSource: {
            maxDocumentByteSize:
              data?.settings?.configured_limits?.workplace_search?.custom_api_source
                ?.document_size_in_bytes,
            totalFields:
              data?.settings?.configured_limits?.workplace_search?.custom_api_source?.total_fields,
          },
        },
      },
      appSearch: {
        accountId: data?.current_user?.app_search?.account?.id,
        onboardingComplete: !!data?.current_user?.app_search?.account?.onboarding_complete,
        role: {
          id: data?.current_user?.app_search?.role?.id,
          roleType: data?.current_user?.app_search?.role?.role_type,
          ability: {
            accessAllEngines: !!data?.current_user?.app_search?.role?.ability?.access_all_engines,
            manage: data?.current_user?.app_search?.role?.ability?.manage || [],
            edit: data?.current_user?.app_search?.role?.ability?.edit || [],
            view: data?.current_user?.app_search?.role?.ability?.view || [],
            credentialTypes: data?.current_user?.app_search?.role?.ability?.credential_types || [],
            availableRoleTypes:
              data?.current_user?.app_search?.role?.ability?.available_role_types || [],
          },
        },
      },
      workplaceSearch: {
        organization: {
          name: data?.current_user?.workplace_search?.organization?.name,
          defaultOrgName: data?.current_user?.workplace_search?.organization?.default_org_name,
        },
        account: {
          id: data?.current_user?.workplace_search?.account?.id,
          groups: data?.current_user?.workplace_search?.account?.groups || [],
          isAdmin: !!data?.current_user?.workplace_search?.account?.is_admin,
          canCreatePrivateSources:
            !!data?.current_user?.workplace_search?.account?.can_create_private_sources,
          viewedOnboardingPage:
            !!data?.current_user?.workplace_search?.account?.viewed_onboarding_page,
        },
      },
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      log.warn(TIMEOUT_MESSAGE);
    } else {
      log.error(`${CONNECTION_ERROR}: ${err.toString()}`);
      if (err instanceof Error) log.debug(err.stack as string);
    }
    return {};
  } finally {
    clearTimeout(warningTimeout);
    clearTimeout(timeout);
  }
};

export const warnMismatchedVersions = (enterpriseSearchVersion: string, log: Logger) => {
  const kibanaVersion = kibanaPackageJson.version;

  if (isVersionMismatch(enterpriseSearchVersion, kibanaVersion)) {
    log.warn(
      `Your Kibana instance (v${kibanaVersion}) is not the same version as your Enterprise Search instance (v${enterpriseSearchVersion}), which may cause unexpected behavior. Use matching versions for the best experience.`
    );
  }
};
