'use client';

import { defineConfig } from 'sanity';
import { deskTool } from 'sanity/desk';
import { visionTool } from '@sanity/vision';
import { RocketIcon, RobotIcon } from '@sanity/icons';

const projectId = '6zuqzp5l';
const apiVersion = '2024-01-01';

export default defineConfig([
  {
    projectId,
    dataset: 'production',
    name: 'production-workspace',
    basePath: '/studio/production',
    title: 'Production Workspace',
    subtitle: 'Content for live site',
    icon: RocketIcon,
    schema: {
      types: [],
    },
    plugins: [deskTool(), visionTool({ defaultApiVersion: apiVersion })],
  },
  {
    projectId,
    dataset: 'staging',
    name: 'staging-workspace',
    basePath: '/studio/staging',
    title: 'Staging Workspace',
    subtitle: 'Testing environment',
    icon: RobotIcon,
    schema: {
      types: [],
    },
    plugins: [deskTool(), visionTool({ defaultApiVersion: apiVersion })],
  },
]);
