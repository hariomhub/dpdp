import toast from 'react-hot-toast'
import { apiBase, apiClient } from './api-client'

/**
 * File types the portal accepts for evidence and gap-finding uploads. This only pre-filters the file picker for
 * convenience - the server re-checks every upload against the same allow-list (by name AND by file content), so
 * this list is not a security boundary. Keep it in step with packages/storage/src/file-policy.ts.
 */
export const UPLOAD_ACCEPT =
  '.pdf,.png,.jpg,.jpeg,.gif,.webp,.docx,.xlsx,.pptx,.doc,.xls,.ppt,.odt,.ods,.odp,.zip,.gz,.mp4,.webm,' +
  '.txt,.log,.md,.conf,.cfg,.ini,.csv,.json,.yaml,.yml,.xml'

export const UPLOAD_HINT = 'PDF, images, Office documents, CSV/TXT/LOG/JSON/YAML, ZIP or video — up to 25 MB each.'

export type FileTarget =
  | { kind: 'evidence'; id: string; versionId?: string }
  | { kind: 'gap'; id: string }
  | { kind: 'master'; id: string }

const PATH_SEGMENT = { evidence: 'evidence', gap: 'gap-files', master: 'master-evidence' } as const

/**
 * Open (or download) a stored file.
 *
 * Files are never reachable by a public URL. The server checks that this user may see the file, writes it to the audit
 * trail, and returns a short-lived (about a minute) single-purpose link; we then point a tab - or a download - at it.
 * Failures (no access, file unavailable...) are shown to the user as a toast.
 */
export async function openStoredFile(target: FileTarget, opts: { download?: boolean } = {}): Promise<void> {
  // A tab opened inside the click handler is not treated as a popup by the browser; we navigate it after the request.
  const tab = opts.download ? null : window.open('', '_blank')
  try {
    const res = await apiClient.post<{ data: { token: string; inline: boolean; fileName: string } }>(
      `/files/${PATH_SEGMENT[target.kind]}/${target.id}/link`,
      {
        ...(target.kind === 'evidence' && target.versionId ? { versionId: target.versionId } : {}),
        ...(opts.download ? { download: true } : {}),
      },
    )
    const url = `${apiBase}/files/dl/${res.data.token}`

    if (tab && res.data.inline) {
      tab.location.href = url
      return
    }

    // Not something to render in the browser (or an explicit download request): let the browser save it.
    tab?.close()
    const a = document.createElement('a')
    a.href = url
    a.download = res.data.fileName
    document.body.appendChild(a)
    a.click()
    a.remove()
  } catch (err) {
    tab?.close()
    toast.error(err instanceof Error ? err.message : 'Could not open the file')
  }
}
