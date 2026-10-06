import { HttpError } from '../../utils/http-error'
import { customControls } from './custom-controls'
import { getControlForTenant, listControlsForTenant } from './control-directory'

export const controlsService = {
  // Published platform controls (from the Library) + this organisation's own custom controls
  async listControls(tenantId: string) {
    return listControlsForTenant(tenantId)
  },

  async getControl(tenantId: string, id: string) {
    const control = await getControlForTenant(tenantId, id)
    if (!control) throw HttpError.notFound('Control not found')
    return control
  },

  async createCustomControl(tenantId: string, userId: string | undefined, data: {
    title: string; description: string; applicableTo: 'DATA_FIDUCIARY' | 'SIGNIFICANT_DF' | 'BOTH'
    // chapterId / sectionId are node ids (the portal still calls the top-level node a "chapter")
    regulationMappings?: { regulationId: string; chapterId?: string; sectionId?: string; nodeId?: string }[]
    predefinedActions: {
      title: string; description: string; evidenceTypes: string[]
      suggestedDueDays: number; priority: string
    }[]
  }) {
    if (!data.predefinedActions || data.predefinedActions.length === 0) {
      throw HttpError.badRequest('At least one predefined action is required')
    }

    return customControls.create(tenantId, userId, {
      title: data.title,
      description: data.description,
      applicableTo: data.applicableTo,
      citations: (data.regulationMappings ?? []).map(m => ({
        regulationId: m.regulationId,
        nodeId: m.nodeId ?? m.sectionId ?? m.chapterId,
      })),
      actions: data.predefinedActions,
    })
  },
}
