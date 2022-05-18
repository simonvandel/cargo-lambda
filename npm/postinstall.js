#!/usr/bin/env node

import { install, checkCurrentInstallation } from './index.js';

try {
  if (!process.env.NPM_CARGO_LAMBDA_FORCE_INSTALL) {
    await checkCurrentInstallation();
  }

  await install({ force: true });
} catch (error) {
  console.error(error);
  process.exit(1);
}
