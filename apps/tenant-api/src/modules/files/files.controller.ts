import { NextFunction, Request, Response } from 'express'
import { pipeline } from 'stream'
import { z } from 'zod'
import { AuthRequest } from '../../middleware/auth'
import { contentDisposition } from './content-disposition'
import { FileKind } from './file-token'
import { filesService } from './files.service'

const linkBody = z.object({
  versionId: z.string().uuid().optional(),
  download:  z.boolean().optional(),
})

function linkHandler(kind: FileKind) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const body = linkBody.parse(req.body ?? {})
      const data = await filesService.createLink(
        { tenantId: req.tenantId!, userId: req.userId!, role: req.userRole!, ipAddress: req.ip },
        kind, req.params.id, body,
      )
      res.json({ success: true, data })
    } catch (err) { next(err) }
  }
}

export const filesController = {
  evidenceLink:       linkHandler('evidence'),
  gapFileLink:        linkHandler('gap'),
  masterEvidenceLink: linkHandler('master'),

  async download(req: Request, res: Response, next: NextFunction) {
    try {
      const f = await filesService.open(req.params.token, req.ip)

      // Defence in depth for anything a browser might try to render: never sniff, and sandbox it so that even
      // a file that somehow slipped through cannot run script or load anything. (PDFs are the exception: the
      // browser's built-in PDF viewer does not run inside a CSP sandbox, and a PDF cannot execute in our origin.)
      res.setHeader('Content-Type', f.contentType)
      res.setHeader('Content-Disposition', contentDisposition(f.inline ? 'inline' : 'attachment', f.fileName))
      res.setHeader('X-Content-Type-Options', 'nosniff')
      if (f.contentType !== 'application/pdf') {
        res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox")
      }
      res.setHeader('Cache-Control', 'private, no-store')
      if (f.size > 0) res.setHeader('Content-Length', String(f.size))

      pipeline(f.stream, res, (err) => {
        if (err && !res.headersSent) next(err)
        else if (err) res.destroy(err)
      })
    } catch (err) { next(err) }
  },
}
