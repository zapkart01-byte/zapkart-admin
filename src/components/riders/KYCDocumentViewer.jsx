import React, { useState } from 'react'
import { FileText, Eye, CheckCircle2, AlertTriangle, ExternalLink, Info, ZoomIn } from 'lucide-react'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import Toggle from '../ui/Toggle'
import Modal from '../ui/Modal'
import { formatDate } from '../../utils/formatters'

/**
 * KYCDocumentViewer - Displays KYC documents with interactive zoom previews and verification controls.
 * All functions have one-line comments above them.
 */

// Formats document type strings to capitalized readable labels
function formatDocLabel(type) {
  return type ? type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Document'
}

// Renders the KYC document verification card containing document metadata, images, and action controls
export default function KYCDocumentViewer({ document, onVerify }) {
  const [showZoomModal, setShowZoomModal] = useState(false)

  if (!document) return null

  const isVerified = document.verified ?? false
  const docLabel = formatDocLabel(document.document_type || document.type)
  const docUrl = document.document_url || document.url

  return (
    <>
      <Card className="p-4 flex flex-col gap-4 border border-surface-variant shadow-sm relative group overflow-hidden bg-surface-bright">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="text-label-lg text-on-surface font-bold">
              {docLabel}
            </h4>
            <p className="text-body-sm text-secondary mt-0.5">
              {formatDate(document.created_at)}
            </p>
          </div>
          <Badge variant={isVerified ? 'success' : 'warning'}>
            {isVerified ? 'Verified' : 'Pending'}
          </Badge>
        </div>

        {/* Document preview window with modal zoom wrapper */}
        <div className="relative aspect-[3/2] bg-surface-container-low rounded-lg overflow-hidden border border-surface-variant p-2 flex items-center justify-center">
          {docUrl ? (
            <>
              <img
                src={docUrl}
                alt={`${docLabel} Preview`}
                className="w-full h-full object-cover rounded-md"
              />
              <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  onClick={() => setShowZoomModal(true)}
                  className="bg-surface-bright/95 text-on-surface p-2 rounded-full shadow-sm hover:scale-105 transition-transform flex items-center gap-1.5 text-label-md font-semibold"
                  title="Zoom document"
                >
                  <ZoomIn className="w-4 h-4" /> Preview
                </button>
                <a
                  href={docUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-surface-bright/95 text-on-surface p-2 rounded-full shadow-sm hover:scale-105 transition-transform"
                  title="Open in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </>
          ) : (
            <div className="text-body-sm text-secondary flex flex-col items-center gap-1">
              <Info className="w-8 h-8 opacity-45" /> Attachment Unavailable
            </div>
          )}
        </div>

        {/* KYC verification slider toggle */}
        <div className="mt-auto pt-3 border-t border-surface-variant flex justify-between items-center select-none">
          <span className="text-body-sm text-secondary font-semibold">Verification Status</span>
          <Toggle
            checked={isVerified}
            onChange={() => onVerify(document.id, isVerified)}
            label={isVerified ? 'VERIFIED' : 'PENDING'}
          />
        </div>
      </Card>

      {/* Polish fullscreen zoom preview modal */}
      {showZoomModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowZoomModal(false)}
          title={`KYC Document Preview — ${docLabel}`}
        >
          <div className="flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
            <div className="border border-surface-variant rounded-xl overflow-hidden bg-surface-container-low max-h-[60vh] flex items-center justify-center">
              <img
                src={docUrl}
                alt={docLabel}
                className="max-w-full max-h-[60vh] object-contain"
              />
            </div>
            <div className="flex justify-between items-center border-t border-surface-variant pt-3">
              <div className="text-body-sm text-secondary">
                Uploaded: <span className="font-semibold text-on-surface">{formatDate(document.created_at)}</span>
              </div>
              <button
                onClick={() => setShowZoomModal(false)}
                className="px-6 py-2 rounded-full border border-secondary text-secondary hover:bg-surface-container-low transition-colors font-label-lg min-h-[44px]"
              >
                Close Preview
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
