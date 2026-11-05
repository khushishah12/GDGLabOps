import { NextRequest } from 'next/server';
import { TemplateService } from '@/lib/services/template.service';
import { updateLabTemplateSchema } from '@/lib/validations';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const template = await TemplateService.getById(params.id);
    return apiSuccess(template);
  } catch (err) {
    return apiError(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const validated = updateLabTemplateSchema.parse(body);
    const updated = await TemplateService.update(params.id, validated);
    return apiSuccess(updated, 'Lab template updated successfully');
  } catch (err) {
    return apiError(err);
  }
}
