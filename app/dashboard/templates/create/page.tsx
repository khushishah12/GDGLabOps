'use client';

import React from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { TemplateBuilder } from '@/components/templates/template-builder';

export default function CreateLabTemplatePage() {
  return (
    <AppShell>
      <TemplateBuilder isEditMode={false} />
    </AppShell>
  );
}
