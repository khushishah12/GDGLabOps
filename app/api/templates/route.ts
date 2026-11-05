import { NextRequest } from 'next/server';
import { TemplateService } from '@/lib/services/template.service';
import { createLabTemplateSchema } from '@/lib/validations';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const domain = searchParams.get('domain') || undefined;
    const organisationId = searchParams.get('organisationId') || undefined;

    const templates = await TemplateService.list({ domain, organisationId });
    return apiSuccess(templates);
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = createLabTemplateSchema.parse(body);
    const template = await TemplateService.create(validated);
    return apiSuccess(template, 'Lab template created successfully', 201);
  } catch (err) {
    return apiError(err);
  }
}
