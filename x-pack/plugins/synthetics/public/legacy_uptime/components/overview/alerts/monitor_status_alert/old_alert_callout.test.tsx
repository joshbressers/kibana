/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallowWithIntl } from '@kbn/test-jest-helpers';
import { OldAlertCallOut } from './old_alert_call_out';

describe('OldAlertCallOut', () => {
  it('returns null for new alert type', () => {
    expect(shallowWithIntl(<OldAlertCallOut isOldAlert={false} />)).toEqual({});
  });

  it('renders the call out for old alerts', () => {
    expect(shallowWithIntl(<OldAlertCallOut isOldAlert={true} />)).toMatchInlineSnapshot(`
      <Fragment>
        <EuiSpacer
          size="m"
        />
        <EuiCallOut
          iconType="warning"
          size="s"
          title={
            <FormattedMessage
              defaultMessage="You may be editing an older alert, some fields may not auto-populate."
              id="xpack.synthetics.alerts.monitorStatus.oldAlertCallout.title"
              values={Object {}}
            />
          }
        />
      </Fragment>
    `);
  });
});
