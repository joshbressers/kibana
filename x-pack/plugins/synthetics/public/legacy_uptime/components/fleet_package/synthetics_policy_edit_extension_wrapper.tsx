/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import type { FleetStartServices } from '@kbn/fleet-plugin/public';
import { EuiButton, EuiCallOut } from '@elastic/eui';
import type { PackagePolicyEditExtensionComponentProps } from '@kbn/fleet-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { DeprecateNoticeModal } from './deprecate_notice_modal';
import { ConfigKey, DataStream } from './types';
import { useEditMonitorLocator } from '../../../apps/synthetics/hooks';

/**
 * Exports Synthetics-specific package policy instructions
 * for use in the Ingest app create / edit package policy
 */
export const SyntheticsPolicyEditExtensionWrapper = memo<PackagePolicyEditExtensionComponentProps>(
  ({ policy: currentPolicy, newPolicy, onChange }) => {
    const { application } = useKibana().services;

    const { package: pkg } = newPolicy;

    const onCancel = useCallback(() => {
      application?.navigateToApp('integrations', {
        path: `/detail/${pkg?.name}-${pkg?.version}/overview`,
      });
    }, [application, pkg?.name, pkg?.version]);

    const locators = useKibana<FleetStartServices>().services?.share?.url?.locators;
    const currentInput = currentPolicy.inputs.find((input) => input.enabled === true);
    const vars = currentInput?.streams.find((stream) =>
      Object.values(DataStream).includes(stream.data_stream.dataset as DataStream)
    )?.vars;

    const configId: string = vars?.[ConfigKey.CONFIG_ID]?.value as DataStream;

    const url = useEditMonitorLocator({ configId, locators });

    if (currentPolicy.is_managed) {
      return (
        <EuiCallOut>
          <p>{EDIT_IN_SYNTHETICS_DESC}</p>
          <EuiButton isLoading={!url} href={url} data-test-subj="syntheticsEditMonitorButton">
            {EDIT_IN_SYNTHETICS_LABEL}
          </EuiButton>
        </EuiCallOut>
      );
    } else {
      return <DeprecateNoticeModal onCancel={onCancel} />;
    }
  }
);
SyntheticsPolicyEditExtensionWrapper.displayName = 'SyntheticsPolicyEditExtensionWrapper';

const EDIT_IN_SYNTHETICS_LABEL = i18n.translate('xpack.synthetics.editPackagePolicy.inSynthetics', {
  defaultMessage: 'Edit in Synthetics',
});

const EDIT_IN_SYNTHETICS_DESC = i18n.translate(
  'xpack.synthetics.editPackagePolicy.inSyntheticsDesc',
  {
    defaultMessage: 'This package policy is managed by the Synthetics app.',
  }
);
